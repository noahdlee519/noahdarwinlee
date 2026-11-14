// The bridge of the north, from 1445 to 1647: Poland, Lithuania, Masovia, Prussia, Livonia, and Scandinavia, from their owners of
// 1 July 1444 to those of the table of 1648 (see medieval-bridge.mjs). Wartime holdings that the peace gave back to the same owner are
// left out (Moscow's Polotsk from 1563 to 1579, Sweden's Jämtland from 1563 to 1570 and from 1611 to 1613, the Polish garrisons of
// Moscow); a conquest kept by the peace is dated from the conquest. Where the table of 1648 is wrong for a unit, the unit keeps its
// true owner to 1647 (Courland's Tukums and Kandava, Swedish Koknese, Polish Pilten, Hlukhiv, and Romny, Lębork and Bytów).
import { bridgeRows } from "./medieval-bridge.mjs";

export function bridgeNorth(h) {
  if (globalThis.CHRONIA_BRIDGE_PAIRS) return;
  const { own, later, add } = h, { units } = bridgeRows(add);
  const PLC = "Polish-Lithuanian Commonwealth", POLAND = "Kingdom of Poland", DN = "Denmark-Norway";

  // A pair's units in one province ("CC:Province") or country ("CC"), all or those named; put() dates them and remembers them, and
  // others() gives the pair's units not yet dated, so that each unit has one timeline.
  const used = new Set();
  const pick = (pair, prov, names) => {
    const l = units(pair).filter((s) => s.startsWith(prov + "/") || s.startsWith(prov + ":"));
    if (!names) { if (!l.length) throw new Error("bridge north: " + pair + " has nothing in " + prov); return l; }
    return names.map((n) => { const s = l.find((x) => x.slice(x.indexOf("/") + 1) === n); if (!s) throw new Error("bridge north: " + pair + " has no " + prov + "/" + n); return s; });
  };
  const put = (sel, tl) => { for (const s of sel) { if (used.has(s)) throw new Error("bridge north: " + s + " dated twice"); used.add(s); } add(sel, "+ " + tl); };
  const others = (pair) => units(pair).filter((s) => !used.has(s));

  // ——— The dates ———
  // The Union of Lublin (1 July 1569) made one Commonwealth of the Kingdom of Poland and the Grand Duchy of Lithuania. In the months
  // before it the king passed Podlachia (5 March), Volhynia with Bracław (26 May), and Kiev (6 June) from the Grand Duchy to the Crown.
  const LUBLIN = "1569-07-01", PODLACHIA = "1569-03-05", VOLHYNIA = "1569-05-26", KIEV = "1569-06-06";
  // The truce of the Annunciation (25 March 1503) left Moscow the lands of Chernigov, Novgorod-Seversky, Starodub, Bryansk, and Gomel,
  // whose princes had gone over to Ivan III in 1500; the Truce of Deulino (11 December 1618) gave Chernigov and Novgorod-Seversky to
  // the Commonwealth.
  const ANNUNCIATION = "1503-03-25", DEULINO = "1618-12-11";
  // The Treaty of Vilnius (28 November 1561): the Livonian Order secularised, its land south of the Daugava the Duchy of Courland and
  // Semigallia under Gotthard Kettler, the rest the Duchy of Livonia, both under Sigismund Augustus as Grand Duke of Lithuania.
  const VILNIUS = "1561-11-28";
  // Sweden's conquest of Livonia: Riga (25 September 1621), the rest in the campaign of 1625, kept by the Truce of Altmark (1629).
  const LIVONIA_LIT = VILNIUS + " LITG; " + LUBLIN + " POLK", RIGA_SWE = "1621-09-25 SWE", LIVONIA_SWE = "1625 SWE";
  // The Treaty of Brömsebro (13 August 1645): Jämtland, Härjedalen, Gotland, and Ösel to Sweden, with Halland for thirty years.
  const BROMSEBRO = "1645-08-13";
  // Norway under Denmark: Christian III's charter (30 October 1536) made Norway a land of the Danish crown, and its council ended
  // when Archbishop Olav Engelbrektsson fled Trondheim (1 April 1537).
  const NORWAY = "1537-04-01";
  // Gustav Vasa's election at Strängnäs (6 June 1523), the end of the Kalmar Union.
  const VASA = "1523-06-06";

  // ——— New owners ———
  // The Duchy of Prussia, the Teutonic Order's land secularised under Albert of Hohenzollern as a Polish fief (Treaty of Kraków,
  // 8 April 1525); its dukes the Electors of Brandenburg from 27 August 1618, still under the Polish crown.
  own("DPRU", "Duchy of Prussia", { ruler: POLAND, status: 5 }, [[LUBLIN, { ruler: PLC }]]);
  own("COUR", "Duchy of Courland", { wiki: "Duchy of Courland and Semigallia", ruler: "Grand Duchy of Lithuania", status: 5 }, [[LUBLIN, { ruler: PLC }]]);
  // Riga kept out of the Treaty of Vilnius and stood alone until it swore to Stephen Báthory (Treaty of Drohiczyn, 14 January 1581).
  own("RIGF", "Free City of Riga", { wiki: "Free Imperial City of Riga" });

  // ——— Renamed or changed owners ———
  later("POLK", [[LUBLIN, { name: PLC, wiki: "Polish–Lithuanian Commonwealth" }]]);
  // The Second Peace of Thorn (19 October 1466): the Teutonic Order a fief of the Polish crown.
  later("TEUT", [["1466-10-19", { ruler: POLAND, status: 5 }]]);
  // Sweden an empire from Gustavus Adolphus's accession (30 October 1611).
  later("SWE", [[VASA, { part: "", wiki: "History of Sweden (1523–1611)" }], ["1611-10-30", { name: "Swedish Empire", wiki: "Swedish Empire" }]]);
  later("DAN", [[VASA, { part: "" }], [NORWAY, { name: DN, wiki: "Denmark–Norway" }]]);
  later("NWY", [[VASA, { part: "" }]]);
  for (const k of ["SCHL", "HOLS", "FARO"]) later(k, [[NORWAY, { ruler: DN }]]);

  // ——— Poland and Masovia ———
  // Masovia's duchies fell to the crown as their Piast lines ended: Gostynin with Rawa (1462), Sochaczew (1476), Płock at Janusz II's
  // death (16 February 1495), and Czersk and Warsaw after Janusz III's, when the Masovian estates swore to Sigismund I (10 September
  // 1526). The table of 1444 draws the whole Masovian Voivodeship of today as Masovia: its south (Radom's land, of Sandomierz) and
  // Siedlce (of Łuków) were the crown's and pass with the first incorporation; Drohiczyn's land, which Bolesław IV sold to Casimir
  // of Lithuania in 1444, passes to Lithuania and with Podlachia to the crown.
  const MAZ = "MAZD|" + PLC, MV = "POL:Masovian Voivodeship";
  put(pick(MAZ, MV, ["Powiat gostyniński", "Radom", "Powiat radomski", "Powiat kozienicki", "Powiat lipski", "Powiat szydłowiecki", "Powiat przysuski", "Powiat zwoleński", "Powiat białobrzeski",
    "Siedlce", "Powiat siedlecki"]), "1462 POLK");
  put(pick(MAZ, MV, ["Powiat sochaczewski", "Powiat żyrardowski"]), "1476 POLK");
  put(pick(MAZ, MV, ["Płock", "Powiat płocki", "Powiat sierpecki", "Powiat płoński", "Powiat mławski", "Powiat żuromiński"]), "1495-02-16 POLK");
  put(pick(MAZ, MV, ["Powiat sokołowski", "Powiat łosicki", "Powiat węgrowski"]), "1445 LITG; " + PODLACHIA + " POLK");
  put(others(MAZ), "1526-09-10 POLK");

  // ——— Prussia ———
  // The Thirteen Years' War: the Prussian Confederation gave itself to Casimir IV, who incorporated Prussia (6 March 1454); Gdańsk,
  // Elbląg, and Człuchów were Polish from then, Malbork and Tczew from their sale by the Order's mercenaries (6 June 1457), and the
  // rest of Pomerelia with Warmia by the Second Peace of Thorn (19 October 1466). Lębork and Bytów were granted to Eric II of
  // Pomerania (3 January 1455) and came back to the Polish crown at Bogislaw XIV's death (10 March 1637), Brandenburg's only from 1657;
  // Słupsk, which the table of 1444 draws with them, was Pomeranian throughout.
  const ROYAL = "TEUT|" + PLC, PV = "POL:Pomeranian Voivodeship", WM = "POL:Warmian-Masurian Voivodeship";
  put(pick(ROYAL, PV, ["Gdańsk", "Gdynia", "Sopot", "Powiat gdański", "Powiat nowodworski", "Powiat kartuski", "Powiat człuchowski"]).concat(pick(ROYAL, WM, ["Elbląg", "Powiat elbląski"])), "1454-03-06 POLK");
  put(pick(ROYAL, PV, ["Powiat malborski", "Powiat sztumski", "Powiat tczewski"]), "1457-06-06 POLK");
  put(others(ROYAL), "1466-10-19 POLK");
  put(units("TEUT|Duchy of Prussia"), "1525-04-08 DPRU");
  const LEB = "TEUT|Brandenburg-Prussia";
  put(pick(LEB, PV, ["Powiat lęborski", "Powiat bytowski"]), "1455-01-03 POMD; 1637-03-10 POLK");
  put(others(LEB), "1455-01-03 POMD");

  // ——— Lithuania ———
  const LIT = "LITG|" + PLC;
  // Smolensk fell to Vasili III (30 July 1514) and to Sigismund III (13 June 1611), which the Truce of Deulino confirmed.
  put(pick(LIT, "RUS:Smolensk"), "1514-07-30 MOSC; 1611-06-13 POLK");
  // Chernigov's and Novgorod-Seversky's land, Moscow's from 1503 to Deulino; the south-west of today's region (Oster, Pryluky, and
  // Lyubech, given back in 1508) stayed Lithuanian. Gomel was Moscow's until Lithuania retook it (16 July 1535).
  put(pick(LIT, "UKR:Chernihiv", ["Chernihiv", "Horodnia", "Koriukivka", "Korop", "Kulykivka", "Mena", "Nizhyn", "Novhorod-Siverskyi", "Semenivka", "Snovsk", "Sosnytsia", "Borzna", "Bakhmach"]),
    ANNUNCIATION + " MOSC; " + DEULINO + " POLK");
  put(pick(LIT, "BLR:Gomel", ["Gomel", "Dobrush", "Vetka"]), ANNUNCIATION + " MOSC; 1535-07-16 LITG; " + LUBLIN + " POLK");
  // Podlachia; Łomża's land, Masovian in fact (the table of 1444 draws it Lithuanian), passes with Masovia.
  put(pick(LIT, "POL:Podlaskie Voivodeship", ["Łomża", "Powiat łomżyński", "Powiat kolneński", "Powiat zambrowski"]), "1526-09-10 POLK");
  put(pick(LIT, "POL:Podlaskie Voivodeship", ["Białystok", "Powiat białostocki", "Powiat bielski", "Powiat hajnowski", "Powiat siemiatycki", "Powiat wysokomazowiecki", "Powiat moniecki",
    "Powiat grajewski", "Powiat augustowski"]), PODLACHIA + " POLK");
  put(pick(LIT, "UKR:Volyn").concat(pick(LIT, "UKR:Rivne"), pick(LIT, "UKR:Vinnytsia")), VOLHYNIA + " POLK");
  put(pick(LIT, "UKR:Kyiv").concat(pick(LIT, "UKR:Zhytomyr"), pick(LIT, "UKR:Cherkasy"), pick(LIT, "UKR:Poltava"), pick(LIT, "UKR:Chernihiv").filter((s) => !used.has(s))), KIEV + " POLK");
  put(others(LIT), LUBLIN + " POLK");

  // The land Moscow kept: Bryansk, the Kursk land, and Mtsensk from 1503. Of today's Sumy region the 1648 table gives all to Russia,
  // but Hlukhiv's, Krolevets's, Konotop's, and Romny's land was the Commonwealth's from Deulino to 1648 and stays so.
  const RUS = "LITG|Tsardom of Russia";
  put(pick(RUS, "UKR:Sumy", ["Hlukhiv", "Krolevets", "Konotop", "Romny", "Shostka", "Yampil", "Seredyna-Buda", "Lypova Dolyna"]), ANNUNCIATION + " MOSC; " + DEULINO + " POLK");
  put(others(RUS), ANNUNCIATION + " MOSC");

  // The steppe: Mengli Giray built Ochakiv (1492) on the coast Lithuania had held since Vytautas, and the Ottomans took Ochakiv and
  // the Yedisan from the khan (1526); Bayezid II took Kiliia (14 July 1484) and Akkerman from Moldavia (the table of 1444 draws the
  // Budjak Lithuanian). North of the Kodyma, Savran's and Kodyma's land stayed in Bracław's voivodeship, against the table of 1648.
  const OTTP = "LITG|Ottoman Empire", OD = "UKR:Odessa";
  put(pick(OTTP, OD, ["Bilhorod Dnistrovskyi", "Kiliia", "Izmail", "Reni", "Bolhrad", "Artsyz", "Sarata", "Tarutyne", "Tatarbunary"]), "1484-07-14 OTT");
  put(pick(OTTP, OD, ["Savran", "Kodyma"]), VOLHYNIA + " POLK");
  put(others(OTTP), "1492 CRIM; 1526 OTT");
  put(units("LITG|Crimean Khanate"), "1492 CRIM");
  // The Wild Fields south of Kiev's castles, the Zaporozhian Cossacks' from their first register (2 June 1572).
  put(units("LITG|Zaporozhian Cossacks"), KIEV + " POLK; 1572-06-02 ZAPO");

  // ——— Livonia ———
  // The Livonian War: Ivan IV took Narva (11 May 1558), Dorpat (18 July 1558) with Wierland, and Fellin (1560); the Bishop of
  // Ösel-Wiek sold his land to Denmark (26 September 1559), and the Bishop of Courland Pilten (1560); Reval, Harrien, and Jerwen swore
  // to Eric XIV of Sweden (6 June 1561). Sweden took Wiek (1563), Wesenberg, and Narva (6 September 1581); Moscow gave its Livonian
  // conquests to the Commonwealth by the Truce of Yam-Zapolsky (15 January 1582). Pernau was Sweden's from 1617.
  const LS = "LIVOR|Swedish Empire", LC = "LIVOR|Duchy of Courland", LP = "LIVOR|" + PLC;
  const est = (...n) => n.map((x) => pick(LS, "EST:" + x)[0]), lv = (pair, ...n) => n.map((x) => pick(pair, "LVA:" + x)[0]);
  put(est("Harju", "Rapla", "Järva"), "1561-06-06 SWE");
  put(est("Ida-Viru"), "1558-05-11 MOSC; 1581-09-06 SWE");
  put(est("Lääne-Viru"), "1558-07-18 MOSC; 1581 SWE");
  put(est("Tartu", "Jõgeva", "Põlva", "Võru"), "1558-07-18 MOSC; 1582-01-15 POLK; " + LIVONIA_SWE);
  put(est("Viljandi"), "1560 MOSC; 1582-01-15 POLK; " + LIVONIA_SWE);
  put(est("Valga"), LIVONIA_LIT + "; " + LIVONIA_SWE);
  put(est("Pärnu"), LIVONIA_LIT + "; 1617 SWE");
  put(est("Lääne", "Hiiu"), "1559-09-26 DAN; 1563 SWE");
  put(est("Saare"), "1559-09-26 DAN; " + BROMSEBRO + " SWE");
  put(lv(LS, "Riga"), VILNIUS + " RIGF; 1581-01-14 POLK; " + RIGA_SWE);
  put(lv(LS, "Babīte", "Mārupe", "Olaine", "Stopiņi", "Garkalne", "Ādaži", "Carnikava", "Salaspils"), LIVONIA_LIT + "; " + RIGA_SWE);
  // Courland's Tukums, Kandava, Sloka, and Baldone, which the table of 1648 draws Swedish, and Swedish Livonia's Koknese and
  // Aizkraukle north of the Daugava, which it draws in Courland; Krustpils was Polish Livonia's and Ilūkste Courland's.
  put(lv(LS, "Tukums", "Kandava", "Engure", "Jaunpils", "Baldone", "Ķekava", "Jūrmala").concat(lv(LP, "Ilūkste")), VILNIUS + " COUR");
  put(lv(LC, "Koknese", "Aizkraukle", "Skrīveri", "Pļaviņas"), LIVONIA_LIT + "; " + LIVONIA_SWE);
  put(lv(LC, "Krustpils"), LIVONIA_LIT);
  // Pilten, Denmark's under Duke Magnus, then the Polish crown's own by the Treaty of Kronborg (1585), outside the duchy to 1656.
  put(lv(LC, "Aizpute", "Dundaga", "Pāvilosta"), "1560 DAN; 1585 POLK");
  put(others(LS), LIVONIA_LIT + "; " + LIVONIA_SWE);
  put(others(LC), VILNIUS + " COUR");
  put(others(LP), LIVONIA_LIT);

  // ——— Scandinavia ———
  // Norway, Iceland, and (by their overlord's name) the Faroes under the Danish crown from 1537.
  put(units("NWY|" + DN).concat(units("NWY|-")), NORWAY + " DAN");
  put(units("NWY|Swedish Empire"), NORWAY + " DAN; " + BROMSEBRO + " SWE");
  put(units("DAN|Swedish Empire"), BROMSEBRO + " SWE");
  // Schleswig parted between Christian III and his brothers (9 August 1544): Gottorp's share.
  put(units("SCHL|Duchy of Holstein-Gottorp"), "1544-08-09 HOLG");
  // The peoples' land. Gustav Vasa declared the unsettled north the crown's (1542); the Treaty of Teusina (18 May 1595) drew
  // Sweden's border with Russia through Kainuu and Lapland to the Arctic; the Treaty of Stolbovo (27 February 1617) gave Sweden
  // Kexholm's county, with North Karelia. Hålogaland was Norway's long before and passes with it; in Troms and Finnmark Sweden gave
  // up its claims by the Treaty of Knäred (20 January 1613).
  const SS = "SAMI|Swedish Empire", SD = "SAMI|" + DN;
  put(pick(SS, "SWE").concat(units("FINP|Swedish Empire"), units("TAV|Swedish Empire")), "1542 SWE");
  put(others(SS), "1595-05-18 SWE");
  put(units("KAR|Swedish Empire"), "1617-02-27 SWE");
  put(pick(SD, "NOR:Nordland"), NORWAY + " DAN");
  put(others(SD), "1613-01-20 DAN");
}
