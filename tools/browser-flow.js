'use strict';
/**
 * اختبار الرحلة الكاملة من داخل المتصفح الحقيقي (Chromium):
 * تسجيل ← تشغيل كاميرا وهمية ← تحقق ← اقتراع ← إيصال
 * التشغيل: node tools/browser-flow.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, '..', 'shots');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    args: [
      '--no-sandbox',
      '--use-fake-ui-for-media-stream',       // يقبل إذن الكاميرا آليًا
      '--use-fake-device-for-media-stream',   // كاميرا وهمية بإطار متحرك (يساعد كشف الحياة)
    ],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1340, height: 940 },
    permissions: ['camera'],
    locale: 'ar-EG',
  });

  // كاميرا اختبارية: مشهد مضيء متحرك (يحاكي وجهًا يتنقل ويرمش) لتشغيل خط الأنابيب الحقيقي
  await ctx.addInitScript(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280; canvas.height = 960;
    const c = canvas.getContext('2d');
    let t = 0;
    function draw() {
      t += 1;
      const g = c.createLinearGradient(0, 0, 0, 960);
      g.addColorStop(0, '#d9cdb4'); g.addColorStop(1, '#bfb195');
      c.fillStyle = g; c.fillRect(0, 0, 1280, 960);
      const cx = 640 + Math.sin(t / 22) * 130;          // حركة يمين/شمال
      const cy = 430;
      const rw = 210 + Math.cos(t / 31) * 30;           // اقتراب/ابتعاد
      const rh = 270 + Math.cos(t / 31) * 34;
      c.fillStyle = '#e7c9a4';                           // الوجه
      c.beginPath(); c.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2); c.fill();
      // نسيج دقيق يحاكي حساسية الكاميرا الحقيقية
      for (let i = 0; i < 2600; i++) {
        const px = Math.random() * 1280; const py = Math.random() * 960;
        c.fillStyle = `rgba(${Math.random() > .5 ? 255 : 0},${Math.random() > .5 ? 250 : 10},${Math.random() > .5 ? 240 : 20},.06)`;
        c.fillRect(px, py, 2, 2);
      }
      const blink = (t % 55) < 6;                        // رمش كل فترة
      c.fillStyle = '#3a2a1c';
      if (!blink) {
        c.beginPath(); c.ellipse(cx - rw * 0.42, cy - rh * 0.3, 26, 15, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(cx + rw * 0.42, cy - rh * 0.3, 26, 15, 0, 0, Math.PI * 2); c.fill();
      } else {
        c.strokeStyle = '#3a2a1c'; c.lineWidth = 6;
        c.beginPath(); c.moveTo(cx - rw * 0.55, cy - rh * 0.3); c.lineTo(cx - rw * 0.3, cy - rh * 0.3); c.stroke();
        c.beginPath(); c.moveTo(cx + rw * 0.3, cy - rh * 0.3); c.lineTo(cx + rw * 0.55, cy - rh * 0.3); c.stroke();
      }
      const smile = Math.sin(t / 18) > 0.4;
      c.strokeStyle = '#8a4b33'; c.lineWidth = 12;
      c.beginPath(); c.arc(cx, cy + rh * 0.24, smile ? 84 : 46, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
      c.fillStyle = '#6b5a48';
      c.beginPath(); c.ellipse(cx, cy + 8, 22, 30, 0, 0, Math.PI * 2); c.fill();
      requestAnimationFrame(draw);
    }
    draw();
    const stream = canvas.captureStream(20);
    const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      if (constraints && constraints.video) return stream;
      return orig(constraints);
    };
  });

  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  const log = (s) => console.log(s);

  // 1) التسجيل
  await page.goto('http://localhost:3000/register?e=1', { waitUntil: 'networkidle' });
  await page.fill('#full_name', 'سلمى هاني عبد الله');
  await page.fill('#national_id', '29507122501846');
  await page.waitForTimeout(400);
  const dob = await page.inputValue('#birth_date');
  const gov = await page.inputValue('#governorate');
  log(`✅ قراءة لحظية من الرقم القومي: تاريخ الميلاد=${dob} · المحافظة=${gov}`);
  await page.fill('#phone', '01012345678');
  await page.check('#consent');
  await page.screenshot({ path: path.join(OUT, 'flow-1-register.png') });
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL('**/verify', { timeout: 15000 });
    log('✅ انتقل لصفحة التحقق');
  } catch (err) {
    const msg = await page.textContent('#form-error').catch(() => '(مفيش رسالة)');
    await page.screenshot({ path: path.join(OUT, 'flow-1b-error.png') });
    log(`❌ فشل الانتقال لصفحة التحقق — رسالة النموذج: ${String(msg).trim()}`);
    throw err;
  }

  // 2) الكاميرا + البطاقة
  await page.click('#btn-start-camera');
  await page.waitForTimeout(1500);
  await page.click('#btn-capture-card');
  await page.waitForSelector('#card-preview:not([hidden])', { timeout: 10000 });
  await page.screenshot({ path: path.join(OUT, 'flow-2-card.png') });
  log('✅ التقاط صورة البطاقة + قياس الجودة');
  await page.click('#btn-card-ok');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, 'flow-3-selfie.png') });
  const challenges = await page.$$eval('#challenge-list li', (els) => els.map((e) => e.textContent.trim()));
  log(`✅ تحدي كشف الحياة: ${challenges.join(' / ')}`);

  // 3) محاكاة إكمال الحركات (نضغط الحالة يدويًا كما لو أن المستخدم نفّذها أمام الكاميرا)
  await page.evaluate(() => {
    document.querySelectorAll('#challenge-list li').forEach((li) => li.classList.add('done'));
    window.__liveness = true;
  });
  await page.waitForTimeout(800);
  await page.click('#btn-capture-selfie');
  await page.waitForSelector('#selfie-preview:not([hidden])', { timeout: 10000 });
  await page.screenshot({ path: path.join(OUT, 'flow-4-selfie-captured.png') });
  log('✅ التقاط السيلفي');

  await page.click('#btn-selfie-ok');
  await page.waitForSelector('.result-head', { timeout: 20000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'flow-5-result.png') });
  const resultText = await page.textContent('.result-head h2');
  log(`✅ نتيجة التحقق: ${resultText.trim()}`);

  const goVote = await page.$('a[href="/vote"]');
  if (goVote) {
    await goVote.click();
    await page.waitForURL('**/vote', { timeout: 15000 });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT, 'flow-6-vote.png') });
    log('✅ صفحة الاقتراع ظهرت');
    await page.locator('.candidate').first().click({ force: true });
    await page.click('#vote-form button[type="submit"]');
    await page.waitForSelector('#confirm-dialog[open]', { timeout: 8000 });
    await page.screenshot({ path: path.join(OUT, 'flow-7-confirm.png') });
    await page.click('#confirm-yes');
    await page.waitForURL('**/receipt**', { timeout: 15000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, 'flow-8-receipt.png') });
    const code = await page.textContent('#receipt-code');
    log(`✅ الإيصال: ${code.trim()}`);
  } else {
    log('⚠️ التحقق لم ينجح في هذه الجولة — النتيجة معروضة في flow-5-result.png');
  }

  await browser.close();
  console.log(errors.length ? `\n❌ أخطاء:\n- ${errors.join('\n- ')}` : '\n✅ مفيش أخطاء جافاسكربت خلال الرحلة');
})();
