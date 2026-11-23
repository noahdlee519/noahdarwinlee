#!/usr/bin/env node
// Make the worlds for the portfolio map.
//
//   node tools/worlds/generate.mjs                    all twenty
//   node tools/worlds/generate.mjs --world "Le Guin"  one (repeat --world for more)
//   node tools/worlds/generate.mjs --out some/folder  somewhere else
//   node tools/worlds/generate.mjs --labels-only      rewrite only the world files' vectors
//       and labels, keeping the pictures and tiles already written (it stops if
//       the land has changed, since the pictures would then be stale)
//
// Reads portfolio-map/projects.json; writes <slug>.json and <slug>.png per
// world, and index.json listing the twenty in order.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORLDS, slugOf, makeWorld } from './world.mjs';
import { writeWorld, buildWorldFiles } from './output.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function readProjects(file = join(root, 'portfolio-map', 'projects.json')) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

export function generate({ names = WORLDS.map((w) => w.name), outDir = join(root, 'portfolio-map', 'worlds'), projects = readProjects(), log = () => {}, labelsOnly = false } = {}) {
  mkdirSync(outDir, { recursive: true });
  const sizes = [];
  for (const name of names) {
    const started = Date.now();
    const world = makeWorld(name, projects);
    if (labelsOnly) {
      const { data, png } = buildWorldFiles(world);
      const pngFile = join(outDir, `${world.slug}.png`), jsonFile = join(outDir, `${world.slug}.json`);
      if (!existsSync(pngFile) || !readFileSync(pngFile).equals(png)) throw new Error(`${name}: the land cover has changed; run without --labels-only`);
      data.tiles = JSON.parse(readFileSync(jsonFile, 'utf8')).tiles;
      const json = JSON.stringify(data);
      writeFileSync(jsonFile, json);
      sizes.push({ name, slug: world.slug, jsonBytes: Buffer.byteLength(json), pngBytes: png.length });
      log(`${name.padEnd(9)} ${(Buffer.byteLength(json) / 1024).toFixed(0).padStart(4)} KB json (picture and tiles kept)   ${((Date.now() - started) / 1000).toFixed(1)} s`);
      continue;
    }
    const { jsonBytes, pngBytes, tileBytes, tileCount, detailBytes } = writeWorld(world, outDir);
    sizes.push({ name, slug: world.slug, jsonBytes, pngBytes, tileBytes, tileCount });
    log(`${name.padEnd(9)} ${(jsonBytes / 1024).toFixed(0).padStart(4)} KB json + ${(pngBytes / 1024).toFixed(0).padStart(3)} KB png = ${((jsonBytes + pngBytes) / 1024).toFixed(0).padStart(3)} KB at first, + ${(detailBytes / 1024).toFixed(0)} KB detail, then ${tileCount} tiles, ${(tileBytes / 1024).toFixed(0)} KB in all   ${((Date.now() - started) / 1000).toFixed(1)} s`);
  }
  // The index always lists all twenty, in order, whichever were just made.
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(WORLDS.map((w) => ({ name: w.name, slug: slugOf(w.name) })), null, 1) + '\n');
  return sizes;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const names = [];
  let outDir, labelsOnly = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--world') names.push(args[++i]);
    else if (args[i] === '--out') outDir = args[++i];
    else if (args[i] === '--labels-only') labelsOnly = true;
    else { console.error(`unknown argument ${args[i]}`); process.exit(1); }
  }
  for (const n of names) if (!WORLDS.some((w) => w.name === n)) { console.error(`no world named "${n}"; the worlds are ${WORLDS.map((w) => w.name).join(', ')}`); process.exit(1); }
  const opts = { log: console.log };
  if (names.length) opts.names = names;
  if (outDir) opts.outDir = outDir;
  if (labelsOnly) opts.labelsOnly = true;
  generate(opts);
}
