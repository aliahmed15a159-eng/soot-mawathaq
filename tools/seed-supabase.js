'use strict';
/**
 * تعبئة Supabase ببيانات تجريبية (انتخابة + مرشحين) — اختياري،
 * ملاحظة: ملف supabase/schema.sql نفسه يزرع البيانات الافتراضية عند أول تنفيذ.
 * التشغيل: node tools/seed-supabase.js
 */
const { config } = require('../lib/config');

const DEFAULT_STUDENT_CANDIDATES = Object.freeze([
  Object.freeze({
    name: 'الطالب / أحمد كريم الشناوي',
    slogan: 'مرشح رئيس اتحاد الطلاب · رمز: القلم 🖊️',
    photo_url: '/candidates/c1.jpg',
    program: 'برنامج التحول الرقمي المدرسي ورعاية المبتكرين: إطلاق منصة رقمية لإدارة الأندية الطلابية، وتوفير معامل ابتكار مفتوحة ومسابقات هاكاثون تكنولوجية، وتأمين رعاية رسمية لمشاريع الطلاب الابتكارية.',
    sort: 1,
  }),
  Object.freeze({
    name: 'الطالب / يوسف حازم القاضي',
    slogan: 'مرشح نائب رئيس الاتحاد · رمز: الصقر 🦅',
    photo_url: '/candidates/c2.jpg',
    program: 'برنامج الدعم الأكاديمي وبنك المعرفة الطلابي: تأسيس مجموعات تقوية تفاعلية مجانية يديرها الطلاب المتفوقون، وتوفير بنك أسئلة رقمي تفاعلي، وبرامج تدريبية للاستعداد لاختبارات القدرات والمنح الدولية.',
    sort: 2,
  }),
  Object.freeze({
    name: 'الطالب / عبد الرحمن سامح فوزي',
    slogan: 'أمين لجنة الأنشطة والرياضة · رمز: الشعلة 🔥',
    photo_url: '/candidates/c3.jpg',
    program: 'برنامج تطوير الأنشطة الرياضية والمخيمات الكشفية: إحياء دوري المدارس لكرة القدم والشطرنج، وتوسيع معسكرات القيادة الطلابية والعمل التطوعي البيئي، وإبرام شراكات مع الأندية ومراكز الشباب.',
    sort: 3,
  }),
  Object.freeze({
    name: 'الطالب / زياد طارق الدسوقي',
    slogan: 'أمين لجنة الخدمات والشمول الطلابي · رمز: النخلة 🌴',
    photo_url: '/candidates/c4.jpg',
    program: 'برنامج الشمول الرقمي ودمج الطلاب ذوي الهمم: تهيئة كافة الأنشطة والمرافق المدرسية لدمج الطلاب ذوي القدرات الخاصة، وإطلاق صندوق مقترحات رقمي صوتي مباشر لتوصيل أصوات الطلاب للإدارات.',
    sort: 4,
  }),
]);

const LEGACY_STUDENT_CANDIDATE_NAMES = [
  'منة الله عبد الرحمن',
  'يوسف شاكر الحديدي',
  'حبيبة مراد سلامة',
  'كريم نشأت البدرى',
  'د. طارق عبد الرحمن المنشاوي',
  'المستشار كامل محمود الجندي',
  'د. سلمى حسن الشافعي',
  'م. عمرو نبيل السيوفي',
];

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
      title: 'انتخابات المكتب التنفيذي لاتحاد طلاب مدارس الجمهورية - دورة 2026/2027',
      description: 'مختبر ونموذج محاكاة تجريبي متقدم للاقتراع البيومتري السري لاختيار ممثلي اتحاد طلاب مدارس الجمهورية — دورة 2026 / 2027',
      type: 'single', state: 'open',
    }]);
    console.log('✓ أُنشئت انتخابة تجريبية');
  } else {
    console.log(`✓ يوجد ${elections.length} انتخابة بالفعل`);
  }

  const election = elections[0];
  const existing = await api('GET', 'candidates', null, `?election_id=eq.${election.id}&select=*&order=sort.asc`);
  const legacyRows = existing.filter((candidate) => LEGACY_STUDENT_CANDIDATE_NAMES.includes(candidate.name));
  if (legacyRows.length) {
    await Promise.all(legacyRows.map((candidate) => {
      const legacyIndex = LEGACY_STUDENT_CANDIDATE_NAMES.indexOf(candidate.name) % DEFAULT_STUDENT_CANDIDATES.length;
      const replacement = DEFAULT_STUDENT_CANDIDATES[legacyIndex];
      return api('PATCH', 'candidates', replacement, `?id=eq.${candidate.id}`);
    }));
    console.log(`✓ حُدّث ${legacyRows.length} مرشح قديم إلى بيانات المرشحين الطلاب`);
  } else if (existing.length) {
    console.log(`✓ يوجد ${existing.length} مرشح حديث بالفعل — تم التخطي`);
  } else {
    const rows = DEFAULT_STUDENT_CANDIDATES.map((candidate) => ({ ...candidate, election_id: election.id }));
    await api('POST', 'candidates', rows);
    console.log('✓ أُضيف 4 مرشحين طلاب');
  }
  console.log('\nتم ✓ — المنصة جاهزة للاستخدام مع قاعدة بيانات Supabase.');
})();
