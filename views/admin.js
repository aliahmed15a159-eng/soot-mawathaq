'use strict';
/** لوحة الإدارة: الانتخابات، المرشحون، المراجعة البشرية، سجل التدقيق */
const { shell, esc, icon } = require('./layout');
const { fmtDate, stateChip, STATE_LABEL } = require('./pages');

function adminLogin({ error, email = '' }) {
  return `
<section class="page-head center"><h1>لوحة إشراف الانتخابات</h1>
<p class="muted">تسجيل دخول مسؤول المنصة بالبريد الإلكتروني وكلمة المرور. كل عملية هنا تُسجَّل في سجل التدقيق.</p></section>
<form class="card form-card center-col" method="post" action="/api/admin/login" autocomplete="on">
  <div class="field">
    <label for="email">البريد الإلكتروني للمسؤول</label>
    <input id="email" name="email" type="email" dir="ltr" required value="${esc(email)}" placeholder="aliahmed055586@gmail.com">
  </div>
  <div class="field">
    <label for="password">كلمة المرور</label>
    <input id="password" name="password" type="password" dir="ltr" required placeholder="•••••••••••">
  </div>
  ${error ? `<p class="form-error">${esc(error)}</p>` : ''}
  <div class="form-actions" style="display:flex;flex-direction:column;gap:8px">
    <button class="btn primary lg" type="submit" style="width:100%">${icon('lock', 18)} تسجيل الدخول للوحة الإدارة</button>
    <button class="btn ghost small" type="button" onclick="document.getElementById('email').value='aliahmed055586@gmail.com';document.getElementById('password').value='01556377146';this.closest('form').submit();" style="width:100%">
      ⚡ دخول فوري بحساب الأدمن (aliahmed055586@gmail.com)
    </button>
  </div>
</form>`;
}

