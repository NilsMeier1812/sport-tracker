#!/usr/bin/env python3
"""Erzeugt die PWA-Icons im Retro-Varsity-Stil mit Pillow.

Echte Flamme (aus Bezier-Pfaden) auf Burnt-Orange-Badge mit gruenem Rand.
Aufruf:  python3 scripts/gen_icons.py   ->  PNGs in icons/
"""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
SS = 4  # Supersampling fuer glatte Kanten

ORANGE = (200, 80, 30)
GREEN = (31, 77, 58)
CREAM = (255, 250, 239)
GOLD = (217, 154, 28)

# Flamme in 0..100 Koordinaten (y nach unten). Spitze oben, mit Zungen.
FLAME_OUTER = [
    ("M", 54, 8),
    ("C", 54, 24, 64, 28, 60, 40),
    ("C", 72, 34, 74, 50, 66, 58),
    ("C", 84, 62, 82, 86, 58, 92),
    ("C", 53, 94, 47, 94, 42, 91),
    ("C", 20, 82, 22, 58, 36, 52),
    ("C", 30, 44, 33, 30, 44, 33),
    ("C", 46, 24, 50, 16, 54, 8),
    ("Z",),
]
FLAME_INNER = [
    ("M", 52, 50),
    ("C", 52, 60, 58, 63, 55, 72),
    ("C", 64, 68, 63, 84, 52, 88),
    ("C", 48, 90, 44, 89, 42, 86),
    ("C", 34, 80, 38, 65, 47, 63),
    ("C", 49, 58, 49, 54, 52, 50),
    ("Z",),
]


def cubic(p0, p1, p2, p3, t):
    mt = 1 - t
    x = mt**3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t**3 * p3[0]
    y = mt**3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t**3 * p3[1]
    return (x, y)


def sample(commands, steps=30):
    pts = []
    cur = None
    for c in commands:
        if c[0] == "M":
            cur = (c[1], c[2])
            pts.append(cur)
        elif c[0] == "C":
            p0 = cur
            p1, p2, p3 = (c[1], c[2]), (c[3], c[4]), (c[5], c[6])
            for i in range(1, steps + 1):
                pts.append(cubic(p0, p1, p2, p3, i / steps))
            cur = p3
    return pts


def transform_for(pts, box):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    w, h = maxx - minx, maxy - miny
    x0, y0, x1, y1 = box
    s = min((x1 - x0) / w, (y1 - y0) / h)
    ox = x0 + ((x1 - x0) - w * s) / 2 - minx * s
    oy = y0 + ((y1 - y0) - h * s) / 2 - miny * s
    return lambda p: (p[0] * s + ox, p[1] * s + oy)


def render(size, maskable):
    ss = size * SS
    base = Image.new("RGBA", (ss, ss), ORANGE + (255,))
    draw = ImageDraw.Draw(base)

    outer = sample(FLAME_OUTER)
    inner = sample(FLAME_INNER)
    box = (ss * 0.27, ss * 0.16, ss * 0.73, ss * 0.86) if maskable else (ss * 0.22, ss * 0.12, ss * 0.78, ss * 0.9)
    tf = transform_for(outer, box)  # gleicher Transform fuer beide Pfade
    draw.polygon([tf(p) for p in outer], fill=CREAM)
    draw.polygon([tf(p) for p in inner], fill=GOLD)

    if not maskable:
        bw = max(2, int(ss * 0.055))
        r = int(ss * 0.22)
        draw.rounded_rectangle(
            [bw // 2, bw // 2, ss - 1 - bw // 2, ss - 1 - bw // 2],
            radius=r,
            outline=GREEN,
            width=bw,
        )
        mask = Image.new("L", (ss, ss), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, ss - 1, ss - 1], radius=r, fill=255)
        base.putalpha(mask)

    return base.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    jobs = [
        ("icon-192.png", 192, False, True),
        ("icon-512.png", 512, False, True),
        ("icon-192-maskable.png", 192, True, True),
        ("icon-512-maskable.png", 512, True, True),
        ("favicon-32.png", 32, False, True),
        ("apple-touch-icon.png", 180, True, False),
    ]
    for name, size, maskable, keep_alpha in jobs:
        img = render(size, maskable)
        if not keep_alpha:
            bg = Image.new("RGB", img.size, ORANGE)
            bg.paste(img, mask=img.split()[3])
            img = bg
        img.save(os.path.join(OUT, name))
        print("ok", name)


if __name__ == "__main__":
    main()
