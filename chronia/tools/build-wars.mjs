// The wars listed in the Wars panel: every war in Wikidata (an instance of war, Q198, or a subclass) with an English Wikipedia
// article and a start date, with its sides from the combatants in the article's infobox (see the README's "The wars at the date").
// tools/wars/wars-wikidata.json is the fetch (made in a browser, since Wikidata and Wikipedia are out of the build machine's reach);
// this writes data/wars.json:
//   { source, fetched, wars: [[name, wiki title, first year, first day | null, last year, last day | null, weight, [lon, lat] | null, sides]] }
// where a side is a list of members [name, lon, lat, flag] (lon and lat null where no place is known, flag -1 where it has none in
// data/flags.webp), years count AD 1 as 1 and 1 BC as -1, and days count from 1 January 1886 as the zones of control do, given only
// for wars from 1800 dated to the month or day. data/flags.webp holds the 420 flags most used by the wars' parties, 30 by 20 each,
// 20 to a row, from Wikidata's flag images (P41) and Wikimedia Commons (tools/wars/flags-wikidata.json lists them and each party's).
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = JSON.parse(readFileSync(resolve(here, "wars/wars-wikidata.json"), "utf8"));
const DAY0 = Date.UTC(1886, 0, 1), DAY_MS = 864e5, LAST_YEAR = 2026;
const dayOf = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - DAY0) / DAY_MS);

// Left out: umbrella names for many wars or centuries of them, and the theatres of a war listed on its own.
const DROP = new Set(["Cold War", "Arab Spring", "Crusades", "Reconquista", "Punic Wars", "War on terror", "Eastern Front (World War II)",
  "Pacific War", "Western Front (World War I)", "Western Front (World War II)", "Eastern Front (World War I)", "Mediterranean and Middle East theatre of World War II",
  "European theatre of World War II", "Asiatic-Pacific Theater", "Mexican Revolution and the United States", "French Revolutionary and Napoleonic Wars"]);
// Wars the zones of control already list with their own flags (WAR_PARTIES in app.js), by Wikipedia title.
const CONTROLLED = new Set(["World War I", "World War II", "American Civil War", "Spanish Civil War", "Syrian civil war", "Russo-Ukrainian war (2022–present)", "Mexican drug war", "Gaza war"]);
// Dates mended where Wikidata's run into a war listed separately.
const ENDS = { "Russo-Ukrainian war": "2022-02-23" };
const MAX_SIDE = 6;
const FLAGS = JSON.parse(readFileSync(resolve(here, "wars/flags-wikidata.json"), "utf8"));
const FLAG_AT = new Map(FLAGS.files.map((f, i) => [f, i]));

