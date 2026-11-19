// The Caucasus from 1445 to 1885, for the dated maps: Georgia's kingdoms and principalities, the khanates, Dagestan's states, the
// peoples of the North Caucasus, and the empires that fought over them (the Turkmen confederations, the Ottoman Empire, Iran under
// its dynasties, and Russia), drawn from UCHRONIA's units (Natural Earth's first-level units: Georgia's regions, Armenia's
// provinces, Azerbaijan's districts, Russia's republics and krais, and four Turkish provinces), with Dagestan, the Kuban, the land
// north of the Terek, Mozdok, and Upper Svaneti cut from their units by hand. It replaces the sources' shapes there, which ran an
// Avar state of the tenth century (Sarir) on to 1647, left the khanates nameless or missing, drew all of Transcaucasia Ottoman in
// 1600, and dropped Georgia's western kingdoms and principalities for decades at a time. Noah asked for it on 18 November 2026.
//
// The main map shows the law, as the table of 1648 does (MAPMAKING.md): what treaties made. A vassal kingdom or principality is a
// dependency (status 5) of its suzerain; the Ottoman conquests of 1578 to 1590 are the Ottomans' from the Treaty of Constantinople
// (21 March 1590) to that of Nasuh Pasha (20 November 1612), and those of 1723 and 1724 from the treaties of St Petersburg and
// Constantinople to Resht, Ganja, and the peace of 1736; Russia's conquests of khanates that no treaty ceded are Russia's from the
// conquest, and its protectorates by treaty are dependencies. The peoples of the North Caucasus with no state of their own
// (Circassians, Chechens, Ingush, Ossetians) are peoples (hatched), each to the year Russia took its land.
//
// The units only approximate the borders of the time, so every state here is dotted (b 1) but the empires, whose lines along the
// Aras from 1828 and in the south-west from 1829 follow today's borders (b 2).

export const CAUCASUS_FROM = 1445, CAUCASUS_TO = 1885;
const START = "1445-01-01", END = "1885-12-31";

// Hand cuts, [lon, lat] rings: a unit named with "{NAME}" is its part inside the ring; the unit named alone is what the cuts
// named on it leave.
const CUTS = {
  // Dagestan: the steppe north of the Terek (Kizlyar and the Nogai steppe); the Avar lands in the western mountains; the Lak lands
  // (Kazikumukh); the Kaitag and Tabasaran lands; Derbent and its coast; and the Lezgin south. What is left, the coastal plain and
  // the foothills from the Sulak to Kaitag, is the Shamkhalate's.
  DAG_N: [[45.0, 43.6], [47.6, 43.6], [48.6, 44.4], [48.6, 45.7], [45.0, 45.7]],
  DAG_AVAR: [[45.5, 43.0], [46.6, 43.0], [47.0, 42.6], [46.85, 42.45], [46.9, 41.95], [46.4, 41.95], [45.5, 41.9]],
  DAG_LAK: [[46.85, 42.45], [47.35, 42.45], [47.4, 42.0], [46.9, 41.95]],
  DAG_KAIT: [[47.35, 42.45], [48.05, 42.4], [48.05, 42.25], [48.0, 41.85], [47.7, 41.75], [47.4, 42.0]],
  DAG_DERB: [[48.05, 42.4], [48.8, 42.4], [48.8, 41.6], [48.25, 41.6], [48.0, 41.85], [48.05, 42.25]],
  DAG_LEZG: [[46.4, 41.95], [46.9, 41.95], [47.4, 42.0], [47.7, 41.75], [48.0, 41.85], [48.25, 41.6], [48.8, 41.6], [48.8, 40.9], [46.4, 40.9]],
  // The land north of the Terek in Chechnya (the Greben and Terek Cossacks) and Mozdok in North Ossetia.
  CHE_N: [[44.5, 43.62], [45.6, 43.6], [46.8, 43.55], [46.8, 44.3], [44.5, 44.3]],
  MOZDOK: [[43.5, 43.55], [44.95, 43.55], [44.95, 44.1], [43.5, 44.1]],
  // The Kuban: the land south of the river (Circassia) in the Krasnodar Krai.
  KUBAN_S: [[36.4, 45.2], [37.4, 45.18], [38.1, 45.2], [38.98, 45.0], [39.7, 45.15], [40.57, 45.4], [41.1, 44.95], [41.95, 44.6], [42.0, 44.2], [43.0, 44.2], [43.0, 42.9], [36.4, 42.9]],
  // Upper Svaneti, the north of Samegrelo-Zemo Svaneti.
  SVAN: [[41.85, 42.88], [43.2, 42.88], [43.2, 43.4], [41.85, 43.4]]
};

