'use strict';
/** لوحة إشراف الانتخابات وإصدار البطاقات (/admin) — مع حقل العنوان التفصيلي */
const { esc, icon } = require('./layout');
const { fmtDate, stateChip } = require('./pages');

function adminLogin({ error, email = '' }) {
  return `
<div class="admin-login-wrap">
  <div class="admin-vault-card">
    <div class="admin-vault-top">
      <div class="vault-seal lg">${icon('lock', 24)}</div>
      <h1 style="margin-top:12px">دخول لجنة الإشراف</h1>
      <p class="muted small">البوابة مخصّصة لمسؤول النظام المعتمد فقط.</p>
    </div>

    <form class="admin-login-form" method="post" action="/api/admin/login" autocomplete="on">
      <div class="field">
        <label for="email">البريد الإلكتروني</label>
        <input id="email" name="email" type="email" dir="ltr" class="mono" required value="${esc(email)}" placeholder="admin@domain.com">
      </div>
      <div class="field">
        <label for="password">كلمة المرور</label>
        <input id="password" name="password" type="password" dir="ltr" class="mono" required placeholder="•••••••••••">
      </div>
      ${error ? `<p class="form-error">${esc(error)}</p>` : ''}
      <button class="btn primary lg full" type="submit">تسجيل الدخول</button>
    </form>
  </div>
</div>`;
}

