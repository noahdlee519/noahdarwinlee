import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const { changes } = JSON.parse(readFileSync(join(here, "dated-days.json"), "utf8"));
const out = changes
  .filter((c) => /^\d{4}-\d{2}-\d{2}$/.test(c.date) && c.what)
  .map((c) => [c.date, c.what.trim(), c.src || ""])
  .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
writeFileSync(join(here, "..", "data", "events.json"), JSON.stringify(out) + "\n");
console.log("events.json: " + out.length + " events from " + out[0][0] + " to " + out[out.length - 1][0]);