// Dates.
const AQ = "1468-01-01";                  // the Aq Qoyunlu in Jahan Shah's lands, after his death (11 November 1467)
const SAFAVID = "1501-07-01";             // Ismail I at Tabriz after Sharur (summer 1501); Shirvan his vassal from Gulistan (December 1500)
const SHIRVAN_END = "1538-01-01";         // Shirvan annexed by Tahmasp I
const SHAKI_END = "1551-01-01";           // Shaki annexed by Tahmasp I
const AMASYA = "1555-05-29";              // the Peace of Amasya: western Georgia to the Ottoman sphere, eastern to the Safavid
const OTT_1590 = "1590-03-21";            // the Treaty of Constantinople: Transcaucasia to the Ottomans
const NASUH = "1612-11-20";               // the Treaty of Nasuh Pasha: the lines of Amasya again
const ST_PETERSBURG = "1723-09-23";       // Derbent, Baku, and the Caspian coast to Russia
const OTT_1724 = "1724-06-24";            // the Treaty of Constantinople between Russia and the Ottomans: the rest to the Ottomans
const GANJA_1735 = "1735-03-21";          // the Treaty of Ganja: Russia gives back Derbent and Baku
const AFSHARID = "1736-03-08";            // Nader crowned shah
const OTT_1736 = "1736-10-17";            // the peace of 1736: the Ottomans give back what they took in 1724
const NADER_END = "1747-06-20";           // Nader killed: the khanates and Georgia's kingdoms go their own way
const KARTLI_KAKHETI = "1762-01-08";      // Kartli and Kakheti one kingdom under Heraclius II
const KAINARJI = "1774-07-21";            // the Treaty of Küçük Kaynarca: Kabarda to Russia; the Kuban to an independent Crimea
const CRIMEA = "1783-04-19";              // the Crimea and the Kuban annexed by Russia
const GEORGIEVSK = "1783-07-24";          // Kartli-Kakheti a Russian protectorate
const QAJAR_1795 = "1795-09-01";          // Agha Mohammad Khan's campaign: Erivan and Nakhchivan his vassals
const ANNEX_1801 = "1801-09-12";          // Kartli-Kakheti annexed by Russia
const MINGRELIA_P = "1803-12-04", GANJA_1804 = "1804-01-15", IMERETI_P = "1804-04-25";
const KUREKCHAY = "1805-05-14", SHAKI_P = "1805-05-21", SHIRVAN_P = "1805-12-25", DERBENT_1806 = "1806-06-21", BAKU_1806 = "1806-10-03";
const ABKHAZIA_P = "1810-02-17", IMERETI_1810 = "1810-04-01", GURIA_P = "1810-06-19", INGUSH = "1810-01-01";
const GULISTAN = "1813-10-24";            // the Treaty of Gulistan: Persia cedes the khanates north of the Aras but Erivan and Nakhchivan, and Dagestan
const SHAKI_END_RU = "1819-01-01", SHIRVAN_END_RU = "1820-01-01", KAITAG_END = "1820-01-01", KARABAKH_END = "1822-01-01";
const TURKMENCHAY = "1828-02-21";         // Erivan, Nakhchivan, and the rest of Talysh to Russia
const KHASAUT = "1828-10-20";             // Karachay taken by Russia
const GURIA_END = "1829-01-01";
const ADRIANOPLE = "1829-09-14";          // Akhaltsikhe and Akhalkalaki to Russia
const SVANETI_P = "1833-01-01", IMAMATE_AVAR = "1834-08-15", IMAMATE_CHECHNYA = "1840-03-01", ELISU_END = "1844-01-01";
const MINGRELIA_END = "1857-01-01", SVANETI_END = "1858-01-01";
const VEDENO = "1859-04-13", GUNIB = "1859-08-25";
const CIRCASSIA_END = "1864-05-21", ABKHAZIA_END = "1864-07-01", AVAR_END = "1864-01-01", TARKI_END = "1867-01-01";
const BERLIN = "1878-07-13";              // Kars, Ardahan, and Batum to Russia
const RUSSIA_EMPIRE = "1721-11-02";

// Owners: [[from, attributes], ...]; each entry adds to or replaces what came before. b is 1 unless given.
const O = {};
const own = (key, tl) => { if (O[key]) throw new Error("caucasus: owner " + key + " twice"); O[key] = tl.map(([d, a]) => [d, a]); };
const host = (name, extra = {}) => ({ name, wiki: name, host: true, b: 2, ruler: "", status: 0, people: 0, ...extra });
const dep = (ruler) => ({ ruler, status: 5 }), indep = { ruler: "", status: 0 };

