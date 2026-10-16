import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const topo = JSON.parse(readFileSync(resolve(here, "../data/provinces.json"), "utf8"));
const names = new Map(topo.countries.map((c) => [c.c, c.n]));
const groups = topo.groups || [];
const byCountry = new Map();

for (const g of topo.objects.provinces.geometries) {
  const p = g.properties, country = names.get(p.c);
  if (!country) continue;
  const region = p.g >= 0 && p.g < groups.length ? String(groups[p.g].n) : p.n;
  if (!byCountry.has(country)) byCountry.set(country, new Set());
  byCountry.get(country).add(region);
}

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const lines = [...byCountry.keys()].sort(cmp).map((c) => c + ": " + [...byCountry.get(c)].sort(cmp).join("; "));
writeFileSync(resolve(here, "../data/catalogue.txt"), lines.join("\n") + "\n");

const PARTS = [
  ["western-europe", "Western Europe", "ALD AND AUT BEL DNK FRO FIN FRA DEU GIB GGY ISL IRL IMN ITA JEY LIE LUX MLT MCO NLD NOR PRT SMR ESP SWE CHE GBR VAT"],
  ["eastern-europe", "Eastern Europe and Russia", "ALB BLR BIH BGR HRV CYP CYN WSB ESB CZE EST GRC HUN KOS LVA LTU MDA MNE MKD POL ROU RUS SRB SVK SVN UKR"],
  ["west-asia", "Western and Central Asia", "AFG ARM AZE BHR GEO IRN IRQ ISR JOR KAZ KWT KGZ LBN OMN PSX QAT SAU SYR TJK TUR TKM ARE UZB YEM"],
  ["east-asia", "South and East Asia", "BGD BTN IOT BRN KHM CHN HKG IND IDN JPN LAO MAC MYS MDV MNG MMR NPL PRK PAK PHL SGP KOR LKA TWN THA TLS VNM KAS PGA"],
  ["africa", "Africa", "DZA AGO BEN BWA BFA BDI CMR CPV CAF TCD COM COG COD DJI EGY GNQ ERI SWZ ETH GAB GMB GHA GIN GNB CIV KEN LSO LBR LBY MDG MWI MLI MRT MUS MAR MOZ NAM NER NGA RWA SHN STP SEN SYC SLE SOM SOL ZAF SDS SDN TZA TGO TUN UGA SAH ZMB ZWE"],
  ["north-america", "North America and the Caribbean", "AIA ATG ABW BHS BRB BLZ BMU VGB CAN CYM CLP CRI CUB CUW DMA DOM SLV GRL GRD USG GTM HTI HND JAM MEX MSR NIC PAN PRI BLM KNA LCA MAF SPM VCT SXM TTO TCA USA VIR"],
  ["south-america", "South America", "ARG BOL BRA CHL COL ECU FLK GUY PRY PER SGS SUR URY VEN"],
  ["oceania", "Oceania and Antarctica", "ASM ATA ATC AUS COK CSI FJI PYF GUM HMD IOA KIR MHL FSM NRU NCL NZL NIU NFK MNP PLW PNG PCN WSM SLB TON TUV UMI VUT WLF ATF"],
];
const placed = new Map();
const parts = PARTS.map(([id, name, codes]) => {
  const countries = [];
  for (const code of codes.split(" ")) {
    if (!names.has(code)) throw new Error("no country " + code);
    if (placed.has(code)) throw new Error(code + " in " + placed.get(code) + " and " + id);
    placed.set(code, id);
    if (byCountry.has(names.get(code))) countries.push(names.get(code));
  }
  return { id, name, countries: countries.sort(cmp) };
});
const unplaced = [...names.keys()].filter((c) => !placed.has(c));
if (unplaced.length) throw new Error("in no part: " + unplaced.join(" "));
writeFileSync(resolve(here, "../data/parts.json"), JSON.stringify(parts) + "\n");
console.log(byCountry.size + " countries, " + [...byCountry.values()].reduce((n, s) => n + s.size, 0) + " regions");
