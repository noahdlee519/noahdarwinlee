# The Eastern Front: one line a stage, from the Baltic to the Romanian border; the Central Powers'
# side is west of it ("-cp") and Russia's east of it ("-ru"). Run from gen.py (exec).
from shapely.geometry import Polygon
from shapely.ops import unary_union

def front(key, note, line, north_cp, north_ru, south_cp=None, south_ru=None):
    """north_*: points from the line's north end out to sea, to close each side; south_*: from its
    south end outward."""
    south_cp = south_cp or [[24.0, 45.0], [5.0, 44.0], [5.0, 62.0], [19.0, 62.0]]
    south_ru = south_ru or [[29.0, 45.5], [45.0, 44.0], [45.0, 66.0], [26.0, 66.0]]
    cp = [[round(p[1] + p[3], 3), round(p[2] + p[4], 3), p[5] + " (frontier, " + ("the German or Austro-Hungarian side" if True else "") + ")"] if p[0] == "B" else list(p) for p in line]
    ru = [[round(p[1] - p[3], 3), round(p[2] - p[4], 3), p[5] + " (frontier, the Russian side)"] if p[0] == "B" else list(p) for p in line]
    AREAS[key + "-cp"] = {"note": note + " The Central Powers' side.", "ring": cp + [[x, y] for x, y in south_cp] + [[x, y] for x, y in reversed(north_cp)]}
    AREAS[key + "-ru"] = {"note": note + " Russia's side.", "ring": ru + [[x, y] for x, y in south_ru] + [[x, y] for x, y in reversed(north_ru)]}

def within(key, src, ring, note):
    """An area: the part of area src inside ring (the land of one administration)."""
    a = Polygon([(p[0], p[1]) for p in AREAS[src]["ring"]]).buffer(0)
    b = Polygon([(p[0], p[1]) for p in ring]).buffer(0)
    c = a.intersection(b)
    rings = []
    for g in (c.geoms if hasattr(c, "geoms") else [c]):
        if g.is_empty or g.geom_type != "Polygon": continue
        assert not len(g.interiors), key + " has a hole"
        rings.append([[round(x, 4), round(y, 4)] for x, y in g.exterior.coords])
    AREAS[key] = {"note": note + " (" + src + " within it)", "rings": rings}

# Closing each side through the sea at the north end. Before Riga fell the line meets the Gulf of Riga
# at Ķemeri; Courland and its cape stay on the German side, the gulf's islands on Russia's.
N_KEMERI_CP = [[23.30, 57.20], [22.45, 57.85], [21.4, 57.75], [19.0, 57.5]]
N_KEMERI_RU = [[23.30, 57.20], [22.45, 57.85], [21.4, 57.75], [20.8, 58.6], [21.5, 60.0], [26.0, 61.0]]
# The sea north of East Prussia, before the Germans entered Courland: the line meets the Baltic at the Lithuanian coast.
N_MEMEL_CP = [[20.6, 55.95], [19.0, 57.5]]
N_MEMEL_RU = [[20.6, 55.95], [20.0, 57.6], [21.5, 60.0], [26.0, 61.0]]

# The frontier of 1914, where a front followed it and neither side held land across it: each point
# ('B', lon, lat, dx, dy, place) with (dx, dy) pointing into the German or Austro-Hungarian side.
def B(lon, lat, dx, dy, name): return ("B", lon, lat, dx, dy, name)
MEMEL_B = [B(21.07, 55.86, -0.05, -0.05, "Nimmersatt, on the coast"), B(21.70, 55.60, -0.05, -0.06, "the Memel territory's border"),
           B(22.35, 55.30, -0.05, -0.06, "the Memel territory's border"), B(22.85, 55.06, -0.06, -0.05, "the Neman at Schmalleningken")]
EP_LT_B = [B(22.80, 54.85, -0.08, 0, "the border"), B(22.75, 54.64, -0.08, 0, "Eydtkuhnen and Kybartai"), B(22.80, 54.40, -0.08, 0, "Vištytis"),
           B(22.62, 54.12, -0.07, 0.03, "Filipów"), B(22.45, 53.72, -0.06, 0.05, "Prostki and Grajewo")]
EP_PL_B = [B(22.05, 53.48, 0, 0.07, "south of Lyck"), B(21.55, 53.40, 0, 0.07, "Kolno"), B(20.90, 53.27, 0, 0.07, "Chorzele"), B(20.45, 53.20, 0, 0.07, "north of Mława"),
           B(19.95, 53.17, 0, 0.07, "Soldau and Mława"), B(19.50, 53.12, 0, 0.07, "Strasburg and Rypin"), B(19.10, 52.98, 0, 0.07, "Golub and Dobrzyń"),
           B(18.80, 52.88, -0.05, 0.05, "the Vistula at Nieszawa")]
POSEN_B = [B(18.62, 52.70, -0.08, 0, "the border"), B(18.30, 52.45, -0.08, 0, "the border"), B(17.90, 52.30, -0.08, 0, "Strzałkowo and Słupca"),
           B(17.97, 51.75, -0.08, 0, "Kalisz"), B(18.15, 51.35, -0.08, 0, "Wieruszów"), B(18.45, 51.05, -0.08, 0, "Praszka"), B(18.90, 50.75, -0.08, 0, "Herby"),
           B(19.05, 50.45, -0.08, 0, "the border"), B(19.15, 50.25, -0.06, -0.04, "Kattowitz and Sosnowiec")]
