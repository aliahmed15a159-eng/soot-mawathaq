'use strict';
/**
 * صوت موثّق — خادم المنصة
 * Node.js قياسي بدون أي مكتبات خارجية • Supabase عبر REST • وضع تجربة محلي بدون إعداد
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const { config } = require('./lib/config');
const { db } = require('./lib/db');
const api = require('./lib/api');
const sec = require('./lib/security');
const session = require('./lib/session');
const { shell } = require('./views/layout');
const pages = require('./views/pages');
const adminViews = require('./views/admin');

const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.json': 'application/json; charset=utf-8',
  '.bin': 'application/octet-stream', '.ico': 'image/x-icon',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

const BOOT_AT = Date.now();

/* ------------------------------------------------------------------ أدوات HTTP */

function sendHtml(res, html, status = 200, extraHeaders = {}) {
  const buf = Buffer.from(html, 'utf8');
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': buf.length,
    'Cache-Control': 'no-store',
    'Permissions-Policy': 'camera=*, microphone=()',
    'Feature-Policy': 'camera *',
    ...extraHeaders,
  });
  res.end(buf);
}

function sendJson(res, obj, status = 200) {
  const buf = Buffer.from(JSON.stringify(obj), 'utf8');
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': buf.length,
    'Cache-Control': 'no-store',
  });
  res.end(buf);
}

function redirect(res, location, extra = {}) {
  res.writeHead(302, { Location: location, ...extra });
  res.end();
}

