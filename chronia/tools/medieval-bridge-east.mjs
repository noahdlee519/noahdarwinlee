// The bridge in the east, from 1445 to 1647: Moscow's gathering of the Russian lands and its conquests on the Volga and in the
// steppe, the break-up of the Golden Horde, the Crimean Khanate and the Ottoman coast of the Crimea, the Cossack hosts, and the
// North Caucasus. The names of the states the sources draw east of the frame (50° E) are kept, so each is one state across its
// edge: the Great Horde (the sources' name for the Golden Horde from 1466), the Khanate of Kazan, the Astrakhan Khanate, the Nogai
// Horde, the Small Horde (the Lesser Nogai Horde of the Kuban), the Kalmyk Khanate, the Grand Principality of Moscow, and the
// Tsardom of Russia.
import { bridgeRows } from "./medieval-bridge.mjs";

export function bridgeEast(h) {
  if (globalThis.CHRONIA_BRIDGE_PAIRS) return;
  const { own, later, add } = h, { row } = bridgeRows(add);
  const GREAT = "Great Horde", GPM = "Grand Principality of Moscow", RUSSIA = "Tsardom of Russia";
  // The Great Horde: the Golden Horde's rump on the lower Volga once the Astrakhan Khanate had parted from it (1466, the sources'
  // year), destroyed by Mengli I Giray of the Crimea on the Sula in June 1502.
  const HORDE = "1466-01-01", HORDE_END = "1502-06-01";
  // The stand on the Ugra (11 November 1480), the conventional end of the Horde's overlordship of the Russian princes.
  const UGRA = "1480-11-11";
  // Novgorod's submission to Ivan III (15 January 1478), with its northern lands; Kazan's fall (2 October 1552).
  const NOVGOROD = "1478-01-15", KAZAN = "1552-10-02";
  // The Treaty of Stolbovo (27 February 1617): Ingria and Kexholm County to Sweden.
  const STOLBOVO = "1617-02-27";

  // ——— New owners ———
  own("ASTR", "Astrakhan Khanate", { wiki: "Astrakhan Khanate", host: true });
  own("NOGH", "Nogai Horde", { wiki: "Nogai Horde", host: true });
  own("SMNG", "Small Horde", { wiki: "Nogai Horde", host: true });
  own("KALM", "Kalmyk Khanate", { wiki: "Kalmyk Khanate", host: true });
  // The Don Cossack Host, from Ivan IV's charter to it (3 January 1570), its conventional founding: the tsar's ally and client,
  // self-governing until its oath of 1671.
  own("DONC", "Don Cossacks", { wiki: "Don Cossacks", ruler: RUSSIA, status: 5 });
  own("KABA", "Kabardia", { wiki: "Kabardia" });
  own("NAKH", "Nakh peoples", { wiki: "Nakh peoples", people: 1 });
  own("MORDV", "Mordvins", { wiki: "Mordvins", people: 1 });

  // ——— Renamed or changed owners ———
  later("GH", [[HORDE, { name: GREAT, wiki: "Great Horde" }]]);
  // Moscow: the Horde's tributary to the Ugra, then under the sources' name; the Tsardom from Ivan IV's coronation (16 January 1547).
  later("MOSC", [[HORDE, { ruler: GREAT }], [UGRA, { name: GPM, wiki: "Principality of Moscow", ruler: "", status: 0, host: true }],
    ["1547-01-16", { name: RUSSIA, wiki: "Tsardom of Russia" }]]);
  later("TVER", [[HORDE, { ruler: GREAT }], [UGRA, { ruler: "", status: 0 }]]);
  later("ROST", [[HORDE, { ruler: GREAT }]]);
  // Ryazan, Moscow's "younger brother" by the treaty of 1483.
  later("RYAZ", [[HORDE, { ruler: GREAT }], [UGRA, { ruler: "", status: 0 }], ["1483-01-01", { ruler: GPM, status: 5 }]]);
  // Novgorod under Moscow's suzerainty by the Treaty of Korostyn (11 August 1471), after the Shelon.
  later("NOVG", [["1471-08-11", { ruler: "Grand Duchy of Moscow", status: 5 }]]);
  // The Crimean Khanate an Ottoman vassal from Mengli I Giray's restoration by Mehmed II (1478), as in the sources.
  later("CRIM", [["1478-01-01", { ruler: "Ottoman Empire", status: 5 }]]);

  // ——— The gathering of the Russian lands ———
  // Galich-Mersky, taken from Dmitry Shemyaka at the battle of Galich (27 January 1450); Yaroslavl (1463); Rostov's last half sold
  // to Ivan III (1474); Novgorod; Tver (12 September 1485); Vyatka (1489); the Upper Oka princes by the peace with Lithuania
  // (5 February 1494); Pskov, its veche bell taken down (13 January 1510); Ryazan (1521).
  row("MERY|-", "1450-01-27 MOSC");
  row("YARO|-", "1463-01-01 MOSC");
  row("ROST|-", "1474-01-01 MOSC");
  row("NOVG|Tsardom of Russia", NOVGOROD + " MOSC");
  row("TVER|Tsardom of Russia", "1485-09-12 MOSC");
  row("UDM|-", "1489-01-01 MOSC");
  row("CHER|Tsardom of Russia", "1494-02-05 MOSC");
  row("PSKV|Tsardom of Russia", "1510-01-13 MOSC");
  row("RYAZ|-", "1521-01-01 MOSC");
  // Novgorod's north, which the table of 1444 draws as its peoples: the Dvina land, Karelia, and the Kola and White Sea shores,
  // Moscow's with Novgorod. Ingria and Kexholm County (Ladoga Karelia) to Sweden at Stolbovo.
  row("BJAR|-", NOVGOROD + " MOSC");
  row("SAMI|-", NOVGOROD + " MOSC");
  const KEXHOLM = ["Lakhdenpokhsky District", "Sortavalsky District", "Pitkyarantsky District"];
  row("KAR|-", NOVGOROD + " MOSC");
  row("KAR|-", NOVGOROD + " MOSC; " + STOLBOVO + " SWE", KEXHOLM);
  row("NOVG|Swedish Empire", NOVGOROD + " MOSC; " + STOLBOVO + " SWE");

  // ——— Kazan and the Volga ———
  // The Khanate of Kazan's right bank from its second founding (Mahmud's seizure of Kazan after the battle of Suzdal, 7 July 1445);
  // all of it to Ivan IV at Kazan's fall, with the Mordvins' land between the Sura and the Moksha.
  row("KAZN|-", KAZAN + " MOSC");
  row("GH|-", "1445-07-07 KAZN; " + KAZAN + " MOSC", ["Ulyanovsk"]);
  row("GH|-", HORDE_END + " MORDV; " + KAZAN + " MOSC", ["Republic of Mordovia", "Penza"]);
  // The Astrakhan Khanate (1466), taken by Russia (1556); the Volga's banks the Nogai Horde's until Tsaritsyn (1589) and Saratov
  // (1590) were founded; the steppe west of the lower Volga the Nogais' and then the Kalmyks' (Kho Orluk's coming, 1630; the
  // Nogai Horde's end, 1634).
  row("GH|-", HORDE + " ASTR; 1556-01-01 MOSC", ["Astrakhan"]);
  row("GH|-", HORDE + " ASTR; 1556-01-01 NOGH; 1630-01-01 KALM", ["Republic of Kalmykia"]);
  row("GH|-", HORDE_END + " ASTR; 1556-01-01 NOGH; 1634-01-01 KALM", ["Stavropol Krai"]);
  row("GH|-", HORDE_END + " NOGH; 1589-01-01 MOSC", ["Volgograd"]);
  row("GH|-", HORDE_END + " NOGH; 1590-01-01 MOSC", ["Saratov"]);

  // ——— The Wild Fields ———
  // No state held the steppe between the Oka, the Dnieper, and the Don once the Great Horde was gone: it is left unowned until
  // Russia's fortress towns took it in: Voronezh (1586), Yelets (1592), Belgorod (1596), Tambov (17 April 1636), Chuhuiv on the
  // Donets (1638), and Tor (1645).
  row("GH|-", HORDE_END + " -; 1586-01-01 MOSC", ["Voronezh"]);
  row("GH|-", HORDE_END + " -; 1592-01-01 MOSC", ["Lipetsk"]);
  row("GH|-", HORDE_END + " -; 1636-04-17 MOSC", ["Tambov"]);
  // The lower Don the Crimean Khanate's (Azov was the Ottomans' from 1471), then the Don Cossacks'.
  row("GH|-", HORDE_END + " CRIM; 1570-01-03 DONC", ["Rostov"]);
  // The table of 1648 gives Russia the whole of today's Kharkiv, Luhansk, and Donetsk: the Azov shore stayed the Crimean Khanate's
  // and the Donets ridge no one's, so they keep those owners to 1647.
  const AZOV = ["Manhush", "Nikolske", "Novoazovsk", "Volnovakha", "Velyka Novosilka", "Boikivske", "Starobesheve"];
  row("GH|Tsardom of Russia", HORDE_END + " -");
  row("GH|Tsardom of Russia", HORDE_END + " CRIM", AZOV);
  row("GH|Tsardom of Russia", HORDE_END + " -; 1596-01-01 MOSC", ["Belgorod"]);
  row("GH|Tsardom of Russia", HORDE_END + " -; 1638-01-01 MOSC", ["Kharkiv"]);
  row("GH|Tsardom of Russia", HORDE_END + " -; 1645-01-01 MOSC", ["Sloviansk", "Lyman"]);

  // ——— The Crimea, the Black Sea steppe, and the Sich ———
  // The steppe north of Perekop the Crimean Khanate's from Hacı I Giray's final enthronement (1449), the rest of the Horde's land
  // west of the Don at its end. Theodoro fell to the Ottomans in December 1475 and stayed theirs (the sanjak of Kefe).
  row("GH|Crimean Khanate", "1449-01-01 CRIM");
  row("THEO|Crimean Khanate", "1475-12-01 OTT");
  // The Zaporozhian Sich from Dmytro Vyshnevetsky's fort on Khortytsia (1556): the Dnieper's bend and the land north of the Konka.
  // The Azov steppe south of it stayed the Crimean Khanate's Nogais'.
  const SICH = ["Dnipropetrovsk", "Zaporizhia", "Vilniansk", "Novomykolaivka", "Orikhiv", "Huliaipole"];
  row("GH|Zaporozhian Cossacks", HORDE_END + " CRIM");
  row("GH|Zaporozhian Cossacks", HORDE_END + " CRIM; 1556-01-01 ZAPO", SICH);

  // ——— The North Caucasus ———
  // Kabardia and the mountain peoples in the Horde's place; the Lesser Nogai Horde on the Kuban from Kazy Mirza's migration (1557).
  row("GH|-", HORDE_END + " KABA", ["Kabardino-Balkaria", "Republic of North Ossetia-Alania"]);
  row("GH|-", HORDE_END + " NAKH", ["Chechen Republic", "Republic of Ingushetia"]);
  row("GH|-", HORDE_END + " ZICH", ["Karachay-Cherkess Republic"]);
  row("ZICH|-", "1557-01-01 SMNG", ["Krasnodar Krai"]);
}
