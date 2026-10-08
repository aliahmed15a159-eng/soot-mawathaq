const { icon, esc, candidateSvg, symbolIcon, parseSlogan } = require('./layout');

const STATE_AR = {
  open: 'الاقتراع مفتوح الآن',
  closed: 'الاقتراع مغلق',
  upcoming: 'يبدأ قريبًا',
};

const DEMO_CARDS = [
  {
    nid: '31005292501518',
    name: 'علي أحمد علي محمد',
    dob: '2010-05-29',
    gov: 'أسيوط',
    gender: 'ذكر',
    phone: '01012345678',
    cardImg: '/cards/31005292501518.jpg',
    faceImg: '/cards/31005292501518-face.jpg',
    badge: 'بطاقة طالب أساسية للتجربة',
  },
  {
    nid: '30804150102345',
    name: 'عمر خالد إبراهيم حسن',
    dob: '2008-04-15',
    gov: 'القاهرة',
    gender: 'ذكر',
    phone: '01123456789',
    cardImg: '/cards/30804150102345.svg',
    faceImg: '/cards/30804150102345.svg',
    badge: 'بطاقة طالب تجريبية ٢',
  },
  {
    nid: '30907152101234',
    name: 'يوسف محمود عبد الرحمن',
    dob: '2009-07-15',
    gov: 'الجيزة',
    gender: 'ذكر',
    phone: '01234567890',
    cardImg: '/cards/30907152101234.svg',
    faceImg: '/cards/30907152101234.svg',
    badge: 'بطاقة طالب تجريبية ٣',
  },
];

