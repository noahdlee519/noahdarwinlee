// Europe from 476 to 961, for the dated maps: the kingdoms that followed the Western Roman Empire, the Eastern Roman (Byzantine)
// Empire, the peoples who had no state, and the Caliphate's conquests in the West, from the deposition of Romulus Augustulus
// (4 September 476) to the eve of Otto I's coronation as emperor (2 February 962), when the sources take over again. It is
// drawn from UCHRONIA's units (Germany's districts, Poland's powiats, Ukraine's raions, and Natural Earth's first-level units
// elsewhere), since no open source maps these centuries year by year: today's units stand in for the pagi, counties, and
// districts of the time, so nearly every line is approximate (b 1, dotted on the page). The land covered (FRAME) is Europe to
// 50° E with Iceland, Anatolia west of 40° E, the North Caucasus, Cyprus, and North Africa west of Egypt north of 29° N;
// outside it the sources stay.
//
// O gives each owner its name and attributes from date to date, LAND each block of units its owner from date to date. A year is
// the state of things on 1 July, as elsewhere in the builder: a change known only by its year is dated 1 January, so the year
// shows it. The kinds of owner:
// - states, with a ruler and status 5 for a client or vassal (Hwicce under Mercia, the Visigoths under Theodoric the Great);
// - members of a larger realm (part), drawn in its colour with a fine line between them, as the Holy Roman Empire's members are:
//   the Frankish kingdoms of a partition, the subkingdoms of the Carolingian Empire, the great fiefs of West Francia, and the
//   stem duchies of the Kingdom of Germany;
// - peoples (people: 1), drawn uncoloured with an italic name, where no state is known, or none with a border: the Slavs before
//   their principalities, the Balts, the Finnic peoples, the Saxons before Charlemagne;
// - disputed land (status 6, with claims), drawn in stripes: land two powers fought over for years with neither holding it, such
//   as Italy in the Gothic War, the Duero valley between Asturias and Córdoba, and Cyprus under the Arab–Byzantine condominium;
// - "-": land no one is known to have held (Iceland before its settlement), drawn as paper.
// Owners marked host share their name with a state the sources draw outside the frame (the Eastern Roman Empire in Egypt and
// Syria, the Sasanian Empire, the Caliphates, Khazaria), so both parts are one state on the page.

import { high } from "./medieval-high.mjs";

export const MEDIEVAL_FROM = 476, MEDIEVAL_TO = 1444;
const START = "476-01-01";
// From 962 the table also covers Anatolia east of 40° E, the Levant, and the Caucasus (EXT), for the Seljuks, the Crusader
// states, Georgia, and Armenia; before 962 the sources keep that land.
export const EXT_FROM = 962;

// The land covered: these countries' units whose middle lies in the box (with Russia's to 50° E, and the Maghreb's north of 29° N).
const FRAME = new Set(("PRT ESP AND GIB FRA MCO BEL NLD LUX DEU CHE AUT LIE ITA SMR VAT MLT SVN HRV BIH SRB MNE KOS ALB MKD GRC BGR ROU MDA " +
  "UKR BLR POL CZE SVK HUN LTU LVA EST FIN ALA SWE NOR DNK FRO ISL IRL GBR IMN JEY GGY RUS TUR CYP CYN MAR DZA TUN LBY").split(" "));
// Turkey only west of 40° E: Armenia, Upper Mesopotamia, and the Caucasus keep the sources.
const FRAME_BOX = [-32, 29, 50, 72], FRAME_EAST = { TUR: 40 };
const EXT = new Set(["TUR", "SYR", "LBN", "ISR", "PSX", "JOR", "GEO", "ARM", "AZE"]);
const EXT_BOX = [34, 29, 50.5, 44];

// Owners: [[from, attributes], ...], each entry adding to or replacing what came before. b is 1 (an approximate border) unless
// given; people: 1 a people or culture with no state.
const O = {};
const own = (key, name, attrs = {}, later = []) => {
  if (O[key]) throw new Error("medieval: owner " + key + " twice");
  O[key] = [[START, { name, wiki: name, b: 1, ...attrs }], ...later.map(([d, a]) => [d, a])];
};
const people = (key, name, attrs = {}, later = []) => own(key, name, { people: 1, ...attrs }, later);
// Further entries for an owner made earlier, after its last.
const later = (key, entries) => {
  if (!O[key]) throw new Error("medieval: no owner " + key + " to extend");
  for (const [d, a] of entries) {
    const pad = (x) => x.padStart(10, "0");
    if (pad(d) <= pad(O[key][O[key].length - 1][0])) throw new Error("medieval: " + key + " extended out of order at " + d);
    O[key].push([d, a]);
  }
};

// Named polygons ([lon, lat] rings): "#name" in a selector takes the units whose middle lies inside one, "{name}" cuts a unit by one
// ("{!name}" keeps what lies outside it).
const R = {};
const poly = (name, ring) => { if (R[name]) throw new Error("medieval: polygon " + name + " twice"); R[name] = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring : ring.concat([ring[0]]); };

// Land rows: [selectors, timeline, options]. A timeline is written "476 KEN; 825 WES", each entry a year (1 January) or a day
// (YYYY-MM-DD) and an owner. Rows resolve in order, and a unit (or the part of one a cut names) a later row names leaves the rows
// before it, so a country's "*" can be refined. A timeline that begins with "+" ("+ 1035 ARAK") starts later and keeps the
// owners of the rows before it until its first entry, so a block can be parted without writing its history again. A timeline
// for land of the eastern frame alone begins in 962.
const LAND = [];
const add = (sel, tl) => LAND.push([[].concat(sel), tl]);
const G = (c, ...names) => names.map((n) => c + "/" + n);

// ——— Britain and Ireland ———
// The Anglo-Saxon kingdoms as the Anglo-Saxon Chronicle and Bede date them (Kent from Hengist, Sussex from Ælle in 477, Wessex
// from Cerdic in 519, Mercia from Creoda about 585, Northumbria from the union of Bernicia and Deira in 604), the British
// kingdoms of the west and north, the Picts and Dál Riata, and the Irish over-kingdoms. Before the kingdoms, the settlers are
// drawn as peoples (Angles, Saxons) and the land not yet in a known kingdom as the Britons'. The lines are those of today's
// counties, which follow many of the old shires.
const MERCIA = "Kingdom of Mercia", WESSEX = "Kingdom of Wessex", ANGLO = "Kingdom of the Anglo-Saxons", ENGLAND = "Kingdom of England";
const ARMY = "Great Heathen Army";
own("KEN", "Kingdom of Kent", {}, [["764-01-01", { ruler: MERCIA, status: 5 }], ["796-01-01", { ruler: "", status: 0 }], ["798-01-01", { ruler: MERCIA, status: 5 }]]);
own("SUS", "Kingdom of Sussex", {}, [["771-01-01", { ruler: MERCIA, status: 5 }]]);
own("ESX", "Kingdom of Essex", {}, [["709-01-01", { ruler: MERCIA, status: 5 }]]);
own("EAN", "Kingdom of East Anglia", {}, [["749-01-01", { ruler: MERCIA, status: 5 }], ["825-01-01", { ruler: "", status: 0 }]]);
own("DEA", "Danish East Anglia", { wiki: "Kingdom of East Anglia" });
own("WES", WESSEX, {}, [["886-01-01", { name: ANGLO, wiki: ANGLO }], ["927-07-12", { name: ENGLAND, wiki: ENGLAND }]]);
own("MER", MERCIA, {}, [["655-11-15", { ruler: "Kingdom of Northumbria", status: 5 }], ["658-01-01", { ruler: "", status: 0 }], ["829-01-01", { ruler: WESSEX, status: 5 }],
  ["830-01-01", { ruler: "", status: 0 }], ["874-01-01", { ruler: ARMY, status: 5 }], ["883-01-01", { ruler: WESSEX, status: 5 }], ["886-01-01", { ruler: ANGLO, status: 5 }]]);
own("HWI", "Hwicce", { ruler: MERCIA, status: 5 });
own("LIN", "Kingdom of Lindsey");
own("BER", "Bernicia");
own("DEI", "Deira");
own("NOR", "Kingdom of Northumbria");
own("JOR", "Kingdom of Jórvík", { wiki: "Scandinavian York" });
own("DAN5", "Five Boroughs of the Danelaw");
own("ARMY", ARMY);
own("ELM", "Elmet");
own("RHE", "Rheged");
own("GOD", "Gododdin");
own("STR", "Kingdom of Strathclyde");
own("DUM", "Dumnonia", {}, [["710-01-01", { name: "Kingdom of Cornwall", wiki: "Kingdom of Cornwall" }], ["838-01-01", { ruler: WESSEX, status: 5 }], ["886-01-01", { ruler: ANGLO }], ["927-07-12", { ruler: ENGLAND }]]);
own("GWY", "Kingdom of Gwynedd");
own("POW", "Kingdom of Powys");
own("DYF", "Kingdom of Dyfed");
own("SEI", "Ceredigion", { wiki: "Kingdom of Ceredigion" }, [["730-01-01", { name: "Seisyllwg", wiki: "Seisyllwg" }]]);
own("GLY", "Kingdom of Glywysing", {}, [["942-01-01", { name: "Kingdom of Morgannwg", wiki: "Kingdom of Morgannwg" }]]);
own("DEH", "Deheubarth");
own("GAL", "Gall-Gàidheil", { wiki: "Gall-Gàidheil" });
own("PIC", "Picts", { people: 1 }, [["555-01-01", { name: "Pictland", wiki: "Pictland", people: 0 }]]);
own("DAL", "Dál Riata");
own("ALB", "Kingdom of Alba");
own("ORK", "Earldom of Orkney", { ruler: "Kingdom of Norway", status: 5 });
own("ISL", "Kingdom of the Isles");
own("DUB", "Kingdom of Dublin");
own("NWAT", "Norse Waterford", { wiki: "History of Waterford" });
own("NLIM", "Norse Limerick", { wiki: "Kingdom of Limerick" });
own("ULA", "Ulaid");
own("AIR", "Airgíalla");
own("NUN", "Northern Uí Néill", { wiki: "Northern Uí Néill" });
own("SUN", "Southern Uí Néill", { wiki: "Southern Uí Néill" });
own("CON", "Connacht");
own("LEI", "Kingdom of Leinster");
own("OSR", "Osraige");
own("MUN", "Kingdom of Munster");
people("BRI", "Britons", { wiki: "Britons (Celtic people)" });
people("ANG", "Angles");
people("SAX", "Saxons");
people("JUT", "Jutes");
people("NOS", "Norse settlers", { wiki: "Settlement of Iceland" });
own("ICE", "Icelandic Commonwealth");
people("NFA", "Norse Faroe Islanders", { wiki: "History of the Faroe Islands" });

// Greater London's boroughs by their historic county.
const MIDDLESEX = G("GBR", "Westminster", "Kensington and Chelsea", "Hammersmith and Fulham", "London", "Camden", "Islington", "Hackney", "Tower Hamlets", "Haringey", "Enfield", "Barnet", "Brent", "Ealing", "Hounslow", "Hillingdon", "Harrow");
const LONDON_ESSEX = G("GBR", "Newham", "Waltham Forest", "Redbridge", "Havering", "Barking and Dagenham");
const LONDON_KENT = G("GBR", "Greenwich", "Lewisham", "Bromley", "Bexley");
const SURREY = G("GBR", "Surrey", "Lambeth", "Southwark", "Wandsworth", "Merton", "Sutton", "Croydon", "Kingston upon Thames", "Richmond upon Thames");
const KENT = G("GBR", "Kent", "Medway").concat(LONDON_KENT);
const SUSSEX = G("GBR", "East Sussex", "West Sussex", "Brighton and Hove");
const ESSEX = G("GBR", "Essex", "Southend-on-Sea", "Thurrock").concat(LONDON_ESSEX);
const HERTS = G("GBR", "Hertfordshire");
const EAST_ANGLIA = G("GBR", "Norfolk", "Suffolk");
const CAMBS = G("GBR", "Cambridgeshire", "Peterborough");
const BEDS_BUCKS = G("GBR", "Bedford", "Central Bedfordshire", "Luton", "Buckinghamshire", "Milton Keynes");
const OXON = G("GBR", "Oxfordshire");
const BERKS = G("GBR", "West Berkshire", "Reading", "Wokingham", "Bracknell Forest", "Windsor and Maidenhead", "Slough");
const HANTS = G("GBR", "Hampshire", "Southampton", "Portsmouth");
const WIGHT = G("GBR", "Isle of Wight");
const WILTS = G("GBR", "Wiltshire", "Swindon");
const DORSET = G("GBR", "Dorset", "Bournemouth", "Poole");
const SOMERSET_E = G("GBR", "Bath and North East Somerset", "North Somerset", "Bristol", "South Gloucestershire");
const SOMERSET = G("GBR", "Somerset");
const DEVON = G("GBR", "Devon", "Torbay", "Plymouth");
const CORNWALL = G("GBR", "Cornwall", "Isles of Scilly");
const HWICCE = G("GBR", "Gloucestershire", "Worcestershire");
const MERCIA_CORE = G("GBR", "Staffordshire", "Stoke-on-Trent", "Derbyshire", "Derby", "Nottinghamshire", "Nottingham", "Warwickshire", "Birmingham", "Solihull", "Coventry", "Sandwell", "Dudley", "Walsall", "Wolverhampton", "Telford and Wrekin");
const MIDDLE_ANGLES = G("GBR", "Leicestershire", "Leicester", "Rutland", "Northamptonshire");
const FIVE_BOROUGHS = G("GBR", "Derbyshire", "Derby", "Nottinghamshire", "Nottingham", "Leicestershire", "Leicester", "Rutland", "Lincolnshire", "North Lincolnshire", "North East Lincolnshire");
const LINDSEY = G("GBR", "Lincolnshire", "North Lincolnshire", "North East Lincolnshire");
const SHROPSHIRE = G("GBR", "Shropshire"), HEREFORD = G("GBR", "Herefordshire");
const CHESHIRE = G("GBR", "Cheshire West and Chester", "Cheshire East", "Warrington", "Halton", "Stockport", "Trafford", "Manchester", "Tameside");
const LANCS = G("GBR", "Lancashire", "Blackpool", "Blackburn with Darwen", "Merseyside", "Knowsley", "Liverpool", "Sefton", "Wigan", "Salford", "Bolton", "Bury", "Oldham", "Rochdale");
const ELMET = G("GBR", "Leeds", "Bradford", "Wakefield", "Calderdale", "Kirklees", "Barnsley");
const S_YORKS = G("GBR", "Doncaster", "Rotherham", "Sheffield");
const DEIRA = G("GBR", "East Riding of Yorkshire", "Kingston upon Hull", "York", "North Yorkshire", "Redcar and Cleveland", "Middlesbrough", "Stockton-on-Tees", "Darlington", "Hartlepool");
const BERNICIA = G("GBR", "Northumberland", "Durham", "North Tyneside", "South Tyneside", "Sunderland", "Gateshead", "Newcastle upon Tyne");
const CUMBRIA = G("GBR", "Cumbria"), GALLOWAY = G("GBR", "Dumfries and Galloway");
const LOTHIAN = G("GBR", "Edinburgh", "Midlothian", "East Lothian", "West Lothian", "Scottish Borders");
const MANAU = G("GBR", "Falkirk", "Clackmannanshire", "Stirling");
const ALT_CLUT = G("GBR", "Glasgow", "Renfrewshire", "East Renfrewshire", "Inverclyde", "West Dunbartonshire", "East Dunbartonshire", "North Lanarkshire", "South Lanarkshire", "North Ayrshire", "East Ayrshire", "South Ayrshire");
const PICTLAND = G("GBR", "Perth and Kinross", "Angus", "Dundee", "Fife", "Aberdeenshire", "Aberdeen", "Moray");
const GWYNEDD = G("GBR", "Anglesey", "Gwynedd", "Conwy"), POWYS = G("GBR", "Powys", "Denbighshire", "Wrexham", "Flintshire");
const DYFED = G("GBR", "Pembrokeshire", "Carmarthenshire"), CEREDIGION = G("GBR", "Ceredigion");
const GLYWYSING = G("GBR", "Swansea", "Neath Port Talbot", "Bridgend", "Vale of Glamorgan", "Cardiff", "Rhondda Cynon Taf", "Merthyr Tydfil", "Caerphilly", "Monmouthshire", "Newport", "Torfaen", "Blaenau Gwent");
const HIGHLAND = "GBR/Highland";

