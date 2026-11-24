// The rules of CHRONIA's comments, apart from the network: whether a username may be taken, whether a comment
// may be posted (and its tidied text), a map date as a number for "nearest", and a picture's kind by its bytes.
// The word lists come from lists.ts, which tools/build-comment-lists.mjs writes; every set and regular
// expression here is built once, when the module loads, so a check takes a fraction of a millisecond.

import { ALLOW, COMMENT_ANYWHERE, COMMENT_STRONG, COMMENT_WORDS, NAME_WORDS, RESERVED, SITE, STRONG } from "./lists.ts";

// Usernames

const SHAPE = /^[A-Za-z][A-Za-z0-9_]{2,19}$/;
const RESERVED_SET = new Set(RESERVED);
const NAME_SET = new Set(NAME_WORDS);
const ALLOW_SET = new Set(ALLOW);
// The site's own words may not begin or end a name after an underscore or digits: chronia_team, admin2, the_mod.
const SITE_AFFIX = new RegExp(`^(?:${SITE.join("|")})(?:_|\\d)|(?:_|\\d)(?:${SITE.join("|")})$`);
// Longer words, and the strongest short ones, are refused anywhere in a name, once the allowed words are masked.
const ANYWHERE = new RegExp([...NAME_WORDS.filter((w) => w.length > 4), ...STRONG].join("|"));
const ALLOWED = new RegExp([...ALLOW].sort((a, b) => b.length - a.length).join("|"), "gi");
// A name's parts: split at underscores, at runs of digits, and where a capital follows a small letter.
const PARTS = /_+|\d+|(?<=[a-z])(?=[A-Z])/;

// Look-alikes folded to letters; "1" may stand for i or l, so a name is folded both ways.
const LOOKS: Record<string, string> = { "0": "o", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", "$": "s" };
function folds(s: string): string[] {
  const base = s.replace(/[034578@$]/g, (c) => LOOKS[c]);
  return [base.replace(/1/g, "i"), base.replace(/1/g, "l")];
}

export function checkUsername(name: string): { ok: true; key: string } | { ok: false; why: "shape" | "reserved" | "word" } {
  if (!SHAPE.test(name)) return { ok: false, why: "shape" };
  const key = name.toLowerCase();
  const folded = folds(key);
  const joined = [key, ...folded].map((s) => s.replace(/_/g, ""));
  if ([key, ...joined].some((s) => RESERVED_SET.has(s)) || [key, ...folded].some((s) => SITE_AFFIX.test(s))) {
    return { ok: false, why: "reserved" };
  }
  const parts = [name, ...folds(name)].flatMap((s) => s.split(PARTS)).map((s) => s.toLowerCase());
  for (const p of [...parts, key, ...joined]) {
    if (NAME_SET.has(p) && !ALLOW_SET.has(p)) return { ok: false, why: "word" };
  }
  if (joined.some((s) => ANYWHERE.test(s.replace(ALLOWED, "|")))) return { ok: false, why: "word" };
  return { ok: true, key };
}

// Comments

const MAX_CHARS = 500;
// deno-lint-ignore no-control-regex -- removing control characters is the point
const CONTROL = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u200B\u2060\uFEFF\u202A-\u202E\u2066-\u2069]/g;

// Anything that reads as a web address: a scheme, www., a word.tld/ path, or a bare domain in a common TLD.
const LINKS = [
  /https?:\/\//i,
  /(?<![\p{L}\p{N}])www\./iu,
  /[\p{L}\p{N}-]\.[a-z]{2,24}\//iu,
  /(?<![\p{L}\p{N}.])[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.(?:com|net|org|io|co|ru|uk|info|biz|xyz|app|dev|gov|edu|tv|cn|jp|gg|site|online|top|club|shop)(?=$|[\s/:?#),!;'"]|\.(?:$|\s))/iu,
];

// Each letter of a refused word matches itself, its look-alikes, and, in words of five letters or more, itself
// without its accent (short words keep their accents, so French "pédé" doesn't catch Portuguese "pede").
// Only the strongest words match stretched ("fuuuck") or spaced out ("f.u.c.k"), since stretching every word
// would let Portuguese "foder" catch "fodder".
const LOOK_FOR: Record<string, string> = { a: "4@", e: "3", i: "1!|", l: "1|", o: "0", s: "5$", t: "7+", b: "8", g: "9" };
const esc = (s: string) => s.replace(/[\\\]\[^\-]/g, "\\$&");
function letters(word: string, sep = "", more = ""): string {
  const loose = word.replace(/[\s-]/g, "").length >= 5;
  const out: string[] = [];
  for (const ch of word) {
    if (/\s/.test(ch)) out.push("[\\s\\-]+");
    else if (ch === "-") out.push("[\\s\\-]*");
    else {
      const bare = ch.normalize("NFD").replace(/\p{M}/gu, "");
      const set = ch + (loose && bare !== ch ? bare : "") + (LOOK_FOR[bare] ?? "");
      out.push(`[${esc(set)}]${more}`);
    }
  }
  return out.join(sep);
}
const START = "(?<![\\p{L}\\p{N}])", END = "(?![\\p{L}])", SPACED = "[^\\p{L}\\p{N}\\n]{0,2}";
const COMMENT_RE = new RegExp([
  ...COMMENT_WORDS.map((w) => START + letters(w) + `[s5$]?` + END),
  ...COMMENT_STRONG.map((w) => START + letters(w, SPACED, "+") + "\\p{L}*"),
  ...COMMENT_ANYWHERE.flatMap((w) => [letters(w, "", "+"), START + letters(w, SPACED, "+")]),
].join("|"), "u");

function tidy(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(CONTROL, (c) => (c === "\t" ? " " : ""))
    .replace(/[^\S\n]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function checkComment(text: string): { ok: true; text: string } | { ok: false; why: "empty" | "long" | "link" | "word" } {
  const t = tidy(text);
  if (!t) return { ok: false, why: "empty" };
  if ([...t].length > MAX_CHARS) return { ok: false, why: "long" };
  if (LINKS.some((r) => r.test(t))) return { ok: false, why: "link" };
  const seen = t.normalize("NFKC").toLowerCase().replace(/[\u200C\u200D]/g, "");
  if (COMMENT_RE.test(seen)) return { ok: false, why: "word" };
  return { ok: true, text: t };
}

// Map dates

const AT = /^(-?)(\d{1,4})(?:-(\d{2})(?:-(\d{2}))?)?$/;
const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const BEFORE = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]; // days before each month, in a common year

// A map date, -YYYY[-MM[-DD]], as a fractional year: 1789-07-14 is about 1789.53. 29 February passes in any year.
export function atNumber(at: string): number | null {
  const m = AT.exec(at);
  if (!m) return null;
  const month = m[3] ? +m[3] : 1, day = m[4] ? +m[4] : 1;
  if (month < 1 || month > 12 || day < 1 || day > MONTH_DAYS[month - 1]) return null;
  const year = (m[1] ? -1 : 1) * +m[2];
  return year + Math.min(BEFORE[month - 1] + day - 1, 364) / 365 || 0;
}

// Pictures

// A picture's kind by its first bytes: WebP, JPEG, or PNG, and nothing else.
export function imageKind(bytes: Uint8Array): "webp" | "jpeg" | "png" | null {
  const at = (i: number, ...xs: number[]) => bytes.length >= i + xs.length && xs.every((x, j) => bytes[i + j] === x);
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "webp";
  if (at(0, 0xff, 0xd8, 0xff)) return "jpeg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  return null;
}
