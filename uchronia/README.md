# UCHRONIA

An alternate-history map maker: the world as it is, cut into its states,
provinces, and regions, for you to redraw. Give any region to any country,
found countries, name and colour them, and put cities where they might
have been, on a globe or a flat map. Served at `/uchronia/`. Built on the bones
of `/greatercircle/`.

## How it works

- **The model.** The land is a set of regions, and every region has an owner:
  a country, or nobody. The regions are Natural Earth's 4,596 first-level
  subdivisions (states, provinces), with two adjustments:
  - In twelve countries whose subdivisions are very small (Slovenia's 193
    municipalities, Italy's 110 provinces, Latvia, North Macedonia, Malta,
    Kosovo, Azerbaijan, Uganda, Bhutan, the Philippines, Sri Lanka, and Hong
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
    round one), and cleaned of self-crossings by polygon-clipping.
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
    equirectangular projection), centred on Greenwich. Zoomed out it stays
    still, stopping at its edges; once it is wider than the window it scrolls
    sideways without end, round and round the world, and zooming keeps the
    point under the cursor where it is. A ring that crosses the 180th meridian is
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
    follow the site's day and night setting, which they also set. *Antique*,
    the style a first visit opens in, is drawn like a hand-coloured map of
    the 1800s:
    - parchment and sepia ink, with a paper grain on the bar, the menus, and
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
    - IM Fell English, Igino Marini's revival of the Fell types, for the menus
      and the names, italic names for 57 oceans and seas (the oceans only on
      a map big enough to hold them), circled cities and
      ringed capitals, and a double frame round the flat map;
    - in a history's era headings, which are set in capitals, the years in
      Old Standard TT, whose figures stand as tall as the capitals (IM Fell's
      old-style figures look too small beside them);
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
      both in IM Fell English; on a phone, where they sit over the map, they
      share a small title block in a double rule.
    - buttons framed like engraved plates, in a double rule with a small dot
      at each corner (in paper on a pressed button), and icons drawn as
      engravings, with fine hatching: a manicule for Select, a pennon over a
      hillock for Give land, a church and houses for Settlements, swashed
      arrows for undo and redo, a rolled map and a globe on its stand for the
      flat map and the globe, a Montgolfier balloon for the satellite view, and
      an open or closed eye for hiding the interface. They are inline SVG
      beside the plain icons, and each style shows only its own.
- **Labels.** A country's name goes on its largest piece, as near its middle
  as a good-sized name will fit. To find the place, the piece is drawn on an
  azimuthal-equidistant map around its centre and squeezed sideways by the
  name's own proportions. The pole of inaccessibility of the squeezed shape
  (the inside point farthest from its edges, found by the quadtree search of
  Mapbox's polylabel) gives the biggest name that fits; a second quadtree
  search, ordered by distance from the centre, then finds the point nearest
  the middle where a name at least 78% of that size still fits, and the text
  is sized to sit inside the ellipse there.
  - The name keeps clear of its country's capital (above, below, or to the
    side of it, leaving room for the capital's own name). Where the capital
    is near the middle (Madrid, Bogotá), a full-size name at the edge and a
    smaller one beside the capital are weighed by size and by distance from
    the middle, so the name stays central; only where there is no room at
    all does it sit on top.
  - Names with spaces are tried on two lines too.
  - A name may also lie across the sea within its country's reach: the
    convex hull of its largest piece of land and every other piece within
    600 km of the group is tried as well, and taken when it gives a clearly
    larger name with almost none of it over another country's land, and
    only if the country is a true archipelago (its largest piece holds under
    70% of its land) or the name is ringed by its own land (in at least 65%
    of sixteen directions, its land lies within 1.3 name-widths): Indonesia,
    Japan, the Philippines, Malaysia, Canada over Hudson Bay. A country that
    is not an archipelago takes the hull only for a name at least 1.8 times
    larger. Norway, Chile, and Costa Rica, whose far islands only stretch the
    hull over open sea, and India, keep their names on land. A name on a
    hull is centred on the hull, not on the largest island, so Indonesia's
    lies across the Java Sea rather than on Borneo.
  - A country too small for its name on its land has it set in small type
    beside it, in the water, where there is room (the Caribbean islands,
    Cyprus, Lebanon).
  - On the globe, names far from the centre of the view are set straight,
    not curved or turned along the outline the curve of the earth squeezes.
  - In Antique, a city name that has no room to the right of its mark tries
    the left, above, and below.
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
  - Country names and settlements can each be hidden (in the View menu);
    hiding settlements hides their marks and names together, except the one
    picked and all of them while the Settlements tool is in use.
- **Settlements** are placed in order of rank: capitals first, then cities,
  towns, and small towns, each giving way to those before it, mark and name
  alike: a smaller place is left off, or its name moved, if either would
  touch a larger one's mark or name. They are drawn in the reverse order, so
  a capital's mark and name sit on top of any other.
  Africa's largest cities (Cairo, Lagos, Kinshasa, Luanda, Dar es Salaam,
  Johannesburg, Khartoum, Abidjan, Addis Ababa, Nairobi) are shown from the
  farthest zoom, its cities of 1.5 million or more a step later and of
  800,000 a step after that (`tools/retier-africa.mjs`, from GeoNames'
  populations), so the continent is not left bare beside the others.
