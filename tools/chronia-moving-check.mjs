// Checks what the map draws while it moves: the terrain is drawn at a quarter of its pixels into a corner of its canvas (which
// keeps its size) and lies where the terrain at rest does, and a pause in a drag doesn't bring back the full drawing.
// node tools/chronia-moving-check.mjs [base URL]
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const base = process.argv[2] || "http://localhost:8123/chronia/";
const browser = await chromium.launch();
let bad = 0;
const say = (ok, what, got) => { if (!ok) bad++; console.log((ok ? "ok   " : "FAIL ") + what + (ok ? "" : ": got " + got)); };

async function run(label, flat, lon, lat, zoom) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.addInitScript(() => { try { localStorage.setItem("chronia-tour", "1"); localStorage.setItem("chronia-key", "0"); } catch (e) {} });
  await page.goto(base + "?y=1750-07&full", { waitUntil: "load" });
  await page.waitForFunction(() => window.__chronia && window.__chronia.ready(), null, { timeout: 120000 });
  await page.evaluate(([flat, lon, lat, zoom]) => { const c = window.__chronia; c.setFlat(flat); c.setLayer("states", false); c.setLayer("cities", false); c.setLayer("capitals", false); c.setLayer("seas", false); c.setView(lon, lat, zoom); }, [flat, lon, lat, zoom]);
  await page.waitForFunction(() => window.__chronia.terrain && window.__chronia.terrain().ready, null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    const c = window.__chronia, cv = document.getElementById("globe"), w = cv.width, h = cv.height;
    const tmp = document.createElement("canvas"); tmp.width = w; tmp.height = h;
    const g = tmp.getContext("2d", { willReadFrequently: true });
    // the lightness of every fourth pixel of the map as drawn now
    const grab = () => {
      c.timeRender(1);
      g.clearRect(0, 0, w, h); g.drawImage(cv, 0, 0);
      const d = g.getImageData(0, 0, w, h).data, out = new Float32Array(Math.ceil(w / 4) * Math.ceil(h / 4));
      let k = 0;
      for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) { const i = (y * w + x) * 4; out[k++] = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; }
      return out;
    };
    const shot = (moving, relief) => { c.setLayer("relief", relief); c.moving(moving); const a = grab(); c.moving(false); return a; };
    const rest = shot(false, true), restBare = shot(false, false);
    const move = shot(true, true), state = c.terrain ? c.terrain() : null, moveBare = shot(true, false);
    c.setLayer("relief", true);
    const again = shot(false, true), stateRest = c.terrain ? c.terrain() : null;
    // how alike two pictures of the terrain alone are (1 the same, 0 unrelated), where the terrain shows at all
    const corr = (a, a0, b, b0) => {
      let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
      for (let i = 0; i < a.length; i++) {
        const u = a[i] - a0[i], v = b[i] - b0[i];
        if (Math.abs(v) < 1.5) continue;
        n++; sa += u; sb += v; saa += u * u; sbb += v * v; sab += u * v;
      }
      const cov = sab - sa * sb / n, va = saa - sa * sa / n, vb = sbb - sb * sb / n;
      return { n, r: va > 0 && vb > 0 ? cov / Math.sqrt(va * vb) : 0 };
    };
    let back = 0;
    for (let i = 0; i < rest.length; i++) back += Math.abs(rest[i] - again[i]);
    return { state, stateRest, terrain: corr(move, moveBare, rest, restBare), back: back / rest.length, size: [w, h] };
  });
  say(!!r.state, label + ": the page says how the terrain is drawn", JSON.stringify(r.state));
  if (r.state) {
    const s = r.state, q = r.stateRest;
    say(s.canvas[0] === q.canvas[0] && s.canvas[1] === q.canvas[1], label + ": the terrain's canvas keeps its size while the map moves", s.canvas + " moving, " + q.canvas + " at rest");
    say(Math.abs(s.drawn[0] * 2 - s.canvas[0]) <= 1 && Math.abs(s.drawn[1] * 2 - s.canvas[1]) <= 1, label + ": moving, the terrain is drawn at half its width and height", s.drawn + " of " + s.canvas);
    say(q.drawn[0] === q.canvas[0] && q.drawn[1] === q.canvas[1], label + ": at rest, the terrain is drawn in full", q.drawn + " of " + q.canvas);
  }
  say(r.terrain.n > 2000 && r.terrain.r > 0.75, label + ": the moving terrain lies where the terrain at rest does", "alike " + r.terrain.r.toFixed(2) + " over " + r.terrain.n + " points");
  say(r.back < 0.5, label + ": the map at rest is the same after moving", "mean difference " + r.back.toFixed(2));
  await page.close();
}
// A pause in a drag with the button still down doesn't bring back the full drawing (which takes several frames' time and made
// the drag catch); letting go does.
async function hold() {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.addInitScript(() => { try { localStorage.setItem("chronia-tour", "1"); localStorage.setItem("chronia-key", "0"); } catch (e) {} });
  await page.goto(base + "?y=1750-07&full", { waitUntil: "load" });
  await page.waitForFunction(() => window.__chronia && window.__chronia.ready(), null, { timeout: 120000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(3000);
  const full = () => page.evaluate(() => window.__chronia.perfState().base.misses);
  // a first drag, not measured, so nothing is still loading or being drawn for the first time in the one that is
  await page.mouse.move(600, 400); await page.mouse.down(); await page.mouse.move(596, 400); await page.mouse.move(592, 400); await page.mouse.up();
  await page.waitForTimeout(2500);
  await page.mouse.move(600, 400); await page.mouse.down();
  await page.mouse.move(590, 402); await page.mouse.move(580, 404); await page.mouse.move(570, 406);
  // The count is read as the last move arrives and 0.3 s after it, by a timer set then, so that a slow machine can't put the
  // second reading late: the page's own timer for the full drawing is set by the same move and falls due after it.
  const reading = page.evaluate(() => new Promise((done) => {
    const count = () => window.__chronia.perfState().base.misses;
    document.getElementById("globe").addEventListener("pointermove", () => { const at = count(); setTimeout(() => done([at, count()]), 300); }, { once: true });
  }));
  await page.mouse.move(560, 408);
  const [before, held] = await reading;
  say(held === before, "a pause of a third of a second in a drag draws no full frame", held - before + " drawn");
  await page.mouse.up();
  await page.waitForTimeout(1200);
  const after = await full(), t = await page.evaluate(() => window.__chronia.terrain());
  say(after > held && t.drawn[0] === t.canvas[0], "the full drawing comes back after the button is let go", after - held + " drawn, terrain " + t.drawn + " of " + t.canvas);
  await page.close();
}
// While the map turns at one zoom, the states' names are carried along where they lie on the ground, not laid out afresh every
// frame, and a carried name is drawn where a fresh layout would put the same name.
async function carry(label, flat, lon, lat, zoom) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.addInitScript(() => { try { localStorage.setItem("chronia-tour", "1"); localStorage.setItem("chronia-key", "0"); } catch (e) {} });
  await page.goto(base + "?y=1815-07&full", { waitUntil: "load" });
  await page.waitForFunction(() => window.__chronia && window.__chronia.ready(), null, { timeout: 120000 });
  await page.evaluate(([flat, lon, lat, zoom]) => { const c = window.__chronia; c.setFlat(flat); c.setView(lon, lat, zoom); }, [flat, lon, lat, zoom]);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(3500);
  const r = await page.evaluate(([lon, lat]) => {
    const c = window.__chronia;
    if (!c.labelCarry) return null;
    const names = () => c.labels().filter((l) => l.kind === "polity" || l.kind === "people");
    const towns = () => c.labels().filter((l) => l.kind === "capital" || l.kind === "city" || l.kind === "town");
    const count = () => c.perfState().labels;
    c.timeRender(2);
    const atRest = names().length;
    // a headless frame takes longer than the time a layout is carried for, so the check lets it be carried without limit
    c.labelCarry(1e9);
    c.moving(true);
    c.setView(lon, lat); c.timeRender(1);
    const n0 = count();
    for (let i = 1; i <= 8; i++) { c.setView(lon + i * 0.4, lat + i * 0.1); c.timeRender(1); }
    const n1 = count(), carried = names(), carriedTowns = towns();
    // the same view laid out afresh, still moving
    c.labelCarry(0); c.timeRender(1);
    const n2 = count(), fresh = names(), freshTowns = towns();
    c.moving(false); c.labelCarry(null);
    const at = new Map(fresh.map((l) => [l.id, l]));
    // A fresh layout may choose another place for a name, so not every name is compared: most must lie within a third of a
    // pixel of where they were carried to, which a name carried wrongly (to another point, or by the wrong turn) would not.
    const gaps = [];
    carried.forEach((l) => { const f = at.get(l.id); if (f && f.sea === l.sea) gaps.push(Math.hypot(f.x - l.x, f.y - l.y)); });
    gaps.sort((a, b) => a - b);
    const townAt = new Map(freshTowns.map((l) => [l.kind + l.name + (l.id || ""), l])), townGaps = [];
    carriedTowns.forEach((l) => { const f = townAt.get(l.kind + l.name + (l.id || "")); if (f) townGaps.push(Math.hypot(f.x - l.x, f.y - l.y) + Math.hypot(f.box.x - l.box.x, f.box.y - l.box.y)); });
    const towns_ = { carriedFrames: (n1.placesCarried || 0) - (n0.placesCarried || 0), carried: carriedTowns.length, fresh: freshTowns.length, both: townGaps.length, near: townGaps.filter((g) => g < 0.34).length };
    return { towns: towns_, atRest, laidOut: n1.layouts - n0.layouts, carriedFrames: n1.carried - n0.carried, freshLayouts: n2.layouts - n1.layouts, carried: carried.length, fresh: fresh.length, both: gaps.length,
      near: gaps.filter((g) => g < 0.34).length, median: gaps.length ? gaps[gaps.length >> 1] : 99, worst: gaps.length ? gaps[gaps.length - 1] : 99 };
  }, [lon, lat]);
  if (!r) { say(false, label + ": the page can carry its names along", "no labelCarry"); await page.close(); return; }
  say(r.atRest > 5 && r.carried > 5, label + ": there are names to carry", r.atRest + " at rest, " + r.carried + " carried");
  say(r.laidOut === 0 && r.carriedFrames === 8, label + ": eight frames of turning lay the names out no more than once", r.laidOut + " layouts, " + r.carriedFrames + " frames carried");
  say(r.freshLayouts === 1, label + ": with nothing to carry from, the names are laid out", r.freshLayouts + " layouts");
  say(r.both >= Math.min(r.carried, r.fresh) * 0.6 && r.near >= r.both * 0.6 && r.median < 0.1 && r.worst < 40, label + ": a carried name lies where a fresh layout puts it", r.both + " names in both, " + r.near + " within a third of a pixel, median " + r.median.toFixed(2) + ", farthest " + r.worst.toFixed(2) + " px");
  const t = r.towns;
  say(t.carriedFrames === 8, label + ": the cities' names are carried along too", t.carriedFrames + " frames carried");
  say(t.carried > 10 && t.both >= Math.min(t.carried, t.fresh) * 0.6 && t.near >= t.both * 0.7, label + ": a carried city's mark and name lie where a fresh layout puts them", t.carried + " carried, " + t.fresh + " fresh, " + t.both + " in both, " + t.near + " within a third of a pixel");
  await page.close();
}
await carry("names on the globe", false, 10, 48, 3);
await carry("names on the flat map", true, 10, 45, 2.5);
await hold();
await run("globe", false, 15, 25, 1);
await run("globe, close", false, 10, 46, 5);
await run("flat map", true, 15, 25, 1.4);
await browser.close();
console.log(bad ? bad + " failed" : "all passed");
process.exit(bad ? 1 : 0);
