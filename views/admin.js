'use strict';
/** لوحة الإشراف (/admin) — إصدار البطاقات، الانتخابات، المراجعة، والتدقيق */
const { esc, icon } = require('./layout');
const { fmtDate, stateChip, safeNum, fmtPct } = require('./pages');

function adminLogin({ error, email = '' }) {
  return `
<div class="admin-login-wrap">
  <div class="card admin-login-card">
    <span class="login-seal">${icon('lock', 24)}</span>
    <h1>دخول لجنة الإشراف</h1>
    <p class="muted small">البوابة مخصّصة لمسؤول النظام المعتمد فقط.</p>
    <form method="post" action="/api/admin/login" autocomplete="on">
      <div class="field">
        <label for="email">البريد الإلكتروني</label>
        <input id="email" name="email" type="email" dir="ltr" class="mono" required value="${esc(email)}" placeholder="admin@domain.com">
      </div>
      <div class="field">
        <label for="password">كلمة المرور</label>
        <input id="password" name="password" type="password" dir="ltr" class="mono" required placeholder="•••••••••••">
      </div>
      ${error ? `<p class="form-error" role="alert">${esc(error)}</p>` : ''}
      <button class="btn btn-primary btn-lg btn-block" type="submit">تسجيل الدخول</button>
    </form>
    <p class="privacy-note">${icon('shield-check', 14)} تُسجَّل كل محاولات الدخول في سجل التدقيق.</p>
  </div>
</div>`;
}

