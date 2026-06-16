#!/usr/bin/env python3
"""Erzeugt die PWA-Icons (Flamme auf Farbverlauf) mit Pillow.

Aufruf:  python3 scripts/gen_icons.py
Ergebnis: PNGs in icons/
"""
import math
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
SS = 4  # Supersampling fuer glatte Kanten

# Farbverlauf (oben links -> unten rechts): Orange -> Pink -> Lila
C0 = (255, 154, 61)
C1 = (255, 77, 141)
C2 = (123, 92, 255)

WHITE = (255, 255, 255)
GOLD = (255, 210, 63)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def grad3(t):
    return lerp(C0, C1, t * 2) if t < 0.5 else lerp(C1, C2, (t - 0.5) * 2)


def gradient(size):
    """Diagonaler 3-Stopp-Verlauf, klein berechnet und hochskaliert (schnell)."""
    n = 64
    small = Image.new("RGB", (n, n))
    px = small.load()
    for y in range(n):
        for x in range(n):
            px[x, y] = grad3((x + y) / (2 * (n - 1)))
    return small.resize((size, size), Image.BILINEAR)


def teardrop(n=240, m=2.6):
    pts = []
    for i in range(n + 1):
        t = 2 * math.pi * i / n
        x = math.cos(t)
        y = math.sin(t) * (math.sin(t / 2) ** m)
        pts.append((-y, x))  # 90 Grad drehen -> Spitze zeigt nach oben
    return pts


def map_points(pts, box):
    x0, y0, x1, y1 = box
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    w, h = maxx - minx, maxy - miny
    scale = min((x1 - x0) / w, (y1 - y0) / h)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    mx, my = (minx + maxx) / 2, (miny + maxy) / 2
    # y spiegeln (Mathe-y zeigt nach oben, Bild-y nach unten)
    return [(cx + (x - mx) * scale, cy - (y - my) * scale) for (x, y) in pts]


def render(size, maskable):
    ss = size * SS
    base = gradient(ss).convert("RGBA")
    draw = ImageDraw.Draw(base)

    flame = teardrop()
    fh = 0.54 if maskable else 0.64  # Anteil der Flammenhoehe
    fw = fh * 0.92
    bx0 = ss * (0.5 - fw / 2)
    bx1 = ss * (0.5 + fw / 2)
    by0 = ss * (0.5 - fh / 2)
    by1 = ss * (0.5 + fh / 2)

    outer = map_points(flame, (bx0, by0, bx1, by1))
    draw.polygon(outer, fill=WHITE)

    # Innere Flamme: kleiner und nach unten versetzt
    iw = (bx1 - bx0) * 0.5
    ih = (by1 - by0) * 0.55
    icx = (bx0 + bx1) / 2
    inner_box = (icx - iw / 2, by1 - ih - (by1 - by0) * 0.06, icx + iw / 2, by1 - (by1 - by0) * 0.06)
    inner = map_points(flame, inner_box)
    draw.polygon(inner, fill=GOLD)

    if not maskable:
        mask = Image.new("L", (ss, ss), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, ss - 1, ss - 1], radius=int(ss * 0.22), fill=255)
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
            bg = Image.new("RGB", img.size, C2)
            bg.paste(img, mask=img.split()[3])
            img = bg
        img.save(os.path.join(OUT, name))
        print("ok", name)


if __name__ == "__main__":
    main()
