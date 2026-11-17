# CHRONIA Card Sources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every country and people card ends with a collapsed "Sources" section naming where its borders, dates, name, and text came from, with the ledger's citations where an entry covers it.

**Architecture:** The data build writes one small code per row (borders | name | dates) and a registry of sources into `eras.json`, so the coarse lines need no extra request. A separate, fast tool parses `LEDGER.md` into `data/sources.json`, which the card fetches the first time the section is opened and matches by polity name and date.

**Tech Stack:** Node (ES modules, `node --test`), plain JavaScript and CSS in `chronia/app.js` and `chronia/app.css`, Playwright page checks in `tools/`.

**Spec:** `docs/superpowers/specs/2026-11-16-chronia-card-sources-design.md`

## Global Constraints

- Nothing is shown that isn't recorded in the repo. No citation is inferred or invented.
- The editors' work is never shown as a dataset's.
- UI text: serial comma; "|" as the separator, never bullets or middle dots; dates as "August 23, 1815".
- Ledger and registry text reaches the page through `textContent`, never `innerHTML`.
- The data build: run in `/home/claude/build` with `swapon /home/claude/swapfile`, detached, about 100 minutes; rebuild after the last `git pull --rebase`.
- Commits end with the session's two trailer lines. `git pull --rebase` before pushing; never force-push.
- README and LEDGER are updated with the change.

## Review Focus

1. `data/sources.json` can't be fetched (offline, 404): the coarse lines still show and the notes area says nothing is available, with no error thrown. (Task 4)
2. Data without codes (a cached old chunk beside new code): the section is hidden for that card, never "undefined". (Task 4)
3. A polity with ledger entries only for other years: no note is shown for the date on screen. (Tasks 1 and 4)
4. A ledger entry with no "Applies to" line, or years that can't be read: the tool warns, skips the entry, and still writes the file. (Task 1)
5. Ledger text with backticks, markdown links, or a very long line: shown as plain text that wraps inside the card at 320 px wide. (Tasks 1 and 4)

---

### Task 1: The registry and the ledger parser

**Files:**
- Create: `chronia/tools/sources.json`, `chronia/tools/build-sources.mjs`, `chronia/tools/build-sources.test.mjs`
- Modify: `chronia/MAPMAKING.md` (the ledger template gains the "Applies to" line), `chronia/LEDGER.md` (the template at its head)
- Output: `chronia/data/sources.json`

**Interfaces:**
- Produces `tools/sources.json`:
  `{ "sources": { "<id>": { "label", "kind", "url"?, "licence"? } }, "borders": { "<tag>": { "text", "ids": [] } }, "name": { "source" | "editors": { "text", "ids": [] } }, "dates": { "source" | "editors" | "days": { "text", "ids": [] } } }`.
  `kind` is one of `dataset`, `scholarship`, `encyclopedia`, `official`, `editors`. Source ids: `cliopatria`, `cshapes`, `hb`, `ne`, `nrcan`, `ohm`, `geoboundaries`, `wikidata`, `wikipedia`, `editors`. `borders` has one key per `src` tag in the build (Task 2 lists them) plus `cs`. In `text`, `{source}` stands for the first id's label.
- Produces, exported from `build-sources.mjs`:
  - `parseYears(text: string): [number, number] | null` ("1815–1866" → `[1815, 1866]`; "3400 BC–2026" → `[-3400, 2026]`; "1920" → `[1920, 1920]`; "44 BC–AD 14" → `[-44, 14]`).
  - `plain(text: string): string` (drops backticks; `[text](url)` → `text`; collapses spaces).
  - `parseLedger(markdown: string): { notes: Note[], skipped: string[] }` with `Note = { title: string, names: string[], from: number, to: number, sources: string[] }`.
- Produces `data/sources.json`: `{ "notes": Note[] }`.
- CLI: `node chronia/tools/build-sources.mjs` writes the file and prints the count and each skipped heading; `--check` also verifies the data's codes (Task 2).

- [ ] **Step 1: Write the failing tests** in `build-sources.test.mjs` (`node:test`, `node:assert/strict`):

