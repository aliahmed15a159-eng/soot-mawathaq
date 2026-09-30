#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
مولّد بطاقة الرقم القومي المصرية النموذجية لمنصة «صوت موثّق»
ينشئ صورة بطاقة مصرية عالية الدقة + صورة مقصوصة للوجه + بصمة الوجه (aHash 256-bit)
"""
import sys, os, json, argparse
import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CAIRO_BOLD = os.path.join(ROOT, 'tools', 'cairo.ttf')
CARDS_DIR = os.path.join(ROOT, 'public', 'cards')
os.makedirs(CARDS_DIR, exist_ok=True)

AR_DIGITS = str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩')

def to_ar_digits(s):
    return str(s).translate(AR_DIGITS)

def compute_ahash_256(pil_img, resample=Image.BILINEAR):
    """نفس خوارزمية perceptualHash في public/app.js (16x16 grayscale average hash)"""
    im = pil_img.convert('RGB').resize((16, 16), resample)
    arr = np.array(im, dtype=np.float32)
    lum = 0.299 * arr[..., 0] + 0.587 * arr[..., 1] + 0.114 * arr[..., 2]
    avg = float(lum.mean())
    bits = ''.join('1' if v >= avg else '0' for v in lum.flatten())
    return bits

def compute_multi_hashes(src_pil, face_crop, portrait, card):
    """توليد بصمات متعددة تغطي: الوجه المقصوص، البورتريه، الصورة الأصلية، والمنطقة الوسطى العلوية (كما يفعل المتصفح)"""
    W, H = src_pil.size
    # نفس القصّات النسبية التي يحسبها المتصفح في public/app.js
    center_upper = src_pil.crop((int(W * 0.25), int(H * 0.15), int(W * 0.75), int(H * 0.55)))
    center_tight = src_pil.crop((int(W * 0.32), int(H * 0.18), int(W * 0.68), int(H * 0.45)))
    # محاكاة تصغير المتصفح إلى عرض 800 قبل حساب البصمة
    scale_w = min(800, W)
    scale_h = max(1, round(H * scale_w / W))
    resized_800 = src_pil.resize((scale_w, scale_h), Image.LANCZOS)
    hashes = []
    for im in [face_crop, portrait, src_pil, resized_800, center_upper, center_tight, card]:
        for rs in [Image.BILINEAR, Image.LANCZOS, Image.NEAREST]:
            h = compute_ahash_256(im, rs)
            if h not in hashes:
                hashes.append(h)
    return '|'.join(hashes)

def detect_and_crop(src_pil):
    W0, H0 = src_pil.size
    bgr = cv2.cvtColor(np.array(src_pil), cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = cascade.detectMultiScale(gray, 1.1, 5, minSize=(max(60, W0 // 12), max(60, H0 // 12)))
    if len(faces) > 0:
        # Pick largest face
        faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
        fx, fy, fw, fh = [int(v) for v in faces[0]]
        cx = fx + fw // 2
        cy = fy + int(fh * 0.68)
        pw = int(fw * 2.1)
        ph = int(pw * 390 / 310)
        x1 = max(0, min(W0 - pw, cx - pw // 2))
        y1 = max(0, min(H0 - ph, cy - int(ph * 0.43)))
        portrait = src_pil.crop((x1, y1, min(W0, x1 + pw), min(H0, y1 + ph))).resize((310, 390), Image.LANCZOS)
        pad = int(fw * 0.22)
        fx1 = max(0, fx - pad)
        fy1 = max(0, fy - pad)
        fx2 = min(W0, fx + fw + pad)
        fy2 = min(H0, fy + fh + pad)
        face_crop = src_pil.crop((fx1, fy1, fx2, fy2)).resize((256, 256), Image.LANCZOS)
    else:
        # Center crop fallback
        side = min(W0, H0)
        x1 = (W0 - side) // 2
        y1 = max(0, (H0 - side) // 3)
        portrait = src_pil.crop((x1, y1, x1 + side, min(H0, y1 + int(side * 1.25)))).resize((310, 390), Image.LANCZOS)
        face_crop = portrait.crop((30, 20, 280, 270)).resize((256, 256), Image.LANCZOS)
    return portrait, face_crop

def soften_green_bg(portrait):
    p_np = np.array(portrait)
    hsv = cv2.cvtColor(p_np, cv2.COLOR_RGB2HSV)
    green_mask = cv2.inRange(hsv, (28, 35, 20), (98, 255, 220))
    h_p, w_p = green_mask.shape
    yy, xx = np.ogrid[:h_p, :w_p]
    head_elli = ((xx - w_p*0.50)**2 / (w_p*0.27)**2 + (yy - h_p*0.36)**2 / (h_p*0.28)**2) <= 1.0
    body_elli = ((xx - w_p*0.50)**2 / (w_p*0.46)**2 + (yy - h_p*0.85)**2 / (h_p*0.34)**2) <= 1.0
    protect = (head_elli | body_elli).astype(np.uint8) * 255
    bg_mask = cv2.bitwise_and(green_mask, cv2.bitwise_not(protect))
    bg_mask = cv2.GaussianBlur(bg_mask, (21, 21), 0) / 255.0
    studio_bg = np.full_like(p_np, (226, 222, 214), dtype=np.uint8)
    blurred_src = cv2.GaussianBlur(p_np, (25, 25), 0)
    studio_mix = (0.65 * studio_bg + 0.35 * blurred_src).astype(np.uint8)
    alpha = bg_mask[..., None] * 0.78
    p_clean = (p_np * (1 - alpha) + studio_mix * alpha).astype(np.uint8)
    return Image.fromarray(p_clean)

def generate_card(full_name, national_id, birth_date, governorate, photo_path, address=None, gender='ذكر'):
    src_pil = Image.open(photo_path).convert('RGB')
    portrait, face_crop = detect_and_crop(src_pil)
    portrait_clean = soften_green_bg(portrait)

    CW, CH = 1012, 638
    Y, X = np.mgrid[0:CH, 0:CW]
    r = 240 - 12 * (Y / CH) + 6 * np.sin(X / 95.0)
    g = 231 - 8 * (Y / CH) + 5 * np.cos(Y / 75.0)
    b = 220 + 10 * (X / CW) - 6 * (Y / CH)
    wave1 = np.sin((X * 0.045) + np.sin(Y * 0.035) * 2.2)
    wave2 = np.cos((Y * 0.05) + np.sin(X * 0.028) * 2.0)
    guilloche = ((wave1 > 0.92) | (wave2 > 0.93)).astype(np.float32)
    r -= guilloche * 9
    g -= guilloche * 5
    b -= guilloche * 3
    c_np = np.stack([np.clip(r, 200, 252), np.clip(g, 195, 248), np.clip(b, 190, 245)], axis=-1).astype(np.uint8)
    card = Image.fromarray(c_np)
    draw = ImageDraw.Draw(card)

    for y in range(0, 108):
        t = y / 108.0
        draw.line([(0, y), (CW, y)], fill=(int(188 - 28 * t), int(156 - 26 * t), int(134 - 22 * t)))
    draw.line([(0, 108), (CW, 108)], fill=(125, 92, 70), width=3)
    draw.line([(0, 112), (CW, 112)], fill=(196, 164, 120), width=1)

    wm = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    wmd = ImageDraw.Draw(wm)
    cx_w, cy_w = 535, 315
    for rad in range(110, 20, -18):
        wmd.ellipse([cx_w - rad, cy_w - rad, cx_w + rad, cy_w + rad], outline=(160, 130, 105, 22), width=2)
    card = Image.alpha_composite(card.convert('RGBA'), wm).convert('RGB')
    draw = ImageDraw.Draw(card)

    px, py = 38, 130
    draw.rounded_rectangle([px - 5, py - 5, px + 310 + 5, py + 390 + 5], radius=8, fill=(248, 245, 240), outline=(165, 145, 125), width=2)
    card.paste(portrait_clean, (px, py))

    holo = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    hd = ImageDraw.Draw(holo)
    hd.ellipse([px + 250, py + 320, px + 336, py + 406], fill=(180, 210, 205, 75), outline=(140, 175, 170, 140), width=2)
    card = Image.alpha_composite(card.convert('RGBA'), holo).convert('RGB')
    draw = ImageDraw.Draw(card)

    f_header_big = ImageFont.truetype(CAIRO_BOLD, 34)
    f_header_sub = ImageFont.truetype(CAIRO_BOLD, 25)
    f_label = ImageFont.truetype(CAIRO_BOLD, 21)
    f_name = ImageFont.truetype(CAIRO_BOLD, 31)
    f_addr = ImageFont.truetype(CAIRO_BOLD, 25)
    f_nid_label = ImageFont.truetype(CAIRO_BOLD, 20)
    f_nid = ImageFont.truetype(CAIRO_BOLD, 40)
    f_dob = ImageFont.truetype(CAIRO_BOLD, 28)
    f_small = ImageFont.truetype(CAIRO_BOLD, 18)
    f_serial = ImageFont.truetype(CAIRO_BOLD, 21)

    def draw_rtl(text, x_right, y, font, fill=(25, 25, 28)):
        bbox = draw.textbbox((0, 0), text, font=font, direction='rtl', language='ar')
        w = bbox[2] - bbox[0]
        draw.text((x_right - w, y), text, font=font, fill=fill, direction='rtl', language='ar')

    draw_rtl('جمهورية مصر العربية', CW - 42, 12, f_header_big, fill=(32, 20, 15))
    draw_rtl('بطاقة تحقيق الشخصية', CW - 42, 54, f_header_sub, fill=(55, 35, 25))
    draw_rtl('وزارة الداخلية — قطاع الأحوال المدنية', 430, 36, f_small, fill=(65, 45, 32))

    right_edge = CW - 44
    parts = full_name.strip().split()
    first_name = parts[0] if parts else full_name
    rest_name = ' '.join(parts[1:]) if len(parts) > 1 else ''

    draw_rtl('الاسم /', right_edge, 132, f_label, fill=(95, 70, 55))
    draw_rtl(first_name, right_edge - 78, 124, f_name, fill=(18, 18, 22))
    if rest_name:
        draw_rtl(rest_name, right_edge, 170, f_name, fill=(18, 18, 22))

    draw.line([(385, 226), (right_edge, 226)], fill=(195, 180, 162), width=2)

    addr_line = address or f'ش الجمهورية — قسم أول {governorate}'
    draw_rtl('العنوان :', right_edge, 238, f_label, fill=(95, 70, 55))
    draw_rtl(addr_line, right_edge - 85, 235, f_addr, fill=(25, 25, 30))
    draw_rtl(f'محافظة {governorate}', right_edge, 278, f_addr, fill=(25, 25, 30))

    draw.line([(385, 330), (right_edge, 330)], fill=(195, 180, 162), width=2)
    draw_rtl(f'النوع : {gender}', right_edge, 344, f_addr, fill=(28, 28, 34))
    draw_rtl(f'محل الميلاد : {governorate}', right_edge - 210, 344, f_addr, fill=(28, 28, 34))

    nid_box_top = 418
    draw.rounded_rectangle([382, nid_box_top, right_edge + 8, 535], radius=10, fill=(233, 225, 210), outline=(170, 148, 122), width=2)
    draw_rtl('الرقم القومي', right_edge - 8, nid_box_top + 8, f_nid_label, fill=(90, 62, 44))

    # Render 14-digit National ID in Eastern Arabic digits strictly LEFT-TO-RIGHT
    digits_ar = [to_ar_digits(ch) for ch in national_id]
    step = 34
    gap = 22
    total_w = 13 * step + gap
    start_x = 382 + ((right_edge + 8 - 382) - total_w) // 2
    for idx, d_ch in enumerate(digits_ar):
        dx = start_x + idx * step + (gap if idx >= 7 else 0)
        draw.text((dx, nid_box_top + 42), d_ch, font=f_nid, fill=(15, 15, 18))

    dob_ar = to_ar_digits(birth_date.replace('-', '/'))
    draw_rtl('تاريخ الميلاد', px + 305, 532, f_small, fill=(85, 65, 50))
    draw.text((px + 52, 560), dob_ar, font=f_dob, fill=(20, 20, 24), direction='ltr')

    draw_rtl('إصدار : ٢٠٢٦/٠٩ — سارية', right_edge, 555, f_small, fill=(75, 60, 48))
    draw.text((400, 558), f'ID-EG-{national_id[-7:]}', font=f_serial, fill=(70, 65, 60), direction='ltr')

    draw.rounded_rectangle([3, 3, CW - 4, CH - 4], radius=18, outline=(135, 108, 84), width=4)

    card_rel = f'/cards/{national_id}.jpg'
    face_rel = f'/cards/{national_id}-face.jpg'
    card_path = os.path.join(CARDS_DIR, f'{national_id}.jpg')
    face_path = os.path.join(CARDS_DIR, f'{national_id}-face.jpg')
    card.save(card_path, quality=93)
    face_crop.save(face_path, quality=92)

    # Compute perceptual hashes for: (a) full source photo, (b) cropped face, (c) portrait, (d) card
    # And store pipe-separated hashes so matching succeeds whether voter uses live camera or uploads photo
    hashes = compute_multi_hashes(src_pil, face_crop, portrait, card)
    return {
        'ok': True,
        'national_id': national_id,
        'full_name': full_name,
        'birth_date': birth_date,
        'governorate': governorate,
        'card_image': card_rel,
        'face_image': face_rel,
        'face_hash': hashes,
        'card_path': card_path,
    }

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--name', required=True)
    ap.add_argument('--nid', required=True)
    ap.add_argument('--dob', required=True)
    ap.add_argument('--gov', required=True)
    ap.add_argument('--photo', required=True)
    ap.add_argument('--address', default='')
    ap.add_argument('--gender', default='ذكر')
    ap.add_argument('--copy-png', default='')
    args = ap.parse_args()
    res = generate_card(args.name, args.nid, args.dob, args.gov, args.photo, args.address or None, args.gender)
    if args.copy_png:
        Image.open(res['card_path']).save(args.copy_png)
    print(json.dumps(res, ensure_ascii=False))
