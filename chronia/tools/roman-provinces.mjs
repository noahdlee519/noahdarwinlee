// Writes roman-provinces.json, the provinces build-eras.mjs cuts the Roman Empire (and, from 395, the Western and
// Eastern Roman Empires) into, from 27 BC to AD 476:
//   node tools/roman-provinces.mjs <node_modules> <AWMC clone>
// where the clone is of github.com/AWMC/geodata. Three periods, each from its own source:
//   1. 27 BC to AD 193: the units of the Digital Atlas of the Roman Empire's map of 117 (roman-dare.json), joined
//      where a province had not yet been split (Gallia Belgica with the two Germanies until 84, Illyricum until AD 8,
//      Moesia until 85, Pannonia until 102, and so on), each from the year it was made a province.
//   2. 117 to 292: the same, with Achaia and Epirus parted from 117, and from 194 Syria parted into Syria Coele and
//      Syria Phoenice, Arabia re-cut, Mesopotamia (198), and Osroene (214), along the Ancient World Mapping Center's
//      lines of the provinces of about AD 200.
//   3. 293 to 476: the provinces after Diocletian's reform (roman-late.mjs), cut out of the land along the Center's
//      lines of the provinces after Diocletian (drawn as they stood about 400, so a piece of a later province goes to
//      the province beside it it was taken from), with DARE's lines, and the Center's line between Achaia and Epirus
//      of about 200, added where the Center drew none. Where neither
//      draws a line between two provinces, they are one piece named for both ("Narbonensis Prima, Narbonensis
//      Secunda, and Viennensis"); the four provinces of Britain are "The Britains".
// The Center's lines are cut into pieces of land on a grid (partition.mjs) and smoothed back to about a kilometre.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { partition } from "./partition.mjs";
import { LATE } from "./roman-late.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const [modules, awmc] = process.argv.slice(2);
if (!modules || !awmc) { console.error("usage: node tools/roman-provinces.mjs <node_modules> <AWMC clone>"); process.exit(1); }
const req = createRequire(resolve(modules) + "/");
const clip = req("polygon-clipping");
const server = req("topojson-server"), simp = req("topojson-simplify"), client = req("topojson-client");

const dare = JSON.parse(readFileSync(resolve(here, "roman-dare.json"), "utf8")).units;
const shading = resolve(awmc, "Cultural-Data/political_shading");
const linesOf = (file) => JSON.parse(readFileSync(resolve(shading, file), "utf8")).features.map((f) =>
  f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.type === "MultiLineString" ? f.geometry.coordinates : []);
const L200 = linesOf("roman_empire_ce_200_provinces/roman_empire_ce_200_provinces.geojson");
const LDIO = linesOf("roman_empire_provinces post_diocletian/roman_empire_provinces post_diocletian.geojson");
const pick = (L, ids) => ids.flatMap((i) => L[i]).filter((l) => l.length > 1);

const unit = (n) => { if (!dare[n]) throw new Error("no DARE unit " + n); return dare[n].polys; };
const union = (...names) => names.length === 1 ? unit(names[0]) : clip.union(...names.map(unit));
const round = (polys) => polys.map((p) => p.map((r) => r.map(([x, y]) => [Math.round(x * 1e4) / 1e4, Math.round(y * 1e4) / 1e4])));
const out = [];
const add = (name, wiki, a, b, polys) => { if (polys && polys.length) out.push([name, wiki, a, b, round(polys)]); };
const W = (n) => dare[n].wiki;

// Faces of a partition, smoothed: the cells' stairs are taken out by Visvalingam's method on the shared arcs, so
// neighbours keep one line.
const smooth = (faces, res) => {
  const fc = { type: "FeatureCollection", features: faces.map((f, i) => ({ type: "Feature", id: i, properties: {}, geometry: { type: "MultiPolygon", coordinates: f.polys } })) };
  let topo = server.topology({ f: fc });
  topo = simp.presimplify(topo, simp.planarTriangleArea);
  topo = simp.simplify(topo, res * res * 3);
  return client.feature(topo, topo.objects.f).features.map((g) => g.geometry ? (g.geometry.type === "Polygon" ? [g.geometry.coordinates] : g.geometry.coordinates) : []);
};
const cut = (opts) => {
  const r = partition(opts);
  if (r.clash.length) console.log("  together: " + r.clash.join(" | "));
  const big = r.unnamed.filter((u) => u.cells >= 50);
  if (big.length) console.log("  left unnamed: " + big.map((u) => u.at.join(",") + " (" + u.cells + " cells)").join(", "));
  const named = r.faces.filter((f) => f.names.length);
  const polys = smooth(named, opts.res);
  return named.map((f, i) => ({ names: f.names, polys: polys[i] }));
};

