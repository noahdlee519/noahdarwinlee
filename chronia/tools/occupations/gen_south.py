# The Balkans, Romania, Italy, the Middle East, and the occupations that followed the armistices.
# Run from gen.py (exec), after gen_east.py.
from shapely.geometry import Polygon, shape
from shapely.ops import unary_union

def side(key, note, line, close):
    """An area: the occupier's side of a line, closed round through other land."""
    AREAS[key] = {"note": note, "ring": [list(p) for p in line] + [[x, y] for x, y in close]}

def poly(key, note, ring):
    AREAS[key] = {"note": note, "ring": [list(p) for p in ring]}

def polys_of(c):
    """Polygons as [outer ring, hole, ...] lists."""
    out = []
    for q in (c.geoms if hasattr(c, "geoms") else [c]):
        if q.is_empty or q.geom_type != "Polygon": continue
        out.append([[[round(x, 4), round(y, 4)] for x, y in r.coords] for r in [q.exterior] + list(q.interiors)])
    return out

def geom(k):
    a = AREAS[k]
    if "polys" in a: return unary_union([Polygon(p[0], p[1:]).buffer(0) for p in a["polys"]])
    rings = a.get("rings") or [a["ring"]]
    return unary_union([Polygon([(p[0], p[1]) for p in r]).buffer(0) for r in rings])

def combine(key, note, plus, minus=()):
    """An area made from others: the union of plus, less the union of minus."""
    c = unary_union([geom(k) for k in plus])
    if minus: c = c.difference(unary_union([geom(k) for k in minus]))
    AREAS[key] = {"note": note, "polys": polys_of(c)}

# ---------------------------------------------------------------- Romania
CP_WEST = [[24.0, 43.4], [20.0, 43.4], [20.0, 47.5], [24.3, 47.5]]
side("wallachia-1916-11", "Oltenia, west of the Olt, from the fall of Craiova (21 November 1916).",
     [(24.30, 45.62, "Turnu Roșu Pass"), (24.37, 45.10, "Râmnicu Vâlcea"), (24.26, 44.66, "Drăgășani"), (24.37, 44.43, "Slatina"),
      (24.35, 44.11, "Caracal"), (24.80, 43.72, "the Olt's mouth")], CP_WEST)
side("wallachia-1916-12", "Wallachia to Buzău, from the fall of Bucharest (6 December 1916).",
     [(26.20, 45.50, "the Carpathians"), (26.83, 45.15, "Buzău"), (27.40, 44.95, "the Bărăgan"), (27.93, 44.75, "the Danube at Hârșova")],
     [[27.6, 43.9], [24.0, 43.4], [20.0, 43.4], [20.0, 47.5], [25.2, 47.4], [25.45, 47.10], [25.75, 46.75], [25.95, 46.45], [26.0, 45.8]])
SIRET = [(26.40, 46.10, "Oituz Pass"), (26.75, 45.95, "Soveja"), (27.00, 45.85, "Mărăști"), (27.18, 45.78, "north of Focșani"),
         (27.40, 45.73, "Mărășești, Romanian"), (27.55, 45.55, "Nămoloasa, the Siret"), (27.85, 45.45, "the Siret"), (27.98, 45.40, "the Siret's mouth")]
side("wallachia-1917", "The Siret line, from the fall of Focșani (8 January 1917) to the German withdrawal (November 1918).",
     SIRET + [(28.10, 45.33, "the Danube below Galați")], [[28.0, 44.9], [27.6, 43.9], [24.0, 43.4], [20.0, 43.4], [20.0, 47.5], [25.2, 47.4], [25.45, 47.10], [25.75, 46.75], [25.95, 46.45], [26.25, 46.15]])
DANUBE_DOBRUJA = [(27.88, 44.20, "the Danube at Rasova"), (27.45, 44.08, "the Danube at Ostrov"), (27.25, 44.08, "Silistra"), (26.62, 44.03, "Turtucaia")]
side("dobruja-1916-09", "Southern Dobruja to the Rasova–Tuzla line, from the fall of Turtucaia (6 September 1916).",
     [(28.63, 43.99, "Tuzla, on the coast"), (28.45, 44.02, "Topraisar"), (28.22, 44.08, "Cobadin"), (27.94, 44.22, "Rasova")] + DANUBE_DOBRUJA,
     [[26.0, 43.5], [26.0, 42.5], [29.8, 42.5], [29.8, 43.99]])
side("dobruja-1916-10", "Dobruja south of the Hârșova line, from the fall of Constanța (22 October 1916).",
     [(28.80, 44.62, "the coast at Lake Sinoe"), (28.35, 44.75, "the Hârșova line"), (27.98, 44.68, "Hârșova, on the Danube"), (28.02, 44.34, "Cernavodă")] + DANUBE_DOBRUJA,
     [[26.0, 43.5], [26.0, 42.5], [30.0, 42.5], [30.0, 44.62]])
side("dobruja-1917", "All of Dobruja, to the Danube's St George branch, from January 1917.",
     [(29.70, 44.85, "the St George branch's mouth"), (29.00, 45.00, "the St George branch"), (28.80, 45.17, "Tulcea"), (28.46, 45.27, "Isaccea"),
      (28.13, 45.27, "Măcin"), (28.00, 45.00, "the Danube"), (27.98, 44.68, "Hârșova"), (28.02, 44.34, "Cernavodă")] + DANUBE_DOBRUJA,
     [[26.0, 43.5], [26.0, 42.5], [30.5, 42.5], [30.5, 44.85]])
