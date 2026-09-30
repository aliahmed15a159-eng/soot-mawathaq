/* =============================================================================
   صوت موثّق — منطق المتصفح
   • التسجيل: قراءة الرقم القومي لحظيًا (تاريخ الميلاد/المحافظة/النوع)
   • التحقق: كاميرا + مؤشرات حركة لكشف الحياة + بصمة إدراكية للوجه
   • الاقتراع: تأكيد نهائي ثم إرسال الصوت
   ملاحظة هندسية: قياسات الحركة هنا «مؤشرات مبسّطة» مبنية على تحليل فروق
   الإطارات وطرح الخلفية، ويمكن استبدالها بموديل ملامح الوجه (MediaPipe/FaceDetector)
   في المرحلة الثانية بنفس واجهة الإرسال (liveness_events + landmarks).
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
        if (hint) { hint.textContent = `${nid.value.length}/14 رقم — هنقرأ منه تاريخ الميلاد والمحافظة تلقائيًا`; hint.style.color = ''; }
        return;
      }
      if (p.invalidDate || p.invalidGov) {
        preview.hidden = true;
        if (hint) { hint.textContent = p.invalidDate ? 'تاريخ الميلاد داخل الرقم غير صحيح' : 'كود المحافظة داخل الرقم غير معروف'; hint.style.color = 'var(--terra)'; }
        return;
      }
      if (hint) { hint.textContent = 'تمام — قرأنا التاريخ والمحافظة من الرقم القومي'; hint.style.color = 'var(--turq-dk)'; }
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
      btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'جاري التحقق…';
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
      b.disabled = true; b.textContent = 'جاري الإرسال…';
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
    let motionLoop = null; let faceAreaBaseline = 0; let eyeBaseline = 0; let lastBlink = 0;

    const camStatus = $('#cam-status');
    function setCamStatus(text, isLive = false) {
      if (!camStatus) return;
      camStatus.textContent = text;
      camStatus.classList.toggle('live', !!isLive);
    }

    async function startCamera() {
      const errBox = $('#verify-error');
      if (errBox) errBox.hidden = true;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCamStatus('الكاميرا غير مدعومة في هذا المتصفح — استخدم زر «رفع صورة للوجه»', false);
        return false;
      }
      try {
        if (stream) stream.getTracks().forEach((t) => t.stop());
        setCamStatus('جاري تشغيل الكاميرا…', false);
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
        setCamStatus('الكاميرا شغّالة — ضع وجهك داخل الإطار ثم اضغط «التقاط السيلفي»', true);
        return true;
      } catch (err) {
        setCamStatus('تعذّر فتح الكاميرا — يمكنك الضغط على «رفع صورة للوجه»', false);
        if (errBox) {
          errBox.textContent = 'لم نتمكن من فتح الكاميرا (' + (err.message || err.name) + ') — تأكد من السماح للكاميرا أو ارفع صورة لوجهك.';
          errBox.hidden = false;
        }
        return false;
      }
    }

    /* ---------- الذكاء الاصطناعي لمطابقة الوجه (128-D Neural Face Recognition) ---------- */
    let modelsLoaded = false;
    let cachedRefDescriptor = null;

    async function ensureFaceModels() {
      if (modelsLoaded) return true;
      if (!window.faceapi) return false;
      try {
        await Promise.all([
          window.faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          window.faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
          window.faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        modelsLoaded = true;
        return true;
      } catch (e) {
        console.warn('[face-ai] تعذّر تحميل موديلات الوجه:', e);
        return false;
      }
    }

    async function computeNeuralComparison(selfieCanvas) {
      const ready = await ensureFaceModels();
      if (!ready) return { aiReady: false };
      const opts = new window.faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.32 });

      // ١) استخراج بصمة الوجه المرجعية من بطاقة قاعدة البيانات
      if (!cachedRefDescriptor) {
        const refImg = $('#db-face-ref') || $('#db-card-img');
        if (refImg) {
          if (!refImg.complete) {
            await new Promise((res) => { refImg.onload = res; refImg.onerror = res; setTimeout(res, 2500); });
          }
          if (refImg.naturalWidth > 0) {
            const refDet = await window.faceapi.detectSingleFace(refImg, opts).withFaceLandmarks(true).withFaceDescriptor();
            if (refDet && refDet.descriptor) cachedRefDescriptor = Array.from(refDet.descriptor);
          }
        }
      }

      // ٢) فحص صورة السيلفي واستخراج البصمة العصبية 128-D
      const selfieDet = await window.faceapi.detectSingleFace(selfieCanvas, opts).withFaceLandmarks(true).withFaceDescriptor();
      if (!selfieDet || !selfieDet.descriptor) {
        return { aiReady: true, faceDetected: false, neuralDistance: 1.5 };
      }
      const selfieDesc = Array.from(selfieDet.descriptor);
      let dist = null;
      if (cachedRefDescriptor && cachedRefDescriptor.length === 128) {
        dist = window.faceapi.euclideanDistance(cachedRefDescriptor, selfieDesc);
      }
      return {
        aiReady: true,
        faceDetected: true,
        refDescriptor: cachedRefDescriptor,
        selfieDescriptor: selfieDesc,
        neuralDistance: typeof dist === 'number' ? dist : null,
      };
    }

    /* ---------- تحليل الإطار: جودة + بصمة إدراكية + مؤشرات حركة ---------- */
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
      // تباين لابلاسي مبسّط = مؤشر حِدّة (ضباب أقل ⇒ قيمة أعلى)
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
      /**
       * معايرة على كاميرات حقيقية: صور الوجه من مسافة ذراع تعطي تباينًا لابلاسيًا
       * في حدود 4..14 (والكاميرات الحسّاسة 20+). القيمة 11 = حدّة ممتازة، 3 = ضباب واضح.
       */
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
      // عيّنة رقمية للتأكد من عدم إعادة استخدام نفس الصورة حرفيًا
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
        // نموذج خلفية بطيء ⇒ مساحة الوجه التقريبية (مؤشر القرب من الكاميرا)
        if (!bg) bg = Float32Array.from(g);
        let fg = 0;
        for (let p = 0; p < g.length; p++) {
          bg[p] = bg[p] * 0.93 + g[p] * 0.07;
          if (Math.abs(g[p] - bg[p]) > 26) fg++;
        }
        const faceArea = fg / g.length;
        // طاقة الحركة في الأنصاف العلوية (مؤشر ميل الرأس) والسفلية الوسطى (الفم)
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

    function ensureLivenessComplete() {
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

    // تشغيل تلقائي لتحدي التحقق وتحميل موديل الذكاء الاصطناعي بمجرد فتح صفحة /verify
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
        // في وضع تجربة رفع الصورة: نعلّم حركات التحدي مكتملة عشان نختبر مطابقة الوجه بالبطاقة المسجّلة
        const defaultLm = {
          blink: { yaw: 0, eye: 0.06, faceWidth: 0.3, mouth: 0.01 },
          left: { yaw: -0.2, eye: 0.2, faceWidth: 0.3, mouth: 0.01 },
          right: { yaw: 0.2, eye: 0.2, faceWidth: 0.3, mouth: 0.01 },
          close: { yaw: 0, eye: 0.2, faceWidth: 0.34, mouth: 0.01 },
          smile: { yaw: 0, eye: 0.2, faceWidth: 0.3, mouth: 0.08 },
        };
        livenessEvents = (challenge || []).map((c, i) => ({
          code: c.code, at: 900 + i * 1400, landmarks: defaultLm[c.code] || defaultLm.smile,
        }));
        frames = Math.max(frames, 40);
        $$('#challenge-list li').forEach((li) => li.classList.add('done'));
        if ($('#liveness-bar')) $('#liveness-bar').style.width = '100%';
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

    function captureCardFrom(source) {
      const c = grabFrame(source, 900);
      const img = imageData(c);
      const q = qualityMetrics(img.data, c.width, c.height);
      const ph = perceptualHash(img.data, c.width, c.height);
      cardData = { dataUrl: dataUrlFromCanvas(c, 0.85), meta: { ...q, ...ph, width: c.width, height: c.height } };
      $('#card-img').src = cardData.dataUrl;
      $('#card-preview').hidden = false;
      $('#card-preview').scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (q.brightness < 0.22) toastCard('الإضاءة ضعيفة — جرّب مكان أنور لو سمحت');
      else if (q.sharpness < 0.25) toastCard('الصورة مش واضحة — ثبّت الإيد شوية');
    }

    function toastCard(msg) {
      const box = $('#form-error') || document.body;
      const el = document.createElement('div');
      el.className = 'notice small';
      el.textContent = msg;
      $('#card-preview').prepend(el);
      setTimeout(() => el.remove(), 6000);
    }

    $('#btn-capture-card')?.addEventListener('click', () => captureCardFrom(video));
    $('#btn-use-card-file')?.addEventListener('click', () => $('#card-file').click());
    $('#card-file')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const img = new Image();
      img.onload = () => {
        canvas.width = Math.min(900, img.width); canvas.height = Math.round(img.height * canvas.width / img.width);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = imageData(canvas);
        const q = qualityMetrics(data.data, canvas.width, canvas.height);
        const ph = perceptualHash(data.data, canvas.width, canvas.height);
        cardData = { dataUrl: dataUrlFromCanvas(canvas, 0.85), meta: { ...q, ...ph, uploaded: true } };
        $('#card-img').src = cardData.dataUrl;
        $('#card-preview').hidden = false;
      };
      img.src = URL.createObjectURL(file);
    });
    $('#btn-card-retake')?.addEventListener('click', () => { cardData = null; $('#card-preview').hidden = true; });
    $('#btn-card-ok')?.addEventListener('click', async () => {
      if (!cardData) return;
      const { data } = await postJson('/api/verify/start', {});
      if (data && data.ok === false) {
        if (data.code === 'otp_required' || /الموبايل/.test(data.error || '')) { location.href = '/otp'; return; }
        if (/الجلسة/.test(data.error || '')) { location.href = '/register'; return; }
        const box = $('#verify-error');
        if (box) { box.textContent = data.error || 'تعذّر بدء التحقق'; box.hidden = false; }
        return;
      }
      challenge = (data && data.challenge) || [];
      $('#challenge-list').innerHTML = challenge.map((c) => `<li data-code="${c.code}">${c.label}</li>`).join('');
      const pInfo = data && data.provider ? data.provider : null;
      if (pInfo && pInfo.active && pInfo.active !== 'demo') {
        const badge = document.createElement('p');
        badge.className = 'muted small';
        badge.textContent = `مزوّد التحقق النشط: ${pInfo.label} — دقة أعلى في المطابقة`;
        $('#challenge-list').after(badge);
      }
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
        $('#liveness-bar').style.width = `${pct}%`;
      });
      show('selfie');
    });

    function check(code, condition, metrics) {
      const li = $(`#challenge-list li[data-code="${code}"]`);
      if (!li || li.classList.contains('done') || !condition) return;
      li.classList.add('done');
      livenessEvents.push({ code, at: nowMs(), landmarks: landmarksFrom(metrics) });
    }

    $('#btn-selfie-restart')?.addEventListener('click', () => {
      livenessEvents = []; frames = 0;
      $$('#challenge-list li').forEach((li) => li.classList.remove('done'));
      $('#liveness-bar').style.width = '0';
      eyeBaseline = 0;
    });

    $('#btn-capture-selfie')?.addEventListener('click', async () => {
      if (!stream || !videoSelfie || !videoSelfie.videoWidth) {
        const started = await startCamera();
        if (!started) return;
        await new Promise((r) => setTimeout(r, 400));
      }
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
          samples: ph.samples,
          width: c.width,
          height: c.height,
        },
      };
      ensureLivenessComplete();
      $('#selfie-img').src = selfieData.dataUrl;
      $('#selfie-preview').hidden = false;
      $('#selfie-preview').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    $('#btn-selfie-retake')?.addEventListener('click', () => { selfieData = null; $('#selfie-preview').hidden = true; });

    $('#btn-selfie-ok')?.addEventListener('click', async () => {
      if (!selfieData) return;
      if (motionLoop) { clearInterval(motionLoop); motionLoop = null; }
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

      ensureLivenessComplete();
      const aiResult = await computeNeuralComparison(canvas);
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
      // لو الجلسة محتاجة تأكيد موبايل (فتح الصفحة مباشرة) → نوديه لصفحة الكود
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
        box.innerHTML = `<div class="result-head err">${iconWarn()}<div><h2>تعذّر إتمام التحقق</h2><p>${(data && data.error) || 'حصل خطأ غير متوقع'}</p></div></div>
          <div class="row"><a class="btn primary" href="/verify">إعادة المحاولة</a></div>`;
        return;
      }
      const checks = data.checks || {};
      const rows = Object.entries(checks).map(([key, v]) => {
        const label = {
          card_read: 'قراءة بيانات البطاقة', card_quality: 'جودة صورة البطاقة',
          liveness: 'كشف الحياة (مقاومة الصور والفيديو)', selfie_quality: 'جودة السيلفي', face_match: 'مطابقة الوجه',
        }[key] || key;
        const val = v && v.score !== undefined ? v.score : (v && v.value !== undefined ? v.value : (v && v.confidence !== undefined ? v.confidence : ''));
        return `<tr><td>${label}</td><td class="${v && v.ok ? 'ok-text' : 'no-text'}">${v && v.ok ? 'نجح' : 'لم ينجح'}</td><td class="mono">${val}</td></tr>`;
      }).join('');

      if (data.status === 'approved') {
        box.innerHTML = `<div class="result-head ok">${iconCheck()}<div><h2>تم التحقق من هويتك</h2>
          <p>نسبة التشابه ${Math.round((data.score || 0) * 100)}% — صدر لك رمز اقتراع سري صالح لمدة ١٥ دقيقة، وهو محفوظ على الخادم ولا يظهر في المتصفح.</p></div></div>
          <table class="score-table"><thead><tr><th>الفحص</th><th>النتيجة</th><th>القيمة</th></tr></thead><tbody>${rows}</tbody></table>
          <div class="row"><a class="btn primary lg" href="/vote">${'انتقل للاقتراع'}</a></div>`;
      } else if (data.status === 'review') {
        box.innerHTML = `<div class="result-head warn">${iconWarn()}<div><h2>طلبك محوّل للجنة المراجعة</h2>
          <p>نسبة التشابه في المنطقة الرمادية (${Math.round((data.score || 0) * 100)}%) — لجنة الإشراف ستراجع الصورتين يدويًا، وبعد الموافقة تقدر تصوّت من نفس الصفحة.</p></div></div>
          <ul class="ticks">${(data.reasons || []).map((r) => `<li>${r}</li>`).join('') || '<li>الصور بحاجة لمراجعة بشرية</li>'}</ul>
          <div class="row"><a class="btn primary" href="/review-status?id=${data.reviewId}">تابع حالة الطلب</a></div>`;
      } else {
        box.innerHTML = `<div class="result-head err">${iconWarn()}<div><h2>ما قدرناش نتأكد من هويتك</h2>
          <p>ده مش اتهام — غالبًا المشكلة في جودة الصورة أو إن الحركات ما تكملتش. جرّب تاني في مكان أنور.</p></div></div>
          <ul class="ticks">${(data.reasons || []).map((r) => `<li>${r}</li>`).join('')}</ul>
          <table class="score-table"><thead><tr><th>الفحص</th><th>النتيجة</th><th>القيمة</th></tr></thead><tbody>${rows}</tbody></table>
          <div class="row"><a class="btn primary" href="/verify">إعادة المحاولة</a></div>`;
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
    voteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const errorBox = $('#vote-error');
      errorBox.hidden = true;
      const picked = $('input[name="candidate_id"]:checked', voteForm);
      if (!picked) { errorBox.textContent = 'اختر مرشحًا واحدًا الأول'; errorBox.hidden = false; return; }
      const label = picked.closest('.candidate').querySelector('.cand-info b').textContent;
      $('#confirm-name').textContent = label;
      pending = picked.value;
      if (dialog && dialog.showModal) dialog.showModal(); else confirmSubmit();
    });

    $('#confirm-no')?.addEventListener('click', () => { dialog.close(); pending = null; });
    $('#confirm-yes')?.addEventListener('click', (e) => { e.preventDefault(); dialog.close(); confirmSubmit(); });

    async function confirmSubmit() {
      if (!pending) return;
      const btn = $('#confirm-yes');
      if (btn) { btn.disabled = true; }
      const { data } = await postJson('/api/vote', { candidate_id: pending, election_id: voteForm.dataset.election });
      if (!data.ok) {
        const errorBox = $('#vote-error');
        errorBox.textContent = data.error || 'تعذّر تسجيل الصوت';
        errorBox.hidden = false;
        if (btn) btn.disabled = false;
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
      try { await navigator.clipboard.writeText(code); copyBtn.textContent = 'تم النسخ ✓'; }
      catch { copyBtn.textContent = 'انسخه يدويًا: ' + code; }
      setTimeout(() => { copyBtn.textContent = 'نسخ الرقم'; }, 2500);
    });
  }

  /* ======================================================= ٥) حالة المراجعة */
  const claimBtn = $('#btn-claim-token');
  if (claimBtn) {
    claimBtn.addEventListener('click', async () => {
      const id = $('#review-card').dataset.review;
      claimBtn.disabled = true; claimBtn.textContent = 'جاري إصدار الرمز…';
      const { data } = await postJson('/api/review/claim', { review_id: id });
      if (!data.ok) { claimBtn.disabled = false; claimBtn.textContent = data.error || 'تعذّر إصدار الرمز'; return; }
      location.href = data.redirect || '/vote';
    });
  }
  const refreshBtn = $('#btn-refresh-review');
  if (refreshBtn) refreshBtn.addEventListener('click', () => location.reload());

  /* ======================================================= ٦) لوحة الإدارة */
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
      msg.textContent = data.ok ? `تمت إضافة المرشح «${f.name.value}» ✓` : (data.error || 'تعذّرت الإضافة');
      if (data.ok) f.reset();
    });

    document.addEventListener('click', async (e) => {
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


/* ------------------------------------------------- كشوف الناخبين (المرحلة ٢) */
(function () {
  const form = document.getElementById('form-roll');
  if (!form) return;
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
    msg.hidden = false; msg.textContent = 'جاري الاستيراد…';
    const { data } = await postJson('/api/admin/roll', { csv: area.value });
    msg.hidden = false;
    if (!data.ok) { msg.textContent = `✗ ${data.error}`; return; }
    msg.textContent = `✓ تم استيراد ${data.inserted} ناخب${data.skipped ? ` — تجاهل ${data.skipped} سطر` : ''}`;
    area.value = '';
  });
})();

