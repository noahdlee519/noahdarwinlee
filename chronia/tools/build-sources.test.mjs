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
  assert.deepEqual(notes, [{ title: "1815–1866 | the Low Countries | Luxembourg", names: ["Luxembourg", "Duchy of Limburg"], from: 1839, to: 1866, sources: ["A b", "C, \"D\"."] }]);
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
