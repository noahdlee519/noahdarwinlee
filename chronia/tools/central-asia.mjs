export const CA_FROM = 1500, CA_TO = 1885, CA_OFF_KM2 = 10000, CA_KEEP_KM2 = 5000, CA_KEEP_THICK_KM = 15;
const START = "1500-01-01", END = "1885-12-31";
const BY_DAY_FROM = "1648-01-01";

const D = {
  ANDIJAN: "1503-01-01",
  SIBIR_END: "1598-01-01",
  KAZAKH_CITIES: "1598-01-01",
  KALMYK: "1630-01-01",
  KOKAND: "1709-01-01",
  JUZ: "1718-01-01",
  RUSSIA_EMPIRE: "1721-11-02",
  DZUNGAR_CITIES: "1723-01-01",
  JUNIOR_RU: "1731-10-10",
  AFSHARID: "1736-03-08",
  DZUNGAR_CITIES_END: "1745-01-01",
  AFSHARID_KHANATES: "1741-01-01",
  MIDDLE_RU: "1741-01-01",
  NADER_END: "1747-06-20",
  QING_DZUNGARIA: "1758-01-01",
  ALTAI: "1757-01-01",
  KALMYK_END: "1771-01-01",
  TASHKENT_STATE: "1784-01-01",
  EMIRATE: "1785-01-01",
  MERV_BUKHARA: "1789-01-01",
  BUKEY: "1802-01-01",
  KHUJAND_KOKAND: "1807-01-01",
  TASHKENT_KOKAND: "1810-01-01",
  TURKESTAN_KOKAND: "1817-01-01",
  AK_MECHET_KOKAND: "1818-01-01",
  MIDDLE_END: "1823-01-01",
  MERV_KHIVA: "1824-01-01",
  JUNIOR_END: "1825-01-01",
  CHU_KOKAND: "1826-01-01",
  KARATEGIN_KOKAND: "1835-01-01",
  BUKEY_END: "1846-01-01",
  SENIOR_END: "1849-01-01",
  AK_MECHET: "1853-08-09",
  VERNYI: "1855-01-01",
  MERV_TEKKE: "1857-01-01",
  SYR_KOKAND_END: "1862-01-01",
  PISHPEK: "1863-01-01",
  AULIE_ATA: "1864-06-16",
  TURKESTAN: "1864-06-24",
  CHIMKENT: "1864-10-04",
  TARBAGATAI: "1865-01-01",
  TASHKENT: "1865-06-29",
  KHUJAND_BUKHARA: "1866-01-01",
  KHUJAND: "1866-06-05",
  JIZZAKH: "1866-10-30",
  KOKAND_RU: "1868-02-01",
  SAMARKAND: "1868-05-14",
  BUKHARA_RU: "1868-07-05",
  NARYN: "1869-01-01",
  KRASNOVODSK: "1870-01-01",
  KITAB: "1870-08-26",
  KOHISTAN: "1871-01-01",
  KHIVA_RU: "1873-08-24",
  DARGANATA: "1873-11-01",
  NAMANGAN: "1875-10-08",
  KOKAND_END: "1876-03-02",
  ALAY: "1877-01-01",
  KARATEGIN_BUKHARA: "1877-01-01",
  DARVAZ_BUKHARA: "1878-06-01",
  GEOK_TEPE: "1881-01-24",
  WAKHAN_AFG: "1883-08-14",
  SHUGHNAN_AFG: "1883-10-01",
  TEJEN: "1884-01-01",
  MERV: "1884-03-16",
  PANJDEH: "1885-03-30"
};

const O = {};
const own = (key, tl) => { if (O[key]) throw new Error("centralasia: owner " + key + " twice"); O[key] = tl; };
const host = (name, extra = {}) => ({ name, wiki: name, host: true, ruler: "", status: 0, people: 0, ...extra });
const state = (name, wiki = name, extra = {}) => ({ name, wiki, ruler: "", status: 0, people: 0, ...extra });
const people = (name, wiki) => ({ name, wiki, ruler: "", status: 0, people: 1 });
const dep = (ruler) => ({ ruler, status: 5 }), indep = { ruler: "", status: 0 };

