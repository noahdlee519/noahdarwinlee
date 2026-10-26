# Chronia

An atlas of the world's borders from 3000 BC to today. A year control at the foot of the page moves the map through time, on a globe or a flat map, in the Antique style of [UCHRONIA](../uchronia/). Clicking a state or a people opens a card with what the maps say about it and the opening of its Wikipedia article.

Until 1880 the borders come from dated snapshot maps. From 1886 they are dated to the day, so every month can be shown, with each state's capital and, from 1900, about 3,000 cities under the names they had at the time.

Chronia is the real-history companion to UCHRONIA, which redraws history. The two share the same look, the same base geography, and the same rendering approach. Chronia has its own page, data, and code, and it reads some of UCHRONIA's files in place (see [What it borrows from UCHRONIA](#what-it-borrows-from-uchronia)).

- **Live:** https://noahdarwinlee.com/chronia/ (not yet linked from the rest of the site)
- **First built:** 25 October 2026.

## Using it

- **The year:**
  - Drag the marker along the scale.
  - Type into the box: `1815`, `500 BC`, `-500`, `AD 800`, `1950`, `June 1991`, `25 June 1991`, `1991-06`, and `6/1991` all work.
  - The arrow buttons, or ← and →, go to the previous or next change of borders: the previous or next map before 1886, and the previous or next dated change after it, shown with its day ("30 June 1960").
  - With Shift, they move by one year before 1886, and by one month from 1886.
  - The play button, or P, plays through time: map by map until 1880, 1.4 seconds apart, then month by month from January 1886 to December 2019, the end of the data. A month takes 60 ms, about a year and a half a second, and a month in which the borders change stays for 0.4 seconds, so each change can be seen. 1886 to 2019 takes about three and a half minutes, and the busy years take longest: 1960 about three and a half seconds, a quiet year under one.
- **The map:** drag to turn the globe or move the flat map. Scroll, pinch, the + and − buttons, or the + and − keys zoom. A double-click zooms in on the spot. M switches between the globe and the flat map.
- **A state:** hover to see its name and, for a dependency, its ruler. Click it to open the card. Esc closes the card.
- **Layers:** the layers button at the top right opens a list of what the map shows: the names of states and peoples, capitals, cities and places, the names of seas and oceans, rivers and lakes, terrain relief, and lines of latitude and longitude. Each can be turned off and on, and the map redraws at once. The choices are kept in the browser, not in the address. Esc closes the list.
- **Links:** the address keeps the time and the view (`#y=1815&v=10.00,48.00,4.00&flat=1`). From 1886 the time is a month, `#y=1991-06`, or a day, `#y=1991-06-25`, so a link opens the same map.

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

### The page

The top of the page is one row, `.ch-top`, laid out as a grid of three: the site's name and the back link on the left, the title in the middle, and the map controls on the right. All three are framed the same way, with `.ch-frame`: a rule, a fainter inner rule, the parchment, and a soft shadow, at one height (`--ch-bar`). The info button is the last part of the title's frame, and the zoom, flat map, and layers buttons are parts of one frame, divided by faint rules. The about note, the layers list, and the card use the same frame. On phones the zoom buttons are hidden, the subtitle is dropped, and the title's frame fills the space between the other two.

`layout()` writes the height of the year bar to `--ch-time-h`, so that the card and the about note on a phone sit directly on top of it.

### Layers

`layers` holds one flag for each layer (`states`, `capitals`, `cities`, `seas`, `water`, `relief`, `grid`). Each place that draws a layer checks its flag first:

- capitals: `reserveCapitals`, which holds room for their marks before the names of states are placed, and `placeOne`;
- cities, and the dated places before 1900: `placeOne`;
- the names of states and peoples: `drawPolityLabels`, which checks the flag only after the capitals are reserved, so the capitals are placed the same way with the names of states on or off;
- the names of seas: `drawSeaLabels`;
- rivers and lakes: `drawLakes` and `drawRivers`;
- relief: the relief overlay in `draw`;
- latitude and longitude: the graticule in `drawSea`.