```js
test("parseYears", () => {
  assert.deepEqual(parseYears("1815–1866"), [1815, 1866]);
  assert.deepEqual(parseYears("3400 BC–2026"), [-3400, 2026]);
  assert.deepEqual(parseYears("1920"), [1920, 1920]);
  assert.deepEqual(parseYears("44 BC–AD 14"), [-44, 14]);
  assert.equal(parseYears("sometime"), null);
});
test("plain", () => assert.equal(plain("`tools/x.mjs` and [East Cantons](https://e.org/a)  here"), "tools/x.mjs and East Cantons here"));
test("parseLedger reads names, years, and numbered sources", () => {
  const md = "# L\n\n## 1815–1866 | the Low Countries | Luxembourg\n\n- What changed: x\n- Applies to: Luxembourg; Duchy of Limburg | 1839–1866\n- Sources: (1) A `b`; (2) C, \"D\".\n- Confidence: high\n";
  const { notes, skipped } = parseLedger(md);
  assert.deepEqual(notes, [{ title: "1815–1866 | the Low Countries | Luxembourg", names: ["Luxembourg", "Duchy of Limburg"], from: 1839, to: 1866, sources: ["A b;", "C, \"D\"."] }]);
  assert.deepEqual(skipped, []);
});
test("parseLedger: heading years when the line gives none, none is left out, a missing line is skipped", () => {
  const md = "## 1660–1800 | Ireland | K\n- Applies to: Kingdom of Ireland\n- Sources: one source\n\n## 1886–2026 | the world | slivers\n- Applies to: none\n- Sources: (1) x\n\n## 1900 | X | Y\n- Sources: (1) x\n\n## when | X | Z\n- Applies to: Z\n- Sources: q\n";
  const { notes, skipped } = parseLedger(md);
  assert.equal(notes.length, 1);
  assert.deepEqual([notes[0].from, notes[0].to, notes[0].sources], [1660, 1800, ["one source"]]);
  assert.deepEqual(skipped, ["1900 | X | Y", "when | X | Z"]);
});
```

The template block in the ledger's head (inside a code fence) is not an entry.

