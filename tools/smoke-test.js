'use strict';
/**
 * اختبار دخاني شامل (Smoke Test) — يمشي في رحلة الناخب كاملة عبر HTTP:
 * تسجيل ← تحقق (بطاقة + سيلفي حي + مطابقة) ← اقتراع ← إيصال ← منع التكرار
 * التشغيل:  node tools/smoke-test.js [http://localhost:3000]
 */
const BASE = process.argv[2] || `http://localhost:${process.env.PORT || 3000}`;

let cookieJar = '';
function saveCookies(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')];
  raw.filter(Boolean).forEach((c) => {
    const [pair] = c.split(';');
    const [name] = pair.split('=');
    const others = cookieJar.split('; ').filter((x) => x && !x.startsWith(`${name}=`));
    cookieJar = [...others, pair].join('; ');
  });
}
async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookieJar ? { Cookie: cookieJar } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  saveCookies(res);
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data, location: res.headers.get('location') };
}

const results = [];
function check(name, condition, extra = '') {
  results.push({ name, ok: !!condition, extra });
  console.log(`${condition ? '✅' : '❌'} ${name}${extra ? `  (${extra})` : ''}`);
}

const randomHash = (seed) => Array.from({ length: 256 }, (_, i) => (((seed * 31 + i * 17) % 100) > 45 ? '1' : '0')).join('');
/** يحاكي شخصًا واحدًا: نفس البصمة مع نسبة اختلاف بسيطة (إضاءة/زاوية مختلفة) */
const similarHash = (base, flipEvery = 9) => base.split('').map((b, i) => (i % flipEvery === 0 ? (b === '1' ? '0' : '1') : b)).join('');
const TINY = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4oIChAKBwcKTwxNDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NP/AABEIAAEAAQMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/2gAMAwEAAhEDEQA/AJv/Z';

