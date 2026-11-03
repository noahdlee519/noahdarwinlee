// Europe from 1803 to 1815, for the dated maps: the states, client kingdoms, annexations, and occupations of the Napoleonic
// Wars, drawn from UCHRONIA's second-level units (Germany's districts, Poland's powiats, Austria's and Czechia's districts,
// Ukraine's raions) and its provinces (Natural Earth's first-level units elsewhere). The main map shows what treaties and
// decrees made (the law on the map): annexations, client states and personal unions under their ruler, and formal military
// occupations under an occupying administration as occupied (status 4) once the war that brought them had ended in a peace or an
// armistice. The occupations made in the wars themselves (WAR_OCC) are drawn in the zones of control (tools/napoleonic-control.mjs)
// and leave the land its lawful owner's on the main map, as the First World War's do. Land two rival governments both claimed is disputed
// (status 6): Spain between Joseph Bonaparte and the patriot government, Catalonia between the French Empire and the patriots,
// Norway in 1814, and Serbia between the rebels and the Ottomans. Armies on the march are not drawn.
//
// LAND gives each block of units its owner from date to date, OWNERS each owner's name, ruler, status, and part from date to
// date. A span is one owner with one set of blocks and one set of attributes. Every year is the state of things on 1 July, as
// elsewhere in the builder, and each span keeps its real first and last day: a period that takes in no 1 July is dropped (its
// land stays with the owner before), and a span that begins on the window's first day keeps the days the dated table gives it.
// Russia and the Ottoman Empire are hosts: their blocks join their spans from the sources, which run on outside Europe.

export const NAPOLEONIC_FROM = 1803, NAPOLEONIC_TO = 1815;
export const HOSTS = new Set(["Russian Empire", "Ottoman Empire"]);
const W = "1803-01-01", END = "1815-12-31";

// Dates.
const PRESSBURG = "1805-12-26", RHINE = "1806-07-12", HRE_END = "1806-08-06", JENA = "1806-10-27", HESSE_OCC = "1806-11-01";
const TILSIT = "1807-07-09", WESTPHALIA = "1807-08-18", PRUSSIA_FREE = "1808-12-03", SCHONBRUNN = "1809-10-14";
const FRANKFURT_GD = "1810-02-16", WESTPHALIA_HANOVER = "1810-03-01", HOLLAND = "1810-07-09", HANSE = "1810-12-13";
const WESTPHALIA_END = "1813-10-26", PARIS = "1814-05-30", MOSELLE = "1814-06-16", RHINELAND = "1815-04-05";
const RHINE_END = "1813-11-04", SAXONY_SPLIT = "1815-05-18", CONFEDERATION = "1815-06-08", VIENNA = "1815-06-09";

