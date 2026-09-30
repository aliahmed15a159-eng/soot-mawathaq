-- المرحلة الثانية (تحديث البطاقات المسجّلة في قاعدة البيانات)
ALTER TABLE voter_roll
  ADD COLUMN IF NOT EXISTS national_id_plain text,
  ADD COLUMN IF NOT EXISTS card_image text,
  ADD COLUMN IF NOT EXISTS face_image text,
  ADD COLUMN IF NOT EXISTS face_hash text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS gender text DEFAULT 'ذكر';
