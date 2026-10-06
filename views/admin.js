const { icon, esc, candidateSvg, symbolIcon } = require('./layout');

const STATE_AR = { open: 'مفتوح', closed: 'مغلق', upcoming: 'قريبًا' };
const AUDIT_AR = {
  voter_registered: 'تسجيل ناخب جديد',
  otp_sent: 'إرسال كود موبايل',
  otp_verified: 'تأكيد رقم الموبايل',
  verify_started: 'بدء جلسة تحقق بالكاميرا',
  verify_approved: 'اعتماد مطابقة الهوية',
  verify_review: 'تحويل للمراجعة اليدوية',
  verify_rejected: 'رفض مطابقة الهوية',
  ballot_cast: 'إيداع ورقة اقتراع',
  election_created: 'إنشاء استحقاق انتخابي',
  election_state: 'تحديث حالة استحقاق',
  election_deleted: 'حذف استحقاق انتخابي',
  candidate_added: 'إضافة مرشح جديد',
  review_decided: 'قرار لجنة في مراجعة',
  roll_imported: 'استيراد كشف ناخبين',
  id_card_created: 'إصدار بطاقة رقم قومي',
};

/* ---------------------------------------------------------- ١) شاشة دخول لجنة الإشراف */
function adminLogin({ error = '', email = '' } = {}) {
  return `
  <div class="admin-login-wrap">
    <div class="scanner-frame" style="max-width:560px;width:100%;min-height:auto">
      <div class="file-tab">COMMITTEE // AUTH</div>
      <span class="corner-mark corner-one"></span>
      <span class="corner-mark corner-two"></span>

      <div class="scanner-topline">
        <div>
          <span class="status-dot"></span>
          <b>بوابة دخول لجنة الإشراف والفرز</b>
        </div>
        <span>ADMIN // SECURE</span>
      </div>

      <h1 style="margin:6px 0 8px;font-size:32px;font-weight:900">دخول لجنة الإشراف</h1>
      <p class="muted" style="margin:0 0 14px;font-size:13px">أدخل مفتاح اللجنة المعتمد أو بيانات المشرف لإدارة الاستحقاقات ومراجعة طلبات الهوية وسجل التدقيق.</p>

      ${error ? `<div class="error-note" role="alert">${icon('alert', 16)} <span>${esc(error)}</span></div>` : ''}

      <form method="POST" action="/api/admin/login" class="input-stage" style="padding-top:10px">
        <div class="field">
          <label for="admin-key"><span>KEY</span> مفتاح اللجنة السري (أو كلمة المرور)</label>
          <input id="admin-key" name="key" type="password" class="ltr mono" placeholder="per-aa-admin" required autofocus>
          <small class="hint">في وضع التجربة المحلي المفتاح الافتراضي هو: <code class="mono ltr">per-aa-admin</code></small>
        </div>

        <details style="margin:10px 0;font-size:12px">
          <summary style="cursor:pointer;font-weight:800">أو الدخول بالبريد الإلكتروني وكلمة المرور</summary>
          <div class="grid-2" style="margin-top:10px">
            <div class="field">
              <label for="admin-email">البريد الإلكتروني</label>
              <input id="admin-email" name="email" type="email" class="ltr" value="${esc(email)}" placeholder="admin@soot.eg">
            </div>
            <div class="field">
              <label for="admin-pass">كلمة المرور</label>
              <input id="admin-pass" name="password" type="password" class="ltr" placeholder="••••••••">
            </div>
          </div>
        </details>

        <button type="submit" class="sketch-button scan-button">
          ${icon('lock', 18)}
          <span>دخول لوحة الإشراف الآن</span>
        </button>
      </form>
    </div>
  </div>
  `;
}

