#!/bin/bash
# citylayoutguessr — checks your pictures and your answers.
# Run from the repo root:  bash citylayoutguessr/check.sh
cd "$(dirname "$0")/.." || exit 1
python3 - <<'PY'
# -*- coding: utf-8 -*-
import json, os, sys, re, collections, unicodedata

try:
    data = json.load(open("citylayoutguessr/cities.json", encoding="utf-8"))
except Exception as e:
    print("cities.json is not valid JSON:\n  %s" % e)
    print("\nUsually a missing or extra comma. Fix that and run this again.")
    sys.exit(1)

try:
    extra = json.load(open("citylayoutguessr/catalog.json", encoding="utf-8"))["cities"]
except Exception as e:
    print("catalog.json is not valid JSON:\n  %s" % e)
    print("\nUsually a missing or extra comma. Fix that and run this again.")
    sys.exit(1)

cities = data["cities"]
by_id = {c["id"]: c for c in cities}
exts = (".webp", ".jpg", ".jpeg", ".png")

# ---------- pictures ----------

have, strays = {}, []
for f in sorted(os.listdir("art/game")):
    stem, ext = os.path.splitext(f)
    if ext.lower() not in exts:
        continue
    if "@2x" in stem:
        continue
    if stem in by_id:
        have.setdefault(stem, f)
    else:
        strays.append(f)

need = data.get("rounds", 10)
levels = [t["id"] for t in data.get("tiers", [])]
conts = [c["id"] for c in data.get("continents", [])]
packs = data.get("packs", [])

# A pack-only city is in its pack and nowhere else, so counting it towards a
# level or a continent would promise a game that is smaller than it looks.
# The levels and continents below are the ordinary game; the packs report
# themselves, and they are the only place a pack-only city is counted.
ordinary = [c for c in cities if not c.get("packOnly")]

def in_pack(c, pack):
    return (c.get("country") in (pack.get("countries") or [])
            or pack["id"] in (c.get("packs") or []))
print("cities.json: %d cities, %d aliases, valid\n"
      % (len(cities), sum(len(c.get("aliases") or []) for c in cities)))

def report(label, ids):
    done = [i for i in ids if i in have]
    flag = "playable" if len(done) >= need else "needs %d more for a full game" % (need - len(done))
    print("%-16s %3d of %3d pictures   (%s)" % (label, len(done), len(ids), flag))

for t in levels:
    report(t, [c["id"] for c in ordinary if c["tier"] == t])
print()
for t in conts:
    report(t.lower(), [c["id"] for c in ordinary if c.get("continent") == t])
print()
report("everything", [c["id"] for c in ordinary])
if packs:
    print()
    for pk in packs:
        report(pk["label"].lower(), [c["id"] for c in cities if in_pack(c, pk)])

blank = [c["id"] for c in cities if not c.get("continent") or not c.get("country")]
if blank:
    print("\nEntries still missing a country or continent (%d):" % len(blank))
    print("  " + " ".join(blank))

missing = [c["id"] for c in cities if c["id"] not in have]
if missing:
    print("\nStill needed (%d) — first 30:" % len(missing))
    print("  " + "\n  ".join(missing[:30]))

if strays:
    print("\nFiles in art/game that match no city id — check the spelling:")
    for f in strays:
        print("  " + f)

# ---------- the regions ----------
# A guess is paid a quarter for landing in the answer's region, which only
# works if every country anybody can name has exactly one. A country missing
# here can never be half right, and one listed twice makes the answer depend
# on which line was read first.
regions = data.get("regions", [])
if regions:
    where, twice = {}, []
    for r in regions:
        for co in r.get("countries", []):
            if co in where:
                twice.append(co)
            where[co] = r
    named = set(c.get("country") for c in cities if c.get("country"))
    try:
        named |= set(c.get("country") for c in
                     json.load(open("citylayoutguessr/catalog.json", encoding="utf-8"))["cities"])
    except Exception:
        pass
    lost = sorted(n for n in named if n and n not in where)
    print("\nRegions: %d, covering %d countries." % (len(regions), len(where)))
    if twice:
        print("  In more than one region: " + ", ".join(sorted(set(twice))))
    if lost:
        print("  In no region, so a guess from there can never be half right:")
        print("    " + "\n    ".join(lost))
    if not twice and not lost:
        print("  Every country in play and on the list has exactly one.")

dupes = [i for i, n in collections.Counter(c["id"] for c in cities).items() if n > 1]
if dupes:
    print("\nDuplicate ids in cities.json: " + ", ".join(dupes))

# ---------- the names the guess box offers ----------
# The box only sends names it offered, so a guess is right when the name taken
# off the list is this round's city and wrong otherwise -- nothing is measured
# and nothing is forgiven. What can still go wrong is two cities laying claim
# to the same name: whichever was read first would swallow it, and the other
# could never be typed at all. That is what this looks for.

def norm(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()

# cities.json first, the same order game.js reads them in.
entries = [(c["city"], c.get("country"), [c["city"]] + (c.get("aliases") or []), "cities.json")
           for c in cities]
entries += [(c["city"], c.get("country"), [c["city"]], "catalog.json") for c in extra]

owner = {}
taken = []
for name, country, terms, where in entries:
    for term in terms:
        k = norm(term)
        if not k:
            continue
        if k in owner:
            first, first_where = owner[k]
            if first != name:
                taken.append("  %r belongs to %s (%s) and is taken again by %s (%s)"
                             % (term, first, first_where, name, where))
        else:
            owner[k] = (name, where)

nowhere = ["  %s (%s)" % (n, w) for n, c, t, w in entries if not c]
unsorted = [c["city"] for a, c in zip(extra, extra[1:]) if norm(c["city"]) < norm(a["city"])]

print()
print("The guess box offers %d names for %d cities (%d in play, %d only on the list)."
      % (len(owner), len(entries), len(cities), len(extra)))

if taken:
    print("\nNames claimed twice (%d) -- the second one can never be typed:" % len(taken))
    print("\n".join(taken[:40]))
    print("\nFix by dropping it from catalog.json, or making the alias more specific.")
else:
    print("Every name on it points at exactly one city.")

if nowhere:
    print("\nEntries with no country to show beside the name (%d):" % len(nowhere))
    print("\n".join(nowhere[:20]))

if unsorted:
    print("\ncatalog.json is meant to stay alphabetical. Out of order after: "
          + ", ".join(unsorted[:10]))
PY
