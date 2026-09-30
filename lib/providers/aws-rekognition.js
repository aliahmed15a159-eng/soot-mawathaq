'use strict';
/**
 * مزوّد التحقق: AWS Rekognition (CompareFaces + DetectFaces)
 * تنفيذ توقيع AWS SigV4 بالكود الصافي — بدون aws-sdk.
 * المطلوب في البيئة: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
 */
const crypto = require('crypto');

const REGION = process.env.AWS_REGION || 'eu-central-1';
const HOST = `rekognition.${REGION}.amazonaws.com`;
const SERVICE = 'rekognition';

function configured() {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

const sha256hex = (data) => crypto.createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();

function signingKey(secret, date, region, service) {
  const kDate = hmac('AWS4' + secret, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

async function call(target, payload) {
  const body = JSON.stringify(payload);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const canonicalHeaders = [
    `content-type:application/x-amz-json-1.1`,
    `host:${HOST}`,
    `x-amz-date:${amzDate}`,
    `x-amz-target:${target}`,
  ].join('\n') + '\n';
  const signedHeaders = 'content-type;host;x-amz-date;x-amz-target';
  const canonicalRequest = [
    'POST', '/', '', canonicalHeaders, signedHeaders, sha256hex(body),
  ].join('\n');

  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256hex(canonicalRequest)].join('\n');
  const signature = crypto.createHmac('sha256', signingKey(process.env.AWS_SECRET_ACCESS_KEY, dateStamp, REGION, SERVICE))
    .update(stringToSign).digest('hex');

  const authorization = `AWS4-HMAC-SHA256 Credential=${process.env.AWS_ACCESS_KEY_ID}/${scope}, `
    + `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${HOST}/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Date': amzDate,
      'X-Amz-Target': target,
      Authorization: authorization,
    },
    body,
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) throw new Error(`AWS ${target}: ${(data && (data.message || data.Message)) || `HTTP ${res.status}`}`);
  return data || {};
}

/** مطابقة وجهين: البطاقة (Source) والسيلفي (Target) */
async function compareFaces(cardBase64, selfieBase64, threshold = 70) {
  const data = await call('RekognitionService.CompareFaces', {
    SourceImage: { Bytes: cardBase64 },
    TargetImage: { Bytes: selfieBase64 },
    SimilarityThreshold: 0,
  });
  const match = (data.FaceMatches || [])[0];
  const similarity = match ? match.Similarity : 0;
  return {
    score: Math.round(similarity) / 100,
    confidence: Math.round(similarity),
    similarity: Math.round(similarity * 10) / 10,
    matched: similarity >= threshold,
    sourceFace: data.SourceImageFace || null,
    unmatched: (data.UnmatchedFaces || []).length,
    provider: 'rekognition',
    note: similarity >= 85 ? 'تطابق قوي' : similarity >= threshold ? 'منطقة رمادية' : 'تطابق ضعيف',
  };
}

/** كشف الوجه وحالة العين (مؤشر إضافي لكشف الحياة) */
async function detectFace(imageBase64) {
  const data = await call('RekognitionService.DetectFaces', {
    Image: { Bytes: imageBase64 },
    Attributes: ['DEFAULT', 'ALL'],
  });
  const face = (data.FaceDetails || [])[0];
  if (!face) return { found: false, reason: 'مفيش وجه ظاهر' };
  const eyesOpen = (face.EyesOpen && face.EyesOpen.Value) || false;
  const sharpness = (face.Quality && face.Quality.Sharpness) || null;
  const brightness = (face.Quality && face.Quality.Brightness) || null;
  return {
    found: true,
    rect: face.BoundingBox,
    eyesOpen,
    eyesOpenConfidence: (face.EyesOpen && face.EyesOpen.Confidence) || 0,
    pose: face.Pose || null,
    quality: { sharpness, brightness },
    provider: 'rekognition',
  };
}

module.exports = { id: 'rekognition', label: 'AWS Rekognition', configured, compareFaces, detectFace, checkLiveness: async () => null };
