'use strict';
/**
 * مولّد بطاقات الرقم القومي المصرية (يعمل محليًا عبر Python/OpenCV وعبر SVG خالص في بيئة Vercel Serverless)
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const AR_MAP = { '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤', '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩' };
function toArDigits(s) {
  return String(s || '').replace(/[0-9]/g, (d) => AR_MAP[d] || d);
}
function escXml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** توليد بطاقة رقم قومي مصرية بصيغة SVG عالية الدقة (تعمل بدون أي مكتبات خارجية على Vercel) */

/**
 * رسم الرقم القومي رقمًا رقمًا في عناصر <text> منفصلة بمواضع x ثابتة.
 * كل عنصر يحتوي محرفًا واحدًا فقط — مستحيل على أي محرك BiDi عكسه.
 */
function nidDigitsSvg(nid, centerX, y, { digitW = 33, groupGap = 34, fontSize = 38 } = {}) {
  const digits = String(nid || '').replace(/\D/g, '').slice(0, 14);
  if (digits.length !== 14) return '';
  const groupW = 7 * digitW;
  const totalW = groupW * 2 + groupGap;
  const startX = centerX - totalW / 2;
  const font = `font-family="Cairo, monospace" font-size="${fontSize}" font-weight="700" fill="#0f0f12"`;
  let out = '';
  for (let i = 0; i < 7; i++) {
    out += `<text x="${startX + i * digitW + digitW / 2}" y="${y}" text-anchor="middle" ${font}>${toArDigits(digits[i])}</text>`;
  }
  for (let i = 0; i < 7; i++) {
    out += `<text x="${startX + groupW + groupGap + i * digitW + digitW / 2}" y="${y}" text-anchor="middle" ${font}>${toArDigits(digits[7 + i])}</text>`;
  }
  return out;
}

/** تاريخ الميلاد: يوم / شهر / سنة — كل جزء في عنصر مستقل (محمي من انعكاس BiDi) */
function dobSegmentsSvg(birthDate, centerX, y) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(birthDate || ''));
  if (!m) return '';
  const font = `font-family="Cairo, sans-serif" font-size="28" font-weight="700" fill="#141418"`;
  const segs = [toArDigits(m[3]), '/', toArDigits(m[2]), '/', toArDigits(m[1])];
  const widths = [40, 18, 40, 18, 62];
  const totalW = widths.reduce((a, b) => a + b, 0);
  let x = centerX - totalW / 2;
  let out = '';
  segs.forEach((seg, i) => {
    x += widths[i] / 2;
    out += `<text x="${x}" y="${y}" text-anchor="middle" ${font}>${seg}</text>`;
    x += widths[i] / 2;
  });
  return out;
}

