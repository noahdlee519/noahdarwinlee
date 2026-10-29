# Usage: python3 gen.py <Natural Earth's ne_10m_admin_1_states_provinces.geojson> (needs shapely)
# Writes chronia/tools/occupations.json: the occupations of the First World War.
# An area is the occupier's side of a front: the front line (each point with the place it stands
# for), closed round through land that is not the occupied state's (it is only ever intersected
# with the occupied states' shapes).
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) < 2: sys.exit('usage: python3 gen.py <ne_10m_admin_1_states_provinces.geojson>')
NE_PATH = sys.argv[1]

AREAS, ZONES = {}, []

def area(key, note, line, close):
    ring = [list(p) for p in line] + [[x, y] for x, y in close]
    AREAS[key] = {"note": note, "ring": ring}

def zone(key, name, wiki, by, of, periods, cap=None, note=None):
    z = {"key": key, "name": name, "wiki": wiki, "by": by, "of": of, "periods": [{"from": a, "to": b, "area": k} for a, b, k in periods]}
    if cap: z["cap"] = cap
    if note: z["note"] = note
    ZONES.append(z)

# ---------------------------------------------------------------- the Western Front
# The German side: east of the line, closed through Switzerland, Germany, and the North Sea.
WEST_CLOSE = [[7.0, 47.2], [13.0, 47.2], [13.0, 56.0], [2.3, 51.7]]

# The Yser to the Swiss border, as it stood from the end of the race to the sea (November 1914)
# to the German withdrawal to the Hindenburg Line (March 1917).
YSER = [(2.77, 51.16, "Yser mouth, east of Nieuport"), (2.80, 51.10, "Yser at Sint-Joris"), (2.84, 51.04, "Tervate, Yser bend"),
        (2.845, 51.02, "west of Diksmuide"), (2.85, 50.97, "Noordschote"), (2.865, 50.925, "Steenstrate")]
YPRES_1915 = [(2.885, 50.895, "Boezinge"), (2.92, 50.875, "Wieltje"), (2.95, 50.848, "Hooge"), (2.93, 50.823, "Hill 60"),
              (2.893, 50.805, "Sint-Elooi"), (2.872, 50.783, "west of Wijtschate"), (2.875, 50.758, "west of Mesen"),
              (2.895, 50.728, "Ploegsteert Wood"), (2.935, 50.703, "Frelinghien")]
ARTOIS_1915 = [(2.915, 50.67, "Houplines"), (2.87, 50.64, "Bois-Grenier"), (2.83, 50.61, "west of Fromelles"),
               (2.79, 50.585, "Neuve-Chapelle"), (2.75, 50.555, "Festubert"), (2.76, 50.522, "Givenchy-lès-la-Bassée"),
               (2.79, 50.49, "Cuinchy"), (2.795, 50.455, "Loos"), (2.79, 50.42, "west of Lens"), (2.765, 50.38, "Souchez, below Vimy Ridge"),
               (2.76, 50.345, "Neuville-Saint-Vaast"), (2.79, 50.31, "Roclincourt"), (2.82, 50.28, "east of Arras")]
SOMME_1915 = [(2.79, 50.24, "Beaurains"), (2.71, 50.185, "Ransart"), (2.655, 50.15, "Gommecourt"), (2.66, 50.11, "Hébuterne, Serre"),
              (2.665, 50.075, "Beaumont-Hamel"), (2.69, 50.04, "Thiepval"), (2.71, 50.01, "La Boisselle"), (2.745, 49.99, "Mametz"),
              (2.79, 49.975, "Maricourt"), (2.83, 49.94, "Frise"), (2.80, 49.89, "Dompierre"), (2.75, 49.83, "Lihons"),
              (2.72, 49.75, "Andechy"), (2.75, 49.69, "west of Roye"), (2.82, 49.60, "Lassigny"), (2.93, 49.52, "Ribécourt"),
              (3.03, 49.46, "Tracy-le-Mont"), (3.13, 49.42, "north of Vic-sur-Aisne"), (3.30, 49.405, "Crouy, north of Soissons"),
              (3.48, 49.43, "Vailly"), (3.65, 49.45, "Chemin des Dames"), (3.79, 49.43, "Craonne"), (3.92, 49.39, "Berry-au-Bac")]