// 1. Augustus to Commodus, from DARE's units.
const ITALY = ["Transpadana", "Liguria", "Venetia et Histria", "Aemilia", "Etruria", "Umbria", "Samnium", "Picenum", "Latium et Campania", "Lucania et Bruttii", "Apulia et Calabria"];
add("Italia", "Roman Italy", -27, -8, union(...ITALY));
for (const n of ITALY) add(n, W(n), -7, 292, unit(n));
for (const n of ["Hispania Tarraconensis", "Hispania Baetica", "Lusitania", "Gallia Narbonensis", "Gallia Aquitania", "Gallia Lugdunensis", "Sicilia", "Sardinia et Corsica", "Macedonia", "Asia", "Bithynia et Pontus", "Cyprus", "Aegyptus", "Creta et Cyrenaica"]) add(n, W(n), -27, 292, unit(n));
add("Gallia Belgica", W("Gallia Belgica"), -27, 84, union("Gallia Belgica", "Germania Inferior", "Germania Superior"));
for (const n of ["Gallia Belgica", "Germania Inferior", "Germania Superior"]) add(n, W(n), 85, 292, unit(n));
add("Alpes Maritimae", W("Alpes Maritimae"), -14, 292, unit("Alpes Maritimae"));
add("Alpes Cottiae", W("Alpes Cottiae"), -13, 292, unit("Alpes Cottiae"));
add("Raetia", W("Raetia"), -15, 46, union("Raetia", "Alpes Graiae et Poeninae"));
for (const n of ["Raetia", "Alpes Graiae et Poeninae"]) add(n, W(n), 47, 292, unit(n));
add("Noricum", W("Noricum"), -16, 292, unit("Noricum"));
add("Illyricum", "Illyricum (Roman province)", -27, 8, union("Dalmatia", "Pannonia Superior", "Pannonia Inferior"));
add("Dalmatia", W("Dalmatia"), 9, 292, unit("Dalmatia"));
add("Pannonia", "Pannonia", 9, 102, union("Pannonia Superior", "Pannonia Inferior"));
for (const n of ["Pannonia Superior", "Pannonia Inferior"]) add(n, W(n), 103, 292, unit(n));
add("Moesia", "Moesia", 6, 85, union("Moesia Superior", "Moesia Inferior"));
for (const n of ["Moesia Superior", "Moesia Inferior"]) add(n, W(n), 86, 292, unit(n));
add("Thracia", W("Thracia"), 46, 292, unit("Thracia"));
add("Achaia", W("Achaia"), -27, 116, unit("Achaia"));
add("Galatia", "Galatia (Roman province)", -25, 16, union("Galatia et Cappadocia", "Lycia et Pamphylia"));
add("Galatia and Cappadocia", "Galatia (Roman province)", 17, 42, union("Galatia et Cappadocia", "Lycia et Pamphylia"));
add("Galatia and Cappadocia", "Galatia (Roman province)", 43, 71, unit("Galatia et Cappadocia"));
add("Galatia et Cappadocia", W("Galatia et Cappadocia"), 72, 292, unit("Galatia et Cappadocia"));
add("Lycia et Pamphylia", W("Lycia et Pamphylia"), 43, 292, unit("Lycia et Pamphylia"));
add("Syria", W("Syria"), -27, 71, union("Syria", "Cilicia"));
add("Syria", W("Syria"), 72, 193, unit("Syria"));
add("Cilicia", W("Cilicia"), 72, 292, unit("Cilicia"));
add("Iudaea", W("Iudaea"), 6, 40, unit("Iudaea"));
add("Iudaea", W("Iudaea"), 44, 134, unit("Iudaea"));
add("Syria Palaestina", "Syria Palaestina", 135, 292, unit("Iudaea"));
add("Africa Proconsularis", W("Africa Proconsularis"), -27, 38, union("Africa Proconsularis", "Numidia"));
for (const n of ["Africa Proconsularis", "Numidia"]) add(n, W(n), 39, 292, unit(n));
for (const n of ["Mauretania Caesariensis", "Mauretania Tingitana"]) add(n, W(n), 42, 292, unit(n));
add("Britannia", W("Britannia"), 43, 292, unit("Britannia"));
add("Dacia", W("Dacia"), 106, 292, unit("Dacia"));
add("Arabia Petraea", W("Arabia Petraea"), 106, 193, unit("Arabia Petraea"));
add("Armenia et Mesopotamia", W("Armenia et Mesopotamia"), 114, 117, unit("Armenia et Mesopotamia"));

