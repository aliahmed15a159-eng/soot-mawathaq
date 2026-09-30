'use strict';
/**
 * صفحات الناخبين والجمهور — التصميم الرسمي المطور (v11)
 */
const { esc, icon, stateBadge, fmtDate } = require('./layout');

const CANDIDATE_SYMBOLS = [
  { id: 'sym-scale', label: 'رمز الميزان' },
  { id: 'sym-falcon', label: 'رمز الصقر' },
  { id: 'sym-sun', label: 'رمز الشمس' },
  { id: 'sym-palm', label: 'رمز النخلة' },
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
  return { role, symbolText, symbolSvg, symId: sym.id };
}

function toArNum(n) {
  return String(n ?? 0).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
}

/* ------------------------------------------------------------------ ١) الرئيسية */
function landing({ elections = [], counts = {} }) {
  const activeElection = elections.find((e) => e.state === 'open') || elections[0] || {
    id: 1,
    title: 'الانتخابات العامة لرئاسة المجلس الوطني ٢٠٢٦',
    description: 'الاقتراع الإلكتروني الرسمي لاختيار رئيس المجلس الوطني للدورة البرلمانية ٢٠٢٦ - ٢٠٣٠ باستخدام بطاقة الرقم القومي السارية ومطابقة الوجه.',
    state: 'open',
    ends_at: '2026-10-30T20:00:00Z',
    candidates: [],
    total_ballots: 0,
  };

  const cands = activeElection.candidates || [];
  const totalVotes = activeElection.total_ballots || counts.ballots || 0;

  const candidateCards = cands.map((c, idx) => {
    const { role, symbolText, symbolSvg } = parseSlogan(c.slogan, idx);
    const photo = c.photo_url || `/candidates/c${(idx % 4) + 1}.jpg`;
    const numAr = toArNum(idx + 1);
    return `
      <article class="cand-poster-card">
        <div class="cpc-portrait-wrap">
          <img class="cpc-portrait" src="${esc(photo)}" alt="${esc(c.name)}" loading="lazy">
          <span class="cpc-num-badge">مرشح رقم (${numAr})</span>
          <span class="cpc-sym-badge">${symbolSvg} <b>${esc(symbolText)}</b></span>
        </div>
        <div class="cpc-body">
          <h3 class="cpc-name">${esc(c.name)}</h3>
          <span class="cpc-role">${esc(role)}</span>
          <p class="cpc-program">${esc(c.program || '')}</p>
        </div>
        <div class="cpc-footer">
          <div class="cpc-votes">
            <div class="cpc-votes-meta">
              <span>الأصوات المسجّلة</span>
              <b>${toArNum(c.votes || 0)} صوت (${toArNum(c.percent || 0)}٪)</b>
            </div>
            <div class="cpc-track"><span style="width:${Math.max(4, c.percent || 0)}%"></span></div>
          </div>
          <a class="btn primary full" href="/register?e=${esc(activeElection.id)}">اختيار المرشح والتصويت</a>
        </div>
      </article>`;
  }).join('');

  return `
<!-- البانر الرئيسي للهيئة الوطنية للانتخابات -->
<section class="state-hero">
  <div class="state-hero-main">
    <div class="sh-top-meta">
      ${stateBadge(activeElection.state)}
      <span class="sh-decree">قرار الهيئة الوطنية للانتخابات · الدورة ٢٠٢٦ / ٢٠٣٠</span>
    </div>
    <h1 class="sh-title">${esc(activeElection.title)}</h1>
    <p class="sh-lead">المنظومة الرسمية لتصويت المواطنين إلكترونيًا عبر مطابقة بيانات بطاقة الرقم القومي المحفوظة في السجل المدني مع البصمة الحيوية للوجه بالكاميرا المباشرة، مع ضمان السرية الكاملة لورقة الاقتراع.</p>
    <div class="sh-actions">
      <a class="btn gold lg" href="/register?e=${esc(activeElection.id)}">ابدأ إجراءات التصويت الآن</a>
      <a class="btn hero-ghost lg" href="#candidates-section">استعراض المرشحين (${toArNum(cands.length)})</a>
      <a class="btn hero-ghost lg" href="/results?e=${esc(activeElection.id)}">نتائج الفرز اللحظي</a>
    </div>
  </div>

  <aside class="decree-card" aria-label="بيانات الاستحقاق الانتخابي">
    <div class="decree-head">
      <svg width="20" height="20" aria-hidden="true"><use href="#ic-shield"/></svg>
      <span>بيان اللجنة العليا للانتخابات</span>
    </div>
    <div class="decree-stats">
      <div class="decree-stat-box">
        <b>${toArNum(cands.length)}</b>
        <span>مرشحين بالقائمة النهائية</span>
      </div>
      <div class="decree-stat-box">
        <b>${toArNum(totalVotes)}</b>
        <span>صوتًا صحيحًا بالصندوق</span>
      </div>
    </div>
    <dl class="decree-list">
      <div><dt>موعد غلق الاقتراع</dt><dd>٣٠ أكتوبر ٢٠٢٦</dd></div>
      <div><dt>نظام الانتخاب</dt><dd>فردي مباشر (صوت واحد)</dd></div>
      <div><dt>تحقق الهوية</dt><dd>بطاقة الرقم القومي + الوجه</dd></div>
    </dl>
  </aside>
</section>

<!-- مراحل الاقتراع الثلاث -->
<section class="steps-strip" aria-label="خطوات التصويت">
  <div class="strip-item">
    <span class="strip-num">١</span>
    <div>
      <b>الاستعلام بالرقم القومي</b>
      <p>إدخال الاسم والرقم القومي لمطابقتها مع البطاقة المسجّلة بالسجل المدني دون الحاجة لرفع صورة البطاقة.</p>
    </div>
  </div>
  <div class="strip-item">
    <span class="strip-num">٢</span>
    <div>
      <b>مطابقة الوجه بالكاميرا</b>
      <p>فتح الكاميرا لالتقاط صورة فورية ومطابقتها آليًا مع الصورة الشخصية الموجودة على البطاقة المسجّلة.</p>
    </div>
  </div>
  <div class="strip-item">
    <span class="strip-num">٣</span>
    <div>
      <b>الاقتراع السري واستلام الإيصال</b>
      <p>اختيار مرشح واحد فقط في ورقة الاقتراع واستلام رقم إيصال رسمي للتحقق من احتساب الصوت.</p>
    </div>
  </div>
</section>

<!-- القائمة النهائية للمرشحين -->
<section class="section" id="candidates-section">
  <div class="section-head">
    <div>
      <span class="sec-kicker">الكشف الرسمي المعتمد</span>
      <h2>القائمة النهائية للمرشحين ورموزهم الانتخابية</h2>
    </div>
    <a class="btn ghost" href="/results?e=${esc(activeElection.id)}">عرض جدول الفرز التفصيلي ←</a>
  </div>
  <div class="candidates-grid-4">
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

  const quickFillButtons = usableCards.map((c, idx) => `
    <button class="btn small ${idx === 0 ? 'primary' : 'ghost'} btn-fill-card" type="button"
      data-name="${esc(c.full_name)}"
      data-nid="${esc(c.national_id_plain)}"
      data-dob="${esc(c.birth_date)}"
      data-gov="${esc(c.governorate)}"
      data-card-img="${esc(c.card_image || '/cards/31005292501518.jpg')}"
      data-phone="01012345678">
      ${esc(c.full_name)} (${esc(c.national_id_plain)})
    </button>`).join('');

  return `
<section class="page-head">
  <span class="sec-kicker">المرحلة الأولى من التصويت</span>
  <h1>الاستعلام وتسجيل بيانات الناخب</h1>
  <p class="muted">أدخل بيانات بطاقة الرقم القومي للتحقق من قيدك في قاعدة بيانات السجل المدني والانتقال لفحص الكاميرا.</p>
</section>

<div class="register-layout">
  <form class="card form-card" id="register-form" novalidate>
    <input type="hidden" name="election_id" value="${esc(election?.id || 1)}">

    <div class="sample-autofill-bar">
      <div class="sample-autofill-info">
        <b>بطاقات رقم قومي مسجّلة في قاعدة البيانات للتجربة الفورية (${toArNum(usableCards.length)})</b>
        <span class="muted small">اضغط على أي مواطن لملء بياناته تلقائيًا وتجربة التصويت ببطاقته:</span>
      </div>
      <div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap">
        ${quickFillButtons}
      </div>
    </div>

    <div class="field">
      <label for="full_name">الاسم الرباعي (مطابق للبطاقة القومية)</label>
      <input id="full_name" name="full_name" type="text" required autocomplete="name"
             placeholder="اكتب الاسم الكامل كما هو مدوّن في البطاقة">
    </div>

    <div class="grid-2">
      <div class="field">
        <label for="national_id">الرقم القومي (١٤ رقمًا)</label>
        <input id="national_id" name="national_id" type="text" inputmode="numeric" maxlength="14"
               class="mono" required placeholder="31005292501518">
        <small class="hint" id="nid-hint">يُستخرج منه تاريخ الميلاد والمحافظة تلقائيًا</small>
      </div>

      <div class="field">
        <label for="birth_date">تاريخ الميلاد</label>
        <input id="birth_date" name="birth_date" type="date" required>
      </div>
    </div>

    <div class="grid-2">
      <div class="field">
        <label for="governorate">محافظة الإقامة</label>
        <select id="governorate" name="governorate" required>
          <option value="">اختر المحافظة</option>
          ${governorates.map((g) => `<option value="${g}">${g}</option>`).join('')}
        </select>
      </div>

      <div class="field">
        <label for="phone">رقم الهاتف المحمول</label>
        <input id="phone" name="phone" type="tel" inputmode="tel" class="mono"
               required placeholder="01012345678">
      </div>
    </div>

    <div class="nid-preview" id="nid-preview" aria-live="polite">
      <span class="badge">النوع: <b id="p-gender">—</b></span>
      <span class="badge">تاريخ الميلاد: <b id="p-dob">—</b></span>
      <span class="badge">المحافظة: <b id="p-gov">—</b></span>
    </div>

    <label class="consent">
      <input type="checkbox" name="consent" id="consent" required checked>
      <span>أقرّ بصحة البيانات المدخلة وأوافق على مطابقة صورة الوجه مع بطاقة الرقم القومي المسجّلة للتحقق من الهوية.</span>
    </label>

    <div class="form-error" id="form-error" role="alert" hidden></div>

    <div class="form-actions">
      <button class="btn primary lg" type="submit" id="submit-btn">متابعة إلى فحص الكاميرا ←</button>
      <a class="btn ghost" href="/">العودة للرئيسية</a>
    </div>
  </form>

  <aside class="register-side-card">
    <div class="side-card-head">
      <svg width="20" height="20"><use href="#ic-id"/></svg>
      <span>نموذج البطاقة المحفوظة بالسجل</span>
    </div>
    <p class="muted small">يستدعي النظام صورة البطاقة الرسمية المحفوظة في قاعدة البيانات لمقارنة الوجه بها في الخطوة التالية:</p>
    <div class="mini-id-preview">
      <img id="register-card-preview-img" src="${esc(usableCards[0]?.card_image || '/cards/31005292501518.jpg')}" alt="بطاقة تحقيق الشخصية">
    </div>
    <ul class="ticks">
      <li>لا يُطلب من الناخب تصوير أو رفع البطاقة الورقية.</li>
      <li>الانتقال مباشر إلى فحص الكاميرا بدون رسائل نصية.</li>
      <li>يُرفض التصويت تلقائيًا إذا كانت صورة الكاميرا لشخص آخر غير صاحب البطاقة.</li>
    </ul>
  </aside>
</div>`;
}

/* ------------------------------------------------------------------ ٢-ب) OTP */
function otpPage({ voter }) {
  return `
<section class="page-head">
  <h1>تأكيد رقم الهاتف</h1>
  <p class="muted">مرحلة تأكيد الهاتف غير مفعّلة حاليًا — يمكنك المتابعة مباشرةً لفحص الكاميرا.</p>
</section>
<div class="card"><a class="btn primary lg" href="/verify">المتابعة لفحص الكاميرا</a></div>`;
}

/* ------------------------------------------------------------------ ٣) التحقق البيومتري */
function verifyPage({ voter, election, rollCard }) {
  const cardImg = (rollCard && rollCard.card_image) || '/cards/31005292501518.jpg';
  const faceImg = (rollCard && rollCard.face_image) || '/cards/31005292501518-face.jpg';
  return `
<section class="page-head">
  <div class="verify-top-strip">
    <div>
      <span class="sec-kicker">المرحلة الثانية — الفحص الحيوي</span>
      <h1>مطابقة الوجه مع بطاقة الرقم القومي</h1>
    </div>
    <span class="ai-engine-pill" id="ai-engine-status">
      <span class="status-dot"></span>
      <span id="ai-engine-label">جاري تجهيز وحدة مطابقة الوجه…</span>
    </span>
  </div>
  <p class="muted">الناخب المسجّل: <b>${esc(voter.full_name)}</b> · المحافظة: <b>${esc(voter.governorate)}</b> — قف أمام الكاميرا والتقط صورة واضحة لوجهك.</p>
</section>

<div class="card verify-stage" id="stage-selfie">
  <div class="verify-grid">
    <!-- بطاقة الناخب المسجّلة في قاعدة البيانات -->
    <div class="db-card-box">
      <div class="db-verified-header">
        <span class="status-badge state-open"><span class="status-dot"></span>البطاقة مطابقة للسجل المدني</span>
        <h3>البطاقة المرجعية لصاحب القيد</h3>
        <p class="muted small">تتم مطابقة ملامح الوجه الملتقطة بالكاميرا مع الصورة الشخصية في هذه البطاقة:</p>
      </div>
      <div class="db-face-summary">
        <img id="db-ref-face" src="${esc(faceImg)}" alt="صورة الوجه بالبطاقة" crossorigin="anonymous" class="db-face-avatar">
        <div>
          <b>${esc(voter.full_name)}</b>
          <span class="muted small" style="display:block">الرقم القومي: <code class="mono">${esc(voter.national_id_masked || '********1518')}</code></span>
          <span class="muted small" style="display:block">محل الإقامة: ${esc((rollCard && rollCard.address) || voter.governorate)}</span>
        </div>
      </div>
      <img id="db-card-img" src="${esc(cardImg)}" alt="بطاقة الرقم القومي المسجّلة" crossorigin="anonymous">
    </div>

    <!-- كاميرا السيلفي المباشرة -->
    <div class="camera-studio-box">
      <div class="studio-head">
        <div>
          <h3>الكاميرا المباشرة لمطابقة الوجه</h3>
          <p class="muted small">ضع وجهك داخل الإطار الإرشادي ثم اضغط «التقاط صورة الوجه الآن»:</p>
        </div>
        <span class="cam-status-pill" id="cam-status-pill">الكاميرا جاهزة</span>
      </div>

      <ul class="challenge-list" id="challenge-list" aria-live="polite"></ul>

      <div class="camera-frame selfie-mode" id="camera-frame-box">
        <video id="video-selfie" playsinline autoplay muted></video>
        <div class="frame-guide face-guide" id="face-guide-oval">
          <span id="face-guide-text">ضع الوجه في المنتصف</span>
        </div>
        <div class="liveness-meter"><span id="liveness-bar"></span></div>
      </div>

      <div class="studio-controls">
        <button class="btn primary lg" type="button" id="btn-capture-selfie">
          ${icon('camera', 18)} التقاط صورة الوجه الآن
        </button>
        <button class="btn ghost" type="button" id="btn-selfie-restart">تحديث الكاميرا</button>
        <label class="btn ghost" for="file-selfie" style="cursor:pointer">رفع صورة بديلة</label>
        <input type="file" id="file-selfie" accept="image/*" capture="user" hidden>
      </div>

      <div class="captured" id="selfie-preview" hidden>
        <div class="captured-head">
          <b>الصورة الملتقطة جاهزة للمطابقة:</b>
        </div>
        <img id="selfie-img" alt="صورة السيلفي الملتقطة" crossorigin="anonymous">
        <div class="captured-actions">
          <button class="btn primary lg" type="button" id="btn-selfie-ok">بدء مطابقة الوجه وإصدار بطاقة الاقتراع ←</button>
          <button class="btn ghost" type="button" id="btn-selfie-retake">إعادة الالتقاط</button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- مرحلة الفحص -->
<div class="card verify-stage" id="stage-processing" hidden>
  <div class="processing">
    <div class="spinner" aria-hidden="true"></div>
    <h3>جاري مطابقة ملامح الوجه مع صورة بطاقة الرقم القومي…</h3>
    <p class="muted">يتم التحقق من تطابق الهوية لإصدار ورقة اقتراع سرية.</p>
    <ul class="progress-list" id="progress-list">
      <li data-k="card">استدعاء صورة الوجه المرجعية من بطاقة الرقم القومي</li>
      <li data-k="live">فحص الصورة الملتقطة والتأكد من وجود وجه بشري واضح</li>
      <li data-k="face">قياس نسبة التطابق بين الوجه الحي وصورة البطاقة</li>
      <li data-k="decision">اعتماد النتيجة وتجهيز ورقة الاقتراع</li>
    </ul>
  </div>
</div>

<!-- النتيجة -->
<div class="card verify-stage" id="stage-result" hidden>
  <div id="result-box"></div>
</div>`;
}

/* ------------------------------------------------------------------ ٤) ورقة الاقتراع */
function votePage({ election, candidates, voter }) {
  const cards = candidates.map((c, idx) => {
    const { role, symbolText, symbolSvg } = parseSlogan(c.slogan, idx);
    const photo = c.photo_url || `/candidates/c${(idx % 4) + 1}.jpg`;
    const numAr = toArNum(idx + 1);
    return `
      <label class="ballot-cand-card" for="cand-${esc(c.id)}">
        <input type="radio" name="candidate_id" id="cand-${esc(c.id)}" value="${esc(c.id)}" required>
        <div class="ballot-card-inner">
          <div class="ballot-card-top">
            <span class="ballot-num">المرشح رقم (${numAr})</span>
            <span class="ballot-symbol">${symbolSvg} <b>${esc(symbolText)}</b></span>
          </div>
          <div class="ballot-person">
            <img class="ballot-avatar" src="${esc(photo)}" alt="${esc(c.name)}">
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
<section class="page-head">
  <span class="sec-kicker">المرحلة الثالثة — الاقتراع السري</span>
  <h1>${esc(election.title)}</h1>
  <div class="ballot-voter-banner">
    <span>الناخب الموثّق: <b>${esc(voter.full_name)}</b> — تم التحقق من البطاقة والوجه بنجاح</span>
    <span class="status-badge state-open"><span class="status-dot"></span>ورقة اقتراع سرية لمرة واحدة</span>
  </div>
</section>

<form class="card vote-card" id="vote-form">
  <input type="hidden" name="election_id" value="${esc(election.id)}">
  <div class="ballot-sheet-header">
    <div>
      <h2>بطاقة إبداء الرأي الرسمية</h2>
      <p class="muted small">اضغط على بطاقة المرشح الذي ترغب في انتخابه (مرشح واحد فقط)، ثم اضغط على زر «تأكيد وإيداع الصوت في الصندوق»:</p>
    </div>
  </div>
  <div class="ballot-grid">${cards}</div>
  <div class="form-error" id="vote-error" role="alert" hidden></div>
  <div class="vote-actions-bar">
    <div class="muted small">يُحفظ صوتك في الصندوق بمعزل تام عن بياناتك الشخصية ويصدر لك إيصال رسمي.</div>
    <button class="btn primary lg" type="submit" id="cast-btn">تأكيد وإيداع الصوت في الصندوق ←</button>
  </div>
</form>

<dialog id="confirm-dialog" class="confirm">
  <div class="seal" style="margin-bottom:12px">${icon('ballot', 28)}</div>
  <h3>تأكيد اختيار المرشح</h3>
  <p>أنت على وشك تسجيل صوتك رسميًا لصالح المرشح:<br><b id="confirm-name" class="confirm-cand-highlight">—</b></p>
  <p class="muted small">هل تؤكد إيداع ورقة الاقتراع في الصندوق؟</p>
  <div class="row" style="justify-content:center;margin-top:18px">
    <button class="btn primary lg" id="confirm-yes">نعم، تسجيل الصوت</button>
    <button class="btn ghost" id="confirm-no">تعديل الاختيار</button>
  </div>
</dialog>`;
}

/* ------------------------------------------------------------------ ٥) الإيصال */
function receiptPage({ receipt, electionTitle, total, castAt }) {
  return `
<section class="page-head center">
  <div class="seal">${icon('check', 34)}</div>
  <h1>تم تسجيل صوتك بنجاح</h1>
  <p class="muted">تم احتساب صوتك رسميًا في <b>${esc(electionTitle)}</b> دون ربطه ببياناتك الشخصية.</p>
</section>

<section class="card receipt">
  <h2>إيصال إثبات التصويت الرسمي</h2>
  <p class="muted small">احتفظ برقم الإيصال التالي للاستعلام في أي وقت عن إدراج صوتك في كشف الفرز العام:</p>
  <div class="receipt-code mono" id="receipt-code">${esc(receipt)}</div>
  <div class="row center-row">
    <button class="btn primary" id="btn-copy">نسخ رقم الإيصال</button>
    <button class="btn ghost" onclick="window.print()">طباعة الإيصال</button>
    <a class="btn ghost" href="/verify-receipt?code=${esc(receipt)}">التحقق من الإيصال</a>
  </div>
  <dl class="meta wide">
    <div><dt>تاريخ ووقت التصويت</dt><dd>${fmtDate(castAt)}</dd></div>
    <div><dt>إجمالي الأصوات بالصندوق</dt><dd>${toArNum(total)} صوت</dd></div>
    <div><dt>الاستحقاق الانتخابي</dt><dd>${esc(electionTitle)}</dd></div>
  </dl>
</section>
<section class="section row center-row">
  <a class="btn primary lg" href="/results">مشاهدة نتائج الفرز الحالية</a>
  <a class="btn ghost lg" href="/">العودة للرئيسية</a>
</section>`;
}

function receiptLookupPage({ code = '', result = null }) {
  const r = result || {};
  const map = {
    found: `<div class="notice ok"><b>الإيصال صحيح ومُدرج في الصندوق:</b> تم تسجيل هذا الصوت في <b>${esc(r.election_title)}</b> بتاريخ ${fmtDate(r.cast_at)}.</div>`,
    notfound: `<div class="notice err">مفيش صوت مسجّل بهذا الرقم — يرجى مراجعة رقم الإيصال والمحاولة مرة أخرى.</div>`,
    bad: `<div class="notice err">صيغة رقم الإيصال غير صحيحة.</div>`,
  };
  return `
<section class="page-head">
  <span class="sec-kicker">خدمة التحقق من الأصوات</span>
  <h1>الاستعلام عن إيصال التصويت</h1>
  <p class="muted">أدخل رقم الإيصال المكون من ١٠ أحرف وأرقام للتأكد من احتساب صوتك في الصندوق.</p>
</section>
<form class="card form-card" method="get" action="/verify-receipt">
  <div class="field">
    <label for="code">رقم إيصال التصويت</label>
    <input id="code" name="code" value="${esc(code)}" placeholder="ABCDE-12345" class="mono" required>
  </div>
  <div class="form-actions"><button class="btn primary lg" type="submit">استعلام عن الإيصال</button></div>
</form>
${r.kind ? `<section class="section">${map[r.kind] || ''}</section>` : ''}`;
}

/* ------------------------------------------------------------------ ٦) النتائج */
function resultsPage({ data }) {
  if (!data) {
    return `<section class="page-head"><h1>نتائج الفرز</h1></section><p class="muted">لا توجد بيانات متاحة حاليًا.</p>`;
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
      <div class="res-cand-rank">${toArNum(idx + 1)}</div>
      <img class="res-cand-photo" src="${esc(photo)}" alt="${esc(c.name)}">
      <div class="res-cand-body">
        <div class="res-cand-top">
          <div>
            <b class="res-cand-name">${esc(c.name)}</b>
            ${isLeader ? `<span class="leader-pill">المتصدر في الفرز</span>` : ''}
            <span class="res-cand-meta">${esc(role)} · <span class="inline-sym">${symbolSvg} ${esc(symbolText)}</span></span>
          </div>
          <div class="res-cand-numbers">
            <b>${toArNum(pct)}٪</b> <span>(${toArNum(votes)} صوت)</span>
          </div>
        </div>
        <div class="bar"><span style="width:${Math.max(3, pct)}%"></span></div>
      </div>
    </div>`;
  }).join('');

  return `
<section class="page-head">
  <span class="sec-kicker">البيان الإحصائي للفرز</span>
  <h1>نتائج الفرز — ${esc(data.election.title)}</h1>
  <p class="muted">${esc(data.election.description || '')}</p>
</section>

<section class="stats-row">
  <div class="stat">
    <b>${toArNum(data.total_ballots || 0)}</b>
    <span>إجمالي الأصوات الصحيحة بالصندوق</span>
  </div>
  <div class="stat">
    <b>${toArNum((data.candidates || []).length)}</b>
    <span>عدد المرشحين بالقائمة النهائية</span>
  </div>
  <div class="stat">
    <b>${toArNum(data.participants || data.total_ballots || 0)}</b>
    <span>إجمالي الناخبين المشاركين</span>
  </div>
</section>

<section class="section">
  <div class="section-head">
    <h2>جدول ترتيب المرشحين ونسب الأصوات</h2>
    <a class="btn primary" href="/register?e=${esc(data.election.id)}">المشاركة في التصويت</a>
  </div>
  <div class="results-leaderboard">${rows}</div>
</section>`;
}

