# greatcircleme

The shortest way between two places on the Earth, and the shortest way around
the countries you would rather not cross. Served at `/greatcircleme/`.

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
  request supersedes an older one.
- **app.js** — the globe (canvas; a direct orthographic projector for land and
  borders, d3-geo for the route arcs and the exact pointer test), the inputs with
  suggestions, the avoid list, the results, and the URL hash that holds the state.
- **data/countries-50m.json** — Natural Earth 1:50m countries (world-atlas),
  with unique ids and display names; **data/places.json** — cities, capitals,
  airports and countries for the search boxes. Both come from
  `tools/build-data.mjs` (see its header for the inputs).
- **vendor/** — d3-array, d3-geo, topojson-client, topojson-simplify, unmodified.

## Tests

    cd greatcircleme && node --test test/engine.test.mjs

The engine against d3-geo (12,000 random points in and out of countries), and
real routes checked for staying outside the avoided countries, being no longer
than they must be, and coming out the same length in either direction.

## Literature

Lozano-Pérez & Wesley, "An algorithm for planning collision-free paths among
polyhedral obstacles" (1979) — the visibility graph. J. S. B. Mitchell,
"Geometric shortest paths and network optimization", Handbook of Computational
Geometry (2000) — the survey, including the reduced (tangent) visibility graph.
On the sphere the straight lines become great-circle arcs and every test is a
sign of a dot or cross product; the gnomonic projection is the one map on which
the plane version would have been right, and it only shows a hemisphere.
