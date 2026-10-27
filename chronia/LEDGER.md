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
