'use strict';
/** صفحات الجمهور — تصميم رسمي نظيف خالٍ من كليشيهات الذكاء الاصطناعي */
const { shell, esc, icon, WINGED_SUN } = require('./layout');

const STATE_LABEL = {
  open: 'التصويت متاح حاليًا',
  closed: 'انتهى وقت التصويت',
  scheduled: 'لم يبدأ بعد',
  draft: 'مسودة',
  missing: 'غير متاح',
};

function stateChip(state) {
  return `<span class="status-badge state-${state}"><span class="status-dot"></span>${esc(STATE_LABEL[state] || state)}</span>`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short', calendar: 'gregory', numberingSystem: 'latn' }).format(new Date(iso));
  } catch { return String(iso).slice(0, 16).replace('T', ' '); }
}

/** استخراج اللقب المهني والرمز الانتخابي مع أيقونة فيكتور رسمية */
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
    symbolSvg: `<svg class="sym-ic" width="18" height="18" aria-hidden="true"><use href="#${symId}"/></svg>`,
  };
}

const ARABIC_NUMS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toArNum(n) {
  return String(n).replace(/\d/g, (d) => ARABIC_NUMS[Number(d)]);
}

/* ------------------------------------------------------------------ الرئيسية */
function landing({ elections, demo, counts }) {
  const mainElection = elections.find((e) => e.state === 'open') || elections[0] || null;
  const mainCandidates = (mainElection && mainElection.candidates) || [];

  const candidateCards = mainCandidates.map((c, idx) => {
    const { role, symbolText, symbolSvg } = parseSlogan(c.slogan, idx);
    const photo = c.photo_url || `/candidates/c${(idx % 4) + 1}.jpg`;
    return `
      <article class="official-cand-card">
        <div class="oc-header">
          <span class="oc-number">المرشح رقم (${toArNum(idx + 1)})</span>
          <span class="oc-symbol">${symbolSvg} <b>${esc(symbolText)}</b></span>
        </div>
        <div class="oc-profile">
          <img class="oc-photo" src="${esc(photo)}" alt="${esc(c.name)}" loading="lazy">
          <div class="oc-titles">
            <h3 class="oc-name">${esc(c.name)}</h3>
            <span class="oc-role">${esc(role)}</span>
          </div>
        </div>
        <p class="oc-program">${esc(c.program || '')}</p>
        <div class="oc-footer">
          <div class="oc-votes-bar">
            <div class="oc-votes-meta">
              <span>الأصوات المسجّلة حتى الآن</span>
              <b>${c.votes || 0} صوت (${c.percent || 0}%)</b>
            </div>
            <div class="oc-track"><span style="width:${Math.max(4, c.percent || 0)}%"></span></div>
          </div>
          <a class="btn primary full" href="/register?e=${esc(mainElection.id)}">التصويت لهذا المرشح</a>
        </div>
      </article>`;
  }).join('');

  return `
<section class="official-banner">
  <div class="ob-content">
    <div class="ob-meta-row">
      ${mainElection ? stateChip(mainElection.state) : ''}
      <span class="ob-date">الفترة المقررة: حتى ٣٠ أكتوبر ٢٠٢٦</span>
    </div>
    <h1 class="ob-title">${mainElection ? esc(mainElection.title) : 'الانتخابات العامة لرئاسة المجلس الوطني ٢٠٢٦'}</h1>
    <p class="ob-lead">البوابة الرسمية المخصّصة لتصويت المواطنين إلكترونيًا باستخدام بطاقة الرقم القومي السارية ومطابقة الصورة الشخصية عبر الكاميرا المباشرة.</p>
    <div class="ob-actions">
      <a class="btn primary lg" href="/register${mainElection ? `?e=${esc(mainElection.id)}` : ''}">الدخول لبدء التصويت</a>
      <a class="btn ghost lg" href="#candidates-section">الاطلاع على المرشحين</a>
      <a class="btn ghost lg" href="/results">متابعة نتائج الفرز</a>
    </div>
  </div>
  <div class="ob-summary-box">
    <div class="ob-summary-head">بيانات الاستحقاق الانتخابي</div>
    <dl class="ob-summary-list">
      <div>
        <dt>عدد المرشحين بالقائمة النهائية</dt>
        <dd>${toArNum(counts.candidates || 4)} مرشحين</dd>
      </div>
      <div>
        <dt>إجمالي الأصوات الصحيحة بالصندوق</dt>
        <dd>${toArNum(counts.ballots)} صوتًا</dd>
      </div>
      <div>
        <dt>نظام الاقتراع</dt>
        <dd>انتخاب فردي مباشر (صوت واحد)</dd>
      </div>
      <div>
        <dt>المستند المطلوب</dt>
        <dd>بيانات بطاقة الرقم القومي + صورة الوجه</dd>
      </div>
    </dl>
  </div>
</section>

<section class="steps-strip">
  <div class="strip-item">
    <span class="strip-num">١</span>
    <div>
      <b>إدخال بيانات الرقم القومي</b>
      <p>كتابة الاسم الرباعي والرقم القومي لمطابقتها مع البطاقة المحفوظة في السجل المدني.</p>
    </div>
  </div>
  <div class="strip-item">
    <span class="strip-num">٢</span>
    <div>
      <b>التحقق من صاحب البطاقة بالكاميرا</b>
      <p>التقاط صورة مباشرة للوجه ومقارنتها آليًا بصورة البطاقة لمنع انتحال الصفة.</p>
    </div>
  </div>
  <div class="strip-item">
    <span class="strip-num">٣</span>
    <div>
      <b>التأشير في ورقة الاقتراع واستلام الإيصال</b>
      <p>اختيار مرشح واحد فقط بسرية تامة والحصول على رقم إيصال رسمي للاستعلام.</p>
    </div>
  </div>
</section>

<section class="section" id="candidates-section">
  <div class="section-head">
    <div>
      <h2>القائمة النهائية للمرشحين ورموزهم الانتخابية</h2>
      <p class="muted">مرتبة بحسب رقم القيد في كشف المرشحين المعتمد للدورة ٢٠٢٦ / ٢٠٣٠</p>
    </div>
    <a class="btn ghost" href="/results">عرض جدول الفرز التفصيلي ←</a>
  </div>

  <div class="candidates-grid-official">
    ${candidateCards}
  </div>
</section>`;
}