CHAMPAGNE = [(4.00, 49.31, "west of Brimont"), (4.09, 49.265, "La Pompelle"), (4.27, 49.20, "Prosnes"), (4.43, 49.19, "Auberive"),
             (4.55, 49.18, "Souain"), (4.70, 49.20, "Mesnil-lès-Hurlus, Massiges"), (4.86, 49.20, "Ville-sur-Tourbe"),
             (4.95, 49.21, "Vienne-le-Château"), (5.04, 49.22, "south of Varennes"), (5.08, 49.20, "Vauquois")]
VERDUN = [(5.18, 49.23, "Malancourt"), (5.28, 49.26, "Forges"), (5.36, 49.27, "Brabant-sur-Meuse"), (5.45, 49.24, "Ornes"),
          (5.52, 49.17, "Eix"), (5.60, 49.07, "Les Éparges")]
ST_MIHIEL = [(5.55, 48.98, "Spada"), (5.52, 48.90, "Chauvoncourt, west of Saint-Mihiel"), (5.60, 48.87, "Apremont"),
             (5.73, 48.85, "Seicheprey"), (5.85, 48.88, "Flirey"), (5.97, 48.89, "Fey-en-Haye")]
LORRAINE = [(6.07, 48.92, "north of Pont-à-Mousson"), (6.20, 48.85, "Nomeny"), (6.30, 48.79, "Moncel"), (6.55, 48.66, "Parroy"),
            (6.75, 48.55, "Domèvre"), (6.88, 48.48, "Badonviller"), (6.98, 48.40, "Celles"), (7.03, 48.32, "Ban-de-Sapt"),
            (7.08, 48.23, "Wisembach")]
VOSGES = [(7.10, 48.17, "Col du Bonhomme"), (7.14, 48.09, "the Linge"), (7.15, 48.00, "Metzeral"), (7.16, 47.90, "Hartmannswillerkopf"),
          (7.15, 47.82, "between Thann and Cernay"), (7.13, 47.75, "Burnhaupt"), (7.17, 47.66, "Ammertzwiller"),
          (7.19, 47.56, "Largitzen"), (7.17, 47.49, "Pfetterhouse, at the Swiss border")]

area("west-1914-08", "Belgium east of the line from Antwerp to the French border, which the Germans held from the fall of Brussels (20 August 1914) until Antwerp fell; in France, the land behind the German front of 5 September 1914 at the Marne.",
     [(4.95, 51.45, "Dutch border north of Antwerp's forts"), (4.57, 51.13, "Lier"), (4.48, 51.02, "east of Mechelen"),
      (4.10, 51.00, "Dendermonde"), (4.04, 50.93, "Aalst"), (3.60, 50.85, "Oudenaarde"), (3.39, 50.61, "Tournai"),
      (3.08, 50.37, "Douai"), (2.93, 49.93, "Péronne"), (2.83, 49.42, "Compiègne"), (2.59, 49.21, "Senlis"),
      (2.88, 48.96, "Meaux"), (3.08, 48.81, "Coulommiers"), (3.72, 48.72, "Sézanne"), (4.58, 48.72, "Vitry-le-François"),
      (4.98, 48.83, "Revigny"), (5.07, 49.11, "Clermont-en-Argonne"), (5.14, 49.27, "Montfaucon"), (5.29, 49.29, "Consenvoye"),
      (5.48, 49.25, "Ornes"), (5.64, 49.21, "Étain"), (5.86, 48.96, "Thiaucourt"), (6.20, 48.88, "Nomeny"),
      (6.50, 48.59, "Lunéville"), (6.74, 48.45, "Baccarat"), (6.95, 48.28, "Saint-Dié")] + VOSGES, WEST_CLOSE)
