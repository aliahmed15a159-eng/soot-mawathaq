'use strict';
/** صفحات الجمهور — منصة «صوت» — تصميم مدني رقمي راقٍ بوضعَي فاتح/داكن */
const { esc, icon } = require('./layout');

const STATE_LABEL = {
  open: 'التصويت متاح',
  closed: 'انتهى التصويت',
  scheduled: 'لم يبدأ بعد',
  draft: 'مسودة',
  missing: 'غير متاح',
};

function stateChip(state) {
  return `<span class="status-badge state-${esc(state)}"><span class="status-dot"></span>${esc(STATE_LABEL[state] || state)}</span>`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short', calendar: 'gregory', numberingSystem: 'latn' }).format(new Date(iso));
  } catch { return String(iso).slice(0, 16).replace('T', ' '); }
}

/** أرقام آمنة — لا undefined ولا NaN أبدًا */
function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function fmtPct(v) {
  const n = Number(v);
  return `${(Number.isFinite(n) ? Math.round(n * 10) / 10 : 0)}%`;
}

/** اللقب المهني والرمز الانتخابي مع أيقونة فيكتور */
function parseSlogan(slogan = '', idx = 0) {
  const clean = String(slogan).replace(/[⚖️🦅☀️🌴]/g, '').trim();
  const parts = clean.split('·').map((s) => s.trim()).filter(Boolean);
  const role = parts[0] || clean;
  const rawSym = parts.slice(1).join(' · ') || ['رمز: الميزان', 'رمز: الصقر', 'رمز: الشمس', 'رمز: النخلة'][idx % 4];
  let symId = 'sym-scale';
  if (/صقر|نسر/.test(rawSym)) symId = 'sym-falcon';
  else if (/شمس/.test(rawSym)) symId = 'sym-sun';
  else if (/نخل/.test(rawSym)) symId = 'sym-palm';
  const symLabel = rawSym.replace(/^رمز\s*:?\s*/, '').trim();
  return {
    role,
    symbolText: `رمز ${symLabel}`,
    symbolSvg: `<svg class="sym-ic" width="16" height="16" aria-hidden="true"><use href="#${symId}"/></svg>`,
    symbolId: symId,
  };
}

function candPhoto(c, idx) {
  return c.photo_url || `/candidates/c${(safeNum(c.sort, idx + 1) - 1) % 4 + 1}.jpg`;
}

