// Tests for the rules of CHRONIA's comments: usernames, comments, map dates, and pictures.
// Run with `deno test rules.test.ts` from this folder. Plain assertions, so no network is needed.
// The worst words are built from pieces, so they don't sit whole in this file or its output.

import { atNumber, checkComment, checkUsername, foldName, imageKind } from "./rules.ts";

function eq(got: unknown, want: unknown, what: string) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) throw new Error(`${what}: got ${g}, wanted ${w}`);
}

const F = "fu" + "ck", C = "cu" + "nt", N = "nig" + "ger", S = "sh" + "it";

// Usernames

const goodNames = [
  "Essex_Man", "Titus", "Scunthorpe", "Assassin9", "Cumberland", "Middlesex", "Dickens", "Hancock",
  "Cockburn", "Shitake", "noahs_ark", "administer", "Sussex", "Wessex", "assess", "bassist", "classic",
  "Glass_Onion", "grass", "Passport", "mass_effect", "cucumber", "document", "circumstance", "Dickinson",
  "cockpit", "cocktail", "peacock", "Hitchcock", "title", "constitution", "institute", "analysis", "analyst",
  "canal", "Japan", "shiitake", "therapist", "grape", "drape", "scrape", "arsenal", "parse", "sparse", "button",
  "butter", "butte", "sextant", "sexton", "basement", "Montenegro", "Mona_Lisa", "Regina", "Cummings", "thorny",
  "Hooke", "Ada", "Lin_Zexu", "Marco_Polo", "abc", "Peterborough", "Socialist", "Specialist", "Caballero",
  "Shinnecock", "Mong", "Historische", "Montauk", "Palazzo_Vecchio", "Kut",
];
for (const name of goodNames) {
  Deno.test(`username passes: ${name}`, () => {
    eq(checkUsername(name), { ok: true, key: name.toLowerCase(), fold: foldName(name) }, name);
  });
}

const badNames: [string, string, string][] = [
  ["ab", "shape", "too short"],
  ["9lives", "shape", "starts with a digit"],
  ["_under", "shape", "starts with an underscore"],
  ["a".repeat(21), "shape", "21 characters"],
  ["Abc" + "d".repeat(17), "ok", "20 characters"],
  ["two words", "shape", "a space"],
  ["two-words", "shape", "a hyphen"],
  ["Émile", "shape", "a letter outside A to Z"],
  ["admin", "reserved", "admin"],
  ["Adm1n", "reserved", "admin with a look-alike digit"],
  ["chronia_team", "reserved", "chronia_team"],
  ["Moderator", "reserved", "Moderator"],
  ["admin2", "reserved", "admin2"],
  ["the_moderator", "reserved", "the_moderator"],
  ["Noah", "reserved", "noah"],
  ["n0ahdarwinlee", "reserved", "noahdarwinlee with a zero"],
  ["UCHRONIA", "reserved", "uchronia"],
  ["staff_99", "reserved", "staff_99"],
  ["login", "reserved", "from the blocklist"],
  ["webmaster", "reserved", "from the blocklist"],
  ["anonymous", "reserved", "anonymous"],
  [F + "er", "word", "a profanity plain"],
  ["Big_" + S, "word", "a short profanity as a part"],
  [F + "_off", "word", "a profanity at the start"],
  ["sh1t_happens", "word", "a profanity with a look-alike digit"],
  ["Sl" + "u7", "word", "a short word with a look-alike digit"],
  ["xx" + F + "facexx", "word", "a profanity inside a longer name"],
  ["the" + C + "s", "word", "the c-word inside a longer name"],
  ["Mr" + N.slice(0, 3).toUpperCase() + N.slice(3), "word", "a slur inside a longer name"],
  ["Sh" + "itHead", "word", "a short word split off at a capital"],
  ["mega_" + "porn", "word", "a short word as a part"],
  ["xyz" + "semen", "word", "a long word anywhere"],
  ["the_rap" + "ist", "word", "a long word as a part"],
  ["merde_alors", "word", "a word from the French list"],
  ["Hurens" + "ohn", "word", "a word from the German list"],
];
for (const [name, why, what] of badNames) {
  Deno.test(`username ${why === "ok" ? "passes" : "refused"}: ${what}`, () => {
    const r = checkUsername(name);
    if (why === "ok") eq(r.ok, true, what);
    else eq(r, { ok: false, why }, what);
  });
}