function adminDashboard({ stats, elections, reviews, audit, adminName, providers = {}, roll = {}, cards = [] }) {
  const totalBallots = elections.reduce((acc, e) => acc + (e.total_ballots || 0), 0);
  const totalCandidates = elections.reduce((acc, e) => acc + ((e.candidates && e.candidates.length) || 0), 0);
  const mainElection = elections[0] || null;

  const overviewCandidates = (mainElection && mainElection.candidates || []).map((c, idx) => {
    const photo = c.photo_url || `/candidates/c${(idx % 4) + 1}.jpg`;
    return `
      <div class="admin-cand-card">
        <div class="admin-cand-head">
          <img src="${esc(photo)}" alt="${esc(c.name)}" class="admin-cand-avatar">
          <div class="admin-cand-meta">
            <span class="admin-cand-num">المرشح رقم (${idx + 1})</span>
            <b>${esc(c.name)}</b>
            <small class="muted">${esc(c.slogan || '')}</small>
          </div>
          <div class="admin-cand-score">
            <b>${c.percent || 0}%</b>
            <span>${c.votes || 0} صوت</span>
          </div>
        </div>
        <div class="bar"><span style="width:${Math.max(4, c.percent || 0)}%"></span></div>
      </div>`;
  }).join('');

  const electionRows = elections.map((e) => `
    <tr>
      <td class="mono">#${esc(e.id)}</td>
      <td>
        <b>${esc(e.title)}</b>
        <div class="muted small">${esc(e.description || '')}</div>
      </td>
      <td>${stateChip(e.state)}</td>
      <td>${(e.candidates && e.candidates.length) || 0} مرشحين</td>
      <td><b>${e.total_ballots || 0}</b> صوت</td>
      <td class="actions">
        <div class="row">
          ${e.state !== 'open' ? `<button class="btn small ok" data-election-state="${esc(e.id)}" data-state="open">فتح التصويت</button>` : ''}
          ${e.state === 'open' ? `<button class="btn small ghost" data-election-state="${esc(e.id)}" data-state="closed">إغلاق التصويت</button>` : ''}
          <a class="btn small ghost" href="/results?e=${esc(e.id)}">النتائج</a>
          ${elections.length > 1 ? `<button class="btn small danger" data-delete-election="${esc(e.id)}">حذف</button>` : ''}
        </div>
      </td>
    </tr>`).join('');

  const reviewRows = reviews.map((r) => `
    <tr>
      <td class="mono">#${esc(r.id)}</td>
      <td class="mono small">${esc(r.created_at).slice(0, 16).replace('T', ' ')}</td>
      <td>${(r.reasons || []).map(esc).join(' · ') || '—'}</td>
      <td class="mono"><b>${Math.round((Number(r.score) || 0) * 100)}%</b></td>
      <td class="actions">
        <div class="row">
          <a class="btn small ghost" href="/admin/review/${esc(r.id)}">فحص الصور</a>
          <button class="btn small ok" data-review="${esc(r.id)}" data-approve="1">قبول</button>
          <button class="btn small danger" data-review="${esc(r.id)}" data-approve="0">رفض</button>
        </div>
      </td>
    </tr>`).join('');

  const auditRows = audit.map((a) => `
    <tr>
      <td class="mono small">${esc(a.created_at).slice(0, 19).replace('T', ' ')}</td>
      <td><span class="audit-badge mono">${esc(a.action)}</span></td>
      <td class="small"><b>${esc(a.actor || 'system')}</b></td>
      <td class="mono small muted">${esc(JSON.stringify(a.meta || {})).slice(0, 120)}</td>
    </tr>`).join('');

  return `
<section class="admin-command-hero">
  <div class="admin-command-info">
    <h1>لوحة الإشراف وإدارة قاعدة البيانات</h1>
    <p>المسؤول الحالي: <b>${esc(adminName)}</b> — إدارة بطاقات الرقم القومي، المرشحين، ومتابعة نتائج الفرز.</p>
  </div>
  <div class="admin-command-actions">
    <a class="btn ghost" href="/" target="_blank">فتح الموقع العام</a>
    <form method="post" action="/api/admin/logout" style="margin:0">
      <button class="btn danger" type="submit">تسجيل الخروج</button>
    </form>
  </div>
</section>

<section class="admin-kpi-grid">
  <div class="admin-kpi-card">
    <div>
      <b>${totalBallots}</b>
      <span>إجمالي الأصوات بالصندوق</span>
    </div>
  </div>
  <div class="admin-kpi-card">
    <div>
      <b>${totalCandidates}</b>
      <span>عدد المرشحين</span>
    </div>
  </div>
  <div class="admin-kpi-card">
    <div>
      <b>${cards.length}</b>
      <span>بطاقات الرقم القومي المسجّلة</span>
    </div>
  </div>
  <div class="admin-kpi-card">
    <div>
      <b>${stats.voters}</b>
      <span>ناخبين مسجّلين</span>
    </div>
  </div>
</section>

<nav class="tabs" id="admin-tabs">
  <button class="tab active" type="button" data-tab="roll">إصدار وإدارة بطاقات الرقم القومي (${cards.length})</button>
  <button class="tab" type="button" data-tab="overview">نتائج المرشحين</button>
  <button class="tab" type="button" data-tab="elections">إدارة الانتخابات والمرشحين</button>
  <button class="tab" type="button" data-tab="reviews">طلبات المراجعة (${reviews.length})</button>
  <button class="tab" type="button" data-tab="audit">سجل التدقيق والعمليات (${audit.length})</button>
</nav>

<!-- ١) إصدار وإدارة بطاقات الرقم القومي -->
<section class="tab-panel active" data-panel="roll">
  <div class="grid-2" style="margin-bottom:24px;align-items:start">
    <div class="card form-card">
      <h3>إصدار بطاقة رقم قومي جديدة وإضافتها لقاعدة البيانات</h3>
      <p class="muted small">أدخل بيانات المواطن والعنوان وارفع صورة الوجه؛ ستتحدث المعاينة فورًا وتحفظ البطاقة في السجل المدني ليتمكن من التصويت بها.</p>
      <form id="form-new-card">
        <div class="field">
          <label for="nc-name">الاسم الرباعي (كما يظهر في البطاقة)</label>
          <input name="full_name" id="nc-name" required placeholder="مثال: محمد طارق عبد الله حسن">
        </div>

        <div class="field">
          <label for="nc-address">العنوان التفصيلي (يُكتب على البطاقة)</label>
          <input name="address" id="nc-address" required value="١٤ ش الجمهورية — قسم أول أسيوط" placeholder="مثال: ١٤ ش الجمهورية — قسم أول أسيوط">
        </div>

        <div class="grid-2">
          <div class="field">
            <label for="nc-dob">تاريخ الميلاد</label>
            <input name="birth_date" id="nc-dob" type="date" required value="2002-08-15">
          </div>
          <div class="field">
            <label for="nc-gov">المحافظة</label>
            <select name="governorate" id="nc-gov">
              ${['أسيوط', 'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'الشرقية', 'المنيا', 'سوهاج', 'قنا', 'أسوان', 'الأقصر', 'الغربية', 'المنوفية', 'البحيرة', 'الفيوم', 'بني سويف', 'كفر الشيخ', 'دمياط', 'بورسعيد', 'السويس', 'الإسماعيلية'].map((g) => `<option value="${g}">${g}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="grid-2">
          <div class="field">
            <label for="nc-nid">الرقم القومي (١٤ رقم — أو اتركه يتولّد تلقائيًا)</label>
            <input name="national_id" id="nc-nid" class="mono" maxlength="14" placeholder="يتولّد تلقائيًا من تاريخ الميلاد والمحافظة">
          </div>
          <div class="field">
            <label for="nc-gender">النوع</label>
            <select name="gender" id="nc-gender"><option value="ذكر">ذكر</option><option value="أنثى">أنثى</option></select>
          </div>
        </div>

        <div class="field">
          <label for="new-card-photo">صورة الوجه الشخصية</label>
          <input type="file" id="new-card-photo" accept="image/*" required>
        </div>

        <button class="btn primary lg full" type="submit" id="btn-submit-new-card">إصدار البطاقة وحفظها في قاعدة البيانات</button>
        <div id="new-card-msg" class="notice" style="margin-top:12px" hidden></div>
      </form>
    </div>

    <div class="card">
      <h3>معاينة البطاقة قبل الإصدار</h3>
      <p class="muted small">تتحدث بيانات البطاقة والعنوان والصورة مباشرةً أثناء الكتابة:</p>
      <div class="live-idcard-preview-wrap">
        <canvas id="live-idcard-canvas" width="1012" height="638" style="width:100%;border-radius:10px;border:1px solid var(--border);display:block"></canvas>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="section-head" style="margin-bottom:16px">
      <h3 style="margin:0">بطاقات الرقم القومي المسجّلة في قاعدة البيانات (${cards.length})</h3>
    </div>
    <div class="admin-idcards-grid" id="admin-cards-list">
      ${cards.map((c) => `
        <article class="admin-idcard-item">
          <div class="admin-idcard-visual">
            ${c.card_image ? `<img src="${esc(c.card_image)}" alt="${esc(c.full_name)}">` : ''}
          </div>
          <div class="admin-idcard-details">
            <h4>${esc(c.full_name)}</h4>
            <div class="admin-id-kv">
              <div><span>الرقم القومي:</span> <b class="mono">${esc(c.national_id_plain || c.national_id_masked || '—')}</b></div>
              <div><span>تاريخ الميلاد:</span> <b class="mono">${esc(c.birth_date || '—')}</b> · <span>المحافظة:</span> <b>${esc(c.governorate || '—')}</b></div>
              ${c.address ? `<div><span>العنوان:</span> <b>${esc(c.address)}</b></div>` : ''}
            </div>
            <div class="row" style="margin-top:12px">
              <a class="btn small ghost" href="/register" target="_blank">تجربة التسجيل بالبطاقة</a>
              ${c.national_id_plain !== '31005292501518' && c.id ? `<button class="btn small danger" type="button" data-delete-card="${esc(c.id)}">حذف البطاقة</button>` : ''}
            </div>
          </div>
        </article>
      `).join('') || '<p class="muted">لا توجد بطاقات مسجّلة.</p>'}
    </div>
  </div>
</section>

<!-- ٢) نتائج المرشحين -->
<section class="tab-panel" data-panel="overview">
  ${mainElection ? `
    <div class="card">
      <div class="section-head" style="margin-bottom:18px">
        <div>
          <h2 style="margin:0">${esc(mainElection.title)}</h2>
          <p class="muted small" style="margin:4px 0 0">${esc(mainElection.description || '')}</p>
        </div>
        ${stateChip(mainElection.state)}
      </div>
      <div class="admin-cand-grid">
        ${overviewCandidates}
      </div>
    </div>
  ` : '<p class="muted">لا توجد انتخابات نشطة.</p>'}
