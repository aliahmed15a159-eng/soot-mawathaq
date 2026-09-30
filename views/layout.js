'use strict';
/**
 * القالب الموحّد لمنصة «صوت موثّق»
 * تصميم عالمي نظيف على غرار منصات الاقتراع الإلكتروني الأوروبية (Estonia i-Voting / Swiss E-Voting / Stripe Identity)
 * بدون أي إشارات فرعونية، وبدون إظهار أي رابط للوحة الإدارة للجمهور.
 */

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const ICON_DEFS = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
  <symbol id="i-ankh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </symbol>
  <symbol id="i-lotus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m9 11 3 3L22 4"/>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </symbol>
  <symbol id="i-scarab" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect width="20" height="14" x="2" y="5" rx="2"/>
    <circle cx="8" cy="12" r="2"/>
    <path d="M14 10h4"/><path d="M14 14h4"/>
  </symbol>
  <symbol id="i-horus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
    <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
    <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
    <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
    <circle cx="12" cy="11" r="3"/>
    <path d="M7 17a5 5 0 0 1 10 0"/>
  </symbol>
  <symbol id="i-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 3v18h18"/>
    <path d="M7 16v-5"/><path d="M12 16V8"/><path d="M17 16v-3"/>
  </symbol>
  <symbol id="i-camera" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
    <circle cx="12" cy="13" r="3"/>
  </symbol>
  <symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 6 9 17l-5-5"/>
  </symbol>
  <symbol id="i-warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" x2="12" y1="8" y2="12"/>
    <line x1="12" x2="12.01" y1="16" y2="16"/>
  </symbol>
  <symbol id="i-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </symbol>
</svg>`;

const WINGED_SUN = '';

function icon(name, size = 20) {
  return `<svg class="ic" width="${size}" height="${size}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

function stepper(active = 1) {
  const steps = [
    ['01', 'مطابقة السجل المدني', 'scarab'],
    ['02', 'البصمة الحيوية للوجه', 'horus'],
    ['03', 'ورقة الاقتراع السرية', 'lotus'],
    ['04', 'إيصال التصويت المشفّر', 'check'],
  ];
  return `<ol class="stepper" aria-label="مراحل التصويت">${steps.map(([num, label], i) => {
    const state = i + 1 < active ? 'done' : i + 1 === active ? 'active' : 'todo';
    return `<li class="step ${state}">
      <span class="step-dot">${i + 1 < active ? icon('check', 16) : `<b class="mono">${num}</b>`}</span>
      <span class="step-label">${esc(label)}</span>
    </li>`;
  }).join('')}</ol>`;
}

function shell({ title, body, active = 1, showStepper = false, wide = false, demo = false, bodyClass = '' }) {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0F172A">
<title>${esc(title)} — صوت موثّق | المنصة الوطنية للاقتراع الإلكتروني</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Alexandria:wght@500;600;700;800&family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/styles.css?v=9">
</head>
<body class="${bodyClass}">
${ICON_DEFS}
<div class="gov-Ribbon">
  <div class="gov-ribbon-inner">
    <span class="gov-ribbon-tag"><span class="pulse-dot"></span> بوابة الاقتراع الإلكتروني الرسمية الموثّقة — نظام التحقق البيومتري المباشر</span>
    <span class="gov-ribbon-meta mono">E2E VERIFIABLE · 128-D FACE ID · SHA-256</span>
  </div>
</div>
<header class="site-head">
  <div class="head-inner">
    <a class="brand" href="/">
      <span class="brand-badge">${icon('ankh', 22)}</span>
      <span class="brand-text">
        <b>صوت موثّق</b>
        <small>منصة الاقتراع الرقمي والتحقق البيومتري</small>
      </span>
    </a>
    <nav class="site-nav">
      <a href="/">الرئيسية والمرشحون</a>
      <a href="/results">النتائج المباشرة</a>
      <a href="/verify-receipt">فحص إيصال التصويت</a>
      <a href="/register" class="nav-cta">${icon('lotus', 16)} ابدأ التصويت الآن</a>
    </nav>
  </div>
</header>
<main class="${wide ? 'wrap wide' : 'wrap'}">
  ${showStepper ? stepper(active) : ''}
  ${body}
</main>
<footer class="site-foot">
  <div class="foot-grid">
    <div>
      <div class="foot-brand">
        <span class="brand-badge sm">${icon('ankh', 18)}</span>
        <b>صوت موثّق — منظومة الاقتراع الرقمي</b>
      </div>
      <p>منصة اقتراع إلكتروني حديثة تعمل بمعايير التصويت الرقمي العالمية: مطابقة فورية مع بطاقات السجل المدني، تحقق بيومتري ثلاثي المراحل من الوجه الحي (128-D)، وعزل تشفيري تام بين هوية الناخب وورقة الاقتراع.</p>
    </div>
    <div>
      <h4>بوابات الناخبين</h4>
      <ul class="foot-links">
        <li><a href="/">المرشحون والبرامج الانتخابية</a></li>
        <li><a href="/register">التحقق من الهوية والتصويت</a></li>
        <li><a href="/results">الفرز اللحظي والمؤشرات</a></li>
        <li><a href="/verify-receipt">التحقق من إيصال الصوت</a></li>
      </ul>
    </div>
    <div>
      <h4>معايير النزاهة والسرية</h4>
      <p>تُمنح تذكرة اقتراع وحيدة الاستخدام لكل رقم قومي بعد اجتياز مطابقة الوجه العصبية، ولا يُحفظ أي ارتباط بين الناخب والمرشح المختار.</p>
    </div>
  </div>
  <div class="copyright">
    <span>صوت موثّق © ٢٠٢٦ — جميع الحقوق محفوظة لمنظومة الاقتراع الإلكتروني الموثّق</span>
    <span class="mono">STANDARD E-VOTING v5.0 · 128-D BIOMETRICS</span>
  </div>
</footer>
<script src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.min.js" crossorigin="anonymous" defer></script>
<script src="/app.js?v=9" defer></script>
</body>
</html>`;
}

module.exports = { shell, esc, icon, stepper, WINGED_SUN };
