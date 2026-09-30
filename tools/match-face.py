#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
مقارنة وجه السيلفي الحي بوجه البطاقة المسجّلة في قاعدة البيانات (OpenCV + Perceptual Hash + Histogram)
يُستدعى عندما لا يكون هناك مزوّد خارجي مدفوع (وضع المحرك المحلي الذكي).
"""
import sys, os, json, base64, io
import cv2, numpy as np
from PIL import Image

def compute_ahash(pil_img, size=16):
    im = pil_img.convert('RGB').resize((size, size), Image.BILINEAR)
    arr = np.array(im, dtype=np.float32)
    lum = 0.299 * arr[..., 0] + 0.587 * arr[..., 1] + 0.114 * arr[..., 2]
    avg = float(lum.mean())
    return ''.join('1' if v >= avg else '0' for v in lum.flatten())

def hamming_sim(h1, h2):
    if not h1 or not h2 or len(h1) != len(h2):
        return 0.0
    return sum(1 for a, b in zip(h1, h2) if a == b) / float(len(h1))

def extract_face(pil_img):
    W0, H0 = pil_img.size
    bgr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = cascade.detectMultiScale(gray, 1.1, 4, minSize=(max(48, W0 // 14), max(48, H0 // 14)))
    if len(faces) > 0:
        faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
        fx, fy, fw, fh = [int(v) for v in faces[0]]
        pad = int(fw * 0.22)
        x1, y1 = max(0, fx - pad), max(0, fy - pad)
        x2, y2 = min(W0, fx + fw + pad), min(H0, fy + fh + pad)
        return pil_img.crop((x1, y1, x2, y2)).resize((256, 256), Image.LANCZOS), True
    # Fallback center crop
    side = min(W0, H0)
    x1 = (W0 - side) // 2
    y1 = max(0, (H0 - side) // 4)
    return pil_img.crop((x1, y1, x1 + side, y1 + side)).resize((256, 256), Image.LANCZOS), False

def compare_faces(ref_face_path, selfie_b64, stored_hashes=''):
    ref_pil = Image.open(ref_face_path).convert('RGB').resize((256, 256), Image.LANCZOS)
    raw = base64.b64decode(selfie_b64)
    selfie_pil = Image.open(io.BytesIO(raw)).convert('RGB')
    selfie_face, found_face = extract_face(selfie_pil)

    # 1. Multi-hash similarity (against full selfie and extracted face)
    h_selfie_full = compute_ahash(selfie_pil)
    h_selfie_face = compute_ahash(selfie_face)
    h_ref_face = compute_ahash(ref_pil)

    candidates = [h_ref_face] + [h for h in (stored_hashes or '').split('|') if len(h) == 256]
    best_hash_sim = max(
        max((hamming_sim(h_selfie_face, c) for c in candidates), default=0.0),
        max((hamming_sim(h_selfie_full, c) for c in candidates), default=0.0),
    )

    # 2. Normalized grayscale template & HSV histogram correlation on inner face region
    ref_np = cv2.cvtColor(np.array(ref_pil)[32:224, 32:224], cv2.COLOR_RGB2BGR)
    slf_np = cv2.cvtColor(np.array(selfie_face)[32:224, 32:224], cv2.COLOR_RGB2BGR)

    ref_g = cv2.equalizeHist(cv2.cvtColor(ref_np, cv2.COLOR_BGR2GRAY))
    slf_g = cv2.equalizeHist(cv2.cvtColor(slf_np, cv2.COLOR_BGR2GRAY))
    corr = float(cv2.matchTemplate(ref_g, slf_g, cv2.TM_CCOEFF_NORMED)[0][0])
    corr_norm = max(0.0, min(1.0, (corr + 0.2) / 1.1))

    ref_hsv = cv2.cvtColor(ref_np, cv2.COLOR_BGR2HSV)
    slf_hsv = cv2.cvtColor(slf_np, cv2.COLOR_BGR2HSV)
    h1 = cv2.calcHist([ref_hsv], [0, 1], None, [24, 24], [0, 180, 0, 256])
    h2 = cv2.calcHist([slf_hsv], [0, 1], None, [24, 24], [0, 180, 0, 256])
    cv2.normalize(h1, h1, 0, 1, cv2.NORM_MINMAX)
    cv2.normalize(h2, h2, 0, 1, cv2.NORM_MINMAX)
    hist_sim = max(0.0, float(cv2.compareHist(h1, h2, cv2.HISTCMP_CORREL)))

    combined = max(best_hash_sim, 0.50 * best_hash_sim + 0.35 * corr_norm + 0.15 * hist_sim)
    if combined >= 0.76:
        score = 0.78 + (combined - 0.76) * 0.75
    elif combined >= 0.58:
        score = 0.54 + (combined - 0.58) * 1.3
    else:
        score = 0.12 + combined * 0.65
    score = round(max(0.05, min(0.98, score)), 3)
    return {
        'ok': True,
        'score': score,
        'similarity': round(combined, 3),
        'face_detected': found_face,
    }

if __name__ == '__main__':
    payload = json.loads(sys.stdin.read())
    res = compare_faces(payload['ref_face_path'], payload['selfie_b64'], payload.get('stored_hashes', ''))
    print(json.dumps(res))
