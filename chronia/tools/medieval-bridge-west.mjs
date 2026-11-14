// The bridge in the west, from 1445 to 1647: the British Isles, France's fiefs, and Iberia, from their owners of 1 July 1444 to those
// of the table of 1648 (see medieval-bridge.mjs, whose rows for Ireland, Orkney, the Isles, Burgundy, Provence, and the imperial lands
// stand). England and Scotland keep their owners throughout: the Wars of the Roses changed no border, the Union of the Crowns
// (24 March 1603) was a personal union, and the Commonwealth came after 1648. The Isle of Man stays the Stanleys' lordship under the
// English crown. Berwick (English from 24 August 1482) and Calais (English to 7 January 1558) are smaller than any unit.
import { bridgeRows } from "./medieval-bridge.mjs";

export function bridgeWest(h) {
  if (globalThis.CHRONIA_BRIDGE_PAIRS) return;
  const { own, later, add, has } = h, { units, row } = bridgeRows(add);
  const FR = "Kingdom of France", SP = "Kingdom of Spain";

  // ——— New owners ———
  // Catalonia in the Reapers' War, as the table of 1648 draws it: in revolt from the Corpus de Sang (7 June 1640), under Louis XIII as
  // Count of Barcelona from 23 January 1641, and disputed between France and Spain to the fall of Barcelona (1652).
  own("CATR", "Catalonia", { wiki: "Reapers' War", status: 6, claims: [FR, SP] });
  // Andorra, the co-principality of the Bishop of Urgell and the Count of Foix since the paréage of 8 September 1278. The table of 1444
  // still draws it with the County of Barcelona; it stands apart here from the bridge's first day (see the row below).
  own("ANDO", "Andorra", { wiki: "Andorra" });

  // ——— Changed owners ———
  // Portugal in the Iberian Union: Philip II acclaimed king by the Cortes of Tomar (25 March 1581), John IV acclaimed in Lisbon
  // (1 December 1640). A separate crown of the Spanish king, drawn as the table of 1648 draws Naples and Sicily.
  later("PORC", [["1581-03-25", { ruler: SP, status: 5 }], ["1640-12-01", { ruler: "", status: 0 }]]);

  // ——— Wales and Ulster ———
  // The Principality and the Marcher lordships annexed to England and shired by the Laws in Wales Act 1535 (passed in 1536; the
  // second act followed in 1542).
  row("PWAL|-", "1536-01-01 WES");
  row("WMAR|-", "1536-01-01 WES");
  // Iveagh, the Magennis lordship, with the rest of Ulster at the Treaty of Mellifont (30 March 1603).
  row("IVEA|-", "1603-03-30 LIRE");

  // ——— The end of the Hundred Years' War ———
  // Maine: Le Mans given up to Charles VII (16 March 1448) and held by Charles of Anjou, Count of Maine; to the crown with Provence at
  // the death of his son Charles IV (11 December 1481).
  row("LANC|Kingdom of France", "1448-03-16 ANJ; 1481-12-11 WFR");
  // Normandy: Rouen's surrender (29 October 1449), Caen's after Formigny (1 July 1450), and Cherbourg's (12 August 1450).
  row("LNMD|Kingdom of France", "1449-10-29 WFR", ["Seine-Maritime", "Eure"]);
  row("LNMD|Kingdom of France", "1450-07-01 WFR", ["Calvados", "Orne"]);
  row("LNMD|Kingdom of France", "1450-08-12 WFR", ["Manche"]);
  // Gascony: Bordeaux's surrender (30 June 1451) and Bayonne's (20 August 1451); Bordeaux English again from Talbot's entry
  // (23 October 1452) to its surrender after Castillon (19 October 1453). The Vivarais, which the table of 1444 draws with Aquitaine,
  // follows the first of these dates for want of an event of its own.
  row("AQD|Kingdom of France", "1451-06-30 WFR; 1452-10-23 AQD; 1453-10-19 WFR", ["Gironde"]);
  row("AQD|Kingdom of France", "1451-08-20 WFR", ["Landes"]);
  row("AQD|Kingdom of France", "1451-06-30 WFR", ["Ardèche"]);

  // ——— The great fiefs joined to the French crown ———
  // Dauphiné: the Dauphin Louis, who ruled it as his own, fled to Burgundy (30 August 1456) and Charles VII took it in hand.
  row("DAUF|Kingdom of France", "1456-08-30 WFR");
  // The Somme towns: redeemed by Louis XI (1463), given back to Burgundy by the Treaty of Conflans (5 October 1465), and taken at
  // Charles the Bold's death (5 January 1477).
  row("SOMT|Kingdom of France", "1463-01-01 WFR; 1465-10-05 SOMT; 1477-01-05 WFR");
  // Armagnac: seized at the fall of Lectoure and Count John V's death (1473). Its later grants as an apanage are not drawn.
  row("ARMG|Kingdom of France", "1473-01-01 WFR");
  // Anjou: to the crown at René of Anjou's death (10 July 1480).
  row("ANJ|Kingdom of France", "1480-07-10 WFR");
  // Orléans: its duke king as Louis XII (7 April 1498). Asti, his too, renounced by France at Cambrai (1529) and given to Savoy by
  // Charles V (1531).
  row("ORLd|Kingdom of France", "1498-04-07 WFR");
  row("ORLd|Duchy of Savoy", "1498-04-07 WFR; 1531-01-01 SAVC");
  // Bourbon: the Constable's lands forfeit at his death before Rome (6 May 1527).
  row("BOUR|Kingdom of France", "1527-05-06 WFR");
  // Brittany: the Edict of Union (13 August 1532); the marriages of Duchess Anne (1491, 1499) joined the crowns, not the lands.
  row("BRE|Kingdom of France", "1532-08-13 WFR");
  // Foix-Béarn: its counts Kings of Navarre from 1479. After the conquest of Upper Navarre (Pamplona's surrender, 25 July 1512) the
  // kingdom is the land north of the Pyrenees, with the sovereign Béarn. Foix and Bigorre, French fiefs, join the crown when their
  // lord becomes Henry IV (2 August 1589; the edict of July 1607 confirmed it); Béarn and Navarre by the Edict of Union
  // (20 October 1620).
  row("FOIX|Kingdom of France", "1589-08-02 WFR", ["Ariège", "Hautes-Pyrénées"]);
  row("FOIX|Kingdom of France", "1512-07-25 PAM; 1620-10-20 WFR", ["Pyrenees-Atlantics"]);

  // ——— Iberia ———
  // The Kingdom of Spain from Ferdinand II's death (23 January 1516), when Charles I inherited the Crowns of Castile and Aragon
  // together; from the marriage of 1469 and Ferdinand's accession in Aragon (20 January 1479) the two were a personal union and stay
  // separate owners.
  const SPAIN = "1516-01-23 SPAIN";
  // Álava's selector in the units file ("ESP:Araba / Álava/Araba / Álava") has a slash in its province's name, which the table's
  // resolver reads as the end of the province, so it is named here without its province.
  add(units("CAS|Kingdom of Spain").map((s) => (s.startsWith("ESP:Araba / ") ? "ESP/Araba / Álava" : s)), "+ " + SPAIN);
  for (const p of ["AST|Kingdom of Spain", "ARA|Kingdom of Spain", "VALK|Kingdom of Spain"]) row(p, SPAIN);
  row("MAJK|Kingdom of Spain", SPAIN, ["Balearic Islands"]);
  // Roussillon and Cerdagne: pledged to Louis XI by the Treaty of Bayonne (9 May 1462) and taken by him in 1463; given back by the
  // Treaty of Barcelona (19 January 1493), to the Principality of Catalonia, of which they had been part since 1344; Perpignan's
  // surrender to the French (9 September 1642), in Catalonia's revolt, began the French rule that the Peace of the Pyrenees kept.
  row("MAJK|Kingdom of Spain", "1463-01-01 WFR; 1493-01-19 BCN; " + SPAIN + "; 1642-09-09 CATR", ["Pyrénées-Orientales"]);
  row("BCN|Catalonia", SPAIN + "; 1640-06-07 CATR");
  row("BCN|-", "1445-01-01 ANDO");
  // Granada: Málaga's fall (18 August 1487), Almería's surrender (22 December 1489), and Granada's (2 January 1492).
  row("GRAN|Kingdom of Spain", "1487-08-18 CAS; " + SPAIN, ["Málaga"]);
  row("GRAN|Kingdom of Spain", "1489-12-22 CAS; " + SPAIN, ["Almería"]);
  row("GRAN|Kingdom of Spain", "1492-01-02 CAS; " + SPAIN, ["Granada"]);
  // Gibraltar taken by Castile (20 August 1462).
  row("GRAN|-", "1462-08-20 CAS; " + SPAIN);
  // Upper Navarre: conquered for Ferdinand by Castile's army (Pamplona, 25 July 1512) and joined to the Crown of Castile by the
  // Cortes of Burgos (7 July 1515).
  row("PAM|Kingdom of Spain", "1512-07-25 CAS; " + SPAIN);
  // Melilla taken for Castile (17 September 1497). Ceuta, Portuguese since 1415, kept to Philip IV when Portugal rose
  // (1 December 1640); Portugal ceded it by the Treaty of Lisbon (1668).
  row("MARS|Kingdom of Spain", "1497-09-17 CAS; " + SPAIN);
  row("PORC|Kingdom of Spain", "1640-12-01 SPAIN");
}
