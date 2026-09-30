'use strict';
/**
 * محرك مطابقة البيانات — يقارن ما قرأه OCR بما كتبه الناخب
 * يراعي خصائص الكتابة العربية: الهمزات، التاء المربوطة، التشكيل، المسافات،
 * وأشكال الأسماء الموصولة (عبدالرحمن / عبد الرحمن)، والأرقام العربية-الهندية.
 */

/** توحيد شكل النص العربي */
function normalizeArabic(text) {
  return String(text || '')
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')      // تشكيل + تطويل
    .replace(/[إأآٱا]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ؤو]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** تحويل الأرقام العربية-الهندية إلى لاتينية */
function normalizeDigits(text) {
  return String(text || '')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/\D/g, '');
}

/** مسافة ليفنشتاين مع قطع مبكر */
function levenshtein(a, b, maxDist = 999) {
  a = String(a); b = String(b);
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
  let prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < best) best = cur[j];
    }
    if (best > maxDist) return maxDist + 1;
    prev = cur;
  }
  return prev[b.length];
}

function ratio(a, b) {
  const maxLen = Math.max(a.length, b.length) || 1;
  return Math.max(0, 1 - levenshtein(a, b, maxLen) / maxLen);
}

/**
 * درجة تطابق كلمتين مع مراعاة صيغ الكتابة الشائعة:
 *   عبد الرحمن / عبدالرحمن  •  الحديدي / حديدي  •  أخطاء حرف واحد
 */
function tokenScore(a, b) {
  if (a === b) return 1;
  const base = ratio(a, b);
  const stripAl = (t) => t.replace(/^ال/, '');
  const sa = stripAl(a); const sb = stripAl(b);
  if (sa === sb && sa.length > 2) return 0.97;
  // واحدة محتواة في التانية (عبدالرحمن تحتوي الرحمن)
  if (a.length >= 3 && b.length >= 3) {
    if (a.includes(b) || b.includes(a)) {
      const shorter = Math.min(a.length, b.length);
      const longer = Math.max(a.length, b.length);
      return Math.max(0.8, Math.min(0.95, 0.72 + (shorter / longer) * 0.25));
    }
  }
  return base;
}

/** كلمات دالة على صيغ الأسماء المركبة/المعتادة */
const NAME_STOPWORDS = new Set(['بن', 'بنت', 'ابن', 'ابنة', 'ال', 'عبد', 'ابو', 'أبو']);

function tokenize(name) {
  return normalizeArabic(name)
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !NAME_STOPWORDS.has(t));
}

/**
 * درجة تشابه اسمين عربيين (0..1)
 * تجمع بين: تطابق الكلمات (بدون ترتيب) + تشابه الأحرف على الاسم كامل
 * + معالجة حالة «عبدالرحمن» مقابل «عبد الرحمن».
 */
function scoreName(typed, extracted) {
  const t = tokenize(typed);
  const e = tokenize(extracted);
  if (!t.length || !e.length) return { score: 0, tokens: 0, note: 'نص فاضي' };

  // تطابق أجود كلمة بكلمة (كل كلمة في المُدخل تُقارن بأفضل كلمة مقروءة)
  const used = new Set();
  const pairs = [];
  let matched = 0;
  for (const tok of t) {
    let best = { score: 0, idx: -1 };
    e.forEach((cand, i) => {
      if (used.has(i)) return;
      const s = tokenScore(tok, cand);
      if (s > best.score) best = { score: s, idx: i };
    });
    if (best.idx >= 0 && best.score >= 0.75) {
      used.add(best.idx);
      matched++;
      pairs.push(best.score);
    } else {
      pairs.push(0);
    }
  }
  const coverage = matched / t.length;
  const tokenQuality = pairs.reduce((a, b) => a + b, 0) / pairs.length;
  const joinedTyped = t.join('');
  const joinedExtracted = e.join('');
  const joinedScore = ratio(joinedTyped, joinedExtracted);

  // الترتيب مهم في الأسماء: لو أول كلمتين اتبدلوا تنقص الدرجة
  const firstTwoTyped = t.slice(0, 2).join(' ');
  const firstTwoExtracted = e.slice(0, 2).join(' ');
  const orderBonus = ratio(firstTwoTyped, firstTwoExtracted) >= 0.8 ? 0.06 : 0;

  const score = Math.min(1, coverage * 0.5 + tokenQuality * 0.28 + joinedScore * 0.22 + orderBonus);
  return {
    score: Math.round(score * 1000) / 1000,
    tokens: t.length,
    matched,
    missing: t.length - matched,
    note: matched === t.length ? 'كل كلمات الاسم اتطابقت' : `${matched} من ${t.length} كلمة اتطابقت`,
  };
}

