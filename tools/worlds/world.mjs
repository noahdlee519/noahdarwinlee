// The twenty worlds, and the pipeline that makes one.
//
// A world's seed is its name. Its character (how the land is laid out, where
// it sits between the poles, how wet it is) is set here per world, so the
// twenty differ on purpose; its sizes (land share, country areas) come from
// the project list, so adding a project and rerunning gives the same twenty
// worlds with one more country in each.

import { makeRng, clamp } from './rng.mjs';
import { buildTerrain } from './terrain.mjs';
import { buildFields, classifyCover } from './climate.mjs';
import { buildHydro } from './hydro.mjs';
import { buildCountries } from './political.mjs';
import { placeLabels, labelRects, rectsOverlap } from './labels.mjs';
import { buildSettlements, RANK } from './settlements.mjs';
import { buildRoads } from './roads.mjs';
import { buildStreets } from './towns.mjs';
import { buildParks, buildAdmin, buildStreams, placeDetailLabels } from './features.mjs';
import { assignCultures, phonologyNamer, PHONOLOGIES, CAPITAL_NAMES } from './cultures.mjs';
import { warpRivers, buildSmallLakes, findVolcanoes } from './lakes.mjs';
import { buildIce, placeAbout } from './polar.mjs';

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
// warmer. ice: polar ice along the top ('n') or bottom ('s') edge. volcanoes: how many.
export const WORLDS = [
  { name: 'Le Guin', layout: 'archipelago', masses: 4, latTop: 62, latBottom: 12, wet: 1.1, islands: 0.24, land: -0.02 },
  { name: 'Asimov', layout: 'trio', masses: 3, latTop: 66, latBottom: -30, wet: 1.1 },
  { name: 'Butler', layout: 'twins', masses: 2, latTop: 38, latBottom: -42, wet: 0.95, mountains: 0.8, roughness: 0.85 },
  { name: 'Herbert', layout: 'pangaea', masses: 1, latTop: 46, latBottom: 6, wet: 0.7, land: 0.09, mountains: 1.2 },
  { name: 'Bradbury', layout: 'crescent', masses: 2, latTop: 58, latBottom: 14, wet: 0.74, warm: 2 },
  { name: 'Clarke', layout: 'quad', masses: 4, latTop: 50, latBottom: -50, wet: 1.05, mountains: 0.75, roughness: 1.25 },
  { name: 'Dick', layout: 'northsouth', masses: 2, latTop: 70, latBottom: -20, wet: 1.05, ice: 'n' },
  { name: 'Heinlein', layout: 'spine', masses: 2, latTop: 74, latBottom: 20, mountains: 1.6 },
  { name: 'Gibson', layout: 'archipelago', masses: 3, latTop: 52, latBottom: 8, wet: 1.15, islands: 0.28, land: -0.04 },
  { name: 'Banks', layout: 'quad', masses: 4, latTop: 30, latBottom: -62, wet: 1.1, roughness: 1.2, ice: 's' },
  { name: 'Lem', layout: 'twins', masses: 2, latTop: 64, latBottom: -10, wet: 1.2, islands: 0.22, land: -0.035 },
  { name: 'Atwood', layout: 'pangaea', masses: 1, latTop: 75, latBottom: 36, wet: 1.05, lakes: 1.6, ponds: 1.6, ice: 'n' },
  { name: 'Jemisin', layout: 'pangaea', masses: 1, latTop: 36, latBottom: -36, wet: 0.82, land: 0.1, mountains: 1.4, volcanoes: 3 },
  { name: 'Delany', layout: 'trio', masses: 3, latTop: 24, latBottom: -24, wet: 1.3, warm: 1 },
  { name: 'Vonnegut', layout: 'twins', masses: 2, latTop: 72, latBottom: 24 },
  { name: 'Verne', layout: 'archipelago', masses: 4, latTop: 40, latBottom: -40, wet: 0.86, islands: 0.32, land: -0.07, volcanoes: 3 },
  { name: 'Wells', layout: 'northsouth', masses: 2, latTop: 56, latBottom: -56, wet: 0.86, ice: 's' },
  { name: 'Shelley', layout: 'crescent', masses: 2, latTop: 80, latBottom: 40, wet: 1.05, lakes: 1.3, ice: 'n' },
  { name: 'Tiptree', layout: 'spine', masses: 2, latTop: 28, latBottom: -44, wet: 1.1, warm: 2 },
  { name: 'Chiang', layout: 'ring', masses: 1, latTop: 60, latBottom: -10, wet: 1.05, mountains: 1.3 },
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
  // about 1.5 km a unit they are some 15 to 20 km apart, a city's built-up ground a few km to 15 km across, and the
  // whole map some 2,000 to 2,600 km wide. Worlds that span more latitude run a little larger.
  const kmPerUnit = 1.35 + Math.max(0, style.latTop - style.latBottom - 40) * 0.004;
  return { style, landShare, masses: style.masses, kmPerUnit: Math.round(kmPerUnit * 100) / 100 };
}

