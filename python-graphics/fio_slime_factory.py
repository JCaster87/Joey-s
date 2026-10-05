"""Figure It Out, Chapter 3 "The Slime Factory" motion graphics.

Pure Python + pycairo, frames piped straight into ffmpeg. No browser,
no React, no Remotion.

    python3 python-graphics/fio_slime_factory.py out/video.mp4
    python3 python-graphics/fio_slime_factory.py --still 100 out/f100.png
"""

import math
import random
import subprocess
import sys
from functools import lru_cache

import cairo

W, H, FPS = 1920, 1080, 30

DISPLAY = "Luckiest Guy"
BODY = "Fredoka Light"  # the converted Fredoka files register under this family


def hexc(h, a=1.0):
    h = h.lstrip("#")
    return (int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255, a)


C = {
    "deep": hexc("#22094F"),
    "purple": hexc("#5E22B8"),
    "violet": hexc("#8A4DE6"),
    "lilac": hexc("#C8A6FF"),
    "slime": hexc("#7FD81E"),
    "slimeDark": hexc("#3F8A0A"),
    "slimeLight": hexc("#D2FF6A"),
    "orange": hexc("#FF7A00"),
    "yellow": hexc("#FFD21F"),
    "teal": hexc("#19C6D6"),
    "pink": hexc("#FF4FA3"),
    "cream": hexc("#FFF5DC"),
    "ink": hexc("#1A0736"),
    "red": hexc("#E8202A"),
    "rim": hexc("#BFE6FF"),
    "white": (1, 1, 1, 1),
}


def alpha(col, a):
    return (col[0], col[1], col[2], col[3] * a)


# ---------------------------------------------------------------------------
# Timing helpers
# ---------------------------------------------------------------------------
def clamp01(x):
    return max(0.0, min(1.0, x))


def lerp(a, b, t):
    return a + (b - a) * t


def remap(x, x0, x1, y0, y1, ease=None):
    t = clamp01((x - x0) / (x1 - x0)) if x1 != x0 else 1.0
    if ease:
        t = ease(t)
    return lerp(y0, y1, t)


def ease_out_cubic(t):
    return 1 - (1 - t) ** 3


def ease_in_cubic(t):
    return t ** 3


def ease_in_quad(t):
    return t * t


def ease_out_quad(t):
    return 1 - (1 - t) ** 2


def ease_inout_cubic(t):
    return 4 * t ** 3 if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2


def ease_out_back(t, s=2.0):
    t -= 1
    return 1 + (s + 1) * t ** 3 + s * t ** 2


@lru_cache(maxsize=None)
def _spring_table(damping, stiffness, mass=0.8, n=400):
    """Damped spring from 0 -> 1, sampled once per frame."""
    x, v, out = 0.0, 0.0, []
    sub = 20
    dt = 1 / FPS / sub
    for _ in range(n):
        out.append(x)
        for _ in range(sub):
            a = (-stiffness * (x - 1) - damping * v) / mass
            v += a * dt
            x += v * dt
    return tuple(out)


def spring(f, damping=11, stiffness=140):
    if f <= 0:
        return 0.0
    tab = _spring_table(damping, stiffness)
    f = min(f, len(tab) - 1)
    i = int(f)
    return tab[i] if i + 1 >= len(tab) else lerp(tab[i], tab[i + 1], f - i)


def rnd(key):
    return random.Random(key).random()


# ---------------------------------------------------------------------------
# Drawing helpers
# ---------------------------------------------------------------------------
def sscale(ctx, sx, sy):
    """ctx.scale that never produces a singular matrix (springs start at 0)."""
    fix = lambda v: v if abs(v) >= 1e-3 else (1e-3 if v >= 0 else -1e-3)
    ctx.scale(fix(sx), fix(sy))


def set_col(ctx, col):
    ctx.set_source_rgba(*col)


def rounded_rect(ctx, x, y, w, h, r):
    r = min(r, w / 2, h / 2)
    ctx.new_sub_path()
    ctx.arc(x + w - r, y + r, r, -math.pi / 2, 0)
    ctx.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    ctx.arc(x + r, y + h - r, r, math.pi / 2, math.pi)
    ctx.arc(x + r, y + r, r, math.pi, 3 * math.pi / 2)
    ctx.close_path()


def blob(ctx, cx, cy, r, amp, lobes, phase, n=36):
    pts = []
    for i in range(n):
        t = i / n * math.tau
        rr = r * (1 + amp * math.sin(lobes * t + phase) + amp * 0.45 * math.sin((lobes + 3) * t - phase * 1.7))
        pts.append((cx + rr * math.cos(t), cy + rr * math.sin(t)))
    ctx.move_to(*pts[0])
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        ctx.curve_to(*c1, *c2, *p2)
    ctx.close_path()


def font(ctx, family, size, bold=False):
    ctx.select_font_face(family, cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD if bold else cairo.FONT_WEIGHT_NORMAL)
    ctx.set_font_size(size)


def text_width(ctx, s, family, size, bold=False):
    font(ctx, family, size, bold)
    return ctx.text_extents(s).x_advance


def draw_text(ctx, s, x, y, size, col, family=BODY, bold=True, align="left",
              stroke=None, stroke_w=None, shadow=None, spacing=0.0):
    """y is the baseline. align: left | center | right."""
    font(ctx, family, size, bold)
    w = ctx.text_extents(s).x_advance + spacing * max(0, len(s) - 1)
    if align == "center":
        x -= w / 2
    elif align == "right":
        x -= w

    def path():
        ctx.new_path()
        if spacing:
            cx = x
            for ch in s:
                ctx.move_to(cx, y)
                ctx.text_path(ch)
                cx += ctx.text_extents(ch).x_advance + spacing
        else:
            ctx.move_to(x, y)
            ctx.text_path(s)

    ctx.save()
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    if shadow:
        ctx.save()
        ctx.translate(size * 0.05, size * 0.07)
        path()
        set_col(ctx, shadow)
        if stroke:
            ctx.set_line_width(stroke_w or size * 0.16)
            ctx.stroke_preserve()
        ctx.fill()
        ctx.restore()
    if stroke:
        path()
        set_col(ctx, stroke)
        ctx.set_line_width(stroke_w or size * 0.16)
        ctx.stroke()
    path()
    set_col(ctx, col)
    ctx.fill()
    ctx.restore()
    return w


