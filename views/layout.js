'use strict';
/**
 * القالب العصري الموحّد لمنصة «صوت موثّق»
 * تصميم حديث ونظيف (Modern Digital Identity & Voting UI) — بدون أي إشارات فرعونية، وبدون إظهار رابط الإدارة للجمهور.
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
  <!-- درع موثّق (بديل عصري) -->
  <symbol id="i-ankh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </symbol>
  <!-- شارة تحقق (بديل اللوتس) -->
  <symbol id="i-lotus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/>
    <path d="m9 12 2 2 4-4"/>
  </symbol>
  <!-- بطاقة هوية رقمية (بديل الجعران) -->
  <symbol id="i-scarab" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect width="20" height="14" x="2" y="5" rx="2"/>
    <circle cx="8" cy="12" r="2"/>
    <path d="M14 10h4"/><path d="M14 14h4"/>
  </symbol>
  <!-- بصمة ذكية (بديل حورس) -->
  <symbol id="i-horus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
    <path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
    <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/>
    <path d="M2 12a10 10 0 0 1 18-6"/>
    <path d="M2 16h.01"/>
    <path d="M21.8 16c.2-2 .131-5.354 0-6"/>
    <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/>
    <path d="M8.65 22c.21-.66.45-1.32.57-2"/>
    <path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>
  </symbol>
  <!-- عين/النتائج -->
  <symbol id="i-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
    <circle cx="12" cy="12" r="3"/>
  </symbol>
  <!-- كاميرا -->
  <symbol id="i-camera" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
    <circle cx="12" cy="13" r="3"/>
  </symbol>
  <!-- صح -->
  <symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 6 9 17l-5-5"/>
  </symbol>
  <!-- تنبيه -->
  <symbol id="i-warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" x2="12" y1="8" y2="12"/>
    <line x1="12" x2="12.01" y1="16" y2="16"/>
  </symbol>
  <!-- قفل -->
  <symbol id="i-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </symbol>
</svg>`;

const WINGED_SUN = '';

function icon(name, size = 20) {
  return `<svg class="ic" width="${size}" height="${size}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

/** شريط المراحل العصري */
function stepper(active = 1) {
  const steps = [
    ['مطابقة بيانات البطاقة', 'scarab'],
    ['التحقق من الوجه الحي', 'camera'],
    ['الاقتراع السري', 'lotus'],
    ['إيصال التصويت', 'check'],
  ];
  return `<ol class="stepper" aria-label="مراحل التصويت">${steps.map(([label, ic], i) => {
    const state = i + 1 < active ? 'done' : i + 1 === active ? 'active' : 'todo';
    return `<li class="step ${state}">
      <span class="step-dot">${i + 1 < active ? icon('check', 16) : icon(ic, 18)}</span>
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
<meta name="theme-color" content="#4F46E5">
<title>${esc(title)} — صوت موثّق</title>
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/styles.css">
</head>
<body class="${bodyClass}">
${ICON_DEFS}
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
      <a href="/">الرئيسية</a>
      <a href="/register">ابدأ التصويت</a>
      <a href="/results">النتائج المباشرة</a>
      <a href="/verify-receipt">فحص إيصال</a>
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
      <h4>${icon('ankh', 18)} صوت موثّق</h4>
      <p>منصة اقتراع إلكتروني حديثة تعتمد على مطابقة بيانات الناخب مع البطاقات المسجّلة في قاعدة البيانات والتحقق البيومتري من الوجه الحي بالذكاء الاصطناعي.</p>
    </div>
    <div>
      <h4>${icon('eye', 18)} روابط سريعة</h4>
      <p><a href="/register">التحقق والتصويت</a> · <a href="/results">النتائج اللحظية</a> · <a href="/verify-receipt">التحقق من إيصال</a></p>
    </div>
    <div>
      <h4>${icon('lock', 18)} الأمان والخصوصية</h4>
      <p>صوت واحد لكل هوية موثّقة — الاقتراع مفصول تمامًا عن بيانات الناخب لضمان السرية الكاملة.</p>
    </div>
  </div>
  <p class="copyright">صوت موثّق © 2026 — نظام التحقق البيومتري والاقتراع الرقمي</p>
</footer>
<script src="/vendor/face-api.min.js" defer></script>
<script src="/app.js" defer></script>
</body>
</html>`;
}

module.exports = { shell, esc, icon, stepper, WINGED_SUN, ICON_DEFS };
