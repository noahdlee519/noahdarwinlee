import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const topo = JSON.parse(readFileSync(resolve(here, "../data/provinces.json"), "utf8"));
const names = new Map(topo.countries.map((c) => [c.c, c.n]));
const groups = topo.groups || [];
const units = JSON.parse(readFileSync(resolve(here, "../data/units.json"), "utf8"));
const byCountry = new Map();
const PARTS_OF = new Set("ALD AND AUT BEL DNK FRO FIN FRA DEU GIB GGY ISL IRL IMN ITA JEY LIE LUX MLT MCO NLD NOR PRT SMR ESP SWE CHE GBR VAT ALB BLR BIH BGR HRV CYP CYN WSB ESB CZE EST GRC HUN KOS LTU MDA MNE MKD POL ROU SRB SVK UKR USA CAN MEX ARG BOL BRA CHL COL ECU PRY PER SUR VEN".split(" "));
const unitsOf = new Map();
for (const g of units.objects.units.geometries) {
  const p = g.properties;
  if (!unitsOf.has(p.p)) unitsOf.set(p.p, []);
  unitsOf.get(p.p).push(p.n);
}

topo.objects.provinces.geometries.forEach((g, i) => {
  const p = g.properties, country = names.get(p.c);
  if (!country) return;
  const grouped = p.g >= 0 && p.g < groups.length, region = grouped ? String(groups[p.g].n) : p.n;
  if (!byCountry.has(country)) byCountry.set(country, new Map());
  const regions = byCountry.get(country);
  if (!regions.has(region)) regions.set(region, new Set());
  if (!PARTS_OF.has(p.c)) return;
  if (grouped) regions.get(region).add(p.n);
  else if ((unitsOf.get(i) || []).length > 1) unitsOf.get(i).forEach((n) => regions.get(region).add(n));
});

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const part = (region, inner) => (inner.size > 1 ? region + " [" + [...inner].sort(cmp).join(" | ") + "]" : region);
const lines = [...byCountry.keys()].sort(cmp).map((c) => c + ": " + [...byCountry.get(c)].sort((a, b) => cmp(a[0], b[0])).map(([r, inner]) => part(r, inner)).join("; "));
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
console.log(byCountry.size + " countries, " + [...byCountry.values()].reduce((n, m) => n + m.size, 0) + " regions, " + [...byCountry.values()].reduce((n, m) => n + [...m.values()].reduce((k, s) => k + (s.size > 1 ? s.size : 0), 0), 0) + " smaller parts listed");
