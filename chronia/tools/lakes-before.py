#!/usr/bin/env python3
"""The lakes that lay where a reservoir is now, as Landsat saw them before the dam: writes tools/lakes-before.json.

For each reservoir in RES, the clearest summer scenes of Landsat 1 to 3 (MSS, 1972 on; USGS, public domain, read through
Microsoft's Planetary Computer) from before its filling are fetched in the near infrared (0.8 to 1.1 µm, where water is
dark), at about 100 m a pixel. The median of the scenes is split into water and land at Otsu's threshold; specks and
channels under about 300 m wide are dropped; and a body of water is kept when at least half of it lies inside today's
reservoir (UCHRONIA's lakes.json) and it covers at least MIN_KM2. build-geography.mjs draws them until the reservoir's year.

  python3 chronia/tools/lakes-before.py [name ...]      (needs numpy, scipy, scikit-image, opencv, shapely; and the network)
  python3 chronia/tools/lakes-before.py --plot DIR ...  also writes a picture of each to DIR, to check by eye
"""
import io, json, math, os, sys, urllib.request
import numpy as np
import cv2
from scipy import ndimage
from skimage.filters import threshold_otsu
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
STAC = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
DATA = "https://planetarycomputer.microsoft.com/api/data/v1/item/bbox/"
PIXEL_M = 100       # the grid's pixel, in metres
SCENES = 5          # the most scenes taken for one reservoir
MIN_KM2 = 3         # the smallest lake kept
INSIDE = 0.5        # the share of a lake that must lie inside today's reservoir

# rows: the reservoir's rows in UCHRONIA's lakes.json, by name and km²; before: the last day a scene may be from (the day
# before the filling began); name: the largest lake's own name, where it had one, and the name for the rest.
RES = {
    "Réservoir de Caniapiscau": {"rows": [["Réservoir de Caniapiscau", 793], ["Réservoir de Caniapiscau", 316]], "before": "1981-10-01", "name": "Lac Caniapiscau", "rest": "Lakes under the Caniapiscau Reservoir"},
    "Réservoir de La Grande 2": {"rows": [["Réservoir de La Grande 2", 2894]], "before": "1978-11-01", "name": None, "rest": "Lakes under the La Grande 2 Reservoir"},
    "Réservoir de La Grande 3": {"rows": [["Réservoir de La Grande 3", 2234]], "before": "1981-04-01", "name": None, "rest": "Lakes under the La Grande 3 Reservoir"},
    "Réservoir La Grande 4": {"rows": [["Réservoir La Grande 4", 886]], "before": "1983-03-01", "name": None, "rest": "Lakes under the La Grande 4 Reservoir"},
}


def get(url, body=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None, headers={"Content-Type": "application/json"} if body else {})
    return urllib.request.urlopen(req, timeout=240).read()


def scenes(bbox, before):
    """The clearest July-to-September scenes over the box: those with ground control first, then those covering most of it."""
    feats = json.loads(get(STAC, {"collections": ["landsat-c2-l1"], "bbox": bbox, "datetime": "1972-07-01T00:00:00Z/" + before + "T00:00:00Z", "limit": 250, "query": {"eo:cloud_cover": {"lt": 10}, "platform": {"in": ["landsat-1", "landsat-2", "landsat-3"]}}}))["features"]
    out = []
    for f in feats:
        month = int(f["properties"]["datetime"][5:7])
        if month < 7 or month > 9:
            continue
        b = f["bbox"]
        cover = max(0, min(b[2], bbox[2]) - max(b[0], bbox[0])) * max(0, min(b[3], bbox[3]) - max(b[1], bbox[1])) / ((bbox[2] - bbox[0]) * (bbox[3] - bbox[1]))
        # scenes corrected with ground control (L1TP) first: the others (L1GS) can sit a kilometre or more off
        out.append(("_L1TP_" not in f["id"], -round(cover, 1), f["properties"]["eo:cloud_cover"], f["id"]))
    return [s[3] for s in sorted(out)]


def crop(item, bbox, w, h):
    a = np.load(io.BytesIO(get(DATA + ",".join("%.5f" % x for x in bbox) + "/%dx%d.npy?collection=landsat-c2-l1&item=%s&assets=nir09" % (w, h, item))), allow_pickle=False)
    return a[0].astype(np.float32), a[1] > 0