side("transylvania-1916", "The east of Transylvania held by Romania after its invasion (28 August 1916) until it was driven back (October 1916).",
     [(25.30, 47.25, "the border near Borsec"), (25.35, 46.95, "Toplița"), (25.40, 46.65, "Gheorgheni"), (25.25, 46.30, "Odorheiu"),
      (24.85, 46.10, "south of Sighișoara"), (24.60, 45.85, "Făgăraș"), (24.25, 45.72, "Avrig"), (24.28, 45.55, "Turnu Roșu")],
     [[24.3, 45.3], [27.5, 45.0], [27.5, 47.6], [25.3, 47.6]])
zone("romania", "Military Administration in Romania", "Romania in World War I", "255", ["360"], [
    ("1916-11-21", "1916-12-05", "wallachia-1916-11"), ("1916-12-06", "1917-01-07", "wallachia-1916-12"), ("1917-01-08", "1918-11-11", "wallachia-1917")],
    cap=["Bucharest", 26.103, 44.433])
zone("dobruja", "Occupied Dobruja", "Romania in World War I", "355", ["360"], [
    ("1916-09-06", "1916-10-21", "dobruja-1916-09"), ("1916-10-22", "1917-01-07", "dobruja-1916-10"), ("1917-01-08", "1918-11-11", "dobruja-1917")],
    note="Southern Dobruja was occupied by Bulgaria, the north by Germany and Bulgaria together; the Treaty of Bucharest (May 1918) gave the south to Bulgaria, as CShapes has it from 7 May 1918.")
zone("transylvania", "Romanian-held Transylvania", "Battle of Transylvania", "360", ["300"], [("1916-08-28", "1916-10-09", "transylvania-1916")])

# ---------------------------------------------------------------- Italy
IT_CLOSE = [[13.35, 45.55], [12.0, 45.4], [11.8, 46.9], [13.35, 46.65]]
side("isonzo-1915", "The Austrian land the Italians held from their first advance (May and June 1915) to the fall of Gorizia: the upper Isonzo at Caporetto and Krn, Cormons, Gradisca, Cervignano, and Monfalcone.",
     [(13.30, 46.60, "the Carnic border"), (13.53, 46.38, "Rombon, Austro-Hungarian"), (13.66, 46.26, "Krn"), (13.70, 46.20, "west of Tolmin"),
      (13.66, 46.10, "the Isonzo"), (13.60, 46.05, "Plava"), (13.59, 45.95, "Podgora, west of Gorizia"), (13.49, 45.87, "Sagrado"),
      (13.53, 45.82, "Monfalcone"), (13.56, 45.77, "the coast")], IT_CLOSE)
side("isonzo-1916", "From the fall of Gorizia (8 August 1916) to Caporetto (October 1917).",
     [(13.30, 46.60, "the Carnic border"), (13.53, 46.38, "Rombon"), (13.66, 46.26, "Krn"), (13.70, 46.20, "west of Tolmin"), (13.75, 46.08, "the Bainsizza"),
      (13.68, 45.98, "Monte Santo"), (13.69, 45.94, "east of Gorizia"), (13.62, 45.85, "the Carso"), (13.62, 45.79, "below Hermada"), (13.61, 45.76, "the coast")], IT_CLOSE)
AH_ITALY_CLOSE = [[13.6, 45.4], [14.5, 46.8], [11.0, 47.1], [11.0, 46.2]]
side("veneto-1917-10", "The land the Austro-Hungarian and German armies took after Caporetto, to the Tagliamento (by 3 November 1917).",
     [(12.92, 46.62, "the Carnic border"), (13.00, 46.40, "Tolmezzo"), (12.93, 46.18, "Pinzano, the Tagliamento"), (12.98, 45.96, "Codroipo"),
      (13.00, 45.78, "Latisana"), (13.08, 45.65, "the coast")], [[13.6, 45.4], [14.5, 46.8], [12.92, 46.9]])
side("veneto-1917-11", "The Austro-Hungarian side of the Piave and Grappa line, from 10 November 1917 to the Battle of Vittorio Veneto.",
     [(11.30, 46.00, "the border north of Arsiero"), (11.52, 45.90, "north of Asiago"), (11.70, 45.87, "the Melette"), (11.82, 45.86, "Monte Grappa, Italian"),
      (11.93, 45.92, "Quero, on the Piave"), (12.02, 45.85, "the Piave"), (12.10, 45.82, "the Montello"), (12.21, 45.83, "Nervesa"),
      (12.35, 45.77, "the Piave"), (12.47, 45.72, "Ponte di Piave"), (12.57, 45.63, "San Donà"), (12.73, 45.52, "Cortellazzo")], AH_ITALY_CLOSE)
zone("isonzo", "Italian-held Austrian Littoral", "Italian front (World War I)", "325", ["300"], [("1915-05-24", "1916-08-07", "isonzo-1915"), ("1916-08-08", "1917-10-27", "isonzo-1916")])
zone("veneto", "Occupied Friuli and Veneto", "Battle of Caporetto", "300", ["325"], [("1917-10-28", "1917-11-09", "veneto-1917-10"), ("1917-11-10", "1918-11-03", "veneto-1917-11")],
     cap=["Udine", 13.234, 46.063])
