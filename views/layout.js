'use strict';
/**
 * القالب العام — الهوية الرسمية للهيئة الوطنية للانتخابات (صوت موثّق)
 */

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function shell({ title, body, activeStep = 0, showStepper = false, bodyClass = '', wide = false }) {
  const steps = [
    { n: '١', label: 'بيانات بطاقة الرقم القومي' },
    { n: '٢', label: 'مطابقة صورة الوجه بالكاميرا' },
    { n: '٣', label: 'التأشير في ورقة الاقتراع' },
    { n: '٤', label: 'إيصال إثبات التصويت' },
  ];
  const stepper = showStepper ? `
    <ol class="stepper" aria-label="مراحل التصويت الإلكتروني">
      ${steps.map((s, idx) => {
        const i = idx + 1;
        const st = i < activeStep ? 'done' : i === activeStep ? 'active' : 'todo';
        return `<li class="step ${st}">
          <span class="step-dot">${i < activeStep ? '✓' : s.n}</span>
          <span class="step-label">${s.label}</span>
        </li>`;
      }).join('')}
    </ol>` : '';

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title ? `${title} — صوت موثّق` : 'صوت موثّق — الهيئة الوطنية للانتخابات')}</title>
  <meta name="description" content="البوابة الرسمية للاقتراع الإلكتروني الموثّق ببطاقة الرقم القومي ومطابقة الوجه.">
  <meta name="theme-color" content="#0A192F">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@500;600;700;800;900&family=Tajawal:wght@400;500;700;800&family=IBM+Plex+Mono:wght@500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css?v=11">
