export const SA_FROM = 1700, SA_TO = 1885, SA_OFF_KM2 = 10000;
export const SA_LATE_FROM = "1886-01-01", SA_LATE_TO = "1975-05-16";
export const SA_FRAME = ["IND", "PAK", "BGD", "NPL", "BTN", "LKA", "MDV", "AFG"];
export const SA_LEAVE = ["IND:Goa/North Goa", "IND:Goa/South Goa"];
export const MARATHA = "Maratha Confederacy", MARATHA_FROM = 1738, MARATHA_TO = 1817;

const UK = [["1700-01-01", "Kingdom of England"], ["1707-05-01", "Kingdom of Great Britain"], ["1801-01-01", "United Kingdom"]];
const FR = [["1700-01-01", "Kingdom of France"], ["1792-09-21", "French First Republic"], ["1804-05-18", "First French Empire"], ["1814-04-06", "Bourbon Kingdom of France"], ["1830-08-09", "Kingdom of the French"], ["1848-02-24", "French Second Republic"], ["1852-12-02", "Second French Empire"], ["1870-09-04", "French Third Republic"], ["1940-07-10", "France"]];
const PT = [["1700-01-01", "Kingdom of Portugal"], ["1910-10-05", "Portugal"]];
const DK = [["1700-01-01", "Denmark-Norway"], ["1814-01-14", "Kingdom of Denmark"]];
const NL = [["1700-01-01", "Dutch Republic"]];
const REGIMES = { "@UK": UK, "@FR": FR, "@PT": PT, "@DK": DK, "@NL": NL };

const P = { people: 1 };
const dep = (from, ruler = "@UK", more = {}) => [from, { ruler, status: 5, ...more }];
const MC = (from, to = "1818-06-03") => [[from, { part: MARATHA }], [to, { part: "" }]];

export const CS_COVERED = new Set(["RAJ", "GOR", "NPL", "BHU", "CEY", "MDV", "INDIA", "PAKIS", "BURMA", "DUR"]);
export const SOLID = new Set(["RAJ", "GOR", "NPL", "BHU", "CEY", "DCY", "MDV", "SIK", "SKI", "SKP", "POR", "FRI", "DAN", "INDIA", "PAKIS", "OMA"]);

