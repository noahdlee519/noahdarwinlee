// Wartime borders from 1931 to 1945, laid over CShapes, which draws the legal borders through the
// war (see the README's "The Second World War"). Three kinds of change, applied in this order:
//
// 1. FIXES: land CShapes gives to the wrong state in these years, whole periods (Italy's Julian
//    March and Dodecanese, the Kwantung Leased Territory, Finland's Petsamo, Ethiopia under Italy).
// 2. OCCUPIED: a state's land the Axis held, month by month, from the war's zones of control
//    (tools/control/ww2-axis.json), keeps its name and becomes occupied, in its occupier's colour.
// 3. REGIMES: annexations, occupation regimes, and client states, each with its shape, its dates,
//    and, for those that lost ground as the Allies advanced, cut each month to the ground the Axis held.
//
// Shapes are built from CShapes' shapes on a day (cs), Natural Earth's first-level units (ne), and
// hand-drawn rings for lines no unit follows (ring, box), with and, or, and minus. Natural Earth's
// units are widened into the sea by COAST_KM, so that CShapes' coarser coasts don't leave slivers
// of the state underneath.

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const COAST_KM = 10, MIN_KM2 = 30, SAME_SHARE = 0.01;
// A piece the wartime borders leave of a state underneath, narrower than SLIVER_KM (twice its area over its outline) or
// smaller than MIN_KM2, is a sliver between two drawings of one border, not land the state held: it is dropped, and the
// builder gives it to the state beside it (adoptLand). An island the state held whole is kept.
const SLIVER_KM = 4;
// What a state keeps of its land under the wartime borders: a piece under REST_KM2 that wasn't a whole island of it is
// a gap between two drawings of a border, and is dropped too.
const REST_KM2 = 600;
// OpenHistoricalMap's wartime units (tools/ww2-ohm.mjs writes them): the General Government, the annexed west of Poland,
// Lithuania with Vilnius, Bezirk Bialystok, and the Reichskommissariats Ostland and Ukraine.
const OHM_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "ww2-ohm.json");
export const OHM = existsSync(OHM_PATH) ? JSON.parse(readFileSync(OHM_PATH, "utf8")).units : null;

// The German–Soviet line of 28 September 1939, from the Lithuanian border by Suwałki, along the
// Pisa, the Narew, the Bug, and the San, to the Slovak border (approximate, to a few kilometres).
const LINE_1939 = [[23.5, 54.2], [23.0, 53.92], [22.5, 53.6], [22.0, 53.45], [21.85, 53.15], [22.05, 52.85], [22.1, 52.72], [22.6, 52.4], [23.2, 52.25], [23.65, 52.08], [23.65, 51.6], [23.75, 51.25], [24.05, 50.85], [24.12, 50.55], [23.6, 50.35], [23.1, 50.05], [22.78, 49.78], [22.55, 49.5], [22.65, 49.2], [22.6, 49.0]];
// The General Government's border with the annexed west, from the Bug by Małkinia to the Slovak border
// west of Kraków: Warsaw, Łowicz, Skierniewice, Piotrków, Częstochowa, and Kraków inside; Płock,
// Łódź, Kutno, Zawiercie, and Oświęcim outside (approximate).
const GG_WEST = [[21.6, 52.6], [21.1, 52.55], [20.6, 52.45], [20.2, 52.35], [19.75, 52.2], [19.85, 51.95], [20.05, 51.8], [19.8, 51.65], [19.55, 51.45], [19.3, 51.25], [19.0, 51.05], [18.85, 50.85], [19.0, 50.65], [19.5, 50.4], [19.55, 50.3], [19.62, 50.08], [19.55, 49.85], [19.45, 49.48]];
const SOVIET_1939 = [...LINE_1939, [24.0, 47.5], [30, 47.5], [30, 57], [23.5, 57], [23.5, 54.2]];
// The same, carried 0.8° west, to take in the Soviet share up to OpenHistoricalMap's units.
export const SOVIET_WIDE = [...LINE_1939.map(([x, y]) => [x - 0.8, y]), [23.2, 47.5], [30, 47.5], [30, 57], [22.7, 57], [22.7, 54.2]];
const GG_1939 = [...LINE_1939.slice(6), [19.4, 48.9], ...GG_WEST.slice().reverse(), [22.1, 52.72]];
// The Vilnius region, given to Lithuania on 10 October 1939 and handed over on the 28th (approximate).
const VILNIUS = [[24.55, 54.4], [24.95, 54.15], [25.55, 54.15], [25.75, 54.32], [26.0, 54.55], [26.25, 54.85], [26.2, 55.15], [25.75, 55.25], [25.3, 55.05], [24.85, 54.9], [24.55, 54.7], [24.55, 54.4]];
// France's demarcation line of 22 June 1940, from the Spanish border by Saint-Jean-Pied-de-Port, past
// Mont-de-Marsan, Langon, Angoulême, Loches, Vierzon, Moulins, Chalon-sur-Saône, and Dole, to the Swiss
// border by Geneva; the ring takes in the unoccupied zone south and east of it, and Corsica.
export const VICHY = [[-1.27, 43.1], [-0.77, 43.49], [-0.5, 43.75], [-0.32, 44.03], [-0.25, 44.55], [-0.04, 44.85], [0.16, 45.0], [0.34, 45.3], [0.45, 45.62], [0.67, 46.01], [0.9, 46.45], [0.99, 47.1], [1.5, 47.2], [2.07, 47.22], [2.6, 46.9], [3.33, 46.57], [3.98, 46.48], [4.4, 46.6], [4.85, 46.78], [5.2, 46.95], [5.55, 46.95], [5.75, 46.7], [5.95, 46.4], [6.05, 46.25], [6.4, 46.3], [8.5, 46.3], [10.2, 41.0], [3.5, 41.2], [-2.0, 42.5], [-1.27, 43.1]];
// Eupen, Malmedy, and Sankt Vith, annexed by Germany on 18 May 1940.
const EUPEN = [[5.95, 50.8], [6.05, 50.7], [5.97, 50.6], [5.93, 50.45], [5.88, 50.35], [5.95, 50.2], [6.05, 50.1], [6.5, 50.3], [6.5, 50.8], [5.95, 50.8]];
// Italy's border of 1920 to 1947 with Yugoslavia (Rapallo), with Fiume, Cres, Lošinj, Zara, and
// Lastovo; Krk and Sušak stayed Yugoslav.
const JULIAN = [[13.3, 46.6], [13.84, 46.38], [14.0, 46.15], [14.12, 46.0], [14.3, 45.85], [14.45, 45.6], [14.47, 45.36], [14.43, 45.31], [14.4, 45.1], [14.48, 44.95], [14.52, 44.4], [13.0, 44.4], [13.0, 46.6], [13.3, 46.6]];
const ZARA = [[15.17, 44.07], [15.28, 44.07], [15.28, 44.15], [15.17, 44.15], [15.17, 44.07]];
const LASTOVO = [[16.7, 42.68], [17.0, 42.68], [17.0, 42.8], [16.7, 42.8], [16.7, 42.68]];
// The Dodecanese, Italian from 1912, and Kastellorizo.
const DODECANESE = [[26.25, 37.55], [27.4, 37.55], [28.3, 36.9], [28.4, 36.0], [27.4, 35.3], [26.7, 35.35], [26.25, 36.3], [26.25, 37.55]];
const KASTELLORIZO = [[29.5, 36.08], [29.66, 36.08], [29.66, 36.2], [29.5, 36.2], [29.5, 36.08]];
// Slovenia north of the German–Italian line of April 1941 (Ljubljana and Novo Mesto Italian;
// Kranj, Celje, Maribor, and Krško German), and Prekmurje (Hungarian).
const N_SLOVENIA = [[13.7, 46.62], [16.6, 46.95], [16.0, 46.48], [15.75, 45.85], [15.45, 45.88], [15.25, 45.95], [15.0, 46.02], [14.75, 46.08], [14.55, 46.1], [14.4, 46.12], [14.2, 46.15], [14.0, 46.25], [13.7, 46.35], [13.7, 46.62]];
const PREKMURJE = [[15.95, 46.45], [16.65, 46.45], [16.65, 46.95], [15.95, 46.95], [15.95, 46.45]];
// Baranja, north of the Drava, and Italy's Dalmatia, Sušak and Krk, and Korčula and Mljet (Rome
// Agreements of 18 May 1941; approximate).
const BARANJA = [[18.35, 45.55], [18.95, 45.55], [18.95, 45.95], [18.35, 45.95], [18.35, 45.55]];
const DALMATIA = [[14.8, 44.25], [15.0, 44.0], [15.5, 43.75], [15.85, 43.55], [16.05, 43.5], [16.3, 43.55], [16.55, 43.56], [16.6, 43.45], [16.3, 43.4], [15.9, 43.42], [15.0, 43.8], [14.7, 44.1], [14.8, 44.25]];
const SUSAK_KRK = [[14.44, 45.42], [14.62, 45.42], [14.85, 45.1], [14.8, 44.7], [14.55, 44.75], [14.5, 45.05], [14.47, 45.3], [14.44, 45.42]];
const KORCULA = [[16.6, 42.68], [17.75, 42.68], [17.75, 43.0], [16.6, 43.0], [16.6, 42.68]];
// Bessarabia's Budjak, the Odessa region west of the Dniester; and the Transnistria Governorate,
// between the Dniester and the Southern Bug (approximate).
const BUDJAK = [[28.0, 47.0], [29.6, 47.0], [29.6, 46.9], [30.0, 46.55], [30.25, 46.3], [30.45, 46.0], [30.8, 45.2], [28.0, 45.0], [28.0, 47.0]];
const TRANSNISTRIA = [[27.6, 48.5], [28.8, 48.7], [29.6, 48.6], [30.85, 48.04], [31.3, 47.6], [31.95, 46.97], [32.1, 46.6], [31.5, 46.4], [30.6, 46.2], [30.25, 46.3], [30.0, 46.55], [29.6, 46.9], [29.2, 47.5], [28.6, 47.9], [27.6, 48.5]];
// Manchukuo's Mongol provinces (Hulunbuir and Xing'an) in 1932, and with Jehol's Mongol banners
// from 1933; Jehol south to the Great Wall; Mengjiang's Inner Mongolia and Chahar; and East Hebei.
const MANCHU_NMG_1932 = [[115.3, 47.5], [115.3, 53.6], [127, 53.6], [127, 41.0], [121.5, 41.0], [120.6, 42.4], [119.8, 43.6], [119.0, 44.5], [117.7, 45.4], [116.5, 46.6], [115.3, 47.5]];
const MANCHU_NMG_1933 = [[115.3, 47.5], [115.3, 53.6], [127, 53.6], [127, 41.0], [117.5, 41.0], [116.6, 42.0], [116.9, 43.2], [117.4, 44.4], [117.7, 45.4], [116.5, 46.6], [115.3, 47.5]];
const JEHOL = [[115.95, 40.62], [116.5, 40.58], [117.15, 40.69], [117.8, 40.27], [118.5, 40.17], [119.0, 40.12], [119.75, 40.02], [121.0, 40.6], [121.0, 43.0], [115.95, 43.0], [115.95, 40.62]];
const MENGJIANG_NMG = [[108.8, 39.8], [108.8, 42.2], [111.5, 43.6], [113.5, 44.9], [116.5, 46.6], [117.7, 45.4], [117.4, 44.4], [116.9, 43.2], [116.6, 42.0], [115.95, 40.62], [114.0, 40.2], [111.0, 39.7], [108.8, 39.8]];
const CHAHAR_HEBEI = [[113.8, 40.0], [115.95, 40.3], [115.95, 42.7], [113.8, 42.7], [113.8, 40.0]];
const EAST_HEBEI = [[116.6, 39.6], [116.7, 40.35], [117.15, 40.66], [117.8, 40.25], [118.5, 40.15], [119.0, 40.1], [119.75, 40.0], [119.3, 39.4], [118.4, 38.9], [117.5, 39.0], [116.9, 39.3], [116.6, 39.6]];
const KWANTUNG = [[120.9, 38.6], [122.4, 38.6], [122.4, 39.25], [121.95, 39.45], [121.45, 39.45], [120.9, 39.3], [120.9, 38.6]];
const KWANGCHOWAN = [[110.15, 20.85], [110.65, 20.85], [110.65, 21.35], [110.15, 21.35], [110.15, 20.85]];
// The Shan states Thailand annexed (Kengtung and Mong Pan), and the Lao land west of the Mekong.
const KENGTUNG = [[98.4, 20.3], [98.4, 21.0], [98.9, 21.3], [99.2, 22.2], [100.3, 22.2], [101.2, 21.6], [100.6, 20.3], [98.4, 20.3]];
const WEST_MEKONG_SOUTH = [[105.0, 13.9], [105.85, 13.9], [105.85, 15.6], [105.0, 15.6], [105.0, 13.9]];

