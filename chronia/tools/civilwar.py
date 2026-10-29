import json, os, sys
import numpy as np
import cv2
from scipy.interpolate import RBFInterpolator
from skimage.morphology import skeletonize
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
SCAN_DIR = sys.argv[1] if len(sys.argv) > 1 else "scans"
COUNTIES = sys.argv[2] if len(sys.argv) > 2 else "histcounties.geojson"
DEBUG = os.environ.get("CIVILWAR_DEBUG")

SCANS = {
    "cs1862": {
        "file": "Historical_sketch_of_the_rebellion._LOC_99447101.jpg",
        "commons": "File:Historical sketch of the rebellion. LOC 99447101.jpg",
        "size": [5436, 5598], "top": 1847, "scale": 0.7,
        "points": {
            "atlanta": [1868, 1165], "augusta": [2194, 1189], "baltimore": [2759, 253], "baton-rouge": [1005, 1660],
            "charleston": [2470, 1264], "chattanooga": [1774, 966], "cincinnati": [1837, 356], "columbus": [1997, 214],
            "galveston": [517, 1805], "houston": [445, 1726], "jacksonville": [2235, 1645], "knoxville": [1923, 824],
            "little-rock": [886, 1008], "louisville": [1708, 495], "memphis": [1162, 959], "mobile": [1407, 1635],
            "nashville": [1572, 814], "new-orleans": [1152, 1730], "norfolk": [2842, 623], "pittsburgh": [2352, 125],
            "raleigh": [2575, 815], "richmond": [2686, 529], "savannah": [2321, 1390], "st-louis": [1148, 443],
            "washington": [2694, 334]
        }
    },
    "cs1864": {
        "file": "Historical_sketch_of_the_rebellion_LOC_99447147.jpg",
        "commons": "File:Historical sketch of the rebellion LOC 99447147.jpg",
        "size": [5412, 5892], "top": 2121, "scale": 0.6,
        "register": "cs1862"
    },
    "cmh": {
        "file": "CMH_Pub_30-21_0321.jpg",
        "source": "U.S. Army Center of Military History, American Military History, vol. 1 (CMH Pub 30-21, 2009), map 37, scanned by the Internet Archive (cmh-pub-30-21-nsia, leaf 321)",
        "size": [2325, 3075], "rotate": True,
        "frame": [306, 308, 2808, 2054], "legend": [306, 308, 994, 768],
        "points": {
            "nashville": [1362, 933], "knoxville": [1698, 964], "memphis": [952, 1077], "chattanooga": [1538, 1105],
            "atlanta": [1643, 1302], "new-orleans": [908, 1866], "mobile": [1178, 1753], "savannah": [2063, 1546],
            "charleston": [2206, 1434], "richmond": [2470, 694], "washington": [2500, 483], "baltimore": [2548, 420],
            "norfolk": [2627, 785], "jacksonville": [2000, 1808]
        }
    }
}

LINES = [
    ("1861-07-01", "cs1862", ["blue"], [], "limits of loyal States in July 1861"),
    ("1862-03-01", "cs1862", ["grey"], [], "limits occupied by United States forces, 1 March 1862"),
    ("1862-05-15", "cs1862", ["red"], [], "limits occupied by United States forces, 15 May 1862"),
    ("1862-07-15", "cs1862", ["yellow", ("red", [590, 690, 730, 890])], ["red", "grey"], "limits occupied by United States forces, 15 July 1862"),
    ("1863-07-31", "cs1864", ["red"], [], "limit of territory controlled by United States forces, 31 July 1863"),
    ("1864-01-01", "cs1864", ["red", "yellow"], [], "limit of territory gained from 31 July 1863 to 1 January 1864")
]
BANDS = [("1863-12-31", 3, "check"), ("1864-12-31", 4, "gain")]
END = "1865-05-26"

SECEDED = ["Alabama", "Arkansas", "Florida", "Georgia", "Louisiana", "Mississippi", "North Carolina", "South Carolina", "Tennessee", "Texas", "Virginia"]
BORDER = ["Kentucky", "Missouri", "Maryland", "Delaware", "West Virginia", "District of Columbia"]
SEEDS = ["atlanta", "augusta", "raleigh", "richmond", "charleston", "mobile", "houston", "austin"]
LOYAL = ["washington", "baltimore", "cincinnati", "louisville", "st-louis", "pittsburgh"]
MIN_COVER = 0.5
CLOSE_PX, COAST_PX, NEAR_PX, TINT_PX, LOOP_FRAC = 9, 45, 25, 14, 0.25

