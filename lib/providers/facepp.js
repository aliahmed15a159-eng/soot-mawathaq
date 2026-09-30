'use strict';
/**
 * مزوّد التحقق: Face++ (Megvii)
 * يوفّر: قراءة الوجه والتأكد من وضوحه، مطابقة وجه البطاقة بالسيلفي، ومؤشر حياة.
 * يعمل عبر REST مباشرة بدون أي مكتبات خارجية.
 */
const BASE = process.env.FACEPP_REGION === 'cn'
  ? 'https://api-cn.faceplusplus.com'
  : process.env.FACEPP_REGION === 'sg'
    ? 'https://api-sg.faceplusplus.com'
    : 'https://api-us.faceplusplus.com';

const TIMEOUT = 20000;

async function call(path, params) {
  const body = new URLSearchParams();
  body.set('api_key', process.env.FACEPP_API_KEY || '');
  body.set('api_secret', process.env.FACEPP_API_SECRET || '');
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) body.set(k, v); });

  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok || (data && data.error_message)) {
    const msg = (data && (data.error_message || `${data.error_code || ''}`)) || `HTTP ${res.status}`;
    throw new Error(`Face++ ${path}: ${msg}`);
  }
  return data || {};
}

function configured() {
  return !!(process.env.FACEPP_API_KEY && process.env.FACEPP_API_SECRET);
}

/** كشف الوجه + ملامحه + جودته (blur / illumination / زاوية الرأس) */
async function detectFace(imageBase64) {
  const data = await call('/facepp/v3/detect', {
    image_base64: imageBase64,
    return_landmark: 1,
    return_attributes: 'headpose,blur,illumination,eyestatus,smile,facequality',
  });
  const face = (data.faces || [])[0];
  if (!face) return { found: false, reason: 'مفيش وجه ظاهر في الصورة' };
  const attrs = face.attributes || {};
  const eyes = attrs.eyestatus || {};
  const left = (eyes.left_eye_status || eyes.left_eye || {});
  const right = (eyes.right_eye_status || eyes.right_eye || {});
  return {
    found: true,
    faceToken: face.face_token,
    rect: face.face_rectangle,
    headPose: attrs.headpose || null,
    blur: attrs.blur || null,
    illumination: attrs.illumination || null,
    smile: attrs.smile || null,
    quality: attrs.facequality || null,
    eyesOpenRatio: typeof left.open_eye === 'number' ? (left.open_eye + (right.open_eye || 0)) / 2 : null,
    raw: { face_count: (data.faces || []).length, image_id: data.image_id, request_id: data.request_id },
  };
}

/** مطابقة شخصين: صورة البطاقة ↔ السيلفي */
async function compareFaces(imageBase64Card, imageBase64Selfie) {
  const data = await call('/facepp/v3/compare', {
    image_base64_1: imageBase64Card,
    image_base64_2: imageBase64Selfie,
  });
  const confidence = typeof data.confidence === 'number' ? data.confidence : 0;
  return {
    score: Math.round(confidence) / 100,          // 0..1 بنفس تدرج المنصة
    confidence,                                    // 0..100 كما يعيده المزوّد
    thresholds: data.thresholds || null,
    faces1: data.faces1 || null,
    faces2: data.faces2 || null,
    provider: 'facepp',
    note: confidence >= 80 ? 'تطابق قوي' : confidence >= 70 ? 'منطقة رمادية' : 'تطابق ضعيف',
  };
}

/**
 * كشف الحياة عبر واجهة Face Liveness (متاحة حسب الحساب).
 * لو الواجهة غير مفعّلة للحساب، نرجع null ونكمل بمؤشرات العميل — بدون كسر الرحلة.
 */
async function checkLiveness(imageBase64) {
  try {
    const data = await call('/facepp/v1/face/liveness', { image_base64: imageBase64 });
    const value = data.liveness_confidence !== undefined ? data.liveness_confidence
      : data.result !== undefined ? data.result : null;
    if (value === null) return null;
    const score = value > 1 ? value / 100 : value;
    return { score, raw: data, note: score >= 0.9 ? 'حياة مؤكدة' : 'مؤشر حياة منخفض' };
  } catch (err) {
    return { score: null, error: err.message, note: 'واجهة كشف الحياة غير متاحة للحساب — تم الاعتماد على مؤشرات العميل' };
  }
}

module.exports = { id: 'facepp', label: 'Face++ (Megvii)', configured, detectFace, compareFaces, checkLiveness };
