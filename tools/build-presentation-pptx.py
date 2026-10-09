#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
مولّد العرض التقديمي PowerPoint لمنصة «صوت موثّق»
=================================================
يبني public/soot-mawathaq-presentation.pptx (12 شريحة عربية RTL بمقاس 16:9)
ويكتب نسخة مطابقة لها في جذر المستودع (الرابط القديم كان يُخدَم من هناك).

المصدر المرجعي للمحتوى: public/presentation.html — يجب أن تتطابق الشرائح والنصوص معه.
للتحقق من التطابق بعد أي تعديل:  python3 tools/check-presentation.py

الاستخدام:
    python3 tools/build-presentation-pptx.py                  # يكتب الملفات الرسمية
    python3 tools/build-presentation-pptx.py --preview DIR    # + معاينة HTML للشرائح

المتطلبات: pip install python-pptx pillow
"""
import argparse
import os
import re
import shutil

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.dml import MSO_LINE_DASH_STYLE
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, MSO_AUTO_SIZE, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PUBLIC = os.path.join(ROOT, 'public')
OUT_MAIN = os.path.join(PUBLIC, 'soot-mawathaq-presentation.pptx')
OUT_ROOT = os.path.join(ROOT, 'soot-mawathaq-presentation.pptx')
QR_PNG = os.path.join(PUBLIC, 'assets', 'qr-code.png')
CARD_JPG = os.path.join(PUBLIC, 'cards', '31005292501518.jpg')
CAIRO_TTF = os.path.join(PUBLIC, 'assets', 'cairo.ttf')
SITE = 'https://soot-mawathaq.vercel.app'

AR = 'Cairo'           # الخط العربي (مرفق مع حزمة التسليم)
MONO = 'Courier New'   # النصوص اللاتينية الفنية

# ---------------------------------------------------------------- الألوان (من styles في presentation.html)
INK, NAVY, PAPER, PANEL = '10283F', '0C2237', 'F7F4EA', 'FBF9F1'
MUTED, LEAD, WHITE = '68727B', '2B3E50', 'FFFFFF'
RED, YELLOW, CYAN, GREEN, TEAL = 'FF4453', 'E6BD5D', '58D5CC', '43BF86', '00838F'
DKGREEN, DKRED, DKTEAL = '1B5E20', 'B71C1C', '006064'
PAPER_ROW = 'FAF8F0'

VARIANTS = {
    'def':    dict(bg=WHITE, line=INK, shadow=INK, tag=NAVY, tagfg=WHITE, text=INK),
    'red':    dict(bg=WHITE, line=RED, shadow=RED, tag=RED, tagfg=WHITE, text=INK),
    'yellow': dict(bg='FFFDF2', line=NAVY, shadow=YELLOW, tag=NAVY, tagfg=WHITE, text=INK),
    'cyan':   dict(bg='F0FDFC', line=NAVY, shadow=CYAN, tag=NAVY, tagfg=WHITE, text=INK),
    'green':  dict(bg='F0FBF5', line=GREEN, shadow=GREEN, tag=GREEN, tagfg=WHITE, text=INK),
    'navy':   dict(bg=NAVY, line=INK, shadow=CYAN, tag=YELLOW, tagfg=NAVY, text=WHITE),
}

SW, SH = 13.333, 7.5                        # مقاس الشريحة بالإنش (16:9)
PX0, PY0, PW, PH = 0.42, 0.34, 12.5, 6.8    # لوحة الشريحة
CL, CR = 0.95, 12.40                        # حدود المحتوى (CR = بداية الاتجاه RTL)
CW = CR - CL


# ---------------------------------------------------------------- أدوات النص
def is_ar(text):
    return any('\u0600' <= ch <= '\u06FF' for ch in text)


def est_text(text, pt, mono=None):
    """تقدير عرض النص بالإنش — يُستخدم لتحديد عرض الشارات والأزرار فقط."""
    if mono is None:
        mono = not is_ar(text)
    em = 0.60 if mono else 0.56
    return len(text) * em * pt / 72.0


LRI, PDI = '\u2066', '\u2069'                # عزل اتجاه من اليسار إلى اليمين (لا يظهر)
_LATIN_SPAN = re.compile(r'[A-Za-z0-9][A-Za-z0-9\-+./%&:<>=_ ]*[A-Za-z0-9%]|[A-Za-z0-9]')


def iso(text):
    """يعزل المقاطع اللاتينية/الرقمية داخل الفقرات العربية حتى لا تنعكس مثل 128-D → D-128."""
    return _LATIN_SPAN.sub(lambda m: LRI + m.group(0) + PDI, text)


def R(text, size=None, bold=None, color=None, font=None, italic=False):
    """جزء نص (run). القيم None تعني: ورّث من الفقرة."""
    return dict(t=text, size=size, bold=bold, color=color, font=font, italic=italic)


def P(runs, size=11, color=None, bold=False, align='r', line=1.2, before=0.0, bullet=False, font=None, rtl=True):
    """فقرة. runs: نص مفرد أو قائمة R(...)."""
    if isinstance(runs, str):
        runs = [R(runs)]
    return dict(runs=runs, size=size, color=color, bold=bold, align=align, line=line,
                before=before, bullet=bullet, font=font, rtl=rtl)


def para_is_rtl(p):
    """الفقرة عربية الاتجاه إذا احتوت نصًا عربيًا؛ وإلا فهي من اليسار إلى اليمين (روابط، رموز، أرقام)."""
    return p['rtl'] and any(is_ar(r['t']) for r in p['runs'])


def H(text, size=14, color=None, align='r', before=0.0):
    """عنوان فرعي داخل بطاقة (h3)."""
    return P(text, size=size, color=color, bold=True, align=align, line=1.1, before=before)


def B(runs, size=10.5, color=None, before=0.0, align='r'):
    """فقرة نص عادي."""
    return P(runs, size=size, color=color, align=align, line=1.22, before=before)


def U(runs, size=10.5, color=None, before=0.0):
    """نقطة قائمة (bullet)."""
    return P(runs, size=size, color=color, line=1.2, before=before, bullet=True)


def resolve(p, r):
    size = r['size'] or p['size'] or 11
    color = r['color'] or p['color'] or INK
    bold = r['bold'] if r['bold'] is not None else bool(p['bold'])
    font = r['font'] or p['font'] or AR
    if font == MONO and is_ar(r['t']):
        font = AR                            # Courier New لا يحوي حروفًا عربية
    return size, color, bold, font, r['italic']


# ---------------------------------------------------------------- بناء الشرائح (عمليات Ops)
class Slide:
    """قائمة عمليات رسم لشريحة واحدة؛ تُحوَّل لاحقًا إلى PowerPoint أو HTML للمعاينة."""

    def __init__(self, number):
        self.number = number
        self.ops = []

    def rect(self, x, y, w, h, fill=None, line=None, lw=1.0, dash=False, geom='rect', radius=0.0,
             paras=None, anchor='m', ins=(0.04, 0.02, 0.04, 0.02), link=None):
        self.ops.append(dict(k='shape', x=x, y=y, w=w, h=h, fill=fill, line=line, lw=lw, dash=dash,
                             geom=geom, radius=radius, paras=paras or [], anchor=anchor, ins=ins, link=link))

    def text(self, x, y, w, h, paras, anchor='t', ins=(0.01, 0.01, 0.01, 0.01)):
        self.rect(x, y, w, h, paras=paras, anchor=anchor, ins=ins)

    def oval(self, x, y, w, h, fill, line=None, lw=1.0, paras=None):
        self.rect(x, y, w, h, fill=fill, line=line, lw=lw, geom='oval', paras=paras, ins=(0, 0, 0, 0))

    def image(self, path, x, y, w, h):
        self.ops.append(dict(k='img', path=path, x=x, y=y, w=w, h=h))

    def hline(self, x, y, w, color=None, lw=1.0, dash=True):
        self.ops.append(dict(k='hline', x=x, y=y, w=w, color=color or 'BFC3C6', lw=lw, dash=dash))

    def table(self, x, y, colw, rowh, rows):
        self.ops.append(dict(k='table', x=x, y=y, colw=colw, rowh=rowh, rows=rows))


def cell(paras, fill=WHITE, border=INK):
    return dict(paras=paras, fill=fill, border=border)


def cols(n, gap, x0=CL, x1=CR):
    """أعمدة متساوية بترتيب RTL: العمود الأول على اليمين. تُرجع قائمة (x, w)."""
    w = (x1 - x0 - gap * (n - 1)) / n
    return [(x1 - i * (w + gap) - w, w) for i in range(n)]


def frame(s, tab):
    """إطار الشريحة: لوحة بظلال صلبة وحد متقطع وشريط الملف (file-tab) أعلى اليسار."""
    s.rect(PX0 + 0.19, PY0 + 0.19, PW, PH, fill=CYAN)
    s.rect(PX0 + 0.115, PY0 + 0.125, PW, PH, fill=NAVY)
    s.rect(PX0, PY0, PW, PH, fill=PANEL, line=NAVY, lw=3)
    s.rect(PX0 + 0.14, PY0 + 0.14, PW - 0.28, PH - 0.28, line='C3C7CA', lw=1.0, dash=True)
    tw = est_text(tab, 8.5, mono=True) + 0.34
    s.rect(0.96, 0.23, tw, 0.30, fill=NAVY)
    s.rect(0.92, 0.19, tw, 0.30, fill=RED, line=INK, lw=1.5,
           paras=[P(tab, size=8.5, bold=True, color=WHITE, align='c', font=MONO, line=1.0)], anchor='m')


def topline(s, title_text, code, dot=GREEN):
    """السطر العلوي: عنوان مع نقطة الحالة (يمين) وشارة الكود (يسار) ثم فاصل متقطع."""
    cw = est_text(code, 8, mono=True) + 0.3
    s.rect(CL, 0.62, cw, 0.28, fill='ECEEEF', line='B8C0C6', lw=0.75,
           paras=[P(code, size=8, bold=True, color=INK, align='c', font=MONO, line=1.0, rtl=False)], anchor='m')
    s.oval(CR - 0.13, 0.70, 0.13, 0.13, fill=dot, line=INK, lw=1.2)
    x0 = CL + cw + 0.2
    s.text(x0, 0.58, CR - 0.26 - x0, 0.36,
           [P(title_text, size=10.5, bold=True, color=INK, align='r', line=1.0)], anchor='m')
    s.hline(CL, 1.04, CW, dash=True)


def kicker(s, parts, y=1.14):
    """شريط الكيكر: أجزاء ملوّنة بالترتيب RTL = (نص، نمط، لاتيني)."""
    styles = {
        'navy': (NAVY, WHITE),
        'yellow': (YELLOW, NAVY),
        'white': (WHITE, RED),
    }
    widths = [est_text(text, 7.5, mono=latin) + 0.3 for text, _, latin in parts]
    x = CR
    for (text, style, latin), w in zip(parts, widths):
        x -= w
        fill, fg = styles[style]
        s.rect(x, y, w, 0.28, fill=fill, line=INK, lw=1.25,
               paras=[P(text, size=7.5, bold=True, color=fg, align='c', font=MONO if latin else AR,
                        line=1.0, rtl=not latin)],
               anchor='m', ins=(0.02, 0, 0.02, 0))


def title(s, runs, y=1.5, size=26, width=CW):
    """عنوان الشريحة (h2): runs = قائمة (نص، لون). يُصغّر الخط تلقائيًا ليبقى في سطر واحد."""
    total = sum(len(t) for t, _ in runs)
    size = min(size, max(20, int(width * 72 / (total * 0.56 * 1.04))))
    paras = [P([R(t, color=c) for t, c in runs], size=size, bold=True, color=INK, align='r', line=1.08)]
    s.text(CL, y, CW, 0.62, paras, anchor='t')


def title_lines(s, lines, y, size=36, h=1.2):
    """عنوان متعدد الأسطر (h1 في الغلاف والختام)."""
    paras = [P([R(t, color=c)], size=size, bold=True, color=INK, align='r', line=1.12) for t, c in lines]
    s.text(CL, y, CW, h, paras, anchor='t')


def lead(s, y, runs, h=0.5, size=12, color=LEAD):
    s.text(CL, y, CW, h, [P(runs, size=size, color=color, line=1.25)], anchor='t')


def box(s, x, y, w, h, var='def', tag='', tag_fill=None, body=(), pad=0.16, sh=0.07, tag_w=None, head=None):
    """بطاقة (.box): ظل صلب + إطار + شارة علوية + محتوى نصي."""
    v = VARIANTS[var]
    s.rect(x + sh, y + sh, w, h, fill=v['shadow'])
    s.rect(x, y, w, h, fill=v['bg'], line=v['line'], lw=1.75)
    if tag:
        tw = tag_w or (est_text(tag, 7.5) + 0.28)
        latin = not is_ar(tag)
        s.rect(x + w - pad - tw, y + pad - 0.01, tw, 0.25, fill=tag_fill or v['tag'],
               paras=[P(tag, size=7.5, bold=True, color=v['tagfg'], align='c', font=MONO if latin else AR,
                        line=1.0, rtl=not latin)],
               anchor='m', ins=(0.02, 0, 0.02, 0))
    if body:
        paras = [p if p['color'] is not None else dict(p, color=v['text']) for p in body]
        top = y + pad + (head if head is not None else (0.3 if tag else 0.0))
        s.text(x + pad, top, w - 2 * pad, h - (top - y) - pad * 0.6, paras, anchor='t')


def panel(s, x, y, w, h, var='navy', body=(), pad=0.2, sh=0.08):
    """لوحة بلا شارة (مثل .box.navy في الصفحة)."""
    v = VARIANTS[var]
    s.rect(x + sh, y + sh, w, h, fill=v['shadow'])
    s.rect(x, y, w, h, fill=v['bg'], line=v['line'], lw=1.75)
    paras = [p if p['color'] is not None else dict(p, color=v['text']) for p in body]
    s.text(x + pad, y + pad * 0.8, w - 2 * pad, h - pad * 1.5, paras, anchor='m')


_FOOT_RE = re.compile(r'(\[\[.*?\]\]|`.*?`)')


def _footer_runs(text):
    """يحوّل نص التذييل: [[قيمة]] = قيمة كحروف داكنة عريضة، `كود` = خط ثابت."""
    runs = []
    for part in _FOOT_RE.split(text):
        if not part:
            continue
        if part.startswith('[['):
            v = part[2:-2]
            runs.append(R(v, bold=True, color=NAVY, font=AR if is_ar(v) else MONO))
        elif part.startswith('`'):
            runs.append(R(part[1:-1], bold=True, color=NAVY, font=MONO))
        else:
            runs.append(R(part, bold=True, color=MUTED))
    return runs


def footer(s, right, left, middle=None, widths=None):
    """تذييل الشريحة: الجزء الأيمن ثم الأوسط ثم الأيسر، فوق خط متقطع."""
    s.hline(CL, 6.52, CW, dash=True)
    if widths is None:
        widths = (5.0, 4.4, 2.05) if middle else (8.0, 3.45)
    wr = widths[0]
    s.text(CR - wr, 6.6, wr, 0.3, [P(_footer_runs(right), size=8.5, color=MUTED, bold=True, align='r', line=1.0)],
           anchor='m')
    if middle:
        s.text(CL + widths[2], 6.6, widths[1], 0.3,
               [P(_footer_runs(middle), size=8.5, color=MUTED, bold=True, align='c', line=1.0)], anchor='m')
        wl = widths[2]
    else:
        wl = widths[1]
    s.text(CL, 6.6, wl, 0.3, [P(_footer_runs(left), size=8.5, color=MUTED, bold=True, align='l', line=1.0)],
           anchor='m')


# ---------------------------------------------------------------- المحتوى: الشرائح الـ12
def build_slides():
    slides = []

    # ---- 1: الغلاف
    s = Slide(1)
    frame(s, 'SLIDE 01 // OVERVIEW & QR')
    topline(s, 'المسابقة الوطنية للمبتكرين والطلاب في التكنولوجيا والذكاء الاصطناعي',
            'PROTOTYPE // CIVICTECH & CRYPTOGRAPHY 2026/2027', dot=GREEN)
    kicker(s, [('PROJECT DOSSIER', 'navy', True), ('#SOOT-MAWATHAQ', 'yellow', True), ('STUDENT UNION LAB', 'white', True)])
    title_lines(s, [('صوت موثّق', INK), ('من هويتك .. إلى صوتك', RED)], y=1.62, size=36, h=1.25)
    lead(s, 2.9, [R('مختبر ونموذج محاكاة تجريبي متقدم للاقتراع البيومتري السري (Proof of Concept)', bold=True)],
         h=0.3, size=11.5)
    s.text(CL, 3.17, CW, 0.66, [P([
        R('تم تصميمه لانتخابات '),
        R('المكتب التنفيذي لاتحاد طلاب مدارس الجمهورية (دورة 2026/2027)', bold=True),
        R('. يحل المنظومة معادلة التحقق الرقمي عبر الجمع بين '),
        R('التحقق العصبي الحي من الوجه (128-D + Liveness)', bold=True),
        R(' و'),
        R('معمارية عزل الهوية الصارمة (Zero-Link Architecture)', bold=True),
        R(' التي تمنع رياضيًا وتقنيًا ربط صوت الناخب بهويته.'),
    ], size=11.5, color=LEAD, line=1.25)], anchor='t')
    # صندوق QR
    qy, qh = 3.92, 1.1
    s.rect(CL + 0.07, qy + 0.07, CW, qh, fill=NAVY)
    s.rect(CL, qy, CW, qh, fill=WHITE, line=INK, lw=2.25)
    s.image(QR_PNG, CR - 1.1, qy + 0.07, 0.98, 0.98)
    s.rect(CR - 1.12, qy + 0.05, 1.02, 1.02, line=INK, lw=1.25)
    s.text(CL + 0.2, qy + 0.08, CW - 1.6, 0.32,
           [P('📱 مسح الـ QR Code لتجربة المنظومة فوراً مع التحكيم:', size=12.5, bold=True, color=INK, line=1.0)],
           anchor='m')
    s.text(CL + 0.2, qy + 0.4, CW - 1.6, 0.34,
           [P('امسح الكود بكاميرا هاتفك لفتح المنظومة الحية وتجربة مسار التحقق البيومتري والتصويت السري لحظياً أثناء العرض.',
              size=9.5, color=MUTED, line=1.15)], anchor='t')
    link_txt = SITE.replace('https://', '') + '/'
    link_w = est_text(link_txt, 9.5, mono=True) + 0.3
    link_x = CR - 1.12 - 0.35 - link_w
    s.rect(link_x, qy + 0.78, link_w, 0.26, fill=PAPER, line=INK, lw=1.25,
           paras=[P(link_txt, size=9.5, bold=True, color=NAVY, align='c', font=MONO, line=1.0, rtl=False)],
           anchor='m', link=SITE + '/')
    s.rect(link_x - 0.12 - 1.65, qy + 0.78, 1.65, 0.26, fill=GREEN,
           paras=[P('جاهز للتجربة الحية', size=8.5, bold=True, color=WHITE, align='c', line=1.0)], anchor='m')
    # ثلاث بطاقات
    bx = cols(3, 0.2)
    by, bh = 5.16, 1.3
    box(s, bx[0][0], by, bx[0][1], bh, var='cyan', tag='BIOMETRIC AI', head=0.3, body=[
        H('بصمة عصبية 128-D', size=12),
        B('مطابقة لحظية عبر المتصفح بين صورة الكاميرا وبيانات البطاقة القومية مع كشف الحيوية ومقاومة التزييف.', size=9.5)])
    box(s, bx[1][0], by, bx[1][1], bh, var='yellow', tag='ZERO-LINK PRIVACY', head=0.3, body=[
        H('سرية تشفيرية مطلقة', size=12),
        B('عزل هيكلي كامل بين سجل الناخبين وصندوق الاقتراع المجهول عبر توقيعات HMAC-SHA256 العمياء.', size=9.5)])
    box(s, bx[2][0], by, bx[2][1], bh, var='green', tag='VERIFIABLE RECEIPT', tag_fill=NAVY, head=0.3, body=[
        H('إيصال تحقق مشفر', size=12),
        B('إصدار كود إثبات مشفر للناخب للتحقق من احتساب صوته في الصندوق دون كشف اسم مرشحه لأي طرف.', size=9.5)])
    footer(s, 'المشروع: [[صوت موثّق — مختبر الاقتراع السري]]',
           'الشريحة [[01 من 12]]',
           middle='المسار: `/presentation` · الرابط المباشر: `soot-mawathaq.vercel.app`',
           widths=(4.2, 5.0, 2.25))
    slides.append(s)

    # ---- 2: المشكلة
    s = Slide(2)
    frame(s, 'SLIDE 02 // THE PROBLEM')
    topline(s, 'المشكلة والأزمة القبلية (The Problem - Before)', 'TRADITIONAL VOTING FLAWS & CHALLENGES', dot=RED)
    kicker(s, [('ROOT PROBLEM', 'navy', True), ('ثغرات الاقتراع التقليدي الورقي', 'yellow', False), ('CRITICAL FLAWS', 'white', True)])
    title(s, [('أزمة النظم التقليدية: ', INK), ('أين يفشل الاقتراع الورقي؟', RED)], y=1.5)
    lead(s, 2.12, 'تواجه العمليات الانتخابية التقليدية والطلابية 5 أزمات هيكلية تكلف ملايين الجنيهات وتفتح أبواب التشكيك في النزاهة:',
         h=0.4, size=11.5)
    cx = cols(3, 0.2)
    items = [
        ('01 // انتحال الشخصية والتزوير', 'انتحال الشخصية (Impersonation)',
         'سهولة استخدام بطاقات ورقية مسروقة أو التصويت بأسماء طلاب غائبين أو متوفين في ظل الفحص البصري البشري المرهق والمعرض للأخطاء.'),
        ('02 // تكرار التصويت', 'تكرار التصويت (Double Voting)',
         'غياب الربط اللحظي الموحد بين اللجان المدرسية والفرعية، مما يتيح للناخب الإدلاء بصوته في أكثر من لجنة أو كشف دون اكتشاف فوري.'),
        ('03 // التكلفة اللوجستية والورقية', 'إهدار مالي وبيئي ضخم',
         'ملايين الأوراق المطبوعة، الأحبار الفسفورية، الصناديق البلاستيكية، وأساطيل النقل الأمني والفرز، مسببة هدراً مالياً وأثراً كربونياً هائلاً.'),
    ]
    for (x, w), (tg, hd, bd) in zip(cx, items):
        box(s, x, 2.7, w, 1.85, var='red', tag=tg, tag_fill=RED, body=[H(hd, size=12.5), B(bd, size=10.5, before=3)])
    cx2 = cols(2, 0.2)
    items2 = [
        ('04 // بطء الفرز والأخطاء البشرية', 'ساعات وأيام من الفرز اليدوي',
         'استغراق ساعات طويلة في العد والفرز اليدوي، مع احتمالية الخطأ في حساب الأصوات الباطلة وتأخر إعلان النتائج مما يثير التوترات.'),
        ('05 // شبهات الإكراه وشراء الأصوات', 'غياب التحقق السري المستقل',
         'صعوبة إثبات أن الناخب صوّت بإرادته الحرة دون إكراه من جهات أو أفراد، مع انعدام إمكانية تدقيق الناخب لوجود صوته في الصندوق لاحقاً.'),
    ]
    for (x, w), (tg, hd, bd) in zip(cx2, items2):
        box(s, x, 4.72, w, 1.6, var='yellow', tag=tg, body=[H(hd, size=12.5), B(bd, size=10.5, before=3)])
    footer(s, 'محور التحليل: [[أوجه القصور في المنظومة التقليدية]]', 'الشريحة [[02 من 12]]')
    slides.append(s)

    # ---- 3: المعضلة
    s = Slide(3)
    frame(s, 'SLIDE 03 // THE DILEMMA')
    topline(s, 'المعضلة الكبرى للتصويت الرقمي (The Core Paradox)', 'AUTHENTICATION VS ANONYMITY PARADOX', dot=YELLOW)
    kicker(s, [('THE GRAND PARADOX', 'navy', True), ('معضلة الهندسة التشفيرية', 'yellow', False), ('THE CORE QUESTION', 'white', True)])
    title(s, [('المعضلة الكبرى: ', INK), ('كيف نتحقق بيومترياً دون كشف الصوت؟', RED)], y=1.5)
    panel(s, CL, 2.2, CW, 1.62, var='navy', body=[
        P('«كيف نتحقق بيومترياً من شخصية الناخب لمنع التزوير، دون أن نكشف أو نخزن لمن ذهب صوته؟»',
          size=15, bold=True, color=YELLOW, line=1.15),
        B([R('في الأنظمة الرقمية العادية: كلما زادت دقة التحقق من هوية المستخدم (User Authentication)، أصبح من السهل ربط هويته ببياناته المسجلة (Activity Tracking). لكن في '),
           R('الانتخابات الدستورية والطلابية', bold=True),
           R('، كشف خيار الناخب يعد '),
           R('جريمة وانتهاكاً لسرية الاقتراع', bold=True),
           R('.')], size=12, color='E2E8F0', before=6),
    ])
    cx = cols(2, 0.2)
    box(s, cx[0][0], 4.0, cx[0][1], 2.4, var='red', tag='الطرف الأول // التوثيق القاطع', tag_fill=RED, body=[
        H('ضرورة التحقق البيومتري (Authentication)', size=12.5),
        U('منع انتحال الشخصية والتصويت بالنيابة.', size=11, before=5),
        U('التأكد من أن الناخب مقيد في السجل المدني / المدرسي.', size=11, before=3),
        U('ضمان كشف الحياة (Liveness) لمنع الصور والشاشات المزيفة.', size=11, before=3),
        U('تسجيل أن هذا الرقم القومي قام بالتصويت لمنع التكرار.', size=11, before=3),
    ])
    box(s, cx[1][0], 4.0, cx[1][1], 2.4, var='green', tag='الطرف الثاني // السرية المطلقة', tag_fill=GREEN, body=[
        H('حتمية سرية الاقتراع (Ballot Anonymity)', size=12.5),
        U('حظر تخزين أي علاقة بين الرقم القومي وخيار المرشح.', size=11, before=5),
        U('استحالة قيام مدير النظام أو قاعدة البيانات بمعرفة من صوّت لمن.', size=11, before=3),
        U('حماية الناخب من أي إكراه أو ملاحقة أو شراء أصوات.', size=11, before=3),
        U('إصدار إيصال تشفيري للناخب دون كشف اختياره.', size=11, before=3),
    ])
    footer(s, 'المعادلة الصعبة: [[فصل التوثيق عن المحتوى]]', 'الشريحة [[03 من 12]]')
    slides.append(s)

    # ---- 4: الحل
    s = Slide(4)
    frame(s, 'SLIDE 04 // THE SOLUTION')
    topline(s, 'الحل والتقنية بعد المنظومة (The Solution - After)', 'ZERO-LINK ARCHITECTURE & TOKEN DE-COUPLING', dot=GREEN)
    kicker(s, [('THE BREAKTHROUGH', 'navy', True), ('معمارية عزل الهوية (Zero-Link)', 'yellow', False), ('HOW SOOT RESOLVES IT', 'white', True)])
    title(s, [('حل المعادلة: ', INK), ('الفصل التام بين مسار الهوية ومسار الاقتراع', RED)], y=1.5)
    lead(s, 2.1, 'تبتكر منظومة «صوت موثّق» معمارية Zero-Link متعددة المراحل تقطع أي صلة تشفيرية أو رقمية بين هوية الناخب وورقة اقتراعه:',
         h=0.5, size=11.5)
    steps = [
        ('1', 'تحقق الهوية', None, 'السجل والبصمة',
         'إدخال الرقم القومي ومطابقته بالسجل المعتمد واستدعاء البصمة المرجعية المشفرة.'),
        ('2', 'الذكاء الاصطناعي', 'cyan', 'كشف الحياة المباشر',
         'التقاط الوجه بالكاميرا واستخراج البصمة العصبية (128-D) وإتمام تحديات الحركة الحية.'),
        ('3', 'العزل والقطع', 'yellow', 'الرمز الأعمى (HMAC)',
         'وسم الناخب كـ "صوّت"، وإصدار رمز اقتراع معزول تماماً، ومسح الجلسة فوراً (Zero-Link).'),
        ('4', 'الصندوق والإيصال', 'green', 'إيداع مجهول 100%',
         'إيداع ورقة الاقتراع في الصندوق المشفر بدون هوية، وإصدار إيصال تحقق مشفر للناخب.'),
    ]
    sx = cols(4, 0.2)
    for (x, w), (num, tg, var, hd, bd) in zip(sx, steps):
        box(s, x, 2.78, w, 1.95, var=var or 'def', body=[H(hd, size=12.5, before=6), B(bd, size=10, before=3)], head=0.42)
        bx_ = x + w - 0.16 - 0.32
        s.rect(bx_, 2.78 + 0.16, 0.32, 0.32, fill=RED, line=INK, lw=1.25,
               paras=[P(num, size=11, bold=True, color=WHITE, align='c', font=MONO, line=1.0, rtl=False)],
               anchor='m', ins=(0, 0, 0, 0))
        tw_ = est_text(tg, 7.5) + 0.28
        s.rect(bx_ - 0.1 - tw_, 2.78 + 0.19, tw_, 0.25, fill=NAVY,
               paras=[P(tg, size=7.5, bold=True, color=WHITE, align='c', line=1.0)], anchor='m', ins=(0.02, 0, 0.02, 0))
    # كتلة الكود
    s.rect(CL + 0.07, 4.98 + 0.07, CW, 1.4, fill=INK)
    code_lines = [
        [R('// معمارية الأمان: حتى لو سُرقت قاعدة البيانات بالكامل', color='94A3B8', font=MONO)],
        [R('Voter_Registry', color='FF8E9B', font=MONO), R(' [NID, Biometric_Hash, Has_Voted: TRUE]   ', color='7EF5DB', font=MONO),
         R('<-- معزول تماماً وبدون أي معرف للصوت', color='94A3B8', font=MONO)],
        [R('   || [ ZERO-LINK DE-COUPLING / HMAC BLIND SIGNATURE ] ||', color='FFD666', font=MONO)],
        [R('Ballot_Box', color='FF8E9B', font=MONO), R('     [Ballot_ID, Candidate_ID, Encrypted_Receipt, Timestamp] ', color='7EF5DB', font=MONO),
         R('<-- مجهول وبدون أي NID', color='94A3B8', font=MONO)],
    ]
    s.rect(CL, 4.98, CW, 1.4, fill=NAVY, line=INK, lw=2,
           paras=[P(line, size=10, color='7EF5DB', align='l', line=1.3, rtl=False, font=MONO) for line in code_lines],
           anchor='m', ins=(0.2, 0.08, 0.2, 0.08))
    footer(s, 'المعمارية: [[Zero-Link Token De-coupling]]', 'الشريحة [[04 من 12]]')
    slides.append(s)

    # ---- 5: بطاقة الرقم القومي (شريحة جديدة)
    s = Slide(5)
    frame(s, 'SLIDE 05 // NATIONAL ID CARD')
    topline(s, 'شكل البطاقة الشخصية المعتمد في المنظومة (ID Card Design)', 'EGYPTIAN ID CARD // SAMPLE 31005292501518', dot=YELLOW)
    kicker(s, [('DOCUMENT', 'navy', True), ('بطاقة تحقيق الشخصية — نموذج تجريبي', 'yellow', False), ('READ & MATCH', 'white', True)])
    title(s, [('شكل البطاقة الشخصية: ', INK), ('كيف تُقرأ بيانات المواطن وصورته؟', RED)], y=1.5)
    lead(s, 2.1, [
        R('بطاقة تجريبية مُولّدة بأداة البطاقات في المشروع لـ'),
        R('علي أحمد علي محمد', bold=True),
        R('، تحمل الحقول التي تعتمد عليها المنظومة: الصورة لمطابقة الوجه، والاسم والرقم القومي للقراءة والمقارنة.'),
    ], h=0.5, size=11.5)
    # صورة البطاقة مع الأرقام
    CARD_W = 4.4
    CARD_H = CARD_W * 638 / 1012
    card_x, card_y = CR - CARD_W, 2.7
    s.rect(card_x + 0.07, card_y + 0.07, CARD_W, CARD_H, fill=NAVY)
    s.image(CARD_JPG, card_x, card_y, CARD_W, CARD_H)
    s.rect(card_x, card_y, CARD_W, CARD_H, line=INK, lw=2)
    pins = [(1, 33, 125), (2, 735, 150), (3, 500, 262), (4, 520, 368), (5, 390, 410), (6, 72, 566)]
    for n, px, py in pins:
        cx_ = card_x + px / 1012 * CARD_W
        cy_ = card_y + py / 638 * CARD_H
        d = 0.27
        s.oval(cx_ - d / 2, cy_ - d / 2, d, d, fill=RED, line=WHITE, lw=1.5,
               paras=[P(str(n), size=9.5, bold=True, color=WHITE, align='c', font=MONO, line=1.0, rtl=False)])
    LEG = [
        ('الصورة الشخصية', 'تُستخرج منها بصمة الوجه العصبية (128-D)، وتُقارَن بسيلفي الناخب الحي لاعتماد الهوية.'),
        ('الاسم', 'يُطبَّع الاسم العربي (أ/إ/آ ← ا، ى ← ي، ة ← ه) ثم يُطابَق مع الاسم المُدخَل في التسجيل.'),
        ('العنوان والمحافظة', 'المحافظة تُستخرج من كود الرقم القومي (الخانتان 8–9) وتُطابَق مع بيانات الناخب.'),
        ('النوع ومحل الميلاد', 'النوع يُستنتج من الخانة 13 (الفردي = ذكر، والزوجي = أنثى).'),
        ('الرقم القومي', '14 رقمًا يقرؤها النظام آليًا من البطاقة، ولا يُحفظ منها إلا بصمة مُجزَّأة (SHA-256 مع ملح سري).'),
        ('تاريخ الميلاد وبيانات الإصدار', 'تاريخ الميلاد يُطابَق مع الرقم القومي، ورقم المرجع ID-EG وتاريخ الإصدار يظهران أسفل البطاقة.'),
    ]
    leg_r = card_x - 0.32
    leg_w = leg_r - CL
    for i, (t, d) in enumerate(LEG, start=1):
        y = 2.7 + (i - 1) * 0.49
        s.rect(CL + 0.04, y + 0.04, leg_w, 0.44, fill=INK)
        s.rect(CL, y, leg_w, 0.44, fill=WHITE, line=INK, lw=1.5)
        s.oval(leg_r - 0.3, y + 0.1, 0.24, 0.24, fill=RED, line=INK, lw=1.0,
               paras=[P(str(i), size=9, bold=True, color=WHITE, align='c', font=MONO, line=1.0, rtl=False)])
        s.text(CL + 0.1, y + 0.02, leg_w - 0.5, 0.40,
               [P([R(t + ' — ', bold=True, color=NAVY), R(d)], size=9.5, color=INK, line=1.12)], anchor='m')
    # تشريح الرقم القومي
    s.text(CL, 5.64, CW, 0.24, [P([R('تشريح الرقم القومي (14 خانة): ', color=MUTED, bold=True),
                                   R('31005292501518', color=NAVY, bold=True, font=MONO, )], size=10.5, line=1.0)], anchor='m')
    chips = [
        ('3', 'القرن', '2000 – 2099 (الخانة 1)', WHITE),
        ('100529', 'تاريخ الميلاد', '29 / 05 / 2010 (الخانات 2–7)', 'F0FDFC'),
        ('25', 'كود المحافظة', 'أسيوط (الخانتان 8–9)', 'FFFDF2'),
        ('015', 'التسلسل', '(الخانات 10–12)', WHITE),
        ('1', 'النوع', 'فردي = ذكر (الخانة 13)', 'F0FBF5'),
        ('8', 'رقم التحقق', '(الخانة 14)', WHITE),
    ]
    chx = cols(6, 0.12)                       # RTL: index 0 = اليمين
    for i, (dg, lb, em, bg) in enumerate(chips):
        x, w = chx[5 - i]                     # ترتيب الخانات من اليسار إلى اليمين كما في الرقم
        s.rect(x + 0.03, 5.95, w, 0.56, fill=INK)
        s.rect(x, 5.92, w, 0.56, fill=bg, line=INK, lw=1.5, paras=[
            P(dg, size=12, bold=True, color=NAVY, align='c', font=MONO, line=1.0, rtl=False),
            P(lb, size=8.5, bold=True, color=INK, align='c', line=1.0),
            P(em, size=7.5, bold=True, color=MUTED, align='c', line=1.0),
        ], anchor='m', ins=(0.03, 0.01, 0.03, 0.01))
    footer(s, 'نموذج البطاقة: [[علي أحمد علي محمد — بيانات تجريبية]]', 'الشريحة [[05 من 12]]')
    slides.append(s)

    # ---- 6: الذكاء الاصطناعي
    s = Slide(6)
    frame(s, 'SLIDE 06 // AI & COMPUTER VISION')
    topline(s, 'العمق التقني: الذكاء الاصطناعي ورؤية الحاسوب', '128-D NEURAL EMBEDDINGS & LIVENESS DETECTION', dot=GREEN)
    kicker(s, [('AI ENGINE', 'navy', True), ('محرك البصمة العصبية وكشف الحياة', 'yellow', False), ('EDGE INFERENCE', 'white', True)])
    title(s, [('الذكاء الاصطناعي: ', INK), ('بصمة عصبية 128-D وكشف حيوية متعدد الطبقات', RED)], y=1.5)
    cx = cols(2, 0.2)
    box(s, cx[0][0], 2.12, cx[0][1], 2.42, var='cyan', tag='NEURAL FACE EMBEDDINGS', body=[
        H('استخراج البصمة العصبية 128-D ومطابقتها', size=12.5),
        U('استخراج 128 متجه عائم (128-Dimensional Float Vectors) يمثل الخصائص الهندسية الدقيقة للوجه.', size=10.5, before=4),
        U([R('تشغيل نموذج '), R('MobileNet-SSD & ResNet', bold=True),
           R(' محلياً بالكامل على متصفح الناخب (Client-Side Edge Inference) لحماية الخصوصية ومنع إرسال الفيديو للخوادم.')],
          size=10.5, before=2),
        U([R('مطابقة المتجهات عبر المسافة الإقليدية (Euclidean Distance < 0.52) وجيب التمام (Cosine Similarity) بدقة تتجاوز '),
           R('99.4%', bold=True), R('.')], size=10.5, before=2),
    ])
    box(s, cx[1][0], 2.12, cx[1][1], 2.42, var='yellow', tag='ANTI-SPOOFING LIVENESS', body=[
        H('كشف الحيوية ومقاومة التزييف (Liveness Detection)', size=12.5),
        U([R('تحديات حركية ديناميكية:', bold=True),
           R(' إلزام الناخب بحركات عشوائية لحظية (طرفة عين Blink، ابتسامة Smile، إمالة واقتراب Head Yaw & Distance).')],
          size=10.5, before=4),
        U([R('تحليل النسيج الضوئي (Texture & Moiré Analysis):', bold=True),
           R(' كشف الترددات المكانية وحواف الشاشات والانعكاسات الضوئية لمنع الاختراق بالصور المطبوعة أو الهواتف.')],
          size=10.5, before=2),
        U([R('تتابع الإطارات الزمني (Temporal Frame Coherence):', bold=True),
           R(' فحص 30+ إطار متتابع للتأكد من حيوية الحركة ثلاثية الأبعاد.')], size=10.5, before=2),
    ])
    cx3 = cols(3, 0.2)
    box(s, cx3[0][0], 4.72, cx3[0][1], 1.66, var='def', tag='LOCAL PRIVACY', body=[
        H('خصوصية بيومترية تامة', size=12.5),
        B('لا يتم تخزين صور الكاميرا على أي خادم؛ تُحوَّل الصورة لمتجه رقمي لحظي ويُمسح فور الانتهاء.', size=10, before=3)])
    box(s, cx3[1][0], 4.72, cx3[1][1], 1.66, var='def', tag='LIGHTWEIGHT', body=[
        H('خفيف ويعمل على الموبايل', size=12.5),
        B('حجم النماذج مضغوط بصيغة WebGL/WASM، يعمل بسلاسة على الهواتف المتوسطة والضعيفة.', size=10, before=3)])
    box(s, cx3[2][0], 4.72, cx3[2][1], 1.66, var='green', tag='CARD OCR', tag_fill=GREEN, body=[
        H('قراءة البطاقة العربية الذكية', size=12.5),
        B('مطابقة الاسم وتاريخ الميلاد والمحافظة مع السجل المدني مع التسامح الإملائي للهمزات والألقاب.', size=10, before=3)])
    footer(s, 'محرك الذكاء الاصطناعي: [[MobileNet + ResNet-128D + Liveness Tracker]]', 'الشريحة [[06 من 12]]')
    slides.append(s)

    # ---- 7: التشفير
    s = Slide(7)
    frame(s, 'SLIDE 07 // APPLIED CRYPTOGRAPHY')
    topline(s, 'العمق التقني: التشفير ومعمارية الأمان', 'HMAC TOKENS & CRYPTOGRAPHIC BLIND RECEIPT', dot=GREEN)
    kicker(s, [('SECURITY CORE', 'navy', True), ('التشفير المطبق وحماية البيانات', 'yellow', False), ('ZERO-KNOWLEDGE PRIVACY', 'white', True)])
    title(s, [('الأمان التشفيري: ', INK), ('توقيعات عمياء وإيصال تحقق رياضي', RED)], y=1.5)
    cx = cols(3, 0.2)
    box(s, cx[0][0], 2.19, cx[0][1], 2.5, var='navy', tag='HMAC-SHA256', tag_fill=YELLOW, body=[
        H('التوقيع الرقمي الأعمى', size=12.5),
        B([R('يُصدر الخادم رمز تصويت موقّع بـ '), R('HMAC-SHA256', bold=True),
           R(' مع Nonce عشوائي وطابع زمني محدد بفترة صلاحية 5 دقائق، مما يمنع التزييف وهجمات إعادة الإرسال (Replay Attacks).')],
          size=10.5, before=4)])
    box(s, cx[1][0], 2.19, cx[1][1], 2.5, var='cyan', tag='SCHEMA ISOLATION', body=[
        H('عزل قواعد البيانات', size=12.5),
        B('جدول الناخبين (Voters) يحتوي فقط على هاش الرقم القومي وحالة التصويت. جدول الأصوات (Ballots) لا يحتوي على أي حقل للناخب أو جلسة المتصفح (Zero-Link By Design).',
          size=10.5, before=4)])
    box(s, cx[2][0], 2.19, cx[2][1], 2.5, var='green', tag='HASH RECEIPT', tag_fill=GREEN, body=[
        H('إيصال التحقق المشفر', size=12.5),
        B([R('يُولد كود إيصال مثل '), R('ABCDE-23456', font=MONO, bold=True),
           R(' مبني على هاش أحادي الاتجاه مع Salt مشفر، يتيح للناخب فحص وجود صوته بالصندوق دون كشف اسم مرشحه لأي مراقب.')],
          size=10.5, before=4)])
    box(s, CL, 4.92, CW, 1.3, var='yellow', tag='RLS POLICIES', tag_fill=NAVY, body=[
        H('حماية مستوى الصفوف (PostgreSQL RLS)', size=12.5),
        B('حظر الوصول العام إلى جداول الناخبين والأصوات، وحصر العمليات الحساسة عبر خادم معتمد بمفتاح مشفر وسجل تدقيق أمني (Audit Log).',
          size=11, before=4)])
    footer(s, 'بروتوكول الأمان: [[HMAC-SHA256 + Blind Tokens + Nonce Replay Prevention]]', 'الشريحة [[07 من 12]]')
    slides.append(s)

    # ---- 8: الجدوى والعائد
    s = Slide(8)
    frame(s, 'SLIDE 08 // FEASIBILITY & ROI')
    topline(s, 'دراسة الجدوى والعائد القومي (Feasibility & ROI Study)', 'ECONOMIC, ENVIRONMENTAL & OPERATIONAL IMPACT', dot=GREEN)
    kicker(s, [('IMPACT MATRIX', 'navy', True), ('مقارنة بالأرقام والنسب الحقيقية', 'yellow', False), ('MEASURABLE IMPACT', 'white', True)])
    title(s, [('العائد القومي والجدوى: ', INK), ('توفير مالي، حماية بيئية، ودقة 100%', RED)], y=1.5)
    cx = cols(3, 0.2)
    box(s, cx[0][0], 2.12, cx[0][1], 2.05, var='green', tag='01 // العائد المالي (Financial ROI)', tag_fill=GREEN, body=[
        H('وفر مالي > 85%', size=18, color=DKGREEN, before=6),
        B('إلغاء تكاليف طباعة بطاقات الاقتراع المؤمنة، والأحبار الفسفورية، وكبائن التصويت الخشبية، ومكافآت لجان الفرز اليدوي الطويلة، واستبدالها بخوادم سحابية خفيفة.',
          size=10, before=4)])
    box(s, cx[1][0], 2.12, cx[1][1], 2.05, var='cyan', tag='02 // الأثر البيئي (Green Tech)', tag_fill=TEAL, body=[
        H('Zero-Paper 100%', size=18, color=DKTEAL, before=6),
        B('توفير أطنان من الأوراق سنوياً، وإنقاذ آلاف الأشجار، وتخفيض البصمة الكربونية لأسطول النقل اللوجستي وتوزيع الصناديق في المحافظات إلى الصفر.',
          size=10, before=4)])
    box(s, cx[2][0], 2.12, cx[2][1], 2.05, var='yellow', tag='03 // الكفاءة التشغيلية (Operational)', tag_fill=NAVY, body=[
        H('فرز لحظي في 0.1 ثانية', size=18, color=NAVY, before=6),
        B('إعلان النتائج فور إغلاق الصندوق بدقة رياضية 100% وانعدام تام للأخطاء البشرية أو إبطال الأصوات العشوائي، مع تدقيق فوري للنتائج.',
          size=10, before=4)])
    # بطاقة الحاسبة (قيم المحاكي الافتراضية كما تظهر على الموقع)
    cy = 4.38
    s.rect(CL + 0.06, cy + 0.06, CW, 2.0, fill=NAVY)
    s.rect(CL, cy, CW, 2.0, fill=WHITE, line=INK, lw=2.5)
    s.text(CL + 0.2, cy + 0.12, CW - 0.4, 0.3,
           [P([R('🎛️ جرب محاكي الوفر التقديري لعدد ناخبين / طلاب:', bold=True, color=INK)], size=11, line=1.0)],
           anchor='m')
    # شريط المحاكي (ثابت في العرض التقديمي)
    tr_x, tr_w, ty = CL + 0.25, 5.3, cy + 0.6
    s.rect(tr_x, ty, tr_w, 0.07, fill='D9DDE1', line=None)
    s.rect(tr_x, ty, tr_w * 0.049, 0.07, fill=RED)
    s.oval(tr_x + tr_w * 0.049 - 0.09, ty - 0.06, 0.2, 0.2, fill=RED, line=INK, lw=1.5)
    s.rect(tr_x + tr_w + 0.35, cy + 0.5, 3.6, 0.3, fill=NAVY, line=INK, lw=1.25,
           paras=[P('٥٠٬٠٠٠ طالب / ناخب', size=11, bold=True, color=WHITE, align='c', line=1.0)], anchor='m')
    mets = [
        ('التكلفة الورقية التقليدية المتوقعة', '~ ٢٥٠٬٠٠٠ ج.م', RED),
        ('تكلفة منظومة «صوت موثّق» السحابية', '~ ١٨٬٠٠٠ ج.م', DKGREEN),
        ('الورق والمياه التي تم إنقاذها (Green ROI)', '٥٠٬٠٠٠ ورقة · ٥٠٠ كجم كربون', NAVY),
    ]
    mx = cols(3, 0.2, x0=CL + 0.2, x1=CR - 0.2)
    for (x, w), (lb, vl, col) in zip(mx, mets):
        s.rect(x, cy + 1.0, w, 0.82, fill=PAPER, line=INK, lw=1.25, paras=[
            P(lb, size=9, bold=True, color=MUTED, align='c', line=1.0),
            P(vl, size=15 if len(vl) < 20 else 13, bold=True, color=col, align='c', line=1.0, before=4),
        ], anchor='m', ins=(0.06, 0.04, 0.06, 0.04))
    footer(s, 'مؤشر الاستدامة: [[Green Tech + Cost Reduction > 85% + Zero Counting Latency]]', 'الشريحة [[08 من 12]]')
    slides.append(s)

    # ---- 9: المقارنة (جدول)
    s = Slide(9)
    frame(s, 'SLIDE 09 // DIRECT COMPARISON')
    topline(s, 'المقارنة المعمارية المباشرة (Comparative Matrix)', 'TRADITIONAL PAPER VS. SOOT-MAWATHAQ', dot=GREEN)
    kicker(s, [('BENCHMARK', 'navy', True), ('مصفوفة المقارنة المباشرة', 'yellow', False), ('HEAD-TO-HEAD MATRIX', 'white', True)])
    title(s, [('مقارنة شاملة: ', INK), ('الاقتراع الورقي مقابل منظومة «صوت موثّق»', RED)], y=1.5)
    rows_data = [
        ('التحقق من الهوية', 'بصري يدوي بالعين المجردة (عرضة للتزوير والتساهل)', 'بيومتري عصبي 128-D فوري + كشف حيوية متعدد المستويات'),
        ('منع تكرار التصويت', 'حبر فسفوري يزول بالمواد الكيميائية وغياب ربط اللجان', 'قفل تشفيري لحظي مركزي في قاعدة البيانات بالرقم القومي'),
        ('سرية الاقتراع', 'صناديق شفافة أو كبائن قد تتعرض للتجسس أو الإكراه', 'معمارية Zero-Link تفصل هوية الناخب عن الصوت رياضيًا'),
        ('زمن إعلان النتائج', 'من 6 إلى 24 ساعة من الفرز اليدوي المرهق', 'فرز لحظي فوري (0.1 ثانية) مع رسوم بيانية حية ومفتوحة'),
        ('إمكانية تدقيق الناخب لصوته', 'مستحيل (بمجرد إسقاط الورقة لا يعلم هل احتسبت)', 'إيصال تحقق مشفر (Cryptographic Receipt) لفحص وجود الصوت'),
        ('التكلفة والأثر البيئي', 'باهظة جداً + أطنان من الأوراق ومخلفات ضارة بالبيئة', 'توفير 85%+ من الميزانية وZero-Paper خضراء مستدامة'),
    ]
    trows = [[
        cell([P('وجه المقارنة', size=11.5, bold=True, color=WHITE, align='r', line=1.0)], fill=NAVY),
        cell([P('الاقتراع الورقي التقليدي', size=11.5, bold=True, color=WHITE, align='r', line=1.0)], fill=NAVY),
        cell([P('منظومة «صوت موثّق» (Soot-Mawathaq)', size=11.5, bold=True, color=WHITE, align='r', line=1.0)], fill=NAVY),
    ]]
    for i, (a, b_, c_) in enumerate(rows_data):
        base = PAPER_ROW if i % 2 else WHITE
        trows.append([
            cell([P(a, size=11, bold=True, color=INK, align='r', line=1.15)], fill=base),
            cell([P(b_, size=11, bold=True, color=DKRED, align='r', line=1.15)], fill='FFEBEE'),
            cell([P(c_, size=11, bold=True, color=DKGREEN, align='r', line=1.15)], fill='E8F5E9'),
        ])
    colw = [2.55, 4.2, 4.7]
    s.table(CL, 2.12, colw, [0.42] + [0.6] * 6, trows)
    footer(s, 'المعيار: [[تطبيق المعايير الدولية للاقتراع الموثوق (E2E Verifiable Voting)]]', 'الشريحة [[09 من 12]]')
    slides.append(s)

    # ---- 10: السيناريو الطلابي
    s = Slide(10)
    frame(s, 'SLIDE 10 // STUDENT ELECTIONS 2026/2027')
    topline(s, 'سيناريو التطبيق: انتخابات اتحاد طلاب مدارس الجمهورية', 'PILOT SCENARIO // STUDENT UNION 2026-2027', dot=GREEN)
    kicker(s, [('PILOT EXECUTION', 'navy', True), ('التطبيق في البيئة المدرسية والتعليمية', 'yellow', False), ('STUDENT LEADERSHIP', 'white', True)])
    title(s, [('البيئة الميدانية: ', INK), ('انتخابات المكتب التنفيذي لاتحاد الطلاب', RED)], y=1.5)
    lead(s, 2.1, 'تم تصميم هذا النموذج الأولي ليناسب متطلبات المدارس الثانوية والجامعات المصرية لترسيخ قيم الديمقراطية والشفافية الرقمية بين الطلاب:',
         h=0.5, size=11.5)
    cands = [
        ('مرشح الرئاسة 🖊️', 'أحمد كريم الشناوي', 'مدرسة المتفوقين STEM', 'برنامج التحول الرقمي:', 'منصة أندية طلابية ومعامل ابتكار وهاكاثونات مدرسية.'),
        ('نائب الرئيس 🦅', 'يوسف حازم القاضي', 'الثانوية بنين', 'الدعم الأكاديمي:', 'مجموعات تقوية تفاعلية وبنك أسئلة وتأهيل للمنح الدولية.'),
        ('أمين الأنشطة 🔥', 'عبد الرحمن سامح فوزي', 'السعيدية الثانوية', 'الأنشطة والرياضة:', 'دوري المدارس لكرة القدم والشطرنج ومعسكرات القيادة والكشافة.'),
        ('أمين الخدمات 🌴', 'زياد طارق الدسوقي', 'المنصورة الثانوية', 'الشمول والدمج:', 'دمج ذوي الهمم وتوفير صندوق مقترحات رقمي صوتي مباشر.'),
    ]
    cx = cols(4, 0.18)
    for (x, w), (tg, nm, sub, lbl, txt) in zip(cx, cands):
        box(s, x, 2.75, w, 2.2, var='def', tag=tg, tag_w=est_text(tg, 7.5) + 0.5, body=[
            H(nm, size=13, before=4),
            P(sub, size=9.5, color=MUTED, line=1.1, before=2),
            B([R(lbl, bold=True), R(' ' + txt)], size=10, before=5),
        ])
    box(s, CL, 5.15, CW, 1.05, var='yellow', body=[])
    text_x = CL + 0.25 + 3.7 + 0.3
    s.text(text_x, 5.25, CR - 0.25 - text_x, 0.85, [P([R('🎯 تجربة نموذج واقعي جاهز:', bold=True, color=NAVY),
                                                       R(' تتوفر بيانات وبطاقات طلابية جاهزة لتجربة دورة الاقتراع بالكامل فوراً.', color='475467')],
                                                      size=11, line=1.3)], anchor='m')
    s.rect(CL + 0.25, 5.415, 3.7, 0.52, fill=RED, line=INK, lw=1.75,
           paras=[P('بدء التصويت في انتخابات اتحاد الطلاب ←', size=10.5, bold=True, color=WHITE, align='c', line=1.0)],
           anchor='m', link=SITE + '/register')
    footer(s, 'النموذج التطبيقي: [[انتخابات اتحاد طلاب مدارس الجمهورية (دورة 2026/2027)]]', 'الشريحة [[10 من 12]]')
    slides.append(s)

    # ---- 11: خارطة الطريق
    s = Slide(11)
    frame(s, 'SLIDE 11 // FUTURE ROADMAP')
    topline(s, 'خارطة الطريق المستقبلية (Future Roadmap)', 'MERKLE PROOFS, ACCESSIBILITY & DECENTRALIZATION', dot=GREEN)
    kicker(s, [("WHAT'S NEXT", 'navy', True), ('التطوير المستقبلي والتوسع القومي', 'yellow', False), ('FUTURE SCALE', 'white', True)])
    title(s, [('خارطة الطريق: ', INK), ('من النموذج الأولي إلى النضج الرقمي الشامل', RED)], y=1.5)
    cx = cols(3, 0.2)
    road = [
        ('cyan', 'PHASE 1 // CRYPTO AUDIT', 'إثبات الوجود (Merkle Tree Proofs)',
         'بناء شجرة ميركل تشفيرية تراكمية (Merkle Tree) للأصوات، تتيح لأي مراقب أو محكم أو ناخب التحقق الرياضي التام من أن صوته مدرج في الشجرة دون كشف خياره (End-to-End Verifiability).'),
        ('yellow', 'PHASE 2 // INCLUSION', 'الشمول الرقمي لذوي الهمم',
         'تطوير واجهات صوتية تفاعلية بالكامل (Speech-Driven Interface) وتتبع حركة العين والرأس (Eye-Tracking Gestures) لتمكين الطلاب ذوي القدرات الخاصة والمكفوفين من التصويت باستقلالية تامة.'),
        ('green', 'PHASE 3 // DECENTRALIZATION', 'العقد الرقابية الموزعة',
         'توزيع مفاتيح التشفير وسجلات التدقيق عبر عُقد مستقلة تديرها لجان إشراف متعددة (اللجنة القضائية، إدارة المدرسة، اتحاد الطلاب) لضمان عدم انفراد جهة واحدة بالصندوق.'),
    ]
    for (x, w), (var, tg, hd, bd) in zip(cx, road):
        box(s, x, 2.12, w, 2.42, var=var, tag=tg, body=[H(hd, size=12.5, before=6), B(bd, size=10, before=4)])
    panel(s, CL, 4.85, CW, 1.4, var='navy', body=[
        H('🏛️ الرؤية الوطنية والتعليمية للجمهورية الجديدة:', size=13.5, color=YELLOW),
        B('تحويل منظومة «صوت موثّق» إلى منصة قياسية وطنية مفتوحة المصدر للاقتراع الطلابي والنقابي والمؤسسي في مصر، تجمع بين أعلى معايير الأمان التشفيري وسهولة الاستخدام البيومتري.',
          size=11, color='E2E8F0', before=5),
    ])
    footer(s, 'الرؤية المستقبلية: [[Zero-Knowledge Voting & Universal Digital Inclusion]]', 'الشريحة [[11 من 12]]')
    slides.append(s)

    # ---- 12: الختام
    s = Slide(12)
    frame(s, 'SLIDE 12 // LIVE DEMO & CONCLUSION')
    topline(s, 'شريحة الختام والتجربة الحية (Conclusion & Live Demo)', 'SOOT-MAWATHAQ // LIVE DEMONSTRATION', dot=GREEN)
    kicker(s, [('READY TO TEST', 'navy', True), ('جاهزون لتجربة لجان التحكيم الحية', 'yellow', False), ('SCAN & VOTE NOW', 'white', True)])
    title_lines(s, [('صوت موثّق', INK), ('مستقبل الاقتراع الآمن يبدأ الآن', RED)], y=1.6, size=36, h=1.25)
    lead(s, 2.9, 'ندعو السادة أعضاء لجنة التحكيم لمسح الـ QR Code وبدء تجربة الاقتراع الحي والتأكد من سرية الصوت وكفاءة المنظومة الآن:',
         h=0.5, size=11.5)
    qy, qh = 3.45, 1.55
    qbx, qby = CR - 1.65, qy + 0.15
    s.rect(CL + 0.09, qy + 0.09, CW, qh, fill=NAVY)
    s.rect(CL, qy, CW, qh, fill='FFFDF2', line=NAVY, lw=2.5)
    s.rect(qbx + 0.06, qby + 0.06, 1.44, 1.44, fill=NAVY)
    s.rect(qbx, qby, 1.44, 1.44, fill=WHITE, line=INK, lw=1.5)
    s.image(QR_PNG, qbx + 0.08, qby + 0.08, 1.28, 1.28)
    s.text(CL + 0.25, qy + 0.14, CW - 2.2, 0.36,
           [P('📲 ابدأ التجربة الحية الآن من هاتفك:', size=14, bold=True, color=NAVY, line=1.0)], anchor='m')
    s.text(CL + 0.25, qy + 0.52, CW - 2.2, 0.66, [
        P('1. افتح كاميرا هاتفك وامسح الرمز.', size=10.5, color='334155', line=1.2),
        P('2. جرب التحقق البيومتري من الوجه وكشف الحيوية.', size=10.5, color='334155', line=1.2, before=1),
        P('3. صوّت لمرشحك واستلم إيصالك المشفر وافحصه في الصندوق.', size=10.5, color='334155', line=1.2, before=1),
    ], anchor='t')
    link_txt = SITE.replace('https://', '') + '/'
    lw_ = est_text(link_txt, 10, mono=True) + 0.3
    s.rect(CL + 0.25, qy + 1.18, lw_, 0.28, fill=PAPER, line=INK, lw=1.25,
           paras=[P(link_txt, size=10, bold=True, color=NAVY, align='c', font=MONO, line=1.0, rtl=False)],
           anchor='m', link=SITE + '/')
    btns = [
        ('🚀 بدء التصويت الحي', RED, WHITE, '/register'),
        ('📊 النتائج والفرز المباشر', NAVY, WHITE, '/results'),
        ('🧾 فحص إيصال التصويت', YELLOW, NAVY, '/verify-receipt'),
        ('🛡️ لوحة لجنة الإشراف', WHITE, INK, '/admin'),
    ]
    bxs = cols(4, 0.16)
    for (x, w), (lb, bg, fg, path) in zip(bxs, btns):
        s.rect(x + 0.06, 5.2 + 0.06, w, 0.6, fill=INK)
        s.rect(x, 5.2, w, 0.6, fill=bg, line=INK, lw=1.75,
               paras=[P(lb, size=11.5, bold=True, color=fg, align='c', line=1.0)], anchor='m', link=SITE + path)
    footer(s, 'إعداد وتطوير: [[م / علي أحمد (Ali Ahmed) — مبتكر مشروع «صوت موثّق» ✨]]',
           'الشريحة [[12 من 12]]',
           middle='جاهزون للإجابة على جميع استفسارات السادة المحكمين 💬',
           widths=(5.0, 4.35, 2.1))
    slides.append(s)

    return slides


# ---------------------------------------------------------------- الإخراج: PowerPoint
def rgb(hexstr):
    return RGBColor.from_string(hexstr)


def _strip_style(shape):
    """إزالة مرجع النمط الافتراضي (p:style) حتى لا تتدخل ألوان وظلال الثيم."""
    el = shape._element
    st = el.find(qn('p:style'))
    if st is not None:
        el.remove(st)


def _fill_para(para, p):
    rtl = para_is_rtl(p)
    para.alignment = {'r': PP_ALIGN.RIGHT, 'l': PP_ALIGN.LEFT, 'c': PP_ALIGN.CENTER}[p['align']]
    para.line_spacing = p['line']
    if p['before']:
        para.space_before = Pt(p['before'])
    pPr = para._p.get_or_add_pPr()
    pPr.set('rtl', '1' if rtl else '0')
    if p['bullet']:
        pPr.set('marL', str(int(Inches(0.2))))
        pPr.set('indent', str(-int(Inches(0.2))))
        pPr.append(pPr.makeelement(qn('a:buFont'), {'typeface': 'Arial'}))
        pPr.append(pPr.makeelement(qn('a:buChar'), {'char': '•'}))
    for r in p['runs']:
        run = para.add_run()
        run.text = iso(r['t']) if rtl else r['t']
        size, color, bold, font, italic = resolve(p, r)
        f = run.font
        f.size = Pt(size)
        f.bold = bold
        f.italic = italic
        f.color.rgb = rgb(color)
        f.name = font
        rPr = run._r.get_or_add_rPr()
        rPr.set('lang', 'ar-EG' if is_ar(r['t']) else 'en-US')
        latin = rPr.find(qn('a:latin'))
        latin.addnext(rPr.makeelement(qn('a:cs'), {'typeface': font}))


def _emit_shape(pslide, op):
    geom = {'rect': MSO_SHAPE.RECTANGLE, 'round': MSO_SHAPE.ROUNDED_RECTANGLE, 'oval': MSO_SHAPE.OVAL}[op['geom']]
    shp = pslide.shapes.add_shape(geom, Inches(op['x']), Inches(op['y']), Inches(op['w']), Inches(op['h']))
    _strip_style(shp)
    if op['fill']:
        shp.fill.solid()
        shp.fill.fore_color.rgb = rgb(op['fill'])
    else:
        shp.fill.background()
    if op['line']:
        shp.line.color.rgb = rgb(op['line'])
        shp.line.width = Pt(op['lw'])
        if op['dash']:
            shp.line.dash_style = MSO_LINE_DASH_STYLE.DASH
    else:
        shp.line.fill.background()
    tf = shp.text_frame
    tf.word_wrap = True
    tf.auto_size = MSO_AUTO_SIZE.NONE
    l, t, r, b = op['ins']
    tf.margin_left, tf.margin_top = Inches(l), Inches(t)
    tf.margin_right, tf.margin_bottom = Inches(r), Inches(b)
    tf.vertical_anchor = {'t': MSO_ANCHOR.TOP, 'm': MSO_ANCHOR.MIDDLE, 'b': MSO_ANCHOR.BOTTOM}[op['anchor']]
    for i, p in enumerate(op['paras']):
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        _fill_para(para, p)
    if op['link']:
        shp.click_action.hyperlink.address = op['link']


def _cell_borders(tc_cell, color, w_pt):
    tcPr = tc_cell._tc.get_or_add_tcPr()
    for tag in ('a:lnL', 'a:lnR', 'a:lnT', 'a:lnB'):
        for old in tcPr.findall(qn(tag)):
            tcPr.remove(old)
    for idx, tag in enumerate(('a:lnL', 'a:lnR', 'a:lnT', 'a:lnB')):
        ln = tcPr.makeelement(qn(tag), {'w': str(int(w_pt * 12700)), 'cap': 'flat', 'cmpd': 'sng', 'algn': 'ctr'})
        sf = ln.makeelement(qn('a:solidFill'), {})
        sf.append(sf.makeelement(qn('a:srgbClr'), {'val': color}))
        ln.append(sf)
        ln.append(ln.makeelement(qn('a:prstDash'), {'val': 'solid'}))
        tcPr.insert(idx, ln)


def _emit_table(pslide, op):
    rows = op['rows']
    nr, nc = len(rows), len(rows[0])
    gf = pslide.shapes.add_table(nr, nc, Inches(op['x']), Inches(op['y']),
                                 Inches(sum(op['colw'])), Inches(sum(op['rowh'])))
    tbl = gf.table
    tbl.first_row = False
    tbl.horz_banding = False
    tbl._tbl.tblPr.set('rtl', '1')
    for j, w in enumerate(op['colw']):
        tbl.columns[j].width = Inches(w)
    for i, h in enumerate(op['rowh']):
        tbl.rows[i].height = Inches(h)
    for i, row in enumerate(rows):
        for j, spec in enumerate(row):
            c = tbl.cell(i, j)
            c.fill.solid()
            c.fill.fore_color.rgb = rgb(spec['fill'])
            c.margin_left = c.margin_right = Inches(0.1)
            c.margin_top = c.margin_bottom = Inches(0.05)
            c.vertical_anchor = MSO_ANCHOR.MIDDLE
            tf = c.text_frame
            tf.word_wrap = True
            for k, p in enumerate(spec['paras']):
                _fill_para(tf.paragraphs[0] if k == 0 else tf.add_paragraph(), p)
            _cell_borders(c, spec['border'], 1.0)


def _emit_hline(pslide, op):
    c = pslide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(op['x']), Inches(op['y']),
                                    Inches(op['x'] + op['w']), Inches(op['y']))
    _strip_style(c)
    c.line.color.rgb = rgb(op['color'])
    c.line.width = Pt(op['lw'])
    if op['dash']:
        c.line.dash_style = MSO_LINE_DASH_STYLE.DASH


def to_pptx(slides, path):
    prs = Presentation()
    prs.slide_width = Emu(12192000)
    prs.slide_height = Emu(6858000)
    prs._element.set('rtl', '1')          # الاتجاه العام للعرض: من اليمين لليسار
    blank = prs.slide_layouts[6]
    for sl in slides:
        ps = prs.slides.add_slide(blank)
        ps.background.fill.solid()
        ps.background.fill.fore_color.rgb = rgb(PAPER)
        for op in sl.ops:
            if op['k'] == 'shape':
                _emit_shape(ps, op)
            elif op['k'] == 'img':
                ps.shapes.add_picture(op['path'], Inches(op['x']), Inches(op['y']), Inches(op['w']), Inches(op['h']))
            elif op['k'] == 'table':
                _emit_table(ps, op)
            elif op['k'] == 'hline':
                _emit_hline(ps, op)
    cp = prs.core_properties
    cp.title = 'صوت موثّق — العرض التقديمي'
    cp.subject = 'منصة اقتراع إلكتروني بالتحقق البيومتري — نموذج تجريبي (Proof of Concept)'
    cp.author = 'علي أحمد'
    cp.keywords = 'صوت موثّق; اقتراع إلكتروني; التحقق البيومتري; Zero-Link'
    prs.save(path)


# ---------------------------------------------------------------- الإخراج: معاينة HTML (للتحقق البصري فقط)
def _px(inches):
    return f'{inches * 96:.2f}px'


def _esc(t):
    return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def _html_para(p):
    rtl = para_is_rtl(p)
    align = {'r': 'right', 'l': 'left', 'c': 'center'}[p['align']]
    spans = []
    for r in p['runs']:
        size, color, bold, font, italic = resolve(p, r)
        fam = "'Courier New','Liberation Mono',monospace" if font == MONO else "'Cairo',sans-serif"
        text = iso(r['t']) if rtl else r['t']
        spans.append(
            f'<span style="font-family:{fam};font-size:{size * 4 / 3:.2f}px;color:#{color};'
            f'font-weight:{700 if bold else 400};font-style:{"italic" if italic else "normal"}">'
            f'{_esc(text)}</span>')
    pre = '• ' if p['bullet'] else ''
    indent = 'padding-right:0.2in;text-indent:-0.2in;' if p['bullet'] else ''
    direction = 'rtl' if rtl else 'ltr'
    before = f'margin-top:{p["before"] * 4 / 3:.2f}px;' if p['before'] else ''
    return (f'<div style="text-align:{align};direction:{direction};line-height:{p["line"]};{indent}{before}">'
            f'{pre}{"".join(spans)}</div>')


def _html_box(op):
    st = [f'left:{_px(op["x"])}', f'top:{_px(op["y"])}', f'width:{_px(op["w"])}', f'height:{_px(op["h"])}',
          f'background:{"#" + op["fill"] if op["fill"] else "transparent"}', 'box-sizing:border-box']
    if op['line']:
        st.append(f'border:{op["lw"] * 4 / 3:.2f}px {"dashed" if op["dash"] else "solid"} #{op["line"]}')
    if op['geom'] == 'oval':
        st.append('border-radius:50%')
    l, t, r, b = op['ins']
    anchor = {'t': 'flex-start', 'm': 'center', 'b': 'flex-end'}[op['anchor']]
    inner = ''.join(_html_para(p) for p in op['paras'])
    link = f'<a href="{op["link"]}" style="position:absolute;inset:0;"></a>' if op['link'] else ''
    return (f'<div class="abs" style="{";".join(st)}">'
            f'<div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:{anchor};'
            f'padding:{_px(t)} {_px(r)} {_px(b)} {_px(l)};">{inner}</div>{link}</div>')


def _html_slide(sl):
    parts = []
    for op in sl.ops:
        if op['k'] == 'shape':
            parts.append(_html_box(op))
        elif op['k'] == 'img':
            parts.append(f'<img class="abs" src="file://{op["path"]}" style="left:{_px(op["x"])};top:{_px(op["y"])};'
                         f'width:{_px(op["w"])};height:{_px(op["h"])}">')
        elif op['k'] == 'hline':
            parts.append(f'<div class="abs" style="left:{_px(op["x"])};top:{_px(op["y"])};width:{_px(op["w"])};'
                         f'border-top:{op["lw"] * 4 / 3:.2f}px {"dashed" if op["dash"] else "solid"} #{op["color"]}"></div>')
        elif op['k'] == 'table':
            cols_html = ''.join(f'<col style="width:{_px(w)}">' for w in op['colw'])
            rows_html = []
            for i, row in enumerate(op['rows']):
                cells = []
                for spec in row:
                    inner = ''.join(_html_para(p) for p in spec['paras'])
                    cells.append(f'<td style="background:#{spec["fill"]};border:1px solid #{spec["border"]};'
                                 f'padding:4px 8px;vertical-align:middle">{inner}</td>')
                rows_html.append(f'<tr style="height:{_px(op["rowh"][i])}">{"".join(cells)}</tr>')
            parts.append(f'<table class="abs" style="left:{_px(op["x"])};top:{_px(op["y"])};width:{_px(sum(op["colw"]))};'
                         f'border-collapse:collapse;table-layout:fixed;direction:rtl">'
                         f'<colgroup>{cols_html}</colgroup>{"".join(rows_html)}</table>')
    return f'<div class="slide" data-n="{sl.number}">' + ''.join(parts) + '</div>'


def to_preview_html(slides, path):
    css = (
        "@font-face{font-family:'Cairo';src:url('file://" + CAIRO_TTF + "') format('truetype');font-weight:100 900;}"
        "body{margin:0;background:#777;padding:20px 0;}"
        ".slide{position:relative;width:13.333in;height:7.5in;overflow:hidden;background:#" + PAPER + ";margin:0 auto 24px;}"
        ".abs{position:absolute;}"
    )
    body = ''.join(_html_slide(sl) for sl in slides)
    doc = (f'<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>{css}</style></head>'
           f'<body>{body}</body></html>')
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(doc)


def main():
    ap = argparse.ArgumentParser(description='بناء العرض التقديمي PowerPoint لصوت موثّق')
    ap.add_argument('--preview', metavar='DIR', help='كتابة معاينة HTML للشرائح داخل DIR (لا تؤثر على الملفات الرسمية)')
    args = ap.parse_args()

    slides = build_slides()
    assert len(slides) == 12, f'عدد الشرائح {len(slides)} وليس 12'

    to_pptx(slides, OUT_MAIN)
    shutil.copyfile(OUT_MAIN, OUT_ROOT)
    print(f'✓ {OUT_MAIN} ({os.path.getsize(OUT_MAIN) // 1024} KB) — {len(slides)} شريحة')
    print(f'✓ {OUT_ROOT} (نسخة مطابقة)')

    if args.preview:
        os.makedirs(args.preview, exist_ok=True)
        out = os.path.join(args.preview, 'deck-preview.html')
        to_preview_html(slides, out)
        print(f'✓ معاينة HTML: {out}')


if __name__ == '__main__':
    main()
