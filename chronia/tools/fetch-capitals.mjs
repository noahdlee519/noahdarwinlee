import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const eras = JSON.parse(readFileSync(resolve(here, "../data/eras.json"), "utf8"));
const FROM = 1400, TO = 1885;
const sparql = async (query) => {
  const res = await fetch("https://query.wikidata.org/sparql", { method: "POST", body: new URLSearchParams({ query, format: "json" }), headers: { Accept: "application/sparql-results+json", "User-Agent": "CHRONIA capitals (noahdarwinlee.com)" } });
  return (await res.json()).results.bindings;
};
const id = (v) => v.split("/").pop();
const year = (t) => { const m = t && String(t).match(/^(-?\d+)/); return m ? parseInt(m[1], 10) : null; };

const titles = new Set();
for (const r of eras.polities) {
  const d = r[6];
  if (!d || d[1] < FROM || d[0] > TO || r[4]) continue;
  if (Array.isArray(r[3])) r[3].forEach((s) => titles.add(s[1]));
  else titles.add(r[3]);
}
const all = [...titles].sort(), qid = {};
for (let i = 0; i < all.length; i += 50) {
  const part = all.slice(i, i + 50);
  const url = "https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageprops&ppprop=wikibase_item&titles=" + encodeURIComponent(part.join("|"));
  const q = (await (await fetch(url)).json()).query;
  const norm = {}, red = {}, byTitle = {};
  (q.normalized || []).forEach((n) => { norm[n.from] = n.to; });
  (q.redirects || []).forEach((n) => { red[n.from] = n.to; });
  Object.values(q.pages || {}).forEach((p) => { if (p.pageprops && p.pageprops.wikibase_item) byTitle[p.title] = p.pageprops.wikibase_item; });
  for (const t of part) { let k = norm[t] || t; k = red[k] || k; if (byTitle[k]) qid[t] = byTitle[k]; }
}

const items = [...new Set(Object.values(qid))], rows = [];
for (let i = 0; i < items.length; i += 150) {
  const vals = items.slice(i, i + 150).map((x) => "wd:" + x).join(" ");
  (await sparql(`SELECT ?item ?cap ?capLabel ?coord ?start ?end ?rank WHERE {
 VALUES ?item { ${vals} }
 ?item p:P36 ?st. ?st ps:P36 ?cap; wikibase:rank ?rank. FILTER(?rank != wikibase:DeprecatedRank)
 OPTIONAL { ?st pqv:P580 ?sv. ?sv wikibase:timeValue ?start }
 OPTIONAL { ?st pqv:P582 ?ev. ?ev wikibase:timeValue ?end }
 OPTIONAL { ?cap wdt:P625 ?coord }
 SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`)).forEach((b) => rows.push({ item: id(b.item.value), cap: id(b.cap.value), label: b.capLabel && b.capLabel.value, coord: b.coord && b.coord.value, start: b.start && b.start.value, end: b.end && b.end.value, rank: id(b.rank.value).split("#").pop() }));
}

const capIds = [...new Set(rows.map((r) => r.cap).filter((c) => /^Q\d+$/.test(c)))], inception = {};
for (let i = 0; i < capIds.length; i += 200) {
  (await sparql(`SELECT ?c (MIN(?i) AS ?inc) WHERE { VALUES ?c { ${capIds.slice(i, i + 200).map((x) => "wd:" + x).join(" ")} } ?c wdt:P571 ?i FILTER(isLiteral(?i)) } GROUP BY ?c`))
    .forEach((b) => { const y = year(b.inc.value); if (y !== null) inception[id(b.c.value)] = y; });
}
const dissolved = new Set();
for (let i = 0; i < items.length; i += 200) {
  (await sparql(`SELECT DISTINCT ?c WHERE { VALUES ?c { ${items.slice(i, i + 200).map((x) => "wd:" + x).join(" ")} } ?c wdt:P576 ?d }`)).forEach((b) => dissolved.add(id(b.c.value)));
}

const since = {}, liveIds = items.filter((k) => !dissolved.has(k));
for (let i = 0; i < liveIds.length; i += 200) {
  (await sparql(`SELECT ?c (MIN(?i) AS ?inc) WHERE { VALUES ?c { ${liveIds.slice(i, i + 200).map((x) => "wd:" + x).join(" ")} } ?c wdt:P571 ?i FILTER(isLiteral(?i)) } GROUP BY ?c`))
    .forEach((b) => { const y = year(b.inc.value); if (y !== null) since[id(b.c.value)] = y; });
}

const caps = {}, seen = new Set();
for (const r of rows) {
  if (!r.coord || !r.label || r.label.startsWith("http")) continue;
  const m = r.coord.match(/Point\(([-\d.eE]+) ([-\d.eE]+)\)/);
  if (!m) continue;
  const row = [r.label, +(+m[1]).toFixed(3), +(+m[2]).toFixed(3), year(r.start), year(r.end), r.rank === "PreferredRank" ? 1 : 0, inception[r.cap] ?? null];
  const k = r.item + "|" + r.cap + "|" + row[3] + "|" + row[4];
  if (seen.has(k)) continue;
  seen.add(k);
  (caps[r.item] = caps[r.item] || []).push(row);
}
const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
Object.values(caps).forEach((c) => c.sort((a, b) => (a[3] ?? -1e9) - (b[3] ?? -1e9) || (a[4] ?? 1e9) - (b[4] ?? 1e9) || byName(a[0], b[0])));
const used = Object.keys(caps).sort(byName);
const out = { titles: {}, live: used.filter((k) => !dissolved.has(k)), since: {}, caps: {} };
out.live.filter((k) => since[k] !== undefined).sort(byName).forEach((k) => { out.since[k] = since[k]; });
Object.keys(qid).sort(byName).forEach((t) => { if (caps[qid[t]]) out.titles[t] = qid[t]; });
used.forEach((k) => { out.caps[k] = caps[k]; });
const J = (x) => JSON.stringify(x);
const lines = ["{", '"titles": {'];
const t = Object.entries(out.titles), c = Object.entries(out.caps);
t.forEach(([k, v], i) => lines.push(J(k) + ": " + J(v) + (i < t.length - 1 ? "," : "")));
lines.push("},", '"live": ' + J(out.live) + ",", '"since": ' + J(out.since) + ",", '"caps": {');
c.forEach(([k, v], i) => lines.push(J(k) + ": " + J(v) + (i < c.length - 1 ? "," : "")));
lines.push("}", "}");
writeFileSync(resolve(here, "capitals-wikidata.json"), lines.join("\n") + "\n");
console.log(t.length + " titles, " + c.length + " polities with capitals");