</section>

<!-- ٣) إدارة الانتخابات والمرشحين -->
<section class="tab-panel" data-panel="elections">
  <div class="card" style="margin-bottom:22px">
    <h3>الانتخابات المسجّلة (${elections.length})</h3>
    <table class="table">
      <thead><tr><th>#</th><th>العنوان</th><th>الحالة</th><th>المرشحون</th><th>الأصوات</th><th>إجراءات</th></tr></thead>
      <tbody>${electionRows || '<tr><td colspan="6" class="muted">لا توجد انتخابات</td></tr>'}</tbody>
    </table>
  </div>

  <div class="grid-2">
    <form class="card form-card" id="form-candidate">
      <h3>إضافة مرشح جديد</h3>
      <div class="field">
        <label>الانتخابات</label>
        <select name="election_id">${elections.map((e) => `<option value="${esc(e.id)}">#${esc(e.id)} — ${esc(e.title)}</option>`).join('')}</select>
      </div>
      <div class="field">
        <label>اسم المرشح</label>
        <input name="name" required placeholder="مثال: د. طارق عبد الرحمن المنشاوي">
      </div>
      <div class="field">
        <label>الصفة والرمز الانتخابي</label>
        <input name="slogan" placeholder="أستاذ الاقتصاد · رمز: الميزان">
      </div>
      <div class="field">
        <label>البرنامج الانتخابي</label>
        <input name="program" placeholder="ملخص البرنامج الانتخابي...">
      </div>
      <button class="btn primary full" type="submit">إضافة المرشح</button>
      <p class="muted small" id="cand-msg" hidden></p>
    </form>

    <form class="card form-card" id="form-election">
      <h3>إنشاء انتخابات جديدة</h3>
      <div class="field"><label>العنوان</label><input name="title" required placeholder="مثال: الانتخابات العامة ٢٠٢٦"></div>
      <div class="field"><label>الوصف</label><input name="description" placeholder="دورة ٢٠٢٦ / ٢٠٣٠"></div>
      <div class="grid-2">
        <div class="field"><label>تاريخ البدء</label><input type="datetime-local" name="starts_at"></div>
        <div class="field"><label>تاريخ الانتهاء</label><input type="datetime-local" name="ends_at"></div>
      </div>
      <input type="hidden" name="type" value="single">
      <button class="btn ghost full" type="submit">إنشاء</button>
    </form>
  </div>