def chunky(ctx, s, x, y, size, col, align="center"):
    """Outlined cartoon display text with an offset ink shadow."""
    return draw_text(ctx, s, x, y, size, col, family=DISPLAY, bold=False, align=align,
                     stroke=C["ink"], stroke_w=size * 0.16, shadow=C["ink"])


def wrap(ctx, words, family, size, max_w, bold=True):
    font(ctx, family, size, bold)
    space = ctx.text_extents(" ").x_advance
    lines, cur, cur_w = [], [], 0
    for i, wd in enumerate(words):
        ww = ctx.text_extents(wd).x_advance
        if cur and cur_w + space + ww > max_w:
            lines.append(cur)
            cur, cur_w = [], 0
        cur.append((i, wd, ww))
        cur_w += (space if len(cur) > 1 else 0) + ww
    if cur:
        lines.append(cur)
    return lines, space


# ---------------------------------------------------------------------------
# Shared scenery
# ---------------------------------------------------------------------------
def sunburst(ctx, f, a=C["purple"], b=C["deep"], rays=18, speed=0.12):
    set_col(ctx, b)
    ctx.paint()
    ctx.save()
    ctx.translate(W / 2, H / 2)
    ctx.rotate(math.radians(f * speed))
    step = math.tau / rays
    set_col(ctx, a)
    for i in range(rays):
        a0, a1 = i * step, i * step + step / 2
        ctx.move_to(0, 0)
        ctx.line_to(1600 * math.cos(a0), 1600 * math.sin(a0))
        ctx.line_to(1600 * math.cos(a1), 1600 * math.sin(a1))
        ctx.close_path()
    ctx.fill()
    ctx.restore()
    vignette(ctx, 0.55)


def vignette(ctx, strength):
    g = cairo.RadialGradient(W / 2, H / 2, 0, W / 2, H / 2, math.hypot(W, H) / 2)
    g.add_color_stop_rgba(0.35, 0, 0, 0, 0)
    g.add_color_stop_rgba(1, 0, 0, 0, strength)
    ctx.set_source(g)
    ctx.paint()


def footage_standin(ctx, note="footage / TV room plays here"):
    g = cairo.RadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, 1100)
    g.add_color_stop_rgb(0, *hexc("#3b2a55")[:3])
    g.add_color_stop_rgb(0.55, *hexc("#1d1430")[:3])
    g.add_color_stop_rgb(1, *hexc("#0c0814")[:3])
    ctx.set_source(g)
    ctx.paint()
    draw_text(ctx, note, 40, H - 38, 24, (1, 1, 1, 0.28), bold=False)


def puzzle_piece(ctx, x, y, size, col):
    ctx.save()
    ctx.translate(x, y)
    sscale(ctx, size / 100, size / 100)
    ctx.move_to(20, 30)
    ctx.line_to(40, 30)
    ctx.arc(50, 30, 10, math.pi, 0)
    ctx.line_to(80, 30)
    ctx.line_to(80, 50)
    ctx.arc(80, 60, 10, -math.pi / 2, math.pi / 2)
    ctx.line_to(80, 90)
    ctx.line_to(20, 90)
    ctx.line_to(20, 70)
    ctx.arc_negative(20, 60, 10, math.pi / 2, -math.pi / 2)
    ctx.close_path()
    set_col(ctx, col)
    ctx.fill_preserve()
    set_col(ctx, C["ink"])
    ctx.set_line_width(6)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    ctx.stroke()
    ctx.restore()


def floaties(ctx, f, seed="fio", count=16, opacity=0.9):
    cols = [C["yellow"], C["orange"], C["teal"], C["slime"], C["pink"]]
    ctx.push_group()
    for i in range(count):
        x = rnd(f"{seed}x{i}") * W
        base_y = rnd(f"{seed}y{i}") * 1300
        size = 50 + rnd(f"{seed}s{i}") * 90
        v = 0.6 + rnd(f"{seed}v{i}") * 1.2
        y = ((base_y - f * v + 1300) % 1300) - 110
        rot = math.sin(f / 28 + i) * 18 + rnd(f"{seed}r{i}") * 40 - 20
        col = cols[i % len(cols)]
        ctx.save()
        ctx.translate(x + size / 2, y + size / 2)
        ctx.rotate(math.radians(rot))
        if i % 3 == 2:
            puzzle_piece(ctx, -size / 2, -size / 2, size, col)
        else:
            draw_text(ctx, "?", 0, size * 0.5, size * 1.3, col, family=DISPLAY, bold=False,
                      align="center", stroke=C["ink"], stroke_w=12, shadow=C["ink"])
        ctx.restore()
    ctx.pop_group_to_source()
    ctx.paint_with_alpha(opacity)


def slime_drip(ctx, f, progress, band=70, seed="drip", width=W, max_len=260, count=14,
               ox=0, oy=0, col=C["slime"]):
    band_h = band * min(1, progress * 3)
    drips = []
    for i in range(count):
        x = (i + 0.5) / count * width + (rnd(f"{seed}{i}") - 0.5) * 80
        w = 26 + rnd(f"{seed}w{i}") * 34
        delay = rnd(f"{seed}d{i}") * 0.35
        p = clamp01((progress - delay) / (1 - delay))
        ln = band_h + p * (max_len * (0.35 + rnd(f"{seed}l{i}") * 0.65)) + math.sin(f / 9 + i) * 4 * p
        drips.append((x, w, ln))

    ctx.save()
    ctx.translate(ox, oy)

    def shape():
        ctx.new_path()
        ctx.move_to(0, 0)
        ctx.line_to(width, 0)
        ctx.line_to(width, band_h)
        x = width
        while x >= 0:
            ctx.line_to(x, band_h + math.sin(x / 70 + f / 10) * 8)
            x -= 40
        ctx.line_to(0, 0)
        ctx.close_path()
        for x, w, ln in drips:
            ctx.move_to(x - w / 2, 0)
            ctx.line_to(x - w / 2, ln)
            ctx.arc_negative(x, ln, w / 2, math.pi, 0)
            ctx.line_to(x + w / 2, 0)
            ctx.close_path()

    ctx.set_fill_rule(cairo.FILL_RULE_WINDING)
    # outline: stroke the union by stroking under a fill
    shape()
    set_col(ctx, C["slimeDark"])
    ctx.set_line_width(10)
    ctx.stroke()
    shape()
    set_col(ctx, col)
    ctx.fill()
    # gloss
    set_col(ctx, (1, 1, 1, 0.35))
    for x, w, ln in drips:
        if ln > band_h + 34:
            rounded_rect(ctx, x - w / 4, band_h + 14, w / 6, ln - band_h - 18, w / 12)
            ctx.fill()
    rounded_rect(ctx, 0, 8, width, 6, 3)
    ctx.fill()
    ctx.restore()


