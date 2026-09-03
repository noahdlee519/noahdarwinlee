#!/usr/bin/env node
//
// Turns exported Gmail messages into blog/posts.js.
//
//     node blog/import-gmail.mjs ~/path/to/the/exports
//     node blog/import-gmail.mjs ~/path/to/the/exports --dry
//
// Reads every .html, .htm, .eml and .txt in that folder, pulls the subject, the
// date, the sender and the body out of each, saves any attached images into
// blog/images/, and writes blog/posts.js. Nothing is installed to run it: it
// uses only what Node already has, because this site has no build step and one
// script that quietly needs `npm install` first is a script that stops working
// in a year.
//
// What it throws away, and why:
//
//   Gmail wraps a message in layers of its own — quoted-printable encoding,
//   nested tables used as layout, a <style> block, class names, inline styles
//   that assume a white background and a fixed width, tracking pixels, and the
//   "On Tuesday, X wrote:" block of everything the message was replying to.
//   None of that is the letter. What is kept is the text, the structure
//   (paragraphs, lists, headings, quotes, links) and the images.
//
//   Script tags, event handlers, iframes, objects, forms and javascript: URLs
//   are removed outright. The body is inserted into the page as HTML, so this
//   is the point at which that has to be safe — blog.js trusts what it is
//   given, and this is what gives it.
//
// What it cannot guess is labels. Add them by hand in posts.js afterwards; the
// script leaves any you have already added alone when you run it again.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT_JS = path.join(ROOT, "posts.js");
const IMAGE_DIR = path.join(ROOT, "images");

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const source = args.find((a) => !a.startsWith("--"));

if (!source) {
  console.error("usage: node blog/import-gmail.mjs <folder of exported mail> [--dry]");
  process.exit(1);
}
if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
  console.error("not a folder: " + source);
  process.exit(1);
}

/* ------------------------------------------------------------ decoding -- */

/* Quoted-printable, which is how a .eml carries anything that is not plain
   ASCII: "=E2=80=99" is a right single quote, and "=" at the end of a line
   means the line was only broken there to keep it short. */
function decodeQuotedPrintable(text) {
  return text
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}

/* An encoded-word: =?UTF-8?Q?...?= or =?UTF-8?B?...?=, which is how a subject
   line carries anything outside ASCII. */
function decodeEncodedWords(text) {
  return text.replace(
    /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g,
    (whole, charset, kind, payload) => {
      try {
        const bytes =
          kind.toUpperCase() === "B"
            ? Buffer.from(payload, "base64")
            : Buffer.from(decodeQuotedPrintable(payload.replace(/_/g, " ")), "binary");
        return new TextDecoder(charset.toLowerCase()).decode(bytes);
      } catch (err) {
        return whole;
      }
    }
  );
}

const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  mdash: "—", ndash: "–", hellip: "…", middot: "·"
};

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (whole, name) => {
      const key = name.toLowerCase();
      return Object.prototype.hasOwnProperty.call(ENTITIES, key)
        ? ENTITIES[key]
        : whole;
    });
}

/* ------------------------------------------------------- reading a file -- */

/* A .eml is headers, a blank line, then the body — possibly in several parts,
   each with its own headers. This walks it far enough to find the HTML part
   (or the plain-text one if that is all there is) and any image attachments. */
