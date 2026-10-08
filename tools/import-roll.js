'use strict';
/**
 * استيراد كشف الناخبين مباشرة إلى قاعدة البيانات (بدون الحاجة لدخول لوحة الإدارة)
 *
 * التشغيل:
 *   node tools/import-roll.js data/rolls/example.csv          # استيراد ملف CSV
 *   node tools/import-roll.js data/rolls/example.csv --dry    # تجربة بدون كتابة
 *   node tools/import-roll.js --template > my-roll.csv        # طباعة قالب جاهز لتعبئته
 *
 * صيغة الملف: سطر لكل ناخب — «الرقم القومي، الاسم» (فاصلة أو تاب أو فاصلة منقوطة).
 * يقبل أعمدة إضافية (المحافظة/التاريخ) ويتجاهلها، ويقبل صف العنوان «الرقم القومي,الاسم».
 * ملاحظة: يُخزَّن الرقم القومي كبصمة (SHA-256 + سرّ الجلسة) — لا يُحفظ الرقم صريحًا.
 */
const fs = require('fs');
const path = require('path');
const { config } = require('../lib/config');
const { db } = require('../lib/db');
const sec = require('../lib/security');

const TEMPLATE = '\ufeff' + `الرقم القومي,الاسم
30804150102345,عمر خالد إبراهيم حسن
30907152101234,يوسف محمود عبد الرحمن
`;

function parseCsv(csv) {
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows = []; const bad = [];
  for (const line of lines) {
    const parts = line.split(/[,\t;]/).map((p) => p.trim().replace(/^"|"$/g, ''));
    const nidPart = parts.find((p) => sec.normalizeDigits(p).length === 14);
    if (!nidPart) {
      if (!/رقم|الاسم|national|name/i.test(line)) bad.push(line.slice(0, 50));
      continue;
    }
    const nid = sec.normalizeDigits(nidPart);
    const parsed = sec.parseNationalId(nid);
    if (!parsed.ok) { bad.push(`${nidPart} (${parsed.error})`); continue; }
    const name = parts.filter((p) => p !== nidPart).join(' ').replace(/\s+/g, ' ').trim() || '(بدون اسم)';
    rows.push({
      identity_hash: sec.identityFingerprint(nid),
      full_name: name,
      governorate: parsed.governorate,
      birth_date: parsed.birthDate,
      national_id_masked: `********${nid.slice(-4)}`,
      source: 'import-roll.js',
    });
  }
  return { rows, bad };
}

(async () => {
  const args = process.argv.slice(2);
  if (args.includes('--template')) { process.stdout.write(TEMPLATE); return; }

  const file = args.find((a) => !a.startsWith('--'));
  if (!file) {
    console.error('✗ حدّد ملف CSV:  node tools/import-roll.js data/rolls/example.csv');
    console.error('  أو اطبع قالبًا جاهزًا:  node tools/import-roll.js --template > my-roll.csv');
    process.exit(1);
  }
  if (!fs.existsSync(file)) { console.error(`✗ الملف غير موجود: ${file}`); process.exit(1); }

  const { rows, bad } = parseCsv(fs.readFileSync(file, 'utf8'));
  console.log(`\n𓂀 استيراد كشف الناخبين\n${'─'.repeat(58)}`);
  console.log(`▸ الوضع: ${db.mode}${config.demoDbFile ? ` (ملف: ${config.demoDbFile})` : ''}`);
  console.log(`▸ صفوف صحيحة: ${rows.length}${bad.length ? ` · صفوف مرفوضة: ${bad.length}` : ''}`);
  if (bad.length) console.log(`  ↳ أمثلة مرفوضة: ${bad.slice(0, 5).join(' | ')}`);
  if (!rows.length) { console.error('\n✗ مفيش صفوف صحيحة — تأكد إن كل سطر فيه رقم قومي 14 رقم'); process.exit(1); }

  if (args.includes('--dry')) { console.log('\n▸ تجربة فقط (--dry) — لم يُكتب شيء في قاعدة البيانات'); return; }

  const inserted = await db.importVoterRoll(rows);
  db.flushDemo();
  const stats = await db.voterRollStats();
  await db.audit({ action: 'voter_roll_import', actor: 'cli', meta: { file: path.basename(file), inserted } }).catch(() => {});

  console.log(`\n✅ تم — أُضيف ${inserted} ناخب${rows.length - inserted ? ` (تخطّي ${rows.length - inserted} مكرر)` : ''}`);
  console.log(`▸ إجمالي الكشف الآن: ${stats.count} ناخب`);
  if (config.registerMode !== 'strict') {
    console.log('\nℹ️  لتشغيل الوضع الصارم (لا يصوّت إلا من في الكشف): ضع REGISTER_MODE=strict في .env وأعد التشغيل');
  }
})().catch((err) => {
  const msg = String(err.message || err);
  console.error(`\n✗ ${msg}`);
  if (/voter_roll/.test(msg)) {
    console.error('  الحل: Supabase → SQL Editor → الصق محتوى supabase/migrations/002_phase2.sql → Run');
    console.error('  أو (مسار آلي): ضع DATABASE_URL في .env ثم: node tools/pg-apply.js --all');
  }
  process.exit(1);
});