/* ================================================================== الرئيسية */
function landing({ elections, demo, counts }) {
  const mainElection = elections.find((e) => e.state === 'open') || elections[0] || null;
  const mainCandidates = (mainElection && mainElection.candidates) || [];
  const registerHref = mainElection ? `/register?e=${esc(mainElection.id)}` : '/register';

  /* --------- المرشحون: بطاقات متطابقة تمامًا بلا أي ترتيب بصري --------- */
  const candidateCards = mainCandidates.map((c, idx) => {
    const { role, symbolText, symbolSvg } = parseSlogan(c.slogan, idx);
    const photo = candPhoto(c, idx);
    const data = esc(JSON.stringify({
      name: c.name, number: idx + 1, role, symbol: symbolText, program: c.program || 'لم يُرفق برنامج انتخابي لهذا المرشح بعد.', photo,
    }));
    return `
      <article class="candidate-card" data-candidate>
        <div class="cc-top">
          <span class="cc-number">مرشح رقم ${safeNum(idx + 1, idx + 1)}</span>
          <span class="cc-symbol">${symbolSvg} ${esc(symbolText)}</span>
        </div>
        <img class="cc-photo" src="${esc(photo)}" alt="صورة المرشح ${esc(c.name)}" loading="lazy" width="96" height="96">
        <h3 class="cc-name">${esc(c.name)}</h3>
        <p class="cc-role">${esc(role)}</p>
        ${c.program ? `<p class="cc-program">${esc(String(c.program).slice(0, 150))}${String(c.program).length > 150 ? '…' : ''}</p>` : ''}
        <button type="button" class="btn btn-outline btn-sm cc-more" data-open-candidate='${data}'>
          ${icon('eye', 15)} عرض البرنامج
        </button>
      </article>`;
  }).join('');

  return `
<section class="hero">
  <div class="hero-grid">
    <div class="hero-copy reveal">
      ${mainElection ? `<div class="hero-meta">${stateChip(mainElection.state)}<span class="hero-meta-title">${esc(mainElection.title)}</span></div>` : ''}
      <h1 class="hero-title">صوتك يبدأ <span class="text-accent">من هويتك</span></h1>
      <p class="hero-lead">منصة انتخابية رقمية تجمع بين التحقق من الهوية والتصويت الإلكتروني الآمن — تحقّق بوجهك، اختر بسرّية، واحصل على إيصال يمكنك التحقق منه في أي وقت.</p>
      <div class="hero-actions">
        <a class="btn btn-primary btn-lg" href="${registerHref}">${icon('vote-check', 19)} ابدأ التصويت</a>
        <a class="btn btn-outline btn-lg" href="#process">استكشف المنصة ${icon('chevron-down', 17)}</a>
      </div>
      <div class="hero-trust">
        <span>${icon('shield-check', 15)} تحقق بالوجه</span>
        <span>${icon('lock', 15)} سرية الاقتراع</span>
        <span>${icon('receipt', 15)} إيصال قابل للتحقق</span>
      </div>
    </div>

    <div class="hero-visual reveal" aria-label="توضيح رحلة التصويت: من الهوية إلى التحقق بالوجه فالاقتراع فالإيصال">
      <div class="flow-panel">
        <div class="flow-head">
          <span class="flow-head-title">${icon('layers', 16)} رحلة الناخب</span>
          <span class="flow-live"><span class="pulse-dot"></span> مباشر</span>
        </div>

        <div class="flow-row">
          <span class="flow-ic">${icon('id-card', 19)}</span>
          <div class="flow-info"><b>الهوية</b><span>بيانات الرقم القومي</span></div>
          <span class="flow-mini mini-code">•••• •••• 1518 ${icon('check-circle', 13)}</span>
        </div>
        <div class="flow-connector" aria-hidden="true"></div>

        <div class="flow-row">
          <span class="flow-ic flow-ic-cam">${icon('scan-face', 19)}<span class="cam-scanline" aria-hidden="true"></span></span>
          <div class="flow-info"><b>التحقق من الوجه</b><span>مطابقة حيّة عبر الكاميرا</span></div>
          <span class="flow-mini mini-ok">${icon('check-circle', 13)} تم</span>
        </div>
        <div class="flow-connector" aria-hidden="true"></div>

        <div class="flow-row">
          <span class="flow-ic">${icon('ballot', 19)}</span>
          <div class="flow-info"><b>التصويت</b><span>اختيار سري لمرشح واحد</span></div>
          <span class="flow-mini mini-radio" aria-hidden="true"><span></span></span>
        </div>
        <div class="flow-connector" aria-hidden="true"></div>

        <div class="flow-row">
          <span class="flow-ic">${icon('receipt', 19)}</span>
          <div class="flow-info"><b>الإيصال</b><span>رقم قابل للتحقق</span></div>
          <span class="flow-mini mini-code">SOOT-24081 ${icon('check-circle', 13)}</span>
        </div>
      </div>
      <div class="hero-float hero-float-a">${icon('shield-check', 15)} هويتك محمية</div>
      <div class="hero-float hero-float-b">${icon('lock', 15)} الصوت مجهول الهوية</div>
    </div>
  </div>
</section>

<section class="stats-band" aria-label="أرقام المنصة">
  <div class="stats-grid">
    <div class="stat-box"><b>${safeNum(counts.candidates)}</b><span>مرشحًا في الانتخابات الحالية</span></div>
    <div class="stat-box"><b>${safeNum(counts.ballots)}</b><span>صوتًا مسجّلًا حتى الآن</span></div>
    <div class="stat-box"><b>${safeNum(counts.elections)}</b><span>استحقاقًا انتخابيًا</span></div>
    <div class="stat-box"><b>4</b><span>خطوات للتصويت</span></div>
  </div>
</section>

<section class="section" id="process">
  <div class="section-head center">
    <span class="eyebrow">كيف تعمل المنصة</span>
    <h2>من الهوية إلى الإيصال — أربع خطوات</h2>
    <p class="muted">رحلة واضحة ومحمية: كل خطوة تُثبت هويتك دون أن تكشف اختيارك.</p>
  </div>
  <ol class="process-grid">
    <li class="process-card reveal">
      <span class="process-num">01</span>
      <span class="process-ic">${icon('id-card', 22)}</span>
      <h3>بيانات الناخب</h3>
      <p>أدخل اسمك ورقمك القومي، ويقرأ النظام تاريخ الميلاد والمحافظة تلقائيًا من الرقم.</p>
    </li>
    <li class="process-card reveal">
      <span class="process-num">02</span>
      <span class="process-ic">${icon('scan-face', 22)}</span>
      <h3>التحقق من الهوية</h3>
      <p>التقط صورتك عبر الكاميرا ليطابق النظام ملامحك مع البطاقة المسجّلة.</p>
    </li>
    <li class="process-card reveal">
      <span class="process-num">03</span>
      <span class="process-ic">${icon('ballot', 22)}</span>
      <h3>التصويت</h3>
      <p>اختر مرشحًا واحدًا من ورقة الاقتراع الإلكترونية — واختيارك سري تمامًا.</p>
    </li>
    <li class="process-card reveal">
      <span class="process-num">04</span>
      <span class="process-ic">${icon('receipt', 22)}</span>
      <h3>الإيصال</h3>
      <p>استلم رقم إيصال فريدًا يمكنك التحقق منه في أي وقت دون كشف اختيارك.</p>
    </li>
  </ol>
</section>

<section class="section security-section">
  <div class="section-head center">
    <span class="eyebrow">الأمان أولاً</span>
    <h2>أمانك جزء من كل خطوة</h2>
  </div>
  <div class="security-grid">
    <article class="security-card reveal">
      <span class="security-ic">${icon('id-card', 21)}</span>
      <h3>التحقق من الهوية</h3>
      <p>التأكد من هوية الناخب قبل الوصول للاقتراع.</p>
    </article>
    <article class="security-card reveal">
      <span class="security-ic">${icon('vote-check', 21)}</span>
      <h3>التصويت مرة واحدة</h3>
      <p>منع تكرار التصويت لنفس الناخب.</p>
    </article>
    <article class="security-card reveal">
      <span class="security-ic">${icon('receipt', 21)}</span>
      <h3>إيصال قابل للتحقق</h3>
      <p>الحصول على رقم إيصال يمكن التحقق منه.</p>
    </article>
    <article class="security-card reveal">
      <span class="security-ic">${icon('lock', 21)}</span>
      <h3>حماية البيانات</h3>
      <p>عرض البيانات الضرورية فقط في كل مرحلة.</p>
    </article>
  </div>
</section>

${mainCandidates.length ? `
<section class="section" id="candidates">
  <div class="section-head">
    <div>
      <span class="eyebrow">الانتخابات</span>
      <h2>${mainElection ? esc(mainElection.title) : 'قائمة المرشحين'}</h2>
      <p class="muted">${mainElection && mainElection.description ? esc(mainElection.description) : 'المرشحون المعتمدون — بمعاملة بصرية متساوية تمامًا.'}</p>
    </div>
    <a class="btn btn-outline" href="/results">${icon('chart', 16)} النتائج المباشرة</a>
  </div>
  <div class="candidates-grid">${candidateCards}</div>
</section>` : `
<section class="section" id="candidates">
  <div class="empty-state">
    <span class="empty-ic">${icon('user', 26)}</span>
    <h3>لا يوجد مرشحون معروضون حاليًا</h3>
    <p class="muted">لم تُضف قوائم المرشحين لهذا الاستحقاق بعد.</p>
  </div>
</section>`}

<section class="cta-band">
  <div class="cta-inner reveal">
    <h2>جاهز لتسجيل صوتك؟</h2>
    <p>رحلة التصويت تستغرق دقائق — بهويتك ووجهك فقط.</p>
    <a class="btn btn-invert btn-lg" href="${registerHref}">${icon('vote-check', 19)} ابدأ التصويت الآن</a>
  </div>
</section>

<dialog class="modal" id="candidate-dialog" aria-labelledby="cd-name">
  <div class="modal-head">
    <h3 id="cd-title-modal">برنامج المرشح</h3>
    <button type="button" class="icon-btn" data-close-modal aria-label="إغلاق">${icon('close', 18)}</button>
  </div>
  <div class="modal-body candidate-details">
    <img id="cd-photo" src="" alt="">
    <div class="cd-info">
      <span class="cc-number" id="cd-number"></span>
      <h3 id="cd-name"></h3>
      <p class="cc-role" id="cd-role"></p>
      <span class="cc-symbol" id="cd-symbol"></span>
      <div class="cd-program-box">
        <b>البرنامج الانتخابي</b>
        <p id="cd-program"></p>
      </div>
    </div>
  </div>
  <div class="modal-actions">
    <a class="btn btn-primary" id="cd-cta" href="/register">${icon('vote-check', 17)} التصويت</a>
    <button type="button" class="btn btn-ghost" data-close-modal>إغلاق</button>
  </div>
</dialog>`;
}