add(KENT, "476 KEN; 785 MER; 796 KEN; 825 WES");
add(SUSSEX, "476 SAX; 477 SUS; 686 WES; 688 SUS; 790 MER; 825 WES");
add(SURREY, "476 BRI; 520 SAX; 568 KEN; 672 MER; 825 WES");
add(ESSEX, "476 SAX; 527 ESX; 825 WES; 880 DEA; 917 WES");
add(MIDDLESEX, "476 BRI; 520 SAX; 527 ESX; 704 MER; 871 ARMY; 886 MER; 911 WES");
add(HERTS, "476 BRI; 520 SAX; 527 ESX; 704 MER; 880 DEA; 914 WES");
add(EAST_ANGLIA, "476 ANG; 520 EAN; 794 MER; 796 EAN; 798 MER; 825 EAN; 870 ARMY; 880 DEA; 917 WES");
add(CAMBS, "476 ANG; 585 MER; 870 ARMY; 880 DEA; 917 WES");
add(BEDS_BUCKS, "476 BRI; 571 WES; 661 MER; 880 DEA; 915 WES");
add(G("GBR", "Buckinghamshire"), "476 BRI; 571 WES; 661 MER; 886 MER; 918 WES");
add(OXON, "476 SAX; 519 WES; 661 MER; 685 WES; 779 MER; 886 MER; 911 WES");
add(BERKS, "476 SAX; 519 WES; 661 MER; 685 WES; 779 MER; 844 WES");
add(HANTS, "476 JUT; 495 SAX; 519 WES");
add(WIGHT, "476 JUT; 686 WES");
add(WILTS, "476 BRI; 552 WES");
add(DORSET, "476 BRI; 660 WES");
add(SOMERSET_E, "476 BRI; 577 WES; 628 HWI; 780 MER; 802 WES");
add(SOMERSET, "476 DUM; 658 WES");
add(G("GBR", "Devon", "Torbay"), "476 DUM; 710 WES");
add(G("GBR", "Plymouth"), "476 DUM; 722 WES");
add(CORNWALL, "476 DUM; 936 WES");
add(HWICCE, "476 BRI; 577 WES; 628 HWI; 780 MER; 919 WES");
add(MERCIA_CORE, "476 BRI; 520 ANG; 585 MER; 919 WES");
add(G("GBR", "Derbyshire", "Derby", "Nottinghamshire", "Nottingham"), "476 BRI; 520 ANG; 585 MER; 874 ARMY; 877 DAN5; 917 WES; 940 JOR; 942 WES");
add(MIDDLE_ANGLES, "476 ANG; 585 MER; 874 ARMY; 877 DAN5; 918 WES; 940 JOR; 942 WES");
add(G("GBR", "Northamptonshire"), "476 ANG; 585 MER; 874 ARMY; 880 DEA; 917 WES");
add(LINDSEY, "476 ANG; 550 LIN; 679 MER; 874 ARMY; 877 DAN5; 918 WES; 940 JOR; 942 WES");
add(SHROPSHIRE, "476 POW; 656 MER; 919 WES");
add(HEREFORD, "476 GLY; 656 MER; 919 WES");
add(CHESHIRE, "476 POW; 656 MER; 919 WES");
add(LANCS, "476 RHE; 640 NOR; 867 JOR; 919 WES; 940 JOR; 944 WES; 948 JOR; 954 WES");
add(ELMET, "476 ELM; 617 NOR; 867 JOR; 927 WES; 940 JOR; 944 WES; 948 JOR; 954 WES");
add(S_YORKS, "476 BRI; 559 DEI; 604 NOR; 867 JOR; 927 WES; 940 JOR; 944 WES; 948 JOR; 954 WES");
add(DEIRA, "476 ANG; 559 DEI; 604 NOR; 867 JOR; 927 WES; 940 JOR; 944 WES; 948 JOR; 954 WES");
add(BERNICIA, "476 BRI; 547 BER; 604 NOR; 954 WES");
add(CUMBRIA, "476 RHE; 640 NOR; 890 STR");
add(GALLOWAY, "476 RHE; 640 NOR; 850 GAL");
add(LOTHIAN, "476 GOD; 638 NOR; 954 ALB");
add(G("GBR", "Scottish Borders"), "476 GOD; 600 BER; 604 NOR");
add(MANAU, "476 GOD; 638 NOR; 685 PIC; 843 ALB");
add(ALT_CLUT, "476 STR");
add(PICTLAND, "476 PIC; 843 ALB");
add([HIGHLAND, "GBR/Orkney Islands", "GBR/Shetland Islands"], "476 PIC; 843 ALB");
add("GBR/Argyll and Bute", "476 PIC; 500 DAL; 843 ALB");
add("GBR/Outer Hebrides", "476 PIC; 850 ISL");
add(["GBR/Orkney Islands", "GBR/Shetland Islands"], "476 PIC; 875 ORK");
add(GWYNEDD, "476 GWY");
add(POWYS, "476 POW; 855 GWY; 942 DEH; 950 GWY");
add(CEREDIGION, "476 SEI; 872 GWY; 878 SEI; 920 DEH");
add(DYFED, "476 DYF; 920 DEH");
add(GLYWYSING, "476 GLY");
add("IMN/*", "476 BRI; 900 ISL");
// Ireland.
add(G("GBR", "Down", "Newry and Mourne", "Banbridge", "Ards", "North Down", "Castlereagh", "Belfast", "Lisburn", "Craigavon", "Antrim", "Newtownabbey", "Carrickfergus", "Larne", "Ballymena"), "476 ULA");
add(G("GBR", "Moyle", "Ballymoney"), "476 ULA; 500 DAL; 637 ULA");
add(G("GBR", "Armagh", "Dungannon and South Tyrone", "Fermanagh", "Mid Ulster").concat(G("IRL", "Monaghan")), "476 AIR");
add(G("GBR", "Derry", "Strabane", "Limavady", "Omagh", "Coleraine", "Magherafelt").concat(G("IRL", "Donegal")), "476 NUN");
add(G("IRL", "Meath", "Westmeath", "Longford", "Louth", "Fingal"), "476 SUN");
add(G("IRL", "Offaly"), "476 SUN");
add(G("IRL", "Galway", "Mayo", "Sligo", "Roscommon", "Leitrim", "Cavan").map((s) => s.replace("IRL/", "IRL:" + s.slice(4) + "/")), "476 CON");
add(G("IRL", "Kildare", "Wicklow", "Carlow", "Wexford", "Laois", "Dún Laoghaire–Rathdown", "South Dublin"), "476 LEI");
add(G("IRL", "Dublin"), "476 SUN; 841 DUB; 902 SUN; 917 DUB");
add(G("IRL", "Kilkenny"), "476 OSR");
add(["IRL:Cork/*", "IRL:Kerry/*", "IRL:Limerick/*", "IRL:Clare/*", "IRL:Tipperary/*", "IRL:Waterford/*"], "476 MUN");
poly("waterford-city", [[-7.25, 52.2], [-7.0, 52.2], [-7.0, 52.32], [-7.25, 52.32]]);
poly("limerick-city", [[-8.72, 52.62], [-8.5, 52.62], [-8.5, 52.72], [-8.72, 52.72]]);
add("IRL#waterford-city", "476 MUN; 914 NWAT");
add("IRL#limerick-city", "476 MUN; 922 NLIM");
add("ISL/*", "476 -; 874 NOS; 930 ICE");
add("FRO/*", "476 -; 825 NFA");

// ——— Gaul, the Low Countries, Germany, and the Alps ———
// The Frankish kingdom from Childeric and Clovis to the Carolingians, drawn as one realm with its kingdoms as members when it was
// parted among kings (561 to 613, Austrasia apart from 623 to 679; the subkingdoms of Charlemagne's sons from 781), and the
// duchies that owed it allegiance (Alemannia, Bavaria, Thuringia, Raetia) as its clients until they were made counties. Then the
// partitions: Verdun (843), Prüm (855), Meerssen (870), and Ribemont (880); the kingdoms of 888; West Francia's great fiefs and
// the Kingdom of Germany's stem duchies as their members. The dates of Clovis's wars are those of Gregory of Tours as usually
// read (Soissons 486, the Alemanni 496 and 506, Vouillé 507).
const FRANKS = "Kingdom of the Franks", CAROLINGIAN = "Carolingian Empire", WFRANCIA = "West Francia", EFRANCIA = "East Francia", GERMANY = "Kingdom of Germany";
const OSTRO = "Ostrogothic Kingdom", VISI = "Visigothic Kingdom", LOMBARDS = "Kingdom of the Lombards", ITALY = "Kingdom of Italy";
own("WRE", "Western Roman Empire");
own("SOI", "Domain of Soissons");
own("SALF", "Salian Franks");
own("RIPF", "Ripuarian Franks");
own("FRK", FRANKS, {}, [["800-12-25", { name: CAROLINGIAN, wiki: CAROLINGIAN }]]);
own("AUS", "Austrasia", { part: FRANKS });
own("NEU", "Neustria", { part: FRANKS });
own("BURF", "Frankish Burgundy", { wiki: "Kingdom of Burgundy", part: FRANKS });
own("AQK", "Kingdom of Aquitaine", { part: FRANKS }, [["800-12-25", { part: CAROLINGIAN }], ["843-08-10", { part: WFRANCIA }]]);
own("ITK", ITALY, { wiki: "Kingdom of Italy (Holy Roman Empire)", part: FRANKS }, [["800-12-25", { part: CAROLINGIAN }], ["843-08-10", { part: "" }], ["885-01-01", { name: CAROLINGIAN, wiki: CAROLINGIAN }],
  ["888-01-01", { name: ITALY, wiki: "Kingdom of Italy (Holy Roman Empire)" }], ["952-08-07", { ruler: GERMANY, status: 5 }]]);
own("BAVK", "Kingdom of Bavaria", { wiki: "Duchy of Bavaria", part: CAROLINGIAN });
own("ALE", "Alemanni", { wiki: "Alamanni" }, [["506-01-01", { ruler: OSTRO, status: 5 }], ["536-01-01", { name: "Duchy of Alemannia", wiki: "Alamannia", ruler: FRANKS, status: 5 }]]);
own("THU", "Kingdom of the Thuringii", { wiki: "Thuringii" }, [["632-01-01", { name: "Duchy of Thuringia", wiki: "Duchy of Thuringia", ruler: FRANKS, status: 5 }]]);
own("BUR", "Kingdom of the Burgundians");
own("BAV", "Duchy of Bavaria", { ruler: FRANKS, status: 5 }, [["911-01-01", { ruler: "", status: 0, part: EFRANCIA }], ["919-05-24", { part: GERMANY }]]);
own("RAE", "Raetia Curiensis", { ruler: OSTRO, status: 5 }, [["537-01-01", { ruler: FRANKS }]]);
own("AQD", "Duchy of Aquitaine", {}, [["888-01-01", { part: WFRANCIA }]]);
own("VAS", "Duchy of Vasconia", { ruler: FRANKS, status: 5 }, [["660-01-01", { ruler: "", status: 0 }], ["768-01-01", { ruler: FRANKS, status: 5 }], ["812-01-01", { name: "Duchy of Gascony", wiki: "Duchy of Gascony", ruler: "", status: 0 }], ["864-01-01", { part: WFRANCIA }]]);
own("BRE", "Breton kingdoms", { wiki: "Brittany" }, [["851-08-22", { name: "Kingdom of Brittany", wiki: "Kingdom of Brittany" }], ["939-01-01", { name: "Duchy of Brittany", wiki: "Duchy of Brittany", part: WFRANCIA }]]);
own("NBR", "Norse Brittany", { wiki: "Viking occupation of Brittany" });
own("FRI", "Frisians", { people: 1 }, [["600-01-01", { name: "Frisian Kingdom", wiki: "Frisian Kingdom", people: 0 }]]);
own("WFR", WFRANCIA, {}, [["885-01-01", { name: CAROLINGIAN, wiki: CAROLINGIAN }], ["888-01-01", { name: WFRANCIA, wiki: WFRANCIA }]]);
own("EFR", EFRANCIA, {}, [["885-01-01", { name: CAROLINGIAN, wiki: CAROLINGIAN }], ["888-01-01", { name: EFRANCIA, wiki: EFRANCIA }], ["919-05-24", { name: GERMANY, wiki: GERMANY }]]);
own("MFR", "Middle Francia", {}, [["855-09-22", { name: "Lotharingia", wiki: "Lotharingia" }]]);
own("KPR", "Kingdom of Provence", { wiki: "Kingdom of Provence" });
own("LBU", "Lower Burgundy", { wiki: "Kingdom of Provence" });
own("UBU", "Upper Burgundy", {}, [["933-01-01", { name: "Kingdom of Burgundy", wiki: "Kingdom of Arles" }], ["940-01-01", { ruler: GERMANY, status: 5 }]]);
own("FLA", "County of Flanders", { part: WFRANCIA });
own("NMD", "Duchy of Normandy", { part: WFRANCIA });
own("TOU", "County of Toulouse", { part: WFRANCIA });
own("BURD", "Duchy of Burgundy", { part: WFRANCIA });
own("RBT", "Duchy of the Franks", { wiki: "Duke of the Franks", part: WFRANCIA });
own("BCN", "County of Barcelona", { part: WFRANCIA });
own("PRB", "Pallars and Ribagorza", { wiki: "County of Pallars", part: WFRANCIA });
own("SAXD", "Duchy of Saxony", { part: EFRANCIA }, [["919-05-24", { part: GERMANY }]]);
own("FRAD", "Duchy of Franconia", { part: EFRANCIA }, [["919-05-24", { part: GERMANY }]]);
own("SWA", "Duchy of Swabia", { part: EFRANCIA }, [["919-05-24", { part: GERMANY }]]);
own("LOTD", "Duchy of Lotharingia", { part: GERMANY });
own("GERO", "Saxon Eastern March", { wiki: "Saxon Eastern March", part: GERMANY });
own("BILL", "Billung March", { part: GERMANY });
own("FRAX", "Fraxinetum");
people("OBO", "Obotrites");
people("VEL", "Veleti", {}, [["900-01-01", { name: "Lutici", wiki: "Lutici" }]]);
people("HEV", "Hevelli");
people("SORB", "Sorbs");
people("POM", "Pomeranians", { wiki: "Pomeranians (Slavic tribe)" });
own("PRO", "Provence", { ruler: FRANKS, status: 5 });
// Disputed: Saxony while Charlemagne fought the Saxons, and Aquitaine while Pippin fought Waifar.
own("SAXd", "Saxony", { wiki: "Saxon Wars", claims: [FRANKS, "Saxons"] });
own("AQUd", "Aquitaine", { wiki: "Duchy of Aquitaine", claims: [FRANKS, "Duchy of Aquitaine"] });
own("LOTd", "Lotharingia", { wiki: "Lotharingia", claims: [EFRANCIA, WFRANCIA] });
own("VARd", "Fraxinetum and Provence", { wiki: "Fraxinetum", claims: ["Fraxinetum", "Kingdom of Burgundy"] });

