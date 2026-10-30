// North America's colonies from 1564 to 1821, for the dated maps: British America colony by colony (one colour, the colonies inside it parted by
// fine broken lines), New Netherland and New Sweden until they were taken, New France, Acadia, and Louisiana, and the Spanish borderlands (Florida,
// New Mexico, Texas, and California). The extents follow the atlas convention Noah chose on 29 October 2026 (MAPMAKING.md): the British colonies run
// from the coast to the Appalachian divide (the line of the Proclamation of 1763); New France and Louisiana cover the lands they settled and
// garrisoned along the St. Lawrence, the Great Lakes, and the Mississippi; the Spanish provinces start at their founding; and the Native nations
// keep the rest. Every year is the state of things on 1 July, as elsewhere in the builder. Lines drawn by hand (precision 1) are dotted on the map.

export const COLONIES_FROM = 1564, COLONIES_TO = 1821, CANADA_MASK_TO = 1783;
// Native nations the sources draw as states, which keep their land outside the colonies.
export const NATIVE_KEEP = new Set(["Haudenosaunee", "Iroquois", "Comanche"]);
export const BRITISH_AMERICA = "British America";

// The Appalachian divide between the Atlantic and the Gulf of Mexico (the Eastern Continental Divide), north to south, from Potter County,
// Pennsylvania, along the Allegheny Front, the Virginia–West Virginia line, and the Blue Ridge, through Atlanta, to the Florida line: the inland
// limit of the British colonies, and the line the Proclamation of 7 October 1763 drew along "the heads or sources of any of the rivers which fall
// into the Atlantic".
const DIVIDE_EAST = [[-77.9, 42.05], [-77.83, 41.85], [-78.15, 41.4], [-78.45, 40.8], [-78.5, 40.45], [-78.75, 40.2], [-78.95, 39.95], [-79.05, 39.72],
  [-79.25, 39.45], [-79.48, 39.2], [-79.65, 38.9], [-79.75, 38.6], [-79.95, 38.3], [-80.25, 37.95], [-80.45, 37.55], [-80.45, 37.3], [-80.4, 37.15],
  [-80.35, 36.95], [-80.65, 36.67], [-80.95, 36.5], [-81.3, 36.3], [-81.68, 36.13], [-81.95, 35.95], [-82.28, 35.63], [-82.45, 35.35], [-82.75, 35.15],
  [-83.15, 35.05], [-83.55, 34.95], [-83.8, 34.75], [-83.95, 34.4], [-84.15, 34.05], [-84.4, 33.75], [-84.35, 33.35], [-84.15, 32.9], [-84.0, 32.4],
  [-83.75, 31.9], [-83.45, 31.4], [-83.2, 30.9], [-82.9, 30.62], [-82.9, 30.0]];
