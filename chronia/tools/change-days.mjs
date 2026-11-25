// The days from 1800 on which the map changes, as the page will draw it, for eras.json's dated.days (and so the
// timeline's ticks and the Changes panel's dates). The page gives each row of a dated file its first and last day as
// prepDays in app.js does: the day the file gives for a change within the year, except at the file's first or last year
// where the change is with a row of the neighbouring file, which a date never loads; otherwise 1 January of its first
// year and 31 December of its last. The map changes on a row's first day and on the day after its last. Until
// 25 November 2026 dated.days was the days of the dated table as dated-days.mjs found them, which counted a day the page
// did not use (Lombardy's handover on 18 March 1860, shown on 1 January) and the last day of a span in place of the day
// after it, so the Changes panel had dates on which nothing on the map changed.
//
//   node chronia/tools/change-days.mjs [--check]
//
// With --check it only reports the days it would add and drop.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DAYS_FROM = 1800, MONTHLY_FROM = 1648;
const DAY0 = Date.UTC(1886, 0, 1), DAY_MS = 86400000;
const dayFromDate = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - DAY0) / DAY_MS);
const dateOf = (day) => new Date(DAY0 + day * DAY_MS).toISOString().slice(0, 10);

export function changeDays(eras, readChunk) {
  const out = new Set(), dated = eras.dated, firstDay = dayFromDate(DAYS_FROM, 1, 1);
  for (const [from, file] of dated.chunks) {
    const d = readChunk(file);
    if (d.to < DAYS_FROM || d.to < MONTHLY_FROM) continue;
    const n = d.rows.length, dayFrom = new Array(n), dayTo = new Array(n);
    for (let i = 0; i < n; i++) { dayFrom[i] = d.rows[i][2] < 1000 ? -1e9 : dayFromDate(d.rows[i][2], 1, 1); dayTo[i] = dayFromDate(d.rows[i][3], 12, 31); }
    const first = dayFromDate(d.from, 1, 1), last = dayFromDate(d.to, 12, 31);
    for (const x of d.days || []) {
      const r = d.rows[x[0]];
      if (x[1] !== null && !(r[2] === d.from && x[1] > first)) dayFrom[x[0]] = x[1];
      if (x[2] !== null && !(r[3] === d.to && d.to < dated.to && x[2] < last)) dayTo[x[0]] = x[2];
    }
    for (let i = 0; i < n; i++) {
      if (dayFrom[i] > first && dayFrom[i] >= firstDay) out.add(dayFrom[i]);
      if (dayTo[i] < last && dayTo[i] + 1 >= firstDay) out.add(dayTo[i] + 1);
    }
    if (d.from >= DAYS_FROM && from > dated.from) out.add(first);
  }
  return [...out].sort((a, b) => a - b);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const here = dirname(fileURLToPath(import.meta.url)), data = resolve(here, "../data"), path = resolve(data, "eras.json");
  const eras = JSON.parse(readFileSync(path));
  const days = changeDays(eras, (f) => JSON.parse(readFileSync(resolve(data, f))));
  const was = new Set(eras.dated.days || []), now = new Set(days);
  const added = days.filter((x) => !was.has(x)), dropped = [...was].filter((x) => !now.has(x)).sort((a, b) => a - b);
  console.log(days.length + " change days from " + DAYS_FROM + " (" + was.size + " before): " + added.length + " added, " + dropped.length + " dropped");
  if (added.length) console.log("added: " + added.map(dateOf).join(", "));
  if (dropped.length) console.log("dropped: " + dropped.map(dateOf).join(", "));
  if (!process.argv.includes("--check")) { eras.dated.days = days; writeFileSync(path, JSON.stringify(eras)); }
}
