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
  drawn borders: no grid, no buffer. Also point-in-country, which countries an
  arc crosses, and distances on the sphere and (Vincenty) on the WGS84 ellipsoid.
- **worker.js** — runs the search off the main thread in 40 ms slices; a newer
  request supersedes an older one. Loaded as a plain script instead when the
  browser will not start a worker, answering through the same messages.
- **app.js** — the globe (canvas; a direct orthographic projector for land and
  borders at three levels of detail chosen by how big the globe is on screen,
  d3-geo for the route arcs and the exact pointer test, a colour-coded second
  canvas to find the country under the pointer), the inputs with suggestions,
  the avoid list (type, pick from the list, or shift-click the globe), regions
  of your own to avoid (with a mouse: a polygon corner by corner, a circle
  dragged out from its centre, or a freehand outline; each becomes a ring of
  great-circle edges the engine treats like a country, with handles to adjust
  it afterwards). A region is the smaller side of its outline, whichever way
  it was drawn, and can be turned inside out to avoid everywhere but it. A
  buffer of up to 250 miles grows every drawn region: the engine adds a disc
  round each corner and a strip along each edge as further obstacles, whose
  union with the region is its buffer exactly (`bufferRings`), and the
  results, and the URL hash that holds the state, so a
  route can be shared.
- **data/countries-50m.json** — Natural Earth 1:50m countries (world-atlas),
  with unique ids and display names; **data/places.json** — cities, capitals,
  airports and countries for the search boxes. Both come from
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
- **vendor/** — d3-array, d3-geo, topojson-client, topojson-simplify, unmodified.

## Tests

    cd greatercircle && node --test test/engine.test.mjs

The engine against d3-geo (12,000 random points in and out of countries),
synthetic shapes for the arc test's edge cases (touching, running along, and
going through corners and straight runs), antipodes, and real routes checked
for staying outside the avoided countries, being no longer than they must be,
and coming out the same length in either direction. The page itself was
driven with Playwright during development (typing, clicking, shift-clicking,
dragging, zooming, pinching, the phone sheet, both themes); those scripts are
not in the repo.

## Literature

Lozano-Pérez & Wesley, "An algorithm for planning collision-free paths among
polyhedral obstacles" (1979) — the visibility graph. J. S. B. Mitchell,
"Geometric shortest paths and network optimization", Handbook of Computational
Geometry (2000) — the survey, including the reduced (tangent) visibility graph.
On the sphere the straight lines become great-circle arcs and every test is a
sign of a dot or cross product; the gnomonic projection is the one map on which
the plane version would have been right, and it only shows a hemisphere.
