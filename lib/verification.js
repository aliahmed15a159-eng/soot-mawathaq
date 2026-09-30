'use strict';
/**
 * خط أنابيب التحقق من الهوية — المرحلة ٢
 * ------------------------------------------------------------------
 * الطبقات بالترتيب:
 *   ① قراءة البطاقة: مزوّد OCR حقيقي (OCR.space / Google / Azure) ⇢ استخراج الحقول
 *      ثم مطابقة عربية ذكية عبر lib/matcher.js (الاسم/الرقم القومي/تاريخ الميلاد/المحافظة)
 *   ② كشف الحياة: مؤشرات حركة العميل + (اختياريًا) واجهة حياة المزوّد
 *   ③ مطابقة الوجه: مزوّد بيومتري (Face++ / AWS / Azure) بدرجة ثقة 0..100 ⇢ 0..1
 *   ④ القرار: قبول / مراجعة بشرية / رفض — حسب العتبات ومنطقة رمادية واضحة
 * كل طبقة تعمل «بأفضل جهد»: فشل مزوّد لا يوقف الرحلة، بل يخفض الثقة ويظهر في التفاصيل.
 */
const { config } = require('./config');
const sec = require('./security');
const matcher = require('./matcher');
const providers = require('./providers');

/* ---------------------------------------------------------------- تحديات الحياة */

