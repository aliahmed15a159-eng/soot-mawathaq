-- جدول حسابات المديرين (لوحة الإدارة)
CREATE TABLE IF NOT EXISTS admins (
  id bigserial PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT 'مسؤول المنصة',
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'super_admin',
  active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(lower(email));