poly("italy-1918", "The land Italy held under the armistice of Villa Giusti (4 November 1918): Trentino and South Tyrol to the Brenner, Gorizia, Trieste, and Istria.",
     [(10.40, 46.85, "Reschen Pass"), (11.15, 46.97, "the Ötztal Alps"), (11.50, 47.01, "Brenner Pass"), (12.20, 46.92, "Toblach"), (12.90, 46.65, "the Carnic Alps"),
      (13.58, 46.52, "Tarvisio"), (13.84, 46.38, "Triglav"), (14.05, 46.00, "Idrija"), (14.22, 45.78, "Postojna"), (14.45, 45.58, "Snežnik"),
      (14.33, 45.37, "Kastav, west of Fiume"), (14.20, 45.10, "Istria's east coast"), (14.0, 44.7, "the Kvarner"), (12.5, 44.9, "the Adriatic"),
      (10.4, 45.5, "Italy")])
poly("dalmatia-1918", "Northern Dalmatia, held by Italy under the armistice: Zadar, Šibenik, and the islands.",
     [(15.05, 44.35, ""), (16.05, 44.15, ""), (16.25, 43.62, ""), (15.75, 43.50, ""), (14.85, 43.95, "")])
zone("italy-1918", "Italian-occupied Trentino and Venezia Giulia", "Allied occupation of the eastern Adriatic", "325", ["305", "345"], [("1918-11-04", "1919-09-09", "italy-1918")],
     note="Until the Treaty of Saint-Germain, from whose coming into force (CShapes: 10 September 1919) the land is Italy's.")
zone("dalmatia", "Italian-occupied Dalmatia", "Allied occupation of the eastern Adriatic", "325", ["305", "345"], [("1918-11-04", "1921-09-20", "dalmatia-1918")])

# ---------------------------------------------------------------- Serbia, Montenegro, Albania, Greece
# Serbia's land held by Bulgaria (the east and Macedonia) and by Austria-Hungary (the rest).
poly("serbia-bg", "The Bulgarian zone of occupied Serbia: the Morava inspection area (Niš, Pirot, Zaječar, Leskovac, Vranje) and Macedonia (Skopje, Bitola).",
     [(21.90, 44.65, "the Danube below Golubac"), (21.75, 44.05, "east of Paraćin"), (21.40, 43.75, "Ćuprija"), (21.30, 43.35, "Prokuplje"),
      (21.10, 42.95, "Podujevo"), (20.80, 42.55, "south of Pristina"), (20.55, 42.20, "Prizren"), (20.40, 41.90, "the Albanian border"),
      (20.3, 40.8, ""), (23.5, 40.8, ""), (23.5, 44.8, "")])
poly("serbia-ah", "The Austro-Hungarian zone of occupied Serbia (the Military General Governorate).",
     [(21.90, 44.65, ""), (21.75, 44.05, ""), (21.40, 43.75, ""), (21.30, 43.35, ""), (21.10, 42.95, ""), (20.80, 42.55, ""), (20.55, 42.20, ""), (20.40, 41.90, ""),
      (19.0, 42.0, ""), (18.5, 45.5, ""), (22.0, 45.5, "")])
poly("bitola", "The land round Bitola (Monastir) retaken by the Allies (19 November 1916) and held until the breakthrough of September 1918.",
     [(20.95, 40.86, "Lake Prespa"), (21.05, 41.12, ""), (21.35, 41.12, "north of Bitola"), (21.55, 41.15, ""), (21.75, 41.20, "the Cerna bend"), (21.95, 41.05, ""), (21.95, 40.80, "the Greek border")])
poly("serbia-belgrade-1915", "The north of Serbia taken by the Austro-Hungarian and German armies in October 1915, before the Bulgarian advance met them.",
     [(19.20, 44.30, "the Drina at Loznica"), (19.90, 44.20, "south of Valjevo"), (20.50, 44.10, ""), (20.92, 43.98, "Kragujevac"), (21.35, 44.12, ""),
      (21.70, 44.35, ""), (22.0, 44.70, "the Danube"), (22.0, 45.5, ""), (18.5, 45.5, "")])
poly("serbia-1918-09", "Serbia still held after the Allied breakthrough at Dobro Pole, as on 25 September 1918.",
     [(20.30, 41.75, "the Albanian border"), (21.00, 41.60, "Kičevo"), (21.40, 41.55, "Prilep, freed"), (21.78, 41.72, "Veles"), (22.20, 41.74, "Štip"), (22.80, 41.60, "the Bulgarian border"),
      (23.5, 45.5, ""), (18.5, 45.5, ""), (19.0, 42.0, "")])
poly("serbia-1918-10", "Serbia still held after the Bulgarian armistice, as the Allies reached Vranje (5 October 1918).",
     [(20.30, 42.40, ""), (20.75, 42.65, "Pristina"), (21.20, 42.70, ""), (21.90, 42.55, "Vranje, freed"), (22.50, 42.60, "the Bulgarian border"),
      (23.5, 45.5, ""), (18.5, 45.5, ""), (19.0, 42.5, "")])
poly("serbia-1918-10b", "Serbia still held after Niš was freed (12 October 1918), to the freeing of Belgrade (1 November).",
     [(19.30, 43.30, ""), (20.10, 43.40, ""), (20.70, 43.60, "Kraljevo"), (21.30, 43.75, ""), (21.90, 43.90, "Zaječar"), (22.70, 44.00, "the Bulgarian border"),
      (23.5, 45.5, ""), (18.5, 45.5, "")])
combine("serbia-bg-1916", "The Bulgarian zone, less the land round Bitola.", ["serbia-bg"], ["bitola"])
# The held land by stage, divided between the zones.
def inter(key, a, b, note=""):
    AREAS[key] = {"note": note, "polys": polys_of(geom(a).intersection(geom(b)))}