GALICIA_PL_B = [B(19.40, 50.15, 0, -0.07, "the Vistula"), B(19.95, 50.12, 0, -0.07, "north of Kraków"), B(20.50, 50.20, 0, -0.07, "the Vistula"),
                B(20.85, 50.32, 0, -0.07, "Nowy Korczyn"), B(21.40, 50.50, 0, -0.07, "the Vistula"), B(21.80, 50.63, 0.03, -0.06, "the San's mouth")]
ZBRUCH_B = [B(25.15, 50.10, -0.06, -0.06, "Brody"), B(25.55, 49.95, -0.06, -0.06, "Pochaiv"), B(26.05, 49.55, -0.08, 0, "the Zbruch"),
            B(26.15, 49.05, -0.08, 0, "Husiatyn"), B(26.40, 48.55, -0.07, -0.03, "the Zbruch's mouth")]

# August 1914: Rennenkampf's army in the east of East Prussia, to the Neman (Tilsit) and the Masurian
# Lakes; German troops in a strip of western Poland (Kalisz, Częstochowa); the Austro-Hungarian armies
# in the south of Russian Poland (Kielce, Kraśnik, Komarów); Russia in eastern Galicia to the Gnila
# Lipa, as the line stood on 2 September 1914.
SOUTH_CP = [[24.8, 47.5], [24.0, 45.0], [5.0, 44.0], [5.0, 62.0], [19.0, 62.0], [19.0, 57.5]]
SOUTH_RU = [[25.6, 47.6], [29.0, 45.5], [45.0, 44.0], [45.0, 66.0], [26.0, 66.0]]
NORTH_1914_CP, NORTH_1914_RU = [[20.6, 55.95]], [[20.6, 55.95], [20.0, 57.6], [21.5, 60.0], [26.0, 61.0]]
front("east-1914-08", "To the fall of Lemberg (3 September 1914).",
      MEMEL_B + [(22.60, 55.05, "the Neman"), (22.10, 55.10, "the Neman"), (21.88, 55.12, "the Neman at Tilsit"), (21.40, 55.27, "the Neman delta"),
                 (21.12, 55.05, "the Curonian Lagoon"), (21.10, 54.86, "Labiau"), (21.24, 54.61, "Wehlau"), (21.38, 54.37, "Gerdauen"),
                 (21.76, 54.08, "Angerburg"), (21.68, 53.98, "west of Lötzen"), (21.85, 53.60, "Johannisburg")] +
      EP_PL_B + [(18.95, 52.65, "west of Włocławek"), (18.55, 52.25, "Słupca"), (18.45, 51.75, "east of Kalisz"), (18.65, 51.25, "Wieluń"),
                 (19.20, 50.95, "east of Częstochowa"), (19.70, 50.70, "Szczekociny"), (20.40, 50.95, "north of Kielce"), (21.10, 51.05, "Iłża"),
                 (21.80, 51.05, "Józefów"), (22.30, 51.05, "north of Kraśnik"), (23.00, 50.85, "Zamość"), (23.40, 50.68, "Komarów"),
                 (23.90, 50.48, "Bełz"), (24.30, 50.10, "Kamianka-Buzka"), (24.45, 49.75, "Peremyshliany"), (24.60, 49.42, "Rohatyn, the Gnila Lipa"),
                 (24.72, 49.12, "Halych"), (24.95, 48.75, "Tlumach"), (24.90, 48.35, "Kuty"), (24.95, 47.85, "Kirlibaba")],
      NORTH_1914_CP, NORTH_1914_RU, SOUTH_CP, SOUTH_RU)
# September to early November 1914: East Prussia freed; Russia in Galicia to the San and the Carpathian
# passes, and in Bukovina (Przemyśl, besieged but held by Austria-Hungary, is left inside Russia's
# side); German troops in a strip of western Poland.
GERMAN_STRIP = [(18.95, 52.65, "west of Włocławek"), (18.55, 52.25, "Słupca"), (18.45, 51.75, "east of Kalisz"), (18.65, 51.25, "Wieluń"),
                (19.20, 50.95, "east of Częstochowa"), (19.45, 50.45, "Wolbrom"), (19.40, 50.22, "the Galician border")]
front("east-1914-09", "From the fall of Lemberg (3 September) to the Russian advance to the Dunajec (November 1914).",
      MEMEL_B + EP_LT_B + EP_PL_B + GERMAN_STRIP + GALICIA_PL_B[1:] +
      [(22.05, 50.35, "Nisko, the San"), (22.40, 50.25, "Rudnik"), (22.68, 50.02, "Jarosław"), (22.55, 49.75, "west of Przemyśl"), (22.21, 49.56, "Sanok"),
       (22.40, 49.15, "Lupków Pass"), (22.86, 48.97, "Uzhok Pass"), (23.60, 48.75, "Veretsky Pass"), (24.40, 48.35, "Yablunytsia Pass"), (24.95, 47.85, "Kirlibaba")],
      NORTH_1914_CP, NORTH_1914_RU, SOUTH_CP, SOUTH_RU)