- **Cities.** A capital is a star in a circle, a city a square, and a town a
  white circle, in every style, each with its own size of name; in Antique
  the names are a size larger, on a heavier halo, to read clearly over the
  coloured map. Where a capital's name has no room, its mark is still drawn,
  and with the Settlements tool a click on a city that is not drawn picks it
  rather than founding another on top of it.
- **Small towns.** Off unless **View → Small towns** is ticked: past the zoom
  at which the map's own cities are all shown, some 40,000 more places are
  drawn as small rings with their names, from
  `data/towns.json`, loaded only then: those of more than 40,000 people
  first, then more than 15,000, then every place of 5,000 or more, each
  giving way to the names already on the map. They come from GeoNames
  (through the all-the-cities package), in their Latin-script names, less
  any within a few kilometres of a city the map already has; they are
  scenery and cannot be picked or edited, though the historian can rename
  one (see below). `tools/build-towns.mjs` builds the
  file.
- **Lakes.** Some 3,200 lakes from Natural Earth's detailed lakes (with its
  extra European and North American sets), from about 6 km² up, drawn as
  water over the land and under the borders, each once it is big enough on
  screen to see, with its name in italic once it is bigger still: Lake
  Geneva, the Bodensee, Lake Balaton, the Great Salt Lake. **View → Small
  lakes**, on by default, can leave out every lake under 500 km² (Lake of the
  Ozarks, Burdur), keeping the large ones. `data/lakes.json`
  is loaded once the map is zoomed in a little; `tools/build-lakes.mjs`
  builds it.
- **Rivers.** Natural Earth's rivers, drawn in blue over the countries and
  under their borders: the largest (the Amazon, the Nile, the Yangtze) from
  the whole globe, and smaller ones in nine steps as the map is zoomed in;
  past about 3.5 times zoom a more detailed set, with the smaller rivers and
  more than twice the points per river, is loaded and drawn instead. Their
  names are set in italic beside them, letter by letter, from the largest
  down as the zoom allows, giving way to country and city names. A name is
  tried only at fixed places along its river, every half a name's length in
  kilometres, so it moves with the river as the map pans instead of sliding
  along it, and it keeps the place it had last time while that place is
  still on screen and clear. The letters follow the river smoothed over a few
  letters' width, and a place where the river bends more than a letter can
  follow is passed over, so names are never squeezed into a meander.
  They are left off the whole world, so the map stays clear, and fade in
  between 1.3 and 2.4 times zoom; close up they stay. They can be hidden in
  the View menu.
- **Latitude and longitude.** The lines every 10° are labelled. On the flat
  map, the parallels along its left edge and the meridians along its top, or
  along the edges of the screen once it is zoomed past them. On the globe, a
  meridian and a parallel half way out from the middle of the view carry the
  numbers, the parallel on the side towards the equator; zoomed in so that
  the globe fills the screen, the labels move to the edges as on the flat
  map. They give way to every other name, and can be hidden in the View menu.
