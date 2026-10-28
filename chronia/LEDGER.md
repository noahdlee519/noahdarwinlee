# CHRONIA's ledger

One entry per change to the maps, newest first, as [MAPMAKING.md](MAPMAKING.md#the-ledger) describes. A claim in progress is an entry with "Claimed by" and the date, replaced by the finished entry when the work is done.

Each entry:

```
## <years> | <region> | <polity or subject>

- What changed: …
- Tables: …
- Sources: (1) … (2) …
- Confidence: high, medium, or low, because …
- Alternatives: …
- Left out: …
```

---
## until 1885 | world | borders snapped to CShapes' lines of 1886

- Claimed by the capitals session, 27 October 2026: where a state's shape before 1886 matches its CShapes shape of 1886 but for thin slivers, it takes the CShapes lines, so the borders don't jump in detail at 1886. A new step after the overlaps are settled in `tools/build-eras.mjs`, and a rebuild.

## 1945–1990 | Central Europe | a strip of East Germany along the Bavarian–Czech border

- What changed: from 1945 to 1990, East Germany ran in a strip a few kilometres wide south of its real tripoint with Bavaria and Czechoslovakia near Prex, between Bavaria and Czechoslovakia past Selb to Schirnding. `CS_REDRAW` gave the first state all land within 25 km of its units that Natural Earth's western units leave out, so the strip between CShapes' and Natural Earth's lines for the Bavarian–Czech border went east. Each such piece now goes to the side whose units are nearer, and the strip is West Germany's again; Saxony's own tip at Bad Brambach stays East German.
- Tables: `CS_REDRAW` in `tools/build-eras.mjs`.
- Sources: (1) the Natural Earth units and CShapes shapes already used; (2) the Unification Treaty's boundary of the eastern states, as in the entry on the inner German border. Found from Noah's screenshot.
- Confidence: high.
- Alternatives: dropping the 25 km reach; it is still needed for the coast near Lübeck.
- Left out: nothing.

## 2500 BC–1885 | East, South, Southeast, and Inner Asia | stale snapshot states, dynasties by date, and the steppe

- What changed:
  - Snapshot states drawn after their end are ended (`HB_STALE`): the Sui after 618 (it was drawn over Tang China from 650 to 673, 3.85 million km²), the Tang after 907 (drawn to 959), Nanyue and Minyue after their annexation in 111 BC (drawn to 2 BC), the Maurya Empire's Ashokan peak after 232 BC (Cliopatria's later Maurya shape takes over), and Koguryo after 668 (drawn to 740).
  - States drawn before they began are left out for those years: the Xia before 2070 BC, the Han dynasty of the snapshot of 200 BC before 202 BC, the Kushan Empire before AD 43, the Gupta Empire before 320, the Sui before 581, the Pala Empire before 750, the Song before 960, and the Kingdom of Sukhothai before 1238. The Shang is not drawn after the Zhou conquest of 1046 BC.
  - Cliopatria's names by date: "Western Jin" is the Eastern Jin from 317 and the Liu Song from 421; "Cao Cao" is Cao Wei from 220 and Liu Bei's Han is Shu Han from 221; "Türgesh" over Mongolia is the Second Turkic Khaganate to 744; "Ngô dynasty" is the Đinh, Early Lê, and Lý by date to 1199; "Northern Song" is the Southern Song from 1127; Nanzhao ends in 902, with the Kingdom of Dali from 937; the Protectorate of the Western Regions after 316 is the Tarim Basin oasis states; the "Great Khanate" of 1400 is the Northern Yuan.
  - Peoples: the Xiongnu before Modu (to 210 BC), the Tibetans of the Era of Fragmentation (850 to 1199), the Mongols before 1206 (from 1150), and the snapshots' "Thai" and "Thai Kingdoms" (as Tai-Kadai peoples).
  - Taiwan from 1847 is under the Qing. The Talpurs' Sindh ends with the British conquest of 1843, and a Talpur shape in Gilgit and Hunza is left out.
  - The steppe and its neighbours have approximate borders (`APPROX`), as MAPMAKING asks: the Xiongnu, Xianbei, Rouran, the Göktürks, the Uyghur Khaganate, the Hephthalites, Kidarites, and Xionites, the Oghuz, the Qarluqs, the Wusun, the Yuezhi, the Kara-Khitans, the Tibetan Empire, Goguryeo, Balhae, and the Tarim oasis states.
- Tables: `HB_STALE`, `RENAME`, `NAME_FIX`, `APPROX`.
- Sources: (1) Twitchett and Loewe (eds.), *The Cambridge History of China*, vols. 1 (1986), 3 (1979), 5 (2009), and 6 (1994); Loewe and Shaughnessy (eds.), *The Cambridge History of Ancient China* (1999); Wright, *The Sui Dynasty* (1978); Mote, *Imperial China 900–1800* (1999). (2) Thapar, *Asoka and the Decline of the Mauryas* (1961, rev. 1997); Kulke and Rothermund, *A History of India* (2004); Goyal, *History of the Imperial Guptas* (1967); Majumdar (ed.), *The History of Bengal*, vol. 1 (1943). (3) Golden, *An Introduction to the History of the Turkic Peoples* (1992); Sinor (ed.), *The Cambridge History of Early Inner Asia* (1990); Di Cosmo, *Ancient China and Its Enemies* (2002); Barfield, *The Perilous Frontier* (1989); Beckwith, *The Tibetan Empire in Central Asia* (1987). (4) Lee, *A New History of Korea* (1984); Taylor, *A History of the Vietnamese* (2013); Wyatt, *Thailand: A Short History* (1984); Backus, *The Nan-chao Kingdom* (1981). (5) Shepherd, *Statecraft and Political Economy on the Taiwan Frontier* (1993); Lambrick, *Sind* (1964). Page numbers not checked.
- Confidence: high for the end dates and the names; medium for the Xia (unproven archaeologically, kept only in the traditional years), the Xiongnu before 209 BC, and the Tarim name.
- Alternatives: the Yuan's rule of Tibet from the 1260s rather than 1294 (the existing row only changes the ruler's name from the Mongol Empire to the Yuan, so it stands); the Zhou world of the snapshots as "Chinese states" rather than Eastern Zhou, and the late Sui of 619 to 627 as Tang, both left for a closer look; the State of Han of 250 to 231 BC, drawn at 227,000 km² by the snapshots, left, since dropping it also drops the real state.
- Left out: Eastern Zhou is still drawn at the size of the Zhou world (450,000 to 970,000 km²), since the snapshots' Zhou shapes are joined to Cliopatria's royal domain; the Yuan over Ming China in 1368 to 1374; the Tang's peak shapes of 626 to 681; the Northern Song's shape over the Jin lands in 1127 to 1138; the Ming of 1415 to 1439 at 6.2 million km²; Majapahit's oversized shapes; Taiwan blank from 1683 to 1846; each Sri Lankan kingdom drawn as the whole island.

## 3400 BC–1885 | Europe, the Mediterranean, Egypt, the Near East, and Iran | names, stale states, and tributaries