/* ================================================================== التسجيل */
function registerPage({ election, demo, cards = [] }) {
  const govOptions = ['القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'الشرقية', 'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'أسوان', 'الأقصر', 'الغربية', 'المنوفية', 'البحيرة', 'كفر الشيخ', 'دمياط', 'بورسعيد', 'السويس', 'الإسماعيلية', 'شمال سيناء', 'جنوب سيناء', 'مطروح', 'البحر الأحمر', 'الوادي الجديد', 'خارج الجمهورية'];
  const storedCards = cards.length ? cards : [{
    full_name: 'علي أحمد علي محمد',
    national_id_plain: '31005292501518',
    birth_date: '2010-05-29',
    governorate: 'أسيوط',
  }];
  return `
<section class="page-head">
  <span class="eyebrow">الخطوة 01 — البيانات</span>
  <h1>بيانات الناخب</h1>
  <p class="muted">${election ? esc(election.title) : 'أدخل بياناتك للتحقق من هويتك والانتقال إلى فحص الوجه.'}</p>
</section>

<div class="register-layout">
  <form id="register-form" class="card form-card" autocomplete="off" novalidate>
    <input type="hidden" name="election_id" value="${election ? esc(election.id) : '1'}">

    <div class="demo-bar" role="note">
      <div class="demo-bar-head">
        ${icon('info', 15)}
        <span><b>بيانات تجريبية للتجربة</b> — اضغط لتعبئة النموذج تلقائيًا (${safeNum(storedCards.length)})</span>
      </div>
      <div class="demo-chips">
        ${storedCards.map((c, idx) => `
          <button type="button" class="demo-chip${idx === 0 ? ' is-first' : ''} btn-fill-card"
             ${idx === 0 ? 'id="btn-fill-sample-card"' : ''}
            data-name="${esc(c.full_name)}"
            data-nid="${esc(c.national_id_plain)}"
            data-dob="${esc(String(c.birth_date || '2010-05-29').slice(0, 10))}"
            data-gov="${esc(c.governorate || 'أسيوط')}"
            data-phone="01012345678">
            ${icon('user', 13)} ${esc(c.full_name)}
          </button>`).join('')}
      </div>
    </div>

    <div class="field">
      <label for="full_name">الاسم الكامل</label>
      <input id="full_name" name="full_name" type="text" placeholder="كما هو مدوّن في بطاقة الرقم القومي" autocomplete="name" required>
    </div>

    <div class="grid-2">
      <div class="field">
        <label for="national_id">الرقم القومي <span class="req">*</span></label>
        <input id="national_id" name="national_id" class="mono ltr" type="text" inputmode="numeric" placeholder="14 رقمًا" maxlength="14" autocomplete="off" required aria-describedby="nid-hint">
        <small class="hint" id="nid-hint">يُقرأ تاريخ الميلاد والمحافظة تلقائيًا من الرقم</small>
      </div>
      <div class="field">
        <label for="birth_date">تاريخ الميلاد <span class="req">*</span></label>
        <input id="birth_date" name="birth_date" type="date" required>
      </div>
    </div>

    <div class="grid-2">
      <div class="field">
        <label for="governorate">المحافظة <span class="req">*</span></label>
        <select id="governorate" name="governorate" required>
          <option value="">اختر المحافظة</option>
          ${govOptions.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="phone">رقم الهاتف المحمول <span class="req">*</span></label>
        <input id="phone" name="phone" class="mono ltr" type="tel" inputmode="numeric" placeholder="01xxxxxxxxx" maxlength="11" autocomplete="tel" required>
      </div>
    </div>

    <div class="nid-preview" id="nid-preview" hidden>
      <span class="mini-badge">${icon('user', 13)} النوع: <b id="np-gender">—</b></span>
      <span class="mini-badge">${icon('calendar', 13)} الميلاد: <b id="np-dob" class="ltr">—</b></span>
      <span class="mini-badge">${icon('pin', 13)} المحافظة: <b id="np-gov">—</b></span>
    </div>

    <label class="consent-box">
      <input type="checkbox" name="consent" id="consent" required>
      <span class="consent-check" aria-hidden="true">${icon('check', 12)}</span>
      <span>أقرّ بصحة البيانات وأوافق على استخدامها للتحقق من هويتي فقط، مع علمي بأن اختياري في الاقتراع يبقى سريًّا.</span>
    </label>

    <div class="form-actions">
      <button class="btn btn-primary btn-lg btn-block-mobile" type="submit">
        متابعة إلى التحقق من الوجه ${icon('arrow', 18)}
      </button>
      <a class="btn btn-ghost" href="/">رجوع</a>
    </div>
    <p class="form-error" id="form-error" role="alert" hidden></p>
  </form>

  <aside class="side-panel">
    <div class="card side-card">
      <h3>${icon('lock', 17)} خصوصيتك أولاً</h3>
      <ul class="ticks">
        <li>نستخدم بياناتك للتحقق من هويتك فقط.</li>
        <li>لا يظهر اختيارك في الاقتراع لأي شخص — ولا حتى للإدارة.</li>
        <li>الرقم القومي يُخزَّن مشفّرًا (تجزئة أحادية الاتجاه).</li>
        <li>يحق لك التصويت مرة واحدة فقط في كل استحقاق.</li>
      </ul>
    </div>
    <div class="card side-card">
      <h3>${icon('clock', 17)} قبل أن تبدأ</h3>
      <ul class="ticks">
        <li>جهّز مكانًا جيد الإضاءة لالتقاط صورة وجهك.</li>
        <li>اسمح للمتصفح باستخدام الكاميرا عند الطلب.</li>
        <li>احتفظ برقم الإيصال الذي ستحصل عليه بعد التصويت.</li>
      </ul>
    </div>
  </aside>
</div>`;
}