const F = (...names) => G("FRA", ...names);
const NORD = F("Nord", "Pas-de-Calais", "Somme"), SOISSONS = F("Aisne", "Oise");
const PARIS = F("Paris", "Hauts-de-Seine", "Seine-Saint-Denis", "Val-de-Marne", "Val-d'Oise", "Yvelines", "Essonne", "Seine-et-Marne");
const NORMANDY_E = F("Seine-Maritime", "Eure"), NORMANDY_W = F("Calvados", "Orne"), COTENTIN = F("Manche");
const MAINE_ANJOU = F("Sarthe", "Mayenne", "Maine-et-Loire"), TOURS_BLOIS = F("Indre-et-Loire", "Loir-et-Cher"), ORLEANS = F("Loiret", "Eure-et-Loir");
const CHAMPAGNE = F("Marne", "Aube", "Ardennes"), LANGRES = F("Haute-Marne");
const LORRAINE = F("Meuse", "Meurthe-et-Moselle", "Moselle", "Vosges"), ALSACE = F("Bas-Rhin", "Haut-Rhin", "Territoire de Belfort");
const BURGUNDY = F("Yonne", "Côte-d’Or", "Nièvre", "Saône-et-Loire"), COMTE = F("Doubs", "Jura", "Haute-Saône");
const LYONNAIS = F("Rhône", "Loire", "Ain"), SAVOY = F("Savoie", "Haute-Savoie"), VIENNOIS = F("Isère", "Drôme", "Hautes-Alpes"), VIVARAIS = F("Ardèche");
const PROVENCE = F("Bouches-du-Rhône", "Vaucluse", "Alpes-de-Haute-Provence", "Alpes-Maritimes"), VAR = F("Var");
const SEPTIMANIA = F("Pyrénées-Orientales", "Aude", "Hérault", "Gard");
const TOULOUSE = F("Haute-Garonne", "Tarn", "Tarn-et-Garonne", "Ariège"), ROUERGUE = F("Aveyron", "Lozère", "Lot");
const AUVERGNE = F("Puy-de-Dôme", "Cantal", "Haute-Loire", "Allier");
const AQUITAINE = F("Gironde", "Dordogne", "Lot-et-Garonne", "Charente", "Charente-Maritime", "Vienne", "Deux-Sèvres", "Vendée", "Haute-Vienne", "Corrèze", "Creuse");
const BERRY = F("Indre", "Cher"), GASCONY = F("Landes", "Gers", "Pyrenees-Atlantics", "Hautes-Pyrénées");
const BRITTANY = F("Finistère", "Côtes-d'Armor", "Morbihan"), RENNES_NANTES = F("Ille-et-Vilaine", "Loire-Atlantique");
const CORSICA = F("Haute-Corse", "Corse-du-Sud");
const B = (...n) => G("BEL", ...n), N = (...n) => G("NLD", ...n);
const FLANDERS = B("West Flanders", "East Flanders").concat(N("Zeeland")), BRABANT = B("Antwerp", "Flemish Brabant", "Walloon Brabant", "Brussels Capital", "Hainaut");
const MEUSE_BE = ["BEL:Limburg/*", "BEL:Liège/*", "BEL:Namur/*", "BEL:Luxembourg/*", "LUX/*"];
const HOLLAND = N("South Holland", "North Holland", "Utrecht", "Flevoland"), FRISIA_NL = N("Friesland", "Groningen");
const SAXON_NL = N("Drenthe", "Overijssel"), FRANK_NL = N("Gelderland", "North Brabant").concat(["NLD:Limburg/*"]);
const SWISS_BURGUNDY = G("CHE", "Geneva", "Vaud", "Valais", "Fribourg", "Neuchâtel", "Jura");
// German districts by polygon (their middles): the Saxons from the Rhine to the Elbe and Saale, with Holstein south of the Eider
// (Nordalbingia); the Frisians' coast; the Thuringians between the Werra and the Saale; the Alemanni from the Rhine to the Lech;
// the Bavarians from the Lech to the Enns, with the Nordgau and the Alps to Bolzano; the Slavs east of the Elbe and Saale.
poly("saxony", [[6.0, 51.75], [6.7, 51.5], [7.4, 51.42], [8.0, 51.25], [8.6, 51.25], [9.0, 51.42], [9.65, 51.38], [10.1, 51.45], [10.6, 51.55], [11.2, 51.3], [11.9, 51.25], [11.95, 51.5], [11.9, 51.95],
  [11.65, 52.15], [11.95, 52.55], [11.75, 53.0], [11.0, 53.2], [10.75, 53.4], [10.5, 53.7], [10.3, 54.0], [10.2, 54.35], [9.9, 54.3], [9.5, 54.32], [8.6, 54.3], [8.5, 53.9], [8.3, 53.6], [7.0, 53.6], [7.2, 53.2], [7.05, 52.6], [6.7, 52.2]]);
poly("nordalbingia", [[8.6, 54.3], [9.5, 54.32], [9.9, 54.3], [10.2, 54.35], [10.3, 54.0], [10.5, 53.7], [10.3, 53.45], [9.8, 53.5], [9.3, 53.6], [8.9, 53.85]]);
poly("frisia-de", [[6.9, 53.1], [7.6, 53.0], [8.2, 53.05], [8.55, 53.25], [8.6, 53.75], [6.9, 53.75]]);
poly("schleswig", [[8.0, 54.32], [9.5, 54.32], [9.9, 54.3], [10.2, 54.35], [10.3, 55.0], [8.0, 55.0]]);
poly("thuringia", [[9.9, 50.55], [10.0, 51.1], [10.25, 51.4], [10.6, 51.55], [11.2, 51.3], [11.9, 51.25], [11.8, 50.95], [11.55, 50.5], [11.3, 50.3], [10.6, 50.3], [10.0, 50.4]]);
poly("thuringia-old", [[9.9, 50.55], [10.0, 51.1], [10.25, 51.4], [10.6, 51.55], [10.9, 52.1], [11.65, 52.15], [11.9, 51.95], [12.6, 51.6], [12.9, 51.2], [12.5, 50.6], [11.55, 50.2], [10.7, 49.7], [9.8, 49.7], [9.5, 50.0]]);
poly("alemannia", [[7.5, 47.6], [7.6, 48.6], [8.1, 48.85], [8.7, 48.95], [9.3, 49.05], [10.0, 49.1], [10.3, 49.0], [10.6, 48.9], [10.85, 48.75], [10.95, 48.4], [10.85, 47.5], [10.0, 47.2], [9.6, 47.05],
  [9.4, 47.05], [8.9, 46.85], [8.3, 46.75], [7.8, 46.65], [7.45, 46.95], [7.25, 47.15], [7.0, 47.5]]);
poly("alemannia-north", [[7.6, 48.6], [7.9, 49.6], [8.2, 50.0], [8.9, 50.2], [9.6, 50.1], [10.2, 49.6], [10.3, 49.0], [10.0, 49.1], [9.3, 49.05], [8.7, 48.95], [8.1, 48.85]]);
poly("bavaria", [[10.85, 47.5], [10.95, 48.4], [10.8, 48.75], [11.0, 49.05], [11.3, 49.35], [12.0, 49.8], [12.5, 49.85], [13.0, 49.3], [13.8, 48.8], [14.0, 48.6], [14.5, 48.25], [14.5, 47.6], [13.9, 47.45],
  [13.4, 47.3], [12.9, 47.05], [12.2, 47.0], [12.0, 46.75], [11.8, 46.5], [11.3, 46.25], [10.9, 46.6], [10.45, 46.9], [10.45, 47.4]]);
poly("ostmark", [[14.5, 48.25], [14.0, 48.6], [14.9, 49.0], [16.0, 48.8], [16.95, 48.6], [16.95, 47.8], [16.2, 47.4], [15.5, 47.8], [14.5, 47.6]]);
poly("carantania", [[12.3, 47.0], [12.9, 47.05], [13.4, 47.3], [13.9, 47.45], [14.5, 47.6], [15.5, 47.8], [16.2, 47.4], [16.1, 46.9], [15.7, 46.4], [15.3, 45.8], [14.6, 45.6], [13.85, 45.65], [13.6, 46.2], [12.7, 46.6], [12.3, 46.75]]);
poly("polabia", [[10.75, 53.4], [11.0, 53.2], [11.75, 53.0], [11.95, 52.55], [11.65, 52.15], [11.9, 51.95], [11.95, 51.5], [11.9, 51.25], [11.8, 50.95], [11.55, 50.5], [12.3, 50.25], [13.5, 50.6], [14.8, 50.85],
  [15.0, 51.2], [14.8, 52.1], [14.4, 52.6], [14.2, 52.9], [14.4, 53.3], [14.3, 54.2], [13.0, 54.8], [11.0, 54.5], [10.2, 54.4], [10.3, 54.0], [10.5, 53.7]]);
poly("obotrites", [[10.2, 54.45], [10.3, 54.0], [10.5, 53.7], [10.75, 53.4], [11.0, 53.2], [11.6, 53.05], [12.2, 53.3], [12.4, 53.7], [12.2, 54.2], [11.0, 54.3]]);
poly("sorbs", [[11.9, 51.25], [11.95, 51.5], [12.05, 51.95], [12.6, 51.95], [13.5, 52.05], [14.8, 52.1], [15.0, 51.2], [14.8, 50.85], [13.5, 50.6], [12.3, 50.25], [11.55, 50.5], [11.8, 50.95]]);
poly("hevelli", [[11.6, 53.05], [12.2, 53.3], [13.4, 53.0], [13.6, 52.5], [13.5, 52.05], [12.6, 51.95], [12.05, 51.95], [11.9, 51.95], [11.65, 52.15], [11.95, 52.55]]);
poly("pomerania-de", [[12.2, 54.2], [12.4, 53.7], [13.4, 53.6], [14.5, 53.3], [14.4, 54.2], [13.0, 54.8]]);
// Austria's districts east of the Enns (the Avars' land, then the Pannonian march, then the Magyars').
const DEU = "DEU/*";

