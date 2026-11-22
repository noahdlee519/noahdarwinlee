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
- **Phones:** the panel becomes a bottom sheet dragged up over the map, and the rail becomes a row in the sheet's header.

UI text uses the serial comma and `|` separators, never `·` or round bullets (repo CLAUDE.md).

## The projects (countries)

Flagship (large mainland countries): Dealdesk, CHRONIA, LoreTour, UCHRONIA, Fuzhounese Dictionary, Leggio, GREATERCIRCLE.

Smaller (islands, city-states, small territories): citylayoutguessr, Flash Card Tool, 100 Architects of the Modern Era, Things to Do in New York City, Things to Do in Chicago, Miscellaneous.

The list, each project's tier, blurb, links, and media live in one data file the page reads, so adding a project is one entry. Blurbs and links come from the current `portfolio/index.html`, `projects/index.html`, and `portfolio/<project>/` pages; screenshots from `art/web/materials/`.

## The worlds

Twenty, named by surname: Le Guin, Asimov, Butler, Herbert, Bradbury, Clarke, Dick, Heinlein, Gibson, Banks, Lem, Atwood, Jemisin, Delany, Vonnegut, Verne, Wells, Shelley, Tiptree, and Chiang.

- **Generator:** a Node script in the repo, run by hand. It writes one compact vector file per world (coasts, lakes, rivers, country borders, label positions) and one soft relief image (mountains and forest shading).
- **Countries:** grouped from small cells, sized and placed by tier. In each world the projects land in different places and shapes.
- **Labels:** placed by the generator, inside their countries, without overlaps.
- **Review:** all twenty are rendered and shown to Noah as contact sheets before the page uses them; any he dislikes is regenerated.
- **Rotation:** a load shows the next world after the one this visitor last saw (stored in the browser); a first visit starts at a random one. `?world=<name>` opens a given world (used by Share).

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
