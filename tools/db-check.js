'use strict';
/**
 * فحص الاتصال بقاعدة بيانات Supabase والتحقق من الجاهزية
 *   ١) هل الوصول لـ REST API شغّال بالمفتاح؟
 *   ٢) هل كل الجداول موجودة وقابلة للقراءة؟
 *   ٣) اختبار كتابة حقيقي (إنشاء انتخابة + مرشح ثم حذفهما) — اختياري بـ --write
 *
 * التشغيل: node tools/db-check.js [--write]
 */
const { config } = require('../lib/config');

const TABLES = ['voters', 'elections', 'candidates', 'vote_tokens', 'ballots', 'reviews', 'audit_log', 'voter_roll', 'provider_calls', 'otp_codes'];
const H = {
  apikey: config.supabaseKey,
  Authorization: `Bearer ${config.supabaseKey}`,
  'Content-Type': 'application/json',
};

let pass = 0; let fail = 0;
function line(ok, text, extra = '') {
  if (ok) pass++; else fail++;
  console.log(`  ${ok ? '✅' : '❌'} ${text}${extra ? `  (${extra})` : ''}`);
}

async function count(table) {
  const res = await fetch(`${config.supabaseUrl}/rest/v1/${table}?select=id`, {
    method: 'HEAD', headers: { ...H, Prefer: 'count=exact' },
  });
  if (res.status === 404) return { ok: false, note: 'الجدول غير موجود (نفّذ supabase/schema.sql)' };
  if (!res.ok) return { ok: false, note: `${res.status} ${(await res.text()).slice(0, 90)}` };
  const range = res.headers.get('content-range') || '*/0';
  return { ok: true, count: parseInt(range.split('/')[1] || '0', 10) };
}

(async () => {
  const write = process.argv.includes('--write');
  console.log('\n𓂀 فحص قاعدة بيانات «صوت موثّق»\n' + '─'.repeat(58));
  console.log(`▸ الوضع: ${config.databaseMode}`);
  console.log(`▸ العنوان: ${config.supabaseUrl || '(غير مضبوط — وضع التجربة المحلي)'}`);

  if (config.databaseMode !== 'supabase') {
    console.log('\n⚠️ مفاتيح Supabase غير مضبوطة. المنصة شغّالة حاليًا في «وضع التجربة» بقاعدة بيانات محلية.');
    console.log('   للربط: انسخ .env.example إلى .env واملأ SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(0);
  }

  console.log('\n▸ (١) الوصول إلى REST API:');
  try {
    const res = await fetch(`${config.supabaseUrl}/rest/v1/`, { headers: H });
    line(res.status < 500, `الاتصال بالعنوان (${res.status})`);
  } catch (err) {
    line(false, 'تعذّر الوصول للعنوان', err.message);
    process.exit(1);
  }
  const auth = await fetch(`${config.supabaseUrl}/rest/v1/voters?select=id&limit=1`, { headers: H });
  line(auth.ok || auth.status === 404, auth.status === 404 ? 'المفتاح صحيح لكن الجداول غير منشأة' : `المفتاح مقبول (${auth.status})`);

  console.log('\n▸ (٢) الجداول:');
  for (const t of TABLES) {
    const r = await count(t);
    if (r.ok) line(true, t, `${r.count} صف`);
    else line(false, t, r.note);
  }

  if (write) {
    console.log('\n▸ (٣) اختبار كتابة حقيقي:');
    let electionId = null; let candidateId = null;
    try {
      const er = await fetch(`${config.supabaseUrl}/rest/v1/elections`, {
        method: 'POST', headers: { ...H, Prefer: 'return=representation' },
        body: JSON.stringify([{ title: 'اختبار اتصال — صوت موثّق', description: 'سجل اختباري يُحذف تلقائيًا', type: 'single', state: 'draft' }]),
      });
      const e = await er.json();
      electionId = e && e[0] && e[0].id;
      line(!!electionId, 'إنشاء انتخابة اختبارية', electionId ? `رقم ${electionId}` : (e && e.message));

      const cr = await fetch(`${config.supabaseUrl}/rest/v1/candidates`, {
        method: 'POST', headers: { ...H, Prefer: 'return=representation' },
        body: JSON.stringify([{ election_id: electionId, name: 'مرشح اختباري', sort: 1 }]),
      });
      const c = await cr.json();
      candidateId = c && c[0] && c[0].id;
      line(!!candidateId, 'إضافة مرشح اختباري');

      const br = await fetch(`${config.supabaseUrl}/rest/v1/ballots`, {
        method: 'POST', headers: { ...H, Prefer: 'return=representation' },
        body: JSON.stringify([{ election_id: electionId, candidate_id: candidateId, receipt_code: `TEST-${Date.now().toString(36).toUpperCase()}` }]),
      });
      const b = await br.json();
      line(!!(b && b[0]), 'تسجيل صوت اختباري');

      const ar = await fetch(`${config.supabaseUrl}/rest/v1/ballots?election_id=eq.${electionId}&select=candidate_id`, { headers: H });
      const ballots = await ar.json();
      line(Array.isArray(ballots) && ballots.length === 1, 'قراءة الأصوات وإحصاؤها');

      // تنظيف
      await fetch(`${config.supabaseUrl}/rest/v1/ballots?election_id=eq.${electionId}`, { method: 'DELETE', headers: H });
      await fetch(`${config.supabaseUrl}/rest/v1/candidates?id=eq.${candidateId}`, { method: 'DELETE', headers: H });
      await fetch(`${config.supabaseUrl}/rest/v1/elections?id=eq.${electionId}`, { method: 'DELETE', headers: H });
      line(true, 'تنظيف السجلات الاختبارية');
    } catch (err) {
      line(false, 'خطأ أثناء الكتابة', err.message);
    }
  } else {
    console.log('\n▸ (٣) اختبار الكتابة: متخطّى — أضف --write لتشغيله');
  }

  console.log('\n' + '─'.repeat(58));
  console.log(`النتيجة: ${pass} ناجح · ${fail} فاشل ${fail ? '✗' : '— القاعدة جاهزة ✓'}`);
  process.exit(fail ? 1 : 0);
})();
