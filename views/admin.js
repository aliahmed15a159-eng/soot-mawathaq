'use strict';
/**
 * لوحة الإشراف وإدارة السجل المدني (/admin — مخفية عن الجمهور)
 */
const { esc, icon, stateBadge } = require('./layout');

function adminLogin({ error = null, email = '' }) {
  return `
<section class="admin-login-wrap">
  <div class="admin-vault-card">
    <div class="vault-seal lg">${icon('lock', 28)}</div>
    <span class="sec-kicker" style="margin-top:12px">وحدة التحكم المركزي</span>
    <h1>دخول لوحة الإشراف</h1>
    <p class="muted">هذه الصفحة مخصّصة للمشرف المعتمد لإدارة بطاقات الرقم القومي ومتابعة عملية الفرز.</p>
    ${error ? `<div class="form-error" role="alert" style="margin-bottom:14px">${esc(error)}</div>` : ''}
    <form class="admin-login-form" method="post" action="/api/admin/login">
      <div class="field">
        <label for="admin-email">البريد الإلكتروني للمشرف</label>
        <input id="admin-email" name="email" type="email" value="${esc(email)}" class="mono"
               required autocomplete="username" autofocus placeholder="name@example.com">
      </div>
      <div class="field">
        <label for="admin-password">كلمة المرور</label>
        <input id="admin-password" name="password" type="password" class="mono"
               required autocomplete="current-password" placeholder="••••••••••">
      </div>
      <div class="form-actions" style="margin-top:18px">
        <button class="btn primary lg full" type="submit">تسجيل الدخول للوحة الإشراف</button>
      </div>
    </form>
  </div>
</section>`;
}