- [ ] **Step 2: Run** `node --test chronia/tools/build-sources.test.mjs`. Expected: FAIL, the module does not exist.
- [ ] **Step 3: Implement** the three functions and the CLI in `build-sources.mjs`. An entry with "Applies to: none" is left out silently; one with no line, no sources line, or unreadable years goes in `skipped`.
- [ ] **Step 4: Write `tools/sources.json`.** For each `borders` tag, read the code where the tag is set in `build-eras.mjs` (and `ww2-borders.mjs`) and the README section on it, and write a phrase a reader can follow. Pinned: `clio` → "Cliopatria"; `cs` → "CShapes 2.0"; `hb` → "historical-basemaps"; `napoleonic`, `medieval`, `colony`, `australia`, `acq`, `small` → "Natural Earth units, assembled by the editors"; `nrcan` → "Natural Resources Canada's historical boundaries"; `ww2` → "OpenHistoricalMap and Natural Earth units, assembled by the editors"; `early` → "Editors' discretion: an approximate extent built from Natural Earth units". A derived tag (`carry`, `extend`, `back`, `backdate`, `seam`, `stage`, `member`, `overlap`, `dispute`, `redraw`) names what it derives from and says the editors did it.
- [ ] **Step 5: Add the "Applies to" line** to the templates in `MAPMAKING.md` and `LEDGER.md`: `- Applies to: <name>; <name> | <years>` (the names as the card shows them; the years may be left out to use the heading's; `none` for an entry about the whole map).
- [ ] **Step 6: Run** the tests (PASS) and `node chronia/tools/build-sources.mjs` (writes the file; every existing entry is listed as skipped until Task 3).
- [ ] **Step 7: Commit.**

### Task 2: Source codes in the data build

**Files:**
- Modify: `chronia/tools/build-eras.mjs` (the naming step near line 2690; the dated row writer near line 4450; the modern parts near lines 5190 to 5330; the `eras.json` writer near line 5813), and any table module whose spans arrive without `src`
- Modify: `chronia/tools/build-sources.mjs` (`--check`)

**Interfaces:**
- Consumes: `tools/sources.json` (Task 1).
- Produces in each `data/dated/*.json` and in `data/modern.json`: `src: number[]`, one per row, indexing `eras.json`'s `srcKeys`.
- Produces in `data/eras.json`: `srcKeys: string[]` (each "borders|name|dates", such as "napoleonic|editors|editors") and `sources` (the whole of `tools/sources.json`).
- In the build: `srcOf(span): string` returns the key. Borders is `span.src` (`cs` for a CShapes span). Name is `span.nameSrc`, else `source` for `clio`, `hb`, and `cs`, else `editors`. Dates is `editors` for a hand-table span; `days` for a dataset span whose first or last day was set by the days table; else `source`.

- [ ] **Step 1:** In `build-sources.mjs --check`, read `data/eras.json` and every chunk and `modern.json`, and exit 1 unless each has `src` of the rows' length, every index is within `srcKeys`, and every key's three parts are keys of `sources.borders`, `sources.name`, and `sources.dates`. Run it. Expected: FAIL, "no srcKeys".
- [ ] **Step 2:** In the naming step, a span whose name, ruler, or part the tables change gets `nameSrc: "editors"`.
- [ ] **Step 3:** Add `srcOf`, intern the keys, write `src` beside `rows` in both writers, and write `srcKeys` and `sources` into `eras.json`. Throw, naming the span, when a span has no `src` or a tag missing from the registry. Carry `src` onto the modern parts that are not CShapes'.
- [ ] **Step 4:** Start the full build (Global Constraints). While it runs, do Task 3. A throw from Step 3 names the site to fix; fix it and restart.
- [ ] **Step 5:** When it ends with `EXIT 0`, run `node chronia/tools/build-sources.mjs --check`. Expected: "codes ok" and a count of rows per borders tag.
- [ ] **Step 6: Commit** the tools (the data is committed in Task 5, after the last rebase).

### Task 3: "Applies to" for the ledger's entries

**Files:**
- Modify: `chronia/LEDGER.md`

- [ ] **Step 1:** For each entry, read it and add the line under "What changed". The names are the polities whose borders, dates, or names the entry's sources back, spelled as in `data/eras.json`'s `polities`; an entry about map-wide clean-up, the page, or geography takes `none`.
- [ ] **Step 2:** Check every name: a short script lists names in the notes that are not in `polities`. Expected: none.
- [ ] **Step 3: Run** `node chronia/tools/build-sources.mjs`. Expected: no entry skipped.
- [ ] **Step 4: Commit.**

### Task 4: The section on the card

**Files:**
- Modify: `chronia/index.html` (after `#wiki-more`), `chronia/app.js` (the polity object near line 1008, the card near lines 5740 and 6100, the report form near line 6320), `chronia/app.css`
- Modify: `tools/chronia-page-check.mjs`

**Interfaces:**
- Consumes: `eras.json`'s `srcKeys` and `sources`; each file's `src`; `data/sources.json`'s `notes`.
- Markup: `<details class="ch-src" id="src" hidden><summary>Sources</summary><div class="ch-src-body" id="src-body"></div></details>`.
- A polity gains `src: [borders, name, dates] | null` (null when the file has no codes).
- `notesFor(name: string, year: number, notes: Note[]): Note[]`: those listing the name whose years hold the year.

Behaviour:
- Lines, in order: "Borders" ("Extent" for a people), "Dates", "Name", "Text", then one "Editors' notes" block per matching note (its title, then its sources as a numbered list), then a "Report a problem" button.
- A line's text is the registry's phrase; each source in `ids` with a `url` is a link (`target="_blank"`, `rel="noopener noreferrer"`).
- "Name": the `editors` phrase adds ", matching Wikipedia's article title" when the card's article title equals the name shown.
- "Text": "Wikipedia, “<title>”" when the extract is shown; the wording the card already uses for an AI-written note when one is shown; the line is left out when there is no text.
- Closed by default; opening or closing it is remembered until the page is left. The notes are fetched once, on the first open; while they load the block says "Looking up the editors' notes"; on failure, "The editors' notes could not be loaded."
- "Report a problem" opens the report form with the card's place and the date shown filled in.
- Hidden for a card with no polity and when `src` is null.

- [ ] **Step 1: Add the failing page checks:**
  - June 15, 1845, Luxembourg (6.1° E, 49.6° N): the section exists and is closed; "Borders" contains "Natural Earth" and "editors"; once opened, a note whose title starts "1815–1866 | the Low Countries".
  - 1500, France (2.5° E, 47° N): "Borders" contains "Cliopatria".
  - January 1, 2000, France: "Borders" contains "CShapes 2.0".
  - With `data/sources.json` blocked by the check's route handler: the "Borders" line still shows, and the notes block reads "The editors' notes could not be loaded."
  - With every chunk's `src` stripped by a route handler: `#src` is hidden.
  - At 320 px wide with the section open: `#src-body`'s `scrollWidth` is no more than its `clientWidth`.
- [ ] **Step 2: Run** `node tools/chronia-page-check.mjs http://localhost:8101/chronia/`. Expected: the new cases FAIL.
- [ ] **Step 3: Implement** the markup, the code, and the styles (the card's own type and spacing; the summary styled like the card's other quiet links).
- [ ] **Step 4: Run** the page check and `node tools/chronia-dev-check.mjs http://localhost:8101/chronia/`. Expected: all pass, no page errors. Look at the three cards in a screenshot at desktop and iPhone SE sizes.
- [ ] **Step 5: Commit.**

### Task 5: Documents, the last rebuild, and shipping

**Files:**
- Modify: `chronia/README.md` (a "Sources on the card" section; `data/sources.json` and `tools/sources.json` in the files table), `chronia/LEDGER.md` (this change's entry, "Applies to: none")

- [ ] **Step 1:** Write the README section and the ledger entry.
- [ ] **Step 2:** `git pull --rebase`. If the data or the build tools changed upstream, take upstream's data, rerun the full build, then `build-sources.mjs --check`, the node tests, and both page checks.
- [ ] **Step 3:** Commit the data with the documents and push. Confirm `git status -sb` shows nothing ahead of origin.