/* ================================================================== كود الموبايل (OTP) */
function otpPage({ voter, challenge = {}, otpStatus = {} }) {
  return `
<section class="page-head center">
  <span class="eyebrow">الخطوة 01 — البيانات</span>
  <h1>تأكيد رقم الموبايل</h1>
  <p class="muted">أرسلنا رمزًا من 6 أرقام إلى ${esc(challenge.masked || (voter && voter.phone_masked) || 'رقم موبايلك')} — أدخله للمتابعة.</p>
</section>
<form id="otp-form" class="card form-card narrow-card" novalidate>
  <div class="field">
    <label for="otp-code">رمز التحقق</label>
    <input id="otp-code" name="code" class="mono ltr otp-input" type="text" inputmode="numeric" maxlength="6" placeholder="••••••" autocomplete="one-time-code" required>
  </div>
  ${challenge.dev_code ? `<div class="demo-bar" role="note"><div class="demo-bar-head">${icon('info', 15)}<span><b>وضع التجربة:</b> الرمز هو <b class="mono ltr">${esc(challenge.dev_code)}</b></span></div></div>` : ''}
  <div class="form-actions">
    <button class="btn btn-primary btn-lg btn-block-mobile" type="submit">تأكيد الرمز</button>
    <button class="btn btn-ghost" type="button" id="btn-resend-otp">إعادة إرسال الكود</button>
  </div>
  <p class="form-error" id="otp-error" role="alert" hidden></p>
</form>`;
}