add(NORD, "476 SALF; 481 FRK; 561 NEU; 613 FRK; 623 NEU; 679 FRK; 843-08-10 WFR");
add(B("West Flanders", "East Flanders", "Hainaut").concat(N("Zeeland")), "476 SALF; 481 FRK; 561 NEU; 613 FRK; 623 NEU; 679 FRK; 843-08-10 WFR; 862 FLA");
add(B("Antwerp", "Flemish Brabant", "Walloon Brabant", "Brussels Capital"), "476 SALF; 481 FRK; 561 AUS; 613 FRK; 623 AUS; 679 FRK; 843-08-10 MFR; 870 EFR; 911 WFR; 925 LOTD");
add(MEUSE_BE, "476 RIPF; 509 FRK; 561 AUS; 613 FRK; 623 AUS; 679 FRK; 843-08-10 MFR; 870 EFR; 911 WFR; 925 LOTD");
add(SOISSONS.concat(PARIS, ORLEANS, NORMANDY_W, F("Marne", "Aube")), "476 SOI; 486 FRK; 561 NEU; 613 FRK; 623 NEU; 679 FRK; 843-08-10 WFR");
add(PARIS.concat(ORLEANS, MAINE_ANJOU), "476 SOI; 486 FRK; 561 NEU; 613 FRK; 623 NEU; 679 FRK; 843-08-10 WFR; 936 RBT");
add(F("Mayenne"), "476 SOI; 486 FRK; 561 NEU; 613 FRK; 623 NEU; 679 FRK; 843-08-10 WFR; 936 RBT");
add(NORMANDY_E, "476 SOI; 486 FRK; 561 NEU; 613 FRK; 623 NEU; 679 FRK; 843-08-10 WFR; 911 NMD");
add(NORMANDY_W, "476 SOI; 486 FRK; 561 NEU; 613 FRK; 623 NEU; 679 FRK; 843-08-10 WFR; 924 NMD");
add(COTENTIN, "476 SOI; 486 FRK; 561 NEU; 613 FRK; 623 NEU; 679 FRK; 843-08-10 WFR; 867 BRE; 933 NMD");
add(F("Ardennes"), "476 RIPF; 486 FRK; 561 AUS; 613 FRK; 623 AUS; 679 FRK; 843-08-10 WFR");
add(LORRAINE, "476 RIPF; 486 FRK; 561 AUS; 613 FRK; 623 AUS; 679 FRK; 843-08-10 MFR; 870 WFR; 880 EFR; 911 WFR; 925 LOTD");
poly("lotharingia-de", [[5.85, 51.85], [6.25, 51.85], [6.6, 51.65], [6.75, 51.25], [6.95, 50.95], [7.15, 50.7], [7.6, 50.35], [7.85, 50.0], [7.6, 49.7], [7.4, 49.3], [6.4, 49.1], [6.1, 49.45], [6.0, 50.2], [5.9, 50.75]]);
add(F("Moselle"), "476 RIPF; 486 FRK; 561 AUS; 613 FRK; 623 AUS; 679 FRK; 843-08-10 MFR; 870 EFR; 911 WFR; 925 LOTD");
add(ALSACE, "476 ALE; 496 FRK; 561 AUS; 613 FRK; 623 AUS; 679 FRK; 843-08-10 MFR; 870 EFR; 911 SWA");
add(LANGRES.concat(BURGUNDY, COMTE), "476 BUR; 534 FRK; 561 BURF; 613 FRK; 623 NEU; 679 FRK; 843-08-10 WFR; 890 BURD");
add(COMTE, "476 BUR; 534 FRK; 561 BURF; 613 FRK; 623 NEU; 679 FRK; 843-08-10 MFR; 870 WFR; 888 UBU");
add(SAVOY.concat(SWISS_BURGUNDY), "476 BUR; 534 FRK; 561 BURF; 613 FRK; 623 NEU; 679 FRK; 843-08-10 MFR; 870 EFR; 888 UBU");
add(LYONNAIS.concat(VIENNOIS), "476 BUR; 534 FRK; 561 BURF; 613 FRK; 623 NEU; 679 FRK; 843-08-10 MFR; 855 KPR; 863 MFR; 870 WFR; 879 LBU; 933 UBU");
add(PROVENCE, "476 WRE; 477 VIS; 508 OST; 537 FRK; 561 BURF; 613 FRK; 623 NEU; 679 FRK; 715 PRO; 737 FRK; 843-08-10 MFR; 855 KPR; 863 ITK; 875 WFR; 879 LBU; 933 UBU");
add(VAR, "476 WRE; 477 VIS; 508 OST; 537 FRK; 561 BURF; 613 FRK; 623 NEU; 679 FRK; 715 PRO; 737 FRK; 843-08-10 MFR; 855 KPR; 863 ITK; 875 WFR; 879 LBU; 890 VARd");
add(F("Ardèche"), "476 BUR; 534 FRK; 561 BURF; 613 FRK; 623 NEU; 679 FRK; 843-08-10 MFR; 855 KPR; 863 MFR; 870 WFR; 879 LBU; 933 UBU");
add(F("Pyrénées-Orientales", "Aude"), "476 VIS; 720 UMA; 750 ANDL; 759 FRK; 843-08-10 WFR; 849 TOU");
add(F("Hérault", "Gard"), "476 VIS; 720 UMA; 750 ANDL; 752 FRK; 843-08-10 WFR; 849 TOU");
add(TOULOUSE.concat(ROUERGUE), "476 VIS; 508 FRK; 561 AUS; 613 FRK; 670 AQD; 768 FRK; 781 AQK; 849 TOU");
add(AUVERGNE.concat(VIVARAIS), "476 VIS; 507 FRK; 561 AUS; 613 FRK; 670 AQD; 768 FRK; 781 AQK; 877 WFR; 888 AQD");
add(AQUITAINE.concat(BERRY), "476 VIS; 507 FRK; 561 NEU; 613 FRK; 670 AQD; 760 AQUd; 768 FRK; 781 AQK; 877 WFR; 888 AQD");
add(BERRY, "476 VIS; 507 FRK; 561 BURF; 613 FRK; 670 AQD; 760 AQUd; 768 FRK; 781 AQK; 877 WFR; 888 AQD");
add(TOURS_BLOIS, "476 VIS; 507 FRK; 561 AUS; 613 FRK; 623 NEU; 679 FRK; 843-08-10 WFR; 936 RBT");
add(GASCONY, "476 VIS; 507 FRK; 561 NEU; 602 VAS");
add(BRITTANY, "476 BRE");
add(RENNES_NANTES, "476 SOI; 486 FRK; 561 NEU; 613 FRK; 623 NEU; 679 FRK; 843-08-10 WFR; 851-08-22 BRE; 919 NBR; 937 BRE");
add(BRITTANY, "476 BRE; 919 NBR; 937 BRE");
add(CORSICA, "476 VAN; 534 BYZ; 725 LOMB; 774 FRK; 781 ITK");
add(["JEY/*", "GGY/*"], "476 SOI; 486 FRK; 561 NEU; 613 FRK; 623 NEU; 679 FRK; 843-08-10 WFR; 867 BRE; 933 NMD");
add("AND/*", "476 VIS; 720 UMA; 750 ANDL; 756 EMC; 790 FRK; 843-08-10 WFR; 878 BCN");
add("MCO/*", "476 VIS; 508 OST; 537 FRK; 561 BURF; 613 FRK; 623 NEU; 679 FRK; 715 PRO; 737 FRK; 843-08-10 MFR; 855 KPR; 863 ITK; 875 WFR; 879 LBU; 933 UBU");
// The Low Countries.
add(HOLLAND.concat(FRISIA_NL), "476 FRI; 690 FRK; 843-08-10 MFR; 870 EFR; 911 WFR; 925 LOTD");
add(N("North Holland", "Friesland", "Flevoland"), "476 FRI; 719 FRI; 734 FRK; 843-08-10 MFR; 870 EFR; 911 WFR; 925 LOTD");
add(N("Groningen"), "476 FRI; 785 FRK; 843-08-10 MFR; 870 EFR; 919-05-24 SAXD");
add(SAXON_NL, "476 SAX; 776 FRK; 843-08-10 MFR; 870 EFR; 911 WFR; 925 LOTD");
add(FRANK_NL, "476 SALF; 481 FRK; 561 AUS; 613 FRK; 623 AUS; 679 FRK; 843-08-10 MFR; 870 EFR; 911 WFR; 925 LOTD");
// Germany: the Franks' land first (the Rhineland and Hesse), then the rest.
add(DEU, "476 RIPF; 509 FRK; 561 AUS; 613 FRK; 623 AUS; 679 FRK; 843-08-10 EFR; 911 FRAD");
add("DEU#lotharingia-de", "476 RIPF; 509 FRK; 561 AUS; 613 FRK; 623 AUS; 679 FRK; 843-08-10 MFR; 870 EFR; 911 WFR; 925 LOTD");
add("DEU#alemannia-north", "476 ALE; 496 FRK; 561 AUS; 613 FRK; 623 AUS; 679 FRK; 843-08-10 EFR; 911 FRAD");
add("DEU#thuringia-old", "476 THU; 531 FRK; 561 AUS; 613 FRK; 623 AUS; 632 THU; 717 FRK; 843-08-10 EFR; 908 SAXD");
add("DEU#thuringia", "476 THU; 531 FRK; 561 AUS; 613 FRK; 623 AUS; 632 THU; 717 FRK; 843-08-10 EFR; 908 SAXD");
add("DEU#saxony", "476 SAX; 772 SAXd; 785 FRK; 793 SAXd; 799 FRK; 843-08-10 EFR; 880 SAXD");
add("DEU#nordalbingia", "476 SAX; 798 SAXd; 804 OBO; 811 FRK; 843-08-10 EFR; 880 SAXD");
add("DEU#frisia-de", "476 FRI; 785 FRK; 843-08-10 EFR; 880 SAXD");
add("DEU#schleswig", "476 ANG; 550 DAN");
add("DEU#alemannia", "476 ALE; 746 FRK; 843-08-10 EFR; 915 SWA");
add("DEU#bavaria", "476 ODO; 493 OST; 537 FRK; 555 BAV; 788 FRK; 817 BAVK; 843-08-10 EFR; 911 BAV");
add("DEU#polabia", "476 -; 570 VEL");
add("DEU#hevelli", "476 -; 570 HEV; 929 EFR; 937 GERO");
add("DEU#obotrites", "476 -; 570 OBO; 936 BILL");
add("DEU#pomerania-de", "476 -; 570 VEL");
add("DEU#sorbs", "476 THU; 531 -; 590 SORB; 929 EFR; 937 GERO");
// Austria and Switzerland.
add("AUT/*", "476 RUG; 489 LOMP; 568 AVR; 796 FRK; 817 BAVK; 843-08-10 EFR; 907 HUNG");
add("AUT#bavaria", "476 ODO; 493 OST; 537 FRK; 555 BAV; 788 FRK; 817 BAVK; 843-08-10 EFR; 911 BAV");
add("AUT#carantania", "476 ODO; 493 OST; 537 FRK; 568 AVR; 658 CAR; 828 FRK; 843-08-10 EFR; 911 BAV");
// Vorarlberg lies west of the Bavaria polygon: Bregenz and Dornbirn were Alemannic, Feldkirch and Bludenz in Raetia Curiensis.
add(["AUT:Vorarlberg/Bregenz", "AUT:Vorarlberg/Dornbirn"], "476 ALE; 746 FRK; 843-08-10 EFR; 915 SWA");
add(["AUT:Vorarlberg/Feldkirch", "AUT:Vorarlberg/Bludenz"], "476 ODO; 493 RAE; 806 FRK; 843-08-10 EFR; 915 SWA");
// The Mühlviertel, north of the Danube: Urfahr was Bavarian; the Riedmark (Perg, Freistadt), east of the Enns's mouth, was the Avars' and
// the Magyars' until Lechfeld.
add(["AUT:Upper Austria/Urfahr-Umgebung"], "476 ODO; 493 OST; 537 FRK; 555 BAV; 788 FRK; 817 BAVK; 843-08-10 EFR; 911 BAV");
add(["AUT:Upper Austria/Freistadt", "AUT:Upper Austria/Perg"], "476 RUG; 489 LOMP; 568 AVR; 796 FRK; 817 BAVK; 843-08-10 EFR; 907 HUNG; 955-08-10 BAV");
add("CHE/*", "476 ALE; 746 FRK; 843-08-10 EFR; 915 SWA");
add(SWISS_BURGUNDY.concat(G("CHE", "Bern", "Solothurn")), "476 BUR; 534 FRK; 561 BURF; 613 FRK; 623 NEU; 679 FRK; 843-08-10 MFR; 870 EFR; 888 UBU");
add(G("CHE", "Grisons").concat(G("LIE", "*")), "476 ODO; 493 RAE; 806 FRK; 843-08-10 EFR; 915 SWA");
// ——— Italy ———
// Odoacer's kingdom (476), Theodoric's conquest (489 to 493), the Ostrogothic kingdom, the Gothic War (535 to 554, disputed on
// the main map from Totila's recovery in 542 to Narses's victories; its months are on the zones of control), the Lombard
// conquest from 568 and the Byzantine lands that held out (Liguria to 643, the Exarchate to 751, Rome, Naples, Calabria, Otranto,
// the islands), the Papal States from Pippin's Donation (756), Charlemagne's conquest (774), and the Lombard south, Byzantine
// Apulia from 876, and the Arab conquest of Sicily (827 to 902).
own("ODO", "Kingdom of Odoacer", { wiki: "Odoacer" });
own("ODOd", "Italy", { wiki: "Theodoric the Great", claims: ["Kingdom of Odoacer", OSTRO] });
own("OST", OSTRO);
own("OSTd", "Italy", { wiki: "Gothic War (535–554)", claims: [OSTRO, "Eastern Roman Empire"] });
own("BYZ", "Eastern Roman Empire", { wiki: "Byzantine Empire", host: true }, [["633-01-01", { name: "Byzantine Empire" }]]);
own("LOMB", LOMBARDS);
people("LOMP", "Lombards");
own("SPO", "Duchy of Spoleto", { part: LOMBARDS });
own("BEN", "Duchy of Benevento", { part: LOMBARDS }, [["758-01-01", { part: "" }], ["774-01-01", { name: "Principality of Benevento", wiki: "Principality of Benevento" }]]);
own("SALP", "Principality of Salerno");
own("CAPU", "County of Capua", { wiki: "Principality of Capua" });
own("NAP", "Duchy of Naples", { ruler: "Byzantine Empire", status: 5 }, [["840-01-01", { ruler: "", status: 0 }]]);
own("GAE", "Duchy of Gaeta");
own("AMA", "Duchy of Amalfi");
own("PAP", "Papal States");
own("VEN", "Duchy of Venetia", { wiki: "Republic of Venice", ruler: "Byzantine Empire", status: 5 }, [["840-02-23", { name: "Republic of Venice", ruler: "", status: 0 }]]);
own("SIC", "Emirate of Sicily", { ruler: "Aghlabid dynasty", status: 5 }, [["909-03-25", { ruler: "Fatimid Caliphate" }]]);
own("SICd", "Sicily", { wiki: "Muslim conquest of Sicily", claims: ["Byzantine Empire", "Emirate of Sicily"] });
own("SARD", "Archontate of Sardinia", { wiki: "Judicates of Sardinia" });
own("BARI", "Emirate of Bari");
const I = (...n) => G("ITA", ...n);
const FRIULI = I("Udine", "Pordenone", "Gorizia"), VENETO = I("Treviso", "Vicenza", "Verona", "Belluno");
const LOMBARDY = I("Milan", "Bergamo", "Brescia", "Pavia", "Lodi", "Varese", "Como", "Lecco", "Monza and Brianza", "Sondrio");
const PIEDMONT = I("Turin", "Asti", "Novara", "Vercelli", "Alessandria", "Cuneo", "Biella", "Verbano-Cusio-Ossola");
const LIGURIA = I("Liguria", "Savona", "Imperia", "La Spezia");
const TUSCANY = I("Lucca", "Pisa", "Florence", "Siena", "Arezzo", "Pistoia", "Prato", "Livorno", "Massa-Carrara", "Grosseto");
const EMILIA_W = I("Piacenza", "Parma", "Reggio Emilia");
const SPOLETO = I("Terni", "Rieti", "Macerata", "Fermo", "Ascoli Piceno", "L'Aquila", "Teramo", "Pescara", "Chieti");
const BENEVENTO = I("Benevento", "Avellino", "Campobasso", "Isernia", "Potenza", "Foggia", "Barletta-Andria-Trani");
const CALABRIA = I("Crotone", "Catanzaro", "Vibo Valentia", "Reggio Calabria");
const ODOACER = "476 WRE; 477 ODO; 490 ODOd; 493 OST";
const GOTHIC_N = ODOACER + "; 540 BYZ; 542 OSTd; 553 BYZ";
const GOTHIC_S = ODOACER + "; 537 BYZ; 542 OSTd; 553 BYZ";
add(FRIULI.concat(VENETO), GOTHIC_N + "; 568 LOMB; 774 FRK; 781 ITK; 952 BAV");
add(I("Verona", "Vicenza", "Treviso", "Belluno"), GOTHIC_N + "; 569 LOMB; 774 FRK; 781 ITK; 952 BAV");
add(I("Padua", "Rovigo"), GOTHIC_N + "; 602 LOMB; 774 FRK; 781 ITK");
add(I("Venice"), GOTHIC_N + "; 697 VEN");
add(I("Trieste"), GOTHIC_N + "; 751 LOMB; 774 BYZ; 788 FRK; 843-08-10 ITK; 952 BAV");
add(LOMBARDY.concat(PIEDMONT, I("Trentino")), GOTHIC_N + "; 569 LOMB; 774 FRK; 781 ITK");
add(I("Pavia"), GOTHIC_N + "; 572 LOMB; 774 FRK; 781 ITK");
add(I("Cremona", "Mantua"), GOTHIC_N + "; 603 LOMB; 774 FRK; 781 ITK");
add(I("Como"), GOTHIC_N + "; 588 LOMB; 774 FRK; 781 ITK");
add(I("Aosta"), GOTHIC_N + "; 569 LOMB; 575 BURF; 613 FRK; 623 NEU; 679 FRK; 843-08-10 MFR; 855 ITK");
add(I("Trentino-South Tyrol"), GOTHIC_N + "; 569 LOMB; 600 BAV; 788 FRK; 817 BAVK; 843-08-10 EFR; 911 BAV");
add(LIGURIA, GOTHIC_N + "; 643 LOMB; 774 FRK; 781 ITK");
add(TUSCANY, GOTHIC_N + "; 572 LOMB; 774 FRK; 781 ITK");
add(I("Massa-Carrara"), GOTHIC_N + "; 643 LOMB; 774 FRK; 781 ITK");
add(EMILIA_W, GOTHIC_N + "; 572 LOMB; 774 FRK; 781 ITK");
add(I("Modena", "Bologna"), GOTHIC_N + "; 728 LOMB; 756 PAP; 774 FRK; 781 ITK");
add(I("Ferrara", "Ravenna", "Forlì-Cesena"), GOTHIC_N + "; 751 LOMB; 756 PAP");
add(I("Rimini", "Pesaro and Urbino", "Ancona").concat(["SMR/*"]), GOTHIC_S + "; 751 LOMB; 756 PAP");
add(I("Perugia"), GOTHIC_S + "; 756 PAP");
add(SPOLETO, GOTHIC_S + "; 576 SPO; 776 ITK");
add(I("Viterbo"), GOTHIC_S + "; 574 LOMB; 774 FRK; 781 PAP");
add(I("Rome", "Latina", "Frosinone").concat(["VAT/*"]), GOTHIC_S + "; 756 PAP");
add(I("Latina"), GOTHIC_S + "; 756 PAP; 839 GAE");
add(BENEVENTO, GOTHIC_S + "; 571 BEN");
add(I("Foggia", "Barletta-Andria-Trani"), GOTHIC_S + "; 650 BEN; 847 BARI; 871 BEN; 876 BYZ");
add(I("Caserta"), GOTHIC_S + "; 571 BEN; 849 CAPU; 900 BEN");
add(I("Salerno"), GOTHIC_S + "; 571 BEN; 849 SALP");
add(I("Naples"), GOTHIC_S + "; 554 NAP");
add(I("Bari"), GOTHIC_S + "; 670 BEN; 847 BARI; 871 BEN; 876 BYZ");
add(I("Taranto", "Brindisi"), GOTHIC_S + "; 685 BEN; 880 BYZ");
add(I("Matera"), GOTHIC_S + "; 670 BEN; 880 BYZ");
add(I("Lecce").concat(CALABRIA), GOTHIC_S + "; 554 BYZ");
add(I("Cosenza"), GOTHIC_S + "; 685 BEN; 885 BYZ");
add(I("Potenza"), GOTHIC_S + "; 571 BEN; 849 SALP");
// Sicily: Odoacer had it from the Vandals in 477 (but for Lilybaeum, the Vandals' to 491), Belisarius took it in December 535, and
// the Arabs from 827: Mazara and the west, Palermo (831), Messina (843), Enna (859), Syracuse (878), and Taormina (902).
add(I("Trapani"), "476 VAN; 491 OST; 536 BYZ; 828 SIC");
add(I("Agrigento"), "476 VAN; 477 ODO; 493 OST; 536 BYZ; 829 SIC");
add(I("Palermo"), "476 VAN; 477 ODO; 493 OST; 536 BYZ; 831-09-01 SIC");
add(I("Caltanissetta"), "476 VAN; 477 ODO; 493 OST; 536 BYZ; 845 SIC");
add(I("Enna"), "476 VAN; 477 ODO; 493 OST; 536 BYZ; 859 SIC");
add(I("Ragusa"), "476 VAN; 477 ODO; 493 OST; 536 BYZ; 868 SIC");
add(I("Syracuse", "Catania"), "476 VAN; 477 ODO; 493 OST; 536 BYZ; 878-05-21 SIC");
add(I("Messina"), "476 VAN; 477 ODO; 493 OST; 536 BYZ; 843 SICd; 902-08-01 SIC");
add(I("Sassari", "Nuoro", "Olbia-Tempio", "Oristano", "Medio Campidano", "Cagliari", "Carbonia-Iglesias", "Ogliastra"), "476 VAN; 534 BYZ; 900 SARD");
add("MLT/*", "476 VAN; 477 ODO; 493 OST; 535 BYZ; 870 SIC");
add(G("CHE", "Ticino"),"476 ODO; 493 OST; 537 OSTd; 553 BYZ; 569 LOMB; 774 FRK; 781 ITK");

