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
import { placeLabels } from './labels.mjs';

export const WIDTH = 1600, HEIGHT = 800;
export const PICTURE_SCALE = 1.5; // picture pixels per map unit
// Finer pictures of the same land cover, cut into tiles the page loads only
// for the part of the map in view, when zoomed in: pixels per map unit, and
// the tile's side in pixels. 8 per unit is the 4x zoom on a 2x screen.
export const TILE_LEVELS = [{ scale: 4, size: 1024 }, { scale: 8, size: 1024 }];

// layout: the sketch the land starts from (see terrain.mjs). masses: how many
// continents. latTop/latBottom: the latitudes of the map's top and bottom
// edges. wet: rainfall, 1 is usual. islands: the share of land in islands.
// land: nudges the land share up or down. mountains, lakes, ponds: 1 is usual.
export const WORLDS = [
  { name: 'Le Guin', layout: 'archipelago', masses: 4, latTop: 62, latBottom: 12, wet: 1.1, islands: 0.24, land: -0.02 },
  { name: 'Asimov', layout: 'trio', masses: 3, latTop: 66, latBottom: -30, wet: 1.1 },
  { name: 'Butler', layout: 'twins', masses: 2, latTop: 38, latBottom: -42, wet: 1.1 },
  { name: 'Herbert', layout: 'pangaea', masses: 1, latTop: 46, latBottom: 6, wet: 0.74, land: 0.04, mountains: 1.2 },
  { name: 'Bradbury', layout: 'crescent', masses: 2, latTop: 58, latBottom: 14, wet: 0.88 },
  { name: 'Clarke', layout: 'quad', masses: 4, latTop: 50, latBottom: -50, wet: 1.05 },
  { name: 'Dick', layout: 'northsouth', masses: 2, latTop: 70, latBottom: -20, wet: 1.05 },
  { name: 'Heinlein', layout: 'spine', masses: 2, latTop: 74, latBottom: 20, mountains: 1.4 },
  { name: 'Gibson', layout: 'archipelago', masses: 3, latTop: 52, latBottom: 8, wet: 1.15, islands: 0.2 },
  { name: 'Banks', layout: 'quad', masses: 4, latTop: 30, latBottom: -62, wet: 1.1 },
  { name: 'Lem', layout: 'twins', masses: 2, latTop: 64, latBottom: -10, wet: 1.2, islands: 0.22, land: -0.035 },
  { name: 'Atwood', layout: 'pangaea', masses: 1, latTop: 75, latBottom: 36, wet: 1.05, lakes: 1.6, ponds: 1.6 },
  { name: 'Jemisin', layout: 'pangaea', masses: 1, latTop: 36, latBottom: -36, land: 0.05, mountains: 1.3 },
  { name: 'Delany', layout: 'trio', masses: 3, latTop: 24, latBottom: -24, wet: 1.25 },
  { name: 'Vonnegut', layout: 'twins', masses: 2, latTop: 72, latBottom: 24 },
  { name: 'Verne', layout: 'archipelago', masses: 4, latTop: 40, latBottom: -40, wet: 1.1, islands: 0.26 },
  { name: 'Wells', layout: 'northsouth', masses: 2, latTop: 56, latBottom: -56 },
  { name: 'Shelley', layout: 'crescent', masses: 2, latTop: 80, latBottom: 40, wet: 1.05, lakes: 1.3 },
  { name: 'Tiptree', layout: 'spine', masses: 2, latTop: 28, latBottom: -44, wet: 1.15 },
  { name: 'Chiang', layout: 'ring', masses: 1, latTop: 60, latBottom: -10, wet: 1.05 },
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
  const landShare = clamp(0.3 + 0.0045 * (projects.length - 10) + (style.land ?? 0), 0.3, 0.4);
  // Invented distances: a degree of latitude is 111 km, as at home.
  const kmPerUnit = ((style.latTop - style.latBottom) * 111) / HEIGHT;
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
  // The picture: the same land cover drawn finer, and carried a little way
  // out to sea so the vector coast drawn over it never shows a gap.
  const coverArgs = { fields, elev, land, width, height, rng, style, water: { rivers: main, lakes: hydro.lakes }, bleed: 2 };
  const picture = classifyCover({ ...coverArgs, scale: PICTURE_SCALE });
  return { name, slug: slugOf(name), width, height, style, rng, terrain, elev, land, fields, hydro, cover, ponds, picture, coverArgs };
}

// The land divided among the projects.
export function buildNations(world, projects) {
  const { land, elev, width, height, rng, hydro } = world;
  return buildCountries({ land, elev, width, height, projects, rng, hydro });
}

// Names on the map: countries, provinces, ranges, seas, lakes, and towns.
export function buildLabels(world, nations, projects) {
  const { width, height, rng, land, hydro, terrain } = world;
  const r = rng.fork('towns');
  // Towns: every capital, then a scatter of places by the coast or on a river.
  const towns = nations.capitals.map((c) => ({ x: c.x, y: c.y, capital: true, id: c.id }));
  const sites = nations.cells.filter((c) => c.area > 0 && nations.owner[c.seed] >= 0 && c.elev < 0.2 && (c.coast > 3 || hydro.riverClass[c.seed] >= 2));
  for (const c of r.shuffle(sites).slice(0, 70)) towns.push({ x: (c.seed % width) + 0.5, y: Math.floor(c.seed / width) + 0.5, capital: false });
  return placeLabels({
    owner: nations.owner, provinces: nations.provinces, projects, width, height, rng,
    extras: { land, lakes: hydro.lakes, ranges: terrain.ranges, towns, rivers: hydro.rivers, riverMeta: hydro.riverMeta },
  });
}

// Everything a world's two files are written from.
export function makeWorld(name, projects, opts) {
  const world = buildLand(name, projects, opts);
  const nations = buildNations(world, projects);
  const labels = buildLabels(world, nations, projects);
  return {
    name, slug: world.slug, width: world.width, height: world.height,
    cover: world.cover, ponds: world.ponds, lakes: world.hydro.lakes, picture: world.picture,
    rivers: world.hydro.rivers, riverMeta: world.hydro.riverMeta,
    owner: nations.owner, provinces: nations.provinces, capitals: nations.capitals, areas: nations.areas,
    labels, projects, kmPerUnit: worldParams(name, projects).kmPerUnit,
    land: world.land, elev: world.elev, temp: world.fields.temp, plan: nations.plan,
    coverArgs: world.coverArgs,
  };
}
