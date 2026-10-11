import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const gc = resolve(here, "../../greatercircle/data");
const cities = JSON.parse(readFileSync(resolve(gc, "cities.json"), "utf8"));
const places = JSON.parse(readFileSync(resolve(gc, "places.json"), "utf8"));
const EXTRA = +(process.argv[2] || 500);
const EXTRA2 = +(process.argv[3] || 2000);
const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’‘']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const ALIAS = { "washington d c": "washington", "new delhi": "delhi", "nur sultan": "astana", "naypyidaw": "naypyidaw" };
const capitals = places.rows.filter((r) => r[0] === 0 && r[7]).map((r) => ({ cc: r[2], name: ALIAS[fold(r[7])] || fold(r[7]), lon: r[3], lat: r[4] }));
const km = (a, b) => {
  const r = Math.PI / 180, dl = (b.lon - a.lon) * r, p1 = a.lat * r, p2 = b.lat * r;
  const h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
};
const near = (a, b) => km(a, b) < 28;
const out = cities.map(([name, cc, lon, lat, tier]) => {
  const isCapital = capitals.some((k) => k.cc === cc && (k.name === fold(name) || near(k, { lon, lat })));
  return [name, +lon.toFixed(4), +lat.toFixed(4), tier, isCapital ? 1 : 0];
});

const SKIP = new Set(["al mawsil al jadidah|IQ", "budta|PH", "takeo|KH", "malingao|PH", "pasragad branch|IR", "kahriz|IR",
  "kyain seikgyi township|MM", "nowrangapur|IN", "teni|IN", "battagram|PK", "kotli|PK", "situbondo|ID", "guankou|CN", "shibganj|BD",
  "winejok|SS"]);
const RENAME = { "nizhniy novgorod": "Nizhny Novgorod", "rostov na donu": "Rostov-on-Don", "al hudaydah": "Hodeidah", "taizz": "Taiz",
  "tai an": "Tai'an", "fes": "Fez", "as sulaymaniyah": "Sulaymaniyah", "arbil": "Erbil", "al mawsil": "Mosul", "an najaf": "Najaf",
  "halab": "Aleppo", "hims": "Homs", "hamah": "Hama", "al ladhiqiyah": "Latakia", "al iskandariyah": "Alexandria", "bur said": "Port Said",
  "as suways": "Suez", "al mansurah": "Mansoura", "ad dammam": "Dammam", "al madinah al munawwarah": "Medina", "makkah al mukarramah": "Mecca",
  "taif": "Taif", "at taif": "Taif", "al hufuf": "Hofuf", "bandar e abbas": "Bandar Abbas", "esfahan": "Isfahan", "orumiyeh": "Urmia",
  "arak": "Arak", "ardabil": "Ardabil", "ar raqqah": "Raqqa", "dayr az zawr": "Deir ez-Zor", "az zarqa": "Zarqa", "al amarah": "Amarah",
  "ad diwaniyah": "Diwaniyah", "al kut": "Kut", "al fayyum": "Faiyum", "al mahallah al kubra": "El Mahalla el Kubra", "al qadarif": "Gedaref",
  "az zawiyah": "Zawiya", "al khums": "Khoms", "misratah": "Misrata", "salalah": "Salalah", "kandahar": "Kandahar",
  "mazar e sharif": "Mazar-i-Sharif", "herat": "Herat", "jalalabad": "Jalalabad", "ludhiana": "Ludhiana", "rajkot": "Rajkot",
  "allahabad": "Prayagraj", "solapur": "Solapur", "muzaffarabad": "Muzaffarabad", "coxs bazar": "Cox's Bazar", "tolyatti": "Tolyatti", "asyut": "Asyut", "hamadan": "Hamadan", "birganj": "Birgunj",
  "nazret": "Adama", "mekele": "Mekelle", "iasi": "Iași", "constanta": "Constanța", "galati": "Galați", "timisoara": "Timișoara",
  "brasov": "Brașov", "balti": "Bălți", "patra": "Patras", "larisa": "Larissa", "arhus": "Aarhus", "gent": "Ghent",
  "ras al khaimah city": "Ras Al Khaimah", "bacolod city": "Bacolod", "hualien city": "Hualien", "jeju city": "Jeju",
  "angeles city": "Angeles", "city of balikpapan": "Balikpapan", "oujda angad": "Oujda", "santiago de queretaro": "Querétaro",
  "acapulco de juarez": "Acapulco", "tuxtla": "Tuxtla Gutiérrez", "okap": "Cap-Haïtien", "homyel": "Gomel", "mahilyow": "Mogilev",
  "hrodna": "Grodno", "babruysk": "Bobruisk", "sunchon": "Sunchon", "kaesong": "Kaesong", "wonsan": "Wonsan", "sinuiju": "Sinuiju",
  "sariwon": "Sariwon", "ho chi minh city": "Ho Chi Minh City", "thanh pho ho chi minh": "Ho Chi Minh City", "hai phong": "Haiphong" };
