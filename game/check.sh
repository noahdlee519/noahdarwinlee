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
    if stem in by_id:
        have.setdefault(stem, f)
    else:
        strays.append(f)

need = data.get("rounds", 10)
levels = [t["id"] for t in data["tiers"] if t["id"] != "random"]
print("cities.json: %d cities, %d aliases, valid\n"
      % (len(cities), sum(len(c.get("aliases") or []) for c in cities)))
for tier in levels:
    ids = [c["id"] for c in cities if c["tier"] == tier]
    done = [i for i in ids if i in have]
    flag = "playable" if len(done) >= need else "needs %d more for a full game" % (need - len(done))
    print("%-7s %3d of %3d pictures   (%s)" % (tier, len(done), len(ids), flag))
print("%-7s %3d of %3d pictures   (%s)"
      % ("random", len(have), len(cities),
         "playable" if len(have) >= need else "needs %d more" % (need - len(have))))

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

def matches(guess, city):
    g = norm(guess)
    if not g: return False
    for t in [norm(city["city"])] + [norm(a) for a in city.get("aliases") or []]:
        if not t: continue
        if g == t: return True
        if abs(len(g) - len(t)) > tol(len(t)): continue
        if lev(g, t) <= tol(len(t)): return True
    return False

# Checked across all 100 cities, not level by level, because random mode puts
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