/* ================================================================== التحقق من الوجه */
function verifyPage({ voter, election, demo, rollCard }) {
  const cardImg = (rollCard && rollCard.card_image) || '/cards/31005292501518.jpg';
  const faceImg = (rollCard && rollCard.face_image) || '/cards/31005292501518-face.jpg';
  const hasStoredCard = !!(rollCard && rollCard.card_image);
  return `
<section class="page-head">
  <span class="eyebrow">الخطوة 02 — التحقق</span>
  <h1>التحقق من الهوية بالوجه</h1>
  <p class="muted verify-voter-line">${icon('user', 15)} ${esc(voter.full_name)} · الرقم القومي <span class="mono ltr">${esc(voter.national_id_masked)}</span>${election ? ` · ${esc(election.title)}` : ''}</p>
</section>

<div id="verify-app" class="verify-app" data-demo="${demo ? '1' : '0'}" data-has-db-card="1">
  <canvas id="canvas" hidden></canvas>
  <img id="db-face-ref" src="${esc(faceImg)}" crossorigin="anonymous" alt="" hidden>

  <div class="v-step" data-step="selfie">
    <div class="verify-grid">
      <aside class="card ref-panel">
        <div class="ref-panel-head">
          <span class="status-badge state-open"><span class="status-dot"></span> السجل المرجعي مطابق</span>
        </div>
        <div class="ref-person">
          <img class="ref-avatar" src="${esc(faceImg)}" crossorigin="anonymous" alt="صورة صاحب البطاقة المسجّلة">
          <div>
            <b>${esc(voter.full_name)}</b>
            <span class="muted small ref-meta">محافظة ${esc(voter.governorate || 'أسيوط')} · مواليد <span class="ltr">${esc(String(voter.birth_date || '2010-05-29').slice(0, 10))}</span></span>
            ${rollCard && rollCard.address ? `<span class="muted small ref-meta">${esc(rollCard.address)}</span>` : ''}
          </div>
        </div>
        ${hasStoredCard
          ? `<img id="db-card-img" class="ref-card-img" src="${esc(cardImg)}" crossorigin="anonymous" alt="بطاقة الرقم القومي المسجّلة">`
          : `<div class="notice notice-ok">${icon('check-circle', 15)} بيانات البطاقة موثّقة في السجل</div>`}
        <p class="privacy-note">${icon('lock', 14)} تُعالَج صورة الوجه داخل متصفحك لأغراض المطابقة فقط، ولا تُستخدم لأي غرض آخر.</p>
      </aside>

      <div class="card camera-panel">
        <div class="camera-head">
          <div class="engine-pill" id="ai-engine-badge"><span class="status-dot"></span><span id="ai-engine-text">جارٍ تجهيز محرك مطابقة الوجه…</span></div>
          <span class="cam-status" id="cam-status">جارٍ فتح الكاميرا…</span>
        </div>

        <ol class="challenge-chips" id="challenge-list" aria-label="تحديات إثبات الحيوية"></ol>

        <div class="camera-frame" id="camera-frame-box">
          <video id="video-selfie" playsinline autoplay muted></video>
          <span class="frame-corner tl" aria-hidden="true"></span>
          <span class="frame-corner tr" aria-hidden="true"></span>
          <span class="frame-corner bl" aria-hidden="true"></span>
          <span class="frame-corner br" aria-hidden="true"></span>
          <div class="face-guide" id="face-guide-box">
            <span id="face-guide-label">ضع وجهك داخل الإطار</span>
          </div>
          <div class="scanline" aria-hidden="true"></div>
          <div class="liveness-meter" aria-hidden="true"><span id="liveness-bar"></span></div>
        </div>

        <div class="camera-controls">
          <button class="btn btn-primary btn-lg btn-block-mobile" type="button" id="btn-capture-selfie">${icon('camera', 18)} التقاط الصورة</button>
          <button class="btn btn-outline" type="button" id="btn-use-selfie-file">رفع صورة من الجهاز</button>
          <button class="btn btn-ghost btn-sm" type="button" id="btn-start-camera">${icon('refresh', 14)} إعادة فتح الكاميرا</button>
          <button class="btn btn-ghost btn-sm" type="button" id="btn-switch-cam">تبديل الكاميرا</button>
          <input type="file" id="selfie-file" accept="image/*" hidden>
        </div>

        <p class="form-error" id="verify-error" role="alert" hidden></p>

        <div class="captured-box" id="selfie-preview" hidden>
          <b>الصورة الملتقطة</b>
          <img id="selfie-img" alt="صورة الوجه الملتقطة">
          <div class="captured-actions">
            <button class="btn btn-primary btn-lg btn-block-mobile" type="button" id="btn-selfie-ok">بدء مطابقة الوجه ${icon('arrow', 18)}</button>
            <button class="btn btn-ghost" type="button" id="btn-selfie-retake">إعادة الالتقاط</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="v-step" data-step="processing" hidden>
    <div class="card processing-card">
      <div class="scan-spinner" aria-hidden="true">${icon('scan-face', 26)}</div>
      <h2 id="processing-title">جارٍ التحقق من الهوية…</h2>
      <ul class="progress-list" id="progress-list">
        <li data-k="card">قراءة الصورة المرجعية من البطاقة</li>
        <li data-k="live">التأكد من وضوح الوجه في الصورة الملتقطة</li>
        <li data-k="face">مقارنة ملامح الوجه مع صاحب البطاقة</li>
        <li data-k="decision">اعتماد النتيجة وإصدار بطاقة الاقتراع</li>
      </ul>
    </div>
  </div>

  <div class="v-step" data-step="result" hidden>
    <div id="result-box"></div>
  </div>
</div>`;
}

