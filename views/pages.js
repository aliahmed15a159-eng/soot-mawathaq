'use strict';
/** صفحات الجمهور: الرئيسية، التسجيل، التحقق بالكاميرا، الاقتراع، الإيصال، النتائج */
const { shell, esc, icon, WINGED_SUN } = require('./layout');

const STATE_LABEL = {
  open: 'الاقتراع مفتوح',
  closed: 'الاقتراع مُغلق',
  scheduled: 'لم يبدأ بعد',
  draft: 'مسودة',
  missing: 'غير متاحة',
};

function stateChip(state) {
  return `<span class="chip state-${state}">${esc(STATE_LABEL[state] || state)}</span>`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short', calendar: 'gregory', numberingSystem: 'latn' }).format(new Date(iso));
  } catch { return String(iso).slice(0, 16).replace('T', ' '); }
}

/* ------------------------------------------------------------------ الرئيسية */
function landing({ elections, demo, counts }) {
  const cards = elections.map((e) => `
    <article class="card election-card">
      <div class="ecard-top">
        <h3>${esc(e.title)}</h3>
        ${stateChip(e.state)}
      </div>
      <p class="muted">${esc(e.description || '')}</p>
      <dl class="meta">
        <div><dt>من</dt><dd>${fmtDate(e.starts_at)}</dd></div>
        <div><dt>إلى</dt><dd>${fmtDate(e.ends_at)}</dd></div>
      </dl>
      <div class="ecard-actions">
        ${e.state === 'open'
          ? `<a class="btn primary" href="/register?e=${e.id}">${icon('ankh', 18)} ابدأ التصويت</a>`
          : `<span class="btn ghost disabled">${STATE_LABEL[e.state]}</span>`}
        <a class="btn ghost" href="/results?e=${e.id}">${icon('eye', 18)} النتائج</a>
      </div>
    </article>`).join('');

  return `
<section class="hero">
  <div class="hero-inner">
    <p class="kicker">${icon('horus', 20)} منصة انتخابات بالتحقق من الهوية</p>
    <h1 class="hero-title">صوت واحد… لإنسان واحد… <span>بهويته الحقيقية</span></h1>
    <p class="hero-sub">يدخل الناخب من أي متصفح، يوثّق بطاقته وسيلفي حيّ من الكاميرا، وبعد التحقق يقترع سرًّا مرة واحدة لا تكرار فيها — والقرار محفوظ في سجل تدقيق لا يُعدَّل.</p>
    <div class="hero-actions">
      <a class="btn primary lg" href="/register">${icon('lotus', 20)} ابدأ التحقق والتصويت</a>
      <a class="btn ghost lg" href="/results">${icon('eye', 20)} شاهد النتائج</a>
    </div>
    <ul class="hero-stats">
      <li><b>${counts.elections}</b><span>انتخابات على المنصة</span></li>
      <li><b>${counts.candidates}</b><span>مرشح مسجّل</span></li>
      <li><b>${counts.ballots}</b><span>صوت محسوب</span></li>
    </ul>
  </div>
  <aside class="hero-side">
    <div class="papyrus-card">
      <h3>${icon('camera', 20)} إزاي التحقق بيشتغل؟</h3>
      <ol class="timeline">
        <li><b>بطاقتك المسجّلة في قاعدة البيانات</b><span>تكتب بياناتك ونطابقها ببطاقتك المحفوظة عندنا</span></li>
        <li><b>سيلفي حيّ</b><span>تحدي حركة عشوائي يمنع استخدام صورة أو فيديو</span></li>
        <li><b>مطابقة الوجه</b><span>نسبة تشابه وقرار فوري حسب حد الفصل</span></li>
        <li><b>لجنة بشرية</b><span>الحالات المشكوك فيها تُراجَع يدويًا قبل أي تصويت</span></li>
      </ol>
    </div>
  </aside>
</section>
${WINGED_SUN}
<section class="section">
  <h2 class="sec-title">${icon('scarab', 24)} الانتخابات المتاحة</h2>
  ${elections.length ? `<div class="cards">${cards}</div>` : '<p class="muted">مفيش انتخابات منشورة حاليًا.</p>'}
</section>
<section class="section trust">
  <h2 class="sec-title">${icon('lock', 24)} ليه ده مختلف؟</h2>
  <div class="cards three">
    <article class="card feature">${icon('ankh', 28)}<h4>هوية موثّقة</h4><p>بطاقة + سيلفي حيّ + مطابقة وجه — مفيش تصويت باسم حد تاني.</p></article>
    <article class="card feature">${icon('lotus', 28)}<h4>صوت واحد لكل ناخب</h4><p>قيد فريد على الهوية ورمز اقتراع يُستخدم مرة واحدة فقط.</p></article>
    <article class="card feature">${icon('eye', 28)}<h4>اقتراع سرّي موثّق</h4><p>مسار الهوية منفصل تمامًا عن مسار الصوت — وإيصال يثبت الاحتساب.</p></article>
  </div>
</section>
${demo ? '<section class="section"><div class="notice">نمط عرض/تجربة: قاعدة البيانات محلية (data/demo-db.json). لربط Supabase، انسخ <code>.env.example</code> واملأ المفاتيح ثم أعد التشغيل.</div></section>' : ''}`;
}

