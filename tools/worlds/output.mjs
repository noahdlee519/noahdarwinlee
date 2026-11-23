// Output: one vector JSON and one palette PNG per world.
//
// Outlines are traced from the pixel grids as a set of arcs between junctions
// (where three regions meet), so a border shared by two countries is one
// line, simplified once, and the two countries' outlines fit together with
// no gap or overlap. Each arc is simplified (Douglas–Peucker), snapped to a
// 0.2 grid, and written as a smooth curve through the midpoints of its
// segments, in relative path commands to keep the file small.

import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { encodeIndexedPng, hexToRgb } from './png.mjs';
import { prepareCover, renderCover } from './climate.mjs';
import { TILE_LEVELS } from './world.mjs';

export const PALETTE = {
  forest: '#a2debe', woodland: '#b3e3cc', grass: '#c4ead7', steppe: '#f3efe4', desert: '#faf7f3',
  rock: '#cbcfca', snow: '#ffffff', water: '#7fd5e9', urban: '#eceef0', sand: '#f6efdc', dune: '#f4eee0', dryrock: '#ebe6db', salt: '#fdfdfb',
  line: '#4da9bb', border: '#26262a',
  province: '#606266', label: '#26262a',
};
// Palette order in the PNG: the seven land-cover classes by index, then water, built-up ground, sand, and the
// desert's dune ripples, rocky ground, and salt flats. The
// finer tiles use the same palette, unshaded, so every rendered pixel is one of the reference's colours.
const PNG_COLOURS = ['forest', 'woodland', 'grass', 'steppe', 'desert', 'rock', 'snow', 'water', 'urban', 'sand', 'dune', 'dryrock', 'salt'];
const BASE_RGB = PNG_COLOURS.map((k) => hexToRgb(PALETTE[k]));
// A land-cover class (COVER) and its pond flag as a palette index.
const coverIndex = (c, pond) => (c === 255 || pond ? 7 : c >= 7 ? c + 1 : c);

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
// On the map's own edges (W, H given) the line keeps to the grid's corners, so land that runs off an edge (the polar
// land, across the wrap) meets it squarely and its other half with no sliver of sea between.
function arcLine(arc, tol, W = 0, H = 0) {
  const p = arc.pts;
  const mids = [];
  const onEdge = (q) => W && (q[0] === 0 || q[0] === W || q[1] === 0 || q[1] === H);
  for (let k = 0; k + 1 < p.length; k++) {
    if (onEdge(p[k]) && onEdge(p[k + 1])) { if (!mids.length || mids[mids.length - 1] !== p[k]) mids.push(p[k]); mids.push(p[k + 1]); }
    else mids.push([(p[k][0] + p[k + 1][0]) / 2, (p[k][1] + p[k + 1][1]) / 2]);
  }
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
  for (let i = 0; i < indices.length; i++) indices[i] = coverIndex(pic.cover[i], (pic.ponds && pic.ponds[i]) || (!world.picture && lakes[i]));
  const png = encodeIndexedPng(pic.width, pic.height, indices, BASE_RGB);

  // Regions: project, and province within it.
  const key = new Int32Array(N);
  // Land no project holds (polar ice, the About island) is its own region: part of the coast, in no country.
  const ICE = 1 << 20;
  const landAll = world.landAll || world.land;
  // (The About island is drawn from its own outline, below, unless it lies in a lake.)
  const aboutMask = world.about && world.about.kind !== 'lake' ? world.about.mask : null;
  for (let i = 0; i < N; i++) key[i] = owner[i] >= 0 ? owner[i] * 64 + (provinces[i] + 1) : landAll && landAll[i] && !(aboutMask && aboutMask[i]) ? ICE : -1;
  const ownerOf = (k) => (k < 0 || k === ICE ? -1 : k >> 6);
  const arcs = traceArcs(key, W, H, -1);
  const lines = arcs.map((arc) => {
    const coast = arc.left < 0 || arc.right < 0;
    return arcLine(arc, coast ? 0.5 : 0.62, W, H);
  });

  // Where a line meets the map's east or west edge it turns there sharply (the vertex doubled, so the curve through
  // the midpoints passes through it), so land that runs on across the wrap meets its other half with no notch.
  for (let k = 0; k < lines.length; k++) {
    const l = lines[k];
    if (!l.some((p) => p[0] === 0 || p[0] === W * 10)) continue;
    const out = [];
    for (const p of l) { out.push(p); if (p[0] === 0 || p[0] === W * 10 || p[1] === 0 || p[1] === H * 10) out.push(p); }
    lines[k] = out;
  }
  // Borders that run beside a river are moved onto it, so the border runs down the river's middle as drawn.
  if (world.rivers && world.riverMeta) snapBordersToRivers(arcs, lines, world, (a) => ownerOf(a.left) >= 0 && ownerOf(a.right) >= 0 && a.left !== a.right);
  let coast = ringsPath(arcs, lines, (k) => k >= 0);
  // The About island, from its own outline: its land, and the water within it (a lagoon or a crater lake), as rings
  // the sea's even-odd fill turns to land and back to water.
  const A = world.about;
  if (A && A.kind !== 'lake') coast += rings([...A.rings, ...A.holes]);
  const borders = linesPath(arcs, lines, (a) => ownerOf(a.left) >= 0 && ownerOf(a.right) >= 0 && ownerOf(a.left) !== ownerOf(a.right));
  const provinceBorders = linesPath(arcs, lines, (a) => ownerOf(a.left) >= 0 && ownerOf(a.right) >= 0 && ownerOf(a.left) === ownerOf(a.right) && a.left !== a.right);

  // An About island in a lake: the lake is traced whole, and the island cut from it by its own outline.
  let lakeMask = lakes;
  if (A && A.kind === 'lake') { lakeMask = Uint8Array.from(lakes); for (let i = 0; i < N; i++) if (A.mask[i]) lakeMask[i] = 1; }
  const lakeArcs = traceArcs(lakeMask, W, H, 0);
  const lakeLines = lakeArcs.map((arc) => arcLine(arc, 0.5));
  let lakePath = ringsPath(lakeArcs, lakeLines, (k) => k === 1);
  if (A && A.kind === 'lake') {
    // Wound against the lakes' own rings, so the nonzero fill leaves it land.
    const k0 = lakeArcs.findIndex((arc, k) => arc.closed && lakeLines[k].length > 2 && (arc.left === 1 || arc.right === 1));
    const written = k0 < 0 ? null : lakeArcs[k0].right === 1 ? lakeLines[k0] : lakeLines[k0].slice().reverse();
    const lakeSign = written ? Math.sign(signedArea(written)) : 1;
    lakePath += rings(A.rings.map((g) => (Math.sign(signedArea(g)) === lakeSign ? g.slice().reverse() : g)));
  }

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
    for (const [x, y] of simplify(pts, 0.4)) {
      const q = [Math.round(x * 5) * 2, Math.round(y * 5) * 2];
      const last = line[line.length - 1];
      if (!last || last[0] !== q[0] || last[1] !== q[1]) line.push(q);
    }
    if (line.length < 2) return;
    const path = byClass[meta.width];
    path.move(line[0]);
    drawOpen(path, line);
  });
  // Where a big river meets the sea: in cold country a funnel of an estuary,
  // in warm country a delta of branching arms.
  const estFill = new PathText(), estEdge = new PathText();
  const tenths = (p) => [Math.round(p[0] * 5) * 2, Math.round(p[1] * 5) * 2];
  const landAt = (x, y) => { const qx = Math.floor(x), qy = Math.floor(y); return qx >= 0 && qy >= 0 && qx < W && qy < H && world.land[qy * W + qx] === 1; };
  world.rivers.forEach((river, k) => {
    const meta = world.riverMeta[k];
    if (meta.ends !== 'sea' || meta.width < 2 || river.length < (meta.width >= 3 ? 24 : 60) || !world.land) return;
    const n = river.length;
    const M = river[n - 1];
    let [dx, dy] = meta.seaDir >= 0 ? DSTEP[meta.seaDir] : [M[0] - river[n - 4][0], M[1] - river[n - 4][1]];
    let dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    const t = world.temp ? world.temp[Math.floor(M[1]) * W + Math.floor(M[0])] : 0;
    // The last stretch of the course, smoothed, from upstream to the mouth.
    const L = [0, 0, 14, 20, 26][meta.width];
    const back = river.slice(Math.max(0, n - 1 - L)).map((p, j, a) => {
      let sx = 0, sy = 0, c = 0;
      for (let q = Math.max(0, j - 2); q <= Math.min(a.length - 1, j + 2); q++) { sx += a[q][0]; sy += a[q][1]; c++; }
      return [sx / c, sy / c];
    });
    back[back.length - 1] = M;
    if (t < 6) {
      const rw = RIVER_WIDTH[meta.width] / 2, top = [0, 0, 2.6, 4.2, 5.6][meta.width];
      const cl = [...back, [M[0] + dx * 2.5, M[1] + dy * 2.5], [M[0] + dx * 5, M[1] + dy * 5]];
      const left = [], right = [];
      cl.forEach((c, j) => {
        const a = cl[Math.max(0, j - 1)], b = cl[Math.min(cl.length - 1, j + 1)];
        let tx = b[0] - a[0], ty = b[1] - a[1];
        const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const f = Math.min(1, j / (back.length - 1));
        const hw = rw + (top - rw) * f ** 1.7 + (j >= back.length ? (j - back.length + 1) * 0.6 : 0);
        left.push([c[0] - ty * hw, c[1] + tx * hw]);
        right.push([c[0] + ty * hw, c[1] - tx * hw]);
      });
      const ring = [...left, ...right.reverse()].map(tenths);
      estFill.move(ring[0]);
      for (let j = 1; j < ring.length; j++) estFill.cmd('l', ring[j]);
      estFill.close();
      // The banks: drawn as far as the land goes.
      for (const side of [left, right.reverse()]) {
        const bank = [];
        for (const p of side) { if (!landAt(p[0], p[1]) && bank.length > 2) { bank.push(p); break; } bank.push(p); }
        const line = bank.map(tenths);
        if (line.length < 2) continue;
        estEdge.move(line[0]);
        drawOpen(estEdge, line);
      }
    } else {
      // Arms fanning out from a little way upstream to the sea.
      const P = back[Math.max(0, back.length - 1 - [0, 0, 9, 15, 20][meta.width])];
      const nx = -dy, ny = dx;
      for (const side of [-1, 1, 0.45 * (k % 2 ? 1 : -1)]) {
        const spread = side * [0, 0, 6, 11, 14][meta.width];
        let end = [M[0] + dx * 2 + nx * spread, M[1] + dy * 2 + ny * spread];
        let tries = 0;
        while (landAt(end[0], end[1]) && tries++ < 8) end = [end[0] + dx, end[1] + dy];
        if (landAt(end[0], end[1])) continue;
        const midP = [(P[0] + end[0]) / 2 + nx * spread * 0.18, (P[1] + end[1]) / 2 + ny * spread * 0.18];
        const line = [P, midP, end, [end[0] + dx * 1.5, end[1] + dy * 1.5]].map(tenths);
        const arm = byClass[Math.max(1, meta.width - 1)];
        arm.move(line[0]);
        drawOpen(arm, line);
      }
    }
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
    // Finer tiles of the picture, for zooming in (see writeWorld); filled in there.
    tiles: null,
    // Bottom to top. The sea is the map's rectangle less the coast path.
    order: ['image', 'rivers', 'sea', 'lakes', 'coast', 'estuaries', 'provinceBorders', 'borders', 'labels'],
    // The polar land's side, if any: beyond that edge the map is ice, not sea.
    polar: world.polar && world.polar.sides ? world.polar.sides : undefined,
    palette: PALETTE,
    scale: { kmPerUnit: world.kmPerUnit },
    coast,
    lakes: lakePath,
    // Estuaries: fill in the water colour, then the banks in the line colour.
    estuaries: { fill: estFill.toString(), edge: estEdge.toString() },
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
    labels: labels.map(labelOut),
  };
  // The About island's "you are here" dot.
  if (world.about) data.here = [Math.round(world.about.x * 10) / 10, Math.round(world.about.y * 10) / 10];
  const detail = world.detail ? buildDetail(world) : null;
  if (detail) data.detail = { src: `detail/${slug}.json`, chunks: detail.chunks.meta };
  return { json: JSON.stringify(data), png, data, detail: detail && JSON.stringify(detail.coarse), chunks: detail && detail.chunks.files };
}