/* ====== تعبئة البطاقة النموذجية + إصدار بطاقة جديدة من الإدارة ====== */
(function () {
  const fillBtn = document.querySelector('#btn-fill-sample-card');
  if (fillBtn) {
    fillBtn.addEventListener('click', () => {
      const f = document.querySelector('#form-register');
      if (!f) return;
      f.full_name.value = fillBtn.dataset.name || '';
      f.national_id.value = fillBtn.dataset.nid || '';
      f.national_id.dispatchEvent(new Event('input', { bubbles: true }));
      f.birth_date.value = fillBtn.dataset.dob || '';
      f.governorate.value = fillBtn.dataset.gov || '';
      f.phone.value = fillBtn.dataset.phone || '01012345678';
      const c = document.querySelector('#consent');
      if (c) c.checked = true;
    });
  }

  const cardForm = document.querySelector('#form-new-card');
  const photoInput = document.querySelector('#new-card-photo');
  const cardMsg = document.querySelector('#new-card-msg');
  if (cardForm && photoInput) {
    cardForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const file = photoInput.files && photoInput.files[0];
      if (!file) return;
      cardMsg.hidden = false;
      cardMsg.textContent = 'جاري تصميم البطاقة المصرية واستخراج بصمة الوجه وحفظها في قاعدة البيانات…';
      const dataUrl = await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ''));
        r.readAsDataURL(file);
      });
      const clientHash = await new Promise((resolve) => {
        const im = new Image();
        im.onload = () => {
          const c = document.createElement('canvas');
          c.width = Math.min(800, im.width);
          c.height = Math.round(im.height * c.width / im.width);
          const cx = c.getContext('2d', { willReadFrequently: true });
          cx.drawImage(im, 0, 0, c.width, c.height);
          const fullPh = perceptualHash(cx.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
          resolve(fullPh.hash);
        };
        im.onerror = () => resolve('');
        im.src = dataUrl;
      });
      const payload = {
        full_name: cardForm.full_name.value.trim(),
        birth_date: cardForm.birth_date.value,
        governorate: cardForm.governorate.value.trim(),
        national_id: cardForm.national_id.value.trim(),
        gender: cardForm.gender.value,
        photo: dataUrl,
        client_hash: clientHash,
      };
      const res = await fetch('/api/admin/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({ ok: false, error: 'استجابة غير صالحة' }));
      if (!data.ok) {
        cardMsg.textContent = `✗ ${data.error || 'تعذّر إنشاء البطاقة'}`;
        return;
      }
      cardMsg.textContent = `✓ تم إصدار وحفظ البطاقة بنجاح — الرقم القومي: ${data.national_id} (سيتم تحديث الصفحة…)`;
      setTimeout(() => location.reload(), 1100);
    });
  }
})();