export const OWNERS = {
  MUG: ["Mughal Empire", "Mughal Empire", [["1700-01-01", {}], dep("1803-09-14")]],
  MAR: ["Maratha Empire", "Maratha Empire", [["1700-01-01", {}], ...MC("1738-01-07", "1802-12-31"), dep("1802-12-31")]],
  SCI: ["Gwalior State", "Gwalior State", [["1700-01-01", {}], ...MC("1738-01-07", "1817-11-05"), dep("1817-11-05")]],
  HOL: ["Indore State", "Indore State", [["1700-01-01", {}], ...MC("1738-01-07", "1818-01-06"), dep("1818-01-06")]],
  GAE: ["Baroda State", "Baroda State", [["1700-01-01", {}], ...MC("1738-01-07", "1805-04-21"), dep("1805-04-21")]],
  BHO: ["Nagpur Kingdom", "Nagpur Kingdom", [["1700-01-01", {}], ...MC("1738-01-07", "1818-01-09"), dep("1818-01-09")]],
  DHA: ["Dhar State", "Dhar State", [["1700-01-01", {}], ...MC("1738-01-07", "1817-11-05"), dep("1819-01-10")]],
  DEW: ["Dewas State", "Dewas State", [["1700-01-01", {}], ...MC("1738-01-07", "1817-11-05"), dep("1818-12-12")]],
  SAT: ["Satara State", "Satara State", [dep("1818-06-03")]],
  KOL: ["Kolhapur State", "Kolhapur State", [["1700-01-01", {}], dep("1812-10-01")]],
  SAW: ["Sawantwadi State", "Sawantwadi State", [["1700-01-01", {}], dep("1819-02-17")]],
  SMC: ["Southern Maratha Country states", "Southern Maratha Country", [dep("1818-06-03")]],
  HYD: ["Hyderabad State", "Hyderabad State", [["1700-01-01", {}], dep("1798-09-01")]],
  HYI: ["Hyderabad State", "Hyderabad State", [["1700-01-01", {}]]],
  MYS: ["Kingdom of Mysore", "Kingdom of Mysore", [["1700-01-01", {}], dep("1799-06-22")]],
  AWD: ["Oudh State", "Oudh State", [["1700-01-01", {}], dep("1801-11-10")]],
  ROH: ["Rohilkhand", "Rohilkhand", [["1700-01-01", {}]]],
  RAM: ["Rampur State", "Rampur State", [["1700-01-01", {}], dep("1801-11-10")]],
  FAR: ["Farrukhabad", "Nawab of Farrukhabad", [["1700-01-01", {}]]],
  BEN: ["Nawabs of Bengal", "Nawab of Bengal", [["1700-01-01", {}]]],
  CAR: ["Carnatic Sultanate", "Carnatic Sultanate", [["1700-01-01", {}], dep("1792-07-12")]],
  TAN: ["Thanjavur Maratha Kingdom", "Thanjavur Maratha kingdom", [["1700-01-01", {}]]],
  MDU: ["Nayaks of Madurai", "Madurai Nayak dynasty", [["1700-01-01", {}]]],
  PUD: ["Pudukkottai State", "Pudukkottai State", [["1700-01-01", {}], dep("1803-01-01")]],
  TRV: ["Travancore", "Travancore", [["1700-01-01", {}], dep("1795-11-17")]],
  COC: ["Cochin", "Kingdom of Cochin", [["1700-01-01", {}], dep("1791-01-06")]],
  KOM: ["Kingdoms of Malabar", "History of Kerala", [["1700-01-01", {}]]],
  ARK: ["Arakkal Kingdom", "Arakkal kingdom", [["1700-01-01", {}], dep("1796-01-01")]],
  COO: ["Kingdom of Coorg", "Kodagu", [["1700-01-01", {}]]],
  KEL: ["Keladi Nayakas", "Keladi Nayaka", [["1700-01-01", {}]]],
  CHI: ["Chitradurga Nayakas", "Nayakas of Chitradurga", [["1700-01-01", {}]]],
  KUR: ["Kurnool State", "Kurnool State", [["1700-01-01", {}], dep("1800-10-12")]],
  RAJ: ["British India", "Company rule in India", [dep("1700-01-01"), ["1858-11-01", { name: "British Raj", wiki: "British Raj", ruler: "@UK", status: 5 }]]],
  FRI: ["French India", "French India", [dep("1700-01-01", "@FR")]],
  POR: ["Portuguese India", "Portuguese India", [dep("1700-01-01", "@PT")]],
  DAN: ["Danish India", "Danish India", [dep("1700-01-01", "@DK")]],
  DCY: ["Dutch Ceylon", "Dutch Ceylon", [dep("1700-01-01", "@NL")]],
  CEY: ["British Ceylon", "British Ceylon", [dep("1700-01-01")]],
  KAN: ["Kingdom of Kandy", "Kingdom of Kandy", [["1700-01-01", {}]]],
  MDV: ["Maldives", "Sultanate of the Maldives", [["1700-01-01", {}]]],
  SKC: ["Sikh Confederacy", "Sikh Confederacy", [["1700-01-01", {}]]],
  SKE: ["Sikh Empire", "Sikh Empire", [["1700-01-01", {}]]],
  PHU: ["Phulkian states", "Phulkian sardars", [["1700-01-01", {}], dep("1809-04-25")]],
  CIS: ["Cis-Sutlej states", "Cis-Sutlej states", [["1700-01-01", {}], dep("1809-04-25")]],
  KAP: ["Kapurthala State", "Kapurthala State", [["1700-01-01", {}], dep("1846-03-09")]],
  FAD: ["Faridkot State", "Faridkot State", [["1700-01-01", {}], dep("1809-04-25")]],
  BAH: ["Bahawalpur", "Bahawalpur (princely state)", [["1700-01-01", {}], dep("1838-10-05")]],
  DUR: ["Durrani Empire", "Durrani Empire", [["1700-01-01", {}], ["1823-01-01", { name: "Emirate of Afghanistan", wiki: "Emirate of Afghanistan" }]]],
  AFS: ["Afsharid Iran", "Afsharid Iran", [["1700-01-01", {}]]],
  SAF: ["Safavid Iran", "Safavid Iran", [["1700-01-01", {}]]],
  HOT: ["Hotaki dynasty", "Hotaki dynasty", [["1700-01-01", {}]]],
  SIN: ["Sindh", "Kalhora dynasty", [["1700-01-01", {}]]],
  TAL: ["Talpur dynasty", "Talpur dynasty", [["1700-01-01", {}]]],
  KHA: ["Khairpur State", "Khairpur (princely state)", [["1700-01-01", {}], dep("1838-12-24")]],
  KLT: ["Khanate of Kalat", "Khanate of Kalat", [["1700-01-01", {}], dep("1876-12-08")]],
  KLI: ["Khanate of Kalat", "Khanate of Kalat", [["1700-01-01", {}]]],
  LAS: ["Las Bela State", "Las Bela (princely state)", [["1700-01-01", {}], dep("1876-12-08")]],
  KHR: ["Kharan State", "Kharan (princely state)", [["1700-01-01", {}], dep("1884-01-01")]],
  OMA: ["Sultanate of Muscat and Oman", "Muscat and Oman", [["1700-01-01", {}]]],
  KSH: ["Kashmir and Jammu", "Jammu and Kashmir (princely state)", [dep("1846-03-16")]],
  JKI: ["Jammu and Kashmir", "Jammu and Kashmir (princely state)", [["1700-01-01", {}]]],
  JAM: ["Jammu", "Jammu (princely state)", [["1700-01-01", {}]]],
  LAD: ["Ladakh", "Namgyal dynasty of Ladakh", [["1700-01-01", {}]]],
  BAL: ["Baltistan", "Baltistan", [["1700-01-01", {}]]],
  DAR: ["Dardic states", "History of Gilgit-Baltistan", [["1700-01-01", { b: 1 }]]],
  CHT: ["Chitral State", "Chitral (princely state)", [["1700-01-01", {}], dep("1895-09-02")]],
  SWT: ["Swat and Dir", "Dir (princely state)", [["1700-01-01", {}], dep("1897-01-01")]],
  TRB: ["Pashtun tribes", "Pashtuns", [["1700-01-01", P]]],
  BAL2: ["Baloch tribes", "Baloch people", [["1700-01-01", P]]],
  TIB: ["Tibet", "Tibet under Qing rule", [["1700-01-01", {}]]],
  NPM: ["Nepal Mandala", "Malla (Nepal)", [["1700-01-01", {}]]],
  GOR: ["Gorkha Kingdom", "Gorkha Kingdom", [["1700-01-01", {}], ["1768-09-25", { name: "Kingdom of Nepal", wiki: "Kingdom of Nepal" }]]],
  NPL: ["Kingdom of Nepal", "Kingdom of Nepal", [["1700-01-01", {}]]],
  CHB: ["Chaubisi and Baise rajyas", "Chaubise rajya", [["1700-01-01", { b: 1 }]]],
  MAK: ["Makwanpur", "Makwanpur Gadhi", [["1700-01-01", {}]]],
  VIJ: ["Vijayapur", "Vijayapur", [["1700-01-01", {}]]],
  KUM: ["Kumaon Kingdom", "Kumaon Kingdom", [["1700-01-01", {}]]],
  GAR: ["Garhwal Kingdom", "Garhwal Kingdom", [["1700-01-01", {}], dep("1815-04-01", "@UK", { name: "Tehri Garhwal", wiki: "Tehri Garhwal (princely state)" })]],
  SIK: ["Kingdom of Sikkim", "Kingdom of Sikkim", [["1700-01-01", {}], dep("1861-03-28")]],
  SKI: ["Kingdom of Sikkim", "Kingdom of Sikkim", [["1700-01-01", {}]]],
  SKP: ["Kingdom of Sikkim", "Kingdom of Sikkim", [dep("1700-01-01", "India")]],
  BHU: ["Bhutan", "Bhutan", [["1700-01-01", {}]]],
  COB: ["Koch Bihar", "Koch Bihar (princely state)", [["1700-01-01", {}], dep("1773-04-05")]],
  TRP: ["Tripura", "Tripura (princely state)", [["1700-01-01", {}], dep("1871-01-01")]],
  AHO: ["Ahom kingdom", "Ahom kingdom", [["1700-01-01", {}]]],
  DIM: ["Dimasa Kingdom", "Dimasa Kingdom", [["1700-01-01", {}]]],
  JAI: ["Jaintia Kingdom", "Jaintia Kingdom", [["1700-01-01", {}]]],
  KHS: ["Khasi states", "Khasi Hills", [["1700-01-01", {}], dep("1833-01-01")]],
  GRO: ["Garos", "Garo people", [["1700-01-01", P]]],
  NAG: ["Nagas", "Naga people", [["1700-01-01", P]]],
  MIZ: ["Mizos", "Mizo people", [["1700-01-01", P]]],
  TAN2: ["Tani peoples", "Tani people", [["1700-01-01", P]]],
  MNP: ["Kingdom of Manipur", "Kingdom of Manipur", [["1700-01-01", {}], dep("1891-09-22")]],
  BURMA: ["Burma", "Konbaung dynasty", [["1700-01-01", {}]]],
  RTN: ["Kalachuris of Ratanpur", "Kalachuris of Ratanpur", [["1700-01-01", {}]]],
  BAS: ["Bastar State", "Bastar State", [["1700-01-01", {}], dep("1818-01-09")]],
  CGS: ["Chhattisgarh Feudatory States", "Eastern States Agency", [["1700-01-01", {}], dep("1818-01-09")]],
  GAR2: ["Garhjat states", "Garhjat", [["1700-01-01", {}], dep("1803-12-17")]],
  GON: ["Gond kingdoms", "Gondwana", [["1700-01-01", {}]]],
  CHN: ["Chota Nagpur Tributary States", "Chota Nagpur Tributary States", [["1700-01-01", {}], dep("1818-01-09")]],
  REW: ["Rewa State", "Rewa State", [["1700-01-01", {}], dep("1812-10-05")]],
  BUN: ["Bundelkhand states", "Bundelkhand Agency", [["1700-01-01", {}], dep("1817-01-01")]],
  JHA: ["Jhansi State", "Jhansi State", [["1700-01-01", {}], dep("1817-11-17")]],
  BHP: ["Bhopal State", "Bhopal State", [["1700-01-01", {}], dep("1818-02-26")]],
  MLW: ["Malwa states", "Malwa Agency", [["1700-01-01", {}], dep("1818-01-06")]],
  RTL: ["Ratlam State", "Ratlam State", [["1700-01-01", {}], dep("1819-01-01")]],
  JOD: ["Jodhpur State", "Jodhpur State", [dep("1700-01-01", "#MUG"), ["1740-01-01", { ruler: "", status: 0 }], dep("1818-01-06")]],
  BIK: ["Bikaner State", "Bikaner State", [dep("1700-01-01", "#MUG"), ["1740-01-01", { ruler: "", status: 0 }], dep("1818-03-09")]],
  JSL: ["Jaisalmer State", "Jaisalmer State", [dep("1700-01-01", "#MUG"), ["1740-01-01", { ruler: "", status: 0 }], dep("1818-12-12")]],
  JPR: ["Jaipur State", "Jaipur State", [dep("1700-01-01", "#MUG"), ["1740-01-01", { ruler: "", status: 0 }], dep("1818-04-02")]],
  MEW: ["Udaipur State", "Udaipur State", [dep("1700-01-01", "#MUG"), ["1740-01-01", { ruler: "", status: 0 }], dep("1818-01-13")]],
  KOT: ["Kota State", "Kota State", [dep("1700-01-01", "#MUG"), ["1740-01-01", { ruler: "", status: 0 }], dep("1817-12-26")]],
  BUD: ["Bundi State", "Bundi State", [dep("1700-01-01", "#MUG"), ["1740-01-01", { ruler: "", status: 0 }], dep("1818-02-10")]],
  ALW: ["Alwar State", "Alwar State", [["1700-01-01", {}], dep("1803-11-14")]],
  BHA: ["Bharatpur State", "Bharatpur State", [["1700-01-01", {}], dep("1805-04-17")]],
  RSS: ["Rajputana states", "Rajputana Agency", [dep("1700-01-01", "#MUG"), ["1740-01-01", { ruler: "", status: 0 }], dep("1818-04-02")]],
  KUT: ["Cutch State", "Cutch State", [["1700-01-01", {}], dep("1816-01-14")]],
  JUN: ["Junagadh State", "Junagadh State", [["1700-01-01", {}], dep("1807-01-01")]],
  NAW: ["Nawanagar State", "Nawanagar State", [dep("1700-01-01", "#MUG"), ["1740-01-01", { ruler: "", status: 0 }], dep("1807-01-01")]],
  BHV: ["Bhavnagar State", "Bhavnagar State", [dep("1700-01-01", "#MUG"), ["1740-01-01", { ruler: "", status: 0 }], dep("1807-01-01")]],
  KAT: ["Kathiawar states", "Kathiawar Agency", [dep("1700-01-01", "#MUG"), ["1740-01-01", { ruler: "", status: 0 }], dep("1807-01-01")]],
  GUJ: ["Gujarat states", "Gujarat States Agency", [dep("1700-01-01", "#MUG"), ["1740-01-01", { ruler: "", status: 0 }], dep("1820-01-01")]],
  PAL: ["Palanpur State", "Palanpur State", [dep("1700-01-01", "#MUG"), ["1740-01-01", { ruler: "", status: 0 }], dep("1817-01-01")]],
  HIL: ["Punjab Hill States", "Punjab Hill States Agency", [["1700-01-01", {}], dep("1815-09-01")]],
  CHM: ["Chamba State", "Chamba State", [["1700-01-01", {}], dep("1846-03-09")]],
  MND: ["Mandi State", "Mandi State", [["1700-01-01", {}], dep("1846-03-09")]],
  KNG: ["Kangra State", "Kangra State", [["1700-01-01", {}]]],
  KUL: ["Kullu State", "Kullu", [["1700-01-01", {}]]],
  BEN2: ["Benares State", "Benares State", [dep("1911-04-01")]],
  ANI: ["-", "", []],
  BUK: ["Khanate of Bukhara", "Khanate of Bukhara", [["1700-01-01", {}]]],
  UZB: ["Uzbek khanates", "Khanate of Kunduz", [["1700-01-01", { b: 1 }]]],
  BDK: ["Badakhshan", "Badakhshan", [["1700-01-01", {}]]],
  HRT: ["Herat", "Herat Khanate", [["1700-01-01", {}]]],
  HAZ: ["Hazaras", "Hazaras", [["1700-01-01", P]]],
  KAF: ["Kafirs", "Nuristanis", [["1700-01-01", P]]],
  INDIA: ["India", "India", [["1700-01-01", {}]]],
  PAKIS: ["Pakistan", "Pakistan", [["1700-01-01", {}]]]
};

