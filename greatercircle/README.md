# greatercircle

The shortest way between two places on the Earth, and the shortest way around
the countries you would rather not cross. Served at `/greatercircle/`.

## How it works

- **engine.js** — all the geometry, in 3D unit vectors on the sphere. Builds
  the avoided countries into rings (wound with the inside on the left), a tree
  of bounding caps over their edges, and the set of convex corners; then runs
  A* over the tangent visibility graph: from each corner only arcs that leave
  it tangentially are tested, an arc is free when it crosses no edge and enters
  no corner, and the great-circle distance to the goal is the heuristic. The
  search widens in stages through an ellipse of corners that could lie on a
  route of a given length, so routes a few percent longer than the direct arc
  are settled looking at a fraction of the corners. The result is exact for the
  drawn borders: no grid. Also point-in-country, which countries an arc crosses,
  distances on the sphere and (Vincenty) on the WGS84 ellipsoid, and the buffer
  round an avoided country (`bufferOutline`): each ring is first thinned by
  Douglas–Peucker on the sphere to within 2% of the buffer, then traced at the
  buffer's distance (strips along the edges, arcs round the convex corners), and
  the trace and the ring are merged by Clipper in a gnomonic projection centred
  on the country, where great-circle edges are straight lines, so the union is
  exact for those edges. Islands far apart get projections of their own. The
  outline keeps every point within the buffer and lets in nothing more than
  about 3% beyond it. Flight times (`flightHours`) are the distance at 850
  km/h plus half an hour, and with winds on, each stretch of the route is
  flown at 850 km/h plus the wind along it (`windU`): a simple climatology of
  the westerlies at cruising height, two jets in each hemisphere and an
  easterly in the tropics, strongest in each hemisphere's winter. It is an
  average for the month, not a forecast, so it gets the difference between
  the two directions roughly right (London to New York about an hour longer
  than the way back in January) and not any one day's flight.
- **The flight plan** (the third tab; `tab=plan` in the URL, and the old
  `wp=1` still opens it): the route flies from one radio beacon to the next,
  as a flight plan does. Once the shortest way is found, A* runs again over A, B, and the beacons within 300 km of it (then
  800, then 2,000 if no chain is found): a leg is at most 300 km, or longer only
  if no beacon lies within 150 km of it away from its ends (open sea, desert),
  and every leg must be free of what is avoided, buffer included
  (`startBeaconSearch`, `stepBeaconSearch`). The globe marks the beacons
  (triangles for VORs, circles for NDBs) and labels them close in; hovering
  one names it. Hovering anywhere on the globe shows its coordinates at the
  foot of the tooltip.
- **worker.js** — runs the search off the main thread in 40 ms slices (12 ms
  when it runs on the page); a newer request supersedes an older one. It
  answers a route with its result at once, then works out the flight plan and
  sends it as a second message (`plan`), so all three tabs have a distance
  without waiting; the last eight routes are kept, so going back to one, or
  undoing an avoid, answers both at once. Loaded as a plain script instead when
  the browser will not start a worker, answering through the same messages.
  With each route it sends which avoided countries it bends round and which
  countries those bends lie over, for the line under the distance ("Bends 12
  times round the 50 mi buffer of Russia, over Azerbaijan and China").
- **panel.js** — the result card, its tabs, the flight plan's timeline, the
  countries crossed, the warnings, the options card, and Share, given what it
  needs from app.js when the page starts (`GreatCirclePanel(app)`).
- **app.js** — the globe (canvas; a direct orthographic projector for land and
  borders at three levels of detail chosen by how big the globe is on screen,
  d3-geo for the route arcs and the exact pointer test, a colour-coded second
  canvas to find the country under the pointer), and the panel: a route card
  (airport codes when a place has one, the inputs with suggestions), chips for
  the options (what is avoided, the buffer, the units) that open a card of
  them, and the result card, whose tabs are Direct, Avoiding (when the way
  round is longer), and Flight plan, each with its distance; the chosen one is
  drawn solid on the globe and the others dashed. Below it, the flight plan's
  timeline of beacons grouped by country (hover or tap a leg to light it on
  the globe), the countries crossed (tap one to avoid it), and Share. Warnings
  (A inside what is avoided, no way round, no chain of beacons) are small cards
  with the action that fixes them. Flight times are the distance at 850 km/h
  plus half an hour. With A and B set, clicking a country opens a small card
  to avoid it or move B there; shift-click still avoids at once. The avoid
  list (type, pick from the list, or click the globe), regions
  of your own to avoid (with a mouse: a polygon corner by corner, a circle
  dragged out from its centre, or a freehand outline; each becomes a ring of
  great-circle edges the engine treats like a country, with handles to adjust
  it afterwards). A region is the smaller side of its outline, whichever way
  it was drawn, and can be turned inside out to avoid everywhere but it. A
  buffer of 0, 1, 5, 10, 20, 50 (the default), or 100 miles keeps the route
  away from everything avoided. Round a country it is the outline above,
  worked out in the worker and sent back to be drawn; round a drawn region the
  engine adds a disc round each corner and a strip along each edge as further
  obstacles, whose union with the region is its buffer exactly
  (`bufferRings`). If A or B is inside a country's buffer, the summary offers
  the largest buffer that would leave it out. Then the results, and the URL
  hash that holds the state (`buf=` when the buffer is not 50 miles), so a
  route can be shared.

  The options card also has two presets of closed airspace, as of 22 November
  2026 (Russia, Ukraine, and Belarus; Iran, Iraq, Syria, Lebanon, Jordan, and
  Yemen), which avoid or release those countries together; they are whole
  countries, where the real closures are often a part of one, so the hint
  points to Safe Airspace and the FAA for the detail. Winds aloft (`wind=1`)
  switch the times to the month's typical winds and add the time the other
  way. A legend in the corner says which line is which, and "Save as an
  image" draws a 1200 by 630 card of the route (the codes, names, distance,
  time, and the flat globe fitted to the route) and shares it where the
  browser can, or downloads it.

  On a phone the panel is a sheet at three heights: a peek with the codes and
  the distance, half, and full. Drag it by the handle or the top of its
  content and it follows the finger, stretches past either end, and settles
  on the nearest height (or the next one, after a flick); tapping the handle
  goes up a height, then back down. It rides above the on-screen keyboard.
  The globe is kept in the space above the sheet.

  Motion: a new route draws itself in from A to B, switching tab morphs the
  line from one route to the other, and the distance counts up to its new
  value; none of it happens when the system asks for reduced motion. From
  the keyboard, the globe has a crosshair at its centre when it has focus:
  the arrows turn it, + and - zoom, and Enter places A, then B, or a
  polygon's next corner (on the first corner, it closes the polygon), as a
  click there would.
