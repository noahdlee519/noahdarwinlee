// Cuts land into pieces along lines, on a grid: the land (`mask`, a list of polygons) is drawn on cells of `res`
// degrees, the lines are drawn across it as walls (each end carried on by `ext` degrees, so that a line that stops
// short of a coast or of another line still meets it), and each piece of land the walls enclose becomes a face. The
// cells of the walls go to the face beside them. Each face is then named by the point (`names`: [name, lon, lat]) that
// falls in it (`names` on the face, more than one where no line parts them, each also listed in `clash`); a face with
// no name that is smaller than `minCells` goes to the named face it shares the most edge with, and a larger one is
// returned unnamed (with `minCells` Infinity, every face that touches a named one goes to it); a small face that
// touches none, an island, goes to the named face nearest to it across the sea without crossing a line. The faces are traced
// back into polygons along the cells' edges, so two faces share their line exactly. Used by roman-provinces.mjs to
// cut the Ancient World Mapping Center's boundary lines into provinces.
export function partition({ mask, lines, names, box, res = 0.02, ext = 0.08, minCells = 400 }) {
  const [x0, y0, x1, y1] = box;
  const W = Math.ceil((x1 - x0) / res), H = Math.ceil((y1 - y0) / res);
  const N = W * H, land = new Uint8Array(N), wall = new Uint8Array(N);
  const cx = (lon) => Math.floor((lon - x0) / res), cy = (lat) => Math.floor((y1 - lat) / res);
  // The land: each row's crossings of every ring, filled between pairs (even-odd), at the cells' centres.
  for (const poly of mask) {
    const rows = new Map();
    for (const ring of poly) for (let i = 1; i < ring.length; i++) {
      const [ax, ay] = ring[i - 1], [bx, by] = ring[i];
      // One row more each way than needed, so rounding never drops a crossing; the test below decides.
      const ra = Math.max(0, Math.ceil((y1 - Math.max(ay, by)) / res - 0.5) - 1), rb = Math.min(H - 1, Math.floor((y1 - Math.min(ay, by)) / res - 0.5) + 1);
      for (let r = ra; r <= rb; r++) {
        const lat = y1 - (r + 0.5) * res;
        if ((ay > lat) === (by > lat)) continue;
        const lon = ax + (lat - ay) / (by - ay) * (bx - ax);
        if (!rows.has(r)) rows.set(r, []);
        rows.get(r).push(lon);
      }
    }
    for (const [r, xs] of rows) {
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const c0 = Math.max(0, Math.ceil((xs[k] - x0) / res - 0.5)), c1 = Math.min(W - 1, Math.floor((xs[k + 1] - x0) / res - 0.5));
        for (let c = c0; c <= c1; c++) land[r * W + c] ^= 1;
      }
    }
  }
  // The walls: every cell a line passes through, sampled finely enough that no two wall cells meet only at a corner.
  const mark = (lon, lat) => { const c = cx(lon), r = cy(lat); if (c >= 0 && c < W && r >= 0 && r < H) wall[r * W + c] = 1; };
  for (const line0 of lines) {
    if (line0.length < 2) continue;
    const line = line0.slice();
    const stretch = (a, b) => { const dx = a[0] - b[0], dy = a[1] - b[1], d = Math.hypot(dx, dy) || 1; return [a[0] + dx / d * ext, a[1] + dy / d * ext]; };
    line.unshift(stretch(line[0], line[1]));
    line.push(stretch(line[line.length - 1], line[line.length - 2]));
    for (let i = 1; i < line.length; i++) {
      const [ax, ay] = line[i - 1], [bx, by] = line[i];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (res / 4)));
      for (let k = 0; k <= n; k++) mark(ax + (bx - ax) * k / n, ay + (by - ay) * k / n);
    }
  }
  // The faces: four-connected pieces of land between the walls.
  const label = new Int32Array(N).fill(-1), size = [];
  const stack = new Int32Array(N);
  for (let i = 0; i < N; i++) {
    if (!land[i] || wall[i] || label[i] >= 0) continue;
    const id = size.length;
    let top = 0, n = 0;
    stack[top++] = i; label[i] = id;
    while (top) {
      const j = stack[--top]; n++;
      const c = j % W, r = (j - c) / W;
      for (const k of [c > 0 ? j - 1 : -1, c < W - 1 ? j + 1 : -1, r > 0 ? j - W : -1, r < H - 1 ? j + W : -1]) {
        if (k < 0 || !land[k] || wall[k] || label[k] >= 0) continue;
        label[k] = id; stack[top++] = k;
      }
    }
    size.push(n);
  }
  // The walls' cells go to the face beside them, spreading out one ring of cells at a time.
  for (let grew = true; grew;) {
    grew = false;
    const next = [];
    for (let i = 0; i < N; i++) {
      if (!land[i] || label[i] >= 0) continue;
      const c = i % W, r = (i - c) / W;
      for (const k of [c > 0 ? i - 1 : -1, c < W - 1 ? i + 1 : -1, r > 0 ? i - W : -1, r < H - 1 ? i + W : -1]) {
        if (k >= 0 && label[k] >= 0) { next.push([i, label[k]]); break; }
      }
    }
    for (const [i, id] of next) { if (label[i] < 0) { label[i] = id; size[id]++; grew = true; } }
  }
  // Names, by the face each point falls in.
  const faceName = new Map(), clash = [];
  for (const [name, lon, lat] of names) {
    // A seat on the coast may fall just off the land at this grid: the nearest land within 15 cells is taken.
    let c = cx(lon), r = cy(lat), id = c >= 0 && c < W && r >= 0 && r < H ? label[r * W + c] : -1;
    for (let d = 1; id < 0 && d <= 15; d++) {
      for (let dr = -d; dr <= d && id < 0; dr++) for (let dc = -d; dc <= d && id < 0; dc++) {
        const cc = c + dc, rr = r + dr;
        if (Math.max(Math.abs(dr), Math.abs(dc)) === d && cc >= 0 && cc < W && rr >= 0 && rr < H && label[rr * W + cc] >= 0) id = label[rr * W + cc];
      }
    }
    if (id < 0) { clash.push(name + ": its point is off the land"); continue; }
    if (faceName.has(id)) { clash.push(name + " and " + faceName.get(id)[0] + " fall in one face"); faceName.get(id).push(name); }
    else faceName.set(id, [name]);
  }
  // Unnamed small faces go to the named face they share the most edge with.
  const shared = (id) => {
    const count = new Map();
    for (let i = 0; i < N; i++) {
      if (label[i] !== id) continue;
      const c = i % W, r = (i - c) / W;
      for (const k of [c > 0 ? i - 1 : -1, c < W - 1 ? i + 1 : -1, r > 0 ? i - W : -1, r < H - 1 ? i + W : -1]) {
        if (k >= 0 && label[k] >= 0 && label[k] !== id) count.set(label[k], (count.get(label[k]) || 0) + 1);
      }
    }
    return [...count].sort((a, b) => b[1] - a[1]);
  };
  const unnamed = [];
  for (let moved = true; moved;) {
    moved = false;
    for (let id = 0; id < size.length; id++) {
      if (faceName.has(id) || !size[id] || size[id] >= minCells) continue;
      const best = shared(id).find(([k]) => faceName.has(k));
      if (!best) continue;
      for (let i = 0; i < N; i++) if (label[i] === id) label[i] = best[0];
      size[best[0]] += size[id]; size[id] = 0; moved = true;
    }
  }
  // Small faces that touch no named one (islands) go to the named face nearest across the sea, without crossing a line.
  const near = new Int32Array(N).fill(-1), queue = new Int32Array(N);
  let qh = 0, qt = 0;
  for (let i = 0; i < N; i++) if (label[i] >= 0 && faceName.has(label[i])) { near[i] = label[i]; queue[qt++] = i; }
  while (qh < qt) {
    const j = queue[qh++], c = j % W, r = (j - c) / W;
    for (const k of [c > 0 ? j - 1 : -1, c < W - 1 ? j + 1 : -1, r > 0 ? j - W : -1, r < H - 1 ? j + W : -1]) {
      if (k < 0 || near[k] >= 0 || (wall[k] && !land[k])) continue;
      near[k] = near[j]; queue[qt++] = k;
    }
  }
  for (let id = 0; id < size.length; id++) {
    if (!size[id] || faceName.has(id) || size[id] >= minCells) continue;
    const count = new Map();
    for (let i = 0; i < N; i++) if (label[i] === id && near[i] >= 0) count.set(near[i], (count.get(near[i]) || 0) + 1);
    const best = [...count].sort((x, y) => y[1] - x[1])[0];
    if (!best) continue;
    for (let i = 0; i < N; i++) if (label[i] === id) label[i] = best[0];
    size[best[0]] += size[id]; size[id] = 0;
  }
  for (let id = 0; id < size.length; id++) {
    if (!size[id] || faceName.has(id)) continue;
    let sx = 0, sy = 0;
    for (let i = 0; i < N; i++) if (label[i] === id) { const c = i % W; sx += c; sy += (i - c) / W; }
    unnamed.push({ id, cells: size[id], at: [Math.round((x0 + (sx / size[id] + 0.5) * res) * 100) / 100, Math.round((y1 - (sy / size[id] + 0.5) * res) * 100) / 100] });
  }
  // Each face traced into rings along the edges of its cells, keeping it on the left (so outer rings run
  // anticlockwise in lon/lat, holes clockwise), and joined into polygons.
  const faces = [];
  const corner = (c, r) => [Math.round((x0 + c * res) * 1e6) / 1e6, Math.round((y1 - r * res) * 1e6) / 1e6];
  for (let id = 0; id < size.length; id++) {
    if (!size[id]) continue;
    const edges = new Map(); // from corner key to the list of next corners
    const add = (a, b) => { const k = a[0] + "," + a[1]; if (!edges.has(k)) edges.set(k, []); edges.get(k).push(b); };
    for (let i = 0; i < N; i++) {
      if (label[i] !== id) continue;
      const c = i % W, r = (i - c) / W;
      const out = (cc, rr) => cc < 0 || cc >= W || rr < 0 || rr >= H || label[rr * W + cc] !== id;
      // Corners in grid units (c right, r down); the face on the left in lon/lat means clockwise in grid terms.
      if (out(c, r - 1)) add([c + 1, r], [c, r]);
      if (out(c - 1, r)) add([c, r], [c, r + 1]);
      if (out(c, r + 1)) add([c, r + 1], [c + 1, r + 1]);
      if (out(c + 1, r)) add([c + 1, r + 1], [c + 1, r]);
    }
    const rings = [];
    for (const [k0] of edges) {
      while (edges.get(k0) && edges.get(k0).length) {
        const start = k0.split(",").map(Number), ring = [start];
        let at = start, prevDir = null;
        for (;;) {
          const k = at[0] + "," + at[1], outs = edges.get(k);
          // At a corner touched twice, turn right (keeps the face's cells joined only through edges apart).
          let pick = 0;
          if (outs.length > 1 && prevDir) {
            const turn = (b) => { const d = [b[0] - at[0], b[1] - at[1]]; return prevDir[0] * d[1] - prevDir[1] * d[0]; };
            pick = outs.map((b, j) => [turn(b), j]).sort((a, b) => b[0] - a[0])[0][1];
          }
          const nxt = outs.splice(pick, 1)[0];
          prevDir = [nxt[0] - at[0], nxt[1] - at[1]];
          at = nxt;
          // Only the corners where the direction changes are kept.
          const n = ring.length;
          if (n >= 2) { const a = ring[n - 2], b = ring[n - 1]; if ((b[0] - a[0]) * (at[1] - b[1]) === (b[1] - a[1]) * (at[0] - b[0])) ring.pop(); }
          ring.push(at);
          if (at[0] === start[0] && at[1] === start[1]) break;
        }
        rings.push(ring.map(([c, r]) => corner(c, r)));
      }
    }
    const area = (ring) => { let a = 0; for (let i = 1; i < ring.length; i++) a += ring[i - 1][0] * ring[i][1] - ring[i][0] * ring[i - 1][1]; return a / 2; };
    const inside = (pt, ring) => { let o = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) o = !o; } return o; };
    const outers = rings.filter((g) => area(g) > 0).map((g) => [g]), holes = rings.filter((g) => area(g) < 0);
    for (const h of holes) { const host = outers.filter((o) => inside(h[0], o[0])).sort((a, b) => area(a[0]) - area(b[0]))[0]; if (host) host.push(h); }
    faces.push({ id, names: faceName.get(id) || [], cells: size[id], polys: outers });
  }
  return { faces, clash, unnamed, grid: { W, H } };
}
