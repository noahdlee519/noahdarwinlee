// Builds data/sources.json, the editors' notes behind the card's Sources section, from LEDGER.md.
// Each ledger entry says which polities and years it applies to ("- Applies to: Luxembourg; Duchy of Limburg | 1839–1866");
// the card shows an entry's sources for a polity it names at a date within those years.
//
//   node chronia/tools/build-sources.mjs           writes data/sources.json and lists the entries it skipped
//   node chronia/tools/build-sources.mjs --check   also checks the source codes in the built data
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// "1815–1866" → [1815, 1866]; "3400 BC–2026" → [-3400, 2026]; "1920" → [1920, 1920]; null when it can't be read.
export function parseYears(text) {
  const one = (s, bcToo) => {
    const m = /^(?:AD\s*)?(\d{1,4})(?:\s*(BC|AD))?$/.exec(s.trim());
    if (!m) return null;
    return { y: +m[1], bc: m[2] === "BC", bare: !m[2] && !/^AD/.test(s.trim()) };
  };
  const parts = String(text).trim().split(/\s*[–—-]\s*/);
  if (parts.length < 1 || parts.length > 2) return null;
  const a = one(parts[0]), b = parts.length === 2 ? one(parts[1]) : a;
  if (!a || !b) return null;
  // "300–200 BC": a bare first year takes the second's era.
  const from = a.bc || (a.bare && b.bc && parts.length === 2 && a.y > b.y) ? -a.y : a.y, to = b.bc ? -b.y : b.y;
  return from <= to ? [from, to] : null;
}

// Markdown to the plain text the card shows: no backticks, a link as its text, single spaces.
export function plain(text) {
  return String(text).replace(/`/g, "").replace(/\[([^\]]+)\]\((?:[^()]|\([^()]*\))*\)/g, "$1").replace(/\*\*?([^*]+)\*\*?/g, "$1").replace(/\s+/g, " ").trim();
}

// The ledger's entries as notes. An entry that applies to "none" is left out; one with no "Applies to" line, no
// sources, or years that can't be read is skipped and named.
export function parseLedger(markdown) {
  const notes = [], skipped = [];
  let fenced = false, cur = null;
  const close = () => {
    if (!cur) return;
    const e = cur; cur = null;
    if (e.applies === undefined || !e.sources) { skipped.push(e.title); return; }
    if (/^none\.?$/i.test(e.applies)) return;
    const cut = e.applies.lastIndexOf(" | ");
    const names = (cut < 0 ? e.applies : e.applies.slice(0, cut)).split(";").map((s) => plain(s)).filter(Boolean);
    const years = parseYears(cut < 0 ? e.title.split(" | ")[0] : e.applies.slice(cut + 3));
    const numbered = e.sources.split(/(?:^|\s)\(\d+\)\s+/).map((s) => plain(s).replace(/[;,]$/, "")).filter(Boolean);
    if (!names.length || !years || !numbered.length) { skipped.push(e.title); return; }
    notes.push({ title: e.title, names, from: years[0], to: years[1], sources: numbered });
  };
  for (const line of String(markdown).split(/\r?\n/)) {
    if (/^```/.test(line)) { fenced = !fenced; continue; }
    if (fenced) continue;
    const h = /^## +(.+?)\s*$/.exec(line);
    if (h) { close(); cur = { title: plain(h[1]) }; continue; }
    if (!cur) continue;
    const f = /^- (Applies to|Sources): *(.*)$/.exec(line);
    if (f && f[1] === "Applies to") cur.applies = f[2].trim();
    else if (f) cur.sources = f[2].trim();
  }
  close();
  return { notes, skipped };
}

const here = dirname(fileURLToPath(import.meta.url));
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { notes, skipped } = parseLedger(readFileSync(resolve(here, "../LEDGER.md"), "utf8"));
  writeFileSync(resolve(here, "../data/sources.json"), JSON.stringify({ notes }) + "\n");
  console.log("sources: " + notes.length + " notes written" + (skipped.length ? ", " + skipped.length + " entries skipped:" : ", none skipped"));
  skipped.forEach((t) => console.log("  skipped: " + t));
}