function adminDashboard({ stats, elections, reviews, audit, adminName = 'المشرف العام', roll = {}, cards = [] }) {
  const activeElection = elections[0] || { id: 1, title: 'الانتخابات العامة لرئاسة المجلس الوطني ٢٠٢٦', candidates: [], total_ballots: 0 };
  const totalBallots = elections.reduce((s, e) => s + (e.total_ballots || 0), 0);
  const totalCandidates = elections.reduce((s, e) => s + ((e.candidates && e.candidates.length) || 0), 0);

  const candidateScoreCards = (activeElection.candidates || []).map((c, idx) => {
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
      <td>${stateBadge(e.state)}</td>
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
      <td class="mono small">${esc(a.at).slice(0, 19).replace('T', ' ')}</td>
      <td><code class="mono audit-badge">${esc(a.action)}</code></td>
      <td class="mono small">${esc(a.actor || '—')}</td>
      <td class="small muted">${esc(typeof a.meta === 'object' ? JSON.stringify(a.meta) : (a.meta || ''))}</td>
    </tr>`).join('');

  return `
<section class="admin-command-hero">
  <div>
    <span class="sec-kicker" style="color:#E5C158">مركز إدارة المنظومة الانتخابية</span>
    <h1>لوحة الإشراف وإدارة بطاقات الرقم القومي</h1>
    <p>المسؤول الحالي: <b>${esc(adminName)}</b> — إصدار بطاقات الرقم القومي مع كتابة العنوان التفصيلي ومتابعة الفرز.</p>
  </div>
  <div class="admin-command-actions">
    <a class="btn hero-ghost" href="/">فتح البوابة العامة</a>
    <form method="post" action="/api/admin/logout" style="display:inline">
      <button class="btn danger" type="submit">تسجيل الخروج</button>
    </form>
  </div>
</section>

<section class="admin-kpi-grid">
  <div class="admin-kpi-card">
    <b>${totalBallots}</b>
    <span>إجمالي الأصوات بالصندوق</span>
  </div>
  <div class="admin-kpi-card">
    <b>${totalCandidates}</b>
    <span>عدد المرشحين</span>
  </div>
  <div class="admin-kpi-card">
    <b>${cards.length}</b>
    <span>بطاقات الرقم القومي المسجّلة</span>
  </div>
  <div class="admin-kpi-card">
    <b>${stats.voters}</b>
    <span>ناخبين مسجّلين</span>
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
      <span class="sec-kicker">مكتب إصدار البطاقات</span>
      <h3>إصدار بطاقة رقم قومي جديدة وإضافتها لقاعدة البيانات</h3>
      <p class="muted small">أدخل الاسم والعنوان التفصيلي والمحافظة وارفع صورة الوجه؛ ستتحدث البطاقة أمامك لحظيًا أثناء الكتابة.</p>
      <form id="form-new-card">
        <div class="field">
          <label for="nc-name">الاسم الرباعي (كما يظهر في البطاقة)</label>
          <input name="full_name" id="nc-name" required placeholder="مثال: محمد طارق عبد الله حسن">
        </div>

        <div class="field address-highlight-field">
          <label for="nc-address">العنوان التفصيلي (يُكتب مباشرةً في خانة العنوان على البطاقة)</label>
          <input name="address" id="nc-address" required value="" placeholder="اكتب العنوان هنا — مثال: ١٥ شارع النميس — قسم ثان أسيوط">
          <small class="hint">اكتب الشارع والمنطقة والقسم ليظهروا فورًا على البطاقة في السطر الأول للعنوان</small>
        </div>

        <div class="grid-2">
          <div class="field">
            <label for="nc-gov">المحافظة (السطر الثاني للعنوان)</label>
            <select name="governorate" id="nc-gov">
              ${['أسيوط', 'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'الشرقية', 'المنيا', 'سوهاج', 'قنا', 'أسوان', 'الأقصر', 'الغربية', 'المنوفية', 'البحيرة', 'الفيوم', 'بني سويف', 'كفر الشيخ', 'دمياط', 'بورسعيد', 'السويس', 'الإسماعيلية'].map((g) => `<option value="${g}">${g}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="nc-dob">تاريخ الميلاد</label>
            <input name="birth_date" id="nc-dob" type="date" required value="2002-08-15">
          </div>
        </div>

        <div class="grid-2">
          <div class="field">
            <label for="nc-nid">الرقم القومي (١٤ رقم — أو اتركه يتولّد تلقائيًا)</label>
            <input name="national_id" id="nc-nid" class="mono" maxlength="14" placeholder="يتولّد تلقائيًا من الميلاد والمحافظة">
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
      <span class="sec-kicker">المعاينة الحية</span>
      <h3>معاينة البطاقة قبل الإصدار</h3>
      <p class="muted small">أي تعديل في الاسم أو العنوان أو المحافظة أو الصورة يظهر فورًا على البطاقة:</p>
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
              <div><span>العنوان:</span> <b>${esc(c.address || `ش الجمهورية — قسم أول ${c.governorate || 'أسيوط'}`)}</b></div>
            </div>
            <div class="row" style="margin-top:12px">
              <a class="btn small ghost" href="/register" target="_blank">تجربة التسجيل بالبطاقة</a>
              ${c.national_id_plain !== '31005292501518' && c.id ? `<button class="btn small danger" type="button" data-delete-card="${esc(c.id)}">حذف البطاقة</button>` : ''}
            </div>
          </div>
        </article>`).join('') || '<p class="muted">لا توجد بطاقات مسجّلة.</p>'}
    </div>
  </div>
</section>

<!-- ٢) نتائج المرشحين -->
<section class="tab-panel" data-panel="overview">
  <div class="card">
    <div class="section-head" style="margin-bottom:18px">
      <div>
        <h3 style="margin:0">${esc(activeElection.title)}</h3>
        <p class="muted small" style="margin:4px 0 0">توزيع الأصوات اللحظي على المرشحين الأربعة</p>
      </div>
      <a class="btn ghost small" href="/results?e=${esc(activeElection.id)}">فتح صفحة النتائج العامة</a>
    </div>
    <div class="admin-cand-grid">
      ${candidateScoreCards}
    </div>
  </div>
</section>

<!-- ٣) إدارة الانتخابات والمرشحين -->
<section class="tab-panel" data-panel="elections">
  <div class="card" style="margin-bottom:20px">
    <h3>الاستحقاقات الانتخابية المسجّلة</h3>
    <table class="table">
      <thead><tr><th>#</th><th>العنوان</th><th>الحالة</th><th>المرشحون</th><th>الأصوات</th><th>إجراءات</th></tr></thead>
      <tbody>${electionRows || '<tr><td colspan="6" class="muted">لا توجد انتخابات</td></tr>'}</tbody>
    </table>
  </div>

  <div class="grid-2">
    <form class="card form-card" id="form-new-election">
      <h3>إنشاء استحقاق انتخابي جديد</h3>
      <div class="field"><label>عنوان الانتخابات</label><input name="title" required placeholder="مثال: الانتخابات التكميلية ٢٠٢٦"></div>
      <div class="field"><label>الوصف</label><textarea name="description" rows="2"></textarea></div>
      <div class="grid-2">
        <div class="field"><label>تاريخ البدء</label><input type="datetime-local" name="starts_at"></div>
        <div class="field"><label>تاريخ الإغلاق</label><input type="datetime-local" name="ends_at"></div>
      </div>
      <button class="btn primary" type="submit">إنشاء</button>
    </form>

    <form class="card form-card" id="form-new-candidate">
      <h3>إضافة مرشح جديد</h3>
      <div class="field">
        <label>الانتخابات</label>
        <select name="election_id" required>
          ${elections.map((e) => `<option value="${esc(e.id)}">${esc(e.title)}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>اسم المرشح</label><input name="name" required placeholder="الاسم الكامل"></div>
      <div class="field"><label>الصفة والرمز الانتخابي</label><input name="slogan" placeholder="مثال: أستاذ القانون الدستوري · رمز: الميزان"></div>
      <div class="field"><label>البرنامج الانتخابي</label><textarea name="program" rows="2"></textarea></div>
      <button class="btn primary" type="submit">إضافة المرشح</button>
    </form>
  </div>
</section>

<!-- ٤) طلبات المراجعة -->
<section class="tab-panel" data-panel="reviews">
  <div class="card">
    <h3>طلبات المراجعة البشرية</h3>
    ${reviews.length ? `
      <table class="table">
        <thead><tr><th>#</th><th>التوقيت</th><th>سبب التحويل</th><th>نسبة التطابق</th><th>القرار</th></tr></thead>
        <tbody>${reviewRows}</tbody>
      </table>` : '<p class="muted">لا توجد طلبات معلّقة حاليًا.</p>'}
  </div>
</section>

<!-- ٥) سجل التدقيق والعمليات -->
<section class="tab-panel" data-panel="audit">
  <div class="card">
    <h3>سجل التدقيق والعمليات</h3>
    <table class="table">
      <thead><tr><th>التوقيت</th><th>العملية</th><th>المنفّذ</th><th>التفاصيل</th></tr></thead>
      <tbody>${auditRows || '<tr><td colspan="4" class="muted">لا توجد سجلات</td></tr>'}</tbody>
    </table>
  </div>
</section>`;
}

function reviewDetailPage({ review, voter }) {
  return `
<section class="page-head">
  <h1>فحص طلب المراجعة #${esc(review.id)}</h1>
  <p class="muted">الناخب: <b>${esc(voter ? voter.full_name : '—')}</b> — نسبة التطابق: <b>${Math.round((Number(review.score) || 0) * 100)}%</b></p>
</section>
<div class="grid-2">
  <div class="card">
    <h3>صورة البطاقة</h3>
    ${review.card_image ? `<img class="review-img" src="/admin/review-image/${esc(review.id)}/card" alt="البطاقة">` : '<p class="muted">غير متوفرة</p>'}
  </div>
  <div class="card">
    <h3>صورة الكاميرا</h3>
    ${review.selfie_image ? `<img class="review-img" src="/admin/review-image/${esc(review.id)}/selfie" alt="السيلفي">` : '<p class="muted">غير متوفرة</p>'}
  </div>
</div>
<div class="card section row">
  <button class="btn ok lg" data-review="${esc(review.id)}" data-approve="1">قبول وإصدار بطاقة اقتراع</button>
  <button class="btn danger lg" data-review="${esc(review.id)}" data-approve="0">رفض الطلب</button>
  <a class="btn ghost" href="/admin">عودة</a>
</div>`;
}

module.exports = { adminLogin, adminDashboard, reviewDetailPage };
