// Australia's colonies from 1788 to 1885, for the dated maps, drawn as the law made them: each colony on Natural Earth's
// first-level units of Australia, cut along the meridians and parallels that the commissions, letters patent, and acts
// named as their borders, so the colonies share exact borders and cover the land the Crown claimed.
//
// ATOMS are the pieces the colonies are built from: a unit, or a unit cut by a box of longitude and latitude. COLONIES gives
// each colony its pieces from day to day, with the first and last day of each stretch. Every year is the state on 1 July,
// as elsewhere in the builder; a stretch that takes in no 1 July can't be drawn in the yearly data and is not listed.

export const AUSTRALIA_FROM = 1788, AUSTRALIA_TO = 1885;
export const AUSTRALIA_BOX = [112, -44.5, 154.5, -9];
export const AUSTRALIA_OLD = ["Australian colonies", "Northern Territory"];

// The 10°37′ S of Phillip's commission: the islands north of it (the Torres Strait) were outside New South Wales, and went
// to Queensland within sixty miles of its coast from 30 May 1872 and wholly from 21 July 1879.
const CAPE_YORK = -10.617, SIXTY_MILES_KM = 111.1;

// Each atom is a unit, kept inside (+) or outside (-) the regions listed, in turn. A region's edge never runs along a unit's
// own border, where clipping would leave the two sides with different points: Queensland east of 141° E is cut off by a
// line that runs from 141° E, 26° S south-west through South Australia, not down Queensland's border with it.
const box = (w, s, e, n) => [[w, s], [e, s], [e, n], [w, n], [w, s]];
const WEST_132 = box(100, -50, 132, 0), WEST_135 = box(100, -50, 135, 0);
const EAST_141 = [[141, -5], [141, -26], [139, -27], [139, -60], [180, -60], [180, -5], [141, -5]];
const NORTH_26 = box(140, -26, 180, -5);
const ATOMS = {
  WA: ["Western Australia", []],
  NTw: ["Northern Territory", [[WEST_135, +1]]],
  NTe: ["Northern Territory", [[WEST_135, -1]]],
  SAw: ["South Australia", [[WEST_132, +1]]],
  SAm: ["South Australia", [[WEST_135, +1], [WEST_132, -1]]],
  SAe: ["South Australia", [[WEST_135, -1]]],
  QLDw: ["Queensland", [[EAST_141, -1]]],
  QLDn: ["Queensland", [[EAST_141, +1], [NORTH_26, +1]]],
  QLDs: ["Queensland", [[EAST_141, +1], [NORTH_26, -1]]],
  TSi: ["Queensland", "inner"],
  TSo: ["Queensland", "outer"],
  NSW: ["New South Wales", []],
  ACT: ["Australian Capital Territory", []],
  JBT: ["Jervis Bay Territory", []],
  VIC: ["Victoria", []],
  TAS: ["Tasmania", []]
};

const NSW_CORE = ["NSW", "ACT", "JBT"];
const NORTH = ["NTw", "NTe", "QLDw", "QLDn"];
export const COLONIES = [
  // New South Wales: east of 135° E from Phillip's commission (proclaimed 7 February 1788), with Van Diemen's Land; to 129° E
  // under Darling's commission (16 July 1825), drawn from 3 December 1825, when Van Diemen's Land was made a colony of its own.
  ["New South Wales", "Colony of New South Wales", "1788-02-07", "1825-12-02", ["NTe", "SAe", "QLDw", "QLDn", "QLDs", ...NSW_CORE, "VIC", "TAS"]],
  ["New South Wales", "Colony of New South Wales", "1825-12-03", "1836-02-18", ["NTw", "NTe", "SAw", "SAm", "SAe", "QLDw", "QLDn", "QLDs", ...NSW_CORE, "VIC"]],
  ["New South Wales", "Colony of New South Wales", "1836-02-19", "1846-02-16", ["NTw", "NTe", "SAw", "QLDw", "QLDn", "QLDs", ...NSW_CORE, "VIC"]],
  ["New South Wales", "Colony of New South Wales", "1846-02-17", "1846-12-10", ["SAw", "QLDs", ...NSW_CORE, "VIC"]],
  ["New South Wales", "Colony of New South Wales", "1846-12-11", "1851-06-30", ["NTw", "NTe", "SAw", "QLDw", "QLDn", "QLDs", ...NSW_CORE, "VIC"]],
  ["New South Wales", "Colony of New South Wales", "1851-07-01", "1859-06-05", ["NTw", "NTe", "SAw", "QLDw", "QLDn", "QLDs", ...NSW_CORE]],
  ["New South Wales", "Colony of New South Wales", "1859-06-06", "1862-03-12", ["NTw", "NTe", "SAw", "QLDw", ...NSW_CORE]],
  ["New South Wales", "Colony of New South Wales", "1862-03-13", "1863-07-05", ["NTw", "NTe", ...NSW_CORE]],
  ["New South Wales", "Colony of New South Wales", "1863-07-06", "1885-12-31", NSW_CORE],
  ["Van Diemen's Land", "Van Diemen's Land", "1825-12-03", "1855-12-31", ["TAS"]],
  ["Tasmania", "Colony of Tasmania", "1856-01-01", "1885-12-31", ["TAS"]],
  // Fremantle's possession of 2 May 1829 of all New Holland outside New South Wales; renamed on 6 February 1832.
  ["Swan River Colony", "Swan River Colony", "1829-05-02", "1832-02-05", ["WA"]],
  ["Western Australia", "Swan River Colony", "1832-02-06", "1885-12-31", ["WA"]],
  // South Australia between 132° and 141° E south of 26° S (letters patent of 19 February 1836); west to 129° E (letters
  // patent of 10 October 1861), drawn from 13 March 1862 with Queensland's change; the Northern Territory from 6 July 1863.
  ["South Australia", "Colony of South Australia", "1836-02-19", "1862-03-12", ["SAm", "SAe"]],
  ["South Australia", "Colony of South Australia", "1862-03-13", "1863-07-05", ["SAw", "SAm", "SAe"]],
  ["South Australia", "Colony of South Australia", "1863-07-06", "1885-12-31", ["SAw", "SAm", "SAe", "NTw", "NTe"]],
  // North Australia, New South Wales north of 26° S, from its letters patent of 17 February 1846 to their revocation of
  // 11 December 1846.
  ["North Australia", "North Australia", "1846-02-17", "1846-12-10", NORTH],
  ["Victoria", "Colony of Victoria", "1851-07-01", "1885-12-31", ["VIC"]],
  // Queensland east of 141° E (6 June 1859), to 138° E (13 March 1862), with the Torres Strait's islands within sixty miles
  // of its coast (30 May 1872) and the rest (21 July 1879).
  ["Queensland", "Colony of Queensland", "1859-06-06", "1862-03-12", ["QLDn", "QLDs"]],
  ["Queensland", "Colony of Queensland", "1862-03-13", "1872-05-29", ["QLDw", "QLDn", "QLDs"]],
  ["Queensland", "Colony of Queensland", "1872-05-30", "1879-07-20", ["QLDw", "QLDn", "QLDs", "TSi"]],
  ["Queensland", "Colony of Queensland", "1879-07-21", "1885-12-31", ["QLDw", "QLDn", "QLDs", "TSi", "TSo"]]
];