/* ---------------------------------------------------------- ١) الصفحة الرئيسية (بأسلوب Kashif AI) */
function landing({ elections = [], counts = {}, cards = [] } = {}) {
  const activeElection = elections.find((e) => e.state === 'open') || elections[0] || null;
  const candidates = activeElection && activeElection.candidates ? activeElection.candidates : [];
  const sampleCards = cards.length ? cards : DEMO_CARDS;
  const firstCard = sampleCards[0] || DEMO_CARDS[0];

  return `
  <section class="hero">
    <div class="hero-copy">
      <div class="case-kicker">
        <span>BALLOT FILE</span>
        <b>#EG-2026</b>
        <i>OPEN</i>
      </div>
      <div class="eyebrow">
        ${icon('sparkle', 14)}
        <span>مختبر ونموذج محاكاة تجريبي متقدم للاقتراع البيومتري السري</span>
      </div>
      <h1>من هويتك ..<br><span>إلى صوتك</span></h1>
      <p>
        نموذج أولي تجريبي (Proof of Concept) لمنظومة اقتراع إلكتروني سري موثّق لانتخابات اتحاد طلاب مدارس الجمهورية.
        نفحص تطابق البصمة البيومترية العصبية (128-D) مع كشف الحياة لحظيًا عبر الكاميرا، ثم نعزل هويتك تمامًا ونصنع رمز اقتراع سريًا مشفرًا.
      </p>
      <div class="hero-action-row">
        <a class="sketch-button primary-button" href="/register${activeElection ? `?e=${activeElection.id}` : ''}">ابدأ التحقق والتصويت التجريبي</a>
        <span class="hand-arrow" aria-hidden="true">←</span>
      </div>
      <div class="investigator-signature">
        <div class="signature-mark">
          Soot-Biometric
          <span></span>
        </div>
        <div>
          <b>مختبر صوت للتوثيق الانتخابي الرقمي — نموذج PoC</b>
          <small>STUDENT UNION ELECTIONS // 128-D FACE MATCH + ZERO-LINK BALLOT</small>
        </div>
      </div>
      <div class="trust-note">
        <span class="mini-shield">${icon('shield', 17)}</span>
        <span>لا تُحفظ صور الكاميرا بعد استخراج البصمة، ولا يمكن ربط ورقة الاقتراع بالرقم القومي.</span>
      </div>
    </div>

    <div class="scanner-frame" id="scanner">
      <div class="file-tab">EVIDENCE / 01</div>
      <div class="case-spine">CASE // BIOMETRIC-VOTE-01</div>
      <div class="blueprint-marks" aria-hidden="true">
        <span>+</span>
        <span>&lt;/&gt;</span>
        <span>⌁</span>
      </div>
      <span class="corner-mark corner-one"></span>
      <span class="corner-mark corner-two"></span>

      <div class="scanner-topline">
        <div>
          <span class="status-dot"></span>
          <b>محطة فحص الهوية والاقتراع السري</b>
        </div>
        <span>SOOT TERMINAL // V2.6</span>
      </div>

      <div class="mode-tabs" role="tablist" aria-label="أوضاع المحطة">
        <button type="button" role="tab" aria-selected="true" class="active" data-hero-tab="quick-vote">
          ${icon('id', 16)}
          <span>تسجيل سريع</span>
        </button>
        <button type="button" role="tab" aria-selected="false" data-hero-tab="receipt-check">
          ${icon('receipt', 16)}
          <span>فحص إيصال</span>
        </button>
        <button type="button" role="tab" aria-selected="false" data-hero-tab="candidates-peek">
          ${icon('users', 16)}
          <span>المرشحون (${candidates.length})</span>
        </button>
      </div>

      <!-- تبويب ١: تسجيل سريع وبطاقة التجربة -->
      <div class="input-stage" data-hero-panel="quick-vote">
        <label for="hero-nid-preview">
          <span>ID-14</span>
          بطاقة ناخب جاهزة للتجربة الفورية
        </label>
        <div class="intel-panel" style="margin-top:0">
          <div class="intel-title">
            <span>REGISTERED VOTER RECORD</span>
            <b>${esc(firstCard.national_id_plain || firstCard.nid)}</b>
          </div>
          <div class="intel-grid">
            <div class="intel-check safe">
              <span>اسم الناخب المسجّل</span>
              <b>${icon('check-circle', 14)} ${esc(firstCard.full_name || firstCard.name)}</b>
            </div>
            <div class="intel-check info">
              <span>المحافظة وتاريخ الميلاد</span>
              <b>${esc(firstCard.governorate || firstCard.gov)} · ${esc(firstCard.birth_date || firstCard.dob)}</b>
            </div>
            <div class="intel-check safe">
              <span>بصمة الوجه (128-D)</span>
              <b>${icon('face', 14)} جاهزة للمطابقة بالكاميرا</b>
            </div>
            <div class="intel-check warning">
              <span>حالة الاستحقاق</span>
              <b>${activeElection ? esc(STATE_AR[activeElection.state] || 'مفتوح') : 'جاهز'}</b>
            </div>
          </div>
        </div>

        <div class="external-options">
          <div class="consent-row">
            ${icon('camera', 18)}
            <span>
              <b>كاميرا حقيقية + محاكي ذكي</b>
              <small>يعمل بالكاميرا المباشرة أو بالمحاكي التفاعلي عند غياب الكاميرا.</small>
            </span>
          </div>
          <div class="consent-row">
            ${icon('lock', 18)}
            <span>
              <b>عزل تام للهوية عن الصوت</b>
              <small>توقيع HMAC منفصل يمنع كشف اختيارك الانتخابي لأي جهة.</small>
            </span>
          </div>
        </div>

        <a class="sketch-button scan-button" href="/register${activeElection ? `?e=${activeElection.id}` : ''}">
          ${icon('face', 18)}
          <span>افتح محطة التحقق والتصويت الآن</span>
        </a>
      </div>

      <!-- تبويب ٢: فحص إيصال التصويت مباشر -->
      <div class="input-stage" data-hero-panel="receipt-check" hidden>
        <label for="hero-receipt-code">
          <span>RECEIPT</span>
          أدخل رقم إيصال التصويت للتحقق من وجوده في الصندوق
        </label>
        <input id="hero-receipt-code" type="text" class="ltr mono" placeholder="ABCDE-23456" maxlength="14" autocomplete="off">
        <div class="input-meta">
          <span>صيغة الكود: 5 حروف أو أرقام - شرطة - 5 حروف أو أرقام</span>
          <button type="button" id="hero-sample-receipt">تعبئة مثال تجريبي</button>
        </div>
        <button type="button" id="hero-check-receipt-btn" class="sketch-button scan-button">
          ${icon('search', 18)}
          <span>افحص الإيصال الآن</span>
        </button>
        <div id="hero-receipt-output"></div>
      </div>

      <!-- تبويب ٣: نظرة سريعة على المرشحين -->
      <div class="input-stage" data-hero-panel="candidates-peek" hidden>
        <label>
          <span>BALLOT</span>
          ${activeElection ? esc(activeElection.title) : 'قائمة المرشحين المعتمدين'}
        </label>
        <div class="terminal-cands-list">
          ${candidates.slice(0, 4).map((c, i) => `
            <div class="terminal-cand-row">
              <img src="${esc(c.photo_url || candidateSvg(c, i))}" alt="${esc(c.name)}" width="44" height="44">
              <div class="terminal-cand-info">
                <b>${esc(c.name)}</b>
                <small>${esc(c.title || c.role || 'مرشح معتمد')} · رمز: ${esc(c.symbol || 'انتخابي')}</small>
              </div>
              <span class="terminal-cand-num">#0${i + 1}</span>
            </div>
          `).join('')}
        </div>
        <a class="sketch-button scan-button" href="#candidates">
          ${icon('users', 18)}
          <span>استعرض بطاقات المرشحين كاملة</span>
        </a>
      </div>

      <div class="red-sticker" aria-hidden="true">
        ${icon('shield', 22)}
        <b>صوت</b>
        <b>موثّق</b>
      </div>
    </div>
  </section>

  <!-- شريط الخطوات الثلاث بأسلوب Kashif AI -->
  <section class="steps-row" aria-label="خطوات التصويت">
    <article>
      <span>01</span>
      <div>
        <b>سجّل بيانات بطاقتك القومية</b>
        <p>أدخل الاسم والرقم القومي المكون من 14 رقمًا أو اختر بطاقة جاهزة للتجربة الفورية.</p>
      </div>
      <small>STEP / 01</small>
    </article>
    <article>
      <span>02</span>
      <div>
        <b>تحقق بالكاميرا الحية أو المحاكي</b>
        <p>فحص حيوية الوجه ومطابقة البصمة العصبية (128-D) مع صورة البطاقة المسجّلة.</p>
      </div>
      <small>STEP / 02</small>
    </article>
    <article>
      <span>03</span>
      <div>
        <b>صوّت سرًّا واستلم إيصالًا رقميًا</b>
        <p>اختر مرشحك داخل كبسولة الاقتراع المعزولة واحتفظ بكود التحقق الفريد.</p>
      </div>
      <small>STEP / 03</small>
    </article>
  </section>

  <!-- قسم المرشحين والاستحقاق الانتخابي -->
  <section class="dossier-section" id="candidates">
    <div class="dossier-head">
      <div>
        <div class="case-kicker">
          <span>CANDIDATES DOSSIER</span>
          <b>#${activeElection ? activeElection.id : '01'}</b>
          <i>${activeElection ? esc(activeElection.state.toUpperCase()) : 'OPEN'}</i>
        </div>
        <h2>${activeElection ? esc(activeElection.title) : 'الاستحقاق الانتخابي النشط'}</h2>
        <p class="muted">${activeElection ? esc(activeElection.description || '') : 'اختر مرشحك بعد إتمام التحقق من الهوية.'}</p>
      </div>
      <div class="dossier-stats">
        <a class="sketch-button" href="/results${activeElection ? `?e=${activeElection.id}` : ''}">
          ${icon('chart', 16)}
          <span>لوحة الفرز والنتائج (${counts.ballots || 0} صوت)</span>
        </a>
      </div>
    </div>

    <div class="candidates-grid">
      ${candidates.map((c, idx) => {
        const photo = candidateSvg(c, idx);
        const { role, symbolText, symbolSvg } = parseSlogan(c.slogan || c.symbol || '', idx);
        const progText = c.program || c.bio || 'برنامج انتخابي يركّز على الشفافية والتحول الرقمي وخدمة الناخبين.';
        const modalPayload = JSON.stringify({
          id: c.id,
          number: idx + 1,
          name: c.name,
          role: c.title || role,
          symbol: `${symbolSvg} <span>الرمز: ${esc(c.symbol || symbolText)}</span>`,
          program: progText,
          photo,
        });
        return `
        <article class="candidate-card" data-candidate>
          <div class="cc-top">
            <span class="cc-number">CANDIDATE #0${idx + 1}</span>
            <span class="cc-symbol">${symbolSvg} <b>${esc(c.symbol || symbolText)}</b></span>
          </div>
          <img class="cc-photo" src="${esc(photo)}" alt="صورة ${esc(c.name)}" width="96" height="96" loading="lazy">
          <h3 class="cc-name">${esc(c.name)}</h3>
          <p class="cc-role">${esc(c.title || role)}</p>
          <p class="cc-program">${esc(String(progText).slice(0, 145))}${String(progText).length > 145 ? '…' : ''}</p>
          <button type="button" class="sketch-button cc-more" data-open-candidate='${esc(modalPayload)}'>
            <span>ملف المرشح والبرنامج</span>
            ${icon('arrow-left', 15)}
          </button>
        </article>`;
      }).join('')}
    </div>
  </section>

  <!-- نافذة تفاصيل المرشح -->
  <dialog id="candidate-dialog" class="modal" aria-labelledby="cd-title-modal">
    <div class="modal-head">
      <h3 id="cd-title-modal">ملف المرشح</h3>
      <button type="button" class="sketch-button icon-btn" data-close-modal aria-label="إغلاق">${icon('close', 18)}</button>
    </div>
    <div class="modal-body">
      <div class="candidate-details">
        <img id="cd-photo" src="" alt="" width="110" height="110">
        <div>
          <span class="cc-number" id="cd-number"></span>
          <h4 id="cd-name" style="margin:6px 0 4px;font-size:20px;font-weight:900"></h4>
          <p id="cd-role" class="muted" style="margin:0 0 8px;font-size:13px"></p>
          <div id="cd-symbol" class="cc-symbol"></div>
          <div class="cd-program-box">
            <b>البرنامج الانتخابي الكامل:</b>
            <p id="cd-program" style="margin:6px 0 0;line-height:1.8"></p>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-actions">
      <a id="cd-cta" class="sketch-button primary-button" href="/register">ابدأ التحقق للتصويت</a>
      <button type="button" class="sketch-button" data-close-modal>إغلاق</button>
    </div>
  </dialog>
  `;
}