DUNAJEC = [(20.72, 50.24, "Opatowiec, the Dunajec's mouth"), (20.85, 50.02, "west of Tarnów"), (20.75, 49.86, "Zakliczyn"), (20.80, 49.70, "Gromnik"),
           (21.10, 49.62, "Gorlice"), (21.55, 49.40, "Dukla Pass"), (22.10, 49.20, "Lupków Pass"), (22.86, 48.97, "Uzhok Pass"),
           (23.60, 48.75, "Veretsky Pass"), (24.40, 48.35, "Yablunytsia Pass")]
EP_STRIP = [(22.85, 55.06, "the Neman at the border"), (22.45, 54.95, "Lasdehnen"), (22.45, 54.75, "west of Pillkallen"), (22.30, 54.55, "east of Gumbinnen"),
            (22.25, 54.31, "Goldap"), (22.05, 54.05, "the Masurian Lakes"), (22.30, 53.80, "Lyck"), (22.10, 53.55, "the border")]
front("east-1914-11", "The Russian advance to the Dunajec and the Carpathians, and into the east of East Prussia (November 1914), with German troops in western Poland to the Łódź front.",
      MEMEL_B + EP_STRIP[1:] + EP_PL_B[:6] + [(19.07, 52.65, "Włocławek"), (19.36, 52.23, "Kutno"), (19.30, 51.95, "Łęczyca"), (19.35, 51.75, "west of Łódź"),
                                          (19.60, 51.40, "Piotrków"), (19.55, 50.95, "Radomsko"), (19.60, 50.50, "Wolbrom"), (19.90, 50.25, "the border near Kraków")] + DUNAJEC + [(24.95, 47.85, "Kirlibaba")],
      NORTH_1914_CP, NORTH_1914_RU, SOUTH_CP, SOUTH_RU)
BZURA_NIDA = [(20.10, 52.95, "Raciąż"), (19.71, 52.60, "east of Płock"), (20.19, 52.39, "Wyszogród"), (20.28, 52.33, "the Bzura's mouth"),
              (20.24, 52.23, "Sochaczew"), (20.16, 52.08, "Bolimów"), (20.22, 51.90, "the Rawka"), (20.25, 51.76, "Rawa Mazowiecka"),
              (20.22, 51.53, "Inowłódz, the Pilica"), (20.28, 51.38, "Opoczno"), (20.41, 51.19, "Końskie"), (20.50, 50.90, "west of Kielce"),
              (20.42, 50.75, "Chęciny"), (20.40, 50.62, "the Nida"), (20.53, 50.52, "Pińczów"), (20.81, 50.33, "Nowy Korczyn")]
front("east-1914-12", "The winter lines (6 December 1914 to 21 February 1915): the Germans on the Bzura and Rawka, the Austro-Hungarians on the Nida, Russia on the Dunajec and the Carpathians, in Bukovina, and in the east of East Prussia.",
      MEMEL_B + EP_STRIP[1:] + EP_PL_B[:4] + BZURA_NIDA + DUNAJEC + [(24.95, 47.85, "Kirlibaba")],
      NORTH_1914_CP, NORTH_1914_RU, SOUTH_CP, SOUTH_RU)
BUKOVINA_1915 = [(24.40, 48.55, "Nadvirna"), (25.00, 48.62, "north of Kolomyia"), (25.60, 48.62, "the Dniester"), (26.10, 48.40, "Bukovina's border with Bessarabia")]
SOUTH_CP_15 = [[25.9, 47.8], [24.0, 45.0], [5.0, 44.0], [5.0, 62.0], [19.0, 62.0], [19.0, 57.5]]
SOUTH_RU_15 = [[27.0, 48.0], [29.0, 45.5], [45.0, 44.0], [45.0, 66.0], [26.0, 66.0]]
front("east-1915-02", "After the Second Battle of the Masurian Lakes (to 21 February 1915) and the Austro-Hungarian retaking of Bukovina (Czernowitz, 17 February), to the Gorlice–Tarnów offensive (2 May 1915).",
      MEMEL_B + EP_LT_B + EP_PL_B[:4] + BZURA_NIDA + DUNAJEC + [(24.2, 48.6, "the Carpathians")] + BUKOVINA_1915,
      NORTH_1914_CP, NORTH_1914_RU, SOUTH_CP_15, SOUTH_RU_15)
COURLAND_1915_05 = [(21.40, 56.95, "the coast north of Libau"), (22.20, 56.70, "Skrunda"), (23.00, 56.30, "Žagarė"), (23.32, 55.93, "Šiauliai"),
                    (23.40, 55.50, "the Dubysa"), (23.30, 55.08, "Jurbarkas, the Neman"), (22.90, 55.06, "the Neman")]
front("east-1915-05", "During the Gorlice–Tarnów offensive, as the line stood on 3 June 1915 (Przemyśl retaken); the Germans in western Courland from 7 May (Libau).",
      COURLAND_1915_05 + EP_LT_B + EP_PL_B[:4] + BZURA_NIDA[:-1] +
      [(21.20, 50.65, "Ostrowiec"), (21.75, 50.68, "Sandomierz"), (22.05, 50.55, "the San"), (22.68, 50.05, "Jarosław"), (22.95, 49.80, "east of Przemyśl"),
       (23.30, 49.55, "Mostyska"), (23.65, 49.30, "the Dniester"), (24.00, 49.05, "Zhydachiv"), (24.20, 48.80, "Kalush"), (24.40, 48.55, "Nadvirna")] + BUKOVINA_1915[1:],
      [[21.0, 57.2], [19.0, 57.5]], [[21.0, 57.2], [20.0, 57.6], [21.5, 60.0], [26.0, 61.0]], SOUTH_CP_15[:-1], SOUTH_RU_15)