own("TIMURID", [[START, host("Timurid Empire")]]);
own("MOGHUL", [[START, host("Moghulistan")]]);
own("NOGAI", [[START, host("Nogai Horde")]]);
own("SIBIR", [[START, host("Khanate of Sibir")]]);
own("KALMYK", [[D.KALMYK, host("Kalmyk Khanate")]]);
own("DZUNGAR", [["1634-01-01", host("Dzungar Khanate")]]);
own("SAFAVID", [[START, host("Safavid Iran")]]);
own("AFSHARID", [[D.AFSHARID, host("Afsharid Iran")]]);
own("AFG", [[START, host("Emirate of Afghanistan")]]);
own("RUS", [[START, host("Tsardom of Russia")], [D.RUSSIA_EMPIRE, { name: "Russian Empire", wiki: "Russian Empire" }]]);
own("BUKHARA", [[START, state("Khanate of Bukhara")], [D.AFSHARID_KHANATES, dep("Afsharid Iran")], [D.NADER_END, indep], [D.EMIRATE, { name: "Emirate of Bukhara", wiki: "Emirate of Bukhara" }], [D.BUKHARA_RU, dep("Russian Empire")]]);
own("KHIVA", [[START, state("Khanate of Khiva")], [D.AFSHARID_KHANATES, dep("Afsharid Iran")], [D.NADER_END, indep], [D.KHIVA_RU, dep("Russian Empire")]]);
own("KOKAND", [[D.KOKAND, state("Khanate of Kokand")], [D.KOKAND_RU, dep("Russian Empire")]]);
own("KAZAKH", [[START, state("Kazakh Khanate")]]);
own("JUNIOR", [[D.JUZ, state("Junior jüz")], [D.JUNIOR_RU, dep("Russian Empire")]]);
own("MIDDLE", [[D.JUZ, state("Middle jüz")], [D.MIDDLE_RU, dep("Russian Empire")]]);
own("SENIOR", [[D.JUZ, state("Senior jüz")]]);
own("BUKEY", [[D.BUKEY, state("Bukey Horde", "Bukey Horde", dep("Russian Empire"))]]);
own("MERVQ", [[D.NADER_END, state("Qajar Principality of Merv")]]);
own("TASHST", [[D.TASHKENT_STATE, state("Tashkent State", "Tashkent (state)")]]);
own("SHAHR", [[D.BUKHARA_RU, state("Beylik of Shahrisabz", "Shahrisabz")]]);
own("KARAT", [[START, state("Karategin", "Rasht Valley")], [D.KARATEGIN_KOKAND, dep("Khanate of Kokand")], [D.KOKAND_END, indep]]);
own("DARVAZ", [[START, state("Darvaz", "Darvaz (region)")]]);
own("SHUGHNAN", [[START, state("Shughnan", "Shighnan")]]);
own("WAKHAN", [[START, state("Wakhan Mirdom")]]);
own("KYRGYZ", [[START, people("Kyrgyz", "Kyrgyz people")]]);
own("TEKKE", [[START, people("Tekke Turkmens", "Teke (tribe)")]]);
own("TURKMEN", [[START, people("Turkmens", "Turkmens")]]);
own("KAZAKHS", [[START, people("Kazakhs", "Kazakhs")]]);

const LAND = [];
const add = (zones, tl) => LAND.push([[].concat(zones), tl]);
const tl = (...parts) => parts.join("; ");

const KZ = (prov, names) => names.map((n) => "KAZ/" + prov + "/" + n);

add([...KZ("West Kazakhstan", ["Dzhanybekskiy", "Kaztalovskiy", "Urdinskiy", "Dzhangalinskiy", "Taskalinskiy"]), ...KZ("Atyrau", ["Kurmangazinskiy", "Isatayskiy"])],
  tl("1500 NOGAI", "1630 KALMYK", D.KALMYK_END + " RUS", D.BUKEY + " BUKEY", D.BUKEY_END + " RUS"));
