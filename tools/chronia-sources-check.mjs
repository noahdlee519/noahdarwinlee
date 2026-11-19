// Checks the Sources section at the end of CHRONIA's country card.
// Serve the repository root first (python3 -m http.server 8123), then:
// node tools/chronia-sources-check.mjs [base URL]
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const base = process.argv[2] || "http://localhost:8123/chronia/";
const browser = await chromium.launch();
let bad = 0;
const say = (ok, what, got) => { if (!ok) bad++; console.log((ok ? "ok   " : "FAIL ") + what + (ok ? "" : ": " + got)); };

// A page with the tour and the key put away; `routes` may block or rewrite files before the page loads.
async function open(routes, width) {
  const page = await browser.newPage({ viewport: { width: width || 1200, height: 800 } });
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.setItem("chronia-tour", "1"); localStorage.setItem("chronia-key", "0"); } catch (e) {} });
  await page.route(/wikipedia\.org/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ title: "x", extract: "An extract.", content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/x" } } }) }));
  await page.route(/functions\/v1\//, (r) => r.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" } }));
  if (routes) await routes(page);
  await page.goto(base, { waitUntil: "load" });
  await page.waitForFunction(() => window.__chronia && window.__chronia.ready(), null, { timeout: 120000 });
  return page;
}
async function card(page, date, name) {
  await page.evaluate((d) => window.__chronia.setYear(d), date);
  await page.waitForTimeout(1200);
  await page.waitForFunction(() => window.__chronia.ready(), null, { timeout: 60000 });
  await page.evaluate((n) => window.__chronia.selectName(n), name);
  await page.waitForTimeout(600);
}
const state = (page) => page.evaluate(() => {
  const d = document.getElementById("src");
  if (!d) return { exists: false };
  const lines = {};
  d.querySelectorAll(".ch-src-line").forEach((l) => { const k = l.querySelector(".ch-fact-label"); if (k) lines[k.textContent.replace(/:\s*$/, "")] = l.textContent; });
  const body = document.getElementById("src-body");
  return { exists: true, hidden: d.hidden, open: d.open, lines, titles: [...d.querySelectorAll(".ch-src-note-title")].map((e) => e.textContent), notes: (d.querySelector(".ch-src-notes") || {}).textContent || "", report: !!d.querySelector(".ch-src-report"), wide: body ? body.scrollWidth - body.clientWidth : 0 };
});
const openIt = async (page) => { await page.evaluate(() => { const d = document.getElementById("src"); if (d && !d.open) d.querySelector("summary").click(); }); await page.waitForTimeout(900); };

{
  const page = await open();
  await card(page, "1845-06-15", "Luxembourg");
  let s = await state(page);
  say(s.exists && !s.hidden && !s.open, "Luxembourg, June 15, 1845: the section is there and closed", JSON.stringify(s).slice(0, 200));
  say(/editors/.test((s.lines || {}).Borders || ""), "its borders name the editors' work", (s.lines || {}).Borders);
  say(/Editors’ discretion/.test((s.lines || {}).Dates || ""), "its dates are the editors'", (s.lines || {}).Dates);
  say(!!(s.lines || {}).Name && /Wikipedia/.test((s.lines || {}).Text || ""), "it has Name and Text lines", JSON.stringify(s.lines));
  await openIt(page);
  s = await state(page);
  say((s.titles || []).some((t) => t.startsWith("1815–1866 | the Low Countries")), "opened, it shows the ledger's entry for 1815–1866", JSON.stringify(s.titles));
  say(!(s.titles || []).some((t) => t.startsWith("1803–1815 | the Low Countries")), "and not the entry for 1803–1815, which names it for other years", JSON.stringify(s.titles));
  say(s.report, "it has the report button", "");
  await card(page, "1845-06-15", "Belgium");
  s = await state(page);
  say(s.open, "it stays open on the next card", JSON.stringify(s).slice(0, 120));
  await card(page, "1500", "Ming dynasty");
  s = await state(page);
  say(/Cliopatria/.test((s.lines || {}).Borders || ""), "Ming dynasty, 1500: borders from Cliopatria", (s.lines || {}).Borders);
  await card(page, "2000-01-01", "France");
  s = await state(page);
  say(/CShapes 2\.0/.test((s.lines || {}).Borders || ""), "France, January 1, 2000: borders from CShapes 2.0", (s.lines || {}).Borders);
  say(!/matching Wikipedia/.test((s.lines || {}).Name || ""), "the name is not said to match an article Wikipedia did not return", (s.lines || {}).Name);
  await page.unroute(/wikipedia\.org/);
  await page.route(/wikipedia\.org/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ title: "East Germany", extract: "An extract.", content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/East_Germany" } } }) }));
  await card(page, "1950-01-01", "East Germany");
  s = await state(page);
  say(/Editors’ discretion, matching Wikipedia’s article title/.test((s.lines || {}).Name || ""), "East Germany, 1950: the editors' name matches the article Wikipedia returned", (s.lines || {}).Name);
  say(!page.errors.length, "no page errors", page.errors.join("; "));
  await page.close();
}
{
  const page = await open((p) => p.route(/data\/sources\.json/, (r) => r.abort()));
  await card(page, "1845-06-15", "Luxembourg");
  await openIt(page);
  const s = await state(page);
  say(/editors/.test((s.lines || {}).Borders || ""), "with the notes file unreachable, the borders line still shows", (s.lines || {}).Borders);
  say(/The editors’ notes could not be loaded\./.test(s.notes || ""), "and the notes say they could not be loaded", s.notes);
  say(!page.errors.length, "no page errors", page.errors.join("; "));
  await page.close();
}
{
  const strip = async (r) => { const res = await r.fetch(); const d = await res.json(); delete d.src; await r.fulfill({ response: res, json: d }); };
  const page = await open(async (p) => { await p.route(/data\/dated\/[^/]*\d\.json/, strip); await p.route(/data\/modern\.json/, strip); });
  await card(page, "1845-06-15", "Luxembourg");
  const s = await state(page);
  say(s.exists && s.hidden, "with no codes in the data, the section is hidden", JSON.stringify(s).slice(0, 160));
  say(!page.errors.length, "no page errors", page.errors.join("; "));
  await page.close();
}
{
  const page = await open(null, 320);
  await card(page, "1845-06-15", "Luxembourg");
  await openIt(page);
  const s = await state(page);
  say(s.exists && s.open && s.wide <= 0, "at 320 px wide, the open section fits the card", JSON.stringify({ open: s.open, wide: s.wide }));
  await page.close();
}
await browser.close();
console.log(bad ? bad + " failed" : "all passed");
process.exit(bad ? 1 : 0);
