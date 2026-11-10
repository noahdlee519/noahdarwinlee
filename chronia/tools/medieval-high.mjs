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
}