function readEml(raw) {
  const headers = {};
  const split = raw.search(/\r?\n\r?\n/);
  const headerBlock = split === -1 ? raw : raw.slice(0, split);
  const bodyBlock = split === -1 ? "" : raw.slice(split).replace(/^\r?\n\r?\n/, "");

  headerBlock
    .replace(/\r?\n[ \t]+/g, " ") // unfold wrapped header lines
    .split(/\r?\n/)
    .forEach((line) => {
      const at = line.indexOf(":");
      if (at === -1) return;
      headers[line.slice(0, at).trim().toLowerCase()] = line.slice(at + 1).trim();
    });

  const type = headers["content-type"] || "";
  const boundary = /boundary="?([^";]+)"?/i.exec(type);
  const images = [];
  let html = "";
  let text = "";

  function takePart(partHeaders, partBody) {
    const ctype = (partHeaders["content-type"] || "").toLowerCase();
    const encoding = (partHeaders["content-transfer-encoding"] || "").toLowerCase();

    let decoded;
    if (encoding === "base64") decoded = Buffer.from(partBody, "base64");
    else if (encoding === "quoted-printable")
      decoded = Buffer.from(decodeQuotedPrintable(partBody), "binary");
    else decoded = Buffer.from(partBody, "binary");

    if (ctype.startsWith("image/")) {
      const cid = (partHeaders["content-id"] || "").replace(/^<|>$/g, "");
      const name =
        /name="?([^";]+)"?/i.exec(partHeaders["content-type"] || "")?.[1] ||
        /filename="?([^";]+)"?/i.exec(partHeaders["content-disposition"] || "")?.[1] ||
        cid ||
        "image";
      images.push({ cid, name, data: decoded, mime: ctype.split(";")[0].trim() });
      return;
    }

    const charset = /charset="?([^";]+)"?/i.exec(ctype)?.[1] || "utf-8";
    let asText;
    try {
      asText = new TextDecoder(charset.toLowerCase()).decode(decoded);
    } catch (err) {
      asText = decoded.toString("utf8");
    }
    if (ctype.includes("text/html")) html = html || asText;
    else if (ctype.includes("text/plain")) text = text || asText;
  }

  if (boundary) {
    const marker = "--" + boundary[1];
    bodyBlock.split(marker).forEach((chunk) => {
      const trimmed = chunk.replace(/^\r?\n/, "");
      if (!trimmed || trimmed.startsWith("--")) return;
      const at = trimmed.search(/\r?\n\r?\n/);
      const ph = {};
      const hb = at === -1 ? trimmed : trimmed.slice(0, at);
      hb.replace(/\r?\n[ \t]+/g, " ")
        .split(/\r?\n/)
        .forEach((line) => {
          const c = line.indexOf(":");
          if (c === -1) return;
          ph[line.slice(0, c).trim().toLowerCase()] = line.slice(c + 1).trim();
        });
      takePart(ph, at === -1 ? "" : trimmed.slice(at).replace(/^\r?\n\r?\n/, ""));
    });
  } else {
    takePart(headers, bodyBlock);
  }

  return {
    subject: decodeEncodedWords(headers.subject || ""),
    from: decodeEncodedWords(headers.from || ""),
    to: decodeEncodedWords(headers.to || ""),
    date: headers.date || "",
    html,
    text,
    images
  };
}

/* A saved .html page: the headers are not headers any more, so the subject
   comes from <title> or the first heading and the date from whatever Gmail
   printed near the top. */
function readHtml(raw) {
  const title =
    /<title[^>]*>([\s\S]*?)<\/title>/i.exec(raw)?.[1] ||
    /<h[12][^>]*>([\s\S]*?)<\/h[12]>/i.exec(raw)?.[1] ||
    "";
  const whole = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(raw)?.[1] || raw;

  /* A saved Gmail page is the whole application around the message: the
     subject line, the sender row, the reply box, the chrome. The message
     itself sits in a container Gmail has marked, and taking that rather than
     the page keeps the letter from opening with its own headers repeated
     inside it. If none of the markers is there, the page is used whole —
     which is right for a message printed or forwarded on its own. */
  const body = messageContainer(whole) || whole;

  /* Gmail writes the sender as the address in a title attribute and the name
     as the text beside it: <span title="a@b.com">Their Name</span>. Take both
     when they are there, the address alone when they are not. */
  const pair = /title="([^"@]+@[^"]+)"[^>]*>([^<]{1,80})</i.exec(whole);
  const from = pair
    ? pair[2].trim() + " <" + pair[1].trim() + ">"
    : /title="([^"@]+@[^"]+)"/i.exec(whole)?.[1] || "";

  return {
    subject: decodeEntities(stripTags(title)).trim(),
    from,
    to: "",
    date: "",
    html: body,
    /* The date is printed in the page's chrome, which the container above
       deliberately excludes — so the whole page is kept for the date hunt. */
    dateSource: whole,
    text: "",
    images: []
  };
}

