# Chronia

An atlas of the world's borders from 3000 BC to today. A year control at the foot of the page moves the map through time, on a globe or a flat map, in the Antique style of [UCHRONIA](../uchronia/). Clicking a state or a people opens a card with what the maps say about it and the opening of its Wikipedia article.

Until 1880 the borders come from dated snapshot maps. From 1886 they are dated to the day, so every year can be shown, and every month from 1976, with each state's capital and, from 1900, about 3,000 cities under the names they had at the time.

Chronia is the real-history companion to UCHRONIA, which redraws history. The two share the same look, the same base geography, and the same rendering approach. Chronia has its own page, data, and code, and it reads some of UCHRONIA's files in place (see [What it borrows from UCHRONIA](#what-it-borrows-from-uchronia)).

- **Live:** https://noahdarwinlee.com/chronia/ (not yet linked from the rest of the site)
- **First built:** 25 October 2026.

## Using it

- **The year:**
  - Drag the marker along the scale.
  - Type into the box: `1815`, `500 BC`, `-500`, `AD 800`, `1950`, `June 1991`, `25 June 1991`, `1991-06`, and `6/1991` all work.
  - The arrow buttons, or ← and →, go to the previous or next change of borders: the previous or next map before 1886, and the previous or next dated change after it.
  - With Shift, they move by one year, or by one month from 1976.
  - The play button, or P, plays through time: map by map until 1880, 1.4 seconds apart, then year by year from 1886, 0.7 seconds apart.
- **The map:** drag to turn the globe or move the flat map. Scroll, pinch, the + and − buttons, or the + and − keys zoom. A double-click zooms in on the spot. M switches between the globe and the flat map.
- **A state:** hover to see its name and, for a dependency, its ruler. Click it to open the card. Esc closes the card.
- **Links:** the address keeps the time and the view (`#y=1815&v=10.00,48.00,4.00&flat=1`, or `#y=1991-06-15&…` from 1886), so a link opens the same map.

## How it is built

A static page, no build step, like the rest of the site.

