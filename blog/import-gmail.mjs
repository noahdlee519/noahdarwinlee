import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT_JS = path.join(ROOT, "posts.js");
const IMAGE_DIR = path.join(ROOT, "images");

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const fresh = args.includes("--fresh");

const SPAM_LINK = "https://account.venmo.com/u/noahlee519";
const sources = args.filter((a) => !a.startsWith("--"));

if (!sources.length) {
  console.error(
    "usage: node blog/import-gmail.mjs <folder> [more folders...] [--dry]"
  );
  process.exit(1);
}
for (const dir of sources) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.error("not a folder: " + dir);
    process.exit(1);
  }
}

function decodeQuotedPrintable(text) {
  return text
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}

function decodeEncodedWords(text) {
  return text.replace(/\?=\s+=\?/g, "?==?").replace(
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

function repairHeaders(raw) {
  const lines = raw.split(/\r?\n/);
  const isHeader = (line) => /^[A-Za-z][A-Za-z0-9-]*:/.test(line);
  const isFolded = (line) => /^[ \t]/.test(line);
  const out = [];
  let i = 0;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (isHeader(line) || isFolded(line)) {
      out.push(line);
      continue;
    }
    if (line.trim() === "") {
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === "") j++;
      if (j < lines.length && isHeader(lines[j])) {
        i = j - 1;
        continue;
      }
      break;
    }
    break;
  }
  return out.join("\n") + "\n\n" + lines.slice(i).join("\n");
}

function readEml(rawIn) {
  const raw = repairHeaders(rawIn);
  const headers = {};
  const split = raw.search(/\r?\n\r?\n/);
  const headerBlock = split === -1 ? raw : raw.slice(0, split);
  const bodyBlock = split === -1 ? "" : raw.slice(split).replace(/^\r?\n\r?\n/, "");

  headerBlock
    .replace(/\r?\n[ \t]+/g, " ")
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

  function walkPart(partHeaders, partBody, depth) {
    const ctype = partHeaders["content-type"] || "";
    const inner = /boundary="?([^";]+)"?/i.exec(ctype);
    if (!/^multipart\//i.test(ctype.trim()) || !inner || depth > 6) {
      takePart(partHeaders, partBody);
      return;
    }
    const marker = "--" + inner[1];
    partBody.split(marker).forEach((chunk) => {
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
      walkPart(ph, at === -1 ? "" : trimmed.slice(at).replace(/^\r?\n\r?\n/, ""), depth + 1);
    });
  }

  if (boundary) walkPart(headers, bodyBlock, 0);
  else takePart(headers, bodyBlock);

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

function readHtml(raw) {
  const title =
    /<title[^>]*>([\s\S]*?)<\/title>/i.exec(raw)?.[1] ||
    /<h[12][^>]*>([\s\S]*?)<\/h[12]>/i.exec(raw)?.[1] ||
    "";
  const whole = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(raw)?.[1] || raw;

  const body = messageContainer(whole) || whole;

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
    dateSource: whole,
    text: "",
    images: []
  };
}

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
    return html.slice(start);
  }
  return null;
}

