// Each country's own character, held consistently across the map: the sound
// of its place names, how it numbers and signs its roads, how its towns are
// laid out, and how it names its protected land.

// Sound systems: onsets, vowels, codas, and the endings and prefixes towns
// take. Every country draws its names from one, so neighbours sound like
// different languages.
export const PHONOLOGIES = [
  { id: 'nordic', on: ['b', 'd', 'f', 'g', 'h', 'k', 'l', 'm', 'n', 'r', 's', 't', 'v', 'sk', 'st', 'tr', 'bj', 'fj', 'gr', 'hv'], v: ['a', 'e', 'i', 'o', 'u', 'ø', 'å', 'y', 'ei'], co: ['', 'n', 'r', 'l', 'rd', 'nd', 'st', 'k', 'ng'], end: ['by', 'vik', 'heim', 'stad', 'dal', 'holm', 'fjord', 'sund', 'ness'], pre: [], syl: [1, 2] },
  { id: 'romance', on: ['b', 'c', 'd', 'f', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'g', 'br', 'tr', 'pr'], v: ['a', 'e', 'i', 'o', 'a', 'o', 'ia', 'ie'], co: ['', '', '', 'n', 's', 'l', 'r'], end: ['ano', 'ella', 'ino', 'osa', 'ara', 'ona', 'ezza', 'one'], pre: ['San', 'Santa', 'Villa', 'Porto', 'Monte'], syl: [2, 3] },
  { id: 'slavic', on: ['b', 'd', 'g', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'z', 'br', 'dr', 'gr', 'kr', 'pr', 'st', 'zv', 'sl', 'ch', 'zh'], v: ['a', 'e', 'i', 'o', 'u', 'y', 'ie'], co: ['', 'k', 'n', 'v', 'sk', 'ts', 'r', 'sh'], end: ['ovo', 'ica', 'grad', 'sk', 'ets', 'ino', 'ava', 'ovka', 'ograd'], pre: ['Novi', 'Stara', 'Gorni'], syl: [2, 2, 3] },
  { id: 'polynesian', on: ['h', 'k', 'l', 'm', 'n', 'p', 't', 'w', 'v', '', ''], v: ['a', 'e', 'i', 'o', 'u', 'ai', 'au', 'oa'], co: [''], end: ['', '', 'nui', 'iti', 'roa'], pre: ['Motu', 'Hale'], syl: [2, 3, 3, 4] },
  { id: 'arabic', on: ['b', 'd', 'f', 'h', 'j', 'k', 'kh', 'm', 'n', 'q', 'r', 's', 'sh', 't', 'z', 'gh'], v: ['a', 'a', 'i', 'u', 'aa', 'ai'], co: ['r', 'n', 'm', 'd', 'b', '', 'l', 'f'], end: ['', '', 'iya', 'ah', 'abad'], pre: ['Al', 'Bir', 'Ras', 'Wadi', 'Qasr'], syl: [2, 2, 3] },
  { id: 'japanic', on: ['k', 's', 't', 'n', 'h', 'm', 'y', 'r', 'w', 'g', 'z', 'd', 'b', 'sh', 'ch', 'ts'], v: ['a', 'i', 'u', 'e', 'o', 'o', 'a'], co: ['', '', '', 'n'], end: ['shima', 'mura', 'saki', 'oka', 'hara', 'kawa', 'zaki', 'yama'], pre: [], syl: [2, 2, 3] },
  { id: 'celtic', on: ['b', 'c', 'd', 'g', 'l', 'm', 'n', 'p', 'r', 't', 'dr', 'gl', 'cr', 'br', 'll', 'rh'], v: ['a', 'e', 'i', 'o', 'y', 'ae', 'ai', 'w'], co: ['n', 'r', 'l', 'dd', 'th', 'ch', '', 'gh'], end: ['more', 'wen', 'ach', 'avon', 'dale', 'mouth'], pre: ['Aber', 'Llan', 'Kil', 'Ard', 'Bally', 'Inver'], syl: [1, 2, 2] },
  { id: 'germanic', on: ['b', 'd', 'f', 'g', 'h', 'k', 'l', 'm', 'n', 'r', 's', 't', 'w', 'sch', 'st', 'br', 'kr', 'fr'], v: ['a', 'e', 'i', 'o', 'u', 'ei', 'au', 'ü', 'ö'], co: ['n', 'r', 'l', 'ch', 'rg', 'nd', 'ck', '', 'tz', 'lm'], end: ['burg', 'dorf', 'hausen', 'feld', 'ingen', 'bach', 'stein', 'heim', 'au'], pre: ['Neu', 'Alt', 'Ober'], syl: [1, 2] },
  { id: 'bantu', on: ['b', 'k', 'l', 'm', 'n', 'ng', 'mb', 'nd', 's', 't', 'w', 'z', 'ny', 'ch'], v: ['a', 'e', 'i', 'o', 'u', 'a'], co: [''], end: ['ani', 'ala', 'enge', 'ombe', 'iru'], pre: ['Ki', 'Mo', 'Ka'], syl: [2, 3, 3] },
  { id: 'finnic', on: ['h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v'], v: ['a', 'e', 'i', 'o', 'u', 'ä', 'ö', 'aa', 'ii', 'uo'], co: ['n', 's', 't', '', '', 'l', 'k'], end: ['la', 'järvi', 'koski', 'niemi', 'mäki', 'salo', 'lahti'], pre: [], syl: [2, 2, 3] },
  { id: 'andean', on: ['ch', 'k', 'p', 'q', 't', 'w', 'y', 'h', 'm', 'n', 'r', 's', 'll'], v: ['a', 'i', 'u', 'a'], co: ['', 'n', 'y', 'q', ''], end: ['pampa', 'marca', 'bamba', 'cocha', 'huasi'], pre: [], syl: [2, 3] },
  { id: 'hellenic', on: ['k', 'l', 'm', 'n', 'p', 't', 'th', 'ph', 'st', 'dr', 'x', 'z', 'ch', 'kr', 'pl'], v: ['a', 'e', 'i', 'o', 'y', 'ou', 'ai', 'ei'], co: ['s', 'n', '', '', 'r'], end: ['os', 'ia', 'polis', 'ion', 'ada', 'ikos', 'ari'], pre: ['Agios', 'Nea', 'Palaio'], syl: [2, 3] },
];