function adminDashboard({ stats, elections, reviews, audit, adminName, providers = {}, roll = {}, cards = [] }) {
  const totalBallots = elections.reduce((acc, e) => acc + safeNum(e.total_ballots), 0);
  const totalCandidates = elections.reduce((acc, e) => acc + ((e.candidates && e.candidates.length) || 0), 0);
  const mainElection = elections[0] || null;

  const overviewCandidates = ((mainElection && mainElection.candidates) || []).map((c, idx) => {
    const photo = c.photo_url || `/candidates/c${(idx % 4) + 1}.jpg`;
    const pct = safeNum(c.percent);
    return `
      <div class="admin-cand-card">
        <div class="admin-cand-head">
          <img src="${esc(photo)}" alt="${esc(c.name)}" class="admin-cand-avatar" loading="lazy">
          <div class="admin-cand-meta">
            <span class="cc-number">مرشح رقم ${idx + 1}</span>
            <b>${esc(c.name)}</b>
            <small class="muted">${esc(c.slogan || '')}</small>
          </div>
          <div class="admin-cand-score">
            <b>${fmtPct(pct)}</b>
            <span>${safeNum(c.votes)} صوت</span>
          </div>
        </div>
        <div class="result-bar"><span style="width:${Math.max(2, Math.min(100, pct))}%"></span></div>
      </div>`;
  }).join('');

  const electionRows = elections.map((e) => `
    <tr>
      <td class="mono ltr">#${esc(e.id)}</td>
      <td>
        <b>${esc(e.title)}</b>
        <div class="muted small">${esc(e.description || '')}</div>
      </td>
      <td>${stateChip(e.state)}</td>
      <td>${safeNum((e.candidates && e.candidates.length))} مرشحين</td>
      <td><b>${safeNum(e.total_ballots)}</b> صوت</td>
      <td class="actions">
        <div class="row">
          ${e.state !== 'open' ? `<button class="btn btn-ok btn-sm" data-election-state="${esc(e.id)}" data-state="open">فتح التصويت</button>` : ''}
          ${e.state === 'open' ? `<button class="btn btn-ghost btn-sm" data-election-state="${esc(e.id)}" data-state="closed">إغلاق التصويت</button>` : ''}
          <a class="btn btn-ghost btn-sm" href="/results?e=${esc(e.id)}">النتائج</a>
          ${elections.length > 1 ? `<button class="btn btn-danger btn-sm" data-delete-election="${esc(e.id)}">حذف</button>` : ''}
        </div>
      </td>
    </tr>`).join('');

  const reviewRows = reviews.map((r) => `
    <tr>
      <td class="mono ltr">#${esc(r.id)}</td>
      <td class="mono ltr small">${esc(String(r.created_at)).slice(0, 16).replace('T', ' ')}</td>
      <td>${(r.reasons || []).map(esc).join(' · ') || '—'}</td>
      <td class="mono"><b>${fmtPct(safeNum(r.score) * 100)}</b></td>
      <td class="actions">
        <div class="row">
          <a class="btn btn-ghost btn-sm" href="/admin/review/${esc(r.id)}">فحص الصور</a>
          <button class="btn btn-ok btn-sm" data-review="${esc(r.id)}" data-approve="1">قبول</button>
          <button class="btn btn-danger btn-sm" data-review="${esc(r.id)}" data-approve="0">رفض</button>
        </div>
      </td>
    </tr>`).join('');

  const auditRows = audit.map((a) => `
    <tr>
      <td class="mono ltr small">${esc(String(a.created_at)).slice(0, 19).replace('T', ' ')}</td>
      <td><span class="audit-badge mono ltr">${esc(a.action)}</span></td>
      <td class="small"><b>${esc(a.actor || 'system')}</b></td>
      <td class="mono ltr small muted">${esc(JSON.stringify(a.meta || {})).slice(0, 120)}</td>
    </tr>`).join('');

  return `
<section class="admin-hero">
  <div class="admin-hero-info">
    <span class="eyebrow">الإدارة</span>
    <h1>لوحة الإشراف وإدارة قاعدة البيانات</h1>
    <p class="muted">المسؤول: <b>${esc(adminName)}</b> — إصدار بطاقات الهوية، إدارة المرشحين، ومراجعة حالات التحقق.</p>
  </div>
  <div class="admin-hero-actions">
    <a class="btn btn-outline" href="/" target="_blank">${icon('eye', 15)} الموقع العام</a>
    <form method="post" action="/api/admin/logout" style="margin:0">
      <button class="btn btn-danger" type="submit">${icon('close', 15)} تسجيل الخروج</button>
    </form>
  </div>
</section>

<section class="stats-grid admin-kpis">
  <div class="stat-box"><b>${totalBallots}</b><span>إجمالي الأصوات بالصندوق</span></div>
  <div class="stat-box"><b>${totalCandidates}</b><span>عدد المرشحين</span></div>
  <div class="stat-box"><b>${safeNum(cards.length)}</b><span>بطاقات هوية مسجّلة</span></div>
  <div class="stat-box"><b>${safeNum(stats && stats.voters)}</b><span>ناخبين مسجّلين</span></div>
</section>

<nav class="tabs" id="admin-tabs" aria-label="أقسام الإدارة">
  <button class="tab active" type="button" data-tab="roll">بطاقات الهوية (${safeNum(cards.length)})</button>
  <button class="tab" type="button" data-tab="overview">نتائج المرشحين</button>
  <button class="tab" type="button" data-tab="elections">الانتخابات والمرشحون</button>
  <button class="tab" type="button" data-tab="reviews">طلبات المراجعة (${safeNum(reviews.length)})</button>
  <button class="tab" type="button" data-tab="audit">سجل التدقيق (${safeNum(audit.length)})</button>
</nav>

<!-- ١) إصدار وإدارة بطاقات الهوية -->
<section class="tab-panel active" data-panel="roll">
  <div class="grid-2 align-start">
    <div class="card form-card">
      <h3>${icon('id-card', 18)} إصدار بطاقة هوية جديدة</h3>
      <p class="muted small">أدخل بيانات المواطن وارفع صورة الوجه؛ ستتحدّث المعاينة فورًا وتُحفَظ البطاقة في السجل ليتمكن من التصويت.</p>
      <form id="form-new-card">
        <div class="field">
          <label for="nc-name">الاسم الرباعي (كما في البطاقة)</label>
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
            <label for="nc-nid">الرقم القومي (14 رقمًا — أو اتركه يتولّد)</label>
            <input name="national_id" id="nc-nid" class="mono ltr" maxlength="14" inputmode="numeric" placeholder="يتولّد تلقائيًا من التاريخ والمحافظة">
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
        <button class="btn btn-primary btn-lg btn-block" type="submit" id="btn-submit-new-card">إصدار البطاقة وحفظها</button>
        <div id="new-card-msg" class="notice" style="margin-top:12px" hidden></div>
      </form>
    </div>

    <div class="card">
      <h3>${icon('eye', 18)} معاينة البطاقة قبل الإصدار</h3>
      <p class="muted small">تتحدّث البيانات والصورة مباشرةً أثناء الكتابة:</p>
      <div class="idcard-preview-wrap">
        <canvas id="live-idcard-canvas" width="1012" height="638"></canvas>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="section-head" style="margin-bottom:16px">
      <h3 style="margin:0">بطاقات الهوية المسجّلة (${safeNum(cards.length)})</h3>
    </div>
    <div class="admin-cards-grid" id="admin-cards-list">
      ${cards.map((c) => `
        <article class="admin-idcard">
          <div class="admin-idcard-visual">
            ${c.card_image ? `<img src="${esc(c.card_image)}" alt="بطاقة ${esc(c.full_name)}" loading="lazy">` : `<div class="idcard-empty">${icon('id-card', 26)}</div>`}
          </div>
          <div class="admin-idcard-details">
            <h4>${esc(c.full_name)}</h4>
            <div class="idcard-kv">
              <div><span>الرقم القومي:</span> <b class="mono ltr">${esc(c.national_id_plain || c.national_id_masked || '—')}</b></div>
              <div><span>الميلاد:</span> <b class="mono ltr">${esc(c.birth_date || '—')}</b> · <span>المحافظة:</span> <b>${esc(c.governorate || '—')}</b></div>
              ${c.address ? `<div><span>العنوان:</span> <b>${esc(c.address)}</b></div>` : ''}
            </div>
            <div class="row" style="margin-top:12px">
              <a class="btn btn-ghost btn-sm" href="/register" target="_blank">تجربة التسجيل</a>
              ${c.national_id_plain !== '31005292501518' && c.id ? `<button class="btn btn-danger btn-sm" type="button" data-delete-card="${esc(c.id)}">حذف البطاقة</button>` : ''}
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
      <div class="admin-cands-grid">${overviewCandidates || '<p class="muted">لا يوجد مرشحون بعد.</p>'}</div>
    </div>
  ` : '<p class="muted">لا توجد انتخابات نشطة.</p>'}
</section>

<!-- ٣) إدارة الانتخابات والمرشحين -->
<section class="tab-panel" data-panel="elections">
  <div class="card" style="margin-bottom:22px">
    <h3>الانتخابات المسجّلة (${safeNum(elections.length)})</h3>
    <div class="table-wrap">
    <table class="table">
      <thead><tr><th>#</th><th>العنوان</th><th>الحالة</th><th>المرشحون</th><th>الأصوات</th><th>إجراءات</th></tr></thead>
      <tbody>${electionRows || '<tr><td colspan="6" class="muted">لا توجد انتخابات</td></tr>'}</tbody>
    </table>
    </div>
  </div>

  <div class="grid-2">
    <form class="card form-card" id="form-candidate">
      <h3>${icon('user', 17)} إضافة مرشح جديد</h3>
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
      <button class="btn btn-primary btn-block" type="submit">إضافة المرشح</button>
      <p class="muted small" id="cand-msg" hidden></p>
    </form>

    <form class="card form-card" id="form-election">
      <h3>${icon('ballot', 17)} إنشاء انتخابات جديدة</h3>
      <div class="field"><label>العنوان</label><input name="title" required placeholder="مثال: الانتخابات العامة 2026"></div>
      <div class="field"><label>الوصف</label><input name="description" placeholder="دورة 2026 / 2030"></div>
      <div class="grid-2">
        <div class="field"><label>تاريخ البدء</label><input type="datetime-local" name="starts_at"></div>
        <div class="field"><label>تاريخ الانتهاء</label><input type="datetime-local" name="ends_at"></div>
      </div>
      <input type="hidden" name="type" value="single">
      <button class="btn btn-outline btn-block" type="submit">إنشاء</button>
    </form>
  </div>
</section>

<!-- ٤) المراجعة -->
<section class="tab-panel" data-panel="reviews">
  <div class="card">
    <h3>طلبات المراجعة اليدوية (${safeNum(reviews.length)})</h3>
    <div class="table-wrap">
    <table class="table">
      <thead><tr><th>#</th><th>التوقيت</th><th>السبب</th><th>نسبة التطابق</th><th>القرار</th></tr></thead>
      <tbody>${reviewRows || '<tr><td colspan="5" class="muted">لا توجد طلبات معلّقة</td></tr>'}</tbody>
    </table>
    </div>
  </div>
</section>

<!-- ٥) سجل العمليات -->
<section class="tab-panel" data-panel="audit">
  <div class="card">
    <h3>سجل العمليات</h3>
    <div class="table-wrap">
    <table class="table">
      <thead><tr><th>التوقيت</th><th>العملية</th><th>المستخدم</th><th>التفاصيل</th></tr></thead>
      <tbody>${auditRows || '<tr><td colspan="4" class="muted">السجل فارغ</td></tr>'}</tbody>
    </table>
    </div>
  </div>
</section>`;
}

