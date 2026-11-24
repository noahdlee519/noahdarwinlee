// Checks that CHRONIA's and UCHRONIA's pages can't be zoomed on a touch screen (a double tap, a pinch on the interface, or a tap
// on a text box zoomed the whole page on an iPhone), while the map keeps its own pinch.
// node tools/page-zoom-check.mjs [site's base URL]
import { createRequire } from "node:module";
const { chromium, devices } = createRequire(import.meta.url)("playwright");
const base = (process.argv[2] || "http://localhost:8123/").replace(/\/?$/, "/");
const browser = await chromium.launch();
let bad = 0;
const say = (ok, what, got) => { if (!ok) bad++; console.log((ok ? "ok   " : "FAIL ") + what + (ok ? "" : ": got " + got)); };

for (const [name, path, map, button] of [["CHRONIA", "chronia/", "#globe", "#search-btn"], ["UCHRONIA", "uchronia/", "canvas", "button"]]) {
  for (const touch of [true, false]) {
    const ctx = await browser.newContext(touch ? { ...devices["iPhone 13"] } : { viewport: { width: 1200, height: 800 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { try { localStorage.setItem("chronia-tour", "1"); localStorage.setItem("chronia-key", "0"); localStorage.setItem("uchronia-tour", "1"); } catch (e) {} });
    await page.goto(base + path, { waitUntil: "load" });
    await page.waitForTimeout(2500);
    const r = await page.evaluate(([map, button]) => {
      const meta = (document.querySelector('meta[name="viewport"]') || {}).content || "";
      const fire = (type, el) => { const e = new Event(type, { bubbles: true, cancelable: true }); el.dispatchEvent(e); return e.defaultPrevented; };
      const btn = document.querySelector(button), cv = document.querySelector(map);
      return { meta, body: getComputedStyle(document.body).touchAction, html: getComputedStyle(document.documentElement).touchAction, map: cv ? getComputedStyle(cv).touchAction : "no map",
        gesture: btn ? fire("gesturestart", btn) : null, change: btn ? fire("gesturechange", btn) : null };
    }, [map, button]);
    // CHRONIA's map zooms in on a double click with a mouse, and not on a double tap with a finger (two quick taps on a
    // country zoomed the map in when its card was all that was wanted)
    let dbl = null;
    if (name === "CHRONIA") dbl = await page.evaluate(async () => {
      const c = window.__chronia, cv = document.getElementById("globe"), out = {};
      for (const type of ["touch", "mouse"]) {
        c.setView(15, 32, 1); await new Promise((r) => setTimeout(r, 400));
        const at = { bubbles: true, cancelable: true, clientX: innerWidth / 2, clientY: innerHeight / 2, pointerId: 7, pointerType: type, isPrimary: true, button: 0 };
        cv.dispatchEvent(new PointerEvent("pointerdown", at)); cv.dispatchEvent(new PointerEvent("pointerup", at));
        cv.dispatchEvent(new MouseEvent("dblclick", at));
        await new Promise((r) => setTimeout(r, 400));
        out[type] = c.view.zoom;
      }
      c.setView(15, 32, 1);
      return out;
    });
    const who = name + (touch ? " on a phone" : " on a desktop");
    if (dbl) say(Math.abs(dbl.touch - 1) < 0.01 && dbl.mouse > 1.5, who + ": a double tap leaves the map's zoom alone, and a double click zooms in", "zoom " + dbl.touch + " after a double tap, " + dbl.mouse + " after a double click");
    if (touch) {
      say(/maximum-scale=1(\.0)?\b/.test(r.meta) && /user-scalable=no/.test(r.meta), who + ": the viewport allows no page zoom (which also stops the zoom on tapping a text box)", r.meta);
      say(r.body === "pan-x pan-y" && r.html === "pan-x pan-y", who + ": the page takes pans only, no pinch or double-tap zoom", "html " + r.html + ", body " + r.body);
      say(r.gesture === true && r.change === true, who + ": a pinch on the interface is refused", "gesturestart " + r.gesture + ", gesturechange " + r.change);
      say(r.map === "none", who + ": the map keeps its own touch handling", r.map);
    } else {
      say(r.gesture === false, who + ": a trackpad pinch is left alone", "gesturestart prevented " + r.gesture);
    }
    await ctx.close();
  }
}
await browser.close();
console.log(bad ? bad + " failed" : "all passed");
process.exit(bad ? 1 : 0);
