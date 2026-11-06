// Europe from 1803 to 1885, for the dated maps: the states, client kingdoms, annexations, and occupations of the Napoleonic
// Wars, and the Europe of the Congress of Vienna that followed, to the eve of CShapes's first year (1886), drawn from UCHRONIA's second-level units (Germany's districts, Poland's powiats, Austria's and Czechia's districts,
// Ukraine's raions) and its provinces (Natural Earth's first-level units elsewhere). The main map shows what treaties and
// decrees made (the law on the map): annexations, client states and personal unions under their ruler, and formal military
// occupations under an occupying administration as occupied (status 4) once the war that brought them had ended in a peace or an
// armistice. The occupations made in the wars themselves (WAR_OCC) are drawn in the zones of control (tools/napoleonic-control.mjs)
// and leave the land its lawful owner's on the main map, as the First World War's do. Land two rival governments both claimed is disputed
// (status 6): Spain between Joseph Bonaparte and the patriot government, Catalonia between the French Empire and the patriots,
// Norway in 1814, Serbia between the rebels and the Ottomans, Greece in its War of Independence, Limburg and Luxembourg between
// Belgium and the Netherlands from 1830 to 1839, the duchies Austria and Prussia held together from 1864, and the Italian states
// between their old rulers and the revolution in 1859 and 1860. Armies on the march are not drawn.
//
// LAND gives each block of units its owner from date to date, OWNERS each owner's name, ruler, status, and part from date to
// date. A span is one owner with one set of blocks and one set of attributes. Every year is the state of things on 1 July, as
// elsewhere in the builder, and each span keeps its real first and last day: a period that takes in no 1 July is dropped (its
// land stays with the owner before), and a span that begins on the window's first day keeps the days the dated table gives it.
// Russia and the Ottoman Empire are hosts: their blocks join their spans from the sources, which run on outside Europe.

export const NAPOLEONIC_FROM = 1648, NAPOLEONIC_TO = 1885;
export const HOSTS = new Set(["Tsardom of Russia", "Russian Empire", "Ottoman Empire"]);
const W = "1803-01-01", END = "1885-12-31";
// The table begins on 1 January 1648 (EARLY), the year of the Peace of Westphalia; W, 1 January 1803, is where its rows first
// stood, and each row's history before it comes from PRE (below).
const EARLY = "1648-01-01";
// Dates before 1803.
const WESTPHALIA_1648 = "1648-10-24", CATALONIA_1652 = "1652-10-13", PEREYASLAV = "1654-01-18", WEHLAU = "1657-09-19", ROSKILDE = "1658-02-26";
const PYRENEES = "1659-11-07", COPENHAGEN_1660 = "1660-05-27", VINCENNES = "1661-02-28", ANDRUSOVO = "1667-01-30", AACHEN_1668 = "1668-05-02";
const LORRAINE_1670 = "1670-08-26", CANDIA = "1669-09-27", BUCZACZ = "1672-10-18", NIJMEGEN = "1678-09-17", NIJMEGEN_EMP = "1679-02-05";
const STRASBOURG = "1681-09-30", RATISBON = "1684-08-15", ETERNAL_PEACE = "1686-05-06", RYSWICK = "1697-10-30", KARLOWITZ = "1699-01-26";
// Milan fell to the Habsburgs after Turin (1706), Naples in 1707, and the island of Sardinia in 1708; Spain took Sardinia
// back in 1717 (the island was its by November). Mulhouse, a republic allied to the Swiss, joined France in 1798.
const MILAN_1706 = "1706-09-24", NAPLES_1707 = "1707-07-07", SARDINIA_1708 = "1708-08-13", SARDINIA_1717 = "1717-11-01", MULHOUSE_1798 = "1798-03-15";
const PRUSSIA_KINGDOM = "1701-01-18", SUCCESSION_EAST = "1705-10-09", ALMANSA = "1707-04-25", MANTUA_1708 = "1708-06-30", UTRECHT = "1713-04-11";
const RASTATT = "1714-03-07", BARCELONA_1714 = "1714-09-11", MALLORCA_1715 = "1715-07-02", PASSAROWITZ = "1718-07-21", STOCKHOLM_1719 = "1719-11-20";
const STOCKHOLM_1720 = "1720-01-21", FREDERIKSBORG = "1720-07-03", SARDINIA_1720 = "1720-08-08", NYSTAD = "1721-09-10", RUSSIA_EMPIRE = "1721-11-02";
const VIENNA_1735 = "1735-10-03", HANAU_1736 = "1736-03-28", STANISLAS = "1737-03-21", VIENNA_1738 = "1738-11-18", BELGRADE_1739 = "1739-09-18";
const BERLIN_1742 = "1742-07-28", EAST_FRISIA = "1744-05-25", AACHEN_1748 = "1748-10-18", CORSICA_1755 = "1755-07-14", HETMANATE_END = "1764-11-21";
const LORRAINE_1766 = "1766-02-23", CORSICA_1768 = "1768-05-15", BAYREUTH_1769 = "1769-01-20", BADEN_1771 = "1771-10-21", PARTITION_1 = "1772-08-05";
const GOTTORP = "1773-11-16", OLDENBURG_1773 = "1773-12-14", KAINARJI = "1774-07-21", SICH_END = "1775-08-14", BUKOVINA = "1775-05-07";
const PALATINATE_BAVARIA = "1777-12-30", TESCHEN = "1779-05-13", CRIMEA_1783 = "1783-04-19", MINORCA_1783 = "1783-09-03";
const UNITED_BELGIAN = "1790-01-11", UNITED_BELGIAN_END = "1790-12-02", AVIGNON = "1791-09-14", JASSY = "1792-01-09", ANSBACH_PRUSSIA = "1792-01-28";
const REPUBLIC_1792 = "1792-09-21", SAVOY_1792 = "1792-11-27", PARTITION_2 = "1793-01-23", NICE_1793 = "1793-01-31", BASEL_1793 = "1793-03-23";
const ANGLO_CORSICA = "1794-06-19", ANGLO_CORSICA_END = "1796-10-19", BATAVIA = "1795-01-19", PARTITION_3 = "1795-10-24", ANNEX_BELGIUM = "1795-10-01";
const DIRECTORY = "1795-11-02", CISPADANE = "1797-03-19", LIGURIA = "1797-06-14", CISALPINE = "1797-06-29", CISALPINE_UNION = "1797-07-09";
const CAMPO_FORMIO = "1797-10-17", LEFT_BANK = "1798-01-23", ROMAN_REPUBLIC = "1798-02-15", HELVETIC = "1798-04-12", GENEVA_1798 = "1798-04-26";
const ROMAN_REPUBLIC_END = "1799-09-30", CONSULATE = "1799-11-10", SEPTINSULAR = "1800-03-21", ETRURIA = "1801-08-02", ITALIAN_REPUBLIC = "1802-01-26";
const INDEMNITIES = "1802-08-03", ELECTORS_1803 = "1803-04-27", MEDIATION = "1803-03-10";

// Dates.
const PRESSBURG = "1805-12-26", RHINE = "1806-07-12", HRE_END = "1806-08-06", JENA = "1806-10-27", HESSE_OCC = "1806-11-01";
const TILSIT = "1807-07-09", WESTPHALIA = "1807-08-18", PRUSSIA_FREE = "1808-12-03", SCHONBRUNN = "1809-10-14";
const FRANKFURT_GD = "1810-02-16", WESTPHALIA_HANOVER = "1810-03-01", HOLLAND = "1810-07-09", HANSE = "1810-12-13";
const WESTPHALIA_END = "1813-10-26", PARIS = "1814-05-30", MOSELLE = "1814-06-16", RHINELAND = "1815-04-05";
const RHINE_END = "1813-11-04", SAXONY_SPLIT = "1815-05-18", CONFEDERATION = "1815-06-08", VIENNA = "1815-06-09";
// After 1815.
const HANOVER_PRUSSIA = "1815-05-29", PARIS2 = "1815-11-20", MUNICH = "1816-04-14", BELGIUM = "1830-10-04", LONDON = "1839-04-19";
const ZURICH = "1859-11-10", EMILIA = "1860-03-18", TUSCANY_SAR = "1860-03-22", NICE = "1860-06-14", ANNEX_SOUTH = "1860-12-17", ITALY = "1861-03-17";
const VIENNA_1864 = "1864-10-30", GASTEIN = "1865-08-14", PRAGUE = "1866-08-23", GC_END = "1866-08-24", ANNEX_1866 = "1866-09-20";
const SAXE_1826 = "1826-11-12", POLAND_END = "1867-01-01", VENETIA = "1866-10-19", NGC = "1867-07-01", ROME = "1870-10-09", EMPIRE = "1871-01-18", FRANKFURT_1871 = "1871-05-10", BERLIN = "1878-07-13";

