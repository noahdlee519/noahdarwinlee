// Builds chroniaatlas.com/places/: a page for each state, people, city, and province that has notes, with all its notes
// in order of date, each with a link that opens the atlas at that date with its card open, and an index of them all
// (28 November 2026, so the atlas's writing can be found and read by search engines as well as on the cards).
//
// The notes are the ones readers have had written on the cards (chronia-blurb), fetched from that function's export
// (GET ?export=1) a thousand at a time; or, for testing, read from the JSON file named by CHRONIA_NOTES (a list of
// { key, kind, subject, period, text, made }). Only notes in English are used: the others are the same notes written for
// readers of other languages. Where a subject has more than one note for a period (written with different neighbours),
// the latest is used.
//
// Called by tools/build-chronia-site.mjs, which adds the pages to the sitemap. On Vercel a failed fetch fails the build,
// so the site that is live keeps its pages; elsewhere the pages are left out with a warning.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const EXPORT = "https://jvcmeuqlyygpwelmvxuv.supabase.co/functions/v1/chronia-blurb?export=1";
const KIND = {
  state: { what: "A state or people on the map", group: "States and peoples", suffix: "" },
  city: { what: "A city on the map", group: "Cities", suffix: "-city" },
  division: { what: "A state, province, or territory within a country", group: "Provinces and territories", suffix: "-province" },
};

async function fetchNotes() {
  if (process.env.CHRONIA_NOTES) return JSON.parse(readFileSync(process.env.CHRONIA_NOTES, "utf8"));
  const all = [];
  let after = "";
  for (let page = 0; page < 1000; page++) {
    let j = null, last = null;
    for (let tries = 0; tries < 3 && !j; tries++) {
      try {
        const res = await fetch(EXPORT + (after ? "&after=" + encodeURIComponent(after) : ""));
        if (!res.ok) throw new Error("export " + res.status);
        j = await res.json();
      } catch (e) {
        last = e;
        await new Promise((r) => setTimeout(r, 1500 * (tries + 1)));
      }
    }
    if (!j) throw last;
    all.push(...j.notes);
    if (!j.next) break;
    after = j.next;
  }
  return all;
}

// English, told by its commonest words: the other languages' notes have few or none of them.
export function english(text) {
  const m = String(text).match(/\b(the|of|and|was|its|were|with)\b/g);
  return !!m && m.length >= 6 && /^[\x00-\x7f -ɏ‐-‧̀-ͯ]*$/.test(text);
}

// The years a period covers, from its name: "1940", "the 1810s", "from 1025 to 1049", "from 3200 to 3101 BC",
// "from AD 950 to 999", "500 BC".
export function years(period) {
  const p = String(period);
  let m = /^the (\d{4})s$/.exec(p);
  if (m) return [+m[1], +m[1] + 9];
  m = /^from (AD )?(\d+) to (\d+)( BC)?$/.exec(p);
  if (m) return m[4] ? [-m[2], -m[3]] : [+m[2], +m[3]];
  m = /^(\d+) BC$/.exec(p);
  if (m) return [-m[1], -m[1]];
  m = /^(AD )?(\d+)$/.exec(p);
  if (m) return [+m[2], +m[2]];
  return null;
}
const fmtYear = (y) => (y < 0 ? -y + " BC" : y < 1000 ? "AD " + y : String(y));
// The year the map opens at: the middle of the period, kept to its years.
const mid = ([a, b]) => Math.round((a + b) / 2);

