// The provinces after Diocletian's reform, as the Verona List gives them (about 314), each with the seat of its
// governor (lon, lat): the point that names the piece of land the Ancient World Mapping Center's lines enclose.
// Seats from the Barrington Atlas and the Wikipedia article on each province.
export const LATE = [
  // The Britains
  ["Britannia Prima", "Britannia Prima", -1.97, 51.72], ["Britannia Secunda", "Britannia Secunda", -1.08, 53.96],
  ["Maxima Caesariensis", "Maxima Caesariensis", -0.09, 51.51], ["Flavia Caesariensis", "Flavia Caesariensis", -0.54, 53.23],
  // The Gauls
  ["Belgica Prima", "Belgica Prima", 6.64, 49.75], ["Belgica Secunda", "Belgica Secunda", 4.03, 49.26],
  ["Germania Prima", "Germania Prima", 8.27, 50.0], ["Germania Secunda", "Germania Secunda", 6.96, 50.94],
  ["Maxima Sequanorum", "Maxima Sequanorum", 6.02, 47.24], ["Lugdunensis Prima", "Gallia Lugdunensis", 4.83, 45.76],
  ["Lugdunensis Secunda", "Gallia Lugdunensis", 1.1, 49.44], ["Alpes Graiae et Poeninae", "Alpes Graiae et Poeninae", 6.53, 45.48],
  // The Seven Provinces
  ["Viennensis", "Gallia Viennensis", 4.87, 45.52], ["Narbonensis Prima", "Gallia Narbonensis", 3.0, 43.18],
  ["Narbonensis Secunda", "Gallia Narbonensis", 5.45, 43.53], ["Novempopulana", "Novempopulania", 0.1, 43.86],
  ["Aquitanica Prima", "Gallia Aquitania", 2.4, 47.08], ["Aquitanica Secunda", "Gallia Aquitania", -0.58, 44.84],
  ["Alpes Maritimae", "Alpes Maritimae", 6.5, 44.56],
  // The Spains
  ["Baetica", "Hispania Baetica", -4.78, 37.88], ["Lusitania", "Lusitania", -6.34, 38.92], ["Carthaginiensis", "Carthaginensis", -0.98, 37.6],
  ["Gallaecia", "Gallaecia", -8.43, 41.55], ["Tarraconensis", "Hispania Tarraconensis", 1.25, 41.12], ["Mauretania Tingitana", "Mauretania Tingitana", -5.81, 35.78],
  // Italy
  ["Venetia et Histria", "Venetia et Histria", 13.37, 45.77], ["Aemilia et Liguria", "Aemilia et Liguria", 9.19, 45.46],
  ["Alpes Cottiae", "Alpes Cottiae", 7.05, 45.14], ["Raetia", "Raetia", 10.9, 48.37], ["Flaminia et Picenum", "Flaminia et Picenum", 12.2, 44.42],
  ["Tuscia et Umbria", "Tuscia et Umbria", 11.25, 43.77], ["Campania", "Campania (Roman province)", 14.25, 41.08],
  ["Apulia et Calabria", "Apulia et Calabria", 16.07, 41.22], ["Lucania et Bruttii", "Lucania et Bruttii", 15.65, 38.11],
  ["Sicilia", "Sicilia (Roman province)", 15.29, 37.08], ["Sardinia", "Sardinia (Roman province)", 9.11, 39.22], ["Corsica", "Corsica (Roman province)", 9.51, 42.11],
  // Africa
  ["Africa Proconsularis", "Africa (Roman province)", 10.32, 36.85], ["Byzacena", "Byzacena", 10.64, 35.83], ["Numidia", "Numidia (Roman province)", 6.61, 36.36],
  ["Tripolitania", "Tripolitania", 14.29, 32.64], ["Mauretania Caesariensis", "Mauretania Caesariensis", 2.19, 36.6], ["Mauretania Sitifensis", "Mauretania Sitifensis", 5.41, 36.19],
  // The Pannonias
  ["Pannonia Prima", "Pannonia Prima", 16.62, 47.23], ["Pannonia Secunda", "Pannonia Secunda", 19.61, 44.97], ["Valeria", "Pannonia Valeria", 18.23, 46.07],
  ["Savia", "Pannonia Savia", 16.37, 45.48], ["Dalmatia", "Dalmatia (Roman province)", 16.48, 43.54], ["Noricum Ripense", "Noricum", 14.47, 48.22],
  ["Noricum Mediterraneum", "Noricum", 14.37, 46.7],
  // The Moesias
  ["Dacia Ripensis", "Dacia Ripensis", 22.9, 43.82], ["Dacia Mediterranea", "Dacia Mediterranea", 23.32, 42.7], ["Moesia Prima", "Moesia Prima", 21.21, 44.73],
  ["Dardania", "Dardania (Roman province)", 21.39, 42.0], ["Praevalitana", "Praevalitana", 19.51, 42.07], ["Macedonia", "Macedonia (Roman province)", 22.94, 40.64],
  ["Epirus Vetus", "Epirus Vetus", 20.74, 39.01], ["Epirus Nova", "Epirus Nova", 19.45, 41.32], ["Thessalia", "Thessalia (Roman province)", 22.42, 39.64],
  ["Achaea", "Achaea (Roman province)", 22.93, 37.9], ["Creta", "Crete and Cyrenaica", 24.95, 35.06],
  // Thrace
  ["Thracia", "Thracia", 24.75, 42.15], ["Haemimontus", "Haemimontus", 26.56, 41.68], ["Rhodope", "Rhodope (Roman province)", 25.97, 40.94],
  ["Europa", "Europa (Roman province)", 27.96, 40.97], ["Moesia Secunda", "Moesia Secunda", 27.58, 43.3], ["Scythia", "Scythia Minor", 28.64, 44.18],
  // Asiana
  ["Asia", "Asia (Roman province)", 27.34, 37.94], ["Hellespontus", "Hellespontus (Roman province)", 27.89, 40.39], ["Lydia", "Lydia (Roman province)", 28.04, 38.49],
  ["Caria", "Caria (Roman province)", 28.72, 37.71], ["Phrygia Prima", "Phrygia Pacatiana", 29.11, 37.84], ["Phrygia Secunda", "Phrygia Salutaris", 30.47, 38.52],
  ["Pisidia", "Pisidia (Roman province)", 31.19, 38.31], ["Pamphylia", "Pamphylia (Roman province)", 30.85, 36.96], ["Lycia", "Lycia (Roman province)", 29.98, 36.26],
  ["Insulae", "Insulae (Roman province)", 28.22, 36.43],
  // Pontica
  ["Bithynia", "Bithynia (Roman province)", 29.92, 40.77], ["Paphlagonia", "Paphlagonia (Roman province)", 33.61, 40.6], ["Galatia", "Galatia (Roman province)", 32.86, 39.94],
  ["Cappadocia", "Cappadocia (Roman province)", 35.49, 38.73], ["Diospontus", "Helenopontus", 35.83, 40.65], ["Pontus Polemoniacus", "Pontus Polemoniacus", 36.97, 40.58],
  ["Armenia Minor", "Armenia Minor", 38.33, 38.35],
  // The East
  ["Cilicia", "Cilicia (Roman province)", 34.9, 36.92], ["Isauria", "Isauria", 33.93, 36.38], ["Cyprus", "Cyprus (Roman province)", 33.9, 35.18],
  ["Syria Coele", "Coele-Syria", 36.16, 36.2], ["Phoenice", "Phoenice (Roman province)", 35.2, 33.27], ["Palaestina", "Syria Palaestina", 34.89, 32.5],
  ["Arabia", "Arabia Petraea", 36.48, 32.52], ["Mesopotamia", "Mesopotamia (Roman province)", 40.22, 37.91], ["Osroene", "Osroene", 38.79, 37.16],
  ["Augusta Euphratensis", "Euphratensis", 37.97, 36.54],
  ["Libya Superior", "Libya Superior", 20.95, 32.71], ["Libya Inferior", "Libya Inferior", 27.23, 31.35], ["Aegyptus Iovia", "Aegyptus Iovia", 29.92, 31.2],
  ["Aegyptus Herculia", "Aegyptus Herculia", 31.25, 29.85], ["Thebais", "Thebais", 31.8, 26.48]
];
