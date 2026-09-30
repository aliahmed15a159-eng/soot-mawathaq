'use strict';
/**
 * المسار البديل (بدون توكن إدارة): تنفيذ السكيما عبر اتصال PostgreSQL مباشر
 * يحتاج فقط: DATABASE_URL (Connection string من: Settings → Database → Connection string → URI)
 *
 * التشغيل:
 *   npm i pg --no-save          # مرة واحدة (أداة تطوير فقط)
 *   node tools/pg-apply.js                    # ينفّذ supabase/schema.sql
 *   node tools/pg-apply.js --all              # السكيما + كل ملفات الترقية بالترتيب (schema + migrations)
 *   node tools/pg-apply.js --file=supabase/migrations/002_phase2.sql
 *   node tools/pg-apply.js --verify           # يتحقق من الجداول فقط
 *   node tools/pg-apply.js --drop             # يحذف جداول المنصة
 *
 * ملاحظة: DATABASE_URL لازم يكون رابط الـ Pooler (منفذ 6543/5432) لأن الاتصال المباشر db.<ref> غير متاح من الشبكات الخارجية.
 */
const fs = require('fs');
const path = require('path');
require('../lib/config');

const SCHEMA_FILE = path.join(__dirname, '..', 'supabase', 'schema.sql');
const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');
const TABLES = ['voters', 'elections', 'candidates', 'vote_tokens', 'ballots', 'reviews', 'audit_log',
  'voter_roll', 'provider_calls', 'otp_codes'];
const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';

let pg;
try { pg = require('pg'); } catch {
  console.error('✗ مكتبة pg غير مثبتة. شغّل أولًا:  npm i pg --no-save');
  process.exit(1);
}

function splitStatements(sql) {
  return sql.split('\n').filter((l) => !/^\s*--/.test(l)).join('\n')
    .split(/;\s*(?:\n|$)/).map((s) => s.trim())
    .filter((s) => s.length > 3 && !/^begin$/i.test(s) && !/^commit$/i.test(s));
}

(async () => {
  if (!url) {
    console.error('✗ ضع DATABASE_URL في .env (من: Settings → Database → Connection string → URI)');
    process.exit(1);
  }
  const args = process.argv.slice(2);
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('\n𓂀 تنفيذ السكيما مباشرة على PostgreSQL\n' + '─'.repeat(58));
  const { rows } = await client.query('select current_database() db, version() v');
  console.log(`▸ متصل بقاعدة: ${rows[0].db} — ${String(rows[0].v).slice(0, 40)}…`);

  if (args.includes('--drop')) {
    for (const t of TABLES) {
      await client.query(`drop table if exists public.${t} cascade`).then(() => console.log(`  − حُذف ${t}`)).catch((e) => console.log(`  ! ${t}: ${e.message}`));
    }
  }

  async function runFile(file) {
    const statements = splitStatements(fs.readFileSync(file, 'utf8'));
    console.log(`\n▸ تنفيذ ${path.relative(path.join(__dirname, '..'), file)} — ${statements.length} أمرًا…\n`);
    let ok = 0; let failed = 0;
    for (const stmt of statements) {
      try {
        await client.query(stmt);
        ok++;
        console.log(`  ✓ ${stmt.replace(/\s+/g, ' ').slice(0, 74)}`);
      } catch (err) {
        failed++;
        console.log(`  ✗ ${stmt.replace(/\s+/g, ' ').slice(0, 60)}\n     ↳ ${err.message}`);
      }
    }
    console.log(`\n▸ النتيجة: ${ok} نجح · ${failed} فشل (الفشل المتكرر غالبًا يعني أن الأمر نُفّذ قبل كده)`);
    return failed;
  }

  if (!args.includes('--verify') && !args.includes('--drop')) {
    const fileArg = args.find((a) => a.startsWith('--file='));
    if (fileArg) {
      await runFile(path.resolve(process.cwd(), fileArg.split('=')[1]));
    } else {
      await runFile(SCHEMA_FILE);
      if (args.includes('--all') && fs.existsSync(MIGRATIONS_DIR)) {
        const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
        for (const f of files) await runFile(path.join(MIGRATIONS_DIR, f));
      }
    }
  }

  console.log('\n▸ الجداول:');
  const t = await client.query("select table_name from information_schema.tables where table_schema='public' order by 1");
  const existing = t.rows.map((r) => r.table_name);
  let missing = 0;
  TABLES.forEach((name) => { const has = existing.includes(name); if (!has) missing++; console.log(`  ${has ? '✓' : '✗'} ${name}`); });
  await client.end();
  if (missing) { console.log('\n✗ فيه جداول ناقصة'); process.exit(1); }
  console.log('\n✅ قاعدة البيانات جاهزة — شغّل: node tools/db-check.js');
})();