// ——— Iberia ———
// The Visigoths and the Suebi (to 585), Byzantine Spania (552 to 624), the Umayyad conquest (711 to 720, by the years of the
// chroniclers: Toledo late in 711, Mérida in June 713, Zaragoza in 714, Narbonne in 720), Asturias from Pelagius, the Emirate
// (756) and Caliphate (929) of Córdoba, the Frankish counties of the Spanish March, Pamplona (824), and the Duero valley, which
// Asturias and Córdoba both claimed and neither settled from Alfonso I's raids to the repopulations (disputed until each part
// was resettled: León 856, Burgos 884, Zamora 893, Simancas 899, Salamanca 941). The rebels of the fitna, Ibn Hafsun at
// Bobastro, Ibn Marwan at Badajoz, and the Banu Qasi of the Ebro, hold their land until Abd al-Rahman III subdued them.
const CORDOBA = "Emirate of Córdoba";
own("SUE", "Kingdom of the Suebi");
own("VIS", VISI, {}, [["511-01-01", { ruler: OSTRO, status: 5 }], ["526-01-01", { ruler: "", status: 0 }]]);
people("BASQ", "Basques", { wiki: "Vascones" });
people("CANT", "Cantabri", { wiki: "Duchy of Cantabria" });
own("UMA", "Umayyad Caliphate", { host: true });
own("ANDL", "Al-Andalus", { wiki: "Yusuf ibn Abd al-Rahman al-Fihri" });
own("EMC", CORDOBA, {}, [["929-01-16", { name: "Caliphate of Córdoba", wiki: "Caliphate of Córdoba" }]]);
own("TUD", "Tudmir", { wiki: "Theodemir (Visigoth)", ruler: "Umayyad Caliphate", status: 5 }, [["756-01-01", { ruler: CORDOBA }]]);
own("AST", "Kingdom of Asturias", {}, [["910-12-20", { name: "Kingdom of León", wiki: "Kingdom of León" }]]);
own("CAS", "County of Castile", { ruler: "Kingdom of León", status: 5 });
own("PAM", "Kingdom of Pamplona");
own("ARA", "County of Aragon", { ruler: FRANKS, status: 5 }, [["843-01-01", { ruler: "", status: 0 }], ["922-01-01", { ruler: "Kingdom of Pamplona", status: 5 }]]);
own("BQ", "Banu Qasi");
own("HAF", "Bobastro", { wiki: "Umar ibn Hafsun" });
own("BMW", "Banu Marwan", { wiki: "Ibn Marwan" });
// The Pyrenean counties (Aragon, Pallars, Ribagorza, Urgell) are smaller than the provinces of Huesca and Lleida, whose plains
// stayed in the Upper March of al-Andalus, so the two provinces are drawn as contested marches from the counties' beginnings.
own("HUEd", "Huesca", { wiki: "County of Aragon", claims: ["County of Aragon", CORDOBA] }, [["929-01-16", { claims: ["County of Aragon", "Caliphate of Córdoba"] }]]);
own("LLEd", "Lleida", { wiki: "County of Urgell", claims: [FRANKS, CORDOBA] }, [["800-12-25", { claims: [CAROLINGIAN, CORDOBA] }], ["843-08-10", { claims: [WFRANCIA, CORDOBA] }], ["929-01-16", { claims: [WFRANCIA, "Caliphate of Córdoba"] }]]);
own("DUE", "Duero valley", { wiki: "Desert of the Duero", claims: ["Kingdom of Asturias", CORDOBA] });
const E = (...n) => G("ESP", ...n), P = (...n) => G("PRT", ...n);
// Before 711.
const GOTHS = "476 VIS";
add(E("A Coruña", "Lugo", "Ourense", "Pontevedra").concat(P("Viana do Castelo", "Braga", "Porto", "Vila Real", "Bragança", "Aveiro", "Viseu", "Coimbra", "Guarda")),
  "476 SUE; 585 VIS; 714 UMA; 740 AST");
add(P("Viana do Castelo", "Braga", "Porto", "Vila Real", "Bragança"), "476 SUE; 585 VIS; 714 UMA; 740 DUE; 868 AST");
add(P("Aveiro", "Viseu", "Coimbra", "Guarda"), "476 SUE; 585 VIS; 714 UMA; 740 DUE; 878 AST");
add(P("Castelo Branco", "Leiria", "Santarém", "Lisbon", "Setúbal", "Portalegre", "Évora", "Beja", "Faro"), "476 VIS; 713 UMA; 750 ANDL; 756 EMC");
add(P("Portalegre", "Évora", "Beja", "Faro"), "476 VIS; 713 UMA; 750 ANDL; 756 EMC");
add(E("Asturias"), "476 SUE; 585 VIS; 714 UMA; 718 AST");
add(E("Cantabria"), "476 CANT; 574 VIS; 714 CANT; 739 AST");
add(E("León"), "476 SUE; 585 VIS; 714 UMA; 740 DUE; 856 AST");
add(E("Palencia", "Burgos"), "476 VIS; 714 UMA; 740 DUE; 860 AST; 931 CAS");
add(E("Zamora"), "476 VIS; 714 UMA; 740 DUE; 893 AST");
add(E("Valladolid"), "476 VIS; 714 UMA; 740 DUE; 899 AST");
add(E("Salamanca"), "476 VIS; 714 UMA; 740 DUE; 941 AST");
add(E("Ávila", "Segovia"), "476 VIS; 714 UMA; 740 DUE");
add(E("Segovia"), "476 VIS; 714 UMA; 740 DUE; 940 CAS");
add(E("Soria"), "476 VIS; 714 UMA; 750 ANDL; 756 EMC");
add(E("Araba / Álava", "Biscay"), "476 BASQ; 714 BASQ; 790 AST; 931 CAS");
add(E("Gipuzkoa"), "476 BASQ; 905 PAM");
add(E("Navarre"), "476 BASQ; 718 UMA; 750 BASQ; 778 FRK; 799 BASQ; 824 PAM");
add(E("La Rioja"), "476 VIS; 714 UMA; 750 ANDL; 756 EMC; 852 BQ; 923 PAM");
add(E("Zaragoza", "Teruel"), "476 VIS; 714 UMA; 750 ANDL; 756 EMC");
add(E("Zaragoza"), "476 VIS; 714 UMA; 750 ANDL; 756 EMC; 872 BQ; 890 EMC");
add(E("Huesca", "Lleida", "Tarragona"), "476 VIS; 714 UMA; 750 ANDL; 756 EMC");
add(E("Huesca"), "476 VIS; 714 UMA; 750 ANDL; 756 EMC; 809 HUEd");
add(E("Lleida"), "476 VIS; 714 UMA; 750 ANDL; 756 EMC; 790 LLEd");
add(E("Girona"), "476 VIS; 718 UMA; 750 ANDL; 756 EMC; 785 FRK; 843-08-10 WFR; 878 BCN");
add(E("Barcelona"), "476 VIS; 718 UMA; 750 ANDL; 756 EMC; 801-04-03 FRK; 843-08-10 WFR; 878 BCN");
add(E("Castellón", "Valencia"), "476 VIS; 714 UMA; 750 ANDL; 756 EMC");
add(E("Alicante", "Murcia"), "476 VIS; 552 BYZ; 624 VIS; 713 TUD; 779 EMC");
add(E("Almería"), "476 VIS; 552 BYZ; 620 VIS; 712 UMA; 750 ANDL; 756 EMC");
add(E("Granada", "Málaga"), "476 VIS; 552 BYZ; 615 VIS; 712 UMA; 750 ANDL; 756 EMC");
add(E("Málaga"), "476 VIS; 552 BYZ; 615 VIS; 712 UMA; 750 ANDL; 756 EMC; 880 HAF; 928 EMC");
add(E("Cádiz"), "476 VIS; 552 BYZ; 571 VIS; 712 UMA; 750 ANDL; 756 EMC");
add(E("Seville", "Huelva", "Córdoba", "Jaén"), "476 VIS; 712 UMA; 750 ANDL; 756 EMC");
add(E("Badajoz", "Cáceres"), "476 VIS; 713 UMA; 750 ANDL; 756 EMC");
add(E("Badajoz"), "476 VIS; 713 UMA; 750 ANDL; 756 EMC; 884 BMW; 930 EMC");
add(E("Toledo", "Community of Madrid", "Guadalajara", "Cuenca", "Ciudad Real", "Albacete"), "476 VIS; 712 UMA; 750 ANDL; 756 EMC");
add(E("Balearic Islands"), "476 VAN; 534 BYZ; 903 EMC");
add(["ESP/Ceuta"], "476 VAN; 534 BYZ; 711 UMA; 740 BERR; 788 IDR; 931 EMC");
add(["ESP/Melilla"], "476 BERP; 708 UMA; 740 BERR; 760 NEK; 927 EMC");
add("GIB/*", "476 VIS; 711 UMA; 750 ANDL; 756 EMC");

