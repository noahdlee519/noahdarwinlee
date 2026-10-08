import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));

const T1 = `London GB, New York US, Hong Kong HK, Singapore SG, Shanghai CN, Beijing CN, Dubai AE, Paris FR, Tokyo JP,
Milan IT, Chicago US, Sydney AU, Los Angeles US, Toronto CA, Mumbai IN, Madrid ES, Frankfurt am Main DE, Amsterdam NL,
Kuala Lumpur MY, Seoul KR, Mexico City MX, São Paulo BR, Jakarta ID, Istanbul TR, Brussels BE, Taipei TW, Guangzhou CN,
Zürich CH, Buenos Aires AR, Warsaw PL, Bangkok TH, Moscow RU, Melbourne AU, Stockholm SE, Washington US, Johannesburg ZA,
Shenzhen CN, Dublin IE, Boston US, San Francisco US, Lisbon PT, Luxembourg LU, Prague CZ, Munich DE, Vienna AT, Manila PH,
Bengaluru IN, Santiago CL, Montreal CA, Riyadh SA, Bogotá CO, Dallas US, Houston US, Atlanta US, Miami US, Delhi IN,
Hamburg DE, Doha QA, Tel Aviv IL`;
const T2 = `Rome IT, Vancouver CA, Lima PE, Chengdu CN, Düsseldorf DE, Copenhagen DK, Oslo NO, Athens GR, Budapest HU,
Bucharest RO, Helsinki FI, Hangzhou CN, Nanjing CN, Tianjin CN, Ho Chi Minh City VN, Karachi PK, Cairo EG, Casablanca MA,
Lagos NG, Nairobi KE, Auckland NZ, Perth AU, Brisbane AU, Seattle US, Philadelphia US, Minneapolis US, Denver US, Calgary CA,
Barcelona ES, Manchester GB, Birmingham GB, Edinburgh GB, Lyon FR, Stuttgart DE, Berlin DE, Geneva CH, Kyiv UA, Abu Dhabi AE,
Hanoi VN, Chennai IN, Hyderabad IN, Kolkata IN, Pune IN, Bratislava SK, Sofia BG, Belgrade RS, Zagreb HR, Montevideo UY,
Caracas VE, Panama City PA, San José CR, Guatemala City GT, Santo Domingo DO, Kuwait City KW, Manama BH, Muscat OM, Amman JO,
Beirut LB, Jeddah SA, Osaka JP, Qingdao CN, Chongqing CN, Wuhan CN, Xi'an CN, Dalian CN, Shenyang CN, Suzhou CN, Xiamen CN,
Tehran IR, Ankara TR, Lahore PK, Dhaka BD, Colombo LK, Rio de Janeiro BR, Monterrey MX, Cape Town ZA, Accra GH, Addis Ababa ET,
Tunis TN, Rotterdam NL, Antwerp BE, Cologne DE, Turin IT, Porto PT, Glasgow GB, Gothenburg SE, Kraków PL, St. Petersburg RU,
Almaty KZ, Baku AZ, Tashkent UZ, Islamabad PK, Phnom Penh KH, Busan KR, Nagoya JP, Taichung TW, Macau MO, Honolulu US,
San Diego US, Phoenix US, Detroit US, St. Louis US, Charlotte US, Austin US, Portland US, Ottawa CA, Guadalajara MX,
Medellín CO, Quito EC, Brasília BR, Curitiba BR, Porto Alegre BR`;
const T3 = `Adelaide AU, Wellington NZ, Baltimore US, Cleveland US, Pittsburgh US, Tampa US, Orlando US, Kansas City US,
Indianapolis US, Columbus US, Cincinnati US, Nashville US, Milwaukee US, Salt Lake City US, Las Vegas US, Raleigh US,
Richmond US, Sacramento US, San Jose US, Edmonton CA, Winnipeg CA, Québec CA, Halifax CA, Belo Horizonte BR, Recife BR,
Salvador BR, Guayaquil EC, La Paz BO, Asunción PY, Cali CO, San Salvador SV, Tegucigalpa HN, Managua NI, Havana CU,
San Juan PR, Kingston JM, Port of Spain TT, Nassau BS, Bridgetown BB, Hamilton BM, The Hague NL, Nuremberg DE, Hannover DE,
Leipzig DE, Dresden DE, Bremen DE, Dortmund DE, Essen DE, Basel CH, Bern CH, Lausanne CH, Marseille FR, Toulouse FR, Nice FR,
Bordeaux FR, Lille FR, Strasbourg FR, Nantes FR, Bologna IT, Florence IT, Naples IT, Venice IT, Genoa IT, Valencia ES,
Seville ES, Bilbao ES, Málaga ES, Leeds GB, Bristol GB, Liverpool GB, Newcastle upon Tyne GB, Cardiff GB, Belfast GB,
Aberdeen GB, Southampton GB, Nottingham GB, Sheffield GB, Cork IE, Malmö SE, Bergen NO, Aarhus DK, Tallinn EE, Riga LV,
Vilnius LT, Wrocław PL, Poznań PL, Gdańsk PL, Katowice PL, Łódź PL, Brno CZ, Ljubljana SI, Sarajevo BA, Skopje MK, Tirana AL,
Podgorica ME, Chișinău MD, Minsk BY, Thessaloniki GR, Nicosia CY, Valletta MT, Reykjavík IS, Novosibirsk RU, Yekaterinburg RU,
Kazan RU, Vladivostok RU, Astana KZ, Tbilisi GE, Yerevan AM, Baghdad IQ, İzmir TR, Damascus SY, Kathmandu NP, Ahmedabad IN,
Yangon MM, Vientiane LA, Cebu City PH, Surabaya ID, Bandung ID, Medan ID, George Town MY, Johor Bahru MY, Kaohsiung TW,
Incheon KR, Fukuoka JP, Sapporo JP, Kobe JP, Kyoto JP, Yokohama JP, Ulaanbaatar MN, Dakar SN, Abidjan CI, Dar es Salaam TZ,
Kampala UG, Kigali RW, Lusaka ZM, Harare ZW, Maputo MZ, Luanda AO, Kinshasa CD, Douala CM, Algiers DZ, Tripoli LY,
Khartoum SD, Durban ZA, Port Louis MU, Antananarivo MG, Windhoek NA, Gaborone BW, Ningbo CN, Changsha CN, Zhengzhou CN,
Jinan CN, Kunming CN, Hefei CN, Fuzhou CN, Nanchang CN, Nanning CN, Shijiazhuang CN, Taiyuan CN, Harbin CN, Changchun CN,
Guiyang CN, Ürümqi CN, Lanzhou CN, Hohhot CN, Wuxi CN, Dongguan CN, Foshan CN, Zhuhai CN, Haikou CN, Sanya CN`;

