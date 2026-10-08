'use strict';

/**
 * بيانات محاكاة موحّدة لانتخابات اتحاد طلاب المدارس.
 * الأسماء والبرامج افتراضية بالكامل وليست بيانات ترشّح فعلية.
 */
const DEMO_SCHOOL_ELECTION = Object.freeze({
  title: 'انتخابات اتحاد طلاب المدارس — دورة 2026/2027',
  description: 'نموذج محاكاة لانتخابات اتحاد طلاب المدارس. أسماء المرشحين وبرامجهم افتراضية بالكامل لأغراض العرض والتجربة.',
  type: 'single',
});

const DEFAULT_STUDENT_CANDIDATES = Object.freeze([
  Object.freeze({
    id: 1,
    name: 'الطالب / آدم شريف عبد الله',
    title: 'مرشح رئيس اتحاد طلاب المدرسة',
    role: 'مرشح رئيس اتحاد طلاب المدرسة',
    symbol: 'الكتاب 📘',
    slogan: 'مرشح رئيس اتحاد طلاب المدرسة · رمز: الكتاب 📘',
    photo_url: '/candidates/c1.jpg',
    program: 'برنامج «صوت الفصل»: لقاء شهري مفتوح بين الطلاب وإدارة المدرسة، وصندوق مقترحات واضح مع متابعة معلنة لما تم تنفيذه.',
    sort: 1,
  }),
  Object.freeze({
    id: 2,
    name: 'الطالب / سليم أحمد بركات',
    title: 'مرشح نائب رئيس اتحاد طلاب المدرسة',
    role: 'مرشح نائب رئيس اتحاد طلاب المدرسة',
    symbol: 'الشمس ☀️',
    slogan: 'مرشح نائب رئيس اتحاد طلاب المدرسة · رمز: الشمس ☀️',
    photo_url: '/candidates/c2.jpg',
    program: 'برنامج «زميل يساند زميل»: مجموعات دعم دراسي يقودها الطلاب، وجدول مراجعة مشترك، ومكتبة لتبادل الكتب والأدوات المدرسية.',
    sort: 2,
  }),
  Object.freeze({
    id: 3,
    name: 'الطالب / كريم خالد فؤاد',
    title: 'مرشح أمين اللجنة الثقافية والعلمية',
    role: 'مرشح أمين اللجنة الثقافية والعلمية',
    symbol: 'الشعلة 🔥',
    slogan: 'مرشح أمين اللجنة الثقافية والعلمية · رمز: الشعلة 🔥',
    photo_url: '/candidates/c3.jpg',
    program: 'برنامج الثقافة والعلوم: نادي قراءة ومسرح مدرسي، ومعرض علوم سنوي، ومسابقات عملية تتيح المشاركة لجميع الصفوف.',
    sort: 3,
  }),
  Object.freeze({
    id: 4,
    name: 'الطالب / أحمد منصور',
    title: 'مرشح أمين اللجنة الاجتماعية والرياضية',
    role: 'مرشح أمين اللجنة الاجتماعية والرياضية',
    symbol: 'النخلة 🌴',
    slogan: 'مرشح أمين اللجنة الاجتماعية والرياضية · رمز: النخلة 🌴',
    photo_url: '/candidates/c4.jpg',
    program: 'برنامج النشاط للجميع: دوري رياضي مدرسي، وأيام تطوع ورحلات تعليمية، مع تهيئة الأنشطة لمشاركة الطلاب ذوي الإعاقة.',
    sort: 4,
  }),
]);

// أسماء البيانات التجريبية السابقة التي قد تبقى في قاعدة محلية أو مستضافة.
const LEGACY_STUDENT_CANDIDATE_NAMES = new Set([
  'منة الله عبد الرحمن',
  'يوسف شاكر الحديدي',
  'حبيبة مراد سلامة',
  'كريم نشأت البدرى',
  'الطالب / أحمد كريم الشناوي',
  'الطالب / يوسف حازم القاضي',
  'الطالب / عبد الرحمن سامح فوزي',
  'الطالب / زياد طارق الدسوقي',
  'أحمد كريم الشناوي',
  'يوسف حازم القاضي',
  'عبد الرحمن سامح فوزي',
  'زياد طارق الدسوقي',
]);

const LEGACY_SCHOOL_ELECTION_TITLES = Object.freeze([
  'انتخابات المكتب التنفيذي لاتحاد طلاب مدارس الجمهورية - دورة 2026/2027',
  'انتخابات اتحاد طلاب مدارس الجمهورية (2026/2027)',
  'انتخابات اتحاد طلاب كلية الحاسبات والمعلومات',
]);

function candidatesOrDefaults(candidates, electionId) {
  const rows = Array.isArray(candidates) ? candidates : [];
  const mergeCandidate = (candidate, current = {}) => ({
    ...current,
    ...candidate,
    id: current.id !== undefined && current.id !== null ? current.id : candidate.id,
    election_id: current.election_id !== undefined && current.election_id !== null ? current.election_id : electionId,
  });

  // لا نستبدل مرشحين قد يكون لهم أصوات مسجلة عند العرض. ترحيل بيانات المحاكاة
  // يتم صراحةً في قاعدة البيانات فقط، مع الحفاظ على نتائج أي اقتراع قائم.
  if (rows.length) {
    return rows.map((current) => {
      const candidate = DEFAULT_STUDENT_CANDIDATES.find((item) => item.name === current.name);
      return candidate ? mergeCandidate(candidate, current) : current;
    });
  }

  return DEFAULT_STUDENT_CANDIDATES.map((candidate) => mergeCandidate(candidate));
}

module.exports = {
  DEMO_SCHOOL_ELECTION,
  DEFAULT_STUDENT_CANDIDATES,
  LEGACY_STUDENT_CANDIDATE_NAMES,
  LEGACY_SCHOOL_ELECTION_TITLES,
  candidatesOrDefaults,
};
