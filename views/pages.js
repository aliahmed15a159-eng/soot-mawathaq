'use strict';
/** صفحات الجمهور: الرئيسية، التسجيل، التحقق البيومتري، ورقة الاقتراع، الإيصال، النتائج */
const { shell, esc, icon, WINGED_SUN } = require('./layout');

const STATE_LABEL = {
  open: 'الاقتراع مفتوح الآن',
  closed: 'الاقتراع مُغلق',
  scheduled: 'لم يبدأ بعد',
  draft: 'مسودة',
  missing: 'غير متاحة',
};

function stateChip(state) {
  return `<span class="chip state-${state}"><span class="chip-dot"></span>${esc(STATE_LABEL[state] || state)}</span>`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short', calendar: 'gregory', numberingSystem: 'latn' }).format(new Date(iso));
  } catch { return String(iso).slice(0, 16).replace('T', ' '); }
}

/** فصل اللقب المهني عن الرمز الانتخابي */
function parseSlogan(slogan = '') {
  const parts = String(slogan).split('·').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { role: parts[0], symbol: parts.slice(1).join(' · ') };
  }
  return { role: slogan, symbol: 'مرشح معتمد' };
}

const ARABIC_NUMS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toArNum(n) {
  return String(n).replace(/\d/g, (d) => ARABIC_NUMS[Number(d)]);
}