def cities():
    rows = []
    for f in ("cities-dated.json", "cities-dated-minor.json"):
        rows += json.load(open(os.path.join(HERE, "..", "data", f)))["rows"]
    return {r[0]: (r[2], r[3]) for r in rows}

CITY = cities()

def basis(lon, lat):
    x = np.asarray(lon, float) + 85
    y = np.asarray(lat, float) - 35
    return np.stack([np.ones_like(x), x, y, x * x, x * y, y * y], -1)

def lstsq(A, B):
    return np.linalg.lstsq(A, B, rcond=None)[0]

def georef(points):
    names = sorted(points)
    ll = np.array([CITY[n] for n in names])
    px = np.array([points[n] for n in names], float)
    coef = lstsq(basis(ll[:, 0], ll[:, 1]), px)
    resid = px - basis(ll[:, 0], ll[:, 1]) @ coef
    rbf = RBFInterpolator(ll, resid, kernel="thin_plate_spline", smoothing=len(names) * 2.0)
    def f(lonlat):
        lonlat = np.asarray(lonlat, float).reshape(-1, 2)
        return basis(lonlat[:, 0], lonlat[:, 1]) @ coef + rbf(lonlat)
    rms = float(np.sqrt((resid ** 2).sum(1).mean()))
    return f, rms

def poly_basis(p, order=3):
    x, y = p[:, 0] / 1000.0, p[:, 1] / 1000.0
    cols = [np.ones_like(x)]
    for n in range(1, order + 1):
        for k in range(n + 1):
            cols.append(x ** (n - k) * y ** k)
    return np.stack(cols, -1)

def register(img, ref):
    sift = cv2.SIFT_create(nfeatures=20000)
    ka, da = sift.detectAndCompute(cv2.cvtColor(ref, cv2.COLOR_BGR2GRAY), None)
    kb, db = sift.detectAndCompute(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), None)
    good = [m for m, n in cv2.BFMatcher().knnMatch(da, db, k=2) if m.distance < 0.75 * n.distance]
    pa = np.float32([ka[m.queryIdx].pt for m in good])
    pb = np.float32([kb[m.trainIdx].pt for m in good])
    _, inl = cv2.findHomography(pa, pb, cv2.RANSAC, 4.0)
    pa, pb = pa[inl.ravel() > 0], pb[inl.ravel() > 0]
    coef = lstsq(poly_basis(pa), pb)
    resid = pb - poly_basis(pa) @ coef
    return (lambda p: poly_basis(np.asarray(p, float).reshape(-1, 2)) @ coef), len(pa), float(np.sqrt((resid ** 2).sum(1).mean()))

def load(key):
    s = SCANS[key]
    img = cv2.imread(os.path.join(SCAN_DIR, s["file"]))
    if img is None:
        raise SystemExit("missing scan " + s["file"])
    if img.shape[1] == s["size"][0] and "top" in s:
        img = img[s["top"]:]
        img = cv2.resize(img, (round(img.shape[1] * s["scale"]), round(img.shape[0] * s["scale"])), interpolation=cv2.INTER_AREA)
    if s.get("rotate"):
        img = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
    return img

def masks(img):
    lab = cv2.cvtColor(cv2.GaussianBlur(img, (3, 3), 0), cv2.COLOR_BGR2LAB).astype(np.int16)
    L, A, B = lab[..., 0], lab[..., 1], lab[..., 2]
    dark = ((L < 95) & (np.abs(A - 130) < 8)).astype(np.uint8)
    disk = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    return {
        "red": (A >= 150) & (L < 190),
        "yellow": (B >= 170) & (A < 145) & (L > 110),
        "blue": (A <= 123) & (B < 150) & (L > 50) & (L < 185),
        "grey": cv2.morphologyEx(dark, cv2.MORPH_OPEN, disk) > 0
    }

def cmh_bands(img):
    lab = cv2.cvtColor(cv2.GaussianBlur(img, (5, 5), 0), cv2.COLOR_BGR2LAB).astype(np.int16)
    L, A, B = lab[..., 0], lab[..., 1], lab[..., 2]
    band = np.full(L.shape, -1, np.int8)
    water = (B < 120) & (A < 125)
    pink = A - 128
    band[(L > 200) & (pink < 4) & ~water] = 1
    band[(pink >= 4) & (pink < 11)] = 2
    band[(pink >= 11) & (pink < 22)] = 3
    band[(pink >= 22) & (pink < 33)] = 4
    band[pink >= 33] = 5
    return band

