#!/usr/bin/env python3
import json
import subprocess
import sys
from collections import defaultdict

from shapely.geometry import mapping, shape
from shapely.ops import unary_union

if len(sys.argv) < 4:
    sys.exit("usage: central-asia-zones.py <node_modules> <uchronia/data> <geoBoundaries dir with UZB/TJK/TKM/KGZ-ADM2.geojson>")
MODULES, UC, GB = sys.argv[1], sys.argv[2], sys.argv[3]
OUT = __file__.replace("central-asia-zones.py", "central-asia-zones.json")

ZONES = {
    "UZB": {
        "TASHKENT": {"prov": ["Tashkent"]},
        "MIRZACHUL": {"prov": ["Sirdaryo", "Jizzakh"]},
        "FERGANA": {"prov": ["Andijan", "Fergana"]},
        "NAMANGAN": {"prov": ["Namangan"]},
        "SAMARKAND": {"names": ["Samarkand", "Samarkand city", "Urgut", "Taylak", "Dzhambay", "Pastdargom", "Akdarya", "Payarik", "Koshrabad", "Nurabad"]},
        "KATTAKURGAN": {"names": ["Kattakurgan", "Kattakurgan city", "Ishtikhan", "Narpay", "Pakhtachi"]},
        "SHAHRISABZ": {"names": ["Shakhrisabz", "Shakhrisabz city", "Kitab", "Yakkabag"]},
        "BUKHARA": {"prov": ["Bukhara", "Navoiy", "Qashqadaryo", "Surxondaryo"]},
        "KHWARAZM": {"prov": ["Xorazm"], "names": ["Kungrad", "Kanlikul", "Shumanay", "Khojeyli", "Muynak"]},
        "AMUDARYA": {"names": ["Karauzyak", "Chimbay", "Kegeyli", "Nukus", "Nukus city", "Takhtakupir", "Turtkul", "Ellikkala", "Beruniy", "Amudarya"]},
    },
    "TJK": {
        "KHUJAND": {"names": ["Ghafurov District", "Spitamen District", "Jabbor Rasulov District", "Mastchoh District", "Asht District"]},
        "ISFARA": {"names": ["Isfara District", "Konibodom District"]},
        "URATYUBE": {"names": ["Istaravshan District", "Shahriston District", "Zafarobod District", "Ghonchi District"]},
        "PANJAKENT": {"names": ["Panjakent District"]},
        "KOHISTAN": {"names": ["Ayni District", "Kuhistoni Mastchoh District"]},
        "HISAR": {"prov": ["Khatlon"], "names": ["Hisor District", "Faizobod District", "Varzob District", "Tursunzoda District", "Sharinav District", "Vahdat District", "Rudaki District"]},
        "KARATEGIN": {"names": ["Tojikobod District", "Roghun District", "Nurobod District", "Jirgatol District", "Rasht District", "Tavildara District"]},
        "DARVAZ": {"names": ["Darvoz District", "Vanj District"]},
        "SHUGHNAN": {"names": ["Rushon District", "Shughnon District", "Roshtqal'a District"]},
        "WAKHAN": {"names": ["Ishkoshim District"]},
        "PAMIR": {"names": ["Murghob District"]},
    },
    "TKM": {
        "DASHOGUZ": {"prov": ["Daşoguz"]},
        "DARGANATA": {"names": ["Darganata"]},
        "LEBAP": {"prov": ["Lebap"]},
        "PANJDEH": {"prov": ["Mary"], "south_of": 36.5},
        "MERV": {"prov": ["Mary"]},
        "AKHAL": {"names": ["Baherden", "Gokdepe", "Ak Bugday"]},
        "ATEK": {"prov": ["Ahal"]},
        "CASPIAN": {"names": ["Turkmenbasy", "Avaza", "Hazar"]},
        "BALKAN": {"prov": ["Balkan"]},
    },
    "KGZ": {
        "CHUY": {"prov": ["Chuy", "Bishkek"]},
        "TALAS": {"prov": ["Talas"]},
        "ISSYKKUL": {"prov": ["Issyk-Kul"]},
        "NARYN": {"prov": ["Naryn"]},
        "ALAY": {"names": ["Alay", "Chong-Alay"]},
        "FERGANA": {"prov": ["Osh", "Jalal-Abad", "Batken"]},
    },
}