const cs = (gw, at) => ({ cs: gw, at });
const ne = (a3, ...n) => ({ ne: a3, n: n.length ? n : null });
const ring = (r) => ({ ring: r });
const ohm = (key) => ({ ohm: key });
const box = (x0, y0, x1, y1) => ({ ring: [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]] });
const and = (...a) => ({ and: a });
const or = (...a) => ({ or: a });
const minus = (a, ...b) => ({ minus: [a, ...b] });

// Shapes used more than once.
const S = {
  csk39: cs("315", "1939-03-14"),
  yug41: minus(cs("345", "1941-04-05"), ring(JULIAN), ring(ZARA), ring(LASTOVO)),
  fra40: cs("220", "1940-06-01"),
  grc41: minus(cs("350", "1941-04-01"), ring(DODECANESE), ring(KASTELLORIZO)),
  chn37: cs("710", "1937-07-01"),
  rou40: cs("360", "1940-09-07")
};
// Without the bits of Slovakia Poland took in 1938 (Spiš and Orava), which went back to Slovakia in November 1939.
S.pol39 = minus(cs("290", "1939-08-31"), ne("SVK"));
// Poland divided, from OpenHistoricalMap's units where it has them: the General Government and Lithuania's Vilnius as
// it draws them; the Soviet share east of the line of 28 September 1939, up to them and to the Reich (the hand-drawn line,
// carried west, only bounds it); and the Reich's share the rest, so that every piece of Poland goes to one of the four.
// Without ww2-ohm.json, the hand-drawn lines alone.
if (OHM) {
  S.polGG = and(S.pol39, ohm("gg39"));
  S.polVilnius = and(S.pol39, ohm("lithuania39"));
  S.polSoviet = minus(and(S.pol39, ring(SOVIET_WIDE)), ohm("reich39"), ohm("gg39"), ohm("lithuania39"));
  S.polReich = minus(S.pol39, S.polSoviet, S.polGG, S.polVilnius);
  S.polGG41 = and(S.pol39, ohm("gg41"));
} else {
  S.polVilnius = and(S.pol39, ring(VILNIUS));
  S.polSoviet = minus(and(S.pol39, ring(SOVIET_1939)), ring(VILNIUS));
  S.polGG = and(S.pol39, ring(GG_1939));
  S.polReich = minus(S.pol39, ring(SOVIET_1939), ring(GG_1939), ring(VILNIUS));
  S.polGG41 = or(S.polGG, and(S.pol39, ne("UKR", "L'viv", "Ternopil'", "Ivano-Frankivs'k")));
}
S.ussr41 = or(cs("365", "1941-06-01"), S.polSoviet, S.polVilnius);
S.bialystok = OHM ? and(S.ussr41, ohm("bialystok41")) : and(S.polSoviet, box(21.5, 52.55, 24.65, 54.3));
S.manchu32 = and(S.chn37, or(ne("CHN", "Heilongjiang", "Jilin", "Liaoning"), and(ne("CHN", "Inner Mongol"), ring(MANCHU_NMG_1932))));
S.manchu33 = and(S.chn37, or(ne("CHN", "Heilongjiang", "Jilin", "Liaoning"), and(ne("CHN", "Inner Mongol"), ring(MANCHU_NMG_1933)), and(ne("CHN", "Hebei"), ring(JEHOL))));
S.mengjiang = and(S.chn37, or(and(ne("CHN", "Inner Mongol"), ring(MENGJIANG_NMG)), and(ne("CHN", "Shanxi"), box(110, 39.35, 115, 41)), and(ne("CHN", "Hebei"), ring(CHAHAR_HEBEI))));
S.chinaProper = minus(S.chn37, S.manchu33, S.mengjiang, ring(KWANTUNG), ring(KWANGCHOWAN), ne("HKG"), ne("MAC"));
S.ndh = minus(and(S.yug41, or(ne("HRV"), ne("BIH"), ne("SRB", "Sremski"))), ne("HRV", "Medimurska", "Istarska"), ring(BARANJA), ring(DALMATIA), ring(SUSAK_KRK), ring(KORCULA));
S.hungaryYug = and(S.yug41, or(and(ne("SVN"), ring(PREKMURJE)), ne("HRV", "Medimurska"), ring(BARANJA), ne("SRB", "Severno-Backi", "Zapadno-Backi", "Južno-Backi")));
S.bulgariaYug = and(S.yug41, or(minus(ne("MKD"), ne("MKD", "Tetovo", "Gostivar", "Debar", "Struga", "Kičevo", "Mavrovo and Rostusa", "Centar župa", "Jegunovce", "Tearce", "Brvenica", "Bogovinje", "Vrapcište", "Želino", "Zajas", "Vevčani", "Plasnica", "Drugovo", "Oslomej", "Debarca", "Vraneštica")), ne("SRB", "Pirotski", "Pcinjski")));
S.albaniaYug = and(S.yug41, or(minus(ne("KOS"), ne("KOS", "Leposavić", "Zvečan", "Zubin Potok", "Kosovska Mitrovica", "Vučitrn", "Podujevo")), ne("MKD", "Tetovo", "Gostivar", "Debar", "Struga", "Kičevo", "Mavrovo and Rostusa", "Centar župa", "Jegunovce", "Tearce", "Brvenica", "Bogovinje", "Vrapcište", "Želino", "Zajas", "Vevčani", "Plasnica", "Drugovo", "Oslomej", "Debarca", "Vraneštica"), ne("MNE", "Ulcinj", "Plav")));
S.serbia = minus(and(S.yug41, or(ne("SRB"), ne("KOS", "Leposavić", "Zvečan", "Zubin Potok", "Kosovska Mitrovica", "Vučitrn", "Podujevo"))), ne("SRB", "Severno-Backi", "Zapadno-Backi", "Južno-Backi", "Sremski", "Pirotski", "Pcinjski"));
S.montenegro = minus(and(S.yug41, ne("MNE")), ne("MNE", "Ulcinj", "Plav", "Kotor", "Tivat", "Herceg Novi"));
S.italyYug = and(S.yug41, or(minus(ne("SVN"), ring(N_SLOVENIA), ring(PREKMURJE)), ring(DALMATIA), ring(SUSAK_KRK), ring(KORCULA), ne("MNE", "Kotor", "Tivat", "Herceg Novi")));
S.germanySlovenia = and(S.yug41, ne("SVN"), minus(ring(N_SLOVENIA), ring(PREKMURJE)));
S.julian = and(cs("345", "1941-04-05"), or(ring(JULIAN), ring(ZARA), ring(LASTOVO)));
S.bessarabia = and(S.ussr41, or(minus(ne("MDA"), ne("MDA", "Transnistria", "Stîngă Nistrului", "Camenca", "Grigoriopol")), ne("UKR", "Chernivtsi"), and(ne("UKR", "Odessa"), ring(BUDJAK))));
S.transnistria = minus(and(S.ussr41, or(ring(TRANSNISTRIA), ne("MDA", "Transnistria", "Stîngă Nistrului", "Camenca", "Grigoriopol"))), S.bessarabia);
S.ostland = minus(and(S.ussr41, or(ne("EST"), ne("LVA"), ne("LTU"), ne("BLR", "Grodno", "Minsk", "City of Minsk"), and(ne("BLR", "Vitebsk"), box(24, 54, 28.3, 56.2)), and(ne("BLR", "Brest"), box(22, 52.6, 28, 54)))), S.bialystok, ne("LTU", "Klaipedos"));
S.rkUkraine = minus(and(S.ussr41, or(ne("UKR", "Volyn", "Rivne", "Zhytomyr", "Kiev", "Kiev City", "Khmel'nyts'kyy", "Vinnytsya", "Cherkasy", "Kirovohrad", "Mykolayiv", "Dnipropetrovs'k", "Zaporizhzhya", "Kherson", "Poltava"), and(ne("BLR", "Brest"), box(22, 51, 28, 52.6)), and(ne("BLR", "Gomel"), box(26, 51, 30.2, 52.3)))), S.transnistria, S.bessarabia, S.polGG41);
// At their largest, as OpenHistoricalMap draws them, where it has them.
if (OHM) {
  S.ostland = minus(and(S.ussr41, ohm("ostland")), S.bialystok, ne("LTU", "Klaipedos"));
  S.rkUkraine = minus(and(S.ussr41, ohm("rkUkraine")), S.transnistria, S.bessarabia, S.polGG41, S.bialystok);
}
S.finCeded = minus(cs("375", "1940-03-11"), cs("375", "1940-03-12"));
S.petsamo = and(S.finCeded, box(27.5, 68.6, 32.5, 70.2));
S.eastKarelia = minus(and(S.ussr41, ne("RUS", "Karelia")), cs("375", "1940-03-11"));
S.vichy = and(S.fra40, ring(VICHY));
S.alsace = and(S.fra40, ne("FRA", "Bas-Rhin", "Haute-Rhin", "Moselle"));
S.nord = and(S.fra40, ne("FRA", "Nord", "Pas-de-Calais"));
S.italianFrance = and(S.fra40, ne("FRA", "Alpes-Maritimes", "Var", "Alpes-de-Haute-Provence", "Hautes-Alpes", "Isère", "Drôme", "Savoie", "Haute-Savoie", "Corse-du-Sud", "Haute-Corse"));
S.occupiedFrance = minus(S.fra40, S.vichy, S.alsace, S.nord);
S.eupen = and(cs("211", "1940-05-01"), ring(EUPEN));
S.belgiumNorth = or(minus(cs("211", "1940-05-01"), ring(EUPEN)), S.nord);
S.nTransylvania = and(S.rou40, or(ne("ROU", "Satu Mare", "Maramures", "Salaj", "Bistrita-Nasaud", "Mures", "Harghita", "Covasna"), and(ne("ROU", "Cluj"), box(22, 46.62, 25, 48)), and(ne("ROU", "Bihor"), box(21, 46.85, 23, 48))));
S.greeceBulgaria = and(S.grc41, ne("GRC", "Anatoliki Makedonia kai Thraki"));
S.greeceItaly = and(S.grc41, or(ne("GRC", "Dytiki Makedonia", "Ipeiros", "Thessalia", "Stereá Elláda", "Dytiki Ellada", "Peloponnisos", "Ionioi Nisoi", "Notio Aigaio", "Attiki"), and(ne("GRC", "Kriti"), box(25.5, 34.5, 27, 35.8))));