- **data/countries-50m.json** — Natural Earth 1:50m countries (world-atlas),
  with unique ids and display names; **data/places.json** — cities, capitals,
  airports, and countries for the search boxes. Both come from
  `tools/build-data.mjs` (see its header for the inputs).
  **data/cities.json** — the five hundred and fifty cities drawn on the
  globe: the GaWC world cities in three tiers, every sovereign capital (in
  the second tier where the country has no greater city), and the rest by
  population; from `tools/build-cities.mjs`. Very close in, the airports
  from the place list are drawn too, code and name. **data/admin1.json** — the borders between
  first-level subdivisions (states, provinces, regions), Natural Earth 1:10m
  reduced to the lines inside countries and simplified; fetched when the
  globe is close enough to draw them dotted; from `tools/build-admin1.mjs`,
  which leaves out units too fine to read at that zoom (Slovenia's
  municipalities, Uganda's districts, Switzerland's cantons, the islands'
  parishes) and draws Natural Earth's regional grouping instead where there
  is one (Italy's regioni, England's regions, Slovenia's statistical
  regions). **data/lakes.json** — Natural Earth 1:50m lakes, drawn in the
  sea's colour; from `tools/build-lakes.mjs`.
  **data/navaids.json** — OurAirports' radio beacons (VOR, VOR-DME, VORTAC,
  NDB, and NDB-DME; public domain), ident, type, place, and name, one per
  site, and no two closer than 12 km (a VOR and an NDB at one airport would
  otherwise be two steps a kilometre apart); fetched by the worker after the
  first route; from
  `tools/build-navaids.mjs` and `navaids.csv` from
  github.com/davidmegginson/ourairports-data.
- **sat.js** — the satellite view, switched on with the satellite button and
  remembered in the browser. A WebGL canvas under the map, whose fragment
  shader turns each pixel back into a latitude and longitude (the
  orthographic projection inverted) and samples NASA's Blue Marble Next
  Generation (**data/earth-2048.webp**, and **data/earth-4096.webp** on wider
  screens; the same images as UCHRONIA's), with mipmaps and gradients taken on
  whichever side of the date line is smooth, so the seam does not show. Close
  in, once the view settles, the 256-pixel Web Mercator tiles of NASA's Global
  Imagery Browse Services (Blue Marble shaded relief and bathymetry) for what
  is on screen go into an 8-by-8 texture the shader prefers where a tile has
  arrived; if the service cannot be reached, the view stays on the base
  image. With it on, the land and sea are left unpainted, and the borders,
  avoided countries, cities, and routes switch to colours that read on the
  imagery. Without WebGL the button is disabled.
- **vendor/** — d3-array, d3-geo, topojson-client, topojson-simplify, unmodified;
  Clipper 6.4.2 (Angus Johnson's JavaScript port, `clipper-lib` on npm),
  minified with terser.

## Tests

    cd greatercircle && node --test test/engine.test.mjs
    NODE_PATH=$(npm root -g) node --test test/smoke.test.mjs

The engine against d3-geo (12,000 random points in and out of countries), country
buffers against the exact distance to the border (inside the buffer within it,
outside it beyond 3.5% more), a chain of radio beacons round Russia (free legs,
long ones only where no beacon is near), no two beacons in the data closer
than 12 km, the worker's order of messages (the route, then the flight plan,
and both at once from its cache),
synthetic shapes for the arc test's edge cases (touching, running along, and
going through corners and straight runs), antipodes, and real routes checked
for staying outside the avoided countries, being no longer than they must be,
and coming out the same length in either direction, and the winds (London to
New York faster than calm air, the way back slower, by a plausible amount,
and less so in summer).

The smoke tests drive the page in Playwright (skipped if it is not
installed), serving the site themselves: the empty page, an example route
and its flight plan, the options card and the buffer, the phone sheet at its
heights, the page without a worker, Enter at the crosshair, a closure preset
and the winds, and saving the image card, each with no errors on the page.

## Literature

Lozano-Pérez & Wesley, "An algorithm for planning collision-free paths among
polyhedral obstacles" (1979) — the visibility graph. J. S. B. Mitchell,
"Geometric shortest paths and network optimization", Handbook of Computational
Geometry (2000) — the survey, including the reduced (tangent) visibility graph.
On the sphere the straight lines become great-circle arcs and every test is a
sign of a dot or cross product; the gnomonic projection is the one map on which
the plane version would have been right, and it only shows a hemisphere.