/* The classes Gmail puts on a message body, in the order worth trying. Each is
   matched by finding its opening tag and then walking forward counting <div>s,
   because a regex cannot balance them and the container is always nested. */
const BODY_MARKERS = [
  /<div[^>]*\bclass="[^"]*\ba3s\b[^"]*"[^>]*>/i,
  /<div[^>]*\bclass="[^"]*\bii\b[^"]*"[^>]*>/i,
  /<div[^>]*\bclass="[^"]*\bmsg-body\b[^"]*"[^>]*>/i
];

function messageContainer(html) {
  for (const marker of BODY_MARKERS) {
    const open = marker.exec(html);
    if (!open) continue;
    const start = open.index + open[0].length;
    const tagRe = /<(\/?)div\b[^>]*>/gi;
    tagRe.lastIndex = start;
    let depth = 1;
    let m;
    while ((m = tagRe.exec(html)) !== null) {
      depth += m[1] ? -1 : 1;
      if (depth === 0) return html.slice(start, m.index);
    }
    return html.slice(start); // unbalanced: take the rest
  }
  return null;
}

/* --------------------------------------------------------- cleaning up -- */

/* A space rather than nothing, so that "…Nagoya</p><p>I have…" reads as two
   words when it is flattened for a preview instead of one. */
function stripTags(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

/* Everything a letter is allowed to be, once Gmail's wrapper is off. */
const KEEP = new Set([
  "p", "br", "hr", "div", "span", "em", "i", "strong", "b", "u", "s",
  "a", "img", "figure", "figcaption",
  "ul", "ol", "li", "blockquote", "pre", "code",
  "h2", "h3", "h4", "table", "thead", "tbody", "tr", "td", "th", "sup", "sub"
]);

/* Attributes worth keeping, per tag. Everything else — class, style, width,
   bgcolor, data-*, and every on* handler — goes. */
const ATTRS = {
  a: ["href", "title"],
  img: ["src", "alt", "width", "height"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan"]
};

function sanitize(html) {
  let out = html;

  // whole elements, contents and all
  out = out.replace(
    /<(script|style|head|noscript|iframe|object|embed|form|button|input|select|textarea|svg|link|meta|title)\b[\s\S]*?<\/\1\s*>/gi,
    ""
  );
  out = out.replace(/<(link|meta|base)\b[^>]*>/gi, "");
  out = out.replace(/<!--[\s\S]*?-->/g, "");

  // Gmail's quoted history: everything from the "On <date>, <name> wrote:"
  // marker down, and anything it left in a gmail_quote container.
  out = out.replace(/<div[^>]*class="[^"]*gmail_quote[\s\S]*$/i, "");
  out = out.replace(/<blockquote[^>]*class="[^"]*gmail_quote[\s\S]*$/i, "");
  out = out.replace(
    /(<[^>]*>\s*)?On\s+\w{3},?\s+\w{3}\s+\d{1,2},?\s+\d{4}[\s\S]{0,120}?wrote:[\s\S]*$/i,
    ""
  );

  // tags: keep the allowed ones with their allowed attributes, drop the rest
  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (whole, rawTag, rawAttrs) => {
    const tag = rawTag.toLowerCase();
    if (!KEEP.has(tag)) return "";
    if (whole.startsWith("</")) return "</" + tag + ">";

    const allowed = ATTRS[tag] || [];
    const kept = [];
    const attrRe = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
    let m;
    while ((m = attrRe.exec(rawAttrs)) !== null) {
      const name = m[1].toLowerCase();
      if (!allowed.includes(name)) continue;
      const value = m[3] ?? m[4] ?? m[5] ?? "";
      if ((name === "href" || name === "src") && !safeUrl(value)) continue;
      kept.push(name + '="' + value.replace(/"/g, "&quot;") + '"');
    }
    const selfClosing = tag === "br" || tag === "hr" || tag === "img";
    return "<" + tag + (kept.length ? " " + kept.join(" ") : "") + (selfClosing ? " />" : ">");
  });

  // A pixel is not a picture. Anything 1 or 2 across is a tracker, and it would
  // report the reader to whoever set it every time this page is opened.
  out = out.replace(/<img\b[^>]*\/?>/gi, (tag) => {
    const w = Number(/\bwidth="(\d+)"/i.exec(tag)?.[1] ?? 99);
    const h = Number(/\bheight="(\d+)"/i.exec(tag)?.[1] ?? 99);
    return w <= 2 || h <= 2 ? "" : tag;
  });

  // An anchor whose href did not survive is no longer a link; keep its words.
  out = out.replace(/<a(?![^>]*\bhref=)[^>]*>([\s\S]*?)<\/a>/gi, "$1");

  out = unwrapLayoutTables(out);

  // empty wrappers Gmail leaves behind, and runs of blank paragraphs
  for (let i = 0; i < 4; i++) {
    out = out.replace(/<(div|span|p)>\s*<\/\1>/gi, "");
    out = out.replace(/<div>\s*(<br\s*\/?>\s*)+<\/div>/gi, "");
  }
  out = out.replace(/(\s*<br\s*\/?>\s*){3,}/gi, "<br /><br />");
  out = out.replace(/\s{2,}/g, " ").trim();

  return balance(out);
}

/* Cutting the quoted reply off the end takes the closing tags of anything that
   was still open with it. A browser repairs that silently, but the file should
   say what it means, so whatever is left open is closed here. */
const VOID = new Set(["br", "hr", "img"]);

function balance(html) {
  const open = [];
  const tagRe = /<(\/?)([a-z0-9]+)\b[^>]*?(\/?)>/gi;
  let m;
  while ((m = tagRe.exec(html)) !== null) {
    const tag = m[2].toLowerCase();
    if (VOID.has(tag) || m[3] === "/") continue;
    if (m[1]) {
      const at = open.lastIndexOf(tag);
      if (at !== -1) open.splice(at, 1);
    } else {
      open.push(tag);
    }
  }
  return html + open.reverse().map((tag) => "</" + tag + ">").join("");
}

/* Gmail lays a message out in tables — often three deep, to centre it at six
   hundred pixels. A table that never puts two cells in one row is doing that
   job and nothing else, so its scaffolding comes out and its contents stay. A
   table with real columns is left alone, because then it is a table. */
function unwrapLayoutTables(html) {
  let out = html;
  for (let pass = 0; pass < 6; pass++) {
    const before = out;
    out = out.replace(
      /<table\b[^>]*>([\s\S]*?)<\/table>/gi,
      (whole, inner) => {
        const multiColumn = /<td\b[^>]*>[\s\S]*?<\/td>\s*<td\b/i.test(inner) ||
          /<th\b/i.test(inner);
        if (multiColumn) return whole;
        return inner
          .replace(/<\/?(thead|tbody|tfoot|tr)\b[^>]*>/gi, "")
          .replace(/<td\b[^>]*>/gi, "")
          .replace(/<\/td>/gi, " ");
      }
    );
    if (out === before) break;
  }
  return out;
}

function safeUrl(value) {
  const url = value.trim().replace(/\s+/g, "");
  if (/^(https?:|mailto:|cid:|#|\/|\.\/|\.\.\/)/i.test(url)) return true;
  if (/^data:image\//i.test(url)) return true;
  return !/^[a-z][a-z0-9+.-]*:/i.test(url); // a bare relative path is fine
}

/* A plain-text file has no headers, so the convention is the one a letter uses
   anyway: the first line is the subject if a blank line follows it. Otherwise
   there is no subject here and the file name has to supply it. */
function readTxt(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let subject = "";
  if (lines.length > 2 && lines[0].trim() && !lines[1].trim()) {
    subject = lines.shift().trim();
    while (lines.length && !lines[0].trim()) lines.shift();
  }
  return {
    subject,
    from: "",
    to: "",
    date: "",
    html: "",
    text: lines.join("\n"),
    images: []
  };
}

/* Plain text, when that is all a message had: blank lines become paragraphs. */
function textToHtml(text) {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map(
      (para) =>
        "<p>" +
        para
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\r?\n/g, "<br />") +
        "</p>"
    )
    .join("");
}

/* --------------------------------------------------------------- bits -- */

function slug(text, taken) {
  let base = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  if (!base) base = "letter";
  let id = base;
  let n = 2;
  while (taken.has(id)) id = base + "-" + n++;
  taken.add(id);
  return id;
}

function firstWords(html, limit) {
  const text = decodeEntities(stripTags(html)).replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  return text.slice(0, limit).replace(/\s+\S*$/, "") + "…";
}

function nameAndAddress(from) {
  const angled = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from);
  if (angled) {
    return {
      name: angled[1].replace(/^"|"$/g, "").trim() || angled[2].split("@")[0],
      address: angled[2].trim()
    };
  }
  const bare = from.trim();
  if (!bare) return { name: "", address: "" };
  if (bare.includes("@")) return { name: bare.split("@")[0], address: bare };
  return { name: bare, address: "" };
}

/* A date out of the file, or out of the file's name, or the file's mtime —
   in that order, because the first is right and the last is at least stable. */
function pickDate(header, html, fallbackFile) {
  const fromHeader = header && Date.parse(header);
  if (fromHeader) return new Date(fromHeader).toISOString();

  const text = decodeEntities(stripTags(html)).replace(/\s+/g, " ");
  const patterns = [
    /\b(\d{1,2}\s+\w{3,9}\s+\d{4}(?:,?\s+\d{1,2}:\d{2}(?:\s*[AaPp][Mm])?)?)/,
    /\b(\w{3,9}\s+\d{1,2},\s+\d{4}(?:,?\s+\d{1,2}:\d{2}(?:\s*[AaPp][Mm])?)?)/,
    /\b(\d{4}-\d{2}-\d{2})/
  ];
  for (const re of patterns) {
    const hit = re.exec(text);
    const parsed = hit && Date.parse(hit[1]);
    if (parsed) return new Date(parsed).toISOString();
  }
  const inName = /(\d{4}-\d{2}-\d{2})/.exec(path.basename(fallbackFile));
  if (inName && Date.parse(inName[1])) return new Date(inName[1]).toISOString();
  return new Date(fs.statSync(fallbackFile).mtime).toISOString();
}

/* --------------------------------------------------- labels, preserved -- */

/* Labels are added by hand after the first import. Re-running should not wipe
   them, so the labels already in posts.js are read back and reapplied by id. */
function existingLabels() {
  const map = new Map();
  if (!fs.existsSync(OUT_JS)) return map;
  const raw = fs.readFileSync(OUT_JS, "utf8");
  const re = /id:\s*"([^"]+)"[\s\S]*?labels:\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const labels = [...m[2].matchAll(/"([^"]*)"/g)].map((x) => x[1]);
    if (labels.length && labels[0] !== "placeholder") map.set(m[1], labels);
  }
  return map;
}