GALICIA_1915_06 = [(24.15, 50.45, "Sokal"), (24.45, 50.00, "Busk"), (24.60, 49.70, "the Gnila Lipa"), (24.60, 49.42, "Rohatyn"), (24.75, 49.10, "Halych"),
                   (25.20, 48.85, "the Dniester"), (25.60, 48.62, "the Dniester"), (26.10, 48.40, "Bukovina's border with Bessarabia")]
front("east-1915-06", "After Lemberg was retaken (22 June 1915), to the fall of Lublin (30 July): Russia in eastern Galicia to the Gnila Lipa; the Austro-Hungarians in the south of Russian Poland; the Germans in Courland to Windau (18 July).",
      [(22.20, 57.30, "coast north of Windau"), (22.70, 57.00, "Kandava"), (23.20, 56.55, "south of Mitau"), (23.40, 55.95, "Šiauliai"), (23.40, 55.50, "the Dubysa"),
       (23.30, 55.08, "Jurbarkas"), (22.90, 55.06, "the Neman")] + EP_LT_B + EP_PL_B[:2] +
      [(21.60, 53.10, "Ostrołęka"), (21.10, 52.95, "north of Pułtusk"), (20.60, 52.65, "Nasielsk"), (20.28, 52.40, "the Bzura's mouth")] + BZURA_NIDA[4:9] +
      [(20.60, 51.35, "west of Radom"), (21.20, 51.10, "Iłża"), (21.75, 51.00, "the Vistula at Józefów"), (22.25, 51.00, "north of Kraśnik"),
       (23.17, 50.95, "Krasnystaw"), (23.90, 50.80, "Hrubieszów")] + GALICIA_1915_06,
      [[21.6, 57.6], [19.0, 57.5]], [[21.6, 57.6], [20.8, 58.6], [21.5, 60.0], [26.0, 61.0]], SOUTH_CP_15[:-1], SOUTH_RU_15)
front("east-1915-07", "After the fall of Lublin, Chełm, Ivangorod, and Warsaw (30 July to 5 August 1915), to the fall of Kovno (18 August): Mitau taken (1 August).",
      [(23.50, 56.97, "Ķemeri"), (23.72, 56.75, "north of Mitau"), (24.20, 56.45, "Bauska"), (24.40, 55.75, "Panevėžys"), (23.95, 55.10, "west of Kovno"),
       (23.40, 54.55, "Marijampolė"), (23.00, 54.10, "Suwałki"), (22.60, 53.65, "Grajewo"), (22.15, 53.20, "Łomża"), (21.90, 52.75, "Wyszków"),
       (21.30, 52.25, "east of Warsaw"), (21.70, 51.90, "Garwolin"), (22.30, 51.55, "Lubartów"), (23.10, 51.35, "Łęczna"), (23.60, 51.10, "east of Chełm"),
       (24.10, 50.80, "the Bug at Ustyluh")] + GALICIA_1915_06[1:],
      N_KEMERI_CP, N_KEMERI_RU, south_cp=[[25.9, 47.8], [24.0, 45.0], [5.0, 44.0], [5.0, 62.0], [19.0, 62.0]], south_ru=[[27.0, 48.0], [29.0, 45.5], [45.0, 44.0], [45.0, 66.0], [26.0, 66.0]])
STRYPA = [(25.50, 49.90, "the border at Pochaiv"), (25.30, 49.65, "east of Zboriv"), (25.30, 49.30, "the Strypa"), (25.39, 49.07, "Buchach"),
          (25.60, 48.75, "the Dniester"), (25.85, 48.45, "north of Czernowitz"), (26.10, 48.33, "Rarancza, Bukovina's border")]
front("east-1915-08", "After the fall of Kovno, Novogeorgievsk, Brest-Litovsk, Grodno, and Lutsk (18 August to 2 September 1915), before Vilna fell (19 September).",
      [(23.50, 56.97, "Ķemeri"), (23.95, 56.80, "Olaine"), (24.55, 56.80, "the Dvina at Ikšķile"), (25.25, 56.60, "Aizkraukle"), (25.55, 56.20, "Rokiškis"),
       (25.10, 55.50, "Ukmergė"), (24.90, 54.90, "west of Vilna"), (24.60, 54.40, "Varėna"), (24.30, 53.75, "east of Grodno"), (24.50, 53.10, "Volkovysk"),
       (25.00, 52.60, "Pruzhany"), (25.40, 52.20, "Bereza"), (25.60, 51.80, "the Pripyat"), (25.66, 51.10, "Kolki"), (25.55, 50.80, "east of Lutsk"),
       (25.75, 50.45, "Dubno")] + STRYPA,
      N_KEMERI_CP, N_KEMERI_RU, south_cp=[[25.9, 47.8], [24.0, 45.0], [5.0, 44.0], [5.0, 62.0], [19.0, 62.0]], south_ru=[[27.0, 48.0], [29.0, 45.5], [45.0, 44.0], [45.0, 66.0], [26.0, 66.0]])