own("QQ", [[START, host("Qara Qoyunlu")]]);
own("AQQ", [[START, host("Aq Qoyunlu")]]);
own("IRAN", [[START, host("Safavid Iran")], [AFSHARID, { name: "Afsharid Iran", wiki: "Afsharid Iran" }]]);
own("OTT", [[START, host("Ottoman Empire")]]);
own("RUS", [[START, host("Tsardom of Russia")], [RUSSIA_EMPIRE, { name: "Russian Empire", wiki: "Russian Empire" }]]);
own("GOLD", [[START, host("Golden Horde")]]);
own("GREAT", [[START, host("Great Horde", { wiki: "Great Horde" })]]);
own("NOGAI", [[START, host("Nogai Horde")]]);
own("SMALL", [[START, host("Small Horde", { wiki: "Nogai Horde" })]]);
own("CRIM", [[START, host("Crimean Khanate")]]);

const persia = (d) => (d < AFSHARID ? "Safavid Iran" : "Afsharid Iran");
// A Georgian kingdom under the suzerains of eastern Georgia: the Safavids from Amasya, the Ottomans from 1590 to 1612 and from
// 1724 to 1736, the Afsharids to Nader's death.
const eastSuzerains = (extra = []) => [[AMASYA, dep("Safavid Iran")], [OTT_1590, dep("Ottoman Empire")], [NASUH, dep("Safavid Iran")], [OTT_1724, dep("Ottoman Empire")], [OTT_1736, dep(persia(OTT_1736))], [NADER_END, indep], ...extra];
own("GEORGIA", [[START, { name: "Kingdom of Georgia", wiki: "Kingdom of Georgia", ruler: "", status: 0 }], ["1490-01-01", { name: "Kingdom of Kartli", wiki: "Kingdom of Kartli" }], ...eastSuzerains()]);
own("KAKHETI", [["1465-01-01", { name: "Kingdom of Kakheti", wiki: "Kingdom of Kakheti", ruler: "", status: 0 }], ...eastSuzerains()]);
own("KK", [[KARTLI_KAKHETI, { name: "Kingdom of Kartli-Kakheti", wiki: "Kingdom of Kartli-Kakheti", ruler: "", status: 0 }], [GEORGIEVSK, dep("Russian Empire")]]);
own("IMERETI", [["1463-01-01", { name: "Kingdom of Imereti", wiki: "Kingdom of Imereti", ruler: "", status: 0 }], [AMASYA, dep("Ottoman Empire")], [KAINARJI, indep], [IMERETI_P, dep("Russian Empire")]]);
// Mingrelia (Odishi), with Abkhazia until the Shervashidze princes broke away (about 1680), and Guria: the Kings of Imereti's
// vassals after the division of 1490, the Ottomans' from Amasya, free from Küçük Kaynarca, and Russian protectorates.
own("MINGRELIA", [["1490-01-01", { name: "Principality of Mingrelia", wiki: "Principality of Mingrelia", ...dep("Kingdom of Imereti") }], [AMASYA, dep("Ottoman Empire")], [KAINARJI, indep], [MINGRELIA_P, dep("Russian Empire")]]);
own("GURIA", [["1490-01-01", { name: "Principality of Guria", wiki: "Principality of Guria", ...dep("Kingdom of Imereti") }], [AMASYA, dep("Ottoman Empire")], [KAINARJI, indep], [GURIA_P, dep("Russian Empire")]]);
own("ABKHAZIA", [["1680-01-01", { name: "Principality of Abkhazia", wiki: "Principality of Abkhazia", ...dep("Ottoman Empire") }], [ABKHAZIA_P, dep("Russian Empire")]]);
own("SVANETI", [["1490-01-01", { name: "Principality of Svaneti", wiki: "Principality of Svaneti", ruler: "", status: 0 }], [SVANETI_P, dep("Russian Empire")]]);
// Samtskhe-Saatabago, free of the kings from 1465; the Ottomans' Childir Eyalet from 1578.
own("SAMTSKHE", [["1465-01-01", { name: "Principality of Samtskhe", wiki: "Principality of Samtskhe", ruler: "", status: 0 }], [AMASYA, dep("Ottoman Empire")]]);
own("SHIRVAN", [[START, { name: "Shirvan", wiki: "Shirvanshah", ruler: "", status: 0 }], ["1500-12-01", dep("Safavid Iran")]]);
own("SHAKI", [[START, { name: "Principality of Shaki", wiki: "Shaki (region)", ruler: "", status: 0 }], [SAFAVID, dep("Safavid Iran")]]);
own("KHACHEN", [[START, { name: "Principality of Khachen", wiki: "Principality of Khachen", ruler: "", status: 0 }], [SAFAVID, { name: "Melikdoms of Karabakh", wiki: "Melikdoms of Karabakh", ...dep("Safavid Iran") }],
  [OTT_1590, dep("Ottoman Empire")], [NASUH, dep("Safavid Iran")], [OTT_1724, dep("Ottoman Empire")], [OTT_1736, dep(persia(OTT_1736))], [NADER_END, indep]]);
