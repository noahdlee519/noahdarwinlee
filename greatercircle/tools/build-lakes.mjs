import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const modules = resolve(process.argv[2] || "node_modules");
const input = resolve(process.argv[3] || "ne_50m_lakes.geojson");
const require = createRequire(resolve(modules, "x.js"));
const server = require("topojson-server");

const geo = JSON.parse(readFileSync(input, "utf8"));
const features = geo.features.filter((f) => f.geometry).map((f) => ({ type: "Feature", properties: { name: f.properties.name || "" }, geometry: f.geometry }));
const topo = server.topology({ lakes: { type: "FeatureCollection", features } }, 1e4);
const json = JSON.stringify(topo);
writeFileSync(resolve(here, "../data/lakes.json"), json);
console.log("data/lakes.json:", features.length, "lakes,", Math.round(json.length / 1024), "KB");
