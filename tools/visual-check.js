'use strict';
/**
 * فحص بصري: يفتح صفحات المنصة في Chromium ويلتقط صورًا + يكشف أخطاء الجافاسكربت
 * التشغيل: node tools/visual-check.js [outDir] [baseUrl]
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUT = process.argv[2] || path.join(__dirname, '..', 'shots');
const BASE = process.argv[3] || 'http://localhost:3000';

const PAGES = [
  ['/', 'home'],
  ['/register?e=1', 'register'],
  ['/vote-here', 'kiosk'],
  ['/results?e=1', 'results'],
  ['/verify-receipt', 'receipt-lookup'],
  ['/admin', 'admin'],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1340, height: 940 } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  for (const [urlPath, name] of PAGES) {
    await page.goto(BASE + urlPath, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    // كشف أي عنصر بيتجاوز عرض الشاشة (تمرير أفقي غير مقصود)
    const overflow = await page.evaluate(() => {
      const docW = document.documentElement.clientWidth;
      const bad = [];
      document.querySelectorAll('body *').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > docW + 6 || r.left < -6)) bad.push(`${el.tagName}.${el.className}`.slice(0, 60));
      });
      return { hiddenX: document.documentElement.scrollWidth > docW + 2, bad: [...new Set(bad)].slice(0, 6) };
    });
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
    await page.screenshot({ path: path.join(OUT, `${name}-full.png`), fullPage: true });
    console.log(`${overflow.hiddenX ? '⚠️ ' : '✅'} ${name.padEnd(16)} ${overflow.hiddenX ? `تمرير أفقي! ${overflow.bad.join(', ')}` : 'التخطيط سليم'}`);
  }

  // اختبار الموبايل
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  for (const [urlPath, name] of [['/', 'home'], ['/register?e=1', 'register']]) {
    await mobile.goto(BASE + urlPath, { waitUntil: 'networkidle' });
    await mobile.screenshot({ path: path.join(OUT, `mobile-${name}.png`), fullPage: false });
  }

  await browser.close();
  console.log(errors.length ? `\n❌ أخطاء جافاسكربت:\n- ${errors.join('\n- ')}` : '\n✅ مفيش أخطاء جافاسكربت');
})();