// 2. Achaia and Epirus from 117, and the Severan East, along the Center's lines of about AD 200.
console.log("Achaia and Epirus:");
for (const f of cut({ mask: unit("Achaia"), lines: pick(L200, [32, 43]), names: [["Achaia", 22.93, 37.9], ["Epirus", 20.74, 39.01]], box: [18.5, 34.5, 27, 41.5], res: 0.01, minCells: Infinity })) {
  const n = f.names[0];
  add(n, n === "Achaia" ? W("Achaia") : "Epirus (Roman province)", 117, 292, f.polys);
}
console.log("The Severan East:");
const SEVERAN = { "Syria Coele": ["Coele-Syria", 194, 36.16, 36.2], "Syria Phoenice": ["Phoenice (Roman province)", 194, 35.2, 33.27], "Arabia Petraea": [W("Arabia Petraea"), 194, 36.48, 32.52], "Mesopotamia": ["Mesopotamia (Roman province)", 198, 41.22, 37.07], "Osroene": ["Osroene", 214, 38.79, 37.16] };
for (const f of cut({ mask: clip.union(unit("Syria"), unit("Arabia Petraea"), unit("Armenia et Mesopotamia")), lines: pick(L200, [33, 25, 24, 18, 19, 34, 35]), names: Object.entries(SEVERAN).map(([n, v]) => [n, v[2], v[3]]), box: [33, 26, 46, 41.5], res: 0.01, minCells: 3000 })) {
  const n = f.names[0], [wiki, a] = SEVERAN[n];
  add(n, wiki, a, 292, f.polys);
}

// 3. After Diocletian, along the Center's lines and DARE's (outside Italy, whose regions the reform replaced).
console.log("After Diocletian:");
const BRITAIN = new Set(["Britannia Prima", "Britannia Secunda", "Maxima Caesariensis", "Flavia Caesariensis"]);
const wikiOf = Object.fromEntries(LATE.map(([n, w]) => [n, w]));
// The line between Achaia and Epirus is carried on 0.08° at each end, as the Achaia pass above does, so it meets the coast.
const reach = (l) => { const st = (p, q) => { const d = Math.hypot(p[0] - q[0], p[1] - q[1]) || 1; return [p[0] + (p[0] - q[0]) / d * 0.08, p[1] + (p[1] - q[1]) / d * 0.08]; }; return [st(l[0], l[1]), ...l, st(l[l.length - 1], l[l.length - 2])]; };
const lateLines = LDIO.flat().concat(pick(L200, [32, 43]).map(reach)).filter((l) => l.length > 1);
for (const [n, u] of Object.entries(dare)) if (!ITALY.includes(n)) for (const p of u.polys) for (const r of p) lateLines.push(r);
const both = (names) => names.length === 2 ? names.join(" and ") : names.slice(0, -1).join(", ") + ", and " + names[names.length - 1];
for (const f of cut({ mask: clip.union(...Object.values(dare).map((u) => u.polys)), lines: lateLines, names: LATE.map(([n, , x, y]) => [n, x, y]), box: [-11, 22, 50, 57], res: 0.02, ext: 0.02, minCells: Infinity })) {
  const names = f.names;
  const name = names.length > 1 && names.every((n) => BRITAIN.has(n)) ? "The Britains" : names.length > 1 ? both(names) : names[0];
  const wiki = name === "The Britains" ? "Diocese of the Britains" : wikiOf[names[0]];
  add(name, wiki, 293, 476, f.polys);
}

writeFileSync(resolve(here, "roman-provinces.json"), JSON.stringify({
  source: "Digital Atlas of the Roman Empire (DARE), Johan Åhlfeldt, through klokantech/roman-empire data/provinces.geojson, CC BY, for 27 BC to AD 292 (roman-dare.json); the Ancient World Mapping Center's boundary lines of the provinces of about AD 200 and after Diocletian (github.com/AWMC/geodata, Cultural-Data/political_shading), ODbL, for the Severan East from 117 and for 293 to 476; written by tools/roman-provinces.mjs",
  provinces: out
}));
console.log(out.length + " provinces, " + (JSON.stringify(out).length / 1e6).toFixed(1) + " MB");