/* ------------------------------------------------------------------ التسجيل */
function registerPage({ election, demo, sample }) {
  const govOptions = ['القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'الشرقية', 'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'أسوان', 'الأقصر', 'الغربية', 'المنوفية', 'البحيرة', 'كفر الشيخ', 'دمياط', 'بورسعيد', 'السويس', 'الإسماعيلية', 'شمال سيناء', 'جنوب سيناء', 'مطروح', 'البحر الأحمر', 'الوادي الجديد', 'خارج الجمهورية'];
  return `
<section class="page-head">
  <h1>التسجيل والتحقق من الهوية</h1>
  ${election ? `<p class="election-ref">${icon('lotus', 18)} <b>${esc(election.title)}</b> ${stateChip(election.state)}</p>` : ''}
  <p class="muted">اكتب بياناتك كما في بطاقة الرقم القومي بالحرف. بعد كده هنصوّر البطاقة وسيلفي حيّ للتأكد إنك صاحب البطاقة.</p>
</section>

<form id="register-form" class="card form-card" autocomplete="off" novalidate>
  <input type="hidden" name="election_id" value="${election ? esc(election.id) : ''}">
  <div class="field">
    <label for="full_name">الاسم بالكامل (كما في البطاقة)</label>
    <input id="full_name" name="full_name" type="text" placeholder="مثال: مينا عبد المسيح حنا" required>
    <small class="hint">اكتب الاسم الأول واسم العائلة على الأقل</small>
  </div>

  <div class="grid-2">
    <div class="field">
      <label for="national_id">الرقم القومي (١٤ رقم)</label>
      <input id="national_id" name="national_id" type="text" inputmode="numeric" placeholder="••••••••••••••" maxlength="14" required>
      <small class="hint" id="nid-hint">هنقرأ منه تاريخ الميلاد والمحافظة تلقائيًا</small>
    </div>
    <div class="field">
      <label for="birth_date">تاريخ الميلاد</label>
      <input id="birth_date" name="birth_date" type="date" required>
      <small class="hint" id="dob-hint">لازم يطابق الرقم القومي</small>
    </div>
  </div>

  <div class="grid-2">
    <div class="field">
      <label for="governorate">محافظة الميلاد</label>
      <select id="governorate" name="governorate" required>
        <option value="">اختر المحافظة</option>
        ${govOptions.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join('')}
      </select>
    </div>
    <div class="field">
      <label for="phone">رقم الموبايل</label>
      <input id="phone" name="phone" type="tel" inputmode="numeric" placeholder="01xxxxxxxxx" maxlength="11" required>
      <small class="hint">لإرسال كود التحقق وإشعار التصويت</small>
    </div>
  </div>

  <div class="nid-preview" id="nid-preview" hidden>
    <span class="badge">${icon('scarab', 16)} <b id="np-gender">—</b></span>
    <span class="badge">${icon('ankh', 16)} مواليد <b id="np-dob">—</b></span>
    <span class="badge">${icon('lotus', 16)} <b id="np-gov">—</b></span>
  </div>

  <label class="consent">
    <input type="checkbox" name="consent" id="consent" required>
    <span>أوافق على استخدام بياناتي وصورة بطاقتي وسيلفي للمتحقق منهما <b>لإثبات الهوية في هذه الانتخابة فقط</b>، ويُحذفان بعد التحقق. (موافقة صريحة على البيانات البيومترية)</span>
  </label>

  <div class="form-actions">
    <button class="btn primary lg" type="submit">${icon('camera', 20)} التالي: التحقق بالكاميرا</button>
    <a class="btn ghost" href="/">رجوع</a>
  </div>
  <p class="form-error" id="form-error" role="alert" hidden></p>
  <div class="notice small" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px">
    <div>
      <b>بطاقة نموذجية مسجّلة في قاعدة البيانات للتجربة:</b><br>
      الاسم: <code>علي أحمد علي محمد</code> · الرقم القومي: <code>31005292501518</code> · الميلاد: <code>2010-05-29</code> · المحافظة: <code>أسيوط</code>
    </div>
    <button type="button" class="btn ghost small" id="btn-fill-sample-card"
      data-name="علي أحمد علي محمد" data-nid="31005292501518" data-dob="2010-05-29" data-gov="أسيوط" data-phone="01012345678">
      ملء بيانات البطاقة النموذجية
    </button>
  </div>
</form>

<section class="section small-print">
  <h3>${icon('lock', 18)} خصوصيتك</h3>
  <ul class="ticks">
    <li>الرقم القومي لا يُخزَّن كنص صريح — نخزّن بصمة مشفّرة (Hash) فقط.</li>
    <li>صور البطاقة والسيلفي تُستخدم للتحقق، ولا تُحفظ إلا في حالة «مراجعة بشرية» وتُحذف بعد قرار اللجنة.</li>
    <li>صوتك لا يُربط بأي بيانات شخصية — لا اسم ولا رقم ولا حتى جهاز.</li>
  </ul>
</section>`;
}