DVINA_1915 = [(23.50, 56.97, "Ķemeri"), (23.94, 56.79, "Olaine, south of Riga's bridgehead"), (24.55, 56.80, "the Dvina at Ikšķile"), (24.81, 56.72, "Lielvārde"),
              (25.25, 56.60, "Aizkraukle"), (25.80, 56.47, "Jēkabpils, the bridgehead"), (26.25, 56.10, "the Dvina"), (26.30, 55.98, "Illukste"),
              (26.40, 55.80, "west of Dvinsk's bridgehead"), (26.65, 55.60, "Lake Drisvyaty")]
BELARUS_1915 = [(26.80, 55.30, "Vidzy"), (26.75, 55.08, "west of Postavy"), (26.65, 54.92, "Lake Naroch"), (26.38, 54.50, "west of Smorgon"),
                (26.25, 54.30, "Krevo"), (25.95, 53.95, "the upper Neman"), (26.15, 53.40, "Gorodishche"), (26.12, 53.10, "east of Baranovichi"),
                (26.05, 52.70, "Lake Vyhanaw"), (26.20, 52.15, "east of Pinsk"), (25.90, 51.80, "the Pripyat marshes"), (25.70, 51.35, "the Styr")]
VOLHYNIA_1915 = [(25.66, 51.10, "Kolki"), (25.70, 50.85, "Olyka"), (25.80, 50.55, "west of Rivne"), (25.85, 50.40, "east of Dubno"), (25.70, 50.15, "west of Kremenets")]
front("east-1915-09", "From the fall of Vilna (19 September 1915) to the Brusilov offensive (4 June 1916): the line from the Gulf of Riga to Bukovina, with Russia holding Riga, Dvinsk, and Tarnopol.",
      DVINA_1915 + BELARUS_1915 + VOLHYNIA_1915 + STRYPA,
      N_KEMERI_CP, N_KEMERI_RU, south_cp=[[25.9, 47.8], [24.0, 45.0], [5.0, 44.0], [5.0, 62.0], [19.0, 62.0]], south_ru=[[27.0, 48.0], [29.0, 45.5], [45.0, 44.0], [45.0, 66.0], [26.0, 66.0]])
STOKHID = [(25.70, 51.35, "the Styr"), (25.30, 51.40, "the Stokhid"), (24.95, 51.15, "east of Kovel"), (24.90, 50.78, "Zaturtsi"), (24.77, 50.50, "Gorokhov")]
front("east-1916-06", "During the Brusilov offensive (from 4 June 1916): Lutsk (7 June), Czernowitz (17 June), and Bukovina taken.",
      DVINA_1915 + BELARUS_1915 + STOKHID + [(24.95, 50.25, "Leshniv"), (25.20, 49.95, "west of Brody")] + STRYPA[1:5] +
      [(25.20, 48.75, "the Dniester"), (25.05, 48.50, "Kolomyia"), (25.10, 48.20, "Kuty"), (24.95, 47.75, "Kirlibaba"), (25.35, 47.40, "Vatra Dornei, the Romanian border")],
      N_KEMERI_CP, N_KEMERI_RU, south_cp=[[25.0, 47.2], [24.0, 45.0], [5.0, 44.0], [5.0, 62.0], [19.0, 62.0]], south_ru=[[26.2, 47.3], [29.0, 45.5], [45.0, 44.0], [45.0, 66.0], [26.0, 66.0]])
GALICIA_1916_08 = [(24.77, 50.50, "Gorokhov"), (24.95, 50.00, "west of Brody"), (25.00, 49.65, "west of Zboriv"), (25.05, 49.45, "east of Berezhany"),
                   (24.95, 49.25, "the Zlota Lipa"), (24.78, 49.12, "east of Halych"), (24.62, 48.92, "west of Stanislau"), (24.55, 48.62, "Nadvirna"),
                   (24.60, 48.20, "the Carpathian crest"), (24.95, 47.75, "Kirlibaba"), (25.35, 47.40, "Vatra Dornei")]
front("east-1916-08", "From the fall of Stanislau (10 August 1916) to the German counter-offensive in Galicia (19 July 1917).",
      DVINA_1915 + BELARUS_1915 + STOKHID[:-1] + GALICIA_1916_08,
      N_KEMERI_CP, N_KEMERI_RU, south_cp=[[25.0, 47.2], [24.0, 45.0], [5.0, 44.0], [5.0, 62.0], [19.0, 62.0]], south_ru=[[26.2, 47.3], [29.0, 45.5], [45.0, 44.0], [45.0, 66.0], [26.0, 66.0]])
ZBRUCH_1917 = [(24.77, 50.50, "Gorokhov"), (24.95, 50.25, "Leshniv")] + ZBRUCH_B + [(26.60, 48.25, "Bukovina's border with Bessarabia")]
front("east-1917-07", "After the German counter-offensive in Galicia (19 July to 3 August 1917): Russia back at the frontier, before Riga fell.",
      DVINA_1915 + BELARUS_1915 + STOKHID[:-1] + ZBRUCH_1917,
      N_KEMERI_CP, N_KEMERI_RU, south_cp=[[26.3, 47.9], [24.0, 45.0], [5.0, 44.0], [5.0, 62.0], [19.0, 62.0]], south_ru=[[27.2, 48.0], [29.0, 45.5], [45.0, 44.0], [45.0, 66.0], [26.0, 66.0]])
