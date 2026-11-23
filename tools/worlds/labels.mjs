// Label placement.
//
// Every label is sized and placed in world units, as lettering drawn on the
// map: a country's name sits inside the country, turned along its long axis
// when the country is clearly long, as large as fits (up to a cap by tier).
// A label has a minZoom, the first zoom at which its lettering is big enough
// on screen to read; small countries' names wait for a closer zoom. No two
// labels overlap at any zoom: every later label is placed clear of every
// earlier one.

import { clamp } from './rng.mjs';

// Advance widths in ems (Inter SemiBold; the site's own grotesque is a touch
// narrower, so boxes measured with these are on the safe side).
const ADV = { ' ': 0.252, '!': 0.321, '"': 0.523, '#': 0.644, $: 0.65, '%': 1.004, '&': 0.663, "'": 0.326, '(': 0.373, ')': 0.373, '*': 0.54, '+': 0.673, ',': 0.319, '-': 0.465, '.': 0.319, '/': 0.379, 0: 0.66, 1: 0.423, 2: 0.623, 3: 0.636, 4: 0.666, 5: 0.629, 6: 0.64, 7: 0.576, 8: 0.64, 9: 0.64, ':': 0.319, ';': 0.329, '?': 0.543, A: 0.728, B: 0.659, C: 0.737, D: 0.722, E: 0.605, F: 0.588, G: 0.749, H: 0.746, I: 0.277, J: 0.58, K: 0.703, L: 0.565, M: 0.922, N: 0.759, O: 0.769, P: 0.645, Q: 0.773, R: 0.652, S: 0.65, T: 0.66, U: 0.736, V: 0.728, W: 1.02, X: 0.72, Y: 0.713, Z: 0.652, a: 0.574, b: 0.624, c: 0.583, d: 0.624, e: 0.591, f: 0.389, g: 0.625, h: 0.612, i: 0.262, j: 0.262, k: 0.569, l: 0.262, m: 0.9, n: 0.612, o: 0.609, p: 0.624, q: 0.624, r: 0.397, s: 0.549, t: 0.353, u: 0.612, v: 0.587, w: 0.839, x: 0.569, y: 0.588, z: 0.566 };
export const LINE_HEIGHT = 1.12; // ems between baselines
const BOX_HEIGHT = 1.0; // ems a line of lettering occupies, for collisions

// Width of one line in ems; spacing is the tracking added between letters.
export function lineWidth(text, spacing = 0) {
  let w = 0;
  for (const ch of text) w += ADV[ch] ?? 0.62;
  return w + spacing * Math.max(0, text.length - 1);
}

// The boxes a label occupies, one per line: centre, half-sizes, and turn.
export function labelRects(label, pad = 0) {
  const lines = label.lines || [label.text];
  const a = ((label.angle || 0) * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
  const rects = lines.map((line, k) => {
    const off = (k - (lines.length - 1) / 2) * LINE_HEIGHT * label.size;
    return {
      cx: label.x - sin * off, cy: label.y + cos * off,
      hw: (lineWidth(line, label.spacing || 0) * label.size) / 2 + pad,
      hh: (BOX_HEIGHT * label.size) / 2 + pad,
      cos, sin,
    };
  });
  if (label.dot) rects.push({ cx: label.dot[0], cy: label.dot[1], hw: label.size * 0.32 + pad, hh: label.size * 0.32 + pad, cos: 1, sin: 0 });
  return rects;
}

function corners(r) {
  const out = [];
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    out.push([r.cx + sx * r.hw * r.cos - sy * r.hh * r.sin, r.cy + sx * r.hw * r.sin + sy * r.hh * r.cos]);
  }
  return out;
}