function stripTags(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

const KEEP = new Set([
  "p", "br", "hr", "div", "span", "em", "i", "strong", "b", "u", "s",
  "a", "img", "figure", "figcaption",
  "ul", "ol", "li", "blockquote", "pre", "code",
  "h2", "h3", "h4", "table", "thead", "tbody", "tr", "td", "th", "sup", "sub"
]);

const ATTRS = {
  a: ["href", "title"],
  img: ["src", "alt", "width", "height"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan"]
};

function sanitize(html) {
  let out = html;

  out = out.replace(
    /<(script|style|head|noscript|iframe|object|embed|form|button|input|select|textarea|svg|link|meta|title)\b[\s\S]*?<\/\1\s*>/gi,
    ""
  );
  out = out.replace(/<(link|meta|base)\b[^>]*>/gi, "");
  out = out.replace(/<!--[\s\S]*?-->/g, "");

  out = out.replace(
    /<div[^>]*class="[^"]*gmail_quote[^"]*"[^>]*>(?=[\s\S]{0,600}?(?:gmail_attr|wrote:))[\s\S]*$/i,
    ""
  );
  out = out.replace(
    /(<[^>]*>\s*)?On\s+\w{3},?\s+\w{3}\s+\d{1,2},?\s+\d{4}[\s\S]{0,120}?wrote:[\s\S]*$/i,
    ""
  );

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

  out = out.replace(/<img\b[^>]*\/?>/gi, (tag) => {
    const w = Number(/\bwidth="(\d+)"/i.exec(tag)?.[1] ?? 99);
    const h = Number(/\bheight="(\d+)"/i.exec(tag)?.[1] ?? 99);
    return w <= 2 || h <= 2 ? "" : tag;
  });

  out = out.replace(/<a(?![^>]*\bhref=)[^>]*>([\s\S]*?)<\/a>/gi, "$1");

  out = unwrapLayoutTables(out);

  for (let i = 0; i < 4; i++) {
    out = out.replace(/<(div|span|p)>\s*<\/\1>/gi, "");
    out = out.replace(/<div>\s*(<br\s*\/?>\s*)+<\/div>/gi, "");
  }
  out = out.replace(/(\s*<br\s*\/?>\s*){3,}/gi, "<br /><br />");
  out = out.replace(/\s{2,}/g, " ").trim();

  return balance(out);
}

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
  return !/^[a-z][a-z0-9+.-]*:/i.test(url);
}

function dropGroups(s, names) {
  const opener = new RegExp("\\{\\\\\\*?\\\\(?:" + names.join("|") + ")\\b");
  for (let guard = 0; guard < 40; guard++) {
    const at = s.search(opener);
    if (at === -1) break;
    let depth = 0;
    let end = at;
    for (; end < s.length; end++) {
      const c = s[end];
      if (c === "\\") { end++; continue; }
      if (c === "{") depth++;
      else if (c === "}" && --depth === 0) { end++; break; }
    }
    s = s.slice(0, at) + s.slice(end);
  }
  return s;
}

function rtfToText(raw) {
  let s = raw;
  s = dropGroups(s, [
    "fonttbl", "colortbl", "expandedcolortbl", "stylesheet", "info",
    "generator", "listtable", "listoverridetable", "pgdsctbl"
  ]);
  s = s.replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) =>
    Buffer.from([parseInt(hex, 16)]).toString("latin1")
  );
  s = s.replace(/\\u(-?\d+)\s?\??/g, (_, dec) => {
    const n = Number(dec);
    return String.fromCharCode(n < 0 ? n + 65536 : n);
  });
  s = s.replace(/\\\n/g, "\n");
  s = s.replace(/\\(?:par|line)\b ?/g, "\n");
  s = s.replace(/\\[a-zA-Z]+-?\d* ?/g, "");
  s = s.replace(/\\([{}\\])/g, "$1");
  s = s.replace(/[{}]/g, "");

  const lines = s.split(/\r?\n/);
  const first = lines.findIndex((line) => /^[A-Za-z][A-Za-z0-9-]*:\s/.test(line));
  return (first === -1 ? lines : lines.slice(first)).join("\n").trim();
}

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

const OWN = new Set(["index.html", "posts.js", "blog.js", "import-gmail.mjs"]);
const MESSAGE = /\.(html?|eml|txt|rtf)$/i;
const PICTURE = /\.(png|jpe?g|gif|webp|heic|tiff?)$/i;

function walk(dir, depth, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (path.resolve(full) === path.resolve(IMAGE_DIR)) continue;
      if (depth > 0) walk(full, depth - 1, out);
    } else if (MESSAGE.test(entry.name) && !OWN.has(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function picturesBeside(messagePath) {
  const dir = path.dirname(messagePath);
  const found = [];
  const seek = (d, depth) => {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch (err) {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (depth > 0) seek(full, depth - 1);
      } else if (PICTURE.test(entry.name)) {
        found.push(full);
      }
    }
  };
  seek(dir, 1);

  const order = (file) => {
    const m = /-(\d+)\.[^.]+$/.exec(path.basename(file));
    return m ? Number(m[1]) : 0;
  };
  const pools = new Map();
  for (const file of found.sort((a, b) => order(a) - order(b))) {
    const ext = path.extname(file).toLowerCase();
    const kind = ext === ".jpeg" ? ".jpg" : ext;
    if (!pools.has(kind)) pools.set(kind, []);
    pools.get(kind).push(file);
  }
  return pools;
}

const EXT_FOR = { png: ".png", jpeg: ".jpg", jpg: ".jpg", gif: ".gif", webp: ".webp" };

let magick = null;
function haveMagick() {
  if (magick !== null) return magick;
  for (const cmd of ["magick", "convert"]) {
    const probe = spawnSync(cmd, ["-version"], { stdio: "ignore" });
    if (!probe.error && probe.status === 0) return (magick = cmd);
  }
  return (magick = "");
}

function shrink(from, to) {
  if (!fresh && fs.existsSync(to)) {
    const done = fs.statSync(to);
    if (done.size > 0 && done.mtimeMs >= fs.statSync(from).mtimeMs) return true;
  }
  const cmd = haveMagick();
  if (!cmd) {
    fs.copyFileSync(from, to.replace(/\.webp$/, path.extname(from)));
    return false;
  }
  const run = spawnSync(
    cmd,
    [from, "-auto-orient", "-strip", "-resize", "1200x1200>", "-quality", "74",
     "-define", "webp:method=6", to],
    { stdio: "ignore" }
  );
  return !run.error && run.status === 0;
}

const files = [...new Set(sources.flatMap((dir) => walk(dir, 1, [])))].sort();

if (!files.length) {
  console.error("no .rtf, .eml, .html or .txt files in " + sources.join(", "));
  process.exit(1);
}

const keptLabels = existingLabels();
const taken = new Set();
const posts = [];
const remoteImages = [];
const missingPictures = [];
let imagesWritten = 0;

if (!dry && !fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true });

