// The bridge, from 1445 to 1647: the land the Holy Roman Empire held on 1 July 1444 (with the Burgundian Low Countries, Franche-Comté,
// and Silesia), carried by the medieval table to the year before the table of 1648 (napoleonic.mjs), so that the Empire's members are
// drawn unit by unit from one table to the other. Noah asked on 12 November 2026 for the seam of 1444/1445 to be closed with the
// members drawn separately; until then the sources drew the Empire from 1445 with 12 to 23 members, against 87 in 1444 and 93 in 1648,
// and the slivers of the Empire's own land between them showed as stray lines.
//
// Each unit starts with its owner of 1444 and ends with its owner of 1648; medieval-bridge-units.json (written by bridge-pairs.mjs)
// groups the units by that pair ("KEY|1648 name"), and the rows below date the changes between, from the events that made them. A
// pair with no row keeps its owner of 1444 to 1647 and changes in 1648, as before: those are mostly the table's own simplifications of
// 1444 (Franconia's and Thuringia's small lords under one name) or of 1648 (the Saxon duchies under their names of the 1680s), which
// no event dates. Occupations in war are left out, as in the table of 1648 (the Hungarian rule of Vienna from 1485 to 1490, the
// Swabian League's Württemberg from 1520 to 1534, the Thirty Years' War).
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const UNITS = globalThis.CHRONIA_BRIDGE_PAIRS ? {} : JSON.parse(readFileSync(resolve(here, "medieval-bridge-units.json"), "utf8"));