add(KZ("West Kazakhstan", ["Zelenovskiy", "Terektinskiy"]), tl("1500 NOGAI", "1613 RUS"));
add([...KZ("West Kazakhstan", ["Akzhaikskiy"]), ...KZ("Atyrau", ["Atyrau", "Makhambetskiy", "Inderskiy"])], tl("1500 NOGAI", "1630 KALMYK", "1647 RUS"));
add([...KZ("West Kazakhstan", ["Syrymskiy", "Karatobinskiy", "Chingirlauskiy", "Burlinskiy"]), ...KZ("Atyrau", ["Kzylkoginskiy", "Zhylyoyskiy", "Makatskiy"]), "KAZ/Mangystau",
  ...KZ("Aktobe", ["Bayganinskiy", "Temirskiy", "Kargalinskiy", "Khobdinskiy", "Martukskiy", "Alginskiy", "Aqtobe", "Uilskiy"])],
  tl("1500 NOGAI", "1630 KALMYK", "1700 KAZAKH", D.JUZ + " JUNIOR", D.JUNIOR_END + " RUS"));
add([...KZ("Aktobe", ["Irgizskiy", "Shalkarskiy", "Mugalzharskiy", "Aytekebiyskiy", "Khromtauskiy"]), ...KZ("Kostanay", ["Amangel'dinskiy", "Dzhangil'dinskiy", "Arkalyk"]),
  ...KZ("Kyzylorda", ["Aral'skiy", "Kazalinskiy"])],
  tl("1500 KAZAKH", D.JUZ + " JUNIOR", D.JUNIOR_END + " RUS"));
add([...KZ("Kyzylorda", ["Qyzylorda", "Terenozekskiy", "Karmakchinskiy", "Zhalagashskiy"]), "KAZ/Baikonur"],
  tl("1500 KAZAKH", D.JUZ + " JUNIOR", D.AK_MECHET_KOKAND + " KOKAND", D.AK_MECHET + " RUS"));
add(KZ("Kyzylorda", ["Shieliyskiy", "Zhanakorganskiy"]), tl("1500 KAZAKH", D.JUZ + " MIDDLE", D.AK_MECHET_KOKAND + " KOKAND", D.SYR_KOKAND_END + " RUS"));

add([...KZ("Kostanay", ["Altynsarinskiy", "Auliekol'skiy", "Denisovskiy", "Fyodorovskiy", "Kamystinskiy", "Karabalykskiy", "Karasuskiy", "Mendykarinskiy", "Naurzumskiy", "Qostanay", "Sarykol'skiy", "Taranovskiy", "Uzunkol'skiy", "Zhitikarinskiy"]),
  "KAZ/Akmola", "KAZ/Nur-Sultan", "KAZ/Karaganda", ...KZ("Pavlodar", ["Bayanaul'skiy", "Ekibastuz", "Mayskiy", "Aktogayskiy"]),
  ...KZ("East Kazakhstan", ["Abayskiy", "Ayagozskiy", "Beskaragayskiy", "Zharminskiy"])],
  tl("1500 KAZAKH", D.JUZ + " MIDDLE", D.MIDDLE_END + " RUS"));
add(KZ("North Kazakhstan", ["Akzharskiy", "Ayyrtauskiy", "Shal Akyna", "Sovetskiy", "Taiynshinskiy", "Timiryazevskiy", "Tselinniy", "Ualikhanovskiy"]),
  tl("1500 SIBIR", D.SIBIR_END + " KAZAKH", D.JUZ + " MIDDLE", D.MIDDLE_END + " RUS"));