/** مطابقة الرقم القومي: تطابق تام بعد التطبيع (مع تسامح في حالة قراءة جزئية) */
function scoreNationalId(typed, extracted) {
  const a = normalizeDigits(typed);
  const b = normalizeDigits(extracted);
  if (!b) return { score: 0, note: 'مقدرناش نقرأ الرقم القومي من الصورة' };
  if (a === b) return { score: 1, note: 'تطابق تام' };
  if (b.includes(a) || a.includes(b)) return { score: 0.6, note: 'تطابق جزئي' };
  // تسامح بسيط: خطأ حرف واحد فقط في 14 رقمًا
  const diff = levenshtein(a, b);
  if (diff === 1) return { score: 0.92, note: 'اختلاف رقم واحد (احتمال خطأ قراءة)' };
  if (diff === 2) return { score: 0.72, note: 'اختلاف رقمين' };
  return { score: 0.1, note: `الجودة منخفضة (فرق ${diff} أرقام)` };
}

/** مطابقة تاريخ الميلاد (نص ISO أو صيغ عربية) */
function scoreBirthDate(isoTyped, extractedText) {
  const typed = String(isoTyped || '').trim();
  if (!typed) return { score: 0, note: 'مفيش تاريخ مكتوب' };
  const [y, m, d] = typed.split('-');
  const digits = normalizeDigits(extractedText || '');
  if (!digits) return { score: 0, note: 'مفيش أرقام في النص المقروء' };
  const variants = [
    `${d}${m}${y}`, `${y}${m}${d}`, `${d}/${m}/${y}`, `${y}-${m}-${d}`,
  ].map((v) => normalizeDigits(v));
  if (variants.some((v) => v && digits.includes(v))) return { score: 1, note: 'تطابق تام' };
  if (digits.includes(y) && digits.includes(m)) return { score: 0.7, note: 'سنة وشهر متطابقين' };
  if (digits.includes(y)) return { score: 0.4, note: 'السنة فقط متطابقة' };
  return { score: 0.1, note: 'مفيش تطابق' };
}

/**
 * القرار المجمّع لبيانات البطاقة
 * weights: الرقم القومي هو الأقوى — لا تحقق بدون تطابقه
 */
function decideCardFields({ typed = {}, extracted = {} } = {}) {
  const nid = scoreNationalId(typed.national_id, extracted.national_id);
  const dob = scoreBirthDate(typed.birth_date, extracted.birth_date || extracted.raw_text);
  const name = scoreName(typed.full_name, extracted.full_name);
  const gov = extracted.governorate
    ? (normalizeArabic(extracted.governorate) === normalizeArabic(typed.governorate)
      ? { score: 1, note: 'تطابق تام' }
      : { score: 0.3, note: 'مختلفة عن المُدخل' })
    : { score: 0.5, note: 'مش مقروءة من الصورة' };

  const score = nid.score * 0.45 + name.score * 0.3 + dob.score * 0.15 + gov.score * 0.1;
  const hardFail = nid.score < 0.6 || name.score < 0.45;
  return {
    score: Math.round(score * 1000) / 1000,
    ok: !hardFail && score >= 0.62,
    hardFail,
    checks: { national_id: nid, full_name: name, birth_date: dob, governorate: gov },
    reasons: [
      nid.score < 0.6 ? `الرقم القومي مقروء من الصورة مختلف — ${nid.note}` : null,
      name.score < 0.45 ? `الاسم المقروء مختلف عن المكتوب — ${name.note}` : null,
    ].filter(Boolean),
  };
}

module.exports = {
  normalizeArabic, normalizeDigits, tokenize,
  levenshtein, ratio, scoreName, scoreNationalId, scoreBirthDate, decideCardFields,
};
