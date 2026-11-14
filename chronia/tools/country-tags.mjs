// The country tags, which build-eras.mjs colours by and the page follows a country by (data/tags.json).
// Country tags: a country keeps its tag under all its names (France as the Kingdom of France, the French Empire, or the Third
// Republic), and with it its colours: the first its own, the next two the shades it takes, in that order, where a neighbour has its
// colour. The shades were the palette's two nearest the first as seen (see SHADES) when the tags were written, in November 2026,
// and may be set by hand. A state with no tag has the colour of its own name, and SHADES's shades.
export const TAGS = [
  ["Britain", [3, 2, 1], ["England", "Kingdom of England", "Commonwealth of England", "Great Britain", "Kingdom of Great Britain", "United Kingdom", "United Kingdom of Great Britain and Ireland", "United Kingdom of Great Britain and Northern Ireland"]],
  ["France", [7, 5, 6], ["West Francia", "French Fourth Republic", "Kingdom of France", "France", "Vichy France", "French Empire", "French Republic", "French First Republic", "French Directory", "French Consulate", "First French Empire", "Bourbon Kingdom of France", "French Second Republic", "Second French Empire", "French Third Republic"]],
  ["Russia", [8, 9, 2], ["Principality of Vladimir-Suzdal", "Grand Duchy of Moscow", "Grand Principality of Moscow", "Tsardom of Muscovy", "Tsardom of Russia", "Russian Empire", "Soviet Russia", "Soviet Union", "USSR", "Russia", "Russian Federation"]],
  ["China", [9, 0, 2], ["Qin dynasty", "Han", "Han Empire", "Han dynasty", "Western Jin", "Eastern Jin", "Sui Empire", "Sui dynasty", "Tang Empire", "Tang dynasty", "Song Empire", "Northern Song", "Southern Song", "Yuan dynasty", "Ming Empire", "Ming Chinese Empire", "Ming dynasty", "Manchu Empire", "Qing Empire", "Qing dynasty", "China"]],
  ["United States", [6, 7, 4], ["United States of America", "United States"]],
  ["Slovakia", [7, 5, 6], ["Slovak Republic", "Slovakia"]],
  ["Croatia", [5, 4, 7], ["Independent State of Croatia", "Croatia"]],
  ["Spain", [0, 1, 9], ["County of Castile", "Kingdom of Castile", "Castile", "Crown of Castile", "Spain", "Kingdom of Spain", "Spanish Habsburg", "Habsburg Spain", "First Spanish Republic"]],
  ["Portugal", [6, 7, 4], ["County of Portugal", "Portugal", "Kingdom of Portugal"]],
  ["Netherlands", [1, 0, 3], ["Dutch Republic", "United Provinces", "Batavian Republic", "Kingdom of Holland", "Sovereign Principality of the United Netherlands", "United Kingdom of Netherlands", "Netherlands"]],
  ["Germany", [9, 0, 2], ["Duchy of Prussia", "Brandenburg", "Margraviate of Brandenburg", "Electorate of Brandenburg", "Brandenburg-Prussia", "Prussia", "Kingdom of Prussia", "North German Confederation", "German Empire", "Germany", "West Germany"]],
  ["Austria", [2, 3, 9], ["Margraviate of Austria", "Duchy of Austria", "Archduchy of Austria", "Habsburg Monarchy", "House of Habsburg", "Austrian Empire", "Austro-Hungarian Empire", "Austria-Hungary", "Austria"]],
  ["Turkey", [1, 0, 3], ["Ottoman Empire", "Turkey"]],
  ["Switzerland", [3, 2, 1], ["Swiss Confederation", "Switzerland"]],
  ["Asante", [4, 5, 3], ["Asante", "Ashanti Empire"]],
  ["Alodia", [2, 3, 9], ["Alwa", "Alodia"]],
  ["Iran", [9, 0, 2], ["Safavid Empire", "Safavid dynasty", "Safavid Iran", "Afsharid Iran", "Zand dynasty", "Qajar dynasty", "Qajar Iran", "Persia", "Iran"]],
  ["Japan", [5, 4, 7], ["Asuka Japan", "Nara Japan", "Heian Japan", "Kamakura Shogunate", "Imperial Japan (Fujiwara)", "Ashikaga Shogunate", "Warring States Japan", "Tokugawa shogunate", "Tokugawa Shogunate", "Japan", "Empire of Japan"]],
  ["Rome", [9, 0, 2], ["Roman Republic", "Roman Empire", "Eastern Roman Empire", "Byzantine Empire"]],
  ["Italy", [8, 9, 2], ["County of Savoy", "House of Savoy", "Duchy of Savoy", "Kingdom of Sardinia", "Kingdom of Italy", "Italy"]],
  ["Brazil", [8, 9, 2], ["Colonial Brazil", "Viceroyalty of Brazil", "Kingdom of Brazil", "Empire of Brazil", "Brazil"]],
  ["Thailand", [0, 1, 9], ["Ayutthaya", "Ayutthaya Kingdom", "Thonburi Kingdom", "Rattanakosin Kingdom", "Siam", "Thailand"]],
  ["Ethiopia", [5, 4, 7], ["Abyssinia", "Ethiopian Empire", "Ethiopia"]],
  ["Poland", [4, 5, 3], ["Duchy of Poland", "Kingdom of Poland", "Poland-Lithuania", "Polish-Lithuanian Commonwealth", "Poland"]],
  ["Denmark", [3, 2, 1], ["Kingdom of Denmark", "Denmark-Norway", "Denmark"]],
  ["Sweden", [7, 5, 6], ["Kingdom of Sweden", "Swedish Empire", "Sweden", "United Kingdoms of Sweden and Norway", "Sweden–Norway"]],
  ["India", [1, 0, 3], ["Mughal Empire", "India"]],
  ["Greece", [6, 7, 4], ["First Hellenic Republic", "Kingdom of Greece", "Greece"]],
  ["Serbia", [2, 3, 9], ["Revolutionary Serbia", "Principality of Serbia", "Kingdom of Serbia", "Serbia"]],
  ["Romania", [0, 1, 9], ["United Principalities of Moldavia and Wallachia", "Principality of Romania", "Kingdom of Romania", "Romania"]],
  ["Montenegro", [4, 5, 3], ["Prince-Bishopric of Montenegro", "Principality of Montenegro", "Kingdom of Montenegro", "Montenegro"]],
  ["Bulgaria", [9, 0, 2], ["Principality of Bulgaria", "Bulgaria"]],
  ["Korea", [7, 5, 6], ["Joseon", "Korean Empire", "Korea"]],
  ["British India", [1, 0, 3], ["British India", "British Raj"]],
  ["Transvaal", [5, 4, 7], ["South African Republic", "Transvaal", "Transvaal Colony"]],
  ["Orange Free State", [2, 3, 9], ["Orange Free State", "Orange River Colony"]],
  ["Greenland", [3, 2, 1], ["Danish Greenland", "Greenland"]],
  ["Bornu", [2, 3, 9], ["Bornu Empire", "Kanem-Bornu"]],
  ["Toucouleur", [4, 5, 3], ["Toucouleur Empire", "Tukular Caliphate"]],
  ["Egypt", [0, 1, 9], ["Early Dynastic Period of Egypt", "Old Kingdom of Egypt", "Middle Kingdom of Egypt", "New Kingdom of Egypt", "Twenty-first Dynasty of Egypt", "Twenty-second Dynasty of Egypt", "Twenty-sixth Dynasty of Egypt", "Thirtieth Dynasty of Egypt", "Egypt", "Khedivate of Egypt"]],
  ["Afghanistan", [6, 7, 4], ["Durrani Empire", "Emirate of Afghanistan", "Afghanistan"]],
  ["Bukhara", [2, 3, 9], ["Khanate of Bukhara", "Emirate of Bukhara", "Bukhara"]],
  ["Haiti", [9, 0, 2], ["Republic of Haiti", "Empire of Haiti", "Haiti"]],
  ["Argentina", [6, 7, 4], ["Argentine Confederation", "Argentina"]],
  ["Nepal", [6, 7, 4], ["Gorkha Kingdom", "Kingdom of Nepal", "Nepal"]],
  ["Sikh Empire", [8, 9, 2], ["Sikh Confederacy", "Sikh Empire"]],
  ["Mexico", [4, 5, 3], ["Viceroyalty of New Spain", "First Mexican Empire", "Federated Republic of Mexico", "Centralist Mexico", "Second Mexican Empire", "Mexico"]],
  ["Sri Lanka", [4, 5, 3], ["Ceylon", "Sri Lanka"]],
  ["Burma", [8, 9, 2], ["First Toungoo Empire", "Konbaung dynasty", "Burma", "Myanmar"]],
  ["Benin", [5, 4, 7], ["Dahomey", "Benin"]],
  ["Burkina Faso", [2, 3, 9], ["Upper Volta", "Burkina Faso"]],
  ["Ghana", [4, 5, 3], ["Gold Coast", "Ghana"]],
  ["Malawi", [7, 5, 6], ["Nyasaland", "Malawi"]],
  ["Zambia", [0, 1, 9], ["Northern Rhodesia", "Zambia"]],
  ["Zimbabwe", [4, 5, 3], ["Southern Rhodesia", "Rhodesia", "Zimbabwe"]],
  ["Congo", [2, 3, 9], ["Congo Free State", "Belgian Congo", "Congo-Léopoldville", "Zaire", "DR Congo"]],
];

// data/tags.json, which the page reads: each tag's name and its states' names. build-eras.mjs writes it with each build, and
// `node tools/country-tags.mjs` writes it alone, after a change to the tags.
export function tagsJSON() { return JSON.stringify(TAGS.map(([tag, , names]) => [tag, names])); }

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = resolve(dirname(fileURLToPath(import.meta.url)), "../data/tags.json");
  writeFileSync(out, tagsJSON() + "\n");
  console.log("wrote " + out + " (" + TAGS.length + " tags)");
}
