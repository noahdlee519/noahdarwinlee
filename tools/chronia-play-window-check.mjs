// Checks where the timeline's window jumps to while the map plays: on a phone the date starts again at the left of the
// timeline, not its middle, so more of the years ahead are in view. node tools/chronia-play-window-check.mjs [base URL]
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const base = process.argv[2] || "http://localhost:8123/chronia/";
const browser = await chromium.launch();
let bad = 0;
const say = (ok, what, got) => { if (!ok) bad++; console.log((ok ? "ok   " : "FAIL ") + what + (ok ? "" : ": got " + got)); };
async function run(width, back) {
  const page = await browser.newPage({ viewport: { width, height: 800 }, isMobile: width < 640, hasTouch: width < 640 });
  await page.addInitScript(() => { try { localStorage.setItem("chronia-tour", "1"); localStorage.setItem("chronia-key", "0"); } catch (e) {} });
  await page.goto(base, { waitUntil: "load" });
  await page.waitForFunction(() => window.__chronia && window.__chronia.ready(), null, { timeout: 120000 });
  await page.evaluate((back) => { window.__chronia.setYear(back ? "1200" : "1000"); }, back);
  await page.waitForTimeout(800);
  // the marker's place on the bar (0 to 1) just after each jump of the window
  const jumps = await page.evaluate((back) => new Promise((done) => {
    const strip = document.getElementById("ticks-strip"), seen = [];
    let last = strip.style.transform;
    const tick = () => {
      if (strip.style.transform !== last && Math.abs(parseFloat(strip.style.transform.slice(11)) - parseFloat(last.slice(11))) > 40) {
        const r = document.getElementById("ticks").getBoundingClientRect(), m = document.getElementById("range");
        seen.push(+m.value / +m.max);
      }
      last = strip.style.transform;
      if (seen.length >= 2) { window.__chronia.play(false); done(seen); } else requestAnimationFrame(tick);
    };
    window.__chronia.play(true, back);
    requestAnimationFrame(tick);
    setTimeout(() => { window.__chronia.play(false); done(seen); }, 60000);
  }), back);
  await page.close();
  return jumps;
}
let j = await run(390, false);
say(j.length >= 1 && j.every((p) => p < 0.15), "phone, playing forward: after the window jumps the date is at the left", JSON.stringify(j));
j = await run(390, true);
say(j.length >= 1 && j.every((p) => p > 0.85), "phone, playing back: after the window jumps the date is at the right", JSON.stringify(j));
j = await run(1200, false);
say(j.length >= 1 && j.every((p) => p > 0.35 && p < 0.65), "desktop, playing forward: the window still centres on the date", JSON.stringify(j));
await browser.close();
console.log(bad ? bad + " failed" : "all passed");
process.exit(bad ? 1 : 0);