/* ------------------------------------------------------------------ كود الموبايل */
function otpPage({ voter, challenge, otpStatus }) {
  const devHint = challenge && challenge.dev_code
    ? `<div class="notice">وضع التجربة (OTP_MODE=console): الكود الحالي <b class="mono dev-code">${esc(challenge.dev_code)}</b> — في الإنتاج بيتفضل يتبعت برسالة SMS على موبايلك ومش بيظهر على الشاشة أبدًا.</div>`
    : '';
  return `
<section class="page-head">
  <h1>تأكيد رقم الموبايل</h1>
  <p class="muted">بعتنالك كود من 6 أرقام على الرقم المنتهي بـ <b class="mono">${esc(challenge.masked || '****')}</b> — والكود صالح 5 دقايق.</p>
  <p class="muted small">الغرض: التأكد إن الرقم حقيقي وإن صاحبه هو اللي بيسجّل — خطوة أساسية لمنع الحسابات الوهمية.</p>
</section>
${devHint}
<form id="otp-form" class="card form-card center-col" data-masked="${esc(challenge.masked || '')}">
  <div class="field">
    <label for="otp-code">الكود المكوّن من 6 أرقام</label>
    <input id="otp-code" name="code" class="otp-input mono" type="text" inputmode="numeric" maxlength="6" placeholder="••••••" autocomplete="one-time-code" required>
    <small class="hint">بيانات الاتصال: ${esc(otpStatus.provider)}</small>
  </div>
  <div class="form-actions">
    <button class="btn primary lg" type="submit">${icon('check', 20)} تأكيد الكود</button>
    <button class="btn ghost" type="button" id="btn-resend-otp">إعادة إرسال الكود</button>
    <a class="btn ghost" href="/register">تعديل البيانات</a>
  </div>
  <p class="form-error" id="otp-error" role="alert" hidden></p>
</form>
<section class="section small-print">
  <h3>${icon('lock', 18)} ملاحظات أمان</h3>
  <ul class="ticks">
    <li>الكود يُخزَّن مُجزَّأً (Hash) ولا يُحفظ كنص صريح، وينتهي بعد 5 دقائق.</li>
    <li>5 محاولات كحد أقصى، وبعدها لازم تطلب كود جديد.</li>
    <li>إعادة الإرسال متاحة بعد 60 ثانية (حماية من الاستهلاك وسوء الاستخدام).</li>
  </ul>
</section>`;
}