const U = (c, prov, names) => names.split(",").map((n) => c + ":" + prov + "/" + n.trim());
const UP = (n) => U("IND", "Uttar Pradesh", n), MP = (n) => U("IND", "Madhya Pradesh", n), MH = (n) => U("IND", "Maharashtra", n), KA = (n) => U("IND", "Karnataka", n);
const TN = (n) => U("IND", "Tamil Nadu", n), AP = (n) => U("IND", "Andhra Pradesh", n), TG = (n) => U("IND", "Telangana", n), KL = (n) => U("IND", "Kerala", n);
const RJ = (n) => U("IND", "Rajasthan", n), GJ = (n) => U("IND", "Gujarat", n), PB = (n) => U("IND", "Punjab", n), HR = (n) => U("IND", "Haryana", n);
const HP = (n) => U("IND", "Himachal Pradesh", n), UK_ = (n) => U("IND", "Uttarakhand", n), BR = (n) => U("IND", "Bihar", n), JH = (n) => U("IND", "Jharkhand", n);
const WB = (n) => U("IND", "West Bengal", n), OD = (n) => U("IND", "Odisha", n), CG = (n) => U("IND", "Chhattisgarh", n), AS = (n) => U("IND", "Assam", n);
const JK = (n) => U("IND", "Jammu and Kashmir", n), PP = (n) => U("PAK", "Punjab", n), SD = (n) => U("PAK", "Sindh", n), KP = (n) => U("PAK", "Khyber Pakhtunkhwa", n);
const BL = (n) => U("PAK", "Balochistan", n), GB = (n) => U("PAK", "Gilgit-Baltistan", n), LK = (n) => n.split(",").map((x) => "LKA:" + x.trim() + "/" + x.trim());
const NP = (n) => n.split(",").map((x) => "NPL:" + x.trim() + "/" + x.trim()), BD = (n) => n.split(",").map((x) => "BGD:" + x.trim() + "/" + x.trim());
const ALL = (c, prov) => [c + ":" + prov + "/*"];