- What changed:
  - Cliopatria's "Macedonian Empire" is the Kingdom of Macedonia from 318 BC only where the shape is Macedon itself (a box), so Alexander's former empire is no longer called the Kingdom of Macedonia (4.8 million km² in 311 BC); the Ptolemaic name on the empire's shape in 331 to 324 BC is the Macedonian Empire.
  - Egypt follows Shaw: the Old Kingdom from 2686 BC; the Twenty-first Dynasty from 1069 BC and the Twenty-second from 945 BC, not the New Kingdom; Achaemenid from the conquest of 525 BC. The Hyksos are not drawn after their expulsion (about 1550 BC).
  - The Achaemenid Empire is not drawn before Cyrus (600 to 551 BC); Lydia is Achaemenid from 545 BC and Babylon from 538 BC.
  - The Hittites are not drawn after the collapse of about 1180 BC; the Gutians after the fall of Akkad (2153 to 2001 BC) are a people.
  - States the snapshots draw after their end are ended (`HB_STALE`): the Seleucid Kingdom after 141 BC, the Kingdom of Lysimachus after 281 BC, the Sasanian Empire after 651 (it was drawn over Iran in AD 700) and its dependencies after 628, Khazaria after 979, and Armenia after 1064.
  - The Nicaean Empire is the Byzantine Empire from 1262; the Almohad Caliphate's shape is the Marinid Sultanate from 1269; the Gallic Empire's shape is the Roman Empire from 275; the Idrisids before 793 and the Aghlabids before 800 are not drawn.
  - Wallachia (from 1462), Moldavia (from 1538), Transylvania (1572 to 1687), the Eastern Hungarian Kingdom (1541 to 1570), and the Crimean Khanate (1478 to 1773) are Ottoman dependencies, shown in the Ottoman colour with the Ottoman Empire as ruler.
- Tables: `NAME_FIX`, `HB_STALE`.
- Sources: (1) Errington, *A History of Macedonia* (1990); Bosworth, *Conquest and Empire* (1988). (2) Shaw (ed.), *The Oxford History of Ancient Egypt* (2000); Kitchen, *The Third Intermediate Period in Egypt* (1996). (3) Briant, *From Cyrus to Alexander* (2002); Kuhrt, *The Persian Empire* (2007). (4) Bryce, *The Kingdom of the Hittites* (2005); Sallaberger and Schrakamp (eds.), *ARCANE* III (2015), for Akkad and the Gutians. (5) Sherwin-White and Kuhrt, *From Samarkand to Sardis* (1993); Lund, *Lysimachus* (1992); Daryaee, *Sasanian Persia* (2009); Pourshariati, *Decline and Fall of the Sasanian Empire* (2008); Golden, *Khazar Studies* (1980). (6) Angold, *A Byzantine Government in Exile* (1975); Abun-Nasr, *A History of the Maghrib in the Islamic Period* (1987); Drinkwater, *The Gallic Empire* (1987). (7) Inalcik, *The Ottoman Empire: The Classical Age* (1973); Fine, *The Late Medieval Balkans* (1987). Page numbers not checked.
- Confidence: high for the Macedonian, Egyptian, Persian, Sasanian, and Seleucid dates; medium for the Ottoman dependencies (the tie varied over three centuries) and for Khazaria, whose end is dated from 965 to 1016.
- Alternatives: the Ilkhanate's end in 1335 or 1353 (Cliopatria's 1343 kept); the Gutians as a dynasty rather than a people; the Kingdom of Odoacer for Italy in 476 to 492 and Poland as a duchy in its ducal years, not taken pending a check of the shapes.
- Left out: the Antigonid realm of 307 to 302 BC and the lands of Alexander's empire after 318 BC, still one shape; Egypt under the Assyrian shape after about 656 BC; Italy and Pannonia in the late 5th century as one polygon; Ur III; the "tribes" catch-all names (Germanic, Slavic, Baltic, Berber).

## 1-1885 | Africa and Arabia | maximal fills, stale states, and mislabelled shapes

- What changed:
  - Arabia: the snapshots' "Nejd", which filled the Rub' al Khali and made the Emirate of Diriyah 640,000 to 1,036,000 km² from 1749, is no longer drawn, so Diriyah and the later Emirate of Nejd are Cliopatria's year-by-year shapes (5,600 km² in 1750, 830,000 km² in 1800). "Arabia", a region drawn as a state of about a million km² from 1847 (which also made a false disputed stripe with Nejd in 1850), is left out. Cliopatria's British dependency over the Hadhramaut in 1870 to 1885, before the protectorate treaties, is left out. A stray Ottoman triangle south of Qatar (1794 to 1802 and 1815 to 1852) is left out. Oman of 1650 to 1743 is the Yarubid dynasty.
  - The Sahel: the Ghana Empire is not drawn before 793; the Songhai of 1592 to 1624, the pre-conquest empire drawn over the Saadi Niger bend after Tondibi, is left out.
  - Nubia, Aksum, and Yemen: Kush is not drawn after 347; the snapshots' Aksum, its 6th-century peak repeated for four centuries, is left out for Cliopatria's Kingdom of Aksum; Himyar is Sasanian Yemen from 575; the Hejaz is tribal to 632 and the Caliphate's after.
  - Southern and eastern Africa: Great Zimbabwe of 950 to 1199 is the Zimbabwe culture, a people; the "Islamic city-states" are the Swahili city-states; the Swahili coast of 1742 to 1805 is not an Omani dependency; Madagascar outside the Merina Kingdom (from 1540) and "Somalia" are peoples; the Zulu are the Zulu Kingdom from 1816 to 1879.
  - Mislabelled shapes: the snapshots' "Lozi" at 5° S is the Kuba Kingdom, and the Kololo hold the Lozi shape from 1838 to 1863; Cliopatria's "Kingdom of Lunda", on the Kongo core, is the Kingdom of Kongo; "Congo" loses its French ruler; "Sotho" and "Africa" in southern Nigeria are left out; "Algiers" in the Sahara after 1830, the Toucouleur before Umar Tall took Segu (the Bamana Empire), and the Yeke and Mirambo's state before their founders are left out or renamed; the "Dutch settlements" are the Dutch Cape Colony.
  - Borders by allegiance are approximate (`APPROX`): the Sokoto Caliphate, Darfur, Wadai, and the emirates of Diriyah, Nejd, and Jabal Shammar.