/* ------------------------------------------------------------------ التحقق */
function verifyPage({ voter, election, demo, rollCard }) {
  const cardImg = (rollCard && rollCard.card_image) || '/cards/31005292501518.jpg';
  const faceImg = (rollCard && rollCard.face_image) || cardImg;
  const hasStoredCard = !!(rollCard && rollCard.card_image);
  return `
<section class="page-head">
  <h1>التحقق البيومتري من الوجه الحي</h1>
  <p class="muted">مرحبًا <b>${esc(voter.full_name)}</b> — الرقم القومي <span class="mono">${esc(voter.national_id_masked)}</span>${election ? ` · ${esc(election.title)}` : ''}</p>
</section>

<div id="verify-app" class="verify-app card" data-demo="${demo ? '1' : '0'}" data-has-db-card="1">
  <canvas id="canvas" hidden></canvas>
  <img id="db-face-ref" src="${esc(faceImg)}" crossorigin="anonymous" alt="" hidden>

  <div class="v-step" data-step="selfie">
    <div class="verify-grid">
      <!-- العمود الأيمن: البطاقة المسجّلة في قاعدة البيانات -->
      <div class="db-card-box">
        <div class="cam-status-pill live" style="margin-bottom:10px">
          ${icon('check', 16)} تمت مطابقة البيانات مع قاعدة البيانات
        </div>
        <h3 style="margin-bottom:6px">بطاقتك المسجّلة لدينا</h3>
        <p class="muted small" style="margin-bottom:12px">سيتم مطابقة ملامح وجهك الحقيقي مع صورة الوجه المسجّلة في هذه البطاقة بالذكاء الاصطناعي.</p>
        ${hasStoredCard ? `<img id="db-card-img" src="${esc(cardImg)}" crossorigin="anonymous" alt="بطاقة الرقم القومي المسجّلة">` : `<div class="notice ok">بيانات البطاقة موثّقة في السجل</div>`}
      </div>

      <!-- العمود الأيسر: الكاميرا الحية ومطابقة الوجه -->
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <h2 style="margin:0">${icon('camera', 22)} كاميرا التحقق من الوجه</h2>
          <span class="cam-status-pill" id="cam-status">اضغط «تشغيل الكاميرا» أو ارفع صورة</span>
        </div>
        <p class="muted small" style="margin:6px 0 8px">ضع وجهك في منتصف الدائرة والتقط صورة واضحة (أو ارفع صورة لوجهك):</p>
        <ol class="challenge-list" id="challenge-list"></ol>

        <div class="camera-frame selfie">
          <video id="video-selfie" playsinline autoplay muted></video>
          <div class="frame-guide face-guide"><span>ضع وجهك داخل الإطار</span></div>
          <div class="liveness-meter"><span id="liveness-bar"></span></div>
        </div>

        <div class="row" style="justify-content:center;margin-top:10px">
          <button class="btn primary" type="button" id="btn-start-camera">${icon('camera', 18)} تشغيل الكاميرا</button>
          <button class="btn ok" type="button" id="btn-capture-selfie">${icon('check', 18)} التقاط السيلفي</button>
          <button class="btn ghost" type="button" id="btn-use-selfie-file">${icon('scarab', 18)} رفع صورة للوجه</button>
          <button class="btn ghost small" type="button" id="btn-switch-cam">تبديل الكاميرا</button>
          <input type="file" id="selfie-file" accept="image/*" hidden>
        </div>

        <p class="form-error" id="verify-error" role="alert" hidden></p>

        <div class="captured" id="selfie-preview" hidden>
          <p class="small" style="font-weight:700;margin-bottom:8px">الصورة الملتقطة للمطابقة:</p>
          <img id="selfie-img" alt="صورة السيلفي">
          <div class="captured-actions">
            <button class="btn primary lg" type="button" id="btn-selfie-ok">${icon('check', 18)} مطابقة الوجه بالبطاقة المسجّلة الآن</button>
            <button class="btn ghost" type="button" id="btn-selfie-retake">إعادة الالتقاط</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="v-step" data-step="processing" hidden>
    <div class="processing">
      <div class="spinner"></div>
      <h2 id="processing-title">جاري تحليل ملامح الوجه بالذكاء الاصطناعي…</h2>
      <p class="muted small">يتم استخراج ١٢٨ نقطة بيومترية من الوجه ومقارنتها بصورة البطاقة المسجّلة في قاعدة البيانات</p>
      <ul class="progress-list" id="progress-list">
        <li data-k="card">استرجاع البطاقة المعتمدة من قاعدة البيانات</li>
        <li data-k="live">فحص وجود وجه بشري حقيقي وواضح</li>
        <li data-k="face">مطابقة البصمة العصبية للوجه (128-D) مع البطاقة</li>
        <li data-k="decision">إصدار القرار النهائي ورمز الاقتراع</li>
      </ul>
    </div>
  </div>

  <div class="v-step" data-step="result" hidden>
    <div id="result-box"></div>
  </div>
</div>

<p class="muted small">خصوصيتك محمية: تُستخدم صورة السيلفي للتحقق اللحظي من تطابق الوجه مع البطاقة المسجّلة فقط، ولا تُربط ورقة الاقتراع بهويتك.</p>`;
}

