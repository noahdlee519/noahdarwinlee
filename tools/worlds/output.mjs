// Output: one vector JSON and one palette PNG per world.
//
// Outlines are traced from the pixel grids as a set of arcs between junctions
// (where three regions meet), so a border shared by two countries is one
// line, simplified once, and the two countries' outlines fit together with
// no gap or overlap. Each arc is simplified (Douglas–Peucker), snapped to a
// 0.2 grid, and written as a smooth curve through the midpoints of its
// segments, in relative path commands to keep the file small.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { encodeIndexedPng, hexToRgb } from './png.mjs';

export const PALETTE = {
  forest: '#a2debe', woodland: '#b3e3cc', grass: '#c4ead7', steppe: '#f3efe4', desert: '#faf7f3',
  rock: '#cbcfca', snow: '#ffffff', water: '#89d1e2', line: '#4da9bb', border: '#26262a',
  province: '#606266', label: '#26262a',
};
// Palette order in the PNG: the seven land-cover classes by index, then water.
const PNG_COLOURS = ['forest', 'woodland', 'grass', 'steppe', 'desert', 'rock', 'snow', 'water'];

// ------------------------------------------------------------- tracing --

// Trace the boundaries of a region grid. key(i) gives a pixel's region; out
// of bounds counts as `outside`. Returns arcs: { pts: [[x, y], ...] (grid
// corners), left, right (region keys either side, facing along the arc),
// closed }.
export function traceArcs(key, W, H, outside = -1) {
  const VW = W + 1;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? outside : key[y * W + x]);
  // Edge flags per grid corner: bit 0 = the edge running right from it,
  // bit 1 = the edge running down from it.
  const edges = new Uint8Array(VW * (H + 1));
  for (let y = 0; y <= H; y++) for (let x = 0; x <= W; x++) {
    let f = 0;
    if (x < W && at(x, y - 1) !== at(x, y)) f |= 1;
    if (y < H && at(x - 1, y) !== at(x, y)) f |= 2;
    edges[y * VW + x] = f;
  }
  const has = (x, y, dir) => { // dir: 0 right, 1 down, 2 left, 3 up
    if (dir === 0) return x < W && (edges[y * VW + x] & 1) !== 0;
    if (dir === 1) return y < H && (edges[y * VW + x] & 2) !== 0;
    if (dir === 2) return x > 0 && (edges[y * VW + x - 1] & 1) !== 0;
    return y > 0 && (edges[(y - 1) * VW + x] & 2) !== 0;
  };
  const degree = (x, y) => (has(x, y, 0) ? 1 : 0) + (has(x, y, 1) ? 1 : 0) + (has(x, y, 2) ? 1 : 0) + (has(x, y, 3) ? 1 : 0);
  // Visited flags per edge, stored at the edge's upper-left corner.
  const used = new Uint8Array(VW * (H + 1));
  const take = (x, y, dir) => {
    if (dir === 0) used[y * VW + x] |= 1; else if (dir === 1) used[y * VW + x] |= 2;
    else if (dir === 2) used[y * VW + x - 1] |= 1; else used[(y - 1) * VW + x] |= 2;
  };
  const taken = (x, y, dir) => {
    if (dir === 0) return (used[y * VW + x] & 1) !== 0;
    if (dir === 1) return (used[y * VW + x] & 2) !== 0;
    if (dir === 2) return (used[y * VW + x - 1] & 1) !== 0;
    return (used[(y - 1) * VW + x] & 2) !== 0;
  };
  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
  // Regions to the left and right when leaving (x, y) in direction dir.
  const sides = (x, y, dir) => {
    if (dir === 0) return { left: at(x, y - 1), right: at(x, y) };
    if (dir === 1) return { left: at(x, y), right: at(x - 1, y) };
    if (dir === 2) return { left: at(x - 1, y), right: at(x - 1, y - 1) };
    return { left: at(x - 1, y - 1), right: at(x, y - 1) };
  };
  const arcs = [];
  const walk = (x0, y0, dir0) => {
    const pts = [[x0, y0]];
    const { left, right } = sides(x0, y0, dir0);
    let x = x0, y = y0, dir = dir0;
    for (;;) {
      take(x, y, dir);
      x += DX[dir]; y += DY[dir];
      pts.push([x, y]);
      if (x === x0 && y === y0) return { pts, left, right, closed: true };
      if (degree(x, y) !== 2) return { pts, left, right, closed: false };
      // Carry on along the one other edge at this corner.
      let next = -1;
      for (let d = 0; d < 4; d++) if (d !== ((dir + 2) & 3) && has(x, y, d)) next = d;
      dir = next;
    }
  };
  // Arcs that start at junctions first, then the closed loops that have none.
  for (let y = 0; y <= H; y++) for (let x = 0; x <= W; x++) {
    const dg = degree(x, y);
    if (dg === 0 || dg === 2) continue;
    for (let d = 0; d < 4; d++) if (has(x, y, d) && !taken(x, y, d)) arcs.push(walk(x, y, d));
  }
  for (let y = 0; y <= H; y++) for (let x = 0; x <= W; x++) {
    for (let d = 0; d < 2; d++) if (has(x, y, d) && !taken(x, y, d)) arcs.push(walk(x, y, d));
  }
  return arcs;
}