Deno.test("username key is the lowercase name, and fold its look-alike form", () => {
  eq(checkUsername("Lin_Zexu"), { ok: true, key: "lin_zexu", fold: "llnzexu" }, "key and fold");
});

Deno.test("foldName: lowercase, no underscores, and each look-alike as one letter", () => {
  const cases: [string, string][] = [
    ["Herodotus", "herodotus"], ["Her0dotus", "herodotus"], ["HER0DOTUS", "herodotus"],
    ["Iliad", "lllad"], ["lliad", "lllad"], ["1liad", "lllad"], ["ILIAD", "lllad"],
    ["EssexMan", "essexman"], ["Essex_Man", "essexman"], ["E55ex__Man", "essexman"],
    ["T3st_4ll_5even_7_8", "testallseventb"], ["Barn", "barn"], ["Bam", "bam"],
    ["Agent_2_6_9", "agent269"],
  ];
  for (const [name, want] of cases) eq(foldName(name), want, name);
  eq(foldName("Barn") === foldName("Bam"), false, "rn is not folded to m");
});

Deno.test("names that look alike fold alike", () => {
  const same: [string, string][] = [["Herodotus", "Her0dotus"], ["Iliad", "lliad"], ["EssexMan", "Essex_Man"], ["Mary_Lee", "M4ryLee"]];
  for (const [a, b] of same) {
    const x = checkUsername(a), y = checkUsername(b);
    eq(x.ok && y.ok && x.fold === y.fold, true, a + " and " + b);
  }
});

// Comments

const goodComments = [
  "The Rape of Nanjing", "Nazi Germany", "the slave trade", "Essex", "sex and the medieval church",
  "sexual politics at court", "they would kill the envoys", "murder in the cathedral", "a genocide",
  "homosexual men were persecuted", "the Jew of Malta", "the Negro Leagues", "Scunthorpe United",
  "Cocktails at the Congress of Vienna", "a Dickensian slum", "Hancock signed first", "shiitake trade",
  "classic assassination", "the Middlesex election", "Titus took Jerusalem in 70 CE", "e.g. the treaty",
  "St.Petersburg in 1905", "1.5 million people", "Ended.Co-operation followed", "Pompadour", "Montana",
  "Mr. Fuchs", "the Siege of Kut", "fodder for the cannons", "historische Karte", "Hmong", "Putao",
];
for (const text of goodComments) {
  Deno.test(`comment passes: ${text}`, () => {
    eq(checkComment(text), { ok: true, text }, text);
  });
}

const badComments: [string, string, string][] = [
  ["", "empty", "empty"],
  ["     ", "empty", "only spaces"],
  ["\n\n \t\n", "empty", "only blank lines"],
  ["x".repeat(501), "long", "501 characters"],
  ["see http://x.co", "link", "an http address"],
  ["see HTTPS://x.co/a", "link", "an https address in capitals"],
  ["www.example.com", "link", "a www address"],
  ["example.com/page", "link", "a word.tld/ address"],
  ["go to example.com now", "link", "a bare .com"],
  ["mirror at site.ru.", "link", "a bare .ru"],
  ["read wiki.io", "link", "a bare .io"],
  ["what the " + F, "word", "the f-word"],
  [F.toUpperCase() + "ING hell", "word", "a form of the f-word in capitals"],
  ["mother" + F + "er", "word", "the f-word inside a longer word"],
  ["f" + "uuuu" + "ck this", "word", "stretched letters"],
  ["f.u.c.k this", "word", "letters with dots"],
  ["f u c k this", "word", "letters with spaces"],
  [F + "!", "word", "followed by a mark"],
  ["you " + C, "word", "the c-word"],
  ["you c" + "u" + "n7", "word", "the c-word with a look-alike digit"],
  ["those " + N + "s", "word", "a slur"],
  ["those n1gg" + "ers", "word", "a slur with a look-alike digit"],
  [N.split("").join(" ") + "s", "word", "a slur spaced out"],
  ["k" + "ike", "word", "a short slur"],
  ["vaffan" + "culo", "word", "an Italian obscenity"],
  ["ku" + "rwa mać", "word", "a Polish obscenity"],
  ["hijo de " + "puta", "word", "a Spanish phrase"],
  ["encul" + "é", "word", "a French word with its accent"],
  ["encul" + "e", "word", "a French word without its accent"],
  ["ху" + "й", "word", "a Russian word"],
];
for (const [text, why, what] of badComments) {
  Deno.test(`comment refused (${why}): ${what}`, () => {
    eq(checkComment(text), { ok: false, why }, what);
  });
}

