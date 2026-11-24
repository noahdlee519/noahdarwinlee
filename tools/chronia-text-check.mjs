// Checks that the map's names are drawn from kept pictures of their letters (sprites), not letter by letter as outlined text,
// which a graphics card draws very slowly, and that the map looks the same either way.
// node tools/chronia-text-check.mjs [base URL]
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const base = process.argv[2] || "http://localhost:8123/chronia/";
const browser = await chromium.launch();
let bad = 0;
const say = (ok, what, got) => { if (!ok) bad++; console.log((ok ? "ok   " : "FAIL ") + what + (ok ? "" : ": got " + got)); };

async function run(label, dpr, flat, date, lon, lat, zoom) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try { localStorage.setItem("chronia-tour", "1"); localStorage.setItem("chronia-key", "0"); } catch (e) {}
    // every outlined or filled text drawn on the map's own canvas is counted
    const P = CanvasRenderingContext2D.prototype, s = P.strokeText, f = P.fillText;
    window.__text = { stroke: 0, fill: 0 };
    P.strokeText = function () { if (this.canvas && this.canvas.id === "globe") window.__text.stroke++; return s.apply(this, arguments); };
    P.fillText = function () { if (this.canvas && this.canvas.id === "globe") window.__text.fill++; return f.apply(this, arguments); };
  });
  await page.goto(base + "?y=" + date + "&full", { waitUntil: "load" });
  await page.waitForFunction(() => window.__chronia && window.__chronia.ready(), null, { timeout: 120000 });
  await page.evaluate(([flat, lon, lat, zoom]) => { const c = window.__chronia; c.setFlat(flat); c.setView(lon, lat, zoom); }, [flat, lon, lat, zoom]);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(3500);
  const r = await page.evaluate(() => {
    const c = window.__chronia, cv = document.getElementById("globe"), w = cv.width, h = cv.height;
    if (!c.textSprites) return { none: true };
    const tmp = document.createElement("canvas"); tmp.width = w; tmp.height = h;
    const g = tmp.getContext("2d", { willReadFrequently: true });
    const grab = () => { g.clearRect(0, 0, w, h); g.drawImage(cv, 0, 0); return g.getImageData(0, 0, w, h).data; };
    const draw = (moving) => { c.moving(moving); c.timeRender(1); c.timeRender(1); window.__text.stroke = window.__text.fill = 0; c.timeRender(1); const n = window.__text.stroke + window.__text.fill; c.moving(false); return n; };
    const out = {};
    // the two drawings at rest come first, one straight after the other, so that no name is fading in or out in either
    c.textSprites(true);
    out.restCalls = draw(false); const a = grab();
    c.textSprites("letters");
    out.vectorCalls = draw(false); const b = grab();
    c.textSprites(true);
    out.moveCalls = draw(true);
    out.state = c.textSprites();
    // How far the two drawings differ once each is averaged over blocks of four by four pixels, which leaves out the edges'
    // smoothing (a letter from a sprite and one drawn as text differ along their outlines) and keeps a letter that is moved,
    // missing, or another weight: the largest difference of a block, and the share of blocks that differ by more than 20 of 255.
    const B = 4, bw = Math.floor(w / B), bh = Math.floor(h / B);
    let worst = 0, far = 0;
    for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
      let d = 0;
      for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) { const i = ((by * B + y) * w + bx * B + x) * 4; d += 0.3 * (a[i] - b[i]) + 0.59 * (a[i + 1] - b[i + 1]) + 0.11 * (a[i + 2] - b[i + 2]); }
      d = Math.abs(d) / (B * B);
      if (d > worst) worst = d;
      if (d > 20) far++;
    }
    out.worst = worst; out.far = far / (bw * bh);
    return out;
  });
  if (r.none) { say(false, label + ": the page can draw its names from sprites", "no textSprites"); await ctx.close(); return; }
  say(r.vectorCalls > 20, label + ": names as text draw text on the map", r.vectorCalls + " calls");
  say(r.restCalls === 0, label + ": at rest, no text is drawn letter by letter", r.restCalls + " calls");
  say(r.moveCalls === 0, label + ": moving, no text is drawn letter by letter", r.moveCalls + " calls");
  say(r.state.sprites > 20 && r.state.pages >= 1, label + ": the letters are kept as sprites", JSON.stringify(r.state));
  say(r.worst < 40 && r.far < 0.0008, label + ": the names look as they did as text", "largest block difference " + r.worst.toFixed(1) + " of 255, " + (100 * r.far).toFixed(3) + "% of blocks differ by more than 20");
  await ctx.close();
}
// With one small page to a store, the stores fill and are emptied again and again as the map turns: no frame may stamp a letter
// from a page that has been cleared (it would come out blank, or as another letter), so every frame must still look as it does
// drawn as text. And on a frame that makes many sprites, they are made before they are stamped: a page drawn on between two
// stamps from it is copied whole each time where the canvas is not on the graphics card.
async function stores() {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try { localStorage.setItem("chronia-tour", "1"); localStorage.setItem("chronia-key", "0"); } catch (e) {}
    // A page of sprites (a canvas other than the map's) that has been drawn on since the map was last stamped from it is
    // copied whole at the next stamp: the copies in a frame are counted, and the sprites drawn.
    const P = CanvasRenderingContext2D.prototype, s = P.strokeText, f = P.fillText, d = P.drawImage;
    window.__ink = { dirty: new Set(), copies: 0, writes: 0 };
    const write = function (c) { if (c && c.id !== "globe") { window.__ink.writes++; window.__ink.dirty.add(c); } };
    P.strokeText = function () { write(this.canvas); return s.apply(this, arguments); };
    P.fillText = function () { write(this.canvas); return f.apply(this, arguments); };
    P.drawImage = function (src) { if (this.canvas && this.canvas.id === "globe" && src && src.getContext && arguments.length === 9 && window.__ink.dirty.delete(src)) window.__ink.copies++; return d.apply(this, arguments); };
  });
  await page.goto(base + "?y=1815-07&full", { waitUntil: "load" });
  await page.waitForFunction(() => window.__chronia && window.__chronia.ready(), null, { timeout: 120000 });
  await page.evaluate(() => { const c = window.__chronia; c.setView(8, 47, 4.5); });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(3500);
  const r = await page.evaluate(() => {
    const c = window.__chronia, cv = document.getElementById("globe"), w = cv.width, h = cv.height;
    if (!c.inkPages) return null;
    const tmp = document.createElement("canvas"); tmp.width = w; tmp.height = h;
    const g = tmp.getContext("2d", { willReadFrequently: true });
    const grab = () => { g.clearRect(0, 0, w, h); g.drawImage(cv, 0, 0); return g.getImageData(0, 0, w, h).data; };
    const B = 4, bw = Math.floor(w / B), bh = Math.floor(h / B);
    const gap = (a, b) => {
      let worst = 0;
      for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
        let d = 0;
        for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) { const i = ((by * B + y) * w + bx * B + x) * 4; d += 0.3 * (a[i] - b[i]) + 0.59 * (a[i + 1] - b[i + 1]) + 0.11 * (a[i + 2] - b[i + 2]); }
        worst = Math.max(worst, Math.abs(d) / (B * B));
      }
      return worst;
    };
    const frame = () => { window.__ink.dirty.clear(); window.__ink.copies = 0; window.__ink.writes = 0; c.timeRender(1); return { copies: window.__ink.copies, writes: window.__ink.writes }; };
    // a cold frame with the pages as they ship: every sprite is new
    c.inkPages(null, null);
    c.textSprites(true);
    const cold = frame();
    c.moving(true); c.inkPages(null, null); const coldMoving = frame(); c.moving(false);
    // one small page to a store, and the map turned a little each frame
    c.inkPages(512, 1);
    const f0 = c.textSprites().flushed, worst = [];
    for (let i = 0; i < 24; i++) {
      c.setView(8 + i * 1.3, 47 - i * 0.2);
      c.textSprites(true); c.timeRender(1); const a = grab();
      c.textSprites("letters"); c.timeRender(1); const b = grab();
      worst.push(+gap(a, b).toFixed(1));
    }
    c.textSprites(true);
    const flushed = c.textSprites().flushed - f0;
    c.inkPages(null, null);
    return { cold, coldMoving, flushed, worst: Math.max(...worst), frames: worst };
  });
  if (!r) { say(false, "the page's sprite pages can be made small for the check", "no inkPages"); await ctx.close(); return; }
  say(r.cold.writes > 150 && r.cold.copies <= 8, "a frame that makes its sprites makes them in a few batches, not one by one between stamps", r.cold.writes + " sprites drawn, a page copied " + r.cold.copies + " times");
  say(r.coldMoving.writes > 60 && r.coldMoving.copies <= 8, "and so does a moving frame", r.coldMoving.writes + " sprites drawn, a page copied " + r.coldMoving.copies + " times");
  say(r.flushed >= 6, "with one small page each, the stores are emptied over and over", r.flushed + " times in 24 frames");
  say(r.worst < 40, "and every frame still looks as it does drawn as text", "largest block difference " + r.worst + " of 255; by frame " + r.frames.join(" "));
  await ctx.close();
}
await stores();
await run("globe at 1x, 1750", 1, false, "1750-07", 15, 30, 1);
await run("Europe at 2x, 1815", 2, false, "1815-07", 12, 48, 3.2);
await run("flat map at 1x, 1914", 1, true, "1914-07", 20, 30, 2);
await run("Africa at 2x, 1750", 2, false, "1750-07", 20, 0, 2.2);
await run("flat map at 2x, 1914", 2, true, "1914-07", 20, 30, 2);
await browser.close();
console.log(bad ? bad + " failed" : "all passed");
process.exit(bad ? 1 : 0);
