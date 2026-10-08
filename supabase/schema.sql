-- ============================================================================
--  صوت موثّق — مخطط قاعدة البيانات على Supabase (PostgreSQL)
--  شغّل هذا الملف في: Supabase Dashboard → SQL Editor → New query → Run
--  ملاحظة تصميمية: جدول الأصوات (ballots) لا يحتوي أي عمود يربطه بهوية الناخب،
--  وجدول رموز الاقتراع (vote_tokens) هو الوحيد الذي يعرف «مين استلم رمزًا» —
--  وفصل الجدولين هو ما يضمن الاقتراع السري مع منع التصويت المكرر في نفس الوقت.
-- ============================================================================

-- (١) الناخبون — بيانات الهوية مُجزَّأة ولا تُخزَّن أرقام قومية كنص صريح
create table if not exists public.voters (
  id                 bigint generated always as identity primary key,
  full_name          text        not null,
  identity_hash      text        not null unique,          -- SHA-256(ملح + الرقم القومي)
  national_id_masked text        not null,                 -- ********1234 للعرض فقط
  birth_date         date        not null,
  governorate        text        not null,
  gender             text,
  phone_masked       text,
  verified           boolean     not null default false,
  verified_at        timestamptz,
  verify_score       numeric(4,3),
  verified_by        text,                                 -- system | committee
  consent_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz
);
create index if not exists voters_verified_idx on public.voters (verified);

-- (٢) الانتخابات
create table if not exists public.elections (
  id          bigint generated always as identity primary key,
  title       text        not null,
  description text,
  type        text        not null default 'single',        -- single | multi
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz not null default (now() + interval '7 days'),
  state       text        not null default 'open',          -- draft | open | closed
  created_at  timestamptz not null default now()
);
create index if not exists elections_state_idx on public.elections (state);