// Do two turned boxes overlap? (Separating axes.)
export function rectsOverlap(a, b) {
  const ca = corners(a), cb = corners(b);
  for (const r of [a, b]) {
    for (const [ax, ay] of [[r.cos, r.sin], [-r.sin, r.cos]]) {
      let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
      for (const [x, y] of ca) { const p = x * ax + y * ay; amin = Math.min(amin, p); amax = Math.max(amax, p); }
      for (const [x, y] of cb) { const p = x * ax + y * ay; bmin = Math.min(bmin, p); bmax = Math.max(bmax, p); }
      if (amax <= bmin || bmax <= amin) return false;
    }
  }
  return true;
}
export function labelsOverlap(a, b, pad = 0) {
  const ra = labelRects(a, pad), rb = labelRects(b);
  for (const x of ra) for (const y of rb) if (rectsOverlap(x, y)) return true;
  return false;
}

// Points along a box's edges and its middle line, about `step` apart.
function samples(r, step) {
  const pts = [];
  const nx = Math.max(2, Math.ceil((2 * r.hw) / step)), ny = Math.max(1, Math.ceil((2 * r.hh) / step));
  for (let i = 0; i <= nx; i++) {
    const u = -r.hw + (2 * r.hw * i) / nx;
    for (const v of [-r.hh, 0, r.hh]) pts.push([r.cx + u * r.cos - v * r.sin, r.cy + u * r.sin + v * r.cos]);
  }
  for (let j = 1; j < ny; j++) {
    const v = -r.hh + (2 * r.hh * j) / ny;
    for (const u of [-r.hw, r.hw]) pts.push([r.cx + u * r.cos - v * r.sin, r.cy + u * r.sin + v * r.cos]);
  }
  return pts;
}

// Ways to break a name over one, two, or three lines, most balanced first.
export function lineBreaks(text) {
  const words = text.split(' ');
  const out = [[text]];
  if (words.length >= 2) {
    let best = null;
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      const w = Math.max(lineWidth(a), lineWidth(b));
      if (!best || w < best.w) best = { w, lines: [a, b] };
    }
    out.push(best.lines);
  }
  if (words.length >= 3) {
    let best = null;
    for (let i = 1; i < words.length - 1; i++) for (let j = i + 1; j < words.length; j++) {
      const ls = [words.slice(0, i).join(' '), words.slice(i, j).join(' '), words.slice(j).join(' ')];
      const w = Math.max(...ls.map((l) => lineWidth(l)));
      if (!best || w < best.w) best = { w, lines: ls };
    }
    out.push(best.lines);
  }
  return out;
}

// Distance from each pixel to the nearest pixel of another region (chamfer).
function insideDistance(region, W, H) {
  const N = W * H, d = new Float32Array(N);
  const B = Math.SQRT2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, r = region[i];
    const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1 || region[i - 1] !== r || region[i + 1] !== r || region[i - W] !== r || region[i + W] !== r;
    d[i] = edge ? 0.5 : 1e9;
  }
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (d[i] < 1) continue;
    d[i] = Math.min(d[i], d[i - 1] + 1, d[i - W] + 1, d[i - W - 1] + B, d[i - W + 1] + B);
  }
  for (let y = H - 2; y > 0; y--) for (let x = W - 2; x > 0; x--) {
    const i = y * W + x;
    if (d[i] < 1) continue;
    d[i] = Math.min(d[i], d[i + 1] + 1, d[i + W] + 1, d[i + W + 1] + B, d[i + W - 1] + B);
  }
  return d;
}