RIGA_1917 = [(24.35, 57.25, "the coast north of Riga"), (24.60, 57.10, "the Livonian Aa"), (24.95, 56.90, "Suntaži"), (25.25, 56.60, "Aizkraukle"),
             (25.80, 56.47, "Jēkabpils"), (26.25, 56.10, "the Dvina"), (26.30, 55.98, "Illukste"), (26.40, 55.80, "west of Dvinsk"), (26.65, 55.60, "Lake Drisvyaty")]
front("east-1917-09", "After Riga fell (3 September 1917), before the islands of the Gulf of Riga were taken.",
      RIGA_1917 + BELARUS_1915 + STOKHID[:-1] + ZBRUCH_1917,
      [[24.0, 57.4], [22.45, 57.85], [21.4, 57.75], [19.0, 57.5]], [[24.0, 57.4], [22.45, 57.85], [21.4, 57.75], [20.8, 58.6], [21.5, 60.0], [26.0, 61.0]],
      south_cp=[[26.3, 47.9], [24.0, 45.0], [5.0, 44.0], [5.0, 62.0], [19.0, 62.0]], south_ru=[[27.2, 48.0], [29.0, 45.5], [45.0, 44.0], [45.0, 66.0], [26.0, 66.0]])
front("east-1917-10", "After the islands of the Gulf of Riga were taken (Operation Albion, 12 to 20 October 1917), to the German advance of February 1918.",
      RIGA_1917 + BELARUS_1915 + STOKHID[:-1] + ZBRUCH_1917,
      [[24.0, 57.6], [23.35, 58.55], [23.15, 59.0], [22.5, 59.4], [19.0, 59.0]], [[24.0, 57.6], [23.35, 58.55], [23.15, 59.0], [22.5, 59.4], [24.0, 60.2], [26.0, 61.0]],
      south_cp=[[26.3, 47.9], [24.0, 45.0], [5.0, 44.0], [5.0, 62.0], [19.0, 62.0]], south_ru=[[27.2, 48.0], [29.0, 45.5], [45.0, 44.0], [45.0, 66.0], [26.0, 66.0]])
NORTH_1918 = [(28.15, 59.45, "the Gulf of Finland east of Narva"), (28.30, 58.95, "the Narva"), (27.95, 58.70, "Lake Peipus"), (28.10, 58.10, "Lake Pskov"),
              (28.45, 57.85, "east of Pskov"), (28.55, 57.30, "Ostrov"), (28.70, 56.70, "Opochka"), (28.75, 56.20, "Sebezh"), (28.95, 55.60, "east of Polotsk"),
              (29.70, 55.05, "west of Vitebsk"), (30.50, 54.50, "east of Orsha"), (30.50, 53.90, "east of Mogilev"), (30.90, 53.20, "Rogachev"),
              (31.20, 52.45, "east of Gomel")]
front("east-1918-02", "After the German advance of February 1918 (Operation Faustschlag, from 18 February: Dvinsk, Minsk, Pskov, Reval) and before Kiev was entered (1 March).",
      NORTH_1918 + [(30.80, 51.90, "the Pripyat's mouth"), (29.50, 51.50, "Ovruch"), (28.50, 51.30, "Sarny"), (27.80, 51.55, "the Pripyat")] +
      [(26.80, 51.55, "the Styr"), (25.70, 51.35, "the Styr")] + STOKHID[1:-1] + ZBRUCH_1917,
      [[27.5, 60.0], [22.0, 60.0], [19.0, 59.0]], [[27.5, 60.0], [28.5, 61.0], [26.0, 61.0]],
      south_cp=[[26.3, 47.9], [24.0, 45.0], [5.0, 44.0], [5.0, 62.0], [19.0, 62.0], [22.0, 62.0]], south_ru=[[27.2, 48.0], [29.0, 45.5], [45.0, 44.0], [45.0, 66.0], [30.0, 66.0]])
front("east-1918-03", "March 1918: Ukraine west of the Dnieper, with Kiev (1 March), Odessa (13 March), and Kherson (by 19 March), held by German and Austro-Hungarian troops.",
      NORTH_1918 + [(31.40, 51.50, "east of Chernihiv"), (30.75, 50.45, "east of Kiev"), (31.60, 49.50, "the Dnieper at Cherkasy"),
                    (33.40, 49.05, "Kremenchuk"), (34.50, 48.50, "the Dnieper"), (34.20, 47.55, "Nikopol"), (32.60, 46.65, "Kherson"), (32.40, 46.40, "the Dnieper's mouth")],
      [[27.5, 60.0], [22.0, 60.0], [19.0, 59.0]], [[27.5, 60.0], [28.5, 61.0], [26.0, 61.0]],
      south_cp=[[31.5, 45.0], [24.0, 44.0], [5.0, 44.0], [5.0, 62.0], [19.0, 62.0], [22.0, 62.0]], south_ru=[[33.0, 45.5], [45.0, 44.0], [45.0, 66.0], [30.0, 66.0]])
