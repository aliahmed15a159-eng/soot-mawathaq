'use strict';
/**
 * سجل مزوّدي التحقق — اختيار المزوّد بالإعداد، وإسقاط آمن (fallback) إلى المحرك التجريبي.
 * VERIFY_PROVIDER = demo | facepp | rekognition | azure
 */
const demo = require('./demo');
const sec = require('../security');

const PROVIDERS = {
  demo: { id: 'demo', label: 'محرك تجريبي محلي (بدون مفاتيح)', module: demo, alwaysConfigured: true },
  facepp: { id: 'facepp', label: 'Face++ (Megvii)', module: require('./facepp'), env: ['FACEPP_API_KEY', 'FACEPP_API_SECRET'] },
  rekognition: { id: 'rekognition', label: 'AWS Rekognition', module: require('./aws-rekognition'), env: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'] },
  azure: { id: 'azure', label: 'Azure AI Face', module: require('./azure-face'), env: ['AZURE_FACE_KEY', 'AZURE_FACE_ENDPOINT'] },
};

function requestedId() {
  const id = String(process.env.VERIFY_PROVIDER || 'demo').toLowerCase()
    .split('#')[0].trim().split(/\s+/)[0].replace(/["']/g, '');
  return PROVIDERS[id] ? id : 'demo';
}

function get(id) {
  return PROVIDERS[id] || PROVIDERS.demo;
}

/** الحالة الفعلية: المزوّد المطلوب لو مكتمل المفاتيح، وإلا نرجع للمحرك التجريبي بسبب واضح */
function status() {
  const wanted = requestedId();
  const p = get(wanted);
  if (p.alwaysConfigured) return { active: 'demo', requested: wanted, ok: true, note: 'المحرك التجريبي (لا يوجد مزوّد خارجي)' };
  const missing = (p.env || []).filter((k) => !process.env[k]);
  if (missing.length) {
    return { active: 'demo', requested: wanted, ok: false, label: p.label, missing, note: `المفاتيح الناقصة: ${missing.join(', ')} — تم الرجوع للمحرك التجريبي` };
  }
  return { active: p.id, requested: wanted, ok: true, label: p.label, note: `${p.label} جاهز` };
}

function active() { return get(status().active).module; }

/** استدعاء المزوّد مع قياس الزمن وتسجيل الأخطاء (بدون كسر الرحلة) */
/** تسجيل نداء المزوّد في سجل التدقيق (لا يعطّل العملية لو الجدول غير موجود) */
function logCall(row) {
  try {
    const { db } = require('../db');
    db.recordProviderCall(row).catch(() => {});
  } catch { /* لا شيء */ }
}

async function safely(fn, fallbackValue, meta = {}) {
  const s = status();
  const op = meta.operation || 'call';
  if (s.active === 'demo') return { ...fallbackValue, provider: 'demo', degraded: true };
  const started = Date.now();
  try {
    const out = await fn(active());
    const ms = Date.now() - started;
    logCall({ provider: s.active, operation: op, ms, ok: true, score: out && out.score, voter_id: meta.voter_id });
    return { ...out, provider: s.active, ms };
  } catch (err) {
    const ms = Date.now() - started;
    const error = sec.redact(String(err.message || err));
    logCall({ provider: s.active, operation: op, ms, ok: false, error, voter_id: meta.voter_id });
    return { ...fallbackValue, provider: s.active, failed: true, error, degraded: true, ms, meta };
  }
}

module.exports = {
  logCall, PROVIDERS, status, active, get, requestedId, safely };
