// The twenty worlds, and the pipeline that makes one.
//
// A world's seed is its name. Its character (how the land is laid out, where
// it sits between the poles, how wet it is) is set here per world, so the
// twenty differ on purpose; its sizes (land share, country areas) come from
// the project list, so adding a project and rerunning gives the same twenty
// worlds with one more country in each.

import { makeRng, clamp } from './rng.mjs';
import { buildTerrain } from './terrain.mjs';
import { buildFields, classifyCover, findOases } from './climate.mjs';
import { buildHydro } from './hydro.mjs';
import { buildCountries } from './political.mjs';
import { placeLabels, labelRects, rectsOverlap, lineWidth } from './labels.mjs';
import { buildSettlements, RANK } from './settlements.mjs';
import { buildRoads } from './roads.mjs';
import { buildStreets } from './towns.mjs';
import { buildParks, buildAdmin, buildStreams, placeDetailLabels } from './features.mjs';
import { assignCultures, capitalName } from './cultures.mjs';
import { warpRivers, buildSmallLakes, findVolcanoes } from './lakes.mjs';
import { buildPolar } from './polar.mjs';
import { placeAbout } from './about.mjs';
import { coastDistance } from './terrain.mjs';
import { carveFjords, buildIslets, buildIslandArcs } from './coasts.mjs';
import { shapeFrontiers, jogRoundTowns, jogAtRiverBends } from './frontiers.mjs';
import { shapeSpecials } from './shapes.mjs';

export const WIDTH = 1600, HEIGHT = 800;
export const PICTURE_SCALE = 1.5; // picture pixels per map unit
// Finer pictures of the same land cover, cut into tiles the page loads only
// for the part of the map in view, when zoomed in: pixels per map unit, and
// the tile's side in pixels. 12 per unit is the 6x zoom on a 2x screen.
export const TILE_LEVELS = [{ scale: 4, size: 1024 }, { scale: 8, size: 1024 }, { scale: 12, size: 1024 }];

// layout: the sketch the land starts from (see terrain.mjs). masses: how many
// continents. latTop/latBottom: the latitudes of the map's top and bottom
// edges. wet: rainfall, 1 is usual. islands: the share of land in islands.
// land: nudges the land share up or down. mountains, lakes, ponds, roughness: 1 is usual. warm: degrees
// warmer. ice: a polar landmass along the top ('n') or bottom ('s') edge; polar: how it meets the projects' land
// ('isthmus', 'strait', or 'apart'). volcanoes: how many. about: the setting of the island called About (see
// about.mjs: volcano, atoll, crescent, fjord, loch, lighthouse, causeway, or ferry), always in the open sea.
export const WORLDS = [
  { name: 'Le Guin', layout: 'archipelago', masses: 4, latTop: 62, latBottom: 12, wet: 1.1, islands: 0.24, land: -0.02, about: 'lighthouse' },
  { name: 'Asimov', layout: 'trio', masses: 3, latTop: 66, latBottom: -30, wet: 1.1, about: 'crescent' },
  { name: 'Butler', layout: 'twins', masses: 2, latTop: 38, latBottom: -42, wet: 0.95, mountains: 0.8, roughness: 0.85, about: 'causeway' },
  { name: 'Herbert', layout: 'pangaea', masses: 1, latTop: 46, latBottom: 6, wet: 0.7, land: 0.09, mountains: 1.2, about: 'loch' },
  { name: 'Bradbury', layout: 'crescent', masses: 2, latTop: 58, latBottom: 14, wet: 0.74, warm: 2, about: 'volcano' },
  { name: 'Clarke', layout: 'quad', masses: 4, latTop: 50, latBottom: -50, wet: 1.05, mountains: 0.75, roughness: 1.25, about: 'ferry' },
  { name: 'Zelazny', layout: 'northsouth', masses: 2, latTop: 70, latBottom: -20, wet: 1.05, ice: 'n', about: 'fjord', polar: 'isthmus' },
  { name: 'Heinlein', layout: 'spine', masses: 2, latTop: 74, latBottom: 20, mountains: 1.6, about: 'loch' },
  { name: 'Gibson', layout: 'archipelago', masses: 3, latTop: 52, latBottom: 8, wet: 1.15, islands: 0.28, land: -0.04, about: 'atoll' },
  { name: 'Banks', layout: 'quad', masses: 4, latTop: 30, latBottom: -62, wet: 1.1, roughness: 1.2, ice: 's', about: 'crescent', polar: 'strait' },
  { name: 'Lem', layout: 'twins', masses: 2, latTop: 64, latBottom: -10, wet: 1.2, islands: 0.22, land: -0.035, about: 'causeway' },
  { name: 'Atwood', layout: 'pangaea', masses: 1, latTop: 75, latBottom: 36, wet: 1.05, lakes: 1.6, ponds: 1.6, ice: 'n', about: 'fjord', polar: 'strait' },
  { name: 'Jemisin', layout: 'pangaea', masses: 1, latTop: 36, latBottom: -36, wet: 0.82, land: 0.1, mountains: 1.4, volcanoes: 3, about: 'volcano' },
  { name: 'Delany', layout: 'trio', masses: 3, latTop: 24, latBottom: -24, wet: 1.3, warm: 1, about: 'atoll' },
  { name: 'Vonnegut', layout: 'twins', masses: 2, latTop: 72, latBottom: 24, arcSeed: 'b', about: 'lighthouse' },
  { name: 'Verne', layout: 'archipelago', arcSeed: 'e', masses: 4, latTop: 40, latBottom: -40, wet: 0.86, islands: 0.32, land: -0.07, volcanoes: 3, about: 'volcano' },
  { name: 'Wells', layout: 'northsouth', masses: 2, latTop: 56, latBottom: -56, wet: 0.86, ice: 's', about: 'ferry', polar: 'isthmus' },
  { name: 'Shelley', layout: 'crescent', masses: 2, latTop: 80, latBottom: 40, wet: 1.05, lakes: 1.3, ice: 'n', about: 'fjord', polar: 'apart' },
  { name: 'Tiptree', layout: 'spine', masses: 2, latTop: 28, latBottom: -44, wet: 1.1, warm: 2, about: 'atoll' },
  { name: 'Chiang', layout: 'ring', masses: 1, latTop: 60, latBottom: -10, wet: 1.05, mountains: 1.3, about: 'lighthouse' },
];

