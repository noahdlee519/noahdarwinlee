// Loads CHRONIA headlessly and checks what it shows at places on dates.
// Serve the repository root first (python3 -m http.server 8123), then:
// node tools/chronia-page-check.mjs [base URL]
// Each check is [date as typed in the box, lon, lat, what the place should show (a name or a regular expression)].
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const base = process.argv[2] || "http://localhost:8123/chronia/";
const CHECKS = [
  ["2019-12-31", 37.8, 48.0, "Donetsk People's Republic"],
  ["2022-09-29", 37.8, 48.0, "Donetsk People's Republic"],
  ["2022-09-30", 37.8, 48.0, "Donetsk Oblast"],
  ["2026-10-31", 35.14, 47.84, "Zaporizhzhia Oblast"],
  ["2026-10-31", 32.62, 46.64, "Kherson Oblast"],
  ["2026-10-31", 34.1, 44.95, "Crimea"],
  ["2026-10-31", 30.52, 50.45, "Ukraine"],
  ["2020-11-09", 46.75, 39.82, "Azerbaijan"],
  ["2020-11-10", 46.75, 39.82, "Artsakh"],
  ["2024-01-01", 46.75, 39.82, "Azerbaijan"],
  ["2026-10-31", 2.35, 48.86, "France"]
];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route(/wikipedia\.org/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ title: "x", extract: "x" }) }));
await page.route(/functions\/v1\//, (r) => r.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" } }));
await page.goto(base, { waitUntil: "load" });
await page.waitForFunction(() => window.__chronia && window.__chronia.ready(), null, { timeout: 120000 });
let bad = 0;
for (const [date, lon, lat, want] of CHECKS) {
  await page.evaluate(([d, lon, lat]) => { window.__chronia.setYear(d); window.__chronia.setView(lon, lat, 6); }, [date, lon, lat]);
  await page.waitForTimeout(1500);
  await page.waitForFunction(() => window.__chronia.ready(), null, { timeout: 60000 });
  const got = await page.evaluate(([lon, lat]) => { const p = window.__chronia.project(lon, lat); return p ? window.__chronia.hitAt(p[0], p[1]) : null; }, [lon, lat]);
  const shown = await page.evaluate(() => window.__chronia.shown());
  const asof = await page.evaluate(() => window.__chronia.asof());
  const ok = want instanceof RegExp ? want.test(got || "") : got === want;
  if (!ok) bad++;
  console.log((ok ? "ok   " : "FAIL ") + date + " (" + shown + ", " + asof + ") at " + lon + ", " + lat + ": " + got + (ok ? "" : ", expected " + want));
}
await page.evaluate(() => window.__chronia.setYear("2099-12-31"));
await page.waitForTimeout(1500);
const now = new Date(), month = now.toLocaleString("en-GB", { month: "long", timeZone: "UTC" }) + " " + now.getUTCFullYear();
const last = await page.evaluate(() => [window.__chronia.shown(), window.__chronia.asof()]);
console.log((last[0] === month ? "ok   " : "FAIL ") + "a date after the present goes to " + last[0] + " (" + last[1] + "), expected " + month);
if (last[0] !== month) bad++;
console.log("page errors: " + (errors.length ? errors.join(" | ") : "none"));
await browser.close();
process.exit(bad || errors.length ? 1 : 0);
