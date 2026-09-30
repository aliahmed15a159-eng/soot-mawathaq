'use strict';
/**
 * هيكل منصة «صوت» — هوية بصرية زمردية، وضع فاتح/داكن، RTL أصيل
 * الشعار: ورقة اقتراع + علامة تحقق — يعمل أيقونةً وشعارًا كاملًا وفي الوضعين.
 */

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ------------------------------------------------------------------ مكتبة الأيقونات (خطوط فيكتور رقيقة) */
const ICON_DEFS = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
  <symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></symbol>
  <symbol id="i-check-circle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/><path d="m8.2 12.4 2.6 2.6 5-5.6"/></symbol>
  <symbol id="i-x-circle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/><path d="m9 9 6 6M15 9l-6 6"/></symbol>
  <symbol id="i-question-circle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/><path d="M9.4 9.2a2.7 2.7 0 0 1 5.2 1c0 1.8-2.6 2.2-2.6 3.8"/><line x1="12" y1="17.2" x2="12.01" y2="17.2"/></symbol>
  <symbol id="i-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></symbol>
  <symbol id="i-shield-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m8.8 12 2.3 2.3 4.3-4.8"/></symbol>
  <symbol id="i-fingerprint" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 11a3 3 0 0 0-3 3c0 2.5-.5 4.5-1.5 6"/><path d="M17.6 17.5A15 15 0 0 0 18 14a6 6 0 0 0-12 0c0 .7 0 1.4-.2 2.1"/><path d="M8.5 5.6A9 9 0 0 1 21 14c0 1.2-.1 2.4-.3 3.5"/><path d="M6.4 8.1A9 9 0 0 0 3 14c0 .8 0 1.6.2 2.4"/><path d="M12 14c0 3-.6 5.5-1.7 7.5"/></symbol>
  <symbol id="i-id-card" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><circle cx="8.4" cy="11" r="2.1"/><path d="M5.2 16.4a3.6 3.6 0 0 1 6.4 0"/><path d="M14.5 9.5h4M14.5 13h4M14.5 16.5h2.4"/></symbol>
  <symbol id="i-scan-face" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5.5A2.5 2.5 0 0 1 5.5 3H7"/><path d="M17 3h1.5A2.5 2.5 0 0 1 21 5.5V7"/><path d="M21 17v1.5a2.5 2.5 0 0 1-2.5 2.5H17"/><path d="M7 21H5.5A2.5 2.5 0 0 1 3 18.5V17"/><path d="M9 9.3v1M15 9.3v1"/><path d="M9.2 14.6a4 4 0 0 0 5.6 0"/><path d="M12 9.3v3.2h-.8"/></symbol>
  <symbol id="i-camera" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4.5h-5L7.2 7H4.5a2 2 0 0 0-2 2v8.5a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2.7l-2.3-2.5z"/><circle cx="12" cy="13" r="3.4"/></symbol>
  <symbol id="i-ballot" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3.5h14a1.5 1.5 0 0 1 1.5 1.5v3.5h-17V5A1.5 1.5 0 0 1 5 3.5z"/><path d="M3.5 8.5h17V20a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 20V8.5z"/><path d="m9 14.2 2.2 2.2 3.8-4.4"/></symbol>
  <symbol id="i-receipt" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2.5h14V21l-2.3-1.6L14.4 21l-2.4-1.6L9.6 21l-2.3-1.6L5 21V2.5z"/><path d="M9 7h6M9 10.5h6M9 14h3.4"/></symbol>
  <symbol id="i-chart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 16v-5"/><path d="M12 16V8"/><path d="M17 16v-3"/></symbol>
  <symbol id="i-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.6-4.6"/></symbol>
  <symbol id="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5 5l1.6 1.6M17.4 17.4 19 19M19 5l-1.6 1.6M6.6 17.4 5 19"/></symbol>
  <symbol id="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></symbol>
  <symbol id="i-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></symbol>
  <symbol id="i-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></symbol>
  <symbol id="i-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></symbol>
  <symbol id="i-chevron-down" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></symbol>
  <symbol id="i-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"/></symbol>
  <symbol id="i-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2.5"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></symbol>
  <symbol id="i-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></symbol>
  <symbol id="i-user" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/></symbol>
  <symbol id="i-phone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></symbol>
  <symbol id="i-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></symbol>
  <symbol id="i-calendar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M8 2.8V7M16 2.8V7M3.5 10.5h17"/></symbol>
  <symbol id="i-alert" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 4.2 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9.5" x2="12" y2="13.5"/><line x1="12" y1="17" x2="12.01" y2="17"/></symbol>
  <symbol id="i-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/><path d="M12 11v5.5"/><line x1="12" y1="7.6" x2="12.01" y2="7.6"/></symbol>
  <symbol id="i-clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/><path d="M12 7v5l3.2 2"/></symbol>
  <symbol id="i-refresh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 3v6h-6"/></symbol>
  <symbol id="i-vote-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 1.7 5.6a2 2 0 0 0 1.9 1.4h6.8a2 2 0 0 0 1.9-1.4L19 12"/><path d="m9 11.6 2.2 2.2 4-4.6"/><path d="M4 8h16"/></symbol>
  <symbol id="i-layers" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2.5 9 4.8-9 4.8-9-4.8 9-4.8z"/><path d="m3 12.2 9 4.8 9-4.8"/><path d="m3 16.9 9 4.8 9-4.8"/></symbol>
  <symbol id="i-server" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3.5" width="18" height="7" rx="2"/><rect x="3" y="13.5" width="18" height="7" rx="2"/><path d="M7 7h.01M7 17h.01"/></symbol>
  <!-- الرموز الانتخابية -->
  <symbol id="sym-scale" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M5 7h14"/><path d="M8 21h8"/><path d="M5 7 2 14h6L5 7z"/><path d="M19 7l-3 7h6l-3-7z"/></symbol>
  <symbol id="sym-falcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 9l3 2 5-3 5 3 3-2-8-6z"/><path d="m7 11-2 6 7-2 7 2-2-6"/><path d="M12 8v13"/></symbol>
  <symbol id="sym-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/><path d="m4.9 4.9 2.1 2.1"/><path d="m17 17 2.1 2.1"/><path d="m19.1 4.9-2.1 2.1"/><path d="m7 17-2.1 2.1"/></symbol>
  <symbol id="sym-palm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V9"/><path d="M12 9C9 5 4 6 3 9c3-1 6 0 9 0z"/><path d="M12 9c3-4 8-3 9 0-3-1-6 0-9 0z"/><path d="M12 9c-2-5-6-6-8-4 3 0 6 2 8 4z"/><path d="M12 9c2-5 6-6 8-4-3 0-6 2-8 4z"/><path d="M8 22h8"/></symbol>