const places = JSON.parse(readFileSync(resolve(here, "../data/places.json"), "utf8"));
const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’‘']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const cities = places.rows.filter((r) => r[0] === 1);
const ALIAS = { "frankfurt am main": ["frankfurt am main", "frankfurt"], "delhi": ["new delhi", "delhi"], "washington": ["washington d c", "washington"],
  "ho chi minh city": ["ho chi minh city", "thanh pho ho chi minh"], "kyiv": ["kyiv", "kiev"], "st petersburg": ["saint petersburg", "st petersburg"],
  "panama city": ["panama city", "panama"], "kuwait city": ["kuwait city", "kuwait"], "guatemala city": ["guatemala city", "nueva guatemala de la asuncion", "guatemala"],
  "mexico city": ["mexico city", "ciudad de mexico"], "xi an": ["xi an", "xian"], "urumqi": ["urumqi", "wulumuqi"], "astana": ["astana", "nur sultan"],
  "ulaanbaatar": ["ulaanbaatar", "ulan bator"], "macau": ["macau", "macao"], "quebec": ["quebec", "quebec city"], "cebu city": ["cebu city", "cebu"],
  "newcastle upon tyne": ["newcastle upon tyne", "newcastle"], "san jose": ["san jose"], "tel aviv": ["tel aviv", "tel aviv yafo"],
  "the hague": ["the hague", "s gravenhage", "den haag"], "nicosia": ["nicosia", "lefkosa"], "chisinau": ["chisinau", "kishinev"], "sanya": ["sanya"],
  "cologne": ["cologne", "koln"], "munich": ["munich", "munchen"], "vienna": ["vienna", "wien"], "prague": ["prague", "praha"], "warsaw": ["warsaw", "warszawa"],
  "lisbon": ["lisbon", "lisboa"], "rome": ["rome", "roma"], "milan": ["milan", "milano"], "turin": ["turin", "torino"], "florence": ["florence", "firenze"],
  "naples": ["naples", "napoli"], "venice": ["venice", "venezia"], "genoa": ["genoa", "genova"], "seville": ["seville", "sevilla"], "athens": ["athens", "athina"],
  "copenhagen": ["copenhagen", "kobenhavn"], "gothenburg": ["gothenburg", "goteborg"], "zurich": ["zurich"], "geneva": ["geneva", "geneve"], "moscow": ["moscow", "moskva"],
  "bucharest": ["bucharest", "bucuresti"], "belgrade": ["belgrade", "beograd"], "brussels": ["brussels", "bruxelles"], "antwerp": ["antwerp", "antwerpen"], "nuremberg": ["nuremberg", "nurnberg"],
  "hannover": ["hannover", "hanover"], "kraków": ["krakow"], "yangon": ["yangon", "rangoon"], "bengaluru": ["bengaluru", "bangalore"], "chennai": ["chennai", "madras"],
  "kolkata": ["kolkata", "calcutta"], "tehran": ["tehran"], "jeddah": ["jeddah", "jiddah"], "tbilisi": ["tbilisi"], "casablanca": ["casablanca"], "algiers": ["algiers", "alger"],
  "tunis": ["tunis"], "cairo": ["cairo"], "dhaka": ["dhaka"], "kathmandu": ["kathmandu"], "medan": ["medan"], "hanoi": ["hanoi", "ha noi"] };
