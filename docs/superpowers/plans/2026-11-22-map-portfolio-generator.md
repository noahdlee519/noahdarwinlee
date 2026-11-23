# Portfolio map: world generator Implementation Plan

> **Moved, 23 November 2026:** the page now lives at `projects/` (`/projects/`), replacing the old projects page, which moved to `projects/classic/`. Read `portfolio-map/` below as `projects/`; `/portfolio-map/` redirects there.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Node script that makes the twenty imaginary worlds for the portfolio map (land cover, water, rivers, borders, provinces, and labels) from the project list, plus contact sheets for Noah to review.

**Architecture:** A seeded, dependency-free pipeline in `tools/worlds/`: noise → elevation and landmasses → climate and land cover → rivers and lakes → countries from cells (sized by tier and rank) → label placement → output (one vector JSON and one palette PNG per world). The page (a later plan) draws the PNG under the vectors. Contact sheets are rendered from the same outputs to PNG with `@resvg/resvg-js` (already a dependency).

**Tech Stack:** Node 22 ESM, `node:test`, `node:zlib` (PNG encoding), `@resvg/resvg-js` (contact sheets only). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-22-map-portfolio-design.md`

## Global Constraints

- Twenty worlds, named and seeded in this order: Le Guin, Asimov, Butler, Herbert, Bradbury, Clarke, Dick, Heinlein, Gibson, Banks, Lem, Atwood, Jemisin, Delany, Vonnegut, Verne, Wells, Shelley, Tiptree, Chiang.
- All land is project land: no unowned land cell in any world.
- Flagship countries are mainland countries ranked by size: CHRONIA > LoreTour > UCHRONIA > Fuzhounese Dictionary > Leggio > GREATERCIRCLE > Dealdesk. Small countries are islands, city-states, and small territories.
- Dealdesk has four provinces: Rollmap, Screener, Closebook, LBOmatic.
- Adding a project = one entry in `portfolio-map/projects.json` and a rerun; seeds are fixed per world name, parameters derived from the project list.
- Land-cover colours exactly: dense forest `#a2debe`, woodland and shrub `#b3e3cc`, grassland and farmland `#c4ead7`, dry grass and steppe `#f3efe4`, desert and bare ground `#faf7f3`, rock and high mountain `#cbcfca`, snow and ice `#ffffff`, water `#89d1e2`, rivers and coasts `#4da9bb`, country borders `#26262a` solid, province borders `#606266` dashed, labels `#26262a` with a pale halo.
- Per world, vector JSON plus PNG ≤ about 300 KB together.
- Determinism: the same project list and world name give byte-identical output.
- UI text: serial comma; `|` separators, never `·`.

## Review Focus

- Adding a 19th project (or removing one) must still produce twenty valid worlds with no unowned land and the flagship size order intact.
- A long project name (e.g. "100 Architects of the Modern Era") must still get a label that fits inside its country without overlapping another label, at some zoom level within the page's 4× limit.
- No country may be split into disconnected pieces except small countries placed on archipelagos by design; a flagship is one contiguous mainland piece.
- Rivers must flow downhill to the sea or a lake and never cross a sea; lakes sit in basins.
- Worlds must not look like the same world twenty times: landmass count, layout, and climate must vary.

---

## File structure

- `portfolio-map/projects.json`: the project list (id, name, tier `"flagship"|"small"`, `rank` for flagships, optional `provinces: [{id, name}]`).
- `tools/worlds/rng.mjs`: seeded RNG and 2-D noise (fBm, domain warp).
- `tools/worlds/terrain.mjs`: elevation grid, landmasses, sea level for a target land share.
- `tools/worlds/climate.mjs`: temperature (latitude and elevation), moisture (prevailing wind and rain shadow), and land-cover class per pixel.
- `tools/worlds/hydro.mjs`: flow directions, accumulation, rivers (as polylines), and lakes.
- `tools/worlds/political.mjs`: cells, landmasses → countries (sized by tier and rank), Dealdesk provinces.
- `tools/worlds/labels.mjs`: label placement (countries, provinces, seas, ranges, a few towns) with collision tests.
- `tools/worlds/output.mjs`: vector JSON (simplified, quantized paths) and the indexed-palette PNG encoder.
- `tools/worlds/generate.mjs`: CLI: `node tools/worlds/generate.mjs [--world "Le Guin"] [--out portfolio-map/worlds]`; writes `<slug>.json`, `<slug>.png`, and `index.json`.
- `tools/worlds/contact.mjs`: CLI: renders `portfolio-map/worlds/contact-*.png` (four or five worlds per sheet, labelled).
- `tools/worlds/test/*.test.mjs`: tests, run with `node --test tools/worlds/test/`.

## Interfaces (shared by the tasks)