</svg>`;

/* شعار «صوت» — ورقة اقتراع بعلامة تحقق داخل مربع زمردية */
function logoMark(size = 40) {
  return `<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 48 48" role="img" aria-label="شعار صوت">
  <defs><linearGradient id="slogo-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#17A97D"/><stop offset="1" stop-color="#0B7A58"/></linearGradient></defs>
  <rect x="1" y="1" width="46" height="46" rx="13" fill="url(#slogo-g)"/>
  <path d="M16.4 11.5h9.4l8.7 8.7V36a2.5 2.5 0 0 1-2.5 2.5H16.4a2.5 2.5 0 0 1-2.5-2.5V14a2.5 2.5 0 0 1 2.5-2.5z" fill="#F7FAF8"/>
  <path d="M25.8 11.5v6.2a2.5 2.5 0 0 0 2.5 2.5h6.2z" fill="#BFE9D9"/>
  <path d="m18.7 27.3 4 4 7.1-8.2" fill="none" stroke="#0F8F6B" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

function icon(name, size = 18) {
  return `<svg class="ic" width="${size}" height="${size}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

/* ------------------------------------------------------------------ خطوات رحلة التصويت */
const STEP_DEFS = [
  ['01', 'البيانات'],
  ['02', 'التحقق'],
  ['03', 'الاقتراع'],
  ['04', 'الإيصال'],
];

function stepper(active = 1) {
  return `<ol class="stepper" aria-label="خطوات التصويت">${STEP_DEFS.map(([num, label], i) => {
    const n = i + 1;
    const state = n < active ? 'done' : n === active ? 'active' : 'todo';
    return `<li class="step ${state}" aria-current="${n === active ? 'step' : 'false'}">
      <span class="step-dot">${n < active ? icon('check', 14) : esc(num)}</span>
      <span class="step-label">${esc(label)}</span>
    </li>`;
  }).join('')}</ol>`;
}

/* ------------------------------------------------------------------ التبديل بين الوضع الفاتح والداكن */
function themeToggle({ inMenu = false } = {}) {
  return `<button type="button" class="theme-toggle${inMenu ? ' in-menu' : ''}" data-theme-toggle
    aria-label="التبديل بين الوضع الفاتح والداكن" title="الوضع الفاتح / الداكن">
    <span class="tt-track"><span class="tt-thumb">${icon('sun', 14)}${icon('moon', 14)}</span></span>
    <span class="tt-label" data-theme-label>داكن</span>
  </button>`;
}

/* ------------------------------------------------------------------ القائمة الرئيسية */
const NAV_LINKS = [
  { href: '/', key: 'home', label: 'الرئيسية' },
  { href: '/#candidates', key: 'candidates', label: 'المرشحون' },
  { href: '/results', key: 'results', label: 'النتائج' },
  { href: '/verify-receipt', key: 'verify-receipt', label: 'التحقق من الإيصال' },
];

function navLinks(active) {
  return NAV_LINKS.map((l) => `<a href="${l.href}"${l.key === active ? ' aria-current="page"' : ''}>${l.label}</a>`).join('');
}

/* ------------------------------------------------------------------ الهيكل العام */
function shell({ title, body, active = 1, showStepper = false, wide = false, bodyClass = '', nav = '' }) {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0F8F6B">
<meta name="description" content="صوت — منصة تصويت إلكترونية تجمع بين التحقق من الهوية والتصويت الإلكتروني الآمن. من هويتك .. إلى صوتك.">
<title>${esc(title)} — صوت | من هويتك .. إلى صوتك</title>
<script>
/* استرجاع المظهر قبل الرسم لمنع الوميض */
(function () {
  try {
    var saved = localStorage.getItem('soot-theme');
    var theme = (saved === 'light' || saved === 'dark') ? saved
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) { document.documentElement.setAttribute('data-theme', 'light'); }
})();
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/styles.css?v=11">
</head>
<body class="${esc(bodyClass)}">
${ICON_DEFS}
<a class="skip-link" href="#main">تخطَّ إلى المحتوى الرئيسي</a>

<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="/" aria-label="صوت — الصفحة الرئيسية">
      ${logoMark(40)}
      <span class="brand-text">
        <span class="brand-name">صوت</span>
        <span class="brand-tag">من هويتك .. إلى صوتك</span>
      </span>
    </a>

    <nav class="main-nav" aria-label="التنقل الرئيسي">${navLinks(nav)}</nav>

    <div class="header-actions">
      <span class="trust-pill">${icon('shield-check', 14)}<span>منصة تصويت رقمية موثوقة</span></span>
      ${themeToggle({})}
      <a class="btn btn-primary btn-sm header-cta" href="/register">ابدأ التصويت</a>
      <button type="button" class="nav-burger" data-nav-toggle aria-expanded="false" aria-controls="mobile-nav" aria-label="فتح القائمة">
        ${icon('menu', 21)}
      </button>
    </div>
  </div>

  <div class="mobile-nav" id="mobile-nav" hidden>
    <nav aria-label="قائمة الجوال">
      ${navLinks(nav)}
      <a class="mobile-cta" href="/register">ابدأ التصويت</a>
    </nav>
    <div class="mobile-nav-foot">
      ${themeToggle({ inMenu: true })}
      <span class="trust-line">${icon('shield-check', 14)} منصة تصويت رقمية موثوقة</span>
    </div>
  </div>
</header>

<main class="${wide ? 'container wide' : 'container'}" id="main">
  ${showStepper ? stepper(active) : ''}
  ${body}
</main>

<footer class="site-footer">
  <div class="container footer-grid">
    <div class="foot-brand">
      <a class="brand" href="/">
        ${logoMark(36)}
        <span class="brand-text"><span class="brand-name">صوت</span><span class="brand-tag">من هويتك .. إلى صوتك</span></span>
      </a>
      <p class="foot-about">منصة تصويت إلكترونية تجمع بين التحقق من الهوية بالوجه والاقتراع السري، مع إيصال قابل للتحقق في كل خطوة.</p>
    </div>
    <nav class="foot-col" aria-label="روابط المنصة">
      <b>المنصة</b>
      <a href="/">الرئيسية</a>
      <a href="/#candidates">المرشحون</a>
      <a href="/results">النتائج</a>
      <a href="/verify-receipt">التحقق من الإيصال</a>
      <a href="/register">ابدأ التصويت</a>
    </nav>
    <div class="foot-col">
      <b>الأمان والخصوصية</b>
      <span>${icon('shield-check', 14)} تحقق من الهوية قبل الاقتراع</span>
      <span>${icon('lock', 14)} سرية التصويت مكفولة</span>
      <span>${icon('receipt', 14)} إيصال موثّق لكل صوت</span>
      <span>${icon('fingerprint', 14)} بيانات أدنى فقط في كل مرحلة</span>
    </div>
  </div>
  <div class="container footer-bottom">
    <p class="foot-disclaimer">${icon('info', 14)} هذا المشروع نموذج تجريبي لمنصة تصويت إلكترونية، وليس منصة انتخابية حكومية رسمية.</p>
    <span class="foot-copy">صوت © 2026</span>
  </div>
</footer>

<script src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.min.js" crossorigin="anonymous" defer></script>
<script src="/app.js?v=11" defer></script>
</body>
</html>`;
}

module.exports = { shell, esc, icon, stepper, logoMark, themeToggle };