// The western edge of the Province of New York: the Unadilla River and Wood Creek, the line of the Treaty of Fort Stanwix (1768), on to the St. Lawrence;
// west of it was Haudenosaunee land.
const NY_WEST = [[-75.3, 45.1], [-75.45, 44.2], [-75.45, 43.25], [-75.4, 42.4], [-75.6, 42.0]];
// The Hudson valley of New Netherland: the Catskills and the Helderbergs to the west of the river, from the Delaware to Schenectady.
const NN_WEST = [[-74.15, 42.95], [-74.25, 42.5], [-74.4, 41.95], [-74.75, 41.4], [-75.2, 41.0]];
// The line between East and West Jersey (the Lawrence line of 1743, on the Quintipartite Deed's line of 1676), from the Delaware to Little Egg Harbor.
const JERSEY_LINE = [[-75.0, 41.36], [-74.33, 39.56]];
// Pennsylvania's lands west of the purchase line of the Treaty of Fort Stanwix (1768): from the New York line down the Susquehanna's West Branch to
// Kittanning, and the Allegheny and the Ohio.
const PA_1768 = [[-77.0, 42.1], [-77.0, 42.0], [-77.2, 41.45], [-78.0, 41.15], [-78.9, 40.95], [-79.52, 40.82], [-79.85, 40.55], [-80.0, 40.44], [-80.3, 40.6], [-80.6, 40.64]];
// The Altamaha and its southern headstream, the Ocmulgee, west to east: Georgia's southern line in its charter of 1732, until 1763.
const ALTAMAHA = [[-84.05, 33.75], [-83.85, 33.32], [-83.63, 32.84], [-83.47, 32.28], [-83.3, 31.99], [-82.98, 31.81], [-82.55, 31.93], [-82.1, 31.75], [-81.65, 31.55], [-81.25, 31.32], [-80.5, 31.3]];
// The Kennebec and the Penobscot, north to south.
const KENNEBEC = [[-69.95, 47.5], [-70.0, 45.6], [-69.75, 44.6], [-69.8, 43.75], [-69.8, 43.0]];
const PENOBSCOT = [[-69.2, 47.5], [-69.0, 45.9], [-68.7, 45.0], [-68.78, 44.75], [-68.85, 44.3], [-68.85, 43.5]];
// Plymouth Colony: the south shore from Scituate, Bristol County, Cape Cod, and the islands it held on Narragansett Bay's east side.
const PLYMOUTH = [[-70.82, 42.3], [-71.0, 42.18], [-71.35, 42.02], [-71.38, 41.73], [-71.27, 41.65], [-71.2, 41.45], [-69.8, 41.2], [-69.8, 42.3]];
// New Haven Colony: the coast from Greenwich and Stamford to Guilford.
const NEW_HAVEN = [[-73.75, 40.95], [-73.7, 41.15], [-73.1, 41.42], [-72.85, 41.47], [-72.62, 41.37], [-72.62, 41.15], [-73.75, 40.95]];
const SAYBROOK = [[-72.48, 41.2], [-72.5, 41.42], [-72.28, 41.42], [-72.25, 41.2], [-72.48, 41.2]];
// New Sweden: both banks of the lower Delaware, from Cape Henlopen to the falls at Trenton.
const NEW_SWEDEN_PA = [[-75.85, 39.72], [-75.65, 40.02], [-75.2, 40.12], [-74.85, 40.27], [-74.65, 40.15], [-75.4, 39.7], [-75.85, 39.72]];
const NEW_SWEDEN_NJ = [[-75.65, 39.42], [-75.35, 39.88], [-75.05, 39.97], [-75.1, 39.72], [-75.45, 39.25], [-75.65, 39.42]];
// The settled valley of the St. Lawrence: the river's north shore some 40 to 60 km inland, from the Ottawa's mouth to Tadoussac, then the river
// itself to the Gulf; south of it, the south shore and the Gaspé.
const LAURENTIDES = [[-75.2, 45.35], [-74.5, 45.65], [-73.7, 46.05], [-72.6, 46.6], [-71.6, 47.0], [-70.6, 47.45], [-69.6, 48.25], [-68.7, 48.75], [-67.0, 49.25], [-64.0, 49.4], [-61.0, 49.4]];
// Spanish Texas: the Nueces (its line with Coahuila and Nuevo Santander) from Corpus Christi Bay, and a line from the Edwards Plateau to the Red River
// past the missions and presidios, the edge of the Comanche and Wichita lands.
const TEXAS = [[-97.3, 27.75], [-97.9, 28.05], [-98.5, 28.4], [-99.3, 28.75], [-100.1, 29.3], [-100.0, 29.9], [-99.0, 30.9], [-97.5, 31.9], [-95.8, 32.6],
  [-93.5, 33.1], [-93.5, 29.0], [-96.0, 27.5], [-97.3, 27.75]];
// Alta California: the coast and the Coast Ranges from San Diego to the Golden Gate, the edge of the missions' lands.
const CALIFORNIA = [[-116.8, 32.5], [-116.85, 33.3], [-117.2, 34.0], [-118.0, 34.45], [-119.0, 34.75], [-119.8, 35.3], [-120.3, 35.9], [-120.9, 36.5],
  [-121.3, 37.0], [-121.6, 37.6], [-122.0, 38.05], [-123.5, 38.05], [-123.5, 32.0], [-116.8, 32.0], [-116.8, 32.5]];