const byKey = new Map();
for (const c of cities) { const k = fold(c[1]) + "|" + c[2]; const prev = byKey.get(k); if (!prev || c[5] > prev[5]) byKey.set(k, c); }
function find(name, cc) {
  const k = fold(name);
  const tries = ALIAS[k] || [k];
  for (const t of tries) { const hit = byKey.get(t + "|" + cc); if (hit) return hit; }
  const loose = cities.filter((c) => c[2] === cc && fold(c[1]).split(" ")[0] === k.split(" ")[0]).sort((a, b) => b[5] - a[5]);
  return loose[0] || null;
}
const out = [], missing = [];
for (const [tier, list] of [[1, T1], [2, T2], [3, T3]]) {
  for (const entry of list.split(",")) {
    const m = entry.trim().match(/^(.*)\s([A-Z]{2})$/); if (!m) continue;
    const [, name, cc] = m;
    const hit = find(name, cc);
    if (!hit) { missing.push(name + " " + cc); continue; }
    out.push([name, cc, hit[3], hit[4], tier]);
  }
}
const LIMIT = 550;
const kept = out.filter((c) => c[4] < 3).concat(out.filter((c) => c[4] === 3));

const near = (a, b) => { const dx = (a[0] - b[0]) * Math.cos(((a[1] + b[1]) / 2) * Math.PI / 180), dy = a[1] - b[1]; return Math.hypot(dx, dy) < 0.4; };

const DEPENDENT = new Set("AI AQ AS AW AX BL BM BQ BV CC CK CW CX EH FK FO GF GG GI GL GP GS GU HK HM IM IO JE KY MF MO MP MQ MS NC NF NU PF PM PN PR PS RE SH SJ SX TC TF TK TW UM VG VI WF XK YT".split(" "));
const CAPITAL_ALIAS = { "washington d c": "washington", "new delhi": "delhi", "city of san marino": "san marino", "sana a": "sanaa",
  "lobamba": "mbabane", "south tarawa": "tarawa", "naypyidaw": "nay pyi taw" };