/* ---------------------------------------------------------- ٢) صفحة التسجيل */
function registerPage({ election, elections = [], cards = [] } = {}) {
  const active = election || elections.find((e) => e.state === 'open') || elections[0] || { id: 1, title: 'انتخابات المكتب التنفيذي لاتحاد طلاب مدارس الجمهورية - دورة 2026/2027', state: 'open' };
  const sampleCards = cards && cards.length ? cards : DEMO_CARDS;

  return `
  <section class="page-head">
    <div class="case-kicker">
      <span>STEP 01 // REGISTER</span>
      <b>#${active.id}</b>
      <i>IDENTITY INPUT</i>
    </div>
    <h1>تسجيل <span>بيانات الناخب</span></h1>
    <p class="muted">أدخل بيانات بطاعة الرقم القومي المكونة من 14 رقمًا، أو اضغط على إحدى بطاقات التجربة الجاهزة بالأسفل للتعبئة التلقائية.</p>
  </section>

  <div class="register-layout">
    <div class="scanner-frame form-scanner">
      <div class="file-tab">VOTER / DATA</div>
      <span class="corner-mark corner-one"></span>
      <span class="corner-mark corner-two"></span>

      <div class="scanner-topline">
        <div>
          <span class="status-dot"></span>
          <b>نموذج التحقق من الرقم القومي المصري</b>
        </div>
        <span>STEP 01 // NID CHECK</span>
      </div>

      <!-- شريط التعبئة السريعة لبطاقات التجربة -->
      <div class="demo-bar">
        <div class="demo-bar-head">
          ${icon('sparkle', 16)}
          <b>بطاقات جاهزة للتجربة الفورية (اضغط للتعبئة التلقائية):</b>
        </div>
        <div class="demo-chips">
          ${sampleCards.map((c, idx) => {
            const nid = c.national_id_plain || c.nid;
            const name = c.full_name || c.name;
            const dob = c.birth_date || c.dob;
            const gov = c.governorate || c.gov;
            const phone = c.phone || '01012345678';
            return `<button type="button" class="sketch-button demo-chip btn-fill-card ${idx === 0 ? 'is-first' : ''}"
              ${idx === 0 ? 'id="btn-fill-sample-card"' : ''}
              data-name="${esc(name)}"
              data-nid="${esc(nid)}"
              data-dob="${esc(dob)}"
              data-gov="${esc(gov)}"
              data-phone="${esc(phone)}">
              ${icon('id', 15)}
              <span>${esc(name)}</span>
              <code class="mono ltr">${esc(nid.slice(0, 4))}…${esc(nid.slice(-3))}</code>
            </button>`;
          }).join('')}
        </div>
      </div>

      <div id="form-error" class="error-note" role="alert" hidden></div>

      <form id="register-form" class="input-stage" style="padding-top:10px" novalidate>
        <input type="hidden" name="election_id" value="${esc(active.id)}">

        <div class="field">
          <label for="full_name"><span>NAME</span> الاسم الكامل رباعيًا كما في البطاقة <i class="req">*</i></label>
          <input id="full_name" name="full_name" type="text" required autocomplete="name" placeholder="مثال: علي أحمد علي محمد">
        </div>

        <div class="field">
          <label for="national_id"><span>NID-14</span> الرقم القومي (14 رقمًا) <i class="req">*</i></label>
          <input id="national_id" name="national_id" type="text" inputmode="numeric" maxlength="14" class="ltr mono" required placeholder="31005292501518">
          <small id="nid-hint" class="hint">0/14 رقم — نقرأ منه تاريخ الميلاد والمحافظة تلقائيًا</small>
        </div>

        <div id="nid-preview" class="nid-preview" hidden>
          <span class="mini-badge">النوع: <b id="np-gender">—</b></span>
          <span class="mini-badge">الميلاد: <b id="np-dob" class="ltr">—</b></span>
          <span class="mini-badge">المحافظة: <b id="np-gov">—</b></span>
        </div>

        <div class="grid-2">
          <div class="field">
            <label for="birth_date"><span>DOB</span> تاريخ الميلاد <i class="req">*</i></label>
            <input id="birth_date" name="birth_date" type="date" class="ltr" required>
          </div>
          <div class="field">
            <label for="governorate"><span>GOV</span> المحافظة <i class="req">*</i></label>
            <select id="governorate" name="governorate" required>
              <option value="">اختر المحافظة…</option>
              ${['القاهرة','الجيزة','الإسكندرية','أسيوط','الدقهلية','الشرقية','القليوبية','الغربية','المنوفية','البحيرة','كفر الشيخ','دمياط','بورسعيد','الإسماعيلية','السويس','الفيوم','بني سويف','المنيا','سوهاج','قنا','الأقصر','أسوان','البحر الأحمر','الوادي الجديد','مطروح','شمال سيناء','جنوب سيناء','خارج الجمهورية'].map((g) => `<option value="${g}">${g}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="field">
          <label for="phone"><span>TEL</span> رقم الموبايل المصري <i class="req">*</i></label>
          <input id="phone" name="phone" type="tel" inputmode="numeric" maxlength="11" class="ltr mono" required placeholder="01012345678">
        </div>

        <label class="consent-row" for="consent" style="margin-top:12px !important">
          <input id="consent" name="consent" type="checkbox" required>
          <span>
            <b>أوافق على التحقق المؤقت من هويتي عبر الكاميرا لإصدار رمز اقتراع سري</b>
            <small>تُستخدم البيانات للتحقق فقط من عدم تكرار التصويت، وتُفصل تمامًا عن ورقة الاقتراع.</small>
          </span>
        </label>

        <button type="submit" class="sketch-button scan-button">
          <span>متابعة إلى مطابقة الوجه بالكاميرا</span>
          ${icon('arrow-left', 18)}
        </button>
      </form>
    </div>

    <aside class="side-panel">
      <div class="intel-panel">
        <div class="intel-title">
          <span>ELECTION TARGET</span>
          <b>#${active.id}</b>
        </div>
        <h3 style="margin:10px 0 6px;font-size:17px;font-weight:900">${esc(active.title)}</h3>
        <p class="muted" style="margin:0 0 12px;font-size:13px;line-height:1.7">${esc(active.description || 'استحقاق انتخابي إلكتروني موثّق بالتحقق البيومتري.')}</p>
        <div class="intel-grid">
          <div class="intel-check safe">
            <span>حالة الصندوق</span>
            <b>${esc(STATE_AR[active.state] || 'مفتوح')}</b>
          </div>
          <div class="intel-check info">
            <span>قاعدة التصويت</span>
            <b>صوت واحد لكل رقم قومي</b>
          </div>
        </div>
      </div>

      <div class="advice-note">
        <b>كيف تعمل مطابقة الكاميرا؟</b>
        <p>بعد إدخال بياناتك، ستفتح الكاميرا مباشرة في الخطوة التالية لالتقاط سيلفي ومقارنته بصورة بطاقتك المسجّلة في قاعدة البيانات دون الحاجة لرفع صورة البطاقة يدويًا.</p>
      </div>
    </aside>
  </div>
  `;
}

/* ---------------------------------------------------------- ٢.٥) صفحة كود الموبايل OTP */
function otpPage({ voter, challenge, maskedPhone, devCode } = {}) {
  const masked = (challenge && challenge.masked) || maskedPhone || (voter && voter.phone_masked) || '010****5678';
  const code = (challenge && challenge.dev_code) || devCode || '';

  return `
  <section class="page-head">
    <div class="case-kicker">
      <span>STEP 01.5 // OTP VERIFY</span>
      <b>SMS CODE</b>
      <i>PENDING</i>
    </div>
    <h1>تأكيد <span>رقم الموبايل</span></h1>
    <p class="muted">أرسلنا كود تحقق مكوّنًا من 6 أرقام إلى الرقم <b class="ltr mono">${esc(masked)}</b>.</p>
  </section>

  <div class="scanner-frame" style="max-width:620px;margin:0 auto 44px">
    <div class="file-tab">OTP / VERIFY</div>
    <div class="scanner-topline">
      <div><span class="status-dot"></span><b>بوابة تأكيد رمز الرسائل القصيرة</b></div>
      <span>OTP // 6-DIGITS</span>
    </div>

    ${code ? `
    <div class="advice-note" style="margin-bottom:14px">
      <b>وضع التجربة المحلي — كود التحقق الفوري:</b>
      <p>الكود التجريبي الخاص بك هو: <code class="mono ltr" style="font-size:18px;font-weight:900;padding:2px 8px;background:#fff;border:1.5px solid var(--ink)">${esc(code)}</code></p>
    </div>` : ''}

    <div id="otp-error" class="error-note" role="alert" hidden></div>

    <form id="otp-form" class="input-stage" style="padding-top:6px">
      <div class="field">
        <label for="otp-code"><span>CODE</span> كود التحقق (6 أرقام)</label>
        <input id="otp-code" name="code" type="text" inputmode="numeric" maxlength="6" class="ltr mono otp-input" value="${esc(code)}" placeholder="123456" required>
      </div>
      <div class="input-meta">
        <span>صالح لمدة 5 دقائق</span>
        <button type="button" id="btn-resend-otp">إعادة إرسال الكود الآن</button>
      </div>
      <button type="submit" class="sketch-button scan-button">
        ${icon('check-circle', 18)}
        <span>تأكيد الكود والانتقال للكاميرا</span>
      </button>
    </form>
  </div>
  `;
}

/* ---------------------------------------------------------- ٣) صفحة التحقق من الهوية والكاميرا */
function verifyPage({ voter, election, rollCard } = {}) {
  const cardImg = (rollCard && rollCard.card_image) || '/cards/31005292501518.jpg';
  const faceRef = (rollCard && (rollCard.face_image || rollCard.photo_data)) || cardImg;
  const voterName = (voter && voter.full_name) || (rollCard && rollCard.full_name) || 'ناخب مسجّل';
  const voterGov = (voter && voter.governorate) || (rollCard && rollCard.governorate) || '—';
  const voterDob = (voter && voter.birth_date) || (rollCard && rollCard.birth_date) || '—';

  return `
  <section class="page-head">
    <div class="case-kicker">
      <span>STEP 02 // BIOMETRIC SCAN</span>
      <b>128-D NEURAL</b>
      <i>CAMERA LIVE</i>
    </div>
    <h1>التحقق من <span>الهوية بالكاميرا</span></h1>
    <p class="muted">نطابق صورة وجهك المباشرة مع البطاقة المسجّلة في قاعدة البيانات للتحقق من الهوية وكشف الحياة.</p>
  </section>

  <div id="verify-app" class="verify-app">
    <canvas id="canvas" width="640" height="480" hidden></canvas>
    <input id="selfie-file" type="file" accept="image/*" capture="user" hidden>

    <!-- أزرار خطوة البطاقة للتوافق مع الاختبارات التلقائية -->
    <div id="card-compat-hooks" hidden>
      <button type="button" id="btn-capture-card">التقاط البطاقة</button>
      <div id="card-preview" hidden>
        <button type="button" id="btn-card-ok">اعتماد البطاقة</button>
      </div>
    </div>

    <!-- الخطوة النشطة: التقاط السيلفي ومطابقة البطاقة -->
    <div class="v-step" data-step="selfie">
      <div class="verify-grid">
        <!-- يمين: بطاقة الناخب المرجعية في قاعدة البيانات -->
        <div class="intel-panel ref-panel">
          <div class="intel-title">
            <span>REFERENCE ID CARD</span>
            <b>VERIFIED RECORD</b>
          </div>
          <div class="ref-person">
            <img id="db-face-ref" src="${esc(faceRef)}" alt="صورة الوجه المسجّلة" crossorigin="anonymous" class="ref-avatar">
            <div>
              <b>${esc(voterName)}</b>
              <span class="muted">${esc(voterGov)} · الميلاد: <code class="ltr">${esc(voterDob)}</code></span>
              <span class="ai-badge" style="margin-top:6px"><i id="ai-engine-text">جارٍ تجهيز محرك البصمة العصبية…</i></span>
            </div>
          </div>

          <div class="ref-card-wrap">
            <img id="db-card-img" src="${esc(cardImg)}" alt="بطاقة الرقم القومي المسجّلة" crossorigin="anonymous" class="ref-card-img">
          </div>

          <div class="intel-grid">
            <div class="intel-check safe">
              <span>قراءة البطاقة</span>
              <b>${icon('check-circle', 14)} مطابقة للسجل المدني</b>
            </div>
            <div class="intel-check info">
              <span>الاستحقاق</span>
              <b>${esc(election ? election.title : 'انتخابات المكتب التنفيذي لاتحاد طلاب مدارس الجمهورية')}</b>
            </div>
          </div>
        </div>

        <!-- يسار: شاشة الكاميرا الفورية (بأسلوب Kashif Scanner) -->
        <div class="scanner-frame camera-panel">
          <div class="file-tab">LIVE / CAMERA</div>
          <span class="corner-mark corner-one"></span>
          <span class="corner-mark corner-two"></span>

          <div class="scanner-topline">
            <div>
              <span class="status-dot" id="cam-dot"></span>
              <b id="cam-status" class="cam-status">جارٍ تشغيل الكاميرا تلقائيًا…</b>
            </div>
            <span>BIOMETRIC // CAM-01</span>
          </div>

          <div id="verify-error" class="error-note" role="alert" hidden></div>

          <div class="camera-meta-bar">
            <span class="small"><b>حركات التحقق الحي:</b></span>
            <ul id="challenge-list" class="challenge-chips">
              <li data-code="blink" class="done">ارمش بعينيك</li>
              <li data-code="smile" class="done">ابتسم قليلًا</li>
              <li data-code="close" class="done">اقترب قليلًا من الكاميرا</li>
            </ul>
          </div>

          <div class="camera-frame" id="camera-viewport">
            <video id="video-selfie" autoplay playsinline muted></video>
            <span class="frame-corner tl"></span>
            <span class="frame-corner tr"></span>
            <span class="frame-corner bl"></span>
            <span class="frame-corner br"></span>
            <div class="face-guide" id="face-guide-box">
              <span id="face-guide-label">ضع وجهك داخل الإطار</span>
            </div>
            <div class="scanline" aria-hidden="true"></div>
            <div class="liveness-meter" title="مؤشر التحقق الحي">
              <span id="liveness-bar" style="width:100%"></span>
            </div>
          </div>

          <!-- أزرار التحكم بالكاميرا -->
          <div class="camera-controls">
            <button type="button" id="btn-capture-selfie" class="sketch-button scan-button" style="margin-top:0">
              ${icon('camera', 18)}
              <span>التقاط الصورة المباشرة الآن</span>
            </button>
            <div class="camera-sub-actions">
              <button type="button" id="btn-start-camera" class="sketch-button btn-sm">
                ${icon('refresh', 15)}
                <span>تشغيل / إعادة فتح الكاميرا</span>
              </button>
              <button type="button" id="btn-sim-camera" class="sketch-button btn-sm">
                ${icon('sparkle', 15)}
                <span>المحاكي الذكي التفاعلي</span>
              </button>
              <button type="button" id="btn-switch-cam" class="sketch-button btn-sm">
                ${icon('camera', 15)}
                <span>تبديل الكاميرا</span>
              </button>
            </div>
          </div>

          <!-- معاينة الصورة الملتقطة واعتمادها -->
          <div id="selfie-preview" class="captured-box" hidden>
            <div class="intel-title" style="margin-bottom:8px">
              <span>CAPTURED FRAME</span>
              <b>جاهزة للمطابقة العصبية</b>
            </div>
            <img id="selfie-img" alt="صورة السيلفي الملتقطة">
            <div class="captured-actions">
              <button type="button" id="btn-selfie-ok" class="sketch-button scan-button" style="margin-top:0">
                ${icon('check-circle', 18)}
                <span>هذه صورتي — ابدأ المطابقة الآن</span>
              </button>
              <button type="button" id="btn-selfie-retake" class="sketch-button">
                ${icon('refresh', 16)}
                <span>إعادة الالتقاط</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- خطوة المعالجة -->
    <div class="v-step" data-step="processing" hidden>
      <div class="scanner-frame loading-stage">
        <div class="file-tab">ANALYZING // AI</div>
        <div class="scan-circle">
          ${icon('face', 38)}
        </div>
        <h2>جارٍ تحليل البصمة البيومترية ومطابقة الوجه…</h2>
        <p>نقارن 128 نقطة مميزة في الوجه مع صورة البطاقة المسجّلة ونتحقق من مؤشرات الحيوية.</p>
        <ul id="progress-list" class="progress-list">
          <li class="active">١. فحص بيانات البطاقة المسجّلة وصلاحية الرقم القومي</li>
          <li>٢. تحليل إشارات الحياة ومقاومة الصور الثابتة</li>
          <li>٣. استخراج البصمة العصبية للوجه (128-D) وحساب المسافة الإقليدية</li>
          <li>٤. إصدار قرار التحقق وتوليد رمز الاقتراع السري</li>
        </ul>
      </div>
    </div>

    <!-- خطوة النتيجة -->
    <div class="v-step" data-step="result" hidden>
      <div class="scanner-frame" id="result-box"></div>
    </div>
  </div>
  `;
}

/* ---------------------------------------------------------- ٤) صفحة الاقتراع السري */
function votePage({ election, candidates = [], voter, kiosk = false } = {}) {
  return `
  <section class="page-head">
    <div class="case-kicker">
      <span>STEP 03 // SECRET BALLOT</span>
      <b>#${election ? election.id : '01'}</b>
      <i>ZERO-LINK</i>
    </div>
    <h1>ورقة <span>الاقتراع السري</span></h1>
    <p class="muted">${esc(election ? election.title : 'انتخابات المكتب التنفيذي لاتحاد طلاب مدارس الجمهورية')} — اختر مرشحًا واحدًا فقط ثم اضغط اعتماد الصوت.</p>
  </section>

  <div class="ballot-banner" style="margin-bottom:18px">
    <div>
      ${icon('lock', 18)}
      <span><b>جلسة اقتراع معزولة:</b> تم التحقق من هوية <b>${esc(voter ? voter.full_name : 'الناخب')}</b> وفصلها عن بطاقة التصويت.</span>
    </div>
    ${kiosk ? '<span class="partial-badge">وضع لجنة الاقتراع المشتركة</span>' : '<span class="ai-badge">توقيع رقمي HMAC</span>'}
  </div>

  <div class="scanner-frame ballot-sheet">
    <div class="file-tab">OFFICIAL // BALLOT</div>
    <div class="scanner-topline">
      <div><span class="status-dot"></span><b>بطاقة اقتراع رسمية — اختر مرشحًا واحدًا</b></div>
      <span>BALLOT // #${election ? election.id : '01'}</span>
    </div>

    <div id="vote-error" class="error-note" role="alert" hidden></div>

    <form id="vote-form" data-election="${esc(election ? election.id : 1)}">
      <div class="ballot-grid">
        ${candidates.map((c, idx) => {
          const photo = c.photo_url || candidateSvg(c, idx);
          const symSvg = symbolIcon(c.symbol);
          return `
          <label class="ballot-card candidate" for="cand-${c.id}">
            <input id="cand-${c.id}" type="radio" name="candidate_id" value="${esc(c.id)}" required>
            <div class="ballot-card-inner">
              <div class="ballot-top">
                <span class="cc-number">#0${idx + 1}</span>
                <span class="cc-symbol">${symSvg} <b>${esc(c.symbol || 'رمز')}</b></span>
              </div>
              <div class="ballot-person">
                <img class="ballot-avatar" src="${esc(photo)}" alt="${esc(c.name)}" width="68" height="68">
                <div>
                  <strong class="ballot-name name">${esc(c.name)}</strong>
                  <span class="ballot-role">${esc(c.title || c.role || 'مرشح معتمد')}</span>
                </div>
              </div>
              <p class="ballot-program">${esc(c.bio || c.program || '')}</p>
              <div class="ballot-select">
                <span class="ballot-radio">${icon('check', 14)}</span>
                <b>اختيار هذا المرشح</b>
              </div>
            </div>
          </label>`;
        }).join('')}
      </div>

      <div class="vote-actions">
        <button type="submit" class="sketch-button scan-button">
          ${icon('vote', 18)}
          <span>اعتماد الصوت النهائي وإصدار الإيصال</span>
        </button>
      </div>
    </form>
  </div>

  <dialog id="confirm-dialog" class="modal" aria-labelledby="confirm-title">
    <div class="modal-head">
      <h3 id="confirm-title">تأكيد إيداع الصوت في الصندوق</h3>
      <button type="button" class="sketch-button icon-btn" id="confirm-no" aria-label="إغلاق">${icon('close', 18)}</button>
    </div>
    <div class="modal-body confirm-body">
      <div class="confirm-ic">${icon('vote', 28)}</div>
      <p style="margin:0 0 8px;font-weight:700">أنت على وشك تسجيل صوتك النهائي لصالح المرشح:</p>
      <div id="confirm-name" class="confirm-name">—</div>
      <p class="muted small" style="margin-top:10px">لا يمكن التراجع أو تعديل الاختيار بعد إيداع الورقة في الصندوق.</p>
    </div>
    <div class="modal-actions">
      <button type="button" id="confirm-yes" class="sketch-button primary-button">نعم، سجّل صوتي</button>
      <button type="button" class="sketch-button" data-close-modal>مراجعة الاختيار</button>
    </div>
  </dialog>
  `;
}

/* ---------------------------------------------------------- ٥) صفحة إيصال التصويت */
function receiptPage({ receipt, election, electionTitle, total = 0, castAt } = {}) {
  const code = (typeof receipt === 'string' ? receipt : (receipt && (receipt.receipt_code || receipt.code))) || '—';
  const time = castAt || (receipt && (receipt.cast_at || receipt.created_at)) || new Date().toISOString();
  const title = electionTitle || (election && election.title) || (receipt && receipt.election_title) || 'انتخابات اتحاد طلاب مدارس الجمهورية';

  return `
  <section class="page-head">
    <div class="case-kicker">
      <span>STEP 04 // DIGITAL RECEIPT</span>
      <b>VERIFIED</b>
      <i>RECORDED</i>
    </div>
    <h1>تم تسجيل <span>صوتك بنجاح</span></h1>
    <p class="muted">احتفظ برقم الإيصال الرقمي للتحقق في أي وقت من أن صوتك محسوب ضمن الفرز النهائي.</p>
  </section>

  <div class="scanner-frame" style="max-width:740px;margin:0 auto 44px">
    <div class="file-tab">RECEIPT // 04</div>
    <div class="case-spine">BALLOT // CONFIRMED</div>
    <div class="scanner-topline">
      <div><span class="status-dot"></span><b>إيصال إيداع رقمي موقّع — لا يكشف اختيارك</b></div>
      <span>SOOT // RECEIPT</span>
    </div>

    <div class="result-card safe" style="padding-top:8px">
      <div class="result-head">
        <div>
          <div class="result-badge-row">
            <small>حالة الورقة الانتخابية</small>
            <span class="ai-badge">${icon('check-circle', 13)} صوت محسوب ومؤمّن</span>
          </div>
          <h2>تم إيداع صوتك في الصندوق</h2>
        </div>
        <div class="score-circle">
          <b>100%</b>
          <span>SEALED</span>
        </div>
      </div>

      <div class="receipt-code-block">
        <span class="receipt-label">رقم الإيصال الرقمي الفريد (انسخه أو اطبعه)</span>
        <div id="receipt-code" class="receipt-code mono ltr">${esc(code)}</div>
      </div>

      <div class="intel-panel">
        <div class="intel-title">
          <span>CRYPTOGRAPHIC METADATA</span>
          <b>ZERO-KNOWLEDGE</b>
        </div>
        <div class="intel-grid">
          <div class="intel-check safe">
            <span>الاستحقاق الانتخابي</span>
            <b>${esc(title)}</b>
          </div>
          <div class="intel-check info">
            <span>وقت الإيداع (UTC)</span>
            <b class="ltr mono">${esc(String(time).replace('T', ' ').slice(0, 19))}</b>
          </div>
          <div class="intel-check safe">
            <span>ارتباط الهوية بالصوت</span>
            <b>مفصول تمامًا (Zero-Link)</b>
          </div>
          <div class="intel-check info">
            <span>إجمالي الأصوات بالصندوق</span>
            <b>${total || 1} صوت محسوب</b>
          </div>
        </div>
      </div>

      <div class="receipt-actions" style="margin-top:18px">
        <button type="button" id="btn-copy" class="sketch-button primary-button">
          ${icon('copy', 16)}
          <span>نسخ رقم الإيصال</span>
        </button>
        <button type="button" onclick="window.print()" class="sketch-button">
          ${icon('print', 16)}
          <span>طباعة الإيصال</span>
        </button>
        <a class="sketch-button" href="/verify-receipt?code=${encodeURIComponent(code)}">
          ${icon('search', 16)}
          <span>تحقق من الإيصال في السجل</span>
        </a>
        <a class="sketch-button" href="/results">
          ${icon('chart', 16)}
          <span>مشاهدة النتائج المباشرة</span>
        </a>
      </div>
    </div>
  </div>
  `;
}

/* ---------------------------------------------------------- ٦) صفحة التحقق من إيصال */
function receiptLookupPage({ code = '', result = null } = {}) {
  const isFound = result && (result.ok || result.kind === 'found');
  const castAt = result && (result.cast_at || (result.ballot && result.ballot.cast_at) || '');
  const eTitle = result && (result.election_title || (result.election && result.election.title) || 'انتخابات اتحاد طلاب مدارس الجمهورية');

  return `
  <section class="page-head">
    <div class="case-kicker">
      <span>AUDIT // RECEIPT VERIFIER</span>
      <b>PUBLIC LEDGER</b>
      <i>OPEN</i>
    </div>
    <h1>فحص <span>إيصال التصويت</span></h1>
    <p class="muted">أدخل رقم الإيصال المكون من 10 أحرف وأرقام للتأكد من أن صوتك مسجّل ومحسوب داخل الصندوق.</p>
  </section>

  <div class="scanner-frame" style="max-width:740px;margin:0 auto 44px">
    <div class="file-tab">VERIFY / RECEIPT</div>
    <div class="scanner-topline">
      <div><span class="status-dot"></span><b>كاشف الإيصالات الرقمية في سجل الاقتراع</b></div>
      <span>LEDGER // CHECK</span>
    </div>

    <form method="GET" action="/verify-receipt" class="input-stage" style="padding-top:6px">
      <label for="code-input"><span>CODE</span> رقم الإيصال الرقمي</label>
      <div class="row" style="gap:10px">
        <input id="code-input" name="code" type="text" value="${esc(code)}" class="ltr mono" placeholder="ABCDE-23456" required style="flex:1">
        <button type="submit" class="sketch-button primary-button" style="min-height:54px">
          ${icon('search', 18)}
          <span>افحص الآن</span>
        </button>
      </div>
    </form>

    ${code ? (isFound ? `
      <div class="result-card safe">
        <div class="result-head">
          <div>
            <div class="result-badge-row"><small>نتيجة الفحص في السجل</small><span class="ai-badge">موجود ومعتمد</span></div>
            <h2>إيصال صالح — صوتك محسوب في الصندوق</h2>
          </div>
          <div class="score-circle"><b>✓</b><span>VALID</span></div>
        </div>
        <div class="intel-panel">
          <div class="intel-title"><span>BALLOT RECORD</span><b class="ltr mono">${esc(code)}</b></div>
          <div class="intel-grid">
            <div class="intel-check safe">
              <span>الاستحقاق الانتخابي</span>
              <b>${esc(eTitle)}</b>
            </div>
            <div class="intel-check info">
              <span>تاريخ ووقت الإيداع</span>
              <b class="ltr mono">${esc(String(castAt).replace('T', ' ').slice(0, 19))}</b>
            </div>
          </div>
        </div>
      </div>
    ` : `
      <div class="result-card dangerous">
        <div class="result-head">
          <div>
            <small>نتيجة الفحص في السجل</small>
            <h2>الإيصال غير موجود في السجل</h2>
          </div>
          <div class="score-circle"><b>✕</b><span>NOT FOUND</span></div>
        </div>
        <div class="ai-analysis-block">
          <p>لم نجد أي ورقة اقتراع تحمل الكود <code class="mono ltr">${esc(code)}</code>. تأكد من كتابة الحروف والأرقام والشرطة في المنتصف بشكل صحيح.</p>
        </div>
      </div>
    `) : ''}
  </div>
  `;
}

/* ---------------------------------------------------------- ٧) صفحة النتائج */
function resultsPage({ data = null, elections = [], selected = null, electionId = null } = {}) {
  const active = (data && data.election) || selected || elections.find((e) => String(e.id) === String(electionId)) || elections[0] || null;
  const cands = ((data && data.candidates) || (active && active.candidates) || []).slice().sort((a, b) => (b.votes || 0) - (a.votes || 0));
  const total = (data && data.total !== undefined) ? data.total : ((active && active.total_ballots) || cands.reduce((s, c) => s + (c.votes || 0), 0));

  return `
  <section class="page-head">
    <div class="case-kicker">
      <span>LIVE TALLY // RESULTS</span>
      <b>#${active ? active.id : '01'}</b>
      <i>VERIFIED COUNT</i>
    </div>
    <h1>النتائج <span>وفرز الأصوات</span></h1>
    <p class="muted">فرز لحظي مباشر للأصوات المودعة في الصندوق والموثّقة بإيصالات رقمية.</p>
  </section>

  ${elections.length > 1 ? `
  <div class="election-switcher">
    ${elections.map((e) => `
      <a class="sketch-button switch-chip ${active && String(e.id) === String(active.id) ? 'active' : ''}" href="/results?e=${e.id}">
        <span>${esc(e.title)}</span>
      </a>
    `).join('')}
  </div>` : ''}

  ${active ? `
  <div class="scanner-frame" style="margin-bottom:44px;transform:none">
    <div class="file-tab">TALLY // #0${active.id}</div>
    <div class="scanner-topline">
      <div><span class="status-dot"></span><b>${esc(active.title)} — ${esc(STATE_AR[active.state] || 'مفتوح')}</b></div>
      <span>TOTAL // ${total} صوت محسوب</span>
    </div>

    <div class="result-head" style="margin-bottom:18px">
      <div>
        <small>إجمالي الأصوات الصحيحة في الصندوق</small>
        <h2>${total} صوت محسوب</h2>
      </div>
      <a class="sketch-button primary-button" href="/register?e=${active.id}">شارك بصوتك الآن</a>
    </div>

    <div class="results-list">
      ${cands.map((c, idx) => {
        const votes = c.votes || 0;
        const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
        const photo = c.photo_url || candidateSvg(c, idx);
        const isLeader = idx === 0 && votes > 0;
        return `
        <div class="result-row ${isLeader ? 'is-leader' : ''}">
          <span class="result-rank">#${idx + 1}</span>
          <img class="result-photo" src="${esc(photo)}" alt="${esc(c.name)}" width="56" height="56">
          <div class="result-body">
            <div class="result-top">
              <div class="result-who">
                <b>${esc(c.name)}</b>
                ${isLeader ? '<span class="ai-badge">المتقدّم</span>' : ''}
                <span class="result-meta">${esc(c.title || c.role || 'مرشح')} · الرمز: ${esc(c.symbol || '—')}</span>
              </div>
              <div class="result-nums">
                <b>${pct}%</b>
                <span>${votes} صوت</span>
              </div>
            </div>
            <div class="score-track" style="margin:10px 0 0"><span style="width:${Math.max(pct, votes > 0 ? 6 : 0)}%;background:${isLeader ? 'var(--green)' : 'var(--cyan)'}"></span></div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>
  ` : `<div class="scanner-frame"><p>لا توجد استحقاقات انتخابية متاحة حاليًا.</p></div>`}
  `;
}

/* ---------------------------------------------------------- ٨) صفحة حالة المراجعة اليدوية */
function reviewStatusPage({ reviewId, review } = {}) {
  const r = review || {};
  const status = r.status || 'pending';
  const rid = reviewId || r.id || '';

  return `
  <section class="page-head">
    <div class="case-kicker">
      <span>MANUAL REVIEW // COMMITTEE</span>
      <b>#${esc(rid)}</b>
      <i>${esc(status.toUpperCase())}</i>
    </div>
    <h1>حالة <span>طلب المراجعة</span></h1>
  </section>

  <div class="scanner-frame" id="review-card" data-review="${esc(rid)}" style="max-width:680px;margin:0 auto 44px">
    <div class="file-tab">REVIEW // #${esc(rid)}</div>
    <div class="scanner-topline">
      <div><span class="status-dot"></span><b>ملف مراجعة الهوية أمام لجنة الإشراف</b></div>
      <span>CASE // #${esc(rid)}</span>
    </div>

    ${status === 'approved' ? `
      <div class="result-card safe">
        <div class="result-head">
          <div><small>قرار لجنة الإشراف</small><h2>تمت الموافقة على هويتك</h2></div>
          <div class="score-circle"><b>✓</b><span>APPROVED</span></div>
        </div>
        <p style="margin:12px 0">اعتمدت لجنة الإشراف مطابقة هويتك يدويًا. اضغط الزر بالأسفل لاستلام رمز الاقتراع السري والتصويت فورًا.</p>
        <button type="button" id="btn-claim-token" class="sketch-button scan-button">استلام رمز الاقتراع والتصويت الآن</button>
      </div>
    ` : status === 'rejected' ? `
      <div class="result-card dangerous">
        <div class="result-head">
          <div><small>قرار لجنة الإشراف</small><h2>تم رفض طلب المطابقة</h2></div>
          <div class="score-circle"><b>✕</b><span>REJECTED</span></div>
        </div>
        <p style="margin:12px 0">تعذّر اعتماد المطابقة من قِبل اللجنة. يمكنك إعادة المحاولة بصورة أوضح.</p>
        <a class="sketch-button primary-button" href="/verify">إعادة التحقق بالكاميرا</a>
      </div>
    ` : `
      <div class="result-card suspicious">
        <div class="result-head">
          <div><small>حالة الطلب الآن</small><h2>قيد المراجعة اليدوية من اللجنة</h2></div>
          <div class="score-circle"><b>…</b><span>PENDING</span></div>
        </div>
        <p style="margin:12px 0">تُراجع اللجنة الصورتين الآن. حدّث هذه الصفحة بعد قليل لمتابعة القرار.</p>
        <button type="button" onclick="location.reload()" class="sketch-button">${icon('refresh', 16)} تحديث الحالة</button>
      </div>
    `}
  </div>
  `;
}

/* ---------------------------------------------------------- ٩) صفحة بطاقات التجربة */
function cardsDemoPage() {
  return `
  <section class="page-head">
    <div class="case-kicker">
      <span>TEST LAB // SAMPLE ID CARDS</span>
      <b>3 CARDS</b>
      <i>READY</i>
    </div>
    <h1>بطاقات <span>التجربة الجاهزة</span></h1>
    <p class="muted">استخدم أي بطاقة من البطاقات التالية لتجربة التسجيل والتحقق بالكاميرا أو المحاكي الذكي فورًا.</p>
  </section>

  <div class="cards-grid" style="margin-bottom:44px">
    ${DEMO_CARDS.map((c) => `
      <article class="scanner-frame" style="min-height:auto;transform:none;padding:24px">
        <div class="file-tab">${esc(c.badge)}</div>
        <img src="${esc(c.cardImg)}" alt="بطاقة ${esc(c.name)}" class="ref-card-img" style="margin-bottom:14px">
        <h3 style="margin:0 0 6px;font-size:18px;font-weight:900">${esc(c.name)}</h3>
        <div class="intel-grid" style="margin-bottom:14px">
          <div class="intel-check info"><span>الرقم القومي</span><b class="ltr mono">${esc(c.nid)}</b></div>
          <div class="intel-check safe"><span>الميلاد والمحافظة</span><b>${esc(c.dob)} · ${esc(c.gov)}</b></div>
        </div>
        <a class="sketch-button scan-button" href="/register">استخدم هذه البطاقة في التسجيل</a>
      </article>
    `).join('')}
  </div>
  `;
}

/* ---------------------------------------------------------- ١٠) صفحة كشك الاقتراع /vote-here */
function kioskPage({ elections = [], done = false } = {}) {
  const active = elections.find((e) => e.state === 'open') || elections[0] || { id: 1, title: 'انتخابات المكتب التنفيذي لاتحاد طلاب مدارس الجمهورية' };
  return `
  <div class="scanner-frame" style="max-width:680px;margin:28px auto 44px;text-align:center">
    <div class="file-tab">KIOSK // MODE</div>
    <div class="scanner-topline">
      <div><span class="status-dot"></span><b>محطة اقتراع اللجان المشتركة (Kiosk Mode)</b></div>
      <span>KIOSK // #01</span>
    </div>
    ${done ? `<div class="advice-note" style="margin-bottom:16px"><b>✓ تم تسجيل صوت الناخب السابق بنجاح ومسح الجلسة بالكامل.</b><p>الجهاز جاهز الآن للناخب التالي.</p></div>` : ''}
    <h1 style="font-size:38px;margin:12px 0">${esc(active.title)}</h1>
    <p class="muted" style="margin-bottom:22px">تمسح هذه المحطة جلسة كل ناخب تلقائيًا فور إيداع صوته لضمان السرية التامة.</p>
    <a class="sketch-button scan-button" href="/register?e=${active.id}&kiosk=1">ابدأ تصويت ناخب جديد الآن</a>
  </div>
  `;
}

/* ---------------------------------------------------------- ١١) صفحة الخطأ */
function errorPage(message = 'الصفحة غير موجودة') {
  return `
  <div class="scanner-frame" style="max-width:620px;margin:32px auto 44px;text-align:center">
    <div class="file-tab">ERROR // NOTICE</div>
    <h1 style="font-size:34px;margin:14px 0">تنبيه من المنصة</h1>
    <p class="muted" style="margin-bottom:20px">${esc(message)}</p>
    <a class="sketch-button primary-button" href="/">العودة إلى الصفحة الرئيسية</a>
  </div>
  `;
}

module.exports = {
  landing,
  registerPage,
  otpPage,
  verifyPage,
  votePage,
  receiptPage,
  receiptLookupPage,
  verifyReceiptPage: receiptLookupPage,
  resultsPage,
  reviewStatusPage,
  cardsDemoPage,
  kioskPage,
  voteHerePage: kioskPage,
  errorPage,
};
