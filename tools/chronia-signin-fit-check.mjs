// Google's sign-in button and the words round it stay inside their panel on a phone. The button is drawn by
// Google's script at a width the page asks for, and it sat in a fieldset, which by default grows to fit its widest
// child: at 248 px in a 212 px panel, the button and the note above it ran out past the panel's right edge
// (seen on an iPhone in Italian, 25 November 2026). Google's script is played by a stand-in that draws a box of
// the width asked for.   node tools/chronia-signin-fit-check.mjs [base URL]
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("./", import.meta.url))("playwright");
const BASE = process.argv[2] || "http://localhost:8101/chronia/";
// WIDE plays a label too long for the width asked for: Google then draws the button wider than asked.
const STUB = (wide) => `window.__gsiWide = ${wide}; window.google = { accounts: { id: { initialize: function () {}, prompt: function () {}, cancel: function () {}, disableAutoSelect: function () {},
  renderButton: function (box, o) { var d = document.createElement("div"); d.className = "gsi-stub"; d.setAttribute("data-w", String(o.width));
    d.style.cssText = "width:" + Math.max(o.width, window.__gsiWide) + "px;height:44px;background:#fff"; box.appendChild(d); } } } };`;
let fails = 0, n = 0;
const ok = (c, what, got) => { n++; if (!c) { fails++; console.log("FAIL " + what + (got !== undefined ? " :: " + JSON.stringify(got) : "")); } };
const browser = await chromium.launch();
for (const [w, locale, wide] of [[320, "en-US", 0], [375, "it-IT", 0], [393, "it-IT", 0], [393, "de-DE", 0], [430, "en-US", 0], [393, "ru-RU", 262], [320, "ru-RU", 262]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, locale, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.route("https://accounts.google.com/gsi/client", (r) => r.fulfill({ contentType: "application/javascript", body: STUB(wide) }));
  await page.route(/supabase\.co/, (r) => r.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
  await page.goto(BASE + "#y=1815-07-15");
  await page.waitForFunction(() => window.__chronia && window.__chronia.ready(), null, { timeout: 60000 });
  for (const [btn, panel] of [["save-btn", "save"], ["account-btn", "account"]]) {
    await page.evaluate((b) => document.getElementById(b).click(), btn);
    await page.waitForSelector("#" + panel + " .gsi-stub", { state: "attached", timeout: 15000 }).catch(() => {});
    const r = await page.evaluate((id) => {
      const p = document.getElementById(id), pr = p.getBoundingClientRect(), cs = getComputedStyle(p);
      const inner = pr.right - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth), left = pr.left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
      const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
      const stub = [...p.querySelectorAll(".gsi-stub")].filter(vis)[0];
      const over = [...p.querySelectorAll("p, button, a, label, legend, fieldset, .gsi-stub, .ch-report-gsi")].filter(vis)
        .map((e) => ({ what: (e.className || e.tagName) + ":" + (e.textContent || "").trim().slice(0, 30), right: Math.round(e.getBoundingClientRect().right * 10) / 10 }))
        .filter((x) => x.right > inner + 0.6);
      return { panel: !p.hidden, inner: Math.round(inner), room: Math.round(inner - left), stub: stub ? { w: +stub.getAttribute("data-w"), right: Math.round(stub.getBoundingClientRect().right), left: Math.round(stub.getBoundingClientRect().left) } : null, over,
        page: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    }, panel);
    const tag = w + " px, " + locale + (wide ? ", a label " + wide + " px wide" : "") + ", " + panel + " panel: ";
    ok(r.panel, tag + "it opens", r);
    ok(r.stub, tag + "Google's button is drawn", r);
    ok(r.stub && r.stub.w >= 200 && r.stub.w <= 400, tag + "the button is asked for at a width Google allows (200 to 400)", r.stub);
    ok(r.stub && r.stub.w <= r.room + 0.6, tag + "the button is asked for no wider than the room in the panel", r);
    ok(r.stub && r.stub.right - r.stub.left <= r.room + 1, tag + "the button as drawn is no wider than the room", r);
    ok(r.over.length === 0, tag + "nothing runs past the panel's right edge", r.over);
    ok(r.page <= 0, tag + "the page does not scroll sideways", r.page);
    await page.keyboard.press("Escape");
    await page.evaluate((id) => { const p = document.getElementById(id); if (!p.hidden) document.body.click(); }, panel);
  }
  await ctx.close();
}
await browser.close();
console.log(fails ? fails + " of " + n + " checks failed" : "all " + n + " checks passed");
process.exit(fails ? 1 : 0);