inter("serbia-bg-1918-09", "serbia-bg-1916", "serbia-1918-09", "The Bulgarian zone as held on 25 September 1918.")
inter("serbia-ah-1918-10", "serbia-ah", "serbia-1918-10", "The Austro-Hungarian zone as held in early October 1918.")
inter("serbia-ah-1918-10b", "serbia-ah", "serbia-1918-10b", "The Austro-Hungarian zone as held from Niš's freeing to Belgrade's.")
zone("serbia-ah", "Military General Governorate of Serbia", "Austro-Hungarian occupation of Serbia", "300", ["340"], [
    ("1915-10-09", "1915-11-04", "serbia-belgrade-1915"), ("1915-11-05", "1918-09-29", "serbia-ah"), ("1918-09-30", "1918-10-11", "serbia-ah-1918-10"),
    ("1918-10-12", "1918-10-31", "serbia-ah-1918-10b")], cap=["Belgrade", 20.457, 44.817])
zone("serbia-bg", "Bulgarian-occupied Serbia", "Bulgarian occupation of Serbia (World War I)", "355", ["340"], [
    ("1915-11-05", "1916-11-18", "serbia-bg"), ("1916-11-19", "1918-09-14", "serbia-bg-1916"), ("1918-09-15", "1918-09-29", "serbia-bg-1918-09")],
    note="The Military Inspection Areas of Morava (Niš) and Macedonia (Skopje).")
zone("montenegro", "Military General Government of Montenegro", "Austro-Hungarian occupation of Montenegro", "300", ["341"], [("1916-01-13", "1918-11-03", "all")],
     cap=["Cetinje", 18.923, 42.394])
REST = [{"of": "340", "from": "1915-10-02", "to": "1918-11-30", "status": "independent", "owner": "340",
         "note": "CShapes counts all of Serbia occupied by Austria-Hungary from 2 October 1915; the zones above hold what was occupied, and the rest (before the conquest was complete, round Bitola from November 1916, and as it was freed in 1918) is Serbia's."},
        {"of": "341", "from": "1915-07-02", "to": "1918-11-30", "status": "independent", "owner": "341",
         "note": "CShapes counts Montenegro occupied from 2 July 1915; it was conquered in January 1916 and freed in November 1918."}]
# Albania.
VJOSA = [(19.40, 40.65, "the Vjosa's mouth"), (19.70, 40.55, "the Vjosa"), (20.00, 40.32, "north of Tepelenë"), (20.30, 40.28, "Përmet"), (20.60, 40.15, "the Greek border")]
poly("korce", "The French zone round Korçë (the Autonomous Province of Korçë).",
     [(20.45, 40.85, ""), (20.95, 40.95, "Lake Prespa"), (21.05, 40.60, ""), (20.75, 40.30, ""), (20.45, 40.45, "")])
side("albania-north", "Albania north of the Vjosa, held by Austria-Hungary from January 1916 to October 1918.",
     VJOSA, [[21.2, 40.0], [21.2, 43.0], [18.5, 43.0], [18.5, 40.8]])
side("albania-south", "Albania south of the Vjosa.", VJOSA, [[21.2, 40.0], [21.0, 39.3], [19.0, 39.5], [18.5, 40.8]])
combine("albania-north-ah", "Austro-Hungarian Albania, less Korçë.", ["albania-north"], ["korce"])
combine("albania-south-it", "Italian Albania south of the Vjosa, less Korçë.", ["albania-south"], ["korce"])
poly("vlore", "Vlorë and its bay, held by Italy from 26 December 1914.", [(19.25, 40.62, ""), (19.65, 40.60, ""), (19.70, 40.30, ""), (19.30, 40.20, "")])
poly("albania-all", "All of Albania.", [(18.5, 39.3, ""), (21.5, 39.3, ""), (21.5, 43.0, ""), (18.5, 43.0, "")])
combine("albania-it-1918", "Albania less Korçë, held by Italy after the Austro-Hungarian withdrawal (October 1918).", ["albania-all"], ["korce"])
poly("epirus", "Northern Epirus, held by Greece from October 1914 to 1916: Gjirokastër, Sarandë, and Korçë.",
     [(19.45, 40.25, "south of Vlorë's bay"), (20.00, 40.30, "Tepelenë"), (20.40, 40.30, "Përmet"), (20.80, 40.60, "west of Korçë"), (20.90, 40.85, ""), (21.10, 40.85, "Lake Prespa"),
      (21.2, 39.5, ""), (19.5, 39.5, "")])
zone("albania-gr", "Northern Epirus", "Northern Epirus", "350", ["339"], [("1914-10-27", "1916-09-30", "epirus")])
zone("albania-ah", "Austro-Hungarian-occupied Albania", "World War I in Albania", "300", ["339"], [("1916-01-23", "1918-10-13", "albania-north-ah")])
zone("albania-fr", "Autonomous Province of Korçë", "Autonomous Province of Korçë", "220", ["339"], [("1916-11-29", "1920-06-14", "korce")])
zone("albania-it", "Italian-occupied Albania", "World War I in Albania", "325", ["339"], [
    ("1914-12-26", "1916-09-30", "vlore"), ("1916-10-01", "1918-10-13", "albania-south-it"), ("1918-10-14", "1920-06-14", "albania-it-1918"), ("1920-06-15", "1920-09-01", "vlore")])