// The khanates, from Nader's death; Erivan and Nakhchivan the Qajars' vassals from 1795.
const khanate = (name, wiki, extra = []) => [[NADER_END, { name, wiki, ruler: "", status: 0 }], ...extra];
own("ERIVAN", khanate("Erivan Khanate", "Erivan Khanate", [[QAJAR_1795, dep("Qajar Iran")]]));
own("NAKHCHIVAN", khanate("Nakhichevan Khanate", "Nakhichevan Khanate", [[QAJAR_1795, dep("Qajar Iran")]]));
own("GANJA", khanate("Ganja Khanate", "Ganja Khanate"));
own("KARABAKH", khanate("Karabakh Khanate", "Karabakh Khanate", [[KUREKCHAY, dep("Russian Empire")]]));
own("SHAKIK", khanate("Shaki Khanate", "Shaki Khanate", [[SHAKI_P, dep("Russian Empire")]]));
own("SHIRVANK", khanate("Shirvan Khanate", "Shirvan Khanate", [[SHIRVAN_P, dep("Russian Empire")]]));
own("BAKU", khanate("Baku Khanate", "Baku Khanate"));
own("QUBA", khanate("Quba Khanate", "Quba Khanate"));
own("DERBENT", khanate("Derbent Khanate", "Derbent Khanate"));
own("TALYSH", khanate("Talysh Khanate", "Talysh Khanate", [[GULISTAN, dep("Russian Empire")]]));
own("ELISU", khanate("Elisu Sultanate", "Elisu Sultanate", [["1803-04-12", dep("Russian Empire")]]));
own("JAR", khanate("Jar-Balakan communities", "Jar-Balakan", [["1803-04-12", dep("Russian Empire")]]));
// Dagestan.
own("SHAMKHAL", [[START, { name: "Shamkhalate of Tarki", wiki: "Tarki Shamkhalate", ruler: "", status: 0 }], [GULISTAN, dep("Russian Empire")]]);
own("KAZIKUMUKH", [["1642-01-01", { name: "Kazikumukh Khanate", wiki: "Kazikumukh Khanate", ruler: "", status: 0 }], [GULISTAN, dep("Russian Empire")]]);
own("KAITAG", [[START, { name: "Kaitag Utsmiate", wiki: "Kaitag Utsmiate", ruler: "", status: 0 }], [GULISTAN, dep("Russian Empire")]]);
own("AVAR", [[START, { name: "Avar Khanate", wiki: "Avar Khanate", ruler: "", status: 0 }], [GULISTAN, dep("Russian Empire")]]);
own("LEZGINS", [[START, { name: "Lezgins", wiki: "Lezgins", ruler: "", status: 0, people: 1 }]]);
own("IMAMATE", [[IMAMATE_AVAR, { name: "Caucasian Imamate", wiki: "Caucasian Imamate", ruler: "", status: 0 }]]);
// The North Caucasus.
own("KABARDIA", [["1502-06-01", { name: "Kabardia", wiki: "Kabardia", ruler: "", status: 0 }]]);
own("ZICHS", [[START, { name: "Zichs", wiki: "Zichia", ruler: "", status: 0, people: 1 }], ["1502-06-01", { name: "Circassians", wiki: "Circassia" }]]);
own("CHECHENS", [[START, { name: "Chechens", wiki: "Chechens", ruler: "", status: 0, people: 1 }]]);
own("INGUSH", [[START, { name: "Ingush", wiki: "Ingush people", ruler: "", status: 0, people: 1 }]]);
own("OSSETIANS", [[START, { name: "Ossetians", wiki: "Ossetians", ruler: "", status: 0, people: 1 }]]);
own("KARACHAY", [[START, { name: "Karachays", wiki: "Karachays", ruler: "", status: 0, people: 1 }]]);