// Route numbers and their signs. trunk/motorway: how a number is written;
// sign: the shield's style (shape and colours, drawn by the page).
export const ROUTE_STYLES = [
  { id: 'a-blue', trunk: (n) => `N${n}`, motorway: (n) => `A${n}`, sign: 'red', mSign: 'blue' },
  { id: 'm-green', trunk: (n) => `A${n}`, motorway: (n) => `M${n}`, sign: 'green', mSign: 'blue' },
  { id: 'r-dash', trunk: (n) => `R-${n}`, motorway: (n) => `AP-${n}`, sign: 'white', mSign: 'blue' },
  { id: 'hwy', trunk: (n) => `Hwy ${n}`, motorway: (n) => `I-${n}`, sign: 'badge', mSign: 'interstate' },
  { id: 'plain', trunk: (n) => `${n}`, motorway: (n) => `${n}`, sign: 'yellow', mSign: 'yellow' },
  { id: 'b-yellow', trunk: (n) => `B${n}`, motorway: (n) => `A${n}`, sign: 'yellow', mSign: 'blue' },
  { id: 'sr', trunk: (n) => `SR ${n}`, motorway: (n) => `${n}`, sign: 'white', mSign: 'green' },
  { id: 'd-red', trunk: (n) => `D${n}`, motorway: (n) => `A${n}`, sign: 'yellow', mSign: 'red' },
  { id: 'route', trunk: (n) => `Rt ${n}`, motorway: (n) => `E${n}`, sign: 'green', mSign: 'green' },
  { id: 'brown', trunk: (n) => `${n}`, motorway: (n) => `T${n}`, sign: 'white', mSign: 'brown' },
];

