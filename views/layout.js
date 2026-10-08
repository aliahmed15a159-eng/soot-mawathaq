function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function icon(name, size = 18, cls = 'ic') {
  return `<svg class="${cls}" width="${size}" height="${size}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

const SPRITE = `
<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
  <defs>
    <symbol id="i-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
    </symbol>
    <symbol id="i-id" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5.5 16.5c.7-1.6 2-2.3 3-2.3s2.3.7 3 2.3"/><path d="M14 9h5"/><path d="M14 13h5"/><path d="M14 17h3"/>
    </symbol>
    <symbol id="i-camera" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3.5"/>
    </symbol>
    <symbol id="i-face" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/><path d="M9.5 15a3.5 3.5 0 0 0 5 0"/>
    </symbol>
    <symbol id="i-vote" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m9 12 2 2 4-4"/><path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z"/><path d="M22 19H2"/>
    </symbol>
    <symbol id="i-receipt" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/>
    </symbol>
    <symbol id="i-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </symbol>
    <symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </symbol>
    <symbol id="i-check-circle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
    </symbol>
    <symbol id="i-alert" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
    </symbol>
    <symbol id="i-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </symbol>
    <symbol id="i-chart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="7" rx="1"/><rect x="12" y="6" width="3" height="11" rx="1"/><rect x="17" y="13" width="3" height="4" rx="1"/>
    </symbol>
    <symbol id="i-users" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </symbol>
    <symbol id="i-arrow-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
    </symbol>
    <symbol id="i-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </symbol>
    <symbol id="i-print" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
    </symbol>
    <symbol id="i-upload" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </symbol>
    <symbol id="i-refresh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>
    </symbol>
    <symbol id="i-sparkle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
    </symbol>
    <symbol id="i-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>
    </symbol>
    <symbol id="i-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </symbol>
    <symbol id="i-settings" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </symbol>
    <symbol id="i-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
    </symbol>
    <symbol id="i-phone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>
    </symbol>
    <symbol id="sym-pen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
    </symbol>
    <symbol id="sym-flame" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c1.38 0 2.5-1.12 2.5-2.5 0-.61-.22-1.17-.59-1.61L12 8l-.91 4.89A2.49 2.49 0 0 0 8.5 14.5z"/>
      <path d="M12 2c-4 4.5-8 9-8 13a8 8 0 0 0 16 0c0-4-4-8.5-8-13z"/>
    </symbol>
    <symbol id="sym-scale" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3v18"/><path d="M5 7h14"/><path d="m5 7-3 6h6l-3-6Z"/><path d="m19 7-3 6h6l-3-6Z"/><path d="M8 21h8"/>
    </symbol>
    <symbol id="sym-falcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3c3.5 0 6.5 2.5 7.5 6l2.5 2-3 1.5c-.5 4-3.5 7.5-7 8.5-3.5-1-6.5-4.5-7-8.5L2 11l2.5-2C5.5 5.5 8.5 3 12 3Z"/><circle cx="12" cy="10" r="1.5"/>
    </symbol>
    <symbol id="sym-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
    </symbol>
    <symbol id="sym-palm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
      <path d="M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2l1-1 1 1h4"/><path d="M13 7.14A5.82 5.82 0 0 1 16.5 6c3.04 0 5.5 2.24 5.5 5h-3l-1-1-1 1h-3"/><path d="M5.89 9.71c-2.15 2.15-2.3 5.47-.35 7.43l4.24-4.25.7-.7.71-.71 2.12-2.12c-1.95-1.96-5.27-1.8-7.42.35Z"/><path d="M11 15.5c.5 2.5-.17 4.5-1 6.5h4c2-5.5-.5-12-1-14"/>
    </symbol>
  </defs>
</svg>`;

function parseSlogan(slogan = '', idx = 0) {
  const clean = String(slogan || '').replace(/[⚖️🦅☀️🌴🖊️🔥📘]/g, '').trim();
  const parts = clean.split('·').map((s) => s.trim()).filter(Boolean);
  const role = parts[0] || clean || 'مرشح معتمد';
  const hasDirectSymbol = /قلم|كتاب|صقر|نسر|شمس|نخل|شعلة|نار|ميزان|عدل/.test(clean);
  const rawSym = parts.slice(1).join(' · ') || (hasDirectSymbol ? clean : ['رمز: القلم', 'رمز: الصقر', 'رمز: الشعلة', 'رمز: النخلة'][idx % 4]);
  let symId = 'sym-pen';
  if (/قلم|كتاب/.test(rawSym)) symId = 'sym-pen';
  else if (/شعلة|نار|أمل/.test(rawSym)) symId = 'sym-flame';
  else if (/صقر|نسر/.test(rawSym)) symId = 'sym-falcon';
  else if (/شمس/.test(rawSym)) symId = 'sym-sun';
  else if (/نخل/.test(rawSym)) symId = 'sym-palm';
  else if (/ميزان|عدل/.test(rawSym)) symId = 'sym-scale';
  const symLabel = rawSym.replace(/^رمز\s*:?\s*/, '').trim();
  return {
    role,
    symbolText: symLabel || 'القلم',
    symbolSvg: `<svg class="sym-ic" width="15" height="15" aria-hidden="true"><use href="#${symId}"/></svg>`,
  };
}

function candidateSvg(c = {}, idx = 0) {
  if (c && c.photo_url) return c.photo_url;
  const sortNum = Number.isFinite(Number(c && c.sort)) ? Number(c.sort) : (idx + 1);
  return `/candidates/c${((sortNum - 1) % 4) + 1}.jpg`;
}

function symbolIcon(sym = '', idx = 0) {
  const { symbolSvg } = parseSlogan(sym, idx);
  return symbolSvg;
}

function stepper(active = 1) {
  const steps = [
    { n: '01', label: 'بيانات الناخب', sub: 'الرقم القومي والمحافظة', tag: 'STEP / 01' },
    { n: '02', label: 'مطابقة الوجه', sub: 'بصمة الكاميرا الحية', tag: 'STEP / 02' },
    { n: '03', label: 'ورقة الاقتراع', sub: 'تصويت سري معزول', tag: 'STEP / 03' },
    { n: '04', label: 'إيصال التوثيق', sub: 'كود تحقق رقمي فوري', tag: 'STEP / 04' },
  ];
  return `
  <ol class="stepper" aria-label="مراحل التصويت">
    ${steps.map((s, i) => {
      const idx = i + 1;
      const cls = idx < active ? 'step done' : idx === active ? 'step active' : 'step';
      return `<li class="${cls}" ${idx === active ? 'aria-current="step"' : ''}>
        <span class="step-dot">${idx < active ? icon('check', 16) : s.n}</span>
        <div class="step-copy">
          <b class="step-label">${s.label}</b>
          <span class="step-sub">${s.sub}</span>
        </div>
        <small class="step-tag">${s.tag}</small>
      </li>`;
    }).join('')}
  </ol>`;
}

function layout({ title, body, step = 0, active = 0, showStepper = false, wide = false, nav = '' }) {
  const pageTitle = title ? `${esc(title)} — صوت موثّق | مختبر الاقتراع البيومتري السري` : 'صوت موثّق | من هويتك .. إلى صوتك';
  const stepNum = step || (showStepper ? active : 0);
  const bodyHasStepper = typeof body === 'string' && body.includes('class="stepper"');
  return `<!doctype html>
<html lang="ar" dir="rtl" class="scrollbar-thin scrollbar-stable">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#f7f4ea">
  <title>${pageTitle}</title>
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
</head>
<body class="antialiased">
  ${SPRITE}
  <a class="skip-link" href="#main-content">تخطَّ إلى المحتوى الرئيسي</a>
  <aside class="poc-top-strip" role="note" aria-label="سياق النموذج التجريبي">
    <div class="poc-inner">
      <span class="poc-badge">PROTOTYPE // POC</span>
      <b>مختبر ونموذج محاكاة تجريبي متقدم للاقتراع البيومتري السري</b>
      <span class="poc-ctx">انتخابات اتحاد طلاب المدارس — محاكاة 2026/2027</span>
      <a href="/presentation" class="poc-link">عرض التحكيم والتفاصيل التقنية ←</a>
    </div>
  </aside>
  <main class="paper-page" id="top">
    <div class="page-shell ${wide ? 'wide' : ''}">
      <header class="site-header">
        <a class="sketch-logo" href="/" aria-label="صوت موثّق — الصفحة الرئيسية">
          <b>صـ</b>
          <span>
            <strong>صوت موثّق</strong>
            <small>BIOMETRIC BALLOT LAB // POC</small>
          </span>
        </a>
        <nav class="site-nav" aria-label="التنقل الرئيسي">
          <a href="/#scanner" ${nav === 'home' ? 'aria-current="page"' : ''}>بوابة التحقق</a>
          <a href="/#candidates" ${nav === 'candidates' ? 'aria-current="page"' : ''}>المرشحون</a>
          <a href="/results" ${nav === 'results' ? 'aria-current="page"' : ''}>النتائج</a>
          <a href="/verify-receipt" ${nav === 'verify-receipt' ? 'aria-current="page"' : ''}>فحص إيصال</a>
          <a href="/presentation" ${nav === 'presentation' ? 'aria-current="page"' : ''}>العرض التقديمي</a>
          <a href="/admin" ${nav === 'admin' ? 'aria-current="page"' : ''}>الإشراف</a>
        </nav>
        <div class="header-actions">
          <a class="sketch-button header-button" href="/register">ابدأ التصويت الآن</a>
          <button type="button" class="sketch-button nav-burger" data-nav-toggle aria-expanded="false" aria-controls="mobile-nav" aria-label="فتح القائمة">
            ${icon('menu', 20)}
          </button>
        </div>
      </header>

      <div class="mobile-nav" id="mobile-nav" hidden>
        <nav aria-label="قائمة الجوال">
          <a href="/#scanner">بوابة التحقق والتصويت</a>
          <a href="/#candidates">المرشحون والبرامج</a>
          <a href="/results">النتائج المباشرة</a>
          <a href="/verify-receipt">فحص إيصال التصويت</a>
          <a href="/cards-demo">بطاقات التجربة الجاهزة</a>
          <a href="/presentation">العرض التقديمي للمشروع</a>
          <a href="/admin">لوحة لجنة الإشراف</a>
          <a class="sketch-button header-button mobile-cta" href="/register">ابدأ التصويت الآن</a>
        </nav>
      </div>

      <div id="main-content">
        ${stepNum && !bodyHasStepper ? stepper(stepNum) : ''}
        ${body}
      </div>

      <footer>
        <p>صوت موثّق — مختبر ونموذج محاكاة تجريبي متقدم للاقتراع البيومتري السري. جميع الأصوات معزولة تمامًا عن الهوية ومحمية بتوقيع رقمي تشفيري (Zero-Link Architecture).</p>
        <b>SOOT // STUDENT UNION PROTOTYPE // EGYPT 2026-2027</b>
      </footer>
    </div>
  </main>
  <script src="/vendor/face-api.min.js" defer></script>
  <script src="/app.js" defer></script>
</body>
</html>`;
}

module.exports = { layout, shell: layout, icon, esc, stepper, candidateSvg, symbolIcon, parseSlogan };
