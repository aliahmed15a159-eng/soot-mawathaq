'use strict';
/** مركز القيادة والإشراف القضائي — لوحة الإدارة السرية (/admin) */
const { esc, icon } = require('./layout');
const { fmtDate, stateChip } = require('./pages');

function adminLogin({ error, email = '' }) {
  return `
<div class="admin-login-wrap">
  <div class="admin-vault-card">
    <div class="admin-vault-top">
      <div class="vault-seal lg">${icon('lock', 26)}</div>
      <span class="sec-eyebrow" style="margin-top:10px">بوابة مقيدة الصلاحية · وصول مباشر فقط</span>
      <h1>مركز القيادة والإشراف القضائي</h1>
      <p class="muted small">هذه البوابة مخفية عن الجمهور ومخصّصة لمسؤول المنصة المعتمد فقط. تُسجّل جميع محاولات الدخول في سجل التدقيق التشفيري.</p>
    </div>

    <form class="admin-login-form" method="post" action="/api/admin/login" autocomplete="on">
      <div class="field">
        <label for="email">البريد الإلكتروني للمسؤول</label>
        <input id="email" name="email" type="email" dir="ltr" class="mono" required value="${esc(email)}" placeholder="admin@domain.com">
      </div>
      <div class="field">
        <label for="password">كلمة المرور السرية</label>
        <input id="password" name="password" type="password" dir="ltr" class="mono" required placeholder="•••••••••••">
      </div>
      ${error ? `<p class="form-error">${esc(error)}</p>` : ''}
      <button class="btn gold lg full" type="submit">${icon('lock', 18)} مصادقة الدخول إلى مركز القيادة ←</button>
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
            <span class="admin-cand-num mono">مرشح #${idx + 1}</span>
            <b>${esc(c.name)}</b>
            <small class="muted">${esc(c.slogan || '')}</small>
          </div>
          <div class="admin-cand-score mono">
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
      <td class="mono">${(e.candidates && e.candidates.length) || 0} مرشحين</td>
      <td class="mono"><b>${e.total_ballots || 0}</b> صوت</td>
      <td class="actions">
        <div class="row">
          ${e.state !== 'open' ? `<button class="btn small ok" data-election-state="${esc(e.id)}" data-state="open">فتح الاقتراع</button>` : ''}
          ${e.state === 'open' ? `<button class="btn small ghost" data-election-state="${esc(e.id)}" data-state="closed">إغلاق مؤقت</button>` : ''}
          <a class="btn small ghost" href="/results?e=${esc(e.id)}">صفحة الفرز</a>
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
          <button class="btn small ok" data-review="${esc(r.id)}" data-approve="1">اعتماد</button>
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
    <div class="hero-kicker-row" style="margin-bottom:10px">
      <span class="hero-live-badge"><span class="pulse-dot"></span> متصل بقاعدة بيانات Supabase الحية</span>
      <span class="hero-proto-tag mono">128-D NEURAL ENGINE ACTIVE</span>
    </div>
    <h1>مركز القيادة والإشراف القضائي</h1>
    <p>مرحبًا <b>${esc(adminName)}</b> — إدارة الاستحقاق الانتخابي، المرشحين، بطاقات الرقم القومي في السجل المدني، ومؤشرات الفرز اللحظية.</p>
  </div>
  <div class="admin-command-actions">
    <a class="btn outline-light" href="/" target="_blank">${icon('eye', 16)} معاينة الموقع العام</a>
    <form method="post" action="/api/admin/logout" style="margin:0">
      <button class="btn danger" type="submit">${icon('lock', 16)} تسجيل الخروج الآمن</button>
    </form>
  </div>
</section>

<section class="admin-kpi-grid">
  <div class="admin-kpi-card">
    <span class="kpi-icon">${icon('lotus', 22)}</span>
    <div>
      <b class="mono" data-count="${totalBallots}">${totalBallots}</b>
      <span>إجمالي الأصوات بالصندوق السري</span>
    </div>
  </div>
  <div class="admin-kpi-card">
    <span class="kpi-icon">${icon('horus', 22)}</span>
    <div>
      <b class="mono" data-count="${totalCandidates}">${totalCandidates}</b>
      <span>مرشحين معتمدين بالرموز</span>
    </div>
  </div>
  <div class="admin-kpi-card">
    <span class="kpi-icon">${icon('scarab', 22)}</span>
    <div>
      <b class="mono" data-count="${cards.length}">${cards.length}</b>
      <span>بطاقات رقم قومي بالسجل المدني</span>
    </div>
  </div>
  <div class="admin-kpi-card">
    <span class="kpi-icon">${icon('check', 22)}</span>
    <div>
      <b class="mono" data-count="${stats.voters}">${stats.voters}</b>
      <span>ناخبين أتمّوا التحقق البيومتري</span>
    </div>
  </div>
</section>

<nav class="tabs" id="admin-tabs">
  <button class="tab active" type="button" data-tab="overview">${icon('eye', 16)} الفرز الحي والمرشحون</button>
  <button class="tab" type="button" data-tab="roll">${icon('scarab', 16)} بطاقات الرقم القومي (${cards.length})</button>
  <button class="tab" type="button" data-tab="elections">${icon('lotus', 16)} إدارة الانتخابات والمرشحين</button>
  <button class="tab" type="button" data-tab="reviews">${icon('warn', 16)} المراجعة البشرية (${reviews.length})</button>
  <button class="tab" type="button" data-tab="audit">${icon('lock', 16)} سجل التدقيق (${audit.length})</button>
</nav>

<!-- ١) نظرة عامة والمرشحون -->
<section class="tab-panel active" data-panel="overview">
  ${mainElection ? `
    <div class="card" style="margin-bottom:22px">
      <div class="sec-header-bar" style="margin-bottom:18px">
        <div>
          <span class="sec-eyebrow">الاستحقاق الانتخابي النشط الآن</span>
          <h2 style="margin:0">${esc(mainElection.title)}</h2>
          <p class="muted small" style="margin:4px 0 0">${esc(mainElection.description || '')}</p>
        </div>
        <div class="row">
          ${stateChip(mainElection.state)}
          <a class="btn primary small" href="/results?e=${esc(mainElection.id)}">${icon('eye', 15)} فتح شاشة الفرز</a>
        </div>
      </div>
      <div class="admin-cand-grid">
        ${overviewCandidates}
      </div>
    </div>
  ` : '<p class="muted">لا توجد انتخابات نشطة حاليًا.</p>'}
</section>

<!-- ٢) بطاقات الرقم القومي بالسجل المدني -->
<section class="tab-panel" data-panel="roll">
  <div class="card" style="margin-bottom:22px">
    <div class="sec-header-bar">
      <div>
        <span class="sec-eyebrow">قاعدة بيانات السجل المدني المعتمد</span>
        <h3 style="margin:0">بطاقات الرقم القومي المسجّلة للمطابقة البيومترية (${cards.length})</h3>
      </div>
    </div>
    <div class="admin-idcards-grid">
      ${cards.map((c) => `
        <article class="admin-idcard-item">
          <div class="admin-idcard-visual">
            ${c.card_image ? `<img src="${esc(c.card_image)}" alt="${esc(c.full_name)}">` : ''}
          </div>
          <div class="admin-idcard-details">
            <div class="row" style="justify-content:space-between">
              <h4>${esc(c.full_name)}</h4>
              <span class="chip state-open">بصمة نشطة 128-D</span>
            </div>
            <div class="admin-id-kv">
              <div><span>الرقم القومي:</span> <b class="mono">${esc(c.national_id_plain || c.national_id_masked || '—')}</b></div>
              <div><span>تاريخ الميلاد:</span> <b class="mono">${esc(c.birth_date || '—')}</b></div>
              <div><span>المحافظة:</span> <b>${esc(c.governorate || '—')}</b></div>
            </div>
          </div>
        </article>
      `).join('') || '<p class="muted">لا توجد بطاقات مسجّلة.</p>'}
    </div>
  </div>

  <div class="grid-2">
    <div class="card form-card">
      <h3>${icon('camera', 20)} إصدار وإضافة بطاقة رقم قومي جديدة للسجل</h3>
      <p class="muted small">أدخل بيانات المواطن وارفع صورة وجه واضحة؛ سيقوم النظام بتوليد البطاقة واستخراج بصمة الوجه تلقائيًا.</p>
      <form id="form-new-card">
        <div class="field"><label>الاسم الرباعي بالكامل</label>
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
          <div class="field"><label>الرقم القومي (١٤ رقمًا — أو اتركه للتوليد الآلي)</label>
            <input name="national_id" class="mono" maxlength="14" placeholder="31005292501518">
          </div>
          <div class="field"><label>النوع</label>
            <select name="gender"><option value="ذكر">ذكر</option><option value="أنثى">أنثى</option></select>
          </div>
        </div>
        <div class="field"><label>صورة الوجه الشخصية</label>
          <input type="file" id="new-card-photo" accept="image/*" required>
        </div>
        <button class="btn primary full" type="submit">${icon('ankh', 18)} إصدار البطاقة وحفظها في قاعدة البيانات</button>
        <p class="muted small" id="new-card-msg" hidden></p>
      </form>
    </div>

    <div class="card form-card">
      <h3>${icon('scarab', 20)} استيراد كشف ناخبين دفعة واحدة (CSV)</h3>
      <p class="muted small">إجمالي السجلات المعتمدة في الكشف الحالي: <b class="mono">${roll && roll.count ? roll.count : cards.length}</b> مواطن</p>
      <form id="form-roll">
        <div class="field"><label>بيانات الكشف بصيغة (الرقم القومي,الاسم)</label>
          <textarea name="csv" rows="6" class="mono" placeholder="31005292501518,علي أحمد علي محمد"></textarea>
        </div>
        <div class="row">
          <input type="file" id="roll-file" accept=".csv,.txt" hidden>
          <button class="btn ghost" type="button" id="btn-roll-file">رفع ملف CSV</button>
          <button class="btn primary" type="submit">${icon('lotus', 18)} استيراد الكشف</button>
        </div>
        <p class="muted small" id="roll-msg" hidden></p>
      </form>
    </div>
  </div>
</section>

<!-- ٣) إدارة الانتخابات والمرشحين -->
<section class="tab-panel" data-panel="elections">
  <div class="card" style="margin-bottom:22px">
    <h3>الاستحقاقات الانتخابية المسجّلة (${elections.length})</h3>
    <table class="table">
      <thead><tr><th>#</th><th>عنوان الاستحقاق الانتخابي</th><th>الحالة</th><th>المرشحون</th><th>الأصوات</th><th>إجراءات التحكم</th></tr></thead>
      <tbody>${electionRows || '<tr><td colspan="6" class="muted">لا توجد انتخابات</td></tr>'}</tbody>
    </table>
  </div>

  <div class="grid-2">
    <form class="card form-card" id="form-candidate">
      <h3>${icon('horus', 20)} إضافة مرشح جديد للاستحقاق</h3>
      <div class="field">
        <label>الاستحقاق الانتخابي</label>
        <select name="election_id">${elections.map((e) => `<option value="${esc(e.id)}">#${esc(e.id)} — ${esc(e.title)}</option>`).join('')}</select>
      </div>
      <div class="field">
        <label>اسم المرشح الكامل</label>
        <input name="name" required placeholder="مثال: د. طارق عبد الرحمن المنشاوي">
      </div>
      <div class="field">
        <label>اللقب المهني والرمز الانتخابي</label>
        <input name="slogan" placeholder="أستاذ الاقتصاد · رمز: الميزان ⚖️">
      </div>
      <div class="field">
        <label>ملخص البرنامج الانتخابي</label>
        <input name="program" placeholder="خطة التحول الرقمي وتطوير الخدمات...">
      </div>
      <button class="btn primary full" type="submit">${icon('check', 18)} إدراج المرشح في ورقة الاقتراع</button>
      <p class="muted small" id="cand-msg" hidden></p>
    </form>

    <form class="card form-card" id="form-election">
      <h3>${icon('ankh', 20)} إنشاء استحقاق انتخابي جديد</h3>
      <div class="field"><label>عنوان الانتخابات</label><input name="title" required placeholder="مثال: الانتخابات العامة ٢٠٢٦"></div>
      <div class="field"><label>الوصف الرسمي</label><input name="description" placeholder="دورة ٢٠٢٦ / ٢٠٣٠"></div>
      <div class="grid-2">
        <div class="field"><label>توقيت الفتح</label><input type="datetime-local" name="starts_at"></div>
        <div class="field"><label>توقيت الإغلاق</label><input type="datetime-local" name="ends_at"></div>
      </div>
      <input type="hidden" name="type" value="single">
      <button class="btn ghost full" type="submit">${icon('lotus', 18)} إنشاء استحقاق إضافي</button>
    </form>
  </div>
</section>

<!-- ٤) المراجعة البشرية -->
<section class="tab-panel" data-panel="reviews">
  <div class="card">
    <h3>طلبات المراجعة البشرية للحالات الرمادية (${reviews.length})</h3>
    <table class="table">
      <thead><tr><th>#</th><th>التوقيت</th><th>سبب الإحالة</th><th>نسبة التطابق</th><th>القرار</th></tr></thead>
      <tbody>${reviewRows || '<tr><td colspan="5" class="muted">لا توجد طلبات معلّقة — جميع عمليات التحقق البيومتري حُسمت آليًا</td></tr>'}</tbody>
    </table>
  </div>