/* ------------------------------------------------------------------ الرئيسية */
function landing({ elections, demo, counts }) {
  const mainElection = elections.find((e) => e.state === 'open') || elections[0] || null;
  const mainCandidates = (mainElection && mainElection.candidates) || [];

  const candidateShowcase = mainCandidates.map((c, idx) => {
    const { role, symbol } = parseSlogan(c.slogan);
    const photo = c.photo_url || `/candidates/c${(idx % 4) + 1}.jpg`;
    return `
      <article class="cand-showcase-card">
        <div class="cand-photo-wrap">
          <img src="${esc(photo)}" alt="${esc(c.name)}" loading="lazy">
          <span class="cand-num-badge">رقم ${toArNum(idx + 1)}</span>
          <span class="cand-symbol-pill">${esc(symbol)}</span>
        </div>
        <div class="cand-card-body">
          <div class="cand-role">${esc(role)}</div>
          <h3 class="cand-name">${esc(c.name)}</h3>
          <p class="cand-prog">${esc(c.program || '')}</p>
          <div class="cand-live-meter">
            <div class="cand-meter-top">
              <span>المؤشر اللحظي في الصندوق</span>
              <b class="mono">${c.votes || 0} صوت (${c.percent || 0}%)</b>
            </div>
            <div class="cand-meter-track"><span style="width:${Math.max(4, c.percent || 0)}%"></span></div>
          </div>
          <a class="btn primary full" href="/register?e=${esc(mainElection.id)}">
            ${icon('lotus', 18)} انتخب المرشح رقم (${toArNum(idx + 1)})
          </a>
        </div>
      </article>`;
  }).join('');

  return `
<section class="hero-sovereign">
  <div class="hero-main">
    <div class="hero-kicker-row">
      <span class="hero-live-badge"><span class="pulse-dot"></span> ${mainElection ? esc(mainElection.title) : 'الانتخابات العامة ٢٠٢٦'}</span>
      <span class="hero-proto-tag mono">BIOMETRIC 128-D VERIFIED</span>
    </div>
    <h1 class="hero-title">الاقتراع الوطني الموثّق<br><span>ببصمة الوجه والسجل المدني</span></h1>
    <p class="hero-sub">منظومة اقتراع إلكتروني عالية التأمين: نطابق بياناتك مع بطاقة الرقم القومي المسجّلة في السجل المدني، ونتحقق من ملامح وجهك الحي بالذكاء الاصطناعي (128-D)، لتدلي بصوتك السري لمرشحك في أقل من دقيقة.</p>
    <div class="hero-actions">
      <a class="btn gold lg" href="/register${mainElection ? `?e=${esc(mainElection.id)}` : ''}">
        ${icon('lotus', 20)} ادخل للتصويت واختيار مرشحك
      </a>
      <a class="btn outline-light lg" href="#candidates-section">
        استعرض المرشحين الأربعة
      </a>
      <a class="btn outline-light lg" href="/results">
        ${icon('eye', 18)} الفرز المباشر
      </a>
    </div>
    <div class="hero-metrics">
      <div class="h-metric">
        <b class="mono">${counts.candidates || 4}</b>
        <span>مرشحين معتمدين بالرموز</span>
      </div>
      <div class="h-metric">
        <b class="mono">${counts.ballots}</b>
        <span>صوت مُودَع في الصندوق السري</span>
      </div>
      <div class="h-metric">
        <b class="mono">128-D</b>
        <span>نقطة بيومترية لمطابقة الوجه</span>
      </div>
      <div class="h-metric">
        <b class="mono">0%</b>
        <span>ربط بين الناخب واختياره</span>
      </div>
    </div>
  </div>

  <aside class="hero-vault-card">
    <div class="vault-head">
      <span class="vault-seal">${icon('ankh', 20)}</span>
      <div>
        <b>بروتوكول التحقق والاقتراع</b>
        <small>بدون كود موبايل (OTP) · تحقق فوري</small>
      </div>
    </div>
    <ol class="vault-steps">
      <li>
        <span class="v-num mono">01</span>
        <div>
          <b>مطابقة بطاقة الرقم القومي</b>
          <p>إدخال الاسم والرقم القومي لمطابقتها فورًا مع البطاقة المعتمدة في السجل المدني.</p>
        </div>
      </li>
      <li>
        <span class="v-num mono">02</span>
        <div>
          <b>البصمة العصبية للوجه (128-D)</b>
          <p>مقارنة وجهك المباشر بصورة البطاقة المسجّلة ورفض أي شخص آخر غير صاحب البطاقة.</p>
        </div>
      </li>
      <li>
        <span class="v-num mono">03</span>
        <div>
          <b>اختيار المرشح وإيصال التشفير</b>
          <p>اختيار مرشحك من بين المرشحين الأربعة في ورقة اقتراع سرية وإصدار إيصال رقمي.</p>
        </div>
      </li>
    </ol>
    <div class="vault-foot">
      <a href="/register" class="btn primary full">${icon('camera', 18)} ابدأ التحقق البيومتري الآن</a>
    </div>
  </aside>
</section>

<section class="section" id="candidates-section">
  <div class="sec-header-bar">
    <div>
      <span class="sec-eyebrow">القائمة الرسمية المعتمدة · الدورة ٢٠٢٦ / ٢٠٣٠</span>
      <h2 class="sec-title">المرشحون للانتخابات العامة لرئاسة المجلس الوطني</h2>
      <p class="muted">تعرّف على السيرة الذاتية، الرمز الانتخابي، والبرنامج الانتخابي لكل مرشح قبل الدخول لورقة الاقتراع السرية.</p>
    </div>
    ${mainElection ? stateChip(mainElection.state) : ''}
  </div>

  <div class="cand-showcase-grid">
    ${candidateShowcase}
  </div>
</section>

<section class="section">
  <div class="security-banner">
    <div class="sec-banner-item">
      <span class="sec-ic">${icon('scarab', 24)}</span>
      <div>
        <h4>لا حاجة لرفع صورة البطاقة</h4>
        <p>بطاقات الرقم القومي محفوظة مسبقًا في قاعدة بيانات السجل المدني؛ النظام يستدعي بطاقتك تلقائيًا فور كتابة بياناتك.</p>
      </div>
    </div>
    <div class="sec-banner-item">
      <span class="sec-ic">${icon('horus', 24)}</span>
      <div>
        <h4>كشف التزوير وانتحال الصفة</h4>
        <p>يتم تحليل ١٢٨ بُعدًا هندسيًا وعصبيًا لملامح الوجه ومقارنتها بصورة البطاقة الرسمية؛ أي صورة لشخص آخر تُرفض آليًا.</p>
      </div>
    </div>
    <div class="sec-banner-item">
      <span class="sec-ic">${icon('lock', 24)}</span>
      <div>
        <h4>عزل تشفيري كامل للصوت</h4>
        <p>بمجرد نجاح مطابقة الوجه يصدر رمز اقتراع أعمى لمرة واحدة، وتُحفظ ورقة التصويت في جدول معزول بلا أي إشارة لهويتك.</p>
      </div>
    </div>
  </div>
</section>`;
}

