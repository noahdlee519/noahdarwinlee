# UCHRONIA

An alternate-history map maker: the world as it is, cut into its states,
provinces and regions, for you to redraw. Give any region to any country,
found countries and name them, recolour them, and put cities where they might
have been. Served at `/uchronia/`. Built on the bones of `/greatercircle/`.

## How it works

- **The model.** The land is 4,596 provinces (Natural Earth's first-level
  subdivisions), and every province has an owner: a country, or nobody. A
  country is only the set of provinces it owns, so borders are never stored or
  drawn by hand. An edge between two provinces is drawn as a border when the
  provinces on its two sides belong to different countries, and as a dotted
  province line (once close enough) when they belong to the same one. Painting
  moves provinces from one owner to another; "Whole countries" moves all of a
  country's provinces at once; "Unclaimed" takes them from everyone. A border
  can only run along province edges: there is no splitting one province in two.
- **app.js** — the globe (canvas; the orthographic projector, the three levels
  of detail and the colour-coded picking canvas from greatercircle). Each
  country is filled as one merged outline (`topojson.merge` of its provinces),
  cached per level of detail until its provinces change, and countries of the
  same colour share a single path, so a frame draws about ten fills however
  many countries there are. Colours come from a palette of ten in CSS
  variables (pastels in the light theme, deeper ones in the dark), given out
  greedily so that neighbours differ; a new country takes the colour least
  used around it, and any colour can be chosen by hand.
  Labels: a country's name goes on its largest piece, at that piece's pole of
  inaccessibility (the inside point farthest from its edges, found by the
  quadtree search of Mapbox's polylabel on an azimuthal-equidistant view of
  the piece) and sized by the circle that fits there and by the piece's
  extent. They are drawn largest country first and skipped where they would
  collide, and are worked out again in 14 ms slices after each edit.
  Cities: the 550 of greatercircle's list in four sizes, capitals marked with
  a square, each shown from the zoom its size allows. Every edit is a step to
  undo or redo; a paint stroke is one step, and typing a name is one step
  however many keys it takes.
- **Saving.** The map is kept as its difference from the world as it is: the
  countries renamed, recoloured or founded, the owners of the provinces that
  changed hands, and the cities deleted, changed or added. That difference
  goes to `localStorage` after every edit, into a link ("Copy link":
  deflate-raw through `CompressionStream`, then base64url, in `#m=`), or into
  a file ("Save file", JSON). Opening a link keeps your own map one click
  away ("Back to mine"). Opening a file and "Start over" can both be undone.
  Whatever comes from a link or a file is checked field by field (ranges,
  types, names cut to 60 characters), and names only ever reach the page as
  text.
- **sat.js** — the satellite view. A WebGL fragment shader turns each pixel
  of the globe back into a latitude and longitude (the orthographic
  projection inverted) and samples NASA's Blue Marble, with mipmaps,
  anisotropic filtering and a screen-derivative fix for the seam at the date
  line. It draws to a canvas off the page, which is copied under the
  political map each frame; the map's fills turn translucent over it. The
  image is lightened in the light theme and a little darkened in the dark,
  loaded only when the view is first switched on (2,048 px wide, then
  4,096 px on larger screens), and the choice is remembered.
- **data/provinces.json** — Natural Earth 1:10m admin-1 states and provinces
  (the version with lakes cut out) as a TopoJSON topology, with a few country
  names made shorter or more current ("United States", "DR Congo",
  "Czechia", "Eswatini") and islets under 12 km² dropped unless they are a
  province's largest piece; simplified to a tenth of its points by spherical
  triangle area. From `tools/build-provinces.mjs` (see its arguments for the
  inputs). **data/cities.json** — the cities as `[name, lon, lat, size,
  capital]`, from greatercircle's lists by `tools/build-cities.mjs`.
  **data/earth-2048.webp**, **data/earth-4096.webp** — NASA Blue Marble Next
  Generation with shaded sea floor, equirectangular.
- **vendor/** — d3-array, d3-geo, topojson-client, topojson-simplify, unmodified.

## Using it

- **Select (V)**: click a country to rename or recolour it, paint with it or
  dissolve it; click a city to rename it, change its size or delete it, and
  drag it to move it. A region on its own can be made a country.
- **Paint borders (B)**: click or drag over regions to give them to the
  chosen country; Alt-click picks the country to paint with.
- **Cities (C)**: click to found a city, drag one to move it.
- Turn the globe by dragging with the right or middle button, or with Shift
  or Space held (in Select and Cities a plain drag turns it too); scroll or
  pinch to zoom. **S** turns the satellite view on and off; **Ctrl/Cmd+Z**
  undoes, **Ctrl/Cmd+Shift+Z** or **Ctrl+Y** redoes; **Delete** deletes the
  chosen city; **Escape** lets go of the selection, or goes back to Select.
- On a phone: tap to paint or to found a city, drag to turn the globe, and
  pull the sheet up for the rest.

## Tests

The page was driven with Playwright during development (selecting, renaming,
recolouring, painting regions and whole countries, unclaiming, founding and
dissolving countries, cities, undo and redo, reloading, links, files,
starting over, the satellite view, the phone sheet, both themes); those
scripts are not in the repo.

## Credits

Borders: Natural Earth (public domain). Cities: GeoNames (CC BY 4.0).
Satellite view: NASA Earth Observatory, Blue Marble Next Generation by Reto
Stöckli (public domain).
