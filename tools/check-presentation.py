#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
فحص تطابق العرض التقديمي: public/presentation.html ⇄ ملف PowerPoint
=====================================================================
لا يعدّل أي ملف، ويُرجع رمز خروج 1 عند أي فرق.

يتحقق من أن:
  1. عدد الشرائح في الصفحة وفي ملف PowerPoint متساوٍ (وهو 12 افتراضيًا).
  2. ترقيم data-slide متسلسل، وعدد أزرار الدرج يساوي عدد الشرائح، والعداد الابتدائي صحيح.
  3. كل تذييل يحمل رقم شريحته الصحيح و"من N".
  4. عنوان كل شريحة (h1/h2) في الصفحة موجود في الشريحة المقابلة من PowerPoint.
  5. كل فقرة في PowerPoint موجودة نصًّا في الصفحة (بعد تطبيع الأرقام والفواصل).
  6. نسختا الملف (public/ والجذر) متطابقتان بايتًا بايت، والصفحة تشير إلى الرابط الصحيح.

الاستخدام:
    python3 tools/check-presentation.py [--expected 12]
"""
import argparse
import hashlib
import html
import os
import re
import sys
import zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
HTML_PATH = os.path.join(ROOT, 'public', 'presentation.html')
PPTX_MAIN = os.path.join(ROOT, 'public', 'soot-mawathaq-presentation.pptx')
PPTX_ROOT = os.path.join(ROOT, 'soot-mawathaq-presentation.pptx')
DOWNLOAD_HREF = 'href="/soot-mawathaq-presentation.pptx"'

INLINE_TAG = re.compile(r'</?(?:b|strong|i|em|span|code|small|u|a|sup|sub)\b[^>]*>')
CONTROL_CHARS = re.compile('[\u061c\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufe0f\ufeff]')
DIGIT_MAP = {**{0x0660 + i: str(i) for i in range(10)}, **{0x06F0 + i: str(i) for i in range(10)}}


def norm(text):
    """تطبيع للمقارنة: إزالة محارف التحكم في الاتجاه، وتحويل الأرقام إلى لاتينية، وإزالة الفواصل."""
    text = CONTROL_CHARS.sub('', text)
    text = text.translate(DIGIT_MAP)
    text = text.replace(',', '').replace('\u066c', '')
    return re.sub(r'\s+', ' ', text).strip()


def visible_text(fragment):
    """النص الظاهر من جزء HTML: الوسوم الداخلية تُحذف دون مسافات، والوسوم الكتلية تُعامل كمسافات."""
    fragment = re.sub(r'<(script|style)\b.*?</\1>', ' ', fragment, flags=re.S)
    fragment = re.sub(r'<br\s*/?>', ' ', fragment)
    fragment = INLINE_TAG.sub('', fragment)
    fragment = re.sub(r'<[^>]+>', ' ', fragment)
    return norm(html.unescape(fragment))


def pptx_slides(path):
    """قائمة شرائح؛ كل شريحة قائمة فقرات نصية (من ملفات XML داخل الحزمة)."""
    slides = []
    with zipfile.ZipFile(path) as z:
        names = [n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml', n)]
        names.sort(key=lambda n: int(re.search(r'(\d+)\.xml$', n).group(1)))
        for name in names:
            xml = z.read(name).decode('utf-8')
            paras = []
            for m in re.finditer(r'<a:p>(.*?)</a:p>', xml, flags=re.S):
                texts = re.findall(r'<a:t>(.*?)</a:t>', m.group(1), flags=re.S)
                text = ''.join(html.unescape(t) for t in texts)
                if text.strip():
                    paras.append(text)
            slides.append(paras)
    return slides


def sha256(path):
    with open(path, 'rb') as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def main():
    ap = argparse.ArgumentParser(description='فحص تطابق العرض التقديمي مع الموقع')
    ap.add_argument('--expected', type=int, default=12, help='عدد الشرائح المتوقع (افتراضي 12)')
    args = ap.parse_args()
    n_expected = args.expected

    failures = []

    def check(ok, label):
        print(('✓ ' if ok else '✗ ') + label)
        if not ok:
            failures.append(label)

    src = open(HTML_PATH, encoding='utf-8').read()
    sections = [(int(m.group(1)), m.group(2)) for m in re.finditer(
        r'<section class="slide[^"]*" data-slide="(\d+)">(.*?)</section>', src, flags=re.S)]
    slides = pptx_slides(PPTX_MAIN)

    # 1) الأعداد
    check(len(sections) == n_expected, f'عدد الشرائح في presentation.html = {len(sections)} (المتوقع {n_expected})')
    check(len(slides) == n_expected, f'عدد الشرائح في PowerPoint = {len(slides)} (المتوقع {n_expected})')

    # 2) الترقيم وأزرار الدرج والعداد
    check([n for n, _ in sections] == list(range(1, n_expected + 1)), 'ترقيم data-slide متسلسل من 1 إلى N')
    drawer = len(re.findall(r'<button[^>]*data-goto="\d+"', src))
    check(drawer == n_expected, f'عدد أزرار الدرج السريع = {drawer}')
    check(f'id="slide-counter">01 / {n_expected:02d}</span>' in src, f'العداد الابتدائي يقرأ "01 / {n_expected:02d}"')

    # 3) التذييلات
    footer_bad = []
    for n, body in sections:
        i = body.find('class="slide-footer"')
        footer = visible_text(body[i:]) if i >= 0 else ''
        m = re.search(r'الشريحة (\d+) من (\d+)', footer)
        if not m or int(m.group(1)) != n or int(m.group(2)) != n_expected:
            footer_bad.append(n)
    check(not footer_bad, 'كل تذييل يحمل رقم شريحته و"من N"' + (f' — خطأ في: {footer_bad}' if footer_bad else ''))
    pptx_footer_bad = []
    for idx, paras in enumerate(slides, start=1):
        joined = norm(' '.join(paras))
        m = re.search(r'الشريحة (\d+) من (\d+)', joined)
        if not m or int(m.group(1)) != idx or int(m.group(2)) != n_expected:
            pptx_footer_bad.append(idx)
    check(not pptx_footer_bad, 'كل تذييل في PowerPoint يحمل رقم شريحته و"من N"'
          + (f' — خطأ في: {pptx_footer_bad}' if pptx_footer_bad else ''))

    # 4) العناوين
    site_texts = []
    title_bad = []
    for n, body in sections:
        text = visible_text(body)
        site_texts.append(text)
        m = re.search(r'<h[12][^>]*>(.*?)</h[12]>', body, flags=re.S)
        title = visible_text(m.group(1)) if m else ''
        if not title or n > len(slides) or title not in norm(' '.join(slides[n - 1])):
            title_bad.append(n)
    check(not title_bad, 'عنوان كل شريحة (h1/h2) موجود في الشريحة المقابلة من PowerPoint'
          + (f' — غير متطابق في: {title_bad}' if title_bad else ''))

    # 5) فقرات PowerPoint موجودة في نص الصفحة
    site_all = ' | '.join(site_texts)
    missing = []
    checked = 0
    for idx, paras in enumerate(slides, start=1):
        for p in paras:
            pn = norm(p)
            if len(pn) < 3:
                continue
            checked += 1
            if pn not in site_all:
                missing.append((idx, pn[:90]))
    check(not missing, f'كل فقرة في PowerPoint موجودة في نص الصفحة ({checked} فقرة مفحوصة)')
    for idx, text in missing:
        print(f'    - شريحة {idx}: {text}')

    # 6) الملفات والرابط
    check(os.path.exists(PPTX_MAIN) and os.path.exists(PPTX_ROOT), 'الملفان موجودان: public/ والجذر')
    check(sha256(PPTX_MAIN) == sha256(PPTX_ROOT), 'النسختان متطابقتان بايتًا بايت')
    check(DOWNLOAD_HREF in src, 'زر التحميل في الصفحة يشير إلى /soot-mawathaq-presentation.pptx')

    print()
    if failures:
        print(f'✗ فشل الفحص في {len(failures)} بند — شغّل tools/build-presentation-pptx.py بعد تعديل الصفحة')
        return 1
    print('✓ العرض التقديمي متطابق مع الصفحة')
    return 0


if __name__ == '__main__':
    sys.exit(main())