- Tables: `RENAME` ("Axum" as Aksum, "Makkura" as Makuria, the 1815 "Nejd" as Najd, so the snapshots' shapes are spans of their own that `NAME_FIX` can drop), `NAME_FIX`, `APPROX`.
- Sources: (1) Vassiliev, *The History of Saudi Arabia* (1998); Al-Rasheed, *A History of Saudi Arabia*, 2nd ed. (2010); Abu Hakima, *History of Eastern Arabia, 1750–1800* (1965). (2) Hickinbotham, *Aden* (1958); Gavin, *Aden under British Rule* (1975); Ingrams, *Arabia and the Isles*, 3rd ed. (1966). (3) Levtzion, *Ancient Ghana and Mali* (1973); Hunwick, *Timbuktu and the Songhay Empire* (1999). (4) Edwards, *The Nubian Past* (2004); Welsby, *The Kingdom of Kush* (1996); Munro-Hay, *Aksum* (1991); Bowersock, *The Throne of Adulis* (2013). (5) Huffman, *Handbook to the Iron Age* (2007); Pikirayi, *The Zimbabwe Culture* (2001); Horton and Middleton, *The Swahili* (2000); Brown, *A History of Madagascar* (1995); Lewis, *A Modern History of the Somali* (2002). (6) Vansina, *Kingdoms of the Savanna* (1966); Thornton, *The Kingdom of Kongo* (1983); Last, *The Sokoto Caliphate* (1967).
- Confidence: high for Arabia, Kush, the Songhai, the Zimbabwe culture, and the Kuba; medium for Ghana's start (Soninke tradition dates Wagadu to about 300), Aksum, and the Kongo renames.
- Alternatives: the Rub' al Khali as Diriyah's because its Bedouin paid zakat (rule, not reach); the Sakalava kingdoms of Madagascar as states (no shape).
- Left out: the Ottoman al-Hasa coast of about 1670 to 1795, when it was the Bani Khalid's, and Diriyah's corridor to the Trucial coast in 1800, which are joined to the main shapes and need a cut; Diriyah's own shape of 1803 to 1812, with the Rub' al Khali and the Tihama; the Khedivate's hold on the whole Sudan in 1883 to 1885, after the Mahdist conquests.

## 3400 BC–1885 | the Americas and Oceania | peoples, colonial names, and the Pacific

- What changed:
  - Native Land's present-day nations on the map of 1492 (about 1,100 shapes, 1446 to 1499) and about 150 nations on the later maps were coloured states with firm borders; they are peoples now, so the Inca and the Aztec Triple Alliance get back the land those shapes took (the Inca was cut to 156,000 km² in 1460 by "Wari", "Quechua", and "Aymara").
  - Archaeological cultures drawn as states are peoples: the Olmec (a culture from 1200 BC, not drawn before), Classic Veracruz, the Chaco and Aztec Ruin systems of the Ancestral Puebloans, Moche, Nazca, Paracas, Wankarani, the Hopewell groups, and the Paleo-Inuit. Wari and Tiwanaku are so spelt and end in 1000 and 1100; the Mixtecs and Zapotecs are city-states.
  - Spanish America: the "Viceroyalty of New Spain" of 1515 to 1525, before the conquest and the viceroyalty, is left out, and that of 1526 to 1533 is the Spanish Empire; the Spanish Central America of 1519 and 1520 (1.1 million km²) is left out; the Inca shape of 1534 to 1539 is the Governorate of New Castile, with the Neo-Inca State from 1540; "Republic of Peru" (1762 to 1821) is the Viceroyalty of Peru; "Río de la Plata" is the Viceroyalty of Peru to 1775, the Viceroyalty of the Río de la Plata from 1776, and the United Provinces from 1811; "New Granada" is the Viceroyalty of New Granada to 1810 and Gran Colombia in 1820 and 1821; the Federal Republic of Central America is so named.
  - North America: "Canada" of 1808 to 1866 is British North America, under Britain; Rupert's Land is under Britain; Greenland is a Danish colony; the Comanche are not drawn before 1700.
  - Oceania: the Māori are a people to 1840, and New Zealand a British colony from 1841; the Tuʻi Tonga Empire starts about 950 and is the Tongan and Fijian chiefdoms from 1500; Fiji is chiefdoms to 1870 and the Colony of Fiji from 1874; Tonga is the Kingdom of Tonga from 1847.
- Tables: `NAME_FIX`, `PEOPLES`, `HB_STALE`, and `NATIVE_LAND_STATES` with one line in `isPeople`.
- Sources: (1) Burkholder and Johnson, *Colonial Latin America*, 8th ed. (2012); Haring, *The Spanish Empire in America* (1947); Lockhart and Schwartz, *Early Latin America* (1983). (2) Hemming, *The Conquest of the Incas* (1970); D'Altroy, *The Incas*, 2nd ed. (2015). (3) Buckner (ed.), *Canada and the British Empire* (2008); Rich, *The History of the Hudson's Bay Company* (1958); Gad, *The History of Greenland* (1970). (4) Orange, *The Treaty of Waitangi* (1987); Campbell, *Island Kingdom* (1992); Kirch, *On the Road of the Winds* (2017). (5) Diehl, *The Olmecs* (2004); Janusek, *Ancient Tiwanaku* (2008); Silverman and Proulx, *The Nasca* (2002); Quilter, *The Moche of Ancient Peru* (2010). (6) Sturtevant (ed.), *Handbook of North American Indians* (1978–2008); Waldman, *Atlas of the North American Indian* (2009); Hämäläinen, *The Comanche Empire* (2008).
- Confidence: high for the names, dates, and signs; medium for the shapes, which stay Cliopatria's and the snapshots'.
- Alternatives: Moche as one state (Donnan, 2004), not taken; Tiwanaku's end in 1000 (Janusek), not taken for the later date. Naming the Spanish Empire's pieces by viceroyalty with boxes was left for later.
- Left out: the Inca's peak shape of 1497 to 1533; the Chimú coast after the Inca conquest of about 1470; the viceroyalties inside "Spanish Empire" (New Spain, Peru, and New Granada before 1752); the Dominion of Canada of 1867 to 1869, still drawn at 7 to 9 million km²; Rupert's Land, Greenland, Spanish Louisiana, and New South Wales drawn as claims.

## 1886–1918 and every year | world | phantom borders inside a state, and borders lost near later reservoirs

- What changed: three faults in the page's drawing, none in the data.
  - Inside the Ottoman Empire's Iraq from 1886 to 1918, a broken border with its colour band, and a row of dots, ran across the desert from near Damascus to Basra. Two pieces of the one span met along a line, so the topology stored that line as an arc the span uses twice; `outerEdges` counted it as an edge the span shares with no other shape, and drew it as a border. An arc one shape uses twice is now inside it. Arcs of zero length, which quantizing leaves where two pieces meet at a point, were drawn as dots and are now left out.
  - Every lake of 800 km² or more in UCHRONIA's lakes was cut out of the coast grid at every date, so a border within about 30 km of a reservoir built later counted as a shore and lost its line. Only the lakes shown at the date are cut out now.
- Tables: none; `outerEdges`, `coastOf`, and `syncGrid` in `app.js`.
- Sources: none needed; these were drawing faults, found from Noah's screenshot of Iraq in 1890.
- Confidence: high.
- Alternatives: dissolving the pieces in the builder, which `dissolveFeat` already tries; the page's test also covers what it misses.
- Left out: the coast fill can still spill a few kilometres into blank land behind a thin coastal state (the Emirate of Diriyah's strip on the Trucial coast in 1800), since the page can't tell the inland edge of a thin strip from a coast.

## 3400 BC–1885 | world | overlaps the overlap rules missed

- What changed: `resolveOverlaps` missed two kinds of overlap, which then showed as crossed borders: pairs whose 0.25° cells lie side by side without sharing one (most often two small peoples), and pairs where polygon-clipping returned an empty intersection without throwing. The cell test now counts neighbouring cells for a smaller shape of up to 40 cells (`NEAR_CELLS`), and an empty intersection between shapes sharing more than two cells is tried again with the points rounded to a millionth of a degree. In 1800 the built data had 326 overlaps of 50 km² or more before the change, 319 of them between Aboriginal nations, and 7 between states (the Durrani and Sikh Empires, 896 km²; Prussia and the French Consulate, 573 km²; and others).
- Tables: `resolveOverlaps` in `tools/build-eras.mjs`.
- Sources: none needed; the rules are those of MAPMAKING.md.
- Confidence: high for the method; the counts after the change are in the build's log line ("retried").
- Alternatives: none.
- Left out: overlaps under 50 km² (`OVERLAP_KM2`), as before.

## 1886–2019, and the lineages before | world | base colours from Noah's UCHRONIA map

- What changed: the states of 2019 take the colours of the map Noah coloured in UCHRONIA and saved on 27 October 2026, the same colours UCHRONIA now opens in. `BASE_COLOURS` gives 196 states by name (it gave 132, read off a screenshot of an earlier reference map); 31 changed colour, among them India, Iran, Egypt, Libya, Pakistan, Peru, and Venezuela, and 64 are newly fixed. Each lineage carries its state's colour back through time, so Safavid Iran takes Iran's lime. Only `eras.json` changed; the borders and the yearly files are the same as before.
- Tables: `BASE_COLOURS` in `tools/build-eras.mjs`; `BASE_COLORS` in UCHRONIA's `app.js`.
- Sources: (1) Noah's UCHRONIA save of 27 October 2026, matched to the states of 2019 by name (Bosnia and Herzegovina as Bosnia-Herzegovina, Ivory Coast as Côte d'Ivoire, Saint Vincent and Saint Kitts as in CShapes).
- Confidence: high; the colours are Noah's choice.
- Alternatives: keeping the earlier reference map's colours.
- Left out: UCHRONIA's dependencies and other areas that CHRONIA doesn't draw as states of their own (Hong Kong, Western Sahara, Somaliland, and so on), and Antarctica, which CHRONIA doesn't draw. 25 touching pairs of lineages now share a colour at some time (20 before); each is drawn apart by colours by date while they touch, except the Republic of Venice and the Mongol Empire in 1241, and France and Saint Barthélemy, which is French and shares its colour in Noah's map too.

## 1893–2026 | Brazil, Argentina, Spain, France, Japan, and Nigeria | first-level divisions

- What changed: the first-level divisions of six more countries are drawn, each from the date since which Natural Earth's present shapes have held, with the older names and the merged divisions of the years between (README, "First-level divisions"). All the divisions from Natural Earth are now drawn at the detail of UCHRONIA's `provinces-detail.json`, with internal lines simplified to about 0.5 km instead of 1.6 km.
- Tables: `NE_REGIONS`, `ES_COMMUNITIES`, `FR_OLD`, and `FR_MERGED` in `tools/build-divisions.mjs`.
- Sources: (1) Natural Earth, admin-1 states and provinces, 10 m. (2) For the dates: Brazil, Complementary Law 31 of 1977 (Mato Grosso do Sul, installed 1 January 1979), Complementary Law 41 of 22 December 1981 (Rondônia, installed 4 January 1982), and the Constitution of 5 October 1988; Argentina, Law 14,408 of 1955 and Law 23,775 of 26 April 1990 (Tierra del Fuego), and the Constitution of the City of Buenos Aires of 1 October 1996; Spain, the statutes of autonomy of 25 February 1983 and of Ceuta and Melilla of 14 March 1995; France, the decree of 9 January 1970 (Corsica), Law 2015-29 of 16 January 2015, and Decrees 2016-1262 to 2016-1268 of 28 September 2016; Japan, the transfer of the Tama districts to Tokyo on 1 April 1893 and the Tokyo Metropolis of 1 July 1943; Nigeria, the creation of six states on 1 October 1996.
- Confidence: high for the shapes after each start date, medium for the start dates of Argentina (1956 is a safe year after the renamings of late 1955, not the day of a law) and of France's overseas regions, which were departments, not regions, until 1982.
- Alternatives: Tierra del Fuego as a province from the swearing of its constitution on 1 June 1991 rather than the law of 1990.
- Left out: Italy, whose regions changed slightly in 2009 and 2017; the divisions before each start date; Fernando de Noronha, which Natural Earth's simplified provinces leave out.

## 1400–2019 | Alps, Pyrenees, and Apennines | the gaps beside Liechtenstein, Andorra, and San Marino

- What changed: blank slivers up to about 3 km wide lay along Liechtenstein's border with Austria and around Andorra (and smaller ones beside San Marino), where Natural Earth's outline of the microstate, which the builder cuts into its neighbours, differs from their borders in CShapes and Cliopatria. Land within 4 km of these three that no shape covers is now theirs, worked out separately for each stretch of years in which their neighbours' shapes stay the same.
- Tables: `gapKm` in `SMALL`, applied by `fillSmallGaps` after the overlaps are settled.
- Sources: none needed; these were gaps between two sources' outlines of the same border.
- Confidence: high.
- Alternatives: giving the gaps to the neighbours; the microstates' own outlines are the more detailed.
- Left out: the other small territories, which are on coasts, where such a buffer would reach into the sea.

## 3400 BC–1199 | world | yearly borders before 1200

- What changed: the borders change year by year from 3400 BC, from Cliopatria, instead of from 1200; historical-basemaps' 23 maps from 3000 BC to 1100 are no longer shown as maps, and fill the land Cliopatria leaves blank, each from halfway after the map before to halfway before the map after, as its later maps do. Cliopatria's states before 1200 have firm borders, like its later ones, by the precision rule; the peoples and the states from the snapshots keep their dotted borders. On the page, play goes from one change of borders to the next until 1200, 0.8 seconds apart, then year by year. The changes before 1200 are 327 years, in 46 century files.
- Tables: `DATED_FROM` and `FIRST` (-3400) in the builder; `KNOTS` and `PLAY.early` on the page.
- Sources: (1) Bennett and others, "Cliopatria", *Scientific Data* 12 (2025), version 0.2.1, which covers 3400 BC to 2024. (2) Ourednik, historical-basemaps, maps of 3000 BC to 1100.
- Confidence: medium after 500 BC, low before 1000 BC, where Cliopatria has a few dozen states and the rest of the land comes from snapshots up to a thousand years apart.
- Alternatives: keeping the snapshot maps to 1100 (as before); starting the yearly data at 500 BC or AD 1 (Noah chose 3400 BC); dotting every border before 1200, as on the snapshots.
- Left out: the China Historical GIS, whose terms ("free for academic research, no commercial use, resale, or redistribution permitted") forbid serving its shapes, and whose download can't be reached from Claude's sessions; the Chinese dynasties come from Cliopatria and the snapshots.

## 106–117 | Roman Empire | the provinces

- What changed: the Roman Empire is drawn as a state of states in these years, like the Holy Roman Empire: one colour and one name, and its 42 provinces and Italy's 11 Augustan regions inside, divided by fine broken lines. Armenia et Mesopotamia is a province from 114.
- Tables: `tools/roman-provinces.json` and `PROVINCE_SETS` in the builder.
- Sources: (1) the Digital Atlas of the Roman Empire (DARE), Johan Åhlfeldt, Lund University, provinces as published in klokantech/roman-empire, CC BY. (2) Bennett, *Trajan: Optimus Princeps* (1997), and Birley, *Hadrian: The Restless Emperor* (1997), for the dates: Dacia and Arabia annexed in 106, Armenia in 114, Mesopotamia in 116, and both given up by Hadrian on his accession in 117.
- Confidence: medium; DARE's map is of Trajan's reign but not of one year: it still draws Galatia with Cappadocia, separated under Trajan, and Epirus within Achaia, made a province of its own under him.
- Alternatives: the Ancient World Mapping Center's provincial boundaries of about AD 200 and after Diocletian (ODbL), which are unnamed lines only and leave out Britain's divisions; a wider stretch of years, which would draw Trajan's provinces in years they did not exist.
- Left out: the provinces in every other year; Epirus; Cappadocia apart from Galatia; the client kingdoms.

## 3400 BC–1199 | world | names before 1200

- What changed: with the yearly data back to 3400 BC, the snapshots' names and Cliopatria's met on one map, and some were wrong for their years.
  - Duplicates, merged into one name so the snapshot's land joins Cliopatria's state (`RENAME`, `CLIO_NAME`): the Mauryan Empire and the Maurya Empire; Parthia and the Parthian Empire; Saba and the Sabaeans; the Carthaginian Empire and Carthage; the Nabatean Kingdom, Cliopatria's Nabataeans, and the Nabataean Kingdom; the Bosporian Kingdom, Cliopatria's Cimmerian Bosporus, and the Bosporan Kingdom; Bactria (256 to 120 BC) and the Greco-Bactrian Kingdom; Nan-Yue and Nanyue; Min-Yue and Minyue; Hadramaut and Hadhramaut; Meroe and the Kingdom of Kush; the Kadambas, the Chalukyas, the Palas, and the Cholas and their empires and dynasties; Chola (AD 150 to 249) and the Early Cholas; the Avars and the Avar Khaganate, which ends in 805 (`HB_STALE`); the Frankish Kingdom and the Kingdom of the Franks; the Western Gokturk Khaganate and the Western Göktürks; the Volga Bulgars and Volga Bulgaria; Ghana, the Empire of Ghana, and the Ghana Empire; the Khazars and Khazaria; the Idrisid Caliphate and the Idrisids; Chámpa and Champa; the West, East, and Middle Franks and West, East, and Middle Francia; the Magadha of the snapshots and Cliopatria's Haryanka and Shaishunaga Magadha; the snapshots' "Rome" (250 to 101 BC) and the Roman Republic; and the four tetrarchs' domains of AD 300 and the Roman Empire.
  - Archaeological cultures and broad groups drawn as states are peoples, under the names scholarship uses (`RENAME`, `PEOPLES`): the Andronovo, Afanasievo, Sintashta, Bell Beaker, Únětice, Namazga, Valdivia, Chorrera, Chavín, Chinchorro, Jōmon, and Yayoi cultures, the Oxus civilisation, Norte Chico, El Paraíso, the Laurel and Point Peninsula complexes; the Celts, Celtiberians, Illyrians, Thracians (before 551 BC), Dacians, Phrygians, Arameans, and Scythians, and the snapshots' Sarmates and Saces (Sarmatians and Saka); the "Burmese" and "Tibeto-Burmanese" of 1750 BC as Tibeto-Burman peoples, and the Korean, Malay, Mon-Khmer, and Papuan peoples; and the groups the snapshots draw as states, under the snapshots' names (Tupis, Mandes, Bedouins, Azandes, Anasazi, Mogollon, Samis, Finns, Balts, Karelians, Danes, Frisians, Peshemegs, Karluks, Khitans, Bulgars, and others).
  - Names out of their time (`NAME_FIX`): Egypt before 3000 BC is the Naqada culture; the snapshots' Ur, drawn from 3400 to 1751 BC, is the Third Dynasty of Ur from 2112 to 2004 BC and dropped otherwise; Kush in 1750 to 1501 BC is Kerma, and is dropped from 1500 to 1071 BC, when Egypt held Nubia; "Zhoa" is the Zhou dynasty, dropped before 1046 BC and after 751 BC, when Cliopatria's states of the Spring and Autumn period hold the land; Cliopatria's Later Zhou of 750 to 257 BC is Eastern Zhou; its Macedonian Empire is the Kingdom of Macedonia before 336 BC and from 318 BC; its Han of 404 to 230 BC the State of Han; its Great Yuan Dayuan, in Ferghana; its Kingdom of Italy before 774 the Kingdom of the Lombards; the Greek Dark Ages Dark Age Greece, a people; the snapshots' Kingdom of David and Solomon, drawn from 1750 to 601 BC, is left out, Cliopatria's Kingdoms of Israel and Judah holding the land; and the snapshots' Hittites before 1650 BC, their Kush after AD 350, and their Sasanian dependencies after 651 are left out.
- Tables: `RENAME`, `CLIO_NAME`, `PEOPLES`, `HB_STALE`, and `NAME_FIX`; `readHb` now renames a shape's `PARTOF` as well as its name.
- Sources: (1) Shaw (ed.), *The Oxford History of Ancient Egypt* (2000), for the Naqada culture and the Early Dynastic Period from about 3000 BC. (2) Van De Mieroop, *A History of the Ancient Near East, ca. 3000–323 BC* (3rd ed., 2016), for the Third Dynasty of Ur in the Middle Chronology. (3) Edwards, *The Nubian Past* (2004), for Kerma and New Kingdom Nubia. (4) Loewe and Shaughnessy (eds.), *The Cambridge History of Ancient China* (1999), for the Zhou conquest of about 1046 BC, Eastern Zhou from 770 BC, and the state of Han to 230 BC. (5) Anthony, *The Horse, the Wheel, and Language* (2007), for the Afanasievo, Sintashta, and Andronovo cultures. (6) Errington, *A History of Macedonia* (1990). (7) Hulsewé and Loewe, *China in Central Asia* (1979), for Dayuan as Ferghana. (8) Wickham, *Early Medieval Italy* (1981), for the Lombard kingdom to 774. (9) Rees, *Diocletian and the Tetrarchy* (2004), for the tetrarchy as one empire. (10) Snodgrass, *The Dark Age of Greece* (1971). (11) Finkelstein and Mazar, *The Quest for the Historical Israel* (2007), for the debate over the United Monarchy. (12) Bryce, *The Kingdom of the Hittites* (2nd ed., 2005), for the Old Kingdom from about 1650 BC. (13) Daryaee, *Sasanian Persia* (2009), for the empire's end in 651. (14) Edwards (above) and Welsby, *The Kingdom of Kush* (1996), for Kush's end in the 4th century. The merged duplicates need no source beyond the two datasets.
- Confidence: medium; these are the most visible errors, found by listing the largest states of each century and the pairs of like names side by side, not a full pass.
- Alternatives: the traditional date of 1122 BC for the Zhou conquest; the United Monarchy drawn as approximate, as some archaeologists would allow for the 10th century BC.
- Left out: many smaller snapshot names that a full pass would fix, among them "Hindu kingdoms", "Satavahanihara" in AD 300, "Dumonii", "Mascat", and "Suren Kingdom"; Cliopatria's Shang dynasty runs to 1001 BC, after the Zhou conquest.

## 1400–1885 | world | capitals

- What changed: states and dependencies on the yearly maps show their capitals from 1400, year by year, where Wikidata records one, so capital marks no longer stop at 1886. 4,321 spans have a capital for some or all of their years. The Ottoman Empire's moves from Bursa to Edirne to Constantinople, the Kingdom of France at Versailles from 1682 to 1789, Safavid Iran at Tabriz, Qazvin, and Isfahan, and the Ming court's move to Beijing in 1421 come from Wikidata's dates.
- Tables: `tools/capitals-wikidata.json` (fetched by `tools/fetch-capitals.mjs`), `CAP_FROM`, `CAP_SKIP`, `CAP_DROP`, `CAP_NAME`, `CAP_NEAR_DEG`, and `CAP_SAME_KM` in the builder; the rules are in the README, step 10 of "From 1200 to 1885".
- Sources: (1) Wikidata, capital (P36) statements with their start and end dates (P580, P582), ranks, and the capitals' coordinates, fetched on 27 October 2026 for the 575 states whose Wikipedia articles have them. (2) The states' Wikipedia articles, through which the states are matched, for the spot checks above. Hungary: Engel, *The Realm of St Stephen* (2001), on Buda as the royal seat and Székesfehérvár as the coronation city. Morocco: Rabat became the capital under the protectorate in 1912. Montserrat: Brades has been the de facto capital since the eruption of 1997.
- Confidence: medium, because Wikidata is uneven: the well-studied states have dated statements, many others have one capital with no dates, and some have none. The two sources are not independent, since Wikidata's statements are often taken from Wikipedia.
- Alternatives: a hand-made table of capitals by date from the atlases in MAPMAKING, which would be better and is left for later; a single capital per state, as CShapes has after 1886, which would show later capitals for earlier years.
- Left out: the Holy Roman Empire, whose statements are the seats of its institutions; states whose capitals have no dates and lie far apart, such as the Mughal Empire between Delhi and Lahore outside its dated stretches, the Crown of Castile, and Konbaung Burma; capitals more than about 30 km outside the state's land in that year, such as London for British North America; and everything before 1400.

## 1200–1806 | Central Europe and Italy | the Holy Roman Empire as a state of states

- What changed: the Empire is drawn in one colour with its members inside it, divided by fine broken lines, instead of as one shape beside states that sources sometimes do and sometimes don't mark as members. Membership follows historical-basemaps' outline of the Empire on its maps of 1279, 1300, 1400, 1492, 1500, 1530, 1600, 1650, and 1700; states astride the outline are cut along it (the Habsburg Monarchy into its Austrian and Bohemian lands and its Hungarian lands).
- Tables: `GROUPS` in `tools/build-eras.mjs`.
- Sources: (1) Whaley, *Germany and the Holy Roman Empire*, 2 vols (2012). (2) Wilson, *Heart of Europe: A History of the Holy Roman Empire* (2016). (3) Ourednik, historical-basemaps, for the outlines.
- Confidence: medium; the outline is an atlas convention, and membership at the edges (imperial Italy, the Swiss, the Low Countries, the Teutonic Order) was disputed in law and practice.
- Alternatives: keeping members in their own colours inside a heavy imperial outline; Noah chose one colour.
- Also: Cliopatria draws the Electorate of Saxony inside the Polish-Lithuanian Commonwealth from 1700 to 1762, during the personal union of Augustus II and Augustus III; it is Saxony again (`NAME_FIX`), since a personal union is not one state.
- Left out: the Imperial Circles, and the hundreds of small territories the sources draw as one "Holy Roman Empire" shape.

## 1886–2019 | North Pacific | the middle and northern Kuril Islands

- What changed: Urup and the islands north of it were blank in every year, since CShapes leaves them out. They are now Japan's until 4 September 1945, the Soviet Union's from 5 September 1945, and Russia's from 26 December 1991.
- Tables: `SMALL`.
- Sources: (1) Stephan, *The Kuril Islands: Russo-Japanese Frontier in the Pacific* (1974). (2) The Treaty of Saint Petersburg (1875), by which Russia ceded Urup and the islands north of it to Japan.
- Confidence: high.
- Alternatives: none.
- Left out: nothing.

## Before 1653, 1818, 1851, and 1935 | England and Italy | the Fens, Whittlesey Mere, and the Pontine Marshes

- What changed: the Fens are drawn as marsh until 1653 (the Great Level) and 1818 (the Lincolnshire fens), Whittlesey Mere as a lake until 1851, and the Pontine Marshes as marsh until 1935. Their outlines are contoured from elevation, at 5 m and 25 m, since no source maps their old edges.
- Tables: `tools/wetlands.json`, `addMarsh` and `addLake` in `tools/build-geography.mjs`.
- Sources: (1) Darby, *The Draining of the Fens* (1940; 2nd ed. 1956). (2) Darby, *The Changing Fenland* (1983), on Whittlesey Mere. (3) Snowden, *The Conquest of Malaria: Italy, 1900–1962* (2006), and Caprotti, *Mussolini's Cities* (2007), on the Pontine reclamation.
- Confidence: medium for the dates, low for the edges, which are the extent of the low ground rather than of the water.
- Alternatives: a single date for all the Fens; the northern fens were drained a century and a half after the southern.
- Left out: the seasonal floods, the meres other than Whittlesey, the Somerset Levels, and the Wash's reclaimed salt marshes.

## 1932–1968 | Netherlands | the IJsselmeer's islands

- What changed: tiny holes under 0.5 km² that the cuts along the polders' dikes left in the past IJsselmeer, drawn as dots along its shores, are gone.
- Tables: `simplePolys` in `tools/build-geography.mjs`.
- Sources: none needed; these were artefacts.
- Confidence: high.
- Alternatives: none.
- Left out: nothing.

## 1200–1399 | world | yearly borders from 1200

- What changed: the yearly borders now start in 1200, not 1400 (`DATED_FROM`). The snapshot maps of 1200, 1279, and 1300 are no longer shown as maps; like the later snapshots, they fill the land Cliopatria leaves blank. `REGIMES` for France, England and Britain, and Portugal start in 1200.
- Tables: `DATED_FROM`, `REGIMES`.
- Sources: (1) Bennett and others, "Cliopatria", *Scientific Data* 12 (2025), version 0.2.1. (2) Ourednik, historical-basemaps, maps of 1200, 1279, and 1300.
- Confidence: medium, because Cliopatria is thinner before 1400 outside Eurasia, so more of the map comes from the three snapshots.
- Alternatives: keeping 1400 as the start, which leaves the Mongol conquests as three jumps.
- Left out: the small territories table (`SMALL`) still starts in 1400, so San Marino, Andorra, the Isle of Man, and the Channel Islands are under their neighbours before then.

## 1200–1399 | Asia | Mongols, Seljuk successors, Tibet, Central Asia

- What changed: the Mongols are a people from 1200 to 1205, before the khanate of 1206. Cliopatria's and historical-basemaps' "Great Seljuk" and "Seljuk Caliphate" after their ends are the Khwarazmian Empire, the Sultanate of Rum, the Ilkhanate, and the Eretnids, by year and box; the "Hamdanid Emirates" of the snapshots are the Saltukids, the Eldiguzids, the Khwarazmians, the Ayyubids, the Mongols, and the Uyunids by year; "Buwayhid" is the Uyunid emirate. The Buyids and the Ghaznavids are dropped after their ends. Kara-Khitan names are the Qara Khitai; "Great Khanate" is the Jurchens, then the Northern Yuan. Tibet is held by the Yuan from 1294 to 1353, then is the Phagmodrupa. The Tibetans are a people before. The Volga Bulgars are Volga Bulgaria, and the Cuman khanates Cumania.
- Tables: `NAME_FIX`.
- Sources: (1) Bosworth, *The New Islamic Dynasties* (1996), entries for the Seljuks, Khwarazm Shahs, Eldiguzids, Saltukids, Eretnids, and Uyunids. (2) Biran, *The Empire of the Qara Khitai in Eurasian History* (2005). (3) Petech, *Central Tibet and the Mongols* (1990). (4) Atwood, *Encyclopedia of Mongolia and the Mongol Empire* (2004), "Yuan dynasty", "Northern Yuan". (5) Golden, *An Introduction to the History of the Turkic Peoples* (1992), on the Cumans and the Volga Bulgars.
- Confidence: medium, because the snapshot shapes the names land on are themselves coarse.
- Alternatives: Tibet as independent under the Sakya; Petech treats the Sakya as Yuan-appointed, so Tibet is shown under the Yuan.
- Left out: the Ilkhanate's vassals (the Kartids, the Salghurids) where the sources give no shape.

## 1200–1399 | South and Southeast Asia, Sri Lanka | Delhi, the south, Burma, Java, Đại Việt

- What changed: the Sultanate of Delhi is the Ghurids, then the Mamluk, Khalji, and Tughlaq dynasties; the Gahadavalas and Chauhans fall to the Ghurids. The Chola after 1279 is the Pandya, then the Sambuvarayar, then Vijayanagara; the Pandya state is the Tughlaqs, then the Madurai Sultanate; Orissa is the Eastern Ganga, then the Gajapati. Ceylon is Dambadeniya, Kurunegala, Gampola, then Kotte. Pyu, Mon, Bagan, and Pagan are the Pagan Kingdom, then Myinsaing, Pinya, and Ava; "Luva" is Lavo and "Harapunchai" Haripuñjaya. East Java is Kediri, then Singhasari; Kediri is dropped from 1240 to 1499; Srivijaya after 1286 is Dharmasraya. "Ngô" and "Đại Việt" are the Lý and Trần. Hainan is Song, Yuan, then Ming. Bhutan, before its state of 1616, is dropped.
- Tables: `NAME_FIX`.
- Sources: (1) Jackson, *The Delhi Sultanate* (1999). (2) Coedès, *The Indianized States of Southeast Asia* (1968). (3) de Silva, *A History of Sri Lanka* (1981). (4) Taylor, *A History of the Vietnamese* (2013). (5) Lieberman, *Strange Parallels*, vol. 1 (2003), on Burma.
- Confidence: medium; the names are well dated, but the shapes under them are Cliopatria's and historical-basemaps'.
- Alternatives: none taken on the names; the end of Srivijaya is dated variously from 1275 to the 1290s, and 1286 (the Padang Roco inscription) was used.
- Left out: the smaller Indian kingdoms (the Seuna Yadavas, the Kakatiyas, the Hoysalas) where the snapshot has no shape of their own.

## 1200–1399 | Africa, the Americas, Oceania | names and peoples

- What changed: Yemen is the Ayyubids, then the Rasulids; Ifat and Shoa are the Sultanate of Showa, then Ifat; "Ethiopia" is the Zagwe, then the Ethiopian Empire from 1270; Kanem is the Empire of Kanem; the "Abdelouadides" are the Zayyanids and the "Hafsid Caliphate" the Hafsid dynasty; the "Islamic city-states" of the Horn coast are the Sultanate of Mogadishu; the Mahdids are the Nabhani. In the Americas, the snapshots' Toltec and Classic Veracruz, Zapotec and Mixtec, and Huari and Tiahuanaco, long gone by 1200, are city-states and chiefdoms; Cuzco is the Kingdom of Cusco; the Puebloans are the Ancestral Puebloans, a people. Spellings: Makkura, Great Zimbabwe, Benin, Chámpa, Nepal, Chimú, Māori. Peoples are marked as peoples: the Malagasy, Malays, Ibadites, Beothuk, Sámi, Ainu, Tuaregs, Taíno, Guanahatabey, Kalinago, Arawaks, Innu, Shuar, and Guanches.
- Tables: `NAME_FIX`.
- Sources: (1) Taddesse Tamrat, *Church and State in Ethiopia 1270–1527* (1972). (2) Bosworth, *The New Islamic Dynasties* (1996), for the Rasulids, Zayyanids, Hafsids, and Nabhani. (3) Smith, *The Aztecs*, 3rd ed. (2012), on Postclassic city-states. (4) Bauer, *Ancient Cuzco* (2004).
- Confidence: medium for Africa and the Andes, low for the shapes in North America, which are the snapshots' guesses.
- Alternatives: naming the Mesoamerican polities one by one; the snapshots give no shapes to hang them on.
- Left out: the Mali and Songhay borders are left as the sources draw them, approximate.

## 1200–1399 | Europe | standard names, Ireland, Scotland, Norse lands

- What changed: Novgorod, Ryazan, the Teutonic Order, Castile, Aragon, Brittany, the Kingdom of Arles (for "Burgandy"), Sicily (with the old "Duchy of Benevento"), and Moldavia get their standard names. The Kingdom of Alba is the Kingdom of Scotland, and the snapshots' "Brythons" the Lordship of Galloway, then Scotland; "Celtic kingdoms" are Gaelic Ireland; the "Viking settlements" are the Lordship of Ireland, Norse Greenland, or Norway, by box. Kievan Rus' is the Principality of Kiev. Croatia is held by Hungary; Corsica by Pisa, then Genoa. Luxembourg from 1556 to 1713 is the Spanish Netherlands, held by Spain, and from 1714 to 1794 the Austrian Netherlands.
- Tables: `NAME_FIX`.
- Sources: (1) Oram, *The Lordship of Galloway* (2000). (2) Frame, *Colonial Ireland, 1169–1369* (1981). (3) Martin, *Medieval Russia, 980–1584* (1995). (4) Israel, *The Dutch Republic* (1995), on the Spanish and Austrian Netherlands.
- Confidence: high for the names, medium for where Gaelic Ireland ends and the Lordship begins.
- Alternatives: none.
- Left out: the smaller principalities of Rus' that the snapshots don't draw.

## 1453–1458 | Central Europe | Austria and Hungary

- What changed: Cliopatria draws the Archduchy of Austria over the Kingdom of Hungary from 1453 to 1458, the years of Ladislaus the Posthumous, who held both. The land outside Austria's shape of 1452 is the Kingdom of Hungary again (`CARVE`).
- Tables: `CARVE`.
- Sources: (1) Engel, *The Realm of St Stephen: A History of Medieval Hungary, 895–1526* (2001). (2) Wheatcroft, *The Habsburgs* (1995), on Ladislaus.
- Confidence: high; a personal union is not one state, and Cliopatria's own personal unions are not shown as rule.
- Alternatives: none.
- Left out: the personal union itself, which the card does not mention.

## 1200–1885 | world | bands, approximate borders, smooth edges

- What changed: peoples named as hunters, gatherers, foragers, or fishers are bands (people value 2), drawn with no border. The steppe, the Sahel, Tibet, the pre-colonial Americas, Tonga, and the Māori have precision 1, so their borders are dotted and the card calls them approximate. From 1200 a border is otherwise solid: dotting every border before 1648 hid the difference between a firm border and a guessed one. Edges traced from a grid, with stair steps, are smoothed on the shared topology before 1886 (`smoothTopo`); CShapes from 1886 is not smoothed.
- Tables: `BANDS`, `APPROX`, `smoothTopo`, `SOFT_BEFORE` (now only for the snapshots).
- Sources: (1) Kopytoff, *The African Frontier* (1987), on open frontiers. (2) Di Cosmo, *Ancient China and Its Enemies* (2002), on steppe polities. (3) Bennett and others (2025), on Cliopatria's own precision.
- Confidence: medium; the rule is the house rule in MAPMAKING.md, not a claim about any one border.
- Alternatives: keeping all borders before 1648 dotted, as before.
- Left out: overlaps are left to `resolveOverlaps` (below). One finding for it: polygon-clipping sometimes returns a wrong answer without throwing. In 1455, the intersection of the Jurchens and the Siberians comes out empty, though their union shows an overlap of 11,363 km², and the difference removes nothing; rounding the coordinates to 0.000001° gives the right answer. `tryClip` in the builder retries a failed clip that way, and `subtract` uses it, but `resolveOverlaps` still calls `clip.intersection` directly. Two small peoples that overlap without sharing a cell centre (the Hunkpapa and Itazipco of the 1492 map, 2,059 km²) are also missed by its shared-cell test.

## 1200–1600 | world | cities: founding, abandonment, and sudden falls

- What changed: founding years for Karakorum (1220), Sarai (1254), Ava (1365), Majapahit (1293), Chan Chan (850), Timbuktu (1100), Vijayanagara (1336), Kamakura (1180), Cusco (1200), Malacca (1400), Mogadishu (900), Mombasa (1150), Zanzibar (1700), and others; ends for Sarai (1502), Mayapan (1450), Gaur (1576), Hormuz (1622), and Bagan (1369). Mayapan is moved off Mérida, and Old Oyo is split from modern Oyo in 1836. Sultaniyeh and Mrauk U are added. `CITY_POP` adds points either side of sacks and plagues, so a city falls when it fell: the Mongol sacks of Samarkand, Bukhara, Merv, Nishapur, Gurganj, Kiev, Vladimir, Zhongdu, and Baghdad; Acre in 1291, Antioch in 1268, and Polonnaruwa in 1215; Timur's sacks; and the Black Death in Florence, Siena, Venice, Paris, and Cairo.
- Tables: `CITY_SINCE`, `CITY_UNTIL`, `CITY_ADD`, `REBA_FIX`, `CITY_POP` in `tools/city-tables.mjs`.
- Sources: (1) Chandler, *Four Thousand Years of Urban Growth* (1987). (2) Juvayni, *History of the World-Conqueror*, tr. Boyle (1958), and Barthold, *Turkestan down to the Mongol Invasion* (1928), for Central Asia. (3) Dols, *The Black Death in the Middle East* (1977); Herlihy and Klapisch-Zuber, *Tuscans and their Families* (1985); Bowsky, *Speculum* 39 (1964); Favier, *Paris au XVe siècle* (1974). (4) Pollock and others, *Mayapan* (1962); Sheriff, *Slaves, Spices and Ivory in Zanzibar* (1987); Eaton, *The Rise of Islam and the Bengal Frontier* (1993); Margariti, *Aden and the Indian Ocean Trade* (2007); Blair, *Iran* 24 (1986), for Sultaniyeh; Leider, *Le royaume d'Arakan* (2004), for Mrauk U.
- Confidence: medium; the dates are firm, the populations are estimates within a factor of two.
- Alternatives: Chandler's own figures alone, which interpolate smoothly across a sack.
- Left out: figures for small towns, which no source gives for these centuries.

## 1886 to 2019 | the world | disputed land

- What changed: land held by one state and claimed by another is drawn striped in the claimants' colours, as its own span with status 6 (disputed), its holder, and its claimants, from the dated list `DISPUTES`: Jammu and Kashmir and Azad Kashmir from 27 October 1947 and Gilgit-Baltistan from 16 November 1947 (India and Pakistan); the Siachen Glacier from 13 April 1984; Aksai Chin and the North-East Frontier Agency (Arunachal Pradesh from 21 January 1972) from 23 January 1959, the date of Zhou Enlai's letter to Nehru claiming them; the Shaksam Valley from 2 March 1963, when Pakistan ceded it to China; Western Sahara from 27 February 1976 (Morocco, Mauritania until 5 August 1979, and the Sahrawi Republic); Somaliland from 18 May 1991; Guayana Esequiba from 26 May 1966; Crimea from 18 March 2014; the Donetsk and Luhansk People's Republics from 11 May 2014; the Golan Heights and the West Bank from 10 June 1967 (the West Bank with Jordan until Jordan's disengagement of 31 July 1988, then Palestine); the Halaib Triangle from February 1958; the southern Kuril Islands from 5 September 1945; Abyei from 9 July 2011; the Ilemi Triangle from 12 December 1963; Northern Cyprus from 16 August 1974; South Ossetia from 24 June 1992, Transnistria from 21 July 1992, and Abkhazia from 30 September 1993; and Kosovo from 17 February 2008.
- Tables: `DISPUTES` (new), `CS_STATUS` (disputed: 6), and the page's striped drawing (`stripes`, `L.disputes`).
- Sources: (1) Natural Earth, Admin 0 – Breakaway, Disputed Areas, 1:10m, v5 (`ne_10m_admin_0_disputed_areas`), for every shape and for who holds and who claims each area (its `NOTE_BRK` field). (2) For the dates: the Nehru Archive's text of Zhou Enlai's letter of 23 January 1959; Wikipedia's articles on the 1947 Gilgit rebellion, the Halaib Triangle, Operation Meghdoot, the Sino-Pakistan Agreement, the Western Sahara conflict, and the others named, used as pointers to the dated events; and the CIA World Factbook's "Disputes – international" entries for the claimants.
- Confidence: medium, because the shapes are Natural Earth's present lines, which may differ from where the line of control ran in earlier years, and some start dates mark a war or a formal claim rather than the first day of a dispute.
- Alternatives: starting the India–China disputes in 1950, when China took Tibet, or in 1962, at the war; the later date of the formal claim was taken.
- Left out: Taiwan, which has had its own government since 1949 (Noah's decision); Artsakh, whose Natural Earth shape is what remained after 2020, far smaller than what it held from 1994; the small Himalayan valleys and islands under 1,000 km² other than the Siachen Glacier.

## 1400 to 2019 | the world | shapes over each other

- What changed: no two spans overlap at the same time any more. `resolveOverlaps` settles every overlap of 50 km² or more by rules (a state's own duplicates dropped, a people giving way to a state, a dependency keeping its land, a state mostly inside another keeping its land, an approximate border giving way to a firmer one, and the rest cut from the larger), and only an overlap of 10,000 km² or more, and a tenth of the smaller, between two firmly drawn states, is drawn as disputed land between them. From 1400 to 1885: 49 duplicates of one state, 3,812 overlaps with peoples, 39 between a ruler and its dependency or two dependencies of one ruler, 2,077 of a state lying mostly inside another, 3,647 with an approximate border, and 209 slivers were cut, 77 pairs whose shapes could not be intersected were cut whole from the one that gives way, and 298 overlaps became disputed land. Separately, `unionSafe` and `dissolveFeat` stop a state's added pieces being stacked on its own land, which drew border lines inside the Ottoman Empire from 1886 to 1918 and Mandatory Palestine from 1920 to 1948.
- Tables: `resolveOverlaps`, `DISPUTE_KM2`, `DISPUTE_SHARE`, `NEST_SHARE`, `unionSafe`, `dissolveFeat`.
- Sources: (1) the existing sources, historical-basemaps and Cliopatria, whose overlaps these are; (2) MAPMAKING.md's rule that the smaller keeps an overlap, and Noah's decision (27 October 2026) to show large overlaps between states as disputed.
- Confidence: medium, because the rules are mechanical: a source's error can still come out as a dispute, and a real dispute below the thresholds is cut.
- Alternatives: striping every overlap (rejected: most are source errors); cutting every overlap with no disputes (rejected by Noah).
- Left out: overlaps on the snapshot maps before 1400.

## 1400 to 2019 | the world | colours by date

- What changed: where two touching states share a colour, one of them takes another colour for just the years or days they touch, then its own again (`windowColours`): 39 stretches from 1886 and 153 from 1400 to 1885; a state whose largest span is over 3 million km² (`WINDOW_MAX_KM2`) never changes colour, and a state's stretches less than ten years apart are joined into one, so China beside British Hong Kong, and the Qing dynasty beside British territory, keep sharing a colour as before. Czechoslovakia has its own colour while it borders Romania and the Czech Republic's from 8 May 1945 (`NO_LINK`, `COLOUR_FROM`), at Noah's request; South Africa is drawn in another colour until Mozambique's independence in 1975.
- Tables: `NO_LINK`, `COLOUR_FROM`, `windowColours`, and the eighth and ninth items of a `polities` entry.
- Sources: (1) the colour report of the build, which listed the touching pairs left in one colour; (2) Noah's request of 27 October 2026.
- Confidence: high, because it changes only colours, never borders.
- Alternatives: changing a base colour (rejected: the base colours are fixed); leaving the pairs in one colour.
- Left out: the snapshot maps before 1400.

## 1945–1990 | Central Europe | the inner German border

- What changed: East Germany (the Soviet zone from 8 May 1945, the German Democratic Republic from 5 October 1949) and West Germany (the western zones, then the Federal Republic) now meet along the boundary between today's five eastern states and Berlin and the western states, instead of CShapes' line, which put Wolfsburg, Helmstedt, and the western Harz in the east. The two states' shapes are joined and split along Natural Earth's state boundaries, keeping CShapes' coast and outer borders. Berlin stays whole in East Germany, as CShapes has it.
- Tables: `CS_REDRAW` (new) in `tools/build-eras.mjs`, gw 265 and 260, from 1945-05-08 to 1990-10-02.
- Sources: (1) The Ländereinführungsgesetz of 22 July 1990 and the Unification Treaty (Einigungsvertrag, 31 August 1990, Article 1) re-established the five eastern states as the territory of the GDR, so their outer boundary is the inner German border; summarised at https://en.wikipedia.org/wiki/New_states_of_Germany. (2) Natural Earth's 10m admin-1 states and provinces, for the boundary's course. (3) The one later change: Amt Neuhaus, east of the Elbe, was in Mecklenburg and the GDR from 1945 and went to Lower Saxony on 30 June 1993 (https://en.wikipedia.org/wiki/Amt_Neuhaus).
- Confidence: high, because the line is the boundary of the present states, which were rebuilt on the GDR's territory in 1990; only Amt Neuhaus differs.
- Alternatives: CShapes 2.0's own line, which is visibly wrong at Wolfsburg and in the Harz.
- Left out: Amt Neuhaus (about 237 km²) is drawn in West Germany, because Natural Earth has no unit for it. The 1945 zone boundaries in the west (British, American, and French zones) and West Berlin are not shown: CShapes gives the western zones as one span under American occupation, and Berlin whole in the east.
