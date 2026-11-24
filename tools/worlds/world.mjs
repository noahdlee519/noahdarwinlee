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
import { placeLabels, labelRects, rectsOverlap } from './labels.mjs';
import { buildSettlements, RANK } from './settlements.mjs';
import { buildRoads } from './roads.mjs';
import { buildStreets } from './towns.mjs';
import { buildParks, buildAdmin, buildStreams, placeDetailLabels } from './features.mjs';
import { assignCultures, CAPITAL_NAMES } from './cultures.mjs';
import { warpRivers, buildSmallLakes, findVolcanoes } from './lakes.mjs';
import { buildPolar, placeAbout } from './polar.mjs';
import { coastDistance } from './terrain.mjs';
import { carveFjords, buildIslets } from './coasts.mjs';

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
// polar.mjs: volcano, atoll, crescent, fjord, lake, lighthouse, causeway, or ferry).
export const WORLDS = [
  { name: 'Le Guin', layout: 'archipelago', masses: 4, latTop: 62, latBottom: 12, wet: 1.1, islands: 0.24, land: -0.02, about: 'lighthouse' },
  { name: 'Asimov', layout: 'trio', masses: 3, latTop: 66, latBottom: -30, wet: 1.1, about: 'crescent' },
  { name: 'Butler', layout: 'twins', masses: 2, latTop: 38, latBottom: -42, wet: 0.95, mountains: 0.8, roughness: 0.85, about: 'causeway' },
  { name: 'Herbert', layout: 'pangaea', masses: 1, latTop: 46, latBottom: 6, wet: 0.7, land: 0.09, mountains: 1.2, about: 'lake' },
  { name: 'Bradbury', layout: 'crescent', masses: 2, latTop: 58, latBottom: 14, wet: 0.74, warm: 2, about: 'volcano' },
  { name: 'Clarke', layout: 'quad', masses: 4, latTop: 50, latBottom: -50, wet: 1.05, mountains: 0.75, roughness: 1.25, about: 'ferry' },
  { name: 'Zelazny', layout: 'northsouth', masses: 2, latTop: 70, latBottom: -20, wet: 1.05, ice: 'n', about: 'fjord', polar: 'isthmus' },
  { name: 'Heinlein', layout: 'spine', masses: 2, latTop: 74, latBottom: 20, mountains: 1.6, about: 'lake' },
  { name: 'Gibson', layout: 'archipelago', masses: 3, latTop: 52, latBottom: 8, wet: 1.15, islands: 0.28, land: -0.04, about: 'atoll' },
  { name: 'Banks', layout: 'quad', masses: 4, latTop: 30, latBottom: -62, wet: 1.1, roughness: 1.2, ice: 's', about: 'crescent', polar: 'strait' },
  { name: 'Lem', layout: 'twins', masses: 2, latTop: 64, latBottom: -10, wet: 1.2, islands: 0.22, land: -0.035, about: 'causeway' },
  { name: 'Atwood', layout: 'pangaea', masses: 1, latTop: 75, latBottom: 36, wet: 1.05, lakes: 1.6, ponds: 1.6, ice: 'n', about: 'fjord', polar: 'strait' },
  { name: 'Jemisin', layout: 'pangaea', masses: 1, latTop: 36, latBottom: -36, wet: 0.82, land: 0.1, mountains: 1.4, volcanoes: 3, about: 'volcano' },
  { name: 'Delany', layout: 'trio', masses: 3, latTop: 24, latBottom: -24, wet: 1.3, warm: 1, about: 'atoll' },
  { name: 'Vonnegut', layout: 'twins', masses: 2, latTop: 72, latBottom: 24, about: 'lighthouse' },
  { name: 'Verne', layout: 'archipelago', masses: 4, latTop: 40, latBottom: -40, wet: 0.86, islands: 0.32, land: -0.07, volcanoes: 3, about: 'volcano' },
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
  // Fjords, cut into the cold mountainous coasts.
  const fjords = carveFjords({ land, elev, width, height, rng, style });
  if (fjords.length) terrain.dist = coastDistance(land, width, height);
  // The polar land, where the world has one: what of it joins a project's land becomes that land.
  const polar = buildPolar({ land, width, height, rng, sides: style.ice, link: style.polar });
  let claimed = 0;
  for (let i = 0; i < land.length; i++) if (polar.claim[i]) { land[i] = 1; elev[i] = Math.max(elev[i], 0.025); claimed++; }
  if (claimed) terrain.dist = coastDistance(land, width, height);
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
  const about = placeAbout({ land, ice, lakes: hydro.lakes, width, height, rng, kind: style.about, temp: fields.temp });
  const landAll = new Uint8Array(width * height);
  for (let i = 0; i < landAll.length; i++) landAll[i] = land[i] || ice[i] || (about && about.mask[i]) ? 1 : 0;
  // An island in a lake: the lake's water goes on round it, and the island is in no country.
  if (about && about.kind === 'lake') for (let i = 0; i < landAll.length; i++) if (about.mask[i]) hydro.lakes[i] = 0;
  // The picture is drawn in makeWorld, once the towns, lakes, and roads are known; it is carried a little way out to
  // sea so the vector coast drawn over it never shows a gap.
  const coverArgs = { fields, elev, land: landAll, width, height, rng, style, water: { rivers: main, lakes: hydro.lakes }, bleed: 2, ice, flow: hydro.acc, dist: terrain.dist, basins, oases, polar: polar.cover, about: about && about.cover };
  return { name, slug: slugOf(name), width, height, style, rng, terrain, elev, land, landAll, ice, polar, about, fields, hydro, cover, ponds, coverArgs, oases, fjords };
}