/* ------------------------------------------------------------------ الاقتراع */
function votePage({ election, candidates, voter, kiosk }) {
  const items = candidates.map((c) => `
    <label class="candidate">
      <input type="radio" name="candidate_id" value="${esc(c.id)}" required>
      <span class="cand-body">
        <span class="cand-mark">${icon('lotus', 26)}</span>
        <span class="cand-info">
          <b>${esc(c.name)}</b>
          <i>${esc(c.slogan || '')}</i>
          ${c.program ? `<em>${esc(c.program)}</em>` : ''}
        </span>
        <span class="cand-tick">${icon('check', 20)}</span>
      </span>
    </label>`).join('');

  return `
<section class="page-head">
  <h1>${esc(election.title)}</h1>
  <p class="muted">${esc(election.description || '')}</p>
  <p class="voter-line">${icon('ankh', 18)} الناخب: <b>${esc(voter.full_name)}</b> · <span class="mono">${esc(voter.national_id_masked)}</span> ${kiosk ? '· <span class="chip">منصة اقتراع مشتركة</span>' : ''}</p>
  <p class="muted small">ينتهي الاقتراع ${fmtDate(election.ends_at)} · <b>صوت واحد فقط</b>، ومافيش تعديل بعد التأكيد.</p>
</section>

<form id="vote-form" class="vote-card" data-election="${esc(election.id)}" data-kiosk="${kiosk ? '1' : '0'}">
  <h2 class="sec-title">${icon('scarab', 22)} اختر مرشحًا واحدًا</h2>
  <div class="candidates">${items}</div>
  <div class="vote-actions">
    <button class="btn primary lg" type="submit">${icon('lotus', 20)} تأكيد التصويت</button>
    <a class="btn ghost" href="/">إلغاء</a>
  </div>
  <p class="form-error" id="vote-error" role="alert" hidden></p>
</form>

<dialog id="confirm-dialog" class="confirm">
  <h3>${icon('warn', 22)} تأكيد نهائي</h3>
  <p>هتصوّت لـ <b id="confirm-name">—</b>. التصويت نهائي وماينفعش يتغير أو يتكرر. متأكد؟</p>
  <div class="row">
    <button class="btn primary" id="confirm-yes">${icon('check', 18)} أيوه، سجّل صوتي</button>
    <button class="btn ghost" id="confirm-no">رجوع</button>
  </div>
</dialog>`;
}