front("east-1918-04", "April 1918: Ukraine east of the Dnieper too, with Poltava, Kharkov (8 April), and Yekaterinoslav; Crimea not yet entered.",
      NORTH_1918 + [(32.20, 52.20, "Novhorod-Siverskyi"), (33.30, 51.40, "Konotop"), (34.80, 50.95, "Sumy"), (36.40, 50.05, "east of Kharkov"),
                    (37.30, 49.10, "Izium"), (36.70, 48.10, "the Donets basin"), (35.70, 47.10, "east of Melitopol"), (35.30, 46.45, "the Sea of Azov"),
                    (34.70, 45.90, "the Sivash"), (33.70, 46.10, "Perekop"), (33.0, 46.0, "the Black Sea")],
      [[27.5, 60.0], [22.0, 60.0], [19.0, 59.0]], [[27.5, 60.0], [28.5, 61.0], [26.0, 61.0]],
      south_cp=[[31.5, 45.0], [24.0, 44.0], [5.0, 44.0], [5.0, 62.0], [19.0, 62.0], [22.0, 62.0]], south_ru=[[34.0, 44.0], [45.0, 44.0], [45.0, 66.0], [30.0, 66.0]])
front("east-1918-05", "From May 1918 (Sevastopol, 1 May; Rostov, 8 May) to the armistice: Ukraine, Crimea, the Donets basin, Taganrog, and Rostov.",
      NORTH_1918 + [(31.90, 52.60, "Novozybkov"), (33.30, 52.35, "Starodub"), (34.30, 51.90, "Rylsk"), (35.60, 51.30, "Sudzha"), (36.90, 50.60, "east of Belgorod"),
                    (38.10, 50.15, "Valuyki"), (39.40, 49.50, "Starobilsk"), (40.20, 48.30, "the Donets"), (40.20, 47.40, "Novocherkassk"),
                    (39.85, 47.10, "east of Rostov"), (39.30, 46.95, "the Don's mouth")],
      [[27.5, 60.0], [22.0, 60.0], [19.0, 59.0]], [[27.5, 60.0], [28.5, 61.0], [26.0, 61.0]],
      south_cp=[[38.0, 45.5], [32.0, 44.0], [24.0, 44.0], [5.0, 44.0], [5.0, 62.0], [19.0, 62.0], [22.0, 62.0]], south_ru=[[39.0, 46.3], [45.0, 44.0], [45.0, 66.0], [30.0, 66.0]])

# The occupied land of Russia, divided among the administrations (rings drawn wide outside Russia's
# own land, which is all they are cut from).
W_OBER_OST = [[16, 54.2], [16, 66], [40, 66], [40, 51.9], [25.5, 51.9], [24.5, 51.75], [23.6, 51.6], [23.65, 52.08], [22.65, 52.40], [22.55, 52.85], [22.7, 53.25], [22.45, 53.62], [21.9, 53.48]]
W_WARSAW = [[16, 54.2], [21.9, 53.48], [22.45, 53.62], [22.7, 53.25], [22.55, 52.85], [22.65, 52.40], [23.65, 52.08], [23.6, 51.6],
            [23.0, 51.65], [22.5, 51.75], [21.9, 51.65], [21.2, 51.83], [20.6, 51.6], [20.2, 51.45], [19.9, 51.05], [19.5, 50.75], [19.35, 50.35], [16, 50.0]]
W_LUBLIN = [[16, 50.0], [19.35, 50.35], [19.5, 50.75], [19.9, 51.05], [20.2, 51.45], [20.6, 51.6], [21.2, 51.83], [21.9, 51.65], [22.5, 51.75], [23.0, 51.65],
            [23.6, 51.6], [23.9, 51.2], [24.15, 50.85], [24.3, 50.4], [24.0, 47.0], [16, 47.0]]
W_VOLHYNIA = [[23.6, 51.6], [24.5, 51.75], [25.5, 51.9], [28.0, 51.9], [28.0, 49.5], [24.3, 50.4], [24.15, 50.85], [23.9, 51.2]]
# Ukraine in 1918, between the Austro-Hungarian zone (Podolia and Kherson, west of the Dnieper's lower
# course) and the German (the rest, with Crimea); east of the Dniester, so that Bessarabia, Romanian
# from 1918, is in neither.
UKR_SPLIT = [[24.0, 50.3], [26.0, 50.1], [28.6, 49.9], [31.0, 48.7], [33.5, 47.5], [33.2, 46.3], [31.6, 45.9], [30.3, 45.6]]
W_UKRAINE_AH = UKR_SPLIT + [[30.25, 45.9], [29.6, 46.45], [28.8, 47.6], [28.0, 48.3], [27.2, 48.45], [26.6, 48.25]]
W_UKRAINE_DE = [[23.6, 51.6], [25.5, 51.9], [33.0, 52.2], [42.0, 52.2], [42.0, 44.0], [30.3, 44.0]] + list(reversed(UKR_SPLIT))
W_BELARUS_1918 = [[16, 54.2], [16, 66], [40, 66], [40, 52.2], [33.0, 52.2], [25.5, 51.9], [24.5, 51.75], [23.6, 51.6], [23.65, 52.08], [22.65, 52.40], [22.55, 52.85], [22.7, 53.25], [22.45, 53.62], [21.9, 53.48]]