units = json.loads(subprocess.run(["node", "-e", """
const [mods, uc] = process.argv.slice(1);
const c = require(mods + "/topojson-client"), t = require(uc + "/units.json");
const P = require(uc + "/provinces.json").objects.provinces.geometries.map((g) => g.properties);
const out = [];
t.objects.units.geometries.forEach((g) => { const p = P[g.properties.p]; if (["KAZ", "UZB", "TJK", "TKM", "KGZ"].includes(p.c)) out.push({ c: p.c, n: p.n, u: g.properties.n, g: c.feature(t, g).geometry }); });
process.stdout.write(JSON.stringify(out));
""", MODULES, UC], capture_output=True, text=True, check=True).stdout)

features = []
for u in units:
    if u["c"] == "KAZ":
        features.append({"type": "Feature", "properties": {"z": "KAZ/" + u["n"] + "/" + u["u"]}, "geometry": u["g"]})

for c, spec in ZONES.items():
    mine = [(u["n"], shape(u["g"]).buffer(0)) for u in units if u["c"] == c]
    country = unary_union([g for _, g in mine])
    districts = []
    for f in json.load(open(f"{GB}/{c}-ADM2.geojson"))["features"]:
        g = shape(f["geometry"]).buffer(0)
        p = g.representative_point()
        prov = [n for n, ug in mine if ug.contains(p)] or [min(mine, key=lambda m: m[1].distance(p))[0]]
        districts.append({"name": f["properties"].get("shapeName"), "prov": prov[0], "y": p.y, "g": g, "zone": None})
    for z, rule in spec.items():
        for d in districts:
            if d["zone"]:
                continue
            if d["name"] in rule.get("names", []) or (d["prov"] in rule.get("prov", []) and ("south_of" not in rule or d["y"] < rule["south_of"])):
                d["zone"] = z
    left = [d["prov"] + "/" + str(d["name"]) for d in districts if not d["zone"]]
    if left:
        sys.exit(c + ": districts in no zone: " + ", ".join(left))
    raw = {z: unary_union([d["g"] for d in districts if d["zone"] == z]) for z in spec}
    pieces, taken = {}, None
    for z in spec:
        p = country.intersection(raw[z])
        if taken is not None:
            p = p.difference(taken)
        pieces[z] = p.buffer(0)
        taken = p if taken is None else taken.union(p)
    rest = country.difference(taken)
    parts = list(getattr(rest, "geoms", [rest])) if not rest.is_empty else []
    for part in parts:
        if part.area < 1e-12:
            continue
        best = max(spec, key=lambda z: part.buffer(1e-6).intersection(pieces[z].boundary).length)
        pieces[best] = pieces[best].union(part).buffer(0)
    for z, p in pieces.items():
        if p.is_empty:
            sys.exit(c + "/" + z + " is empty")
        features.append({"type": "Feature", "properties": {"z": c + "/" + z}, "geometry": mapping(p)})

geo = OUT + ".geojson"
json.dump({"type": "FeatureCollection", "features": features}, open(geo, "w"))
subprocess.run(["node", "-e", """
const [mods, geo, out] = process.argv.slice(1);
const fs = require("fs"), server = require(mods + "/topojson-server"), simp = require(mods + "/topojson-simplify");
const fc = JSON.parse(fs.readFileSync(geo, "utf8"));
let t = server.topology({ zones: fc }, 1e6);
t = simp.presimplify(t);
t = simp.simplify(t, 1e-7);
fs.writeFileSync(out, JSON.stringify(t));
""", MODULES, geo, OUT], check=True)
subprocess.run(["rm", "-f", geo], check=True)
print(OUT, len(features), "zones")