function newLivenessChallenge() {
  const pool = [
    { code: 'blink', label: 'ارمش بعينك مرتين', seconds: 4 },
    { code: 'left', label: 'لف راسك شوية شمال', seconds: 4 },
    { code: 'right', label: 'لف راسك شوية يمين', seconds: 4 },
    { code: 'close', label: 'قرّب وشك ناحية الكاميرا', seconds: 4 },
    { code: 'smile', label: 'ابتسم بسيط', seconds: 4 },
  ];
  return [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
}

/**
 * تقييم كشف الحياة
 * events: [{ code, at, landmarks: {yaw, eye, mouth, faceWidth, confidence} }]
 * providerLiveness: { score } من المزوّد إن توفّر
 */
function evaluateLiveness(challenge, events, frames, providerLiveness = null) {
  const r = { ok: false, score: 0, reasons: [], checks: {} };
  if (!Array.isArray(events) || !events.length) {
    return { ok: false, score: 0, reasons: ['لم تُسجَّل أي حركة أمام الكاميرا'], checks: {} };
  }
  const byCode = new Map();
  events.forEach((e) => { if (e && e.code && !byCode.has(e.code)) byCode.set(e.code, e); });

  let done = 0;
  for (const step of challenge) {
    const ev = byCode.get(step.code);
    if (!ev) { r.reasons.push(`الحركة «${step.label}» لم تُنفَّذ`); continue; }
    const lm = ev.landmarks || {};
    const elapsed = Math.max(0, Number(ev.at || 0)) / 1000;

    if (elapsed < 0.25 || elapsed > 12) { r.reasons.push(`توقيت غير طبيعي للحركة «${step.label}»`); continue; }

    let detected = false;
    switch (step.code) {
      case 'blink': detected = typeof lm.eye === 'number' && lm.eye < 0.12; break;
      case 'left': detected = typeof lm.yaw === 'number' && lm.yaw < -0.08; break;
      case 'right': detected = typeof lm.yaw === 'number' && lm.yaw > 0.08; break;
      case 'close': detected = typeof lm.faceWidth === 'number' && lm.faceWidth > 0.26; break;
      case 'smile': detected = typeof lm.mouth === 'number' && lm.mouth > 0.055; break;
      default: detected = true;
    }
    // ثقة الملامح: إن أرسلها المتصفح (FaceDetector / موديل ملامح) نطلب حدًا أدنى معقولًا
    const conf = typeof lm.confidence === 'number' ? lm.confidence : null;
    if (detected && conf !== null && conf < 0.35) { r.reasons.push(`ثقة منخفضة في قراءة «${step.label}»`); continue; }
    if (detected) done++;
    else r.reasons.push(`مقدرناش نتأكد من الحركة «${step.label}»`);
  }

  const frameCount = Number(frames || 0);
  if (frameCount < 12) r.reasons.push('عدد الإطارات المسجّلة قليل — تأكد من الإضاءة وسرعة الإنترنت');

  r.score = done / challenge.length;
  r.ok = r.score >= 0.66 && frameCount >= 12;

  // مؤشر المزوّد (إن توفّر) لازم يعدّي حدًا أدنى
  if (providerLiveness && typeof providerLiveness.score === 'number') {
    r.checks.provider_liveness = providerLiveness.score;
    if (providerLiveness.score < 0.8) { r.ok = false; r.reasons.push(`مؤشر حياة المزوّد منخفض (${providerLiveness.score})`); }
  }
  return r;
}

/* ---------------------------------------------------------------- قراءة البطاقة */

/**
 * تحويل مخرجات OCR إلى قرار مطابقة مع البيانات المُدخلة
 * يُستدعى فقط لو المزوّد الحقيقي مفعّل — وإلا نرجع null ونكمل بالوضع التجريبي.
 */
async function readCardFields({ voter, cardBase64 }) {
  const ocr = require('./providers/ocr');
  const id = ocr.providerId();
  if (id === 'demo' || !cardBase64) return null;
  try {
    const result = await ocr.readCard(cardBase64);
    if (!result.fields) return null;
    const decision = matcher.decideCardFields({
      typed: {
        national_id: voter.national_id_masked ? voter._rawNationalId || '' : '',
        full_name: voter.full_name,
        birth_date: voter.birth_date,
        governorate: voter.governorate,
      },
      extracted: result.fields,
    });
    return {
      provider: result.provider,
      score: decision.score,
      ok: decision.ok,
      hardFail: decision.hardFail,
      fields: result.fields,
      checks: decision.checks,
      reasons: decision.reasons,
      raw_text: String(result.text || '').slice(0, 600),
      confidence: result.confidence,
    };
  } catch (err) {
    return {
      provider: id, score: 0, ok: false, hardFail: false, error: sec.redact(String(err.message || err)),
      reasons: [`تعذّرت قراءة البطاقة آليًا: ${String(err.message || err).slice(0, 120)}`],
    };
  }
}

/* ---------------------------------------------------------------- مطابقة الوجه */

async function matchFacesLayer({ cardBase64, selfieBase64, cardMeta, selfieMeta, voterId }) {
  const s = providers.status();
  if (s.active === 'demo') {
    const demo = require('./providers/demo');
    return demo.compareFaces(
      { ...(cardMeta || {}), base64: cardBase64 },
      { ...(selfieMeta || {}), base64: selfieBase64 },
    );
  }
  if (!cardBase64 || !selfieBase64) {
    return { score: 0, provider: s.active, failed: true, note: 'صور الصور غير مكتملة للمزوّد' };
  }
  return providers.safely(
    (p) => p.compareFaces(cardBase64, selfieBase64),
    { score: 0, note: 'تعذّر الاتصال بمزوّد المطابقة' },
    { operation: 'compare_faces', voter_id: voterId },
  );
}

async function livenessFromProvider(selfieBase64, voterId) {
  const s = providers.status();
  if (s.active === 'demo' || !selfieBase64) return null;
  const p = providers.active();
  if (typeof p.checkLiveness !== 'function') return null;
  const res = await providers.safely(() => p.checkLiveness(selfieBase64), { score: null },
    { operation: 'check_liveness', voter_id: voterId });
  return res && typeof res.score === 'number' ? res : null;
}

/* ---------------------------------------------------------------- القرار النهائي */

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo)); }
function round(v) { return Math.round(Number(v) * 100) / 100; }

/**
 * القرار النهائي
 * returns { status: 'approved'|'review'|'rejected', score, checks, reasons, details }
 */
