# UCHRONIA

An alternate-history map maker: the world as it is, cut into its states,
provinces and regions, for you to redraw. Give any region to any country,
found countries and name them, shade them, and put cities where they might
have been, on a globe or a flat map. Served at `/uchronia/`. Built on the bones
of `/greatercircle/`.

## How it works

- **The model.** The land is a set of regions, and every region has an owner:
  a country, or nobody. Normally the regions are Natural Earth's 4,596
  first-level subdivisions (states, provinces). With *Finer regions in large
  countries* on (under Advanced), the large-region countries are cut further
  into their second-level units (counties, prefectures, districts), and each
  of those can change hands on its own. A country is only the set of regions
  it owns, so borders are never stored or drawn by hand. An edge between two
  regions is drawn as a border when the regions on its two sides belong to
  different countries, as a dotted province line when they don't, and as a
  fainter dotted line when it only separates two second-level units of one
  province. Painting moves regions from one owner to another; "Whole
  countries" moves all of a country's regions at once; "Unclaimed" takes them
  from everyone. A border can only run along region edges.
- **app.js**: the map, on a canvas.
  - **Globe.** A direct orthographic projector at three levels of detail,
    chosen by how big the map is on screen. Shapes so large that they wrap
    behind the globe and enclose the point opposite the view are drawn through
    d3-geo's clipping instead, so they don't flood the whole disc.
  - **Flat map.** The Equal Earth projection (Šavrič, Patterson and Jenny,
    2018), equal-area. Its central meridian follows the view, so panning
    sideways turns the world inside a fixed outline. Each ring is unwrapped
    across the edge of the map and drawn again a turn over where it crosses
    it. Rings that go round a pole (Antarctica) are closed along the pole line,
    and the whole map is clipped to its outline.
  - **Fills.** Each country is filled as one merged outline
    (`topojson.merge` of its regions), cached per level of detail until its
    regions change. Countries of the same shade share a single path.
  - **Picking.** A colour-coded second canvas finds the region under the
    pointer, checked against the exact shape.
  - **Shades.** Ten greys in CSS variables: light greys on white in the light
    theme, dark greys on black in the dark one. They are given out so that
    neighbours get tones well apart, and any colour can still be chosen by
    hand.