const DEPENDENT = new Set("AI AQ AS AW AX BL BM BQ BV CC CK CW CX EH FK FO GF GG GI GL GP GS GU HM IM IO JE KY MF MP MQ MS NC NF NU PF PM PN RE SH SJ SX TC TF TK UM VG VI WF YT".split(" "));
const counts = new Map();
const taken = out.map((r) => ({ lon: r[1], lat: r[2] }));
for (const [, cc] of cities) counts.set(cc, (counts.get(cc) || 0) + 1);
const cand = places.rows.filter((r) => r[0] === 1 && (r[5] || 0) >= 60000 && !DEPENDENT.has(r[2]) && !SKIP.has(fold(r[1]) + "|" + r[2]));
const GRID = 1;
const grid = new Map();
const key = (lon, lat) => Math.floor(lon / GRID) + "," + Math.floor(lat / GRID);
const addTaken = (p) => { const k = key(p.lon, p.lat); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(p); };
taken.forEach(addTaken);
const crowded = (p, minKm) => {
  const gx = Math.floor(p.lon / GRID), gy = Math.floor(p.lat / GRID);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    const list = grid.get((gx + dx) + "," + (gy + dy));
    if (list && list.some((q) => km(p, q) < minKm)) return true;
  }
  return false;
};
const MIN_KM = 45;
const used = new Set();
const added = [];
while (added.length < EXTRA) {
  let best = -1, bestScore = 0;
  for (let i = 0; i < cand.length; i++) {
    if (used.has(i)) continue;
    const r = cand[i];
    const s = r[5] / Math.pow((counts.get(r[2]) || 0) + 1, 0.85);
    if (s > bestScore) { bestScore = s; best = i; }
  }
  if (best < 0) break;
  used.add(best);
  const r = cand[best];
  const p = { lon: r[3], lat: r[4] };
  if (crowded(p, MIN_KM)) continue;
  const name = RENAME[fold(r[1])] || r[1];
  addTaken(p);
  counts.set(r[2], (counts.get(r[2]) || 0) + 1);
  added.push([name, +r[3].toFixed(4), +r[4].toFixed(4), r[5] >= 1000000 ? 3 : 4, 0, r[2], r[5]]);
}
const odd = /\d|township|district|branch|municipality|province|city of|\(|\)|\//i;
const PLAIN = new Set("AE SA IQ SY JO PS LB KW QA BH OM YE EG LY TN DZ MA SD IR AF PK IN BD NP LK MR KP KR TJ UZ TM".split(" "));
const LETTERS = { "ā": "a", "ī": "i", "ū": "u", "ē": "e", "ō": "o", "Ā": "A", "Ī": "I", "Ū": "U", "Ē": "E", "Ō": "O", "ḩ": "h", "ḥ": "h", "Ḩ": "H", "Ḥ": "H",
  "ṭ": "t", "Ṭ": "T", "ẕ": "z", "ẓ": "z", "Ẕ": "Z", "Ẓ": "Z", "ḑ": "d", "ḍ": "d", "Ḑ": "D", "Ḍ": "D", "ṣ": "s", "Ṣ": "S", "ţ": "t", "Ţ": "T", "ş": "sh", "Ş": "Sh", "ẖ": "h", "ğ": "gh", "ň": "n", "ẗ": "t", "ŭ": "u", "Ŭ": "U" };
