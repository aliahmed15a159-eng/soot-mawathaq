'use strict';
/**
 * المحرك التجريبي — يستخدم البصمة الإدراكية المُرْسلة من المتصفح.
 * نفس واجهة المزوّدين الحقيقيين حتى يكون الاستبدال شفافًا تمامًا.
 */
const { hashSimilarity } = require('../security');

async function compareFaces(cardOrMeta, selfieOrMeta) {
  const a = typeof cardOrMeta === 'string' ? { hash: null, base64: cardOrMeta } : cardOrMeta;
  const b = typeof selfieOrMeta === 'string' ? { hash: null, base64: selfieOrMeta } : selfieOrMeta;
  if (b.reused || (a.hashSamples && b.hashSamples && a.hashSamples === b.hashSamples)) {
    return { score: 0.18, provider: 'demo', reusedImage: true, note: 'نفس الصورة مستخدمة في البطاقة والسيلفي' };
  }
  const sim = hashSimilarity(a.hash, b.hash);
  if (sim === null) return { score: 0.42, provider: 'demo', note: 'تعذّر حساب البصمة الإدراكية' };
  let score;
  if (sim >= 0.75) score = 0.75 + (sim - 0.75) * 0.92;
  else if (sim >= 0.55) score = 0.52 + (sim - 0.55) * 1.15;
  else score = 0.10 + sim * 0.6;
  return { score: Math.max(0.05, Math.min(0.98, score)), similarity: sim, provider: 'demo', note: 'مطابقة إدراكية تجريبية' };
}

async function detectFace() { return { found: true, provider: 'demo', note: 'المحرك التجريبي لا يحلل الوجه' }; }
async function checkLiveness() { return null; }

module.exports = { id: 'demo', label: 'محرك تجريبي', configured: () => true, compareFaces, detectFace, checkLiveness };
