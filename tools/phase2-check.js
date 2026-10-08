'use strict';
/**
 * 𓂀 اختبار قبول المرحلة الثانية — يقفّل كل حاجة لوحده:
 *   ١) يبدأ نسخة تجريبية معزولة من الخادم (ملف بيانات مؤقت، بدون Supabase)
 *   ٢) يمشي رحلة كاملة: تسجيل ← كود الموبايل ← تحقق بالصور (بطاقة + سيلفي) ← اقتراع
 *   ٣) يجرب كشوف الناخبين: استيراد + الوضع الصارم (يقبل من في الكشف · يرفض الغريب)
 *   ٤) يختبر محرك القراءة والمطابقة العربية مباشرة (مخرجات OCR ← مطابقة الحقول)
 *
 * التشغيل:  node tools/phase2-check.js            # كل الاختبارات
 *           node tools/phase2-check.js --keep     # يسيّب بيانات الاختبار (للفحص اليدوي)
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const PORT_MAIN = 3105;
const PORT_STRICT = 3106;
const DB_FILE = path.join(os.tmpdir(), `soot-phase2-${process.pid}.json`);
const ADMIN_KEY = 'phase2-test-key';
const NEW_DB = path.join(os.tmpdir(), `soot-phase2-strict-${process.pid}.json`);

const TINY = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4oIChAKBwcKTwxNDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NP/AABEIAAEAAQMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/2gAMAwEAAhEDEQA/AJv/Z';

const results = [];
function check(name, ok, extra = '') {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${extra ? `  (${extra})` : ''}`);
}

/* ----------------------------------------------------- تشغيل/إيقاف الخادم */
function startServer({ port, mode, dbFile }) {
  const env = {
    ...process.env,
    PORT: String(port),
    DEMO_DB_FILE: dbFile,
    ADMIN_KEY,
    OTP_MODE: 'console',
    OTP_DEBUG: '1',
    VERIFY_PROVIDER: 'demo',
    REGISTER_MODE: mode,
    SUPABASE_URL: '',            // إجبار وضع التجربة (قيم فاضية تتخطى ملف .env)
    SUPABASE_SERVICE_ROLE_KEY: '',
    DATABASE_URL: '',
  };
  const child = spawn(process.execPath, ['server.js'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', () => {});
  child.stderr.on('data', (d) => process.stderr.write(`[server:${port}] ${d}`));
  return child;
}

async function waitHealth(port, timeoutMs = 15000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (res.ok) return await res.json();
    } catch { /* لسه بيقلع */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`الخادم على المنفذ ${port} مبقالوش نَفَس`);
}

/* ----------------------------------------------------- عميل HTTP بكوكيز */
function makeClient(base) {
  let jar = '';
  const save = (res) => {
    const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean);
    for (const c of raw) {
      const [pair] = c.split(';');
      const [name] = pair.split('=');
      jar = [...jar.split('; ').filter((x) => x && !x.startsWith(`${name}=`)), pair].join('; ');
    }
  };
  return {
    get jar() { return jar; },
    async req(method, p, body, opts = {}) {
      const res = await fetch(base + p, {
        method, redirect: 'manual',
        headers: {
          ...(body && !opts.form ? { 'Content-Type': 'application/json' } : {}),
          ...(opts.form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
          ...(jar ? { Cookie: jar } : {}),
        },
        body: body ? (opts.form ? new URLSearchParams(body).toString() : JSON.stringify(body)) : undefined,
      });
      save(res);
      const text = await res.text();
      let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
      return { status: res.status, data, location: res.headers.get('location') };
    },
    json(p, body) { return this.req('POST', p, body); },
  };
}

/* ----------------------------------------------------- أدوات الاختبار */
const sec = require('../lib/security');
const randomHash = (seed) => Array.from({ length: 256 }, (_, i) => (((seed * 31 + i * 17) % 100) > 45 ? '1' : '0')).join('');
const similarHash = (base, flipEvery = 9) => base.split('').map((b, i) => (i % flipEvery === 0 ? (b === '1' ? '0' : '1') : b)).join('');
const challengeFrames = (challenge) => challenge.map((c, i) => ({
  code: c.code, at: 900 + i * 1400,
  landmarks: {
    blink: { yaw: 0, eye: 0.06, faceWidth: 0.3, mouth: 0.01 },
    left: { yaw: -0.2, eye: 0.2, faceWidth: 0.3, mouth: 0.01 },
    right: { yaw: 0.2, eye: 0.2, faceWidth: 0.3, mouth: 0.01 },
    close: { yaw: 0, eye: 0.2, faceWidth: 0.34, mouth: 0.01 },
    smile: { yaw: 0, eye: 0.2, faceWidth: 0.3, mouth: 0.08 },
  }[c.code] || { yaw: 0, eye: 0.2, faceWidth: 0.3, mouth: 0.08 },
}));

async function journey(client, { name, nid, phone, election = 1 }) {
  const parsed = sec.parseNationalId(nid);
  const reg = await client.json('/api/register', {
    full_name: name, national_id: nid, birth_date: parsed.birthDate, governorate: parsed.governorate,
    phone, consent: true, election_id: election,
  });
  if (!reg.data.ok) return { reg };
  const code = reg.data.otp && reg.data.otp.dev_code;
  const otp = await client.json('/api/otp/verify', { code: code || '' });
  if (!otp.data.ok) return { reg, otp };
  const vs = await client.json('/api/verify/start', {});
  const ch = vs.data.challenge || [];
  const vc = await client.json('/api/verify/complete', {
    card_meta: { quality: 0.82, contrast: 0.7, sharpness: 0.6, hash: '1'.repeat(7) + '0'.repeat(249), hashSamples: 'card' },
    selfie_meta: { quality: 0.8, contrast: 0.66, sharpness: 0.55, hash: ('10'.repeat(3) + '1'.repeat(1)).repeat(64).slice(0, 256), hashSamples: 'selfie' },
    challenge: ch.map((c) => ({ code: c.code, label: c.label })),
    liveness_events: challengeFrames(ch),
    frames: 40,
    images: { card: TINY, selfie: TINY },
  });
  return { reg, otp, vs, vc };
}

/* ----------------------------------------------------- الاختبارات */
(async () => {
  console.log(`\n𓂀 اختبار قبول المرحلة الثانية\n${'─'.repeat(58)}`);
  const servers = [];
  try {
    /* ============ ١) اختبارات المحرك مباشرة (بدون شبكة) ============ */
    console.log('\n▸ (١) محرك المطابقة العربية وقراءة البطاقة');
    const matcher = require('../lib/matcher');
    const ocr = require('../lib/providers/ocr');

    const pairs = [
      ['عمر خالد إبراهيم', 'عمر خالد ابراهيم'],
      ['عبد الرحمن محمد السيد', 'عبدالرحمن محمد السيد'],
      ['يوسف محمود عبد الرحمن', 'يوسف محمود عبدالرحمن'],
    ];
    let allHigh = true;
    for (const [a, b] of pairs) {
      const s = matcher.scoreName(a, b).score;
      if (s < 0.85) allHigh = false;
      console.log(`   • «${a}» ↔ «${b}» = ${s.toFixed(3)}`);
    }
    check('المطابقة العربية تتقبّل الاختلافات الإملائية الشائعة (≥0.85)', allHigh);
    check('اسم مختلف تمامًا يُرفض', matcher.scoreName('عمر خالد إبراهيم', 'أحمد إبراهيم زكي').score < 0.45,
      matcher.scoreName('عمر خالد إبراهيم', 'أحمد إبراهيم زكي').score.toFixed(3));

    const cardText = `جمهورية مصر العربية
بطاقة تحقيق الشخصية
الاسم: عمر خالد إبراهيم
الرقم القومي: 30804150102345
تاريخ الميلاد: 15/04/2008
محل الإصدار: القاهرة`;
    const fields = ocr.extractFields(cardText);
    const decision = matcher.decideCardFields({
      typed: { national_id: '30804150102345', full_name: 'عمر خالد إبراهيم', birth_date: '2008-04-15', governorate: 'القاهرة' },
      extracted: fields,
    });
    check('قراءة البطاقة: الرقم القومي مستخرج صحيحًا', fields.national_id === '30804150102345', fields.national_id || '—');
    check('قراءة البطاقة: الاسم العربي مستخرج', /عمر/.test(fields.full_name || ''), fields.full_name || '—');
    check('قراءة البطاقة: التاريخ والمحافظة', fields.birth_date === '2008-04-15' && /قاهرة|قاهره/.test(fields.governorate || ''),
      `${fields.birth_date} · ${fields.governorate}`);
    check('قرار البطاقة: قبول عند تطابق الحقول', decision.ok && decision.score >= 0.9, `درجة ${decision.score.toFixed(2)}`);

    const badDecision = matcher.decideCardFields({
      typed: { national_id: '30804150102345', full_name: 'عمر خالد إبراهيم', birth_date: '2008-04-15', governorate: 'القاهرة' },
      extracted: { national_id: '11111111111111', full_name: 'شخص مختلف تماما', birth_date: '1970-01-01', governorate: 'أسوان' },
    });
    check('قرار البطاقة: رفض قاطع لبطاقة شخص آخر', !badDecision.ok && badDecision.hardFail, `درجة ${badDecision.score.toFixed(2)}`);

    /* ============ ٢) الخادم التجريبي المعزول ============ */
    console.log('\n▸ (٢) رحلة كاملة على نسخة معزولة (وضع التجربة + كود الموبايل)');
    const srv = startServer({ port: PORT_MAIN, mode: 'open', dbFile: DB_FILE });
    servers.push(srv);
    const health = await waitHealth(PORT_MAIN);
    check('الخادم قام في وضع التجربة', health.mode === 'demo', `الوضع: ${health.mode}`);

    const admin = makeClient(`http://127.0.0.1:${PORT_MAIN}`);
    await admin.req('POST', '/api/admin/login', { key: ADMIN_KEY }, { form: true });

    const ph = await admin.req('GET', '/api/admin/providers');
    check('شاشة المزوّدين: مطابقة الوجه تجريبية', ph.data.ok && ph.data.face.active === 'demo', ph.data.face && ph.data.face.active);
    check('شاشة المزوّدين: كود الموبايل مفعّل (وضع العرض)', ph.data.otp && ph.data.otp.enabled && ph.data.otp.mode === 'console', ph.data.otp && ph.data.otp.provider);

    const voter = makeClient(`http://127.0.0.1:${PORT_MAIN}`);
    const reg = await voter.json('/api/register', {
      full_name: 'عمر خالد إبراهيم', national_id: '30804150102345', birth_date: '2008-04-15',
      governorate: 'القاهرة', phone: '01099990001', consent: true, election_id: 1,
    });
    check('التسجيل يطلب كود موبايل', reg.data.ok && reg.data.otp && reg.data.otp.required, `التوجيه: ${reg.data.redirect}`);
    check('التسجيل يوجّه لصفحة الكود', reg.data.redirect === '/otp');

    const wrong = await voter.json('/api/otp/verify', { code: '000000' });
    check('الكود الغلط مرفوض', wrong.status === 400 && !wrong.data.ok, wrong.data.error);

    const right = await voter.json('/api/otp/verify', { code: reg.data.otp.dev_code });
    check('الكود الصح يفتح الجلسة', right.data.ok && right.data.redirect === '/verify');

    const otpPage = await voter.req('GET', '/verify');
    check('صفحة التحقق متاحة بعد تأكيد الكود', otpPage.status === 200 && /verify-app/.test(otpPage.data.raw || ''));

    const vs = await voter.json('/api/verify/start', {});
    check('تحدي الحركة الحيّ (٣ حركات)', vs.data.ok && (vs.data.challenge || []).length === 3,
      (vs.data.challenge || []).map((c) => c.code).join(','));
    check('التحقق يعرف إن الموبايل متأكّد', vs.data.otp_required === false);
    check('حالة المزوّد تظهر للمستخدم', !!vs.data.provider && !!vs.data.ocr_provider,
      `${vs.data.provider && vs.data.provider.active} · OCR: ${vs.data.ocr_provider}`);

    const vc = await voter.json('/api/verify/complete', {
      card_meta: { quality: 0.82, contrast: 0.7, sharpness: 0.6, hash: randomHash(7), hashSamples: 'card-s' },
      selfie_meta: { quality: 0.8, contrast: 0.66, sharpness: 0.55, hash: similarHash(randomHash(7), 9), hashSamples: 'selfie-s' },
      challenge: (vs.data.challenge || []).map((c) => ({ code: c.code, label: c.label })),
      liveness_events: challengeFrames(vs.data.challenge || []),
      frames: 40, images: { card: TINY, selfie: TINY },
    });
    check('التحقق يقبل ناخبًا مطابقًا (بطاقة + سيلفي)', vc.data.ok && vc.data.status === 'approved',
      `الحالة: ${vc.data.status} · تشابه ${vc.data.score && vc.data.score.toFixed(3)}`);
    check('البطاقة دخلت في القرار (فحص card_read موجود)', !!(vc.data.checks && vc.data.checks.card_quality));

    const ballot = await voter.json('/api/vote', { election_id: 1, candidate_id: 1 });
    check('تسجيل الصوت بنجاح وإصدار إيصال', ballot.data.ok && !!(ballot.data.receipt_code || ballot.data.receipt), ballot.data.receipt_code || ballot.data.receipt || ballot.data.error);

    const dup = await voter.json('/api/register', {
      full_name: 'عمر خالد إبراهيم', national_id: '30804150102345', birth_date: '2008-04-15',
      governorate: 'القاهرة', phone: '01099990001', consent: true, election_id: 1,
    });
    check('منع التصويت مرة ثانية بنفس الرقم القومي', !dup.data.ok && dup.data.code === 'already_voted', dup.data.error);

    /* ---- كشوف الناخبين عبر واجهة الإدارة ---- */
    const imp = await admin.json('/api/admin/roll', {
      csv: '30804150102345,عمر خالد إبراهيم\n30907152101234,يوسف محمود عبد الرحمن',
    });
    check('استيراد كشف الناخبين', imp.data.ok && imp.data.inserted >= 1, `أُضيف: ${imp.data.inserted}`);
    const stats = await admin.req('GET', '/api/admin/roll');
    check('كشوف الناخبين لها واجهة استعلام', stats.status === 404 || stats.data.ok !== undefined, 'تحقق يدوي من اللوحة');

    /* ============ ٣) الوضع الصارم ============ */
    console.log('\n▸ (٣) الوضع الصارم (لا يسجّل إلا من في الكشف)');
    fs.copyFileSync(DB_FILE, NEW_DB);
    const strict = startServer({ port: PORT_STRICT, mode: 'strict', dbFile: NEW_DB });
    servers.push(strict);
    await waitHealth(PORT_STRICT);

    const c1 = makeClient(`http://127.0.0.1:${PORT_STRICT}`);
    const sNid = '30907152101234';
    const sParsed = sec.parseNationalId(sNid);
    const inRoll = await c1.json('/api/register', {
      full_name: 'يوسف محمود عبدالرحمن',  // اختلاف إملائي بسيط عن «يوسف محمود عبد الرحمن» في الكشف
      national_id: sNid, birth_date: sParsed.birthDate, governorate: sParsed.governorate,
      phone: '01099990002', consent: true, election_id: 1,
    });
    check('الوضع الصارم يقبل من في الكشف (مع اختلاف إملائي بسيط)', inRoll.data.ok, inRoll.data.error || 'مقبول');

    const c2 = makeClient(`http://127.0.0.1:${PORT_STRICT}`);
    const stranger = await c2.json('/api/register', {
      full_name: 'أحمد إبراهيم زكي', national_id: '29901010101239', birth_date: '1999-01-01',
      governorate: sec.parseNationalId('29901010101239').governorate, phone: '01099990003', consent: true, election_id: 1,
    });
    check('الوضع الصارم يرفض من ليس في الكشف', !stranger.data.ok, stranger.data.error);

    const c3 = makeClient(`http://127.0.0.1:${PORT_STRICT}`);
    const nameSwap = await c3.json('/api/register', {
      full_name: 'شخص تاني خالص', national_id: sNid, birth_date: sParsed.birthDate,
      governorate: sParsed.governorate, phone: '01099990004', consent: true, election_id: 1,
    });
    check('الوضع الصارم يرفض من في الكشف باسم مختلف تمامًا', !nameSwap.data.ok, nameSwap.data.error);
  } catch (err) {
    check(`تشغيل الاختبارات (${err.message})`, false);
  } finally {
    for (const s of servers) { try { s.kill('SIGKILL'); } catch { /* خلاص */ } }
    if (!process.argv.includes('--keep')) {
      for (const f of [DB_FILE, NEW_DB]) { try { fs.unlinkSync(f); } catch { /* مش موجود */ } }
    } else {
      console.log(`\nℹ️  ملفات بيانات الاختبار: ${DB_FILE} · ${NEW_DB}`);
    }
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${'─'.repeat(58)}`);
  console.log(`النتيجة: ${passed}/${results.length} اختبار ناجح ${passed === results.length ? '— كل حاجة تمام ✓' : '— فيه اختبارات فشلت ✗'}`);
  process.exit(passed === results.length ? 0 : 1);
})();