// 1. Land CShapes gives to another state in these years. [name, wiki, status, ruler, from, to, shape, b]
export const WW2_FIXES = [
  ["Italy", null, "state", "", "1920-11-12", "1945-04-30", S.julian, 1],
  ["Italian Islands of the Aegean", "Italian Islands of the Aegean", "colony", "Italy", "1912-05-17", "1943-09-10", and(cs("350", "1941-04-01"), or(ring(DODECANESE), ring(KASTELLORIZO))), 2],
  ["Italian Islands of the Aegean", "Italian Islands of the Aegean", "occupied", "Germany", "1943-09-11", "1945-05-08", and(cs("350", "1941-04-01"), or(ring(DODECANESE), ring(KASTELLORIZO))), 2],
  ["Dodecanese", "Dodecanese", "occupied", "United Kingdom", "1945-05-09", "1947-03-30", and(cs("350", "1941-04-01"), or(ring(DODECANESE), ring(KASTELLORIZO))), 2],
  ["Lithuania", null, "state", "", "1939-10-28", "1940-06-01", S.polVilnius, 1],
  ["Soviet Union", null, "state", "", "1940-06-02", "1945-05-07", S.polVilnius, 1],
  ["Soviet Union", null, "state", "", "1939-11-01", "1945-05-07", S.polSoviet, 1],
  ["Kwantung Leased Territory", "Kwantung Leased Territory", "colony", "Japan", "1905-09-05", "1945-08-21", and(S.chn37, ring(KWANTUNG)), 1],
  ["Finland", "Petsamo Province", "state", "", "1940-03-12", "1944-09-18", S.petsamo, 3],
  ["Italian East Africa", "Italian East Africa", "colony", "Italy", "1936-05-09", "1940-06-09", cs("530", "1936-01-01"), 3]
];

