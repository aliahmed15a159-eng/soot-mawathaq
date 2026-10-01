'use strict';
/**
 * فحص الكاميرا — يشغّل public/app.js الحقيقي داخل DOM مطابق لصفحة /verify
 * ويتأكد من ثلاث حالات:
 *   ١) الكاميرا تفتح من غير ما تعتمد على /api/verify/start
 *   ٢) لو /api/verify/start فشل — الكاميرا لسه تفتح والتحديات الاحتياطية تظهر
 *   ٣) لو المستخدم رفض إذن الكاميرا — تظهر رسالة سبب واضحة بدل سكات
 *
 * التشغيل: node tools/camera-check.js [baseUrl]
 */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const BASE = process.argv[2] || 'http://localhost:3000';
const APP_JS = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');

let cookieJar = '';
let pass = 0; let fail = 0;
function check(name, cond, note = '') {
  if (cond) { pass++; console.log(`✅ ${name}${note ? '  (' + note + ')' : ''}`); }
  else { fail++; console.log(`❌ ${name}${note ? '  (' + note + ')' : ''}`); }
}

async function req(method, urlPath, body) {
  const res = await fetch(BASE + urlPath, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookieJar ? { Cookie: cookieJar } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await res.text();
  const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')];
  for (const c of sc) {
    if (!c) continue;
    const pair = c.split(';')[0];
    const name = pair.split('=')[0];
    cookieJar = [...cookieJar.split('; ').filter((x) => x && !x.startsWith(`${name}=`)), pair].join('; ');
  }
  let data = null;
  try { data = JSON.parse(raw); } catch { /* html */ }
  return { status: res.status, data, raw };
}

/* ------------------------------------------------------------------ بيئات وهمية للوسائط */
function fakeStream() {
  const track = {
    readyState: 'live',
    stop() { this.readyState = 'ended'; },
    getSettings: () => ({ width: 1280, height: 720 }),
  };
  return { getVideoTracks: () => [track], getTracks: () => [track] };
}

function fakeCanvasContext() {
  const noop = () => {};
  return {
    canvas: null, drawImage: noop, fillRect: noop, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    putImageData: noop, createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    set fillStyle(v) {}, get fillStyle() { return '#000'; },
  };
}

/** يبني DOM مطابق لصفحة /verify ويشغّل app.js الحقيقي فوقه */
async function mount({ getUserMedia, breakVerifyStart = false, faceApi = null, wait = 400 }) {
  const verifyHtml = await req('GET', '/verify');
  if (verifyHtml.status !== 200) throw new Error('صفحة /verify مش شغالة: ' + verifyHtml.status);

  const vc = new VirtualConsole();
  const pageErrors = [];
  vc.on('jsdomError', (e) => pageErrors.push(e.message));

  const dom = new JSDOM(verifyHtml.raw, {
    url: BASE + '/verify', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc,
  });
  const { window } = dom;

  // وسائط وهمية
  window.HTMLCanvasElement.prototype.getContext = function () { const c = fakeCanvasContext(); c.canvas = this; return c; };
  window.Image = class {
    set src(v) { this.__src = v; setTimeout(() => (this.onerror || (() => {}))(), 0); }
    get src() { return this.__src; }
  };
  window.HTMLMediaElement.prototype.play = async function () { this.__playing = true; };
  window.HTMLMediaElement.prototype.pause = function () { this.__playing = false; };

  const gmuCalls = [];
  window.navigator.mediaDevices = {
    getUserMedia: async (constraints) => {
      gmuCalls.push(constraints);
      if (typeof getUserMedia === 'function') return getUserMedia(constraints);
      return fakeStream();
    },
    addEventListener: () => {},
    enumerateDevices: async () => [],
  };
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });

  // توجيه fetch للخادم الحقيقي مع إمكانية كسر /api/verify/start
  window.fetch = async (url, opts) => {
    const u = String(url);
    if (breakVerifyStart && u.includes('/api/verify/start')) {
      return { ok: false, status: 500, json: async () => ({ ok: false, error: 'server down' }) };
    }
    const res = await fetch(BASE + u.replace(/^https?:\/\/[^/]+/, ''), {
      method: (opts && opts.method) || 'GET',
      headers: { 'Content-Type': 'application/json', ...(cookieJar ? { Cookie: cookieJar } : {}) },
      body: opts && opts.body,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, json: async () => JSON.parse(text), text: async () => text };
  };

  // إعدادات المحرك زي ما بتطلع من layout.js
  window.SOOT_ENGINE = {
    faceApiLocal: '/vendor/face-api.min.js?v=12',
    faceApiCdn: 'https://cdn.example/face-api.min.js',
    modelLocal: '/models',
    modelCdn: 'https://cdn.example/model',
  };
  if (faceApi) window.faceapi = faceApi;

  // منع تحميل سكربتات خارجية فعلية
  window.HTMLScriptElement.prototype.addEventListener; // noop
  const realAppend = window.document.head.appendChild.bind(window.document.head);
  window.document.head.appendChild = (node) => {
    if (node && node.tagName === 'SCRIPT' && node.src) { node.__blocked = true; return node; }
    return realAppend(node);
  };

  window.eval(APP_JS);
  await new Promise((r) => setTimeout(r, wait));
  return { dom, window, gmuCalls, pageErrors, $: (s) => window.document.querySelector(s) };
}