area("west-1914-09", "After the Battle of the Marne (to 13 September 1914): France behind the Aisne front, the race to the sea not yet run; Belgium east of Antwerp's line as before.",
     [(4.95, 51.45, "Dutch border north of Antwerp's forts"), (4.57, 51.13, "Lier"), (4.48, 51.02, "east of Mechelen"),
      (4.10, 51.00, "Dendermonde"), (4.04, 50.93, "Aalst"), (3.60, 50.85, "Oudenaarde"), (3.39, 50.61, "Tournai"),
      (3.08, 50.37, "Douai"), (2.79, 50.24, "Beaurains")] + SOMME_1915[1:] + CHAMPAGNE + VERDUN +
     [(5.55, 48.98, "Spada"), (5.52, 48.90, "Saint-Mihiel, taken 24 September"), (5.60, 48.87, "Apremont")] + ST_MIHIEL[3:] + LORRAINE + VOSGES, WEST_CLOSE)
area("west-1914-10", "After Antwerp fell (10 October 1914): all of Belgium but the corner west of the Yser and Ypres; France as before.",
     YSER + [(2.885, 50.895, "Boezinge"), (2.97, 50.87, "Zonnebeke, October 1914"), (2.98, 50.84, "Gheluvelt"), (2.93, 50.80, "Wijtschate"),
             (2.90, 50.75, "Mesen")] + ARTOIS_1915 + SOMME_1915 + CHAMPAGNE + VERDUN + ST_MIHIEL + LORRAINE + VOSGES, WEST_CLOSE)
area("west-1915", "The Western Front from the end of the race to the sea (November 1914) to the withdrawal to the Hindenburg Line (March 1917), with the Ypres salient of after May 1915.",
     YSER + YPRES_1915 + ARTOIS_1915 + SOMME_1915 + CHAMPAGNE + VERDUN + ST_MIHIEL + LORRAINE + VOSGES, WEST_CLOSE)
HINDENBURG = [(2.86, 50.36, "east of Vimy Ridge, taken April 1917"), (2.89, 50.30, "Gavrelle"), (2.89, 50.27, "Monchy-le-Preux"),
              (2.93, 50.19, "Bullecourt"), (3.03, 50.18, "Quéant"), (3.07, 50.15, "Mœuvres"), (3.09, 50.11, "Havrincourt"),
              (3.15, 50.04, "Villers-Guislain"), (3.24, 49.96, "Bellicourt"), (3.21, 49.86, "Holnon, west of Saint-Quentin"),
              (3.30, 49.79, "Urvillers"), (3.36, 49.75, "Moy"), (3.36, 49.66, "Travecy, south of La Fère"), (3.30, 49.57, "Barisis"),
              (3.45, 49.51, "Anizy-le-Château"), (3.53, 49.48, "Chavignon, on the Ailette"), (3.70, 49.47, "the Ailette"), (3.80, 49.45, "Craonne"),
              (3.92, 49.39, "Berry-au-Bac")]
YPRES_1917 = [(2.885, 50.90, "Boezinge"), (2.97, 50.93, "Poelkapelle"), (3.02, 50.90, "Passchendaele"), (3.00, 50.84, "Gheluvelt"),
              (2.97, 50.80, "Zandvoorde"), (2.96, 50.76, "Warneton, after Messines"), (2.94, 50.71, "Frelinghien")]
area("west-1917", "The Hindenburg Line, from the German withdrawal (16 March 1917) to the Spring Offensive, with the Allied gains of 1917 at Arras and Vimy (April), Messines (June), Passchendaele (November), and the Chemin des Dames (to the Ailette, October).",
     YSER + YPRES_1917 + ARTOIS_1915[:9] + HINDENBURG + CHAMPAGNE + VERDUN + ST_MIHIEL + LORRAINE + VOSGES, WEST_CLOSE)