</section>

<!-- ٤) المراجعة -->
<section class="tab-panel" data-panel="reviews">
  <div class="card">
    <h3>طلبات المراجعة اليدوية (${reviews.length})</h3>
    <table class="table">
      <thead><tr><th>#</th><th>التوقيت</th><th>السبب</th><th>نسبة التطابق</th><th>القرار</th></tr></thead>
      <tbody>${reviewRows || '<tr><td colspan="5" class="muted">لا توجد طلبات معلّقة</td></tr>'}</tbody>
    </table>
  </div>
</section>

<!-- ٥) سجل العمليات -->
<section class="tab-panel" data-panel="audit">
  <div class="card">
    <h3>سجل العمليات</h3>
    <table class="table">
      <thead><tr><th>التوقيت</th><th>العملية</th><th>المستخدم</th><th>التفاصيل</th></tr></thead>
      <tbody>${auditRows || '<tr><td colspan="4" class="muted">السجل فارغ</td></tr>'}</tbody>
    </table>
  </div>
</section>`;
}

function adminReview({ review, electionTitle }) {
  return `
<section class="page-head">
  <h1>مراجعة الطلب #${esc(review.id)}</h1>
</section>
<div class="grid-2">
  <div class="card">
    <h4>صورة البطاقة</h4>
    ${review.card_image ? `<img src="/admin/review-image/${esc(review.card_image)}" alt="بطاقة" style="width:100%;border-radius:8px">` : '<p class="muted">لا توجد صورة</p>'}
  </div>
  <div class="card">
    <h4>صورة الكاميرا</h4>
    ${review.selfie_image ? `<img src="/admin/review-image/${esc(review.selfie_image)}" alt="سيلفي" style="width:100%;border-radius:8px">` : '<p class="muted">لا توجد صورة</p>'}
  </div>
</div>
<div class="card" style="margin-top:18px">
  <div class="row center-row">
    <button class="btn ok lg" data-review="${esc(review.id)}" data-approve="1">قبول</button>
    <button class="btn danger lg" data-review="${esc(review.id)}" data-approve="0">رفض</button>
    <a class="btn ghost lg" href="/admin">رجوع</a>
  </div>
</div>`;
}

module.exports = { adminLogin, adminDashboard, adminReview };
