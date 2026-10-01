'use strict';
/**
 * لوحة الإشراف — تصميم كاشف (Kashif Paper Dossier & Sketch Neo-Brutalist Style)
 */
const { esc, icon, stateBadge } = require('./layout');

function adminLogin({ error = null, email = '' }) {
  return `
<section class="scanner-frame" style="max-width:480px;margin:28px auto;min-height:auto">
  <div class="file-tab">ADMIN // ACCESS</div>
  <div class="scanner-topline">
    <div><span class="status-dot"></span> بوابة المشرف العام</div>
    <span>SOOT // ADMIN TERMINAL</span>
  </div>
  <div style="text-align:center;margin-bottom:14px">
    <div class="scan-circle" style="width:62px;height:62px;margin:0 auto 10px">${icon('lock', 28)}</div>
    <h1 style="font-size:26px;font-weight:900;margin:0">دخول لوحة الإشراف</h1>
    <p class="muted small">مخصّصة للمشرف المعتمد لإصدار البطاقات القومية ومتابعة الفرز.</p>
  </div>
  ${error ? `<div class="error-note" role="alert" style="margin-bottom:12px">${esc(error)}</div>` : ''}
  <form method="post" action="/api/admin/login" class="input-stage" style="padding-top:4px">
    <div class="field">
      <label for="admin-email"><span>01</span> البريد الإلكتروني</label>
      <input id="admin-email" name="email" type="email" value="${esc(email)}" class="mono"
             required autocomplete="username" autofocus placeholder="name@example.com"/>
    </div>
    <div class="field">
      <label for="admin-password"><span>02</span> كلمة المرور</label>
      <input id="admin-password" name="password" type="password" class="mono"
             required autocomplete="current-password" placeholder="••••••••••"/>
    </div>
    <button class="sketch-button scan-button" type="submit">دخول لوحة الإشراف الآن ←</button>
  </form>
</section>`;
}

