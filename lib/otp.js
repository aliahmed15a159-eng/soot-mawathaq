'use strict';
/**
 * رمز التحقق عبر الموبايل (OTP)
 * • OTP_MODE = off | console | sms
 *   - off     : الخطوة متخطّاة تمامًا (السلوك الافتراضي قبل التفعيل)
 *   - console : الكود يظهر في سجل الخادم (وللعرض: على الشاشة في وضع التجربة) للتجربة والاختبار
 *   - sms     : إرسال حقيقي عبر أحد المزوّدين أدناه
 * • التخزين في الذاكرة (صلاحية 5 دقائق، 5 محاولات، إعادة إرسال بعد 60 ثانية)
 *   → ملاحظة نشر: للتشغيل على أكثر من نسخة/سيرفر، انقل التخزين إلى جدول otp_codes في Supabase.
 */
const crypto = require('crypto');
const sec = require('./security');

const store = new Map();
const TTL_MS = 5 * 60_000;
const RESEND_MS = 60_000;
const MAX_ATTEMPTS = 5;

function mode() {
  // متين ضد الأخطاء الشائعة في ملف .env: "console  # تعليق" / "SMS" / مسافات
  const raw = String(process.env.OTP_MODE || 'off').toLowerCase();
  const token = raw.split('#')[0].trim().split(/\s+/)[0].replace(/["']/g, '');
  if (token === 'console') return 'console';
  if (token === 'sms' || token === 'on' || token === 'true') return 'sms';
  return 'off';
}
function providerId() {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) return 'twilio';
  if (process.env.VONAGE_API_KEY && process.env.VONAGE_API_SECRET) return 'vonage';
  if (process.env.SMSMISR_USERNAME && process.env.SMSMISR_PASSWORD) return 'smsmisr';
  return 'console';
}
const PROVIDERS = {
  console: { id: 'console', label: 'عرض في السجل (وضع تجربة)' },
  twilio: { id: 'twilio', label: 'Twilio' },
  vonage: { id: 'vonage', label: 'Vonage (Nexmo)' },
  smsmisr: { id: 'smsmisr', label: 'SMS Misr (مصر)' },
};

function hashCode(phone, code) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET || 'dev').update(`${phone}:${code}`).digest('hex');
}