/* ================================================================== الاقتراع */
function votePage({ election, candidates, voter, kiosk }) {
  const items = candidates.map((c, idx) => {
    const { role, symbolText, symbolSvg } = parseSlogan(c.slogan, idx);
    const photo = candPhoto(c, idx);
    return `
    <label class="ballot-card">
      <input type="radio" name="candidate_id" value="${esc(c.id)}" required>
      <span class="ballot-card-inner">
        <span class="ballot-top">
          <span class="cc-number">مرشح رقم ${safeNum(idx + 1, idx + 1)}</span>
          <span class="cc-symbol">${symbolSvg} ${esc(symbolText)}</span>
        </span>
        <span class="ballot-person">
          <img class="ballot-avatar" src="${esc(photo)}" alt="صورة المرشح ${esc(c.name)}" loading="lazy" width="72" height="72">
          <span class="ballot-person-info">
            <b class="ballot-name">${esc(c.name)}</b>
            <span class="ballot-role">${esc(role)}</span>
          </span>
        </span>
        ${c.program ? `<span class="ballot-program">${esc(String(c.program).slice(0, 130))}${String(c.program).length > 130 ? '…' : ''}</span>` : ''}
        <span class="ballot-select">
          <span class="ballot-radio" aria-hidden="true">${icon('check', 13)}</span>
          <span>اختيار هذا المرشح</span>
        </span>
      </span>
    </label>`;
  }).join('');

  return `
<section class="page-head">
  <span class="eyebrow">الخطوة 03 — الاقتراع</span>
  <h1>${esc(election.title)}</h1>
  <div class="ballot-banner">
    <span>${icon('user', 15)} ${esc(voter.full_name)} · <span class="mono ltr">${esc(voter.national_id_masked)}</span></span>
    <span class="ballot-banner-secret">${icon('lock', 14)} سرية التصويت مكفولة — لا يُربط اختيارك ببياناتك</span>
  </div>
</section>

<form id="vote-form" class="ballot-sheet" data-election="${esc(election.id)}" data-kiosk="${kiosk ? '1' : '0'}">
  <div class="ballot-instructions">
    <div>
      <h2>${icon('ballot', 19)} تعليمات التصويت</h2>
      <p>اختر <b>مرشحًا واحدًا فقط</b> بالضغط على بطاقته، ثم راجع اختيارك وأكّد التصويت.</p>
    </div>
    <span class="status-badge state-open"><span class="status-dot"></span> الاقتراع مفتوح</span>
  </div>

  <div class="ballot-grid">${items}</div>

  <div class="vote-review-note">
    ${icon('info', 16)}
    <span>راجع اختيارك قبل تأكيد التصويت — لا يمكن التعديل أو التصويت مرة أخرى بعد الاعتماد.</span>
  </div>

  <div class="vote-actions">
    <a class="btn btn-ghost" href="/">إلغاء</a>
    <button class="btn btn-primary btn-lg btn-block-mobile" type="submit">${icon('vote-check', 18)} تأكيد التصويت</button>
  </div>
  <p class="form-error" id="vote-error" role="alert" hidden></p>
</form>

<dialog class="modal modal-confirm" id="confirm-dialog" aria-labelledby="confirm-title">
  <div class="modal-body confirm-body">
    <span class="confirm-ic">${icon('vote-check', 30)}</span>
    <h3 id="confirm-title">تأكيد التصويت</h3>
    <p>أنت على وشك تسجيل صوتك لصالح:</p>
    <p class="confirm-name" id="confirm-name">—</p>
    <p class="muted small">هل تريد اعتماد هذا الاختيار نهائيًا؟</p>
  </div>
  <div class="modal-actions">
    <button class="btn btn-primary btn-lg" id="confirm-yes">نعم، سجّل صوتي</button>
    <button class="btn btn-ghost" id="confirm-no">تعديل الاختيار</button>
  </div>
</dialog>`;
}

/* ================================================================== الإيصال */
function receiptPage({ receipt, electionTitle, total, castAt }) {
  return `
<section class="page-head center receipt-head">
  <span class="success-seal" aria-hidden="true">${icon('check', 34)}</span>
  <span class="eyebrow">الخطوة 04 — الإيصال</span>
  <h1>تم تسجيل صوتك بنجاح</h1>
  <p class="muted">تم احتساب صوتك في <b>${esc(electionTitle)}</b> دون ربطه ببياناتك الشخصية.</p>
</section>

<section class="card receipt-card">
  <div class="receipt-status-row">
    <span class="status-badge state-ok">${icon('check-circle', 15)} مُسجَّل ومؤكَّد</span>
    <span class="muted small">${icon('clock', 14)} ${fmtDate(castAt)}</span>
  </div>

  <div class="receipt-code-block">
    <span class="receipt-label">رقم الإيصال</span>
    <code class="receipt-code mono ltr" id="receipt-code" dir="ltr">${esc(receipt)}</code>
  </div>

  <dl class="receipt-meta">
    <div><dt>${icon('ballot', 15)} الانتخابات</dt><dd>${esc(electionTitle)}</dd></div>
    <div><dt>${icon('calendar', 15)} التاريخ والوقت</dt><dd>${fmtDate(castAt)}</dd></div>
    <div><dt>${icon('chart', 15)} إجمالي الأصوات المسجّلة</dt><dd>${safeNum(total)} صوتًا</dd></div>
    <div><dt>${icon('shield-check', 15)} حالة التحقق</dt><dd class="ok-text">صالح وقابل للتحقق</dd></div>
  </dl>

  <p class="receipt-privacy">${icon('lock', 14)} لأسباب أمنية لا يظهر الإيصال — ولا أي جهة أخرى — المرشح الذي اخترته.</p>

  <div class="receipt-actions">
    <button class="btn btn-primary" id="btn-copy" type="button">${icon('copy', 16)} نسخ رقم الإيصال</button>
    <a class="btn btn-outline" href="/verify-receipt?code=${esc(receipt)}">${icon('shield-check', 16)} التحقق من الإيصال</a>
    <a class="btn btn-ghost" href="/">العودة للرئيسية</a>
  </div>
</section>

<section class="section row-center">
  <a class="btn btn-outline btn-lg" href="/results">${icon('chart', 17)} متابعة النتائج</a>
  <button class="btn btn-ghost" type="button" onclick="window.print()">${icon('receipt', 16)} طباعة الإيصال</button>
</section>`;
}