export const slugOf = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function worldStyle(name) {
  const style = WORLDS.find((w) => w.name === name);
  if (!style) throw new Error(`no world named ${name}`);
  return style;
}

// What the project list decides: the more projects, the more land.
export function worldParams(name, projects) {
  const style = worldStyle(name);
  const landShare = clamp(0.3 + 0.0045 * (projects.length - 10) + (style.land ?? 0), 0.25, 0.46);
  // Invented distances, set by what is drawn: towns lie a median of about 12 map units apart in every world, so at
  // about 1.1 km a unit they are some 11 to 15 km apart, a city's built-up ground a few km to 11 km across, and the
  // whole map some 1,500 to 2,000 km wide (Noah, 24 November 2026: a quarter smaller than the 1.5 km before). Worlds
  // that span more latitude run a little larger.
  const kmPerUnit = (1.35 + Math.max(0, style.latTop - style.latBottom - 40) * 0.004) * 0.76;
  return { style, landShare, masses: style.masses, kmPerUnit: Math.round(kmPerUnit * 100) / 100 };
}

// The land itself: terrain, climate, rivers and lakes, and land cover.
export function buildLand(name, projects, { width = WIDTH, height = HEIGHT } = {}) {
  const { style, landShare, masses } = worldParams(name, projects);
  const rng = makeRng(name + (style.reroll ? '#' + style.reroll : ''));
  const terrain = buildTerrain({ rng, width, height, landShare, masses, style });
  const { elev, land } = terrain;
  // Fjords, cut into the cold mountainous coasts.
  const fjords = carveFjords({ land, elev, width, height, rng, style });
  if (fjords.length) terrain.dist = coastDistance(land, width, height);
  // The polar land, where the world has one: what of it joins a project's land becomes that land.
  const polar = buildPolar({ land, width, height, rng, sides: style.ice, link: style.polar });
  let claimed = 0;
  for (let i = 0; i < land.length; i++) if (polar.claim[i]) { land[i] = 1; elev[i] = Math.max(elev[i], 0.025); claimed++; }
  // Volcanic island arcs, off some coasts.
  const arcs = buildIslandArcs({ land, elev, ice: polar.ice, width, height, rng, style });
  if (claimed || arcs.length) terrain.dist = coastDistance(land, width, height);
  const fields = buildFields({ elev, land, width, height, rng, style, dist: terrain.dist });
  const hydro = buildHydro({ elev, land, width, height, rain: fields.rain, rng, style });
  const main = new Uint8Array(width * height);
  for (let i = 0; i < main.length; i++) main[i] = hydro.riverClass[i] >= 2 ? 1 : 0;
  // The dry basins' floors (salt flats, where no lake lies) and the desert's oases.
  const basins = new Float32Array(width * height);
  for (let i = 0; i < basins.length; i++) if (land[i] && !hydro.lakes[i]) basins[i] = Math.max(0, hydro.filled[i] - elev[i]);
  const oases = findOases({ land, elev, fields, hydro, dist: terrain.dist, width, height, rng });
  const { cover, ponds } = classifyCover({ fields, elev, land, width, height, rng, style, water: { rivers: main, lakes: hydro.lakes }, basins, oases, polar: polar.cover });
  // Land no project holds: polar ice in some worlds, and the island called About in every one.
  const ice = polar.ice;
  // The countries, drawn now (from their own stream of numbers, so nothing else changes) so the About island can be
  // sized to them: about the size of a small project's island, or a little less (Noah, 24 November 2026).
  const nations = buildCountries({ land, elev, width, height, projects, rng, hydro });
  const smallAreas = projects.map((p, k) => (p.tier === 'flagship' ? -1 : nations.areas[k])).filter((a) => a > 0).sort((a, b) => a - b);
  // (The two smallest of them, UCGEO and Substack as the projects stand, are the measure; three quarters of theirs.)
  const smallArea = smallAreas.length >= 2 ? (smallAreas[0] + smallAreas[1]) / 2 : 2600 * (width / 1600) ** 2;
  const about = placeAbout({ land, ice, width, height, rng, kind: style.about, temp: fields.temp, area: clamp(0.75 * smallArea, 1400, 3000) });
  const landAll = new Uint8Array(width * height);
  for (let i = 0; i < landAll.length; i++) landAll[i] = land[i] || ice[i] || (about && about.mask[i]) ? 1 : 0;
  // The picture is drawn in makeWorld, once the towns, lakes, and roads are known; it is carried a little way out to
  // sea so the vector coast drawn over it never shows a gap.
  const coverArgs = { fields, elev, land: landAll, width, height, rng, style, water: { rivers: main, lakes: hydro.lakes }, bleed: 2, ice, flow: hydro.acc, dist: terrain.dist, basins, oases, polar: polar.cover, about: about && about.cover };
  return { name, slug: slugOf(name), width, height, style, rng, terrain, elev, land, landAll, ice, polar, about, fields, hydro, cover, ponds, coverArgs, oases, fjords, arcs, nations };
}

