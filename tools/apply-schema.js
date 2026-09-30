'use strict';
/**
 * تنفيذ مخطط قاعدة البيانات على Supabase عن بُعد عبر Management API
 * يحتاج: SUPABASE_ACCESS_TOKEN (توكن إدارة يبدأ بـ sbp_) + SUPABASE_PROJECT_REF
 *
 * التشغيل:
 *   node tools/apply-schema.js            # ينفّذ supabase/schema.sql
 *   node tools/apply-schema.js --verify   # يتحقق فقط من الجداول الحالية
 *   node tools/apply-schema.js --drop     # يحذف كل جداول المنصة (حذر!)
 */
const fs = require('fs');
const path = require('path');
const { config } = require('../lib/config');

const API = 'https://api.supabase.com/v1';
const SCHEMA_FILE = path.join(__dirname, '..', 'supabase', 'schema.sql');
const TABLES = ['voters', 'elections', 'candidates', 'vote_tokens', 'ballots', 'reviews', 'audit_log'];

const token = process.env.SUPABASE_ACCESS_TOKEN || '';
const projectRef = config.projectRef || (config.supabaseUrl || '').replace(/^https?:\/\//, '').split('.')[0];

function die(msg) { console.error(`✗ ${msg}`); process.exit(1); }

async function mgmt(queryPath, body, method = 'POST') {
  const res = await fetch(`${API}/projects/${projectRef}/database/query`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: body }),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || res.statusText;
    throw new Error(`${res.status} — ${msg}`);
  }
  return data;
}

function splitStatements(sql) {
  const withoutComments = sql
    .split('\n')
    .filter((line) => !/^\s*--/.test(line))
    .join('\n');
  return withoutComments
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3 && !/^begin$/i.test(s) && !/^commit$/i.test(s));
}

function describe(stmt) {
  const t = stmt.replace(/\s+/g, ' ').slice(0, 78);
  return t.length === 78 ? `${t}…` : t;
}

(async () => {
  const args = process.argv.slice(2);
  const verifyOnly = args.includes('--verify');
  const drop = args.includes('--drop');

  console.log('\n𓂀 ربط «صوت موثّق» بقاعدة بيانات Supabase\n' + '─'.repeat(60));
  if (!token.startsWith('sbp_')) die('SUPABASE_ACCESS_TOKEN غير مضبوط أو غير صحيح (لازم يبدأ بـ sbp_) — من: supabase.com/dashboard/account/tokens');
  if (!projectRef) die('مش قادر أحدد رقم المشروع: ضع SUPABASE_PROJECT_REF أو SUPABASE_URL في .env');
  console.log(`▸ المشروع: ${projectRef}`);

  try {
    const projects = await (await fetch(`${API}/projects`, { headers: { Authorization: `Bearer ${token}` } })).json();
    const found = Array.isArray(projects) && projects.find((p) => p.id === projectRef || p.ref === projectRef);
    console.log(found ? `✓ المشروع موجود: ${found.name} (${found.region})` : '⚠️ المشروع مش ظاهر في قائمة حسابك — تأكد من الرقم');
  } catch (err) {
    console.log(`⚠️ تعذّر جلب قائمة المشاريع: ${err.message}`);
  }

  if (drop) {
    console.log('\n⚠️ حذف الجداول…');
    for (const t of TABLES) {
      await mgmt('', `drop table if exists public.${t} cascade;`).then(() => console.log(`  − حُذف ${t}`)).catch((e) => console.log(`  ! ${t}: ${e.message}`));
    }
  }

  if (!verifyOnly && !drop) {
    const sql = fs.readFileSync(SCHEMA_FILE, 'utf8');
    const statements = splitStatements(sql);
    console.log(`\n▸ تنفيذ ${statements.length} أمرًا من supabase/schema.sql\n`);
    let ok = 0; let failed = 0;
    for (const stmt of statements) {
      try {
        await mgmt('', stmt);
        ok++;
        console.log(`  ✓ ${describe(stmt)}`);
      } catch (err) {
        failed++;
        console.log(`  ✗ ${describe(stmt)}\n     ↳ ${err.message}`);
      }
    }
    console.log(`\n▸ النتيجة: ${ok} نجح · ${failed} فشل`);
    if (failed) console.log('  (الفشل غالبًا يعني أن الأمر نُفّذ قبل كده — آمن عادةً في التكرار)');
  }

  console.log('\n▸ التحقق من الجداول:');
  const rows = await mgmt('', `select table_name from information_schema.tables where table_schema = 'public' order by table_name;`);
  const existing = (rows || []).map((r) => r.table_name || r[0]);
  let missing = 0;
  for (const t of TABLES) {
    const has = existing.includes(t);
    if (!has) missing++;
    console.log(`  ${has ? '✓' : '✗'} ${t}`);
  }
  console.log(`  ${existing.includes('election_results') ? '✓' : '✗'} election_results (view)`);

  if (missing) {
    console.log('\n✗ فيه جداول ناقصة — أعد التنفيذ بعد مراجعة رسائل الفشل أعلاه.');
    process.exit(1);
  }
  console.log('\n✅ قاعدة البيانات جاهزة — شغّل: node tools/db-check.js');
})();
