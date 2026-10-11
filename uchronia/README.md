# UCHRONIA

An alternate-history map maker: the world as it is, cut into its states,
provinces and regions, for you to redraw. Give any region to any country,
found countries, name and colour them, and put cities where they might
have been, on a globe or a flat map. Served at `/uchronia/`. Built on the bones
of `/greatercircle/`.

## How it works

- **The model.** The land is a set of regions, and every region has an owner:
  a country, or nobody. The regions are Natural Earth's 4,596 first-level
  subdivisions (states, provinces), with two adjustments:
  - In twelve countries whose subdivisions are very small (Slovenia's 193
    municipalities, Italy's 110 provinces, Latvia, North Macedonia, Malta,
    Kosovo, Azerbaijan, Uganda, Bhutan, the Philippines, Sri Lanka and Hong
    Kong), they are grouped into the regions above them (Slovenia's 12
    statistical regions, Italy's 20 regions), 102 groups in all, and a group
    changes hands as one.
  - With *Finer regions* on (under Advanced), those groups come apart again,
    and the large-region countries are cut further into their second-level
    units (counties, prefectures, districts), each of which can change hands
    on its own.

  A country is only the set of regions it owns, so borders are never stored.
  An edge between two regions is drawn as a border when the regions on its
  two sides belong to different countries, as a dotted province line when
  they don't, and as a fainter dotted line when it only separates two parts of
  one region. Painting moves regions from one owner to another; "Whole
  countries" moves all of a country's regions at once; "Unclaimed" takes them
  from everyone. Where a border should not follow region edges, it can be
  drawn by hand (see *Drawn land*).
- **Drawn land.** The Draw tool takes a freehand outline and gives the land
  inside it to the chosen country.
  - The outline is simplified on screen, turned into longitude and latitude,
    split where it crosses the date line (or closed over the pole if it goes
    round one) and cleaned of self-crossings by polygon-clipping.
  - A drawing lies on top of the regions and keeps its own owner. A newer
    drawing is cut out of older ones, so drawings never overlap, and a point
    belongs to the drawing it lies in, or else to its region.
  - It is drawn clipped to the land at the current level of detail, so its
    edge follows the coast exactly at every zoom. The regions underneath are
    clipped out (even-odd), so their lines and fills don't show through.
  - Its border is worked out by sampling just outside each stretch of its
    outline: a line is drawn where the land there belongs to someone else.
  - Its area is found by intersecting it with the regions it overlaps, which
    also tells each country how much land it lost. Country names are placed
    on the country's shape with its drawings added and others' taken away.
  - Painting a drawing repaints it alone; "Whole countries" and dissolving
    take a country's drawings along. Select a drawing to make it a country or
    remove it.
- **app.js**: the map, on a canvas.
  - **Globe.** A direct orthographic projector at four levels of detail,
    chosen by how big the map is on screen: three simplified from the loaded
    topology, and, close up, a more detailed copy of the same arcs that is
    fetched and prepared in the background the first time it is needed.
    Shapes so large that they wrap behind the globe and enclose the point
    opposite the view are drawn through d3-geo's clipping instead, so they
    don't flood the whole disc. Line segments along the date line and the
    south pole, where Natural Earth cuts shapes, are left out.
  - **Flat map.** A plain rectangle of latitude and longitude (the
    equirectangular projection), centred on Greenwich. It stays still: panning
    moves the view over it and stops at its edges, and zooming keeps the point
    under the cursor where it is. A ring that crosses the 180th meridian is
    unwrapped and drawn again a turn over. Rings that go round a pole
    (Antarctica) are closed along the pole line, and the map is clipped to its
    rectangle.
  - **Fills.** Each country is filled as one merged outline
    (`topojson.merge` of its regions), cached per level of detail until its
    regions change. Countries of the same colour share a single path.
  - **Picking.** A colour-coded second canvas finds the region under the
    pointer, checked against the exact shape.
  - **Colours.** The page is black on white (light theme) or white on black
    (dark), and the countries are coloured like a political map: ten colours
    in CSS variables, soft ones on white and deeper ones on black, ordered
    round the colour wheel. They are given out so that neighbours never share
    one and sit well apart on the wheel, and any colour can still be chosen by
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
  - Country names and city names can each be hidden (under Advanced); with
    city names hidden, the cities stay as dots.
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
  - countries renamed, recoloured or founded;
  - the owners of provinces that changed hands whole (`o`), and of the
    second-level units of those that were split (`u`);
  - cities deleted, changed or added;
  - drawn land (`h`): each drawing's owner and outline, in ten-thousandths of
    a degree, each ring stored as differences from the point before.

  That difference goes to `localStorage` after every edit (and at once when
  the page is hidden or closed), into a link ("Copy link": deflate-raw through
  `CompressionStream`, then base64url, in `#m=`), or into a file ("Save file",
  JSON).
  - Opening a link or a file, and "Start over", are steps that can be undone.
  - Opening a link keeps your own map one click away ("Back to mine"), even
    across several links.
  - Whatever comes from a link or a file is checked field by field: ranges,
    types, names cut to 60 characters, row counts capped, and new countries
    renumbered from the first free index. Drawings are capped at 300 and
    60,000 points, and cleaned by polygon-clipping again. Names only ever
    reach the page as text.
- **sat.js**: the satellite view.
  - **Base image.** A WebGL fragment shader turns each pixel back into a
    latitude and longitude (the orthographic or the flat map's projection
    inverted) and samples NASA's Blue Marble.
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
  - The region groups come from Natural Earth's `region` field, with some
    names put into English ("Lombardy", "Nakhchivan") or into their current
    form (Kosovo's districts by their Albanian names).
  - Built by `tools/build-provinces.mjs` (see its arguments for the inputs).
- **data/provinces-detail.json**: the same arcs kept at four tenths of their
  points (3.7 MB, about 1.4 MB compressed), for the closest zooms. It holds
  only the arcs; the shapes come from `provinces.json`.
- **data/units.json**: the same provinces with eight large-region countries
  cut into second-level units, 8,956 regions in all, in one topology so that
  every shared edge is one arc:
  - the United States (3,142 counties; DC stays whole), China (352
    prefectures; the four municipalities stay whole), Germany (398 districts;
    Berlin and Hamburg stay whole), Canada (72 economic regions; the
    territories and Prince Edward Island stay whole), DR Congo (188
    territories and cities), Kazakhstan (171 districts, from before the 2022
    reform), Pakistan (124 districts) and South Africa (52 district
    municipalities);
  - China's prefectures are regrouped from 1999 county boundaries by name and
    code, so later county splits are missing;
  - disputed areas follow Natural Earth's assignment and are only cut within
    their province;
  - each unit is clipped to the Natural Earth province it falls in, gaps go
    to a neighbour, and all rings are noded against each other before the
    topology is built;
  - it is loaded only when finer regions are switched on, or when a map needs
    them (3.1 MB, about 950 KB compressed);
  - built by `tools/build-units.mjs`, which needs clipper-lib (integer
    polygon clipping), @vant/area-data (current Chinese division codes) and
    pinyin-pro (romanised Chinese names) at build time; its arguments list the
    inputs.
- **data/cities.json**: the cities as `[name, lon, lat, size, capital]`.
  - The first 550 are greatercircle's.
  - The next 500 are the largest of its place list, picked greedily with each
    country's share damped and none within 45 km of another.
  - Built by `tools/build-cities.mjs`.
- **data/earth-2048.webp**, **data/earth-4096.webp**: NASA Blue Marble Next
  Generation with shaded sea floor, equirectangular. The polar rows and the
  columns at the date line are evened out so that the wrap is seamless, and
  the smaller one is resized across the wrap.
- **vendor/**: d3-array, d3-geo, topojson-client, topojson-simplify and
  polygon-clipping, unmodified.

## Using it

- **Select (V)**: click a country to rename or recolour it, paint with it or
  dissolve it; click a city to rename it, change its size or delete it, and
  drag it to move it. A region on its own can be made a country.
- **Paint borders (B)**: click or drag over regions to give them to the
  chosen country; Alt-click picks the country to paint with.
- **Draw borders (D)**: drag round some land to give it to the chosen
  country, or to leave it unclaimed; on a phone, draw with one finger and
  move the map with two.
- **Cities (C)**: click to found a city, drag one to move it.
- **M** switches between the globe and the flat map; **S** turns the
  satellite view on and off.
- Move the map by dragging with the right or middle button, or with Shift or
  Space held (in Select and Cities a plain drag moves it too); scroll or
  pinch to zoom.
- **Ctrl/Cmd+Z** undoes, **Ctrl/Cmd+Shift+Z** or **Ctrl+Y** redoes;
  **Delete** deletes the chosen city or drawing; **Escape** drops a drawing
  in progress, lets go of the selection, or goes back to Select.
- On a phone: tap to paint or to found a city, drag to move the map, and pull
  the sheet up for the rest.

## Tests

The page was driven with Playwright during development; those scripts are not
in the repo. They covered:
- selecting, renaming, recolouring, painting regions and whole countries, and
  unclaiming;
- founding and dissolving countries, region names and capitals, and cities;
- undo and redo, including across start-over and file steps;
- reloading, links (including hostile ones), files and starting over;
- the flat map: picking, painting, zooming at the cursor, panning up to its
  edges and dragging cities;
- finer regions: switching them on and off, painting single counties,
  undoing paint from before the switch, reloading and sharing;
- region groups: Slovenia's statistical regions and Italy's regions painted
  whole, named, made countries, and split again with finer regions on;
- drawn land: drawing, overlapping drawings, painting and removing them,
  making one a country, areas, the date line, the flat map, the satellite
  view, saving, links, and drawing by touch;
- hiding country and city names, and the detailed borders up close;
- label placement;
- the satellite view and its close-up tiles, against a stand-in tile server
  built from the base image;
- the phone sheet, and both themes.

## Credits

- **Borders:** Natural Earth (public domain).
- **Second-level units:**
  - US counties from the US Census Bureau through Natural Earth (public
    domain);
  - Chinese prefectures from China's national mapping agency through
    Revolutionary GIS (ODC PDDL);
  - German districts © GeoBasis-DE / BKG 2021 (dl-de/by-2-0);
  - Canada's economic regions from Statistics Canada (Open Government Licence
    – Canada 2.0);
  - DR Congo and South Africa from OCHA and its partners (CC BY 3.0 IGO);
  - Kazakhstan © OpenStreetMap contributors (ODbL 1.0, so the Kazakh part of
    `data/units.json` is under the ODbL too);
  - Pakistan, and all of them gathered, from geoBoundaries (Runfola et al.,
    PLoS ONE 15(4): e0231866, 2020).

  The `sources` list in `data/units.json` has the links.
- **Cities:** GeoNames (CC BY 4.0).
- **Satellite view:** NASA Earth Observatory, Blue Marble Next Generation by
  Reto Stöckli, and NASA's Global Imagery Browse Services (public domain).
