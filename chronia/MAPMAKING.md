# Making CHRONIA's maps

The rules for anyone, agent or person, who adds to or corrects CHRONIA's borders, above all before 1400, where the record is thinnest. The [README](README.md) says how the data is built. This file says how to decide what goes in it, and how to work so that the result can be trusted and checked.

Read the README's [The data](README.md#the-data) and [Known limits](README.md#known-limits) first. The house rules in [`../uchronia/AGENTS.md`](../uchronia/AGENTS.md#ground-rules) apply here too.

## The aim

A map of a year shows what a careful historian would say the political world looked like in that year, and how sure we can be of it. Three things follow.

1. **Faithful to the year.** A state is drawn as it stood in the map's year, not at its height, its founding, or its fall.
2. **Honest about doubt.** Where the evidence is thin or scholars disagree, the map says so through its signs (see below) and the ledger records why. It does not hide doubt behind a confident line, and it does not fill land just so it isn't blank.
3. **Even across the world.** Africa, the Americas, Inner Asia, Southeast Asia, and Oceania get the same care as the Mediterranean and China. If the evidence for a region is thin, say so. Don't leave it out because it is harder to find.

## What the map can say

Every decision has to be expressed in these terms. If something can't be expressed in them, it is left out and recorded in the ledger.

| Sign | Meaning | Use it for |
| --- | --- | --- |
| **State** (coloured, solid or dotted border) | A polity with a recognisable central authority over the land drawn | Kingdoms, empires, city-states, leagues with a common government, organised nomadic polities |
| **Dependency** (ruler's colour, ruler on hover) | A polity that keeps its own identity but answers to another: `ruler` set, `status` 1 colony, 2 protectorate, 4 occupied, 5 other | Client kingdoms, satrapies shown as units, tributaries with real obligations, vassals |
| **Part of** | A member of a larger body that is not a ruler over it | Members of a confederation or league, states of the Holy Roman Empire |
| **People or culture** (uncoloured, italic, dotted) | A group known from texts or archaeology without, or before, state-level rule | Archaeological cultures ("Yamnaya culture"), peoples named by scholars ("Scythians" where no single state is meant) |
| **Precision** 1 to 3 | How exact the border is: 1 approximate, 2 moderately precise, 3 fixed by treaty or survey | Almost everything before 1400 is 1 or 2 |
| **Blank land** | No evidence of who held it | Leave it blank rather than guess |

Before 1648 every border is drawn dotted, and so is any border with precision 1 or with a people on either side. So the sign of doubt is already there; it only has to be used honestly.

Capitals are not part of the data before 1886, and cities have their own builder and tables. This file is about borders, names, rulers, and peoples.

## Standards of evidence

### Sources, in order of weight

1. **The project's datasets.** These are historical-basemaps (Ourednik) and Cliopatria (Seshat, Bennett and others, 2025), which covers 3400 BC to 2024 although CHRONIA uses it only from 1400. They are the baseline. A change to them needs a reason and a source.
2. **Scholarly historical atlases and gazetteers.** Starting points by region:
   - Mediterranean and Near East: the *Barrington Atlas of the Greek and Roman World* (Talbert, 2000), with Pleiades and the Digital Atlas of the Roman Empire (DARE); the *Tübinger Atlas des Vorderen Orients* (TAVO).
   - China: Tan Qixiang's *Historical Atlas of China* (中国历史地图集), and the China Historical GIS (CHGIS).
   - South Asia: Schwartzberg's *A Historical Atlas of South Asia* (1978, online at the Digital South Asia Library).
   - Inner and Central Asia: Bregel's *An Historical Atlas of Central Asia* (2003).
   - Africa: Ajayi and Crowder's *Historical Atlas of Africa* (1985).
   - Southeast Asia: Cribb's *Historical Atlas of Indonesia* (2000).
   - The Americas: Coe, Snow, and Benson's *Atlas of Ancient America* (1986).
   - Europe: Magocsi's *Historical Atlas of Central Europe*, and Euratlas's maps by century.
   - The whole world, as a check: *The Times Atlas of World History*.
3. **Specialist scholarship.** Peer-reviewed work on a particular polity or period, where the atlases are silent or out of date. The *Cambridge Ancient History*, the *Cambridge History of China*, and the *Cambridge History of Inner Asia* are examples.
4. **Wikipedia**, only as a pointer. It is good for conventional names and dates, and for leads to sources. It is never the sole source for a border. Its "maximum extent" maps are drawn for a state's peak and are often maximalist.

Never use maps from nationalist or irredentist sites, game maps, uncredited images, or anything written by a model. That includes this project's own notes: they are generated text, not evidence.

### Two sources, and the disagreements

- **Two independent sources.** A border, a date, or a ruler that departs from the baseline needs two independent sources. If a second source can't be found, mark the change as weak in the ledger and set precision to 1.
- **When the sources disagree:**
  - Follow the view most current scholarship holds.
  - If there is no such view, take the more cautious one: the smaller extent, the later date, or the looser relation.
  - Record the alternative in the ledger.
  - Never split the difference into a border no source draws.

### Dates and chronology

- Years are integers, and a negative year is BC: `-500` is 500 BC. There is no year 0, so 1 BC is followed by AD 1. A source using astronomical years (0 for 1 BC, −1 for 2 BC) must be shifted by one.
- **Mesopotamia and the Levant:** use the Middle Chronology.
- **Egypt:** use the conventional dates of Shaw's *Oxford History of Ancient Egypt*.
- **Any other chronology:** if a region needs a different chronology, name it in the ledger and keep to it for that region.
- **Fuzzy dates:** where a date is only known to a range, use the conventional date, and note the range.
- **Snapshot years:** a snapshot map stands for one year. Draw that year, and nothing from a decade before or after, except where the evidence can't tell the two apart.

## What a border means before 1400

Ancient and medieval rule was mostly held through zones, cities, and allegiances, not lines. Draw what the sources support, in the terms above.

- **Rule, not reach.** Draw land a polity governed or taxed, or held through officials or garrisons. Don't draw land it only raided, campaigned in, traded with, or claimed. A one-season conquest that was lost again is not drawn in a year it wasn't held.
- **Not the peak.** The Achaemenid Empire of 500 BC is not that of 330 BC, and Han China of AD 1 is not that of AD 100. Check every large state against its own chronology for the map's year.
- **Tributaries and clients.** A polity that paid tribute or took orders but kept its own ruler is a dependency with that ruler, not part of the overlord's shape. If the tie was only ceremonial or occasional, it is independent. An example is many of the polities sending missions to the Chinese court.
- **Nomadic and pastoral polities.** Draw them as states when there was a recognisable central authority, such as the Xiongnu under the chanyu or the Göktürks. Use precision 1 for the range they controlled. Otherwise draw them as peoples.
- **City-states and leagues.** Draw a city-state at its own territory, even where it is small. A league or confederation with common institutions is a state, or a "part of" umbrella over its members, as the data allows.
- **Peoples and archaeological cultures.** Use the name current in scholarship, with "culture" for an archaeological culture. Don't project a modern nation or ethnic group back onto an ancient population.
- **Blank land.** Leave land blank where nothing is known. Hunter-gatherer and other non-state societies are drawn as peoples only where scholarship names and places them. Don't fill land just so it isn't blank.
- **Coasts and rivers.** Don't redraw coasts or rivers to fit a period. CHRONIA's geography is today's, except for the changes the dated geography lists. A border is drawn to today's coast.

## Objectivity and contested history

Many ancient polities are claimed by present-day nations. The map follows international scholarly consensus, not any government's or movement's official history.

- **Name neutrally.** Use the name the scholarship uses. Where two names are both established, choose the one used in the standard English-language reference works, and give the other in the ledger. Don't name an ancient polity after a modern state to stake a claim.
- **Extent.** For extents that are contested along modern national lines, take the extent supported by archaeology and contemporary sources. Use precision 1, and record the competing views. Cases that need this care include:
  - Goguryeo and Balhae;
  - ancient Macedonia;
  - Caucasian Albania and Armenia;
  - Dacia and later continuity claims;
  - the United Monarchy of Israel;
  - the extent of the Indus and Vedic cultures;
  - Tibet and the Tang and Yuan borders;
  - early Turkic and Mongol polities;
  - Great Zimbabwe and Mapungubwe.
- **No pejoratives as names.** Don't use "barbarians", "savages", or "tribes" as a catch-all. Use exonyms only where scholarship still uses them, and note the people's own name where known.
- **Don't let famous empires swallow the record.** Before giving land to Rome, Persia, Han China, or the Mongols, check what its own inhabitants' polities were in that year.
- **Disagreement is data.** Where honest scholars disagree, the map shows one view, chosen by the rules above. The ledger shows the rest, and the card's note can say that the border is approximate.

## Names

These follow the rules already used for 1400 to 1885 (see the README's [Names fixed](README.md#names-fixed)).

- **The name at the date.** Use the polity's name in its map's year, in English as scholarship writes it. Examples: Kingdom of Kush, Achaemenid Empire, Han dynasty, Kingdom of Aksum. A polity that changed regime or name changes name on the map at that date, through the regime and renaming tables.
- **One polity, one name** per span. Merge spellings ("Chimu" and "Chimú") and drop source codes and brackets.
- **Dynasties:** write "dynasty" in lower case, as Wikipedia does ("Ming dynasty").
- **Wikipedia titles:** where the plain name would find the wrong article, map it to the right one (`WIKI`, `WIKI_BY_YEAR`).
- **Successors:** don't keep a name after the polity ended. If a source carries a stale name, give the land to its successor or to blank land for the years after (`HB_STALE`, `RULER_DROP`).

## Rulers, parts, and colours

- **Rulers:** a ruler must be a polity drawn on the same map, under its name for that year. A ruler written differently is resolved through `RULER_ALIAS` and `LINEAGE`, not by renaming the state.
- **Colours** are never chosen by hand. A dependency takes its ruler's colour, and a lineage shares one colour through time (`LINEAGE`). The builder keeps colours stable from build to build.
  - Add a lineage only when it is one continuous state under changing names, such as Muscovy into Russia, or Wessex into England. Don't add one for a claimed succession, such as a modern state "descending" from an ancient one.
  - If two neighbours end up in one colour because of a lineage, break it with `NO_LINK`. That's what was done for Czechoslovakia against Romania. Don't reshuffle colours.
- **Base colours:** the 132 base colours of 2019 come from a reference map Noah chose, and are not to be changed.

## Shapes

- **Never type coordinates from memory.** A border from a model's recollection is not evidence.
- **Build shapes from existing geometry:**
  - the source datasets' own shapes;
  - Natural Earth's land, provinces, and lakes;
  - UCHRONIA's provinces and second-level units;
  - rivers, used as borders where the sources say a river was the border.
- **When a shape has to be drawn from an atlas,** trace it from a cited, georeferenced map. Record the map, its scale, and the method in the ledger, and set precision to 1.
- **One owner per place.** Shapes on one map don't overlap. Where two sources overlap, the builder's rules decide (the smaller keeps the overlap); don't paper over it by hand.
- **No slivers.** Pieces narrower or smaller than the builder's limits are dropped. Don't defeat the limits to keep a sliver that the sources' differing coastlines made.
- **Continuity:** a state that exists on two neighbouring maps should change shape between them only for a reason a source gives.

## How to work

1. **Claim a region and a stretch of years.** Write the claim into the ledger (below) before starting. Other agents edit this repository at the same time, so check `git log` and `git status` first. Keep to the region you claimed.
2. **Research before editing.** For each map year, list the polities that should be there, with their sources, before touching the builder.
3. **Fix the data in the builder's tables, never in the output files.** Then rebuild, so that a rebuild keeps the fix. The tables are `RENAME`, `RULER_FIX`, `RULER_ALIAS`, `LINEAGE`, `PEOPLES`, `NAME_FIX`, `REGIMES`, `RULER_DROP`, `HB_STALE`, `NO_LINK`, `WIKI`, `WIKI_BY_YEAR`, `SMALL`, and any new table the work needs.
   - A new table is described in the README in the same commit.
   - Code has no comments; the reasons belong in the ledger and the README.
4. **Rebuild and check.** Follow the README's [Testing](README.md#testing).
   - Check the blank-land shares and the colour report against the numbers before your change.
   - Check that other regions' maps come out unchanged.
   - Before committing, look at each changed map year on the page in a browser, at the zoom where the change shows.
5. **Write it down.** Add or update the ledger entry, describe any new behaviour in the README, and add new sources to the README's [Credits](README.md#credits) with their licences.
6. **Commit and push.** Use a short, declarative message: "CHRONIA: the Kingdom of Kush from 750 BC, from the Barrington Atlas and TAVO". Use one region and era per commit, so a mistake can be found and reverted on its own. Push to `origin main` yourself; GitHub Pages publishes within a minute or two.

## The ledger

`chronia/LEDGER.md` holds one entry per change, with the newest at the top. Each entry has:

- **When and where:** the map years or year range, and the region.
- **What changed:** the polity, and the border, name, ruler, or status, with the table entries touched.
- **Sources:** at least two, with author, title, year, and page, plate, or URL.
- **Confidence:** high, medium, or low, with one sentence on why.
- **Alternatives:** the competing views and why they were not taken.
- **Left out:** anything the sources say that the map can't show.

A claim in progress is an entry with "Claimed by" and the date, replaced by the finished entry when the work is done.

## Checklists

**For each map year touched:**

- [ ] Every region of the world has been looked at, not only the one in focus:
  - Europe;
  - North Africa and the Near East;
  - Sub-Saharan Africa;
  - Central and Inner Asia;
  - South Asia;
  - East Asia;
  - Southeast Asia;
  - Oceania;
  - North America;
  - Mesoamerica;
  - South America.
- [ ] Each state existed in that year, under that name and with that ruler.
- [ ] Each large state is drawn at its extent in that year, not at its peak.
- [ ] Tributaries are dependencies, members are "part of", and peoples are peoples.
- [ ] The precision reflects the evidence.
- [ ] No land is filled without a source, and no polity with a source is missing.

**For each change:**

- [ ] There are two independent sources, or the change is marked weak with precision 1.
- [ ] Contested cases follow the consensus, and their alternatives are recorded.
- [ ] Names are those of the date, neutral, and with no codes or stale regimes.
- [ ] The change is made in the builder's tables, the rebuild is done, and the other regions are unchanged.

**Before committing:**

- [ ] The build runs, the page loads with no errors, and the changed years have been seen on the page.
- [ ] The ledger, README, and credits are updated.
- [ ] The commit holds one region and era, and nobody else's files.

## Decisions already made

These were settled with Noah. Don't reopen them without asking.

- **Sources:** up to 1400 the borders are historical-basemaps' snapshots; from 1400 to 1885, Cliopatria, filled from historical-basemaps; from 1886, CShapes 2.0, dated to the day. A source is never mixed into a period by hand. A change of source for a period is a decision for Noah.
- **Colours:** the reference map's base colours win over keeping every pair of neighbours apart. Lineages carry a modern state's colour back through time. A dependency is shown in its ruler's colour.
- **Name, not just colour:** a state is named for its regime at the date, through `REGIMES` and `NAME_FIX`, rather than keeping one name across regimes.
- **Signs of doubt:** borders before 1648 are drawn dotted, peoples are uncoloured and in italics, and "approximate" borders say so on the card.
- **Leaving things out:** small territories the sources lose are added from Natural Earth's shapes (`SMALL`), not drawn by hand. Thin or patchy data is left out rather than shown misleadingly. In UCHRONIA, Uruguay's and Guyana's second level was left out for this reason, and Colombia's 1,121 municipalities were grouped into the departments' own subregions as the more useful level.
- **The notes on the cards** are written by a model and are not a source for the map.
- **Writing:** plain and specific, British spelling, and the serial comma. Interface text uses "|" rather than middle dots or round bullets.