# Greece: the east of Macedonia, beyond the Struma.
side("greece-bg", "Greek Macedonia east of the Struma, held by Bulgaria from August 1916 (Kavala, 12 September) to the armistice.",
     [(23.27, 41.40, "Rupel"), (23.39, 41.23, "Sidirokastro"), (23.52, 41.09, "west of Serres"), (23.60, 40.95, "the lower Struma"), (23.85, 40.77, "the Struma's mouth")],
     [[24.5, 40.4], [26.8, 40.7], [26.8, 42.2], [23.27, 42.0]])
zone("greece-bg", "Bulgarian-occupied Eastern Macedonia", "Greece during World War I", "355", ["350"], [("1916-08-22", "1918-10-14", "greece-bg")])

# ---------------------------------------------------------------- the Ottoman Empire
# Mesopotamia: the British side, south-east of each line.
GULF = [[48.6, 29.6], [47.5, 29.3], [46.0, 29.0], [44.0, 30.0]]
def meso(key, note, line):
    side(key, note, line, [[48.5, 31.0], [48.8, 30.0], [48.6, 29.6], [46.0, 29.0], [43.0, 30.5]])
meso("meso-1914", "Basra and the Shatt al-Arab, from the taking of Basra (22 November 1914) and Qurna (9 December).",
     [(46.60, 30.40, "west of Zubair"), (46.90, 30.90, ""), (47.10, 31.15, "north of Qurna"), (47.70, 31.30, "the Persian border")])
meso("meso-1915-06", "Amara (3 June 1915) and Nasiriyah (25 July).",
     [(45.90, 30.70, "south-west of Nasiriyah"), (46.10, 31.25, "north of Nasiriyah"), (46.70, 31.70, ""), (47.05, 32.05, "north of Amara"), (47.60, 32.20, "the Persian border")])
meso("meso-1915-09", "Kut (29 September 1915), held until its surrender (29 April 1916).",
     [(45.90, 30.70, ""), (46.10, 31.25, ""), (45.55, 32.30, "south-west of Kut"), (45.75, 32.65, "north of Kut"), (46.60, 32.95, ""), (47.20, 33.10, "the Persian border")])
meso("meso-1916", "After Kut's surrender (29 April 1916): the British line at Sannaiyat and Falahiya, east of Kut.",
     [(45.90, 30.70, ""), (46.10, 31.25, ""), (46.00, 32.20, ""), (46.20, 32.45, "Sannaiyat"), (46.80, 32.75, ""), (47.40, 32.90, "the Persian border")])
WEST_MESO = [(43.0, 30.5, ""), (44.30, 31.40, "Samawa"), (44.30, 32.00, "Najaf"), (44.02, 32.62, "Karbala")]
meso("meso-1917-02", "Kut retaken (24 February 1917).",
     [(45.90, 30.70, ""), (46.10, 31.25, ""), (45.55, 32.30, ""), (45.75, 32.70, "north of Kut"), (46.60, 32.95, ""), (47.20, 33.10, "the Persian border")])
meso("meso-1917-03", "Baghdad (11 March 1917), Fallujah, and Baquba.",
     WEST_MESO + [(43.75, 33.35, "Fallujah"), (44.30, 33.60, "north of Baghdad"), (44.64, 33.78, "Baquba"), (45.40, 33.90, ""), (45.80, 34.00, "the Persian border")])
meso("meso-1917-04", "Samarra (23 April 1917).",
     WEST_MESO + [(43.75, 33.35, "Fallujah"), (43.70, 34.00, ""), (43.90, 34.30, "north of Samarra"), (44.90, 34.30, "the Diyala"), (45.50, 34.20, "the Persian border")])
meso("meso-1917-09", "Ramadi (29 September 1917).",
     WEST_MESO + [(43.20, 33.40, "west of Ramadi"), (43.70, 34.00, ""), (43.90, 34.30, ""), (44.90, 34.30, ""), (45.50, 34.20, "the Persian border")])
meso("meso-1917-11", "Tikrit (6 November 1917), Kifri, and in March 1918 Khan al-Baghdadi.",
     WEST_MESO + [(42.55, 33.95, "Khan al-Baghdadi"), (43.70, 34.75, "north of Tikrit"), (44.97, 34.75, "Kifri"), (45.60, 34.60, "the Persian border")])
poly("meso-1918-11", "All of Mesopotamia with the vilayet of Mosul (Mosul occupied 10 November 1918), until the Mandate.",
     [(40.95, 34.40, "Abu Kamal"), (41.30, 36.50, "Sinjar"), (42.40, 37.35, "Zakho"), (44.80, 37.20, "the Persian border"), (46.0, 35.5, ""), (48.5, 31.0, ""), (48.8, 30.0, ""),
      (46.0, 29.0, ""), (43.0, 30.5, ""), (39.5, 32.5, "")])
zone("mesopotamia", "British-occupied Mesopotamia", "Mesopotamian campaign", "200", ["640"], [
    ("1914-11-22", "1915-06-02", "meso-1914"), ("1915-06-03", "1915-09-28", "meso-1915-06"), ("1915-09-29", "1916-04-29", "meso-1915-09"),
    ("1916-04-30", "1917-02-23", "meso-1916"), ("1917-02-24", "1917-03-10", "meso-1917-02"), ("1917-03-11", "1917-04-22", "meso-1917-03"),
    ("1917-04-23", "1917-09-28", "meso-1917-04"), ("1917-09-29", "1917-11-05", "meso-1917-09"), ("1917-11-06", "1918-11-09", "meso-1917-11"),
    ("1918-11-10", "1920-04-25", "meso-1918-11")], cap=["Baghdad", 44.361, 33.312])
