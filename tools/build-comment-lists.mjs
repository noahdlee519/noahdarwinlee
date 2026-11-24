// Builds supabase/functions/chronia-comments/lists.ts, the word lists behind CHRONIA's usernames and comments,
// from the vendored lists in tools/vendor/comment-lists/ (see its README for their sources and licences).
// Run it from anywhere: `node tools/build-comment-lists.mjs`. Running it twice gives the same file.
//
// It writes these lists:
//   RESERVED   names no one may take: The Big Username Blocklist, plus the site's own words (SITE)
//   SITE       the site's own words, which also may not begin or end a name after an underscore or digits
//   NAME_WORDS words refused anywhere in a username: every language's list, folded to plain a to z
//   STRONG     the few words refused in a name even inside a longer part (the rest of the short ones count
//              only as a whole part)
//   ALLOW      real words, places, and surnames that contain a refused word, and so pass
//   COMMENT_WORDS, COMMENT_STRONG, COMMENT_ANYWHERE  the narrow lists for comments (see below)

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const vendor = join(root, "tools/vendor/comment-lists");
const out = join(root, "supabase/functions/chronia-comments/lists.ts");
const LANGS = ["en", "cs", "de", "es", "fr", "it", "ja", "ko", "nl", "pl", "pt", "ru", "tr", "zh"];

// The site's own reserved words, from the design's list and a few more of the same kind.
const SITE = [
  "chronia", "uchronia", "chroniaatlas", "noah", "noahdarwinlee", "admin", "admins", "administrator", "moderator",
  "moderators", "mod", "mods", "team", "staff", "official", "support", "editor", "system", "anonymous", "deleted",
  "reviewer", "webmaster",
];

// Refused in a name even inside a longer part, though four letters or fewer. Without this, a name that
// merely runs the strongest words into others would pass. ALLOW lets the real words through.
const STRONG = ["fuck", "cunt", "shit", "cock", "twat"];

// Real English words, places, and surnames (and a few names from the other languages' lists) that contain
// a refused word. A name passes the word check where one of these covers the refused word.
const ALLOW = [
  // English places and people
  "scunthorpe", "middlesex", "essex", "sussex", "wessex", "cumberland", "cummings", "dickens", "dickinson",
  "hancock", "hitchcock", "cockburn", "babcock", "alcock", "laycock", "woodcock", "cockcroft", "titus",
  "montenegro", "negroni", "negroponte", "burroughs", "penistone", "shittim", "twatt",
  // English words
  "assassin", "assess", "bassist", "class", "classic", "glass", "grass", "pass", "mass", "cucumber", "document",
  "circumstance", "cockpit", "cocktail", "cockney", "cockerel", "cockatoo", "cockatiel", "cockatrice",
  "cockroach", "cockle", "peacock", "gamecock", "weathercock", "shuttlecock", "stopcock", "title",
  "constitution", "institute", "analysis", "analyst", "canal", "japan", "shiitake", "shitake", "therapist",
  "grape", "drape", "draping", "scrape", "scraping", "arsenal", "parse", "sparse", "button", "butter", "butte",
  "sextant", "sexton", "basement", "casement", "thorny", "trimming", "brimming", "skimming", "cockade",
  // names that happen to be words in another language's list
  "regina", "mona", "anita", "johny", "del", "griet", "montana", "montague", "montaigne", "pinto", "amador",
  "pompadour", "pompano", "ballet", "palenque", "palencia", "semenov",
  // found by running the atlas's own place names through the rules
  "peter", "socialis", "specialis", "caballero", "ballerina", "vecchi", "montauban", "montauk", "montalban",
  "montalembert", "shinnecock", "semenyih", "vaccaei", "skeeter", "pau", "mong", "kut",
];

// Entries of the vendored lists left out of the usernames' words: too mild, and inside too many ordinary
// words to allow one by one (German "ische" ends every "-ische" adjective, as in "historische").
const DROP = ["ische"];

