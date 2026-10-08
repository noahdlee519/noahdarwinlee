(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GreatCircle = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var DEG = Math.PI / 180;
  var RAD = 180 / Math.PI;
  var EARTH_RADIUS_KM = 6371.0088;

  var ON_CIRCLE = 1e-12;
  var SAME_POINT = 1e-10;
  var MIN_TURN = 1e-9;

  function toVec(lon, lat) {
    var p = lat * DEG, l = lon * DEG, c = Math.cos(p);
    return [c * Math.cos(l), c * Math.sin(l), Math.sin(p)];
  }

  function toLonLat(v) {
    return [Math.atan2(v[1], v[0]) * RAD, Math.atan2(v[2], Math.hypot(v[0], v[1])) * RAD];
  }

  function angleBetween(a, b) {
    var cx = a[1] * b[2] - a[2] * b[1];
    var cy = a[2] * b[0] - a[0] * b[2];
    var cz = a[0] * b[1] - a[1] * b[0];
    return Math.atan2(Math.hypot(cx, cy, cz), a[0] * b[0] + a[1] * b[1] + a[2] * b[2]);
  }

  function angleXYZ(ax, ay, az, bx, by, bz) {
    var cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
    return Math.atan2(Math.hypot(cx, cy, cz), ax * bx + ay * by + az * bz);
  }

  function normalize(v) {
    var l = Math.hypot(v[0], v[1], v[2]);
    return l > 0 ? [v[0] / l, v[1] / l, v[2] / l] : [0, 0, 0];
  }

  function sampleArc(a, b, step, includeStart) {
    var d = angleBetween(a, b);
    var n = Math.max(1, Math.ceil(d / (step || 0.01)));
    var out = [];
    if (includeStart) out.push([a[0], a[1], a[2]]);
    if (d < 1e-12) { out.push([b[0], b[1], b[2]]); return out; }
    var s = Math.sin(d);
    for (var i = 1; i <= n; i++) {
      var t = i / n, wa = Math.sin((1 - t) * d) / s, wb = Math.sin(t * d) / s;
      out.push(normalize([wa * a[0] + wb * b[0], wa * a[1] + wb * b[1], wa * a[2] + wb * b[2]]));
    }
    return out;
  }

  function sphereDistanceKm(lonA, latA, lonB, latB) {
    return angleBetween(toVec(lonA, latA), toVec(lonB, latB)) * EARTH_RADIUS_KM;
  }

  function ellipsoidDistanceKm(lonA, latA, lonB, latB) {
    var a = 6378137, f = 1 / 298.257223563, b = (1 - f) * a;
    var L = (lonB - lonA) * DEG;
    var U1 = Math.atan((1 - f) * Math.tan(latA * DEG));
    var U2 = Math.atan((1 - f) * Math.tan(latB * DEG));
    var sinU1 = Math.sin(U1), cosU1 = Math.cos(U1), sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);
    var lambda = L, lambdaPrev, iter = 0;
    var sinSigma, cosSigma, sigma, sinAlpha, cosSqAlpha, cos2SigmaM, C;
    do {
      var sinLambda = Math.sin(lambda), cosLambda = Math.cos(lambda);
      sinSigma = Math.sqrt(
        (cosU2 * sinLambda) * (cosU2 * sinLambda) +
        (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) * (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda)
      );
      if (sinSigma === 0) return 0;
      cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
      sigma = Math.atan2(sinSigma, cosSigma);
      sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
      cosSqAlpha = 1 - sinAlpha * sinAlpha;
      cos2SigmaM = cosSqAlpha !== 0 ? cosSigma - 2 * sinU1 * sinU2 / cosSqAlpha : 0;
      C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
      lambdaPrev = lambda;
      lambda = L + (1 - C) * f * sinAlpha *
        (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
    } while (Math.abs(lambda - lambdaPrev) > 1e-12 && ++iter < 200);
    if (iter >= 200) return null;
    var uSq = cosSqAlpha * (a * a - b * b) / (b * b);
    var A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
    var B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
    var deltaSigma = B * sinSigma * (cos2SigmaM + B / 4 * (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
      B / 6 * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)));
    return b * A * (sigma - deltaSigma) / 1000;
  }

  function buildObstacles(features, options) {
    options = options || {};
    var X = [], Y = [], Z = [], ringOf = [], cut = [];
    var rings = [], polygons = [], feats = [];

    for (var fi = 0; fi < features.length; fi++) {
      var f = features[fi];
      if (!f || !f.geometry) continue;
      if (options.exclude && options.exclude(f)) continue;
      var polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates]
        : f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [];
      var featIndex = feats.length;
      var invert = !!(f.properties && f.properties.invert);
      feats.push({ id: f.id, name: (f.properties && f.properties.name) || String(f.id), index: featIndex });
      for (var pi = 0; pi < polys.length; pi++) {
        var polyIndex = polygons.length;
        polygons.push({ feature: featIndex, exterior: -1, holes: [], inverted: invert });
        for (var ri = 0; ri < polys[pi].length; ri++) {
          var ring = cleanRing(polys[pi][ri]);
          if (ring.length < 3) continue;
          var isHole = ri > 0;
          var area = sphericalSignedArea(ring.vecs);
          if ((area < 0) !== (isHole !== invert)) {
            ring.vecs.reverse(); ring.cut.reverse();
          }
          var start = X.length;
          for (var i = 0; i < ring.vecs.length; i++) {
            X.push(ring.vecs[i][0]); Y.push(ring.vecs[i][1]); Z.push(ring.vecs[i][2]);
            ringOf.push(rings.length); cut.push(ring.cut[i] ? 1 : 0);
          }
          var r = { start: start, end: X.length, polygon: polyIndex, feature: featIndex, hole: isHole };
          ringCap(r, ring.vecs);
          if (isHole) polygons[polyIndex].holes.push(rings.length);
          else polygons[polyIndex].exterior = rings.length;
          rings.push(r);
        }
        if (polygons[polyIndex].exterior < 0) polygons.pop();
      }
    }

    var obs = {
      n: X.length,
      X: Float64Array.from(X), Y: Float64Array.from(Y), Z: Float64Array.from(Z),
      ringOf: Int32Array.from(ringOf), cut: Uint8Array.from(cut),
      rings: rings, polygons: polygons, features: feats
    };
    buildEdgeTree(obs);
    buildCorners(obs);
    return obs;
  }

  function cleanRing(coords) {
    var vecs = [], cut = [], last = null;
    for (var i = 0; i < coords.length; i++) {
      var c = coords[i];
      if (last && Math.abs(c[0] - last[0]) < 1e-12 && Math.abs(c[1] - last[1]) < 1e-12) continue;
      vecs.push(toVec(c[0], c[1]));
      cut.push(Math.abs(Math.abs(c[0]) - 180) < 1e-7 || Math.abs(Math.abs(c[1]) - 90) < 1e-7);
      last = c;
    }
    if (vecs.length > 1) {
      var a = coords[0], b = last;
      if (Math.abs(a[0] - b[0]) < 1e-12 && Math.abs(a[1] - b[1]) < 1e-12) { vecs.pop(); cut.pop(); }
    }
    return { vecs: vecs, cut: cut, length: vecs.length };
  }

  function sphericalSignedArea(v) {
    var a = v[0], sum = 0;
    for (var i = 1; i + 1 < v.length; i++) {
      var b = v[i], c = v[i + 1];
      var triple = a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
      var denom = 1 + (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) + (b[0] * c[0] + b[1] * c[1] + b[2] * c[2]) + (c[0] * a[0] + c[1] * a[1] + c[2] * a[2]);
      sum += 2 * Math.atan2(triple, denom);
    }
    return sum;
  }

  function ringCap(r, vecs) {
    var sx = 0, sy = 0, sz = 0;
    for (var i = 0; i < vecs.length; i++) { sx += vecs[i][0]; sy += vecs[i][1]; sz += vecs[i][2]; }
    var l = Math.hypot(sx, sy, sz);
    if (l < 1e-9) { sx = vecs[0][0]; sy = vecs[0][1]; sz = vecs[0][2]; l = 1; }
    r.cx = sx / l; r.cy = sy / l; r.cz = sz / l;
    var maxAngle = 0;
    for (i = 0; i < vecs.length; i++) {
      var a = angleXYZ(r.cx, r.cy, r.cz, vecs[i][0], vecs[i][1], vecs[i][2]);
      if (a > maxAngle) maxAngle = a;
    }
    r.radius = maxAngle;
    r.cosRadius = Math.cos(Math.min(maxAngle + 1e-9, Math.PI));
  }

  function nextIndex(obs, i) {
    var r = obs.rings[obs.ringOf[i]];
    return i + 1 < r.end ? i + 1 : r.start;
  }

  function prevIndex(obs, i) {
    var r = obs.rings[obs.ringOf[i]];
    return i > r.start ? i - 1 : r.end - 1;
  }

  function buildEdgeTree(obs) {
    var n = obs.n;
    var mx = new Float64Array(n), my = new Float64Array(n), mz = new Float64Array(n);
    var X = obs.X, Y = obs.Y, Z = obs.Z;
    for (var i = 0; i < n; i++) {
      var j = nextIndex(obs, i);
      var x = X[i] + X[j], y = Y[i] + Y[j], z = Z[i] + Z[j];
      var l = Math.hypot(x, y, z) || 1;
      mx[i] = x / l; my[i] = y / l; mz[i] = z / l;
    }
    var perm = new Int32Array(n);
    for (i = 0; i < n; i++) perm[i] = i;

    var LEAF = 8;
    var capacity = Math.max(1, 2 * Math.ceil(n / LEAF) + 16) * 2;
    var cx = new Float64Array(capacity), cy = new Float64Array(capacity), cz = new Float64Array(capacity);
    var cosR = new Float64Array(capacity);
    var left = new Int32Array(capacity), right = new Int32Array(capacity);
    var lo = new Int32Array(capacity), hi = new Int32Array(capacity);
    var count = 0;

    function makeNode(a, b) {
      var id = count++;
      if (id >= cx.length) grow();
      var sx = 0, sy = 0, sz = 0;
      for (var k = a; k < b; k++) { var e = perm[k]; sx += mx[e]; sy += my[e]; sz += mz[e]; }
      var l = Math.hypot(sx, sy, sz);
      if (l < 1e-9) { sx = mx[perm[a]]; sy = my[perm[a]]; sz = mz[perm[a]]; l = 1; }
      sx /= l; sy /= l; sz /= l;
      var minDot = 1;
      for (k = a; k < b; k++) {
        e = perm[k];
        var j = nextIndex(obs, e);
        var d1 = sx * X[e] + sy * Y[e] + sz * Z[e];
        var d2 = sx * X[j] + sy * Y[j] + sz * Z[j];
        if (d1 < minDot) minDot = d1;
        if (d2 < minDot) minDot = d2;
      }
      cx[id] = sx; cy[id] = sy; cz[id] = sz;
      cosR[id] = minDot <= 0 ? -1 : Math.max(-1, minDot - 1e-9);
      if (b - a <= LEAF) {
        left[id] = -1; right[id] = -1; lo[id] = a; hi[id] = b;
        return id;
      }
      var minx = 2, maxx = -2, miny = 2, maxy = -2, minz = 2, maxz = -2;
      for (k = a; k < b; k++) {
        e = perm[k];
        if (mx[e] < minx) minx = mx[e]; if (mx[e] > maxx) maxx = mx[e];
        if (my[e] < miny) miny = my[e]; if (my[e] > maxy) maxy = my[e];
        if (mz[e] < minz) minz = mz[e]; if (mz[e] > maxz) maxz = mz[e];
      }
      var ex = maxx - minx, ey = maxy - miny, ez = maxz - minz;
      var key = ex >= ey && ex >= ez ? mx : ey >= ez ? my : mz;
      var sub = perm.subarray(a, b);
      sub.sort(function (p, q) { return key[p] - key[q]; });
      var mid = (a + b) >> 1;
      lo[id] = a; hi[id] = b;
      var L = makeNode(a, mid);
      var R = makeNode(mid, b);
      left[id] = L; right[id] = R;
      return id;
    }

    function grow() {
      var c2 = cx.length * 2;
      var g = function (arr, T) { var n2 = new T(c2); n2.set(arr); return n2; };
      cx = g(cx, Float64Array); cy = g(cy, Float64Array); cz = g(cz, Float64Array); cosR = g(cosR, Float64Array);
      left = g(left, Int32Array); right = g(right, Int32Array); lo = g(lo, Int32Array); hi = g(hi, Int32Array);
    }

    var rootId = n > 0 ? makeNode(0, n) : -1;
    obs.tree = { root: rootId, cx: cx, cy: cy, cz: cz, cosR: cosR, left: left, right: right, lo: lo, hi: hi, perm: perm, count: count,
      stack: new Int32Array(Math.max(64, 2 * Math.ceil(Math.log2(count + 1)) + 8)) };
  }

  function keyPart(x) { return (x > -5e-13 && x < 5e-13 ? 0 : x).toFixed(12); }

  function buildCorners(obs) {
    var n = obs.n, X = obs.X, Y = obs.Y, Z = obs.Z;
    var turn = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      var p = prevIndex(obs, i), q = nextIndex(obs, i);
      var nx = Y[p] * Z[i] - Z[p] * Y[i];
      var ny = Z[p] * X[i] - X[p] * Z[i];
      var nz = X[p] * Y[i] - Y[p] * X[i];
      var nl = Math.hypot(nx, ny, nz);
      var mx = Y[i] * Z[q] - Z[i] * Y[q];
      var my = Z[i] * X[q] - X[i] * Z[q];
      var mz = X[i] * Y[q] - Y[i] * X[q];
      var ml = Math.hypot(mx, my, mz);
      if (nl < 1e-15 || ml < 1e-15) { turn[i] = 0; continue; }
      turn[i] = (X[q] * nx + Y[q] * ny + Z[q] * nz) / nl / ml;
    }
    obs.turn = turn;

    var byKey = new Map();
    for (i = 0; i < n; i++) {
      var key = keyPart(X[i]) + "," + keyPart(Y[i]) + "," + keyPart(Z[i]);
      var list = byKey.get(key);
      if (list) list.push(i); else byKey.set(key, [i]);
    }
    var CX = [], CY = [], CZ = [], wStart = [], wCount = [], wPrev = [], wNext = [];
    var cornerOf = new Int32Array(n).fill(-1);
    byKey.forEach(function (list) {
      var ok = true;
      for (var k = 0; k < list.length; k++) {
        var v = list[k];
        if (obs.cut[v] || !(turn[v] > MIN_TURN)) { ok = false; break; }
      }
      if (!ok) return;
      var id = CX.length;
      CX.push(X[list[0]]); CY.push(Y[list[0]]); CZ.push(Z[list[0]]);
      wStart.push(wPrev.length); wCount.push(list.length);
      for (k = 0; k < list.length; k++) {
        cornerOf[list[k]] = id;
        wPrev.push(prevIndex(obs, list[k])); wNext.push(nextIndex(obs, list[k]));
      }
    });
    obs.corners = {
      count: CX.length,
      X: Float64Array.from(CX), Y: Float64Array.from(CY), Z: Float64Array.from(CZ),
      wStart: Int32Array.from(wStart), wCount: Int32Array.from(wCount),
      wPrev: Int32Array.from(wPrev), wNext: Int32Array.from(wNext),
      cornerOf: cornerOf
    };
  }

  function enters(obs, v, tx, ty, tz) {
    var X = obs.X, Y = obs.Y, Z = obs.Z;
    var vx = X[v], vy = Y[v], vz = Z[v];
    var p = prevIndex(obs, v), q = nextIndex(obs, v);
    var qd = X[q] * vx + Y[q] * vy + Z[q] * vz, pd = X[p] * vx + Y[p] * vy + Z[p] * vz;
    var nx = X[q] - qd * vx, ny = Y[q] - qd * vy, nz = Z[q] - qd * vz;
    var px = X[p] - pd * vx, py = Y[p] - pd * vy, pz = Z[p] - pd * vz;
    var wedge = ccwAngle(vx, vy, vz, nx, ny, nz, px, py, pz);
    var at = ccwAngle(vx, vy, vz, nx, ny, nz, tx, ty, tz);
    return at > 1e-7 && at < wedge - 1e-7;
  }

  function ccwAngle(vx, vy, vz, ax, ay, az, bx, by, bz) {
    var cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
    var s = vx * cx + vy * cy + vz * cz;
    var c = ax * bx + ay * by + az * bz;
    var ang = Math.atan2(s, c);
    return ang < 0 ? ang + 2 * Math.PI : ang;
  }

  function edgeRelation(obs, ax, ay, az, bx, by, bz, nnx, nny, nnz, e, cornerA, cornerB) {
    var X = obs.X, Y = obs.Y, Z = obs.Z;
    var d = nextIndex(obs, e);
    var cornerOf = obs.corners.cornerOf;
    var sc = X[e] * nnx + Y[e] * nny + Z[e] * nnz;
    var sd = X[d] * nnx + Y[d] * nny + Z[d] * nnz;
    var ce = cornerOf[e], cd = cornerOf[d];
    if (ce >= 0 && (ce === cornerA || ce === cornerB)) sc = 0;
    if (cd >= 0 && (cd === cornerA || cd === cornerB)) sd = 0;
    var cOn = sc > -ON_CIRCLE && sc < ON_CIRCLE;
    var dOn = sd > -ON_CIRCLE && sd < ON_CIRCLE;

    if (dOn) {
      var dx = X[d], dy = Y[d], dz = Z[d];
      if (!withinArc(ax, ay, az, bx, by, bz, nnx, nny, nnz, dx, dy, dz)) return 0;
      var atA = angleXYZ(ax, ay, az, dx, dy, dz) < SAME_POINT;
      var atB = angleXYZ(bx, by, bz, dx, dy, dz) < SAME_POINT;
      if (atA || atB) {
        var ox = atA ? bx : ax, oy = atA ? by : ay, oz = atA ? bz : az;
        var od = ox * dx + oy * dy + oz * dz;
        return enters(obs, d, ox - od * dx, oy - od * dy, oz - od * dz) ? 2 : 0;
      }
      var tx = nny * dz - nnz * dy, ty = nnz * dx - nnx * dz, tz = nnx * dy - nny * dx;
      return (enters(obs, d, tx, ty, tz) || enters(obs, d, -tx, -ty, -tz)) ? 1 : 0;
    }
    if (cOn) return 0;
    if ((sc > 0) === (sd > 0)) return 0;

    var ex = Y[e] * Z[d] - Z[e] * Y[d];
    var ey = Z[e] * X[d] - X[e] * Z[d];
    var ez = X[e] * Y[d] - Y[e] * X[d];
    var el = Math.hypot(ex, ey, ez);
    if (el < 1e-15) return 0;
    ex /= el; ey /= el; ez /= el;
    var sa = ax * ex + ay * ey + az * ez;
    var sb = bx * ex + by * ey + bz * ez;
    var aOn = sa > -ON_CIRCLE && sa < ON_CIRCLE;
    var bOn = sb > -ON_CIRCLE && sb < ON_CIRCLE;
    if (aOn || bOn) {
      var px = aOn ? ax : bx, py = aOn ? ay : by, pz = aOn ? az : bz;
      if (!withinArc(X[e], Y[e], Z[e], X[d], Y[d], Z[d], ex, ey, ez, px, py, pz)) return 0;
      var qx = aOn ? bx : ax, qy = aOn ? by : ay, qz = aOn ? bz : az;
      var side = qx * ex + qy * ey + qz * ez;
      return side > ON_CIRCLE ? 2 : 0;
    }
    if ((sa > 0) === (sb > 0)) return 0;
    var ix = nny * ez - nnz * ey, iy = nnz * ex - nnx * ez, iz = nnx * ey - nny * ex;
    var onArc = (ax + bx) * ix + (ay + by) * iy + (az + bz) * iz;
    var onEdge = (X[e] + X[d]) * ix + (Y[e] + Y[d]) * iy + (Z[e] + Z[d]) * iz;
    return (onArc > 0) === (onEdge > 0) ? 1 : 0;
  }

  function edgeCrossesLine(obs, px, py, pz, qx, qy, qz, nnx, nny, nnz, e) {
    var X = obs.X, Y = obs.Y, Z = obs.Z;
    var d = nextIndex(obs, e);
    var sc = X[e] * nnx + Y[e] * nny + Z[e] * nnz;
    var sd = X[d] * nnx + Y[d] * nny + Z[d] * nnz;
    var cOn = sc > -ON_CIRCLE && sc < ON_CIRCLE;
    var dOn = sd > -ON_CIRCLE && sd < ON_CIRCLE;
    if (cOn) return 0;
    if (dOn) {
      var r = obs.rings[obs.ringOf[d]];
      var w = d, sw = sd, steps = 0, limit = r.end - r.start, last = d;
      while (sw > -ON_CIRCLE && sw < ON_CIRCLE && steps < limit) {
        last = w;
        w = nextIndex(obs, w);
        sw = X[w] * nnx + Y[w] * nny + Z[w] * nnz;
        steps++;
      }
      if (steps >= limit) return 0;
      if (withinArc(X[d], Y[d], Z[d], X[last], Y[last], Z[last], nnx, nny, nnz, px, py, pz) &&
          angleXYZ(X[d], Y[d], Z[d], X[last], Y[last], Z[last]) < Math.PI - 1e-9) return -1;
      if (!withinArc(px, py, pz, qx, qy, qz, nnx, nny, nnz, X[d], Y[d], Z[d])) return 0;
      if (angleXYZ(px, py, pz, X[d], Y[d], Z[d]) < SAME_POINT) return -1;
      return (sc > 0) !== (sw > 0) ? 1 : 0;
    }
    if ((sc > 0) === (sd > 0)) return 0;
    var ex = Y[e] * Z[d] - Z[e] * Y[d], ey = Z[e] * X[d] - X[e] * Z[d], ez = X[e] * Y[d] - Y[e] * X[d];
    var el = Math.hypot(ex, ey, ez);
    if (el < 1e-15) return 0;
    ex /= el; ey /= el; ez /= el;
    var sp = px * ex + py * ey + pz * ez;
    var sq = qx * ex + qy * ey + qz * ez;
    if (sp > -ON_CIRCLE && sp < ON_CIRCLE) {
      return withinArc(X[e], Y[e], Z[e], X[d], Y[d], Z[d], ex, ey, ez, px, py, pz) ? -1 : 0;
    }
    if (sq > -ON_CIRCLE && sq < ON_CIRCLE) return 0;
    if ((sp > 0) === (sq > 0)) return 0;
    var ix = nny * ez - nnz * ey, iy = nnz * ex - nnx * ez, iz = nnx * ey - nny * ex;
    var onArc = (px + qx) * ix + (py + qy) * iy + (pz + qz) * iz;
    var onEdge = (X[e] + X[d]) * ix + (Y[e] + Y[d]) * iy + (Z[e] + Z[d]) * iz;
    return (onArc > 0) === (onEdge > 0) ? 1 : 0;
  }

  function withinArc(ax, ay, az, bx, by, bz, nnx, nny, nnz, px, py, pz) {
    var c1 = (ay * pz - az * py) * nnx + (az * px - ax * pz) * nny + (ax * py - ay * px) * nnz;
    var c2 = (py * bz - pz * by) * nnx + (pz * bx - px * bz) * nny + (px * by - py * bx) * nnz;
    return c1 >= -ON_CIRCLE && c2 >= -ON_CIRCLE;
  }

  function visitNearEdges(obs, ax, ay, az, bx, by, bz, nnx, nny, nnz, visit) {
    var t = obs.tree;
    if (t.root < 0) return false;
    var stack = t.stack, sp = 0;
    stack[sp++] = t.root;
    var tcx = t.cx, tcy = t.cy, tcz = t.cz, tcos = t.cosR, tl = t.left, tr = t.right, tlo = t.lo, thi = t.hi, perm = t.perm;
    while (sp > 0) {
      var id = stack[--sp];
      if (!arcReachesCap(ax, ay, az, bx, by, bz, nnx, nny, nnz, tcx[id], tcy[id], tcz[id], tcos[id])) continue;
      if (tl[id] < 0) {
        for (var k = tlo[id]; k < thi[id]; k++) {
          if (visit(perm[k])) return true;
        }
      } else {
        stack[sp++] = tl[id]; stack[sp++] = tr[id];
      }
    }
    return false;
  }

  function arcReachesCap(ax, ay, az, bx, by, bz, nnx, nny, nnz, cx, cy, cz, cosR) {
    var s = cx * nnx + cy * nny + cz * nnz;
    var fx = cx - s * nnx, fy = cy - s * nny, fz = cz - s * nnz;
    var c1 = (ay * fz - az * fy) * nnx + (az * fx - ax * fz) * nny + (ax * fy - ay * fx) * nnz;
    var c2 = (fy * bz - fz * by) * nnx + (fz * bx - fx * bz) * nny + (fx * by - fy * bx) * nnz;
    var cosDist;
    if (c1 >= -ON_CIRCLE && c2 >= -ON_CIRCLE) {
      cosDist = Math.sqrt(1 - s * s > 0 ? 1 - s * s : 0);
    } else {
      var da = cx * ax + cy * ay + cz * az, db = cx * bx + cy * by + cz * bz;
      cosDist = da > db ? da : db;
    }
    return cosDist >= cosR;
  }

  function arcBlocked(obs, ax, ay, az, bx, by, bz, nnx, nny, nnz, cornerA, cornerB) {
    var t = obs.tree;
    if (t.root < 0) return false;
    var stack = t.stack, sp = 0;
    stack[sp++] = t.root;
    var tcx = t.cx, tcy = t.cy, tcz = t.cz, tcos = t.cosR, tl = t.left, tr = t.right, tlo = t.lo, thi = t.hi, perm = t.perm;
    while (sp > 0) {
      var id = stack[--sp];
      if (!arcReachesCap(ax, ay, az, bx, by, bz, nnx, nny, nnz, tcx[id], tcy[id], tcz[id], tcos[id])) continue;
      if (tl[id] < 0) {
        for (var k = tlo[id]; k < thi[id]; k++) {
          if (edgeRelation(obs, ax, ay, az, bx, by, bz, nnx, nny, nnz, perm[k], cornerA, cornerB) !== 0) return true;
        }
      } else {
        stack[sp++] = tl[id]; stack[sp++] = tr[id];
      }
    }
    return false;
  }

  function arcIsFree(obs, a, b, cornerA, cornerB) {
    var ax = a[0], ay = a[1], az = a[2], bx = b[0], by = b[1], bz = b[2];
    var nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    var nl = Math.hypot(nx, ny, nz);
    if (nl < 1e-15) return true;
    nx /= nl; ny /= nl; nz /= nl;
    return !arcBlocked(obs, ax, ay, az, bx, by, bz, nx, ny, nz, cornerA, cornerB);
  }

  function featuresCrossedByArc(obs, a, b, outMap) {
    var ax = a[0], ay = a[1], az = a[2], bx = b[0], by = b[1], bz = b[2];
    var nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    var nl = Math.hypot(nx, ny, nz);
    if (nl < 1e-15) return outMap;
    nx /= nl; ny /= nl; nz /= nl;
    var X = obs.X, Y = obs.Y, Z = obs.Z;
    visitNearEdges(obs, ax, ay, az, bx, by, bz, nx, ny, nz, function (e) {
      if (edgeRelation(obs, ax, ay, az, bx, by, bz, nx, ny, nz, e, -1, -1) !== 0) {
        var fi = obs.rings[obs.ringOf[e]].feature;
        var d = nextIndex(obs, e);
        var mx = X[e] + X[d], my = Y[e] + Y[d], mz = Z[e] + Z[d];
        var ml = Math.hypot(mx, my, mz) || 1;
        var at = angleXYZ(ax, ay, az, mx / ml, my / ml, mz / ml);
        var prev = outMap.get(fi);
        if (prev == null || at < prev) outMap.set(fi, at);
      }
      return false;
    });
    return outMap;
  }

  function pointInRing(obs, r, px, py, pz) {
    if (px * r.cx + py * r.cy + pz * r.cz < r.cosRadius) return 0;
    var qx = -r.cx, qy = -r.cy, qz = -r.cz;
    var nx = py * qz - pz * qy, ny = pz * qx - px * qz, nz = px * qy - py * qx;
    var nl = Math.hypot(nx, ny, nz);
    if (nl < 1e-15) {
      qx = -r.cy; qy = r.cx; qz = 0;
      if (Math.hypot(qx, qy) < 1e-9) { qx = 1; qy = 0; qz = 0; }
      nx = py * qz - pz * qy; ny = pz * qx - px * qz; nz = px * qy - py * qx;
      nl = Math.hypot(nx, ny, nz);
      var l = Math.hypot(qx, qy, qz); qx = -qx / l; qy = -qy / l; qz = -qz / l;
      nx = -nx; ny = -ny; nz = -nz;
    }
    nx /= nl; ny /= nl; nz /= nl;
    var crossings = 0;
    var X = obs.X, Y = obs.Y, Z = obs.Z;
    for (var e = r.start; e < r.end; e++) {
      if (angleXYZ(px, py, pz, X[e], Y[e], Z[e]) < SAME_POINT) return -1;
      var rel = edgeCrossesLine(obs, px, py, pz, qx, qy, qz, nx, ny, nz, e);
      if (rel === -1) return -1;
      if (rel === 1) crossings++;
    }
    return crossings & 1;
  }

  function featuresContaining(obs, p) {
    var out = [];
    var px = p[0], py = p[1], pz = p[2];
    for (var pi = 0; pi < obs.polygons.length; pi++) {
      var poly = obs.polygons[pi];
      var ext = obs.rings[poly.exterior];
      var inExt = pointInRing(obs, ext, px, py, pz);
      if (poly.inverted ? inExt !== 0 : inExt !== 1) continue;
      var inHole = false;
      for (var h = 0; h < poly.holes.length; h++) {
        if (pointInRing(obs, obs.rings[poly.holes[h]], px, py, pz) === 1) { inHole = true; break; }
      }
      if (!inHole && out.indexOf(poly.feature) < 0) out.push(poly.feature);
    }
    return out;
  }

  var BUFFER_STEP_KM = 100, BUFFER_DISC_SIDES = 24;
  function bufferRings(coords, km) {
    if (!(km > 0)) return [];
    var V = [];
    for (var i = 0; i < coords.length; i++) {
      var v = toVec(coords[i][0], coords[i][1]);
      if (V.length && angleBetween(V[V.length - 1], v) < SAME_POINT) continue;
      V.push(v);
    }
    if (V.length > 1 && angleBetween(V[0], V[V.length - 1]) < SAME_POINT) V.pop();
    if (V.length < 2) return [];
    var rho = (km + 0.5) / EARTH_RADIUS_KM;
    var rDisc = (km + 1) / EARTH_RADIUS_KM / Math.cos(Math.PI / BUFFER_DISC_SIDES);
    var out = [];
    var emit = function (vecs) {
      if (sphericalSignedArea(vecs) > 0) vecs.reverse();
      var ring = vecs.map(toLonLat);
      ring.push(ring[0].slice());
      out.push(ring);
    };
    for (var k = 0; k < V.length; k++) {
      var c = V[k];
      var ref = Math.abs(c[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
      var e1 = normalize(cross(c, ref)), e2 = cross(c, e1);
      var disc = [];
      for (var t = 0; t < BUFFER_DISC_SIDES; t++) {
        var th = (2 * Math.PI * t) / BUFFER_DISC_SIDES, ct = Math.cos(th), st = Math.sin(th);
        var cr = Math.cos(rDisc), sr = Math.sin(rDisc);
        disc.push([cr * c[0] + sr * (ct * e1[0] + st * e2[0]), cr * c[1] + sr * (ct * e1[1] + st * e2[1]), cr * c[2] + sr * (ct * e1[2] + st * e2[2])]);
      }
      emit(disc);
      var a = c, b = V[(k + 1) % V.length];
      var L = angleBetween(a, b);
      if (L < SAME_POINT) continue;
      var n = normalize(cross(a, b));
      var segs = Math.max(1, Math.ceil((L * EARTH_RADIUS_KM) / BUFFER_STEP_KM));
      var left = [], right = [];
      for (var j = 0; j <= segs; j++) {
        var q = sampleAt(a, b, L, j / segs);
        var cr2 = Math.cos(rho), sr2 = Math.sin(rho);
        left.push([cr2 * q[0] + sr2 * n[0], cr2 * q[1] + sr2 * n[1], cr2 * q[2] + sr2 * n[2]]);
        right.push([cr2 * q[0] - sr2 * n[0], cr2 * q[1] - sr2 * n[1], cr2 * q[2] - sr2 * n[2]]);
      }
      emit(left.concat(right.reverse()));
    }
    return out;
  }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function sampleAt(a, b, L, t) {
    if (t <= 0) return a.slice();
    if (t >= 1) return b.slice();
    var s = Math.sin(L), p = Math.sin((1 - t) * L) / s, q = Math.sin(t * L) / s;
    return normalize([p * a[0] + q * b[0], p * a[1] + q * b[1], p * a[2] + q * b[2]]);
  }

  function startSearch(obs, a, b) {
    var insideA = featuresContaining(obs, a), insideB = featuresContaining(obs, b);
    if (insideA.length || insideB.length) {
      return { status: "inside", insideA: insideA, insideB: insideB, expanded: 0 };
    }
    var direct = angleBetween(a, b);
    if (direct < SAME_POINT) return { status: "done", waypoints: [a, b], corners: [], length: 0, direct: direct, expanded: 0 };
    if (Math.PI - direct < 1e-9) {
      var up = Math.abs(a[2]) < 0.999 ? [0, 0, 1] : [1, 0, 0];
      var e1 = normalize([a[1] * up[2] - a[2] * up[1], a[2] * up[0] - a[0] * up[2], a[0] * up[1] - a[1] * up[0]]);
      var e2 = normalize([e1[1] * a[2] - e1[2] * a[1], e1[2] * a[0] - e1[0] * a[2], e1[0] * a[1] - e1[1] * a[0]]);
      for (var k = 0; k < 72; k++) {
        var ang = k * Math.PI / 36;
        var mid = [Math.cos(ang) * e2[0] + Math.sin(ang) * e1[0], Math.cos(ang) * e2[1] + Math.sin(ang) * e1[1], Math.cos(ang) * e2[2] + Math.sin(ang) * e1[2]];
        if (arcIsFree(obs, a, mid, -1, -1) && arcIsFree(obs, mid, b, -1, -1)) {
          return { status: "done", waypoints: [a, mid, b], corners: [], length: Math.PI, direct: direct, expanded: 0, antipodal: true };
        }
      }
      var b2 = normalize([b[0] + 1e-7 * e1[0], b[1] + 1e-7 * e1[1], b[2] + 1e-7 * e1[2]]);
      var nudged = startSearch(obs, a, b2);
      nudged.antipodal = true;
      nudged.trueB = b;
      if (nudged.status === "done") nudged.waypoints[nudged.waypoints.length - 1] = b;
      return nudged;
    }
    if (arcIsFree(obs, a, b, -1, -1)) {
      return { status: "done", waypoints: [a, b], corners: [], length: direct, direct: direct, expanded: 0 };
    }
    var C = obs.corners, K = C.count + 2;
    var h = new Float64Array(K), cosH = new Float64Array(K), sinH = new Float64Array(K);
    var fromStart = new Float64Array(K);
    for (var i = 0; i < C.count; i++) {
      h[i + 2] = angleXYZ(C.X[i], C.Y[i], C.Z[i], b[0], b[1], b[2]);
      fromStart[i + 2] = angleXYZ(C.X[i], C.Y[i], C.Z[i], a[0], a[1], a[2]);
    }
    h[0] = direct; h[1] = 0; fromStart[0] = 0; fromStart[1] = direct;
    for (i = 0; i < K; i++) { cosH[i] = Math.cos(h[i]); sinH[i] = Math.sin(h[i]); }
    var state = {
      status: "running", obs: obs, a: a, b: b, direct: direct, K: K,
      h: h, cosH: cosH, sinH: sinH, fromStart: fromStart,
      g: null, parent: null, closed: null, heapF: null, heapI: null, heapN: 0,
      stages: [1.1, 1.3, 1.8, 3, Infinity], stage: -1, active: null,
      best: null,
      expanded: 0, relaxed: 0, tested: 0
    };
    nextStage(state);
    return state;
  }

  function nextStage(s) {
    var K = s.K, D = s.direct, limit;
    if (s.best) {
      limit = s.best.length;
    } else {
      var total = K - 2;
      for (;;) {
        s.stage++;
        var ratio = s.stages[s.stage];
        limit = ratio * D;
        if (ratio === Infinity) break;
        var inside = 0;
        for (var j = 2; j < K; j++) if (s.fromStart[j] + s.h[j] <= limit) inside++;
        if (inside < 0.6 * total) break;
        limit = Infinity; s.stage = s.stages.length - 1; break;
      }
    }
    var act = [1];
    for (var i = 2; i < K; i++) if (s.fromStart[i] + s.h[i] <= limit) act.push(i);
    s.active = Int32Array.from(act);
    s.limit = limit;
    s.g = new Float64Array(K).fill(Infinity);
    s.parent = new Int32Array(K).fill(-1);
    s.closed = new Uint8Array(K);
    s.heapF = new Float64Array(1024); s.heapI = new Int32Array(1024); s.heapN = 0;
    s.g[0] = 0;
    s.upper = s.best ? s.best.length : Infinity;
    s.rounds = (s.rounds || 0) + 1;
    heapPush(s, s.h[0], 0);
  }

  function stageDone(s, reached) {
    if (reached) {
      var chain = [], i = 1;
      while (i !== -1) { chain.push(i); i = s.parent[i]; }
      chain.reverse();
      var route = { length: s.g[1], chain: chain };
      if (!s.best || route.length < s.best.length) s.best = route;
    }
    if (s.best && s.best.length <= s.limit) { finish(s); return; }
    if (s.limit === Infinity) { s.status = "none"; delete s.heapF; delete s.heapI; return; }
    nextStage(s);
  }

  function heapPush(s, f, i) {
    if (s.heapN === s.heapF.length) {
      var F = new Float64Array(s.heapN * 2), I = new Int32Array(s.heapN * 2);
      F.set(s.heapF); I.set(s.heapI); s.heapF = F; s.heapI = I;
    }
    var F2 = s.heapF, I2 = s.heapI, k = s.heapN++;
    while (k > 0) {
      var p = (k - 1) >> 1;
      if (F2[p] <= f) break;
      F2[k] = F2[p]; I2[k] = I2[p]; k = p;
    }
    F2[k] = f; I2[k] = i;
  }

  function heapPop(s) {
    var F = s.heapF, I = s.heapI, top = I[0], n = --s.heapN;
    if (n > 0) {
      var f = F[n], i = I[n], k = 0;
      while (true) {
        var l = 2 * k + 1, r = l + 1, m = k, mf = f;
        if (l < n && F[l] < mf) { m = l; mf = F[l]; }
        if (r < n && F[r] < mf) { m = r; mf = F[r]; }
        if (m === k) break;
        F[k] = F[m]; I[k] = I[m]; k = m;
      }
      F[k] = f; I[k] = i;
    }
    return top;
  }

  function nodeVec(s, i) {
    if (i === 0) return s.a;
    if (i === 1) return s.b;
    var C = s.obs.corners, k = i - 2;
    return [C.X[k], C.Y[k], C.Z[k]];
  }

  function stepSearch(s, maxMs, now) {
    if (s.status !== "running") return s;
    now = now || (typeof performance !== "undefined" && performance.now ? function () { return performance.now(); } : Date.now);
    var t0 = now();
    var obs = s.obs, C = obs.corners, X = obs.X, Y = obs.Y, Z = obs.Z;
    var g = s.g, h = s.h, cosH = s.cosH, sinH = s.sinH, parent = s.parent, closed = s.closed;
    var CX = C.X, CY = C.Y, CZ = C.Z, wStart = C.wStart, wCount = C.wCount, wPrev = C.wPrev, wNext = C.wNext;
    var bx = s.b[0], by = s.b[1], bz = s.b[2];
    var ON2 = ON_CIRCLE * ON_CIRCLE;

    for (;;) {
      if (s.heapN === 0) {
        stageDone(s, false);
        if (s.status !== "running") return s;
        g = s.g; parent = s.parent; closed = s.closed;
        continue;
      }
      var u = heapPop(s);
      if (closed[u]) continue;
      closed[u] = 1;
      if (u === 1) {
        stageDone(s, true);
        if (s.status !== "running") return s;
        g = s.g; parent = s.parent; closed = s.closed;
        continue;
      }
      s.expanded++;

      var uv = nodeVec(s, u);
      var ux = uv[0], uy = uv[1], uz = uv[2];
      var cornerU = u >= 2 ? u - 2 : -1;
      var uw0 = cornerU >= 0 ? wStart[cornerU] : 0, uwN = cornerU >= 0 ? wCount[cornerU] : 0;
      var gu = g[u];

      var upper = g[1] < s.upper ? g[1] : s.upper;
      var bound = upper < Infinity, K = upper - gu, cosK = Math.cos(K), sinK = Math.sin(K);
      if (bound && K <= 0) continue;

      var active = s.active, nActive = active.length;
      for (var ai = 0; ai < nActive; ai++) {
        var v = active[ai];
        if (v === u || closed[v]) continue;
        var vx, vy, vz, cornerV = -1;
        if (v === 1) { vx = bx; vy = by; vz = bz; }
        else { cornerV = v - 2; vx = CX[cornerV]; vy = CY[cornerV]; vz = CZ[cornerV]; }
        var duv = ux * vx + uy * vy + uz * vz;
        if (bound) {
          var rem = K - h[v];
          if (rem <= 0) continue;
          if (rem < Math.PI && duv <= cosK * cosH[v] + sinK * sinH[v]) continue;
        }

        var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        var nl2 = nx * nx + ny * ny + nz * nz;
        if (nl2 < 1e-24) continue;
        var eps2 = ON2 * nl2;

        var ok = true, w, p, q, sp, sq;
        for (w = 0; w < uwN; w++) {
          p = wPrev[uw0 + w]; q = wNext[uw0 + w];
          sp = X[p] * nx + Y[p] * ny + Z[p] * nz;
          sq = X[q] * nx + Y[q] * ny + Z[q] * nz;
          if (((sp > 0 && sq < 0) || (sp < 0 && sq > 0)) && sp * sp > eps2 && sq * sq > eps2) { ok = false; break; }
        }
        if (!ok) continue;
        if (cornerV >= 0) {
          var vw0 = wStart[cornerV], vwN = wCount[cornerV];
          for (w = 0; w < vwN; w++) {
            p = wPrev[vw0 + w]; q = wNext[vw0 + w];
            sp = X[p] * nx + Y[p] * ny + Z[p] * nz;
            sq = X[q] * nx + Y[q] * ny + Z[q] * nz;
            if (((sp > 0 && sq < 0) || (sp < 0 && sq > 0)) && sp * sp > eps2 && sq * sq > eps2) { ok = false; break; }
          }
          if (!ok) continue;
        }

        var nl = Math.sqrt(nl2);
        var d = Math.atan2(nl, duv);
        var tentative = gu + d;
        if (tentative >= g[v]) continue;
        if (bound && tentative + h[v] >= upper) continue;
        s.tested++;
        if (arcBlocked(obs, ux, uy, uz, vx, vy, vz, nx / nl, ny / nl, nz / nl, cornerU, cornerV)) continue;
        g[v] = tentative; parent[v] = u; s.relaxed++;
        heapPush(s, tentative + h[v], v);
      }

      if (maxMs != null && (s.expanded & 3) === 0 && now() - t0 > maxMs) return s;
    }
  }

  function finish(s) {
    var chain = s.best.chain;
    s.waypoints = chain.map(function (k) { return nodeVec(s, k); });
    if (s.trueB) s.waypoints[s.waypoints.length - 1] = s.trueB;
    s.corners = chain.slice(1, -1).map(function (k) { return k - 2; });
    s.length = s.best.length;
    s.status = "done";
    delete s.heapF; delete s.heapI;
  }

  function findRoute(obs, a, b) {
    var s = startSearch(obs, a, b);
    if (s.status === "running") stepSearch(s, null);
    return s;
  }

  return {
    EARTH_RADIUS_KM: EARTH_RADIUS_KM,
    bufferRings: bufferRings,
    toVec: toVec, toLonLat: toLonLat, angleBetween: angleBetween, normalize: normalize,
    sampleArc: sampleArc, sphereDistanceKm: sphereDistanceKm, ellipsoidDistanceKm: ellipsoidDistanceKm,
    sphericalSignedArea: sphericalSignedArea,
    buildObstacles: buildObstacles, arcIsFree: arcIsFree, featuresCrossedByArc: featuresCrossedByArc,
    pointInRing: pointInRing, featuresContaining: featuresContaining,
    startSearch: startSearch, stepSearch: stepSearch, findRoute: findRoute,
    _edgeRelation: edgeRelation, _enters: enters
  };
});