# Palestine and Syria: the British side, south of each line.
SINAI_CLOSE = [[34.9, 29.5], [33.0, 29.0], [32.0, 31.5]]
# Closed south through the Wadi Araba, the Ottoman border with Egypt's Sinai, and Sinai (Egypt's, so not cut).
def pal(key, note, line):
    side(key, note, line, [[35.45, 31.00], [35.30, 30.50], [35.00, 29.55], [34.90, 29.40], [33.0, 29.0], [32.0, 31.5]])
pal("pal-1917-02", "The south of Gaza's district, from Rafa (9 January 1917) and Khan Yunis.",
     [(34.37, 31.45, "the coast at Wadi Ghazza"), (34.60, 31.20, ""), (34.70, 30.90, ""), (34.55, 30.50, "the Egyptian border")])
pal("pal-1917-10", "Beersheba (31 October 1917).",
     [(34.37, 31.45, "Wadi Ghazza"), (34.62, 31.35, ""), (34.85, 31.35, "north of Beersheba"), (35.20, 31.20, ""), (35.45, 31.00, "the Dead Sea's south")])
pal("pal-1917-11", "Gaza (7 November 1917).",
     [(34.50, 31.65, "north of Gaza"), (34.75, 31.55, ""), (35.00, 31.45, ""), (35.20, 31.35, ""), (35.45, 31.10, "the Dead Sea")])
pal("pal-1917-11b", "Jaffa (16 November 1917).",
     [(34.78, 32.10, "the Auja, north of Jaffa"), (34.95, 31.95, ""), (35.10, 31.85, "Nebi Samwil"), (35.15, 31.72, "west of Jerusalem"), (35.10, 31.55, ""), (35.40, 31.35, "the Dead Sea")])
pal("pal-1917-12", "Jerusalem (9 December 1917).",
     [(34.80, 32.12, "north of Jaffa"), (35.00, 32.00, ""), (35.20, 31.92, ""), (35.30, 31.84, "east of Jerusalem"), (35.45, 31.70, ""), (35.50, 31.60, "the Dead Sea")])
pal("pal-1918-02", "Jericho and the Jordan (21 February 1918), to the Battle of Megiddo.",
     [(34.85, 32.20, ""), (35.05, 32.10, ""), (35.25, 32.05, ""), (35.40, 32.00, ""), (35.55, 31.95, "the Jordan"), (35.56, 31.75, "the Dead Sea's north shore")])
pal("pal-1918-09", "After Megiddo (19 September 1918): Palestine, Haifa, Amman, and Deraa.",
     [(35.20, 33.10, "the coast north of Acre"), (35.60, 32.95, "north of Lake Tiberias"), (36.10, 32.65, "Deraa"), (36.50, 32.40, ""), (37.5, 31.5, "")])
pal("pal-1918-10", "Damascus (1 October 1918).",
     [(35.40, 33.70, "south of Beirut"), (36.40, 33.65, "north of Damascus"), (37.30, 33.50, ""), (37.5, 31.5, "")])
pal("pal-1918-10b", "Beirut (8 October 1918), Tripoli, and Homs.",
     [(35.85, 34.55, "north of Tripoli"), (36.70, 34.85, "north of Homs"), (38.0, 34.6, ""), (38.0, 31.5, "")])
pal("pal-1918-10c", "Aleppo (26 October 1918) and the armistice line of Mudros, until the Mandates.",
     [(35.90, 36.00, "the coast north of Latakia"), (36.60, 36.45, ""), (37.20, 36.45, "north of Aleppo"), (38.50, 36.00, ""), (40.00, 35.20, ""),
      (40.95, 34.40, "Abu Kamal"), (39.5, 32.5, ""), (38.0, 30.5, "")])
poly("oeta-west", "The coast of Lebanon and Syria, under French administration (OETA West) from October 1918.",
     [(35.10, 33.05, "Ras Naqoura"), (35.60, 33.30, ""), (36.05, 34.00, "the Lebanon range"), (36.35, 34.60, ""), (36.20, 35.20, ""), (36.50, 35.90, ""), (36.60, 36.30, ""), (35.5, 36.3, ""), (34.8, 33.0, "")])
combine("pal-1918-10b-uk", "", ["pal-1918-10b"], ["oeta-west"])
combine("pal-1918-10c-uk", "", ["pal-1918-10c"], ["oeta-west"])
inter("oeta-west-1918-10b", "oeta-west", "pal-1918-10b", "OETA West as held in October 1918.")
zone("oeta", "Occupied Enemy Territory Administration", "Occupied Enemy Territory Administration", "200", ["640"], [
    ("1917-01-09", "1917-10-30", "pal-1917-02"), ("1917-10-31", "1917-11-06", "pal-1917-10"), ("1917-11-07", "1917-11-15", "pal-1917-11"),
    ("1917-11-16", "1917-12-08", "pal-1917-11b"), ("1917-12-09", "1918-02-20", "pal-1917-12"), ("1918-02-21", "1918-09-18", "pal-1918-02"),
    ("1918-09-19", "1918-09-30", "pal-1918-09"), ("1918-10-01", "1918-10-07", "pal-1918-10"), ("1918-10-08", "1918-10-25", "pal-1918-10b-uk"),
    ("1918-10-26", "1920-04-25", "pal-1918-10c-uk")], cap=["Jerusalem", 35.214, 31.769])
zone("oeta-west", "Occupied Enemy Territory Administration (West)", "Occupied Enemy Territory Administration", "220", ["640"], [
    ("1918-10-08", "1918-10-25", "oeta-west-1918-10b"), ("1918-10-26", "1920-04-25", "oeta-west")], cap=["Beirut", 35.505, 33.894])
