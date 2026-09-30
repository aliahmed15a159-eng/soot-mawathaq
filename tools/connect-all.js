'use strict';
/**
 * ربط كامل بأمر واحد:
 *   تنفيذ السكيما → فحص الجداول → اختبار كتابة حقيقي → تعبئة بيانات تجريبية
 *   → تشغيل نسخة من المنصة على قاعدة Supabase → رحلة تصويت كاملة على قاعدتك الحقيقية
 *
 * التشغيل: node tools/connect-all.js
 * المتطلبات في .env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + SUPABASE_ACCESS_TOKEN [+ SUPABASE_PROJECT_REF]
 */
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const { config } = require('../lib/config');

const ROOT = path.join(__dirname, '..');
const TEST_PORT = 3100;

function step(n, title) {
  console.log(`\n${'═'.repeat(64)}\n▸ الخطوة ${n}: ${title}\n${'═'.repeat(64)}`);
}
function run(script, args = []) {
  const r = spawnSync('node', [path.join(__dirname, script), ...args], { cwd: ROOT, encoding: 'utf8' });
  process.stdout.write(r.stdout || '');
  if (r.stderr) process.stderr.write(r.stderr);
  return r.status === 0;
}

async function waitForServer(base, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`${base}/healthz`, { signal: AbortSignal.timeout(1500) });
      const data = await res.json();
      if (data.mode === 'supabase') return data;
    } catch { /* لسه بيقوم */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

(async () => {
  console.log('\n𓂀 «صوت موثّق» — ربط تلقائي كامل بقاعدة بيانات Supabase\n');

  const missing = [];
  if (!config.supabaseUrl) missing.push('SUPABASE_URL');
  if (!config.supabaseKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!(process.env.SUPABASE_ACCESS_TOKEN || '').startsWith('sbp_')) missing.push('SUPABASE_ACCESS_TOKEN');
  if (missing.length) {
    console.error(`✗ ناقص في .env: ${missing.join(' · ')}`);
    console.error('  راجع SUPABASE_SETUP.md للخطوات، ثم أعد التشغيل.');
    process.exit(1);
  }

  step(1, 'تنفيذ مخطط قاعدة البيانات (supabase/schema.sql)');
  if (!run('apply-schema.js')) { console.error('✗ فشل تنفيذ السكيما — توقفنا هنا.'); process.exit(1); }

  step(2, 'فحص الجداول + اختبار كتابة حقيقي');
  const dbOk = run('db-check.js', ['--write']);

  step(3, 'تعبئة بيانات تجريبية (انتخابة + مرشحين)');
  run('seed-supabase.js');

  step(4, 'تشغيل المنصة على قاعدة Supabase واختبار الرحلة الكاملة');
  const server = spawn('node', [path.join(ROOT, 'server.js')], {
    cwd: ROOT, env: { ...process.env, PORT: String(TEST_PORT) }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverLog = '';
  server.stdout.on('data', (d) => { serverLog += d.toString(); });
  server.stderr.on('data', (d) => { serverLog += d.toString(); });

  const health = await waitForServer(`http://localhost:${TEST_PORT}`);
  let flowOk = false;
  if (!health) {
    console.error('✗ الخادم لم يعمل على قاعدة Supabase خلال 20 ثانية. آخر مخرجات:');
    console.error(serverLog.trim().split('\n').slice(-8).join('\n'));
  } else {
    console.log(`✓ المنصة تعمل الآن على قاعدة Supabase (منفذ ${TEST_PORT})`);
    const r = spawnSync('node', [path.join(__dirname, 'smoke-test.js'), `http://localhost:${TEST_PORT}`],
      { cwd: ROOT, encoding: 'utf8' });
    process.stdout.write(r.stdout || '');
    flowOk = r.status === 0;
  }
  server.kill('SIGTERM');

  step(5, 'الخلاصة');
  console.log(`  السكيما والجداول     : ✓`);
  console.log(`  فحص قاعدة البيانات   : ${dbOk ? '✓' : '✗'}`);
  console.log(`  الرحلة الكاملة       : ${flowOk ? '✓ (تسجيل ← تحقق ← اقتراع ← إيصال ← منع تكرار)' : '✗'}`);
  console.log(`\n  ملاحظة: الاختبارات أنشأت سجلات تجريبية داخل قاعدتك (ناخب + صوت + انتخابة اختبارية).`);
  console.log(`  لمسح كل حاجة: node tools/apply-schema.js --drop`);
  process.exit(dbOk && flowOk ? 0 : 1);
})();