def slime_wipe(ctx, f, progress):
    if progress <= 0:
        return
    band = ease_in_cubic(progress) * 1300
    slime_drip(ctx, f, 1, band=max(1, band), max_len=260, seed="wipe", count=18)


def billy(ctx, f, x, y, size, letters="?"):
    """Billy the Answer Head, drawn in a 400x540 box at (x, y) scaled to `size` wide."""
    s = size / 400
    ctx.save()
    ctx.translate(x, y)
    sscale(ctx, s, s)
    bob = math.sin(f / 12) * 3
    g = cairo.LinearGradient(0, 0, 400, 0)
    g.add_color_stop_rgba(0, *C["violet"])
    g.add_color_stop_rgba(0.55, *C["purple"])
    g.add_color_stop_rgba(1, *C["deep"])
    ctx.move_to(80, 60)
    ctx.curve_to(160, 20, 240, 20, 320, 60)
    ctx.line_to(340, 360)
    ctx.curve_to(336, 433, 307, 487, 260, 520)
    ctx.line_to(140, 520)
    ctx.curve_to(93, 487, 64, 433, 60, 360)
    ctx.close_path()
    ctx.set_source(g)
    ctx.fill_preserve()
    set_col(ctx, C["ink"])
    ctx.set_line_width(10)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    ctx.stroke()
    # slot
    rounded_rect(ctx, 95, 70, 210, 84, 12)
    set_col(ctx, C["ink"])
    ctx.fill()
    n = len(letters)
    tw = 200 / n
    for i, ch in enumerate(letters):
        rounded_rect(ctx, 100 + i * tw + 3, 76, tw - 6, 72, 8)
        set_col(ctx, C["yellow"])
        ctx.fill()
        draw_text(ctx, ch, 100 + i * tw + tw / 2, 134, 54, C["purple"], family=DISPLAY, bold=False, align="center")
    # brow
    ctx.move_to(70, 190 + bob)
    ctx.curve_to(157, 170 + bob, 243, 170 + bob, 330, 190 + bob)
    ctx.line_to(330, 222 + bob)
    ctx.curve_to(243, 205 + bob, 157, 205 + bob, 70, 222 + bob)
    ctx.close_path()
    set_col(ctx, C["deep"])
    ctx.fill_preserve()
    set_col(ctx, C["ink"])
    ctx.set_line_width(8)
    ctx.stroke()
    # eyes
    for ex in (140, 260):
        ctx.save()
        ctx.translate(ex, 250)
        sscale(ctx, 34, 20)
        ctx.arc(0, 0, 1, 0, math.tau)
        ctx.restore()
        set_col(ctx, C["ink"])
        ctx.fill()
    # nose
    ctx.move_to(185, 225)
    ctx.line_to(172, 380)
    ctx.curve_to(190, 393, 210, 393, 228, 380)
    ctx.line_to(215, 225)
    ctx.close_path()
    set_col(ctx, C["violet"])
    ctx.fill_preserve()
    set_col(ctx, C["ink"])
    ctx.set_line_width(8)
    ctx.stroke()
    # mouth
    ctx.move_to(135, 440)
    ctx.curve_to(178, 430, 222, 430, 265, 440)
    ctx.set_line_width(14)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.stroke()
    # crack + highlight
    ctx.move_to(95, 300)
    ctx.line_to(110, 330)
    ctx.line_to(100, 360)
    set_col(ctx, C["deep"])
    ctx.set_line_width(5)
    ctx.stroke()
    ctx.move_to(110, 75)
    ctx.curve_to(123, 52, 160, 36, 200, 34)
    set_col(ctx, alpha(C["lilac"], 0.6))
    ctx.set_line_width(8)
    ctx.stroke()
    ctx.restore()


def tile(ctx, f, ch, start, x, y, size, bg, fg):
    """Answer-board tile that flips down from its top edge."""
    if f < start or ch == " ":
        return
    s = spring(f - start, damping=9, stiffness=160)
    ang = math.radians(lerp(-100, 0, s))
    sy = math.cos(ang)
    if abs(sy) < 0.02:
        return
    w, h = size, size * 1.15
    ctx.save()
    ctx.translate(x, y)
    sscale(ctx, 1, sy)
    rounded_rect(ctx, size * 0.06, size * 0.08, w, h, size * 0.12)
    set_col(ctx, C["ink"])
    ctx.fill()
    rounded_rect(ctx, 0, 0, w, h, size * 0.12)
    set_col(ctx, bg)
    ctx.fill_preserve()
    set_col(ctx, C["ink"])
    ctx.set_line_width(size * 0.06)
    ctx.stroke()
    draw_text(ctx, ch, w / 2, h * 0.83, size * 0.9, fg, family=DISPLAY, bold=False, align="center")
    ctx.restore()


