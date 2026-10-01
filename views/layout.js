'use strict';
/**
 * القالب العام — تصميم كاشف (Kashif Paper Dossier & Sketch Neo-Brutalist Style)
 */

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function shell({ title, body, activeStep = 0, active = 0, showStepper = false, bodyClass = '', wide = false }) {
  const curStep = activeStep || active || 0;
  const steps = [
    { n: '01', label: 'بيانات البطاقة', tag: 'ID CHECK' },
    { n: '02', label: 'كاميرا الوجه', tag: 'FACE AI' },
    { n: '03', label: 'ورقة الاقتراع', tag: 'BALLOT' },
    { n: '04', label: 'إيصال التصويت', tag: 'RECEIPT' },
  ];
  const stepper = showStepper ? `
    <ol class="stepper" aria-label="مراحل التصويت الإلكتروني">
      ${steps.map((s, idx) => {
        const i = idx + 1;
        const st = i < curStep ? 'done' : i === curStep ? 'active' : 'todo';
        return `<li class="step ${st}">
          <span class="step-dot">${i < curStep ? '✓' : s.n}</span>
          <div class="step-copy">
            <span class="step-label">${s.label}</span>
            <small>${s.tag}</small>
          </div>
        </li>`;
      }).join('')}
    </ol>` : '';

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${esc(title ? `${title} — صوت موثّق` : 'صوت موثّق — صوّت بأمان وتأكد إن صوتك وصل')}</title>
  <meta name="description" content="منصة التصويت الإلكتروني الموثّق ببطاقة الرقم القومي ومطابقة الوجه الحية 128-D."/>
  <meta name="theme-color" content="#f7f4ea"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@600;700&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="/styles.css?v=13"/>
</head>
<body class="antialiased ${esc(bodyClass)}">
  <svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">
    <symbol id="ic-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
      <path d="m9 12 2 2 4-4"/>
    </symbol>
    <symbol id="ic-id" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <circle cx="8" cy="11" r="2.3"/>
      <path d="M5 16.5c.8-1.8 2.2-2.5 3-2.5s2.2.7 3 2.5"/>
      <line x1="13.5" y1="9.5" x2="19" y2="9.5"/>
      <line x1="13.5" y1="13" x2="19" y2="13"/>
    </symbol>
    <symbol id="ic-face" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
      <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
      <circle cx="12" cy="12" r="3"/><path d="m16 16-1.9-1.9"/>
    </symbol>
    <symbol id="ic-ballot" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m9 11 3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </symbol>
    <symbol id="ic-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2"/>
      <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
    </symbol>
    <symbol id="ic-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </symbol>
    <symbol id="ic-warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>
      <path d="M12 9v4"/><path d="M12 17h.01"/>
    </symbol>
    <symbol id="ic-chart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      <path d="M3 20h18"/>
    </symbol>
    <symbol id="ic-camera" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
      <circle cx="12" cy="13" r="3.2"/>
    </symbol>
    <symbol id="sym-scale" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3v18"/><path d="M5 7h14"/><path d="M8 21h8"/>
      <path d="M5 7 2 14h6L5 7Z"/><path d="m19 7-3 7h6l-3-7Z"/>
    </symbol>
    <symbol id="sym-falcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3 8 8l-6 2 5 4-2 7 7-4 7 4-2-7 5-4-6-2-4-5Z"/>
    </symbol>
    <symbol id="sym-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/>
      <path d="m4.9 4.9 2.1 2.1"/><path d="m17 17 2.1 2.1"/><path d="m19.1 4.9-2.1 2.1"/><path d="m7 17-2.1 2.1"/>
    </symbol>
    <symbol id="sym-palm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22V9"/>
      <path d="M12 9C9 5 4 6 3 9c3 0 6 1 9 0Z"/>
      <path d="M12 9c3-4 8-3 9 0-3 0-6 1-9 0Z"/>
      <path d="M12 9c-4-3-7 0-7 3 3-1 5-1 7-3Z"/>
      <path d="M12 9c4-3 7 0 7 3-3-1-5-1-7-3Z"/>
      <path d="M8 22h8"/>
    </symbol>
  </svg>

  <main class="paper-page" dir="rtl">
    <div class="page-shell ${wide ? 'wide-shell' : ''}">
      <header class="site-header">
        <a class="sketch-logo" href="/" aria-label="صوت موثّق - الرئيسية">
          <b>SM</b>
          <span>
            <strong>صوت موثّق!</strong>
            <small>BY ALI AHMED • ELECTION LAB</small>
          </span>
        </a>
        <nav class="site-nav" aria-label="التنقل الرئيسي">
          <a href="/">الرئيسية</a>
          <a href="/#candidates-section">المرشحون</a>
          <a href="/results">نتائج الفرز</a>
          <a href="/verify-receipt">فحص إيصال</a>
        </nav>
        <a class="sketch-button header-button" href="/register">ابدأ التصويت ←</a>
      </header>

      ${stepper}
      ${body}

      <footer id="safety">
        <b>SOOT MAWATHAQ // BIOMETRIC VOTING</b>
        <span>صوت موثّق منظومة اقتراع إلكتروني محمية بمطابقة البطاقة القومية وبصمة الوجه 128-D مع فصل كامل لسرية الصوت في الصندوق.</span>
      </footer>
    </div>
  </main>

  <script src="/app.js?v=13" defer></script>
</body>
</html>`;
}

function icon(name, size = 20) {
  return `<svg class="ic" width="${size}" height="${size}" aria-hidden="true"><use href="#ic-${name}"/></svg>`;
}

function stateBadge(state) {
  const map = {
    open: { label: 'OPEN // مفتوح للتصويت', cls: 'state-open' },
    upcoming: { label: 'UPCOMING // قريبًا', cls: 'state-upcoming' },
    closed: { label: 'CLOSED // مغلق', cls: 'state-closed' },
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
