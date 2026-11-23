import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const require = createRequire(import.meta.url);
let playwright = null;
try { playwright = require("playwright"); } catch (e) { playwright = null; }

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
let server, base, browser;

before(async () => {
  if (!playwright) return;
  server = createServer(async (req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    const file = resolve(root, "." + p);
    if (!file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
      res.end(body);
    } catch (e) { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = "http://127.0.0.1:" + server.address().port + "/greatercircle/";
  browser = await playwright.chromium.launch();
});
after(async () => {
  if (browser) await browser.close();
  if (server) server.close();
});

const LHR_NRT = "#a=51.4707,-0.4599,London%20Heathrow%20Airport%20%28LHR%29&b=35.7686,140.3887,Narita%20International%20Airport%20%28NRT%29&avoid=643";

async function open(hash, opts = {}, query = "") {
  const page = await browser.newPage(opts);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await page.goto(base + query + hash);
  await page.waitForFunction(() => window.__greatercircle && window.__greatercircle.ready && window.__greatercircle.ready(), null, { timeout: 30000 });
  if (hash) await page.waitForFunction(() => window.__greatercircle.state.result && !window.__greatercircle.state.pendingId, null, { timeout: 60000 });
  return { page, errors };
}
const skip = !playwright && "playwright is not installed";

test("the empty page offers examples and no errors", { skip }, async () => {
  const { page, errors } = await open("", { viewport: { width: 1440, height: 900 } });
  assert.equal(await page.isVisible("#examples"), true);
  assert.equal(await page.locator(".gc-example").count(), 3);
  assert.equal(await page.isVisible("#result"), false);
  assert.deepEqual(errors, []);
  await page.close();
});

test("an example route shows three tabs, and the flight plan arrives after it", { skip }, async () => {
  const { page, errors } = await open(LHR_NRT, { viewport: { width: 1440, height: 900 } });
  assert.equal(await page.textContent("#code-a"), "LHR");
  assert.equal(await page.getAttribute("#tab-avoid", "aria-selected"), "true");
  assert.match(await page.textContent("#hero-big"), /^\d{1,3}(,\d{3})* km$/);
  await page.waitForFunction(() => window.__greatercircle.state.plan && window.__greatercircle.state.plan.status === "done", null, { timeout: 60000 });
  assert.match(await page.textContent("#tab-plan-km"), /km$/);
  await page.click("#tab-plan");
  assert.equal(await page.getAttribute("#tab-plan", "aria-selected"), "true");
  assert.ok(await page.locator(".gc-tl-row[data-leg]").count() >= 5);
  assert.match(page.url(), /tab=plan/);
  await page.focus("#tab-plan");
  await page.keyboard.press("ArrowLeft");
  assert.equal(await page.getAttribute("#tab-avoid", "aria-selected"), "true");
  assert.deepEqual(errors, []);
  await page.close();
});

test("the options card opens from a chip, and the buffer changes the route", { skip }, async () => {
  const { page, errors } = await open(LHR_NRT, { viewport: { width: 1440, height: 900 } });
  const before = await page.textContent("#tab-avoid-km");
  await page.click("#chip-buffer");
  assert.equal(await page.isVisible("#options"), true);
  await page.evaluate(() => { const r = document.getElementById("buffer"); r.value = "0"; r.dispatchEvent(new Event("input", { bubbles: true })); r.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForFunction((b) => document.getElementById("tab-avoid-km").textContent !== b && !window.__greatercircle.state.pendingId, before, { timeout: 60000 });
  assert.match(page.url(), /buf=0(km|mi|nmi)/);
  assert.equal(await page.textContent("#buffer-out"), "Off");
  assert.deepEqual(errors, []);
  await page.close();
});

test("on a phone the sheet peeks with the codes and opens", { skip }, async () => {
  const { page, errors } = await open(LHR_NRT, { ...playwright.devices["iPhone 13"] });
  assert.equal(await page.isVisible("#route-sum"), true);
  assert.equal(await page.isVisible(".gc-topbar"), true);
  await page.evaluate(() => document.getElementById("sheet-handle").click());
  await page.waitForFunction(() => document.getElementById("panel").classList.contains("is-half"));
  await page.waitForTimeout(600);
  await page.evaluate(() => document.getElementById("sheet-handle").click());
  await page.waitForFunction(() => document.getElementById("panel").classList.contains("is-open"));
  assert.equal(await page.isVisible("#in-a"), true);
  assert.deepEqual(errors, []);
  await page.close();
});

test("without a worker the route still comes", { skip }, async () => {
  const { page, errors } = await open(LHR_NRT, { viewport: { width: 1280, height: 800 } }, "?noworker");
  assert.equal(await page.getAttribute("#tab-avoid", "aria-selected"), "true");
  assert.deepEqual(errors, []);
  await page.close();
});

test("the keyboard places points at the crosshair", { skip }, async () => {
  const { page, errors } = await open("", { viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => window.__greatercircle.setView(2.35, 48.85, 3));
  await page.focus("#globe");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => window.__greatercircle.state.a);
  const a = await page.evaluate(() => window.__greatercircle.state.a);
  assert.ok(Math.abs(a.lat - 48.85) < 0.5 && Math.abs(a.lon - 2.35) < 0.5, JSON.stringify(a));
  assert.deepEqual(errors, []);
  await page.close();
});

test("a closure preset avoids its countries, and winds change the time", { skip }, async () => {
  const { page, errors } = await open("#a=51.4707,-0.4599,London&b=40.6394,-73.7793,New%20York", { viewport: { width: 1440, height: 900 } });
  const calm = await page.textContent("#hero-time");
  await page.click("#chip-units");
  await page.click("#wind label:has(input[value='1'])");
  await page.waitForFunction((c) => document.getElementById("hero-time").textContent !== c, calm);
  assert.equal(await page.isVisible("#hero-wind"), true);
  assert.match(page.url(), /wind=1/);
  const nowText = await page.textContent("#hero-time");
  const other = (new Date().getMonth() + 6) % 12;
  await page.click(`#wind-months label:has(input[value='${other}'])`);
  await page.waitForFunction((c) => document.getElementById("hero-time").textContent !== c, nowText);
  assert.match(page.url(), /wind=(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/);
  await page.click("#chip-avoid");
  await page.click(".gc-closure[data-ids='643,804,112']");
  await page.waitForFunction(() => ["643", "804", "112"].every((id) => window.__greatercircle.state.avoid.has(id)));
  assert.equal(await page.getAttribute(".gc-closure[data-ids='643,804,112']", "aria-pressed"), "true");
  assert.deepEqual(errors, []);
  await page.close();
});

test("the route saves as an image card", { skip }, async () => {
  const { page, errors } = await open(LHR_NRT, { viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#share-image")]);
  assert.match(download.suggestedFilename(), /^greatercircle-lhr-nrt\.png$/);
  assert.deepEqual(errors, []);
  await page.close();
});

test("the flat map toggles, keeps the route, and is in the URL", { skip }, async () => {
  const { page, errors } = await open(LHR_NRT, { viewport: { width: 1440, height: 900 } });
  await page.click("#flat-btn");
  assert.equal(await page.getAttribute("#flat-btn", "aria-pressed"), "true");
  assert.match(page.url(), /map=flat/);
  assert.equal(await page.isDisabled("#sat-btn"), true);
  const a = await page.evaluate(() => window.__greatercircle.project(-0.4599, 51.4707));
  assert.ok(a && a[0] > 0 && a[1] > 0, JSON.stringify(a));
  await page.keyboard.press("m");
  assert.equal(await page.getAttribute("#flat-btn", "aria-pressed"), "false");
  assert.doesNotMatch(page.url(), /map=flat/);
  assert.deepEqual(errors, []);
  await page.close();
});