// Land rows: [units, timeline]. A timeline is "1445 GEORGIA; 1465-01-01 KAKHETI", each entry a year (1 January) or a day and an
// owner. Units are "GEO/Kakheti" (every unit of that country and province) or "RUS/Republic of Dagestan{DAG_LAK}" (a cut).
const LAND = [];
const add = (units, tl) => LAND.push([[].concat(units), tl]);
const GH = "1445 GOLD; 1466 GREAT; 1502-06-01 NOGAI";
// Persian then Ottoman then Persian, as the treaties had it, then a khanate from Nader's death.
const IRAN_TL = (k, extra = "") => "1445 QQ; " + AQ + " AQQ; " + SAFAVID + " IRAN; " + OTT_1590 + " OTT; " + NASUH + " IRAN; " + OTT_1724 + " OTT; " + OTT_1736 + " IRAN; " + NADER_END + " " + k + extra;

// ——— Georgia ———
add(["GEO/Tbilisi", "GEO/Shida Kartli", "GEO/Kvemo Kartli", "GEO/Mtskheta-Mtianeti", "ARM/Lori", "ARM/Tavush", "AZE/Qazax", "AZE/Agstafa", "AZE/Tovuz"],
  "1445 GEORGIA; " + KARTLI_KAKHETI + " KK; " + ANNEX_1801 + " RUS");
add(["GEO/Kakheti"], "1445 GEORGIA; 1465 KAKHETI; " + KARTLI_KAKHETI + " KK; " + ANNEX_1801 + " RUS");
add(["GEO/Imereti", "GEO/Racha-Lechkhumi and Kvemo Svaneti"], "1445 GEORGIA; 1490 IMERETI; " + IMERETI_1810 + " RUS");
add(["GEO/Samegrelo-Zemo Svaneti"], "1445 GEORGIA; 1490 MINGRELIA; " + MINGRELIA_END + " RUS");
add(["GEO/Samegrelo-Zemo Svaneti{SVAN}"], "1445 GEORGIA; 1490 SVANETI; " + SVANETI_END + " RUS");
add(["GEO/Abkhazia"], "1445 GEORGIA; 1490 MINGRELIA; 1680 ABKHAZIA; " + ABKHAZIA_END + " RUS");
add(["GEO/Guria"], "1445 GEORGIA; 1490 GURIA; " + GURIA_END + " RUS");
add(["GEO/Adjara"], "1445 GEORGIA; 1490 GURIA; 1547 OTT; " + BERLIN + " RUS");
add(["GEO/Samtskhe–Javakheti"], "1445 GEORGIA; 1465 SAMTSKHE; 1578 OTT; " + ADRIANOPLE + " RUS");
add(["TUR/Ardahan"], "1445 GEORGIA; 1465 SAMTSKHE; 1578 OTT; " + BERLIN + " RUS");
add(["TUR/Artvin"], "1445 GEORGIA; 1465 SAMTSKHE; 1551 OTT; " + BERLIN + " RUS");
add(["TUR/Kars"], "1445 QQ; " + AQ + " AQQ; " + SAFAVID + " IRAN; " + AMASYA + " OTT; " + BERLIN + " RUS");

// ——— Armenia, Nakhchivan, and Karabakh ———
add(["ARM/Yerevan", "ARM/Ararat", "ARM/Armavir", "ARM/Aragatsotn", "ARM/Kotayk", "ARM/Gegharkunik", "ARM/Vayots Dzor", "ARM/Shirak", "TUR/Iğdır"], IRAN_TL("ERIVAN", "; " + TURKMENCHAY + " RUS"));
add(["AZE/Sharur", "AZE/Sadarak", "AZE/Kangarli", "AZE/Babek", "AZE/Shahbuz", "AZE/Julfa", "AZE/Ordubad", "AZE/Nakhchivan"], IRAN_TL("NAKHCHIVAN", "; " + TURKMENCHAY + " RUS"));
add(["AZE/Shamkir", "AZE/Ganja", "AZE/Goygol", "AZE/Gadabay", "AZE/Dashkasan", "AZE/Samukh", "AZE/Goranboy", "AZE/Naftalan", "AZE/Yevlakh", "AZE/Mingachevir"], IRAN_TL("GANJA", "; " + GANJA_1804 + " RUS"));
add(["AZE/Tartar", "AZE/Barda", "AZE/Agdam", "AZE/Aghjabadi", "AZE/Beylagan", "AZE/Fuzuli", "AZE/Jabrayil", "AZE/Zangilan", "AZE/Qubadli", "AZE/Imishli", "ARM/Syunik"],
  IRAN_TL("KARABAKH", "; " + KARABAKH_END + " RUS"));
