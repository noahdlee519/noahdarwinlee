#!/usr/bin/env node
// Contact sheets: the worlds drawn as the page will draw them, for review.
//
//   node tools/worlds/contact.mjs                 portfolio-map/worlds/contact-1.png ... contact-5.png
//   node tools/worlds/contact.mjs --dir some/folder
//   node tools/worlds/contact.mjs --world "Le Guin" --zoom 2 --at 800,400 --to /tmp/le-guin.png
//       one world on its own, at a zoom, centred on a point (for a closer look)
//
// Drawing order, which the page should follow: the land-cover picture, the
// rivers, the sea and the lakes over them (so the picture's pixel edges and
// the rivers' ends are hidden under clean vector water), the coast line,
// province borders, country borders, and the lettering.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { LINE_HEIGHT } from './labels.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONT = "'Familjen Grotesk', Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// The inside of a world's drawing, in world units, for a given zoom.
export function worldSvg(data, pngBuffer, zoom = 1) {
  const { width: W, height: H, palette: P } = data;
  const px = 1 / zoom; // one screen pixel, in world units
  const parts = [];
  parts.push(`<image x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none" image-rendering="optimizeQuality" href="data:image/png;base64,${pngBuffer.toString('base64')}"/>`);
  for (const r of data.rivers) {
    if (r.minZoom > zoom) continue;
    parts.push(`<path d="${r.path}" fill="none" stroke="${P.line}" stroke-width="${Math.max(r.width, 0.7 * px)}" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  parts.push(`<path d="M0 0H${W}V${H}H0Z${data.coast}" fill="${P.water}" fill-rule="evenodd"/>`);
  if (data.lakes) parts.push(`<path d="${data.lakes}" fill="${P.water}" stroke="${P.line}" stroke-width="${0.45 * px}"/>`);
  parts.push(`<path d="${data.coast}" fill="none" stroke="${P.line}" stroke-width="${0.7 * px}" stroke-linejoin="round"/>`);
  if (data.provinceBorders) parts.push(`<path d="${data.provinceBorders}" fill="none" stroke="${P.province}" stroke-width="${0.8 * px}" stroke-dasharray="${3 * px} ${2.2 * px}" stroke-linejoin="round"/>`);
  if (data.borders) parts.push(`<path d="${data.borders}" fill="none" stroke="${P.border}" stroke-width="${1 * px}" stroke-linejoin="round" stroke-linecap="round"/>`);

  const text = [];
  for (const l of data.labels) {
    if (l.minZoom > zoom) continue;
    const lines = l.lines || [l.text];
    const water = l.kind === 'sea' || l.kind === 'ocean' || l.kind === 'lake';
    const fill = water ? '#3c8ea1' : l.kind === 'range' ? '#6b6f72' : l.kind === 'province' ? P.province : P.label;
    const weight = l.kind === 'country' ? 600 : l.kind === 'capital' ? 600 : 500;
    const style = water ? ' font-style="italic"' : '';
    const track = l.spacing ? ` letter-spacing="${(l.spacing * l.size).toFixed(2)}"` : '';
    // letter-spacing follows every letter, the last one too; shift half of it back.
    const nudge = l.spacing ? (l.spacing * l.size) / 2 : 0;
    const halo = water ? P.water : '#ffffff';
    lines.forEach((line, k) => {
      const off = (k - (lines.length - 1) / 2) * LINE_HEIGHT * l.size + l.size * 0.355;
      const common = `transform="translate(${l.x} ${l.y}) rotate(${l.angle})" x="${nudge.toFixed(2)}" y="${off.toFixed(2)}" font-size="${l.size}" font-weight="${weight}"${style}${track} text-anchor="middle"`;
      text.push(`<text ${common} fill="none" stroke="${halo}" stroke-opacity="${water ? 0.5 : 0.85}" stroke-width="${(l.size * 0.2).toFixed(2)}" stroke-linejoin="round">${esc(line)}</text>`);
      text.push(`<text ${common} fill="${fill}">${esc(line)}</text>`);
    });
    if (l.dot) {
      const rad = l.size * (l.kind === 'capital' ? 0.3 : 0.24);
      text.push(`<circle cx="${l.dot[0]}" cy="${l.dot[1]}" r="${rad.toFixed(2)}" fill="#ffffff" stroke="${P.label}" stroke-width="${(rad * 0.55).toFixed(2)}"/>`);
      if (l.kind === 'capital') text.push(`<circle cx="${l.dot[0]}" cy="${l.dot[1]}" r="${(rad * 0.35).toFixed(2)}" fill="${P.label}"/>`);
    }
  }
  return `${parts.join('\n')}\n<g font-family="${FONT}">${text.join('\n')}</g>`;
}

export function renderSvg(svg, widthPx) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: widthPx }, font: { loadSystemFonts: true, defaultFontFamily: 'Inter' }, background: '#ffffff' });
  return resvg.render().asPng();
}

function loadWorld(dir, slug) {
  return { data: JSON.parse(readFileSync(join(dir, `${slug}.json`), 'utf8')), png: readFileSync(join(dir, `${slug}.png`)) };
}

// One world alone: a view `viewW` world units wide centred on (cx, cy).
export function renderWorld(dir, slug, { zoom = 1, cx, cy, widthPx = 1600 } = {}) {
  const { data, png } = loadWorld(dir, slug);
  const vw = data.width / zoom, vh = data.height / zoom;
  const x0 = Math.min(Math.max(0, (cx ?? data.width / 2) - vw / 2), data.width - vw);
  const y0 = Math.min(Math.max(0, (cy ?? data.height / 2) - vh / 2), data.height - vh);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${vw} ${vh}" width="${widthPx}" height="${widthPx / 2}">${worldSvg(data, png, zoom)}</svg>`;
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
  let dir = join(root, 'portfolio-map', 'worlds'), one = null, zoom = 1, at = null, to = null;
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