// The land itself: terrain, climate, rivers and lakes, and land cover.
export function buildLand(name, projects, { width = WIDTH, height = HEIGHT } = {}) {
  const { style, landShare, masses } = worldParams(name, projects);
  const rng = makeRng(name + (style.reroll ? '#' + style.reroll : ''));
  const terrain = buildTerrain({ rng, width, height, landShare, masses, style });
  const { elev, land } = terrain;
  const fields = buildFields({ elev, land, width, height, rng, style, dist: terrain.dist });
  const hydro = buildHydro({ elev, land, width, height, rain: fields.rain, rng, style });
  const main = new Uint8Array(width * height);
  for (let i = 0; i < main.length; i++) main[i] = hydro.riverClass[i] >= 2 ? 1 : 0;
  const { cover, ponds } = classifyCover({ fields, elev, land, width, height, rng, style, water: { rivers: main, lakes: hydro.lakes } });
  // Land no project holds: polar ice in some worlds, and the island called About in every one.
  const ice = buildIce({ land, width, height, rng, sides: style.ice });
  const about = placeAbout({ land, ice, width, height, rng });
  const landAll = new Uint8Array(width * height);
  for (let i = 0; i < landAll.length; i++) landAll[i] = land[i] || ice[i] || (about && about.mask[i]) ? 1 : 0;
  // The picture is drawn in makeWorld, once the towns, lakes, and roads are known; it is carried a little way out to
  // sea so the vector coast drawn over it never shows a gap.
  const coverArgs = { fields, elev, land: landAll, width, height, rng, style, water: { rivers: main, lakes: hydro.lakes }, bleed: 2, ice, flow: hydro.acc, dist: terrain.dist };
  return { name, slug: slugOf(name), width, height, style, rng, terrain, elev, land, landAll, ice, about, fields, hydro, cover, ponds, coverArgs };
}

// The land divided among the projects.
export function buildNations(world, projects) {
  const { land, elev, width, height, rng, hydro } = world;
  return buildCountries({ land, elev, width, height, projects, rng, hydro });
}