const RAJ47 = "1947-08-15 INDIA", PAK47 = "1947-08-15 PAKIS";
export const REGIONS = [
  ["Mumbai", MH("Mumbai"), "RAJ; " + RAJ47],
  ["Salsette", MH("Mumbai Suburban"), "POR; 1739-05-16 MAR; 1774-12-28 RAJ; " + RAJ47],
  ["North Konkan", MH("Thane,Palghar"), "POR; 1739-05-16 MAR; 1818-06-03 RAJ; " + RAJ47],
  ["Maratha heartland", MH("Pune,Raigarh,Ratnagiri"), "MAR; 1818-06-03 RAJ; " + RAJ47],
  ["Satara", MH("Satara"), "MAR; 1818-06-03 SAT; 1848-04-05 RAJ; " + RAJ47],
  ["Sangli", MH("Sangli"), "MAR; 1818-06-03 SMC; " + RAJ47],
  ["Kolhapur", MH("Kolhapur"), "MAR; 1710-01-01 KOL; " + RAJ47],
  ["Sawantwadi", MH("Sindhudurg"), "SAW; " + RAJ47],
  ["Nashik and Ahmadnagar", MH("Nashik,Ahmadnagar"), "MUG; 1724-10-11 HYD; 1760-02-03 MAR; 1818-06-03 RAJ; " + RAJ47],
  ["Solapur", MH("Solapur"), "MUG; 1724-10-11 HYD; 1795-03-11 MAR; 1818-06-03 RAJ; " + RAJ47],
  ["Khandesh", MH("Jalgaon,Dhule,Nandurbar"), "MUG; 1724-10-11 HYD; 1760-02-03 MAR; 1818-06-03 RAJ; " + RAJ47],
  ["Marathwada", MH("Aurangabad,Jalna,Bid,Parbhani,Hingoli,Nanded,Latur,Osmanabad"), "MUG; 1724-10-11 HYD; 1947-08-15 HYI; 1948-09-18 INDIA"],
  ["Berar", MH("Akola,Amravati,Buldana,Washim,Yavatmal"), "MUG; 1724-10-11 HYD; 1903-11-05 RAJ; " + RAJ47],
  ["Nagpur", MH("Nagpur,Wardha,Bhandara,Gondiya,Chandrapur,Gadchiroli"), "GON; 1743-01-01 BHO; 1853-12-11 RAJ; " + RAJ47],
  ["Telangana", ALL("IND", "Telangana"), "MUG; 1724-10-11 HYD; 1947-08-15 HYI; 1948-09-18 INDIA"],
  ["Hyderabad Karnataka", KA("Gulbarga,Bidar,Raichur,Koppal,Yadgir"), "MUG; 1724-10-11 HYD; 1947-08-15 HYI; 1948-09-18 INDIA"],
  ["Bijapur", KA("Bijapur,Bagalkot,Belgaum"), "MUG; 1724-10-11 HYD; 1760-02-03 MAR; 1818-06-03 RAJ; " + RAJ47],
  ["Dharwad", KA("Dharwad,Gadag,Haveri"), "MUG; 1724-10-11 HYD; 1760-02-03 MAR; 1778-01-01 MYS; 1792-03-18 MAR; 1818-06-03 RAJ; " + RAJ47],
  ["Mysore core", KA("Mysore,Mandya,Chamarajanagar,Bangalore,Bangalore Rural,Ramanagara,Hassan"), "MYS; " + RAJ47],
  ["Sira", KA("Tumkur,Kolar,Chikkaballapura"), "MUG; 1724-10-11 HYD; 1761-01-01 MYS; " + RAJ47],
  ["Chitradurga", KA("Chitradurga,Davanagere"), "CHI; 1779-01-01 MYS; " + RAJ47],
  ["Bednur", KA("Shimoga,Chikmagalur"), "KEL; 1763-03-01 MYS; " + RAJ47],
  ["Kanara", KA("Uttara Kannada,Udupi,Dakshina Kannada").concat(KL("Kasaragod")), "KEL; 1763-03-01 MYS; 1799-06-22 RAJ; " + RAJ47],
  ["Coorg", KA("Kodagu"), "COO; 1773-01-01 MYS; 1792-03-18 COO; 1834-05-06 RAJ; " + RAJ47],
  ["Ceded Districts", KA("Bellary").concat(AP("Anantapur,YSR Kadapa")), "MUG; 1724-10-11 HYD; 1776-01-01 MYS; 1792-03-18 HYD; 1800-10-12 RAJ; " + RAJ47],
  ["Kurnool", AP("Kurnool"), "MUG; 1724-10-11 KUR; 1839-10-18 RAJ; " + RAJ47],
  ["Northern Circars", AP("Srikakulam,Vizianagaram,Visakhapatnam,East Godavari,West Godavari,Krishna"), "MUG; 1724-10-11 HYD; 1753-12-01 FRI; 1759-04-08 HYD; 1766-11-12 RAJ; " + RAJ47],
  ["Guntur", AP("Guntur,Prakasam"), "MUG; 1724-10-11 HYD; 1788-09-18 RAJ; " + RAJ47],
  ["Nellore", AP("Sri Potti Sriramulu Nellore,Chittoor"), "MUG; 1710-01-01 CAR; 1801-07-31 RAJ; " + RAJ47],
  ["Yanam", AP("Yanam"), "MUG; 1724-10-11 HYD; 1731-01-01 FRI; 1954-11-01 INDIA"],
  ["Madras", TN("Chennai"), "RAJ; " + RAJ47],
  ["Chingleput", TN("Thiruvallur,Kancheepuram,Chengalputtu"), "MUG; 1710-01-01 CAR; 1763-01-01 RAJ; " + RAJ47],
  ["Arcot", TN("Vellore,Ranipet,Tirupathur,Tiruvannamalai,Viluppuram,Kallakurichi,Cuddalore"), "MUG; 1710-01-01 CAR; 1801-07-31 RAJ; " + RAJ47],
  ["Pondicherry", ["IND:Puducherry/Puducherry"], "FRI; 1954-11-01 INDIA"],
  ["Karaikal", TN("Puducherry"), "TAN; 1739-02-14 FRI; 1954-11-01 INDIA"],
  ["Thanjavur", TN("Thanjavur,Thiruvarur,Nagapattinam,Mayiladuthurai,Ariyalur"), "TAN; 1799-10-25 RAJ; " + RAJ47],
  ["Pudukkottai", TN("Pudukkottai"), "PUD; " + RAJ47],
  ["Madurai", TN("Madurai,Theni,Sivaganga,Ramanathapuram,Virudhunagar,Tiruchirappalli,Perambalur,Karur"), "MDU; 1736-01-01 CAR; 1801-07-31 RAJ; " + RAJ47],
  ["Tirunelveli", TN("Tirunelveli,Tenkasi,Thoothukkudi"), "MDU; 1736-01-01 CAR; 1801-07-31 RAJ; " + RAJ47],
  ["Dindigul", TN("Dindigul"), "MDU; 1755-01-01 MYS; 1792-03-18 RAJ; " + RAJ47],
  ["Baramahal", TN("Salem,Dharmapuri,Krishnagiri,Namakkal"), "MYS; 1792-03-18 RAJ; " + RAJ47],
  ["Coimbatore", TN("Coimbatore,Tiruppur,Erode,The Nilgiris"), "MYS; 1799-06-22 RAJ; " + RAJ47],
  ["Nanjinad", TN("Kanniyakumari"), "KOM; 1729-01-01 TRV; " + RAJ47],
  ["Travancore", KL("Thiruvananthapuram,Kollam"), "KOM; 1729-01-01 TRV; " + RAJ47],
  ["Central Travancore", KL("Alappuzha,Pathanamthitta,Kottayam,Idukki"), "KOM; 1754-01-01 TRV; " + RAJ47],
  ["Cochin", KL("Ernakulam,Thrissur"), "COC; " + RAJ47],
  ["Malabar", KL("Kozhikode,Malappuram,Palakkad,Kannur"), "KOM; 1766-04-01 MYS; 1792-03-18 RAJ; " + RAJ47],
  ["Wayanad", KL("Wayanad"), "KOM; 1766-04-01 MYS; 1799-06-22 RAJ; " + RAJ47],
  ["Mahe", KL("Mahe"), "KOM; 1725-01-01 FRI; 1954-11-01 INDIA"],
  ["Lakshadweep", ["IND:Lakshadweep/Lakshadweep"], "ARK; 1905-01-01 RAJ; " + RAJ47],
  ["Andamans", ["IND:Andaman and Nicobar Islands/North and Middle Andaman", "IND:Andaman and Nicobar Islands/South Andaman"], "ANI; 1858-03-10 RAJ; " + RAJ47],
  ["Nicobars", ["IND:Andaman and Nicobar Islands/Nicobars"], "ANI; 1756-01-01 DAN; 1869-04-16 RAJ; " + RAJ47],
  ["Goa's neighbours", GJ("Diu"), "POR; 1961-12-19 INDIA"],
  ["Daman", ["IND:Dadra and Nagar Haveli and Daman and Diu/Daman"], "POR; 1961-12-19 INDIA"],
  ["Dadra and Nagar Haveli", ["IND:Dadra and Nagar Haveli and Daman and Diu/Dadra and Nagar Haveli"], "MAR; 1785-01-01 POR; 1954-08-02 INDIA"],
  ["Surat", GJ("Surat,Tapi,Bharuch"), "MUG; 1759-03-04 RAJ; " + RAJ47],
  ["Dharampur and Bansda", GJ("Valsad,Navsari,The Dangs"), "GUJ; " + RAJ47],
  ["Ahmedabad", GJ("Ahmadabad,Kheda,Anand,Gandhinagar"), "MUG; 1753-04-02 MAR; 1817-11-06 RAJ; " + RAJ47],
  ["Baroda", GJ("Vadodara,Mahesana,Patan"), "MUG; 1734-01-01 GAE; " + RAJ47],
  ["Amreli", GJ("Amreli,Devbhumi Dwarka"), "KAT; 1760-01-01 GAE; " + RAJ47],
  ["Panch Mahals", GJ("Panch Mahals,Dohad"), "MUG; 1761-01-01 SCI; 1861-01-01 RAJ; " + RAJ47],
  ["Rewa Kantha", GJ("Mahisagar,Chhota Udaipur,Narmada"), "GUJ; " + RAJ47],
  ["Mahi Kantha", GJ("Sabar Kantha,Aravali"), "GUJ; " + RAJ47],
  ["Palanpur", GJ("Banas Kantha"), "PAL; " + RAJ47],
  ["Cutch", GJ("Kachchh"), "KUT; " + RAJ47],
  ["Junagadh", GJ("Junagadh,Gir Somnath"), "MUG; 1748-01-01 JUN; " + RAJ47],
  ["Nawanagar", GJ("Jamnagar,Porbandar"), "NAW; " + RAJ47],
  ["Bhavnagar", GJ("Bhavnagar,Batod"), "BHV; " + RAJ47],
  ["Kathiawar", GJ("Rajkot,Morbi,Surendranagar"), "KAT; " + RAJ47],
  ["Ajmer", RJ("Ajmer"), "MUG; 1755-01-01 SCI; 1818-06-25 RAJ; " + RAJ47],
  ["Jodhpur", RJ("Jodhpur,Barmer,Jalor,Pali,Nagaur"), "JOD; " + RAJ47],
  ["Bikaner", RJ("Bikaner,Churu,Ganganagar,Hanumangarh"), "BIK; " + RAJ47],
  ["Jaisalmer", RJ("Jaisalmer"), "JSL; " + RAJ47],
  ["Jaipur", RJ("Jaipur,Dausa,Sikar,Jhunjhunun,Sawai Madhopur"), "JPR; " + RAJ47],
  ["Mewar", RJ("Udaipur,Rajsamand,Chittaurgarh,Bhilwara"), "MEW; " + RAJ47],
  ["Kota", RJ("Kota,Baran"), "KOT; " + RAJ47],
  ["Bundi", RJ("Bundi"), "BUD; " + RAJ47],
  ["Alwar", RJ("Alwar"), "MUG; 1770-11-25 ALW; " + RAJ47],
  ["Bharatpur", RJ("Bharatpur,Dhaulpur,Karauli"), "MUG; 1722-01-01 BHA; " + RAJ47],
  ["Southern Rajputana", RJ("Dungarpur,Banswara,Pratapgarh,Sirohi,Tonk,Jhalawar"), "RSS; " + RAJ47],
  ["Delhi", ALL("IND", "Delhi"), "MUG; 1857-09-21 RAJ; " + RAJ47],
  ["Haryana", HR("Gurgaon,Faridabad,Palwal,Mewat,Rewari,Jhajjar,Rohtak,Sonipat,Panipat,Karnal,Hisar,Fatehabad,Sirsa,Bhiwani,Mahendragarh"), "MUG; 1784-01-01 SCI; 1803-12-30 RAJ; " + RAJ47],
  ["Cis-Sutlej", HR("Ambala,Panchkula,Yamunanagar,Kurukshetra,Kaithal").concat(PB("Rupnagar,Sahibzada Ajit Singh Nagar,Ludhiana,Firozpur,Fazilka,Moga,Muktsar"), ["IND:Chandigarh/Chandigarh"]), "MUG; 1752-01-01 DUR; 1764-01-14 CIS; 1846-03-09 RAJ; " + RAJ47],
  ["Phulkian states", PB("Patiala,Fatehgarh Sahib,Sangrur,Barnala,Bathinda,Mansa").concat(HR("Jind")), "MUG; 1752-01-01 DUR; 1764-01-14 PHU; " + RAJ47],
  ["Faridkot", PB("Faridkot"), "MUG; 1752-01-01 DUR; 1764-01-14 FAD; " + RAJ47],
  ["Kapurthala", PB("Kapurthala"), "MUG; 1752-01-01 DUR; 1765-01-01 KAP; " + RAJ47],
  ["Jalandhar Doab", PB("Jalandhar,Hoshiarpur,Shahid Bhagat Singh Nagar"), "MUG; 1752-01-01 DUR; 1765-01-01 SKC; 1811-01-01 SKE; 1846-03-09 RAJ; " + RAJ47],
  ["Amritsar", PB("Amritsar,Tarn Taran,Gurdaspur,Pathankot"), "MUG; 1752-01-01 DUR; 1765-01-01 SKC; 1802-01-01 SKE; 1849-03-29 RAJ; " + RAJ47],
  ["Lahore", PP("Lahore,Kasur,Sheikhupura,Gujranwala,Hafizabad,Okara"), "MUG; 1752-01-01 DUR; 1765-04-16 SKC; 1799-07-07 SKE; 1849-03-29 RAJ; " + PAK47],
  ["Sialkot and Gujrat", PP("Sialkot,Narowal,Gujrat,Mandi Bahauddin"), "MUG; 1752-01-01 DUR; 1765-04-16 SKC; 1810-01-01 SKE; 1849-03-29 RAJ; " + PAK47],
  ["Pothohar", PP("Rawalpindi,Jhelum,Chakwal,Attock").concat(["PAK:Islamabad Capital Territory/Islamabad Capital Territory"]), "MUG; 1739-05-16 AFS; 1747-10-01 DUR; 1765-04-16 SKC; 1813-07-13 SKE; 1849-03-29 RAJ; " + PAK47],
  ["Jhang and Sargodha", PP("Jhang,Faisalabad,Toba Tek Singh,Sargodha,Khushab,Sahiwal,Pakpattan"), "MUG; 1752-01-01 DUR; 1765-04-16 SKC; 1810-01-01 SKE; 1849-03-29 RAJ; " + PAK47],
  ["Multan", PP("Multan,Khanewal,Lodhran,Vihari,Muzaffargarh"), "MUG; 1752-01-01 DUR; 1818-06-02 SKE; 1849-03-29 RAJ; " + PAK47],
  ["Thal", PP("Mianwali,Bhakkar,Layyah"), "MUG; 1739-05-16 AFS; 1747-10-01 DUR; 1821-01-01 SKE; 1849-03-29 RAJ; " + PAK47],
  ["Derajat", PP("Dera Ghazi Khan,Rajanpur").concat(KP("Dera Ismail Khan,Tank")), "MUG; 1739-05-16 AFS; 1747-10-01 DUR; 1821-01-01 SKE; 1849-03-29 RAJ; " + PAK47],
  ["Bahawalpur", PP("Bahawalpur,Bahawalnagar,Rahim Yar Khan"), "MUG; 1748-01-01 BAH; " + PAK47],
  ["Peshawar", KP("Peshawar,Charsadda,Nowshera,Mardan,Swabi,Kohat,Hangu,Karak,Bannu,Lakki Marwat"), "MUG; 1739-05-16 AFS; 1747-10-01 DUR; 1834-05-06 SKE; 1849-03-29 RAJ; " + PAK47],
  ["Hazara", KP("Abbottabad,Haripur,Mansehra,Battagram"), "MUG; 1752-01-01 DUR; 1818-01-01 SKE; 1849-03-29 RAJ; " + PAK47],
  ["Swat and Dir", KP("Swat,Upper Dir,Lower Dir,Malakand,Buner,Shangla,Kohistan"), "TRB; 1897-01-01 SWT; " + PAK47],
  ["Chitral", KP("Chitral"), "CHT; " + PAK47],
  ["Tribal areas", ALL("PAK", "Federally Administered Tribal Areas"), "TRB; 1893-11-12 RAJ; " + PAK47],
  ["Sindh", SD("Hyderabad,Karachi,Thatta,Badin,Tando Allahyar,Tando Muhammad Khan,Matiari,Jamshoro,Dadu,Nawabshah,Sanghar,Mirpurkhas,Tharparkar,Umerkot,Sukkur,Shikarpur,Jacobabad,Kashmore,Ghotki,Qambar Shahdadkot,Jafarabad"), "MUG; 1739-05-16 SIN; 1783-01-01 TAL; 1843-02-17 RAJ; " + PAK47],
  ["Khairpur", SD("Khairpur,Naushehro Feroze"), "MUG; 1739-05-16 SIN; 1783-01-01 KHA; " + PAK47],
  ["Kalat", BL("Kalat,Khuzdar,Mastung,Awaran,Jhal Magsi,Kachhi,Nasirabad,Kech,Panjgur,Nushki,Chagai"), "KLT; 1947-08-15 KLI; 1948-03-28 PAKIS"],
  ["Gwadar", BL("Gwadar"), "KLT; 1783-01-01 OMA; 1958-09-08 PAKIS"],
  ["Las Bela", BL("Lasbela"), "LAS; " + PAK47],
  ["Kharan", BL("Kharan"), "KLT; 1884-01-01 KHR; " + PAK47],
  ["Quetta", BL("Quetta"), "SAF; 1709-04-21 HOT; 1738-03-24 AFS; 1747-10-01 DUR; 1758-01-01 KLT; 1883-01-01 RAJ; " + PAK47],
  ["Pishin", BL("Pishin,Qilla Abdullah,Ziarat,Sibi"), "SAF; 1709-04-21 HOT; 1738-03-24 AFS; 1747-10-01 DUR; 1879-05-26 RAJ; " + PAK47],
  ["Baloch hills", BL("Dera Bugti,Kohlu,Barkhan,Loralai,Musakhel,Zhob,Qilla Saifullah"), "BAL2; 1887-11-01 RAJ; " + PAK47],
  ["Kashmir", JK("Srinagar,Anantnag,Badgam,Bandipore,Baramula,Ganderbal,Kulgam,Kupwara,Pulwama,Shupiyan").concat(["PAK:Azad Kashmir/Azad Kashmir"]), "MUG; 1752-01-01 DUR; 1819-07-05 SKE; 1846-03-16 KSH; 1947-08-15 JKI; 1947-10-27 INDIA"],
  ["Jammu", JK("Jammu,Kathua,Samba,Udhampur,Reasi,Rajouri,Punch,Doda,Kishtwar,Ramban"), "JAM; 1808-01-01 SKE; 1846-03-16 KSH; 1947-08-15 JKI; 1947-10-27 INDIA"],
  ["Ladakh", ALL("IND", "Ladakh"), "LAD; 1842-09-17 SKE; 1846-03-16 KSH; 1947-08-15 JKI; 1947-10-27 INDIA"],
  ["Baltistan", GB("Skardu,Ghanche,Shigar,Kharmang"), "BAL; 1840-01-01 SKE; 1846-03-16 KSH; 1947-08-15 JKI; 1947-11-16 PAKIS"],
  ["Gilgit", GB("Gilgit,Hunza,Nagar,Ghizer,Diamer,Astore"), "DAR; 1846-03-16 KSH; 1947-08-15 JKI; 1947-11-16 PAKIS"],
  ["Chamba", HP("Chamba"), "CHM; " + RAJ47],
  ["Kangra", HP("Kangra,Hamirpur,Una"), "KNG; 1809-08-24 SKE; 1846-03-09 RAJ; " + RAJ47],
  ["Kullu", HP("Kullu,Lahul and Spiti"), "KUL; 1840-01-01 SKE; 1846-03-09 RAJ; " + RAJ47],
  ["Mandi", HP("Mandi"), "MND; " + RAJ47],
  ["Hill states", HP("Shimla,Solan,Sirmaur,Bilaspur,Kinnaur"), "HIL; " + RAJ47],
  ["Garhwal", UK_("Tehri Garhwal,Uttarkashi"), "GAR; 1804-01-01 GOR; 1815-04-01 GAR; " + RAJ47],
  ["British Garhwal", UK_("Garhwal,Chamoli,Rudraprayag,Dehradun"), "GAR; 1804-01-01 GOR; 1816-03-04 RAJ; " + RAJ47],
  ["Kumaon", UK_("Almora,Bageshwar,Pithoragarh,Champawat,Nainital"), "KUM; 1790-01-01 GOR; 1816-03-04 RAJ; " + RAJ47],
  ["Terai of Kumaon", UK_("Udham Singh Nagar"), "KUM; 1744-01-01 ROH; 1774-04-23 AWD; 1801-11-10 RAJ; " + RAJ47],
  ["Hardwar", UK_("Hardwar").concat(UP("Saharanpur,Muzaffarnagar,Samli")), "MUG; 1757-01-01 ROH; 1788-01-01 SCI; 1803-12-30 RAJ; " + RAJ47],
  ["Doab", UP("Meerut,Baghpat,Ghaziabad,Hapur,Gautam Buddha Nagar,Bulandshahr,Aligarh,Mahamaya Nagar,Mathura,Agra,Firozabad,Etah,Kanshiram Nagar,Mainpuri"), "MUG; 1784-01-01 SCI; 1803-12-30 RAJ; " + RAJ47],
  ["Rohilkhand", UP("Bareilly,Moradabad,Budaun,Shahjahanpur,Pilibhit,Bijnor,Sambhal,Jyotiba Phule Nagar"), "MUG; 1721-01-01 ROH; 1774-04-23 AWD; 1801-11-10 RAJ; " + RAJ47],
  ["Rampur", UP("Rampur"), "MUG; 1721-01-01 ROH; 1774-10-07 RAM; " + RAJ47],
  ["Farrukhabad", UP("Farrukhabad,Kannauj"), "MUG; 1714-01-01 FAR; 1802-06-04 RAJ; " + RAJ47],
  ["Lower Doab", UP("Etawah,Auraiya,Kanpur Nagar,Kanpur Dehat,Fatehpur,Allahabad,Kaushambi"), "MUG; 1722-09-09 AWD; 1801-11-10 RAJ; " + RAJ47],
  ["Gorakhpur", UP("Gorakhpur,Mahrajganj,Kushinagar,Deoria,Basti,Sant Kabir Nagar,Siddharthnagar,Azamgarh,Mau"), "MUG; 1722-09-09 AWD; 1801-11-10 RAJ; " + RAJ47],
  ["Oudh", UP("Lucknow,Faizabad,Ambedkar Nagar,Sultanpur,Amethi,Bara Banki,Rae Bareli,Unnao,Hardoi,Sitapur,Kheri,Bahraich,Shrawasti,Gonda,Balrampur,Pratapgarh"), "MUG; 1722-09-09 AWD; 1856-02-13 RAJ; " + RAJ47],
  ["Benares", UP("Varanasi,Chandauli,Ghazipur,Ballia,Jaunpur,Mirzapur,Sant Ravidas Nagar (Bhadohi),Sonbhadra"), "MUG; 1722-09-09 AWD; 1775-05-21 RAJ; " + RAJ47],
  ["Bundelkhand", UP("Banda,Chitrakoot,Hamirpur,Mahoba"), "BUN; 1803-12-31 RAJ; " + RAJ47],
  ["Jhansi", UP("Jhansi,Jalaun,Lalitpur"), "BUN; 1742-01-01 JHA; 1853-11-21 RAJ; " + RAJ47],
  ["Bundelkhand states", MP("Tikamgarh,Niwari,Datia,Panna,Chhatarpur,Satna"), "BUN; " + RAJ47],
  ["Saugor", MP("Sagar,Damoh"), "BUN; 1735-01-01 MAR; 1818-06-03 RAJ; " + RAJ47],
  ["Rewa", MP("Rewa,Sidhi,Singrauli,Shahdol,Umaria,Anuppur"), "REW; " + RAJ47],
  ["Gwalior", MP("Gwalior,Morena,Bhind,Sheopur,Shivpuri,Guna,Ashoknagar,Ujjain,Shajapur,Agar,Neemuch,Vidisha"), "MUG; 1738-01-07 SCI; " + RAJ47],
  ["Indore", MP("Indore,Khargone (West Nimar),Mandsaur,Barwani"), "MUG; 1738-01-07 HOL; " + RAJ47],
  ["Dhar and Dewas", MP("Dhar"), "MUG; 1738-01-07 DHA; " + RAJ47],
  ["Dewas", MP("Dewas"), "MUG; 1738-01-07 DEW; " + RAJ47],
  ["Ratlam and Jhabua", MP("Ratlam,Jhabua,Alirajpur,Rajgarh"), "MUG; 1738-01-07 MLW; " + RAJ47],
  ["Bhopal", MP("Bhopal,Sehore,Raisen"), "MUG; 1723-01-01 BHP; " + RAJ47],
  ["Nimar", MP("Khandwa (East Nimar),Burhanpur,Harda"), "MUG; 1738-01-07 SCI; 1860-01-01 RAJ; " + RAJ47],
  ["Narmada valley", MP("Hoshangabad,Betul,Narsimhapur,Chhindwara"), "GON; 1743-01-01 BHO; 1818-06-03 RAJ; " + RAJ47],
  ["Garha-Mandla", MP("Jabalpur,Katni,Mandla,Dindori,Seoni,Balaghat"), "GON; 1781-01-01 MAR; 1799-01-01 BHO; 1818-06-03 RAJ; " + RAJ47],
  ["Chhattisgarh", CG("Raipur,Bilaspur,Durg,Janjgir-Champa,Mungeli,Dhamtari,Mahasamund,Baloda Bazar,Bemetra,Balod,Gariaband,Korba,Gaurella Pendra Marwahi"), "RTN; 1741-01-01 BHO; 1853-12-11 RAJ; " + RAJ47],
  ["Chhattisgarh states", CG("Rajnandgaon,Kabeerdham,Raigarh,Jashpur,Surguja,Balrampur,Surajpur,Koriya"), "CGS; " + RAJ47],
  ["Bastar", CG("Bastar,Dakshin Bastar Dantewada,Kondagaon,Narayanpur,Bijapur,Sukma,Uttar Bastar Kanker"), "BAS; " + RAJ47],
  ["Orissa", OD("Cuttack,Khordha,Puri,Jagatsinghapur,Kendrapara,Jajapur,Bhadrak,Baleshwar"), "MUG; 1717-01-01 BEN; 1751-05-01 BHO; 1803-12-17 RAJ; " + RAJ47],
  ["Ganjam", OD("Ganjam,Gajapati,Koraput,Rayagada,Nabarangapur,Malkangiri"), "MUG; 1724-10-11 HYD; 1766-11-12 RAJ; " + RAJ47],
  ["Garhjat", OD("Mayurbhanj,Kendujhar,Dhenkanal,Anugul,Nayagarh,Baudh,Kandhamal,Subarnapur,Balangir,Kalahandi,Nuapada,Debagarh,Sundargarh"), "GAR2; " + RAJ47],
  ["Sambalpur", OD("Sambalpur,Bargarh,Jharsuguda"), "GAR2; 1849-01-01 RAJ; " + RAJ47],
  ["Lower Bengal", WB("Kolkata,North Twenty Four Parganas,South Twenty Four Parganas"), "MUG; 1717-01-01 BEN; 1757-12-20 RAJ; " + RAJ47],
  ["Burdwan and Midnapore", WB("Barddhaman,Paschim Barddhaman,Paschim Medinipur,Purba Medinipur,Jhargram"), "MUG; 1717-01-01 BEN; 1760-09-27 RAJ; " + RAJ47],
  ["Bengal", WB("Haora,Hugli,Nadia,Murshidabad,Birbhum,Bankura,Puruliya,Maldah,Dakshin Dinajpur,Uttar Dinajpur,Jalpaiguri"), "MUG; 1717-01-01 BEN; 1765-08-12 RAJ; " + RAJ47],
  ["East Bengal", BD("Dhaka,Rajshahi,Rangpur,Khulna,Barisal"), "MUG; 1717-01-01 BEN; 1765-08-12 RAJ; " + PAK47],
  ["Chittagong", BD("Chattogram"), "MUG; 1717-01-01 BEN; 1760-09-27 RAJ; " + PAK47],
  ["Sylhet", BD("Sylhet").concat(AS("Karimganj")), "MUG; 1717-01-01 BEN; 1765-08-12 RAJ; " + PAK47],
  ["Bihar", ALL("IND", "Bihar"), "MUG; 1717-01-01 BEN; 1765-08-12 RAJ; " + RAJ47],
  ["Chota Nagpur", JH("Ranchi,Khunti,Gumla,Simdega,Lohardaga,Latehar,Palamu,Garhwa,Hazaribagh,Ramgarh,Chatra,Kodarma,Giridih,Bokaro,Dhanbad,Deoghar,Dumka,Jamtara,Godda,Pakur,Sahibganj,Pashchimi Singhbhum,Purbi Singhbhum"), "MUG; 1717-01-01 BEN; 1765-08-12 RAJ; " + RAJ47],
  ["Seraikela", JH("Saraikela-Kharsawan"), "CHN; " + RAJ47],
  ["Darjeeling", WB("Darjiling"), "SIK; 1835-02-01 RAJ; " + RAJ47],
  ["Kalimpong", WB("Kalimpong,Alipurduar"), "SIK; 1706-01-01 BHU; 1865-11-11 RAJ; " + RAJ47],
  ["Koch Bihar", WB("Koch Bihar"), "COB; " + RAJ47],
  ["Sikkim", ["IND:Sikkim/East District", "IND:Sikkim/North District", "IND:Sikkim/South District"], "SIK; 1947-08-15 SKI; 1950-12-05 SKP; 1975-05-16 INDIA"],
  ["West Sikkim", ["IND:Sikkim/West District"], "SIK; 1788-01-01 GOR; 1817-02-10 SIK; 1947-08-15 SKI; 1950-12-05 SKP; 1975-05-16 INDIA"],
  ["Bhutan", ["BTN:*/*"], "BHU"],
  ["Lower Assam", AS("Kamrup,Kamrup Metropolitan,Nalbari,Barpeta,Bongaigaon,Goalpara,Dhubri,South Salmara-Mankachar,Kokrajhar,Chirang,Baksa,Darrang,Udalguri,Morigaon"), "AHO; 1821-03-01 BURMA; 1826-02-24 RAJ; " + RAJ47],
  ["Upper Assam", AS("Sivasagar,Charaideo,Jorhat,Majuli,Golaghat,Dibrugarh,Tinsukia,Lakhimpur,Dhemaji,Sonitpur,Biswanath,Nagaon,Hojai"), "AHO; 1821-03-01 BURMA; 1826-02-24 RAJ; " + RAJ47],
  ["Karbi hills", AS("Karbi Anglong East,Karbi Anglong West"), "AHO; 1821-03-01 BURMA; 1826-02-24 RAJ; " + RAJ47],
  ["Cachar", AS("Cachar,Hailakandi,Dima Hasao"), "DIM; 1832-08-14 RAJ; " + RAJ47],
  ["Jaintia", ["IND:Meghalaya/East Jaintia Hills", "IND:Meghalaya/West Jaintia Hills"], "JAI; 1835-03-15 RAJ; " + RAJ47],
  ["Khasi Hills", ["IND:Meghalaya/East Khasi Hills", "IND:Meghalaya/West Khasi Hills", "IND:Meghalaya/South West Khasi Hills", "IND:Meghalaya/Ribhoi"], "KHS; " + RAJ47],
  ["Garo Hills", ["IND:Meghalaya/East Garo Hills", "IND:Meghalaya/West Garo Hills", "IND:Meghalaya/North Garo Hills", "IND:Meghalaya/South Garo Hills", "IND:Meghalaya/South West Garo Hills"], "GRO; 1869-01-01 RAJ; " + RAJ47],
  ["Tripura", ALL("IND", "Tripura"), "TRP; " + RAJ47],
  ["Manipur", ALL("IND", "Manipur"), "MNP; 1819-01-01 BURMA; 1825-06-01 MNP; " + RAJ47],
  ["Naga Hills", ALL("IND", "Nagaland"), "NAG; 1886-01-01 RAJ; " + RAJ47],
  ["Lushai Hills", ALL("IND", "Mizoram"), "MIZ; 1886-01-01 RAJ; " + RAJ47],
  ["Tawang", ["IND:Arunachal Pradesh/Tawang", "IND:Arunachal Pradesh/West Kameng"], "TIB; 1886-01-01 RAJ; " + RAJ47],
  ["Arunachal", ["IND:Arunachal Pradesh/*"], "TAN2; 1886-01-01 RAJ; " + RAJ47],
  ["Kathmandu valley", NP("Bagmati Zone"), "NPM; 1768-09-25 GOR"],
  ["Makwanpur", NP("Narayani Zone,Janakpur Zone"), "MAK; 1762-08-21 GOR"],
  ["Eastern Nepal", NP("Sagarmatha Zone,Bhojpur,Mechi Zone"), "VIJ; 1774-01-01 GOR"],
  ["Gandaki", NP("Gandaki Zone,Dhaulagiri Zone"), "CHB; 1786-01-01 GOR"],
  ["Palpa", NP("Lumbini Zone"), "CHB; 1804-01-01 GOR"],
  ["Karnali", NP("Rapti Zone,Bheri Zone,Karnali Zone"), "CHB; 1789-01-01 GOR"],
  ["Far west Nepal", NP("Seti Zone,Mahakali Zone"), "CHB; 1790-01-01 GOR"],
  ["Ceylon west", LK("Colombo,Gampaha,Kalutara,Galle,Matara,Jaffna,Kilinochchi,Mannar"), "DCY; 1796-02-15 CEY"],
  ["Ceylon east coast", LK("Trincomalee,Batticaloa,Puttalam,Hambantota,Mullaitivu"), "KAN; 1766-02-14 DCY; 1796-02-15 CEY"],
  ["Kandy", LK("Kandy,Matale,Nuwara Eliya,Badulla,Monaragala,Ratnapura,Kegalle,Kurunegala,Anuradhapura,Polonnaruwa,Ampara,Vavuniya"), "KAN; 1815-03-02 CEY"],
  ["Maldives", ["MDV:*/*"], "MDV"],
  ["Kabul", ["Kabul", "Kapisa", "Parwan", "Laghman", "Nangarhar", "Kunar", "Logar", "Maidan Wardak", "Paktia", "Khost", "Ghazni", "Paktika"].map((n) => "AFG:" + n + "/" + n), "MUG; 1738-06-19 AFS; 1747-10-01 DUR"],
  ["Kafiristan", ["AFG:Nuristan/Nuristan"], "KAF; 1896-03-01 DUR"],
  ["Hazarajat", ["Bamyan", "Urozgan"].map((n) => "AFG:" + n + "/" + n), "HAZ; 1893-01-01 DUR"],
  ["Kandahar", ["Kandahar", "Helmand", "Zabul", "Nimruz", "Farah"].map((n) => "AFG:" + n + "/" + n), "SAF; 1709-04-21 HOT; 1738-03-24 AFS; 1747-10-01 DUR"],
  ["Herat", ["Herat", "Badghis", "Ghōr"].map((n) => "AFG:" + n + "/" + n), "SAF; 1717-01-01 HRT; 1732-02-01 AFS; 1749-01-01 DUR; 1818-01-01 HRT; 1863-05-27 DUR"],
  ["Balkh", ["Balkh", "Jowzjan", "Sar-e Pol", "Faryab", "Samangan"].map((n) => "AFG:" + n + "/" + n), "BUK; 1740-01-01 AFS; 1751-01-01 DUR; 1817-01-01 UZB; 1850-01-01 DUR"],
  ["Kunduz", ["Kunduz", "Baghlan", "Takhar"].map((n) => "AFG:" + n + "/" + n), "BUK; 1740-01-01 AFS; 1751-01-01 DUR; 1817-01-01 UZB; 1859-01-01 DUR"],
  ["Badakhshan", ["AFG:Badakhshan/Badakhshan"], "BDK; 1859-01-01 DUR"]
];

