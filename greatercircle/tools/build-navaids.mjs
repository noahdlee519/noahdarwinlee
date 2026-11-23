import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const input = resolve(process.argv[2] || "navaids.csv");
const TYPES = ["VOR", "VOR-DME", "VORTAC", "NDB", "NDB-DME"];
const RANK = { VORTAC: 0, "VOR-DME": 1, VOR: 2, "NDB-DME": 3, NDB: 4 };

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const [head, ...rows] = parseCsv(readFileSync(input, "utf8")).filter((r) => r.length > 1);
const col = (name) => head.indexOf(name);
const iIdent = col("ident"), iName = col("name"), iType = col("type"), iLat = col("latitude_deg"), iLon = col("longitude_deg");
const toVec = (lon, lat) => { const p = (lat * Math.PI) / 180, l = (lon * Math.PI) / 180; return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)]; };
const kept = [];
for (const r of rows) {
  const type = r[iType], lat = +r[iLat], lon = +r[iLon], ident = r[iIdent].trim();
  if (!(type in RANK) || !ident || !isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
  kept.push({ ident, name: r[iName].trim(), type, lat, lon, v: toVec(lon, lat) });
}
kept.sort((a, b) => RANK[a.type] - RANK[b.type]);
const MERGE_KM = 12, cell = MERGE_KM / 6371;
const grid = new Map(), out = [];
const key = (x, y, z) => Math.floor(x / cell) + "," + Math.floor(y / cell) + "," + Math.floor(z / cell);
for (const k of kept) {
  const [x, y, z] = k.v;
  let close = false;
  for (let dx = -1; dx <= 1 && !close; dx++) for (let dy = -1; dy <= 1 && !close; dy++) for (let dz = -1; dz <= 1 && !close; dz++) {
    const list = grid.get(key(x + dx * cell, y + dy * cell, z + dz * cell));
    if (list && list.some((o) => Math.acos(Math.min(1, o[0] * x + o[1] * y + o[2] * z)) * 6371 < MERGE_KM)) close = true;
  }
  if (close) continue;
  const kk = key(x, y, z);
  if (!grid.has(kk)) grid.set(kk, []);
  grid.get(kk).push(k.v);
  out.push([k.ident, TYPES.indexOf(k.type), +k.lon.toFixed(4), +k.lat.toFixed(4), k.name]);
}
out.sort((a, b) => a[3] - b[3] || a[2] - b[2]);
const json = JSON.stringify({ types: TYPES, beacons: out });
writeFileSync(resolve(here, "../data/navaids.json"), json);
console.log("data/navaids.json:", out.length, "beacons,", Math.round(json.length / 1024), "KB");
