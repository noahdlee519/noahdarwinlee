# CHRONIA: sources on the country card

Design, 16 November 2026. Approved approach: Option A (coarse sources for every country now, specific citations wherever the ledger has one).

## Intent

A reader who clicks a country should be able to see what backs what the map says about it at that date: where its borders, its dates, and its name came from. Where the answer is the editors' judgement, the card says so. This is the atlas showing its work, so trust comes from being exact about how much is known, not from looking well sourced.

## Goals

- Every country and people card ends with a collapsed "Sources" section.
- It lists, separately, the source of the borders, the dates, the name, and the card's text.
- Every span on the map has an answer from the first release. None is blank.
- Where a ledger entry covers the country and the date, its citations are shown too.
- A new ledger entry reaches the card at the next data build, with no second file to keep in step.

## Non-goals

- Cards for cities, provinces and other divisions, lakes, and seas. (Divisions already have `DIVISIONS-SOURCES.md`; they can follow later.)
- The conflicts layer, which has its own credit line.
- Researching new citations for the hand-made tables. That is ongoing ledger work.

## Anti-goals

- A citation that isn't recorded in the repo. Nothing is inferred or invented for display.
- The editors' work shown as a dataset's. A shape assembled by hand from Natural Earth units says "assembled by the editors".
- A line that claims more precision than the map's own signs (dotted, hatched) do.

## Constraints

- The build tags every span with its origin (`src`, about twenty tags) but drops the tag before writing the data. Keeping it needs one full rebuild, about 100 minutes, with swap on.
- Other sessions push data rebuilds concurrently, so the data is rebuilt after the last `git pull --rebase`.
- Names, rulers, and exact days are set by tables separate from the shapes, so one span can have three different sources.
- The ledger (`LEDGER.md`, 125 entries with sources) is prose, keyed by years, region, and subject, not by span.
- UI text: serial comma; "|" as the separator; dates as "August 23, 1815".

## Approaches

1. **Tags kept by the build, citations read from the ledger (chosen).** The build writes each span's source codes into the data and parses `LEDGER.md` into a small file the card loads when the section is first opened. Each ledger entry gains one line saying which polities and years it applies to. One source of truth, complete coverage, and it grows as the ledger does. Costs one rebuild and a pass over the 125 entries.
2. **A separate hand-written citations file.** Simple to read from, but it duplicates the ledger and the two would drift.
3. **Work it out in the page, with no rebuild.** Guess the source from the date and the line's precision. Quick, but wrong for every hand-made span, which is exactly where "editors' discretion" has to be said truthfully.

## Design

**The registry.** `tools/sources.json`, written by hand: one record per source, with a label, a kind (dataset | scholarship or atlas | encyclopedia | official publication | editors' discretion), and where they exist a link and a licence. It covers Cliopatria, CShapes 2.0, historical-basemaps, Natural Earth, Natural Resources Canada, OpenHistoricalMap, geoBoundaries, Wikidata, Wikipedia, and the editors.

**In the build.**
- Each span carries three answers through every step that splits, renames, or redraws it: borders (the existing `src` tag), name, and dates. A table maps each tag to registry records and a short phrase, such as "Natural Earth units, assembled by the editors" or "carried back from the map of 1886 by the editors".
- A span renamed or given a ruler by a naming table has the editors as its name source, with Wikipedia where the name is an article title. A span whose days come from the days table has the editors as its date source.
- The build fails if any span reaches the output without all three.
- The codes are written beside each row, for the dated chunks and for the modern file.

**The ledger link.** Each entry gains one line:

```
- Applies to: Luxembourg; Duchy of Limburg | 1815–1866
```

Entries about the whole map (sliver clean-ups and the like) say `none`. The build parses the ledger into `data/sources.json`: each entry's heading, years, names, and its numbered sources as written. A span is matched to an entry when its name is listed and their years overlap. `MAPMAKING.md`'s ledger template gains the line, and the build warns about an entry without it.

**On the card.** A `<details>` section after the Wikipedia link, closed by default; whether it is open is remembered for the visit.

```
▸ Sources
  Borders | Natural Earth units, assembled by the editors
  Dates   | Editors' discretion
  Name    | Wikipedia, "Duchy of Limburg (1839–1867)"
  Text    | Wikipedia
  Editors' notes | 1815–1866, the Low Countries
     (1) geoBoundaries gbOpen BEL ADM4 … (2) English Wikipedia, "East Cantons" …
  Report a problem
```

- Source names link out where the registry has a link.
- A people (hatched, no border) shows "Extent" in place of "Borders".
- "Report a problem" opens the existing report form with the place and date filled in.
- `data/sources.json` is fetched on first open; if it can't be reached, the coarse lines still show.

**Checks.** The page check gains three cases: a Cliopatria-only state, a hand-made state with a ledger entry (Luxembourg, 1845), and a modern state. README gets a section on the card's sources, and the change gets its own ledger entry.

## Left to the builder

- How the codes are packed into the rows.
- The exact phrase for each of the twenty-odd tags, within the anti-goals.
- The "Applies to" line for each existing entry, read from the entry itself.
- Styling, within the card's existing type and spacing.
