// Towns and cities: the built-up ground each place covers, and its streets,
// after the way places look on a web map at a city zoom: a soft light-grey
// patch with an irregular outline that follows the coast, the river, and the
// lie of the land, with streets as thin pale lines inside it.
//
// Every place is laid out by its type, which comes from its site, its size,
// and its country's manner:
//
//   mainstreet  a village or town strung along one street, with a few lanes off it
//   crossroads  a village or town round a crossing, with a few blocks
//   grid        a dense planned lattice turned to the place's own angle
//   planned     a new town: a lattice with diagonal avenues through a central circle
//   medieval    an irregular old core of crooked lanes, with streets fanning out
//   radial      rings and spokes round an old centre
//   coastal     a strip along the shore: streets that follow the coast, short ones down to it
//   port        wrapped round its harbour, streets converging on the waterfront
//   river       astride a river, streets along both banks, joined by bridges
//   hill        streets that follow the contours, with a few steep links
//   sprawl      a small core and wide suburbs of curving streets and cul-de-sacs
//
// Only the few largest cities have a ring road. Arterials run out of the
// larger places between their roads. Streets keep to the land and off lakes;
// only arterials and bridges cross a river. The classes say when each shows:
// arterials and rings with the roads, streets from zoom 3.5, minor streets from 5.

import { makeNoise, fbm, clamp, smoothstep } from './rng.mjs';
import { RANK } from './settlements.mjs';

export const TOWN_TYPES = ['mainstreet', 'crossroads', 'grid', 'planned', 'medieval', 'radial', 'coastal', 'port', 'river', 'hill', 'sprawl'];

// The built-up ground is kept as a field, four samples to the map unit; a point is built up where the field, read
// between its samples, is over half. So the outline is smooth at every zoom.
const FS = 4;