Deno.test("comment of exactly 500 characters passes", () => {
  const text = "x".repeat(500);
  eq(checkComment(text), { ok: true, text }, "500");
});

Deno.test("comment length counts code points, not UTF-16 units", () => {
  const text = "𓀀".repeat(500);
  eq(checkComment(text).ok, true, "500 hieroglyphs");
  eq(checkComment(text + "𓀀"), { ok: false, why: "long" }, "501 hieroglyphs");
});

Deno.test("comment length is counted after tidying", () => {
  const text = "  " + "x".repeat(250) + "        " + "y".repeat(249) + "  ";
  eq(checkComment(text), { ok: true, text: "x".repeat(250) + " " + "y".repeat(249) }, "tidied");
});

Deno.test("comment is tidied", () => {
  eq(checkComment("  a   b\t\tc  "), { ok: true, text: "a b c" }, "spaces");
  eq(checkComment("a\n\n\n\n\nb"), { ok: true, text: "a\n\nb" }, "newlines");
  eq(checkComment("a\r\nb"), { ok: true, text: "a\nb" }, "carriage returns");
  eq(checkComment("a\u0000b\u0007c\u202Ed"), { ok: true, text: "abcd" }, "control characters");
  eq(checkComment("a  \n  b"), { ok: true, text: "a\nb" }, "spaces around a newline");
});

Deno.test("a refused word only inside an innocent longer word passes", () => {
  for (const text of ["Scunthorpe", "the kikeriki of a rooster", "cockatoo", "a spicy dish", "sukiyaki", "Pakistan"]) {
    eq(checkComment(text).ok, true, text);
  }
});

Deno.test("a comment check is fast", () => {
  const text = ("The Rape of Nanjing and the slave trade, 1937 to 1938. ").repeat(9).slice(0, 500);
  checkComment(text);
  const t0 = performance.now();
  for (let i = 0; i < 200; i++) checkComment(text);
  const each = (performance.now() - t0) / 200;
  if (each > 1) throw new Error(`a check took ${each.toFixed(3)} ms`);
});

// Map dates

Deno.test("atNumber", () => {
  const d = atNumber("1789-07-14");
  if (d === null || !(d > 1789.5 && d < 1789.6)) throw new Error(`1789-07-14 gave ${d}`);
  eq(atNumber("-0500"), -500, "-0500");
  eq(atNumber("1789"), 1789, "1789");
  eq(atNumber("0"), 0, "0");
  eq(atNumber("1789-01"), 1789, "January");
  eq(atNumber("1789-01-01"), 1789, "1 January");
  const dec = atNumber("1789-12-31")!;
  if (!(dec > 1789.99 && dec < 1790)) throw new Error(`1789-12-31 gave ${dec}`);
  const july = atNumber("1789-07")!;
  if (!(july > 1789.49 && july < 1789.5)) throw new Error(`1789-07 gave ${july}`);
  const bc = atNumber("-0044-03-15")!;
  if (!(bc > -44 + 0.19 && bc < -44 + 0.21)) throw new Error(`-0044-03-15 gave ${bc}`);
  for (const bad of ["", "abc", "1789-13", "1789-00", "1789-07-32", "1789-02-30", "1789-7-14", "17890", "1789-07-14x", " 1789", "+1789", "--1"]) {
    eq(atNumber(bad), null, JSON.stringify(bad));
  }
});

// Pictures

Deno.test("imageKind", () => {
  const b = (...xs: number[]) => new Uint8Array(xs);
  const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
  eq(imageKind(b(...ascii("RIFF"), 1, 2, 3, 4, ...ascii("WEBP"), ...ascii("VP8 "))), "webp", "webp");
  eq(imageKind(b(0xff, 0xd8, 0xff, 0xe0, 0, 0x10)), "jpeg", "jpeg");
  eq(imageKind(b(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13)), "png", "png");
  eq(imageKind(b(...ascii("RIFF"), 1, 2, 3, 4, ...ascii("WAVE"))), null, "a wav file");
  eq(imageKind(b(...ascii("GIF89a"))), null, "a gif");
  eq(imageKind(b(...ascii("<svg xmlns"))), null, "an svg");
  eq(imageKind(b(0xff, 0xd8)), null, "too short for a jpeg");
  eq(imageKind(b()), null, "empty");
});