// The rivers as drawn (simplified and in tenths, as buildWorldFiles writes them), and border arcs moved onto them.
function riverLines(world) {
  return world.rivers.map((river, k) => {
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
    for (const [x, y] of simplify(pts, 0.4)) {
      const q = [Math.round(x * 5) * 2, Math.round(y * 5) * 2];
      const last = line[line.length - 1];
      if (!last || last[0] !== q[0] || last[1] !== q[1]) line.push(q);
    }
    return line;
  });
}
function snapBordersToRivers(arcs, lines, world, isBorder) {
  const rl = riverLines(world);
  const G = 60, idx = new Map(); // tenths
  rl.forEach((line, k) => {
    if (world.riverMeta[k].width < 2) return;
    for (let j = 1; j < line.length; j++) {
      const x0 = Math.floor(Math.min(line[j - 1][0], line[j][0]) / G) - 1, x1 = Math.floor(Math.max(line[j - 1][0], line[j][0]) / G) + 1;
      const y0 = Math.floor(Math.min(line[j - 1][1], line[j][1]) / G) - 1, y1 = Math.floor(Math.max(line[j - 1][1], line[j][1]) / G) + 1;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const key = y * 100000 + x; if (!idx.has(key)) idx.set(key, []); idx.get(key).push([k, j]); }
    }
  });
  const nearest = (p) => {
    let best = null;
    for (const [k, j] of idx.get(Math.floor(p[1] / G) * 100000 + Math.floor(p[0] / G)) || []) {
      const a = rl[k][j - 1], b = rl[k][j], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-9;
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
      const q = [a[0] + dx * t, a[1] + dy * t], d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (!best || d < best.d) best = { k, j, t, q, d };
    }
    return best;
  };
  let snapped = 0;
  arcs.forEach((arc, n) => {
    if (!isBorder(arc) || arc.closed) return;
    const line = lines[n];
    if (line.length < 6) return;
    const near = line.map((p, i) => (i === 0 || i === line.length - 1 ? null : nearest(p)));
    const out = [line[0]];
    let i = 1;
    while (i < line.length - 1) {
      const a = near[i];
      if (!a || a.d > 22) { out.push(line[i]); i++; continue; }
      let e = i;
      while (e + 1 < line.length - 1 && near[e + 1] && near[e + 1].d <= 22 && near[e + 1].k === a.k) e++;
      if (e - i < 3) { for (let q = i; q <= e; q++) out.push(line[q]); i = e + 1; continue; }
      const b = near[e], rv = rl[a.k];
      const piece = [a.q];
      if (a.j <= b.j) for (let j = a.j; j < b.j; j++) piece.push(rv[j]);
      else for (let j = a.j - 1; j >= b.j; j--) piece.push(rv[j]);
      piece.push(b.q);
      for (const p of piece) { const q = [Math.round(p[0] / 2) * 2, Math.round(p[1] / 2) * 2], last = out[out.length - 1]; if (last[0] !== q[0] || last[1] !== q[1]) out.push(q); }
      snapped++;
      i = e + 1;
    }
    out.push(line[line.length - 1]);
    lines[n] = out;
  });
  return snapped;
}