/* ================================================================== التحقق من إيصال */
function receiptLookupPage({ code = '', result = null }) {
  const r = result || {};
  const states = {
    found: `<div class="verify-result is-valid" role="status">
      <span class="vr-ic">${icon('check-circle', 26)}</span>
      <div><b>إيصال صالح</b><p>تم تسجيل هذا الصوت في <b>${esc(r.election_title || 'الانتخابات')}</b> بتاريخ ${fmtDate(r.cast_at)}.</p></div>
    </div>`,
    notfound: `<div class="verify-result is-notfound" role="status">
      <span class="vr-ic">${icon('question-circle', 26)}</span>
      <div><b>الإيصال غير موجود</b><p>لا يوجد صوت مسجّل بهذا الرقم — راجع رقم الإيصال وحاول مرة أخرى.</p></div>
    </div>`,
    bad: `<div class="verify-result is-invalid" role="status">
      <span class="vr-ic">${icon('x-circle', 26)}</span>
      <div><b>إيصال غير صالح</b><p>صيغة رقم الإيصال غير صحيحة — الصيغة الصحيحة مثل <span class="mono ltr">ABCDE-23456</span>.</p></div>
    </div>`,
  };
  return `
<section class="page-head center">
  <span class="lookup-seal" aria-hidden="true">${icon('shield-check', 26)}</span>
  <h1>تحقق من إيصال التصويت</h1>
  <p class="muted">أدخل رقم الإيصال الذي حصلت عليه بعد التصويت للتأكد من تسجيل صوتك — دون كشف اختيارك.</p>
</section>
<form class="card form-card narrow-card lookup-card" method="get" action="/verify-receipt">
  <div class="field">
    <label for="code">أدخل رقم الإيصال</label>
    <input id="code" name="code" value="${esc(code)}" placeholder="ABCDE-23456" class="mono ltr" autocomplete="off" spellcheck="false" required>
  </div>
  <div class="form-actions">
    <button class="btn btn-primary btn-lg btn-block" type="submit">${icon('search', 17)} تحقق</button>
  </div>
</form>
${r.kind ? `<section class="section">${states[r.kind] || ''}</section>` : ''}`;
}

/* ================================================================== النتائج */
function resultsPage({ data, elections, electionId }) {
  /* لا بيانات إطلاقًا */
  if (!data) {
    return `
<section class="page-head center"><h1>النتائج</h1></section>
<div class="empty-state">
  <span class="empty-ic">${icon('chart', 26)}</span>
  <h3>لا توجد نتائج متاحة حاليًا</h3>
  <p class="muted">لم يُنشأ أي استحقاق انتخابي بعد — عودا لاحقًا.</p>
</div>`;
  }

  const switcher = (elections && elections.length > 1) ? `
  <div class="election-switcher" role="navigation" aria-label="اختيار الانتخابات">
    ${elections.map((e) => `<a class="switch-chip${String(e.id) === String(electionId) ? ' active' : ''}" href="/results?e=${esc(e.id)}" ${String(e.id) === String(electionId) ? 'aria-current="true"' : ''}>${esc(e.title)}</a>`).join('')}
  </div>` : '';

  /* الاقتراع مفتوح للجمهور: النتائج التفصيلية مخفية عمدًا */
  if (data.hidden) {
    return `
<section class="page-head">
  <span class="eyebrow">لوحة النتائج</span>
  <h1>${esc(data.election.title)}</h1>
  <p class="muted">${esc(data.election.description || '')}</p>
  ${stateChip(data.state)}
</section>
${switcher}
<section class="stats-grid" aria-label="مؤشرات عامة">
  <div class="stat-box"><b>${safeNum(data.total_ballots)}</b><span>إجمالي الأصوات المسجّلة</span></div>
  <div class="stat-box"><b>${safeNum(data.participants)}</b><span>ناخبًا مُتحقَّقًا من هويته</span></div>
  <div class="stat-box"><b>${fmtPct(data.turnout)}</b><span>نسبة المشاركة</span></div>
  <div class="stat-box"><b>—</b><span>التفاصيل بعد إغلاق الاقتراع</span></div>
</section>
<div class="empty-state">
  <span class="empty-ic">${icon('clock', 26)}</span>
  <h3>لا توجد نتائج متاحة حاليًا</h3>
  <p class="muted">التصويت جارٍ — تُنشر النتائج التفصيلية لجميع المرشحين بعد إغلاق الاقتراع ضمانًا لعدالة الفرز.</p>
</div>`;
  }

  const sorted = [...(data.candidates || [])].sort((a, b) => safeNum(b.votes) - safeNum(a.votes));
  const maxVotes = Math.max(1, ...sorted.map((c) => safeNum(c.votes)));
  const rows = sorted.map((c, idx) => {
    const { role, symbolText, symbolSvg } = parseSlogan(c.slogan, (safeNum(c.sort, idx + 1)) - 1);
    const photo = candPhoto(c, idx);
    const votes = safeNum(c.votes);
    const pctRaw = maxVotes > 0 ? (votes / maxVotes) * 100 : 0;
    const pctShown = safeNum(c.percent);
    const isLeader = idx === 0 && votes > 0;
    return `
    <div class="result-row${isLeader ? ' is-leader' : ''}">
      <div class="result-rank">${idx + 1}</div>
      <img class="result-photo" src="${esc(photo)}" alt="صورة المرشح ${esc(c.name)}" loading="lazy" width="52" height="52">
      <div class="result-body">
        <div class="result-top">
          <div class="result-who">
            <b>${esc(c.name)}</b>
            ${isLeader ? `<span class="leader-pill">${icon('check-circle', 12)} الأعلى أصواتًا</span>` : ''}
            <span class="result-meta">${esc(role)} · ${symbolSvg} ${esc(symbolText)}</span>
          </div>
          <div class="result-nums">
            <b>${fmtPct(pctShown)}</b>
            <span>${safeNum(votes)} صوت</span>
          </div>
        </div>
        <div class="result-bar" role="img" aria-label="${esc(c.name)}: ${fmtPct(pctShown)}">
          <span style="width:${Math.max(2, Math.min(100, pctRaw))}%"></span>
        </div>
      </div>
    </div>`;
  }).join('');

  return `
<section class="page-head">
  <span class="eyebrow">لوحة النتائج</span>
  <h1>${esc(data.election.title)}</h1>
  <p class="muted">${esc(data.election.description || '')}</p>
  <div class="page-head-meta">${stateChip(data.state)}</div>
</section>
${switcher}
<section class="stats-grid" aria-label="مؤشرات الانتخابات">
  <div class="stat-box"><b>${safeNum(data.total_ballots)}</b><span>إجمالي الأصوات</span></div>
  <div class="stat-box"><b>${safeNum(data.total_ballots)}</b><span>الأصوات الصحيحة</span></div>
  <div class="stat-box"><b>${safeNum(data.participants)}</b><span>ناخبًا مُتحقَّقًا منهم</span></div>
  <div class="stat-box"><b>${fmtPct(data.turnout)}</b><span>نسبة المشاركة</span></div>
</section>

<section class="section">
  <div class="section-head">
    <h2>توزيع الأصوات على المرشحين</h2>
    <a class="btn btn-outline" href="/register?e=${esc(data.election.id)}">${icon('vote-check', 16)} شارك في التصويت</a>
  </div>
  ${sorted.length ? `<div class="results-list">${rows}</div>` : `
  <div class="empty-state">
    <span class="empty-ic">${icon('chart', 26)}</span>
    <h3>لا توجد نتائج متاحة حاليًا</h3>
    <p class="muted">لم تُسجَّل أي أصوات بعد في هذا الاستحقاق.</p>
  </div>`}
</section>`;
}