// 2. A state's land the Axis held: [state's name, from, to, occupier] (Asia's from China on). The occupied land keeps the
// state's name and takes its occupier's colour; named regimes below are laid over it.
export const WW2_OCCUPIED = [
  ["Poland", "1939-09-01", "1945-05-07", "Germany"], ["Czechoslovakia", "1939-03-15", "1945-05-07", "Germany"],
  ["Denmark", "1940-04-09", "1945-05-05", "Germany"], ["Norway", "1940-04-09", "1945-05-08", "Germany"], ["Kingdom of Norway", "1940-04-09", "1945-05-08", "Germany"],
  ["Netherlands", "1940-05-10", "1945-05-05", "Germany"], ["Belgium", "1940-05-10", "1945-02-28", "Germany"], ["Luxembourg", "1940-05-10", "1945-02-28", "Germany"],
  ["France", "1940-05-10", "1945-05-08", "Germany"], ["Yugoslavia", "1941-04-06", "1945-05-15", "Germany"], ["Greece", "1940-10-28", "1945-05-31", "Germany"],
  ["Soviet Union", "1941-06-22", "1945-05-09", "Germany"], ["Italy", "1943-09-09", "1945-05-02", "Germany"],
  ["Egypt", "1940-06-10", "1942-11-30", "Italy"], ["Anglo-Egyptian Sudan", "1940-06-10", "1941-12-31", "Italy"], ["Kenya", "1940-06-10", "1941-12-31", "Italy"], ["British Somaliland", "1940-08-01", "1941-03-31", "Italy"],
  ["Tunisia", "1942-11-09", "1943-05-13", "Germany"],
  ["China", "1937-07-07", "1945-09-09", "Japan"], ["Philippines", "1941-12-08", "1945-09-02", "Japan"], ["Guam", "1941-12-08", "1944-08-31", "Japan"],
  ["Dutch East Indies", "1941-12-08", "1945-08-16", "Japan"], ["Straits Settlements", "1941-12-08", "1945-09-12", "Japan"], ["Federated Malay States", "1941-12-08", "1945-09-12", "Japan"], ["Unfederated Malay States", "1941-12-08", "1945-09-12", "Japan"],
  ["Burma", "1941-12-08", "1945-09-02", "Japan"], ["Sarawak", "1941-12-16", "1945-09-11", "Japan"], ["North Borneo", "1941-12-16", "1945-09-11", "Japan"], ["Brunei", "1941-12-16", "1945-09-11", "Japan"],
  ["East Timor", "1942-02-19", "1945-09-11", "Japan"], ["Papua", "1942-01-21", "1945-09-06", "Japan"], ["New Guinea", "1942-01-21", "1945-09-06", "Japan"], ["Solomon Islands", "1942-01-21", "1945-09-06", "Japan"],
  ["Alaska", "1942-06-06", "1943-08-15", "Japan"], ["British India", "1942-03-23", "1945-10-09", "Japan"]
];