| Path | What it holds |
| --- | --- |
| `index.html` | The page. Its CSP allows no inline script and no inline style. `connect-src` adds `https://en.wikipedia.org`, and `img-src` adds `https://upload.wikimedia.org`, for the card. |
| `app.js` | The whole app in one function scope: projection and tracing, the map loader, drawing, labels, the year control, the card, and input. |
| `app.css` | All styling. Chronia has one style, Antique, set by `class="ch"` and `data-theme="light"` on `<html>`, so it ignores the site's theme toggle. |
| `tools/build-eras.mjs` | The data builder. |
| `data/eras.json` | The list of maps, the dates of the changes from 1886, and the catalogue of every state and people named on them. |
| `data/eras/*.json` | One file per snapshot map, from `bc3000.json` to `1880.json`. |
| `data/modern.json` | Every state and dependency from 1886, each a span of days with one shape, as one TopoJSON. |
| `data/land.json` | Natural Earth land, merged from UCHRONIA's provinces. |
| `data/places.json` | Places with known dates, used before 1900. |
| `data/cities.json` | UCHRONIA's cities, with founding dates and names by date, used from 1900. |
| `data/COPYING-historical-basemaps.txt` | The GPL-3.0 text that covers the map files (see [Credits](#credits)). |

### What it borrows from UCHRONIA

Chronia loads these from `../uchronia/` rather than copying them, so they are not duplicated in the repository:

- `vendor/d3-array.min.js`, `vendor/d3-geo.min.js`, and `vendor/topojson-client.min.js`;
- `sat.js`, the WebGL layer, which Chronia uses only for terrain relief;
- `data/relief-4096.webp`, `data/sea.json` (deep water), `data/rivers.json`, and `data/lakes.json`.

Renaming or reshaping any of these in UCHRONIA breaks Chronia. `data/land.json` is built from `uchronia/data/provinces.json`, so a change to UCHRONIA's coastline reaches Chronia only after a rebuild.

## The data

### Source

**Until 1880:** [historical-basemaps](https://github.com/aourednik/historical-basemaps) by André Ourednik, one GeoJSON file per year. Chronia uses the 39 maps from 3000 BC to 1880:

3000, 2000, 1500, 1000, 700, 500, 400, 323, 300, 200, 100, and 1 BC; AD 100 to 1400 by centuries, with 1279 added; 1492, 1500, 1530, 1600, 1650, 1700, 1715, 1783, 1800, 1815, 1878, and 1880.

**From 1886:** [CShapes 2.0](https://icr.ethz.ch/data/cshapes/) (Schvitz, Girardin, Rüegger, Weidmann, Cederman, and Gleditsch, 2022), from 1 January 1886 to 31 December 2019. It records every independent state and dependent territory as a series of spans, each with its own shape, start and end dates, status (independent, colony, protectorate, mandate, or occupied), owner, and capital. The builder reads the Gleditsch and Ward edition, `cshapes_2_gw.topojson`, which ships inside the CShapes R package. It is easiest to get from the CRAN mirror on GitHub, because the ETH site can't be reached from Claude's sessions. historical-basemaps' own maps from 1900 on are not used.

In historical-basemaps, each shape has a name (`NAME`), the power it is subject to (`SUBJECTO`), the larger cultural area it is part of (`PARTOF`), and how precise its border is (`BORDERPRECISION`, 1 to 3). Shapes with no name are land that no state or people on that map covers.

### Building

```
git clone --depth 1 https://github.com/aourednik/historical-basemaps.git
git clone --depth 1 https://github.com/cran/cshapes.git
xz -dk cshapes/inst/extdata/cshapes_2_gw.topojson.xz
npm i topojson-server topojson-client topojson-simplify d3-geo polygon-clipping
node chronia/tools/build-eras.mjs node_modules historical-basemaps/geojson "" cshapes/inst/extdata/cshapes_2_gw.topojson
```

The third argument points at UCHRONIA's `provinces.json`; an empty string keeps the default, `../../uchronia/data/provinces.json` from the tools folder. An optional sixth argument points at the cities, by default UCHRONIA's `data/cities.json`. The build takes about two minutes. It writes into `data/` but doesn't clear it, so empty the folder first when maps are dropped. When a map's data is wrong, fix it in the builder's tables, so that a rebuild keeps the fix.

What the builder does to each map:

1. **Cleaning:**
   - `RENAME` merges names that mean the same state. For example, the 1815 map has both "United Kingdom" and "United Kingdom of Great Britain and Ireland".
   - `RULER_FIX` sets the ruler of dependencies that the source lists as independent, by name and years. Examples are the Philippines under Spain until 1898 and the United States after, Ceylon and the Cape Colony under Britain, and Kamerun and Togoland under Germany.
   - `RULER_ALIAS` and `LINEAGE` resolve a ruler named differently from any state on the same map. In 1914, for example, the British Raj is held by "United Kingdom", while the state on the map is "United Kingdom of Great Britain and Ireland".
   - A ruler equal to the state itself, or written as a note in brackets, is dropped.
2. **Merging:** all shapes with the same name become one state, so that it is one entry and one click.
3. **Peoples:** a state is marked as a people or culture rather than a state when:
   - its name matches `PEOPLES` (hunter-gatherers, farmers, pastoralists, "cultures", Bantu, Khoisan, and so on); or
   - it is one of the Aboriginal nations on maps before 1900. This is detected as a shape in Australia with no ruler whose name is not a colony's.

   Peoples are drawn uncoloured with italic names, and their borders are dotted.
4. **Two levels of detail:**
   - `hi`: simplified to about 1.6 km and quantized to 200,000 steps;
   - `lo`: simplified to about 12 km and quantized to 20,000 steps.

   Both are TopoJSON with one object, `p`, whose geometries are in the same order as `rows`.
5. **Labels:** for each state, the builder computes:
   - the pole of inaccessibility of its largest piece, with the radius of the largest circle inside it;
   - the room along a principal axis, with the axis angle when it lies between 12° and 40°;
   - its area.

   States over 1.5 million km² also get extra spots, one per 30° band of longitude that holds a large part of them. Each extra spot's room is measured along its own parallel across the whole state. The page uses the spot that shows best from the current view.
6. **Colour:** every state gets one of the ten Antique colours, and keeps it across all maps:
   - States in a `LINEAGE` (England through the United Kingdom, Muscovy through the Russian Federation, the Chinese dynasties, and others) share one colour.
   - A dependency takes its ruler's colour.
   - Colours are chosen greedily, largest first, to keep neighbours apart round the colour wheel. Neighbours are the shapes that touch on any map, plus labels close across water.
   - The build prints how many touching pairs still share a colour (12 at present).
7. **Wikipedia titles:** `WIKI` and `WIKI_BY_YEAR` give an article title where the plain name would find the wrong article, such as Han → Han dynasty, or France from 843 to 1792 → Kingdom of France.

### From 1886

What the builder does to CShapes:

1. **Names by date:** `CS_NAMES` gives each CShapes name its names over time, and a span that crosses a renaming is split in two with the same shape. For example, Russia (Soviet Union) becomes the Russian Empire, then Soviet Russia from 7 November 1917, the Soviet Union from 30 December 1922, and Russia from 26 December 1991. The table holds about 70 such names, from Ceylon to Sri Lanka to Upper Volta and Burkina Faso. Other names lose their brackets.
2. **Owners:** a dependency's owner code is matched to the owner's name on the day the span starts. It becomes the ruler, so a colony takes its ruler's colour, as before 1886.
3. **Capitals:** `CAP_FIX` corrects spellings (Bukarest, Tirane, Masqat, and others). Capitals that appear in the city table take its names by date, so Harare shows as Salisbury in 1950.
4. **One topology:** all 740 spans go into one TopoJSON at the same two levels of detail as the snapshots, so the borders shared between spans are stored once. Labels are computed per span, and spans with the same shape share a label.
5. **Colours:** each country code keeps one colour key throughout, taken from its first name: its lineage, or its historical-basemaps name if it has one. A state therefore keeps the colour it had in 1880 where the names match. Neighbours are spans that touch and overlap in time.
6. **Changes:** every day a span starts, or the day after one ends, goes into `eras.json` as a change, 397 in all.

A row in `modern.json` is `[id, owner id, first day, last day, status, capital, label]`. Days count from 1 January 1886, and a last day of `-1` means the span runs to the end of the data. A capital is `[name, lon, lat, names by day]`.

### Cities from 1900

From 1900, Chronia shows UCHRONIA's 3,060 cities (GeoNames), by their tiers as the map zooms in:

- `CITY_SINCE` holds the founding dates of cities that didn't exist in 1900, such as Brasília (1960), Canberra (1913), Islamabad (1961), Naypyidaw (2005), Tel Aviv (1909), and Soviet new towns like Magnitogorsk and Norilsk. They appear from that date.
- `CITY_NAMES` holds about 90 cities' names by date: St. Petersburg, Petrograd, Leningrad, and St. Petersburg again; Tsaritsyn, Stalingrad, and Volgograd; Königsberg and Kaliningrad; Saigon; Léopoldville; Salisbury; Bombay; Peking and Peiping; Constantinople; Alma-Ata; Frunze; Akmolinsk through Nur-Sultan and back to Astana; and so on. The build lists any names in the table that it can't find in the cities.

Capitals are drawn first, with a ringed mark and upright names. Cities follow in italics, where they don't collide.

### Rows in the snapshot files

A row in a map file is `[id, ruler id, part-of id, precision, people, label]`, with ids into `polities` in `eras.json`. A missing row value is `-1`, and unnamed land is `[-1]`. A `label` is `[lon, lat, radius km, room km, angle°, area km², spots]`.

A `polities` entry is `[name, colour, years on the snapshot maps, Wikipedia title or [[year, title], …], people, [first year, last year] from 1886 or null]`.

### Places before 1900

Only 70 of the 2,340 places in the source's `places.geojson` have a founding year, and almost none have an end year. Chronia shows those places from their founding year onwards, with these changes:

- `PLACE_DROP` removes four that are not settlements (Calusa, Levisa, Cumbe Mayo, and the Ōyu stone circles).
- `PLACE_EDIT` adds end years to places long abandoned (Ur, Uruk, Harappa, Great Zimbabwe, Taxila, and others), corrects the dates of Xanadu and Vijayanagara, and gives some places names by year:
  - Ziz, then Panormus, then Palermo;
  - Constantinople, then Istanbul from 1930;
  - Kiev, then Kyiv from 1995.

The undated places are left out, because showing them would put ruins on maps of centuries when they were not lived in.

## Drawing

### The engine

The projection and tracing come from UCHRONIA's `app.js`: `prepare`, `traceRing`, `traceLine`, `traceFlat`, `featureInFront`, and their helpers. Shapes are turned once into unit vectors, and each frame projects them with the view's basis vectors.

- **On the globe:** points behind the horizon are pushed to the rim. A shape that might wrap round the far side, meaning its bounding cap holds the point opposite the view, is drawn through d3 instead.
- **On the flat map:** shapes are unwrapped in longitude and drawn up to three times, so the map scrolls without end once it is wider than the window.

Chronia first used d3's own path with clipping for everything. It took about 190 ms a frame in headless Chromium, against about 35 ms now.

### The order of a frame

1. **The sea:** ocean, deep water, the graticule, and the ripple lines along the coast.
   - These are kept in an offscreen canvas and redrawn only when the view changes. Scrubbing through the years therefore never redraws them.
   - While the map moves, one ripple is drawn instead of up to four.
2. **The land:**
   - Clipped to Natural Earth land, the land is filled with paper colour, then with each state's colour, peoples' colour, and unnamed land.
   - The historical shapes' coastlines don't match Natural Earth's exactly. So before the fills, each colour is stroked about 24 km wide inside the land clip. That fills the slivers between the two coastlines, and the fills then cover it everywhere else.
3. **Relief:** UCHRONIA's relief image is laid over the land through `sat.js`, at 72% "overlay".
4. **Colour bands:** inside each colour's shapes, a band is drawn along its borders and coasts, as in UCHRONIA's Antique style.
5. **Hover and selection:** a hovered state is tinted. A selected state is tinted red and outlined in red.
6. **Water:** lakes and rivers. Rivers start at a scale of about 520 px for the globe's radius.
7. **Lines:** the coastline, then the borders, each clipped to land:
   - between a dependency and its ruler, or two dependencies of one ruler: thin and faint;
   - between other states: solid;
   - soft borders: dotted. A border is soft when the map is before 1648, when either side has precision 1, or when either side is a people.
8. **Finishing:** the aged paper (seams, vignette, and highlight on the globe; darkened top and bottom on the flat map), and the double rim.
9. **Labels:**
   - **States**, largest first, each at its best visible spot. They are in capitals, sized to fit the room at the spot up to 26 px, on one, two, or three lines, whichever gives the larger size.
   - **States too small** for 8.5 px first try tighter letter spacing. If that is still too small, they get a fixed 9 px label, on two lines for long names, if it doesn't collide.
   - **Peoples:** in italics, up to 15 px.
   - **Seas** (the same list and scales as UCHRONIA).
   - **Capitals and cities** from 1886, or dated places before.

   Labels never overlap one another or the page's panels. Collisions are tested on the rotated boxes themselves, not on their bounding boxes, so a slanted name doesn't block a whole neighbouring country.

The `hi` level is used when the globe's radius is at least 900 px and the map is still, or at 2,600 px and over. Otherwise `lo` is used.

## The year

- **Time:** the page keeps one number, the time in decimal years. Before 1886 it is a whole year. From 1886 it stands for a day: 1 July for a year shown on its own (1886 to 1975), and the 15th for a month (from 1976), unless a change or a typed date gives another day.
- **The scale:** it is uneven, so that recent times get room. It is set by `KNOTS`: 3000 BC at 0, 500 BC at 0.13, AD 500 at 0.24, 1400 at 0.37, 1800 at 0.53, 1886 at 0.6, 1976 at 0.79, and the end of 2026 at 1. The slider has 10,000 steps.
- **Ticks:** above the line, a mark for each snapshot map, and a fainter one for each change from 1886. The current map's mark is red.
- **Snapping:** dragging moves in steps of 10 years before AD 1000, single years from then to 1975, and months after. Within 5 px of a snapshot map's tick, the marker snaps to that map's year.
- **What is shown:**
  - Before 1886, the latest map at or before the year. Under the year, the page says "The map of 1815" or "Borders as of 1800".
  - From 1886, the spans that hold on that day. The page says "Borders on 1 July 1950".
  - After 2019, the last day of the data, and it says so.
- **Loading:**
  - Snapshot files load when needed, and the maps before and after the current one load next. At most eight are kept.
  - `modern.json` loads at the start. A day's set of spans becomes a map, and the last 24 sets are kept.
  - Shapes are converted once per span, so moving between sets only recomputes the borders. Scrubbing through a century takes about 100 ms in headless Chromium.

## The card

- **The heading:** whether it is a state, a colony, protectorate, mandate, occupied territory, or other dependency, or a people or culture, and its name.
- **What the current map says:** who holds it, with a link to the ruler; what it is part of; and the maps it appears on.
  - From 1886, it also gives the capital, under its name at the time, and the dates of the current borders ("These borders from 16 June 1910 to 29 June 1960").
  - If it is not on the current map, the card says so and stays open, so a state can be followed through time.
  - States with precision 1 carry "Its borders here are approximate".
- **Wikipedia:** the card fetches the summary of the article named by the builder's title for that map's year, from `https://en.wikipedia.org/api/rest_v1/page/summary/`.
  - If there is none, or it is a disambiguation page, the card tries the plain name, then Wikipedia's search.
  - The card shows the extract and the article's thumbnail, sepia-toned, and links to the article. When the article's title differs from the state's name, the link names it.
  - Only `upload.wikimedia.org` images and `en.wikipedia.org` links are used.

These requests go from the visitor's browser to Wikipedia when a state is clicked, and nothing else is sent. The privacy page does not yet mention this.

## Testing

As with UCHRONIA, test on a local copy, never the live site.

1. Serve the repository root with `python3 -m http.server`. Chronia needs `../uchronia/`, `/fonts/`, and `../styles.css` beside it.
2. Drive it with Playwright (headless Chromium). Wait for `__chronia.ready()`.
3. Wikipedia can't be reached from Claude's sessions, so stand in for it with `page.route(/wikipedia\.org/, …)`, returning a summary object.
4. Check the globe and the flat map, a phone width (390×844 with touch), a tablet width, BC years (dotted borders, peoples), a year between maps ("Borders as of …"), the step from 1880 to 1886, a month after 1976 and the Shift steps, the card, and the about note.

`window.__chronia` has:

- `ready()`, `year()` (the time in decimal years), `shown()` (the text in the year box), `date()` (from 1886), `mapYear()` (a snapshot's year, or `"modern"`), `maps()`, `setYear(y)` (a number, or text as typed in the box), `step(dir, unit)`;
- `view`, `setView(lon, lat, zoom)`, `setFlat(on)`, `project(lon, lat)`;
- `polities()`, `selectName(name)`, `selected()`, `hitAt(x, y)`, `labels()`;
- `timeRender(n)`, and `moving(on)` to time the moving path.

Headless Chromium has no GPU, so frame times there are several times what a real machine shows. Compare them with each other, not with a phone.

## Known limits

- **Snapshots:** before 1886, nothing moves between two maps, so 1815 to 1878 is one jump.
- **CShapes' coverage:** it records only states and recognised dependencies. Land outside them is left as paper: Arabia before Saudi Arabia (1932), parts of the Sahara and the Horn of Africa before colonial borders were fixed, and Antarctica.
- **CShapes' capitals:** each span has one capital, so a capital that moved within a span is shown in its later place. German East Africa's capital shows as Dodoma rather than Dar es Salaam, for example.
- **After 2019:** CShapes ends on 31 December 2019, and the map stays as it was then. No internationally recognised border has changed since, but claimed annexations are not shown.
- **The source's own errors:** there is more to correct in `RULER_FIX`. For example, 1815 still has a Hong Kong, and the United States Virgin Islands appear in 1914, three years before the US bought them.
- **Places before 1900:** 66 places is thin, and most of them are in the Mediterranean and the Near East.
- **Wikipedia:** for peoples and obscure names, the search fallback can find a loosely related article. The link always names the article it found.

## Credits

- **Historical borders:** [historical-basemaps](https://github.com/aourednik/historical-basemaps) by André Ourednik and contributors, under the GNU General Public License v3.0. The files in `data/eras/`, `data/eras.json`, and `data/places.json` are derived from it and are under the same licence; its text is in `data/COPYING-historical-basemaps.txt`.
- **Borders from 1886:** CShapes 2.0, by Guy Schvitz, Luc Girardin, Seraina Rüegger, Nils B. Weidmann, Lars-Erik Cederman, and Kristian Skrede Gleditsch ("Mapping the International System, 1886–2019: The CShapes 2.0 Dataset", *Journal of Conflict Resolution* 66(1), 2022), under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 licence. `data/modern.json` is derived from it and is under the same licence, so it may not be used commercially.
- **Cities:** GeoNames (CC BY 4.0), through UCHRONIA's `data/cities.json`.
- **Land, coastlines, lakes, and rivers:** Natural Earth (public domain), through UCHRONIA's data.
- **Terrain:** Terrain Tiles on the Registry of Open Data on AWS, through UCHRONIA's relief image. Its full attribution is in [UCHRONIA's credits](../uchronia/README.md#credits).
- **Text on the card:** Wikipedia, under CC BY-SA 4.0, fetched when a state is clicked and linked to its article.
- **Type:** IM Fell English and Old Standard TT (SIL Open Font License), in `/fonts/`.
- **Icons:** drawn for the site in the style of UCHRONIA's Antique icons, engraved lines with fine hatching (`class="h"`), all 1.35 px on a 32-unit grid.
- **Code:** d3-geo, d3-array, and topojson-client, loaded from UCHRONIA's `vendor/` (licences in `uchronia/vendor/LICENSES.txt`).