/* ------------------------------------------------------------------ */
(async () => {
  console.log(`\n📷 فحص الكاميرا — ${BASE}\n${'─'.repeat(58)}`);

  const health = await req('GET', '/healthz');
  check('الخادم يعمل', health.status === 200 && health.data.ok);

  // نسجّل ناخب حقيقي عشان صفحة /verify تُعرض ببيانات
  // بنية الرقم القومي: قرن(2=19xx) + سنة + شهر + يوم + كود المحافظة(21=الجيزة) + مسلسل + نوع
  const rnd = (n) => Math.floor(Math.random() * n);
  const yy = String(70 + rnd(30)).padStart(2, '0');
  const mm = String(1 + rnd(12)).padStart(2, '0');
  const dd = String(1 + rnd(28)).padStart(2, '0');
  const reg = await req('POST', '/api/register', {
    full_name: 'مينا عبد المسيح حنا',
    national_id: `2${yy}${mm}${dd}21${String(1000 + rnd(8999))}${1 + 2 * rnd(5)}`,
    birth_date: `19${yy}-${mm}-${dd}`,
    governorate: 'الجيزة',
    phone: '010' + String(10000000 + rnd(89999999)),
    consent: true,
    election_id: 1,
  });
  check('تسجيل ناخب لفتح صفحة التحقق', reg.status === 200 && reg.data.ok, reg.data.error || '');
  if (reg.data.otp && reg.data.otp.required) {
    await req('POST', '/api/otp/verify', { code: reg.data.otp.dev_code || '' });
  }

  /* ---------- الحالة ١: كل حاجة سليمة ---------- */
  {
    const { gmuCalls, $, pageErrors } = await mount({});
    check('getUserMedia اتنادت تلقائيًا عند فتح الصفحة', gmuCalls.length >= 1, `${gmuCalls.length} نداء`);
    check('حالة الكاميرا = تعمل', /الكاميرا تعمل/.test($('#cam-status')?.textContent || ''), $('#cam-status')?.textContent || '');
    check('البث اتربط بعنصر الفيديو', !!$('#video-selfie')?.srcObject);
    check('التحديات اتعرضت في الصفحة', ($('#challenge-list')?.children.length || 0) >= 1, `${$('#challenge-list')?.children.length} تحدّي`);
    check('مفيش أخطاء JavaScript غير متوقعة', !pageErrors.some((e) => !/not implemented|Not implemented/i.test(e)), pageErrors.join(' | ').slice(0, 120));
  }

  /* ---------- الحالة ٢: /api/verify/start واقع ---------- */
  {
    const { gmuCalls, $ } = await mount({ breakVerifyStart: true });
    check('الكاميرا بتفتح حتى لو /api/verify/start فشل', gmuCalls.length >= 1 && /الكاميرا تعمل/.test($('#cam-status')?.textContent || ''), $('#cam-status')?.textContent || '');
    check('تحديات احتياطية محلية بتظهر', ($('#challenge-list')?.children.length || 0) === 3, `${$('#challenge-list')?.children.length} تحدّي`);
  }

  /* ---------- الحالة ٣: المستخدم رفض إذن الكاميرا ---------- */
  {
    const err = new Error('Permission denied'); err.name = 'NotAllowedError';
    const { gmuCalls, $ } = await mount({ getUserMedia: () => { throw err; } });
    check('تمت محاولة فتح الكاميرا', gmuCalls.length >= 1);
    check('حالة الكاميرا = خطأ موضح', /إذن الكاميرا/.test($('#cam-status')?.textContent || ''), $('#cam-status')?.textContent || '');
    check('رسالة إرشادية ظاهرة للمستخدم', !$('#verify-error')?.hidden && /اسمح/.test($('#verify-error')?.textContent || ''), ($('#verify-error')?.textContent || '').slice(0, 60));
  }

  /* ---------- الحالة ٤: مفيش كاميرا في الجهاز ---------- */
  {
    const err = new Error('No device'); err.name = 'NotFoundError';
    const { $ } = await mount({ getUserMedia: () => { throw err; } });
    check('رسالة واضحة لما مفيش كاميرا', /مفيش كاميرا/.test($('#verify-error')?.textContent || ''), ($('#verify-error')?.textContent || '').slice(0, 60));
  }

  /* ---------- الحالة ٥: الكاميرا مشغولة بتطبيق تاني ---------- */
  {
    const err = new Error('In use'); err.name = 'NotReadableError';
    const { $ } = await mount({ getUserMedia: () => { throw err; } });
    check('رسالة واضحة لما الكاميرا مشغولة', /مشغولة/.test($('#verify-error')?.textContent || ''), ($('#verify-error')?.textContent || '').slice(0, 60));
  }

  /* ---------- الحالة ٦: اتصال غير آمن ---------- */
  {
    const verifyHtml = await req('GET', '/verify');
    const vc = new VirtualConsole();
    // عنوان غير localhost وغير HTTPS — المتصفح هنا بيبقى في سياق غير آمن فعلًا
    const dom = new JSDOM(verifyHtml.raw, { url: 'http://192.168.1.20:3000/verify', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
    const { window } = dom;
    window.HTMLCanvasElement.prototype.getContext = function () { const c = fakeCanvasContext(); c.canvas = this; return c; };
    window.HTMLMediaElement.prototype.play = async function () {};
    window.navigator.mediaDevices = { getUserMedia: async () => fakeStream(), addEventListener: () => {} };
    window.fetch = async () => ({ ok: true, status: 200, json: async () => ({ ok: true, challenge: [] }) });
    window.SOOT_ENGINE = { faceApiLocal: '/vendor/face-api.min.js', modelLocal: '/models' };
    window.eval(APP_JS);
    await new Promise((r) => setTimeout(r, 300));
    const txt = window.document.querySelector('#verify-error')?.textContent || '';
    check('رسالة واضحة على اتصال غير آمن (HTTP)', /HTTPS/.test(txt), txt.slice(0, 70));
  }

  /* ---------- الحالة ٧: محرك الوجه بيحمّل من النسخة المحلية ---------- */
  {
    const loaded = [];
    const stub = {
      nets: {
        tinyFaceDetector: { loadFromUri: async (u) => { loaded.push(['tiny', u]); } },
        faceLandmark68TinyNet: { loadFromUri: async (u) => { loaded.push(['landmark', u]); } },
        faceRecognitionNet: { loadFromUri: async (u) => { loaded.push(['recog', u]); } },
      },
      TinyFaceDetectorOptions: class {},
      detectSingleFace: async () => null,
      euclideanDistance: () => 0,
    };
    const { $ } = await mount({ faceApi: stub, wait: 900 });
    check('الموديلات بتتحمّل من /models المحلي مش من CDN',
      loaded.length === 3 && loaded.every(([, u]) => u === '/models'),
      loaded.map(([, u]) => u).join(',') || 'ولا واحد');
    check('شارة المحرك بتتحدث بعد التحميل', /جاهز/.test($('#ai-engine-text')?.textContent || ''), $('#ai-engine-text')?.textContent || '');
  }

  console.log('─'.repeat(58));
  console.log(`النتيجة: ${pass}/${pass + fail} فحص ناجح${fail ? ' — فيه فشل ❌' : ' — كل حاجة تمام ✓'}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