def splat(ctx, f, cx, cy, size, col, wobble=True):
    r = size * 0.4
    phase = f / 14 if wobble else 0
    ctx.save()
    ctx.translate(size * 0.03, size * 0.04)
    blob(ctx, cx, cy, r, 0.07, 7, phase)
    set_col(ctx, C["ink"])
    ctx.fill()
    ctx.restore()
    blob(ctx, cx, cy, r, 0.07, 7, phase)
    set_col(ctx, col)
    ctx.fill_preserve()
    set_col(ctx, C["ink"])
    ctx.set_line_width(size * 0.035)
    ctx.stroke()
    ctx.save()
    ctx.translate(cx - r * 0.35, cy - r * 0.48)
    ctx.rotate(math.radians(-30))
    sscale(ctx, r * 0.27, r * 0.12)
    ctx.arc(0, 0, 1, 0, math.tau)
    ctx.restore()
    set_col(ctx, (1, 1, 1, 0.4))
    ctx.fill()


def stamp(ctx, f, text, start, cx, cy, size=80, col=C["red"], rot=-12, bg=None):
    if f < start:
        return
    s = spring(f - start, damping=14, stiffness=260)
    sc = lerp(2.6, 1, s)
    op = remap(f - start, 0, 3, 0, 0.92)
    tw = text_width(ctx, text, DISPLAY, size)
    pw, ph = tw + size * 0.6, size * 1.15
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(math.radians(rot))
    sscale(ctx, sc, sc)
    ctx.push_group()
    rounded_rect(ctx, -pw / 2, -ph / 2, pw, ph, size * 0.18)
    if bg:
        set_col(ctx, bg)
        ctx.fill_preserve()
    set_col(ctx, col)
    ctx.set_line_width(size * 0.09)
    ctx.stroke()
    draw_text(ctx, text, 0, size * 0.36, size, col, family=DISPLAY, bold=False, align="center")
    ctx.pop_group_to_source()
    ctx.paint_with_alpha(op)
    ctx.restore()


def card(ctx, f, cx, cy, w, h, enter, bg=C["cream"], rot=-1.5, drip=True, seed="card"):
    """Begin a card: returns a context manager-ish (save) with origin at the card's top-left
    and a clip set. Call end_card() afterwards."""
    sc = lerp(0.6, 1, enter)
    ctx.save()
    ctx.push_group()
    ctx.translate(cx, cy)
    ctx.rotate(math.radians(rot * enter))
    sscale(ctx, sc, sc)
    ctx.translate(-w / 2, -h / 2)
    rounded_rect(ctx, 14, 16, w, h, 28)
    set_col(ctx, C["ink"])
    ctx.fill()
    rounded_rect(ctx, 0, 0, w, h, 28)
    set_col(ctx, bg)
    ctx.fill()
    ctx.save()
    rounded_rect(ctx, 0, 0, w, h, 28)
    ctx.clip()
    return {"w": w, "h": h, "enter": enter, "drip": drip, "seed": seed}


def end_card(ctx, f, st):
    ctx.restore()  # clip
    rounded_rect(ctx, 0, 0, st["w"], st["h"], 28)
    set_col(ctx, C["ink"])
    ctx.set_line_width(8)
    ctx.stroke()
    if st["drip"]:
        slime_drip(ctx, f, st["enter"], band=26, max_len=90, width=st["w"], count=8,
                   seed=st["seed"], oy=-6)
    ctx.pop_group_to_source()
    ctx.paint_with_alpha(min(1, st["enter"] * 2))
    ctx.restore()


def corner_label(ctx, f, title, sub, start, end, corner="bl", accent=C["slime"]):
    if f < start or f > end:
        return
    s = spring(f - start, damping=12, stiffness=170)
    out = remap(f, end - 8, end, 0, 1)
    tw = max(text_width(ctx, title, DISPLAY, 46), text_width(ctx, sub or "", BODY, 28, True))
    bw = tw + 54 + 22
    bh = 112 if sub else 78
    off = lerp(-(bw + 80), 0, s) - out * (bw + 80)
    if corner == "br":
        x, y = W - 60 - bw - off, H - 70 - bh
    elif corner == "tl":
        x, y = 60 + off, 60
    else:
        x, y = 60 + off, H - 70 - bh
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(math.radians(-2 * s))
    rounded_rect(ctx, 8, 9, bw, bh, 14)
    set_col(ctx, C["ink"])
    ctx.fill()
    rounded_rect(ctx, 0, 0, bw, bh, 14)
    set_col(ctx, C["purple"])
    ctx.fill_preserve()
    set_col(ctx, C["ink"])
    ctx.set_line_width(5)
    ctx.stroke()
    ctx.save()
    rounded_rect(ctx, 0, 0, bw, bh, 14)
    ctx.clip()
    ctx.rectangle(0, 0, 22, bh)
    set_col(ctx, accent)
    ctx.fill()
    ctx.restore()
    ctx.move_to(22, 0)
    ctx.line_to(22, bh)
    set_col(ctx, C["ink"])
    ctx.set_line_width(5)
    ctx.stroke()
    draw_text(ctx, title, 46, 58, 46, C["yellow"], family=DISPLAY, bold=False)
    if sub:
        draw_text(ctx, sub, 46, 96, 28, C["cream"])
    ctx.restore()


def word_reveal(ctx, f, text, start, x, y, max_w, size, col, per_word=4, line_h=1.25,
                highlight=(), family=BODY, align="left"):
    words = text.split(" ")
    lines, space = wrap(ctx, words, family, size, max_w)
    for li, line in enumerate(lines):
        lw = sum(w for _, _, w in line) + space * (len(line) - 1)
        cx = x if align == "left" else x - lw / 2
        by = y + li * size * line_h
        for i, wd, ww in line:
            t = f - start - i * per_word
            o = remap(t, 0, 5, 0, 1)
            dy = lerp(18, 0, ease_out_back(clamp01(t / 6))) if t > 0 else 18
            if o > 0:
                key = "".join(c for c in wd.lower() if c.isalnum())
                if key in highlight:
                    ctx.rectangle(cx, by - size * 0.3 + dy, ww, size * 0.42)
                    set_col(ctx, alpha(C["slimeLight"], o))
                    ctx.fill()
                    c = C["slimeDark"]
                else:
                    c = col
                draw_text(ctx, wd, cx, by + dy, size, alpha(c, o), family=family)
            cx += ww + space


def counter(f, to, start, dur=30):
    return round(remap(f, start, start + dur, 0, to, ease_out_cubic))