/* ---------------------------------------------------------------- run -- */

const files = fs
  .readdirSync(source)
  .filter((name) => /\.(html?|eml|txt)$/i.test(name))
  .sort();

if (!files.length) {
  console.error("no .html, .eml or .txt files in " + source);
  process.exit(1);
}

const keptLabels = existingLabels();
const taken = new Set();
const posts = [];
const remoteImages = [];
let imagesWritten = 0;

if (!dry && !fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true });

for (const name of files) {
  const full = path.join(source, name);
  const raw = fs.readFileSync(full, "binary");
  const isEml = /\.eml$/i.test(name);
  const isTxt = /\.txt$/i.test(name);

  let parsed;
  if (isEml) parsed = readEml(raw);
  else if (isTxt) parsed = readTxt(Buffer.from(raw, "binary").toString("utf8"));
  else parsed = readHtml(Buffer.from(raw, "binary").toString("utf8"));

  let bodyHtml = parsed.html
    ? sanitize(parsed.html)
    : textToHtml(parsed.text || "");

  // attached images: written out once each, and the cid: references rewritten
  for (const image of parsed.images) {
    const ext = (image.mime.split("/")[1] || "jpg").replace(/[^a-z0-9]/gi, "");
    const fileName =
      slug(path.parse(image.name).name || "image", new Set()) +
      "-" +
      image.data.length.toString(36) +
      "." +
      ext;
    if (!dry) fs.writeFileSync(path.join(IMAGE_DIR, fileName), image.data);
    imagesWritten++;
    if (image.cid) {
      bodyHtml = bodyHtml.split("cid:" + image.cid).join("images/" + fileName);
    }
  }
  // anything still pointing at a cid: never arrived — drop the tag rather than
  // leave a broken image in the letter
  bodyHtml = bodyHtml.replace(/<img[^>]*src="cid:[^"]*"[^>]*\/?>/gi, "");

  /* Last resort for a subject: the file name, with any ordering prefix taken
     off — "01-", "2024-07-19-" — since that was for the folder, not the letter. */
  let subject = parsed.subject.trim();
  if (!subject) {
    subject = path
      .parse(name)
      .name.replace(/^\d{4}-\d{2}-\d{2}[-_ ]*/, "")
      .replace(/^\d+[-_ ]+/, "")
      .replace(/[-_]+/g, " ")
      .trim();
    subject = subject.charAt(0).toUpperCase() + subject.slice(1);
  }

  const who = nameAndAddress(parsed.from);
  const id = slug(subject, taken);

  /* Images still pointing at Gmail's servers are somebody else's to keep. They
     work today and stop working whenever that URL expires, so they are counted
     and named at the end rather than quietly left to rot. */
  for (const hit of bodyHtml.matchAll(/<img[^>]*src="(https?:\/\/[^"]+)"/gi)) {
    remoteImages.push({ file: name, url: hit[1] });
  }

  posts.push({
    id,
    subject,
    date: pickDate(parsed.date, parsed.dateSource || parsed.html || parsed.text, full),
    fromName: who.name || "Noah Darwin Lee",
    fromAddress: who.address || "noahlee519@gmail.com",
    to: parsed.to ? nameAndAddress(parsed.to).name : "friends and family",
    labels: keptLabels.get(id) || [],
    preview: firstWords(bodyHtml, 110),
    body: bodyHtml,
    _file: name
  });
}