// How towns are laid out.
export const STREET_STYLES = ['grid', 'radial', 'organic', 'linear'];
const STREET_BIAS = {
  nordic: ['organic', 'grid', 'linear'], romance: ['organic', 'radial', 'organic'], slavic: ['radial', 'grid', 'organic'],
  polynesian: ['linear', 'linear', 'organic'], arabic: ['organic', 'organic', 'grid'], japanic: ['grid', 'organic', 'linear'],
  celtic: ['organic', 'linear', 'organic'], germanic: ['radial', 'organic', 'grid'], bantu: ['grid', 'organic', 'radial'],
  finnic: ['grid', 'linear', 'organic'], andean: ['grid', 'grid', 'organic'], hellenic: ['organic', 'linear', 'radial'],
};

// How protected land is named: a form for each kind of park.
export const PARK_CUSTOMS = [
  { id: 'american', park: (w) => `${w} National Park`, preserve: (w) => `${w} National Park and Preserve`, forest: (w) => `${w} National Forest`, refuge: (w) => `${w} Wildlife Refuge`, marine: (w) => `${w} National Seashore`, desert: (w) => `${w} National Monument`, small: (w) => `${w} State Park` },
  { id: 'european', park: (w) => `${w} National Park`, preserve: (w) => `${w} Nature Park`, forest: (w) => `${w} Forest Park`, refuge: (w) => `${w} Nature Reserve`, marine: (w) => `${w} Marine Park`, desert: (w) => `${w} Nature Reserve`, small: (w) => `${w} Nature Reserve` },
  { id: 'prefix', park: (w) => `National Park ${w}`, preserve: (w) => `Reserve ${w}`, forest: (w) => `Forest Park ${w}`, refuge: (w) => `Wetland Reserve ${w}`, marine: (w) => `Marine Park ${w}`, desert: (w) => `National Park ${w}`, small: (w) => `Reserve ${w}` },
  { id: 'commonwealth', park: (w) => `${w} National Park`, preserve: (w) => `${w} Wilderness`, forest: (w) => `${w} State Forest`, refuge: (w) => `${w} Wetlands`, marine: (w) => `${w} Marine Reserve`, desert: (w) => `${w} Conservation Area`, small: (w) => `${w} Provincial Park` },
  { id: 'biosphere', park: (w) => `${w} National Park`, preserve: (w) => `${w} Biosphere Reserve`, forest: (w) => `${w} Forest Reserve`, refuge: (w) => `${w} Bird Sanctuary`, marine: (w) => `${w} Marine Sanctuary`, desert: (w) => `${w} Protected Area`, small: (w) => `${w} Reserve` },
];

// Foochow Romanized, for the Fuzhounese Dictionary's country: hyphenated
// syllables with their tone marks (the fonts carry the precomposed letters;
// the e and o with a diaeresis below are simplified to their breve forms).
const FOOCHOW_INITIAL = ['b', 'p', 'm', 'd', 't', 'n', 'l', 'g', 'k', 'ng', 'h', 'c', 'ch', 's', '', 'b', 'd', 'g', 'h', 'c', 's'];
const FOOCHOW_FINAL = ['a', 'ia', 'ua', 'e', 'ie', 'uo', 'o', 'ai', 'au', 'iu', 'ui', 'ang', 'iang', 'uang', 'eng', 'ieng', 'ing', 'ong', 'uong', 'ung', 'ak', 'iak', 'ek', 'iek', 'ik', 'ok', 'uok', 'uk', 'oi', 'u', 'iong', 'eu'];
const TONES = { a: ['a', 'á', 'à', 'â', 'ă', 'ā'], e: ['e', 'é', 'è', 'ê', 'ĕ', 'ē'], i: ['i', 'í', 'ì', 'î', 'ĭ', 'ī'], o: ['o', 'ó', 'ò', 'ô', 'ŏ', 'ō'], u: ['u', 'ú', 'ù', 'û', 'ŭ', 'ū'] };
function foochowSyllable(rng) {
  let init = rng.pick(FOOCHOW_INITIAL), fin = rng.pick(FOOCHOW_FINAL);
  if (init === 'ng' && fin.startsWith('i')) init = 'n';
  // The tone mark goes on the main vowel: the last vowel of a diphthong opening in i or u, else the first.
  const vs = [...fin].map((c, k) => ('aeiou'.includes(c) ? k : -1)).filter((k) => k >= 0);
  const at = vs.length > 1 && 'iu'.includes(fin[vs[0]]) ? vs[1] : vs[0];
  const tone = rng.int(6);
  const marked = fin.slice(0, at) + TONES[fin[at]][tone] + fin.slice(at + 1);
  return init + marked;
}
export const FOOCHOW = {
  id: 'foochow', end: [], pre: [],
  name: (rng, n) => {
    const parts = [];
    for (let k = 0; k < n; k++) parts.push(foochowSyllable(rng));
    const s = parts.join('-');
    return s.charAt(0).toUpperCase() + s.slice(1);
  },
};

