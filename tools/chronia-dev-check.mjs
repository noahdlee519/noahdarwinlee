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
// `token` signs the page in as the report panel would (a session kept under chronia-auth) with that access token.
async function open(hash, stub = {}, token = "") {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  if (token) await page.addInitScript((t) => { try { localStorage.setItem("chronia-auth", JSON.stringify({ a: t, r: "refresh", e: Date.now() + 36e5 })); } catch (e) {} }, token);
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
    const [status, out] = stub.answer ? await stub.answer(body.action, body, r.request().headers()) : [401, { error: "signin" }];
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

await run("city", async () => {
  const { page, errors } = await open("#y=1815-07&v=-0.13,51.51,20.00");
  await settle(page, 2000);
  const london = () => page.evaluate(() => window.__chronia.cities().find((c) => c.id === "london") || null);
  const set = (l) => page.evaluate((l) => window.__chronia.setEdits(l), l);
  const before = await london();
  ok(before && before.tier === 1 && before.name === "London", "London is a tier-1 city in 1815: " + JSON.stringify(before));
  await set([E(1, "city-size", "london", "1815", "1815", { tier: 4 })]); await settle(page);
  ok((await london()).tier === 4, "a size edit makes it tier 4: " + JSON.stringify(await london()));
  await set([E(1, "city-name", "london", "1815", "1815", { name: "Lundenwic" })]); await settle(page);
  ok((await london()).name === "Lundenwic", "a name edit renames it: " + (await london()).name);
  const drawn = await page.evaluate(() => window.__chronia.labels().some((l) => l.text === "Lundenwic" || l.name === "Lundenwic"));
  ok(drawn, "the map draws the new name");
  const hits = await page.evaluate(() => window.__chronia.search("Lundenwic"));
  ok(hits.some((h) => /Lundenwic/.test(h)), "search finds it under its new name: " + hits.slice(0, 2));
  const old = await page.evaluate(() => window.__chronia.search("London"));
  ok(old.some((h) => /Lundenwic/.test(h)), "and under its own: " + old.slice(0, 2));
  await set([E(1, "city-hide", "london", "1815", "1815", {})]); await settle(page);
  ok((await london()) === null, "a hide edit hides it");
  const drawnHidden = await page.evaluate(() => window.__chronia.labels().some((l) => /^London|Lundenwic/.test(l.text || l.name || "")));
  ok(!drawnHidden, "and the map doesn't draw it, even as a capital");
  await set([E(1, "city-hide", "london", "1816", "1817", {}), E(2, "city-name", "london", "1700", "1700", { name: "X" })]); await settle(page);
  const back = await london();
  ok(back && back.tier === 1 && back.name === "London", "edits for other years don't show: " + JSON.stringify(back));
  ok(!errors.length, "no page errors: " + errors);
  await page.close();
});

await run("label", async () => {
  const { page, errors } = await open("#y=1815-07&v=2.35,46.50,6.00");
  await settle(page, 2500);
  const N = "BOURBON KINGDOM OF FRANCE", T = "Bourbon Kingdom of France";
  const set = async (l) => { await page.evaluate((l) => window.__chronia.setEdits(l), l); await settle(page, 900); };
  const box = () => page.evaluate((n) => window.__chronia.labelBox(n), T);
  const proj = (lon, lat) => page.evaluate(([a, b]) => window.__chronia.project(a, b), [lon, lat]);
  await set([E(1, "label", T, "1815", "1815", { lon: 0, lat: 45, size: 20, angle: null })]);
  const b = await box(), q = await proj(0, 45);
  ok(b && Math.hypot(b[0] - q[0], b[1] - q[1]) < 12, "a pinned name sits at its point: " + (b && b.slice(0, 2).map(Math.round)) + " vs " + q.slice(0, 2).map(Math.round));
  const others = await page.evaluate(() => window.__chronia.labels());
  const mine = others.find((l) => l.name === "Bourbon Kingdom of France");
  const hit = mine && others.some((l) => l !== mine && l.box && !(l.box.x > mine.box.x + mine.box.w || l.box.x + l.box.w < mine.box.x || l.box.y > mine.box.y + mine.box.h || l.box.y + l.box.h < mine.box.y) && l.kind === "polity");
  ok(mine && !hit, "no other country's name overlaps it");
  ok(mine && Math.abs(mine.size - 20) < 0.01, "at the size the edit gives: " + (mine && mine.size));
  await set([E(1, "label", T, "1815", "1815", { lon: 0, lat: 45, size: 20, angle: 30 })]);
  await page.screenshot({ path: process.env.SHOT || "/dev/null", clip: { x: 380, y: 280, width: 460, height: 330 } }).catch(() => {});
  const tilted = (await page.evaluate(() => window.__chronia.labels())).find((l) => l.name === "Bourbon Kingdom of France");
  ok(tilted && Math.abs(tilted.ang - Math.PI / 6) < 0.01, "and at its angle: " + (tilted && tilted.ang));
  await set([E(1, "label", T, "1815", "1815", { lon: 120, lat: 45, size: null, angle: null })]);
  const behind = await box();
  const home = await proj(2.5, 46.5);
  ok(behind && Math.hypot(behind[0] - home[0], behind[1] - home[1]) < 200, "a pin behind the globe falls back to the usual place in France: " + (behind && behind.slice(0, 2).map(Math.round)));
  await set([E(1, "label", "German Empire", "1815", "1815", { lon: 10, lat: 51, size: 20, angle: null })]);
  ok(!(await page.evaluate(() => window.__chronia.labels().some((l) => /German Empire/i.test(l.name)))), "a pin for a country not on the map draws nothing");
  ok(!errors.length, "no page errors: " + errors);
  await page.close();
});

// A stand-in for the function's check of the Google session: the token "noah" is a reviewer, "other" is signed
// in but not on the team; saves are echoed back with an id after `saveDelay` ms, or refused with 401 when
// `refuse` is set.
function server(opts = {}) {
  let next = 100;
  return {
    edits: opts.edits || [],
    answer: async (action, body, headers = {}) => {
      const auth = headers.authorization || "";
      if (!auth || opts.refuse) return [401, { error: "signin" }];
      if (auth !== "Bearer noah") return [403, { error: "team" }];
      if (action === "check") return [200, { ok: true }];
      if (action === "delete") return [200, { ok: true }];
      if (opts.saveDelay) await new Promise((r) => setTimeout(r, opts.saveDelay));
      return [200, { edit: { ...body.edit, id: body.edit.id || next++, note: body.edit.note || "", updated_at: new Date().toISOString() } }];
    },
  };
}

await run("editor", async () => {
  const plain = await open("#y=1815-07&v=2.35,46.50,8.00", { edits: [] });
  await settle(plain.page, 1500);
  ok(!plain.requests.some((u) => /\/dev\.js/.test(u)), "dev.js isn't loaded for visitors");
  await plain.page.close();

  const srv = server({ saveDelay: 1500, edits: [E(50, "city-hide", "no-such-city", "1815", "1815", {})] });
  const out = await open("#y=1815-07&v=2.35,46.50,8.00&dev", srv);
  await out.page.waitForSelector(".ch-dev-login", { timeout: 15000 });
  ok(out.requests.some((u) => /\/dev\.js/.test(u)), "#dev in the address loads the tools");
  await out.page.waitForFunction(() => /Sign in with Google/.test(document.querySelector(".ch-dev-status").textContent), null, { timeout: 5000 });
  ok(!(await out.page.$(".ch-dev-tool")), "signed out, they open nothing and ask for Google: " + (await out.page.textContent(".ch-dev-status")));
  await out.page.close();
  const other = await open("#y=1815-07&v=2.35,46.50,8.00&dev", srv, "other");
  await other.page.waitForFunction(() => /can't edit/.test((document.querySelector(".ch-dev-status") || {}).textContent || ""), null, { timeout: 15000 });
  ok(!(await other.page.$(".ch-dev-tool")), "an account not on the team opens nothing and says so");
  await other.page.close();
  const { page, errors, calls, requests } = await open("#y=1815-07&v=2.35,46.50,8.00&dev", srv, "noah");
  await page.waitForSelector(".ch-dev-tool", { timeout: 15000 });
  ok(true, "Noah's account opens the tools");
  ok(/Not found/.test(await page.textContent(".ch-dev-list")) && /no-such-city/.test(await page.textContent(".ch-dev-list")), "edits for missing targets are listed under Not found");

  // Country tool: recolour France.
  await page.click('.ch-dev-tool[data-tool="country"]');
  await settle(page, 300);
  const at = [0.9, 44.2];
  const base = await page.evaluate(([a, b]) => window.__chronia.fillAt(a, b), at);
  const q = await page.evaluate(([a, b]) => window.__chronia.project(a, b), at);
  await page.mouse.click(q[0], q[1]);
  await page.waitForSelector(".ch-dev-form", { timeout: 5000 });
  ok(/Bourbon Kingdom of France/.test(await page.textContent(".ch-dev-target")), "clicking France opens its form: " + (await page.textContent(".ch-dev-target")));
  const dates = await page.$$eval(".ch-dev-dates input", (els) => els.map((e) => e.value));
  ok(dates.length === 2 && dates[0] && dates[1], "the dates default to the borders' stretch: " + dates.join(" to "));
  ok(await page.evaluate(() => document.getElementById("card").hidden), "the country's card doesn't open");
  await page.click('.ch-dev-swatch-btn[data-c="6"]');
  if (process.env.SHOT2) await page.locator("#dev").screenshot({ path: process.env.SHOT2 });
  await page.click(".ch-dev-form button[type=submit]");
  await settle(page, 500);
  const mid = await page.evaluate(([a, b]) => window.__chronia.fillAt(a, b), at);
  ok(Math.abs(mid[1] - base[1]) > 15, "the map changes before the server answers: " + base + " -> " + mid);
  await page.waitForFunction(() => /Saved/.test(document.querySelector(".ch-dev-status").textContent), null, { timeout: 8000 });
  const sent = calls.filter((c) => c.action === "save").pop();
  ok(sent && sent.edit.kind === "country-colour" && sent.edit.target === "Bourbon Kingdom of France" && sent.edit.value.c === 6 && !("password" in sent), "the save sends the edit: " + JSON.stringify(sent && sent.edit));
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  const rowText = await page.textContent(".ch-dev-row");
  ok(/Bourbon Kingdom of France \| Colour 7 \| .* to /.test(rowText), "the edit is listed with | between its parts: " + rowText);

  // Delete it.
  page.once("dialog", (d) => d.accept());
  await page.click('.ch-dev-row:not([data-id="50"]) .ch-dev-link:text("Delete")');
  await settle(page, 800);
  const del = calls.filter((c) => c.action === "delete").pop();
  ok(del && del.id === 100, "Delete sends the edit's id: " + JSON.stringify(del));
  const after = await page.evaluate(([a, b]) => window.__chronia.fillAt(a, b), at);
  ok(Math.abs(after[1] - base[1]) < 8, "and France is back: " + after);

  // A name typed with HTML in it stays text.
  await page.mouse.click(q[0], q[1]);
  await page.waitForSelector(".ch-dev-form");
  await page.click('.ch-dev-form [data-kind="country-name"]');
  await page.fill(".ch-dev-form .ch-dev-field:not([hidden]) input[type=text]", "<b>x</b>");
  await page.click(".ch-dev-form button[type=submit]");
  await page.waitForFunction(() => /Saved/.test(document.querySelector(".ch-dev-status").textContent), null, { timeout: 8000 });
  ok(/Name: <b>x<\/b>/.test(await page.textContent(".ch-dev-list")) && !(await page.$(".ch-dev-list b")), "a name with HTML in it shows as text");

  // Reload: still signed in.
  await page.reload();
  await page.waitForFunction(() => window.__chronia && window.__chronia.ready(), null, { timeout: 120000 });
  await page.waitForSelector(".ch-dev-tool", { timeout: 15000 });
  ok(!(await page.$(".ch-dev-login")), "a reload opens the tools again");

  // Move name: drag France's name 80 px right.
  await page.click('.ch-dev-tool[data-tool="label"]');
  await settle(page, 600);
  const lb = await page.evaluate(() => window.__chronia.labelBox("Bourbon Kingdom of France") || window.__chronia.labelBox("<b>x</b>"));
  await page.mouse.move(lb[0], lb[1]);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(lb[0] + i * 10, lb[1]);
  await page.mouse.up();
  await page.waitForSelector(".ch-dev-labelset:not([hidden])", { timeout: 5000 });
  const whereText = await page.textContent(".ch-dev-labelset .ch-dev-hint");
  const lon = +(/([\d.]+)° ([EW])$/.exec(whereText) || [0, "NaN"])[1] * (/W$/.test(whereText) ? -1 : 1);
  const lb2 = await page.evaluate(() => window.__chronia.labelBox("<b>x</b>") || window.__chronia.labelBox("Bourbon Kingdom of France"));
  ok(lb2 && lb2[0] > lb[0] + 60, "dragging the name moves it on the map: " + Math.round(lb[0]) + " -> " + (lb2 && Math.round(lb2[0])));
  ok(isFinite(lon) && lon > 2, "and the form has the new place: " + whereText);
  await page.click(".ch-dev-form button[type=submit]");
  await page.waitForFunction(() => /Saved/.test(document.querySelector(".ch-dev-status").textContent), null, { timeout: 8000 });
  const lab = calls.filter((c) => c.action === "save").pop();
  ok(lab && lab.edit.kind === "label" && lab.edit.value.lon > 2, "the save sends the name's place: " + JSON.stringify(lab && lab.edit.value));
  ok(!errors.length, "no page errors: " + errors);
  await page.close();
});

await run("refused", async () => {
  const srv = server();
  const { page, errors } = await open("#y=1815-07&v=2.35,46.50,8.00&dev", srv, "noah");
  await page.waitForSelector(".ch-dev-tool", { timeout: 15000 });
  await page.click('.ch-dev-tool[data-tool="country"]');
  const at = [0.9, 44.2];
  const base = await page.evaluate(([a, b]) => window.__chronia.fillAt(a, b), at);
  const q = await page.evaluate(([a, b]) => window.__chronia.project(a, b), at);
  await page.mouse.click(q[0], q[1]);
  await page.waitForSelector(".ch-dev-form");
  await page.click('.ch-dev-swatch-btn[data-c="6"]');
  srv.answer = async () => [403, { error: "team" }];
  await page.click(".ch-dev-form button[type=submit]");
  await page.waitForSelector(".ch-dev-login", { timeout: 8000 });
  ok(/can't edit/.test(await page.textContent(".ch-dev-status")), "a refused save closes the tools and says why: " + (await page.textContent(".ch-dev-status")));
  const back = await page.evaluate(([a, b]) => window.__chronia.fillAt(a, b), at);
  ok(Math.abs(back[1] - base[1]) < 8, "and the map goes back: " + back);
  ok(!errors.length, "no page errors: " + errors);
  await page.close();
});

await browser.close();
console.log(failed ? failed + " failed" : "all passed");
process.exit(failed ? 1 : 0);