function readBody(req, limitBytes = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limitBytes) { reject(new Error('body_too_large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const raw = await readBody(req);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

async function readForm(req) {
  const raw = await readBody(req, 256 * 1024);
  const out = {};
  for (const part of raw.split('&')) {
    if (!part) continue;
    const [k, v = ''] = part.split('=');
    out[decodeURIComponent(k.replace(/\+/g, ' '))] = decodeURIComponent(v.replace(/\+/g, ' '));
  }
  return out;
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function tooMany(res, rl) {
  sendJson(res, { ok: false, error: `محاولات كثيرة — جرّب بعد ${rl.retryAfter} ثانية` }, 429);
}

function serveStatic(req, res, pathname) {
  const rel = pathname.replace(/^\/+/, '');
  const full = path.join(PUBLIC_DIR, rel);
  if (!full.startsWith(PUBLIC_DIR) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) return false;
  const ext = path.extname(full).toLowerCase();
  const buf = fs.readFileSync(full);
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': buf.length,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': (ext === '.woff2' || ext === '.svg' || ext === '.bin' || pathname.startsWith('/models/') || pathname.startsWith('/vendor/')) ? 'public, max-age=604800' : 'no-cache',
  });
  res.end(buf);
  return true;
}

/* ------------------------------------------------------------------ معالجة المسارات */

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);
  const q = url.searchParams;
  const ip = clientIp(req);
  let sess = session.readSession(req);
  const isAdmin = session.isAdmin(req);
  const demo = db.mode === 'demo';

  // إذا وصل رمز الجلسة عبر الرابط (_st) في بيئة تمنع الكوكيز، نعيد تثبيت الكوكي
  if (sess && q.get('_st')) {
    session.startSession(res, sess, req);
  }

  /* ---------- ملفات ثابتة ---------- */
  if (req.method === 'GET' && pathname === '/presentation') {
    if (serveStatic(req, res, '/presentation.html')) return;
  }
  // الاسم القديم لملف العرض (النسخة ذات الـ 12 شريحة) — نوجّه أي رابط قديم إلى النسخة الحالية
  if (req.method === 'GET' && pathname === '/soot-mawathaq-presentation.pptx') {
    return redirect(res, '/soot-mawathaq-presentation-v2.pptx');
  }
  if (req.method === 'GET' && (pathname === '/' ? false : serveStatic(req, res, pathname))) return;

  /* ---------- الصحة ---------- */
  if (pathname === '/healthz') {
    return sendJson(res, { ok: true, mode: db.mode, uptime: Math.round((Date.now() - BOOT_AT) / 1000) });
  }

  /* ---------- الرئيسية ---------- */
  if (pathname === '/' && req.method === 'GET') {
    const [rawElections, allCards] = await Promise.all([
      db.listElections(),
      db.listIdCards(),
    ]);
    const elections = rawElections.map((e) => ({ ...e, state: api.electionState(e) }));
    let candidates = 0; let ballots = 0;
    for (const e of elections) {
      const cList = await db.listCandidates(e.id);
      const counts = await db.tally(e.id);
      const totalB = Object.values(counts || {}).reduce((a, b) => a + (Number(b) || 0), 0);
      e.total_ballots = totalB;
      e.candidates = cList.map((c, idx) => {
        const v = (counts && counts[c.id]) || 0;
        const pct = totalB ? Math.round((v / totalB) * 100) : 0;
        return { ...c, number: idx + 1, votes: v, percent: pct };
      });
      candidates += cList.length;
      ballots += totalB;
    }
    return sendHtml(res, shell({
      title: 'الرئيسية',
      body: pages.landing({
        elections,
        demo,
        counts: { elections: elections.length, candidates, ballots },
        cards: (allCards || []).filter((c) => c.national_id_plain && c.card_image),
      }),
      bodyClass: 'page-landing', nav: 'home',
    }));
  }

  /* ---------- التسجيل ---------- */
  if (pathname === '/register' && req.method === 'GET') {
    const electionId = q.get('e');
    const [election, allCards] = await Promise.all([
      electionId ? db.getElection(electionId) : null,
      db.listIdCards(),
    ]);
    return sendHtml(res, shell({
      title: 'التسجيل',
      body: pages.registerPage({
        election: election ? { ...election, state: api.electionState(election) } : null,
        demo,
        cards: (allCards || []).filter((c) => c.national_id_plain && c.card_image),
      }),
      showStepper: true, active: 1, nav: 'candidates',
    }));
  }

  if (pathname === '/api/register' && req.method === 'POST') {
    const rl = sec.rateLimit(`register:${ip}`, 20, 60_000);
    if (!rl.ok) return tooMany(res, rl);
    const body = await readJson(req);
    const result = await api.register({ body, session: sess });
    if (!result.ok) return sendJson(res, result, 400);
    const { signed } = session.startSession(res, { ...result.session, kiosk: !!body.kiosk }, req);
    const needOtp = result.otp && result.otp.required;
    return sendJson(res, { ok: true, otp: result.otp || null, redirect: needOtp ? '/otp' : '/verify', _st: signed });
  }

  /* ---------- كود الموبايل (OTP) ---------- */
  if (pathname === '/otp' && req.method === 'GET') {
    if (!sess) return redirect(res, '/register');
    const voter = await db.findVoterById(sess.vid);
    const otpStatus = api.otpStatus();
    if (!otpStatus.enabled) return redirect(res, '/verify');
    const sent = await api.otpForSession({ session: sess, phoneHint: voter.phone_masked });
    if (sent && sent.hash && (!sess.otp_hash || sess.otp_hash !== sent.hash)) {
      session.startSession(res, { ...sess, otp_hash: sent.hash, otp_exp: sent.expiresAt }, req);
    }
    return sendHtml(res, shell({
      title: 'تأكيد الموبايل',
      body: pages.otpPage({
        voter,
        challenge: { masked: voter.phone_masked, dev_code: sent && sent.dev_code },
        otpStatus,
      }),
      showStepper: true, active: 1,
    }));
  }

  if (pathname === '/api/otp/verify' && req.method === 'POST') {
    const rl = sec.rateLimit(`otp:${ip}`, 20, 300_000);
    if (!rl.ok) return tooMany(res, rl);
    const body = await readJson(req);
    const result = await api.confirmOtp({ session: sess, body });
    if (!result.ok) return sendJson(res, result, 400);
    const { signed } = session.startSession(res, { ...sess, ...(result.session_patch || {}) }, req);
    return sendJson(res, { ok: true, redirect: result.redirect || '/verify', _st: signed });
  }

  if (pathname === '/api/otp/resend' && req.method === 'POST') {
    const rl = sec.rateLimit(`otpresend:${ip}`, 5, 300_000);
    if (!rl.ok) return tooMany(res, rl);
    const body = await readJson(req);
    const result = await api.resendOtp({ session: sess, body });
    let signed = null;
    if (result.ok && result.session_patch && sess) {
      signed = session.startSession(res, { ...sess, ...result.session_patch }, req).signed;
    }
    return sendJson(res, { ...result, session_patch: undefined, ...(signed ? { _st: signed } : {}) });
  }

  /* ---------- التحقق ---------- */
  if (pathname === '/verify' && req.method === 'GET') {
    if (!sess) return redirect(res, '/register');
    if (api.otpStatus().enabled && !sess.otp) return redirect(res, '/otp');
    const voter = await db.findVoterById(sess.vid);
    if (!voter) return redirect(res, '/register');
    const [election, rollCard] = await Promise.all([
      sess.eid ? db.getElection(sess.eid) : null,
      db.findInVoterRoll(voter.identity_hash),
    ]);
    return sendHtml(res, shell({
      title: 'التحقق من الهوية',
      body: pages.verifyPage({ voter, election, demo, rollCard }),
      showStepper: true, active: 2, nav: 'candidates',
    }));
  }

  if (pathname === '/api/verify/start' && req.method === 'POST') {
    const rl = sec.rateLimit(`verify:${ip}`, 30, 60_000);
    if (!rl.ok) return tooMany(res, rl);
    const out = await api.verifyStart({ session: sess });
    return sendJson(res, { ...out, ...(sess ? { _st: session.startSession(res, sess, req).signed } : {}) });
  }

  if (pathname === '/api/verify/complete' && req.method === 'POST') {
    const rl = sec.rateLimit(`verifyc:${ip}`, 12, 60_000);
    if (!rl.ok) return tooMany(res, rl);
    const body = await readJson(req);
    const result = await api.verifyComplete({ session: sess, body });
    if (!result.ok) return sendJson(res, result, 400);

    let signed = null;
    if (result.status === 'approved' && !result.repeat) {
      signed = session.startSession(res, { vid: sess.vid, eid: sess.eid, name: sess.name, kiosk: !!sess.kiosk, token: result.token }, req).signed;
    }
    const { token, ...safe } = result;
    return sendJson(res, { ...safe, ...(signed ? { _st: signed } : {}) });
  }

  if (pathname === '/api/review/status' && req.method === 'GET') {
    return sendJson(res, await api.reviewStatus({ reviewId: q.get('id') }));
  }

  if (pathname === '/api/review/claim' && req.method === 'POST') {
    const body = await readJson(req);
    const result = await api.claimReviewToken({ reviewId: body.review_id, session: sess });
    if (!result.ok) return sendJson(res, result, 400);
    const { signed } = session.startSession(res, { vid: sess.vid, eid: result.election_id, name: sess.name, token: result.token, kiosk: !!sess.kiosk }, req);
    return sendJson(res, { ok: true, redirect: '/vote', _st: signed });
  }

  if (pathname === '/review-status' && req.method === 'GET') {
    const id = q.get('id');
    const st = await api.reviewStatus({ reviewId: id });
    if (!st.ok) return sendHtml(res, shell({ title: 'حالة المراجعة', body: pages.errorPage(st.error) }), 404);
    return sendHtml(res, shell({ title: 'حالة المراجعة', body: pages.reviewStatusPage({ reviewId: id, review: st }), showStepper: true, active: 2 }));
  }

  /* ---------- الاقتراع ---------- */
  if (pathname === '/vote' && req.method === 'GET') {
    if (!sess) return redirect(res, '/register');
    const voter = await db.findVoterById(sess.vid);
    if (!voter) return redirect(res, '/register');
    const electionId = sess.eid || q.get('e');
    if (!electionId) return redirect(res, '/');
    const payload = await api.electionPayload(electionId);
    if (!payload.ok) return sendHtml(res, shell({ title: 'خطأ', body: pages.errorPage(payload.error) }), 404);
    if (payload.state !== 'open') {
      return sendHtml(res, shell({ title: 'الاقتراع مغلق', body: pages.errorPage('الاقتراع مش مفتوح حاليًا لهذه الانتخابة') }), 409);
    }
    return sendHtml(res, shell({
      title: 'الاقتراع',
      body: pages.votePage({ election: payload.election, candidates: payload.candidates, voter, kiosk: !!sess.kiosk }),
      showStepper: true, active: 3, nav: 'candidates',
    }));
  }

  if (pathname === '/api/vote' && req.method === 'POST') {
    const rl = sec.rateLimit(`vote:${ip}`, 10, 60_000);
    if (!rl.ok) return tooMany(res, rl);
    if (sess && sess.kiosk) {
      const kioskRl = sec.rateLimit(`kiosk:${ip}`, 3, 3600_000);
      if (!kioskRl.ok) return sendJson(res, { ok: false, error: 'تم بلوغ الحد الأقصى لعدد الأصوات من الجهاز ده مؤقتًا — كلّم مشرف اللجنة' }, 429);
    }
    const body = await readJson(req);
    const result = await api.castVote({ session: sess, body });
    if (!result.ok) return sendJson(res, result, 400);
    if (sess && sess.kiosk) session.endSession(res, req);
    return sendJson(res, result);
  }

  /* ---------- الإيصال ---------- */
  if (pathname === '/receipt' && req.method === 'GET') {
    const code = (q.get('code') || '').trim().toUpperCase();
    const status = await api.receiptStatus({ code });
    if (!status.ok) return sendHtml(res, shell({ title: 'الإيصال', body: pages.errorPage(status.error) }), 404);
    return sendHtml(res, shell({
      title: 'تم التصويت',
      body: pages.receiptPage({
        receipt: status.receipt_code,
        electionTitle: status.election_title,
        total: await db.countBallots((await db.findBallotByReceipt(status.receipt_code)).election_id),
        castAt: status.cast_at,
      }),
      showStepper: true, active: 4,
    }));
  }

  if (pathname === '/verify-receipt' && req.method === 'GET') {
    const code = (q.get('code') || '').trim();
    let result = null;
    if (code) {
      const r = await api.receiptStatus({ code });
      result = r.ok ? { kind: 'found', ...r } : { kind: /صيغة/.test(r.error) ? 'bad' : 'notfound' };
    }
    return sendHtml(res, shell({ title: 'التحقق من إيصال', body: pages.receiptLookupPage({ code, result }), nav: 'verify-receipt' }));
  }

  if (pathname === '/cards-demo' && req.method === 'GET') {
    return sendHtml(res, shell({ title: 'بطاقات التجربة الجاهزة', body: pages.cardsDemoPage(), nav: 'cards' }));
  }

  if (pathname === '/api/receipt/check' && req.method === 'POST') {
    const body = await readJson(req);
    const code = String(body.code || '').trim();
    const r = await api.receiptStatus({ code });
    return sendJson(res, r);
  }

  /* ---------- النتائج ---------- */
  if (pathname === '/results' && req.method === 'GET') {
    const elections = await db.listElections();
    let electionId = q.get('e') || (elections[0] && elections[0].id);
    if (!electionId) return sendHtml(res, shell({ title: 'النتائج', body: pages.resultsPage({ data: null, elections: [], electionId: null }), nav: 'results' }));
    const r = await api.results({ electionId, session: sess });
    return sendHtml(res, shell({
      title: 'النتائج',
      body: pages.resultsPage({ data: r.ok ? r : null, elections, electionId }), nav: 'results',
    }));
  }

  /* ---------- منصة الاقتراع المشتركة ---------- */
  if (pathname === '/vote-here' && req.method === 'GET') {
    const elections = (await db.listElections()).map((e) => ({ ...e, state: api.electionState(e) }));
    const done = q.get('done');
    return sendHtml(res, shell({
      title: 'منصة اقتراع',
      body: (done ? '<div class="notice notice-ok" style="margin-bottom:16px">تم تسجيل الصوت وتفريغ الجلسة — الناخب اللي بعده يبدأ من الصفر.</div>' : '') + pages.kioskPage({ elections }),
    }));
  }

  /* ---------- لوحة الإدارة ---------- */
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    const rl = sec.rateLimit(`adminlogin:${ip}`, 10, 300_000);
    if (!rl.ok) return tooMany(res, rl);
    const form = await readForm(req);
    const emailIn = String(form.email || '').trim().toLowerCase();
    const passIn = String(form.password || '').trim();
    const keyIn = String(form.key || '').trim();

    const dbAuth = (emailIn && passIn) ? await db.verifyAdmin(emailIn, passIn) : { ok: false };
    const byEmailPass = dbAuth.ok;
    const byKey = keyIn && (
      sec.safeEqual(keyIn, config.adminKey)
      || sec.safeEqual(keyIn, String(config.adminPassword || ''))
    );

    if (!byEmailPass && !byKey) {
      await db.audit({ action: 'admin_login_failed', actor: `ip:${ip}`, meta: { email: emailIn || undefined } });
      return sendHtml(res, shell({
        title: 'دخول الإدارة',
        body: adminViews.adminLogin({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة', email: form.email || '' }),
      }), 401);
    }
    session.startAdmin(res, req);
    await db.audit({ action: 'admin_login', actor: emailIn || `ip:${ip}` });
    return redirect(res, '/admin');
  }

  if (pathname === '/api/admin/logout' && req.method === 'POST') {
    session.endAdmin(res, req);
    return redirect(res, '/admin');
  }

  if (pathname === '/admin' && req.method === 'GET') {
    if (!isAdmin) return sendHtml(res, shell({ title: 'دخول الإدارة', body: adminViews.adminLogin({}) }));
    const [stats, elections, reviews, audit, providersHealth, roll, cards] = await Promise.all([
      api.stats(), db.listElections(), db.listReviews('pending'), db.listAudit(60),
      api.providersHealth(), api.voterRollStats(), db.listIdCards(),
    ]);
    const enrichedElections = [];
    for (const e of elections) {
      const cList = await db.listCandidates(e.id);
      const counts = await db.tally(e.id);
      const totalB = Object.values(counts || {}).reduce((a, b) => a + (Number(b) || 0), 0);
      enrichedElections.push({
        ...e,
        state: api.electionState(e),
        total_ballots: totalB,
        candidates: cList.map((c, idx) => {
          const v = (counts && counts[c.id]) || 0;
          const pct = totalB ? Math.round((v / totalB) * 100) : 0;
          return { ...c, number: idx + 1, votes: v, percent: pct };
        }),
      });
    }
    return sendHtml(res, shell({
      title: 'مركز القيادة والإشراف', wide: true,
      body: adminViews.adminDashboard({
        stats,
        elections: enrichedElections,
        reviews, audit, adminName: 'علي أحمد (المشرف العام)',
        providers: providersHealth, roll, cards,
      }),
    }));
  }

  if (pathname === '/api/admin/providers' && req.method === 'GET') {
    if (!isAdmin) return sendJson(res, { ok: false, error: 'غير مصرح' }, 403);
    return sendJson(res, await api.providersHealth());
  }

  if (pathname.startsWith('/admin/review/') && req.method === 'GET') {
    if (!isAdmin) return redirect(res, '/admin');
    const id = pathname.split('/').pop();
    const review = await db.getReview(id);
    if (!review) return sendHtml(res, shell({ title: 'مراجعة', body: pages.errorPage('طلب المراجعة غير موجود') }), 404);
    const election = review.election_id ? await db.getElection(review.election_id) : null;
    return sendHtml(res, shell({
      title: 'مراجعة طلب', wide: true,
      body: adminViews.adminReview({ review, electionTitle: election ? election.title : '' }),
    }));
  }

  if (pathname.startsWith('/admin/review-image/') && req.method === 'GET') {
    if (!isAdmin) return sendJson(res, { ok: false, error: 'غير مصرح' }, 403);
    const file = path.basename(pathname.split('/').pop());
    const full = path.join(api.REVIEW_DIR, file);
    if (!full.startsWith(api.REVIEW_DIR) || !fs.existsSync(full)) return sendJson(res, { ok: false }, 404);
    const buf = fs.readFileSync(full);
    res.writeHead(200, { 'Content-Type': /\.png$/.test(file) ? 'image/png' : 'image/jpeg', 'Content-Length': buf.length, 'Cache-Control': 'no-store' });
    return res.end(buf);
  }

  /* ---------- واجهات الإدارة (JSON) ---------- */
  if (pathname.startsWith('/api/admin/') && req.method === 'POST') {
    if (!isAdmin) return sendJson(res, { ok: false, error: 'غير مصرح' }, 403);
    const body = await readJson(req);
    if (pathname === '/api/admin/elections') return sendJson(res, await api.createElection({ body, admin: 'committee' }));
    if (pathname === '/api/admin/candidates') return sendJson(res, await api.addCandidate({ body, admin: 'committee' }));
    if (/^\/api\/admin\/elections\/\d+\/state$/.test(pathname)) {
      const id = pathname.split('/')[4];
      return sendJson(res, await api.updateElectionState({ id, state: body.state, admin: 'committee' }));
    }
    if (/^\/api\/admin\/elections\/\d+\/delete$/.test(pathname)) {
      const id = pathname.split('/')[4];
      await db.deleteElection(id);
      await db.audit({ action: 'election_deleted', actor: 'committee', meta: { id } });
      return sendJson(res, { ok: true });
    }
    if (pathname === '/api/admin/roll') {
      try {
        return sendJson(res, await api.importVoterRoll({ body, admin: 'committee' }));
      } catch (err) {
        return sendJson(res, { ok: false, error: `تعذّر استيراد الكشف: ${err.message}` }, 500);
      }
    }
    if (pathname === '/api/admin/cards') {
      try {
        return sendJson(res, await api.createIdCard({ body, admin: 'committee' }));
      } catch (err) {
        return sendJson(res, { ok: false, error: `تعذّر إنشاء البطاقة: ${err.message}` }, 500);
      }
    }
    if (/^\/api\/admin\/cards\/\d+\/delete$/.test(pathname)) {
      const id = pathname.split('/')[4];
      await db.deleteIdCard(id);
      return sendJson(res, { ok: true });
    }
    if (/^\/api\/admin\/reviews\/\d+\/decide$/.test(pathname)) {
      const id = pathname.split('/')[4];
      return sendJson(res, await api.decideReview({ id, approve: !!body.approve, admin: 'committee' }));
    }
    return sendJson(res, { ok: false, error: 'مسار غير معروف' }, 404);
  }

  /* ---------- 404 ---------- */
  return sendHtml(res, shell({ title: 'غير موجود', body: pages.errorPage('الصفحة المطلوبة غير موجودة') }), 404);
}

/* ------------------------------------------------------------------ التشغيل */

let initPromise = null;
function ensureInit() {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const info = await db.init();
        console.log(`[db] ${info.note}`);
      } catch (err) {
        console.error('[db] فشل الاتصال بـ Supabase — هنشتغل في وضع التجربة المحلي:', err.message);
        db.mode = 'demo';
        db.seedIfEmpty();
      }
      api.cleanupReviewFiles();
    })();
  }
  return initPromise;
}

async function handler(req, res) {
  await ensureInit();
  try {
    await handle(req, res);
  } catch (err) {
    console.error('[server]', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'خطأ داخلي في الخادم' }));
    }
  }
}

const server = http.createServer(handler);

if (require.main === module && !process.env.VERCEL) {
  ensureInit().then(() => {
    setInterval(api.cleanupReviewFiles, 3600_000).unref?.();
    server.listen(config.port, config.host, () => {
      console.log('');
      console.log('  صوت — من هويتك .. إلى صوتك | منصة تصويت إلكتروني');
      console.log(`  ▸ الخادم شغّال على المنفذ ${config.port} (وضع قاعدة البيانات: ${db.mode})`);
      console.log(`  ▸ الصفحة الرئيسية: http://localhost:${config.port}/`);
      console.log(`  ▸ لوحة الإدارة:    http://localhost:${config.port}/admin  (المفتاح: ${config.adminKey === 'per-aa-admin' ? 'per-aa-admin — غيّره من ADMIN_KEY' : 'مضبوط من البيئة'})`);
      console.log(`  ▸ منصة الاقتراع:   http://localhost:${config.port}/vote-here`);
      console.log('');
    });
  });
}

module.exports = { server, handler };