// Douglas–Peucker on an open run of points; keeps both ends.
export function simplify(pts, tol) {
  if (pts.length <= 2) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    let worst = -1, far = tol;
    for (let k = a + 1; k < b; k++) {
      const d = len === 0 ? Math.hypot(pts[k][0] - ax, pts[k][1] - ay) : Math.abs((pts[k][0] - ax) * dy - (pts[k][1] - ay) * dx) / len;
      if (d > far) { far = d; worst = k; }
    }
    if (worst >= 0) { keep[worst] = 1; stack.push([a, worst], [worst, b]); }
  }
  return pts.filter((_, k) => keep[k]);
}

// A traced arc as the line to draw: the stair-steps of the pixel grid are
// taken out by running through the middle of each grid edge, then the line
// is simplified and snapped to tenths (even tenths, so that the midpoints the
// curve passes through are exact tenths too).
function arcLine(arc, tol) {
  const p = arc.pts;
  const mids = [];
  for (let k = 0; k + 1 < p.length; k++) mids.push([(p[k][0] + p[k + 1][0]) / 2, (p[k][1] + p[k + 1][1]) / 2]);
  let line;
  if (arc.closed) {
    // A loop: simplify it as two halves between its two most distant points.
    let far = 0, fd = -1;
    for (let k = 1; k < mids.length; k++) {
      const d = Math.hypot(mids[k][0] - mids[0][0], mids[k][1] - mids[0][1]);
      if (d > fd) { fd = d; far = k; }
    }
    const a = simplify(mids.slice(0, far + 1), tol), b = simplify([...mids.slice(far), mids[0]], tol);
    line = [...a, ...b.slice(1, -1)];
    if (line.length < 3) line = mids.length >= 3 ? [mids[0], mids[Math.floor(mids.length / 3)], mids[Math.floor((2 * mids.length) / 3)]] : mids;
  } else {
    line = simplify([p[0], ...mids, p[p.length - 1]], tol);
  }
  // In even tenths, as integers (tenths).
  const snapped = [];
  for (const [x, y] of line) {
    const q = [Math.round(x * 5) * 2, Math.round(y * 5) * 2];
    const last = snapped[snapped.length - 1];
    if (!last || last[0] !== q[0] || last[1] !== q[1]) snapped.push(q);
  }
  if (arc.closed && snapped.length > 1) {
    const a = snapped[0], b = snapped[snapped.length - 1];
    if (a[0] === b[0] && a[1] === b[1]) snapped.pop();
  }
  return snapped;
}

// ---------------------------------------------------------- path text --

const num = (tenths) => {
  const neg = tenths < 0, v = Math.abs(tenths);
  const whole = Math.floor(v / 10), frac = v % 10;
  return (neg ? '-' : '') + (whole || !frac ? String(whole) : '') + (frac ? '.' + frac : '');
};
// Join numbers with the fewest separators: a minus sign separates by itself.
const join2 = (a, b) => { const s = num(b); return num(a) + (s[0] === '-' ? '' : ' ') + s; };

class PathText {
  constructor() { this.out = []; this.x = 0; this.y = 0; this.last = ''; }
  cmd(letter, ...pairs) {
    // pairs: absolute points in tenths; written relative to the current point,
    // each relative to the point the command starts from.
    let s = '';
    for (const [px, py] of pairs) {
      const piece = join2(px - this.x, py - this.y);
      s += (s && piece[0] !== '-' ? ' ' : '') + piece;
    }
    if (letter === this.last && letter !== 'm') this.out.push((s[0] === '-' ? '' : ' ') + s);
    else this.out.push(letter + s);
    this.last = letter;
    const end = pairs[pairs.length - 1];
    this.x = end[0]; this.y = end[1];
  }
  move(p) {
    if (!this.out.length) { this.out.push('M' + join2(p[0], p[1])); this.x = p[0]; this.y = p[1]; this.last = 'M'; }
    else this.cmd('m', p);
  }
  close() { this.out.push('z'); this.last = 'z'; }
  toString() { return this.out.join(''); }
}
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

