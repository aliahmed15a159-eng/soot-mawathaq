'use strict';
/**
 * إعدادات المنصة — تُقرأ من متغيرات البيئة (.env)
 * لو مفاتيح Supabase غير موجودة، المنصة تشتغل تلقائيًا في «وضع التجربة» بقاعدة بيانات محلية.
 */

/** قيمة نصية نظيفة من البيئة: بدون تعليقات (#) ولا مسافات زائدة ولا علامات تنصيص */
function envText(name, fallback = '') {
  const raw = String(process.env[name] === undefined ? fallback : process.env[name]);
  return raw.split('#')[0].trim().replace(/^["']|["']$/g, '');
}

function loadDotEnv() {
  const fs = require('fs');
  const path = require('path');
  const file = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadDotEnv();

const env = process.env;
const SUPABASE_URL = (env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || '';

const parsedPort = (n, d) => { const v = parseInt(envText(n, String(d)), 10); return Number.isFinite(v) && v > 0 ? v : d; };

const config = {
  port: parsedPort('PORT', 3000),
  host: env.HOST || '0.0.0.0',
  publicUrl: env.PUBLIC_URL || '',

  // قاعدة البيانات
  supabaseUrl: SUPABASE_URL,
  supabaseKey: SUPABASE_KEY,
  supabaseSchema: env.SUPABASE_SCHEMA || 'public',
  projectRef: env.SUPABASE_PROJECT_REF || '',
  databaseMode: SUPABASE_URL && SUPABASE_KEY ? 'supabase' : 'demo',

  // أمان الجلسات
  sessionSecret: env.SESSION_SECRET || 'pharaoh-dev-secret-change-me',
  sessionTtlMinutes: parseInt(env.SESSION_TTL_MINUTES || '45', 10),
  tokenTtlMinutes: parseInt(env.TOKEN_TTL_MINUTES || '15', 10),

  // لجنة الإدارة (دخول بالبريد وكلمة المرور أو مفتاح الإدارة)
  adminEmail: envText('ADMIN_EMAIL', 'aliahmed055586@gmail.com'),
  adminPassword: envText('ADMIN_PASSWORD', '01556377146'),
  adminKey: env.ADMIN_KEY || 'per-aa-admin',

  // عتبات التحقق (منطقة رمادية = مراجعة بشرية)
  thresholds: {
    faceAccept: parseFloat(env.FACE_ACCEPT || '0.72'),
    faceReview: parseFloat(env.FACE_REVIEW || '0.50'),
    ocrAccept: parseFloat(env.OCR_ACCEPT || '0.62'),
    qualityAccept: parseFloat(env.QUALITY_ACCEPT || '0.35'),
  },

  // كشف الناخبين: strict = لا بد أن يكون في الكشف | open = يقبل أي رقم قومي صحيح (للتجربة)
  registerMode: envText('REGISTER_MODE', 'open').toLowerCase() === 'strict' ? 'strict' : 'open',

  // ملف قاعدة بيانات وضع التجربة (يقبل مسارًا مخصّصًا للاختبارات)
  demoDbFile: env.DEMO_DB_FILE || '',

  // تخزين صور المراجعة (الحالات المشكوك فيها فقط، وتُحذف بعد قرار اللجنة أو 24 ساعة)
  reviewRetentionHours: parseInt(env.REVIEW_RETENTION_HOURS || '24', 10),

  // بيانات وصفية
  appName: 'صوت موثّق',
  appTagline: 'منصة انتخابات إلكترونية — لا تُحسب فيها إلا هوية واحدة حقيقية',
};

module.exports = { config };