LYS_1918 = [(2.89, 50.86, "Ypres, east of the town"), (2.86, 50.81, "Voormezele"), (2.81, 50.78, "Kemmel, German"), (2.76, 50.78, "Locre"),
            (2.69, 50.74, "Meteren"), (2.62, 50.70, "Nieppe forest, east edge"), (2.60, 50.64, "Merville, German"), (2.56, 50.59, "Robecq"),
            (2.66, 50.55, "Hinges"), (2.75, 50.53, "Givenchy")]
SOMME_1918 = [(2.79, 50.49, "Cuinchy"), (2.80, 50.43, "Lens"), (2.78, 50.36, "Vimy"), (2.84, 50.30, "east of Arras"), (2.74, 50.21, "Boiry"),
              (2.71, 50.14, "Bucquoy"), (2.63, 50.06, "Hébuterne, Colincamps"), (2.62, 50.00, "west of Albert"), (2.58, 49.89, "Hamel"),
              (2.52, 49.86, "Villers-Bretonneux"), (2.51, 49.83, "Hangard"), (2.48, 49.77, "Moreuil"), (2.53, 49.69, "Mesnil-Saint-Georges"),
              (2.57, 49.64, "west of Montdidier"), (2.70, 49.59, "Rollot"), (2.84, 49.58, "Lassigny"), (2.95, 49.52, "Ribécourt"),
              (3.05, 49.48, "Tracy-le-Mont"), (3.20, 49.43, "Vic-sur-Aisne")]
area("west-1918-03", "After the German offensives of March and April 1918 (Michael and the Lys): the bulge towards Amiens and Montdidier, and Kemmel and Merville in Flanders.",
     YSER[:5] + [(2.86, 50.93, "Merkem"), (2.88, 50.88, "north of Ypres")] + LYS_1918 + SOMME_1918 +
     [(3.30, 49.405, "north of Soissons"), (3.48, 49.43, "Vailly"), (3.65, 49.45, "Chemin des Dames"), (3.80, 49.43, "Craonne"), (3.92, 49.39, "Berry-au-Bac")] +
     CHAMPAGNE + VERDUN + ST_MIHIEL + LORRAINE + VOSGES, WEST_CLOSE)
MARNE_1918 = [(2.70, 49.56, "the Matz, Méry"), (2.85, 49.47, "Machemont"), (3.00, 49.40, "Moulin-sous-Touvent"), (3.10, 49.36, "Ambleny"),
              (3.20, 49.28, "Longpont"), (3.26, 49.18, "Neuilly-Saint-Front"), (3.31, 49.11, "Bouresches, Belleau Wood"), (3.40, 49.04, "Château-Thierry, German"),
              (3.53, 49.05, "Mézy"), (3.64, 49.07, "Dormans"), (3.80, 49.10, "Châtillon-sur-Marne"), (3.88, 49.18, "Bligny"),
              (3.95, 49.23, "west of Reims"), (4.04, 49.28, "north of Reims")]
area("west-1918-05", "The furthest German advance, after the offensives on the Aisne (27 May 1918) and the Matz (June), to the Allied counterattack of 18 July 1918.",
     YSER[:5] + [(2.86, 50.93, "Merkem"), (2.88, 50.88, "north of Ypres")] + LYS_1918 + SOMME_1918[:16] + MARNE_1918 + CHAMPAGNE[1:] + VERDUN + ST_MIHIEL + LORRAINE + VOSGES, WEST_CLOSE)
area("west-1918-07", "After the Second Battle of the Marne (18 July to 6 August 1918): back to the Vesle; the bulge towards Amiens still German.",
     YSER[:5] + [(2.86, 50.93, "Merkem"), (2.88, 50.88, "north of Ypres")] + LYS_1918 + SOMME_1918[:17] +
     [(3.10, 49.42, "the Aisne at Vic"), (3.33, 49.38, "Soissons, freed 2 August"), (3.52, 49.33, "Braine"), (3.68, 49.31, "Fismes, on the Vesle"),
      (3.85, 49.30, "Jonchery"), (4.00, 49.29, "north-west of Reims")] + CHAMPAGNE[1:] + VERDUN + ST_MIHIEL + LORRAINE + VOSGES, WEST_CLOSE)