const DAY_MS = 86400000;
const dayN = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DAY_MS;
const isoN = (d) => new Date(d * DAY_MS).toISOString().slice(0, 10);
const full = (d) => (/^\d{4}$/.test(d) ? d + "-01-01" : d);
const july = (y) => dayN(y + "-07-01");

export const timelineOf = (text, what) => text.split(";").map((t) => t.trim()).filter(Boolean).map((t, i) => {
  const m = /^(?:(\d{4}(?:-\d\d-\d\d)?) )?([A-Z][A-Z0-9_]*)$/.exec(t);
  if (!m || (i && !m[1]) || (!i && m[1])) throw new Error("south-asia: bad timeline entry " + JSON.stringify(t) + " in " + what);
  if (!OWNERS[m[2]]) throw new Error("south-asia: unknown owner " + m[2] + " in " + what);
  return { from: i ? dayN(full(m[1])) : -Infinity, owner: m[2] };
});

const regimeAt = (key, d) => { const r = REGIMES[key]; let n = r[0][1]; for (const [from, name] of r) if (dayN(from) <= d) n = name; return n; };
const rawAttrs = (key, d) => {
  const [name, wiki, list] = OWNERS[key];
  let a = { name, wiki };
  for (const [from, ch] of list) if (dayN(full(from)) <= d) a = { ...a, ...ch };
  return a;
};
export const attrsAt = (key, d) => {
  const a = rawAttrs(key, d);
  if (a.name === "-") return null;
  let ruler = a.ruler || "";
  if (ruler.startsWith("@")) ruler = regimeAt(ruler, d);
  else if (ruler.startsWith("#")) ruler = rawAttrs(ruler.slice(1), d).name;
  const people = a.people && !ruler ? 1 : 0;
  const part = a.part || "";
  const status = ruler ? (a.status ?? 5) : 0;
  return { key, name: a.name, wiki: a.wiki, ruler, status, part, people, b: a.b ?? (SOLID.has(key) ? 2 : 1) };
};
const changeDays = () => {
  const s = new Set();
  for (const [, , text] of REGIONS) for (const e of timelineOf(text, "")) if (e.from > -Infinity) s.add(e.from);
  for (const [, , list] of Object.values(OWNERS)) for (const [from] of list) s.add(dayN(full(from)));
  for (const r of Object.values(REGIMES)) for (const [from] of r) s.add(dayN(from));
  return s;
};

