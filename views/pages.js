'use strict';
/**
 * صفحات الناخبين — تصميم كاشف (Kashif Paper Dossier & Sketch Neo-Brutalist Style)
 */
const { esc, icon, stateBadge, fmtDate } = require('./layout');

const CANDIDATE_SYMBOLS = [
  { id: 'sym-scale', label: 'رمز الميزان', code: 'CAND / 01' },
  { id: 'sym-falcon', label: 'رمز الصقر', code: 'CAND / 02' },
  { id: 'sym-sun', label: 'رمز الشمس', code: 'CAND / 03' },
  { id: 'sym-palm', label: 'رمز النخلة', code: 'CAND / 04' },
];

function cleanSloganText(str = '') {
  return String(str || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSlogan(slogan = '', idx = 0) {
  const cleaned = cleanSloganText(slogan);
  const parts = cleaned.split('·').map((s) => s.trim()).filter(Boolean);
  const role = parts[0] || cleaned || 'مرشح رئاسي';
  const sym = CANDIDATE_SYMBOLS[idx % CANDIDATE_SYMBOLS.length];
  let symbolText = sym.label;
  if (parts[1]) {
    const rawSym = parts[1].replace(/^رمز\s*:?\s*/, '').trim();
    if (rawSym) symbolText = `رمز ${rawSym}`;
  }
  const symbolSvg = `<svg class="sym-ic" width="16" height="16" aria-hidden="true"><use href="#${sym.id}"/></svg>`;
  return { role, symbolText, symbolSvg, symId: sym.id, code: sym.code };
}

function toArNum(n) {
  return String(n ?? 0).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
}

/* ------------------------------------------------------------------ ١) الرئيسية */
function landing({ elections = [], counts = {}, cards = [] }) {
  const activeElection = elections.find((e) => e.state === 'open') || elections[0] || {
    id: 1,
    title: 'الانتخابات العامة لرئاسة المجلس الوطني ٢٠٢٦',
    description: 'الاقتراع الإلكتروني الموثّق ببطاقة الرقم القومي وبصمة الوجه لاختيار رئيس المجلس الوطني للدورة ٢٠٢٦ - ٢٠٣٠.',
    state: 'open',
    ends_at: '2026-10-30T20:00:00Z',
    candidates: [],
    total_ballots: 0,
  };

  const cands = activeElection.candidates || [];
  const totalVotes = activeElection.total_ballots || counts.ballots || 0;

  const usableCards = cards.length ? cards : [{
    full_name: 'علي أحمد علي محمد',
    national_id_plain: '31005292501518',
    birth_date: '2010-05-29',
    governorate: 'أسيوط',
    address: 'ش الجمهورية — قسم أول أسيوط',
    card_image: '/cards/31005292501518.jpg',
  }];
  const firstCard = usableCards[0];

  const quickCardChips = usableCards.map((c, idx) => `
    <button class="sketch-button small-sketch-btn ${idx === 0 ? 'active-chip' : ''} btn-fill-card" type="button"
      data-name="${esc(c.full_name)}"
      data-nid="${esc(c.national_id_plain)}"
      data-dob="${esc(c.birth_date)}"
      data-gov="${esc(c.governorate)}"
      data-img="${esc(c.card_image || '/cards/31005292501518.jpg')}"
      data-address="${esc(c.address || 'ش الجمهورية — قسم أول أسيوط')}">
      ${esc(c.full_name.split(' ').slice(0, 3).join(' '))}
    </button>`).join('');

  const miniCandRows = cands.map((c, idx) => {
    const { role, symbolText, symbolSvg } = parseSlogan(c.slogan, idx);
    const photo = c.photo_url || `/candidates/c${(idx % 4) + 1}.jpg`;
    return `
      <a class="terminal-cand-row" href="/register?e=${esc(activeElection.id)}">
        <span class="tcr-num">0${idx + 1}</span>
        <img src="${esc(photo)}" alt="${esc(c.name)}" class="tcr-avatar"/>
        <div class="tcr-info">
          <b>${esc(c.name)}</b>
          <small>${esc(role)}</small>
        </div>
        <span class="tcr-sym">${symbolSvg} ${esc(symbolText)}</span>
      </a>`;
  }).join('');

  const candidateCards = cands.map((c, idx) => {
    const { role, symbolText, symbolSvg, code } = parseSlogan(c.slogan, idx);
    const photo = c.photo_url || `/candidates/c${(idx % 4) + 1}.jpg`;
    const numAr = toArNum(idx + 1);
    return `
      <article class="cand-dossier-card">
        <div class="cdc-file-tab">${code}</div>
        <div class="cdc-top-bar">
          <span class="cdc-num">المرشح رقم (${numAr})</span>
          <span class="cdc-symbol">${symbolSvg} <b>${esc(symbolText)}</b></span>
        </div>
        <div class="cdc-profile">
          <div class="cdc-photo-frame">
            <img src="${esc(photo)}" alt="${esc(c.name)}" loading="lazy"/>
          </div>
          <div class="cdc-title-block">
            <h3>${esc(c.name)}</h3>
            <span class="cdc-role">${esc(role)}</span>
          </div>
        </div>
        <p class="cdc-program">${esc(c.program || '')}</p>
        <div class="cdc-votes-box">
          <div class="cdc-votes-meta">
            <span>الأصوات بالصندوق</span>
            <b>${c.votes || 0} صوت (${c.percent || 0}%)</b>
          </div>
          <div class="score-track safe"><span style="width:${Math.max(4, c.percent || 0)}%"></span></div>
        </div>
        <a class="sketch-button scan-button" href="/register?e=${esc(activeElection.id)}">
          ${icon('ballot', 19)} صوّت لهذا المرشح الآن
        </a>
      </article>`;
  }).join('');

  return `
<section class="hero" id="top">
  <div class="hero-copy">
    <div class="case-kicker">
      <span>CASE FILE</span>
      <b>#EG-2026</b>
      <i>OPEN</i>
    </div>
    <h1>كل صوت<br/>ليه <span>أثر.</span></h1>
    <p>وأنا بنيت <b>صوت موثّق</b> علشان يدور وراه ويحميه. سجّل ببطاقتك القومية، طابق وشك بالكاميرا المباشرة 128-D، وخد إيصال اقتراع مشفّر قبل ما تقفل الصفحة.</p>
    <div class="hero-action-row">
      <a class="sketch-button primary-button" href="#scanner">ابدأ التحقق والتصويت</a>
      <span class="hand-arrow" aria-hidden="true">←</span>
    </div>
    <div class="investigator-signature">
      <div class="signature-mark">Ali Ahmed<span></span></div>
      <div>
        <b>بُني وجُرّب بواسطة علي أحمد</b>
        <small>ENGINEER • CREATOR • SYSTEM BUILDER</small>
      </div>
    </div>
    <div class="trust-note">
      <span class="mini-shield">${icon('shield', 17)}</span>
      <span><b>بروتوكول آمن:</b> عزل كامل للهوية عن الصوت — مطابقة الوجه 128-D بتتم في جلسة معزولة</span>
    </div>
  </div>

  <section class="scanner-frame" id="scanner" aria-label="أداة التحقق والاقتراع">
    <div class="file-tab">EVIDENCE / 01</div>
    <div class="case-spine" aria-hidden="true">ALI AHMED — DIGITAL BALLOT LAB</div>
    <div class="blueprint-marks" aria-hidden="true"><span>+</span><span>&lt;/&gt;</span><span>⌁</span></div>
    <span class="corner-mark corner-one"></span>
    <span class="corner-mark corner-two"></span>

    <div class="scanner-topline">
      <div><span class="status-dot"></span> غرفة الفحص والاقتراع جاهزة</div>
      <span>SOOT // EVIDENCE TERMINAL v2.6</span>
    </div>

    <div class="mode-tabs" role="tablist" aria-label="وضع المحطة" id="hero-mode-tabs">
      <button class="active" type="button" role="tab" aria-selected="true" data-home-tab="idcard">
        ${icon('id', 17)} بطاقة الهوية
      </button>
      <button type="button" role="tab" aria-selected="false" data-home-tab="candidates">
        ${icon('ballot', 17)} المرشحون (${cands.length})
      </button>
      <button type="button" role="tab" aria-selected="false" data-home-tab="receipt">
        ${icon('check', 17)} فحص إيصال
      </button>
    </div>

    <!-- تبويب ١: التسجيل السريع ودخول الكاميرا مباشرة -->
    <div class="home-tab-panel active" data-home-panel="idcard">
      <form id="register-form" class="input-stage" novalidate>
        <input type="hidden" name="election_id" value="${esc(activeElection.id)}"/>
        <label for="full_name"><span>الدليل A</span> اختر بطاقة مسجّلة للتجربة الفورية أو اكتب بياناتك</label>
        <div class="row" style="margin-bottom:10px;gap:6px">
          ${quickCardChips}
        </div>
        <div class="field" style="margin-bottom:10px">
          <input id="full_name" name="full_name" type="text" required value="${esc(firstCard.full_name)}" placeholder="الاسم الرباعي كما في البطاقة"/>
        </div>
        <div class="grid-2" style="gap:10px">
          <div class="field" style="margin-bottom:10px">
            <input id="national_id" name="national_id" type="text" inputmode="numeric" maxlength="14" class="mono" required value="${esc(firstCard.national_id_plain)}" placeholder="الرقم القومي (14 رقم)"/>
          </div>
          <div class="field" style="margin-bottom:10px">
            <input id="birth_date" name="birth_date" type="date" required value="${esc(firstCard.birth_date)}"/>
          </div>
        </div>
        <div class="grid-2" style="gap:10px">
          <div class="field" style="margin-bottom:10px">
            <input id="governorate" name="governorate" type="text" required value="${esc(firstCard.governorate)}" placeholder="المحافظة"/>
          </div>
          <div class="field" style="margin-bottom:10px">
            <input id="phone" name="phone" type="tel" inputmode="tel" class="mono" required value="01012345678" placeholder="01012345678"/>
          </div>
        </div>
        <div class="nid-preview" id="nid-preview" hidden>
          <span class="partial-badge">النوع: <b id="np-gender">ذكر</b></span>
          <span class="partial-badge">الميلاد: <b id="np-dob">${esc(firstCard.birth_date)}</b></span>
          <span class="partial-badge">المحافظة: <b id="np-gov">${esc(firstCard.governorate)}</b></span>
        </div>
        <label class="consent-row">
          <input type="checkbox" name="consent" id="consent" required checked/>
          <span>
            <b>أقرّ بصحة بيانات الرقم القومي المدخلة</b>
            <small>وأوافق على مطابقة الوجه بالكاميرا مع البطاقة المحفوظة في قاعدة البيانات.</small>
          </span>
        </label>
        <div class="error-note" id="form-error" role="alert" hidden></div>
        <button class="sketch-button scan-button" type="submit">
          ${icon('face', 20)} شغّل كاميرا التحقق الآن
        </button>
      </form>
    </div>

    <!-- تبويب ٢: قائمة المرشحين داخل التيرمينال -->
    <div class="home-tab-panel" data-home-panel="candidates" hidden>
      <div class="input-stage">
        <label><span>القائمة B</span> ${esc(activeElection.title)}</label>
        <div class="terminal-cand-list">
          ${miniCandRows}
        </div>
        <a class="sketch-button scan-button" href="/register?e=${esc(activeElection.id)}">
          ${icon('face', 20)} ابدأ التحقق والتصويت الآن
        </a>
      </div>
    </div>

    <!-- تبويب ٣: فحص إيصال -->
    <div class="home-tab-panel" data-home-panel="receipt" hidden>
      <form method="get" action="/verify-receipt" class="input-stage">
        <label for="home-receipt-code"><span>الدليل C</span> الصق كود الإيصال للتحقق من وجود صوتك في الصندوق</label>
        <div class="field">
          <input id="home-receipt-code" name="code" class="mono" required placeholder="مثال: A7K9Q-3M8Z2" style="text-align:center;font-size:18px"/>
        </div>
        <button class="sketch-button scan-button" type="submit">
          ${icon('check', 20)} افحص الإيصال الآن
        </button>
      </form>
    </div>

    <span class="red-sticker">
      <b>فحص</b>
      ${icon('warn', 25)}
    </span>
  </section>
</section>

<section class="steps-row" id="how">
  <article>
    <span>01</span>
    <div>
      <b>جمع الدليل</b>
      <p>الرقم القومي والبطاقة المسجّلة بالسجل</p>
    </div>
    <small>INPUT</small>
  </article>
  <article>
    <span>02</span>
    <div>
      <b>محرك القواعد &amp; الـAI</b>
      <p>مطابقة وجه حية 128-D وشرح بالمصري</p>
    </div>
    <small>PROCESS</small>
  </article>
  <article>
    <span>03</span>
    <div>
      <b>إيصال القضية</b>
      <p>صوت سري مشفّر وإيصال واضح</p>
    </div>
    <small>VERDICT</small>
  </article>
</section>

<section class="section" id="candidates-section">
  <div class="dossier-section-head">
    <div>
      <div class="case-kicker"><span>CANDIDATES</span><b>#LIST-04</b><i>OFFICIAL</i></div>
      <h2>المرشحون والبرامج الانتخابية (${totalVotes} صوت)</h2>
    </div>
    <a class="sketch-button secondary-button" href="/results?e=${esc(activeElection.id)}">عرض جدول الفرز الكامل ←</a>
  </div>
  <div class="candidates-dossier-grid">
    ${candidateCards}
  </div>
</section>`;
}

/* ------------------------------------------------------------------ ٢) التسجيل */
function registerPage({ election, cards = [] }) {
  const governorates = [
    'أسيوط', 'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'الشرقية', 'القليوبية',
    'كفر الشيخ', 'الغربية', 'المنوفية', 'البحيرة', 'الإسماعيلية', 'بورسعيد', 'السويس',
    'دمياط', 'بني سويف', 'الفيوم', 'المنيا', 'سوهاج', 'قنا', 'الأقصر', 'أسوان',
    'البحر الأحمر', 'الوادي الجديد', 'مطروح', 'شمال سيناء', 'جنوب سيناء',
  ];

  const usableCards = cards.length ? cards : [{
    full_name: 'علي أحمد علي محمد',
    national_id_plain: '31005292501518',
    birth_date: '2010-05-29',
    governorate: 'أسيوط',
    address: 'ش الجمهورية — قسم أول أسيوط',
    card_image: '/cards/31005292501518.jpg',
  }];

  const firstCard = usableCards[0];

  const quickFillButtons = usableCards.map((c, idx) => `
    <button class="sketch-button small-sketch-btn ${idx === 0 ? 'active-chip' : ''} btn-fill-card" type="button"
      data-name="${esc(c.full_name)}"
      data-nid="${esc(c.national_id_plain)}"
      data-dob="${esc(c.birth_date)}"
      data-gov="${esc(c.governorate)}"
      data-img="${esc(c.card_image || '/cards/31005292501518.jpg')}"
      data-address="${esc(c.address || 'ش الجمهورية — قسم أول أسيوط')}"
      data-phone="01012345678">
      ${esc(c.full_name)} (${esc(c.national_id_plain)})
    </button>`).join('');

  return `
<div class="register-layout">
  <section class="scanner-frame" style="min-height:auto;transform:none">
    <div class="file-tab">STEP 01 // REGISTER</div>
    <div class="case-spine" aria-hidden="true">VOTER ROLL — NATIONAL ID MATCH</div>
    <span class="corner-mark corner-one"></span>
    <span class="corner-mark corner-two"></span>

    <div class="scanner-topline">
      <div><span class="status-dot"></span> مطابقة السجل المدني جاهزة</div>
      <span>SOOT // ID VERIFICATION v2.6</span>
    </div>

    <form id="register-form" novalidate>
      <input type="hidden" name="election_id" value="${esc(election?.id || 1)}"/>

      <div class="intel-panel" style="margin-top:0;margin-bottom:18px">
        <div class="intel-title">
          <span>STORED ID CARDS // بطاقات جاهزة للتجربة</span>
          <b>اضغط على أي بطاقة لملء بياناتها فورًا</b>
        </div>
        <div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap">
          ${quickFillButtons}
        </div>
      </div>

      <div class="field">
        <label for="full_name"><span>الدليل A</span> الاسم الرباعي (كما هو مدوّن في البطاقة)</label>
        <input id="full_name" name="full_name" type="text" required autocomplete="name"
               value="${esc(firstCard.full_name)}" placeholder="مثال: علي أحمد علي محمد"/>
      </div>

      <div class="grid-2">
        <div class="field">
          <label for="national_id"><span>الدليل B</span> الرقم القومي (14 رقم)</label>
          <input id="national_id" name="national_id" type="text" inputmode="numeric" maxlength="14"
                 class="mono" required value="${esc(firstCard.national_id_plain)}" placeholder="31005292501518"/>
          <small class="hint" id="nid-hint">يُستخرج منه تاريخ الميلاد والمحافظة تلقائيًا</small>
        </div>

        <div class="field">
          <label for="birth_date"><span>الدليل C</span> تاريخ الميلاد</label>
          <input id="birth_date" name="birth_date" type="date" required value="${esc(firstCard.birth_date)}"/>
        </div>
      </div>

      <div class="grid-2">
        <div class="field">
          <label for="governorate"><span>الدليل D</span> المحافظة</label>
          <select id="governorate" name="governorate" required>
            <option value="">اختر المحافظة</option>
            ${governorates.map((g) => `<option value="${g}" ${g === firstCard.governorate ? 'selected' : ''}>${g}</option>`).join('')}
          </select>
        </div>

        <div class="field">
          <label for="phone"><span>الدليل E</span> رقم الموبايل</label>
          <input id="phone" name="phone" type="tel" inputmode="tel" class="mono"
                 required value="01012345678" placeholder="01012345678"/>
        </div>
      </div>

      <div class="nid-preview" id="nid-preview" aria-live="polite" hidden>
        <span class="partial-badge">النوع: <b id="np-gender">—</b></span>
        <span class="partial-badge">الميلاد: <b id="np-dob">—</b></span>
        <span class="partial-badge">المحافظة: <b id="np-gov">—</b></span>
      </div>

      <label class="consent-row" style="margin-bottom:14px!important">
        <input type="checkbox" name="consent" id="consent" required checked/>
        <span>
          <b>أقرّ بصحة بيانات الرقم القومي المدخلة</b>
          <small>وأوافق على مطابقة صورة الوجه بالكاميرا مع البطاقة المسجّلة في قاعدة البيانات للتحقق من الهوية فقط.</small>
        </span>
      </label>

      <div class="error-note" id="form-error" role="alert" hidden></div>

      <button class="sketch-button scan-button" type="submit" id="submit-btn">
        ${icon('camera', 20)} متابعة إلى كاميرا مطابقة الوجه ←
      </button>
    </form>
  </section>

  <aside class="register-side-card">
    <div class="case-kicker" style="margin-bottom:10px"><span>DB RECORD</span><b>#ID-CARD</b><i>VERIFIED</i></div>
    <h3>البطاقة المرجعية بالسجل</h3>
    <p class="muted small">يستدعي النظام بطاقتك المسجّلة في قاعدة البيانات لمطابقة ملامح الوجه بها في الخطوة التالية بدون الحاجة لرفع البطاقة:</p>
    <div class="mini-id-preview">
      <img id="register-card-preview-img" src="${esc(usableCards[0]?.card_image || '/cards/31005292501518.jpg')}" alt="بطاقة الرقم القومي"/>
    </div>
    <div class="signal-list">
      <div>${icon('check', 16)} <span>لا يُطلب منك تصوير أو رفع البطاقة الورقية.</span></div>
      <div>${icon('check', 16)} <span>الانتقال فوري إلى الكاميرا بدون رسائل OTP.</span></div>
      <div>${icon('check', 16)} <span>يرفض النظام أي شخص آخر غير صاحب البطاقة.</span></div>
    </div>
  </aside>
</div>`;
}

/* ------------------------------------------------------------------ ٢-ب) OTP */
function otpPage() {
  return `
<section class="scanner-frame" style="min-height:auto">
  <h2>تأكيد الموبايل غير مطلوب</h2>
  <a class="sketch-button scan-button" href="/verify">المتابعة لكاميرا الوجه</a>
</section>`;
}

/* ------------------------------------------------------------------ ٣) التحقق البيومتري (الكاميرا) */
function verifyPage({ voter, election, rollCard }) {
  const cardImg = (rollCard && rollCard.card_image) || '/cards/31005292501518.jpg';
  const faceImg = (rollCard && rollCard.face_image) || '/cards/31005292501518-face.jpg';
  return `
<script src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.min.js" defer></script>

<section id="verify-app">
  <canvas id="canvas" hidden></canvas>

  <div class="error-note" id="verify-error" role="alert" style="margin-bottom:14px" hidden></div>

  <!-- المرحلة ١: الكاميرا والتقاط السيلفي -->
  <div class="v-step" data-step="selfie">
    <div class="verify-grid">
      <!-- يمين: بطاقة الناخب المسجّلة في القاعدة -->
      <div class="register-side-card">
        <div class="case-kicker" style="margin-bottom:10px"><span>STORED ID</span><b>#REF-FACE</b><i>READY</i></div>
        <h3>بطاقة صاحب القيد بالسجل</h3>
        <p class="muted small">تتم مقارنة الكاميرا المباشرة مع بصمة الوجه المستخرجة من هذه البطاقة:</p>
        <div class="db-face-summary">
          <img id="db-face-ref" src="${esc(faceImg)}" alt="صورة الوجه بالبطاقة" crossorigin="anonymous" class="db-face-avatar"/>
          <div>
            <b>${esc(voter.full_name)}</b>
            <span class="muted small" style="display:block">الرقم القومي: <code class="mono">${esc(voter.national_id_masked || '********1518')}</code></span>
            <span class="muted small" style="display:block">العنوان: ${esc((rollCard && rollCard.address) || voter.governorate)}</span>
          </div>
        </div>
        <div class="mini-id-preview" style="margin-bottom:10px">
          <img id="db-card-img" src="${esc(cardImg)}" alt="بطاقة الرقم القومي المسجّلة" crossorigin="anonymous"/>
        </div>
        <div class="sandbox-polling-indicator">
          <span class="status-dot"></span>
          <span id="ai-engine-text">جاري تجهيز محرك البصمة العصبية 128-D…</span>
        </div>
      </div>

      <!-- يسار: تيرمينال الكاميرا المباشرة -->
      <section class="scanner-frame" style="min-height:auto;transform:none">
        <div class="file-tab">STEP 02 // LIVE CAMERA</div>
        <div class="case-spine" aria-hidden="true">128-D NEURAL FACE VERIFICATION</div>
        <span class="corner-mark corner-one"></span>
        <span class="corner-mark corner-two"></span>

        <div class="scanner-topline">
          <div><span class="status-dot"></span> <span id="cam-status">جاري تشغيل الكاميرا…</span></div>
          <span>CAMERA // BIOMETRIC LAB</span>
        </div>

        <ul class="challenge-list" id="challenge-list" aria-live="polite"></ul>

        <div class="camera-frame selfie-mode" id="camera-frame-box">
          <video id="video-selfie" playsinline webkit-playsinline autoplay muted></video>
          <canvas id="sim-camera-canvas" width="640" height="480" style="width:100%;height:100%;object-fit:cover;display:none"></canvas>
          <div class="frame-guide face-guide" id="face-guide-box">
            <span id="face-guide-label">ضع وجهك في منتصف الإطار</span>
          </div>
          <div class="liveness-meter"><span id="liveness-bar"></span></div>
        </div>

        <div class="studio-controls">
          <button class="sketch-button scan-button" type="button" id="btn-capture-selfie" style="margin-top:0;flex:2">
            ${icon('camera', 20)} التقاط السيلفي ومطابقة الوجه
          </button>
          <button class="sketch-button small-sketch-btn" type="button" id="btn-start-camera">تشغيل الكاميرا الحقيقية</button>
          <button class="sketch-button small-sketch-btn" type="button" id="btn-sim-camera">محاكاة الكاميرا الذكية</button>
          <button class="sketch-button small-sketch-btn" type="button" id="btn-switch-cam">تبديل الكاميرا</button>
          <button class="sketch-button small-sketch-btn" type="button" id="btn-use-selfie-file">رفع صورة للوجه</button>
          <input type="file" id="selfie-file" accept="image/*" capture="user" hidden/>
        </div>

        <div class="captured" id="selfie-preview" hidden>
          <div class="captured-head">
            <b>✓ تم التقاط صورة الوجه — اضغط «تأكيد ومطابقة الوجه الآن»:</b>
          </div>
          <img id="selfie-img" alt="صورة السيلفي الملتقطة" crossorigin="anonymous"/>
          <div class="captured-actions">
            <button class="sketch-button scan-button" type="button" id="btn-selfie-ok" style="margin-top:0;flex:2">
              ${icon('check', 20)} تأكيد ومطابقة الوجه الآن ←
            </button>
            <button class="sketch-button small-sketch-btn" type="button" id="btn-selfie-retake">إعادة الالتقاط</button>
          </div>
        </div>
      </section>
    </div>
  </div>

  <!-- المرحلة ٢: جاري الفحص -->
  <div class="v-step scanner-frame" data-step="processing" style="min-height:auto;transform:none" hidden>
    <div class="loading-stage">
      <div class="scan-circle">${icon('face', 36)}</div>
      <h2>جاري مطابقة بصمة الوجه مع بطاقة الرقم القومي…</h2>
      <p>يتم استخراج 128 نقطة حيوية من الوجه ومقارنتها بصورة البطاقة المسجّلة</p>
      <ul class="progress-list" id="progress-list">
        <li data-k="card">قراءة بصمة الوجه المرجعية من البطاقة المسجّلة</li>
        <li data-k="live">فحص علامات الحيوية ووجود وجه بشري واضح</li>
        <li data-k="face">حساب المسافة الإقليدية (128-D Euclidean Distance)</li>
        <li data-k="decision">إصدار قرار التحقق وتجهيز ورقة الاقتراع</li>
      </ul>
    </div>
  </div>

  <!-- المرحلة ٣: النتيجة -->
  <div class="v-step scanner-frame" data-step="result" style="min-height:auto;transform:none" hidden>
    <div id="result-box"></div>
  </div>
</section>`;
}

/* ------------------------------------------------------------------ ٤) ورقة الاقتراع */
function votePage({ election, candidates, voter }) {
  const cards = candidates.map((c, idx) => {
    const { role, symbolText, symbolSvg, code } = parseSlogan(c.slogan, idx);
    const photo = c.photo_url || `/candidates/c${(idx % 4) + 1}.jpg`;
    const numAr = toArNum(idx + 1);
    return `
      <label class="ballot-cand-card" for="cand-${esc(c.id)}">
        <input type="radio" name="candidate_id" id="cand-${esc(c.id)}" value="${esc(c.id)}" required/>
        <div class="ballot-card-inner">
          <div class="ballot-card-top">
            <span class="ballot-num">${code} // المرشح رقم (${numAr})</span>
            <span class="ballot-symbol">${symbolSvg} <b>${esc(symbolText)}</b></span>
          </div>
          <div class="ballot-person">
            <img class="ballot-avatar" src="${esc(photo)}" alt="${esc(c.name)}"/>
            <div class="ballot-person-info">
              <strong class="ballot-name">${esc(c.name)}</strong>
              <span class="ballot-role">${esc(role)}</span>
            </div>
          </div>
          <p class="ballot-program">${esc(c.program || '')}</p>
          <div class="ballot-select-bar">
            <span class="ballot-radio-indicator">${icon('check', 16)}</span>
            <span class="ballot-select-label">التأشير لاختيار هذا المرشح</span>
          </div>
        </div>
      </label>`;
  }).join('');

  return `
<section class="scanner-frame" style="min-height:auto;transform:none">
  <div class="file-tab">STEP 03 // OFFICIAL BALLOT</div>
  <div class="case-spine" aria-hidden="true">SECRET BALLOT — ONE PERSON ONE VOTE</div>
  <span class="corner-mark corner-one"></span>
  <span class="corner-mark corner-two"></span>

  <div class="scanner-topline">
    <div><span class="status-dot"></span> الناخب الموثّق: ${esc(voter.full_name)}</div>
    <span>BALLOT // PAPER #2026</span>
  </div>

  <form id="vote-form" data-election="${esc(election.id)}">
    <input type="hidden" name="election_id" value="${esc(election.id)}"/>
    <div style="margin-bottom:16px">
      <h2 style="font-size:24px;font-weight:900;margin:0 0 4px">${esc(election.title)}</h2>
      <p class="muted small">اختار مرشح واحد فقط من القائمة المعتمدة، وبعدها اضغط «تأكيد وإيداع الصوت في الصندوق»:</p>
    </div>
    <div class="ballot-grid">${cards}</div>
    <div class="error-note" id="vote-error" role="alert" hidden></div>
    <button class="sketch-button scan-button" type="submit" id="cast-btn">
      ${icon('ballot', 20)} تأكيد وإيداع الصوت في الصندوق الآن ←
    </button>
  </form>
</section>

<dialog id="confirm-dialog" class="confirm">
  <div class="scan-circle" style="margin:0 auto 12px">${icon('ballot', 32)}</div>
  <h3>تأكيد نهائي لإيداع الصوت</h3>
  <p>أنت على وشك تسجيل صوتك رسميًا لصالح المرشح:<br/><b id="confirm-name" class="confirm-cand-highlight">—</b></p>
  <p class="muted small">بعد الإيداع لا يمكن تعديل الاختيار ويصدر لك إيصال رسمي.</p>
  <div class="row" style="justify-content:center;margin-top:18px">
    <button class="sketch-button primary-button" id="confirm-yes" type="button">نعم، سجّل صوتي</button>
    <button class="sketch-button small-sketch-btn" id="confirm-no" type="button">تراجع</button>
  </div>
</dialog>`;
}

/* ------------------------------------------------------------------ ٥) الإيصال */
function receiptPage({ receipt, electionTitle, total, castAt }) {
  return `
<section class="scanner-frame" style="max-width:680px;margin:0 auto;min-height:auto;text-align:center">
  <div class="file-tab">STEP 04 // RECEIPT</div>
  <div class="scanner-topline">
    <div><span class="status-dot"></span> تم تسجيل الصوت في الصندوق</div>
    <span>RECEIPT // VERIFIED</span>
  </div>
  <div class="scan-circle" style="margin:10px auto 14px;background:var(--green);color:#fff">${icon('check', 36)}</div>
  <h1 style="font-size:32px;font-weight:900;margin:0 0 6px">الإيصال صحيح — صوتك وصل!</h1>
  <p class="muted">تم احتساب صوتك في <b>${esc(electionTitle)}</b> بمعزل تام عن بياناتك الشخصية.</p>

  <div class="receipt-code mono" id="receipt-code">${esc(receipt)}</div>

  <div class="row center-row" style="margin:16px 0">
    <button class="sketch-button primary-button" id="btn-copy" type="button">نسخ رقم الإيصال</button>
    <button class="sketch-button small-sketch-btn" onclick="window.print()" type="button">طباعة</button>
    <a class="sketch-button small-sketch-btn" href="/verify-receipt?code=${esc(receipt)}">فحص الإيصال</a>
  </div>

  <div class="intel-grid" style="text-align:right">
    <div class="intel-check safe"><span>CAST TIME // وقت التصويت</span><b>${fmtDate(castAt)}</b></div>
    <div class="intel-check info"><span>BOX TOTAL // إجمالي الصندوق</span><b>${total} صوت صحيح</b></div>
  </div>

  <div class="row center-row" style="margin-top:20px">
    <a class="sketch-button scan-button" href="/results" style="max-width:320px">مشاهدة نتائج الفرز اللحظية ←</a>
  </div>
</section>`;
}

function receiptLookupPage({ code = '', result = null }) {
  const r = result || {};
  const map = {
    found: `<div class="intel-panel" style="border-color:var(--green)"><div class="intel-title"><span>VERIFIED RECEIPT</span><b>${esc(code)}</b></div><p style="margin-top:8px;font-weight:800;color:#087451">✓ الإيصال صحيح ومُدرج في الصندوق — تم تسجيل هذا الصوت في «${esc(r.election_title)}» بتاريخ ${fmtDate(r.cast_at)}.</p></div>`,
    notfound: `<div class="error-note">✗ مفيش صوت مسجّل بهذا الرقم — تأكد من كتابة رقم الإيصال بشكل صحيح.</div>`,
    bad: `<div class="error-note">✗ صيغة رقم الإيصال غير صحيحة.</div>`,
  };
  return `
<section class="scanner-frame" style="max-width:680px;margin:0 auto;min-height:auto">
  <div class="file-tab">VERIFY // RECEIPT</div>
  <div class="scanner-topline">
    <div><span class="status-dot"></span> فحص إيصال التصويت</div>
    <span>SOOT // RECEIPT CHECKER</span>
  </div>
  <form method="get" action="/verify-receipt" class="input-stage" style="padding-top:8px">
    <label for="code"><span>الدليل #</span> اكتب رقم إيصال التصويت المكون من 10 حروف وأرقام</label>
    <input id="code" name="code" value="${esc(code)}" placeholder="ABCDE-12345" class="mono" required/>
    <button class="sketch-button scan-button" type="submit">فحص الإيصال الآن</button>
  </form>
  ${r.kind ? `<div style="margin-top:16px">${map[r.kind] || ''}</div>` : ''}
</section>`;
}

/* ------------------------------------------------------------------ ٦) النتائج */
function resultsPage({ data }) {
  if (!data) {
    return `<section class="scanner-frame"><h1>نتائج الفرز</h1><p class="muted">لا توجد بيانات متاحة حاليًا.</p></section>`;
  }

  const sorted = [...(data.candidates || [])].sort((a, b) => (b.votes || 0) - (a.votes || 0));
  const rows = sorted.map((c, idx) => {
    const { role, symbolText, symbolSvg } = parseSlogan(c.slogan, (c.sort || idx + 1) - 1);
    const photo = c.photo_url || `/candidates/c${((c.sort || idx + 1) - 1) % 4 + 1}.jpg`;
    const votes = Number(c.votes) || 0;
    const pct = Number(c.percent) || 0;
    const isLeader = idx === 0 && votes > 0;
    return `
    <div class="result-cand-row ${isLeader ? 'leader' : ''}">
      <div class="res-cand-rank">0${idx + 1}</div>
      <img class="res-cand-photo" src="${esc(photo)}" alt="${esc(c.name)}"/>
      <div class="res-cand-body">
        <div class="res-cand-top">
          <div>
            <b class="res-cand-name">${esc(c.name)}</b>
            ${isLeader ? `<span class="ai-badge">المتصدر في الفرز</span>` : ''}
            <span class="res-cand-meta">${esc(role)} · <span class="inline-sym">${symbolSvg} ${esc(symbolText)}</span></span>
          </div>
          <div class="res-cand-numbers">
            <b>${pct}%</b> <span>(${votes} صوت محسوم)</span>
          </div>
        </div>
        <div class="score-track ${isLeader ? '' : 'safe'}" style="margin:8px 0 0"><span style="width:${Math.max(3, pct)}%"></span></div>
      </div>
    </div>`;
  }).join('');

  return `
<section class="scanner-frame" style="min-height:auto;transform:none">
  <div class="file-tab">LIVE TALLY // 2026</div>
  <div class="case-spine" aria-hidden="true">OFFICIAL ELECTION RESULTS</div>
  <span class="corner-mark corner-one"></span>
  <span class="corner-mark corner-two"></span>

  <div class="scanner-topline">
    <div><span class="status-dot"></span> الفرز اللحظي المباشر — صوت محسوب</div>
    <span>SOOT // LIVE RESULTS v2.6</span>
  </div>

  <div class="result-head" style="margin-bottom:18px;flex-wrap:wrap">
    <div>
      <div class="case-kicker"><span>OFFICIAL TALLY</span><b>#RES-2026</b><i>LIVE</i></div>
      <h1 style="font-size:28px;font-weight:900;margin:8px 0 4px">نتائج الفرز — ${esc(data.election.title)}</h1>
      <p class="muted small">${esc(data.election.description || '')}</p>
    </div>
    <div class="score-circle">
      <b>${data.total_ballots || 0}</b>
      <span>صوت محسوب</span>
    </div>
  </div>

  <div class="results-leaderboard">${rows}</div>

  <div class="row" style="margin-top:20px;justify-content:space-between">
    <a class="sketch-button primary-button" href="/register?e=${esc(data.election.id)}">شارك في التصويت الآن ←</a>
    <a class="sketch-button small-sketch-btn" href="/verify-receipt">فحص إيصال تصويت</a>
  </div>
</section>`;
}

function reviewStatusPage({ reviewId, review }) {
  const box = {
    pending: `<div class="advice-note"><b>طلبك قيد المراجعة:</b> لجنة الإشراف تراجع صورتك حاليًا.</div>`,
    approved: `<div class="intel-panel"><p><b>تمت الموافقة!</b> يمكنك الدخول لورقة الاقتراع الآن.</p><button class="sketch-button scan-button" id="btn-claim-token">استلام بطاقة الاقتراع</button></div>`,
    rejected: `<div class="error-note">تم رفض الطلب لعدم تطابق صورة الوجه مع البطاقة المسجّلة.</div><a class="sketch-button primary-button" href="/verify" style="margin-top:12px">إعادة المحاولة</a>`,
  }[review.status] || '';
  return `<section class="scanner-frame" style="min-height:auto"><h1>حالة الطلب #${esc(reviewId)}</h1><div id="review-card" data-review="${esc(reviewId)}">${box}</div></section>`;
}

function kioskPage({ elections }) {
  return `
<section class="scanner-frame" style="min-height:auto">
  <h1>منصة الاقتراع داخل اللجنة</h1>
  <p class="muted">يُفرّغ الحساب تلقائيًا عقب كل صوت ليبدأ الناخب التالي من جديد.</p>
  <div style="margin-top:16px">
    ${elections.filter((e) => e.state === 'open').map((e) => `
      <div class="intel-panel">
        <h3>${esc(e.title)}</h3>
        <p>${esc(e.description || '')}</p>
        <a class="sketch-button primary-button" href="/register?e=${esc(e.id)}&kiosk=1" style="margin-top:10px">بدء ناخب جديد ←</a>
      </div>`).join('')}
  </div>
</section>`;
}

function errorPage(message, code = 404) {
  return `
<section class="scanner-frame" style="max-width:560px;margin:0 auto;min-height:auto;text-align:center">
  <h1 style="font-size:48px;font-weight:900;color:var(--red)">${code}</h1>
  <p style="font-size:18px;font-weight:800;margin:10px 0 20px">${esc(message || 'الصفحة غير متاحة')}</p>
  <a class="sketch-button primary-button" href="/">العودة للرئيسية</a>
</section>`;
}

module.exports = {
  landing, registerPage, otpPage, verifyPage, votePage,
  receiptPage, receiptLookupPage, resultsPage, reviewStatusPage,
  kioskPage, errorPage,
};
