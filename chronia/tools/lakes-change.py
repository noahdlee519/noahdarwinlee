#!/usr/bin/env python3
"""Lakes that grew, shrank, or dried within the years Landsat has watched (1972 on), stage by stage.

For each lake in LAKES this measures the water every year at the end of its dry season (the series), and then traces the
water of the stages the editors chose from that series (STAGES in the config) into tools/lakes-landsat.json, the file
build-geography.mjs already reads for Lake Urmia. Landsat 4 to 9 (1984 on) are read as surface reflectance, and water is
where the modified normalised difference water index, (green − SWIR) / (green + SWIR), is above 0, less the pixels the
quality band marks as cloud, shadow, or snow. Landsat 1 to 3 (1972 to 1983) have no SWIR band, so their water is the dark
side of Otsu's threshold in the near infrared (0.8 to 1.1 µm). Scenes of one season are laid side by side until they cover
the lake's box. A body of water is the lake's if it touches one of its seed points or the lake as Natural Earth draws it.
All from the U.S. Geological Survey (public domain), read through Microsoft's Planetary Computer.

  python3 chronia/tools/lakes-change.py series NAME ...   the yearly series, into tools/lakes-series.json (and a chart)
  python3 chronia/tools/lakes-change.py trace NAME ...    the stages, into tools/lakes-landsat.json (and pictures)
"""
import io, json, math, os, sys, urllib.request, warnings
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import cv2
from scipy import ndimage
from skimage.filters import threshold_otsu
from shapely.geometry import Polygon, MultiPolygon

HERE = os.path.dirname(os.path.abspath(__file__))
STAC = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
DATA = "https://planetarycomputer.microsoft.com/api/data/v1/item/bbox/"
OUT = os.environ.get("LAKES_PLOT", "/tmp")