// The land divided among the projects.
export function buildNations(world, projects) {
  // (Drawn already by buildLand, and handed on once; any later call draws them afresh, to the same result.)
  if (world.nations) { const n = world.nations; world.nations = null; return n; }
  const { land, elev, width, height, rng, hydro } = world;
  return buildCountries({ land, elev, width, height, projects, rng, hydro });
}

// Names on the map: countries, provinces, ranges, seas, lakes, and capitals.
export function buildLabels(world, nations, projects, { cultures, settlements, drawnRivers, islets } = {}) {
  const { width, height, rng, landAll, hydro, terrain } = world;
  const towns = nations.capitals.map((c) => {
    const s = settlements && settlements.find((q) => q.rank === RANK.CAPITAL && projects[q.country].id === c.id);
    return { x: c.x, y: c.y, capital: true, id: c.id, name: s && s.name };
  });
  const nameAt = cultures ? (x, y) => { const k = nations.owner[clamp(Math.floor(y), 0, height - 1) * width + clamp(Math.floor(x), 0, width - 1)]; return k >= 0 ? cultures[k].namer.word() : null; } : null;
  return placeLabels({
    owner: nations.owner, provinces: nations.provinces, projects, width, height, rng,
    extras: {
      land: landAll, lakes: hydro.lakes, ranges: terrain.ranges, towns, rivers: drawnRivers || hydro.rivers, riverMeta: hydro.riverMeta, nameAt,
      wordOf: cultures ? (k) => cultures[k].namer.word() : null, phonOf: cultures ? (k) => cultures[k].phon.base || cultures[k].phon.id : null, fjords: world.fjords || [], lagoons: islets ? islets.lagoons : [], settlements: settlements || [],
      temp: world.fields.temp, elev: world.elev, islandTowns: (settlements || []).filter((q) => q.island),
    },
  });
}

// Countries next to one another, most shared border first.
function neighbours(owner, n, W, H) {
  const m = Array.from({ length: n }, () => new Map());
  for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
    const i = y * W + x, a = owner[i];
    if (a < 0) continue;
    for (const j of [i + 1, i + W]) { const b = owner[j]; if (b >= 0 && b !== a) { m[a].set(b, (m[a].get(b) || 0) + 1); m[b].set(a, (m[b].get(a) || 0) + 1); } }
  }
  return m.map((mm) => [...mm.entries()].sort((p, q) => q[1] - p[1] || p[0] - q[0]).map((e) => e[0]));
}