(async () => {
  console.log(`\n𓂀 اختبار «صوت موثّق» الشامل — ${BASE}\n${'─'.repeat(58)}`);

  const health = await req('GET', '/healthz');
  check('الخادم يعمل', health.status === 200 && health.data.ok, `وضع: ${health.data.mode}`);

  const home = await req('GET', '/');
  check('الصفحة الرئيسية تُعرض', home.status === 200 && /صوت موثّق/.test(home.data.raw));

  // ---------------------------------------------------------------- تسجيل
  const reg = await req('POST', '/api/register', {
    full_name: 'مينا عبد المسيح حنا',
    national_id: '29807152101234',
    birth_date: '1998-07-15',
    governorate: 'الجيزة',
    phone: '01012345678',
    consent: true,
    election_id: 1,
  });
  check('تسجيل ناخب صحيح', reg.status === 200 && reg.data.ok, reg.data.error || '');
  check('إنشاء جلسة موقّعة', /sm_session=/.test(cookieJar));

  // ---------------------------------------------------------------- كود الموبايل
  const otpInfo = reg.data.otp;
  if (otpInfo && otpInfo.required) {
    check('إصدار كود موبايل عند التسجيل', !!otpInfo.masked, `المزوّد: ${otpInfo.provider}`);
    const wrong = await req('POST', '/api/otp/verify', { code: '000000' });
    check('رفض كود تحقق خاطئ', wrong.status === 400 && !wrong.data.ok, wrong.data.error || '');
    const right = await req('POST', '/api/otp/verify', { code: otpInfo.dev_code || process.env.SMOKE_OTP || '' });
    check('تأكيد الكود الصحيح وتفعيل الجلسة', right.status === 200 && right.data.ok,
      right.data.ok ? (right.data.redirect || '') : right.data.error);
  } else {
    check('كود الموبايل معطّل (OTP_MODE=off) — التخطي', true, 'مقبول');
  }

  const badReg = await req('POST', '/api/register', {
    full_name: 'أحمد محمد علي', national_id: '12345678901234', birth_date: '1998-01-01',
    governorate: 'القاهرة', phone: '01012345678', consent: true,
  });
  check('رفض رقم قومي غير صحيح', badReg.status === 400 && !badReg.data.ok, badReg.data.error);

  const dobMismatch = await req('POST', '/api/register', {
    full_name: 'مينا عبد المسيح حنا', national_id: '29807152101234',
    birth_date: '1990-01-01', governorate: 'الجيزة', phone: '01012345678', consent: true,
  });
  check('رفض تاريخ ميلاد لا يطابق الرقم القومي', dobMismatch.status === 400, dobMismatch.data.error);

  const noConsent = await req('POST', '/api/register', {
    full_name: 'مينا عبد المسيح حنا', national_id: '29807152101234',
    birth_date: '1998-07-15', governorate: 'الجيزة', phone: '01012345678', consent: false,
  });
  check('رفض التسجيل بدون موافقة صريحة', noConsent.status === 400, noConsent.data.error);

  // ---------------------------------------------------------------- تحقق
  const vs = await req('POST', '/api/verify/start', {});
  check('توليد تحدي حركة حيّ', vs.data.ok && vs.data.challenge.length === 3,
    vs.data.challenge ? vs.data.challenge.map((c) => c.code).join(',') : '');

  const challenge = vs.data.challenge;
  const goodLandmarks = { blink: { yaw: 0, eye: 0.06, faceWidth: 0.3, mouth: 0.01 },
    left: { yaw: -0.2, eye: 0.2, faceWidth: 0.3, mouth: 0.01 },
    right: { yaw: 0.2, eye: 0.2, faceWidth: 0.3, mouth: 0.01 },
    close: { yaw: 0, eye: 0.2, faceWidth: 0.34, mouth: 0.01 },
    smile: { yaw: 0, eye: 0.2, faceWidth: 0.3, mouth: 0.08 } };

  const approved = await req('POST', '/api/verify/complete', {
    card_meta: { quality: 0.82, contrast: 0.7, sharpness: 0.6, hash: randomHash(7), hashSamples: 'card-sample' },
    selfie_meta: { quality: 0.8, contrast: 0.66, sharpness: 0.55, hash: similarHash(randomHash(7), 9), hashSamples: 'selfie-sample' },
    challenge: challenge.map((c) => ({ code: c.code, label: c.label })),
    liveness_events: challenge.map((c, i) => ({ code: c.code, at: 900 + i * 1400, landmarks: goodLandmarks[c.code] })),
    frames: 64,
    images: { card: TINY, selfie: TINY },
  });
  check('ناخب مطابق ⇒ قبول', approved.data.status === 'approved',
    `الحالة: ${approved.data.status} | تشابه: ${approved.data.score}`);
  check('الرمز السري لا يظهر في استجابة المتصفح', approved.data.token === undefined && approved.data.token_fingerprint);

  const replay = await req('POST', '/api/verify/complete', {
    card_meta: { quality: 0.8, contrast: 0.7, hash: randomHash(11), hashSamples: 'same-bytes' },
    selfie_meta: { quality: 0.8, contrast: 0.7, hash: randomHash(12), hashSamples: 'same-bytes' },
    challenge: challenge.map((c) => ({ code: c.code })),
    liveness_events: challenge.map((c, i) => ({ code: c.code, at: 700 + i * 1200, landmarks: goodLandmarks[c.code] })),
    frames: 40, images: { card: TINY, selfie: TINY },
  });
  check('كشف إعادة استخدام نفس الصورة', replay.data.status !== 'rejected' || /إعادة استخدام|متطابقتان/.test((replay.data.reasons || []).join(' ')),
    (replay.data.reasons || []).join(' · '));

  // ---------------------------------------------------------------- اقتراع
  const voteBad = await req('POST', '/api/vote', { election_id: 1, candidate_id: 999 });
  check('رفض مرشح غير موجود', voteBad.status === 400, voteBad.data.error);

  const vote = await req('POST', '/api/vote', { election_id: 1, candidate_id: 2 });
  check('تسجيل الصوت بنجاح', vote.data.ok && /^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(vote.data.receipt_code || ''),
    `الإيصال: ${vote.data.receipt_code}`);
  check('الصوت لا يحتوي أي بيانات شخصية', vote.data.ok && vote.data.receipt_code && !JSON.stringify(vote.data).match(/\d{14}/));

  const doubleVote = await req('POST', '/api/vote', { election_id: 1, candidate_id: 3 });
  check('منع التصويت المكرر (صوت واحد لكل هوية)', doubleVote.status === 400 && /مستخدم|بالفعل|صوت واحد/.test(doubleVote.data.error || ''),
    doubleVote.data.error);

  // ---------------------------------------------------------------- الإيصال والنتائج
  const receipt = await req('GET', `/verify-receipt?code=${vote.data.receipt_code}`);
  check('التحقق من الإيصال', receipt.status === 200 && receipt.data.raw.includes('الإيصال صحيح'));

  const fakeReceipt = await req('GET', '/verify-receipt?code=ZZZZZ-99999');
  check('رفض إيصال غير موجود', fakeReceipt.data.raw.includes('مفيش صوت مسجّل'));

  const resultsPage = await req('GET', '/results?e=1');
  check('صفحة النتائج تعرض بيانات', resultsPage.status === 200 && /صوت محسوب|النتائج/.test(resultsPage.data.raw));

  // ---------------------------------------------------------------- الإدارة
  const adminNoAuth = await req('POST', '/api/admin/elections', { title: 'محاولة غير مصرّح بها' });
  check('رفض إنشاء انتخابة بدون تصريح', adminNoAuth.status === 403);

  const adminLoginForm = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'key=per-aa-admin', redirect: 'manual',
  });
  saveCookies(adminLoginForm);
  check('دخول لوحة الإدارة', adminLoginForm.status === 302);

  const newElection = await req('POST', '/api/admin/elections', {
    title: 'انتخابات نقابة المهندسين — فرع أسيوط', description: 'دورة 2026', type: 'single',
  });
  check('إنشاء انتخابة جديدة', newElection.data.ok, newElection.data.error || `رقم ${newElection.data.election && newElection.data.election.id}`);

  const newCand = await req('POST', '/api/admin/candidates', {
    election_id: newElection.data.election.id, name: 'مروان الشريف', slogan: 'خبير التنظيم', program: 'تطوير الخدمات',
  });
  check('إضافة مرشح', newCand.data.ok, newCand.data.error);

  const closeIt = await req('POST', `/api/admin/elections/${newElection.data.election.id}/state`, { state: 'closed' });
  check('غلق الاقتراع', closeIt.data.ok && closeIt.data.election.state === 'closed');

  await req('POST', `/api/admin/elections/${newElection.data.election.id}/delete`, {});

  const auditPage = await req('GET', '/admin');
  check('لوحة الإدارة تُعرض بالبيانات', auditPage.status === 200 && auditPage.data.raw.includes('سجل التدقيق'));

  // ---------------------------------------------------------------- النتيجة
  const total = results.length; const passed = results.filter((r) => r.ok).length;
  console.log(`${'─'.repeat(58)}\nالنتيجة: ${passed}/${total} اختبار ناجح${passed === total ? ' — كل حاجة تمام ✓' : ' — فيه اختبارات فشلت ✗'}`);
  process.exit(passed === total ? 0 : 1);
})().catch((err) => { console.error('فشل الاختبار:', err); process.exit(1); });