# Sinai: the Ottoman side, east of each line.
def sinai(key, note, line):
    side(key, note, line, [[35.5, 28.0], [36.0, 32.0]])
sinai("sinai-1914", "The Sinai east of the Canal's defences, held by Ottoman forces from December 1914 until the British advance of 1916.",
     [(32.60, 31.10, "the coast east of Port Said"), (32.75, 30.60, "east of the Canal"), (32.75, 30.00, ""), (32.80, 29.40, ""), (33.30, 28.30, "the Gulf of Suez"), (34.20, 27.70, "")])
sinai("sinai-1916-08", "After Romani (4 August 1916), the British advance to Bir el Abd and Mazar.",
     [(33.40, 31.15, "Mazar, on the coast"), (33.30, 30.30, ""), (33.10, 29.50, ""), (33.30, 28.30, ""), (34.20, 27.70, "")])
sinai("sinai-1916-12", "After El Arish (21 December 1916), to Rafa (9 January 1917).",
     [(33.90, 31.15, "east of El Arish"), (34.00, 30.60, ""), (33.90, 29.90, "Nekhl"), (34.30, 28.80, ""), (34.40, 27.90, "")])
zone("sinai", "Ottoman-held Sinai", "Sinai and Palestine campaign", "640", ["651"], [
    ("1914-12-01", "1916-08-04", "sinai-1914"), ("1916-08-05", "1916-12-20", "sinai-1916-08"), ("1916-12-21", "1917-01-08", "sinai-1916-12")])
# The Russian side in the Ottoman east, east of each line.
RU_CAUCASUS_CLOSE = [[44.6, 37.4], [48.0, 38.0], [48.0, 43.0], [41.0, 43.0]]
def cauc(key, note, line):
    side(key, note, line, RU_CAUCASUS_CLOSE)
BORDER_STRIP = [(41.55, 41.55, "the coast at the border"), (41.85, 41.30, "the border"), (42.30, 40.90, ""), (42.20, 40.30, ""), (41.90, 39.98, "Köprüköy"),
                (42.30, 39.85, "Horasan"), (42.67, 39.75, "Eleşkirt"), (43.05, 39.62, "Karaköse"), (43.50, 39.30, ""), (44.0, 39.10, "")]
cauc("cauc-1914", "The strip by the Russian border held by Russia from the Bergmann offensive (November 1914): Eleşkirt, Karaköse, and Doğubayazıt.",
     BORDER_STRIP + [(44.50, 38.80, "the Persian border")])
cauc("cauc-1915", "With Van, held by Russian and Armenian forces from 17 May to 4 August 1915.",
     BORDER_STRIP[:7] + [(42.55, 39.30, ""), (42.55, 39.00, "Malazgirt"), (42.73, 38.70, "Adilcevaz, Lake Van"), (43.00, 38.40, "Lake Van"), (43.35, 38.25, "south of Van"), (44.10, 37.90, "the Persian border")])
cauc("cauc-1916-02", "Erzurum (16 February 1916), Muş, Bitlis, and Rize.",
     [(40.40, 41.10, "the coast west of Rize"), (40.55, 40.55, ""), (40.85, 40.00, "west of Erzurum"), (41.10, 39.40, ""), (41.35, 38.70, "Muş"), (42.05, 38.30, "Bitlis"),
      (42.60, 38.35, "Lake Van"), (43.35, 38.15, "south of Van"), (44.10, 37.80, "the Persian border")])
cauc("cauc-1916-04", "Trebizond (15 April 1916).",
     [(39.45, 41.05, "the coast west of Trebizond"), (39.60, 40.60, ""), (40.30, 40.15, ""), (40.85, 40.00, ""), (41.10, 39.40, ""), (41.35, 38.70, "Muş"), (42.05, 38.30, "Bitlis"),
      (42.60, 38.35, ""), (43.35, 38.15, ""), (44.10, 37.80, "")])
CAUC_1916_07 = [(38.90, 41.05, "the coast at Tirebolu"), (39.20, 40.50, ""), (39.30, 39.75, "west of Erzincan"), (39.80, 39.20, ""), (40.80, 38.90, ""),
                (41.50, 38.80, "Muş"), (42.30, 38.60, "north of Bitlis"), (42.70, 38.40, "Lake Van"), (43.30, 38.10, "south of Van"), (44.10, 37.75, "the Persian border")]
cauc("cauc-1916-07", "Erzincan (25 July 1916) and Bayburt, to the Russian collapse of 1918.", CAUC_1916_07)
cauc("cauc-1918-02", "After Erzincan was retaken (13 February 1918).",
     [(39.70, 41.05, "the coast"), (39.90, 40.40, ""), (40.20, 39.85, "east of Erzincan")] + CAUC_1916_07[4:])
cauc("cauc-1918-02b", "After Trebizond was retaken (24 February 1918).",
     [(40.40, 41.05, "the coast"), (40.60, 40.30, ""), (40.95, 39.90, "west of Erzurum")] + CAUC_1916_07[4:])
cauc("cauc-1918-03", "Van and the border strip, after Erzurum was retaken (12 March 1918), until Van fell (6 April 1918).",
     BORDER_STRIP[5:8] + [(42.80, 39.20, ""), (42.75, 38.75, ""), (43.00, 38.40, "Lake Van"), (43.35, 38.15, "south of Van"), (44.10, 37.80, "")])
