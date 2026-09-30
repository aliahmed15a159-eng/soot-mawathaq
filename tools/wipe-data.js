'use strict';
/**
 * مسح البيانات التجريبية من Supabase (مع الاحتفاظ بالانتخابات والمرشحين)
 * التشغيل: node tools/wipe-data.js
 */
const { config } = require('../lib/config');
const H = { apikey: config.supabaseKey, Authorization: `Bearer ${config.supabaseKey}`, 'Content-Type': 'application/json' };
const TABLES = ['ballots', 'vote_tokens', 'reviews', 'voters', 'audit_log', 'provider_calls', 'otp_codes'];

(async () => {
  if (config.databaseMode !== 'supabase') { console.error('✗ مضبوط على وضع التجربة فقط'); process.exit(1); }
  console.log('\n𓂀 مسح البيانات التجريبية من Supabase\n' + '─'.repeat(50));
  for (const t of TABLES) {
    const res = await fetch(`${config.supabaseUrl}/rest/v1/${t}?id=gte.0`, { method: 'DELETE', headers: H });
    console.log(`  ${res.ok ? '✓' : '✗'} مُسح جدول ${t}${res.ok ? '' : ` (${res.status})`}`);
  }
  console.log('\n✅ تم — الانتخابات والمرشحون محفوظون، وباقي الجداول فاضية وجاهزة للاستخدام الرسمي.');
})();