/* ------------------------------------------------------------------ التسجيل */
function registerPage({ election, demo, sample }) {
  const govOptions = ['القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'الشرقية', 'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'أسوان', 'الأقصر', 'الغربية', 'المنوفية', 'البحيرة', 'كفر الشيخ', 'دمياط', 'بورسعيد', 'السويس', 'الإسماعيلية', 'شمال سيناء', 'جنوب سيناء', 'مطروح', 'البحر الأحمر', 'الوادي الجديد', 'خارج الجمهورية'];
  return `
<section class="page-head">
  <span class="sec-eyebrow">الخطوة الأولى · استدعاء البطاقة من السجل المدني</span>
  <h1>التحقق من بيانات الرقم القومي</h1>
  ${election ? `<p class="election-ref">${icon('lotus', 18)} <b>${esc(election.title)}</b> ${stateChip(election.state)}</p>` : ''}
  <p class="muted">أدخل بياناتك المطابقة لبطاقة الرقم القومي؛ سيقوم النظام باستخراج بطاقتك المسجّلة وتحويلك مباشرةً إلى كاميرا البصمة الحيوية للوجه (بدون OTP).</p>
</section>

<div class="register-layout">
  <form id="register-form" class="card form-card" autocomplete="off" novalidate>
    <input type="hidden" name="election_id" value="${election ? esc(election.id) : '1'}">

    <div class="sample-autofill-bar">
      <div class="sample-autofill-info">
        <span class="sample-tag">بطاقة مسجّلة للتجربة الفورية</span>
        <b>علي أحمد علي محمد</b>
        <span class="mono">31005292501518 · ٢٠١٠/٠٥/٢٩ · أسيوط</span>
      </div>
      <button type="button" class="btn gold small" id="btn-fill-sample-card"
        data-name="علي أحمد علي محمد" data-nid="31005292501518" data-dob="2010-05-29" data-gov="أسيوط" data-phone="01012345678">
        ${icon('check', 16)} ملء تلقائي للبيانات
      </button>
    </div>

    <div class="field">
      <label for="full_name">الاسم رباعيًا (كما هو مدوّن في بطاقة الرقم القومي)</label>
      <input id="full_name" name="full_name" type="text" placeholder="مثال: علي أحمد علي محمد" required>
      <small class="hint">يُطابق حرفيًا مع الاسم المسجّل في قاعدة بيانات البطاقات</small>
    </div>

    <div class="grid-2">
      <div class="field">
        <label for="national_id">الرقم القومي المكون من ١٤ رقمًا</label>
        <input id="national_id" name="national_id" class="mono" type="text" inputmode="numeric" placeholder="31005292501518" maxlength="14" required>
        <small class="hint" id="nid-hint">يُستخرج منه تاريخ الميلاد والمحافظة تلقائيًا</small>
      </div>
      <div class="field">
        <label for="birth_date">تاريخ الميلاد</label>
        <input id="birth_date" name="birth_date" type="date" required>
        <small class="hint" id="dob-hint">يجب أن يطابق الرقم القومي</small>
      </div>
    </div>

    <div class="grid-2">
      <div class="field">
        <label for="governorate">محافظة محل الميلاد</label>
        <select id="governorate" name="governorate" required>
          <option value="">اختر المحافظة</option>
          ${govOptions.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="phone">رقم الهاتف المحمول</label>
        <input id="phone" name="phone" class="mono" type="tel" inputmode="numeric" placeholder="01012345678" maxlength="11" required>
        <small class="hint">يُحفظ مُعمّى في السجل دون إرسال رسائل نصية</small>
      </div>
    </div>

    <div class="nid-preview" id="nid-preview" hidden>
      <span class="badge">${icon('scarab', 16)} النوع: <b id="np-gender">—</b></span>
      <span class="badge">${icon('ankh', 16)} الميلاد: <b id="np-dob">—</b></span>
      <span class="badge">${icon('lotus', 16)} المحافظة: <b id="np-gov">—</b></span>
    </div>

    <label class="consent">
      <input type="checkbox" name="consent" id="consent" checked required>
      <span>أقرّ بأن البيانات المدخلة تخصّني، وأوافق على إجراء <b>المطابقة البيومترية للوجه (128-D)</b> مع صورة بطاقتي المسجّلة لإثبات الهوية ولمرة واحدة فقط.</span>
    </label>

    <div class="form-actions">
      <button class="btn primary lg" type="submit">${icon('camera', 20)} متابعة إلى كاميرا التحقق من الوجه ←</button>
      <a class="btn ghost" href="/">العودة للرئيسية</a>
    </div>
    <p class="form-error" id="form-error" role="alert" hidden></p>
  </form>

  <aside class="register-side-card">
    <h3>${icon('ankh', 20)} بطاقة السجل المدني المعتمدة</h3>
    <p class="muted small">عند إدخال بيانات صاحب البطاقة الصالحة، يقوم النظام باسترجاع البطاقة الأصلية ومقارنة بصمة الوجه:</p>
    <div class="mini-id-preview">
      <img src="/cards/31005292501518.jpg" alt="نموذج البطاقة المسجّلة">
    </div>
    <ul class="ticks">
      <li>انتقال فوري إلى فحص الكاميرا بدون كود موبايل (OTP).</li>
      <li>مطابقة الوجه بالذكاء الاصطناعي تمنع قبول صورة أي شخص آخر.</li>
      <li>فور التحقق تنتقل مباشرةً لاختيار مرشحك من بين المرشحين الأربعة.</li>
    </ul>
  </aside>
</div>`;
}

