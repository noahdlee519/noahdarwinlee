# Writes Sweden's counties (län) from swehist's boundaries.rda (Johan Junkka, from the Swedish National Archives'
# historical GIS maps; data CC BY 4.0) as JSON for divisions-hist.mjs: one record per county and span, with its
# name, first and last year, and its rings in SWEREF99 TM (EPSG:3006). Needs the Python package rdata.
#
#   python3 -I chronia/tools/swehist-counties.py <swehist/data/boundaries.rda> <out.json>
import json, sys, warnings
import rdata

warnings.simplefilter("ignore")
b = rdata.conversion.convert(rdata.parser.parse_file(sys.argv[1]), default_encoding="utf8")["boundaries"]
out = []
for _, r in b[b["type"] == "County"].iterrows():
    polys = [[ring.tolist() for ring in poly] for poly in r["geometry"]]
    out.append({"name": str(r["name"]), "start": int(r["start"]), "end": int(r["end"]), "polys": polys})
json.dump(out, open(sys.argv[2], "w"))
print(len(out), "county spans")