function buildEgyptianCardSvgDataUrl({ fullName, nationalId, birthDate, governorate, gender = 'ذكر', address = '', photoDataUrl }) {
  const parts = String(fullName || '').trim().split(/\s+/);
  const firstName = parts[0] || fullName;
  const restName = parts.slice(1).join(' ');
  const addrLine = address || `ش الجمهورية — قسم أول ${governorate}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1012 638" width="1012" height="638">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f2ece0"/>
      <stop offset="55%" stop-color="#e8dfd0"/>
      <stop offset="100%" stop-color="#dfe5e2"/>
    </linearGradient>
    <linearGradient id="hdr" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#bc9c86"/>
      <stop offset="100%" stop-color="#a0826c"/>
    </linearGradient>
    <clipPath id="pclip"><rect x="38" y="130" width="310" height="390" rx="8"/></clipPath>
  </defs>
  <rect width="1012" height="638" rx="18" fill="url(#bg)" stroke="#876c54" stroke-width="6"/>
  <rect width="1012" height="108" rx="14" fill="url(#hdr)"/>
  <line x1="0" y1="108" x2="1012" y2="108" stroke="#7d5c46" stroke-width="3"/>
  <circle cx="535" cy="315" r="95" fill="none" stroke="#a08269" stroke-opacity="0.14" stroke-width="2"/>
  <circle cx="535" cy="315" r="65" fill="none" stroke="#a08269" stroke-opacity="0.14" stroke-width="2"/>
  <text x="968" y="48" text-anchor="end" direction="rtl" font-family="Cairo, sans-serif" font-size="34" font-weight="700" fill="#20140f">جمهورية مصر العربية</text>
  <text x="968" y="88" text-anchor="end" direction="rtl" font-family="Cairo, sans-serif" font-size="25" font-weight="700" fill="#372319">بطاقة تحقيق الشخصية</text>
  <text x="430" y="62" text-anchor="end" direction="rtl" font-family="Cairo, sans-serif" font-size="18" font-weight="700" fill="#412d20">وزارة الداخلية — قطاع الأحوال المدنية</text>

  <rect x="33" y="125" width="320" height="400" rx="10" fill="#f8f5f0" stroke="#a5917d" stroke-width="2"/>
  <image href="${escXml(photoDataUrl)}" x="38" y="130" width="310" height="390" preserveAspectRatio="xMidYMid slice" clip-path="url(#pclip)"/>
  <circle cx="331" cy="493" r="42" fill="#b4d2cd" fill-opacity="0.35" stroke="#8cafaa" stroke-width="2"/>

  <text x="968" y="158" text-anchor="end" direction="rtl" font-family="Cairo, sans-serif" font-size="21" font-weight="700" fill="#5f4637">الاسم /</text>
  <text x="890" y="156" text-anchor="end" direction="rtl" font-family="Cairo, sans-serif" font-size="31" font-weight="700" fill="#121216">${escXml(firstName)}</text>
  <text x="968" y="202" text-anchor="end" direction="rtl" font-family="Cairo, sans-serif" font-size="31" font-weight="700" fill="#121216">${escXml(restName)}</text>
  <line x1="385" y1="226" x2="968" y2="226" stroke="#c3b4a2" stroke-width="2"/>

  <text x="968" y="264" text-anchor="end" direction="rtl" font-family="Cairo, sans-serif" font-size="21" font-weight="700" fill="#5f4637">العنوان :</text>
  <text x="880" y="264" text-anchor="end" direction="rtl" font-family="Cairo, sans-serif" font-size="25" font-weight="700" fill="#19191e">${escXml(addrLine)}</text>
  <text x="968" y="306" text-anchor="end" direction="rtl" font-family="Cairo, sans-serif" font-size="25" font-weight="700" fill="#19191e">محافظة ${escXml(governorate)}</text>
  <line x1="385" y1="330" x2="968" y2="330" stroke="#c3b4a2" stroke-width="2"/>

  <text x="968" y="372" text-anchor="end" direction="rtl" font-family="Cairo, sans-serif" font-size="25" font-weight="700" fill="#1c1c22">النوع : ${escXml(gender)}</text>
  <text x="755" y="372" text-anchor="end" direction="rtl" font-family="Cairo, sans-serif" font-size="25" font-weight="700" fill="#1c1c22">محل الميلاد : ${escXml(governorate)}</text>

  <rect x="382" y="418" width="594" height="117" rx="10" fill="#e9e1d2" stroke="#aa947a" stroke-width="2"/>
  <text x="960" y="446" text-anchor="end" direction="rtl" font-family="Cairo, sans-serif" font-size="20" font-weight="700" fill="#5a3e2c">الرقم القومي</text>
  ${nidDigitsSvg(nationalId, 679, 502)}

  <text x="343" y="554" text-anchor="end" direction="rtl" font-family="Cairo, sans-serif" font-size="18" font-weight="700" fill="#554132">تاريخ الميلاد</text>
  ${dobSegmentsSvg(birthDate, 190, 592)}
  <text x="968" y="582" text-anchor="end" direction="rtl" font-family="Cairo, sans-serif" font-size="18" font-weight="700" fill="#4b3c30">إصدار : ٢٠٢٦/٠٩ — سارية</text>
  <text x="400" y="584" text-anchor="start" direction="ltr" font-family="Cairo, monospace" font-size="21" font-weight="700" fill="#46413c">ID-EG-${escXml(nationalId.slice(-7))}</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

module.exports = { buildEgyptianCardSvgDataUrl, toArDigits };