// Invented names, with a sound of their own in each world.
export function makeNamer(rng) {
  const sets = [
    { c: ['k', 'r', 'th', 'v', 'l', 'n', 's', 'd', 'm', 'h', 'st', 'br'], v: ['a', 'e', 'o', 'i', 'ae', 'u'], end: ['n', 'r', 's', 'th', 'l', ''] },
    { c: ['t', 'l', 'm', 'n', 'r', 's', 'v', 'z', 'c', 'p'], v: ['a', 'i', 'o', 'e', 'ia', 'ea'], end: ['', '', 'n', 's', 'r'] },
    { c: ['sh', 'k', 'q', 'z', 'r', 'h', 'd', 'b', 'm', 'n', 't'], v: ['a', 'u', 'i', 'aa', 'e'], end: ['r', 'n', 'm', 'k', 'd', ''] },
    { c: ['w', 'l', 'n', 'm', 'h', 'k', 'p', 't', 'r'], v: ['a', 'e', 'i', 'o', 'u', 'ai', 'oa'], end: ['', '', '', 'n', 'l'] },
    { c: ['g', 'd', 'b', 'v', 'r', 'l', 'n', 'sk', 'dr', 'f', 't'], v: ['o', 'a', 'e', 'y', 'u', 'ei'], end: ['d', 'r', 'n', 'nd', 'sk', 'l'] },
  ];
  const set = sets[rng.int(sets.length)];
  const used = new Set();
  const word = () => {
    for (let tries = 0; tries < 40; tries++) {
      const n = rng.chance(0.3) ? 3 : 2;
      let s = '';
      for (let k = 0; k < n; k++) {
        if (k > 0 || rng.chance(0.82)) s += rng.pick(set.c);
        s += rng.pick(set.v);
      }
      s += rng.pick(set.end);
      if (s.length < 4 || s.length > 9 || used.has(s) || /(.)\1\1/.test(s)) continue;
      used.add(s);
      return s[0].toUpperCase() + s.slice(1);
    }
    return 'Arden' + used.size;
  };
  return {
    word,
    ocean: () => `${word()} Ocean`,
    sea: () => rng.pick([(w) => `${w} Sea`, (w) => `Sea of ${w}`, (w) => `Gulf of ${w}`, (w) => `${w} Bay`])(word()),
    strait: () => `${word()} ${rng.pick(['Strait', 'Sound', 'Channel'])}`,
    lake: () => `Lake ${word()}`,
    range: () => `${word()} ${rng.pick(['Mountains', 'Mountains', 'Range', 'Highlands', 'Alps'])}`,
    town: () => {
      const w = word();
      return rng.chance(0.22) ? `${rng.pick(['Port', 'Fort', 'New', 'Saint'])} ${w}` : w;
    },
  };
}

const zoomFor = (size, minPx) => clamp(Math.ceil(minPx / size - 1e-9), 1, 4);

