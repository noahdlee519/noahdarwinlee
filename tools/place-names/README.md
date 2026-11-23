# Place names in the reader's language

These scripts build `chronia/lang/places-xx.json` and `uchronia/lang/places-xx.json`, which hold the names of countries, states, cities, towns, lakes, and rivers in 13 languages: es, fr, de, nl, it, pt, cs, pl, tr, ru, zh, ja, and ko. A name missing from a file shows in English.

## Running them

From this folder, with `query.wikidata.org` reachable and `npm i topojson-client d3-geo` and `pip install opencc-python-reimplemented` done:

```
mkdir -p out wd
sh fetch_ne.sh && python3 ne_props.py
REPO=../.. python3 ne_match_u.py && REPO=../.. python3 ne_match_c.py
REPO=../.. python3 wd_pol.py && REPO=../.. python3 wd_pol2.py
REPO=../.. node u_list.cjs && REPO=../.. python3 c_list.py
python3 wd_search.py wd/u-search.json wd/u-found.json
python3 wd_search.py wd/c-search.json wd/c-found.json
python3 wd_types.py && python3 wd_rivers.py
python3 wd_labels.py
```

Then write `out/u-wd-ids.json` and `out/c-wd-ids.json` from the `wd/*-found.json` files, keeping only the hits that `wd/types.json` confirms are the right kind of place (a settlement, an administrative area, a lake, a river), and build:

```
python3 build_u.py ../../uchronia/lang
python3 build_c.py ../../chronia/lang
```

`ne/`, `out/`, `wd/`, and `ne-props.json` are working files and are not committed.

## Where the names come from

1. **Natural Earth's 1:10m layers** carry names in 12 of the 13 languages (no Czech) and Wikidata IDs. They are matched by code (countries), by country and name (provinces, divisions), and by name within 25 to 40 km (cities, towns).
2. **Wikidata**, through the query service only:
   - **Polities:** CHRONIA's polities resolve through their English Wikipedia titles. A label is used only when the item's English label or title is the polity's name. The rest match by exact English label, among items with at least three sitelinks.
   - **Places without an ID:** the rest are found by English label (then the `mul` label) within a set distance of the place: 15 km for towns, 60 km for units, 150 km for provinces, and 600 km for rivers. A hit is kept only if its type fits.
   - **Rivers** are searched again as "X River" among items that are rivers.
3. **Labels** are fetched for every ID. Chinese prefers zh-hans and is converted to simplified; Portuguese prefers pt-br.
4. **`clean.py`:**
   - drops brackets;
   - drops labels in the wrong script for ru, zh, ja, and ko;
   - strips words like "Province of", "condado de", and "ilçesi" when the English name has none;
   - keeps the first comma part of a town;
   - capitalises the first letter in Latin-script languages.
5. **Choosing between sources:**
   - Natural Earth's name wins, except for lakes and rivers.
   - For countries and polities, the shorter of the two names wins.
   - Labels of list articles are dropped.
6. **`manual-u.json` and `manual-c.json`** override the rest. For now they only set China's common name.

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
