"""Draws a callout in callout red (#FF1744) on a screenshot, in place.

    python callout.py <image.png> --circle cx,cy,r [--arrow-from x,y]
    python callout.py <image.png> --box x,y,w,h [--arrow-from x,y]

Coordinates are CSS pixels of the shot, the same units as the clip in a plan, measured from the
top-left of the saved image. drive.mjs saves at 2x, so they are doubled here (--scale changes that).
Use a circle for a small icon and a box for a row of icons or a field. The arrow points from
--arrow-from to the edge of the shape; leave it out when the shape alone is clear.
"""
import argparse
import math

from PIL import Image, ImageDraw

RED = "#FF1744"

p = argparse.ArgumentParser()
p.add_argument("image")
p.add_argument("--circle")
p.add_argument("--box")
p.add_argument("--arrow-from")
p.add_argument("--scale", type=float, default=2)
p.add_argument("--width", type=int, default=6, help="line width in image pixels (6 on a 2x shot prints at about 1.5 pt)")
a = p.parse_args()
if bool(a.circle) == bool(a.box):
    p.error("give exactly one of --circle or --box")

nums = lambda s: [float(v) * a.scale for v in s.split(",")]
img = Image.open(a.image).convert("RGB")
d = ImageDraw.Draw(img)

if a.circle:
    cx, cy, r = nums(a.circle)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=RED, width=a.width)
else:
    x, y, w, h = nums(a.box)
    cx, cy = x + w / 2, y + h / 2
    d.rounded_rectangle([x, y, x + w, y + h], radius=12 * a.scale / 2, outline=RED, width=a.width)

if a.arrow_from:
    sx, sy = nums(a.arrow_from)
    dx, dy = cx - sx, cy - sy
    dist = math.hypot(dx, dy)
    ux, uy = dx / dist, dy / dist
    if a.circle:
        reach = dist - r - a.width
    else:  # distance from the start to where the line meets the box edge
        tx = (w / 2) / abs(ux) if ux else math.inf
        ty = (h / 2) / abs(uy) if uy else math.inf
        reach = dist - min(tx, ty) - a.width
    ex, ey = sx + ux * reach, sy + uy * reach
    head = 8 * a.width / 2
    d.line([sx, sy, ex - ux * head, ey - uy * head], fill=RED, width=a.width)
    px, py = -uy, ux
    d.polygon([(ex, ey), (ex - ux * head * 2 + px * head, ey - uy * head * 2 + py * head),
               (ex - ux * head * 2 - px * head, ey - uy * head * 2 - py * head)], fill=RED)

img.save(a.image)
print("callout drawn on", a.image)