// Mountainous Karabakh: Khachen, then the melikdoms, which the Karabakh Khanate took (Shusha, 1752).
add(["AZE/Khojali", "AZE/Khojavend", "AZE/Shusha", "AZE/Susa", "AZE/Stepanakert", "AZE/Kalbajar"], "1445 KHACHEN; 1752 KARABAKH; " + KARABAKH_END + " RUS");

// ——— Shirvan, Shaki, and the Caspian ———
const SHIRVAN_TL = (k, extra = "") => "1445 SHIRVAN; " + SHIRVAN_END + " IRAN; " + OTT_1590 + " OTT; " + NASUH + " IRAN; " + OTT_1724 + " OTT; " + OTT_1736 + " IRAN; " + NADER_END + " " + k + extra;
add(["AZE/Shamakhi", "AZE/Ismayilli", "AZE/Agsu", "AZE/Goychay", "AZE/Kurdamir", "AZE/Ujar", "AZE/Zardab", "AZE/Gobustan", "AZE/Hajigabul", "AZE/Şirvan", "AZE/Sabirabad", "AZE/Saatly"],
  SHIRVAN_TL("SHIRVANK", "; " + SHIRVAN_END_RU + " RUS"));
add(["AZE/Baku", "AZE/Absheron", "AZE/Sumqayit"],
  "1445 SHIRVAN; " + SHIRVAN_END + " IRAN; " + OTT_1590 + " OTT; " + NASUH + " IRAN; " + ST_PETERSBURG + " RUS; " + GANJA_1735 + " IRAN; " + NADER_END + " BAKU; " + BAKU_1806 + " RUS");
add(["AZE/Quba", "AZE/Qusar", "AZE/Khachmaz", "AZE/Shabran", "AZE/Siyazan", "AZE/Khizi"],
  "1445 SHIRVAN; " + SHIRVAN_END + " IRAN; " + OTT_1590 + " OTT; " + NASUH + " IRAN; " + ST_PETERSBURG + " RUS; " + GANJA_1735 + " IRAN; " + NADER_END + " QUBA; " + DERBENT_1806 + " RUS");
add(["AZE/Salyan", "AZE/Neftchala"],
  "1445 SHIRVAN; " + SHIRVAN_END + " IRAN; " + OTT_1590 + " OTT; " + NASUH + " IRAN; " + ST_PETERSBURG + " RUS; " + GANJA_1735 + " IRAN; " + NADER_END + " QUBA; " + BAKU_1806 + " RUS");
add(["AZE/Lankaran", "AZE/Astara", "AZE/Lerik", "AZE/Yardimli", "AZE/Masally", "AZE/Jalilabad", "AZE/Bilasuvar"], IRAN_TL("TALYSH", "; " + TURKMENCHAY + " RUS"));
add(["AZE/Sheki", "AZE/Shaki", "AZE/Oghuz", "AZE/Qabala", "AZE/Agdash"],
  "1445 SHAKI; " + SHAKI_END + " IRAN; " + OTT_1590 + " OTT; " + NASUH + " IRAN; " + OTT_1724 + " OTT; " + OTT_1736 + " IRAN; " + NADER_END + " SHAKIK; " + SHAKI_END_RU + " RUS");
add(["AZE/Qakh"], "1445 SHAKI; " + SHAKI_END + " IRAN; " + OTT_1590 + " OTT; " + NASUH + " IRAN; " + OTT_1724 + " OTT; " + OTT_1736 + " IRAN; " + NADER_END + " ELISU; " + ELISU_END + " RUS");
add(["AZE/Balakan", "AZE/Zaqatala"], "1445 SHAKI; " + SHAKI_END + " IRAN; " + OTT_1590 + " OTT; " + NASUH + " IRAN; " + OTT_1724 + " OTT; " + OTT_1736 + " IRAN; " + NADER_END + " JAR; 1830 RUS");