for (const full of files) {
  const name = path.basename(full);
  const raw = fs.readFileSync(full, "binary");
  const isRtf = /\.rtf$/i.test(name);
  const isEml = /\.eml$/i.test(name);
  const isTxt = /\.txt$/i.test(name);

  let parsed;
  if (isRtf) parsed = readEml(rtfToText(Buffer.from(raw, "binary").toString("utf8")));
  else if (isEml) parsed = readEml(raw);
  else if (isTxt) parsed = readTxt(Buffer.from(raw, "binary").toString("utf8"));
  else parsed = readHtml(Buffer.from(raw, "binary").toString("utf8"));

  let bodyHtml = parsed.html
    ? sanitize(parsed.html)
    : textToHtml(parsed.text || "");

  const stem = slug(path.parse(name).name, new Set());
  const pools = parsed.images.some((i) => !i.data.length)
    ? picturesBeside(full)
    : new Map();
  const used = new Map();

  const seenAt = (image) => {
    if (!image.cid) return Infinity;
    const at = bodyHtml.indexOf("cid:" + image.cid);
    return at === -1 ? Infinity : at;
  };
  const ordered = parsed.images
    .map((image, index) => ({ image, index, at: seenAt(image) }))
    .sort((a, b) => a.at - b.at || a.index - b.index);

  ordered.forEach(({ image, at }, index) => {
    if (at === Infinity && !image.data.length) return;
    const kind = EXT_FOR[(image.mime.split("/")[1] || "").toLowerCase()] || ".jpg";
    let source_ = null;
    let data = image.data;

    if (!data.length) {
      const pool = pools.get(kind) || [];
      const at = used.get(kind) || 0;
      if (at >= pool.length) {
        missingPictures.push({ file: name, mime: image.mime });
        return;
      }
      used.set(kind, at + 1);
      source_ = pool[at];
    }

    const outName = stem + "-" + String(index + 1).padStart(2, "0") + ".webp";
    const outPath = path.join(IMAGE_DIR, outName);
    let written = outName;

    if (!dry) {
      if (source_) {
        if (!shrink(source_, outPath)) written = outName.replace(/\.webp$/, path.extname(source_));
      } else {
        const tmp = path.join(IMAGE_DIR, stem + "-" + (index + 1) + kind);
        fs.writeFileSync(tmp, data);
        if (shrink(tmp, outPath)) fs.unlinkSync(tmp);
        else written = path.basename(tmp);
      }
    }
    imagesWritten++;
    if (image.cid) {
      bodyHtml = bodyHtml.split("cid:" + image.cid).join("images/" + written);
    }
  });
  bodyHtml = bodyHtml.replace(/<img[^>]*src="cid:[^"]*"[^>]*\/?>/gi, "");

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

  const folder = /^spam$/i.test(path.basename(path.dirname(full))) ? "spam" : "inbox";

  let remoteDropped = 0;
  if (folder === "spam") {
    bodyHtml = bodyHtml.replace(/<img[^>]*src="https?:\/\/[^"]*"[^>]*\/?>/gi, () => {
      remoteDropped++;
      return "";
    });
    bodyHtml = bodyHtml.replace(/<a\b([^>]*?)\shref="[^"]*"/gi, '<a$1 href="' + SPAM_LINK + '"');
  } else {
    for (const hit of bodyHtml.matchAll(/<img[^>]*src="(https?:\/\/[^"]+)"/gi)) {
      remoteImages.push({ file: name, url: hit[1] });
    }
  }

  posts.push({
    id,
    subject,
    date: pickDate(parsed.date, parsed.dateSource || parsed.html || parsed.text, full),
    fromName: who.name || "Noah Darwin Lee",
    fromAddress: who.address || "noahlee519@gmail.com",
    to: parsed.to && !/noah(d)?lee519@gmail\.com/i.test(parsed.to)
      ? nameAndAddress(parsed.to).name
      : "me",
    folder,
    labels: keptLabels.get(id) || [],
    preview: firstWords(bodyHtml, 110),
    body: bodyHtml,
    imagesWithheld: remoteDropped,
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
    console.log("      folder  : " + p.folder + (p.imagesWithheld ? " (" + p.imagesWithheld + " remote images withheld)" : ""));
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

if (missingPictures.length) {
  console.log(
    "\n" + missingPictures.length + " image" +
      (missingPictures.length === 1 ? " was" : "s were") +
      " referenced by a letter but had no file to match:\n" +
      "the message carried the attachment's headers and not its data, and there\n" +
      "were no more downloaded pictures of that type beside it. Put them in a\n" +
      "folder next to the letter and run this again.\n"
  );
  missingPictures.forEach((m) => console.log("  " + m.file + "  " + m.mime));
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