add(KZ("North Kazakhstan", ["Kyzylzharskiy", "Mamlyutskiy", "Bulaevskiy", "Esil'skiy", "Zhambylskiy"]), tl("1500 SIBIR", D.SIBIR_END + " KAZAKH", D.JUZ + " MIDDLE", "1754-01-01 RUS"));
add(KZ("Pavlodar", ["Pavlodarskiy", "Irtyshskiy", "Lebyazhinskiy", "Aksuskiy", "Kachirskiy", "Uspenskiy", "Sherbaktinskiy", "Zhelezinskiy"]), tl("1500 KAZAKH", D.JUZ + " MIDDLE", "1720 RUS"));
add(KZ("East Kazakhstan", ["Semipalatinskiy", "Ulanskiy", "Glubokovskiy", "Shemonaikhinskiy", "Borodulikhinskiy"]), tl("1500 KAZAKH", "1650 DZUNGAR", "1720 RUS"));
add(KZ("East Kazakhstan", ["Leninogorsk", "Zyryanovsk"]), tl("1500 KAZAKH", "1650 DZUNGAR", D.ALTAI + " RUS"));
add(KZ("East Kazakhstan", ["Kokpektinskiy", "Urdzharskiy"]), tl("1500 KAZAKH", "1650 DZUNGAR", D.QING_DZUNGARIA + " MIDDLE", D.MIDDLE_END + " RUS"));
add(KZ("East Kazakhstan", ["Tarbagatayskiy", "Zaysanskiy", "Kurchumskiy", "Katon-Karagayskiy"]), tl("1500 KAZAKH", "1650 DZUNGAR", D.QING_DZUNGARIA + " MIDDLE", D.MIDDLE_END + " KAZAKHS", D.TARBAGATAI + " RUS"));

add(KZ("Almaty", ["Taldyqorghan", "Karatal'skiy", "Koksuskiy", "Aksuskiy", "Sarkandskiy", "Alakolskiy", "Kerbulakskiy", "Balkhashskiy"]),
  tl("1500 MOGHUL", "1520 KAZAKH", "1650 DZUNGAR", D.QING_DZUNGARIA + " SENIOR", D.SENIOR_END + " RUS"));
add(KZ("Almaty", ["Panfilovskiy", "Uygurskiy"]), tl("1500 MOGHUL", "1520 KAZAKH", "1650 DZUNGAR", D.QING_DZUNGARIA + " SENIOR", D.SENIOR_END + " KAZAKHS", D.TARBAGATAI + " RUS"));
add(KZ("Almaty", ["Almaty", "Karasayskiy", "Talgarskiy", "Enbekshikazakhskiy", "Iliyskiy", "Zhambylskiy", "Raiymbekskiy"]),
  tl("1500 MOGHUL", "1520 KAZAKH", "1650 DZUNGAR", D.QING_DZUNGARIA + " SENIOR", D.SENIOR_END + " KAZAKHS", D.VERNYI + " RUS"));
add(KZ("Jambyl", ["Shuskiy", "Kordayskiy"]), tl("1500 KAZAKH", "1650 DZUNGAR", D.QING_DZUNGARIA + " SENIOR", D.CHU_KOKAND + " KOKAND", D.PISHPEK + " RUS"));
add(KZ("Jambyl", ["Merkenskiy", "Zhambylskiy", "Talasskiy", "Bayzakskiy", "Zhualynskiy", "Lugovskoy"]),
  tl("1500 KAZAKH", D.JUZ + " SENIOR", D.DZUNGAR_CITIES + " DZUNGAR", D.DZUNGAR_CITIES_END + " SENIOR", D.CHU_KOKAND + " KOKAND", D.AULIE_ATA + " RUS"));
add(KZ("Jambyl", ["Moyynkumskiy", "Sarysuskiy"]), tl("1500 KAZAKH", D.JUZ + " SENIOR", D.SENIOR_END + " KAZAKHS", D.AULIE_ATA + " RUS"));
add(KZ("Turkistan", ["Turkestan", "Otrarskiy", "Suzakskiy"]),
  tl("1500 BUKHARA", D.KAZAKH_CITIES + " KAZAKH", D.JUZ + " MIDDLE", D.DZUNGAR_CITIES + " DZUNGAR", D.DZUNGAR_CITIES_END + " MIDDLE", D.TURKESTAN_KOKAND + " KOKAND", D.TURKESTAN + " RUS"));
