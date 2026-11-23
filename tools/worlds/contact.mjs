#!/usr/bin/env node
// Contact sheets: the worlds drawn as the page will draw them, for review.
//
//   node tools/worlds/contact.mjs                 projects/worlds/contact-1.png ... contact-5.png
//   node tools/worlds/contact.mjs --dir some/folder
//   node tools/worlds/contact.mjs --world "Le Guin" --zoom 2 --at 800,400 --to /tmp/le-guin.png
//       one world on its own, at a zoom, centred on a point (for a closer look)
//
// Drawing order, which the page should follow: the land-cover picture, the
// rivers, the sea and the lakes over them (so the picture's pixel edges and
// the rivers' ends are hidden under clean vector water) with no coast line,
// province borders, country borders, and the lettering.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { LINE_HEIGHT } from './labels.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONT = "'Familjen Grotesk', Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// The inside of a world's drawing, in world units, for a given zoom.
// detail (optional): the world's finer detail file, drawn from zoom 1.5.
// tiles (optional): [{ x, y, w, h, png }] finer land-cover pictures over the base.
export function worldSvg(data, pngBuffer, zoom = 1, detail = null, tiles = [], chunks = []) {
  const { width: W, height: H, palette: P } = data;
  const px = 1 / zoom; // one screen pixel, in world units
  const parts = [];
  const D = zoom >= 1.5 ? detail : null;
  parts.push(`<image x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none" image-rendering="optimizeQuality" href="data:image/png;base64,${pngBuffer.toString('base64')}"/>`);
  for (const t of tiles) parts.push(`<image x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" preserveAspectRatio="none" href="data:image/png;base64,${t.png.toString('base64')}"/>`);
  // Parks: only a faint edge, close in.
  if (D && zoom >= 3.9) for (const p of D.parks) parts.push(`<path d="${p.path}" fill="none" stroke="#5fae7d" stroke-opacity="0.45" stroke-width="${0.7 * px}"/>`);
  // Rivers and streams: the water's own blue, thin, no casing.
  const RIVER = '#7fd5e9';
  if (D && zoom >= 2.9 && D.wadis) parts.push(`<path d="${D.wadis}" fill="none" stroke="#e2dccd" stroke-width="${0.8 * px}" stroke-linecap="round" stroke-linejoin="round"/>`);
  if (D && zoom >= 2.9 && D.streams) parts.push(`<path d="${D.streams}" fill="none" stroke="${RIVER}" stroke-width="${0.6 * px}" stroke-linecap="round" stroke-linejoin="round"/>`);
  for (const r of data.rivers) {
    if (r.minZoom > zoom) continue;
    parts.push(`<path d="${r.path}" fill="none" stroke="${D ? RIVER : P.line}" stroke-width="${Math.max(r.width * (D ? 0.8 : 1), (D ? 0.9 : 0.7) * px)}" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  parts.push(`<path d="M0 0H${W}V${H}H0Z${data.coast}" fill="${P.water}" fill-rule="evenodd"/>`);
  if (data.lakes) parts.push(`<path d="${data.lakes}" fill="${P.water}"/>`);
  if (D && D.lakes) parts.push(`<path d="${D.lakes}" fill="${P.water}"/>`);
  for (const c of chunks || []) if (zoom >= 3.4 && c.lakes) parts.push(`<path d="${c.lakes}" fill="${P.water}"/>`);
  if (data.estuaries && data.estuaries.fill) {
    parts.push(`<path d="${data.estuaries.fill}" fill="${P.water}"/>`);
  }
  // The coast's islets, from zoom 3.
  if (D && zoom >= 2.9 && D.islets) for (const [k, fill] of [['sand', '#f6efdc'], ['green', '#c4ead7'], ['rock', '#cbcfca']]) if (D.islets[k]) parts.push(`<path d="${D.islets[k]}" fill="${fill}"/>`);
  // Roads: pale lilac-grey, the highways a little stronger; streets only close in.
  if (D) {
    const R = D.roads;
    const line = (d, colour, w) => d && parts.push(`<path d="${d}" fill="none" stroke="${colour}" stroke-width="${w * px}" stroke-linecap="round" stroke-linejoin="round"/>`);
    for (const c of chunks || []) if (zoom >= 3.4 && c.parks) parts.push(`<path d="${c.parks}" fill="${P.citypark || '#a2debe'}"/>`);
    for (const c of chunks || []) { if (zoom >= 5.85) line(c.minor, '#ffffff', 0.7); if (zoom >= 3.4) line(c.street, '#ffffff', 0.9); }
    if (D.bridges) { if (zoom >= 3.4) line(D.bridges.minor, '#c9ced9', 3); line(D.bridges.major, '#c9ced9', zoom >= 3.9 ? 4.8 : 3.4); }
    if (zoom >= 3.4) line(R.local, '#c3c9dc', 0.9);
    if (zoom >= 2.4) line(R.secondary, '#b4bdd6', zoom >= 3.9 ? 1.4 : 1.1);
    if (zoom >= 3.4) line(R.arterial, '#ffffff', zoom >= 4.9 ? 2 : 1.2);
    line(R.ring, '#a6b2cf', zoom >= 3.9 ? 1.8 : 1.2);
    line(R.trunk, '#a6b2cf', zoom >= 3.9 ? 1.8 : 1.3);
    line(R.motorway, '#94a3c4', zoom >= 3.9 ? 2.6 : 1.8);
    if (D.causeway) { line(D.causeway, '#e9eadf', 3.2); line(D.causeway, '#b4bdd6', 1.2); }
    if (D.ferries) parts.push(`<path d="${D.ferries}" fill="none" stroke="#5c9fc0" stroke-width="${0.8 * px}" stroke-dasharray="${3 * px} ${2.5 * px}"/>`);
    if (D.admin) parts.push(`<path d="${D.admin}" fill="none" stroke="#9aa0a6" stroke-width="${0.7 * px}" stroke-dasharray="${2 * px} ${1.6 * px}"/>`);
  }
  if (data.provinceBorders) parts.push(`<path d="${data.provinceBorders}" fill="none" stroke="${P.province}" stroke-width="${0.8 * px}" stroke-dasharray="${3 * px} ${2.2 * px}" stroke-linejoin="round"/>`);
  if (data.borders) parts.push(`<path d="${data.borders}" fill="none" stroke="${P.border}" stroke-width="${1 * px}" stroke-linejoin="round" stroke-linecap="round"/>`);

  const text = [];
  const FILL = { range: '#6b6f72', province: P.province, park: '#1f6b45', region: '#6f7c74', island: '#5f6368', cape: '#5f6368', peak: '#4a4d52', village: '#3c3f44' };
  const all = D ? [...data.labels, ...D.labels] : data.labels;
  for (const l of all) {
    if (l.minZoom > zoom) continue;
    const lines = l.lines || [l.text];
    const water = ['sea', 'ocean', 'gulf', 'bay', 'lake', 'strait', 'channel', 'sound', 'fjord', 'lagoon', 'harbour', 'inlet', 'cove', 'river'].includes(l.kind);
    const fill = water ? '#3c8ea1' : FILL[l.kind] || P.label;
    const weight = l.kind === 'country' || l.kind === 'capital' || l.kind === 'city' ? 600 : 500;
    const style = water || l.kind === 'region' || l.kind === 'park' ? ' font-style="italic"' : '';
    const track = l.spacing ? ` letter-spacing="${(l.spacing * l.size).toFixed(2)}"` : '';
    // letter-spacing follows every letter, the last one too; shift half of it back.
    const nudge = l.spacing ? (l.spacing * l.size) / 2 : 0;
    const halo = water ? P.water : '#ffffff';
    if (l.path) {
      // Lettering along the river's course.
      const id = `p${text.length}`;
      const d = 'M' + l.path.map(([x, y]) => `${x} ${y}`).join('L');
      text.push(`<path id="${id}" d="${d}" fill="none"/>`);
      const common = `font-size="${l.size}" font-weight="${weight}"${style}${track} dy="${(l.size * 0.355).toFixed(2)}"`;
      const tp = `<textPath href="#${id}" startOffset="50%" text-anchor="middle">${esc(l.text)}</textPath>`;
      text.push(`<text ${common} fill="none" stroke="#ffffff" stroke-opacity="0.8" stroke-width="${(l.size * 0.2).toFixed(2)}" stroke-linejoin="round">${tp}</text>`);
      text.push(`<text ${common} fill="${fill}">${tp}</text>`);
      continue;
    }
    if (l.kind === 'shield') {
      // A route number on a small rounded plate.
      const w = (l.text.length * 0.62 + 0.7) * l.size, h = l.size * 1.35;
      const [fill, edge, ink] = SIGNS[l.shield] || SIGNS.yellow;
      text.push(`<rect x="${(l.x - w / 2).toFixed(2)}" y="${(l.y - h / 2).toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" rx="${(h * 0.28).toFixed(2)}" fill="${fill}" stroke="${edge}" stroke-width="${(l.size * 0.09).toFixed(2)}"/>`);
      text.push(`<text x="${l.x}" y="${(l.y + l.size * 0.36).toFixed(2)}" font-size="${(l.size * 0.95).toFixed(2)}" font-weight="600" text-anchor="middle" fill="${ink}">${esc(l.text)}</text>`);
      continue;
    }
    lines.forEach((line, k) => {
      const sz = l.kind === 'peak' && k > 0 ? l.size * 0.85 : l.size;
      const off = (k - (lines.length - 1) / 2) * LINE_HEIGHT * l.size + l.size * 0.355;
      const common = `transform="translate(${l.x} ${l.y}) rotate(${l.angle})" x="${nudge.toFixed(2)}" y="${off.toFixed(2)}" font-size="${sz}" font-weight="${weight}"${style}${track} text-anchor="middle"`;
      text.push(`<text ${common} fill="none" stroke="${halo}" stroke-opacity="${water ? 0.5 : 0.85}" stroke-width="${(l.size * 0.2).toFixed(2)}" stroke-linejoin="round">${esc(line)}</text>`);
      text.push(`<text ${common} fill="${fill}">${esc(line)}</text>`);
    });
    if (l.dot) text.push(symbol(l));
  }
  return `${parts.join('\n')}\n<g font-family="${FONT}">${text.join('\n')}</g>`;
}

// Route signs: fill, edge, and lettering, by style.
const SIGNS = { yellow: ['#f9dc59', '#b9ab6f', '#3c3f44'], green: ['#3f8f4f', '#ffffff', '#ffffff'], euro: ['#3f8f4f', '#ffffff', '#ffffff'], blue: ['#2f63b5', '#ffffff', '#ffffff'], red: ['#c4473a', '#ffffff', '#ffffff'], white: ['#ffffff', '#6b6f72', '#3c3f44'], badge: ['#ffffff', '#3c3f44', '#3c3f44'], interstate: ['#2f5aa8', '#c4473a', '#ffffff'], brown: ['#7a5a3a', '#ffffff', '#ffffff'] };

// A place's symbol, after the reference's conventions: a white dot in a dark
// ring for towns (larger for cities, smaller for villages), a ring with a dark
// centre for capitals, and a small triangle for peaks.
export function symbol(l) {
  const [x, y] = l.dot;
  if (l.kind === 'peak') {
    const s = l.size * 0.42;
    return `<path d="M${x} ${(y - s).toFixed(2)}L${(x + s * 0.95).toFixed(2)} ${(y + s * 0.7).toFixed(2)}L${(x - s * 0.95).toFixed(2)} ${(y + s * 0.7).toFixed(2)}Z" fill="#5f6368"/>`;
  }
  const R = { capital: 0.34, city: 0.3, town: 0.25, village: 0.22 };
  const rad = l.size * (R[l.kind] || 0.24);
  let s = `<circle cx="${x}" cy="${y}" r="${rad.toFixed(2)}" fill="#ffffff" stroke="#4a4d52" stroke-width="${(rad * (l.kind === 'village' ? 0.4 : 0.5)).toFixed(2)}"/>`;
  if (l.kind === 'capital') s += `<circle cx="${x}" cy="${y}" r="${(rad * 0.42).toFixed(2)}" fill="#3c3f44"/>`;
  return s;
}

export function renderSvg(svg, widthPx) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: widthPx }, font: { loadSystemFonts: true, defaultFontFamily: 'Inter' }, background: '#ffffff' });
  return resvg.render().asPng();
}

function loadWorld(dir, slug) {
  const data = JSON.parse(readFileSync(join(dir, `${slug}.json`), 'utf8'));
  const dfile = data.detail && join(dir, data.detail.src);
  const detail = dfile && existsSync(dfile) ? JSON.parse(readFileSync(dfile, 'utf8')) : null;
  const chunks = [];
  const C = data.detail && data.detail.chunks;
  if (C) for (let r = 0; r < C.rows; r++) for (let c = 0; c < C.cols; c++) { const f = join(dir, C.src, `${c}-${r}.json`); if (existsSync(f)) chunks.push(JSON.parse(readFileSync(f, 'utf8'))); }
  return { data, png: readFileSync(join(dir, `${slug}.png`)), detail, chunks };
}
// The finer tiles that cover a view, at the coarsest level with `need` pixels per unit.
function tilesFor(dir, data, need, x0, y0, vw, vh) {
  const T = data.tiles;
  if (!T || !T.levels || need <= data.image.width / data.width * 1.3) return [];
  let lv = T.levels[T.levels.length - 1];
  for (const l of T.levels) if (l.scale >= need) { lv = l; break; }
  const out = [];
  for (let row = 0; row < lv.rows; row++) for (let col = 0; col < lv.cols; col++) {
    const i = row * lv.cols + col;
    if (!((parseInt(lv.has.charAt(i >> 2), 16) >> (i & 3)) & 1)) continue;
    const tx = col * lv.unit, ty = row * lv.unit;
    if (ty > y0 + vh || ty + lv.unit < y0) continue;
    for (const o of [-data.width, 0, data.width]) {
      if (tx + o > x0 + vw || tx + o + lv.unit < x0) continue;
      const f = join(dir, T.src, String(lv.scale), `${col}-${row}.png`);
      if (!existsSync(f)) continue;
      const w = Math.min(lv.unit, data.width - tx), h = Math.min(lv.unit, data.height - ty);
      out.push({ x: tx, y: ty, w, h, png: readFileSync(f), o });
    }
  }
  return out;
}

// One world alone: a view `viewW` world units wide centred on (cx, cy).
export function renderWorld(dir, slug, { zoom = 1, cx, cy, widthPx = 1600 } = {}) {
  const { data, png, detail, chunks } = loadWorld(dir, slug);
  const vw = data.width / zoom, vh = data.height / zoom;
  // The world wraps east and west, as the page's does: a view across the seam
  // shows the next copy of the world.
  const x0 = (cx ?? data.width / 2) - vw / 2;
  const y0 = Math.min(Math.max(0, (cy ?? data.height / 2) - vh / 2), data.height - vh);
  const copies = [-data.width, 0, data.width].filter((o) => x0 < o + data.width && x0 + vw > o);
  const tiles = tilesFor(dir, data, (widthPx / data.width) * zoom, x0, y0, vw, vh);
  const body = copies.map((o) => {
    const inner = worldSvg(data, png, zoom, detail, tiles.filter((t) => t.o === o), chunks);
    return o ? `<g transform="translate(${o} 0)">${inner}</g>` : inner;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${vw} ${vh}" width="${widthPx}" height="${widthPx / 2}">${body}</svg>`;
  return renderSvg(svg, widthPx);
}

// A sheet of up to four worlds, two by two, each titled with its name.
export function renderSheet(dir, worlds, { tile = 1200 } = {}) {
  const gap = 28, head = 46, tileH = tile / 2;
  const cols = 2, rows = Math.ceil(worlds.length / cols);
  const sheetW = cols * tile + (cols + 1) * gap, sheetH = rows * (tileH + head) + (rows + 1) * gap;
  const parts = [`<rect width="${sheetW}" height="${sheetH}" fill="#f4f4f1"/>`];
  worlds.forEach((w, k) => {
    const { data, png } = loadWorld(dir, w.slug);
    const x = gap + (k % cols) * (tile + gap), y = gap + Math.floor(k / cols) * (tileH + head + gap);
    const lat = w.note ? ` <tspan font-weight="400" fill="#6b6f72" font-size="17">${esc(w.note)}</tspan>` : '';
    parts.push(`<text x="${x}" y="${y + 30}" font-family="${FONT}" font-size="26" font-weight="700" fill="#26262a">${esc(data.name)}${lat}</text>`);
    parts.push(`<svg x="${x}" y="${y + head}" width="${tile}" height="${tileH}" viewBox="0 0 ${data.width} ${data.height}">${worldSvg(data, png, 1)}</svg>`);
    parts.push(`<rect x="${x}" y="${y + head}" width="${tile}" height="${tileH}" fill="none" stroke="#c9c9c4" stroke-width="1"/>`);
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${sheetW}" height="${sheetH}" viewBox="0 0 ${sheetW} ${sheetH}">${parts.join('\n')}</svg>`;
  return renderSvg(svg, sheetW);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  let dir = join(root, 'projects', 'worlds'), one = null, zoom = 1, at = null, to = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir') dir = args[++i];
    else if (args[i] === '--world') one = args[++i];
    else if (args[i] === '--zoom') zoom = Number(args[++i]);
    else if (args[i] === '--at') at = args[++i].split(',').map(Number);
    else if (args[i] === '--to') to = args[++i];
    else { console.error(`unknown argument ${args[i]}`); process.exit(1); }
  }
  const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'));
  if (one) {
    const entry = index.find((w) => w.name === one || w.slug === one);
    if (!entry) { console.error(`no world named "${one}"`); process.exit(1); }
    const file = to || join(dir, `look-${entry.slug}-z${zoom}.png`);
    writeFileSync(file, renderWorld(dir, entry.slug, { zoom, cx: at?.[0], cy: at?.[1] }));
    console.log(file);
  } else {
    for (let s = 0; s * 4 < index.length; s++) {
      const file = join(dir, `contact-${s + 1}.png`);
      const png = renderSheet(dir, index.slice(s * 4, s * 4 + 4));
      writeFileSync(file, png);
      console.log(`${file}  ${(png.length / 1024).toFixed(0)} KB  (${index.slice(s * 4, s * 4 + 4).map((w) => w.name).join(', ')})`);
    }
  }
}