EAST_STAGES = [("1914-08-17", "1914-09-02", "east-1914-08"), ("1914-09-03", "1914-11-06", "east-1914-09"), ("1914-11-07", "1914-12-05", "east-1914-11"),
               ("1914-12-06", "1915-02-21", "east-1914-12"), ("1915-02-22", "1915-05-01", "east-1915-02"), ("1915-05-02", "1915-06-21", "east-1915-05"),
               ("1915-06-22", "1915-07-29", "east-1915-06"), ("1915-07-30", "1915-08-17", "east-1915-07"), ("1915-08-18", "1915-09-18", "east-1915-08"),
               ("1915-09-19", "1916-06-06", "east-1915-09"), ("1916-06-07", "1916-08-09", "east-1916-06"), ("1916-08-10", "1917-07-18", "east-1916-08"),
               ("1917-07-19", "1917-09-02", "east-1917-07"), ("1917-09-03", "1917-10-11", "east-1917-09"), ("1917-10-12", "1918-02-17", "east-1917-10"),
               ("1918-02-18", "1918-02-28", "east-1918-02"), ("1918-03-01", "1918-03-31", "east-1918-03"), ("1918-04-01", "1918-04-30", "east-1918-04"),
               ("1918-05-01", "1918-11-11", "east-1918-05")]
for a, b, k in EAST_STAGES:
    within(k + "-oberost", k + "-cp", W_OBER_OST if a < "1918-02-18" else W_BELARUS_1918, "The German-held land of Russia north and east of the General Government of Warsaw (Courland, Lithuania, Białystok–Grodno, and from 1918 Livonia, Estonia, and Belarus)")
    within(k + "-warsaw", k + "-cp", W_WARSAW, "The German-held land of Russian Poland north of the Pilica, to the Bug")
    within(k + "-lublin", k + "-cp", W_LUBLIN, "The Austro-Hungarian-held land of Russian Poland, south of the Pilica")
    within(k + "-volhynia", k + "-cp", W_VOLHYNIA, "The Austro-Hungarian-held land of Volhynia")
    if a >= "1918-03-01":
        within(k + "-ukraine-de", k + "-cp", W_UKRAINE_DE, "The German-held land of Ukraine and the Don")
        within(k + "-ukraine-ah", k + "-cp", W_UKRAINE_AH, "The Austro-Hungarian-held land of Ukraine (Podolia, Kherson)")

def stages(suffix, frm="0000", to="9999"):
    out = []
    for a, b, k in EAST_STAGES:
        if b < frm or a > to: continue
        out.append((max(a, frm), min(b, to), k + suffix))
    return out

zone("ober-ost", "Ober Ost", "Ober Ost", "255", ["365"], stages("-oberost", "1915-05-07") + [("1918-11-12", "1918-12-09", "east-1918-05-oberost")], cap=["Kaunas", 23.903, 54.898],
     note="Held to the armistice, and in Belarus until the Red Army entered Minsk (10 December 1918); the Baltic states and Poland are CShapes' own from November 1918.")
zone("poland-de-1914", "German-occupied Poland", "General Government of Warsaw", "255", ["365"], stages("-warsaw", "1914-08-17", "1915-08-23"))
zone("poland-de", "Government General of Warsaw", "Government General of Warsaw", "255", ["365"], stages("-warsaw", "1915-08-24", "1918-11-10"), cap=["Warsaw", 21.012, 52.230])
zone("poland-ah-1914", "Austro-Hungarian-occupied Poland", "Military General Government of Lublin", "300", ["365"], stages("-lublin", "1914-08-17", "1915-08-24"))
zone("poland-ah", "Military Government of Lublin", "Military General Government of Lublin", "300", ["365"], stages("-lublin", "1915-08-25", "1918-11-10"), cap=["Lublin", 22.568, 51.246],
     note="Set up on 25 August 1915 as the General Government of Kielce, it moved to Lublin on 1 October 1915.")
zone("volhynia-ah", "Occupied Volhynia", "Volhynian Governorate", "300", ["365"], stages("-volhynia", "1915-08-18", "1918-02-28"))
zone("ukraine-de", "Ukraine", "1918 Central Powers occupation of Ukraine", "255", ["365"], stages("-ukraine-de", "1918-03-01") + [("1918-11-12", "1918-12-14", "east-1918-05-ukraine-de")], cap=["Kiev", 30.523, 50.450],
     note="The Ukrainian People's Republic and, from 29 April 1918, the Ukrainian State (the Hetmanate), under German and Austro-Hungarian occupation until the Hetmanate fell (14 December 1918).")
zone("lithuania", "Lithuania", "Kingdom of Lithuania (1918)", "255", ["368"], [("1918-02-16", "1918-11-11", "all")],
     note="CShapes counts Lithuania independent from its declaration of 16 February 1918; it stayed under German occupation until the armistice.")
zone("ukraine-ah", "Ukraine (Austro-Hungarian)", "1918 Central Powers occupation of Ukraine", "300", ["365"], stages("-ukraine-ah", "1918-03-01", "1918-11-03"))
zone("east-prussia", "Russian-occupied East Prussia", "Russian invasion of East Prussia (1914)", "365", ["255"], [("1914-08-17", "1914-09-13", "east-1914-08-ru"), ("1914-11-01", "1914-11-06", "east-1914-11-ru")] + stages("-ru", "1914-11-07", "1915-02-21"))
zone("galicia", "General Government of Galicia and Bukovina", "General Government of Galicia and Bukovina", "365", ["300"], stages("-ru", "1914-08-21", "1915-06-21") + stages("-ru", "1915-06-22", "1917-08-02"))