Changing a flag clears the cached sea layer and relief, then redraws. The flags are saved in `localStorage` as `chronia-layers`.

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

**From 1886:** [CShapes 2.0](https://icr.ethz.ch/data/cshapes/) (Schvitz, Girardin, Rüegger, Weidmann, Cederman, and Gleditsch, 2022), from 1 January 1886 to 31 December 2019. It records every independent state and dependent territory as a series of spans, each with its own shape, start and end dates, status (independent, colony, protectorate, mandate, or occupied), owner, and capital. The builder reads the Gleditsch and Ward edition, `cshapes_2_gw.topojson`, and takes a few corrections from the Correlates of War edition, `cshapes_2_cow.topojson`. Both ship inside the CShapes R package. It is easiest to get from the CRAN mirror on GitHub, because the ETH site can't be reached from Claude's sessions. historical-basemaps' own maps from 1900 on are not used.

In historical-basemaps, each shape has a name (`NAME`), the power it is subject to (`SUBJECTO`), the larger cultural area it is part of (`PARTOF`), and how precise its border is (`BORDERPRECISION`, 1 to 3). Shapes with no name are land that no state or people on that map covers.

### Building

```
git clone --depth 1 https://github.com/aourednik/historical-basemaps.git
git clone --depth 1 https://github.com/cran/cshapes.git
xz -dk cshapes/inst/extdata/cshapes_2_gw.topojson.xz cshapes/inst/extdata/cshapes_2_cow.topojson.xz
npm i topojson-server topojson-client topojson-simplify d3-geo polygon-clipping
node chronia/tools/build-eras.mjs node_modules historical-basemaps/geojson "" cshapes/inst/extdata/cshapes_2_gw.topojson
```

The third argument points at UCHRONIA's `provinces.json`; an empty string keeps the default, `../../uchronia/data/provinces.json` from the tools folder. An optional sixth argument points at the cities, by default UCHRONIA's `data/cities.json`. The builder reads `cshapes_2_cow.topojson` from beside the Gleditsch and Ward file, for the corrections in `CS_FROM_COW` (see [From 1886](#from-1886)). Without it, the build says so and leaves them out. The build takes about two minutes. It writes into `data/` but doesn't clear it, so when maps are dropped, delete their files from `data/eras/` first. Keep `data/eras.json`, because the builder reads it to keep the colours (see step 6). When a map's data is wrong, fix it in the builder's tables, so that a rebuild keeps the fix.

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

   States over 1.5 million km² also get extra spots, one per 30° band of longitude that holds a large part of them. Each extra spot's room is measured along its own parallel across the whole state. The page starts its search for a name's place on the screen from the pole and these spots (see step 9 of [The order of a frame](#the-order-of-a-frame)), and uses the radius and area to pass over states too small to name. It no longer uses the room and the angle.
6. **Colour:** every state gets one of the ten Antique colours, and keeps it across all maps:
   - States in a `LINEAGE` (England through the United Kingdom, Muscovy through the Russian Federation, the Chinese dynasties, and others) share one colour.
   - A dependency takes its ruler's colour.
   - Colours are chosen greedily, largest first, to keep neighbours apart round the colour wheel. Neighbours are the shapes that touch on any map, plus labels close across water.
   - The builder reads the existing `data/eras.json`, when there is one, and keeps each state's earlier colour, matched by name, unless that would put it next to a neighbour of the same or a nearby colour. Each change from the earlier colour costs 5, against 100 for each neighbour in the same colour, 6 for a neighbour one step round the colour wheel, and 1 for one two steps round. So a rebuild doesn't reshuffle the colours: adding the 1938 to 1945 data changed none. A first build, with no `eras.json`, chooses the colours afresh and warns.
   - The build prints how many touching pairs still share a colour (18 at present).
7. **Wikipedia titles:** `WIKI` and `WIKI_BY_YEAR` give an article title where the plain name would find the wrong article, such as Han → Han dynasty, or France from 843 to 1792 → Kingdom of France.

### From 1886

What the builder does to CShapes:

1. **Names by date:** `CS_NAMES` gives each CShapes name its names over time, and a span that crosses a renaming is split in two with the same shape. For example, Russia (Soviet Union) becomes the Russian Empire, then Soviet Russia from 7 November 1917, the Soviet Union from 30 December 1922, and Russia from 26 December 1991. The table holds about 70 such names, from Ceylon to Sri Lanka to Upper Volta and Burkina Faso. Other names lose their brackets.
2. **Corrections:** the Gleditsch and Ward edition keeps a state in being while it is occupied or annexed in war, so it has no Anschluss. `CS_FROM_COW` takes a country's spans for a stretch of time from CShapes' own Correlates of War edition instead, which has the same shapes. It is used for Germany and Austria from 14 March 1938 to 12 April 1945: Germany with Austria from 14 March 1938, and with the Sudetenland too from 30 September 1938, and Austria again from 13 April 1945. `CS_CARVE` lengthens a span whose end date is wrong and cuts its shape out of a neighbour's for the extra time. It is used for the Free City of Danzig, which both editions end on 31 August 1938 and add to Germany from 30 September 1938, a year early: Danzig now lasts until 31 August 1939, and Germany from 30 September 1938 to 31 August 1939 is drawn without it. Both tables take only shapes and dates that are already in CShapes.
3. **Owners:** a dependency's owner code is matched to the owner's name on the day the span starts. It becomes the ruler, so a colony takes its ruler's colour, as before 1886.
4. **Capitals:** `CAP_FIX` corrects spellings (Bukarest, Tirane, Masqat, and others). Capitals that appear in the city table take its names by date, so Harare shows as Salisbury in 1950. CShapes gives each span a single capital, and for some spans that is a later capital, so `CAP_BEFORE` lists earlier capitals by date:
   - Abuja: Lagos until 11 December 1991;
   - Dodoma: Dar es Salaam until 1996;
   - Lilongwe: Zomba until 1974;
   - Lusaka: Livingstone until 1935;
   - Gaborone: Mafeking until January 1965;
   - Nouakchott: Saint-Louis until 1957;
   - Kampala: Entebbe until independence in 1962;
   - Beijing: Peking until June 1928, Nanjing to November 1937, Chongqing to May 1946, and Nanjing again to September 1949.
5. **One topology:** all 744 spans go into one TopoJSON at the same two levels of detail as the snapshots, so the borders shared between spans are stored once. Labels are computed per span, and spans with the same shape share a label.
6. **Colours:** each country code keeps one colour key throughout, taken from its first name: its lineage, or its historical-basemaps name if it has one. A state therefore keeps the colour it had in 1880 where the names match. Neighbours are spans that touch and overlap in time.
7. **Changes:** every day a span starts, or the day after one ends, goes into `eras.json` as a change, 399 in all. 371 come from CShapes' own dates, and 28 more are renamings from `CS_NAMES`.

A row in `modern.json` is `[id, owner id, first day, last day, status, capital, label]`. Days count from 1 January 1886, and a last day of `-1` means the span runs to the end of the data. A capital is `[name, lon, lat, names by day, earlier capitals]`, where the last two are optional: the fourth is `null` when a capital has earlier capitals but no names by day, and the fifth is a list of `[last day, name, longitude, latitude]` from `CAP_BEFORE`. The page's `capitalAt(cap, day)` picks the capital in force on the day, for the map and for the card.

### Cities from 1900

From 1900, Chronia shows UCHRONIA's 3,060 cities (GeoNames), by their tiers as the map zooms in:

- `CITY_SINCE` holds the founding dates of cities that didn't exist in 1900, such as Brasília (1960), Canberra (1913), Islamabad (1961), Naypyidaw (2005), Tel Aviv (1909), and Soviet new towns like Magnitogorsk and Norilsk. They appear from that date.
- `CITY_NAMES` holds about 90 cities' names by date: St. Petersburg, Petrograd, Leningrad, and St. Petersburg again; Tsaritsyn, Stalingrad, and Volgograd; Königsberg and Kaliningrad; Saigon; Léopoldville; Salisbury; Bombay; Peking and Peiping; Constantinople; Alma-Ata; Frunze; Akmolinsk through Nur-Sultan and back to Astana; and so on. The build lists any names in the table that it can't find in the cities.

Capitals are drawn with a ringed mark and upright names at 12.4 px. Large cities (the first two tiers) have a solid dot and upright names at 11.2 px, and smaller cities a smaller dot and italic names at 10.8 px. All are in a warm brown ink (`--ch-city`, and `--ch-town` for the smallest), with a thin, half-clear parchment halo (`--ch-city-halo`), so that they read as engraved over every colour and over the sea.

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
   - The ripples scale with the island: an island gets one ripple for every 9 px of its size, up to the usual four, and islands under 9 px get none.
2. **The land:**
   - Clipped to Natural Earth land, the land is filled with paper colour, then with each state's colour, peoples' colour, and unnamed land.
   - Islands smaller than about 1.6 px across at the current zoom are left out of the land, the coastline, and the clip, so the open sea isn't scattered with specks.
   - The historical shapes' coastlines don't match Natural Earth's exactly. So before the fills, each state's coast is stroked about 40 km wide in its colour inside the land clip. That fills the slivers between the two coastlines, and the fills then cover it everywhere else. Only the parts of a state's outline that run near a coast are stroked this way, so a colour never spills over an inland edge.
3. **Relief:** UCHRONIA's relief image is laid over the land through `sat.js`, at 72% "overlay".
4. **Colour bands:** along every border and coast, a band is drawn inside each state, as in UCHRONIA's Antique style.
   - Along a border between two colours, the band follows the border and is clipped to the state's own shape.
   - Along a coast, the band follows Natural Earth's coastline, not the state's own coast, so it sits on the coast at every zoom and never doubles it. Each stretch of coast takes the band colour of the state that covers it. This is drawn into a separate layer: the states are filled in their band colours, and the result is kept only within a band along the coast. Islands too small for a band are tinted whole in their band colour instead.
   - The layer is redrawn only when the view or the set of shapes changes, at the screen's resolution, or half of it on high-density screens, and lower while the map moves. Hovering and redraws that change neither reuse it.
5. **Hover and selection:** a hovered state is tinted. A selected state is tinted red and outlined in red.
6. **Water:** lakes and rivers. Lakes appear from about 6 px across. Those under about 18 px have a faint water-coloured shore instead of an inked one, so a land of small lakes, like Canada or Finland, doesn't become a scatter of outlines. Rivers start at a scale of about 520 px for the globe's radius.
7. **Lines:** the coastline, then the borders, each clipped to land:
   - between a dependency and its ruler, or two dependencies of one ruler: thin and faint;
   - between other states: solid;
   - soft borders: dotted. A border is soft when the map is before 1648, when either side has precision 1, or when either side is a people.
   - Where a state's edge meets no other shape on land, as with Arabia's interior before 1932 or the Sahara before its colonial borders, the edge is drawn as a border too, in that state's style, with its band.
   - Lines get slightly heavier as the map zooms in, from a scale of about 700 px to 4,000 px: solid borders from 1.15 to 1.7 px, the coastline from 0.75 to 1.1 px, and the dots of soft borders from 1.6 to 2.1 px.
8. **Finishing:** the aged paper (seams, vignette, and highlight on the globe; darkened top and bottom on the flat map), and the double rim.
9. **Labels:**
   - **Capitals** are reserved first, as small marks, when the globe's radius is at least 700 px, so that names of states keep clear of them. Further out, state names come first and capitals fill in where there is room.
   - **States**, largest first. Each state's shape is projected to the screen as it is drawn, and its name goes where it has most room inside that shape: the pole of inaccessibility for a box of the name's own proportions, found by a cell search like polylabel's but measuring room as the largest box that fits rather than the largest circle. The screen's edges, the page's panels, the capital marks, and names already placed count as walls, so a name never crosses a border, the rim, the header, or the bar at the foot. Names are in capitals, up to 26 px, on one, two, or three lines, whichever gives the larger size.
   - **Long shapes:** a name is turned along the shape's long axis only when the shape is clearly long (its axes differ by more than 1.9 times) and turning it gives a name at least 40% larger. A steep turn, of more than about 43°, is used only when the name would otherwise be under 10 px, and a near-upright name reads from the bottom up.
   - **States too small** for 8.5 px first try tighter letter spacing, down to 7.5 px. If that is still too small, a state that is small on the screen (under about 70 px across, fully in view, and with the globe's radius at least 600 px) gets a 9 px name offshore, against its coast, if there is open sea there: below, above, beside, or at a corner of its main piece. Otherwise it gets no name.
   - **Peoples:** in italics, up to 15 px, inside their shapes only.
   - **Seas** (the same list and scales as UCHRONIA).
   - **Capitals and cities** from 1886, or dated places before. A name goes to the right of its mark, or else to the left, above, or below, wherever it doesn't collide.

   Labels never overlap one another or the page's panels. Collisions are tested on the rotated boxes themselves, not on their bounding boxes, so a slanted name doesn't block a whole neighbouring country.

   **Keeping it fast:** the placement of state names is kept for each map and view, so a frame redrawn for hovering or for the card costs nothing extra. While the map moves or the year is dragged, names keep the spots (in longitude and latitude) they had when the view last settled, and are only resized to fit; the full search runs once the view settles. Each search measures room against the shape's edges through a grid, so it looks only at edges nearby. A full placement takes about 5 to 18 ms in headless Chromium, once per settled view or map; `__chronia.timeLabels(n)` times it.

The `hi` level is used when the globe's radius is at least 900 px and the map is still, or at 2,600 px and over. Otherwise `lo` is used.

### Coasts and inland edges

To tell a state's coast from an inland edge, the page draws Natural Earth's land once into a hidden equirectangular grid of 2,880 by 1,440 cells (0.125°), with a band about 32 km either side of every coastline cut out of it. A point is inland when its cell, and enough neighbouring cells to cover the same distance east and west at its latitude, are still land. Each state's outer edges, the ones it shares with no other shape on the map, are then split into coastal runs (stroked for the coast fill) and inland runs (drawn as borders). An inland run is extended up to about 45 km into the coastal stretch at each end, so that it reaches the shore.

## The year

- **Time:** the page keeps one number, the time in decimal years. Before 1886 it is a whole year. From 1886 it stands for a day: the 15th for a month, unless a change or a typed date gives another day. A year typed on its own from 1886 means July of that year.
- **The date shown:** the box shows the time as exactly as it is set: a year before 1886 ("1815", "500 BC"); from 1886 a month ("July 1960", the 15th), or a full date for any other day ("30 June 1960", "25 June 1991"). The line under it names the source of the borders on the map: "Borders from the map of 1815" before 1886, also between maps; "Borders since 30 June 1960" from 1886, the date of the latest change on or before the day shown; and "The latest borders, of 2019" after the data ends.
- **The scale:** it is uneven, so that recent times get room. It is set by `KNOTS`: 3000 BC at 0, 500 BC at 0.13, AD 500 at 0.24, 1400 at 0.37, 1800 at 0.53, 1886 at 0.6, and the end of 2026 at 1, so every year from 1886 has the same room. The slider has 10,000 steps.
- **Ticks:** above the line, a mark for each snapshot map, and a fainter one for each change from 1886. The current map's mark is red, and from 1886 so is the mark of the change the borders date from.
- **Snapping:** dragging moves in steps of 10 years before AD 1000, single years from then to 1885, and months from 1886. Within 5 px of a snapshot map's tick, the marker snaps to that map's year.
- **What is shown:**
  - Before 1886, the latest map at or before the year.
  - From 1886, the spans that hold on that day.
  - After 2019, the last day of the data.
- **Loading:**
  - Snapshot files load when needed, and the maps before and after the current one load next. At most eight are kept.
  - `modern.json` loads at the start. A day's set of spans becomes a map, and the last 24 sets are kept.
  - Shapes are converted once per span, so moving between sets only recomputes the borders. Scrubbing through a century takes about 100 ms in headless Chromium.

## The card

- **The heading:** whether it is a state, a colony, protectorate, mandate, occupied territory, or other dependency, or a people or culture, and its name.
- **What the current map says:** who holds it, with a link to the ruler; what it is part of; and the maps it appears on.
  - From 1886, it also gives the capital in force on the day, under its name at the time (Lagos for Nigeria in 1980), and the dates of the current borders ("These borders from 16 June 1910 to 29 June 1960").
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
4. Check the globe and the flat map, a phone width (390×844 with touch), a tablet width, BC years (dotted borders, peoples), a year between maps ("Borders from the map of …"), the step from 1880 to 1886, a month and a day from 1886, the Shift steps, play, the layers list, the card, and the about note.

`window.__chronia` has:

- `ready()`, `year()` (the time in decimal years), `shown()` (the text in the year box), `asof()` (the line under it), `date()` (from 1886, as in the address), `mapYear()` (a snapshot's year, or `"modern"`), `maps()`, `setYear(y)` (a number, or text as typed in the box), `step(dir, unit)`, `play(on)`, `playing()`;
- `view`, `setView(lon, lat, zoom)`, `setFlat(on)`, `project(lon, lat)`, `inland(lon, lat)` (whether a point is more than about 32 km from a coast, by the grid in [Coasts and inland edges](#coasts-and-inland-edges));
- `polities()`, `selectName(name)`, `selected()`, `hitAt(x, y)`, `labels()` (each label's `name`, position, size, `kind` (`polity`, `people`, `capital`, `city`, or `town`), and `box`, with `sea: true` for a state's name placed offshore);
- `layers()` (a copy of the layer flags), `setLayer(name, on)`, and `layersOpen()`;
- `timeRender(n)`, `timeLabels(n)`, and `moving(on)` to time the moving path.

Headless Chromium has no GPU, so frame times there are several times what a real machine shows. Compare them with each other, not with a phone.

## Known limits

- **Snapshots:** before 1886, nothing moves between two maps, so 1815 to 1878 is one jump.
- **CShapes' coverage:** it records only states and recognised dependencies. Land outside them is left as paper: Arabia before Saudi Arabia (1932), parts of the Sahara and the Horn of Africa before colonial borders were fixed, and Antarctica.
- **CShapes and the Second World War:** the Gleditsch and Ward edition dates the changes that were settled by treaty or annexation, such as Munich (30 September 1938), the First Vienna Award (2 November 1938), Vilnius (1 October 1939), the Winter War (12 March 1940), the Baltic states (2 June 1940), Bessarabia (28 June 1940), Southern Dobruja (7 September 1940), and the settlement of 8 May 1945. It does not have the end of Czechoslovakia in March 1939, Memel (March 1939), Albania (April 1939), the partition of Poland (September 1939), the occupations of 1940 and 1941, or the Saar under the League (1920 to 1935). The Correlates of War edition has some of these, but only as the whole state "occupied" by one power, which is wrong for Poland, Czechoslovakia, Yugoslavia, Greece, and Albania, so they are not used.
- **Treaty dates:** CShapes dates the First World War settlements by the day each treaty was signed, such as Versailles on 28 June 1919, not the day it came into force.
- **CShapes' capitals:** each span has one capital, so a capital that moved within a span is shown in its later place. `CAP_BEFORE` corrects the cases listed under [From 1886](#from-1886); any others still show the later capital.
- **After 2019:** CShapes ends on 31 December 2019, and the map stays as it was then. No internationally recognised border has changed since, but claimed annexations are not shown.
- **Play** visits the 15th of each month, so a span shorter than a month that holds no 15th is passed over. There are nine, such as the Soviet Union's last few days in December 1991.
- **Coasts:** where a historical shape stops well short of the coast, more than about 20 km, the land between is left as paper. Small islands that a snapshot map leaves out, like several Danish islands in 1880, show as paper.
- **State names:** a name is placed only where it fits inside its shape, or offshore for a small state, so names that don't fit are dropped. The flat map zoomed out therefore shows fewer state names.
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
