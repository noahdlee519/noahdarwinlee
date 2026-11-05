// Checks CHRONIA's developer tools and the edits they make, headlessly, with the chronia-edits function stubbed
// (nothing here touches the real list of edits). Serve the repository root first (python3 -m http.server 8123), then:
// node tools/chronia-dev-check.mjs [base URL] [name of one check to run alone]
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const base = process.argv[2] || "http://localhost:8123/chronia/";
const only = process.argv[3] || "";
let failed = 0;
const ok = (good, what) => { console.log((good ? "ok   " : "FAIL ") + what); if (!good) failed++; };
const E = (id, kind, target, from, to, value, updated_at = "2026-11-05T00:00:00Z") => ({ id, kind, target, from, to, value, note: "", updated_at });

const browser = await chromium.launch();

// Opens CHRONIA at a hash with the edits function answering `list` from `stub` ({ status, edits, delay }), and
// `check`, `save`, and `delete` from `stub.answer(action, body)` when given. Returns { page, errors, calls }.
async function open(hash, stub = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [], calls = [], requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => requests.push(r.url()));
  await page.route(/wikipedia\.org|wikidata\.org|accounts\.google|amazonaws/, (r) => r.fulfill({ status: 404, body: "" }));
  await page.route(/supabase\.co\/functions\/v1\/chronia-edits/, async (r) => {
    const body = JSON.parse(r.request().postData() || "{}");
    calls.push(body);
    const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
    if (body.action === "list") {
      if (stub.delay) await new Promise((res) => setTimeout(res, stub.delay));
      return r.fulfill({ status: stub.status || 200, headers: cors, body: JSON.stringify({ edits: stub.edits || [] }) });
    }
    const [status, out] = stub.answer ? await stub.answer(body.action, body) : [401, { error: "password" }];
    return r.fulfill({ status, headers: cors, body: JSON.stringify(out) });
  });
  await page.route(/supabase\.co\/(?!functions\/v1\/chronia-edits)/, (r) => r.fulfill({ status: 404, body: "" }));
  const t0 = Date.now();
  await page.goto(base + hash);
  await page.waitForFunction(() => window.__chronia && window.__chronia.ready(), null, { timeout: 120000 });
  return { page, errors, calls, requests, readyMs: Date.now() - t0 };
}
const settle = (page, ms = 600) => page.waitForTimeout(ms);
const run = async (name, f) => { if (only && name !== only) return; try { await f(); } catch (e) { ok(false, name + ": " + e.message.split("\n")[0]); } };

await run("editAt", async () => {
  const { page, errors } = await open("#y=1815-07&v=2.35,47.00,4.00");
  const r = await page.evaluate(() => {
    const c = window.__chronia, at = (s) => c.editTime(s, false);
    c.setEdits([
      { id: 1, kind: "country-name", target: "First French Empire", from: "1810", to: "1812", value: { name: "A" }, updated_at: "2026-11-01T00:00:00Z" },
      { id: 2, kind: "country-name", target: "First French Empire", from: "1811-06", to: "1811-08", value: { name: "B" }, updated_at: "2026-11-02T00:00:00Z" },
      { id: 3, kind: "city-hide", target: "london", from: "-500", to: "-200", value: {} },
      { id: 4, kind: "city-hide", target: "rome", from: "1990-01-01", to: "1991-12-31", value: {} },
      { id: 5, kind: "country-colour", target: "Nowhere Kingdom", from: "1815", to: "1815", value: { c: 1 } },
      { id: 6, kind: "city-hide", target: "no-such-city", from: "1815", to: "1815", value: {} },
    ]);
    const v = (k, t, when) => { const x = c.editAt(k, t, when); return x ? x.name || "hit" : null; };
    return {
      overlap: v("country-name", "First French Empire", at("1811-07-15")), before: v("country-name", "First French Empire", at("1810-03")),
      after: v("country-name", "First French Empire", at("1813-01")), endDay: v("country-name", "First French Empire", at("1812-12-31")),
      bcIn: v("city-hide", "london", -350), bcEnd: v("city-hide", "london", -200), bcOut: v("city-hide", "london", -199),
      dayIn: v("city-hide", "rome", at("1991-12-31")), dayOut: v("city-hide", "rome", at("1992-01-01")), dayStart: v("city-hide", "rome", at("1990-01-01")),
      pre1800: v("country-name", "First French Empire", 1811), notFound: c.notFound(),
    };
  });
  ok(r.overlap === "B", "the latest-saved of two overlapping edits wins: " + r.overlap);
  ok(r.before === "A" && r.after === null && r.endDay === "A", "a span holds from its first to its last day: " + [r.before, r.after, r.endDay]);
  ok(r.pre1800 === "A", "a whole year counts on the yearly part of the timeline: " + r.pre1800);
  ok(r.bcIn === "hit" && r.bcEnd === "hit" && r.bcOut === null, "BC spans: " + [r.bcIn, r.bcEnd, r.bcOut]);
  ok(r.dayIn === "hit" && r.dayStart === "hit" && r.dayOut === null, "day spans: " + [r.dayStart, r.dayIn, r.dayOut]);
  ok(r.notFound.includes("country-colour|Nowhere Kingdom") && r.notFound.includes("city-hide|no-such-city") && !r.notFound.some((x) => /london|rome|First French Empire/.test(x)), "edits for missing targets are listed: " + r.notFound);
  ok(!errors.length, "no page errors: " + errors);
  await page.close();
});