posts.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

const header = `/* The letters, as blog.js reads them.
 *
 * THIS FILE IS GENERATED by blog/import-gmail.mjs — anything written here by
 * hand is lost the next time it runs, with one exception: the labels are read
 * back off this file and reapplied by id, because the importer cannot guess
 * them and you should only have to write them once.
 *
 * Generated ${new Date().toISOString().slice(0, 10)} from ${posts.length} message${posts.length === 1 ? "" : "s"}.
 */
window.BLOG_POSTS = `;

const body = JSON.stringify(
  posts.map(({ _file, ...rest }) => rest),
  null,
  2
);

if (dry) {
  console.log("would write " + posts.length + " letters and " + imagesWritten + " images\n");
  posts.forEach((p) => {
    console.log("  " + p.date.slice(0, 10) + "  " + p.id);
    console.log("      subject : " + p.subject);
    console.log("      from    : " + p.fromName + " <" + p.fromAddress + ">");
    console.log("      labels  : " + (p.labels.length ? p.labels.join(", ") : "(none yet)"));
    console.log("      preview : " + p.preview.slice(0, 80));
    console.log("      body    : " + p.body.length + " characters, from " + p._file);
    console.log("");
  });
} else {
  fs.writeFileSync(OUT_JS, header + body + ";\n");
  console.log(
    "wrote " + posts.length + " letters to blog/posts.js" +
      (imagesWritten ? " and " + imagesWritten + " images to blog/images/" : "")
  );
  const unlabelled = posts.filter((p) => !p.labels.length).length;
  if (unlabelled) {
    console.log(
      unlabelled + " of them have no labels yet — add them in posts.js and they " +
        "will survive the next run."
    );
  }
}

if (remoteImages.length) {
  console.log(
    "\n" + remoteImages.length + " image" + (remoteImages.length === 1 ? " is" : "s are") +
      " still loaded from someone else's server. They work now and break when\n" +
      "those URLs expire, and they tell that server every time a reader opens the\n" +
      "letter. Save them into blog/images/ and point at them instead:\n"
  );
  remoteImages.forEach((r) => console.log("  " + r.file + "  " + r.url));
}