// Draw an open line from where the pen is (at line[0]) to line's last point,
// as a curve through the segment midpoints.
function drawOpen(path, line) {
  const n = line.length - 1;
  if (n < 1) return;
  if (n === 1) { path.cmd('l', line[1]); return; }
  path.cmd('l', mid(line[0], line[1]));
  path.cmd('q', line[1], mid(line[1], line[2]));
  for (let k = 2; k < n; k++) path.cmd('t', mid(line[k], line[k + 1]));
  path.cmd('l', line[n]);
}
function drawLoop(path, line) {
  const n = line.length;
  if (n < 3) return;
  path.move(mid(line[n - 1], line[0]));
  path.cmd('q', line[0], mid(line[0], line[1]));
  for (let k = 1; k < n; k++) path.cmd('t', mid(line[k], line[(k + 1) % n]));
  path.close();
}

// Rings round a region: chain the arcs that bound it, each turned so the
// region is on its right, and write them as closed subpaths.
function ringsPath(arcs, lines, isIn) {
  const pieces = []; // { line (oriented), from, to }
  arcs.forEach((arc, k) => {
    const r = isIn(arc.right), l = isIn(arc.left);
    if (r === l) return;
    const line = lines[k];
    if (arc.closed) { pieces.push({ loop: r ? line : line.slice().reverse() }); return; }
    const oriented = r ? line : line.slice().reverse();
    pieces.push({ line: oriented, from: oriented[0].join(','), to: oriented[oriented.length - 1].join(',') });
  });
  const path = new PathText();
  const starts = new Map();
  pieces.forEach((p, k) => {
    if (p.loop) return;
    if (!starts.has(p.from)) starts.set(p.from, []);
    starts.get(p.from).push(k);
  });
  const done = new Uint8Array(pieces.length);
  pieces.forEach((p, k) => {
    if (p.loop) { drawLoop(path, p.loop); return; }
    if (done[k]) return;
    path.move(p.line[0]);
    let cur = k;
    for (let guard = 0; guard < pieces.length + 1; guard++) {
      done[cur] = 1;
      drawOpen(path, pieces[cur].line);
      const next = (starts.get(pieces[cur].to) || []).find((j) => !done[j]);
      if (next === undefined) break;
      cur = next;
    }
    path.close();
  });
  return path.toString();
}
// Open lines (borders): each arc its own subpath.
function linesPath(arcs, lines, pick) {
  const path = new PathText();
  arcs.forEach((arc, k) => {
    if (!pick(arc)) return;
    const line = lines[k];
    if (arc.closed) { drawLoop(path, line); return; }
    if (line.length < 2) return;
    path.move(line[0]);
    drawOpen(path, line);
  });
  return path.toString();
}

// --------------------------------------------------------------- write --

const RIVER_WIDTH = [0, 0.5, 0.75, 1.05, 1.45]; // world units, by class
const DSTEP = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

