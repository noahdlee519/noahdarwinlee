// Tests for the ledger parser behind the card's Sources section: node --test chronia/tools/build-sources.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseYears, plain, parseLedger } from "./build-sources.mjs";

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
  assert.deepEqual(notes, [{ title: "1815–1866 | the Low Countries | Luxembourg", names: ["Luxembourg", "Duchy of Limburg"], tags: [], from: 1839, to: 1866, sources: ["A b", "C, “D”."] }]);
  assert.deepEqual(skipped, []);
});
test("parseLedger: heading years when the line gives none, none is left out, a missing line is skipped", () => {
  const md = "## 1660–1800 | Ireland | K\n- Applies to: Kingdom of Ireland\n- Sources: one source\n\n## 1886–2026 | the world | slivers\n- Applies to: none\n- Sources: (1) x\n\n## 1900 | X | Y\n- Sources: (1) x\n\n## when | X | Z\n- Applies to: Z\n- Sources: q\n";
  const { notes, skipped } = parseLedger(md);
  assert.equal(notes.length, 1);
  assert.deepEqual([notes[0].from, notes[0].to, notes[0].sources], [1660, 1800, ["one source"]]);
  assert.deepEqual(skipped, ["1900 | X | Y", "when | X | Z"]);
});
test("parseLedger: the template inside a code fence is not an entry", () => {
  const md = "Each entry:\n\n```\n## <years> | <region> | <polity or subject>\n\n- Applies to: …\n- Sources: (1) …\n```\n\n## 1920 | A | B\n- Applies to: B\n- Sources: s\n";
  const { notes, skipped } = parseLedger(md);
  assert.deepEqual([notes.length, skipped], [1, []]);
});
test("parseLedger: tag:<borders tag> applies to every span drawn from that table", () => {
  const md = "## 476–961 | Europe | the early medieval table\n- Applies to: tag:medieval; Kingdom of the Gepids\n- Sources: (1) a (2) b\n";
  const { notes } = parseLedger(md);
  assert.deepEqual([notes[0].names, notes[0].tags, notes[0].from, notes[0].to], [["Kingdom of the Gepids"], ["medieval"], 476, 961]);
});
test("parseLedger: an entry with two Applies to lines gives two notes under one title", () => {
  const md = "## AD 100–599 and 960–1260 | A | B\n- Applies to: Miller Culture | 100–599\n- Applies to: Greenland | 960–1260\n- Sources: s\n";
  const { notes, skipped } = parseLedger(md);
  assert.deepEqual(notes.map((n) => [n.title, n.names, n.from, n.to]), [["AD 100–599 and 960–1260 | A | B", ["Miller Culture"], 100, 599], ["AD 100–599 and 960–1260 | A | B", ["Greenland"], 960, 1260]]);
  assert.deepEqual(skipped, []);
});
test("parseLedger: sources as a list of indented bullets, and none with no sources is not reported", () => {
  const md = "## 1792–2026 | C | S\n- Applies to: Bahamas\n- Sources:\n  - First, *a book* (1999).\n  - Second (2) thing.\n- Confidence: high.\n\n## 1861–2026 | world | zones\n- Applies to: none\n- Claimed by x\n";
  const { notes, skipped } = parseLedger(md);
  assert.deepEqual(notes.map((n) => n.sources), [["First, a book (1999).", "Second (2) thing."]]);
  assert.deepEqual(skipped, []);
});
test("parseLedger: a year in brackets is not a source number", () => {
  const { notes } = parseLedger("## 1918–1935 | A | B\n- Applies to: B\n- Sources: (1) the Treaty (1919) in force; (2) a map (1871) and more\n");
  assert.deepEqual(notes[0].sources, ["the Treaty (1919) in force", "a map (1871) and more"]);
});
test("plain: straight quotes become the page's curly ones", () => {
  assert.equal(plain('the articles "Treaty of London (1839)" and ("Vienna"), the editors\' own'), "the articles “Treaty of London (1839)” and (“Vienna”), the editors’ own");
});
test("parseLedger: a polity's name keeps its own apostrophe, so it still matches the card's", () => {
  const { notes } = parseLedger("## 1803–1856 | A | B\n- Applies to: Van Diemen's Land; Kievan Rus'\n- Sources: the editors' own\n");
  assert.deepEqual([notes[0].names, notes[0].sources], [["Van Diemen's Land", "Kievan Rus'"], ["the editors’ own"]]);
});
