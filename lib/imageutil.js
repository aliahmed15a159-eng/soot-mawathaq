'use strict';
/** أدوات تعامل مع الصور الواردة من المتصفح */

/** يزيل بادئة data:image/...;base64, ويُرجع المحتوى الخام فقط */
function stripDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const m = dataUrl.match(/^data:image\/[a-zA-Z+]+;base64,(.+)$/);
  try {
    return m ? m[1] : Buffer.from(dataUrl, 'base64').toString('base64');
  } catch { return null; }
}

/** الحد الأقصى لحجم الصورة قبل الإرسال لمزوّد خارجي (حماية من الرفع الضخم) */
const MAX_BYTES = 6 * 1024 * 1024;
function isTooLarge(base64) {
  return !base64 || Buffer.byteLength(base64, 'base64') > MAX_BYTES;
}

module.exports = { stripDataUrl, isTooLarge, MAX_BYTES };
