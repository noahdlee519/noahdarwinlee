/* Authors deck for the study drill.
   Plain browser script: fills window.DRILL_DATA.authors.
   facts and works[].note are used as "Who is this?" / "Which work is this?" clues,
   so they never contain the author's name or the work's own title. */
window.DRILL_DATA = window.DRILL_DATA || {};
window.DRILL_DATA.authors = [

  /* ───────────────────────── Antiquity and the Middle Ages ───────────────────────── */

  {
    id: "homer",
    name: "Homer",
    born: -750,
    dates: "c. 8th century BCE",
    place: "Ancient Greece",
    group: "classical",
    tag: "Epic poetry",
    blurb: "The legendary poet of the two great Greek epics, the founding works of Western literature.",
    facts: [
      "Traditionally pictured as a blind bard from Ionia, on the coast of Asia Minor.",
      "Several Greek cities, including Smyrna and Chios, claimed to be his birthplace.",
      "His epics grew out of a centuries-old tradition of oral composition in dactylic hexameter."
    ],
    works: [
      { title: "The Iliad", year: "8th century BCE", note: "The wrath of Achilles during the final year of the Trojan War, ending with the funeral of Hector." },
      { title: "The Odyssey", year: "8th century BCE", note: "A cunning hero’s ten-year voyage home from Troy to Ithaca and his reckoning with his wife’s suitors." }
    ],
    lines: [
      { text: "Rage—Goddess, sing the rage of Peleus’ son Achilles, / murderous, doomed …", work: "The Iliad" },
      { text: "Sing to me of the man, Muse, the man of twists and turns …", work: "The Odyssey" }
    ],
    characters: [
      { name: "Achilles", work: "The Iliad" },
      { name: "Odysseus", work: "The Odyssey" },
      { name: "Penelope", work: "The Odyssey" }
    ]
  },

  {
    id: "sappho",
    name: "Sappho",
    born: -630,
    dates: "c. 630–c. 570 BCE",
    place: "Ancient Greece",
    group: "classical",
    tag: "Lyric poetry",
    blurb: "The most celebrated lyric poet of ancient Greece, famed for intensely personal poems of love and desire.",
    facts: [
      "Lived on the island of Lesbos, whose name entered English through her poetry.",
      "An ancient epigram attributed to Plato calls her “the tenth Muse.”",
      "Her poems were collected in nine books, but most survive only as fragments, some recovered from Egyptian papyri."
    ],
    works: [
      { title: "Ode to Aphrodite", year: "c. 600 BCE", note: "Her only complete surviving poem: a prayer asking the goddess of love to help win over a reluctant beloved." },
      { title: "Fragment 31", year: "c. 600 BCE", note: "A lyric describing the physical symptoms of desire—fire under the skin, ringing ears—while watching a beloved woman laugh with a man." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "aeschylus",
    name: "Aeschylus",
    born: -525,
    dates: "c. 525–456 BCE",
    place: "Ancient Greece",
    group: "classical",
    tag: "Tragedy",
    blurb: "The earliest of the three great Athenian tragedians, often called the father of tragedy.",
    facts: [
      "Fought at the Battle of Marathon; his epitaph mentions the battle but not his plays.",
      "Credited by Aristotle with adding a second actor to Greek tragedy.",
      "Legend says he died when an eagle dropped a tortoise on his bald head."
    ],
    works: [
      { title: "The Oresteia", year: "458 BCE", note: "A trilogy following Agamemnon’s murder, his son’s revenge, and the founding of a court of justice in Athens." },
      { title: "The Persians", year: "472 BCE", note: "The oldest surviving Greek play, showing the court of Xerxes reacting to the naval defeat at Salamis." }
    ],
    lines: [],
    characters: [
      { name: "Clytemnestra", work: "The Oresteia" },
      { name: "Orestes", work: "The Oresteia" }
    ]
  },

  {
    id: "sophocles",
    name: "Sophocles",
    born: -497,
    dates: "c. 497–406 BCE",
    place: "Ancient Greece",
    group: "classical",
    tag: "Tragedy",
    blurb: "Athenian tragedian whose Theban plays became the model of tragic form for Aristotle and for centuries after.",
    facts: [
      "Wrote over 120 plays, of which only seven survive complete.",
      "Won first prize at Athens’ City Dionysia more often than any other tragedian.",
      "Served as one of Athens’ generals alongside Pericles.",
      "Credited by Aristotle with adding a third actor to the stage."
    ],
    works: [
      { title: "Oedipus Rex", year: "c. 429 BCE", note: "A king of Thebes investigating a plague discovers that he killed his father and married his mother." },
      { title: "Antigone", year: "c. 441 BCE", note: "A princess defies King Creon’s decree by burying her brother Polynices and is condemned to death." },
      { title: "Oedipus at Colonus", year: "401 BCE", note: "The blind, exiled former king of Thebes finds a final resting place near Athens." }
    ],
    lines: [],
    characters: [
      { name: "Jocasta", work: "Oedipus Rex" },
      { name: "Ismene", work: "Antigone" }
    ]
  },

  {
    id: "euripides",
    name: "Euripides",
    born: -480,
    dates: "c. 480–406 BCE",
    place: "Ancient Greece",
    group: "classical",
    tag: "Tragedy",
    blurb: "The most psychologically daring of the Athenian tragedians, known for complex women and skeptical treatment of myth.",
    facts: [
      "Won few victories in his lifetime but became the most popular tragedian after his death.",
      "Ancient tradition says he composed his plays in a cave on the island of Salamis.",
      "Died at the court of the king of Macedon.",
      "Was mercilessly parodied by Aristophanes in The Frogs."
    ],
    works: [
      { title: "Medea", year: "431 BCE", note: "A sorceress abandoned by Jason takes revenge by killing his new bride and her own children." },
      { title: "The Bacchae", year: "405 BCE", note: "Dionysus punishes King Pentheus of Thebes, who is torn apart by his own mother and the god’s frenzied followers." },
      { title: "The Trojan Women", year: "415 BCE", note: "Hecuba and the captive women of a fallen city await their fates as slaves of the Greeks." }
    ],
    lines: [],
    characters: [
      { name: "Jason", work: "Medea" },
      { name: "Pentheus", work: "The Bacchae" },
      { name: "Hecuba", work: "The Trojan Women" }
    ]
  },

  {
    id: "virgil",
    name: "Virgil",
    born: -70,
    dates: "70–19 BCE",
    place: "Ancient Rome",
    group: "classical",
    tag: "Epic poetry",
    blurb: "Rome’s national poet, whose epic of Aeneas gave the empire a founding myth to rival Homer.",
    facts: [
      "Born near Mantua in northern Italy.",
      "Asked on his deathbed for his unfinished epic to be burned; Emperor Augustus refused.",
      "Serves as the pilgrim’s guide through Hell and Purgatory in Dante’s great poem."
    ],
    works: [
      { title: "The Aeneid", year: "19 BCE", note: "A Trojan prince flees his burning city and journeys to Italy to found the line that will build Rome." },
      { title: "The Georgics", year: "29 BCE", note: "A didactic poem in four books on farming, trees, livestock, and beekeeping." },
      { title: "The Eclogues", year: "c. 38 BCE", note: "Ten pastoral poems of shepherds’ songs, one prophesying a child who will bring a golden age." }
    ],
    lines: [
      { text: "Arms, and the man I sing …", work: "The Aeneid" }
    ],
    characters: [
      { name: "Aeneas", work: "The Aeneid" },
      { name: "Dido", work: "The Aeneid" }
    ]
  },

  {
    id: "ovid",
    name: "Ovid",
    born: -43,
    dates: "43 BCE–c. 17 CE",
    place: "Ancient Rome",
    group: "classical",
    tag: "Epic poetry",
    blurb: "Witty Roman poet of love and myth whose tales of transformation became a sourcebook for Western art and literature.",
    facts: [
      "Abandoned a legal and political career for poetry.",
      "Exiled by Emperor Augustus to Tomis on the Black Sea for “a poem and a mistake.”",
      "Was never allowed to return to Rome and died in exile."
    ],
    works: [
      { title: "Metamorphoses", year: "8 CE", note: "Some 250 myths of transformation, from the creation of the world to the deification of Julius Caesar." },
      { title: "Ars Amatoria", year: "c. 2 CE", note: "A playful instructional poem in three books on how to find and keep a lover." }
    ],
    lines: [],
    characters: [
      { name: "Narcissus", work: "Metamorphoses" },
      { name: "Pygmalion", work: "Metamorphoses" }
    ]
  },

  {
    id: "petronius",
    name: "Petronius",
    born: 27,
    dates: "c. 27–66 CE",
    place: "Ancient Rome",
    group: "classical",
    tag: "Satire",
    blurb: "Roman courtier of Nero’s age, the probable author of a bawdy comic novel of low life in imperial Italy.",
    facts: [
      "Tacitus calls him the emperor Nero’s “judge of elegance,” the final authority on matters of taste at court.",
      "Served as governor of Bithynia and later as consul before joining Nero’s inner circle.",
      "Accused of treason in 66 CE, he opened his veins and chatted with friends as he died.",
      "In his will, instead of flattering Nero, he sent the emperor a sealed list of his debaucheries and partners."
    ],
    works: [
      { title: "Satyricon", year: "1st century CE", note: "A fragmentary comic novel in prose and verse following the misadventures of the narrator Encolpius and his young lover Giton." },
      { title: "Cena Trimalchionis", year: "1st century CE", note: "The longest surviving episode of his novel: a grotesquely lavish dinner party thrown by a vulgar freedman turned millionaire." },
      { title: "The Widow of Ephesus", year: "1st century CE", note: "A tale told within his novel: a grieving woman keeping vigil in her husband’s tomb is seduced by a soldier and offers her husband’s corpse to save him from punishment." }
    ],
    lines: [],
    characters: [
      { name: "Trimalchio", work: "Satyricon" },
      { name: "Encolpius", work: "Satyricon" }
    ]
  },

  {
    id: "murasaki",
    name: "Murasaki Shikibu",
    born: 973,
    dates: "c. 973–c. 1014",
    place: "Japan",
    group: "classical",
    tag: "Heian literature",
    blurb: "Japanese court lady whose tale of a shining prince is often called the world’s first novel.",
    facts: [
      "Served as a lady-in-waiting to Empress Shōshi at the Heian court in Kyoto.",
      "Her real given name is unknown; the name she is known by is a court nickname.",
      "Learned Chinese classics by listening in on her brother’s lessons, unusual for a woman of her time."
    ],
    works: [
      { title: "The Tale of Genji", year: "c. 1010", note: "The loves and political fortunes of a handsome son of an emperor, often called the world’s first novel." },
      { title: "The Diary of Lady Murasaki", year: "c. 1010", note: "A memoir of life at the imperial court around 1008–1010, including the birth of an emperor’s son." }
    ],
    lines: [],
    characters: [
      { name: "Hikaru Genji", work: "The Tale of Genji" }
    ]
  },

  {
    id: "li-bai",
    name: "Li Bai",
    born: 701,
    dates: "701–762",
    place: "China",
    group: "classical",
    tag: "Tang poetry",
    blurb: "Romantic, wine-loving master of Tang dynasty verse, one of the two greatest poets of China.",
    facts: [
      "Known as the “Immortal Poet” for his free-spirited, Daoist-tinged verse.",
      "Served briefly at Emperor Xuanzong’s court in Chang’an before being dismissed.",
      "Friend of Du Fu; the pair are often called the greatest poets of the Tang dynasty.",
      "Legend says he drowned while drunkenly trying to embrace the moon’s reflection in a river."
    ],
    works: [
      { title: "Quiet Night Thought", year: "8th century", note: "A four-line poem in which moonlight on the floor, mistaken for frost, stirs the speaker’s homesickness." },
      { title: "Drinking Alone by Moonlight", year: "8th century", note: "A poet with a jug of wine and no companions invites the moon and his own shadow to drink with him." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "sei-shonagon",
    name: "Sei Shōnagon",
    born: 966,
    dates: "c. 966–after 1017",
    place: "Japan",
    group: "classical",
    tag: "Heian literature",
    blurb: "Witty Heian court lady whose book of lists, anecdotes, and sharp observations is a classic of Japanese prose.",
    facts: [
      "Served as a lady-in-waiting to Empress Teishi at the Heian court in Kyoto from 993.",
      "Was the daughter of the noted waka poet and scholar Kiyohara no Motosuke.",
      "Her real given name is unknown; the name she is known by combines part of her clan name with a court title.",
      "Her rival Murasaki Shikibu dismissed her in her diary as “dreadfully conceited.”"
    ],
    works: [
      { title: "The Pillow Book", year: "c. 1002", note: "A miscellany of lists such as “Hateful Things,” anecdotes, and observations of life at the court of Empress Teishi." }
    ],
    lines: [
      { text: "In spring it is the dawn that is most beautiful.", work: "The Pillow Book" }
    ],
    characters: []
  },

  {
    id: "rumi",
    name: "Rumi",
    born: 1207,
    dates: "1207–1273",
    place: "Persia",
    group: "classical",
    tag: "Sufi poetry",
    blurb: "Persian Sufi mystic and poet whose ecstatic verse on divine love is read worldwide.",
    facts: [
      "Born in Central Asia, traditionally said to be Balkh, and settled in Konya in Anatolia.",
      "His intense friendship with the wandering dervish Shams of Tabriz transformed him into a poet.",
      "His followers founded the Mevlevi order, known as the “whirling dervishes.”",
      "Became one of the best-selling poets in the United States in Coleman Barks’s versions."
    ],
    works: [
      { title: "Masnavi", year: "c. 1258–1273", note: "A vast six-book poem of mystical teaching through stories and parables, sometimes called “the Qur’an in Persian.”" },
      { title: "Divan-e Shams-e Tabrizi", year: "13th century", note: "A collection of thousands of ecstatic ghazals dedicated to a beloved spiritual companion." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "dante",
    name: "Dante Alighieri",
    born: 1265,
    dates: "1265–1321",
    place: "Italy",
    group: "classical",
    tag: "Medieval literature",
    blurb: "Florentine poet whose vision of the afterlife is the supreme poem of the Middle Ages and a foundation of the Italian language.",
    facts: [
      "Exiled from Florence in 1302 after his political faction lost power, and never returned.",
      "Devoted much of his poetry to Beatrice Portinari, whom he first met as a child.",
      "Wrote his masterpiece in the Tuscan vernacular rather than Latin, shaping standard Italian.",
      "Buried in Ravenna, which has refused Florence’s requests to return his remains."
    ],
    works: [
      { title: "The Divine Comedy", year: "c. 1320", note: "A pilgrim’s journey through Hell, Purgatory, and Paradise, guided by Virgil and then Beatrice, in terza rima." },
      { title: "La Vita Nuova", year: "c. 1294", note: "Poems linked by prose commentary recounting the poet’s love for Beatrice and his grief at her death." }
    ],
    lines: [
      { text: "Midway upon the journey of our life / I found myself within a forest dark", work: "The Divine Comedy" },
      { text: "All hope abandon, ye who enter in!", work: "The Divine Comedy" }
    ],
    characters: [
      { name: "Francesca da Rimini", work: "The Divine Comedy" },
      { name: "Count Ugolino", work: "The Divine Comedy" }
    ]
  },

  {
    id: "luo-guanzhong",
    name: "Luo Guanzhong",
    born: 1330,
    dates: "c. 1330–c. 1400",
    place: "China",
    group: "classical",
    tag: "Classical Chinese novel",
    blurb: "Shadowy writer of the late Yuan and early Ming dynasties, credited with China’s great historical epic of war and statecraft.",
    facts: [
      "Almost nothing certain is known of his life; even his birthplace, possibly Taiyuan, is disputed.",
      "Lived through the collapse of the Mongol Yuan dynasty and the founding of the Ming.",
      "Is traditionally credited with editing a famous outlaw saga begun by Shi Nai’an into its 100-chapter form.",
      "His most famous novel is one of the Four Great Classical Novels of Chinese literature."
    ],
    works: [
      { title: "Romance of the Three Kingdoms", year: "14th century", note: "An epic of the wars among Wei, Shu, and Wu after the fall of the Han dynasty, featuring Liu Bei, Cao Cao, and the strategist Zhuge Liang." },
      { title: "Water Margin", year: "14th century", note: "A saga, co-attributed to Shi Nai’an, of 108 outlaws who gather in the marshes of Mount Liang under Song Jiang." },
      { title: "The Three Sui Quash the Demons’ Revolt", year: "14th century", note: "A fantastic tale of an 11th-century uprising led by sorcerers, later expanded from 20 to 40 chapters by Feng Menglong." }
    ],
    lines: [
      { text: "The empire, long divided, must unite; long united, must divide.", work: "Romance of the Three Kingdoms" }
    ],
    characters: [
      { name: "Zhuge Liang", work: "Romance of the Three Kingdoms" },
      { name: "Cao Cao", work: "Romance of the Three Kingdoms" },
      { name: "Guan Yu", work: "Romance of the Three Kingdoms" }
    ]
  },

  {
    id: "chaucer",
    name: "Geoffrey Chaucer",
    born: 1343,
    dates: "c. 1343–1400",
    place: "England",
    group: "classical",
    tag: "Medieval literature",
    blurb: "The “father of English literature,” who proved that English could carry great poetry when French and Latin dominated.",
    facts: [
      "Was captured during the Hundred Years’ War; Edward III helped pay his ransom.",
      "Served as controller of customs for the port of London.",
      "The first poet buried in what became Westminster Abbey’s Poets’ Corner."
    ],
    works: [
      { title: "The Canterbury Tales", year: "c. 1387–1400", note: "Pilgrims riding to the shrine of Thomas Becket tell stories in a contest for a free meal." },
      { title: "Troilus and Criseyde", year: "c. 1385", note: "A long poem on a Trojan prince’s love for a widow who betrays him after she is sent to the Greek camp." }
    ],
    lines: [
      { text: "Whan that Aprill with his shoures soote / The droghte of March hath perced to the roote", work: "The Canterbury Tales" }
    ],
    characters: [
      { name: "The Wife of Bath", work: "The Canterbury Tales" },
      { name: "The Pardoner", work: "The Canterbury Tales" }
    ]
  },

  /* ───────────────────────── Renaissance to the 18th century ───────────────────────── */

  {
    id: "boccaccio",
    name: "Giovanni Boccaccio",
    born: 1313,
    dates: "1313–1375",
    place: "Italy",
    group: "early-modern",
    tag: "Renaissance humanism",
    blurb: "Florentine writer and early humanist whose frame-tale collection set the pattern for European prose fiction.",
    facts: [
      "Spent his youth in Naples, training in banking and canon law before turning to literature.",
      "Close friend and correspondent of Petrarch.",
      "Gave the first public lectures on Dante’s poem in Florence in 1373."
    ],
    works: [
      { title: "The Decameron", year: "c. 1353", note: "Ten young Florentines fleeing the Black Death tell 100 stories over ten days at a country villa." },
      { title: "Il Filostrato", year: "c. 1338", note: "A verse romance of the Trojan lovers Troilus and Criseida, later adapted by Chaucer." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "rabelais",
    name: "François Rabelais",
    born: 1494,
    dates: "c. 1494–1553",
    place: "France",
    group: "early-modern",
    tag: "Renaissance humanism",
    blurb: "French monk, physician, and humanist whose bawdy comic saga of two giants is a landmark of Renaissance prose.",
    facts: [
      "Was a Franciscan and then a Benedictine monk before qualifying as a doctor at Montpellier.",
      "Worked as a physician at the Hôtel-Dieu hospital in Lyon.",
      "Published his first book under the anagram pseudonym Alcofribas Nasier.",
      "His books were condemned by the theologians of the Sorbonne, and his name became an adjective for earthy, exuberant humor."
    ],
    works: [
      { title: "Pantagruel", year: "1532", note: "The birth, education, and exploits of a giant prince who befriends the cunning rogue Panurge." },
      { title: "Gargantua", year: "1534", note: "The upbringing of a giant father, his war against King Picrochole, and his founding of the Abbey of Thélème for Friar John." },
      { title: "The Third Book", year: "1546", note: "Panurge consults sibyls, poets, theologians, and a fool on whether he should marry." }
    ],
    lines: [],
    characters: [
      { name: "Panurge", work: "Pantagruel" },
      { name: "Friar John", work: "Gargantua" }
    ]
  },

  {
    id: "cervantes",
    name: "Miguel de Cervantes",
    born: 1547,
    dates: "1547–1616",
    place: "Spain",
    group: "early-modern",
    tag: "Spanish Golden Age",
    blurb: "Spain’s greatest writer, whose tale of a deluded knight is often called the first modern novel.",
    facts: [
      "Lost the use of his left hand at the naval Battle of Lepanto in 1571.",
      "Was held captive by Barbary pirates in Algiers for five years.",
      "Died in 1616, the same year as Shakespeare."
    ],
    works: [
      { title: "Don Quixote", year: "1605", note: "An aging gentleman, maddened by chivalric romances, sets out as a knight-errant with his squire Sancho Panza." },
      { title: "Exemplary Novels", year: "1613", note: "Twelve short novellas of Spanish life, from picaresque tales to romances." }
    ],
    lines: [
      { text: "In a village of La Mancha, the name of which I have no desire to call to mind, there lived not long since one of those gentlemen that keep a lance in the lance-rack …", work: "Don Quixote" }
    ],
    characters: [
      { name: "Sancho Panza", work: "Don Quixote" },
      { name: "Dulcinea", work: "Don Quixote" }
    ]
  },

  {
    id: "shakespeare",
    name: "William Shakespeare",
    born: 1564,
    dates: "1564–1616",
    place: "England",
    group: "early-modern",
    tag: "Renaissance drama",
    blurb: "The most celebrated writer in the English language, author of some 38 plays and 154 sonnets.",
    facts: [
      "Born and buried in Stratford-upon-Avon.",
      "Part-owner of the Globe Theatre and a member of the Lord Chamberlain’s Men.",
      "Left his wife, Anne Hathaway, his “second-best bed” in his will.",
      "Coined or first recorded hundreds of English words and phrases."
    ],
    works: [
      { title: "Hamlet", year: "c. 1600", note: "A Danish prince feigns madness while seeking revenge on the uncle who murdered his father and married his mother." },
      { title: "Macbeth", year: "1606", note: "A Scottish general, spurred by witches’ prophecies and his wife’s ambition, murders his way to the throne." },
      { title: "Romeo and Juliet", year: "c. 1595", note: "Two young lovers from feuding families of Verona marry in secret, with tragic results." },
      { title: "King Lear", year: "c. 1606", note: "An old king divides his realm between two flattering daughters and banishes the honest one." },
      { title: "The Tempest", year: "1611", note: "The exiled magician Prospero conjures a storm to bring his enemies to his island." }
    ],
    lines: [
      { text: "To be, or not to be, that is the question.", work: "Hamlet" },
      { text: "Two households, both alike in dignity, / In fair Verona, where we lay our scene", work: "Romeo and Juliet" }
    ],
    characters: [
      { name: "Ophelia", work: "Hamlet" },
      { name: "Cordelia", work: "King Lear" },
      { name: "Caliban", work: "The Tempest" }
    ]
  },

  {
    id: "marlowe",
    name: "Christopher Marlowe",
    born: 1564,
    dates: "1564–1593",
    place: "England",
    group: "early-modern",
    tag: "Renaissance drama",
    blurb: "Elizabethan playwright and poet who made blank verse the voice of the English stage before Shakespeare’s rise.",
    facts: [
      "Born in Canterbury, a shoemaker’s son, the same year as Shakespeare.",
      "Ben Jonson praised his “mighty line” of dramatic blank verse.",
      "Was rumored to have worked as a government spy.",
      "Was stabbed to death in a house in Deptford at 29."
    ],
    works: [
      { title: "Doctor Faustus", year: "c. 1592", note: "A German scholar sells his soul to the devil in exchange for 24 years of power and knowledge." },
      { title: "Tamburlaine the Great", year: "c. 1587", note: "A Scythian shepherd rises by ruthless conquest to rule a vast empire." },
      { title: "The Jew of Malta", year: "c. 1590", note: "A merchant whose wealth is seized by the island’s governor pursues bloody revenge." }
    ],
    lines: [
      { text: "Was this the face that launched a thousand ships, / And burnt the topless towers of Ilium?", work: "Doctor Faustus" }
    ],
    characters: [
      { name: "Mephistopheles", work: "Doctor Faustus" },
      { name: "Barabas", work: "The Jew of Malta" }
    ]
  },

  {
    id: "donne",
    name: "John Donne",
    born: 1572,
    dates: "1572–1631",
    place: "England",
    group: "early-modern",
    tag: "Metaphysical poetry",
    blurb: "Leading Metaphysical poet, known for witty conceits in both passionate love poems and intense religious verse.",
    facts: [
      "Born into a Catholic family but became an Anglican priest and Dean of St Paul’s Cathedral.",
      "His secret marriage to Anne More cost him his job and briefly landed him in prison.",
      "Posed in his burial shroud for the portrait used as the model for his funeral monument.",
      "Sailed with the Earl of Essex on expeditions to Cádiz and the Azores."
    ],
    works: [
      { title: "Holy Sonnets", year: "1633", note: "Nineteen devotional poems wrestling with death, sin, and salvation." },
      { title: "Songs and Sonnets", year: "1633", note: "Witty, argumentative love poems built on elaborate extended metaphors, or conceits." },
      { title: "Devotions upon Emergent Occasions", year: "1624", note: "Prose meditations written during a near-fatal illness, reflecting on mortality and human connection." }
    ],
    lines: [
      { text: "No man is an island, entire of itself", work: "Devotions upon Emergent Occasions" },
      { text: "Death, be not proud, though some have called thee / Mighty and dreadful, for thou art not so", work: "Holy Sonnets" }
    ],
    characters: []
  },

  {
    id: "milton",
    name: "John Milton",
    born: 1608,
    dates: "1608–1674",
    place: "England",
    group: "early-modern",
    tag: "Epic poetry",
    blurb: "Puritan poet and polemicist whose blank-verse epic of the Fall is the great English epic.",
    facts: [
      "Went completely blind around 1652 and dictated his later poetry to helpers.",
      "Served as Latin secretary to Oliver Cromwell’s government.",
      "Was briefly imprisoned after the Restoration of Charles II."
    ],
    works: [
      { title: "Paradise Lost", year: "1667", note: "An epic in blank verse retelling Satan’s rebellion and the fall of Adam and Eve from Eden." },
      { title: "Paradise Regained", year: "1671", note: "A brief epic depicting Christ’s resistance to Satan’s temptations in the wilderness." },
      { title: "Areopagitica", year: "1644", note: "A prose polemic arguing against the licensing and pre-publication censorship of printing." }
    ],
    lines: [
      { text: "Of Man’s first disobedience, and the fruit / Of that forbidden tree", work: "Paradise Lost" },
      { text: "Better to reign in Hell, than serve in Heav’n.", work: "Paradise Lost" }
    ],
    characters: [
      { name: "Satan", work: "Paradise Lost" }
    ]
  },

  {
    id: "moliere",
    name: "Molière",
    born: 1622,
    dates: "1622–1673",
    place: "France",
    group: "early-modern",
    tag: "Neoclassicism",
    blurb: "France’s greatest comic playwright, who satirized hypocrisy, pretension, and quack medicine.",
    facts: [
      "Born Jean-Baptiste Poquelin, the son of an upholsterer to the king.",
      "Enjoyed the patronage of Louis XIV.",
      "Was taken ill on stage while playing a hypochondriac in his own play and died hours later.",
      "His troupe later merged into the Comédie-Française, founded seven years after his death."
    ],
    works: [
      { title: "Tartuffe", year: "1664", note: "A religious hypocrite worms his way into a wealthy household, nearly seizing the father’s fortune and daughter." },
      { title: "The Misanthrope", year: "1666", note: "A man who scorns social flattery loves a flirtatious young widow who thrives on it." },
      { title: "The Imaginary Invalid", year: "1673", note: "A hypochondriac plans to marry his daughter to a doctor so he will have free medical care." }
    ],
    lines: [],
    characters: [
      { name: "Orgon", work: "Tartuffe" },
      { name: "Alceste", work: "The Misanthrope" }
    ]
  },

  {
    id: "racine",
    name: "Jean Racine",
    born: 1639,
    dates: "1639–1699",
    place: "France",
    group: "early-modern",
    tag: "Neoclassicism",
    blurb: "Master of French classical tragedy, renowned for the purity of his alexandrines and his portraits of destructive passion.",
    facts: [
      "Orphaned young and educated by the austere Jansenists of Port-Royal.",
      "Became royal historiographer to Louis XIV in 1677.",
      "Gave up writing for the public stage at the height of his fame in 1677."
    ],
    works: [
      { title: "Phèdre", year: "1677", note: "The wife of Theseus confesses a forbidden passion for her stepson Hippolytus, with fatal results." },
      { title: "Andromaque", year: "1667", note: "After Troy’s fall, Hector’s captive widow is courted by Pyrrhus amid a chain of unrequited loves." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "basho",
    name: "Matsuo Bashō",
    born: 1644,
    dates: "1644–1694",
    place: "Japan",
    group: "early-modern",
    tag: "Haiku",
    blurb: "The supreme master of haiku, who turned the form into a vehicle for Zen-inflected insight.",
    facts: [
      "Took his pen name from a banana plant given to him by a student.",
      "Served as a page to a samurai family in Iga Province as a youth.",
      "Spent much of his later life traveling on foot across Japan.",
      "Died in Osaka on a journey; his last poem imagines his dreams wandering over withered fields."
    ],
    works: [
      { title: "The Narrow Road to the Deep North", year: "1702", note: "A travel diary in prose and haiku recording a long journey on foot through northern Honshu." },
      { title: "The Old Pond", year: "1686", note: "A three-line poem in which a frog’s leap breaks the silence of an ancient body of water." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "defoe",
    name: "Daniel Defoe",
    born: 1660,
    dates: "c. 1660–1731",
    place: "England",
    group: "early-modern",
    tag: "Early novel",
    blurb: "Journalist, pamphleteer, and pioneer of the English novel, famed for realistic first-person narratives.",
    facts: [
      "Was put in the pillory in 1703 for a satirical pamphlet against religious intolerance.",
      "Worked as a government spy in Scotland around the 1707 Act of Union.",
      "Went bankrupt as a merchant in 1692."
    ],
    works: [
      { title: "Robinson Crusoe", year: "1719", note: "A castaway survives for 28 years on a Caribbean island, later rescuing a native man from cannibals." },
      { title: "Moll Flanders", year: "1722", note: "A woman born in Newgate Prison recounts her life as a thief, bigamist, and transported convict." },
      { title: "A Journal of the Plague Year", year: "1722", note: "A fictionalized eyewitness account of the Great Plague of London in 1665." }
    ],
    lines: [
      { text: "I was born in the year 1632, in the city of York, of a good family, though not of that country …", work: "Robinson Crusoe" }
    ],
    characters: [
      { name: "Friday", work: "Robinson Crusoe" }
    ]
  },

  {
    id: "swift",
    name: "Jonathan Swift",
    born: 1667,
    dates: "1667–1745",
    place: "Ireland",
    group: "early-modern",
    tag: "Enlightenment satire",
    blurb: "Anglo-Irish clergyman and the greatest prose satirist in English.",
    facts: [
      "Served as Dean of St Patrick’s Cathedral in Dublin.",
      "Left much of his estate to found a hospital for the mentally ill.",
      "Wrote his own Latin epitaph, in which “savage indignation” can no longer lacerate his heart.",
      "Had long, intimate friendships with two women he called Stella and Vanessa."
    ],
    works: [
      { title: "Gulliver’s Travels", year: "1726", note: "A ship’s surgeon visits Lilliput, Brobdingnag, Laputa, and a land of rational horses, satirizing human folly." },
      { title: "A Modest Proposal", year: "1729", note: "A deadpan pamphlet suggesting that the Irish poor sell their children as food for the rich." },
      { title: "A Tale of a Tub", year: "1704", note: "A satire on religious corruption, framed as an allegory of three brothers and their father’s will." }
    ],
    lines: [],
    characters: [
      { name: "Lemuel Gulliver", work: "Gulliver’s Travels" }
    ]
  },

  {
    id: "voltaire",
    name: "Voltaire",
    born: 1694,
    dates: "1694–1778",
    place: "France",
    group: "early-modern",
    tag: "Enlightenment satire",
    blurb: "The Enlightenment’s sharpest wit, who championed tolerance and reason against fanaticism.",
    facts: [
      "Born François-Marie Arouet in Paris.",
      "Was imprisoned in the Bastille twice and exiled to England.",
      "Spent his last two decades at Ferney, near the Swiss border.",
      "Campaigned to clear the name of Jean Calas, a Protestant executed in Toulouse."
    ],
    works: [
      { title: "Candide", year: "1759", note: "A naive young man, taught that all is for the best, endures war, earthquake, and slavery across the world." },
      { title: "Letters on the English", year: "1733", note: "Essays praising English tolerance, science, and government as an implicit rebuke to France." },
      { title: "Zadig", year: "1747", note: "A wise young Babylonian suffers a string of misfortunes while solving puzzles through reason." }
    ],
    lines: [
      { text: "We must cultivate our garden.", work: "Candide" }
    ],
    characters: [
      { name: "Pangloss", work: "Candide" },
      { name: "Cunégonde", work: "Candide" }
    ]
  },

  {
    id: "fielding",
    name: "Henry Fielding",
    born: 1707,
    dates: "1707–1754",
    place: "England",
    group: "early-modern",
    tag: "Early novel",
    blurb: "English playwright, magistrate, and novelist who brought broad comedy and an intrusive, ironic narrator to the early English novel.",
    facts: [
      "His satirical plays against Robert Walpole helped provoke the theatrical Licensing Act of 1737, ending his stage career.",
      "As a London magistrate, helped found the Bow Street Runners, often called London’s first police force.",
      "Began writing fiction by parodying Samuel Richardson’s Pamela.",
      "Died in Lisbon, where he had gone in search of a cure for his failing health."
    ],
    works: [
      { title: "Tom Jones", year: "1749", note: "An abandoned baby raised by Squire Allworthy grows into a lusty, good-hearted young man who pursues his beloved Sophia Western to London." },
      { title: "Joseph Andrews", year: "1742", note: "The virtuous footman brother of Richardson’s Pamela resists his employer Lady Booby and travels home with Parson Adams." },
      { title: "Amelia", year: "1751", note: "A patient, loyal wife stands by her imprudent army-officer husband, Captain Booth, through debt, prison, and temptation in London." }
    ],
    lines: [],
    characters: [
      { name: "Sophia Western", work: "Tom Jones" },
      { name: "Squire Western", work: "Tom Jones" },
      { name: "Parson Adams", work: "Joseph Andrews" }
    ]
  },

  {
    id: "sterne",
    name: "Laurence Sterne",
    born: 1713,
    dates: "1713–1768",
    place: "England",
    group: "early-modern",
    tag: "Early novel",
    blurb: "Yorkshire parson whose digressive, playful comic novel anticipated the experiments of modernism by two centuries.",
    facts: [
      "Born in Clonmel, Ireland, the son of an army officer.",
      "Served for some twenty years as vicar of Sutton-on-the-Forest, near York.",
      "Became perpetual curate of Coxwold, Yorkshire, in 1760, after his first volumes made him a London celebrity.",
      "Rumor held that his body was stolen by grave robbers and recognized on a Cambridge dissecting table."
    ],
    works: [
      { title: "Tristram Shandy", year: "1759–67", note: "A narrator tries to tell his life story but barely gets past his birth, amid digressions, a black page, and his uncle’s military hobbyhorse." },
      { title: "A Sentimental Journey Through France and Italy", year: "1768", note: "Parson Yorick’s tender, comic encounters on a trip across the Channel, breaking off mid-sentence; its author died weeks after publication." },
      { title: "The Sermons of Mr. Yorick", year: "1760–66", note: "Collected Anglican pulpit addresses, published under the name of a clergyman from his famous novel." }
    ],
    lines: [
      { text: "I wish either my father or my mother, or indeed both of them, as they were in duty both equally bound to it, had minded what they were about when they begot me …", work: "Tristram Shandy" }
    ],
    characters: [
      { name: "Uncle Toby", work: "Tristram Shandy" },
      { name: "Walter Shandy", work: "Tristram Shandy" },
      { name: "Parson Yorick", work: "Tristram Shandy" }
    ]
  },

  {
    id: "cao-xueqin",
    name: "Cao Xueqin",
    born: 1715,
    dates: "c. 1715–c. 1763",
    place: "China",
    group: "early-modern",
    tag: "Classical Chinese novel",
    blurb: "Qing dynasty writer whose vast novel of a declining aristocratic family is considered the summit of Chinese fiction.",
    facts: [
      "His grandfather, the imperial textile commissioner at Nanjing, hosted the Kangxi Emperor four times on his southern tours.",
      "His family’s wealth was confiscated under the Yongzheng Emperor in the late 1720s, plunging it into decline.",
      "Spent his last years in poverty in the countryside west of Beijing.",
      "Left his great novel unfinished at about 80 chapters; a 120-chapter version was published decades after his death."
    ],
    works: [
      { title: "Dream of the Red Chamber", year: "1791", note: "The rise and fall of the wealthy Jia clan, centered on the sensitive heir Baoyu and his doomed love for his cousin Daiyu; also called The Story of the Stone." }
    ],
    lines: [],
    characters: [
      { name: "Jia Baoyu", work: "Dream of the Red Chamber" },
      { name: "Lin Daiyu", work: "Dream of the Red Chamber" },
      { name: "Wang Xifeng", work: "Dream of the Red Chamber" }
    ]
  },

  {
    id: "goethe",
    name: "Johann Wolfgang von Goethe",
    born: 1749,
    dates: "1749–1832",
    place: "Germany",
    group: "early-modern",
    tag: "Weimar Classicism",
    blurb: "Germany’s greatest writer: poet, novelist, dramatist, scientist, and statesman.",
    facts: [
      "Served for decades as a minister at the ducal court of Weimar.",
      "Developed a theory of colors that challenged Newton’s optics.",
      "Close friend and collaborator of the playwright Friedrich Schiller.",
      "Worked on his two-part masterpiece for about 60 years."
    ],
    works: [
      { title: "Faust", year: "1808", note: "A restless scholar wagers his soul with the devil on never finding a moment of perfect contentment." },
      { title: "The Sorrows of Young Werther", year: "1774", note: "An epistolary novel of a sensitive young man’s hopeless love for the engaged Lotte, ending in suicide." },
      { title: "Wilhelm Meister’s Apprenticeship", year: "1795–96", note: "A merchant’s son seeks self-fulfillment through the theater, establishing the bildungsroman." }
    ],
    lines: [],
    characters: [
      { name: "Gretchen", work: "Faust" },
      { name: "Lotte", work: "The Sorrows of Young Werther" }
    ]
  },

  /* ───────────────────────── 19th century ───────────────────────── */

  {
    id: "wordsworth",
    name: "William Wordsworth",
    born: 1770,
    dates: "1770–1850",
    place: "England",
    group: "19th",
    tag: "Romanticism",
    blurb: "Founding poet of English Romanticism, who found the sublime in nature and ordinary speech.",
    facts: [
      "Lived for decades in the Lake District, at Dove Cottage and then Rydal Mount.",
      "Served as Poet Laureate from 1843 until his death.",
      "Fathered a daughter with Annette Vallon during a stay in revolutionary France.",
      "His sister Dorothy’s journals inspired several of his poems."
    ],
    works: [
      { title: "Lyrical Ballads", year: "1798", note: "A joint collection with Coleridge that launched English Romanticism with poems in everyday language." },
      { title: "The Prelude", year: "1850", note: "An autobiographical blank-verse epic on the growth of the poet’s mind, published after his death." },
      { title: "I Wandered Lonely as a Cloud", year: "1807", note: "A short lyric recalling the sight of a host of golden daffodils beside a lake." }
    ],
    lines: [
      { text: "Five years have past; five summers, with the length / Of five long winters!", work: "Lyrical Ballads" }
    ],
    characters: []
  },

  {
    id: "austen",
    name: "Jane Austen",
    born: 1775,
    dates: "1775–1817",
    place: "England",
    group: "19th",
    tag: "Novel of manners",
    blurb: "Ironic chronicler of love, money, and marriage among the English gentry, and one of the most beloved novelists in English.",
    facts: [
      "Published anonymously; her first novel was credited only to “A Lady.”",
      "Lived much of her life in the Hampshire villages of Steventon and Chawton.",
      "Accepted a marriage proposal from Harris Bigg-Wither, then withdrew it the next morning.",
      "Appears on the Bank of England’s £10 note."
    ],
    works: [
      { title: "Pride and Prejudice", year: "1813", note: "Elizabeth Bennet’s sharp first impressions of the haughty Mr. Darcy give way to love." },
      { title: "Emma", year: "1815", note: "A wealthy, self-assured young matchmaker meddles in her neighbors’ romances in the village of Highbury." },
      { title: "Sense and Sensibility", year: "1811", note: "Two Dashwood sisters, one reserved and one impulsive, navigate love after their family loses its fortune." },
      { title: "Persuasion", year: "1817", note: "Anne Elliot meets again the naval officer she was talked into rejecting eight years before." }
    ],
    lines: [
      { text: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.", work: "Pride and Prejudice" }
    ],
    characters: [
      { name: "Mr. Darcy", work: "Pride and Prejudice" },
      { name: "Mr. Knightley", work: "Emma" },
      { name: "Marianne Dashwood", work: "Sense and Sensibility" }
    ]
  },

  {
    id: "stendhal",
    name: "Stendhal",
    born: 1783,
    dates: "1783–1842",
    place: "France",
    group: "19th",
    tag: "Realism",
    blurb: "French novelist of ambition and passion whose psychological acuity made him a founder of the realist novel.",
    facts: [
      "Born Marie-Henri Beyle in Grenoble; his pen name came from a small German town.",
      "Served in Napoleon’s administration and witnessed the burning of Moscow in 1812.",
      "Spent his later years as French consul at Civitavecchia in the Papal States.",
      "A syndrome of dizziness and palpitations brought on by great art is named after his account of a visit to Florence."
    ],
    works: [
      { title: "The Red and the Black", year: "1830", note: "A carpenter’s ambitious son rises in Restoration France by seducing a mayor’s wife and an aristocrat’s daughter, and ends on the guillotine." },
      { title: "The Charterhouse of Parma", year: "1839", note: "A young Italian aristocrat wanders through the Battle of Waterloo and the intrigues of a small court; dictated in 52 days." },
      { title: "On Love", year: "1822", note: "A treatise on romantic passion describing “crystallization,” the mind’s way of covering its object with imagined perfections." }
    ],
    lines: [],
    characters: [
      { name: "Julien Sorel", work: "The Red and the Black" },
      { name: "Madame de Rênal", work: "The Red and the Black" },
      { name: "Fabrice del Dongo", work: "The Charterhouse of Parma" }
    ]
  },

  {
    id: "byron",
    name: "Lord Byron",
    born: 1788,
    dates: "1788–1824",
    place: "England",
    group: "19th",
    tag: "Romanticism",
    blurb: "Flamboyant Romantic poet and celebrity whose brooding heroes gave Europe a new type of hero.",
    facts: [
      "Lady Caroline Lamb called him “mad, bad, and dangerous to know.”",
      "Father of the mathematician Ada Lovelace.",
      "Swam the Hellespont in 1810 in imitation of the legend of Leander.",
      "Died of fever at Missolonghi while supporting the Greek War of Independence."
    ],
    works: [
      { title: "Don Juan", year: "1819–24", note: "A comic epic in ottava rima in which a young Spaniard is seduced, shipwrecked, and swept across Europe." },
      { title: "Childe Harold’s Pilgrimage", year: "1812–18", note: "A melancholy young wanderer’s travels through Europe; its success made the poet famous overnight." },
      { title: "She Walks in Beauty", year: "1815", note: "A short lyric praising a woman whose loveliness unites dark and light, mind and heart." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "mary-shelley",
    name: "Mary Shelley",
    born: 1797,
    dates: "1797–1851",
    place: "England",
    group: "19th",
    tag: "Gothic",
    blurb: "English novelist whose tale of a scientist and his creature is a founding work of science fiction.",
    facts: [
      "Her mother, the author of A Vindication of the Rights of Woman, died days after her birth.",
      "Eloped to the Continent at 16 with a married Romantic poet.",
      "Conceived her most famous story during a ghost-story contest with Lord Byron at Lake Geneva in 1816.",
      "Was said to have kept her drowned husband’s heart for the rest of her life."
    ],
    works: [
      { title: "Frankenstein", year: "1818", note: "A young scientist assembles and animates a living creature, then abandons it, with deadly consequences." },
      { title: "The Last Man", year: "1826", note: "An apocalyptic novel in which a plague wipes out humanity by the late 21st century." }
    ],
    lines: [
      { text: "You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings.", work: "Frankenstein" }
    ],
    characters: [
      { name: "Victor Frankenstein", work: "Frankenstein" }
    ]
  },

  {
    id: "keats",
    name: "John Keats",
    born: 1795,
    dates: "1795–1821",
    place: "England",
    group: "19th",
    tag: "Romanticism",
    blurb: "Second-generation Romantic poet whose odes, written in a single extraordinary year, are among the finest in English.",
    facts: [
      "Trained as an apothecary-surgeon at Guy’s Hospital before devoting himself to poetry.",
      "Died of tuberculosis in Rome at 25.",
      "Asked that his gravestone read: “Here lies One Whose Name was writ in Water.”",
      "Was secretly engaged to his neighbor Fanny Brawne."
    ],
    works: [
      { title: "Ode to a Nightingale", year: "1819", note: "The speaker, aching with heartache, longs to escape mortal sorrow by joining a bird’s immortal song." },
      { title: "Ode on a Grecian Urn", year: "1820", note: "A meditation on the frozen scenes painted on an ancient vase and the permanence of art." },
      { title: "Endymion", year: "1818", note: "A long poetic romance about a shepherd’s love for the moon goddess." },
      { title: "The Eve of St. Agnes", year: "1820", note: "Young Porphyro steals into a hostile castle to elope with Madeline on a winter feast night." }
    ],
    lines: [
      { text: "A thing of beauty is a joy for ever", work: "Endymion" },
      { text: "“Beauty is truth, truth beauty,”—that is all / Ye know on earth, and all ye need to know.", work: "Ode on a Grecian Urn" }
    ],
    characters: []
  },

  {
    id: "pushkin",
    name: "Alexander Pushkin",
    born: 1799,
    dates: "1799–1837",
    place: "Russia",
    group: "19th",
    tag: "Romanticism",
    blurb: "Russia’s national poet and the founder of modern Russian literature.",
    facts: [
      "His great-grandfather, Abram Gannibal, was an African brought to Russia as a page for Peter the Great.",
      "Was exiled to southern Russia in 1820 for his political poems.",
      "Was killed in a duel with Georges d’Anthès, who had been courting his wife."
    ],
    works: [
      { title: "Eugene Onegin", year: "1833", note: "A novel in verse in which a jaded dandy rejects young Tatyana, kills his friend in a duel, and later regrets it." },
      { title: "Boris Godunov", year: "1831", note: "A historical drama about a tsar haunted by the murder of the rightful heir." },
      { title: "The Bronze Horseman", year: "1837", note: "A poor clerk, ruined by the 1824 St. Petersburg flood, defies the city’s statue of Peter the Great." }
    ],
    lines: [],
    characters: [
      { name: "Tatyana Larina", work: "Eugene Onegin" }
    ]
  },

  {
    id: "balzac",
    name: "Honoré de Balzac",
    born: 1799,
    dates: "1799–1850",
    place: "France",
    group: "19th",
    tag: "Realism",
    blurb: "Prolific founder of the realist novel, who set out to portray the whole of French society.",
    facts: [
      "Reputedly drank dozens of cups of black coffee a day to fuel all-night writing sessions.",
      "Ran up huge debts from failed ventures in printing and publishing.",
      "Married the Polish countess Ewelina Hańska months before his death after an 18-year courtship."
    ],
    works: [
      { title: "Père Goriot", year: "1835", note: "An old man impoverishes himself for his ungrateful daughters while the ambitious Rastignac learns the ways of Paris." },
      { title: "Eugénie Grandet", year: "1833", note: "A miser’s daughter in provincial Saumur sacrifices her happiness for love of her cousin." },
      { title: "La Comédie humaine", year: "1829–48", note: "A cycle of some 90 interlinked novels and stories with recurring characters, portraying French society after Napoleon." }
    ],
    lines: [],
    characters: [
      { name: "Eugène de Rastignac", work: "Père Goriot" },
      { name: "Vautrin", work: "Père Goriot" }
    ]
  },

  {
    id: "hugo",
    name: "Victor Hugo",
    born: 1802,
    dates: "1802–1885",
    place: "France",
    group: "19th",
    tag: "Romanticism",
    blurb: "Leader of French Romanticism and a towering public figure, as famous for his poetry as for his novels.",
    facts: [
      "Spent nearly 20 years in exile, mostly on Guernsey, for opposing Napoleon III.",
      "Reportedly telegraphed his publisher a single “?” and received “!” in reply.",
      "His daughter Léopoldine drowned in the Seine in 1843.",
      "Some two million people are said to have joined his funeral procession to the Panthéon."
    ],
    works: [
      { title: "Les Misérables", year: "1862", note: "Ex-convict Jean Valjean seeks redemption while pursued by Inspector Javert, culminating in the 1832 Paris uprising." },
      { title: "The Hunchback of Notre-Dame", year: "1831", note: "The deaf bell-ringer Quasimodo loves the dancer Esmeralda in 15th-century Paris." }
    ],
    lines: [],
    characters: [
      { name: "Jean Valjean", work: "Les Misérables" },
      { name: "Javert", work: "Les Misérables" },
      { name: "Quasimodo", work: "The Hunchback of Notre-Dame" }
    ]
  },

  {
    id: "dumas",
    name: "Alexandre Dumas",
    born: 1802,
    dates: "1802–1870",
    place: "France",
    group: "19th",
    tag: "Romanticism",
    blurb: "Prolific French master of the swashbuckling historical adventure and the tale of revenge.",
    facts: [
      "His father, born in Saint-Domingue to a French nobleman and an enslaved woman, became a general in the Revolutionary army.",
      "Worked with collaborators, above all Auguste Maquet, who later sued him for recognition.",
      "Built an extravagant country house near Paris, named after his most famous hero, and soon had to sell it.",
      "His remains were moved to the Panthéon in 2002; his son of the same name wrote The Lady of the Camellias."
    ],
    works: [
      { title: "The Three Musketeers", year: "1844", note: "A young Gascon, d’Artagnan, comes to Paris and joins Athos, Porthos, and Aramis against Cardinal Richelieu and the spy Milady." },
      { title: "The Count of Monte Cristo", year: "1844–46", note: "A sailor wrongly imprisoned in the Château d’If escapes, finds a hidden fortune, and takes elaborate revenge under a noble alias." },
      { title: "The Vicomte de Bragelonne", year: "1847–50", note: "The last of the d’Artagnan novels, whose final part tells of a plot to replace Louis XIV with his imprisoned twin." }
    ],
    lines: [],
    characters: [
      { name: "d’Artagnan", work: "The Three Musketeers" },
      { name: "Milady de Winter", work: "The Three Musketeers" },
      { name: "Edmond Dantès", work: "The Count of Monte Cristo" }
    ]
  },

  {
    id: "gogol",
    name: "Nikolai Gogol",
    born: 1809,
    dates: "1809–1852",
    place: "Russia",
    group: "19th",
    tag: "Realism",
    blurb: "Ukrainian-born master of the grotesque and absurd whose comic fiction founded the Russian prose tradition.",
    facts: [
      "Born in Ukraine, then part of the Russian Empire.",
      "Burned the manuscript of the second part of his novel days before his death.",
      "Starved himself under the influence of an ascetic priest."
    ],
    works: [
      { title: "Dead Souls", year: "1842", note: "A swindler named Chichikov tours the provinces buying up the names of deceased serfs to use as collateral." },
      { title: "The Overcoat", year: "1842", note: "A poor copying clerk’s new coat, bought after great sacrifice, is stolen, and his ghost haunts St. Petersburg." },
      { title: "The Government Inspector", year: "1836", note: "Corrupt provincial officials mistake a penniless young clerk for an incognito official from the capital." }
    ],
    lines: [],
    characters: [
      { name: "Akaky Akakievich", work: "The Overcoat" },
      { name: "Khlestakov", work: "The Government Inspector" }
    ]
  },

  {
    id: "poe",
    name: "Edgar Allan Poe",
    born: 1809,
    dates: "1809–1849",
    place: "United States",
    group: "19th",
    tag: "Gothic",
    blurb: "American master of the macabre, inventor of the detective story, and a major influence on French Symbolism.",
    facts: [
      "Orphaned at two and taken in by a Richmond tobacco merchant.",
      "Married his 13-year-old cousin, Virginia Clemm.",
      "Credited with inventing the modern detective story.",
      "Was found delirious in Baltimore days before his death; the cause remains a mystery."
    ],
    works: [
      { title: "The Raven", year: "1845", note: "A grieving man is visited at midnight by a black bird that answers every question with one word." },
      { title: "The Tell-Tale Heart", year: "1843", note: "A murderer insists on his sanity while describing how the beating of his victim’s heart drove him to confess." },
      { title: "The Fall of the House of Usher", year: "1839", note: "A visitor watches the last members of a decaying family line, and their mansion, collapse." },
      { title: "The Murders in the Rue Morgue", year: "1841", note: "The detective C. Auguste Dupin solves a pair of brutal killings in a locked Paris apartment." }
    ],
    lines: [
      { text: "True!—nervous—very, very dreadfully nervous I had been and am; but why will you say that I am mad?", work: "The Tell-Tale Heart" }
    ],
    characters: [
      { name: "C. Auguste Dupin", work: "The Murders in the Rue Morgue" },
      { name: "Lenore", work: "The Raven" }
    ]
  },

  {
    id: "hawthorne",
    name: "Nathaniel Hawthorne",
    born: 1804,
    dates: "1804–1864",
    place: "United States",
    group: "19th",
    tag: "Dark Romanticism",
    blurb: "New England novelist who explored sin, guilt, and the Puritan past.",
    facts: [
      "Added a “w” to his surname, possibly to distance himself from an ancestor who judged the Salem witch trials.",
      "Worked at the Salem Custom House, an experience he satirized in a famous introduction.",
      "Briefly lived at the utopian Brook Farm community.",
      "His college friend President Franklin Pierce appointed him U.S. consul in Liverpool."
    ],
    works: [
      { title: "The Scarlet Letter", year: "1850", note: "In Puritan Boston, Hester Prynne is forced to wear an “A” for adultery while hiding her lover’s identity." },
      { title: "The House of the Seven Gables", year: "1851", note: "A New England family lives under an ancestral curse tied to a stolen piece of land." },
      { title: "Young Goodman Brown", year: "1835", note: "A Puritan man leaves his wife, Faith, for a night in the forest and witnesses a witches’ sabbath." }
    ],
    lines: [],
    characters: [
      { name: "Hester Prynne", work: "The Scarlet Letter" },
      { name: "Arthur Dimmesdale", work: "The Scarlet Letter" }
    ]
  },

  {
    id: "dickens",
    name: "Charles Dickens",
    born: 1812,
    dates: "1812–1870",
    place: "England",
    group: "19th",
    tag: "Victorian novel",
    blurb: "The most popular novelist of the Victorian age, champion of the poor and creator of unforgettable characters.",
    facts: [
      "Worked in a blacking factory as a child while his father was in debtors’ prison.",
      "Published most of his novels in monthly or weekly installments.",
      "Survived the Staplehurst rail crash in 1865.",
      "Gave hugely popular public readings of his work in Britain and America."
    ],
    works: [
      { title: "A Tale of Two Cities", year: "1859", note: "A story of love and self-sacrifice set in London and Paris during the French Revolution." },
      { title: "Great Expectations", year: "1861", note: "The orphan Pip, secretly funded by an unknown benefactor, becomes a gentleman in London." },
      { title: "Oliver Twist", year: "1838", note: "An orphan escapes the workhouse and falls in with a gang of child pickpockets in London." },
      { title: "A Christmas Carol", year: "1843", note: "A miserly moneylender is visited by ghosts on Christmas Eve and reforms." },
      { title: "David Copperfield", year: "1850", note: "A semi-autobiographical novel following a boy from a cruel childhood to success as a writer." }
    ],
    lines: [
      { text: "It was the best of times, it was the worst of times …", work: "A Tale of Two Cities" },
      { text: "Marley was dead: to begin with.", work: "A Christmas Carol" }
    ],
    characters: [
      { name: "Ebenezer Scrooge", work: "A Christmas Carol" },
      { name: "Miss Havisham", work: "Great Expectations" },
      { name: "Fagin", work: "Oliver Twist" }
    ]
  },

  {
    id: "charlotte-bronte",
    name: "Charlotte Brontë",
    born: 1816,
    dates: "1816–1855",
    place: "England",
    group: "19th",
    tag: "Victorian novel",
    blurb: "Eldest surviving of the literary sisters, whose passionate first-person heroine changed the English novel.",
    facts: [
      "Published under the male pseudonym Currer Bell.",
      "Attended the Cowan Bridge school, where two older sisters caught fatal tuberculosis.",
      "Fell in love with her married teacher, Constantin Héger, while studying in Brussels.",
      "Outlived all five of her siblings."
    ],
    works: [
      { title: "Jane Eyre", year: "1847", note: "An orphaned governess falls in love with her brooding employer, who hides a secret in the attic." },
      { title: "Villette", year: "1853", note: "A reserved Englishwoman teaches at a girls’ school in a Belgian town and falls in love." }
    ],
    lines: [
      { text: "Reader, I married him.", work: "Jane Eyre" }
    ],
    characters: [
      { name: "Edward Rochester", work: "Jane Eyre" },
      { name: "Bertha Mason", work: "Jane Eyre" }
    ]
  },

  {
    id: "emily-bronte",
    name: "Emily Brontë",
    born: 1818,
    dates: "1818–1848",
    place: "England",
    group: "19th",
    tag: "Gothic",
    blurb: "Poet and author of a single wild, visionary novel of obsessive love on the Yorkshire moors.",
    facts: [
      "Published under the male pseudonym Ellis Bell.",
      "Invented the imaginary kingdom of Gondal with her younger sister Anne.",
      "Died of tuberculosis at 30, a year after her only novel appeared."
    ],
    works: [
      { title: "Wuthering Heights", year: "1847", note: "The foundling Heathcliff’s passion for Catherine Earnshaw and his revenge across two generations on the Yorkshire moors." },
      { title: "No Coward Soul Is Mine", year: "1850", note: "A late poem affirming an unshakable faith in an eternal inner God against fear and doubt." }
    ],
    lines: [
      { text: "Whatever our souls are made of, his and mine are the same.", work: "Wuthering Heights" }
    ],
    characters: [
      { name: "Heathcliff", work: "Wuthering Heights" },
      { name: "Catherine Earnshaw", work: "Wuthering Heights" }
    ]
  },

  {
    id: "george-eliot",
    name: "George Eliot",
    born: 1819,
    dates: "1819–1880",
    place: "England",
    group: "19th",
    tag: "Realism",
    blurb: "Intellectual giant of the Victorian novel, celebrated for psychological depth and moral seriousness.",
    facts: [
      "Pen name of Mary Ann Evans.",
      "Lived openly for over 20 years with the married critic G. H. Lewes.",
      "Translated David Strauss’s Life of Jesus into English.",
      "Worked as the de facto editor of the Westminster Review."
    ],
    works: [
      { title: "Middlemarch", year: "1871–72", note: "Interwoven lives in a provincial English town, centered on the idealistic Dorothea Brooke’s unhappy marriage." },
      { title: "Silas Marner", year: "1861", note: "A miserly weaver robbed of his gold finds new life raising an orphaned girl." },
      { title: "The Mill on the Floss", year: "1860", note: "Maggie Tulliver’s passionate nature clashes with her brother and community in a riverside town." }
    ],
    lines: [],
    characters: [
      { name: "Edward Casaubon", work: "Middlemarch" },
      { name: "Maggie Tulliver", work: "The Mill on the Floss" }
    ]
  },

  {
    id: "melville",
    name: "Herman Melville",
    born: 1819,
    dates: "1819–1891",
    place: "United States",
    group: "19th",
    tag: "Dark Romanticism",
    blurb: "American novelist whose epic of a whaling voyage, a failure in his lifetime, is now a candidate for the Great American Novel.",
    facts: [
      "Deserted a whaling ship in the Marquesas Islands in 1842.",
      "Dedicated his greatest novel to his friend and neighbor Nathaniel Hawthorne.",
      "Worked for 19 years as a customs inspector in New York.",
      "Died largely forgotten; his reputation was revived in the 1920s."
    ],
    works: [
      { title: "Moby-Dick", year: "1851", note: "Captain Ahab leads the Pequod’s crew in an obsessive hunt for the white whale that took his leg." },
      { title: "Bartleby, the Scrivener", year: "1853", note: "A Wall Street copyist begins answering every request with a polite refusal." },
      { title: "Billy Budd", year: "1924", note: "An innocent young sailor strikes and kills a false accuser and is hanged under naval law." }
    ],
    lines: [
      { text: "Call me Ishmael.", work: "Moby-Dick" },
      { text: "I would prefer not to.", work: "Bartleby, the Scrivener" }
    ],
    characters: [
      { name: "Captain Ahab", work: "Moby-Dick" },
      { name: "Queequeg", work: "Moby-Dick" }
    ]
  },

  {
    id: "whitman",
    name: "Walt Whitman",
    born: 1819,
    dates: "1819–1892",
    place: "United States",
    group: "19th",
    tag: "Transcendentalism",
    blurb: "The poet of American democracy, whose sprawling free verse broke with traditional meter and rhyme.",
    facts: [
      "Worked as a printer, teacher, and newspaper editor in Brooklyn.",
      "Self-published his first book in 1855 and kept revising and expanding it for the rest of his life.",
      "Ralph Waldo Emerson greeted his debut: “I greet you at the beginning of a great career.”",
      "Volunteered as a nurse in Washington’s military hospitals during the Civil War."
    ],
    works: [
      { title: "Leaves of Grass", year: "1855", note: "A free-verse collection celebrating the self, the body, democracy, and America." },
      { title: "O Captain! My Captain!", year: "1865", note: "An elegy for Abraham Lincoln, imagined as a sailor mourning his commander fallen dead on deck." },
      { title: "When Lilacs Last in the Dooryard Bloom’d", year: "1865", note: "A long elegy for Lincoln woven from three symbols: a star, a bird, and a flower." }
    ],
    lines: [
      { text: "I celebrate myself, and sing myself", work: "Leaves of Grass" },
      { text: "Do I contradict myself? / Very well then I contradict myself, / (I am large, I contain multitudes.)", work: "Leaves of Grass" }
    ],
    characters: []
  },

  {
    id: "dickinson",
    name: "Emily Dickinson",
    born: 1830,
    dates: "1830–1886",
    place: "United States",
    group: "19th",
    tag: "Lyric poetry",
    blurb: "Reclusive Amherst poet whose compressed, dash-filled lyrics made her one of America’s greatest poets.",
    facts: [
      "Spent most of her adult life in her family home in Amherst, Massachusetts, rarely seeing visitors.",
      "Fewer than a dozen of her nearly 1,800 poems were published in her lifetime.",
      "Her sister Lavinia discovered her hand-sewn booklets of poems after her death.",
      "Favored dashes, slant rhyme, and hymn meter, and often dressed in white."
    ],
    works: [
      { title: "Because I could not stop for Death", year: "1890", note: "A courteous gentleman caller drives the speaker by carriage past fields and toward eternity." },
      { title: "Hope is the thing with feathers", year: "1891", note: "A brief lyric depicting hope as a bird that perches in the soul and sings through every storm." },
      { title: "I heard a Fly buzz – when I died", year: "1896", note: "A deathbed scene in which a buzzing insect interrupts the expected moment of revelation." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "dostoevsky",
    name: "Fyodor Dostoevsky",
    born: 1821,
    dates: "1821–1881",
    place: "Russia",
    group: "19th",
    tag: "Realism",
    blurb: "Russian novelist of extreme psychological and spiritual crisis, a forerunner of existentialism.",
    facts: [
      "Faced a mock execution by firing squad in 1849, reprieved at the last moment.",
      "Served four years of hard labor in a Siberian prison camp.",
      "Struggled with epilepsy and compulsive gambling.",
      "Dictated a novel in 26 days to meet a deadline and married his stenographer, Anna."
    ],
    works: [
      { title: "Crime and Punishment", year: "1866", note: "An impoverished ex-student murders a pawnbroker to test his theory of the extraordinary man, then is tormented by guilt." },
      { title: "The Brothers Karamazov", year: "1880", note: "Brothers caught up in their depraved father’s murder debate faith, doubt, and free will." },
      { title: "Notes from Underground", year: "1864", note: "A bitter, isolated former civil servant rails against rationalism and recounts his humiliations." },
      { title: "The Idiot", year: "1869", note: "The saintly, epileptic Prince Myshkin returns to Russia and is undone by society’s passions." }
    ],
    lines: [
      { text: "I am a sick man.… I am a spiteful man.", work: "Notes from Underground" }
    ],
    characters: [
      { name: "Rodion Raskolnikov", work: "Crime and Punishment" },
      { name: "Sonya Marmeladova", work: "Crime and Punishment" },
      { name: "Alyosha Karamazov", work: "The Brothers Karamazov" }
    ]
  },

  {
    id: "flaubert",
    name: "Gustave Flaubert",
    born: 1821,
    dates: "1821–1880",
    place: "France",
    group: "19th",
    tag: "Realism",
    blurb: "French master of the realist novel and obsessive stylist of the perfect sentence.",
    facts: [
      "Was prosecuted for offending public morals over his first novel and acquitted in 1857.",
      "Agonized for days over single sentences in search of le mot juste.",
      "Lived most of his life at Croisset, near Rouen.",
      "Mentored the young Guy de Maupassant."
    ],
    works: [
      { title: "Madame Bovary", year: "1857", note: "A doctor’s wife in provincial Normandy, bored by marriage, seeks romance in affairs and debt, and takes arsenic." },
      { title: "Sentimental Education", year: "1869", note: "A young man’s lifelong, unconsummated love for an older married woman, set around the 1848 Revolution." }
    ],
    lines: [],
    characters: [
      { name: "Emma Bovary", work: "Madame Bovary" },
      { name: "Frédéric Moreau", work: "Sentimental Education" }
    ]
  },

  {
    id: "baudelaire",
    name: "Charles Baudelaire",
    born: 1821,
    dates: "1821–1867",
    place: "France",
    group: "19th",
    tag: "Symbolism",
    blurb: "French poet of modern urban life and decadence, a forerunner of Symbolism and modern poetry.",
    facts: [
      "Translated Edgar Allan Poe’s tales into French.",
      "Squandered his inheritance and was placed under a court-appointed financial guardian.",
      "Was fined, and six of his poems banned, for offending public morals in 1857.",
      "Died at 46 after a stroke left him partly paralyzed and unable to speak."
    ],
    works: [
      { title: "Les Fleurs du mal", year: "1857", note: "Poems of beauty, decadence, ennui, and sin in modern Paris." },
      { title: "Paris Spleen", year: "1869", note: "Prose poems capturing fleeting scenes of city life in the French capital." },
      { title: "The Painter of Modern Life", year: "1863", note: "An essay celebrating the artist who captures the fleeting beauty of the modern city." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "ibsen",
    name: "Henrik Ibsen",
    born: 1828,
    dates: "1828–1906",
    place: "Norway",
    group: "19th",
    tag: "Realism",
    blurb: "Norwegian playwright, the “father of modern drama,” whose realist plays exposed the hypocrisies of bourgeois life.",
    facts: [
      "Worked as an apothecary’s apprentice in Grimstad as a young man.",
      "Lived in self-imposed exile in Italy and Germany for 27 years.",
      "His last words were reportedly “On the contrary.”"
    ],
    works: [
      { title: "A Doll’s House", year: "1879", note: "Nora Helmer, who secretly borrowed money to save her husband’s life, walks out on her marriage." },
      { title: "Hedda Gabler", year: "1890", note: "A general’s daughter trapped in a dull marriage manipulates those around her and burns a manuscript." },
      { title: "Ghosts", year: "1881", note: "A widow’s attempt to conceal her late husband’s debauchery fails when her son reveals his inherited syphilis." },
      { title: "Peer Gynt", year: "1867", note: "A verse drama following a boastful, irresponsible Norwegian peasant’s wanderings across the world." }
    ],
    lines: [],
    characters: [
      { name: "Nora Helmer", work: "A Doll’s House" }
    ]
  },

  {
    id: "tolstoy",
    name: "Leo Tolstoy",
    born: 1828,
    dates: "1828–1910",
    place: "Russia",
    group: "19th",
    tag: "Realism",
    blurb: "Russian novelist whose two vast masterpieces are often called the greatest novels ever written.",
    facts: [
      "Served as an artillery officer at the siege of Sevastopol in the Crimean War.",
      "Was excommunicated by the Russian Orthodox Church in 1901.",
      "His ideas on nonviolent resistance influenced Gandhi.",
      "Left his estate at Yasnaya Polyana at 82 and died days later at a railway station."
    ],
    works: [
      { title: "War and Peace", year: "1869", note: "Aristocratic families live through Napoleon’s invasion of Russia: Pierre, Prince Andrei, and Natasha Rostova." },
      { title: "Anna Karenina", year: "1878", note: "A married woman’s affair with Count Vronsky leads to social ruin and suicide, set against Levin’s search for meaning." },
      { title: "The Death of Ivan Ilyich", year: "1886", note: "A judge facing a painful terminal illness realizes how hollow his conventional life has been." }
    ],
    lines: [
      { text: "Happy families are all alike; every unhappy family is unhappy in its own way.", work: "Anna Karenina" }
    ],
    characters: [
      { name: "Pierre Bezukhov", work: "War and Peace" },
      { name: "Natasha Rostova", work: "War and Peace" },
      { name: "Konstantin Levin", work: "Anna Karenina" }
    ]
  },

  {
    id: "verne",
    name: "Jules Verne",
    born: 1828,
    dates: "1828–1905",
    place: "France",
    group: "19th",
    tag: "Science fiction",
    blurb: "French pioneer of science fiction whose “extraordinary voyages” sent readers under the sea, into the earth, and around the globe.",
    facts: [
      "Born in the port city of Nantes and trained as a lawyer in Paris.",
      "Wrote nearly all his novels for the publisher Hetzel, who signed him to deliver three volumes a year.",
      "Was shot in the leg by his mentally ill nephew in 1886 and limped for the rest of his life.",
      "Is the second most-translated author in the world, behind Agatha Christie."
    ],
    works: [
      { title: "Twenty Thousand Leagues Under the Seas", year: "1870", note: "A captured professor, his servant, and a harpooner roam the oceans aboard Captain Nemo’s submarine, the Nautilus." },
      { title: "Around the World in Eighty Days", year: "1872", note: "A punctual English gentleman, Phileas Fogg, wagers that he can circle the globe on a strict deadline, with his valet Passepartout." },
      { title: "Journey to the Center of the Earth", year: "1864", note: "Professor Lidenbrock deciphers a runic message and descends through an Icelandic volcano into a prehistoric underground world." }
    ],
    lines: [],
    characters: [
      { name: "Captain Nemo", work: "Twenty Thousand Leagues Under the Seas" },
      { name: "Phileas Fogg", work: "Around the World in Eighty Days" },
      { name: "Passepartout", work: "Around the World in Eighty Days" }
    ]
  },

  {
    id: "carroll",
    name: "Lewis Carroll",
    born: 1832,
    dates: "1832–1898",
    place: "England",
    group: "19th",
    tag: "Children’s literature",
    blurb: "Oxford mathematician whose dream-logic nonsense for children became some of the most quoted books in English.",
    facts: [
      "Born Charles Lutwidge Dodgson; his pen name came from Latinizing his first two names, reversing them, and turning them back into English.",
      "Lectured in mathematics at Christ Church, Oxford, for 26 years.",
      "Was a skilled amateur photographer, taking some 3,000 pictures.",
      "Improvised his most famous story for the daughters of the dean of Christ Church on a rowing trip on 4 July 1862."
    ],
    works: [
      { title: "Alice’s Adventures in Wonderland", year: "1865", note: "A girl follows a White Rabbit down a hole and meets the Mad Hatter, the Cheshire Cat, and the Queen of Hearts." },
      { title: "Through the Looking-Glass", year: "1871", note: "A girl climbs into a mirror and crosses a land laid out like a chessboard, meeting Tweedledum, Tweedledee, and Humpty Dumpty." },
      { title: "The Hunting of the Snark", year: "1876", note: "A nonsense poem in eight “fits” about a crew led by the Bellman pursuing an elusive creature that may prove to be a Boojum." }
    ],
    lines: [
      { text: "“Curiouser and curiouser!” cried Alice.", work: "Alice’s Adventures in Wonderland" },
      { text: "’Twas brillig, and the slithy toves / Did gyre and gimble in the wabe …", work: "Through the Looking-Glass" }
    ],
    characters: [
      { name: "The Cheshire Cat", work: "Alice’s Adventures in Wonderland" },
      { name: "The Mad Hatter", work: "Alice’s Adventures in Wonderland" },
      { name: "Humpty Dumpty", work: "Through the Looking-Glass" }
    ]
  },

  {
    id: "machado-de-assis",
    name: "Machado de Assis",
    born: 1839,
    dates: "1839–1908",
    place: "Brazil",
    group: "19th",
    tag: "Realism",
    blurb: "Brazil’s greatest writer, an ironic, playful realist far ahead of his time.",
    facts: [
      "Grandson of freed slaves, born on a hillside estate in Rio de Janeiro.",
      "Largely self-taught; worked as a typesetter and later as a civil servant.",
      "Was the founding president of the Brazilian Academy of Letters.",
      "Suffered from epilepsy and a stammer."
    ],
    works: [
      { title: "The Posthumous Memoirs of Brás Cubas", year: "1881", note: "A dead man narrates his own unremarkable life with ironic wit from beyond the grave." },
      { title: "Dom Casmurro", year: "1899", note: "An embittered lawyer recounts his jealous suspicion that his wife, Capitu, betrayed him with his best friend." }
    ],
    lines: [],
    characters: [
      { name: "Capitu", work: "Dom Casmurro" }
    ]
  },

  {
    id: "twain",
    name: "Mark Twain",
    born: 1835,
    dates: "1835–1910",
    place: "United States",
    group: "19th",
    tag: "Realism",
    blurb: "American humorist and novelist whose vernacular voice, Hemingway said, began all modern American literature.",
    facts: [
      "Born Samuel Langhorne Clemens in Missouri.",
      "Took his pen name from a riverboat call meaning two fathoms deep.",
      "Worked as a Mississippi steamboat pilot before the Civil War.",
      "Was born during an appearance of Halley’s Comet and died the day after its next return in 1910."
    ],
    works: [
      { title: "Adventures of Huckleberry Finn", year: "1884", note: "A runaway boy and an escaped enslaved man, Jim, travel down the Mississippi River on a raft." },
      { title: "The Adventures of Tom Sawyer", year: "1876", note: "A mischievous boy in a Missouri river town witnesses a murder and finds buried treasure." },
      { title: "A Connecticut Yankee in King Arthur’s Court", year: "1889", note: "A 19th-century factory superintendent wakes up in Camelot and tries to modernize medieval England." }
    ],
    lines: [
      { text: "All right, then, I’ll go to hell.", work: "Adventures of Huckleberry Finn" }
    ],
    characters: [
      { name: "Jim", work: "Adventures of Huckleberry Finn" },
      { name: "Becky Thatcher", work: "The Adventures of Tom Sawyer" }
    ]
  },

  {
    id: "zola",
    name: "Émile Zola",
    born: 1840,
    dates: "1840–1902",
    place: "France",
    group: "19th",
    tag: "Naturalism",
    blurb: "Leader of French Naturalism, who also became the conscience of France in the Dreyfus affair.",
    facts: [
      "Childhood friend of the painter Paul Cézanne.",
      "Worked in the advertising department of the publisher Hachette.",
      "Fled to England after being convicted of libel for defending Alfred Dreyfus.",
      "Died of carbon monoxide poisoning from a blocked chimney, possibly murder."
    ],
    works: [
      { title: "Germinal", year: "1885", note: "Coal miners in northern France strike against brutal conditions, led by the newcomer Étienne Lantier." },
      { title: "Thérèse Raquin", year: "1867", note: "A woman and her lover drown her sickly husband and are destroyed by guilt." },
      { title: "J’accuse…!", year: "1898", note: "An open letter to the French president accusing the army of covering up the framing of a Jewish officer." }
    ],
    lines: [],
    characters: [
      { name: "Étienne Lantier", work: "Germinal" }
    ]
  },

  {
    id: "hardy",
    name: "Thomas Hardy",
    born: 1840,
    dates: "1840–1928",
    place: "England",
    group: "19th",
    tag: "Victorian novel",
    blurb: "Novelist and poet of rural England, whose characters struggle against fate and social convention.",
    facts: [
      "Trained and worked as an architect before turning to writing.",
      "Set his novels in “Wessex,” a semi-fictional version of southwest England.",
      "Gave up novels for poetry after the hostile reception of his last novel in 1895.",
      "His heart was buried at Stinsford with his first wife, and his ashes in Westminster Abbey."
    ],
    works: [
      { title: "Tess of the d’Urbervilles", year: "1891", note: "A poor dairymaid, seduced by a wealthy man, is rejected by her husband and driven to murder." },
      { title: "Far from the Madding Crowd", year: "1874", note: "The independent farmer Bathsheba Everdene is courted by three very different men." },
      { title: "Jude the Obscure", year: "1895", note: "A stonemason’s dreams of a university education and a life with his cousin end in tragedy." }
    ],
    lines: [],
    characters: [
      { name: "Angel Clare", work: "Tess of the d’Urbervilles" },
      { name: "Gabriel Oak", work: "Far from the Madding Crowd" }
    ]
  },

  {
    id: "henry-james",
    name: "Henry James",
    born: 1843,
    dates: "1843–1916",
    place: "United States",
    group: "19th",
    tag: "Realism",
    blurb: "American-born master of the psychological novel, chronicler of Americans abroad and the clash of innocence and experience.",
    facts: [
      "His older brother was a pioneering American psychologist and pragmatist philosopher.",
      "Settled in England, making his home from 1897 at Lamb House in Rye.",
      "Dictated his late novels to a typist.",
      "Became a British subject in 1915 in protest at American neutrality in World War I."
    ],
    works: [
      { title: "The Portrait of a Lady", year: "1881", note: "A spirited American heiress in Europe makes a disastrous marriage to a manipulative expatriate." },
      { title: "The Turn of the Screw", year: "1898", note: "A governess at an English country house becomes convinced that two children are haunted by ghosts." },
      { title: "Daisy Miller", year: "1878", note: "A flirtatious young American woman in Europe defies social conventions with fatal results." }
    ],
    lines: [],
    characters: [
      { name: "Isabel Archer", work: "The Portrait of a Lady" },
      { name: "Gilbert Osmond", work: "The Portrait of a Lady" }
    ]
  },

  {
    id: "stevenson",
    name: "Robert Louis Stevenson",
    born: 1850,
    dates: "1850–1894",
    place: "Scotland",
    group: "19th",
    tag: "Adventure fiction",
    blurb: "Scottish novelist, poet, and travel writer, master of the adventure story and the tale of the double self.",
    facts: [
      "Came from a famous Edinburgh family of lighthouse engineers, and qualified as a lawyer but never practiced.",
      "Began his pirate novel with a map he drew to amuse his young stepson.",
      "Spent his last years at Vailima in Samoa, where islanders called him Tusitala, “teller of tales.”",
      "Died suddenly at 44, probably of a brain hemorrhage."
    ],
    works: [
      { title: "Treasure Island", year: "1883", note: "Young Jim Hawkins sails in search of Captain Flint’s buried gold and falls in with the one-legged cook Long John Silver." },
      { title: "Strange Case of Dr Jekyll and Mr Hyde", year: "1886", note: "A London lawyer investigates the link between a respected doctor and a murderous brute, who prove to be the same man." },
      { title: "Kidnapped", year: "1886", note: "Betrayed by his miserly uncle and shipped off to be sold in the Carolinas, young David Balfour flees across the Highlands with the Jacobite Alan Breck." }
    ],
    lines: [
      { text: "Fifteen men on the dead man’s chest— / Yo-ho-ho, and a bottle of rum!", work: "Treasure Island" }
    ],
    characters: [
      { name: "Long John Silver", work: "Treasure Island" },
      { name: "Jim Hawkins", work: "Treasure Island" },
      { name: "Alan Breck Stewart", work: "Kidnapped" }
    ]
  },

  {
    id: "maupassant",
    name: "Guy de Maupassant",
    born: 1850,
    dates: "1850–1893",
    place: "France",
    group: "19th",
    tag: "Naturalism",
    blurb: "French master of the short story, famous for ironic twist endings and unsparing portraits of bourgeois hypocrisy.",
    facts: [
      "Was mentored by Gustave Flaubert, a friend of his mother’s.",
      "Fought in the Franco-Prussian War and then worked for a decade as a government clerk in Paris.",
      "Wrote about 300 short stories in little more than a decade.",
      "Died at 42 in a Paris asylum, after syphilis had driven him to attempt suicide."
    ],
    works: [
      { title: "Boule de Suif", year: "1880", note: "A prostitute fleeing the Prussian occupation by coach with respectable passengers is pressured to sleep with an officer for their sake, then scorned." },
      { title: "The Necklace", year: "1884", note: "A clerk’s wife loses a borrowed piece of diamond jewelry and spends ten years repaying a replacement, only to learn the original was fake." },
      { title: "Bel-Ami", year: "1885", note: "A handsome, unscrupulous former soldier climbs to the top of Parisian journalism and society by seducing influential women." }
    ],
    lines: [],
    characters: [
      { name: "Mathilde Loisel", work: "The Necklace" },
      { name: "Georges Duroy", work: "Bel-Ami" }
    ]
  },

  {
    id: "wilde",
    name: "Oscar Wilde",
    born: 1854,
    dates: "1854–1900",
    place: "Ireland",
    group: "19th",
    tag: "Aestheticism",
    blurb: "Irish wit, playwright, and apostle of Aestheticism, whose fame ended in scandal and prison.",
    facts: [
      "Won the Newdigate Prize for poetry at Oxford.",
      "Reportedly told New York customs, “I have nothing to declare except my genius.”",
      "Was sentenced to two years’ hard labor for “gross indecency” after a failed libel suit against the Marquess of Queensberry.",
      "Died in exile in a Paris hotel at 46."
    ],
    works: [
      { title: "The Picture of Dorian Gray", year: "1890", note: "A beautiful young man stays youthful while his portrait ages and records his sins." },
      { title: "The Importance of Being Earnest", year: "1895", note: "Two young gentlemen invent alter egos to escape social obligations, leading to romantic confusion." },
      { title: "The Ballad of Reading Gaol", year: "1898", note: "A poem on prison life and the execution of a trooper who killed his wife." }
    ],
    lines: [
      { text: "The only way to get rid of a temptation is to yield to it.", work: "The Picture of Dorian Gray" },
      { text: "The truth is rarely pure and never simple.", work: "The Importance of Being Earnest" }
    ],
    characters: [
      { name: "Lord Henry Wotton", work: "The Picture of Dorian Gray" },
      { name: "Lady Bracknell", work: "The Importance of Being Earnest" }
    ]
  },

  {
    id: "conan-doyle",
    name: "Arthur Conan Doyle",
    born: 1859,
    dates: "1859–1930",
    place: "Scotland",
    group: "19th",
    tag: "Detective fiction",
    blurb: "Scottish doctor turned writer who created the most famous detective in literature.",
    facts: [
      "Trained in medicine at Edinburgh, where his teacher Joseph Bell inspired his detective’s powers of deduction.",
      "Served as a ship’s doctor on an Arctic whaler before setting up a practice in Southsea.",
      "Killed off his hero at the Reichenbach Falls in 1893, then brought him back after public outcry.",
      "Became a fervent spiritualist and publicly defended the faked Cottingley Fairies photographs."
    ],
    works: [
      { title: "A Study in Scarlet", year: "1887", note: "A consulting detective and an army doctor wounded in Afghanistan meet and share lodgings in Baker Street, then solve a murder rooted in Mormon Utah." },
      { title: "The Hound of the Baskervilles", year: "1902", note: "A detective investigates a family curse and a spectral beast said to haunt an estate on Dartmoor." },
      { title: "The Lost World", year: "1912", note: "The irascible Professor Challenger leads an expedition to a South American plateau where dinosaurs still survive." }
    ],
    lines: [
      { text: "“You have been in Afghanistan, I perceive.”", work: "A Study in Scarlet" }
    ],
    characters: [
      { name: "Sherlock Holmes", work: "A Study in Scarlet" },
      { name: "Dr. John Watson", work: "A Study in Scarlet" },
      { name: "Professor Challenger", work: "The Lost World" }
    ]
  },

  {
    id: "chekhov",
    name: "Anton Chekhov",
    born: 1860,
    dates: "1860–1904",
    place: "Russia",
    group: "19th",
    tag: "Realism",
    blurb: "Russian master of the short story and the subtle, understated modern play.",
    facts: [
      "Practiced medicine, calling it his lawful wife and literature his mistress.",
      "Traveled to the penal colony on Sakhalin Island in 1890 to document conditions.",
      "Married the actress Olga Knipper of the Moscow Art Theatre.",
      "Died of tuberculosis at a German spa after drinking a glass of champagne."
    ],
    works: [
      { title: "The Cherry Orchard", year: "1904", note: "An aristocratic family, unable to face reality, loses its estate to the son of a former serf." },
      { title: "The Seagull", year: "1896", note: "Aspiring artists and their elders at a country estate wrestle with love, fame, and failure." },
      { title: "Three Sisters", year: "1901", note: "Siblings stuck in a provincial garrison town long in vain to return to Moscow." },
      { title: "Uncle Vanya", year: "1897", note: "A weary estate manager realizes he has wasted his life serving a pompous professor." }
    ],
    lines: [],
    characters: [
      { name: "Lopakhin", work: "The Cherry Orchard" },
      { name: "Konstantin Treplev", work: "The Seagull" }
    ]
  },

  /* ───────────────────────── Modernism, c. 1900–1945 ───────────────────────── */

  {
    id: "conrad",
    name: "Joseph Conrad",
    born: 1857,
    dates: "1857–1924",
    place: "England",
    group: "modern",
    tag: "Modernism",
    blurb: "Polish-born English novelist of the sea and empire, a bridge between Victorian fiction and Modernism.",
    facts: [
      "Born to Polish parents in Berdychiv, in today’s Ukraine.",
      "Did not learn English fluently until his twenties, yet became a master English prose stylist.",
      "Spent about 20 years as a merchant sailor, rising to captain.",
      "Commanded a river steamer in the Congo Free State in 1890."
    ],
    works: [
      { title: "Heart of Darkness", year: "1899", note: "Marlow travels up the Congo River in search of the ivory trader Kurtz, who has abandoned all restraint." },
      { title: "Lord Jim", year: "1900", note: "A young officer who abandons a pilgrim ship seeks redemption in a remote Malay settlement." },
      { title: "Nostromo", year: "1904", note: "Revolution and silver mining in the fictional South American republic of Costaguana." },
      { title: "The Secret Agent", year: "1907", note: "An anarchist plot to bomb the Greenwich Observatory in London goes tragically wrong." }
    ],
    lines: [
      { text: "The horror! The horror!", work: "Heart of Darkness" }
    ],
    characters: [
      { name: "Kurtz", work: "Heart of Darkness" },
      { name: "Marlow", work: "Heart of Darkness" }
    ]
  },

  {
    id: "yeats",
    name: "W. B. Yeats",
    born: 1865,
    dates: "1865–1939",
    place: "Ireland",
    group: "modern",
    tag: "Modernism",
    blurb: "Irish poet and dramatist, leader of the Irish Literary Revival and one of the greatest poets of the 20th century.",
    facts: [
      "Co-founded Dublin’s Abbey Theatre with Lady Gregory.",
      "Proposed repeatedly to the revolutionary Maud Gonne, who refused him.",
      "Won the Nobel Prize in Literature in 1923.",
      "Served as a senator of the Irish Free State."
    ],
    works: [
      { title: "The Second Coming", year: "1920", note: "An apocalyptic poem written after World War I, imagining a rough beast slouching toward Bethlehem." },
      { title: "Sailing to Byzantium", year: "1928", note: "An aging speaker seeks escape from the decaying body into the timeless artifice of art." },
      { title: "Easter, 1916", year: "1920", note: "A meditation on the executed leaders of the Dublin Rising, concluding “A terrible beauty is born.”" }
    ],
    lines: [
      { text: "Turning and turning in the widening gyre / The falcon cannot hear the falconer", work: "The Second Coming" }
    ],
    characters: []
  },

  {
    id: "tagore",
    name: "Rabindranath Tagore",
    born: 1861,
    dates: "1861–1941",
    place: "India",
    group: "modern",
    tag: "Bengal Renaissance",
    blurb: "Bengali poet, novelist, composer, and educator who reshaped Indian literature and music.",
    facts: [
      "In 1913 became the first non-European to win the Nobel Prize in Literature.",
      "Wrote the national anthems of both India and Bangladesh.",
      "Founded Visva-Bharati University at Santiniketan.",
      "Renounced his British knighthood after the 1919 Amritsar massacre."
    ],
    works: [
      { title: "Gitanjali", year: "1910", note: "Devotional song-poems; the poet’s own 1912 English prose translations won worldwide fame." },
      { title: "The Home and the World", year: "1916", note: "A wife is torn between her liberal husband and a charismatic nationalist during the Swadeshi movement." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "wharton",
    name: "Edith Wharton",
    born: 1862,
    dates: "1862–1937",
    place: "United States",
    group: "modern",
    tag: "Novel of manners",
    blurb: "American novelist who anatomized the rigid codes of old New York society from the inside.",
    facts: [
      "Born into a wealthy, old New York family in Manhattan.",
      "Co-wrote a book on interior design, The Decoration of Houses, and designed her own estate, The Mount, in Lenox, Massachusetts.",
      "Was made a Chevalier of the Legion of Honour for her refugee relief work in France during World War I.",
      "In 1921 became the first woman to win the Pulitzer Prize for Fiction."
    ],
    works: [
      { title: "The House of Mirth", year: "1905", note: "Lily Bart, a beautiful but penniless New York socialite, slides down the social ladder while seeking a rich husband." },
      { title: "Ethan Frome", year: "1911", note: "A poor New England farmer falls for his sickly wife’s cousin, and their sledding ride ends in disaster." },
      { title: "The Age of Innocence", year: "1920", note: "In 1870s New York, a lawyer engaged to May Welland falls for her unconventional cousin, Countess Ellen Olenska." }
    ],
    lines: [],
    characters: [
      { name: "Lily Bart", work: "The House of Mirth" },
      { name: "Newland Archer", work: "The Age of Innocence" },
      { name: "Ellen Olenska", work: "The Age of Innocence" }
    ]
  },

  {
    id: "akutagawa",
    name: "Ryūnosuke Akutagawa",
    born: 1892,
    dates: "1892–1927",
    place: "Japan",
    group: "modern",
    tag: "Modernism",
    blurb: "Father of the Japanese short story, who reworked old tales into sharp modern studies of human nature.",
    facts: [
      "Studied English literature at Tokyo Imperial University.",
      "Was a protégé of the novelist Natsume Sōseki.",
      "Died by suicide at 35, citing a “vague unease” about the future.",
      "Japan’s most prestigious prize for new writers is named after him."
    ],
    works: [
      { title: "Rashōmon", year: "1915", note: "A servant sheltering at a ruined Kyoto city gate decides to rob an old woman who is stealing hair from corpses." },
      { title: "In a Grove", year: "1922", note: "Conflicting testimonies, including a dead man speaking through a medium, describe a samurai’s killing in the woods." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "proust",
    name: "Marcel Proust",
    born: 1871,
    dates: "1871–1922",
    place: "France",
    group: "modern",
    tag: "Modernism",
    blurb: "French novelist whose vast novel of memory, time, and society is a summit of modern fiction.",
    facts: [
      "Suffered from severe asthma from childhood.",
      "Fought a pistol duel in 1897 with a critic who hinted at his homosexuality.",
      "Wrote in a cork-lined bedroom to shut out noise.",
      "Won the Prix Goncourt in 1919."
    ],
    works: [
      { title: "In Search of Lost Time", year: "1913–27", note: "A seven-volume novel of memory, love, jealousy, art, and Parisian society, set off by a cake dipped in tea." },
      { title: "Pleasures and Days", year: "1896", note: "An early collection of stories, prose poems, and sketches of fashionable society." }
    ],
    lines: [
      { text: "For a long time I used to go to bed early.", work: "In Search of Lost Time" }
    ],
    characters: [
      { name: "Charles Swann", work: "In Search of Lost Time" },
      { name: "Baron de Charlus", work: "In Search of Lost Time" }
    ]
  },

  {
    id: "mann",
    name: "Thomas Mann",
    born: 1875,
    dates: "1875–1955",
    place: "Germany",
    group: "modern",
    tag: "Modernism",
    blurb: "The great German novelist of the 20th century, exploring art, decadence, and bourgeois society.",
    facts: [
      "Won the Nobel Prize in Literature in 1929.",
      "His wife’s stay at a Davos sanatorium inspired his greatest novel.",
      "Fled Nazi Germany and became a U.S. citizen, living in Princeton and Los Angeles.",
      "Broadcast anti-Nazi speeches to Germany over the BBC during World War II."
    ],
    works: [
      { title: "The Magic Mountain", year: "1924", note: "A young engineer visits his cousin at a Swiss sanatorium and stays for seven years before World War I." },
      { title: "Buddenbrooks", year: "1901", note: "Four generations of a Lübeck merchant family decline in fortune and vitality." },
      { title: "Death in Venice", year: "1912", note: "An aging writer becomes obsessed with a beautiful boy while cholera spreads through an Italian city." }
    ],
    lines: [],
    characters: [
      { name: "Hans Castorp", work: "The Magic Mountain" },
      { name: "Gustav von Aschenbach", work: "Death in Venice" }
    ]
  },

  {
    id: "rilke",
    name: "Rainer Maria Rilke",
    born: 1875,
    dates: "1875–1926",
    place: "Austria",
    group: "modern",
    tag: "Modernism",
    blurb: "German-language lyric poet of intense spiritual inwardness, among the most influential modern poets.",
    facts: [
      "Born in Prague, then part of Austria-Hungary.",
      "Worked as secretary to the sculptor Auguste Rodin in Paris.",
      "Wrote much of his late poetry at the Château de Muzot in Switzerland.",
      "Legend links his fatal illness, leukemia, to pricking his finger on a rose thorn."
    ],
    works: [
      { title: "Duino Elegies", year: "1923", note: "Ten elegies on angels, mortality, and human existence, begun at a castle on the Adriatic." },
      { title: "Sonnets to Orpheus", year: "1923", note: "Fifty-five poems written in a burst of inspiration as a memorial to a young dancer." },
      { title: "Letters to a Young Poet", year: "1929", note: "Ten letters of advice to an aspiring writer on solitude, love, and art." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "pirandello",
    name: "Luigi Pirandello",
    born: 1867,
    dates: "1867–1936",
    place: "Italy",
    group: "modern",
    tag: "Modernism",
    blurb: "Sicilian dramatist and novelist whose plays about illusion and identity transformed modern theater.",
    facts: [
      "Born in Sicily, near Agrigento.",
      "His wife’s mental illness, after the family’s sulfur mine flooded, shaped his themes of madness and identity.",
      "Joined the Fascist Party in 1924.",
      "Won the Nobel Prize in Literature in 1934."
    ],
    works: [
      { title: "Six Characters in Search of an Author", year: "1921", note: "Unfinished characters interrupt a rehearsal and demand that the director stage their family drama." },
      { title: "Henry IV", year: "1922", note: "A man who believes he is a medieval German emperor after a fall from his horse may be feigning madness." },
      { title: "The Late Mattia Pascal", year: "1904", note: "A man wrongly reported dead seizes the chance to start a new identity, then finds he cannot live without one." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "cather",
    name: "Willa Cather",
    born: 1873,
    dates: "1873–1947",
    place: "United States",
    group: "modern",
    tag: "Realism",
    blurb: "American novelist of the Great Plains, celebrating immigrant pioneers and the land they settled.",
    facts: [
      "Born in Virginia, she moved with her family to Nebraska at age nine, settling in the town of Red Cloud.",
      "Worked as an editor at McClure’s Magazine in New York before writing full-time.",
      "Won the Pulitzer Prize in 1923 for One of Ours, a novel of World War I."
    ],
    works: [
      { title: "O Pioneers!", year: "1913", note: "Alexandra Bergson, daughter of Swedish immigrants, makes her family’s Nebraska farm prosper against hardship and tragedy." },
      { title: "My Ántonia", year: "1918", note: "A New York lawyer recalls growing up on the Nebraska prairie alongside a spirited Bohemian immigrant girl." },
      { title: "Death Comes for the Archbishop", year: "1927", note: "A French priest, Jean Marie Latour, and his friend Father Vaillant spend their lives building the Catholic Church in New Mexico." }
    ],
    lines: [],
    characters: [
      { name: "Ántonia Shimerda", work: "My Ántonia" },
      { name: "Jim Burden", work: "My Ántonia" },
      { name: "Alexandra Bergson", work: "O Pioneers!" }
    ]
  },

  {
    id: "hesse",
    name: "Hermann Hesse",
    born: 1877,
    dates: "1877–1962",
    place: "Germany",
    group: "modern",
    tag: "Modernism",
    blurb: "German-born Swiss novelist of spiritual quest and self-discovery, rediscovered by the 1960s counterculture.",
    facts: [
      "His mother was born at a Protestant mission in India, where her parents served.",
      "Ran away from the Maulbronn seminary as a teenager.",
      "Underwent psychoanalysis with a follower of Carl Jung, and later met Jung himself.",
      "Settled in Montagnola, Switzerland, became a Swiss citizen, and won the Nobel Prize in Literature in 1946."
    ],
    works: [
      { title: "Siddhartha", year: "1922", note: "In the time of the Buddha, a Brahmin’s son leaves home in search of enlightenment and finds it as a ferryman on a river." },
      { title: "Steppenwolf", year: "1927", note: "A lonely, middle-aged intellectual, Harry Haller, torn between his human and bestial natures, is drawn into a nightlife of jazz and a Magic Theater." },
      { title: "The Glass Bead Game", year: "1943", note: "In a future province of scholars called Castalia, Joseph Knecht rises to master an abstract pastime that synthesizes all knowledge." }
    ],
    lines: [],
    characters: [
      { name: "Harry Haller", work: "Steppenwolf" },
      { name: "Hermine", work: "Steppenwolf" },
      { name: "Joseph Knecht", work: "The Glass Bead Game" }
    ]
  },

  {
    id: "forster",
    name: "E. M. Forster",
    born: 1879,
    dates: "1879–1970",
    place: "England",
    group: "modern",
    tag: "Modernism",
    blurb: "English novelist of class, empire, and personal connection, associated with the Bloomsbury Group.",
    facts: [
      "A fellow of King’s College, Cambridge, and an associate of the Bloomsbury Group.",
      "Served as private secretary to the Maharaja of Dewas.",
      "Published no new novels after 1924, though he lived another 46 years.",
      "His novel of a gay romance, written in 1913–14, was published only after his death."
    ],
    works: [
      { title: "A Passage to India", year: "1924", note: "An accusation of assault in the Marabar Caves exposes the tensions of British colonial rule." },
      { title: "Howards End", year: "1910", note: "Two idealistic sisters, a wealthy businessman’s family, and a struggling clerk clash over class and a country house." },
      { title: "A Room with a View", year: "1908", note: "A young Englishwoman in Florence chooses between conventional respectability and passion." }
    ],
    lines: [
      { text: "Only connect!", work: "Howards End" }
    ],
    characters: [
      { name: "Dr. Aziz", work: "A Passage to India" },
      { name: "Adela Quested", work: "A Passage to India" },
      { name: "Lucy Honeychurch", work: "A Room with a View" }
    ]
  },

  {
    id: "joyce",
    name: "James Joyce",
    born: 1882,
    dates: "1882–1941",
    place: "Ireland",
    group: "modern",
    tag: "Modernism",
    blurb: "Irish novelist whose stream-of-consciousness experiments made him the central figure of literary Modernism.",
    facts: [
      "Left Ireland in 1904 with Nora Barnacle and lived mostly in Trieste, Zurich, and Paris.",
      "Suffered from severe eye problems and underwent many operations.",
      "His daughter Lucia was treated by the psychiatrist Carl Jung.",
      "Fans celebrate “Bloomsday” every June 16, the date of his first outing with Nora."
    ],
    works: [
      { title: "Ulysses", year: "1922", note: "A single day in Dublin, June 16, 1904, following Leopold Bloom and Stephen Dedalus, paralleling Homer’s epic." },
      { title: "Dubliners", year: "1914", note: "Fifteen stories of paralysis and epiphany among the lower-middle class of Ireland’s capital." },
      { title: "A Portrait of the Artist as a Young Man", year: "1916", note: "Stephen Dedalus grows up in Catholic Ireland and resolves to become a writer in exile." },
      { title: "Finnegans Wake", year: "1939", note: "An experimental dream-night novel of puns and portmanteau words, built on a cyclical theory of history." }
    ],
    lines: [
      { text: "Stately, plump Buck Mulligan came from the stairhead, bearing a bowl of lather on which a mirror and a razor lay crossed.", work: "Ulysses" }
    ],
    characters: [
      { name: "Molly Bloom", work: "Ulysses" },
      { name: "Leopold Bloom", work: "Ulysses" },
      { name: "Stephen Dedalus", work: "A Portrait of the Artist as a Young Man" }
    ]
  },

  {
    id: "woolf",
    name: "Virginia Woolf",
    born: 1882,
    dates: "1882–1941",
    place: "England",
    group: "modern",
    tag: "Modernism",
    blurb: "English Modernist novelist and essayist, a pioneer of stream of consciousness and of feminist criticism.",
    facts: [
      "Daughter of the critic Leslie Stephen, first editor of the Dictionary of National Biography.",
      "Her sister was the painter Vanessa Bell, a fellow member of the Bloomsbury Group.",
      "Founded the Hogarth Press with her husband, Leonard.",
      "Drowned herself in the River Ouse in 1941, her pockets weighted with stones."
    ],
    works: [
      { title: "Mrs. Dalloway", year: "1925", note: "A single June day in London as a society hostess prepares for a party and a shell-shocked veteran unravels." },
      { title: "To the Lighthouse", year: "1927", note: "The Ramsay family’s summers on the Isle of Skye, before and after World War I and the mother’s death." },
      { title: "Orlando", year: "1928", note: "A poet lives for over three centuries and changes from a man into a woman." },
      { title: "A Room of One’s Own", year: "1929", note: "An extended essay, from lectures at Cambridge women’s colleges, on women, fiction, and Shakespeare’s imagined sister." }
    ],
    lines: [
      { text: "“Yes, of course, if it’s fine tomorrow,” said Mrs. Ramsay.", work: "To the Lighthouse" },
      { text: "A woman must have money and a room of her own if she is to write fiction.", work: "A Room of One’s Own" }
    ],
    characters: [
      { name: "Clarissa Dalloway", work: "Mrs. Dalloway" },
      { name: "Septimus Warren Smith", work: "Mrs. Dalloway" },
      { name: "Lily Briscoe", work: "To the Lighthouse" }
    ]
  },

  {
    id: "kafka",
    name: "Franz Kafka",
    born: 1883,
    dates: "1883–1924",
    place: "Czechia",
    group: "modern",
    tag: "Modernism",
    blurb: "German-language writer from Prague whose nightmarish tales of alienation and bureaucracy define modern anxiety.",
    facts: [
      "Worked for years as a lawyer at a workers’ accident insurance institute in Prague.",
      "Wrote a long letter to his domineering father that was never delivered.",
      "Asked his friend Max Brod to burn his manuscripts after his death; Brod refused.",
      "Died of tuberculosis at a sanatorium near Vienna at 40."
    ],
    works: [
      { title: "The Metamorphosis", year: "1915", note: "A traveling salesman wakes up as a monstrous insect and becomes a burden to his family." },
      { title: "The Trial", year: "1925", note: "A bank officer is arrested and prosecuted by a remote, inaccessible court without ever learning his crime." },
      { title: "The Castle", year: "1926", note: "A land surveyor struggles in vain to gain access to the mysterious authorities governing a village." }
    ],
    lines: [
      { text: "As Gregor Samsa awoke one morning from uneasy dreams he found himself transformed in his bed into a gigantic insect.", work: "The Metamorphosis" }
    ],
    characters: [
      { name: "Gregor Samsa", work: "The Metamorphosis" },
      { name: "Josef K.", work: "The Trial" }
    ]
  },

  {
    id: "ts-eliot",
    name: "T. S. Eliot",
    born: 1888,
    dates: "1888–1965",
    place: "England",
    group: "modern",
    tag: "Modernism",
    blurb: "American-born British poet and critic whose fragmented poems defined Modernist poetry.",
    facts: [
      "Born in St. Louis, Missouri; became a British subject in 1927.",
      "Worked for years as a clerk at Lloyds Bank in London.",
      "Won the Nobel Prize in Literature in 1948.",
      "His book of whimsical cat poems became the basis of a hit stage musical."
    ],
    works: [
      { title: "The Waste Land", year: "1922", note: "A fragmented poem in five parts depicting spiritual desolation in postwar Europe." },
      { title: "The Love Song of J. Alfred Prufrock", year: "1915", note: "A timid, aging man contemplates asking an overwhelming question at a genteel social gathering." },
      { title: "Four Quartets", year: "1943", note: "Four long meditative poems on time, memory, and the divine." },
      { title: "Murder in the Cathedral", year: "1935", note: "A verse drama on the assassination of Archbishop Thomas Becket in 1170." }
    ],
    lines: [
      { text: "April is the cruellest month, breeding / Lilacs out of the dead land", work: "The Waste Land" },
      { text: "Let us go then, you and I, / When the evening is spread out against the sky", work: "The Love Song of J. Alfred Prufrock" }
    ],
    characters: []
  },

  {
    id: "lu-xun",
    name: "Lu Xun",
    born: 1881,
    dates: "1881–1936",
    place: "China",
    group: "modern",
    tag: "May Fourth Movement",
    blurb: "Founder of modern Chinese literature, whose vernacular stories attacked the traditions he blamed for China’s weakness.",
    facts: [
      "Pen name of Zhou Shuren.",
      "Abandoned medical studies in Japan after seeing a slide of a Chinese man executed as onlookers watched passively.",
      "Wrote the first major short story in modern vernacular Chinese."
    ],
    works: [
      { title: "A Madman’s Diary", year: "1918", note: "A man convinced his neighbors and family are cannibals exposes the hypocrisy of Confucian tradition." },
      { title: "The True Story of Ah Q", year: "1921", note: "A village laborer who turns every humiliation into imagined victory satirizes the national character." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "dh-lawrence",
    name: "D. H. Lawrence",
    born: 1885,
    dates: "1885–1930",
    place: "England",
    group: "modern",
    tag: "Modernism",
    blurb: "English novelist, poet, and coal miner’s son who wrote frankly of sexuality, instinct, and the damage of industrial life.",
    facts: [
      "Grew up in the mining town of Eastwood, Nottinghamshire, the son of a barely literate miner.",
      "Eloped with Frieda Weekley, the German wife of his former professor, in 1912.",
      "Was expelled from Cornwall in 1917 on suspicion of signaling to German submarines.",
      "Died of tuberculosis in Vence, France, at 44, after years of wandering he called his “savage pilgrimage.”"
    ],
    works: [
      { title: "Sons and Lovers", year: "1913", note: "Paul Morel, a miner’s artistic son, is torn between his possessive mother and the women in his life." },
      { title: "Women in Love", year: "1920", note: "The Brangwen sisters, Ursula and Gudrun, enter turbulent relationships with Rupert Birkin and the mine owner Gerald Crich." },
      { title: "Lady Chatterley’s Lover", year: "1928", note: "A baronet’s wife, married to a paralyzed war veteran, begins an affair with his gamekeeper; its 1960 British edition led to a famous obscenity trial." }
    ],
    lines: [
      { text: "Ours is essentially a tragic age, so we refuse to take it tragically.", work: "Lady Chatterley’s Lover" }
    ],
    characters: [
      { name: "Paul Morel", work: "Sons and Lovers" },
      { name: "Ursula Brangwen", work: "Women in Love" },
      { name: "Oliver Mellors", work: "Lady Chatterley’s Lover" }
    ]
  },

  {
    id: "hemingway",
    name: "Ernest Hemingway",
    born: 1899,
    dates: "1899–1961",
    place: "United States",
    group: "modern",
    tag: "Lost Generation",
    blurb: "American novelist whose spare, understated prose changed the way fiction is written.",
    facts: [
      "Drove an ambulance for the Red Cross in Italy in World War I and was badly wounded.",
      "Developed the “iceberg theory” of leaving most of a story’s meaning beneath the surface.",
      "Survived two plane crashes in Africa on consecutive days in 1954.",
      "Won the Nobel Prize in Literature in 1954."
    ],
    works: [
      { title: "The Sun Also Rises", year: "1926", note: "Disillusioned expatriates travel from Paris to the bullfights at the festival in Pamplona." },
      { title: "A Farewell to Arms", year: "1929", note: "An American ambulance driver in Italy in World War I falls in love with an English nurse." },
      { title: "For Whom the Bell Tolls", year: "1940", note: "An American fighting with Republican guerrillas in the Spanish Civil War is ordered to blow up a bridge." },
      { title: "The Old Man and the Sea", year: "1952", note: "An aging Cuban fisherman battles a giant marlin for days far out in the Gulf Stream." }
    ],
    lines: [
      { text: "In the late summer of that year we lived in a house in a village that looked across the river and the plain to the mountains.", work: "A Farewell to Arms" }
    ],
    characters: [
      { name: "Jake Barnes", work: "The Sun Also Rises" },
      { name: "Robert Jordan", work: "For Whom the Bell Tolls" },
      { name: "Santiago", work: "The Old Man and the Sea" }
    ]
  },

  {
    id: "fitzgerald",
    name: "F. Scott Fitzgerald",
    born: 1896,
    dates: "1896–1940",
    place: "United States",
    group: "modern",
    tag: "Lost Generation",
    blurb: "The chronicler of the Jazz Age, whose lyrical novels capture the glamour and hollowness of the American Dream.",
    facts: [
      "Dropped out of Princeton and joined the army in World War I.",
      "Married Zelda Sayre, an Alabama judge’s daughter and fellow writer.",
      "Popularized the term “Jazz Age.”",
      "Died of a heart attack at 44 while working as a Hollywood screenwriter."
    ],
    works: [
      { title: "The Great Gatsby", year: "1925", note: "A mysterious Long Island millionaire throws lavish parties to win back his lost love, Daisy Buchanan." },
      { title: "Tender Is the Night", year: "1934", note: "A brilliant psychiatrist on the French Riviera declines as his marriage to a wealthy former patient unravels." },
      { title: "This Side of Paradise", year: "1920", note: "A Princeton student’s romantic and intellectual coming of age." }
    ],
    lines: [
      { text: "So we beat on, boats against the current, borne back ceaselessly into the past.", work: "The Great Gatsby" },
      { text: "In my younger and more vulnerable years my father gave me some advice that I’ve been turning over in my mind ever since.", work: "The Great Gatsby" }
    ],
    characters: [
      { name: "Jay Gatsby", work: "The Great Gatsby" },
      { name: "Nick Carraway", work: "The Great Gatsby" },
      { name: "Dick Diver", work: "Tender Is the Night" }
    ]
  },

  {
    id: "faulkner",
    name: "William Faulkner",
    born: 1897,
    dates: "1897–1962",
    place: "United States",
    group: "modern",
    tag: "Modernism",
    blurb: "Mississippi novelist whose experimental narratives explore the burdens of Southern history.",
    facts: [
      "Set most of his fiction in the fictional Yoknapatawpha County, Mississippi.",
      "Added a “u” to his family’s surname.",
      "Was forced out as University of Mississippi postmaster for neglecting the mail.",
      "Won the Nobel Prize in Literature in 1949."
    ],
    works: [
      { title: "The Sound and the Fury", year: "1929", note: "The Compson family’s decline told in four sections, the first narrated by the intellectually disabled Benjy." },
      { title: "As I Lay Dying", year: "1930", note: "The Bundren family carries their mother’s coffin across Mississippi to bury her, told by 15 narrators." },
      { title: "Absalom, Absalom!", year: "1936", note: "Quentin Compson pieces together the rise and fall of the ruthless planter Thomas Sutpen." },
      { title: "Light in August", year: "1932", note: "A pregnant young woman’s search for her child’s father crosses paths with a drifter of uncertain racial identity." }
    ],
    lines: [
      { text: "My mother is a fish.", work: "As I Lay Dying" }
    ],
    characters: [
      { name: "Benjy Compson", work: "The Sound and the Fury" },
      { name: "Addie Bundren", work: "As I Lay Dying" },
      { name: "Joe Christmas", work: "Light in August" }
    ]
  },

  {
    id: "hurston",
    name: "Zora Neale Hurston",
    born: 1891,
    dates: "1891–1960",
    place: "United States",
    group: "modern",
    tag: "Harlem Renaissance",
    blurb: "Novelist and folklorist of the Harlem Renaissance who celebrated Black Southern speech and culture.",
    facts: [
      "Grew up in Eatonville, Florida, one of the first all-Black incorporated towns in the United States.",
      "Studied anthropology under Franz Boas at Barnard College.",
      "Collected folklore in the American South and studied Vodou in Haiti and Jamaica.",
      "Died in poverty; Alice Walker found and marked her unmarked grave in 1973."
    ],
    works: [
      { title: "Their Eyes Were Watching God", year: "1937", note: "Janie Crawford recounts her three marriages and her search for independence and love in Florida." },
      { title: "Mules and Men", year: "1935", note: "A collection of African American folktales and hoodoo practices gathered in Florida and Louisiana." },
      { title: "Barracoon", year: "2018", note: "The life story of Cudjo Lewis, one of the last survivors of the transatlantic slave trade." }
    ],
    lines: [
      { text: "Ships at a distance have every man’s wish on board.", work: "Their Eyes Were Watching God" }
    ],
    characters: [
      { name: "Janie Crawford", work: "Their Eyes Were Watching God" },
      { name: "Tea Cake", work: "Their Eyes Were Watching God" }
    ]
  },

  {
    id: "hughes",
    name: "Langston Hughes",
    born: 1901,
    dates: "1901–1967",
    place: "United States",
    group: "modern",
    tag: "Harlem Renaissance",
    blurb: "Leading poet of the Harlem Renaissance, who brought the rhythms of jazz and blues into American verse.",
    facts: [
      "Was discovered after leaving poems beside Vachel Lindsay’s plate while working as a hotel busboy.",
      "Pioneered jazz poetry, blending blues rhythms into verse.",
      "Created the folk character Jesse B. Semple, or “Simple,” in newspaper columns.",
      "Graduated from Lincoln University in Pennsylvania after leaving Columbia."
    ],
    works: [
      { title: "The Negro Speaks of Rivers", year: "1921", note: "A speaker traces Black heritage through the Euphrates, the Congo, the Nile, and the Mississippi." },
      { title: "Harlem", year: "1951", note: "A brief poem asking what becomes of a dream that is postponed too long." },
      { title: "The Weary Blues", year: "1926", note: "A debut collection whose title poem describes a pianist singing the blues on Lenox Avenue." }
    ],
    lines: [
      { text: "I’ve known rivers: / Ancient, dusky rivers.", work: "The Negro Speaks of Rivers" },
      { text: "What happens to a dream deferred? / Does it dry up / like a raisin in the sun?", work: "Harlem" }
    ],
    characters: []
  },

  {
    id: "steinbeck",
    name: "John Steinbeck",
    born: 1902,
    dates: "1902–1968",
    place: "United States",
    group: "modern",
    tag: "Realism",
    blurb: "American novelist of the Depression and the dispossessed, especially in his native California.",
    facts: [
      "Grew up in Salinas, California, the setting of much of his fiction.",
      "Sailed the Gulf of California collecting marine specimens with his friend, the biologist Ed Ricketts.",
      "Worked as a war correspondent in World War II.",
      "Won the Nobel Prize in Literature in 1962."
    ],
    works: [
      { title: "The Grapes of Wrath", year: "1939", note: "The Joad family flees the Oklahoma Dust Bowl for California, only to find exploitation as migrant workers." },
      { title: "Of Mice and Men", year: "1937", note: "Two itinerant ranch hands, quick George and gentle, strong Lennie, dream of owning their own farm." },
      { title: "East of Eden", year: "1952", note: "Two families in the Salinas Valley reenact the story of Cain and Abel." }
    ],
    lines: [],
    characters: [
      { name: "Tom Joad", work: "The Grapes of Wrath" },
      { name: "Lennie Small", work: "Of Mice and Men" }
    ]
  },

  {
    id: "orwell",
    name: "George Orwell",
    born: 1903,
    dates: "1903–1950",
    place: "England",
    group: "modern",
    tag: "Dystopian fiction",
    blurb: "English novelist and essayist, the most influential critic of totalitarianism in 20th-century literature.",
    facts: [
      "Born Eric Arthur Blair in Motihari, India.",
      "Served with the Indian Imperial Police in Burma.",
      "Was shot in the throat by a sniper while fighting with the POUM militia in the Spanish Civil War.",
      "Died of tuberculosis at 46."
    ],
    works: [
      { title: "Nineteen Eighty-Four", year: "1949", note: "In a totalitarian superstate ruled by Big Brother, Winston Smith secretly rebels and falls in love." },
      { title: "Animal Farm", year: "1945", note: "Livestock overthrow their human owner, only for the pigs to become tyrants: a fable of Stalin’s USSR." },
      { title: "Homage to Catalonia", year: "1938", note: "A memoir of fighting for the Republican side in the Spanish Civil War." }
    ],
    lines: [
      { text: "It was a bright cold day in April, and the clocks were striking thirteen.", work: "Nineteen Eighty-Four" },
      { text: "All animals are equal, but some animals are more equal than others.", work: "Animal Farm" }
    ],
    characters: [
      { name: "Winston Smith", work: "Nineteen Eighty-Four" },
      { name: "Napoleon", work: "Animal Farm" }
    ]
  },

  {
    id: "huxley",
    name: "Aldous Huxley",
    born: 1894,
    dates: "1894–1963",
    place: "England",
    group: "modern",
    tag: "Dystopian fiction",
    blurb: "English novelist and essayist best known for his vision of a pleasure-drugged, engineered future.",
    facts: [
      "Grandson of the biologist known as “Darwin’s bulldog.”",
      "Was nearly blinded by an eye disease as a teenager.",
      "Experimented with mescaline and LSD.",
      "Died on November 22, 1963, the same day as C. S. Lewis and John F. Kennedy."
    ],
    works: [
      { title: "Brave New World", year: "1932", note: "In a future World State, people are mass-produced in hatcheries and kept content with the drug soma." },
      { title: "The Doors of Perception", year: "1954", note: "An essay on the author’s experience taking mescaline." },
      { title: "Island", year: "1962", note: "A journalist shipwrecked on Pala discovers a utopian society threatened by oil interests." }
    ],
    lines: [
      { text: "A squat grey building of only thirty-four stories.", work: "Brave New World" }
    ],
    characters: [
      { name: "Bernard Marx", work: "Brave New World" },
      { name: "John the Savage", work: "Brave New World" }
    ]
  },

  {
    id: "lorca",
    name: "Federico García Lorca",
    born: 1898,
    dates: "1898–1936",
    place: "Spain",
    group: "modern",
    tag: "Generation of ’27",
    blurb: "Andalusian poet and playwright, the most celebrated Spanish writer of the 20th century.",
    facts: [
      "Was a friend of Salvador Dalí and Luis Buñuel at Madrid’s Residencia de Estudiantes.",
      "Spent 1929–30 in New York, writing surreal poems about the city.",
      "Directed La Barraca, a traveling student theater that brought classics to rural Spain.",
      "Was shot by Nationalist forces near Granada in 1936; his body has never been found."
    ],
    works: [
      { title: "Blood Wedding", year: "1933", note: "A bride runs off with her former lover on her wedding day, and both men die in a knife fight." },
      { title: "The House of Bernarda Alba", year: "1945", note: "A tyrannical widow imposes eight years of mourning on her five daughters, with tragic consequences." },
      { title: "Gypsy Ballads", year: "1928", note: "Poems blending Andalusian folklore, Romani life, and surreal imagery." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "brecht",
    name: "Bertolt Brecht",
    born: 1898,
    dates: "1898–1956",
    place: "Germany",
    group: "modern",
    tag: "Epic theatre",
    blurb: "German Marxist playwright and theorist whose “epic theatre” aimed to make audiences think, not feel.",
    facts: [
      "Developed the “alienation effect” to keep audiences critical rather than absorbed.",
      "Fled Nazi Germany in 1933, living in Scandinavia and then the United States.",
      "Testified before the House Un-American Activities Committee in 1947 and left for Europe the next day.",
      "Founded the Berliner Ensemble in East Berlin."
    ],
    works: [
      { title: "Mother Courage and Her Children", year: "1941", note: "A canteen woman profits from the Thirty Years’ War while losing all three of her children to it." },
      { title: "The Threepenny Opera", year: "1928", note: "A musical with Kurt Weill about the London criminal Macheath, featuring “Mack the Knife.”" },
      { title: "The Caucasian Chalk Circle", year: "1948", note: "A servant girl who rescued an abandoned noble child must win custody from its birth mother in a chalk-circle test." }
    ],
    lines: [],
    characters: [
      { name: "Macheath", work: "The Threepenny Opera" },
      { name: "Grusha", work: "The Caucasian Chalk Circle" }
    ]
  },

  {
    id: "bulgakov",
    name: "Mikhail Bulgakov",
    born: 1891,
    dates: "1891–1940",
    place: "Russia",
    group: "modern",
    tag: "Satire",
    blurb: "Soviet-era satirist whose fantastical masterpiece, hidden for decades, became a cult classic.",
    facts: [
      "Born in Kyiv, then part of the Russian Empire.",
      "Trained and practiced as a doctor before turning to writing.",
      "Wrote to Stalin asking to emigrate; Stalin phoned him and arranged a job at the Moscow Art Theatre.",
      "Worked on his masterpiece in secret for over a decade; it was published only in 1966–67."
    ],
    works: [
      { title: "The Master and Margarita", year: "1967", note: "The Devil visits atheist Soviet Moscow, intertwined with a persecuted writer’s novel about Pontius Pilate." },
      { title: "Heart of a Dog", year: "1968", note: "A Moscow surgeon transplants human organs into a stray, which becomes a crude new Soviet man." },
      { title: "The White Guard", year: "1925", note: "A family in Kyiv tries to hold onto its way of life during the chaos of the Russian Civil War." }
    ],
    lines: [
      { text: "Manuscripts don’t burn.", work: "The Master and Margarita" }
    ],
    characters: [
      { name: "Woland", work: "The Master and Margarita" },
      { name: "Behemoth", work: "The Master and Margarita" }
    ]
  },

  {
    id: "waugh",
    name: "Evelyn Waugh",
    born: 1903,
    dates: "1903–1966",
    place: "England",
    group: "modern",
    tag: "Satire",
    blurb: "English comic novelist whose savage satires of high society gave way to an elegy for Catholic, aristocratic England.",
    facts: [
      "Left Hertford College, Oxford, without a degree.",
      "Taught at a boys’ preparatory school in North Wales, which inspired his first novel.",
      "Converted to Roman Catholicism in 1930.",
      "Served with the Royal Marines and the commandos in World War II, including a mission to Yugoslavia."
    ],
    works: [
      { title: "Decline and Fall", year: "1928", note: "Paul Pennyfeather, sent down from Oxford after drunken aristocrats strip off his trousers, teaches at a Welsh school, nearly marries a society hostess, and lands in prison." },
      { title: "Scoop", year: "1938", note: "A shy nature columnist is mistakenly sent to cover a war in an African country, in a satire of Fleet Street." },
      { title: "Brideshead Revisited", year: "1945", note: "Charles Ryder recalls his entanglement with an aristocratic Catholic family, beginning with his friendship with their son at Oxford." }
    ],
    lines: [],
    characters: [
      { name: "Sebastian Flyte", work: "Brideshead Revisited" },
      { name: "Charles Ryder", work: "Brideshead Revisited" },
      { name: "William Boot", work: "Scoop" }
    ]
  },

  /* ───────────────────────── Postwar and contemporary ───────────────────────── */

  {
    id: "beckett",
    name: "Samuel Beckett",
    born: 1906,
    dates: "1906–1989",
    place: "Ireland",
    group: "postwar",
    tag: "Absurdism",
    blurb: "Irish playwright and novelist whose bleakly comic minimalism defined the Theatre of the Absurd.",
    facts: [
      "Served as an assistant to James Joyce in Paris.",
      "Was stabbed by a pimp on a Paris street in 1938.",
      "Fought in the French Resistance and received the Croix de Guerre.",
      "Wrote many works first in French and translated them himself; won the Nobel Prize in 1969."
    ],
    works: [
      { title: "Waiting for Godot", year: "1953", note: "Two tramps, Vladimir and Estragon, wait by a bare tree for someone who never arrives." },
      { title: "Endgame", year: "1957", note: "A blind, chair-bound master and his servant play out a bleak routine while his parents live in ashbins." },
      { title: "Krapp’s Last Tape", year: "1958", note: "An old man listens to a recording he made of himself 30 years earlier." },
      { title: "Molloy", year: "1951", note: "First of a trilogy of novels, in which a decrepit wanderer searches for his mother." }
    ],
    lines: [
      { text: "Nothing to be done.", work: "Waiting for Godot" }
    ],
    characters: [
      { name: "Lucky", work: "Waiting for Godot" },
      { name: "Pozzo", work: "Waiting for Godot" },
      { name: "Hamm", work: "Endgame" }
    ]
  },

  {
    id: "camus",
    name: "Albert Camus",
    born: 1913,
    dates: "1913–1960",
    place: "France",
    group: "postwar",
    tag: "Absurdism",
    blurb: "French-Algerian novelist and essayist whose philosophy of the absurd urged revolt and solidarity in a meaningless world.",
    facts: [
      "Born in French Algeria to a poor family; his father was killed in World War I.",
      "Played goalkeeper for a university football team in Algiers.",
      "Edited the Resistance newspaper Combat during the German occupation.",
      "Won the Nobel Prize in Literature in 1957 and died in a car crash in 1960."
    ],
    works: [
      { title: "The Stranger", year: "1942", note: "A detached clerk in Algiers kills an Arab man on a beach and is condemned as much for his indifference as for the crime." },
      { title: "The Plague", year: "1947", note: "An epidemic seals off the Algerian city of Oran, and a doctor leads the fight against it." },
      { title: "The Myth of Sisyphus", year: "1942", note: "A philosophical essay on the absurd, arguing that life is worth living despite its lack of meaning." },
      { title: "The Fall", year: "1956", note: "A former Paris lawyer confesses his hypocrisy to a stranger in an Amsterdam bar." }
    ],
    lines: [
      { text: "Mother died today. Or, maybe, yesterday; I can’t be sure.", work: "The Stranger" }
    ],
    characters: [
      { name: "Meursault", work: "The Stranger" },
      { name: "Dr. Bernard Rieux", work: "The Plague" }
    ]
  },

  {
    id: "sartre",
    name: "Jean-Paul Sartre",
    born: 1905,
    dates: "1905–1980",
    place: "France",
    group: "postwar",
    tag: "Existentialism",
    blurb: "The leading existentialist philosopher, who also wrote novels and plays dramatizing freedom and bad faith.",
    facts: [
      "Was held as a German prisoner of war in 1940–41.",
      "Lifelong partner of Simone de Beauvoir.",
      "Co-founded the journal Les Temps modernes in 1945.",
      "Declined the Nobel Prize in Literature in 1964."
    ],
    works: [
      { title: "Nausea", year: "1938", note: "A historian in a seaside town is overwhelmed by the raw, meaningless existence of things." },
      { title: "No Exit", year: "1944", note: "Three damned people are locked together in a drawing room in Hell, tormenting one another." },
      { title: "The Flies", year: "1943", note: "A retelling of the Orestes myth as a call to freedom, staged under the German occupation." }
    ],
    lines: [
      { text: "Hell is other people.", work: "No Exit" }
    ],
    characters: [
      { name: "Antoine Roquentin", work: "Nausea" }
    ]
  },

  {
    id: "borges",
    name: "Jorge Luis Borges",
    born: 1899,
    dates: "1899–1986",
    place: "Argentina",
    group: "postwar",
    tag: "Postmodernism",
    blurb: "Argentine master of the short story and essay, whose labyrinthine fictions anticipated postmodernism.",
    facts: [
      "Grew up bilingual in Spanish and English in Buenos Aires.",
      "Was removed from a library job under Perón and “promoted” to poultry inspector.",
      "Directed Argentina’s National Library while almost completely blind.",
      "Never won the Nobel Prize despite being a perennial favorite."
    ],
    works: [
      { title: "Ficciones", year: "1944", note: "Short stories of labyrinths, infinite libraries, and imaginary worlds, including “The Library of Babel.”" },
      { title: "The Aleph", year: "1949", note: "Stories of immortality, doubles, and labyrinths; the title story centers on a point that contains all other points." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "neruda",
    name: "Pablo Neruda",
    born: 1904,
    dates: "1904–1973",
    place: "Chile",
    group: "postwar",
    tag: "Lyric poetry",
    blurb: "Chilean poet of love and political struggle, one of the most widely read poets of the 20th century.",
    facts: [
      "Pen name of Ricardo Eliécer Neftalí Reyes Basoalto, taken in part from a Czech poet.",
      "Served as a diplomat in Asia, Spain, and Mexico, and as a Communist senator.",
      "Won the Nobel Prize in Literature in 1971.",
      "Died days after the 1973 coup that toppled his friend Salvador Allende."
    ],
    works: [
      { title: "Twenty Love Poems and a Song of Despair", year: "1924", note: "A youthful collection of passionate, melancholy love lyrics, one of the best-selling poetry books in Spanish." },
      { title: "Canto General", year: "1950", note: "An epic of the history and nature of the Americas, including “The Heights of Macchu Picchu.”" },
      { title: "Elemental Odes", year: "1954", note: "Plain-spoken poems celebrating everyday things such as onions and tomatoes." }
    ],
    lines: [
      { text: "Tonight I can write the saddest lines.", work: "Twenty Love Poems and a Song of Despair" }
    ],
    characters: []
  },

  {
    id: "garcia-marquez",
    name: "Gabriel García Márquez",
    born: 1927,
    dates: "1927–2014",
    place: "Colombia",
    group: "postwar",
    tag: "Magical realism",
    blurb: "Colombian novelist and journalist, the leading figure of magical realism and the Latin American Boom.",
    facts: [
      "Was raised by his grandparents in Aracataca, the model for his fictional town of Macondo.",
      "Worked as a journalist in Bogotá, Rome, and Paris.",
      "Was punched by Mario Vargas Llosa in Mexico City in 1976, ending their friendship.",
      "Won the Nobel Prize in Literature in 1982."
    ],
    works: [
      { title: "One Hundred Years of Solitude", year: "1967", note: "Seven generations of the Buendía family rise and fall in the isolated town of Macondo." },
      { title: "Love in the Time of Cholera", year: "1985", note: "A man waits more than 50 years for the woman who rejected him to be widowed." },
      { title: "Chronicle of a Death Foretold", year: "1981", note: "A town reconstructs how everyone knew of a planned honor killing, yet no one stopped it." }
    ],
    lines: [
      { text: "Many years later, as he faced the firing squad, Colonel Aureliano Buendía was to remember that distant afternoon when his father took him to discover ice.", work: "One Hundred Years of Solitude" }
    ],
    characters: [
      { name: "Úrsula Iguarán", work: "One Hundred Years of Solitude" },
      { name: "Florentino Ariza", work: "Love in the Time of Cholera" }
    ]
  },

  {
    id: "cortazar",
    name: "Julio Cortázar",
    born: 1914,
    dates: "1914–1984",
    place: "Argentina",
    group: "postwar",
    tag: "Latin American Boom",
    blurb: "Argentine writer of playful, uncanny short stories and an experimental novel that can be read in more than one order.",
    facts: [
      "Born in Brussels to Argentine parents.",
      "Moved to Paris in 1951 in opposition to Perón’s government and lived in France until his death.",
      "Worked as a translator for UNESCO and translated Poe’s complete prose into Spanish."
    ],
    works: [
      { title: "Hopscotch", year: "1963", note: "An “anti-novel” about an Argentine intellectual in Paris and Buenos Aires whose chapters can be read in more than one order." },
      { title: "House Taken Over", year: "1946", note: "A brother and sister surrender their family mansion room by room to an unseen presence." },
      { title: "Axolotl", year: "1956", note: "A man who stares every day at salamanders in a Paris aquarium becomes one of them." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "vargas-llosa",
    name: "Mario Vargas Llosa",
    born: 1936,
    dates: "1936–2025",
    place: "Peru",
    group: "postwar",
    tag: "Latin American Boom",
    blurb: "Peruvian novelist of power, corruption, and resistance, a central figure of the Latin American Boom.",
    facts: [
      "Attended the Leoncio Prado military academy in Lima as a teenager.",
      "Married his aunt by marriage, Julia Urquidi, and later his cousin Patricia.",
      "Ran for president of Peru in 1990 and lost to Alberto Fujimori.",
      "Won the Nobel Prize in Literature in 2010."
    ],
    works: [
      { title: "The Time of the Hero", year: "1963", note: "Cadets at a Lima military academy cover up a killing within a brutal code of honor." },
      { title: "Conversation in the Cathedral", year: "1969", note: "Two men talk in a Lima bar about corruption and despair under the Odría dictatorship." },
      { title: "The Feast of the Goat", year: "2000", note: "The 1961 assassination of the Dominican dictator Rafael Trujillo and the trauma his rule left behind." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "achebe",
    name: "Chinua Achebe",
    born: 1930,
    dates: "1930–2013",
    place: "Nigeria",
    group: "postwar",
    tag: "Postcolonial literature",
    blurb: "Nigerian novelist often called the father of modern African literature, who told the story of colonialism from the African side.",
    facts: [
      "Worked as a producer for the Nigerian Broadcasting Corporation.",
      "Supported the secessionist Biafran government during the Nigerian Civil War.",
      "Denounced Joseph Conrad as a racist in a famous 1975 lecture.",
      "Was paralyzed from the waist down by a car accident in 1990."
    ],
    works: [
      { title: "Things Fall Apart", year: "1958", note: "A proud Igbo wrestler and leader’s world collapses with the arrival of British missionaries and colonial rule." },
      { title: "No Longer at Ease", year: "1960", note: "The British-educated grandson of an earlier hero becomes a civil servant in Lagos and falls into bribery." },
      { title: "Arrow of God", year: "1964", note: "The chief priest of six Igbo villages clashes with British administrators and with his own people." }
    ],
    lines: [
      { text: "Okonkwo was well known throughout the nine villages and even beyond.", work: "Things Fall Apart" }
    ],
    characters: [
      { name: "Okonkwo", work: "Things Fall Apart" },
      { name: "Ezeulu", work: "Arrow of God" }
    ]
  },

  {
    id: "ngugi",
    name: "Ngũgĩ wa Thiong’o",
    born: 1938,
    dates: "1938–2025",
    place: "Kenya",
    group: "postwar",
    tag: "Postcolonial literature",
    blurb: "Kenyan novelist and critic who abandoned English to write in Gikuyu, a leading voice on decolonizing African culture.",
    facts: [
      "Was imprisoned without trial in 1977–78 after co-writing a play in Gikuyu.",
      "Wrote his first Gikuyu novel on prison toilet paper.",
      "Gave up writing fiction in English in favor of his native Gikuyu.",
      "Was violently attacked when he returned to Kenya in 2004 after 22 years in exile."
    ],
    works: [
      { title: "Weep Not, Child", year: "1964", note: "A Gikuyu boy’s hopes for education are shattered by the Mau Mau uprising against British rule." },
      { title: "A Grain of Wheat", year: "1967", note: "Villagers on the eve of Kenyan independence in 1963 confront betrayals from the Mau Mau struggle." },
      { title: "Decolonising the Mind", year: "1986", note: "Essays arguing that African writers should write in African languages rather than colonial ones." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "soyinka",
    name: "Wole Soyinka",
    born: 1934,
    dates: "b. 1934",
    place: "Nigeria",
    group: "postwar",
    tag: "Postcolonial literature",
    blurb: "Nigerian playwright, poet, and activist who fused Yoruba myth with Western drama.",
    facts: [
      "Worked as a play reader at London’s Royal Court Theatre.",
      "Was imprisoned for 22 months during the Nigerian Civil War, much of it in solitary confinement.",
      "In 1986 became the first Black African to win the Nobel Prize in Literature."
    ],
    works: [
      { title: "Death and the King’s Horseman", year: "1975", note: "A colonial officer in Nigeria prevents a royal horseman from performing a ritual suicide, with tragic results." },
      { title: "The Lion and the Jewel", year: "1959", note: "A village schoolteacher and an old chief compete for the beautiful village belle Sidi." },
      { title: "The Man Died", year: "1972", note: "Prison notes from the author’s detention during the civil war." }
    ],
    lines: [],
    characters: [
      { name: "Elesin Oba", work: "Death and the King’s Horseman" }
    ]
  },

  {
    id: "morrison",
    name: "Toni Morrison",
    born: 1931,
    dates: "1931–2019",
    place: "United States",
    group: "postwar",
    tag: "African American literature",
    blurb: "American novelist of Black history and memory, renowned for lyrical, mythic prose.",
    facts: [
      "Born Chloe Ardelia Wofford in Lorain, Ohio.",
      "Worked as a senior editor at Random House, championing Black writers.",
      "Taught for years at Princeton University.",
      "Won the Nobel Prize in Literature in 1993, the first Black woman to do so."
    ],
    works: [
      { title: "Beloved", year: "1987", note: "Sethe, who escaped slavery, is haunted by the ghost of the daughter she killed to save her from recapture." },
      { title: "The Bluest Eye", year: "1970", note: "A Black girl in 1940s Ohio prays for blue eyes, believing they will make her beautiful." },
      { title: "Song of Solomon", year: "1977", note: "Milkman Dead journeys south to uncover his family’s history." }
    ],
    lines: [
      { text: "124 was spiteful.", work: "Beloved" }
    ],
    characters: [
      { name: "Sethe", work: "Beloved" },
      { name: "Pecola Breedlove", work: "The Bluest Eye" },
      { name: "Milkman Dead", work: "Song of Solomon" }
    ]
  },

  {
    id: "baldwin",
    name: "James Baldwin",
    born: 1924,
    dates: "1924–1987",
    place: "United States",
    group: "postwar",
    tag: "African American literature",
    blurb: "American novelist and essayist whose searing writing on race, sexuality, and religion made him a voice of the civil rights era.",
    facts: [
      "Became a youth preacher in Harlem at 14.",
      "Moved to Paris in 1948 to escape American racism.",
      "Debated William F. Buckley Jr. at the Cambridge Union in 1965.",
      "Spent his final years in Saint-Paul-de-Vence in the south of France."
    ],
    works: [
      { title: "Go Tell It on the Mountain", year: "1953", note: "A semi-autobiographical novel of a Harlem teenager’s religious awakening on his 14th birthday." },
      { title: "Giovanni’s Room", year: "1956", note: "An American man in Paris struggles with his love affair with an Italian bartender." },
      { title: "The Fire Next Time", year: "1963", note: "Two essays on race in America, the first framed as a letter to the author’s nephew." },
      { title: "Notes of a Native Son", year: "1955", note: "Essays on race, family, and exile, including a reflection on the death of the author’s father." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "ellison",
    name: "Ralph Ellison",
    born: 1913,
    dates: "1913–1994",
    place: "United States",
    group: "postwar",
    tag: "African American literature",
    blurb: "American novelist whose single published novel is a landmark exploration of race and identity.",
    facts: [
      "Was named after the essayist Emerson.",
      "Studied music at the Tuskegee Institute, hoping to become a composer.",
      "Won the National Book Award in 1953.",
      "Worked on a second novel for some 40 years but never finished it."
    ],
    works: [
      { title: "Invisible Man", year: "1952", note: "A nameless Black narrator recounts his journey from the South to Harlem, where society refuses to see him." },
      { title: "Shadow and Act", year: "1964", note: "Essays on literature, music, and Black American culture." },
      { title: "Juneteenth", year: "1999", note: "A posthumous novel assembled from a lifelong unfinished manuscript about a race-baiting senator and the preacher who raised him." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "nabokov",
    name: "Vladimir Nabokov",
    born: 1899,
    dates: "1899–1977",
    place: "Russia",
    group: "postwar",
    tag: "Postmodernism",
    blurb: "Russian-American virtuoso stylist who wrote masterpieces in two languages.",
    facts: [
      "Fled Russia after the Revolution and lived in Berlin before reaching the United States in 1940.",
      "His father was assassinated in Berlin in 1922.",
      "A serious lepidopterist who curated butterflies at Harvard’s Museum of Comparative Zoology.",
      "Experienced synesthesia, seeing letters in colors, and taught literature at Cornell."
    ],
    works: [
      { title: "Lolita", year: "1955", note: "A European émigré professor’s self-justifying confession of his obsession with a 12-year-old girl." },
      { title: "Pale Fire", year: "1962", note: "A 999-line poem by a murdered poet, with a commentary by a deluded scholar." },
      { title: "Speak, Memory", year: "1951", note: "A memoir of a privileged childhood in prerevolutionary St. Petersburg and of exile." }
    ],
    lines: [],
    characters: [
      { name: "Humbert Humbert", work: "Lolita" },
      { name: "Charles Kinbote", work: "Pale Fire" }
    ]
  },

  {
    id: "salinger",
    name: "J. D. Salinger",
    born: 1919,
    dates: "1919–2010",
    place: "United States",
    group: "postwar",
    tag: "Postwar fiction",
    blurb: "American writer whose novel of teenage alienation became a touchstone for generations of readers.",
    facts: [
      "Landed at Utah Beach on D-Day and fought through the Battle of Hürtgen Forest.",
      "Many of his stories first appeared in The New Yorker.",
      "Withdrew to Cornish, New Hampshire, and published nothing new after 1965."
    ],
    works: [
      { title: "The Catcher in the Rye", year: "1951", note: "A teenager expelled from prep school wanders New York City for days, railing against “phonies.”" },
      { title: "Franny and Zooey", year: "1961", note: "Two linked stories about the youngest Glass siblings and a young woman’s spiritual crisis." },
      { title: "Nine Stories", year: "1953", note: "A collection including “A Perfect Day for Bananafish,” which introduces Seymour Glass." }
    ],
    lines: [
      { text: "If you really want to hear about it, the first thing you’ll probably want to know is where I was born …", work: "The Catcher in the Rye" }
    ],
    characters: [
      { name: "Holden Caulfield", work: "The Catcher in the Rye" },
      { name: "Phoebe Caulfield", work: "The Catcher in the Rye" }
    ]
  },

  {
    id: "kerouac",
    name: "Jack Kerouac",
    born: 1922,
    dates: "1922–1969",
    place: "United States",
    group: "postwar",
    tag: "Beat Generation",
    blurb: "Restless novelist of the Beat Generation, whose spontaneous prose captured postwar wanderlust.",
    facts: [
      "Born in Lowell, Massachusetts, to French Canadian parents; spoke French before English.",
      "Attended Columbia University on a football scholarship.",
      "Coined the term “Beat Generation.”",
      "Typed his best-known novel on a single roll of taped-together paper about 120 feet long."
    ],
    works: [
      { title: "On the Road", year: "1957", note: "Sal Paradise and Dean Moriarty crisscross America in search of experience, jazz, and kicks." },
      { title: "The Dharma Bums", year: "1958", note: "Two friends seek enlightenment through Buddhism and mountain climbing in the American West." },
      { title: "Big Sur", year: "1962", note: "A famous writer’s alcoholic breakdown at a friend’s cabin on the California coast." }
    ],
    lines: [],
    characters: [
      { name: "Dean Moriarty", work: "On the Road" },
      { name: "Sal Paradise", work: "On the Road" }
    ]
  },

  {
    id: "ginsberg",
    name: "Allen Ginsberg",
    born: 1926,
    dates: "1926–1997",
    place: "United States",
    group: "postwar",
    tag: "Beat Generation",
    blurb: "The leading poet of the Beat Generation and later a counterculture icon.",
    facts: [
      "Met Jack Kerouac and William S. Burroughs while a student at Columbia University.",
      "His publisher, Lawrence Ferlinghetti, was tried for obscenity over his first book and acquitted.",
      "Was crowned “King of May” by students in Prague in 1965, then expelled by the authorities.",
      "Practiced Tibetan Buddhism and co-founded a poetics school at Naropa in Boulder."
    ],
    works: [
      { title: "Howl", year: "1956", note: "A long, incantatory lament for friends ruined by a conformist society, personified as the god “Moloch.”" },
      { title: "Kaddish", year: "1961", note: "An elegy for the poet’s mother, Naomi, who suffered from mental illness." }
    ],
    lines: [
      { text: "I saw the best minds of my generation destroyed by madness, starving hysterical naked", work: "Howl" }
    ],
    characters: []
  },

  {
    id: "plath",
    name: "Sylvia Plath",
    born: 1932,
    dates: "1932–1963",
    place: "United States",
    group: "postwar",
    tag: "Confessional poetry",
    blurb: "American poet and novelist whose intense confessional verse made her one of the most famous poets of the century.",
    facts: [
      "Was a guest editor at Mademoiselle magazine in 1953.",
      "Married the English poet Ted Hughes in 1956.",
      "Died by suicide in London in 1963, at 30.",
      "Won a posthumous Pulitzer Prize for Poetry in 1982."
    ],
    works: [
      { title: "The Bell Jar", year: "1963", note: "A gifted college student’s summer internship in New York leads to breakdown, electroshock treatment, and recovery." },
      { title: "Ariel", year: "1965", note: "A posthumous collection of intense late poems, including “Daddy” and “Lady Lazarus.”" },
      { title: "The Colossus", year: "1960", note: "Her first collection, published in London, including poems on her dead father." }
    ],
    lines: [
      { text: "It was a queer, sultry summer, the summer they electrocuted the Rosenbergs, and I didn’t know what I was doing in New York.", work: "The Bell Jar" }
    ],
    characters: [
      { name: "Esther Greenwood", work: "The Bell Jar" }
    ]
  },

  {
    id: "tennessee-williams",
    name: "Tennessee Williams",
    born: 1911,
    dates: "1911–1983",
    place: "United States",
    group: "postwar",
    tag: "Southern Gothic",
    blurb: "American playwright of fragile, desperate dreamers in the decaying South.",
    facts: [
      "His real first name was Thomas; his nickname came from his father’s home state.",
      "His sister Rose’s lobotomy haunted his life and work.",
      "Won two Pulitzer Prizes for Drama.",
      "Choked to death on a bottle cap in a New York hotel in 1983."
    ],
    works: [
      { title: "A Streetcar Named Desire", year: "1947", note: "A fading Southern belle moves in with her sister in New Orleans and clashes with her brutish brother-in-law." },
      { title: "The Glass Menagerie", year: "1944", note: "A memory play about a domineering mother, her fragile daughter, and a son who longs to escape." },
      { title: "Cat on a Hot Tin Roof", year: "1955", note: "A Mississippi family gathers for a dying patriarch’s birthday amid greed, lies, and a troubled marriage." }
    ],
    lines: [
      { text: "I have always depended on the kindness of strangers.", work: "A Streetcar Named Desire" }
    ],
    characters: [
      { name: "Blanche DuBois", work: "A Streetcar Named Desire" },
      { name: "Stanley Kowalski", work: "A Streetcar Named Desire" },
      { name: "Laura Wingfield", work: "The Glass Menagerie" }
    ]
  },

  {
    id: "arthur-miller",
    name: "Arthur Miller",
    born: 1915,
    dates: "1915–2005",
    place: "United States",
    group: "postwar",
    tag: "Realism",
    blurb: "American playwright of conscience whose tragedies of ordinary men indict the American Dream.",
    facts: [
      "His family’s business was ruined in the Great Depression.",
      "Won the Pulitzer Prize for Drama in 1949.",
      "Married Marilyn Monroe in 1956.",
      "Was convicted of contempt of Congress in 1957 for refusing to name names; the conviction was overturned."
    ],
    works: [
      { title: "Death of a Salesman", year: "1949", note: "Aging Willy Loman’s failing career and illusions of success destroy him and strain his family." },
      { title: "The Crucible", year: "1953", note: "The Salem witch trials of 1692, written as an allegory of McCarthyism." },
      { title: "All My Sons", year: "1947", note: "A manufacturer’s concealment of defective aircraft parts sold during the war comes back to destroy his family." }
    ],
    lines: [
      { text: "Attention, attention must be finally paid to such a person.", work: "Death of a Salesman" }
    ],
    characters: [
      { name: "Willy Loman", work: "Death of a Salesman" },
      { name: "John Proctor", work: "The Crucible" }
    ]
  },

  {
    id: "pynchon",
    name: "Thomas Pynchon",
    born: 1937,
    dates: "b. 1937",
    place: "United States",
    group: "postwar",
    tag: "Postmodernism",
    blurb: "Reclusive American novelist of paranoia, entropy, and conspiracy, a giant of postmodern fiction.",
    facts: [
      "Served in the U.S. Navy and studied engineering physics at Cornell.",
      "Worked as a technical writer for Boeing.",
      "Sent the comedian Irwin Corey to accept his 1974 National Book Award on his behalf.",
      "Appeared as himself on The Simpsons with a paper bag over his head."
    ],
    works: [
      { title: "Gravity’s Rainbow", year: "1973", note: "In wartime London, an American officer’s sexual encounters seem to predict where German V-2 rockets will fall." },
      { title: "The Crying of Lot 49", year: "1966", note: "A California woman executing her ex-lover’s estate uncovers a secret underground postal system." },
      { title: "V.", year: "1963", note: "A search across decades for a mysterious woman known only by a single letter." }
    ],
    lines: [
      { text: "A screaming comes across the sky.", work: "Gravity’s Rainbow" }
    ],
    characters: [
      { name: "Tyrone Slothrop", work: "Gravity’s Rainbow" },
      { name: "Oedipa Maas", work: "The Crying of Lot 49" }
    ]
  },

  {
    id: "calvino",
    name: "Italo Calvino",
    born: 1923,
    dates: "1923–1985",
    place: "Italy",
    group: "postwar",
    tag: "Postmodernism",
    blurb: "Italian fabulist whose playful, geometric fictions made him one of the most admired postmodern writers.",
    facts: [
      "Born in Santiago de las Vegas, Cuba, to Italian botanist parents.",
      "Fought with the Italian Resistance as a partisan in World War II.",
      "Collected and retold 200 traditional folktales from across Italy.",
      "Was a member of the Oulipo experimental writing group in Paris."
    ],
    works: [
      { title: "Invisible Cities", year: "1972", note: "Marco Polo describes 55 imaginary cities to the emperor Kublai Khan." },
      { title: "If on a winter’s night a traveler", year: "1979", note: "A second-person novel in which the reader keeps starting new novels that break off." },
      { title: "The Baron in the Trees", year: "1957", note: "A young nobleman climbs into the trees at 12 and vows never to come down again." }
    ],
    lines: [],
    characters: [
      { name: "Cosimo", work: "The Baron in the Trees" }
    ]
  },

  {
    id: "kundera",
    name: "Milan Kundera",
    born: 1929,
    dates: "1929–2023",
    place: "Czechia",
    group: "postwar",
    tag: "Postmodernism",
    blurb: "Czech-born novelist of love, memory, and politics under Communism, writing with philosophical irony.",
    facts: [
      "Was expelled from the Communist Party twice.",
      "Moved to France in 1975, lost his Czechoslovak citizenship in 1979, and later wrote in French.",
      "Had his Czech citizenship restored in 2019."
    ],
    works: [
      { title: "The Unbearable Lightness of Being", year: "1984", note: "A Prague surgeon, his wife, and his mistress live through the 1968 Prague Spring and its aftermath." },
      { title: "The Joke", year: "1967", note: "A student’s ironic postcard about optimism gets him expelled from the Party and sent to labor in the mines." },
      { title: "The Book of Laughter and Forgetting", year: "1979", note: "Seven linked narratives on memory, erasure, and history under Communist rule." }
    ],
    lines: [],
    characters: [
      { name: "Tomas", work: "The Unbearable Lightness of Being" },
      { name: "Tereza", work: "The Unbearable Lightness of Being" }
    ]
  },

  {
    id: "solzhenitsyn",
    name: "Aleksandr Solzhenitsyn",
    born: 1918,
    dates: "1918–2008",
    place: "Russia",
    group: "postwar",
    tag: "Dissident literature",
    blurb: "Russian novelist and historian who exposed the Soviet labor-camp system to the world.",
    facts: [
      "Spent eight years in Soviet labor camps for criticizing Stalin in private letters.",
      "Won the Nobel Prize in Literature in 1970.",
      "Was expelled from the Soviet Union in 1974 and lived for years in Vermont.",
      "Returned to Russia in 1994."
    ],
    works: [
      { title: "One Day in the Life of Ivan Denisovich", year: "1962", note: "A single day in a Soviet labor camp, seen through the eyes of an ordinary prisoner." },
      { title: "The Gulag Archipelago", year: "1973", note: "A massive history of the Soviet prison-camp system, built from hundreds of testimonies." },
      { title: "Cancer Ward", year: "1968", note: "Patients in a hospital in Tashkent in 1955 confront illness and the legacy of Stalinism." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "mishima",
    name: "Yukio Mishima",
    born: 1925,
    dates: "1925–1970",
    place: "Japan",
    group: "postwar",
    tag: "Aestheticism",
    blurb: "Japanese novelist and playwright obsessed with beauty, death, and tradition.",
    facts: [
      "Pen name of Kimitake Hiraoka.",
      "A dedicated bodybuilder who founded a private militia, the Shield Society.",
      "Committed ritual suicide in 1970 after a failed attempt to rouse the Self-Defense Forces to a coup."
    ],
    works: [
      { title: "Confessions of a Mask", year: "1949", note: "A young man conceals his homosexual desires behind a façade of normality in wartime Japan." },
      { title: "The Temple of the Golden Pavilion", year: "1956", note: "A stuttering young acolyte becomes obsessed with the beauty of a Kyoto temple and burns it down." },
      { title: "The Sea of Fertility", year: "1965–71", note: "A tetralogy following a man who meets successive reincarnations of his friend across the 20th century." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "murakami",
    name: "Haruki Murakami",
    born: 1949,
    dates: "b. 1949",
    place: "Japan",
    group: "postwar",
    tag: "Postmodernism",
    blurb: "Internationally best-selling Japanese novelist of dreamlike, surreal loneliness.",
    facts: [
      "Ran a jazz bar in Tokyo called Peter Cat before becoming a novelist.",
      "Decided to write a novel while watching a baseball game in 1978.",
      "A dedicated long-distance runner who has completed dozens of marathons and a 100-kilometer ultramarathon.",
      "Has translated Raymond Carver and F. Scott Fitzgerald into Japanese."
    ],
    works: [
      { title: "Norwegian Wood", year: "1987", note: "A Tokyo student in the late 1960s recalls his love for two very different women." },
      { title: "Kafka on the Shore", year: "2002", note: "A runaway teenager and an old man who can talk to cats follow mysteriously intertwined paths." },
      { title: "The Wind-Up Bird Chronicle", year: "1994", note: "A passive man searching for his missing cat and wife descends into a well and into Japan’s wartime past." }
    ],
    lines: [],
    characters: [
      { name: "Toru Watanabe", work: "Norwegian Wood" }
    ]
  },

  {
    id: "mahfouz",
    name: "Naguib Mahfouz",
    born: 1911,
    dates: "1911–2006",
    place: "Egypt",
    group: "postwar",
    tag: "Realism",
    blurb: "Egyptian novelist who brought the realist novel to Arabic literature, chronicling Cairo’s modern history.",
    facts: [
      "Worked for decades as a civil servant in Egypt’s government ministries.",
      "In 1988 became the first Arabic-language writer to win the Nobel Prize in Literature.",
      "Survived a 1994 knife attack by an Islamist extremist outside his Cairo home."
    ],
    works: [
      { title: "The Cairo Trilogy", year: "1956–57", note: "Three generations of a merchant’s family in Egypt’s capital, from World War I to the 1940s." },
      { title: "Children of Gebelawi", year: "1959", note: "An allegory of a neighborhood’s descendants of a patriarch, retelling the stories of the Abrahamic prophets." },
      { title: "Midaq Alley", year: "1947", note: "Residents of a poor Cairo backstreet dream of escape during World War II." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "pamuk",
    name: "Orhan Pamuk",
    born: 1952,
    dates: "b. 1952",
    place: "Turkey",
    group: "postwar",
    tag: "Postmodernism",
    blurb: "Turkish novelist of Istanbul and of the collision between East and West.",
    facts: [
      "Studied architecture before turning to writing.",
      "Was prosecuted in 2005 for “insulting Turkishness” after speaking about the Armenian and Kurdish killings.",
      "Won the Nobel Prize in Literature in 2006.",
      "Opened a real museum in Istanbul filled with objects described in one of his novels."
    ],
    works: [
      { title: "My Name Is Red", year: "1998", note: "Miniaturist painters in 16th-century Istanbul are caught up in a murder mystery." },
      { title: "Snow", year: "2002", note: "A poet visits the remote Turkish city of Kars during an election and a theatrical coup." },
      { title: "The Museum of Innocence", year: "2008", note: "A wealthy Istanbul man’s obsessive love for a poor relative leads him to collect every object she touched." }
    ],
    lines: [
      { text: "I am nothing but a corpse now, a body at the bottom of a well.", work: "My Name Is Red" }
    ],
    characters: []
  },

  {
    id: "rushdie",
    name: "Salman Rushdie",
    born: 1947,
    dates: "b. 1947",
    place: "India",
    group: "postwar",
    tag: "Magical realism",
    blurb: "Indian-born British novelist whose exuberant magical realism retells the history of the subcontinent.",
    facts: [
      "Born in Bombay two months before Indian independence.",
      "Won the Booker Prize in 1981.",
      "Lived in hiding for years after Iran’s Ayatollah Khomeini issued a fatwa against him in 1989.",
      "Lost the sight in one eye after being stabbed on stage in New York State in 2022."
    ],
    works: [
      { title: "Midnight’s Children", year: "1981", note: "A boy born at the very moment of India’s independence is telepathically linked to others born in that first hour." },
      { title: "The Satanic Verses", year: "1988", note: "Two Indian actors survive a hijacked plane’s explosion over England and turn into an angel and a devil." }
    ],
    lines: [
      { text: "I was born in the city of Bombay … once upon a time.", work: "Midnight’s Children" }
    ],
    characters: [
      { name: "Saleem Sinai", work: "Midnight’s Children" },
      { name: "Gibreel Farishta", work: "The Satanic Verses" }
    ]
  },

  {
    id: "atwood",
    name: "Margaret Atwood",
    born: 1939,
    dates: "b. 1939",
    place: "Canada",
    group: "postwar",
    tag: "Dystopian fiction",
    blurb: "Canadian novelist and poet whose feminist dystopias and historical fiction have made her a global literary figure.",
    facts: [
      "Spent much of her childhood in the backwoods of Quebec and Ontario, where her father studied insects.",
      "Invented the LongPen, a device for signing books remotely.",
      "Won the Booker Prize twice, in 2000 and 2019.",
      "Was the first author to contribute to Oslo’s Future Library, whose manuscripts will be read in 2114."
    ],
    works: [
      { title: "The Handmaid’s Tale", year: "1985", note: "In the theocratic Republic of Gilead, a fertile woman is forced to bear children for a ruling Commander." },
      { title: "The Blind Assassin", year: "2000", note: "An elderly woman recounts her sister’s death, interwoven with a novel-within-a-novel of a secret affair." },
      { title: "Alias Grace", year: "1996", note: "A fictionalized account of a 19th-century Canadian maidservant convicted of murder after a notorious double killing." }
    ],
    lines: [],
    characters: [
      { name: "Offred", work: "The Handmaid’s Tale" },
      { name: "Grace Marks", work: "Alias Grace" }
    ]
  },

  {
    id: "mccarthy",
    name: "Cormac McCarthy",
    born: 1933,
    dates: "1933–2023",
    place: "United States",
    group: "postwar",
    tag: "Southern Gothic",
    blurb: "American novelist of violence and grace in the South and the Southwest, writing in biblical, sparsely punctuated prose.",
    facts: [
      "Received a MacArthur “genius” grant in 1981.",
      "Won the Pulitzer Prize for Fiction in 2007.",
      "Spent decades as a trustee and fellow at the Santa Fe Institute, a scientific think tank.",
      "His old Olivetti typewriter sold at auction for over $250,000."
    ],
    works: [
      { title: "The Road", year: "2006", note: "A father and his young son travel south through a burned, post-apocalyptic America." },
      { title: "Blood Meridian", year: "1985", note: "A teenage runaway rides with a gang of scalp hunters on the Texas–Mexico border in 1849–50." },
      { title: "No Country for Old Men", year: "2005", note: "A hunter finds drug money at a Texas massacre site and is pursued by a remorseless killer." },
      { title: "All the Pretty Horses", year: "1992", note: "A young Texas cowboy rides into Mexico in 1949 and falls in love with a rancher’s daughter." }
    ],
    lines: [
      { text: "See the child.", work: "Blood Meridian" }
    ],
    characters: [
      { name: "Judge Holden", work: "Blood Meridian" },
      { name: "Anton Chigurh", work: "No Country for Old Men" }
    ]
  },

  {
    id: "ishiguro",
    name: "Kazuo Ishiguro",
    born: 1954,
    dates: "b. 1954",
    place: "England",
    group: "postwar",
    tag: "Contemporary fiction",
    blurb: "Japanese-born British novelist of memory, self-deception, and quiet regret.",
    facts: [
      "Born in Nagasaki; moved to England with his family at age five.",
      "Won the Booker Prize in 1989.",
      "Won the Nobel Prize in Literature in 2017."
    ],
    works: [
      { title: "The Remains of the Day", year: "1989", note: "An aging English butler reflects on decades of loyal service to a lord who sympathized with the Nazis." },
      { title: "Never Let Me Go", year: "2005", note: "Former students of an English boarding school discover they were raised to be organ donors." },
      { title: "Klara and the Sun", year: "2021", note: "A solar-powered robot companion observes the family of the sickly girl she serves." }
    ],
    lines: [],
    characters: [
      { name: "Stevens", work: "The Remains of the Day" },
      { name: "Kathy H.", work: "Never Let Me Go" }
    ]
  },

  {
    id: "adichie",
    name: "Chimamanda Ngozi Adichie",
    born: 1977,
    dates: "b. 1977",
    place: "Nigeria",
    group: "postwar",
    tag: "Postcolonial literature",
    blurb: "Nigerian novelist and essayist, one of the most prominent African writers of her generation.",
    facts: [
      "Grew up in the university town of Nsukka, in a house once occupied by Chinua Achebe.",
      "Studied medicine briefly in Nigeria before moving to the United States at 19.",
      "Received a MacArthur Fellowship in 2008.",
      "A passage from her TEDx talk on feminism was sampled in Beyoncé’s song “Flawless.”"
    ],
    works: [
      { title: "Half of a Yellow Sun", year: "2006", note: "Lives intersect during the Nigerian Civil War and the short-lived Republic of Biafra." },
      { title: "Purple Hibiscus", year: "2003", note: "A teenage girl in Enugu grows up under her fanatically Catholic, abusive father." },
      { title: "Americanah", year: "2013", note: "A young Nigerian woman emigrates to the United States, writes a blog about race, and returns to Lagos." }
    ],
    lines: [],
    characters: [
      { name: "Ifemelu", work: "Americanah" },
      { name: "Kambili", work: "Purple Hibiscus" }
    ]
  },

  {
    id: "ferrante",
    name: "Elena Ferrante",
    born: null,
    dates: "pseudonymous; birth year unknown",
    place: "Italy",
    group: "postwar",
    tag: "Contemporary fiction",
    blurb: "Pseudonymous Italian novelist whose fiction of female friendship in Naples became an international phenomenon.",
    facts: [
      "Writes under a pseudonym and has kept her true identity secret since her 1992 debut.",
      "Communicates with the press almost entirely through written interviews.",
      "Has said she grew up in Naples, where most of her fiction is set.",
      "Was named one of Time’s 100 most influential people in 2016."
    ],
    works: [
      { title: "My Brilliant Friend", year: "2011", note: "The intense lifelong friendship of Lenù and Lila begins in a poor neighborhood of 1950s Naples." },
      { title: "The Days of Abandonment", year: "2002", note: "A woman suddenly left by her husband spirals into crisis in Turin." },
      { title: "The Lost Daughter", year: "2006", note: "A middle-aged professor on a seaside holiday becomes fixated on a young mother and her small daughter." }
    ],
    lines: [],
    characters: [
      { name: "Lila Cerullo", work: "My Brilliant Friend" }
    ]
  },

  {
    id: "munro",
    name: "Alice Munro",
    born: 1931,
    dates: "1931–2024",
    place: "Canada",
    group: "postwar",
    tag: "Contemporary fiction",
    blurb: "Canadian master of the short story, who found whole lives in small-town Ontario.",
    facts: [
      "Grew up on a fox and mink farm in Wingham, Ontario.",
      "Ran a bookstore in Victoria, British Columbia, with her first husband.",
      "Won the Man Booker International Prize in 2009.",
      "Won the Nobel Prize in Literature in 2013 as a “master of the contemporary short story.”"
    ],
    works: [
      { title: "Dance of the Happy Shades", year: "1968", note: "A debut story collection set mostly in small-town Ontario; it won the Governor General’s Award." },
      { title: "Lives of Girls and Women", year: "1971", note: "Linked stories following a girl growing up in small-town Ontario." },
      { title: "Runaway", year: "2004", note: "Stories of women who flee, or fail to flee, their lives, including three about a character named Juliet." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "heaney",
    name: "Seamus Heaney",
    born: 1939,
    dates: "1939–2013",
    place: "Ireland",
    group: "postwar",
    tag: "Lyric poetry",
    blurb: "Northern Irish poet of rural life, language, and the Troubles, the most celebrated Irish poet since Yeats.",
    facts: [
      "Grew up the eldest of nine children on a farm in County Derry.",
      "Served as Oxford Professor of Poetry.",
      "Won the Nobel Prize in Literature in 1995.",
      "His last words, texted to his wife, were “Noli timere” (“Don’t be afraid”)."
    ],
    works: [
      { title: "Death of a Naturalist", year: "1966", note: "A debut collection of poems about rural childhood and farm life." },
      { title: "North", year: "1975", note: "Poems linking Iron Age bog bodies to the sectarian violence of the Troubles." },
      { title: "Beowulf", year: "1999", note: "An acclaimed verse translation of the Old English epic of a hero who fights Grendel." }
    ],
    lines: [
      { text: "Between my finger and my thumb / The squat pen rests; snug as a gun.", work: "Death of a Naturalist" }
    ],
    characters: []
  },

  {
    id: "walcott",
    name: "Derek Walcott",
    born: 1930,
    dates: "1930–2017",
    place: "Saint Lucia",
    group: "postwar",
    tag: "Postcolonial literature",
    blurb: "Caribbean poet and playwright who fused European tradition with West Indian history and speech.",
    facts: [
      "Born in Castries on the Caribbean island of Saint Lucia.",
      "Was also a painter in watercolors.",
      "Founded the Trinidad Theatre Workshop in 1959.",
      "Won the Nobel Prize in Literature in 1992."
    ],
    works: [
      { title: "Omeros", year: "1990", note: "A Caribbean epic poem reimagining Homeric characters as island fishermen." },
      { title: "Dream on Monkey Mountain", year: "1967", note: "A poetic play about an old charcoal burner’s visions of a return to Africa." },
      { title: "A Far Cry from Africa", year: "1962", note: "A poem torn between African ancestry and the English language amid the Mau Mau uprising." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "mo-yan",
    name: "Mo Yan",
    born: 1955,
    dates: "b. 1955",
    place: "China",
    group: "postwar",
    tag: "Magical realism",
    blurb: "Chinese novelist whose earthy, hallucinatory stories chronicle rural Shandong across the 20th century.",
    facts: [
      "His pen name means “don’t speak.”",
      "Left school during the Cultural Revolution and worked on a farm and in a factory.",
      "Joined the People’s Liberation Army in 1976.",
      "Won the Nobel Prize in Literature in 2012 for “hallucinatory realism.”"
    ],
    works: [
      { title: "Red Sorghum", year: "1986", note: "Three generations of a family in rural Shandong during the war against Japan." },
      { title: "The Garlic Ballads", year: "1988", note: "Farmers riot when the government fails to buy the crop it ordered them to grow." },
      { title: "Life and Death Are Wearing Me Out", year: "2006", note: "A landlord executed in 1948 is reincarnated as a donkey, an ox, a pig, and other animals in Communist China." }
    ],
    lines: [],
    characters: []
  },

  {
    id: "lessing",
    name: "Doris Lessing",
    born: 1919,
    dates: "1919–2013",
    place: "England",
    group: "postwar",
    tag: "Postwar fiction",
    blurb: "British novelist raised in Africa, whose fiction explored politics, colonialism, and women’s lives.",
    facts: [
      "Born in Persia and raised on a farm in Southern Rhodesia.",
      "Left school in her early teens and educated herself through wide reading.",
      "Was banned from Southern Rhodesia and South Africa for her political views.",
      "Won the Nobel Prize in Literature in 2007, at 88 the oldest recipient at the time."
    ],
    works: [
      { title: "The Golden Notebook", year: "1962", note: "A writer divides her life among four colored notebooks—her African past, politics, fiction, and daily life—until a fifth unites them." },
      { title: "The Grass Is Singing", year: "1950", note: "The murder of a white farmer’s wife by her Black servant in Southern Rhodesia." },
      { title: "The Fifth Child", year: "1988", note: "A couple’s idyllic family life is shattered by the birth of a violent, seemingly atavistic son." }
    ],
    lines: [],
    characters: [
      { name: "Anna Wulf", work: "The Golden Notebook" }
    ]
  },

  {
    id: "roth",
    name: "Philip Roth",
    born: 1933,
    dates: "1933–2018",
    place: "United States",
    group: "postwar",
    tag: "Postwar fiction",
    blurb: "American novelist of Jewish American life, sex, and identity, and one of the great chroniclers of postwar America.",
    facts: [
      "Grew up in the Weequahic neighborhood of Newark, New Jersey.",
      "Created the recurring novelist alter ego Nathan Zuckerman.",
      "Won the Pulitzer Prize for Fiction in 1998.",
      "Announced his retirement from writing in 2012."
    ],
    works: [
      { title: "Portnoy’s Complaint", year: "1969", note: "A young Jewish man confesses his sexual obsessions and family neuroses to his psychoanalyst." },
      { title: "American Pastoral", year: "1997", note: "A Newark glove manufacturer’s life is shattered when his daughter bombs a post office to protest the Vietnam War." },
      { title: "The Plot Against America", year: "2004", note: "An alternate history in which Charles Lindbergh defeats Roosevelt in 1940 and antisemitism spreads." }
    ],
    lines: [],
    characters: [
      { name: "Alexander Portnoy", work: "Portnoy’s Complaint" },
      { name: "Seymour “Swede” Levov", work: "American Pastoral" }
    ]
  },

  {
    id: "delillo",
    name: "Don DeLillo",
    born: 1936,
    dates: "b. 1936",
    place: "United States",
    group: "postwar",
    tag: "Postmodernism",
    blurb: "American novelist of consumerism, media, terror, and dread in late-20th-century life.",
    facts: [
      "Grew up in an Italian American family in the Bronx.",
      "Worked as an advertising copywriter at Ogilvy & Mather before writing full-time.",
      "Won the National Book Award in 1985."
    ],
    works: [
      { title: "White Noise", year: "1985", note: "A professor of Hitler studies and his family confront an “airborne toxic event” and the fear of death." },
      { title: "Underworld", year: "1997", note: "A home-run baseball from a famous 1951 game links decades of American Cold War life." },
      { title: "Libra", year: "1988", note: "A fictional portrait of Lee Harvey Oswald and a conspiracy behind the Kennedy assassination." }
    ],
    lines: [],
    characters: [
      { name: "Jack Gladney", work: "White Noise" }
    ]
  },

  {
    id: "le-guin",
    name: "Ursula K. Le Guin",
    born: 1929,
    dates: "1929–2018",
    place: "United States",
    group: "postwar",
    tag: "Science fiction",
    blurb: "American author who brought anthropological depth and literary seriousness to science fiction and fantasy.",
    facts: [
      "Daughter of the anthropologist Alfred Kroeber and the writer Theodora Kroeber.",
      "Twice won both the Hugo and Nebula Awards for best novel.",
      "Received the National Book Foundation’s Medal for Distinguished Contribution in 2014."
    ],
    works: [
      { title: "The Left Hand of Darkness", year: "1969", note: "An envoy to the icy planet Gethen meets a people with no fixed sex." },
      { title: "A Wizard of Earthsea", year: "1968", note: "A gifted young mage unleashes a shadow creature and must hunt it across an archipelago." },
      { title: "The Dispossessed", year: "1974", note: "A physicist from an anarchist moon visits its capitalist twin planet." },
      { title: "The Ones Who Walk Away from Omelas", year: "1973", note: "A utopian city’s happiness depends on the misery of a single imprisoned child." }
    ],
    lines: [],
    characters: [
      { name: "Genly Ai", work: "The Left Hand of Darkness" },
      { name: "Ged", work: "A Wizard of Earthsea" },
      { name: "Shevek", work: "The Dispossessed" }
    ]
  },

  {
    id: "kawabata",
    name: "Yasunari Kawabata",
    born: 1899,
    dates: "1899–1972",
    place: "Japan",
    group: "postwar",
    tag: "Modernism",
    blurb: "Japanese novelist of spare, melancholy beauty, the first Japanese Nobel laureate in literature.",
    facts: [
      "Was orphaned in early childhood and raised by his grandfather.",
      "Co-founded the Shinkankakuha, or “New Sensationists,” literary movement.",
      "Was a mentor and friend of Yukio Mishima.",
      "In 1968 became the first Japanese writer to win the Nobel Prize in Literature."
    ],
    works: [
      { title: "Snow Country", year: "1935–48", note: "A Tokyo dilettante’s affair with a geisha at a remote hot-spring resort in the mountains." },
      { title: "Thousand Cranes", year: "1952", note: "A young man is drawn into affairs with his late father’s mistress and her daughter, amid the tea ceremony." },
      { title: "The Sound of the Mountain", year: "1954", note: "An aging Tokyo businessman confronts his mortality and his children’s troubled marriages." }
    ],
    lines: [],
    characters: [
      { name: "Komako", work: "Snow Country" }
    ]
  },

  {
    id: "bellow",
    name: "Saul Bellow",
    born: 1915,
    dates: "1915–2005",
    place: "United States",
    group: "postwar",
    tag: "Postwar fiction",
    blurb: "Chicago novelist of exuberant, brainy prose whose restless intellectual heroes search for meaning in modern America.",
    facts: [
      "Born in Lachine, Quebec, to Jewish immigrants from Russia, and raised in Chicago.",
      "Taught for more than 30 years on the University of Chicago’s Committee on Social Thought.",
      "Won the National Book Award for Fiction three times.",
      "Won both the Pulitzer Prize and the Nobel Prize in Literature in 1976."
    ],
    works: [
      { title: "The Adventures of Augie March", year: "1953", note: "A Depression-era Chicago youth drifts through jobs, schemes, and love affairs, refusing to be defined by others." },
      { title: "Herzog", year: "1964", note: "A twice-divorced professor in crisis writes unsent letters to friends, enemies, the famous, and the dead." },
      { title: "Humboldt’s Gift", year: "1975", note: "A successful writer, Charlie Citrine, reckons with his friendship with a brilliant poet who died a failure, modeled on Delmore Schwartz." }
    ],
    lines: [
      { text: "I am an American, Chicago born—Chicago, that somber city—and go at things as I have taught myself, free-style …", work: "The Adventures of Augie March" },
      { text: "If I am out of my mind, it’s all right with me, thought Moses Herzog.", work: "Herzog" }
    ],
    characters: [
      { name: "Augie March", work: "The Adventures of Augie March" },
      { name: "Moses Herzog", work: "Herzog" },
      { name: "Charlie Citrine", work: "Humboldt’s Gift" }
    ]
  },

  {
    id: "lispector",
    name: "Clarice Lispector",
    born: 1920,
    dates: "1920–1977",
    place: "Brazil",
    group: "postwar",
    tag: "Modernism",
    blurb: "Ukrainian-born Brazilian writer of intensely inward, mystical fiction that broke the conventions of the novel.",
    facts: [
      "Born in Ukraine to a Jewish family that fled to Brazil when she was a baby; she grew up in Recife.",
      "Studied law in Rio de Janeiro and worked as a journalist.",
      "Published her first novel at 23 to great acclaim.",
      "Spent years abroad with her diplomat husband, in Naples, Bern, and Washington."
    ],
    works: [
      { title: "Near to the Wild Heart", year: "1943", note: "A debut novel tracing the inner life of Joana from a restless childhood through a failing marriage." },
      { title: "The Passion According to G.H.", year: "1964", note: "A wealthy Rio sculptor crushes a cockroach in her maid’s empty room and undergoes a mystical crisis." },
      { title: "The Hour of the Star", year: "1977", note: "A male narrator tells the life of Macabéa, a poor, naïve typist from the Northeast adrift in Rio de Janeiro." }
    ],
    lines: [
      { text: "Everything in the world began with a yes. One molecule said yes to another molecule and life was born.", work: "The Hour of the Star" }
    ],
    characters: [
      { name: "Macabéa", work: "The Hour of the Star" }
    ]
  },

  {
    id: "vonnegut",
    name: "Kurt Vonnegut",
    born: 1922,
    dates: "1922–2007",
    place: "United States",
    group: "postwar",
    tag: "Postmodernism",
    blurb: "American satirist who blended science fiction, black humor, and moral outrage at war and technology.",
    facts: [
      "As an American prisoner of war, survived the 1945 firebombing of Dresden in an underground meat locker.",
      "Worked in public relations for General Electric in Schenectady before writing full-time.",
      "The University of Chicago accepted one of his novels in place of a master’s thesis in anthropology, decades after he left.",
      "Taught at the Iowa Writers’ Workshop in the mid-1960s."
    ],
    works: [
      { title: "Slaughterhouse-Five", year: "1969", note: "Billy Pilgrim, an American POW who survives the firebombing of Dresden, comes unstuck in time and is abducted by Tralfamadorians." },
      { title: "Cat’s Cradle", year: "1963", note: "A writer researching the atomic bomb discovers ice-nine, a substance that can freeze the world’s water, and the invented religion Bokononism." },
      { title: "Breakfast of Champions", year: "1973", note: "A Midwestern car dealer goes mad after reading a novel by the obscure science-fiction writer Kilgore Trout." }
    ],
    lines: [
      { text: "All this happened, more or less.", work: "Slaughterhouse-Five" },
      { text: "So it goes.", work: "Slaughterhouse-Five" }
    ],
    characters: [
      { name: "Billy Pilgrim", work: "Slaughterhouse-Five" },
      { name: "Kilgore Trout", work: "Breakfast of Champions" }
    ]
  },

  {
    id: "gordimer",
    name: "Nadine Gordimer",
    born: 1923,
    dates: "1923–2014",
    place: "South Africa",
    group: "postwar",
    tag: "Postcolonial literature",
    blurb: "South African novelist whose fiction laid bare the moral and personal costs of apartheid.",
    facts: [
      "Grew up in Springs, a mining town east of Johannesburg.",
      "Several of her books were banned by the apartheid government.",
      "Helped Nelson Mandela edit his “I Am Prepared to Die” speech, and joined the ANC while it was still outlawed.",
      "Won the Booker Prize in 1974 and the Nobel Prize in Literature in 1991."
    ],
    works: [
      { title: "The Conservationist", year: "1974", note: "A wealthy white industrialist’s weekend farm outside Johannesburg is unsettled by the discovery of an unidentified Black man’s body." },
      { title: "Burger’s Daughter", year: "1979", note: "A young woman whose white communist father died in prison struggles with the political legacy she has inherited." },
      { title: "July’s People", year: "1981", note: "During an imagined revolution, a liberal white family flees Johannesburg to hide in the village of their Black servant." }
    ],
    lines: [],
    characters: [
      { name: "Rosa Burger", work: "Burger’s Daughter" },
      { name: "Mehring", work: "The Conservationist" }
    ]
  },

  {
    id: "flannery-oconnor",
    name: "Flannery O’Connor",
    born: 1925,
    dates: "1925–1964",
    place: "United States",
    group: "postwar",
    tag: "Southern Gothic",
    blurb: "Georgia writer whose violent, darkly comic stories of the South are shot through with Catholic visions of grace.",
    facts: [
      "As a six-year-old in Savannah, she was filmed for a newsreel with a chicken she had trained to walk backward.",
      "Studied at the Iowa Writers’ Workshop.",
      "Lived on her family’s farm, Andalusia, near Milledgeville, Georgia, where she raised peacocks.",
      "Died of lupus, the disease that had killed her father, at 39."
    ],
    works: [
      { title: "Wise Blood", year: "1952", note: "A young veteran, Hazel Motes, preaches a “Church Without Christ” in a Southern city." },
      { title: "A Good Man Is Hard to Find", year: "1955", note: "A story collection whose title story follows a Georgia family’s road trip that ends in murder by an escaped convict called The Misfit." },
      { title: "Everything That Rises Must Converge", year: "1965", note: "A posthumous story collection; its title story follows a young man and his bigoted mother on a newly integrated bus." }
    ],
    lines: [
      { text: "“She would of been a good woman,” The Misfit said, “if it had been somebody there to shoot her every minute of her life.”", work: "A Good Man Is Hard to Find" }
    ],
    characters: [
      { name: "The Misfit", work: "A Good Man Is Hard to Find" },
      { name: "Hazel Motes", work: "Wise Blood" }
    ]
  },

  {
    id: "grass",
    name: "Günter Grass",
    born: 1927,
    dates: "1927–2015",
    place: "Germany",
    group: "postwar",
    tag: "Postwar fiction",
    blurb: "German novelist, artist, and public conscience whose grotesque, comic fables confronted his country’s Nazi past.",
    facts: [
      "Born in the Free City of Danzig, now Gdańsk, Poland.",
      "Trained as a stonemason and sculptor and designed the covers of his own books.",
      "Campaigned for decades for Willy Brandt and the Social Democrats, and won the Nobel Prize in Literature in 1999.",
      "Revealed in 2006 that he had been drafted into the Waffen-SS at 17."
    ],
    works: [
      { title: "The Tin Drum", year: "1959", note: "Oskar Matzerath, who wills himself to stop growing at three, recounts Nazi-era Danzig from a mental hospital, shattering glass with his screams." },
      { title: "Cat and Mouse", year: "1961", note: "A novella about Joachim Mahlke, a wartime Danzig schoolboy with an enormous Adam’s apple, and his quest for the Knight’s Cross." },
      { title: "Dog Years", year: "1963", note: "The final book of a trilogy set around Danzig: the friendship of a half-Jewish scarecrow-maker and a miller’s son who turns Nazi and beats him." }
    ],
    lines: [],
    characters: [
      { name: "Oskar Matzerath", work: "The Tin Drum" },
      { name: "Joachim Mahlke", work: "Cat and Mouse" }
    ]
  },

  {
    id: "updike",
    name: "John Updike",
    born: 1932,
    dates: "1932–2009",
    place: "United States",
    group: "postwar",
    tag: "Postwar fiction",
    blurb: "Prolific American novelist, critic, and stylist who chronicled the desires and discontents of the Protestant middle class.",
    facts: [
      "Grew up in Shillington, Pennsylvania, and was president of the Harvard Lampoon.",
      "Studied at the Ruskin School of Art in Oxford, hoping to become a cartoonist.",
      "Contributed stories, poems, and criticism to The New Yorker for more than five decades.",
      "Is one of only four writers to win the Pulitzer Prize for Fiction twice."
    ],
    works: [
      { title: "Rabbit, Run", year: "1960", note: "Harry Angstrom, a former high-school basketball star in Pennsylvania, flees his wife and dead-end job; the first of four novels about him." },
      { title: "Couples", year: "1968", note: "Adultery and partner-swapping among young married pairs in a small Massachusetts town in the early 1960s." },
      { title: "The Witches of Eastwick", year: "1984", note: "Three women in a Rhode Island town discover magical powers and fall under the spell of a mysterious newcomer, Darryl Van Horne." }
    ],
    lines: [],
    characters: [
      { name: "Harry “Rabbit” Angstrom", work: "Rabbit, Run" },
      { name: "Darryl Van Horne", work: "The Witches of Eastwick" }
    ]
  },

  {
    id: "didion",
    name: "Joan Didion",
    born: 1934,
    dates: "1934–2021",
    place: "United States",
    group: "postwar",
    tag: "New Journalism",
    blurb: "American essayist and novelist whose cool, precise prose dissected California, the 1960s, and grief.",
    facts: [
      "Born in Sacramento, she won Vogue’s Prix de Paris essay contest as a Berkeley senior and went to work at the magazine.",
      "Co-wrote screenplays, including A Star Is Born (1976), with her husband, John Gregory Dunne.",
      "Won the National Book Award in 2005 for a memoir of mourning."
    ],
    works: [
      { title: "Slouching Towards Bethlehem", year: "1968", note: "Essays on 1960s California, including a portrait of the hippie scene in San Francisco’s Haight-Ashbury." },
      { title: "The White Album", year: "1979", note: "Essays on California in the late 1960s and 1970s, from the Manson murders to the Doors and the Black Panthers." },
      { title: "The Year of Magical Thinking", year: "2005", note: "A memoir of the months after her husband died suddenly at the dinner table, while their daughter lay critically ill." }
    ],
    lines: [
      { text: "We tell ourselves stories in order to live.", work: "The White Album" },
      { text: "Life changes fast. Life changes in the instant. You sit down to dinner and life as you know it ends.", work: "The Year of Magical Thinking" }
    ],
    characters: []
  },

  {
    id: "coetzee",
    name: "J. M. Coetzee",
    born: 1940,
    dates: "b. 1940",
    place: "South Africa",
    group: "postwar",
    tag: "Postcolonial literature",
    blurb: "South African–born novelist of spare, unsparing allegories of power, complicity, and the limits of sympathy.",
    facts: [
      "Worked as a computer programmer for IBM in London in the early 1960s.",
      "Earned a PhD at the University of Texas with a computer-aided study of Samuel Beckett’s prose.",
      "Was the first writer to win the Booker Prize twice, and won the Nobel Prize in Literature in 2003.",
      "Moved to Adelaide in 2002 and became an Australian citizen."
    ],
    works: [
      { title: "Waiting for the Barbarians", year: "1980", note: "The magistrate of a frontier town in an unnamed empire turns against the regime after witnessing the torture of captives." },
      { title: "Life & Times of Michael K", year: "1983", note: "A harelipped gardener tries to take his dying mother to her rural birthplace through a South Africa torn by civil war." },
      { title: "Disgrace", year: "1999", note: "A Cape Town professor, dismissed after an affair with a student, retreats to his daughter’s smallholding, where they are violently attacked." }
    ],
    lines: [
      { text: "For a man of his age, fifty-two, divorced, he has, to his mind, solved the problem of sex rather well.", work: "Disgrace" }
    ],
    characters: [
      { name: "David Lurie", work: "Disgrace" },
      { name: "The Magistrate", work: "Waiting for the Barbarians" }
    ]
  },

  {
    id: "allende",
    name: "Isabel Allende",
    born: 1942,
    dates: "b. 1942",
    place: "Chile",
    group: "postwar",
    tag: "Magical realism",
    blurb: "Chilean novelist whose family sagas mixing magic and politics made her one of the most widely read Spanish-language writers.",
    facts: [
      "Born in Lima, Peru, where her Chilean father was a diplomat.",
      "Her father was a first cousin of Chile’s socialist president, overthrown in the 1973 coup.",
      "Fled to Venezuela after the coup and lived there for 13 years.",
      "Her first novel began as a letter to her dying grandfather; she received the U.S. Presidential Medal of Freedom in 2014."
    ],
    works: [
      { title: "The House of the Spirits", year: "1982", note: "Four generations of the Trueba family, from clairvoyant Clara to her granddaughter Alba, amid a South American country’s slide into dictatorship." },
      { title: "Eva Luna", year: "1987", note: "An orphaned storyteller grows up as a servant and finds love with an Austrian-born filmmaker in a Latin American country beset by guerrilla war." },
      { title: "Paula", year: "1994", note: "A memoir written at the bedside of her daughter, who had fallen into a coma." }
    ],
    lines: [
      { text: "Barrabás came to us by sea, the child Clara wrote in her delicate calligraphy.", work: "The House of the Spirits" }
    ],
    characters: [
      { name: "Clara del Valle", work: "The House of the Spirits" },
      { name: "Esteban Trueba", work: "The House of the Spirits" }
    ]
  },

  {
    id: "sebald",
    name: "W. G. Sebald",
    born: 1944,
    dates: "1944–2001",
    place: "Germany",
    group: "postwar",
    tag: "Contemporary fiction",
    blurb: "German writer of hybrid, melancholy prose works that blend fiction, memoir, travelogue, and photographs to trace the shadows of history.",
    facts: [
      "Born in the Bavarian village of Wertach near the end of World War II.",
      "Taught for three decades at the University of East Anglia in Norwich, where he was founding director of the British Centre for Literary Translation.",
      "Scattered unexplained black-and-white photographs throughout his books.",
      "Died in 2001 when he suffered a heart attack at the wheel near Norwich."
    ],
    works: [
      { title: "The Emigrants", year: "1992", note: "Four long portraits of displaced men, several of them Jewish, whose lives are shadowed by exile and loss." },
      { title: "The Rings of Saturn", year: "1995", note: "A walk along the Suffolk coast prompts digressions on decay, herring, silkworms, Joseph Conrad, and Sir Thomas Browne." },
      { title: "Austerlitz", year: "2001", note: "An architectural historian raised by a Welsh preacher discovers he was sent to Britain from Prague as a child in 1939 and searches for his parents’ fate." }
    ],
    lines: [],
    characters: [
      { name: "Jacques Austerlitz", work: "Austerlitz" }
    ]
  },

  {
    id: "mantel",
    name: "Hilary Mantel",
    born: 1952,
    dates: "1952–2022",
    place: "England",
    group: "postwar",
    tag: "Historical fiction",
    blurb: "English novelist who reinvented historical fiction with a vivid, present-tense trilogy about a Tudor power broker.",
    facts: [
      "Grew up in a Catholic family of Irish descent in Derbyshire.",
      "Lived for years in Botswana and in Jeddah, Saudi Arabia, with her geologist husband.",
      "Suffered for years from undiagnosed endometriosis, which shaped much of her life and writing.",
      "Was the first woman to win the Booker Prize twice, and was made a dame in 2014."
    ],
    works: [
      { title: "Wolf Hall", year: "2009", note: "A blacksmith’s son from Putney rises to become Henry VIII’s chief fixer, smoothing the king’s path to marrying Anne Boleyn." },
      { title: "Bring Up the Bodies", year: "2012", note: "Thomas Cromwell engineers the downfall and execution of Anne Boleyn in 1536." },
      { title: "The Mirror & the Light", year: "2020", note: "The final four years of Thomas Cromwell’s life, ending with his execution in 1540." }
    ],
    lines: [
      { text: "“So now get up.”", work: "Wolf Hall" }
    ],
    characters: [
      { name: "Thomas Cromwell", work: "Wolf Hall" }
    ]
  },

  {
    id: "bolano",
    name: "Roberto Bolaño",
    born: 1953,
    dates: "1953–2003",
    place: "Chile",
    group: "postwar",
    tag: "Contemporary fiction",
    blurb: "Chilean novelist and poet whose sprawling, haunted fictions of poets, exiles, and violence made him a posthumous literary sensation.",
    facts: [
      "Moved with his family to Mexico City as a teenager in 1968.",
      "Co-founded Infrarealism, a rebellious avant-garde poetry movement, in Mexico City in 1975.",
      "Spent his final years in Blanes, a small Catalan beach town.",
      "Died of liver failure at 50 while waiting for a transplant."
    ],
    works: [
      { title: "The Savage Detectives", year: "1998", note: "Two young poets, Arturo Belano and Ulises Lima, search the Sonoran desert for a vanished avant-garde poet, their story told by dozens of witnesses." },
      { title: "2666", year: "2004", note: "A posthumous five-part novel converging on Santa Teresa, a Mexican border city where hundreds of women are being murdered." },
      { title: "By Night in Chile", year: "2000", note: "The feverish deathbed monologue of a priest and literary critic who once taught Marxism to Pinochet’s junta." }
    ],
    lines: [],
    characters: [
      { name: "Arturo Belano", work: "The Savage Detectives" },
      { name: "Ulises Lima", work: "The Savage Detectives" },
      { name: "Benno von Archimboldi", work: "2666" }
    ]
  }
];
