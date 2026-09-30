'use strict';
/**
 * مزوّد التحقق: Azure AI Face
 * المطلوب في البيئة: AZURE_FACE_KEY, AZURE_FACE_ENDPOINT
 * ملاحظة: Azure يشترط إقرار «الاستخدام المسؤول» ومستوى وصول محدود للتعرف على الوجوه.
 */
const TIMEOUT = 20000;

function configured() {
  return !!(process.env.AZURE_FACE_KEY && process.env.AZURE_FACE_ENDPOINT);
}
const base = () => String(process.env.AZURE_FACE_ENDPOINT || '').replace(/\/+$/, '');

async function request(path, body, method = 'POST', extraQuery = '') {
  const res = await fetch(`${base()}${path}${extraQuery}`, {
    method,
    headers: { 'Ocp-Apim-Subscription-Key': process.env.AZURE_FACE_KEY, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    const msg = (data && data.error && (data.error.message || data.error.code)) || `HTTP ${res.status}`;
    throw new Error(`Azure Face ${path}: ${msg}`);
  }
  return data;
}

async function detectFaceId(imageBase64) {
  const data = await request('/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false&detectionModel=detection_03&recognitionModel=recognition_04',
    { url: undefined, ...(imageBase64 ? { } : {}) }, 'POST');
  return data;
}

/** كشف الوجه وإرجاع معرف مؤقت للمطابقة */
async function detect(base64) {
  const res = await fetch(`${base()}/face/v1.0/detect?returnFaceId=true&detectionModel=detection_03&recognitionModel=recognition_04`, {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': process.env.AZURE_FACE_KEY, 'Content-Type': 'application/octet-stream' },
    body: Buffer.from(base64, 'base64'),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) throw new Error(`Azure Face detect: ${(data && data.error && data.error.message) || res.status}`);
  const face = (data || [])[0];
  if (!face) return { found: false, reason: 'مفيش وجه ظاهر' };
  return { found: true, faceId: face.faceId, rect: face.faceRectangle, provider: 'azure' };
}

/** مطابقة شخصين عبر معرفات الوجه (صالح 24 ساعة) */
async function verify(faceId1, faceId2) {
  const data = await request('/face/v1.0/verify', { faceId1, faceId2 });
  return {
    score: Math.round((data.confidence || 0) * 100) / 100,
    confidence: Math.round((data.confidence || 0) * 1000) / 10,
    matched: !!data.isIdentical,
    provider: 'azure',
    note: data.isIdentical ? 'مطابق' : 'غير مطابق',
  };
}

async function compareFaces(cardBase64, selfieBase64) {
  const [a, b] = await Promise.all([detect(cardBase64), detect(selfieBase64)]);
  if (!a.found || !b.found) {
    return { score: 0, provider: 'azure', note: !a.found ? 'وجه البطاقة غير واضح' : 'وجه السيلفي غير واضح' };
  }
  return verify(a.faceId, b.faceId);
}

module.exports = { id: 'azure', label: 'Azure AI Face', configured, detect, compareFaces, detectFaceId, checkLiveness: async () => null };