// The architects' country names its towns after the modern era's architects.
export const ARCHITECTS = ['Aalto', 'Barragán', 'Gropius', 'Hadid', 'Kahn', 'Mies', 'Niemeyer', 'Saarinen', 'Siza', 'Tange', 'Utzon', 'Wright', 'Ando', 'Bo Bardi', 'Breuer', 'Eames', 'Gehry', 'Isozaki', 'Lasdun', 'Lubetkin', 'Neutra', 'Piano', 'Rossi', 'Scarpa', 'Sert', 'Mendelsohn', 'Loos', 'Behrens', 'Perret', 'Prouvé', 'Kikutake', 'Kurokawa', 'Maekawa', 'Asplund', 'Jacobsen', 'Lewerentz', 'Rudolph', 'Johnson', 'Pei', 'Foster', 'Rogers', 'Stirling', 'Smithson', 'Venturi', 'Graves', 'Meier', 'Eisenman', 'Koolhaas', 'Herzog', 'Zumthor', 'Moneo', 'Botta', 'Holl', 'Kahn', 'Sullivan', 'Schindler', 'Lautner', 'Candela', 'Villanueva', 'Lina', 'Doshi', 'Correa', 'Bawa', 'Fathy', 'Tatlin', 'Melnikov', 'Rietveld', 'Oud', 'Dudok', 'Berlage', 'Taut', 'Scharoun', 'Häring', 'Terragni', 'Nervi', 'Ponti', 'Albini', 'Lods', 'Fuller', 'Wurster', 'Soriano', 'Ellwood', 'Koenig', 'Saarinen', 'Bunshaft', 'Yamasaki', 'Pelli', 'Roche', 'Mendes da Rocha', 'Artigas', 'Costa', 'Burle Marx', 'Aravena', 'Sejima', 'Ito', 'Maki', 'Shinohara'];