</head>
<body class="${esc(bodyClass)}">
  <svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">
    <symbol id="ic-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="m9 12 2 2 4-4"/>
    </symbol>
    <symbol id="ic-id" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <circle cx="8" cy="11" r="2.3"/>
      <path d="M5 16.5c.8-1.8 2.2-2.5 3-2.5s2.2.7 3 2.5"/>
      <line x1="13.5" y1="9.5" x2="19" y2="9.5"/>
      <line x1="13.5" y1="13" x2="19" y2="13"/>
    </symbol>
    <symbol id="ic-face" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 8V6a2 2 0 0 1 2-2h2"/><path d="M4 16v2a2 2 0 0 0 2 2h2"/>
      <path d="M16 4h2a2 2 0 0 1 2 2v2"/><path d="M16 20h2a2 2 0 0 0 2-2v-2"/>
      <circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/>
      <path d="M9.5 15a3.5 3.5 0 0 0 5 0"/>
    </symbol>
    <symbol id="ic-ballot" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="m9 11 3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </symbol>
    <symbol id="ic-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2"/>
      <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
    </symbol>
    <symbol id="ic-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </symbol>
    <symbol id="ic-warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </symbol>
    <symbol id="ic-chart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      <path d="M3 20h18"/>
    </symbol>
    <symbol id="ic-camera" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
      <circle cx="12" cy="13" r="3.2"/>
    </symbol>
    <symbol id="sym-scale" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3v18"/><path d="M5 7h14"/><path d="M8 21h8"/>
      <path d="M5 7 2 14h6L5 7Z"/><path d="m19 7-3 7h6l-3-7Z"/>
    </symbol>
    <symbol id="sym-falcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3 8 8l-6 2 5 4-2 7 7-4 7 4-2-7 5-4-6-2-4-5Z"/>
    </symbol>
    <symbol id="sym-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/>
      <path d="m4.9 4.9 2.1 2.1"/><path d="m17 17 2.1 2.1"/><path d="m19.1 4.9-2.1 2.1"/><path d="m7 17-2.1 2.1"/>
    </symbol>
    <symbol id="sym-palm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22V9"/>
      <path d="M12 9C9 5 4 6 3 9c3 0 6 1 9 0Z"/>
      <path d="M12 9c3-4 8-3 9 0-3 0-6 1-9 0Z"/>
      <path d="M12 9c-4-3-7 0-7 3 3-1 5-1 7-3Z"/>
      <path d="M12 9c4-3 7 0 7 3-3-1-5-1-7-3Z"/>
      <path d="M8 22h8"/>
    </symbol>
  </svg>

  <!-- الشريط السيادي العلوي -->
  <div class="sovereign-bar">
    <div class="sovereign-inner">
      <div class="sov-right">
        <span class="eg-flag" aria-hidden="true"><i></i><i></i><i></i></span>
        <span>جمهورية مصر العربية — الهيئة الوطنية للانتخابات</span>
      </div>
      <div class="sov-left">
        <span>البوابة الرسمية للاقتراع الإلكتروني الموثّق</span>
        <span class="sov-sep">|</span>
        <span>الدورة الانتخابية ٢٠٢٦ / ٢٠٣٠</span>
      </div>
    </div>
  </div>

  <!-- الهيدر الرسمي -->
  <header class="site-head">
    <div class="head-inner">
      <a class="brand" href="/">
        <span class="brand-emblem" aria-hidden="true">
          <svg width="26" height="26"><use href="#ic-shield"/></svg>
        </span>
        <span class="brand-text">
          <b>صوت موثّق</b>
          <small>الهيئة الوطنية للانتخابات — بوابة التصويت الإلكتروني</small>
        </span>
      </a>
      <nav class="site-nav" aria-label="التنقل الرئيسي">
        <a href="/">الرئيسية</a>
        <a href="/#candidates-section">قائمة المرشحين</a>
        <a href="/results">نتائج الفرز</a>
        <a href="/verify-receipt">الاستعلام عن إيصال</a>
        <a class="nav-cta" href="/register">الدخول للتصويت</a>
      </nav>
    </div>
  </header>

  <main class="wrap ${wide ? 'wide' : ''}">
    ${stepper}
    ${body}
  </main>

  <footer class="site-foot">
    <div class="foot-inner">
      <div class="foot-col">
        <div class="foot-brand-row">
          <span class="eg-flag" aria-hidden="true"><i></i><i></i><i></i></span>
          <b>الهيئة الوطنية للانتخابات — بوابة «صوت موثّق»</b>
        </div>
        <p>المنظومة الرسمية للاقتراع الإلكتروني الموثّق ببطاقة الرقم القومي السارية ومطابقة الصورة الشخصية عبر الكاميرا المباشرة مع الفصل الكامل بين بيانات الناخب وورقة الاقتراع.</p>
      </div>
      <div class="foot-col">
        <b>أقسام البوابة</b>
        <ul class="foot-links">
          <li><a href="/">الصفحة الرئيسية والمرشحون</a></li>
          <li><a href="/register">تسجيل الناخب وبدء التصويت</a></li>
          <li><a href="/results">البيان العام لنتائج الفرز</a></li>
          <li><a href="/verify-receipt">فحص إيصال التصويت</a></li>
        </ul>
      </div>
      <div class="foot-col">
        <b>الضمانات الدستورية والقانونية</b>
        <p>يُشترط قيد الناخب في قاعدة بيانات بطاقات الرقم القومي السارية، ومطابقة صورة الوجه الحيّة مع صورة البطاقة المحفوظة، ولا يُسمح بالتصويت أكثر من مرة واحدة لكل رقم قومي.</p>
      </div>
    </div>
    <div class="foot-bottom">
      <span>جميع الحقوق محفوظة © ٢٠٢٦ — الهيئة الوطنية للانتخابات · جمهورية مصر العربية</span>
      <span>الانتخابات العامة لرئاسة المجلس الوطني ٢٠٢٦</span>
    </div>
  </footer>

  <script src="/app.js?v=11" defer></script>
</body>
</html>`;
}

function icon(name, size = 20) {
  return `<svg class="ic" width="${size}" height="${size}" aria-hidden="true"><use href="#ic-${name}"/></svg>`;
}

function stateBadge(state) {
  const map = {
    open: { label: 'باب الاقتراع مفتوح الآن', cls: 'state-open' },
    upcoming: { label: 'لم يبدأ بعد', cls: 'state-upcoming' },
    closed: { label: 'أُغلق باب الاقتراع', cls: 'state-closed' },
  };
  const s = map[state] || map.open;
  return `<span class="status-badge ${s.cls}"><span class="status-dot"></span>${s.label}</span>`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return iso; }
}

module.exports = { esc, shell, icon, stateBadge, fmtDate };
