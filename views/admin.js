'use strict';
/** لوحة الإدارة: الانتخابات، المرشحون، المراجعة البشرية، سجل التدقيق */
const { shell, esc, icon } = require('./layout');
const { fmtDate, stateChip, STATE_LABEL } = require('./pages');

function adminLogin({ error }) {
  return `
<section class="page-head center"><h1>لوحة إشراف الانتخابات</h1>
<p class="muted">دخول لجنة الإشراف بمفتاح الإدارة. كل عملية هنا تُسجَّل في سجل التدقيق باسم الفاعل ووقت التنفيذ.</p></section>
<form class="card form-card center-col" method="post" action="/api/admin/login">
  <div class="field">
    <label for="key">مفتاح الإدارة</label>
    <input id="key" name="key" type="password" required placeholder="••••••••">
    <small class="hint">القيمة الافتراضية في وضع التجربة: per-aa-admin — غيّرها من متغير ADMIN_KEY</small>
  </div>
  ${error ? `<p class="form-error">${esc(error)}</p>` : ''}
  <div class="form-actions"><button class="btn primary" type="submit">${icon('lock', 18)} دخول</button></div>
</form>`;
}

function adminDashboard({ stats, elections, reviews, audit, adminName, providers = {}, roll = {} }) {
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
  <div class="card form-card">
    <h3>${icon('scarab', 20)} كشف الناخبين المعتمد</h3>
    <p class="muted">الصق الكشف (سطر لكل ناخب: الرقم القومي ثم الاسم، مفصولين بفاصلة) أو ارفع ملف CSV مُصدَّر من Excel.</p>
    <p class="muted small">العدد الحالي في الكشف: <b>${roll && roll.count ? roll.count : 0}</b> ناخب ${roll && roll.table === false ? '— ⚠️ جدول الكشوف غير منشأ: نفّذ supabase/migrations/002_phase2.sql' : ''}</p>
    <form id="form-roll">
      <div class="field"><label>محتوى الكشف (CSV)</label>
        <textarea name="csv" rows="6" class="mono" placeholder="29807152101234,مينا عبد المسيح حنا&#10;29507122501846,سلمى هاني عبد الله"></textarea>
      </div>
      <div class="row">
        <input type="file" id="roll-file" accept=".csv,.txt" hidden>
        <button class="btn ghost" type="button" id="btn-roll-file">اختيار ملف CSV</button>
        <button class="btn primary" type="submit">${icon('lotus', 18)} استيراد الكشف</button>
      </div>
      <p class="muted small" id="roll-msg" hidden></p>
    </form>
    <p class="muted small">لتشغيل التحقق الصارم (لا يصوّت إلا من في الكشف): اضبط <code>REGISTER_MODE=strict</code> في ملف .env وأعد التشغيل.</p>
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
