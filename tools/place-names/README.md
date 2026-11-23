# Place names in the reader's language

These scripts build `chronia/lang/places-xx.json` and `uchronia/lang/places-xx.json`, which hold the names of countries, states, cities, towns, lakes, and rivers in 13 languages: es, fr, de, nl, it, pt, cs, pl, tr, ru, zh, ja, and ko. A name missing from a file shows in English.

## Running them

From this folder:

```
mkdir -p out
sh fetch_ne.sh
python3 ne_props.py
REPO=../.. python3 ne_match_u.py
REPO=../.. python3 ne_match_c.py
python3 build_u.py ../../uchronia/lang
python3 build_c.py ../../chronia/lang
```

`ne/`, `out/`, and `ne-props.json` are working files and are not committed.

## Where the names come from

1. **Natural Earth.** The 1:10m layers on GitHub carry each feature's name in 12 of the 13 languages (not Czech) and its Wikidata ID. `ne_match_u.py` and `ne_match_c.py` match the apps' places to them:
   - UCHRONIA countries match by code.
   - States and provinces match by country and name.
   - Cities and towns match by name within 40 km and 25 km.
   - CHRONIA's cities match by the Wikidata ID they already carry.
   - CHRONIA's divisions match by country and name.
   - Countries in CHRONIA's catalogue match by name.
   - Natural Earth's lake names are left out because they are cut short ("Superior" for Lake Superior).
2. **Wikidata (still to do; it needs `wikidata.org` and `query.wikidata.org` allowed for the session).** The second pass writes:
   - `out/wd-labels.json`: `{ "Q90": { "fr": "Paris", … } }`, with labels fetched 50 at a time from `wbgetentities` (`props=labels`, all 13 languages).
   - `out/u-wd-ids.json` and `out/c-wd-ids.json`: `{ key: "Q…" }` for places Natural Earth did not match.

   The keys come from:
   - **CHRONIA's polities:** their English Wikipedia titles (column 3 of `eras.json` polities). Use a label only when the item's English label or title is the name shown.
   - **The rest:** a search by English label and coordinates (`wikibase:around`) for UCHRONIA's unmatched provinces, units, towns, lakes, and rivers, and for CHRONIA's lakes, rivers, and dated city names.

   The build scripts already read these files when they exist. Natural Earth's name wins where both have one.

## Keys in the language files

**UCHRONIA:**

| Key | Form |
| --- | --- |
| `c` | country code |
| `p`, `g` | `CODE|province or group` |
| `u` | `CODE|unit` |
| `city`, `town` | `name|lon|lat`, exactly as in the data |
| `lake`, `river` | name |

**CHRONIA:**

| Key | Form |
| --- | --- |
| `pol` | polity name |
| `q` | `Qid|name`, used when the city shows its modern name |
| `city` | name (only names with a single translation) |
| `div` | `region key|division` |
| `lake`, `river` | name |

When the data files are rebuilt, rebuild these too. A key that no longer matches only falls back to English.
