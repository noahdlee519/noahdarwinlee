// The bridge of the south, from 1445 to 1647: Naples, Sicily, Sardinia, Malta, the Papal States, San Marino, and the Maghreb,
// carried from their owners of 1444 to the table of 1648 (Italy) or to the names the sources draw in 1648 (the Maghreb).
import { bridgeRows } from "./medieval-bridge.mjs";

export function bridgeSouth(h) {
  if (globalThis.CHRONIA_BRIDGE_PAIRS) return;
  const { own, later, add, has } = h, { units, row } = bridgeRows(add);
  const CROA = "Crown of Aragon", SPAIN = "Kingdom of Spain", FRANCE = "Kingdom of France";
  // Charles I's proclamation at Brussels after Ferdinand II's death (23 January 1516): from then the lands of the Crown of Aragon
  // in Italy are kingdoms under the Kingdom of Spain, as the table of 1648 draws them.
  const CHARLES = "1516-01-23";
  const VICE = [CHARLES, { part: "", ruler: SPAIN, status: 5 }];

  // ——— Naples, Sicily, and Sardinia ———
  // Naples: Alfonso V's with the Crown of Aragon to his death (27 June 1458), then his son Ferrante's own line; parted by the Treaty
  // of Granada between Louis XII (Naples, the Terra di Lavoro, the Abruzzi) and Ferdinand II (Apulia, Calabria) at Frederick's fall
  // (1 August 1501); all Ferdinand's from Gonzalo de Córdoba's entry into Naples (16 May 1503) after Cerignola, kept by the Treaty
  // of Lyon (31 January 1504). Charles VIII's occupation of 1495 is left out.
  later("SICK", [["1458-06-27", { part: "" }], ["1501-08-01", { part: CROA }], VICE]);
  later("SICA", [VICE]);
  later("SARK", [VICE]);
  own("SICKF", "Kingdom of Naples", { ruler: FRANCE, status: 5 });
  row("SICK|Kingdom of Naples", "1501-08-01 SICKF; 1503-05-16 SICK", ["Naples", "Caserta", "Avellino", "Salerno", "L'Aquila", "Teramo", "Pescara", "Chieti", "Isernia", "Campobasso"]);
  // The Pontine land with Terracina, which Eugene IV left to Alfonso V for his life by the Treaty of Terracina (1443): the Church's
  // again at his death.
  row("SICK|Papal States", "1458-06-27 PAP");

  // Malta and Gozo, with Tripoli, granted by Charles V as King of Sicily to the Knights Hospitaller (23 March 1530), a fief of the
  // Sicilian crown.
  own("HOSPM", "Hospitaller Malta", { ruler: "Kingdom of Sicily", status: 5 });
  own("HOSPT", "Hospitaller Tripoli", { ruler: "Kingdom of Sicily", status: 5 });
  row("SICA|-", "1530-03-23 HOSPM");

  // ——— The Papal States ———
  // Urbino a duchy of the Montefeltro by Sixtus IV's grant (21 August 1474), a papal fief, devolved to the Church at Francesco
  // Maria II della Rovere's death (28 April 1631); Cesare Borgia's (1502–1503) and Lorenzo de' Medici's (1516–1519) seizures are
  // left out.
  own("URBN", "Duchy of Urbino", { ruler: "Papal States", status: 5 });
  row("PAP|Papal States", "1474-08-21 URBN; 1631-04-28 PAP", ["Pesaro and Urbino"]);
  // Rimini sold to Venice by Pandolfo Malatesta at Cesare Borgia's fall (24 November 1503); the Romagna's towns and Ravenna,
  // Venetian from 1441, given up to Julius II after Agnadello (14 May 1509). Venice's hold of Ravenna from 1527 to 1529 is left out.
  row("PAP|Papal States", "1503-11-24 VEN; 1509-05-14 PAP", ["Rimini"]);
  row("VEN|Papal States", "1509-05-14 PAP");
  // San Marino, which the table of 1444 draws with the Church's land around it: the republic in its lasting borders from Pius II's
  // grant of Fiorentino, Montegiardino, and Serravalle after the war against Sigismondo Malatesta (27 June 1463).
  own("SMAR", "Republic of San Marino", { wiki: "San Marino" });
  row("PAP|-", "1463-06-27 SMAR", ["SMR"]);

  // ——— Morocco ———
  // The Wattasids take Fez (1472) and the Marinids' name ends; the Saadi sharifs are proclaimed in the Sous (1510), take Marrakesh
  // (1525), keep the south to the Tadla by the peace after the battle there (1536), win Doukkala with the Portuguese leaving Safi
  // and Azemmour (1541), and take Fez (28 January 1549); the Wattasid return of 1554 with the Turks of Algiers lasted nine months
  // and is left out. The east to the Moulouya and Oujda from the Saadi march on Tlemcen (1550). Melilla to Castile (17 September
  // 1497).
  later("MARS", [["1472-01-01", { name: "Wattasid dynasty", wiki: "Wattasid dynasty" }]]);
  own("SAADI", "Saadi Sultanate", { host: true });
  row("MARS|-", "1510-01-01 SAADI", ["Suss-Massa-Draa"]);
  row("BERP|-", "1510-01-01 SAADI", ["Guelmim"]);
  row("MARS|-", "1525-01-01 SAADI", ["Marrakesh-Tensift-El Haouz"]);
  row("MARS|-", "1536-01-01 SAADI", ["Tadla-Azilal"]);
  row("MARS|-", "1541-01-01 SAADI", ["Doukkala Abda"]);
  row("MARS|-", "1549-01-28 SAADI", ["Fès-méknas-boulmane", "Meknès-Tafilalet", "Gharb-Chrarda-Béni Hssen", "Rabat-Salé-Zemmour-Zaër", "Chaouia-Ouardigha", "Grand Casablanca",
    "Taza-Al Hoceïma-Taounate", "Tangier-Tetouan"]);
  row("ZAYY|-", "1550-01-01 SAADI", ["Oriental"]);
  row("MARS|Kingdom of Spain", "1497-09-17 CAS; " + CHARLES + " SPAIN");

  // ——— Algiers ———
  // Aruj Barbarossa at Jijel (1514) and Algiers (1516), sultan there, with Médéa, Miliana, and Ténès (1517); his brother Hayreddin
  // gave the land to Selim I (1519), and from then it is the Ottoman Empire's, as the sources name the Regency. Constantine and the
  // east under Algiers (1528), Bône after the Spanish garrison left (1540), Béjaïa, Spanish from 5 January 1510, taken by Salah Rais
  // (28 September 1555), and the Zayyanids of Tlemcen ended (1554). In the mountains of Kabylia the Kingdoms of Kuku (about 1515) and
  // of the Ait Abbas (1510), which the Regency never ruled. Oran Castile's from Cisneros's conquest (17 May 1509).
  own("ALGB", "Sultanate of Algiers", { wiki: "Regency of Algiers" });
  own("KUKU", "Kingdom of Kuku");
  own("AITA", "Kingdom of Ait Abbas", { wiki: "Kingdom of the Ait Abbas" });
  row("HAFS|-", "1514-01-01 ALGB; 1519-01-01 OTT", ["Jijel"]);
  row("HAFS|-", "1516-01-01 ALGB; 1519-01-01 OTT", ["Algiers", "Blida", "Tipasa", "Boumerdès", "Bouïra"]);
  row("HAFS|-", "1517-01-01 ALGB; 1519-01-01 OTT", ["Médéa"]);
  row("ZAYY|-", "1517-01-01 ALGB; 1519-01-01 OTT", ["Aïn Defla", "Chlef"]);
  row("HAFS|-", "1515-01-01 KUKU", ["Tizi Ouzou"]);
  row("HAFS|-", "1510-01-01 AITA", ["Bordj Bou Arréridj"]);
  row("HAFS|-", "1510-01-05 AITA; 1555-09-28 OTT", ["Béjaïa"]);
  row("HAFS|-", "1528-01-01 OTT", ["Constantine", "Mila", "Skikda", "Guelma", "Souk Ahras", "Oum El Bouaghi", "Khenchela", "Batna", "Biskra", "Tébessa", "Sétif", "M'Sila"]);
  row("HAFS|-", "1540-01-01 OTT", ["Annaba", "El Tarf"]);
  row("ZAYY|-", "1554-01-01 OTT", ["Tlemcen", "Aïn Témouchent", "Sidi Bel Abbès", "Mascara", "Relizane", "Mostaganem", "Saïda", "Tiaret", "Tissemsilt", "Naama"]);
  row("ZAYY|-", "1509-05-17 CAS; " + CHARLES + " SPAIN", ["Oran"]);

  // ——— Tunis and Tripoli ———
  // The Hafsids under Charles V's protection from the Treaty of Tunis (6 August 1535) after his conquest; Dragut, from Tripoli, took
  // Gafsa (1556) and Kairouan (1558), and Sinan Pasha and Uluj Ali ended the Hafsids at Tunis (13 September 1574). Uluj Ali's hold
  // of Tunis from 1569 to 1573 is left out. Tripoli taken by Pedro Navarro (25 July 1510) and put under the viceroy of Sicily, the
  // Knights' with Malta (1530), and Ottoman from Sinan Pasha's and Dragut's siege (15 August 1551); its country, which the Hafsids
  // had lost, the tribes' between.
  later("HAFS", [["1535-08-06", { ruler: SPAIN, status: 5 }]]);
  row("HAFS|-", "1574-09-13 OTT", ["TUN"]);
  row("HAFS|-", "1556-01-01 OTT", ["Gafsa"]);
  row("HAFS|-", "1558-01-01 OTT", ["Kairouan", "Sidi Bouzid"]);
  row("HAFS|-", "1510-07-25 SICA; 1530-03-23 HOSPT; 1551-08-15 OTT", ["Tripoli District"]);
  row("HAFS|-", "1510-07-25 BERP; 1551-08-15 OTT", ["Jafara", "Zawiya", "Nuqat al Khams", "Murqub", "Misrata"]);
}