export function buildSouthAsia({ topo, provinces, client, rewind }) {
  const geoms = topo.objects.units.geometries;
  const frame = new Set(SA_FRAME), leave = new Set(SA_LEAVE);
  const pool = [];
  geoms.forEach((g, i) => { const pr = provinces[g.properties.p]; if (frame.has(pr.c)) pool.push({ i, c: pr.c, prov: pr.n, n: g.properties.n }); });
  const named = new Set(), errors = [];
  for (const [, sels] of REGIONS) for (const sel of sels) { const [h, n] = sel.split("/"); if (n !== "*") named.add(h.split(":")[0] + ":" + (h.split(":")[1] === "*" ? "" : h.split(":")[1]) + "/" + n); }
  const keyOf = (u) => u.c + ":" + u.prov + "/" + u.n;
  const resolve = (sel) => {
    const slash = sel.indexOf("/"), head = sel.slice(0, slash), n = sel.slice(slash + 1), [c, prov] = head.split(":");
    const hits = pool.filter((u) => u.c === c && (prov === "*" || u.prov === prov) && (n === "*" ? !named.has(keyOf(u)) : u.n === n) && !leave.has(keyOf(u)));
    if (!hits.length) errors.push("no unit for " + sel);
    return hits.map((u) => u.i);
  };
  const owner = new Map();
  const rows = REGIONS.map(([key, sels, text]) => {
    const units = [...new Set(sels.flatMap(resolve))];
    for (const i of units) { if (owner.has(i)) errors.push("unit " + geoms[i].properties.n + " in both " + owner.get(i) + " and " + key); owner.set(i, key); }
    return { key, units, tl: timelineOf(text, key) };
  });
  const missing = pool.filter((u) => !owner.has(u.i) && !leave.has(keyOf(u))).map(keyOf);
  if (missing.length) errors.push("units in no region: " + missing.join(", "));
  if (errors.length) throw new Error("south-asia: " + errors.join("; "));
  const days = [...changeDays()].sort((a, b) => a - b);
  const memo = new Map();
  const shape = (units) => { const k = units.join(","); if (!memo.has(k)) memo.set(k, rewind(client.merge(topo, units.map((i) => geoms[i])).coordinates)); return memo.get(k); };
  const runs = (A, B) => {
    const cuts = [A].concat(days.filter((d) => d > A && d <= B), [B + 1]);
    const out = [];
    let open = new Map();
    for (let k = 0; k + 1 < cuts.length; k++) {
      const a = cuts[k], b = cuts[k + 1] - 1;
      if (a > b) continue;
      const groups = new Map();
      for (const r of rows) {
        const step = r.tl.filter((e) => e.from <= a).pop();
        const at = attrsAt(step.owner, a);
        if (!at) continue;
        const key = JSON.stringify(at);
        if (!groups.has(key)) groups.set(key, { at, units: [] });
        groups.get(key).units.push(...r.units);
      }
      const next = new Map();
      for (const [key, { at, units }] of groups) {
        units.sort((p, q) => p - q);
        const run = key + "|" + units.join(",");
        const s = open.get(run);
        if (s) { s.to = b; next.set(run, s); continue; }
        const t = { ...at, from: a, to: b, units };
        out.push(t);
        next.set(run, t);
      }
      open = next;
    }
    return out;
  };
  const early = [];
  for (const [A, B] of [[dayN(SA_FROM + "-01-01"), dayN("1800-12-31")], [dayN("1801-01-01"), dayN(SA_TO + "-12-31")]]) {
    for (const s of runs(A, B)) {
      const y0 = +isoN(s.from).slice(0, 4), y1 = +isoN(s.to).slice(0, 4);
      const first = s.from <= july(y0) ? y0 : y0 + 1, last = s.to >= july(y1) ? y1 : y1 - 1;
      if (first > last) continue;
      const { units, from, to, key, ...rest } = s;
      early.push({ ...rest, first, last, from: isoN(from), to: isoN(to), polys: shape(units) });
    }
  }
  const late = runs(dayN(SA_LATE_FROM), dayN(SA_LATE_TO)).filter((s) => !CS_COVERED.has(s.key)).map(({ units, from, to, key, ...rest }) => ({ ...rest, key, from: isoN(from), to: isoN(to), polys: shape(units) }));
  const all = pool.filter((u) => owner.has(u.i)).map((u) => geoms[u.i]);
  const mask = rewind(client.merge(topo, all).coordinates);
  return { early, late, mask, units: all.length, regions: rows.length };
}