// Everything a world's files are written from.
export function makeWorld(name, projects, opts) {
  const world = buildLand(name, projects, opts);
  const nations = buildNations(world, projects);
  const { width, height, rng, land, elev, hydro, cover, fields, terrain, style } = world;
  const owner = nations.owner;
  // Braidable's braided delta and the portfolio's square island with its round harbour (see shapes.mjs).
  const specials = shapeSpecials(world, nations, projects);
  terrain.dist = coastDistance(land, width, height);
  world.coverArgs.dist = terrain.dist;
  // Borders with history in them: a long thin coastal country, a corridor to the sea, a shared island, and lines
  // through lakes (see frontiers.mjs).
  const frontiers = shapeFrontiers({ owner, land, width, height, projects, nations, rng, dist: terrain.dist, hydro });
  // An exclave, in most worlds: a small piece of a flagship's coast, far from its capital, held by one of the small
  // countries beyond it (see exclaveFor). The flagship's main body stays whole and the size order stands.
  const exclave = exclaveFor({ owner, nations, projects, land, dist: terrain.dist, width, height, rng });
  const cultures = assignCultures(projects, rng, neighbours(owner, projects.length, width, height));
  // Rivers as drawn: smoothed, and meandering on the lowland.
  const { rivers: drawnRivers, warp } = warpRivers(hydro.rivers, hydro.riverMeta, { land, elev, dist: terrain.dist, width, height, rng });
  // Where a border runs down a river, a bend or two left to the far bank.
  frontiers.push(...jogAtRiverBends({ owner, land, width, height, projects, nations, rivers: drawnRivers, riverMeta: hydro.riverMeta, rng }));
  // Small water: kettle lakes, tarns, finger lakes, oxbows, marsh ponds, reservoirs, and crater lakes.
  const volcanoes = findVolcanoes({ land, elev, width, height, rng, count: style.volcanoes ?? (rng.fork('vn').chance(0.6) ? 2 : 0) });
  // The island arcs' cones with crater lakes.
  for (const a of world.arcs || []) for (const c of a.cones) if (c.crater && land[Math.floor(c.y) * width + Math.floor(c.x)]) volcanoes.push({ x: c.x, y: c.y, e: c.e, arc: true });
  const smallLakes = buildSmallLakes({ land, elev, temp: fields.temp, moist: fields.moist, hydro, dist: terrain.dist, style, width, height, rng, drawnRivers, volcanoes, keepClear: nations.capitals });
  const settlements = buildSettlements({ land, elev, temp: fields.temp, cover, hydro, dist: terrain.dist, owner, capitals: nations.capitals, areas: nations.areas, projects, width, height, rng, blocked: smallLakes.mask, oases: world.oases });
  // A town on each island in a great river or a large lake (see lakes.mjs), if none stands there already.
  for (const ti of smallLakes.townIslands || []) {
    const k = owner[Math.floor(ti.y) * width + Math.floor(ti.x)];
    // (Not on a border: an island town is wholly its own country's.)
    let near = false;
    for (let dy = -3; dy <= 3 && !near; dy++) for (let dx = -3; dx <= 3; dx++) { const o = owner[(Math.floor(ti.y) + dy) * width + Math.floor(ti.x) + dx]; if (o >= 0 && o !== k) { near = true; break; } }
    if (near) continue;
    if (k < 0 || projects[k].provinces && nations.provinces[Math.floor(ti.y) * width + Math.floor(ti.x)] < 0) continue;
    // A town or a village close by moves onto the island.
    const here = settlements.filter((q) => q.rank >= RANK.TOWN && Math.hypot(q.x - ti.x, q.y - ti.y) < 7 * width / 1600 && q.country === k).sort((a, b) => Math.hypot(a.x - ti.x, a.y - ti.y) - Math.hypot(b.x - ti.x, b.y - ti.y))[0];
    if (here) { here.x = Math.round(ti.x * 10) / 10; here.y = Math.round(ti.y * 10) / 10; here.island = ti.kind; ti.town = here; continue; }
    // Others too close step back (a village) or give way (the island town takes the place of a village).
    if (settlements.some((q) => q.rank <= RANK.TOWN && Math.hypot(q.x - ti.x, q.y - ti.y) < 9 * width / 1600)) continue;
    for (let j = settlements.length - 1; j >= 0; j--) if (settlements[j].rank === RANK.VILLAGE && Math.hypot(settlements[j].x - ti.x, settlements[j].y - ti.y) < 5 * width / 1600) settlements.splice(j, 1);
    const t = { x: Math.round(ti.x * 10) / 10, y: Math.round(ti.y * 10) / 10, rank: ti.kind === 'river' ? RANK.TOWN : RANK.VILLAGE, country: k, size: ti.kind === 'river' ? 0.9 : 0.6, island: ti.kind };
    settlements.push(t); ti.town = t;
  }
  // A border that steps out round a town or two the other side holds.
  frontiers.push(...jogRoundTowns({ owner, land, width, height, projects, nations, settlements, rng }));
  // A place a hair from a border steps back into its own country (the drawn line is smoothed, and a thin corridor
  // or a jog runs close by), so its dot is drawn on its own side.
  {
    const S1 = width / 1600, other = (x, y, k, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = Math.floor(x) + dx, yy = Math.floor(y) + dy; if (xx >= 0 && yy >= 0 && xx < width && yy < height) { const o = owner[yy * width + xx]; if (o >= 0 && o !== k) return true; } } return false; };
    for (const q of settlements) {
      if (q.rank === RANK.CAPITAL || q.island || !other(q.x, q.y, q.country, Math.ceil(1.5 * S1))) continue;
      let best = null, bd = Infinity;
      const R = Math.ceil(5 * S1);
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const x = Math.floor(q.x) + dx + 0.5, y = Math.floor(q.y) + dy + 0.5, i = Math.floor(y) * width + Math.floor(x);
        if (x < 0 || y < 0 || x >= width || y >= height || owner[i] !== q.country || !land[i] || hydro.lakes[i] || smallLakes.mask[i] || other(x, y, q.country, Math.ceil(2.5 * S1))) continue;
        const d = Math.hypot(dx, dy);
        if (d < bd) { bd = d; best = [x, y]; }
      }
      if (best) [q.x, q.y] = best;
    }
  }
  // Every place's name, in its country's language; each capital is its project's name and "City".
  for (const s of settlements) {
    const p = projects[s.country];
    s.name = s.rank === RANK.CAPITAL ? capitalName(p) : cultures[s.country].namer.town();
  }
  const roads = buildRoads({ land, elev, hydro, owner, settlements, blocked: smallLakes.mask, cultures, projects, width, height, rng });
  const { streets, builtKind, layouts, cityParks, urbanRings } = buildStreets({ settlements, exits: roads.exits, cultures, land, elev, hydro, blocked: smallLakes.mask, width, height, rng, dist: terrain.dist, rivers: drawnRivers, riverMeta: hydro.riverMeta, areas: nations.areas, projects });
  settlements.forEach((s, k) => { s.layout = layouts[k].type; s.ringRoad = layouts[k].ring; s.shape = layouts[k].shape; });
  // A lake island's village has its ferry to the nearest town on the shore.
  for (const ti of smallLakes.townIslands || []) {
    if (ti.kind !== 'lake' || !ti.town) continue;
    let best = null, bd = Infinity;
    for (const q of settlements) { if (q === ti.town) continue; const d = Math.hypot(q.x - ti.x, q.y - ti.y); if (d < bd) { bd = d; best = q; } }
    if (!best || bd > 30 * width / 1600) continue;
    // From the island's shore to the far shore, toward that town.
    const ux = (best.x - ti.x) / bd, uy = (best.y - ti.y) / bd, wet = smallLakes.index.inside;
    let t = 0, a = null, b = null;
    while (t < bd && !wet(ti.x + ux * t, ti.y + uy * t)) t += 0.1;
    a = [ti.x + ux * t, ti.y + uy * t];
    while (t < bd && wet(ti.x + ux * t, ti.y + uy * t)) t += 0.1;
    b = [ti.x + ux * t, ti.y + uy * t];
    if (t < bd) roads.ferries.push([a.map((v) => Math.round(v * 10) / 10), b.map((v) => Math.round(v * 10) / 10)]);
  }
  // The About island's own detail: its villages' streets and the road between them, and a ferry to the mainland.
  const about = world.about;
  if (about) aboutWays(about, roads, streets, settlements, width);
  // The picture: the land cover with the built-up ground and the small lakes painted in.
  world.coverArgs.urban = (x, y) => builtKind(x, y);
  world.coverArgs.lakes = smallLakes.index.inside;
  const picture = classifyCover({ ...world.coverArgs, scale: PICTURE_SCALE });
  // The coast's small forms: cays, skerries, stacks, sandbars, and barrier islands with their lagoons.
  const islets = buildIslets({ landAll: world.landAll, elev, width, height, rng, style, hydro, about: world.about, keepClear: roads.ferries.flatMap(([a, b]) => { const out = []; for (let t = 0; t <= 1; t += 0.05) out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0.8]); return out; }) });
  const labels = buildLabels(world, nations, projects, { cultures, settlements, drawnRivers, islets });
  const aboutLabel = labelAbout(world, labels);
  if (aboutLabel) labels.push(aboutLabel);
  const parks = buildParks({ land, owner, cover: picture ? cover : cover, elev, temp: fields.temp, moist: fields.moist, settlements, projects, areas: nations.areas, width, height, rng, dist: terrain.dist, smallLakes });
  const admin = buildAdmin({ owner, projects, settlements, areas: nations.areas, width, height, rng });
  // Streams; in the desert, dry riverbeds (wadis), drawn as faint lines.
  const streams = [], wadis = [];
  for (const pts of buildStreams({ land, hydro, width, height, style })) {
    const [mx, my] = pts[pts.length >> 1], mi = Math.floor(my) * width + Math.floor(mx);
    (fields.moist[mi] < 0.075 && fields.temp[mi] > 4 ? wadis : streams).push(pts.map(([x, y]) => warp(x, y)));
  }
  const detailLabels = placeDetailLabels({ labels, land, elev, cover, hydro, temp: fields.temp, owner, settlements, roads, parks, projects, width, height, rng, cultures, smallLakes, volcanoes, drawnRivers, islets, cityParks, urban: builtKind });
  // The About island's places, named: its hill, its pond, its villages, its lighthouse and cape, its bays, and its
  // islets.
  if (about) detailLabels.push(...aboutLabels(about, [...labels, ...detailLabels], width, height));
  return {
    name, slug: world.slug, width: world.width, height: world.height,
    cover: world.cover, ponds: world.ponds, lakes: world.hydro.lakes, picture,
    settlements, cultures, smallLakes, ice: world.ice, about: world.about, polar: world.polar, exclave, frontiers, specials, arcs: world.arcs,
    detail: { roads, streets, parks, admin, streams, wadis, smallLakes, labels: detailLabels, causeway: about && about.causeway ? [about.causeway] : [], islets: islets.islets, cityParks, urbanRings },
    rivers: drawnRivers, riverMeta: world.hydro.riverMeta,
    owner, provinces: nations.provinces, capitals: nations.capitals, areas: nations.areas,
    labels, projects, kmPerUnit: worldParams(name, projects).kmPerUnit,
    land: world.land, landAll: world.landAll, elev: world.elev, temp: world.fields.temp, plan: nations.plan,
    coverArgs: world.coverArgs,
  };
}

