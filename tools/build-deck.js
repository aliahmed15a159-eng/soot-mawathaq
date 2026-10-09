#!/usr/bin/env node
'use strict';
/**
 * بناء العرض التقديمي من صفحة العرض نفسها (public/presentation.html)
 *
 * كل شريحة تُلتقط كما تظهر تمامًا على الموقع (لقطة بنسبة 16:9)، ثم تُكتب في:
 *   • soot-mawathaq-presentation-v2.pptx  ← الملف الذي يحمّله زر «تحميل PowerPoint» في /presentation
 *   • soot-mawathaq-presentation-v2.pdf   ← نسخة PDF للتسليم (تُكتب فقط مع --out)
 *
 * الاستخدام:
 *   npm run deck                        ← يكتب الـ PPTX داخل public/ (الملف المنشور على الموقع)
 *   node tools/build-deck.js --out DIR  ← يكتب الـ PPTX والـ PDF داخل DIR (للتسليم للجنة)
 *
 * يحتاج متصفح Chromium: إما من Playwright (npx playwright install chromium)
 * أو مسار متصفح موجود على الجهاز عبر المتغير CHROME_PATH.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const PptxGenJS = require('pptxgenjs');
const { server } = require('../server');

const BASE_NAME = 'soot-mawathaq-presentation-v2';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const DECK_TITLE = 'صوت موثّق — العرض التقديمي';
const FRAME_W = 1760; // إطار 16:9 بوحدات CSS؛ أطول شريحة (الغلاف) تتسع داخله
const FRAME_H = 990;
// ملف العرض يُخدم من الموقع عبر دالة Vercel، وحد استجابة الدالة 4.5 MB — لذلك نبقي الملف نحو 3 MB
// (الصورة 2200×1238 بجودة 80 تعطي نصًا واضحًا عند التكبير). لا ترفع SCALE أو الجودة دون مراجعة الحجم.
const SCALE = 1.25;
const JPEG_QUALITY = 80;

// تجهيز الصفحة للالتقاط فقط: بلا شريط الموقع وبلا حركات، والشريحة في منتصف الإطار
const CAPTURE_CSS = `
  *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
  .deck-poc-strip, .deck-topbar, .deck-drawer { display: none !important; }
  body { display: flex !important; flex-direction: column; justify-content: center; min-height: 100vh !important; margin: 0 !important; }
  .deck-stage { margin: 0 auto !important; }
`;

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** يلتقط كل شريحة من صفحة العرض كما تظهر على الموقع. */
async function captureSlides(browser, baseUrl) {
  const context = await browser.newContext({
    viewport: { width: FRAME_W, height: FRAME_H },
    deviceScaleFactor: SCALE,
  });
  // نسمح فقط بالخادم المحلي (والبيانات المضمّنة)، فلا ينتظر المتصفح خدمات خارجية مثل Google Fonts
  await context.route('**/*', (route) => {
    const url = route.request().url();
    return url.startsWith(baseUrl) || url.startsWith('data:') ? route.continue() : route.abort();
  });

  const page = await context.newPage();
  await page.goto(`${baseUrl}/presentation`, { waitUntil: 'load' });
  await page.addStyleTag({ content: CAPTURE_CSS });
  await page.evaluate(() => document.fonts.ready);

  const slides = await page.$$eval('.slide', (els) => els.map((el) => ({
    no: Number(el.dataset.slide),
    // عنوان الشريحة للنص البديل: نصل أجزاء العنوان بمسافة (لأن <span> و<br> تلتصق بلا فواصل)
    title: Array.from(el.querySelector('h1, h2')?.childNodes || []).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim(),
  })));

  const frames = [];
  for (const slide of slides) {
    // نفس منطق الصفحة: شريحة واحدة نشطة في كل مرة
    const box = await page.evaluate(async (no) => {
      document.querySelectorAll('.slide').forEach((s) => s.classList.toggle('active', Number(s.dataset.slide) === no));
      await Promise.all(Array.from(document.images).map((img) => (img.complete ? null : new Promise((r) => {
        img.onload = img.onerror = r;
      }))));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const s = document.querySelector('.slide.active');
      const tab = s.querySelector('.file-tab');
      const rects = [s.getBoundingClientRect(), tab ? tab.getBoundingClientRect() : null].filter(Boolean);
      return { top: Math.min(...rects.map((r) => r.top)), bottom: Math.max(...rects.map((r) => r.bottom)) };
    }, slide.no);

    if (box.top < 0 || box.bottom > FRAME_H) {
      throw new Error(`الشريحة ${slide.no} أطول من الإطار — ارفع FRAME_H في tools/build-deck.js`);
    }
    frames.push({ ...slide, jpeg: await page.screenshot({ type: 'jpeg', quality: JPEG_QUALITY }) });
  }

  await context.close();
  return frames;
}