- **Scale bar.** Kilometres over miles in the bottom corner, in round lengths
  of 1, 2, or 5 times a power of ten that fit 120 px, true at the centre of the
  view (on the flat map, along the parallel there); in Antique, chequered bars
  with the units spelt out. It can be hidden in the View menu.
- **Zoom.** From a little under the whole globe to 60 times it.
- **Cities.** 3,050 in four sizes. Each is shown from the zoom its size allows.
- **New countries.** A new country takes the name of the first region it
  receives, or of the country it swallows whole. Its capital is picked from
  the cities already in that land, the largest one, unless one of them is a
  capital already. When a country takes another's capital whole, and has a
  capital of its own, the captured one becomes an ordinary city (in the same
  undo step).
- **Subjects.** A country can be the subject of another: a colony,
  dependency, protectorate, or vassal. It keeps its own name and land but
  wears its ruler's colour, and its name on the map carries its ruler's in
  small italic beneath it, as old atlases did: *Isle of Man (UK)*,
  *Greenland (Denmark)*. The country pane's *Subject of* picks the ruler,
  or no one; a country cannot be made a subject of its own subject, and a
  subject whose ruler is dissolved or loses all its land rules itself again,
  in the same undo step, and stays free if its old ruler later regains land.
  The world as it is starts with its dependencies as subjects: the British
  Crown dependencies and overseas territories, the territories of the United
  States, France, the Netherlands, Denmark, Australia, and New Zealand, Hong
  Kong and Macau, and Åland. The historian sees every change of ruler, and
  a redraw can make or free subjects.
- **Undo and redo.** Every edit is a step to undo or redo. A paint stroke is
  one step, and typing a name is one step however many keys it takes.
