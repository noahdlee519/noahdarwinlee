# Builds chronia/art/instruments.webp, the margins of CHRONIA's own pages (team, reports, privacy, and
# terms): eight engraved instruments, drawn by GPT Image 2 through Higgsfield on white (tools/chronia-art/,
# 0 globe, 1 compass, 2 protractor, 3 stopwatch, 4 map, 5 dividers, 6 astrolabe, 7 hourglass and sextant),
# turned into sepia ink on a clear ground and set down both sides of a tile that repeats seamlessly both
# ways, so the page can be any length. Run: python3 tools/chronia-art.py
import os, random
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INK = (58, 42, 27)
W, H = 1400, 2100
STRENGTH = 0.32  # how dark the ink is at its darkest

def ink(path, size):
    im = ImageOps.autocontrast(Image.open(path).convert("L"), cutoff=1)
    a = im.point(lambda v: 0 if v > 235 else int(min(255, (235 - v) * 1.35)))
    a = a.crop(a.getbbox())
    a.thumbnail((size, size), Image.LANCZOS)
    out = Image.new("RGBA", a.size, INK + (0,))
    out.putalpha(a)
    return out

def put(tile, d, x, y):
    l, t = max(0, x), max(0, y)
    r, b = min(tile.width, x + d.width), min(tile.height, y + d.height)
    if r > l and b > t:
        tile.alpha_composite(d.crop((l - x, t - y, r - x, b - y)), (l, t))

random.seed(11)
tile = Image.new("RGBA", (W, H), INK + (0,))
left = [(0, 175, 265), (4, 195, 790), (2, 170, 1320), (6, 185, 1840)]
right = [(1, 1225, 525), (3, 1215, 1050), (7, 1220, 1575), (5, 1235, 2090)]
for n, x, y in left + right:
    size = 380 if n == 5 else random.randint(300, 360)
    d = ink(os.path.join(ROOT, "tools", "chronia-art", "%d.jpg" % n), size)
    d = d.rotate(random.uniform(-14, 14), expand=True, resample=Image.BICUBIC)
    for dx in (-W, 0, W):
        for dy in (-H, 0, H):
            put(tile, d, int(x - d.width / 2 + dx), int(y - d.height / 2 + dy))
tile.putalpha(tile.getchannel("A").point(lambda v: int(v * STRENGTH)))
out = os.path.join(ROOT, "chronia", "art", "instruments.webp")
os.makedirs(os.path.dirname(out), exist_ok=True)
tile.save(out, quality=82, method=6)
print(out, os.path.getsize(out), "bytes")