/** ملف PowerPoint: شريحة لكل لقطة، بنسبة 16:9 وبلا نص قابل للتحرير (الصورة هي الشريحة كما على الموقع). */
async function writePptx(frames, file) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 × 7.5 إنش
  pptx.title = DECK_TITLE;
  pptx.subject = 'نسخة مطابقة لصفحة العرض على الموقع /presentation';
  pptx.author = 'صوت موثّق';
  const { width, height } = pptx.presLayout;

  for (const f of frames) {
    const slide = pptx.addSlide();
    slide.background = { color: 'F7F4EA' };
    slide.addImage({
      data: `image/jpeg;base64,${f.jpeg.toString('base64')}`,
      x: 0,
      y: 0,
      w: width,
      h: height,
      altText: `${f.title} — شريحة ${f.no} من ${frames.length}`,
    });
  }
  await pptx.writeFile({ fileName: file });
}

/** ملف PDF: صفحة لكل شريحة بنفس أبعاد الإطار. */
async function writePdf(browser, frames, file) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const sections = frames.map((f) => (
    `<section class="p"><img alt="${escapeHtml(f.title)}" src="data:image/jpeg;base64,${f.jpeg.toString('base64')}"></section>`
  )).join('\n');
  const html = `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(DECK_TITLE)}</title>
<style>
  @page { size: ${FRAME_W}px ${FRAME_H}px; margin: 0; }
  html, body { margin: 0; padding: 0; background: #f7f4ea; }
  .p { width: ${FRAME_W}px; height: ${FRAME_H}px; overflow: hidden; break-after: page; page-break-after: always; }
  .p:last-child { break-after: auto; page-break-after: auto; }
  .p img { display: block; width: ${FRAME_W}px; height: ${FRAME_H}px; }
</style></head><body>
${sections}
</body></html>`;
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({
    path: file,
    width: `${FRAME_W}px`,
    height: `${FRAME_H}px`,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
  });
  await context.close();
}

async function main() {
  const outIdx = process.argv.indexOf('--out');
  const outDir = outIdx > -1 ? path.resolve(process.argv[outIdx + 1] || '.') : null;
  const pptxDir = outDir || PUBLIC_DIR;
  fs.mkdirSync(pptxDir, { recursive: true });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
  } catch (err) {
    throw new Error(`تعذّر تشغيل Chromium (${err.message.split('\n')[0]}). ثبّته بالأمر: npx playwright install chromium — أو اضبط CHROME_PATH`);
  }

  try {
    const frames = await captureSlides(browser, baseUrl);
    const pptxFile = path.join(pptxDir, `${BASE_NAME}.pptx`);
    await writePptx(frames, pptxFile);
    console.log(`✓ ${frames.length} شريحة → ${path.relative(process.cwd(), pptxFile) || pptxFile} (${(fs.statSync(pptxFile).size / 1048576).toFixed(1)} MB)`);
    if (outDir) {
      const pdfFile = path.join(outDir, `${BASE_NAME}.pdf`);
      await writePdf(browser, frames, pdfFile);
      console.log(`✓ PDF → ${pdfFile} (${(fs.statSync(pdfFile).size / 1048576).toFixed(1)} MB)`);
    }
  } finally {
    await browser.close();
    server.close();
    server.closeAllConnections?.();
  }
}

main().catch((err) => {
  console.error('فشل بناء العرض التقديمي:', err.message);
  process.exitCode = 1;
});
