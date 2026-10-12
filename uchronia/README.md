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
  - With *Finer regions* on (in the View menu), those groups come apart again,
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
  - **Picking.** A two-degree grid of the regions' bounding boxes narrows the
    search, and a point-in-polygon test on their shapes finds the region under
    the pointer.
  - **Colours.** The countries are coloured like a political map: ten colours
    in CSS variables, ordered round the colour wheel and given out so that
    neighbours never share one and sit well apart on the wheel; any colour can
    still be chosen by hand.
  - **Styles.** *Light* is black on white and *Dark* white on black; both
    follow the site's day and night setting, which they also set. *Antique*
    is drawn like a hand-coloured map of the 1800s:
    - parchment and sepia ink, with a paper grain on the bar, the menus and
      the buttons;
    - pale washes inside each country, with a stronger band of its colour
      along its borders and coasts (the arcs on its edge, stroked twice as
      wide and clipped to the country, and thinner on a small map); the
      colour buttons show the same wash and band. The eighth colour is a
      violet rather than the teal of the other styles, and the sea a deeper
      grey-green, so that no land is tinted like the sea;
    - the sea in two tones, as on old charts: the grey-green over the
      continental shelves, where it is less than 200 m deep, and a darker one
      over the deep ocean beyond (Natural Earth's 200 m depth line). With the
      satellite view on, the sea keeps these tones and only the land shows
      the imagery;
    - water lining: rings round every coast, cut by stroking the coastline
      wide in ink and then a little narrower in the sea colour; four on a
      large map, two or three on a small one, and none round islands too
      small to see;
    - Old Standard TT, a revival of late 19th-century type, for the menus
      and the names, italic names for 57 oceans and seas (the oceans only on
      a map big enough to hold them), circled cities and
      ringed capitals, and a double frame round the flat map;
    - country names that bend along arcs, as engravers set them (see
      *Labels*);
    - age drawn on the map itself, never on the screen around it. The globe
      is an old paper globe: its twelve gores and two polar caps each a
      slightly different tone, with faint seams between them, varnish that
      darkens towards the edge of the sphere and a soft highlight. The flat
      map is a folded sheet: eight panels of slightly different tones, folds
      down the middle and the quarters and across the equator, and edges
      browned by handling. Both carry soft, uneven toning, placed on the
      earth or the sheet from a fixed seed so that it turns and pans with
      it; all of it is multiplied onto the canvas after the borders and
      before the names. The satellite view is toned sepia;
    - the site's name in letterspaced capitals and the back link in italic,
      both in Old Standard TT; on a phone, where they sit over the map, they
      share a small title block in a double rule.
- **Labels.** A country's name goes on its largest piece, as near its middle
  as a good-sized name will fit. To find the place, the piece is drawn on an
  azimuthal-equidistant map around its centre and squeezed sideways by the
  name's own proportions. The pole of inaccessibility of the squeezed shape
  (the inside point farthest from its edges, found by the quadtree search of
  Mapbox's polylabel) gives the biggest name that fits; a second quadtree
  search, ordered by distance from the centre, then finds the point nearest
  the middle where a name at least 78% of that size still fits, and the text
  is sized to sit inside the ellipse there.
  - The name keeps clear of its country's capital (above, below or to the
    side of it, leaving room for the capital's own name), shrinking a step or
    two if it must; only where there is no room at all does it sit on top.
  - Names with spaces are tried on two lines too.
  - Long, thin countries (Chile, Norway, Sweden) are also tried along their
    principal axis, and turned when that fits much better.
  - In Antique, names are also tried along arcs. The piece is unrolled round a
    centre to its north or south (a log-polar map, which keeps shapes), and
    the same search on the unrolled shape gives the biggest name that follows
    those circles. A bent name is used when it is at least four fifths the
    size of the straight one and ten points along its outline lie inside the
    land; on screen, the arc is the circle through three of its points, and
    each letter is set along it.
  - In Antique, a name too small to read at its full letter spacing is set
    tighter, and so a little larger, rather than left out.
  - Labels are drawn largest country first and skipped where their turned
    boxes would overlap, or would run under the scale bar, the map buttons or
    (on a phone) the site's name. They are worked out again in 14 ms slices after each
    edit or rename.
  - Country names and city names can each be hidden (in the View menu); with
    city names hidden, the cities stay as dots.
- **Cities.** A capital is a star in a circle, a city a square and a town a
  white circle, in every style, each with its own size of name; in Antique
  the names are a size larger, on a heavier halo, to read clearly over the
  coloured map. Where a capital's name has no room, its mark is still drawn,
  and with the Cities tool a click on a city that is not drawn picks it
  rather than founding another on top of it.
- **Rivers.** Natural Earth's rivers, drawn in blue over the countries and
  under their borders: the largest (the Amazon, the Nile, the Yangtze) from
  the whole globe, and smaller ones in nine steps as the map is zoomed in;
  past about 3.5 times zoom a more detailed set, with the smaller rivers and
  more than twice the points per river, is loaded and drawn instead. Their
  names are set in italic beside them, letter by letter along the
  straightest stretch of each river on screen, from the largest down as the
  zoom allows, giving way to country and city names.
  They are left off the whole world, so the map stays clear, and fade in
  between 1.3 and 2.4 times zoom; close up they stay. They can be hidden in
  the View menu, and are left off the satellite view.
- **Latitude and longitude.** The lines every 10° are labelled. On the flat
  map, the parallels along its left edge and the meridians along its top, or
  along the edges of the screen once it is zoomed past them. On the globe, a
  meridian and a parallel half way out from the middle of the view carry the
  numbers, the parallel on the side towards the equator; zoomed in so that
  the globe fills the screen, the labels move to the edges as on the flat
  map. They give way to every other name, and can be hidden in the View menu.
- **Scale bar.** Kilometres over miles in the bottom corner, in round lengths
  of 1, 2 or 5 times a power of ten that fit 120 px, true at the centre of the
  view (on the flat map, along the parallel there); in Antique, chequered bars
  with the units spelt out. It can be hidden in the View menu.
- **Zoom.** From a little under the whole globe to 60 times it.
- **Cities.** 3,050 in four sizes. Each is shown from the zoom its size allows.
- **New countries.** A new country takes the name of the first region it
  receives, or of the country it swallows whole. Its capital is picked from
  the cities already in that land, the largest one, unless one of them is a
  capital already. "Make it a country" does the same for the region it
  frees.
- **Undo and redo.** Every edit is a step to undo or redo. A paint stroke is
  one step, and typing a name is one step however many keys it takes.
- **Saving.** The map is kept as its difference from the world as it is:
  - countries renamed, recoloured or founded, and those whose inner borders
    are hidden (`l`);
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
  - **Theme and loading.** The imagery is lightened in the light theme,
    darkened in the dark and toned sepia in Antique. It is loaded only when the view is first switched
    on (2,048 px wide, then 4,096 px on larger screens), and the choice is
    remembered.
- **data/provinces.json**: Natural Earth 1:10m admin-1 states and provinces
  (the version with lakes cut out), as a TopoJSON topology.
  - A few country names are made shorter or more current ("United States",
    "DR Congo", "Czechia", "Eswatini").
  - Islets under 12 km² are dropped unless they are a province's largest
    piece or an enclave: a piece of at least 0.5 km² whose outline lies on its
    neighbours' all the way round (the Swiss cantons' and Liechtenstein's
    exclaves, for instance), which would otherwise leave a hole. The units
    below are cut from the same pieces.
  - The build stops if simplifying would turn any piece inside out.
  - It is simplified to a tenth of its points by spherical triangle area.
  - The region groups come from Natural Earth's `region` field, with some
    names put into English ("Lombardy", "Nakhchivan") or into their current
    form (Kosovo's districts by their Albanian names).
  - Built by `tools/build-provinces.mjs` (see its arguments for the inputs).
- **data/provinces-detail.json**: the same arcs kept at four tenths of their
  points (3.8 MB, about 1.3 MB compressed), for the closest zooms. It holds
  only the arcs; the shapes come from `provinces.json`.
- **data/units.json**: the same provinces with 40 countries cut into
  second-level units, 18,311 regions in all, in one topology so that
  every shared edge is one arc:
  - the United States (3,142 counties; DC stays whole), China (352
    prefectures; the four municipalities stay whole), Germany (398 districts;
    Berlin and Hamburg stay whole), Canada (72 economic regions; the
    territories and Prince Edward Island stay whole), DR Congo (188
    territories and cities), Kazakhstan (171 districts, from before the 2022
    reform), Pakistan (124 districts) and South Africa (52 district
    municipalities);
  - Brazil (510 immediate geographic regions, IBGE's municipalities merged by
    IBGE's own table), Russia (701 districts and urban okrugs in the 24
    federal subjects over 150,000 km²; the other 62 stay whole), Australia
    (542 local government areas; the ACT and three small territories stay
    whole), India (731 districts), Argentina (525 departments), Indonesia (518
    regencies and cities), Mongolia (338 sums), Iran (430 counties), Sudan
    (189 localities), Peru (196 provinces), Tanzania (170 districts), Algeria
    (121 communes in the eight wilayas over 60,000 km²; the other 40 stay
    whole), Angola (157 municipalities, before the 2024 reform), Mozambique
    (156 districts), Saudi Arabia (147 governorates), Madagascar (119
    districts), Zambia (116 districts), Bolivia (110 provinces), Ethiopia (71
    zones), Chad (69 departments), Niger (66 departments), Mauritania (56
    moughataas) and Mali (49 cercles);
  - Mexico (2,457 municipalities), Ukraine (477 raions, from before the 2020
    reform), Poland (380 powiats), Malaysia (156 districts), Belarus (117
    raions; Minsk stays whole), Austria (93 districts; Vienna stays whole),
    Myanmar (74 districts), Kenya (46 counties, inside its eight old
    provinces; Nairobi stays whole) and Somaliland (5 regions, those of
    Somalia within its border); a province that is a single unit, such
    as a capital district, stays whole;
  - Egypt is left out: its second level mixes city districts, unnamed desert
    remnants and misplaced shapes;
  - China's prefectures are regrouped from 1999 county boundaries by name and
    code, so later county splits are missing;
  - disputed areas follow Natural Earth's assignment and are only cut within
    their province;
  - each unit is clipped to the Natural Earth province it falls in, gaps go
    to a neighbour, and all rings are noded against each other before the
    topology is built;
  - borders are snapped to the integer grid in a way that cannot make
    neighbouring borders cross, and the simplification is guarded against
    reversed lobes, stray holes and self-overlap;
  - it is loaded only when finer regions are switched on, or when a map needs
    them (5.8 MB, about 1.7 MB compressed);
  - `data/units-detail.json` holds the same arcs at six tenths of their
    points, on a grid of 400,000 steps, for the closest zooms (9.3 MB, about
    3.3 MB compressed), fetched only there;
  - built by `tools/build-units.mjs`, which needs clipper-lib (integer
    polygon clipping), @vant/area-data (current Chinese division codes),
    pinyin-pro (romanised Chinese names) and @br-geo-kit/ibge (IBGE's
    municipality-to-region table) at build time; its arguments list the
    inputs.
- **data/cities.json**: the cities as `[name, lon, lat, size, capital]`.
  - The first 550 are greatercircle's.
  - The next 500 are the largest of its place list, picked greedily with each
    country's share damped and none within 45 km of another.
  - The last 2,000 are towns of at least 15,000 people from the same list,
    picked the same way with none within 20 km of another. Their names lose
    the administrative words the list keeps (Chinese "Shi" and "Qu", Korean
    "-si", Vietnamese "Thành Phố"), and in Arabic-, Persian- and
    Urdu-speaking countries and a few others the transliteration marks.
  - Built by `tools/build-cities.mjs`.
- **data/sea.json**: Natural Earth 1:10m bathymetry, the areas deeper than
  200 m, cut into 30° tiles so that no piece is large enough to need
  clipping at the edge of the globe, as two TopoJSON topologies of polygons
  wound for d3: one simplified to a twelfth of its points, and one to a
  fiftieth for the whole globe. Areas and shallows under 400 km² are
  dropped, and the build stops if a large area changes by more than a
  tenth or any covers land. On the flat map the tiles are one cached path
  scaled into place, so the second tone costs almost nothing. Built by
  `tools/build-sea.mjs`.
- **data/rivers.json**, **data/rivers-detail.json**: Natural Earth 1:10m
  river centerlines and their courses through lakes, without canals, as
  TopoJSON lines with the rank as `r` and the name as `n` (the English name
  where Natural Earth has one that is not garbled, with a few common
  exonyms such as Rhine and Danube). Points that fall in the sea or in a
  lake the map shows are dropped, splitting the line there. The first file
  holds ranks 1 to 6 simplified to a fifth of their points, the second
  ranks 1 to 9 at 45%. Built by `tools/build-rivers.mjs`.
- **data/earth-2048.webp**, **data/earth-4096.webp**: NASA Blue Marble Next
  Generation with shaded sea floor, equirectangular. The polar rows and the
  columns at the date line are evened out so that the wrap is seamless, and
  the smaller one is resized across the wrap.
- **vendor/**: d3-array, d3-geo, topojson-client, topojson-simplify and
  polygon-clipping, unmodified.
- **/fonts/**: Old Standard TT (SIL Open Font License), from
  @fontsource/old-standard-tt, served from the site like its other typeface.

## Using it

- The bar along the top holds the tools, *New country*, undo and redo, and
  **History** and three menus: **Check**, **File** (copy a link, save a file, open one, start
  over) and **View** (the style, country and city names, rivers, latitude and
  longitude, the scale bar, finer regions). What is
  selected shows in the bar's second row, and a hint for the tool at the
  bottom of the map.
- **History** opens a panel in which a historian of the map's world writes
  how it came to look as it does: the points where its history parted from
  ours, each with a year and a cause, and what followed from them, in three
  to six eras. A note can say where the history begins or what it should
  stress. Every country, region and city of the map that the history names
  is a link that flies the map to it. The last history is kept in the
  browser, and the panel says when the map has changed since.
  - The page sends a plain list of the map's differences from ours (which
    regions changed hands, countries founded, renamed or gone, borders drawn
    by hand, cities renamed, moved or founded) and the note, nothing else, to
    a small server function, `supabase/functions/historian`, which asks
    Claude (claude-opus-5-5, through Anthropic's API) to write it and streams
    the text back. The function holds the API key, answers only this site,
    and allows 100 histories a day in all and 5 a visitor; it keeps only a
    daily count per visitor under a hashed key, never the map or the text.
  - The function and its daily counter (`historian_usage`, with
    `historian_take` and `historian_give_back`) live in the Supabase project
    "uchronia". It needs the `ANTHROPIC_API_KEY` secret set in that project.
- **Check** counts, in a badge, what may have been left by mistake, and
  lists it: cities and countries never renamed from *New city* or *New
  country*, countries founded and given no land, countries that lost their
  capital or gained a second one, two countries with one name, and cities
  dropped in the sea. Picking one goes to it and selects it, ready to rename.
  A fresh map has nothing to fix, and a country just founded is left out
  until it is let go, so the count does not rise while it is being made.
- The **ⓘ** button by the title opens a note on the map, its sources and
  its keys; a second click closes it.
- **Select (V)**: click a country to rename or recolour it, show or hide its
  inner borders (the lines between its regions, and the finer lines inside
  them; a kind it has none of is greyed out), give it land or dissolve it; click a city to rename it, change its
  size or delete it, and once it is picked, drag it to move it. A region on
  its own can be made a country.
- **Give land (B)**: one tool for moving borders. Its pane says who gets
  the land (the chosen country, shown with its colour, or *Unclaimed*) and
  how it is taken:
  - *Regions*: click or drag over regions;
  - *Whole countries*: click a country to give all of it;
  - *Lasso* (D): drag round any land, across region lines; on a phone, draw
    with one finger and move the map with two.

  Alt-click picks the country to give land to.
- **Cities (C)**: click to found a city; click one to pick it, then drag it
  to move it (a drag on a city that isn't picked moves the map).
- **M** switches between the globe and the flat map; **S** turns the
  satellite view on and off; **H** (or the eye button) hides everything but
  the map, and brings it back.
- Move the map by dragging with the right or middle button, or with Shift or
  Space held (in Select and Cities a plain drag moves it too); scroll or
  pinch to zoom.
- **Ctrl/Cmd+Z** undoes, **Ctrl/Cmd+Shift+Z** or **Ctrl+Y** redoes;
  **Delete** deletes the chosen city or drawing; **Escape** drops a drawing
  in progress, lets go of the selection, or goes back to Select.
- On a phone: tap to give regions or to found a city, drag to move the map, and pull
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
- the top bar and its menus, the three styles, curved names, the hidden
  interface, and keyboard focus;
- inner borders hidden and shown per country, saved, linked and undone;
  cities picked before they move; the scale bar and the zoom limit;
- rivers loading, and the latitude and longitude labels on the globe, the
  flat map and zoomed in, hidden and remembered;
- the Check menu (a clean map, a forgotten city and country, going to one and
  renaming it), the greyed-out inner borders, rivers fading out up close, and
  Antique's two-tone sea with the satellite view on;
- a hidden capital picked by the Cities tool, the about note opening and
  closing, the latitude and longitude labels thinning out on the whole flat
  map, and the phone's larger buttons;
- label placement;
- the satellite view and its close-up tiles, against a stand-in tile server
  built from the base image;
- the phone sheet, and both themes.

## Credits

- **Borders and rivers:** Natural Earth (public domain).
- **Second-level units:**
  - US counties from the US Census Bureau through Natural Earth (public
    domain);
  - Chinese prefectures from China's national mapping agency through
    Revolutionary GIS (ODC PDDL);
  - German districts © GeoBasis-DE / BKG 2021 (dl-de/by-2-0);
  - Canada's economic regions from Statistics Canada (Open Government Licence
    – Canada 2.0);
  - DR Congo and South Africa from OCHA and its partners (CC BY 3.0 IGO);
  - Kazakhstan, Russia, Iran, Saudi Arabia and Algeria © OpenStreetMap
    contributors, and India (Pathways Data) and Ethiopia (Open Africa) under
    the same licence: ODbL 1.0, so those parts of `data/units.json` and
    `data/units-detail.json` are under the ODbL too (geoBoundaries lists the
    Saudi and Algerian extracts as CC BY-SA 2.0, but they are OpenStreetMap
    data from 2021, so OpenStreetMap's own licence is the one that applies);
  - Brazil's municipal boundaries from IBGE through OCHA ROLAC (CC BY 3.0
    IGO), merged by IBGE's region table;
  - Australia © Australian Bureau of Statistics (CC BY 4.0);
  - Argentina, Indonesia, Mongolia, Sudan, Mauritania, Peru, Chad,
    Mozambique, Tanzania and Madagascar from their national agencies through
    OCHA and its partners (CC BY 3.0 IGO); Mali (CC BY 4.0) and Zambia (GRID3,
    CC BY 4.0); Niger (CC BY 3.0); Bolivia (GeoBolivia) and Angola (Wikimedia
    Commons) in the public domain;
  - Austria © BEV, Federal Office of Metrology and Surveying (CC BY-SA 2.0,
    so Austria's part of the units files is under CC BY-SA too); Belarus from
    CIESIN's Gridded Population of the World (CC BY 3.0); Kenya from RCMRD
    (public domain); Malaysia from City Population (CC BY 3.0); Mexico from
    the World Bank (CC BY 4.0); Myanmar from the Myanmar Analytics Project
    and USAID (CC BY 4.0); Ukraine from Wikimedia Commons (public domain);
    Poland and Somaliland © OpenStreetMap contributors (ODbL 1.0);
  - Pakistan, and all of them gathered, from geoBoundaries (Runfola et al.,
    PLoS ONE 15(4): e0231866, 2020).

  The `sources` list in `data/units.json` has the links.
- **Cities:** GeoNames (CC BY 4.0).
- **Satellite view:** NASA Earth Observatory, Blue Marble Next Generation by
  Reto Stöckli, and NASA's Global Imagery Browse Services (public domain).
