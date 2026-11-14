// The bridge of 1445 to 1647 in the Balkans, Hungary, the Romanian principalities, Anatolia west of 40° E, and Cyprus: the Ottoman
// conquest from the fall of Constantinople to the Long War, the partition of Hungary after Mohács, and Venice's stato da mar.
// Today's units stand in for the districts of the time; a unit split between two owners goes to whoever held most of it.
import { bridgeRows } from "./medieval-bridge.mjs";

export function bridgeBalkans(h) {
  if (globalThis.CHRONIA_BRIDGE_PAIRS) return;
  const { own, later, add, has } = h, { units, row } = bridgeRows(add);
  const OTTN = "Ottoman Empire", VENN = "Republic of Venice";

  // ——— New owners ———
  // The Duchy of Saint Sava: Stjepan Vukčić Kosača, Grand Duke of Bosnia, styled himself herceg from October 1448 (drawn from 1449);
  // most of it fell to the Ottomans in 1465 and 1466, and Herceg Novi, the last of it, in January 1482.
  own("HERZ", "Duchy of Saint Sava", { wiki: "Duchy of Saint Sava" });
  // Zeta under the Crnojevići: Stefan Crnojević lord of Zeta from 1451, under Venice by the agreement of Vranjina (6 September 1455);
  // Ivan Crnojević came back in 1481 as a vassal of the sultan, and Đurađ fled in 1496, when the Ottomans took the land.
  own("ZETC", "Principality of Zeta", { wiki: "Zeta under the Crnojevići" }, [["1455-09-06", { ruler: VENN, status: 5 }], ["1481-01-01", { ruler: OTTN, status: 5 }]]);
  // Montenegro under its bishops of Cetinje, conventionally from 1516; the table of 1648 draws it without an overlord.
  own("MNEB", "Prince-Bishopric of Montenegro", { wiki: "Prince-Bishopric of Montenegro" });
  // John Zápolya's Hungary, from his election at Székesfehérvár (10 November 1526): the sultan's vassal from his homage on the field
  // of Mohács (18 August 1529), the Principality of Transylvania from the Treaty of Speyer (16 August 1570).
  own("EHUN", "Eastern Hungarian Kingdom", { wiki: "Eastern Hungarian Kingdom" }, [["1529-08-18", { ruler: OTTN, status: 5 }],
    ["1570-08-16", { name: "Principality of Transylvania", wiki: "Principality of Transylvania (1570–1711)" }]]);
  // Safavid Iran, holding Erzincan from Ismail's rising (1501) to Çaldıran.
  own("BKSAF", "Safavid Iran", { wiki: "Safavid Iran", host: true });

  // ——— Renamed or changed owners ———
  // The Morea's despots and the Gattilusi of Lesbos paid the sultan tribute after the fall of Constantinople.
  later("MORE", [["1453-05-29", { ruler: OTTN, status: 5 }]]);
  later("GATT", [["1453-05-29", { ruler: OTTN, status: 5 }]]);
  // The Duchy of the Archipelago, tributary to the sultan from Barbarossa's raid (1537), annexed at Joseph Nasi's death (1579).
  later("NAXO", [["1537-01-01", { ruler: OTTN, status: 5 }]]);
  // Ragusa, under the Hungarian crown until Mohács (29 August 1526); it paid the sultan tribute from 1458 and is drawn free after,
  // as in the table of 1648.
  later("RAGU", [["1526-08-29", { ruler: "", status: 0 }]]);
  // Wallachia, the sultan's tributary since 1417: the principality's name from Mehmed II's campaign of 1462, which put Radu the Fair
  // on the throne. Moldavia paid tribute from 1456, Stephen the Great stopped it in 1473 and took it up again by his treaty of 1503;
  // Suleiman's campaign of 1538 (Suceava, 15 September) made the principality the sultan's for good.
  later("WALL", [["1462-01-01", { name: "Principality of Wallachia", wiki: "Wallachia" }]]);
  later("MOLD", [["1456-01-01", { ruler: OTTN, status: 5 }], ["1473-01-01", { ruler: "", status: 0 }], ["1503-01-01", { ruler: OTTN, status: 5 }],
    ["1538-09-15", { name: "Principality of Moldavia", wiki: "Moldavia" }]]);
  // Dulkadir, the sultan's after Turnadağ (12 June 1515), annexed in 1522; the Ramadanids, his after Marj Dabiq (24 August 1516),
  // annexed in 1608.
  later("DULK", [["1515-06-12", { ruler: OTTN, status: 5 }]]);
  later("RAMA", [["1516-08-24", { ruler: OTTN, status: 5 }]]);

  // ——— Constantinople, Greece, and the islands ———
  const FALL = "1453-05-29 OTT";
  row("NICA|Ottoman Empire", FALL);
  row("NICA|-", FALL);
  // Athens (4 June 1456), the Morea (Mistra, 29 May 1460), Lesbos (September 1462).
  row("ATHE|Ottoman Empire", "1456-06-04 OTT");
  row("MORE|Ottoman Empire", "1460-05-29 OTT");
  row("GATT|Ottoman Empire", "1462 OTT");
  row("NAXO|Ottoman Empire", "1579 OTT");
  // The Ionian Islands: the Tocco's islands to the Ottomans (1479); Zakynthos to Venice in 1484 and Cephalonia on 24 December 1500,
  // from when Venice, with Corfu, held most of the unit.
  row("CEPH|Republic of Venice", "1479 OTT; 1500-12-24 VEN");

  // ——— Serbia ———
  // The Despotate restored by the Peace of Szeged (15 August 1444, in the table of 1444): Novo Brdo and the south fell on 1 June 1455,
  // Smederevo on 20 June 1459.
  const SOUTH = "1455-06-01 OTT", SMED = "1459-06-20 OTT";
  add(["KOS/*"], "+ " + SOUTH);
  row("OTT|Ottoman Empire", SOUTH, ["Toplica"]);
  row("OTT|Ottoman Empire", SMED, ["Šumadija", "Kolubara", "Moravica", "Raška", "Rasina", "Zlatibor", "Mačva", "Pomoravski", "Braničevo"]);
  row("SRB|Ottoman Empire", SMED, ["SRB"]);
  row("HUNG|Ottoman Empire", "1444-08-15 SRB; " + SMED, ["Podunavlje"]);
  row("SRB|Ottoman Empire", SOUTH, ["Andrijevica", "Berane", "Bijelo Polje", "Kolašin", "Mojkovac", "Plav", "Rožaje"]);

  // ——— Zeta, Montenegro, and the Venetian coast ———
  // The coast was Venice's (Kotor from 1420, Budva and Bar from 1442 and 1443), and the Despotate restored in August 1444 did not
  // have it back; Bar and Ulcinj fell to the Ottomans in 1571.
  const COAST = "1444-08-15 VEN";
  row("SRB|Republic of Venice", COAST, ["Kotor", "Tivat", "Budva"]);
  row("SRB|Ottoman Empire", COAST + "; 1571 OTT", ["Bar", "Ulcinj"]);
  row("SRB|Ottoman Empire", "1451 ZETC; 1478 OTT", ["Podgorica"]);
  row("SRB|Prince-Bishopric of Montenegro", "1451 ZETC; 1496 OTT; 1516 MNEB");

  // ——— Bosnia and Herzegovina ———
  const BOSNIA = "1463-05-25 OTT", HERZEG = "1449 HERZ";
  row("BOS|Ottoman Empire", "1451 OTT", ["Sarajevo Canton"]);
  row("BOS|Ottoman Empire", BOSNIA, ["Sarajevo-Romanija", "Vlasenica", "Zenica-Doboj Canton"]);
  // The Banate of Srebrenik, Hungarian from Matthias's campaign of 1464 to 1512.
  row("BOS|Ottoman Empire", BOSNIA + "; 1464 HUNG; 1512 OTT", ["Bijeljina", "Brčko", "Doboj", "Posavina Canton", "Tuzla Canton"]);
  row("BOS|Ottoman Empire", HERZEG + "; 1466 OTT", ["Herzegovina-Neretva Canton", "Trebinje"]);
  row("CRO|Ottoman Empire", HERZEG + "; 1466 OTT", ["West Herzegovina Canton"]);
  row("SRB|Ottoman Empire", HERZEG + "; 1465 OTT", ["Bosnian Podrinje Canton", "Foča", "Nikšić", "Pljevlja", "Plužine", "Šavnik", "Žabljak"]);
  row("SRB|Republic of Venice", HERZEG + "; 1482 OTT", ["Herceg Novi"]);
  row("CRO|Ottoman Empire", BOSNIA, ["Central Bosnia Canton", "Livno"]);
  // The Banate of Jajce, Hungarian from Matthias's capture of Jajce (26 December 1463), Ferdinand's in 1527, lost in 1528.
  row("CRO|Ottoman Empire", BOSNIA + "; 1463-12-26 HUNG; 1527-01-01 HABM; 1528 OTT", ["Banja Luka"]);

  // ——— Croatia and Dalmatia ———
  // The Sabor's election of Ferdinand at Cetin (1 January 1527); Lika and Krbava lost in 1527 and 1528, Bihać on 19 June 1592.
  const CETIN = "1527-01-01 HABM";
  row("CRO|Habsburg Monarchy", CETIN);
  row("CRO|Ottoman Empire", CETIN + "; 1528 OTT", ["Lika-Senj"]);
  row("CRO|Ottoman Empire", CETIN + "; 1592-06-19 OTT", ["Una-Sana Canton"]);
  // Knin fell on 29 May 1522; what was left free of the unit was Venice's Šibenik, and the table of 1648 draws Dalmatia's coastal
  // units as Venetian.
  row("CRO|Republic of Venice", "1522-05-29 VEN");
  // Istria's march, the Patriarch of Aquileia's: Venice's in fact since 1420, by the patriarch's cession of 1445.
  row("ISTM|Republic of Venice", "1445 VEN", ["HRV"]);

  // ——— Albania ———
  row("VEN|Ottoman Empire", "1478 OTT", ["Lezhë"]);
  row("VEN|Ottoman Empire", "1479-01-25 OTT", ["Shkodër"]);
  row("VEN|Ottoman Empire", "1501-08-17 OTT", ["Durrës"]);

  // ——— Hungary ———
  // Ferdinand's election at Pressburg (17 December 1526) for the west and north; John Zápolya's (10 November) for the rest. The
  // Treaty of Weissenburg (19 July 1551) gave Ferdinand the east, which called John Sigismund back in 1556.
  const FERD = "1526-12-17 HABM", JOHN = "1526-11-10 EHUN", WEISS = "1551-07-19 HABM", BUDA = "1541-08-29 OTT";
  const HH = "HUNG|Habsburg Monarchy", HO = "HUNG|Ottoman Empire", HT = "HUNG|Principality of Transylvania";
  row(HH, FERD);
  // The lordships Frederick III kept by the Treaty of Wiener Neustadt (19 July 1463), Austrian until 1647.
  row(HH, "1463-07-19 AUSM; 1526-10-23 HABM", ["Eisenstadt", "Eisenstadt-Umgebung", "Mattersburg", "Oberpullendorf", "Rust"]);
  // The north-east, Zápolya's until Weissenburg.
  row(HH, JOHN + "; " + WEISS, ["Košice", "Borsod-Abaúj-Zemplén", "Miskolc", "Szabolcs-Szatmár-Bereg", "Nyíregyháza",
    "Berehove", "Irshava", "Mukachevo", "Perechyn", "Svaliava", "Uzhhorod", "Velykyi Bereznyi", "Volovets", "Vynohradiv"]);
  // Máramaros, a county of the Partium and Transylvania's (Huszt) through 1648 and after.
  row(HH, JOHN + "; " + WEISS + "; 1556 EHUN", ["Khust", "Mizhhiria", "Rakhiv", "Tiachiv"]);
  // Nógrád, Ottoman from 1552 to the reconquest of 1593, kept by the Peace of Zsitvatorok.
  row(HH, FERD + "; 1552 OTT; 1593 HABM", ["Nógrád", "Salgótarján"]);
  row(HT, JOHN + "; " + WEISS + "; 1556 EHUN");
  // Belgrade (29 August 1521); Syrmia and Osijek in the campaign of Mohács (29 August 1526).
  row(HO, "1521-08-29 OTT", ["Belgrade"]);
  row(HO, "1526-08-29 OTT", ["Srem", "Vukovar-Syrmia", "Osijek-Baranja"]);
  // Slavonia: Brod in 1536, Požega in 1537, Virovitica in 1552.
  row(HO, JOHN + "; 1536 OTT", ["Brod-Posavina"]);
  row(HO, JOHN + "; 1537 OTT", ["Požega-Slavonia"]);
  row(HO, FERD + "; 1552 OTT", ["Virovitica-Podravina"]);
  // Buda (29 August 1541) and the plain between the Danube and the Tisza; Pécs, Székesfehérvár, and Szeged in 1543; Hatvan in 1544.
  row(HO, JOHN + "; " + BUDA, ["Budapest", "Pest", "Érd", "Bács-Kiskun", "Kecskemét", "Tolna", "Szekszárd", "Dunaújváros", "North Bačka", "South Bačka", "West Bačka"]);
  row(HO, JOHN + "; 1543 OTT", ["Baranya", "Pécs", "Fejér", "Székesfehérvár", "Szeged", "Csongrád-Csanád", "Hódmezővásárhely"]);
  row(HO, FERD + "; 1544 OTT", ["Heves"]);
  row(HO, FERD + "; 1555 OTT", ["Somogy", "Kaposvár"]);
  // Temesvár (27 July 1552) and Szolnok (4 September 1552); Gyula in 1566.
  row(HO, JOHN + "; " + WEISS + "; 1552-07-27 OTT", ["Timiș", "Arad", "Caraș-Severin", "Central Banat", "North Banat", "South Banat"]);
  row(HO, JOHN + "; " + WEISS + "; 1552-09-04 OTT", ["Jász-Nagykun-Szolnok", "Szolnok"]);
  row(HO, JOHN + "; " + WEISS + "; 1566 OTT", ["Békés", "Békéscsaba"]);
  // Eger (13 October 1596) and Kanizsa (22 October 1600), in the Long War.
  row(HO, FERD + "; 1596-10-13 OTT", ["Eger"]);
  row(HO, FERD + "; 1600-10-22 OTT", ["Nagykanizsa"]);

  // ——— Moldavia's east ———
  // The left bank of the Dniester below Dubăsari, Ottoman with Bender from the campaign of 1538.
  row("MOLD|Ottoman Empire", "1538-09-15 OTT");

  // ——— Anatolia and Cyprus ———
  // The Isfendiyarids (1461) and Trebizond (15 August 1461); Karaman's Konya (1468) and its last lands (1487).
  row("CAND|-", "1461 OTT");
  row("TREB|-", "1461-08-15 OTT");
  row("KARA|-", "1468 OTT", ["Konya"]);
  row("KARA|-", "1487 OTT", ["Karaman"]);
  row("DULK|-", "1522 OTT");
  row("RAMA|-", "1608 OTT");
  // The Mamluks' north, Ottoman from Marj Dabiq (24 August 1516).
  row("MAML|-", "1516-08-24 OTT", ["TUR"]);
  // Erzincan: the Aq Qoyunlu's at Jahan Shah's fall (11 November 1467), Safavid from 1501, Ottoman from Çaldıran (23 August 1514).
  row("QARA|-", "1467-11-11 AQQO; 1501 BKSAF; 1514-08-23 OTT", ["TUR"]);
  // Cyprus: Famagusta from Genoa to the kingdom (1464); Caterina Cornaro's abdication to Venice (26 February 1489); Nicosia fell on
  // 9 September 1570 and Famagusta on 1 August 1571.
  row("CYPK|-", "1489-02-26 VEN; 1570-09-09 OTT");
  row("GEN|-", "1464 CYPK; 1489-02-26 VEN; 1571-08-01 OTT", ["CYP"]);
}
