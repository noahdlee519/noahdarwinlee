#!/bin/bash
# Layout Guesser — turns the screenshots in game/maps/ into the web files the
# page actually loads, in art/game/.
#
#   bash game/build-images.sh            only what has changed
#   FORCE=1 bash game/build-images.sh    rebuild everything
#
# Drop a screenshot into game/maps (named after the city, e.g. chicago.png),
# run this, and it appears in the game. If the name is one cities.json doesn't
# know, an entry is written for it. Originals are left alone and are never
# committed; only the built copies go into the repo.
cd "$(dirname "$0")/.." || exit 1
python3 - <<'PY'
# -*- coding: utf-8 -*-
import glob, io, json, os, sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow isn't installed. Run:  python3 -m pip install --user pillow")

# The round image is WebP because every browser can read it. It is shown at
# most 760 css px wide, so 1200 is still well above what a 1x screen needs.
LONG_EDGE = 1200
TARGET_KB = 230
QUALITIES = [70, 62, 55]

# The magnifier file is AVIF: about a third smaller than WebP for the same
# picture. Safe here in a way it would not be for the round image, because the
# loupe starts from the WebP and only swaps to this one once it has loaded — a
# browser too old for AVIF just gets a slightly softer magnifier, not a hole.
ZOOM_EDGE = 2600          # capped at the original's own size — never upscaled
ZOOM_KB = 340
ZOOM_FORMAT = "AVIF"
ZOOM_EXT = "@2x.avif"
ZOOM_QUALITIES = [58, 52, 46]

FORCE = os.environ.get("FORCE") == "1"

data = json.load(io.open("game/cities.json", encoding="utf-8"))
by_id = {c["id"]: c for c in data["cities"]}
os.makedirs("art/game", exist_ok=True)

built = skipped = 0
problems = []
added = []

SOURCES = ["game/maps"] + ["game/%s maps" % t["id"]
                           for t in data["tiers"] if t.get("group") == "level"]

for folder in SOURCES:
    if not os.path.isdir(folder):
        continue
    for src in sorted(glob.glob(folder + "/*")):
        name = os.path.basename(src)
        if name.startswith(".") or os.path.splitext(name)[1].lower() not in (
            ".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"):
            continue
        cid = os.path.splitext(name)[0]

        # The folder is the source of truth: a picture you drop in gets an entry
        # written for it rather than being skipped. Fill in the blanks by hand.
        if cid not in by_id:
            entry = {"id": cid, "tier": "hard",
                     "city": cid.replace("-", " ").title(),
                     "country": "", "continent": "", "aliases": []}
            data["cities"].append(entry)
            by_id[cid] = entry
            added.append(cid)

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

        def write(path, img, fmt, qualities, cap):
            opts = {"method": 6} if fmt == "WEBP" else {"speed": 6}
            for q in qualities:
                img.save(path, fmt, quality=q, **opts)
                if os.path.getsize(path) <= cap * 1024:
                    break
            return q, os.path.getsize(path) // 1024

        small = fit(LONG_EDGE)
        q1, kb1 = write(dst, small, "WEBP", QUALITIES, TARGET_KB)

        big = fit(ZOOM_EDGE)
        zoom_dst = "art/game/%s%s" % (cid, ZOOM_EXT)
        q2, kb2 = write(zoom_dst, big, ZOOM_FORMAT, ZOOM_QUALITIES, ZOOM_KB)

        built += 1
        print("  %-18s %sx%s -> %s (%d KB q%d) + @2x %s (%d KB q%d)"
              % (cid, w, h, small.size[0], kb1, q1, big.size[0], kb2, q2))

print("\n%d built, %d already up to date" % (built, skipped))

if added:
    def esc(x):
        return json.dumps(x, ensure_ascii=False)
    L = ["{", '  "credit": %s,' % esc(data["credit"]), '  "rounds": %d,' % data["rounds"],
         '  "imageDir": %s,' % esc(data["imageDir"]), '  "tiers": [']
    for i, t in enumerate(data["tiers"]):
        bits = '"id": %s, "label": %s, "group": %s' % (esc(t["id"]), esc(t["label"]), esc(t.get("group", "level")))
        if t.get("continent"):
            bits += ', "continent": %s' % esc(t["continent"])
        L.append('    { %s }%s' % (bits, "" if i == len(data["tiers"]) - 1 else ","))
    L += ["  ],", '  "cities": [']
    groups = [[c for c in data["cities"] if c["tier"] == t] for t in ["easy", "medium", "hard"]]
    for gi, g in enumerate(groups):
        g.sort(key=lambda c: c["id"])
        for ci, c in enumerate(g):
            last = gi == len(groups) - 1 and ci == len(g) - 1
            L.append("    {")
            L.append('      "id": %s, "tier": %s, "city": %s, "country": %s, "continent": %s,'
                     % (esc(c["id"]), esc(c["tier"]), esc(c["city"]),
                        esc(c.get("country", "")), esc(c.get("continent", ""))))
            L.append('      "aliases": [%s]' % ", ".join(esc(a) for a in c.get("aliases") or []))
            L.append("    }%s" % ("" if last else ","))
        if gi != len(groups) - 1:
            L.append("")
    L += ["  ]", "}"]
    out = "\n".join(L) + "\n"
    json.loads(out)
    io.open("game/cities.json", "w", encoding="utf-8").write(out)
    print("\nAdded %d new %s to cities.json — each one needs a level, a country,"
          % (len(added), "entry" if len(added) == 1 else "entries"))
    print("a continent and some aliases filled in by hand:")
    for cid in added:
        print("  " + cid)

if problems:
    print("\nCheck these:")
    for p in problems:
        print("  " + p)

files = sorted(f for f in glob.glob("art/game/*.webp") if "@2x" not in f)
zoom_files = sorted(glob.glob("art/game/*@2x.*"))
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
    json.dumps({"ext": "webp", "zoomExt": ZOOM_EXT, "ids": manifest},
               indent=0, ensure_ascii=False) + "\n")
print("art/game/images.json: %d ids" % len(manifest))
PY
