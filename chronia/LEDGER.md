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
## 1893–2026 | Brazil, Argentina, Spain, France, Japan, and Nigeria | first-level divisions

- What changed: the first-level divisions of six more countries are drawn, each from the date since which Natural Earth's present shapes have held, with the older names and the merged divisions of the years between (README, "First-level divisions"). All the divisions from Natural Earth are now drawn at the detail of UCHRONIA's `provinces-detail.json`, with internal lines simplified to about 0.5 km instead of 1.6 km.
- Tables: `NE_REGIONS`, `ES_COMMUNITIES`, `FR_OLD`, and `FR_MERGED` in `tools/build-divisions.mjs`.
- Sources: (1) Natural Earth, admin-1 states and provinces, 10 m. (2) For the dates: Brazil, Complementary Law 31 of 1977 (Mato Grosso do Sul, installed 1 January 1979), Complementary Law 41 of 22 December 1981 (Rondônia, installed 4 January 1982), and the Constitution of 5 October 1988; Argentina, Law 14,408 of 1955 and Law 23,775 of 26 April 1990 (Tierra del Fuego), and the Constitution of the City of Buenos Aires of 1 October 1996; Spain, the statutes of autonomy of 25 February 1983 and of Ceuta and Melilla of 14 March 1995; France, the decree of 9 January 1970 (Corsica), Law 2015-29 of 16 January 2015, and Decrees 2016-1262 to 2016-1268 of 28 September 2016; Japan, the transfer of the Tama districts to Tokyo on 1 April 1893 and the Tokyo Metropolis of 1 July 1943; Nigeria, the creation of six states on 1 October 1996.
- Confidence: high for the shapes after each start date, medium for the start dates of Argentina (1956 is a safe year after the renamings of late 1955, not the day of a law) and of France's overseas regions, which were departments, not regions, until 1982.
- Alternatives: Tierra del Fuego as a province from the swearing of its constitution on 1 June 1991 rather than the law of 1990.
- Left out: Italy, whose regions changed slightly in 2009 and 2017; the divisions before each start date; Fernando de Noronha, which Natural Earth's simplified provinces leave out.

## 3400 BC–1199 | world | yearly borders before 1200, Roman provinces, and Chinese dynasties

- Claimed by the session of 27 October 2026 (Holy Roman Empire, search, marshes): Cliopatria year by year back to 3400 BC, the snapshots filling what it leaves blank; Roman provinces from the Ancient World Mapping Center; the China Historical GIS for the dynasties if its licence allows. Touches `DATED_FROM`, `NAME_FIX`, `dated/*.json`, and the dated code in `app.js`.

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