// 3. Regimes: { name, wiki, status, ruler, b, periods: [[from, to, shape, clip]] }. A period with clip
// is cut each month to the ground the Axis held.
export const WW2_REGIMES = [
  { name: "Slovak Republic", wiki: "Slovak Republic (1939–1945)", status: "state", b: 2, periods: [["1939-03-14", "1945-05-08", and(S.csk39, ne("SVK")), 1], ["1939-11-21", "1945-05-08", and(cs("290", "1939-08-31"), ne("SVK")), 1]] },
  { name: "Protectorate of Bohemia and Moravia", status: "protectorate", ruler: "Germany", b: 2, periods: [["1939-03-16", "1945-05-08", and(S.csk39, ne("CZE")), 1]] },
  { name: "Hungary", status: "state", b: 2, periods: [["1939-03-15", "1945-05-08", and(S.csk39, ne("UKR", "Transcarpathia")), 1], ["1940-09-05", "1945-05-08", S.nTransylvania, 1], ["1941-04-11", "1945-05-08", S.hungaryYug, 1]] },
  { name: "Germany", status: "state", b: 2, periods: [["1939-03-23", "1945-05-08", and(cs("368", "1939-03-01"), ne("LTU", "Klaipedos")), 1], ["1939-10-26", "1945-05-08", S.polReich, 1], ["1940-05-18", "1945-05-08", S.eupen, 1], ["1940-06-25", "1945-05-08", S.alsace, 1], ["1942-08-30", "1945-05-08", cs("212", "1940-05-01"), 1], ["1941-04-14", "1945-05-08", S.germanySlovenia, 1]] },
  { name: "Albania", wiki: "Albanian Kingdom (1939–1943)", status: "protectorate", ruler: "Italy", b: 2, periods: [["1939-04-12", "1941-08-11", cs("339", "1939-01-01"), 1], ["1941-08-12", "1943-09-08", or(cs("339", "1939-01-01"), S.albaniaYug), 1]] },
  { name: "Albania", wiki: "Albanian Kingdom (1943–1944)", status: "occupied", ruler: "Germany", b: 2, periods: [["1943-09-09", "1944-11-29", or(cs("339", "1939-01-01"), S.albaniaYug), 1]] },
  { name: "General Government", status: "occupied", ruler: "Germany", b: 1, periods: [["1939-10-26", "1941-07-31", S.polGG, 1], ["1941-08-01", "1945-05-08", S.polGG41, 1]] },
  { name: "Reichskommissariat Norwegen", status: "occupied", ruler: "Germany", b: 2, periods: [["1940-04-24", "1945-05-08", ne("NOR", "Akershus", "Aust-Agder", "Buskerud", "Finnmark", "Hedmark", "Hordaland", "Møre og Romsdal", "Nord-Trøndelag", "Nordland", "Oppland", "Oslo", "Rogaland", "Sogn og Fjordane", "Sør-Trøndelag", "Telemark", "Troms", "Vest-Agder", "Vestfold", "Østfold"), 1]] },
  { name: "Reichskommissariat Niederlande", status: "occupied", ruler: "Germany", b: 2, periods: [["1940-05-29", "1945-05-05", ne("NLD", "Drenthe", "Flevoland", "Friesland", "Gelderland", "Groningen", "Limburg", "Noord-Brabant", "Noord-Holland", "Overijssel", "Utrecht", "Zeeland", "Zuid-Holland"), 1]] },
  { name: "Belgium and Northern France", wiki: "Military Administration in Belgium and Northern France", status: "occupied", ruler: "Germany", b: 2, periods: [["1940-06-01", "1944-07-17", S.belgiumNorth, 1]] },
  { name: "Belgium and Northern France", wiki: "Reichskommissariat of Belgium and Northern France", status: "occupied", ruler: "Germany", b: 2, periods: [["1944-07-18", "1945-02-28", S.belgiumNorth, 1]] },
  { name: "France", wiki: "German military administration in occupied France during World War II", status: "occupied", ruler: "Germany", b: 1, periods: [["1940-06-25", "1942-11-10", S.occupiedFrance, 0]] },
  { name: "Vichy France", status: "state", b: 1, periods: [["1940-06-25", "1942-11-10", S.vichy, 0]] },
  { name: "France", wiki: "Italian occupation of France", status: "occupied", ruler: "Italy", b: 2, periods: [["1942-11-11", "1943-09-08", S.italianFrance, 1]] },
  { name: "Italy", status: "state", b: 2, periods: [["1941-05-03", "1943-09-08", S.italyYug, 1]] },
  { name: "Independent State of Croatia", status: "state", b: 2, periods: [["1941-04-10", "1945-05-08", S.ndh, 1]] },
  { name: "Territory of the Military Commander in Serbia", status: "occupied", ruler: "Germany", b: 2, periods: [["1941-04-22", "1944-10-20", S.serbia, 1]] },
  { name: "Montenegro", wiki: "Italian governorate of Montenegro", status: "occupied", ruler: "Italy", b: 2, periods: [["1941-04-17", "1943-09-09", S.montenegro, 1]] },
  { name: "Montenegro", wiki: "German occupation of Montenegro", status: "occupied", ruler: "Germany", b: 2, periods: [["1943-09-10", "1944-12-15", S.montenegro, 1]] },
  { name: "Bulgaria", status: "state", b: 2, periods: [["1941-04-19", "1944-09-08", S.bulgariaYug, 1], ["1941-04-20", "1944-09-08", S.greeceBulgaria, 1]] },
  { name: "Greece", wiki: "Axis occupation of Greece", status: "occupied", ruler: "Italy", b: 2, periods: [["1941-04-28", "1943-09-08", S.greeceItaly, 1]] },
  { name: "Romania", status: "state", b: 2, periods: [["1941-07-16", "1944-08-23", S.bessarabia, 1]] },
  { name: "Transnistria Governorate", status: "occupied", ruler: "Romania", b: 1, periods: [["1941-08-19", "1944-08-23", S.transnistria, 1]] },
  { name: "Reichskommissariat Ostland", status: "occupied", ruler: "Germany", b: 2, periods: [["1941-07-25", "1945-05-09", S.ostland, 1]] },
  { name: "Reichskommissariat Ukraine", status: "occupied", ruler: "Germany", b: 2, periods: [["1941-09-01", "1945-05-09", S.rkUkraine, 1]] },
  { name: "Bezirk Bialystok", status: "occupied", ruler: "Germany", b: 1, periods: [["1941-08-01", "1945-05-09", S.bialystok, 1]] },
  { name: "Finland", status: "state", b: 3, periods: [["1941-07-10", "1944-09-19", S.finCeded, 1]] },
  { name: "East Karelia", wiki: "Finnish occupation of East Karelia", status: "occupied", ruler: "Finland", b: 2, periods: [["1941-07-10", "1944-09-19", S.eastKarelia, 1]] },
  { name: "Italian Social Republic", status: "state", b: 2, periods: [["1943-09-23", "1945-04-28", cs("325", "1943-01-01"), 1]] },
  { name: "Operational Zone of the Alpine Foothills", status: "occupied", ruler: "Germany", b: 2, periods: [["1943-09-10", "1945-05-02", and(cs("325", "1943-01-01"), ne("ITA", "Bozen", "Trento", "Belluno")), 1]] },
  { name: "Operational Zone of the Adriatic Littoral", status: "occupied", ruler: "Germany", b: 2, periods: [["1943-09-10", "1945-05-02", or(and(cs("325", "1943-01-01"), ne("ITA", "Udine", "Pordenone", "Gorizia", "Trieste")), S.julian, and(S.yug41, minus(ne("SVN"), ring(N_SLOVENIA), ring(PREKMURJE))), and(S.yug41, ring(SUSAK_KRK))), 1]] },
  { name: "Italian East Africa", status: "colony", ruler: "Italy", b: 3, periods: [["1940-06-10", "1941-11-27", cs("530", "1936-01-01"), 1]] },
  // Asia
  { name: "Manchukuo", status: "state", b: 1, periods: [["1932-03-01", "1933-03-03", S.manchu32, 0], ["1933-03-04", "1945-08-19", S.manchu33, 0]] },
  { name: "Manchuria", wiki: "Soviet occupation of Manchuria", status: "occupied", ruler: "Soviet Union", b: 1, periods: [["1945-08-20", "1946-05-03", S.manchu33, 0]] },
  { name: "Mengjiang", status: "state", b: 1, periods: [["1937-11-22", "1945-08-19", S.mengjiang, 1]] },
  { name: "Provisional Government of the Republic of China", wiki: "Provisional Government of the Republic of China (1937–1940)", status: "state", b: 2, periods: [["1937-12-14", "1940-03-29", minus(and(S.chinaProper, or(ne("CHN", "Hebei", "Beijing", "Tianjin", "Shandong", "Shanxi"), and(ne("CHN", "Henan"), box(110, 35.0, 117, 37)))), S.mengjiang), 1]] },
  { name: "East Hebei Autonomous Government", wiki: "East Hebei Autonomous Council", status: "state", b: 1, periods: [["1935-11-25", "1938-01-31", and(S.chn37, or(ne("CHN", "Hebei"), ne("CHN", "Beijing")), ring(EAST_HEBEI)), 0]] },
  { name: "Reformed Government of the Republic of China", status: "state", b: 2, periods: [["1938-03-28", "1940-03-29", and(S.chinaProper, ne("CHN", "Jiangsu", "Shanghai", "Zhejiang", "Anhui")), 1]] },
  { name: "Reorganized National Government of the Republic of China", wiki: "Wang Jingwei regime", status: "state", b: 2, periods: [["1940-03-30", "1945-08-16", S.chinaProper, 1]] },
  { name: "State of Burma", status: "state", b: 2, periods: [["1943-08-01", "1945-03-27", cs("775", "1940-01-01"), 1]] },
  { name: "Second Philippine Republic", status: "state", b: 2, periods: [["1943-10-14", "1945-08-17", cs("840", "1940-01-01"), 1]] },
  { name: "Empire of Vietnam", status: "state", b: 2, periods: [["1945-03-11", "1945-08-25", ne("VNM"), 0]] },
  { name: "Kingdom of Kampuchea", wiki: "Kingdom of Kampuchea (1945)", status: "state", b: 2, periods: [["1945-03-13", "1945-10-15", minus(cs("811", "1940-01-01"), ne("KHM", "Batdâmbâng", "Bântéay Méanchey", "Krong Pailin", "Otdar Mean Chey", "Siemréab")), 0]] },
  { name: "Kingdom of Luang Phrabang", status: "state", b: 2, periods: [["1945-04-08", "1945-10-11", minus(cs("812", "1940-01-01"), ne("LAO", "Xaignabouri"), ring(WEST_MEKONG_SOUTH)), 0]] },
  { name: "Thailand", status: "state", b: 2, periods: [["1941-05-09", "1946-11-17", or(and(cs("811", "1940-01-01"), ne("KHM", "Batdâmbâng", "Bântéay Méanchey", "Krong Pailin", "Otdar Mean Chey", "Siemréab")), and(cs("812", "1940-01-01"), or(ne("LAO", "Xaignabouri"), and(ne("LAO", "Champasak"), ring(WEST_MEKONG_SOUTH))))), 0], ["1942-07-18", "1945-09-02", and(cs("775", "1940-01-01"), ne("MMR", "Shan"), ring(KENGTUNG)), 0], ["1943-10-18", "1945-09-02", ne("MYS", "Kedah", "Perlis", "Kelantan", "Terengganu"), 0]] }
];

