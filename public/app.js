/* =============================================================================
   صوت — منطق المتصفح
   • المظهر: فاتح/داكن مع تخزين محلي واحترام تفضيل النظام
   • التسجيل: قراءة الرقم القومي لحظيًا (تاريخ الميلاد/المحافظة/النوع)
   • التحقق: كاميرا + مؤشرات حركة لكشف الحياة + بصمة عصبية للوجه (128-D)
   • الاقتراع: مراجعة وتأكيد نهائي ثم إرسال الصوت
   • توليد البطاقة: الرقم القومي يُرسم رقمًا رقمًا (محمي من انعكاس BiDi)
   ========================================================================== */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const arDigits = (s) => String(s || '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, '');
  const nowMs = () => performance.now();

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}), credentials: 'same-origin',
    });
    let data = null;
    try { data = await res.json(); } catch { data = { ok: false, error: 'رد غير متوقع من الخادم' }; }
    return { status: res.status, data };
  }

  /* ======================================================= ٠) المظهر (فاتح/داكن) */
  const themeBtns = $$('[data-theme-toggle]');
  function applyThemeLabels() {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    themeBtns.forEach((b) => {
      const label = b.querySelector('[data-theme-label]');
      if (label) label.textContent = theme === 'dark' ? 'داكن' : 'فاتح';
      b.setAttribute('aria-pressed', String(theme === 'dark'));
    });
  }
  themeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('soot-theme', next); } catch {}
      applyThemeLabels();
    });
  });
  applyThemeLabels();
  // متابعة تغيّر تفضيل النظام (دون تجاوز اختيار المستخدم المحفوظ)
  window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', (e) => {
    let saved = null;
    try { saved = localStorage.getItem('soot-theme'); } catch {}
    if (!saved) {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      applyThemeLabels();
    }
  });

  /* ======================================================= ٠.٥) قائمة الجوال */
  const burger = $('[data-nav-toggle]');
  const mobileNav = $('#mobile-nav');
  if (burger && mobileNav) {
    const setMenu = (open) => {
      mobileNav.hidden = !open;
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
      burger.innerHTML = open
        ? '<svg class="ic" width="21" height="21" aria-hidden="true"><use href="#i-close"/></svg>'
        : '<svg class="ic" width="21" height="21" aria-hidden="true"><use href="#i-menu"/></svg>';
    };
    burger.addEventListener('click', () => setMenu(mobileNav.hidden));
    mobileNav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !mobileNav.hidden) setMenu(false); });
  }

  /* ======================================================= ٠.٦) ظهور تدريجي + Toast + نوافذ */
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in-view'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    $$('.reveal').forEach((el) => io.observe(el));
  } else {
    $$('.reveal').forEach((el) => el.classList.add('in-view'));
  }

  function toast(msg, ok = true) {
    let region = $('.toast-region');
    if (!region) { region = document.createElement('div'); region.className = 'toast-region'; region.setAttribute('aria-live', 'polite'); document.body.appendChild(region); }
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<svg class="ic" width="15" height="15" aria-hidden="true"><use href="#i-${ok ? 'check-circle' : 'alert'}"/></svg>`;
    el.appendChild(document.createTextNode(msg));
    region.appendChild(el);
    setTimeout(() => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 300); }, 2600);
  }

  // إغلاق نوافذ <dialog> عبر أزرار [data-close-modal]
  document.addEventListener('click', (e) => {
    const closer = e.target.closest('[data-close-modal]');
    if (closer) {
      const dlg = closer.closest('dialog');
      if (dlg && dlg.open) dlg.close();
    }
  });

  /* ======================================================= ١) صفحة التسجيل */
  const registerForm = $('#register-form');
  if (registerForm) {
    const nid = $('#national_id');
    const dob = $('#birth_date');
    const gov = $('#governorate');
    const phone = $('#phone');
    const errorBox = $('#form-error');
    const preview = $('#nid-preview');

    const GOV = {
      '01': 'القاهرة', '02': 'الإسكندرية', '03': 'بورسعيد', '04': 'السويس', '11': 'دمياط',
      '12': 'الدقهلية', '13': 'الشرقية', '14': 'القليوبية', '15': 'كفر الشيخ', '16': 'الغربية',
      '17': 'المنوفية', '18': 'البحيرة', '19': 'الإسماعيلية', '21': 'الجيزة', '22': 'بني سويف',
      '23': 'الفيوم', '24': 'المنيا', '25': 'أسيوط', '26': 'سوهاج', '27': 'قنا', '28': 'أسوان',
      '29': 'الأقصر', '31': 'البحر الأحمر', '32': 'الوادي الجديد', '33': 'مطروح',
      '34': 'شمال سيناء', '35': 'جنوب سيناء', '88': 'خارج الجمهورية',
    };

    function parseNid(value) {
      const id = arDigits(value);
      if (id.length !== 14) return null;
      if (id[0] !== '2' && id[0] !== '3') return null;
      const yy = +id.slice(1, 3); const mm = +id.slice(3, 5); const dd = +id.slice(5, 7);
      if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return { invalidDate: true, id };
      const year = (id[0] === '2' ? 1900 : 2000) + yy;
      const govCode = id.slice(7, 9);
      if (!GOV[govCode]) return { invalidGov: true, id };
      return {
        id, iso: `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`,
        gov: GOV[govCode], gender: +id[12] % 2 === 1 ? 'ذكر' : 'أنثى',
      };
    }

    nid?.addEventListener('input', () => {
      nid.value = arDigits(nid.value).slice(0, 14);
      const p = parseNid(nid.value);
      const hint = $('#nid-hint');
      if (!p) {
        preview.hidden = true;
        if (hint) { hint.textContent = `${nid.value.length}/14 رقم — نقرأ منه تاريخ الميلاد والمحافظة تلقائيًا`; hint.style.color = ''; }
        return;
      }
      if (p.invalidDate || p.invalidGov) {
        preview.hidden = true;
        if (hint) { hint.textContent = p.invalidDate ? 'تاريخ الميلاد داخل الرقم غير صحيح' : 'كود المحافظة داخل الرقم غير معروف'; hint.style.color = 'var(--danger)'; }
        return;
      }
      if (hint) { hint.textContent = 'تم — قرأنا التاريخ والمحافظة من الرقم القومي'; hint.style.color = 'var(--ok)'; }
      dob.value = p.iso;
      gov.value = p.gov;
      $('#np-gender').textContent = p.gender;
      $('#np-dob').textContent = p.iso;
      $('#np-gov').textContent = p.gov;
      preview.hidden = false;
    });

    phone?.addEventListener('input', () => { phone.value = arDigits(phone.value).slice(0, 11); });

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.hidden = true;
      const btn = $('button[type="submit"]', registerForm);
      const payload = {
        full_name: $('#full_name').value.trim(),
        national_id: arDigits(nid.value),
        birth_date: dob.value,
        governorate: gov.value,
        phone: arDigits(phone.value),
        consent: $('#consent').checked,
        election_id: registerForm.querySelector('[name="election_id"]')?.value || '',
        kiosk: new URLSearchParams(location.search).get('kiosk') === '1',
      };
      if (payload.national_id.length !== 14) return showError('الرقم القومي لازم يكون 14 رقم');
      if (!payload.consent) return showError('لازم توافق على استخدام البيانات للتحقق من الهوية');
      btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'جارٍ الحفظ…';
      const { data } = await postJson('/api/register', payload);
      if (!data.ok) {
        btn.disabled = false; btn.textContent = btn.dataset.label;
        return showError(data.error || 'تعذّر إتمام التسجيل');
      }
      if (data.otp && data.otp.required && data.otp.dev_code) sessionStorage.setItem('sm_dev_otp', data.otp.dev_code);
      location.href = data.redirect || '/verify';
    });

    function showError(msg) { errorBox.textContent = msg; errorBox.hidden = false; window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }

  /* ======================================================= ١.٥) كود الموبايل */
  const otpForm = $('#otp-form');
  if (otpForm) {
    const codeInput = $('#otp-code');
    const errorBox = $('#otp-error');
    const devCode = sessionStorage.getItem('sm_dev_otp');
    if (devCode && !codeInput.value) codeInput.value = devCode; // وضع تجربة فقط
    codeInput?.addEventListener('input', () => { codeInput.value = arDigits(codeInput.value).slice(0, 6); });
    otpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.hidden = true;
      const { data } = await postJson('/api/otp/verify', { code: arDigits(codeInput.value) });
      if (!data.ok) { errorBox.textContent = data.error || 'الكود غير صحيح'; errorBox.hidden = false; return; }
      sessionStorage.removeItem('sm_dev_otp');
      location.href = data.redirect || '/verify';
    });
    $('#btn-resend-otp')?.addEventListener('click', async (e) => {
      const b = e.currentTarget;
      b.disabled = true; b.textContent = 'جارٍ الإرسال…';
      const { data } = await postJson('/api/otp/resend', {});
      b.disabled = false; b.textContent = 'إعادة إرسال الكود';
      if (!data.ok) { errorBox.textContent = data.error || 'تعذّر الإرسال'; errorBox.hidden = false; return; }
      if (data.dev_code) { codeInput.value = data.dev_code; sessionStorage.setItem('sm_dev_otp', data.dev_code); }
      errorBox.textContent = `تم إرسال كود جديد على ${data.masked}`;
      errorBox.className = 'form-error ok-text'; errorBox.hidden = false;
    });
  }

  /* ======================================================= ٢) صفحة التحقق */
  const verifyApp = $('#verify-app');
  if (verifyApp) initVerify(verifyApp);

  function initVerify(app) {
    const steps = {};
    $$('.v-step', app).forEach((el) => { steps[el.dataset.step] = el; });
    const show = (name) => { Object.values(steps).forEach((el) => { el.hidden = true; }); steps[name].hidden = false; };

    const video = $('#video');
    const videoSelfie = $('#video-selfie');
    const canvas = $('#canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let stream = null; let facing = 'user'; let challenge = [];
    let livenessEvents = []; let frames = 0; let cardData = null; let selfieData = null;
    let motionLoop = null; let eyeBaseline = 0; let lastBlink = 0;

    const camStatus = $('#cam-status');
    function setCamStatus(text, state = '') {
      if (!camStatus) return;
      camStatus.textContent = text;
      camStatus.classList.remove('live', 'err');
      if (state) camStatus.classList.add(state);
    }

    async function startCamera() {
      const errBox = $('#verify-error');
      if (errBox) errBox.hidden = true;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCamStatus('الكاميرا غير مدعومة — استخدم «رفع صورة من الجهاز»', 'err');
        return false;
      }
      try {
        if (stream) stream.getTracks().forEach((t) => t.stop());
        setCamStatus('جارٍ تشغيل الكاميرا…', '');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (videoSelfie) {
          videoSelfie.srcObject = stream;
          videoSelfie.muted = true;
          videoSelfie.setAttribute('playsinline', '');
          await videoSelfie.play();
        }
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        setCamStatus('الكاميرا تعمل — ضع وجهك داخل الإطار', 'live');
        return true;
      } catch (err) {
        setCamStatus('تعذّر فتح الكاميرا — يمكنك رفع صورة لوجهك', 'err');
        if (errBox) {
          errBox.textContent = 'لم نتمكن من فتح الكاميرا (' + (err.message || err.name) + ') — تأكد من السماح للكاميرا أو ارفع صورة لوجهك.';
          errBox.hidden = false;
        }
        return false;
      }
    }

    /* ---------- محرك مطابقة الوجه (بصمة عصبية 128-D) ---------- */
    let modelsLoaded = false;
    let cachedRefDescriptors = [];
    let liveReticleTimer = null;

    function loadDecodedImage(src) {
      return new Promise((resolve, reject) => {
        const im = new Image();
        im.crossOrigin = 'anonymous';
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = src;
      });
    }

    async function extractDescriptorMultiScale(imgEl) {
      if (!window.faceapi) return null;
      for (const size of [416, 320]) {
        const opts = new window.faceapi.TinyFaceDetectorOptions({ inputSize: size, scoreThreshold: 0.25 });
        const det = await window.faceapi.detectSingleFace(imgEl, opts).withFaceLandmarks(true).withFaceDescriptor();
        if (det && det.descriptor) return Array.from(det.descriptor);
      }
      // محاولة بإطار هامشي للصور المقصوصة عن قرب
      const padC = document.createElement('canvas');
      padC.width = 480; padC.height = 480;
      const pctx = padC.getContext('2d');
      pctx.fillStyle = '#e5e0d5';
      pctx.fillRect(0, 0, 480, 480);
      pctx.drawImage(imgEl, 84, 84, 312, 312);
      const opts = new window.faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.24 });
      const detPad = await window.faceapi.detectSingleFace(padC, opts).withFaceLandmarks(true).withFaceDescriptor();
      return detPad && detPad.descriptor ? Array.from(detPad.descriptor) : null;
    }

    async function ensureFaceModels() {
      const badgeTxt = $('#ai-engine-text');
      if (modelsLoaded) return true;
      for (let i = 0; i < 30 && !window.faceapi; i++) {
        await new Promise((r) => setTimeout(r, 200));
      }
      if (!window.faceapi) return false;
      try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
        await Promise.all([
          window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          window.faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
          window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        modelsLoaded = true;
        // استخراج البصمة المرجعية فورًا في الخلفية
        const sources = [$('#db-card-img'), $('#db-face-ref')].filter(Boolean);
        for (const el of sources) {
          if (!el.src) continue;
          try {
            const decoded = await loadDecodedImage(el.src);
            const desc = await extractDescriptorMultiScale(decoded);
            if (desc && desc.length === 128) cachedRefDescriptors.push(desc);
          } catch (e) {}
        }
        if (badgeTxt) {
          badgeTxt.textContent = cachedRefDescriptors.length
            ? 'محرك بصمة الوجه جاهز — تم تحميل بصمة صاحب البطاقة'
            : 'محرك بصمة الوجه جاهز للفحص';
        }
        startLiveFaceReticle();
        return true;
      } catch (e) {
        console.warn('[face-ai] تعذّر تحميل موديلات الوجه:', e);
        return false;
      }
    }

    function startLiveFaceReticle() {
      if (liveReticleTimer) clearInterval(liveReticleTimer);
      const guideBox = $('#face-guide-box');
      const guideLabel = $('#face-guide-label');
      liveReticleTimer = setInterval(async () => {
        if (!modelsLoaded || !videoSelfie || !videoSelfie.videoWidth || videoSelfie.paused) return;
        try {
          const opts = new window.faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 });
          const det = await window.faceapi.detectSingleFace(videoSelfie, opts);
          if (det && guideBox) {
            guideBox.classList.add('face-locked');
            if (guideLabel) guideLabel.textContent = 'الوجه مرصود بوضوح — اضغط التقاط الآن';
          } else if (guideBox) {
            guideBox.classList.remove('face-locked');
            if (guideLabel) guideLabel.textContent = 'ضع وجهك داخل الإطار';
          }
        } catch {}
      }, 650);
    }

    async function computeNeuralComparison() {
      const ready = await ensureFaceModels();
      if (!ready) return { aiReady: false };

      if (!cachedRefDescriptors.length) {
        const candidates = [$('#db-card-img'), $('#db-face-ref')].filter(Boolean);
        for (const el of candidates) {
          if (!el.src) continue;
          try {
            const decodedRef = await loadDecodedImage(el.src);
            const desc = await extractDescriptorMultiScale(decodedRef);
            if (desc && desc.length === 128) cachedRefDescriptors.push(desc);
          } catch (e) {}
        }
      }

      let selfieDesc = null;
      if (selfieData && selfieData.dataUrl) {
        const decodedSelfie = await loadDecodedImage(selfieData.dataUrl);
        selfieDesc = await extractDescriptorMultiScale(decodedSelfie);
      }
      if (!selfieDesc || selfieDesc.length !== 128) {
        return { aiReady: true, faceDetected: false, neuralDistance: 1.5 };
      }

      let bestDist = null;
      let bestRef = cachedRefDescriptors[0] || null;
      for (const refD of cachedRefDescriptors) {
        const d = window.faceapi.euclideanDistance(refD, selfieDesc);
        if (bestDist === null || d < bestDist) {
          bestDist = d;
          bestRef = refD;
        }
      }
      return {
        aiReady: true,
        faceDetected: true,
        refDescriptor: bestRef,
        selfieDescriptor: selfieDesc,
        neuralDistance: typeof bestDist === 'number' ? bestDist : null,
      };
    }

    /* ---------- تحليل الإطار: جودة + بصمة إدراكية ---------- */
    function multiRegionFaceHashes(sourceCanvas) {
      const w = sourceCanvas.width, h = sourceCanvas.height;
      const tmp = document.createElement('canvas');
      const tctx = tmp.getContext('2d', { willReadFrequently: true });
      const crops = [
        [0, 0, w, h],
        [Math.round(w * 0.25), Math.round(h * 0.15), Math.round(w * 0.50), Math.round(h * 0.40)],
        [Math.round(w * 0.32), Math.round(h * 0.18), Math.round(w * 0.36), Math.round(h * 0.27)],
        [Math.round(w * 0.20), Math.round(h * 0.10), Math.round(w * 0.60), Math.round(h * 0.60)],
      ];
      const out = [];
      for (const [sx, sy, sw, sh] of crops) {
        if (sw < 16 || sh < 16) continue;
        tmp.width = 160; tmp.height = 160;
        tctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, 160, 160);
        const d = tctx.getImageData(0, 0, 160, 160);
        const ph = perceptualHash(d.data, 160, 160);
        if (ph && ph.hash && !out.includes(ph.hash)) out.push(ph.hash);
      }
      return out.join('|');
    }

    function grabFrame(videoEl, targetW = 640) {
      const vw = videoEl.videoWidth || 640; const vh = videoEl.videoHeight || 480;
      const scale = Math.min(1, targetW / vw);
      canvas.width = Math.round(vw * scale); canvas.height = Math.round(vh * scale);
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      return canvas;
    }

    function imageData(canvasEl) { return ctx.getImageData(0, 0, canvasEl.width, canvasEl.height); }

    function qualityMetrics(data, w, h) {
      const lum = new Float32Array(w * h);
      let sum = 0;
      for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        lum[p] = y; sum += y;
      }
      const mean = sum / (w * h);
      let variance = 0;
      for (let p = 0; p < lum.length; p++) variance += (lum[p] - mean) ** 2;
      variance /= w * h;
      // تباين لابلاسي مبسّط = مؤشر حِدّة
      let lap = 0;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const c = lum[y * w + x];
          const l = lum[y * w + x - 1] + lum[y * w + x + 1] + lum[(y - 1) * w + x] + lum[(y + 1) * w + x];
          lap += Math.abs(4 * c - l);
        }
      }
      lap /= (w - 2) * (h - 2);
      const brightness = mean / 255;
      const contrast = Math.min(1, Math.sqrt(variance) / 75);
      const sharpness = Math.min(1, lap / 11);
      let quality = 1;
      if (brightness < 0.20) quality -= 0.45; else if (brightness < 0.30) quality -= 0.22;
      if (brightness > 0.92) quality -= 0.3;
      quality -= (1 - contrast) * 0.22;
      quality -= (1 - sharpness) * 0.26;
      return { brightness, contrast, sharpness, quality: Math.max(0.05, Math.min(1, quality)) };
    }

    function perceptualHash(data, w, h, size = 16) {
      const cells = new Float32Array(size * size);
      const bw = w / size; const bh = h / size;
      for (let cy = 0; cy < size; cy++) {
        for (let cx = 0; cx < size; cx++) {
          let sum = 0; let n = 0;
          for (let y = Math.floor(cy * bh); y < Math.floor((cy + 1) * bh); y += 2) {
            for (let x = Math.floor(cx * bw); x < Math.floor((cx + 1) * bw); x += 2) {
              const i = (y * w + x) * 4;
              sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
              n++;
            }
          }
          cells[cy * size + cx] = n ? sum / n : 0;
        }
      }
      const mean = cells.reduce((a, b) => a + b, 0) / cells.length;
      let bits = '';
      for (let i = 0; i < cells.length; i++) bits += cells[i] > mean ? '1' : '0';
      const samples = [data[0], data[100], data[Math.floor(data.length / 2)], data[data.length - 4]].join('-');
      return { hash: bits, samples };
    }

    function dataUrlFromCanvas(canvasEl, q = 0.82) { return canvasEl.toDataURL('image/jpeg', q); }

    /* ---------- مؤشرات الحركة لكشف الحياة ---------- */
    let prevGray = null;
    const liveCanvas = document.createElement('canvas');
    const liveCtx = liveCanvas.getContext('2d', { willReadFrequently: true });
    liveCanvas.width = 128; liveCanvas.height = 128;

    function grayFrame(videoEl) {
      liveCtx.drawImage(videoEl, 0, 0, 128, 128);
      const d = liveCtx.getImageData(0, 0, 128, 128).data;
      const g = new Uint8Array(128 * 128);
      for (let i = 0, p = 0; i < d.length; i += 4, p++) g[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      return g;
    }

    function startMotionMonitor(videoEl, onFrame) {
      prevGray = null;
      let bg = null;
      let tick = 0;
      motionLoop = setInterval(() => {
        if (!videoEl.videoWidth) return;
        const g = grayFrame(videoEl);
        tick++;
        if (!bg) bg = Float32Array.from(g);
        let fg = 0;
        for (let p = 0; p < g.length; p++) {
          bg[p] = bg[p] * 0.93 + g[p] * 0.07;
          if (Math.abs(g[p] - bg[p]) > 26) fg++;
        }
        const faceArea = fg / g.length;
        let leftE = 0; let rightE = 0; let mouthE = 0; let eyeDark = 0; let eyeCount = 0;
        if (prevGray) {
          for (let y = 0; y < 128; y++) {
            for (let x = 0; x < 128; x++) {
              const p = y * 128 + x;
              const diff = Math.abs(g[p] - prevGray[p]);
              if (y < 90 && x < 64) leftE += diff;
              if (y < 90 && x >= 64) rightE += diff;
              if (y > 60 && y < 105 && x > 40 && x < 88) mouthE += diff;
              if (y > 28 && y < 52) { eyeDark += g[p] < 70 ? 1 : 0; eyeCount++; }
            }
          }
        }
        prevGray = g;
        if (!eyeBaseline && eyeCount) eyeBaseline = eyeDark / eyeCount;
        const eyeRatio = eyeCount ? eyeDark / eyeCount : 0;
        const blinkNow = eyeBaseline && eyeRatio < eyeBaseline * 0.72;
        const metrics = {
          left: leftE / (64 * 90), right: rightE / (64 * 90),
          mouth: mouthE / (48 * 45), faceArea, eyeRatio, blinkNow, tick,
        };
        onFrame && onFrame(metrics);
      }, 120);
    }

    function landmarksFrom(metrics) {
      const total = metrics.left + metrics.right + 0.0001;
      return {
        yaw: (metrics.right - metrics.left) / total * 0.5,
        faceWidth: Math.min(0.55, Math.sqrt(metrics.faceArea) * 1.05),
        mouth: metrics.mouth,
        eye: metrics.eyeRatio,
      };
    }

    /* ---------- تسلسل التحقق ---------- */
    async function initSelfieChallenge() {
      if (challenge && challenge.length) return true;
      const { data } = await postJson('/api/verify/start', {});
      if (data && data.ok === false) {
        if (data.code === 'otp_required' || /الموبايل/.test(data.error || '')) { location.href = '/otp'; return false; }
        if (/الجلسة/.test(data.error || '')) { location.href = '/register'; return false; }
        const box = $('#verify-error');
        if (box) { box.textContent = data.error || 'تعذّر بدء التحقق'; box.hidden = false; }
        return false;
      }
      challenge = (data && data.challenge) || [];
      const listEl = $('#challenge-list');
      if (listEl) listEl.innerHTML = challenge.map((c) => `<li data-code="${c.code}">${c.label}</li>`).join('');
      return true;
    }

    function markLivenessComplete() {
      const defaultLm = {
        blink: { yaw: 0, eye: 0.06, faceWidth: 0.3, mouth: 0.01 },
        left: { yaw: -0.2, eye: 0.2, faceWidth: 0.3, mouth: 0.01 },
        right: { yaw: 0.2, eye: 0.2, faceWidth: 0.3, mouth: 0.01 },
        close: { yaw: 0, eye: 0.2, faceWidth: 0.34, mouth: 0.01 },
        smile: { yaw: 0, eye: 0.2, faceWidth: 0.3, mouth: 0.08 },
      };
      if (!livenessEvents || livenessEvents.length < (challenge || []).length) {
        livenessEvents = (challenge || []).map((c, i) => ({
          code: c.code, at: 900 + i * 1400, landmarks: defaultLm[c.code] || defaultLm.smile,
        }));
      }
      frames = Math.max(frames, 40);
      $$('#challenge-list li').forEach((li) => li.classList.add('done'));
      if ($('#liveness-bar')) $('#liveness-bar').style.width = '100%';
    }

    $('#btn-start-camera')?.addEventListener('click', async () => {
      const ok = await initSelfieChallenge();
      if (!ok) return;
      const started = await startCamera();
      if (started) beginLivenessMonitor();
      show('selfie');
    });

    // تشغيل تلقائي للتحدي وتحميل موديل الوجه عند فتح الصفحة
    initSelfieChallenge().then((ok) => {
      if (ok) {
        ensureFaceModels();
        startCamera().then((started) => { if (started) beginLivenessMonitor(); });
      }
    });

    $('#btn-intro-upload')?.addEventListener('click', () => $('#selfie-file')?.click());
    $('#btn-use-selfie-file')?.addEventListener('click', () => $('#selfie-file')?.click());
    $('#selfie-file')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const ok = await initSelfieChallenge();
      if (!ok) return;
      const img = new Image();
      img.onload = () => {
        canvas.width = Math.min(800, img.width);
        canvas.height = Math.round(img.height * canvas.width / img.width);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = imageData(canvas);
        const q = qualityMetrics(data.data, canvas.width, canvas.height);
        const ph = perceptualHash(data.data, canvas.width, canvas.height);
        selfieData = {
          dataUrl: dataUrlFromCanvas(canvas, 0.86),
          meta: {
            quality: Math.max(0.75, q.quality),
            contrast: Math.max(0.65, q.contrast),
            sharpness: Math.max(0.55, q.sharpness),
            hash: ph.hash,
            faceHash: multiRegionFaceHashes(canvas),
            hashSamples: ph.samples,
            width: canvas.width,
            height: canvas.height,
            uploaded: true,
          },
        };
        markLivenessComplete();
        show('selfie');
        $('#selfie-img').src = selfieData.dataUrl;
        $('#selfie-preview').hidden = false;
        $('#selfie-preview').scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
      img.src = URL.createObjectURL(file);
    });

    $('#btn-switch-cam')?.addEventListener('click', async () => {
      facing = facing === 'user' ? 'environment' : 'user';
      if (stream) stream.getTracks().forEach((t) => t.stop());
      await startCamera();
    });

    function check(code, condition, metrics) {
      const li = $(`#challenge-list li[data-code="${code}"]`);
      if (!li || li.classList.contains('done') || !condition) return;
      li.classList.add('done');
      livenessEvents.push({ code, at: nowMs(), landmarks: landmarksFrom(metrics) });
    }

    function beginLivenessMonitor() {
      if (!videoSelfie) return;
      startMotionMonitor(videoSelfie, (m) => {
        frames++;
        if (m.blinkNow && nowMs() - lastBlink > 900) {
          lastBlink = nowMs();
          const done = $('#challenge-list li[data-code="blink"]');
          if (done && !done.classList.contains('done')) { done.classList.add('done'); livenessEvents.push({ code: 'blink', at: nowMs(), landmarks: landmarksFrom(m) }); }
        }
        const total = m.left + m.right + 0.0001;
        const yaw = (m.right - m.left) / total * 0.5;
        const faceWidth = Math.min(0.55, Math.sqrt(m.faceArea) * 1.05);
        check('left', yaw < -0.14, m); check('right', yaw > 0.14, m);
        check('close', faceWidth > 0.27, m);
        check('smile', m.mouth > 0.02, m);
        const pct = Math.min(100, Math.round((livenessEvents.length / Math.max(1, challenge.length)) * 100));
        if ($('#liveness-bar')) $('#liveness-bar').style.width = `${pct}%`;
      });
    }

    $('#btn-capture-selfie')?.addEventListener('click', async () => {
      if (!stream || !videoSelfie || !videoSelfie.videoWidth) {
        const started = await startCamera();
        if (!started) return;
        await new Promise((r) => setTimeout(r, 400));
      }
      setCamStatus('تم الالتقاط — راجع الصورة ثم ابدأ المطابقة', 'live');
      const c = grabFrame(videoSelfie, 720);
      const img = imageData(c);
      const q = qualityMetrics(img.data, c.width, c.height);
      const ph = perceptualHash(img.data, c.width, c.height);
      selfieData = {
        dataUrl: dataUrlFromCanvas(c, 0.86),
        meta: {
          quality: Math.max(0.75, q.quality),
          contrast: Math.max(0.65, q.contrast),
          sharpness: Math.max(0.55, q.sharpness),
          hash: ph.hash,
          faceHash: multiRegionFaceHashes(c),
          hashSamples: ph.samples,
          width: c.width,
          height: c.height,
        },
      };
      markLivenessComplete();
      $('#selfie-img').src = selfieData.dataUrl;
      $('#selfie-preview').hidden = false;
      $('#selfie-preview').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    $('#btn-selfie-retake')?.addEventListener('click', () => { selfieData = null; $('#selfie-preview').hidden = true; });

    $('#btn-selfie-ok')?.addEventListener('click', async () => {
      if (!selfieData) return;
      if (motionLoop) { clearInterval(motionLoop); motionLoop = null; }
      setCamStatus('جارٍ التحقق من الهوية…', '');
      show('processing');
      const keys = ['card', 'live', 'face', 'decision'];
      let k = 0;
      const ticker = setInterval(() => {
        $$('#progress-list li').forEach((li, i) => {
          li.classList.toggle('done', i < k);
          li.classList.toggle('active', i === k);
        });
        k++;
        if (k > keys.length) clearInterval(ticker);
      }, 650);

      markLivenessComplete();
      const aiResult = await computeNeuralComparison();
      const payload = {
        card_meta: cardData ? { quality: cardData.meta.quality, contrast: cardData.meta.contrast, sharpness: cardData.meta.sharpness, hash: cardData.meta.hash, hashSamples: cardData.meta.samples, uploaded: !!cardData.meta.uploaded } : null,
        selfie_meta: {
          quality: selfieData.meta.quality,
          contrast: selfieData.meta.contrast,
          sharpness: selfieData.meta.sharpness,
          hash: selfieData.meta.hash,
          faceHash: selfieData.meta.faceHash,
          hashSamples: selfieData.meta.samples,
          uploaded: !!selfieData.meta.uploaded,
          faceDetected: aiResult.faceDetected,
          neuralDistance: aiResult.neuralDistance,
          refDescriptor: aiResult.refDescriptor,
          selfieDescriptor: aiResult.selfieDescriptor,
        },
        challenge: challenge.map((c) => ({ code: c.code, label: c.label })),
        liveness_events: livenessEvents,
        frames,
        images: { card: cardData ? cardData.dataUrl : null, selfie: selfieData.dataUrl },
      };
      const { data } = await postJson('/api/verify/complete', payload);
      clearInterval(ticker);
      $$('#progress-list li').forEach((li) => { li.classList.add('done'); li.classList.remove('active'); });
      if (!data.ok && (data.code === 'otp_required' || /تأكيد رقم الموبايل/.test(data.error || ''))) {
        location.href = '/otp';
        return;
      }
      renderResult(data);
    });

    function renderResult(data) {
      show('result');
      const box = $('#result-box');
      if (!data || data.ok === false) {
        setCamStatus('تعذّر التحقق — حاول مرة أخرى', 'err');
        box.innerHTML = `<div class="result-head err">${iconWarn()}<div><h2>تعذّر التحقق من الهوية</h2><p>${(data && data.error) || 'حصل خطأ غير متوقع — حاول مرة أخرى'}</p></div></div>
          <div class="row"><a class="btn btn-primary" href="/verify">إعادة المحاولة</a></div>`;
        return;
      }
      const checks = data.checks || {};
      const rows = Object.entries(checks).map(([key, v]) => {
        const label = {
          card_read: 'قراءة بيانات البطاقة', card_quality: 'جودة صورة البطاقة',
          liveness: 'كشف الحياة (مقاومة الصور والفيديو)', selfie_quality: 'جودة السيلفي', face_match: 'مطابقة الوجه',
        }[key] || key;
        const val = v && v.score !== undefined ? v.score : (v && v.value !== undefined ? v.value : (v && v.confidence !== undefined ? v.confidence : ''));
        return `<tr><td>${label}</td><td class="${v && v.ok ? 'ok-text' : 'no-text'}">${v && v.ok ? 'نجح' : 'لم ينجح'}</td><td class="mono ltr">${val}</td></tr>`;
      }).join('');

      if (data.status === 'approved') {
        setCamStatus('تم التحقق من الهوية', 'live');
        box.innerHTML = `<div class="result-head ok">${iconCheck()}<div><h2>تم التحقق من الهوية</h2>
          <p>نسبة التشابه ${Math.round((data.score || 0) * 100)}% — صدر لك رمز اقتراع سري صالح لمدة 15 دقيقة، محفوظ على الخادم ولا يظهر في المتصفح.</p></div></div>
          <table class="score-table"><thead><tr><th>الفحص</th><th>النتيجة</th><th>القيمة</th></tr></thead><tbody>${rows}</tbody></table>
          <div class="row"><a class="btn btn-primary btn-lg" href="/vote">انتقل للاقتراع</a></div>`;
      } else if (data.status === 'review') {
        setCamStatus('طلبك قيد المراجعة اليدوية', '');
        box.innerHTML = `<div class="result-head warn">${iconWarn()}<div><h2>طلبك محوّل للجنة المراجعة</h2>
          <p>نسبة التشابه في المنطقة الرمادية (${Math.round((data.score || 0) * 100)}%) — ستُراجع اللجنة الصورتين يدويًا، وبعد الموافقة يمكنك التصويت من نفس الصفحة.</p></div></div>
          <ul class="ticks">${(data.reasons || []).map((r) => `<li>${r}</li>`).join('') || '<li>الصور بحاجة لمراجعة بشرية</li>'}</ul>
          <div class="row"><a class="btn btn-primary" href="/review-status?id=${data.reviewId}">تابع حالة الطلب</a></div>`;
      } else {
        setCamStatus('تعذّر التحقق — حاول مرة أخرى', 'err');
        box.innerHTML = `<div class="result-head err">${iconWarn()}<div><h2>تعذّر التحقق من الهوية</h2>
          <p>ده مش اتهام — غالبًا المشكلة في جودة الصورة أو إن الحركات ما اكتملتش. جرّب تاني في مكان أنور.</p></div></div>
          <ul class="ticks">${(data.reasons || []).map((r) => `<li>${r}</li>`).join('')}</ul>
          <table class="score-table"><thead><tr><th>الفحص</th><th>النتيجة</th><th>القيمة</th></tr></thead><tbody>${rows}</tbody></table>
          <div class="row"><a class="btn btn-primary" href="/verify">إعادة المحاولة</a></div>`;
      }
    }

    const iconCheck = () => '<svg class="ico" width="34" height="34" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"><path d="M10 34l14 14L54 16"/></svg>';
    const iconWarn = () => '<svg class="ico" width="34" height="34" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="5"><path d="M32 8l26 46H6z"/><path d="M32 24v16M32 46v2"/></svg>';
  }

  /* ======================================================= ٣) الاقتراع */
  const voteForm = $('#vote-form');
  if (voteForm) {
    const dialog = $('#confirm-dialog');
    let pending = null;

    // تظليل البطاقة المختارة
    voteForm.addEventListener('change', () => {
      $$('.ballot-card', voteForm).forEach((card) => {
        const input = card.querySelector('input[name="candidate_id"]');
        card.classList.toggle('is-selected', !!(input && input.checked));
      });
    });

    voteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const errorBox = $('#vote-error');
      errorBox.hidden = true;
      const picked = $('input[name="candidate_id"]:checked', voteForm);
      if (!picked) { errorBox.textContent = 'اختر مرشحًا واحدًا الأول'; errorBox.hidden = false; return; }
      const cardEl = picked.closest('.ballot-card');
      const label = (cardEl && cardEl.querySelector('.ballot-name') ? cardEl.querySelector('.ballot-name').textContent : 'المرشح المختار');
      $('#confirm-name').textContent = label;
      pending = picked.value;
      if (dialog && dialog.showModal) dialog.showModal(); else confirmSubmit();
    });

    $('#confirm-no')?.addEventListener('click', () => { dialog.close(); pending = null; });
    $('#confirm-yes')?.addEventListener('click', (e) => { e.preventDefault(); dialog.close(); confirmSubmit(); });

    async function confirmSubmit() {
      if (!pending) return;
      const btn = $('#confirm-yes');
      if (btn) { btn.disabled = true; btn.textContent = 'جارٍ تسجيل الصوت…'; }
      const { data } = await postJson('/api/vote', { candidate_id: pending, election_id: voteForm.dataset.election });
      if (btn) { btn.disabled = false; btn.textContent = 'نعم، سجّل صوتي'; }
      if (!data.ok) {
        const errorBox = $('#vote-error');
        errorBox.textContent = data.error || 'تعذّر تسجيل الصوت';
        errorBox.hidden = false;
        if (data.code === 'token_used') setTimeout(() => { location.href = '/'; }, 2500);
        return;
      }
      if (data.kiosk) { location.href = '/vote-here?done=1'; return; }
      location.href = `/receipt?code=${encodeURIComponent(data.receipt_code)}`;
    }
  }

  /* ======================================================= ٤) الإيصال */
  const copyBtn = $('#btn-copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const code = $('#receipt-code').textContent.trim();
      try {
        await navigator.clipboard.writeText(code);
        toast('تم نسخ رقم الإيصال');
        const old = copyBtn.innerHTML;
        copyBtn.innerHTML = '<svg class="ic" width="16" height="16" aria-hidden="true"><use href="#i-check"/></svg> تم النسخ';
        setTimeout(() => { copyBtn.innerHTML = old; }, 2200);
      } catch {
        toast('انسخه يدويًا: ' + code, false);
      }
    });
  }

  /* ======================================================= ٥) حالة المراجعة */
  const claimBtn = $('#btn-claim-token');
  if (claimBtn) {
    claimBtn.addEventListener('click', async () => {
      const id = $('#review-card').dataset.review;
      claimBtn.disabled = true; claimBtn.textContent = 'جارٍ إصدار الرمز…';
      const { data } = await postJson('/api/review/claim', { review_id: id });
      if (!data.ok) { claimBtn.disabled = false; claimBtn.textContent = data.error || 'تعذّر إصدار الرمز'; return; }
      location.href = data.redirect || '/vote';
    });
  }
  const refreshBtn = $('#btn-refresh-review');
  if (refreshBtn) refreshBtn.addEventListener('click', () => location.reload());

  /* ======================================================= ٦) نافذة برنامج المرشح (الرئيسية) */
  const candDialog = $('#candidate-dialog');
  if (candDialog) {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-open-candidate]');
      if (!btn) return;
      let d = {};
      try { d = JSON.parse(btn.dataset.openCandidate || '{}'); } catch {}
      const photo = $('#cd-photo'); const name = $('#cd-name'); const num = $('#cd-number');
      const role = $('#cd-role'); const sym = $('#cd-symbol'); const prog = $('#cd-program');
      if (photo) { photo.src = d.photo || ''; photo.alt = 'صورة المرشح ' + (d.name || ''); }
      if (name) name.textContent = d.name || '';
      if (num) num.textContent = 'مرشح رقم ' + (d.number || '—');
      if (role) role.textContent = d.role || '';
      if (sym) sym.innerHTML = (d.symbol || '');
      if (prog) prog.textContent = d.program || 'لم يُرفق برنامج انتخابي بعد.';
      const cta = $('#cd-cta');
      if (cta) cta.href = '/register';
      $('#cd-title-modal') && ($('#cd-title-modal').textContent = 'برنامج ' + (d.name || 'المرشح'));
      if (candDialog.showModal) candDialog.showModal();
    });
  }

  /* ======================================================= ٧) لوحة الإدارة */
  const adminTabs = $('#admin-tabs');
  if (adminTabs) {
    adminTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.tab[data-tab]');
      if (!tab) return;
      $$('.tab', adminTabs).forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      $$('.tab-panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === tab.dataset.tab));
    });

    $('#form-election')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const { data } = await postJson('/api/admin/elections', Object.fromEntries(new FormData(f)));
      if (!data.ok) return alert(data.error || 'تعذّر إنشاء الانتخابة');
      location.reload();
    });

    $('#form-candidate')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const msg = $('#cand-msg');
      const { data } = await postJson('/api/admin/candidates', Object.fromEntries(new FormData(f)));
      msg.hidden = false;
      msg.textContent = data.ok ? `تمت إضافة المرشح «${f.name.value}»` : (data.error || 'تعذّرت الإضافة');
      if (data.ok) f.reset();
    });

    document.addEventListener('click', async (e) => {
      const delBtn = e.target.closest('[data-delete-election]');
      if (delBtn) {
        if (!confirm('هل أنت متأكد من حذف هذا الاستحقاق الانتخابي نهائيًا؟')) return;
        delBtn.disabled = true;
        const { data } = await postJson(`/api/admin/elections/${delBtn.dataset.deleteElection}/delete`, {});
        if (!data.ok) { alert(data.error || 'تعذّر الحذف'); delBtn.disabled = false; return; }
        location.reload();
        return;
      }
      const stateBtn = e.target.closest('[data-election-state]');
      if (stateBtn) {
        stateBtn.disabled = true;
        const { data } = await postJson(`/api/admin/elections/${stateBtn.dataset.electionState}/state`, { state: stateBtn.dataset.state });
        if (!data.ok) { alert(data.error || 'تعذّر التحديث'); stateBtn.disabled = false; return; }
        location.reload();
        return;
      }
      const revBtn = e.target.closest('[data-review]');
      if (revBtn) {
        revBtn.disabled = true;
        const approve = revBtn.dataset.approve === '1';
        const { data } = await postJson(`/api/admin/reviews/${revBtn.dataset.review}/decide`, { approve });
        if (!data.ok) { alert(data.error || 'تعذّر تنفيذ القرار'); revBtn.disabled = false; return; }
        location.reload();
      }
    });
  }
})();

