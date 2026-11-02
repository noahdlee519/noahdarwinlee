import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const eras = JSON.parse(readFileSync(resolve(here, "../data/eras.json"), "utf8"));

const sparql = async (query) => {
  const res = await fetch("https://query.wikidata.org/sparql", { method: "POST", body: new URLSearchParams({ query, format: "json" }), headers: { Accept: "application/sparql-results+json", "User-Agent": "CHRONIA capitals (noahdarwinlee.com)" } });
  return (await res.json()).results.bindings;
};
const id = (v) => v.split("/").pop();
const year = (t) => { const m = t && String(t).match(/^(-?\d+)/); return m ? parseInt(m[1], 10) : null; };

const titles = new Set();
for (const r of eras.polities) {
  if (r[4]) continue;
  if (Array.isArray(r[3])) r[3].forEach((s) => titles.add(s[1]));
  else if (r[3]) titles.add(r[3]);
}
const all = [...titles].filter((t) => t && t !== "?").sort(), qid = {}, resolved = {};
for (let i = 0; i < all.length; i += 50) {
  const part = all.slice(i, i + 50);
  const url = "https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageprops&ppprop=wikibase_item&titles=" + encodeURIComponent(part.join("|"));
  const q = (await (await fetch(url)).json()).query;
  const norm = {}, red = {}, byTitle = {};
  (q.normalized || []).forEach((n) => { norm[n.from] = n.to; });
  (q.redirects || []).forEach((n) => { red[n.from] = n.to; });
  Object.values(q.pages || {}).forEach((p) => { if (p.pageprops && p.pageprops.wikibase_item) byTitle[p.title] = p.pageprops.wikibase_item; });
  for (const t of part) { let k = norm[t] || t; k = red[k] || k; if (Object.values(q.pages || {}).some((p) => p.title === k && p.missing === undefined)) resolved[t] = k; if (byTitle[k]) qid[t] = byTitle[k]; }
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
// Wikipedia's infobox capitals, for the states Wikidata has none for and to choose among undated ones: the links in the infobox's
// "capital" (or "seat") field, in order, each with the years written after it, if any, and whether it is marked ceremonial, a summer
// capital, or the like; and the coordinates of the linked pages.
const field = (txt, name) => { const m = new RegExp("\\n\\s*\\|\\s*" + name + "\\s*=([\\s\\S]*?)(?=\\n\\s*\\|\\s*[A-Za-z_0-9 ]+\\s*=|\\n\\}\\})").exec(txt); return m ? m[1].trim() : null; };
const clean = (s) => s.replace(/<ref[^>]*\/>/gi, "").replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "").replace(/<!--[\s\S]*?-->/g, "").replace(/\{\{\s*(?:circa|c\.|ca)\s*\|(?:[^{}|]*\|)*\s*([^{}|]*)\}\}/gi, "$1").replace(/&nbsp;/g, " ").replace(/\{\{\s*(?:nowrap|small)\s*\|([^{}]*)\}\}/gi, "$1");
const span = (seg) => {
  const m = /(\d{1,4})\s*(BCE?|AD|CE)?\s*[–\-—]\s*(?:AD\s*|CE\s*)?(\d{1,4})\s*(BCE?|AD|CE)?/.exec(seg);
  if (m) {
    let a = +m[1], b = +m[3];
    const ab = /BC/.test(m[2] || ""), bb = /BC/.test(m[4] || "");
    if (bb) { b = -b; if (!m[2]) a = -a; }
    if (ab) a = -a;
    if (a > b && a > 0 && b > 0 && String(b).length < String(a).length) b = +(String(a).slice(0, String(a).length - String(b).length) + String(b));
    return [a, b];
  }
  const f = /(?:after|from|since)\s+(\d{1,4})\s*(BCE?)?/i.exec(seg);
  if (f) return [f[2] ? -f[1] : +f[1], null];
  const u = /(?:until|to|before)\s+(\d{1,4})\s*(BCE?)?/i.exec(seg);
  if (u) return [null, u[2] ? -u[1] : +u[1]];
  return [null, null];
};
const pages = [...new Set(Object.values(resolved))].sort(), boxes = {};
for (let i = 0; i < pages.length; i += 20) {
  const r = await (await fetch("https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=revisions&rvprop=content&rvslots=main&rvsection=0&titles=" + encodeURIComponent(pages.slice(i, i + 20).join("|")))).json();
  for (const p of (r.query && r.query.pages) || []) {
    if (!p.revisions) continue;
    const txt = p.revisions[0].slots.main.content;
    let v = field(txt, "capital"), seat = 0;
    if (!v || !/\[\[/.test(v)) { const s = field(txt, "seat") || field(txt, "capital_city"); if (s) { v = s; seat = 1; } }
    if (!v) continue;
    v = clean(v);
    const links = [], re = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g;
    let m, last = null;
    while ((m = re.exec(v))) { if (last) last.after = v.slice(last.end, m.index); last = { target: m[1].trim(), text: (m[2] || m[1]).trim(), end: re.lastIndex }; links.push(last); }
    if (last) last.after = v.slice(last.end);
    const items = links.filter((l) => !/^(File|Image|Category|wikt|:)/i.test(l.target)).map((l) => {
      const seg = (l.after || "").split(/<br\s*\/?>|\n|\|\s*\[\[/i)[0], y = span(seg);
      return [l.text.replace(/\s*\([^)]*\)$/, ""), l.target, y[0], y[1], /ceremonial|religious|summer|winter|exile|de facto|administrative/i.test(seg) ? 1 : 0, seat];
    });
    if (items.length) boxes[p.title] = items;
  }
}
const targets = [...new Set(Object.values(boxes).flatMap((b) => b.map((x) => x[1])))], coords = {};
for (let i = 0; i < targets.length; i += 50) {
  const part = targets.slice(i, i + 50), norm = {}, red = {}, at = {};
  let cont = {};
  do {
    const j = await (await fetch("https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=coordinates&coprimary=primary&colimit=max&titles=" + encodeURIComponent(part.join("|")) + Object.entries(cont).map(([k, v]) => "&" + k + "=" + encodeURIComponent(v)).join(""))).json(), q = j.query || {};
    (q.normalized || []).forEach((n) => { norm[n.from] = n.to; });
    (q.redirects || []).forEach((n) => { red[n.from] = n.to; });
    (q.pages || []).forEach((p) => { if (p.coordinates && p.coordinates[0]) at[p.title] = [+p.coordinates[0].lon.toFixed(3), +p.coordinates[0].lat.toFixed(3)]; });
    cont = j.continue || null;
  } while (cont);
  for (const t of part) { let k = norm[t] || t; k = red[k] || k; if (at[k]) coords[t] = at[k]; }
}
const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
Object.values(caps).forEach((c) => c.sort((a, b) => (a[3] ?? -1e9) - (b[3] ?? -1e9) || (a[4] ?? 1e9) - (b[4] ?? 1e9) || byName(a[0], b[0])));
const used = Object.keys(caps).sort(byName);
const out = { titles: {}, live: used.filter((k) => !dissolved.has(k)), since: {}, caps: {}, infobox: {} };
all.forEach((t) => {
  const b = resolved[t] && boxes[resolved[t]];
  const rows = b ? b.filter((x) => coords[x[1]]).map((x) => [x[0], coords[x[1]][0], coords[x[1]][1], x[2], x[3], x[4], x[5]]) : [];
  if (rows.length) out.infobox[t] = rows;
});
out.live.filter((k) => since[k] !== undefined).sort(byName).forEach((k) => { out.since[k] = since[k]; });
Object.keys(qid).sort(byName).forEach((t) => { if (caps[qid[t]]) out.titles[t] = qid[t]; });
used.forEach((k) => { out.caps[k] = caps[k]; });
const J = (x) => JSON.stringify(x);
const lines = ["{", '"titles": {'];
const t = Object.entries(out.titles), c = Object.entries(out.caps);
t.forEach(([k, v], i) => lines.push(J(k) + ": " + J(v) + (i < t.length - 1 ? "," : "")));
lines.push("},", '"live": ' + J(out.live) + ",", '"since": ' + J(out.since) + ",", '"caps": {');
c.forEach(([k, v], i) => lines.push(J(k) + ": " + J(v) + (i < c.length - 1 ? "," : "")));
lines.push("},", '"infobox": {');
const ib = Object.entries(out.infobox);
ib.forEach(([k, v], i) => lines.push(J(k) + ": " + J(v) + (i < ib.length - 1 ? "," : "")));
lines.push("}", "}");
writeFileSync(resolve(here, "capitals-wikidata.json"), lines.join("\n") + "\n");
console.log(t.length + " titles, " + c.length + " polities with capitals, " + ib.length + " titles with infobox capitals");