/* ------------------------------------------------------------------ التسجيل */
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
  <h1>الاستعلام وتسجيل بيانات الناخب</h1>
  <p class="muted">أدخل بيانات بطاقة الرقم القومي الخاصة بك للتحقق من قيدك في قاعدة بيانات الناخبين والانتقال إلى فحص الكاميرا.</p>
</section>

<div class="register-layout">
  <form id="register-form" class="card form-card" autocomplete="off" novalidate>
    <input type="hidden" name="election_id" value="${election ? esc(election.id) : '1'}">

    <div class="sample-autofill-bar">
      <div class="sample-autofill-info">
        <b>بطاقات مسجّلة في قاعدة البيانات للتجربة المباشرة (${toArNum(storedCards.length)})</b>
        <span class="small muted">اضغط على اسم صاحب البطاقة لملء بياناته تلقائيًا:</span>
      </div>
      <div class="row" style="margin-top:8px">
        ${storedCards.map((c, idx) => `
          <button type="button" class="btn ${idx === 0 ? 'primary' : 'ghost'} small btn-fill-card"
             ${idx === 0 ? 'id="btn-fill-sample-card"' : ''}
            data-name="${esc(c.full_name)}"
            data-nid="${esc(c.national_id_plain)}"
            data-dob="${esc(String(c.birth_date || '2010-05-29').slice(0, 10))}"
            data-gov="${esc(c.governorate || 'أسيوط')}"
            data-phone="01012345678">
            ${esc(c.full_name)} (<span class="mono">${esc(c.national_id_plain)}</span>)
          </button>
        `).join('')}
      </div>
    </div>

    <div class="field">
      <label for="full_name">الاسم الكامل (كما هو مدوّن بالبطاقة)</label>
      <input id="full_name" name="full_name" type="text" placeholder="اكتب الاسم رباعيًا" required>
    </div>

    <div class="grid-2">
      <div class="field">
        <label for="national_id">الرقم القومي (١٤ رقمًا)</label>
        <input id="national_id" name="national_id" class="mono" type="text" inputmode="numeric" placeholder="31005292501518" maxlength="14" required>
        <small class="hint" id="nid-hint">يتم قراءة تاريخ الميلاد والمحافظة تلقائيًا من الرقم القومي</small>
      </div>
      <div class="field">
        <label for="birth_date">تاريخ الميلاد</label>
        <input id="birth_date" name="birth_date" type="date" required>
        <small class="hint" id="dob-hint"></small>
      </div>
    </div>

    <div class="grid-2">
      <div class="field">
        <label for="governorate">المحافظة</label>
        <select id="governorate" name="governorate" required>
          <option value="">اختر المحافظة</option>
          ${govOptions.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="phone">رقم الهاتف المحمول</label>
        <input id="phone" name="phone" class="mono" type="tel" inputmode="numeric" placeholder="01012345678" maxlength="11" required>
      </div>
    </div>

    <div class="nid-preview" id="nid-preview" hidden>
      <span class="badge">النوع: <b id="np-gender">—</b></span>
      <span class="badge">تاريخ الميلاد: <b id="np-dob">—</b></span>
      <span class="badge">المحافظة: <b id="np-gov">—</b></span>
    </div>

    <label class="consent">
      <input type="checkbox" name="consent" id="consent" checked required>
      <span>أقرّ بصحة البيانات المدخلة وأوافق على مطابقة صورة الوجه مع بطاقة الرقم القومي المسجّلة للتحقق من الهوية.</span>
    </label>

    <div class="form-actions">
      <button class="btn primary lg" type="submit">متابعة إلى فحص الكاميرا ←</button>
      <a class="btn ghost" href="/">رجوع</a>
    </div>
    <p class="form-error" id="form-error" role="alert" hidden></p>
  </form>

  <aside class="register-side-card">
    <h3>نموذج البطاقة المسجّلة</h3>
    <p class="muted small">يستدعي النظام صورة البطاقة المحفوظة في السجل المدني لمقارنتها بصورة الكاميرا في الخطوة التالية:</p>
    <div class="mini-id-preview">
      <img src="/cards/31005292501518.jpg" alt="بطاقة الرقم القومي">
    </div>
    <ul class="ticks">
      <li>لا يُطلب منك تصوير أو رفع البطاقة الورقية.</li>
      <li>الانتقال مباشر إلى الكاميرا بدون رسائل نصية.</li>
      <li>يُرفض التصويت تلقائيًا إذا كانت صورة الكاميرا لشخص آخر.</li>
    </ul>
  </aside>
</div>`;
}

function otpPage() {
  return `<section class="page-head"><h1>تم تخطي هذه الخطوة</h1><p><a class="btn primary" href="/verify">المتابعة إلى التحقق من الوجه</a></p></section>`;
}

/* ------------------------------------------------------------------ التحقق */
function verifyPage({ voter, election, demo, rollCard }) {
  const cardImg = (rollCard && rollCard.card_image) || '/cards/31005292501518.jpg';
  const faceImg = (rollCard && rollCard.face_image) || '/cards/31005292501518-face.jpg';
  const hasStoredCard = !!(rollCard && rollCard.card_image);
  return `
<section class="page-head">
  <div class="verify-top-strip">
    <div>
      <h1>مطابقة صورة الوجه مع بطاقة الرقم القومي</h1>
      <p class="muted">الناخب: <b>${esc(voter.full_name)}</b> · الرقم القومي: <span class="mono">${esc(voter.national_id_masked)}</span></p>
    </div>
    <div class="ai-engine-pill" id="ai-engine-badge">
      <span class="status-dot"></span>
      <span id="ai-engine-text">جاري تجهيز وحدة مطابقة الوجه…</span>
    </div>
  </div>
</section>

<div id="verify-app" class="verify-app card" data-demo="${demo ? '1' : '0'}" data-has-db-card="1">
  <canvas id="canvas" hidden></canvas>
  <img id="db-face-ref" src="${esc(faceImg)}" crossorigin="anonymous" alt="" hidden>

  <div class="v-step" data-step="selfie">
    <div class="verify-grid">
      <div class="db-card-box">
        <div class="db-verified-header">
          <span class="status-badge state-open"><span class="status-dot"></span> بيانات السجل المدني مطابقة</span>
        </div>

        <div class="db-face-summary">
          <img class="db-face-avatar" src="${esc(faceImg)}" crossorigin="anonymous" alt="صورة صاحب البطاقة">
          <div>
            <b>${esc(voter.full_name)}</b>
            <span class="muted small" style="display:block">محافظة ${esc(voter.governorate || 'أسيوط')} · مواليد ${esc(String(voter.birth_date || '2010-05-29').slice(0, 10))}</span>
            ${rollCard && rollCard.address ? `<span class="muted small" style="display:block">${esc(rollCard.address)}</span>` : ''}
          </div>
        </div>

        ${hasStoredCard ? `<img id="db-card-img" src="${esc(cardImg)}" crossorigin="anonymous" alt="بطاقة الرقم القومي المسجّلة">` : `<div class="notice ok">بيانات البطاقة موثّقة في السجل</div>`}
      </div>

      <div class="camera-studio-box">
        <div class="studio-head">
          <div>
            <h2 style="margin:0;font-size:1.15rem">الكاميرا المباشرة</h2>
            <p class="muted small" style="margin:4px 0 0">ضع وجهك في منتصف الإطار واضغط «التقاط الصورة»، أو اختر صورة واضحة لوجهك من الجهاز</p>
          </div>
          <span class="cam-status-pill" id="cam-status">جاري فتح الكاميرا…</span>
        </div>

        <ol class="challenge-list" id="challenge-list"></ol>

        <div class="camera-frame selfie" id="camera-frame-box">
          <video id="video-selfie" playsinline autoplay muted></video>
          <div class="frame-guide face-guide" id="face-guide-box">
            <span id="face-guide-label">ضع وجهك في منتصف الإطار</span>
          </div>
          <div class="liveness-meter"><span id="liveness-bar"></span></div>
        </div>

        <div class="studio-controls">
          <button class="btn primary lg" type="button" id="btn-capture-selfie">${icon('camera', 18)} التقاط الصورة</button>
          <button class="btn ghost" type="button" id="btn-use-selfie-file">رفع صورة من الجهاز</button>
          <button class="btn ghost small" type="button" id="btn-start-camera">إعادة فتح الكاميرا</button>
          <button class="btn ghost small" type="button" id="btn-switch-cam">تبديل الكاميرا</button>
          <input type="file" id="selfie-file" accept="image/*" hidden>
        </div>

        <p class="form-error" id="verify-error" role="alert" hidden></p>

        <div class="captured" id="selfie-preview" hidden>
          <div class="captured-head">
            <b>الصورة الملتقطة للمطابقة</b>
          </div>
          <img id="selfie-img" alt="صورة الوجه">
          <div class="captured-actions">
            <button class="btn primary lg" type="button" id="btn-selfie-ok">بدء مطابقة الوجه مع البطاقة ←</button>
            <button class="btn ghost" type="button" id="btn-selfie-retake">إعادة الالتقاط</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="v-step" data-step="processing" hidden>
    <div class="processing">
      <div class="spinner"></div>
      <h2 id="processing-title">جاري مطابقة ملامح الوجه مع صورة البطاقة…</h2>
      <ul class="progress-list" id="progress-list">
        <li data-k="card">قراءة الصورة المرجعية من بطاقة الرقم القومي</li>
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

/* ------------------------------------------------------------------ الاقتراع */
function votePage({ election, candidates, voter, kiosk }) {
  const items = candidates.map((c, idx) => {
    const { role, symbolText, symbolSvg } = parseSlogan(c.slogan, idx);
    const photo = c.photo_url || `/candidates/c${(idx % 4) + 1}.jpg`;
    return `
    <label class="ballot-cand-card">
      <input type="radio" name="candidate_id" value="${esc(c.id)}" required>
      <div class="ballot-card-inner">
        <div class="ballot-card-top">
          <span class="ballot-num">مسلسل (${toArNum(idx + 1)})</span>
          <span class="ballot-symbol">${symbolSvg} <b>${esc(symbolText)}</b></span>
        </div>
        <div class="ballot-person">
          <img class="ballot-avatar" src="${esc(photo)}" alt="${esc(c.name)}">
          <div class="ballot-person-info">
            <b class="ballot-name">${esc(c.name)}</b>
            <span class="ballot-role">${esc(role)}</span>
          </div>
        </div>
        ${c.program ? `<p class="ballot-program">${esc(c.program)}</p>` : ''}
        <div class="ballot-select-bar">
          <span class="ballot-radio-indicator">${icon('check', 15)}</span>
          <span class="ballot-select-text">اختيار هذا المرشح</span>
        </div>
      </div>
    </label>`;
  }).join('');

  return `
<section class="page-head">
  <h1>بطاقة الاقتراع الرسمية — ${esc(election.title)}</h1>
  <div class="ballot-voter-banner">
    <div>الناخب: <b>${esc(voter.full_name)}</b> · الرقم القومي: <span class="mono">${esc(voter.national_id_masked)}</span></div>
    <span>سرية التصويت مكفولة — لا يُربط اختيارك ببياناتك الشخصية</span>
  </div>
</section>

<form id="vote-form" class="vote-card" data-election="${esc(election.id)}" data-kiosk="${kiosk ? '1' : '0'}">
  <div class="ballot-sheet-header">
    <div>
      <h2 style="margin:0">اختر مرشحًا واحدًا فقط</h2>
      <p class="muted small" style="margin:4px 0 0">اضغط على خانة المرشح المطلوب ثم اضغط «تأكيد وتسجيل الصوت» أسفل الورقة</p>
    </div>
  </div>

  <div class="ballot-grid">${items}</div>

  <div class="vote-actions-bar">
    <span class="muted small">لا يمكن تعديل الاختيار أو التصويت مرة أخرى بعد اعتماد الورقة.</span>
    <div class="row">
      <a class="btn ghost" href="/">إلغاء</a>
      <button class="btn primary lg" type="submit">تأكيد وتسجيل الصوت النهائي ←</button>
    </div>
  </div>
  <p class="form-error" id="vote-error" role="alert" hidden></p>
</form>

<dialog id="confirm-dialog" class="confirm">
  <h3>تأكيد اختيار المرشح</h3>
  <p>أنت على وشك تسجيل صوتك رسميًا لصالح المرشح:<br><b id="confirm-name" class="confirm-cand-highlight">—</b></p>
  <p class="muted small">هل تؤكد إيداع ورقة الاقتراع في الصندوق؟</p>
  <div class="row" style="justify-content:center;margin-top:18px">
    <button class="btn primary lg" id="confirm-yes">نعم، تسجيل الصوت</button>
    <button class="btn ghost" id="confirm-no">تعديل الاختيار</button>
  </div>
</dialog>`;
}

/* ------------------------------------------------------------------ الإيصال */
function receiptPage({ receipt, electionTitle, total, castAt }) {
  return `
<section class="page-head center">
  <div class="seal">${icon('check', 34)}</div>
  <h1>تم تسجيل صوتك بنجاح</h1>
  <p class="muted">تم احتساب صوتك في <b>${esc(electionTitle)}</b> دون ربطه ببياناتك الشخصية.</p>
</section>

<section class="card receipt">
  <h2>إيصال إثبات التصويت</h2>
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
  <h1>الاستعلام عن إيصال التصويت</h1>
  <p class="muted">أدخل رقم الإيصال الذي حصلت عليه بعد التصويت للتأكد من احتساب صوتك.</p>
</section>
<form class="card form-card" method="get" action="/verify-receipt">
  <div class="field">
    <label for="code">رقم الإيصال</label>
    <input id="code" name="code" value="${esc(code)}" placeholder="ABCDE-12345" class="mono" required>
  </div>
  <div class="form-actions"><button class="btn primary lg" type="submit">استعلام</button></div>
</form>
${r.kind ? `<section class="section">${map[r.kind] || ''}</section>` : ''}`;
}

/* ------------------------------------------------------------------ النتائج */
function resultsPage({ data, elections, electionId }) {
  if (!data) {
    return `<section class="page-head"><h1>نتائج الفرز</h1></section><p class="muted">لا توجد بيانات متاحة حاليًا.</p>`;
  }

  const sorted = [...data.candidates].sort((a, b) => (b.votes || 0) - (a.votes || 0));
  const rows = sorted.map((c, idx) => {
    const { role, symbolText, symbolSvg } = parseSlogan(c.slogan, (c.sort || idx + 1) - 1);
    const photo = c.photo_url || `/candidates/c${((c.sort || idx + 1) - 1) % 4 + 1}.jpg`;
    const isLeader = idx === 0 && (c.votes || 0) > 0 && !data.hidden;
    return `
    <div class="result-cand-row ${isLeader ? 'leader' : ''}">
      <div class="res-cand-rank">${toArNum(idx + 1)}</div>
      <img class="res-cand-photo" src="${esc(photo)}" alt="${esc(c.name)}">
      <div class="res-cand-body">
        <div class="res-cand-top">
          <div>
            <b class="res-cand-name">${esc(c.name)}</b>
            ${isLeader ? `<span class="leader-pill">الأول في الفرز</span>` : ''}
            <span class="res-cand-meta">${esc(role)} · <span class="inline-sym">${symbolSvg} ${esc(symbolText)}</span></span>
          </div>
          <div class="res-cand-numbers">
            <b>${c.percent}%</b> <span>(${toArNum(c.votes)} صوت)</span>
          </div>
        </div>
        <div class="bar"><span style="width:${Math.max(3, c.percent)}%"></span></div>
      </div>
    </div>`;
  }).join('');

  return `
<section class="page-head">
  <h1>نتائج الفرز — ${esc(data.election.title)}</h1>
  <p class="muted">${esc(data.election.description || '')}</p>
</section>

<section class="stats-row">
  <div class="stat">
    <b>${toArNum(data.total_ballots)}</b>
    <span>إجمالي الأصوات الصحيحة</span>
  </div>
  <div class="stat">
    <b>${toArNum(data.candidates.length)}</b>
    <span>عدد المرشحين</span>
  </div>
  <div class="stat">
    <b>${toArNum(data.participants || data.total_ballots)}</b>
    <span>ناخبين مسجّلين</span>
  </div>
</section>

<section class="section">
  <div class="section-head">
    <h2>بيان توزيع الأصوات على المرشحين</h2>
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
    ${elections.map((e) => `
      <article class="card">
        <h3>${esc(e.title)}</h3>
        <p class="muted">${esc(e.description || '')}</p>
        <a class="btn primary" href="/register?e=${e.id}&kiosk=1">بدء تصويت ناخب جديد</a>
      </article>`).join('')}
  </div>
</section>`;
}

function alreadyVotedPage() {
  return `<section class="page-head center">
  <div class="seal warn">${icon('warn', 32)}</div>
  <h1>سبق لك الإدلاء بصوتك في هذه الانتخابات</h1>
  <p class="muted">لا يسمح النظام بالتصويت أكثر من مرة واحدة لنفس الرقم القومي.</p>
  <div class="row center-row"><a class="btn primary" href="/results">مشاهدة نتائج الفرز</a><a class="btn ghost" href="/verify-receipt">الاستعلام عن إيصالك</a></div>
</section>`;
}

function errorPage(msg) {
  return `<section class="page-head center">
  <div class="seal warn">${icon('warn', 32)}</div>
  <h1>تنبيه</h1>
  <p class="muted">${esc(msg || 'الصفحة المطلوبة غير متوفرة')}</p>
  <div class="row center-row"><a class="btn primary" href="/">العودة للرئيسية</a></div>
</section>`;
}

module.exports = {
  landing, registerPage, otpPage, verifyPage, votePage, receiptPage, receiptLookupPage,
  resultsPage, reviewStatusPage, kioskPage, alreadyVotedPage, errorPage,
  fmtDate, stateChip, STATE_LABEL,
};
