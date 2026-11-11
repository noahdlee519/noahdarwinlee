// Europe, Anatolia, the Levant, and the Caucasus from 962, for the dated maps: the second part of the medieval table, called by
// tools/medieval.mjs with its helpers and blocks of units before the engine runs. It takes the rows of 476 to 961 on with
// rows that inherit ("+ 1035 ARA": the owners before stay), so each block's earlier history is written once. The land of the
// eastern frame (Anatolia east of 40° E, Syria, Lebanon, Israel and Palestine, Jordan, Georgia, Armenia, and Azerbaijan) begins
// in 962. As in the first part, today's units stand in for the counties, marches, and emirates of the time, so nearly every
// line is approximate, and a change known only by its year is dated 1 January.
//
// The realms with members: the Holy Roman Empire from Otto I's coronation (2 February 962), whose duchies, marches, counties,
// and bishoprics are drawn as its members, and whose own name stays on the land no member held; the Kingdom of France from
// Hugh Capet (3 July 987), its great fiefs as members, as West Francia's were; the North Sea Empire of Cnut (England from 1017,
// Denmark from 1019, Norway from 1028, to his death in 1035); and Kievan Rus' from Yaroslav the Wise's death (20 February
// 1054), whose principalities are its members.

export function high(h) {
  const { own, people, later, add, poly, G, F, I, E, P, B, N, SR, BG, HR, RO, GR, TR, UA, BY, RU, PL, Z, T, L, M } = h;
  const { WFRANCIA, GERMANY, ENGLAND, CORDOBA } = h.FRANCE_NAMES;
  const HRE = "Holy Roman Empire", FRANCE = "Kingdom of France", NSE = "North Sea Empire", KRUS = "Kievan Rus'";
  const BYZN = "Byzantine Empire", FATN = "Fatimid Caliphate", SELN = "Great Seljuk Empire", DENMARK = "Kingdom of Denmark", NORWAY = "Kingdom of Norway";
  const CORONATION = "962-02-02", CAPET = "987-07-03", YAROSLAV = "1054-02-20";
  // A member of West Francia that became a member of the Kingdom of France with Hugh Capet.
  const wf = (key, name, attrs = {}, more = []) => own(key, name, { part: WFRANCIA, ...attrs }, [[CAPET, { part: FRANCE }], ...more]);
  // A member of the Empire from its coronation (or from its first entry, if later).
  const hre = (key, name, attrs = {}, more = []) => own(key, name, { part: HRE, ...attrs }, more);
  const rus = (key, name, attrs = {}, more = []) => own(key, name, { part: KRUS, ...attrs }, more);

  // ——— Britain and Ireland ———
  // England: the Danish conquest (Sweyn Forkbeard held it from late 1013 to February 1014, so no 1 July shows it), Cnut's
  // kingdom from 1017 within the North Sea Empire, and the Norman Conquest (1066), which changed the king, not the realm; its
  // war is on the zones of control. Scotland takes Lothian to the Tweed after Carham (1018) and Strathclyde, whose last king is
  // usually taken to have died that year (some put its end in the 1050s); Cumbria south of the Solway is English from William
  // II's taking of Carlisle (1092). Wales: Gruffydd ap Llywelyn's kingdom, Gwynedd with Powys from 1039 and all Wales from
  // 1055 to his death in 1063; then the Norman marcher lordships, Gwent from 1070, the north from 1081 to the rising of 1094,
  // and Glamorgan, Brycheiniog, Ceredigion, and Pembroke from Rhys ap Tewdwr's death in 1093. Ireland's kingdoms stay as they
  // were; Brian Boru's high kingship (1002 to 1014) was an overlordship, not a border, and is left out.
  later("WES", [["1017-01-01", { part: NSE }], ["1035-11-12", { part: "" }]]);
  later("ALB", [["1034-11-25", { name: "Kingdom of Scotland", wiki: "Kingdom of Scotland" }]]);
  later("ISL", [["1098-01-01", { ruler: NORWAY, status: 5 }]]);
  later("DUB", [["980-01-01", { ruler: "Southern Uí Néill", status: 5 }], ["1052-01-01", { ruler: "Kingdom of Leinster" }], ["1072-01-01", { ruler: "Kingdom of Munster" }],
    ["1091-01-01", { ruler: "Kingdom of the Isles" }], ["1094-01-01", { ruler: "Kingdom of Munster" }]]);
  own("WMAR", "Welsh Marches", { ruler: ENGLAND, status: 5 });
  own("BRF", "Kingdom of Breifne");
  add(G("GBR", "Scottish Borders", "East Lothian"), "+ 954 WES; 1018 ALB");
  add(h.ALT_CLUT, "+ 1018 ALB");
  add(h.CUMBRIA, "+ 1018 ALB; 1092 WES");
  add(G("GBR", "Anglesey", "Gwynedd"), "+ 1055 GWY; 1081 WMAR; 1094 GWY");
  add(G("GBR", "Conwy", "Denbighshire"), "+ 1055 GWY; 1073 WMAR; 1094 GWY");
  add(G("GBR", "Powys", "Wrexham"), "+ 1063 POW");
  add(G("GBR", "Flintshire"), "+ 1063 POW; 1070 WMAR");
  add(h.CEREDIGION, "+ 1055 GWY; 1063 DEH; 1093 WMAR; 1096 POW");
  add(h.DYFED, "+ 1055 GWY; 1063 DEH; 1093 WMAR");
  add(G("GBR", "Monmouthshire", "Newport"), "+ 1055 GWY; 1063 GLY; 1070 WMAR");
  add(G("GBR", "Cardiff", "Vale of Glamorgan", "Bridgend", "Rhondda Cynon Taf", "Merthyr Tydfil", "Caerphilly", "Torfaen", "Blaenau Gwent"), "+ 1055 GWY; 1063 GLY; 1093 WMAR");
  add(G("GBR", "Swansea", "Neath Port Talbot"), "+ 1055 GWY; 1063 GLY; 1093 WMAR");
  add(G("IRL", "Leitrim", "Cavan").map((s) => s.replace("IRL/", "IRL:" + s.slice(4) + "/")), "+ 1050 BRF");
  add("IRL#limerick-city", "+ 968 MUN");

  // ——— Scandinavia ———
  // Norway under Danish overlordship from Harald Bluetooth (Haakon Jarl, about 970 to 995) and after Svolder (1000 to 1015),
  // united by Olaf II (the Uplands from 1015), and Cnut's from 1028; Sweden a kingdom from Eric the Victorious (about 970),
  // with the Geats from Olof Skötkonung (about 1000); the Faroes Norway's from about 1035. The March of Schleswig held by the
  // Empire from Otto II's campaign of 974 to the Danes' recovery in 983.
  later("DAN", [["1019-01-01", { part: NSE }], ["1035-11-12", { part: "" }]]);
  later("NWY", [["970-01-01", { ruler: DENMARK, status: 5 }], ["995-01-01", { ruler: "", status: 0 }], ["1000-09-09", { ruler: DENMARK, status: 5 }], ["1015-01-01", { ruler: "", status: 0 }],
    ["1028-01-01", { part: NSE }], ["1035-01-01", { part: "" }]]);
  later("SWE", [["970-01-01", { name: "Kingdom of Sweden", wiki: "Sweden in the Viking Age", people: 0 }]]);
  own("FARO", "Faroe Islands", { wiki: "History of the Faroe Islands", ruler: NORWAY, status: 5 });
  hre("SCHM", "March of Schleswig");
  add(G("NOR", "Hedmark", "Oppland"), "+ 1015 NWY");
  add(G("SWE", "Västra Götaland", "Östergötland", "Jönköping", "Kronoberg", "Kalmar"), "+ 1000 SWE");
  add("FRO/*", "+ 1035 FARO");
  add("DEU#schleswig", "+ 975 SCHM; 983 DAN");

  // ——— France ———
  // West Francia becomes the Kingdom of France with Hugh Capet (3 July 987), whose Duchy of the Franks (Paris and Orléans)
  // becomes the royal demesne; the great fiefs are its members: Flanders (with Artois), Normandy, Brittany, Blois (with
  // Chartres, and Tours until Anjou took it in 1044), Champagne (Troyes and Meaux), Vermandois, Anjou, Maine (held by
  // Normandy from 1063 to 1069 and 1073 to 1090), Burgundy, Aquitaine (with Gascony from 1063), Toulouse, Foix (1012),
  // Carcassonne (bought by Barcelona from 1067, held by the Trencavel from 1083 as its vassals), and Roussillon. Barcelona is
  // counted apart from 988, when Borrell II did not renew his homage after the sack of 985, though the crown's claim stood.
  later("WFR", [[CAPET, { name: FRANCE, wiki: FRANCE }]]);
  for (const k of ["FLA", "NMD", "TOU", "BURD", "PRB", "BRE", "AQD", "VAS"]) later(k, [[CAPET, { part: FRANCE }]]);
  later("BCN", [[CAPET, { part: FRANCE }], ["988-01-01", { part: "" }]]);
  wf("BLO", "County of Blois");
  wf("CHA", "County of Champagne");
  wf("VERM", "County of Vermandois");
  wf("ANJ", "County of Anjou");
  wf("MAI", "County of Maine");
  wf("ROUS", "County of Roussillon");
  wf("CARC", "County of Carcassonne");
  wf("FOIX", "County of Foix");
  wf("URG", "County of Urgell");
  own("TRV", "Trencavel", { ruler: "County of Barcelona", status: 5 });
  add(h.PARIS.concat(F("Loiret")), "+ 987-07-03 WFR");
  add(F("Eure-et-Loir", "Loir-et-Cher"), "+ 962 BLO");
  add(F("Indre-et-Loire"), "+ 962 BLO; 1044 ANJ");
  add(F("Maine-et-Loire"), "+ 962 ANJ");
  add(F("Sarthe", "Mayenne"), "+ 962 MAI; 1063 NMD; 1069 MAI; 1073 NMD; 1090 MAI");
  add(F("Aube", "Marne"), "+ 962 CHA");
  add(F("Aisne"), "+ 962 VERM");
  add(F("Nord", "Pas-de-Calais"), "+ 962 FLA");
  add(F("Pyrénées-Orientales"), "+ 962 ROUS");
  add(F("Aude"), "+ 962 CARC; 1068 BCN; 1083 TRV");
  add(F("Ariège"), "+ 1012 FOIX");
  add(h.GASCONY, "+ 1063 AQD");
  add(F("Gironde"), "+ 977 VAS; 1063 AQD");

  // ——— Lorraine and the Low Countries ———
  // Lotharingia parted into Upper and Lower Lorraine (959); the counties and bishoprics that grew out of them are drawn from
  // the years they are first held as such: Luxembourg (963), Namur (981), Liège (985, Notger's county of Huy), Hainaut (998),
  // Louvain (about 1003), Utrecht (the counties granted in 1024, Drenthe then, Groningen in 1040, Overijssel in 1046), and
  // Guelders (1096); Holland's counts (Dirk II) from the start. Bouillon passes to Liège in 1096, when Godfrey sold it to go
  // on crusade. The rest stays the dukes' of Lower Lorraine.
  hre("ULOR", "Duchy of Upper Lorraine", { wiki: "Duchy of Lorraine" }, [["1048-01-01", { name: "Duchy of Lorraine" }]]);
  hre("LLOR", "Duchy of Lower Lorraine", { wiki: "Lower Lorraine" });
  hre("LUXC", "County of Luxembourg");
  hre("NAM", "County of Namur");
  hre("LIE", "Prince-Bishopric of Liège");
  hre("HAI", "County of Hainaut");
  hre("LOU", "County of Louvain");
  hre("HOL", "County of Holland");
  hre("UTRB", "Prince-Bishopric of Utrecht");
  hre("GEL", "County of Guelders", { wiki: "Duchy of Guelders" });
  poly("lorraine-lower-de", [[5.85, 51.85], [6.25, 51.85], [6.6, 51.65], [6.75, 51.25], [6.95, 50.95], [7.15, 50.7], [7.6, 50.35], [6.0, 50.35], [5.9, 50.75]]);
  add(h.LORRAINE, "+ 962 ULOR");
  add("DEU#lotharingia-de", "+ 962 ULOR");
  add("DEU#lorraine-lower-de", "+ 962 LLOR");
  add(["LUX/*"], "+ 963 LUXC");
  add(["BEL:Luxembourg/*"], "+ 962 LLOR; 1096 LIE");
  add(["BEL:Namur/*"], "+ 962 LLOR; 981 NAM");
  add(["BEL:Liège/*", "BEL:Limburg/*"], "+ 962 LLOR; 985 LIE");
  add(B("Hainaut"), "+ 962 LLOR; 998 HAI");
  add(B("Antwerp"), "+ 962 LLOR");
  add(B("Flemish Brabant", "Walloon Brabant", "Brussels Capital"), "+ 962 LLOR; 1003 LOU");
  add(N("South Holland", "North Holland", "Flevoland"), "+ 962 HOL");
  add(N("Utrecht", "Drenthe"), "+ 962 LLOR; 1024 UTRB");
  add(N("Overijssel"), "+ 962 LLOR; 1046 UTRB");
  add(N("Groningen"), "+ 1040 UTRB");
  add(N("Friesland", "North Brabant"), "+ 962 LLOR");
  add(["NLD:Limburg/*"], "+ 962 LLOR");
  add(N("Gelderland"), "+ 962 LLOR; 1096 GEL");

  // ——— Burgundy and Provence ———
  // The Kingdom of Burgundy, a client of the German kings, passed to Conrad II when Rudolph III died (1032) and became the
  // Empire's at his coronation at Payerne (2 February 1033); its great counties are drawn in it: Provence (free of Fraxinetum
  // from 973), the County of Burgundy (Otto-William, 982), and Savoy (Humbert, about 1032, with Aosta).
  later("UBU", [[CORONATION, { ruler: HRE }], ["1033-02-02", { ruler: "", status: 0, part: HRE }]]);
  own("PROV", "County of Provence", { ruler: "Kingdom of Burgundy", status: 5 }, [["1033-02-02", { ruler: "", status: 0, part: HRE }]]);
  own("FCB", "County of Burgundy", { wiki: "Free County of Burgundy", ruler: "Kingdom of Burgundy", status: 5 }, [["1033-02-02", { ruler: "", status: 0, part: HRE }]]);
  own("SAVC", "County of Savoy", { ruler: "Kingdom of Burgundy", status: 5 }, [["1033-02-02", { ruler: "", status: 0, part: HRE }]]);
  add(h.PROVENCE.concat(["MCO/*"]), "+ 962 PROV");
  add(h.VAR, "+ 973 PROV");
  add(h.COMTE, "+ 982 FCB");
  add(h.SAVOY, "+ 1032 SAVC");
  add(I("Aosta"), "+ 1032 SAVC");

  // ——— The Empire in Germany ———
  // Otto I crowned emperor (2 February 962): the stem duchies and the Kingdom of Italy become the Empire's members, and
  // Bohemia with them. Carinthia is parted from Bavaria (976) with the marches of Verona, Carniola, and Istria; the March of
  // Austria (976) reaches the Vienna basin by 1043, when the Leitha and the Morava were fixed with Hungary. Gero's Saxon
  // Eastern March is parted at his death (965) into the Northern March, Lusatia, and Meissen (with Merseburg and Zeitz); the
  // Great Slav Rising (983) frees the Hevelli, the Lutici, and the Obotrites, whose princes Gottschalk (1043), Kruto, and Henry
  // ruled them as a state. Poland held Lusatia and Milsko from 1002 to 1031, and Bohemia itself from March 1003 to September
  // 1004; Henry IV gave Milsko to Vratislaus II of Bohemia (1076). The bishoprics with a county are drawn from their grants:
  // Trent and Brixen (1027), and Aquileia, with Friuli and the Istrian march's land, from 1077.
  later("EFR", [[CORONATION, { name: HRE, wiki: HRE }]]);
  for (const k of ["SAXD", "FRAD", "SWA", "BAV", "LOTD"]) later(k, [[CORONATION, { part: HRE }]]);
  later("BOH", [[CORONATION, { ruler: "", status: 0, part: HRE }]]);
  later("ITK", [[CORONATION, { ruler: "", status: 0, part: HRE }]]);
  later("GERO", [[CORONATION, { part: HRE }]]);
  later("BILL", [[CORONATION, { part: HRE }]]);
  hre("CARD", "Duchy of Carinthia");
  hre("AUSM", "Margraviate of Austria");
  hre("NMARK", "Northern March");
  hre("LUSM", "March of Lusatia");
  hre("MEIS", "Margraviate of Meissen");
  hre("ISTM", "March of Istria");
  hre("TRENT", "Prince-Bishopric of Trent");
  hre("BRIX", "Prince-Bishopric of Brixen");
  hre("AQU", "Patriarchate of Aquileia", { wiki: "Patriarchate of Aquileia (state)" });
  people("HEVL", "Hevelli");
  own("OBOP", "Principality of the Obotrites", { wiki: "Obotrites" });
  const DE = (land, ...n) => n.map((x) => "DEU:" + land + "/" + x);
  add("DEU#hevelli", "+ 965 NMARK; 983 HEVL");
  add("DEU#obotrites", "+ 983 OBO; 1043 OBOP");
  add(DE("Saxony", "Meißen", "Dresden", "Sächsische Schweiz-Osterzgebirge", "Mittelsachsen", "Chemnitz", "Erzgebirgskreis", "Zwickau", "Leipzig", "Nordsachsen", "Vogtlandkreis")
    .concat(DE("Thuringia", "Altenburger Land", "Gera", "Greiz", "Saale-Orla-Kreis"), DE("Saxony-Anhalt", "Burgenlandkreis", "Saalekreis", "Halle (Saale)")), "+ 965 MEIS");
  add(DE("Saxony", "Bautzen", "Görlitz"), "+ 965 MEIS; 1002 POLD; 1031 MEIS; 1076 BOH");
  add(DE("Brandenburg", "Cottbus", "Spree-Neiße", "Oberspreewald-Lausitz", "Elbe-Elster", "Dahme-Spreewald", "Teltow-Fläming").concat(DE("Saxony-Anhalt", "Wittenberg", "Anhalt-Bitterfeld", "Dessau-Roßlau")),
    "+ 965 LUSM; 1002 POLD; 1031 LUSM");
  add(DE("Brandenburg", "Frankfurt (Oder)", "Märkisch-Oderland", "Oder-Spree"), "+ 963 POLD");
  add(["AUT:Lower Austria/Amstetten", "AUT:Lower Austria/Waidhofen an der Ybbs", "AUT:Lower Austria/Melk", "AUT:Lower Austria/Scheibbs", "AUT:Lower Austria/Sankt Pölten-Land",
    "AUT:Lower Austria/Sankt Pölten", "AUT:Lower Austria/Lilienfeld", "AUT:Lower Austria/Krems an der Donau", "AUT:Lower Austria/Krems-Land", "AUT:Lower Austria/Tulln",
    "AUT:Lower Austria/Horn", "AUT:Lower Austria/Zwettl", "AUT:Lower Austria/Gmünd", "AUT:Lower Austria/Waidhofen an der Thaya"], "+ 976 AUSM");
  add(["AUT:Vienna/Vienna", "AUT:Lower Austria/Baden", "AUT:Lower Austria/Mödling", "AUT:Lower Austria/Bruck an der Leitha", "AUT:Lower Austria/Gänserndorf",
    "AUT:Lower Austria/Korneuburg", "AUT:Lower Austria/Mistelbach", "AUT:Lower Austria/Hollabrunn"], "+ 1043 AUSM");
  add(["AUT:Lower Austria/Wiener Neustadt", "AUT:Lower Austria/Wiener Neustadt-Land", "AUT:Lower Austria/Neunkirchen"], "+ 1043 CARD");
  add("AUT#carantania", "+ 976 CARD");
  add("SVN/*", "+ 976 CARD");
  add("SVN#svn-friuli", "+ 976 CARD; 1077 AQU");
  add(HR("Istria"), "+ 976 CARD; 1040 ISTM");
  add(I("Trieste"), "+ 976 CARD; 1077 AQU");
  add(h.FRIULI, "+ 976 CARD; 1077 AQU");
  add(I("Verona", "Vicenza", "Treviso", "Belluno", "Padua"), "+ 976 CARD");
  add(I("Trentino"), "+ 1027 TRENT");
  add(I("Trentino-South Tyrol"), "+ 1027 BRIX");
  add(["CZE:South Moravian/*", "CZE:Zlín/*", "CZE:Olomouc/*", "CZE:Moravian-Silesian/*", "CZE:Vysočina/*"], "+ 999 POLD; 1029 BOH");
  add(["CZE:Prague/*", "CZE:Central Bohemian/*", "CZE:Ústí nad Labem/*", "CZE:Liberec/*", "CZE:Karlovy Vary/*", "CZE:Plzeň-/*", "CZE:South Bohemian/*", "CZE:Hradec Králové/*", "CZE:Pardubice/*"],
    "+ 1003 POLD; 1005 BOH");

  // ——— Italy ———
  // The Kingdom of Italy within the Empire, with its marches drawn as members: Tuscany (with the Canossa counties of Emilia
  // from Boniface III, 1027), Spoleto, Ivrea (to Arduin's defeat in 1014), Turin (the Arduinici, to Adelaide's death in 1091),
  // and Montferrat (the Aleramici, 967); Pisa (its consuls from about 1085) and Genoa (the Compagna, 1099) as communes. The
  // south: Pandulf Ironhead's Capua-Benevento (to 981), the Byzantine catepanate of Italy, the Norman county of Aversa (1030),
  // Apulia (1042, a duchy with Calabria from 1059), Capua under Richard of Aversa (1058), Gaeta (Capua's from 1063), Salerno
  // (Guiscard's from 1077), and Benevento (the pope's from 1077), and the Norman conquest of Sicily from Messina (1061) to Noto
  // (1091), with the Byzantine Messina of George Maniakes's campaign (1039 to 1041). Sardinia's four judicates are drawn from
  // about 1020; Corsica is Pisa's from Urban II's grant (1091).
  hre("TUSC", "March of Tuscany");
  hre("IVR", "March of Ivrea");
  hre("TURM", "March of Turin");
  hre("MONF", "March of Montferrat");
  hre("PISA", "Republic of Pisa");
  hre("GEN", "Republic of Genoa");
  later("SPO", [[CORONATION, { part: HRE }]]);
  own("AVE", "County of Aversa");
  own("APU", "County of Apulia", { wiki: "County of Apulia and Calabria" }, [["1059-08-23", { name: "Duchy of Apulia and Calabria", wiki: "Duchy of Apulia and Calabria" }]]);
  own("SICN", "County of Sicily", { ruler: "Duchy of Apulia and Calabria", status: 5 });
  own("CAGL", "Judicate of Cagliari");
  own("ARBO", "Judicate of Arborea");
  own("TORR", "Judicate of Logudoro", { wiki: "Judicate of Torres" });
  own("GALL", "Judicate of Gallura");
  add(h.TUSCANY.concat(I("Massa-Carrara")), "+ 962 TUSC");
  add(I("Pisa"), "+ 962 TUSC; 1085 PISA");
  add(F("Haute-Corse", "Corse-du-Sud"), "+ 1091 PISA");
  add(I("Reggio Emilia", "Modena", "Mantua", "Ferrara"), "+ 1027 TUSC");
  add(h.SPOLETO, "+ 962 SPO");
  add(I("Chieti", "Pescara"), "+ 962 SPO; 1076 APU");
  add(I("Turin", "Cuneo"), "+ 962 TURM; 1092 ITK");
  add(I("Asti", "Alessandria"), "+ 967 MONF");
  add(I("Vercelli", "Novara", "Biella", "Verbano-Cusio-Ossola"), "+ 962 IVR; 1015 ITK");
  add(I("Liguria"), "+ 1099 GEN");
  add(I("Caserta"), "+ 981 CAPU; 1030 AVE; 1058 CAPU");
  add(I("Latina"), "+ 1063 CAPU");
  add(I("Salerno"), "+ 1077 APU");
  add(I("Potenza"), "+ 1042 APU");
  add(I("Avellino", "Campobasso", "Isernia"), "+ 1077 APU");
  add(I("Benevento"), "+ 1077 PAP");
  add(I("Foggia", "Barletta-Andria-Trani"), "+ 1055 APU");
  add(I("Bari"), "+ 1071 APU");
  add(I("Taranto", "Brindisi", "Matera"), "+ 1063 APU");
  add(I("Lecce"), "+ 1068 APU");
  add(I("Cosenza"), "+ 1056 APU");
  add(I("Crotone", "Catanzaro", "Vibo Valentia"), "+ 1058 APU");
  add(I("Reggio Calabria"), "+ 1060 APU");
  add(I("Messina"), "+ 1039 BYZ; 1041 SIC; 1061 SICN");
  add(I("Catania"), "+ 1071 SICN");
  add(I("Palermo"), "+ 1072-01-10 SICN");
  add(I("Trapani"), "+ 1077 SICN");
  add(I("Syracuse", "Caltanissetta"), "+ 1086 SICN");
  add(I("Agrigento", "Enna"), "+ 1087 SICN");
  add(I("Ragusa"), "+ 1091 SICN");
  add("MLT/*", "+ 1091 SICN");
  add(I("Cagliari", "Carbonia-Iglesias", "Ogliastra"), "+ 1020 CAGL");
  add(I("Oristano", "Medio Campidano"), "+ 1020 ARBO");
  add(I("Sassari"), "+ 1020 TORR");
  add(I("Olbia-Tempio", "Nuoro"), "+ 1020 GALL");

  // ——— Iberia ———
  // The Caliphate of Córdoba through al-Mansur's campaigns (Coimbra taken in 987) to its fall in the fitna (1009 to 1031); the
  // taifas, by the years their rulers made themselves independent and the years the larger took the smaller (Huelva by
  // Seville in 1053, Málaga by Granada in 1057, Córdoba by Seville in 1070, Denia by Zaragoza in 1076, Valencia under Toledo
  // from 1065 to 1076); the Almoravids from Sagrajas (1086), taking Granada and Málaga (1090), Seville, Córdoba, Almería, and
  // Murcia (1091), Denia (1092), and Badajoz (1094); El Cid's Valencia (June 1094). The Christian kingdoms: Castile, a client
  // of León until Fernán González and of Navarre under Sancho III (1029), a kingdom from 1035; Aragon a kingdom from 1035;
  // Navarre's Álava, Biscay, Gipuzkoa, and La Rioja to Castile at its partition (1076); Galicia a kingdom under García (1065 to
  // 1071); Portugal a county of León to 1071 and Henry of Burgundy's from 1096; Viseu (1058), Coimbra (1064), Toledo (25 May
  // 1085), Lisbon (ceded in 1093, lost in 1095), and Huesca (1096). La Mancha, between Castile and the Almoravids after
  // Sagrajas, and the Duero's last unsettled land are drawn as disputed.
  const ZAR = "Taifa of Zaragoza", TOLN = "Taifa of Toledo", ALMN = "Almoravid dynasty", CASK = "Kingdom of Castile";
  later("CAS", [["962-01-01", { ruler: "", status: 0 }], ["1029-01-01", { ruler: "Kingdom of Pamplona", status: 5 }], ["1035-01-01", { name: CASK, wiki: CASK, ruler: "", status: 0 }]]);
  later("ARA", [["1035-01-01", { name: "Kingdom of Aragon", wiki: "Kingdom of Aragon", ruler: "", status: 0 }]]);
  later("HUEd", [["1018-01-01", { claims: ["County of Aragon", ZAR] }], ["1035-01-01", { claims: ["Kingdom of Aragon", ZAR] }]]);
  later("LLEd", [["962-01-01", { claims: ["County of Urgell", "Caliphate of Córdoba"] }], ["1039-01-01", { claims: ["County of Urgell", "Taifa of Lleida"] }]]);
  later("DUE", [["962-01-01", { claims: ["County of Castile", "Caliphate of Córdoba"] }], ["1018-01-01", { claims: ["County of Castile", TOLN] }], ["1035-01-01", { claims: [CASK, TOLN] }]]);
  own("GALK", "Kingdom of Galicia");
  own("PORC", "County of Portugal", { ruler: "Kingdom of León", status: 5 });
  own("TZAR", ZAR);
  own("TTOL", TOLN);
  own("TBAD", "Taifa of Badajoz");
  own("TSEV", "Taifa of Seville");
  own("TGRA", "Taifa of Granada");
  own("TALM", "Taifa of Almería");
  own("TDEN", "Taifa of Dénia");
  own("TVAL", "Taifa of Valencia");
  own("TMUR", "Taifa of Murcia");
  own("TMAL", "Hammudid dynasty", { wiki: "Hammudid dynasty" });
  own("TCOR", "Taifa of Córdoba");
  own("TALB", "Taifa of Albarracín");
  own("TLLE", "Taifa of Lleida", { wiki: "Taifa of Lérida" });
  own("TTOR", "Taifa of Tortosa");
  own("TMAJ", "Taifa of Majorca");
  own("THUE", "Taifa of Saltés and Huelva");
  own("TSIL", "Taifa of Silves");
  own("TMER", "Taifa of Mértola");
  own("VALC", "Valencia under El Cid", { wiki: "Siege of Valencia (1092–1094)" });
  own("ALM", ALMN, { host: true });
  own("CRd", "La Mancha", { wiki: "Battle of Sagrajas", claims: [CASK, ALMN] });
  add(E("A Coruña", "Lugo", "Ourense", "Pontevedra"), "+ 1065 GALK; 1071 CAS; 1073 AST");
  add(P("Viana do Castelo", "Braga", "Porto", "Vila Real", "Bragança"), "+ 962 PORC; 1065 GALK; 1071 CAS; 1073 AST; 1096 PORC");
  add(P("Viseu"), "+ 987 EMC; 1013 TBAD; 1058 AST; 1096 PORC");
  add(P("Coimbra", "Aveiro"), "+ 987 EMC; 1013 TBAD; 1064 AST; 1096 PORC");
  add(P("Guarda"), "+ 987 EMC; 1013 TBAD; 1064 AST");
  add(P("Castelo Branco", "Leiria", "Santarém", "Setúbal", "Portalegre", "Évora"), "+ 1013 TBAD; 1094 ALM");
  add(P("Santarém"), "+ 1013 TBAD; 1093 AST");
  add(P("Lisbon"), "+ 1013 TBAD; 1093 AST; 1095 ALM");
  add(P("Beja"), "+ 1033 TMER; 1044 TSEV; 1091 ALM");
  add(P("Faro"), "+ 1027 TSIL; 1063 TSEV; 1091 ALM");
  add(E("Cantabria"), "+ 962 CAS");
  add(E("Ávila"), "+ 1088 CAS");
  add(E("Soria"), "+ 1018 TTOL; 1060 CAS");
  add(E("Araba / Álava", "Biscay"), "+ 1035 PAM; 1076 CAS");
  add(E("Gipuzkoa", "La Rioja"), "+ 1076 CAS");
  add(E("Toledo", "Community of Madrid", "Guadalajara"), "+ 1018 TTOL; 1085 CAS");
  add(E("Cuenca"), "+ 1018 TTOL; 1085 CAS");
  add(E("Ciudad Real"), "+ 1018 TTOL; 1085 CAS; 1090 CRd");
  add(E("Albacete"), "+ 1018 TTOL; 1065 TMUR; 1091 ALM");
  add(E("Zaragoza"), "+ 1018 TZAR");
  add(E("Teruel"), "+ 1012 TALB");
  add(E("Huesca"), "+ 1096 ARA");
  add(E("Tarragona"), "+ 1039 TTOR; 1060 TZAR");
  add(E("Valencia"), "+ 1010 TVAL; 1065 TTOL; 1076 TVAL; 1094 VALC");
  add(E("Castellón"), "+ 1010 TVAL; 1065 TTOL; 1076 TVAL; 1098 VALC");
  add(E("Alicante"), "+ 1010 TDEN; 1076 TZAR; 1092 ALM");
  add(E("Murcia"), "+ 1011 TMUR; 1078 TSEV; 1088 TMUR; 1091 ALM");
  add(E("Almería"), "+ 1012 TALM; 1091 ALM");
  add(E("Granada", "Jaén"), "+ 1013 TGRA; 1090 ALM");
  add(E("Jaén"), "+ 1013 TGRA; 1091 ALM");
  add(E("Málaga"), "+ 1016 TMAL; 1057 TGRA; 1090 ALM");
  add(E("Cádiz").concat(["GIB/*"]), "+ 1013 TMAL; 1055 TSEV; 1091 ALM");
  add(E("Seville"), "+ 1023 TSEV; 1091 ALM");
  add(E("Huelva"), "+ 1012 THUE; 1053 TSEV; 1091 ALM");
  add(E("Córdoba"), "+ 1031 TCOR; 1070 TSEV; 1091 ALM");
  add(E("Badajoz", "Cáceres"), "+ 1013 TBAD; 1094 ALM");
  add(E("Balearic Islands"), "+ 1015 TDEN; 1076 TMAJ");
  add(["ESP/Ceuta"], "+ 1016 TMAL; 1084 ALM");
  add(["ESP/Melilla"], "+ 1016 TMAL; 1080 ALM");

  // ——— North Africa west of Egypt ———
  // The Fatimids leave for Egypt (973) with the Zirids as their governors in Ifriqiya, free of them from 1048; the Hammadids
  // part from the Zirids (1015); the Banu Hilal and Banu Sulaym, sent west by the Fatimids, take the open country after
  // Haydaran (1052) and the sack of Kairouan (1057), leaving the Zirids Mahdia and the coast; the Khurasanids hold Tunis (1059)
  // and the Banu Khazrun Tripoli (1001). In the west, Córdoba's clients take Fez (974); the Maghrawa (987) and the Banu Ifran
  // hold the Zenata lands until the Almoravids take Sijilmasa (1055), Aghmat (1058), Fez (1069), the Barghawata's coast,
  // Tlemcen (1080), Ceuta (1084), and Algiers (1082).
  own("ZIR", "Zirid dynasty", { ruler: FATN, status: 5 }, [["1048-01-01", { ruler: "", status: 0 }]]);
  own("HAMM", "Hammadid dynasty");
  own("KHUR", "Khurasanid dynasty");
  own("KHAZR", "Banu Khazrun");
  own("MAGH", "Maghrawa", { wiki: "Maghrawa" });
  people("HIL", "Banu Hilal");
  people("SUL", "Banu Sulaym");
  add(T("Tunis", "Ben Arous", "Manouba"), "+ 973 ZIR; 1059 KHUR");
  add(T("Bizerte", "Nabeul", "Zaghouan", "Beja", "Sousse", "Monastir", "Mahdia", "Sfax"), "+ 973 ZIR");
  add(T("Jendouba", "Kef", "Siliana", "Kairouan", "Kasserine", "Sidi Bouzid", "Gafsa", "Tozeur", "Kebili", "Gabès"), "+ 973 ZIR; 1057 HIL");
  add(Z("El Tarf", "Annaba", "Skikda", "Guelma", "Souk Ahras", "Constantine", "Mila", "Jijel", "Sétif", "Batna", "Khenchela", "Oum El Bouaghi", "Biskra", "M'Sila", "Bordj Bou Arréridj",
    "Béjaïa", "Tizi Ouzou", "Bouïra", "Boumerdès", "Chlef", "Aïn Defla", "Tissemsilt", "Tiaret"), "+ 973 ZIR; 1015 HAMM");
  add(Z("Tébessa"), "+ 973 ZIR; 1057 HIL");
  add(Z("Algiers", "Blida", "Tipasa", "Médéa"), "+ 973 ZIR; 1015 HAMM; 1082 ALM");
  add(Z("Relizane", "Mascara", "Mostaganem", "Saïda"), "+ 973 ZEN; 1080 ALM");
  add(Z("Tlemcen", "Aïn Témouchent", "Oran", "Sidi Bel Abbès", "Naama").concat(M("Oriental")), "+ 962 IFR; 1080 ALM");
  add(M("Tangier-Tetouan"), "+ 1016 TMAL; 1077 ALM");
  add(M("Gharb-Chrarda-Béni Hssen"), "+ 987 MAGH; 1069 ALM");
  add(M("Fès-méknas-boulmane"), "+ 974 EMC; 987 MAGH; 1069 ALM");
  add(M("Taza-Al Hoceïma-Taounate"), "+ 1080 ALM");
  add(M("Rabat-Salé-Zemmour-Zaër", "Grand Casablanca", "Chaouia-Ouardigha", "Doukkala Abda"), "+ 1065 ALM");
  add(M("Meknès-Tafilalet"), "+ 976 MAGH; 1055 ALM");
  add(M("Marrakesh-Tensift-El Haouz", "Tadla-Azilal", "Suss-Massa-Draa"), "+ 1058 ALM");
  add(L("Tripoli District", "Jafara", "Zawiya", "Nuqat al Khams", "Murqub", "Misrata"), "+ 973 ZIR; 1001 KHAZR");
  add(L("Benghazi", "Marj", "Jabal al Akhdar", "Al Qubbah", "Butnan"), "+ 1051 SUL");

  // ——— Poland, Hungary, and the Balkans ———
  // Poland under Mieszko I (baptised 966) and Bolesław I: Lubusz (963), Pomerania (967 to 1005, Gdańsk to the crisis of the
  // 1030s), Silesia and Kraków (990), Moravia (999 to 1029), the Cherven towns (1018 to 1031); a kingdom from Bolesław's
  // coronation (1025); Miecław's Masovia (1037 to 1047); Bretislaus's Silesia (1038 to 1050). Hungary a kingdom from Stephen's
  // coronation (Christmas 1000), taking Slavonia (1091) and fighting for Croatia from 1097. The First Bulgarian Empire: the east
  // lost to John Tzimiskes (971), Samuel's empire from the west (976), the east retaken (986) and lost again (1000), Vidin (1003),
  // and the end at Ohrid (1018); Durrës Samuel's from 997 to 1005. Duklja free of Byzantium at Bar (1042), with Zachlumia and
  // Travunia from about 1050 and Serbia (Raška) as its client from about 1060 until Vukan's grand principality (1091). The
  // Pechenegs hold the steppe north of the Danube until the Cumans take it after Levounion (1091).
  later("POLD", [["966-04-14", { name: "Duchy of Poland", wiki: "Duchy of Poland (966–1025)" }], ["1025-04-18", { name: "Kingdom of Poland", wiki: "Kingdom of Poland (1025–1385)" }]]);
  later("HUNG", [["1000-12-25", { name: "Kingdom of Hungary", wiki: "Kingdom of Hungary (1000–1301)" }]]);
  later("SRB", [["1018-01-01", { ruler: BYZN, status: 5 }], ["1042-01-01", { ruler: "", status: 0 }], ["1060-01-01", { ruler: "Duklja", status: 5 }],
    ["1091-01-01", { name: "Grand Principality of Serbia", wiki: "Grand Principality of Serbia", ruler: "", status: 0 }]]);
  later("DOC", [["1042-01-01", { ruler: "", status: 0 }]]);
  own("MAZS", "Masovia", { wiki: "Miecław" });
  own("BOS", "Bosnia", { wiki: "History of Bosnia and Herzegovina (958–1463)" });
  own("CROd", "Croatia", { wiki: "Croatian War of Succession", claims: ["Kingdom of Croatia", "Kingdom of Hungary"] });
  people("CUM", "Cumans");
  people("OGHZ", "Oghuz Turks");
  add(PL("Lubusz"), "+ 963 POLD");
  add(PL("West Pomeranian"), "+ 967 POLD; 1005 POM");
  add(PL("Pomeranian"), "+ 990 POLD; 1034 POM");
  add(PL("Silesian", "Opole", "Lower Silesian"), "+ 990 POLD; 1038 BOH; 1050 POLD");
  add(PL("Lesser Poland", "Świętokrzyskie"), "+ 990 POLD");
  add(PL("Lublin"), "+ 990 POLD");
  add(PL("Podkarpackie"), "+ 981 RUSK; 1018 POLD; 1031 RUSK");
  add(PL("Masovian"), "+ 1037 MAZS; 1047 POLD");
  add(["SVK:Trenčín/*", "SVK:Žilina/*", "SVK:Prešov/*", "SVK:Košice/*"], "+ 1000 HUNG");
  add(HR("Zagreb", "Krapina-Zagorje", "Varaždin", "Međimurje", "Koprivnica-Križevci", "Bjelovar-Bilogora", "Virovitica-Podravina", "Požega-Slavonia", "Sisak-Moslavina", "Brod-Posavina"), "+ 1091 HUNG");
  add(HR("Karlovac", "Primorje-Gorski", "Lika-Senj", "Zadar", "Šibenik-Knin", "Split-Dalmatia"), "+ 1097 CROd");
  add(["BIH:Una-Sana Canton/*", "BIH:Banja Luka/*", "BIH:Livno/*", "BIH:West Herzegovina Canton/*", "BIH:Central Bosnia Canton/*"], "+ 1097 CROd");
  add(["BIH:Doboj/*", "BIH:Zenica-Doboj Canton/*", "BIH:Tuzla Canton/*", "BIH:Sarajevo-Romanija/*", "BIH:Sarajevo Canton/*", "BIH:Vlasenica/*", "BIH:Bijeljina/*", "BIH:Brčko/*", "BIH:Posavina Canton/*"],
    "+ 962 BOS");
  add(["BIH:Herzegovina-Neretva Canton/*", "BIH:Trebinje/*"].concat(G("MNE", "Herceg Novi")), "+ 1050 DOC");
  add(HR("Vukovar-Syrmia").concat(SR("Srem")), "+ 976 FBE; 1018 BYZ; 1071 HUNG");
  add(SR("Belgrade", "Podunavlje", "Braničevo", "Pomoravski", "Bor", "Zaječar", "Nišava", "Pirot", "Jablanica", "Pčinja"), "+ 1018 BYZ");
  add("KOS/*", "+ 1018 BYZ");
  add("MKD/*", "+ 1018 BYZ");
  add(G("ALB", "Kukës", "Dibër", "Elbasan", "Korçë", "Berat", "Gjirokastër"), "+ 1018 BYZ");
  add(G("ALB", "Durrës", "Tirana"), "+ 997 FBE; 1005 BYZ");
  add(BG("Varna", "Dobrich", "Shumen", "Targovishte", "Razgrad", "Ruse", "Silistra", "Veliko Tarnovo", "Gabrovo", "Lovech", "Pleven"), "+ 971 BYZ; 986 FBE; 1000 BYZ");
  add(BG("Vidin", "Montana", "Vratsa"), "+ 1003 BYZ");
  add(BG("Burgas", "Yambol", "Sliven", "Stara Zagora", "Plovdiv", "Pazardzhik"), "+ 971 BYZ");
  add(BG("Sofia", "Pernik", "Kyustendil", "Blagoevgrad"), "+ 1018 BYZ");
  add(GR("Thessalia"), "+ 986 FBE; 1001 BYZ");
  add(GR("West Macedonia"), "+ 1018 BYZ");
  add(RO("Constanța", "Tulcea"), "+ 971 BYZ");
  add(RO("Mehedinți", "Dolj", "Gorj", "Vâlcea", "Olt", "Argeș", "Teleorman", "Giurgiu", "Dâmbovița", "Prahova", "Ilfov", "Bucharest", "Ialomița", "Călărași", "Buzău", "Brăila"), "+ 971 PEC; 1091 CUM");
  add(RO("Suceava", "Botoșani", "Iași", "Neamț", "Bacău", "Vaslui", "Vrancea", "Galați").concat(["MDA/*"]), "+ 1091 CUM");
  add(["CYP/*", "CYN/*"], "+ 965 BYZ");

  // ——— Rus' and the steppe ———
  // Kievan Rus' takes the Vyatichi (after Sviatoslav's and Vladimir's campaigns, by 982), the Cherven towns (981), the White
  // Croats (993), and Berestye; Polotsk keeps its own line of princes from 1001; Mstislav holds Chernigov apart from 1024 to his
  // death in 1036. From Yaroslav's death (1054) the land is his sons' principalities, members of Kievan Rus': Kiev, Chernigov
  // (with Murom and Ryazan), Pereyaslavl, Smolensk, Volhynia, Polotsk, Novgorod, Rostov–Suzdal, and, for the Rostislavichi
  // from 1085, Peremyshl and Terebovl. Khazaria falls to Sviatoslav (965 to 969); its steppe passes to the Pechenegs and the
  // Oghuz, then the Cumans (about 1060 in the east, 1080 in the west); Byzantium takes the Khazar remnant in the Crimea (1016).
  own("POLO", "Principality of Polotsk", {}, [[YAROSLAV, { part: KRUS }]]);
  own("CHER", "Principality of Chernigov", {}, [[YAROSLAV, { part: KRUS }]]);
  rus("KIEV", "Principality of Kiev");
  rus("PERE", "Principality of Pereyaslavl");
  rus("SMOL", "Principality of Smolensk");
  rus("VOLY", "Principality of Volhynia");
  rus("NOVG", "Novgorod Land");
  rus("ROST", "Rostov-Suzdal");
  rus("PERM", "Principality of Peremyshl");
  rus("TERE", "Principality of Terebovlia");
  own("SARIR", "Sarir");
  add(RU("Kaluga", "Tula", "Oryol", "Moscow"), "+ 982 RUSK");
  add(UA("Lviv", "Ternopil", "Ivano-Frankivsk", "Chernivtsi"), "+ 993 RUSK");
  add(UA("Vinnytsia", "Khmelnytskyi"), "+ 962 RUSK");
  add(BY("Brest"), "+ 983 RUSK");
  add(UA("Kyiv", "Zhytomyr", "Cherkasy", "Vinnytsia", "Khmelnytskyi"), "+ 1054 KIEV");
  add(UA("Chernihiv", "Sumy").concat(RU("Kursk", "Bryansk", "Oryol", "Kaluga", "Tula")), "+ 1024 CHER; 1036 RUSK; 1054 CHER");
  add(RU("Ryazan"), "+ 1054 CHER");
  add(BY("Gomel"), "+ 1054 CHER");
  add(UA("Poltava"), "+ 1024 CHER; 1036 RUSK; 1054 PERE");
  add(RU("Smolensk"), "+ 1054 SMOL");
  add(BY("Mahilioŭ"), "+ 1054 SMOL");
  add(UA("Volyn", "Rivne").concat(BY("Brest")), "+ 1054 VOLY");
  add(UA("Lviv", "Ivano-Frankivsk", "Chernivtsi").concat(PL("Podkarpackie")), "+ 1054 VOLY; 1085 PERM");
  add(UA("Ternopil"), "+ 1054 VOLY; 1085 TERE");
  add(BY("Vitebsk"), "+ 1001 POLO");
  add(BY("Minsk"), "+ 1001 POLO");
  add(RU("Novgorod", "Pskov", "Leningrad", "Saint Petersburg", "Tver"), "+ 1054 NOVG");
  add(RU("Yaroslavl", "Ivanovo", "Vladimir", "Moscow", "Vologda"), "+ 1054 ROST");
  add(UA("Odessa", "Mykolaiv", "Kherson", "Kirovohrad"), "+ 1080 CUM");
  add(UA("Donetsk", "Luhansk", "Kharkiv", "Dnipropetrovsk", "Zaporizhzhia"), "+ 1060 CUM");
  add(RU("Autonomous Republic of Crimea"), "+ 1016 BYZ; 1070 CUM");
  add(RU("Rostov", "Voronezh", "Belgorod"), "+ 969 PEC; 1060 CUM");
  add(RU("Volgograd", "Republic of Kalmykia", "Astrakhan"), "+ 969 OGHZ; 1050 CUM");
  add(RU("Saratov"), "+ 969 BURT; 1050 CUM");
  add(RU("Stavropol Krai", "Chechen Republic"), "+ 969 ALAN");
  add(RU("Republic of Dagestan"), "+ 969 SARIR");
  add(RU("Krasnodar Krai"), "+ 969 ZICH");

  // ——— Anatolia ———
  // The Byzantine advance: Cilicia (Tarsus and Mopsuestia, 965), Antioch (28 October 969), Edessa (1031), Vaspurakan ceded
  // (1021), Ani annexed (1045), Kars ceded (1065). After Manzikert (26 August 1071) the Turks hold the plateau: the Sultanate
  // of Rum (Suleiman, at Nicaea from about 1081, then Konya), the Danishmendids in the north-east, the Mengujekids and the
  // Saltukids on the upper Euphrates and at Erzurum; Philaretos Brachamios's Armenian dominion from Cilicia to Edessa (1078 to
  // 1086), then the Seljuks at Antioch (1085) and Edessa (1087). The First Crusade and Alexios I's reconquest: Nicaea (19 June
  // 1097), the west coast (John Doukas, 1097 and 1098), Edessa (10 March 1098) and Antioch (3 June 1098) as Crusader states,
  // and Cilicia between them.
  own("RUM", "Sultanate of Rum");
  own("DNM", "Danishmendids");
  own("MENG", "Mengujekids");
  own("SALT", "Saltukids");
  own("PHIL", "Philaretos's dominion", { wiki: "Philaretos Brachamios" }, [["1086-01-01", { name: "Lordship of Melitene", wiki: "Gabriel of Melitene" }]]);
  own("SEL", SELN, { host: true });
  own("ANTI", "Principality of Antioch");
  own("EDE", "County of Edessa");
  own("CILd2", "Cilicia", { wiki: "Armenian Principality of Cilicia", claims: ["Principality of Antioch", BYZN] });
  add(TR("Bursa", "Kocaeli", "Sakarya", "Yalova", "Bilecik"), "+ 1081 RUM; 1097 BYZ");
  add(TR("Balıkesir", "Çanakkale", "İzmir", "Aydın", "Manisa", "Muğla", "Denizli", "Uşak"), "+ 1081 RUM; 1098 BYZ");
  add(TR("Kütahya", "Eskişehir", "Afyonkarahisar", "Isparta", "Burdur", "Konya", "Karaman", "Aksaray"), "+ 1081 RUM");
  add(TR("Kayseri", "Niğde", "Nevşehir", "Kırşehir", "Kırıkkale", "Ankara", "Çankırı", "Yozgat", "Çorum", "Amasya", "Tokat", "Sivas", "Kastamonu", "Karabük", "Samsun"), "+ 1074 DNM");
  add(TR("Erzincan", "Tunceli"), "+ 1072 MENG");
  add(TR("Hatay"), "+ 969 BYZ; 1078 PHIL; 1085 SEL; 1098 ANTI");
  add(TR("Gaziantep", "Kilis"), "+ 962 BYZ; 1078 PHIL; 1086 SEL; 1098 EDE");
  add(TR("Şanlıurfa"), "+ 990 HAM; 1031 BYZ; 1078 PHIL; 1087 SEL; 1098 EDE");
  add(TR("Adıyaman"), "+ 1078 PHIL; 1086 SEL; 1098 EDE");
  add(TR("Kahramanmaraş"), "+ 962 BYZ; 1078 PHIL; 1086 BYZ");
  add(TR("Osmaniye", "Adana", "Mersin"), "+ 965 BYZ; 1078 PHIL; 1084 SEL; 1097 CILd2");
  add(TR("Malatya"), "+ 1078 PHIL");
  add(TR("Elazığ"), "+ 1078 PHIL; 1085 SEL");

  // ——— The eastern frame: Anatolia's east, the Levant, and the Caucasus (from 962) ———
  // Armenia's Bagratid kingdom at Ani (to 1045) with its branches at Kars (963 to 1065) and Lori (979), Vaspurakan (to 1021),
  // Taron (Byzantine from 967), and Syunik; the Marwanids of Diyarbakır (983 to 1085); the Seljuks after the fall of Ani
  // (1064), with the Shaddadids of Ani (1072) and Ganja (to 1075) and the Shah-Armens of Ahlat (1100) under them. Georgia
  // united by Bagrat III (1008) from Abkhazia, Kartli, and Tao-Klarjeti, but for Kakheti-Hereti and the Emirate of Tbilisi, and
  // tributary to Malik-Shah from 1083 until David IV stopped the tribute; Shirvan and the Armenian Khachen to the east. Syria:
  // Hamdanid Aleppo, Byzantium's client from 970, then the Fatimids (1004), the Mirdasids (1024), the Uqaylids (1080), the
  // Seljuks (1086), and Ridwan (1095); the Jazira's Uqaylids and Numayrids; Damascus and Palestine Fatimid from 970, taken by
  // Atsiz for the Seljuks (Jerusalem 1073, Damascus 1076), Duqaq's Damascus from 1095, Jerusalem the Fatimids' again from
  // August 1098 until the Crusaders took it (15 July 1099); Tripoli the Banu Ammar's (1070).
  own("IKH", "Ikhshidid dynasty", { host: true });
  own("BUY", "Buyid dynasty", { host: true });
  own("MARW", "Marwanids", { wiki: "Marwanids" });
  own("UQA", "Uqaylid dynasty", { host: true });
  own("NUM", "Numayrids", { wiki: "Numayrids" });
  own("MIRD", "Mirdasid dynasty");
  own("RID", "Emirate of Aleppo", { wiki: "Ridwan" });
  own("DUQ", "Emirate of Damascus", { wiki: "Duqaq" });
  own("AMM", "Banu Ammar");
  own("KOJ", "Kingdom of Jerusalem");
  own("SHAR", "Shah-Armens");
  own("BAGA", "Bagratid Armenia");
  own("KARS", "Kingdom of Kars", { wiki: "Kingdom of Vanand" });
  own("LORI", "Kingdom of Tashir-Dzoraget", { wiki: "Kingdom of Tashir-Dzoraget" });
  own("VASP", "Kingdom of Vaspurakan");
  own("TARO", "Principality of Taron", { wiki: "Taron (historic Armenia)" });
  own("SYUN", "Syunik", { wiki: "Kingdom of Syunik" });
  own("ABKH", "Kingdom of Abkhazia");
  own("TAO", "Kingdom of the Iberians", { wiki: "Tao-Klarjeti" });
  own("KAKH", "Kakheti-Hereti", { wiki: "Kingdom of Kakheti-Hereti" });
  own("TBIL", "Emirate of Tbilisi");
  own("GEOK", "Kingdom of Georgia", {}, [["1083-01-01", { ruler: SELN, status: 5 }], ["1097-01-01", { ruler: "", status: 0 }]]);
  own("SHIR", "Shirvan", { wiki: "Shirvanshah" }, [["1066-01-01", { ruler: SELN, status: 5 }]]);
  own("SHAD", "Shaddadids", { wiki: "Shaddadids" });
  own("KHAC", "Principality of Khachen");
  own("RAW", "Rawadid dynasty", { wiki: "Rawadid dynasty" });
  later("HAM", [["970-01-01", { ruler: BYZN, status: 5 }]]);
  const SY = (...n) => G("SYR", ...n), LB = (...n) => G("LBN", ...n), IL = (...n) => G("ISR", ...n), JO = (...n) => G("JOR", ...n), GE = (...n) => G("GEO", ...n), AM = (...n) => G("ARM", ...n), AZ = (...n) => G("AZE", ...n);
  add(TR("Rize"), "962 BYZ");
  add(TR("Bayburt", "Erzurum"), "962 BYZ; 1072 SALT");
  add(TR("Artvin", "Ardahan"), "962 TAO; 1008 GEOK");
  add(TR("Kars"), "962 BAGA; 963 KARS; 1065 BYZ; 1072 SEL");
  add(TR("Iğdır", "Ağrı"), "962 BAGA; 1045 BYZ; 1064 SEL");
  add(TR("Van", "Hakkâri"), "962 VASP; 1021 BYZ; 1071 SEL");
  add(TR("Muş"), "962 TARO; 967 BYZ; 1071 SEL");
  add(TR("Bitlis"), "962 HAM; 978 BUY; 983 MARW; 1085 SEL; 1100 SHAR");
  add(TR("Diyarbakır", "Batman", "Siirt", "Mardin", "Şırnak", "Bingöl"), "962 HAM; 978 BUY; 983 MARW; 1085 SEL");
  add(SY("Aleppo", "Idlib", "Hama"), "962 HAM; 1004 FAT; 1024 MIRD; 1080 UQA; 1086 SEL; 1095 RID");
  add(SY("Latakia"), "962 HAM; 969 BYZ; 1085 SEL; 1098 BYZ");
  add(SY("Tartus"), "962 HAM; 975 BYZ; 1085 SEL");
  add(SY("Homs"), "962 HAM; 1004 FAT; 1086 SEL; 1095 DUQ");
  add(SY("Al-Raqqah"), "962 HAM; 990 NUM; 1086 SEL");
  add(SY("Deir ez-Zor", "Al-Hasakah"), "962 HAM; 990 UQA; 1086 SEL");
  add(SY("Damascus", "Rif Dimashq", "Quneitra", "Daraa", "As-Suwayda", "Western al-Samadania").concat(LB("Beqaa"), JO("Irbid", "Ajloun", "Jerash", "Balqa", "Amman", "Zarqa", "Mafraq")),
    "962 IKH; 970 FAT; 1076 SEL; 1095 DUQ");
  add(JO("Madaba", "Karak", "Tafilah", "Ma'an", "Aqaba"), "962 IKH; 970 FAT");
  add(LB("North"), "962 IKH; 970 FAT; 1070 AMM");
  add(LB("Mount Lebanon", "Beirut", "South", "Nabatieh"), "962 IKH; 970 FAT");
  add(IL("Jerusalem", "Central", "Tel Aviv").concat(["PSX/West Bank"]), "962 IKH; 970 FAT; 1073 SEL; 1098 FAT; 1099-07-15 KOJ");
  add(IL("Northern"), "962 IKH; 970 FAT; 1073 SEL; 1100 KOJ");
  add(IL("Haifa", "Southern").concat(["PSX/Gaza"]), "962 IKH; 970 FAT");
  add(GE("Abkhazia", "Samegrelo-Zemo Svaneti", "Racha-Lechkhumi and Kvemo Svaneti", "Imereti", "Guria"), "962 ABKH; 1008 GEOK");
  add(GE("Adjara", "Samtskhe–Javakheti"), "962 TAO; 1008 GEOK");
  add(GE("Shida Kartli", "Mtskheta-Mtianeti"), "962 KAKH; 975 ABKH; 1008 GEOK");
  add(GE("Kvemo Kartli", "Tbilisi"), "962 TBIL");
  add(GE("Kakheti").concat(AZ("Shaki", "Sheki", "Qakh", "Zaqatala", "Balakan", "Oghuz", "Qabala")), "962 KAKH");
  add(AM("Tavush", "Lori"), "962 BAGA; 979 LORI");
  add(AM("Shirak"), "962 BAGA; 1045 BYZ; 1064 SEL; 1072 SHAD");
  add(AM("Aragatsotn", "Armavir", "Ararat", "Yerevan", "Kotayk", "Gegharkunik"), "962 BAGA; 1045 BYZ; 1064 SEL");
  add(AM("Vayots Dzor", "Syunik").concat(AZ("Zangilan", "Qubadli", "Jabrayil")), "962 SYUN");
  add(AZ("Kalbajar", "Khojali", "Shusha", "Susa", "Stepanakert", "Khojavend", "Tartar"), "962 KHAC");
  add(AZ("Sharur", "Sadarak", "Kangarli", "Babek", "Shahbuz", "Julfa", "Ordubad", "Nakhchivan"), "962 RAW; 1064 SEL");
  add(AZ("Ganja", "Goygol", "Shamkir", "Samukh", "Goranboy", "Naftalan", "Barda", "Agdam", "Aghjabadi", "Beylagan", "Fuzuli", "Yevlakh", "Mingachevir", "Tovuz", "Qazax", "Agstafa",
    "Gadabay", "Dashkasan"), "962 SHAD; 1075 SEL");
  add(AZ("Shamakhi", "Ismayilli", "Agsu", "Gobustan", "Kurdamir", "Hajigabul", "Absheron", "Baku", "Sumqayit", "Khizi", "Siyazan", "Shabran", "Quba", "Qusar", "Khachmaz", "Goychay",
    "Ujar", "Agdash", "Zardab", "Salyan", "Neftchala", "Şirvan", "Sabirabad", "Saatly", "Imishli", "Bilasuvar", "Masally", "Lankaran", "Astara", "Lerik", "Yardimli", "Jalilabad"), "962 SHIR");

  // ——————————————— 1101 to 1250 ———————————————
  const ANGV = "Angevin Empire", CROA = "Crown of Aragon", CROCN = "Crown of Castile", ALMON = "Almohad Caliphate";

  // ——— Britain and Ireland, 1101 to 1250 ———
  // Henry II's Angevin Empire (1154 to the loss of Normandy in 1204): England, Normandy, Anjou with Maine and Touraine,
  // Aquitaine (Eleanor's, from 1152), Brittany (Geoffrey's, from 1166), and Ireland, drawn as one realm with its lands as
  // members, though the continental ones were fiefs of the French crown; after 1204 Gascony and Ireland are the English
  // king's. The Scots held Cumbria and Northumberland from 1136 and 1139 to 1157; Galloway was a Scottish lordship from
  // Fergus (about 1120) until its partition (1235). Wales: Gruffydd ap Cynan's and Owain Gwynedd's Gwynedd, which took
  // Ceredigion (1136, to the Lord Rhys in 1153) and the Perfeddwlad (1167), Powys parted at Madog ap Maredudd's death (1160),
  // Llywelyn the Great's rule over Powys Wenwynwyn (1208 to 1241), and the Perfeddwlad ceded to the Crown (1241). Ireland:
  // Munster parted into Thomond and Desmond (1118); the English from Bannow (1169): Waterford and Dublin (1170), Leinster and
  // Meath (1171 and 1172), Ulster (de Courcy, 1177), Ormond (1185), Limerick (1197), Cork (about 1210), and Connacht's west
  // (de Burgh, 1235).
  later("WES", [["1154-12-19", { part: ANGV }], ["1204-06-24", { part: "" }]]);
  later("NMD", [["1154-12-19", { part: ANGV }]]);
  later("ANJ", [["1154-12-19", { part: ANGV }], ["1204-06-24", { part: FRANCE }]]);
  later("AQD", [["1154-12-19", { part: ANGV }], ["1204-06-24", { part: "", ruler: ENGLAND, status: 5 }]]);
  later("BRE", [["1166-01-01", { part: ANGV }], ["1203-01-01", { part: FRANCE }]]);
  later("GAL", [["1120-01-01", { name: "Lordship of Galloway", wiki: "Lordship of Galloway", ruler: "Kingdom of Scotland", status: 5 }]]);
  later("SUN", [["1101-01-01", { name: "Kingdom of Meath", wiki: "Kingdom of Meath" }]]);
  own("LIRE", "Lordship of Ireland", { part: ANGV }, [["1204-06-24", { part: "", ruler: ENGLAND, status: 5 }]]);
  own("THOM", "Kingdom of Thomond");
  own("DESM", "Kingdom of Desmond");
  own("PFAD", "Kingdom of Powys Fadog");
  own("PWEN", "Kingdom of Powys Wenwynwyn");
  add(h.CUMBRIA, "+ 1136 ALB; 1157 WES");
  add(G("GBR", "Northumberland"), "+ 1139 ALB; 1157 WES");
  add(G("GBR", "Dumfries and Galloway"), "+ 1235 ALB");
  add(h.CEREDIGION, "+ 1110 WMAR; 1136 GWY; 1153 DEH");
  add(G("GBR", "Carmarthenshire"), "+ 1155 DEH");
  add(G("GBR", "Conwy", "Denbighshire"), "+ 1241 WMAR");
  add(G("GBR", "Flintshire"), "+ 1167 GWY; 1241 WMAR");
  add(G("GBR", "Wrexham"), "+ 1160 PFAD");
  add(G("GBR", "Powys"), "+ 1160 PWEN; 1208 GWY; 1241 PWEN");
  add(G("IRL", "Dublin"), "+ 1170 LIRE");
  add(G("IRL", "Meath", "Westmeath", "Fingal"), "+ 1172 LIRE");
  add(G("IRL", "Louth"), "+ 1185 LIRE");
  add(G("IRL", "Kildare", "Wicklow", "Carlow", "Wexford", "Laois", "Dún Laoghaire–Rathdown", "South Dublin", "Kilkenny"), "+ 1171 LIRE");
  add(["IRL:Waterford/*"], "+ 1170 LIRE");
  add(["IRL#waterford-city"], "+ 1170 LIRE");
  add(["IRL:Clare/*"], "+ 1118 THOM");
  add(["IRL:Limerick/*"], "+ 1118 THOM; 1197 LIRE");
  add(["IRL#limerick-city"], "+ 1118 THOM; 1197 LIRE");
  add(["IRL:Tipperary/*"], "+ 1118 THOM; 1185 LIRE");
  add(["IRL:Kerry/*"], "+ 1118 DESM");
  add(["IRL:Cork/*"], "+ 1118 DESM; 1210 LIRE");
  add(G("GBR", "Down", "Newry and Mourne", "Banbridge", "Ards", "North Down", "Castlereagh", "Belfast", "Lisburn", "Craigavon", "Antrim", "Newtownabbey", "Carrickfergus", "Larne", "Ballymena", "Moyle", "Ballymoney"),
    "+ 1177 LIRE");
  add(G("IRL", "Galway", "Mayo", "Sligo").map((s) => s.replace("IRL/", "IRL:" + s.slice(4) + "/")), "+ 1235 LIRE");
  add(["JEY/*", "GGY/*"], "+ 1204 WES");

  // ——— France, 1101 to 1250 ———
  // The royal demesne grows: Bourges (1101), the Vermandois and Amiénois (Boves, 1185), Artois (Isabella of Hainaut's dowry,
  // 1191), Normandy, Maine, Anjou, and Touraine (1204 and 1205), the Auvergne (1213), Poitou (1224) and La Rochelle (1224),
  // Saintonge (1242), and Languedoc's east after the Albigensian Crusade (the Treaty of Paris, 1229); the Agenais goes to
  // Toulouse as Joan of England's dowry (1196); the appanages are members: Artois (Robert, 1237), Poitou and the Auvergne
  // (Alphonse, 1241), and Anjou and Maine (Charles, 1246). The Albigensian Crusade's Languedoc is disputed from 1209 (the
  // Trencavel viscounties) and Toulouse from Simon de Montfort's taking of it (1215) to his death (1218). Maine is Anjou's from
  // 1110; Champagne holds Meaux and Provins from the union with Blois (1125); Roussillon passes to Barcelona (1172).
  own("ART", "County of Artois", { part: FRANCE });
  own("POIT", "County of Poitou", { part: FRANCE });
  own("ANGO", "County of Angoulême", { part: FRANCE });
  own("ALBd", "Languedoc", { wiki: "Albigensian Crusade", claims: ["County of Toulouse", FRANCE] });
  add(F("Indre", "Cher"), "+ 1101 WFR");
  add(F("Aisne"), "+ 1185 WFR");
  add(F("Pas-de-Calais"), "+ 1191 WFR; 1237 ART");
  add(F("Seine-et-Marne"), "+ 1125 CHA");
  add(F("Seine-Maritime", "Eure", "Calvados", "Orne", "Manche"), "+ 1204 WFR");
  add(F("Sarthe", "Mayenne"), "+ 1110 ANJ; 1204 WFR; 1246 ANJ");
  add(F("Maine-et-Loire"), "+ 1205 WFR; 1246 ANJ");
  add(F("Indre-et-Loire"), "+ 1205 WFR");
  add(F("Puy-de-Dôme", "Cantal", "Haute-Loire"), "+ 1213 WFR; 1241 POIT");
  add(F("Vienne", "Deux-Sèvres", "Vendée"), "+ 1224 WFR; 1241 POIT");
  add(F("Charente-Maritime"), "+ 1242 WFR");
  add(F("Charente"), "+ 1204 ANGO");
  add(F("Haute-Vienne", "Corrèze", "Creuse", "Dordogne"), "+ 1224 WFR");
  add(F("Lot-et-Garonne"), "+ 1196 TOU");
  add(F("Pyrénées-Orientales"), "+ 1172 BCN");
  add(F("Aude", "Hérault"), "+ 1209 ALBd; 1229 WFR");
  add(F("Gard"), "+ 1229 WFR");
  add(F("Haute-Garonne", "Tarn", "Tarn-et-Garonne"), "+ 1215 ALBd; 1218 TOU");

  // ——— Iberia, 1101 to 1250 ———
  // The Almoravids take Valencia (1102), Santarém (1111), Zaragoza (1110), and the Balearics (1116); Alfonso the Battler takes
  // Zaragoza (December 1118) and the Ebro; Portugal's counts become kings (São Mamede 1128, Ourique 1139) and take Santarém
  // and Lisbon (1147); Barcelona and Aragon join as the Crown of Aragon (1137), take Tortosa (1148) and Lleida (1149), and
  // Teruel (1171); Castile takes Cuenca (1177), Almería for a decade (1147 to 1157), and La Mancha after Las Navas (1212);
  // Castile and León are one crown from Ferdinand III (1230). The Almohads hold al-Andalus from 1147 to 1172 against Ibn
  // Mardanish's Murcia, and after Las Navas the third taifas rise: Ibn Hud's Murcia (1228), Zayyan's Valencia, Niebla, and
  // the Nasrids' Granada (1238). Then the great advance: Majorca (1229), Cáceres and Badajoz (1229 and 1230), Córdoba
  // (29 June 1236), Valencia (28 September 1238), Murcia a Castilian protectorate (1243), Jaén (1246), Seville (23 November
  // 1248), and Faro (1249); its months are on the zones of control.
  later("PORC", [["1128-06-24", { ruler: "", status: 0 }], ["1139-07-25", { name: "Kingdom of Portugal", wiki: "Kingdom of Portugal" }]]);
  later("ARA", [["1137-08-11", { part: CROA }]]);
  later("BCN", [["1137-08-11", { part: CROA }]]);
  later("PAM", [["1162-01-01", { name: "Kingdom of Navarre", wiki: "Kingdom of Navarre" }]]);
  later("CAS", [["1230-09-24", { name: CROCN, wiki: CROCN }]]);
  later("AST", [["1230-09-24", { name: CROCN, wiki: CROCN }]]);
  later("TMUR", [["1243-04-01", { ruler: CROCN, status: 5 }]]);
  own("ALMO", ALMON, { host: true });
  own("GHAN", "Banu Ghaniya");
  own("GRAN", "Emirate of Granada");
  own("TNIE", "Taifa of Niebla");
  own("VALK", "Kingdom of Valencia", { part: CROA });
  own("MAJK", "Kingdom of Majorca", { part: CROA });
  own("MARS", "Marinid Sultanate", { host: true });
  own("HAFS", "Hafsid dynasty", { host: true });
  own("ZAYY", "Zayyanid dynasty", { host: true });
  add(P("Santarém"), "+ 1111 ALM; 1147 PORC");
  add(P("Lisbon"), "+ 1147-10-25 PORC");
  add(P("Leiria"), "+ 1135 PORC");
  add(P("Castelo Branco"), "+ 1165 PORC");
  add(P("Portalegre"), "+ 1166 PORC");
  add(P("Évora"), "+ 1150 ALMO; 1165 PORC");
  add(P("Setúbal"), "+ 1150 ALMO; 1217 PORC");
  add(P("Beja"), "+ 1150 ALMO; 1234 PORC");
  add(P("Faro"), "+ 1150 ALMO; 1249 PORC");
  add(P("Guarda"), "+ 1199 PORC");
  add(E("Araba / Álava", "Gipuzkoa"), "+ 1123 PAM; 1200 CAS");
  add(E("La Rioja"), "+ 1109 ARA; 1134 CAS");
  add(E("Zaragoza"), "+ 1110 ALM; 1119 ARA");
  add(E("Teruel"), "+ 1104 ALM; 1171 ARA");
  add(E("Lleida"), "+ 1149-10-24 BCN");
  add(E("Tarragona"), "+ 1110 ALM; 1148-12-30 BCN");
  add(E("Castellón"), "+ 1102 ALM; 1147 TMUR; 1172 ALMO; 1229 TVAL; 1234 VALK");
  add(E("Valencia"), "+ 1102 ALM; 1147 TMUR; 1172 ALMO; 1229 TVAL; 1238-09-28 VALK");
  add(E("Alicante"), "+ 1147 TMUR; 1172 ALMO; 1228 TMUR; 1245 VALK");
  add(E("Murcia"), "+ 1147 TMUR; 1172 ALMO; 1228 TMUR");
  add(E("Albacete"), "+ 1147 TMUR; 1172 ALMO; 1213 CAS");
  add(E("Cuenca"), "+ 1108 ALM; 1147 TMUR; 1177 CAS");
  add(E("Ciudad Real"), "+ 1147 CAS; 1195 ALMO; 1212 CAS");
  add(E("Almería"), "+ 1147-10-17 CAS; 1157 ALMO; 1228 TMUR; 1238 GRAN");
  add(E("Granada"), "+ 1155 ALMO; 1228 TMUR; 1238 GRAN");
  add(E("Málaga"), "+ 1153 ALMO; 1228 TMUR; 1239 GRAN");
  add(E("Jaén"), "+ 1148 ALMO; 1228 TMUR; 1232 GRAN; 1246 CAS");
  add(E("Córdoba"), "+ 1148 ALMO; 1228 TMUR; 1236-06-29 CAS");
  add(E("Seville"), "+ 1147 ALMO; 1229 TMUR; 1234 TSEV; 1248-11-23 CAS");
  add(E("Huelva"), "+ 1147 ALMO; 1234 TNIE");
  add(E("Cádiz").concat(["GIB/*"]), "+ 1147 ALMO; 1228 TMUR; 1238 GRAN");
  add(E("Cáceres"), "+ 1150 ALMO; 1229 AST");
  add(E("Badajoz"), "+ 1150 ALMO; 1230 AST");
  add(E("Balearic Islands"), "+ 1116 ALM; 1146 GHAN; 1203 ALMO; 1230 MAJK");
  add(["ESP/Ceuta"], "+ 1148 ALMO");
  add(["ESP/Melilla"], "+ 1147 ALMO");

  // ——— North Africa, 1101 to 1250 ———
  // The Almohads take Morocco (Marrakesh, 1147), the Hammadids (1152), and Ifriqiya (1159 and 1160), where Roger II's
  // Kingdom of Sicily had held the coast from Tripoli (1146) to Mahdia (1148); the Hafsids hold Ifriqiya from 1229, the
  // Zayyanids Tlemcen from 1235, and the Marinids take Meknès (1244) and Fez (1248).
  add(T("Sousse", "Monastir", "Mahdia", "Sfax", "Gabès"), "+ 1148 SICK; 1160 ALMO; 1229 HAFS");
  add(T("Tunis", "Ben Arous", "Manouba", "Bizerte", "Nabeul", "Zaghouan", "Beja", "Jendouba", "Kef", "Siliana", "Kairouan", "Kasserine", "Sidi Bouzid", "Gafsa", "Tozeur", "Kebili"), "+ 1159 ALMO; 1229 HAFS");
  add(L("Tripoli District", "Jafara", "Zawiya", "Nuqat al Khams", "Murqub", "Misrata"), "+ 1146 SICK; 1158 ALMO; 1186 GHAN; 1235 HAFS");
  add(Z("El Tarf", "Annaba", "Skikda", "Guelma", "Souk Ahras", "Constantine", "Mila", "Jijel", "Sétif", "Batna", "Khenchela", "Oum El Bouaghi", "Biskra", "M'Sila", "Bordj Bou Arréridj",
    "Béjaïa", "Tizi Ouzou", "Bouïra", "Boumerdès", "Tébessa"), "+ 1152 ALMO; 1230 HAFS");
  add(Z("Algiers", "Blida", "Tipasa", "Médéa", "Chlef", "Aïn Defla", "Tissemsilt", "Tiaret", "Relizane", "Mascara", "Mostaganem", "Saïda"), "+ 1152 ALMO");
  add(Z("Tlemcen", "Aïn Témouchent", "Oran", "Sidi Bel Abbès", "Naama").concat(M("Oriental")), "+ 1145 ALMO; 1235 ZAYY");
  add(M("Tangier-Tetouan", "Gharb-Chrarda-Béni Hssen", "Rabat-Salé-Zemmour-Zaër", "Grand Casablanca", "Chaouia-Ouardigha", "Doukkala Abda", "Marrakesh-Tensift-El Haouz", "Tadla-Azilal", "Suss-Massa-Draa", "Taza-Al Hoceïma-Taounate"),
    "+ 1147 ALMO");
  add(M("Fès-méknas-boulmane"), "+ 1146 ALMO; 1248 MARS");
  add(M("Meknès-Tafilalet"), "+ 1146 ALMO; 1244 MARS");

  // ——— The Empire, 1101 to 1250 ———
  // The Empire's members multiply as the lords' and bishops' lands become territories: the ecclesiastical principalities from
  // the years their temporal lordship is attested (Cologne, Mainz, Trier, Bremen, Magdeburg, Münster, Paderborn, Osnabrück,
  // Minden, Bamberg, Fulda, Würzburg with its ducal rights in Franconia from 1168, Salzburg from 1213, Passau from 1217), the
  // counties of the north-west (Holstein 1111, Oldenburg 1108, Berg, Cleves, Jülich, Mark about 1160, Ravensberg 1140, Lippe
  // 1123), and the new marches and duchies: Brandenburg (Albert the Bear's Northern March from 1134, Brandenburg itself from
  // 11 June 1157, the Prignitz from the Wendish Crusade of 1147, Teltow and Barnim about 1230, the Uckermark from Landin in
  // 1250), Austria a duchy (Privilegium Minus, 1156), Styria free of Carinthia (1122) and a duchy (1180), Pomerania (Wartislaw
  // I, 1121, Poland's client to 1138, the Empire's from 1181, Denmark's from 1185 to Bornhöved in 1227), Mecklenburg and
  // Schwerin (1167), Rügen (Denmark's from 1168), Bohemia a kingdom (1198) with Moravia a margraviate (1182), Anhalt (1212),
  // and Brunswick-Lüneburg (1235). At Gelnhausen (1180) Henry the Lion's Saxony is parted: Westphalia to Cologne and the rest
  // to the Ascanians (Lauenburg and Wittenberg); Bavaria goes to the Wittelsbachs, with the County Palatine of the Rhine from
  // 1214. In the south-west, the Zähringer hold the Breisgau and the Burgundian rectorate to their end (1218); Baden (1112),
  // Württemberg (1143), and Habsburg are counties. Thuringia is a landgraviate (1131) with Hesse (1137) until its succession
  // war (1247), and Austria and Styria are disputed after the last Babenberg falls (1246). Denmark held Holstein, Hamburg, and
  // Lübeck from 1201 to 1227; Lübeck is a free city from 1226.
  const HRE2 = (k, n, w, more = []) => hre(k, n, w ? { wiki: w } : {}, more);
  HRE2("COLE", "Archbishopric of Cologne", "Electorate of Cologne");
  HRE2("MAINZ", "Archbishopric of Mainz", "Electorate of Mainz");
  HRE2("TRIER", "Archbishopric of Trier", "Electorate of Trier");
  HRE2("BREB", "Archbishopric of Bremen", "Prince-Archbishopric of Bremen");
  HRE2("MAGB", "Archbishopric of Magdeburg", "Archbishopric of Magdeburg");
  HRE2("MUNB", "Prince-Bishopric of Münster");
  HRE2("PADB", "Prince-Bishopric of Paderborn");
  HRE2("OSNB", "Prince-Bishopric of Osnabrück");
  HRE2("MINB", "Prince-Bishopric of Minden");
  HRE2("BAMB", "Prince-Bishopric of Bamberg");
  HRE2("WURB", "Prince-Bishopric of Würzburg");
  HRE2("FULD", "Princely Abbey of Fulda");
  HRE2("SALZ", "Archbishopric of Salzburg", "Prince-Archbishopric of Salzburg");
  HRE2("PASB", "Prince-Bishopric of Passau");
  HRE2("WESTF", "Duchy of Westphalia");
  HRE2("HOLS", "County of Holstein", "Holstein", [["1201-01-01", { part: "", ruler: DENMARK, status: 5 }], ["1227-07-22", { part: HRE, ruler: "", status: 0 }]]);
  HRE2("OLDC", "County of Oldenburg");
  HRE2("BERG", "County of Berg");
  HRE2("CLEV", "County of Cleves", "Duchy of Cleves");
  HRE2("JUL", "County of Jülich", "Duchy of Jülich");
  HRE2("MARK", "County of Mark");
  HRE2("RAVB", "County of Ravensberg");
  HRE2("LIPPE", "Lordship of Lippe", "Lippe");
  HRE2("FRIF", "Frisian lands", "Frisian freedom");
  HRE2("BRAND", "Margraviate of Brandenburg");
  HRE2("ANH", "County of Anhalt", "Anhalt");
  HRE2("BRUL", "Duchy of Brunswick-Lüneburg");
  HRE2("THUR", "Landgraviate of Thuringia");
  HRE2("STYR", "March of Styria", "Duchy of Styria", [["1180-01-01", { name: "Duchy of Styria" }]]);
  HRE2("TYRO", "County of Tyrol");
  HRE2("MERA", "Duchy of Merania");
  HRE2("MORM", "Margraviate of Moravia");
  HRE2("ZAHR", "Duchy of Zähringen", "House of Zähringen");
  HRE2("BADM", "Margraviate of Baden");
  HRE2("WURT", "County of Württemberg", "Duchy of Württemberg");
  HRE2("HABS", "County of Habsburg", "House of Habsburg");
  HRE2("KYB", "County of Kyburg", "House of Kyburg");
  HRE2("PALA", "County Palatine of the Rhine", "Electoral Palatinate");
  HRE2("SPON", "County of Sponheim");
  HRE2("NASS", "County of Nassau", "House of Nassau");
  HRE2("SAAR", "County of Saarbrücken");
  HRE2("BAR", "County of Bar", "Duchy of Bar");
  HRE2("METZ", "Prince-Bishopric of Metz");
  HRE2("LUB", "Free City of Lübeck", "Free City of Lübeck");
  own("MECK", "Lordship of Mecklenburg", { wiki: "Mecklenburg", ruler: "Duchy of Saxony", status: 5 }, [["1180-01-01", { ruler: "", status: 0, part: HRE }], ["1201-01-01", { part: "", ruler: DENMARK, status: 5 }],
    ["1227-07-22", { part: HRE, ruler: "", status: 0 }]]);
  own("SCHW", "County of Schwerin", { ruler: "Duchy of Saxony", status: 5 }, [["1180-01-01", { ruler: "", status: 0, part: HRE }], ["1201-01-01", { part: "", ruler: DENMARK, status: 5 }],
    ["1227-07-22", { part: HRE, ruler: "", status: 0 }]]);
  own("POMD", "Duchy of Pomerania", { ruler: "Kingdom of Poland", status: 5 }, [["1138-10-28", { ruler: "", status: 0 }], ["1181-01-01", { part: HRE }], ["1185-01-01", { part: "", ruler: DENMARK, status: 5 }],
    ["1227-07-22", { part: HRE, ruler: "", status: 0 }]]);
  own("RUGEN", "Principality of Rügen", { ruler: DENMARK, status: 5 });
  own("HESd", "Hesse", { wiki: "War of the Thuringian Succession", claims: ["Margraviate of Meissen", "Duchy of Brabant"] });
  own("AUSd", "Austria", { wiki: "Babenberg succession", claims: ["Kingdom of Bohemia", "Kingdom of Hungary"] });
  later("AUSM", [["1156-09-17", { name: "Duchy of Austria", wiki: "Duchy of Austria" }]]);
  later("BOH", [["1198-01-01", { name: "Kingdom of Bohemia", wiki: "Kingdom of Bohemia" }]]);
  later("LOU", [["1085-01-01", { name: "Landgraviate of Brabant", wiki: "Landgraviate of Brabant" }], ["1183-01-01", { name: "Duchy of Brabant", wiki: "Duchy of Brabant" }]]);
  // The north-west.
  add(DE("North Rhine-Westphalia", "Köln", "Bonn", "Rhein-Erft-Kreis", "Rhein-Kreis Neuss", "Euskirchen", "Recklinghausen").concat(DE("Rhineland-Palatinate", "Ahrweiler")), "+ 1101 COLE");
  add(DE("North Rhine-Westphalia", "Hochsauerlandkreis", "Soest", "Olpe"), "+ 1180 WESTF");
  add(DE("North Rhine-Westphalia", "Münster", "Coesfeld", "Borken", "Warendorf", "Steinfurt"), "+ 1101 MUNB");
  add(DE("North Rhine-Westphalia", "Paderborn", "Höxter"), "+ 1101 PADB");
  add(DE("Lower Saxony", "Osnabrück", "Landkreis Osnabrück", "Grafschaft Bentheim", "Emsland"), "+ 1101 OSNB");
  add(DE("North Rhine-Westphalia", "Minden-Lübbecke").concat(DE("Lower Saxony", "Schaumburg", "Nienburg (Weser)")), "+ 1101 MINB");
  add(DE("North Rhine-Westphalia", "Bielefeld", "Herford", "Gütersloh"), "+ 1140 RAVB");
  add(DE("North Rhine-Westphalia", "Lippe"), "+ 1123 LIPPE");
  add(DE("North Rhine-Westphalia", "Märkischer Kreis", "Hagen", "Dortmund", "Unna", "Hamm", "Bochum", "Ennepe-Ruhr-Kreis", "Herne", "Gelsenkirchen"), "+ 1160 MARK");
  add(DE("North Rhine-Westphalia", "Remscheid", "Solingen", "Wuppertal", "Mettmann", "Rheinisch-Bergischer Kreis", "Oberbergischer Kreis", "Düsseldorf", "Leverkusen", "Rhein-Sieg-Kreis"), "+ 1101 BERG");
  add(DE("North Rhine-Westphalia", "Kleve", "Wesel", "Duisburg", "Oberhausen", "Mülheim an der Ruhr", "Essen", "Bottrop"), "+ 1101 CLEV");
  add(DE("North Rhine-Westphalia", "Düren", "Heinsberg", "Städteregion Aachen", "Mönchengladbach", "Viersen", "Krefeld"), "+ 1101 JUL");
  add(DE("Lower Saxony", "Oldenburg (Oldenburg)", "Landkreis Oldenburg", "Ammerland", "Wesermarsch", "Delmenhorst", "Vechta", "Cloppenburg"), "+ 1108 OLDC");
  add(DE("Lower Saxony", "Aurich", "Leer", "Emden", "Wittmund", "Friesland", "Wilhelmshaven").concat(N("Friesland")), "+ 1101 FRIF");
  add(DE("Lower Saxony", "Stade", "Cuxhaven", "Rotenburg (Wümme)", "Osterholz", "Verden").concat(DE("Free Hanseatic Bremen", "Bremen", "Bremerhaven"), DE("Schleswig-Holstein", "Dithmarschen")), "+ 1101 BREB");
  add(DE("Schleswig-Holstein", "Steinburg", "Pinneberg", "Rendsburg-Eckernförde", "Neumünster", "Kiel", "Segeberg", "Stormarn").concat(DE("Hamburg", "Hamburg")), "+ 1111 HOLS");
  add(DE("Schleswig-Holstein", "Ostholstein", "Plön"), "+ 1127 OBO; 1143 HOLS");
  add(DE("Schleswig-Holstein", "Lübeck"), "+ 1127 OBO; 1143 HOLS; 1158 SAXD; 1201 HOLS; 1226 LUB");
  add(DE("Schleswig-Holstein", "Herzogtum Lauenburg"), "+ 1127 OBO; 1143 SAXD");
  add(DE("Mecklenburg-Western Pomerania", "Nordwestmecklenburg", "Rostock", "Landkreis Rostock", "Ludwigslust-Parchim"), "+ 1127 OBO; 1160 SAXD; 1167 MECK");
  add(DE("Mecklenburg-Western Pomerania", "Schwerin"), "+ 1127 OBO; 1160 SAXD; 1167 SCHW");
  add(DE("Mecklenburg-Western Pomerania", "Vorpommern-Rügen"), "+ 1168 RUGEN");
  add(DE("Mecklenburg-Western Pomerania", "Vorpommern-Greifswald").concat(PL("West Pomeranian")), "+ 1121 POMD");
  add(DE("Mecklenburg-Western Pomerania", "Mecklenburgische Seenplatte"), "+ 1121 POMD; 1236 BRAND");
  add(DE("Brandenburg", "Uckermark"), "+ 1121 POMD; 1250 BRAND");
  add(DE("Saxony-Anhalt", "Stendal", "Altmarkkreis Salzwedel"), "+ 1134 BRAND");
  add(DE("Brandenburg", "Havelland", "Brandenburg an der Havel", "Potsdam", "Potsdam-Mittelmark"), "+ 1157-06-11 BRAND");
  add(DE("Brandenburg", "Prignitz", "Ostprignitz-Ruppin"), "+ 1147 BRAND");
  add(DE("Brandenburg", "Oberhavel", "Barnim").concat(DE("Berlin", "Berlin")), "+ 1230 BRAND");
  add(DE("Brandenburg", "Frankfurt (Oder)", "Märkisch-Oderland", "Oder-Spree"), "+ 1138-10-28 GPOL; 1201 SILD; 1249 BRAND");
  add(DE("Saxony-Anhalt", "Magdeburg", "Börde", "Jerichower Land", "Salzlandkreis"), "+ 1101 MAGB");
  add(DE("Saxony-Anhalt", "Anhalt-Bitterfeld", "Dessau-Roßlau", "Harz"), "+ 1212 ANH");
  add(DE("Lower Saxony", "Braunschweig", "Wolfenbüttel", "Salzgitter", "Gifhorn", "Wolfsburg", "Helmstedt", "Celle", "Landkreis Lüneburg", "Uelzen", "Harburg", "Heidekreis", "Lüchow-Dannenberg",
    "Region Hannover", "Göttingen", "Northeim"), "+ 1235 BRUL");
  // Thuringia, Hesse, the Rhineland, and Franconia.
  add("DEU#thuringia", "+ 1131 THUR");
  add(DE("Hesse", "Kassel", "Landkreis Kassel", "Schwalm-Eder-Kreis", "Werra-Meißner-Kreis", "Marburg-Biedenkopf", "Landkreis Gießen", "Waldeck-Frankenberg"), "+ 1137 THUR; 1247 HESd");
  add(DE("Rhineland-Palatinate", "Mainz", "Mainz-Bingen").concat(DE("Hesse", "Rheingau-Taunus-Kreis"), DE("Bavaria", "Aschaffenburg", "Landkreis Aschaffenburg"), DE("Thuringia", "Eichsfeld", "Erfurt")), "+ 1101 MAINZ");
  add(DE("Hesse", "Fulda"), "+ 1101 FULD");
  add(DE("Rhineland-Palatinate", "Trier", "Trier-Saarburg", "Bernkastel-Wittlich", "Cochem-Zell", "Mayen-Koblenz", "Koblenz", "Vulkaneifel", "Eifelkreis Bitburg-Prüm"), "+ 1101 TRIER");
  add(DE("Rhineland-Palatinate", "Bad Kreuznach", "Birkenfeld", "Rhein-Hunsrück-Kreis", "Kusel"), "+ 1101 SPON");
  add(DE("Rhineland-Palatinate", "Rhein-Lahn-Kreis", "Westerwaldkreis").concat(DE("Hesse", "Limburg-Weilburg", "Lahn-Dill-Kreis")), "+ 1160 NASS");
  add(DE("Saarland", "Merzig-Wadern", "Neunkirchen", "Regionalverband Saarbrücken", "Saarlouis", "Saarpfalz-Kreis", "St. Wendel"), "+ 1101 SAAR");
  add(DE("Rhineland-Palatinate", "Rhein-Pfalz-Kreis", "Ludwigshafen am Rhein", "Frankenthal (Pfalz)", "Neustadt an der Weinstraße", "Bad Dürkheim", "Alzey-Worms", "Kaiserslautern", "Landkreis Kaiserslautern",
    "Donnersbergkreis").concat(DE("Baden-Württemberg", "Heidelberg", "Rhein-Neckar-Kreis", "Mannheim")), "+ 1156 PALA");
  add(DE("Bavaria", "Würzburg", "Landkreis Würzburg", "Kitzingen", "Main-Spessart", "Schweinfurt", "Landkreis Schweinfurt", "Haßberge", "Bad Kissingen", "Rhön-Grabfeld"), "+ 1168 WURB");
  add(DE("Bavaria", "Bamberg", "Landkreis Bamberg", "Forchheim", "Lichtenfels", "Kronach"), "+ 1101 BAMB");
  add(DE("Bavaria", "Bayreuth", "Landkreis Bayreuth", "Kulmbach"), "+ 1180 MERA");
  add(F("Meuse"), "+ 1101 BAR");
  add(F("Moselle"), "+ 1101 METZ");
  // The Low Countries.
  add(B("Antwerp"), "+ 1106 LOU");
  add(N("North Brabant"), "+ 1185 LOU");
  add(["NLD:Limburg/*"], "+ 1106 GEL");
  // Swabia, Switzerland, and Bavaria.
  add(DE("Baden-Württemberg", "Karlsruhe", "Landkreis Karlsruhe", "Pforzheim", "Rastatt", "Baden-Baden", "Enzkreis"), "+ 1112 BADM");
  add(DE("Baden-Württemberg", "Stuttgart", "Esslingen", "Rems-Murr-Kreis", "Ludwigsburg", "Göppingen", "Böblingen"), "+ 1143 WURT");
  add(DE("Baden-Württemberg", "Breisgau-Hochschwarzwald", "Freiburg im Breisgau", "Emmendingen", "Schwarzwald-Baar-Kreis"), "+ 1101 ZAHR; 1218 SWA");
  add(G("CHE", "Bern", "Solothurn", "Fribourg"), "+ 1127 ZAHR; 1218 KYB");
  add(G("CHE", "Zürich", "Thurgau", "Schaffhausen"), "+ 1173 KYB");
  add(G("CHE", "Aargau", "Lucerne", "Zug"), "+ 1108 HABS");
  add(F("Haut-Rhin"), "+ 1135 HABS");
  add(["AUT:Upper Austria/*"], "+ 1156 AUSM; 1247 AUSd");
  add(["AUT:Styria/*"], "+ 1122 STYR; 1247 AUSd");
  add(["AUT:Lower Austria/*", "AUT:Vienna/Vienna"], "+ 1247 AUSd");
  add(["AUT:Lower Austria/Wiener Neustadt", "AUT:Lower Austria/Wiener Neustadt-Land", "AUT:Lower Austria/Neunkirchen"], "+ 1158 STYR; 1247 AUSd");
  add(["AUT:Salzburg/*"], "+ 1213 SALZ");
  add(DE("Bavaria", "Passau", "Landkreis Passau"), "+ 1217 PASB");
  add(["AUT:Tyrol/*"], "+ 1180 MERA; 1248 TYRO");
  add(["CZE:South Moravian/*", "CZE:Zlín/*", "CZE:Olomouc/*", "CZE:Moravian-Silesian/*", "CZE:Vysočina/*"], "+ 1182 MORM");

  // ——— Italy, 1101 to 1250 ———
  // Roger II's Kingdom of Sicily (crowned 25 December 1130) joins Apulia, Calabria, and Sicily, with Capua (1135), Naples
  // (1137), and the Abruzzi (1140), and holds the African coast from 1146 to 1160; the Hohenstaufen held it from 1194, apart
  // from the Empire. Matilda's death (1115) ends the March of Tuscany as a power: Florence (1115), Siena (1125), and Lucca
  // (about 1160) govern themselves, and what is left is the Kingdom of Italy's, as are the Lombard communes. Innocent III
  // recovers Spoleto and the March of Ancona for the Papal States (1198). Ezzelino da Romano rules Verona, Vicenza, Padua,
  // and Treviso from 1236; Saluzzo is a march from 1142. Venice takes Crete (1211) and holds the Duchy of the Archipelago
  // (1207) as a client after the Fourth Crusade.
  own("SICK", "Kingdom of Sicily");
  hre("FLOR", "Republic of Florence");
  hre("SIEN", "Republic of Siena");
  hre("LUCC", "Republic of Lucca");
  hre("SALU", "March of Saluzzo", { wiki: "Marquisate of Saluzzo" });
  hre("EZZ", "Lordship of Ezzelino da Romano", { wiki: "Ezzelino III da Romano" });
  add(I("Salerno", "Potenza", "Avellino", "Campobasso", "Isernia", "Foggia", "Barletta-Andria-Trani", "Bari", "Taranto", "Brindisi", "Matera", "Lecce", "Cosenza", "Crotone", "Catanzaro",
    "Vibo Valentia", "Reggio Calabria", "Chieti", "Pescara", "Messina", "Catania", "Palermo", "Trapani", "Syracuse", "Caltanissetta", "Agrigento", "Enna", "Ragusa").concat(["MLT/*"]), "+ 1130-12-25 SICK");
  add(I("Caserta", "Latina"), "+ 1135 SICK");
  add(I("Naples"), "+ 1137 SICK");
  add(I("L'Aquila", "Teramo"), "+ 1140 SICK");
  add(I("Terni", "Rieti", "Macerata", "Fermo", "Ascoli Piceno"), "+ 1198 PAP");
  add(I("Florence", "Prato", "Pistoia"), "+ 1115 FLOR");
  add(I("Siena", "Grosseto"), "+ 1125 SIEN");
  add(I("Lucca"), "+ 1160 LUCC");
  add(I("Arezzo", "Massa-Carrara"), "+ 1115 ITK");
  add(I("Livorno"), "+ 1115 PISA");
  add(I("Reggio Emilia", "Modena", "Mantua", "Ferrara"), "+ 1115 ITK");
  add(I("Cuneo"), "+ 1142 SALU");
  add(I("Verona", "Vicenza", "Padua", "Treviso"), "+ 1101 ITK; 1236 EZZ");
  add(I("Belluno"), "+ 1101 ITK");
  add(GR("Crete"), "+ 1211 VEN");
  add(RU("Sevastopol"), "+ 1204 TREB");

  // ——— The Balkans, Greece, and Byzantium, 1101 to 1250 ———
  // Croatia in personal union with Hungary (1102); Bosnia a banate (1154), free under Kulin (1180); Serbia under Stefan
  // Nemanja (Zeta 1186, Kosovo by 1208) and a kingdom (1217); Arbanon (1190). The Second Bulgarian Empire from the Asen
  // brothers' rising (1185), taking Sofia (1195), Vidin, Varna (1201), and Thrace and Macedonia after Klokotnitsa (1230). The
  // Fourth Crusade (Constantinople, 12 April 1204) and its successors: the Latin Empire, the Kingdom of Thessalonica (to 1224),
  // Achaea, Athens, Epirus (which took Thessalonica in 1224), Nicaea (which took it in 1246), and Trebizond; Cyprus under
  // Isaac Komnenos (1184) and the Lusignans (1192); the Armenian Principality of Cilicia, a kingdom from 1198.
  later("CRO", [["1102-01-01", { ruler: "Kingdom of Hungary", status: 5 }]]);
  later("BOS", [["1154-01-01", { name: "Banate of Bosnia", wiki: "Banate of Bosnia", ruler: "Kingdom of Hungary", status: 5 }], ["1180-01-01", { ruler: "", status: 0 }]]);
  later("SRB", [["1217-01-01", { name: "Kingdom of Serbia", wiki: "Kingdom of Serbia (medieval)" }]]);
  own("SBE", "Second Bulgarian Empire");
  own("ARBA", "Principality of Arbanon");
  own("LATE", "Latin Empire");
  own("NICA", "Nicaean Empire", { wiki: "Empire of Nicaea" });
  own("TREB", "Empire of Trebizond");
  own("EPIR", "Despotate of Epirus");
  own("THES", "Kingdom of Thessalonica");
  own("ACHA", "Principality of Achaea");
  own("ATHE", "Duchy of Athens");
  own("NAXO", "Duchy of the Archipelago", { ruler: "Republic of Venice", status: 5 });
  own("CEPH", "County palatine of Cephalonia and Zakynthos");
  own("ISAC", "Cyprus under Isaac Komnenos", { wiki: "Isaac Komnenos of Cyprus" });
  own("CYPK", "Kingdom of Cyprus");
  own("ARMK", "Armenian Principality of Cilicia", {}, [["1198-01-06", { name: "Armenian Kingdom of Cilicia", wiki: "Armenian Kingdom of Cilicia" }]]);
  add(HR("Karlovac", "Primorje-Gorski", "Lika-Senj", "Zadar", "Šibenik-Knin", "Split-Dalmatia"), "+ 1102 CRO");
  add(["BIH:Una-Sana Canton/*", "BIH:Banja Luka/*", "BIH:Livno/*", "BIH:West Herzegovina Canton/*", "BIH:Central Bosnia Canton/*"], "+ 1102 CRO");
  add("MNE/*", "+ 1186 SRB");
  add(G("MNE", "Podgorica", "Bar", "Ulcinj", "Budva", "Cetinje", "Danilovgrad", "Nikšić", "Kotor", "Tivat", "Herceg Novi").concat(G("ALB", "Shkodër", "Lezhë")), "+ 1186 SRB");
  add(["BIH:Herzegovina-Neretva Canton/*", "BIH:Trebinje/*"], "+ 1186 SRB");
  add("KOS/*", "+ 1208 SRB");
  add(SR("Belgrade", "Podunavlje", "Braničevo"), "+ 1203 SBE; 1232 HUNG");
  add(SR("Pomoravski", "Bor", "Zaječar", "Nišava", "Pirot", "Jablanica", "Pčinja"), "+ 1203 SBE");
  add("MKD/*", "+ 1203 SBE; 1246 NICA");
  add(G("ALB", "Tirana", "Elbasan", "Kukës", "Dibër"), "+ 1190 ARBA");
  add(G("ALB", "Durrës"), "+ 1205 VEN; 1213 EPIR");
  add(G("ALB", "Vlorë", "Fier", "Berat", "Gjirokastër", "Korçë"), "+ 1205 EPIR");
  add(BG("Veliko Tarnovo", "Gabrovo", "Lovech", "Pleven", "Ruse", "Razgrad", "Targovishte", "Shumen", "Silistra", "Dobrich").concat(RO("Constanța", "Tulcea")), "+ 1186 SBE");
  add(BG("Varna"), "+ 1201 SBE");
  add(BG("Vidin", "Montana", "Vratsa"), "+ 1190 SBE");
  add(BG("Sofia", "Pernik", "Kyustendil", "Blagoevgrad"), "+ 1195 SBE");
  add(BG("Burgas", "Yambol", "Sliven", "Stara Zagora"), "+ 1205 SBE");
  add(BG("Plovdiv", "Pazardzhik"), "+ 1204 LATE; 1230 SBE");
  add(BG("Haskovo", "Kardzhali", "Smolyan"), "+ 1230 SBE; 1246 NICA");
  add(TR("Edirne"), "+ 1204 LATE; 1225 EPIR; 1230 SBE; 1246 NICA");
  add(TR("Kırklareli", "Tekirdağ"), "+ 1204 LATE; 1246 NICA");
  add(TR("Istanbul"), "+ 1204-04-12 LATE");
  add(GR("Centre Macedonia", "Mount Athos"), "+ 1204 THES; 1224 EPIR; 1246 NICA");
  add(GR("East Macedonia and Thrace"), "+ 1204 THES; 1224 EPIR; 1230 SBE; 1246 NICA");
  add(GR("Thessalia"), "+ 1204 THES; 1222 EPIR");
  add(GR("West Macedonia"), "+ 1215 EPIR; 1230 SBE; 1246 NICA");
  add(GR("Epirus"), "+ 1205 EPIR");
  add(GR("Central Greece", "Attica"), "+ 1205 ATHE");
  add(GR("Peloponnese", "West Greece"), "+ 1205 ACHA");
  add(GR("Ionian Islands"), "+ 1185 CEPH");
  add(GR("North Aegean"), "+ 1204 LATE; 1225 NICA");
  add(GR("South Aegean"), "+ 1207 NAXO");
  add(["CYP/*", "CYN/*"], "+ 1184 ISAC; 1191 CYPK");

  // ——— Anatolia, the Levant, and the Caucasus, 1101 to 1250 ———
  // Anatolia: the Komnenoi hold the west and the coasts; the Sultanate of Rum takes Malatya and the Danishmendids' land (1178),
  // Erzurum (1202), Antalya (1207), Sinop (1214), and the Mengujekids (1228), and becomes the Mongols' client after Köse Dağ
  // (1243). The Crusader states: Jerusalem's coast (Acre 1104, Beirut and Sidon 1110, Tyre 1124, Ascalon 1153) and
  // Oultrejordain (1115), Tripoli (12 July 1109), Antioch's east to the 1130s, and Edessa to Zengi's taking of it (24 December
  // 1144). Then the Zengids (Aleppo 1128, Damascus 1154), the Ayyubids (Damascus 1174, Aleppo 1183, Hattin and Jerusalem 1187),
  // the Third Crusade's coast (Acre, July 1191), Jerusalem by treaty (1229 to the Khwarazmians' sack of 1244), and the Artuqids
  // of Mardin and Hasankeyf. The Caucasus: David IV's Georgia (Kakheti 1104, Tbilisi 1122), the Zakarid Armenia of Queen
  // Tamar's reign (1199), the Eldiguzid atabegs of Azerbaijan (1136), the Khwarazmians (1225), and the Mongols (1231 to 1243).
  own("BURI", "Burid dynasty");
  own("ZENG", "Zengid dynasty");
  own("AYY", "Ayyubid Sultanate", { host: true });
  own("ARTQ", "Artuqids");
  own("TRIP", "County of Tripoli");
  own("ELDG", "Eldiguzids");
  own("KHWA", "Khwarazmian Empire", { host: true });
  own("MONG", "Mongol Empire", { host: true });
  own("ZAKA", "Zakarid Armenia", { ruler: "Kingdom of Georgia", status: 5 }, [["1236-01-01", { ruler: "Mongol Empire" }]]);
  later("GEOK", [["1243-01-01", { ruler: "Mongol Empire", status: 5 }]]);
  later("SHIR", [["1123-01-01", { ruler: "Kingdom of Georgia" }], ["1225-01-01", { ruler: "" , status: 0 }], ["1239-01-01", { ruler: "Mongol Empire", status: 5 }]]);
  later("RUM", [["1243-06-26", { ruler: "Mongol Empire", status: 5 }]]);
  later("ANTI", [["1137-01-01", { ruler: BYZN, status: 5 }], ["1180-01-01", { ruler: "", status: 0 }]]);
  add(TR("Kocaeli", "Yalova", "Balıkesir", "Çanakkale"), "+ 1204 LATE; 1224 NICA");
  add(TR("Bursa", "Bilecik", "Sakarya", "İzmir", "Manisa", "Aydın", "Muğla", "Uşak", "Bolu", "Düzce", "Zonguldak", "Bartın"), "+ 1204 NICA");
  add(TR("Denizli"), "+ 1207 RUM");
  add(TR("Antalya"), "+ 1207 RUM");
  add(TR("Trabzon", "Giresun", "Ordu", "Gümüşhane", "Rize"), "+ 1204 TREB");
  add(TR("Sinop"), "+ 1204 TREB; 1214 RUM");
  add(TR("Kayseri", "Niğde", "Nevşehir", "Kırşehir", "Kırıkkale", "Ankara", "Çankırı", "Yozgat", "Çorum", "Amasya", "Tokat", "Sivas", "Kastamonu", "Karabük", "Samsun"), "+ 1178 RUM");
  add(TR("Malatya"), "+ 1103 DNM; 1178 RUM");
  add(TR("Erzincan", "Tunceli"), "+ 1228 RUM");
  add(TR("Erzurum", "Bayburt"), "+ 1202 RUM");
  add(TR("Elazığ"), "+ 1101 ARTQ; 1234 RUM");
  add(TR("Kahramanmaraş"), "+ 1104 EDE; 1149 RUM");
  add(TR("Osmaniye", "Adana", "Mersin"), "+ 1101 ANTI; 1104 BYZ; 1135 ARMK; 1137 BYZ; 1145 ARMK");
  add(TR("Şanlıurfa"), "+ 1144-12-24 ZENG; 1182 AYY");
  add(TR("Gaziantep", "Kilis", "Adıyaman"), "+ 1151 ZENG; 1183 AYY");
  add(TR("Mardin"), "+ 1104 ARTQ");
  add(TR("Diyarbakır", "Batman", "Siirt", "Bingöl"), "+ 1102 ARTQ; 1232 AYY");
  add(TR("Şırnak"), "+ 1127 ZENG; 1182 AYY");
  add(TR("Bitlis"), "+ 1207 AYY; 1230 RUM");
  add(TR("Muş", "Van", "Hakkâri", "Ağrı"), "+ 1110 SHAR; 1207 AYY; 1230 RUM");
  add(TR("Kars"), "+ 1100 SALT; 1206 GEOK");
  add(TR("Iğdır").concat(AM("Aragatsotn", "Armavir", "Ararat", "Yerevan", "Kotayk", "Gegharkunik")), "+ 1105 SHAD; 1199 ZAKA");
  add(AM("Shirak"), "+ 1199 ZAKA");
  add(AM("Tavush", "Lori"), "+ 1118 GEOK");
  add(GE("Kakheti").concat(AZ("Shaki", "Sheki", "Qakh", "Zaqatala", "Balakan", "Oghuz", "Qabala")), "+ 1104 GEOK");
  add(GE("Kvemo Kartli", "Tbilisi"), "+ 1122 GEOK");
  add(AZ("Ganja", "Goygol", "Shamkir", "Samukh", "Goranboy", "Naftalan", "Barda", "Agdam", "Aghjabadi", "Beylagan", "Fuzuli", "Yevlakh", "Mingachevir", "Tovuz", "Qazax", "Agstafa",
    "Gadabay", "Dashkasan", "Sharur", "Sadarak", "Kangarli", "Babek", "Shahbuz", "Julfa", "Ordubad", "Nakhchivan"), "+ 1136 ELDG; 1225 KHWA; 1235 MONG");
  add(SY("Aleppo"), "+ 1118 ARTQ; 1128 ZENG; 1183 AYY");
  add(SY("Idlib"), "+ 1100 ANTI; 1135 ZENG; 1183 AYY");
  add(SY("Hama"), "+ 1130 ZENG; 1174 AYY");
  add(SY("Homs"), "+ 1104 BURI; 1149 ZENG; 1174 AYY");
  add(SY("Latakia"), "+ 1103 ANTI; 1188 AYY");
  add(SY("Tartus"), "+ 1102 TRIP");
  add(SY("Al-Raqqah", "Deir ez-Zor", "Al-Hasakah"), "+ 1127 ZENG; 1182 AYY");
  add(SY("Damascus", "Rif Dimashq", "Quneitra", "Daraa", "As-Suwayda", "Western al-Samadania").concat(LB("Beqaa"), JO("Irbid", "Ajloun", "Jerash", "Balqa", "Amman", "Zarqa", "Mafraq")),
    "+ 1104 BURI; 1154 ZENG; 1174-11-28 AYY");
  add(JO("Madaba", "Karak", "Tafilah", "Ma'an", "Aqaba"), "+ 1115 KOJ; 1188 AYY");
  add(LB("North"), "+ 1109-07-12 TRIP");
  add(LB("Beirut", "Mount Lebanon"), "+ 1110 KOJ; 1187 AYY; 1198 KOJ");
  add(LB("South"), "+ 1110 KOJ");
  add(LB("Nabatieh"), "+ 1139 KOJ; 1190 AYY");
  add(IL("Jerusalem"), "+ 1187-10-02 AYY; 1229-02-18 KOJ; 1244-08-23 AYY");
  add(["PSX/West Bank"], "+ 1187-10-02 AYY");
  add(IL("Central"), "+ 1187-07-05 AYY; 1192 KOJ");
  add(IL("Tel Aviv"), "+ 1187-07-05 AYY; 1191 KOJ");
  add(IL("Haifa"), "+ 1101 KOJ; 1187-07-05 AYY; 1191 KOJ");
  add(IL("Northern"), "+ 1187-07-05 AYY; 1191-07-12 KOJ");
  add(IL("Southern"), "+ 1153 KOJ; 1187 AYY");
  add(["PSX/Gaza"], "+ 1150 KOJ; 1187 AYY");

  // ——— Poland, the Baltic, Scandinavia, and Rus', 1101 to 1250 ———
  // Poland parted by Bolesław III's testament (28 October 1138) into the duchies of Silesia, Greater Poland, Masovia,
  // Sandomierz, and the senior's Kraków, drawn as members of Poland; Pomerelia under its Samborid dukes (1155, free from 1227).
  // The Baltic crusades: the Sword Brothers (1202) take the Livonians (1206), the Selonians (1208), the Latgalians (1214), and
  // southern and western Estonia (1224 and 1227), and become the Livonian Order (1237); Denmark takes northern Estonia (1219);
  // the Teutonic Order fights the Prussians from 1233; Mindaugas unites Lithuania (about 1240). Sweden takes Finland Proper
  // and Tavastia (by Birger Jarl's crusade, 1249); Norway takes Jämtland (1178). Rus': Halych (1141) and Galicia-Volhynia
  // (Roman, 1199), Novgorod a republic (1136), Vladimir-Suzdal (1157), and Ryazan (1129); then Batu's conquest (Ryazan December
  // 1237, Vladimir February 1238, Pereyaslavl and Chernigov 1239, Kiev 6 December 1240), after which the principalities are
  // the Golden Horde's clients (1242), as are Volga Bulgaria (1236) and the steppe.
  const POLAND = "Poland", GHN = "Golden Horde";
  const rusEnd = (k, d) => later(k, [[d, { part: "", ruler: "Mongol Empire", status: 5 }], ["1242-01-01", { ruler: GHN }]]);
  own("GPOL", "Duchy of Greater Poland", { part: POLAND });
  own("SILD", "Duchy of Silesia", { part: POLAND });
  own("MAZD", "Duchy of Masovia", { part: POLAND });
  own("SAND", "Duchy of Sandomierz", { part: POLAND });
  own("KRAK", "Duchy of Kraków", { wiki: "Seniorate Province", part: POLAND });
  own("POMR", "Duchy of Pomerelia", { part: POLAND }, [["1227-01-01", { part: "" }]]);
  own("SWORD", "Livonian Brothers of the Sword");
  own("LIVOR", "Livonian Order");
  own("DENE", "Danish Estonia", { ruler: DENMARK, status: 5 });
  own("PRUd", "Prussia", { wiki: "Prussian Crusade", claims: ["Teutonic Order", "Old Prussians"] });
  own("TEUT", "Teutonic Order", { host: true });
  own("LITG", "Grand Duchy of Lithuania");
  own("GH", GHN, { host: true });
  rus("GALI", "Principality of Halych");
  rus("GALV", "Principality of Galicia-Volhynia");
  rus("RYAZ", "Principality of Ryazan");
  later("NOVG", [["1136-01-01", { name: "Novgorod Republic", wiki: "Novgorod Republic" }], ["1240-12-06", { part: "" }]]);
  later("ROST", [["1157-01-01", { name: "Principality of Vladimir-Suzdal", wiki: "Vladimir-Suzdal" }]]);
  rusEnd("RYAZ", "1237-12-21"); rusEnd("ROST", "1238-02-08"); rusEnd("PERE", "1239-03-03"); rusEnd("CHER", "1239-10-18"); rusEnd("KIEV", "1240-12-06");
  later("GALV", [["1240-12-06", { part: "" }], ["1245-01-01", { ruler: GHN, status: 5 }]]);
  later("SMOL", [["1240-12-06", { part: "" }]]);
  later("POLO", [["1240-12-06", { part: "" }]]);
  add(PL("Greater Poland"), "+ 1138-10-28 GPOL");
  add(PL("Lubusz"), "+ 1138-10-28 GPOL; 1201 SILD");
  add(PL("Silesian", "Opole", "Lower Silesian"), "+ 1138-10-28 SILD");
  add(PL("Masovian", "Kuyavian-Pomeranian"), "+ 1138-10-28 MAZD");
  add(PL("Świętokrzyskie", "Lublin"), "+ 1138-10-28 SAND");
  add(PL("Lesser Poland", "Łódź"), "+ 1138-10-28 KRAK");
  add(PL("Pomeranian"), "+ 1116 POLD; 1138-10-28 POMR");
  add(PL("Warmian-Masurian").concat(RU("Kaliningrad")), "+ 1233 PRUd");
  add(["LTU:Panevėžys/*", "LTU:Utena/*", "LTU:Vilnius/*", "LTU:Kaunas/*", "LTU:Alytus/*"], "+ 1240 LITG");
  add(BY("Grodno"), "+ 1248 LITG");
  add("LVA/*", "+ 1214 SWORD; 1237 LIVOR");
  add("LVA#curonians", "+ 1214 CUR");
  add("LVA#semigallians", "+ 1214 SEMI");
  add("LVA#selonians", "+ 1208 SWORD; 1237 LIVOR");
  add("LVA#livonians", "+ 1206 SWORD; 1237 LIVOR");
  add(G("EST", "Harju", "Lääne-Viru", "Ida-Viru", "Rapla"), "+ 1219 DENE; 1227 SWORD; 1238 DENE");
  add(G("EST", "Tartu", "Valga", "Võru", "Põlva", "Viljandi", "Jõgeva", "Pärnu", "Järva"), "+ 1224 SWORD; 1237 LIVOR");
  add(G("EST", "Lääne", "Hiiu", "Saare"), "+ 1227 SWORD; 1237 LIVOR");
  add(G("FIN", "Finland Proper", "Tavastia Proper", "Päijänne Tavastia"), "+ 1249 SWE");
  add(G("SWE", "Jämtland"), "+ 1178 NWY");
  add(UA("Lviv", "Ivano-Frankivsk", "Chernivtsi", "Ternopil").concat(PL("Podkarpackie")), "+ 1141 GALI; 1199 GALV");
  add(UA("Volyn", "Rivne").concat(BY("Brest")), "+ 1199 GALV");
  add(RU("Ryazan"), "+ 1129 RYAZ");
  add(RU("Nizhny Novgorod"), "+ 1221 ROST");
  add(RU("Chuvash Republic", "Ulyanovsk"), "+ 1236 MONG; 1242 GH");
  add(RU("Penza", "Republic of Mordovia", "Tambov", "Lipetsk"), "+ 1237 MONG; 1242 GH");
  add(UA("Odessa", "Mykolaiv", "Kherson", "Kirovohrad", "Donetsk", "Luhansk", "Kharkiv", "Dnipropetrovsk", "Zaporizhzhia").concat(RU("Rostov", "Voronezh", "Belgorod", "Volgograd",
    "Republic of Kalmykia", "Astrakhan", "Saratov")), "+ 1238 MONG; 1242 GH");
  add(RU("Autonomous Republic of Crimea", "Stavropol Krai", "Chechen Republic", "Karachay-Cherkess Republic", "Kabardino-Balkaria", "Republic of North Ossetia-Alania", "Republic of Ingushetia"),
    "+ 1239 MONG; 1242 GH");
  add(RO("Suceava", "Botoșani", "Iași", "Neamț", "Bacău", "Vaslui", "Vrancea", "Galați").concat(["MDA/*"], RO("Mehedinți", "Dolj", "Gorj", "Vâlcea", "Olt", "Argeș", "Teleorman", "Giurgiu",
    "Dâmbovița", "Prahova", "Ilfov", "Bucharest", "Ialomița", "Călărași", "Buzău", "Brăila")), "+ 1241 MONG; 1242 GH");

  // ——————————————— 1251 to 1444 ———————————————
  const BURG = "Burgundian State", FR = { name: FRANCE, wiki: FRANCE, part: "" };

  // ——— Britain and Ireland, 1251 to 1444 ———
  // Wales: Llywelyn ap Gruffudd recovers the Perfeddwlad (1256) and Powys Wenwynwyn (1257), is the Deheubarth princes'
  // overlord (1258), and Prince of Wales by the Treaty of Montgomery (29 September 1267); Aberconwy (9 November 1277) gives the
  // Perfeddwlad and Ceredigion back to the Crown and Powys to Gruffydd ap Gwenwynwyn; Llywelyn falls (11 December 1282) and
  // Dafydd is taken (22 June 1283), and the Statute of Rhuddlan (3 March 1284) makes the Principality of Wales of the Crown's
  // lands, the rest the Marches. Owain Glyndŵr's rising holds much of Wales from 1403 to the fall of Harlech (1409). Scotland
  // takes the Isles and Man by the Treaty of Perth (2 July 1266); the MacDonalds' Lordship of the Isles is the Scots' vassal from
  // 1336; Man is the English crown's from 1333. Scotland is fought over from Balliol's abdication (10 July 1296) to Inverurie in
  // the north (23 May 1308) and Bannockburn in the south (24 June 1314), and the south again from the Treaty of Newcastle (12 June
  // 1334) to the taking of Edinburgh (17 April 1341). Ireland: Thomond's O'Briens take Clare back at Dysert O'Dea (10 May 1318);
  // Edward Bruce fights for Ulster (26 May 1315 to Faughart, 14 October 1318); after the Brown Earl's murder (6 June 1333) inner
  // Ulster passes to the Clandeboye O'Neills and Iveagh's Magennises, and Connacht to the Burkes of Clanricarde and Mac William
  // Íochtar; Art MacMurrough Kavanagh is King of Leinster from 1375.
  later("GWY", [["1267-09-29", { name: "Principality of Wales", wiki: "Principality of Wales" }]]);
  later("DEH", [["1258-01-01", { ruler: "Kingdom of Gwynedd", status: 5 }], ["1267-09-29", { ruler: "Principality of Wales" }], ["1277-11-09", { ruler: ENGLAND }]]);
  own("PWAL", "Principality of Wales", { ruler: ENGLAND, status: 5 });
  own("GLYd", "Wales", { wiki: "Glyndŵr rising", claims: ["Owain Glyndŵr", ENGLAND] });
  own("SCWI", "Scotland", { wiki: "First War of Scottish Independence", claims: ["Kingdom of Scotland", ENGLAND] });
  own("SCW2", "Scotland", { wiki: "Second War of Scottish Independence", claims: ["Kingdom of Scotland", ENGLAND] });
  own("LISL", "Lordship of the Isles", { ruler: "Kingdom of Scotland", status: 5 });
  own("MANN", "Lordship of Mann", { wiki: "Isle of Man", ruler: ENGLAND, status: 5 });
  own("BRUd", "Ulster", { wiki: "Bruce campaign in Ireland", claims: ["Edward Bruce", "Lordship of Ireland"] });
  own("CLAB", "Clandeboye");
  own("IVEA", "Iveagh");
  own("CLAN", "Clanricarde");
  own("MWI", "Mac William Íochtar");
  add(G("GBR", "Gwynedd", "Anglesey"), "+ 1283-06-22 PWAL; 1403-07-01 GLYd; 1409-02-01 PWAL");
  add(G("GBR", "Conwy"), "+ 1256 GWY; 1283-06-22 PWAL; 1403-07-01 GLYd; 1409-02-01 PWAL");
  add(G("GBR", "Denbighshire"), "+ 1256 GWY; 1277-11-09 WMAR; 1403-07-01 GLYd; 1409-02-01 WMAR");
  add(G("GBR", "Flintshire"), "+ 1256 GWY; 1277-11-09 WES; 1284-03-03 PWAL");
  add(G("GBR", "Powys"), "+ 1257 GWY; 1277-11-09 PWEN; 1283-06-22 WMAR; 1403-07-01 GLYd; 1409-02-01 WMAR");
  add(G("GBR", "Wrexham"), "+ 1282-12-11 WMAR");
  add(h.CEREDIGION, "+ 1277-11-09 WES; 1284-03-03 PWAL; 1403-07-01 GLYd; 1408-09-01 PWAL");
  add(G("GBR", "Carmarthenshire"), "+ 1284-03-03 PWAL; 1403-07-01 GLYd; 1409-02-01 PWAL");
  add(G("GBR", "Outer Hebrides"), "+ 1266-07-02 ALB; 1336 LISL");
  add("IMN/*", "+ 1266-07-02 ALB; 1333 MANN");
  add(G("GBR", "Fife", "Perth and Kinross", "Angus", "Dundee", "Aberdeen", "Aberdeenshire", "Moray", "Highland", "Argyll and Bute"), "+ 1296-07-10 SCWI; 1308-05-23 ALB");
  add(G("GBR", "Falkirk", "Stirling", "Clackmannanshire", "North Lanarkshire", "South Lanarkshire", "Glasgow", "East Dunbartonshire", "West Dunbartonshire", "Renfrewshire",
    "East Renfrewshire", "Inverclyde", "North Ayrshire", "East Ayrshire", "South Ayrshire"), "+ 1296-07-10 SCWI; 1314-06-24 ALB");
  add(G("GBR", "Scottish Borders", "Dumfries and Galloway", "East Lothian", "Midlothian", "Edinburgh", "West Lothian"), "+ 1296-07-10 SCWI; 1314-06-24 ALB; 1334-06-12 SCW2; 1341-04-17 ALB");
  add(["IRL:Clare/*"], "+ 1276 LIRE; 1318-05-10 THOM");
  add(G("GBR", "Antrim", "Ballymena", "Ballymoney", "Moyle", "Larne", "Newtownabbey", "Belfast", "Lisburn", "Castlereagh"), "+ 1315-05-26 BRUd; 1318-10-14 LIRE; 1333-06-06 CLAB");
  add(G("GBR", "Newry and Mourne", "Banbridge", "Craigavon"), "+ 1315-05-26 BRUd; 1318-10-14 LIRE; 1333-06-06 IVEA");
  add(G("GBR", "Down", "Ards", "North Down", "Carrickfergus"), "+ 1315-05-26 BRUd; 1318-10-14 LIRE");
  add(["IRL:Galway/*"], "+ 1333-06-06 CLAN");
  add(["IRL:Mayo/*"], "+ 1333-06-06 MWI");
  add(["IRL:Sligo/*"], "+ 1333-06-06 CON");
  add(G("IRL", "Wicklow", "Carlow"), "+ 1375 LEI");

  // ——— France and the Burgundian State, 1251 to 1444 ———
  // The crown takes Toulouse and Poitou with the Auvergne at Alphonse's death (21 August 1271), Angoulême (1308), Champagne with
  // Louis X (1314), Anjou with Philip VI (1328, an appanage again from 1360), and Lille and Douai (1312, Flanders' again from
  // 1369); it holds Flanders from 1300 to Courtrai (11 July 1302). Gascony is England's under the French crown: the Agenais from
  // the Treaty of Amiens (23 May 1279) to the War of Saint-Sardos (1324), Gascony confiscated from 1294 to 1303, and by the
  // Treaty of Brétigny (24 October 1360) a sovereign Aquitaine of Poitou, Saintonge, Angoumois, Limousin, Périgord, Quercy,
  // Rouergue, and the Agenais, the Black Prince's principality from 1362, which Charles V takes back from 1369 (Quercy and
  // Rouergue 1369, the Agenais 1370, Poitiers and La Rochelle 1372, Limousin 1374, Périgord 1377). The appanages: Bourbon
  // (1327), Berry and the Auvergne (Jean, 1360 to 1416), Orléans (1344 to 1375, again from 1392, with Blois from 1397); Armagnac
  // turns from the English (30 June 1368); Foix holds Béarn (1290) and Bigorre (1425). Brittany is fought over from Duke John
  // III's death (30 April 1341) to Auray (29 September 1364). Henry V's Normandy (lower Normandy 1418, Rouen 19 January 1419), the
  // Lancastrian France of the Treaty of Troyes (21 May 1420) with Maine (1425), until Charles VII's coronation campaign (Troyes
  // and Reims, July 1429), Chartres (1432), and Paris (13 April 1436). The Burgundian State from Louis of Male's death (30 January
  // 1384), which brought Flanders, Artois, and the County of Burgundy to Philip the Bold: Namur (1429), Brabant (1430), Holland
  // and Hainaut (1433), the Somme towns and the Auxerrois by the Treaty of Arras (21 September 1435), and Luxembourg (1443).
  own("BOUR", "Duchy of Bourbon", { part: FRANCE });
  own("BERY", "Duchy of Berry", { part: FRANCE });
  own("ORLd", "Duchy of Orléans", { wiki: "Duke of Orléans", part: FRANCE });
  own("ARMG", "County of Armagnac", { part: FRANCE });
  own("BREd", "Brittany", { wiki: "War of the Breton Succession", claims: ["House of Montfort", "House of Blois"] });
  own("LNMD", "Duchy of Normandy", { wiki: "Lancastrian Normandy", ruler: ENGLAND, status: 5 });
  own("LANC", "Lancastrian France", { wiki: "Dual monarchy of England and France" });
  own("SOMT", "Somme towns", { wiki: "Treaty of Arras (1435)", part: BURG });
  later("TOU", [["1271-08-21", FR]]);
  later("POIT", [["1271-08-21", FR]]);
  later("ANGO", [["1308-01-01", FR]]);
  later("CHA", [["1314-11-29", FR]]);
  later("ANJ", [["1328-04-01", FR], ["1360-10-25", { name: "Duchy of Anjou", wiki: "Duchy of Anjou", part: FRANCE }]]);
  later("BLO", [["1397-05-22", { name: "Duchy of Orléans", wiki: "Duke of Orléans" }]]);
  later("AQD", [["1360-10-24", { status: 5 }], ["1362-07-19", { name: "Principality of Aquitaine", wiki: "Principality of Aquitaine" }], ["1372-10-05", { name: "Duchy of Aquitaine", wiki: "Duchy of Aquitaine" }]]);
  later("BURD", [["1361-11-21", FR], ["1363-09-06", { name: "Duchy of Burgundy", wiki: "Duchy of Burgundy", part: FRANCE }], ["1384-01-30", { part: BURG }]]);
  for (const k of ["FLA", "ART", "FCB"]) later(k, [["1384-01-30", { part: BURG }]]);
  later("NAM", [["1429-03-01", { part: BURG }]]);
  later("LOU", [["1430-08-04", { part: BURG }]]);
  later("HOL", [["1433-04-12", { part: BURG }]]);
  later("HAI", [["1433-04-12", { part: BURG }]]);
  add(F("Nord"), "+ 1300-05-01 WFR; 1302-07-11 FLA; 1312-07-11 WFR; 1369-06-19 FLA");
  add(B("West Flanders", "East Flanders"), "+ 1300-05-01 WFR; 1302-07-11 FLA");
  add(F("Lot-et-Garonne"), "+ 1271-08-21 WFR; 1279-05-23 AQD; 1324-09-22 WFR; 1360-10-24 AQD; 1370 WFR");
  add(F("Gironde", "Landes"), "+ 1294-06-01 WFR; 1303-05-20 AQD");
  add(F("Vienne", "Deux-Sèvres", "Vendée"), "+ 1360-10-24 AQD; 1372-08-07 BERY; 1416-06-15 WFR");
  add(F("Charente-Maritime"), "+ 1360-10-24 AQD; 1372-09-08 WFR");
  add(F("Charente"), "+ 1360-10-24 AQD; 1372-09-08 WFR");
  add(F("Haute-Vienne", "Corrèze"), "+ 1360-10-24 AQD; 1374 WFR");
  add(F("Dordogne"), "+ 1360-10-24 AQD; 1377 WFR");
  add(F("Lot", "Aveyron"), "+ 1360-10-24 AQD; 1369 WFR");
  add(F("Hautes-Pyrénées"), "+ 1406 WFR; 1425 FOIX");
  add(F("Gers"), "+ 1368-06-30 ARMG");
  add(F("Pyrenees-Atlantics"), "+ 1290-04-26 FOIX");
  add(F("Allier"), "+ 1327-12-27 BOUR");
  add(F("Indre", "Cher"), "+ 1360-10-24 BERY; 1416-06-15 WFR");
  add(F("Puy-de-Dôme", "Cantal"), "+ 1360-10-24 BERY; 1416-06-15 BOUR");
  add(F("Loiret"), "+ 1344 ORLd; 1375 WFR; 1392-06-04 ORLd");
  add(F("Loir-et-Cher"), "+ 1397-05-22 ORLd");
  add(F("Finistère", "Morbihan", "Côtes-d'Armor", "Ille-et-Vilaine", "Loire-Atlantique"), "+ 1341-04-30 BREd; 1364-09-29 BRE");
  add(F("Calvados", "Orne", "Manche"), "+ 1418-02-16 LNMD");
  add(F("Seine-Maritime", "Eure"), "+ 1419-01-19 LNMD");
  add(F("Paris", "Hauts-de-Seine", "Seine-Saint-Denis", "Val-de-Marne", "Val-d'Oise", "Yvelines", "Essonne", "Seine-et-Marne"), "+ 1420-05-21 LANC; 1436-04-13 WFR");
  add(F("Eure-et-Loir"), "+ 1420-05-21 LANC; 1432-04-12 WFR");
  add(F("Marne", "Aube"), "+ 1420-05-21 LANC; 1429-07-10 WFR");
  add(F("Oise", "Aisne"), "+ 1420-05-21 LANC; 1429-08-18 WFR");
  add(F("Sarthe", "Mayenne"), "+ 1425-08-10 LANC");
  add(F("Somme"), "+ 1420-05-21 LANC; 1435-09-21 SOMT");
  add(F("Yonne"), "+ 1435-09-21 BURD");

  // ——— Iberia and the Maghreb, 1251 to 1444 ———
  // Castile takes Niebla (1262), Cádiz and Jerez (1262 and 1264), and Murcia after the Mudéjar revolt (1266), which Aragon holds
  // from 1296 to the Treaty of Torrellas (8 August 1304); Gibraltar is Castile's from 1309 to the Marinids' taking of it (17 June
  // 1333) and Granada's from 1374. The Kingdom of Majorca stands apart under James II from his father's death (27 July 1276) with
  // Roussillon, until Peter IV takes it back (1344). Ceuta is the Azafids' from 1249, Granada's from 1306, the Marinids' from 1309,
  // and Portugal's from 21 August 1415. The Marinids end the Almohads at Marrakesh (8 September 1269), and hold Tlemcen and the
  // Zayyanids' land twice (1337 to 1348 and 1352 to 1359); the Hafsids hold Algiers from 1235 and the Zayyanids the land to the
  // Chelif from 1236.
  own("AZAF", "Azafid dynasty");
  later("MAJK", [["1276-07-27", { part: "" }], ["1344-07-15", { part: CROA }]]);
  add(F("Pyrénées-Orientales"), "+ 1276-07-27 MAJK");
  add(E("Huelva"), "+ 1262 CAS");
  add(E("Cádiz"), "+ 1264 CAS");
  add(["GIB/*"], "+ 1309-09-12 CAS; 1333-06-17 MARS; 1374 GRAN");
  add(E("Murcia"), "+ 1266-02-01 CAS; 1296-04-01 VALK; 1304-08-08 CAS");
  add(["ESP/Ceuta"], "+ 1249 AZAF; 1306 GRAN; 1309 MARS; 1415-08-21 PORC");
  add(["ESP/Melilla"], "+ 1269-09-08 MARS");
  add(M("Tangier-Tetouan", "Gharb-Chrarda-Béni Hssen", "Rabat-Salé-Zemmour-Zaër", "Grand Casablanca", "Chaouia-Ouardigha", "Doukkala Abda", "Marrakesh-Tensift-El Haouz", "Tadla-Azilal",
    "Suss-Massa-Draa", "Taza-Al Hoceïma-Taounate"), "+ 1269-09-08 MARS");
  add(Z("Algiers", "Blida", "Tipasa", "Médéa"), "+ 1235 HAFS");
  add(Z("Chlef", "Aïn Defla", "Tissemsilt", "Tiaret", "Relizane", "Mascara", "Mostaganem", "Saïda"), "+ 1236 ZAYY; 1337-05-01 MARS; 1348 ZAYY; 1352-06-01 MARS; 1359-02-01 ZAYY");
  add(Z("Tlemcen", "Aïn Témouchent", "Oran", "Sidi Bel Abbès", "Naama").concat(M("Oriental")), "+ 1337-05-01 MARS; 1348 ZAYY; 1352-06-01 MARS; 1359-02-01 ZAYY");

  // ——— The Empire, Bohemia, and Poland, 1251 to 1444 ———
  // Ottokar II of Bohemia holds Austria (1251), Styria (Hungary's from 1254 to Kressenbrunn, 12 July 1260), and Carinthia
  // (1269) until the Treaty of Vienna (21 November 1276); the Habsburgs hold Austria and Styria from 1282, and their Swabian
  // lands, with Kyburg's (1264), are Further Austria. The Duchy of Swabia ends with Conradin (29 October 1268), and its land is
  // the Empire's own but for its counts' and cities'; Württemberg takes Urach (1265), Tübingen (1342), and Calw (1345). The Swiss
  // Confederacy from the Federal Charter (1 August 1291): Lucerne (1332), Zürich (1351), Glarus and Zug (1352), Bern (1353), and the
  // Aargau (1415). Bavaria is parted into Upper and Lower Bavaria (28 March 1255), whole again under Louis IV (1340), parted again
  // (1349), and in three from 1392 (Munich, Landshut, Ingolstadt); the Upper Palatinate goes to the Palatine line by the Treaty of
  // Pavia (4 August 1329). The burgraves of Nuremberg hold Bayreuth (1260) and Ansbach (1331). Saxony is parted into Lauenburg and
  // Wittenberg (1296), Wittenberg's dukes are electors by the Golden Bull (25 December 1356), and its electorate passes to the
  // Wettin margraves of Meissen (6 January 1423). The Thuringian succession war ends with Hesse a landgraviate (1264). Brunswick
  // and Lüneburg part (31 March 1269). Mecklenburg is a duchy (8 July 1348) and buys Schwerin (1358); Rügen passes to Pomerania
  // (1325); Upper Lusatia is Brandenburg's from 1253 and Bohemia's from 1319, Lower Lusatia Brandenburg's from 1304 and Bohemia's
  // from 1367. Schleswig is a duchy under the Danish crown from 1232. In the west, Lyon goes to France (10 April 1312), the
  // Dauphiné to the French king's heir (16 July 1349), the Comtat Venaissin to the pope (1274), Bresse (1272), Vaud (1260), the
  // Genevois (1401), and Nice (28 September 1388) to Savoy, a duchy from 19 February 1416. Bohemia is fought over in the Hussite
  // Wars, from 1420 to Sigismund's acceptance (14 August 1436). Poland is a kingdom again from Władysław I's coronation (20 January
  // 1320), with Masovia apart and Silesia's duchies Bohemia's vassals (Trentschin, 24 August 1335); it takes Galicia (Lviv, 1349),
  // which Hungary holds from Louis's accession in Poland (17 November 1370) to 1387. The Teutonic Order completes the conquest of
  // Prussia (1283), takes Pomerelia (Danzig, 13 November 1308), buys Danish Estonia (29 August 1346), holds Gotland (1398 to 1408)
  // and Samogitia (Raciąż, 22 May 1404, to its rising of 26 May 1409); the Livonian Order takes Curonia (1267) and Semigallia
  // (1290).
  own("SWIS", "Old Swiss Confederacy", { part: HRE });
  own("UBAV", "Duchy of Upper Bavaria", { part: HRE });
  own("LBAV", "Duchy of Lower Bavaria", { part: HRE });
  own("BMUN", "Duchy of Bavaria-Munich", { part: HRE });
  own("BLAN", "Duchy of Bavaria-Landshut", { part: HRE });
  own("BING", "Duchy of Bavaria-Ingolstadt", { part: HRE });
  own("NURB", "Burgraviate of Nuremberg", { part: HRE });
  own("SXWB", "Duchy of Saxe-Wittenberg", { part: HRE }, [["1356-12-25", { name: "Electorate of Saxony", wiki: "Electorate of Saxony" }]]);
  own("HESL", "Landgraviate of Hesse", { part: HRE });
  own("LUNE", "Principality of Lüneburg", { part: HRE });
  own("SCHL", "Duchy of Schleswig", { ruler: DENMARK, status: 5 });
  own("DAUF", "Dauphiné", { part: FRANCE });
  own("HUSd", "Bohemia", { wiki: "Hussite Wars", claims: ["Hussites", "Kingdom of Bohemia"] });
  own("POLK", "Kingdom of Poland", { wiki: "Kingdom of Poland (1320–1385)" });
  own("GVWd", "Galicia", { wiki: "Galicia–Volhynia Wars", claims: ["Kingdom of Poland", "Grand Duchy of Lithuania"] });
  later("AUSM", [["1251-01-01", { ruler: "Kingdom of Bohemia", status: 5 }], ["1276-11-21", { ruler: "", status: 0 }]]);
  later("STYR", [["1254-01-01", { part: "", ruler: "Kingdom of Hungary", status: 5 }], ["1260-07-12", { ruler: "Kingdom of Bohemia" }], ["1276-11-21", { part: HRE, ruler: "", status: 0 }]]);
  later("CARD", [["1269-10-27", { ruler: "Kingdom of Bohemia", status: 5 }], ["1276-11-21", { ruler: "", status: 0 }]]);
  later("SWA", [["1268-10-29", { name: HRE, wiki: HRE, part: "" }]]);
  later("KYB", [["1264-11-27", { name: "County of Habsburg", wiki: "House of Habsburg" }], ["1282-12-27", { name: "Further Austria", wiki: "Further Austria" }]]);
  later("HABS", [["1282-12-27", { name: "Further Austria", wiki: "Further Austria" }]]);
  later("SAXD", [["1296-01-01", { name: "Duchy of Saxe-Lauenburg", wiki: "Saxe-Lauenburg" }]]);
  later("MEIS", [["1423-01-06", { name: "Electorate of Saxony", wiki: "Electorate of Saxony" }]]);
  later("BRUL", [["1269-03-31", { name: "Principality of Brunswick-Wolfenbüttel", wiki: "Principality of Brunswick-Wolfenbüttel" }]]);
  later("MECK", [["1348-07-08", { name: "Duchy of Mecklenburg", wiki: "Duchy of Mecklenburg" }]]);
  later("SCHW", [["1358-12-07", { name: "Duchy of Mecklenburg", wiki: "Duchy of Mecklenburg" }]]);
  later("RUGEN", [["1325-11-08", { name: "Duchy of Pomerania", wiki: "Duchy of Pomerania", ruler: "", status: 0, part: HRE }]]);
  later("SAVC", [["1416-02-19", { name: "Duchy of Savoy", wiki: "Duchy of Savoy" }]]);
  later("GEL", [["1339-03-19", { name: "Duchy of Guelders", wiki: "Duchy of Guelders" }]]);
  later("LUXC", [["1354-03-13", { name: "Duchy of Luxembourg", wiki: "Duchy of Luxembourg" }], ["1443-11-22", { part: BURG }]]);
  later("BAR", [["1354-01-01", { name: "Duchy of Bar", wiki: "Duchy of Bar" }]]);
  later("JUL", [["1356-01-01", { name: "Duchy of Jülich", wiki: "Duchy of Jülich" }]]);
  later("BERG", [["1380-05-24", { name: "Duchy of Berg", wiki: "Duchy of Berg" }]]);
  later("CLEV", [["1417-04-28", { name: "Duchy of Cleves", wiki: "Duchy of Cleves" }]]);
  later("SILD", [["1320-01-20", { part: "" }], ["1335-08-24", { ruler: "Kingdom of Bohemia", status: 5 }]]);
  later("MAZD", [["1320-01-20", { part: "" }], ["1351-12-01", { ruler: "Kingdom of Poland", status: 5 }]]);
  later("DENE", [["1346-08-29", { ruler: "", status: 0 }]]);
  add(["AUT:Upper Austria/*", "AUT:Lower Austria/*", "AUT:Vienna/Vienna"], "+ 1251 BOH; 1276-11-21 AUSM");
  add(["AUT:Styria/*"], "+ 1254 STYR");
  add(G("CHE", "Uri", "Schwyz", "Nidwalden", "Obwalden"), "+ 1291-08-01 SWIS");
  add(G("CHE", "Lucerne"), "+ 1332-11-07 SWIS");
  add(G("CHE", "Zürich"), "+ 1218 EFR; 1351-05-01 SWIS");
  add(G("CHE", "Glarus"), "+ 1352-06-04 SWIS");
  add(G("CHE", "Zug"), "+ 1352-06-27 SWIS");
  add(G("CHE", "Bern"), "+ 1218 EFR; 1353-03-06 SWIS");
  add(G("CHE", "Solothurn"), "+ 1218 EFR");
  add(G("CHE", "Aargau"), "+ 1415-04-30 SWIS");
  add(G("CHE", "Vaud"), "+ 1260 SAVC");
  add(DE("Baden-Württemberg", "Reutlingen"), "+ 1265 WURT");
  add(DE("Baden-Württemberg", "Landkreis Tübingen"), "+ 1342 WURT");
  add(DE("Baden-Württemberg", "Calw"), "+ 1345 WURT");
  add(DE("Baden-Württemberg", "Breisgau-Hochschwarzwald", "Freiburg im Breisgau"), "+ 1368 HABS");
  add(["AUT:Vorarlberg/Feldkirch"], "+ 1379 HABS");
  add(["AUT:Vorarlberg/Bludenz"], "+ 1420 HABS");
  add(DE("Bavaria", "Landshut", "Landkreis Landshut", "Dingolfing-Landau", "Rottal-Inn", "Altötting", "Mühldorf a. Inn", "Straubing", "Straubing-Bogen", "Deggendorf", "Regen",
    "Freyung-Grafenau", "Kelheim"), "+ 1255-03-28 LBAV; 1340-12-20 BAV; 1349-09-13 LBAV; 1392-11-19 BLAN");
  add(DE("Bavaria", "München", "Landkreis München", "Freising", "Erding", "Dachau", "Fürstenfeldbruck", "Starnberg", "Ebersberg", "Rosenheim", "Landkreis Rosenheim", "Miesbach",
    "Bad Tölz-Wolfratshausen", "Weilheim-Schongau", "Garmisch-Partenkirchen", "Landsberg am Lech"), "+ 1255-03-28 UBAV; 1340-12-20 BAV; 1349-09-13 UBAV; 1392-11-19 BMUN");
  add(DE("Bavaria", "Ingolstadt", "Pfaffenhofen a.d. Ilm", "Neuburg-Schrobenhausen", "Aichach-Friedberg"), "+ 1255-03-28 UBAV; 1340-12-20 BAV; 1349-09-13 UBAV; 1392-11-19 BING");
  add(DE("Bavaria", "Amberg", "Amberg-Sulzbach", "Schwandorf", "Neumarkt i.d. OPf.", "Neustadt a.d. Waldnaab", "Weiden i.d. Opf", "Tirschenreuth", "Cham"),
    "+ 1255-03-28 UBAV; 1329-08-04 PALA");
  add(DE("Bavaria", "Bayreuth", "Landkreis Bayreuth", "Kulmbach", "Hof", "Landkreis Hof", "Wunsiedel i. Fichtelgebirge"), "+ 1260 NURB");
  add(DE("Bavaria", "Ansbach", "Landkreis Ansbach"), "+ 1331 NURB");
  add(DE("Saxony-Anhalt", "Wittenberg"), "+ 1296 SXWB; 1423-01-06 MEIS");
  add(DE("Hesse", "Kassel", "Landkreis Kassel", "Schwalm-Eder-Kreis", "Werra-Meißner-Kreis", "Marburg-Biedenkopf", "Landkreis Gießen", "Waldeck-Frankenberg"), "+ 1264 HESL");
  add(DE("Lower Saxony", "Celle", "Landkreis Lüneburg", "Uelzen", "Harburg", "Heidekreis", "Lüchow-Dannenberg", "Gifhorn"), "+ 1269-03-31 LUNE");
  add(DE("Saxony", "Bautzen", "Görlitz"), "+ 1253 BRAND; 1319 BOH");
  add(DE("Brandenburg", "Spree-Neiße", "Cottbus", "Oberspreewald-Lausitz", "Dahme-Spreewald"), "+ 1304 BRAND; 1367 BOH");
  add("DEU#schleswig", "+ 1232 SCHL");
  add(F("Rhône"), "+ 1312-04-10 WFR");
  add(F("Isère", "Drôme", "Hautes-Alpes"), "+ 1349-07-16 DAUF");
  add(F("Vaucluse"), "+ 1274 PAP");
  add(F("Ain"), "+ 1272 SAVC");
  add(F("Haute-Savoie"), "+ 1401-08-05 SAVC");
  add(F("Alpes-Maritimes"), "+ 1388-09-28 SAVC");
  add(["CZE:Prague/*", "CZE:Central Bohemian/*", "CZE:South Bohemian/*", "CZE:Plzeň-/*", "CZE:Karlovy Vary/*", "CZE:Ústí nad Labem/*", "CZE:Liberec/*", "CZE:Hradec Králové/*",
    "CZE:Pardubice/*"], "+ 1420-03-01 HUSd; 1436-08-14 BOH");
  add(PL("Greater Poland", "Lesser Poland", "Łódź", "Świętokrzyskie", "Lublin", "Kuyavian-Pomeranian"), "+ 1320-01-20 POLK");
  add(PL("Pomeranian"), "+ 1294-12-25 GPOL; 1308-11-13 TEUT");
  add(PL("Warmian-Masurian").concat(RU("Kaliningrad")), "+ 1283 TEUT");
  add(UA("Lviv", "Ivano-Frankivsk", "Ternopil").concat(PL("Podkarpackie")), "+ 1340-04-07 GVWd; 1349 POLK; 1370-11-17 HUNG; 1387 POLK");
  add(["LTU:Klaipėda/*"], "+ 1252 LIVOR; 1328 TEUT");
  add(["LTU:Marijampolė/*"], "+ 1283 TEUT; 1422-09-27 LITG");
  add(["LTU:Telšiai/*", "LTU:Šiauliai/*", "LTU:Tauragė/*"], "+ 1404-05-22 TEUT; 1409-05-26 LITG");
  add(G("SWE", "Gotland"), "+ 1361-07-27 DAN; 1398 TEUT; 1408 DAN");
  add(G("EST", "Harju", "Lääne-Viru", "Ida-Viru", "Rapla"), "+ 1346-08-29 LIVOR");
  add("LVA#curonians", "+ 1267 LIVOR");
  add("LVA#semigallians", "+ 1290 LIVOR");

  // ——— Italy, 1251 to 1444 ———
  // Charles of Anjou takes the Kingdom of Sicily at Benevento (26 February 1266); the Sicilian Vespers (30 March 1282) part the
  // island, the Aragonese Kingdom of Sicily (one with the Crown of Aragon from 25 July 1409, and with Malta from 1283), from the
  // Angevin mainland, the Kingdom of Naples, which Alfonso V takes (12 June 1442). Aragon conquers Pisan Sardinia (Iglesias, 7
  // February 1324) and, after Arborea's long war, takes Oristano (17 August 1420); Genoa takes Corsica after Meloria (6 August
  // 1284). In the north the communes become lordships: the Visconti's Milan (Desio, 21 January 1277, a duchy from 11 May 1395),
  // which takes Novara and Bergamo (1332), Cremona (1334), Vercelli and the Valtellina (1335), Piacenza (1336), Brescia (1337),
  // Ticino (1340), Asti (1342, Orléans's from 1387), Parma (1346), Alessandria (1348), Bologna (1350 to 1360), Pavia (1359), and
  // Verona and Vicenza from the Scaligeri (1387); the Scaligeri's Verona (1262), with Vicenza (1311) and for a time Padua (1328
  // to 1337) and Treviso (1329 to 1339); the Carraresi's Padua (a commune from Ezzelino's fall in 1256); the Este's Ferrara (1264),
  // Modena (1288), and Reggio (1409); the Bonacolsi's and Gonzagas' Mantua (1272, a march from 1433). Venice takes the terraferma:
  // Treviso (1339, Austria's 1381 and Padua's 1384 to 1388), Vicenza and Belluno (1404), Verona (1405), Padua (22 November 1405),
  // Friuli (Udine, 7 June 1420), Brescia (1426), Bergamo (1428), and Ravenna (1441); Florence takes Arezzo (1384), Pisa (9 October
  // 1406), and Livorno (1421). Genoa is France's (1396 to 1409) and Milan's (1421 to 1435). The Romagna is the pope's by Rudolf's
  // cession (1278). Savoy holds Turin from 1280.
  const OTTN = "Ottoman Empire", SICA_N = "Kingdom of Sicily";
  own("SICA", SICA_N, { wiki: "Kingdom of Sicily" }, [["1409-07-25", { part: CROA }]]);
  own("SARK", "Kingdom of Sardinia", { part: CROA });
  hre("MILn", "Lordship of Milan", { wiki: "Visconti of Milan" }, [["1395-05-11", { name: "Duchy of Milan", wiki: "Duchy of Milan" }]]);
  hre("SCAL", "Lordship of Verona", { wiki: "Scaliger" });
  hre("PADU", "Commune of Padua", { wiki: "Padua" }, [["1318-07-25", { name: "Lordship of Padua", wiki: "Carraresi" }]]);
  hre("ESTE", "Lordship of Ferrara", { wiki: "House of Este" });
  hre("MANT", "Lordship of Mantua", { wiki: "Mantua" }, [["1433-09-22", { name: "March of Mantua", wiki: "Marquisate of Mantua" }]]);
  later("SICK", [["1282-03-30", { name: "Kingdom of Naples", wiki: "Kingdom of Naples" }], ["1442-06-12", { part: CROA }]]);
  later("GEN", [["1396-11-27", { ruler: FRANCE, status: 5 }], ["1409-09-03", { ruler: "", status: 0 }], ["1421-11-02", { ruler: "Duchy of Milan", status: 5 }], ["1435-12-27", { ruler: "", status: 0 }]]);
  add(I("Messina", "Catania", "Palermo", "Trapani", "Syracuse", "Caltanissetta", "Agrigento", "Enna", "Ragusa"), "+ 1282-03-30 SICA");
  add(["MLT/*"], "+ 1283-07-08 SICA");
  add(I("Cagliari", "Carbonia-Iglesias"), "+ 1258 PISA; 1324-02-07 SARK");
  add(I("Olbia-Tempio"), "+ 1288 PISA; 1324-02-07 SARK; 1368 ARBO; 1409-06-30 SARK");
  add(I("Sassari"), "+ 1259 GEN; 1323 SARK; 1368 ARBO; 1420-08-17 SARK");
  add(I("Oristano", "Medio Campidano", "Nuoro", "Ogliastra"), "+ 1259 ARBO; 1420-08-17 SARK");
  add(F("Haute-Corse", "Corse-du-Sud"), "+ 1284-08-06 GEN");
  add(I("Milan", "Monza and Brianza", "Lodi", "Como", "Lecco", "Varese"), "+ 1277-01-21 MILn");
  add(I("Novara", "Verbano-Cusio-Ossola"), "+ 1332 MILn");
  add(I("Bergamo"), "+ 1332 MILn; 1428-04-19 VEN");
  add(I("Cremona"), "+ 1334 MILn");
  add(I("Vercelli", "Sondrio"), "+ 1335 MILn");
  add(I("Piacenza"), "+ 1336 MILn");
  add(I("Brescia"), "+ 1337 MILn; 1426-11-20 VEN");
  add(G("CHE", "Ticino"), "+ 1340 MILn");
  add(I("Asti"), "+ 1342 MILn; 1387 ORLd");
  add(I("Parma"), "+ 1346 MILn");
  add(I("Alessandria"), "+ 1348 MILn");
  add(I("Pavia"), "+ 1359-11-13 MILn");
  add(I("Bologna"), "+ 1278 PAP; 1350-10-23 MILn; 1360-04-01 PAP");
  add(I("Forlì-Cesena", "Rimini"), "+ 1278 PAP");
  add(I("Ravenna"), "+ 1278 PAP; 1441-02-24 VEN");
  add(I("Verona"), "+ 1259-10-01 ITK; 1262 SCAL; 1387-10-18 MILn; 1405-06-22 VEN");
  add(I("Vicenza"), "+ 1259-10-01 ITK; 1266 PADU; 1311 SCAL; 1387-10-18 MILn; 1404-04-28 VEN");
  add(I("Padua"), "+ 1256-06-20 PADU; 1328-09-10 SCAL; 1337-08-03 PADU; 1388-11-24 MILn; 1390-06-19 PADU; 1405-11-22 VEN");
  add(I("Treviso"), "+ 1259-10-01 ITK; 1329-07-18 SCAL; 1339-01-24 VEN; 1381-05-02 AUSM; 1384-02-04 PADU; 1388-12-14 VEN");
  add(I("Belluno"), "+ 1404 VEN");
  add(I("Ferrara", "Rovigo"), "+ 1264 ESTE");
  add(I("Modena"), "+ 1288 ESTE");
  add(I("Reggio Emilia"), "+ 1409 ESTE");
  add(I("Mantua"), "+ 1272 MANT");
  add(I("Udine", "Pordenone"), "+ 1420-06-07 VEN");
  add(I("Turin"), "+ 1280 SAVC");
  add(I("Arezzo"), "+ 1384-11-18 FLOR");
  add(I("Pisa"), "+ 1406-10-09 FLOR");
  add(I("Livorno"), "+ 1407 GEN; 1421-06-27 FLOR");

  // ——— The Balkans, Greece, and Byzantium, 1251 to 1444 ———
  // Michael VIII retakes Constantinople (25 July 1261), and Nicaea is the Byzantine Empire again; the Byzantines take Mystras
  // (1262) and the Peloponnese's centre by 1320, the Morea a despotate from 1349, Patras and the rest of Achaea from 1430; Thessaly
  // stands apart from Epirus (1268) until Andronikos III takes it (1335) and Epirus (1337). Serbia takes Skopje (1282) and the
  // Morava (1291), is an empire from Dušan's coronation (16 April 1346), and takes Serres (25 September 1345), Albania, Epirus, and
  // Thessaly (1348); after Uroš V (4 December 1371) Lazar's Moravian Serbia, the Ottomans' vassal after Kosovo (15 June 1389), the
  // Despotate (1402), whose land the Ottomans hold from Smederevo (27 August 1439) to the Peace of Szeged (August 1444); Zeta under
  // the Balšići (1356), Serbia's again from 1421; Marko's Prilep (1371 to Rovine, 17 May 1395). Charles of Anjou's Kingdom of Albania
  // (21 February 1272), the Thopias' principality (1358), and the Ottomans from 1415. Bulgaria takes the Rhodopes (1344), parts with
  // Vidin (1356, Hungary's from 1365 to 1369) and Dobruja (1354, Wallachia's from 1390), and falls to the Ottomans: Plovdiv (1364),
  // Thrace and Edirne (1369), Stara Zagora (1372), Sofia (1385), Tarnovo (17 July 1393), Vidin (1396), and Dobruja (1417). Serres is
  // Ottoman from 19 September 1383, Thessaloniki from 1387 to 1403, Venice's from 14 September 1423, and Ottoman from 29 March 1430;
  // Thessaly from 1393, Ioannina from 9 October 1430. The Catalan Company takes Athens at Halmyros (15 March 1311) under Sicily's
  // kings, the Acciaioli in 1388; the Gattilusi hold Lesbos (1355), Genoa Famagusta (1373), and Cyprus pays the Mamluks tribute
  // after Khirokitia (7 July 1426). Wallachia stands from Posada (November 1330), the Ottomans' tributary from 1417; Moldavia from
  // Bogdan (1359). Bosnia takes Hum (1326) and is a kingdom (26 October 1377); Ragusa is a republic under Hungary (18 February
  // 1358); Venice buys Dalmatia (Zadar, 1409) and takes Split (1420), Durrës (1392), and Shkodër (1396).
  own("OTT", OTTN);
  own("THSY", "Thessaly", { wiki: "Thessaly in the Middle Ages" });
  own("MORE", "Despotate of the Morea", { ruler: BYZN, status: 5 });
  own("ZETA", "Zeta", { wiki: "Zeta under the Balšići" });
  own("PRIL", "Kingdom of Prilep", { wiki: "Prince Marko", ruler: OTTN, status: 5 });
  own("ALBK", "Kingdom of Albania", { wiki: "Kingdom of Albania (medieval)", ruler: "Kingdom of Naples", status: 5 });
  own("THOP", "Principality of Albania", { wiki: "Principality of Albania (medieval)" });
  own("VALO", "Principality of Valona");
  own("VIDT", "Tsardom of Vidin");
  own("DOBR", "Despotate of Dobruja");
  own("GATT", "Lordship of Lesbos", { wiki: "Gattilusio", ruler: BYZN, status: 5 });
  own("WALL", "Wallachia", {}, [["1417-01-01", { ruler: OTTN, status: 5 }]]);
  own("MOLD", "Moldavia");
  own("RAGU", "Republic of Ragusa", { ruler: "Kingdom of Hungary", status: 5 });
  later("NICA", [["1261-07-25", { name: BYZN, wiki: BYZN }]]);
  later("SRB", [["1346-04-16", { name: "Serbian Empire", wiki: "Serbian Empire" }], ["1371-12-04", { name: "Moravian Serbia", wiki: "Moravian Serbia" }], ["1389-06-15", { ruler: OTTN, status: 5 }],
    ["1402-07-28", { name: "Serbian Despotate", wiki: "Serbian Despotate" }], ["1404-01-01", { ruler: "Kingdom of Hungary" }]]);
  later("BOS", [["1377-10-26", { name: "Kingdom of Bosnia", wiki: "Kingdom of Bosnia" }]]);
  later("ATHE", [["1311-03-15", { ruler: SICA_N, status: 5 }], ["1388-05-02", { ruler: "", status: 0 }], ["1394-01-01", { ruler: OTTN, status: 5 }]]);
  later("CYPK", [["1426-07-07", { ruler: "Mamluk Sultanate", status: 5 }]]);
  add(TR("Istanbul"), "+ 1261-07-25 NICA");
  add(GR("Peloponnese"), "+ 1320 NICA; 1349 MORE");
  add(GR("West Greece"), "+ 1430 MORE");
  add(GR("Thessalia"), "+ 1268 THSY; 1335 NICA; 1348 SRB; 1359 THSY; 1393 OTT");
  add(GR("Epirus"), "+ 1337 NICA; 1348 SRB; 1359 EPIR; 1430-10-09 OTT");
  add(GR("Centre Macedonia", "Mount Athos"), "+ 1387-04-09 OTT; 1403 NICA; 1423-09-14 VEN; 1430-03-29 OTT");
  add(GR("East Macedonia and Thrace"), "+ 1345-09-25 SRB; 1371-11-01 NICA; 1383-09-19 OTT");
  add(GR("West Macedonia"), "+ 1345 SRB; 1385 OTT");
  add(GR("North Aegean"), "+ 1355-07-17 GATT");
  add(["CYP:Famagusta/*"], "+ 1373-10-01 GEN");
  add("MKD/*", "+ 1282 SRB; 1371-09-26 PRIL; 1395-05-17 OTT");
  add(G("ALB", "Durrës"), "+ 1272-02-21 ALBK; 1392 VEN");
  add(G("ALB", "Tirana", "Elbasan"), "+ 1257 EPIR; 1272-02-21 ALBK; 1343 SRB; 1358 THOP; 1415 OTT");
  add(G("ALB", "Kukës", "Dibër"), "+ 1257 EPIR; 1282 SRB; 1415 OTT");
  add(G("ALB", "Vlorë", "Fier", "Berat"), "+ 1281 NICA; 1345 SRB; 1355 VALO; 1417 OTT");
  add(G("ALB", "Gjirokastër", "Korçë"), "+ 1345 SRB; 1418 OTT");
  add(G("ALB", "Shkodër", "Lezhë"), "+ 1356 ZETA; 1396 VEN");
  add(G("MNE", "Podgorica", "Bar", "Ulcinj", "Budva", "Cetinje", "Danilovgrad", "Nikšić", "Kotor", "Tivat", "Herceg Novi"), "+ 1356 ZETA; 1421 SRB");
  add(SR("Pomoravski", "Bor", "Zaječar", "Braničevo"), "+ 1291 SRB");
  add(SR("Nišava", "Pirot", "Jablanica", "Pčinja"), "+ 1282 SRB; 1386 OTT");
  add(SR("Belgrade", "Podunavlje"), "+ 1284 SRB; 1319 HUNG; 1403 SRB; 1427 HUNG");
  add(SR("Šumadija", "Kolubara", "Moravica", "Raška", "Rasina", "Toplica", "Zlatibor", "Mačva", "Pomoravski", "Braničevo").concat(["KOS/*"]), "+ 1439-08-27 OTT; 1444-08-15 SRB");
  add(BG("Veliko Tarnovo", "Gabrovo", "Lovech", "Pleven", "Ruse", "Razgrad", "Targovishte", "Shumen"), "+ 1393-07-17 OTT");
  add(BG("Silistra", "Dobrich").concat(RO("Constanța", "Tulcea")), "+ 1354 DOBR; 1390 WALL; 1417 OTT");
  add(BG("Varna"), "+ 1354 DOBR; 1389 OTT");
  add(BG("Vidin", "Montana", "Vratsa"), "+ 1356 VIDT; 1365 HUNG; 1369 VIDT; 1396-09-25 OTT");
  add(BG("Sofia", "Pernik"), "+ 1385 OTT");
  add(BG("Kyustendil", "Blagoevgrad"), "+ 1395-05-17 OTT");
  add(BG("Burgas", "Yambol", "Sliven", "Stara Zagora"), "+ 1372 OTT");
  add(BG("Plovdiv", "Pazardzhik"), "+ 1364 OTT");
  add(BG("Haskovo", "Kardzhali", "Smolyan"), "+ 1344 SBE; 1371-09-26 OTT");
  add(TR("Edirne", "Kırklareli", "Tekirdağ"), "+ 1369 OTT");
  add(HR("Zadar"), "+ 1409-07-31 VEN");
  add(HR("Split-Dalmatia"), "+ 1420 VEN");
  add(HR("Dubrovnik-Neretva"), "+ 1205 VEN; 1358-02-18 RAGU");
  add(["BIH:Herzegovina-Neretva Canton/*", "BIH:Trebinje/*"], "+ 1326 BOS");
  add(RO("Mehedinți", "Dolj", "Gorj", "Vâlcea", "Olt", "Argeș", "Teleorman", "Giurgiu", "Dâmbovița", "Prahova", "Ilfov", "Bucharest", "Ialomița", "Călărași", "Buzău", "Brăila"), "+ 1330-11-12 WALL");
  add(RO("Suceava", "Botoșani", "Iași", "Neamț", "Bacău", "Vaslui", "Vrancea", "Galați").concat(["MDA/*"], UA("Chernivtsi")), "+ 1359 MOLD");

  // ——— Anatolia, the Levant, and the Caucasus, 1251 to 1444 ———
  // Hülegü's Ilkhanate (1256) holds the Sultanate of Rum, Georgia, Armenia, Shirvan, and Azerbaijan as its clients; Rum ends
  // (1308) and its land is the Ilkhans' until the last Ilkhan's death (30 November 1335), then the Eretnids', Kadi Burhan
  // al-Din's (1381), and the Ottomans' (1398). The beyliks: Karaman (1256, Konya from 1308), Menteshe (about 1280), Hamid (about
  // 1280), Candar (1292, Sinop 1322), Karesi (1297), Germiyan (about 1300), Aydın (1308), Saruhan (1313), and Teke (1321). The
  // Ottomans: Söğüt (about 1289), Bilecik (1299), Bursa (6 April 1326), Nicomedia (1337), Karesi (1345), Ankara (1354), Kütahya
  // (1381), and Bayezid's conquests of 1390 to 1398, undone at Ankara (20 July 1402), when Timur gives the beyliks back; the
  // Ottomans take them again: Saruhan (1410), Teke and Hamid (1423), Menteshe (1424), Aydın (1425), and Germiyan by bequest (1429).
  // The Mamluks: Syria after Ain Jalut (3 September 1260, the Mongols having held Aleppo and Damascus since January and March),
  // Kerak (1263), Caesarea and Arsuf (1265), Jaffa (7 March 1268), Antioch (18 May 1268), Tripoli (26 April 1289), Acre (18 May
  // 1291) and the coast, Malatya (1315), and Cilicia (Sis, 13 April 1375), with the Ayyubids of Hama (to 1341), the Dulkadirids
  // (1337), and the Ramadanids as their clients. The Caucasus: western Georgia under David VI (1259) until George V reunites it
  // and throws off the Ilkhans (1327 to 1330); Shirvan's shahs free from 1335; Azerbaijan the Chobanids' (1338), the Jalayirids'
  // (1357), Timur's (1386), and the Qara Qoyunlu's (1406), who take Armenia, Erzurum, and Erzincan (1410) and Mardin (1409); the Aq
  // Qoyunlu hold Diyarbakır from 1402.
  const ILKN = "Ilkhanate", MAMN = "Mamluk Sultanate";
  own("ILKH", ILKN, { host: true });
  own("MAML", MAMN, { host: true });
  own("CHOB", "Chobanids", { host: true });
  own("JALA", "Jalayirid Sultanate", { host: true });
  own("TIMU", "Timurid Empire", { host: true });
  own("QARA", "Qara Qoyunlu", { host: true });
  own("AQQO", "Aq Qoyunlu", { host: true });
  own("KARA", "Karamanids");
  own("GERM", "Germiyanids");
  own("AYDN", "Aydinids");
  own("SARU", "Saruhanids");
  own("MENT", "Menteshe");
  own("KARE", "Karasids");
  own("HAMI", "Hamidids");
  own("TEKE", "Teke", { wiki: "Teke (beylik)" });
  own("CAND", "Isfendiyarids");
  own("DULK", "Dulkadirids", { ruler: MAMN, status: 5 });
  own("RAMA", "Ramadanids", { ruler: MAMN, status: 5 });
  own("HAMA", "Ayyubids of Hama", { wiki: "Ayyubid dynasty", ruler: MAMN, status: 5 });
  own("HASK", "Ayyubids of Hasankeyf", { wiki: "Ayyubid dynasty" });
  own("IMER", "Kingdom of Imereti");
  later("RUM", [["1256-01-01", { ruler: ILKN }], ["1308-01-01", { name: ILKN, wiki: ILKN, ruler: "", status: 0 }], ["1335-11-30", { name: "Eretnids", wiki: "Eretnids" }],
    ["1381-01-01", { name: "Kadi Burhan al-Din", wiki: "Kadi Burhan al-Din" }], ["1398-07-01", { name: OTTN, wiki: OTTN }]]);
  later("GEOK", [["1256-01-01", { ruler: ILKN }], ["1327-01-01", { ruler: "", status: 0 }]]);
  later("ZAKA", [["1256-01-01", { ruler: ILKN }]]);
  later("SHIR", [["1256-01-01", { ruler: ILKN }], ["1335-11-30", { ruler: "", status: 0 }]]);
  later("ARTQ", [["1260-01-01", { ruler: ILKN, status: 5 }], ["1335-11-30", { ruler: "", status: 0 }]]);
  later("ARMK", [["1266-08-24", { ruler: ILKN, status: 5 }], ["1335-11-30", { ruler: "", status: 0 }]]);
  add(TR("Konya"), "+ 1308 KARA; 1397 OTT; 1402-07-20 KARA");
  add(TR("Karaman"), "+ 1256 KARA; 1397 OTT; 1402-07-20 KARA");
  add(TR("Kütahya"), "+ 1300 GERM; 1381 OTT; 1402-07-20 GERM; 1429 OTT");
  add(TR("Uşak", "Afyonkarahisar", "Denizli"), "+ 1300 GERM; 1390 OTT; 1402-07-20 GERM; 1429 OTT");
  add(TR("İzmir", "Aydın"), "+ 1308 AYDN; 1390 OTT; 1402-07-20 AYDN; 1425 OTT");
  add(TR("Manisa"), "+ 1313 SARU; 1390 OTT; 1402-07-20 SARU; 1410 OTT");
  add(TR("Muğla"), "+ 1280 MENT; 1390 OTT; 1402-07-20 MENT; 1424 OTT");
  add(TR("Balıkesir", "Çanakkale"), "+ 1297 KARE; 1345 OTT");
  add(TR("Isparta", "Burdur"), "+ 1280 HAMI; 1391 OTT; 1402-07-20 HAMI; 1423 OTT");
  add(TR("Antalya"), "+ 1321 TEKE; 1390 OTT; 1402-07-20 TEKE; 1423 OTT");
  add(TR("Kastamonu", "Çankırı", "Karabük"), "+ 1292 CAND; 1392 OTT; 1402-07-20 CAND");
  add(TR("Sinop"), "+ 1322 CAND");
  add(TR("Eskişehir"), "+ 1289 OTT");
  add(TR("Bilecik"), "+ 1299 OTT");
  add(TR("Bursa"), "+ 1326-04-06 OTT");
  add(TR("Sakarya", "Bolu", "Düzce"), "+ 1330 OTT");
  add(TR("Kocaeli", "Yalova"), "+ 1337 OTT");
  add(TR("Ankara"), "+ 1354 OTT");
  add(TR("Malatya"), "+ 1315 MAML");
  add(TR("Kahramanmaraş"), "+ 1337 DULK");
  add(TR("Osmaniye", "Adana", "Mersin"), "+ 1375-04-13 RAMA");
  add(TR("Erzincan", "Tunceli", "Erzurum", "Bayburt", "Kars"), "+ 1410 QARA");
  add(TR("Muş", "Van", "Hakkâri", "Ağrı", "Bitlis"), "+ 1338 CHOB; 1357 JALA; 1375 QARA");
  add(TR("Mardin"), "+ 1409 QARA");
  add(TR("Diyarbakır", "Bingöl"), "+ 1260 ILKH; 1335-11-30 ARTQ; 1402 AQQO");
  add(TR("Siirt", "Batman"), "+ 1260 HASK");
  add(TR("Şırnak").concat(SY("Al-Hasakah")), "+ 1260 ILKH; 1336 JALA; 1409 QARA");
  add(TR("Şanlıurfa"), "+ 1260 ILKH; 1335-11-30 MAML");
  add(TR("Gaziantep", "Kilis", "Adıyaman").concat(SY("Aleppo", "Idlib", "Al-Raqqah", "Deir ez-Zor")), "+ 1260-01-24 ILKH; 1260-09-03 MAML");
  add(TR("Hatay"), "+ 1268-05-18 MAML");
  add(SY("Hama"), "+ 1260-01-24 ILKH; 1260-09-03 HAMA; 1341 MAML");
  add(SY("Homs", "Latakia", "Damascus", "Rif Dimashq", "Quneitra", "Daraa", "As-Suwayda", "Western al-Samadania").concat(LB("Beqaa", "Nabatieh"), JO("Irbid", "Ajloun", "Jerash", "Balqa", "Amman",
    "Zarqa", "Mafraq")), "+ 1260-03-01 ILKH; 1260-09-03 MAML");
  add(JO("Madaba", "Karak", "Tafilah", "Ma'an", "Aqaba"), "+ 1263 MAML");
  add(IL("Jerusalem", "Southern").concat(["PSX/West Bank", "PSX/Gaza"]), "+ 1260-09-03 MAML");
  add(IL("Central"), "+ 1265 MAML");
  add(IL("Tel Aviv"), "+ 1268-03-07 MAML");
  add(LB("North"), "+ 1289-04-26 MAML");
  add(IL("Northern", "Haifa").concat(LB("South")), "+ 1291-05-18 MAML");
  add(LB("Beirut", "Mount Lebanon").concat(SY("Tartus")), "+ 1291-07-31 MAML");
  add(GE("Imereti", "Racha-Lechkhumi and Kvemo Svaneti", "Guria", "Samegrelo-Zemo Svaneti", "Adjara"), "+ 1259 IMER; 1330 GEOK");
  add(AZ("Ganja", "Goygol", "Shamkir", "Samukh", "Goranboy", "Naftalan", "Barda", "Agdam", "Aghjabadi", "Beylagan", "Fuzuli", "Yevlakh", "Mingachevir", "Tovuz", "Qazax", "Agstafa",
    "Gadabay", "Dashkasan", "Sharur", "Sadarak", "Kangarli", "Babek", "Shahbuz", "Julfa", "Ordubad", "Nakhchivan"), "+ 1256 ILKH; 1338 CHOB; 1357 JALA; 1386 TIMU; 1406 QARA");
  add(TR("Iğdır").concat(AM("Aragatsotn", "Armavir", "Ararat", "Yerevan", "Kotayk", "Gegharkunik", "Shirak")), "+ 1338 CHOB; 1357 JALA; 1386 TIMU; 1410 QARA");

  // ——— Scandinavia, Lithuania, Rus', and the Horde, 1251 to 1444 ———
  // Iceland accepts Norway's king (the Old Covenant, 1262); Sweden takes Uusimaa and Satakunta, Vyborg's Karelia (1293), and
  // Savonia by the Treaty of Nöteborg (12 August 1323), and holds Scania and Blekinge from 1332 to 1360; Denmark, Norway, and
  // Sweden are one in the Kalmar Union (17 June 1397). Lithuania takes Polotsk and Minsk (1307), Brest (1320), Volhynia (1340),
  // Bryansk and Chernigov's lands (1356, the Upper Oka princes its clients), Kiev, Pereyaslavl, and the Kursk land after Blue
  // Waters (1362), Podolia (1363, its west Poland's from 1434), Podlachia (1283), Smolensk (1404), and the steppe to the Black
  // Sea (about 1415). In the north-east: Tver (1247), Moscow under Daniel (1263), a grand principality from 1328, which takes
  // Vladimir (1363) and Nizhny Novgorod (1392); Suzdal-Nizhny Novgorod (1341); Yaroslavl; and Pskov free of Novgorod (Bolotovo,
  // 1348), all the Horde's tributaries. The Horde loses Kazan (1438) and the Crimea (Hacı Giray, 1441); Theodoro holds the
  // Crimea's south-west from the 1350s.
  const KALM = "Kalmar Union";
  own("TVER", "Principality of Tver", { ruler: GHN, status: 5 });
  own("MOSC", "Principality of Moscow", { ruler: GHN, status: 5 }, [["1328-01-01", { name: "Grand Duchy of Moscow", wiki: "Grand Duchy of Moscow" }]]);
  own("SUZN", "Principality of Nizhny Novgorod-Suzdal", { ruler: GHN, status: 5 });
  own("YARO", "Principality of Yaroslavl", { ruler: GHN, status: 5 });
  own("PSKV", "Pskov Republic");
  own("KAZN", "Khanate of Kazan", { host: true });
  own("CRIM", "Crimean Khanate", { host: true });
  own("THEO", "Principality of Theodoro");
  for (const k of ["DAN", "NWY", "SWE"]) later(k, [["1397-06-17", { part: KALM }]]);
  later("CHER", [["1356-01-01", { name: "Upper Oka Principalities", wiki: "Upper Oka Principalities", ruler: "Grand Duchy of Lithuania" }]]);
  add("ISL/*", "+ 1262 NWY");
  add(G("FIN", "Uusimaa", "Satakunta", "Pirkanmaa"), "+ 1300 SWE");
  add(G("FIN", "Kymenlaakso", "South Karelia"), "+ 1293 SWE");
  add(G("FIN", "Southern Savonia", "Northern Savonia"), "+ 1323-08-12 SWE");
  add(G("SWE", "Skåne", "Blekinge"), "+ 1332 SWE; 1360 DAN");
  add(BY("Vitebsk", "Minsk"), "+ 1307 LITG");
  add(BY("Brest"), "+ 1320 LITG");
  add(UA("Volyn", "Rivne"), "+ 1340-04-07 LITG");
  add(UA("Chernihiv", "Sumy").concat(BY("Gomel"), RU("Bryansk")), "+ 1356 LITG");
  add(UA("Kyiv", "Zhytomyr", "Cherkasy", "Poltava").concat(RU("Kursk", "Oryol")), "+ 1362 LITG");
  add(UA("Vinnytsia"), "+ 1363 LITG");
  add(UA("Khmelnytskyi"), "+ 1363 LITG; 1434 POLK");
  add(PL("Podlaskie"), "+ 1283 LITG");
  add(RU("Smolensk").concat(BY("Mahilioŭ")), "+ 1404 LITG");
  add(UA("Odessa", "Mykolaiv", "Kirovohrad"), "+ 1415 LITG");
  add(RU("Tver"), "+ 1247 TVER");
  add(RU("Moscow"), "+ 1263 MOSC");
  add(RU("Vladimir", "Ivanovo"), "+ 1363 MOSC");
  add(RU("Nizhny Novgorod"), "+ 1341 SUZN; 1392 MOSC");
  add(RU("Yaroslavl"), "+ 1238 YARO");
  add(RU("Pskov"), "+ 1348 PSKV");
  add(RU("Chuvash Republic", "Mari El Republic"), "+ 1438 KAZN");
  add(RU("Autonomous Republic of Crimea"), "+ 1441 CRIM");
  add(RU("Sevastopol"), "+ 1357 THEO");
}
