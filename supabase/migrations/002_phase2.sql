-- ============================================================================
--  صوت موثّق — ترقية المرحلة ٢
--  شغّل هذا الملف في: Supabase Dashboard → SQL Editor → New query → Run
--  آمن للتشغيل أكثر من مرة (idempotent)
-- ============================================================================

-- (١) كشف الناخبين المعتمد — أساس الوضع الصارم (لا يصوّت إلا من في الكشف)
create table if not exists public.voter_roll (
  id                 bigint generated always as identity primary key,
  identity_hash      text        not null unique,   -- بصمة الرقم القومي (SHA-256 + ملح) — لا الرقم نفسه
  full_name          text        not null,
  national_id_masked text,
  birth_date         date,
  governorate        text,
  status             text        not null default 'approved',  -- approved | suspended
  source             text,                                     -- اسم الملف / الجهة
  imported_at        timestamptz not null default now()
);
create index if not exists voter_roll_status_idx on public.voter_roll (status);
alter table public.voter_roll enable row level security;   -- لا وصول للجمهور (الخادم فقط)

-- (٢) سجل استدعاءات المزوّدين الخارجيين (تدقيق + متابعة تكلفة وزمن الاستجابة)
create table if not exists public.provider_calls (
  id          bigint generated always as identity primary key,
  provider    text        not null,          -- facepp | rekognition | azure | ocrspace | google | azure-read
  operation   text        not null,          -- compare_faces | ocr_read | liveness ...
  voter_id    bigint      references public.voters(id) on delete set null,
  duration_ms int,
  ok          boolean     not null default true,
  score       numeric(6,4),
  error       text,
  created_at  timestamptz not null default now()
);
create index if not exists provider_calls_created_idx on public.provider_calls (created_at desc);
alter table public.provider_calls enable row level security;

-- (٣) أعمدة إضافية على الناخب (كلها اختيارية — الكود يعمل بدونها)
alter table public.voters add column if not exists otp_verified_at timestamptz;
alter table public.voters add column if not exists face_provider    text;
alter table public.voters add column if not exists ocr_score        numeric(5,4);
alter table public.voters add column if not exists liveness_score   numeric(5,4);
alter table public.voters add column if not exists in_roll          boolean;

-- (٤) أعمدة على طلبات المراجعة (لتفاصيل المزوّدين داخل الطلب)
alter table public.reviews add column if not exists face_provider text;
alter table public.reviews add column if not exists face_score    numeric(6,4);
alter table public.reviews add column if not exists ocr_score     numeric(6,4);
alter table public.reviews add column if not exists liveness_score numeric(6,4);

-- (٥) كود OTP (للتشغيل على أكثر من نسخة/سيرفر — البديل الدائم لذاكرة الخادم)
create table if not exists public.otp_codes (
  id           bigint generated always as identity primary key,
  phone_hash   text        not null,          -- بصمة الرقم (لا نخزّن الرقم صريحًا)
  code_hash    text        not null,          -- بصمة الكود
  purpose      text        not null default 'register',
  attempts     int         not null default 0,
  provider     text,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  consumed_at  timestamptz
);
create index if not exists otp_lookup_idx on public.otp_codes (phone_hash, purpose, consumed_at);
alter table public.otp_codes enable row level security;

-- تم ✓  (بعد التنفيذ: node tools/db-check.js --write للتأكد)