function labelOut(l) {
  const out = { id: l.id, kind: l.kind, text: l.text };
  if (l.lines.length > 1) out.lines = l.lines;
  Object.assign(out, { x: l.x, y: l.y, size: l.size, angle: l.angle, spacing: l.spacing, minZoom: l.minZoom });
  if (l.path) out.path = l.path;
  if (l.dot) out.dot = l.dot;
  if (l.of) out.of = l.of;
  if (l.parent) out.parent = l.parent;
  if (l.shield) out.shield = l.shield;
  if (l.volcano) out.volcano = true;
  return out;
}

// The finer detail, loaded only once the map is zoomed in: roads, streets,
// ferries, streams, parks, the larger countries' subdivisions, and the names
// of small places and features.
const tenthsOf = (p) => [Math.round(p[0] * 5) * 2, Math.round(p[1] * 5) * 2];
function polylines(list) {
  const path = new PathText();
  for (const pts of list) {
    const line = [];
    for (const p of pts) {
      const q = tenthsOf(p), last = line[line.length - 1];
      if (!last || last[0] !== q[0] || last[1] !== q[1]) line.push(q);
    }
    if (line.length < 2) continue;
    path.move(line[0]);
    drawOpen(path, line);
  }
  return path.toString();
}
function segments(list) {
  const path = new PathText();
  for (const pts of list) {
    const line = pts.map(tenthsOf);
    if (line.length < 2 || (line[0][0] === line[1][0] && line[0][1] === line[1][1])) continue;
    path.move(line[0]);
    for (let k = 1; k < line.length; k++) path.cmd('l', line[k]);
  }
  return path.toString();
}
function rings(list) {
  const path = new PathText();
  for (const ring of list) {
    const line = [];
    for (const p of ring) { const q = tenthsOf(p), last = line[line.length - 1]; if (!last || last[0] !== q[0] || last[1] !== q[1]) line.push(q); }
    if (line.length > 2) drawLoop(path, line);
  }
  return path.toString();
}
// Lakes, each with its islands: the islands wound the other way round, so they stay land under the nonzero fill rule.
const signedArea = (ring) => { let a = 0; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]); return a; };
function lakeRings(list) {
  const out = [];
  for (const l of list) {
    const s = Math.sign(signedArea(l.ring));
    out.push(l.ring);
    for (const h of l.holes || []) out.push(Math.sign(signedArea(h)) === s ? h.slice().reverse() : h);
  }
  return rings(out);
}
// The finest detail is cut into chunks of the map, loaded only for the part in view at the closest zooms.
export const CHUNK = 400;
export function buildDetail(world) {
  const { width: W, height: H, detail: D, owner } = world;
  const N = W * H;
  const byClass = (cls) => D.roads.roads.filter((r) => r.cls === cls).map((r) => r.pts);
  const streetsOf = (cls) => D.streets.filter((st) => st.cls === cls).map((st) => st.pts);
  // Parks: one ring each, traced from their pixels (drawn only as a faint edge, close in).
  const parkArcs = traceArcs(D.parks.mask, W, H, -1);
  const parkLines = parkArcs.map((arc) => arcLine(arc, 0.6));
  const parks = D.parks.parks.map((p, id) => ({ id: `park-${id}`, name: p.name, kind: p.kind, country: world.projects[p.country].id, path: ringsPath(parkArcs, parkLines, (k) => k === id) }));
  const key = new Int32Array(N);
  for (let i = 0; i < N; i++) key[i] = owner[i] < 0 ? -1 : D.admin[i] < 0 ? owner[i] * 16 + 15 : owner[i] * 16 + D.admin[i];
  const adminArcs = traceArcs(key, W, H, -1);
  const pick = (a) => a.left >= 0 && a.right >= 0 && a.left >> 4 === a.right >> 4 && (a.left & 15) !== 15 && (a.right & 15) !== 15 && a.left !== a.right;
  const adminLines = adminArcs.map((arc) => (pick(arc) ? arcLine(arc, 0.8) : []));
  const lakes = D.smallLakes.lakes;
  const coarse = {
    roads: {
      motorway: polylines(byClass('motorway')), trunk: polylines(byClass('trunk')), secondary: polylines(byClass('secondary')), local: polylines(byClass('local')),
      arterial: polylines(streetsOf('arterial')), ring: polylines(streetsOf('ring')),
    },
    ferries: segments(D.roads.ferries),
    causeway: D.causeway && D.causeway.length ? segments(D.causeway) : undefined,
    streams: polylines(D.streams),
    wadis: polylines(D.wadis || []),
    lakes: lakeRings(lakes.filter((l) => l.area >= 0.6)),
    parks,
    admin: linesPath(adminArcs, adminLines, pick),
    labels: D.labels.map(labelOut),
  };
  // Chunks: streets, minor streets, and the smallest lakes.
  const cols = Math.ceil(W / CHUNK), rows = Math.ceil(H / CHUNK);
  const bins = Array.from({ length: cols * rows }, () => ({ street: [], minor: [], lakes: [] }));
  const binOf = (p) => Math.min(rows - 1, Math.floor(p[1] / CHUNK)) * cols + Math.min(cols - 1, Math.floor(p[0] / CHUNK));
  for (const st of D.streets) if (st.cls === 'street' || st.cls === 'minor') bins[binOf(st.pts[0])][st.cls].push(st.pts);
  for (const l of lakes) if (l.area < 0.6) bins[binOf([l.x, l.y])].lakes.push(l);
  const files = bins.map((b, k) => ({ path: `${k % cols}-${Math.floor(k / cols)}.json`, json: JSON.stringify({ street: segments(b.street), minor: segments(b.minor), lakes: lakeRings(b.lakes) }) }));
  return { coarse, chunks: { meta: { size: CHUNK, cols, rows, src: `detail/${world.slug}/` }, files } };
}