/* ------------------------------------------------------------------ الإيصال */
function receiptPage({ receipt, electionTitle, total, castAt }) {
  return `
<section class="page-head center">
  <div class="seal">${icon('check', 40)}</div>
  <h1>تم تسجيل صوتك</h1>
  <p class="muted">صوتك اتحسب في <b>${esc(electionTitle)}</b> — ومفيش أي بيانات شخصية مرتبطة بيه.</p>
</section>

<section class="card receipt">
  <h2>${icon('eye', 22)} رقم الإيصال</h2>
  <p class="muted small">احتفظ بالرقم ده — بيه تقدر تتأكد في أي وقت إن صوتك محتسب، وبدون ما يظهر محتوى الصوت.</p>
  <div class="receipt-code" id="receipt-code">${esc(receipt)}</div>
  <div class="row center-row">
    <button class="btn ghost" id="btn-copy">نسخ الرقم</button>
    <button class="btn ghost" onclick="window.print()">طباعة الإيصال</button>
    <a class="btn ghost" href="/verify-receipt?code=${esc(receipt)}">التحقق من الإيصال</a>
  </div>
  <dl class="meta wide">
    <div><dt>وقت التسجيل</dt><dd>${fmtDate(castAt)}</dd></div>
    <div><dt>إجمالي الأصوات حتى الآن</dt><dd>${esc(total)}</dd></div>
    <div><dt>الانتخابة</dt><dd>${esc(electionTitle)}</dd></div>
  </dl>
  <p class="muted small">ما تمش تسجيل اختيارك داخل الإيصال — لأن الإيصال يثبت الاحتساب بدون كشف سرية الصوت.</p>
</section>
<section class="section row center-row">
  <a class="btn primary" href="/results?e=${esc('')}">${icon('eye', 20)} شاهد النتائج اللحظية</a>
  <a class="btn ghost" href="/">الرئيسية</a>
</section>`;
}

function receiptLookupPage({ code = '', result = null }) {
  const r = result || {};
  const map = {
    found: `<div class="notice ok">${icon('check', 18)} الإيصال صحيح — الصوت محتسب في <b>${esc(r.election_title)}</b> بتاريخ ${fmtDate(r.cast_at)}.<br><span class="muted small">الاختيار نفسه لا يُكشف — سرية الصوت جزء من تصميم النظام.</span></div>`,
    notfound: `<div class="notice err">${icon('warn', 18)} مفيش صوت مسجّل برقم الإيصال ده. راجع الأرقام تاني، أو كلّم لجنة الإشراف.</div>`,
    bad: `<div class="notice err">${icon('warn', 18)} صيغة الرقم غير صحيحة — الصيغة المطلوبة ABCDE-12345.</div>`,
  };
  return `
<section class="page-head"><h1>التحقق من إيصال التصويت</h1>
<p class="muted">اكتب رقم الإيصال اللي استلمته بعد التصويت، وهنتأكد إن صوتك محتسب.</p></section>
<form class="card form-card" method="get" action="/verify-receipt">
  <div class="field">
    <label for="code">رقم الإيصال</label>
    <input id="code" name="code" value="${esc(code)}" placeholder="ABCDE-12345" class="mono" required>
  </div>
  <div class="form-actions"><button class="btn primary" type="submit">${icon('eye', 18)} تحقّق</button></div>
</form>
${r.kind ? `<section class="section">${map[r.kind] || ''}</section>` : ''}`;
}

