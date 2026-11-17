// Builds data/sources.json, the editors' notes behind the card's Sources section, from LEDGER.md.
// Each ledger entry says which polities and years it applies to ("- Applies to: Luxembourg; Duchy of Limburg | 1839–1866",
// or "tag:medieval" for every span drawn from that table); the card shows an entry's sources for a polity it names, or
// whose borders have that tag, at a date within those years.
//
//   node chronia/tools/build-sources.mjs           writes data/sources.json and lists the entries it skipped
//   node chronia/tools/build-sources.mjs --check   also checks the source codes in the built data
import { readFileSync, writeFileSync } from "node:fs";
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

// Markdown to the plain text the card shows: no backticks, a link as its text, single spaces, and curly quotes.
const unmark = (text) => String(text).replace(/`/g, "").replace(/\[([^\]]+)\]\((?:[^()]|\([^()]*\))*\)/g, "$1").replace(/\*\*?([^*]+)\*\*?/g, "$1").replace(/\s+/g, " ").trim();
export function plain(text) {
  return unmark(text).replace(/(^|[\s(\[])"/g, "$1“").replace(/"/g, "”").replace(/'/g, "’");
}

// The ledger's entries as notes. An entry that applies to "none" is left out; one with no "Applies to" line, no
// sources, or years that can't be read is skipped and named.
export function parseLedger(markdown) {
  const notes = [], skipped = [];
  let fenced = false, cur = null;
  const close = () => {
    if (!cur) return;
    const e = cur; cur = null;
    if (e.applies.length && e.applies.every((a) => /^none\.?$/i.test(a))) return;
    if (!e.applies.length || (!e.sources && !e.items.length)) { skipped.push(e.title); return; }
    // The sources are numbered on one line, "(1) … (2) …", or a list of indented bullets under "- Sources:", each kept whole.
    const numbered = (e.items.length ? e.items : e.sources.split(/(?:^|\s)\(\d{1,2}\)\s+/)).map((s) => plain(s).replace(/[;,]$/, "")).filter(Boolean);
    const made = [];
    // One note for each "Applies to" line, so an entry about two periods can name each.
    for (const line of e.applies) {
      if (/^none\.?$/i.test(line)) continue;
      const cut = line.lastIndexOf(" | ");
      const items = (cut < 0 ? line : line.slice(0, cut)).split(";").map((s) => unmark(s)).filter(Boolean);
      // "tag:medieval" stands for every span whose borders come from that table (a key of tools/sources.json's borders).
      const names = items.filter((s) => !/^tag:/.test(s)), tags = items.filter((s) => /^tag:/.test(s)).map((s) => s.slice(4).trim());
      const years = parseYears(cut < 0 ? e.title.split(" | ")[0] : line.slice(cut + 3));
      if (!items.length || !years || !numbered.length) { skipped.push(e.title); return; }
      made.push({ title: e.title, names, tags, from: years[0], to: years[1], sources: numbered });
    }
    notes.push(...made);
  };
  for (const line of String(markdown).split(/\r?\n/)) {
    if (/^```/.test(line)) { fenced = !fenced; continue; }
    if (fenced) continue;
    const h = /^## +(.+?)\s*$/.exec(line);
    if (h) { close(); cur = { title: plain(h[1]), applies: [], items: [], inSources: false }; continue; }
    if (!cur) continue;
    const f = /^- (Applies to|Sources): *(.*)$/.exec(line);
    const sub = /^\s+- +(.*)$/.exec(line);
    if (cur.inSources && sub) { cur.items.push(sub[1]); continue; }
    if (/^- /.test(line)) cur.inSources = false;
    if (f && f[1] === "Applies to") cur.applies.push(f[2].trim());
    else if (f) { cur.sources = f[2].trim(); cur.inSources = !cur.sources; }
  }
  close();
  return { notes, skipped };
}

// The source codes in the built data: every row has one, every code is in eras.json's srcKeys, and every key's three parts
// (borders | name | dates) are in the registry. Returns the problems found and the rows counted by borders tag.
export function checkCodes(dataDir) {
  const problems = [], count = {};
  const eras = JSON.parse(readFileSync(resolve(dataDir, "eras.json"), "utf8"));
  if (!Array.isArray(eras.srcKeys) || !eras.sources) return { problems: ["eras.json: no srcKeys"], count };
  const R = eras.sources;
  eras.srcKeys.forEach((k) => {
    const [b, n, d] = String(k).split("|");
    if (!R.borders[b] || !R.name[n] || !R.dates[d]) problems.push("eras.json: key " + k + " is not in the registry");
  });
  const files = eras.dated.chunks.map((c) => c[1]).concat([eras.modern.file]);
  for (const f of files) {
    const body = JSON.parse(readFileSync(resolve(dataDir, f), "utf8"));
    if (!Array.isArray(body.src) || body.src.length !== body.rows.length) { problems.push(f + ": src missing or not of the rows' length"); continue; }
    body.src.forEach((k, i) => {
      if (!Number.isInteger(k) || k < 0 || k >= eras.srcKeys.length) { problems.push(f + ": row " + i + " has code " + k); return; }
      const b = eras.srcKeys[k].split("|")[0];
      count[b] = (count[b] || 0) + 1;
    });
  }
  return { problems, count };
}

const here = dirname(fileURLToPath(import.meta.url));
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { notes, skipped } = parseLedger(readFileSync(resolve(here, "../LEDGER.md"), "utf8"));
  writeFileSync(resolve(here, "../data/sources.json"), JSON.stringify({ notes }) + "\n");
  console.log("sources: " + notes.length + " notes written" + (skipped.length ? ", " + skipped.length + " entries skipped:" : ", none skipped"));
  skipped.forEach((t) => console.log("  skipped: " + t));
  // The registry goes into eras.json too, so a phrase can be reworded without the long build. The keys the data uses must stay.
  const erasPath = resolve(here, "../data/eras.json"), eras = JSON.parse(readFileSync(erasPath, "utf8"));
  if (Array.isArray(eras.srcKeys)) {
    eras.sources = JSON.parse(readFileSync(resolve(here, "sources.json"), "utf8"));
    writeFileSync(erasPath, JSON.stringify(eras));
  }
  if (process.argv.includes("--check")) {
    const { problems, count } = checkCodes(resolve(here, "../data"));
    if (problems.length) { problems.slice(0, 20).forEach((p) => console.log("  " + p)); console.log("codes: " + problems.length + " problems"); process.exit(1); }
    console.log("codes ok: " + Object.entries(count).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + " " + v).join(", "));
  }
}