// The land divided among the projects.
export function buildNations(world, projects) {
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
      temp: world.fields.temp, elev: world.elev,
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
  // An exclave, in most worlds: a small piece of a flagship's coast, far from its capital, held by one of the small
  // countries beyond it (see exclaveFor). The flagship's main body stays whole and the size order stands.
  const exclave = exclaveFor({ owner, nations, projects, land, dist: terrain.dist, width, height, rng });
  // An About island in a lake is in no country.
  if (world.about && world.about.kind === 'lake') for (let i = 0; i < owner.length; i++) if (world.about.mask[i]) owner[i] = -1;
  const cultures = assignCultures(projects, rng, neighbours(owner, projects.length, width, height));
  // Rivers as drawn: smoothed, and meandering on the lowland.
  const { rivers: drawnRivers, warp } = warpRivers(hydro.rivers, hydro.riverMeta, { land, elev, dist: terrain.dist, width, height, rng });
  // Small water: kettle lakes, tarns, finger lakes, oxbows, marsh ponds, reservoirs, and crater lakes.
  const volcanoes = findVolcanoes({ land, elev, width, height, rng, count: style.volcanoes ?? (rng.fork('vn').chance(0.6) ? 2 : 0) });
  const smallLakes = buildSmallLakes({ land, elev, temp: fields.temp, moist: fields.moist, hydro, dist: terrain.dist, style, width, height, rng, drawnRivers, volcanoes, keepClear: nations.capitals });
  const settlements = buildSettlements({ land, elev, temp: fields.temp, cover, hydro, dist: terrain.dist, owner, capitals: nations.capitals, areas: nations.areas, projects, width, height, rng, blocked: smallLakes.mask, oases: world.oases });
  // Every place's name, in its country's language; some capitals nod to their project.
  for (const s of settlements) {
    const p = projects[s.country];
    s.name = s.rank === RANK.CAPITAL && CAPITAL_NAMES[p.id] ? CAPITAL_NAMES[p.id] : cultures[s.country].namer.town();
  }
  const roads = buildRoads({ land, elev, hydro, owner, settlements, blocked: smallLakes.mask, cultures, projects, width, height, rng });
  const { streets, builtKind, layouts, cityParks, urbanRings } = buildStreets({ settlements, exits: roads.exits, cultures, land, elev, hydro, blocked: smallLakes.mask, width, height, rng, dist: terrain.dist, rivers: drawnRivers, riverMeta: hydro.riverMeta, areas: nations.areas, projects });
  settlements.forEach((s, k) => { s.layout = layouts[k].type; s.ringRoad = layouts[k].ring; s.shape = layouts[k].shape; });
  // The About island's own detail: a little town and its lighthouse, a causeway, or a ferry to the mainland.
  const about = world.about;
  if (about && about.town) {
    const [tx, ty, tr] = about.town, ar = rng.fork('about-town');
    const th = ar.next() * Math.PI, c = Math.cos(th), sn = Math.sin(th);
    const ok = (p) => about.mask[Math.floor(p[1]) * width + Math.floor(p[0])] && Math.hypot(p[0] - tx, p[1] - ty) < tr * 1.1;
    for (let k = -2; k <= 2; k++) for (const along of [0, 1]) {
      const pts = [];
      for (let t = -tr; t <= tr; t += 0.25) { const u = along ? t : k * 0.45, v = along ? k * 0.45 : t; pts.push([tx + c * u - sn * v, ty + sn * u + c * v]); }
      let run = [];
      for (const p of pts) { if (ok(p)) run.push(p); else { if (run.length > 1) streets.push({ cls: k ? 'minor' : 'street', pts: run }); run = []; } }
      if (run.length > 1) streets.push({ cls: k ? 'minor' : 'street', pts: run });
    }
  }
  if (about && about.kind === 'ferry' && about.dock) {
    let best = null, bd = Infinity;
    for (const s of settlements) { if (s.rank > RANK.TOWN) continue; const d = Math.hypot(s.x - about.dock[0], s.y - about.dock[1]); if (d < bd) { bd = d; best = s; } }
    if (best) roads.ferries.push([about.dock, [best.x, best.y]]);
  }
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
  if (about && about.lighthouse) {
    const [lx, ly] = about.lighthouse, S1 = width / 1600;
    for (const [dx, dy] of [[0, 2.4], [0, -2.4], [6, 0], [-6, 0]]) {
      const l = { id: 'about-light', kind: 'cape', text: 'Lighthouse', lines: ['Lighthouse'], x: Math.round((lx + dx * S1) * 10) / 10, y: Math.round((ly + dy * S1) * 10) / 10, size: 2.6 * S1, angle: 0, spacing: 0, minZoom: 4, dot: [Math.round(lx * 10) / 10, Math.round(ly * 10) / 10] };
      const rects = labelRects(l, 0.3 * S1);
      if ([...labels, ...detailLabels].every((o) => !labelRects(o).some((p) => rects.some((q) => rectsOverlap(p, q))))) { detailLabels.push(l); break; }
    }
  }
  return {
    name, slug: world.slug, width: world.width, height: world.height,
    cover: world.cover, ponds: world.ponds, lakes: world.hydro.lakes, picture,
    settlements, cultures, smallLakes, ice: world.ice, about: world.about, polar: world.polar, exclave,
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

// The About island's name, beside it.
function labelAbout(world, labels) {
  const a = world.about;
  if (!a) return null;
  const S = world.width / 1600, size = 3.6 * S;
  const R = (a.r || 6.5 * S) / S, cx = a.cx ?? a.x, cy = a.cy ?? a.y;
  let spots = [[0, R + 2.4], [0, -R - 2.4], [R + 6.5, 0], [-R - 6.5, 0], [0, 7.5], [0, -7.5]];
  // Clear of the causeway or the ferry: on the side away from the mainland.
  if (a.dock) { const ux = a.dock[0] - cx, uy = a.dock[1] - cy; spots = spots.map((p, k) => [p, k]).sort((p, q) => p[0][0] * ux + p[0][1] * uy - (q[0][0] * ux + q[0][1] * uy) || p[1] - q[1]).map((e) => e[0]); }
  for (const [dx, dy] of spots) {
    const l = { id: 'about', kind: 'island', text: 'About', lines: ['About'], x: Math.round((cx + dx * S) * 10) / 10, y: Math.round((cy + dy * S) * 10) / 10, size, angle: 0, spacing: 0, minZoom: 1 };
    const rects = labelRects(l, 0.5 * S);
    if (labels.every((o) => !labelRects(o).some((p) => rects.some((q) => rectsOverlap(p, q))))) return l;
  }
  return null;
}
