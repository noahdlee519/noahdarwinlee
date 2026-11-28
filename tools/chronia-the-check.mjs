// Checks English's "the" and verb number for every name in the atlas: node tools/chronia-the-check.mjs [--write]
// It runs the rule itself, cut out of chronia/app.js (nameForm and its lists), over every state and people in
// data/eras.json, every side in the zones of control, every tag that the Follow button names, and every division,
// and holds the answers against the reviewed list in tools/chronia-the.txt. A name the list does not have is new and
// wants a look; a name whose answer differs has been moved by a change to the rule. Read what it prints, mend the
// lists in app.js where the rule is wrong, and run it with --write to accept the rest (Noah, 27 November 2026).
// Each line of the list reads: kind (state, people, side, tag, division), then "the" or "-", then "many" or "one"
// for the verb, then the name.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), ".."), data = join(root, "chronia/data");
const src = readFileSync(join(root, "chronia/app.js"), "utf8");
const from = src.indexOf("  var THE_NO = "), to = src.indexOf("  // A state's or people's name as it reads inside a sentence");
if (from < 0 || to < from) { console.error("The rule was not found in chronia/app.js."); process.exit(2); }
const { nameForm, theName } = new Function(src.slice(from, to) + "\nreturn { nameForm: nameForm, theName: theName };")();
const json = (p) => JSON.parse(readFileSync(p, "utf8"));

const rows = new Map();
const add = (kind, k, name) => {
  if (typeof name !== "string" || !name) return;
  const f = nameForm(name, k), own = /^the /i.test(name);
  rows.set(kind + "\t" + name, (f & 1 || own ? "the" : "-") + "\t" + (f & 2 ? "many" : "one"));
};
for (const e of json(join(data, "eras.json")).polities) add(e[4] ? "people" : "state", e[4] ? 1 : 0, e[0]);
for (const f of readdirSync(join(data, "control"))) if (/\.json$/.test(f)) for (const s of json(join(data, "control", f)).sides || []) add("side", 0, s[1]);
for (const t of json(join(data, "tags.json"))) add("tag", 0, t[0]);
for (const f of readdirSync(join(data, "divisions"))) if (/\.json$/.test(f)) for (const r of json(join(data, "divisions", f)).rows || []) add("division", 2, r[0]);

const order = ["state", "people", "side", "tag", "division"];
const keys = [...rows.keys()].sort((a, b) => order.indexOf(a.split("\t")[0]) - order.indexOf(b.split("\t")[0]) || (a < b ? -1 : a > b ? 1 : 0));
const text = keys.map((k) => { const [kind, name] = k.split("\t"); return kind + "\t" + rows.get(k) + "\t" + name; }).join("\n") + "\n";
const file = join(root, "tools/chronia-the.txt");

// The sentences themselves, for the shapes most easily broken.
const SAY = [
  ["Poland", 0, "Poland"], ["Holy Roman Empire", 0, "the Holy Roman Empire"], ["Kingdom of France", 0, "the Kingdom of France"],
  ["Netherlands", 0, "the Netherlands"], ["United States", 0, "the United States"], ["Gambia", 0, "the Gambia"],
  ["Czech Republic", 0, "the Czech Republic"], ["Democratic Republic of the Congo", 0, "the Democratic Republic of the Congo"],
  ["Palatinate", 0, "the Palatinate"], ["Harsha's Empire", 0, "Harsha's Empire"], ["People's Republic of China", 0, "the People's Republic of China"],
  ["Hyderabad State", 0, "Hyderabad State"], ["Orange Free State", 0, "the Orange Free State"], ["Northern Wei", 0, "the Northern Wei"],
  ["Northern Cyprus", 0, "Northern Cyprus"], ["Li Zicheng", 0, "Li Zicheng"], ["Honduras", 0, "Honduras"], ["Seljuks", 0, "the Seljuks"],
  ["The Britains", 0, "the Britains"], ["Roman Republic (1798–1799)", 0, "the Roman Republic (1798–1799)"], ["minor states", 0, "minor states"],
  ["Russia and its proxies", 0, "Russia and its proxies"], ["Los Zetas", 0, "Los Zetas"], ["the Union", 0, "the Union"],
  ["Cherokee", 1, "the Cherokee"], ["Yamnaya culture", 1, "the Yamnaya culture"], ["Haida Gwaii", 1, "Haida Gwaii"], ["Hunter-gatherers", 1, "Hunter-gatherers"],
  ["District of Columbia", 2, "the District of Columbia"], ["Chiapas", 2, "Chiapas"], ["Rhineland-Palatinate", 2, "Rhineland-Palatinate"],
];
const MANY = [["Seljuks", 0, true], ["Cherokee", 1, true], ["Papal States", 0, true], ["United States", 0, false], ["Netherlands", 0, false], ["Philippines", 0, false], ["Yamnaya culture", 1, false], ["Poland", 0, false], ["Kingdoms of Malabar", 0, true], ["Kingdom of the Two Sicilies", 0, false]];
let bad = 0;
for (const [n, k, want] of SAY) { const got = theName(n, k, false); if (got !== want) { bad++; console.log("FAIL " + JSON.stringify(n) + " should read " + JSON.stringify(want) + ", got " + JSON.stringify(got)); } }
for (const [n, k, want] of MANY) { const got = !!(nameForm(n, k) & 2); if (got !== want) { bad++; console.log("FAIL " + JSON.stringify(n) + " should take a " + (want ? "plural" : "singular") + " verb"); } }
if (theName("minor states", 0, true) !== "Minor states" || theName("The Britains", 0, true) !== "The Britains" || theName("Seljuks", 0, true) !== "The Seljuks") { bad++; console.log("FAIL a name that begins a sentence"); }

if (process.argv.includes("--write")) { writeFileSync(file, text); console.log("Wrote " + keys.length + " names to tools/chronia-the.txt."); process.exit(bad ? 1 : 0); }
const had = new Map();
if (existsSync(file)) for (const l of readFileSync(file, "utf8").split("\n")) { if (!l) continue; const p = l.split("\t"); had.set(p[0] + "\t" + p.slice(3).join("\t"), p[1] + "\t" + p[2]); }
let fresh = 0, moved = 0, gone = 0;
const read = (v) => v.replace("\t", ", ");
for (const k of keys) {
  if (!had.has(k)) { fresh++; console.log("NEW   " + k.replace("\t", ": ") + " (" + read(rows.get(k)) + ")"); }
  else if (had.get(k) !== rows.get(k)) { moved++; console.log("MOVED " + k.replace("\t", ": ") + " (" + read(had.get(k)) + " to " + read(rows.get(k)) + ")"); }
}
for (const k of had.keys()) if (!rows.has(k)) gone++;
const count = (kind, the) => keys.filter((k) => k.startsWith(kind + "\t") && (rows.get(k).startsWith("the") === the)).length;
console.log(order.map((k) => k + ": " + count(k, true) + " with the, " + count(k, false) + " without").join("; ") + ".");
console.log(fresh + " new, " + moved + " moved, " + gone + " no longer in the data, " + bad + " failed.");
if (fresh || moved || gone) console.log("Look them over, then run with --write to accept them.");
process.exit(bad || fresh || moved ? 1 : 0);