// Wikidata's years are astronomical (0 is 1 BC); CHRONIA's have no year 0.
function when(v, prec, end) {
  const m = /^(-?)(\d+)-(\d\d)-(\d\d)/.exec(v);
  if (!m) return null;
  let y = (m[1] ? -1 : 1) * +m[2];
  if (y <= 0) y -= 1;
  const mo = +m[3], d = +m[4];
  if (prec === 8 && end) y += 9;
  if (prec === 7 && end) y += 99;
  const day = y >= 1800 && prec >= 10 ? (prec === 11 ? dayOf(y, mo, d) : end ? dayOf(y, mo + 1, 1) - 1 : dayOf(y, mo, 1)) : null;
  return [y, day];
}
// A qualifier of "unknown value" comes as a URL, and counts as open.
const yearOf = (v, open) => { const m = /^(-?)(\d+)-/.exec(v || ""); if (!m) return open; const y = (m[1] ? -1 : 1) * +m[2]; return y <= 0 ? y - 1 : y; };
const yearsOf = (r) => [yearOf(r[3], -Infinity), yearOf(r[4], Infinity)];
// A member's place: its capital in the war's first year (preferred, else the one dated to that year, else its only one), else its own
// coordinates, else its headquarters, else the capital of the country it belonged to.
function placeOf(rows, y) {
  if (!rows || !rows.length) return null;
  const caps = rows.filter((r) => r[0] === "cap");
  const dated = caps.filter((r) => (r[3] || r[4]) && (() => { const [a, b] = yearsOf(r); return a <= y && y <= b; })());
  const pick = dated.find((r) => r[5] === "P") || dated[0] || caps.find((r) => r[5] === "P") || (caps.filter((r) => !r[3] && !r[4]).length === 1 ? caps.find((r) => !r[3] && !r[4]) : null)
    || rows.find((r) => r[0] === "own") || rows.find((r) => r[0] === "hq") || caps[0] || rows.find((r) => r[0] === "via");
  return pick ? [pick[1], pick[2]] : null;
}
// A party's flag in the war's first year: the one dated to that year (preferred first), else, if none of its flags is dated, its preferred
// or only one; a party whose flags are all dated to other years has none.
function flagOf(rows, y) {
  if (!rows || !rows.length) return -1;
  const dated = rows.filter((r) => (r[1] || r[2]) && (() => { const [a, b] = yearsOf([0, 0, 0, r[1], r[2]]); return a <= y && y <= b; })());
  const undated = rows.filter((r) => !r[1] && !r[2]);
  const pick = dated.find((r) => r[3] === "P") || dated[0] || (rows.some((r) => r[1] || r[2]) ? null : undated.find((r) => r[3] === "P") || undated[0]);
  return pick && FLAG_AT.has(pick[0]) ? FLAG_AT.get(pick[0]) : -1;
}
const clean = (label, title) => {
  let s = String(label || "").replace(/\{\{[^}]*\}\}?/g, "").replace(/<[^>]*>/g, "").replace(/'''|''/g, "").replace(/\s+/g, " ").trim();
  if (!s || /[{}|=\[\]]/.test(s) || /^[\d(]/.test(s) || s.length > 60) s = String(title || "").replace(/\s*\([^)]*\)$/, "");
  return s;
};

const out = [];
let dropped = 0, controlled = 0, noSides = 0, flagged = 0;
for (const w of src.wars) {
  if (DROP.has(w.t)) { dropped++; continue; }
  if (CONTROLLED.has(w.t)) { controlled++; continue; }
  const a = when(w.s, w.sp, false);
  if (!a) continue;
  let b = w.e ? when(w.e, w.ep, true) : null;
  if (ENDS[w.t]) { const [y, mo, d] = ENDS[w.t].split("-").map(Number); b = [y, dayOf(y, mo, d)]; }
  if (!b) b = /present|ongoing/i.test(w.date || "") ? [LAST_YEAR, null] : [a[0], a[1]];
  if (b[0] < a[0]) b = [a[0], a[1]];
  // A series of wars over generations (the Russo-Turkish wars, the American Indian Wars) is left to its wars.
  if (/\bwars\b/i.test(w.t.replace(/\s*\(.*\)$/, "")) && b[0] - a[0] > 25 || /^Cold War\b/.test(w.t)
    || /^(List of|Battle of|Siege of)\b/.test(w.t) || /, \d{3,4}[–-]\d{3,4}$/.test(w.t) || b[0] - a[0] > 120) { dropped++; continue; }
  const seen = new Set();
  const sides = w.sides.map((side) => side.filter((m) => !/^(and )?(other|others|various|several|many)\b/i.test(clean(m[0], m[1]))).filter((m) => { const k = m[2] || m[1]; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, MAX_SIDE)
    .map((m) => { const name = clean(m[0], m[1]), p = m[2] ? placeOf(src.geo[m[2]], a[0]) : null, f = m[2] ? flagOf(FLAGS.flags[m[2]], a[0]) : -1; if (f >= 0) flagged++; return [name, p ? p[0] : null, p ? p[1] : null, f]; })).filter((s) => s.length);
  if (sides.length < 2) noSides++;
  const loc = w.c ? (/Point\(([-\d.eE]+) ([-\d.eE]+)\)/.exec(w.c) || []).slice(1).map((x) => +(+x).toFixed(3)) : null;
  out.push([w.t, w.t, a[0], a[1], b[0], b[1], w.sl, loc && loc.length === 2 ? loc : null, sides.length >= 2 ? sides : []]);
}
out.sort((x, y) => x[2] - y[2] || y[6] - x[6]);
const data = { source: src.source, fetched: src.fetched.slice(0, 10), wars: out };
writeFileSync(resolve(here, "../data/wars.json"), JSON.stringify(data));
console.log("wars: " + out.length + " (" + dropped + " umbrella names and theatres left out, " + controlled + " listed by the zones of control), " + noSides + " without two sides from the infobox, " + flagged + " parties with a flag, " + JSON.stringify(data).length + " bytes");
