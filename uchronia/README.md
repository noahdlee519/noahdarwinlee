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
    On a device too slow to keep up while the map moves, it draws one level
    coarser while it moves and the full level again once it settles (it
    used to stay coarse until the page was reloaded). When frames come more
    than 24 ms apart four times running while the map moves, it also draws
    at half resolution (and no finer region lines) while it moves, for the
    rest of the visit, and sharp again as soon as it stops; on a sharp
    (2x) screen that is a quarter of the pixels.
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
    still be chosen by hand. Our world's countries open in the colours of a
    reference map Noah chose: `BASE_COLORS` in `app.js` gives 125 of them
    their colour by code (Canada pale lime, the United States periwinkle,
    Mexico pink, Brazil and Russia mint, China salmon, and so on), read off
    a screenshot of the flat map by sampling each country on a half-degree
    grid. The rest, and any country whose given colour a neighbour already
    holds, are coloured as before. CHRONIA's states of 2019 take the same
    colours.
  - **Styles.** *Light* is black on white and *Dark* white on black; both
    follow the site's theme, which they also set (the site's orange and white
    themes both open *Light*). *Antique*,
    the style a first visit opens in, is drawn like a hand-coloured map of
    the 1800s:
    - parchment and sepia ink, with a paper grain on the bar, the menus, and
      the buttons;
    - pale washes inside each country, with a stronger band of its colour
      along its borders and coasts (the arcs on its edge, stroked twice as
      wide and clipped to the country, and thinner on a small map); the
      colour buttons show the same wash and band. When borders drawn by hand
      are on screen, every band is first painted at full strength on a layer
      of its own, where bands that meet cover one another, and the layer is
      laid on the map once at the bands' transparency, so two bands meeting
      never darken each other; The eighth colour is a
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
  - On the globe, names are painted onto the sphere. Each is laid out on a
    small map of the land round it whose grid follows the parallels and
    meridians (a straight name runs along its parallel, a turned one at its
    angle across them, and a bent one along its arc), and each letter is
    carried onto the globe with its own position, turn, and stretch, so names
    tilt, curve, and foreshorten with the lines of latitude and longitude
    beneath them. A name that would read upside down runs the other way. The
    flat map sets names flat as before.
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
  - *Move its name*, in the country pane, steps through other places for the
    name, up to eight in all, and back to the first. In Antique the second is
    the first set straight. The rest are the other layouts and angles tried
    above, the nearest place to each of eight points around the piece
    (left, right, above, below, and the four corners) where a name at least
    55% of the size that fits there will go, and the two next largest pieces
    within 2,500 km of the name. Places smaller than two fifths of the
    largest, places that overlap another country's land, and places close
    to one already listed are left out. Presses in quick succession are one
    undo step.
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
  more than twice the points per river, is loaded and drawn instead. Where
  a lake is drawn, the rivers are cut out of it, so a river that runs
  through a reservoir stops at its shore and starts again past it. Their
  names are set in italic beside them, letter by letter, from the largest
  down as the zoom allows, giving way to country and city names. A name is
  tried only at fixed places along its river, every half a name's length in
  kilometres, so it moves with the river as the map pans instead of sliding
  along it, and it keeps the place it had last time while that place is
  still on screen and clear. While the map is moving (a drag, a zoom, a
  glide), no name looks for a new place: each stays at the same point on its
  river, found again on the next set of rivers when the zoom changes set, or
  is left out until the map settles, when every name may choose afresh. The
  letters follow the river smoothed over a few
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
    are hidden (`l`), those whose ruler differs from our world's (`r`,
    each country with its ruler, or -1 for none), those whose name was
    moved (`n`, each country with the place it was moved to), and disputes
    (`d`, each dispute with its claimants);
  - the owners of provinces that changed hands whole (`o`), and of the
    second-level units of those that were split (`u`);
  - cities deleted, changed, or added;
  - drawn land (`h`): each drawing's owner and outline, in ten-thousandths of
    a degree, each ring stored as differences from the point before.

  That difference goes to `localStorage` after every edit (and at once when
  the page is hidden or closed), into a link ("Copy link": deflate-raw through
  `CompressionStream`, then base64url, in `#m=`), or into a file ("Save file",
  JSON). Under "Copy link", "Post to r/uchronia" opens the map's subreddit,
  [r/uchronia](https://www.reddit.com/r/uchronia/), in a new tab, where a
  copied link can be posted.
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
  - The place list had Ironville, Kentucky, a community of 782 people, at
    288,649, which made it a city on the map. The list now gives 782, and the
    map's entry for it was replaced in place, at the same index so saved maps
    still line up, by Huntington, West Virginia (49,000), the nearby city it
    had crowded out; Huntington left the small towns' list.
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
  **Historian** and three menus: **Check**, **File** (copy a link, save a file, open one, start
  over, the tutorial) and **View** (the style, country names, names of seas, lakes, and
  rivers, settlements, small towns, region borders (every line inside the
  countries, both tiers), terrain, rivers, small lakes,
  latitude and longitude, the scale bar, finer regions). Historian and the
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
- **The tutorial** is a tour of fourteen short cards that a first-time visitor
  sees once the map has appeared (after the Antique opening, about 3.3
  seconds in; otherwise just under a second). It is not shown to a visitor
  returning from Google sign-in, or while the historian is open. Each card
  names a part of the page and what it does: the map controls, Select, Give
  land, Settlements, *New country*, undo, Historian, Check, File, and View,
  between a welcome and a closing card. Two more after Historian open its
  panel: one rings the turning point's details, the other *Saved* (for
  asking more, the historian's edits, and saved histories); the panel closes
  again when the tour moves on or ends, and on a wide screen those cards sit
  to the left of the panel. The part in question is ringed in
  the selection colour, and the rest of the page is dimmed but stays usable;
  a card with nothing to ring sits in the middle of the window. The card
  goes below the part it describes, or above or beside it where there is no
  room. On a phone it sits at the top of the screen, and the sheet opens
  and scrolls so that the part shows below it, going back to how it was when
  the tour ends. *Skip the tour*, the last card's *Start*, or Escape ends it,
  and ← and → step through it while the card has the focus. Once ended it is
  not shown again (`localStorage["uchronia-tour"]` is `done`), and
  **Tutorial** in the File menu opens it at the start.
- **Historian** opens a panel in which a historian of the map's world writes
  how it came to look as it does: the points where its history parted from
  ours, each with a year and a cause, and what followed from them, in three
  to six eras. A note can say where the history begins or what it should
  stress. Every country, region, and city of the map that the history names
  is a link that flies the map to it. Once it is sent, the note or turning
  point stays above its history, in the panel and when a saved history is
  opened again. A history cut short by its length is kept all the same,
  with a note saying so. The last history is kept in the browser, and the panel says
  when the map has changed since.
  - While the historian writes or redraws, the panel lists its steps (done,
    now, to come: reading the map or the turning point, researching, drawing
    the borders with a count of the parts, placing them, writing), a line
    under them says what it is doing at that moment, and a thin bar beneath
    fills as it goes. Writing, the
    line names the section being written and the bar follows the word count
    (a history runs 600 to 1,000 words). Redrawing, the line follows the
    outline and then each part of the world as its mapmaker works ("Western
    Europe: Giving Passau to Austria"), from `peek` events the server function
    streams while the JSON is written (`{t: "peek", v, n}`: what the newest
    finished entry does, and how many characters are written); the bar counts
    the parts drawn and how far along each is. Between events, and with a
    server that sends none, the bar creeps on and the line steps through a
    few stock phrases.
  - **Redraw the map** takes a turning point instead ("What if Rome never
    fell?", "The world in 1925 if the Central Powers had won"), with
    optional details under it: when history parts from ours, the year to
    show, places to focus on, what to leave as in our world, how far it goes
    (*Close to history*, *Bold*, the historian's usual, or *Wild*), and
    whether to draw borders by county and district. The page sends them
    after the question as a labelled list ("Details from the mapmaker:"),
    which the server function's outline and plan prompts tell Claude to
    follow; above the history the question shows on its own, with the
    details in a short line beneath. Notes and premises may be up to 1,500
    characters. Claude
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
  - The outline counts once against the daily limits; its parts and the
    history written after it do not, but
    each part can be asked for only once, and only with the ticket the
    outline came with: a signature over the outline and the turning point,
    good for twenty minutes, that the function checks (`historian_once`
    keeps the parts already drawn, and the one history the ticket pays for). The old one-step redraw still answers,
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
  - In Europe (all but Latvia and Slovenia, whose regions are already
    municipalities, and Russia) and in the United States, Canada, and Mexico
    the catalogue also lists, in square brackets after a region and
    separated by " | ", its smaller parts: the districts, counties, and
    municipalities of Germany, Austria, Poland, Czechia, Belarus, Ukraine,
    the United States, Canada, and Mexico from the finer regions, and the
    provinces inside the regions of Italy, Malta, North Macedonia, and
    Kosovo (7,488 parts in all). Elsewhere in Europe the regions are already
    the smallest the map has. The function takes the brackets out before it
    sends the catalogue, so the parts cost nothing until they are wanted: in
    a conversation the historian has a second tool, `region_parts`, that
    returns the parts of the regions it names, and then names a part in
    edit_map as "Bavaria / Passau" to move only that part. In a redraw, the
    mapmakers for Western and Eastern Europe always get their parts, which
    cost little (about 3,000 and 5,300 tokens), and are told to name parts
    only where a border cuts through a region. North America's parts (about
    32,000 tokens of counties and municipalities) go to its mapmaker only
    when the outline's `detail` is true, which the historian sets only when
    the turning point explicitly asks for borders by county, municipality,
    or district; other parts of the world get regions alone. A province is found at once; a district needs the finer
    regions. If *Finer regions* (Tier 2) are switched off in the View menu,
    the panel asks before using them: *Turn them on* switches them on and
    applies the edit; *Keep them off* leaves those districts where they were.
    The same question comes up when the historian edits the map in a
    conversation. The list of changes sent with later requests names the
    districts that moved ("part of Bavaria (Passau)").
  - The page sends a plain list of the map's differences from ours (which
    regions changed hands, countries founded, renamed, or gone, borders drawn
    by hand, cities renamed, moved, or founded) and the note, nothing else, to
    a small server function, `supabase/functions/historian`, which asks
    Claude (claude-opus-5-5, through Anthropic's API) to write it and streams
    the text back. The function holds the API key, answers only this site,
    and allows 250 requests a day in all, and to each account 5, counting
    histories, redrawn maps (a redraw and its history count as one), and
    questions alike; it keeps only a daily count per account under a hashed
    key, never the map or the text, and deletes counts older than thirty
    days. When an account has used its five, the message says so in red;
    when the site as a whole has, the message says the historian has done
    all it can.
  - Using the historian needs a Google sign-in, the same Supabase sign-in
    citylayoutguessr uses. Signed out, the Historian panel offers *Sign in
    with Google* and its buttons are disabled; saved histories can still be
    read. The button goes to Supabase's `/auth/v1/authorize` and comes back to
    `/uchronia/?historian` with the session in the address's fragment, which
    the page keeps in `localStorage` (`uchronia-auth`), clears from the
    address, and answers by opening the panel. Signed in, the panel shows the
    account's email, how many requests are left today, and *Sign out*. Every
    request carries the access token; the function checks it with Supabase
    (`/auth/v1/user`) and answers 401 without one. A token about to expire is
    renewed through the function itself (`mode: "refresh"`), so the page
    needs no Supabase key of its own, and `mode: "me"` returns the count
    left.
  - The function and its daily counter (`historian_usage`, with
    `historian_take` and `historian_give_back`, set up by
    `supabase/migrations/20261012_historian_usage.sql`, and `historian_once`,
    set up by `supabase/migrations/20261015_historian_once.sql`) live in the Supabase
    project kigvciyyjlgjcgnwgrwf. The function is deployed as `dynamic-endpoint`
    with JWT verification off (it checks the origin, the sign-in, and the
    daily caps itself) and needs the `ANTHROPIC_API_KEY` secret. Supabase's
    Authentication settings must list `https://noahdarwinlee.com/uchronia/**`
    among the redirect URLs.
- **Check** counts, in a badge, what may have been left by mistake, and
  lists it: cities and countries never renamed from *New city* or *New
  country*, countries founded and given no land, countries that lost their
  capital or gained a second one, two countries with one name, and cities
  dropped in the sea. Picking one goes to it and selects it, ready to rename.
  A fresh map has nothing to fix, and a country just founded is left out
  until it is let go, so the count does not rise while it is being made.
- The **ⓘ** button by the title opens a short note on the map, a link that
  opens Historian, a link to r/uchronia, its keys, links to its sources, and,
  after Privacy and Terms, a DONATE button that opens
  [ko-fi.com/noahdarwinlee](https://ko-fi.com/noahdarwinlee) in a new tab; a second click closes it.
- Buttons explain themselves in a tooltip drawn in the page's style (its
  type, colours and, in Antique, its paper), shown after a moment's hover or
  on keyboard focus, never on a touch screen; the same words are given to
  screen readers as the button's description.
- **Select (V)**: click a country to rename or recolour it, make it a
  subject of another, move its name, show or hide its
  regions' lines (*Tier 1*, the lines between its states, provinces, and
  regions; *Tier 2*, the finer lines inside them, such as counties and
  districts; a tier it has none of is greyed out). The two buttons override
  the View menu for that country: each shows whether that tier is on there,
  and a click turns it the other way whatever *Region borders* and *Finer
  regions* say, loading the finer regions first if they are needed. When a
  click brings a country back in line with the View menu, it follows the
  View menu again. Each country keeps this in `lines`: 1 and 2 hide Tier 1
  and Tier 2, and 4 and 8 show them; the setting is part of the map, saved
  and shared with it, and one undo step. A country with Tier 2 shown is
  painted, named, and counted by its finer regions even with *Finer regions*
  off, and one with Tier 2 hidden by its first-level regions; the tiers
  also apply inside land drawn for the country. Give it
  land or dissolve it; click a city to rename it, change its size, or delete
  it, and once it is picked, drag it to move it. A country founded on the
  map, by hand or by the historian, has *Delete* in place of *Dissolve*:
  its land is left unclaimed and it leaves the lists, and undo brings it
  back. The *Choose a country* list, and the lists for a subject's ruler
  and for a disputed region's claimants, hold every country with land and
  every country founded on the map, with land or not, until it is deleted.
  A country the historian founds is kept even when none of the land it was
  meant to get could be found.
- **Give land (B)**: one tool for moving borders. Its pane says who gets
  the land (the chosen country, shown with its colour, *Disputed*, or
  *Unclaimed*) and how it is taken:
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

  *Disputed* gives land to no one country but to a dispute between two or
  more claimants, like the Siachen Glacier between India and Pakistan. The
  pane lists the claimants under *Between*: the country chosen before is
  the first, others are added from *add a country* or by clicking (or
  Alt-clicking) them on the map, and a claimant is taken off by clicking its
  name. Disputed land is striped in the claimants' colours, has no name of
  its own on the map, and says who disputes it when picked with Select. Each
  set of claimants is one dispute, kept as a country with a `claims` list
  that is left out of the country lists, the Check menu, and colouring; it
  is created in the same undo step as the first land given to it. A dispute
  whose claimant is dissolved keeps the colours of those that remain. The
  historian is told which land is disputed and between whom. The world as it
  is starts with one dispute: the Siachen Glacier, which Natural Earth
  draws apart from both India and Pakistan, is disputed between the two
  (`DISPUTED_BY` in `app.js`). Land made disputed between the same
  claimants joins it, and hovering it reads *Siachen Glacier, disputed
  between India and Pakistan*.
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
- the phone sheet, and both themes;
- the tutorial: shown once on a first visit, after the Antique opening and
  without it, every card's ring and placement in the three styles and on a
  phone (with the sheet opening and scrolling), Escape, the arrow keys,
  focus coming back, and opening it again from the File menu.

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