// Applies the three lists to the spans from 1886 and returns the new list.
// Fringes of occupied land. Where a month's front cuts the units a non-Axis neighbour holds out of a state's occupied land (Hungary's
// Carpathian Ruthenia, until Hungary joins the Axis's ground in the files), what the state's own outline reaches beyond those units is left
// as specks of the occupied state inside or beside the neighbour: two drawings of one border, not land anyone occupied. A polygon of
// occupied land under REST_KM2 with FRINGE_SHARE of its outline within FRINGE_KM of one neighbour's spans (all the spans of one name and
// ruler together) is given to that neighbour, for the days each of its spans runs (to the state itself, unoccupied, where that is one of them). Only the occupied land of WW2_OCCUPIED is looked at, not the
// named regimes, and a polygon the state held whole before the war (an island) stays.
const FRINGE_KM = 2.5, FRINGE_SHARE = 0.8, FRINGE_POINTS = 60;
export function giveFringes(list, { polyKm2, km2Of, boxOf, withBox, isOccupied, isIsland = () => false, log = console.log }) {
  const boxHit = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
  // The distance in km from a point to the nearest ring of a span's polygons near it (planar at the point's latitude: these are a few km).
  const distTo = (pt, c, box) => {
    const kx = 111.195 * Math.cos(pt[1] * Math.PI / 180), ky = 111.195;
    let best = Infinity;
    for (const poly of c.polys) {
      if (!boxHit(boxOf([poly]), box)) continue;
      for (const ring of poly) for (let i = 1; i < ring.length; i++) {
        const ax = (ring[i - 1][0] - pt[0]) * kx, ay = (ring[i - 1][1] - pt[1]) * ky, bx = (ring[i][0] - pt[0]) * kx, by = (ring[i][1] - pt[1]) * ky;
        if (Math.min(ax, bx) > best || Math.max(ax, bx) < -best || Math.min(ay, by) > best || Math.max(ay, by) < -best) continue;
        const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
        const d = Math.hypot(ax + t * dx, ay + t * dy);
        if (d < best) best = d;
      }
    }
    return best;
  };
  const big = new Map(), isBig = (c) => { if (!big.has(c)) big.set(c, km2Of(c.polys) >= REST_KM2); return big.get(c); };
  const out = [], names = new Map();
  let moved = 0, km2 = 0;
  for (const s of list) {
    if (!isOccupied(s) || !s.polys.some((q) => polyKm2(q) < REST_KM2)) { out.push(s); continue; }
    const keep = [];
    for (const q of s.polys) {
      if (polyKm2(q) >= REST_KM2 || isIsland(s, q)) { keep.push(q); continue; }
      const qb = boxOf([q]), pad = 0.15, box = [qb[0] - pad, qb[1] - pad, qb[2] + pad, qb[3] + pad];
      const cands = list.filter((c) => c !== s && !c.people && !c.claims && !(c.name === s.name && (c.ruler || "") === (s.ruler || "")) && c.last >= s.first && c.first <= s.last && boxHit(c.box || boxOf(c.polys), box) && isBig(c));
      const ring = q[0], step = Math.max(1, Math.floor(ring.length / FRINGE_POINTS)), pts = ring.filter((p, i) => i % step === 0);
      const dist = new Map(cands.map((c) => [c, pts.map((p) => distTo(p, c, box))]));
      const cuts = new Set([s.first]);
      for (const c of cands) { if (c.first > s.first) cuts.add(c.first); if (c.last + 1 <= s.last) cuts.add(c.last + 1); }
      const bounds = [...cuts].sort((a, b) => a - b), runs = [];
      bounds.forEach((a, k) => {
        const b = k + 1 < bounds.length ? bounds[k + 1] - 1 : s.last, act = cands.filter((c) => c.first <= a && b <= c.last), groups = new Map();
        for (const c of act) { const key = c.name + "|" + (c.ruler || ""); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(c); }
        let to = null, least = Infinity;
        for (const g of groups.values()) {
          const d = pts.map((p, i) => Math.min(...g.map((c) => dist.get(c)[i]))), mean = d.reduce((t, x) => t + x, 0) / d.length;
          if (d.filter((x) => x <= FRINGE_KM).length < FRINGE_SHARE * d.length) continue;
          // The state itself, unoccupied, comes first: a fringe on its far border (the Soviet Union's with Turkey) is its own land.
          const own = g[0].name === s.name && !g[0].ruler ? -1 : mean;
          if (own >= least) continue;
          least = own;
          to = g.reduce((m, c) => { const dc = dist.get(c), dm = dist.get(m); return dc.reduce((t, x) => t + x, 0) < dm.reduce((t, x) => t + x, 0) ? c : m; });
        }
        const prev = runs[runs.length - 1];
        if (prev && prev.to === to) prev.last = b; else runs.push({ first: a, last: b, to });
      });
      if (runs.every((r) => !r.to)) { keep.push(q); continue; }
      for (const r of runs) {
        if (!r.to) { out.push(withBox({ ...s, first: r.first, last: r.last, polys: [q] })); continue; }
        out.push(withBox({ ...r.to, first: r.first, last: r.last, polys: [q], km2: undefined, pole: undefined, geoHash: undefined }));
        moved++;
        km2 += polyKm2(q);
        names.set(s.name + " to " + r.to.name, (names.get(s.name + " to " + r.to.name) || 0) + 1);
      }
    }
    if (keep.length) out.push(keep.length === s.polys.length ? s : withBox({ ...s, polys: keep }));
  }
  log("WW2: " + moved + " fringes of occupied land given to the state beside them (" + Math.round(km2) + " km² over their spans): " + [...names].map(([k, n]) => k + " " + n).join(", "));
  return out;
}