add(KZ("Turkistan", ["Shymkent", "Sayramskiy", "Tolebiyskiy", "Tyul'kubaskiy", "Baydibekskiy", "Kazygurtskiy", "Saryagashskiy", "Ordabasynskiy", "Arysskiy"]),
  tl("1500 BUKHARA", D.KAZAKH_CITIES + " KAZAKH", D.JUZ + " SENIOR", D.DZUNGAR_CITIES + " DZUNGAR", D.DZUNGAR_CITIES_END + " SENIOR", D.TASHKENT_KOKAND + " KOKAND", D.CHIMKENT + " RUS"));
add([...KZ("Turkistan", ["Maktaaral'skiy", "Chardarinskiy"]), "UZB/MIRZACHUL"], tl("1500 BUKHARA", D.JIZZAKH + " RUS"));

add("UZB/TASHKENT", tl("1500 MOGHUL", D.ANDIJAN + " BUKHARA", D.KAZAKH_CITIES + " KAZAKH", D.JUZ + " SENIOR", D.DZUNGAR_CITIES + " DZUNGAR", D.DZUNGAR_CITIES_END + " SENIOR",
  D.TASHKENT_STATE + " TASHST", D.TASHKENT_KOKAND + " KOKAND", D.TASHKENT + " RUS"));
const FERGANA = (end) => tl("1500 TIMURID", D.ANDIJAN + " BUKHARA", D.KOKAND + " KOKAND", end + " RUS");
add(["UZB/FERGANA", "TJK/ISFARA", "KGZ/FERGANA"], FERGANA(D.KOKAND_END));
add("UZB/NAMANGAN", FERGANA(D.NAMANGAN));
add("KGZ/ALAY", tl("1500 KYRGYZ", D.KARATEGIN_KOKAND + " KOKAND", D.ALAY + " RUS"));
add("UZB/SAMARKAND", tl("1500 BUKHARA", D.SAMARKAND + " RUS"));
add(["UZB/KATTAKURGAN", "TJK/PANJAKENT"], tl("1500 BUKHARA", D.BUKHARA_RU + " RUS"));
add("UZB/SHAHRISABZ", tl("1500 BUKHARA", D.BUKHARA_RU + " SHAHR", D.KITAB + " BUKHARA"));
add(["UZB/BUKHARA", "TKM/LEBAP"], tl("1500 BUKHARA"));
add("TJK/HISAR", tl("1500 TIMURID", "1505 BUKHARA"));
const KHWARAZM = tl("1500 TIMURID", "1505 BUKHARA", "1510 SAFAVID", "1511 KHIVA", "1538 BUKHARA", "1540 KHIVA", "1593 BUKHARA", "1598 KHIVA");
add(["UZB/KHWARAZM", "TKM/DASHOGUZ"], KHWARAZM);
add("UZB/AMUDARYA", tl(KHWARAZM, D.KHIVA_RU + " RUS"));
add("TKM/DARGANATA", tl(KHWARAZM, D.DARGANATA + " BUKHARA"));

const MERV = tl("1500 TIMURID", "1505 BUKHARA", "1510 SAFAVID", "1593 BUKHARA", "1600 SAFAVID", D.AFSHARID + " AFSHARID", D.NADER_END + " MERVQ", D.MERV_BUKHARA + " BUKHARA", D.MERV_KHIVA + " KHIVA");
add("TKM/MERV", tl(MERV, D.MERV_TEKKE + " TEKKE", D.MERV + " RUS"));
add("TKM/PANJDEH", tl(MERV, D.MERV_TEKKE + " TURKMEN", D.PANJDEH + " RUS"));
const AKHAL = tl("1500 TIMURID", "1507 BUKHARA", "1510 SAFAVID", D.AFSHARID + " AFSHARID", D.NADER_END + " TEKKE");
add("TKM/AKHAL", tl(AKHAL, D.GEOK_TEPE + " RUS"));
add("TKM/ATEK", tl(AKHAL, D.TEJEN + " RUS"));
add("TKM/CASPIAN", tl("1500 TURKMEN", D.KRASNOVODSK + " RUS"));
add("TKM/BALKAN", tl("1500 TURKMEN", D.GEOK_TEPE + " RUS"));

