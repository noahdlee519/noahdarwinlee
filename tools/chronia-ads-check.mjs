// Checks where the advertisement banners go (with `&ads`, which draws labelled boxes in their places): one in each gap
// beside the date wherever the gaps take a banner 160 wide, and one under the top row only where they are not.
// node tools/chronia-ads-check.mjs [base URL]
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const base = process.argv[2] || "http://localhost:8123/chronia/";
const browser = await chromium.launch();
let bad = 0;
const say = (ok, what, got) => { if (!ok) bad++; console.log((ok ? "ok   " : "FAIL ") + what + (ok ? "" : ": got " + got)); };
async function run(width) {
  const page = await browser.newPage({ viewport: { width, height: 800 }, isMobile: width < 640, hasTouch: width < 640 });
  await page.addInitScript(() => { try { localStorage.setItem("chronia-tour", "1"); localStorage.setItem("chronia-key", "0"); } catch (e) {} });
  await page.goto(base + "?ads", { waitUntil: "load" });
  await page.waitForFunction(() => window.__chronia && window.__chronia.ready(), null, { timeout: 120000 });
  await page.waitForTimeout(4000);   // past the opening, after which the banner under the top row shows
  const r = await page.evaluate(() => {
    const box = (id) => { const e = document.getElementById(id); if (!e || e.hidden) return null; const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
    return { L: box("ad-left"), R: box("ad-right"), B: box("ad-below"), head: box("head"), yb: box("year-box"), ctls: box("ctls") };
  });
  await page.close();
  return r;
}
for (const w of [1288, 1440, 1600]) {
  const r = await run(w);
  say(!!r.L && !!r.R && !r.B, w + " wide: a banner each side of the date and none below", JSON.stringify({ L: !!r.L, R: !!r.R, B: !!r.B }));
  if (r.L && r.R) {
    say(r.L.l >= r.head.r && r.L.r <= r.yb.l, w + " wide: the left banner between the title and the date", JSON.stringify(r.L));
    say(r.R.l >= r.yb.r && r.R.r <= r.ctls.l, w + " wide: the right banner between the date and the buttons", JSON.stringify(r.R));
    say(r.L.t < r.yb.b && r.L.b > r.yb.t, w + " wide: the banners level with the date", JSON.stringify(r.L));
  }
}
{
  const r = await run(1100);
  say(!r.L && !r.R && !!r.B, "1100 wide: one banner below, none at the sides", JSON.stringify({ L: !!r.L, R: !!r.R, B: !!r.B }));
}
// On phones: nothing on the loading screen; then one banner, clear of the title, that stays when Google leaves it unfilled.
for (const w of [360, 390, 430]) {
  const page = await browser.newPage({ viewport: { width: w, height: 844 }, isMobile: true, hasTouch: true });
  await page.addInitScript(() => { try { localStorage.setItem("chronia-tour", "1"); localStorage.setItem("chronia-key", "0"); } catch (e) {} });
  await page.goto(base + "?ads", { waitUntil: "domcontentloaded" });
  const early = await page.evaluate(() => { const e = document.getElementById("ad-below"); return !!e && !e.hidden && !document.getElementById("load").classList.contains("is-gone"); });
  say(!early, w + " wide: no banner while the page loads", early);
  await page.waitForFunction(() => window.__chronia && window.__chronia.ready(), null, { timeout: 120000 });
  await page.waitForTimeout(4000);
  const box = () => page.evaluate(() => {
    const g = (id) => { const e = document.getElementById(id); if (!e || e.hidden) return null; const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
    return { B: g("ad-below"), L: g("ad-left"), head: g("head"), ctls: g("ctls") };
  });
  const r = await box();
  say(!!r.B && !r.L, w + " wide: one banner below, none at the sides", JSON.stringify(r.B));
  if (r.B) {
    // Since 19 November 2026 (6e700a9) the phone's banner sits in the top row beside the title, the tools behind a menu button.
    const clear = (a, b) => a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t;
    say(clear(r.B, r.head) && r.B.l >= 0 && r.B.r <= w, w + " wide: the banner on screen and clear of the title", JSON.stringify([r.B, r.head]));
  }
  await page.evaluate(() => { const B = document.getElementById("ad-below"); const ins = document.createElement("ins"); B.appendChild(ins); ins.setAttribute("data-ad-status", "unfilled"); window.dispatchEvent(new Event("resize")); });
  await page.waitForTimeout(800);
  say(!!(await box()).B, w + " wide: the banner stays when Google leaves it unfilled", "hidden");
  await page.close();
}
await browser.close();
console.log(bad ? bad + " failed" : "all passed");
process.exit(bad ? 1 : 0);
