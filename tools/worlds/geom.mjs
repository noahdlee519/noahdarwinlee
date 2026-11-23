// Geometry of the drawn map: the path data the world files hold, read back as a browser reads it, so the
// generator (and its tests) can ask what a point of the drawing is: sea, lake, or land.
//
//   pathLines(d)            path data (M, L, H, V, Q, T, Z, either case) to polylines, curves flattened
//   new Fill(d, rule)       a filled path: fill.inside(x, y), by the nonzero or even-odd rule
//   new Strokes(d)          stroked lines: strokes.near(x, y, r), whether a point lies within r of one
//   drawnCurve(pts)         the curve the world files draw through a polyline (see output.mjs: drawOpen)

// Path data to polylines: [{ pts: [[x, y], ...], closed }]. Each quadratic curve is flattened into `steps` pieces.
export function pathLines(d, steps = 6) {
  const out = [];
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) || [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, qx = 0, qy = 0, lastQ = false, cur = null;
  const num = () => parseFloat(tokens[i++]);
  const quad = (cx, cy, ex, ey) => {
    const x0 = x, y0 = y;
    for (let k = 1; k <= steps; k++) {
      const t = k / steps, u = 1 - t;
      cur.pts.push([u * u * x0 + 2 * u * t * cx + t * t * ex, u * u * y0 + 2 * u * t * cy + t * t * ey]);
    }
    x = ex; y = ey;
  };
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    if (C === 'Z') { if (cur) cur.closed = true; x = sx; y = sy; lastQ = false; cur = null; continue; }
    if (C === 'M') {
      const mx = num(), my = num();
      x = rel ? x + mx : mx; y = rel ? y + my : my; sx = x; sy = y;
      cur = { pts: [[x, y]], closed: false }; out.push(cur);
      cmd = rel ? 'l' : 'L'; lastQ = false;
      continue;
    }
    if (!cur) { cur = { pts: [[x, y]], closed: false }; out.push(cur); sx = x; sy = y; }
    let wasQ = false;
    if (C === 'L') { const a = num(), b = num(); x = rel ? x + a : a; y = rel ? y + b : b; cur.pts.push([x, y]); }
    else if (C === 'H') { const a = num(); x = rel ? x + a : a; cur.pts.push([x, y]); }
    else if (C === 'V') { const b = num(); y = rel ? y + b : b; cur.pts.push([x, y]); }
    else if (C === 'Q') {
      const a = num(), b = num(), c = num(), e = num();
      qx = rel ? x + a : a; qy = rel ? y + b : b;
      quad(qx, qy, rel ? x + c : c, rel ? y + e : e); wasQ = true;
    } else if (C === 'T') {
      const c = num(), e = num();
      qx = lastQ ? 2 * x - qx : x; qy = lastQ ? 2 * y - qy : y;
      quad(qx, qy, rel ? x + c : c, rel ? y + e : e); wasQ = true;
    } else { i++; continue; }
    lastQ = wasQ;
  }
  return out;
}

// A filled path, for point-in-shape questions: its edges, bucketed by rows a unit high.
export class Fill {
  constructor(d, rule = 'nonzero', steps = 6) {
    this.rule = rule;
    this.rows = new Map();
    const lines = typeof d === 'string' ? pathLines(d, steps) : d;
    for (const { pts } of lines) {
      for (let k = 0; k < pts.length; k++) {
        const a = pts[k], b = pts[(k + 1) % pts.length];
        if (a[1] === b[1]) continue;
        const y0 = Math.floor(Math.min(a[1], b[1])), y1 = Math.floor(Math.max(a[1], b[1]));
        const e = a[1] < b[1] ? [a[0], a[1], b[0], b[1], 1] : [b[0], b[1], a[0], a[1], -1];
        for (let r = y0; r <= y1; r++) { let row = this.rows.get(r); if (!row) this.rows.set(r, (row = [])); row.push(e); }
      }
    }
  }
  // The winding number (or crossing count) of a ray from the point towards +x.
  winding(x, y) {
    const row = this.rows.get(Math.floor(y));
    if (!row) return 0;
    let w = 0;
    for (const [x0, y0, x1, y1, dir] of row) {
      if (y < y0 || y >= y1) continue;
      const cx = x0 + ((y - y0) / (y1 - y0)) * (x1 - x0);
      if (cx > x) w += this.rule === 'evenodd' ? 1 : dir;
    }
    return w;
  }
  inside(x, y) {
    const w = this.winding(x, y);
    return this.rule === 'evenodd' ? (w & 1) === 1 : w !== 0;
  }
}