zone("armenia-ru", "Russian-occupied Western Armenia", "Occupation of Western Armenia", "365", ["640"], [
    ("1914-11-02", "1915-05-16", "cauc-1914"), ("1915-05-17", "1915-08-03", "cauc-1915"), ("1915-08-04", "1916-02-15", "cauc-1914"),
    ("1916-02-16", "1916-04-14", "cauc-1916-02"), ("1916-04-15", "1916-07-24", "cauc-1916-04"), ("1916-07-25", "1918-02-12", "cauc-1916-07"),
    ("1918-02-13", "1918-02-23", "cauc-1918-02"), ("1918-02-24", "1918-03-11", "cauc-1918-02b"), ("1918-03-12", "1918-04-05", "cauc-1918-03")],
    cap=["Erzurum", 41.268, 39.905])
# Constantinople and the Straits.
AREAS["straits"] = {"note": "Constantinople and the Straits, occupied by the Allies from 13 November 1918 to 4 October 1923.",
                    "rings": [[[28.30, 41.45], [29.60, 41.25], [29.60, 40.80], [28.30, 40.95]], [[26.10, 40.00], [26.90, 40.60], [27.00, 40.45], [26.60, 40.00], [26.20, 39.90]]]}
zone("constantinople", "Allied-occupied Constantinople", "Occupation of Constantinople", "200", ["640"], [("1918-11-13", "1923-10-04", "straits")])

# ---------------------------------------------------------------- after the armistice in the West
ne = json.load(open(NE_PATH))
al = unary_union([shape(f['geometry']) for f in ne['features'] if f['properties']['adm0_a3'] == 'FRA' and f['properties']['name'] in ('Moselle', 'Bas-Rhin', 'Haute-Rhin')]).buffer(0.005)
AREAS["alsace-lorraine"] = {"note": "Alsace-Lorraine, from Natural Earth's départements of Moselle, Bas-Rhin, and Haut-Rhin.", "rings": [[[round(x, 4), round(y, 4)] for x, y in g.exterior.coords] for g in (al.geoms if hasattr(al, 'geoms') else [al])]}
zone("alsace-lorraine", "French-occupied Alsace-Lorraine", "Alsace-Lorraine", "220", ["255"], [("1918-11-17", "1919-06-27", "alsace-lorraine")],
     note="French troops entered Mulhouse on 17 November, Metz on 19 November, and Strasbourg on 22 November 1918; the land was ceded by the Treaty of Versailles.")
RHINE_N = [(6.25, 51.83, "the Rhine at Emmerich"), (6.62, 51.66, "Wesel"), (6.76, 51.43, "Duisburg"), (6.77, 51.23, "Düsseldorf"), (6.85, 51.20, "the Cologne bridgehead"),
           (7.25, 51.15, ""), (7.42, 50.95, ""), (7.25, 50.75, ""), (7.12, 50.70, "the Rhine at Bonn")]
RHINE_M = [(7.40, 50.44, "Andernach"), (7.55, 50.55, "the Koblenz bridgehead"), (7.95, 50.45, ""), (7.85, 50.20, ""), (7.71, 50.15, "the Rhine at St Goar"),
           (7.90, 49.97, "Bingen")]
RHINE_S = [(8.10, 50.05, "the Mainz bridgehead"), (8.55, 50.15, ""), (8.60, 49.95, ""), (8.36, 49.86, "the Rhine at Oppenheim"), (8.36, 49.63, "Worms"),
           (8.44, 49.48, "Ludwigshafen"), (8.43, 49.32, "Speyer"), (8.37, 49.22, "Germersheim"), (8.18, 48.97, "Lauterbourg"),
           (7.65, 49.05, "the Palatinate's border with Alsace"), (7.40, 49.15, "the Saar's border"), (7.40, 49.40, "Homburg"), (7.20, 49.58, "St Wendel"),
           (6.85, 49.55, ""), (6.55, 49.50, "Merzig"), (6.40, 49.55, "the Luxembourg border")]
poly("rhineland-n", "The northern (Cologne) zone, with its bridgehead, held by British and Belgian troops until 31 January 1926.",
     RHINE_N + [(7.27, 50.56, "the Ahr's mouth"), (5.9, 50.35, "the Belgian border"), (5.5, 51.0, ""), (5.8, 52.0, "")])
poly("rhineland-m", "The middle (Koblenz) zone, with its bridgehead, held by American and then French troops until 30 November 1929.",
     [(7.27, 50.56, "the Ahr's mouth")] + RHINE_M + [(7.80, 49.85, "the Nahe"), (6.4, 49.85, "the Moselle"), (5.9, 50.35, "")])
poly("rhineland-s", "The southern (Mainz) zone, with its bridgehead and the Palatinate (not the Saar, under the League of Nations from 1920), held by French troops until 30 June 1930.",
     [(7.80, 49.85, "the Nahe"), (7.90, 49.97, "Bingen")] + RHINE_S + [(6.4, 49.85, "the Moselle")])
combine("rhineland-all", "All three zones.", ["rhineland-n", "rhineland-m", "rhineland-s"])
combine("rhineland-ms", "The middle and southern zones.", ["rhineland-m", "rhineland-s"])
zone("rhineland", "Occupied Rhineland", "Occupation of the Rhineland", "220", ["255"], [
    ("1918-12-01", "1926-01-31", "rhineland-all"), ("1926-02-01", "1929-11-30", "rhineland-ms"), ("1929-12-01", "1930-06-30", "rhineland-s")],
    note="Held by Belgian, British, American, and French troops, drawn here under France, which held the largest zone and the High Commission's chair.")