# bbox: the lake's box (lon, lat, lon, lat); months: its dry season's end, when it is smallest and clearest; seeds: points
# in the lake's water (lon, lat); base: its rows in UCHRONIA's lakes.json (name, km²), which build-geography.mjs hides from
# the first stage; first: the first year to measure; stages: [from, to, year of the picture], to null for today.
LAKES = {
    "Great Salt Lake": {"bbox": [-113.6, 40.55, -111.85, 41.85], "months": [8, 9, 10], "seeds": [[-112.55, 41.15], [-112.75, 41.45], [-112.25, 41.05]], "base": [["Great Salt Lake", 4110]], "first": 1984},
    "Mar Chiquita": {"bbox": [-63.55, -31.05, -61.7, -29.8], "months": [6, 7, 8, 9], "seeds": [[-62.65, -30.7]], "base": [["Mar Chiquita", 2102]], "first": 1984},
    "Lago Poopó": {"bbox": [-67.5, -19.2, -66.6, -17.85], "months": [9, 10, 11], "seeds": [[-67.05, -18.75], [-66.95, -18.55], [-67.1, -18.95]], "base": [["Lago Poopó", 1558]], "first": 1984},
    "Toshka Lakes": {"bbox": [29.6, 22.6, 31.42, 23.6], "months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "seeds": [[31.28, 23.1], [30.88, 23.12], [31.1, 23.06], [30.8, 23.33], [30.3, 23.2]], "base": [], "first": 1995},
    "Hamun Lakes": {"bbox": [60.6, 30.3, 62.0, 31.75], "months": [4, 5, 6], "seeds": [[61.6, 31.35], [61.25, 31.0], [61.05, 31.35], [61.4, 30.75], [61.75, 31.05]], "base": [], "first": 1984},
    "Lake Faguibine": {"bbox": [-4.45, 16.55, -3.6, 16.95], "months": [10, 11, 12, 1], "seeds": [[-4.1, 16.75], [-3.95, 16.72], [-4.25, 16.8]], "base": [], "first": 1984},
    "Lake Chad": {"bbox": [13.0, 12.3, 15.4, 14.5], "months": [3, 4, 5, 6], "seeds": [[14.3, 13.05], [14.55, 13.2], [13.4, 13.75], [13.9, 13.45]], "base": [["Lake Chad", 1293]], "first": 1984},
    "Dead Sea": {"bbox": [35.3, 30.95, 35.65, 31.8], "months": [6, 7, 8, 9, 10], "seeds": [[35.5, 31.55], [35.5, 31.3], [35.42, 31.1]], "base": [["Dead Sea", 656], ["Dead Sea", 197]], "first": 1984},
}
STAGES = json.load(open(os.path.join(HERE, "lakes-stages.json"))) if os.path.exists(os.path.join(HERE, "lakes-stages.json")) else {}


def get(url, body=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None, headers={"Content-Type": "application/json"} if body else {})
    for attempt in range(3):
        try:
            return urllib.request.urlopen(req, timeout=300).read()
        except Exception:
            if attempt == 2:
                raise


def grid(bbox, metres):
    lat = (bbox[1] + bbox[3]) / 2
    return int((bbox[2] - bbox[0]) * 111320 * math.cos(math.radians(lat)) / metres), int((bbox[3] - bbox[1]) * 110570 / metres)


def candidates(bbox, year, months):
    """The scenes of a year's season over the box, clearest first; Landsat 7 last after its scan corrector failed (2003)."""
    mss = year < 1984
    coll = "landsat-c2-l1" if mss else "landsat-c2-l2"
    lo, hi = min(months), max(months)
    if lo == 10 and 1 in months:  # a season across the new year
        rng = "%d-10-01T00:00:00Z/%d-01-31T23:59:59Z" % (year, year + 1)
    else:
        rng = "%d-%02d-01T00:00:00Z/%d-%02d-28T23:59:59Z" % (year, lo, year, hi)
    q = {"eo:cloud_cover": {"lt": 20}}
    if mss:
        q["platform"] = {"in": ["landsat-1", "landsat-2", "landsat-3"]}
    feats = json.loads(get(STAC, {"collections": [coll], "bbox": bbox, "datetime": rng, "limit": 200, "query": q}))["features"]
    out = []
    for f in feats:
        if int(f["properties"]["datetime"][5:7]) not in months:
            continue
        l7 = f["properties"].get("platform") == "landsat-7" and year >= 2003
        out.append((l7, f["properties"]["eo:cloud_cover"], f["id"], coll))
    return [(c[2], c[3]) for c in sorted(out)]


def water_of(item, coll, bbox, w, h):
    """The water, the land, and what could not be seen, of one scene on the grid: 1, 0, and -1."""
    if coll == "landsat-c2-l1":
        a = np.load(io.BytesIO(get(DATA + ",".join("%.5f" % x for x in bbox) + "/%dx%d.npy?collection=%s&item=%s&assets=nir09" % (w, h, coll, item))), allow_pickle=False)
        ok = a[1] > 0
        if ok.mean() < 0.05:
            return np.full((h, w), -1, np.int8)
        v = a[0].astype(np.float32)
        cut = threshold_otsu(v[ok])
        return np.where(ok, (v < cut).astype(np.int8), -1).astype(np.int8)
    a = np.load(io.BytesIO(get(DATA + ",".join("%.5f" % x for x in bbox) + "/%dx%d.npy?collection=%s&item=%s&assets=green&assets=swir16&assets=qa_pixel" % (w, h, coll, item))), allow_pickle=False)
    g, s, qa, m = a[0].astype(np.float32), a[1].astype(np.float32), a[2].astype(np.uint16), a[3] > 0
    bad = ((qa & (1 << 1)) | (qa & (1 << 3)) | (qa & (1 << 4)) | (qa & (1 << 5))) > 0
    ok = m & ~bad & (qa != 1) & (g > 0) & (s > 0)
    with np.errstate(all="ignore"):
        mndwi = (g - s) / (g + s)
    return np.where(ok, (mndwi > 0).astype(np.int8), -1).astype(np.int8)


def season(bbox, year, months, metres, most=4):
    """The water of a season, from scenes laid side by side until the box is seen (at most `most` scenes)."""
    w, h = grid(bbox, metres)
    cover = np.full((h, w), -1, np.int8); used = []
    for item, coll in candidates(bbox, year, months):
        try:
            wm = water_of(item, coll, bbox, w, h)
        except Exception:
            continue
        fill = (cover < 0) & (wm >= 0)
        if fill.sum() < 0.03 * w * h:
            continue
        cover[fill] = wm[fill]; used.append(item)
        if (cover >= 0).mean() > 0.97 or len(used) >= most:
            break
    return cover, used


def lake_mask(cover, lake, bbox, base_mask):
    """The bodies of water that are the lake's: those touching a seed or Natural Earth's lake."""
    h, w = cover.shape
    water = cover == 1
    water = ndimage.binary_opening(water, structure=np.ones((2, 2)))
    labels, n = ndimage.label(water)
    keep = set()
    for lon, lat in lake["seeds"]:
        x, y = int((lon - bbox[0]) / (bbox[2] - bbox[0]) * w), int((bbox[3] - lat) / (bbox[3] - bbox[1]) * h)
        if 0 <= x < w and 0 <= y < h:
            r = labels[max(0, y - 2):y + 3, max(0, x - 2):x + 3]
            keep.update(int(v) for v in np.unique(r) if v)
    if base_mask is not None:
        keep.update(int(v) for v in np.unique(labels[base_mask & water]) if v)
    return np.isin(labels, list(keep)) if keep else np.zeros_like(water)


def base_of(lake, bbox, w, h):
    if not lake["base"]:
        return None
    uc = json.load(open(os.path.join(HERE, "../../uchronia/data/lakes.json")))
    m = np.zeros((h, w), np.uint8)
    px = lambda lon, la: [(lon - bbox[0]) / (bbox[2] - bbox[0]) * w, (bbox[3] - la) / (bbox[3] - bbox[1]) * h]
    for name, km2 in lake["base"]:
        for p in next(r for r in uc if r[0] == name and r[1] == km2)[4]:
            cv2.fillPoly(m, [np.array([px(*pt) for pt in p[0]], np.int32)], 1)
            for hole in p[1:]:
                cv2.fillPoly(m, [np.array([px(*pt) for pt in hole], np.int32)], 0)
    return m > 0


def series(name):
    lake = LAKES[name]; bbox = lake["bbox"]; metres = 250
    w, h = grid(bbox, metres); base = base_of(lake, bbox, w, h)
    years = list(range(int(os.environ.get("FIRST", lake["first"])), int(os.environ.get("LAST", 2026))))

    def one(y):
        cover, used = season(bbox, y, lake["months"], metres, most=6)
        if not used:
            return y, None
        seen = (cover >= 0).mean()
        km2 = float(lake_mask(cover, lake, bbox, base).sum()) * (metres / 1000) ** 2
        return y, {"km2": round(km2), "seen": round(float(seen), 2), "scenes": used}
    with ThreadPoolExecutor(6) as ex:
        res = dict(ex.map(one, years))
    path = os.path.join(HERE, "lakes-series.json")
    allr = json.load(open(path)) if os.path.exists(path) else {}
    allr[name] = {**allr.get(name, {}), **{str(y): v for y, v in res.items() if v}}
    json.dump(allr, open(path, "w"), indent=0, separators=(",", ":"))
    print(name + ": " + ", ".join("%d %s%s" % (y, v["km2"] if v else "-", "" if not v or v["seen"] > 0.9 else "?") for y, v in res.items()))


def trace(name):
    lake = LAKES[name]; bbox = lake["bbox"]; metres = 100
    w, h = grid(bbox, metres); base = base_of(lake, bbox, w, h)
    km2px = (metres / 1000) ** 2
    out = []
    uc = json.load(open(os.path.join(HERE, "../../uchronia/data/lakes.json")))
    for st in STAGES[name]:
        if st.get("base"):
            # Natural Earth's lake, drawn again for years when the lake was near it
            polys = [p for n, k in lake["base"] for p in next(r for r in uc if r[0] == n and r[1] == k)[4]]
            out.append({"from": st["from"], "to": st["to"], "image": None, "scenes": [], "km2": sum(k for n, k in lake["base"]), "base": True, "polys": polys})
            print("  %s %s–%s: Natural Earth's" % (name, st["from"], st["to"]))
            continue
        cover, used = season(bbox, st["year"], st.get("months") or lake["months"], metres, most=6)
        m = lake_mask(cover, lake, bbox, base)
        # a gap the scenes left inside the lake (cloud, a scan line) is water
        m = ndimage.binary_closing(m, structure=np.ones((3, 3)), iterations=2) | (ndimage.binary_fill_holes(m) & (cover < 0))
        labels, n = ndimage.label(m)
        polys = []
        for i in range(1, n + 1):
            part = (labels == i).astype(np.uint8)
            if part.sum() * km2px < 1:
                continue
            contours, hier = cv2.findContours(part, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
            ll = lambda c: [(bbox[0] + (x + 0.5) / w * (bbox[2] - bbox[0]), bbox[3] - (y + 0.5) / h * (bbox[3] - bbox[1])) for x, y in c[:, 0, :]]
            for k, c in enumerate(contours):
                if hier[0][k][3] != -1 or len(c) < 4:
                    continue
                holes = [ll(contours[j]) for j in range(len(contours)) if hier[0][j][3] == k and len(contours[j]) >= 4 and cv2.contourArea(contours[j]) * km2px >= 1]
                g = Polygon(ll(c), holes).buffer(0).simplify(0.0012)
                for q in (g.geoms if isinstance(g, MultiPolygon) else [g]):
                    if not q.is_empty and q.area > 0:
                        polys.append([[[round(x, 4), round(y, 4)] for x, y in r.coords] for r in [q.exterior] + list(q.interiors)])
        km2 = round(float(m.sum()) * km2px)
        out.append({"from": st["from"], "to": st["to"], "image": used[0][17:21] + "-" + used[0][21:23] + "-" + used[0][23:25] if used else None, "scenes": used, "km2": km2, "polys": polys})
        print("  %s %s–%s from %d: %d km², %d parts, %d scenes" % (name, st["from"], st["to"], st["year"], km2, len(polys), len(used)))
        rgb = np.full((h, w, 3), 235, np.uint8); rgb[cover == 1] = [200, 170, 120]; rgb[cover < 0] = [180, 180, 180]; rgb[m] = [190, 90, 30]
        if base is not None:
            edge = base.astype(np.uint8) - cv2.erode(base.astype(np.uint8), np.ones((3, 3), np.uint8))
            rgb[edge > 0] = [0, 0, 0]
        cv2.imwrite(os.path.join(OUT, "%s-%d.jpg" % (name.replace(" ", "_"), st["year"])), cv2.resize(rgb, (min(w, 700), int(h * min(w, 700) / w)), interpolation=cv2.INTER_AREA))
    path = os.path.join(HERE, "lakes-landsat.json")
    allr = json.load(open(path))
    allr[name] = out
    json.dump(allr, open(path, "w"), ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    warnings.simplefilter("ignore")
    cmd, names = sys.argv[1], sys.argv[2:] or list(LAKES)
    for n in names:
        (series if cmd == "series" else trace)(n)