const yearOn = (iso, after) => { const y = +iso.slice(0, 4); return after ? (iso.slice(5) <= "07-01" ? y : y + 1) : (iso.slice(5) >= "07-01" ? y : y - 1); };

// The colonies' spans: [{ name, wiki, first, last, from, to, polys }], `from` and `to` the first and last day (ISO), and the
// land of every year (`mask`, [[first, last, polys]]). h: { neAll, clip, rewind, polysOf, tryClip, unionSafe, polyKm2 }.
export function buildAustralia(h) {
  const { neAll, clip, rewind, polysOf, tryClip, unionSafe } = h;
  const unit = (name) => {
    const fs = neAll.filter((f) => f.properties.adm0_a3 === "AUS" && f.properties.name === name);
    if (fs.length !== 1) throw new Error("australia: Natural Earth has " + fs.length + " units named " + name);
    return rewind(polysOf(fs[0].geometry));
  };
  const centre = (p) => { let x = 0, y = 0; for (const v of p[0]) { x += v[0]; y += v[1]; } return [x / p[0].length, y / p[0].length]; };
  const qld = unit("Queensland");
  const main = qld.reduce((a, p) => (!a || h.polyKm2(p) > h.polyKm2(a) ? p : a), null);
  const strait = qld.filter((p) => p !== main && centre(p)[1] > CAPE_YORK), mainland = qld.filter((p) => !strait.includes(p));
  const km = (a, b) => { const r = Math.PI / 180, x = (b[0] - a[0]) * r * Math.cos(((a[1] + b[1]) / 2) * r), y = (b[1] - a[1]) * r; return Math.hypot(x, y) * 6371; };
  const near = (p) => { const c = centre(p); let d = Infinity; for (const v of main[0]) if (v[1] > CAPE_YORK - 2) d = Math.min(d, km(c, v)); return d <= SIXTY_MILES_KM; };
  const atoms = {};
  for (const [k, [name, b]] of Object.entries(ATOMS)) {
    if (b === "inner") { atoms[k] = strait.filter(near); continue; }
    if (b === "outer") { atoms[k] = strait.filter((p) => !near(p)); continue; }
    let polys = name === "Queensland" ? mainland : unit(name);
    for (const [ring, sign] of b) polys = rewind(tryClip(sign > 0 ? clip.intersection : clip.difference, polys, [[ring]]) || []);
    atoms[k] = polys;
  }
  const join = (keys) => { const parts = keys.map((k) => atoms[k]).filter((p) => p.length); return parts.length > 1 ? unionSafe(parts[0], parts.slice(1)) : parts[0] || []; };
  const spans = COLONIES.map(([name, wiki, from, to, keys]) => ({ name, wiki, from, to, first: yearOn(from, true), last: yearOn(to, false), polys: join(keys) }))
    .filter((s) => s.first <= s.last);
  const cuts = new Set([AUSTRALIA_FROM, AUSTRALIA_TO + 1]);
  for (const s of spans) { cuts.add(s.first); cuts.add(s.last + 1); }
  const bounds = [...cuts].filter((y) => y >= AUSTRALIA_FROM && y <= AUSTRALIA_TO + 1).sort((a, b) => a - b), mask = [];
  for (let i = 0; i + 1 < bounds.length; i++) {
    const a = bounds[i], b = bounds[i + 1] - 1, live = spans.filter((s) => s.first <= a && a <= s.last).map((s) => s.polys);
    if (live.length) mask.push([a, b, live.length > 1 ? unionSafe(live[0], live.slice(1)) : live[0]]);
  }
  const land = join(Object.keys(ATOMS));
  return { spans, mask, land, atoms };
}
