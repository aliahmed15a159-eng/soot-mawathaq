'use strict';
/**
 * المحرك المحلي الذكي — يطابق الوجه في السيلفي الحي مع وجه البطاقة المسجّلة في قاعدة البيانات:
 *  ١) لو تتوفّر صورة وجه البطاقة المسجّلة وصورة السيلفي (أكثر من 1KB)، يستخدم OpenCV + البصمة الإدراكية (tools/match-face.py).
 *  ٢) ويدعم أيضًا مقارنة البصمات المتعددة (multi-hash) المحفوظة للبطاقة في قاعدة البيانات مع بصمة السيلفي.
 */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const { hashSimilarity } = require('../security');

function bestMultiHashSim(cardHashes, selfieHashes) {
  const aList = String(cardHashes || '').split('|').map((s) => s.trim()).filter((s) => s.length >= 16);
  const bList = String(selfieHashes || '').split('|').map((s) => s.trim()).filter((s) => s.length >= 16);
  if (!aList.length || !bList.length) return null;
  let best = null;
  for (const a of aList) {
    for (const b of bList) {
      const s = hashSimilarity(a, b);
      if (s !== null && (best === null || s > best)) best = s;
    }
  }
  return best;
}

async function compareFaces(cardOrMeta, selfieOrMeta) {
  const a = typeof cardOrMeta === 'string' ? { hash: null, base64: cardOrMeta } : (cardOrMeta || {});
  const b = typeof selfieOrMeta === 'string' ? { hash: null, base64: selfieOrMeta } : (selfieOrMeta || {});
  if (b.reused || (a.hashSamples && b.hashSamples && a.hashSamples === b.hashSamples)) {
    return { score: 0.18, provider: 'demo', reusedImage: true, note: 'نفس الصورة مستخدمة في البطاقة والسيلفي' };
  }

  // ١) لو البطاقة من قاعدة البيانات ولها ملف وجه مرجعي + السيلفي صورة حقيقية (أكبر من الصورة المصغرة للاختبار)
  if (a.faceImagePath && b.base64 && b.base64.length > 1200 && fs.existsSync(a.faceImagePath)) {
    try {
      const script = path.join(__dirname, '..', '..', 'tools', 'match-face.py');
      const proc = spawnSync('python3', [script], {
        input: JSON.stringify({
          ref_face_path: a.faceImagePath,
          selfie_b64: b.base64,
          stored_hashes: a.hash || '',
        }),
        encoding: 'utf8',
        timeout: 8000,
      });
      if (proc.status === 0 && proc.stdout) {
        const parsed = JSON.parse(proc.stdout.trim());
        if (parsed && parsed.ok) {
          return {
            score: parsed.score,
            similarity: parsed.similarity,
            faceDetected: parsed.face_detected,
            provider: 'demo',
            note: 'مطابقة الوجه مع البطاقة المسجّلة بقاعدة البيانات',
          };
        }
      }
    } catch { /* نكمل بالبصمة الإدراكية */ }
  }

  // ٢) مقارنة البصمات الإدراكية (تدعم أكثر من بصمة للبطاقة وللسيلفي)
  const selfieHashes = [b.hash, b.faceHash].filter(Boolean).join('|');
  const sim = bestMultiHashSim(a.hash, selfieHashes);
  if (sim === null) return { score: 0.42, provider: 'demo', note: 'تعذّر حساب البصمة الإدراكية' };
  let score;
  if (sim >= 0.75) score = 0.75 + (sim - 0.75) * 0.92;
  else if (sim >= 0.55) score = 0.52 + (sim - 0.55) * 1.15;
  else score = 0.10 + sim * 0.6;
  return { score: Math.max(0.05, Math.min(0.98, score)), similarity: sim, provider: 'demo', note: 'مطابقة الوجه مع البطاقة المسجّلة' };
}

async function detectFace() { return { found: true, provider: 'demo', note: 'محرك محلي' }; }
async function checkLiveness() { return null; }

module.exports = { id: 'demo', label: 'محرك مطابقة البطاقات المسجّلة', configured: () => true, compareFaces, detectFace, checkLiveness };