// Newfoundland's English Shore (the Avalon Peninsula and Conception, Trinity, and Bonavista Bays) and French Plaisance (Placentia Bay and the Burin Peninsula).
const ENGLISH_SHORE = [[-54.2, 46.5], [-54.2, 49.0], [-52.4, 49.0], [-52.4, 46.5], [-54.2, 46.5]];
const PLAISANCE = [[-55.95, 46.55], [-55.95, 47.75], [-53.9, 47.75], [-53.82, 47.0], [-54.6, 46.55], [-55.95, 46.55]];

const ENGLAND = [[1648, "Kingdom of England"], [1659, "Commonwealth of England"], [1706, "Kingdom of England"], [1800, "Kingdom of Great Britain"]];
const FRANCE = [[1791, "Kingdom of France"], [1795, "French First Republic"], [1799, "French Directory"], [1804, "French Consulate"]];
const CROWNS = { eng: ENGLAND, fra: FRANCE, spa: [[1885, "Kingdom of Spain"]], nl: [[1794, "Dutch Republic"]], swe: [[1720, "Swedish Empire"]] };

export function buildColonies(env) {
  const { neAll, clip, tryClip, rewind, polysOf, subtract, km2Of, turfBuf, rivers } = env;
  const U = (...sets) => { const all = sets.filter((s) => s && s.length); return all.length <= 1 ? all[0] || [] : rewind(tryClip(clip.union, ...all) || all.flat()); };
  const I = (a, b) => (a.length && b.length ? rewind(tryClip(clip.intersection, a, b) || []) : []);
  const D = (a, ...b) => subtract(a, b.filter((x) => x && x.length));
  const ring = (pts) => { const r = pts.slice(); if (r[0][0] !== r[r.length - 1][0] || r[0][1] !== r[r.length - 1][1]) r.push(r[0]); return rewind(tryClip(clip.union, [[r]]) || [[r]]); };
  const eastOf = (line) => ring([[line[0][0], 80], ...line, [line[line.length - 1][0], 0], [-20, 0], [-20, 80]]);
  const westOf = (line) => ring([[line[0][0], 80], ...line, [line[line.length - 1][0], 0], [-179, 0], [-179, 80]]);
  const northOf = (line) => ring([[-179, line[0][1]], ...line, [-20, line[line.length - 1][1]], [-20, 85], [-179, 85]]);
  const box = (w, s, e, n) => ring([[w, s], [e, s], [e, n], [w, n]]);
  const south = (lat) => box(-179, 0, -20, lat), north = (lat) => box(-179, lat, -20, 85), east = (lon) => box(lon, 0, -20, 85), west = (lon) => box(-179, 0, lon, 85);
  const feat = (code) => { const f = neAll.find((x) => x.properties.iso_3166_2 === code); if (!f) throw new Error("colonies: Natural Earth has no " + code); return rewind(polysOf(f.geometry)); };
  const st = (c) => feat("US-" + c), pv = (c) => feat("CA-" + c);
  const centre = (p) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const q of p[0]) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); } return [(x0 + x1) / 2, (y0 + y1) / 2]; };
  // A river as one line from the end nearest `from`, its pieces joined end to end across gaps of up to 0.5°.
  const river = (name, bb, from) => {
    const segs = [];
    for (const f of rivers) {
      if ((f.properties.name || "") !== name || !f.geometry) continue;
      for (const line of f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates) if (line.every((p) => p[0] >= bb[0] && p[0] <= bb[2] && p[1] >= bb[1] && p[1] <= bb[3])) segs.push(line);
    }
    if (!segs.length) throw new Error("colonies: Natural Earth has no " + name);
    const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    let best = 0, rev = false, dist = Infinity;
    segs.forEach((s, i) => { if (d(s[0], from) < dist) { dist = d(s[0], from); best = i; rev = false; } if (d(s[s.length - 1], from) < dist) { dist = d(s[s.length - 1], from); best = i; rev = true; } });
    let line = rev ? segs[best].slice().reverse() : segs[best].slice();
    segs.splice(best, 1);
    for (;;) {
      const end = line[line.length - 1];
      let k = -1, r = false, g = 0.5;
      segs.forEach((s, i) => { if (d(s[0], end) < g) { g = d(s[0], end); k = i; r = false; } if (d(s[s.length - 1], end) < g) { g = d(s[s.length - 1], end); k = i; r = true; } });
      if (k < 0) break;
      line = line.concat(r ? segs[k].slice().reverse() : segs[k]);
      segs.splice(k, 1);
    }
    return line;
  };
  const along = (line, km) => { const thin = line.filter((p, i) => i % 4 === 0 || i === line.length - 1); return rewind(polysOf(turfBuf({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: thin } }, km, { units: "kilometers", steps: 6 }).geometry)); };

  // The land of the states and provinces.
  const [VA, WV, MD, DE, PA, NJ, NY, CT, RI, MA, NH, VT, ME, NC, SC, GA, FL, AL, MS, LA, TX, NM, AZ, CA] =
    ["VA", "WV", "MD", "DE", "PA", "NJ", "NY", "CT", "RI", "MA", "NH", "VT", "ME", "NC", "SC", "GA", "FL", "AL", "MS", "LA", "TX", "NM", "AZ", "CA"].map(st);
  const [OH, IN, IL, MI, WI, MN] = ["OH", "IN", "IL", "MI", "WI", "MN"].map(st);
  const [NS, NB, PE, QC, ON, NL] = ["NS", "NB", "PE", "QC", "ON", "NL"].map(pv);
  const usa = neAll.filter((f) => f.properties.adm0_a3 === "USA" && !/^US-(HI|AK)$/.test(f.properties.iso_3166_2));
  const usLand = U(...usa.map((f) => rewind(polysOf(f.geometry))));
  const canLand = U(NS, NB, PE, QC, ON, NL);
  const NFI = NL.filter((p) => { const c = centre(p); return !(c[1] > 51.7 && c[0] < -55.7); });
  const CB = NS.filter((p) => { const c = centre(p); return c[0] > -61.6 && c[0] < -59.6 && c[1] > 45.5 && c[1] < 47.1; }), NSm = NS.filter((p) => !CB.includes(p));

  const mississippi = river("Mississippi", [-96, 28, -88, 48], [-95.21, 47.24]);
  const lowerMiss = mississippi.filter((p) => p[1] <= 39.05);
  const eastMiss = ring([[-95.21, 50], ...mississippi, [-89, 20], [-60, 20], [-60, 50]]), westMiss = ring([[-95.21, 50], ...mississippi, [-89, 20], [-130, 20], [-130, 50]]);
  const rioGrande = river("Rio Grande", [-108, 25, -97, 38], [-107.5, 37.8]).filter((p) => p[1] >= 31.55 && p[1] <= 36.6 && p[0] <= -105.2);

  const S = {};
  const atlantic = (polys) => I(polys, eastOf(DIVIDE_EAST));
  S.virginia = atlantic(U(VA, WV));
  S.maryland = atlantic(MD);
  S.northCarolina = atlantic(NC);
  S.southCarolina = atlantic(SC);
  S.georgia = atlantic(GA);
  S.georgia1733 = I(S.georgia, northOf(ALTAMAHA));
  S.debatable = D(S.georgia, S.georgia1733);
  S.pennsylvania = atlantic(PA);
  S.pa1768 = D(PA, ring([...PA_1768, [-81, 40.64], [-81, 42.6], [-77.0, 42.6]]));
  S.newSwedenPA = I(PA, ring(NEW_SWEDEN_PA));
  S.newSwedenNJ = I(NJ, ring(NEW_SWEDEN_NJ));
  S.newSweden = U(DE, S.newSwedenPA, S.newSwedenNJ);
  S.newYork = I(NY, eastOf(NY_WEST));
  S.hudson = I(NY, I(eastOf(NN_WEST), south(42.95)));
  S.eastJersey = I(NJ, eastOf(JERSEY_LINE)); S.westJersey = D(NJ, S.eastJersey);
  S.plymouthMA = I(MA, ring(PLYMOUTH)); S.plymouthRI = I(RI, ring(PLYMOUTH)); S.plymouth = U(S.plymouthMA, S.plymouthRI);
  S.bay = D(MA, S.plymouthMA);
  S.rhodeIsland = D(RI, S.plymouthRI);
  S.newHaven = I(CT, ring(NEW_HAVEN)); S.saybrook = I(CT, ring(SAYBROOK));
  S.mainWest = I(ME, westOf(KENNEBEC)); S.maineMid = I(ME, westOf(PENOBSCOT)); S.maineEast = D(ME, S.maineMid);
  // Acadia: the peninsula, Cape Breton, the mainland north of the Bay of Fundy, the island of Saint-Jean, and Maine east of the Penobscot.
  S.acadia = U(NS, NB, PE, S.maineEast);
  S.englishShore = I(NFI, ring(ENGLISH_SHORE)); S.plaisance = I(NFI, ring(PLAISANCE));
  // New France on the St. Lawrence, growing west with Trois-Rivières (1634) and Montreal (1642), and the Great Lakes posts of the Pays d'en Haut
  // from Detroit's founding (1701): southern Ontario, Michigan, eastern Wisconsin, and the Wabash and Maumee country of Indiana and Ohio.
  S.laurentian = I(QC, ring([...LAURENTIDES, [-61.0, 44.0], [-75.2, 44.0]]));
  S.quebec1608 = I(S.laurentian, east(-71.6)); S.quebec1634 = I(S.laurentian, east(-72.8));
  S.paysDenHaut = U(I(ON, south(46.4)), MI, I(WI, east(-89.6)), I(IN, north(40.3)), I(OH, I(north(41.0), west(-83.4))));
  S.ohioCountry = D(U(OH, D(PA, S.pennsylvania), D(I(WV, north(38.2)), S.virginia)), S.paysDenHaut);
  // Louisiana: the Gulf coast from the Pearl to the Perdido, the land of the state of Louisiana, and both banks of the Mississippi up to the Illinois.
  const corridor = I(along(lowerMiss, 45), usLand);
  S.gulfCoast = I(U(MS, AL), south(31.0));
  S.biloxi = I(MS, south(30.6));
  const isleOfOrleans = I(I(LA, eastMiss), ring([[-91.3, 30.36], [-90.85, 30.3], [-90.45, 30.22], [-90.1, 30.18], [-89.75, 30.17], [-89.5, 30.15], [-88.9, 30.1], [-88.9, 28.5], [-91.3, 28.5]]));
  S.floridaParishes = D(I(LA, eastMiss), isleOfOrleans);
  S.louisiana = U(LA, S.gulfCoast, corridor);
  S.spanishLouisiana = U(D(LA, S.floridaParishes), I(corridor, westMiss));
  // Florida: the peninsula, Guale on the Georgia coast and Santa Elena (1566–1587), Apalachee (from 1633), and Pensacola (from 1699).
  const aucilla = east(-83.9), apalachicola = eastOf([[-84.86, 31.5], [-84.86, 30.71], [-85.0, 30.2], [-85.0, 29.0]]);
  S.guale = I(GA, east(-81.65)); S.santaElena = I(SC, I(south(32.55), east(-81.0)));
  S.floridaPeninsula = I(FL, aucilla); S.floridaEast = I(FL, apalachicola); S.floridaWest = D(FL, S.floridaEast);
  S.pensacola = I(FL, west(-86.9));
  S.westFlorida = (lat) => U(S.floridaWest, I(U(AL, MS), south(lat)), S.floridaParishes);
  // New Mexico along the Rio Grande from El Paso to Taos; Texas between the Nueces and the Sabine; the Nueces strip and the Rio Grande below
  // Laredo; Pimería Alta; and Alta California.
  S.newMexico = I(along(rioGrande, 60), U(NM, TX)); S.elPaso = I(S.newMexico, south(32.3));
  S.texas = I(TX, ring(TEXAS)); S.eastTexas = I(S.texas, I(east(-95.6), north(30.8)));
  S.nueces = D(I(TX, south(29.9)), S.texas, S.newMexico);
  S.pimeria = I(AZ, I(south(32.3), east(-112.4)));
  S.california1769 = I(CA, I(ring(CALIFORNIA), south(36.8))); S.california1776 = I(CA, ring(CALIFORNIA));
  // The Quebec Act's lands north of the Ohio, east of the Mississippi, and west of Pennsylvania and New York (1774).
  S.northwest = U(OH, IN, IL, MI, WI, I(MN, eastMiss));

  // name, wiki, crown, member of British America, precision, stages [first, last, shape], and status if not a colony.
  const T = [];
  const add = (name, wiki, crown, ba, b, stages, extra = {}) => T.push({ name, wiki, crown, ba, b, stages, ...extra });
  // British America.
  add("Virginia", "Colony of Virginia", "eng", true, 1, [[1607, 1776, S.virginia]], { thirteen: true });
  add("Plymouth Colony", "Plymouth Colony", "eng", true, 1, [[1621, 1686, S.plymouth], [1689, 1691, S.plymouth]]);
  add("Massachusetts Bay Colony", "Massachusetts Bay Colony", "eng", true, 1, [[1629, 1640, S.bay], [1641, 1652, U(S.bay, NH)], [1653, 1679, U(S.bay, NH, S.mainWest)], [1680, 1685, U(S.bay, S.mainWest)], [1689, 1691, U(S.bay, NH, S.mainWest)]]);
  add("Province of Massachusetts Bay", "Province of Massachusetts Bay", "eng", true, 1, [[1692, 1746, U(MA, S.plymouthRI, S.maineMid)], [1747, 1759, U(MA, S.maineMid)], [1760, 1776, U(MA, ME)]], { thirteen: true });
  add("Province of Maine", "Province of Maine", "eng", true, 1, [[1640, 1652, S.mainWest]]);
  add("Province of New Hampshire", "Province of New Hampshire", "eng", true, 2, [[1623, 1640, NH], [1680, 1685, NH], [1692, 1748, NH], [1749, 1764, U(NH, VT)], [1765, 1776, NH]], { thirteen: true });
  add("Dominion of New England", "Dominion of New England", "eng", true, 1, [[1686, 1686, U(S.bay, NH, S.mainWest)], [1687, 1687, U(MA, NH, S.mainWest, RI)], [1688, 1688, U(MA, NH, S.mainWest, RI, CT)]]);
  add("Colony of Rhode Island and Providence Plantations", "Colony of Rhode Island and Providence Plantations", "eng", true, 2, [[1636, 1686, S.rhodeIsland], [1689, 1691, S.rhodeIsland], [1692, 1746, S.rhodeIsland], [1747, 1776, RI]], { thirteen: true });
  add("Saybrook Colony", "Saybrook Colony", "eng", true, 1, [[1636, 1644, S.saybrook]]);
  add("New Haven Colony", "New Haven Colony", "eng", true, 1, [[1638, 1664, S.newHaven]]);
  add("Connecticut Colony", "Connecticut Colony", "eng", true, 2, [[1636, 1637, D(CT, S.saybrook)], [1638, 1644, D(CT, S.saybrook, S.newHaven)], [1645, 1664, D(CT, S.newHaven)], [1665, 1687, CT], [1689, 1776, CT]], { thirteen: true });
  add("Province of Maryland", "Province of Maryland", "eng", true, 1, [[1634, 1776, S.maryland]], { thirteen: true });
  add("Province of New York", "Province of New York", "eng", true, 1, [[1665, 1673, U(S.newYork, DE, S.newSwedenPA)], [1675, 1680, U(S.newYork, DE, S.newSwedenPA)], [1681, 1682, U(S.newYork, DE)], [1683, 1764, S.newYork], [1765, 1776, U(S.newYork, VT)]], { thirteen: true });
  add("Province of New Jersey", "Province of New Jersey", "eng", true, 2, [[1665, 1673, NJ], [1675, 1675, NJ], [1702, 1776, NJ]], { thirteen: true });
  add("East Jersey", "Province of East Jersey", "eng", true, 1, [[1676, 1701, S.eastJersey]]);
  add("West Jersey", "Province of West Jersey", "eng", true, 1, [[1676, 1701, S.westJersey]]);
  add("Province of Pennsylvania", "Province of Pennsylvania", "eng", true, 1, [[1681, 1682, S.pennsylvania], [1683, 1703, U(S.pennsylvania, DE)], [1704, 1767, S.pennsylvania], [1768, 1776, S.pa1768]], { thirteen: true });
  add("Delaware Colony", "Delaware Colony", "eng", true, 2, [[1704, 1776, DE]], { thirteen: true });
  add("Province of Carolina", "Province of Carolina", "eng", true, 1, [[1663, 1711, U(S.northCarolina, S.southCarolina)]]);
  add("Province of North Carolina", "Province of North Carolina", "eng", true, 1, [[1712, 1776, S.northCarolina]], { thirteen: true });
  add("Province of South Carolina", "Province of South Carolina", "eng", true, 1, [[1712, 1776, S.southCarolina]], { thirteen: true });
  add("Province of Georgia", "Province of Georgia", "eng", true, 1, [[1733, 1763, S.georgia1733], [1764, 1776, S.georgia]], { thirteen: true });
  add("Nova Scotia", "Nova Scotia", "eng", true, 1, [[1655, 1670, U(NS, NB, S.maineEast)], [1711, 1758, NSm], [1759, 1759, U(NSm, CB, PE)], [1760, 1762, U(NSm, CB, PE, NB)]]);
  add("Cape Breton", "Cape Breton Island", "eng", true, 2, [[1745, 1749, CB]]);
  add("Newfoundland", "Newfoundland Colony", "eng", true, 1, [[1611, 1661, S.englishShore], [1662, 1712, D(S.englishShore, S.plaisance)], [1713, 1762, NFI]]);
  add("East Florida", "East Florida", "eng", true, 1, [[1763, 1783, S.floridaEast]]);
  add("West Florida", "West Florida", "eng", true, 1, [[1763, 1763, S.westFlorida(31.0)], [1764, 1779, S.westFlorida(32.47)], [1780, 1780, S.floridaWest]]);
  // The Northwest, south of the Great Lakes, was the Province of Quebec's under the Quebec Act; it joins the province's land drawn in `canada`.
  // The Dutch and the Swedes.
  add("New Netherland", "New Netherland", "nl", false, 1, [[1614, 1637, U(S.hudson, NJ)], [1638, 1654, U(S.hudson, D(NJ, S.newSwedenNJ))], [1655, 1664, U(S.hudson, NJ, S.newSweden)], [1674, 1674, U(S.newYork, NJ, DE, S.newSwedenPA)]]);
  add("New Sweden", "New Sweden", "swe", false, 1, [[1638, 1655, S.newSweden]]);
  // France.
  add("Acadia", "Acadia", "fra", false, 1, [[1605, 1654, S.acadia], [1671, 1710, S.acadia]]);
  add("Île Royale", "Île Royale (New France)", "fra", false, 2, [[1711, 1744, CB], [1750, 1758, CB]]);
  add("Île Saint-Jean", "Île Saint-Jean", "fra", false, 2, [[1711, 1758, PE]]);
  add("Plaisance", "Plaisance, Newfoundland", "fra", false, 1, [[1662, 1712, S.plaisance]]);
  add("New France", "Canada (New France)", "fra", false, 1, [[1609, 1629, S.quebec1608], [1633, 1634, S.quebec1608], [1635, 1641, S.quebec1634], [1642, 1701, S.laurentian], [1702, 1760, U(S.laurentian, S.paysDenHaut)]]);
  add("New France", "Canada (New France)", "eng", false, 1, [[1630, 1632, S.quebec1608]], { status: 4 });
  add("Province of Quebec", "Province of Quebec (1763–1791)", "eng", true, 1, [[1761, 1762, S.laurentian]], { status: 4 });
  add("Louisiana", "Louisiana (New France)", "fra", false, 1, [[1699, 1701, S.biloxi], [1702, 1717, S.gulfCoast], [1718, 1718, S.louisiana], [1719, 1722, U(S.louisiana, S.pensacola)], [1723, 1762, S.louisiana], [1801, 1803, S.spanishLouisiana]]);
  // Spain.
  add("Spanish Florida", "Spanish Florida", "spa", false, 1, [[1566, 1587, U(FL, S.guale, S.santaElena)], [1588, 1632, U(S.floridaPeninsula, S.guale)], [1633, 1683, U(S.floridaEast, S.guale)], [1684, 1698, S.floridaEast], [1699, 1718, FL], [1719, 1722, D(FL, S.pensacola)], [1723, 1762, FL]]);
  add("East Florida", "East Florida", "spa", false, 1, [[1784, 1820, S.floridaEast]]);
  add("West Florida", "West Florida", "spa", false, 1, [[1780, 1780, D(S.westFlorida(32.47), S.floridaWest)], [1781, 1783, S.westFlorida(32.47)], [1784, 1820, S.westFlorida(31.0)]]);
  add("Spanish Louisiana", "Louisiana (New Spain)", "spa", false, 1, [[1763, 1800, S.spanishLouisiana]]);
  add("Santa Fe de Nuevo México", "Santa Fe de Nuevo México", "spa", false, 1, [[1599, 1680, S.newMexico], [1681, 1693, S.elPaso], [1694, 1821, S.newMexico]]);
  add("Spanish Texas", "Spanish Texas", "spa", false, 1, [[1690, 1693, S.eastTexas], [1717, 1717, S.eastTexas], [1718, 1821, S.texas]]);
  add("Alta California", "Alta California", "spa", false, 1, [[1769, 1775, S.california1769], [1776, 1821, S.california1776]]);
  // Land two crowns claimed: Acadia's mainland and Maine east of the Penobscot between the Treaty of Utrecht and the fall of Quebec, and the Ohio
  // Country from the forts of 1753 and 1754 to Fort Duquesne's fall in November 1758.
  add("Disputed land", "", null, false, 1, [[1711, 1759, U(NB, S.maineEast)], [1754, 1758, S.ohioCountry]], { status: 6, claims: ["Kingdom of France", "Kingdom of Great Britain"] });
  // The United States from 1777 (independence was declared on 4 July 1776) to the Treaty of Paris, in the thirteen colonies' land, and the Vermont
  // Republic from January 1777, which the builder's `northAmerica` carries on from 1784 to 1790.
  const thirteen = U(...T.filter((t) => t.thirteen).map((t) => { const s = t.stages.find((g) => g[0] <= 1776 && 1776 <= g[1]); return s ? s[2] : []; }));
  add("United States", "United States", null, false, 1, [[1777, 1783, D(thirteen, VT)]], { status: 0 });
  add("Vermont Republic", "Vermont Republic", null, false, 2, [[1777, 1783, VT]], { status: 0 });

  // Each stage as a span, split where the crown's name changes.
  const spans = [];
  for (const t of T) for (const [first, last, polys] of t.stages) {
    if (!polys.length) throw new Error("colonies: " + t.name + " " + first + "–" + last + " has no land");
    const crown = t.crown ? CROWNS[t.crown] : [[9999, ""]];
    let a = first;
    for (let k = 0; k < crown.length && a <= last; k++) {
      const [end, ruler] = crown[k];
      if (end < a) continue;
      const b = Math.min(last, end);
      spans.push({ name: t.name, wiki: t.wiki, ruler, part: t.ba ? BRITISH_AMERICA : "", status: t.status ?? 1, b: t.b, first: a, last: b, polys, ...(t.claims ? { claims: t.claims.slice(), noLabel: true } : {}) });
      a = b + 1;
    }
  }
  // New Spain's frontier in today's United States, which joins the Spanish Empire's own span: the Nueces strip and the Rio Grande below Laredo
  // (Nuevo Santander, from 1749) and Pimería Alta (from Kino's missions, 1700).
  const frontier = [{ first: 1700, last: 1748, polys: S.pimeria }, { first: 1749, last: 1821, polys: U(S.pimeria, S.nueces) }];
  // The land whose colonies these spans replace: the United States south of Canada from 1564 to 1821, and Canada's provinces of the east until
  // 1783 (from 1763 `canada` draws them).
  // Each mask also comes in tiles of 3°, which cut more surely than the whole when a source shape is awkward to clip.
  const tiles = (polys, b) => { const out = []; for (let x = b[0]; x < b[2]; x += 3) for (let y = b[1]; y < b[3]; y += 3) { const t = I(polys, box(x, y, x + 3, y + 3)); if (t.length) out.push(t); } return out; };
  const masks = [{ first: COLONIES_FROM, last: COLONIES_TO, polys: usLand, tiles: tiles(usLand, [-125, 24, -66, 50]) }, { first: 1600, last: CANADA_MASK_TO, polys: canLand, tiles: tiles(canLand, [-96, 41, -52, 63]) }];
  const sized = Object.fromEntries(Object.entries(S).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, Math.round(km2Of(v) / 1000)]));
  return { spans, frontier, masks, northwest: S.northwest, sized };
}