- **Labels.** A country's name goes on its largest piece, at the point where
  the biggest text box fits inside the land. To find it, the piece is drawn on
  an azimuthal-equidistant map around its centre and squeezed sideways by the
  name's own proportions. The pole of inaccessibility of the squeezed shape
  (the inside point farthest from its edges, found by the quadtree search of
  Mapbox's polylabel) is then the centre of the largest ellipse of the name's
  shape that fits in the land, and the text is sized to sit inside that
  ellipse.
  - Names with spaces are tried on two lines too.
  - Long, thin countries (Chile, Norway, Sweden) are also tried along their
    principal axis, and turned when that fits much better.
  - Labels are drawn largest country first and skipped where their turned
    boxes would overlap. They are worked out again in 14 ms slices after each
    edit or rename.
- **Cities.** 1,050 in four sizes; capitals are marked with a square. Each is
  shown from the zoom its size allows.
- **New countries.** A new country takes the name of the first region it
  receives, or of the country it swallows whole. Its capital is picked from
  the cities already in that land, the largest one, unless one of them is a
  capital already. "Make it a country" does the same for the region it
  frees.
- **Undo and redo.** Every edit is a step to undo or redo. A paint stroke is
  one step, and typing a name is one step however many keys it takes.
- **Saving.** The map is kept as its difference from the world as it is:
  - countries renamed, reshaded or founded;
  - the owners of provinces that changed hands whole (`o`), and of the
    second-level units of those that were split (`u`);
  - cities deleted, changed or added.

  That difference goes to `localStorage` after every edit (and at once when
  the page is hidden or closed), into a link ("Copy link": deflate-raw through
  `CompressionStream`, then base64url, in `#m=`), or into a file ("Save file",
  JSON).
  - Opening a link or a file, and "Start over", are steps that can be undone.
  - Opening a link keeps your own map one click away ("Back to mine"), even
    across several links.
  - Whatever comes from a link or a file is checked field by field: ranges,
    types, names cut to 60 characters, row counts capped, and new countries
    renumbered from the first free index. Names only ever reach the page as
    text.
- **sat.js**: the satellite view.
  - **Base image.** A WebGL fragment shader turns each pixel back into a
    latitude and longitude (the orthographic projection or Equal Earth
    inverted, the latter by Newton's method) and samples NASA's Blue Marble.
    The lookup uses mipmaps and anisotropic filtering, with explicit gradients
    taken on whichever side of the date line is smooth, so the seam doesn't
    show.
  - **Close up.** Zoomed in, and only once the view settles, the 256-pixel
    Web Mercator tiles of NASA's Global Imagery Browse Services (Blue Marble
    shaded relief and bathymetry, about 500 m a pixel) are fetched for what is
    on screen. Up to 40 tiles go into an 8-by-8 texture that the shader
    prefers wherever a tile has arrived. Tiles are cached, and if the service
    can't be reached the view stays on the base image.
  - **Drawing.** It renders to a canvas off the page, which is copied under
    the political map each frame; the map's fills go translucent over it.
  - **Theme and loading.** The imagery is lightened in the light theme and
    darkened in the dark. It is loaded only when the view is first switched
    on (2,048 px wide, then 4,096 px on larger screens), and the choice is
    remembered.
- **data/provinces.json**: Natural Earth 1:10m admin-1 states and provinces
  (the version with lakes cut out), as a TopoJSON topology.
  - A few country names are made shorter or more current ("United States",
    "DR Congo", "Czechia", "Eswatini").
  - Islets under 12 km² are dropped unless they are a province's largest
    piece.
  - It is simplified to a tenth of its points by spherical triangle area.
  - Built by `tools/build-provinces.mjs` (see its arguments for the inputs).
- **data/units.json**: the same provinces with the large-region countries cut
  into second-level units, all in one topology so that every shared edge is
  one arc. Loaded only when finer regions are switched on, or when a map
  needs them. Built by `tools/build-units.mjs`.
- **data/cities.json**: the cities as `[name, lon, lat, size, capital]`.
  - The first 550 are greatercircle's.
  - The next 500 are the largest of its place list, picked greedily with each
    country's share damped and none within 45 km of another.
  - Built by `tools/build-cities.mjs`.
- **data/earth-2048.webp**, **data/earth-4096.webp**: NASA Blue Marble Next
  Generation with shaded sea floor, equirectangular. The polar rows and the
  columns at the date line are evened out so that the wrap is seamless, and
  the smaller one is resized across the wrap.
- **vendor/**: d3-array, d3-geo, topojson-client, topojson-simplify, unmodified.

## Using it

- **Select (V)**: click a country to rename or reshade it, paint with it or
  dissolve it; click a city to rename it, change its size or delete it, and
  drag it to move it. A region on its own can be made a country.
- **Paint borders (B)**: click or drag over regions to give them to the
  chosen country; Alt-click picks the country to paint with.
- **Cities (C)**: click to found a city, drag one to move it.
- **M** switches between the globe and the flat map; **S** turns the
  satellite view on and off.
- Move the map by dragging with the right or middle button, or with Shift or
  Space held (in Select and Cities a plain drag moves it too); scroll or
  pinch to zoom.
- **Ctrl/Cmd+Z** undoes, **Ctrl/Cmd+Shift+Z** or **Ctrl+Y** redoes;
  **Delete** deletes the chosen city; **Escape** lets go of the selection, or
  goes back to Select.
- On a phone: tap to paint or to found a city, drag to move the map, and pull
  the sheet up for the rest.

## Tests

The page was driven with Playwright during development; those scripts are not
in the repo. They covered:
- selecting, renaming, reshading, painting regions and whole countries, and
  unclaiming;
- founding and dissolving countries, region names and capitals, and cities;
- undo and redo, including across start-over and file steps;
- reloading, links (including hostile ones), files and starting over;
- the flat map: picking, painting, zooming at the cursor, panning across the
  date line and dragging cities;
- label placement;
- the satellite view and its close-up tiles, against a stand-in tile server
  built from the base image;
- the phone sheet, and both themes.

## Credits

- **Borders:** Natural Earth (public domain).
- **Second-level units:** see `tools/build-units.mjs` and the `sources` list
  in `data/units.json`.
- **Cities:** GeoNames (CC BY 4.0).
- **Satellite view:** NASA Earth Observatory, Blue Marble Next Generation by
  Reto Stöckli, and NASA's Global Imagery Browse Services (public domain).