// ——— North Africa west of Egypt ———
// The Vandal kingdom (to Belisarius's conquest of 533 and 534), the Moorish kingdoms that rose against it, Byzantine Africa (to
// the fall of Carthage in 698), the Arab conquest (Kairouan founded in 670, Kusaila's revolt from 683 to 688, al-Kahina in the
// Aurès to 703, Musa ibn Nusayr's conquest of the west from 705 to 709), the Berber Revolt (740), and the states that followed:
// the Barghawata, Nekor, the Idrisids, the Midrarids, the Rustamids, the Aghlabids (800), and the Fatimids (909). The Sahara's
// edge, with no state, is the Berbers'.
own("VAN", "Vandal Kingdom");
own("MRK", "Mauro-Roman Kingdom", {}, [["578-01-01", { name: "Kingdom of Altava", wiki: "Kingdom of Altava" }]]);
own("AUR", "Kingdom of the Aurès");
own("HOD", "Kingdom of the Hodna");
own("OUA", "Kingdom of Ouarsenis");
own("CAPS", "Kingdom of Capsus");
own("DOR", "Kingdom of the Dorsale");
people("BERP", "Berbers");
people("LAG", "Laguatan");
own("KUS", "Kusaila", { wiki: "Kusaila" });
own("DIH", "Kahina", { wiki: "Dihya" });
own("RAS", "Rashidun Caliphate", { host: true });
own("ABB", "Abbasid Caliphate", { host: true });
own("TUL", "Tulunids", { host: true });
own("FIH", "Fihrids", { wiki: "Abd al-Rahman ibn Habib al-Fihri" });
own("WARF", "Warfajuma", { wiki: "Warfajuma" });
own("IBA", "Ibadi Imamate", { wiki: "Abu al-Khattab al-Ma'afiri" });
own("AGH", "Aghlabid dynasty", { ruler: "Abbasid Caliphate", status: 5 });
own("FAT", "Fatimid Caliphate", { host: true });
own("KUT", "Kutama", { wiki: "Kutama" });
people("BERR", "Kharijite Berbers", { wiki: "Berber Revolt" });
own("BARG", "Barghawata");
own("NEK", "Emirate of Nekor");
own("IDR", "Idrisids", { wiki: "Idrisid dynasty", host: true });
own("MID", "Midrarid dynasty", {}, [["909-01-01", { ruler: "Fatimid Caliphate", status: 5 }]]);
own("RUS", "Rustamid dynasty");
own("IFR", "Banu Ifran", { wiki: "Banu Ifran" });
people("ZEN", "Zenata");
own("FEZd", "Fez", { wiki: "Fez, Morocco", claims: ["Fatimid Caliphate", "Caliphate of Córdoba"] });
const Z = (...n) => G("DZA", ...n), T = (...n) => G("TUN", ...n), L = (...n) => G("LBY", ...n), M = (...n) => G("MAR", ...n);
add(["DZA/*", "LBY/*", "MAR/*", "TUN/*"], "476 BERP");
add(T("Tunis", "Ben Arous", "Manouba", "Bizerte", "Nabeul", "Zaghouan", "Beja", "Jendouba", "Kef", "Siliana"), "476 VAN; 533 BYZ; 698 UMA; 745 FIH; 757 WARF; 758 IBA; 761 ABB; 800-07-09 AGH; 909-03-25 FAT");
add(T("Sousse", "Monastir", "Mahdia", "Sfax", "Kairouan"), "476 VAN; 533 BYZ; 670 UMA; 683 KUS; 688 UMA; 745 FIH; 757 WARF; 758 IBA; 761 ABB; 800-07-09 AGH; 909-03-25 FAT");
add(T("Kasserine", "Sidi Bouzid"), "476 VAN; 500 DOR; 548 BYZ; 670 UMA; 683 KUS; 688 UMA; 745 FIH; 757 WARF; 758 IBA; 761 ABB; 800-07-09 AGH; 909-03-25 FAT");
add(T("Gafsa", "Tozeur", "Kebili", "Gabès"), "476 VAN; 500 CAPS; 540 BYZ; 670 UMA; 683 KUS; 688 UMA; 745 FIH; 757 WARF; 758 IBA; 761 ABB; 800-07-09 AGH; 909-03-25 FAT");
add(T("Medenine", "Tataouine"), "476 LAG; 643 RAS; 661 UMA; 745 FIH; 758 IBA; 761 BERP");
add(Z("El Tarf", "Annaba", "Skikda", "Guelma", "Souk Ahras", "Constantine", "Tébessa"), "476 VAN; 534 BYZ; 698 UMA; 745 FIH; 761 ABB; 800-07-09 AGH; 909-03-25 FAT");
add(Z("Mila", "Jijel", "Sétif"), "476 VAN; 484 BERP; 534 BYZ; 698 UMA; 745 FIH; 761 ABB; 800-07-09 AGH; 902 KUT; 909-03-25 FAT");
add(Z("Batna", "Khenchela", "Oum El Bouaghi", "Biskra"), "476 BERP; 484 AUR; 539 BYZ; 578 AUR; 683 KUS; 688 DIH; 703 UMA; 745 FIH; 761 ABB; 800-07-09 AGH; 909-03-25 FAT");
add(Z("M'Sila", "Bordj Bou Arréridj"), "476 BERP; 500 HOD; 540 BYZ; 578 HOD; 700 UMA; 745 FIH; 761 ABB; 800-07-09 AGH; 909-03-25 FAT");
add(Z("Béjaïa", "Tizi Ouzou", "Bouïra", "Boumerdès"), "476 BERP; 705 UMA; 740 BERR; 745 BERP; 909-03-25 FAT");
add(Z("Algiers", "Blida", "Tipasa", "Médéa"), "476 MRK; 534 BYZ; 578 MRK; 705 UMA; 740 BERR; 745 BERP; 909-03-25 FAT");
add(Z("Chlef", "Aïn Defla", "Tissemsilt", "Tiaret"), "476 MRK; 500 OUA; 705 UMA; 740 BERR; 777 RUS; 909-03-25 FAT");
add(Z("Relizane", "Mascara", "Mostaganem", "Saïda"), "476 MRK; 705 UMA; 740 BERR; 777 RUS; 909-03-25 FAT");
add(Z("Tlemcen", "Aïn Témouchent", "Oran", "Sidi Bel Abbès", "Naama").concat(M("Oriental")), "476 MRK; 708 UMA; 740 BERR; 765 IFR; 790 IDR; 931 ZEN");
add(M("Tangier-Tetouan", "Gharb-Chrarda-Béni Hssen"), "476 BERP; 708 UMA; 740 BERR; 788 IDR; 951 EMC");
add(M("Fès-méknas-boulmane"), "476 BERP; 708 UMA; 740 BERR; 788 IDR; 921 FEZd");
add(M("Taza-Al Hoceïma-Taounate"), "476 BERP; 710 NEK");
add(M("Rabat-Salé-Zemmour-Zaër", "Grand Casablanca", "Chaouia-Ouardigha", "Doukkala Abda"), "476 BERP; 708 UMA; 740 BERR; 744 BARG");
add(M("Meknès-Tafilalet"), "476 BERP; 708 UMA; 740 BERR; 757 MID");
add(L("Tripoli District", "Jafara", "Zawiya", "Nuqat al Khams", "Murqub", "Misrata"), "476 VAN; 523 LAG; 533 BYZ; 643 RAS; 661 UMA; 750 ABB; 758 IBA; 761 ABB; 800-07-09 AGH; 909-03-25 FAT");
add(L("Benghazi", "Marj", "Jabal al Akhdar", "Al Qubbah", "Butnan"), "476 BYZ; 643 RAS; 661 UMA; 750 ABB; 879 TUL; 905 ABB; 913 FAT");

// ——— The Balkans and the Danube ———
// The Eastern Roman Empire south of the Danube until the Slavs settled the interior from the 580s (drawn as Sclaviniae, the
// Byzantines' name for their land, until a state took it), keeping Thrace, Thessalonica, Athens, and the coasts; the Gepids
// and the Lombards on the middle Danube; the Avar Khaganate (568 to its fall to Charlemagne in 795 and 796); the First
// Bulgarian Empire from Asparukh's settlement (681) through Krum's conquests (805 to 813) and Presian's in Macedonia; the Serb
// and Croat principalities; Great Moravia (833 to 906); and the Magyar conquest (895 to 900).
const BULGARIA = "First Bulgarian Empire";
own("GEP", "Kingdom of the Gepids");
own("HER", "Kingdom of the Heruli", { wiki: "Heruli" });
own("RUG", "Rugiland");
people("SCL", "Sclaveni");
people("ANT", "Antes", { wiki: "Antes people" });
people("SLV", "Slavs", { wiki: "Early Slavs" });
people("SKL", "Sclaviniae");
own("AVR", "Avar Khaganate");
own("FBE", BULGARIA);
own("SRB", "Serbs", { people: 1, wiki: "White Serbia" }, [["780-01-01", { name: "Principality of Serbia", wiki: "Principality of Serbia (early medieval)", people: 0 }], ["924-01-01", { ruler: BULGARIA, status: 5 }], ["933-01-01", { ruler: "", status: 0 }]]);
own("CRO", "Croats", { people: 1, wiki: "White Croatia" }, [["800-01-01", { name: "Duchy of Croatia", wiki: "Duchy of Croatia", people: 0, ruler: FRANKS, status: 5 }], ["879-01-01", { ruler: "", status: 0 }], ["925-01-01", { name: "Kingdom of Croatia", wiki: "Kingdom of Croatia (925–1102)" }]]);
own("PCRO", "Lower Pannonia", { wiki: "Duchy of Pannonian Croatia", ruler: FRANKS, status: 5 }, [["843-08-10", { ruler: EFRANCIA }]]);
own("PCROd", "Lower Pannonia", { wiki: "Ljudevit Posavski", claims: [FRANKS, "Lower Pannonia"] });
own("BAL", "Balaton Principality", { ruler: EFRANCIA, status: 5 });
own("ZAC", "Zachlumia");
own("TRA", "Travunia");
own("PAG", "Pagania");
own("DOC", "Duklja", { ruler: "Byzantine Empire", status: 5 });
own("SAMO", "Samo's Empire");
people("MORP", "Moravians", { wiki: "Moravians (Slavic tribe)" });
own("NIT", "Principality of Nitra");
own("GMO", "Great Moravia");
people("CZP", "Czechs", { wiki: "Czech (Slavic tribe)" });
own("BOH", "Duchy of Bohemia", {}, [["883-01-01", { ruler: "Great Moravia", status: 5 }], ["895-01-01", { ruler: "", status: 0 }], ["950-01-01", { ruler: GERMANY, status: 5 }]]);
own("HUNG", "Magyars", { people: 1, wiki: "Hungarian prehistory" }, [["895-01-01", { name: "Principality of Hungary", wiki: "Principality of Hungary", people: 0 }]]);
people("PEC", "Pechenegs");
own("CAR", "Carantania", {}, [["743-01-01", { ruler: "Duchy of Bavaria", status: 5 }], ["788-01-01", { ruler: FRANKS }]]);
own("ECR", "Emirate of Crete");
const SR = (...n) => G("SRB", ...n), BG = (...n) => n.map((x) => "BGR:" + x + "/*"), HR = (...n) => G("HRV", ...n), RO = (...n) => G("ROU", ...n), GR = (...n) => G("GRC", ...n);
poly("transdanubia", [[16.0, 48.1], [17.1, 48.0], [18.6, 47.8], [19.05, 47.6], [18.95, 47.0], [18.85, 46.0], [17.3, 45.8], [16.2, 46.4], [16.0, 47.0]]);
poly("svn-friuli", [[13.3, 45.4], [13.95, 45.45], [14.0, 46.0], [13.9, 46.5], [13.3, 46.5]]);
poly("svn-pannonia", [[15.6, 46.2], [15.6, 46.8], [16.7, 46.9], [16.7, 46.2]]);
// Greater Pannonia: Hungary, the Austrian east, and Slavonia.
add("HUN/*", "476 GEP; 567 AVR; 805 FBE; 895 HUNG");
add("HUN#transdanubia", "476 -; 493 OST; 526 LOMP; 568 AVR; 796 FRK; 840 BAL; 876 EFR; 884 GMO; 894 EFR; 900 HUNG");
add(["SVK:Bratislava/*", "SVK:Trnava/*", "SVK:Nitra/*", "SVK:Banská Bystrica/*"], "476 -; 494 HER; 508 LOMP; 568 AVR; 623 SAMO; 658 SLV; 800 NIT; 833 GMO; 907 HUNG");
add(["SVK:Trenčín/*", "SVK:Žilina/*", "SVK:Prešov/*", "SVK:Košice/*"], "476 -; 508 SLV; 623 SAMO; 658 SLV; 833 GMO; 907 SLV");
add(["CZE:South Moravian/*", "CZE:Zlín/*", "CZE:Olomouc/*", "CZE:Moravian-Silesian/*", "CZE:Vysočina/*"], "476 -; 494 HER; 508 LOMP; 550 SLV; 623 SAMO; 658 MORP; 833 GMO; 907 MORP; 955 BOH");
add(["CZE:Prague/*", "CZE:Central Bohemian/*", "CZE:Ústí nad Labem/*", "CZE:Liberec/*", "CZE:Karlovy Vary/*", "CZE:Plzeň-/*", "CZE:South Bohemian/*", "CZE:Hradec Králové/*", "CZE:Pardubice/*"],
  "476 -; 535 SLV; 623 SAMO; 658 CZP; 890 BOH");
add(["CZE:Prague/*", "CZE:Central Bohemian/*"], "476 -; 535 SLV; 623 SAMO; 658 CZP; 872 BOH");
add("SVN/*", "476 ODO; 493 OST; 537 FRK; 568 AVR; 658 CAR; 788 FRK; 828 FRK; 843-08-10 EFR; 911 BAV");
add("SVN#svn-friuli", GOTHIC_N + "; 568 LOMB; 774 FRK; 781 ITK; 952 BAV");
add("SVN#svn-pannonia", "476 -; 493 OST; 526 LOMP; 568 AVR; 796 FRK; 840 BAL; 876 EFR; 900 HUNG");
add(HR("Istria"), GOTHIC_N + "; 751 LOMB; 774 BYZ; 788 FRK; 843-08-10 ITK; 952 BAV");
add(HR("Zagreb", "Krapina-Zagorje", "Varaždin", "Međimurje", "Koprivnica-Križevci", "Bjelovar-Bilogora", "Virovitica-Podravina", "Požega-Slavonia", "Sisak-Moslavina", "Karlovac", "Brod-Posavina"),
  "476 ODO; 493 OST; 535 BYZ; 568 AVR; 796 FRK; 803 PCRO; 819 PCROd; 823 PCRO; 900 HUNG; 925 CRO");
add(HR("Osijek-Baranja", "Vukovar-Syrmia").concat(SR("Srem")), "476 GEP; 504 OST; 536 GEP; 567 LOMP; 568 AVR; 582 AVR; 796 FRK; 803 PCRO; 827 FBE; 896 HUNG");
add(HR("Primorje-Gorski", "Lika-Senj", "Zadar", "Šibenik-Knin", "Split-Dalmatia"), "476 WRE; 481 ODO; 493 OST; 536 BYZ; 614 SKL; 630 CRO");
add(HR("Dubrovnik-Neretva"), "476 WRE; 481 ODO; 493 OST; 536 BYZ; 614 SKL; 850 PAG");
add(["BIH:Una-Sana Canton/*", "BIH:Banja Luka/*", "BIH:Livno/*", "BIH:West Herzegovina Canton/*", "BIH:Central Bosnia Canton/*"], "476 WRE; 481 ODO; 493 OST; 536 BYZ; 614 SKL; 630 CRO");
add(["BIH:Herzegovina-Neretva Canton/*"], "476 WRE; 481 ODO; 493 OST; 536 BYZ; 614 SKL; 630 SRB; 850 ZAC");
add(["BIH:Trebinje/*"], "476 WRE; 481 ODO; 493 OST; 536 BYZ; 614 SKL; 630 SRB; 850 TRA");
add(["BIH:Foča/*", "BIH:Doboj/*", "BIH:Posavina Canton/*", "BIH:Brčko/*", "BIH:Bijeljina/*", "BIH:Vlasenica/*", "BIH:Zenica-Doboj Canton/*", "BIH:Tuzla Canton/*", "BIH:Sarajevo-Romanija/*", "BIH:Sarajevo Canton/*", "BIH:Bosnian Podrinje Canton/*"],
  "476 BYZ; 614 SKL; 630 SRB");
