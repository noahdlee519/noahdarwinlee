// Years 0 to 99 are themselves, not 1900 to 1999. JavaScript's Date.UTC reads a year below 100 as one of the
// 1900s, so the day counted for July 15, AD 44 was that of July 15, 1944, and with Zones of control on the map of
// AD 44 was drawn with the Eastern Front across it (seen 27 November 2026).
//   node tools/chronia-early-years-check.mjs [base URL]     (serve the repository root first, port 8123)
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const base = process.argv[2] || "http://localhost:8123/chronia/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript(() => { try { localStorage.setItem("chronia-tour", "1"); localStorage.setItem("chronia-key", "0"); } catch (e) {} });
await page.goto(base, { waitUntil: "load" });
await page.waitForFunction(() => window.__chronia && window.__chronia.ready(), null, { timeout: 120000 });
let bad = 0, n = 0;
const say = (ok, what, got) => { n++; if (!ok) { bad++; console.log("FAIL " + what + ": got " + JSON.stringify(got)); } };

// The day arithmetic: a date and back, in order, across the years Date.UTC misreads and their neighbours.
const r = await page.evaluate(() => { const d = window.__chronia.days, out = [];
  for (const [y, m, dd] of [[-500, 3, 15], [-1, 12, 31], [0, 1, 1], [0, 2, 29], [1, 1, 1], [5, 7, 15], [44, 3, 15], [44, 7, 15], [99, 12, 31], [100, 1, 1], [476, 9, 4], [1066, 10, 14], [1886, 1, 1], [1944, 7, 15], [2026, 11, 27]]) {
    const day = d.of(y, m, dd), t = d.time(day); out.push({ date: [y, m, dd], day, back: d.date(day), time: t, atTime: d.at(t) }); }
  return out; });
let last = -Infinity;
for (const x of r) {
  const [y] = x.date, name = x.date.join("-");
  say(JSON.stringify(x.back) === JSON.stringify(x.date), name + " as a day and back is itself", x.back);
  say(x.day > last, name + " comes after the date before it", [x.day, last]); last = x.day;
  say(x.time >= y && x.time < y + 1, name + " as a time falls within its year", x.time);
  say(x.atTime === x.day, name + " as a time and back is the same day", [x.atTime, x.day]);
}
const d44 = r.find((x) => x.date.join() === "44,7,15"), d1944 = r.find((x) => x.date.join() === "1944,7,15");
say(d1944.day - d44.day > 690000, "July 15, AD 44 is nineteen centuries before July 15, 1944", d1944.day - d44.day);

// Zones of control: drawn in July 1944, and not in the first century.
const box = await page.$('input[data-layer="control"]') || await page.$("#layer-control");
const on = await page.evaluate(() => { const i = document.querySelector('input[data-layer="control"]') || document.getElementById("layer-control"); if (!i) return false; if (!i.checked) i.click(); return i.checked; });
say(on, "the Zones of control layer can be turned on", on);
const at = async (t) => { await page.evaluate((t) => { window.__chronia.setYear(t); window.__chronia.setFlat && window.__chronia.setFlat(true); window.__chronia.setView(40, 50, 2); }, t);
  await page.waitForFunction(() => !window.__chronia.loadingJSON || !window.__chronia.loadingJSON(), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  return page.evaluate(() => ({ drawn: window.__chronia.controlDrawn(), day: window.__chronia.controlDay(), year: window.__chronia.year(), wars: window.__chronia.wars() })); };
const w = await at(1944.54);
say(w.drawn === true, "in July 1944 the zones of control are drawn (the check can see them)", w);
for (const y of [44, 5, 99, 14, 68]) {
  const g = await at(y);
  say(g.drawn === false, "in AD " + y + " no zones of control are drawn", g);
  say(g.day < 0 && g.day < -600000, "in AD " + y + " the day the zones are looked up for is in AD " + y, g.day);
  say(!g.wars.some((x) => /World War|Eastern Front|Winter War|Korean|Ukraine/i.test(x)), "in AD " + y + " no twentieth-century war is listed", g.wars);
}
say(errors.length === 0, "no page errors", errors);
await browser.close();
console.log(bad ? bad + " of " + n + " checks failed" : "all " + n + " checks passed");
process.exit(bad ? 1 : 0);