/* ================================================================== صفحات مساعدة */
function reviewStatusPage({ reviewId, review }) {
  const box = {
    pending: `<div class="verify-result is-pending" role="status"><span class="vr-ic">${icon('clock', 26)}</span><div><b>طلبك قيد المراجعة</b><p>لجنة الإشراف تراجع الصور يدويًا — حدّث الصفحة بعد قليل.</p></div></div>`,
    approved: `<div class="verify-result is-valid" role="status"><span class="vr-ic">${icon('check-circle', 26)}</span><div><b>تمت الموافقة</b><p>يمكنك الدخول لورقة الاقتراع الآن.</p></div></div>
      <div class="row-center"><button class="btn btn-primary btn-lg" id="btn-claim-token">الدخول للاقتراع ${icon('arrow', 17)}</button></div>`,
    rejected: `<div class="verify-result is-invalid" role="status"><span class="vr-ic">${icon('x-circle', 26)}</span><div><b>تم رفض الطلب</b><p>لم تتطابق صورة الوجه مع البطاقة المسجّلة. يمكنك المحاولة مرة أخرى.</p></div></div>
      <div class="row-center"><a class="btn btn-primary" href="/verify">إعادة المحاولة</a></div>`,
  }[review.status] || `<p class="muted">حالة غير معروفة.</p>`;
  return `<section class="page-head center"><h1>حالة طلب المراجعة</h1><p class="muted mono ltr">#${esc(reviewId)}</p></section>
  <section class="card review-card" id="review-card" data-review="${esc(reviewId)}">${box}</section>`;
}

function kioskPage({ elections }) {
  return `
<section class="page-head">
  <span class="eyebrow">منصة الاقتراع المشتركة</span>
  <h1>نقطة الاقتراع داخل اللجنة</h1>
  <p class="muted">يُفرَّغ حساب الناخب تلقائيًا عقب كل صوت ليبدأ الناخب التالي من الصفر.</p>
</section>
<div class="cards-grid">
  ${(elections || []).map((e) => `
    <article class="card kiosk-card">
      <div class="kiosk-head">${stateChip(e.state)}</div>
      <h3>${esc(e.title)}</h3>
      <p class="muted">${esc(e.description || '')}</p>
      <a class="btn btn-primary btn-block-mobile" href="/register?e=${esc(e.id)}&kiosk=1">${icon('vote-check', 16)} بدء تصويت ناخب جديد</a>
    </article>`).join('') || `<div class="empty-state"><span class="empty-ic">${icon('ballot', 26)}</span><h3>لا توجد انتخابات متاحة</h3></div>`}
</div>`;
}

function alreadyVotedPage() {
  return `<section class="page-head center">
  <span class="warn-seal" aria-hidden="true">${icon('alert', 30)}</span>
  <h1>سبق لك الإدلاء بصوتك</h1>
  <p class="muted">لا يسمح النظام بالتصويت أكثر من مرة واحدة لنفس الهوية في هذه الانتخابات.</p>
  <div class="row-center">
    <a class="btn btn-primary" href="/results">${icon('chart', 16)} النتائج</a>
    <a class="btn btn-outline" href="/verify-receipt">${icon('shield-check', 16)} التحقق من إيصالك</a>
  </div>
</section>`;
}

function errorPage(msg) {
  return `<section class="page-head center">
  <span class="warn-seal" aria-hidden="true">${icon('alert', 30)}</span>
  <h1>تعذّر إتمام الطلب</h1>
  <p class="muted">${esc(msg || 'الصفحة المطلوبة غير متوفرة')}</p>
  <div class="row-center">
    <a class="btn btn-primary" href="/">العودة للرئيسية</a>
    <a class="btn btn-outline" href="/verify-receipt">التحقق من إيصال</a>
  </div>
</section>`;
}

module.exports = {
  landing, registerPage, otpPage, verifyPage, votePage, receiptPage, receiptLookupPage,
  resultsPage, reviewStatusPage, kioskPage, alreadyVotedPage, errorPage,
  fmtDate, stateChip, STATE_LABEL, safeNum, fmtPct,
};
