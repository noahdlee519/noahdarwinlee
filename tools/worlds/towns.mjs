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
import { blobRing, inRing } from './lakes.mjs';

export const TOWN_TYPES = ['mainstreet', 'crossroads', 'grid', 'planned', 'medieval', 'radial', 'coastal', 'port', 'river', 'hill', 'sprawl'];

// The built-up ground is kept as a field, four samples to the map unit; a point is built up where the field, read
// between its samples, is over half. So the outline is smooth at every zoom.
const FS = 4;

// buildStreets({ settlements, exits, cultures, land, elev, hydro, blocked, width, height, rng, dist, rivers, riverMeta })
//   => { streets: [{ cls: 'arterial'|'ring'|'street'|'minor', pts }], built: (x, y) => boolean, layouts: [{ type, ring }] }
export function buildStreets({ settlements, exits, cultures, land, elev, hydro, blocked, width, height, rng, dist, rivers = [], riverMeta = [], areas = null, projects = null }) {
  const W = width, H = height, S = W / 1600;
  const r = rng.fork('streets');
  const nU = makeNoise(r.fork('urban')), nU2 = makeNoise(r.fork('urban2')), nA = makeNoise(r.fork('angle')), nW = makeNoise(r.fork('warp'));
  const { lakes, riverClass } = hydro;
  const px = (x, y) => clamp(Math.floor(y), 0, H - 1) * W + clamp(Math.floor(x), 0, W - 1);
  const px_ = px;
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

  // ---- Each place's size: a rank-size hierarchy, from a metropolis or three down to villages. ----
  // Radii in map units (about 1.5 km each): a metropolis some 12 to 15, a capital 4 to 10, a city 3.6 to 6, a town
  // about 1.3 to 2.2, a village under 0.75; so their built-up areas run roughly 400 : 60 : 20 : 3 : 0.35, as the
  // populations of real places of those ranks do.
  const maxArea = areas ? Math.max(...areas) : 1;
  const sz01 = (v) => clamp((v - 0.3) / 1.9, 0, 1);
  const baseR = settlements.map((s) => {
    if (s.rank === RANK.CAPITAL) return (4.8 + 4.2 * Math.sqrt((areas ? areas[s.country] : maxArea) / maxArea)) * (projects && projects[s.country] && projects[s.country].tier === 'flagship' ? 1.08 : 0.88);
    if (s.rank === RANK.CITY) return 3.6 + 2.4 * sz01(s.size);
    if (s.rank === RANK.TOWN) return 1.3 + 0.9 * sz01(s.size);
    return 0.45 + 0.3 * sz01(s.size);
  });
  const metro = new Set(settlements.map((s, k) => [k, baseR[k] + r.next() * 0.5]).filter(([k]) => settlements[k].rank <= RANK.CITY).sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 3).map((e) => e[0]));
  settlements.forEach((s, k) => { s.reach = Math.round(baseR[k] * (metro.has(k) ? 1.6 : 1) * S * 100) / 100; s.metro = metro.has(k); });
  const reachOf = (s) => s.reach;
  // Ring roads for the metropolises only.
  const ringers = new Set(settlements.filter((s) => s.metro));
  // The dense core of each city, kept as a field like the built-up ground.
  const coreField = new Uint8Array(FW * FH);
  const coreAt = (x, y) => {
    const fx = clamp(x * FS - 0.5, 0, FW - 1.001), fy = clamp(y * FS - 0.5, 0, FH - 1.001);
    const ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy, k = iy * FW + ix;
    return (coreField[k] * (1 - u) * (1 - v) + coreField[k + 1] * u * (1 - v) + coreField[k + FW] * (1 - u) * v + coreField[k + FW + 1] * u * v) / 255;
  };
  // Built-up ground: 1, or 2 in a city's dense core.
  const builtKind = (x, y) => (urbanAt(x, y) > 0.5 ? (coreAt(x, y) > 0.5 ? 2 : 1) : 0);
  const cityParks = [];

  const layouts = [];
  let bigCount = 0, shoreCount = 0;
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
    // The shore decides only some of the coast's cities: a world of islands would otherwise be all strips and
    // harbours, where a real coast has grid towns, old towns, and planned capitals standing on it too. So ports and
    // strips are kept to about a third of a world's larger places.
    const shoreShare = bigCount ? shoreCount / bigCount : 0;
    if (coast && (shoreShare < 0.34 || bigCount < 3)) {
      // A harbour wants a bay: count the sea round the place.
      let sea = 0;
      for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; if (D(s.x + Math.cos(a) * 5 * S, s.y + Math.sin(a) * 5 * S) < 0.5) sea++; }
      if (sea >= 4 && sea <= 9 && u < 0.5) return 'port';
      if (u < 0.32 || (sea >= 4 && sea <= 9 && u < 0.6)) return 'coastal';
    }
    if (river && r.next() < 0.7) return 'river';
    if (hilly && r.next() < 0.6) return 'hill';
    if (r.next() < 0.2) return 'sprawl';
    if (style === 'grid') return s.rank === RANK.CAPITAL || r.next() < 0.3 ? 'planned' : 'grid';
    if (style === 'radial') return r.next() < 0.75 ? 'radial' : 'medieval';
    if (style === 'organic') return r.next() < 0.75 ? 'medieval' : 'radial';
    return r.next() < 0.4 ? 'sprawl' : r.next() < 0.5 ? 'medieval' : 'grid';
  };
  // Each place's outline: compact, long (along a coast, a river, or a valley), star-shaped along its roads, twin
  // towns facing each other across a river, or wrapped round a bay.
  const shapeOf = (s, type, river, nExits) => {
    if (s.rank === RANK.VILLAGE) return 'compact';
    if (type === 'port') return 'bay';
    if (type === 'coastal') return 'linear';
    if (type === 'river') return s.rank <= RANK.CITY && river && r.next() < 0.6 ? 'twin' : 'linear';
    if (type === 'hill') return r.next() < 0.5 ? 'linear' : 'compact';
    if (type === 'mainstreet') return 'linear';
    if (type === 'sprawl') return 'star';
    if (nExits >= 3 && r.next() < (s.rank === RANK.TOWN ? 0.3 : 0.45)) return 'star';
    return 'compact';
  };
  // The direction a valley runs: the way the ground changes least.
  const valleyDir = (s) => {
    let best = 0, bv = Infinity;
    const e0 = E(s.x, s.y);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI, c = Math.cos(a), sn = Math.sin(a);
      let v = 0;
      for (const t of [2, 4, 6]) v += Math.abs(E(s.x + c * t * S, s.y + sn * t * S) - e0) + Math.abs(E(s.x - c * t * S, s.y - sn * t * S) - e0);
      if (v < bv) { bv = v; best = a; }
    }
    return [Math.cos(best), Math.sin(best)];
  };

  const streets = [];
  let placeNow = -1;
  const add = (cls, pts) => { if (pts.length >= 2) streets.push({ cls, of: placeNow, pts: pts.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]) }); };

  settlements.forEach((s, si) => {
    placeNow = si;
    const style = cultures[s.country].streets;
    const R = reachOf(s);
    // (Chicago and New York are laid out on their grids, whatever their sites.)
    const drawn = typeOf(s, style);
    const type = s.rank === RANK.CAPITAL && (s.name === 'Chicago' || s.name === 'New York') ? 'grid' : drawn;
    if (s.rank <= RANK.CITY) { bigCount++; if (type === 'port' || type === 'coastal') shoreCount++; }
    const ring = ringers.has(s);
    const roadAngles = (exits.get(s) || []).map((e) => e.angle).sort((a, b) => a - b);
    const theta0 = roadAngles.length ? roadAngles[0] : r.next() * Math.PI;
    const e0 = E(s.x, s.y);
    const river = type === 'river' ? nearRiver(s.x, s.y, 3.6 * S) : null;
    const shape = shapeOf(s, type, river, roadAngles.length);
    s.shape = shape;
    layouts.push({ type, ring, shape });
    const coastDir = (() => { // the way down to the sea, roughly
      const g = [D(s.x + S, s.y) - D(s.x - S, s.y), D(s.x, s.y + S) - D(s.x, s.y - S)], l = Math.hypot(g[0], g[1]) || 1;
      return [-g[0] / l, -g[1] / l];
    })();
    // The long axis of a long place: along the coast, the river, or the valley.
    const axis = shape === 'linear' ? (type === 'coastal' ? [-coastDir[1], coastDir[0]] : type === 'river' && river ? river.dir : type === 'mainstreet' ? [Math.cos(theta0), Math.sin(theta0)] : valleyDir(s)) : null;
    // Twin towns: two centres, one either side of the river.
    const twins = shape === 'twin' && river ? (() => {
      const [ux, uy] = river.dir, off = R * 0.62;
      return [[river.at[0] - uy * off, river.at[1] + ux * off, 1], [river.at[0] + uy * off, river.at[1] - ux * off, 0.8]];
    })() : null;

    // ---- The footprint: q < 1 is built up; q < 0.42 the dense core. ----
    const iso = (a, b) => Math.hypot(a, b);
    const ribbons = roadAngles.map((a) => [Math.cos(a), Math.sin(a)]);
    const Lr = R * (shape === 'star' ? 2.3 : s.rank === RANK.VILLAGE ? 1.8 : 1.3), Wr = Math.max(0.3 * S, R * (s.rank === RANK.VILLAGE ? 0.45 : shape === 'star' ? 0.26 : 0.17));
    const gridA = theta0 + (r.next() - 0.5) * 0.3, gc = Math.cos(gridA), gs = Math.sin(gridA);
    const base = (x, y) => {
      const dx = x - s.x, dy = y - s.y, d = iso(dx, dy);
      switch (shape) {
        case 'linear': {
          const [ux, uy] = axis;
          let v = iso((dx * ux + dy * uy) / (R * 1.9), (-dx * uy + dy * ux) / (R * 0.55));
          if (type === 'coastal') v = Math.max(v, D(x, y) / Math.max(1.4 * S, R * 0.75));
          return v;
        }
        case 'bay': return Math.min(Math.max(d / (R * 1.4), D(x, y) / (R * 0.7)), d / (R * 0.45));
        case 'twin': return Math.min(...twins.map(([cx, cy, w]) => iso(x - cx, y - cy) / (R * 0.72 * w)));
        case 'star': return d / (R * 0.7);
        default:
          if (type === 'grid' || type === 'planned') {
            const a = Math.abs(dx * gc + dy * gs) / R, b = Math.abs(-dx * gs + dy * gc) / (R * 0.85);
            return Math.pow(a ** 4 + b ** 4, 0.25);
          }
          return d / R;
      }
    };
    const q = (x, y) => {
      const dx = x - s.x, dy = y - s.y;
      let v = base(x, y);
      // Ribbons of building out along the roads.
      for (const [ux, uy] of ribbons) {
        const t = dx * ux + dy * uy;
        if (t <= 0) continue;
        v = Math.min(v, Math.max(t / Lr, Math.abs(-dx * uy + dy * ux) / Wr) + 0.12);
      }
      // A ragged, organic edge, frayed more on the larger places.
      const sc = Math.max(0.8 * S, R * 0.33);
      v += 0.34 * fbm(nU, x / sc, y / sc, 3) + 0.14 * fbm(nU2, x / (sc * 0.28), y / (sc * 0.28), 3);
      // Not up the steep or high ground, unless the town is a hill town.
      const e = E(x, y);
      // (A large city spreads further up its valley sides than a town does.)
      v += type === 'hill' ? 3 * smoothstep(0.36, 0.44, e) : 2.5 * smoothstep(0.2, 0.34, e) + 1.5 * (R > 3 * S ? smoothstep(0.06, 0.13, Math.abs(e - e0)) : smoothstep(0.03, 0.08, Math.abs(e - e0)));
      return v;
    };
    const span = R * (shape === 'linear' ? 2.3 : shape === 'star' ? 2.5 : shape === 'twin' ? 1.9 : 1.6) + (ribbons.length ? Lr - R * 0.6 : 0) + 1.5 * S;
    const fx0 = Math.max(0, Math.floor((s.x - span) * FS)), fx1 = Math.min(FW - 1, Math.ceil((s.x + span) * FS));
    const fy0 = Math.max(0, Math.floor((s.y - span) * FS)), fy1 = Math.min(FH - 1, Math.ceil((s.y + span) * FS));
    const hasCore = s.rank <= RANK.CITY;
    for (let fy = fy0; fy <= fy1; fy++) for (let fx = fx0; fx <= fx1; fx++) {
      const x = (fx + 0.5) / FS, y = (fy + 0.5) / FS;
      if (!ground(x, y)) continue;
      const v = q(x, y);
      if (v > 1.4) continue;
      const k = fy * FW + fx;
      const val = clamp(Math.round((0.5 + (1 - v) * 2.5) * 255), 0, 255);
      if (val > field[k]) field[k] = val;
      if (hasCore) { const vc = clamp(Math.round((0.5 + (0.42 - v) * 5) * 255), 0, 255); if (vc > coreField[k]) coreField[k] = vc; }
    }

    // ---- Parks: a few green patches inside the larger places, one large in a metropolis or capital. ----
    const parks = [];
    const nParks = s.metro ? 6 + r.int(4) : s.rank === RANK.CAPITAL ? 4 + r.int(3) : s.rank === RANK.CITY ? 2 + r.int(3) : s.rank === RANK.TOWN && r.next() < 0.45 ? 1 : 0;
    for (let t = 0; t < nParks * 30 && parks.length < nParks; t++) {
      const big = parks.length === 0 && (s.metro || s.rank === RANK.CAPITAL);
      const a = r.next() * Math.PI * 2, rr = (big ? r.range(0.1, 0.4) : r.range(0.2, 0.9)) * R;
      const px = s.x + Math.cos(a) * rr, py = s.y + Math.sin(a) * rr;
      if (q(px, py) > 0.8 || !ground(px, py)) continue;
      const rad = (big ? r.range(0.55, 0.8) : s.rank === RANK.TOWN ? r.range(0.18, 0.3) : r.range(0.22, 0.45)) * S;
      if (parks.some((pk) => Math.hypot(pk.x - px, pk.y - py) < pk.rad + rad + 0.25 * S)) continue;
      // In a planned grid a park is a block or a few, square to the streets; elsewhere it has a natural edge.
      let ring;
      if (type === 'grid' || type === 'planned' || (big && r.next() < 0.5)) {
        const hw = rad * (big ? 1.6 : 1.2), hh = rad * (big ? 0.6 : 0.75);
        const th = big ? gridA : gridA + (r.next() < 0.5 ? 0 : Math.PI / 2), c = Math.cos(th), sn = Math.sin(th);
        // A block's corners, each cut a little so the drawn curve keeps them nearly square.
        const k0 = Math.min(0.06 * S, hw * 0.2, hh * 0.2);
        ring = [];
        for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          const cu = u * hw, cv = v * hh;
          // The corner, with a point a little way along each edge either side of it (in drawing order).
          const pts = u * v < 0 ? [[cu - u * k0, cv], [cu, cv], [cu, cv - v * k0]] : [[cu, cv - v * k0], [cu, cv], [cu - u * k0, cv]];
          for (const [a, b] of pts) ring.push([px + c * a - sn * b, py + sn * a + c * b]);
        }
      } else ring = blobRing(r, px, py, rad, { stretch: r.range(0, 0.9), lean: r.next() * Math.PI, wobble: 1.3, n: 12 });
      if (!ring.every(([x, y]) => ground(x, y) && q(x, y) < 0.98 && !riverClass[px_(x, y)])) continue;
      const area = Math.abs(ring.reduce((acc, p, k) => { const o = ring[(k + 1) % ring.length]; return acc + p[0] * o[1] - o[0] * p[1]; }, 0)) / 2;
      parks.push({ x: px, y: py, rad: Math.max(rad, big ? rad * 1.6 : rad * 1.2), ring, area, big });
    }
    for (const pk of parks) cityParks.push({ settlement: si, country: s.country, x: pk.x, y: pk.y, area: pk.area, big: pk.big, ring: pk.ring.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]) });
    const inPark = (p) => parks.some((pk) => Math.abs(p[0] - pk.x) < pk.rad * 2.2 && Math.abs(p[1] - pk.y) < pk.rad * 2.2 && inRing(pk.ring, p[0], p[1]));

    const inside = (p) => q(p[0], p[1]) < 0.98 && ground(p[0], p[1]);
    const keep = (p, qq, bridge = false) => inside(p) && inside(qq) && inside([(p[0] + qq[0]) / 2, (p[1] + qq[1]) / 2]) && segOk(p, qq, bridge);
    // Streets (not arterials) stop at a park's edge.
    const keepStreet = (p, qq) => keep(p, qq) && !inPark(p) && !inPark(qq) && !inPark([(p[0] + qq[0]) / 2, (p[1] + qq[1]) / 2]);
    const addRuns = (cls, line, ok = cls === 'arterial' || cls === 'ring' ? keep : keepStreet) => {
      let run = [];
      for (let k = 0; k < line.length; k++) {
        if (run.length && !ok(run[run.length - 1], line[k])) { if (run.length > 1) add(cls, run); run = []; }
        run.push(line[k]);
      }
      if (run.length > 1) add(cls, run);
    };
    // How often lattice lines run at a point: every line in the dense core, every second further out, every
    // fourth in the outskirts (so the blocks grow larger outward).
    const every = (x, y) => { const v = q(x, y); return v < 0.42 ? 1 : v < 0.72 ? 2 : 4; };
    // A lattice turned to angle th, spacing sp, centred on (ox, oy), n lines each way: every line with its class.
    // graded: thin the lines out away from the core.
    const lattice = (ox, oy, th, sp, n, clsOf, warp = 0, crossEvery = 1, graded = false) => {
      const c = Math.cos(th), sn = Math.sin(th);
      const P = (i, j) => {
        let x = ox + c * j * sp - sn * i * sp, y = oy + sn * j * sp + c * i * sp;
        if (warp) { x += warp * fbm(nW, x / (3 * S), y / (3 * S), 2); y += warp * fbm(nW, x / (3 * S) + 5.2, y / (3 * S) - 1.7, 2); }
        return [x, y];
      };
      const runLine = (cls, line, idx) => {
        if (!graded || cls === 'arterial') { addRuns(cls, line); return; }
        // Graded: a line runs where the density there wants it; it is a street where it is one of every other
        // such line (shown from zoom 3.5), else a minor street (shown only at the closest zoom).
        let run = [], runCls = null;
        const flush = () => { if (run.length > 1) add(runCls, run); run = []; runCls = null; };
        for (let k = 1; k < line.length; k++) {
          const p = line[k - 1], qq = line[k], m = every((p[0] + qq[0]) / 2, (p[1] + qq[1]) / 2);
          const c = idx % m ? null : idx % (2 * m) ? 'minor' : 'street';
          if (!c || !keepStreet(p, qq)) { flush(); continue; }
          if (runCls && c !== runCls) flush();
          if (!run.length) run.push(p);
          run.push(qq); runCls = c;
        }
        flush();
      };
      for (let i = -n; i <= n; i++) { const line = []; for (let j = -n; j <= n; j++) line.push(P(i, j)); runLine(clsOf(i, 0), line, Math.abs(i)); }
      for (let j = -n; j <= n; j++) { if (j % crossEvery) continue; const line = []; for (let i = -n; i <= n; i++) line.push(P(i, j)); runLine(clsOf(j, 1), line, Math.abs(j)); }
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
    // Levels a little apart near the core, further apart outward.
    const spreadLevels = (from, to, gap0) => { const out = []; for (let L = from; L < to; L += (gap0 + 0.55 * (L / Math.max(R, 1e-6)) * S) * (0.85 + 0.3 * r.next())) out.push(L); return out; };

    // ---- Streets, by type. ----
    const sp = 0.55 * S;
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
        lattice(s.x, s.y, gridA, sp, n, (k) => (k % 8 === 0 && s.rank <= RANK.CITY ? 'arterial' : 'street'), 0, 1, true);
        break;
      case 'planned': {
        lattice(s.x, s.y, gridA, sp, n, () => 'street', 0, 1, true);
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
        // The old core: crooked lanes, close together.
        const rc = R * 0.36, csp = 0.5 * S, cn = Math.ceil(rc / csp) + 1, th = theta0 + 0.4, c = Math.cos(th), sn = Math.sin(th);
        const P = [];
        for (let i = -cn; i <= cn; i++) { const row = []; for (let j = -cn; j <= cn; j++) row.push([s.x + c * j * csp - sn * i * csp + (r.next() - 0.5) * csp * 0.8, s.y + sn * j * csp + c * i * csp + (r.next() - 0.5) * csp * 0.8]); P.push(row); }
        const inCore = (p, qq) => Math.hypot((p[0] + qq[0]) / 2 - s.x, (p[1] + qq[1]) / 2 - s.y) < rc && keepStreet(p, qq);
        for (let i = 0; i < P.length; i++) for (let j = 0; j < P.length; j++) {
          if (j + 1 < P.length && r.next() < 0.72 && inCore(P[i][j], P[i][j + 1])) add('street', [P[i][j], P[i][j + 1]]);
          if (i + 1 < P.length && r.next() < 0.6 && inCore(P[i][j], P[i + 1][j])) add('street', [P[i][j], P[i + 1][j]]);
        }
        // Outside it: a looser, bent lattice, each quarter turned its own way, its blocks larger toward the edge.
        const outer = (p, qq) => Math.hypot((p[0] + qq[0]) / 2 - s.x, (p[1] + qq[1]) / 2 - s.y) > rc * 0.95 && keepStreet(p, qq);
        for (let k = 0; k < 4; k++) {
          const a = theta0 + (k + 0.5) * (Math.PI / 2), th2 = a + (r.next() - 0.5) * 0.8;
          const ox = s.x + Math.cos(a) * R * 0.6, oy = s.y + Math.sin(a) * R * 0.6;
          const c2 = Math.cos(th2), s2 = Math.sin(th2), m = Math.ceil(R / (0.75 * S)) + 1;
          const inQuarter = (p) => { let g = Math.atan2(p[1] - s.y, p[0] - s.x) - (a - Math.PI / 4); g = ((g % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); return g < Math.PI / 2; };
          for (const along of [0, 1]) for (let i = -m; i <= m; i++) {
            const line = [];
            for (let j = -m; j <= m; j++) {
              const [u, v] = along ? [i, j] : [j, i];
              let x = ox + c2 * u * 0.75 * S - s2 * v * 0.75 * S, y = oy + s2 * u * 0.75 * S + c2 * v * 0.75 * S;
              x += 0.25 * S * fbm(nW, x / (2.5 * S), y / (2.5 * S), 2); y += 0.25 * S * fbm(nW, x / (2.5 * S) + 3.1, y / (2.5 * S), 2);
              line.push([x, y]);
            }
            addRuns(i % 2 ? 'minor' : 'street', line, (p, qq) => Math.abs(i) % Math.min(2, every((p[0] + qq[0]) / 2, (p[1] + qq[1]) / 2)) === 0 && inQuarter(p) && inQuarter(qq) && outer(p, qq));
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
        // Streets along the shore (the first a little way in from the water), every so far inland, and short ones
        // down to the water, closer together in the middle.
        contours((x, y) => D(x, y), spreadLevels(1.3 * S, R * 0.95, 0.6 * S), 'street');
        const [cx, cy] = coastDir;
        for (let t = -span; t <= span; t += (0.6 + 0.8 * Math.min(1, Math.abs(t) / R) + 0.3 * r.next()) * S) {
          const bx = s.x - cy * t, by = s.y + cx * t;
          const line = [];
          for (let u = -R; u <= R; u += 0.25 * S) line.push([bx + cx * u, by + cy * u]);
          addRuns(type === 'port' ? 'street' : Math.abs(t) < R * 0.5 ? 'street' : 'minor', line);
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
        contours((x, y) => distToLine(rp, x, y), spreadLevels(0.9 * S, R * (shape === 'twin' ? 1.3 : 0.85), 0.6 * S), 'street');
        const [ux, uy] = river ? river.dir : [1, 0];
        const ox = river ? river.at[0] : s.x, oy = river ? river.at[1] : s.y;
        // Cross streets down to the banks, closer in the middle; bridges across, a few of them.
        for (let t = -span; t <= span; t += (0.6 + 0.8 * Math.min(1, Math.abs(t) / R)) * S) {
          const line = [];
          for (let u = -R * 1.4; u <= R * 1.4; u += 0.25 * S) line.push([ox + ux * t - uy * u, oy + uy * t + ux * u]);
          addRuns(Math.abs(t) < R * 0.5 ? 'street' : 'minor', line);
        }
        const nb = s.metro ? 5 : s.rank === RANK.CAPITAL ? 4 : s.rank === RANK.CITY ? 3 : 1;
        for (let b = 0; b < nb; b++) {
          const t = (b - (nb - 1) / 2) * Math.max(0.9 * S, R * 0.35) + (r.next() - 0.5) * 0.3 * S, half = Math.max(1.6 * S, R * 0.7);
          const p = [ox + ux * t + uy * half, oy + uy * t - ux * half], qq = [ox + ux * t - uy * half, oy + uy * t + ux * half];
          const line = [];
          for (let k = 0; k <= 12; k++) line.push([p[0] + ((qq[0] - p[0]) * k) / 12, p[1] + ((qq[1] - p[1]) * k) / 12]);
          addRuns('arterial', line, (a2, b2) => keep(a2, b2, true));
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
        lattice(s.x, s.y, gridA, 0.55 * S, Math.ceil(R * 0.4 / (0.55 * S)), () => 'street', 0, 1, true);
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
    // Twin towns: the second town's own little grid, across the river from the first.
    if (twins) {
      const [tx, ty] = twins[1];
      lattice(tx, ty, gridA + 0.5, 0.55 * S, Math.ceil(R * 0.7 / (0.55 * S)), () => 'street', 0.12 * S, 1, true);
    }

    // ---- Arterials out of the larger places, between their roads where the gap is wide (and along a star's
    // arms). ----
    if (s.rank <= RANK.CITY && type !== 'planned') {
      const all = roadAngles.length ? roadAngles : [theta0];
      const arts = [];
      for (let k = 0; k < all.length; k++) {
        const a = all[k], b = k + 1 < all.length ? all[k + 1] : all[0] + Math.PI * 2;
        const gap = b - a, m = Math.floor(gap / (shape === 'star' ? 0.9 : 1.2));
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
    // ---- A ring road, for the metropolises: an orbital some way in from the city's edge, rounded (a road, not the
    // outline's every bay), and open where the city meets the sea, as a coastal city's ring is. ----
    if (ring) {
      const M = 72, rho = [];
      for (let k = 0; k < M; k++) {
        const a = (k / M) * Math.PI * 2;
        let t = R * 0.25;
        while (t < span && q(s.x + Math.cos(a) * t, s.y + Math.sin(a) * t) < 0.7) t += 0.2 * S;
        rho.push(t * 0.85);
      }
      const med = rho.slice().sort((a, b) => a - b)[M >> 1];
      let sm = rho.map((v) => clamp(v, med * 0.7, med * 1.3));
      for (let pass = 0; pass < 4; pass++) sm = sm.map((_, k) => (sm[(k + M - 2) % M] + sm[(k + M - 1) % M] * 2 + sm[k] * 3 + sm[(k + 1) % M] * 2 + sm[(k + 2) % M]) / 9);
      const loop = sm.map((t, k) => { const a = (k / M) * Math.PI * 2; return [s.x + Math.cos(a) * t, s.y + Math.sin(a) * t]; });
      // Start the walk on the seaward side, so the landward arc comes out as one line.
      let k0 = 0, worst = Infinity;
      for (let k = 0; k < M; k++) { const d = ground(loop[k][0], loop[k][1]) ? D(loop[k][0], loop[k][1]) : -1; if (d < worst) { worst = d; k0 = k; } }
      const walk = [];
      for (let k = 0; k <= M; k++) walk.push(loop[(k0 + k) % M]);
      const inland = (p) => ground(p[0], p[1]) && D(p[0], p[1]) > 1.1 * S;
      let run = [];
      const flush = () => {
        let len = 0;
        for (let k = 1; k < run.length; k++) len += Math.hypot(run[k][0] - run[k - 1][0], run[k][1] - run[k - 1][1]);
        if (len > med * 1.2) add('ring', run);
        run = [];
      };
      for (const p of walk) {
        if (!inland(p)) { flush(); continue; }
        if (run.length && !segOk(run[run.length - 1], p, true)) flush();
        run.push(p);
      }
      flush();
    }
  });
  // ---- The built-up ground's own outline, and the cores': closed lines round where the fields pass a half, as the
  // picture paints them, so the page can draw them as vectors close in, where the picture's pixels would show. ----
  // (Drawn a hair outside the picture's own edge, and simplified to about a pixel at the closest zoom, so the
  // outline covers the picture's and stays light.)
  const LEVEL = 100;
  const outline = (F) => {
    const segs = [];
    for (let fy = 0; fy < FH - 1; fy++) for (let fx = 0; fx < FW - 1; fx++) {
      const k = fy * FW + fx;
      const a = F[k] - LEVEL - 0.5, b = F[k + 1] - LEVEL - 0.5, c = F[k + FW + 1] - LEVEL - 0.5, d = F[k + FW] - LEVEL - 0.5;
      const m = (a > 0 ? 1 : 0) + (b > 0 ? 1 : 0) + (c > 0 ? 1 : 0) + (d > 0 ? 1 : 0);
      if (m === 0 || m === 4) continue;
      const X = (t, u) => [(fx + 0.5 + t) / FS, (fy + 0.5 + u) / FS];
      const pts = [];
      if ((a < 0) !== (b < 0)) pts.push(X(a / (a - b), 0));
      if ((b < 0) !== (c < 0)) pts.push(X(1, b / (b - c)));
      if ((c < 0) !== (d < 0)) pts.push(X(1 - c / (c - d), 1));
      if ((d < 0) !== (a < 0)) pts.push(X(0, 1 - d / (d - a)));
      if (pts.length >= 2) segs.push([pts[0], pts[1]]);
      if (pts.length === 4) segs.push([pts[2], pts[3]]);
    }
    const rings = [];
    for (const line of chain(segs)) {
      if (line.length < 6) continue;
      // (A ring comes back to its start; a speck of a few samples is left to the picture.)
      const first = line[0], last = line[line.length - 1];
      if (Math.hypot(first[0] - last[0], first[1] - last[1]) > 0.3) continue;
      const sim = simplifyLine(line, 0.09 * S).map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
      if (sim.length >= 4) rings.push(sim.slice(0, -1));
    }
    return rings;
  };
  const urbanRings = { built: outline(field), core: outline(coreField) };
  return { streets, built, builtKind, urbanAt, layouts, cityParks, urbanRings };
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
