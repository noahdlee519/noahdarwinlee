import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "control");
const API = "https://en.wikipedia.org/w/api.php";
const UA = "CHRONIA zones of control (noahdarwinlee.com)";
const WARS = [
  { key: "syria", from: "2014-09", modules: ["Module:Syrian Civil War detailed map"], marks: ["Module:Middle East conflicts map marks"] },
  { key: "ukraine", from: "2022-03", modules: ["Module:Russo-Ukrainian war detailed map", "Module:Russo-Ukrainian war overview map"], marks: [] },
  { key: "israel", from: "2016-01", modules: ["Module:Israeli-Palestinian conflict detailed map"], marks: [] }
];
const only = process.argv.slice(2);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(params) {
  const url = API + "?" + new URLSearchParams({ ...params, format: "json", formatversion: "2" });
  for (let tries = 0; tries < 6; tries++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    const text = await res.text();
    if (text[0] === "{") { await sleep(600); return JSON.parse(text); }
    await sleep(5000 * (tries + 1));
  }
  throw new Error("Wikipedia did not answer for " + url);
}
async function revisionAt(title, stamp) {
  const j = await api({ action: "query", prop: "revisions", titles: title, rvprop: "ids|timestamp|content", rvslots: "main", rvlimit: "1", rvdir: "older", rvstart: stamp });
  const page = j.query.pages[0];
  const rev = page && page.revisions && page.revisions[0];
  return rev ? { id: rev.revid, at: rev.timestamp, text: rev.slots.main.content } : null;
}

function colourOf(file) {
  const f = file.replace(/_/g, " ").trim();
  let m;
  if ((m = f.match(/^Location dot (\w+)\.svg$/i))) return m[1].toLowerCase();
  if (/^Dot green 0d0/i.test(f)) return "green0d0";
  if (/^Dot yellow ff4/i.test(f)) return "yellow";
  if (/^Map-dot-grey-68a/i.test(f)) return "grey";
  if ((m = f.match(/^(?:Map-circle|Map-peak|Abm|Fighter-jet|Helicopter|Icon NuclearPowerPlant|Anchor pictogram|3x3dot|4x4dot)[- ](\w+)/i))) return m[1].toLowerCase();
  return null;
}
function shortcuts(text) {
  const names = {};
  const re = /(?:^|[\s{,])(\w+)\s*=\s*["']([^"'\n]+\.(?:svg|png|gif))["']/g;
  let m;
  while ((m = re.exec(text))) names[m[1]] = m[2];
  return names;
}
function legend(text) {
  const i = text.indexOf("caption");
  if (i < 0) return {};
  const cap = text.slice(i, i + 3000), leg = {};
  const re = /\[\[File:([^|\]]+)\|\d+px\]\]\s*([^;\[<*]*(?:\[\[(?!File:)[^\]]*\]\][^;\[<*]*)*)/g;
  let m;
  while ((m = re.exec(cap))) {
    const c = colourOf(m[1]);
    if (c && !(c in leg)) leg[c] = m[2].replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1").replace(/'''?/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
  }
  return leg;
}
function marks(text, names) {
  const found = [];
  const block = /\{[^{}]*\}/g, num = (src, key) => { const m = src.match(new RegExp("\\b" + key + "\\s*=\\s*\"?(-?[\\d.]+)")); return m ? +m[1] : NaN; };
  let b;
  while ((b = block.exec(text))) {
    const src = b[0], lat = num(src, "lat"), lon = num(src, "long");
    if (!isFinite(lat) || !isFinite(lon)) continue;
    const mk = src.match(/\bmark\s*=\s*(?:"([^"]+)"|'([^']+)'|(?:\w+\.)?(\w+))/);
    if (!mk) continue;
    const c = colourOf(mk[1] || mk[2] || names[mk[3]] || "");
    if (!c) continue;
    const label = (src.match(/\blabel\s*=\s*["']\[*([^\]|"']+)/) || [])[1] || "";
    found.push([+lat.toFixed(4), +lon.toFixed(4), c, label.trim()]);
  }
  return found;
}

mkdirSync(out, { recursive: true });
const now = new Date();
for (const war of WARS) {
  if (only.length && !only.includes(war.key)) continue;
  const months = [];
  for (let y = +war.from.slice(0, 4), mo = +war.from.slice(5); y < now.getUTCFullYear() || (y === now.getUTCFullYear() && mo <= now.getUTCMonth() + 1); mo === 12 ? (y++, (mo = 1)) : mo++) months.push(y + "-" + String(mo).padStart(2, "0"));
  const towns = new Map(), list = [], deltas = [], legends = {}, revisions = {};
  let prev = new Map();
  for (const month of months) {
    const stamp = month + "-15T00:00:00Z";
    let names = {};
    for (const t of war.marks) { const r = await revisionAt(t, stamp); if (r) names = { ...names, ...shortcuts(r.text) }; }
    const cur = new Map(), revs = [], texts = [];
    let leg = {};
    for (const t of war.modules) {
      const r = await revisionAt(t, stamp);
      if (!r) continue;
      revs.push([t, r.id, r.at]);
      texts.push(r.text);
      names = { ...names, ...shortcuts(r.text) };
      leg = { ...legend(r.text), ...leg };
    }
    for (const text of texts) {
      for (const [lat, lon, c, label] of marks(text, names)) {
        const k = lat.toFixed(3) + "," + lon.toFixed(3);
        if (!towns.has(k)) { towns.set(k, list.length); list.push([lat, lon, label]); }
        cur.set(towns.get(k), c);
      }
    }
    const d = [];
    for (const [i, c] of cur) if (prev.get(i) !== c) d.push(i + ":" + c);
    for (const i of prev.keys()) if (!cur.has(i)) d.push(i + ":-");
    deltas.push([month, d.join(",")]);
    legends[month] = leg;
    revisions[month] = revs;
    prev = cur;
    console.log(war.key + " " + month + ": " + cur.size + " places, " + d.length + " changes");
  }
  const file = resolve(out, war.key + "-towns.json");
  writeFileSync(file, JSON.stringify({ source: "English Wikipedia, " + war.modules.join(", ") + " (CC BY-SA 4.0), one revision a month, the last before the 15th", fetched: now.toISOString().slice(0, 10), towns: list, deltas, legends, revisions }));
  console.log("wrote " + file + ": " + list.length + " places over " + months.length + " months");
}