// The picture drawn finer, cut into tiles: tiles/<slug>/<scale>/<col>-<row>.png,
// in the picture's palette. A tile that is all sea is not written; the world
// file lists which tiles exist, one hex digit per four tiles, row by row.
export function buildTiles(world) {
  const files = [], levels = [];
  if (!world.coverArgs) return { files, levels };
  const W = world.width, H = world.height;
  for (const { scale, size } of TILE_LEVELS) {
    // (No hillshade: the rendered colours stay exactly the reference's, at every zoom.)
    const prep = prepareCover({ ...world.coverArgs, scale, shade: false });
    const unit = size / scale, cols = Math.ceil(W / unit), rows = Math.ceil(H / unit);
    const bits = new Uint8Array(cols * rows);
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const x0 = col * size, y0 = row * size;
      const w = Math.min(size, prep.W - x0), h = Math.min(size, prep.H - y0);
      const { cover, ponds } = renderCover(prep, x0, y0, w, h);
      const indices = new Uint8Array(w * h);
      let land = false;
      for (let i = 0; i < indices.length; i++) {
        const v = coverIndex(cover[i], ponds[i]);
        indices[i] = v;
        if (v !== 7) land = true;
      }
      if (!land) continue;
      bits[row * cols + col] = 1;
      files.push({ path: `${scale}/${col}-${row}.png`, png: encodeIndexedPng(w, h, indices, BASE_RGB) });
    }
    let has = '';
    for (let i = 0; i < bits.length; i += 4) has += ((bits[i] | (bits[i + 1] << 1) | (bits[i + 2] << 2) | (bits[i + 3] << 3)) & 15).toString(16);
    levels.push({ scale, size, unit, cols, rows, has });
  }
  return { files, levels };
}


