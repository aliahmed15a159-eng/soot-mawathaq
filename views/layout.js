'use strict';
/** هيكل الصفحات + مكتبة الرموز المصرية (لوتس، عنخ، جعران، عين حورس، قرص الشمس المجنّح) */

function esc(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* مكتبة الرموز — تُحقن مرة واحدة في كل صفحة */
const ICON_DEFS = `
<svg style="display:none" aria-hidden="true">
  <symbol id="i-lotus" viewBox="0 0 64 64">
    <g fill="currentColor">
      <path d="M32 6c5 7 7.5 14 7.5 21S36 41 32 47c-4-6-7.5-13-7.5-20S27 13 32 6z"/>
      <path d="M32 47c-8-4-16-3.5-23 2 3-10 10-15 23-13 13-2 20 3 23 13-7-5.5-15-6-23-2z"/>
    </g>
  </symbol>
  <symbol id="i-ankh" viewBox="0 0 64 64">
    <g fill="none" stroke="currentColor" stroke-width="4.6" stroke-linecap="round">
      <path d="M32 58c-2-14-2-24 0-32"/><path d="M18 30h28"/>
      <ellipse cx="32" cy="17" rx="9.5" ry="11.5"/>
    </g>
  </symbol>
  <symbol id="i-scarab" viewBox="0 0 64 64">
    <ellipse cx="32" cy="35" rx="12.5" ry="16" fill="currentColor"/>
    <circle cx="32" cy="15" r="6.5" fill="currentColor"/>
    <g fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round">
      <path d="M32 12v-5M25 9l-6-5M39 9l6-5M19 28l-9-4M45 28l9-4M19 41l-9 4M45 41l9 4M24 51l-6 7M40 51l6 7"/>
    </g>
  </symbol>
  <symbol id="i-horus" viewBox="0 0 64 64">
    <g fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round">
      <path d="M8 28c6-8 15-12 26-12 9 0 16 3 22 9-4 8-12 13-22 13-11 0-20-3-26-10z"/>
      <circle cx="26" cy="27" r="5.4"/>
      <path d="M22 40l-4 14c6-2 10-6 12-12M34 41l9 11c1-7-1-12-5-15"/>
    </g>
  </symbol>
  <symbol id="i-eye" viewBox="0 0 64 64">
    <g fill="none" stroke="currentColor" stroke-width="4">
      <path d="M6 32c8-11 18-16 26-16s18 5 26 16c-8 11-18 16-26 16S14 43 6 32z"/>
    </g>
    <circle cx="32" cy="32" r="7.5" fill="currentColor"/>
  </symbol>
  <symbol id="i-wing" viewBox="0 0 240 40">
    <g fill="currentColor">
      <circle cx="120" cy="20" r="11"/>
      <path d="M104 16c-18-3-34 0-48 9 16-2 30 0 42 6-14 0-26 4-36 12 16-4 30-4 42-1z"/>
      <path d="M136 16c18-3 34 0 48 9-16-2-30 0-42 6 14 0 26 4 36 12-16-4-30-4-42-1z"/>
    </g>
  </symbol>
  <symbol id="i-camera" viewBox="0 0 64 64">
    <g fill="none" stroke="currentColor" stroke-width="4.2" stroke-linejoin="round">
      <rect x="6" y="18" width="52" height="34" rx="7"/>
      <circle cx="32" cy="35" r="11"/>
      <path d="M22 18l5-8h10l5 8"/>
    </g>
  </symbol>
  <symbol id="i-check" viewBox="0 0 64 64">
    <path d="M10 34l14 14L54 16" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  </symbol>
  <symbol id="i-warn" viewBox="0 0 64 64">
    <g fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M32 8l26 46H6z"/><path d="M32 25v15M32 46v1.5"/>
    </g>
  </symbol>
  <symbol id="i-lock" viewBox="0 0 64 64">
    <g fill="none" stroke="currentColor" stroke-width="4.6" stroke-linecap="round">
      <rect x="12" y="28" width="40" height="28" rx="6"/>
      <path d="M22 28v-8a10 10 0 0120 0v8"/>
    </g>
  </symbol>
</svg>`;

function icon(name, size = 22, cls = 'ico') {
  return `<svg class="${cls}" width="${size}" height="${size}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

const WINGED_SUN = `
<div class="wingsun" aria-hidden="true">
  <svg viewBox="0 0 240 40" width="240" height="40"><use href="#i-wing"/></svg>
  <span class="wingsun-line"></span>
  <svg viewBox="0 0 240 40" width="240" height="40"><use href="#i-wing"/></svg>
</div>`;

function stepper(active) {
  const steps = [
    ['التسجيل', 'user'],
    ['التحقق', 'camera'],
    ['الاقتراع', 'lotus'],
    ['الإيصال', 'eye'],
  ];
  return `<ol class="stepper">${steps.map(([label, ic], i) => {
    const state = i + 1 < active ? 'done' : i + 1 === active ? 'active' : '';
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
<meta name="theme-color" content="#0E2440">
<title>${esc(title)} — صوت موثّق</title>
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/styles.css">
</head>
<body class="${bodyClass}">
${ICON_DEFS}
<div class="papyrus-bg" aria-hidden="true"></div>
<header class="site-head">
  <a class="brand" href="/">
    <span class="cartouche">
      <span class="cartouche-inner">${icon('ankh', 20)}<b>صوت موثّق</b>${icon('lotus', 20)}</span>
    </span>
  </a>
  <nav class="site-nav">
    <a href="/">الرئيسية</a>
    <a href="/results">النتائج</a>
    <a href="/vote-here">منصة اقتراع</a>
    <a href="/admin">الإدارة</a>
  </nav>
</header>
${demo ? '<div class="demo-ribbon">وضع التجربة — قاعدة بيانات محلية. ضبط مفاتيح Supabase في ملف .env للاتصال بقاعدة البيانات الحقيقية</div>' : ''}
<main class="${wide ? 'wrap wide' : 'wrap'}">
  ${showStepper ? stepper(active) : ''}
  ${body}
</main>
${WINGED_SUN}
<footer class="site-foot">
  <div class="foot-grid">
    <div>
      <h4>${icon('scarab', 18)} صوت موثّق</h4>
      <p>منصة انتخابات إلكترونية لا تُحسب فيها إلا هوية واحدة حقيقية — التحقق بالبطاقة والسيلفي الحيّ، والاقتراع سرّي.</p>
    </div>
    <div>
      <h4>${icon('eye', 18)} روابط سريعة</h4>
      <p><a href="/">التسجيل والتصويت</a> · <a href="/results">النتائج اللحظية</a> · <a href="/verify-receipt">التحقق من إيصال</a></p>
    </div>
    <div>
      <h4>${icon('lock', 18)} الخصوصية</h4>
      <p>لا نخزّن الرقم القومي كنص صريح — الخصوصية محفوظة من قلب التصميم.</p>
    </div>
  </div>
  <div class="foot-strip" aria-hidden="true"></div>
  <p class="copyright">صوت موثّق © 2026 — نموذج مبدئي (Proof of Concept) لأغراض العرض والتجربة.</p>
</footer>
<script src="/app.js" defer></script>
</body>
</html>`;
}

module.exports = { shell, esc, icon, stepper, WINGED_SUN, ICON_DEFS };