/* ---------------------------------------------------------- ٢) لوحة الإشراف الرئيسية */
function adminDashboard({
  stats = {},
  elections = [],
  candidatesByElection = {},
  reviews = [],
  audit = [],
  providers = {},
  roll = {},
  rollStats = {},
  cards = [],
  idCards = [],
} = {}) {
  const pendingReviews = reviews.filter((r) => r.status === 'pending');
  const rollInfo = Object.keys(roll).length ? roll : rollStats;
  const cardList = (cards && cards.length) ? cards : idCards;

  return `
  <section class="admin-hero">
    <div>
      <div class="case-kicker">
        <span>SUPERVISION COMMAND</span>
        <b>ADMIN LAB</b>
        <i>ACTIVE</i>
      </div>
      <h1>لوحة <span>لجنة الإشراف</span></h1>
      <p class="muted">إدارة الاستحقاقات، إصدار البطاقات القومية للتجربة، مراجعة حالات التحقق الرمادية، ومتابعة سجل التدقيق.</p>
    </div>
    <div class="admin-hero-actions">
      <a class="sketch-button" href="/results">${icon('chart', 16)} <span>النتائج العامة</span></a>
      <form method="POST" action="/api/admin/logout" style="display:inline;margin:0">
        <button type="submit" class="sketch-button">${icon('close', 15)} <span>تسجيل الخروج</span></button>
      </form>
    </div>
  </section>

  <!-- إحصائيات سريعة بأسلوب Kashif Steps Row -->
  <section class="steps-row admin-stats-row" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px">
    <article>
      <span>${stats.voters || 0}</span>
      <div><b>ناخبون مسجّلون</b><p>إجمالي طلبات التحقق</p></div>
      <small>VOTERS</small>
    </article>
    <article>
      <span>${stats.verified || 0}</span>
      <div><b>هويات معتمدة</b><p>اجتازوا مطابقة الوجه</p></div>
      <small>VERIFIED</small>
    </article>
    <article>
      <span>${stats.ballots || 0}</span>
      <div><b>أصوات في الصندوق</b><p>أوراق اقتراع موقّعة</p></div>
      <small>BALLOTS</small>
    </article>
    <article>
      <span>${pendingReviews.length}</span>
      <div><b>طلبات قيد المراجعة</b><p>بانتظار قرار اللجنة</p></div>
      <small>REVIEWS</small>
    </article>
  </section>

  <!-- حالة مزوّدي التحقق -->
  <div class="intel-panel" style="margin-bottom:24px">
    <div class="intel-title">
      <span>BIOMETRIC &amp; SECURITY PROVIDERS</span>
      <b>SYSTEM STATUS</b>
    </div>
    <div class="intel-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="intel-check safe">
        <span>مطابقة الوجه</span>
        <b>${esc((providers.face && (providers.face.label || providers.face.mode)) || '128-D Neural + Demo')}</b>
      </div>
      <div class="intel-check info">
        <span>قراءة البطاقة (OCR)</span>
        <b>${esc((providers.ocr && (providers.ocr.label || providers.ocr.mode)) || 'demo')}</b>
      </div>
      <div class="intel-check warning">
        <span>كود الموبايل (OTP)</span>
        <b>${esc((providers.otp && (providers.otp.label || providers.otp.mode)) || 'معطّل / تجريبي')}</b>
      </div>
      <div class="intel-check safe">
        <span>كشف الناخبين</span>
        <b>${rollInfo.strict ? 'وضع صارم' : 'وضع مرن'} (${rollInfo.count || cardList.length || 0} بطاقة)</b>
      </div>
    </div>
  </div>

  <!-- تبويبات لوحة الإدارة بأسلوب Kashif Mode Tabs -->
  <div id="admin-tabs" class="mode-tabs admin-mode-tabs" style="grid-template-columns:repeat(5,1fr);margin-bottom:22px">
    <button type="button" class="tab active" data-tab="elections">${icon('vote', 15)} <span>الانتخابات والمرشحون</span></button>
    <button type="button" class="tab" data-tab="cards">${icon('id', 15)} <span>استوديو البطاقات (${cardList.length})</span></button>
    <button type="button" class="tab" data-tab="reviews">${icon('face', 15)} <span>المراجعة اليدوية (${pendingReviews.length})</span></button>
    <button type="button" class="tab" data-tab="roll">${icon('users', 15)} <span>كشوف الناخبين</span></button>
    <button type="button" class="tab" data-tab="audit">${icon('shield', 15)} <span>سجل التدقيق</span></button>
  </div>

  <!-- تبويب ١: الانتخابات والمرشحون -->
  <section class="tab-panel active" data-panel="elections">
    <div class="grid-2 align-start">
      <div class="scanner-frame" style="min-height:auto;transform:none">
        <div class="file-tab">NEW // ELECTION</div>
        <div class="scanner-topline">
          <div><span class="status-dot"></span><b>إنشاء استحقاق انتخابي جديد</b></div>
          <span>CREATE</span>
        </div>
        <form id="form-election" class="input-stage" style="padding-top:6px">
          <div class="field">
            <label><span>TITLE</span> عنوان الاستحقاق الانتخابي</label>
            <input name="title" type="text" required placeholder="مثال: انتخابات اتحاد الطلاب ٢٠٢٦">
          </div>
          <div class="field">
            <label><span>DESC</span> وصف مختصر</label>
            <textarea name="description" rows="2" style="min-height:76px" placeholder="وصف الاستحقاق وقواعد التصويت…"></textarea>
          </div>
          <button type="submit" class="sketch-button scan-button">إنشاء الاستحقاق الآن</button>
        </form>
      </div>

      <div class="scanner-frame" style="min-height:auto;transform:none">
        <div class="file-tab">NEW // CANDIDATE</div>
        <div class="scanner-topline">
          <div><span class="status-dot"></span><b>إضافة مرشح إلى استحقاق</b></div>
          <span>CANDIDATE</span>
        </div>
        <form id="form-candidate" class="input-stage" style="padding-top:6px">
          <div class="field">
            <label><span>ELECTION</span> الاستحقاق الانتخابي</label>
            <select name="election_id" required>
              ${elections.map((e) => `<option value="${e.id}">${esc(e.title)}</option>`).join('')}
            </select>
          </div>
          <div class="grid-2">
            <div class="field">
              <label><span>NAME</span> اسم المرشح</label>
              <input name="name" type="text" required placeholder="الاسم الكامل">
            </div>
            <div class="field">
              <label><span>SYMBOL</span> الرمز الانتخابي</label>
              <input name="symbol" type="text" required placeholder="الميزان / النجمة / الكتاب">
            </div>
          </div>
          <div class="field">
            <label><span>ROLE</span> الصفة / المسمى</label>
            <input name="title" type="text" placeholder="أستاذ جامعي / مهندس / طبيب">
          </div>
          <div class="field">
            <label><span>BIO</span> البرنامج الانتخابي المختصر</label>
            <textarea name="bio" rows="2" style="min-height:70px" placeholder="أبرز نقاط البرنامج الانتخابي…"></textarea>
          </div>
          <div id="cand-msg" class="advice-note" hidden></div>
          <button type="submit" class="sketch-button scan-button">إضافة المرشح</button>
        </form>
      </div>
    </div>

    <!-- قائمة الاستحقاقات الحالية -->
    <div style="margin-top:26px;display:grid;gap:18px">
      ${elections.map((e) => {
        const cands = e.candidates || candidatesByElection[e.id] || [];
        return `
        <div class="scanner-frame" style="min-height:auto;transform:none">
          <div class="file-tab">ELECTION // #${e.id}</div>
          <div class="result-head" style="margin-bottom:14px;flex-wrap:wrap">
            <div>
              <span class="status-badge state-${e.state}">${esc(STATE_AR[e.state] || e.state)}</span>
              <h3 style="margin:6px 0 4px;font-size:20px;font-weight:900">${esc(e.title)}</h3>
              <p class="muted small" style="margin:0">${esc(e.description || '')}</p>
            </div>
            <div class="row" style="gap:8px;flex-wrap:wrap">
              ${e.state !== 'open' ? `<button type="button" class="sketch-button btn-sm" data-election-state="${e.id}" data-state="open">فتح الاقتراع</button>` : ''}
              ${e.state !== 'closed' ? `<button type="button" class="sketch-button btn-sm" data-election-state="${e.id}" data-state="closed">غلق الاقتراع</button>` : ''}
              <button type="button" class="sketch-button btn-sm btn-danger" data-delete-election="${e.id}">حذف</button>
            </div>
          </div>
          <div class="admin-cands-grid">
            ${cands.map((c, idx) => `
              <div class="admin-cand-card">
                <div class="admin-cand-head">
                  <img class="admin-cand-avatar" src="${esc(c.photo_url || candidateSvg(c, idx))}" alt="${esc(c.name)}">
                  <div class="admin-cand-meta">
                    <strong>${esc(c.name)}</strong>
                    <span class="muted small">${esc(c.title || '')} · رمز: ${esc(c.symbol || '—')}</span>
                  </div>
                  <span class="cc-number">${c.votes || 0} صوت</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>
  </section>

  <!-- تبويب ٢: استوديو توليد البطاقات القومية -->
  <section class="tab-panel" data-panel="cards">
    <div class="scanner-frame" style="min-height:auto;transform:none;margin-bottom:24px">
      <div class="file-tab">ID STUDIO // EGYPT</div>
      <div class="scanner-topline">
        <div><span class="status-dot"></span><b>استوديو إصدار بطاقة رقم قومي تجريبية ببصمة وجه حقيقية</b></div>
        <span>STUDIO // V2</span>
      </div>

      <div class="grid-2 align-start">
        <form id="form-new-card" class="input-stage" style="padding-top:4px">
          <div class="field">
            <label><span>NAME</span> الاسم الكامل رباعيًا</label>
            <input name="full_name" type="text" value="محمد طارق عبد الله حسن" required>
          </div>
          <div class="grid-2">
            <div class="field">
              <label><span>DOB</span> تاريخ الميلاد</label>
              <input name="birth_date" type="date" value="2002-08-15" class="ltr" required>
            </div>
            <div class="field">
              <label><span>GOV</span> المحافظة</label>
              <select name="governorate">
                ${['أسيوط','القاهرة','الجيزة','الإسكندرية','الدقهلية','الشرقية','سوهاج','المنيا','قنا','أسوان'].map((g) => `<option value="${g}">${g}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="grid-2">
            <div class="field">
              <label><span>GENDER</span> النوع</label>
              <select name="gender"><option value="ذكر">ذكر</option><option value="أنثى">أنثى</option></select>
            </div>
            <div class="field">
              <label><span>NID</span> الرقم القومي (اختياري — يُولّد تلقائيًا)</label>
              <input name="national_id" type="text" maxlength="14" class="ltr mono" placeholder="يُولّد تلقائيًا من الميلاد والمحافظة">
            </div>
          </div>
          <div class="field">
            <label><span>ADDR</span> العنوان التفصيلي على البطاقة</label>
            <input name="address" type="text" placeholder="١٤ ش الجمهورية — قسم أول أسيوط">
          </div>
          <div class="field">
            <label for="new-card-photo"><span>FACE</span> صورة وجه صاحب البطاقة (تُستخدم في مطابقة الكاميرا) <i class="req">*</i></label>
            <input id="new-card-photo" type="file" accept="image/*" required>
          </div>
          <div id="new-card-msg" hidden></div>
          <button type="submit" id="btn-submit-new-card" class="sketch-button scan-button">إصدار البطاقة وحفظها في السجل المدني</button>
        </form>

        <div>
          <span class="small muted" style="display:block;margin-bottom:6px;font-weight:800">معاينة حية للبطاقة قبل الإصدار:</span>
          <div class="idcard-preview-wrap">
            <canvas id="live-idcard-canvas" width="1012" height="638"></canvas>
          </div>
        </div>
      </div>
    </div>

    <div class="admin-cards-grid">
      ${cardList.map((c) => `
        <div class="admin-idcard">
          <div>
            ${c.card_image ? `<img src="${esc(c.card_image)}" alt="بطاقة ${esc(c.full_name)}" class="ref-card-img">` : ''}
          </div>
          <div style="display:flex;flex-direction:column;justify-content:space-between">
            <div>
              <h4 style="margin:0 0 6px;font-size:17px;font-weight:900">${esc(c.full_name)}</h4>
              <p class="mono ltr" style="margin:0 0 6px;font-weight:800">${esc(c.national_id_plain || 'مشفّر')}</p>
              <p class="muted small" style="margin:0">${esc(c.governorate || '')} · ${esc(c.birth_date || '')}</p>
            </div>
            <div class="row" style="gap:8px;margin-top:12px">
              <button type="button" class="sketch-button btn-sm btn-danger" data-delete-card="${c.id}">حذف البطاقة</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  </section>

  <!-- تبويب ٣: المراجعة اليدوية -->
  <section class="tab-panel" data-panel="reviews">
    <div class="scanner-frame" style="min-height:auto;transform:none">
      <div class="file-tab">MANUAL // REVIEWS</div>
      <h3 style="margin:0 0 12px;font-size:20px;font-weight:900">طلبات التحقق المحوّلة للمراجعة اليدوية</h3>
      ${reviews.length ? `
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>#</th><th>الناخب</th><th>نسبة التشابه</th><th>الأسباب</th><th>الحالة</th><th>الإجراء</th></tr></thead>
            <tbody>
              ${reviews.map((r) => `
                <tr>
                  <td class="mono">#${r.id}</td>
                  <td><b>${esc(r.voter_name || r.full_name || 'ناخب')}</b></td>
                  <td class="mono ltr">${Math.round((r.score || 0) * 100)}%</td>
                  <td class="small">${esc((r.reasons || []).join(' · '))}</td>
                  <td><span class="status-badge">${esc(r.status)}</span></td>
                  <td>
                    ${r.status === 'pending' ? `
                      <div class="row" style="gap:6px">
                        <button type="button" class="sketch-button btn-sm btn-ok" data-review="${r.id}" data-approve="1">قبول</button>
                        <button type="button" class="sketch-button btn-sm btn-danger" data-review="${r.id}" data-approve="0">رفض</button>
                      </div>
                    ` : '—'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty-state"><p>لا توجد طلبات معلّقة للمراجعة اليدوية حاليًا.</p></div>`}
    </div>
  </section>

  <!-- تبويب ٤: كشوف الناخبين -->
  <section class="tab-panel" data-panel="roll">
    <div class="scanner-frame" style="min-height:auto;transform:none">
      <div class="file-tab">VOTER // ROLL CSV</div>
      <h3 style="margin:0 0 8px;font-size:20px;font-weight:900">استيراد كشوف الناخبين (CSV)</h3>
      <p class="muted small" style="margin:0 0 14px">صيغة كل سطر: <code class="mono ltr">الرقم_القومي,الاسم_الكامل,تاريخ_الميلاد,المحافظة</code></p>
      <form id="form-roll" class="input-stage" style="padding-top:4px">
        <textarea name="csv" rows="5" class="ltr mono" placeholder="31005292501518,علي أحمد علي محمد,2010-05-29,أسيوط"></textarea>
        <input id="roll-file" type="file" accept=".csv,.txt" hidden>
        <div class="row" style="gap:10px;margin-top:12px">
          <button type="submit" class="sketch-button primary-button">استيراد الكشف الآن</button>
          <button type="button" id="btn-roll-file" class="sketch-button">تحميل ملف CSV من الجهاز</button>
        </div>
        <div id="roll-msg" class="advice-note" hidden></div>
      </form>
    </div>
  </section>

  <!-- تبويب ٥: سجل التدقيق -->
  <section class="tab-panel" data-panel="audit">
    <div class="scanner-frame" style="min-height:auto;transform:none">
      <div class="file-tab">AUDIT // LOG</div>
      <h3 style="margin:0 0 12px;font-size:20px;font-weight:900">سجل التدقيق الأمني الزمني (خالي من البيانات الشخصية)</h3>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>الوقت</th><th>الحدث</th><th>الفاعل</th><th>تفاصيل إضافية</th></tr></thead>
          <tbody>
            ${audit.map((a) => `
              <tr>
                <td class="mono ltr small">${esc(String(a.created_at || a.at || '').replace('T', ' ').slice(0, 19))}</td>
                <td><span class="audit-badge">${esc(AUDIT_AR[a.action] || a.action)}</span></td>
                <td class="mono small">${esc(a.actor || 'system')}</td>
                <td class="mono ltr small">${esc(typeof a.meta === 'string' ? a.meta : JSON.stringify(a.meta || {}))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </section>
  `;
}

/* ---------------------------------------------------------- ٣) صفحة تفاصيل مراجعة فردية */
function adminReview({ review }) {
  if (!review) return `<div class="scanner-frame"><p>الطلب غير موجود</p></div>`;
  return `
  <div class="scanner-frame" style="max-width:780px;margin:24px auto">
    <div class="file-tab">REVIEW // #${review.id}</div>
    <h2>مراجعة طلب الهوية #${review.id}</h2>
    <p>الناخب: <b>${esc(review.voter_name || review.full_name || '—')}</b> · التشابه: <b class="mono">${Math.round((review.score || 0) * 100)}%</b></p>
    <div class="row" style="gap:10px;margin-top:16px">
      <button type="button" class="sketch-button btn-ok" data-review="${review.id}" data-approve="1">قبول الهوية</button>
      <button type="button" class="sketch-button btn-danger" data-review="${review.id}" data-approve="0">رفض الطلب</button>
      <a class="sketch-button" href="/admin">عودة للوحة</a>
    </div>
  </div>`;
}

module.exports = {
  adminLogin,
  adminDashboard,
  adminReview,
  loginPage: adminLogin,
  dashboardPage: adminDashboard,
  reviewDetailPage: adminReview,
};