function reviewStatusPage({ reviewId, review }) {
  const box = {
    pending: `<div class="notice">طلبك قيد المراجعة من لجنة الإشراف.</div>`,
    approved: `<div class="notice ok">تمت الموافقة — يمكنك الدخول للتصويت الآن.</div><div class="row center-row"><button class="btn primary" id="btn-claim-token">الدخول لورقة الاقتراع</button></div>`,
    rejected: `<div class="notice err">تم رفض الطلب لعدم تطابق صورة الوجه مع البطاقة المسجّلة.</div><div class="row center-row"><a class="btn primary" href="/verify">إعادة المحاولة</a></div>`,
  }[review.status] || '';
  return `<section class="page-head"><h1>حالة الطلب رقم #${esc(reviewId)}</h1></section><section class="card" id="review-card" data-review="${esc(reviewId)}">${box}</section>`;
}

function kioskPage({ elections }) {
  return `
<section class="page-head">
  <h1>نقطة الاقتراع داخل اللجنة</h1>
  <p class="muted">يُنهى الحساب تلقائيًا عقب كل صوت ليبدأ الناخب التالي من جديد.</p>
</section>
<section class="section">
  <div class="cards">
    ${elections.filter((e) => e.state === 'open').map((e) => `
      <article class="card">
        <h3>${esc(e.title)}</h3>
        <p>${esc(e.description || '')}</p>
        <a class="btn primary lg" href="/register?e=${esc(e.id)}&kiosk=1">بدء ناخب جديد</a>
      </article>`).join('') || '<p class="muted">لا توجد انتخابات مفتوحة حاليًا.</p>'}
  </div>
</section>`;
}

function errorPage(message, code = 404) {
  return `
<section class="page-head center">
  <p class="mono muted">${code}</p>
  <h1>${esc(message || 'الصفحة غير متاحة')}</h1>
  <div class="row center-row"><a class="btn primary" href="/">العودة للرئيسية</a></div>
</section>`;
}

module.exports = {
  landing, registerPage, otpPage, verifyPage, votePage,
  receiptPage, receiptLookupPage, resultsPage, reviewStatusPage,
  kioskPage, errorPage,
};