// Owners: each an attribute timeline, [[from, changes], ...], where the changes add to or replace what came before.
// "@FR" as a ruler is France under its regime of the day.
const FFE = "First French Empire";
const O = {
  FR: [[W, { name: "French Consulate", b: 1 }], ["1804-05-18", { name: FFE }], [PARIS, { name: "Bourbon Kingdom of France", wiki: "Bourbon Restoration in France" }]],
  ILL: [[W, { name: "Illyrian Provinces", ruler: FFE, status: 5 }]],
  // Iberia.
  POR: [[W, { name: "Kingdom of Portugal", b: 2 }]],
  SPA: [[W, { name: "Kingdom of Spain", b: 2 }]],
  SPAd: [[W, { name: "Spain", wiki: "Spain under Joseph Bonaparte", status: 6, claims: ["Kingdom of Spain", "Spain under Joseph Bonaparte"], b: 2 }]],
  CATd: [[W, { name: "Catalonia", wiki: "French departments of Catalonia", status: 6, claims: [FFE, "Kingdom of Spain"], b: 2 }]],
  // The Low Countries.
  BAT: [[W, { name: "Batavian Republic" }], ["1806-06-05", { name: "Kingdom of Holland", ruler: FFE, status: 5 }], ["1813-12-02", { name: "Sovereign Principality of the United Netherlands", ruler: "", status: 0 }], ["1815-03-16", { name: "Netherlands", wiki: "United Kingdom of the Netherlands" }]],
  BEL: [[W, { name: "Southern Netherlands", wiki: "United Kingdom of the Netherlands", ruler: "Sovereign Principality of the United Netherlands", status: 4 }]],
  LUX: [[W, { name: "Luxembourg", wiki: "Grand Duchy of Luxembourg", ruler: "Netherlands", status: 5, part: "German Confederation" }]],
  // Switzerland and its neighbours.
  SWI: [[W, { name: "Swiss Confederation" }]],
  VAL: [[W, { name: "Rhodanic Republic" }]],
  NEU: [[W, { name: "Principality of Neuchâtel", ruler: "Kingdom of Prussia", status: 5 }], ["1806-03-30", { ruler: FFE }], ["1814-06-03", { ruler: "Kingdom of Prussia" }]],
  // Italy.
  ITR: [[W, { name: "Italian Republic", wiki: "Italian Republic (1802–1805)", ruler: "@FR", status: 5 }], ["1805-03-17", { name: "Kingdom of Italy", wiki: "Kingdom of Italy (Napoleonic)", ruler: FFE }]],
  LIG: [[W, { name: "Ligurian Republic" }]],
  GEN: [[W, { name: "Republic of Genoa", wiki: "Republic of Genoa (1814)" }]],
  SAR: [[W, { name: "Kingdom of Sardinia", b: 2 }]],
  ETR: [[W, { name: "Kingdom of Etruria" }]],
  TUS: [[W, { name: "Grand Duchy of Tuscany" }]],
  LUC: [[W, { name: "Republic of Lucca" }], ["1805-06-23", { name: "Principality of Lucca and Piombino", ruler: FFE, status: 5 }], ["1814-03-15", { name: "Lucca", wiki: "Duchy of Lucca", ruler: "Austrian Empire", status: 4 }], [VIENNA, { name: "Duchy of Lucca", ruler: "", status: 0 }]],
  MAS: [[W, { name: "Duchy of Massa and Carrara" }]],
  ELB: [[W, { name: "Principality of Elba" }]],
  PAR: [[W, { name: "Duchy of Parma and Piacenza" }]],
  MOD: [[W, { name: "Duchy of Modena and Reggio" }]],
  PAP: [[W, { name: "Papal States" }]],
  NAP: [[W, { name: "Kingdom of Naples" }], ["1806-02-14", { ruler: FFE, status: 5 }], ["1814-01-11", { ruler: "", status: 0 }]],
  NAPo: [[W, { name: "Papal States", wiki: "Papal States", ruler: "Kingdom of Naples", status: 4 }]],
  SIC: [[W, { name: "Kingdom of Sicily", b: 2 }]],
  LV: [[W, { name: "Kingdom of Lombardy–Venetia", ruler: "Austrian Empire", status: 5 }]],
  AUSo: [[W, { name: "Papal States", ruler: "Austrian Empire", status: 4 }]],
  RAG: [[W, { name: "Republic of Ragusa" }]],
  ION: [[W, { name: "Septinsular Republic", ruler: "Ottoman Empire", status: 5 }]],
  IONb: [[W, { name: "Ionian Islands", wiki: "United States of the Ionian Islands", ruler: "United Kingdom", status: 4 }]],
  // Austria.
  AUS: [[W, { name: "Habsburg Monarchy" }], ["1804-08-11", { name: "Austrian Empire" }]],
  AUSg: [[W, { name: "Habsburg Monarchy" }], ["1804-08-11", { name: "Austrian Empire" }], [CONFEDERATION, { part: "German Confederation" }]],
  SALZ: [[W, { name: "Electorate of Salzburg" }]],
  // Germany.
  PR: [[W, { name: "Kingdom of Prussia" }], [JENA, { ruler: FFE, status: 4 }], [PRUSSIA_FREE, { ruler: "", status: 0 }]],
  PRg: [[W, { name: "Kingdom of Prussia" }], [JENA, { ruler: FFE, status: 4 }], [PRUSSIA_FREE, { ruler: "", status: 0 }], [CONFEDERATION, { part: "German Confederation" }]],
  BAV: [[W, { name: "Electorate of Bavaria" }], ["1806-01-01", { name: "Kingdom of Bavaria" }], [RHINE, { part: "Confederation of the Rhine" }], ["1813-10-08", { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  BERGb: [[W, { name: "Duchy of Berg", ruler: "Electorate of Bavaria", status: 5 }]],
  WUR: [[W, { name: "Electorate of Württemberg" }], ["1806-01-01", { name: "Kingdom of Württemberg" }], [RHINE, { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  BAD: [[W, { name: "Electorate of Baden" }], [RHINE, { name: "Grand Duchy of Baden", part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  HD: [[W, { name: "Landgraviate of Hesse-Darmstadt" }], [RHINE, { part: "Confederation of the Rhine" }], ["1806-08-13", { name: "Grand Duchy of Hesse" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  HK: [[W, { name: "Electorate of Hesse" }], [CONFEDERATION, { part: "German Confederation" }]],
  HKo: [[W, { name: "Electorate of Hesse", ruler: FFE, status: 4 }]],
  HAN: [[W, { name: "Electorate of Hanover" }], ["1814-10-12", { name: "Kingdom of Hanover" }], [CONFEDERATION, { part: "German Confederation" }]],
  HANo: [[W, { name: "Electorate of Hanover", ruler: "@FR", status: 4 }]],
  SAX: [[W, { name: "Electorate of Saxony" }], ["1806-12-20", { name: "Kingdom of Saxony", part: "Confederation of the Rhine" }], ["1813-10-19", { part: "", ruler: "Russian Empire", status: 4 }], ["1814-11-10", { ruler: "Kingdom of Prussia" }], ["1815-06-07", { ruler: "", status: 0, part: "German Confederation" }]],
  WEST: [[W, { name: "Kingdom of Westphalia", ruler: FFE, status: 5 }], ["1807-11-15", { part: "Confederation of the Rhine" }]],
  BERG: [[W, { name: "Grand Duchy of Berg", ruler: FFE, status: 5 }], [RHINE, { part: "Confederation of the Rhine" }]],
  BERGo: [[W, { name: "Grand Duchy of Berg", ruler: "Kingdom of Prussia", status: 4 }]],
  RHIo: [[W, { name: "General Government of the Lower and Middle Rhine", wiki: "Grand Duchy of the Lower Rhine", ruler: "Kingdom of Prussia", status: 4 }]],
  JOINT: [[W, { name: "Joint Austro-Bavarian administration", wiki: "Circle of the Rhine", ruler: "Austrian Empire", status: 4 }], [VIENNA, { status: 5 }]],
  BRU: [[W, { name: "Duchy of Brunswick" }], [JENA, { ruler: FFE, status: 4 }], [WESTPHALIA_END, { ruler: "", status: 0 }], [CONFEDERATION, { part: "German Confederation" }]],
  OLD: [[W, { name: "Duchy of Oldenburg" }], ["1808-10-14", { part: "Confederation of the Rhine" }], [HANSE, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  MS: [[W, { name: "Duchy of Mecklenburg-Schwerin" }], ["1808-03-22", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  MST: [[W, { name: "Duchy of Mecklenburg-Strelitz" }], ["1808-02-18", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  NUS: [[W, { name: "Principality of Nassau-Usingen" }], [RHINE, { part: "Confederation of the Rhine" }], ["1806-08-30", { name: "Duchy of Nassau" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  NWE: [[W, { name: "Principality of Nassau-Weilburg" }], [RHINE, { part: "Confederation of the Rhine" }], ["1806-08-30", { name: "Duchy of Nassau" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  ORA: [[W, { name: "Principality of Nassau-Orange-Fulda" }]],
  FUL: [[W, { name: "Principality of Fulda", wiki: "Prince-Bishopric of Fulda", ruler: FFE, status: 4 }]],
  ASC: [[W, { name: "Principality of Aschaffenburg" }], [RHINE, { name: "Principality of Frankfurt", wiki: "Grand Duchy of Frankfurt", part: "Confederation of the Rhine" }], [FRANKFURT_GD, { name: "Grand Duchy of Frankfurt", wiki: "Grand Duchy of Frankfurt" }]],
  REG: [[W, { name: "Principality of Regensburg" }], [RHINE, { part: "Confederation of the Rhine" }]],
  FFM: [[W, { name: "Free City of Frankfurt" }], [CONFEDERATION, { part: "German Confederation" }]],
  NUR: [[W, { name: "Free Imperial City of Nuremberg" }]],
  AUG: [[W, { name: "Free Imperial City of Augsburg" }]],
  WZB: [[W, { name: "Grand Duchy of Würzburg" }], ["1806-09-23", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }]],
  BAY: [[W, { name: "Principality of Bayreuth", ruler: FFE, status: 5 }]],
  ERF: [[W, { name: "Principality of Erfurt", ruler: FFE, status: 5 }]],
  LEI: [[W, { name: "Principality of Leiningen" }]],
  ARB: [[W, { name: "Duchy of Arenberg" }], [RHINE, { part: "Confederation of the Rhine" }]],
  SALM: [[W, { name: "Principality of Salm" }], [RHINE, { part: "Confederation of the Rhine" }]],
  HSI: [[W, { name: "Principality of Hohenzollern-Sigmaringen" }], [RHINE, { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  WAL: [[W, { name: "Principality of Waldeck and Pyrmont" }], ["1807-04-11", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  LIP: [[W, { name: "Principality of Lippe" }], ["1807-04-11", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  SLI: [[W, { name: "Principality of Schaumburg-Lippe" }], ["1807-04-11", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  ADE: [[W, { name: "Principality of Anhalt-Dessau" }], ["1807-04-11", { name: "Duchy of Anhalt-Dessau", part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  AKO: [[W, { name: "Principality of Anhalt-Köthen" }], ["1807-04-11", { name: "Duchy of Anhalt-Köthen", part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  SWE: [[W, { name: "Duchy of Saxe-Weimar-Eisenach" }], ["1806-12-15", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], ["1815-04-21", { name: "Grand Duchy of Saxe-Weimar-Eisenach" }], [CONFEDERATION, { part: "German Confederation" }]],
  SGA: [[W, { name: "Duchy of Saxe-Gotha-Altenburg" }], ["1806-12-15", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  SCS: [[W, { name: "Duchy of Saxe-Coburg-Saalfeld" }], ["1806-12-15", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  SMEI: [[W, { name: "Duchy of Saxe-Meiningen" }], ["1806-12-15", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  SHI: [[W, { name: "Duchy of Saxe-Hildburghausen" }], ["1806-12-15", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  SSO: [[W, { name: "Principality of Schwarzburg-Sondershausen" }], ["1807-04-11", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  SRU: [[W, { name: "Principality of Schwarzburg-Rudolstadt" }], ["1807-04-11", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  REUe: [[W, { name: "Principality of Reuss-Greiz" }], ["1807-04-11", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  REUy: [[W, { name: "Principality of Reuss-Gera" }], ["1807-04-11", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  HAM: [[W, { name: "Free City of Hamburg" }], [CONFEDERATION, { part: "German Confederation" }]],
  BRE: [[W, { name: "Free City of Bremen" }], [CONFEDERATION, { part: "German Confederation" }]],
  LUB: [[W, { name: "Free City of Lübeck" }], [CONFEDERATION, { part: "German Confederation" }]],
  // Scandinavia.
  DN: [[W, { name: "Denmark-Norway", b: 2 }], ["1814-01-14", { name: "Kingdom of Denmark" }]],
  SCHL: [[W, { name: "Duchy of Schleswig", ruler: "Denmark-Norway", status: 5, b: 2 }], ["1814-01-14", { ruler: "Kingdom of Denmark" }]],
  HOLS: [[W, { name: "Duchy of Holstein", ruler: "Denmark-Norway", status: 5, b: 2 }], ["1814-01-14", { ruler: "Kingdom of Denmark" }], [CONFEDERATION, { part: "German Confederation" }]],
  NORd: [[W, { name: "Norway", wiki: "Norway in 1814", status: 6, claims: ["Kingdom of Norway", "Kingdom of Sweden"], b: 2 }]],
  SW: [[W, { name: "Kingdom of Sweden", b: 2 }], ["1814-11-04", { name: "United Kingdoms of Sweden and Norway" }]],
  SWP: [[W, { name: "Swedish Pomerania", ruler: "Kingdom of Sweden", status: 5 }], ["1814-11-04", { ruler: "United Kingdoms of Sweden and Norway" }]],
  SWPo: [[W, { name: "Swedish Pomerania", ruler: FFE, status: 4 }]],
  FIN: [[W, { name: "Grand Duchy of Finland", ruler: "Russian Empire", status: 5, b: 2 }]],
  // Poland.
  WAR: [[W, { name: "Duchy of Warsaw", ruler: "Kingdom of Saxony", status: 5 }], ["1813-02-08", { ruler: "Russian Empire", status: 4 }]],
  DAN: [[W, { name: "Free City of Danzig" }]],
  KRA: [[W, { name: "Free City of Krakow", wiki: "Free City of Kraków" }]],
  CPL: [[W, { name: "Congress Poland", ruler: "Russian Empire", status: 5 }]],
  // The east and the Balkans.
  RUS: [[W, { name: "Russian Empire", host: true }]],
  OTT: [[W, { name: "Ottoman Empire", host: true }]],
  MOL: [[W, { name: "Principality of Moldavia", ruler: "Ottoman Empire", status: 5 }], ["1806-12-13", { ruler: "Russian Empire", status: 4 }], ["1812-05-28", { ruler: "Ottoman Empire", status: 5 }]],
  WAL2: [[W, { name: "Principality of Wallachia", ruler: "Ottoman Empire", status: 5 }], ["1806-12-13", { ruler: "Russian Empire", status: 4 }], ["1812-05-28", { ruler: "Ottoman Empire", status: 5 }]],
  SERd: [[W, { name: "Sanjak of Smederevo", wiki: "First Serbian Uprising", status: 6, claims: ["Revolutionary Serbia", "Ottoman Empire"] }], ["1815-04-23", { wiki: "Second Serbian Uprising" }]],
  MNE: [[W, { name: "Prince-Bishopric of Montenegro" }]]
};

// The occupations made in the wars themselves, which the zones of control draw (tools/napoleonic-control.mjs) and the main map
// leaves out: while the war that brought one went on, the land is its lawful owner's on the main map (the owner before the
// occupation in LAND, or the owner's attributes before it in O), and only what ran on after the peace or the armistice is drawn
// there as occupied, as the First World War's occupations after the armistices are. Each: [owner, first day, last day, units the
// occupier took later ([selector, day it fell, or null if it never did])]. The owner is occupied (status 4) on those days, and its
// ruler is the occupier. The wars end at the Treaty of Tilsit (9 July 1807) for Prussia and its neighbours, at the Treaty of Paris
// (6 January 1810) for Sweden, at the Treaty of Bucharest (28 May 1812) for Russia and the Ottomans, and at the armistice of
// 23 April 1814 for the Sixth Coalition.
const TILSIT_EVE = "1807-07-08", ARMISTICE_EVE = "1814-04-22";
export const WAR_OCC = [
  // Hanover, occupied by France from the Convention of Artlenburg (Britain was at war with France) to Prussia's annexation.
  ["HANo", "1803-06-04", "1806-03-31"],
  // Prussia after Jena: its west at once; Breslau from 7 January 1807, Danzig from 24 May, Königsberg and East Prussia from
  // 16 June (after Friedland), Neisse and Upper Silesia from 16 June; Memel, the court's refuge, never.
  ["PR", JENA, TILSIT_EVE, [["POL:Lower Silesian Voivodeship/*", "1807-01-07"], ["POL/Gdańsk", "1807-05-24"], ["POL:Warmian-Masurian Voivodeship/*", "1807-06-16"],
    ["RUS:Kaliningrad/*", "1807-06-16"], ["POL:Opole Voivodeship/*", "1807-06-16"], ["LTU/Klaipėda", null]]],
  ["PRg", JENA, TILSIT_EVE],
  // Hanover again, Prussian since April 1806, and Brunswick, Hesse-Kassel, and Fulda.
  ["HANo", HESSE_OCC, TILSIT_EVE],
  ["BRU", JENA, TILSIT_EVE],
  ["HKo", HESSE_OCC, TILSIT_EVE],
  ["FUL", JENA, TILSIT_EVE],
  // Swedish Pomerania, from the fall of Rügen to the Treaty of Paris, and from the French invasion of January 1812 to the French
  // withdrawal of March 1813, when no treaty made it France's.
  ["SWPo", "1807-09-07", "1810-01-05"],
  ["SWPo", "1812-01-01", "1813-02-28"],
  // Moldavia and Wallachia, held by Russia through the Russo-Turkish War of 1806 to 1812.
  ["MOL", "1806-12-13", "1812-05-27"],
  ["WAL2", "1806-12-13", "1812-05-27"],
  // The campaigns of 1813 and 1814.
  ["WAR", "1813-02-08", ARMISTICE_EVE],
  ["SAX", "1813-10-19", ARMISTICE_EVE],
  ["BERGo", "1813-11-10", ARMISTICE_EVE],
  ["LUC", "1814-03-15", ARMISTICE_EVE],
  // The Ionian Islands Britain took from France: Zante, Cephalonia, Ithaca, and Cerigo from October 1809, Santa Maura from
  // April 1810 (Corfu was handed over after the peace).
  ["IONb", "1809-10-04", ARMISTICE_EVE]
];
// The occupiers' sides in the zones of control, by the ruler of the occupied owner.
export const WAR_OCC_SIDES = { fr: ["France", "#2f62b0"], ru: ["Russian Empire", "#2e7d4f"], pr: ["Kingdom of Prussia", "#3b3b3b"], at: ["Austrian Empire", "#c9a227"], uk: ["United Kingdom", "#b23a30"] };
const SIDE_OF = { "French Consulate": "fr", [FFE]: "fr", "Russian Empire": "ru", "Kingdom of Prussia": "pr", "Austrian Empire": "at", "United Kingdom": "uk" };

// Unit selectors: "DEU:Hesse/Kassel" is a unit of a province, "DEU/Kassel" a unit anywhere in the country, "DEU:Hesse/*" every
// unit of a province, "FRA/*" every unit of the country in Europe, "SVN@Gorenjska" every unit of a Natural Earth region,
// and boxes after a selector, "ITA/Livorno[10.0,42.6,10.5,42.9]", keep the unit's polygons whose centre lies in one of them ("[!...]"
// those outside all of them; several boxes are parted by ";"), to part an island from its mainland. A line after that,
// "{peene}", keeps the part of the unit inside one of the CUTS ("{!peene}" the part outside it).
const units = (country, list) => list.map((u) => country + "/" + u);

// Lines through units. The Peene, the border of Swedish and Prussian Pomerania from 1720 to 1815, from historical-basemaps'
// map of 1800, closed round the north.
const CUTS = {
  peene: [[[12.8, 54.6], [12.8, 53.944], [12.852, 53.944], [12.9, 53.928], [13.248, 53.966], [13.555, 53.827], [13.764, 53.877], [14.0, 53.877], [14.0, 54.6], [12.8, 54.6]]]
};

// Each row: [selectors, [[from, owner], ...]]. Germany by its districts.
const LAND = [];
const add = (sel, tl) => LAND.push([[].concat(sel), tl]);

// Hanover, by what became of each part: its south and Osnabrück went to Westphalia in 1807, its core in 1810, and its north and
// west (the Stade and Lüneburg lands, Hoya and Diepholz, and Lauenburg) to France with the Hanseatic decree.
const HAN_EARLY = [[W, "HAN"], ["1803-06-04", "HANo"], ["1806-04-01", "PR"], [HESSE_OCC, "HANo"]];
add(units("DEU", ["Göttingen", "Northeim", "Osnabrück", "Landkreis Osnabrück"]), HAN_EARLY.concat([[WESTPHALIA, "WEST"], [WESTPHALIA_END, "HAN"]]));
add(units("DEU", ["Region Hannover", "Celle", "Gifhorn", "Hameln-Pyrmont", "Heidekreis"]), HAN_EARLY.concat([[WESTPHALIA_HANOVER, "WEST"], [WESTPHALIA_END, "HAN"]]));
add(units("DEU", ["Stade", "Cuxhaven", "Rotenburg (Wümme)", "Verden", "Osterholz", "Harburg", "Landkreis Lüneburg", "Lüchow-Dannenberg", "Uelzen", "Nienburg (Weser)", "Diepholz", "Bremerhaven", "Herzogtum Lauenburg"]),
  HAN_EARLY.concat([[WESTPHALIA_HANOVER, "WEST"], [HANSE, "FR"], [WESTPHALIA_END, "HAN"]]));
add(["DEU/Grafschaft Bentheim"], HAN_EARLY.slice(0, 3).concat([[RHINE, "BERG"], [HANSE, "FR"], [WESTPHALIA_END, "HAN"]]));
// Brunswick.
add(units("DEU", ["Braunschweig", "Wolfenbüttel", "Salzgitter", "Helmstedt", "Wolfsburg", "Holzminden"]), [[W, "BRU"], [WESTPHALIA, "WEST"], [WESTPHALIA_END, "BRU"]]);
// Prussia's lands west of the Elbe, to Westphalia in 1807: the Altmark, Magdeburg, Halberstadt, Quedlinburg, Hildesheim and
// Goslar (Prussian from 1803), Minden and Ravensberg, Paderborn, the Eichsfeld, Mühlhausen, and Nordhausen.
add(units("DEU", ["Altmarkkreis Salzwedel", "Stendal", "Magdeburg", "Börde", "Salzlandkreis", "Harz", "Halle (Saale)", "Hildesheim", "Peine", "Goslar",
  "Minden-Lübbecke", "Herford", "Bielefeld", "Gütersloh", "Paderborn", "Höxter", "Eichsfeld", "Nordhausen", "Unstrut-Hainich-Kreis"]), [[W, "PRg"], [WESTPHALIA, "WEST"], [WESTPHALIA_END, "PRg"]]);
// Erfurt, kept by Napoleon as his own principality.
add(units("DEU", ["Erfurt", "Sömmerda"]), [[W, "PRg"], [TILSIT, "ERF"], ["1814-01-06", "PRg"]]);
// Brandenburg, Berlin, Prussian Pomerania, and the Elbe's east bank.
add(units("DEU", ["Berlin", "Barnim", "Brandenburg an der Havel", "Frankfurt (Oder)", "Havelland", "Märkisch-Oderland", "Oberhavel", "Oder-Spree", "Ostprignitz-Ruppin",
  "Potsdam", "Potsdam-Mittelmark", "Prignitz", "Teltow-Fläming", "Uckermark", "Jerichower Land",
  "Vorpommern-Greifswald[13.8,53.8,14.3,54.3]", "Vorpommern-Greifswald[!13.8,53.8,14.3,54.3]{!peene}"]), [[W, "PRg"]]);
add(["DEU/Cottbus"], [[W, "PRg"], [TILSIT, "SAX"], [SAXONY_SPLIT, "PRg"]]);
// Saxony, and what Prussia took of it in 1815: Lower Lusatia, the Wittenberg district, Merseburg, Naumburg, and Weißenfels,
// Mansfeld and Sangerhausen, Torgau and Delitzsch, Görlitz, and Suhl.
add(["DEU:Saxony/*"], [[W, "SAX"]]);
add(units("DEU", ["Spree-Neiße", "Oberspreewald-Lausitz", "Elbe-Elster", "Dahme-Spreewald", "Wittenberg", "Saalekreis", "Burgenlandkreis", "Mansfeld-Südharz",
  "Nordsachsen", "Görlitz", "Suhl"]), [[W, "SAX"], [SAXONY_SPLIT, "PRg"]]);
// Anhalt.
add(["DEU/Dessau-Roßlau"], [[W, "ADE"]]);
add(["DEU/Anhalt-Bitterfeld"], [[W, "AKO"]]);
// Mecklenburg and Swedish Pomerania.
add(units("DEU", ["Nordwestmecklenburg", "Schwerin", "Ludwigslust-Parchim", "Rostock", "Landkreis Rostock"]), [[W, "MS"]]);
add(["DEU/Mecklenburgische Seenplatte"], [[W, "MST"]]);
add(["DEU/Vorpommern-Rügen", "DEU/Vorpommern-Greifswald[!13.8,53.8,14.3,54.3]{peene}"], [[W, "SWP"], ["1807-09-07", "SWPo"], ["1810-01-06", "SWP"], ["1812-01-01", "SWPo"], ["1813-03-01", "SWP"]]);
// Schleswig, Holstein, and the Hanseatic cities.
add(units("DEU", ["Flensburg", "Nordfriesland", "Schleswig-Flensburg", "Rendsburg-Eckernförde"]), [[W, "SCHL"]]);
add(units("DEU", ["Kiel", "Neumünster", "Plön", "Ostholstein", "Segeberg", "Stormarn", "Pinneberg", "Steinburg", "Dithmarschen"]), [[W, "HOLS"]]);
add(["DEU/Lübeck"], [[W, "LUB"], [HANSE, "FR"], ["1813-12-05", "LUB"]]);
add(["DEU/Hamburg"], [[W, "HAM"], [HANSE, "FR"], ["1814-05-31", "HAM"]]);
add(["DEU/Bremen"], [[W, "BRE"], [HANSE, "FR"], ["1813-11-06", "BRE"]]);
// Oldenburg, with the Münster lands it gained in 1803.
add(units("DEU", ["Ammerland", "Oldenburg (Oldenburg)", "Landkreis Oldenburg", "Delmenhorst", "Wesermarsch", "Friesland", "Wilhelmshaven", "Cloppenburg", "Vechta"]), [[W, "OLD"], [HANSE, "FR"], ["1813-11-27", "OLD"]]);
// East Frisia: Prussian, Dutch from the Treaty of Fontainebleau, French with Holland.
add(units("DEU", ["Aurich", "Leer", "Emden", "Wittmund"]), [[W, "PRg"], ["1807-11-11", "BAT"], [HOLLAND, "FR"], ["1813-11-17", "PRg"]]);
// Arenberg's Meppen and Recklinghausen, and Salm's Bocholt.
add(["DEU/Emsland"], [[W, "ARB"], [HANSE, "FR"], ["1813-11-17", "PRg"]]);
add(["DEU/Recklinghausen"], [[W, "ARB"], [HANSE, "BERG"], ["1813-11-10", "BERGo"], [RHINELAND, "PRg"]]);
add(["DEU/Borken"], [[W, "SALM"], [HANSE, "FR"], ["1813-11-17", "PRg"]]);
// Prussia's Münster, Tecklenburg, Lingen, and Mark, to Berg in 1808, Münster and Tecklenburg on to France in 1810.
add(units("DEU", ["Münster", "Coesfeld", "Steinfurt", "Warendorf"]), [[W, "PRg"], ["1808-03-03", "BERG"], [HANSE, "FR"], ["1813-11-17", "PRg"]]);
add(units("DEU", ["Hamm", "Unna", "Hagen", "Märkischer Kreis", "Ennepe-Ruhr-Kreis", "Bochum", "Herne", "Gelsenkirchen", "Soest", "Bottrop"]), [[W, "PRg"], ["1808-03-03", "BERG"], ["1813-11-10", "BERGo"], [RHINELAND, "PRg"]]);
add(units("DEU", ["Essen"]), [[W, "PRg"], ["1806-10-27", "BERG"], ["1813-11-10", "BERGo"], [RHINELAND, "PRg"]]);
// Orange-Nassau's Dortmund, Siegen, and Dillenburg, and its Fulda.
add(["DEU/Dortmund"], [[W, "ORA"], [JENA, "BERG"], ["1813-11-10", "BERGo"], [RHINELAND, "PRg"]]);
add(["DEU/Siegen-Wittgenstein"], [[W, "ORA"], [JENA, "BERG"], ["1813-11-10", "BERGo"], ["1815-05-31", "PRg"]]);
add(["DEU/Lahn-Dill-Kreis"], [[W, "ORA"], [JENA, "BERG"], ["1813-11-10", "BERGo"], ["1815-05-31", "NUS"]]);
add(["DEU/Fulda"], [[W, "ORA"], [JENA, "FUL"], [FRANKFURT_GD, "ASC"], [WESTPHALIA_END, "PRg"]]);
// Lippe and Schaumburg-Lippe, and Waldeck.
add(["DEU/Lippe"], [[W, "LIP"]]);
add(["DEU/Schaumburg"], [[W, "SLI"]]);
add(["DEU/Waldeck-Frankenberg"], [[W, "WAL"]]);
// Berg, Bavaria's until 1806, with Cleves on the Rhine's right bank.
add(units("DEU", ["Düsseldorf", "Mettmann", "Solingen", "Remscheid", "Wuppertal", "Rheinisch-Bergischer Kreis", "Oberbergischer Kreis", "Leverkusen", "Rhein-Sieg-Kreis", "Mülheim an der Ruhr", "Oberhausen"]),
  [[W, "BERGb"], ["1806-03-15", "BERG"], ["1813-11-10", "BERGo"], [RHINELAND, "PRg"]]);
add(units("DEU", ["Wesel", "Duisburg"]), [[W, "PRg"], ["1806-03-15", "BERG"], ["1813-11-10", "BERGo"], [RHINELAND, "PRg"]]);
// The left bank of the Rhine: French until 1814; then Prussian-administered north of the Moselle and under the joint
// Austro-Bavarian commission on its right bank, Prussian from 5 April 1815; the Palatinate and Rhenish Hesse still under the
// joint commission in 1815. Saarbrücken, Saarlouis, and Landau stayed French in 1814 and 1815.
add(units("DEU", ["Kleve", "Krefeld", "Viersen", "Mönchengladbach", "Rhein-Kreis Neuss", "Köln", "Rhein-Erft-Kreis", "Bonn", "Städteregion Aachen", "Düren", "Heinsberg", "Euskirchen",
  "Ahrweiler", "Mayen-Koblenz", "Koblenz", "Vulkaneifel", "Eifelkreis Bitburg-Prüm", "Trier", "Trier-Saarburg", "Bernkastel-Wittlich", "Cochem-Zell"]), [[W, "FR"], [PARIS, "RHIo"], [RHINELAND, "PRg"]]);
add(units("DEU", ["Rhein-Hunsrück-Kreis", "Bad Kreuznach", "Birkenfeld", "Merzig-Wadern", "St. Wendel", "Neunkirchen"]), [[W, "FR"], [PARIS, "JOINT"], [VIENNA, "PRg"]]);
add(units("DEU", ["Mainz", "Mainz-Bingen", "Alzey-Worms", "Worms", "Donnersbergkreis", "Kusel", "Kaiserslautern", "Landkreis Kaiserslautern", "Bad Dürkheim", "Ludwigshafen am Rhein",
  "Rhein-Pfalz-Kreis", "Frankenthal (Pfalz)", "Speyer", "Neustadt an der Weinstraße", "Germersheim", "Südliche Weinstraße", "Pirmasens", "Südwestpfalz", "Zweibrücken", "Saarpfalz-Kreis"]), [[W, "FR"], [PARIS, "JOINT"]]);
add(units("DEU", ["Regionalverband Saarbrücken", "Saarlouis", "Landau in der Pfalz"]), [[W, "FR"]]);
// Nassau, with the Westerwald and Wied it gained in 1803 and 1806; Prussia took Altenkirchen and Neuwied in 1815.
add(units("DEU", ["Wiesbaden", "Rheingau-Taunus-Kreis", "Main-Taunus-Kreis", "Hochtaunuskreis", "Rhein-Lahn-Kreis"]), [[W, "NUS"]]);
add(units("DEU", ["Altenkirchen (Westerwald)"]), [[W, "NUS"], ["1815-05-31", "PRg"]]);
add(units("DEU", ["Limburg-Weilburg", "Westerwaldkreis"]), [[W, "NWE"]]);
add(units("DEU", ["Neuwied"]), [[W, "NWE"], ["1815-05-31", "PRg"]]);
// Hesse-Darmstadt, with the Duchy of Westphalia (Arnsberg) from 1803.
add(units("DEU", ["Darmstadt", "Darmstadt-Dieburg", "Groß-Gerau", "Bergstraße", "Odenwaldkreis", "Offenbach am Main", "Landkreis Offenbach", "Landkreis Gießen", "Vogelsbergkreis", "Wetteraukreis",
  "Hochsauerlandkreis", "Olpe"]), [[W, "HD"]]);
// Hesse-Kassel: occupied in November 1806, Westphalian from 1807, restored in 1813; Hanau went to Frankfurt instead.
add(units("DEU", ["Kassel", "Landkreis Kassel", "Schwalm-Eder-Kreis", "Werra-Meißner-Kreis", "Hersfeld-Rotenburg", "Marburg-Biedenkopf"]), [[W, "HK"], [HESSE_OCC, "HKo"], [WESTPHALIA, "WEST"], [WESTPHALIA_END, "HK"]]);
add(["DEU/Main-Kinzig-Kreis"], [[W, "HK"], [HESSE_OCC, "HKo"], [FRANKFURT_GD, "ASC"], [WESTPHALIA_END, "HK"]]);
// Frankfurt, and Dalberg's Aschaffenburg.
add(["DEU/Frankfurt am Main"], [[W, "FFM"], [RHINE, "ASC"], [WESTPHALIA_END, "FFM"]]);
add(units("DEU", ["Aschaffenburg", "Landkreis Aschaffenburg", "Miltenberg"]), [[W, "ASC"], [WESTPHALIA_END, "BAV"]]);
// Thuringia.
add(units("DEU", ["Weimar", "Weimarer Land", "Jena", "Wartburgkreis", "Eisenach"]), [[W, "SWE"]]);
add(units("DEU", ["Gotha", "Altenburger Land", "Saale-Holzland-Kreis"]), [[W, "SGA"]]);
add(units("DEU", ["Coburg", "Landkreis Coburg", "Sonneberg"]), [[W, "SCS"]]);
add(["DEU/Schmalkalden-Meiningen"], [[W, "SMEI"]]);
add(["DEU/Hildburghausen"], [[W, "SHI"]]);
add(units("DEU", ["Kyffhäuserkreis", "Ilm-Kreis"]), [[W, "SSO"]]);
add(["DEU/Saalfeld-Rudolstadt"], [[W, "SRU"]]);
add(["DEU/Greiz"], [[W, "REUe"]]);
add(units("DEU", ["Gera", "Saale-Orla-Kreis"]), [[W, "REUy"]]);
// Bavaria.
add(units("DEU", ["München", "Landkreis München", "Dachau", "Freising", "Erding", "Ebersberg", "Starnberg", "Fürstenfeldbruck", "Landsberg am Lech", "Weilheim-Schongau", "Garmisch-Partenkirchen",
  "Bad Tölz-Wolfratshausen", "Miesbach", "Rosenheim", "Landkreis Rosenheim", "Traunstein", "Altötting", "Mühldorf a. Inn", "Ingolstadt", "Pfaffenhofen a.d. Ilm", "Neuburg-Schrobenhausen",
  "Landshut", "Landkreis Landshut", "Kelheim", "Dingolfing-Landau", "Straubing", "Straubing-Bogen", "Deggendorf", "Regen", "Freyung-Grafenau", "Rottal-Inn", "Passau", "Landkreis Passau",
  "Landkreis Regensburg", "Amberg", "Amberg-Sulzbach", "Schwandorf", "Cham", "Neumarkt i.d. OPf.", "Neustadt a.d. Waldnaab", "Weiden i.d. Opf", "Tirschenreuth",
  "Landkreis Augsburg", "Aichach-Friedberg", "Dillingen a.d. Donau", "Neu-Ulm", "Donau-Ries", "Unterallgäu", "Memmingen", "Ostallgäu", "Kaufbeuren", "Kempten (Allgäu)", "Oberallgäu",
  "Bamberg", "Landkreis Bamberg", "Forchheim", "Lichtenfels", "Kronach"]), [[W, "BAV"]]);
add(units("DEU", ["Günzburg", "Lindau (Bodensee)"]), [[W, "AUS"], [PRESSBURG, "BAV"]]);
add(["DEU/Augsburg"], [[W, "AUG"], ["1806-03-04", "BAV"]]);
add(units("DEU", ["Nürnberg", "Nürnberger Land"]), [[W, "NUR"], ["1806-09-15", "BAV"]]);
add(units("DEU", ["Ansbach", "Landkreis Ansbach", "Fürth", "Landkreis Fürth", "Roth", "Schwabach", "Weißenburg-Gunzenhausen"]), [[W, "PRg"], ["1806-02-15", "BAV"]]);
add(units("DEU", ["Bayreuth", "Landkreis Bayreuth", "Kulmbach", "Hof", "Landkreis Hof", "Wunsiedel i. Fichtelgebirge", "Erlangen", "Erlangen-Höchstadt", "Neustadt a.d. Aisch-Bad Windsheim"]),
  [[W, "PRg"], [TILSIT, "BAY"], ["1810-06-30", "BAV"]]);
add(["DEU/Regensburg"], [[W, "REG"], ["1810-05-22", "BAV"]]);
add(["DEU/Eichstätt"], [[W, "SALZ"], [PRESSBURG, "BAV"]]);
add(["DEU/Berchtesgadener Land"], [[W, "SALZ"], [PRESSBURG, "AUS"], ["1810-09-12", "BAV"]]);
add(units("DEU", ["Würzburg", "Landkreis Würzburg", "Kitzingen", "Main-Spessart", "Bad Kissingen", "Rhön-Grabfeld", "Haßberge", "Schweinfurt", "Landkreis Schweinfurt"]),
  [[W, "BAV"], [PRESSBURG, "WZB"], ["1814-06-03", "BAV"]]);
// Baden, Württemberg, and the Austrian lands in Swabia.
add(units("DEU", ["Karlsruhe", "Landkreis Karlsruhe", "Pforzheim", "Baden-Baden", "Rastatt", "Heidelberg", "Mannheim", "Rhein-Neckar-Kreis", "Lörrach", "Emmendingen", "Enzkreis", "Ortenaukreis",
  "Schwarzwald-Baar-Kreis"]), [[W, "BAD"]]);
add(units("DEU", ["Freiburg im Breisgau", "Breisgau-Hochschwarzwald", "Waldshut", "Konstanz"]), [[W, "AUS"], [PRESSBURG, "BAD"]]);
add(units("DEU", ["Neckar-Odenwald-Kreis", "Main-Tauber-Kreis"]), [[W, "LEI"], [RHINE, "BAD"]]);
add(units("DEU", ["Stuttgart", "Ludwigsburg", "Böblingen", "Esslingen", "Rems-Murr-Kreis", "Göppingen", "Heilbronn", "Landkreis Heilbronn", "Reutlingen", "Landkreis Tübingen", "Calw",
  "Freudenstadt", "Zollernalbkreis", "Rottweil", "Tuttlingen", "Heidenheim", "Ostalbkreis", "Schwäbisch Hall", "Hohenlohekreis"]), [[W, "WUR"]]);
add(["DEU/Alb-Donau-Kreis"], [[W, "AUS"], [PRESSBURG, "WUR"]]);
add(["DEU/Biberach"], [[W, "BAD"], [RHINE, "WUR"]]);
add(units("DEU", ["Ulm"]), [[W, "BAV"], ["1810-05-18", "WUR"]]);
add(units("DEU", ["Ravensburg", "Bodenseekreis"]), [[W, "AUS"], [PRESSBURG, "BAV"], ["1810-05-18", "WUR"]]);
add(["DEU/Sigmaringen"], [[W, "HSI"]]);

// Austria, Bohemia, and Hungary. Salzburg was an electorate for Ferdinand of Tuscany from 1803, Austrian from 1805, and Bavarian
// from 1810 to 1816, with the Innviertel; Tyrol and Vorarlberg were Bavarian from 1805 to 1814; Upper Carinthia and East Tyrol
// were Illyrian from 1809 to 1814.
add(["AUT:Vienna/*", "AUT:Lower Austria/*", "AUT:Styria/*", "AUT:Burgenland/*", "CZE/*"].concat(units("AUT", ["Eferding", "Freistadt", "Gmunden", "Grieskirchen", "Kirchdorf an der Krems", "Linz", "Linz-Land",
  "Perg", "Rohrbach", "Steyr", "Steyr-Land", "Urfahr-Umgebung", "Vöcklabruck", "Wels", "Wels-Land", "Feldkirchen", "Klagenfurt", "Klagenfurt-Land", "Sankt Veit an der Glan", "Völkermarkt", "Wolfsberg"])), [[W, "AUSg"]]);
add(units("AUT", ["Braunau am Inn", "Ried im Innkreis", "Schärding"]), [[W, "AUSg"], [SCHONBRUNN, "BAV"]]);
add(["AUT:Salzburg/*"], [[W, "SALZ"], [PRESSBURG, "AUSg"], ["1810-09-12", "BAV"]]);
add(["AUT:Tyrol/*", "AUT:Vorarlberg/*"], [[W, "AUSg"], [PRESSBURG, "BAV"], ["1814-06-03", "AUSg"]]);
add(units("AUT", ["Villach", "Villach-Land", "Hermagor", "Spittal an der Drau"]), [[W, "AUSg"], [SCHONBRUNN, "ILL"], [PARIS, "AUSg"]]);
add(["HUN/*", "SVK/*", "UKR:Zakarpattia/*"], [[W, "AUS"]]);
add(units("ROU", ["Alba", "Arad", "Bihor", "Bistrița-Năsăud", "Brașov", "Caraș-Severin", "Cluj", "Covasna", "Harghita", "Hunedoara", "Maramureș", "Mureș", "Sălaj", "Satu Mare", "Sibiu", "Timiș", "Suceava"]), [[W, "AUS"]]);
add(units("SRB", ["South Bačka", "South Banat", "North Bačka", "North Banat", "Central Banat", "Srem", "West Bačka"]), [[W, "AUS"]]);
// Slovenia: Lower Styria and Prekmurje Austrian throughout; Carniola and the Littoral Illyrian from 1809.
add(["SVN@Podravska", "SVN@Koroška", "SVN@Savinjska", "SVN@Pomurska", "SVN@Spodnjeposavska"], [[W, "AUSg"]]);
add(["SVN@Gorenjska", "SVN@Osrednjeslovenska", "SVN@Jugovzhodna Slovenija", "SVN@Notranjsko-kraška", "SVN@Zasavska", "SVN@Goriška", "SVN@Obalno-kraška", "ITA/Gorizia", "ITA/Trieste"],
  [[W, "AUSg"], [SCHONBRUNN, "ILL"], [PARIS, "AUSg"]]);
// Croatia: civil Croatia and Slavonia Austrian; the land south of the Sava (Karlovac, the Littoral, and Lika) Illyrian from 1809;
// Venetian Istria and Dalmatia Austrian from 1797, Italian from Pressburg, Illyrian from 1809.
add(["HRV:Zagreb/*"].concat(units("HRV", ["Bjelovar-Bilogora", "Brod-Posavina", "Koprivnica-Križevci", "Krapina-Zagorje", "Međimurje", "Osijek-Baranja", "Požega-Slavonia", "Sisak-Moslavina", "Varaždin", "Virovitica-Podravina", "Vukovar-Syrmia"])), [[W, "AUS"]]);
add(["HRV/Karlovac", "HRV/Primorje-Gorski", "HRV/Lika-Senj"], [[W, "AUS"], [SCHONBRUNN, "ILL"], [PARIS, "AUS"]]);
add(["HRV/Istria", "HRV/Zadar", "HRV/Šibenik-Knin", "HRV/Split-Dalmatia", "MNE/Kotor", "MNE/Tivat", "MNE/Herceg Novi", "MNE/Budva"],
  [[W, "AUS"], ["1806-05-01", "ITR"], ["1810-06-10", "ILL"], [PARIS, "AUS"]]);
add(["HRV/Dubrovnik-Neretva"], [[W, "RAG"], ["1808-01-31", "ITR"], ["1810-06-10", "ILL"], [PARIS, "AUS"]]);
// Galicia, West Galicia (to the Duchy of Warsaw in 1809), Tarnopol (Russian from 1809 to 1815), and Bukovina.
add(["POL:Podkarpackie Voivodeship/*", "UKR:Lviv/*", "UKR:Ivano-Frankivsk/*"].concat(units("POL", ["Nowy Sącz", "Tarnów", "Powiat bocheński", "Powiat dąbrowski",
  "Powiat gorlicki", "Powiat limanowski", "Powiat myślenicki", "Powiat nowosądecki", "Powiat nowotarski", "Powiat oświęcimski", "Powiat suski", "Powiat tarnowski", "Powiat tatrzański",
  "Powiat wadowicki", "Powiat wielicki", "Powiat chrzanowski", "Powiat żywiecki", "Bielsko-Biała", "Powiat cieszyński"]), ["POL:Lesser Poland Voivodeship/Powiat brzeski", "POL:Silesian Voivodeship/Powiat bielski"]), [[W, "AUS"]]);
add(units("UKR:Ternopil", ["Berezhany", "Borshchiv", "Buchach", "Chortkiv", "Husiatyn", "Kozova", "Monastyryska", "Pidhaitsi", "Pidvolochysk", "Terebovlia", "Ternopil", "Zalishchyky", "Zbarazh", "Zboriv"]),
  [[W, "AUS"], [SCHONBRUNN, "RUS"], ["1815-06-09", "AUS"]]);
add(units("UKR:Chernivtsi", ["Hertsa", "Hlyboka", "Kitsman", "Putyla", "Storozhynets", "Vyzhnytsia", "Zastavna"]), [[W, "AUS"]]);
add(["POL/Kraków", "POL:Lesser Poland Voivodeship/Powiat krakowski"], [[W, "AUS"], [SCHONBRUNN, "WAR"], [VIENNA, "KRA"]]);
add(["POL:Lublin Voivodeship/*", "POL:Świętokrzyskie Voivodeship/*"].concat(units("POL", ["Powiat miechowski", "Powiat olkuski", "Powiat proszowicki", "Radom", "Powiat radomski", "Powiat przysuski",
  "Powiat szydłowiecki", "Powiat zwoleński", "Powiat lipski", "Powiat kozienicki", "Powiat białobrzeski", "Powiat garwoliński", "Powiat otwocki", "Powiat miński", "Siedlce", "Powiat siedlecki",
  "Powiat łosicki", "Powiat sokołowski", "Powiat węgrowski", "Powiat opoczyński"])), [[W, "AUS"], [SCHONBRUNN, "WAR"], ["1815-06-20", "CPL"]]);
add(["POL/Powiat siemiatycki"], [[W, "AUS"], [SCHONBRUNN, "WAR"], ["1815-06-20", "CPL"]]);

// Prussia's Polish lands: to the Duchy of Warsaw in 1807 (Białystok to Russia), then Congress Poland, the Grand Duchy of Posen
// (Prussian, outside the Confederation), and the Free City of Kraków in 1815.
const POSEN = units("POL", ["Poznań", "Leszno", "Powiat chodzieski", "Powiat czarnkowsko-trzcianecki", "Powiat gnieźnieński", "Powiat gostyński", "Powiat grodziski", "Powiat jarociński",
  "Powiat kępiński", "Powiat kościański", "Powiat krotoszyński", "Powiat leszczyński", "Powiat międzychodzki", "Powiat nowotomyski", "Powiat obornicki", "Powiat ostrowski", "Powiat ostrzeszowski",
  "Powiat pilski", "Powiat pleszewski", "Powiat poznański", "Powiat rawicki", "Powiat średzki", "Powiat śremski", "Powiat szamotulski", "Powiat wągrowiecki", "Powiat wolsztyński", "Powiat wrzesiński",
  "Bydgoszcz", "Powiat bydgoski", "Powiat inowrocławski", "Powiat mogileński", "Powiat żniński", "Powiat nakielski", "Powiat sępoleński", "Toruń", "Powiat toruński", "Powiat chełmiński",
  "Powiat wąbrzeski", "Powiat brodnicki", "Powiat golubsko-dobrzyński", "Powiat wschowski", "Powiat międzyrzecki"]).map((s) => s.replace("POL/Powiat średzki", "POL:Greater Poland Voivodeship/Powiat średzki").replace("POL/Powiat ostrowski", "POL:Greater Poland Voivodeship/Powiat ostrowski").replace("POL/Powiat grodziski", "POL:Greater Poland Voivodeship/Powiat grodziski"));
add(POSEN, [[W, "PR"], [TILSIT, "WAR"], ["1815-05-15", "PR"]]);
add(["POL:Łódź Voivodeship/*", "POL/Warszawa", "POL/Płock", "POL/Ostrołęka"].concat(units("POL", ["Kalisz", "Powiat kaliski", "Konin", "Powiat koniński", "Powiat turecki", "Powiat kolski",
  "Powiat słupecki", "Powiat aleksandrowski", "Powiat radziejowski", "Włocławek", "Powiat włocławski", "Powiat lipnowski", "Powiat rypiński", "Powiat ciechanowski", "Powiat gostyniński",
  "Powiat grodziski", "Powiat grójecki", "Powiat legionowski", "Powiat makowski", "Powiat mławski", "Powiat nowodworski", "Powiat ostrołęcki", "Powiat ostrowski", "Powiat piaseczyński",
  "Powiat płocki", "Powiat płoński", "Powiat pruszkowski", "Powiat przasnyski", "Powiat pułtuski", "Powiat sierpecki", "Powiat sochaczewski", "Powiat warszawski zachodni", "Powiat wołomiński",
  "Powiat wyszkowski", "Powiat żuromiński", "Powiat żyrardowski", "Łomża", "Powiat łomżyński", "Powiat kolneński", "Powiat grajewski", "Powiat zambrowski", "Powiat wysokomazowiecki",
  "Powiat augustowski", "Powiat suwalski", "Powiat sejneński", "Suwałki", "Częstochowa", "Powiat częstochowski", "Powiat kłobucki", "Powiat myszkowski", "Powiat zawierciański",
  "Powiat będziński", "Sosnowiec", "Dąbrowa Górnicza", "Jaworzno"]))
  .map((s) => s.replace("POL/Powiat grodziski", "POL:Masovian Voivodeship/Powiat grodziski").replace("POL/Powiat ostrowski", "POL:Masovian Voivodeship/Powiat ostrowski").replace("POL/Powiat nowodworski", "POL:Masovian Voivodeship/Powiat nowodworski")),
  [[W, "PR"], [TILSIT, "WAR"], ["1815-06-20", "CPL"]]);
add(units("POL", ["Białystok", "Powiat białostocki", "Powiat moniecki", "Powiat sokólski", "Powiat bielski", "Powiat hajnowski"]).map((s) => s.replace("POL/Powiat bielski", "POL:Podlaskie Voivodeship/Powiat bielski")),
  [[W, "PR"], [TILSIT, "RUS"]]);
add(["POL/Gdańsk"], [[W, "PR"], [TILSIT, "DAN"], ["1814-01-02", "PR"]]);
// The rest of West Prussia, East Prussia, Pomerania, Silesia, and the Neumark.
add(["POL:Warmian-Masurian Voivodeship/*", "POL:West Pomeranian Voivodeship/*", "POL:Lower Silesian Voivodeship/*", "POL:Opole Voivodeship/*", "RUS:Kaliningrad/*", "LTU/Klaipėda"]
  .concat(units("POL", ["Gdynia", "Sopot", "Słupsk", "Powiat bytowski", "Powiat chojnicki", "Powiat człuchowski", "Powiat gdański", "Powiat kartuski", "Powiat kościerski", "Powiat kwidzyński",
    "Powiat lęborski", "Powiat malborski", "Powiat pucki", "Powiat słupski", "Powiat starogardzki", "Powiat sztumski", "Powiat tczewski", "Powiat wejherowski", "Grudziądz", "Powiat grudziądzki",
    "Powiat świecki", "Powiat tucholski", "Powiat złotowski", "Gorzów Wielkopolski", "Powiat gorzowski", "Powiat krośnieński", "Powiat nowosolski", "Powiat słubicki", "Powiat strzelecko-drezdenecki",
    "Powiat sulęciński", "Powiat świebodziński", "Powiat żagański", "Powiat zielonogórski", "Zielona Góra", "Bytom", "Chorzów", "Gliwice", "Jastrzębie-Zdrój", "Katowice", "Mysłowice",
    "Piekary Śląskie", "Powiat bieruńsko-lędziński", "Powiat gliwicki", "Powiat lubliniecki", "Powiat mikołowski", "Powiat pszczyński", "Powiat raciborski", "Powiat rybnicki", "Powiat tarnogórski",
    "Powiat wodzisławski", "Ruda Śląska", "Rybnik", "Siemianowice Śląskie", "Świętochłowice", "Tychy", "Zabrze", "Żory"]))
  .map((s) => s.replace("POL/Powiat nowodworski", "POL:Pomeranian Voivodeship/Powiat nowodworski").replace("POL/Powiat krośnieński", "POL:Lubusz Voivodeship/Powiat krośnieński")).concat(["POL:Pomeranian Voivodeship/Powiat nowodworski"]).filter((s, i, a) => a.indexOf(s) === i), [[W, "PR"]]);
add(units("POL", ["Powiat zgorzelecki", "Powiat lubański", "Powiat żarski"]), [[W, "SAX"], [SAXONY_SPLIT, "PR"]]);

// Russia's lands in Europe, and Finland, Swedish until the Treaty of Fredrikshamn; Old Finland (South Karelia) joined the Grand
// Duchy in 1812. Bessarabia, Moldavia's land between the Prut and the Dniester, was Russian from the Treaty of Bucharest; the land
// beyond the Dniester had been Russian since 1792.
add(["MDA/*"], [[W, "MOL"], ["1812-05-28", "RUS"]]);
add(["LTU/*", "LVA/*", "EST/*", "BLR/*", "UKR:Volyn/*", "UKR:Rivne/*", "UKR:Zhytomyr/*", "UKR:Kyiv/*", "UKR:Khmelnytskyi/*", "UKR:Vinnytsia/*", "UKR:Cherkasy/*", "UKR:Chernihiv/*",
  "UKR:Sumy/*", "UKR:Poltava/*", "UKR:Kharkiv/*", "UKR:Luhansk/*", "UKR:Donetsk/*", "UKR:Dnipropetrovsk/*", "UKR:Zaporizhzhia/*", "UKR:Kherson/*", "UKR:Mykolaiv/*", "UKR:Kirovohrad/*",
  "RUS:Autonomous Republic of Crimea/*", "RUS:Sevastopol/*", "RUS:Leningrad/*", "RUS:Saint Petersburg/*", "RUS:Pskov/*", "RUS:Novgorod/*", "RUS:Tver/*", "RUS:Smolensk/*", "RUS:Bryansk/*",
  "RUS:Kaluga/*", "RUS:Moscow/*", "RUS:Tula/*", "RUS:Oryol/*", "RUS:Kursk/*", "RUS:Belgorod/*", "MDA:Transnistria/*", "MDA:Camenca/*", "MDA:Grigoriopol/*"]
  .concat(units("UKR:Ternopil", ["Kremenets", "Lanivtsi", "Shumsk"])).concat(units("UKR:Odessa", ["Ananiv", "Balta", "Berezivka", "Biliaivka", "Ivanivka", "Kodyma", "Liubashivka", "Lyman", "Mykolaivka", "Okny", "Ovidiopol", "Podilsk",
    "Rozdilna", "Savran", "Shyriaieve", "Velyka Mykhailivka", "Zakharivka"])), [[W, "RUS"]]);
add(["FIN/*", "ALD/*"], [[W, "SW"], ["1809-09-17", "FIN"]]);
add(["FIN/South Karelia"], [[W, "RUS"], ["1812-01-04", "FIN"]]);
// The Ottoman Budjak and Hotin, Russian with Bessarabia; Moldavia and Wallachia.
add(units("UKR:Odessa", ["Artsyz", "Bilhorod Dnistrovskyi", "Bolhrad", "Izmail", "Kiliia", "Reni", "Sarata", "Tarutyne", "Tatarbunary"]).concat(units("UKR:Chernivtsi", ["Kelmentsi", "Khotyn", "Novoselytsia", "Sokyriany"])), [[W, "OTT"], ["1812-05-28", "RUS"]]);
add(units("ROU", ["Iași", "Botoșani", "Neamț", "Bacău", "Vaslui", "Vrancea", "Galați"]), [[W, "MOL"]]);
add(units("ROU", ["Dolj", "Gorj", "Mehedinți", "Olt", "Vâlcea", "Argeș", "Dâmbovița", "Prahova", "Buzău", "Brăila", "Ialomița", "Călărași", "Giurgiu", "Teleorman", "Ilfov", "Bucharest"]), [[W, "WAL2"]]);
// The Ottoman Balkans: the Sanjak of Smederevo disputed during the Serbian uprisings; Montenegro; the Ionian Islands.
add(units("SRB", ["Belgrade", "Šumadija", "Podunavlje", "Braničevo", "Pomoravski", "Kolubara", "Mačva", "Moravica", "Zlatibor"]),
  [[W, "OTT"], ["1804-02-14", "SERd"], ["1813-10-07", "OTT"], ["1815-04-23", "SERd"]]);
add(["KOS/*", "BIH/*", "ALB/*", "MKD/*", "BGR/*"].concat(units("SRB", ["Bor", "Jablanica", "Nišava", "Pčinja", "Pirot", "Rasina", "Raška", "Toplica", "Zaječar"]), units("ROU", ["Constanța", "Tulcea"]), units("TUR", ["Edirne", "Kırklareli", "Tekirdağ", "Istanbul"]),
  units("GRC", ["East Macedonia and Thrace", "Attica", "Mount Athos", "West Greece", "West Macedonia", "Epirus", "Centre Macedonia", "Crete", "South Aegean", "Peloponnese", "Central Greece", "Thessalia", "North Aegean"]))
  .concat(units("MNE", ["Andrijevica", "Bar", "Berane", "Bijelo Polje", "Kolašin", "Mojkovac", "Nikšić", "Plav", "Pljevlja", "Plužine", "Podgorica", "Rožaje", "Šavnik", "Žabljak", "Ulcinj"])), [[W, "OTT"]]);
add(units("MNE", ["Cetinje", "Danilovgrad"]), [[W, "MNE"]]);
add(["GRC/Ionian Islands[!19.5,39.1,20.3,39.9;20.5,38.55,20.8,38.9]"], [[W, "ION"], ["1807-08-20", "FR"], ["1809-10-04", "IONb"]]);
add(["GRC/Ionian Islands[20.5,38.55,20.8,38.9]"], [[W, "ION"], ["1807-08-20", "FR"], ["1810-04-16", "IONb"]]);
add(["GRC/Ionian Islands[19.5,39.1,20.3,39.9]"], [[W, "ION"], ["1807-08-20", "FR"], [PARIS, "IONb"]]);

// Scandinavia.
add(["DNK/*"], [[W, "DN"]]);
add(["NOR/*"], [[W, "DN"], ["1814-01-14", "NORd"], ["1814-11-04", "SW"]]);
add(["SWE/*"], [[W, "SW"]]);

// The Low Countries and Luxembourg.
add(["NLD/*"], [[W, "BAT"], [HOLLAND, "FR"], ["1813-12-02", "BAT"]]);
add(["NLD/North Brabant", "NLD/Zeeland"], [[W, "BAT"], ["1810-03-16", "FR"], ["1813-12-02", "BAT"]]);
add(["NLD/Limburg"], [[W, "FR"], [PARIS, "BEL"], ["1815-03-16", "BAT"]]);
add(["BEL/*"], [[W, "FR"], [PARIS, "BEL"], ["1815-03-16", "BAT"]]);
add(["LUX/*", "BEL/Luxembourg"], [[W, "FR"], [PARIS, "BEL"], ["1815-03-16", "LUX"]]);

// France, Switzerland, and Iberia.
add(["FRA/*"], [[W, "FR"]]);
add(["FRA/Savoie", "FRA/Haute-Savoie", "FRA/Alpes-Maritimes"], [[W, "FR"], [PARIS, "SAR"]]);
add(["CHE/*"], [[W, "SWI"]]);
add(["CHE/Valais"], [[W, "VAL"], ["1810-11-12", "FR"], ["1813-12-31", "SWI"]]);
add(["CHE/Geneva", "CHE/Jura"], [[W, "FR"], ["1813-12-31", "SWI"]]);
add(["CHE/Neuchâtel"], [[W, "NEU"], [VIENNA, "SWI"]]);
add(["PRT/*"], [[W, "POR"]]);
add(["ESP/*"], [[W, "SPA"], ["1808-05-06", "SPAd"], ["1813-12-11", "SPA"]]);
add(["ESP/Balearic Islands", "ESP/Las Palmas", "ESP/Santa Cruz de Tenerife", "ESP/Ceuta", "ESP/Melilla"], [[W, "SPA"]]);
add(["ESP/Barcelona", "ESP/Girona", "ESP/Lleida", "ESP/Tarragona"], [[W, "SPA"], ["1808-05-06", "SPAd"], ["1812-01-26", "CATd"], ["1814-03-10", "SPA"]]);

// Italy.
add(["ITA/Turin", "ITA/Cuneo", "ITA/Asti", "ITA/Alessandria", "ITA/Vercelli", "ITA/Biella", "ITA/Aosta"], [[W, "FR"], ["1814-05-20", "SAR"]]);
add(["ITA/Novara", "ITA/Verbano-Cusio-Ossola"], [[W, "ITR"], ["1814-05-20", "SAR"]]);
add(units("ITA", ["Cagliari", "Sassari", "Nuoro", "Oristano", "Ogliastra", "Olbia-Tempio", "Carbonia-Iglesias", "Medio Campidano"]), [[W, "SAR"]]);
add(["ITA/Liguria", "ITA/Savona", "ITA/Imperia", "ITA/La Spezia"], [[W, "LIG"], ["1805-06-04", "FR"], ["1814-04-26", "GEN"], ["1815-01-07", "SAR"]]);
add(["ITA/Parma", "ITA/Piacenza"], [[W, "FR"], ["1814-04-11", "PAR"]]);
add(["ITA/Milan", "ITA/Monza and Brianza", "ITA/Lodi", "ITA/Varese", "ITA/Como", "ITA/Lecco", "ITA/Bergamo", "ITA/Brescia", "ITA/Cremona", "ITA/Mantua", "ITA/Pavia", "ITA/Sondrio", "ITA/Rovigo"],
  [[W, "ITR"], ["1814-04-28", "AUS"], [VIENNA, "LV"]]);
add(["ITA/Venice", "ITA/Padua", "ITA/Vicenza", "ITA/Verona", "ITA/Treviso", "ITA/Belluno", "ITA/Udine", "ITA/Pordenone"], [[W, "AUS"], ["1806-05-01", "ITR"], ["1814-04-28", "AUS"], [VIENNA, "LV"]]);
add(["ITA/Trentino", "ITA/Trentino-South Tyrol"], [[W, "AUSg"], [PRESSBURG, "BAV"], ["1810-06-10", "ITR"], ["1814-04-28", "AUSg"]]);
add(["ITA/Modena", "ITA/Reggio Emilia"], [[W, "ITR"], ["1814-04-28", "MOD"]]);
add(["ITA/Bologna", "ITA/Ferrara", "ITA/Ravenna", "ITA/Forlì-Cesena", "ITA/Rimini"], [[W, "ITR"], ["1814-04-28", "AUSo"], [VIENNA, "PAP"]]);
add(["ITA/Ancona", "ITA/Macerata", "ITA/Fermo", "ITA/Ascoli Piceno", "ITA/Pesaro and Urbino"], [[W, "PAP"], ["1808-04-02", "ITR"], ["1814-04-28", "NAPo"], [VIENNA, "PAP"]]);
add(["ITA/Rome", "ITA/Viterbo", "ITA/Rieti", "ITA/Frosinone", "ITA/Latina", "ITA/Perugia", "ITA/Terni"], [[W, "PAP"], ["1809-05-17", "FR"], ["1814-05-24", "PAP"]]);
add(["ITA/Florence", "ITA/Prato", "ITA/Pistoia", "ITA/Pisa", "ITA/Siena", "ITA/Arezzo", "ITA/Grosseto", "ITA/Livorno[!10.0,42.6,10.5,42.9]"], [[W, "ETR"], ["1807-12-10", "FR"], ["1814-05-01", "TUS"]]);
add(["ITA/Livorno[10.0,42.6,10.5,42.9]"], [[W, "FR"], ["1814-05-04", "ELB"], ["1815-02-26", "TUS"]]);
add(["ITA/Lucca"], [[W, "LUC"]]);
add(["ITA/Massa-Carrara"], [[W, "ITR"], ["1806-03-30", "LUC"], ["1814-03-15", "MAS"]]);
add(units("ITA", ["Naples", "Avellino", "Benevento", "Caserta", "Salerno", "Catanzaro", "Cosenza", "Crotone", "Reggio Calabria", "Vibo Valentia", "Matera", "Potenza", "Bari", "Barletta-Andria-Trani", "Brindisi", "Foggia", "Lecce", "Taranto", "Chieti", "L'Aquila", "Pescara", "Teramo", "Campobasso", "Isernia"]), [[W, "NAP"]]);
add(units("ITA", ["Agrigento", "Caltanissetta", "Catania", "Enna", "Messina", "Palermo", "Ragusa", "Syracuse", "Trapani"]), [[W, "SIC"]]);

// Every owner a span can have, for checking.
export const OWNER_KEYS = Object.keys(O);


const DAY_MS = 86400000, DAY_1886 = Date.UTC(1886, 0, 1) / DAY_MS;
const toDay = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DAY_MS;
const isoOf = (d) => new Date(d * DAY_MS).toISOString().slice(0, 10);
const july = (y) => toDay(y + "-07-01");
// The years whose 1 July falls between days a and b.
const yearsOf = (a, b) => { const ya = +isoOf(a).slice(0, 4), yb = +isoOf(b).slice(0, 4); return [a <= july(ya) ? ya : ya + 1, b >= july(yb) ? yb : yb - 1]; };

// A timeline [[from, x], ...] as periods {a, b, x} in days; a period that takes in no 1 July is dropped, and the one before it
// runs on in its place.
function periods(tl, log, what) {
  const end = toDay(END);
  if (tl[0][0] !== W) throw new Error("napoleonic: " + what + " does not start on " + W);
  const list = tl.map(([from, x]) => ({ a: toDay(from), x }));
  list.forEach((p, i) => { if (i && p.a <= list[i - 1].a) throw new Error("napoleonic: " + what + " has its dates out of order at " + isoOf(p.a)); p.b = i + 1 < list.length ? list[i + 1].a - 1 : end; });
  for (;;) {
    const k = list.findIndex((p) => { const [f, l] = yearsOf(p.a, p.b); return f > l; });
    if (k < 0) return list;
    const p = list[k];
    log(what + ": " + isoOf(p.a) + " to " + isoOf(p.b) + " takes in no 1 July, so it is dropped");
    if (k === 0) list[1].a = p.a; else list[k - 1].b = p.b;
    list.splice(k, 1);
  }
}

// env: the units topology and its provinces (UCHRONIA), topojson-client, Natural Earth's provinces (for their regions), and the
// builder's rewind and polysOf.
export function buildNapoleonic(env) {
  const { topo, provinces, client, clip, neAll, rewind, polysOf, log = () => {} } = env;
  const geoms = topo.objects.units.geometries;
  // A unit's Natural Earth region: the region of the Natural Earth province that holds the centre of its largest polygon.
  const inRing = (ring, p) => { let k = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) if ((ring[i][1] > p[1]) !== (ring[j][1] > p[1]) && p[0] < ring[i][0] + ((p[1] - ring[i][1]) * (ring[j][0] - ring[i][0])) / (ring[j][1] - ring[i][1])) k = !k; return k; };
  const regionOf = (c, i) => {
    const polys = polysAt(i);
    if (!polys.length) return null;
    const big = polys.reduce((m, p) => (p[0].length > m[0].length ? p : m));
    const pt = big[0].reduce((s, q) => [s[0] + q[0] / big[0].length, s[1] + q[1] / big[0].length], [0, 0]);
    const f = neAll.find((x) => x.properties.adm0_a3 === c && x.properties.region && rewind(polysOf(x.geometry)).some((poly) => inRing(poly[0], pt)));
    return f ? f.properties.region : null;
  };
  const byCountry = new Map();
  geoms.forEach((g, i) => {
    const pr = provinces[g.properties.p];
    if (!byCountry.has(pr.c)) byCountry.set(pr.c, []);
    byCountry.get(pr.c).push({ i, n: g.properties.n, prov: pr.n });
  });
  const centre = (poly) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const q of poly[0]) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); } return [(x0 + x1) / 2, (y0 + y1) / 2]; };
  const polysAt = (i) => { const g = client.feature(topo, geoms[i]).geometry; return g ? rewind(polysOf(g)) : []; };
  const inEurope = (i) => { const p = polysAt(i); if (!p.length) return false; const c = centre(p[0]); return c[0] > -32 && c[0] < 50 && c[1] > 26 && c[1] < 72; };
  // A selector as items [unit index, box filter or null, key].
  const resolve = (sel) => {
    let filter = null, base = sel;
    const c = base.match(/^(.*)\{(!?)(\w+)\}$/);
    if (c) { if (!CUTS[c[3]]) throw new Error("napoleonic: no cut " + c[3]); base = c[1]; filter = { cut: CUTS[c[3]], cutOut: c[2] === "!", cutKey: "{" + c[2] + c[3] + "}" }; }
    const m = base.match(/^(.*)\[(!?)([-\d.,;]+)\]$/);
    if (m) { base = m[1]; filter = { ...filter, out: m[2] === "!", boxes: m[3].split(";").map((b) => b.split(",").map(Number)) }; }
    let hits;
    if (base.includes("@")) {
      const [c, r] = base.split("@");
      hits = (byCountry.get(c) || []).filter((u) => { if (u.region === undefined) u.region = regionOf(c, u.i); return u.region === r; });
    } else {
      const slash = base.indexOf("/"), head = base.slice(0, slash), name = base.slice(slash + 1);
      const [c, prov] = head.split(":");
      const pool = (byCountry.get(c) || []).filter((u) => !prov || u.prov === prov);
      hits = name === "*" ? pool.filter((u) => prov || inEurope(u.i)) : pool.filter((u) => u.n === name);
      if (!prov && name !== "*" && hits.length > 1) { errors.push(sel + " names " + hits.length + " units; give its province"); return []; }
    }
    if (!hits.length) { errors.push("no unit for " + sel); return []; }
    return hits.map((u) => [u.i, filter, u.i + (filter ? (filter.boxes ? (filter.out ? "!" : "") + filter.boxes.join(";") : "") + (filter.cutKey || "") : "")]);
  };
  // Rows resolve in order, and a unit a later row names leaves the rows before it, so a country's "*" can be refined.
  const errors = [];
  const rows = LAND.map(([sels, tl], k) => {
    for (const [, o] of tl) if (!O[o]) throw new Error("napoleonic: no owner " + o);
    return { k, items: sels.flatMap(resolve), tl };
  });
  if (errors.length) throw new Error("napoleonic: " + errors.join("; "));
  const last = new Map();
  rows.forEach((r) => r.items.forEach(([i, , key]) => { last.set(key, r); last.set(String(i), r); }));
  rows.forEach((r) => { r.items = r.items.filter(([i, f, key]) => last.get(key) === r && (f || last.get(String(i)) === r)); });
  // The occupations of the wars (WAR_OCC): their land day by day for the zones of control, then the main map's timelines without
  // them. A dedicated owner (occupied from its first day, as HANo) gives way in LAND to the owner before it; an owner occupied by
  // a change of its attributes (as Prussia) has that change put off to the day after the war, with the rest of the change too if
  // the days between take in no 1 July (when the change could not be drawn on its own).
  const endDay = toDay(END);
  const rawAttr = (key, d) => { let a = {}; for (const [from, ch] of O[key]) if (toDay(from) <= d) a = { ...a, ...ch }; return a; };
  const dedicated = (key) => O[key][0][1].status === 4;
  const OW = { ...O }, pieces = [];
  for (const [key, from, to, later = []] of WAR_OCC) {
    if (!O[key]) throw new Error("napoleonic: WAR_OCC names no owner " + key);
    const f = toDay(from), t = toDay(to), late = new Map();
    for (const [sel, day] of later) for (const [i] of resolve(sel)) late.set(i, day === null ? Infinity : toDay(day));
    let hit = 0;
    for (const r of rows) r.tl.forEach(([d, o], k) => {
      if (o !== key) return;
      const a = Math.max(f, toDay(d)), b = Math.min(t, k + 1 < r.tl.length ? toDay(r.tl[k + 1][0]) - 1 : endDay);
      if (a > b) return;
      const at = rawAttr(key, a);
      if (at.status !== 4) throw new Error("napoleonic: " + key + " is not occupied on " + isoOf(a));
      const side = SIDE_OF[at.ruler === "@FR" ? rawAttr("FR", a).name : at.ruler];
      if (!side) throw new Error("napoleonic: no side for " + at.ruler);
      for (const it of r.items) { const s = Math.max(a, late.has(it[0]) ? late.get(it[0]) : a); if (s <= b) { pieces.push({ item: it, a: s, b, side }); hit++; } }
    });
    if (!hit) throw new Error("napoleonic: WAR_OCC " + key + " from " + from + " has no land");
    if (dedicated(key)) {
      for (const r of rows) {
        const tl = [];
        r.tl.forEach(([d, o], k) => {
          const a = toDay(d), b = k + 1 < r.tl.length ? toDay(r.tl[k + 1][0]) - 1 : endDay;
          if (o !== key || b < f || a > t) { tl.push([d, o]); return; }
          if (!k) throw new Error("napoleonic: " + key + " has no owner before it");
          if (a < f) tl.push([d, o]);
          tl.push([isoOf(Math.max(a, f)), r.tl[k - 1][1]]);
          if (b > t) tl.push([isoOf(t + 1), o]);
        });
        r.tl = tl.filter((e, k) => !k || e[1] !== tl[k - 1][1]);
      }
    } else {
      const tl = OW[key].slice(), k = tl.findIndex(([d, ch]) => toDay(d) >= f && toDay(d) <= t && ch.status === 4);
      if (k < 0) throw new Error("napoleonic: " + key + " has no occupation from " + from);
      const [d, ch] = tl[k], next = k + 1 < tl.length ? toDay(tl[k + 1][0]) : endDay + 1, after = t + 1;
      const rest = { ...ch };
      delete rest.ruler; delete rest.status;
      const [y0, y1] = yearsOf(toDay(d), t), keep = Object.keys(rest).length > 0 && y0 <= y1;
      const moved = keep ? { ruler: ch.ruler, status: 4 } : ch;
      tl.splice(k, 1, ...(keep ? [[d, rest]] : []));
      if (after < next) {
        const at = tl.findIndex(([x]) => toDay(x) >= after);
        if (at >= 0 && toDay(tl[at][0]) === after) tl[at] = [tl[at][0], { ...moved, ...tl[at][1] }];
        else tl.splice(at < 0 ? tl.length : at, 0, [isoOf(after), moved]);
      }
      OW[key] = tl;
    }
  }
  if (errors.length) throw new Error("napoleonic: " + errors.join("; "));
  const blocks = rows.filter((r) => r.items.length).map((r) => ({ items: r.items, per: periods(r.tl, log, "land row " + r.k + " (" + r.tl.map((t) => t.join(" ")).join(", ") + ")") }));
  // Each owner's attributes, period by period.
  const attrs = {};
  for (const [key, tl] of Object.entries(OW)) {
    let prev = {};
    attrs[key] = periods(tl.map(([from, ch]) => { prev = { ...prev, ...ch }; return [from, prev]; }), log, "owner " + key);
  }
  const attrAt = (key, d) => attrs[key].find((p) => p.a <= d && d <= p.b).x;
  // Each owner's land in pieces: the blocks it gained on one day and lost on one day are one piece, cut where the owner's
  // attributes change and on the day the Holy Roman Empire ended (the builder makes its members from its outline, by year), so
  // a state that changed shape several times in a year changes on each of those days. Pieces of one state meet with no border
  // on the page, and a piece carries the name unless a larger one of the same name is on the map for at least half its days.
  const groups = new Map();
  for (const blk of blocks) for (const p of blk.per) {
    const k = p.x + "|" + p.a + "|" + p.b;
    if (!groups.has(k)) groups.set(k, { owner: p.x, a: p.a, b: p.b, items: [] });
    groups.get(k).items.push(...blk.items);
  }
  const end = toDay(END), spans = [];
  for (const g of groups.values()) {
    const fr = attrs[g.owner].some((p) => p.x.ruler === "@FR");
    const cuts = [...new Set([g.a, ...attrs[g.owner].concat(fr ? attrs.FR : []).map((p) => p.a).concat([toDay(HRE_END)]).filter((d) => d > g.a && d <= g.b)])].sort((x, y) => x - y).map((a) => ({ a, at: a }));
    // A stretch that takes in no 1 July takes the attributes of the stretch after it (or, at the end, of the one before it).
    for (;;) {
      const k = cuts.findIndex((c, n) => { const [f, l] = yearsOf(c.a, n + 1 < cuts.length ? cuts[n + 1].a - 1 : g.b); return f > l; });
      if (k < 0 || cuts.length < 2) break;
      if (k + 1 < cuts.length) { cuts[k].at = cuts[k + 1].at; cuts.splice(k + 1, 1); } else cuts.splice(k, 1);
    }
    cuts.forEach((c, n) => {
      const at = attrAt(g.owner, c.at), ruler = at.ruler === "@FR" ? attrAt("FR", c.at).name : at.ruler || "";
      spans.push({ name: at.name, wiki: at.wiki || at.name, ruler, status: at.status || 0, part: at.part || "", b: at.b ?? 1, claims: at.claims || null, host: !!at.host, items: g.items, da: c.a, db: n + 1 < cuts.length ? cuts[n + 1].a - 1 : g.b });
    });
  }
  // Pieces of one owner with the same attributes over the same days are one span.
  const same = new Map();
  for (const s of spans) {
    const k = JSON.stringify({ ...s, items: null });
    if (same.has(k)) same.get(k).items = same.get(k).items.concat(s.items); else same.set(k, { ...s });
  }
  spans.splice(0, spans.length, ...same.values());
  // Shapes: whole units merged along their shared arcs, and units cut by a box taken polygon by polygon.
  const shapes = new Map();
  const shapeOf = (items) => {
    const key = items.map((x) => x[2]).sort().join(",");
    if (shapes.has(key)) return shapes.get(key);
    const whole = items.filter(([, f]) => !f).map(([i]) => geoms[i]);
    let polys = whole.length ? rewind(polysOf(client.merge(topo, whole))) : [];
    for (const [i, f] of items) {
      if (!f) continue;
      let p = polysAt(i);
      if (f.boxes) p = p.filter((poly) => { const c = centre(poly), inside = f.boxes.some((b) => c[0] >= b[0] && c[0] <= b[2] && c[1] >= b[1] && c[1] <= b[3]); return f.out ? !inside : inside; });
      if (f.cut && p.length) p = rewind((f.cutOut ? clip.difference : clip.intersection)(p, [f.cut]));
      polys = polys.concat(p);
    }
    shapes.set(key, polys);
    return polys;
  };
  const out = [];
  for (const s of spans) {
    const [first, lastY] = yearsOf(s.da, s.db);
    if (first > lastY) { log("span " + s.name + " " + isoOf(s.da) + " to " + isoOf(s.db) + " takes in no 1 July, so it is left out"); continue; }
    const polys = shapeOf(s.items);
    if (!polys.length) continue;
    out.push({ name: s.name, wiki: s.wiki, ruler: s.ruler, status: s.status, part: s.part, b: s.b, ...(s.claims ? { claims: s.claims.slice().sort(), noLabel: false } : {}), host: s.host,
      first, last: lastY, dayFrom: s.da > toDay(W) ? [first, s.da - DAY_1886] : null, dayTo: s.db < end ? [lastY, s.db - DAY_1886] : null, from: isoOf(s.da), to: isoOf(s.db), polys });
  }
  const size = (polys) => polys.reduce((t, poly) => { let s = 0; const r = poly[0]; for (let i = 0; i + 1 < r.length; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return t + Math.abs(s) * Math.cos((r[0][1] * Math.PI) / 180); }, 0);
  out.forEach((s) => { s.size = size(s.polys); });
  const len = (s) => toDay(s.to) - toDay(s.from) + 1, shared = (s, t) => Math.min(toDay(s.to), toDay(t.to)) - Math.max(toDay(s.from), toDay(t.from)) + 1;
  for (const s of out) if (out.some((t) => t !== s && t.name === s.name && t.size > s.size && shared(s, t) >= 0.5 * len(s))) s.noLabel = true;
  out.forEach((s) => { delete s.size; });
  // The occupations of the wars as each side's land from day to day: a row for every stretch of days on which a side held the
  // same land, days counted from 1 January 1886.
  const days = [...new Set(pieces.flatMap((p) => [p.a, p.b + 1]))].sort((x, y) => x - y), open = new Map(), war = [];
  for (let n = 0; n + 1 < days.length; n++) {
    const a = days[n], b = days[n + 1] - 1, bySide = new Map();
    for (const p of pieces) if (p.a <= a && b <= p.b) { if (!bySide.has(p.side)) bySide.set(p.side, new Map()); bySide.get(p.side).set(p.item[2], p.item); }
    for (const side of [...open.keys()]) if (!bySide.has(side)) open.delete(side);
    for (const [side, items] of bySide) {
      const sig = [...items.keys()].sort().join(","), r = open.get(side);
      if (r && r.sig === sig) { r.b = b; continue; }
      const row = { side, a, b, sig, items: [...items.values()] };
      war.push(row);
      open.set(side, row);
    }
  }
  const warRows = war.map((r) => ({ side: r.side, from: isoOf(r.a), to: isoOf(r.b), first: r.a - DAY_1886, last: r.b - DAY_1886, polys: shapeOf(r.items) }));
  return { spans: out, mask: shapeOf(blocks.flatMap((b) => b.items)), units: blocks.reduce((n, b) => n + b.items.length, 0), war: warRows };
}