def trace(name, spec, uc, plot=None):
    polys = [p for row in spec["rows"] for p in next(r for r in uc if r[0] == row[0] and r[1] == row[1])[4]]
    xs = [pt[0] for p in polys for pt in p[0]]; ys = [pt[1] for p in polys for pt in p[0]]
    bbox = [min(xs) - 0.05, min(ys) - 0.03, max(xs) + 0.05, max(ys) + 0.03]
    lat = (bbox[1] + bbox[3]) / 2
    w = int((bbox[2] - bbox[0]) * 111320 * math.cos(math.radians(lat)) / PIXEL_M); h = int((bbox[3] - bbox[1]) * 110570 / PIXEL_M)
    px = lambda lon, la: [(lon - bbox[0]) / (bbox[2] - bbox[0]) * w, (bbox[3] - la) / (bbox[3] - bbox[1]) * h]
    stack, used = [], []
    for item in scenes(bbox, spec["before"]):
        try:
            img, ok = crop(item, bbox, w, h)
        except Exception as e:  # a scene the server cannot read is passed over
            print("  skipped", item, str(e)[:60]); continue
        if ok.mean() < 0.2:
            continue
        stack.append(np.where(ok, img, np.nan)); used.append(item)
        if len(used) == SCENES:
            break
    if not used:
        raise SystemExit(name + ": no scene")
    with np.errstate(all="ignore"):
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            med = np.nanmedian(np.stack(stack), axis=0)
    seen = ~np.isnan(med)
    cut = threshold_otsu(med[seen])
    water = seen & (med < cut)
    water = ndimage.binary_opening(water, structure=np.ones((3, 3)))
    today = np.zeros((h, w), np.uint8)
    for p in polys:
        cv2.fillPoly(today, [np.array([px(*pt) for pt in p[0]], np.int32)], 1)
        for hole in p[1:]:
            cv2.fillPoly(today, [np.array([px(*pt) for pt in hole], np.int32)], 0)
    labels, n = ndimage.label(water)
    km2_px = (PIXEL_M / 1000) ** 2
    sizes = ndimage.sum(water, labels, range(1, n + 1)); inside = ndimage.sum(today, labels, range(1, n + 1))
    keep = [i + 1 for i in range(n) if sizes[i] * km2_px >= MIN_KM2 and inside[i] / sizes[i] >= INSIDE]
    lakes = []
    for i in keep:
        mask = (labels == i).astype(np.uint8)
        contours, hier = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
        ll = lambda c: [(bbox[0] + (x + 0.5) / w * (bbox[2] - bbox[0]), bbox[3] - (y + 0.5) / h * (bbox[3] - bbox[1])) for x, y in c[:, 0, :]]
        for k, c in enumerate(contours):
            if hier[0][k][3] != -1 or len(c) < 4:
                continue
            holes = [ll(contours[j]) for j in range(len(contours)) if hier[0][j][3] == k and len(contours[j]) >= 4 and cv2.contourArea(contours[j]) * km2_px >= 0.5]
            g = Polygon(ll(c), holes).buffer(0).simplify(0.0012)
            if not g.is_empty:
                lakes.append((sizes[i - 1] * km2_px, g))
    lakes.sort(key=lambda t: -t[0])
    rings = lambda g: [[[round(x, 4), round(y, 4)] for x, y in r.coords] for r in [g.exterior] + list(g.interiors)]
    parts = lambda g: [rings(q) for q in (g.geoms if isinstance(g, MultiPolygon) else [g])]
    out = {"images": used, "threshold": round(float(cut), 1), "km2": round(sum(t[0] for t in lakes)), "today_km2": round(float(today.sum()) * km2_px), "lakes": []}
    if spec["name"] and lakes:
        out["lakes"].append({"name": spec["name"], "km2": round(lakes[0][0]), "polys": parts(lakes[0][1])}); lakes = lakes[1:]
    if lakes:
        out["lakes"].append({"name": spec["rest"], "km2": round(sum(t[0] for t in lakes)), "polys": [q for t in lakes for q in parts(t[1])]})
    print(name + ": " + str(len(used)) + " scenes, threshold " + str(out["threshold"]) + ", " + str(len(keep)) + " lakes, " + str(out["km2"]) + " km² where the reservoir is " + str(out["today_km2"]) + " km²")
    if plot:
        rgb = np.dstack([np.clip(np.nan_to_num(med) * 2.5, 0, 255)] * 3).astype(np.uint8)
        rgb[(today == 1) & ~np.isin(labels, keep)] = (rgb[(today == 1) & ~np.isin(labels, keep)] * 0.5 + np.array([120, 110, 40])).clip(0, 255)
        rgb[np.isin(labels, keep)] = [230, 60, 40]
        cv2.imwrite(os.path.join(plot, name.replace(" ", "_") + ".jpg"), cv2.resize(rgb, (w // 2, h // 2), interpolation=cv2.INTER_AREA))
    return out


if __name__ == "__main__":
    args = sys.argv[1:]; plot = None
    if args and args[0] == "--plot":
        plot = args[1]; args = args[2:]
    uc = json.load(open(os.path.join(HERE, "../../uchronia/data/lakes.json")))
    path = os.path.join(HERE, "lakes-before.json")
    done = json.load(open(path)) if os.path.exists(path) else {}
    for name, spec in RES.items():
        if args and name not in args:
            continue
        done[name] = trace(name, spec, uc, plot)
    json.dump(done, open(path, "w"), ensure_ascii=False, separators=(",", ":"))