// Owners: each an attribute timeline, [[from, changes], ...], where the changes add to or replace what came before.
// "@FR" as a ruler is France under its regime of the day.
const FFE = "First French Empire";
const O = {
  FR: [[EARLY, { name: "Kingdom of France", wiki: "Kingdom of France", b: 2 }], [REPUBLIC_1792, { name: "French First Republic", wiki: "French First Republic", b: 1 }],
    [DIRECTORY, { name: "French Directory", wiki: "French Directory" }], [CONSULATE, { name: "French Consulate", wiki: "French Consulate" }], ["1804-05-18", { name: FFE, wiki: FFE }], [PARIS, { name: "Bourbon Kingdom of France", wiki: "Bourbon Restoration in France" }], [PARIS2, { b: 2 }],
    ["1830-08-09", { name: "Kingdom of the French", wiki: "July Monarchy" }], ["1848-02-24", { name: "French Second Republic", wiki: "French Second Republic" }],
    ["1852-12-02", { name: "Second French Empire", wiki: "Second French Empire" }], ["1870-09-04", { name: "French Third Republic", wiki: "French Third Republic" }]],
  ILL: [[W, { name: "Illyrian Provinces", ruler: FFE, status: 5 }]],
  // Iberia.
  POR: [[W, { name: "Kingdom of Portugal", b: 2 }]],
  SPA: [[W, { name: "Kingdom of Spain", b: 2 }]],
  SPAd: [[W, { name: "Spain", wiki: "Spain under Joseph Bonaparte", status: 6, claims: ["Kingdom of Spain", "Spain under Joseph Bonaparte"], b: 2 }]],
  CATd: [[W, { name: "Catalonia", wiki: "French departments of Catalonia", status: 6, claims: [FFE, "Kingdom of Spain"], b: 2 }]],
  // The Low Countries.
  BAT: [[EARLY, { name: "Dutch Republic", wiki: "Dutch Republic", b: 2 }], [BATAVIA, { name: "Batavian Republic", wiki: "Batavian Republic", b: 1 }], ["1806-06-05", { name: "Kingdom of Holland", ruler: FFE, status: 5 }], ["1813-12-02", { name: "Sovereign Principality of the United Netherlands", ruler: "", status: 0 }], ["1815-03-16", { name: "Netherlands", wiki: "United Kingdom of the Netherlands" }], [VIENNA, { b: 2 }]],
  BEL: [[W, { name: "Southern Netherlands", wiki: "United Kingdom of the Netherlands", ruler: "Sovereign Principality of the United Netherlands", status: 4 }]],
  LUX: [[W, { name: "Luxembourg", wiki: "Grand Duchy of Luxembourg", ruler: "Netherlands", status: 5, part: "German Confederation", b: 2 }]],
  BELG: [[W, { name: "Kingdom of Belgium", wiki: "Belgium", b: 2 }]],
  // Limburg and Luxembourg outside their fortresses (Maastricht and Luxembourg), held by Belgium from its revolution to the Treaty of
  // London, which the Netherlands refused until then.
  LIMd: [[W, { name: "Limburg", wiki: "Belgian Revolution", status: 6, claims: ["Kingdom of Belgium", "Netherlands"] }]],
  LUXd: [[W, { name: "Luxembourg", wiki: "Belgian Revolution", status: 6, claims: ["Kingdom of Belgium", "Luxembourg"] }]],
  LIMB: [[W, { name: "Duchy of Limburg", wiki: "Duchy of Limburg (1839–1867)", ruler: "Netherlands", status: 5, part: "German Confederation" }]],
  // Switzerland and its neighbours.
  SWI: [[EARLY, { name: "Swiss Confederation", wiki: "Old Swiss Confederacy", b: 2 }], [HELVETIC, { name: "Helvetic Republic", wiki: "Helvetic Republic", b: 1 }],
    [MEDIATION, { name: "Swiss Confederation", wiki: "Swiss Confederation (1803–1815)" }], [VIENNA, { b: 2 }]],
  VAL: [[W, { name: "Rhodanic Republic" }]],
  NEU: [[EARLY, { name: "Principality of Neuchâtel" }], ["1707-11-03", { ruler: "Kingdom of Prussia", status: 5 }], ["1806-03-30", { ruler: FFE }], ["1814-06-03", { ruler: "Kingdom of Prussia" }]],
  // Italy.
  ITR: [[EARLY, { name: "Cisalpine Republic", wiki: "Cisalpine Republic", ruler: "@FR", status: 5 }], [ITALIAN_REPUBLIC, { name: "Italian Republic", wiki: "Italian Republic (1802–1805)" }], ["1805-03-17", { name: "Kingdom of Italy", wiki: "Kingdom of Italy (Napoleonic)", ruler: FFE }]],
  LIG: [[W, { name: "Ligurian Republic", wiki: "Ligurian Republic" }]],
  GEN: [[W, { name: "Republic of Genoa", wiki: "Republic of Genoa (1814)" }]],
  SAR: [[EARLY, { name: "Duchy of Savoy", wiki: "Duchy of Savoy", b: 2 }], [SARDINIA_1720, { name: "Kingdom of Sardinia", wiki: "Kingdom of Sardinia" }], [ZURICH, { b: 1 }], [ITALY, { name: "Kingdom of Italy", wiki: "Kingdom of Italy", b: 2 }]],
  ETR: [[W, { name: "Kingdom of Etruria" }]],
  TUS: [[W, { name: "Grand Duchy of Tuscany" }]],
  LUC: [[W, { name: "Republic of Lucca" }], ["1805-06-23", { name: "Principality of Lucca and Piombino", ruler: FFE, status: 5 }], ["1814-03-15", { name: "Lucca", wiki: "Duchy of Lucca", ruler: "Austrian Empire", status: 4 }], [VIENNA, { name: "Duchy of Lucca", ruler: "", status: 0 }]],
  MAS: [[W, { name: "Duchy of Massa and Carrara" }]],
  ELB: [[W, { name: "Principality of Elba" }]],
  PAR: [[EARLY, { name: "Duchy of Parma and Piacenza" }], [VIENNA_1735, { ruler: "Habsburg Monarchy", status: 5 }], [AACHEN_1748, { ruler: "", status: 0 }]],
  MOD: [[W, { name: "Duchy of Modena and Reggio" }]],
  PAP: [[W, { name: "Papal States" }]],
  NAP: [[EARLY, { name: "Kingdom of Naples", ruler: "Kingdom of Spain", status: 5 }], [NAPLES_1707, { ruler: "Habsburg Monarchy" }], [VIENNA_1735, { ruler: "", status: 0 }], ["1806-02-14", { ruler: FFE, status: 5 }], ["1814-01-11", { ruler: "", status: 0 }], ["1816-12-08", { name: "Kingdom of the Two Sicilies" }]],
  NAPo: [[W, { name: "Papal States", wiki: "Papal States", ruler: "Kingdom of Naples", status: 4 }]],
  SIC: [[EARLY, { name: "Kingdom of Sicily", ruler: "Kingdom of Spain", status: 5, b: 2 }], [UTRECHT, { ruler: "Duchy of Savoy" }], [SARDINIA_1720, { ruler: "Habsburg Monarchy" }],
    [VIENNA_1735, { ruler: "", status: 0 }], ["1816-12-08", { name: "Kingdom of the Two Sicilies" }]],
  // The Italian states between their rulers and the revolution: the duchies and the Legations from their rulers' flight to the
  // decrees of annexation of March 1860 (the United Provinces of Central Italy governed them), and the Two Sicilies from
  // Garibaldi's taking of Palermo and of Naples to the decree of December 1860.
  TUSd: [[W, { name: "Grand Duchy of Tuscany", wiki: "United Provinces of Central Italy", status: 6, claims: ["Grand Duchy of Tuscany", "United Provinces of Central Italy"] }]],
  MODd: [[W, { name: "Duchy of Modena and Reggio", wiki: "United Provinces of Central Italy", status: 6, claims: ["Duchy of Modena and Reggio", "United Provinces of Central Italy"] }]],
  PARd: [[W, { name: "Duchy of Parma and Piacenza", wiki: "United Provinces of Central Italy", status: 6, claims: ["Duchy of Parma and Piacenza", "United Provinces of Central Italy"] }]],
  LEGd: [[W, { name: "Papal States", wiki: "United Provinces of Central Italy", status: 6, claims: ["Papal States", "United Provinces of Central Italy"] }]],
  SICd: [[W, { name: "Kingdom of the Two Sicilies", wiki: "Expedition of the Thousand", status: 6, claims: ["Kingdom of the Two Sicilies", "Kingdom of Sardinia"], b: 2 }]],
  NAPd: [[W, { name: "Kingdom of the Two Sicilies", wiki: "Expedition of the Thousand", status: 6, claims: ["Kingdom of the Two Sicilies", "Kingdom of Sardinia"] }]],
  LV: [[W, { name: "Kingdom of Lombardy–Venetia", ruler: "Austrian Empire", status: 5 }]],
  AUSo: [[W, { name: "Papal States", ruler: "Austrian Empire", status: 4 }]],
  RAG: [[W, { name: "Republic of Ragusa" }]],
  ION: [[W, { name: "Septinsular Republic", ruler: "Ottoman Empire", status: 5 }]],
  IONb: [[W, { name: "Ionian Islands", wiki: "United States of the Ionian Islands", ruler: "United Kingdom", status: 4 }]],
  IONp: [[W, { name: "United States of the Ionian Islands", ruler: "United Kingdom", status: 5 }]],
  // Austria.
  AUS: [[W, { name: "Habsburg Monarchy" }], ["1804-08-11", { name: "Austrian Empire" }], [VIENNA, { b: 2 }], ["1867-03-30", { name: "Austria-Hungary" }]],
  AUSg: [[W, { name: "Habsburg Monarchy" }], ["1804-08-11", { name: "Austrian Empire" }], [CONFEDERATION, { part: "German Confederation" }], [VIENNA, { b: 2 }], ["1867-03-30", { name: "Austria-Hungary" }]],
  BOSo: [[W, { name: "Bosnia and Herzegovina", wiki: "Bosnia and Herzegovina under Austro-Hungarian rule", ruler: "Austria-Hungary", status: 4 }]],
  SALZ: [[EARLY, { name: "Prince-Archbishopric of Salzburg", wiki: "Prince-Archbishopric of Salzburg" }], ["1803-02-25", { name: "Electorate of Salzburg", wiki: "Electorate of Salzburg" }]],
  // Germany.
  PR: [[EARLY, { name: "Brandenburg-Prussia", wiki: "Brandenburg-Prussia" }], [PRUSSIA_KINGDOM, { name: "Kingdom of Prussia", wiki: "Kingdom of Prussia" }], [JENA, { ruler: FFE, status: 4 }], [PRUSSIA_FREE, { ruler: "", status: 0 }], [VIENNA, { b: 2 }]],
  PRg: [[EARLY, { name: "Brandenburg-Prussia", wiki: "Brandenburg-Prussia" }], [PRUSSIA_KINGDOM, { name: "Kingdom of Prussia", wiki: "Kingdom of Prussia" }], [JENA, { ruler: FFE, status: 4 }], [PRUSSIA_FREE, { ruler: "", status: 0 }], [CONFEDERATION, { part: "German Confederation" }], [VIENNA, { b: 2 }]],
  BAV: [[W, { name: "Electorate of Bavaria" }], ["1806-01-01", { name: "Kingdom of Bavaria" }], [RHINE, { part: "Confederation of the Rhine" }], ["1813-10-08", { part: "" }], [CONFEDERATION, { part: "German Confederation" }], [VIENNA, { b: 2 }]],
  BERGb: [[W, { name: "Duchy of Berg", ruler: "Electorate of Bavaria", status: 5 }]],
  WUR: [[EARLY, { name: "Duchy of Württemberg", wiki: "Duchy of Württemberg" }], [ELECTORS_1803, { name: "Electorate of Württemberg", wiki: "Electorate of Württemberg" }], ["1806-01-01", { name: "Kingdom of Württemberg" }], [RHINE, { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }], [VIENNA, { b: 2 }]],
  BAD: [[EARLY, { name: "Margraviate of Baden-Durlach", wiki: "Margraviate of Baden-Durlach" }], [BADEN_1771, { name: "Margraviate of Baden", wiki: "Margraviate of Baden" }],
    [ELECTORS_1803, { name: "Electorate of Baden", wiki: "Electorate of Baden" }], [RHINE, { name: "Grand Duchy of Baden", part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }], [VIENNA, { b: 2 }]],
  HD: [[W, { name: "Landgraviate of Hesse-Darmstadt" }], [RHINE, { part: "Confederation of the Rhine" }], ["1806-08-13", { name: "Grand Duchy of Hesse" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  HK: [[EARLY, { name: "Landgraviate of Hesse-Kassel", wiki: "Landgraviate of Hesse-Kassel" }], [ELECTORS_1803, { name: "Electorate of Hesse", wiki: "Electorate of Hesse" }], [CONFEDERATION, { part: "German Confederation" }]],
  HKo: [[W, { name: "Electorate of Hesse", ruler: FFE, status: 4 }]],
  HAN: [[EARLY, { name: "Principality of Calenberg", wiki: "Principality of Calenberg" }], ["1692-12-19", { name: "Electorate of Hanover", wiki: "Electorate of Hanover" }], ["1814-10-12", { name: "Kingdom of Hanover" }], [CONFEDERATION, { part: "German Confederation" }], [VIENNA, { b: 2 }]],
  HANo: [[W, { name: "Electorate of Hanover", ruler: "@FR", status: 4 }]],
  SAX: [[W, { name: "Electorate of Saxony" }], ["1806-12-20", { name: "Kingdom of Saxony", part: "Confederation of the Rhine" }], ["1813-10-19", { part: "", ruler: "Russian Empire", status: 4 }], ["1814-11-10", { ruler: "Kingdom of Prussia" }], ["1815-06-07", { ruler: "", status: 0, part: "German Confederation" }]],
  WEST: [[W, { name: "Kingdom of Westphalia", ruler: FFE, status: 5 }], ["1807-11-15", { part: "Confederation of the Rhine" }]],
  BERG: [[W, { name: "Grand Duchy of Berg", ruler: FFE, status: 5 }], [RHINE, { part: "Confederation of the Rhine" }]],
  BERGo: [[W, { name: "Grand Duchy of Berg", ruler: "Kingdom of Prussia", status: 4 }]],
  RHIo: [[W, { name: "General Government of the Lower and Middle Rhine", wiki: "Grand Duchy of the Lower Rhine", ruler: "Kingdom of Prussia", status: 4 }]],
  JOINT: [[W, { name: "Joint Austro-Bavarian administration", wiki: "Circle of the Rhine", ruler: "Austrian Empire", status: 4 }], [VIENNA, { status: 5 }]],
  BRU: [[W, { name: "Duchy of Brunswick" }], [JENA, { ruler: FFE, status: 4 }], [WESTPHALIA_END, { ruler: "", status: 0 }], [CONFEDERATION, { part: "German Confederation" }]],
  OLD: [[W, { name: "Duchy of Oldenburg" }], ["1808-10-14", { part: "Confederation of the Rhine" }], [HANSE, { part: "" }], [CONFEDERATION, { part: "German Confederation" }], ["1829-05-21", { name: "Grand Duchy of Oldenburg" }]],
  MS: [[W, { name: "Duchy of Mecklenburg-Schwerin" }], ["1808-03-22", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation", name: "Grand Duchy of Mecklenburg-Schwerin" }]],
  MST: [[W, { name: "Duchy of Mecklenburg-Strelitz" }], ["1808-02-18", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation", name: "Grand Duchy of Mecklenburg-Strelitz" }]],
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
  ADE: [[W, { name: "Principality of Anhalt-Dessau" }], ["1807-04-11", { name: "Duchy of Anhalt-Dessau", part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }], ["1863-08-19", { name: "Duchy of Anhalt" }]],
  AKO: [[W, { name: "Principality of Anhalt-Köthen" }], ["1807-04-11", { name: "Duchy of Anhalt-Köthen", part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  SWE: [[W, { name: "Duchy of Saxe-Weimar-Eisenach" }], ["1806-12-15", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], ["1815-04-21", { name: "Grand Duchy of Saxe-Weimar-Eisenach" }], [CONFEDERATION, { part: "German Confederation" }]],
  SGA: [[W, { name: "Duchy of Saxe-Gotha-Altenburg" }], ["1806-12-15", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  SCS: [[W, { name: "Duchy of Saxe-Coburg-Saalfeld" }], ["1806-12-15", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }], [SAXE_1826, { name: "Duchy of Saxe-Coburg and Gotha" }]],
  SMEI: [[W, { name: "Duchy of Saxe-Meiningen" }], ["1806-12-15", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  SHI: [[W, { name: "Duchy of Saxe-Hildburghausen" }], ["1806-12-15", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }], [SAXE_1826, { name: "Duchy of Saxe-Altenburg" }]],
  SSO: [[W, { name: "Principality of Schwarzburg-Sondershausen" }], ["1807-04-11", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  SRU: [[W, { name: "Principality of Schwarzburg-Rudolstadt" }], ["1807-04-11", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  REUe: [[W, { name: "Principality of Reuss-Greiz" }], ["1807-04-11", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  REUy: [[W, { name: "Principality of Reuss-Gera" }], ["1807-04-11", { part: "Confederation of the Rhine" }], [RHINE_END, { part: "" }], [CONFEDERATION, { part: "German Confederation" }]],
  HAM: [[W, { name: "Free City of Hamburg" }], [CONFEDERATION, { part: "German Confederation" }]],
  BRE: [[W, { name: "Free City of Bremen" }], [CONFEDERATION, { part: "German Confederation" }]],
  LUB: [[W, { name: "Free City of Lübeck" }], [CONFEDERATION, { part: "German Confederation" }]],
  // Lauenburg, Danish from the treaty of Prussia and Denmark of 4 June 1815, the King of Prussia's from Gastein.
  LAU: [[W, { name: "Duchy of Saxe-Lauenburg", ruler: "Kingdom of Denmark", status: 5, part: "German Confederation" }], ["1865-09-15", { ruler: "Kingdom of Prussia" }]],
  // The North German Confederation of 1867 and the German Empire, each one state, as CShapes draws Germany from 1886.
  GER: [[W, { name: "North German Confederation", b: 2 }], [EMPIRE, { name: "German Empire" }]],
  // Scandinavia.
  DN: [[W, { name: "Denmark-Norway", b: 2 }], ["1814-01-14", { name: "Kingdom of Denmark" }]],
  SCHL: [[W, { name: "Duchy of Schleswig", ruler: "Denmark-Norway", status: 5, b: 2 }], ["1814-01-14", { ruler: "Kingdom of Denmark" }]],
  HOLS: [[W, { name: "Duchy of Holstein", ruler: "Denmark-Norway", status: 5, b: 2 }], ["1814-01-14", { ruler: "Kingdom of Denmark" }], [CONFEDERATION, { part: "German Confederation" }]],
  // Schleswig, Holstein, and Lauenburg, ceded by Denmark to Austria and Prussia together at the Treaty of Vienna; from Gastein,
  // Prussia governed Schleswig and Austria Holstein, until the Peace of Prague gave Prussia both.
  SHd: [[W, { name: "Schleswig-Holstein", wiki: "Schleswig-Holstein question", status: 6, claims: ["Austrian Empire", "Kingdom of Prussia"], b: 2 }]],
  SCHLp: [[W, { name: "Duchy of Schleswig", ruler: "Kingdom of Prussia", status: 5, b: 2 }]],
  HOLSa: [[W, { name: "Duchy of Holstein", ruler: "Austrian Empire", status: 5, part: "German Confederation", b: 2 }]],
  HEL: [[W, { name: "Heligoland", ruler: "United Kingdom", status: 5 }]],
  NORd: [[W, { name: "Norway", wiki: "Norway in 1814", status: 6, claims: ["Kingdom of Norway", "Kingdom of Sweden"], b: 2 }]],
  SW: [[EARLY, { name: "Swedish Empire", wiki: "Swedish Empire", b: 2 }], [NYSTAD, { name: "Kingdom of Sweden", wiki: "Kingdom of Sweden" }], ["1814-11-04", { name: "United Kingdoms of Sweden and Norway" }]],
  SWP: [[EARLY, { name: "Swedish Pomerania", ruler: "Swedish Empire", status: 5 }], [NYSTAD, { ruler: "Kingdom of Sweden" }], ["1814-11-04", { ruler: "United Kingdoms of Sweden and Norway" }]],
  SWPo: [[W, { name: "Swedish Pomerania", ruler: FFE, status: 4 }]],
  FIN: [[W, { name: "Grand Duchy of Finland", ruler: "Russian Empire", status: 5, b: 2 }]],
  // Poland.
  WAR: [[W, { name: "Duchy of Warsaw", ruler: "Kingdom of Saxony", status: 5 }], ["1813-02-08", { ruler: "Russian Empire", status: 4 }]],
  DAN: [[W, { name: "Free City of Danzig" }]],
  KRA: [[W, { name: "Free City of Krakow", wiki: "Free City of Kraków" }]],
  CPL: [[W, { name: "Congress Poland", ruler: "Russian Empire", status: 5 }]],
  // The east and the Balkans.
  RUS: [[EARLY, { name: "Tsardom of Russia", wiki: "Tsardom of Russia", host: true }], [RUSSIA_EMPIRE, { name: "Russian Empire", wiki: "Russian Empire" }]],
  OTT: [[W, { name: "Ottoman Empire", host: true }]],
  MOL: [[W, { name: "Principality of Moldavia", ruler: "Ottoman Empire", status: 5 }], ["1806-12-13", { ruler: "Russian Empire", status: 4 }], ["1812-05-28", { ruler: "Ottoman Empire", status: 5 }], ["1859-02-05", { name: "United Principalities of Moldavia and Wallachia", wiki: "United Principalities" }],
    ["1862-02-05", { name: "Principality of Romania", wiki: "Principality of Romania" }], [BERLIN, { ruler: "", status: 0 }], ["1881-03-26", { name: "Kingdom of Romania", wiki: "Kingdom of Romania" }]],
  WAL2: [[W, { name: "Principality of Wallachia", ruler: "Ottoman Empire", status: 5 }], ["1806-12-13", { ruler: "Russian Empire", status: 4 }], ["1812-05-28", { ruler: "Ottoman Empire", status: 5 }], ["1859-02-05", { name: "United Principalities of Moldavia and Wallachia", wiki: "United Principalities" }],
    ["1862-02-05", { name: "Principality of Romania", wiki: "Principality of Romania" }], [BERLIN, { ruler: "", status: 0 }], ["1881-03-26", { name: "Kingdom of Romania", wiki: "Kingdom of Romania" }]],
  SERd: [[W, { name: "Sanjak of Smederevo", wiki: "First Serbian Uprising", status: 6, claims: ["Revolutionary Serbia", "Ottoman Empire"] }], ["1815-04-23", { wiki: "Second Serbian Uprising" }]],
  MNE: [[W, { name: "Prince-Bishopric of Montenegro" }], ["1852-03-13", { name: "Principality of Montenegro" }]],
  SER: [[W, { name: "Principality of Serbia", ruler: "Ottoman Empire", status: 5 }], [BERLIN, { ruler: "", status: 0 }], ["1882-03-06", { name: "Kingdom of Serbia" }]],
  BUL: [[W, { name: "Principality of Bulgaria", ruler: "Ottoman Empire", status: 5 }]],
  ERU: [[W, { name: "Eastern Rumelia", ruler: "Ottoman Empire", status: 5 }]],
  GRCd: [[W, { name: "Greece", wiki: "Greek War of Independence", status: 6, claims: ["First Hellenic Republic", "Ottoman Empire"] }]],
  GRE: [[W, { name: "First Hellenic Republic", wiki: "First Hellenic Republic" }], ["1832-05-07", { name: "Kingdom of Greece", wiki: "Kingdom of Greece" }]],

  // Owners of the years before 1803.
  // Iberia: Catalonia in its revolt under French protection, the Crown of Aragon for the Archduke Charles in the War of the Spanish
  // Succession, and British Minorca.
  CATd1: [[EARLY, { name: "Catalonia", wiki: "Reapers' War", status: 6, claims: ["Kingdom of France", "Kingdom of Spain"], b: 2 }]],
  ARAd: [[EARLY, { name: "Crown of Aragon", wiki: "War of the Spanish Succession", status: 6, claims: ["Habsburg Monarchy", "Kingdom of Spain"], b: 2 }]],
  MIN: [[EARLY, { name: "Minorca", wiki: "British rule in Minorca", ruler: "Kingdom of Great Britain", status: 5, b: 2 }]],
  // The Low Countries: the Spanish, then Austrian, Netherlands (Luxembourg kept apart, since it stayed out of the United Belgian
  // States of 1790), and Liège.
  SNL: [[EARLY, { name: "Spanish Netherlands", wiki: "Spanish Netherlands", ruler: "Kingdom of Spain", status: 5, b: 2 }], [RASTATT, { name: "Austrian Netherlands", wiki: "Austrian Netherlands", ruler: "Habsburg Monarchy" }],
    [UNITED_BELGIAN, { name: "United Belgian States", wiki: "United Belgian States", ruler: "", status: 0 }], [UNITED_BELGIAN_END, { name: "Austrian Netherlands", wiki: "Austrian Netherlands", ruler: "Habsburg Monarchy", status: 5 }]],
  SNLx: [[EARLY, { name: "Spanish Netherlands", wiki: "Spanish Netherlands", ruler: "Kingdom of Spain", status: 5, b: 2 }], [RASTATT, { name: "Austrian Netherlands", wiki: "Austrian Netherlands", ruler: "Habsburg Monarchy" }]],
  LIE: [[EARLY, { name: "Prince-Bishopric of Liège", wiki: "Prince-Bishopric of Liège" }]],
  // France's neighbours: Franche-Comté, Lorraine (occupied by France until the Treaty of Vincennes and again from 1670 to the Peace of
  // Ryswick, and Stanislas's from 1737), and the Pope's Comtat Venaissin with Avignon.
  FC: [[EARLY, { name: "Franche-Comté", wiki: "Franche-Comté", ruler: "Kingdom of Spain", status: 5 }]],
  LOR: [[EARLY, { name: "Duchy of Lorraine", wiki: "Duchy of Lorraine", ruler: "Kingdom of France", status: 4 }], [VINCENNES, { ruler: "", status: 0 }], [LORRAINE_1670, { ruler: "Kingdom of France", status: 4 }],
    [RYSWICK, { ruler: "", status: 0 }], [STANISLAS, { ruler: "Kingdom of France", status: 5 }]],
  AVI: [[EARLY, { name: "Comtat Venaissin", wiki: "Comtat Venaissin", ruler: "Papal States", status: 5 }]],
  // Switzerland's allies and neighbours.
  GRB: [[EARLY, { name: "Three Leagues", wiki: "Three Leagues", b: 2 }]],
  GENV: [[EARLY, { name: "Republic of Geneva", wiki: "Republic of Geneva", b: 2 }]],
  MULH: [[EARLY, { name: "Republic of Mulhouse", wiki: "Republic of Mulhouse" }]],
  VALz: [[EARLY, { name: "Republic of the Seven Zenden", wiki: "Republic of the Seven Zenden", b: 2 }]],
  BAS: [[EARLY, { name: "Prince-Bishopric of Basel", wiki: "Prince-Bishopric of Basel" }]],
  // Italy.
  SARs: [[EARLY, { name: "Kingdom of Sardinia", wiki: "Kingdom of Sardinia", ruler: "Kingdom of Spain", status: 5, b: 2 }], [SARDINIA_1708, { ruler: "Habsburg Monarchy" }],
    [SARDINIA_1717, { ruler: "Kingdom of Spain" }]],
  MIL: [[EARLY, { name: "Duchy of Milan", wiki: "Duchy of Milan", ruler: "Kingdom of Spain", status: 5 }], [MILAN_1706, { ruler: "Habsburg Monarchy" }]],
  MAN: [[EARLY, { name: "Duchy of Mantua", wiki: "Duchy of Mantua" }]],
  VEN: [[EARLY, { name: "Republic of Venice", wiki: "Republic of Venice" }]],
  GENr: [[EARLY, { name: "Republic of Genoa", wiki: "Republic of Genoa" }]],
  COR: [[EARLY, { name: "Corsican Republic", wiki: "Corsican Republic" }]],
  ACK: [[EARLY, { name: "Anglo-Corsican Kingdom", wiki: "Anglo-Corsican Kingdom", ruler: "Kingdom of Great Britain", status: 5 }]],
  CISP: [[EARLY, { name: "Cispadane Republic", wiki: "Cispadane Republic", ruler: "@FR", status: 5 }]],
  ROMR: [[EARLY, { name: "Roman Republic", wiki: "Roman Republic (1798–1799)", ruler: "@FR", status: 5 }]],
  TRE: [[EARLY, { name: "Prince-Bishopric of Trent", wiki: "Prince-Bishopric of Trent" }]],
  // Germany. The many small states, the free cities, and the lesser bishoprics and abbeys are drawn as the Empire itself (HRE),
  // as the sources draw them; the larger ones each have an owner.
  HRE: [[EARLY, { name: "Holy Roman Empire", wiki: "Holy Roman Empire" }]],
  DPR: [[EARLY, { name: "Duchy of Prussia", wiki: "Duchy of Prussia", ruler: "Polish-Lithuanian Commonwealth", status: 5 }]],
  BREV: [[EARLY, { name: "Bremen-Verden", wiki: "Swedish Bremen-Verden", ruler: "Swedish Empire", status: 5 }]],
  CEL: [[EARLY, { name: "Principality of Lüneburg", wiki: "Principality of Lüneburg" }]],
  SLA: [[EARLY, { name: "Duchy of Saxe-Lauenburg", wiki: "Duchy of Saxe-Lauenburg" }]],
  MGU: [[EARLY, { name: "Duchy of Mecklenburg-Güstrow", wiki: "Duchy of Mecklenburg-Güstrow" }]],
  HGOT: [[EARLY, { name: "Duchy of Holstein-Gottorp", wiki: "Duchy of Holstein-Gottorp" }]],
  OLDc: [[EARLY, { name: "County of Oldenburg", wiki: "County of Oldenburg" }], ["1667-06-19", { ruler: "Denmark-Norway", status: 5 }]],
  EFR: [[EARLY, { name: "East Frisia", wiki: "East Frisia" }]],
  MUN: [[EARLY, { name: "Prince-Bishopric of Münster", wiki: "Prince-Bishopric of Münster" }]],
  PAD: [[EARLY, { name: "Prince-Bishopric of Paderborn", wiki: "Prince-Bishopric of Paderborn" }]],
  OSN: [[EARLY, { name: "Prince-Bishopric of Osnabrück", wiki: "Prince-Bishopric of Osnabrück" }]],
  HIL: [[EARLY, { name: "Prince-Bishopric of Hildesheim", wiki: "Prince-Bishopric of Hildesheim" }]],
  KOL: [[EARLY, { name: "Electorate of Cologne", wiki: "Electorate of Cologne" }]],
  TRI: [[EARLY, { name: "Electorate of Trier", wiki: "Electorate of Trier" }]],
  MAI: [[EARLY, { name: "Electorate of Mainz", wiki: "Electorate of Mainz" }]],
  PAL: [[EARLY, { name: "Electorate of the Palatinate", wiki: "Electoral Palatinate" }]],
  PNE: [[EARLY, { name: "Palatinate-Neuburg", wiki: "Palatinate-Neuburg" }]],
  JUL: [[EARLY, { name: "Jülich-Berg", wiki: "Jülich-Berg", ruler: "Palatinate-Neuburg", status: 5 }], ["1685-05-26", { ruler: "Electorate of the Palatinate" }], [PALATINATE_BAVARIA, { ruler: "Electorate of Bavaria" }]],
  ZWE: [[EARLY, { name: "Palatinate-Zweibrücken", wiki: "Palatinate-Zweibrücken" }]],
  HAU: [[EARLY, { name: "County of Hanau", wiki: "County of Hanau-Münzenberg" }]],
  FULb: [[EARLY, { name: "Prince-Abbey of Fulda", wiki: "Prince-Bishopric of Fulda" }], ["1752-10-05", { name: "Prince-Bishopric of Fulda" }]],
  BBA: [[EARLY, { name: "Margraviate of Baden-Baden", wiki: "Margraviate of Baden-Baden" }]],
  BAM: [[EARLY, { name: "Prince-Bishopric of Bamberg", wiki: "Prince-Bishopric of Bamberg" }]],
  WZBb: [[EARLY, { name: "Prince-Bishopric of Würzburg", wiki: "Prince-Bishopric of Würzburg" }]],
  ANS: [[EARLY, { name: "Principality of Ansbach", wiki: "Principality of Ansbach" }], [BAYREUTH_1769, { name: "Principality of Ansbach-Bayreuth", wiki: "Principality of Ansbach" }]],
  BAYR: [[EARLY, { name: "Principality of Bayreuth", wiki: "Principality of Bayreuth" }]],
  // The east: Transylvania, Poland-Lithuania and Courland, the Crimean Khanate, and the Cossacks.
  TRA: [[EARLY, { name: "Principality of Transylvania", wiki: "Principality of Transylvania (1570–1711)", ruler: "Ottoman Empire", status: 5 }]],
  PLC: [[EARLY, { name: "Polish-Lithuanian Commonwealth", wiki: "Polish–Lithuanian Commonwealth" }]],
  CUR: [[EARLY, { name: "Duchy of Courland", wiki: "Duchy of Courland and Semigallia", ruler: "Polish-Lithuanian Commonwealth", status: 5 }]],
  CRI: [[EARLY, { name: "Crimean Khanate", wiki: "Crimean Khanate", ruler: "Ottoman Empire", status: 5 }], [KAINARJI, { ruler: "", status: 0 }]],
  HET: [[EARLY, { name: "Cossack Hetmanate", wiki: "Cossack Hetmanate", ruler: "Tsardom of Russia", status: 5 }], [RUSSIA_EMPIRE, { ruler: "Russian Empire" }]],
  ZAP: [[EARLY, { name: "Zaporozhian Cossacks", wiki: "Zaporozhian Sich", ruler: "Polish-Lithuanian Commonwealth", status: 5 }], [ETERNAL_PEACE, { ruler: "Tsardom of Russia" }], [RUSSIA_EMPIRE, { ruler: "Russian Empire" }]]
};
// An owner whose timeline begins in 1803 stands for the years before as it was then, where a row gives it land before 1803.
for (const tl of Object.values(O)) if (tl[0][0] === W) tl[0][0] = EARLY;

// The German Confederation's members leave it at its dissolution.
for (const tl of Object.values(O)) if (tl.some(([, ch]) => ch.part === "German Confederation")) tl.push([GC_END, { part: "" }]);
// Bavaria, Württemberg, and Baden between the German Confederation and the Empire: their borders with each other and the North
// German Confederation are pieced from districts, so they are approximate.
for (const k of ["BAV", "WUR", "BAD"]) O[k].find(([d]) => d === GC_END)[1].b = 1;
for (const tl of Object.values(O)) tl.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

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
// North Schleswig, the part of the Duchy of Schleswig in today's Denmark: south of the Kongeå and of Kolding, with Als and without
// Funen and Ærø (Ærø went to Denmark in 1864).
const CUTS = {
  // Eupen-Malmedy, Prussian from 1815 and Belgian from 1920: the east of the province of Liège, roughly, without Moresnet.
  eupen: [[[6.03, 50.76], [6.6, 50.76], [6.6, 50.1], [6.1, 50.1], [6.02, 50.2], [6.01, 50.3], [5.99, 50.38], [5.98, 50.44], [6.0, 50.5], [5.99, 50.56], [5.99, 50.62], [6.0, 50.66], [6.02, 50.7], [6.03, 50.76]]],
  // Before 1803: the Nord's west (Lille, Douai, and Dunkirk, French from 1668) and the Moselle's west (Metz and Thionville).
  mulh: [[[7.29, 47.79], [7.38, 47.79], [7.4, 47.75], [7.38, 47.72], [7.29, 47.72], [7.27, 47.75], [7.29, 47.79]]],
  nordw: [[[2.0, 50.3], [3.3, 50.3], [3.3, 51.2], [2.0, 51.2], [2.0, 50.3]]],
  moselw: [[[5.8, 48.85], [6.45, 48.85], [6.45, 49.6], [5.8, 49.6], [5.8, 48.85]]],
  peene: [[[12.8, 54.6], [12.8, 53.944], [12.852, 53.944], [12.9, 53.928], [13.248, 53.966], [13.555, 53.827], [13.764, 53.877], [14.0, 53.877], [14.0, 54.6], [12.8, 54.6]]],
  nschl: [[[7.9, 54.7], [7.9, 55.47], [8.66, 55.47], [9.0, 55.44], [9.25, 55.42], [9.48, 55.49], [9.62, 55.42], [9.66, 55.2], [9.95, 55.1], [10.08, 55.0], [10.08, 54.7], [7.9, 54.7]]]
};

// Each row: [selectors, [[from, owner], ...]]. Germany by its districts.
const LAND = [];
// A row marked rough ({ rough: true }) has a line no unit follows (a box or a cut drawn by hand, or a unit that straddles the old
// border), so the spans made from it are approximate (b 1) whatever their owner's precision; a piece of a state drawn exactly
// elsewhere meets the rest of it with no border, and its other borders are dotted.
const add = (sel, tl, opt) => LAND.push([[].concat(sel), tl, opt || {}]);

// Hanover, by what became of each part: its south and Osnabrück went to Westphalia in 1807, its core in 1810, and its north and
// west (the Stade and Lüneburg lands, Hoya and Diepholz, and Lauenburg) to France with the Hanseatic decree.
const HAN_EARLY = [[W, "HAN"], ["1803-06-04", "HANo"], ["1806-04-01", "PR"], [HESSE_OCC, "HANo"]];
add(units("DEU", ["Göttingen", "Northeim", "Osnabrück", "Landkreis Osnabrück"]), HAN_EARLY.concat([[WESTPHALIA, "WEST"], [WESTPHALIA_END, "HAN"]]));
add(units("DEU", ["Region Hannover", "Celle", "Gifhorn", "Hameln-Pyrmont", "Heidekreis"]), HAN_EARLY.concat([[WESTPHALIA_HANOVER, "WEST"], [WESTPHALIA_END, "HAN"]]));
add(units("DEU", ["Stade", "Cuxhaven", "Rotenburg (Wümme)", "Verden", "Osterholz", "Harburg", "Landkreis Lüneburg", "Lüchow-Dannenberg", "Uelzen", "Nienburg (Weser)", "Diepholz", "Bremerhaven"]),
  HAN_EARLY.concat([[WESTPHALIA_HANOVER, "WEST"], [HANSE, "FR"], [WESTPHALIA_END, "HAN"]]));
// Lauenburg: Hanoverian to 1815, then Danish, held by Austria and Prussia from 1864, and the King of Prussia's from 1865.
add(["DEU/Herzogtum Lauenburg"], HAN_EARLY.concat([[WESTPHALIA_HANOVER, "WEST"], [HANSE, "FR"], [WESTPHALIA_END, "HAN"], ["1815-06-04", "LAU"], [VIENNA_1864, "SHd"], ["1865-09-15", "LAU"], [NGC, "GER"]]));
add(["DEU/Grafschaft Bentheim"], HAN_EARLY.slice(0, 3).concat([[RHINE, "BERG"], [HANSE, "FR"], [WESTPHALIA_END, "HAN"]]));
// Brunswick.
add(units("DEU", ["Braunschweig", "Wolfenbüttel", "Salzgitter", "Helmstedt", "Wolfsburg", "Holzminden"]), [[W, "BRU"], [WESTPHALIA, "WEST"], [WESTPHALIA_END, "BRU"]]);
// Prussia's lands west of the Elbe, to Westphalia in 1807: the Altmark, Magdeburg, Halberstadt, Quedlinburg, Hildesheim and
// Goslar (Prussian from 1803), Minden and Ravensberg, Paderborn, the Eichsfeld, Mühlhausen, and Nordhausen.
add(units("DEU", ["Hildesheim", "Peine", "Goslar"]), [[W, "PRg"], [WESTPHALIA, "WEST"], [WESTPHALIA_END, "PRg"], [HANOVER_PRUSSIA, "HAN"]]);
add(units("DEU", ["Altmarkkreis Salzwedel", "Stendal", "Magdeburg", "Börde", "Salzlandkreis", "Harz", "Halle (Saale)",
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
add(["DEU/Anhalt-Bitterfeld"], [[W, "AKO"], ["1847-11-23", "ADE"]]);
// Mecklenburg and Swedish Pomerania.
add(units("DEU", ["Nordwestmecklenburg", "Schwerin", "Ludwigslust-Parchim", "Rostock", "Landkreis Rostock"]), [[W, "MS"]]);
add(["DEU/Mecklenburgische Seenplatte"], [[W, "MST"]]);
add(["DEU/Vorpommern-Rügen", "DEU/Vorpommern-Greifswald[!13.8,53.8,14.3,54.3]{peene}"], [[W, "SWP"], ["1807-09-07", "SWPo"], ["1810-01-06", "SWP"], ["1812-01-01", "SWPo"], ["1813-03-01", "SWP"], ["1815-10-23", "PRg"]]);
// Schleswig, Holstein, and the Hanseatic cities.
const SCHLESWIG = [[W, "SCHL"], [VIENNA_1864, "SHd"], [GASTEIN, "SCHLp"], [PRAGUE, "PRg"]];
add(units("DEU", ["Flensburg", "Nordfriesland", "Schleswig-Flensburg"]), SCHLESWIG);
// North Schleswig's line is drawn by hand, and Rendsburg-Eckernförde straddles the Eider, Schleswig's border with Holstein.
add(["DNK/Southern Denmark{nschl}", "DEU/Rendsburg-Eckernförde"], SCHLESWIG, { rough: true });
add(units("DEU", ["Kiel", "Neumünster", "Plön", "Ostholstein", "Segeberg", "Stormarn", "Pinneberg[!7.7,54.1,8.0,54.25]", "Steinburg", "Dithmarschen"]),
  [[W, "HOLS"], [VIENNA_1864, "SHd"], [GASTEIN, "HOLSa"], [PRAGUE, "PRg"]]);
// Heligoland, British from the Treaty of Kiel.
add(["DEU/Pinneberg[7.7,54.1,8.0,54.25]"], [[W, "HOLS"], ["1814-01-14", "HEL"]]);
add(["DEU/Lübeck"], [[W, "LUB"], [HANSE, "FR"], ["1813-12-05", "LUB"]]);
add(["DEU/Hamburg"], [[W, "HAM"], [HANSE, "FR"], ["1814-05-31", "HAM"]]);
add(["DEU/Bremen"], [[W, "BRE"], [HANSE, "FR"], ["1813-11-06", "BRE"]]);
// Oldenburg, with the Münster lands it gained in 1803.
add(units("DEU", ["Ammerland", "Oldenburg (Oldenburg)", "Landkreis Oldenburg", "Delmenhorst", "Wesermarsch", "Friesland", "Cloppenburg", "Vechta"]), [[W, "OLD"], [HANSE, "FR"], ["1813-11-27", "OLD"]]);
// The Jade, sold to Prussia for its naval harbour (Wilhelmshaven).
add(["DEU/Wilhelmshaven"], [[W, "OLD"], [HANSE, "FR"], ["1813-11-27", "OLD"], ["1854-11-23", "PRg"]]);
// East Frisia: Prussian, Dutch from the Treaty of Fontainebleau, French with Holland.
add(units("DEU", ["Aurich", "Leer", "Emden", "Wittmund"]), [[W, "PRg"], ["1807-11-11", "BAT"], [HOLLAND, "FR"], ["1813-11-17", "PRg"], [HANOVER_PRUSSIA, "HAN"]]);
// Arenberg's Meppen and Recklinghausen, and Salm's Bocholt.
add(["DEU/Emsland"], [[W, "ARB"], [HANSE, "FR"], ["1813-11-17", "PRg"], [HANOVER_PRUSSIA, "HAN"]]);
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
add(["DEU/Fulda"], [[W, "ORA"], [JENA, "FUL"], [FRANKFURT_GD, "ASC"], [WESTPHALIA_END, "PRg"], ["1816-01-01", "HK"]]);
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
add(units("DEU", ["Rhein-Hunsrück-Kreis", "Bad Kreuznach", "Merzig-Wadern", "Neunkirchen"]), [[W, "FR"], [PARIS, "JOINT"], [VIENNA, "PRg"]]);
// Birkenfeld, Oldenburg's from 1817, and Lichtenberg (St. Wendel), Saxe-Coburg's from 1816 until it sold it to Prussia in 1834.
add(["DEU/Birkenfeld"], [[W, "FR"], [PARIS, "JOINT"], [VIENNA, "PRg"], ["1817-04-16", "OLD"]]);
add(["DEU/St. Wendel"], [[W, "FR"], [PARIS, "JOINT"], [VIENNA, "PRg"], ["1816-09-11", "SCS"], ["1834-09-22", "PRg"]]);
// Rhenish Hesse to Hesse-Darmstadt, the Palatinate to Bavaria (the Treaty of Munich), both in 1816; Saarbrücken and Saarlouis
// to Prussia and Landau to Bavaria at the Second Peace of Paris.
add(units("DEU", ["Mainz", "Mainz-Bingen", "Alzey-Worms", "Worms"]), [[W, "FR"], [PARIS, "JOINT"], ["1816-06-30", "HD"]]);
add(units("DEU", ["Donnersbergkreis", "Kusel", "Kaiserslautern", "Landkreis Kaiserslautern", "Bad Dürkheim", "Ludwigshafen am Rhein",
  "Rhein-Pfalz-Kreis", "Frankenthal (Pfalz)", "Speyer", "Neustadt an der Weinstraße", "Germersheim", "Südliche Weinstraße", "Pirmasens", "Südwestpfalz", "Zweibrücken", "Saarpfalz-Kreis"]), [[W, "FR"], [PARIS, "JOINT"], [MUNICH, "BAV"]]);
add(units("DEU", ["Regionalverband Saarbrücken", "Saarlouis"]), [[W, "FR"], [PARIS2, "PRg"]]);
add(["DEU/Landau in der Pfalz"], [[W, "FR"], [MUNICH, "BAV"]]);
// Nassau, with the Westerwald and Wied it gained in 1803 and 1806; Prussia took Altenkirchen and Neuwied in 1815.
add(units("DEU", ["Wiesbaden", "Rheingau-Taunus-Kreis", "Main-Taunus-Kreis", "Hochtaunuskreis", "Rhein-Lahn-Kreis"]), [[W, "NUS"]]);
add(units("DEU", ["Altenkirchen (Westerwald)"]), [[W, "NUS"], ["1815-05-31", "PRg"]]);
add(units("DEU", ["Limburg-Weilburg", "Westerwaldkreis"]), [[W, "NWE"]]);
add(units("DEU", ["Neuwied"]), [[W, "NWE"], ["1815-05-31", "PRg"]]);
// Hesse-Darmstadt, with the Duchy of Westphalia (Arnsberg) from 1803.
add(units("DEU", ["Darmstadt", "Darmstadt-Dieburg", "Groß-Gerau", "Bergstraße", "Odenwaldkreis", "Offenbach am Main", "Landkreis Offenbach"]), [[W, "HD"]]);
add(units("DEU", ["Landkreis Gießen", "Vogelsbergkreis", "Wetteraukreis"]), [[W, "HD"], [NGC, "GER"]]);
add(units("DEU", ["Hochsauerlandkreis", "Olpe"]), [[W, "HD"], ["1816-06-30", "PRg"]]);
// Hesse-Kassel: occupied in November 1806, Westphalian from 1807, restored in 1813; Hanau went to Frankfurt instead.
add(units("DEU", ["Kassel", "Landkreis Kassel", "Schwalm-Eder-Kreis", "Werra-Meißner-Kreis", "Hersfeld-Rotenburg", "Marburg-Biedenkopf"]), [[W, "HK"], [HESSE_OCC, "HKo"], [WESTPHALIA, "WEST"], [WESTPHALIA_END, "HK"]]);
add(["DEU/Main-Kinzig-Kreis"], [[W, "HK"], [HESSE_OCC, "HKo"], [FRANKFURT_GD, "ASC"], [WESTPHALIA_END, "HK"]]);
// Frankfurt, and Dalberg's Aschaffenburg.
add(["DEU/Frankfurt am Main"], [[W, "FFM"], [RHINE, "ASC"], [WESTPHALIA_END, "FFM"]]);
add(units("DEU", ["Aschaffenburg", "Landkreis Aschaffenburg", "Miltenberg"]), [[W, "ASC"], [WESTPHALIA_END, "BAV"]]);
// Thuringia.
add(units("DEU", ["Weimar", "Weimarer Land", "Jena", "Wartburgkreis", "Eisenach"]), [[W, "SWE"]]);
add(["DEU/Gotha"], [[W, "SGA"], [SAXE_1826, "SCS"]]);
add(units("DEU", ["Altenburger Land", "Saale-Holzland-Kreis"]), [[W, "SGA"], [SAXE_1826, "SHI"]]);
add(units("DEU", ["Coburg", "Landkreis Coburg", "Sonneberg"]), [[W, "SCS"]]);
add(["DEU/Schmalkalden-Meiningen"], [[W, "SMEI"]]);
add(["DEU/Hildburghausen"], [[W, "SHI"], [SAXE_1826, "SMEI"]]);
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
add(["DEU/Sigmaringen"], [[W, "HSI"], ["1850-04-06", "PRg"]]);

// Austria, Bohemia, and Hungary. Salzburg was an electorate for Ferdinand of Tuscany from 1803, Austrian from 1805, and Bavarian
// from 1810 to 1816, with the Innviertel; Tyrol and Vorarlberg were Bavarian from 1805 to 1814; Upper Carinthia and East Tyrol
// were Illyrian from 1809 to 1814.
add(["AUT:Vienna/*", "AUT:Lower Austria/*", "AUT:Styria/*", "AUT:Burgenland/*", "CZE/*"].concat(units("AUT", ["Eferding", "Freistadt", "Gmunden", "Grieskirchen", "Kirchdorf an der Krems", "Linz", "Linz-Land",
  "Perg", "Rohrbach", "Steyr", "Steyr-Land", "Urfahr-Umgebung", "Vöcklabruck", "Wels", "Wels-Land", "Feldkirchen", "Klagenfurt", "Klagenfurt-Land", "Sankt Veit an der Glan", "Völkermarkt", "Wolfsberg"])), [[W, "AUSg"]]);
add(units("AUT", ["Braunau am Inn", "Ried im Innkreis", "Schärding"]), [[W, "AUSg"], [SCHONBRUNN, "BAV"], [MUNICH, "AUSg"]]);
add(["AUT:Salzburg/*"], [[W, "SALZ"], [PRESSBURG, "AUSg"], ["1810-09-12", "BAV"], [MUNICH, "AUSg"]]);
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
add(["POL/Kraków", "POL:Lesser Poland Voivodeship/Powiat krakowski"], [[W, "AUS"], [SCHONBRUNN, "WAR"], [VIENNA, "KRA"], ["1846-11-16", "AUS"]]);
add(["POL:Lublin Voivodeship/*", "POL:Świętokrzyskie Voivodeship/*"].concat(units("POL", ["Powiat miechowski", "Powiat olkuski", "Powiat proszowicki", "Radom", "Powiat radomski", "Powiat przysuski",
  "Powiat szydłowiecki", "Powiat zwoleński", "Powiat lipski", "Powiat kozienicki", "Powiat białobrzeski", "Powiat garwoliński", "Powiat otwocki", "Powiat miński", "Siedlce", "Powiat siedlecki",
  "Powiat łosicki", "Powiat sokołowski", "Powiat węgrowski", "Powiat opoczyński"])), [[W, "AUS"], [SCHONBRUNN, "WAR"], ["1815-06-20", "CPL"], [POLAND_END, "RUS"]]);
add(["POL/Powiat siemiatycki"], [[W, "AUS"], [SCHONBRUNN, "WAR"], ["1815-06-20", "CPL"], [POLAND_END, "RUS"]]);

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
  [[W, "PR"], [TILSIT, "WAR"], ["1815-06-20", "CPL"], [POLAND_END, "RUS"]]);
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
const SOUTH_BESSARABIA = [[W, "MOL"], ["1812-05-28", "RUS"], ["1856-03-30", "MOL"], [BERLIN, "RUS"]];
add(units("MDA", ["Cahul", "Cantemir", "Taraclia"]), SOUTH_BESSARABIA);
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
add(units("UKR:Odessa", ["Bolhrad", "Izmail", "Kiliia", "Reni"]), [[W, "OTT"]].concat(SOUTH_BESSARABIA.slice(1)));
add(units("ROU", ["Iași", "Botoșani", "Neamț", "Bacău", "Vaslui", "Vrancea", "Galați"]), [[W, "MOL"]]);
add(units("ROU", ["Dolj", "Gorj", "Mehedinți", "Olt", "Vâlcea", "Argeș", "Dâmbovița", "Prahova", "Buzău", "Brăila", "Ialomița", "Călărași", "Giurgiu", "Teleorman", "Ilfov", "Bucharest"]), [[W, "WAL2"]]);
// The Ottoman Balkans: the Sanjak of Smederevo disputed during the Serbian uprisings; Montenegro; the Ionian Islands.
add(units("SRB", ["Belgrade", "Šumadija", "Podunavlje", "Braničevo", "Pomoravski", "Kolubara", "Mačva", "Moravica", "Zlatibor"]),
  [[W, "OTT"], ["1804-02-14", "SERd"], ["1813-10-07", "OTT"], ["1815-04-23", "SERd"], ["1817-07-26", "SER"]]);
add(["KOS/*", "BIH/*", "ALB/*", "MKD/*", "BGR/*"].concat(units("SRB", ["Bor", "Jablanica", "Nišava", "Pčinja", "Pirot", "Rasina", "Raška", "Toplica", "Zaječar"]), units("ROU", ["Constanța", "Tulcea"]), units("TUR", ["Edirne", "Kırklareli", "Tekirdağ", "Istanbul"]),
  units("GRC", ["East Macedonia and Thrace", "Attica", "Mount Athos", "West Greece", "West Macedonia", "Epirus", "Centre Macedonia", "Crete", "South Aegean", "Peloponnese", "Central Greece", "Thessalia", "North Aegean"]))
  .concat(units("MNE", ["Andrijevica", "Bar", "Berane", "Bijelo Polje", "Kolašin", "Mojkovac", "Nikšić", "Plav", "Pljevlja", "Plužine", "Podgorica", "Rožaje", "Šavnik", "Žabljak", "Ulcinj"])), [[W, "OTT"]]);
add(units("MNE", ["Cetinje", "Danilovgrad"]), [[W, "MNE"]]);
// The Principality of Serbia grew by the districts of 1833 (Krajina, Crna Reka, and Kruševac; the year only, so from 1834, when
// they were organized) and by Niš, Pirot, Toplica, and Vranje at the Congress of Berlin.
add(units("SRB", ["Bor", "Zaječar", "Rasina"]), [[W, "OTT"], ["1834-01-01", "SER"]]);
add(units("SRB", ["Nišava", "Pirot", "Toplica", "Jablanica", "Pčinja"]), [[W, "OTT"], [BERLIN, "SER"]]);
// Montenegro's gains at Berlin, and Ulcinj in place of Plav and Gusinje in 1880.
add(units("MNE", ["Nikšić", "Podgorica", "Bar", "Kolašin", "Šavnik", "Žabljak", "Plužine", "Mojkovac", "Andrijevica"]), [[W, "OTT"], [BERLIN, "MNE"]]);
add(["MNE/Ulcinj"], [[W, "OTT"], ["1880-11-23", "MNE"]]);
// Bosnia and Herzegovina, occupied and governed by Austria-Hungary under the Treaty of Berlin, still the Sultan's in law.
add(["BIH/*"], [[W, "OTT"], [BERLIN, "BOSo"]]);
// Bulgaria and Eastern Rumelia from Berlin (their union of September 1885 the Porte accepted only in 1886); the Rhodopes and
// Pirin Macedonia stayed Ottoman. Northern Dobruja went to Romania.
add(units("BGR", ["Vidin", "Montana", "Vratsa", "Pleven", "Lovech", "Gabrovo", "Veliko Tarnovo", "Ruse", "Razgrad", "Targovishte", "Shumen", "Silistra", "Dobrich", "Varna", "Pernik", "Kyustendil"]).concat(["BGR:Sofia/*"]),
  [[W, "OTT"], [BERLIN, "BUL"]]);
add(units("BGR", ["Plovdiv", "Pazardzhik", "Stara Zagora", "Haskovo", "Sliven", "Yambol", "Burgas"]), [[W, "OTT"], [BERLIN, "ERU"]]);
add(units("ROU", ["Constanța", "Tulcea"]), [[W, "OTT"], [BERLIN, "WAL2"]]);
// Greece: disputed from the rising of March 1821 to the London Protocol of 3 February 1830, then the Hellenic State, a kingdom
// from 1832 (the Peloponnese, Central Greece and Euboea, and the Cyclades); the Ionian Islands from 1864; Thessaly from the
// Convention of Constantinople of 1881 (Arta, in Epirus, is not drawn, since the unit is the whole of Epirus).
add(units("GRC", ["Peloponnese", "West Greece", "Central Greece", "Attica", "South Aegean[23.0,36.0,26.05,38.2]"]), [[W, "OTT"], ["1821-03-25", "GRCd"], ["1830-02-03", "GRE"]]);
add(["GRC/Thessalia"], [[W, "OTT"], ["1881-07-02", "GRE"]]);
// The British protectorate from the Treaty of Paris of 5 November 1815, and Greece from the union of 2 June 1864.
const IONIAN = [["1815-11-05", "IONp"], ["1864-06-02", "GRE"]];
add(["GRC/Ionian Islands[!19.5,39.1,20.3,39.9;20.5,38.55,20.8,38.9]"], [[W, "ION"], ["1807-08-20", "FR"], ["1809-10-04", "IONb"]].concat(IONIAN));
add(["GRC/Ionian Islands[20.5,38.55,20.8,38.9]"], [[W, "ION"], ["1807-08-20", "FR"], ["1810-04-16", "IONb"]].concat(IONIAN));
add(["GRC/Ionian Islands[19.5,39.1,20.3,39.9]"], [[W, "ION"], ["1807-08-20", "FR"], [PARIS, "IONb"]].concat(IONIAN));

// Scandinavia.
add(["DNK/Central Denmark", "DNK/North Denmark", "DNK/Zealand", "DNK/Denmark", "DNK/Southern Denmark{!nschl}"], [[W, "DN"]]);
add(["NOR/*"], [[W, "DN"], ["1814-01-14", "NORd"], ["1814-11-04", "SW"]]);
add(["SWE/*"], [[W, "SW"]]);

// The Low Countries and Luxembourg.
add(["NLD/*"], [[W, "BAT"], [HOLLAND, "FR"], ["1813-12-02", "BAT"]]);
add(["NLD/North Brabant", "NLD/Zeeland"], [[W, "BAT"], ["1810-03-16", "FR"], ["1813-12-02", "BAT"]]);
add(["NLD/Limburg"], [[W, "FR"], [PARIS, "BEL"], ["1815-03-16", "BAT"], [BELGIUM, "LIMd"], [LONDON, "LIMB"], ["1867-05-11", "BAT"]]);
add(["BEL/*"], [[W, "FR"], [PARIS, "BEL"], ["1815-03-16", "BAT"], [BELGIUM, "BELG"]]);
add(["BEL/Liège{!eupen}"], [[W, "FR"], [PARIS, "BEL"], ["1815-03-16", "BAT"], [BELGIUM, "BELG"]]);
// Eupen-Malmedy, Prussian from the Congress of Vienna (to Belgium in 1920), its line drawn by hand.
add(["BEL/Liège{eupen}"], [[W, "FR"], [PARIS, "RHIo"], [RHINELAND, "PRg"]], { rough: true });
add(["BEL/Limburg"], [[W, "FR"], [PARIS, "BEL"], ["1815-03-16", "BAT"], [BELGIUM, "LIMd"], [LONDON, "BELG"]]);
add(["LUX/Luxembourg"], [[W, "FR"], [PARIS, "BEL"], ["1815-03-16", "LUX"]]);
add(["LUX/Diekirch", "LUX/Grevenmacher"], [[W, "FR"], [PARIS, "BEL"], ["1815-03-16", "LUX"], [BELGIUM, "LUXd"], [LONDON, "LUX"]]);
add(["BEL/Luxembourg"], [[W, "FR"], [PARIS, "BEL"], ["1815-03-16", "LUX"], [BELGIUM, "LUXd"], [LONDON, "BELG"]]);

// France, Switzerland, and Iberia.
add(["FRA/*"], [[W, "FR"]]);
add(["FRA/Savoie", "FRA/Haute-Savoie"], [[W, "FR"], [PARIS, "SAR"], [NICE, "FR"]]);
// The Alpes-Maritimes take in the land west of the Var that was French before 1860, and Tende and La Brigue, Italian until 1947.
add(["FRA/Alpes-Maritimes"], [[W, "FR"], [PARIS, "SAR"], [NICE, "FR"]], { rough: true });
// Alsace and Moselle (the annexed part of Lorraine), German from the Treaty of Frankfurt; Belfort stayed French.
add(["FRA/Bas-Rhin", "FRA/Haut-Rhin", "FRA/Moselle"], [[W, "FR"], [FRANKFURT_1871, "GER"]]);
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
// Italy's unification: Lombardy to Sardinia at the Treaty of Zurich; the duchies and the Legations disputed from their rulers'
// flight in 1859 to the decrees of annexation of March 1860; Savoy and Nice to France; the Two Sicilies, the Marches, and Umbria
// annexed by the decrees of 17 December 1860; the Kingdom of Italy from 17 March 1861; Venetia (with Mantua) from its handover of
// 19 October 1866; and Rome from the decree of 9 October 1870.
add(["ITA/Parma", "ITA/Piacenza"], [[W, "FR"], ["1814-04-11", "PAR"], ["1859-06-09", "PARd"], [EMILIA, "SAR"]]);
add(["ITA/Milan", "ITA/Monza and Brianza", "ITA/Lodi", "ITA/Varese", "ITA/Como", "ITA/Lecco", "ITA/Bergamo", "ITA/Brescia", "ITA/Cremona", "ITA/Pavia", "ITA/Sondrio"],
  [[W, "ITR"], ["1814-04-28", "AUS"], [VIENNA, "LV"], [ZURICH, "SAR"]]);
add(["ITA/Mantua", "ITA/Rovigo"], [[W, "ITR"], ["1814-04-28", "AUS"], [VIENNA, "LV"], [VENETIA, "SAR"]]);
add(["ITA/Venice", "ITA/Padua", "ITA/Vicenza", "ITA/Verona", "ITA/Treviso", "ITA/Pordenone"], [[W, "AUS"], ["1806-05-01", "ITR"], ["1814-04-28", "AUS"], [VIENNA, "LV"], [VENETIA, "SAR"]]);
// Belluno and Udine reach past the border of 1866 (Cortina d'Ampezzo and the lower Isonzo stayed Austrian until 1918).
add(["ITA/Belluno", "ITA/Udine"], [[W, "AUS"], ["1806-05-01", "ITR"], ["1814-04-28", "AUS"], [VIENNA, "LV"], [VENETIA, "SAR"]], { rough: true });
add(["ITA/Trentino", "ITA/Trentino-South Tyrol"], [[W, "AUSg"], [PRESSBURG, "BAV"], ["1810-06-10", "ITR"], ["1814-04-28", "AUSg"]]);
add(["ITA/Modena", "ITA/Reggio Emilia"], [[W, "ITR"], ["1814-04-28", "MOD"], ["1859-06-11", "MODd"], [EMILIA, "SAR"]]);
add(["ITA/Bologna", "ITA/Ferrara", "ITA/Ravenna", "ITA/Forlì-Cesena", "ITA/Rimini"], [[W, "ITR"], ["1814-04-28", "AUSo"], [VIENNA, "PAP"], ["1859-06-12", "LEGd"], [EMILIA, "SAR"]]);
add(["ITA/Ancona", "ITA/Macerata", "ITA/Fermo", "ITA/Ascoli Piceno", "ITA/Pesaro and Urbino"], [[W, "PAP"], ["1808-04-02", "ITR"], ["1814-04-28", "NAPo"], [VIENNA, "PAP"], [ANNEX_SOUTH, "SAR"]]);
add(["ITA/Rieti", "ITA/Perugia", "ITA/Terni"], [[W, "PAP"], ["1809-05-17", "FR"], ["1814-05-24", "PAP"], [ANNEX_SOUTH, "SAR"]]);
add(["ITA/Rome", "ITA/Viterbo", "ITA/Frosinone", "ITA/Latina"], [[W, "PAP"], ["1809-05-17", "FR"], ["1814-05-24", "PAP"], [ROME, "SAR"]]);
const TUSCANY_1859 = [["1859-04-27", "TUSd"], [TUSCANY_SAR, "SAR"]];
add(["ITA/Florence", "ITA/Prato", "ITA/Pistoia", "ITA/Pisa", "ITA/Siena", "ITA/Arezzo", "ITA/Grosseto", "ITA/Livorno[!10.0,42.6,10.5,42.9]"], [[W, "ETR"], ["1807-12-10", "FR"], ["1814-05-01", "TUS"]].concat(TUSCANY_1859));
add(["ITA/Livorno[10.0,42.6,10.5,42.9]"], [[W, "FR"], ["1814-05-04", "ELB"], ["1815-02-26", "TUS"]].concat(TUSCANY_1859));
// Lucca to Tuscany when its duke left it for Parma (1847); Massa and Carrara to Modena at the death of their duchess (1829).
add(["ITA/Lucca"], [[W, "LUC"], ["1847-10-11", "TUS"]].concat(TUSCANY_1859));
add(["ITA/Massa-Carrara"], [[W, "ITR"], ["1806-03-30", "LUC"], ["1814-03-15", "MAS"], ["1829-11-14", "MOD"], ["1859-06-11", "MODd"], [EMILIA, "SAR"]]);
add(units("ITA", ["Naples", "Avellino", "Benevento", "Caserta", "Salerno", "Catanzaro", "Cosenza", "Crotone", "Reggio Calabria", "Vibo Valentia", "Matera", "Potenza", "Bari", "Barletta-Andria-Trani", "Brindisi", "Foggia", "Lecce", "Taranto", "Chieti", "L'Aquila", "Pescara", "Teramo", "Campobasso", "Isernia"]),
  [[W, "NAP"], ["1860-09-07", "NAPd"], [ANNEX_SOUTH, "SAR"]]);
add(units("ITA", ["Agrigento", "Caltanissetta", "Catania", "Enna", "Messina", "Palermo", "Ragusa", "Syracuse", "Trapani"]), [[W, "SIC"], ["1860-05-27", "SICd"], [ANNEX_SOUTH, "SAR"]]);

// PRE: the owners before 1803, each row [selectors, [[from, owner], ...] from EARLY to before W, options], matched to LAND's units
// (see buildNapoleonic). PRE rows are added in the section "Before 1803" below.
const PRE = [];
const pre = (sel, tl, opt) => PRE.push([[].concat(sel), tl, opt || {}]);

// ---- Before 1803 ----
// The owners from 1648 to 1802 of the units LAND gives from 1803. Changes are dated by the treaty or the act that made them (the
// law on the map, as after 1803), and the occupations of the wars are left out. The units are today's, so many of these lines are
// pieced together (marked rough where a unit straddles the old border). A unit no row names keeps its owner of 1803.

// France and its frontiers: Artois (the Peace of the Pyrenees; Saint-Omer stayed Spanish to 1678), Lille and Douai (Aachen, 1668)
// and Valenciennes and Cambrai (Nijmegen, 1678), Roussillon, Franche-Comté, Upper Alsace (Westphalia), Strasbourg and Lower
// Alsace (taken by 1681), Lorraine (French in 1766; Metz and Thionville French throughout, Thionville from 1659), the Comtat
// Venaissin (1791), Savoy and Nice (1792 and 1793), and Corsica (Genoese, its own republic from 1755, French from the Treaty of
// Versailles of 1768, and the Anglo-Corsican Kingdom from 1794 to 1796).
pre(["FRA/Pas-de-Calais"], [[EARLY, "SNL"], [PYRENEES, "FR"]], { rough: true });
pre(["FRA/Nord{nordw}"], [[EARLY, "SNL"], [AACHEN_1668, "FR"]], { rough: true });
pre(["FRA/Nord{!nordw}"], [[EARLY, "SNL"], [NIJMEGEN, "FR"]], { rough: true });
pre(["FRA/Pyrénées-Orientales"], [[EARLY, "SPA"], [PYRENEES, "FR"]]);
pre(["FRA/Doubs", "FRA/Jura", "FRA/Haute-Saône"], [[EARLY, "FC"], [NIJMEGEN, "FR"]]);
pre(["FRA/Haut-Rhin{!mulh}", "FRA/Territoire de Belfort"], [[EARLY, "AUSg"], [WESTPHALIA_1648, "FR"]], { rough: true });
pre(["FRA/Haut-Rhin{mulh}"], [[EARLY, "MULH"], [MULHOUSE_1798, "FR"]], { rough: true });
pre(["FRA/Bas-Rhin"], [[EARLY, "HRE"], [STRASBOURG, "FR"]], { rough: true });
pre(["FRA/Moselle{moselw}"], [[EARLY, "FR"]], { rough: true });
pre(["FRA/Moselle{!moselw}", "FRA/Meurthe-et-Moselle", "FRA/Vosges", "FRA/Meuse"], [[EARLY, "LOR"], [LORRAINE_1766, "FR"]], { rough: true });
pre(["FRA/Vaucluse"], [[EARLY, "AVI"], [AVIGNON, "FR"]], { rough: true });
pre(["FRA/Savoie", "FRA/Haute-Savoie"], [[EARLY, "SAR"], [SAVOY_1792, "FR"]]);
pre(["FRA/Alpes-Maritimes"], [[EARLY, "SAR"], [NICE_1793, "FR"]], { rough: true });
pre(["FRA/Haute-Corse", "FRA/Corse-du-Sud"], [[EARLY, "GENr"], [CORSICA_1755, "COR"], [CORSICA_1768, "FR"], [ANGLO_CORSICA, "ACK"], [ANGLO_CORSICA_END, "FR"]]);

// The Low Countries: the Spanish Netherlands, Austrian from the Treaty of Rastatt, the United Belgian States of 1790, and French
// from the annexation of 1795; Liège and its County of Loon; Luxembourg, French from the Truce of Ratisbon to the Peace of
// Ryswick; and Upper Guelders and the lands of the Meuse (today's Dutch Limburg).
pre(["BEL/*"], [[EARLY, "SNL"], [ANNEX_BELGIUM, "FR"]]);
pre(["BEL/Liège{!eupen}", "BEL/Limburg"], [[EARLY, "LIE"], [ANNEX_BELGIUM, "FR"]], { rough: true });
pre(["BEL/Liège{eupen}", "NLD/Limburg"], [[EARLY, "SNL"], [ANNEX_BELGIUM, "FR"]], { rough: true });
pre(["BEL/Luxembourg", "LUX/Luxembourg", "LUX/Diekirch", "LUX/Grevenmacher"], [[EARLY, "SNLx"], [RATISBON, "FR"], [RYSWICK, "SNLx"], [ANNEX_BELGIUM, "FR"]]);

// Switzerland: the Confederacy's allies (Geneva, French from 1798; the Valais, in the Helvetic Republic from 1798 and the Rhodanic
// Republic from 1802; the Three Leagues, Helvetic from 1799, and their Valtellina, Cisalpine from 1797), and the Prince-Bishopric
// of Basel, French from 1793.
pre(["CHE/Geneva"], [[EARLY, "GENV"], [GENEVA_1798, "FR"]]);
pre(["CHE/Valais"], [[EARLY, "VALz"], ["1798-05-01", "SWI"], ["1802-08-30", "VAL"]]);
pre(["CHE/Jura"], [[EARLY, "BAS"], [BASEL_1793, "FR"]]);
pre(["CHE/Grisons"], [[EARLY, "GRB"], ["1799-04-21", "SWI"]]);
pre(["ITA/Sondrio"], [[EARLY, "GRB"], ["1797-10-22", "ITR"]]);

// Iberia: Catalonia in its revolt to the fall of Barcelona in 1652, and the Crown of Aragon for the Archduke Charles in the War of
// the Spanish Succession (Aragon and Valencia to Almansa, Catalonia to 1714, Majorca to 1715); Minorca British from Utrecht to its
// cession to Spain in 1783.
pre(["ESP/Barcelona", "ESP/Girona", "ESP/Lleida", "ESP/Tarragona"], [[EARLY, "CATd1"], [CATALONIA_1652, "SPA"], [SUCCESSION_EAST, "ARAd"], [BARCELONA_1714, "SPA"]]);
pre(["ESP/Huesca", "ESP/Zaragoza", "ESP/Teruel", "ESP/Castellón", "ESP/Valencia", "ESP/Alicante"], [[EARLY, "SPA"], [SUCCESSION_EAST, "ARAd"], [ALMANSA, "SPA"]]);
pre(["ESP/Balearic Islands[!3.75,39.75,4.4,40.1]"], [[EARLY, "SPA"], [SUCCESSION_EAST, "ARAd"], [MALLORCA_1715, "SPA"]]);
pre(["ESP/Balearic Islands[3.75,39.75,4.4,40.1]"], [[EARLY, "SPA"], [SUCCESSION_EAST, "ARAd"], ["1713-07-13", "MIN"], [MINORCA_1783, "SPA"]]);

// Italy. Piedmont: Savoy's (Alessandria from Milan by Utrecht, Novara by the Treaty of Vienna of 1738, the Upper Novarese by
// Aachen), French from 1802. Lombardy: Spain's Duchy of Milan, Austrian from Rastatt; Mantua Austrian from 1708; the Cisalpine
// Republic from 1797, with Venice's Bergamo, Brescia, and Polesine and the Valtellina. Venice, Austrian from Campo Formio.
// Emilia: Parma (Austrian from 1735 to 1748, French from 1802), Modena and the Legations (the Cispadane Republic, then
// Cisalpine). The Papal States, the Roman Republic in 1798 and 1799. Tuscany, Etruria from 1801. Genoa, the Ligurian Republic
// from 1797. Sardinia: Spanish, Austrian from Rastatt, Savoy's from 1720.
pre(["ITA/Turin", "ITA/Cuneo", "ITA/Asti", "ITA/Vercelli", "ITA/Biella", "ITA/Aosta"], [[EARLY, "SAR"], ["1802-09-11", "FR"]]);
pre(["ITA/Alessandria"], [[EARLY, "MIL"], [UTRECHT, "SAR"], ["1802-09-11", "FR"]], { rough: true });
pre(["ITA/Novara"], [[EARLY, "MIL"], [VIENNA_1738, "SAR"], ["1801-02-09", "ITR"]], { rough: true });
pre(["ITA/Verbano-Cusio-Ossola"], [[EARLY, "MIL"], [AACHEN_1748, "SAR"], ["1801-02-09", "ITR"]], { rough: true });
pre(["ITA/Milan", "ITA/Monza and Brianza", "ITA/Lodi", "ITA/Varese", "ITA/Como", "ITA/Lecco", "ITA/Pavia", "ITA/Cremona"], [[EARLY, "MIL"], [CISALPINE, "ITR"]]);
pre(["ITA/Bergamo", "ITA/Brescia"], [[EARLY, "VEN"], [CAMPO_FORMIO, "ITR"]]);
pre(["ITA/Mantua"], [[EARLY, "MAN"], [MANTUA_1708, "MIL"], [CAMPO_FORMIO, "ITR"]]);
pre(["ITA/Rovigo"], [[EARLY, "VEN"], [CAMPO_FORMIO, "ITR"]]);
pre(["ITA/Venice", "ITA/Padua", "ITA/Vicenza", "ITA/Verona", "ITA/Treviso", "ITA/Pordenone", "ITA/Belluno", "ITA/Udine"], [[EARLY, "VEN"], [CAMPO_FORMIO, "AUS"]]);
pre(["SVN@Obalno-kraška", "HRV/Istria"], [[EARLY, "VEN"], [CAMPO_FORMIO, "AUSg"]], { rough: true });
pre(["ITA/Trentino"], [[EARLY, "TRE"]]);
pre(["ITA/Parma", "ITA/Piacenza"], [[EARLY, "PAR"], ["1802-10-09", "FR"]]);
pre(["ITA/Modena", "ITA/Reggio Emilia"], [[EARLY, "MOD"], [CISPADANE, "CISP"], [CISALPINE_UNION, "ITR"]]);
pre(["ITA/Bologna", "ITA/Ferrara", "ITA/Ravenna", "ITA/Forlì-Cesena", "ITA/Rimini"], [[EARLY, "PAP"], ["1797-02-19", "CISP"], [CISALPINE_UNION, "ITR"]]);
pre(["ITA/Massa-Carrara"], [[EARLY, "MAS"], [CISALPINE_UNION, "ITR"]]);
pre(["ITA/Rome", "ITA/Viterbo", "ITA/Frosinone", "ITA/Latina", "ITA/Rieti", "ITA/Perugia", "ITA/Terni", "ITA/Ancona", "ITA/Macerata", "ITA/Fermo", "ITA/Ascoli Piceno", "ITA/Pesaro and Urbino"],
  [[EARLY, "PAP"], [ROMAN_REPUBLIC, "ROMR"], [ROMAN_REPUBLIC_END, "PAP"]]);
pre(["ITA/Florence", "ITA/Prato", "ITA/Pistoia", "ITA/Pisa", "ITA/Siena", "ITA/Arezzo", "ITA/Grosseto", "ITA/Livorno[!10.0,42.6,10.5,42.9]"], [[EARLY, "TUS"], [ETRURIA, "ETR"]]);
pre(["ITA/Livorno[10.0,42.6,10.5,42.9]"], [[EARLY, "TUS"], ["1802-08-26", "FR"]]);
pre(["ITA/Liguria", "ITA/Savona", "ITA/Imperia", "ITA/La Spezia"], [[EARLY, "GENr"], [LIGURIA, "LIG"]]);
pre(units("ITA", ["Cagliari", "Sassari", "Nuoro", "Oristano", "Ogliastra", "Olbia-Tempio", "Carbonia-Iglesias", "Medio Campidano"]), [[EARLY, "SARs"], [SARDINIA_1720, "SAR"]]);

// Germany, west: the bishoprics, abbeys, and cities secularized and mediatized for the indemnities of 1802 and 1803 (taken over
// in August 1802), the left bank of the Rhine (French from its departments of January 1798), the Palatinate (Bavaria's from 1777),
// Jülich-Berg, Swedish Bremen-Verden (Hanover's from the Treaty of Stockholm of 1719), Lüneburg (joined to Hanover in 1705), East
// Frisia (Prussian from 1744), and Oldenburg (Danish from 1667 to 1773).
pre(units("DEU", ["Osnabrück", "Landkreis Osnabrück"]), [[EARLY, "OSN"], [INDEMNITIES, "HAN"]]);
pre(units("DEU", ["Celle", "Gifhorn", "Heidekreis", "Harburg", "Landkreis Lüneburg", "Lüchow-Dannenberg", "Uelzen", "Nienburg (Weser)", "Diepholz"]), [[EARLY, "CEL"], ["1705-08-28", "HAN"]]);
pre(units("DEU", ["Stade", "Cuxhaven", "Rotenburg (Wümme)", "Verden", "Osterholz", "Bremerhaven"]), [[EARLY, "BREV"], [STOCKHOLM_1719, "HAN"]]);
pre(["DEU/Herzogtum Lauenburg"], [[EARLY, "SLA"], ["1689-09-30", "CEL"], ["1705-08-28", "HAN"]]);
pre(["DEU/Grafschaft Bentheim"], [[EARLY, "HRE"], ["1753-01-01", "HAN"]]);
pre(units("DEU", ["Hildesheim", "Peine", "Goslar"]), [[EARLY, "HIL"], [INDEMNITIES, "PRg"]]);
pre(units("DEU", ["Magdeburg", "Börde", "Salzlandkreis", "Halle (Saale)", "Jerichower Land"]), [[EARLY, "HRE"], ["1680-06-04", "PRg"]]);
pre(units("DEU", ["Harz", "Minden-Lübbecke"]), [[EARLY, "HRE"], [WESTPHALIA_1648, "PRg"]]);
pre(units("DEU", ["Paderborn", "Höxter"]), [[EARLY, "PAD"], [INDEMNITIES, "PRg"]]);
pre(["DEU/Eichsfeld"], [[EARLY, "MAI"], [INDEMNITIES, "PRg"]]);
pre(units("DEU", ["Nordhausen", "Unstrut-Hainich-Kreis"]), [[EARLY, "HRE"], [INDEMNITIES, "PRg"]]);
pre(units("DEU", ["Erfurt", "Sömmerda"]), [[EARLY, "MAI"], [INDEMNITIES, "PRg"]]);
pre(["DEU/Vorpommern-Greifswald[13.8,53.8,14.3,54.3]", "DEU/Vorpommern-Greifswald[!13.8,53.8,14.3,54.3]{!peene}"], [[EARLY, "SWP"], [STOCKHOLM_1720, "PRg"]]);
pre(units("DEU", ["Rostock", "Landkreis Rostock"]), [[EARLY, "MGU"], ["1695-10-26", "MS"]], { rough: true });
pre(["DEU/Mecklenburgische Seenplatte"], [[EARLY, "MGU"], ["1695-10-26", "MS"], ["1701-03-08", "MST"]]);
pre(units("DEU", ["Schleswig-Flensburg", "Nordfriesland", "Rendsburg-Eckernförde"]), [[EARLY, "HGOT"], [FREDERIKSBORG, "SCHL"]], { rough: true });
pre(units("DEU", ["Kiel", "Neumünster", "Dithmarschen", "Ostholstein"]), [[EARLY, "HGOT"], [GOTTORP, "HOLS"]], { rough: true });
pre(units("DEU", ["Ammerland", "Oldenburg (Oldenburg)", "Landkreis Oldenburg", "Delmenhorst", "Wesermarsch", "Friesland", "Wilhelmshaven"]), [[EARLY, "OLDc"], [OLDENBURG_1773, "OLD"]]);
pre(units("DEU", ["Cloppenburg", "Vechta", "Borken", "Emsland"]), [[EARLY, "MUN"]], { rough: true });
pre(units("DEU", ["Aurich", "Leer", "Emden", "Wittmund"]), [[EARLY, "EFR"], [EAST_FRISIA, "PRg"]]);
pre(["DEU/Recklinghausen"], [[EARLY, "KOL"]]);
pre(units("DEU", ["Münster", "Coesfeld", "Steinfurt", "Warendorf"]), [[EARLY, "MUN"], [INDEMNITIES, "PRg"]]);
pre(["DEU/Essen"], [[EARLY, "HRE"], [INDEMNITIES, "PRg"]]);
pre(units("DEU", ["Dortmund", "Siegen-Wittgenstein", "Lahn-Dill-Kreis"]), [[EARLY, "HRE"]]);
pre(["DEU/Fulda"], [[EARLY, "FULb"]]);
pre(units("DEU", ["Düsseldorf", "Mettmann", "Solingen", "Remscheid", "Wuppertal", "Rheinisch-Bergischer Kreis", "Oberbergischer Kreis", "Leverkusen", "Rhein-Sieg-Kreis", "Mülheim an der Ruhr", "Oberhausen"]), [[EARLY, "JUL"]]);
pre(["DEU/Kleve"], [[EARLY, "PRg"], [LEFT_BANK, "FR"]]);
pre(["DEU/Krefeld"], [[EARLY, "HRE"], ["1702-03-19", "PRg"], [LEFT_BANK, "FR"]]);
pre(units("DEU", ["Viersen", "Mönchengladbach", "Städteregion Aachen", "Düren", "Heinsberg", "Euskirchen"]), [[EARLY, "JUL"], [LEFT_BANK, "FR"]], { rough: true });
pre(units("DEU", ["Rhein-Kreis Neuss", "Köln", "Rhein-Erft-Kreis", "Bonn", "Ahrweiler"]), [[EARLY, "KOL"], [LEFT_BANK, "FR"]]);
pre(units("DEU", ["Mayen-Koblenz", "Koblenz", "Vulkaneifel", "Trier", "Trier-Saarburg", "Bernkastel-Wittlich", "Cochem-Zell", "Merzig-Wadern", "St. Wendel"]), [[EARLY, "TRI"], [LEFT_BANK, "FR"]], { rough: true });
pre(["DEU/Eifelkreis Bitburg-Prüm"], [[EARLY, "SNLx"], [RATISBON, "FR"], [RYSWICK, "SNLx"], [ANNEX_BELGIUM, "FR"]], { rough: true });
pre(units("DEU", ["Rhein-Hunsrück-Kreis", "Bad Kreuznach", "Alzey-Worms", "Donnersbergkreis", "Kaiserslautern", "Landkreis Kaiserslautern", "Bad Dürkheim", "Ludwigshafen am Rhein",
  "Rhein-Pfalz-Kreis", "Frankenthal (Pfalz)", "Neustadt an der Weinstraße", "Germersheim", "Südliche Weinstraße"]), [[EARLY, "PAL"], [PALATINATE_BAVARIA, "BAV"], [LEFT_BANK, "FR"]], { rough: true });
pre(units("DEU", ["Kusel", "Zweibrücken", "Südwestpfalz", "Pirmasens", "Saarpfalz-Kreis"]), [[EARLY, "ZWE"], [LEFT_BANK, "FR"]], { rough: true });
pre(units("DEU", ["Neunkirchen", "Regionalverband Saarbrücken", "Birkenfeld", "Speyer", "Worms"]), [[EARLY, "HRE"], [LEFT_BANK, "FR"]], { rough: true });
pre(["DEU/Saarlouis"], [[EARLY, "LOR"], ["1680-01-01", "FR"]], { rough: true });
pre(["DEU/Landau in der Pfalz"], [[EARLY, "HRE"], ["1680-01-01", "FR"]]);
pre(units("DEU", ["Mainz", "Mainz-Bingen"]), [[EARLY, "MAI"], [LEFT_BANK, "FR"]]);
pre(units("DEU", ["Bergstraße", "Aschaffenburg", "Landkreis Aschaffenburg", "Miltenberg", "Main-Taunus-Kreis", "Rheingau-Taunus-Kreis"]), [[EARLY, "MAI"]], { rough: true });
pre(units("DEU", ["Odenwaldkreis", "Offenbach am Main", "Landkreis Offenbach", "Wetteraukreis"]), [[EARLY, "HRE"]]);
pre(units("DEU", ["Hochsauerlandkreis", "Olpe"]), [[EARLY, "KOL"]]);
pre(["DEU/Main-Kinzig-Kreis"], [[EARLY, "HAU"], [HANAU_1736, "HK"]]);
// Germany, south: Bavaria with the bishoprics of Freising, Passau, Bamberg, and Würzburg and the Swabian lands it gained in 1802 and
// 1803; the Innviertel, Austrian from the Treaty of Teschen; Palatinate-Neuburg (the Elector Palatine's from 1685) and Sulzbach;
// Ansbach and Bayreuth, joined in 1769 and Prussian from 1792; Baden-Baden, joined to Baden-Durlach in 1771; the Palatinate's right
// bank; Freiburg, French from Nijmegen to Ryswick; and the free cities and lesser states of Swabia and Franconia.
pre(units("DEU", ["Freising", "Garmisch-Partenkirchen", "Landkreis Augsburg", "Dillingen a.d. Donau", "Neu-Ulm", "Donau-Ries", "Unterallgäu", "Memmingen", "Ostallgäu", "Kaufbeuren",
  "Kempten (Allgäu)", "Oberallgäu"]), [[EARLY, "HRE"], [INDEMNITIES, "BAV"]]);
pre(units("DEU", ["Passau", "Landkreis Passau", "Lindau (Bodensee)", "Regensburg", "Eichstätt", "Berchtesgadener Land"]), [[EARLY, "HRE"]]);
pre(["DEU/Mühldorf a. Inn"], [[EARLY, "SALZ"], [INDEMNITIES, "BAV"]], { rough: true });
pre(units("DEU", ["Bamberg", "Landkreis Bamberg", "Forchheim", "Lichtenfels", "Kronach"]), [[EARLY, "BAM"], [INDEMNITIES, "BAV"]]);
pre(units("DEU", ["Würzburg", "Landkreis Würzburg", "Kitzingen", "Main-Spessart", "Bad Kissingen", "Rhön-Grabfeld", "Haßberge", "Schweinfurt", "Landkreis Schweinfurt"]), [[EARLY, "WZBb"], [INDEMNITIES, "BAV"]]);
pre(["DEU/Neuburg-Schrobenhausen"], [[EARLY, "PNE"], ["1685-05-26", "PAL"], [PALATINATE_BAVARIA, "BAV"]]);
pre(["DEU/Amberg-Sulzbach"], [[EARLY, "HRE"], [PALATINATE_BAVARIA, "BAV"]], { rough: true });
pre(units("DEU", ["Ansbach", "Landkreis Ansbach", "Fürth", "Landkreis Fürth", "Roth", "Schwabach", "Weißenburg-Gunzenhausen"]), [[EARLY, "ANS"], [ANSBACH_PRUSSIA, "PRg"]]);
pre(units("DEU", ["Bayreuth", "Landkreis Bayreuth", "Kulmbach", "Hof", "Landkreis Hof", "Wunsiedel i. Fichtelgebirge", "Erlangen", "Erlangen-Höchstadt", "Neustadt a.d. Aisch-Bad Windsheim"]),
  [[EARLY, "BAYR"], [BAYREUTH_1769, "ANS"], [ANSBACH_PRUSSIA, "PRg"]]);
pre(units("DEU", ["Baden-Baden", "Rastatt"]), [[EARLY, "BBA"], [BADEN_1771, "BAD"]]);
pre(units("DEU", ["Heidelberg", "Mannheim", "Rhein-Neckar-Kreis", "Neckar-Odenwald-Kreis"]), [[EARLY, "PAL"], [PALATINATE_BAVARIA, "BAV"]]);
pre(["DEU/Ortenaukreis"], [[EARLY, "AUS"]], { rough: true });
pre(units("DEU", ["Schwarzwald-Baar-Kreis", "Main-Tauber-Kreis", "Heilbronn", "Rottweil", "Ostalbkreis", "Schwäbisch Hall", "Hohenlohekreis", "Biberach", "Ulm"]), [[EARLY, "HRE"]]);
pre(["DEU/Freiburg im Breisgau"], [[EARLY, "AUS"], [NIJMEGEN_EMP, "FR"], [RYSWICK, "AUS"]]);
pre(units("AUT", ["Braunau am Inn", "Ried im Innkreis", "Schärding"]), [[EARLY, "BAV"], [TESCHEN, "AUSg"]]);

// Prussia's growth in the east: Farther Pomerania (Westphalia), Stettin and the land east of the Peene (the Treaty of Stockholm of
// 1720), Lauenburg and Bütow (Wehlau, 1657), Ducal Prussia (Polish until Wehlau), Silesia and Glatz (the Treaty of Berlin of 1742),
// and the partitions of Poland: Royal Prussia, Warmia, and the Netze District in 1772, Danzig, Thorn, and Greater Poland in 1793,
// and Warsaw, Masovia, Podlachia, and New Silesia in 1795.
pre(["POL:West Pomeranian Voivodeship/*"], [[EARLY, "PR"]]);
pre(units("POL", ["Szczecin", "Powiat policki", "Powiat goleniowski", "Powiat kamieński", "Świnoujście"]), [[EARLY, "SWP"], [STOCKHOLM_1720, "PR"]], { rough: true });
pre(["POL/Powiat wałecki"], [[EARLY, "PLC"], [PARTITION_1, "PR"]]);
pre(["POL:Warmian-Masurian Voivodeship/*", "RUS:Kaliningrad/*", "LTU/Klaipėda"], [[EARLY, "DPR"], [WEHLAU, "PR"]]);
pre(units("POL", ["Olsztyn", "Powiat olsztyński", "Powiat lidzbarski", "Powiat braniewski", "Elbląg", "Powiat elbląski", "Powiat nowomiejski"]), [[EARLY, "PLC"], [PARTITION_1, "PR"]], { rough: true });
pre(["POL:Pomeranian Voivodeship/*", "POL:Kuyavian-Pomeranian Voivodeship/*", "POL:Greater Poland Voivodeship/*", "POL:Łódź Voivodeship/*", "POL:Lubusz Voivodeship/Powiat międzyrzecki",
  "POL:Lubusz Voivodeship/Powiat wschowski"], [[EARLY, "PLC"], [PARTITION_2, "PR"]]);
pre(units("POL", ["Słupsk", "Powiat słupski", "Powiat lęborski", "Powiat bytowski"]), [[EARLY, "PR"]]);
pre(["POL:Pomeranian Voivodeship/Powiat kwidzyński"], [[EARLY, "DPR"], [WEHLAU, "PR"]]);
pre(units("POL", ["Gdynia", "Sopot", "Powiat kartuski", "Powiat kościerski", "Powiat pucki", "Powiat wejherowski", "Powiat starogardzki", "Powiat tczewski", "Powiat malborski",
  "Powiat sztumski", "Powiat chojnicki", "Powiat człuchowski", "Powiat gdański", "Grudziądz", "Powiat grudziądzki", "Powiat świecki", "Powiat tucholski", "Powiat złotowski",
  "Bydgoszcz", "Powiat bydgoski", "Powiat inowrocławski", "Powiat mogileński", "Powiat żniński", "Powiat nakielski", "Powiat sępoleński", "Powiat chodzieski", "Powiat pilski",
  "Powiat czarnkowsko-trzcianecki", "Powiat wągrowiecki", "Powiat chełmiński", "Powiat wąbrzeski", "Powiat brodnicki", "Powiat golubsko-dobrzyński"]).concat(["POL:Pomeranian Voivodeship/Powiat nowodworski"]),
  [[EARLY, "PLC"], [PARTITION_1, "PR"]], { rough: true });
pre(["POL:Masovian Voivodeship/*", "POL:Podlaskie Voivodeship/*"].concat(units("POL", ["Powiat myszkowski", "Powiat zawierciański", "Powiat będziński", "Sosnowiec", "Dąbrowa Górnicza", "Jaworzno"])),
  [[EARLY, "PLC"], [PARTITION_3, "PR"]]);
pre(units("POL", ["Płock", "Powiat płocki", "Powiat gostyniński", "Powiat sierpecki", "Powiat żuromiński", "Powiat płoński", "Powiat mławski", "Powiat sochaczewski", "Powiat żyrardowski",
  "Częstochowa", "Powiat częstochowski", "Powiat kłobucki"]), [[EARLY, "PLC"], [PARTITION_2, "PR"]], { rough: true });
pre(["POL:Lower Silesian Voivodeship/*", "POL:Opole Voivodeship/*"].concat(units("POL", ["Bytom", "Chorzów", "Gliwice", "Jastrzębie-Zdrój", "Katowice", "Mysłowice", "Piekary Śląskie",
  "Powiat bieruńsko-lędziński", "Powiat gliwicki", "Powiat lubliniecki", "Powiat mikołowski", "Powiat pszczyński", "Powiat raciborski", "Powiat rybnicki", "Powiat tarnogórski",
  "Powiat wodzisławski", "Ruda Śląska", "Rybnik", "Siemianowice Śląskie", "Świętochłowice", "Tychy", "Zabrze", "Żory", "Powiat zielonogórski", "Zielona Góra", "Powiat nowosolski",
  "Powiat żagański", "Powiat świebodziński"])), [[EARLY, "AUSg"], [BERLIN_1742, "PR"]]);
// Austria's share: Galicia (1772), West Galicia with Kraków and Lublin (1795), and Bukovina (1775); the Ottoman Podolia of 1672 to
// 1699.
pre(["POL:Podkarpackie Voivodeship/*", "UKR:Lviv/*", "UKR:Ivano-Frankivsk/*", "UKR:Ternopil/*"].concat(units("POL", ["Nowy Sącz", "Tarnów", "Powiat bocheński", "Powiat dąbrowski",
  "Powiat gorlicki", "Powiat limanowski", "Powiat myślenicki", "Powiat nowosądecki", "Powiat nowotarski", "Powiat oświęcimski", "Powiat suski", "Powiat tarnowski", "Powiat tatrzański",
  "Powiat wadowicki", "Powiat wielicki", "Powiat żywiecki"]), ["POL:Lesser Poland Voivodeship/Powiat brzeski"]), [[EARLY, "PLC"], [PARTITION_1, "AUS"]]);
pre(units("UKR:Ternopil", ["Borshchiv", "Buchach", "Chortkiv", "Husiatyn", "Zalishchyky"]), [[EARLY, "PLC"], [BUCZACZ, "OTT"], [KARLOWITZ, "PLC"], [PARTITION_1, "AUS"]], { rough: true });
pre(["POL/Kraków", "POL:Lesser Poland Voivodeship/Powiat krakowski", "POL/Powiat chrzanowski", "POL:Lublin Voivodeship/*", "POL:Świętokrzyskie Voivodeship/*", "POL/Powiat siemiatycki"].concat(units("POL", ["Powiat miechowski",
  "Powiat olkuski", "Powiat proszowicki", "Radom", "Powiat radomski", "Powiat przysuski", "Powiat szydłowiecki", "Powiat zwoleński", "Powiat lipski", "Powiat kozienicki", "Powiat białobrzeski",
  "Powiat garwoliński", "Powiat otwocki", "Powiat miński", "Siedlce", "Powiat siedlecki", "Powiat łosicki", "Powiat sokołowski", "Powiat węgrowski", "Powiat opoczyński"])), [[EARLY, "PLC"], [PARTITION_3, "AUS"]]);
pre(["UKR:Chernivtsi/*", "ROU/Suceava"], [[EARLY, "MOL"], [BUKOVINA, "AUS"]]);
pre(units("UKR:Chernivtsi", ["Kelmentsi", "Khotyn", "Novoselytsia", "Sokyriany"]), [[EARLY, "MOL"], ["1713-01-01", "OTT"]], { rough: true });

// Hungary and the Balkans: Ottoman Hungary, Slavonia, Bačka, and Syrmia to the Peace of Karlowitz; Transylvania, an Ottoman
// vassal until then; the Banat to Passarowitz; Oltenia and northern Serbia Austrian from Passarowitz to the Treaty of Belgrade;
// Venice's Dalmatia, Istria, and Bay of Kotor, Austrian from Campo Formio; the Morea, Venetian from Karlowitz to Passarowitz;
// Crete, Venetian until 1669; and the Ionian Islands, Venetian, French from Campo Formio, the Septinsular Republic from 1800.
pre(units("HUN", ["Budapest", "Pest", "Érd", "Fejér", "Székesfehérvár", "Dunaújváros", "Tolna", "Szekszárd", "Baranya", "Pécs", "Somogy", "Kaposvár", "Bács-Kiskun", "Kecskemét",
  "Csongrád-Csanád", "Szeged", "Hódmezővásárhely", "Békés", "Békéscsaba", "Jász-Nagykun-Szolnok", "Szolnok", "Heves", "Eger", "Nagykanizsa"]), [[EARLY, "OTT"], [KARLOWITZ, "AUS"]], { rough: true });
pre(units("HUN", ["Hajdú-Bihar", "Debrecen"]).concat(units("ROU", ["Alba", "Bistrița-Năsăud", "Brașov", "Cluj", "Covasna", "Harghita", "Hunedoara", "Mureș", "Sibiu", "Sălaj", "Maramureș", "Satu Mare"])),
  [[EARLY, "TRA"], [KARLOWITZ, "AUS"]], { rough: true });
pre(["ROU/Bihor"], [[EARLY, "TRA"], ["1664-08-10", "OTT"], [KARLOWITZ, "AUS"]], { rough: true });
pre(["ROU/Arad"].concat(units("SRB", ["South Bačka", "North Bačka", "West Bačka", "Srem"]), units("HRV", ["Brod-Posavina", "Osijek-Baranja", "Požega-Slavonia", "Virovitica-Podravina",
  "Vukovar-Syrmia", "Lika-Senj"])), [[EARLY, "OTT"], [KARLOWITZ, "AUS"]], { rough: true });
pre(units("ROU", ["Timiș", "Caraș-Severin"]).concat(units("SRB", ["South Banat", "North Banat", "Central Banat"])), [[EARLY, "OTT"], [PASSAROWITZ, "AUS"]]);
pre(units("ROU", ["Dolj", "Gorj", "Mehedinți", "Vâlcea", "Olt"]), [[EARLY, "WAL2"], [PASSAROWITZ, "AUS"], [BELGRADE_1739, "WAL2"]], { rough: true });
pre(units("SRB", ["Belgrade", "Šumadija", "Podunavlje", "Braničevo", "Pomoravski", "Kolubara", "Mačva"]), [[EARLY, "OTT"], [PASSAROWITZ, "AUS"], [BELGRADE_1739, "OTT"]], { rough: true });
pre(units("HRV", ["Zadar", "Šibenik-Knin", "Split-Dalmatia"]).concat(units("MNE", ["Kotor", "Tivat", "Herceg Novi", "Budva"])), [[EARLY, "VEN"], [CAMPO_FORMIO, "AUS"]], { rough: true });
pre(["GRC/Peloponnese"], [[EARLY, "OTT"], [KARLOWITZ, "VEN"], [PASSAROWITZ, "OTT"]]);
pre(["GRC/Crete"], [[EARLY, "VEN"], [CANDIA, "OTT"]]);
pre(["GRC/Ionian Islands[!19.5,39.1,20.3,39.9;20.5,38.55,20.8,38.9]", "GRC/Ionian Islands[19.5,39.1,20.3,39.9]"], [[EARLY, "VEN"], [CAMPO_FORMIO, "FR"], [SEPTINSULAR, "ION"]]);
pre(["GRC/Ionian Islands[20.5,38.55,20.8,38.9]"], [[EARLY, "OTT"], [KARLOWITZ, "VEN"], [CAMPO_FORMIO, "FR"], [SEPTINSULAR, "ION"]]);

// Poland-Lithuania, Sweden's Baltic provinces, and the Cossack and Tatar lands, Russian by stages: Smolensk and the Left Bank by
// Andrusovo (the Hetmanate under the Tsar from Pereyaslav, absorbed in 1764), Ingria, Estonia, and Livonia by the Treaty of Nystad,
// the Zaporozhian lands at the end of the Sich (1775), the steppe by Küçük Kaynarca and Crimea from 1783, Yedisan by the Treaty
// of Jassy, and the partitions of 1772, 1793, and 1795 (Courland in March 1795).
pre(["LTU/*", "BLR:Grodno/*", "BLR:Brest/*", "UKR:Volyn/*", "UKR:Rivne/*"].concat(units("UKR:Ternopil", ["Kremenets", "Lanivtsi", "Shumsk"])), [[EARLY, "PLC"], [PARTITION_3, "RUS"]]);
pre(["LTU/Klaipėda"], [[EARLY, "DPR"], [WEHLAU, "PR"]]);
pre(["BLR:Minsk/*", "UKR:Zhytomyr/*", "UKR:Vinnytsia/*", "UKR:Kyiv/*", "UKR:Cherkasy/*", "MDA:Camenca/*"], [[EARLY, "PLC"], [PARTITION_2, "RUS"]], { rough: true });
pre(["UKR:Khmelnytskyi/*"], [[EARLY, "PLC"], [BUCZACZ, "OTT"], [KARLOWITZ, "PLC"], [PARTITION_2, "RUS"]], { rough: true });
pre(["BLR:Vitebsk/*", "BLR:Mahilioŭ/*", "BLR:Gomel/*", "LVA@Latgale"], [[EARLY, "PLC"], [PARTITION_1, "RUS"]], { rough: true });
pre(["LVA@Kurzeme", "LVA@Zemgale"], [[EARLY, "CUR"], ["1795-03-28", "RUS"]]);
pre(["LVA@Vidzeme", "LVA@Riga", "EST/*", "RUS:Leningrad/*", "RUS:Saint Petersburg/*", "FIN/South Karelia"], [[EARLY, "SW"], [NYSTAD, "RUS"]], { rough: true });
pre(["RUS:Smolensk/*"], [[EARLY, "PLC"], [ANDRUSOVO, "RUS"]]);
pre(["UKR/Kyiv"], [[EARLY, "PLC"], [PEREYASLAV, "HET"], [ANDRUSOVO, "RUS"]]);
pre(["UKR:Chernihiv/*", "UKR:Poltava/*"], [[EARLY, "PLC"], [PEREYASLAV, "HET"], [HETMANATE_END, "RUS"]], { rough: true });
pre(["UKR:Dnipropetrovsk/*", "UKR:Zaporizhzhia/*", "UKR:Kirovohrad/*"], [[EARLY, "ZAP"], [SICH_END, "RUS"]], { rough: true });
pre(["UKR:Kherson/*", "UKR:Mykolaiv/*"], [[EARLY, "CRI"], [KAINARJI, "RUS"]], { rough: true });
pre(["RUS:Autonomous Republic of Crimea/*", "RUS:Sevastopol/*"], [[EARLY, "CRI"], [CRIMEA_1783, "RUS"]]);
pre(["MDA:Transnistria/*", "MDA:Grigoriopol/*"].concat(units("UKR:Odessa", ["Ananiv", "Balta", "Berezivka", "Biliaivka", "Ivanivka", "Kodyma", "Liubashivka", "Lyman", "Mykolaivka", "Okny",
  "Ovidiopol", "Podilsk", "Rozdilna", "Savran", "Shyriaieve", "Velyka Mykhailivka", "Zakharivka"])), [[EARLY, "OTT"], [JASSY, "RUS"]], { rough: true });

// Scandinavia: Scania, Blekinge, and Bohuslän's south Swedish from the Treaty of Roskilde (Halland Swedish since 1645), and
// Trøndelag Swedish from Roskilde to the Treaty of Copenhagen.
pre(["SWE/Skåne", "SWE/Blekinge"], [[EARLY, "DN"], [ROSKILDE, "SW"]]);
pre(["NOR/Nord-Trøndelag", "NOR/Sør-Trøndelag"], [[EARLY, "DN"], [ROSKILDE, "SW"], [COPENHAGEN_1660, "DN"]]);

// The German states that went to Prussia in 1866, the North German Confederation's members from 1867, and the south's from
// the Empire: each row whose owner on the day is one of them goes on to the new owner then.
const fold = (date, keys, to) => {
  for (const [sels, tl] of LAND) {
    let k = -1;
    for (let j = 0; j < tl.length; j++) if (tl[j][0] <= date) k = j;
    if (k < 0 || !keys.includes(tl[k][1])) continue;
    if (k + 1 < tl.length) throw new Error("napoleonic: " + sels[0] + " changes after " + date + ", so it can't be folded into " + to);
    tl.push([date, to]);
  }
};
fold(ANNEX_1866, ["HAN", "HK", "NUS", "NWE", "FFM"], "PRg");
fold(NGC, ["PR", "PRg", "SAX", "SWE", "SCS", "SMEI", "SHI", "SGA", "SSO", "SRU", "REUe", "REUy", "MS", "MST", "OLD", "BRU", "ADE", "LIP", "SLI", "WAL", "HAM", "BRE", "LUB"], "GER");
fold(EMPIRE, ["BAV", "WUR", "BAD", "HD"], "GER");

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
// From 1800 the map changes by the day, so a stretch that takes in no 1 July is kept there (France's last months in
// Alsace-Lorraine, from the Republic of 4 September 1870 to the Treaty of Frankfurt; Prussia's annexations of 1866 before
// the North German Confederation), if it lasts a week or more; before 1800, where the map changes by the year, or for a day or
// two between two acts (the German Federal Act of 8 June 1815 and the Final Act of Vienna the next day), it is dropped.
const BY_DAY = "1800-01-01", BY_DAY_MIN = 7;
const keepShort = (a, b) => a >= toDay(BY_DAY) && b - a + 1 >= BY_DAY_MIN;
function periods(tl, log, what) {
  const end = toDay(END);
  if (tl[0][0] !== EARLY) throw new Error("napoleonic: " + what + " does not start on " + EARLY);
  const list = tl.map(([from, x]) => ({ a: toDay(from), x }));
  list.forEach((p, i) => { if (i && p.a <= list[i - 1].a) throw new Error("napoleonic: " + what + " has its dates out of order at " + isoOf(p.a)); p.b = i + 1 < list.length ? list[i + 1].a - 1 : end; });
  for (;;) {
    const k = list.findIndex((p) => { const [f, l] = yearsOf(p.a, p.b); return f > l && !keepShort(p.a, p.b); });
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
    const mine = neAll.filter((x) => x.properties.adm0_a3 === c && x.properties.region);
    const f = mine.find((x) => rewind(polysOf(x.geometry)).some((poly) => inRing(poly[0], pt)));
    if (f) return f.properties.region;
    const k = Math.cos((pt[1] * Math.PI) / 180), gap = (x) => Math.min(...polysOf(x.geometry).flatMap((poly) => poly[0].map((q) => ((q[0] - pt[0]) * k) ** 2 + (q[1] - pt[1]) ** 2)));
    const near = mine.reduce((m, x) => { const d = gap(x); return !m || d < m.d ? { x, d } : m; }, null);
    return near ? near.x.properties.region : null;
  };
  const byCountry = new Map();
  geoms.forEach((g, i) => {
    const pr = provinces[g.properties.p];
    if (!byCountry.has(pr.c)) byCountry.set(pr.c, []);
    byCountry.get(pr.c).push({ i, n: g.properties.n, prov: pr.n });
  });
  const unitCountry = (i) => provinces[geoms[i].properties.p].c;
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
  const rows = LAND.map(([sels, tl, opt], k) => {
    for (const [, o] of tl) if (!O[o]) throw new Error("napoleonic: no owner " + o);
    return { k, items: sels.flatMap(resolve), tl, rough: !!(opt && opt.rough) };
  });
  if (errors.length) throw new Error("napoleonic: " + errors.join("; "));
  const last = new Map();
  rows.forEach((r) => r.items.forEach(([i, , key]) => { last.set(key, r); last.set(String(i), r); }));
  rows.forEach((r) => { r.items = r.items.filter(([i, f, key]) => last.get(key) === r && (f || last.get(String(i)) === r)); });
  // Before 1803: each unit (or cut or box of one) takes the history of the last PRE row that names it, and the row is parted
  // among its units' histories. A whole unit PRE parts by cuts is parted the same way. A unit no PRE row names keeps its owner
  // of 1803 back to 1648 (counted by country, for checking).
  {
    const preKey = new Map(), prePieces = new Map();
    PRE.forEach(([sels, tl, opt], k) => {
      for (const [, o] of tl) if (!O[o]) throw new Error("napoleonic: no owner " + o + " (PRE)");
      if (tl[0][0] !== EARLY) throw new Error("napoleonic: PRE row " + sels[0] + " does not start on " + EARLY);
      if (tl.some(([d]) => d >= W)) throw new Error("napoleonic: PRE row " + sels[0] + " runs past " + W);
      const pr = { k, tl, rough: !!(opt && opt.rough) };
      for (const it of sels.flatMap(resolve)) {
        preKey.set(it[2], pr);
        if (!it[1]) { preKey.set(String(it[0]), pr); prePieces.delete(it[0]); }
        else { if (!prePieces.has(it[0])) prePieces.set(it[0], new Map()); prePieces.get(it[0]).set(it[2], [it, pr]); }
      }
    });
    if (errors.length) throw new Error("napoleonic: " + errors.join("; "));
    const composed = [], bare = new Map();
    for (const r of rows) {
      const parts = new Map();
      const put = (pr, it) => { if (!parts.has(pr)) parts.set(pr, []); parts.get(pr).push(it); };
      for (const it of r.items) {
        const [i, f, key] = it;
        if (preKey.has(key)) put(preKey.get(key), it);
        else if (!f && prePieces.has(i)) for (const [pit, pr] of prePieces.get(i).values()) put(pr, pit);
        else if (preKey.has(String(i))) put(preKey.get(String(i)), it);
        else { put(null, it); const c = unitCountry(i) + ":" + r.tl[0][1]; bare.set(c, (bare.get(c) || 0) + 1); }
      }
      for (const [pr, items] of parts) {
        let tl;
        if (!pr) tl = [[EARLY, r.tl[0][1]]].concat(r.tl.slice(1));
        else {
          const head = pr.tl.slice();
          tl = head.concat(head[head.length - 1][1] === r.tl[0][1] && !pr.rough ? r.tl.slice(1) : r.tl);
        }
        composed.push({ k: r.k + (pr ? "/" + pr.k : ""), items, tl, roughUntil: r.rough ? Infinity : pr && pr.rough ? toDay(W) : -Infinity });
      }
    }
    rows.splice(0, rows.length, ...composed);
    log("before 1803, units no PRE row names (they keep their owner of 1803): " + [...bare].map(([c, n]) => c + " " + n).join(", "));
  }
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
  const blocks = rows.filter((r) => r.items.length).map((r) => ({ items: r.items, roughUntil: r.roughUntil, per: periods(r.tl, log, "land row " + r.k + " (" + r.tl.map((t) => t.join(" ")).join(", ") + ")") }));
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
    const rough = p.a < blk.roughUntil;
    const k = p.x + "|" + p.a + "|" + p.b + (rough ? "|rough" : "");
    if (!groups.has(k)) groups.set(k, { owner: p.x, a: p.a, b: p.b, rough, items: [] });
    groups.get(k).items.push(...blk.items);
  }
  const end = toDay(END), spans = [];
  for (const g of groups.values()) {
    const fr = attrs[g.owner].some((p) => p.x.ruler === "@FR");
    const cuts = [...new Set([g.a, ...attrs[g.owner].concat(fr ? attrs.FR : []).map((p) => p.a).concat([toDay(HRE_END)]).filter((d) => d > g.a && d <= g.b)])].sort((x, y) => x - y).map((a) => ({ a, at: a }));
    // Before 1800, a stretch that takes in no 1 July takes the attributes of the stretch after it (or, at the end, of the one
    // before it); from 1800 it is kept, as the map changes by the day.
    for (;;) {
      const k = cuts.findIndex((c, n) => { const [f, l] = yearsOf(c.a, n + 1 < cuts.length ? cuts[n + 1].a - 1 : g.b); return f > l && !keepShort(c.a, n + 1 < cuts.length ? cuts[n + 1].a - 1 : g.b); });
      if (k < 0 || cuts.length < 2) break;
      if (k + 1 < cuts.length) { cuts[k].at = cuts[k + 1].at; cuts.splice(k + 1, 1); } else cuts.splice(k, 1);
    }
    cuts.forEach((c, n) => {
      const at = attrAt(g.owner, c.at), ruler = at.ruler === "@FR" ? attrAt("FR", c.at).name : at.ruler || "";
      spans.push({ name: at.name, wiki: at.wiki || at.name, ruler, status: at.status || 0, part: at.part || "", b: g.rough ? Math.min(1, at.b ?? 1) : at.b ?? 1, claims: at.claims || null, host: !!at.host, items: g.items, da: c.a, db: n + 1 < cuts.length ? cuts[n + 1].a - 1 : g.b });
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
    // A unit cut in two (Mulhouse from the Haut-Rhin, the Saar's line of 1815 through the Moselle) is joined back to the land
    // around it, so the state has no seam where the cut ran.
    if (polys.length > 1 && items.some(([, f]) => f && f.cut)) {
      try { polys = rewind(clip.union(polys)); } catch (e) { log("shape " + key.slice(0, 60) + ": the cut pieces could not be joined (" + e.message + ")"); }
    }
    shapes.set(key, polys);
    return polys;
  };
  const out = [];
  for (const s of spans) {
    let [first, lastY] = yearsOf(s.da, s.db);
    // A stretch from 1800 that takes in no 1 July is filed under the year of the 1 July after it starts, and is shown by its days.
    if (first > lastY && keepShort(s.da, s.db)) lastY = first;
    if (first > lastY) { log("span " + s.name + " " + isoOf(s.da) + " to " + isoOf(s.db) + " takes in no 1 July, so it is left out"); continue; }
    const polys = shapeOf(s.items);
    if (!polys.length) continue;
    out.push({ name: s.name, wiki: s.wiki, ruler: s.ruler, status: s.status, part: s.part, b: s.b, ...(s.claims ? { claims: s.claims.slice().sort(), noLabel: false } : {}), host: s.host,
      first, last: lastY, dayFrom: s.da > toDay(EARLY) ? [first, s.da - DAY_1886] : null, dayTo: s.db < end ? [lastY, s.db - DAY_1886] : null, from: isoOf(s.da), to: isoOf(s.db), polys });
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