// The New York and Chicago countries take real names: their towns are New York State's and Illinois's cities and
// towns, and their other features (rivers, lakes, hills, and parks) the states' own names for theirs.
export const REAL_PLACES = {
  'new-york': {
    towns: ['Albany', 'Buffalo', 'Rochester', 'Syracuse', 'Ithaca', 'Utica', 'Schenectady', 'Binghamton', 'Poughkeepsie', 'Saratoga Springs', 'Yonkers', 'Troy', 'Kingston', 'Elmira', 'Plattsburgh', 'Oswego', 'Niagara Falls', 'Cooperstown', 'Watertown', 'Hudson', 'Beacon', 'Rhinebeck', 'Lake Placid', 'Woodstock', 'Cortland', 'Oneonta', 'Geneva', 'Auburn', 'Corning', 'Jamestown', 'Olean', 'Lockport', 'Batavia', 'Canandaigua', 'Newburgh', 'Peekskill', 'Ossining', 'Glens Falls', 'Amsterdam', 'Gloversville', 'Rome', 'Massena', 'Ogdensburg', 'Potsdam', 'Malone', 'Saranac Lake', 'Hornell', 'Norwich', 'Catskill', 'Cold Spring', 'Montauk', 'Riverhead', 'Huntington', 'Hempstead', 'New Paltz', 'Margaretville', 'Penn Yan', 'Skaneateles', 'Seneca Falls', 'Dunkirk', 'Fredonia', 'Lake George', 'Ticonderoga', 'Hyde Park', 'Sag Harbor'],
    words: ['Adirondack', 'Catskill', 'Seneca', 'Cayuga', 'Mohawk', 'Onondaga', 'Oneida', 'Chautauqua', 'Champlain', 'Genesee', 'Susquehanna', 'Taughannock', 'Letchworth', 'Shawangunk', 'Allegany', 'Tug Hill', 'Keuka', 'Otsego', 'Saranac', 'Ausable', 'Esopus', 'Schoharie', 'Chenango', 'Owasco', 'Canadice', 'Hemlock', 'Montezuma', 'Taconic', 'Harriman', 'Minnewaska', 'Tupper', 'Raquette', 'Sacandaga', 'Peconic', 'Gardiners', 'Moriches', 'Marcy', 'Whiteface', 'Slide', 'Watkins'],
  },
  illinois: {
    towns: ['Springfield', 'Peoria', 'Rockford', 'Champaign', 'Naperville', 'Joliet', 'Aurora', 'Elgin', 'Evanston', 'Decatur', 'Bloomington', 'Waukegan', 'Urbana', 'Galena', 'Normal', 'Carbondale', 'Kankakee', 'Moline', 'Quincy', 'Cairo', 'Oak Park', 'Skokie', 'Wheaton', 'DeKalb', 'Rock Island', 'Danville', 'Galesburg', 'Macomb', 'Ottawa', 'LaSalle', 'Peru', 'Dixon', 'Freeport', 'Sterling', 'Pekin', 'Lincoln', 'Mattoon', 'Charleston', 'Effingham', 'Centralia', 'Mount Vernon', 'Marion', 'Alton', 'Belleville', 'Edwardsville', 'Collinsville', 'Jacksonville', 'Kewanee', 'Princeton', 'Streator', 'Pontiac', 'Rantoul', 'Crystal Lake', 'McHenry', 'St. Charles', 'Morris', 'Nauvoo', 'Metropolis', 'Harrisburg', 'Vandalia', 'Havana'],
    words: ['Kaskaskia', 'Sangamon', 'Shawnee', 'Kickapoo', 'Illinois', 'Fox', 'Des Plaines', 'Kankakee', 'Rock', 'Vermilion', 'Embarras', 'Mackinaw', 'Spoon', 'Pecatonica', 'Kishwaukee', 'Apple', 'Starved Rock', 'Matthiessen', 'Giant City', 'Pere Marquette', 'Chain O\'Lakes', 'Carlyle', 'Shelbyville', 'Rend', 'Crab Orchard', 'Horseshoe', 'Kinkaid', 'Garden of the Gods', 'Cache', 'Little Wabash', 'Saline', 'Big Muddy', 'Salt Creek', 'Calumet', 'Wolf', 'Skokie', 'Waubonsee', 'Mississippi', 'Wabash', 'Ohio'],
  },
};
// Two countries named in their projects' own words. Braidable's places are named for strands, plaits, and the
// weaver's craft (Skeinmouth, Weft Landing, Three Strands); the portfolio's for the parts of a book and a page
// (Recto, Verso, Colophon, Quarto), its capital Port Folio.
const BRAID_ROOTS = ['Strand', 'Plait', 'Tress', 'Skein', 'Weft', 'Warp', 'Twine', 'Cord', 'Hank', 'Loop', 'Ply', 'Lace', 'Knot', 'Splice', 'Tassel', 'Ribbon', 'Bobbin', 'Shuttle', 'Spindle', 'Distaff', 'Fishtail', 'Lattice', 'Weave', 'Thread', 'Selvage', 'Heddle', 'Reel', 'Spool'];
const BRAID_FORMS = [(w) => w, (w) => `${w}ford`, (w) => `${w}mouth`, (w) => `${w} Landing`, (w) => `${w} Ferry`, (w) => `${w}wick`, (w) => `${w} Crossing`, (w) => `${w}holm`, (w) => `${w}ton`, (w) => `${w} Bridge`];
const FOLIO_TOWNS = ['Recto', 'Verso', 'Quarto', 'Octavo', 'Colophon', 'Vellum', 'Endpaper', 'Gutter', 'Margin', 'Baseline', 'Serif', 'Kerning', 'Leading', 'Ligature', 'Spread', 'Proof', 'Imprint', 'Gilt Edge', 'Signature', 'Deckle', 'Bleed', 'Swatch', 'Mockup', 'Sketchbook', 'Case Study', 'Plate', 'Spine', 'Duodecimo', 'Folio Bay', 'Quire', 'Errata', 'Index', 'Gallery', 'Vignette', 'Ampersand', 'Pilcrow', 'Thumbnail', 'Wireframe', 'Prototype', 'Draft'];
const FOLIO_WORDS = ['Vellum', 'Quire', 'Colophon', 'Gutter', 'Margin', 'Serif', 'Recto', 'Verso', 'Octavo', 'Ligature', 'Kerning', 'Baseline', 'Deckle', 'Pilcrow', 'Ampersand', 'Spread', 'Gilt', 'Errata', 'Vignette', 'Wireframe', 'Sketchbook', 'Swatch'];
export const THEMED_PLACES = {
  braids: { towns: null, words: BRAID_ROOTS, big: 0 },
  folio: { towns: FOLIO_TOWNS, words: FOLIO_WORDS, big: 0 },
};
function themedTowns(id, rng) {
  if (id !== 'braids') return THEMED_PLACES[id].towns;
  // Every root in one of the forms, the plain and short forms first; and the capital's neighbour, Three Strands.
  const out = ['Three Strands'];
  for (const w of rng.shuffle(BRAID_ROOTS)) out.push(rng.pick(BRAID_FORMS)(w));
  return out;
}

