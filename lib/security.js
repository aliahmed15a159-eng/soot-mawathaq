'use strict';
const crypto = require('crypto');

/** تشفير/تجزئة أحادي الاتجاه — لا نخزّن أرقام قومية أو رموز اقتراع كنص صريح */
function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function hmac(value, secret) {
  return crypto.createHmac('sha256', secret).update(String(value)).digest('hex');
}

/** بصمة الرقم القومي: ملح ثابت للمنصة + SHA-256 (لا يمكن استرجاع الرقم منها) */
function identityFingerprint(nationalId) {
  const salt = process.env.IDENTITY_SALT || 'per-aa-salt-v1';
  return sha256(`${salt}:${normalizeDigits(nationalId)}`);
}

function normalizeDigits(s) {
  return String(s || '')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/\D/g, '');
}

function randomToken(bytes = 16) {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** رمز إيصال قصير يُقرأ بالعين: مجموعات من الحروف والأرقام بدون حروف متشابهة */
function receiptCode() {
  const alphabet = 'ACDEFGHJKLMNPQRTUVWXY34679';
  let out = '';
  const raw = crypto.randomBytes(10);
  for (let i = 0; i < 10; i++) out += alphabet[raw[i] % alphabet.length];
  return `${out.slice(0, 5)}-${out.slice(5, 10)}`;
}

/** رقم قومي مصري: 14 رقم — قرن/تاريخ ميلاد/محافظة/تسلسل/تحقق */
const GOVERNORATES = {
  '01': 'القاهرة', '02': 'الإسكندرية', '03': 'بورسعيد', '04': 'السويس', '11': 'دمياط',
  '12': 'الدقهلية', '13': 'الشرقية', '14': 'القليوبية', '15': 'كفر الشيخ', '16': 'الغربية',
  '17': 'المنوفية', '18': 'البحيرة', '19': 'الإسماعيلية', '21': 'الجيزة', '22': 'بني سويف',
  '23': 'الفيوم', '24': 'المنيا', '25': 'أسيوط', '26': 'سوهاج', '27': 'قنا', '28': 'أسوان',
  '29': 'الأقصر', '31': 'البحر الأحمر', '32': 'الوادي الجديد', '33': 'مطروح',
  '34': 'شمال سيناء', '35': 'جنوب سيناء', '88': 'خارج الجمهورية',
};

function parseNationalId(nationalId) {
  const id = normalizeDigits(nationalId);
  if (id.length !== 14) return { ok: false, reason: 'الرقم القومي لازم يكون 14 رقم' };
  const centuryDigit = id[0];
  if (centuryDigit !== '2' && centuryDigit !== '3') {
    return { ok: false, reason: 'أول رقم في الرقم القومي غير صحيح (لازم 2 أو 3)' };
  }
  const yy = parseInt(id.slice(1, 3), 10);
  const mm = parseInt(id.slice(3, 5), 10);
  const dd = parseInt(id.slice(5, 7), 10);
  if (mm < 1 || mm > 12) return { ok: false, reason: 'شهر الميلاد غير صحيح' };
  if (dd < 1 || dd > 31) return { ok: false, reason: 'يوم الميلاد غير صحيح' };
  const year = (centuryDigit === '2' ? 1900 : 2000) + yy;
  const date = new Date(Date.UTC(year, mm - 1, dd));
  if (date.getUTCMonth() !== mm - 1 || date.getUTCDate() !== dd) {
    return { ok: false, reason: 'تاريخ الميلاد غير موجود' };
  }
  const govCode = id.slice(7, 9);
  if (!GOVERNORATES[govCode]) return { ok: false, reason: 'كود المحافظة في الرقم القومي غير معروف' };
  const genderDigit = parseInt(id[12], 10);
  return {
    ok: true,
    id,
    birthDate: `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`,
    year, month: mm, day: dd,
    governorate: GOVERNORATES[govCode],
    governorateCode: govCode,
    gender: genderDigit % 2 === 1 ? 'ذكر' : 'أنثى',
  };
}

function validEgyptianPhone(phone) {
  const p = normalizeDigits(phone);
  return /^01[0125][0-9]{8}$/.test(p);
}

function maskName(name) {
  const parts = String(name || '').trim().split(/\s+/);
  return parts.map((p, i) => (i === 0 ? p : p.length > 2 ? p[0] + '…' : p)).join(' ');
}

/** مقارنة زمن ثابت */
function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/** aHash بعرض 16x16 = 256 بت يُرسل من المتصفح، نقارنه بمسافة هامنغ */
function hashSimilarity(hashA, hashB) {
  if (!hashA || !hashB) return null;
  const a = String(hashA);
  const b = String(hashB);
  if (a.length !== b.length || a.length < 16) return null;
  let same = 0;
  for (let i = 0; i < a.length; i++) if (a[i] === b[i]) same++;
  return same / a.length;
}

/** تحديد معدّل الطلبات في الذاكرة (لكل IP) */
const buckets = new Map();
function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const rec = buckets.get(key);
  if (!rec || now > rec.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  rec.count++;
  if (rec.count > limit) return { ok: false, remaining: 0, retryAfter: Math.ceil((rec.reset - now) / 1000) };
  return { ok: true, remaining: limit - rec.count };
}

/** حماية السجل من أي بيانات قد تكون حساسة */
function redact(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/\d{14}/g, (m) => m.slice(0, 4) + '********' + m.slice(12));
}

module.exports = {
  sha256, hmac, identityFingerprint, normalizeDigits, randomToken, receiptCode,
  parseNationalId, validEgyptianPhone, maskName, safeEqual, hashSimilarity,
  rateLimit, redact, GOVERNORATES,
};