await run("list fails", async () => {
  const { page, errors } = await open("#y=1815-07&v=2.35,47.00,4.00", { status: 500 });
  await settle(page, 1500);
  ok(await page.evaluate(() => window.__chronia.editsFailed()), "a failed list is noted");
  ok(!errors.length, "and the map still draws, without errors: " + errors);
  await page.close();
});

await run("no waiting", async () => {
  const fast = await open("#y=1815-07&v=2.35,47.00,4.00", { edits: [] });
  await fast.page.close();
  const slow = await open("#y=1815-07&v=2.35,47.00,4.00", { edits: [], delay: 6000 });
  ok(slow.readyMs - fast.readyMs < 1500, "the first map doesn't wait for the edits: " + fast.readyMs + " ms, then " + slow.readyMs + " ms with the list 6 s late");
  await slow.page.close();
});

await run("country", async () => {
  const { page, errors } = await open("#y=1815-07&v=2.35,46.50,8.00");
  await settle(page, 2500);
  const at = [0.9, 44.2];
  const base = await page.evaluate(([lon, lat]) => window.__chronia.fillAt(lon, lat), at);
  const name0 = await page.evaluate(([lon, lat]) => { const q = window.__chronia.project(lon, lat); return window.__chronia.hitAt(q[0], q[1]); }, at);
  ok(name0 === "Bourbon Kingdom of France", "the test point is in France: " + name0);
  const set = (l) => page.evaluate((l) => window.__chronia.setEdits(l), l);
  const fill = () => page.evaluate(([lon, lat]) => window.__chronia.fillAt(lon, lat), at);
  const nameAt = () => page.evaluate(([lon, lat]) => { const q = window.__chronia.project(lon, lat); return window.__chronia.hitAt(q[0], q[1]); }, at);
  await set([E(1, "country-colour", "Bourbon Kingdom of France", "1815", "1815", { c: 6 })]); await settle(page);
  const blue = await fill();
  ok(Math.abs(blue[0] - 0xd4) + Math.abs(blue[1] - 0xdd) + Math.abs(blue[2] - 0xea) < 12 && Math.abs(blue[1] - base[1]) > 15, "a palette colour edit recolours France in colour 6 (#d4ddea): " + base + " -> " + blue);
  await set([E(1, "country-colour", "Bourbon Kingdom of France", "1815", "1815", { hex: "#c0392b" })]); await settle(page);
  const red = await fill();
  ok(red[0] - red[1] >= 60, "a custom colour edit recolours France red: " + red);
  await set([E(1, "country-name", "Bourbon Kingdom of France", "1815", "1815", { name: "Kingdom of France" })]); await settle(page);
  ok((await nameAt()) === "Kingdom of France", "a name edit renames France: " + (await nameAt()));
  const hits = await page.evaluate(() => window.__chronia.search("Kingdom of France"));
  ok(hits.some((h) => /Kingdom of France/.test(h)), "search finds the edited name: " + hits.slice(0, 3));
  await set([]); await settle(page);
  const back = await fill();
  ok(Math.abs(back[0] - base[0]) + Math.abs(back[1] - base[1]) + Math.abs(back[2] - base[2]) < 12 && (await nameAt()) === "Bourbon Kingdom of France", "deleting the edits puts France back: " + back);
  await set([E(1, "country-colour", "Bourbon Kingdom of France", "1816", "1817", { hex: "#c0392b" }), E(2, "country-name", "Bourbon Kingdom of France", "1816", "1817", { name: "X" })]); await settle(page);
  const later = await fill();
  ok(Math.abs(later[0] - base[0]) < 12 && (await nameAt()) === "Bourbon Kingdom of France", "edits for other years don't show: " + later);
  await page.evaluate(() => { const i = document.querySelector('input[data-layer="safe"]'); i.click(); });
  await set([E(1, "country-colour", "Bourbon Kingdom of France", "1815", "1815", { hex: "#c0392b" })]); await settle(page);
  ok((await fill())[0] - (await fill())[1] >= 60, "a custom colour survives the colour-blind safe palette");
  await page.evaluate(() => { const i = document.querySelector('input[data-layer="safe"]'); i.click(); });
  ok(!errors.length, "no page errors: " + errors);
  await page.close();
});

await run("modern country", async () => {
  const { page, errors } = await open("#y=2000-06&v=2.35,46.50,8.00");
  await settle(page, 2500);
  const at = [0.9, 44.2];
  const name = await page.evaluate(([lon, lat]) => { const q = window.__chronia.project(lon, lat); return window.__chronia.hitAt(q[0], q[1]); }, at);
  await page.evaluate((n) => window.__chronia.setEdits([{ id: 9, kind: "country-colour", target: n, from: "1999-01-01", to: "2000-12-31", value: { hex: "#c0392b" }, updated_at: "x" }]), name);
  await settle(page);
  const red = await page.evaluate(([lon, lat]) => window.__chronia.fillAt(lon, lat), at);
  ok(red[0] - red[1] >= 60, "from 1886 too, a colour edit recolours " + name + ": " + red);
  ok(!errors.length, "no page errors: " + errors);
  await page.close();
});

await browser.close();
console.log(failed ? failed + " failed" : "all passed");
process.exit(failed ? 1 : 0);