area("west-1918-08", "After Amiens (8 August) and the advance to the Hindenburg Line (to 25 September 1918): Flanders retaken to Kemmel, the Somme bulge gone, and the Saint-Mihiel salient cut off (12 to 15 September).",
     YSER[:5] + [(2.86, 50.93, "Merkem"), (2.88, 50.88, "north of Ypres"), (2.89, 50.84, "south of Ypres"), (2.86, 50.79, "Wijtschate"),
                 (2.83, 50.73, "Nieppe"), (2.80, 50.66, "Estaires"), (2.76, 50.55, "Givenchy")] + ARTOIS_1915[6:9] + HINDENBURG[1:] +
     [(4.00, 49.31, "west of Brimont")] + CHAMPAGNE[1:] + VERDUN[:5] +
     [(5.66, 49.05, "Fresnes-en-Woëvre"), (5.80, 49.00, "Haumont"), (5.95, 48.96, "Vandières"), (6.03, 48.94, "north of Pont-à-Mousson")] + LORRAINE[1:] + VOSGES, WEST_CLOSE)
area("west-1918-09", "After the breaking of the Hindenburg Line and the Meuse-Argonne offensive (26 September to 16 October 1918): Passchendaele, Roulers, Cambrai, Saint-Quentin, and Laon taken.",
     [(2.80, 51.16, "Nieuwpoort"), (2.92, 51.05, "Diksmuide, retaken"), (3.12, 50.95, "Roeselare"), (3.21, 50.83, "Menen"),
      (3.10, 50.70, "Comines, Lille still German"), (2.95, 50.58, "Haubourdin"), (2.95, 50.43, "Lens, retaken"), (3.08, 50.33, "Douai still German"),
      (3.24, 50.18, "Cambrai, retaken 9 October"), (3.40, 50.10, "Le Cateau"), (3.55, 49.92, "Guise"), (3.62, 49.56, "Laon, retaken 13 October"),
      (4.00, 49.47, "Sissonne"), (4.37, 49.51, "Rethel"), (4.70, 49.40, "Vouziers"), (4.87, 49.33, "Grandpré"), (5.05, 49.30, "Romagne"),
      (5.20, 49.33, "Dun-sur-Meuse"), (5.40, 49.30, "Haumont-près-Samogneux"), (5.62, 49.18, "Étain"), (5.80, 49.00, "Haumont"),
      (5.95, 48.96, "Vandières"), (6.03, 48.94, "north of Pont-à-Mousson")] + LORRAINE[1:] + VOSGES, WEST_CLOSE)
area("west-1918-10", "From the freeing of Lille, Douai, and the Belgian coast (17 to 19 October 1918) to the armistice of 11 November 1918, as the line stood on the 11th: Ghent, Mons, Charleville, and Sedan reached.",
     [(3.72, 51.27, "Dutch border north of Ghent"), (3.72, 51.05, "Ghent"), (3.60, 50.85, "Oudenaarde"), (3.70, 50.68, "Lessines"),
      (3.85, 50.55, "Ath"), (3.95, 50.45, "Mons"), (3.97, 50.28, "Maubeuge"), (4.08, 49.92, "Hirson"), (4.72, 49.77, "Charleville-Mézières"),
      (4.94, 49.70, "Sedan"), (5.19, 49.49, "Stenay"), (5.40, 49.34, "Damvillers"), (5.64, 49.21, "Étain"), (5.80, 49.00, "Haumont"),
      (5.95, 48.96, "Vandières"), (6.03, 48.94, "north of Pont-à-Mousson")] + LORRAINE[1:] + VOSGES, WEST_CLOSE)