add("MNE/*", "476 BYZ; 614 SKL; 630 SRB");
add(G("MNE", "Podgorica", "Bar", "Ulcinj", "Budva", "Cetinje", "Danilovgrad", "Nikšić"), "476 BYZ; 614 SKL; 850 DOC");
add(G("MNE", "Kotor", "Tivat"), "476 BYZ");
add(G("MNE", "Herceg Novi"), "476 BYZ; 614 SKL; 850 TRA");
add(SR("Mačva", "Kolubara", "Zlatibor", "Moravica", "Raška", "Šumadija", "Rasina", "Toplica"), "476 BYZ; 614 SKL; 630 SRB");
add(SR("Belgrade", "Podunavlje", "Braničevo", "Pomoravski", "Bor", "Zaječar", "Nišava", "Pirot", "Jablanica", "Pčinja"), "476 BYZ; 614 SKL; 809 FBE");
add(SR("North Bačka", "West Bačka", "South Bačka", "North Banat", "Central Banat", "South Banat"), "476 GEP; 567 AVR; 805 FBE; 896 HUNG");
add("KOS/*", "476 BYZ; 614 SKL; 850 FBE");
add("MKD/*", "476 BYZ; 614 SKL; 840 FBE");
add(G("ALB", "Kukës", "Dibër", "Elbasan", "Korçë", "Berat", "Gjirokastër"), "476 BYZ; 614 SKL; 840 FBE");
add(G("ALB", "Shkodër"), "476 BYZ; 614 SKL; 850 DOC");
add(G("ALB", "Lezhë", "Durrës", "Tirana", "Fier", "Vlorë"), "476 BYZ");
// Bulgaria.
add(BG("Varna", "Dobrich", "Shumen", "Targovishte", "Razgrad", "Ruse", "Silistra", "Veliko Tarnovo", "Gabrovo", "Lovech", "Pleven"), "476 BYZ; 600 SKL; 681 FBE");
add(BG("Vidin", "Montana", "Vratsa"), "476 BYZ; 600 SKL; 805 FBE");
add(BG("Burgas"), "476 BYZ; 812 FBE");
add(BG("Yambol", "Sliven", "Stara Zagora"), "476 BYZ; 705 FBE");
add(BG("Sofia", "Pernik", "Kyustendil", "Blagoevgrad"), "476 BYZ; 600 SKL; 809 FBE");
add(BG("Plovdiv", "Pazardzhik"), "476 BYZ; 836 FBE");
add(BG("Haskovo", "Kardzhali", "Smolyan"), "476 BYZ");
// Romania and Moldova.
add(RO("Constanța", "Tulcea"), "476 BYZ; 681 FBE");
add(RO("Mehedinți", "Dolj", "Gorj", "Vâlcea", "Olt", "Argeș", "Teleorman", "Giurgiu", "Dâmbovița", "Prahova", "Ilfov", "Bucharest", "Ialomița", "Călărași", "Buzău", "Brăila"), "476 GEP; 520 SCL; 681 FBE");
add(RO("Timiș", "Arad", "Bihor", "Caraș-Severin", "Satu Mare", "Sălaj"), "476 GEP; 567 AVR; 805 FBE; 896 HUNG");
add(RO("Cluj", "Alba", "Hunedoara", "Sibiu", "Mureș", "Bistrița-Năsăud", "Brașov", "Harghita", "Covasna", "Maramureș"), "476 GEP; 567 AVR; 650 SLV; 805 FBE; 900 HUNG");
add(RO("Suceava", "Botoșani", "Iași", "Neamț", "Bacău", "Vaslui", "Vrancea", "Galați").concat(["MDA/*"]), "476 SCL; 520 ANT; 602 SLV; 850 HUNG; 896 PEC");
// Greece and the Aegean: the Slavs held the Peloponnese's interior, by the Chronicle of Monemvasia from 587, until Staurakios's
// campaign (783) and the relief of Patras (805), Thessaly and much of Epirus and Macedonia until the themes were set up.
add(GR("Peloponnese", "West Greece"), "476 BYZ; 587 SKL; 805 BYZ");
add(GR("Epirus"), "476 BYZ; 600 SKL; 880 BYZ");
add(GR("West Macedonia"), "476 BYZ; 600 SKL; 840 FBE");
add(GR("Thessalia"), "476 BYZ; 600 SKL; 783 BYZ");
add(GR("Central Greece"), "476 BYZ; 600 SKL; 690 BYZ");
add(GR("Centre Macedonia", "East Macedonia and Thrace", "Mount Athos", "Attica", "Ionian Islands", "North Aegean", "South Aegean"), "476 BYZ");
add(GR("Crete"), "476 BYZ; 824 ECR; 961-03-07 BYZ");

// ——— Eastern Europe ———
// The steppe: the Kutrigurs and Utigurs, the Western Turkic Khaganate (from 576), Old Great Bulgaria (632 to 668), Khazaria,
// then the Magyars in Levedia and Etelköz and the Pechenegs (from 895). The forest: the Antes and Sclaveni, then the East Slav
// tribes of the Primary Chronicle, the Balts, and the Finnic peoples, until the Rus took them in (Novgorod 862, Kiev 882, the
// Drevlians 883, the Severians 884, the Radimichs 885). West of the Bug, the Lechitic tribes until the Piast state (about 960).
own("KHZ", "Khazaria", { host: true });
own("WTK", "Western Turkic Khaganate");
own("OGB", "Old Great Bulgaria");
people("KUTR", "Kutrigurs");
people("UTIG", "Utigurs");
people("SAB", "Sabirs", { wiki: "Sabir people" });
people("CHUN", "Caucasian Huns");
people("ALAN", "Alans", {}, [["900-01-01", { name: "Alania", wiki: "Alania", people: 0 }]]);
people("ZICH", "Zichs", { wiki: "Zygii" });
own("RUSK", "Rus' Khaganate", {}, [["882-01-01", { name: "Kievan Rus'", wiki: "Kievan Rus'" }]]);
own("VBUL", "Volga Bulgaria", { ruler: "Khazaria", status: 5 }, [["922-01-01", { ruler: "", status: 0 }]]);
own("POLD", "Civitas Schinesghe", { wiki: "Duchy of Poland (966–1025)" });
people("BALT", "Balts");
people("POLE", "Polans", { wiki: "Polans (eastern)" });
people("DREV", "Drevlians");
people("SEV", "Severians");
people("RADI", "Radimichs");
people("VYAT", "Vyatichi");
people("DREG", "Dregovichs");
people("KRIV", "Krivichs");
people("ILM", "Ilmen Slavs");
people("VOLH", "Volhynians");
people("DUL", "Dulebes");
people("WCRO", "White Croats");
people("ULI", "Ulichs");
people("TIV", "Tivertsi");
people("POLW", "Polans", { wiki: "Polans (western)" });
people("MAZ", "Masovians");
people("SIL", "Silesians", { wiki: "Silesians (Slavic tribe)" });
people("VIST", "Vistulans");
people("LEND", "Lendians");
people("PRUS", "Old Prussians");
people("YOT", "Yotvingians");
people("CUR", "Curonians");
people("SEMI", "Semigallians");
people("SELO", "Selonians");
people("LATG", "Latgalians");
people("LIVO", "Livonians");
people("SAMG", "Samogitians");
people("LITH", "Lithuanians", { wiki: "Balts" });
people("ESTP", "Estonians", { wiki: "Ancient Estonia" });
people("VOT", "Votes");
people("VES", "Veps", { wiki: "Ves (people)" });
people("MERY", "Merya", { wiki: "Merya people" });
people("MURO", "Muroma");
people("MORD", "Mordvins");
people("MARI", "Mari", { wiki: "Mari people" });
people("BURT", "Burtas");
people("UDM", "Udmurts");
people("BJAR", "Bjarmians", { wiki: "Bjarmaland" });
people("KAR", "Karelians");
people("FINP", "Finns");
people("TAV", "Tavastians");
people("SAMI", "Sámi", { wiki: "Sámi people" });
const UA = (...n) => n.map((x) => "UKR:" + x + "/*"), BY = (...n) => n.map((x) => "BLR:" + x + "/*"), RU = (...n) => G("RUS", ...n), PL = (...n) => n.map((x) => "POL:" + x + " Voivodeship/*");
add(UA("Odessa", "Mykolaiv", "Kherson", "Zaporizhzhia", "Dnipropetrovsk", "Kirovohrad", "Donetsk", "Luhansk", "Kharkiv"), "476 KUTR; 558 AVR; 576 WTK; 632 OGB; 668 KHZ; 850 HUNG; 896 PEC");
add(UA("Donetsk", "Luhansk", "Kharkiv", "Dnipropetrovsk", "Zaporizhzhia"), "476 KUTR; 558 AVR; 576 WTK; 632 OGB; 668 KHZ; 830 HUNG; 896 PEC");
add(RU("Autonomous Republic of Crimea"), "476 KUTR; 576 WTK; 632 OGB; 668 KHZ");
add(RU("Sevastopol"), "476 BYZ");
add(RU("Rostov", "Krasnodar Krai", "Republic of Adygea"), "476 UTIG; 576 WTK; 632 OGB; 668 KHZ");
add(RU("Republic of Adygea"), "476 ZICH");
add(RU("Volgograd", "Republic of Kalmykia", "Astrakhan", "Stavropol Krai", "Saratov"), "476 SAB; 576 WTK; 650 KHZ");
add(RU("Saratov"), "476 BURT; 650 KHZ");
add(RU("Republic of Dagestan", "Chechen Republic"), "476 CHUN; 700 KHZ");
add(RU("Karachay-Cherkess Republic", "Kabardino-Balkaria", "Republic of North Ossetia-Alania", "Republic of Ingushetia"), "476 ALAN");
add(RU("Voronezh", "Belgorod"), "476 KUTR; 576 WTK; 650 KHZ");
add(UA("Kyiv"), "476 ANT; 602 SLV; 700 POLE; 750 POLE; 882 RUSK");
add(UA("Cherkasy", "Poltava"), "476 ANT; 602 SLV; 700 SEV; 884 RUSK");
add(UA("Chernihiv", "Sumy").concat(RU("Kursk")), "476 ANT; 602 SLV; 700 SEV; 884 RUSK");
add(UA("Zhytomyr"), "476 SCL; 602 SLV; 700 DREV; 883 RUSK; 945 DREV; 946 RUSK");
add(UA("Volyn", "Rivne"), "476 SCL; 600 DUL; 800 VOLH; 907 RUSK");
add(UA("Lviv", "Ternopil", "Ivano-Frankivsk", "Chernivtsi"), "476 SCL; 600 WCRO");
add(UA("Zakarpattia"), "476 GEP; 567 AVR; 650 WCRO; 895 HUNG");
add(UA("Vinnytsia", "Khmelnytskyi"), "476 ANT; 602 SLV; 750 ULI");
add(BY("Gomel", "Mahilioŭ"), "476 BALT; 700 RADI; 885 RUSK");
add(BY("Minsk", "Brest"), "476 BALT; 700 DREG; 900 RUSK");
add(BY("Brest"), "476 BALT; 650 DREG");
add(BY("Grodno"), "476 BALT; 600 YOT");
add(BY("Vitebsk").concat(RU("Pskov")), "476 BALT; 650 KRIV; 862 RUSK");
add(RU("Smolensk"), "476 BALT; 650 KRIV; 882 RUSK");
add(RU("Bryansk"), "476 BALT; 700 RADI; 885 RUSK");
add(RU("Kaluga", "Tula", "Oryol", "Moscow"), "476 BALT; 750 VYAT");
add(RU("Lipetsk", "Tambov", "Ryazan", "Republic of Mordovia", "Penza"), "476 MORD");
add(RU("Novgorod"), "476 VOT; 650 ILM; 839 RUSK");
add(RU("Leningrad", "Saint Petersburg"), "476 VOT; 753 VOT; 862 RUSK");
add(RU("Tver"), "476 BALT; 650 KRIV; 900 RUSK");
add(RU("Yaroslavl", "Ivanovo", "Kostroma"), "476 MERY; 862 RUSK");
add(RU("Kostroma"), "476 MERY");
add(RU("Vladimir"), "476 MURO; 862 RUSK");
add(RU("Vologda"), "476 VES; 862 RUSK");
add(RU("Nizhny Novgorod"), "476 MORD");
add(RU("Mari El Republic"), "476 MARI");
add(RU("Chuvash Republic", "Ulyanovsk"), "476 MORD; 700 VBUL");
add(RU("Kirov"), "476 UDM");
add("RUS:Arkhangelsk/*", "476 BJAR");
add(["RUS:Karelia/*"], "476 KAR");
add(RU("Murmansk"), "476 SAMI");
// Poland and the Baltic.
add(PL("Greater Poland", "Kuyavian-Pomeranian", "Lubusz", "Łódź"), "476 -; 550 SLV; 650 POLW; 960 POLD");
add(PL("Lubusz"), "476 -; 550 SLV; 650 POLW");
add(PL("Masovian"), "476 -; 550 SLV; 650 MAZ; 960 POLD");
add(PL("Podlaskie"), "476 BALT; 600 YOT");
add(PL("Lublin", "Podkarpackie"), "476 SCL; 600 LEND");
add(PL("Lesser Poland", "Świętokrzyskie"), "476 SCL; 600 VIST; 875 GMO; 907 VIST; 955 BOH");
add(PL("Silesian", "Opole", "Lower Silesian"), "476 -; 550 SLV; 650 SIL; 950 BOH");
add(PL("West Pomeranian", "Pomeranian"), "476 -; 550 SLV; 650 POM");
add(PL("Warmian-Masurian").concat(RU("Kaliningrad")), "476 PRUS");
add(["LTU:Klaipėda/*"], "476 CUR");
add(["LTU:Telšiai/*", "LTU:Tauragė/*"], "476 SAMG");
add(["LTU:Šiauliai/*"], "476 SEMI");
add(["LTU:Panevėžys/*", "LTU:Utena/*", "LTU:Vilnius/*", "LTU:Kaunas/*", "LTU:Alytus/*"], "476 LITH");
add(["LTU:Marijampolė/*"], "476 YOT");
poly("curonians", [[20.9, 55.6], [22.4, 55.6], [22.6, 56.4], [22.5, 57.0], [22.7, 57.7], [21.0, 57.8]]);
poly("livonians", [[22.7, 57.7], [22.5, 57.0], [23.2, 57.0], [24.0, 56.85], [24.9, 56.95], [25.2, 57.3], [24.9, 57.9], [24.3, 57.9], [23.5, 57.6]]);
poly("semigallians", [[22.6, 56.25], [22.6, 56.9], [23.5, 57.0], [24.3, 56.85], [25.3, 56.4], [25.0, 56.15], [24.0, 56.2], [23.0, 56.2]]);
poly("selonians", [[25.0, 56.15], [25.3, 56.4], [25.6, 56.6], [26.6, 56.0], [26.6, 55.7], [25.7, 55.9]]);
add("LVA/*", "476 LATG");
add("LVA#curonians", "476 CUR");
add("LVA#livonians", "476 LIVO");
add("LVA#semigallians", "476 SEMI");
add("LVA#selonians", "476 SELO");
add("EST/*", "476 ESTP");
// Scandinavia and Finland.
own("DAN", "Danes", { people: 1, wiki: "Danes (tribe)" }, [["700-01-01", { name: "Kingdom of Denmark", wiki: "Denmark in the Viking Age", people: 0 }]]);
people("SWE", "Swedes", { wiki: "Swedes (tribe)" });
people("GEAT", "Geats");
people("GUT", "Gutes");
own("NWP", "Norwegian petty kingdoms", { wiki: "Petty kingdoms of Norway" });
own("NWY", "Kingdom of Norway", { wiki: "Kingdom of Norway (872–1397)" });
poly("sami", [[12.0, 65.0], [16.0, 62.5], [19.0, 62.8], [25.0, 64.0], [30.0, 63.8], [37.0, 64.5], [45.0, 66.0], [45.0, 72.0], [12.0, 72.0]]);
add(G("DNK", "Zealand", "Denmark").concat(G("SWE", "Skåne", "Halland", "Blekinge")), "476 DAN");
add(G("DNK", "North Denmark", "Central Denmark"), "476 JUT; 550 DAN");
add(G("DNK", "Southern Denmark"), "476 ANG; 550 DAN");
add(G("SWE", "Uppsala", "Stockholm", "Södermanland", "Västmanland", "Örebro", "Gävleborg", "Dalarna", "Värmland", "Jämtland", "Västernorrland"), "476 SWE");
add(G("SWE", "Västra Götaland", "Östergötland", "Jönköping", "Kronoberg", "Kalmar"), "476 GEAT");
add(G("SWE", "Gotland"), "476 GUT");
add("NOR/*", "476 NWP; 872 NWY");
add(G("NOR", "Hedmark", "Oppland"), "476 NWP");
add(["FIN/*"], "476 FINP");
add(G("FIN", "Tavastia Proper", "Päijänne Tavastia", "Pirkanmaa", "Central Finland"), "476 TAV");
add(G("FIN", "South Karelia", "North Karelia", "Southern Savonia", "Northern Savonia", "Kymenlaakso"), "476 KAR");
add(["#sami"], "476 SAMI");