// ——— Dagestan ———
add(["RUS/Republic of Dagestan"], "1445 SHAMKHAL; " + TARKI_END + " RUS");
add(["RUS/Republic of Dagestan{DAG_N}"], GH + "; 1588 RUS");
add(["RUS/Republic of Dagestan{DAG_AVAR}"], "1445 AVAR; " + IMAMATE_AVAR + " IMAMATE; " + GUNIB + " AVAR; " + AVAR_END + " RUS");
add(["RUS/Republic of Dagestan{DAG_LAK}"], "1445 SHAMKHAL; 1642 KAZIKUMUKH; " + GUNIB + " RUS");
add(["RUS/Republic of Dagestan{DAG_KAIT}"], "1445 KAITAG; " + KAITAG_END + " RUS");
add(["RUS/Republic of Dagestan{DAG_DERB}"], "1445 SHIRVAN; " + SHIRVAN_END + " IRAN; " + OTT_1590 + " OTT; " + NASUH + " IRAN; 1722-08-23 RUS; " + GANJA_1735 + " IRAN; " + NADER_END + " DERBENT; 1765 QUBA; " + DERBENT_1806 + " RUS");
add(["RUS/Republic of Dagestan{DAG_LEZG}"], "1445 LEZGINS; " + GULISTAN + " RUS");

// ——— The North Caucasus ———
add(["RUS/Chechen Republic"], "1445 CHECHENS; " + IMAMATE_CHECHNYA + " IMAMATE; " + VEDENO + " RUS");
add(["RUS/Chechen Republic{CHE_N}"], GH + "; 1711 RUS");
add(["RUS/Republic of Ingushetia"], "1445 INGUSH; " + INGUSH + " RUS");
add(["RUS/Republic of North Ossetia-Alania"], "1445 OSSETIANS; " + KAINARJI + " RUS");
add(["RUS/Republic of North Ossetia-Alania{MOZDOK}"], "1445 GOLD; 1466 GREAT; 1502-06-01 KABARDIA; 1763 RUS");
add(["RUS/Kabardino-Balkaria"], "1445 GOLD; 1466 GREAT; 1502-06-01 KABARDIA; " + KAINARJI + " RUS");
add(["RUS/Karachay-Cherkess Republic"], "1445 KARACHAY; " + KHASAUT + " RUS");
add(["RUS/Republic of Adygea", "RUS/Krasnodar Krai{KUBAN_S}"], "1445 ZICHS; " + CIRCASSIA_END + " RUS");
add(["RUS/Krasnodar Krai"], "1445 ZICHS; 1557 SMALL; " + KAINARJI + " CRIM; " + CRIMEA + " RUS");
add(["RUS/Stavropol Krai"], GH + "; 1634 SMALL; " + KAINARJI + " CRIM; " + CRIMEA + " RUS");

// ——— Building ———
const DAY_MS = 86400000, DAY_1886 = Date.UTC(1886, 0, 1) / DAY_MS;
const toDay = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DAY_MS;
const isoOf = (d) => new Date(d * DAY_MS).toISOString().slice(0, 10);
const july = (y) => toDay(y + "-07-01");
const yearsOf = (a, b) => { const ya = +isoOf(a).slice(0, 4), yb = +isoOf(b).slice(0, 4); return [a <= july(ya) ? ya : ya + 1, b >= july(yb) ? yb : yb - 1]; };
const dateOf = (s) => (/^\d{4}$/.test(s) ? s + "-01-01" : s);
// The map changes by the day from 1648; before, by the year.
const BY_DAY = toDay("1648-01-01");

// Each owner's attributes on a day.
const attrAt = (key, d) => { const out = {}; for (const [from, a] of O[key]) { if (toDay(from) > d) break; Object.assign(out, a); } return out; };

// The rows, checked: every owner known, its first entry on or before the land's, dates in order.
export function caucasusRows() {
  return LAND.map(([units, tl]) => {
    const per = tl.split(";").map((e) => e.trim()).filter(Boolean).map((e) => { const [d, k] = e.split(/\s+/); return { a: toDay(dateOf(d)), k }; });
    per.forEach((p, i) => {
      if (!O[p.k]) throw new Error("caucasus: no owner " + p.k + " for " + units[0]);
      if (toDay(O[p.k][0][0]) > p.a) throw new Error("caucasus: " + p.k + " has no name on " + isoOf(p.a) + " for " + units[0]);
      if (i && p.a <= per[i - 1].a) throw new Error("caucasus: the dates for " + units[0] + " are out of order at " + isoOf(p.a));
      p.b = i + 1 < per.length ? per[i + 1].a - 1 : toDay(END);
    });
    if (per[0].a !== toDay(START)) throw new Error("caucasus: " + units[0] + " does not start on " + START);
    return { units, per };
  });
}

