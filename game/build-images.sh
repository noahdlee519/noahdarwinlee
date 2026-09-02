#!/bin/bash
# Layout Guesser — turns the screenshots in game/<level> maps/ into the web
# files the page actually loads, in art/game/.
#
#   bash game/build-images.sh            only what has changed
#   FORCE=1 bash game/build-images.sh    rebuild everything
#
# Drop a screenshot into "game/easy maps" (named after the city's id, e.g.
# chicago.png), run this, and it appears in the game. Originals are left alone
# and are never committed; only the small .webp copies go into the repo.
cd "$(dirname "$0")/.." || exit 1
python3 - <<'PY'
# -*- coding: utf-8 -*-
import glob, io, json, os, sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow isn't installed. Run:  python3 -m pip install --user pillow")

LONG_EDGE = 1400          # px on the long side, for the round itself
TARGET_KB = 360           # aim under this; quality steps down until it fits
ZOOM_EDGE = 2600          # the "@2x" file the magnifier loads, capped at the
ZOOM_KB = 620             # original's own size — never upscaled
QUALITIES = [82, 74, 66]  # a dense city may land above the target at 66; that
                          # is better than crushing the detail the game is about
FORCE = os.environ.get("FORCE") == "1"

data = json.load(io.open("game/cities.json", encoding="utf-8"))
by_id = {c["id"]: c for c in data["cities"]}
os.makedirs("art/game", exist_ok=True)

built = skipped = 0
problems = []

for tier in [t["id"] for t in data["tiers"] if t["id"] != "mixed"]:
    folder = "game/%s maps" % tier
    if not os.path.isdir(folder):
        continue
    for src in sorted(glob.glob(folder + "/*")):
        name = os.path.basename(src)
        if name.startswith(".") or os.path.splitext(name)[1].lower() not in (
            ".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"):
            continue
        cid = os.path.splitext(name)[0]
        if cid not in by_id:
            problems.append("%s/%s — no city with id %r in cities.json" % (folder, name, cid))
            continue
        if by_id[cid]["tier"] != tier:
            problems.append("%s/%s — cities.json has %s in the %s level"
                            % (folder, name, by_id[cid]["city"], by_id[cid]["tier"]))

        dst = "art/game/%s.webp" % cid
        if not FORCE and os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            skipped += 1
            continue

        full = Image.open(src)
        if full.mode not in ("RGB", "L"):
            full = full.convert("RGB")
        w, h = full.size

        def fit(edge):
            if max(w, h) <= edge:
                return full
            scale = edge / float(max(w, h))
            return full.resize((int(round(w * scale)), int(round(h * scale))), Image.LANCZOS)

        def write(path, img, cap):
            for q in QUALITIES:
                img.save(path, "WEBP", quality=q, method=6)
                if os.path.getsize(path) <= cap * 1024:
                    break
            return q, os.path.getsize(path) // 1024

        small = fit(LONG_EDGE)
        q1, kb1 = write(dst, small, TARGET_KB)

        big = fit(ZOOM_EDGE)
        zoom_dst = "art/game/%s@2x.webp" % cid
        q2, kb2 = write(zoom_dst, big, ZOOM_KB)

        built += 1
        print("  %-18s %sx%s -> %s (%d KB q%d) + @2x %s (%d KB q%d)"
              % (cid, w, h, small.size[0], kb1, q1, big.size[0], kb2, q2))

print("\n%d built, %d already up to date" % (built, skipped))
if problems:
    print("\nCheck these:")
    for p in problems:
        print("  " + p)

files = sorted(f for f in glob.glob("art/game/*.webp") if "@2x" not in f)
zoom_files = sorted(glob.glob("art/game/*@2x.webp"))
total = sum(os.path.getsize(f) for f in files)
n = len(files)
zoom_total = sum(os.path.getsize(f) for f in zoom_files)
if n:
    print("\nart/game: %d images, %.1f MB total, %d KB average"
          % (n, total / 1048576.0, total // n // 1024))
    print("          + %d @2x files for the magnifier, %.1f MB "
          "(only fetched when someone zooms)" % (len(zoom_files), zoom_total / 1048576.0))

# The page reads this instead of guessing at filenames. Without it, "mixed"
# has to ask the server about all 100 cities to find the ten that exist.
manifest = sorted(os.path.splitext(os.path.basename(f))[0] for f in files)
io.open("art/game/images.json", "w", encoding="utf-8").write(
    json.dumps({"ext": "webp", "zoomExt": "@2x.webp", "ids": manifest},
               indent=0, ensure_ascii=False) + "\n")
print("art/game/images.json: %d ids" % len(manifest))
PY