area("west-liege", "The land east of the Meuse round Liège, held from the fall of the city (7 August 1914) to the fall of Brussels.",
     [(5.00, 51.30, "north of Hasselt"), (5.35, 50.93, "Hasselt"), (5.45, 50.60, "west of Liège"), (5.55, 50.35, "Ourthe"), (5.40, 49.95, "Bastogne, west")],
     [[6.5, 49.6], [7.5, 50.5], [7.0, 51.5]])
# The French side in Upper Alsace: west of the front, inside Germany's border of 1871.
area("alsace-french", "The French-held corner of Upper Alsace, from Thann and Masevaux to Dannemarie, west of the Vosges front.",
     VOSGES, [[6.84, 47.45], [6.75, 47.80], [6.95, 48.10], [7.05, 48.20]])
area("all", "Every land: the whole of the occupied state.", [(-180, -89, ""), (180, -89, ""), (180, 89, "")], [[-180, 89]])

zone("belgium", "General Government of Belgium", "German occupation of Belgium during World War I", "255", ["211"], [
    ("1914-08-07", "1914-08-19", "west-liege"), ("1914-08-20", "1914-10-09", "west-1914-08"), ("1914-10-10", "1914-10-31", "west-1914-10"),
    ("1914-11-01", "1917-03-15", "west-1915"), ("1917-03-16", "1918-03-20", "west-1917"), ("1918-03-21", "1918-05-26", "west-1918-03"),
    ("1918-05-27", "1918-07-17", "west-1918-05"), ("1918-07-18", "1918-08-07", "west-1918-07"), ("1918-08-08", "1918-09-25", "west-1918-08"),
    ("1918-09-26", "1918-10-16", "west-1918-09"), ("1918-10-17", "1918-11-22", "west-1918-10")], cap=["Brussels", 4.352, 50.847],
    note="The General Government covered most of Belgium; Flanders behind the front was under the army (the Etappengebiet), here drawn with it.")
zone("france", "Occupied France", "German occupation of north-east France during World War I", "255", ["220"], [
    ("1914-08-25", "1914-09-12", "west-1914-08"), ("1914-09-13", "1914-10-09", "west-1914-09"), ("1914-10-10", "1914-10-31", "west-1914-10"),
    ("1914-11-01", "1917-03-15", "west-1915"), ("1917-03-16", "1918-03-20", "west-1917"), ("1918-03-21", "1918-05-26", "west-1918-03"),
    ("1918-05-27", "1918-07-17", "west-1918-05"), ("1918-07-18", "1918-08-07", "west-1918-07"), ("1918-08-08", "1918-09-25", "west-1918-08"),
    ("1918-09-26", "1918-10-16", "west-1918-09"), ("1918-10-17", "1918-11-22", "west-1918-10")])
zone("luxembourg", "Occupied Luxembourg", "German occupation of Luxembourg during World War I", "255", ["212"], [("1914-08-02", "1918-11-21", "all")])
zone("alsace", "French-held Alsace", "Battle of Mulhouse", "220", ["255"], [("1914-08-07", "1918-11-16", "alsace-french")])

exec(open(os.path.join(HERE, 'gen_east.py')).read())
exec(open(os.path.join(HERE, 'gen_south.py')).read())

from shapely.geometry import Polygon as _P
from shapely.validation import explain_validity as _ev
for _k, _a in AREAS.items():
    if 'ring' in _a:
        _p = _P([(p[0], p[1]) for p in _a['ring']])
        assert _p.is_valid, _k + ': ' + _ev(_p)

json.dump({"note": "The occupations of the First World War, read by build-eras.mjs (csOccupy). An area is the occupier's side of a front; each point is [longitude, latitude, the place it stands for].", "zones": ZONES, "rest": REST, "areas": AREAS},
          open(os.path.join(HERE, '..', 'occupations.json'), 'w'), ensure_ascii=False, indent=1)
print(len(ZONES), 'zones', len(AREAS), 'areas')