async function decide({
  voter, cardMeta, selfieMeta, challenge, livenessEvents, frames,
  cardBase64, selfieBase64, providerScore, cardOcr, faceResult, otpVerified,
}) {
  const t = config.thresholds;
  const card = cardOcr || null;
  const face = faceResult || await matchFacesLayer({ cardBase64, selfieBase64, cardMeta, selfieMeta, voterId: voter && voter.id });
  const providerLive = await livenessFromProvider(selfieBase64, voter && voter.id);
  const live = evaluateLiveness(challenge, livenessEvents, frames, providerLive);

  const cardQuality = clamp(Number((cardMeta && cardMeta.quality) || 0), 0, 1);
  const selfieQuality = clamp(Number((selfieMeta && selfieMeta.quality) || 0), 0, 1);
  const faceScore = typeof face.score === 'number' ? face.score : 0;
  // لو OCR حقيقي مفعّل، نأخذ نتيجة مطابقة الحقول؛ وإلا نرجع لتقدير جودة القراءة التجريبي
  const cardReadScore = card ? card.score : clamp(0.55 + cardQuality * 0.42, 0, 0.97);

  const checks = {
    otp: otpVerified === undefined ? { ok: true, value: 1 } : { ok: !!otpVerified, value: otpVerified ? 1 : 0 },
    card_read: { ok: card ? card.ok : cardReadScore >= t.ocrAccept, score: round(cardReadScore), provider: card ? card.provider : 'quality-estimate' },
    card_quality: { ok: cardQuality >= t.qualityAccept, value: round(cardQuality) },
    liveness: { ok: live.ok, score: round(live.score), provider_liveness: providerLive && providerLive.score },
    selfie_quality: { ok: selfieQuality >= t.qualityAccept, value: round(selfieQuality) },
    face_match: { ok: faceScore >= t.faceReview, score: round(faceScore), provider: face.provider || 'demo' },
  };

  const reasons = [...live.reasons];
  const details = {
    card_ocr: card, face, liveness: live, provider_liveness: providerLive,
    provider: providers.status(), thresholds: t,
  };

  if (!checks.otp.ok) {
    reasons.push('لم يتم تأكيد رقم الموبايل بكود التحقق');
    return { status: 'rejected', score: faceScore, checks, reasons, details };
  }
  if (!checks.selfie_quality.ok) {
    reasons.push('جودة صورة السيلفي ضعيفة — جرّب إضاءة أحسن ومن غير اهتزاز');
    return { status: 'rejected', score: faceScore, checks, reasons, details };
  }
  if (!live.ok) return { status: 'rejected', score: faceScore, checks, reasons, details };
  if (face.reusedImage) {
    reasons.push('الصورتان متطابقتان تمامًا — لازم سيلفي مباشر مش نفس صورة البطاقة');
    return { status: 'rejected', score: faceScore, checks, reasons, details };
  }
  if (!checks.card_quality.ok) {
    reasons.push('صورة البطاقة غير واضحة — جرّب تصويرها في إضاءة أحسن');
    return { status: 'rejected', score: faceScore, checks, reasons, details };
  }
  // البطاقة لشخص آخر: الرقم القومي المقروء لا يطابق المُدخل ⇒ رفض فوري (بلا مراجعة)
  if (card && card.hardFail) {
    reasons.push(...(card.reasons.length ? card.reasons : ['بيانات البطاقة لا تطابق البيانات المُدخلة']));
    return { status: 'rejected', score: faceScore, checks, reasons, details };
  }
  if (!checks.card_read.ok) reasons.push(...((card && card.reasons) || ['قراءة بيانات البطاقة غير مؤكدة']));
  if (face.failed || face.degraded) reasons.push('مزوّد المطابقة لم يستجب — تم تخفيض الثقة');

  const reviewBand = faceScore >= t.faceReview && faceScore < t.faceAccept;
  const cardReviewBand = card && !card.ok && card.score >= 0.5 && !card.hardFail;
  if (!checks.card_read.ok || reviewBand || cardReviewBand) {
    return { status: 'review', score: faceScore, checks, reasons, details };
  }
  if (faceScore >= t.faceAccept) {
    return { status: 'approved', score: faceScore, checks, reasons, details };
  }
  reasons.push('نسبة التشابه بين السيلفي وصورة البطاقة منخفضة');
  return { status: 'rejected', score: faceScore, checks, reasons, details };
}

module.exports = {
  newLivenessChallenge, evaluateLiveness, decide,
  matchFacesLayer, readCardFields, livenessFromProvider,
  VERIFY_PROVIDER: process.env.VERIFY_PROVIDER || 'demo',
};