// A namer from a list of real names, shuffled once per world but the largest first (places are named largest
// first, so the cities take the cities' names and the villages the villages'); past its end, a country's invented
// names (never a real name twice).
function realNamer(list, rng, fallback) {
  const big = list.big ?? 12;
  const towns = [...rng.shuffle(list.towns.slice(0, big)), ...rng.shuffle(list.towns.slice(big))], words = rng.shuffle(list.words.slice());
  let t = 0, w = 0;
  return {
    word: () => (w < words.length ? words[w++] : fallback.word()),
    town: () => (t < towns.length ? towns[t++] : fallback.town()),
  };
}

// makeNamer for one sound system: names that sound of one language.
export function phonologyNamer(ph, rng) {
  const used = new Set();
  if (ph.id === 'foochow') {
    const fresh = (n) => { for (let t = 0; t < 60; t++) { const s = FOOCHOW.name(rng, n); if (!used.has(s)) { used.add(s); return s; } } return FOOCHOW.name(rng, n) + used.size; };
    return { word: () => fresh(rng.chance(0.75) ? 2 : 1), town: () => fresh(rng.chance(0.8) ? 2 : 3) };
  }
  if (THEMED_PLACES[ph.id]) return realNamer({ ...THEMED_PLACES[ph.id], towns: themedTowns(ph.id, rng) }, rng, phonologyNamer(PHONOLOGIES.find((p) => p.id === (ph.base || 'celtic')) || PHONOLOGIES[0], rng.fork('fallback')));
  if (REAL_PLACES[ph.id]) return realNamer(REAL_PLACES[ph.id], rng, phonologyNamer(PHONOLOGIES.find((p) => p.id === (ph.base || 'celtic')) || PHONOLOGIES[0], rng.fork('fallback')));
  if (ph.id === 'architects') {
    const pool = rng.shuffle([...new Set(ARCHITECTS)]);
    const fallback = phonologyNamer(PHONOLOGIES[0], rng);
    let k = 0;
    return {
      word: () => fallback.word(),
      town: () => {
        const base = pool[k++ % pool.length], lap = Math.floor((k - 1) / pool.length);
        // Mostly the plain surname; now and then a form a town might take.
        // (Never "Saint": several of these architects were no saints.)
        const form = lap ? rng.pick([(w) => `${w} Heights`, (w) => `Port ${w}`, (w) => `${w} Park`, (w) => `New ${w}`]) : rng.chance(0.1) ? rng.pick([(w) => `${w} Heights`, (w) => `Port ${w}`, (w) => `${w} Park`]) : (w) => w;
        const name = form(base);
        if (used.has(name)) return `${base} ${used.size}`;
        used.add(name);
        return name;
      },
    };
  }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const core = () => {
    const n = rng.pick(ph.syl);
    let s = '';
    for (let k = 0; k < n; k++) {
      s += rng.pick(ph.on) + rng.pick(ph.v);
      if (k === n - 1 || rng.chance(0.25)) s += rng.pick(ph.co);
    }
    return s;
  };
  const ok = (s) => s.length >= 3 && s.length <= 11 && !/(.)\1\1/.test(s) && !/[aeiouyøåäöü]{3}/.test(s);
  const word = () => {
    for (let t = 0; t < 60; t++) {
      const s = core();
      if (!ok(s) || used.has(s)) continue;
      used.add(s);
      return cap(s);
    }
    return cap(core()) + used.size;
  };
  const town = () => {
    for (let t = 0; t < 60; t++) {
      let s = core();
      if (ph.end.length && rng.chance(0.45)) {
        const e = rng.pick(ph.end);
        if (e) s = s.replace(/[aeiouyøåäöü]+$/, '') + e;
      }
      if (!ok(s.replace(/[aeiouyøåäöü]+$/, 'a')) || s.length > 13 || used.has(s)) continue;
      used.add(s);
      let name = cap(s);
      if (ph.pre.length && rng.chance(0.08)) name = `${rng.pick(ph.pre)} ${name}`;
      return name;
    }
    return word();
  };
  return { word, town };
}

