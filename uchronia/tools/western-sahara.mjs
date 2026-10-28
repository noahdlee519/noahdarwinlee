import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";

export const WS_CODE = "WSD";
export const WS_NAME = "Western Sahara";
const SPLITS = [
  { name: "Guelmim-Es Semara", inside: "Es Semara", keep: "outside", outside: "Guelmim" },
  { name: "Laâyoune-Boujdour-Sakia El Hamra", outside: "Tarfaya", keep: "inside" },
  { name: "Oued Ed-Dahab", keep: "inside" }
];
const MIN_PIECE_KM2 = 1;

export function splitWesternSahara(features, input, clip, d3) {
  const path = resolve(dirname(input), "ne_10m_admin_0_disputed_areas.geojson");
  if (!existsSync(path)) throw new Error("Western Sahara needs Natural Earth's disputed areas beside the provinces file: " + path);
  const area = JSON.parse(readFileSync(path, "utf8")).features.find((f) => f.properties.ADM0_A3 === "MAR" && f.properties.BRK_NAME === "W. Sahara");
  if (!area) throw new Error("no Moroccan-held Western Sahara in " + path);
  const polys = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
  const zone = polys(area.geometry);
  const km2 = (p) => { const a = d3.geoArea({ type: "Polygon", coordinates: p }); return Math.min(a, 4 * Math.PI - a) * 6371.0088 ** 2; };
  const wind = (p) => (d3.geoArea({ type: "Polygon", coordinates: [p[0]] }) > 2 * Math.PI ? p.map((r) => r.slice().reverse()) : p);
  const geom = (list) => (list.length === 1 ? { type: "Polygon", coordinates: list[0] } : { type: "MultiPolygon", coordinates: list });
  const added = [];
  for (const s of SPLITS) {
    const f = features.find((x) => x.properties.adm0_a3 === "MAR" && (x.properties.name_en || x.properties.name) === s.name);
    if (!f) throw new Error("no " + s.name + " in Morocco's provinces");
    const orig = { ...f.properties };
    const parts = {
      inside: clip.intersection(polys(f.geometry), zone).map(wind).filter((p) => km2(p) >= MIN_PIECE_KM2),
      outside: clip.difference(polys(f.geometry), zone).map(wind).filter((p) => km2(p) >= MIN_PIECE_KM2)
    };
    for (const side of ["inside", "outside"]) {
      if (!parts[side].length) continue;
      const props = side === s.keep ? orig : { ...orig, iso_3166_2: null };
      const name = s[side] || s.name;
      const p = { ...props, name_en: name, name, ...(side === "inside" ? { adm0_a3: WS_CODE, admin: WS_NAME } : {}) };
      const feature = { type: "Feature", properties: p, geometry: geom(parts[side]) };
      if (side === s.keep) Object.assign(f, feature);
      else added.push(feature);
    }
  }
  return features.concat(added);
}

export function orderCountries(list) {
  const key = (c) => (c.c === "SAH" ? "Western Sahara" : c.n);
  return list.filter((c) => c.c !== WS_CODE).sort((a, b) => key(a).localeCompare(key(b))).concat(list.filter((c) => c.c === WS_CODE));
}