// The comments' lists are chosen by hand and kept narrow, because CHRONIA is a history site: "The Rape of
// Nanjing", "Nazi Germany", "the slave trade", "sexual", "murder", "homosexual", "Jew", and "Negro Leagues"
// must all pass. Only slurs for groups of people and explicit obscenities are refused, as whole words.
// Every entry is one of the vendored lists' entries, or a plain form of one (marked).
// Dutch "kut" is left out, for the Siege of Kut. Japanese, Korean, and Chinese are left out: their words can't be matched as whole words, and we can't judge
// them well enough to match them inside text. Russian is limited to its plainest obscenities.
const COMMENT_ANYWHERE = ["fuck"]; // refused inside any word, stretched or spaced out
const COMMENT_STRONG = ["cunt", "nigger", "nigga", "faggot"]; // refused at a word's start, with any ending, stretched or spaced out
const COMMENT_WORDS = {
  en: [
    "motherfucker", "clusterfuck", "fucktards", "twat", "kike", "spic", "wetback", "beaner", "beaners", "paki",
    "raghead", "towelhead", "jigaboo", "jiggaboo", "jiggerboo", "darkie", "slanteye", "honkey", "pikey", "tranny",
    "shemale", "bulldyke", "nig nog", "blowjob", "blow job", "handjob", "rimjob", "footjob", "cumshot", "cumshots",
    "creampie", "bukkake", "gangbang", "jizz", "splooge", "goatse", "carpetmuncher", "fudgepacker",
  ],
  de: ["arschficker", "fotze", "hurensohn", "kanake", "schwanzlutscher", "schwuchtel", "wichser", "ficken", "kampflesbe"],
  fr: [
    "enculé", "enculée", "enculeur", "enculeurs", "fils de pute", "fille de pute", "nique ta mère", "nique ta race",
    "la putain de ta mère", "connard", "connasse", "salope", "pédé", "pouffiasse", "putain", "sac à foutre",
  ],
  es: [
    "chupapollas", "gilipollas", "jilipollas", "hijo de puta", "hija de puta", "hijoputa", "hijaputa", "maricón",
    "mariconazo", "soplapollas", "puta", "concha de tu madre",
  ],
  it: [
    "vaffanculo", "cazzo", "testa di cazzo", "ciucciami il cazzo", "figlio di puttana", "puttana", "porca puttana",
    "frocio", "froscio", "culattone", "recchione", "minchia", "pompino", "terrone",
  ],
  pt: [
    "caralho", "filho da puta", "foda-se", "foder", "vai-te foder", "vai tomar no cu", "puta que pariu",
    "puta que te pariu", "paneleiro",
  ],
  nl: ["klootzak", "teringlijer", "neuken", "kontneuken", "flikker"],
  pl: [
    "kurwa", "kurwy", "do kurwy nędzy", "chuj", "huj", "jebać", "jebany", "ja pierdolę", "pierdolić", "pojebany",
    "popierdolony", "skurwysyn", "zajebisty", "pizda", "wkurwiać",
  ],
  cs: ["kurva", "piča", "pizda", "zmrd", "zkurvysyn", "jebat", "mrdat", "čurák"],
  tr: [
    "orospu", "orospuda", "orospudan", "orospular", "orospulara", "orospularda", "orospulardan", "orospuları",
    "orospuların", "orospunun", "orospuya", "orospuyu", "siktir", "sikmek", "amcık", "amcığa", "amcığı", "amcığın",
    "amcıklar", "amcıklara", "amcıklarda", "amcıklardan", "amcıkları", "amcıkların", "amcıkta", "amcıktan",
  ],
  ru: ["блядь", "блядство", "ебать", "ебло", "ёбарь", "ёб твою мать", "во пизду", "дать пизды", "спиздить", "хуй", "хуёво", "хуёвый", "хуило", "охуеть", "на хуй", "мудило"],
};

const read = (f) => readFileSync(join(vendor, f), "utf8").split("\n").map((s) => s.trim()).filter(Boolean);

// A list entry as a username could hold it: lowercase a to z only, with accents and spaces dropped.
function plain(s) {
  return s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/ß/g, "ss").replace(/ı/g, "i")
    .replace(/[\s'`\-.,]/g, "");
}

const reserved = new Set(read("usernames.txt").map((s) => s.toLowerCase()).filter((s) => /^[a-z0-9_]+$/.test(s)));
for (const w of SITE) reserved.add(w);

const nameWords = new Set(STRONG);
for (const lang of LANGS) for (const w of read(lang)) {
  const p = plain(w);
  if (/^[a-z]{2,}$/.test(p) && !DROP.includes(p)) nameWords.add(p);
}

// Every comment entry must come from the vendored lists (or be marked as a plain form above).
const nfc = (s) => s.normalize("NFC").toLowerCase();
const vendored = new Set(LANGS.flatMap((l) => read(l).map(nfc)));
const commentWords = [];
for (const [lang, ws] of Object.entries(COMMENT_WORDS)) {
  for (const w of ws) {
    if (!vendored.has(nfc(w))) throw new Error(`${lang}: "${w}" is not in the vendored lists`);
    commentWords.push(nfc(w));
  }
}
for (const w of [...COMMENT_ANYWHERE, ...COMMENT_STRONG]) if (!vendored.has(w)) throw new Error(`"${w}" is not in the vendored lists`);

const sorted = (xs) => [...new Set(xs)].sort();
const line = (name, xs, note) => `// ${note}\nexport const ${name}: readonly string[] = ${JSON.stringify(sorted(xs))};\n`;

const text = `// Generated by tools/build-comment-lists.mjs from tools/vendor/comment-lists/. Do not edit: change the
// script, or the vendored lists, and run \`node tools/build-comment-lists.mjs\` again.
// Sources: The Big Username Blocklist (MIT) and the List of Dirty, Naughty, Obscene, and Otherwise Bad Words
// (CC BY 4.0); see the vendored folder's README.

${line("RESERVED", [...reserved], "Names no one may take.")}
${line("SITE", SITE, "The site's own words, which also may not begin or end a name after an underscore or digits.")}
${line("NAME_WORDS", [...nameWords], "Words refused in a username: four letters or fewer only as a whole part, longer ones anywhere.")}
${line("STRONG", STRONG, "Short words refused in a username even inside a longer part.")}
${line("ALLOW", ALLOW, "Real words, places, and surnames that contain a refused word.")}
${line("COMMENT_WORDS", commentWords, "Refused in comments as whole words.")}
${line("COMMENT_STRONG", COMMENT_STRONG, "Refused in comments at a word's start with any ending, even spaced out.")}
${line("COMMENT_ANYWHERE", COMMENT_ANYWHERE, "Refused in comments inside any word, even spaced out.")}`;

writeFileSync(out, text);
console.log(`wrote ${out}: ${reserved.size} reserved, ${nameWords.size} name words, ${commentWords.length} comment words`);
