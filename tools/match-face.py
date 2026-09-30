#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, json, base64, io
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
    faces = cascade.detectMultiScale(gray, 1.1, 5, minSize=(max(48, W0 // 14), max(48, H0 // 14)))
    if len(faces) > 0:
        faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
        fx, fy, fw, fh = [int(v) for v in faces[0]]
        pad = int(fw * 0.18)
        x1, y1 = max(0, fx - pad), max(0, fy - pad)
        x2, y2 = min(W0, fx + fw + pad), min(H0, fy + fh + pad)
        return pil_img.crop((x1, y1, x2, y2)).resize((256, 256), Image.LANCZOS), True
    return pil_img.resize((256, 256), Image.LANCZOS), False

def compare_faces(ref_face_path, selfie_b64, stored_hashes=''):
    ref_pil = Image.open(ref_face_path).convert('RGB').resize((256, 256), Image.LANCZOS)
    raw = base64.b64decode(selfie_b64)
    selfie_pil = Image.open(io.BytesIO(raw)).convert('RGB')
    selfie_face, found_face = extract_face(selfie_pil)
    if not found_face:
        return {'ok': True, 'score': 0.12, 'similarity': 0.12, 'face_detected': False}

    # Strict face-to-face comparison only (no multi-hash wildcard!)
    face_hash_sim = hamming_sim(compute_ahash(ref_pil), compute_ahash(selfie_face))

    ref_np = cv2.cvtColor(np.array(ref_pil)[36:220, 36:220], cv2.COLOR_RGB2BGR)
    slf_np = cv2.cvtColor(np.array(selfie_face)[36:220, 36:220], cv2.COLOR_RGB2BGR)

    ref_g = cv2.equalizeHist(cv2.cvtColor(ref_np, cv2.COLOR_BGR2GRAY))
    slf_g = cv2.equalizeHist(cv2.cvtColor(slf_np, cv2.COLOR_BGR2GRAY))
    corr = float(cv2.matchTemplate(ref_g, slf_g, cv2.TM_CCOEFF_NORMED)[0][0])

    # Require BOTH high template correlation AND high face aHash similarity
    if corr >= 0.55 and face_hash_sim >= 0.78:
        score = min(0.97, 0.76 + (corr - 0.55) * 0.48)
    else:
        score = max(0.10, min(0.42, 0.25 + corr * 0.30))

    return {
        'ok': True,
        'score': round(score, 3),
        'similarity': round(corr, 3),
        'face_detected': True,
    }

if __name__ == '__main__':
    payload = json.loads(sys.stdin.read())
    res = compare_faces(payload['ref_face_path'], payload['selfie_b64'], payload.get('stored_hashes', ''))
    print(json.dumps(res))