export function bridge(h) {
  // bridge-pairs.mjs reads the table of 1444 without the bridge, whose rows all begin after it.
  if (globalThis.CHRONIA_BRIDGE_PAIRS) return;
  const { own, later, add } = h;
  const HRE = "Holy Roman Empire";
  // A pair's units, all or those whose name is in names (the unit, after the province).
  const units = (pair, names) => {
    const l = UNITS[pair];
    if (!l) throw new Error("bridge: no pair " + pair + " (run bridge-pairs.mjs)");
    if (!names) return l;
    const out = l.filter((s) => names.includes(s.slice(s.indexOf("/") + 1)));
    if (out.length !== names.length) throw new Error("bridge: " + pair + " has not all of " + names.join(", "));
    return out;
  };
  const row = (pair, tl, names) => add(units(pair, names), "+ " + tl);

  // ——— New owners ———
  // The Habsburg Monarchy from Ferdinand I's election as King of Bohemia (23 October 1526), joining the Austrian lands, Bohemia,
  // Moravia, Silesia, and Lusatia; its land in Hungary is the sources'.
  own("HABM", "Habsburg Monarchy", { part: HRE });
  // The Low Countries: Burgundian to Mary of Burgundy's death (27 March 1482), then the Habsburg Netherlands, one state from the
  // Pragmatic Sanction (4 November 1549), the Spanish Netherlands from Philip II's accession (16 January 1556); the Dutch Republic from
  // the Act of Abjuration (26 July 1581).
  own("HABN", "Habsburg Netherlands", {}, [["1556-01-16", { name: "Spanish Netherlands", wiki: "Spanish Netherlands", ruler: "Kingdom of Spain", status: 5 }]]);
  own("DUTCH", "Dutch Republic");
  // Saxony: the Leipzig partition (26 August 1485) gave the Albertines Meissen as a duchy and the Ernestines the electorate with
  // Thuringia; the Capitulation of Wittenberg (19 May 1547) passed the electorate to the Albertines and left the Ernestines Thuringia.
  own("ALBS", "Duchy of Saxony", { wiki: "Duchy of Saxony (Albertine)", part: HRE });
  own("ERNS", "Ernestine duchies", { part: HRE });
  // Bavaria reunited by the Cologne arbitration (30 July 1505), which made Palatinate-Neuburg of Landshut's lands north of the Danube.
  own("PNEU", "Palatinate-Neuburg", { part: HRE });
  // Jülich-Cleves-Berg from John III's succession in Cleves and Mark (15 March 1521), parted by the Treaty of Xanten (12 November 1614).
  own("JCB", "United Duchies of Jülich-Cleves-Berg", { part: HRE });
  own("JBRG", "Jülich-Berg", { part: HRE, ruler: "Palatinate-Neuburg" });
  // The Franconian Hohenzollerns parted at Albert Achilles' death (11 March 1486): Ansbach and Kulmbach (Bayreuth from 1604).
  own("ANSB", "Principality of Ansbach", { part: HRE });
  own("BADB", "Margraviate of Baden-Baden", { part: HRE });
  own("HESD", "Landgraviate of Hesse-Darmstadt", { part: HRE });
  own("HOLG", "Duchy of Holstein-Gottorp", { part: HRE });
  own("HAMB", "Free City of Hamburg", { part: HRE });
  own("BREMC", "Free City of Bremen", { part: HRE });
  own("MGUS", "Duchy of Mecklenburg-Güstrow", { part: HRE });
  own("ANHD", "Principality of Anhalt-Dessau", { part: HRE });
  own("ANHK", "Principality of Anhalt-Köthen", { part: HRE });
  own("EFRI", "East Frisia", { part: HRE });
  own("TLGS", "Three Leagues");
  own("PARM", "Duchy of Parma and Piacenza");
  own("MODR", "Duchy of Modena and Reggio");

  // ——— Renamed or changed owners ———
  later("AUSM", [["1453-01-06", { name: "Archduchy of Austria", wiki: "Archduchy of Austria" }]]);
  later("WURT", [["1495-07-21", { name: "Duchy of Württemberg", wiki: "Duchy of Württemberg" }]]);
  later("BAV", [["1623-02-25", { name: "Electorate of Bavaria", wiki: "Electorate of Bavaria" }]]);
  later("BRAND", [["1618-08-27", { name: "Brandenburg-Prussia", wiki: "Brandenburg-Prussia" }]]);
  later("HESL", [["1567-03-31", { name: "Landgraviate of Hesse-Kassel", wiki: "Landgraviate of Hesse-Kassel" }]]);
  later("BADM", [["1535-01-01", { name: "Margraviate of Baden-Durlach", wiki: "Margraviate of Baden-Durlach" }]]);
  later("NURB", [["1486-03-11", { name: "Principality of Kulmbach", wiki: "Principality of Bayreuth" }], ["1604-01-01", { name: "Principality of Bayreuth" }]]);
  later("MECK", [["1621-01-01", { name: "Duchy of Mecklenburg-Schwerin", wiki: "Duchy of Mecklenburg-Schwerin" }]]);
  later("HOLS", [["1460-03-05", { ruler: "Kingdom of Denmark" }], ["1474-02-14", { name: "Duchy of Holstein", wiki: "Duchy of Holstein" }]]);
  later("SWIS", [["1499-09-22", { part: "" }]]);
  later("FLOR", [["1530-01-01", { part: "" }], ["1532-04-27", { name: "Duchy of Florence", wiki: "Duchy of Florence" }], ["1569-08-27", { name: "Grand Duchy of Tuscany", wiki: "Grand Duchy of Tuscany" }]]);
  later("ESTE", [["1471-04-14", { name: "Duchy of Ferrara", wiki: "Duchy of Ferrara" }], ["1530-01-01", { part: "" }]]);
  later("MANT", [["1530-01-01", { part: "" }], ["1530-04-08", { name: "Duchy of Mantua", wiki: "Duchy of Mantua" }]]);
  later("MILn", [["1499-10-06", { ruler: "Kingdom of France", status: 5 }], ["1512-12-29", { ruler: "", status: 0 }], ["1515-10-11", { ruler: "Kingdom of France", status: 5 }],
    ["1521-11-19", { ruler: "", status: 0 }], ["1530-01-01", { part: "" }], ["1535-11-01", { ruler: "Kingdom of Spain", status: 5 }]]);
  for (const k of ["SIEN", "LUCC", "SALU", "GEN", "ITK"]) later(k, [["1530-01-01", { part: "" }]]);
  for (const k of ["FLA", "ART", "LOU", "HOL", "HAI", "NAM", "LUXC"]) later(k, [["1482-03-27", { part: "Habsburg Netherlands" }]]);
  later("FCB", [["1493-05-23", { name: "Franche-Comté", wiki: "Franche-Comté", part: "" }], ["1556-01-16", { ruler: "Kingdom of Spain", status: 5 }]]);
  later("POLD", [["1569-07-01", { name: "Polish-Lithuanian Commonwealth", wiki: "Polish–Lithuanian Commonwealth" }]]);

  // ——— The Habsburg lands ———
  const HAB = "1526-10-23 HABM";
  for (const p of ["AUSM|Habsburg Monarchy", "STYR|Habsburg Monarchy", "CARD|Habsburg Monarchy", "TYRO|Habsburg Monarchy", "HABS|Habsburg Monarchy",
    "SWA|Habsburg Monarchy", "BOH|Habsburg Monarchy", "MORM|Habsburg Monarchy", "SILD|Habsburg Monarchy"]) row(p, HAB);
  // Gorizia to Maximilian at Count Leonhard's death (12 April 1500).
  row("AQU|Habsburg Monarchy", "1500-04-12 AUSM; " + HAB);
  // Upper Lusatia, Bohemian, to Saxony by the Peace of Prague (30 May 1635).
  row("BOH|Electorate of Saxony", HAB + "; 1635-05-30 MEIS");
  row("SILD|Electorate of Saxony", HAB + "; 1635-05-30 MEIS");
  row("LUSM|Electorate of Saxony", HAB + "; 1635-05-30 MEIS");
  // The Neumark, bought back from the Teutonic Order by the Treaty of Cölln (1455), and Crossen, to Brandenburg by the Treaty of Kamenz (1482).
  row("SILD|Brandenburg-Prussia", "1455-09-19 BRAND", ["Gorzów Wielkopolski", "Powiat gorzowski", "Powiat strzelecko-drezdenecki", "Powiat sulęciński", "Powiat słubicki"]);
  row("SILD|Brandenburg-Prussia", "1482-09-16 BRAND", ["Powiat krośnieński"]);
  // Oświęcim's and Siewierz's lands and the Polish border towns, Polish in these years.
  row("SILD|Polish-Lithuanian Commonwealth", "1445-01-01 POLD");

  // ——— Bavaria and the Palatinate ———
  row("BING|Electorate of Bavaria", "1447-05-01 BLAN; 1505-07-30 BAV");
  row("BING|Palatinate-Neuburg", "1447-05-01 BLAN; 1505-07-30 PNEU");
  row("BLAN|Electorate of Bavaria", "1505-07-30 BAV");
  row("BMUN|Electorate of Bavaria", "1505-07-30 BAV");
  // The Upper Palatinate to Bavaria (22 February 1628).
  row("PALA|Electorate of Bavaria", "1628-02-22 BAV");

  // ——— Saxony and Thuringia ———
  row("MEIS|Electorate of Saxony", "1485-08-26 ALBS; 1547-05-19 MEIS");
  for (const p of ["THUR|Duchy of Saxe-Weimar-Eisenach", "THUR|Duchy of Saxe-Gotha-Altenburg", "THUR|Duchy of Saxe-Coburg-Saalfeld", "THUR|Duchy of Saxe-Hildburghausen", "THUR|Duchy of Saxe-Meiningen",
    "THUR|Principality of Schwarzburg-Sondershausen", "THUR|Holy Roman Empire"]) row(p, "1482-09-17 MEIS; 1547-05-19 ERNS");
  row("THUR|Electorate of Saxony", "1482-09-17 MEIS; 1485-08-26 ALBS; 1547-05-19 MEIS");
  row("THUR|Electorate of Mainz", "1482-09-17 MAINZ");
  for (const p of ["MEIS|Duchy of Saxe-Weimar-Eisenach", "MEIS|Duchy of Saxe-Gotha-Altenburg"]) row(p, "1547-05-19 ERNS");
  row("ANH|Principality of Anhalt-Dessau", "1603-01-01 ANHD");
  row("ANH|Principality of Anhalt-Köthen", "1603-01-01 ANHK");

  // ——— Brandenburg, Jülich-Cleves, and the north ———
  for (const p of ["JUL|Jülich-Berg", "BERG|Jülich-Berg", "CLEV|Jülich-Berg", "JUL|Holy Roman Empire"]) row(p, "1521-03-15 JCB; 1614-11-12 JBRG");
  for (const p of ["CLEV|Brandenburg-Prussia", "MARK|Brandenburg-Prussia", "RAVB|Brandenburg-Prussia", "CLEV|Holy Roman Empire", "MARK|Holy Roman Empire"]) row(p, "1521-03-15 JCB; 1614-11-12 BRAND");
  row("NURB|Principality of Ansbach", "1486-03-11 ANSB");
  row("FRAD|Principality of Ansbach", "1486-03-11 ANSB");
  row("FRAD|Principality of Bayreuth", "1486-03-11 NURB");
  row("HESL|Landgraviate of Hesse-Darmstadt", "1567-03-31 HESD");
  row("BADM|Margraviate of Baden-Baden", "1535-01-01 BADB");
  row("HOLS|Duchy of Holstein-Gottorp", "1544-08-09 HOLG");
  row("HOLS|Free City of Hamburg", "1510-01-01 HAMB");
  row("BREB|Free City of Bremen", "1646-06-01 BREMC");
  row("MECK|Duchy of Mecklenburg-Güstrow", "1621-01-01 MGUS");
  row("FRIF|East Frisia", "1464-10-01 EFRI");
  row("FRIF|County of Oldenburg", "1575-01-01 OLDC");
  row("BAR|Duchy of Lorraine", "1480-01-01 ULOR");
  // Provence to France by Charles IV of Anjou's will, at his death (11 December 1481).
  row("PROV|Kingdom of France", "1481-12-11 WFR");
  // Metz under France from Henry II's entry (18 April 1552), by the Treaty of Chambord.
  row("METZ|Kingdom of France", "1552-04-18 WFR");

  // ——— The Low Countries and Franche-Comté ———
  for (const p of ["FLA|Spanish Netherlands", "ART|Spanish Netherlands", "LOU|Spanish Netherlands", "HAI|Spanish Netherlands", "NAM|Spanish Netherlands", "LUXC|Spanish Netherlands",
    "LOU|Dutch Republic", "FLA|Dutch Republic"]) row(p, "1549-11-04 HABN");
  row("HOL|Dutch Republic", "1549-11-04 HABN; 1581-07-26 DUTCH");
  row("FLA|Dutch Republic", "1581-07-26 DUTCH", ["Zeeland"]);
  // Friesland (1524), Utrecht and Overijssel (1528), Gelderland by the Treaty of Venlo (12 September 1543), to Charles V.
  row("FRIF|Dutch Republic", "1524-01-01 HABN; 1581-07-26 DUTCH");
  row("UTRB|Dutch Republic", "1528-10-21 HABN; 1581-07-26 DUTCH");
  row("GEL|Dutch Republic", "1543-09-12 HABN; 1581-07-26 DUTCH");
  row("GEL|Spanish Netherlands", "1543-09-12 HABN");
  // Franche-Comté French by the Treaty of Arras (23 December 1482) and Habsburg again by the Treaty of Senlis (23 May 1493).
  row("FCB|Franche-Comté", "1482-12-23 WFR; 1493-05-23 FCB");

  // ——— The Swiss ———
  row("KYB|Swiss Confederation", "1461-06-01 SWIS", ["Thurgau"]);
  row("KYB|Swiss Confederation", "1481-12-22 SWIS", ["Fribourg"]);
  row("KYB|Swiss Confederation", "1501-08-10 SWIS", ["Schaffhausen"]);
  row("EFR|Swiss Confederation", "1481-12-22 SWIS");
  row("SWA|Swiss Confederation", "1501-07-13 SWIS", ["Basel-Stadt", "Basel-Landschaft"]);
  row("SWA|Swiss Confederation", "1513-12-17 SWIS", ["Appenzell Ausserrhoden", "Appenzell Innerrhoden"]);
  row("SWA|Swiss Confederation", "1454-06-13 SWIS", ["St. Gallen"]);
  row("SAVC|Swiss Confederation", "1536-03-31 SWIS");
  row("SWA|Three Leagues", "1471-09-23 TLGS");
  row("MILn|Swiss Confederation", "1512-07-01 SWIS");
  row("MILn|Three Leagues", "1512-07-01 TLGS");

  // ——— Ireland and Scotland ———
  // The Lordship of Ireland a kingdom by the Crown of Ireland Act (proclaimed 18 June 1541); Thomond's and Clanricarde's lords made
  // earls in surrender and regrant (1 July 1543); Laois-Offaly planted (King's County, 1556) and Longford shired (1586); Desmond's
  // fall with the earl's death (11 November 1583); Connacht by its Composition (1585); Ulster, Breifne, and Leinster's mountains by
  // the Treaty of Mellifont (30 March 1603). Orkney and Shetland annexed by Scotland (20 February 1472); the Lordship of the Isles
  // forfeited to the Scottish crown (1493).
  later("LIRE", [["1541-06-18", { name: "Kingdom of Ireland", wiki: "Kingdom of Ireland" }]]);
  row("THOM|-", "1543-07-01 LIRE");
  row("CLAN|-", "1543-07-01 LIRE");
  row("SUN|-", "1556-01-01 LIRE", ["Offaly"]);
  row("SUN|-", "1586-01-01 LIRE", ["Longford"]);
  row("DESM|-", "1583-11-11 LIRE");
  row("MWI|-", "1585-10-03 LIRE");
  row("CON|-", "1585-10-03 LIRE");
  for (const p of ["NUN|-", "AIR|-", "CLAB|-", "BRF|-", "LEI|-"]) row(p, "1603-03-30 LIRE");
  row("ORK|-", "1472-02-20 ALB");
  row("LISL|-", "1493-01-01 ALB");

  // ——— Italy ———
  row("MILn|Duchy of Parma and Piacenza", "1512-07-01 PAP; 1545-08-26 PARM");
  row("SIEN|Grand Duchy of Tuscany", "1557-07-19 FLOR");
  row("ESTE|Papal States", "1598-01-28 PAP");
  row("ESTE|Duchy of Modena and Reggio", "1598-01-28 MODR");
  row("ESTE|Republic of Venice", "1484-08-07 VEN");
  row("SALU|Duchy of Savoy", "1601-01-17 SAVC");
  row("SAVC|Kingdom of France", "1601-01-17 WFR");
}