// ——— Anatolia and Cyprus ———
// The Byzantine heartland; the Persian occupation of Cilicia, Syria's north, and Melitene in the war of 602 to 628; the Arab
// conquest of the north of Syria (Antioch, 637) and the frontier of the thughur, Cilicia (disputed from the Arab raids of the
// 640s to the settlement of Mopsuestia in 703) and Melitene, until the Byzantine advance (Melitene 934, Samosata 958); and
// Cyprus under the condominium of 688.
own("SAS", "Sasanian Empire", { host: true });
own("HAM", "Hamdanid Emirates", { host: true });
own("MELI", "Emirate of Melitene", { ruler: "Abbasid Caliphate", status: 5 });
own("CILd", "Cilicia", { wiki: "Arab–Byzantine wars", claims: ["Byzantine Empire", "Rashidun Caliphate"] }, [["661-01-01", { claims: ["Byzantine Empire", "Umayyad Caliphate"] }]]);
own("CYPd", "Cyprus", { wiki: "Arab–Byzantine condominium in Cyprus", claims: ["Byzantine Empire", "Umayyad Caliphate"] }, [["750-01-01", { claims: ["Byzantine Empire", "Abbasid Caliphate"] }]]);
const TR = (...n) => G("TUR", ...n);
add("TUR/*", "476 BYZ");
add(TR("Hatay", "Gaziantep", "Kilis"), "476 BYZ; 613 SAS; 628 BYZ; 637 RAS; 661 UMA; 750 ABB; 878 TUL; 905 ABB; 944 HAM");
add(TR("Şanlıurfa", "Adıyaman"), "476 BYZ; 609 SAS; 628 BYZ; 639 RAS; 661 UMA; 750 ABB; 944 HAM");
add(TR("Adıyaman"), "476 BYZ; 609 SAS; 628 BYZ; 639 RAS; 661 UMA; 750 ABB; 944 HAM; 958 BYZ");
add(TR("Kahramanmaraş", "Osmaniye", "Adana", "Mersin"), "476 BYZ; 613 SAS; 628 BYZ; 642 CILd; 703 UMA; 750 ABB; 878 TUL; 905 ABB");
add(TR("Kahramanmaraş"), "476 BYZ; 613 SAS; 628 BYZ; 637 RAS; 661 UMA; 750 ABB; 944 HAM");
add(TR("Malatya", "Elazığ"), "476 BYZ; 613 SAS; 628 BYZ; 656 UMA; 750 MELI; 934 BYZ");
add(["CYP/*", "CYN/*"], "476 BYZ; 688 CYPd");

// From 962 to 1100: tools/medieval-high.mjs.
high({ own, people, later, add, poly, G, F, I, E, P, B, N, SR, BG, HR, RO, GR, TR, UA, BY, RU, PL, Z, T, L, M,
  PARIS, ORLEANS, MAINE_ANJOU, TOURS_BLOIS, LORRAINE, BURGUNDY, COMTE, LYONNAIS, VIENNOIS, SAVOY, PROVENCE, VAR, TOULOUSE, ROUERGUE,
  AQUITAINE, BERRY, GASCONY, FLANDERS, MEUSE_BE, HOLLAND, SAXON_NL, FRANK_NL, SWISS_BURGUNDY, FRIULI, VENETO, LOMBARDY, PIEDMONT, LIGURIA,
  TUSCANY, EMILIA_W, SPOLETO, BENEVENTO, CALABRIA, GWYNEDD, POWYS, DYFED, CEREDIGION, GLYWYSING, ALT_CLUT, CUMBRIA, LOTHIAN,
  FRANCE_NAMES: { WFRANCIA, EFRANCIA, GERMANY, ITALY, ENGLAND, CORDOBA, BULGARIA } });

// ENGINE_BELOW
const DAY_MS = 86400000;
const dayOf = (iso) => { const [y, m = 1, d = 1] = iso.split("-").map(Number); const t = new Date(0); t.setUTCFullYear(y, m - 1, d); return Math.round(t.getTime() / DAY_MS); };
const parseTl = (s0, what) => {
  const inherit = s0.trim().startsWith("+"), s = inherit ? s0.trim().slice(1) : s0;
  const tl = s.split(";").map((e) => e.trim()).filter(Boolean).map((e) => {
    const [d, k] = e.split(/\s+/);
    if (!/^\d{3,4}(-\d\d-\d\d)?$/.test(d) || !k) throw new Error("medieval: bad entry '" + e + "' in " + what);
    return [d.includes("-") ? d.padStart(10, "0") : d.padStart(4, "0") + "-01-01", k];
  });
  if (!tl.length || (!inherit && +tl[0][0].slice(0, 4) !== MEDIEVAL_FROM && +tl[0][0].slice(0, 4) !== EXT_FROM)) throw new Error("medieval: " + what + " does not start in " + MEDIEVAL_FROM + " or " + EXT_FROM);
  for (let i = 1; i < tl.length; i++) if (tl[i][0] <= tl[i - 1][0]) throw new Error("medieval: " + what + " is out of order at " + tl[i][0]);
  for (const [, k] of tl) if (k !== "-" && !O[k]) throw new Error("medieval: no owner " + k + " in " + what);
  const out = tl.map(([d, k]) => [dayOf(d), k]);
  out.inherit = inherit;
  return out;
};

export function buildMedieval(env) {
  const { topo, provinces, client, clip, rewind, polysOf, log = () => {} } = env;
  const geoms = topo.objects.units.geometries;
  const inRing = (ring, p) => { let k = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) if ((ring[i][1] > p[1]) !== (ring[j][1] > p[1]) && p[0] < ring[i][0] + ((p[1] - ring[i][1]) * (ring[j][0] - ring[i][0])) / (ring[j][1] - ring[i][1])) k = !k; return k; };
  const polysAt = (i) => { const g = client.feature(topo, geoms[i]).geometry; return g ? rewind(polysOf(g)) : []; };
  // Each unit's middle: the mean of the outer ring of its largest polygon.
  const units = [];
  geoms.forEach((g, i) => {
    const pr = provinces[g.properties.p];
    if (!FRAME.has(pr.c) && !EXT.has(pr.c)) return;
    const p = polysAt(i);
    if (!p.length) return;
    const big = p.reduce((m, q) => (q[0].length > m[0].length ? q : m));
    const mid = big[0].reduce((s, q) => [s[0] + q[0] / big[0].length, s[1] + q[1] / big[0].length], [0, 0]);
    const inMain = FRAME.has(pr.c) && !(mid[0] < FRAME_BOX[0] || mid[0] > (FRAME_EAST[pr.c] ?? FRAME_BOX[2]) || mid[1] < FRAME_BOX[1] || mid[1] > FRAME_BOX[3]);
    const inExt = !inMain && MEDIEVAL_TO >= EXT_FROM && EXT.has(pr.c) && !(mid[0] < EXT_BOX[0] || mid[0] > EXT_BOX[2] || mid[1] < EXT_BOX[1] || mid[1] > EXT_BOX[3]);
    if (!inMain && !inExt) return;
    units.push({ i, c: pr.c, prov: pr.n, n: g.properties.n, mid, ext: inExt });
  });
  const errors = [];
  const resolve = (sel) => {
    let cut = null, base = sel;
    const c = base.match(/^(.*)\{(!?)([\w-]+)\}$/);
    if (c) { if (!R[c[3]]) throw new Error("medieval: no polygon " + c[3]); base = c[1]; cut = [c[3], c[2] === "!"]; }
    let hits;
    const h = base.match(/^([A-Z,]*)#([\w-]+)$/);
    if (h) {
      if (!R[h[2]]) throw new Error("medieval: no polygon " + h[2]);
      const cs = h[1] ? new Set(h[1].split(",")) : null;
      hits = units.filter((u) => (!cs || cs.has(u.c)) && inRing(R[h[2]], u.mid));
    } else if (base.includes("@")) {
      const [cc, reg] = base.split("@");
      hits = units.filter((u) => u.c === cc && provinces[geoms[u.i].properties.p].region === reg);
    } else {
      const slash = base.indexOf("/"), head = base.slice(0, slash), name = base.slice(slash + 1);
      const [cc, prov] = head.split(":");
      const pool = units.filter((u) => u.c === cc && (!prov || u.prov === prov));
      hits = name === "*" ? pool : pool.filter((u) => u.n === name);
      if (!prov && name !== "*" && new Set(hits.map((u) => u.prov)).size > 1) { errors.push(sel + " names " + hits.length + " units; give its province"); return []; }
    }
    if (!hits.length) { errors.push("no unit for " + sel); return []; }
    return hits.map((u) => ({ i: u.i, cut }));
  };
  // Pieces of each unit: a cut row takes the part of each earlier piece inside (or outside) its polygon. A row that inherits
  // stands on the row it replaces (under) for the days before its first entry.
  const pieces = new Map();
  LAND.forEach(([sels, tlStr], k) => {
    const row = { k, tl: parseTl(tlStr, "land row " + k + " (" + sels[0] + ")"), what: sels[0] };
    for (const it of sels.flatMap(resolve)) {
      if (!it.cut && row.tl.inherit) {
        const before = pieces.get(it.i);
        if (!before) { errors.push("land row " + k + " (" + sels[0] + ") inherits, but no row before it names " + it.i); continue; }
        pieces.set(it.i, before.map((p) => ({ cons: p.cons, row: p.row ? { ...row, under: p.row } : row })));
        continue;
      }
      if (!it.cut) { pieces.set(it.i, [{ cons: [], row }]); continue; }
      const before = pieces.get(it.i) || [{ cons: [], row: null }], next = [];
      for (const p of before) {
        next.push({ cons: p.cons.concat([it.cut]), row });
        if (p.row) next.push({ cons: p.cons.concat([[it.cut[0], !it.cut[1]]]), row: p.row });
      }
      pieces.set(it.i, next.filter((p) => !p.cons.some(([a, o]) => p.cons.some(([b, q]) => a === b && o !== q))));
    }
  });
  if (errors.length) throw new Error("medieval: " + errors.join("; "));
  const missing = new Map();
  for (const u of units) if (!pieces.has(u.i)) missing.set(u.c, (missing.get(u.c) || []).concat(u.n));
  if (missing.size) log("units no row names (the sources keep them): " + [...missing].map(([c, l]) => c + " " + l.length + " (" + l.slice(0, 6).join(", ") + (l.length > 6 ? ", …" : "") + ")").join("; "));
  const all = [], extUnits = new Set(units.filter((u) => u.ext).map((u) => u.i));
  for (const [i, ps] of pieces) for (const p of ps) if (p.row) all.push({ i, cons: p.cons, row: p.row, ext: extUnits.has(i), key: i + p.cons.map(([a, o]) => (o ? "!" : "") + a).sort().join("") });
  // Each owner's attributes on a day.
  const attrAt = (key, d) => { let a = {}; for (const [from, ch] of O[key]) if (dayOf(from) <= d) a = { ...a, ...ch }; return a; };
  const ownerAt = (tl, d) => { let o = null; for (const [from, k] of tl) if (from <= d) o = k; return o; };
  const ownerOf = (row, d) => { const o = ownerAt(row.tl, d); return o !== null || !row.under ? o : ownerOf(row.under, d); };
  const late = [];
  for (const p of all) { const first = p.ext ? EXT_FROM : MEDIEVAL_FROM; if (ownerOf(p.row, dayOf(first + "-01-01")) === null) late.push(p.row.what); }
  if (late.length) throw new Error("medieval: rows with no owner on their land's first day: " + [...new Set(late)].slice(0, 12).join(", "));
  // Year by year (the state on 1 July), each owner's pieces; a run of years with the same owner, attributes, and pieces is a span.
  const open = new Map(), runs = [];
  for (let y = MEDIEVAL_FROM; y <= MEDIEVAL_TO; y++) {
    const d = dayOf(y + "-07-01"), byOwner = new Map();
    for (const p of all) {
      const o = ownerOf(p.row, d);
      if (!o || o === "-") continue;
      if (!byOwner.has(o)) byOwner.set(o, []);
      byOwner.get(o).push(p);
    }
    const seen = new Set();
    for (const [o, ps] of byOwner) {
      const at = attrAt(o, d), sig = JSON.stringify(at) + "|" + ps.map((p) => p.key).sort().join(","), k = o + "|" + sig;
      seen.add(k);
      const r = open.get(k);
      if (r && r.last === y - 1) { r.last = y; continue; }
      const run = { owner: o, at, ps, first: y, last: y };
      runs.push(run);
      open.set(k, run);
    }
    for (const k of [...open.keys()]) if (!seen.has(k)) open.delete(k);
  }
  // Shapes: whole units merged along their shared arcs, and cut pieces clipped and joined to them.
  const shapes = new Map();
  const shapeOf = (ps) => {
    const key = ps.map((p) => p.key).sort().join(",");
    if (shapes.has(key)) return shapes.get(key);
    const whole = ps.filter((p) => !p.cons.length).map((p) => geoms[p.i]);
    let polys = whole.length ? rewind(polysOf(client.merge(topo, whole))) : [];
    const cut = ps.filter((p) => p.cons.length);
    for (const p of cut) {
      let q = polysAt(p.i);
      for (const [name, out] of p.cons) if (q.length) q = rewind((out ? clip.difference : clip.intersection)(q, [[R[name]]]));
      polys = polys.concat(q);
    }
    if (cut.length && polys.length > 1) { try { polys = rewind(clip.union(polys)); } catch (e) { log("shape " + key.slice(0, 50) + ": cut pieces not joined (" + e.message + ")"); } }
    shapes.set(key, polys);
    return polys;
  };
  const out = [];
  for (const r of runs) {
    const polys = shapeOf(r.ps);
    if (!polys.length) continue;
    const a = r.at;
    out.push({ name: a.name, wiki: a.wiki || a.name, ruler: a.ruler || "", status: a.status || 0, part: a.part || "", b: a.b ?? 1, people: a.people ? 1 : 0,
      ...(a.claims ? { claims: a.claims.slice().sort(), status: 6 } : {}), host: !!a.host, first: r.first, last: r.last, polys });
  }
  const area = (polys) => polys.reduce((t, p) => { let s = 0; const q = p[0]; for (let i = 0; i + 1 < q.length; i++) s += q[i][0] * q[i + 1][1] - q[i + 1][0] * q[i][1]; return t + Math.abs(s) * Math.cos((q[0][1] * Math.PI) / 180); }, 0);
  out.forEach((s) => { s.size = area(s.polys); });
  for (const s of out) if (out.some((t) => t !== s && t.name === s.name && t.size > s.size && Math.min(s.last, t.last) - Math.max(s.first, t.first) + 1 >= 0.5 * (s.last - s.first + 1))) s.noLabel = true;
  // Rulers and claimants should be owners of the table or states of the sources (hosts); a name that is neither is reported.
  const names = new Set(Object.values(O).flatMap((tl) => tl.map(([, a]) => a.name).filter(Boolean)));
  const strange = new Set();
  for (const s of out) for (const n of [s.ruler, s.part, ...(s.claims || [])]) if (n && !names.has(n)) strange.add(n);
  if (strange.size) log("rulers, parts, or claimants that are no owner's name: " + [...strange].join(", "));
  const mainPs = all.filter((p) => !p.ext), extPs = all.filter((p) => p.ext);
  return { spans: out, mask: shapeOf(mainPs), maskExt: extPs.length ? shapeOf(extPs) : [], units: all.length };
}

// The owners' names, for checks.
export const MEDIEVAL_OWNERS = () => O;