# ---------------------------------------------------------------------------
# Segments. Each takes (ctx, f) with f = frame within the segment.
# ---------------------------------------------------------------------------
def seg_title(ctx, f, dur):
    sunburst(ctx, f)
    floaties(ctx, f, "title", 14, 0.8)
    tile_start = 18
    rows = [("THE", 92, C["cream"], C["purple"]),
            ("SLIME", 140, C["yellow"], C["purple"]),
            ("FACTORY", 140, C["slime"], C["ink"])]
    offs, o = [], tile_start
    for t, *_ in rows:
        offs.append(o)
        o += len(t) * 3
    all_in = o + 10

    # Billy rises bottom-left
    bi = spring(f - 4, 13, 120)
    letters = "???" if f < all_in else "!!!"
    bsize = 430
    bh = bsize * 1.35
    by = H - lerp(-700, -90, bi) - bh
    ctx.save()
    ctx.translate(70 + bsize / 2, by + bh)
    ctx.rotate(math.radians(math.sin(f / 20) * 2))
    billy(ctx, f, -bsize / 2, -bh, bsize, letters)
    ctx.restore()

    # tiles, centred in the area right of Billy
    area_l, area_r = 560, W - 40
    y = 270
    for (text, size, bg, fg), off in zip(rows, offs):
        cell = size * 1.08
        rw = len(text) * cell
        x0 = (area_l + area_r) / 2 - rw / 2
        for i, ch in enumerate(text):
            tile(ctx, f, ch, off + i * 3, x0 + i * cell + size * 0.04, y, size, bg, fg)
        y += size * 1.15 + size * 0.08 + 4

    # glob drops onto Billy's head
    if f >= all_in:
        sp = spring(f - all_in - 12, 8, 200)
        if f < all_in + 12:
            dy = remap(f, all_in, all_in + 12, -200, 612, ease_in_quad)
            blob(ctx, 285, dy, 34, 0.05, 3, f / 3)
            set_col(ctx, C["slime"])
            ctx.fill_preserve()
            set_col(ctx, C["slimeDark"])
            ctx.set_line_width(5)
            ctx.stroke()
        else:
            ctx.save()
            ctx.translate(285, 612)
            sscale(ctx, 0.4 + sp * 0.8, 0.4 + sp * 0.55)
            blob(ctx, 0, 0, 70, 0.2, 9, 1.3)
            set_col(ctx, C["slime"])
            ctx.fill_preserve()
            set_col(ctx, C["slimeDark"])
            ctx.set_line_width(6)
            ctx.stroke()
            ctx.translate(-18, -20)
            sscale(ctx, 20, 9)
            ctx.arc(0, 0, 1, 0, math.tau)
            set_col(ctx, (1, 1, 1, 0.45))
            ctx.fill()
            ctx.restore()

    slime_drip(ctx, f, remap(f, 0, 70, 0, 1, ease_out_quad), seed="titleTop", max_len=170)

    # chapter badge
    bs = spring(f - 10, 9, 180)
    if bs > 0.01:
        ctx.save()
        ctx.translate(W - 70 - 125, 60 + 125)
        ctx.rotate(math.radians(-10 + math.sin(f / 15) * 3))
        sscale(ctx, bs, bs)
        splat(ctx, f, 0, 0, 250, C["orange"])
        draw_text(ctx, "CHAPTER", 0, -22, 40, C["cream"], family=DISPLAY, bold=False, align="center",
                  stroke=C["ink"], stroke_w=6)
        draw_text(ctx, "3", 0, 72, 110, C["yellow"], family=DISPLAY, bold=False, align="center",
                  stroke=C["ink"], stroke_w=12)
        ctx.restore()

    slime_wipe(ctx, f, remap(f, dur - 22, dur, 0, 1))


def seg_birth(ctx, f, dur):
    footage_standin(ctx)
    enter = spring(f, 14, 120)
    st = card(ctx, f, W / 2, H / 2, 1300, 860, enter, seed="cert")
    ctx.save()
    rounded_rect(ctx, 22, 22, 1256, 816, 18)
    set_col(ctx, C["purple"])
    ctx.set_line_width(3)
    ctx.stroke()
    rounded_rect(ctx, 30, 30, 1240, 800, 14)
    ctx.stroke()
    ctx.restore()
    draw_text(ctx, "OFFICIAL RECORD", 650, 150, 30, C["purple"], align="center", spacing=8)
    chunky(ctx, "CERTIFICATE OF LIVE SLIME", 650, 250, 86, C["slime"])
    rows = [("NAME", "Slime (green)", 16), ("BORN", "1979 · Ottawa, Canada", 30),
            ("PARENT", "You Can't Do That on Television", 44), ("TRIGGER WORDS", '"I don\'t know."', 58)]
    y = 360
    for k, v, at in rows:
        o = remap(f, at, at + 8, 0, 1)
        wpct = remap(f, at, at + 14, 0, 1)
        if o > 0:
            draw_text(ctx, k, 110, y, 30, alpha(C["purple"], o), spacing=2)
            ctx.save()
            ctx.rectangle(410, y - 60, 780 * wpct, 80)
            ctx.clip()
            draw_text(ctx, v, 410, y, 44, alpha(C["ink"], o), bold=False)
            ctx.restore()
            ctx.rectangle(410, y + 14, 780, 3)
            set_col(ctx, alpha(C["purple"], 0.4 * o))
            ctx.fill()
        y += 90
    end_card(ctx, f, st)
    stamp(ctx, f, "REUSED BY FIGURE IT OUT", 110, W / 2, H / 2 + 300, 72, rot=-9)