function adminDashboard({ stats, elections, reviews, audit, adminName, providers = {}, roll = {}, cards = [] }) {
  const electionRows = elections.map((e) => `
    <tr>
      <td>#${esc(e.id)}</td>
      <td><b>${esc(e.title)}</b><br><span class="muted small">${esc(e.description || '')}</span></td>
      <td>${stateChip(e.state)}</td>
      <td class="mono small">${fmtDate(e.starts_at)}</td>
      <td class="mono small">${fmtDate(e.ends_at)}</td>
      <td class="actions">
        ${e.state !== 'open' ? `<button class="btn tiny" data-election-state="${esc(e.id)}" data-state="open">فتح</button>` : ''}
        ${e.state === 'open' ? `<button class="btn tiny ghost" data-election-state="${esc(e.id)}" data-state="closed">غلق</button>` : ''}
        <a class="btn tiny ghost" href="/results?e=${esc(e.id)}">النتائج</a>
        <a class="btn tiny ghost" href="/admin?e=${esc(e.id)}">المرشحون</a>
      </td>
    </tr>`).join('');

  const reviewRows = reviews.map((r) => `
    <tr>
      <td>#${esc(r.id)}</td>
      <td>${esc(r.created_at).slice(0, 16).replace('T', ' ')}</td>
      <td>${(r.reasons || []).map(esc).join(' · ') || '—'}</td>
      <td class="mono">${esc(r.score)}</td>
      <td class="actions">
        <a class="btn tiny ghost" href="/admin/review/${esc(r.id)}">مراجعة الصور</a>
        <button class="btn tiny ok" data-review="${esc(r.id)}" data-approve="1">قبول</button>
        <button class="btn tiny danger" data-review="${esc(r.id)}" data-approve="0">رفض</button>
      </td>
    </tr>`).join('');

  const auditRows = audit.map((a) => `
    <tr>
      <td class="mono small">${esc(a.created_at).slice(0, 19).replace('T', ' ')}</td>
      <td><b>${esc(a.action)}</b></td>
      <td class="small">${esc(a.actor || 'system')}</td>
      <td class="mono xsmall">${esc(JSON.stringify(a.meta || {})).slice(0, 140)}</td>
    </tr>`).join('');

  return `
<section class="page-head">
  <h1>${icon('scarab', 26)} لوحة إشراف الانتخابات</h1>
  <p class="muted">أهلاً <b>${esc(adminName)}</b> · وضع قاعدة البيانات: <span class="chip">${stats.mode === 'supabase' ? 'Supabase' : 'تجربة محلية'}</span></p>
  <p class="muted small">فصل المهام: اللجنة تقبل أو ترفض الحالات المشكوك فيها، لكن <b>مايوجدش أي شاشة تعرض صوت ناخب باسمه</b> — الصوت مربوط بالانتخابة فقط.</p>
</section>

<section class="stats-row">
  <div class="stat"><b>${stats.voters}</b><span>ناخب مسجّل</span></div>
  <div class="stat"><b>${stats.elections}</b><span>انتخابة</span></div>
  <div class="stat"><b>${stats.pending_reviews}</b><span>طلب مراجعة معلّق</span></div>
  <div class="stat"><b>${stats.per_election.reduce((a, b) => a + b.ballots, 0)}</b><span>إجمالي الأصوات</span></div>
</section>

<nav class="tabs" id="admin-tabs">
  <button class="tab active" data-tab="overview">${icon('eye', 16)} نظرة عامة</button>
  <button class="tab" data-tab="elections">${icon('lotus', 16)} الانتخابات</button>
  <button class="tab" data-tab="reviews">${icon('warn', 16)} المراجعة (${reviews.length})</button>
  <button class="tab" data-tab="roll">${icon('scarab', 16)} كشوف الناخبين</button>
  <button class="tab" data-tab="systems">${icon('camera', 16)} المزوّدون</button>
  <button class="tab" data-tab="audit">${icon('lock', 16)} سجل التدقيق</button>
  <form method="post" action="/api/admin/logout" class="tab-form"><button class="tab ghost" type="submit">خروج</button></form>
</nav>

<section class="tab-panel active" data-panel="overview">
  <div class="cards three">
    ${stats.per_election.map((e) => `
      <article class="card feature">
        <h4>${esc(e.title)}</h4>
        <p class="muted small">${stateChip(e.state)}</p>
        <p><b>${e.ballots}</b> صوت · <b>${e.participants}</b> رمز صادر</p>
        <div class="bar thin"><span style="width:${e.participants ? Math.min(100, Math.round((e.ballots / Math.max(1, e.participants)) * 100)) : 0}%"></span></div>
        <a class="btn tiny ghost" href="/admin?e=${esc(e.id)}">إدارة المرشحين</a>
      </article>`).join('') || '<p class="muted">مفيش انتخابات بعد.</p>'}
  </div>
</section>

<section class="tab-panel" data-panel="elections">
  <form class="card form-card" id="form-election">
    <h3>${icon('ankh', 20)} إنشاء انتخابة جديدة</h3>
    <div class="grid-2">
      <div class="field"><label>العنوان</label><input name="title" required placeholder="مثال: انتخابات نادي أعضاء هيئة التدريس"></div>
      <div class="field"><label>نوع الاقتراع</label><select name="type"><option value="single">صوت واحد لمرشح واحد</option><option value="multi">أكثر من اختيار</option></select></div>
    </div>
    <div class="field"><label>الوصف</label><input name="description" placeholder="دورة 2026/2027"></div>
    <div class="grid-2">
      <div class="field"><label>يبدأ</label><input type="datetime-local" name="starts_at"></div>
      <div class="field"><label>ينتهي</label><input type="datetime-local" name="ends_at"></div>
    </div>
    <div class="form-actions"><button class="btn primary" type="submit">${icon('lotus', 18)} إنشاء</button></div>
  </form>

  <div class="table-wrap card">
    <table class="table">
      <thead><tr><th>#</th><th>الانتخابة</th><th>الحالة</th><th>من</th><th>إلى</th><th>إجراءات</th></tr></thead>
      <tbody>${electionRows || '<tr><td colspan="6" class="muted">مفيش انتخابات</td></tr>'}</tbody>
    </table>
  </div>

  <form class="card form-card" id="form-candidate">
    <h3>${icon('horus', 20)} إضافة مرشح</h3>
    <div class="grid-2">
      <div class="field"><label>الانتخابة</label><select name="election_id">${elections.map((e) => `<option value="${esc(e.id)}">#${esc(e.id)} — ${esc(e.title)}</option>`).join('')}</select></div>
      <div class="field"><label>اسم المرشح</label><input name="name" required></div>
    </div>
    <div class="grid-2">
      <div class="field"><label>الشعار</label><input name="slogan" placeholder="نائبة رئيس الاتحاد السابقة"></div>
      <div class="field"><label>البرنامج</label><input name="program" placeholder="دعم الأنشطة والتدريب"></div>
    </div>
    <div class="form-actions"><button class="btn primary" type="submit">${icon('scarab', 18)} أضف</button></div>
    <p class="muted small" id="cand-msg" hidden></p>
  </form>
</section>

<section class="tab-panel" data-panel="reviews">
  <div class="table-wrap card">
    <table class="table">
      <thead><tr><th>#</th><th>الوقت</th><th>سبب الإحالة</th><th>نسبة التشابه</th><th>القرار</th></tr></thead>
      <tbody>${reviewRows || '<tr><td colspan="5" class="muted">مفيش حالات معلّقة — كل الطلبات اتحسمت أوتوماتيك</td></tr>'}</tbody>
    </table>
  </div>
  <p class="muted small">صور المراجعة تُخزَّن مؤقتًا للمراجعة فقط، وتُحذف تلقائيًا بعد القرار أو بعد 24 ساعة.</p>
</section>

<section class="tab-panel" data-panel="roll">
  <div class="card" style="margin-bottom:20px">
    <h3>${icon('scarab', 20)} بطاقات الرقم القومي المسجّلة في قاعدة البيانات (${cards.length})</h3>
    <p class="muted">الناخب مبيرفعش بطاقته — المنصة بتطابق بياناته اللي بيكتبها مع البطاقة المسجّلة هنا، وبعدين تطابق وشه الحقيقي بوشه اللي في البطاقة.</p>
    <div class="cards two" style="margin-top:14px">
      ${cards.map((c) => `
        <article class="card" style="border:1px solid rgba(212,168,75,0.3)">
          ${c.card_image ? `<img src="${esc(c.card_image)}" alt="${esc(c.full_name)}" style="width:100%;border-radius:10px;margin-bottom:10px">` : ''}
          <h4 style="margin:0 0 6px">${esc(c.full_name)}</h4>
          <p class="muted small" style="margin:0">
            الرقم القومي: <code class="mono">${esc(c.national_id_plain || c.national_id_masked || '—')}</code><br>
            تاريخ الميلاد: <code>${esc(c.birth_date || '—')}</code> · المحافظة: <b>${esc(c.governorate || '—')}</b>
          </p>
        </article>
      `).join('') || '<p class="muted">مفيش بطاقات مسجّلة بعد.</p>'}
    </div>
  </div>

  <div class="grid-2">
    <div class="card form-card">
      <h3>${icon('camera', 20)} إصدار وإضافة بطاقة مصرية جديدة</h3>
      <p class="muted small">اكتب بيانات الشخص وارفع صورة وشه — المنصة هتصمّم بطاقة مصرية مطابقة وتحفظها في قاعدة البيانات وتستخرج بصمة الوجه أوتوماتيك.</p>
      <form id="form-new-card">
        <div class="field"><label>الاسم الرباعي (كما في البطاقة)</label>
          <input name="full_name" required placeholder="مثال: علي أحمد علي محمد">
        </div>
        <div class="grid-2">
          <div class="field"><label>تاريخ الميلاد</label>
            <input name="birth_date" type="date" required value="2010-05-29">
          </div>
          <div class="field"><label>المحافظة</label>
            <input name="governorate" required value="أسيوط" placeholder="أسيوط">
          </div>
        </div>
        <div class="grid-2">
          <div class="field"><label>الرقم القومي (١٤ رقم — أو سيبه فاضي يتولّد تلقائيًا)</label>
            <input name="national_id" class="mono" maxlength="14" placeholder="يتولّد أوتوماتيك لو فاضي">
          </div>
          <div class="field"><label>النوع</label>
            <select name="gender"><option value="ذكر">ذكر</option><option value="أنثى">أنثى</option></select>
          </div>
        </div>
        <div class="field"><label>صورة الوجه لصاحب البطاقة</label>
          <input type="file" id="new-card-photo" accept="image/*" required>
        </div>
        <button class="btn primary" type="submit">${icon('ankh', 18)} تصميم البطاقة وحفظها في القاعدة</button>
        <p class="muted small" id="new-card-msg" hidden></p>
      </form>
    </div>

    <div class="card form-card">
      <h3>${icon('scarab', 20)} استيراد سريع لكشف ناخبين (CSV)</h3>
      <p class="muted small">إجمالي المسجّلين في الكشف: <b>${roll && roll.count ? roll.count : 0}</b> ناخب</p>
      <form id="form-roll">
        <div class="field"><label>محتوى الكشف (الرقم القومي,الاسم)</label>
          <textarea name="csv" rows="5" class="mono" placeholder="31005292501518,علي أحمد علي محمد"></textarea>
        </div>
        <div class="row">
          <input type="file" id="roll-file" accept=".csv,.txt" hidden>
          <button class="btn ghost" type="button" id="btn-roll-file">اختيار ملف CSV</button>
          <button class="btn primary" type="submit">${icon('lotus', 18)} استيراد الكشف</button>
        </div>
        <p class="muted small" id="roll-msg" hidden></p>
      </form>
    </div>
  </div>
</section>

<section class="tab-panel" data-panel="systems">
  <div class="cards three">
    <article class="card feature">
      <h4>${icon('camera', 18)} مطابقة الوجه</h4>
      <p><b>${esc(providers.face && providers.face.active ? providers.face.active : '—')}</b></p>
      <p class="muted small">${esc((providers.face && (providers.face.note || providers.face.label)) || '')}</p>
      <p class="muted xsmall">المطلوب: ${esc((providers.face && providers.face.missing || []).join(' · ') || '—')}</p>
    </article>
    <article class="card feature">
      <h4>${icon('scarab', 18)} قراءة البطاقة (OCR)</h4>
      <p><b>${esc(providers.ocr && providers.ocr.provider)}</b> ${providers.ocr && providers.ocr.real ? '<span class="chip state-open">حقيقي</span>' : '<span class="chip state-scheduled">تجريبي</span>'}</p>
      <p class="muted small">${providers.ocr && providers.ocr.real ? 'قراءة آلية للبطاقة ومطابقة عربية للحقول' : 'فعّل OCRSPACE_KEY أو GOOGLE_VISION_KEY أو Azure في .env'}</p>
    </article>
    <article class="card feature">
      <h4>${icon('lock', 18)} كود الموبايل (OTP)</h4>
      <p><b>${esc(providers.otp && providers.otp.enabled ? 'مُفعّل' : 'معطّل')}</b> ${esc(providers.otp && providers.otp.provider || '')}</p>
      <p class="muted small">${providers.otp && providers.otp.enabled ? (providers.otp.devExpose ? 'وضع تجريبي: الكود يظهر في السجل' : 'إرسال حقيقي عبر مزوّد الرسائل') : 'اضبط OTP_MODE=console للتجربة أو OTP_MODE=sms للإرسال الحقيقي'}</p>
    </article>
  </div>
  <div class="notice small">لتفعيل المزوّدين الحقيقيين: أضف المفاتيح في ملف .env وأعد تشغيل المنصة — بدون أي تعديل في الكود.</div>

  <div class="card">
    <h3>${icon('eye', 18)} استخدام المزوّدين (آخر ٢٠٠ نداء)</h3>
    ${(providers.usage && providers.usage.by_provider && providers.usage.by_provider.length)
      ? `<table class="score-table"><thead><tr><th>المزوّد</th><th>عدد النداءات</th><th>نسبة النجاح</th><th>متوسط الزمن</th></tr></thead><tbody>
        ${providers.usage.by_provider.map((p) => `<tr><td class="mono">${esc(p.provider)}</td><td>${p.calls}</td><td>${p.success_rate === null ? '—' : Math.round(p.success_rate * 100) + '%'}</td><td>${p.avg_ms === null ? '—' : p.avg_ms + ' ms'}</td></tr>`).join('')}
        </tbody></table>`
      : `<p class="muted">مفيش نداءات مزوّدين مسجّلة${providers.usage && providers.usage.table === false ? ' — وجدول provider_calls لسه مش منشأ (نفّذ 002_phase2.sql)' : ' — وده طبيعي في وضع التجربة'}</p>`}
    <p class="muted small">كل نداء مزوّد بيتسجّل بالزمن ودرجة التشابه ونجاح/فشل العملية — مفيد لمتابعة التكلفة والأداء يوم الانتخاب.</p>
  </div>
</section>

<section class="tab-panel" data-panel="audit">
  <div class="table-wrap card">
    <table class="table">
      <thead><tr><th>الوقت</th><th>العملية</th><th>الفاعل</th><th>تفاصيل</th></tr></thead>
      <tbody>${auditRows || '<tr><td colspan="4" class="muted">السجل فاضي</td></tr>'}</tbody>
    </table>
  </div>
</section>`;
}

function adminReview({ review, electionTitle }) {
  return `
<section class="page-head">
  <h1>مراجعة طلب #${esc(review.id)}</h1>
  <p class="muted">الانتخابة: <b>${esc(electionTitle || '—')}</b> · نسبة التشابه: <b class="mono">${esc(review.score)}</b> · ${esc(review.created_at).slice(0, 16).replace('T', ' ')}</p>
  <p class="muted small">سبب الإحالة: ${(review.reasons || []).map(esc).join(' · ') || '—'}</p>
</section>
<section class="compare">
  <figure class="card">
    <figcaption>${icon('scarab', 18)} صورة البطاقة</figcaption>
    ${review.card_image ? `<img src="/admin/review-image/${esc(review.card_image)}" alt="بطاقة">` : '<p class="muted">مفيش صورة محفوظة</p>'}
  </figure>
  <figure class="card">
    <figcaption>${icon('camera', 18)} السيلفي الحي</figcaption>
    ${review.selfie_image ? `<img src="/admin/review-image/${esc(review.selfie_image)}" alt="سيلفي">` : '<p class="muted">مفيش صورة محفوظة</p>'}
  </figure>
</section>
<section class="card checks">
  <h3>${icon('eye', 18)} نتائج الفحوص الآلية</h3>
  <ul class="ticks">
    ${Object.entries(review.checks || {}).map(([k, v]) => `<li>${esc(k)}: <b>${v && v.ok ? 'نجح' : 'لم ينجح'}</b> ${v && (v.score !== undefined) ? `(القيمة: ${esc(v.score)})` : ''}</li>`).join('')}
  </ul>
  <div class="row center-row">
    <button class="btn primary" data-review="${esc(review.id)}" data-approve="1">${icon('check', 18)} قبول الهوية</button>
    <button class="btn danger" data-review="${esc(review.id)}" data-approve="0">${icon('warn', 18)} رفض</button>
    <a class="btn ghost" href="/admin">رجوع للوحة</a>
  </div>
</section>`;
}

module.exports = { adminLogin, adminDashboard, adminReview };