def inside_frame(img):
    g = masks(img)["grey"].astype(np.uint8)
    n, comp, stats, _ = cv2.connectedComponentsWithStats(g, connectivity=8)
    h, w = g.shape
    frame = np.zeros_like(g)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_WIDTH] > 0.45 * w or stats[i, cv2.CC_STAT_HEIGHT] > 0.6 * h:
            frame[comp == i] = 1
    thick = cv2.dilate(frame, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
    n, comp = cv2.connectedComponents((1 - thick).astype(np.uint8), connectivity=4)
    edge = set(np.unique(np.concatenate([comp[-1], comp[:, 0], comp[:, -1]]))) - {0}
    inner = (~np.isin(comp, list(edge)) & (thick == 0)).astype(np.uint8)
    inner = cv2.dilate(inner, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
    return (inner > 0) & (frame == 0)

def counties_at(feats, day):
    stamp = day + "T00:00:00.000Z"
    return [f for f in feats if f["properties"]["START_DATE"] <= stamp <= f["properties"]["END_DATE"]]

def rasterize(feats, f, shape_):
    lab = np.zeros(shape_, np.int32)
    h, w = shape_
    for i, ft in enumerate(feats):
        g = ft["geometry"]
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        for poly in polys:
            rings = [np.round(f(np.array(r)[:, :2])).astype(np.int32) for r in poly]
            cv2.fillPoly(lab, rings[:1], i + 1)
            if len(rings) > 1:
                cv2.fillPoly(lab, rings[1:], 0)
    return lab

def expected(feats, f):
    out = []
    for ft in feats:
        g = shape(ft["geometry"])
        if g.is_empty:
            out.append(0.0)
            continue
        ring = np.array(g.convex_hull.exterior.coords) if g.convex_hull.geom_type == "Polygon" else np.array([g.centroid.coords[0]] * 3)
        out.append(abs(cv2.contourArea(f(ring).astype(np.float32))) * g.area / max(g.convex_hull.area, 1e-12))
    return np.array(out)

def comp_at(comp, xy):
    x, y = int(round(xy[0])), int(round(xy[1]))
    if not (0 <= y < comp.shape[0] and 0 <= x < comp.shape[1]):
        return 0
    win = comp[max(0, y - 8):y + 9, max(0, x - 8):x + 9]
    vals = win[win > 0]
    return int(np.bincount(vals).argmax()) if len(vals) else 0

def loops(mask):
    part = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (CLOSE_PX, CLOSE_PX)))
    n, comp, stats, _ = cv2.connectedComponentsWithStats(part, connectivity=8)
    h, w = mask.shape
    small = [i for i in range(1, n) if stats[i, cv2.CC_STAT_WIDTH] <= LOOP_FRAC * w and stats[i, cv2.CC_STAT_HEIGHT] <= LOOP_FRAC * h]
    return np.isin(comp, small).astype(np.uint8)

def to_coast(barrier, land):
    sk = skeletonize(barrier)
    nb = cv2.filter2D(sk.astype(np.uint8), -1, np.ones((3, 3), np.float32), borderType=cv2.BORDER_CONSTANT)
    ends = np.argwhere(sk & (nb == 2))
    _, parts = cv2.connectedComponents(barrier.astype(np.uint8), connectivity=8)
    h, w = barrier.shape
    out = barrier.astype(np.uint8).copy()
    joined = 0
    r = COAST_PX
    for y, x in ends:
        y0, y1, x0, x1 = max(0, y - r), min(h, y + r + 1), max(0, x - r), min(w, x + r + 1)
        win = parts[y0:y1, x0:x1]
        for target in (~land[y0:y1, x0:x1], (win > 0) & (win != parts[y, x])):
            ty, tx = np.nonzero(target)
            if not len(ty):
                continue
            d = (ty + y0 - y) ** 2 + (tx + x0 - x) ** 2
            k = int(np.argmin(d))
            if d[k] <= r * r:
                cv2.line(out, (int(x), int(y)), (int(tx[k] + x0), int(ty[k] + y0)), 1, 3)
                joined += 1
    return out > 0, joined

def flood(barrier, land, seeds):
    free = (land & ~barrier).astype(np.uint8)
    n, comp = cv2.connectedComponents(free, connectivity=4)
    return comp, {c for c in (comp_at(comp, xy) for xy in seeds) if c}