// buildStreets({ settlements, exits, cultures, land, elev, hydro, blocked, width, height, rng, dist, rivers, riverMeta })
//   => { streets: [{ cls: 'arterial'|'ring'|'street'|'minor', pts }], built: (x, y) => boolean, layouts: [{ type, ring }] }
export function buildStreets({ settlements, exits, cultures, land, elev, hydro, blocked, width, height, rng, dist, rivers = [], riverMeta = [] }) {
  const W = width, H = height, S = W / 1600;
  const r = rng.fork('streets');
  const nU = makeNoise(r.fork('urban')), nU2 = makeNoise(r.fork('urban2')), nA = makeNoise(r.fork('angle')), nW = makeNoise(r.fork('warp'));
  const { lakes, riverClass } = hydro;
  const px = (x, y) => clamp(Math.floor(y), 0, H - 1) * W + clamp(Math.floor(x), 0, W - 1);
  const bil = (F, x, y) => {
    const fx = clamp(x - 0.5, 0, W - 1.001), fy = clamp(y - 0.5, 0, H - 1.001);
    const ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy, k = iy * W + ix;
    return F[k] * (1 - u) * (1 - v) + F[k + 1] * u * (1 - v) + F[k + W] * (1 - u) * v + F[k + W + 1] * u * v;
  };
  const E = (x, y) => bil(elev, x, y);
  const D = dist ? (x, y) => bil(dist, x, y) : () => 9;
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

  // ---- The built-up field. ----
  const FW = W * FS, FH = H * FS;
  const field = new Uint8Array(FW * FH);
  const urbanAt = (x, y) => {
    const fx = clamp(x * FS - 0.5, 0, FW - 1.001), fy = clamp(y * FS - 0.5, 0, FH - 1.001);
    const ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy, k = iy * FW + ix;
    return (field[k] * (1 - u) * (1 - v) + field[k + 1] * u * (1 - v) + field[k + FW] * (1 - u) * v + field[k + FW + 1] * u * v) / 255;
  };
  const built = (x, y) => urbanAt(x, y) > 0.5;

  // The drawn river nearest a point, within reach: { pts (a stretch of it), dir: [dx, dy], at: [x, y], d }.
  const RG = 8 * S, rgw = Math.ceil(W / RG), rgh = Math.ceil(H / RG);
  const rgrid = Array.from({ length: rgw * rgh }, () => []);
  rivers.forEach((pts, k) => {
    if (!riverMeta[k] || riverMeta[k].width < 2) return;
    for (let j = 1; j < pts.length; j++) rgrid[clamp(Math.floor(pts[j][1] / RG), 0, rgh - 1) * rgw + clamp(Math.floor(pts[j][0] / RG), 0, rgw - 1)].push([k, j]);
  });
  const nearRiver = (x, y, reach) => {
    let best = null;
    const gx = Math.floor(x / RG), gy = Math.floor(y / RG);
    for (let yy = gy - 1; yy <= gy + 1; yy++) for (let xx = gx - 1; xx <= gx + 1; xx++) {
      if (yy < 0 || xx < 0 || yy >= rgh || xx >= rgw) continue;
      for (const [k, j] of rgrid[yy * rgw + xx]) {
        const [ax, ay] = rivers[k][j - 1], [bx, by] = rivers[k][j];
        const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9;
        const t = clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1);
        const qx = ax + dx * t, qy = ay + dy * t, d = Math.hypot(qx - x, qy - y);
        if (d < reach && (!best || d < best.d)) best = { k, j, d, at: [qx, qy] };
      }
    }
    if (!best) return null;
    const pts = rivers[best.k];
    const a = pts[Math.max(0, best.j - 6)], b = pts[Math.min(pts.length - 1, best.j + 5)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return { ...best, dir: [(b[0] - a[0]) / l, (b[1] - a[1]) / l], pts: pts.slice(Math.max(0, best.j - 60), best.j + 60) };
  };
  const distToLine = (pts, x, y) => {
    let best = Infinity;
    for (let j = 1; j < pts.length; j++) {
      const [ax, ay] = pts[j - 1], [bx, by] = pts[j];
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9;
      const t = clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1);
      best = Math.min(best, Math.hypot(ax + dx * t - x, ay + dy * t - y));
    }
    return best;
  };

  // ---- Each place's type. ----
  const reachOf = (s) => (s.rank === RANK.CAPITAL ? 1 : s.rank === RANK.CITY ? 0.55 + 0.25 * s.size : s.rank === RANK.TOWN ? 0.24 + 0.07 * s.size : 0.085) * 11 * S;
  // Ring roads for the few largest cities only.
  const ringers = new Set(settlements.filter((s) => s.rank <= RANK.CITY).map((s) => ({ s, v: reachOf(s) * (s.rank === RANK.CAPITAL ? 1.15 : 1) + r.next() * 0.8 * S })).sort((a, b) => b.v - a.v).slice(0, 3).map((e) => e.s));
  const layouts = [];
  const typeOf = (s, style) => {
    const e0 = E(s.x, s.y), coast = D(s.x, s.y) < 3.2 * S;
    const relief = Math.max(...[[3, 0], [-3, 0], [0, 3], [0, -3]].map(([dx, dy]) => Math.abs(E(s.x + dx * S, s.y + dy * S) - e0)));
    const hilly = e0 > 0.06 && relief > 0.009;
    const river = nearRiver(s.x, s.y, 3.5 * S);
    const u = r.next();
    if (s.rank === RANK.VILLAGE) return u < 0.62 ? 'mainstreet' : 'crossroads';
    if (s.rank === RANK.TOWN) {
      if (coast && u < 0.35) return 'coastal';
      if (river && u < 0.5) return 'river';
      if (hilly && u < 0.6) return 'hill';
      if (style === 'grid' && u < 0.55) return 'grid';
      return u < 0.75 ? 'mainstreet' : 'crossroads';
    }
    if (coast) {
      // A harbour wants a bay: count the sea round the place.
      let sea = 0;
      for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; if (D(s.x + Math.cos(a) * 5 * S, s.y + Math.sin(a) * 5 * S) < 0.5) sea++; }
      if (sea >= 4 && sea <= 8 && u < 0.3) return 'port';
      if (u < 0.5) return 'coastal';
    }
    if (river && r.next() < 0.75) return 'river';
    if (hilly && r.next() < 0.7) return 'hill';
    if (r.next() < 0.22) return 'sprawl';
    if (style === 'grid') return s.rank === RANK.CAPITAL || r.next() < 0.3 ? 'planned' : 'grid';
    if (style === 'radial') return 'radial';
    if (style === 'organic') return 'medieval';
    return coast ? 'coastal' : r.next() < 0.5 ? 'sprawl' : 'medieval';
  };

  const streets = [];
  const add = (cls, pts) => { if (pts.length >= 2) streets.push({ cls, pts: pts.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]) }); };

  for (const s of settlements) {
    const style = cultures[s.country].streets;
    const R = reachOf(s);
    const type = typeOf(s, style);
    const ring = ringers.has(s);
    layouts.push({ type, ring });
    const roadAngles = (exits.get(s) || []).map((e) => e.angle).sort((a, b) => a - b);
    const theta0 = roadAngles.length ? roadAngles[0] : r.next() * Math.PI;
    const e0 = E(s.x, s.y);
    const river = type === 'river' ? nearRiver(s.x, s.y, 3.6 * S) : null;
    const coastDir = (() => { // the way down to the sea, roughly
      const g = [D(s.x + S, s.y) - D(s.x - S, s.y), D(s.x, s.y + S) - D(s.x, s.y - S)], l = Math.hypot(g[0], g[1]) || 1;
      return [-g[0] / l, -g[1] / l];
    })();

    // ---- The footprint: q < 1 is built up. ----
    const iso = (a, b) => Math.hypot(a, b);
    const ribbons = roadAngles.map((a) => [Math.cos(a), Math.sin(a)]);
    const Lr = R * (type === 'sprawl' ? 1.5 : s.rank === RANK.VILLAGE ? 1.8 : 1.25), Wr = Math.max(0.55 * S, R * (s.rank === RANK.VILLAGE ? 0.45 : 0.2));
    const gridA = theta0 + (r.next() - 0.5) * 0.3, gc = Math.cos(gridA), gs = Math.sin(gridA);
    const q = (x, y) => {
      const dx = x - s.x, dy = y - s.y, d = iso(dx, dy);
      let v;
      switch (type) {
        case 'grid': case 'planned': {
          const a = Math.abs(dx * gc + dy * gs) / R, b = Math.abs(-dx * gs + dy * gc) / (R * 0.85);
          v = Math.pow(a ** 4 + b ** 4, 0.25);
          break;
        }
        case 'coastal': v = Math.max(d / (R * 1.9), D(x, y) / Math.max(1.3 * S, R * 0.42)); break;
        case 'port': v = Math.min(Math.max(d / (R * 1.15), D(x, y) / (R * 0.62)), d / (R * 0.45)); break;
        case 'river': {
          const [ux, uy] = river ? river.dir : [1, 0];
          const ox = river ? x - river.at[0] : dx, oy = river ? y - river.at[1] : dy;
          v = iso((ox * ux + oy * uy) / (R * 1.5), (-ox * uy + oy * ux) / (R * 0.75));
          break;
        }
        case 'hill': v = Math.max(d / (R * 1.25), Math.abs(E(x, y) - e0) / 0.05); break;
        case 'sprawl': v = d / (R * 1.25); break;
        case 'mainstreet': {
          const [ux, uy] = ribbons[0] || [Math.cos(theta0), Math.sin(theta0)];
          v = iso((dx * ux + dy * uy) / (R * 1.7), (-dx * uy + dy * ux) / (R * 0.5));
          break;
        }
        default: v = d / R;
      }
      // Ribbons of building out along the roads.
      for (const [ux, uy] of ribbons) {
        const t = dx * ux + dy * uy;
        if (t <= 0) continue;
        v = Math.min(v, Math.max(t / Lr, Math.abs(-dx * uy + dy * ux) / Wr) + 0.12);
      }
      // A ragged, organic edge, frayed more on the larger places.
      const sc = Math.max(1.2 * S, R * 0.33);
      v += 0.38 * fbm(nU, x / sc, y / sc, 3) + 0.16 * fbm(nU2, x / (sc * 0.28), y / (sc * 0.28), 3);
      // Not up the steep or high ground, unless the town is a hill town.
      const e = E(x, y);
      v += type === 'hill' ? 3 * smoothstep(0.36, 0.44, e) : 2.5 * smoothstep(0.2, 0.34, e) + 1.5 * smoothstep(0.03, 0.08, Math.abs(e - e0));
      return v;
    };
    const span = R * (type === 'coastal' ? 2.3 : type === 'sprawl' ? 1.8 : type === 'mainstreet' ? 2 : 1.6) + (ribbons.length ? Lr - R * 0.6 : 0) + 1.5 * S;
    const fx0 = Math.max(0, Math.floor((s.x - span) * FS)), fx1 = Math.min(FW - 1, Math.ceil((s.x + span) * FS));
    const fy0 = Math.max(0, Math.floor((s.y - span) * FS)), fy1 = Math.min(FH - 1, Math.ceil((s.y + span) * FS));
    for (let fy = fy0; fy <= fy1; fy++) for (let fx = fx0; fx <= fx1; fx++) {
      const x = (fx + 0.5) / FS, y = (fy + 0.5) / FS;
      if (!ground(x, y)) continue;
      const v = q(x, y);
      if (v > 1.4) continue;
      const val = clamp(Math.round((0.5 + (1 - v) * 2.5) * 255), 0, 255);
      const k = fy * FW + fx;
      if (val > field[k]) field[k] = val;
    }
    const inside = (p) => q(p[0], p[1]) < 0.98 && ground(p[0], p[1]);
    const keep = (p, qq, bridge = false) => inside(p) && inside(qq) && inside([(p[0] + qq[0]) / 2, (p[1] + qq[1]) / 2]) && segOk(p, qq, bridge);
    const addRuns = (cls, line, ok = keep) => {
      let run = [];
      for (let k = 0; k < line.length; k++) {
        if (run.length && !ok(run[run.length - 1], line[k])) { if (run.length > 1) add(cls, run); run = []; }
        run.push(line[k]);
      }
      if (run.length > 1) add(cls, run);
    };
    // A lattice turned to angle th, spacing sp, centred on (ox, oy), n lines each way: every line with its class.
    const lattice = (ox, oy, th, sp, n, clsOf, warp = 0, crossEvery = 1) => {
      const c = Math.cos(th), sn = Math.sin(th);
      const P = (i, j) => {
        let x = ox + c * j * sp - sn * i * sp, y = oy + sn * j * sp + c * i * sp;
        if (warp) { x += warp * fbm(nW, x / (3 * S), y / (3 * S), 2); y += warp * fbm(nW, x / (3 * S) + 5.2, y / (3 * S) - 1.7, 2); }
        return [x, y];
      };
      for (let i = -n; i <= n; i++) { const line = []; for (let j = -n; j <= n; j++) line.push(P(i, j)); addRuns(clsOf(i, 0), line); }
      for (let j = -n; j <= n; j++) { if (j % crossEvery) continue; const line = []; for (let i = -n; i <= n; i++) line.push(P(i, j)); addRuns(clsOf(j, 1), line); }
    };
    // Lines along a field's contours (marching squares on a local grid), spaced `gap` in the field's units.
    const contours = (f, levels, cls, step = 0.14 * S) => {
      const nx = Math.ceil((2 * span) / step), ny = nx, x0 = s.x - span, y0 = s.y - span;
      const val = new Float32Array((nx + 1) * (ny + 1));
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) val[j * (nx + 1) + i] = f(x0 + i * step, y0 + j * step);
      for (const L of levels) {
        const segs = [];
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
          const a = val[j * (nx + 1) + i] - L, b = val[j * (nx + 1) + i + 1] - L, c = val[(j + 1) * (nx + 1) + i + 1] - L, d = val[(j + 1) * (nx + 1) + i] - L;
          const pts = [];
          const X = (t, u) => [x0 + (i + t) * step, y0 + (j + u) * step];
          if ((a < 0) !== (b < 0)) pts.push(X(a / (a - b), 0));
          if ((b < 0) !== (c < 0)) pts.push(X(1, b / (b - c)));
          if ((c < 0) !== (d < 0)) pts.push(X(1 - c / (c - d), 1));
          if ((d < 0) !== (a < 0)) pts.push(X(0, 1 - d / (d - a)));
          if (pts.length >= 2) segs.push([pts[0], pts[1]]);
          if (pts.length === 4) segs.push([pts[2], pts[3]]);
        }
        for (const line of chain(segs)) addRuns(cls, simplifyLine(line, 0.05 * S));
      }
    };

    // ---- Streets, by type. ----
    const sp = (type === 'grid' ? 0.6 : type === 'planned' ? 0.66 : 0.65) * S;
    const n = Math.ceil((span * 1.1) / sp);
    switch (type) {
      case 'mainstreet': case 'crossroads': {
        const dirs = [theta0];
        if (type === 'crossroads') dirs.push(roadAngles.length > 1 ? roadAngles[1] : theta0 + Math.PI / 2 + (r.next() - 0.5) * 0.5);
        for (const a of dirs) {
          const c = Math.cos(a), sn = Math.sin(a), L = R * 1.9;
          const main = [];
          for (let t = -L; t <= L; t += 0.3 * S) main.push([s.x + c * t + 0.15 * S * fbm(nW, t / (2 * S), a, 1) * -sn, s.y + sn * t + 0.15 * S * fbm(nW, t / (2 * S), a, 1) * c]);
          addRuns(s.rank === RANK.VILLAGE ? 'minor' : 'street', main);
          // Lanes off the main street, and in a town a back street or two.
          for (let t = -L; t <= L; t += (0.42 + r.next() * 0.3) * S) {
            if (r.next() < 0.35) continue;
            const side = r.chance(0.5) ? 1 : -1, len = (0.3 + r.next() * 0.5) * S * (s.rank === RANK.VILLAGE ? 1 : 1.4);
            const p = [s.x + c * t, s.y + sn * t];
            addRuns('minor', [p, [p[0] - sn * len * side, p[1] + c * len * side]]);
          }
          if (s.rank === RANK.TOWN) for (const off of [-0.5, 0.5]) {
            const back = [];
            for (let t = -L * 0.6; t <= L * 0.6; t += 0.3 * S) back.push([s.x + c * t - sn * off * S, s.y + sn * t + c * off * S]);
            if (r.next() < 0.7) addRuns('minor', back);
          }
        }
        if (type === 'crossroads' && s.rank === RANK.TOWN) lattice(s.x, s.y, theta0, 0.45 * S, 3, () => 'minor');
        break;
      }
      case 'grid':
        lattice(s.x, s.y, gridA, sp, n, (k) => (k % 5 === 0 && s.rank <= RANK.CITY ? 'arterial' : Math.abs(k) * sp < R * 0.6 || k % 2 === 0 ? 'street' : 'minor'));
        break;
      case 'planned': {
        lattice(s.x, s.y, gridA, sp, n, (k) => (k % 2 === 0 ? 'street' : 'minor'));
        // Diagonal avenues through a central circle.
        const rc = R * 0.12;
        for (const off of [Math.PI / 4, -Math.PI / 4, Math.PI / 4 + Math.PI, -Math.PI / 4 + Math.PI]) {
          const a = gridA + off, line = [];
          for (let t = rc; t <= span; t += 0.3 * S) line.push([s.x + Math.cos(a) * t, s.y + Math.sin(a) * t]);
          addRuns('arterial', line);
        }
        const circ = [];
        for (let k = 0; k <= 20; k++) { const a = (k / 20) * Math.PI * 2; circ.push([s.x + Math.cos(a) * rc, s.y + Math.sin(a) * rc]); }
        addRuns('arterial', circ);
        break;
      }
      case 'medieval': case 'radial': {
        // The old core: crooked lanes.
        const rc = R * 0.36, csp = 0.42 * S, cn = Math.ceil(rc / csp) + 1, th = theta0 + 0.4, c = Math.cos(th), sn = Math.sin(th);
        const P = [];
        for (let i = -cn; i <= cn; i++) { const row = []; for (let j = -cn; j <= cn; j++) row.push([s.x + c * j * csp - sn * i * csp + (r.next() - 0.5) * csp * 0.8, s.y + sn * j * csp + c * i * csp + (r.next() - 0.5) * csp * 0.8]); P.push(row); }
        const inCore = (p, qq) => Math.hypot((p[0] + qq[0]) / 2 - s.x, (p[1] + qq[1]) / 2 - s.y) < rc && keep(p, qq);
        for (let i = 0; i < P.length; i++) for (let j = 0; j < P.length; j++) {
          if (j + 1 < P.length && r.next() < 0.72 && inCore(P[i][j], P[i][j + 1])) add('street', [P[i][j], P[i][j + 1]]);
          if (i + 1 < P.length && r.next() < 0.6 && inCore(P[i][j], P[i + 1][j])) add('street', [P[i][j], P[i + 1][j]]);
        }
        // Outside it: a looser, bent lattice, each quarter turned its own way.
        const outer = (p, qq) => Math.hypot((p[0] + qq[0]) / 2 - s.x, (p[1] + qq[1]) / 2 - s.y) > rc * 0.95 && keep(p, qq);
        for (let k = 0; k < 4; k++) {
          const a = theta0 + (k + 0.5) * (Math.PI / 2), th2 = a + (r.next() - 0.5) * 0.8;
          const ox = s.x + Math.cos(a) * R * 0.6, oy = s.y + Math.sin(a) * R * 0.6;
          const c2 = Math.cos(th2), s2 = Math.sin(th2), m = Math.ceil(R / (0.7 * S)) + 1;
          const inQuarter = (p) => { let g = Math.atan2(p[1] - s.y, p[0] - s.x) - (a - Math.PI / 4); g = ((g % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); return g < Math.PI / 2; };
          for (const along of [0, 1]) for (let i = -m; i <= m; i++) {
            const line = [];
            for (let j = -m; j <= m; j++) {
              const [u, v] = along ? [i, j] : [j, i];
              let x = ox + c2 * u * 0.7 * S - s2 * v * 0.7 * S, y = oy + s2 * u * 0.7 * S + c2 * v * 0.7 * S;
              x += 0.25 * S * fbm(nW, x / (2.5 * S), y / (2.5 * S), 2); y += 0.25 * S * fbm(nW, x / (2.5 * S) + 3.1, y / (2.5 * S), 2);
              line.push([x, y]);
            }
            addRuns(i % 2 ? 'minor' : 'street', line, (p, qq) => inQuarter(p) && inQuarter(qq) && outer(p, qq));
          }
        }
        if (type === 'radial') {
          for (const f of [0.3, 0.55]) {
            const loop = [];
            for (let k = 0; k <= 36; k++) { const a = (k / 36) * Math.PI * 2; loop.push([s.x + Math.cos(a) * R * f, s.y + Math.sin(a) * R * f]); }
            addRuns('street', loop);
          }
          for (let k = 0; k < 10; k++) {
            const a = theta0 + (k / 10) * Math.PI * 2, line = [];
            for (let t = R * 0.08; t <= span; t += 0.3 * S) line.push([s.x + Math.cos(a) * t, s.y + Math.sin(a) * t]);
            addRuns('street', line);
          }
        }
        break;
      }
      case 'coastal': case 'port': {
        // Streets along the shore, every so far inland, and short ones down to the water.
        const levels = [];
        for (let L = 0.75 * S; L < R * 0.9; L += (0.6 + 0.25 * r.next()) * S) levels.push(L);
        contours((x, y) => D(x, y), levels, 'street');
        const [cx, cy] = coastDir;
        for (let t = -span; t <= span; t += (0.6 + 0.4 * r.next()) * S) {
          const bx = s.x - cy * t, by = s.y + cx * t;
          const line = [];
          for (let u = -R; u <= R; u += 0.25 * S) line.push([bx + cx * u, by + cy * u]);
          addRuns(type === 'port' ? 'street' : 'minor', line);
        }
        if (type === 'port') {
          // Streets converging on the harbour front.
          for (let k = 0; k < 9; k++) {
            const a = Math.atan2(-cy, -cx) + ((k - 4) / 4) * 1.3, line = [];
            for (let t = 0.3 * S; t <= R * 1.2; t += 0.3 * S) line.push([s.x + Math.cos(a) * t, s.y + Math.sin(a) * t]);
            addRuns(k % 2 ? 'street' : 'arterial', line);
          }
        }
        break;
      }
      case 'river': {
        const rp = river ? river.pts : [[s.x - 5 * S, s.y], [s.x + 5 * S, s.y]];
        const levels = [];
        for (let L = 0.7 * S; L < R * 0.8; L += (0.55 + 0.25 * r.next()) * S) levels.push(L);
        contours((x, y) => distToLine(rp, x, y), levels, 'street');
        const [ux, uy] = river ? river.dir : [1, 0];
        const ox = river ? river.at[0] : s.x, oy = river ? river.at[1] : s.y;
        // Cross streets down to the banks; bridges across, a few of them.
        for (let t = -span; t <= span; t += 0.55 * S) {
          const line = [];
          for (let u = -R; u <= R; u += 0.25 * S) line.push([ox + ux * t - uy * u, oy + uy * t + ux * u]);
          addRuns('minor', line);
        }
        const nb = s.rank === RANK.CAPITAL ? 4 : s.rank === RANK.CITY ? 3 : 1;
        for (let b = 0; b < nb; b++) {
          const t = (b - (nb - 1) / 2) * 1.6 * S + (r.next() - 0.5) * 0.4 * S, half = 1.6 * S;
          const p = [ox + ux * t + uy * half, oy + uy * t - ux * half], qq = [ox + ux * t - uy * half, oy + uy * t + ux * half];
          if (segOk(p, qq, true)) add('arterial', [p, qq]);
        }
        break;
      }
      case 'hill': {
        const levels = [];
        for (let L = e0 - 0.045; L <= e0 + 0.045; L += 0.007 + 0.003 * r.next()) levels.push(L);
        contours((x, y) => E(x, y), levels, 'street');
        // A few steep links straight up the hill.
        for (let k = 0; k < 6; k++) {
          const a = theta0 + (k / 6) * Math.PI * 2, line = [];
          for (let t = 0; t <= R; t += 0.3 * S) line.push([s.x + Math.cos(a) * t + 0.3 * S * Math.sin(t / S * 2.2), s.y + Math.sin(a) * t + 0.3 * S * Math.cos(t / S * 2.2)]);
          addRuns('minor', line);
        }
        break;
      }
      case 'sprawl': {
        lattice(s.x, s.y, gridA, 0.5 * S, Math.ceil(R * 0.35 / (0.5 * S)), () => 'street');
        // Suburbs: curving collectors, with cul-de-sacs off them.
        for (let k = 0; k < 7; k++) {
          const a0 = theta0 + (k / 7) * Math.PI * 2 + (r.next() - 0.5) * 0.4;
          for (let ring2 = 0; ring2 < 3; ring2++) {
            const rr = R * (0.45 + 0.28 * ring2);
            const line = [];
            for (let g = -0.42; g <= 0.42; g += 0.05) line.push([s.x + Math.cos(a0 + g) * rr * (1 + 0.08 * Math.sin(g * 9 + k)), s.y + Math.sin(a0 + g) * rr * (1 + 0.08 * Math.sin(g * 9 + k))]);
            addRuns('street', line);
            for (let g = -0.38; g <= 0.38; g += 0.11) {
              if (r.next() < 0.3) continue;
              const out = r.chance(0.5) ? 1 : -1, b = [s.x + Math.cos(a0 + g) * rr, s.y + Math.sin(a0 + g) * rr];
              const e = [s.x + Math.cos(a0 + g) * (rr + out * 0.38 * S), s.y + Math.sin(a0 + g) * (rr + out * 0.38 * S)];
              addRuns('minor', [b, e]);
              const bulb = [];
              for (let q2 = 0; q2 <= 8; q2++) { const t2 = (q2 / 8) * Math.PI * 2; bulb.push([e[0] + Math.cos(t2) * 0.09 * S, e[1] + Math.sin(t2) * 0.09 * S]); }
              addRuns('minor', bulb);
            }
          }
          const spoke = [];
          for (let t = R * 0.3; t <= R * 1.25; t += 0.3 * S) spoke.push([s.x + Math.cos(a0 + 0.45) * t, s.y + Math.sin(a0 + 0.45) * t]);
          addRuns('street', spoke);
        }
        break;
      }
    }

    // ---- Arterials out of the larger places, between their roads where the gap is wide. ----
    if (s.rank <= RANK.CITY && type !== 'planned') {
      const all = roadAngles.length ? roadAngles : [theta0];
      const arts = [];
      for (let k = 0; k < all.length; k++) {
        const a = all[k], b = k + 1 < all.length ? all[k + 1] : all[0] + Math.PI * 2;
        const gap = b - a, m = Math.floor(gap / 1.2);
        for (let qn = 1; qn <= m; qn++) arts.push(a + (gap * qn) / (m + 1) + (r.next() - 0.5) * 0.15);
      }
      for (const a0 of arts) {
        const pts = [[s.x, s.y]];
        let a = a0, x = s.x, y = s.y;
        for (let t = 0; t < span; t += 0.4 * S) {
          a += 0.08 * fbm(nA, x / (4 * S), y / (4 * S), 2);
          const nx = x + Math.cos(a) * 0.4 * S, ny = y + Math.sin(a) * 0.4 * S;
          if (!keep([x, y], [nx, ny], true)) break;
          x = nx; y = ny; pts.push([x, y]);
        }
        if (pts.length > 3) add('arterial', pts);
      }
    }
    // ---- A ring road, for the few largest: it follows the city's own outline, some way in. ----
    if (ring) {
      const loop = [];
      for (let k = 0; k <= 48; k++) {
        const a = (k / 48) * Math.PI * 2;
        let t = R * 0.2;
        while (t < span && q(s.x + Math.cos(a) * t, s.y + Math.sin(a) * t) < 0.68) t += 0.2 * S;
        loop.push([s.x + Math.cos(a) * t * 0.9, s.y + Math.sin(a) * t * 0.9]);
      }
      const sm = loop.map((p, k) => { const a = loop[(k + 47) % 48], b = loop[(k + 1) % 48]; return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4]; });
      sm[48] = sm[0];
      addRuns('ring', sm, (p, qq) => segOk(p, qq, true));
    }
  }
  return { streets, built, urbanAt, layouts };
}

// Join marching-squares pieces into lines.
function chain(segs) {
  const key = (p) => `${Math.round(p[0] * 1000)},${Math.round(p[1] * 1000)}`;
  const ends = new Map();
  segs.forEach((sg, k) => { for (const e of [0, 1]) { const kk = key(sg[e]); if (!ends.has(kk)) ends.set(kk, []); ends.get(kk).push(k); } });
  const used = new Uint8Array(segs.length);
  const out = [];
  for (let k = 0; k < segs.length; k++) {
    if (used[k]) continue;
    used[k] = 1;
    const line = [segs[k][0], segs[k][1]];
    for (const dir of [1, 0]) {
      for (;;) {
        const tip = dir ? line[line.length - 1] : line[0];
        const next = (ends.get(key(tip)) || []).find((j) => !used[j]);
        if (next === undefined) break;
        used[next] = 1;
        const sg = segs[next], far = key(sg[0]) === key(tip) ? sg[1] : sg[0];
        if (dir) line.push(far); else line.unshift(far);
      }
    }
    if (line.length > 2) out.push(line);
  }
  return out;
}

function simplifyLine(pts, tol) {
  if (pts.length <= 2) return pts;
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