add("TJK/KHUJAND", tl("1500 TIMURID", D.ANDIJAN + " BUKHARA", D.KHUJAND_KOKAND + " KOKAND", D.KHUJAND_BUKHARA + " BUKHARA", D.KHUJAND + " RUS"));
add("TJK/URATYUBE", tl("1500 BUKHARA", D.JIZZAKH + " RUS"));
add("TJK/KOHISTAN", tl("1500 BUKHARA", D.KOHISTAN + " RUS"));
add("TJK/KARATEGIN", tl("1500 KARAT", D.KARATEGIN_BUKHARA + " BUKHARA"));
add("TJK/DARVAZ", tl("1500 DARVAZ", D.DARVAZ_BUKHARA + " BUKHARA"));
add("TJK/SHUGHNAN", tl("1500 SHUGHNAN", D.SHUGHNAN_AFG + " AFG"));
add("TJK/WAKHAN", tl("1500 WAKHAN", D.WAKHAN_AFG + " AFG"));
add("TJK/PAMIR", tl("1500 KYRGYZ"));

add("KGZ/CHUY", tl("1500 MOGHUL", "1570 KYRGYZ", "1700 DZUNGAR", D.QING_DZUNGARIA + " KYRGYZ", D.CHU_KOKAND + " KOKAND", D.PISHPEK + " RUS"));
add("KGZ/TALAS", tl("1500 KAZAKH", D.JUZ + " SENIOR", D.DZUNGAR_CITIES + " DZUNGAR", D.DZUNGAR_CITIES_END + " KYRGYZ", D.CHU_KOKAND + " KOKAND", D.AULIE_ATA + " RUS"));
add("KGZ/ISSYKKUL", tl("1500 MOGHUL", "1570 KYRGYZ", "1700 DZUNGAR", D.QING_DZUNGARIA + " KYRGYZ", D.TARBAGATAI + " RUS"));
add("KGZ/NARYN", tl("1500 MOGHUL", "1570 KYRGYZ", "1700 DZUNGAR", D.QING_DZUNGARIA + " KYRGYZ", D.NARYN + " RUS"));

const DAY_MS = 86400000, DAY_1886 = Date.UTC(1886, 0, 1) / DAY_MS;
const toDay = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DAY_MS;
const isoOf = (d) => new Date(d * DAY_MS).toISOString().slice(0, 10);
const july = (y) => toDay(y + "-07-01");
const yearsOf = (a, b) => { const ya = +isoOf(a).slice(0, 4), yb = +isoOf(b).slice(0, 4); return [a <= july(ya) ? ya : ya + 1, b >= july(yb) ? yb : yb - 1]; };
const dateOf = (s) => (/^\d{4}$/.test(s) ? s + "-01-01" : s);
const BY_DAY = toDay(BY_DAY_FROM);
const attrAt = (key, d) => { const out = {}; for (const [from, a] of O[key]) { if (toDay(from) > d) break; Object.assign(out, a); } return out; };

export function centralAsiaRows() {
  return LAND.map(([zones, t]) => {
    const per = t.split(";").map((e) => e.trim()).filter(Boolean).map((e) => { const [d, k] = e.split(/\s+/); return { a: toDay(dateOf(d)), k }; });
    per.forEach((p, i) => {
      if (!O[p.k]) throw new Error("centralasia: no owner " + p.k + " for " + zones[0]);
      if (toDay(O[p.k][0][0]) > p.a) throw new Error("centralasia: " + p.k + " has no name on " + isoOf(p.a) + " for " + zones[0]);
      if (i && p.a <= per[i - 1].a) throw new Error("centralasia: the dates for " + zones[0] + " are out of order at " + isoOf(p.a));
      p.b = i + 1 < per.length ? per[i + 1].a - 1 : toDay(END);
    });
    if (per[0].a !== toDay(START)) throw new Error("centralasia: " + zones[0] + " does not start on " + START);
    return { zones, per };
  });
}