// Stroked lines (rivers): segments bucketed on a grid, each with its half-width.
export class Strokes {
  constructor(list, G = 4) {
    this.G = G;
    this.cells = new Map();
    for (const { d, width } of list) {
      for (const { pts } of pathLines(d)) {
        for (let k = 1; k < pts.length; k++) {
          const a = pts[k - 1], b = pts[k], hw = width / 2;
          const gx0 = Math.floor((Math.min(a[0], b[0]) - hw) / G), gx1 = Math.floor((Math.max(a[0], b[0]) + hw) / G);
          const gy0 = Math.floor((Math.min(a[1], b[1]) - hw) / G), gy1 = Math.floor((Math.max(a[1], b[1]) + hw) / G);
          for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
            const key = gy * 100000 + gx;
            let c = this.cells.get(key);
            if (!c) this.cells.set(key, (c = []));
            c.push([a[0], a[1], b[0], b[1], hw]);
          }
        }
      }
    }
  }
  // Whether a point lies on a stroke (within its half-width, plus `pad`).
  near(x, y, pad = 0) {
    const c = this.cells.get(Math.floor(y / this.G) * 100000 + Math.floor(x / this.G));
    if (!c) return false;
    for (const [ax, ay, bx, by, hw] of c) {
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-12;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
      if (Math.hypot(ax + dx * t - x, ay + dy * t - y) <= hw + pad) return true;
    }
    return false;
  }
}

// The curve drawn through a polyline, as output.mjs draws an open line: straight to the first segment's midpoint,
// then quadratic curves through the midpoints with the vertices as control points, and straight to the end.
// Returned flattened, about `step` apart.
export function drawnCurve(pts, step = 0.1) {
  const n = pts.length - 1;
  if (n < 1) return pts.slice();
  const out = [pts[0]];
  const seg = (a, b) => {
    const m = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 1; k <= m; k++) out.push([a[0] + ((b[0] - a[0]) * k) / m, a[1] + ((b[1] - a[1]) * k) / m]);
  };
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  if (n === 1) { seg(pts[0], pts[1]); return out; }
  seg(pts[0], mid(pts[0], pts[1]));
  for (let k = 1; k < n; k++) {
    const a = mid(pts[k - 1], pts[k]), c = pts[k], b = mid(pts[k], pts[k + 1]);
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]) + Math.hypot(b[0] - c[0], b[1] - c[1]);
    const m = Math.max(1, Math.ceil(len / step));
    for (let j = 1; j <= m; j++) {
      const t = j / m, u = 1 - t;
      out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
    }
  }
  seg(mid(pts[n - 1], pts[n]), pts[n]);
  return out;
}

// The drawn water of a world, from its files: the sea (the map less the coast), lakes, estuaries, and the small
// lakes of the finer detail. water(x, y) => whether the point is drawn as water. Rivers are lines, apart: river(x, y).
export function drawnWater(data, detail = null, chunks = []) {
  const coast = new Fill(data.coast, 'evenodd');
  const fills = [];
  if (data.lakes) fills.push(new Fill(data.lakes));
  if (data.estuaries && data.estuaries.fill) fills.push(new Fill(data.estuaries.fill));
  if (detail && detail.lakes) fills.push(new Fill(detail.lakes));
  for (const c of chunks) if (c && c.lakes) fills.push(new Fill(c.lakes));
  const W = data.width, H = data.height;
  const sea = (x, y) => {
    if (y < 0) return !(data.polar && data.polar.includes('n'));
    if (y >= H) return !(data.polar && data.polar.includes('s'));
    const xx = ((x % W) + W) % W;
    return !coast.inside(xx, y);
  };
  const water = (x, y) => sea(x, y) || fills.some((f) => f.inside(x, y));
  const rivers = new Strokes((data.rivers || []).map((r) => ({ d: r.path, width: r.width })));
  return { sea, water, river: (x, y, pad = 0) => rivers.near(x, y, pad) };
}