def main():
    allc = json.load(open(COUNTIES))["features"]
    feats = [f for f in allc if "Territory" not in f["properties"]["STATE_TERR"] and "Unorganized" not in f["properties"]["STATE_TERR"]]
    img = {k: load(k) for k in SCANS}
    geo = {}
    for k, s in SCANS.items():
        if "points" in s:
            geo[k], rms = georef(s["points"])
            print(k + ": " + str(len(s["points"])) + " control points, residual " + str(round(rms, 1)) + " px")
    for k, s in SCANS.items():
        if "register" in s:
            ref = img[s["register"]]
            g, n, rms = register(img[k], ref)
            h, w = ref.shape[:2]
            yy, xx = np.mgrid[0:h, 0:w]
            src = g(np.stack([xx.ravel(), yy.ravel()], -1)).astype(np.float32)
            img[k] = cv2.remap(img[k], src[:, 0].reshape(h, w), src[:, 1].reshape(h, w), cv2.INTER_LINEAR, borderValue=(255, 255, 255))
            geo[k] = geo[s["register"]]
            print(k + ": registered to " + s["register"] + " by " + str(n) + " matched points, residual " + str(round(rms, 1)) + " px")
    loyal = masks(img["cs1862"])["blue"]
    within = inside_frame(img["cs1862"])
    states = {}
    for day, key, colours, hidden, title in LINES:
        im = img[key]
        m = masks(im)
        barrier = np.zeros(im.shape[:2], np.uint8)
        for c in colours:
            part = m[c if isinstance(c, str) else c[0]].astype(np.uint8)
            if not isinstance(c, str):
                x0, y0, x1, y1 = c[1]
                box = np.zeros_like(part)
                box[y0:y1, x0:x1] = 1
                part &= box
            barrier |= cv2.morphologyEx(part, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (CLOSE_PX, CLOSE_PX)))
        near = cv2.dilate(barrier, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * NEAR_PX + 1, 2 * NEAR_PX + 1))) > 0
        for c in hidden:
            barrier |= (m[c] & near).astype(np.uint8)
        for d2, k2, c2, _, _ in LINES:
            if k2 != key or d2 >= day:
                continue
            for c in c2:
                if isinstance(c, str) and c != "blue":
                    barrier |= loops(m[c])
        day_land = rasterize(counties_at(feats, day), geo[key], im.shape[:2]) > 0
        inland = cv2.distanceTransform(day_land.astype(np.uint8), cv2.DIST_L2, 5) > TINT_PX
        barrier = (barrier > 0) | (loyal & inland)
        barrier = cv2.dilate(barrier.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))) > 0
        day_feats = counties_at(feats, day)
        lab = rasterize(day_feats, geo[key], im.shape[:2])
        land = (cv2.dilate((lab > 0).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))) > 0) & within
        barrier, joined = to_coast(barrier, land)
        comp, bad = flood(barrier, land, [geo[key]([CITY[c]])[0] for c in SEEDS])
        rim = (cv2.dilate(barrier.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))) > 0) & ~barrier
        bounded = set(np.unique(comp[rim])) - {0}
        bad |= set(np.unique(comp)) - bounded - {0}
        leaks = [c for c in LOYAL if comp_at(comp, geo[key]([CITY[c]])[0]) in bad]
        if leaks:
            print("  " + day + ": the Confederate area reaches " + ", ".join(leaks))
        csa = np.isin(comp, list(bad))
        n = len(day_feats) + 1
        free = (lab > 0) & land & ~barrier
        tot = np.bincount(lab[free].ravel(), minlength=n)
        con = np.bincount(lab[free & csa].ravel(), minlength=n)
        exp = expected(day_feats, geo[key])
        side = {}
        for i, ft in enumerate(day_feats):
            p = ft["properties"]
            if p["STATE_TERR"] not in SECEDED + BORDER:
                continue
            if exp[i] <= 0 or tot[i + 1] < MIN_COVER * exp[i]:
                continue
            frac = con[i + 1] / max(tot[i + 1], 1)
            if frac < 0.5:
                side[p["ID_NUM"]] = "union"
            elif p["STATE_TERR"] in BORDER and colours == ["blue"]:
                side[p["ID_NUM"]] = "contested"
            else:
                side[p["ID_NUM"]] = "csa"
        states[day] = side
        counts = {s: sum(1 for v in side.values() if v == s) for s in ("union", "csa", "contested")}
        print(day + " (" + key + "): " + json.dumps(counts))
        if DEBUG:
            vis = im.copy() // 2 + 100
            vis[csa] = (vis[csa] * 0.5 + np.array([60, 60, 200]) * 0.5).astype(np.uint8)
            vis[barrier] = (0, 0, 0)
            cv2.imwrite(os.path.join(DEBUG, "flood-" + day + ".jpg"), cv2.resize(vis, (vis.shape[1] // 3, vis.shape[0] // 3)))
    band = cmh_bands(img["cmh"])
    x0, y0, x1, y1 = SCANS["cmh"]["frame"]
    keep = np.zeros(band.shape, bool)
    keep[y0:y1, x0:x1] = True
    x0, y0, x1, y1 = SCANS["cmh"]["legend"]
    keep[y0:y1, x0:x1] = False
    band[~keep] = -1
    bands = {}
    for day, year, use in BANDS:
        day_feats = counties_at(feats, day)
        lab = rasterize(day_feats, geo["cmh"], band.shape)
        n = len(day_feats) + 1
        ok = (band >= 1) & (lab > 0)
        tot = np.bincount(lab[ok].ravel(), minlength=n)
        uni = np.bincount(lab[ok & (band <= year)].ravel(), minlength=n)
        exp = expected(day_feats, geo["cmh"])
        side = {}
        for i, ft in enumerate(day_feats):
            p = ft["properties"]
            if p["STATE_TERR"] not in SECEDED + BORDER or exp[i] <= 0 or tot[i + 1] < MIN_COVER * exp[i]:
                continue
            side[p["ID_NUM"]] = "union" if uni[i + 1] / tot[i + 1] >= 0.5 else "csa"
        bands[day] = (side, use)
        print(day + " (cmh): " + json.dumps({s: sum(1 for v in side.values() if v == s) for s in ("union", "csa")}))
        if DEBUG:
            pal = np.array([[255, 255, 255], [230, 230, 255], [200, 200, 250], [150, 150, 240], [90, 90, 220], [40, 40, 160]], np.uint8)
            vis = np.where((band >= 0)[..., None], pal[np.clip(band, 0, 5)], 0).astype(np.uint8)
            cv2.imwrite(os.path.join(DEBUG, "cmh-bands.jpg"), cv2.resize(vis, (vis.shape[1] // 3, vis.shape[0] // 3)))
    return feats, states, bands

SIDES = {
    "union": ["the Union", "#2f5d9e"],
    "csa": ["the Confederacy", "#6f6a5f"],
    "contested": ["neither side, beyond the loyal States' line of July 1861", "#b0892f"]
}
SIMPLIFY_DEG = 0.02

def timeline(feats, states, bands):
    periods = [(day, side) for day, side in states.items()]
    last = dict(states[LINES[-1][0]])
    for day, (side, use) in bands.items():
        if use != "gain":
            continue
        merged = dict(last)
        for i, v in side.items():
            if v == "union":
                merged[i] = "union"
        periods.append((day, merged))
    periods.sort()
    by_day = {}
    for k, (day, side) in enumerate(periods):
        until = periods[k + 1][0] if k + 1 < len(periods) else None
        by_day[day] = (side, until)
    return by_day

def previous(day):
    import datetime
    d = datetime.date.fromisoformat(day) - datetime.timedelta(days=1)
    return d.isoformat()

def rounded(geom):
    def walk(c):
        return [walk(x) for x in c] if isinstance(c[0], (list, tuple)) else [round(c[0], 3), round(c[1], 3)]
    g = mapping(geom)
    return {"type": g["type"], "coordinates": walk(g["coordinates"])}

def write(feats, states, bands):
    by_day = timeline(feats, states, bands)
    rows = []
    for day, (side, until) in sorted(by_day.items()):
        present = {f["properties"]["ID_NUM"]: f for f in counties_at(feats, day)}
        for key in SIDES:
            geoms = [shape(present[i]["geometry"]).buffer(0) for i, v in side.items() if v == key and i in present]
            if not geoms:
                continue
            g = unary_union(geoms).simplify(SIMPLIFY_DEG, preserve_topology=True)
            rows.append([key, day, previous(until) if until else END, rounded(g)])
    cs, cmh = states[LINES[-1][0]], bands[BANDS[0][0]][0]
    both = [i for i in cs if i in cmh and cs[i] != "contested"]
    agree = sum(1 for i in both if cs[i] == cmh[i])
    check = "the 1 January 1864 limit and the Center of Military History map at the end of 1863 agree on " + str(agree) + " of " + str(len(both)) + " counties"
    print(check)
    out = {
        "source": "U.S. Coast Survey, Historical sketch of the rebellion (July 1862 and 1864 editions; Library of Congress via Wikimedia Commons, public domain): " + "; ".join(t for _, _, _, _, t in LINES) + ". Gains during 1864 from " + SCANS["cmh"]["source"] + ". Counties from the Newberry Library's Atlas of Historical County Boundaries; a county takes the side holding most of it on each dated map",
        "check": check,
        "sides": SIDES,
        "rows": rows
    }
    path = os.path.join(HERE, "control", "civilwar.json")
    json.dump(out, open(path, "w"), separators=(",", ":"))
    print("wrote " + path + ": " + str(len(rows)) + " shapes, " + str(os.path.getsize(path) // 1024) + " KB")

if __name__ == "__main__":
    write(*main())