// writeWorld(world, outDir) => { jsonBytes, pngBytes, tileBytes, tileCount }
export function writeWorld(world, outDir) {
  const { data, png, detail, chunks } = buildWorldFiles(world);
  let chunkBytes = 0;
  if (detail) {
    mkdirSync(join(outDir, 'detail', world.slug), { recursive: true });
    writeFileSync(join(outDir, 'detail', `${world.slug}.json`), detail);
    for (const c of chunks) { writeFileSync(join(outDir, 'detail', world.slug, c.path), c.json); chunkBytes += c.json.length; }
  }
  const tiles = buildTiles(world);
  data.tiles = tiles.levels.length ? { src: `tiles/${world.slug}/`, levels: tiles.levels } : undefined;
  const json = JSON.stringify(data);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${world.slug}.json`), json);
  writeFileSync(join(outDir, `${world.slug}.png`), png);
  let tileBytes = 0;
  if (tiles.files.length) {
    const dir = join(outDir, 'tiles', world.slug);
    rmSync(dir, { recursive: true, force: true });
    for (const f of tiles.files) {
      mkdirSync(join(dir, f.path.split('/')[0]), { recursive: true });
      writeFileSync(join(dir, f.path), f.png);
      tileBytes += f.png.length;
    }
  }
  return { jsonBytes: Buffer.byteLength(json), pngBytes: png.length, tileBytes, tileCount: tiles.files.length, detailBytes: detail ? Buffer.byteLength(detail) : 0, chunkBytes };
}
