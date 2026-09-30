'use strict';
/**
 * مزوّدات قراءة البطاقة (OCR) — الواجهة موحّدة: readCard(base64) → { text, fields, provider }
 * المدعوم: OCR.space (مفتاح مجاني) · Google Cloud Vision · Azure Read · ومحرك تجريبي محلي.
 * بعد قراءة النص، يُستخرج الرقم القومي وتاريخ الميلاد والمحافظة ويُقارن بالبيانات المُدخلة.
 */
const { normalizeDigits, normalizeArabic } = require('../matcher');

const TIMEOUT = 25000;
const GOVERNORATES = require('../security').GOVERNORATES;

function autoId() {
  if (process.env.OCRSPACE_KEY) return 'ocrspace';
  if (process.env.GOOGLE_VISION_KEY) return 'google';
  if (process.env.AZURE_VISION_KEY && process.env.AZURE_VISION_ENDPOINT) return 'azure-read';
  return 'demo';
}

/** المزوّد المُختار: OCR_PROVIDER الصريح لو مفاتيحه موجودة، وإلا اختيار تلقائي حسب المفاتيح */
function providerId() {
  const explicit = String(process.env.OCR_PROVIDER || '').toLowerCase()
    .split('#')[0].trim().split(/\s+/)[0].replace(/["']/g, '');
  const usable = {
    ocrspace: !!process.env.OCRSPACE_KEY,
    google: !!process.env.GOOGLE_VISION_KEY,
    'azure-read': !!(process.env.AZURE_VISION_KEY && process.env.AZURE_VISION_ENDPOINT),
  };
  if (explicit === 'azure') return usable['azure-read'] ? 'azure-read' : autoId();
  if (explicit && usable[explicit]) return explicit;
  return autoId();
}

async function readWithOcrSpace(base64) {
  const body = new URLSearchParams();
  body.set('apikey', process.env.OCRSPACE_KEY);
  body.set('base64Image', `data:image/jpeg;base64,${base64}`);
  body.set('language', process.env.OCRSPACE_LANG || 'ara');
  body.set('OCREngine', '2');
  body.set('scale', 'true');
  body.set('isTable', 'false');
  const res = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const data = await res.json();
  if (data.IsErroredOnProcessing) throw new Error(`OCR.space: ${(data.ErrorMessage || []).join(', ')}`);
  const parsed = (data.ParsedResults || [])[0] || {};
  return { text: parsed.ParsedText || '', confidence: parsed.TextOverlay ? 0.85 : 0.75 };
}

async function readWithGoogleVision(base64) {
  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        image: { content: base64 },
        features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
        imageContext: { languageHints: ['ar', 'en'] },
      }],
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Google Vision: ${data.error.message}`);
  const ann = (data.responses || [])[0] || {};
  return { text: (ann.fullTextAnnotation && ann.fullTextAnnotation.text) || '', confidence: 0.9 };
}

async function readWithAzureRead(base64) {
  const endpoint = String(process.env.AZURE_VISION_ENDPOINT).replace(/\/+$/, '');
  const headers = { 'Ocp-Apim-Subscription-Key': process.env.AZURE_VISION_KEY, 'Content-Type': 'application/octet-stream' };
  const start = await fetch(`${endpoint}/vision/v3.2/read/analyze?language=ar`, {
    method: 'POST', headers, body: Buffer.from(base64, 'base64'), signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!start.ok) throw new Error(`Azure Read: HTTP ${start.status}`);
  const opUrl = start.headers.get('operation-location');
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 700));
    const poll = await fetch(opUrl, { headers: { 'Ocp-Apim-Subscription-Key': process.env.AZURE_VISION_KEY } });
    const data = await poll.json();
    if (data.status === 'succeeded') {
      const lines = (data.analyzeResult && data.analyzeResult.readResults || [])
        .flatMap((r) => (r.lines || []).map((l) => l.text));
      return { text: lines.join('\n'), confidence: 0.88 };
    }
    if (data.status === 'failed') throw new Error('Azure Read: فشلت المعالجة');
  }
  throw new Error('Azure Read: انتهت مدة الانتظار');
}

/**
 * استخراج الحقول من نص البطاقة المصرية
 * البطاقة تحتوي: «جمهورية مصر العربية» / «بطاقة تحقيق الشخصية» / الرقم القومي 14 رقمًا / الاسم / تاريخ الميلاد / المحافظة
 */
function extractFields(text) {
  const raw = String(text || '');
  const digitsNormalized = normalizeDigits(raw);
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);

  // الرقم القومي: 14 رقمًا يبدأ بـ 2 أو 3 (وقد يُقرأ بمسافات أو شرطات)
  let nationalId = null;
  const loose = raw.replace(/[^\d\u0660-\u0669]{1,3}/g, ' ');
  const candidates = [];
  for (const chunk of [digitsNormalized, normalizeDigits(loose)]) {
    for (let i = 0; i <= Math.max(0, chunk.length - 14); i++) {
      const slice = chunk.slice(i, i + 14);
      if (/^[23]/.test(slice)) candidates.push(slice);
    }
  }
  if (candidates.length) {
    const freq = {};
    candidates.forEach((c) => { freq[c] = (freq[c] || 0) + 1; });
    nationalId = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  }

  // تاريخ الميلاد: أنماط متعددة
  let birthDate = null;
  const datePatterns = [
    /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/,
    /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/,
  ];
  for (const p of datePatterns) {
    const m = digitsNormalized.match(p);
    if (!m) continue;
    let [, a, b, c] = m;
    let y; let mo; let d;
    if (a.length === 4) { y = +a; mo = +b; d = +c; } else { d = +a; mo = +b; y = +c; }
    if (y > 1900 && y < 2020 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      birthDate = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      break;
    }
  }
  if (!birthDate && nationalId) {
    const c = nationalId[0] === '2' ? 1900 : 2000;
    birthDate = `${c + +nationalId.slice(1, 3)}-${nationalId.slice(3, 5)}-${nationalId.slice(5, 7)}`;
  }

  // المحافظة: من كود الرقم القومي (أدق من قراءة النص العربي)
  const governorate = nationalId && GOVERNORATES[nationalId.slice(7, 9)] ? GOVERNORATES[nationalId.slice(7, 9)] : null;

  // الاسم: أسطر عربية بدون الكلمات المطبوعة الثابتة
  const fixed = ['جمهورية', 'مصر', 'العربية', 'بطاقة', 'تحقيق', 'الشخصية', 'الرقم', 'القومي',
    'تاريخ', 'الميلاد', 'محل', 'الإصدار', 'انتهاء', 'الصلاحية', 'الاسم', 'سارية', 'حتى', 'ذكر', 'أنثى'];
  const nameCandidates = lines
    .map((l) => l.replace(/[^\u0600-\u06FF\s]/g, ' ').replace(/\s+/g, ' ').trim())
    // إزالة الكلمات المطبوعة الثابتة من السطر (الاسم / بطاقة / تحقيق …)
    .map((l) => l.split(' ')
      .filter((w) => !fixed.some((f) => normalizeArabic(f) === normalizeArabic(w)))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim())
    .filter((l) => {
      const words = normalizeArabic(l).split(' ').filter((w) => w.length > 2);
      return words.length >= 2;
    })
    .map((l) => ({ line: l, words: normalizeArabic(l).split(' ').length }));
  nameCandidates.sort((a, b) => b.words - a.words);
  const fullName = nameCandidates.length ? nameCandidates[0].line : null;

  return {
    national_id: nationalId,
    birth_date: birthDate,
    governorate,
    full_name: fullName,
    name_candidates: nameCandidates.slice(0, 3).map((c) => c.line),
    digits_seen: digitsNormalized.length,
    raw_text: raw.slice(0, 1200),
  };
}

async function readCard(base64) {
  const id = providerId();
  if (id === 'demo' || !base64) {
    return { provider: 'demo', text: '', fields: null, note: 'وضع تجريبي: القراءة تتم بمقارنة البيانات المُدخلة (فعّل مزوّد OCR حقيقي بمفتاح في .env)' };
  }
  let result;
  const started = Date.now();
  try {
    if (id === 'ocrspace') result = await readWithOcrSpace(base64);
    else if (id === 'google') result = await readWithGoogleVision(base64);
    else if (id === 'azure-read') result = await readWithAzureRead(base64);
    else throw new Error(`مزوّد OCR غير معروف: ${id}`);
  } catch (err) {
    const error = String(err.message || err).slice(0, 200);
    try { const { db } = require('../db'); db.recordProviderCall({ provider: id, operation: 'ocr_read', ms: Date.now() - started, ok: false, error }).catch(() => {}); } catch { /* لا شيء */ }
    throw err;
  }
  const fields = extractFields(result.text);
  try {
    const { db } = require('../db');
    db.recordProviderCall({ provider: id, operation: 'ocr_read', ms: Date.now() - started, ok: true, score: fields && fields.overall }).catch(() => {});
  } catch { /* لا شيء */ }
  return { provider: id, text: result.text, confidence: result.confidence, fields };
}

module.exports = { providerId, readCard, extractFields };