// assignCultures(projects, rng, neighbours) => one culture per project:
// { phon, namer, route, streets, parks }. Neighbouring countries get
// different sound systems where there are enough to go round.
export function assignCultures(projects, rng, nearBy = null) {
  const r = rng.fork('cultures');
  const phons = r.shuffle(PHONOLOGIES.slice());
  const routes = r.shuffle(ROUTE_STYLES.slice());
  const customs = r.shuffle(PARK_CUSTOMS.slice());
  const out = [];
  projects.forEach((p, k) => {
    // The first sound system not spoken next door.
    let ph = phons[k % phons.length];
    const special = p.id === 'fuzhounese' ? FOOCHOW : p.id === 'architects' ? { id: 'architects' } : p.id === 'nyc' ? { id: 'new-york' } : p.id === 'chicago' ? { id: 'illinois' } : p.id === 'braidable' ? { id: 'braids' } : p.id === 'portfolio' ? { id: 'folio' } : null;
    if (nearBy) {
      const taken = new Set((nearBy[k] || []).map((j) => out[j] && out[j].phon.id).filter(Boolean));
      for (let t = 0; t < phons.length && taken.has(ph.id); t++) ph = phons[(k + t + 1) % phons.length];
    }
    const cr = r.fork(`c${k}`);
    if (special) ph = { ...ph, id: special.id, base: ph.id };
    out.push({
      phon: ph,
      namer: phonologyNamer(special ? { ...ph, id: special.id, base: ph.base } : ph, cr.fork('names')),
      route: routes[k % routes.length],
      streets: cr.pick(STREET_BIAS[ph.base || ph.id] || STREET_STYLES),
      parks: customs[k % customs.length],
    });
  });
  return out;
}

// Capitals that nod to their project.
export const CAPITAL_NAMES = { chicago: 'Chicago', nyc: 'New York', fuzhounese: 'Hók-ciŭ', architects: 'Le Corbusier', braidable: 'Braidmouth', portfolio: 'Port Folio' };
