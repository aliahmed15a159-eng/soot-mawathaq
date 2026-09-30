'use strict';
/**
 * الهيكل الرسمي لمنصة «صوت موثّق» — البوابة الوطنية للانتخابات الرقمية
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
  <symbol id="i-ankh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </symbol>
  <symbol id="i-lotus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="m9 11 3 3L22 4"/>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </symbol>
  <symbol id="i-scarab" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect width="20" height="14" x="2" y="5" rx="2"/>
    <circle cx="8" cy="12" r="2"/>
    <path d="M14 10h4"/><path d="M14 14h4"/>
  </symbol>
  <symbol id="i-horus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
    <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
    <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
    <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
    <circle cx="12" cy="11" r="3"/>
    <path d="M7 17a5 5 0 0 1 10 0"/>
  </symbol>
  <symbol id="i-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 3v18h18"/>
    <path d="M7 16v-5"/><path d="M12 16V8"/><path d="M17 16v-3"/>
  </symbol>
  <symbol id="i-camera" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
    <circle cx="12" cy="13" r="3"/>
  </symbol>
  <symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 6 9 17l-5-5"/>
  </symbol>
  <symbol id="i-warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" x2="12" y1="8" y2="12"/>
    <line x1="12" x2="12.01" y1="16" y2="16"/>
  </symbol>
  <symbol id="i-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </symbol>
  <!-- الرموز الانتخابية المرسومة كخطوط فيكتور رسمية بدون أي إيموجي -->
  <symbol id="sym-scale" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 3v18"/><path d="M5 7h14"/><path d="M8 21h8"/>
    <path d="M5 7 2 14h6L5 7z"/><path d="M19 7l-3 7h6l-3-7z"/>
  </symbol>
  <symbol id="sym-falcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 3 4 9l3 2 5-3 5 3 3-2-8-6z"/>
    <path d="m7 11-2 6 7-2 7 2-2-6"/>
    <path d="M12 8v13"/>
  </symbol>
  <symbol id="sym-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/>
    <path d="m4.9 4.9 2.1 2.1"/><path d="m17 17 2.1 2.1"/><path d="m19.1 4.9-2.1 2.1"/><path d="m7 17-2.1 2.1"/>
  </symbol>
  <symbol id="sym-palm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 22V9"/>
    <path d="M12 9C9 5 4 6 3 9c3-1 6 0 9 0z"/>
    <path d="M12 9c3-4 8-3 9 0-3-1-6 0-9 0z"/>
    <path d="M12 9c-2-5-6-6-8-4 3 0 6 2 8 4z"/>
    <path d="M12 9c2-5 6-6 8-4-3 0-6 2-8 4z"/>
    <path d="M8 22h8"/>
  </symbol>
</svg>`;

const WINGED_SUN = '';

function icon(name, size = 18) {
  return `<svg class="ic" width="${size}" height="${size}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

function stepper(active = 1) {
  const steps = [
    ['١', 'بيانات بطاقة الرقم القومي'],
    ['٢', 'مطابقة صورة الوجه'],
    ['٣', 'ورقة الاقتراع'],
    ['٤', 'إيصال التصويت'],
  ];
  return `<ol class="stepper" aria-label="خطوات التصويت">${steps.map(([num, label], i) => {
    const state = i + 1 < active ? 'done' : i + 1 === active ? 'active' : 'todo';
    return `<li class="step ${state}">
      <span class="step-dot">${i + 1 < active ? icon('check', 15) : `<b>${num}</b>`}</span>
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
<meta name="theme-color" content="#111827">
<title>${esc(title)} — صوت موثّق | البوابة الرسمية للانتخابات</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@500;600;700;800&family=IBM+Plex+Mono:wght@500;600&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/styles.css?v=10">
</head>
<body class="${bodyClass}">
${ICON_DEFS}
<div class="national-bar"></div>
<header class="site-head">
  <div class="head-inner">
    <a class="brand" href="/">
      <span class="brand-emblem">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M12 2L4 5.5v6c0 5.4 3.4 9.6 8 10.5 4.6-.9 8-5.1 8-10.5v-6L12 2z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
      </span>
      <span class="brand-text">
        <b>صوت موثّق</b>
        <small>البوابة الوطنية للانتخابات والاستفتاءات</small>
      </span>
    </a>
    <nav class="site-nav">
      <a href="/">الرئيسية</a>
      <a href="/#candidates-section">قائمة المرشحين</a>
      <a href="/results">نتائج الفرز</a>
      <a href="/verify-receipt">الاستعلام عن إيصال</a>
      <a href="/register" class="nav-cta">الدخول للتصويت</a>
    </nav>
  </div>
</header>
<main class="${wide ? 'wrap wide' : 'wrap'}">
  ${showStepper ? stepper(active) : ''}
  ${body}
</main>
<footer class="site-foot">
  <div class="foot-inner">
    <div class="foot-col">
      <b>صوت موثّق — البوابة الوطنية للانتخابات</b>
      <p>خدمة الاقتراع الإلكتروني ببطاقة الرقم القومي ومطابقة صورة الوجه مع السجل المدني المعتمد، مع ضمان السرية الكاملة لورقة الاقتراع.</p>
    </div>
    <div class="foot-col">
      <b>الخدمات</b>
      <ul class="foot-links">
        <li><a href="/">المرشحون والبرامج الانتخابية</a></li>
        <li><a href="/register">تسجيل الدخول بالرقم القومي</a></li>
        <li><a href="/results">النتائج ومؤشرات الفرز</a></li>
        <li><a href="/verify-receipt">الاستعلام عن إيصال التصويت</a></li>
      </ul>
    </div>
    <div class="foot-col">
      <b>ضوابط التصويت</b>
      <p>يُشترط تطابق بيانات الرقم القومي وصورة الوجه مع البطاقة المسجّلة. يحق لكل مواطن الإدلاء بصوت واحد فقط في الاستحقاق الانتخابي.</p>
    </div>
  </div>
  <div class="foot-bottom">
    <span>جميع الحقوق محفوظة © ٢٠٢٦ — بوابة صوت موثّق للانتخابات</span>
    <span>جمهورية مصر العربية</span>
  </div>
</footer>
<script src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.min.js" crossorigin="anonymous" defer></script>
<script src="/app.js?v=10" defer></script>
</body>
</html>`;
}

module.exports = { shell, esc, icon, stepper, WINGED_SUN };