def seg_action(ctx, f, dur):
    footage_standin(ctx)
    enter = spring(f, 12, 140)
    st = card(ctx, f, W / 2, H / 2, 1240, 560, enter, bg=C["purple"], rot=2, seed="act")
    chunky(ctx, "SECRET SLIME ACTION", 620, 175, 66, C["slime"])
    t = 'Saying "I don\'t know"'
    tw = draw_text(ctx, t, 620, 290, 64, C["cream"], align="center")
    strike = remap(f, 45, 58, 0, 1)
    if strike > 0:
        rounded_rect(ctx, 620 - tw / 2, 262, tw * strike, 10, 5)
        set_col(ctx, C["red"])
        ctx.fill()
    rv = spring(f - 60, 10, 170)
    if rv > 0.01:
        ctx.save()
        ctx.translate(620, 400)
        ctx.rotate(math.radians(-3 * rv))
        sscale(ctx, rv, rv)
        chunky(ctx, "BEING DANNY TAMBERELLI", 0, 30, 92, C["yellow"])
        ctx.restore()
    end_card(ctx, f, st)
    corner_label(ctx, f, "REPORTED", "per fan pages · no paper trail", 75, 148, "br", C["orange"])


def headshot(ctx, cx, cy, size, initials):
    r = size / 2
    ctx.arc(cx + 10, cy + 12, r + 6, 0, math.tau)
    set_col(ctx, C["ink"])
    ctx.fill()
    ctx.arc(cx, cy, r + 6, 0, math.tau)
    ctx.fill()
    ctx.arc(cx, cy, r, 0, math.tau)
    set_col(ctx, C["rim"])
    ctx.fill()
    g = cairo.LinearGradient(cx - r, cy - r, cx + r, cy + r)
    g.add_color_stop_rgba(0, *C["violet"])
    g.add_color_stop_rgba(1, *C["deep"])
    ctx.arc(cx, cy, r - 10, 0, math.tau)
    ctx.set_source(g)
    ctx.fill()
    draw_text(ctx, initials, cx, cy + size * 0.1, size * 0.32, C["cream"], family=DISPLAY, bold=False, align="center")
    draw_text(ctx, "photo goes here", cx, cy + size * 0.24, size * 0.075, C["lilac"], align="center")


def seg_quote(ctx, f, dur):
    quote = "Whatever they could do to slime me at least three times a day."
    footage_standin(ctx)
    enter = spring(f, 13, 130)
    st = card(ctx, f, W / 2, H / 2, 1500, 640, enter, seed="quote")
    ring = spring(f - 6, 10, 150)
    if ring > 0.01:
        ctx.save()
        ctx.translate(80 + 165, 320)
        ctx.rotate(math.radians((1 - ring) * -40))
        sscale(ctx, ring, ring)
        headshot(ctx, 0, 0, 330, "DT")
        ctx.restore()
    draw_text(ctx, "“", 480, 230, 180, C["orange"], family=DISPLAY, bold=False,
              stroke=C["ink"], stroke_w=12)
    word_reveal(ctx, f, quote, 18, 480, 270, 900, 58, C["ink"], highlight=("three",))
    attr = spring(f - 18 - len(quote.split()) * 4, 12, 150)
    if attr > 0.01:
        ax = 480 + (1 - attr) * 40
        draw_text(ctx, "— Danny Tamberelli", ax, 470, 46, alpha(C["purple"], min(1, attr)), family=DISPLAY, bold=False)
        draw_text(ctx, "Reddit AMA, 2017", ax, 510, 30, alpha(C["purple"], 0.75 * min(1, attr)))
    end_card(ctx, f, st)


def gauge(ctx, f, x, y, value, mx, start):
    v = remap(f, start, start + 45, 0, value, ease_out_cubic)
    level = v / mx
    ctx.save()
    ctx.translate(x, y)
    rounded_rect(ctx, 40, 20, 220, 560, 110)
    set_col(ctx, C["deep"])
    ctx.fill()
    ctx.save()
    rounded_rect(ctx, 40, 20, 220, 560, 110)
    ctx.clip()
    top = 580 - 560 * level
    ctx.rectangle(0, top, 300, 600)
    set_col(ctx, C["slime"])
    ctx.fill()
    ctx.move_to(0, top)
    for i in range(16):
        ctx.line_to(i * 20, top + math.sin(i / 1.5 + f / 5) * 7)
    ctx.line_to(300, top)
    ctx.line_to(300, 600)
    ctx.line_to(0, 600)
    ctx.close_path()
    set_col(ctx, alpha(C["slimeLight"], 0.5))
    ctx.fill()
    for i in range(6):
        by = 560 - ((f * (1.5 + i * 0.3) + i * 90) % 520)
        if by > top:
            ctx.arc(60 + (i * 47) % 160, by, 9, 0, math.tau)
            set_col(ctx, (1, 1, 1, 0.4))
            ctx.fill()
    ctx.restore()
    rounded_rect(ctx, 40, 20, 220, 560, 110)
    set_col(ctx, C["ink"])
    ctx.set_line_width(12)
    ctx.stroke()
    rounded_rect(ctx, 80, 70, 22, 300, 11)
    set_col(ctx, (1, 1, 1, 0.25))
    ctx.fill()
    for t in (0.25, 0.5, 0.75):
        ctx.move_to(225, 580 - 560 * t)
        ctx.line_to(260, 580 - 560 * t)
        set_col(ctx, C["ink"])
        ctx.set_line_width(8)
        ctx.stroke()
    ctx.restore()


def seg_meter(ctx, f, dur):
    sunburst(ctx, f, speed=0.06)
    slime_drip(ctx, f, remap(f, 0, 60, 0, 1), seed="meter", max_len=160)
    hd = spring(f, 12, 140)
    if hd > 0.01:
        ctx.save()
        ctx.translate(W / 2, 220)
        sscale(ctx, hd, hd)
        chunky(ctx, "THE DANNY SLIME-O-METER", 0, 30, 92, C["slime"])
        ctx.restore()
    gauge(ctx, f, 260, 330, 200, 220, 20)
    ctx.save()
    ctx.translate(260 + 150, 330 + 300)
    ctx.rotate(math.radians(-6))
    chunky(ctx, f"~{counter(f, 200, 20, 45)}", 0, 25, 70, C["cream"])
    ctx.restore()
    stats = [(4, "", "shows taped a day", 30, C["yellow"]),
             (3, "", "showers a day (at least)", 54, C["teal"]),
             (96, "", "episodes on the panel", 78, C["orange"]),
             (200, "~", 'times slimed ("maybe")', 102, C["slime"])]
    y = 450
    for n, pre, label, at, col in stats:
        p = spring(f - at, 11, 160)
        if p > 0.01:
            dx = (1 - p) * 80
            ctx.push_group()
            chunky(ctx, f"{pre}{counter(f, n, at, 24)}", 680 + 290 + dx, y, 110, col, align="right")
            draw_text(ctx, label, 680 + 318 + dx, y - 22, 44, C["cream"])
            ctx.pop_group_to_source()
            ctx.paint_with_alpha(min(1, p * 2))
        y += 128
    stamp(ctx, f, "~2 PER SHOW", 150, 1480, 950, 84, col=C["yellow"], rot=-8, bg=C["ink"])
    corner_label(ctx, f, "KENNY: 1 PER EPISODE", "Danny was doing doubles", 195, 268, "tl", C["orange"])