// A designed exclave: { of (the country that holds it), in (the flagship whose coast it lies on), x, y, area } or null.
function exclaveFor({ owner, nations, projects, land, dist, width: W, height: H, rng }) {
  const r = rng.fork('exclave'), S = W / 1600, N = W * H;
  if (!r.chance(0.8)) return null;
  const areas = nations.areas, capOf = (k) => nations.capitals.find((c) => c.id === projects[k].id);
  const flag = projects.map((p, k) => k).filter((k) => projects[k].tier === 'flagship' && !projects[k].provinces).sort((a, b) => projects[a].rank - projects[b].rank);
  const small = projects.map((p, k) => k).filter((k) => projects[k].tier !== 'flagship' && areas[k] > 300 * S * S);
  if (!flag.length || !small.length) return null;
  const smallCaps = small.map((k) => [k, capOf(k)]).filter((e) => e[1]);
  for (let t = 0; t < 300; t++) {
    const x = r.int(W - 40) + 20, y = r.int(H - 40) + 20, i = y * W + x, B = owner[i];
    if (!land[i] || !flag.includes(B) || dist[i] > 2.5 * S) continue;
    const cb = capOf(B);
    if (!cb || Math.hypot(cb.x - x, cb.y - y) < 70 * S) continue;
    if (nations.capitals.some((c) => Math.hypot(c.x - x, c.y - y) < 30 * S)) continue;
    // Held by the small country whose capital is nearest, if that is neither next door nor a world away.
    let A = -1, ad = Infinity;
    for (const [k, c] of smallCaps) { const d = Math.hypot(c.x - x, c.y - y); if (d < ad) { ad = d; A = k; } }
    if (A < 0 || ad < 60 * S || ad > 420 * S) continue;
    // The piece: what of B lies within a few units of the point, ragged.
    const R = r.range(6, 9) * S, piece = [];
    for (let yy = Math.floor(y - R); yy <= y + R; yy++) for (let xx = Math.floor(x - R); xx <= x + R; xx++) {
      if (xx < 1 || yy < 1 || xx >= W - 1 || yy >= H - 1) continue;
      const j = yy * W + xx, d = Math.hypot(xx - x, yy - y);
      if (owner[j] === B && d < R * (0.8 + 0.2 * Math.sin(xx * 0.9) * Math.cos(yy * 0.7))) piece.push(j);
    }
    if (piece.length < 60 * S * S || piece.length > areas[B] * 0.02) continue;
    // No neighbour of A may touch it (it would be no exclave), and the size order must stand.
    const set = new Set(piece);
    if (piece.some((j) => [j - 1, j + 1, j - W, j + W].some((n) => owner[n] === A))) continue;
    const next = flag[flag.indexOf(B) + 1];
    if (next !== undefined && areas[B] - piece.length <= areas[next] * 1.02) continue;
    // B's own land must stay in one piece as it was: flood it from its capital, without the piece.
    const before = countFrom(owner, B, cb, W, N, null), after = countFrom(owner, B, cb, W, N, set);
    if (after !== before - piece.length) continue;
    for (const j of piece) owner[j] = A;
    areas[B] -= piece.length; areas[A] += piece.length;
    return { of: projects[A].id, in: projects[B].id, x, y, area: piece.length };
  }
  return null;
}
function countFrom(owner, k, cap, W, N, without) {
  const s = Math.floor(cap.y) * W + Math.floor(cap.x);
  if (owner[s] !== k) return -1;
  const seen = new Uint8Array(N), stack = [s];
  seen[s] = 1;
  let n = 0;
  while (stack.length) {
    const i = stack.pop(); n++;
    for (const j of [i - 1, i + 1, i - W, i + W]) if (j >= 0 && j < N && !seen[j] && owner[j] === k && !(without && without.has(j))) { seen[j] = 1; stack.push(j); }
  }
  return n;
}