// Names on the map: countries, provinces, ranges, seas, lakes, and capitals.
export function buildLabels(world, nations, projects, { cultures, settlements, drawnRivers } = {}) {
  const { width, height, rng, landAll, hydro, terrain } = world;
  const towns = nations.capitals.map((c) => {
    const s = settlements && settlements.find((q) => q.rank === RANK.CAPITAL && projects[q.country].id === c.id);
    return { x: c.x, y: c.y, capital: true, id: c.id, name: s && s.name };
  });
  const nameAt = cultures ? (x, y) => { const k = nations.owner[clamp(Math.floor(y), 0, height - 1) * width + clamp(Math.floor(x), 0, width - 1)]; return k >= 0 ? cultures[k].namer.word() : null; } : null;
  return placeLabels({
    owner: nations.owner, provinces: nations.provinces, projects, width, height, rng,
    extras: { land: landAll, lakes: hydro.lakes, ranges: terrain.ranges, towns, rivers: drawnRivers || hydro.rivers, riverMeta: hydro.riverMeta, nameAt },
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
  const cultures = assignCultures(projects, rng, neighbours(owner, projects.length, width, height));
  // Rivers as drawn: smoothed, and meandering on the lowland.
  const { rivers: drawnRivers, warp } = warpRivers(hydro.rivers, hydro.riverMeta, { land, elev, dist: terrain.dist, width, height, rng });
  // Small water: kettle lakes, tarns, finger lakes, oxbows, marsh ponds, reservoirs, and crater lakes.
  const volcanoes = findVolcanoes({ land, elev, width, height, rng, count: style.volcanoes ?? (rng.fork('vn').chance(0.6) ? 2 : 0) });
  const smallLakes = buildSmallLakes({ land, elev, temp: fields.temp, moist: fields.moist, hydro, dist: terrain.dist, style, width, height, rng, drawnRivers, volcanoes, keepClear: nations.capitals });
  const settlements = buildSettlements({ land, elev, temp: fields.temp, cover, hydro, dist: terrain.dist, owner, capitals: nations.capitals, areas: nations.areas, projects, width, height, rng, blocked: smallLakes.mask });
  // Every place's name, in its country's language; some capitals nod to their project.
  for (const s of settlements) {
    const p = projects[s.country];
    s.name = s.rank === RANK.CAPITAL && CAPITAL_NAMES[p.id] ? CAPITAL_NAMES[p.id] : cultures[s.country].namer.town();
  }
  const roads = buildRoads({ land, elev, hydro, owner, settlements, blocked: smallLakes.mask, cultures, projects, width, height, rng });
  const { streets, built } = buildStreets({ settlements, exits: roads.exits, cultures, land, elev, hydro, blocked: smallLakes.mask, width, height, rng });
  // The picture: the land cover with the built-up ground and the small lakes painted in.
  world.coverArgs.urban = (x, y) => built(x, y);
  world.coverArgs.lakes = smallLakes.index.inside;
  const picture = classifyCover({ ...world.coverArgs, scale: PICTURE_SCALE });
  const labels = buildLabels(world, nations, projects, { cultures, settlements, drawnRivers });
  const aboutLabel = labelAbout(world, labels);
  if (aboutLabel) labels.push(aboutLabel);
  const iceLabels = labelIce(world, labels, cultures);
  labels.push(...iceLabels);
  const parks = buildParks({ land, owner, cover: picture ? cover : cover, elev, temp: fields.temp, moist: fields.moist, settlements, projects, areas: nations.areas, width, height, rng, dist: terrain.dist, smallLakes });
  const admin = buildAdmin({ owner, projects, settlements, areas: nations.areas, width, height, rng });
  const streams = buildStreams({ land, hydro, width, height, style }).map((pts) => pts.map(([x, y]) => warp(x, y)));
  const detailLabels = placeDetailLabels({ labels, land, elev, cover, hydro, temp: fields.temp, owner, settlements, roads, parks, projects, width, height, rng, cultures, smallLakes, volcanoes, drawnRivers });
  return {
    name, slug: world.slug, width: world.width, height: world.height,
    cover: world.cover, ponds: world.ponds, lakes: world.hydro.lakes, picture,
    settlements, cultures, smallLakes, ice: world.ice, about: world.about,
    detail: { roads, streets, parks, admin, streams, smallLakes, labels: detailLabels },
    rivers: drawnRivers, riverMeta: world.hydro.riverMeta,
    owner, provinces: nations.provinces, capitals: nations.capitals, areas: nations.areas,
    labels, projects, kmPerUnit: worldParams(name, projects).kmPerUnit,
    land: world.land, landAll: world.landAll, elev: world.elev, temp: world.fields.temp, plan: nations.plan,
    coverArgs: world.coverArgs,
  };
}

// The About island's name, beside it.
function labelAbout(world, labels) {
  const a = world.about;
  if (!a) return null;
  const S = world.width / 1600, size = 3.6 * S;
  for (const [dx, dy] of [[0, 7.5], [0, -7.5], [12, 0], [-12, 0]]) {
    const l = { id: 'about', kind: 'island', text: 'About', lines: ['About'], x: Math.round((a.x + dx * S) * 10) / 10, y: Math.round((a.y + dy * S) * 10) / 10, size, angle: 0, spacing: 0, minZoom: 1 };
    const rects = labelRects(l, 0.5 * S);
    if (labels.every((o) => !labelRects(o).some((p) => rects.some((q) => rectsOverlap(p, q))))) return l;
  }
  return null;
}

// Each polar ice sheet's name, across its widest part.
function labelIce(world, labels, cultures) {
  const { ice, width: W, height: H } = world;
  const S = W / 1600, out = [];
  if (!ice) return out;
  const r = world.rng.fork('ice-names');
  const cold = r.chance(0.5) ? 'nordic' : 'finnic';
  const namer = phonologyNamer(PHONOLOGIES.find((p) => p.id === cold), r);
  for (const side of ['n', 's']) {
    let best = null;
    for (let x = 200 * S; x < W - 200 * S; x += 8 * S) {
      let depth = 0;
      for (let k = 0; k < 90 * S; k++) { const y = side === 'n' ? k : H - 1 - k; if (ice[y * W + Math.floor(x)]) depth = k; else break; }
      if (depth > 12 * S && (!best || depth > best.depth)) best = { x, depth };
    }
    if (!best) continue;
    const y = side === 'n' ? best.depth * 0.5 : H - best.depth * 0.5;
    const text = r.pick([(w) => `${w} Land`, (w) => `${w} Ice Sheet`, (w) => `${w} Land`])(namer.word());
    const l = { id: `ice-${side}`, kind: 'region', text, lines: [text], x: Math.round(best.x * 10) / 10, y: Math.round(y * 10) / 10, size: 6 * S, angle: 0, spacing: 0.04, minZoom: 1 };
    const rects = labelRects(l, 0.5 * S);
    if (labels.every((o) => !labelRects(o).some((p) => rects.some((q) => rectsOverlap(p, q))))) out.push(l);
  }
  return out;
}
