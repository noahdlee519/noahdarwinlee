// Checks the date box's reading of typed dates: node tools/chronia-date-check.mjs [base URL]
// Serve the repository root first (python3 -m http.server 8123).
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
let bad = 0;
const say = (ok, what, got) => { if (!ok) bad++; console.log((ok ? "ok   " : "FAIL ") + what + (ok ? "" : ": got " + got)); };

// Each written form, and the year, month, and day it means (0 for none; years BC negative).
const SAME = [
  [[1000, 7, 4], ["July 4 1000", "4 July 1000", "July 4, 1000", "4th July 1000", "the 4th of July, 1000", "July 4th 1000", "Jul. 4, 1000", "jul 4 1000", "JULY 4 1000", "1000 July 4", "1000-07-04", "1000/07/04", "7/4/1000", "4.7.1000", "4 July 1000 AD", "AD 1000 July 4", "July 4 1000 CE"]],
  [[1815, 8, 23], ["August 23, 1815", "23 August 1815", "Aug 23 1815", "23rd of August 1815", "1815-08-23", "8/23/1815", "23/8/1815", "23.08.1815", "  August   23 ,  1815 "]],
  [[1000, 7, 0], ["July 1000", "Jul 1000", "July of 1000", "1000 July", "July, 1000", "1000-07", "7/1000"]],
  [[-500, 3, 15], ["15 March 500 BC", "March 15 500 BC", "March 15, 500 BCE", "15 Mar 500 B.C.", "-500-03-15"]],
  [[-500, 0, 0], ["500 BC", "500 BCE", "500BC", "BC 500", "-500", "c. 500 BC", "circa 500 BC", "ca 500 BC"]],
  [[1815, 0, 0], ["1815", "AD 1815", "1815 AD", "1815 CE", "c. 1815"]],
  [[44, 3, 15], ["March 15 44", "15 March 44", "March 15, 44 AD"]],
  [[12, 0, 0], ["12", "AD 12"]],
];
const NOT = ["July 32 1000", "February 30 1815", "13/13/1000", "Smarch 4 1000", "hello", "", "4 July", "1815-13-01"];
for (const [want, forms] of SAME) for (const f of forms) {
  const got = await page.evaluate((s) => window.__chronia.dateOf(s), f);
  say(JSON.stringify(got) === JSON.stringify(want), JSON.stringify(f) + " is " + JSON.stringify(want), JSON.stringify(got));
}
for (const f of NOT) {
  const got = await page.evaluate((s) => window.__chronia.dateOf(s), f);
  say(got === null, JSON.stringify(f) + " is not a date", JSON.stringify(got));
}

// Typed into the box: from 1648 the day is kept; before, the year is shown, with a line saying why.
const type = async (s) => {
  await page.fill("#year-input", s);
  await page.press("#year-input", "Enter");
  await page.waitForTimeout(400);
  return page.evaluate(() => [document.getElementById("year-input").value, document.getElementById("year-hint").textContent]);
};
let r = await type("July 4 1776");
say(/July 4, 1776/.test(r[0]), "typing July 4 1776 shows July 4, 1776", r[0]);
r = await type("4 July 1776");
say(/July 4, 1776/.test(r[0]), "typing 4 July 1776 shows July 4, 1776", r[0]);
r = await type("July 4 1000");
say(r[0] === "1000" && /1648/.test(r[1]), "typing July 4 1000 goes to 1000 and says the map goes by the year before 1648", JSON.stringify(r));
r = await type("4 July 1000");
say(r[0] === "1000", "typing 4 July 1000 goes to 1000 as well", JSON.stringify(r));
r = await type("Smarch 4 1000");
say(r[0] === "1000" && /No date/.test(r[1]), "an unreadable date is put back, with the hint", JSON.stringify(r));
say(!errors.length, "no page errors", errors.join("; "));
await browser.close();
console.log(bad ? bad + " failed" : "all passed");
process.exit(bad ? 1 : 0);