// The About island's name, beside it: below it, above it, or to one side.
function labelAbout(world, labels) {
  const a = world.about;
  if (!a) return null;
  const S = world.width / 1600, size = 3.6 * S;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const ring of a.rings) for (const [x, y] of ring) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const make = (x, y) => ({ id: 'about', kind: 'island', text: 'About', lines: ['About'], x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, size, angle: 0, spacing: 0, minZoom: 1 });
  const clear = (l) => { const rects = labelRects(l, 0.5 * S); return labels.every((o) => !labelRects(o).some((p) => rects.some((q) => rectsOverlap(p, q)))); };
  // On the island itself, as Google Maps names an island (Noah, 24 November 2026): where the name's box lies on the
  // island's own land, a little way from the blue dot so the two do not cover each other, below it if it can be.
  if (a.mask) {
    const W = world.width, onLand = (x, y) => { const qx = Math.floor(x), qy = Math.floor(y); return qx >= 0 && qy >= 0 && qx < W && qy < world.height && a.mask[qy * W + qx] === 1; };
    const hw = size * 0.62 * 5 / 2, hh = size * 0.6;
    let best = null, bestScore = -Infinity;
    for (let y = y0; y <= y1; y += 0.5 * S) for (let x = x0; x <= x1; x += 0.5 * S) {
      const d = Math.hypot(x - a.x, y - a.y);
      if (d < 8 * S || !onLand(x, y)) continue;
      let on = 0, n = 0;
      for (const fy of [-1, 0, 1]) for (const fx of [-1, -0.5, 0, 0.5, 1]) { n++; if (onLand(x + fx * hw, y + fy * hh)) on++; }
      if (on < n - 1) continue;
      const score = on * 2 - Math.abs(d - 11 * S) * 0.35 - Math.abs(x - a.x) * 0.2 + (y > a.y ? 3 : 0);
      if (score > bestScore) { bestScore = score; best = [x, y]; }
    }
    if (best) { const l = make(best[0], best[1]); if (clear(l)) return l; }
  }
  let spots = [[mx, y1 + 4 * S], [mx, y0 - 4 * S], [x1 + 7 * S, my], [x0 - 7 * S, my], [mx, y1 + 9 * S], [mx, y0 - 9 * S]];
  // Clear of the causeway or the ferry: on the side away from the mainland.
  if (a.dock) { const ux = a.dock[0] - a.x, uy = a.dock[1] - a.y; spots = spots.map((p, k) => [p, k]).sort((p, q) => (p[0][0] - a.x) * ux + (p[0][1] - a.y) * uy - ((q[0][0] - a.x) * ux + (q[0][1] - a.y) * uy) || p[1] - q[1]).map((e) => e[0]); }
  for (const [x, y] of spots) {
    const l = { id: 'about', kind: 'island', text: 'About', lines: ['About'], x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, size, angle: 0, spacing: 0, minZoom: 1 };
    const rects = labelRects(l, 0.5 * S);
    if (labels.every((o) => !labelRects(o).some((p) => rects.some((q) => rectsOverlap(p, q))))) return l;
  }
  return null;
}

