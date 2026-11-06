import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { preview } from "../api/_lib/preview.mjs";
import { shareHead, shareParams } from "../middleware.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] || null;
if (out) mkdirSync(out, { recursive: true });
let bad = 0;
const fail = (m) => { bad++; console.log("FAIL " + m); };

const cases = [
  ["1815-07", "12.00,48.00,2.50", "", "July 1815"],
  ["1914-07", "10.00,30.00,1.00", "", "July 1914"],
  ["-500", "30.00,35.00,2.00", "", "500 BC"],
  ["1991-06-25", "20.00,50.00,3.00", "1", "25 June 1991"],
  ["1700", "-80.00,30.00,1.50", "", "July 1700"],
  ["3000", "0,0,1", "1", null],
];
for (const [y, v, flat, label] of cases) {
  const t0 = performance.now();
  const r = await preview({ y, v, flat }, async () => { throw new Error("offline"); });
  const ms = performance.now() - t0;
  if (label && r.when.label !== label) fail(y + ": label " + r.when.label);
  if (r.png.length < 100000) fail(y + ": picture only " + r.png.length + " bytes");
  if (!r.png.subarray(1, 4).equals(Buffer.from("PNG"))) fail(y + ": not a PNG");
  if (out) writeFileSync(join(out, "preview-" + y + ".png"), r.png);
  console.log(y.padEnd(11) + r.when.label.padEnd(15) + (r.png.length / 1024).toFixed(0).padStart(5) + " KB " + ms.toFixed(0).padStart(6) + " ms");
}

const html = readFileSync(join(root, "chronia/index.html"), "utf8").replace(/https:\/\/noahdarwinlee\.com\/chronia\//g, "https://chroniaatlas.com/");
const p = shareParams(new URL("https://chroniaatlas.com/?y=1815-07&v=12.00,48.00,2.50&dev&x=%3Cb%3E"));
const head = p && shareHead(html, "https://chroniaatlas.com", p);
if (!head) fail("shareHead found no tags");
else {
  for (const want of ["<title>CHRONIA | July 1815</title>", 'og:image" content="https://chroniaatlas.com/api/og?y=1815-07&amp;v=12.00,48.00,2.50"', 'og:url" content="https://chroniaatlas.com/?y=1815-07&amp;v=12.00,48.00,2.50"'])
    if (!head.includes(want)) fail("shareHead lacks " + want);
  if (/<b>|dev/.test(head.match(/og:url" content="[^"]*"/)[0])) fail("shareHead passed other parameters on");
}
if (shareParams(new URL("https://chroniaatlas.com/?y=<script>"))) fail("shareParams took a bad date");
console.log(bad ? bad + " failed" : "all passed");
process.exit(bad ? 1 : 0);
