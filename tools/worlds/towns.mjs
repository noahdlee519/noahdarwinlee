// Streets: each town laid out in its country's manner, and the built-up
// ground those streets make.
//
//   grid     a planned lattice turned to the town's own angle
//   radial   rings and spokes round an old centre
//   organic  an irregular old town of crooked lanes
//   linear   a main street along the coast or valley, with side streets
//
// Every town of some size has arterial streets running out along its roads
// and between them; the largest have a ring road. Round the core lie suburbs:
// patches of streets each turned to its own sector, thinning outward, with
// cul-de-sacs. Streets keep to the land and off lakes; only arterials and
// rings bridge a river. The class says when each shows: arterials and rings
// with the roads, streets from zoom 3.5, minor streets from zoom 5.

import { makeNoise, fbm, clamp, smoothstep } from './rng.mjs';
import { RANK } from './settlements.mjs';

// buildStreets({ settlements, exits, cultures, land, elev, hydro, blocked, width, height, rng })
//   => { streets: [{ cls: 'arterial'|'ring'|'street'|'minor', pts }], built: (x, y) => boolean }
export function buildStreets({ settlements, exits, cultures, land, elev, hydro, blocked, width, height, rng }) {
  const W = width, H = height, S = W / 1600;
  const r = rng.fork('streets');
  const nD = makeNoise(r.fork('density')), nA = makeNoise(r.fork('angle'));
  const { lakes, riverClass } = hydro;
  const px = (x, y) => clamp(Math.floor(y), 0, H - 1) * W + clamp(Math.floor(x), 0, W - 1);
  const ground = (x, y) => { const i = px(x, y); return land[i] && !lakes[i] && !(blocked && blocked[i]) && elev[i] < 0.44; };
  const segOk = (a, b, bridge) => {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (0.12 * S)));
    for (let k = 0; k <= n; k++) {
      const x = a[0] + ((b[0] - a[0]) * k) / n, y = a[1] + ((b[1] - a[1]) * k) / n;
      if (!ground(x, y)) return false;
      if (!bridge && riverClass[px(x, y)] >= 1) return false;
    }
    return true;
  };
  const streets = [];
  const add = (cls, pts) => { if (pts.length >= 2) streets.push({ cls, pts: pts.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]) }); };
  // Lines of lattice points: keep the runs whose steps are all good, as polylines.
  const addRuns = (cls, line, keepStep) => {
    let run = [];
    for (let k = 0; k < line.length; k++) {
      if (run.length && !keepStep(run[run.length - 1], line[k])) { if (run.length > 1) add(cls, run); run = []; }
      run.push(line[k]);
    }
    if (run.length > 1) add(cls, run);
  };

  for (const s of settlements) {
    const style = cultures[s.country].streets;
    const big = s.rank === RANK.CAPITAL ? 1 : s.rank === RANK.CITY ? 0.55 + 0.25 * s.size : s.rank === RANK.TOWN ? 0.22 + 0.06 * s.size : 0.08;
    const R = 11 * S * big; // reach of the built-up area
    const dens = (x, y) => {
      const d = Math.hypot(x - s.x, y - s.y) / R;
      const wob = 0.25 * fbm(nD, x / (3 * S), y / (3 * S), 3);
      const e = elev[px(x, y)];
      return clamp(1.15 - d * d * 1.05 + wob, 0, 1) * smoothstep(0.36, 0.2, e);
    };
    const roadAngles = (exits.get(s) || []).map((e) => e.angle).sort((a, b) => a - b);
    const theta0 = roadAngles.length ? roadAngles[0] : r.next() * Math.PI;

    // ---- Villages: a handful of lanes. ----
    if (s.rank === RANK.VILLAGE) {
      const sp = 0.42 * S, th = theta0 + (r.next() - 0.5) * 0.4, c = Math.cos(th), sn = Math.sin(th);
      const n = 1 + r.int(2);
      for (let k = -n; k <= n; k++) {
        const a = [s.x + c * k * sp * 1.6, s.y + sn * k * sp * 1.6];
        const len = (0.5 + r.next() * 0.4) * S;
        const p = [a[0] - sn * len, a[1] + c * len], q = [a[0] + sn * len, a[1] - c * len];
        if (segOk(p, q, false)) add('minor', [p, q]);
      }
      const len = (0.9 + r.next() * 0.6) * S;
      const p = [s.x - c * len, s.y - sn * len], q = [s.x + c * len, s.y + sn * len];
      if (segOk(p, q, false)) add('minor', [p, q]);
      continue;
    }

    // ---- Arterials: out along the roads, and between them where the gap is wide. ----
    const arts = roadAngles.slice();
    if (s.rank <= RANK.CITY) {
      const all = roadAngles.length ? roadAngles : [theta0];
      for (let k = 0; k < all.length; k++) {
        const a = all[k], b = k + 1 < all.length ? all[k + 1] : all[0] + Math.PI * 2;
        const gap = b - a, n = Math.floor(gap / 1.1);
        for (let q = 1; q <= n; q++) arts.push(a + (gap * q) / (n + 1) + (r.next() - 0.5) * 0.15);
      }
      for (const a0 of arts.slice(roadAngles.length)) {
        const pts = [[s.x, s.y]];
        let a = a0, x = s.x, y = s.y;
        for (let t = 0; t < R * 1.05; t += 0.5 * S) {
          a += 0.07 * fbm(nA, x / (4 * S), y / (4 * S), 2);
          const nx = x + Math.cos(a) * 0.5 * S, ny = y + Math.sin(a) * 0.5 * S;
          if (!segOk([x, y], [nx, ny], true)) break;
          x = nx; y = ny; pts.push([x, y]);
        }
        if (pts.length > 3) add('arterial', pts);
      }
    }

    // ---- A ring road round the largest. ----
    if (s.rank === RANK.CAPITAL || (s.rank === RANK.CITY && s.size > 1.25)) {
      for (const rf of s.rank === RANK.CAPITAL ? [0.42, 0.78] : [0.6]) {
        const rr = R * rf, ring = [];
        const ph = r.next() * 6.28;
        for (let k = 0; k <= 40; k++) {
          const a = (k / 40) * Math.PI * 2;
          const rad = rr * (1 + 0.1 * Math.sin(2 * a + ph) + 0.06 * Math.sin(3 * a + ph * 2));
          ring.push([s.x + Math.cos(a) * rad, s.y + Math.sin(a) * rad]);
        }
        addRuns('ring', ring, (p, q) => segOk(p, q, true));
      }
    }

    // ---- The core. ----
    const rc = Math.max(R * (s.rank === RANK.TOWN ? 0.75 : 0.42), 1.1 * S);
    const keepCore = (p, q) => {
      const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      return Math.hypot(m[0] - s.x, m[1] - s.y) < rc * (0.85 + 0.3 * fbm(nD, m[0] / (2 * S), m[1] / (2 * S), 2)) && segOk(p, q, false) && r.next() < 0.93;
    };
    if (style === 'grid' || style === 'linear') {
      const th = style === 'grid' ? theta0 : theta0, c = Math.cos(th), sn = Math.sin(th);
      const sp = (style === 'grid' ? 0.62 : 0.55) * S;
      const n = Math.ceil(rc / sp) + 1;
      const along = style === 'linear' ? n : n, across = style === 'linear' ? Math.max(2, Math.ceil(n * 0.35)) : n;
      for (let i = -across; i <= across; i++) {
        const line = [];
        for (let j = -along; j <= along; j++) line.push([s.x + c * j * sp - sn * i * sp, s.y + sn * j * sp + c * i * sp]);
        addRuns('street', line, keepCore);
      }
      for (let j = -along; j <= along; j++) {
        if (style === 'linear' && j % 2) continue;
        const line = [];
        for (let i = -across; i <= across; i++) line.push([s.x + c * j * sp - sn * i * sp, s.y + sn * j * sp + c * i * sp]);
        addRuns('street', line, keepCore);
      }
    } else {
      // Organic and radial cores: a jittered lattice of crooked lanes; the radial one also has rings and spokes.
      const sp = 0.5 * S, n = Math.ceil(rc / sp) + 1;
      const th = theta0 + 0.4, c = Math.cos(th), sn = Math.sin(th);
      const P = [];
      for (let i = -n; i <= n; i++) {
        const row = [];
        for (let j = -n; j <= n; j++) {
          const jx = (r.next() - 0.5) * sp * 0.75, jy = (r.next() - 0.5) * sp * 0.75;
          row.push([s.x + c * j * sp - sn * i * sp + jx, s.y + sn * j * sp + c * i * sp + jy]);
        }
        P.push(row);
      }
      const pOn = style === 'radial' ? 0.55 : 0.78;
      for (let i = 0; i < P.length; i++) for (let j = 0; j < P.length; j++) {
        if (j + 1 < P.length && r.next() < pOn && keepCore(P[i][j], P[i][j + 1])) add('street', [P[i][j], P[i][j + 1]]);
        if (i + 1 < P.length && r.next() < pOn * 0.85 && keepCore(P[i][j], P[i + 1][j])) add('street', [P[i][j], P[i + 1][j]]);
      }
      if (style === 'radial') {
        for (const f of [0.35, 0.65, 0.95]) {
          const ring = [];
          for (let k = 0; k <= 28; k++) { const a = (k / 28) * Math.PI * 2; ring.push([s.x + Math.cos(a) * rc * f, s.y + Math.sin(a) * rc * f]); }
          addRuns('street', ring, (p, q) => segOk(p, q, false));
        }
        for (let k = 0; k < 14; k++) {
          const a = theta0 + (k / 14) * Math.PI * 2;
          addRuns('street', [[s.x + Math.cos(a) * rc * 0.12, s.y + Math.sin(a) * rc * 0.12], [s.x + Math.cos(a) * rc * 0.55, s.y + Math.sin(a) * rc * 0.55], [s.x + Math.cos(a) * rc, s.y + Math.sin(a) * rc]], (p, q) => segOk(p, q, false));
        }
      }
    }

    // ---- Suburbs: in each sector between arterials, a patch of streets turned its own way. ----
    if (s.rank <= RANK.TOWN) {
      const angles = (arts.length ? arts : [theta0]).map((a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)).sort((a, b) => a - b);
      const sp = (style === 'grid' ? 0.72 : 0.82) * S;
      for (let k = 0; k < angles.length; k++) {
        const a = angles[k], b = k + 1 < angles.length ? angles[k + 1] : angles[0] + Math.PI * 2;
        const mid = (a + b) / 2;
        const th = style === 'grid' ? theta0 : mid + (r.next() - 0.5) * 0.5;
        const c = Math.cos(th), sn = Math.sin(th);
        const n = Math.ceil(R / sp) + 1;
        const inSector = (p) => {
          let ang = Math.atan2(p[1] - s.y, p[0] - s.x);
          ang = ((ang - a) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
          return ang > 0.04 && ang < b - a - 0.04;
        };
        const keepSub = (p, q) => {
          const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
          const d = Math.hypot(m[0] - s.x, m[1] - s.y);
          if (d < rc * 0.95 || d > R || !inSector(m)) return false;
          return dens(m[0], m[1]) > 0.42 + 0.25 * r.next() && segOk(p, q, false);
        };
        const ox = s.x + Math.cos(mid) * R * 0.5, oy = s.y + Math.sin(mid) * R * 0.5;
        for (let i = -n; i <= n; i++) {
          const line = [];
          for (let j = -n; j <= n; j++) line.push([ox + c * j * sp - sn * i * sp, oy + sn * j * sp + c * i * sp]);
          addRuns(i % 3 === 0 ? 'street' : 'minor', line, keepSub);
        }
        for (let j = -n; j <= n; j++) {
          const line = [];
          for (let i = -n; i <= n; i++) line.push([ox + c * j * sp - sn * i * sp, oy + sn * j * sp + c * i * sp]);
          // Cross streets are fewer: blocks are long, as in suburbs.
          if (style !== 'grid' && j % 2) {
            // Cul-de-sacs instead: short dead ends off the long streets.
            for (let i = -n; i < n; i += 2) {
              const p = line[i + n], q = [p[0] + sn * sp * 0.55 * (r.chance(0.5) ? 1 : -1), p[1] - c * sp * 0.55];
              if (r.next() < 0.35 && keepSub(p, q)) add('minor', [p, q]);
            }
            continue;
          }
          addRuns(j % 4 === 0 ? 'street' : 'minor', line, keepSub);
        }
      }
    }
  }

  // ---- The built-up ground: whatever lies close to a street. ----
  const G = 1, gw = Math.ceil(W / G), gh = Math.ceil(H / G);
  const grid = new Map();
  const segs = [];
  for (const st of streets) for (let k = 1; k < st.pts.length; k++) segs.push([st.pts[k - 1], st.pts[k], st.cls === 'minor' ? 0.33 * S : 0.42 * S]);
  segs.forEach((sg, n) => {
    const [a, b, w] = sg;
    const x0 = Math.floor((Math.min(a[0], b[0]) - w) / G), x1 = Math.floor((Math.max(a[0], b[0]) + w) / G);
    const y0 = Math.floor((Math.min(a[1], b[1]) - w) / G), y1 = Math.floor((Math.max(a[1], b[1]) + w) / G);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= gw || y >= gh) continue;
      const key = y * gw + x;
      let list = grid.get(key);
      if (!list) grid.set(key, (list = []));
      list.push(n);
    }
  });
  const built = (x, y) => {
    const list = grid.get(Math.floor(y / G) * gw + Math.floor(x / G));
    if (!list) return false;
    for (const n of list) {
      const [a, b, w] = segs[n];
      const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-9;
      const t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l2, 0, 1);
      if ((a[0] + dx * t - x) ** 2 + (a[1] + dy * t - y) ** 2 < w * w) return true;
    }
    return false;
  };
  return { streets, built };
}