// The About island's ways: its villages' streets (a crossroads each), the road from one village to the other and the
// track to the lighthouse, and, where it has one, the ferry from its harbour to the nearest town across the water.
function aboutWays(about, roads, streets, settlements, width) {
  const S = width / 1600;
  // (The road between the villages as a country's minor highway is drawn, the track to the lighthouse as a lane.)
  about.roads.forEach((pts, n) => roads.roads.push({ cls: n === 0 && about.villages.length === 2 ? 'secondary' : 'local', pts }));
  const onIsland = (p) => about.mask[Math.floor(p[1]) * width + Math.floor(p[0])] === 1 && about.field(p[0], p[1]) > 0.02;
  for (const v of about.villages) {
    // Along the road where it leaves the village, and across it.
    let th = 0;
    for (const pts of about.roads) for (const end of [pts[0], pts[pts.length - 1]]) if (Math.hypot(end[0] - v.x, end[1] - v.y) < 0.5 * S) {
      const q = end === pts[0] ? pts[Math.min(3, pts.length - 1)] : pts[Math.max(0, pts.length - 4)];
      th = Math.atan2(q[1] - v.y, q[0] - v.x);
    }
    for (const [a, len, cls] of [[th, v.r * 1.1, 'street'], [th + Math.PI / 2, v.r * 0.85, 'street'], [th + Math.PI / 4, v.r * 0.6, 'minor']]) {
      const pts = [];
      for (let t = -len; t <= len + 1e-6; t += 0.25 * S) pts.push([Math.round((v.x + Math.cos(a) * t) * 100) / 100, Math.round((v.y + Math.sin(a) * t) * 100) / 100]);
      let run = [];
      for (const p of pts) { if (onIsland(p)) run.push(p); else { if (run.length > 1) streets.push({ cls, pts: run }); run = []; } }
      if (run.length > 1) streets.push({ cls, pts: run });
    }
  }
  if (about.kind === 'ferry' && about.dock) {
    let best = null, bd = Infinity;
    for (const s of settlements) { if (s.rank > RANK.TOWN) continue; const d = Math.hypot(s.x - about.dock[0], s.y - about.dock[1]); if (d < bd) { bd = d; best = s; } }
    if (best) roads.ferries.push([about.dock.map((v) => Math.round(v * 10) / 10), [best.x, best.y]]);
  }
}

