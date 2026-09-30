'use strict';
/**
 * منطق العمل — كل قواعد المنصة في مكان واحد:
 *  - التسجيل وقراءة بيانات الرقم القومي
 *  - خط التحقق وإصدار رمز الاقتراع
 *  - الاقتراع السري (صوت واحد لكل هوية)
 *  - الإيصال والنتائج والمراجعة البشرية
 */
const fs = require('fs');
const path = require('path');
const { config } = require('./config');
const { db } = require('./db');
const sec = require('./security');
const ver = require('./verification');
const otp = require('./otp');
const providers = require('./providers');
const matcher = require('./matcher');
const { stripDataUrl } = require('./imageutil');

const os = require('os');
const REVIEW_DIR = process.env.VERCEL ? path.join(os.tmpdir(), 'soot-review') : path.join(__dirname, '..', 'data', 'review');

/* ------------------------------------------------------------------ أدوات مساعدة */

function ok(data) { return { ok: true, ...data }; }
function fail(error, extra = {}) { return { ok: false, error, ...extra }; }

function saveReviewImage(reviewId, kind, dataUrl) {
  try {
    const m = String(dataUrl || '').match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
    if (!m) return null;
    fs.mkdirSync(REVIEW_DIR, { recursive: true });
    const file = `${reviewId}-${kind}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
    fs.writeFileSync(path.join(REVIEW_DIR, file), Buffer.from(m[2], 'base64'));
    return file;
  } catch (err) {
    console.error('[review] تعذّر حفظ الصورة:', err.message);
    return null;
  }
}

function deleteReviewImages(review) {
  ['card_image', 'selfie_image'].forEach((key) => {
    const file = review && review[key];
    if (!file) return;
    try { fs.unlinkSync(path.join(REVIEW_DIR, path.basename(file))); } catch { /* تجاهل */ }
  });
}

function cleanupReviewFiles() {
  try {
    if (!fs.existsSync(REVIEW_DIR)) return;
    const maxAge = config.reviewRetentionHours * 3600_000;
    const now = Date.now();
    for (const f of fs.readdirSync(REVIEW_DIR)) {
      const full = path.join(REVIEW_DIR, f);
      if (now - fs.statSync(full).mtimeMs > maxAge) fs.unlinkSync(full);
    }
  } catch (err) {
    console.error('[review] تنظيف دوري:', err.message);
  }
}

function electionState(election, now = Date.now()) {
  if (!election) return 'missing';
  if (election.state === 'closed') return 'closed';
  if (election.state === 'draft') return 'draft';
  if (election.starts_at && new Date(election.starts_at).getTime() > now) return 'scheduled';
  if (election.ends_at && new Date(election.ends_at).getTime() < now) return 'closed';
  return 'open';
}

async function sessionContext(session) {
  if (!session) return { ok: false, reason: 'no_session' };
  const voter = await db.findVoterById(session.vid);
  if (!voter) return { ok: false, reason: 'voter_missing' };
  return { ok: true, voter, session, token: session.token || null, electionId: session.eid, kiosk: !!session.kiosk };
}

/* ------------------------------------------------------------------ التسجيل */

async function register({ body, session }) {
  const fullName = String(body.full_name || '').trim().replace(/\s+/g, ' ');
  const parts = fullName.split(' ');
  if (parts.length < 2) return fail('اكتب الاسم بالكامل (اسم أول واسم عائلة على الأقل)');
  if (fullName.length < 6) return fail('الاسم قصير جدًا — اكتب الاسم كما في البطاقة');

  const nationalId = sec.normalizeDigits(body.national_id);
  const parsed = sec.parseNationalId(nationalId);
  if (!parsed.ok) return fail(parsed.reason);

  const birthInput = String(body.birth_date || '').trim();
  if (birthInput !== parsed.birthDate) {
    return fail('تاريخ الميلاد مكتوب لا يطابق الرقم القومي — راجع التاريخ');
  }

  const govInput = String(body.governorate || '').trim();
  if (govInput && govInput !== parsed.governorate) {
    return fail(`المحافظة مكتوبة لا تطابق الرقم القومي (المتوقع: ${parsed.governorate})`);
  }

  const phone = sec.normalizeDigits(body.phone);
  if (!sec.validEgyptianPhone(phone)) return fail('رقم الموبايل غير صحيح — لازم يبدأ بـ 010 / 011 / 012 / 015 ويكون 11 رقم');

  if (!body.consent) return fail('لازم توافق على جمع بياناتك للتحقق من الهوية فقط');

  const identityHash = sec.identityFingerprint(nationalId);

  // كشوف الناخبين: في الوضع الصارم لازم يكون مسجّلًا مسبقًا في كشف معتمد
  if (config.registerMode === 'strict') {
    const rollEntry = await db.findInVoterRoll(identityHash);
    const nameOk = rollEntry && matcher.scoreName(fullName, rollEntry.full_name).score >= 0.8;
    // السماح كذلك لمن تحقق بالفعل بنفس الهوية (إعادة دخول)
    const alreadyVerified = await db.findVoterByIdentity(identityHash);
    if (!nameOk && !(alreadyVerified && alreadyVerified.verified)) {
      await db.audit({ action: 'register_rejected_roll', meta: { gov: parsed.governorate, in_roll: !!rollEntry } });
      return fail('اسمك أو رقمك مش في كشف الناخبين المعتمد للانتخابة دي — راجع لجنة الإشراف');
    }
  }

  const existing = await db.findVoterByIdentity(identityHash);
  const electionId = (body.election_id || (session && session.eid) || '').toString() || null;

  // لو الشخص ده تحقق قبل كده وصوّت في نفس الانتخابة ⟶ منع التصويت المكرر
  if (existing && existing.verified && electionId) {
    const used = await db.hasVotedForElection(existing.id, electionId);
    if (used) {
      await db.audit({ action: 'duplicate_vote_attempt', actor: `voter:${existing.id}`, meta: { electionId } });
      return fail('سجلاتنا بتقول إنك صوّت بالفعل في الانتخابة دي — صوت واحد لكل ناخب', { code: 'already_voted' });
    }
  }

  const record = {
    full_name: fullName,
    identity_hash: identityHash,
    national_id_masked: `********${nationalId.slice(-4)}`,
    birth_date: parsed.birthDate,
    governorate: parsed.governorate,
    gender: parsed.gender,
    phone_masked: `*******${phone.slice(-4)}`,
    consent_at: new Date().toISOString(),
  };

  const voter = existing
    ? await db.updateVoter(existing.id, record)
    : await db.createVoter({ ...record, verified: false });

  await db.audit({
    action: existing ? 'register_resumed' : 'register_created',
    actor: `voter:${voter.id}`,
    meta: { gov: parsed.governorate, age: new Date().getFullYear() - parsed.year, otp: otp.mode() },
  });

  // التحقق من الموبايل بكود OTP (لو الخطوة مفعّلة) — قبل الكاميرا
  let otpChallenge = null;
  if (otp.mode() !== 'off') {
    const sent = await otp.issue(phone, { purpose: 'register' });
    // لو الإرسال فشل (شبكة/رصيد) مبنوقفش التسجيل — صفحة الكود هتحاول تاني
    otpChallenge = sent.ok
      ? { required: true, provider: sent.provider, masked: sent.masked, expires_in: sent.expiresIn, dev_code: sent.dev_code, reused: !!sent.reused, _hash: sent.hash, _exp: sent.expiresAt }
      : { required: true, provider: 'غير متاح', masked: `*******${phone.slice(-4)}`, error: sent.error, retry: true };
    await db.audit({ action: sent.ok ? 'otp_sent' : 'otp_send_failed', actor: `voter:${voter.id}`, meta: { phone_masked: otpChallenge.masked, provider: otpChallenge.provider } });
  }

  return ok({
    voterId: voter.id,
    session: {
      vid: voter.id, name: fullName, eid: electionId, phone,
      ...(otpChallenge && otpChallenge._hash ? { otp_hash: otpChallenge._hash, otp_exp: otpChallenge._exp } : {}),
    },
    otp: otpChallenge ? { ...otpChallenge, _hash: undefined, _exp: undefined } : null,
  });
}

/* ------------------------------------------------------------------ OTP */

async function confirmOtp({ session, body }) {
  const ctx = await sessionContext(session);
  if (!ctx.ok) return fail('الجلسة منتهية — ابدأ التسجيل من جديد');
  const voter = ctx.voter;
  const code = sec.normalizeDigits(body.code);
  const phone = sec.normalizeDigits(body.phone || (session && session.phone));
  if (!phone || phone.length !== 11) return fail('تعذّر تحديد رقم الموبايل — ابدأ التسجيل من جديد');
  if (!code || code.length !== 6) return fail('اكتب الكود المكوّن من 6 أرقام');
  const result = otp.verify(phone, code, {
    purpose: 'register',
    fallbackHash: session && session.otp_hash,
    fallbackExp: session && session.otp_exp,
  });
  await db.audit({
    action: result.ok ? 'otp_verified' : 'otp_failed',
    actor: `voter:${voter.id}`,
    meta: { ok: result.ok },
  });
  if (!result.ok) return fail(result.error);
  // الحالة في الجلسة الموقّعة — لا حاجة لأي عمود جديد في قاعدة البيانات
  return ok({ verified: true, session_patch: { otp: true, otp_hash: null, otp_exp: null }, redirect: '/verify' });
}

async function resendOtp({ session, body }) {
  const ctx = await sessionContext(session);
  if (!ctx.ok) return fail('الجلسة منتهية — ابدأ التسجيل من جديد');
  const phone = sec.normalizeDigits(body.phone || (session && session.phone));
  if (!phone || phone.length !== 11) return fail('تعذّر تحديد رقم الموبايل — ابدأ التسجيل من جديد');
  const sent = await otp.issue(phone, { purpose: 'register' });
  if (!sent.ok) return fail(sent.error);
  await db.audit({ action: 'otp_resent', actor: `voter:${ctx.voter.id}`, meta: { masked: sent.masked } });
  return ok({
    provider: sent.provider, masked: sent.masked, expires_in: sent.expiresIn, dev_code: sent.dev_code,
    session_patch: sent.hash ? { otp_hash: sent.hash, otp_exp: sent.expiresAt } : undefined,
  });
}

/* ------------------------------------------------------------------ التحقق */

async function verifyStart({ session }) {
  const ctx = await sessionContext(session);
  if (!ctx.ok) return fail('الجلسة منتهية — ابدأ التسجيل من جديد');
  const challenge = ver.newLivenessChallenge();
  const ps = providers.status();
  const ocr = require('./providers/ocr');
  return ok({
    challenge,
    provider: { active: ps.active, label: ps.label || 'محرك تجريبي', ok: ps.ok, requested: ps.requested },
    ocr_provider: ocr.providerId(),
    otp_required: otp.mode() !== 'off' && !(session && session.otp),
    voter: { name: ctx.voter.full_name, national_id_masked: ctx.voter.national_id_masked },
    thresholds: config.thresholds,
  });
}

async function verifyComplete({ session, body }) {
  const ctx = await sessionContext(session);
  if (!ctx.ok) return fail('الجلسة منتهية — ابدأ التسجيل من جديد');
  const voter = ctx.voter;
  const electionId = (session.eid || body.election_id || '').toString() || null;

  if (voter.verified && session.token) {
    return ok({ status: 'approved', repeat: true });
  }

  if (otp.mode() !== 'off' && !(session && session.otp)) {
    return fail('لازم تأكيد رقم الموبايل بكود التحقق الأول', { code: 'otp_required' });
  }

  const cardBase64 = stripDataUrl(body.images && body.images.card);
  const selfieBase64 = stripDataUrl(body.images && body.images.selfie);

  // ① قراءة البطاقة آليًا (إن كان مزوّد OCR مفعّل) — قبل المطابقة
  const cardOcr = await ver.readCardFields({ voter, cardBase64 });

  // ③ مطابقة الوجه عبر المزوّد النشط
  const faceResult = await ver.matchFacesLayer({
    cardBase64, selfieBase64,
    cardMeta: body.card_meta, selfieMeta: body.selfie_meta,
  });

  const decision = await ver.decide({
    voter,
    cardMeta: body.card_meta,
    selfieMeta: body.selfie_meta,
    challenge: body.challenge || [],
    livenessEvents: body.liveness_events || [],
    frames: body.frames,
    cardBase64, selfieBase64, cardOcr, faceResult,
    otpVerified: otp.mode() === 'off' ? undefined : true,
  });

  await db.audit({
    action: `verification_${decision.status}`,
    actor: `voter:${voter.id}`,
    meta: { score: decision.score, checks: decision.checks, provider: ver.VERIFY_PROVIDER },
  });

  if (decision.status === 'rejected') {
    return ok({ status: 'rejected', score: decision.score, reasons: decision.reasons, checks: decision.checks });
  }

  if (decision.status === 'review') {
    // الحالات المشكوك فيها ⇒ لجنة بشرية (تُحفظ الصور مؤقتًا للمراجعة فقط)
    const review = await db.createReview({
      voter_id: voter.id,
      election_id: electionId,
      status: 'pending',
      score: decision.score,
      checks: decision.checks,
      reasons: decision.reasons,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + config.reviewRetentionHours * 3600_000).toISOString(),
    });
    const cardFile = saveReviewImage(review.id, 'card', body.images && body.images.card);
    const selfieFile = saveReviewImage(review.id, 'selfie', body.images && body.images.selfie);
    await db.updateReview(review.id, { card_image: cardFile, selfie_image: selfieFile });
    return ok({ status: 'review', reviewId: review.id, score: decision.score, reasons: decision.reasons, checks: decision.checks });
  }

  // مقبول ⟶ إصدار رمز اقتراع سري صالح ١٥ دقيقة (يُخزَّن مُجزَّأً، ولا يصل للمتصفح كنص)
  const token = await issueToken(voter.id, electionId);
  await db.updateVoter(voter.id, { verified: true, verified_at: new Date().toISOString(), verify_score: decision.score });
  return ok({
    status: 'approved',
    score: decision.score,
    checks: decision.checks,
    token, // داخلي: يوضع في جلسة موقّعة على الخادم ويُحجب من أي رد للمتصفح
    token_fingerprint: sec.sha256(token).slice(0, 8),
    token_expires_in: config.tokenTtlMinutes * 60,
  });
}

async function issueToken(voterId, electionId) {
  const token = sec.randomToken(18);
  await db.createToken({
    voter_id: voterId,
    election_id: electionId,
    token_hash: sec.sha256(token),
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + config.tokenTtlMinutes * 60_000).toISOString(),
    used_at: null,
  });
  return token;
}

/* ------------------------------------------------------------------ الاقتراع */

async function electionPayload(electionId) {
  const election = await db.getElection(electionId);
  if (!election) return { ok: false, error: 'الانتخابة غير موجودة' };
  const candidates = await db.listCandidates(election.id);
  return ok({ election, candidates, state: electionState(election) });
}

async function castVote({ session, body }) {
  const ctx = await sessionContext(session);
  if (!ctx.ok) return fail('الجلسة منتهية — ابدأ من جديد');

  const electionId = (body.election_id || session.eid || '').toString();
  const election = await db.getElection(electionId);
  if (!election) return fail('الانتخابة غير موجودة');
  const state = electionState(election);
  if (state !== 'open') return fail(state === 'closed' ? 'الاقتراع اتقفل' : 'الاقتراع لسه مفتحش');

  const candidateId = String(body.candidate_id || '');
  const candidates = await db.listCandidates(election.id);
  const candidate = candidates.find((c) => String(c.id) === candidateId);
  if (!candidate) return fail('المرشح غير موجود في هذه الانتخابة');

  // 1) هل الناخب عنده رمز صالح؟
  let tokenRow = null;
  if (session.token) tokenRow = await db.findTokenByHash(sec.sha256(session.token));
  if (!tokenRow) tokenRow = await db.findActiveTokenForVoter(ctx.voter.id, election.id);
  if (!tokenRow) return fail('مفيش رمز اقتراع ساري — لازم تتحقق من هويتك الأول');
  if (tokenRow.used_at) {
    await db.audit({ action: 'token_reuse_blocked', actor: `voter:${ctx.voter.id}`, meta: { electionId } });
    return fail('الرمز ده مستخدم بالفعل — صوت واحد لكل هوية', { code: 'token_used' });
  }
  if (tokenRow.expires_at && new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return fail('رمز الاقتراع انتهت صلاحيته — أعد التحقق من هويتك');
  }

  // 2) حرق الرمز (الشرط used_at=is.null يمنع التنفيذ المتزامن)
  const burned = await db.markTokenUsed(tokenRow.id);
  if (!burned) {
    await db.audit({ action: 'token_race_blocked', actor: `voter:${ctx.voter.id}`, meta: { electionId } });
    return fail('الرمز ده مستخدم بالفعل — صوت واحد لكل هوية', { code: 'token_used' });
  }

  // 3) تسجيل الصوت بدون أي رابط بالهوية
  const receipt = sec.receiptCode();
  await db.createBallot({
    election_id: election.id,
    candidate_id: candidate.id,
    receipt_code: receipt,
    cast_at: new Date().toISOString(),
  });

  await db.audit({
    action: 'ballot_cast',
    actor: `voter:${ctx.voter.id}`,
    meta: { electionId: election.id, receipt: receipt.slice(0, 3) + '***' },
  });

  const total = await db.countBallots(election.id);
  return ok({
    receipt_code: receipt,
    election_title: election.title,
    cast_at: new Date().toISOString(),
    total_ballots: total,
    kiosk: !!session.kiosk,
  });
}

/* ------------------------------------------------------------------ الإيصال والنتائج */

async function receiptStatus({ code }) {
  const clean = String(code || '').trim().toUpperCase().replace(/\s/g, '');
  if (!/^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(clean)) return fail('صيغة رقم الإيصال غير صحيحة (مثال: ABCDE-23456)');
  const ballot = await db.findBallotByReceipt(clean);
  if (!ballot) return fail('مفيش صوت مسجّل برقم الإيصال ده — راجع الأرقام');
  const election = await db.getElection(ballot.election_id);
  return ok({
    found: true,
    receipt_code: clean,
    election_title: election ? election.title : '',
    candidate_id: ballot.candidate_id,
    cast_at: ballot.cast_at,
  });
}

async function results({ electionId, session }) {
  const election = await db.getElection(electionId);
  if (!election) return fail('الانتخابة غير موجودة');
  const candidates = await db.listCandidates(election.id);
  const counts = await db.tally(election.id);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const participants = await db.countVerifiedParticipants(election.id);
  const rows = candidates.map((c) => ({
    id: c.id,
    name: c.name,
    slogan: c.slogan,
    program: c.program,
    photo_url: c.photo_url,
    votes: counts[c.id] || 0,
    percent: total ? Math.round(((counts[c.id] || 0) / total) * 1000) / 10 : 0,
  })).sort((a, b) => b.votes - a.votes);
  const state = electionState(election);
  const isVoter = !!(session && session.vid);
  // الجداول اللحظية تُعرض للجمهور بعد غلق الاقتراع — وقبل كده يشوفها المشرف والناخب المسجّل
  const showDetails = state === 'closed' || isVoter;
  return ok({
    election: { id: election.id, title: election.title, description: election.description, starts_at: election.starts_at, ends_at: election.ends_at, state },
    state,
    total_ballots: total,
    participants,
    turnout: participants ? Math.round((total / participants) * 1000) / 10 : 0,
    candidates: showDetails ? rows : rows.map((r) => ({ id: r.id, name: r.name, slogan: r.slogan })),
    hidden: !showDetails,
  });
}

/* ------------------------------------------------------------------ المراجعة البشرية */

async function pendingReviews() {
  const rows = await db.listReviews('pending');
  return ok({ reviews: rows.map((r) => ({
    id: r.id, score: r.score, reasons: r.reasons, checks: r.checks,
    created_at: r.created_at, topic: r.topic || '', has_images: !!(r.card_image && r.selfie_image),
  })) });
}

async function decideReview({ id, approve, admin }) {
  const review = await db.getReview(id);
  if (!review) return fail('طلب المراجعة غير موجود');
  if (review.status !== 'pending') return fail('الطلب ده اتحسم بالفعل');
  await db.updateReview(review.id, {
    status: approve ? 'approved' : 'rejected',
    decided_by: admin || 'admin',
  });
  await db.audit({ action: approve ? 'review_approved' : 'review_rejected', actor: admin || 'admin', meta: { reviewId: id } });

  if (approve) {
    await db.updateVoter(review.voter_id, {
      verified: true, verified_at: new Date().toISOString(),
      verify_score: review.score, verified_by: 'committee',
    });
    deleteReviewImages(review);
    return ok({ approved: true, note: 'الناخب يقدر يستلم رمز الاقتراع من صفحة حالة الطلب' });
  }
  deleteReviewImages(review);
  return ok({ approved: false });
}

async function reviewStatus({ reviewId }) {
  const review = await db.getReview(reviewId);
  if (!review) return fail('طلب المراجعة غير موجود');
  return ok({
    id: review.id, status: review.status, score: review.score, reasons: review.reasons,
    created_at: review.created_at, decided_at: review.decided_at,
    expires_at: review.expires_at,
  });
}

async function claimReviewToken({ reviewId, session }) {
  const review = await db.getReview(reviewId);
  if (!review) return fail('طلب المراجعة غير موجود');
  if (review.status !== 'approved') return fail('الطلب لسه تحت المراجعة');
  const ctx = await sessionContext(session);
  if (!ctx.ok || String(ctx.voter.id) !== String(review.voter_id)) return fail('الجلسة مش مطابقة لصاحب الطلب');
  const token = await issueToken(review.voter_id, review.election_id);
  await db.updateReview(review.id, { claimed_at: new Date().toISOString(), token_fingerprint: sec.sha256(token).slice(0, 8) });
  await db.audit({ action: 'review_token_issued', actor: `voter:${review.voter_id}`, meta: { reviewId: review.id } });
  return ok({ token_issued: true, token, election_id: review.election_id });
}

/* ------------------------------------------------------------------ لوحة الإدارة */

async function stats() {
  const [voters, elections] = await Promise.all([db.countVoters(), db.listElections()]);
  const reviews = await db.listReviews('pending');
  const perElection = [];
  for (const e of elections.slice(0, 6)) {
    perElection.push({
      id: e.id, title: e.title, state: electionState(e),
      ballots: await db.countBallots(e.id),
      participants: await db.countVerifiedParticipants(e.id),
    });
  }
  return ok({ voters, elections: elections.length, pending_reviews: reviews.length, per_election: perElection, mode: db.mode });
}

async function createElection({ body, admin }) {
  const title = String(body.title || '').trim();
  if (title.length < 5) return fail('اكتب عنوان واضح للانتخابة');
  const row = await db.createElection({
    title,
    description: String(body.description || '').trim(),
    type: body.type === 'multi' ? 'multi' : 'single',
    starts_at: body.starts_at ? new Date(body.starts_at).toISOString() : new Date().toISOString(),
    ends_at: body.ends_at ? new Date(body.ends_at).toISOString() : new Date(Date.now() + 7 * 86400_000).toISOString(),
    state: 'open',
  });
  await db.audit({ action: 'election_created', actor: admin || 'admin', meta: { id: row.id, title } });
  return ok({ election: row });
}

async function updateElectionState({ id, state, admin }) {
  if (!['draft', 'open', 'closed'].includes(state)) return fail('حالة غير معروفة');
  const row = await db.updateElection(id, { state });
  if (!row) return fail('الانتخابة غير موجودة');
  await db.audit({ action: `election_${state}`, actor: admin || 'admin', meta: { id } });
  return ok({ election: row });
}

async function addCandidate({ body, admin }) {
  const electionId = String(body.election_id || '');
  const name = String(body.name || '').trim();
  if (!name) return fail('اكتب اسم المرشح');
  const election = await db.getElection(electionId);
  if (!election) return fail('الانتخابة غير موجودة');
  const candidates = await db.listCandidates(election.id);
  const row = await db.createCandidate({
    election_id: election.id,
    name,
    slogan: String(body.slogan || '').trim(),
    program: String(body.program || '').trim(),
    photo_url: '',
    sort: candidates.length + 1,
  });
  await db.audit({ action: 'candidate_added', actor: admin || 'admin', meta: { electionId: election.id, name } });
  return ok({ candidate: row });
}

function otpStatus() { return otp.status(); }

/** يضمن وجود كود ساري للجلسة الحالية (يُستخدم عند إعادة فتح صفحة الكود) */
async function otpForSession({ session }) {
  if (otp.mode() === 'off') return null;
  const phone = sec.normalizeDigits(session && session.phone);
  if (!phone) return null;
  const sent = await otp.issue(phone, { purpose: 'register' });
  return sent.ok ? sent : { cooldown: true };
}

/* ------------------------------------------------------------------ كشوف الناخبين */

/** استيراد كشف الناخبين من نص CSV (عمودان: الرقم القومي، الاسم) */
async function importVoterRoll({ body, admin }) {
  const csv = String(body.csv || '').trim();
  if (!csv) return fail('الصق محتوى الكشف أو ارفع ملف CSV');
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows = [];
  const errors = [];
  for (const line of lines) {
    const parts = line.split(/[,\t;]/).map((p) => p.trim());
    const nidPart = parts.find((p) => sec.normalizeDigits(p).length === 14);
    if (!nidPart) { if (!/رقم|name|الاسم/i.test(line)) errors.push(line.slice(0, 40)); continue; }
    const nid = sec.normalizeDigits(nidPart);
    const name = parts.filter((p) => p !== nidPart).join(' ').trim() || '(بدون اسم)';
    const parsed = sec.parseNationalId(nid);
    rows.push({
      identity_hash: sec.identityFingerprint(nid),
      full_name: name,
      governorate: parsed.ok ? parsed.governorate : null,
      birth_date: parsed.ok ? parsed.birthDate : null,
      national_id_masked: `********${nid.slice(-4)}`,
    });
  }
  if (!rows.length) return fail('مفيش صفوف صحيحة — تأكد إن كل سطر فيه رقم قومي 14 رقم');
  const inserted = await db.importVoterRoll(rows);
  await db.audit({ action: 'voter_roll_import', actor: admin || 'committee', meta: { rows: inserted, failed: errors.length } });
  return ok({ inserted, skipped: errors.length, sample_errors: errors.slice(0, 5) });
}

async function voterRollStats() {
  return ok(await db.voterRollStats());
}

/* ------------------------------------------------------------------ حالة المزوّدين */

async function providersHealth() {
  const ps = providers.status();
  const ocr = require('./providers/ocr');
  const otpStatus = otp.status();
  const usage = await db.providerCallStats();
  return ok({
    face: ps,
    ocr: { provider: ocr.providerId(), real: ocr.providerId() !== 'demo' },
    otp: otpStatus,
    usage,
  });
}

module.exports = {
  register, confirmOtp, resendOtp, otpStatus, otpForSession, verifyStart, verifyComplete,
  importVoterRoll, voterRollStats, providersHealth,
  electionPayload, castVote, receiptStatus, results,
  pendingReviews, decideReview, reviewStatus, claimReviewToken,
  stats, createElection, updateElectionState, addCandidate,
  electionState, cleanupReviewFiles, REVIEW_DIR,
  saveReviewImage, deleteReviewImages,
};