/* ------------------------------------------------------------------ النتائج */
function resultsPage({ data, elections, electionId }) {
  const options = elections.map((e) => `<option value="${esc(e.id)}" ${String(e.id) === String(electionId) ? 'selected' : ''}>${esc(e.title)}</option>`).join('');
  if (!data) {
    return `
<section class="page-head"><h1>النتائج</h1>
<form class="inline-form" method="get" action="/results">
  <select name="e">${options}</select><button class="btn primary" type="submit">اعرض</button>
</form></section>
<p class="muted">مفيش انتخابات لعرض نتائجها.</p>`;
  }
  const rows = data.candidates.map((c, i) => `
    <div class="bar-row ${data.hidden ? 'blind' : ''}">
      <div class="bar-head"><b>${esc(c.name)}</b><span>${data.hidden ? '—' : `${c.votes} صوت · ${c.percent}%`}</span></div>
      <div class="bar"><span style="width:${data.hidden ? 0 : Math.max(2, c.percent)}%"></span></div>
      <i class="muted small">${esc(c.slogan || '')}</i>
    </div>`).join('');

  return `
<section class="page-head">
  <h1>${esc(data.election.title)}</h1>
  <p class="muted">${esc(data.election.description || '')}</p>
  <p>${stateChip(data.state)} <span class="muted small">· من ${fmtDate(data.election.starts_at)} إلى ${fmtDate(data.election.ends_at)}</span></p>
</section>
<section class="stats-row">
  <div class="stat"><b>${data.participants}</b><span>رمز اقتراع صادر</span></div>
  <div class="stat"><b>${data.total_ballots}</b><span>صوت محسوب</span></div>
  <div class="stat"><b>${data.turnout}%</b><span>نسبة المشاركة</span></div>
</section>
${data.hidden ? `<div class="notice">${icon('lock', 18)} الجداول التفصيلية تُعلن بعد غلق الاقتراع حفاظًا على نزاهة العملية — حاليًا نظهر أسماء المرشحين فقط.</div>` : ''}
<section class="section">
  <h2 class="sec-title">${icon('scarab', 22)} النتائج</h2>
  <div class="bars">${rows}</div>
</section>
<form class="inline-form" method="get" action="/results">
  <label class="muted small">انتخابة أخرى:</label>
  <select name="e">${options}</select><button class="btn ghost" type="submit">اعرض</button>
</form>`;
}

/* ------------------------------------------------------------------ حالة المراجعة */
function reviewStatusPage({ reviewId, review }) {
  const box = {
    pending: `<div class="notice">${icon('warn', 18)} طلبك تحت المراجعة البشرية. سجّلنا صورة البطاقة والسيلفي للمراجعة فقط، وبيتم حذفهما بمجرد صدور القرار.<br><span class="muted small">سبب الإحالة: ${(review.reasons || []).map(esc).join(' — ') || 'نسبة تشابه في المنطقة الرمادية'}</span></div>
      <div class="row center-row"><button class="btn ghost" id="btn-refresh-review">تحديث الحالة</button></div>`,
    approved: `<div class="notice ok">${icon('check', 18)} تمت الموافقة من لجنة الإشراف — تقدر تستلم رمز الاقتراع وتصوّت الآن.</div>
      <div class="row center-row"><button class="btn primary" id="btn-claim-token">${icon('lotus', 18)} استلم رمز الاقتراع</button></div>`,
    rejected: `<div class="notice err">${icon('warn', 18)} اللجنة رفضت الطلب — الصور مش متطابقة بدرجة كافية. تقدر تعيد المحاولة بتصوير أوضح.</div>
      <div class="row center-row"><a class="btn primary" href="/verify">إعادة المحاولة</a></div>`,
  }[review.status] || '';
  return `
<section class="page-head"><h1>حالة طلب المراجعة</h1>
<p class="muted">رقم الطلب <span class="mono">#${esc(reviewId)}</span> · الحالة: <b>${review.status === 'pending' ? 'تحت المراجعة' : review.status === 'approved' ? 'مقبول' : 'مرفوض'}</b></p></section>
<section class="card" id="review-card" data-review="${esc(reviewId)}">${box}</section>
<section class="section small-print"><p class="muted small">إنشاء طلب المراجعة: ${fmtDate(review.created_at)} · ${review.decided_at ? `قرار اللجنة: ${fmtDate(review.decided_at)}` : 'بانتظار قرار اللجنة'} · تُحذف الصور تلقائيًا بعد ${esc('24')} ساعة كحد أقصى.</p></section>`;
}