export function applyWW2(env) {
  const { clip, csRaw, neAll, carve, withBox, rewind, polysOf, km2Of, polyKm2, boxOf, dayOf, turfBuf, axisFile, endDay } = env;
  let list = env.list;
  const memo = new Map();
  const neByA3 = new Map();
  for (const f of neAll) { const a = f.properties.adm0_a3; if (!neByA3.has(a)) neByA3.set(a, []); neByA3.get(a).push(f); }
  const csAt = (gw, at) => {
    const hit = csRaw.find((r) => String(r.p.gwcode) === gw && r.p.start <= at && at <= r.p.end);
    if (!hit) throw new Error("WW2: no CShapes span of " + gw + " on " + at);
    return rewind(polysOf(hit.geometry));
  };
  const coastOf = (polys) => {
    if (!polys.length) return polys;
    const b = boxOf(polys), pad = 0.4;
    const near = [];
    for (const feats of neByA3.values()) for (const f of feats) for (const poly of polysOf(f.geometry)) {
      const pb = boxOf([poly]);
      if (pb[0] <= b[2] + pad && pb[2] >= b[0] - pad && pb[1] <= b[3] + pad && pb[3] >= b[1] - pad) near.push(poly);
    }
    const grown = rewind(polysOf(turfBuf({ type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: polys } }, COAST_KM, { units: "kilometers", steps: 6 }).geometry));
    // The sea within reach: the widened shape less every unit of land near it, taken a few at a time.
    let sea = grown;
    for (let i = 0; i < near.length && sea.length; i += 20) {
      const part = near.slice(i, i + 20).map((p) => [p]);
      try { sea = clip.difference(sea, ...part); } catch (e) { for (const q of part) { try { sea = clip.difference(sea, q); } catch (e2) {} } }
    }
    try { return rewind(safe(clip.union, polys, sea)); } catch (e) { return polys; }
  };
  // polygon-clipping fails now and then on shapes from different sources; rounding the coordinates
  // usually gets it through.
  const snapAt = (polys, k) => polys.map((poly) => poly.map((ring) => {
    const out = [];
    for (const q of ring) { const v = [Math.round(q[0] * k) / k, Math.round(q[1] * k) / k], l = out[out.length - 1]; if (!l || l[0] !== v[0] || l[1] !== v[1]) out.push(v); }
    return out;
  }).filter((ring) => ring.length >= 4)).filter((poly) => poly.length);
  const safe = (op, a, ...bs) => {
    let err;
    for (const k of [0, 1e6, 1e5, 1e4, 1e3]) {
      try { return k ? op(snapAt(a, k), ...bs.map((b) => snapAt(b, k))) : op(a, ...bs); } catch (e) { err = e; }
    }
    throw err;
  };
  const evalShape = (sp) => {
    const key = JSON.stringify(sp);
    if (memo.has(key)) return memo.get(key);
    try { return evalShape1(sp, key); } catch (e) { throw new Error("WW2 shape failed (" + e.message + "): " + key.slice(0, 300)); }
  };
  const evalShape1 = (sp, key) => {
    let r;
    if (sp.cs) r = csAt(sp.cs, sp.at);
    else if (sp.ne) {
      const feats = (neByA3.get(sp.ne) || []).filter((f) => !sp.n || sp.n.includes(f.properties.name));
      if (!feats.length || (sp.n && new Set(feats.map((f) => f.properties.name)).size !== new Set(sp.n).size)) throw new Error("WW2: Natural Earth units missing for " + key);
      r = coastOf(rewind(safe(clip.union, ...feats.map((f) => polysOf(f.geometry)))));
    } else if (sp.ohm) {
      if (!OHM || !OHM[sp.ohm]) throw new Error("WW2: no OpenHistoricalMap unit " + sp.ohm + " in ww2-ohm.json");
      r = rewind(OHM[sp.ohm].polys);
    } else if (sp.ring) r = rewind([[sp.ring]]);
    else if (sp.and) r = sp.and.map(evalShape).reduce((a, b) => (a.length && b.length ? safe(clip.intersection, a, b) : []));
    else if (sp.or) { const parts = sp.or.map(evalShape).filter((x) => x.length); r = parts.length ? safe(clip.union, ...parts) : []; }
    else if (sp.minus) { const [a, ...bs] = sp.minus.map(evalShape); const cut = bs.filter((b) => b.length); r = cut.length && a.length ? safe(clip.difference, a, ...cut) : a; }
    else throw new Error("WW2: bad shape " + key);
    r = rewind(r).filter((q) => polyKm2(q) >= 1);
    memo.set(key, r);
    return r;
  };
  // The Axis's ground, by theatre and month.
  const theatres = (axisFile ? axisFile.theatres : []).map((t) => ({ ...t, months: t.months.map(([a, b, p]) => ({ a, b, polys: rewind(p) })) }));
  const theatreFor = (polys) => {
    const b = boxOf(polys), c = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
    return theatres.find((t) => c[0] >= t.box[0] && c[0] <= t.box[2] && c[1] >= t.box[1] && c[1] <= t.box[3]) || null;
  };
  const boxRing = (b) => [[[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]], [b[0], b[1]]]];
  // The political map changes hands by whole first-level units, not along the front: the front itself is the zones of
  // control's (see the README's "Zones of control"). Each theatre is drawn on a grid of GRID degrees: which of Natural
  // Earth's units each cell is in, and, each month, whether the Axis held it. A unit of a shape goes with the side
  // that held most of the shape's part of it that month.
  const GRID = 0.1;
  const rasterize = (g, polys, mark) => {
    for (const poly of polys) {
      const rows = new Map();
      for (const ring of poly) for (let i = 1; i < ring.length; i++) {
        const [ax, ay] = ring[i - 1], [bx, by] = ring[i];
        const ra = Math.max(0, Math.ceil((g.y1 - Math.max(ay, by)) / GRID - 0.5) - 1), rb = Math.min(g.H - 1, Math.floor((g.y1 - Math.min(ay, by)) / GRID - 0.5) + 1);
        for (let r = ra; r <= rb; r++) {
          const lat = g.y1 - (r + 0.5) * GRID;
          if ((ay > lat) === (by > lat)) continue;
          if (!rows.has(r)) rows.set(r, []);
          rows.get(r).push(ax + (lat - ay) / (by - ay) * (bx - ax));
        }
      }
      for (const [r, xs] of rows) {
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          const c0 = Math.max(0, Math.ceil((xs[k] - g.x0) / GRID - 0.5)), c1 = Math.min(g.W - 1, Math.floor((xs[k + 1] - g.x0) / GRID - 0.5));
          for (let c = c0; c <= c1; c++) mark(r * g.W + c);
        }
      }
    }
  };
  const grids = new Map();
  const gridOf = (t) => {
    if (grids.has(t)) return grids.get(t);
    const g = { x0: t.box[0], y1: t.box[3], W: Math.ceil((t.box[2] - t.box[0]) / GRID), H: Math.ceil((t.box[3] - t.box[1]) / GRID) };
    g.unit = new Int32Array(g.W * g.H).fill(-1);
    g.units = [];
    for (const f of neAll) {
      const fp = polysOf(f.geometry), b = boxOf(fp);
      if (b[2] < t.box[0] || b[0] > t.box[2] || b[3] < t.box[1] || b[1] > t.box[3]) continue;
      const k = g.units.length;
      g.units.push(f);
      rasterize(g, fp, (i) => { g.unit[i] = k; });
    }
    g.held = t.months.map((m) => { const a = new Uint8Array(g.W * g.H); rasterize(g, m.polys, (i) => { a[i] ^= 1; }); return a; });
    g.coast = new Map();
    grids.set(t, g);
    return g;
  };
  const unitCoast = (g, k) => {
    if (!g.coast.has(k)) g.coast.set(k, coastOf(rewind(polysOf(g.units[k].geometry))));
    return g.coast.get(k);
  };
  // Splits [first, last] by the months of the theatre's ground, keeping each month the units of the shape the Axis held;
  // outside the theatre's months the shape is kept whole.
  // With settled (a regime's own land), a unit is lost only from the month after which the Axis never held most of it
  // again within the period, so a regime set up on conquered land keeps it until it is liberated for good: the cells
  // along a line that was no front (the German–Soviet line of 1939 to 1941) don't take its land month by month.
  const monthly = (polys, first, last, theatre, settled) => {
    const t = theatre || theatreFor(polys);
    if (!t) return [{ first, last, polys }];
    const g = gridOf(t), byUnit = new Map();
    rasterize(g, polys, (i) => { const k = g.unit[i]; if (k >= 0) { if (!byUnit.has(k)) byUnit.set(k, []); byUnit.get(k).push(i); } });
    const lostAt = (mi) => {
      const lost = new Set();
      for (const [k, cells] of byUnit) {
        let n = 0;
        for (const i of cells) n += g.held[mi][i];
        if (n * 2 < cells.length) lost.add(k);
      }
      return lost;
    };
    const inPeriod = t.months.map((m, mi) => (m.b >= first && m.a <= last ? mi : -1)).filter((mi) => mi >= 0);
    const lostBy = new Map();
    let later = null;
    for (const mi of inPeriod.slice().reverse()) {
      const now = lostAt(mi);
      const eff = settled ? new Set([...now].filter((k) => !later || later.has(k))) : now;
      lostBy.set(mi, eff);
      later = eff;
    }
    const lostMemo = new Map();
    const heldIn = (mi) => {
      const lost = [...(lostBy.get(mi) || [])].sort((a, b) => a - b);
      if (!lost.length) return polys;
      if (lost.length === byUnit.size) return [];
      const key = lost.join(",");
      if (!lostMemo.has(key)) {
        let p = [];
        try { p = rewind(cutOut(polys, rewind(safe(clip.union, ...lost.map((k) => unitCoast(g, k)))))).filter((q) => !isSliver(q)); } catch (e) { console.warn("WW2: a month's units failed, " + e.message); p = polys; }
        lostMemo.set(key, p);
      }
      return lostMemo.get(key);
    };
    const out = [];
    const push = (a, b, p) => {
      const prev = out[out.length - 1], area = km2Of(p);
      if (prev && prev.last === a - 1 && Math.abs(prev.area - area) <= SAME_SHARE * Math.max(area, 1)) { prev.last = b; return; }
      out.push({ first: a, last: b, polys: p, area });
    };
    let d = first;
    if (d < t.first) { const b = Math.min(last, t.first - 1); push(d, b, polys); d = b + 1; }
    t.months.forEach((m, mi) => {
      if (m.b < d || m.a > last) return;
      const a = Math.max(d, m.a), b = Math.min(last, m.b);
      push(a, b, m.polys.length ? heldIn(mi) : []);
      d = b + 1;
    });
    if (d <= last) push(d, last, polys);
    return out.filter((x) => km2Of(x.polys) >= MIN_KM2);
  };
  // The builder's carve() keeps a span whole when a difference fails, and the overlap is then settled
  // later, often against the new piece. Here a failed difference is tried again with the coordinates
  // rounded, then polygon by polygon, so the piece is cut out of the spans under it.
  let cutFailed = 0, slivers = 0;
  // A sliver: narrower than SLIVER_KM (twice the area over the outline) and long for its size (4πA/P² under 0.25,
  // where a circle is 1), or under a square kilometre. Islands are compact, and stay.
  const isSliver = (q) => {
    const a = polyKm2(q), per = ringKm(q[0]);
    return a < 1 || (a < 1000 && 2 * a / per < SLIVER_KM && 4 * Math.PI * a / (per * per) < 0.25);
  };
  const ringKm = (ring) => {
    let k = 0;
    for (let i = 1; i < ring.length; i++) { const c = Math.cos((ring[i][1] + ring[i - 1][1]) / 2 * Math.PI / 180); k += Math.hypot((ring[i][0] - ring[i - 1][0]) * c, ring[i][1] - ring[i - 1][1]) * 111.195; }
    return k || 1;
  };
  const cutOut = (polys, hole) => {
    try { return safe(clip.difference, polys, hole); } catch (e) {}
    const out = [];
    for (const poly of polys) {
      let rest = [poly];
      for (const h of hole) { try { rest = safe(clip.difference, rest, [h]); } catch (e) { cutFailed++; } }
      out.push(...rest);
    }
    return out;
  };
  const boxHit = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
  // The slivers a piece leaves of the spans under it go to the piece itself, over the days it covered them, so no land is
  // left blank (the builder's adoptLand fills only land no span ever covers).
  const carveWW2 = (spans, sm, given) => {
    const next = [];
    for (const r of spans) {
      if (r.last < sm.first || r.first > sm.last || !boxHit(r.box || boxOf(r.polys), sm.box)) { next.push(r); continue; }
      let hit = [];
      try { hit = safe(clip.intersection, r.polys, sm.polys); } catch (e) { hit = [[[0, 0]]]; }
      if (!hit.length) { next.push(r); continue; }
      const s0 = Math.max(r.first, sm.first), e0 = Math.min(r.last, sm.last);
      if (r.first < s0) next.push({ ...r, last: s0 - 1 });
      const polys = rewind(cutOut(r.polys, sm.polys)).filter((q) => {
        if (polyKm2(q) >= REST_KM2 && !isSliver(q)) return true;
        // An island the state held whole stays; anything else this small or thin is a sliver.
        const b = boxOf([q]);
        if (r.polys.some((o) => { const ob = boxOf([o]); return Math.abs(ob[0] - b[0]) < 1e-6 && Math.abs(ob[1] - b[1]) < 1e-6 && Math.abs(ob[2] - b[2]) < 1e-6 && Math.abs(ob[3] - b[3]) < 1e-6; })) return true;
        slivers++;
        given.push({ first: s0, last: e0, poly: q });
        return false;
      });
      if (polys.length) next.push(withBox({ ...r, first: s0, last: e0, polys }));
      if (r.last > e0) next.push({ ...r, first: e0 + 1 });
    }
    return next;
  };
  const STATUS = { state: 0, colony: 1, protectorate: 2, mandate: 3, occupied: 4, dependency: 5 };
  let pieces = 0;
  const lay = (name, wiki, status, ruler, b, first, last, polys0, occBase) => {
    const polys = polys0.filter((q) => polyKm2(q) >= 1);
    if (last < first || !polys.length) return;
    // A regime with the name of a state on the map at the time is that state, and shares its article.
    if (!wiki) { const same = list.find((x) => x.name === name && x.first <= last && x.last >= first && x.src !== "ww2"); wiki = same ? same.wiki : name; }
    const sm = withBox({ name, ruler: ruler || "", part: "", people: 0, b, status: ruler ? STATUS[status] : 0, first, last, polys, wiki, src: "ww2" });
    if (occBase) sm.occBase = occBase;
    const given = [];
    list = carveWW2(list, sm, given);
    // The slivers, by their days, as pieces of the same regime.
    const byDays = new Map();
    for (const g of given) { const k = g.first + ":" + g.last; if (!byDays.has(k)) byDays.set(k, []); byDays.get(k).push(g.poly); }
    for (const [k, ps] of byDays) {
      const [a, z] = k.split(":").map(Number);
      list.push(withBox({ ...sm, first: a, last: z, polys: ps }));
    }
    list.push(sm);
    pieces++;
  };
  const clampDays = (from, to) => [Math.max(0, dayOf(from)), Math.min(endDay, dayOf(to))];
  for (const [name, wiki, status, ruler, from, to, shape, b] of WW2_FIXES) {
    const polys = evalShape(shape);
    if (!polys.length) { console.log("WW2 fix " + name + " (" + wiki + "): empty, skipped"); continue; }
    const [a, z] = clampDays(from, to);
    lay(name, wiki, status, ruler, b, a, z, polys);
  }
  // Occupied land, from a snapshot of the list: each state's spans cut by the months.
  const occ = [];
  const ASIA = new Set(["China", "Philippines", "Guam", "Dutch East Indies", "Straits Settlements", "Federated Malay States", "Unfederated Malay States", "Burma", "Sarawak", "North Borneo", "Brunei", "East Timor", "Papua", "New Guinea", "Solomon Islands", "Alaska", "British India"]);
  for (const [name, from, to, occupier] of WW2_OCCUPIED) {
    const [a0, z0] = clampDays(from, to);
    const t = theatres.find((x) => x.key === (ASIA.has(name) ? "ww2asia" : "ww2europe"));
    if (!t) continue;
    for (const s of list.filter((x) => x.name === name && x.last >= a0 && x.first <= z0 && !x.people)) {
      const a = Math.max(a0, s.first, t.first), z = Math.min(z0, s.last, t.last);
      if (z < a) continue;
      let polys = s.polys;
      const sb = boxOf(polys);
      if (sb[0] < t.box[0] || sb[2] > t.box[2] || sb[1] < t.box[1] || sb[3] > t.box[3]) polys = rewind(clip.intersection(polys, boxRing(t.box)));
      if (!polys.length) continue;
      for (const m of monthly(polys, a, z, t)) occ.push({ name, wiki: s.wiki, occupier, m, base: s });
    }
  }
  for (const o of occ) lay(o.name, o.wiki, "occupied", o.occupier, 2, o.m.first, o.m.last, o.m.polys, o.base.polys);
  const occPieces = pieces;
  for (const r of WW2_REGIMES) for (const [from, to, shape, cut] of r.periods) {
    const polys = evalShape(shape);
    if (!polys.length) { console.log("WW2 regime " + r.name + " " + from + ": empty, skipped"); continue; }
    const [a, z] = clampDays(from, to);
    for (const m of cut ? monthly(polys, a, z, null, true) : [{ first: a, last: z, polys }]) lay(r.name, r.wiki, r.status, r.ruler, r.b, m.first, m.last, m.polys);
  }
  console.log("WW2: " + WW2_FIXES.length + " fixes, " + occPieces + " pieces before the regimes (" + occ.length + " occupied), " + (pieces - occPieces) + " pieces of " + WW2_REGIMES.length + " regimes, " + theatres.length + " theatres of the Axis's ground, " + cutFailed + " cuts failed, " + slivers + " slivers dropped");
  const sameBox = (a, b) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6 && Math.abs(a[2] - b[2]) < 1e-6 && Math.abs(a[3] - b[3]) < 1e-6;
  list = giveFringes(list, { polyKm2, km2Of, boxOf, withBox, isOccupied: (x) => !!x.occBase, isIsland: (x, q) => { const b = boxOf([q]); return x.occBase.some((o) => sameBox(boxOf([o]), b)); } });
  for (const x of list) if (x.occBase) delete x.occBase;
  return list;
}