- **Saving.** The map is kept as its difference from the world as it is:
  - countries renamed, recoloured, or founded, those whose inner borders
    are hidden (`l`), and those whose ruler differs from our world's (`r`,
    each country with its ruler, or -1 for none);
  - the owners of provinces that changed hands whole (`o`), and of the
    second-level units of those that were split (`u`);
  - cities deleted, changed, or added;
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
  - **A layer of its own.** The imagery is drawn on its own canvas beneath
    the map instead of being copied into the map's canvas every frame. Where
    the browser can, it renders into an OffscreenCanvas and hands each frame
    over as an ImageBitmap, which also keeps Chromium from cutting a strip
    off a WebGL canvas under the opaque top bar. The map's canvas leaves the
    imagery uncovered: in Antique it cuts the land out of its sea (one cut per
    colour group, which is far cheaper than one path for the whole world),
    and the parchment wash is done in the shader, with the country tints
    washed to match, so the result is the same as before.
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
    darkened in the dark, and toned sepia in Antique. It is loaded only when the view is first switched
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
- **data/units.json**: the same provinces with 41 countries cut into
  second-level units, 18,374 regions in all, in one topology so that
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
    Czechia (76 districts; Prague stays whole), Myanmar (74 districts), Kenya (46 counties, inside its eight old
    provinces; Nairobi stays whole) and Somaliland (5 regions, those of
    Somalia within its border); a province that is a single unit, such
    as a capital district, stays whole;
  - Egypt is left out: its second level mixes city districts, unnamed desert
    remnants, and misplaced shapes;
  - China's prefectures are regrouped from 1999 county boundaries by name and
    code, so later county splits are missing;
  - disputed areas follow Natural Earth's assignment and are only cut within
    their province;
  - each unit is clipped to the Natural Earth province it falls in, gaps go
    to a neighbour, and all rings are noded against each other before the
    topology is built;
  - borders are snapped to the integer grid in a way that cannot make
    neighbouring borders cross, and the simplification is guarded against
    reversed lobes, stray holes, and self-overlap;
  - it is loaded only when finer regions are switched on, or when a map needs
    them (5.8 MB, about 1.7 MB compressed);
  - `data/units-detail.json` holds the same arcs at six tenths of their
    points, on a grid of 400,000 steps, for the closest zooms (10.4 MB, about
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
- **data/relief-4096.webp**: the terrain layer's shaded relief of the
  whole world, equirectangular, grey with 128 for flat ground and sea, from
  the zoom-5 Terrarium elevation tiles: a soft hillshade lit from the
  north-west with fills from the north and west, plus a broader one so that
  whole ranges read at world scale. Built by `tools/build-relief.mjs`
  (sharp and pngjs). Closer in, the page fetches the same tiles at zoom 6
  to 11 and shades them itself.
- **data/earth-2048.webp**, **data/earth-4096.webp**: NASA Blue Marble Next
  Generation with shaded sea floor, equirectangular. The polar rows and the
  columns at the date line are evened out so that the wrap is seamless, and
  the smaller one is resized across the wrap.
- **vendor/**: d3-array, d3-geo, topojson-client, topojson-simplify, and
  polygon-clipping, unmodified.
- **/fonts/**: IM Fell English, from @fontsource/im-fell-english, with Old
  Standard TT, from @fontsource/old-standard-tt, for the letters it lacks
  (both SIL Open Font License), served from the site like its other typeface.

## Using it

- The bar along the top holds the tools, *New country*, undo and redo, and
  **History** and three menus: **Check**, **File** (copy a link, save a file, open one, start
  over) and **View** (the style, country names, names of seas, lakes, and
  rivers, settlements, small towns, region borders (every line inside the
  countries, both tiers), terrain, rivers, small lakes,
  latitude and longitude, the scale bar, finer regions). History and the
  menus each carry a caret. The bar fits itself to the window by measuring:
  it tries, in turn, one row with the tools' names and the title; one row
  without the tools' names; one row without the title; the tools and *New
  country* above undo and the menus; the tools above *New country* and the
  menus; and each on a row of its own, and keeps the first in which nothing
  overlaps or runs off the edge. It fits again when the window, the style, or
  the Check badge changes. The bar ends in a ruled border drawn like a
  map's: in the Antique style the neat line of an engraved atlas, a heavy
  rule over a graduated band of alternating ink and paper; in Light and Dark
  a hairline with ruler ticks. The border is ruled in from the left as the
  map appears, and its graduations march while the historian is writing.
  While the world loads, a plain cover with *loading the world…* hides the
  map; it stays until the country names are placed and the rivers, the
  terrain, any finer regions, and the satellite view (when on) are in, at
  most eight seconds, then fades away to the map. In the Antique style the
  opening then plays as the cover lifts: the map unrolls from the left like
  a sheet, the header comes down with its rule, and the controls appear.
  On a phone the bottom sheet rises in place of the header, and the box
  with the site's name drops in from the top.
  With nothing selected the bar's second row closes; it opens when something
  is selected, animated where the browser can, and the map does not move. **Terrain**, on by
  default, lays shaded relief over the land, like an atlas, sharper as the
  map zooms in; it is left off under the satellite view. The relief is
  drawn by WebGL on a canvas of its own at half the screen's resolution,
  and at a quarter while the map moves, then laid over each country's fill;
  copying it to the map is the costliest step of a frame, so the smaller
  canvas roughly halves the time a frame takes while dragging. What is
  selected shows in the bar's second row, and a hint for the tool at the
  bottom of the map.
- **History** opens a panel in which a historian of the map's world writes
  how it came to look as it does: the points where its history parted from
  ours, each with a year and a cause, and what followed from them, in three
  to six eras. A note can say where the history begins or what it should
  stress. Every country, region, and city of the map that the history names
  is a link that flies the map to it. Once it is sent, the note or turning
  point stays above its history, in the panel and when a saved history is
  opened again. A history cut short by its length is kept all the same,
  with a note saying so. The last history is kept in the browser, and the panel says
  when the map has changed since.
  - **Redraw the map** takes a turning point instead ("What if Rome never
    fell?", "The world in 1925 if the Central Powers had won"): Claude
    decides how the world's map would stand in the year the turning point
    names, or today, and sends back edits to our world's map in a fixed JSON
    shape (the year, new countries with the ruler of each colony, renames,
    countries made or freed as subjects, regions changing hands, whole
    countries, cities and towns renamed, capitals with their coordinates).
    A map of a past year starts
    from our world's map of that year, with its empires and colonies, and
    colonies are subjects of their rulers. The redraw replaces the map rather than building on it, as one
    step that one undo takes back; the page flies to the land that moved and
    has the historian write how it came to be, with the turning point and
    the year as its note.
  - A redraw is drawn in two steps, because a map of the whole world takes
    Claude longer to write than the server function may run (150 seconds a
    request). First an outline: the year, the title, a short history, the
    new countries, renames, and subjects, and a brief for each part of the
    world whose map changes. The page then asks for every part named in the
    outline at once, each its own request: Western Europe; Eastern Europe
    and Russia; Western and Central Asia; South and East Asia; Africa; North
    America and the Caribbean; South America; and Oceania and Antarctica.
    Each part's mapmaker sees the outline and only its own part's regions,
    and sends back that part's edits. The page draws each part as it
    arrives, redrawing from our world's map with every part so far, so
    colours are chosen with all the neighbours in view; the finished
    redraw is still one step for undo. A part that fails is left as our
    world has it, and the message says which. A part still being written
    when its time is nearly up is cut short at the last complete edit,
    rather than lost.
  - The outline counts once against the daily limits; its parts do not, but
    each part can be asked for only once, and only with the ticket the
    outline came with: a signature over the outline and the turning point,
    good for twenty minutes, that the function checks (`historian_once`
    keeps the parts already drawn). The old one-step redraw still answers,
    for pages loaded before the change.
  - Redraws are asked to be bold: to follow the turning point beyond its own
    region, to let no border drawn after the divergence survive by
    coincidence, and to merge, split, or invent countries, up to about 1,500
    regions moved.
  - Under a history, **Ask the historian more** carries on the conversation:
    each question goes with the history, the questions and answers before
    it, and the map as it now stands, and the historian answers in the same
    voice, inventing where the history was silent.
  - The historian can change the map in the conversation, too: asked for a
    change, or told the map misses something ("you forgot the Balkans"), it
    calls an `edit_map` tool with the same kinds of edits as a redraw, on the
    map as it stands. The page applies them as one step, which one undo takes
    back, flies to the land that moved, and says so; the historian then says
    what it changed. The conversation keeps the changed map as its own.
  - Both can rename cities and towns: a place that changes hands may take
    its new rulers' name for it (Brno under Austria becomes Brünn). Each
    rename names the place as the map has it now, with its longitude and
    latitude; the page renames the city of that name nearest the point,
    within 60 km. A small town from **View → Small towns** becomes a small
    town of the map's own under its new name, in the same place, so it can
    be edited like any other. The small towns start loading as soon as the
    historian is asked, so they are there when its edits come back. A
    capital can be given by a city's old name or its new one.
  - **Saved** lists every history written in this browser (the last 30),
    each with its map, its turning point, and its questions; opening one
    brings back the map it was written for, as one step that undo reverses,
    and carries on its conversation.
  - The panel shows one thing at a time. Reading a history, it shows the
    question asked as a quote, a short note when the map has changed since,
    then the history and the conversation; *New history* in its header opens
    the form alone, with *Cancel* to go back.
  - **What it will not write.** Every request carries the same limits: nothing
    that celebrates, excuses, or calls for genocide, ethnic cleansing, slavery,
    terrorism, or hatred of a people; nothing sexual; nothing aimed at a real
    private person; no slurs, even as names. Wars, empires, and atrocities stay
    fair subjects told with a historian's gravity. Asked for something else,
    the historian declines in a sentence or two, and a redraw comes back
    marked `declined` and changes nothing. The site's
    [terms](https://noahdarwinlee.com/terms/#uchronia) say the same, and its
    [privacy policy](https://noahdarwinlee.com/privacy/#uchronia) says what is
    sent where.
  - Claude names land from `data/catalogue.txt`, every country of our world
    and its regions as the map draws them (250 countries, 3,699 regions),
    built by `tools/build-catalogue.mjs`, which also writes
    `data/parts.json`, the countries in each part of the world (a redraw's
    outline sees only these names, and each part's mapmaker only its own
    lines of the catalogue). The function fetches both from the
    site. For a chat it sends the whole catalogue, unchanged, at the start
    of every request, so it is cached and later requests pay a tenth for it. The page matches names
    without regard to case or accents and leaves out any it cannot find.
  - The page sends a plain list of the map's differences from ours (which
    regions changed hands, countries founded, renamed, or gone, borders drawn
    by hand, cities renamed, moved, or founded) and the note, nothing else, to
    a small server function, `supabase/functions/historian`, which asks
    Claude (claude-opus-5-5, through Anthropic's API) to write it and streams
    the text back. The function holds the API key, answers only this site,
    and allows 250 requests a day in all, and to each visitor 5 histories or
  redrawn maps (a redraw and its history count as two) and 20 questions
    (the per-visitor limits are lifted until 16 October 2026, 05:00 UTC); it
    keeps only a daily count per visitor under a hashed key, never the map or
    the text, and deletes counts older than thirty days.
  - The function and its daily counter (`historian_usage`, with
    `historian_take` and `historian_give_back`, set up by
    `supabase/migrations/20261012_historian_usage.sql`, and `historian_once`,
    set up by `supabase/migrations/20261015_historian_once.sql`) live in the Supabase
    project kigvciyyjlgjcgnwgrwf. The function is deployed as `dynamic-endpoint`
    with JWT verification off (it checks the origin and the daily caps
    itself) and needs the `ANTHROPIC_API_KEY` secret.
- **Check** counts, in a badge, what may have been left by mistake, and
  lists it: cities and countries never renamed from *New city* or *New
  country*, countries founded and given no land, countries that lost their
  capital or gained a second one, two countries with one name, and cities
  dropped in the sea. Picking one goes to it and selects it, ready to rename.
  A fresh map has nothing to fix, and a country just founded is left out
  until it is let go, so the count does not rise while it is being made.
- The **ⓘ** button by the title opens a short note on the map, a link that
  opens History, its keys, and links to its sources; a second click closes it.
- Buttons explain themselves in a tooltip drawn in the page's style (its
  type, colours and, in Antique, its paper), shown after a moment's hover or
  on keyboard focus, never on a touch screen; the same words are given to
  screen readers as the button's description.
- **Select (V)**: click a country to rename or recolour it, make it a
  subject of another, show or hide its
  regions' lines (*Tier 1*, the lines between its states, provinces, and
  regions; *Tier 2*, the finer lines inside them; a tier it has none of is
  greyed out, and hidden tiers stay hidden inside land drawn for it). With
  *Finer regions* off, *Tier 2* loads the finer regions and draws the counties
  and districts of that country alone, for display only, until *Finer
  regions* is switched on or off again; it is offered only for the 40
  countries that have finer regions. With *Finer regions* on, a country whose
  *Tier 2* is hidden is painted, named, and counted by its first-level regions
  again; give it
  land or dissolve it; click a city to rename it, change its size, or delete
  it, and once it is picked, drag it to move it.
- **Give land (B)**: one tool for moving borders. Its pane says who gets
  the land (the chosen country, shown with its colour, or *Unclaimed*) and
  how it is taken:
  - *Regions*: click or drag over regions; clicking land drawn by hand gives
    the whole region under it, and cuts that region out of the drawing;
  - *Whole countries*: click a country to give all of it;
  - *Lasso* (D): drag round any land, across region lines; on a phone, draw
    with one finger and move the map with two.
    Drawn land that no longer changes anything (given back to the country
    that holds the land under it, or left as a sliver thinner than about
    100 m by a later edit) is removed in the same step, so no stray lines or
    thin coasts stay behind.

  Alt-click picks the country to give land to.
- **Settlements (C)**: click to found a city; click one to pick it, then drag
  it to move it (a drag on a city that isn't picked moves the map). A picked
  settlement can be a capital, a city, a town, or a small town; small towns
  show only close up, with the smallest mark.
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
  the sheet up for the rest. In a desktop window as narrow as a phone, the
  sheet's handle can be dragged with a mouse or trackpad too.

## Tests

The page was driven with Playwright during development; those scripts are not
in the repo. They covered:
- selecting, renaming, recolouring, painting regions and whole countries, and
  unclaiming;
- founding and dissolving countries, region names and capitals, and cities;
- undo and redo, including across start-over and file steps;
- reloading, links (including hostile ones), files and starting over;
- the flat map: picking, painting, zooming at the cursor, panning up to its
  edges, and dragging cities;
- finer regions: switching them on and off, painting single counties,
  undoing paint from before the switch, reloading, and sharing;
- region groups: Slovenia's statistical regions and Italy's regions painted
  whole, named, made countries, and split again with finer regions on;
- drawn land: drawing, overlapping drawings, painting and removing them,
  making one a country, areas, the date line, the flat map, the satellite
  view, saving, links, and drawing by touch;
- hiding country and city names, and the detailed borders up close;
- the top bar and its menus, the three styles, curved names, the hidden
  interface, and keyboard focus;
- inner borders hidden and shown per country, saved, linked, and undone;
  cities picked before they move; the scale bar and the zoom limit;
- rivers loading, and the latitude and longitude labels on the globe, the
  flat map, and zoomed in, hidden and remembered;
- the Check menu (a clean map, a forgotten city and country, going to one and
  renaming it), the greyed-out inner borders, rivers fading out up close, and
  Antique's two-tone sea with the satellite view on;
- a hidden capital picked by the Settlements tool, the about note opening and
  closing, the latitude and longitude labels thinning out on the whole flat
  map, and the phone's larger buttons;
- the themed tooltips (delay, placement, keyboard focus, Escape, the three
  styles, none on a phone), the bar keeping one height whatever is selected,
  and giving a region back out of land drawn by hand, with undo and redo;
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
  - Kazakhstan, Russia, Iran, Saudi Arabia, and Algeria © OpenStreetMap
    contributors, and India (Pathways Data) and Ethiopia (Open Africa) under
    the same licence: ODbL 1.0, so those parts of `data/units.json` and
    `data/units-detail.json` are under the ODbL too (geoBoundaries lists the
    Saudi and Algerian extracts as CC BY-SA 2.0, but they are OpenStreetMap
    data from 2021, so OpenStreetMap's own licence is the one that applies);
  - Brazil's municipal boundaries from IBGE through OCHA ROLAC (CC BY 3.0
    IGO), merged by IBGE's region table;
  - Australia © Australian Bureau of Statistics (CC BY 4.0);
  - Argentina, Indonesia, Mongolia, Sudan, Mauritania, Peru, Chad,
    Mozambique, Tanzania, and Madagascar from their national agencies through
    OCHA and its partners (CC BY 3.0 IGO); Mali (CC BY 4.0) and Zambia (GRID3,
    CC BY 4.0); Niger (CC BY 3.0); Bolivia (GeoBolivia) and Angola (Wikimedia
    Commons) in the public domain;
  - Austria © BEV, Federal Office of Metrology and Surveying (CC BY-SA 2.0,
    so Austria's part of the units files is under CC BY-SA too); Belarus from
    CIESIN's Gridded Population of the World (CC BY 3.0); Kenya from RCMRD
    (public domain); Malaysia from City Population (CC BY 3.0); Mexico from
    the World Bank (CC BY 4.0); Myanmar from the Myanmar Analytics Project
    and USAID (CC BY 4.0); Ukraine and Czechia from Wikimedia Commons (public
    domain);
    Poland and Somaliland © OpenStreetMap contributors (ODbL 1.0);
  - Pakistan, and all of them gathered, from geoBoundaries (Runfola et al.,
    PLoS ONE 15(4): e0231866, 2020).

  The `sources` list in `data/units.json` has the links.
- **Cities and towns:** GeoNames (CC BY 4.0), the towns through the
  all-the-cities package by Zeke Sikelianos (MIT).
- **Lakes:** Natural Earth (public domain).
- **Satellite view:** NASA Earth Observatory, Blue Marble Next Generation by
  Reto Stöckli, and NASA's Global Imagery Browse Services (public domain).
- **Terrain:** Terrain Tiles on the Registry of Open Data on AWS, by Mapzen:
  ArcticDEM (DigitalGlobe imagery, NSF awards 1043681, 1559691, 1542736);
  © Commonwealth of Australia (Geoscience Australia) 2017; © offene Daten
  Österreichs – DGM Österreich; Open Government Licence – Canada; Copernicus
  EU-DEM; ETOPO1 (NOAA); INEGI Continental relief 2016; © Crown copyright
  LINZ (New Zealand) 2011; © Kartverket; © Environment Agency 2015; USGS 3DEP
  (NED), GMTED2010 and SRTM.