// placeLabels({ owner, provinces, projects, width, height, rng, extras })
//   => [{ id, kind, text, lines, x, y, size, angle, spacing, minZoom, dot? }]
// extras: { land, lakes, ranges, capitals, towns } for the seas, lakes,
// ranges, and towns that give the map texture; all optional.
export function placeLabels({ owner, provinces, projects, width, height, rng, extras = {} }) {
  const W = width, H = height, N = W * H, S = W / 1600;
  const r = rng.fork ? rng.fork('labels') : rng;
  const namer = makeNamer(r);
  const labels = [];
  const placed = []; // { rects } of every label so far
  const clearOf = (rects) => {
    for (const p of placed) for (const a of rects) for (const b of p) if (rectsOverlap(a, b)) return false;
    return true;
  };
  const commit = (label, pad = 0.6 * S) => {
    const rects = labelRects(label);
    let w = 0;
    for (const line of label.lines) w = Math.max(w, lineWidth(line, label.spacing) * label.size);
    label.w = Math.round(w * 10) / 10;
    label.h = Math.round(((label.lines.length - 1) * LINE_HEIGHT + BOX_HEIGHT) * label.size * 10) / 10;
    label.x = Math.round(label.x * 10) / 10; label.y = Math.round(label.y * 10) / 10;
    label.size = Math.round(label.size * 100) / 100;
    placed.push(labelRects(label, pad));
    labels.push(label);
    return rects;
  };

  // A combined region id: project, and province within it.
  const region = new Int32Array(N);
  for (let i = 0; i < N; i++) region[i] = owner[i] < 0 ? -1 : owner[i];
  const dOwner = insideDistance(region, W, H);

  // Fit lettering inside the pixels where `inside(i)` holds.
  // Returns the largest placement found: { x, y, size, angle, lines, spacing } or null.
  const fit = ({ pixels, inside, dist, text, cap, floor, tilt, track = 0, avoid = false, breaks }) => {
    if (!pixels.length) return null;
    let sx = 0, sy = 0;
    for (const i of pixels) { sx += i % W; sy += (i / W) | 0; }
    const mx = sx / pixels.length, my = sy / pixels.length;
    // The long axis, from the spread of the pixels.
    let cxx = 0, cyy = 0, cxy = 0;
    for (let k = 0; k < pixels.length; k += 3) {
      const i = pixels[k], dx = (i % W) - mx, dy = ((i / W) | 0) - my;
      cxx += dx * dx; cyy += dy * dy; cxy += dx * dy;
    }
    const theta = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
    const spreadA = Math.sqrt((cxx + cyy) / 2 + Math.hypot((cxx - cyy) / 2, cxy));
    const spreadB = Math.sqrt(Math.max(1e-9, (cxx + cyy) / 2 - Math.hypot((cxx - cyy) / 2, cxy)));
    const long = spreadA / spreadB;
    let deg = (theta * 180) / Math.PI;
    if (deg > 90) deg -= 180; if (deg < -90) deg += 180;
    // Lettering reads left to right; never stand it on end.
    const lean = clamp(deg, -48, 48);
    const angles = tilt === false ? [0] : long > 1.55 ? [...new Set([Math.round(lean), Math.round(lean / 2), 0])] : long > 1.25 ? [...new Set([0, Math.round(lean / 2)])] : [0];

    // Candidate centres on a grid, deepest inside first.
    const grid = Math.max(2, Math.round(Math.sqrt(pixels.length) / 42));
    const cands = [];
    for (const i of pixels) {
      const x = i % W, y = (i / W) | 0;
      if (x % grid || y % grid) continue;
      if (dist[i] >= floor * 0.45) cands.push(i);
    }
    if (!cands.length) for (const i of pixels) if (dist[i] >= 1) cands.push(i);
    cands.sort((a, b) => dist[b] - dist[a] || a - b);

    const fitsAt = (x, y, size, angle, lines, spacing) => {
      const label = { x, y, size, angle, lines, spacing };
      const pad = Math.max(1.1 * S, 0.16 * size);
      const rects = labelRects(label, pad);
      // The ends of each line first: most misfits fail there, cheaply.
      for (const rect of rects) {
        for (const u of [-rect.hw, rect.hw]) {
          const qx = Math.floor(rect.cx + u * rect.cos), qy = Math.floor(rect.cy + u * rect.sin);
          if (qx < 0 || qy < 0 || qx >= W || qy >= H || !inside(qy * W + qx)) return false;
        }
      }
      for (const rect of rects) {
        for (const [px, py] of samples(rect, 1.6)) {
          const qx = Math.floor(px), qy = Math.floor(py);
          if (qx < 0 || qy < 0 || qx >= W || qy >= H || !inside(qy * W + qx)) return false;
        }
      }
      return !avoid || clearOf(labelRects(label, 0.8 * S));
    };
    const search = (size, angle, lines, spacing) => {
      const half = (((lines.length - 1) * LINE_HEIGHT + BOX_HEIGHT) * size) / 2;
      let best = null;
      let tested = 0;
      for (const i of cands) {
        if (dist[i] < half * 0.92) break;
        if (++tested > 700) break;
        const x = (i % W) + 0.5, y = ((i / W) | 0) + 0.5;
        if (!fitsAt(x, y, size, angle, lines, spacing)) continue;
        // Deep inside and near the middle of the country is best.
        const score = Math.min(dist[i], half * 3) - 0.12 * Math.hypot(x - mx, y - my);
        if (!best || score > best.score) best = { x, y, score };
        if (best && tested > 60 && best.score > half * 2) break;
      }
      return best;
    };
    let top = null;
    for (const lines of breaks || lineBreaks(text)) {
      for (const angle of angles) {
        // The largest size that fits, by bisection.
        let lo = floor, hi = cap, found = null;
        const first = search(lo, angle, lines, track);
        if (!first) continue;
        found = { ...first, size: lo };
        for (let it = 0; it < 7 && hi - lo > 0.15; it++) {
          const mid = (lo + hi) / 2;
          const got = search(mid, angle, lines, track);
          if (got) { lo = mid; found = { ...got, size: mid }; } else hi = mid;
        }
        if (hi === cap) { const got = search(cap, angle, lines, track); if (got) found = { ...got, size: cap }; }
        // Fewer lines and less tilt are worth a little size.
        const score = found.size * (1 - 0.13 * (lines.length - 1)) * (1 - 0.0022 * Math.abs(angle));
        if (!top || score > top.score) top = { ...found, angle, lines, spacing: track, score };
      }
    }
    if (!top) return null;
    return { ...top, fitsAt, search };
  };

  // ---- Countries. ----
  const pixelsOf = projects.map(() => []);
  {
    // Each country's main piece: its largest connected run of pixels.
    const seen = new Uint8Array(N), stack = new Int32Array(N);
    const bestPiece = projects.map(() => []);
    for (let s = 0; s < N; s++) {
      const o = owner[s];
      if (o < 0 || seen[s]) continue;
      const piece = [];
      let top = 0;
      stack[top++] = s; seen[s] = 1;
      while (top) {
        const i = stack[--top], x = i % W;
        piece.push(i);
        if (x > 0 && !seen[i - 1] && owner[i - 1] === o) { seen[i - 1] = 1; stack[top++] = i - 1; }
        if (x < W - 1 && !seen[i + 1] && owner[i + 1] === o) { seen[i + 1] = 1; stack[top++] = i + 1; }
        if (i >= W && !seen[i - W] && owner[i - W] === o) { seen[i - W] = 1; stack[top++] = i - W; }
        if (i < N - W && !seen[i + W] && owner[i + W] === o) { seen[i + W] = 1; stack[top++] = i + W; }
      }
      if (piece.length > bestPiece[o].length) bestPiece[o] = piece;
    }
    bestPiece.forEach((p, o) => { pixelsOf[o] = p.sort((a, b) => a - b); });
  }

  const countryLabel = new Map();
  projects.forEach((project, index) => {
    const pixels = pixelsOf[index];
    if (!pixels.length) return;
    const flagship = project.tier === 'flagship';
    const span = Math.sqrt(pixels.length);
    const cap = flagship ? clamp(span * 0.125, 12 * S, 30 * S) : clamp(span * 0.15, 6 * S, 13.5 * S);
    const floor = 2.45 * S;
    const inside = (i) => owner[i] === index;
    let got = fit({ pixels, inside, dist: dOwner, text: project.name, cap, floor });
    if (!got) {
      // Nowhere holds even the smallest lettering: set it at the deepest point anyway.
      let deep = pixels[0];
      for (const i of pixels) if (dOwner[i] > dOwner[deep]) deep = i;
      const lines = lineBreaks(project.name).pop();
      got = { x: (deep % W) + 0.5, y: Math.floor(deep / W) + 0.5, size: floor, angle: 0, lines, spacing: 0 };
    } else if (got.lines.length === 1) {
      // Spread a one-line name along the country, as an atlas does: open the
      // tracking as far as still fits at nine tenths of the size.
      const size = Math.max(floor, got.size * 0.9);
      const tracks = flagship ? (project.name === project.name.toUpperCase() ? [0.26, 0.2, 0.14, 0.08, 0.04] : [0.2, 0.14, 0.08, 0.04]) : [0.1, 0.06, 0.03];
      let done = false;
      for (const t of tracks) {
        const at = got.search(size, got.angle, got.lines, t);
        if (at) { got = { ...got, x: at.x, y: at.y, size, spacing: t }; done = true; break; }
      }
      if (!done) got = { ...got, size: Math.max(floor, got.size * 0.94) };
    } else {
      const size = Math.max(floor, got.size * 0.94);
      const at = got.search(size, got.angle, got.lines, 0);
      if (at) got = { ...got, x: at.x, y: at.y, size };
    }
    const label = {
      id: project.id, kind: 'country', text: project.name, lines: got.lines,
      x: got.x, y: got.y, size: got.size, angle: got.angle, spacing: got.spacing || 0,
      minZoom: zoomFor(got.size, flagship ? 11 : 9.8),
    };
    commit(label);
    countryLabel.set(index, label);
  });

  // ---- Provinces: inside their province, clear of the country's own name. ----
  projects.forEach((project, index) => {
    if (!project.provinces) return;
    const sub = new Int32Array(N).fill(-1);
    for (let i = 0; i < N; i++) if (owner[i] === index) sub[i] = provinces[i];
    const dSub = insideDistance(sub, W, H);
    const parent = countryLabel.get(index);
    project.provinces.forEach((prov, k) => {
      const pixels = [];
      for (const i of pixelsOf[index]) if (provinces[i] === k) pixels.push(i);
      const cap = Math.min(parent ? parent.size * 0.5 : 8 * S, clamp(Math.sqrt(pixels.length) * 0.11, 3 * S, 8 * S));
      const got = fit({ pixels, inside: (i) => owner[i] === index && provinces[i] === k, dist: dSub, text: prov.name, cap, floor: 2.45 * S, tilt: false, avoid: true, track: 0.06 });
      if (!got) return;
      commit({ id: prov.id, kind: 'province', parent: project.id, text: prov.name, lines: got.lines, x: got.x, y: got.y, size: got.size, angle: 0, spacing: 0.06, minZoom: Math.max(2, zoomFor(got.size, 9.8)) });
    });
  });

  const { land, lakes, ranges = [], towns = [] } = extras;

  // ---- Ranges: along the range, where it runs clear of other lettering. ----
  for (const range of ranges) {
    const pts = range.pts;
    let len = 0;
    for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    if (len < 80 * S) continue;
    const text = namer.range();
    const size = clamp(len / 26, 4.6 * S, 7.5 * S), spacing = 0.22;
    let done = false;
    for (const t of [0.5, 0.38, 0.62, 0.28, 0.72]) {
      const k = clamp(Math.round(t * (pts.length - 1)), 1, pts.length - 2);
      const [x, y] = pts[k];
      let ang = (Math.atan2(pts[k + 1][1] - pts[k - 1][1], pts[k + 1][0] - pts[k - 1][0]) * 180) / Math.PI;
      if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
      if (Math.abs(ang) > 62) continue;
      const label = { id: `range-${labels.length}`, kind: 'range', text, lines: [text], x, y, size, angle: Math.round(ang), spacing, minZoom: Math.max(2, zoomFor(size, 9.8)) };
      const rects = labelRects(label, 1.5 * S);
      if (land && !rects.every((rc) => samples(rc, 3).every(([px, py]) => land[Math.floor(py) * W + Math.floor(px)]))) continue;
      if (!clearOf(rects)) continue;
      commit(label, 1.2 * S); done = true;
      break;
    }
    if (!done) continue;
  }

  // ---- Seas and oceans: in open water, largest first. ----
  if (land) {
    const water = new Int32Array(N);
    for (let i = 0; i < N; i++) water[i] = land[i] ? 1 : 0;
    const dSea = insideDistance(water, W, H);
    const spots = [];
    const step = Math.round(12 * S);
    for (let y = step; y < H - step; y += step) for (let x = step; x < W - step; x += step) {
      const i = y * W + x;
      if (land[i]) continue;
      // The map's edge is not a shore, but lettering should not hang off it.
      const d = Math.min(dSea[i], x - 30 * S, W - x - 30 * S, y - 16 * S, H - y - 16 * S);
      if (d > 20 * S) spots.push({ x, y, d });
    }
    spots.sort((a, b) => b.d - a.d || a.y - b.y || a.x - b.x);
    const taken = [];
    let oceans = 0, seas = 0;
    for (const s of spots) {
      if (oceans + seas >= 9) break;
      const ocean = s.d > 95 * S && oceans < 3;
      const minGap = ocean ? 380 * S : 190 * S;
      if (taken.some((t) => Math.hypot(t.x - s.x, t.y - s.y) < (t.ocean && ocean ? 460 * S : minGap))) continue;
      const text = ocean ? namer.ocean() : namer.sea();
      const size = ocean ? clamp(s.d / 7.5, 12 * S, 17 * S) : clamp(s.d / 5.2, 5.2 * S, 10.5 * S);
      const spacing = ocean ? 0.3 : 0.12;
      const options = ocean || lineWidth(text, spacing) * size > s.d * 1.9 ? [lineBreaks(text)[1] || [text], [text]] : [[text], lineBreaks(text)[1] || [text]];
      for (const lines of options) {
        const label = { id: `sea-${labels.length}`, kind: ocean ? 'ocean' : 'sea', text, lines, x: s.x, y: s.y, size, angle: 0, spacing, minZoom: zoomFor(size, 9.8) };
        const rects = labelRects(label, 3 * S);
        const onWater = rects.every((rc) => samples(rc, 3).every(([px, py]) => px >= 0 && py >= 0 && px < W && py < H && !land[Math.floor(py) * W + Math.floor(px)]));
        if (!onWater || !clearOf(rects)) continue;
        commit(label, 2 * S);
        taken.push({ x: s.x, y: s.y, ocean });
        if (ocean) oceans++; else seas++;
        break;
      }
    }
  }

  // ---- Lakes large enough to hold their name. ----
  if (lakes) {
    const lakeRegion = new Int32Array(N);
    for (let i = 0; i < N; i++) lakeRegion[i] = lakes[i] ? 1 : 0;
    const dLake = insideDistance(lakeRegion, W, H);
    const seen = new Uint8Array(N), stack = new Int32Array(N);
    const found = [];
    for (let s = 0; s < N; s++) {
      if (!lakes[s] || seen[s]) continue;
      const pixels = [];
      let top = 0;
      stack[top++] = s; seen[s] = 1;
      while (top) {
        const i = stack[--top];
        pixels.push(i);
        for (const n of [i - 1, i + 1, i - W, i + W]) if (n >= 0 && n < N && lakes[n] && !seen[n]) { seen[n] = 1; stack[top++] = n; }
      }
      if (pixels.length >= 420 * S * S) found.push(pixels.sort((a, b) => a - b));
    }
    found.sort((a, b) => b.length - a.length || a[0] - b[0]);
    for (const pixels of found.slice(0, 8)) {
      const text = namer.lake();
      const got = fit({ pixels, inside: (i) => lakes[i] === 1, dist: dLake, text, cap: clamp(Math.sqrt(pixels.length) * 0.1, 2.6 * S, 6.5 * S), floor: 2.45 * S, avoid: true, track: 0.04 });
      if (!got) continue;
      commit({ id: `lake-${labels.length}`, kind: 'lake', text, lines: got.lines, x: got.x, y: got.y, size: got.size, angle: got.angle, spacing: 0.04, minZoom: Math.max(2, zoomFor(got.size, 9.8)) });
    }
  }

  // ---- Towns: a dot and a name beside it, capitals first. ----
  const dots = [];
  for (const town of towns) {
    if (dots.some((d) => Math.hypot(d[0] - town.x, d[1] - town.y) < (town.capital ? 26 : 44) * S)) continue;
    const text = namer.town();
    const size = (town.capital ? 4.9 : 3.5) * S;
    const w = lineWidth(text, 0) * size, gap = size * 0.75;
    // Beside the dot: right, left, above, below.
    const spots = [[w / 2 + gap, 0], [-w / 2 - gap, 0], [0, -size * 1.05], [0, size * 1.05], [w / 2 + gap * 0.8, -size * 0.8], [w / 2 + gap * 0.8, size * 0.8]];
    for (const [dx, dy] of spots) {
      const label = { id: `town-${labels.length}`, kind: town.capital ? 'capital' : 'town', text, lines: [text], x: town.x + dx, y: town.y + dy, size, angle: 0, spacing: 0, minZoom: zoomFor(size, 9.8), dot: [Math.round(town.x * 10) / 10, Math.round(town.y * 10) / 10] };
      if (town.capital) label.of = town.id;
      const rects = labelRects(label, 0.9 * S);
      if (rects.some((rc) => rc.cx - rc.hw < 2 || rc.cy - rc.hh < 2 || rc.cx + rc.hw > W - 2 || rc.cy + rc.hh > H - 2)) continue;
      if (!clearOf(rects)) continue;
      commit(label, 0.7 * S);
      dots.push([town.x, town.y]);
      break;
    }
  }

  return labels;
}