async function sendSms(phone, code, provider) {
  const text = `كود التحقق الخاص بك في منصة «صوت»: ${code} — صالح 5 دقائق. متشاركوش مع أي حد.`;
  if (provider === 'twilio') {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const body = new URLSearchParams({ To: phoneToE164(phone), From: process.env.TWILIO_FROM || '', Body: text });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body, signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Twilio: HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
    return { sent: true, provider };
  }
  if (provider === 'vonage') {
    const body = new URLSearchParams({
      api_key: process.env.VONAGE_API_KEY, api_secret: process.env.VONAGE_API_SECRET,
      to: phoneToE164(phone), from: process.env.VONAGE_FROM || 'SootMawathaq', text,
    });
    const res = await fetch('https://rest.nexmo.com/sms/json', {
      method: 'POST', body, signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    if (data.messages && data.messages[0] && data.messages[0].status !== '0') {
      throw new Error(`Vonage: ${data.messages[0]['error-text']}`);
    }
    return { sent: true, provider };
  }
  if (provider === 'smsmisr') {
    const body = new URLSearchParams({
      username: process.env.SMSMISR_USERNAME, password: process.env.SMSMISR_PASSWORD,
      language: process.env.SMSMISR_LANG || '2', sender: process.env.SMSMISR_SENDER || '',
      mobile: phoneToE164(phone).replace('+', ''), message: text,
    });
    const res = await fetch(process.env.SMSMISR_URL || 'https://smsmisr.com/api/SMS/', {
      method: 'POST', body, signal: AbortSignal.timeout(15000),
    });
    const data = await res.json().catch(() => ({}));
    if (data && data.code && data.code !== '1901') throw new Error(`SMS Misr: ${JSON.stringify(data).slice(0, 120)}`);
    return { sent: true, provider };
  }
  return { sent: false, provider: 'console' };
}

function phoneToE164(phone) {
  const p = sec.normalizeDigits(phone);
  return p.startsWith('0') ? `+20${p.slice(1)}` : p.startsWith('20') ? `+${p}` : `+${p}`;
}

/** إنشاء وإرسال كود جديد */
async function issue(phoneDigits, { purpose = 'register' } = {}) {
  const phone = sec.normalizeDigits(phoneDigits);
  const key = `${purpose}:${phone}`;
  const existing = store.get(key);
  if (existing && Date.now() - existing.createdAt < RESEND_MS) {
    const wait = Math.ceil((RESEND_MS - (Date.now() - existing.createdAt)) / 1000);
    // وضع التجربة: نُعيد الكود الساري بدل ما نمنع المستخدم (لا رسائل حقيقية ولا تكلفة)
    if (mode() === 'console') {
      return {
        ok: true, reused: true, cooldown: true, wait,
        provider: PROVIDERS.console.label, expiresIn: Math.round((existing.expiresAt - Date.now()) / 1000),
        dev_code: existing.plain, masked: `*******${phone.slice(-4)}`,
        hash: existing.hash, expiresAt: existing.expiresAt,
      };
    }
    return { ok: false, error: `استنى ${wait} ثانية قبل ما تطلب كود جديد` };
  }
  const code = String(crypto.randomInt(100000, 999999));
  const provider = mode() === 'sms' ? providerId() : 'console';
  let delivery = { sent: false, provider };
  try {
    if (provider !== 'console') delivery = await sendSms(phone, code, provider);
  } catch (err) {
    return { ok: false, error: `تعذّر إرسال الرسالة (${provider}): ${String(err.message).slice(0, 120)}` };
  }
  store.set(key, {
    hash: hashCode(phone, code), createdAt: Date.now(), expiresAt: Date.now() + TTL_MS,
    attempts: 0, purpose, provider, plain: process.env.OTP_DEBUG === '1' || mode() === 'console' ? code : undefined,
  });
  const devExpose = mode() === 'console' || process.env.OTP_DEBUG === '1';
  if (devExpose) console.log(`[OTP] ${phone} → ${code} (${provider})`);
  const rec = store.get(key);
  return {
    ok: true, provider: PROVIDERS[provider] ? PROVIDERS[provider].label : provider,
    expiresIn: TTL_MS / 1000, dev_code: devExpose ? code : undefined,
    masked: `*******${phone.slice(-4)}`,
    hash: rec.hash, expiresAt: rec.expiresAt,
  };
}

/** التحقق من الكود */
function verify(phoneDigits, code, { purpose = 'register', fallbackHash = null, fallbackExp = null } = {}) {
  const phone = sec.normalizeDigits(phoneDigits);
  const key = `${purpose}:${phone}`;
  const rec = store.get(key);
  if (!rec) {
    // دعم بيئة Serverless (Vercel): التحقق من البصمة الموقّعة داخل كوكي الجلسة لو الخادم تغيّر
    if (fallbackHash && fallbackExp) {
      if (Date.now() > Number(fallbackExp)) return { ok: false, error: 'انتهت صلاحية الكود — اطلب كود جديد' };
      if (hashCode(phone, sec.normalizeDigits(code)) !== fallbackHash) {
        return { ok: false, error: 'الكود غير صحيح — راجع الأرقام وحاول تاني' };
      }
      return { ok: true, verified: true, stateless: true };
    }
    return { ok: false, error: 'مفيش كود مُرسل للرقم ده — اطلب كود جديد' };
  }
  if (Date.now() > rec.expiresAt) { store.delete(key); return { ok: false, error: 'انتهت صلاحية الكود — اطلب كود جديد' }; }
  rec.attempts++;
  if (rec.attempts > MAX_ATTEMPTS) { store.delete(key); return { ok: false, error: 'محاولات كثيرة — اطلب كود جديد' }; }
  if (hashCode(phone, sec.normalizeDigits(code)) !== rec.hash) {
    return { ok: false, error: `الكود غير صحيح (باقي ${MAX_ATTEMPTS - rec.attempts} محاولات)` };
  }
  store.delete(key);
  return { ok: true, verified: true };
}

function status() {
  const m = mode();
  return {
    mode: m,
    enabled: m !== 'off',
    provider: m === 'sms' ? PROVIDERS[providerId()].label : (m === 'console' ? PROVIDERS.console.label : 'معطّل'),
    devExpose: m === 'console' || process.env.OTP_DEBUG === '1',
  };
}

module.exports = { issue, verify, status, mode, phoneToE164, hashCode, PROVIDERS };