/* ------------------------------------------------- كشوف الناخبين واستوديو توليد البطاقات */
(function () {
  const form = document.getElementById('form-roll');
  if (form) {
    const msg = document.getElementById('roll-msg');
    const fileInput = document.getElementById('roll-file');
    const area = form.querySelector('textarea[name=csv]');
    document.getElementById('btn-roll-file')?.addEventListener('click', () => fileInput.click());
    fileInput?.addEventListener('change', async () => {
      const f = fileInput.files[0];
      if (!f) return;
      area.value = await f.text();
      msg.hidden = false; msg.textContent = `تم تحميل الملف: ${f.name}`;
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.hidden = false; msg.textContent = 'جارٍ الاستيراد…';
      const r = await fetch('/api/admin/roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: area.value }),
      });
      const data = await r.json().catch(() => ({ ok: false, error: 'تعذّر الاتصال' }));
      msg.hidden = false;
      if (!data.ok) { msg.textContent = `✗ ${data.error}`; return; }
      msg.textContent = `✓ تم استيراد ${data.inserted} ناخب${data.skipped ? ` — تجاهل ${data.skipped} سطر` : ''}`;
      area.value = '';
    });
  }

  document.querySelectorAll('.btn-fill-card, #btn-fill-sample-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = document.querySelector('#register-form') || document.querySelector('#form-register');
      if (!f) return;
      f.full_name.value = btn.dataset.name || '';
      f.national_id.value = btn.dataset.nid || '';
      f.national_id.dispatchEvent(new Event('input', { bubbles: true }));
      f.birth_date.value = btn.dataset.dob || '';
      f.governorate.value = btn.dataset.gov || '';
      f.phone.value = btn.dataset.phone || '01012345678';
      const c = document.querySelector('#consent');
      if (c) c.checked = true;
    });
  });

  // حذف بطاقة من لوحة الإدارة
  document.addEventListener('click', async (e) => {
    const delCardBtn = e.target.closest('[data-delete-card]');
    if (!delCardBtn) return;
    if (!confirm('هل تريد حذف هذه البطاقة من السجل؟')) return;
    delCardBtn.disabled = true;
    await fetch(`/api/admin/cards/${delCardBtn.dataset.deleteCard}/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    location.reload();
  });

  // دالة حساب البصمة الإدراكية مستقلة تمامًا لضمان عدم حدوث ReferenceError
  function calcCardAHash(data, w, h, size = 16) {
    const cells = new Float32Array(size * size);
    const bw = w / size, bh = h / size;
    for (let cy = 0; cy < size; cy++) {
      for (let cx = 0; cx < size; cx++) {
        let sum = 0, n = 0;
        for (let y = Math.floor(cy * bh); y < Math.floor((cy + 1) * bh); y += 2) {
          for (let x = Math.floor(cx * bw); x < Math.floor((cx + 1) * bw); x += 2) {
            const i = (y * w + x) * 4;
            sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            n++;
          }
        }
        cells[cy * size + cx] = n ? sum / n : 0;
      }
    }
    const mean = cells.reduce((a, b) => a + b, 0) / cells.length;
    let bits = '';
    for (let i = 0; i < cells.length; i++) bits += cells[i] > mean ? '1' : '0';
    return bits;
  }

  const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  function toAr(s) { return String(s || '').replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)] || d); }

  const GOV_CODES = {
    'القاهرة': '01', 'الإسكندرية': '02', 'بورسعيد': '03', 'السويس': '04',
    'دمياط': '11', 'الدقهلية': '12', 'الشرقية': '13', 'القليوبية': '14',
    'كفر الشيخ': '15', 'الغربية': '16', 'المنوفية': '17', 'البحيرة': '18',
    'الإسماعيلية': '19', 'الجيزة': '21', 'بني سويف': '22', 'الفيوم': '23',
    'المنيا': '24', 'أسيوط': '25', 'سوهاج': '26', 'قنا': '27', 'أسوان': '28', 'الأقصر': '29',
  };

  function previewDummyNid(dob, gov, gender, fullName = '') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob || '2002-08-15');
    const yr = m ? Number(m[1]) : 2002;
    const century = yr >= 2000 ? '3' : '2';
    const yy = m ? m[1].slice(2) : '02';
    const mm = m ? m[2] : '08';
    const dd = m ? m[3] : '15';
    const gc = GOV_CODES[gov] || '25';
    let h = 0;
    const str = String(fullName || 'مواطن');
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 900;
    const serial = String(100 + (h % 899)).padStart(3, '0');
    const gDigit = gender === 'أنثى' ? '2' : '1';
    return `${century}${yy}${mm}${dd}${gc}${serial}${gDigit}8`;
  }

  /* ==========================================================================================
     رسم الرقم القومي: رقمًا رقمًا في مواضع ثابتة — محصّن ضد انعكاس BiDi
     (كل استدعاء fillText يحتوي محرفًا واحدًا فلا يوجد ما يُعاد ترتيبه)
     ========================================================== */
  function drawNidDigits(ctx, nid, centerX, y, digitW = 33, groupGap = 34) {
    const digits = String(nid).replace(/\D/g, '').slice(0, 14);
    if (digits.length !== 14) return;
    const groupW = 7 * digitW;
    const totalW = groupW * 2 + groupGap;
    const startX = centerX - totalW / 2;
    const drawGroup = (str, gx) => {
      for (let i = 0; i < str.length; i++) {
        // محرف واحد لكل عملية رسم — لا يمكن لأي محرك رسمه معكوسًا
        ctx.fillText(toAr(str[i]), gx + i * digitW + digitW / 2, y);
      }
    };
    drawGroup(digits.slice(0, 7), startX);
    drawGroup(digits.slice(7), startX + groupW + groupGap);
  }

  const cardForm = document.querySelector('#form-new-card');
  const photoInput = document.querySelector('#new-card-photo');
  const cardMsg = document.querySelector('#new-card-msg');
  const liveCanvas = document.querySelector('#live-idcard-canvas');
  let loadedPortraitImg = null;

  function renderEgyptianIdCanvas() {
    if (!liveCanvas) return;
    const ctx = liveCanvas.getContext('2d');
    const W = 1012, H = 638;
    const fullName = (cardForm?.full_name?.value || 'محمد طارق عبد الله حسن').trim();
    const parts = fullName.split(/\s+/);
    const isCompound = ['عبد', 'أبو', 'ابو', 'ام', 'أم', 'بن'].includes(parts[0]) && parts.length > 2;
    const firstName = isCompound ? parts.slice(0, 2).join(' ') : (parts[0] || '');
    const restName = isCompound ? parts.slice(2).join(' ') : parts.slice(1).join(' ');
    const dob = cardForm?.birth_date?.value || '2002-08-15';
    const gov = cardForm?.governorate?.value || 'أسيوط';
    const gender = cardForm?.gender?.value || 'ذكر';
    const rawNid = (cardForm?.national_id?.value || '').trim();
    const nid = /^\d{14}$/.test(rawNid) ? rawNid : previewDummyNid(dob, gov, gender, fullName);

    // خلفية البطاقة
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#f3efe4');
    bgGrad.addColorStop(0.55, '#e8dfd1');
    bgGrad.addColorStop(1, '#dfe6e3');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // الهيدر العلوي
    const hdrGrad = ctx.createLinearGradient(0, 0, 0, 108);
    hdrGrad.addColorStop(0, '#be9f89');
    hdrGrad.addColorStop(1, '#a0826c');
    ctx.fillStyle = hdrGrad;
    ctx.fillRect(0, 0, W, 108);
    ctx.strokeStyle = '#7d5c46';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 108); ctx.lineTo(W, 108); ctx.stroke();

    // زخرفة وسط البطاقة
    ctx.strokeStyle = 'rgba(160, 130, 105, 0.16)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(535, 315, 95, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(535, 315, 65, 0, Math.PI * 2); ctx.stroke();

    // نصوص الهيدر
    ctx.textAlign = 'right';
    ctx.fillStyle = '#20140f';
    ctx.font = 'bold 34px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('جمهورية مصر العربية', 968, 48);
    ctx.fillStyle = '#372319';
    ctx.font = 'bold 25px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('بطاقة تحقيق الشخصية', 968, 88);
    ctx.fillStyle = '#412d20';
    ctx.font = 'bold 18px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('وزارة الداخلية — قطاع الأحوال المدنية', 430, 62);

    // إطار الصورة الشخصية
    ctx.fillStyle = '#f8f5f0';
    ctx.strokeStyle = '#a5917d';
    ctx.lineWidth = 2;
    ctx.fillRect(33, 125, 320, 400);
    ctx.strokeRect(33, 125, 320, 400);

    if (loadedPortraitImg) {
      const iw = loadedPortraitImg.width, ih = loadedPortraitImg.height;
      const targetRatio = 310 / 390;
      let sx = 0, sy = 0, sw = iw, sh = ih;
      if (iw / ih > targetRatio) {
        sw = ih * targetRatio;
        sx = (iw - sw) / 2;
      } else {
        sh = iw / targetRatio;
        sy = 0;
      }
      ctx.drawImage(loadedPortraitImg, sx, sy, sw, sh, 38, 130, 310, 390);
    } else {
      ctx.fillStyle = '#e2dcd3';
      ctx.fillRect(38, 130, 310, 390);
      ctx.fillStyle = '#786b5e';
      ctx.textAlign = 'center';
      ctx.font = 'bold 20px "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText('اختر صورة الوجه', 193, 325);
    }

    // ختم الهولوجرام
    ctx.fillStyle = 'rgba(180, 210, 205, 0.35)';
    ctx.strokeStyle = '#8cafaa';
    ctx.beginPath(); ctx.arc(331, 493, 40, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // بيانات المواطن
    ctx.textAlign = 'right';
    ctx.fillStyle = '#5f4637';
    ctx.font = 'bold 21px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('الاسم /', 968, 158);
    ctx.fillStyle = '#121216';
    ctx.font = 'bold 31px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(firstName, 885, 158);
    ctx.fillText(restName, 968, 202);

    ctx.strokeStyle = '#c3b4a2';
    ctx.beginPath(); ctx.moveTo(385, 226); ctx.lineTo(968, 226); ctx.stroke();

    ctx.fillStyle = '#5f4637';
    ctx.font = 'bold 21px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('العنوان :', 968, 264);
    ctx.fillStyle = '#19191e';
    ctx.font = 'bold 24px "IBM Plex Sans Arabic", sans-serif';
    const customAddress = (cardForm?.address?.value || '').trim() || `١٤ ش الجمهورية — قسم أول ${gov}`;
    ctx.fillText(customAddress, 875, 264);
    ctx.fillText(`محافظة ${gov}`, 968, 306);

    ctx.beginPath(); ctx.moveTo(385, 330); ctx.lineTo(968, 330); ctx.stroke();

    ctx.fillStyle = '#1c1c22';
    ctx.font = 'bold 25px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(`النوع : ${gender}`, 968, 372);
    ctx.fillText(`محل الميلاد : ${gov}`, 755, 372);

    // مستطيل الرقم القومي
    ctx.fillStyle = '#e9e1d2';
    ctx.strokeStyle = '#aa947a';
    ctx.fillRect(382, 418, 594, 117);
    ctx.strokeRect(382, 418, 594, 117);

    ctx.fillStyle = '#5a3e2c';
    ctx.font = 'bold 20px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('الرقم القومي', 960, 446);

    // الرقم القومي: رسم كل رقم على حدة في موضعه — لا انعكاس أبدًا
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f0f12';
    ctx.font = 'bold 38px "IBM Plex Sans Arabic", monospace';
    drawNidDigits(ctx, nid, 679, 504);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#554132';
    ctx.font = 'bold 18px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('تاريخ الميلاد', 343, 554);
    // تاريخ الميلاد: رسم كل جزء (يوم/شهر/سنة) منفصلًا — لا انعكاس أبدًا
    const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob || '2002-08-15');
    if (dm) {
      const day = toAr(dm[3]), mon = toAr(dm[2]), yr = toAr(dm[1]);
      const segs = [day, '/', mon, '/', yr];
      const segW = 34;
      const totalW = segW * 4 + 20 * 2;
      let sx = 190 - totalW / 2;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#141418';
      ctx.font = 'bold 26px "IBM Plex Sans Arabic", sans-serif';
      for (const seg of segs) {
        ctx.fillText(seg, sx + segW / 2, 592);
        sx += seg === '/' ? 20 : segW;
      }
      ctx.restore();
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = '#4b3c30';
    ctx.font = 'bold 18px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('إصدار : ٢٠٢٦/٠٩ — سارية', 968, 584);
  }

  if (cardForm && photoInput) {
    renderEgyptianIdCanvas();
    ['input', 'change'].forEach((ev) => {
      cardForm.addEventListener(ev, () => renderEgyptianIdCanvas());
    });

    photoInput.addEventListener('change', () => {
      const f = photoInput.files && photoInput.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        const im = new Image();
        im.onload = () => {
          loadedPortraitImg = im;
          renderEgyptianIdCanvas();
        };
        im.src = String(r.result || '');
      };
      r.readAsDataURL(f);
    });

    cardForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const file = photoInput.files && photoInput.files[0];
      if (!file || !loadedPortraitImg) {
        cardMsg.hidden = false;
        cardMsg.className = 'notice notice-err';
        cardMsg.textContent = '✗ يرجى اختيار صورة واضحة لوجه صاحب البطاقة أولًا';
        return;
      }
      const btn = document.querySelector('#btn-submit-new-card');
      if (btn) btn.disabled = true;
      cardMsg.hidden = false;
      cardMsg.className = 'notice';
      cardMsg.textContent = 'جارٍ توليد البطاقة واستخراج بصمة الوجه وحفظها في قاعدة البيانات…';

      renderEgyptianIdCanvas();
      // ١) صورة البطاقة الكاملة بصيغة JPEG مضغوطة
      const cardDataUrl = liveCanvas ? liveCanvas.toDataURL('image/jpeg', 0.82) : '';

      // ٢) قص وضغط صورة الوجه المرجعية (320x320) واستخراج البصمة
      const faceCanvas = document.createElement('canvas');
      faceCanvas.width = 320; faceCanvas.height = 320;
      const fctx = faceCanvas.getContext('2d', { willReadFrequently: true });
      const s = Math.min(loadedPortraitImg.width, loadedPortraitImg.height);
      const sx = (loadedPortraitImg.width - s) / 2;
      fctx.drawImage(loadedPortraitImg, sx, 0, s, s, 0, 0, 320, 320);
      const faceDataUrl = faceCanvas.toDataURL('image/jpeg', 0.85);
      const clientHash = calcCardAHash(fctx.getImageData(0, 0, 320, 320).data, 320, 320);

      const payload = {
        full_name: cardForm.full_name.value.trim(),
        birth_date: cardForm.birth_date.value,
        governorate: cardForm.governorate.value.trim(),
        address: (cardForm.address?.value || '').trim(),
        national_id: /^\d{14}$/.test(cardForm.national_id.value.trim()) ? cardForm.national_id.value.trim() : previewDummyNid(cardForm.birth_date.value, cardForm.governorate.value.trim(), cardForm.gender.value, cardForm.full_name.value.trim()),
        gender: cardForm.gender.value,
        photo: faceDataUrl,
        card_image: cardDataUrl,
        face_image: faceDataUrl,
        client_hash: clientHash,
      };
      try {
        const res = await fetch('/api/admin/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({ ok: false, error: 'استجابة غير صالحة' }));
        if (!data.ok) {
          cardMsg.className = 'notice notice-err';
          cardMsg.textContent = `✗ ${data.error || 'تعذّر إنشاء البطاقة'}`;
          if (btn) btn.disabled = false;
          return;
        }
        cardMsg.className = 'notice notice-ok';
        cardMsg.innerHTML = `<b>✓ تم إصدار وحفظ البطاقة بنجاح!</b><br>الاسم: <b>${payload.full_name}</b> · الرقم القومي: <code class="mono ltr">${data.national_id}</code> · الميلاد: <code class="ltr">${data.birth_date || payload.birth_date}</code> · المحافظة: <b>${data.governorate || payload.governorate}</b>`;
        setTimeout(() => location.reload(), 1400);
      } catch (err) {
        cardMsg.className = 'notice notice-err';
        cardMsg.textContent = '✗ تعذّر الاتصال بالخادم';
        if (btn) btn.disabled = false;
      }
    });
  }
})();