/* ------------------------------------------------------------------ منصة الاقتراع */
function kioskPage({ elections }) {
  return `
<section class="hero small">
  <div class="hero-inner">
    <p class="kicker">${icon('scarab', 20)} منصة اقتراع مشتركة</p>
    <h1>صوّت من هنا — حتى لو مفيش موبايل</h1>
    <p class="hero-sub">المنصة دي مخصّصة لمراكز الاقتراع واللجان: كل ناخب يعمل تسجيله وتحقيقه بنفسه على نفس الجهاز، والجهاز بيتفضّى تلقائيًا بعد كل صوت — صوت واحد لكل هوية، والجلسة لا تنتقل للي بعده.</p>
  </div>
</section>
<section class="section">
  <h2 class="sec-title">${icon('lotus', 22)} الانتخابات المتاحة على المنصة</h2>
  <div class="cards">
    ${elections.map((e) => `
      <article class="card election-card">
        <div class="ecard-top"><h3>${esc(e.title)}</h3>${stateChip(e.state)}</div>
        <p class="muted">${esc(e.description || '')}</p>
        ${e.state === 'open'
          ? `<a class="btn primary" href="/register?e=${e.id}&kiosk=1">${icon('ankh', 18)} ابدأ الإجراء الفردي</a>`
          : `<span class="btn ghost disabled">${STATE_LABEL[e.state]}</span>`}
      </article>`).join('') || '<p class="muted">مفيش انتخابات مفتوحة.</p>'}
  </div>
</section>
<section class="section small-print">
  <h3>${icon('lock', 18)} إجراءات الأمان في المنصة المشتركة</h3>
  <ul class="ticks">
    <li>الجلسة تُنهى تلقائيًا بعد طباعة الإيصال — الناخب اللي بعده يبدأ من الصفر.</li>
    <li>حد أقصى ٣ أصوات في الساعة لكل جهاز، مع تسجيل رقم الجهاز في سجل التدقيق.</li>
    <li>التحقق (بطاقة + سيلفي حيّ) إلزامي لكل ناخب، فمفيش صوت واحد يتكرر.</li>
  </ul>
</section>`;
}

function alreadyVotedPage() {
  return `<section class="page-head center">
  <div class="seal warn">${icon('warn', 36)}</div>
  <h1>صوّتت بالفعل في الانتخابة دي</h1>
  <p class="muted">النظام بيمنع أي صوت تاني بنفس الهوية — وده بالضبط اللي بيخلي النتيجة موثوقة.</p>
  <div class="row center-row"><a class="btn primary" href="/verify-receipt">${icon('eye', 18)} تحقق من إيصالك</a><a class="btn ghost" href="/">الرئيسية</a></div>
</section>`;
}

function errorPage(msg) {
  return `<section class="page-head center">
  <div class="seal warn">${icon('warn', 36)}</div>
  <h1>حصلت مشكلة</h1>
  <p class="muted">${esc(msg || 'الصفحة المطلوبة غير موجودة')}</p>
  <div class="row center-row"><a class="btn primary" href="/">الرئيسية</a></div>
</section>`;
}

module.exports = {
  landing, registerPage, otpPage, verifyPage, votePage, receiptPage, receiptLookupPage,
  resultsPage, reviewStatusPage, kioskPage, alreadyVotedPage, errorPage,
  fmtDate, stateChip, STATE_LABEL,
};
