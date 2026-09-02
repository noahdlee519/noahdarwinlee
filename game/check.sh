#!/bin/bash
# Layout Guesser — checks your pictures and your answers.
# Run from the repo root:  bash game/check.sh
cd "$(dirname "$0")/.." || exit 1
python3 - <<'PY'
# -*- coding: utf-8 -*-
import json, os, sys, re, collections, itertools, unicodedata

try:
    data = json.load(open("game/cities.json", encoding="utf-8"))
except Exception as e:
    print("cities.json is not valid JSON:\n  %s" % e)
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
levels = [t["id"] for t in data["tiers"] if t.get("group", "level") == "level"]
print("cities.json: %d cities, %d aliases, valid\n"
      % (len(cities), sum(len(c.get("aliases") or []) for c in cities)))

def report(label, ids):
    done = [i for i in ids if i in have]
    flag = "playable" if len(done) >= need else "needs %d more for a full game" % (need - len(done))
    print("%-14s %3d of %3d pictures   (%s)" % (label, len(done), len(ids), flag))

for t in data["tiers"]:
    if t.get("continent"):
        report(t["label"], [c["id"] for c in cities if c.get("continent") == t["continent"]])
    elif t["id"] == "mixed":
        report(t["label"], [c["id"] for c in cities])
    else:
        report(t["label"], [c["id"] for c in cities if c["tier"] == t["id"]])

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

dupes = [i for i, n in collections.Counter(c["id"] for c in cities).items() if n > 1]
if dupes:
    print("\nDuplicate ids in cities.json: " + ", ".join(dupes))

# ---------- answers ----------
# Mirrors the matcher in game.js. If you change one, change the other.

def norm(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()

def lev(a, b):
    if a == b: return 0
    if not a: return len(b)
    if not b: return len(a)
    two, prev = [], list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        cur = [i]
        for j in range(1, len(b) + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            v = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
            if i > 1 and j > 1 and a[i - 1] == b[j - 2] and a[i - 2] == b[j - 1]:
                v = min(v, two[j - 2] + 1)
            cur.append(v)
        two, prev = prev, cur
    return prev[len(b)]

def tol(n):
    return 0 if n <= 3 else (1 if n <= 12 else 2)

EVERY_TERM = {}
for _c in cities:
    for _t in [_c["city"]] + (_c.get("aliases") or []):
        _k = norm(_t)
        if _k and _k not in EVERY_TERM:
            EVERY_TERM[_k] = _c["id"]

def matches(guess, city):
    g = norm(guess)
    if not g: return False
    terms = [norm(city["city"])] + [norm(a) for a in city.get("aliases") or []]
    if g in terms: return True
    # exactly some other city's name means they meant that city, not a typo here
    if EVERY_TERM.get(g) not in (None, city["id"]): return False
    for t in terms:
        if not t: continue
        if abs(len(g) - len(t)) > tol(len(t)): continue
        if lev(g, t) <= tol(len(t)): return True
    return False

# Checked across all 100 cities, not level by level, because mixed mode puts
# every level into the same game.
trouble = []
for a, b in itertools.permutations(cities, 2):
    for term in [a["city"]] + (a.get("aliases") or []):
        if matches(term, b):
            trouble.append("  typing %r for %s (%s) also counts as %s (%s)"
                           % (term, a["city"], a["tier"], b["city"], b["tier"]))

for c in cities:
    for term in [c["city"]] + (c.get("aliases") or []):
        if not matches(term, c):
            trouble.append("  %s does not accept its own %r" % (c["id"], term))

print()
if trouble:
    print("Answer clashes (%d) — two cities accept the same guess:" % len(trouble))
    print("\n".join(trouble[:40]))
    print("\nFix by making the alias more specific, or dropping it.")
else:
    print("Answers: no clashes. Every alias points at exactly one city.")
PY