-- (٣) المرشحون
create table if not exists public.candidates (
  id          bigint generated always as identity primary key,
  election_id bigint not null references public.elections(id) on delete cascade,
  name        text   not null,
  slogan      text,
  program     text,
  photo_url   text,
  sort        int    not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists candidates_election_idx on public.candidates (election_id, sort);

-- (٤) رموز الاقتراع — «مين استلم رمز» بدون أي رابط بالاختيار
create table if not exists public.vote_tokens (
  id           bigint generated always as identity primary key,
  voter_id     bigint      not null references public.voters(id) on delete cascade,
  election_id  bigint      references public.elections(id) on delete cascade,
  token_hash   text        not null unique,                 -- SHA-256 للرمز (الرمز نفسه لا يُخزَّن)
  issued_at    timestamptz not null default now(),
  expires_at   timestamptz not null,
  used_at      timestamptz                                  -- null = لم يُستخدم بعد
);
create index if not exists tokens_lookup_idx on public.vote_tokens (voter_id, election_id, used_at);

-- قاعدة صارمة: رمز واحد مستخدم لكل ناخب في الانتخابة نفسها
create unique index if not exists one_used_token_per_voter
  on public.vote_tokens (voter_id, election_id)
  where used_at is not null;

-- (٥) الأصوات — لا يوجد أي عمود للناخب (سرية كاملة)
create table if not exists public.ballots (
  id           bigint generated always as identity primary key,
  election_id  bigint      not null references public.elections(id) on delete cascade,
  candidate_id bigint      not null references public.candidates(id) on delete restrict,
  receipt_code text        not null unique,                 -- إيصال للناخب يثبت الاحتساب بدون كشف الاختيار
  cast_at      timestamptz not null default now()
);
create index if not exists ballots_election_idx on public.ballots (election_id, candidate_id);

-- (٦) طلبات المراجعة البشرية (الحالات المشكوك فيها)
create table if not exists public.reviews (
  id           bigint generated always as identity primary key,
  voter_id     bigint      not null references public.voters(id) on delete cascade,
  election_id  bigint      references public.elections(id) on delete set null,
  status       text        not null default 'pending',      -- pending | approved | rejected
  score        numeric(4,3),
  checks       jsonb,
  reasons      jsonb,
  card_image   text,                                        -- اسم ملف مؤقت فقط (يُحذف بعد القرار)
  selfie_image text,
  decided_by   text,
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  claimed_at   timestamptz,
  expires_at   timestamptz
);
create index if not exists reviews_status_idx on public.reviews (status, created_at);

-- (٧) سجل التدقيق — كل قرار حساس يُسجَّل بمين وإمتى وإيه
create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  action     text        not null,
  actor      text,
  meta       jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_created_idx on public.audit_log (created_at desc);

-- ============================================================================
--  العرض التجميعي للنتائج (قراءة فقط — لا يكشف أي هوية)
-- ============================================================================
create or replace view public.election_results as
select c.election_id,
       c.id                              as candidate_id,
       c.name                            as candidate_name,
       count(b.id)                       as votes
from public.candidates c
left join public.ballots b on b.candidate_id = c.id
group by c.election_id, c.id, c.name
order by c.election_id, votes desc;

-- ============================================================================
--  قفل الجداول أمام الواجهة العامة (RLS) — الخادم فقط يستخدم service_role
--  أي محاولة قراءة من المتصفح بمفتاح anon ستُرفض.
-- ============================================================================
alter table public.voters       enable row level security;
alter table public.elections    enable row level security;
alter table public.candidates   enable row level security;
alter table public.vote_tokens  enable row level security;
alter table public.ballots      enable row level security;
alter table public.reviews      enable row level security;
alter table public.audit_log    enable row level security;

-- قراءة عامة للانتخابات والمرشحين فقط (بدون أي بيانات ناخبين)
drop policy if exists "public read elections" on public.elections;
create policy "public read elections" on public.elections for select using (true);

drop policy if exists "public read candidates" on public.candidates;
create policy "public read candidates" on public.candidates for select using (true);

drop policy if exists "public read results" on public.ballots;
create policy "public read results" on public.ballots for select using (false);  -- النتائج تُقرأ من الخادم فقط

-- باقي الجداول: لا سياسات = لا وصول للجمهور (الخادم يمرّ بـ service_role)

-- ============================================================================
--  بيانات محاكاة لانتخابات اتحاد طلاب المدارس
--  أسماء المرشحين وبرامجهم افتراضية بالكامل وليست بيانات ترشّح فعلية.
-- ============================================================================

-- ترقية استحقاقات المحاكاة القديمة إلى انتخابات المدارس فقط إذا لم تُسجّل أصوات.
-- إذا كان هناك اقتراع سابق، نحتفظ به كما هو وننشئ استحقاقًا جديدًا أدناه.
update public.elections as e
set title = 'انتخابات اتحاد طلاب المدارس — دورة 2026/2027',
    description = 'نموذج محاكاة لانتخابات اتحاد طلاب المدارس. أسماء المرشحين وبرامجهم افتراضية بالكامل لأغراض العرض والتجربة.',
    type = 'single'
where e.title in (
  'انتخابات المكتب التنفيذي لاتحاد طلاب مدارس الجمهورية - دورة 2026/2027',
  'انتخابات اتحاد طلاب مدارس الجمهورية (2026/2027)',
  'انتخابات اتحاد طلاب كلية الحاسبات والمعلومات'
)
  and not exists (
    select 1 from public.elections current_election
    where current_election.title = 'انتخابات اتحاد طلاب المدارس — دورة 2026/2027'
      and current_election.id <> e.id
  )
  and not exists (select 1 from public.ballots b where b.election_id = e.id);

insert into public.elections (title, description, type, state)
select 'انتخابات اتحاد طلاب المدارس — دورة 2026/2027',
       'نموذج محاكاة لانتخابات اتحاد طلاب المدارس. أسماء المرشحين وبرامجهم افتراضية بالكامل لأغراض العرض والتجربة.',
       'single', 'open'
where not exists (
  select 1 from public.elections
  where title = 'انتخابات اتحاد طلاب المدارس — دورة 2026/2027'
);

-- حدّث سجلات المرشحين التجريبية المعروفة فقط، ولا تغيّر أسماء مرتبطة بأصوات مسجّلة.
update public.candidates as c
set name = v.name,
    slogan = v.slogan,
    program = v.program,
    photo_url = v.photo_url,
    sort = v.sort
from (values
  ('منة الله عبد الرحمن', 'الطالب / آدم شريف عبد الله', 'مرشح رئيس اتحاد طلاب المدرسة · رمز: الكتاب 📘', 'برنامج «صوت الفصل»: لقاء شهري مفتوح بين الطلاب وإدارة المدرسة، وصندوق مقترحات واضح مع متابعة معلنة لما تم تنفيذه.', '/candidates/c1.jpg', 1),
  ('يوسف شاكر الحديدي', 'الطالب / سليم أحمد بركات', 'مرشح نائب رئيس اتحاد طلاب المدرسة · رمز: الشمس ☀️', 'برنامج «زميل يساند زميل»: مجموعات دعم دراسي يقودها الطلاب، وجدول مراجعة مشترك، ومكتبة لتبادل الكتب والأدوات المدرسية.', '/candidates/c2.jpg', 2),
  ('حبيبة مراد سلامة', 'الطالب / كريم خالد فؤاد', 'مرشح أمين اللجنة الثقافية والعلمية · رمز: الشعلة 🔥', 'برنامج الثقافة والعلوم: نادي قراءة ومسرح مدرسي، ومعرض علوم سنوي، ومسابقات عملية تتيح المشاركة لجميع الصفوف.', '/candidates/c3.jpg', 3),
  ('كريم نشأت البدرى', 'الطالب / أحمد منصور', 'مرشح أمين اللجنة الاجتماعية والرياضية · رمز: النخلة 🌴', 'برنامج النشاط للجميع: دوري رياضي مدرسي، وأيام تطوع ورحلات تعليمية، مع تهيئة الأنشطة لمشاركة الطلاب ذوي الإعاقة.', '/candidates/c4.jpg', 4),
  ('الطالب / أحمد كريم الشناوي', 'الطالب / آدم شريف عبد الله', 'مرشح رئيس اتحاد طلاب المدرسة · رمز: الكتاب 📘', 'برنامج «صوت الفصل»: لقاء شهري مفتوح بين الطلاب وإدارة المدرسة، وصندوق مقترحات واضح مع متابعة معلنة لما تم تنفيذه.', '/candidates/c1.jpg', 1),
  ('الطالب / يوسف حازم القاضي', 'الطالب / سليم أحمد بركات', 'مرشح نائب رئيس اتحاد طلاب المدرسة · رمز: الشمس ☀️', 'برنامج «زميل يساند زميل»: مجموعات دعم دراسي يقودها الطلاب، وجدول مراجعة مشترك، ومكتبة لتبادل الكتب والأدوات المدرسية.', '/candidates/c2.jpg', 2),
  ('الطالب / عبد الرحمن سامح فوزي', 'الطالب / كريم خالد فؤاد', 'مرشح أمين اللجنة الثقافية والعلمية · رمز: الشعلة 🔥', 'برنامج الثقافة والعلوم: نادي قراءة ومسرح مدرسي، ومعرض علوم سنوي، ومسابقات عملية تتيح المشاركة لجميع الصفوف.', '/candidates/c3.jpg', 3),
  ('الطالب / زياد طارق الدسوقي', 'الطالب / أحمد منصور', 'مرشح أمين اللجنة الاجتماعية والرياضية · رمز: النخلة 🌴', 'برنامج النشاط للجميع: دوري رياضي مدرسي، وأيام تطوع ورحلات تعليمية، مع تهيئة الأنشطة لمشاركة الطلاب ذوي الإعاقة.', '/candidates/c4.jpg', 4),
  ('أحمد كريم الشناوي', 'الطالب / آدم شريف عبد الله', 'مرشح رئيس اتحاد طلاب المدرسة · رمز: الكتاب 📘', 'برنامج «صوت الفصل»: لقاء شهري مفتوح بين الطلاب وإدارة المدرسة، وصندوق مقترحات واضح مع متابعة معلنة لما تم تنفيذه.', '/candidates/c1.jpg', 1),
  ('يوسف حازم القاضي', 'الطالب / سليم أحمد بركات', 'مرشح نائب رئيس اتحاد طلاب المدرسة · رمز: الشمس ☀️', 'برنامج «زميل يساند زميل»: مجموعات دعم دراسي يقودها الطلاب، وجدول مراجعة مشترك، ومكتبة لتبادل الكتب والأدوات المدرسية.', '/candidates/c2.jpg', 2),
  ('عبد الرحمن سامح فوزي', 'الطالب / كريم خالد فؤاد', 'مرشح أمين اللجنة الثقافية والعلمية · رمز: الشعلة 🔥', 'برنامج الثقافة والعلوم: نادي قراءة ومسرح مدرسي، ومعرض علوم سنوي، ومسابقات عملية تتيح المشاركة لجميع الصفوف.', '/candidates/c3.jpg', 3),
  ('زياد طارق الدسوقي', 'الطالب / أحمد منصور', 'مرشح أمين اللجنة الاجتماعية والرياضية · رمز: النخلة 🌴', 'برنامج النشاط للجميع: دوري رياضي مدرسي، وأيام تطوع ورحلات تعليمية، مع تهيئة الأنشطة لمشاركة الطلاب ذوي الإعاقة.', '/candidates/c4.jpg', 4)
) as v(old_name, name, slogan, program, photo_url, sort)
where c.name = v.old_name
  and not exists (select 1 from public.ballots b where b.election_id = c.election_id);

-- أضف القائمة الافتراضية فقط إذا كان استحقاق المدارس بلا مرشحين.
insert into public.candidates (election_id, name, slogan, program, photo_url, sort)
select e.id, v.name, v.slogan, v.program, v.photo_url, v.sort
from public.elections e
cross join (values
  ('الطالب / آدم شريف عبد الله', 'مرشح رئيس اتحاد طلاب المدرسة · رمز: الكتاب 📘', 'برنامج «صوت الفصل»: لقاء شهري مفتوح بين الطلاب وإدارة المدرسة، وصندوق مقترحات واضح مع متابعة معلنة لما تم تنفيذه.', '/candidates/c1.jpg', 1),
  ('الطالب / سليم أحمد بركات', 'مرشح نائب رئيس اتحاد طلاب المدرسة · رمز: الشمس ☀️', 'برنامج «زميل يساند زميل»: مجموعات دعم دراسي يقودها الطلاب، وجدول مراجعة مشترك، ومكتبة لتبادل الكتب والأدوات المدرسية.', '/candidates/c2.jpg', 2),
  ('الطالب / كريم خالد فؤاد', 'مرشح أمين اللجنة الثقافية والعلمية · رمز: الشعلة 🔥', 'برنامج الثقافة والعلوم: نادي قراءة ومسرح مدرسي، ومعرض علوم سنوي، ومسابقات عملية تتيح المشاركة لجميع الصفوف.', '/candidates/c3.jpg', 3),
  ('الطالب / أحمد منصور', 'مرشح أمين اللجنة الاجتماعية والرياضية · رمز: النخلة 🌴', 'برنامج النشاط للجميع: دوري رياضي مدرسي، وأيام تطوع ورحلات تعليمية، مع تهيئة الأنشطة لمشاركة الطلاب ذوي الإعاقة.', '/candidates/c4.jpg', 4)
) as v(name, slogan, program, photo_url, sort)
where e.title = 'انتخابات اتحاد طلاب المدارس — دورة 2026/2027'
  and not exists (select 1 from public.candidates c where c.election_id = e.id);