def recipe_card(ctx, f, cx, top, who, source, items, at, col, tilt):
    p = spring(f - at, 11, 140)
    if p <= 0.001:
        return
    w, h = 500, 600
    ctx.save()
    ctx.translate(cx, top + h / 2 + (1 - p) * 700)
    ctx.rotate(math.radians(tilt))
    ctx.translate(-w / 2, -h / 2)
    rounded_rect(ctx, 12, 14, w, h, 24)
    set_col(ctx, C["ink"])
    ctx.fill()
    ctx.save()
    rounded_rect(ctx, 0, 0, w, h, 24)
    ctx.clip()
    set_col(ctx, C["cream"])
    ctx.paint()
    yy = 61
    while yy < h:
        ctx.rectangle(0, yy, w, 3)
        yy += 61
    set_col(ctx, alpha(C["lilac"], 0.4))
    ctx.fill()
    ctx.rectangle(0, 0, w, 100)
    set_col(ctx, col)
    ctx.fill()
    ctx.rectangle(0, 96, w, 8)
    set_col(ctx, C["ink"])
    ctx.fill()
    ctx.restore()
    rounded_rect(ctx, 0, 0, w, h, 24)
    set_col(ctx, C["ink"])
    ctx.set_line_width(8)
    ctx.stroke()
    chunky(ctx, who, w / 2, 76, 54, C["cream"])
    for i, it in enumerate(items):
        t = at + 16 + i * 9
        o = remap(f, t, t + 6, 0, 1)
        if o > 0:
            dx = (1 - o) * -30
            iy = 165 + i * 61
            ctx.arc(52 + dx, iy - 13, 7, 0, math.tau)
            set_col(ctx, alpha(C["slimeDark"], o))
            ctx.fill()
            draw_text(ctx, it, 74 + dx, iy, 38, alpha(C["ink"], o), bold=False)
    draw_text(ctx, source, w / 2, h - 26, 24, alpha(C["purple"], 0.8), align="center", bold=False)
    ctx.restore()


def seg_recipes(ctx, f, dur):
    footage_standin(ctx)
    hd = spring(f, 12, 140)
    if hd > 0.01:
        ctx.save()
        ctx.translate(W / 2, 120)
        sscale(ctx, hd, hd)
        chunky(ctx, "OFFICIAL SLIME RECIPE", 0, 25, 84, C["slime"])
        draw_text(ctx, "according to three people who sat in it", 0, 85, 34, C["cream"], align="center")
        ctx.restore()
    recipe_card(ctx, f, W / 2 - 560, 260, "SUMMER", "MTV News, 2015",
                ["Vanilla pudding", "Green coloring", "Refrigerated", '"So freezing"'], 20, C["teal"], -3)
    recipe_card(ctx, f, W / 2, 260, "LORI BETH", "Vice, 2014",
                ["Oatmeal", "Applesauce", "Green coloring"], 60, C["orange"], 1.5)
    recipe_card(ctx, f, W / 2 + 560, 260, "DANNY", "Reddit AMA, 2012",
                ["Pudding", "Food coloring", "Water", '"Icy cold refreshness"'], 100, C["pink"], -1)
    if f >= 200:
        v = max(spring(f - 200, 12, 150), 0.001)
        ctx.rectangle(0, 0, W, H)
        ctx.set_source_rgba(12 / 255, 6 / 255, 24 / 255, 0.85 * min(1, v))
        ctx.fill()
        for cx, col, who, n, tag, tcol, ncol, wob in (
            (W / 2 - 240, C["red"], "Coca-Cola", "1", "secret formula", C["cream"], C["cream"], False),
            (W / 2 + 240, C["slime"], "Nickelodeon", "3", "secret formulas", C["ink"], C["yellow"], True),
        ):
            ctx.save()
            ctx.translate(cx, H / 2 - 40)
            sscale(ctx, v, v)
            splat(ctx, f, 0, 0, 430, col, wob)
            draw_text(ctx, who, 0, -95, 36, tcol, align="center")
            chunky(ctx, n, 0, 75, 170, ncol)
            draw_text(ctx, tag, 0, 130, 30, tcol, align="center")
            ctx.restore()
        stamp(ctx, f, "DANNY ATE ALL OF THEM", 235, W / 2, H / 2 + 270, 64, col=C["yellow"], rot=-6, bg=C["ink"])