const TOWN_NAME = { "Irákleion": "Heraklion", "Nabatîyé et Tahta": "Nabatieh" };
const tidy = (name, cc) => {
  let n = name;
  if (cc === "CN") {
    const m = /^(.+?) Shi (.+?) Qu$/.exec(n);
    if (m) n = m[2];
    n = n.replace(/ (Shi|Qu|Xian|Zhen)$/, "");
  }
  if (cc === "KR" || cc === "KP") n = n.replace(/-(si|gun|dong|eup)$/i, "");
  if (cc === "TW" || cc === "KR" || cc === "CN" || cc === "PH") n = n.replace(/ City$/, "");
  if (TOWN_NAME[n]) return TOWN_NAME[n];
  if (cc === "VN") n = n.replace(/^(Thị Xã|Thành Phố|Thị Trấn) /, "");
  if (cc === "RU" || cc === "UA" || cc === "BY" || cc === "KZ") n = n.replace(/[’ʼ]/g, "");
  if (cc === "JP") n = n.replace(/[ōūŌŪ]/g, (ch) => LETTERS[ch]);
  if (PLAIN.has(cc)) n = n.replace(/[‘’ʻʼ`]/g, "").replace(/[āīūēōĀĪŪĒŌḩḥḨḤṭṬẕẓẔẒḑḍḐḌṣṢţŢşŞẖğňẗŭŬ]/g, (ch) => LETTERS[ch]);
  return n.replace(/^(\p{Ll})/u, (m) => m.toUpperCase());
};
const cand2 = places.rows.filter((r) => r[0] === 1 && (r[5] || 0) >= 15000 && !DEPENDENT.has(r[2]) && !SKIP.has(fold(r[1]) + "|" + r[2]) && !odd.test(r[1]));
const used2 = new Set(), first = added.length;
const MIN_KM2 = 20;
while (added.length < first + EXTRA2) {
  let best = -1, bestScore = 0;
  for (let i = 0; i < cand2.length; i++) {
    if (used2.has(i)) continue;
    const r = cand2[i];
    const s = r[5] / Math.pow((counts.get(r[2]) || 0) + 1, 0.85);
    if (s > bestScore) { bestScore = s; best = i; }
  }
  if (best < 0) break;
  used2.add(best);
  const r = cand2[best];
  const p = { lon: r[3], lat: r[4] };
  if (crowded(p, MIN_KM2)) continue;
  const name = RENAME[fold(r[1])] || tidy(r[1], r[2]);
  addTaken(p);
  counts.set(r[2], (counts.get(r[2]) || 0) + 1);
  added.push([name, +r[3].toFixed(4), +r[4].toFixed(4), r[5] >= 1000000 ? 3 : 4, 0, r[2], r[5]]);
}
const all = out.concat(added.map((r) => r.slice(0, 5)));
writeFileSync(resolve(here, "../data/cities.json"), JSON.stringify(all));
const byCc = {};
added.forEach((r) => { byCc[r[5]] = (byCc[r[5]] || 0) + 1; });
console.log("cities.json:", all.length, "cities,", all.filter((c) => c[4]).length, "capitals;", added.length, "added, smallest", Math.min(...added.map((r) => r[6])));
console.log(Object.entries(byCc).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([c, n]) => c + " " + n).join(", "));
if (process.argv[4] === "list") added.slice(first).forEach((r) => console.log(r[5], r[0], r[6]));
