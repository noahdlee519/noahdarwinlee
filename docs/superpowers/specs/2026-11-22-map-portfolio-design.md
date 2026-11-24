# Portfolio as an imaginary map

> **Moved, 23 November 2026:** the page now lives at `projects/` (`/projects/`), replacing the old projects page, which moved to `projects/classic/`. Read `portfolio-map/` below as `projects/`; `/portfolio-map/` redirects there.

Design, 22 November 2026. Approved approach: A (pre-made vector worlds with a relief picture underneath). Local preview only; nothing is pushed until Noah says "push".

## Intent

Noah's /projects and /portfolio pages become one page: a map of an imaginary world in which every project is a country, and the interface of a web mapping app is the way in. The point is the feeling Noah gets from a good imaginary map and from a design system turning up where it doesn't belong: a visitor should see something they haven't seen before and be intrigued and impressed. The page should also show plainly that Noah loves maps.

## Goals

- One page that replaces both /projects and /portfolio, with every project from both pages as a country.
- Twenty pre-made imaginary worlds, each named after a science fiction author; each load shows the next one, so reloads feel random.
- Worlds that are convincing as maps on their own: believable coasts, islands, rivers, lakes, mountains (relief shading), and borders.
- The interaction pattern of a web mapping app:
  - a search box (top left) that finds projects
  - a left side panel with the project's media, details, and actions
  - a rail of buttons at the far left
  - pan and zoom with more detail at higher zoom
  - a footer strip along the bottom
- Visitors read Noah's priorities from the map: flagship projects are large mainland countries; small ones are islands, city-states, and small territories.

## Non-goals

- Generating worlds in the browser. The twenty are made once, ahead of time.
- Real geography, real map tiles, or any outside map service.
- Accounts or server-side favourites.
- Pushing or deploying anything in this round.

## Anti-goals