def seg_earth(ctx, f, dur):
    sunburst(ctx, f, a=hexc("#2b1160"), speed=0.05)
    floaties(ctx, f, "earth", 8, 0.35)
    g = spring(f, 13, 120)
    cut = remap(f, 20, 45, 0, 1, ease_inout_cubic)
    ctx.save()
    ctx.translate(700, 560)
    sscale(ctx, g, g)
    ctx.save()
    ctx.rotate(math.radians(f * 0.15))
    for r, col in ((300, hexc("#3A7BD5")), (250, hexc("#8B5A2B")), (190, C["orange"]), (120, C["slime"])):
        ctx.arc(0, 0, r, 0, math.tau)
        set_col(ctx, col)
        ctx.fill_preserve()
        set_col(ctx, C["ink"])
        ctx.set_line_width(8)
        ctx.stroke()
    blob(ctx, 0, 0, 70, 0.12, 5, f / 8)
    set_col(ctx, alpha(C["slimeLight"], 0.7))
    ctx.fill()
    ctx.restore()
    if cut < 1:
        ctx.push_group()
        ctx.arc(0, 0, 300, 0, math.tau)
        set_col(ctx, hexc("#3A7BD5"))
        ctx.fill_preserve()
        set_col(ctx, C["ink"])
        ctx.set_line_width(8)
        ctx.stroke()
        for bx, by, r, amp, lobes, ph in ((-80, -60, 110, 0.25, 4, 0.7), (120, 110, 80, 0.3, 3, 2.1)):
            blob(ctx, bx, by, r, amp, lobes, ph)
            set_col(ctx, hexc("#3FAE4A"))
            ctx.fill_preserve()
            set_col(ctx, C["ink"])
            ctx.set_line_width(6)
            ctx.stroke()
        ctx.pop_group_to_source()
        ctx.paint_with_alpha(1 - cut)
    ctx.restore()

    a = spring(f - 55, 10, 160)
    if a > 0.01:
        ox = 1080 + (1 - a) * 80
        ctx.push_group()
        chunky(ctx, "SLIME ORIGIN:", ox, 370, 70, C["slime"], align="left")
        chunky(ctx, "THE CENTER OF", ox, 470, 92, C["yellow"], align="left")
        chunky(ctx, "THE EARTH", ox, 565, 92, C["yellow"], align="left")
        draw_text(ctx, "what the kids on set were told", ox, 640, 38, C["cream"])
        ctx.pop_group_to_source()
        ctx.paint_with_alpha(min(1, a))
        # arrow drawn on
        ctx.save()
        ctx.set_line_cap(cairo.LINE_CAP_ROUND)
        ctx.set_line_width(14)
        set_col(ctx, C["yellow"])
        ctx.move_to(1060, 520)
        ctx.curve_to(960, 510, 860, 540, 770, 590)
        ctx.set_dash([620], 620 * (1 - min(1, a)))
        ctx.stroke()
        ctx.set_dash([])
        if a > 0.9:
            ctx.move_to(822, 594)
            ctx.line_to(770, 590)
            ctx.line_to(792, 545)
            ctx.stroke()
        ctx.restore()
    corner_label(ctx, f, "LORI BETH DENBERG", "Vice, 2014", 70, 160, "br", C["orange"])


def seg_steve(ctx, f, dur):
    footage_standin(ctx, "footage: Steve Burns gets slimed")
    corner_label(ctx, f, "STEVE BURNS", "Blue's Clues · guest panelist", 6, 70)
    corner_label(ctx, f, 'SLIMED FOR: "HAVING A BLUE DOG"', "reported", 74, 132, accent=C["teal"])


def seg_press(ctx, f, dur):
    footage_standin(ctx)
    enter = spring(f, 14, 130)
    st = card(ctx, f, W / 2, H / 2, 1200, 760, enter, bg=hexc("#FBFBF7"), rot=1.5, drip=False)
    draw_text(ctx, "FOR IMMEDIATE RELEASE · 2012", 80, 100, 28, C["orange"], spacing=6)
    draw_text(ctx, "Figure It Out returns to Nickelodeon", 80, 175, 52, C["ink"])
    grey = hexc("#d9d6cf")

    def bars(y, widths):
        for w in widths:
            rounded_rect(ctx, 80, y, 1040 * w, 22, 6)
            set_col(ctx, grey)
            ctx.fill()
            y += 38
        return y

    y = bars(225, (0.92, 0.80, 0.88))
    base = y + 70
    lead = "Guest panelist: Sherman "
    lw = draw_text(ctx, lead, 80, base, 48, C["ink"])
    nw = draw_text(ctx, "Helmsley", 80 + lw, base, 48, C["ink"])
    circle = remap(f, 40, 62, 0, 1, ease_out_cubic)
    if circle > 0:
        ctx.save()
        ctx.translate(80 + lw + nw / 2, base - 16)
        ctx.rotate(math.radians(-4))
        sscale(ctx, nw / 2 + 26, 52)
        ctx.arc(0, 0, 1, -math.pi * 0.6, -math.pi * 0.6 + math.tau * circle * 1.05)
        ctx.restore()
        set_col(ctx, C["red"])
        ctx.set_line_width(9)
        ctx.set_line_cap(cairo.LINE_CAP_ROUND)
        ctx.stroke()
    bars(base + 50, (0.70, 0.85))
    draw_text(ctx, "recreation", 1170, 735, 22, hexc("#999999"), align="right")
    end_card(ctx, f, st)
    stamp(ctx, f, "IT'S HEMSLEY", 68, W / 2 + 330, H / 2 + 230, 96, rot=-10)
    b = spring(f - 95, 10, 150)
    if b > 0.01:
        bx = W - lerp(-420, -60, b) - 300
        ctx.save()
        ctx.translate(bx + 150, 300 + 200)
        ctx.rotate(math.radians(-14))
        billy(ctx, f, -150, -200, 300, "SIC")
        ctx.restore()


SEGMENTS = [
    (seg_title, 180), (seg_birth, 240), (seg_action, 150), (seg_quote, 210),
    (seg_meter, 270), (seg_recipes, 300), (seg_earth, 165), (seg_steve, 135), (seg_press, 180),
]
TOTAL = sum(d for _, d in SEGMENTS)


def render_frame(surface, n):
    ctx = cairo.Context(surface)
    ctx.set_antialias(cairo.ANTIALIAS_BEST)
    set_col(ctx, C["deep"])
    ctx.paint()
    for fn, dur in SEGMENTS:
        if n < dur:
            fn(ctx, n, dur)
            break
        n -= dur
    surface.flush()


def main():
    args = sys.argv[1:]
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    if args and args[0] == "--still":
        render_frame(surface, int(args[1]))
        surface.write_to_png(args[2])
        return
    out = args[0] if args else "out/fio-ch3-python.mp4"
    ff = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgra",
         "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
         "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", out],
        stdin=subprocess.PIPE,
    )
    for n in range(TOTAL):
        render_frame(surface, n)
        ff.stdin.write(surface.get_data())
        if n % 150 == 0:
            print(f"frame {n}/{TOTAL}", flush=True)
    ff.stdin.close()
    ff.wait()
    print("done", out)


if __name__ == "__main__":
    main()