- `makeRng(seed: string) => { next(): number /* [0,1) */, int(n): number, pick(arr) }`
- `makeNoise(rng) => (x: number, y: number) => number /* [-1,1] */`
- `buildTerrain({ rng, width, height, landShare, masses }) => { elev: Float32Array, land: Uint8Array, seaLevel: number }`
- `buildClimate({ elev, land, width, height, rng }) => { cover: Uint8Array /* class index 0..6, 255 = water */ }`
- `buildHydro({ elev, land, width, height }) => { rivers: [[x,y][]], lakes: Uint8Array }`
- `buildCountries({ land, elev, width, height, projects, rng }) => { owner: Int16Array /* project index per pixel, -1 sea */, provinces: Int16Array, capitals: {id, x, y}[] }`
- `placeLabels({ owner, provinces, projects, width, height, rng, extras }) => { id, text, x, y, size, angle, minZoom }[]`
- `writeWorld({ name, slug, width, height, cover, owner, provinces, rivers, lakes, labels, projects }, outDir) => { jsonBytes, pngBytes }`
- World JSON (what the page will read): `{ name, slug, width, height, palette, projects: [{ id, path, provinces?: [{ id, path }] }], coast: path, lakes: path, rivers: [{ path, width }], labels: [...], scale: { kmPerUnit } }`, with paths as SVG path strings in world units.

## Tasks

### Task 1: Project list and seeded noise
- Create `portfolio-map/projects.json` with the 18 projects (7 flagships in rank order; citylayoutguessr, Flash Card Tool, 100 Architects of the Modern Era, Things to Do in New York City, Things to Do in Chicago, Expositions Magazine, Night of Ideas, Substack, UCGEO, Drill the canon, Dragonfly Agency as small), Dealdesk's four provinces. Links and blurbs are the page plan's job; ids and names only here.
- Implement `rng.mjs`. Tests: same seed gives the same first 1,000 values; different seeds differ; noise is continuous (|n(x)−n(x+ε)| small) and spans roughly [-1,1].
- Commit.

### Task 2: Terrain
- Implement `buildTerrain`: fBm plus domain warp, shaped by 1 to 4 continental masses placed by the rng, sea level chosen so the land share hits `landShare` (derived from the project count so 18 countries have room: about 0.30 to 0.40 of the map). Map aspect 2:1, world grid about 1600×800.
- Tests: land share within ±0.02 of target; at least one landmass large enough for all flagships; determinism.
- Commit.

### Task 3: Climate and land cover
- Implement `buildClimate`: temperature from latitude and elevation; moisture from a prevailing wind with rain shadows behind ranges; class by thresholds into the seven land-cover classes; break class edges into patches (noise-jittered thresholds) as on the reference.
- Tests: snow only at high elevation or high latitude; desert and steppe present in at least some worlds and absent from the wettest; every land pixel has a class.
- Commit.

### Task 4: Rivers and lakes
- Implement `buildHydro`: fill depressions (priority flood), flow directions, accumulation; rivers where accumulation passes a threshold, traced to sea or lake; lakes in some filled basins; rivers widen downstream.
- Tests: every river ends at sea or a lake; elevation along a river never rises; no river point lies in the sea.
- Commit.

### Task 5: Countries and provinces
- Implement `buildCountries`: grow countries from seeds by weighted flood fill on land (cost from elevation and rivers so borders tend to follow ranges and rivers). Flagship areas proportional to weights decreasing by rank (e.g. 1.0 for CHRONIA down to about 0.45 for Dealdesk); small countries take islands, peninsulas, and coastal city-states. Every land pixel gets an owner; islands with no project merge into the nearest country. Split Dealdesk into its four provinces the same way.
- Tests: no unowned land; flagship areas strictly decreasing in rank order; each flagship contiguous; Dealdesk's four provinces each non-empty and inside Dealdesk; with a 19th test project added, all of these still hold.
- Commit.

### Task 6: Labels
- Implement `placeLabels`: for each country, find the widest interior span (pole of inaccessibility and principal axis), set size and slight curve or angle, and try candidates until no collision; give each a `minZoom` (1 to 4) at which it fits. Province names at `minZoom` ≥ 2; seas, ranges, and a few towns as extras with invented names (towns small, at zoom ≥ 2).
- Tests: every country gets a label with `minZoom ≤ 4`; no two labels sharing a zoom overlap; labels sit inside their country.
- Commit.

### Task 7: Output, CLI, and contact sheets
- Implement `output.mjs` (path tracing from the owner grid, Douglas–Peucker simplification, coordinates rounded to 0.1; indexed PNG with the land-cover palette and a faint hillshade only if it fits the budget) and the two CLIs. `index.json` lists the twenty worlds in order with slug and name.
- Contact sheets: draw each world with its vectors and labels over the PNG at zoom 1, titled with its name.
- Tests: output for Le Guin is byte-identical across two runs; each world's JSON plus PNG ≤ 300 KB; `index.json` has 20 entries in the order above.
- Run the full generation and the contact sheets; commit outputs and sheets.