// env: the units topology and its provinces (UCHRONIA), topojson-client, polygon-clipping, and the builder's rewind and polysOf.
// Returns { spans, mask, units }, the spans in the form of the table of 1648's.
export function buildCaucasus(env) {
  const { topo, provinces, client, clip, rewind, polysOf, log = () => {} } = env;
  const geoms = topo.objects.units.geometries;
  const polysAt = (i) => { const g = client.feature(topo, geoms[i]).geometry; return g ? rewind(polysOf(g)) : []; };
  const byName = new Map();
  geoms.forEach((g, i) => { const pr = provinces[g.properties.p]; const k = pr.c + "/" + pr.n; if (!byName.has(k)) byName.set(k, []); byName.get(k).push(i); });
  const rows = caucasusRows();
  // The cuts named on each unit, so the unit named alone is what they leave.
  const cutsOn = new Map();
  for (const { units } of rows) for (const u of units) {
    const m = /^(.*)\{(\w+)\}$/.exec(u);
    if (!m) continue;
    if (!CUTS[m[2]]) throw new Error("caucasus: no cut " + m[2]);
    for (const i of byName.get(m[1]) || []) { if (!cutsOn.has(i)) cutsOn.set(i, new Set()); cutsOn.get(i).add(m[2]); }
  }
  const ring = (k) => { const r = CUTS[k]; return [r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1] ? r : r.concat([r[0]])]; };
  // Items: [unit index, cut name or null], one piece of land each.
  const pieceOf = new Map();
  const piece = (i, cut) => {
    const key = i + ":" + (cut || "");
    if (pieceOf.has(key)) return pieceOf.get(key);
    let p = polysAt(i);
    if (cut) p = rewind(clip.intersection(p, [ring(cut)]));
    else if (cutsOn.has(i)) p = rewind(clip.difference(p, ...[...cutsOn.get(i)].map((k) => [ring(k)])));
    pieceOf.set(key, p);
    return p;
  };
  const blocks = [];
  for (const { units, per } of rows) {
    const items = [];
    for (const u of units) {
      const m = /^(.*?)(?:\{(\w+)\})?$/.exec(u), list = byName.get(m[1]);
      if (!list || !list.length) throw new Error("caucasus: no unit " + m[1]);
      for (const i of list) items.push([i, m[2] || null]);
    }
    blocks.push({ items, per });
  }
  // Spans: each owner's pieces over each stretch of days on which its land and attributes stay the same.
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
      const at = attrAt(k, a), sig = JSON.stringify(at) + "|" + items.map((x) => x.join(":")).sort().join(",");
      const r = open.get(k);
      if (r && r.sig === sig && r.b === a - 1) { r.b = b; continue; }
      const row = { k, at, items, a, b, sig };
      raw.push(row);
      open.set(k, row);
    }
  }
  const shapes = new Map();
  const shapeOf = (items) => {
    const key = items.map((x) => x.join(":")).sort().join(",");
    if (shapes.has(key)) return shapes.get(key);
    const whole = items.filter(([i, c]) => !c && !cutsOn.has(i)).map(([i]) => geoms[i]);
    let polys = whole.length ? rewind(polysOf(client.merge(topo, whole))) : [];
    const parts = items.filter(([i, c]) => c || cutsOn.has(i)).map(([i, c]) => piece(i, c)).filter((p) => p.length);
    if (parts.length) {
      try { polys = rewind(clip.union(polys, ...parts)); } catch (e) { log("shape " + key.slice(0, 50) + ": the cut pieces could not be joined (" + e.message + ")"); polys = polys.concat(...parts); }
    }
    shapes.set(key, polys);
    return polys;
  };
  const end = toDay(END), spans = [];
  for (const r of raw) {
    let [first, last] = yearsOf(r.a, r.b);
    // From 1648 a stretch that takes in no 1 July is filed under the year of the 1 July after it starts, and shown by its days.
    if (first > last && r.a >= BY_DAY && r.b - r.a >= 6) last = first;
    if (first > last) { log(r.at.name + " " + isoOf(r.a) + " to " + isoOf(r.b) + " takes in no 1 July, so it is left out"); continue; }
    const polys = shapeOf(r.items);
    if (!polys.length) continue;
    const at = r.at;
    spans.push({ name: at.name, wiki: at.wiki || at.name, ruler: at.ruler || "", status: at.status || 0, part: "", people: at.people || 0, b: at.b ?? 1, host: !!at.host,
      first, last, dayFrom: r.a > toDay(START) && r.a >= BY_DAY ? [first, r.a - DAY_1886] : null, dayTo: r.b < end && r.b >= BY_DAY ? [last, r.b - DAY_1886] : null,
      from: isoOf(r.a), to: isoOf(r.b), polys });
  }
  const all = blocks.flatMap((b) => b.items);
  return { spans, mask: shapeOf(all), units: all.length };
}