export function slugOf(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[ʼ’‘']/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "place";
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// What the place pages are made of: the subjects, each with its notes in order of date and a page address of its own.
export function gather(notes) {
  const bySubject = new Map();
  let kept = 0, other = 0;
  for (const n of notes) {
    if (!n || !KIND[n.kind] || typeof n.subject !== "string" || typeof n.text !== "string") continue;
    if (!english(n.text)) { other++; continue; }
    const y = years(n.period);
    if (!y) continue;
    const id = n.kind + "|" + n.subject;
    if (!bySubject.has(id)) bySubject.set(id, { kind: n.kind, name: n.subject, periods: new Map() });
    const s = bySubject.get(id), was = s.periods.get(n.period);
    if (!was || String(n.made) > String(was.made) || (n.made === was.made && n.key > was.key)) s.periods.set(n.period, { period: n.period, years: y, text: n.text, made: n.made || "" });
    kept++;
  }
  const subjects = [...bySubject.values()].map((s) => ({ kind: s.kind, name: s.name, notes: [...s.periods.values()].sort((a, b) => a.years[0] - b.years[0]) }));
  subjects.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.kind.localeCompare(b.kind));
  // Addresses: the name's own where it is free, then with the kind's suffix, then numbered.
  const used = new Set();
  const order = [...subjects].sort((a, b) => (a.kind === "state" ? 0 : 1) - (b.kind === "state" ? 0 : 1));
  for (const s of order) {
    let base = slugOf(s.name), slug = base;
    if (used.has(slug)) slug = base + KIND[s.kind].suffix;
    for (let i = 2; used.has(slug); i++) slug = base + KIND[s.kind].suffix + "-" + i;
    used.add(slug);
    s.slug = slug;
  }
  return { subjects, kept, other };
}

function head({ title, description, path, extra = "" }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="script-src 'self'" />
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8179332869743841"
     crossorigin="anonymous"></script>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="CHRONIA" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="https://chroniaatlas.com${path}" />
    <meta property="og:image" content="https://chroniaatlas.com/og-chronia.jpg" />
    <link rel="canonical" href="https://chroniaatlas.com${path}" />
    <link rel="icon" href="/favicon.png" type="image/png" />
    <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="theme-color" content="#f1e7cf" />
    <link rel="preload" href="/fonts/im-fell-english-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="stylesheet" href="/fonts/fonts.css" />
    <link rel="stylesheet" href="/page.css" />
    <link rel="stylesheet" href="/places/places.css" />
    <script src="/visit.js" defer></script>
    <script src="/va.js" defer></script>${extra}
  </head>`;
}

const FOOT = `<footer class="cp-foot"><a href="/">The atlas</a> | <a href="/places/">Places</a> | <a href="/team/">Team</a> | <a class="cp-faq" href="/faq/">FAQ</a> | <a href="/premium/">Premium</a> | <a href="/privacy/">Privacy</a> | <a href="/terms/">Terms</a></footer>`;

const CSS = `/* The place pages (tools/build-chronia-places.mjs), on the site's sheet (page.css). */
.pl-crumb { margin: 0 0 6px; font-size: 15px; color: var(--muted); }
.pl-crumb a { color: inherit; }
.pl-kind { margin: -4px 0 14px; color: var(--muted); font-size: 16px; font-style: italic; }
.pl-toc { display: flex; flex-wrap: wrap; gap: 4px 12px; margin: 0 0 18px; padding: 0; list-style: none; font-size: 15px; }
.pl-note h2 { margin-bottom: 6px; }
.pl-go { margin-top: 4px !important; font-size: 15px; }
.pl-about { margin-top: 26px !important; font-size: 14px; color: var(--muted); }
.pl-near { display: flex; justify-content: space-between; gap: 12px; margin: 18px 0 0; font-size: 15px; }
.pl-letters { display: flex; flex-wrap: wrap; gap: 4px 10px; margin: 0 0 14px; padding: 0; list-style: none; }
.pl-list { columns: 3 13em; column-gap: 24px; margin: 0 0 10px; padding: 0; list-style: none; font-size: 16px; }
.pl-list li { break-inside: avoid; margin: 0 0 3px; }
.pl-list small { color: var(--muted); }
.pl-letter { margin: 16px 0 4px !important; font-size: 18px; }
`;

// The link into the atlas at a note's period: its middle year, with the card open (a province has no card of its own).
function mapLink(s, n) {
  const y = mid(n.years), q = "?y=" + y + (s.kind === "state" ? "&card=" + encodeURIComponent(s.name) : s.kind === "city" ? "&city=" + encodeURIComponent(s.name) : "");
  return { href: "/" + q, year: fmtYear(y) };
}

function placePage(s, prev, next) {
  const k = KIND[s.kind], first = s.notes[0], last = s.notes[s.notes.length - 1];
  const span = first === last ? cap(first.period) : cap(first.period) + " to " + last.period.replace(/^from /, "");
  const lead = s.notes[0].text.split(/(?<=[.!?])\s/)[0];
  const description = (s.name + " in history, " + (first === last ? first.period : "from " + first.period.replace(/^from /, "") + " to " + last.period.replace(/^from /, "")) + ": " + lead).slice(0, 300);
  const path = "/places/" + s.slug + "/";
  const toc = s.notes.length > 3 ? `\n      <ul class="pl-toc">${s.notes.map((n, i) => `<li><a href="#p${i + 1}">${esc(cap(n.period))}</a></li>`).join("")}</ul>` : "";
  const notes = s.notes.map((n, i) => {
    const go = mapLink(s, n);
    return `
      <section class="pl-note" id="p${i + 1}">
        <h2>${esc(cap(n.period))}</h2>
        <p>${esc(n.text)}</p>
        <p class="pl-go"><a href="${esc(go.href)}">${esc(s.kind === "division" ? "Open the atlas in " + go.year : "See " + s.name + " on the map in " + go.year)}</a></p>
      </section>`;
  }).join("");
  const ld = JSON.stringify({ "@context": "https://schema.org", "@type": "Article", headline: s.name + " | CHRONIA", about: { "@type": s.kind === "city" ? "City" : "Place", name: s.name }, inLanguage: "en", isPartOf: { "@type": "WebSite", name: "CHRONIA", url: "https://chroniaatlas.com/" }, url: "https://chroniaatlas.com" + path, dateModified: s.notes.map((n) => n.made).sort().pop() || undefined }).replace(/</g, "\\u003c");
  return head({ title: s.name + " in history | CHRONIA", description, path, extra: `\n    <script type="application/ld+json">${ld}</script>` }) + `
  <body class="cp pl">
    <header class="cp-top"><a class="cp-mark cp-frame" href="/" aria-label="CHRONIA, back to the atlas">CHRONIA</a></header>
    <main class="cp-sheet cp-frame">
      <p class="pl-crumb"><a href="/places/">Places</a> | ${esc(k.group)}</p>
      <h1>${esc(s.name)}</h1>
      <p class="pl-kind">${esc(k.what)} | ${esc(span)}</p>
      <p class="cp-lede">${s.notes.length === 1 ? "A note on " + esc(s.name) + " in " + esc(first.period) + ", from" : esc(String(s.notes.length)) + " notes on " + esc(s.name) + " through history, from"} <a href="/">CHRONIA</a>, an atlas of the world's borders from 3400 BC to today.</p>${toc}${notes}
      <p class="pl-about">Each note was written by a language model from the atlas's facts for its period (the borders, rulers, capitals, and neighbours its maps show), the first time a reader opened the card, and is kept as written. It can be wrong. If you find a mistake, report it from the card on the map; <a href="/faq/#notes">more about the notes</a>.</p>
      <nav class="pl-near" aria-label="Other places">${prev ? `<a href="/places/${prev.slug}/" rel="prev">&larr; ${esc(prev.name)}</a>` : "<span></span>"}${next ? `<a href="/places/${next.slug}/" rel="next">${esc(next.name)} &rarr;</a>` : "<span></span>"}</nav>
      ${FOOT}
    </main>
  </body>
</html>
`;
}

function indexPage(subjects) {
  const groups = Object.keys(KIND).map((kind) => ({ kind, list: subjects.filter((s) => s.kind === kind) })).filter((g) => g.list.length);
  const noteCount = subjects.reduce((t, s) => t + s.notes.length, 0);
  const body = groups.map((g) => {
    const letters = new Map();
    for (const s of g.list) {
      const L = slugOf(s.name).charAt(0).toUpperCase();
      const key = /[A-Z]/.test(L) ? L : "#";
      if (!letters.has(key)) letters.set(key, []);
      letters.get(key).push(s);
    }
    const id = g.kind === "state" ? "states" : g.kind === "city" ? "cities" : "provinces";
    return `
      <section id="${id}">
        <h2>${esc(KIND[g.kind].group)} <small>(${g.list.length})</small></h2>
        <ul class="pl-letters">${[...letters.keys()].map((L) => `<li><a href="#${id}-${L === "#" ? "0" : L}">${L}</a></li>`).join("")}</ul>${[...letters].map(([L, list]) => `
        <h3 class="pl-letter" id="${id}-${L === "#" ? "0" : L}">${L}</h3>
        <ul class="pl-list">${list.map((s) => `<li><a href="/places/${s.slug}/">${esc(s.name)}</a> <small>${esc(s.notes.length === 1 ? s.notes[0].period : s.notes.length + " periods")}</small></li>`).join("")}</ul>`).join("")}
      </section>`;
  }).join("");
  const description = "The states, peoples, cities, and provinces of CHRONIA, an atlas of the world's borders from 3400 BC to today, with notes on each through history.";
  return head({ title: "Places | CHRONIA", description, path: "/places/" }) + `
  <body class="cp pl">
    <header class="cp-top"><a class="cp-mark cp-frame" href="/" aria-label="CHRONIA, back to the atlas">CHRONIA</a></header>
    <main class="cp-sheet cp-frame">
      <h1>Places</h1>
      <p class="cp-lede">The states, peoples, cities, and provinces of <a href="/">CHRONIA</a>, with ${noteCount.toLocaleString("en")} notes on them through history, from 3400 BC to today. Each links back to the map at its date.</p>
      <ul class="pl-toc">${groups.map((g) => `<li><a href="#${g.kind === "state" ? "states" : g.kind === "city" ? "cities" : "provinces"}">${esc(KIND[g.kind].group)}</a></li>`).join("")}</ul>${body}
      <p class="pl-about">The notes are written by a language model from the atlas's facts, the first time a reader opens a card, and a place is listed here once it has one. <a href="/faq/#notes">More about the notes</a>.</p>
      ${FOOT}
    </main>
  </body>
</html>
`;
}

// Writes the pages into the site at `out` and gives their addresses (with the day each last changed) for the sitemap.
export async function buildPlaces(out) {
  let notes;
  try {
    notes = await fetchNotes();
  } catch (e) {
    if (process.env.VERCEL) throw new Error("the notes could not be fetched for /places/: " + (e && e.message));
    console.warn("places: the notes could not be fetched (" + (e && e.message) + "), so /places/ is left out");
    return [];
  }
  const { subjects, kept, other } = gather(notes);
  if (!subjects.length) {
    if (process.env.VERCEL) throw new Error("no notes for /places/");
    return [];
  }
  const dir = join(out, "places");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "places.css"), CSS);
  writeFileSync(join(dir, "index.html"), indexPage(subjects));
  // Next and previous go through the places in the index's order, within each kind.
  const urls = [{ path: "/places/", lastmod: subjects.flatMap((s) => s.notes.map((n) => n.made)).sort().pop() }];
  for (const kind of Object.keys(KIND)) {
    const list = subjects.filter((s) => s.kind === kind);
    list.forEach((s, i) => {
      mkdirSync(join(dir, s.slug), { recursive: true });
      writeFileSync(join(dir, s.slug, "index.html"), placePage(s, list[i - 1], list[i + 1]));
      urls.push({ path: "/places/" + s.slug + "/", lastmod: s.notes.map((n) => n.made).sort().pop() });
    });
  }
  console.log("places: " + subjects.length + " pages from " + kept + " notes in English (" + other + " in other languages left out)");
  return urls;
}