// The About island's places, named (see about.mjs for the names): each kept clear of the names already placed.
function aboutLabels(a, taken, W, H) {
  const S = W / 1600, out = [];
  const placed = taken.map((l) => labelRects(l, 0.3 * S));
  // (Nor over the blue dot, which is drawn above the names.)
  placed.push([{ cx: a.x, cy: a.y, hw: 2.4 * S, hh: 2.4 * S, cos: 1, sin: 0 }]);
  const r1 = (v) => Math.round(v * 10) / 10;
  const put = (l) => {
    const rects = labelRects(l, 0.3 * S);
    if (rects.some((rc) => rc.cx - rc.hw < 1 || rc.cx + rc.hw > W - 1 || rc.cy - rc.hh < 1 || rc.cy + rc.hh > H - 1)) return false;
    if (placed.some((p) => p.some((b) => rects.some((q) => rectsOverlap(q, b))))) return false;
    l.x = r1(l.x); l.y = r1(l.y);
    if (l.dot) l.dot = l.dot.map(r1);
    placed.push(labelRects(l, 0.3 * S));
    out.push(l);
    return true;
  };
  const widthOf = (lines, size) => Math.max(...lines.map((ln) => lineWidth(ln))) * size;
  // A name beside a point: right, left, above, below, then the corners.
  const beside = (base, x, y, gap = 0.7) => {
    const size = base.size, w = widthOf(base.lines, size), hh = ((base.lines.length - 1) * 1.12 + 1) * size / 2, g = size * gap;
    for (const [dx, dy] of [[w / 2 + g, 0], [-w / 2 - g, 0], [0, -hh - g], [0, hh + g], [w / 2 + g * 0.6, -hh - g * 0.4], [-w / 2 - g * 0.6, hh + g * 0.4], [w / 2 + g * 0.6, hh + g * 0.4], [-w / 2 - g * 0.6, -hh - g * 0.4]]) {
      if (put({ ...base, x: x + dx, y: y + dy, dot: base.dot ? [x, y] : undefined })) return true;
    }
    return false;
  };
  const N = a.names, size = 2.6 * S;
  const mk = (id, kind, text, extra = {}) => ({ id, kind, text, lines: [text], size, angle: 0, spacing: 0, minZoom: 4, ...extra });
  // The villages first, and the hill: what the island is known by. (A village is always named: if no place beside it
  // is clear, its name goes to its right, and the map hides whichever name ranks lower.)
  const always = (l, x, y, gap = 0.7) => {
    if (beside(l, x, y, gap)) return;
    const w = widthOf(l.lines, l.size), hh = ((l.lines.length - 1) * 1.12 + 1) * l.size / 2;
    // (Below its point, if not beside it: never over the blue dot's own place.)
    const spot = Math.hypot(x + w / 2 + l.size * gap - a.x, y - a.y) > w / 2 + 2.4 * S ? [x + w / 2 + l.size * gap, y] : [x, y + hh + l.size * gap];
    const f = { ...l, x: r1(spot[0]), y: r1(spot[1]), dot: [r1(x), r1(y)] };
    placed.push(labelRects(f, 0.3 * S));
    out.push(f);
  };
  a.villages.forEach((v, n) => always(mk(`about-village-${n}`, 'village', N.villages[n], { size: 2.75 * S, dot: true }), v.x, v.y));
  const [hx, hy, h] = a.peak;
  always({ ...mk('about-peak', 'peak', N.peak, { minZoom: 3, dot: true, ...(a.kind === 'volcano' ? { volcano: true } : {}) }), lines: [N.peak, `${h.toLocaleString('en-US')} m`] }, hx, hy, 0.55);
  if (a.lighthouse) always(mk('about-light', 'cape', N.light, { dot: true }), a.lighthouse[0], a.lighthouse[1]);
  if (a.pond) {
    // On the water if it fits, else beside it.
    const l = mk('about-pond', 'lake', N.pond, { minZoom: 3 }), w = widthOf(l.lines, size);
    if (!(w < a.pond.r * 1.7 && put({ ...l, x: a.pond.x, y: a.pond.y }))) {
      const r = a.pond.r;
      const spots = [[0, r + size * 0.8], [0, -r - size * 0.8], [r + w / 2 + size * 0.4, 0], [-r - w / 2 - size * 0.4, 0]];
      if (!spots.some(([dx, dy]) => put({ ...l, x: a.pond.x + dx, y: a.pond.y + dy }))) out.push({ ...l, x: r1(a.pond.x), y: r1(a.pond.y + r + size * 0.8) });
    }
  }
  if (a.lagoon) put(mk('about-lagoon', 'lagoon', N.lagoon, { x: a.lagoon.x, y: a.lagoon.y }));
  // The bays' names, out on their water.
  a.bays.forEach((b, n) => {
    const kind = b.big || n === 0 ? 'bay' : /Cove$/.test(N.bays[n]) ? 'cove' : 'bay';
    for (const k of [0, 0.5, -0.5, 1]) {
      // (A cove is named from zoom 5, as the rest of the map's are.)
      const l = mk(`about-bay-${n}`, kind, N.bays[n], { x: b.x + Math.cos(b.a) * k * 2 * S, y: b.y + Math.sin(b.a) * k * 2 * S, minZoom: kind === 'cove' ? 5 : 4 });
      if (a.field(l.x, l.y) <= 0 && put(l)) break;
    }
  });
  // The cape's name, out past its point.
  if (a.cape) {
    const l = mk('about-cape', 'cape', N.cape), w = widthOf(l.lines, size) / 2, ux = Math.cos(a.cape.a), uy = Math.sin(a.cape.a);
    for (const k of [1, 1.5, 2.2]) {
      const off = (w * Math.abs(ux) + size * 0.6 * Math.abs(uy)) * k + 0.8 * S;
      if (put({ ...l, x: a.cape.x + ux * off, y: a.cape.y + uy * off })) break;
    }
  }
  if (a.fjords.length) put(mk('about-fjord', 'inlet', N.fjords[0], { x: a.fjords[0][0], y: a.fjords[0][1] }));
  a.islets.forEach((p, n) => beside(mk(`about-islet-${n}`, 'island', N.islets[n], { size: 2.4 * S, minZoom: 5 }), p.x, p.y, 0.4 + p.r / (2.4 * S)));
  return out;
}