// buildWorldFiles(world) => { json (string), png (Buffer), data (the object) }
// world: { name, slug, width, height, cover, ponds, owner, provinces, rivers,
// riverMeta, lakes, labels, projects, capitals, kmPerUnit }
export function buildWorldFiles(world) {
  const { name, slug, width: W, height: H, cover, owner, provinces, lakes, labels, projects } = world;
  const N = W * H;

  // The picture: land cover by class, with the sea and the flecks of standing
  // water in the water colour. It may be finer than the map grid (world.picture),
  // and then its land runs a little past the coast; the lakes are not painted
  // in it. The sea and lakes are drawn over it from the vectors.
  const pic = world.picture || { width: W, height: H, cover, ponds: world.ponds };
  const indices = new Uint8Array(pic.width * pic.height);
  for (let i = 0; i < indices.length; i++) indices[i] = pic.cover[i] > 6 || (pic.ponds && pic.ponds[i]) || (!world.picture && lakes[i]) ? 7 : pic.cover[i];
  const png = encodeIndexedPng(pic.width, pic.height, indices, PNG_COLOURS.map((k) => hexToRgb(PALETTE[k])));

  // Regions: project, and province within it.
  const key = new Int32Array(N);
  for (let i = 0; i < N; i++) key[i] = owner[i] < 0 ? -1 : owner[i] * 64 + (provinces[i] + 1);
  const ownerOf = (k) => (k < 0 ? -1 : k >> 6);
  const arcs = traceArcs(key, W, H, -1);
  const lines = arcs.map((arc) => {
    const coast = arc.left < 0 || arc.right < 0;
    return arcLine(arc, coast ? 0.5 : 0.62);
  });

  const coast = ringsPath(arcs, lines, (k) => k >= 0);
  const borders = linesPath(arcs, lines, (a) => a.left >= 0 && a.right >= 0 && ownerOf(a.left) !== ownerOf(a.right));
  const provinceBorders = linesPath(arcs, lines, (a) => a.left >= 0 && a.right >= 0 && ownerOf(a.left) === ownerOf(a.right));

  const lakeArcs = traceArcs(lakes, W, H, 0);
  const lakeLines = lakeArcs.map((arc) => arcLine(arc, 0.5));
  const lakePath = ringsPath(lakeArcs, lakeLines, (k) => k === 1);

  // Rivers, one path per width class. A river that reaches the sea or a lake
  // runs a little way on into it, so it meets the shore however the shore's
  // curve was simplified; draw rivers under the water and the overrun is hidden.
  const byClass = [null, new PathText(), new PathText(), new PathText(), new PathText()];
  world.rivers.forEach((river, k) => {
    const meta = world.riverMeta[k];
    let pts = river;
    if (meta.ends !== 'river') {
      const n = pts.length;
      let dx = pts[n - 1][0] - pts[n - 2][0], dy = pts[n - 1][1] - pts[n - 2][1];
      if (meta.seaDir >= 0) [dx, dy] = DSTEP[meta.seaDir];
      const len = Math.hypot(dx, dy) || 1;
      pts = [...pts, [pts[n - 1][0] + (dx / len) * 1.6, pts[n - 1][1] + (dy / len) * 1.6]];
    }
    const line = [];
    for (const [x, y] of simplify(pts, 0.75)) {
      const q = [Math.round(x * 5) * 2, Math.round(y * 5) * 2];
      const last = line[line.length - 1];
      if (!last || last[0] !== q[0] || last[1] !== q[1]) line.push(q);
    }
    if (line.length < 2) return;
    const path = byClass[meta.width];
    path.move(line[0]);
    drawOpen(path, line);
  });
  const rivers = [];
  for (let c = 1; c <= 4; c++) {
    const path = byClass[c].toString();
    if (path) rivers.push({ path, width: RIVER_WIDTH[c], minZoom: c === 1 ? 2 : 1 });
  }

  const capitalOf = new Map((world.capitals || []).map((c) => [c.id, c]));
  const data = {
    name, slug, width: W, height: H,
    image: { src: `${slug}.png`, width: pic.width, height: pic.height },
    // Bottom to top. The sea is the map's rectangle less the coast path.
    order: ['image', 'rivers', 'sea', 'lakes', 'coast', 'provinceBorders', 'borders', 'labels'],
    palette: PALETTE,
    scale: { kmPerUnit: world.kmPerUnit },
    coast,
    lakes: lakePath,
    rivers,
    borders,
    provinceBorders,
    projects: projects.map((project, index) => {
      const entry = { id: project.id, path: ringsPath(arcs, lines, (k) => ownerOf(k) === index) };
      const cap = capitalOf.get(project.id);
      if (cap) entry.capital = [Math.round(cap.x * 10) / 10, Math.round(cap.y * 10) / 10];
      if (project.provinces) {
        entry.provinces = project.provinces.map((prov, p) => ({ id: prov.id, path: ringsPath(arcs, lines, (k) => k === index * 64 + p + 1) }));
      }
      return entry;
    }),
    labels: labels.map((l) => {
      const out = { id: l.id, kind: l.kind, text: l.text };
      if (l.lines.length > 1) out.lines = l.lines;
      Object.assign(out, { x: l.x, y: l.y, size: l.size, angle: l.angle, spacing: l.spacing, minZoom: l.minZoom });
      if (l.path) out.path = l.path;
      if (l.dot) out.dot = l.dot;
      if (l.of) out.of = l.of;
      if (l.parent) out.parent = l.parent;
      return out;
    }),
  };
  return { json: JSON.stringify(data), png, data };
}

// writeWorld(world, outDir) => { jsonBytes, pngBytes }
export function writeWorld(world, outDir) {
  const { json, png } = buildWorldFiles(world);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${world.slug}.json`), json);
  writeFileSync(join(outDir, `${world.slug}.png`), png);
  return { jsonBytes: Buffer.byteLength(json), pngBytes: png.length };
}