/* ------------------------------------------------------------------ كود الموبايل (احتياطي) */
function otpPage({ voter, challenge, otpStatus }) {
  return `<section class="page-head"><h1>تم إلغاء خطوة الـ OTP</h1><p><a class="btn primary" href="/verify">انتقل للتحقق من الوجه</a></p></section>`;
}

/* ------------------------------------------------------------------ التحقق البيومتري */
function verifyPage({ voter, election, demo, rollCard }) {
  const cardImg = (rollCard && rollCard.card_image) || '/cards/31005292501518.jpg';
  const faceImg = (rollCard && rollCard.face_image) || '/cards/31005292501518-face.jpg';
  const hasStoredCard = !!(rollCard && rollCard.card_image);
  return `
<section class="page-head">
  <div class="verify-top-strip">
    <div>
      <span class="sec-eyebrow">الخطوة الثانية · المطابقة البيومترية العصبية (128-D Face Recognition)</span>
      <h1>مطابقة الوجه الحي مع البطاقة القومية المسجّلة</h1>
      <p class="muted">الناخب: <b>${esc(voter.full_name)}</b> · الرقم القومي: <span class="mono">${esc(voter.national_id_masked)}</span>${election ? ` · ${esc(election.title)}` : ''}</p>
    </div>
    <div class="ai-engine-pill" id="ai-engine-badge">
      <span class="pulse-dot"></span>
      <span id="ai-engine-text">جاري تجهيز محرك البصمة العصبية 128-D…</span>
    </div>
  </div>
</section>

<div id="verify-app" class="verify-app card" data-demo="${demo ? '1' : '0'}" data-has-db-card="1">
  <canvas id="canvas" hidden></canvas>
  <img id="db-face-ref" src="${esc(faceImg)}" crossorigin="anonymous" alt="" hidden>

  <div class="v-step" data-step="selfie">
    <div class="verify-grid">
      <!-- العمود الأيمن: البطاقة المسجّلة في قاعدة البيانات -->
      <div class="db-card-box">
        <div class="db-verified-header">
          <span class="cam-status-pill live">${icon('check', 15)} البطاقة موثّقة في السجل المدني</span>
          <span class="mono small muted">ID #31005292501518</span>
        </div>

        <div class="db-face-summary">
          <img class="db-face-avatar" src="${esc(faceImg)}" crossorigin="anonymous" alt="صورة صاحب البطاقة">
          <div>
            <b>${esc(voter.full_name)}</b>
            <span class="muted small" style="display:block">محافظة ${esc(voter.governorate || 'أسيوط')} · مواليد ${esc(String(voter.birth_date || '2010-05-29').slice(0, 10))}</span>
            <span class="biometric-tag">بصمة الوجه المرجعية جاهزة للمقارنة</span>
          </div>
        </div>

        ${hasStoredCard ? `<img id="db-card-img" src="${esc(cardImg)}" crossorigin="anonymous" alt="بطاقة الرقم القومي المسجّلة">` : `<div class="notice ok">بيانات البطاقة موثّقة في السجل</div>`}

        <div class="db-security-note">
          ${icon('lock', 16)}
          <span>يتم استخراج ١٢٨ مَعلمًا بيومتريًا من صورة البطاقة أعلاه ومقارنتها بصورتك الملتقطة؛ <b>أي صورة لشخص مختلف تُرفض تلقائيًا</b>.</span>
        </div>
      </div>

      <!-- العمود الأيسر: الكاميرا الحية ومطابقة الوجه -->
      <div class="camera-studio-box">
        <div class="studio-head">
          <div>
            <h2 style="margin:0;font-size:1.2rem">${icon('camera', 20)} كاميرا البصمة الحيوية للوجه</h2>
            <p class="muted small" style="margin:4px 0 0">ضع وجهك داخل الإطار البيضاوي والتقط السيلفي، أو ارفع صورة واضحة لوجهك</p>
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
          <button class="btn primary lg" type="button" id="btn-capture-selfie">${icon('camera', 18)} التقاط صورة الوجه الآن</button>
          <button class="btn ghost" type="button" id="btn-use-selfie-file">${icon('scarab', 18)} رفع صورة من الجهاز</button>
          <button class="btn ghost small" type="button" id="btn-start-camera">إعادة تشغيل الكاميرا</button>
          <button class="btn ghost small" type="button" id="btn-switch-cam">تبديل الكاميرا</button>
          <input type="file" id="selfie-file" accept="image/*" hidden>
        </div>

        <p class="form-error" id="verify-error" role="alert" hidden></p>

        <div class="captured" id="selfie-preview" hidden>
          <div class="captured-head">
            <b>الصورة الجاهزة للفحص البيومتري (128-D)</b>
            <span class="chip state-open">جاهزة للمطابقة</span>
          </div>
          <img id="selfie-img" alt="صورة السيلفي">
          <div class="captured-actions">
            <button class="btn gold lg" type="button" id="btn-selfie-ok">${icon('check', 18)} بدء المطابقة البيومترية مع البطاقة ←</button>
            <button class="btn ghost" type="button" id="btn-selfie-retake">إعادة الالتقاط</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="v-step" data-step="processing" hidden>
    <div class="processing">
      <div class="spinner"></div>
      <h2 id="processing-title">جاري تحليل البصمة العصبية للوجه (128-D)…</h2>
      <p class="muted small">يتم استخراج المصفوفة البيومترية للوجه وحساب المسافة الإقليدية وزاوية التطابق مع صورة البطاقة الرسمية</p>
      <ul class="progress-list" id="progress-list">
        <li data-k="card">استرجاع البصمة المرجعية من بطاقة الرقم القومي</li>
        <li data-k="live">فحص وجود وجه بشري واضح وتحديد ٦٨ نقطة ملامح</li>
        <li data-k="face">حساب تطابق البصمة العصبية (128-D Face Descriptor)</li>
        <li data-k="decision">إصدار القرار النهائي وتذكرة الاقتراع السرية</li>
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
    const { role, symbol } = parseSlogan(c.slogan);
    const photo = c.photo_url || `/candidates/c${(idx % 4) + 1}.jpg`;
    return `
    <label class="ballot-cand-card">
      <input type="radio" name="candidate_id" value="${esc(c.id)}" required>
      <div class="ballot-card-inner">
        <div class="ballot-card-top">
          <span class="ballot-num">مرشح رقم (${toArNum(idx + 1)})</span>
          <span class="ballot-symbol">${esc(symbol)}</span>
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
          <span class="ballot-radio-indicator">${icon('check', 16)}</span>
          <span class="ballot-select-text">التأشير لاختيار هذا المرشح</span>
        </div>
      </div>
    </label>`;
  }).join('');

  return `
<section class="page-head">
  <span class="sec-eyebrow">الخطوة الثالثة · ورقة الاقتراع السرية المشفّرة</span>
  <h1>${esc(election.title)}</h1>
  <p class="muted">${esc(election.description || '')}</p>
  <div class="ballot-voter-banner">
    <div>
      ${icon('ankh', 18)} هوية موثّقة: <b>${esc(voter.full_name)}</b> · <span class="mono">${esc(voter.national_id_masked)}</span>
      ${kiosk ? '· <span class="chip">منصة اقتراع مشتركة</span>' : ''}
    </div>
    <span class="ballot-privacy-pill">${icon('lock', 15)} صوتك معزول تمامًا عن بياناتك الشخصية</span>
  </div>
</section>

<form id="vote-form" class="vote-card" data-election="${esc(election.id)}" data-kiosk="${kiosk ? '1' : '0'}">
  <div class="ballot-sheet-header">
    <div>
      <h2 style="margin:0">اختر مرشحًا واحدًا فقط من المرشحين الأربعة</h2>
      <p class="muted small" style="margin:4px 0 0">اضغط على بطاقة المرشح الذي ترغب في انتخابه ثم اضغط «تأكيد وإيداع الصوت في الصندوق»</p>
    </div>
    <span class="mono small muted">BALLOT-2026-SECRET</span>
  </div>

  <div class="ballot-grid">${items}</div>

  <div class="vote-actions-bar">
    <div>
      <span class="muted small">تنبيه دستوري: يُسمح بصوت واحد فقط ولا يمكن تعديله بعد الإيداع.</span>
    </div>
    <div class="row">
      <a class="btn ghost" href="/">إلغاء</a>
      <button class="btn gold lg" type="submit">${icon('lotus', 20)} تأكيد وإيداع الصوت في الصندوق ←</button>
    </div>
  </div>
  <p class="form-error" id="vote-error" role="alert" hidden></p>
</form>

<dialog id="confirm-dialog" class="confirm">
  <div class="confirm-seal">${icon('lotus', 28)}</div>
  <h3>تأكيد إيداع الصوت النهائي</h3>
  <p>أنت على وشك الإدلاء بصوتك السري لصالح المرشح:<br><b id="confirm-name" class="confirm-cand-highlight">—</b></p>
  <p class="muted small">بمجرد الضغط على «تأكيد»، سيُحفظ الصوت في الصندوق المشفّر ويصدر لك إيصال رقمي فوري ولا يمكن تغيير الاختيار.</p>
  <div class="row" style="justify-content:center;margin-top:18px">
    <button class="btn primary lg" id="confirm-yes">${icon('check', 18)} نعم، أودِع صوتي رسميًا</button>
    <button class="btn ghost" id="confirm-no">مراجعة الاختيار</button>
  </div>
</dialog>`;
}

/* ------------------------------------------------------------------ الإيصال */
function receiptPage({ receipt, electionTitle, total, castAt }) {
  return `
<section class="page-head center">
  <div class="seal">${icon('check', 38)}</div>
  <span class="sec-eyebrow">الخطوة الرابعة · اكتملت العملية بنجاح</span>
  <h1>تم إيداع صوتك السري في الصندوق بنجاح</h1>
  <p class="muted">تم احتساب صوتك رسميًا في <b>${esc(electionTitle)}</b> مع الفصل التام بين هويتك وورقة الاقتراع.</p>
</section>

<section class="card receipt">
  <h2>${icon('lock', 20)} إيصال التحقق التشفيري (Digital Ballot Receipt)</h2>
  <p class="muted small">احتفظ برقم الإيصال التالي للتحقق في أي وقت من وجود صوتك داخل الفرز العام دون كشف اسم المرشح الذي اخترته:</p>
  <div class="receipt-code mono" id="receipt-code">${esc(receipt)}</div>
  <div class="row center-row">
    <button class="btn primary" id="btn-copy">${icon('check', 16)} نسخ كود الإيصال</button>
    <button class="btn ghost" onclick="window.print()">طباعة الإيصال</button>
    <a class="btn ghost" href="/verify-receipt?code=${esc(receipt)}">فحص الإيصال الآن</a>
  </div>
  <dl class="meta wide">
    <div><dt>توقيت الإيداع</dt><dd>${fmtDate(castAt)}</dd></div>
    <div><dt>إجمالي الأصوات بالصندوق</dt><dd class="mono">${esc(total)} صوت</dd></div>
    <div><dt>الاستحقاق الانتخابي</dt><dd>${esc(electionTitle)}</dd></div>
  </dl>
</section>
<section class="section row center-row">
  <a class="btn gold lg" href="/results">${icon('eye', 20)} شاهد نتائج الفرز اللحظية للمرشحين</a>
  <a class="btn ghost lg" href="/">العودة للرئيسية</a>
</section>`;
}

function receiptLookupPage({ code = '', result = null }) {
  const r = result || {};
  const map = {
    found: `<div class="notice ok">${icon('check', 18)} <b>الإيصال صحيح وموثّق في الصندوق:</b> الصوت مُحتسب في <b>${esc(r.election_title)}</b> بتاريخ ${fmtDate(r.cast_at)}.<br><span class="muted small">سرية الاختيار محفوظة: لا يُخزّن النظام اسم المرشح مع الإيصال أو الهوية.</span></div>`,
    notfound: `<div class="notice err">${icon('warn', 18)} لا يوجد صوت مسجّل بهذا الكود. تأكد من كتابة الكود بالصيغة الصحيحة.</div>`,
    bad: `<div class="notice err">${icon('warn', 18)} صيغة كود الإيصال غير صحيحة.</div>`,
  };
  return `
<section class="page-head">
  <span class="sec-eyebrow">التدقيق التشفيري العام</span>
  <h1>فحص إيصال التصويت الرقمي</h1>
  <p class="muted">أدخل كود الإيصال الذي حصلت عليه عقب الاقتراع للتأكد من إدراج صوتك في الفرز النهائي.</p>
</section>
<form class="card form-card" method="get" action="/verify-receipt">
  <div class="field">
    <label for="code">كود إيصال التصويت</label>
    <input id="code" name="code" value="${esc(code)}" placeholder="ABCDE-12345" class="mono" required>
  </div>
  <div class="form-actions"><button class="btn primary lg" type="submit">${icon('eye', 18)} فحص صحة الإيصال</button></div>
</form>
${r.kind ? `<section class="section">${map[r.kind] || ''}</section>` : ''}`;
}

/* ------------------------------------------------------------------ النتائج */
function resultsPage({ data, elections, electionId }) {
  const options = elections.map((e) => `<option value="${esc(e.id)}" ${String(e.id) === String(electionId) ? 'selected' : ''}>${esc(e.title)}</option>`).join('');
  if (!data) {
    return `
<section class="page-head"><h1>نتائج الانتخابات</h1></section>
<p class="muted">لا توجد انتخابات متاحة حاليًا.</p>`;
  }

  const sorted = [...data.candidates].sort((a, b) => (b.votes || 0) - (a.votes || 0));
  const rows = sorted.map((c, idx) => {
    const { role, symbol } = parseSlogan(c.slogan);
    const photo = c.photo_url || `/candidates/c${((c.sort || idx + 1) - 1) % 4 + 1}.jpg`;
    const isLeader = idx === 0 && (c.votes || 0) > 0 && !data.hidden;
    return `
    <div class="result-cand-row ${isLeader ? 'leader' : ''} ${data.hidden ? 'blind' : ''}">
      <div class="res-cand-rank mono">#${idx + 1}</div>
      <img class="res-cand-photo" src="${esc(photo)}" alt="${esc(c.name)}">
      <div class="res-cand-body">
        <div class="res-cand-top">
          <div>
            <b class="res-cand-name">${esc(c.name)}</b>
            ${isLeader ? `<span class="leader-pill">متصدر الفرز</span>` : ''}
            <span class="res-cand-meta">${esc(role)} · <b>${esc(symbol)}</b></span>
          </div>
          <div class="res-cand-numbers mono">
            ${data.hidden ? '—' : `<b>${c.percent}%</b> <span>(${c.votes} صوت)</span>`}
          </div>
        </div>
        <div class="bar"><span style="width:${data.hidden ? 0 : Math.max(3, c.percent)}%"></span></div>
      </div>
    </div>`;
  }).join('');

  return `
<section class="page-head">
  <span class="sec-eyebrow">مركز الفرز والمؤشرات اللحظية</span>
  <h1>${esc(data.election.title)}</h1>
  <p class="muted">${esc(data.election.description || '')}</p>
  <p>${stateChip(data.state)} <span class="muted small">· الفترة من ${fmtDate(data.election.starts_at)} إلى ${fmtDate(data.election.ends_at)}</span></p>
</section>

<section class="stats-row">
  <div class="stat">
    <b class="mono">${data.total_ballots}</b>
    <span>إجمالي الأصوات الصحيحة بالصندوق</span>
  </div>
  <div class="stat">
    <b class="mono">${data.candidates.length}</b>
    <span>مرشحين متنافسين</span>
  </div>
  <div class="stat">
    <b class="mono">${data.participants || data.total_ballots}</b>
    <span>حالة تحقق بيومتري مكتملة</span>
  </div>
</section>

${data.hidden ? `<div class="notice">${icon('lock', 18)} النتائج التفصيلية محجوبة مؤقتًا حتى إغلاق باب الاقتراع.</div>` : ''}

<section class="section">
  <div class="sec-header-bar">
    <h2 class="sec-title" style="margin:0">ترتيب المرشحين ونسب التصويت الحية</h2>
    <a class="btn primary" href="/register?e=${esc(data.election.id)}">${icon('lotus', 18)} شارك بصوتك الآن</a>
  </div>
  <div class="results-leaderboard">${rows}</div>
</section>`;
}

/* ------------------------------------------------------------------ حالة المراجعة */
function reviewStatusPage({ reviewId, review }) {
  const box = {
    pending: `<div class="notice">${icon('warn', 18)} طلبك قيد المراجعة اليدوية.</div>
      <div class="row center-row"><button class="btn ghost" id="btn-refresh-review">تحديث الحالة</button></div>`,
    approved: `<div class="notice ok">${icon('check', 18)} تمت الموافقة — يمكنك استلام تذكرة الاقتراع والتصويت الآن.</div>
      <div class="row center-row"><button class="btn primary" id="btn-claim-token">${icon('lotus', 18)} استلام تذكرة الاقتراع</button></div>`,
    rejected: `<div class="notice err">${icon('warn', 18)} تم رفض المطابقة لعدم تطابق صورة الوجه مع البطاقة المسجّلة.</div>
      <div class="row center-row"><a class="btn primary" href="/verify">إعادة المحاولة</a></div>`,
  }[review.status] || '';
  return `
<section class="page-head"><h1>حالة طلب المراجعة #${esc(reviewId)}</h1></section>
<section class="card" id="review-card" data-review="${esc(reviewId)}">${box}</section>`;
}

function kioskPage({ elections }) {
  return `
<section class="page-head">
  <h1>نقطة الاقتراع المشتركة داخل اللجان</h1>
  <p class="muted">مخصّصة لأجهزة اللجان الانتخابية بحيث يقترع كل ناخب بتحققه البيومتري المستقل وتُفرغ الجلسة تلقائيًا عقب كل صوت.</p>
</section>
<section class="section">
  <div class="cards">
    ${elections.map((e) => `
      <article class="card election-card">
        <div class="ecard-top"><h3>${esc(e.title)}</h3>${stateChip(e.state)}</div>
        <p class="muted">${esc(e.description || '')}</p>
        <a class="btn primary" href="/register?e=${e.id}&kiosk=1">${icon('ankh', 18)} بدء جلسة ناخب جديد</a>
      </article>`).join('')}
  </div>
</section>`;
}

function alreadyVotedPage() {
  return `<section class="page-head center">
  <div class="seal warn">${icon('warn', 36)}</div>
  <h1>سبق لك التصويت في هذا الاستحقاق الانتخابي</h1>
  <p class="muted">تمنع المنظومة إصدار أكثر من تذكرة اقتراع واحدة لكل رقم قومي موثّق ضمانًا لنزاهة الانتخابات.</p>
  <div class="row center-row"><a class="btn primary" href="/results">${icon('eye', 18)} مشاهدة النتائج المباشرة</a><a class="btn ghost" href="/verify-receipt">فحص إيصالك</a></div>
</section>`;
}

function errorPage(msg) {
  return `<section class="page-head center">
  <div class="seal warn">${icon('warn', 36)}</div>
  <h1>تنبيه من النظام</h1>
  <p class="muted">${esc(msg || 'الصفحة المطلوبة غير متاحة')}</p>
  <div class="row center-row"><a class="btn primary" href="/">العودة للرئيسية</a></div>
</section>`;
}

module.exports = {
  landing, registerPage, otpPage, verifyPage, votePage, receiptPage, receiptLookupPage,
  resultsPage, reviewStatusPage, kioskPage, alreadyVotedPage, errorPage,
  fmtDate, stateChip, STATE_LABEL,
};