const CAPITAL_NAME = { "lobamba": "Mbabane", "male": "Malé", "nukualofa": "Nuku'alofa", "palikir": "Palikir", "sana a": "Sana'a" };
let nCapitals = 0;
for (const row of places.rows) {
  if (row[0] !== 0 || !row[7] || DEPENDENT.has(row[2])) continue;
  const cc = row[2], cap = row[7];
  if (kept.some((k) => k[1] === cc && near([k[2], k[3]], [row[3], row[4]]))) continue;
  const k = fold(cap);
  const hit = find(CAPITAL_ALIAS[k] || cap, cc) || cities.filter((c) => c[2] === cc && near([c[3], c[4]], [row[3], row[4]])).sort((a, b) => b[5] - a[5])[0];
  if (!hit) { missing.push(cap + " " + cc + " (capital)"); continue; }
  if (kept.some((x) => near([x[2], x[3]], [hit[3], hit[4]]))) continue;
  kept.push([CAPITAL_NAME[k] || (fold(hit[1]) === fold(cap) ? hit[1] : cap), cc, hit[3], hit[4], 3]);
  nCapitals++;
}
console.log(nCapitals, "capitals added");
const CAPITAL_OF = new Map();
for (const row of places.rows) if (row[0] === 0 && row[7] && !DEPENDENT.has(row[2])) CAPITAL_OF.set(row[2], fold(CAPITAL_ALIAS[fold(row[7])] || row[7]));
const INSTEAD = { BO: "la paz", CI: "abidjan", TZ: "dar es salaam", BJ: "cotonou" };
const hasBig = new Set(kept.filter((c) => c[4] <= 2).map((c) => c[1]));
let promoted = 0;
for (const c of kept) {
  if (c[4] !== 3 || hasBig.has(c[1])) continue;
  const capKey = INSTEAD[c[1]] || CAPITAL_OF.get(c[1]);
  if (!capKey || (fold(c[0]) !== capKey && !(ALIAS[fold(c[0])] || []).includes(capKey) && !(ALIAS[capKey] || []).includes(fold(c[0])))) continue;
  c[4] = 2; hasBig.add(c[1]); promoted++;
}
console.log(promoted, "capitals promoted to the second tier");
for (const c of kept) if (c[0] === "Brno") c[4] = 2;
kept.sort((a, b) => a[4] - b[4]);

const PER_COUNTRY = 5;
const perCountry = {};
const SKIP = new Set(["budta|PH", "takeo|KH", "al mawsil al jadidah|IQ", "malingao|PH"]);
const RENAME = { "leon de los aldama|MX": "León", "nizhniy novgorod|RU": "Nizhny Novgorod", "rostov na donu|RU": "Rostov-on-Don", "al hudaydah|YE": "Hodeidah", "taizz|YE": "Taiz", "surat|IN": "Surat", "tai an|CN": "Tai'an", "rajshahi|BD": "Rajshahi", "fes|MA": "Fez", "hamhung|KP": "Hamhung", "as sulaymaniyah|IQ": "Sulaymaniyah" };
const bigFirst = cities.slice().sort((a, b) => (b[5] || 0) - (a[5] || 0));
for (const c of bigFirst) {
  if (kept.length >= LIMIT) break;
  const cc = c[2];
  if (SKIP.has(fold(c[1]) + "|" + cc)) continue;
  c[1] = RENAME[fold(c[1]) + "|" + cc] || c[1];
  if ((perCountry[cc] || 0) >= PER_COUNTRY) continue;
  if (kept.some((k) => k[1] === cc && near([k[2], k[3]], [c[3], c[4]]))) continue;
  if (kept.some((k) => near([k[2], k[3]], [c[3], c[4]]))) continue;
  perCountry[cc] = (perCountry[cc] || 0) + 1;
  kept.push([c[1], cc, c[3], c[4], 4]);
}
writeFileSync(resolve(here, "../data/cities.json"), JSON.stringify(kept));
out.length = 0; kept.forEach((c) => out.push(c));
console.log("cities.json:", out.length, "cities; tiers", [1, 2, 3, 4].map((t) => out.filter((c) => c[4] === t).length).join("/"));
if (missing.length) console.log("missing:", missing.join(", "));
