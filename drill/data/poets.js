/* Poets deck for the study drill.
   Plain browser script: fills window.DRILL_DATA.poets.
   facts and works[].note are used as "Who is this?" / "Which work is this?" clues,
   so they never contain the poet's name or the work's own title.
   Lines are verbatim; translated lines use a standard English version, otherwise the original. */
window.DRILL_DATA = window.DRILL_DATA || {};
window.DRILL_DATA.poets = [

  /* ───────────────────────── Antiquity and the Middle Ages ───────────────────────── */

  {
    id: "homer",
    name: "Homer",
    born: -750,
    dates: "c. 8th century BCE",
    place: "Ancient Greece",
    group: "classical",
    tag: "Epic poetry",
    blurb: "The legendary bard credited with the two great Greek epics, the founding poems of Western literature.",
    facts: [
      "Traditionally pictured as a blind bard from Ionia, on the coast of Asia Minor.",
      "Several Greek cities, including Smyrna and Chios, claimed to be his birthplace.",
      "His epics grew out of a centuries-old oral tradition, built from stock epithets like “rosy-fingered Dawn.”"
    ],
    works: [
      { title: "The Iliad", year: "8th century BCE", note: "Epic in dactylic hexameter on the wrath of Achilles in the last year of the Trojan War, ending with the funeral of Hector." },
      { title: "The Odyssey", year: "8th century BCE", note: "Epic of a cunning hero’s ten-year voyage home from Troy to Ithaca and his revenge on his wife’s suitors." }
    ],
    lines: [
      { text: "Rage—Goddess, sing the rage of Peleus’ son Achilles, / murderous, doomed …", work: "The Iliad" },
      { text: "Sing to me of the man, Muse, the man of twists and turns …", work: "The Odyssey" }
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
      "A four-line stanza of three long lines and a short one is named after her.",
      "Her poems filled nine books, but most survive only as fragments, some recovered from Egyptian papyri."
    ],
    works: [
      { title: "Fragment 31", year: "c. 600 BCE", note: "Lyric listing the physical symptoms of desire—fire under the skin, ringing ears—while watching a beloved woman laugh with a man." },
      { title: "Ode to Aphrodite", year: "c. 600 BCE", note: "Her only complete surviving poem: a prayer asking the goddess of love to help win over a reluctant beloved." }
    ],
    lines: [
      { text: "He seems to me equal to gods that man / whoever he is who opposite you / sits and listens close / to your sweet speaking", work: "Fragment 31" }
    ]
  },

  {
    id: "catullus",
    name: "Catullus",
    born: -84,
    dates: "c. 84–c. 54 BCE",
    place: "Ancient Rome",
    group: "classical",
    tag: "Lyric poetry",
    blurb: "The great Roman love poet, whose short, frank, and witty lyrics about a faithless mistress still feel startlingly modern.",
    facts: [
      "Born to a wealthy family in Verona.",
      "Addressed many poems to “Lesbia,” usually identified as Clodia, a married aristocrat.",
      "Belonged to the “neoterics,” young poets who followed refined Greek Alexandrian models.",
      "Lampooned Julius Caesar; Suetonius says Caesar accepted his apology and invited him to dinner the same day."
    ],
    works: [
      { title: "Vivamus, mea Lesbia", year: "c. 60 BCE", note: "Poem 5: a plea to live and love, ignore gossiping old men, and trade kisses by the thousand before the endless night." },
      { title: "Odi et amo", year: "c. 60 BCE", note: "Poem 85: a two-line elegiac couplet on being torn between hatred and love." },
      { title: "Ave atque vale", year: "c. 57 BCE", note: "Poem 101: an elegy spoken at a brother’s grave in the Troad, ending with a final farewell." }
    ],
    lines: [
      { text: "da mi basia mille, deinde centum", work: "Vivamus, mea Lesbia" }
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
    blurb: "Rome’s national poet, whose epic gave Augustus’s empire a founding myth in Troy.",
    facts: [
      "Born near Mantua in northern Italy.",
      "Enjoyed the patronage of Maecenas, Augustus’s cultural minister.",
      "Asked on his deathbed for his unfinished epic to be burned; Emperor Augustus refused.",
      "Serves as the pilgrim’s guide through Hell and Purgatory in Dante’s great poem."
    ],
    works: [
      { title: "The Aeneid", year: "19 BCE", note: "Epic of the Trojan refugee Aeneas, his love affair with Dido of Carthage, and the wars that found the Roman people in Italy." },
      { title: "The Georgics", year: "29 BCE", note: "Didactic poem in four books on farming, vines, livestock, and beekeeping." },
      { title: "The Eclogues", year: "c. 38 BCE", note: "Ten pastoral poems of shepherds’ songs; the fourth was long read as a prophecy of Christ." }
    ],
    lines: [
      { text: "Arms, and the man I sing, who, forc’d by fate, / And haughty Juno’s unrelenting hate", work: "The Aeneid" },
      { text: "timeo Danaos et dona ferentes", work: "The Aeneid" },
      { text: "sed fugit interea, fugit irreparabile tempus", work: "The Georgics" }
    ]
  },

  {
    id: "horace",
    name: "Horace",
    born: -65,
    dates: "65–8 BCE",
    place: "Ancient Rome",
    group: "classical",
    tag: "Lyric poetry",
    blurb: "Augustan Rome’s master of the lyric ode and the urbane verse letter, endlessly quoted for his worldly wisdom.",
    facts: [
      "Son of a freed slave from Venusia in southern Italy.",
      "Fought for Brutus at Philippi in 42 BCE and, by his own joking account, fled the field.",
      "His patron Maecenas gave him a beloved farm in the Sabine hills.",
      "Adapted Greek lyric meters such as the Alcaic and Sapphic stanzas to Latin."
    ],
    works: [
      { title: "Odes", year: "23 BCE", note: "Four books of lyric poems on friendship, wine, love, the brevity of life, and Augustan Rome." },
      { title: "Ars Poetica", year: "c. 19 BCE", note: "Verse letter giving advice on writing poetry and drama; it shaped Renaissance and neoclassical criticism." },
      { title: "Satires", year: "c. 35–30 BCE", note: "Two books of conversational hexameter poems mocking human folly and greed." }
    ],
    lines: [
      { text: "carpe diem, quam minimum credula postero", work: "Odes" }
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
    blurb: "Witty, sensual Roman poet whose tales of transformation became the great mythological sourcebook for later art.",
    facts: [
      "Abandoned a legal and political career for poetry.",
      "Exiled by Emperor Augustus to Tomis on the Black Sea for “a poem and a mistake.”",
      "Was never allowed to return to Rome and died in exile."
    ],
    works: [
      { title: "Metamorphoses", year: "8 CE", note: "Fifteen-book epic of some 250 myths of transformation, from the creation of the world to the deification of Julius Caesar." },
      { title: "Ars Amatoria", year: "c. 2 CE", note: "Mock-didactic poem teaching men and women how to find and keep a lover." },
      { title: "Heroides", year: "c. 20 BCE", note: "Verse letters from abandoned heroines of myth, such as Penelope and Dido, to the men who left them." }
    ],
    lines: [
      { text: "In nova fert animus mutatas dicere formas / corpora", work: "Metamorphoses" }
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
    blurb: "The exuberant, wine-loving genius of the Tang dynasty, beloved for his poems of moonlight, mountains, and friendship.",
    facts: [
      "Known as the “Immortal Poet” for his free-spirited, Daoist-tinged verse.",
      "Served briefly at Emperor Xuanzong’s court in Chang’an before being dismissed.",
      "Friend of Du Fu; the pair are often called the greatest poets of the Tang dynasty.",
      "Legend says he drowned while drunkenly trying to embrace the moon’s reflection in a river."
    ],
    works: [
      { title: "Quiet Night Thought", year: "8th century", note: "Four-line poem in which moonlight on the floor looks like frost and stirs a traveler’s homesickness; memorized by Chinese schoolchildren." },
      { title: "Drinking Alone by Moonlight", year: "8th century", note: "A lonely drinker invites the moon and his own shadow to make a party of three." },
      { title: "The River-Merchant’s Wife", year: "8th century", note: "A young wife’s letter to her absent husband, tracing her love from childhood; famously rendered by Ezra Pound in Cathay (1915)." }
    ],
    lines: [
      { text: "While my hair was still cut straight across my forehead / I played about the front gate, pulling flowers.", work: "The River-Merchant’s Wife" }
    ]
  },

  {
    id: "du-fu",
    name: "Du Fu",
    born: 712,
    dates: "712–770",
    place: "China",
    group: "classical",
    tag: "Tang poetry",
    blurb: "The conscientious Tang master of regulated verse, revered in China as the “Poet-Sage” for his compassion and craft.",
    facts: [
      "Failed the imperial civil-service examination and never won high office.",
      "Lived through the An Lushan Rebellion, which tore apart the Tang empire and scattered his family.",
      "Was held in rebel-occupied Chang’an in 756–757 before escaping to the emperor’s court.",
      "Lived for several years in a thatched cottage in Chengdu, now a museum."
    ],
    works: [
      { title: "Spring View", year: "757", note: "Regulated verse written in captured Chang’an: the nation is broken, but nature carries on while a graying poet longs for news from home." },
      { title: "Song of the War Carts", year: "c. 750", note: "Ballad of conscripts marching to frontier wars while their families wail at the roadside." },
      { title: "Moonlit Night", year: "756", note: "A captive poet imagines his wife alone, gazing at the same moon far away." }
    ],
    lines: [
      { text: "Though a country be sundered, hills and rivers endure", work: "Spring View" }
    ]
  },

  {
    id: "omar-khayyam",
    name: "Omar Khayyam",
    born: 1048,
    dates: "1048–1131",
    place: "Persia",
    group: "classical",
    tag: "Persian quatrains",
    blurb: "Persian mathematician and astronomer whose skeptical, wine-loving quatrains became a Victorian sensation in English.",
    facts: [
      "Wrote a pioneering treatise solving cubic equations with conic sections.",
      "Helped reform the Persian calendar for the Seljuk sultan Malik-Shah, producing the Jalali calendar.",
      "Born and died in Nishapur, in northeastern Iran.",
      "Became famous in the West through Edward FitzGerald’s free English version of 1859."
    ],
    works: [
      { title: "Rubaiyat", year: "c. 1100", note: "Quatrains urging pleasure in the face of death and doubt; many are of uncertain authorship." },
      { title: "Treatise on Demonstration of Problems of Algebra", year: "1070", note: "Mathematical work classifying cubic equations and solving them geometrically." }
    ],
    lines: [
      { text: "A Book of Verses underneath the Bough, / A Jug of Wine, a Loaf of Bread—and Thou", work: "Rubaiyat" },
      { text: "The Moving Finger writes; and, having writ, / Moves on", work: "Rubaiyat" }
    ]
  },

  {
    id: "rumi",
    name: "Rumi",
    born: 1207,
    dates: "1207–1273",
    place: "Persia",
    group: "classical",
    tag: "Sufi poetry",
    blurb: "Persian Sufi mystic and poet of divine love, among the most widely read poets in the world today.",
    facts: [
      "Born in Central Asia, traditionally said to be Balkh, and settled in Konya in Anatolia.",
      "His intense friendship with the wandering dervish Shams of Tabriz transformed him into a poet.",
      "His followers founded the Mevlevi order, known as the “whirling dervishes.”",
      "Became one of the best-selling poets in the United States in Coleman Barks’s versions."
    ],
    works: [
      { title: "Masnavi", year: "c. 1258–1273", note: "Vast six-book mystical poem in rhyming couplets, opening with a reed flute lamenting its separation from the reed bed." },
      { title: "Divan-e Shams-e Tabrizi", year: "13th century", note: "Collection of thousands of ecstatic ghazals and quatrains, many signed with a beloved friend’s name instead of the poet’s own." }
    ],
    lines: [
      { text: "Out beyond ideas of wrongdoing and rightdoing, / there is a field. I’ll meet you there.", work: "Divan-e Shams-e Tabrizi" }
    ]
  },

  {
    id: "dante",
    name: "Dante Alighieri",
    born: 1265,
    dates: "1265–1321",
    place: "Italy",
    group: "classical",
    tag: "Medieval literature",
    blurb: "Florentine poet of the great medieval journey through Hell, Purgatory, and Paradise, the father of the Italian language.",
    facts: [
      "Exiled from Florence in 1302 after his political faction lost power, and never returned.",
      "Devoted much of his poetry to Beatrice Portinari, whom he first met as a child.",
      "Wrote his masterpiece in the Tuscan vernacular rather than Latin, shaping standard Italian.",
      "Invented terza rima, the interlocking three-line rhyme scheme (aba bcb cdc)."
    ],
    works: [
      { title: "The Divine Comedy", year: "c. 1320", note: "Epic in terza rima of a pilgrim guided by Virgil and then Beatrice through Hell, Purgatory, and Paradise." },
      { title: "La Vita Nuova", year: "c. 1294", note: "Sonnets and canzoni linked by prose commentary, telling of love for Beatrice and grief at her death." }
    ],
    lines: [
      { text: "Midway upon the journey of our life / I found myself within a forest dark", work: "The Divine Comedy" },
      { text: "All hope abandon, ye who enter in!", work: "The Divine Comedy" }
    ]
  },

  {
    id: "petrarch",
    name: "Petrarch",
    born: 1304,
    dates: "1304–1374",
    place: "Italy",
    group: "classical",
    tag: "Renaissance humanism",
    blurb: "Italian scholar-poet whose sonnets to an unattainable beloved set the model for European love poetry for three centuries.",
    facts: [
      "First saw “Laura,” the woman of his poems, in a church in Avignon on Good Friday, 1327.",
      "Was crowned poet laureate on Rome’s Capitoline Hill in 1341.",
      "His account of climbing Mont Ventoux in 1336 is often cited as a landmark of the Renaissance outlook.",
      "Often called the “father of humanism” for reviving the study of classical Latin authors."
    ],
    works: [
      { title: "Canzoniere", year: "1374", note: "366 Italian poems, mostly sonnets, charting love for Laura in life and after death; the model for European sonnets for centuries." },
      { title: "Trionfi", year: "c. 1351–1374", note: "Allegorical poem in terza rima of successive triumphs: Love, Chastity, Death, Fame, Time, and Eternity." },
      { title: "Africa", year: "c. 1338–1343", note: "Unfinished Latin epic on Scipio Africanus and the Second Punic War." }
    ],
    lines: [
      { text: "Voi ch’ascoltate in rime sparse il suono / di quei sospiri ond’io nudriva ’l core", work: "Canzoniere" }
    ]
  },

  {
    id: "hafez",
    name: "Hafez",
    born: 1315,
    dates: "c. 1315–1390",
    place: "Persia",
    group: "classical",
    tag: "Sufi poetry",
    blurb: "Persia’s supreme master of the ghazal, whose poems of love, wine, and mystical longing are still recited across Iran.",
    facts: [
      "Spent nearly his whole life in Shiraz, where his tomb is a place of pilgrimage.",
      "His pen name is a title for someone who has memorized the entire Quran.",
      "Iranians traditionally open his collected poems at random to tell their fortunes.",
      "Inspired Goethe’s late cycle of poems in the Persian manner."
    ],
    works: [
      { title: "Divan", year: "14th century", note: "Collection of some 500 ghazals blending earthly love, wine, and Sufi mysticism, compiled after the poet’s death." },
      { title: "Agar an Turk-e Shirazi", year: "14th century", note: "Ghazal offering Samarkand and Bukhara for a beloved’s mole; legend says Tamerlane summoned the poet to explain it." }
    ],
    lines: [
      { text: "Would give thy poet more delight / Than all Bocara’s vaunted gold, / Than all the gems of Samarcand.", work: "Agar an Turk-e Shirazi" }
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
    blurb: "The “father of English poetry,” who proved that the English vernacular could rival French and Italian verse.",
    facts: [
      "Was captured during the Hundred Years’ War; Edward III helped pay his ransom.",
      "Served as controller of customs for the port of London.",
      "Popularized the iambic pentameter couplet in English.",
      "The first poet buried in what became Westminster Abbey’s Poets’ Corner."
    ],
    works: [
      { title: "The Canterbury Tales", year: "c. 1387–1400", note: "Unfinished frame tale in Middle English: pilgrims from all ranks of society trade stories on the road to Thomas Becket’s shrine." },
      { title: "Troilus and Criseyde", year: "c. 1385", note: "Long poem in rhyme royal on doomed love during the Trojan War, adapted from Boccaccio." },
      { title: "The Parlement of Foules", year: "c. 1382", note: "Dream vision in which birds gather on St. Valentine’s Day to choose their mates; one of the earliest links of the day with love." }
    ],
    lines: [
      { text: "Whan that Aprill with his shoures soote / The droghte of March hath perced to the roote", work: "The Canterbury Tales" },
      { text: "The lyf so short, the craft so long to lerne", work: "The Parlement of Foules" }
    ]
  },

  /* ───────────────────────── Early modern (c. 1450–1800) ───────────────────────── */

  {
    id: "shakespeare",
    name: "William Shakespeare",
    born: 1564,
    dates: "1564–1616",
    place: "England",
    group: "early-modern",
    tag: "Renaissance poetry",
    blurb: "England’s supreme dramatist was also its greatest sonneteer, perfecting the three-quatrains-and-a-couplet form.",
    facts: [
      "Born and buried in Stratford-upon-Avon.",
      "Part-owner of the Globe Theatre and a member of the Lord Chamberlain’s Men.",
      "His 154 sonnets were printed in 1609 with a cryptic dedication to “Mr. W. H.”",
      "Left his wife, Anne Hathaway, his “second-best bed” in his will."
    ],
    works: [
      { title: "Sonnet 18", year: "1609", note: "Compares a beloved young man to a summer’s day and promises him eternal life in verse." },
      { title: "Sonnet 116", year: "1609", note: "Defines true love as an “ever-fixed mark” that does not alter with time." },
      { title: "Sonnet 130", year: "1609", note: "Mock-blazon that refuses flattering clichés about a mistress, yet insists the love is rare." },
      { title: "Venus and Adonis", year: "1593", note: "Erotic narrative poem, dedicated to the Earl of Southampton, about the goddess of love wooing a reluctant youth." }
    ],
    lines: [
      { text: "Shall I compare thee to a summer’s day? / Thou art more lovely and more temperate", work: "Sonnet 18" },
      { text: "Let me not to the marriage of true minds / Admit impediments.", work: "Sonnet 116" },
      { text: "My mistress’ eyes are nothing like the sun", work: "Sonnet 130" }
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
    blurb: "The leading Metaphysical poet, famous for daring conceits, colloquial passion, and fierce religious sonnets.",
    facts: [
      "Born into a Catholic family but became an Anglican priest and Dean of St Paul’s Cathedral.",
      "His secret marriage to Anne More cost him his job and briefly landed him in prison.",
      "Posed in his burial shroud for the portrait used as the model for his funeral monument.",
      "Sailed with the Earl of Essex on expeditions to Cádiz and the Azores."
    ],
    works: [
      { title: "Holy Sonnets", year: "1633", note: "Nineteen religious sonnets of spiritual anguish, including a defiant address to Death itself." },
      { title: "A Valediction: Forbidding Mourning", year: "1633", note: "Parting poem to a wife that compares two lovers’ souls to the legs of a drawing compass." },
      { title: "The Flea", year: "1633", note: "Witty seduction poem arguing that, since a flea has mingled two lovers’ blood, sex would be no sin." },
      { title: "Devotions upon Emergent Occasions", year: "1624", note: "Prose meditations written during a near-fatal illness, as church bells toll for the dying." }
    ],
    lines: [
      { text: "Death, be not proud, though some have called thee / Mighty and dreadful, for thou art not so", work: "Holy Sonnets" },
      { text: "Thy firmness makes my circle just, / And makes me end where I begun.", work: "A Valediction: Forbidding Mourning" },
      { text: "No man is an island, entire of itself", work: "Devotions upon Emergent Occasions" }
    ]
  },

  {
    id: "herbert",
    name: "George Herbert",
    born: 1593,
    dates: "1593–1633",
    place: "England",
    group: "early-modern",
    tag: "Metaphysical poetry",
    blurb: "Welsh-born country parson whose quiet, intricate devotional lyrics are among the finest religious poems in English.",
    facts: [
      "Served as Public Orator of Cambridge University and sat in Parliament before turning to the Church.",
      "Spent his last years as rector of Bemerton, a small parish near Salisbury.",
      "On his deathbed sent his poems to Nicholas Ferrar of Little Gidding to publish or burn.",
      "Wrote shaped poems whose lines form pictures of wings and an altar on the page."
    ],
    works: [
      { title: "The Temple", year: "1633", note: "Posthumous collection of some 160 devotional poems tracing the soul’s struggles with God." },
      { title: "Love (III)", year: "1633", note: "Allegory in which Love, as a gracious host, coaxes a guilty guest to sit and eat." },
      { title: "The Collar", year: "1633", note: "A rebellious priest rants against his yoke of service until a single word from God calms him." },
      { title: "Easter Wings", year: "1633", note: "Shaped poem whose stanzas, printed sideways, look like two pairs of wings." }
    ],
    lines: [
      { text: "Love bade me welcome: yet my soul drew back, / Guilty of dust and sin.", work: "Love (III)" }
    ]
  },

  {
    id: "milton",
    name: "John Milton",
    born: 1608,
    dates: "1608–1674",
    place: "England",
    group: "early-modern",
    tag: "Epic poetry",
    blurb: "Puritan poet and pamphleteer who wrote the great English epic of the Fall of Man.",
    facts: [
      "Nicknamed “the Lady of Christ’s” as a student at Cambridge.",
      "Went completely blind around 1652 and dictated his later poetry to helpers.",
      "Served as Latin secretary to Oliver Cromwell’s government.",
      "Was briefly imprisoned after the Restoration of Charles II."
    ],
    works: [
      { title: "Paradise Lost", year: "1667", note: "Blank-verse epic of Satan’s rebellion and the temptation and fall of Adam and Eve, written “to justify the ways of God to men.”" },
      { title: "Lycidas", year: "1638", note: "Pastoral elegy for a Cambridge friend, Edward King, drowned in the Irish Sea." },
      { title: "On His Blindness", year: "1673", note: "Sonnet in which the poet frets that sightlessness has made his talent useless, and finds consolation in patience." },
      { title: "Paradise Regained", year: "1671", note: "Shorter epic of Christ resisting Satan’s temptations in the wilderness." }
    ],
    lines: [
      { text: "Of Man’s first disobedience, and the fruit / Of that forbidden tree", work: "Paradise Lost" },
      { text: "Better to reign in Hell, than serve in Heav’n.", work: "Paradise Lost" },
      { text: "They also serve who only stand and wait.", work: "On His Blindness" }
    ]
  },

  {
    id: "marvell",
    name: "Andrew Marvell",
    born: 1621,
    dates: "1621–1678",
    place: "England",
    group: "early-modern",
    tag: "Metaphysical poetry",
    blurb: "Witty Metaphysical poet and Puritan politician, best known for the most persuasive carpe diem poem in English.",
    facts: [
      "Assisted John Milton as Latin secretary under Cromwell and is credited with helping protect him after the Restoration.",
      "Sat as Member of Parliament for Hull for nearly twenty years.",
      "Tutored the young daughter of the parliamentary general Lord Fairfax at Nun Appleton House.",
      "Most of his lyrics appeared posthumously in 1681, published by his housekeeper, who claimed to be his widow."
    ],
    works: [
      { title: "To His Coy Mistress", year: "1681", note: "Seduction poem in three movements: if only there were time, but time is short, so let us seize the day." },
      { title: "The Garden", year: "1681", note: "Meditation on the solitude of a garden as a paradise of the mind, “a green thought in a green shade.”" },
      { title: "An Horatian Ode upon Cromwell’s Return from Ireland", year: "c. 1650", note: "Balanced political ode praising a victorious general while dignifying the beheaded Charles I." }
    ],
    lines: [
      { text: "Had we but world enough and time, / This coyness, lady, were no crime.", work: "To His Coy Mistress" },
      { text: "But at my back I always hear / Time’s wingèd chariot hurrying near", work: "To His Coy Mistress" },
      { text: "The grave’s a fine and private place, / But none, I think, do there embrace.", work: "To His Coy Mistress" }
    ]
  },

  {
    id: "basho",
    name: "Matsuo Bashō",
    born: 1644,
    dates: "1644–1694",
    place: "Japan",
    group: "early-modern",
    tag: "Haiku",
    blurb: "The master of the Japanese haiku, who turned a light verse game into a profound art of seeing.",
    facts: [
      "Took his pen name from a banana plant given to him by a student.",
      "Served as a page to a samurai family in Iga Province as a youth.",
      "Spent much of his later life traveling on foot across Japan.",
      "Died in Osaka on a journey; his last poem imagines his dreams wandering over withered fields."
    ],
    works: [
      { title: "The Old Pond", year: "1686", note: "The most famous haiku in Japanese: a frog leaps into still water, and the only event is a sound." },
      { title: "The Narrow Road to the Deep North", year: "1702", note: "Travel journal of prose and haiku recording a five-month walk through northern Japan in 1689." }
    ],
    lines: [
      { text: "furuike ya / kawazu tobikomu / mizu no oto", work: "The Old Pond" },
      { text: "natsukusa ya / tsuwamonodomo ga / yume no ato", work: "The Narrow Road to the Deep North" }
    ]
  },

  {
    id: "pope",
    name: "Alexander Pope",
    born: 1688,
    dates: "1688–1744",
    place: "England",
    group: "early-modern",
    tag: "Neoclassicism",
    blurb: "The dominant poet of the English Augustan age, master of the polished heroic couplet and satirical wit.",
    facts: [
      "As a Roman Catholic was barred from university, public office, and living within ten miles of London.",
      "Stunted by tuberculosis of the spine, he grew to only about four and a half feet tall.",
      "Earned a fortune from his translations of Homer’s epics.",
      "Built a celebrated grotto beneath his villa at Twickenham."
    ],
    works: [
      { title: "The Rape of the Lock", year: "1712", note: "Mock-epic in heroic couplets about a society quarrel after a young baron snips a curl from a beauty’s head." },
      { title: "An Essay on Criticism", year: "1711", note: "Verse treatise on taste and literary judgment, written when the poet was barely twenty-one." },
      { title: "An Essay on Man", year: "1733–34", note: "Philosophical poem in four epistles arguing that “whatever is, is right” in a divinely ordered universe." },
      { title: "The Dunciad", year: "1728", note: "Mock-heroic satire crowning the goddess Dulness’s champion, a dull hack poet, and pillorying rival writers." }
    ],
    lines: [
      { text: "A little learning is a dang’rous thing; / Drink deep, or taste not the Pierian spring", work: "An Essay on Criticism" },
      { text: "To err is human, to forgive divine.", work: "An Essay on Criticism" },
      { text: "Hope springs eternal in the human breast", work: "An Essay on Man" }
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
    blurb: "Germany’s greatest poet, whose lyrics, ballads, and verse drama span Sturm und Drang to Weimar Classicism.",
    facts: [
      "Served for decades as a minister at the ducal court of Weimar.",
      "Franz Schubert set more than seventy of his poems as songs.",
      "Close friend and collaborator of the playwright Friedrich Schiller.",
      "At 74 proposed to the 19-year-old Ulrike von Levetzow, who declined."
    ],
    works: [
      { title: "Faust", year: "1808", note: "Two-part verse drama of a scholar who wagers his soul with Mephistopheles; worked on for about sixty years." },
      { title: "The Erl-King", year: "1782", note: "Ballad of a father riding through the night with a feverish son who is lured to death by a supernatural king." },
      { title: "Wanderer’s Night Song", year: "c. 1780", note: "Eight-line lyric penciled on a hut wall on a mountain: the hills and birds are hushed, and soon you too will rest." },
      { title: "Roman Elegies", year: "1795", note: "Sensual cycle in classical elegiac couplets celebrating love and art during a stay in Rome." }
    ],
    lines: [
      { text: "Wer reitet so spät durch Nacht und Wind? / Es ist der Vater mit seinem Kind", work: "The Erl-King" },
      { text: "Über allen Gipfeln / Ist Ruh", work: "Wanderer’s Night Song" },
      { text: "Zwei Seelen wohnen, ach! in meiner Brust", work: "Faust" }
    ]
  },

  {
    id: "wheatley",
    name: "Phillis Wheatley",
    born: 1753,
    dates: "c. 1753–1784",
    place: "United States",
    group: "early-modern",
    tag: "Neoclassicism",
    blurb: "An enslaved African girl in Boston who became the first African American woman to publish a book of poetry.",
    facts: [
      "Kidnapped from West Africa as a child and sold in Boston in 1761.",
      "Was named after the slave ship that brought her across the Atlantic.",
      "Had to prove her authorship before a panel of eminent Boston men, including John Hancock.",
      "Wrote a poem to George Washington, who invited her to visit him at his headquarters."
    ],
    works: [
      { title: "Poems on Various Subjects, Religious and Moral", year: "1773", note: "Debut collection, printed in London, of elegies, hymns, and occasional verse in neoclassical couplets." },
      { title: "On Being Brought from Africa to America", year: "1773", note: "Eight-line poem on conversion and a rebuke to those who view Black people with “scornful eye.”" },
      { title: "To His Excellency General Washington", year: "1776", note: "Heroic-couplet tribute to the commander of the Continental Army." }
    ],
    lines: [
      { text: "’Twas mercy brought me from my Pagan land, / Taught my benighted soul to understand", work: "On Being Brought from Africa to America" }
    ]
  },

  {
    id: "blake",
    name: "William Blake",
    born: 1757,
    dates: "1757–1827",
    place: "England",
    group: "early-modern",
    tag: "Romanticism",
    blurb: "Visionary poet, painter, and engraver whose mystical, radical works were ignored in his lifetime and revered after.",
    facts: [
      "Trained as an engraver and printed his books by a relief-etching method he devised.",
      "Claimed visions from childhood, including a tree full of angels at Peckham Rye.",
      "Was tried for sedition in 1804 after a quarrel with a soldier, and acquitted.",
      "Died in poverty and lies in Bunhill Fields in London."
    ],
    works: [
      { title: "Songs of Innocence and of Experience", year: "1794", note: "Illuminated lyrics “shewing the two contrary states of the human soul,” paired poems like the Lamb and the Chimney Sweeper." },
      { title: "The Tyger", year: "1794", note: "Questions what immortal creator could forge so terrible a beast—and whether the same hand made the lamb." },
      { title: "The Marriage of Heaven and Hell", year: "c. 1790", note: "Prophetic prose-poem satirizing conventional morality, with its subversive “Proverbs of Hell.”" },
      { title: "Auguries of Innocence", year: "c. 1803", note: "Sequence of couplet paradoxes on cruelty, innocence, and seeing infinity in small things." }
    ],
    lines: [
      { text: "What immortal hand or eye, / Could frame thy fearful symmetry?", work: "The Tyger" },
      { text: "To see a World in a Grain of Sand / And a Heaven in a Wild Flower", work: "Auguries of Innocence" },
      { text: "The road of excess leads to the palace of wisdom.", work: "The Marriage of Heaven and Hell" }
    ]
  },

  {
    id: "burns",
    name: "Robert Burns",
    born: 1759,
    dates: "1759–1796",
    place: "Scotland",
    group: "early-modern",
    tag: "Romanticism",
    blurb: "Scotland’s national poet, the “Ploughman Poet,” who wrote in Scots of love, drink, and the dignity of common folk.",
    facts: [
      "Son of a tenant farmer in Alloway, Ayrshire, he worked the land as a young man.",
      "His first book was printed in Kilmarnock in 1786 to fund a planned emigration to Jamaica.",
      "Worked as an excise officer in Dumfries in his last years.",
      "His birthday, 25 January, is celebrated worldwide with suppers of haggis."
    ],
    works: [
      { title: "Auld Lang Syne", year: "c. 1788", note: "Song of old friendship, adapted from a folk tune and sung around the world at New Year." },
      { title: "To a Mouse", year: "1786", note: "A farmer apologizes to a field mouse whose nest his plough has destroyed, and reflects on the futility of plans." },
      { title: "A Red, Red Rose", year: "1794", note: "Love song promising devotion until the seas run dry and the rocks melt with the sun." },
      { title: "Tam o’ Shanter", year: "1791", note: "Comic narrative poem of a drunken farmer who spies on a witches’ dance and flees on his mare, Meg." }
    ],
    lines: [
      { text: "Should auld acquaintance be forgot, / And never brought to mind?", work: "Auld Lang Syne" },
      { text: "The best-laid schemes o’ mice an’ men / Gang aft agley", work: "To a Mouse" }
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
    blurb: "The great poet of nature and memory who, with Coleridge, launched English Romanticism.",
    facts: [
      "Lived for decades in the Lake District, at Dove Cottage and then Rydal Mount.",
      "Served as Poet Laureate from 1843 until his death.",
      "Fathered a daughter with Annette Vallon during a stay in revolutionary France.",
      "His sister Dorothy’s journals inspired several of his poems."
    ],
    works: [
      { title: "Lyrical Ballads", year: "1798", note: "Joint collection with Coleridge in plain language about rural life; its 1800 preface became a Romantic manifesto." },
      { title: "I Wandered Lonely as a Cloud", year: "1807", note: "Lyric recalling a field of daffodils by a lake, which later flash upon “that inward eye.”" },
      { title: "Ode: Intimations of Immortality", year: "1807", note: "Great irregular ode lamenting the fading of childhood’s visionary gleam and finding consolation in memory." },
      { title: "The Prelude", year: "1850", note: "Autobiographical blank-verse epic on “the growth of a poet’s mind,” published posthumously." }
    ],
    lines: [
      { text: "When all at once I saw a crowd, / A host, of golden daffodils", work: "I Wandered Lonely as a Cloud" },
      { text: "Our birth is but a sleep and a forgetting", work: "Ode: Intimations of Immortality" },
      { text: "all good poetry is the spontaneous overflow of powerful feelings", work: "Lyrical Ballads" }
    ]
  },

  {
    id: "coleridge",
    name: "Samuel Taylor Coleridge",
    born: 1772,
    dates: "1772–1834",
    place: "England",
    group: "19th",
    tag: "Romanticism",
    blurb: "Visionary Romantic poet and critic whose supernatural poems and philosophy reshaped English literature.",
    facts: [
      "Fled Cambridge and enlisted in the dragoons under the alias “Silas Tomkyn Comberbache.”",
      "Planned with Robert Southey a utopian commune, “Pantisocracy,” on the Susquehanna River.",
      "Claimed a poem came to him in an opium dream until interrupted by “a person on business from Porlock.”",
      "Fought opium addiction for decades and spent his last years in a doctor’s home in Highgate."
    ],
    works: [
      { title: "The Rime of the Ancient Mariner", year: "1798", note: "Ballad of a sailor who shoots an albatross and is cursed to wander and tell his tale." },
      { title: "Kubla Khan", year: "1816", note: "Unfinished visionary fragment about a pleasure-dome in Xanadu, subtitled “A Vision in a Dream.”" },
      { title: "Frost at Midnight", year: "1798", note: "Conversation poem addressed to a sleeping infant son, imagining him growing up among lakes and mountains." },
      { title: "Biographia Literaria", year: "1817", note: "Literary autobiography and criticism distinguishing imagination from fancy." }
    ],
    lines: [
      { text: "Water, water, every where, / Nor any drop to drink.", work: "The Rime of the Ancient Mariner" },
      { text: "And all should cry, Beware! Beware! / His flashing eyes, his floating hair!", work: "Kubla Khan" },
      { text: "that willing suspension of disbelief for the moment, which constitutes poetic faith", work: "Biographia Literaria" }
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
    blurb: "The celebrity Romantic whose brooding heroes and scandalous life made him the most famous poet in Europe.",
    facts: [
      "Lady Caroline Lamb called him “mad, bad, and dangerous to know.”",
      "Father of the mathematician Ada Lovelace.",
      "Swam the Hellespont in 1810 in imitation of the legend of Leander.",
      "Died of fever at Missolonghi while supporting the Greek War of Independence."
    ],
    works: [
      { title: "Don Juan", year: "1819–24", note: "Unfinished comic epic in ottava rima following a charming young Spaniard across Europe, full of satirical digressions." },
      { title: "Childe Harold’s Pilgrimage", year: "1812–18", note: "Travel poem in Spenserian stanzas about a world-weary wanderer; its success made the author famous overnight." },
      { title: "She Walks in Beauty", year: "1815", note: "Lyric praising a woman whose beauty unites dark and light, outward grace and inner goodness." },
      { title: "The Destruction of Sennacherib", year: "1815", note: "Galloping anapestic poem on the biblical destruction of an Assyrian army besieging Jerusalem." }
    ],
    lines: [
      { text: "And all that’s best of dark and bright / Meet in her aspect and her eyes", work: "She Walks in Beauty" },
      { text: "The Assyrian came down like the wolf on the fold", work: "The Destruction of Sennacherib" },
      { text: "’Tis strange—but true; for truth is always strange; / Stranger than fiction", work: "Don Juan" }
    ]
  },

  {
    id: "percy-shelley",
    name: "Percy Bysshe Shelley",
    born: 1792,
    dates: "1792–1822",
    place: "England",
    group: "19th",
    tag: "Romanticism",
    blurb: "Radical, idealistic Romantic lyricist who championed political freedom and the prophetic power of poetry.",
    facts: [
      "Expelled from Oxford in 1811 for co-writing a pamphlet defending atheism.",
      "Eloped with the 16-year-old Mary Godwin, future author of Frankenstein.",
      "Drowned at 29 when his sailboat sank in a storm in the Gulf of La Spezia.",
      "His heart was reportedly snatched from his funeral pyre by his friend Edward Trelawny."
    ],
    works: [
      { title: "Ozymandias", year: "1818", note: "Sonnet about a shattered statue of a boastful pharaoh lying in the desert sands." },
      { title: "Ode to the West Wind", year: "1820", note: "Ode in terza rima sonnets invoking the wind as destroyer and preserver to scatter the poet’s words like seeds." },
      { title: "Adonais", year: "1821", note: "Pastoral elegy for John Keats, blaming hostile reviewers for his death." },
      { title: "Prometheus Unbound", year: "1820", note: "Lyrical drama in which the Titan who gave fire to humanity is freed and tyranny overthrown." },
      { title: "A Defence of Poetry", year: "1840", note: "Essay arguing that poets, through imagination, are the moral shapers of society." }
    ],
    lines: [
      { text: "Nothing beside remains. Round the decay / Of that colossal Wreck, boundless and bare / The lone and level sands stretch far away.", work: "Ozymandias" },
      { text: "If Winter comes, can Spring be far behind?", work: "Ode to the West Wind" },
      { text: "Poets are the unacknowledged legislators of the World.", work: "A Defence of Poetry" }
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
    blurb: "The youngest of the great Romantics, whose sensuous odes are among the most perfect poems in English.",
    facts: [
      "Trained as an apothecary-surgeon at Guy’s Hospital before devoting himself to poetry.",
      "Died of tuberculosis in Rome at 25.",
      "Asked that his gravestone read: “Here lies One Whose Name was writ in Water.”",
      "Coined the phrase “negative capability” in a letter to his brothers."
    ],
    works: [
      { title: "Ode to a Nightingale", year: "1819", note: "A poet longs to escape mortal suffering by following a bird’s song, then is tolled back to himself." },
      { title: "Ode on a Grecian Urn", year: "1820", note: "Meditation on scenes painted on an ancient vase, frozen forever in art." },
      { title: "To Autumn", year: "1820", note: "Three stanzas on autumn’s ripeness, harvest, and fading music; often called the most perfect short poem in English." },
      { title: "On First Looking into Chapman’s Homer", year: "1816", note: "Sonnet comparing the thrill of reading an Elizabethan translation of Greek epic to discovering a new planet or ocean." },
      { title: "Endymion", year: "1818", note: "Long romance about a shepherd loved by the moon goddess, savaged by reviewers." }
    ],
    lines: [
      { text: "“Beauty is truth, truth beauty,”—that is all / Ye know on earth, and all ye need to know.", work: "Ode on a Grecian Urn" },
      { text: "Season of mists and mellow fruitfulness", work: "To Autumn" },
      { text: "A thing of beauty is a joy for ever", work: "Endymion" }
    ]
  },

  {
    id: "heine",
    name: "Heinrich Heine",
    born: 1797,
    dates: "1797–1856",
    place: "Germany",
    group: "19th",
    tag: "Romanticism",
    blurb: "German lyric poet and satirist whose ironic, songlike verse made him one of the most set-to-music poets ever.",
    facts: [
      "Born to a Jewish family in Düsseldorf; converted to Protestantism in 1825 as his “ticket of admission” to European culture.",
      "Lived in exile in Paris from 1831 until his death.",
      "Spent his last eight years bedridden in what he called his “mattress-grave.”",
      "Robert Schumann’s song cycle Dichterliebe sets sixteen of his poems."
    ],
    works: [
      { title: "Book of Songs", year: "1827", note: "Hugely popular collection of short, folk-song-like lyrics of unrequited love, undercut with irony." },
      { title: "Die Lorelei", year: "1824", note: "Ballad of a golden-haired siren on a Rhine cliff whose singing lures boatmen to their deaths." },
      { title: "Germany. A Winter’s Tale", year: "1844", note: "Satirical verse epic of a journey home from Paris, mocking Prussian reaction and German nationalism." },
      { title: "Almansor", year: "1823", note: "Tragedy set in Moorish Spain after the Christian conquest, containing a prophetic line on book burning." }
    ],
    lines: [
      { text: "Ich weiß nicht, was soll es bedeuten, / Daß ich so traurig bin", work: "Die Lorelei" },
      { text: "Dort, wo man Bücher verbrennt, verbrennt man auch am Ende Menschen.", work: "Almansor" }
    ]
  },

  {
    id: "pushkin",
    name: "Alexander Pushkin",
    born: 1799,
    dates: "1799–1837",
    place: "Russia",
    group: "19th",
    tag: "Romanticism",
    blurb: "Russia’s national poet, who forged the modern Russian literary language.",
    facts: [
      "His great-grandfather, Abram Gannibal, was an African brought to Russia as a page for Peter the Great.",
      "Was exiled to southern Russia in 1820 for his political poems.",
      "Was killed in a duel with Georges d’Anthès, who had been courting his wife."
    ],
    works: [
      { title: "Eugene Onegin", year: "1833", note: "Novel in verse, written in its own fourteen-line stanza, about a jaded dandy who rejects Tatyana’s love." },
      { title: "The Bronze Horseman", year: "1837", note: "Narrative poem in which a poor clerk, ruined by the 1824 St. Petersburg flood, is pursued by Peter the Great’s statue." },
      { title: "Boris Godunov", year: "1831", note: "Shakespearean-style verse drama about a tsar haunted by the murder of the heir to the throne." },
      { title: "I Loved You", year: "1830", note: "Eight-line lyric renouncing a beloved with tender generosity, wishing her another’s equal love." }
    ],
    lines: [
      { text: "Люблю тебя, Петра творенье", work: "The Bronze Horseman" }
    ]
  },

  {
    id: "elizabeth-barrett-browning",
    name: "Elizabeth Barrett Browning",
    born: 1806,
    dates: "1806–1861",
    place: "England",
    group: "19th",
    tag: "Victorian poetry",
    blurb: "The most famous woman poet of Victorian England, admired for her love sonnets and her social conscience.",
    facts: [
      "Lived for years as an invalid in her room on Wimpole Street under a domineering father.",
      "Eloped to Italy in 1846 with a younger poet; her father never forgave her.",
      "Settled in Florence at Casa Guidi and championed Italian unification.",
      "Was proposed in the press for Poet Laureate in 1850."
    ],
    works: [
      { title: "Sonnets from the Portuguese", year: "1850", note: "Sequence of forty-four love sonnets written during a secret courtship, disguised as translations." },
      { title: "Aurora Leigh", year: "1856", note: "Novel in blank verse about the life and career of a woman poet." },
      { title: "The Cry of the Children", year: "1843", note: "Protest poem against child labor in mines and factories." }
    ],
    lines: [
      { text: "How do I love thee? Let me count the ways.", work: "Sonnets from the Portuguese" },
      { text: "Earth’s crammed with heaven, / And every common bush afire with God", work: "Aurora Leigh" }
    ]
  },

  {
    id: "longfellow",
    name: "Henry Wadsworth Longfellow",
    born: 1807,
    dates: "1807–1882",
    place: "United States",
    group: "19th",
    tag: "Fireside Poets",
    blurb: "The most popular American poet of the 19th century, who gave the young nation its narrative legends in verse.",
    facts: [
      "Taught modern languages at Bowdoin College and then for eighteen years at Harvard.",
      "Was badly burned trying to save his second wife when her dress caught fire, and grew a beard to hide the scars.",
      "Produced the first complete American translation of Dante’s Divine Comedy.",
      "The only American poet honored with a bust in Westminster Abbey’s Poets’ Corner."
    ],
    works: [
      { title: "Paul Revere’s Ride", year: "1860", note: "Galloping narrative of a silversmith’s midnight warning to the Massachusetts countryside in 1775." },
      { title: "The Song of Hiawatha", year: "1855", note: "Epic in trochaic tetrameter about a Native American hero and his love, Minnehaha, by Lake Superior; its meter echoes the Finnish Kalevala." },
      { title: "Evangeline", year: "1847", note: "Epic in dactylic hexameter of an Acadian woman searching for her lover after the British expulsion of 1755." },
      { title: "A Psalm of Life", year: "1838", note: "Upbeat lyric urging readers to act in the living present and leave footprints on the sands of time." }
    ],
    lines: [
      { text: "Listen, my children, and you shall hear / Of the midnight ride of Paul Revere", work: "Paul Revere’s Ride" },
      { text: "By the shores of Gitche Gumee, / By the shining Big-Sea-Water", work: "The Song of Hiawatha" },
      { text: "This is the forest primeval.", work: "Evangeline" }
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
    blurb: "American master of the macabre whose musical, hypnotic poems influenced the French Symbolists.",
    facts: [
      "Orphaned at two and taken in by a Richmond tobacco merchant.",
      "Married his 13-year-old cousin, Virginia Clemm.",
      "Argued that the death of a beautiful woman is “the most poetical topic in the world.”",
      "Was found delirious in Baltimore days before his death; the cause remains a mystery."
    ],
    works: [
      { title: "The Raven", year: "1845", note: "A grieving student is visited at midnight by a bird that answers every question with one word." },
      { title: "Annabel Lee", year: "1849", note: "Ballad of a love so strong that angels envied it and sent a chill wind to kill the beloved." },
      { title: "The Bells", year: "1849", note: "Onomatopoeic poem tracing life through sleigh, wedding, alarm, and funeral bells." },
      { title: "The Philosophy of Composition", year: "1846", note: "Essay claiming that a famous poem was built step by step like a math problem, for a single effect." }
    ],
    lines: [
      { text: "Once upon a midnight dreary, while I pondered, weak and weary", work: "The Raven" },
      { text: "It was many and many a year ago, / In a kingdom by the sea", work: "Annabel Lee" }
    ]
  },

  {
    id: "tennyson",
    name: "Alfred, Lord Tennyson",
    born: 1809,
    dates: "1809–1892",
    place: "England",
    group: "19th",
    tag: "Victorian poetry",
    blurb: "The voice of Victorian England, whose musical verse captured the era’s doubts, grief, and imperial pride.",
    facts: [
      "Served as Poet Laureate from 1850 to 1892, the longest tenure of any holder.",
      "Wrote one long elegy over seventeen years after the sudden death of his Cambridge friend Arthur Hallam.",
      "Belonged at Cambridge to the Apostles, an elite discussion society.",
      "Recorded readings of his poems on Edison wax cylinders around 1890."
    ],
    works: [
      { title: "In Memoriam A.H.H.", year: "1850", note: "Elegy in 131 sections tracing grief, religious doubt, and the threat of Darwinian nature toward renewed faith." },
      { title: "Ulysses", year: "1842", note: "Dramatic monologue of the aging Odysseus, restless at home and resolved to sail once more." },
      { title: "The Charge of the Light Brigade", year: "1854", note: "Ballad honoring British cavalry destroyed by a blundered order at Balaclava in the Crimean War." },
      { title: "The Lady of Shalott", year: "1832", note: "Arthurian ballad of a cursed woman who weaves a world seen only in a mirror until she looks at Lancelot." },
      { title: "Idylls of the King", year: "1859–85", note: "Blank-verse cycle retelling the rise and fall of King Arthur’s Round Table." }
    ],
    lines: [
      { text: "’Tis better to have loved and lost / Than never to have loved at all.", work: "In Memoriam A.H.H." },
      { text: "To strive, to seek, to find, and not to yield.", work: "Ulysses" },
      { text: "Theirs not to reason why, / Theirs but to do and die", work: "The Charge of the Light Brigade" }
    ]
  },

  {
    id: "robert-browning",
    name: "Robert Browning",
    born: 1812,
    dates: "1812–1889",
    place: "England",
    group: "19th",
    tag: "Victorian poetry",
    blurb: "Victorian master of the dramatic monologue, in which speakers unwittingly reveal their own characters.",
    facts: [
      "Courted the invalid poet Elizabeth Barrett through hundreds of letters before eloping with her to Italy in 1846.",
      "Based his longest poem on a 1698 Roman murder trial documented in an old yellow book bought at a Florence market stall.",
      "Died in Venice on the day his last collection was published.",
      "Is buried in Poets’ Corner in Westminster Abbey."
    ],
    works: [
      { title: "My Last Duchess", year: "1842", note: "A Renaissance duke, showing a portrait to an envoy, hints that he had his late wife killed." },
      { title: "The Ring and the Book", year: "1868–69", note: "Twelve-book verse novel in which a murder case is retold by its participants and observers." },
      { title: "Andrea del Sarto", year: "1855", note: "Monologue of the flawless but uninspired “faultless painter,” henpecked and resigned." },
      { title: "Porphyria’s Lover", year: "1836", note: "A madman calmly recounts strangling his lover with her own hair to preserve a perfect moment." },
      { title: "Home-Thoughts, from Abroad", year: "1845", note: "Lyric of homesickness for an English spring." }
    ],
    lines: [
      { text: "I gave commands; / Then all smiles stopped together.", work: "My Last Duchess" },
      { text: "Ah, but a man’s reach should exceed his grasp, / Or what’s a heaven for?", work: "Andrea del Sarto" },
      { text: "Oh, to be in England / Now that April’s there", work: "Home-Thoughts, from Abroad" }
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
    blurb: "The poet of American democracy and the body, who invented a sweeping free verse to contain multitudes.",
    facts: [
      "Worked as a printer, teacher, and newspaper editor in Brooklyn.",
      "Self-published his first book in 1855 and kept revising and expanding it for the rest of his life.",
      "Ralph Waldo Emerson greeted his debut: “I greet you at the beginning of a great career.”",
      "Volunteered as a nurse in Washington’s military hospitals during the Civil War."
    ],
    works: [
      { title: "Leaves of Grass", year: "1855", note: "Lifelong collection of free-verse poems celebrating the self, the body, democracy, and America, expanded across nine editions." },
      { title: "Song of Myself", year: "1855", note: "Long free-verse centerpiece in which a cosmic “I” embraces every person, place, and occupation in America." },
      { title: "When Lilacs Last in the Dooryard Bloom’d", year: "1865", note: "Pastoral elegy for Abraham Lincoln built around a star, a thrush, and a sprig of lilac." },
      { title: "O Captain! My Captain!", year: "1865", note: "Rhymed elegy imagining the assassinated Lincoln as a captain dead on deck as his ship comes home." },
      { title: "Crossing Brooklyn Ferry", year: "1856", note: "A ferry passenger addresses future crowds who will make the same crossing." }
    ],
    lines: [
      { text: "I celebrate myself, and sing myself", work: "Song of Myself" },
      { text: "Do I contradict myself? / Very well then I contradict myself, / (I am large, I contain multitudes.)", work: "Song of Myself" }
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
    blurb: "French poet of urban modernity, sin, and ennui, whose one great book founded modern poetry.",
    facts: [
      "Translated Edgar Allan Poe’s tales into French.",
      "Squandered his inheritance and was placed under a court-appointed financial guardian.",
      "Was fined, and six of his poems banned, for offending public morals in 1857.",
      "Died at 46 after a stroke left him partly paralyzed and unable to speak."
    ],
    works: [
      { title: "Les Fleurs du mal", year: "1857", note: "Collection of poems on beauty, decadence, Paris, and ennui, prosecuted for obscenity on publication." },
      { title: "Correspondences", year: "1857", note: "Sonnet on nature as a “forest of symbols” in which scents, colors, and sounds answer one another; a Symbolist manifesto." },
      { title: "Paris Spleen", year: "1869", note: "Posthumous collection of prose poems sketching Parisian street life." }
    ],
    lines: [
      { text: "Hypocrite lecteur,—mon semblable,—mon frère!", work: "Les Fleurs du mal" },
      { text: "La Nature est un temple où de vivants piliers / Laissent parfois sortir de confuses paroles", work: "Correspondences" }
    ]
  },

  {
    id: "matthew-arnold",
    name: "Matthew Arnold",
    born: 1822,
    dates: "1822–1888",
    place: "England",
    group: "19th",
    tag: "Victorian poetry",
    blurb: "Victorian poet and critic who voiced the age’s crisis of faith and championed culture as its remedy.",
    facts: [
      "Son of the reforming headmaster of Rugby School.",
      "Worked for thirty-five years as a government inspector of schools.",
      "Was elected Oxford Professor of Poetry in 1857.",
      "Defined culture as “the best which has been thought and said in the world.”"
    ],
    works: [
      { title: "Dover Beach", year: "1867", note: "A speaker at a moonlit window hears the retreating tide as the ebbing of religious faith, and turns to love." },
      { title: "The Scholar-Gipsy", year: "1853", note: "Pastoral poem about a legendary Oxford student who left to roam with Romani people, contrasted with modern “sick hurry.”" },
      { title: "Culture and Anarchy", year: "1869", note: "Essays attacking middle-class “Philistines” and calling for “sweetness and light.”" }
    ],
    lines: [
      { text: "The Sea of Faith / Was once, too, at the full", work: "Dover Beach" },
      { text: "And we are here as on a darkling plain / Swept with confused alarms of struggle and flight, / Where ignorant armies clash by night.", work: "Dover Beach" }
    ]
  },

  {
    id: "dickinson",
    name: "Emily Dickinson",
    born: 1830,
    dates: "1830–1886",
    place: "United States",
    group: "19th",
    tag: "Lyric poetry",
    blurb: "Reclusive New England genius whose compressed, dash-filled lyrics on death, faith, and the self were almost all published after she died.",
    facts: [
      "Spent most of her adult life in her family home in Amherst, Massachusetts, rarely seeing visitors.",
      "Fewer than a dozen of her nearly 1,800 poems were published in her lifetime.",
      "Her sister Lavinia discovered her hand-sewn booklets of poems after her death.",
      "Favored dashes, slant rhyme, and hymn meter, and often dressed in white."
    ],
    works: [
      { title: "Because I could not stop for Death", year: "1890", note: "Death appears as a courteous gentleman caller who drives the speaker in a carriage toward eternity." },
      { title: "Hope is the thing with feathers", year: "1891", note: "Extended metaphor of hope as a small bird singing in the soul that never asks for a crumb." },
      { title: "I heard a Fly buzz – when I died", year: "1896", note: "A deathbed scene in which the expected solemn moment is interrupted by an ordinary insect." },
      { title: "There’s a certain Slant of light", year: "1890", note: "Winter-afternoon light brings a “Heavenly Hurt” and the look of death." },
      { title: "I’m Nobody! Who are you?", year: "1891", note: "Playful lyric mocking the dreariness of being a public “Somebody,” croaking like a frog." }
    ],
    lines: [
      { text: "He kindly stopped for me – / The Carriage held but just Ourselves – / And Immortality.", work: "Because I could not stop for Death" },
      { text: "And sings the tune without the words – / And never stops – at all –", work: "Hope is the thing with feathers" },
      { text: "And then the Windows failed – and then / I could not see to see –", work: "I heard a Fly buzz – when I died" }
    ]
  },

  {
    id: "christina-rossetti",
    name: "Christina Rossetti",
    born: 1830,
    dates: "1830–1894",
    place: "England",
    group: "19th",
    tag: "Pre-Raphaelites",
    blurb: "Victorian poet of devotion, renunciation, and fairy-tale strangeness, linked to the Pre-Raphaelite circle.",
    facts: [
      "Sister of the painter-poet who co-founded the Pre-Raphaelite Brotherhood.",
      "Modeled for the Virgin Mary in two of her brother’s paintings.",
      "Broke off engagements to two suitors, partly on religious grounds.",
      "Volunteered for years at a Highgate refuge for “fallen women.”"
    ],
    works: [
      { title: "Goblin Market", year: "1862", note: "Narrative poem of two sisters, one of whom eats enchanted fruit sold by goblin men and is saved by the other." },
      { title: "In the Bleak Midwinter", year: "1872", note: "Christmas poem of the Nativity in a frozen landscape, later a beloved carol." },
      { title: "Remember", year: "1862", note: "Sonnet asking a beloved to keep her in mind after death, yet preferring that he forget and smile than grieve." },
      { title: "Up-Hill", year: "1861", note: "Question-and-answer poem in which the road of life leads to an inn with beds for all." }
    ],
    lines: [
      { text: "Come buy our orchard fruits, / Come buy, come buy", work: "Goblin Market" },
      { text: "What can I give Him, / Poor as I am?", work: "In the Bleak Midwinter" }
    ]
  },

  {
    id: "hardy",
    name: "Thomas Hardy",
    born: 1840,
    dates: "1840–1928",
    place: "England",
    group: "19th",
    tag: "Victorian poetry",
    blurb: "The great novelist turned poet, whose bleak, plainspoken lyrics bridged Victorian and modern verse.",
    facts: [
      "Trained and worked as an architect before turning to writing.",
      "Gave up novels for poetry after the hostile reception of his last novel in 1895.",
      "Wrote a sequence of grief-stricken poems after the death of his estranged first wife, Emma, in 1912.",
      "His heart was buried at Stinsford with his first wife, and his ashes in Westminster Abbey."
    ],
    works: [
      { title: "The Darkling Thrush", year: "1900", note: "Written for the turn of the century: a frail bird sings joyfully over a desolate winter landscape." },
      { title: "The Convergence of the Twain", year: "1912", note: "Poem on the Titanic and the iceberg, fated partners brought together by the “Immanent Will.”" },
      { title: "Channel Firing", year: "1914", note: "Naval gunnery practice wakes the dead in a churchyard, who think it is Judgment Day." },
      { title: "Poems of 1912–13", year: "1914", note: "Elegiac sequence revisiting places of courtship in Cornwall after a wife’s death." }
    ],
    lines: [
      { text: "An aged thrush, frail, gaunt, and small, / In blast-beruffled plume", work: "The Darkling Thrush" },
      { text: "In a solitude of the sea / Deep from human vanity", work: "The Convergence of the Twain" }
    ]
  },

  {
    id: "mallarme",
    name: "Stéphane Mallarmé",
    born: 1842,
    dates: "1842–1898",
    place: "France",
    group: "19th",
    tag: "Symbolism",
    blurb: "High priest of French Symbolism, whose difficult, musical poems pursued pure poetry and influenced modernism.",
    facts: [
      "Earned his living for decades as an English teacher in provincial and Paris schools.",
      "Hosted the famous Tuesday salons (“mardis”) in his rue de Rome apartment.",
      "Inspired Claude Debussy’s 1894 orchestral prelude.",
      "Spread a late poem across the page in varied typefaces, anticipating visual poetry."
    ],
    works: [
      { title: "L’Après-midi d’un faune", year: "1876", note: "Dreamy eclogue in which a faun recalls, or imagines, an encounter with nymphs." },
      { title: "Un coup de dés jamais n’abolira le hasard", year: "1897", note: "Typographically scattered poem about chance and a shipwreck, a landmark of avant-garde layout." },
      { title: "Brise marine", year: "1866", note: "Poem of weariness with books and home, longing to sail away to exotic lands." },
      { title: "Le Tombeau d’Edgar Poe", year: "1877", note: "Sonnet-epitaph for an American poet misunderstood by his own country." }
    ],
    lines: [
      { text: "La chair est triste, hélas! et j’ai lu tous les livres.", work: "Brise marine" },
      { text: "Donner un sens plus pur aux mots de la tribu", work: "Le Tombeau d’Edgar Poe" }
    ]
  },

  {
    id: "hopkins",
    name: "Gerard Manley Hopkins",
    born: 1844,
    dates: "1844–1889",
    place: "England",
    group: "19th",
    tag: "Victorian poetry",
    blurb: "Jesuit priest-poet whose densely musical, rhythmically daring poems were published only decades after his death.",
    facts: [
      "Converted to Catholicism at Oxford under John Henry Newman and became a Jesuit priest.",
      "Burned his early poems on entering the Jesuit order, later resuming poetry.",
      "Coined the term “sprung rhythm” for his stress-based meter.",
      "Died of typhoid in Dublin, where he was professor of Greek."
    ],
    works: [
      { title: "The Windhover", year: "1918", note: "Sonnet dedicated “To Christ our Lord,” celebrating a kestrel’s mastery of the wind." },
      { title: "God’s Grandeur", year: "1918", note: "Sonnet on divine glory persisting in a world seared by trade and toil." },
      { title: "Pied Beauty", year: "1918", note: "Curtal sonnet praising God for dappled, freckled, and varied things." },
      { title: "The Wreck of the Deutschland", year: "1918", note: "Ode on a shipwreck that drowned five exiled Franciscan nuns in 1875; his first mature poem." }
    ],
    lines: [
      { text: "The world is charged with the grandeur of God.", work: "God’s Grandeur" },
      { text: "Glory be to God for dappled things", work: "Pied Beauty" },
      { text: "I caught this morning morning’s minion", work: "The Windhover" }
    ]
  },

  {
    id: "verlaine",
    name: "Paul Verlaine",
    born: 1844,
    dates: "1844–1896",
    place: "France",
    group: "19th",
    tag: "Symbolism",
    blurb: "French Symbolist celebrated for the delicate musicality of his verse and his turbulent, scandal-ridden life.",
    facts: [
      "Had a stormy affair with the teenage Arthur Rimbaud, ending when he shot him in the wrist in Brussels in 1873.",
      "Served about eighteen months in Belgian prisons, where he returned to Catholicism.",
      "Lines of his were broadcast by the BBC to alert the French Resistance before D-Day.",
      "Was elected “Prince of Poets” by fellow writers in 1894."
    ],
    works: [
      { title: "Chanson d’automne", year: "1866", note: "Short-lined lyric in which autumn violins wound the heart with monotonous languor." },
      { title: "Art poétique", year: "1882", note: "Verse manifesto calling for music, nuance, and odd-syllabled lines—and to wring the neck of eloquence." },
      { title: "Romances sans paroles", year: "1874", note: "Collection of “songs without words,” written during wanderings with a younger poet." },
      { title: "Fêtes galantes", year: "1869", note: "Poems evoking Watteau’s paintings of masked lovers in moonlit parks." }
    ],
    lines: [
      { text: "Les sanglots longs / Des violons / De l’automne / Blessent mon cœur / D’une langueur / Monotone.", work: "Chanson d’automne" },
      { text: "De la musique avant toute chose", work: "Art poétique" }
    ]
  },

  {
    id: "rimbaud",
    name: "Arthur Rimbaud",
    born: 1854,
    dates: "1854–1891",
    place: "France",
    group: "19th",
    tag: "Symbolism",
    blurb: "Teenage prodigy who revolutionized French poetry, then abandoned literature entirely before he was twenty-one.",
    facts: [
      "Wrote all his poetry before about age twenty-one, then gave up literature.",
      "Ran away to Paris at sixteen at the invitation of Paul Verlaine, beginning a turbulent affair.",
      "Called for the poet to become a “seer” through a “derangement of all the senses.”",
      "Became a trader and gunrunner in Aden and Harar, and died in Marseille at 37 after a leg amputation."
    ],
    works: [
      { title: "A Season in Hell", year: "1873", note: "Prose-poem confession of spiritual and artistic crisis; the only book its author published himself." },
      { title: "Illuminations", year: "1886", note: "Hallucinatory prose poems, among the first free verse in French." },
      { title: "The Drunken Boat", year: "1883", note: "A boat, freed of its haulers, narrates its ecstatic, visionary voyage through the sea." },
      { title: "Vowels", year: "1883", note: "Sonnet assigning a color to each vowel, a famous example of synesthesia." }
    ],
    lines: [
      { text: "A noir, E blanc, I rouge, U vert, O bleu : voyelles", work: "Vowels" },
      { text: "Comme je descendais des Fleuves impassibles", work: "The Drunken Boat" }
    ]
  },

  {
    id: "housman",
    name: "A. E. Housman",
    born: 1859,
    dates: "1859–1936",
    place: "England",
    group: "19th",
    tag: "Victorian poetry",
    blurb: "Classical scholar whose spare, melancholy lyrics of doomed English youth became enormously popular.",
    facts: [
      "Failed his final exams at Oxford, then worked ten years as a clerk in the Patent Office.",
      "Became Professor of Latin at University College London and later at Cambridge.",
      "Spent three decades editing the Latin astronomical poet Manilius.",
      "Paid to publish his first collection after a publisher turned it down."
    ],
    works: [
      { title: "A Shropshire Lad", year: "1896", note: "Sixty-three ballad-like lyrics of rural youth, love, soldiering, and early death." },
      { title: "To an Athlete Dying Young", year: "1896", note: "Elegy praising a runner lucky to die before his fame faded." },
      { title: "Loveliest of Trees", year: "1896", note: "A twenty-year-old counts the springs he has left to see the cherry blossom." },
      { title: "Last Poems", year: "1922", note: "Second collection, published when its author thought his poetic life was over." }
    ],
    lines: [
      { text: "When I was one-and-twenty / I heard a wise man say", work: "A Shropshire Lad" },
      { text: "And since to look at things in bloom / Fifty springs are little room", work: "Loveliest of Trees" },
      { text: "Smart lad, to slip betimes away / From fields where glory does not stay", work: "To an Athlete Dying Young" }
    ]
  },

  {
    id: "kipling",
    name: "Rudyard Kipling",
    born: 1865,
    dates: "1865–1936",
    place: "England",
    group: "19th",
    tag: "Victorian poetry",
    blurb: "Hugely popular poet of the British Empire and its soldiers, master of the ballad and the memorable maxim.",
    facts: [
      "Born in Bombay, he was sent to England at five to a foster home he later described as a house of desolation.",
      "In 1907 became the first English-language writer to win the Nobel Prize in Literature.",
      "Reportedly declined both a knighthood and the Poet Laureateship.",
      "His only son, John, was killed at the Battle of Loos in 1915."
    ],
    works: [
      { title: "If—", year: "1910", note: "A father’s list of stoic virtues for his son: keep calm, keep faith, and treat triumph and disaster alike." },
      { title: "Gunga Din", year: "1890", note: "A British soldier’s tribute to a heroic Indian water-carrier, in Cockney dialect." },
      { title: "Recessional", year: "1897", note: "Hymn for Queen Victoria’s Diamond Jubilee warning the empire against pride." },
      { title: "The White Man’s Burden", year: "1899", note: "Notorious poem urging the United States to colonize the Philippines." }
    ],
    lines: [
      { text: "Yours is the Earth and everything that’s in it, / And—which is more—you’ll be a Man, my son!", work: "If—" },
      { text: "Lest we forget—lest we forget!", work: "Recessional" }
    ]
  },

  /* ───────────────────────── Modern (c. 1900–1945) ───────────────────────── */

  {
    id: "tagore",
    name: "Rabindranath Tagore",
    born: 1861,
    dates: "1861–1941",
    place: "India",
    group: "modern",
    tag: "Bengal Renaissance",
    blurb: "Bengali poet, composer, and educator who reshaped Indian literature and became a global literary celebrity.",
    facts: [
      "In 1913 became the first non-European to win the Nobel Prize in Literature.",
      "Wrote the national anthems of both India and Bangladesh.",
      "Founded Visva-Bharati University at Santiniketan.",
      "Renounced his British knighthood after the 1919 Amritsar massacre."
    ],
    works: [
      { title: "Gitanjali", year: "1910", note: "“Song Offerings”: devotional prose poems, translated by the author into English in 1912 with a preface by W. B. Yeats." },
      { title: "The Gardener", year: "1913", note: "English collection of lyrics of love and life, translated by the author from Bengali." },
      { title: "Jana Gana Mana", year: "1911", note: "Bengali hymn whose first stanza became India’s national anthem." }
    ],
    lines: [
      { text: "Where the mind is without fear and the head is held high", work: "Gitanjali" },
      { text: "Into that heaven of freedom, my Father, let my country awake.", work: "Gitanjali" }
    ]
  },

  {
    id: "cavafy",
    name: "Constantine P. Cavafy",
    born: 1863,
    dates: "1863–1933",
    place: "Greece",
    group: "modern",
    tag: "Modernism",
    blurb: "Greek poet of Alexandria whose ironic, conversational poems on history, desire, and memory are modern classics.",
    facts: [
      "Spent most of his life in Alexandria, Egypt, working three decades as a clerk in the Irrigation Service.",
      "Never published a commercial book, circulating privately printed broadsheets among friends.",
      "E. M. Forster described him as standing “at a slight angle to the universe.”",
      "Many of his poems are set in the Hellenistic past or recall homoerotic encounters."
    ],
    works: [
      { title: "Ithaka", year: "1911", note: "Advises a traveler to hope the voyage home is long, since the journey itself is the reward." },
      { title: "Waiting for the Barbarians", year: "1904", note: "A city’s rulers prepare for invaders who never arrive, leaving them without an excuse." },
      { title: "The City", year: "1910", note: "A man vows to escape to another place, but is told he will carry his old life everywhere." },
      { title: "The God Abandons Antony", year: "1911", note: "Mark Antony is urged to face the loss of Alexandria with courage and dignity." }
    ],
    lines: [
      { text: "And now, what’s going to happen to us without barbarians? / They were, those people, a kind of solution.", work: "Waiting for the Barbarians" },
      { text: "You won’t find a new country, won’t find another shore. / This city will always pursue you.", work: "The City" }
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
    blurb: "Ireland’s greatest poet, who moved from Celtic Twilight romance to the hard, prophetic modern lyric.",
    facts: [
      "Co-founded Dublin’s Abbey Theatre with Lady Gregory.",
      "Proposed repeatedly to the revolutionary Maud Gonne, who refused him.",
      "Won the Nobel Prize in Literature in 1923.",
      "Served as a senator of the Irish Free State."
    ],
    works: [
      { title: "The Second Coming", year: "1920", note: "Apocalyptic vision of a rough beast slouching toward Bethlehem as civilization collapses after World War I." },
      { title: "Easter, 1916", year: "1920", note: "Elegy for the executed leaders of the Dublin Rising, in which all is “changed, changed utterly.”" },
      { title: "Sailing to Byzantium", year: "1928", note: "An old man seeks escape from the dying body into the eternal artifice of art." },
      { title: "The Lake Isle of Innisfree", year: "1890", note: "Lyric of longing, heard on a London pavement, for a cabin and bee-loud glade on a lake island in Sligo." }
    ],
    lines: [
      { text: "Things fall apart; the centre cannot hold", work: "The Second Coming" },
      { text: "All changed, changed utterly: / A terrible beauty is born.", work: "Easter, 1916" },
      { text: "That is no country for old men.", work: "Sailing to Byzantium" }
    ]
  },

  {
    id: "frost",
    name: "Robert Frost",
    born: 1874,
    dates: "1874–1963",
    place: "United States",
    group: "modern",
    tag: "Lyric poetry",
    blurb: "America’s most beloved poet, whose plainspoken New England lyrics hide dark ambiguities.",
    facts: [
      "Born in San Francisco, though identified with rural New England.",
      "Published his first two books while living in England, where he befriended Edward Thomas.",
      "Won four Pulitzer Prizes for Poetry, more than any other poet.",
      "Recited a poem from memory at John F. Kennedy’s 1961 inauguration when glare kept him from reading his new one."
    ],
    works: [
      { title: "The Road Not Taken", year: "1915", note: "A traveler chooses between two nearly identical paths and imagines later telling it as a defining choice." },
      { title: "Stopping by Woods on a Snowy Evening", year: "1923", note: "A rider pauses to watch snow fill dark woods before duty pulls him on." },
      { title: "Mending Wall", year: "1914", note: "Two neighbors rebuild a stone wall each spring; one questions the need, the other repeats an old saying." },
      { title: "Birches", year: "1915", note: "Blank-verse meditation on boyhood swinging on birch trees as a model for escaping and returning to earth." },
      { title: "Fire and Ice", year: "1920", note: "Nine-line poem weighing whether the world will end through desire or hatred." }
    ],
    lines: [
      { text: "Two roads diverged in a yellow wood", work: "The Road Not Taken" },
      { text: "And miles to go before I sleep", work: "Stopping by Woods on a Snowy Evening" },
      { text: "Good fences make good neighbors.", work: "Mending Wall" }
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
    blurb: "German-language lyric poet of solitude, angels, and transformation, among the most influential modern poets.",
    facts: [
      "Born in Prague, then part of Austria-Hungary.",
      "Worked as secretary to the sculptor Auguste Rodin in Paris.",
      "Wrote much of his late poetry at the Château de Muzot in Switzerland.",
      "Legend links his fatal illness, leukemia, to pricking his finger on a rose thorn."
    ],
    works: [
      { title: "Duino Elegies", year: "1923", note: "Ten elegies on human limits, death, and the terrifying angels, begun at a castle on the Adriatic." },
      { title: "Sonnets to Orpheus", year: "1923", note: "Fifty-five sonnets written in a burst of a few weeks, inspired by the death of a young dancer." },
      { title: "Archaic Torso of Apollo", year: "1908", note: "Sonnet on a headless ancient statue that seems to see the viewer and demands a response." },
      { title: "The Panther", year: "1903", note: "“Thing-poem” about a caged panther at the Paris zoo whose gaze sees only bars." },
      { title: "Letters to a Young Poet", year: "1929", note: "Ten letters of advice on solitude, love, and art, written to a young officer cadet." }
    ],
    lines: [
      { text: "You must change your life.", work: "Archaic Torso of Apollo" },
      { text: "Wer, wenn ich schriee, hörte mich denn aus der Engel / Ordnungen?", work: "Duino Elegies" }
    ]
  },

  {
    id: "stevens",
    name: "Wallace Stevens",
    born: 1879,
    dates: "1879–1955",
    place: "United States",
    group: "modern",
    tag: "Modernism",
    blurb: "Philosophical modernist of the imagination and reality, who wrote dazzling poems while working as an insurance executive.",
    facts: [
      "Spent his career at the Hartford Accident and Indemnity Company, rising to vice president.",
      "Published his first book in his forties.",
      "Broke his hand in a fistfight with Ernest Hemingway in Key West in 1936.",
      "Won the Pulitzer Prize and a National Book Award for his collected poems in 1955."
    ],
    works: [
      { title: "Harmonium", year: "1923", note: "Debut collection of exotic, comic, and philosophical poems, which sold poorly at first." },
      { title: "Thirteen Ways of Looking at a Blackbird", year: "1917", note: "Thirteen haiku-like sections, each viewing a bird from a different angle." },
      { title: "Sunday Morning", year: "1915", note: "A woman skips church to muse that earthly beauty and death are enough without heaven." },
      { title: "The Emperor of Ice-Cream", year: "1922", note: "A wake in a kitchen where cigar-rolling muscles whip desserts beside a corpse." },
      { title: "The Snow Man", year: "1921", note: "One-sentence poem urging a “mind of winter” to see a bare landscape without projecting misery onto it." }
    ],
    lines: [
      { text: "Among twenty snowy mountains, / The only moving thing / Was the eye of the blackbird.", work: "Thirteen Ways of Looking at a Blackbird" },
      { text: "Death is the mother of beauty", work: "Sunday Morning" },
      { text: "Let be be finale of seem.", work: "The Emperor of Ice-Cream" }
    ]
  },

  {
    id: "apollinaire",
    name: "Guillaume Apollinaire",
    born: 1880,
    dates: "1880–1918",
    place: "France",
    group: "modern",
    tag: "Modernism",
    blurb: "Avant-garde French poet and art critic who bridged Symbolism and Surrealism and championed Cubism.",
    facts: [
      "Coined the word “surrealism” in 1917.",
      "Was jailed briefly in 1911 on suspicion of involvement in the theft of the Mona Lisa.",
      "Championed Picasso and the Cubist painters in his criticism.",
      "Survived a shrapnel head wound in World War I but died in the 1918 flu pandemic two days before the Armistice."
    ],
    works: [
      { title: "Alcools", year: "1913", note: "Collection without punctuation mixing modern Paris with legend and lost love." },
      { title: "Calligrammes", year: "1918", note: "Poems of peace and war whose words are arranged into pictures on the page." },
      { title: "Le Pont Mirabeau", year: "1912", note: "Song-like lament in which love flows away like the Seine under a Paris bridge." },
      { title: "Zone", year: "1912", note: "Long free-verse walk through modern Paris, weary of the ancient world, with airplanes and the Eiffel Tower." }
    ],
    lines: [
      { text: "Vienne la nuit sonne l’heure / Les jours s’en vont je demeure", work: "Le Pont Mirabeau" },
      { text: "À la fin tu es las de ce monde ancien", work: "Zone" }
    ]
  },

  {
    id: "william-carlos-williams",
    name: "William Carlos Williams",
    born: 1883,
    dates: "1883–1963",
    place: "United States",
    group: "modern",
    tag: "Imagism",
    blurb: "New Jersey doctor-poet who championed a plain American idiom of everyday objects.",
    facts: [
      "Worked for four decades as a family doctor in Rutherford, New Jersey, writing between patients.",
      "Befriended Ezra Pound while studying medicine at the University of Pennsylvania.",
      "Won the first National Book Award for Poetry in 1950.",
      "Won a posthumous Pulitzer Prize in 1963."
    ],
    works: [
      { title: "The Red Wheelbarrow", year: "1923", note: "Sixteen-word poem on a rain-glazed barrow beside white chickens." },
      { title: "This Is Just to Say", year: "1934", note: "A note left on the icebox apologizing, not very sincerely, for eating plums." },
      { title: "Paterson", year: "1946–58", note: "Five-book epic collage of a New Jersey industrial city imagined as a man." },
      { title: "Spring and All", year: "1923", note: "Hybrid book of manifesto prose and short poems on the imagination." }
    ],
    lines: [
      { text: "so much depends / upon / a red wheel / barrow", work: "The Red Wheelbarrow" },
      { text: "I have eaten / the plums / that were in / the icebox", work: "This Is Just to Say" },
      { text: "no ideas but in things", work: "Paterson" }
    ]
  },

  {
    id: "pound",
    name: "Ezra Pound",
    born: 1885,
    dates: "1885–1972",
    place: "United States",
    group: "modern",
    tag: "Imagism",
    blurb: "Brilliant, notorious impresario of modernism who launched Imagism and promoted Eliot, Joyce, and Frost.",
    facts: [
      "Edited a friend’s long poem so heavily that it was dedicated to him as “il miglior fabbro.”",
      "Made pro-Fascist radio broadcasts from Italy during World War II.",
      "Was held in an open-air US Army cage near Pisa in 1945.",
      "Was confined for twelve years in St. Elizabeths Hospital in Washington after being found unfit for trial."
    ],
    works: [
      { title: "The Cantos", year: "1917–69", note: "Vast unfinished epic weaving history, economics, Confucius, and myth." },
      { title: "In a Station of the Metro", year: "1913", note: "Two-line Imagist poem comparing faces in a Paris subway crowd to petals." },
      { title: "Hugh Selwyn Mauberley", year: "1920", note: "Sequence satirizing the London literary world and mourning the dead of World War I." },
      { title: "Cathay", year: "1915", note: "Free versions of classical Chinese poems, made from Ernest Fenollosa’s notes." }
    ],
    lines: [
      { text: "The apparition of these faces in the crowd; / Petals on a wet, black bough.", work: "In a Station of the Metro" },
      { text: "For an old bitch gone in the teeth, / For a botched civilization", work: "Hugh Selwyn Mauberley" }
    ]
  },

  {
    id: "hd",
    name: "H.D.",
    born: 1886,
    dates: "1886–1961",
    place: "United States",
    group: "modern",
    tag: "Imagism",
    blurb: "Hilda Doolittle, the purest of the Imagists, whose hard, chiseled poems drew on Greek myth.",
    facts: [
      "Was briefly engaged to Ezra Pound in her youth.",
      "In 1912 Pound signed her poems with her initials and the label “Imagiste.”",
      "Underwent analysis with Sigmund Freud in Vienna in 1933–34.",
      "Lived for decades with the British novelist and patron Bryher."
    ],
    works: [
      { title: "Oread", year: "1914", note: "Six-line Imagist poem in which a mountain nymph calls on the sea to whirl its waves like pine trees." },
      { title: "Sea Garden", year: "1916", note: "Debut collection of spare poems on wind-battered seaside flowers and Greek landscapes." },
      { title: "Trilogy", year: "1944–46", note: "Three-part sequence written during the London Blitz, seeking spiritual renewal amid ruins." },
      { title: "Helen in Egypt", year: "1961", note: "Book-length poem retelling the Trojan War from the viewpoint of Helen." }
    ],
    lines: [
      { text: "Whirl up, sea— / whirl your pointed pines", work: "Oread" }
    ]
  },

  {
    id: "sassoon",
    name: "Siegfried Sassoon",
    born: 1886,
    dates: "1886–1967",
    place: "England",
    group: "modern",
    tag: "War poetry",
    blurb: "Decorated officer whose bitter satires attacked the generals and the home front of World War I.",
    facts: [
      "Won the Military Cross and was nicknamed “Mad Jack” for his reckless bravery.",
      "Published a public protest against the war in 1917 and was sent to a hospital instead of being court-martialed.",
      "At Craiglockhart War Hospital met and mentored Wilfred Owen.",
      "Later wrote a series of fictionalized memoirs about a fox-hunting country gentleman."
    ],
    works: [
      { title: "Suicide in the Trenches", year: "1918", note: "A cheerful boy soldier shoots himself in the trenches; the poem turns on cheering civilian crowds." },
      { title: "Everyone Sang", year: "1919", note: "Lyric of sudden joy at the war’s end, like caged birds set free." },
      { title: "Counter-Attack", year: "1918", note: "Collection of harsh, realistic war poems that shocked readers." }
    ],
    lines: [
      { text: "You smug-faced crowds with kindling eye / Who cheer when soldier lads march by", work: "Suicide in the Trenches" },
      { text: "Everyone suddenly burst out singing", work: "Everyone Sang" }
    ]
  },

  {
    id: "marianne-moore",
    name: "Marianne Moore",
    born: 1887,
    dates: "1887–1972",
    place: "United States",
    group: "modern",
    tag: "Modernism",
    blurb: "Precise, witty modernist of animals and objects, famous for syllabic stanzas and quotation collage.",
    facts: [
      "Edited The Dial, a leading modernist magazine, from 1925 to 1929.",
      "Was a devoted baseball fan and threw out the first pitch at Yankee Stadium in 1968.",
      "Ford asked her to name a new car; it ignored her suggestions and chose “Edsel.”",
      "Was known for her tricorne hat and black cape."
    ],
    works: [
      { title: "Poetry", year: "1919", note: "Admits to disliking the art it names but defends its “genuine” power; famously cut by its author to three lines in 1967." },
      { title: "Marriage", year: "1923", note: "Long collage poem of quotations examining the institution of matrimony." },
      { title: "Observations", year: "1924", note: "Collection with extensive notes on sources, winner of the Dial Award." },
      { title: "Collected Poems", year: "1951", note: "Volume that won the Pulitzer Prize, the National Book Award, and the Bollingen Prize." }
    ],
    lines: [
      { text: "I, too, dislike it.", work: "Poetry" },
      { text: "imaginary gardens with real toads in them", work: "Poetry" }
    ]
  },

  {
    id: "brooke",
    name: "Rupert Brooke",
    born: 1887,
    dates: "1887–1915",
    place: "England",
    group: "modern",
    tag: "War poetry",
    blurb: "Golden young poet whose idealistic war sonnets made him a national symbol of sacrifice in 1915.",
    facts: [
      "W. B. Yeats reportedly called him “the handsomest young man in England.”",
      "Was a leader of the Cambridge “Neo-Pagans” and a friend of Virginia Woolf.",
      "Died of sepsis from an infected mosquito bite aboard a hospital ship en route to Gallipoli.",
      "Is buried in an olive grove on the Greek island of Skyros."
    ],
    works: [
      { title: "The Soldier", year: "1914", note: "Sonnet imagining a dead soldier’s grave abroad as a piece of England forever." },
      { title: "The Old Vicarage, Grantchester", year: "1912", note: "Homesick poem written in a Berlin café, idealizing a village near Cambridge." },
      { title: "1914 and Other Poems", year: "1915", note: "Posthumous collection containing the five patriotic war sonnets." }
    ],
    lines: [
      { text: "If I should die, think only this of me: / That there’s some corner of a foreign field / That is for ever England.", work: "The Soldier" },
      { text: "Stands the Church clock at ten to three? / And is there honey still for tea?", work: "The Old Vicarage, Grantchester" }
    ]
  },

  {
    id: "pessoa",
    name: "Fernando Pessoa",
    born: 1888,
    dates: "1888–1935",
    place: "Portugal",
    group: "modern",
    tag: "Modernism",
    blurb: "Portugal’s great modernist, who wrote as dozens of invented poets with their own lives and styles.",
    facts: [
      "Wrote under dozens of “heteronyms,” notably Alberto Caeiro, Ricardo Reis, and Álvaro de Campos.",
      "Spent much of his youth in Durban, South Africa, and wrote early verse in English.",
      "Worked as a freelance commercial translator in Lisbon offices.",
      "Left a trunk of some 25,000 manuscript pages, still being edited."
    ],
    works: [
      { title: "The Book of Disquiet", year: "1982", note: "Fragmentary diary of an assistant bookkeeper in Lisbon, assembled posthumously." },
      { title: "Message", year: "1934", note: "The only Portuguese book of poems published in its author’s lifetime: a mystical sequence on Portuguese history." },
      { title: "Autopsychography", year: "1932", note: "Short poem claiming that the poet is a pretender who feigns even the pain he truly feels." },
      { title: "The Tobacco Shop", year: "1933", note: "Long poem, signed by an alter ego, of a man at his window weighing his nothingness against his dreams." }
    ],
    lines: [
      { text: "O poeta é um fingidor. / Finge tão completamente / Que chega a fingir que é dor / A dor que deveras sente.", work: "Autopsychography" },
      { text: "Não sou nada. / Nunca serei nada.", work: "The Tobacco Shop" }
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
    blurb: "American-born poet whose fragmented masterpiece defined modernist poetry.",
    facts: [
      "Born in St. Louis, Missouri; became a British subject in 1927.",
      "Worked for years as a clerk at Lloyds Bank in London.",
      "Won the Nobel Prize in Literature in 1948.",
      "His book of whimsical cat poems became the basis of a hit stage musical."
    ],
    works: [
      { title: "The Waste Land", year: "1922", note: "Fragmented, allusive poem of spiritual desolation in postwar Europe, with notes." },
      { title: "The Love Song of J. Alfred Prufrock", year: "1915", note: "Dramatic monologue of a timid, aging man paralyzed by self-consciousness." },
      { title: "Four Quartets", year: "1943", note: "Four meditative poems on time, faith, and redemption." },
      { title: "The Hollow Men", year: "1925", note: "Bleak poem of spiritual emptiness spoken by stuffed men in a dead land." }
    ],
    lines: [
      { text: "April is the cruellest month, breeding / Lilacs out of the dead land", work: "The Waste Land" },
      { text: "I have measured out my life with coffee spoons", work: "The Love Song of J. Alfred Prufrock" },
      { text: "This is the way the world ends / Not with a bang but a whimper.", work: "The Hollow Men" }
    ]
  },

  {
    id: "akhmatova",
    name: "Anna Akhmatova",
    born: 1889,
    dates: "1889–1966",
    place: "Russia",
    group: "modern",
    tag: "Acmeism",
    blurb: "Russian poet who became the voice of a people’s suffering under Stalin’s terror.",
    facts: [
      "Took a Tatar ancestor’s surname as her pen name after her father objected to poetry in the family.",
      "Her first husband, the poet Nikolai Gumilev, was shot by the Bolsheviks in 1921.",
      "Stood for seventeen months in Leningrad prison lines after her son’s arrest.",
      "Was expelled from the Soviet Writers’ Union in 1946 after Zhdanov called her “half nun, half harlot.”"
    ],
    works: [
      { title: "Requiem", year: "1963", note: "Poem cycle on the Great Terror, composed in 1935–40 and memorized by friends; first published abroad." },
      { title: "Poem Without a Hero", year: "1940–65", note: "Layered poem in which ghosts of 1913 St. Petersburg visit on New Year’s Eve." },
      { title: "Evening", year: "1912", note: "Debut collection of terse, intimate love lyrics." }
    ],
    lines: [
      { text: "Can you describe this?", work: "Requiem" }
    ]
  },

  {
    id: "mckay",
    name: "Claude McKay",
    born: 1889,
    dates: "1889–1948",
    place: "Jamaica",
    group: "modern",
    tag: "Harlem Renaissance",
    blurb: "Jamaican-born poet whose defiant sonnets helped spark the Harlem Renaissance.",
    facts: [
      "Served briefly in the Jamaican constabulary as a young man.",
      "Published two books of Jamaican dialect verse before emigrating to the United States in 1912.",
      "Addressed the Communist International in Moscow in 1922.",
      "His 1928 novel of Harlem nightlife was a best-seller."
    ],
    works: [
      { title: "If We Must Die", year: "1919", note: "Sonnet urging resistance to mob violence, written after the Red Summer race riots." },
      { title: "Harlem Shadows", year: "1922", note: "Collection of sonnets and lyrics on Black urban life, love, and protest." },
      { title: "Home to Harlem", year: "1928", note: "Novel following a Black soldier home from World War I to Harlem’s cabarets." }
    ],
    lines: [
      { text: "Like men we’ll face the murderous, cowardly pack, / Pressed to the wall, dying, but fighting back!", work: "If We Must Die" }
    ]
  },

  {
    id: "mistral",
    name: "Gabriela Mistral",
    born: 1889,
    dates: "1889–1957",
    place: "Chile",
    group: "modern",
    tag: "Lyric poetry",
    blurb: "Chilean poet and educator whose lyrics of love, grief, motherhood, and childhood made her Latin America’s first Nobel laureate.",
    facts: [
      "In 1945 became the first Latin American writer to win the Nobel Prize in Literature.",
      "Pen name of Lucila Godoy Alcayaga, a rural schoolteacher.",
      "As a school director in Temuco, encouraged the teenage Pablo Neruda.",
      "Helped reform Mexico’s rural schools at the invitation of José Vasconcelos in 1922."
    ],
    works: [
      { title: "Desolación", year: "1922", note: "Debut collection of anguished poems of love, loss, and faith, published in New York." },
      { title: "Sonetos de la muerte", year: "1914", note: "Three sonnets addressed to a dead lover, which won a national poetry prize." },
      { title: "Ternura", year: "1924", note: "Book of lullabies, rounds, and poems for children." },
      { title: "Tala", year: "1938", note: "Collection whose proceeds went to children orphaned by the Spanish Civil War." }
    ],
    lines: [
      { text: "Del nicho helado en que los hombres te pusieron, / te bajaré a la tierra humilde y soleada.", work: "Sonetos de la muerte" }
    ]
  },

  {
    id: "mandelstam",
    name: "Osip Mandelstam",
    born: 1891,
    dates: "1891–1938",
    place: "Russia",
    group: "modern",
    tag: "Acmeism",
    blurb: "Russian Acmeist poet of classical culture who died in the Gulag for a poem mocking Stalin.",
    facts: [
      "A 1933 epigram mocking Stalin as the “Kremlin mountaineer” led to his arrest.",
      "Is said to have remarked that only in Russia is poetry respected—it gets people killed.",
      "His widow, Nadezhda, memorized his unpublished poems to preserve them.",
      "Died in a transit camp near Vladivostok in 1938."
    ],
    works: [
      { title: "Stone", year: "1913", note: "Debut collection of architectural, classical lyrics, a manifesto of Acmeism in practice." },
      { title: "Tristia", year: "1922", note: "Collection of poems on exile, Greek myth, and revolutionary Petrograd." },
      { title: "The Stalin Epigram", year: "c. 1933", note: "Sixteen-line satire of the dictator, with cockroach mustache and fat fingers like worms." },
      { title: "Voronezh Notebooks", year: "c. 1935–37", note: "Late poems written in internal exile, preserved by memory and secret copies." }
    ],
    lines: [
      { text: "Мы живём, под собою не чуя страны", work: "The Stalin Epigram" }
    ]
  },

  {
    id: "tsvetaeva",
    name: "Marina Tsvetaeva",
    born: 1892,
    dates: "1892–1941",
    place: "Russia",
    group: "modern",
    tag: "Silver Age",
    blurb: "Passionate, formally daring Russian poet whose life was destroyed by revolution, exile, and terror.",
    facts: [
      "Lost her younger daughter to starvation in a Moscow orphanage in 1920.",
      "Emigrated in 1922 and lived in Berlin, Prague, and Paris before returning to the USSR in 1939.",
      "Corresponded passionately with Rilke and Boris Pasternak in 1926.",
      "After her husband’s arrest and her daughter’s imprisonment, hanged herself in Yelabuga in 1941."
    ],
    works: [
      { title: "Evening Album", year: "1910", note: "Self-published debut collection, written as a schoolgirl." },
      { title: "Poem of the End", year: "1926", note: "Long poem of the breakup of a love affair, walked through Prague streets." },
      { title: "I Like That You’re Not Sick with Me", year: "c. 1915", note: "Lyric of relief at being free of love’s fever, later a famous Soviet film song." }
    ],
    lines: [
      { text: "Мне нравится, что вы больны не мной, / Мне нравится, что я больна не вами", work: "I Like That You’re Not Sick with Me" }
    ]
  },

  {
    id: "millay",
    name: "Edna St. Vincent Millay",
    born: 1892,
    dates: "1892–1950",
    place: "United States",
    group: "modern",
    tag: "Lyric poetry",
    blurb: "Jazz Age poet of bohemian freedom and the sonnet, a celebrity of 1920s Greenwich Village.",
    facts: [
      "Became the third woman to win the Pulitzer Prize for Poetry, in 1923.",
      "A long poem she wrote at nineteen caught a patron’s eye and won her a scholarship to Vassar.",
      "Was arrested in Boston protesting the execution of Sacco and Vanzetti in 1927.",
      "Embodied the liberated “New Woman” of 1920s Greenwich Village."
    ],
    works: [
      { title: "First Fig", year: "1918", note: "Four-line toast to living fast and brilliantly, an anthem of the Jazz Age." },
      { title: "Renascence", year: "1912", note: "Mystical long poem of a girl crushed by the world’s pain and reborn." },
      { title: "Dirge Without Music", year: "1928", note: "Defiant refusal to accept the death of the beloved, wise, and good." },
      { title: "The Ballad of the Harp-Weaver", year: "1922", note: "Ballad of a poor mother who weaves magical clothes for her son on a harp and dies." }
    ],
    lines: [
      { text: "My candle burns at both ends; / It will not last the night", work: "First Fig" },
      { text: "I am not resigned to the shutting away of loving hearts in the hard ground.", work: "Dirge Without Music" }
    ]
  },

  {
    id: "owen",
    name: "Wilfred Owen",
    born: 1893,
    dates: "1893–1918",
    place: "England",
    group: "modern",
    tag: "War poetry",
    blurb: "The greatest English poet of World War I, whose subject was “War, and the pity of War.”",
    facts: [
      "Met Siegfried Sassoon at Craiglockhart War Hospital while being treated for shell shock.",
      "Won the Military Cross for bravery in October 1918.",
      "Was killed a week before the Armistice; his parents got the telegram as church bells rang for peace.",
      "Only five of his poems were published in his lifetime."
    ],
    works: [
      { title: "Dulce et Decorum Est", year: "1920", note: "Gas attack poem that calls Horace’s line about dying for one’s country “the old Lie.”" },
      { title: "Anthem for Doomed Youth", year: "1920", note: "Sonnet asking what funeral rites there are for soldiers slaughtered like cattle." },
      { title: "Strange Meeting", year: "1919", note: "Dream encounter in hell between a soldier and the enemy he killed." },
      { title: "Futility", year: "1918", note: "Soldiers move a dead comrade into the sun, which once woke him and now cannot." }
    ],
    lines: [
      { text: "Bent double, like old beggars under sacks", work: "Dulce et Decorum Est" },
      { text: "What passing-bells for these who die as cattle?", work: "Anthem for Doomed Youth" },
      { text: "I am the enemy you killed, my friend.", work: "Strange Meeting" }
    ]
  },

  {
    id: "cummings",
    name: "E. E. Cummings",
    born: 1894,
    dates: "1894–1962",
    place: "United States",
    group: "modern",
    tag: "Modernism",
    blurb: "Playful modernist who broke up syntax, punctuation, and typography in poems of love and individualism.",
    facts: [
      "Was held for months in a French detention camp in 1917, an ordeal he turned into a novel.",
      "Often set poems in lowercase with scattered punctuation and words split across lines.",
      "Dedicated a 1935 collection to the fourteen publishers who had rejected it.",
      "Was also a painter who exhibited regularly."
    ],
    works: [
      { title: "i carry your heart with me(i carry it in", year: "1952", note: "Love poem that finds the beloved’s heart carried everywhere, “the wonder that’s keeping the stars apart.”" },
      { title: "anyone lived in a pretty how town", year: "1940", note: "Fable of “anyone” and “noone,” lovers ignored by conformist townsfolk through the seasons." },
      { title: "in Just-", year: "1920", note: "Spring poem with a goat-footed balloonman whistling children out to play." },
      { title: "since feeling is first", year: "1926", note: "Argues that love and feeling matter more than syntax and wisdom." },
      { title: "The Enormous Room", year: "1922", note: "Autobiographical novel of imprisonment in a French detention center." }
    ],
    lines: [
      { text: "here is the deepest secret nobody knows", work: "i carry your heart with me(i carry it in" },
      { text: "he sang his didn’t he danced his did", work: "anyone lived in a pretty how town" },
      { text: "kisses are a better fate / than wisdom", work: "since feeling is first" }
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
    blurb: "Andalusian poet and playwright of duende, Romani ballads, and tragic passion, murdered at the start of the Spanish Civil War.",
    facts: [
      "Was a friend of Salvador Dalí and Luis Buñuel at Madrid’s Residencia de Estudiantes.",
      "Spent 1929–30 in New York, writing surreal poems about the city.",
      "Directed La Barraca, a traveling student theater that brought classics to rural Spain.",
      "Was shot by Nationalist forces near Granada in 1936; his body has never been found."
    ],
    works: [
      { title: "Gypsy Ballads", year: "1928", note: "Collection of ballads mythologizing Andalusian Romani life, moonlight, and the Civil Guard." },
      { title: "Romance sonámbulo", year: "1928", note: "Dreamlike ballad of a wounded smuggler and a drowned girl, haunted by the color green." },
      { title: "Lament for Ignacio Sánchez Mejías", year: "1935", note: "Elegy in four parts for a bullfighter friend gored in the ring." },
      { title: "Poet in New York", year: "1940", note: "Surreal, posthumously published poems of alienation in Manhattan and Harlem." }
    ],
    lines: [
      { text: "Verde que te quiero verde.", work: "Romance sonámbulo" },
      { text: "A las cinco de la tarde.", work: "Lament for Ignacio Sánchez Mejías" }
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
    blurb: "The leading voice of the Harlem Renaissance, who wove jazz and blues rhythms into poems of Black American life.",
    facts: [
      "Was discovered after leaving poems beside Vachel Lindsay’s plate while working as a hotel busboy.",
      "Pioneered jazz poetry, blending blues rhythms into verse.",
      "Created the folk character Jesse B. Semple, or “Simple,” in newspaper columns.",
      "Graduated from Lincoln University in Pennsylvania after leaving Columbia."
    ],
    works: [
      { title: "The Negro Speaks of Rivers", year: "1921", note: "Written at seventeen on a train over the Mississippi: Black history traced through the Euphrates, Congo, Nile, and Mississippi." },
      { title: "Harlem", year: "1951", note: "Short poem asking what happens to a dream postponed—does it shrivel, fester, or explode?" },
      { title: "I, Too", year: "1926", note: "A Black servant sent to eat in the kitchen insists he too is American." },
      { title: "The Weary Blues", year: "1926", note: "Debut collection whose title poem describes a blues pianist in Harlem." }
    ],
    lines: [
      { text: "I’ve known rivers: / Ancient, dusky rivers.", work: "The Negro Speaks of Rivers" },
      { text: "What happens to a dream deferred? / Does it dry up / like a raisin in the sun?", work: "Harlem" },
      { text: "I am the darker brother.", work: "I, Too" }
    ]
  },

  {
    id: "auden",
    name: "W. H. Auden",
    born: 1907,
    dates: "1907–1973",
    place: "England",
    group: "modern",
    tag: "Modernism",
    blurb: "The dominant English poet of the 1930s, a virtuoso of every form, who later became an American citizen.",
    facts: [
      "Moved to the United States in 1939 and became an American citizen in 1946.",
      "Married Erika Mann, Thomas Mann’s daughter, in 1935 to give her a British passport.",
      "Wrote opera librettos, including one for Stravinsky, with his partner Chester Kallman.",
      "Served as Oxford Professor of Poetry from 1956 to 1961."
    ],
    works: [
      { title: "Funeral Blues", year: "1936", note: "Lament demanding that the world stop for a lover’s death; made famous by a 1994 film." },
      { title: "September 1, 1939", year: "1939", note: "Written in a New York bar as war began: a “low dishonest decade” ends." },
      { title: "Musée des Beaux Arts", year: "1939", note: "On how suffering happens unnoticed, as in Bruegel’s painting of Icarus falling into the sea." },
      { title: "In Memory of W. B. Yeats", year: "1939", note: "Elegy for an Irish poet, declaring that “poetry makes nothing happen.”" }
    ],
    lines: [
      { text: "Stop all the clocks, cut off the telephone", work: "Funeral Blues" },
      { text: "We must love one another or die.", work: "September 1, 1939" },
      { text: "About suffering they were never wrong, / The Old Masters", work: "Musée des Beaux Arts" }
    ]
  },

  /* ───────────────────────── Postwar (after 1945) ───────────────────────── */

  {
    id: "neruda",
    name: "Pablo Neruda",
    born: 1904,
    dates: "1904–1973",
    place: "Chile",
    group: "postwar",
    tag: "Lyric poetry",
    blurb: "Chilean poet of love, the elements, and the Americas, among the most widely read poets of the 20th century.",
    facts: [
      "Pen name of Ricardo Eliécer Neftalí Reyes Basoalto, taken in part from a Czech poet.",
      "Served as a diplomat in Asia, Spain, and Mexico, and as a Communist senator.",
      "Fled Chile on horseback across the Andes in 1949 to escape arrest.",
      "Won the Nobel Prize in Literature in 1971 and died days after the 1973 coup."
    ],
    works: [
      { title: "Twenty Love Poems and a Song of Despair", year: "1924", note: "Youthful, sensual love poems that became one of the best-selling poetry books in Spanish." },
      { title: "Canto General", year: "1950", note: "Epic of the Americas, from geology and pre-Columbian peoples to conquest and liberation." },
      { title: "The Heights of Macchu Picchu", year: "1946", note: "Twelve-part poem climbing to the Inca ruins and speaking for their forgotten builders." },
      { title: "Elemental Odes", year: "1954", note: "Simple, short-lined odes to ordinary things like tomatoes, socks, and onions." }
    ],
    lines: [
      { text: "Tonight I can write the saddest lines.", work: "Twenty Love Poems and a Song of Despair" },
      { text: "Love is so short, forgetting is so long.", work: "Twenty Love Poems and a Song of Despair" }
    ]
  },

  {
    id: "senghor",
    name: "Léopold Sédar Senghor",
    born: 1906,
    dates: "1906–2001",
    place: "Senegal",
    group: "postwar",
    tag: "Négritude",
    blurb: "Senegalese poet-statesman who co-founded the Négritude movement celebrating Black African culture.",
    facts: [
      "Co-founded the Négritude movement in 1930s Paris with Aimé Césaire and Léon Damas.",
      "Spent two years in German prisoner-of-war camps after fighting for France in 1940.",
      "Served as Senegal’s first president, from 1960 to 1980.",
      "In 1983 became the first African elected to the Académie française."
    ],
    works: [
      { title: "Chants d’ombre", year: "1945", note: "Debut collection of songs of exile and nostalgia for an African childhood." },
      { title: "Femme noire", year: "1945", note: "Praise poem celebrating a Black woman’s beauty as an image of Africa itself." },
      { title: "Hosties noires", year: "1948", note: "Poems honoring African soldiers who died for France in World War II." },
      { title: "Anthologie de la nouvelle poésie nègre et malgache", year: "1948", note: "Landmark anthology of Black francophone poets, prefaced by Sartre’s essay “Black Orpheus.”" }
    ],
    lines: [
      { text: "Vêtue de ta couleur qui est vie, de ta forme qui est beauté!", work: "Femme noire" }
    ]
  },

  {
    id: "elizabeth-bishop",
    name: "Elizabeth Bishop",
    born: 1911,
    dates: "1911–1979",
    place: "United States",
    group: "postwar",
    tag: "Lyric poetry",
    blurb: "Meticulous observer whose reticent, exact poems of travel, loss, and geography grow in stature every decade.",
    facts: [
      "Was raised partly by grandparents in Great Village, Nova Scotia, after her mother was committed to an asylum.",
      "Lived for some fifteen years in Brazil with the architect Lota de Macedo Soares.",
      "Served as Consultant in Poetry to the Library of Congress in 1949–50.",
      "Was a close friend and correspondent of Robert Lowell for three decades."
    ],
    works: [
      { title: "One Art", year: "1976", note: "Villanelle insisting that losing keys, houses, and continents is easy, before the real loss of a person." },
      { title: "The Fish", year: "1940", note: "Minute observation of a battered old catch, ending in a moment of rainbow grace and release." },
      { title: "In the Waiting Room", year: "1971", note: "A child in a dentist’s waiting room suddenly realizes she is a separate self." },
      { title: "Geography III", year: "1976", note: "Late, slim collection that won the National Book Critics Circle Award." }
    ],
    lines: [
      { text: "The art of losing isn’t hard to master", work: "One Art" },
      { text: "until everything / was rainbow, rainbow, rainbow!", work: "The Fish" }
    ]
  },

  {
    id: "milosz",
    name: "Czesław Miłosz",
    born: 1911,
    dates: "1911–2004",
    place: "Poland",
    group: "postwar",
    tag: "Lyric poetry",
    blurb: "Polish poet-witness of the 20th century’s catastrophes, who wrote of history, faith, and moral responsibility.",
    facts: [
      "Born in Šeteniai, Lithuania, then part of the Russian Empire.",
      "Lived through the Nazi occupation of Warsaw, working with the underground press.",
      "Defected in 1951 while serving as a cultural attaché for communist Poland in Paris.",
      "Won the Nobel Prize in Literature in 1980 while teaching at UC Berkeley."
    ],
    works: [
      { title: "The Captive Mind", year: "1953", note: "Study of how intellectuals accommodated themselves to Stalinism, through four portraits." },
      { title: "Campo dei Fiori", year: "c. 1943", note: "Compares Warsaw crowds riding a carousel beside the burning ghetto to Romans watching Giordano Bruno burn." },
      { title: "A Song on the End of the World", year: "c. 1944", note: "Ironic lyric in which the world ends on an ordinary sunny day and no one notices." },
      { title: "Dedication", year: "1945", note: "Address to the war dead, offering poetry as both apology and promise." }
    ],
    lines: [
      { text: "You whom I could not save / Listen to me.", work: "Dedication" },
      { text: "No other end of the world will there be", work: "A Song on the End of the World" }
    ]
  },

  {
    id: "hayden",
    name: "Robert Hayden",
    born: 1913,
    dates: "1913–1980",
    place: "United States",
    group: "postwar",
    tag: "Lyric poetry",
    blurb: "Craftsman of African American history and memory, best known for a small, perfect poem about a father’s love.",
    facts: [
      "Born Asa Bundy Sheffer and raised by foster parents in Detroit’s Paradise Valley.",
      "Taught for over two decades at Fisk University in Nashville.",
      "Was a devoted member of the Bahá’í Faith.",
      "In 1976 became the first African American appointed Consultant in Poetry to the Library of Congress."
    ],
    works: [
      { title: "Those Winter Sundays", year: "1962", note: "A son remembers his father rising early to warm the cold house and polish shoes, love he never thanked." },
      { title: "Middle Passage", year: "1945", note: "Collage poem of the Atlantic slave trade, culminating in the Amistad revolt." },
      { title: "Frederick Douglass", year: "1947", note: "Sonnet-like tribute imagining when freedom will truly belong to all." }
    ],
    lines: [
      { text: "What did I know, what did I know / of love’s austere and lonely offices?", work: "Those Winter Sundays" }
    ]
  },

  {
    id: "dylan-thomas",
    name: "Dylan Thomas",
    born: 1914,
    dates: "1914–1953",
    place: "Wales",
    group: "postwar",
    tag: "Lyric poetry",
    blurb: "Welsh poet of rhapsodic, incantatory verse and a legendary performer of his own work.",
    facts: [
      "Born in Swansea, he left school at sixteen to work as a junior newspaper reporter.",
      "Spent his last years in a boathouse at Laugharne overlooking an estuary.",
      "Wrote a “play for voices” about a day in a Welsh seaside town.",
      "Died in New York at 39 during an American reading tour."
    ],
    works: [
      { title: "Do Not Go Gentle into That Good Night", year: "1951", note: "Villanelle urging a dying father to fight against death." },
      { title: "Fern Hill", year: "1945", note: "Lyrical recollection of a golden childhood on an aunt’s farm, shadowed by time." },
      { title: "And Death Shall Have No Dominion", year: "1933", note: "Defiant poem on the triumph of life over death, echoing St. Paul." },
      { title: "Under Milk Wood", year: "1954", note: "Radio drama tracing the dreams and gossip of the inhabitants of Llareggub." }
    ],
    lines: [
      { text: "Rage, rage against the dying of the light.", work: "Do Not Go Gentle into That Good Night" },
      { text: "Time held me green and dying / Though I sang in my chains like the sea.", work: "Fern Hill" }
    ]
  },

  {
    id: "paz",
    name: "Octavio Paz",
    born: 1914,
    dates: "1914–1998",
    place: "Mexico",
    group: "postwar",
    tag: "Surrealism",
    blurb: "Mexican poet and essayist who fused surrealism, Eastern thought, and Mexican history.",
    facts: [
      "Attended an antifascist writers’ congress in Spain during the Civil War in 1937.",
      "Resigned as Mexico’s ambassador to India in protest at the 1968 Tlatelolco massacre.",
      "Founded the influential literary magazines Plural and Vuelta.",
      "Won the Nobel Prize in Literature in 1990."
    ],
    works: [
      { title: "Sunstone", year: "1957", note: "Circular poem of 584 lines, matching the Aztec count of Venus’s cycle, on love, time, and history." },
      { title: "The Labyrinth of Solitude", year: "1950", note: "Essays on Mexican identity, masks, fiestas, and the legacy of conquest." },
      { title: "The Bow and the Lyre", year: "1956", note: "Book-length essay on the nature of poetry." },
      { title: "Blanco", year: "1967", note: "Experimental poem printed on a single folding sheet, readable in multiple ways." }
    ],
    lines: [
      { text: "un sauce de cristal, un chopo de agua", work: "Sunstone" }
    ]
  },

  {
    id: "lowell",
    name: "Robert Lowell",
    born: 1917,
    dates: "1917–1977",
    place: "United States",
    group: "postwar",
    tag: "Confessional poetry",
    blurb: "Boston patrician whose raw, autobiographical turn launched Confessional poetry.",
    facts: [
      "Served five months in prison as a conscientious objector during World War II.",
      "Descended from an old Boston Brahmin family that included earlier poets.",
      "Taught a Boston University workshop attended by Sylvia Plath and Anne Sexton.",
      "Died of a heart attack in a New York taxi in 1977."
    ],
    works: [
      { title: "Life Studies", year: "1959", note: "Breakthrough collection of frank poems about family, marriage, and mental hospitals." },
      { title: "Skunk Hour", year: "1959", note: "A troubled speaker in a decaying Maine town watches skunks forage in the garbage." },
      { title: "For the Union Dead", year: "1960", note: "Boston’s monument to a Black Civil War regiment set against modern parking lots and commerce." },
      { title: "Lord Weary’s Castle", year: "1946", note: "Dense, religious early collection that won the Pulitzer Prize." }
    ],
    lines: [
      { text: "My mind’s not right.", work: "Skunk Hour" },
      { text: "I myself am hell; / nobody’s here—", work: "Skunk Hour" },
      { text: "The Aquarium is gone. Everywhere, / giant finned cars nose forward like fish", work: "For the Union Dead" }
    ]
  },

  {
    id: "gwendolyn-brooks",
    name: "Gwendolyn Brooks",
    born: 1917,
    dates: "1917–2000",
    place: "United States",
    group: "postwar",
    tag: "Lyric poetry",
    blurb: "Chicago poet of Black urban life whose formal mastery made her a towering figure in American letters.",
    facts: [
      "In 1950 became the first Black American to win a Pulitzer Prize.",
      "Lived most of her life on Chicago’s South Side.",
      "Served as Poet Laureate of Illinois from 1968 until her death.",
      "Was the first Black woman appointed Consultant in Poetry to the Library of Congress, in 1985."
    ],
    works: [
      { title: "We Real Cool", year: "1959", note: "Eight-line poem in the voices of seven pool players skipping school, ending with early death." },
      { title: "Annie Allen", year: "1949", note: "Collection tracing a Black girl’s growth to womanhood; it won the Pulitzer Prize." },
      { title: "A Street in Bronzeville", year: "1945", note: "Debut collection portraying a Black neighborhood of Chicago." },
      { title: "The Mother", year: "1945", note: "Monologue of a woman addressing the children she aborted." }
    ],
    lines: [
      { text: "We / Die soon.", work: "We Real Cool" },
      { text: "Abortions will not let you forget.", work: "The Mother" }
    ]
  },

  {
    id: "celan",
    name: "Paul Celan",
    born: 1920,
    dates: "1920–1970",
    place: "Romania",
    group: "postwar",
    tag: "Hermetic poetry",
    blurb: "German-language Jewish poet of the Holocaust, whose fractured, hermetic poems remade the language of the perpetrators.",
    facts: [
      "Born to a German-speaking Jewish family in Czernowitz, Bukovina.",
      "His parents died in a deportation camp; he survived forced labor in Romanian work camps.",
      "Settled in Paris in 1948 and taught German at the École normale supérieure.",
      "Won the Georg Büchner Prize in 1960 and drowned himself in the Seine in 1970."
    ],
    works: [
      { title: "Death Fugue", year: "1947", note: "Fugue-like poem of prisoners in a death camp forced to dig graves and play music for their commandant." },
      { title: "Poppy and Memory", year: "1952", note: "Breakthrough collection of surreal, elegiac poems." },
      { title: "Breathturn", year: "1967", note: "Late collection of terse, fragmented poems that strain language to its limits." }
    ],
    lines: [
      { text: "Black milk of daybreak we drink it at evening", work: "Death Fugue" },
      { text: "der Tod ist ein Meister aus Deutschland", work: "Death Fugue" }
    ]
  },

  {
    id: "larkin",
    name: "Philip Larkin",
    born: 1922,
    dates: "1922–1985",
    place: "England",
    group: "postwar",
    tag: "The Movement",
    blurb: "Wry, melancholy poet of postwar England, master of plain speech and perfect form.",
    facts: [
      "Worked for three decades as university librarian at Hull.",
      "Reviewed jazz records for the Daily Telegraph.",
      "Turned down the Poet Laureateship in 1984.",
      "Asked that his diaries be destroyed after his death; his secretary shredded them."
    ],
    works: [
      { title: "An Arundel Tomb", year: "1956", note: "Meditation on a medieval earl and countess carved holding hands on their tomb." },
      { title: "This Be The Verse", year: "1971", note: "Twelve-line poem on how parents pass on misery, ending with advice not to have children." },
      { title: "The Whitsun Weddings", year: "1964", note: "Collection whose title poem watches wedding parties board a train to London." },
      { title: "Church Going", year: "1955", note: "An agnostic cyclist visits an empty church and ponders what will remain when faith is gone." },
      { title: "Aubade", year: "1977", note: "Dawn poem facing the terror of death with unflinching honesty." }
    ],
    lines: [
      { text: "What will survive of us is love.", work: "An Arundel Tomb" },
      { text: "Man hands on misery to man.", work: "This Be The Verse" }
    ]
  },

  {
    id: "szymborska",
    name: "Wisława Szymborska",
    born: 1923,
    dates: "1923–2012",
    place: "Poland",
    group: "postwar",
    tag: "Lyric poetry",
    blurb: "Polish poet of ironic wonder, whose clear, witty poems ask large questions through small things.",
    facts: [
      "Lived most of her life in Kraków.",
      "Worked for decades as poetry editor of the Kraków weekly Życie Literackie.",
      "Wrote early poems in line with socialist realism, which she later disowned.",
      "Won the Nobel Prize in Literature in 1996."
    ],
    works: [
      { title: "The End and the Beginning", year: "1993", note: "After a war, someone has to clean up the rubble, unglamorous work that goes on long after the cameras leave." },
      { title: "Possibilities", year: "1986", note: "List poem of personal preferences beginning “I prefer.”" },
      { title: "Nothing Twice", year: "1957", note: "Lyric on the unrepeatable nature of each day and encounter; a popular Polish song." },
      { title: "View with a Grain of Sand", year: "1995", note: "English selection that introduced her work widely before her Nobel." }
    ],
    lines: [
      { text: "After every war / someone has to clean up.", work: "The End and the Beginning" },
      { text: "I prefer movies. / I prefer cats.", work: "Possibilities" }
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
    blurb: "The bardic voice of the Beat Generation, whose long-lined howls of protest helped spark the counterculture.",
    facts: [
      "Met Jack Kerouac and William S. Burroughs while a student at Columbia University.",
      "His publisher, Lawrence Ferlinghetti, was tried for obscenity over his first book and acquitted.",
      "Was crowned “King of May” by students in Prague in 1965, then expelled by the authorities.",
      "Practiced Tibetan Buddhism and co-founded a poetics school at Naropa in Boulder."
    ],
    works: [
      { title: "Howl", year: "1956", note: "Long-lined lament for friends destroyed by a conformist society, dedicated to Carl Solomon." },
      { title: "Kaddish", year: "1961", note: "Elegy for the poet’s mentally ill mother, Naomi, modeled on the Jewish prayer for the dead." },
      { title: "A Supermarket in California", year: "1956", note: "A dream of shopping at night with Walt Whitman and Federico García Lorca." }
    ],
    lines: [
      { text: "I saw the best minds of my generation destroyed by madness, starving hysterical naked", work: "Howl" },
      { text: "What thoughts I have of you tonight, Walt Whitman", work: "A Supermarket in California" }
    ]
  },

  {
    id: "ohara",
    name: "Frank O’Hara",
    born: 1926,
    dates: "1926–1966",
    place: "United States",
    group: "postwar",
    tag: "New York School",
    blurb: "Breezy, gossipy, tender poet of Manhattan streets and art, central to the New York School.",
    facts: [
      "Served in the US Navy in the Pacific during World War II.",
      "Worked as a curator at the Museum of Modern Art.",
      "Wrote many poems during his lunch hour in Midtown Manhattan.",
      "Died at 40 after being struck by a dune buggy on Fire Island."
    ],
    works: [
      { title: "Lunch Poems", year: "1964", note: "City Lights collection of poems jotted on midday walks." },
      { title: "The Day Lady Died", year: "c. 1959", note: "A diary of errands on the day Billie Holiday died, ending with memory of her singing." },
      { title: "Meditations in an Emergency", year: "1957", note: "Collection whose title prose poem celebrates city life over nature." }
    ],
    lines: [
      { text: "It is 12:20 in New York a Friday / three days after Bastille day, yes / it is 1959", work: "The Day Lady Died" },
      { text: "and everyone and I stopped breathing", work: "The Day Lady Died" }
    ]
  },

  {
    id: "ashbery",
    name: "John Ashbery",
    born: 1927,
    dates: "1927–2017",
    place: "United States",
    group: "postwar",
    tag: "New York School",
    blurb: "Elusive, dreamlike master of the New York School, often called the most influential American poet of his era.",
    facts: [
      "His first book was chosen by W. H. Auden for the Yale Series of Younger Poets in 1956.",
      "Lived in Paris for a decade, writing art criticism for the Herald Tribune.",
      "Swept the Pulitzer Prize, National Book Award, and National Book Critics Circle Award for one book.",
      "Became the first living poet published in the Library of America series."
    ],
    works: [
      { title: "Self-Portrait in a Convex Mirror", year: "1975", note: "Long meditation on a Mannerist painter’s distorted self-portrait and the nature of art." },
      { title: "Some Trees", year: "1956", note: "Debut collection of elegant, enigmatic lyrics." },
      { title: "The Tennis Court Oath", year: "1962", note: "Radically fragmented experimental collection." },
      { title: "Paradoxes and Oxymorons", year: "1981", note: "Short poem in which a poem talks to its reader about language and play." }
    ],
    lines: [
      { text: "As Parmigianino did it, the right hand / Bigger than the head, thrust at the viewer", work: "Self-Portrait in a Convex Mirror" },
      { text: "This poem is concerned with language on a very plain level.", work: "Paradoxes and Oxymorons" }
    ]
  },

  {
    id: "anne-sexton",
    name: "Anne Sexton",
    born: 1928,
    dates: "1928–1974",
    place: "United States",
    group: "postwar",
    tag: "Confessional poetry",
    blurb: "Confessional poet who wrote openly of madness, sexuality, and the female body.",
    facts: [
      "Began writing poetry at a therapist’s suggestion after a breakdown.",
      "Worked briefly as a fashion model in Boston.",
      "Won the Pulitzer Prize for Poetry in 1967.",
      "Formed a chamber-rock band to perform her poems with music."
    ],
    works: [
      { title: "Her Kind", year: "1960", note: "A speaker identifies with a witch, a housewife, and a woman on the way to execution." },
      { title: "To Bedlam and Part Way Back", year: "1960", note: "Debut collection about mental illness and recovery." },
      { title: "Transformations", year: "1971", note: "Dark, witty retellings of Grimm fairy tales." },
      { title: "Live or Die", year: "1966", note: "Pulitzer-winning collection oscillating between suicidal despair and affirmation." }
    ],
    lines: [
      { text: "I have gone out, a possessed witch, / haunting the black air, braver at night", work: "Her Kind" }
    ]
  },

  {
    id: "angelou",
    name: "Maya Angelou",
    born: 1928,
    dates: "1928–2014",
    place: "United States",
    group: "postwar",
    tag: "Lyric poetry",
    blurb: "Poet, memoirist, and activist whose voice of resilience made her one of America’s best-loved writers.",
    facts: [
      "As a teenager became San Francisco’s first Black woman streetcar conductor.",
      "Was mute for about five years after a childhood trauma.",
      "Worked with both Malcolm X and Martin Luther King Jr. in the civil rights movement.",
      "Read a poem at Bill Clinton’s 1993 inauguration."
    ],
    works: [
      { title: "Still I Rise", year: "1978", note: "Defiant anthem of Black dignity rising above oppression, like dust and air." },
      { title: "On the Pulse of Morning", year: "1993", note: "Inaugural poem in which a rock, a river, and a tree speak to the American people." },
      { title: "Phenomenal Woman", year: "1978", note: "Confident celebration of a woman’s self-assurance and inner mystery." },
      { title: "I Know Why the Caged Bird Sings", year: "1969", note: "First volume of autobiography, about a childhood in Arkansas and St. Louis." }
    ],
    lines: [
      { text: "You may write me down in history / With your bitter, twisted lies", work: "Still I Rise" },
      { text: "History, despite its wrenching pain, / Cannot be unlived, but if faced / With courage, need not be lived again.", work: "On the Pulse of Morning" }
    ]
  },

  {
    id: "adrienne-rich",
    name: "Adrienne Rich",
    born: 1929,
    dates: "1929–2012",
    place: "United States",
    group: "postwar",
    tag: "Feminist poetry",
    blurb: "Leading feminist poet and essayist who moved from formal elegance to radical political vision.",
    facts: [
      "Her first book was chosen by W. H. Auden for the Yale Series of Younger Poets in 1951.",
      "Accepted the 1974 National Book Award jointly with Audre Lorde and Alice Walker on behalf of all women.",
      "Refused the National Medal of Arts in 1997 in protest of government policy.",
      "Came out as a lesbian in the mid-1970s."
    ],
    works: [
      { title: "Diving into the Wreck", year: "1973", note: "A diver descends to explore a sunken ship—an allegory of women recovering hidden history." },
      { title: "Aunt Jennifer’s Tigers", year: "1951", note: "A woman weighed down by marriage embroiders fearless, prancing beasts." },
      { title: "Twenty-One Love Poems", year: "1976", note: "Sequence of lesbian love poems set in New York City." },
      { title: "Of Woman Born", year: "1976", note: "Prose study of motherhood as experience and as institution." }
    ],
    lines: [
      { text: "I came to explore the wreck.", work: "Diving into the Wreck" },
      { text: "the wreck and not the story of the wreck / the thing itself and not the myth", work: "Diving into the Wreck" }
    ]
  },

  {
    id: "ted-hughes",
    name: "Ted Hughes",
    born: 1930,
    dates: "1930–1998",
    place: "England",
    group: "postwar",
    tag: "Nature poetry",
    blurb: "English poet of violent animal energy and myth, Poet Laureate for fourteen years.",
    facts: [
      "Grew up in the Calder Valley of West Yorkshire, the son of a carpenter.",
      "Married Sylvia Plath in 1956.",
      "Served as Poet Laureate from 1984 until his death.",
      "Broke decades of silence about his first marriage in a book of poems published months before he died."
    ],
    works: [
      { title: "The Hawk in the Rain", year: "1957", note: "Debut collection of muscular animal poems." },
      { title: "The Thought-Fox", year: "1957", note: "The act of writing a poem imagined as a fox approaching through a midnight forest." },
      { title: "Hawk Roosting", year: "1960", note: "Monologue of a bird of prey supremely confident in its power." },
      { title: "Crow", year: "1970", note: "Mythic sequence about a trickster bird who survives creation and catastrophe." },
      { title: "Birthday Letters", year: "1998", note: "Poems addressed to a dead first wife, recounting their marriage." }
    ],
    lines: [
      { text: "I sit in the top of the wood, my eyes closed.", work: "Hawk Roosting" },
      { text: "I imagine this midnight moment’s forest", work: "The Thought-Fox" }
    ]
  },

  {
    id: "walcott",
    name: "Derek Walcott",
    born: 1930,
    dates: "1930–2017",
    place: "Saint Lucia",
    group: "postwar",
    tag: "Postcolonial literature",
    blurb: "Caribbean poet and playwright who fused Homeric epic, island landscape, and colonial history.",
    facts: [
      "Born in Castries on the Caribbean island of Saint Lucia.",
      "Was also a painter in watercolors.",
      "Founded the Trinidad Theatre Workshop in 1959.",
      "Won the Nobel Prize in Literature in 1992."
    ],
    works: [
      { title: "Omeros", year: "1990", note: "Caribbean epic in loose terza rima that recasts the Iliad among Saint Lucian fishermen." },
      { title: "A Far Cry from Africa", year: "1962", note: "A poet of mixed heritage is torn between Africa and the English language during the Mau Mau uprising." },
      { title: "Love After Love", year: "1976", note: "Gentle poem about rediscovering and welcoming oneself after heartbreak." },
      { title: "The Schooner Flight", year: "1979", note: "Long poem narrated by Shabine, a sailor-poet of mixed race, voyaging through the Caribbean." }
    ],
    lines: [
      { text: "The time will come / when, with elation / you will greet yourself arriving / at your own door", work: "Love After Love" },
      { text: "I who am poisoned with the blood of both, / Where shall I turn, divided to the vein?", work: "A Far Cry from Africa" },
      { text: "either I’m nobody, or I’m a nation.", work: "The Schooner Flight" }
    ]
  },

  {
    id: "plath",
    name: "Sylvia Plath",
    born: 1932,
    dates: "1932–1963",
    place: "United States",
    group: "postwar",
    tag: "Confessional poetry",
    blurb: "Confessional poet of searing intensity, whose final poems made her one of the most famous poets of the century.",
    facts: [
      "Was a guest editor at Mademoiselle magazine in 1953.",
      "Married the English poet Ted Hughes in 1956.",
      "Died by suicide in London in 1963, at 30.",
      "Won a posthumous Pulitzer Prize for Poetry in 1982."
    ],
    works: [
      { title: "Ariel", year: "1965", note: "Posthumous collection of furious late poems, written in a burst in 1962." },
      { title: "Lady Lazarus", year: "c. 1962", note: "A speaker who has survived suicide attempts rises from the ash like a demonic resurrection." },
      { title: "Daddy", year: "c. 1962", note: "Nursery-rhyme-rhythmed exorcism of a dead father, portrayed as a Nazi." },
      { title: "Morning Song", year: "c. 1961", note: "Tender poem of a new mother waking to her baby’s cry." },
      { title: "The Colossus", year: "1960", note: "Debut collection, the only book of poems published in her lifetime." }
    ],
    lines: [
      { text: "Dying / Is an art, like everything else. / I do it exceptionally well.", work: "Lady Lazarus" },
      { text: "Every woman adores a Fascist", work: "Daddy" },
      { text: "Love set you going like a fat gold watch.", work: "Morning Song" }
    ]
  },

  {
    id: "audre-lorde",
    name: "Audre Lorde",
    born: 1934,
    dates: "1934–1992",
    place: "United States",
    group: "postwar",
    tag: "Feminist poetry",
    blurb: "Self-described “Black, lesbian, mother, warrior, poet” whose work joined fierce lyricism and activism.",
    facts: [
      "Worked as a librarian before teaching at John Jay College and Hunter College.",
      "Co-founded Kitchen Table: Women of Color Press with Barbara Smith.",
      "Wrote openly of her breast cancer and mastectomy.",
      "Served as New York State Poet from 1991 to 1993."
    ],
    works: [
      { title: "A Litany for Survival", year: "1978", note: "Poem for those living on the margins, urging them to speak despite fear." },
      { title: "The Black Unicorn", year: "1978", note: "Collection drawing on West African myth, especially Dahomey goddesses." },
      { title: "Sister Outsider", year: "1984", note: "Essays and speeches on race, sexuality, anger, and difference." },
      { title: "The Cancer Journals", year: "1980", note: "Memoir and essays on breast cancer, mastectomy, and visibility." }
    ],
    lines: [
      { text: "So it is better to speak / remembering / we were never meant to survive", work: "A Litany for Survival" },
      { text: "The master’s tools will never dismantle the master’s house.", work: "Sister Outsider" }
    ]
  },

  {
    id: "mary-oliver",
    name: "Mary Oliver",
    born: 1935,
    dates: "1935–2019",
    place: "United States",
    group: "postwar",
    tag: "Nature poetry",
    blurb: "Beloved poet of close attention to the natural world, among the best-selling American poets.",
    facts: [
      "As a teenager stayed at Edna St. Vincent Millay’s former home, helping sort the late poet’s papers.",
      "Lived for decades in Provincetown, Massachusetts, with photographer Molly Malone Cook.",
      "Won the Pulitzer Prize for Poetry in 1984.",
      "Wrote much of her work while walking in the woods with a notebook."
    ],
    works: [
      { title: "The Summer Day", year: "1990", note: "A speaker watches a grasshopper and asks what we will do with our lives." },
      { title: "Wild Geese", year: "1986", note: "Consoling poem that you need not be perfect, as the world offers itself to your imagination." },
      { title: "American Primitive", year: "1983", note: "Pulitzer-winning collection of poems on nature and the body." },
      { title: "When Death Comes", year: "1992", note: "Resolves to meet death having lived “married to amazement.”" }
    ],
    lines: [
      { text: "Tell me, what is it you plan to do / with your one wild and precious life?", work: "The Summer Day" },
      { text: "You do not have to be good.", work: "Wild Geese" }
    ]
  },

  {
    id: "heaney",
    name: "Seamus Heaney",
    born: 1939,
    dates: "1939–2013",
    place: "Ireland",
    group: "postwar",
    tag: "Lyric poetry",
    blurb: "Northern Irish poet of the bog, the farm, and the Troubles, the most celebrated poet writing in English of his time.",
    facts: [
      "Grew up the eldest of nine children on a farm in County Derry.",
      "Served as Oxford Professor of Poetry.",
      "Won the Nobel Prize in Literature in 1995.",
      "His last words, texted to his wife, were “Noli timere” (“Don’t be afraid”)."
    ],
    works: [
      { title: "Digging", year: "1964", note: "A writer watches his father dig potatoes and resolves to use his pen as his spade." },
      { title: "Death of a Naturalist", year: "1966", note: "Debut collection of childhood and farm life in rural Northern Ireland." },
      { title: "Mid-Term Break", year: "1966", note: "Quiet elegy for a four-year-old brother killed by a car." },
      { title: "North", year: "1975", note: "Collection linking Iron Age bog bodies to sectarian violence." },
      { title: "Beowulf", year: "1999", note: "Best-selling verse translation of the Old English epic." }
    ],
    lines: [
      { text: "Between my finger and my thumb / The squat pen rests; snug as a gun.", work: "Digging" },
      { text: "A four-foot box, a foot for every year.", work: "Mid-Term Break" }
    ]
  },

  {
    id: "brodsky",
    name: "Joseph Brodsky",
    born: 1940,
    dates: "1940–1996",
    place: "Russia",
    group: "postwar",
    tag: "Lyric poetry",
    blurb: "Russian poet tried as a “social parasite” and exiled, who became a Nobel laureate and US Poet Laureate.",
    facts: [
      "Left school at fifteen and worked in a factory, a morgue, and on geological expeditions.",
      "Was tried in 1964 for “social parasitism” and sentenced to internal exile in the far north.",
      "Was expelled from the USSR in 1972 and settled in the United States.",
      "Won the Nobel Prize in Literature in 1987 and is buried in Venice."
    ],
    works: [
      { title: "A Part of Speech", year: "1980", note: "English collection of lyrics on exile, time, and empire." },
      { title: "Less Than One", year: "1986", note: "Essays on Leningrad childhood, poets, and language." },
      { title: "Watermark", year: "1992", note: "Prose meditation on winter visits to Venice." },
      { title: "Odysseus to Telemachus", year: "c. 1972", note: "A weary wanderer writes to the son he no longer recognizes." }
    ],
    lines: [
      { text: "My dear Telemachus, / The Trojan War / is over now; I don’t recall who won it.", work: "Odysseus to Telemachus" }
    ]
  },

  {
    id: "darwish",
    name: "Mahmoud Darwish",
    born: 1941,
    dates: "1941–2008",
    place: "Palestine",
    group: "postwar",
    tag: "Resistance poetry",
    blurb: "Palestinian national poet whose lyrics of exile, land, and identity are recited across the Arab world.",
    facts: [
      "His village of al-Birwa in the Galilee was destroyed during the 1948 war.",
      "Was repeatedly jailed and placed under house arrest by Israeli authorities in the 1960s.",
      "Drafted the Palestinian Declaration of Independence proclaimed in 1988.",
      "Lived in exile in Beirut, Paris, and elsewhere before settling in Ramallah."
    ],
    works: [
      { title: "Identity Card", year: "1964", note: "Defiant poem addressed to an Israeli official recording a Palestinian worker’s details." },
      { title: "Memory for Forgetfulness", year: "1987", note: "Prose poem of a single day during the 1982 siege of Beirut." },
      { title: "Mural", year: "2000", note: "Long poem confronting death after heart surgery." },
      { title: "In the Presence of Absence", year: "2006", note: "Late prose-poem self-elegy." }
    ],
    lines: [
      { text: "Sajjil! / Ana ‘Arabi", work: "Identity Card" }
    ]
  },

  {
    id: "gluck",
    name: "Louise Glück",
    born: 1943,
    dates: "1943–2023",
    place: "United States",
    group: "postwar",
    tag: "Lyric poetry",
    blurb: "Austere, mythic lyric poet of trauma, family, and nature, awarded the Nobel Prize in 2020.",
    facts: [
      "Battled anorexia as a teenager, which led to years of psychoanalysis.",
      "Won the Pulitzer Prize for Poetry in 1993.",
      "Served as US Poet Laureate in 2003–04.",
      "Won the Nobel Prize in Literature in 2020."
    ],
    works: [
      { title: "The Wild Iris", year: "1992", note: "Collection in which garden flowers, a gardener, and a god speak in turn." },
      { title: "Averno", year: "2006", note: "Collection reworking the Persephone myth around a volcanic lake seen as the entrance to the underworld." },
      { title: "Faithful and Virtuous Night", year: "2014", note: "Dreamlike collection that won the National Book Award." },
      { title: "The Triumph of Achilles", year: "1985", note: "Collection reworking classical myth and grief." }
    ],
    lines: [
      { text: "At the end of my suffering / there was a door.", work: "The Wild Iris" }
    ]
  },

  {
    id: "anne-carson",
    name: "Anne Carson",
    born: 1950,
    dates: "b. 1950",
    place: "Canada",
    group: "postwar",
    tag: "Postmodernism",
    blurb: "Canadian classicist-poet whose genre-bending books fuse ancient Greek texts with contemporary life.",
    facts: [
      "A professor of classics who has taught at McGill, Michigan, and NYU.",
      "Has translated Sappho and Greek tragedy.",
      "Won the inaugural Griffin Poetry Prize in 2001.",
      "Made an accordion-folded book in a box as an elegy for her brother."
    ],
    works: [
      { title: "Autobiography of Red", year: "1998", note: "Novel in verse reimagining the Greek monster Geryon as a gay boy in love with Herakles." },
      { title: "The Glass Essay", year: "1995", note: "Long poem braiding a breakup, a mother, and Emily Brontë on the moors." },
      { title: "Nox", year: "2010", note: "Facsimile notebook elegy built around a Catullus poem for a dead brother." },
      { title: "Eros the Bittersweet", year: "1986", note: "Scholarly essay on desire in ancient Greek poetry." }
    ],
    lines: [
      { text: "I can hear little clicks inside my dream.", work: "The Glass Essay" }
    ]
  },

  {
    id: "rita-dove",
    name: "Rita Dove",
    born: 1952,
    dates: "b. 1952",
    place: "United States",
    group: "postwar",
    tag: "Lyric poetry",
    blurb: "Poet of history and family who became the youngest US Poet Laureate and the first African American in the role.",
    facts: [
      "Was US Poet Laureate from 1993 to 1995, the youngest and first African American to hold the title.",
      "Won the 1987 Pulitzer Prize for a sequence based loosely on her grandparents’ lives.",
      "Is an accomplished ballroom dancer.",
      "Received the National Medal of Arts in 2011."
    ],
    works: [
      { title: "Thomas and Beulah", year: "1986", note: "Linked poems tracing a Black couple’s lives from the Great Migration to the 1960s in Akron, Ohio." },
      { title: "Parsley", year: "1983", note: "Poem on the 1937 massacre of Haitians by Dominican dictator Trujillo, who chose victims by their pronunciation of a word." },
      { title: "Sonata Mulattica", year: "2009", note: "Verse life of George Bridgetower, a Black violinist for whom Beethoven wrote a sonata." }
    ],
    lines: [
      { text: "El General has found his word: perejil. / Who says it, lives.", work: "Parsley" }
    ]
  },

  {
    id: "vuong",
    name: "Ocean Vuong",
    born: 1988,
    dates: "b. 1988",
    place: "United States",
    group: "postwar",
    tag: "Lyric poetry",
    blurb: "Vietnamese American poet and novelist of war memory, queer desire, and family love.",
    facts: [
      "Born near Saigon, he came to the United States at two after a stay in a Philippine refugee camp.",
      "Grew up in Hartford, Connecticut, where his mother worked in nail salons.",
      "Won the T. S. Eliot Prize in 2017 and a MacArthur Fellowship in 2019.",
      "His first novel takes the form of a letter to his mother, who cannot read."
    ],
    works: [
      { title: "Night Sky with Exit Wounds", year: "2016", note: "Debut collection on the Vietnam War’s legacy, immigration, a father’s absence, and queer love." },
      { title: "On Earth We’re Briefly Gorgeous", year: "2019", note: "Novel in the form of a letter from a son to his mother." },
      { title: "Time Is a Mother", year: "2022", note: "Second collection, written in grief after the death of the poet’s mother." }
    ],
    lines: [
      { text: "The end of the road is so far ahead / it is already behind us.", work: "Night Sky with Exit Wounds" }
    ]
  }

];
