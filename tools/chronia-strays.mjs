// Lists CHRONIA's stray lines: the stretches the page draws as a shape's edge against ownerless land, inland, that have owned
// land close on both sides (two drawings of one border a hair apart, a gap, or an overlap).
// Serve the repository root first (python3 -m http.server 8123), then:
// node tools/chronia-strays.mjs <lo|hi> <out.jsonl> <date> [<date> ...] [--base=URL]
// A date is as typed in the box ("1650", "1943-03-15") or a negative year ("-500"). One line of JSON per date:
// { date, level, scale, strays: [[lon, lat, km, score, owner, side A, side B, shapes on the two sides, another shape there, soft, people, claims]] }
// score is how many steps of d0 (2 km at lo, 0.4 km at hi) the further side's owned land lies off: 1 is a line with land right
// beside it on both sides, 2 to 16 a gap that wide, 99 a real edge against ownerless land.
import { createRequire } from "node:module";
import { appendFileSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)("playwright");
const args = process.argv.slice(2), base = (args.find((a) => a.startsWith("--base=")) || "--base=http://localhost:8123/chronia/").slice(7);
const [lvl, out, ...dates] = args.filter((a) => !a.startsWith("--base="));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on("pageerror", (e) => console.error("page error: " + e.message));
await page.route(/wikipedia\.org/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ title: "x", extract: "x" }) }));
await page.route(/functions\/v1\//, (r) => r.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" } }));
await page.goto(base + "#tour=0", { waitUntil: "load" });
await page.waitForFunction(() => window.__chronia && window.__chronia.ready(), null, { timeout: 120000 });
await page.evaluate((hi) => window.__chronia.setView(20, 30, hi ? 4 : 1), lvl === "hi");
for (const d of dates) {
  try {
    await page.evaluate((d) => window.__chronia.setYear(/^-\d+$/.test(d) ? +d : d), d);
    await page.waitForTimeout(400);
    await page.waitForFunction((hi) => window.__chronia.ready() && (!hi || !window.__chronia.rough()), lvl === "hi", { timeout: 90000 });
    await page.waitForTimeout(300);
    const r = await page.evaluate((d0) => window.__chronia.strays(d0), lvl === "hi" ? 0.4 : 2);
    if (r.level !== lvl) console.error(d + ": the page drew " + r.level + ", not " + lvl + " (scale " + r.scale + ")");
    appendFileSync(out, JSON.stringify({ date: d, shown: await page.evaluate(() => window.__chronia.shown()), ...r }) + "\n");
    const s = r.strays.filter((x) => x[3] <= 16 && !x[10]);
    console.log(d + " " + r.level + ": " + s.length + " strays, " + s.reduce((a, x) => a + x[2], 0).toFixed(0) + " km (" + s.filter((x) => x[3] === 1).reduce((a, x) => a + x[2], 0).toFixed(0) + " km with land right beside both sides)");
  } catch (e) { console.error(d + ": " + e.message.split("\n")[0]); }
}
await browser.close();
