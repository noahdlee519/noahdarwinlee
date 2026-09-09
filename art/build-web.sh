#!/bin/bash
# Builds the pictures the front page serves, from the originals you keep.
# Run from the repo root:  bash art/build-web.sh
#
#   art/originals/baby-contest.jpg          ->  art/web/baby-contest-640.jpg
#                                               art/web/baby-contest-640.webp
#                                               art/web/baby-contest-1280.webp
#                                               art/web/baby-contest-2400.webp
#   art/originals/masaryk/ma1.jpg           ->  art/web/masaryk/ma1-*.…
#
# The folder structure under art/originals is mirrored under art/web, so where
# a picture goes is decided by where you put it. Originals are gitignored: they
# are what you work from, not what the site serves.
#
#   640   what a picture in a row loads
#   1280  what a lead loads, and a row on a dense screen
#   2400  loaded only when somebody opens a picture full screen, and only for
#         the picture they opened. art/web/full.json says which have one.
#
# FORCE=1 rebuilds everything; otherwise only what has changed since last time.
cd "$(dirname "$0")/.." || exit 1
python3 - "$@" <<'PY'
# -*- coding: utf-8 -*-
import io, json, os, sys

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("This needs Pillow:  pip3 install --user Pillow")

SRC, OUT = "art/originals", "art/web"
KEEP = (".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp")
FORCE = os.environ.get("FORCE") == "1"

# width, format, quality. The jpg is the fallback for a browser with no webp.
SIZES = [
    (640, "jpg", 86),
    (640, "webp", 82),
    (1280, "webp", 84),
    (2400, "webp", 80),
]

if not os.path.isdir(SRC):
    sys.exit(
        "No %s folder yet.\n\n"
        "Make it and put your originals in, using the same folder names as\n"
        "art/web: a painting on its own at the top level, a project's pictures\n"
        "in a folder of their own. Then run this again." % SRC
    )

built = skipped = 0
stems = []

for here, _dirs, files in os.walk(SRC):
    for name in sorted(files):
        stem, ext = os.path.splitext(name)
        if ext.lower() not in KEEP or name.startswith("."):
            continue
        origin = os.path.join(here, name)
        target_dir = os.path.join(OUT, os.path.relpath(here, SRC)).rstrip("/.")
        os.makedirs(target_dir, exist_ok=True)
        base = os.path.join(target_dir, stem)

        # A photograph off a phone carries its orientation in its EXIF rather
        # than in its pixels, and every size built from it would come out on
        # its side without this.
        im = ImageOps.exif_transpose(Image.open(origin))
        native = im.size[0]

        # Never invent detail: a 900px original gets a 640 and nothing above it.
        # Working that out before the freshness check matters, or a small
        # original looks stale for ever, its missing large sizes counted as
        # work still to do.
        wanted = [
            ("%s-%d.%s" % (base, w, fmt), w, fmt, q)
            for w, fmt, q in SIZES
            if w <= native or w == SIZES[0][0]
        ]
        for w, fmt, _q in SIZES:
            if w > native and w != SIZES[0][0]:
                stale = "%s-%d.%s" % (base, w, fmt)
                if os.path.exists(stale):
                    os.remove(stale)

        fresh = os.path.getmtime(origin)
        if not FORCE and all(
            os.path.exists(p) and os.path.getmtime(p) >= fresh for p, _, _, _ in wanted
        ):
            skipped += 1
            if os.path.exists("%s-2400.webp" % base):
                stems.append(base)
            continue

        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        print("  %s  (%d x %d)" % (origin, im.size[0], im.size[1]))

        for path, width, fmt, quality in wanted:
            w = min(width, im.size[0])
            h = round(im.size[1] * w / im.size[0])
            small = im.resize((w, h), Image.LANCZOS)
            if fmt == "jpg":
                small.save(path, "JPEG", quality=quality, optimize=True, progressive=True)
            else:
                small.save(path, "WEBP", quality=quality, method=6)
            print("      -> %s  %d x %d  %d KB" % (path, w, h, os.path.getsize(path) // 1024))
        built += 1
        if os.path.exists("%s-2400.webp" % base):
            stems.append(base)

manifest = {
    "note": [
        "Pictures that have a full-size file for the lightbox, listed by the",
        "stem their other sizes share. lightbox.js reads this once, and only",
        "when the first picture is opened: <stem>-2400.webp is fetched at that",
        "moment and swapped in behind the gallery's copy, which is already on",
        "screen. art/build-web.sh writes this file.",
    ],
    "suffix": "-2400.webp",
    "stems": sorted(stems),
}
io.open(os.path.join(OUT, "full.json"), "w", encoding="utf-8").write(
    json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"
)

print()
print("built %d, unchanged %d, %d with a full-size copy" % (built, skipped, len(stems)))
if not stems:
    print("Nothing has a 2400px version yet — every original was smaller than that.")
PY