export function buildCentralAsia(env) {
  const { topo, client, rewind, polysOf, log = () => {} } = env;
  const geoms = topo.objects.zones.geometries;
  const ids = geoms.map((g) => g.properties.z);
  const used = new Map();
  const rows = centralAsiaRows();
  const blocks = rows.map(({ zones, per }) => {
    const items = [];
    for (const sel of zones) {
      const hit = ids.map((z, i) => (z === sel || z.startsWith(sel + "/") ? i : -1)).filter((i) => i >= 0);
      if (!hit.length) throw new Error("centralasia: no zone " + sel);
      for (const i of hit) {
        if (used.has(i)) throw new Error("centralasia: zone " + ids[i] + " is in two rows (" + used.get(i) + " and " + sel + ")");
        used.set(i, sel);
        items.push(i);
      }
    }
    return { items, per };
  });
  const missing = ids.filter((z, i) => !used.has(i));
  if (missing.length) throw new Error("centralasia: zones in no row: " + missing.join(", "));
  const days = new Set([toDay(START), toDay(END) + 1]);
  for (const b of blocks) for (const p of b.per) days.add(p.a);
  for (const key of Object.keys(O)) for (const [from] of O[key]) { const d = toDay(from); if (d > toDay(START) && d <= toDay(END)) days.add(d); }
  const cuts = [...days].sort((x, y) => x - y);
  const open = new Map(), raw = [];
  for (let n = 0; n + 1 < cuts.length; n++) {
    const a = cuts[n], b = cuts[n + 1] - 1, byOwner = new Map();
    for (const blk of blocks) {
      const p = blk.per.find((q) => q.a <= a && a <= q.b);
      if (!p) continue;
      if (!byOwner.has(p.k)) byOwner.set(p.k, []);
      byOwner.get(p.k).push(...blk.items);
    }
    for (const [k, items] of byOwner) {
      const at = attrAt(k, a), sig = JSON.stringify(at) + "|" + items.slice().sort((x, y) => x - y).join(",");
      const r = open.get(k);
      if (r && r.sig === sig && r.b === a - 1) { r.b = b; continue; }
      const row = { k, at, items, a, b, sig };
      raw.push(row);
      open.set(k, row);
    }
  }
  const shapes = new Map();
  const shapeOf = (items) => {
    const key = items.slice().sort((x, y) => x - y).join(",");
    if (!shapes.has(key)) shapes.set(key, rewind(polysOf(client.merge(topo, items.map((i) => geoms[i])))));
    return shapes.get(key);
  };
  const end = toDay(END), spans = [];
  for (const r of raw) {
    let [first, last] = yearsOf(r.a, r.b);
    if (first > last && r.a >= BY_DAY && r.b - r.a >= 6) last = first;
    if (first > last) { log(r.at.name + " " + isoOf(r.a) + " to " + isoOf(r.b) + " takes in no 1 July, so it is left out"); continue; }
    const polys = shapeOf(r.items);
    if (!polys.length) continue;
    const at = r.at;
    spans.push({ name: at.name, wiki: at.wiki || at.name, ruler: at.ruler || "", status: at.status || 0, part: "", people: at.people || 0, b: 1, host: !!at.host,
      first, last, dayFrom: r.a > toDay(START) && r.a >= BY_DAY ? [first, r.a - DAY_1886] : null, dayTo: r.b < end && r.b >= BY_DAY ? [last, r.b - DAY_1886] : null,
      from: isoOf(r.a), to: isoOf(r.b), polys });
  }
  return { spans, mask: shapeOf(ids.map((z, i) => i)), zones: ids.length, rows: rows.length };
}