function adminDashboard({ stats, elections, reviews, audit, adminName = 'المشرف العام', cards = [] }) {
  const activeElection = elections[0] || { id: 1, title: 'الانتخابات العامة لرئاسة المجلس الوطني ٢٠٢٦', candidates: [], total_ballots: 0 };
  const totalBallots = elections.reduce((s, e) => s + (e.total_ballots || 0), 0);
  const totalCandidates = elections.reduce((s, e) => s + ((e.candidates && e.candidates.length) || 0), 0);

  const candidateScoreCards = (activeElection.candidates || []).map((c, idx) => {
    const photo = c.photo_url || `/candidates/c${(idx % 4) + 1}.jpg`;
    return `
      <div class="admin-cand-card">
        <div class="admin-cand-head">
          <img src="${esc(photo)}" alt="${esc(c.name)}" class="admin-cand-avatar"/>
          <div class="admin-cand-meta">
            <span class="admin-cand-num">CAND / 0${idx + 1}</span>
            <b>${esc(c.name)}</b>
            <small class="muted">${esc(c.slogan || '')}</small>
          </div>
          <div class="admin-cand-score">
            <b>${c.percent || 0}%</b>
            <span>${c.votes || 0} صوت</span>
          </div>
        </div>
        <div class="score-track safe" style="margin:8px 0 0"><span style="width:${Math.max(4, c.percent || 0)}%"></span></div>
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
          ${e.state !== 'open' ? `<button class="sketch-button small-sketch-btn" data-election-state="${esc(e.id)}" data-state="open">فتح التصويت</button>` : ''}
          ${e.state === 'open' ? `<button class="sketch-button small-sketch-btn" data-election-state="${esc(e.id)}" data-state="closed">إغلاق التصويت</button>` : ''}
          <a class="sketch-button small-sketch-btn" href="/results?e=${esc(e.id)}">النتائج</a>
          ${elections.length > 1 ? `<button class="sketch-button small-sketch-btn danger-btn" data-delete-election="${esc(e.id)}">حذف</button>` : ''}
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
          <a class="sketch-button small-sketch-btn" href="/admin/review/${esc(r.id)}">فحص الصور</a>
          <button class="sketch-button small-sketch-btn" data-review="${esc(r.id)}" data-approve="1">قبول</button>
          <button class="sketch-button small-sketch-btn danger-btn" data-review="${esc(r.id)}" data-approve="0">رفض</button>
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
<script src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.min.js" defer></script>

<section class="admin-command-hero">
  <div>
    <div class="case-kicker"><span>ADMIN LAB</span><b>#CMD-2026</b><i>ACTIVE</i></div>
    <h1 style="margin-top:10px">غرفة التحكم وإصدار بطاقات الرقم القومي</h1>
    <p>المشرف الحالي: <b>${esc(adminName)}</b> — توليد وتعديل بطاقات الرقم القومي وكتابة العنوان التفصيلي ومتابعة الفرز.</p>
  </div>
  <div class="admin-command-actions">
    <a class="sketch-button small-sketch-btn" href="/">فتح الموقع العام</a>
    <form method="post" action="/api/admin/logout" style="display:inline">
      <button class="sketch-button small-sketch-btn danger-btn" type="submit">تسجيل الخروج</button>
    </form>
  </div>
</section>

<section class="steps-row" style="grid-template-columns:repeat(4,1fr);margin-bottom:22px">
  <article><span>${totalBallots}</span><div><b>إجمالي الأصوات</b><p>أصوات صحيحة بالصندوق</p></div><small>BALLOTS</small></article>
  <article><span>${totalCandidates}</span><div><b>عدد المرشحين</b><p>بالقائمة النهائية</p></div><small>CANDIDATES</small></article>
  <article><span>${cards.length}</span><div><b>البطاقات القومية</b><p>محفوظة بقاعدة البيانات</p></div><small>ID CARDS</small></article>
  <article><span>${stats.voters}</span><div><b>ناخبين مسجّلين</b><p>في هذه الدورة</p></div><small>VOTERS</small></article>
</section>

<nav class="mode-tabs" id="admin-tabs" style="grid-template-columns:repeat(5,1fr);margin-bottom:22px">
  <button class="tab active" type="button" data-tab="roll">توليد البطاقات والعنوان (${cards.length})</button>
  <button class="tab" type="button" data-tab="overview">نتائج المرشحين</button>
  <button class="tab" type="button" data-tab="elections">إدارة الانتخابات</button>
  <button class="tab" type="button" data-tab="reviews">المراجعة (${reviews.length})</button>
  <button class="tab" type="button" data-tab="audit">سجل التدقيق (${audit.length})</button>
</nav>

<!-- ١) إصدار وإدارة بطاقات الرقم القومي -->
<section class="tab-panel active" data-panel="roll">
  <div class="grid-2" style="margin-bottom:26px;align-items:start">
    <div class="scanner-frame" style="min-height:auto;transform:none">
      <div class="file-tab">ID GENERATOR // v2.6</div>
      <div class="scanner-topline">
        <div><span class="status-dot"></span> استوديو إصدار وتعديل البطاقات</div>
        <span>SOOT // CIVIL REGISTRY</span>
      </div>

      <form id="form-new-card">
        <div class="field">
          <label for="nc-name"><span>01</span> الاسم الرباعي (كما يظهر في البطاقة)</label>
          <input name="full_name" id="nc-name" required placeholder="مثال: محمد طارق عبد الله حسن"/>
        </div>

        <div class="field address-highlight-field">
          <label for="nc-address"><span>02</span> العنوان التفصيلي (يُكتب مباشرةً على البطاقة)</label>
          <input name="address" id="nc-address" required value="" placeholder="اكتب العنوان هنا — مثال: ١٥ ش النميس — قسم ثان أسيوط"/>
          <small class="hint">اكتب الشارع والمنطقة والقسم ليظهروا فورًا على البطاقة في السطر الأول للعنوان</small>
        </div>

        <div class="grid-2">
          <div class="field">
            <label for="nc-gov"><span>03</span> المحافظة (السطر الثاني للعنوان)</label>
            <select name="governorate" id="nc-gov">
              ${['أسيوط', 'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'الشرقية', 'المنيا', 'سوهاج', 'قنا', 'أسوان', 'الأقصر', 'الغربية', 'المنوفية', 'البحيرة', 'الفيوم', 'بني سويف', 'كفر الشيخ', 'دمياط', 'بورسعيد', 'السويس', 'الإسماعيلية'].map((g) => `<option value="${g}">${g}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="nc-dob"><span>04</span> تاريخ الميلاد</label>
            <input name="birth_date" id="nc-dob" type="date" required value="2002-08-15"/>
          </div>
        </div>

        <div class="grid-2">
          <div class="field">
            <label for="nc-nid"><span>05</span> الرقم القومي (14 رقم — أو اتركه يتولّد تلقائيًا)</label>
            <input name="national_id" id="nc-nid" class="mono" maxlength="14" placeholder="يتولّد تلقائيًا من الميلاد والمحافظة"/>
          </div>
          <div class="field">
            <label for="nc-gender"><span>06</span> النوع</label>
            <select name="gender" id="nc-gender"><option value="ذكر">ذكر</option><option value="أنثى">أنثى</option></select>
          </div>
        </div>

        <div class="field">
          <label for="new-card-photo"><span>07</span> صورة الوجه الشخصية (أو اضغط «تعديل العنوان» لبطاقة بالأسفل)</label>
          <input type="file" id="new-card-photo" accept="image/*"/>
        </div>

        <button class="sketch-button scan-button" type="submit" id="btn-submit-new-card">
          ${icon('id', 20)} إصدار / تحديث البطاقة وحفظها في قاعدة البيانات
        </button>
        <div id="new-card-msg" class="notice" style="margin-top:12px" hidden></div>
      </form>
    </div>

    <div class="scanner-frame" style="min-height:auto;transform:none">
      <div class="file-tab">LIVE PREVIEW</div>
      <div class="scanner-topline">
        <div><span class="status-dot"></span> المعاينة الحية للبطاقة المصرية</div>
        <span>1012×638 // LIVE CANVAS</span>
      </div>
      <p class="muted small" style="margin-bottom:10px">أي تعديل في الاسم أو العنوان أو المحافظة أو الصورة يترسم لحظيًا أمامك:</p>
      <div class="live-idcard-preview-wrap">
        <canvas id="live-idcard-canvas" width="1012" height="638" style="width:100%;border:3px solid var(--ink);box-shadow:5px 5px 0 var(--navy);display:block"></canvas>
      </div>
    </div>
  </div>

  <div class="scanner-frame" style="min-height:auto;transform:none">
    <div class="file-tab">STORED CARDS // ${cards.length}</div>
    <div class="scanner-topline">
      <div><span class="status-dot"></span> بطاقات الرقم القومي المحفوظة في قاعدة البيانات (${cards.length})</div>
      <span>SUPABASE // VOTER_ROLL</span>
    </div>
    <div class="admin-idcards-grid" id="admin-cards-list">
      ${cards.map((c) => `
        <article class="admin-idcard-item">
          <div class="admin-idcard-visual">
            ${c.card_image ? `<img src="${esc(c.card_image)}" alt="${esc(c.full_name)}"/>` : ''}
          </div>
          <div class="admin-idcard-details">
            <h4>${esc(c.full_name)}</h4>
            <div class="admin-id-kv">
              <div><span>الرقم القومي:</span> <b class="mono">${esc(c.national_id_plain || c.national_id_masked || '—')}</b></div>
              <div><span>تاريخ الميلاد:</span> <b class="mono">${esc(c.birth_date || '—')}</b> · <span>المحافظة:</span> <b>${esc(c.governorate || '—')}</b></div>
              <div><span>العنوان:</span> <b>${esc(c.address || `ش الجمهورية — قسم أول ${c.governorate || 'أسيوط'}`)}</b></div>
            </div>
            <div class="row" style="margin-top:12px">
              <button class="sketch-button small-sketch-btn active-chip btn-edit-card" type="button"
                data-name="${esc(c.full_name)}"
                data-nid="${esc(c.national_id_plain || '')}"
                data-dob="${esc(c.birth_date || '2002-08-15')}"
                data-gov="${esc(c.governorate || 'أسيوط')}"
                data-gender="${esc(c.gender || 'ذكر')}"
                data-address="${esc(c.address || `ش الجمهورية — قسم أول ${c.governorate || 'أسيوط'}`)}"
                data-face="${esc(c.face_image || '/cards/31005292501518-face.jpg')}">
                تعديل العنوان / البطاقة
              </button>
              <a class="sketch-button small-sketch-btn" href="/register" target="_blank">تجربة التسجيل</a>
              ${c.national_id_plain !== '31005292501518' && c.id ? `<button class="sketch-button small-sketch-btn danger-btn" type="button" data-delete-card="${esc(c.id)}">حذف</button>` : ''}
            </div>
          </div>
        </article>`).join('') || '<p class="muted">لا توجد بطاقات مسجّلة.</p>'}
    </div>
  </div>
</section>

<!-- ٢) نتائج المرشحين -->
<section class="tab-panel" data-panel="overview">
  <div class="scanner-frame" style="min-height:auto;transform:none">
    <h3>${esc(activeElection.title)}</h3>
    <div class="admin-cand-grid" style="margin-top:14px">
      ${candidateScoreCards}
    </div>
  </div>
</section>

<!-- ٣) إدارة الانتخابات والمرشحين -->
<section class="tab-panel" data-panel="elections">
  <div class="scanner-frame" style="min-height:auto;transform:none;margin-bottom:20px">
    <h3>الاستحقاقات الانتخابية المسجّلة</h3>
    <table class="table">
      <thead><tr><th>#</th><th>العنوان</th><th>الحالة</th><th>المرشحون</th><th>الأصوات</th><th>إجراءات</th></tr></thead>
      <tbody>${electionRows || '<tr><td colspan="6" class="muted">لا توجد انتخابات</td></tr>'}</tbody>
    </table>
  </div>

  <div class="grid-2">
    <form class="scanner-frame" style="min-height:auto;transform:none" id="form-election">
      <h3>إنشاء استحقاق انتخابي جديد</h3>
      <div class="field"><label><span>01</span> عنوان الانتخابات</label><input name="title" required placeholder="مثال: الانتخابات التكميلية ٢٠٢٦"/></div>
      <div class="field"><label><span>02</span> الوصف</label><textarea name="description" rows="2"></textarea></div>
      <button class="sketch-button scan-button" type="submit">إنشاء الانتخابة</button>
    </form>

    <form class="scanner-frame" style="min-height:auto;transform:none" id="form-candidate">
      <h3>إضافة مرشح جديد</h3>
      <div class="field">
        <label><span>01</span> الانتخابات</label>
        <select name="election_id" required>
          ${elections.map((e) => `<option value="${esc(e.id)}">${esc(e.title)}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label><span>02</span> اسم المرشح</label><input name="name" required placeholder="الاسم الكامل"/></div>
      <div class="field"><label><span>03</span> الصفة والرمز الانتخابي</label><input name="slogan" placeholder="مثال: أستاذ القانون الدستوري · رمز: الميزان"/></div>
      <div class="field"><label><span>04</span> البرنامج الانتخابي</label><textarea name="program" rows="2"></textarea></div>
      <button class="sketch-button scan-button" type="submit">إضافة المرشح</button>
      <div id="cand-msg" class="notice" style="margin-top:10px" hidden></div>
    </form>
  </div>
</section>

<!-- ٤) طلبات المراجعة -->
<section class="tab-panel" data-panel="reviews">
  <div class="scanner-frame" style="min-height:auto;transform:none">
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
  <div class="scanner-frame" style="min-height:auto;transform:none">
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
<section class="scanner-frame" style="min-height:auto;transform:none">
  <h1>فحص طلب المراجعة #${esc(review.id)}</h1>
  <p class="muted">الناخب: <b>${esc(voter ? voter.full_name : '—')}</b> — نسبة التطابق: <b>${Math.round((Number(review.score) || 0) * 100)}%</b></p>
  <div class="grid-2" style="margin:16px 0">
    <div class="intel-panel">
      <h3>صورة البطاقة</h3>
      ${review.card_image ? `<img style="width:100%" src="/admin/review-image/${esc(review.id)}/card" alt="البطاقة"/>` : '<p class="muted">غير متوفرة</p>'}
    </div>
    <div class="intel-panel">
      <h3>صورة الكاميرا</h3>
      ${review.selfie_image ? `<img style="width:100%" src="/admin/review-image/${esc(review.id)}/selfie" alt="السيلفي"/>` : '<p class="muted">غير متوفرة</p>'}
    </div>
  </div>
  <div class="row">
    <button class="sketch-button primary-button" data-review="${esc(review.id)}" data-approve="1">قبول وإصدار بطاقة اقتراع</button>
    <button class="sketch-button small-sketch-btn danger-btn" data-review="${esc(review.id)}" data-approve="0">رفض الطلب</button>
    <a class="sketch-button small-sketch-btn" href="/admin">عودة</a>
  </div>
</section>`;
}

module.exports = { adminLogin, adminDashboard, reviewDetailPage };
