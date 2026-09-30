'use strict';
/**
 * تعبئة Supabase ببيانات تجريبية (انتخابة + مرشحين) — اختياري،
 * ملاحظة: ملف supabase/schema.sql نفسه يزرع البيانات الافتراضية عند أول تنفيذ.
 * التشغيل: node tools/seed-supabase.js
 */
const { config } = require('../lib/config');

if (config.databaseMode !== 'supabase') {
  console.error('✗ مفاتيح Supabase غير مضبوطة في .env — لا شيء لتنفيذه.');
  process.exit(1);
}

const H = {
  apikey: config.supabaseKey,
  Authorization: `Bearer ${config.supabaseKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function api(method, resource, body, query = '') {
  const res = await fetch(`${config.supabaseUrl}/rest/v1/${resource}${query}`, {
    method, headers: H, body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`${resource}: ${res.status} ${(data && data.message) || ''}`);
  return data;
}

(async () => {
  console.log('→ التحقق من الجداول…');
  await api('GET', 'elections', null, '?select=id&limit=1');

  let elections = await api('GET', 'elections', null, '?select=*');
  if (!elections.length) {
    elections = await api('POST', 'elections', [{
      title: 'انتخابات اتحاد طلاب كلية الحاسبات والمعلومات',
      description: 'انتخاب رئيس الاتحاد — دورة 2026/2027',
      type: 'single', state: 'open',
    }]);
    console.log('✓ أُنشئت انتخابة تجريبية');
  } else {
    console.log(`✓ يوجد ${elections.length} انتخابة بالفعل`);
  }

  const election = elections[0];
  const existing = await api('GET', 'candidates', null, `?election_id=eq.${election.id}&select=id`);
  if (existing.length) {
    console.log(`✓ يوجد ${existing.length} مرشح بالفعل — تم التخطي`);
  } else {
    const rows = [
      ['منة الله عبد الرحمن', 'نائبة رئيس الاتحاد السابقة', 'توسيع الأنشطة الطلابية'],
      ['يوسف شاكر الحديدي', 'أمين اللجنة الثقافية', 'دعم التدريب والمنح'],
      ['حبيبة مراد سلامة', 'منسّقة الأنشطة الطلابية', 'تسهيل خدمات الطلاب'],
      ['كريم نشأت البدرى', 'ممثل الفرق الرياضية', 'دعم الفرق والبطولات'],
    ].map(([name, slogan, program], i) => ({ election_id: election.id, name, slogan, program, sort: i + 1 }));
    await api('POST', 'candidates', rows);
    console.log('✓ أُضيف 4 مرشحين');
  }
  console.log('\nتم ✓ — المنصة جاهزة للاستخدام مع قاعدة بيانات Supabase.');
})();