- Anything that reads as Google's: Google's name, logo, icons, pins, the Google Sans font, or a copy so close that the page passes for Google's. The pattern is borrowed; the identity is Noah's (his black, blue, and orange square-and-circle mark, his site's fonts).
- Worlds that look like random blobs. A world that fails review is regenerated or dropped, not shipped.
- A slow or janky map on a phone.
- Losing content the two current pages have (blurbs, screenshot slideshows, links, resume, contact).

## The page

```
┌──────┬──────────────────────┬────────────────────────────────┐
│  ≡   │ Search projects      │                                │
│ (me) ├──────────────────────┤                                │
│ About│  [screenshots/video] │     CHRONIA       LoreTour     │
│  ♥   │  CHRONIA             │          Dealdesk              │
│ Saved│  chroniaatlas.com    │   (Leggio)      ~ sea ~        │
│  ▤   │  [Visit] [♥] [Share] │                    UCHRONIA    │
│Resume│  An atlas of the     │                                │
│  ✉   │  world's borders…    │                                │
│Contact                      │                                │
├──────┴──────────────────────┴────────────────────────────────┤
│ Map: Le Guin | Terms | Privacy | Site feedback     ├ 500 km ┤ │
└──────────────────────────────────────────────────────────────┘
```

- **Rail** (far left), with these buttons:
  - **About** (Noah's portrait and introduction; the panel's starting view, so a visitor meets Noah before clicking anything)
  - **Saved** (projects the visitor has hearted)
  - **Resume** (opens `portfolio/Lee_Noah_Resume.pdf`)
  - **Contact** (email and links, from the current portfolio's contact section)
- **Search box:** finds projects by name and opens the match; the map flies to the country.
- **Project panel:**
  - screenshots, and short silent video loops for the flagship projects (recorded from the live sites)
  - name, site address, and blurb
  - **Visit** (opens the site), **♥** (favourite), **Share** (copies a link that opens this world with this project open)
  - The screenshot slideshows and text from the current portfolio detail pages (`portfolio/<project>/`) fold into their panels.
- **Map:**
  - Clicking a country or its name opens its panel and highlights the country.
  - Country labels in map lettering; seas, ranges, and a few towns named for texture.
  - Panning and pinch or wheel zoom; labels scale and thin out by zoom.
  - Zoom is limited (Noah's call): from the whole world fitting the screen to a few steps in (about 4× at most), with no panning off the world's edge.
- **Footer strip** (bottom, full width): `Map: <world name> | Terms | Privacy | Site feedback` and a scale bar.
  - Clicking the world name moves to the next world without a reload.
  - Terms and Privacy link to `/terms/` and `/privacy/`; Site feedback opens the site's existing feedback form (`feedback.js`).
  - The scale bar updates with zoom, in invented distances.
- **Phones** (modelled on the reference's phone app, from Noah's screenshot of 22 November 2026):
  - A full-screen map with a rounded search pill floating at the top ("Search projects"), with Noah's mark or portrait at its right end, opening About.
  - No chips under the search pill (Noah's call).
  - A round floating button at the right that switches to the next world (in place of the reference's layers button).
  - A bottom sheet with a drag handle: collapsed it shows the world's name or the selected project's name; dragged up it shows the project panel.
  - A bottom tab bar in place of the rail: Explore (the map), Saved, Resume, and About (with contact).
  - The footer strip's links and scale bar move into the sheet's collapsed view and the map's corner.

UI text uses the serial comma and `|` separators, never `·` or round bullets (repo CLAUDE.md).

## The projects (countries)

Flagship (large mainland countries): CHRONIA, LoreTour, UCHRONIA, Fuzhounese Dictionary, Leggio, GREATERCIRCLE, Dealdesk.

Flagship sizes are ranked in that order (Noah's call): CHRONIA is the largest country, Dealdesk the smallest flagship.

Smaller (islands, city-states, small territories): citylayoutguessr, Flash Card Tool, 100 Architects of the Modern Era, Things to Do in New York City, Things to Do in Chicago, and, in place of a single "Miscellaneous" country, each entry on the current Miscellaneous page as its own: Expositions Magazine, Night of Ideas, Substack, UCGEO, Drill the canon, and Dragonfly Agency. That makes 18 countries; Braidable and the portfolio site, added 23 November, make 20 (both small).

Dealdesk has provinces for its tools (Rollmap, Screener, Closebook, and LBOmatic), drawn with internal borders; search finds them, and clicking one opens Dealdesk's panel at that tool (Noah's call).

The list, each project's tier and rank, blurb, links, and media live in one data file the page reads. Blurbs and links come from the current `portfolio/index.html`, `projects/index.html`, `miscellaneous/index.html`, and `portfolio/<project>/` pages; screenshots from `art/web/materials/`.

## The worlds

Twenty, named by surname: Le Guin, Asimov, Butler, Herbert, Bradbury, Clarke, Zelazny, Heinlein, Gibson, Banks, Lem, Atwood, Jemisin, Delany, Vonnegut, Verne, Wells, Shelley, Tiptree, and Chiang.

- **All land is project land** (Noah's call): no filler countries. Every landmass is divided among the projects, and the worlds are sized so 18 countries make a convincing world (seas, archipelagos, and a few large landmasses), not a crowd of slivers.
- **Built to grow** (Noah's call): adding a project means adding an entry to the data file and rerunning the generator. Each world keeps a fixed seed and its parameters (land share, number of landmasses, country sizes from tier and rank) are derived from the project list, so the twenty worlds regenerate with the new country in them and keep their character.
- **Generator:** a Node script in the repo, run by hand. It writes one compact vector file per world (coasts, lakes, rivers, country borders, label positions) and one soft relief image (mountains and forest shading).
- **Countries:** grouped from small cells, sized and placed by tier. In each world the projects land in different places and shapes.
- **Labels:** placed by the generator, inside their countries, without overlaps.
- **Review:** all twenty are rendered and shown to Noah as contact sheets before the page uses them; any he dislikes is regenerated.
- **Rotation:** a load shows the next world after the one this visitor last saw (stored in the browser); a first visit starts at a random one. `?world=<name>` opens a given world (used by Share).

## Colours and terrain (Noah's call)

The map uses a web mapping app's colours and its land-cover scheme, not the site's themes. The land is coloured by class, sampled from Noah's screenshots of the reference:

| Class | Colour |
|---|---|
| Dense forest | `#a2debe` |
| Woodland and shrub | `#b3e3cc` |
| Grassland and farmland | `#c4ead7` |
| Dry grass and steppe | `#f3efe4` |
| Desert and bare ground | `#faf7f3` |
| Rock and high mountain | `#cbcfca` |
| Snow and ice | `#ffffff` |
| Water (seas, lakes, rivers) | `#7fd5e9` (rivers in the same blue; measured, see below) |
| Country borders | `#26262a` solid; province borders `#606266` dashed |
| Labels | `#26262a`, with a pale halo |

- The classes come from the generator's elevation, moisture, and temperature (latitude), so forests, deserts, steppe, and snow fall where a real world would put them. The land is patchy at class edges, as on the reference, rather than smooth gradients.
- Noah's orange and blue appear only as accents: the heart and favourite buttons, the selected country's highlight, and small interface accents. The map itself stays in the land-cover palette.
- The relief image becomes the land-cover image (with at most a faint hillshade); the vectors draw water, borders, rivers, and labels over it.
- No Night version for now; the page keeps one light map whatever the site's theme.

## Finer detail (Noah's request, 22 November)

Zoomed in, the map reads as a real regional map, after the reference's conventions (never its identity):

- **Places:** each country has a capital, cities, towns, and villages, settled on coasts, rivers and river mouths, and plains, and seldom in mountains, deserts, or tundra. A town is a white dot in a dark ring, a city a larger one, a capital a ring with a dark centre. Capitals show from zoom 1 or 2, cities from 2, towns from 3, and villages from 4.
- **Built-up ground:** a light grey land-cover class (`#eceef0`) round each place, sized by rank and kept off steep ground.
- **Roads:** highways (with yellow route shields, and green E-numbers where they cross a border), main roads, local roads, and street grids in the built-up areas, routed over low ground and across rivers. Roads are pale lilac-grey (`#9aa8c8` to `#d3d7e4`). Ferries are dashed lines across narrow sea.
- **Water:** rivers take the water's own blue, thin and with no casing. Streams appear from zoom 3, and a few reservoirs sit on hill rivers.
- **Parks and subdivisions:** a few national parks in wild country, each inside one country, with a green tint and a fine edge. The larger flagships show faint dashed subdivisions.
- **Names:** peaks (a triangle and a height), capes, islands and island groups, forests, deserts, plateaus, deltas, and parks. Parks take project words where any are left, and the rest have invented names.
- **Relief:** the finer tiles carry a faint hillshade (land facing the north-west lit, the far side in shadow).
- **Loading:** all of this lives in `worlds/detail/<slug>.json`, which the page fetches the first time the map is zoomed past 1.3x, so the first load stays the world's two files. Every new layer has a Night colour.

## Character and realism (Noah's requests, 23 November)

- **Countries have character.** Each country has its own place-name language (twelve sound systems, with neighbours speaking different ones), route numbers and road signs, town plan (grid, radial, organic, or linear), and park naming custom. The Fuzhounese Dictionary's names are in Foochow Romanized ("Hók-ciŭ"), the Hundred Architects' towns are named after modern architects, and the capitals of the Chicago and New York countries are Chicago and New York.
- **Roads are engineered.** There are motorways between the largest cities, trunk roads between all the cities, secondary roads between towns, and local roads to villages. They are routed over the terrain, merge at junctions, and run as straights with rounded curves.
- **Towns are laid out**, with arterials, ring roads, a core, and suburbs. The grey built-up ground follows their streets.
- **Water is natural.** The land cover makes no water of its own. Small lakes (kettles, tarns, finger lakes, oxbows, marsh ponds, crater lakes, and reservoirs) are vectors, and rivers meander on the lowland.
- **Parks have no fill**, only a name and, close in, a faint edge. They lie in ice and high mountains, forests, wetlands, coasts, and deserts, under names of several kinds.
- **Polar ice** belongs to no country, at the top or bottom of five worlds, seamless across the wrap.
- **About:** every world has an island called About with a "you are here" dot. The location button flies there, then opens the about page.
- **Zoom** goes to 6x (later 16x; see below), with tiles at 12 pixels a unit and the finest streets and lakes loaded in chunks for the view.
- **Colours and lettering** follow the reference, measured on rendered pixels.
  - The sea is `#7fd5e9` (see below), and the land-cover palette is unshaded at every zoom.
  - Labels are untracked. Country names are bold `#121315`; water names are upright teal `#34768e`, small, and curve along channels and bays.

## Variety (Noah's requests, 23 November, later)

- **Towns and cities by type.** Villages and most towns are a main street or a crossroads with a few lanes; cities are grids, planned towns with diagonals, medieval cores, radial towns, coastal strips, ports round a harbour, river cities with bridges, hill towns on the contours, or sprawl with cul-de-sacs, by site, size, and country. The built-up ground is a soft grey patch with an organic outline that follows the coast, the river, and the land; streets are thin white lines in it. Only the three largest cities in a world have a ring road.
- **Deserts as the reference draws them.** Broad smooth fields of pale sand and dry grass, no shards; warm grey-beige rocky plateaus and mountains (`#ebe6db`), near-white salt flats in the dry basins (`#fdfdfb`), dune ripples a shade off the sand (`#f4eee0`) only in the finer tiles, small green oases with a village, green river banks, and wadis as faint lines.
- **Polar land.** In five worlds a thick ice sheet runs off the top or bottom edge, seamless across the wrap, with a fringe of rock and pale tundra, outlet glaciers, winding fjords, nunataks, ice shelves, and islands. It joins a project's land by an isthmus (that country takes the fringe near the join), lies across a strait, or stands apart. Beyond the polar edge the page draws ice, not sea.
- **Fewer, finer lakes.** Finger lakes in mountain valleys, chains along rivers, a large lake or two with bays and islands, one or two lake districts in glaciated lowland, a few tarns and marsh ponds, oxbows, crater lakes, and reservoirs; tiny lakes nowhere else.
- **Borders of several kinds.** Some are surveyed straight (between two points, along a parallel, or along a meridian), borders beside a river run down its middle, and the rest keep to crests and old irregular lines; province lines and subdivisions likewise.
- **The About island** is a volcano with a crater lake, an atoll round a lagoon, a crescent, a fjord-cut isle, an island in a large lake, or an island with a lighthouse town, a causeway, or a ferry, by world; its label, dot, and the fly-there-then-About behaviour are as before.

## Water, coasts, and cities (Noah's requests, 23 November, evening)

- **The seventh world is now Zelazny** (its old name could read as obscene). Its seed changed with its name; it keeps its character (north and south masses, polar ice in the north joined by an isthmus, a fjord-cut About island), so five worlds still have polar ice. Links with the old name in them open Zelazny (an alias in the page).
- **No "Saint" architects.** The Hundred Architects' towns are plain surnames, or now and then "Port Aalto", "Kahn Heights", "Rossi Park", and "New Gehry"; never "Saint".
- **Real names for two countries.** The New York country's towns are New York State's cities and towns (Albany, Buffalo, Ithaca, Saratoga Springs, and so on), the Chicago country's are Illinois's (Springfield, Peoria, Galena, Normal, and so on), the largest places taking the largest towns' names; their rivers, lakes, and parks take the states' own names (Seneca, Catskill, Kaskaskia, Sangamon), and their cities' parks are Central Park, Prospect Park, Grant Park, Lincoln Park, and so on. No other country has real names.
- **The ice sheets have no names.**
- **More names for the water**, shown by zoom as the reference shows them: oceans from zoom 1; seas and gulfs from 2; bays, straits, channels, sounds, and fjords from 3; lagoons, harbours (named for their port city), and inlets from 4; coves from 5; and more lakes. Still spaced and never overlapping; themed from each project's water words, then the country's own language.
- **The coast's forms.** Fjords are cut deep into cold mountainous coasts, up the valleys, narrowing to their heads, with steep sides and now and then a side arm. Small islets are drawn as vectors over the sea from zoom 3: cays in clusters on the banks of warm seas (sandy, the larger green at heart), skerries off cold broken coasts, sea stacks off steep headlands, sandbars off river mouths, and barrier islands off low straight coasts with a lagoon behind.
- **Cities by size and shape.** A rank-size hierarchy: three metropolises (some 30 to 40 km across) with ring roads, then capitals, cities, towns, and villages, their built-up areas roughly 400 : 50 : 16 : 2.5 : 0.3. Each is compact, long (along a coast, river, or valley), star-shaped along its roads, a pair of twin towns across a river, or wrapped round a bay. The middle of each city is a darker grey (`#e3e5e9`), its streets closer together; the blocks grow larger outward, and minor streets show only at the closest zoom. Cities have small parks (`#a2debe`), the largest named at the closest zoom.
- **Roads never run into the water.** Roads and streets are checked against the water as drawn; a short crossing of a river, narrows, or strait is a bridge (drawn with a pale deck), narrow straits between two landmasses are bridged rather than ferried, a road that grazes the shore is moved just inland, and any other is stopped at the water's edge.
- **The water's blue, measured.** Noah's screenshots are tagged with a Display P3 profile, so their raw values are P3, not sRGB: the Brittany reference's sea, `#93d3e6` in P3, is `#7fd5e9` in sRGB. The old `#86cfe2` (sRGB, as the page draws it) shows in such a screenshot as `#96cde0`, greyer than the reference; `#7fd5e9` shows as `#93d3e6`, the reference's own. Sea, lakes, rivers, the pictures' water, and the contact sheets all use it.

## Closer in, and truer to the reference (23 November, night)

- **Zoom goes to 16x** (builder's call, to be confirmed by Noah). At 6x a city is a grey patch some 50 to 200 pixels across, as a web map's regional view shows it, and its plan cannot be read; from 6x to 16x the cities open up. Main streets show from zoom 5, the streets between them from 9, and roads, streets, and bridges widen as the map closes in. The finest tiles stay at 12 pixels a unit; the built-up ground and the cities' cores are also written as outlines (in the chunks) and drawn over the picture, so a city's edge is crisp at every zoom. A river widens with the zoom only to a point, then keeps its width on screen.
- **The water's blue changes with the zoom, as the reference's does.** Read through their colour profiles into sRGB, Noah's screenshots give `#6dd1e5` and `#70d3e5` for the reference's world views, `#7fd5e9` for its regional view (Brittany), `#83d6eb` and `#88d7eb` closer (Alaska, Dhaka), and `#90d9ed` at a city zoom: one blue, paler the closer in. The page draws `#70d3e5` at zoom 1, `#7fd5e9` at 3, `#88d7eb` at 6, and `#90d9ed` at 16, stepping between them; sea, lakes, rivers, and the water names' halo follow. The pictures' own water (the PNG palette's `#7fd5e9`) lies wholly under the vector sea and lakes, and the PNGs carry no colour chunks (no gAMA, iCCP, sRGB, or cHRM), so the browser reads them as sRGB.
- **Cities.** Sizes a little larger (a city 3.6 to 6 units in radius, a town 1.3 to 2.2). Ports and coastal strips are kept to about a third of a world's larger places, so a world of islands also has grid towns, old towns, and planned capitals on its shores; Chicago and New York are always grids. A metropolis's ring road is one rounded orbital, open where the city meets the sea. The larger cities have named quarters from zoom 8 (New York's are Manhattan, Brooklyn, Queens, and so on; Chicago's the Loop, Hyde Park, Lincoln Park, and so on); their largest park is named from zoom 6, the others from 9.
- **Roads.** Two roads laid side by side between the same two junctions are one road.
- **Polar land.** The ice sheet's coast has great forms: a peninsula or two reaching out where the ocean is open, largely bare rock and tundra, and a wide embayment or two, most often facing the projects' land, so the water between is a sea and not a moat. Long stretches of the coast are ice to the water's edge; between them the bare fringe is wider than before. Ice shelves fill the lesser bays only.
- **Beaches** follow the shore as an even band (they were a row of the grid's squares, which showed close in).

## The page shell (builder's calls)

- The site's usual header is hidden on this page; the rail's ≡ button opens the site's existing menu (`menu.js`), which carries the theme switch.
- Within the 4× zoom, higher zoom shows towns, minor rivers, and Dealdesk's province names; the relief image is baked at twice the screen's resolution so it stays soft rather than blurry.

## Constraints

- A static page in the noahdarwinlee.com repo (plain HTML, CSS, and JS, as the rest of the site is), served locally for review.
- A world (vector file plus relief image) should stay around 300 KB or less, so a phone loads the page quickly.
- Favourites are kept in `localStorage`, wrapped in try/catch.
- No Google assets of any kind; icons drawn for this page or taken from an openly licensed set.

## Approaches considered

- **A. Pre-made vector worlds with a relief image (chosen).** Crisp borders and labels at every zoom, light, and each world can be checked before use.
- **B. Pre-rendered map tiles at several zooms.** The richest painted look, but tens of megabytes for twenty worlds and much more to build and host.
- **C. Worlds generated in the browser on each visit.** Endless worlds and a tiny download, but seconds of work on a phone, no named worlds, and no chance to check them.

## Left to the builder

- The generator's methods (noise, cells, river tracing, label placement), the map's palette within Noah's look, and the icon set.
- The file and folder names, and where the page lives for local review. Old URLs (/projects, /portfolio, `portfolio/<project>/`) keep their current pages until Noah decides how they redirect.
- Which flagship projects get video loops, and their length (short, silent, and small).