function adminReview({ review, electionTitle }) {
  return `
<section class="page-head">
  <span class="eyebrow">مراجعة يدوية</span>
  <h1>الطلب #${esc(review.id)}</h1>
  ${electionTitle ? `<p class="muted">${esc(electionTitle)}</p>` : ''}
</section>
<div class="grid-2">
  <div class="card">
    <h4>صورة البطاقة</h4>
    ${review.card_image ? `<img src="/admin/review-image/${esc(review.card_image)}" alt="صورة البطاقة" class="review-img">` : '<p class="muted">لا توجد صورة</p>'}
  </div>
  <div class="card">
    <h4>صورة الكاميرا</h4>
    ${review.selfie_image ? `<img src="/admin/review-image/${esc(review.selfie_image)}" alt="صورة السيلفي" class="review-img">` : '<p class="muted">لا توجد صورة</p>'}
  </div>
</div>
<div class="card row-center" style="margin-top:18px">
  <button class="btn btn-ok btn-lg" data-review="${esc(review.id)}" data-approve="1">${icon('check', 16)} قبول</button>
  <button class="btn btn-danger btn-lg" data-review="${esc(review.id)}" data-approve="0">${icon('close', 16)} رفض</button>
  <a class="btn btn-ghost btn-lg" href="/admin">رجوع</a>
</div>`;
}

module.exports = { adminLogin, adminDashboard, adminReview };