</section>

<!-- ٥) سجل التدقيق -->
<section class="tab-panel" data-panel="audit">
  <div class="card">
    <h3>سجل التدقيق الأمني والتشفيري (Immutable Audit Log)</h3>
    <table class="table">
      <thead><tr><th>التوقيت</th><th>نوع العملية</th><th>المنفّذ</th><th>البيانات الوصفية</th></tr></thead>
      <tbody>${auditRows || '<tr><td colspan="4" class="muted">السجل فارغ</td></tr>'}</tbody>
    </table>
  </div>
</section>`;
}

function adminReview({ review, electionTitle }) {
  return `
<section class="page-head">
  <h1>فحص ومراجعة الطلب #${esc(review.id)}</h1>
  <p class="muted">الاستحقاق: <b>${esc(electionTitle || '—')}</b> · نسبة التطابق: <b class="mono">${Math.round((Number(review.score) || 0) * 100)}%</b></p>
</section>
<div class="grid-2">
  <div class="card">
    <h4>${icon('scarab', 18)} البطاقة المرجعية</h4>
    ${review.card_image ? `<img src="/admin/review-image/${esc(review.card_image)}" alt="بطاقة" style="width:100%;border-radius:10px">` : '<p class="muted">لا توجد صورة</p>'}
  </div>
  <div class="card">
    <h4>${icon('camera', 18)} صورة السيلفي الملتقطة</h4>
    ${review.selfie_image ? `<img src="/admin/review-image/${esc(review.selfie_image)}" alt="سيلفي" style="width:100%;border-radius:10px">` : '<p class="muted">لا توجد صورة</p>'}
  </div>
</div>
<div class="card" style="margin-top:18px">
  <div class="row center-row">
    <button class="btn ok lg" data-review="${esc(review.id)}" data-approve="1">${icon('check', 18)} اعتماد الهوية وإصدار التذكرة</button>
    <button class="btn danger lg" data-review="${esc(review.id)}" data-approve="0">${icon('warn', 18)} رفض المطابقة</button>
    <a class="btn ghost lg" href="/admin">العودة للوحة القيادة</a>
  </div>
</div>`;
}

module.exports = { adminLogin, adminDashboard, adminReview };
