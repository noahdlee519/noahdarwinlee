# Portfolio as an imaginary map

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
  - Under it, a row of scrolling chips that highlight groups of countries (e.g. Maps, Language, Finance, Writing, and Clubs; the groups are Noah's to confirm).
  - A round floating button at the right that switches to the next world (in place of the reference's layers button).
  - A bottom sheet with a drag handle: collapsed it shows the world's name or the selected project's name; dragged up it shows the project panel.
  - A bottom tab bar in place of the rail: Explore (the map), Saved, Resume, and About (with contact).
  - The footer strip's links and scale bar move into the sheet's collapsed view and the map's corner.

UI text uses the serial comma and `|` separators, never `·` or round bullets (repo CLAUDE.md).

## The projects (countries)

Flagship (large mainland countries): CHRONIA, LoreTour, UCHRONIA, Fuzhounese Dictionary, Leggio, GREATERCIRCLE, Dealdesk.

Flagship sizes are ranked in that order (Noah's call): CHRONIA is the largest country, Dealdesk the smallest flagship.

Smaller (islands, city-states, small territories): citylayoutguessr, Flash Card Tool, 100 Architects of the Modern Era, Things to Do in New York City, Things to Do in Chicago, and, in place of a single "Miscellaneous" country, each entry on the current Miscellaneous page as its own: Expositions Magazine, Night of Ideas, Substack, UCGEO, Drill the canon, and Dragonfly Agency. That makes 18 countries.

Dealdesk has provinces for its tools (Rollmap, Screener, Closebook, and LBOmatic), drawn with internal borders; search finds them, and clicking one opens Dealdesk's panel at that tool (Noah's call).

The list, each project's tier and rank, blurb, links, and media live in one data file the page reads. Blurbs and links come from the current `portfolio/index.html`, `projects/index.html`, `miscellaneous/index.html`, and `portfolio/<project>/` pages; screenshots from `art/web/materials/`.

## The worlds

Twenty, named by surname: Le Guin, Asimov, Butler, Herbert, Bradbury, Clarke, Dick, Heinlein, Gibson, Banks, Lem, Atwood, Jemisin, Delany, Vonnegut, Verne, Wells, Shelley, Tiptree, and Chiang.

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
| Water (seas, lakes, rivers) | `#89d1e2`, rivers and coasts in `#4da9bb` |
| Country borders | `#26262a` solid; province borders `#606266` dashed |
| Labels | `#26262a`, with a pale halo |

- The classes come from the generator's elevation, moisture, and temperature (latitude), so forests, deserts, steppe, and snow fall where a real world would put them. The land is patchy at class edges, as on the reference, rather than smooth gradients.
- Noah's orange and blue appear only as accents: the heart and favourite buttons, the selected country's highlight, and small interface accents. The map itself stays in the land-cover palette.
- The relief image becomes the land-cover image (with at most a faint hillshade); the vectors draw water, borders, rivers, and labels over it.
- No Night version for now; the page keeps one light map whatever the site's theme.

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
