window.DRILL_DATA = window.DRILL_DATA || {};
window.DRILL_DATA.philosophers = [

  /* ===================== Ancient Greece and Rome ===================== */

  {
    id: "thales",
    name: "Thales",
    born: -624,
    dates: "c. 624–546 BCE",
    place: "Miletus (Ionia)",
    group: "ancient",
    tag: "Milesian school",
    blurb: "Often called the first Western philosopher, he looked for natural rather than mythological explanations of the cosmos.",
    facts: [
      "From Miletus in Ionia, on the coast of present-day Turkey.",
      "Aristotle counted him as the first to inquire into the basic principle of nature.",
      "Said to have predicted a solar eclipse, traditionally dated to 585 BCE.",
      "Reportedly cornered the market in olive presses to show that a philosopher could get rich if he wished."
    ],
    ideas: [
      { term: "Water as first principle", text: "Held that the single underlying stuff from which all things come, and of which they are made, is water." },
      { term: "Hylozoism", text: "Treated matter itself as alive or ensouled, citing the magnet’s power to move iron as evidence that stones have soul." },
      { term: "Naturalistic explanation", text: "Explained phenomena such as earthquakes by natural causes (the earth floating and rocking on water) rather than by the actions of gods." }
    ],
    works: [],
    quotes: ["All things are full of gods."]
  },

  {
    id: "pythagoras",
    name: "Pythagoras",
    born: -570,
    dates: "c. 570–495 BCE",
    place: "Croton (southern Italy)",
    group: "ancient",
    tag: "Pythagoreanism",
    blurb: "Mathematician and mystic who founded a religious and philosophical community in southern Italy and taught that number underlies reality.",
    facts: [
      "Born on the island of Samos.",
      "Founded a secretive brotherhood at Croton in southern Italy.",
      "His followers kept strict rules, including a famous ban on eating beans.",
      "Credited, probably legendarily, with discovering the numerical ratios behind musical harmony."
    ],
    ideas: [
      { term: "All is number", text: "Held that the structure of reality is fundamentally mathematical, with numerical ratios underlying everything." },
      { term: "Transmigration of souls", text: "Taught that the soul is immortal and is reborn in new bodies, human or animal (metempsychosis)." },
      { term: "Harmony of the spheres", text: "Claimed that the heavenly bodies move according to mathematical ratios that produce a cosmic music." }
    ],
    works: [],
    quotes: []
  },

  {
    id: "heraclitus",
    name: "Heraclitus",
    born: -535,
    dates: "c. 535–475 BCE",
    place: "Ephesus (Ionia)",
    group: "ancient",
    tag: "Presocratic",
    blurb: "Enigmatic thinker of Ephesus who stressed constant change and the unity of opposites, all governed by a rational principle, the logos.",
    facts: [
      "Nicknamed “the Obscure” for his riddling, aphoristic style.",
      "Said to have deposited his book in the temple of Artemis at Ephesus.",
      "Later tradition called him “the weeping philosopher.”",
      "His thought survives only in about a hundred short fragments quoted by later writers."
    ],
    ideas: [
      { term: "Flux", text: "Held that everything is constantly changing: you cannot step into the same river twice, because new waters keep flowing." },
      { term: "Unity of opposites", text: "Argued that opposites such as day and night, or sickness and health, are bound together and depend on each other." },
      { term: "Logos", text: "Posited a rational order or account that governs all change, though most people fail to grasp it." },
      { term: "Fire as fundamental", text: "Treated fire as the basic element: the world is an ever-living fire, kindled and quenched in measures." }
    ],
    works: [
      { title: "On Nature (fragments)", year: "c. 500 BCE", note: "A lost book of aphorisms on the cosmos, politics, and theology, known only from fragments quoted by later writers." }
    ],
    quotes: [
      "Character is destiny.",
      "The way up and the way down are one and the same."
    ]
  },

  {
    id: "parmenides",
    name: "Parmenides",
    born: -515,
    dates: "c. 515–450 BCE",
    place: "Elea (southern Italy)",
    group: "ancient",
    tag: "Eleatic school",
    blurb: "Founder of the Eleatic school, whose poem argued that change and plurality are illusions and that reality is one unchanging Being.",
    facts: [
      "Wrote his philosophy as a hexameter poem in which a goddess reveals the truth.",
      "Teacher and older friend of Zeno of Elea.",
      "Plato depicts him, as an old man, debating a young Socrates.",
      "Said to have written the laws for his home city of Elea."
    ],
    ideas: [
      { term: "The Way of Truth", text: "Argued that what is, is, and what is not cannot be; so nothing can come into being or pass away." },
      { term: "The Way of Opinion", text: "Contrasted reason’s truth with the deceptive world of the senses, which falsely shows change and multiplicity." },
      { term: "Monism", text: "Held that reality is a single, eternal, indivisible, and motionless whole." }
    ],
    works: [
      { title: "On Nature", year: "c. 475 BCE", note: "A partly surviving philosophical poem that sets the path of reason against the mistaken beliefs of mortals." }
    ],
    quotes: ["For it is the same thing to think and to be."]
  },

  {
    id: "zeno-of-elea",
    name: "Zeno of Elea",
    born: -490,
    dates: "c. 490–430 BCE",
    place: "Elea (southern Italy)",
    group: "ancient",
    tag: "Eleatic school",
    blurb: "Student of Parmenides, famous for paradoxes designed to show that motion and plurality lead to absurdity.",
    facts: [
      "Student and defender of Parmenides.",
      "Aristotle reportedly called him the inventor of dialectic.",
      "Plato depicts him visiting Athens with his teacher and meeting a young Socrates.",
      "According to legend, he bit off his own tongue and spat it at a tyrant who was torturing him."
    ],
    ideas: [
      { term: "Achilles and the tortoise", text: "A fast runner can never overtake a slower one with a head start, since he must first reach where it was, by which time it has moved on." },
      { term: "Dichotomy paradox", text: "To cross any distance you must first cross half of it, then half of the rest, and so on forever, so motion seems impossible." },
      { term: "Arrow paradox", text: "At every instant a flying arrow occupies a space equal to itself and so is at rest; therefore it never moves." },
      { term: "Reductio ad absurdum", text: "Defended his teacher by showing that the opponents’ assumptions of plurality and motion lead to contradictions." }
    ],
    works: [],
    quotes: []
  },

  {
    id: "democritus",
    name: "Democritus",
    born: -460,
    dates: "c. 460–370 BCE",
    place: "Abdera (Thrace)",
    group: "ancient",
    tag: "Atomism",
    blurb: "Developed, with his teacher Leucippus, the theory that everything consists of indivisible atoms moving in empty space.",
    facts: [
      "From Abdera in Thrace, in northern Greece.",
      "Known as “the laughing philosopher” for mocking human folly.",
      "Developed his theory of matter together with his teacher Leucippus.",
      "Reportedly spent his inheritance traveling widely, perhaps as far as Egypt and Persia."
    ],
    ideas: [
      { term: "Atoms and the void", text: "Reality consists only of tiny, indivisible, eternal particles moving through empty space." },
      { term: "Sensory qualities by convention", text: "Sweet, bitter, hot, cold, and color exist only by convention; in reality there are only particles and emptiness." },
      { term: "Euthymia", text: "The goal of life is cheerfulness or tranquility of soul, achieved through moderation." }
    ],
    works: [],
    quotes: ["By convention sweet, by convention bitter, by convention hot, by convention cold, by convention color; but in reality atoms and void."]
  },

  {
    id: "protagoras",
    name: "Protagoras",
    born: -490,
    dates: "c. 490–420 BCE",
    place: "Athens (born in Abdera)",
    group: "ancient",
    tag: "Sophists",
    blurb: "The most famous of the Sophists, he taught rhetoric for pay and argued that truth is relative to the perceiver.",
    facts: [
      "Born in Abdera, he became the most celebrated paid teacher of rhetoric in Athens.",
      "Reportedly asked by Pericles to draft the laws for the new colony of Thurii.",
      "Plato named a dialogue after him and attacked his relativism in the Theaetetus.",
      "According to later tradition, his book on the gods was publicly burned in Athens."
    ],
    ideas: [
      { term: "Man is the measure of all things", text: "Each person is the judge of how things are for them, so knowledge and truth are relative to the perceiver." },
      { term: "Agnosticism about the gods", text: "Declared that he could not know whether the gods exist, since the subject is obscure and human life is short." },
      { term: "Making the weaker argument the stronger", text: "Taught students to argue either side of any case, a skill critics saw as clever manipulation." }
    ],
    works: [
      { title: "On the Gods", year: "5th c. BCE", note: "A lost treatise that opened by doubting whether anyone can know if the gods exist." }
    ],
    quotes: ["Man is the measure of all things: of the things that are, that they are, and of the things that are not, that they are not."]
  },

  {
    id: "socrates",
    name: "Socrates",
    born: -470,
    dates: "c. 470–399 BCE",
    place: "Athens",
    group: "ancient",
    tag: "Classical Greek philosophy",
    blurb: "Athenian street philosopher who wrote nothing but, through relentless questioning, turned philosophy toward ethics and how to live.",
    facts: [
      "Wrote nothing; known mainly through Plato, Xenophon, and the comic playwright Aristophanes.",
      "Died after drinking hemlock, sentenced by an Athenian jury for impiety and corrupting the youth.",
      "Served as a hoplite soldier in the Peloponnesian War.",
      "The oracle at Delphi declared that no one was wiser than he."
    ],
    ideas: [
      { term: "Elenchus", text: "A method of cross-examining someone’s beliefs with questions until contradictions show they do not know what they thought they knew." },
      { term: "Professed ignorance", text: "Claimed that his only wisdom lay in recognizing that he knew nothing of real importance." },
      { term: "Virtue is knowledge", text: "No one does wrong willingly; wrongdoing comes from ignorance of what is truly good." },
      { term: "Care of the soul", text: "The most important task in life is to make one’s soul as good as possible, above wealth or reputation." }
    ],
    works: [],
    quotes: ["The unexamined life is not worth living."]
  },

  {
    id: "plato",
    name: "Plato",
    born: -428,
    dates: "c. 428–348 BCE",
    place: "Athens",
    group: "ancient",
    tag: "Platonism",
    blurb: "Student of Socrates and teacher of Aristotle, whose dialogues on ethics, politics, and metaphysics shaped nearly all later Western philosophy.",
    facts: [
      "Student of Socrates and teacher of Aristotle.",
      "Founded the Academy in Athens around 387 BCE.",
      "Wrote dialogues in which Socrates is usually the main speaker.",
      "Visited Syracuse in Sicily several times, unsuccessfully trying to guide its rulers."
    ],
    ideas: [
      { term: "Theory of Forms", text: "Beyond changing physical things lie perfect, eternal, unchanging ideas, such as Beauty and Justice, that are the true objects of knowledge." },
      { term: "Allegory of the cave", text: "Ordinary people are like prisoners watching shadows on a wall, who must be led out into the sunlight of true knowledge." },
      { term: "Philosopher-kings", text: "The just city will be ruled by those who love wisdom and know the Good." },
      { term: "Tripartite soul", text: "The soul has three parts, reason, spirit, and appetite; justice is each part doing its proper job under reason’s rule." },
      { term: "Recollection (anamnesis)", text: "Learning is really remembering what the immortal soul knew before birth." }
    ],
    works: [
      { title: "The Republic", year: "c. 375 BCE", note: "Dialogue on justice that describes an ideal city ruled by philosophers and includes the allegory of the cave." },
      { title: "Apology", year: "c. 390 BCE", note: "Socrates’ defense speech at his trial for impiety and corrupting the youth." },
      { title: "Symposium", year: "c. 385 BCE", note: "Dinner-party dialogue in which speakers praise love, culminating in an ascent to Beauty itself." },
      { title: "Phaedo", year: "c. 380 BCE", note: "Depicts Socrates’ last day in prison and offers arguments for the immortality of the soul." }
    ],
    quotes: ["The beginning is the most important part of the work."]
  },

  {
    id: "aristotle",
    name: "Aristotle",
    born: -384,
    dates: "384–322 BCE",
    place: "Athens (born in Stagira)",
    group: "ancient",
    tag: "Peripatetic school",
    blurb: "Student of Plato and tutor of Alexander the Great who systematized logic, science, ethics, and politics for two thousand years.",
    facts: [
      "Studied at Plato’s Academy for about twenty years.",
      "Tutored the young Alexander the Great.",
      "Founded the Lyceum in Athens; his followers were called Peripatetics, from the walkways where he taught.",
      "Medieval writers often called him simply “the Philosopher.”"
    ],
    ideas: [
      { term: "Four causes", text: "Things are explained by their material, formal, efficient, and final causes: what they are made of, their form, what produced them, and their purpose." },
      { term: "Golden mean", text: "Each virtue lies between two vices of excess and deficiency, as courage lies between rashness and cowardice." },
      { term: "Eudaimonia", text: "The highest human good is flourishing: a complete life of activity in accordance with virtue and reason." },
      { term: "Syllogism", text: "The first formal logic: deductive arguments in which a conclusion follows necessarily from two premises." },
      { term: "Unmoved mover", text: "The eternal motion of the heavens requires a first cause that moves everything else without itself being moved." }
    ],
    works: [
      { title: "Nicomachean Ethics", year: "c. 340 BCE", note: "Argues that happiness is the goal of life and is achieved through virtuous activity and good character." },
      { title: "Politics", year: "c. 350 BCE", note: "Study of the city-state, constitutions, citizenship, and the best form of government." },
      { title: "Metaphysics", year: "c. 350 BCE", note: "Inquiry into being as being, substance, and the first unmoved cause of all motion." },
      { title: "Poetics", year: "c. 335 BCE", note: "Earliest surviving work of literary theory, analyzing tragedy, plot, and catharsis." }
    ],
    quotes: [
      "Man is by nature a political animal.",
      "All men by nature desire to know."
    ]
  },

  {
    id: "diogenes",
    name: "Diogenes of Sinope",
    born: -412,
    dates: "c. 412–323 BCE",
    place: "Athens and Corinth",
    group: "ancient",
    tag: "Cynicism",
    blurb: "The most famous Cynic, who lived in deliberate poverty and shamelessness to show that virtue requires nothing but rejecting convention.",
    facts: [
      "Lived in a large ceramic storage jar in the Athenian marketplace.",
      "Carried a lamp in broad daylight, claiming to be searching for a real human being.",
      "When Alexander the Great offered him anything he wished, reportedly asked him to stand out of his sunlight.",
      "Exiled from his home city on the Black Sea after a scandal over defacing the currency."
    ],
    ideas: [
      { term: "Living according to nature", text: "Happiness comes from living simply and naturally, rejecting wealth, status, and social custom." },
      { term: "Cosmopolitanism", text: "Declared allegiance to the whole cosmos rather than to any single city-state." },
      { term: "Shamelessness (anaideia)", text: "Performed private acts in public to show that conventional shame and propriety are arbitrary." },
      { term: "Askesis", text: "Trained himself through deliberate hardship, such as embracing snow-covered statues in winter, to become self-sufficient." }
    ],
    works: [],
    quotes: ["I am a citizen of the world."]
  },

  {
    id: "epicurus",
    name: "Epicurus",
    born: -341,
    dates: "341–270 BCE",
    place: "Athens (born on Samos)",
    group: "ancient",
    tag: "Epicureanism",
    blurb: "Founder of a school that taught that the good life is one of tranquil pleasure, free from fear of the gods and of death.",
    facts: [
      "Born on the island of Samos to Athenian parents.",
      "Founded a school in Athens known as the Garden, which admitted women and slaves.",
      "Of his roughly three hundred books, only three letters and some maxims survive in full.",
      "His ideas were later set out in Latin verse by the Roman poet Lucretius."
    ],
    ideas: [
      { term: "Ataraxia", text: "The highest pleasure is tranquility of mind together with freedom from bodily pain, not wild indulgence." },
      { term: "Death is nothing to us", text: "Death is simply the end of sensation: where death is, we are not, so there is nothing in it to fear." },
      { term: "Hedonism", text: "Pleasure is the beginning and end of the blessed life, though prudence must decide which pleasures to pursue." },
      { term: "The swerve", text: "Atoms occasionally deviate unpredictably from their paths, breaking the chain of fate and making room for free will." }
    ],
    works: [
      { title: "Letter to Menoeceus", year: "c. 300 BCE", note: "Short letter summarizing the ethics of pleasure, the nature of the gods, and why death should not be feared." },
      { title: "Principal Doctrines", year: "c. 300 BCE", note: "Forty brief maxims summarizing the school’s teachings, preserved by Diogenes Laertius." }
    ],
    quotes: ["Death, therefore, the most awful of evils, is nothing to us, seeing that, when we are, death is not come, and, when death is come, we are not."]
  },

  {
    id: "zeno-of-citium",
    name: "Zeno of Citium",
    born: -334,
    dates: "c. 334–262 BCE",
    place: "Athens (born in Cyprus)",
    group: "ancient",
    tag: "Stoicism",
    blurb: "Founder of Stoicism, who taught in Athens that virtue, living in agreement with nature, is the only true good.",
    facts: [
      "A merchant from Cyprus who turned to philosophy after a shipwreck brought him to Athens.",
      "Taught at the Painted Porch (Stoa Poikile), which gave his school its name.",
      "Studied under the Cynic Crates of Thebes.",
      "Honored by Athens with a golden crown and a public tomb."
    ],
    ideas: [
      { term: "Living in agreement with nature", text: "The goal of life is to live consistently with nature and with reason." },
      { term: "Virtue as the sole good", text: "Only virtue is good and only vice bad; health, wealth, and reputation are merely “indifferents.”" },
      { term: "Divine reason", text: "The universe is ordered by a rational, divine principle (logos) that pervades all things." },
      { term: "Apatheia", text: "Freedom from destructive passions, which arise from false judgments about what is good or bad." }
    ],
    works: [
      { title: "Republic (Politeia)", year: "c. 300 BCE", note: "A lost utopian work describing a community of the wise without temples, law courts, or money." }
    ],
    quotes: []
  },

  {
    id: "epictetus",
    name: "Epictetus",
    born: 50,
    dates: "c. 50–135 CE",
    place: "Rome and Nicopolis",
    group: "ancient",
    tag: "Stoicism",
    blurb: "Former slave turned Stoic teacher whose lectures stress that freedom comes from focusing only on what is within our power.",
    facts: [
      "Born a slave in Phrygia and later freed.",
      "Walked with a limp, possibly from mistreatment by a master.",
      "Expelled from Rome with other philosophers by the emperor Domitian, he founded a school at Nicopolis in Greece.",
      "Wrote nothing himself; his student Arrian recorded his teachings."
    ],
    ideas: [
      { term: "Dichotomy of control", text: "Some things are up to us (judgments, desires, and actions) and some are not (body, property, and reputation); peace comes from caring only about the former." },
      { term: "Judgments, not events, disturb us", text: "We are upset not by things themselves but by our opinions about them." },
      { term: "Inner freedom", text: "Even a slave can be free if his will is not enslaved to things outside his control." }
    ],
    works: [
      { title: "Enchiridion (Handbook)", year: "c. 125 CE", note: "Short manual of practical Stoic advice, compiled by his student Arrian." },
      { title: "Discourses", year: "c. 108 CE", note: "Arrian’s record of his teacher’s informal lectures on Stoic ethics." }
    ],
    quotes: ["Men are disturbed not by things, but by the opinions about things."]
  },

  {
    id: "seneca",
    name: "Seneca",
    born: -4,
    dates: "c. 4 BCE–65 CE",
    place: "Rome (born in Córdoba)",
    group: "ancient",
    tag: "Stoicism",
    blurb: "Roman Stoic statesman, dramatist, and essayist whose letters offer practical advice on living well and facing death.",
    facts: [
      "Tutor and later chief adviser to the emperor Nero.",
      "Ordered by Nero to take his own life after an alleged conspiracy.",
      "Born in Corduba (Córdoba) in Roman Spain.",
      "One of the richest men in Rome, despite praising simplicity and poverty."
    ],
    ideas: [
      { term: "Shortness of life", text: "Life is long enough if well used, but we waste it on busyness, vice, and other people’s demands." },
      { term: "Premeditatio malorum", text: "Rehearse possible misfortunes in advance so that they lose their power to shock." },
      { term: "Anger as temporary madness", text: "Anger is a destructive passion based on a false judgment, which reason can learn to prevent." }
    ],
    works: [
      { title: "Letters to Lucilius (Moral Letters)", year: "c. 65 CE", note: "124 letters to a friend offering Stoic guidance on friendship, death, wealth, and self-improvement." },
      { title: "On the Shortness of Life", year: "c. 49 CE", note: "Essay arguing that life is long enough if we stop wasting time on trivial pursuits." },
      { title: "On Anger", year: "c. 45 CE", note: "Treatise analyzing anger and offering techniques to avoid and control it." }
    ],
    quotes: ["It is not that we have a short space of time, but that we waste much of it."]
  },

  {
    id: "marcus-aurelius",
    name: "Marcus Aurelius",
    born: 121,
    dates: "121–180 CE",
    place: "Rome",
    group: "ancient",
    tag: "Stoicism",
    blurb: "Roman emperor and Stoic whose private notebook of reflections became one of the most widely read works of practical philosophy.",
    facts: [
      "Roman emperor from 161 to 180 CE, the last of the “Five Good Emperors.”",
      "Wrote his private reflections in Greek, partly in military camps on the Danube frontier.",
      "Was introduced to the teachings of Epictetus by his tutor Rusticus.",
      "His reign was troubled by the Antonine Plague and long wars with Germanic tribes."
    ],
    ideas: [
      { term: "The inner citadel", text: "The mind can retreat into itself and remain untouched by external events if it guards its judgments." },
      { term: "View from above", text: "Imagine human affairs from a great height to see their smallness and impermanence." },
      { term: "Cosmic citizenship", text: "Every person is a fellow citizen of one rational world-city, so we are made for cooperation." },
      { term: "Impermanence", text: "Everything, including fame and life itself, passes quickly away, so we should accept change calmly." }
    ],
    works: [
      { title: "Meditations", year: "c. 170–180 CE", note: "Private notes to himself on Stoic discipline, duty, mortality, and acceptance of fate." }
    ],
    quotes: ["Waste no more time arguing what a good man should be. Be one."]
  },

  {
    id: "sextus-empiricus",
    name: "Sextus Empiricus",
    born: 160,
    dates: "c. 160–210 CE",
    place: "Uncertain (perhaps Alexandria or Rome)",
    group: "ancient",
    tag: "Skepticism",
    blurb: "Physician and philosopher whose writings are the fullest surviving account of ancient Pyrrhonian skepticism.",
    facts: [
      "A Greek physician as well as a philosopher.",
      "Almost nothing is known of his life, not even where he was born or taught.",
      "His works, printed in Latin translation in the 1560s, fueled a skeptical crisis that influenced Montaigne."
    ],
    ideas: [
      { term: "Epoché", text: "Suspension of judgment: since equally strong arguments exist on both sides, one should neither affirm nor deny." },
      { term: "Equipollence", text: "The equal force of opposing arguments, which makes it impossible to decide between them." },
      { term: "Tranquility through suspension", text: "Giving up the search for certainty brings peace of mind, like the painter who got the effect he wanted only after throwing his sponge in frustration." },
      { term: "Modes of skepticism", text: "Standard argument patterns, such as the Ten Modes of Aenesidemus, for generating doubt about any claim." }
    ],
    works: [
      { title: "Outlines of Pyrrhonism", year: "c. 200 CE", note: "Handbook presenting the skeptical way of life and the arguments for suspending judgment." },
      { title: "Against the Mathematicians (Against the Professors)", year: "c. 200 CE", note: "Attacks the claims to knowledge of grammarians, logicians, physicists, and ethicists." }
    ],
    quotes: []
  },

  {
    id: "plotinus",
    name: "Plotinus",
    born: 204,
    dates: "c. 204–270 CE",
    place: "Rome (born in Egypt)",
    group: "ancient",
    tag: "Neoplatonism",
    blurb: "Founder of Neoplatonism, who taught that all reality emanates from a single, ineffable source called the One.",
    facts: [
      "Born in Egypt and studied in Alexandria under Ammonius Saccas.",
      "Joined a Roman military expedition against Persia, hoping to learn Eastern wisdom.",
      "Taught in Rome; his student Porphyry arranged his writings into six groups of nine.",
      "Porphyry reports that he seemed ashamed of being in a body."
    ],
    ideas: [
      { term: "The One", text: "The absolutely simple, ineffable first principle beyond being and thought, from which everything else derives." },
      { term: "Emanation", text: "Reality flows outward from its source in descending levels: Intellect (Nous), then Soul, and finally matter." },
      { term: "Mystical union", text: "The soul can turn inward and ascend to unite with the ultimate source in ecstatic experience." }
    ],
    works: [
      { title: "Enneads", year: "c. 270 CE", note: "Fifty-four treatises arranged by Porphyry into six sets of nine, covering the One, Intellect, and Soul." }
    ],
    quotes: ["A flight of the alone to the Alone."]
  },

  /* ===================== Classical Asian traditions ===================== */

  {
    id: "confucius",
    name: "Confucius",
    born: -551,
    dates: "551–479 BCE",
    place: "State of Lu (China)",
    group: "asian",
    tag: "Confucianism",
    blurb: "Chinese teacher whose teachings on virtue, ritual, and good government became the backbone of East Asian ethics.",
    facts: [
      "Born in the state of Lu, in present-day Shandong province.",
      "Served briefly in government, then traveled among states seeking a ruler who would adopt his ideas.",
      "His sayings were compiled by his disciples after his death.",
      "Traditionally credited with editing classics such as the Book of Songs and the Spring and Autumn Annals."
    ],
    ideas: [
      { term: "Ren", text: "Humaneness or benevolence: the supreme virtue of caring for others, rooted in family relationships." },
      { term: "Li", text: "Ritual propriety: the customs, ceremonies, and manners that shape character and hold society together." },
      { term: "Junzi", text: "The exemplary or noble person, defined by moral cultivation rather than by birth." },
      { term: "Filial piety (xiao)", text: "Devoted respect and care for parents and ancestors, seen as the root of all virtue." },
      { term: "Rectification of names", text: "Social order requires words to match reality: a ruler must truly act as a ruler, and a father as a father." }
    ],
    works: [
      { title: "Analects", year: "c. 5th–3rd c. BCE", note: "Collection of his sayings and conversations with disciples, compiled after his death." }
    ],
    quotes: [
      "Do not impose on others what you yourself do not desire.",
      "To say you know when you know, and to say you do not when you do not, that is knowledge."
    ]
  },

  {
    id: "laozi",
    name: "Laozi",
    born: -571,
    dates: "c. 6th c. BCE (traditional)",
    place: "Zhou court (China)",
    group: "asian",
    tag: "Daoism",
    blurb: "Semi-legendary sage traditionally regarded as the founder of Daoism and the author of its central text.",
    facts: [
      "Traditionally said to have been keeper of the archives at the Zhou court.",
      "Legend says he wrote down his teachings at a border pass before riding west on a water buffalo, never to be seen again.",
      "Ancient stories claim Confucius visited him for advice.",
      "Many modern scholars doubt that he existed as a single historical person."
    ],
    ideas: [
      { term: "Dao", text: "The nameless, ineffable Way: the source and pattern of all things, which cannot be captured in words." },
      { term: "Wu wei", text: "Effortless, non-forcing action that goes with the natural flow of things rather than against it." },
      { term: "Softness overcomes hardness", text: "Water, though yielding, wears away rock; humility and gentleness are stronger than force." },
      { term: "The uncarved block (pu)", text: "Give up ambition, cleverness, and desire to return to an original, natural simplicity." }
    ],
    works: [
      { title: "Daodejing (Tao Te Ching)", year: "c. 4th c. BCE", note: "Short poetic classic in eighty-one chapters on the Way, virtue, and wise, minimal government." }
    ],
    quotes: [
      "The way that can be spoken of is not the constant way.",
      "A journey of a thousand miles starts from beneath one’s feet."
    ]
  },

  {
    id: "mencius",
    name: "Mencius",
    born: -372,
    dates: "c. 372–289 BCE",
    place: "Zou and Qi (China)",
    group: "asian",
    tag: "Confucianism",
    blurb: "The “second sage” of Confucianism, who argued that human nature is innately good.",
    facts: [
      "Said to have studied with disciples of Zisi, the grandson of Confucius.",
      "His mother famously moved house three times to find a good environment for his education.",
      "Traveled among warring states urging rulers to govern with benevolence.",
      "Debated the philosopher Gaozi, who held that human nature is neither good nor bad."
    ],
    ideas: [
      { term: "Human nature is good", text: "Everyone is born with natural tendencies toward goodness that, if nurtured, grow into virtue." },
      { term: "Four sprouts", text: "Compassion, shame, deference, and a sense of right and wrong are the beginnings of benevolence, righteousness, propriety, and wisdom." },
      { term: "Child at the well", text: "Anyone who suddenly saw a child about to fall into a well would feel alarm and compassion, showing an innate seed of benevolence." },
      { term: "Right of rebellion", text: "A ruler who oppresses the people loses the Mandate of Heaven and may rightly be overthrown." }
    ],
    works: [
      { title: "Mengzi", year: "c. 3rd c. BCE", note: "Record of conversations with rulers and disciples, later made one of the Four Books of the official canon." }
    ],
    quotes: ["The people are the most important element in a nation; the spirits of the land and grain are the next; the sovereign is the least."]
  },

  {
    id: "zhuangzi",
    name: "Zhuangzi",
    born: -369,
    dates: "c. 369–286 BCE",
    place: "Song (China)",
    group: "asian",
    tag: "Daoism",
    blurb: "Daoist thinker whose witty, paradoxical stories celebrate spontaneity and question every fixed distinction.",
    facts: [
      "Declined an offer to become a chief minister, saying he would rather drag his tail in the mud like a live turtle.",
      "Drummed on a basin and sang after his wife died, reflecting on the natural cycle of life and death.",
      "Often debated with his friend, the logician Hui Shi.",
      "Said to have served as a minor official in charge of a lacquer garden."
    ],
    ideas: [
      { term: "Butterfly dream", text: "Dreamed he was a butterfly and on waking wondered whether he was a man who had dreamed of being a butterfly or a butterfly now dreaming of being a man." },
      { term: "Relativity of perspectives", text: "Judgments of right and wrong, big and small, depend on one’s standpoint, so no single viewpoint is final." },
      { term: "Cook Ding", text: "A butcher whose blade never dulls because he follows the natural joints of the ox, illustrating effortless skill in harmony with the Way." },
      { term: "Usefulness of the useless", text: "A gnarled tree survives because carpenters find it worthless; what seems useless may be what preserves life." }
    ],
    works: [
      { title: "Zhuangzi (Inner Chapters)", year: "c. 3rd c. BCE", note: "Collection of stories, dialogues, and parables; the seven inner chapters are thought to be the author’s own." }
    ],
    quotes: []
  },

  {
    id: "xunzi",
    name: "Xunzi",
    born: -310,
    dates: "c. 310–235 BCE",
    place: "Qi and Chu (China)",
    group: "asian",
    tag: "Confucianism",
    blurb: "Confucian realist who argued that human nature is bad and must be reformed by ritual, education, and teachers.",
    facts: [
      "Three times served as head of the Jixia Academy in the state of Qi.",
      "Teacher of Han Feizi and Li Si, later leading figures of Legalism.",
      "Disagreed sharply with Mencius about whether human nature is good.",
      "Spent his last years as a magistrate at Lanling in the state of Chu."
    ],
    ideas: [
      { term: "Human nature is bad", text: "People are born selfish and envious; goodness is the product of deliberate effort and training." },
      { term: "Ritual as reform", text: "Ritual and music shape and channel desires, as a press straightens warped wood." },
      { term: "Naturalistic Heaven", text: "Heaven is simply the regular course of nature, which does not answer prayers or reward virtue." }
    ],
    works: [
      { title: "Xunzi", year: "c. 3rd c. BCE", note: "Collection of essays, including “Human Nature Is Bad,” on ethics, ritual, language, and government." }
    ],
    quotes: ["Human nature is bad; goodness is the result of conscious activity."]
  },

  {
    id: "mozi",
    name: "Mozi",
    born: -470,
    dates: "c. 470–391 BCE",
    place: "China (probably Lu)",
    group: "asian",
    tag: "Mohism",
    blurb: "Founder of Mohism, an early rival to Confucianism that preached impartial care for all and opposed aggressive war.",
    facts: [
      "Probably a craftsman or engineer from a humble background.",
      "Led a disciplined organization of followers who helped defend small cities against siege.",
      "Criticized Confucian elaborate funerals and court music as wasteful.",
      "Said to have walked ten days and nights to talk a king out of attacking the state of Song."
    ],
    ideas: [
      { term: "Impartial care (jian ai)", text: "We should care for everyone equally, not favoring our own family or state; partiality causes conflict." },
      { term: "Condemnation of offensive war", text: "Wars of aggression are theft and murder on a grand scale." },
      { term: "Early consequentialism", text: "Practices should be judged by whether they benefit the people: enriching the poor, increasing population, and bringing order." },
      { term: "Three standards", text: "Test any doctrine by its basis in the ancient sage-kings, the evidence of ordinary people’s senses, and its practical benefit." }
    ],
    works: [
      { title: "Mozi", year: "c. 4th–3rd c. BCE", note: "Compilation of the school’s writings on impartial care, frugality, defense, logic, and the rejection of fatalism." }
    ],
    quotes: []
  },

  {
    id: "han-feizi",
    name: "Han Feizi",
    born: -280,
    dates: "c. 280–233 BCE",
    place: "China (died in Qin)",
    group: "asian",
    tag: "Legalism",
    blurb: "Synthesizer of Legalism, whose ruthless theory of state power guided the unification of China under the Qin.",
    facts: [
      "A prince of a ruling house who studied under Xunzi.",
      "Had a stammer, so he set out his arguments in writing rather than speech.",
      "Died by poison in a Qin prison, a plot by his former fellow student Li Si.",
      "His writings impressed the king who became the First Emperor of China."
    ],
    ideas: [
      { term: "Fa (law)", text: "Rule through clear, publicly known, and strictly enforced laws rather than through virtue or tradition." },
      { term: "Two handles", text: "The ruler controls ministers through reward and punishment, which must stay in his own hands alone." },
      { term: "Shu (technique)", text: "Methods by which the ruler secretly checks officials, matching their words against their results." },
      { term: "Shi (positional power)", text: "Authority comes from the ruler’s position, not his personal virtue, so even a mediocre ruler can govern well." }
    ],
    works: [
      { title: "Han Feizi", year: "c. 3rd c. BCE", note: "Collection of essays on law, statecraft, and the control of ministers, the classic text of Legalism." }
    ],
    quotes: []
  },

  {
    id: "buddha",
    name: "Siddhartha Gautama (the Buddha)",
    born: -480,
    dates: "c. 5th c. BCE",
    place: "Northern India",
    group: "asian",
    tag: "Buddhism",
    blurb: "Indian sage whose awakening and teaching of the Middle Way founded one of the world’s great religious and philosophical traditions.",
    facts: [
      "Born a prince of the Shakya clan at Lumbini, in present-day Nepal.",
      "Left palace life after seeing an old man, a sick man, a corpse, and a wandering ascetic.",
      "Attained awakening while meditating under a fig tree at Bodh Gaya.",
      "Gave his first sermon in a deer park at Sarnath."
    ],
    ideas: [
      { term: "Four Noble Truths", text: "Life involves suffering (dukkha); suffering arises from craving; suffering can cease; and an eightfold path leads to its cessation." },
      { term: "Noble Eightfold Path", text: "Right view, intention, speech, action, livelihood, effort, mindfulness, and concentration." },
      { term: "Anatta (no-self)", text: "There is no permanent, unchanging self; a person is a changing bundle of physical and mental processes." },
      { term: "Middle Way", text: "The path to liberation lies between sensual indulgence and extreme self-denial." },
      { term: "Dependent origination", text: "Everything arises in dependence on conditions; nothing exists independently or permanently." }
    ],
    works: [],
    quotes: ["Hatred does not cease by hatred at any time: hatred ceases by love; this is an old rule."]
  },

  {
    id: "nagarjuna",
    name: "Nagarjuna",
    born: 150,
    dates: "c. 150–250 CE",
    place: "South India",
    group: "asian",
    tag: "Madhyamaka",
    blurb: "Indian Buddhist philosopher who founded the Madhyamaka (Middle Way) school and argued that all things are empty of inherent existence.",
    facts: [
      "Often regarded as the most important Buddhist philosopher after the founder of the religion.",
      "Revered in Tibetan and East Asian traditions as a “second Buddha.”",
      "Traditionally said to have written a letter of advice to a king of the Satavahana dynasty.",
      "Little is reliably known of his life, which later legends filled with miracles."
    ],
    ideas: [
      { term: "Śūnyatā (emptiness)", text: "All phenomena lack svabhāva, any independent, intrinsic nature, because they arise dependently." },
      { term: "Two truths", text: "Conventional truth, valid for everyday practice, is distinguished from ultimate truth, which is the absence of intrinsic nature." },
      { term: "Tetralemma (catuṣkoṭi)", text: "Rejected all four options about a thing: that it exists, does not exist, both, or neither." },
      { term: "Emptiness of emptiness", text: "Even the absence of intrinsic nature is not an ultimate thing or view to grasp; it too is empty." }
    ],
    works: [
      { title: "Mūlamadhyamakakārikā (Fundamental Verses on the Middle Way)", year: "c. 200 CE", note: "Verse treatise arguing that all phenomena, including causation and motion, are empty of inherent existence." }
    ],
    quotes: []
  },

  {
    id: "shankara",
    name: "Adi Shankara",
    born: 700,
    dates: "c. 8th c. CE",
    place: "India (born in Kerala)",
    group: "asian",
    tag: "Advaita Vedanta",
    blurb: "Indian philosopher who systematized Advaita Vedanta, teaching that the individual self is identical with the one ultimate reality, Brahman.",
    facts: [
      "Traditionally born in Kalady in present-day Kerala.",
      "Tradition says he renounced the world as a boy and died young, at about thirty-two.",
      "Credited with founding monasteries (mathas) at the four corners of India.",
      "Traveled across India debating rival schools of thought."
    ],
    ideas: [
      { term: "Atman is Brahman", text: "The innermost self is identical with ultimate reality; the sense of being a separate self is ignorance." },
      { term: "Maya", text: "The world of multiplicity is an appearance projected by ignorance, like a rope mistaken for a snake." },
      { term: "Non-dualism", text: "Reality is “one without a second”: ultimately there is no distinction between knower, known, and the absolute." },
      { term: "Liberation through knowledge", text: "Moksha comes from direct knowledge of the self’s identity with the absolute, not from ritual action." }
    ],
    works: [
      { title: "Brahma Sutra Bhashya", year: "c. 8th c. CE", note: "Commentary on the Brahma Sutras that became the foundational text of non-dualist Vedanta." }
    ],
    quotes: []
  },

  {
    id: "zhu-xi",
    name: "Zhu Xi",
    born: 1130,
    dates: "1130–1200",
    place: "Song dynasty China",
    group: "asian",
    tag: "Neo-Confucianism",
    blurb: "Song dynasty scholar who synthesized Neo-Confucianism; his commentaries became the basis of China’s civil service examinations for centuries.",
    facts: [
      "Grouped the Analects, the Mencius, the Great Learning, and the Doctrine of the Mean as the Four Books.",
      "His commentaries were official orthodoxy for the imperial examinations from 1313 until 1905.",
      "Revived the White Deer Grotto Academy as a center of learning.",
      "His teachings were banned as “false learning” for a time near the end of his life."
    ],
    ideas: [
      { term: "Li and qi", text: "Everything combines principle (the pattern or reason of a thing) with vital energy-matter (the stuff that gives it form)." },
      { term: "Investigation of things (gewu)", text: "Self-cultivation proceeds by studying the principle in things and in books until one achieves broad understanding." },
      { term: "Supreme Ultimate (Taiji)", text: "The sum of all principles, fully present in each thing, like the moon reflected in many streams." }
    ],
    works: [
      { title: "Collected Commentaries on the Four Books", year: "1190", note: "Commentaries on four classic texts that became the official curriculum for the imperial examinations." },
      { title: "Reflections on Things at Hand (Jinsi lu)", year: "1175", note: "Anthology of Northern Song thinkers, compiled with Lü Zuqian, as an introduction to the learning of principle." }
    ],
    quotes: []
  },

  {
    id: "wang-yangming",
    name: "Wang Yangming",
    born: 1472,
    dates: "1472–1529",
    place: "Ming dynasty China",
    group: "asian",
    tag: "Neo-Confucianism",
    blurb: "Ming dynasty scholar-general who taught that moral knowledge lies within the mind and is inseparable from action.",
    facts: [
      "As a young man, spent days trying to “investigate” bamboo until he fell ill, prompting doubts about Zhu Xi’s method.",
      "Exiled to a remote post in Guizhou, where he had a great enlightenment in 1508.",
      "A successful general who crushed a princely rebellion in 1519."
    ],
    ideas: [
      { term: "Unity of knowledge and action", text: "True knowing already includes acting: to know filial piety but fail to practice it is not yet to know it." },
      { term: "Mind is principle", text: "Moral principles are not found in external things but in one’s own heart-mind." },
      { term: "Innate knowledge (liangzhi)", text: "Everyone has an inborn moral awareness of good and evil, which must be extended in action." }
    ],
    works: [
      { title: "Instructions for Practical Living (Chuanxi lu)", year: "1518", note: "Record of conversations and letters, compiled by disciples, setting out the school of mind." }
    ],
    quotes: ["Knowledge is the beginning of action, and action is the completion of knowledge."]
  },

  {
    id: "dogen",
    name: "Dōgen",
    born: 1200,
    dates: "1200–1253",
    place: "Japan",
    group: "asian",
    tag: "Zen",
    blurb: "Japanese Zen master who founded the Sōtō school and wrote profound essays on practice, time, and being.",
    facts: [
      "Orphaned young, he became a monk on Mount Hiei as a teenager.",
      "Traveled to China in 1223 to study Chan Buddhism.",
      "Brought the Caodong lineage back to Japan, where it became known as Sōtō.",
      "Founded Eiheiji temple in the mountains of Echizen province."
    ],
    ideas: [
      { term: "Shikantaza", text: "“Just sitting”: seated meditation without goals or objects, practiced wholeheartedly." },
      { term: "Oneness of practice and enlightenment", text: "Meditation is not a means to awakening but its very expression; practice and realization are one." },
      { term: "Being-time (uji)", text: "Time is not separate from existence: every being is time, and every moment is complete in itself." }
    ],
    works: [
      { title: "Shōbōgenzō (Treasury of the True Dharma Eye)", year: "1231–1253", note: "Collection of essays in Japanese on meditation, time, nature, and the practice of Zen." }
    ],
    quotes: ["To study the Buddha way is to study the self. To study the self is to forget the self."]
  },

  /* ===================== Medieval ===================== */

  {
    id: "augustine",
    name: "Augustine",
    born: 354,
    dates: "354–430",
    place: "Hippo (North Africa)",
    group: "medieval",
    tag: "Christian Platonism",
    blurb: "North African bishop whose writings on grace, sin, time, and the two cities shaped Western Christianity and philosophy.",
    facts: [
      "Born in Thagaste in North Africa to a Christian mother, Monica.",
      "Followed the Manichaeans for about nine years before his conversion.",
      "Converted after hearing a child’s voice say “take up and read” in a garden in Milan.",
      "Bishop of Hippo for over three decades; died as the Vandals besieged the city."
    ],
    ideas: [
      { term: "Original sin", text: "Since Adam’s fall, all humans inherit a corrupted will and cannot be saved without divine grace." },
      { term: "Two cities", text: "History is the story of two communities: an earthly one defined by love of self, and a heavenly one defined by love of God." },
      { term: "Evil as privation", text: "Evil is not a substance but the absence or corruption of good; moral evil comes from the misuse of free will." },
      { term: "Si fallor, sum", text: "“If I am mistaken, I exist”: a reply to skeptics that anticipates Descartes’ cogito." },
      { term: "Time in the mind", text: "Knew what time was until asked; argued that past and future exist only in the mind as memory and expectation." }
    ],
    works: [
      { title: "Confessions", year: "c. 397–400", note: "Autobiography addressed to God, recounting a restless youth and conversion, with reflections on memory and time." },
      { title: "The City of God", year: "413–426", note: "Defense of Christianity after the sack of Rome, contrasting the earthly city and the heavenly city." }
    ],
    quotes: [
      "Our heart is restless until it rests in you.",
      "Grant me chastity and continence, but not yet."
    ]
  },

  {
    id: "boethius",
    name: "Boethius",
    born: 477,
    dates: "c. 477–524",
    place: "Rome and Ravenna",
    group: "medieval",
    tag: "Neoplatonism",
    blurb: "Roman statesman who, awaiting execution, wrote a dialogue with Lady Philosophy that became one of the most read books of the Middle Ages.",
    facts: [
      "A senior official under the Ostrogothic king Theodoric.",
      "Imprisoned and executed on charges of treason.",
      "Planned to translate all of Plato and Aristotle into Latin; his logic translations shaped medieval education.",
      "Often called “the last of the Romans and the first of the scholastics.”"
    ],
    ideas: [
      { term: "Wheel of Fortune", text: "Fortune turns like a wheel, raising and lowering people at random, so true happiness cannot depend on her gifts." },
      { term: "Eternity and foreknowledge", text: "God sees all times in one eternal present, so divine knowledge of our choices does not make them necessary." },
      { term: "True happiness", text: "Happiness is the perfect good, found only in the highest good, God, not in wealth, power, or fame." }
    ],
    works: [
      { title: "The Consolation of Philosophy", year: "c. 524", note: "Prison dialogue in prose and verse in which Lady Philosophy consoles the author about fortune, evil, and free will." }
    ],
    quotes: []
  },

  {
    id: "anselm",
    name: "Anselm",
    born: 1033,
    dates: "1033–1109",
    place: "Bec (Normandy) and Canterbury",
    group: "medieval",
    tag: "Scholasticism",
    blurb: "Benedictine monk and archbishop, regarded as a founder of scholasticism and best known for the ontological argument for God.",
    facts: [
      "Born in Aosta in northern Italy.",
      "Abbot of Bec in Normandy before becoming Archbishop of Canterbury.",
      "Twice exiled from England after clashing with kings over the rights of the church."
    ],
    ideas: [
      { term: "Ontological argument", text: "God is that than which nothing greater can be conceived; such a being must exist in reality, not just in the mind, or a greater could be conceived." },
      { term: "Faith seeking understanding", text: "Believers should use reason to understand more deeply what they already accept by faith." },
      { term: "Satisfaction theory of atonement", text: "Human sin dishonors God infinitely, so only one who is both God and man could make satisfaction for it." }
    ],
    works: [
      { title: "Proslogion", year: "1078", note: "Short meditation addressed to God that presents the ontological argument for his existence." },
      { title: "Cur Deus Homo (Why God Became Man)", year: "1098", note: "Dialogue explaining why God became man to make satisfaction for human sin." }
    ],
    quotes: ["I do not seek to understand in order that I may believe, but I believe in order that I may understand."]
  },

  {
    id: "avicenna",
    name: "Avicenna (Ibn Sina)",
    born: 980,
    dates: "980–1037",
    place: "Persia (born near Bukhara)",
    group: "medieval",
    tag: "Islamic philosophy",
    blurb: "Persian polymath whose philosophy and medicine dominated both the Islamic world and medieval Europe.",
    facts: [
      "Born near Bukhara in Central Asia.",
      "Said to have memorized the Qur’an by age ten and to have practiced medicine as a teenager.",
      "Read Aristotle’s Metaphysics forty times without understanding it, until he found a commentary by al-Farabi.",
      "Served as physician and vizier to several Persian rulers."
    ],
    ideas: [
      { term: "Floating man", text: "A person created in midair, with no sensations at all, would still be aware of his own existence, so the self is distinct from the body." },
      { term: "Essence and existence", text: "What a thing is (its essence) is distinct from the fact that it is; existence is added to essence." },
      { term: "Necessary existent", text: "Contingent things need a cause, and the chain must end in a being whose existence is necessary in itself: God." }
    ],
    works: [
      { title: "The Canon of Medicine", year: "1025", note: "Encyclopedia of medicine used as a standard textbook in Europe and the Islamic world for centuries." },
      { title: "The Book of Healing (Kitab al-Shifa)", year: "c. 1027", note: "Vast philosophical encyclopedia covering logic, natural science, mathematics, and metaphysics." }
    ],
    quotes: []
  },

  {
    id: "al-ghazali",
    name: "Al-Ghazali",
    born: 1058,
    dates: "1058–1111",
    place: "Baghdad and Tus (Persia)",
    group: "medieval",
    tag: "Islamic theology",
    blurb: "Persian theologian and mystic whose critique of the philosophers and turn to Sufism reshaped Islamic thought.",
    facts: [
      "Taught at the prestigious Nizamiyya college in Baghdad.",
      "In 1095 suffered a spiritual crisis, lost the ability to speak, and left his post to live as a Sufi.",
      "Honored with the title “Proof of Islam” (Hujjat al-Islam)."
    ],
    ideas: [
      { term: "Occasionalism", text: "Fire does not burn cotton by its own power; God directly creates each effect on the occasion of its apparent cause." },
      { term: "Critique of the philosophers", text: "Charged Avicenna and his followers with unbelief for teaching that the world is eternal and denying bodily resurrection." },
      { term: "Mystical knowledge", text: "Certainty comes not from reason alone but from direct experience of God through the Sufi path." },
      { term: "Search for certainty", text: "Doubted both the senses and reason until certainty returned as a light cast by God into the heart." }
    ],
    works: [
      { title: "The Incoherence of the Philosophers", year: "1095", note: "Attack on the Aristotelian philosophers on twenty points, three of which it judged to be unbelief." },
      { title: "Deliverance from Error", year: "c. 1100", note: "Spiritual autobiography describing a skeptical crisis and the search for certain knowledge." },
      { title: "The Revival of the Religious Sciences", year: "c. 1097", note: "Massive guide to Islamic belief, worship, and inner spiritual life." }
    ],
    quotes: []
  },

  {
    id: "averroes",
    name: "Averroes (Ibn Rushd)",
    born: 1126,
    dates: "1126–1198",
    place: "Córdoba (al-Andalus)",
    group: "medieval",
    tag: "Islamic philosophy",
    blurb: "Andalusian judge and philosopher whose commentaries on Aristotle revived Aristotelian thought in Latin Europe.",
    facts: [
      "Served as chief judge (qadi) of Córdoba and as physician to the Almohad caliph.",
      "Known in Latin Europe simply as “the Commentator.”",
      "Fell into disgrace late in life and saw his books burned, though he was later restored to favor."
    ],
    ideas: [
      { term: "Harmony of religion and philosophy", text: "Truth does not contradict truth: demonstrative philosophy and correctly interpreted scripture cannot conflict." },
      { term: "Unity of the intellect", text: "There is a single material intellect shared by all humans, a view fiercely debated by Latin scholastics." },
      { term: "Defense of philosophy", text: "Against al-Ghazali, argued that philosophical reasoning is permitted, and even obligatory, for those able to pursue it." }
    ],
    works: [
      { title: "The Incoherence of the Incoherence (Tahafut al-Tahafut)", year: "c. 1180", note: "Point-by-point reply to al-Ghazali’s attack on the philosophers." },
      { title: "The Decisive Treatise", year: "c. 1178", note: "Legal argument that Islamic law commands the study of philosophy for those capable of it." }
    ],
    quotes: []
  },

  {
    id: "maimonides",
    name: "Maimonides",
    born: 1138,
    dates: "1138–1204",
    place: "Córdoba, Fez, and Cairo",
    group: "medieval",
    tag: "Jewish philosophy",
    blurb: "The leading medieval Jewish philosopher and legal scholar, who sought to reconcile the Torah with Aristotelian philosophy.",
    facts: [
      "Born in Córdoba; his family fled persecution under the Almohads.",
      "Settled in Egypt, where he became a court physician to the vizier of Saladin.",
      "Wrote his greatest philosophical work in Arabic and his great legal code in Hebrew."
    ],
    ideas: [
      { term: "Negative theology", text: "We can say only what God is not; positive attributes cannot truly describe the divine essence." },
      { term: "Thirteen principles of faith", text: "A list of core Jewish beliefs, including God’s unity and incorporeality, prophecy, and the resurrection of the dead." },
      { term: "Allegorical interpretation", text: "Scriptural passages that conflict with demonstrated truth, such as those giving God a body, must be read figuratively." },
      { term: "Ladder of charity", text: "Ranked forms of giving, the highest being to help someone become self-supporting." }
    ],
    works: [
      { title: "The Guide for the Perplexed", year: "c. 1190", note: "Philosophical work explaining biblical language and reconciling scripture with Aristotle." },
      { title: "Mishneh Torah", year: "1180", note: "Comprehensive fourteen-volume code of Jewish law." }
    ],
    quotes: []
  },

  {
    id: "aquinas",
    name: "Thomas Aquinas",
    born: 1225,
    dates: "1225–1274",
    place: "Paris and Naples",
    group: "medieval",
    tag: "Scholasticism",
    blurb: "Dominican friar who synthesized Aristotle with Christian theology; the most influential of the scholastic philosophers.",
    facts: [
      "His family held him captive for about a year to stop him joining the Dominicans.",
      "Classmates nicknamed him “the Dumb Ox” for his size and quietness.",
      "Studied under Albert the Great.",
      "Stopped writing after a mystical experience, saying that all he had written seemed like straw."
    ],
    ideas: [
      { term: "Five Ways", text: "Five arguments for God’s existence: from motion, causation, contingency, degrees of perfection, and order in nature." },
      { term: "Natural law", text: "A moral law grounded in human nature and knowable by reason, directing us to preserve life, seek truth, and live in society." },
      { term: "Faith and reason", text: "Reason and revelation cannot truly conflict; philosophy can prove some truths of faith, while others exceed reason." },
      { term: "Just war theory", text: "A war is just only if waged by legitimate authority, for a just cause, and with right intention." },
      { term: "Doctrine of double effect", text: "An act with both a good and a bad effect may be permissible if the bad effect is foreseen but not intended." }
    ],
    works: [
      { title: "Summa Theologica", year: "1265–1274", note: "Unfinished masterpiece organized as questions, objections, and replies covering God, ethics, and Christ." },
      { title: "Summa contra Gentiles", year: "c. 1259–1265", note: "Defense of the Christian faith addressed to non-believers, relying on natural reason." }
    ],
    quotes: []
  },

  {
    id: "duns-scotus",
    name: "John Duns Scotus",
    born: 1266,
    dates: "c. 1266–1308",
    place: "Oxford, Paris, and Cologne",
    group: "medieval",
    tag: "Scholasticism",
    blurb: "Franciscan theologian known as the “Subtle Doctor” for his intricate arguments on being, individuality, and the will.",
    facts: [
      "A Scottish Franciscan who taught at Oxford and Paris and died in Cologne.",
      "Known as the “Subtle Doctor.”",
      "Later humanists mocked his followers so much that English gained a word for a slow learner from his name.",
      "Beatified by the Catholic Church in 1993."
    ],
    ideas: [
      { term: "Haecceity", text: "“Thisness”: the individuating principle that makes a thing this particular thing, distinct from others of its kind." },
      { term: "Univocity of being", text: "“Being” has the same meaning when said of God and of creatures, against the view that it applies only by analogy." },
      { term: "Primacy of the will", text: "The will is free and not determined by the intellect; love is higher than knowledge." },
      { term: "Formal distinction", text: "A distinction between aspects of one thing that are really inseparable yet not merely conceptual." }
    ],
    works: [
      { title: "Ordinatio", year: "c. 1300–1308", note: "His major commentary on Peter Lombard’s Sentences, revised for publication." }
    ],
    quotes: []
  },

  {
    id: "ockham",
    name: "William of Ockham",
    born: 1287,
    dates: "c. 1287–1347",
    place: "Oxford and Munich",
    group: "medieval",
    tag: "Scholasticism",
    blurb: "English Franciscan logician known for nominalism and for the principle of parsimony that bears his name.",
    facts: [
      "Summoned to the papal court at Avignon to answer charges of heresy.",
      "Fled Avignon in 1328 and sought the protection of Emperor Louis IV in Munich.",
      "Excommunicated after siding against Pope John XXII in a dispute over Franciscan poverty."
    ],
    ideas: [
      { term: "The razor (principle of parsimony)", text: "Do not multiply entities beyond necessity; prefer the explanation that assumes the least." },
      { term: "Nominalism", text: "Only individual things exist; universals like “redness” are just names or concepts that apply to many things." },
      { term: "Divine omnipotence", text: "God can do anything that does not involve a contradiction, so the order of the world depends entirely on God’s will." },
      { term: "Limits of papal power", text: "The pope has no authority over secular rulers in temporal matters." }
    ],
    works: [
      { title: "Summa Logicae", year: "c. 1323", note: "Comprehensive logic textbook developing a theory of terms and their reference (supposition)." }
    ],
    quotes: ["Plurality should never be posited without necessity."]
  },

  /* ===================== Renaissance and early modern ===================== */

  {
    id: "machiavelli",
    name: "Niccolò Machiavelli",
    born: 1469,
    dates: "1469–1527",
    place: "Florence",
    group: "early-modern",
    tag: "Political realism",
    blurb: "Florentine diplomat whose frank account of how power is won and kept helped found modern political science.",
    facts: [
      "Served as a diplomat and secretary of the Florentine Republic.",
      "Imprisoned and tortured after the Medici returned to power in Florence.",
      "Wrote his most famous work while in exile on his farm and dedicated it to Lorenzo de’ Medici."
    ],
    ideas: [
      { term: "Virtù and fortuna", text: "A ruler’s energy, skill, and boldness must master fortune, which controls about half of human affairs." },
      { term: "Better to be feared than loved", text: "If a prince cannot be both, it is safer to inspire fear than affection, though he must avoid being hated." },
      { term: "Political realism", text: "Politics should be studied as it actually is, not as it ought to be; a ruler must learn how not to be good." },
      { term: "Republicanism", text: "Praised the mixed government of the Roman republic and the conflict between nobles and people as a guardian of liberty." }
    ],
    works: [
      { title: "The Prince", year: "1513", note: "Handbook for rulers on acquiring and keeping power, often by ruthless means." },
      { title: "Discourses on Livy", year: "c. 1517", note: "Commentary on Roman history that defends republics and civic virtue." }
    ],
    quotes: ["It is much safer to be feared than loved, if one must be lacking in one of the two."]
  },

  {
    id: "montaigne",
    name: "Michel de Montaigne",
    born: 1533,
    dates: "1533–1592",
    place: "Bordeaux (France)",
    group: "early-modern",
    tag: "Renaissance humanism",
    blurb: "French nobleman who invented the essay as a form of candid self-exploration and skeptical reflection.",
    facts: [
      "Raised speaking Latin as his first language, by his father’s design.",
      "Served two terms as mayor of Bordeaux.",
      "Wrote in a tower library on his estate, with mottoes painted on the ceiling beams.",
      "Mourned his close friend Étienne de La Boétie for the rest of his life."
    ],
    ideas: [
      { term: "Que sais-je?", text: "“What do I know?”: his skeptical motto, expressing doubt about human claims to certain knowledge." },
      { term: "The self as subject", text: "Took himself as his own subject, believing that each person bears the entire form of the human condition." },
      { term: "Cultural relativism", text: "We call “barbarous” whatever is not our own custom; he compared Brazilian cannibals favorably with European cruelty." }
    ],
    works: [
      { title: "Essays", year: "1580–1588", note: "Collection of personal reflections on topics from friendship and cannibals to experience and death." }
    ],
    quotes: [
      "To philosophize is to learn to die.",
      "When I play with my cat, who knows if I am not a pastime to her more than she is to me?"
    ]
  },

  {
    id: "bacon",
    name: "Francis Bacon",
    born: 1561,
    dates: "1561–1626",
    place: "London",
    group: "early-modern",
    tag: "Empiricism",
    blurb: "English statesman and philosopher who championed inductive, experimental method as the path to scientific knowledge.",
    facts: [
      "Rose to become Lord Chancellor of England under James I.",
      "Impeached and fined in 1621 for accepting bribes.",
      "Reportedly caught a fatal chill while stuffing a chicken with snow to test whether cold preserves meat."
    ],
    ideas: [
      { term: "Inductive method", text: "Science should proceed by careful observation and gradual generalization from particular cases, not from abstract first principles." },
      { term: "Idols of the mind", text: "Four kinds of bias, of the tribe, the cave, the marketplace, and the theater, that distort human understanding." },
      { term: "Science for human benefit", text: "The aim of inquiry is practical: to understand nature in order to command it for the relief of human life." }
    ],
    works: [
      { title: "Novum Organum", year: "1620", note: "Proposes a new inductive method for science to replace Aristotle’s logic." },
      { title: "The New Atlantis", year: "1627", note: "Unfinished utopia about an island society run by a scientific research institution." },
      { title: "Essays", year: "1597", note: "Short, aphoristic essays on topics such as truth, studies, ambition, and friendship." }
    ],
    quotes: ["Knowledge itself is power."]
  },

  {
    id: "hobbes",
    name: "Thomas Hobbes",
    born: 1588,
    dates: "1588–1679",
    place: "England and Paris",
    group: "early-modern",
    tag: "Social contract",
    blurb: "English materialist whose account of the state of nature and absolute sovereignty founded modern social contract theory.",
    facts: [
      "Born prematurely as the Spanish Armada approached; he said that fear and he were born twins.",
      "Fled to Paris during the English Civil War, where he tutored the future Charles II in mathematics.",
      "Fell in love with geometry on reading Euclid at about age forty.",
      "Translated Thucydides as a young man and Homer in his eighties."
    ],
    ideas: [
      { term: "State of nature", text: "Without government there would be a war of every man against every man, with no industry, arts, or society." },
      { term: "Social contract", text: "People rationally agree to give up their natural liberty to a sovereign in exchange for security and peace." },
      { term: "Absolute sovereignty", text: "The sovereign’s power must be undivided and unchallengeable, since divided power leads back to civil war." },
      { term: "Materialism", text: "Everything that exists is matter in motion, including thought itself." }
    ],
    works: [
      { title: "Leviathan", year: "1651", note: "Argues that only an all-powerful sovereign can rescue people from the war of all against all." },
      { title: "De Cive (On the Citizen)", year: "1642", note: "Earlier Latin treatise on the citizen, government, and religion." }
    ],
    quotes: ["And the life of man, solitary, poor, nasty, brutish, and short."]
  },

  {
    id: "descartes",
    name: "René Descartes",
    born: 1596,
    dates: "1596–1650",
    place: "France and the Dutch Republic",
    group: "early-modern",
    tag: "Rationalism",
    blurb: "French mathematician and “father of modern philosophy,” who sought certainty by doubting everything that could be doubted.",
    facts: [
      "Invented analytic geometry, uniting algebra and geometry through coordinates.",
      "Had his decisive philosophical vision in a stove-heated room in Germany in 1619.",
      "Lived for about twenty years in the Dutch Republic.",
      "Died in Stockholm after being summoned to tutor Queen Christina of Sweden."
    ],
    ideas: [
      { term: "Cogito, ergo sum", text: "“I think, therefore I am”: even if I doubt everything, the very act of doubting proves that I exist." },
      { term: "Method of doubt", text: "Reject any belief that can possibly be doubted, even imagining an evil demon deceiving us, to find a certain foundation." },
      { term: "Mind–body dualism", text: "Mind is a thinking, unextended substance and body an extended, unthinking one; they interact through the pineal gland." },
      { term: "Clear and distinct ideas", text: "Whatever is perceived very clearly and distinctly is true, as guaranteed by a God who does not deceive." },
      { term: "Trademark argument", text: "My idea of an infinite, perfect God could only have been caused by such a God, like a maker’s mark stamped on his work." }
    ],
    works: [
      { title: "Discourse on the Method", year: "1637", note: "Autobiographical account of a method for rightly conducting reason and seeking truth in the sciences." },
      { title: "Meditations on First Philosophy", year: "1641", note: "Six meditations moving from radical doubt to the existence of the self, God, and the external world." },
      { title: "Principles of Philosophy", year: "1644", note: "Textbook presentation of a complete system of metaphysics and mechanical physics." }
    ],
    quotes: [
      "I think, therefore I am.",
      "It is not enough to have a good mind; the main thing is to use it well."
    ]
  },

  {
    id: "pascal",
    name: "Blaise Pascal",
    born: 1623,
    dates: "1623–1662",
    place: "Paris",
    group: "early-modern",
    tag: "Jansenism",
    blurb: "French mathematician, physicist, and Christian thinker best known for his wager and his reflections on the human condition.",
    facts: [
      "Built one of the first mechanical calculators, at about eighteen, to help his father with tax accounts.",
      "Founded probability theory in correspondence with Pierre de Fermat.",
      "Had an intense religious experience on 23 November 1654, recorded on a note he kept sewn into his coat.",
      "Closely associated with the Jansenist convent of Port-Royal."
    ],
    ideas: [
      { term: "The wager", text: "If God exists, belief gains infinite reward and risks little; so a rational person should bet on God." },
      { term: "Thinking reed", text: "Humans are frail as reeds, yet nobler than the universe that crushes them, because they know that they die." },
      { term: "Reasons of the heart", text: "Some truths, including those of faith, are known by intuition and feeling rather than by reason." },
      { term: "Diversion (divertissement)", text: "People flee boredom and thoughts of death through constant distraction and cannot bear to sit still alone." }
    ],
    works: [
      { title: "Pensées", year: "1670", note: "Posthumous fragments for a defense of Christianity, on human misery, greatness, and faith." },
      { title: "Provincial Letters", year: "1656–1657", note: "Satirical letters defending the Jansenists and attacking Jesuit casuistry." }
    ],
    quotes: [
      "The heart has its reasons which reason does not know.",
      "Man is only a reed, the weakest in nature, but he is a thinking reed."
    ]
  },

  {
    id: "spinoza",
    name: "Baruch Spinoza",
    born: 1632,
    dates: "1632–1677",
    place: "Amsterdam and The Hague",
    group: "early-modern",
    tag: "Rationalism",
    blurb: "Dutch rationalist who identified God with nature and set out his ethics in geometric form.",
    facts: [
      "Expelled from Amsterdam’s Portuguese-Jewish community with a severe writ of excommunication (herem) in 1656.",
      "Earned a modest living grinding optical lenses.",
      "Declined a professorship at Heidelberg to preserve his intellectual freedom.",
      "Published his political-theological treatise anonymously; his masterpiece appeared only after his death."
    ],
    ideas: [
      { term: "Deus sive Natura", text: "“God, or Nature”: there is only one infinite substance, and everything is a mode of it." },
      { term: "Substance monism", text: "Thought and extension are two attributes of a single substance, not two separate substances." },
      { term: "Determinism", text: "Everything follows necessarily from the nature of the one substance; free will is an illusion born of ignorance of causes." },
      { term: "Conatus", text: "Each thing, as far as it can, strives to persevere in its own being." },
      { term: "Intellectual love of God", text: "The highest happiness is understanding things as necessary, which brings freedom from the passions." }
    ],
    works: [
      { title: "Ethics", year: "1677", note: "Sets out metaphysics and ethics in geometric order, with definitions, axioms, and propositions." },
      { title: "Theological-Political Treatise", year: "1670", note: "Argues for freedom of thought and treats scripture as a historical document." }
    ],
    quotes: [
      "All things excellent are as difficult as they are rare.",
      "I have striven not to laugh at human actions, not to weep at them, nor to hate them, but to understand them."
    ]
  },

  {
    id: "locke",
    name: "John Locke",
    born: 1632,
    dates: "1632–1704",
    place: "England",
    group: "early-modern",
    tag: "Empiricism",
    blurb: "English physician and philosopher, a founder of British empiricism and a key theorist of liberal government and natural rights.",
    facts: [
      "Trained in medicine at Oxford and served as physician and adviser to the Earl of Shaftesbury.",
      "Fled to the Netherlands in 1683 amid suspicion of plotting against the king.",
      "His political ideas strongly influenced the American Declaration of Independence."
    ],
    ideas: [
      { term: "Tabula rasa", text: "The mind at birth is a blank slate; all ideas come from experience, through sensation and reflection." },
      { term: "Natural rights", text: "Everyone has rights to life, liberty, and property that exist before, and independently of, government." },
      { term: "Consent of the governed", text: "Legitimate government rests on the people’s agreement, and they may resist and replace a ruler who violates their rights." },
      { term: "Primary and secondary qualities", text: "Shape, size, and motion exist in objects themselves, while colors, tastes, and sounds exist only as effects in perceivers." },
      { term: "Labor theory of property", text: "Mixing one’s labor with unowned natural resources makes them one’s own." }
    ],
    works: [
      { title: "An Essay Concerning Human Understanding", year: "1689", note: "Argues that all knowledge derives from experience, rejecting innate ideas." },
      { title: "Two Treatises of Government", year: "1689", note: "Rejects the divine right of kings and grounds government in consent and natural rights." },
      { title: "A Letter Concerning Toleration", year: "1689", note: "Argues for religious toleration and the separation of church and state." }
    ],
    quotes: ["No man’s knowledge here can go beyond his experience."]
  },

  {
    id: "leibniz",
    name: "Gottfried Wilhelm Leibniz",
    born: 1646,
    dates: "1646–1716",
    place: "Hanover",
    group: "early-modern",
    tag: "Rationalism",
    blurb: "German polymath and rationalist who co-invented calculus and held that this is the best of all possible worlds.",
    facts: [
      "Invented calculus independently of Newton, leading to a bitter priority dispute.",
      "Served for decades as librarian and historian to the House of Brunswick in Hanover.",
      "Designed a calculating machine that could multiply and championed binary arithmetic.",
      "Satirized by Voltaire as Dr. Pangloss in Candide."
    ],
    ideas: [
      { term: "Monads", text: "Reality is ultimately made of simple, soul-like substances without parts, which do not causally interact." },
      { term: "Pre-established harmony", text: "Mind and body, and all substances, do not interact but are synchronized by God from the start, like perfectly set clocks." },
      { term: "Best of all possible worlds", text: "A perfectly good, wise, and powerful God must have created the best world possible, despite its evils." },
      { term: "Principle of sufficient reason", text: "Nothing happens without a reason why it is so and not otherwise." },
      { term: "Identity of indiscernibles", text: "No two distinct things can share all of their properties." }
    ],
    works: [
      { title: "Monadology", year: "1714", note: "Short summary of a metaphysics of simple substances, pre-established harmony, and God." },
      { title: "Theodicy", year: "1710", note: "Defends God’s goodness and justice in the face of the problem of evil." },
      { title: "New Essays on Human Understanding", year: "1704", note: "Dialogue rebutting Locke’s empiricism and defending innate ideas, published posthumously." }
    ],
    quotes: []
  },

  {
    id: "berkeley",
    name: "George Berkeley",
    born: 1685,
    dates: "1685–1753",
    place: "Ireland",
    group: "early-modern",
    tag: "Empiricism",
    blurb: "Irish bishop and empiricist who argued that material objects exist only as ideas perceived by minds.",
    facts: [
      "Anglican Bishop of Cloyne in Ireland.",
      "Lived in Rhode Island for about three years while trying to found a college in Bermuda.",
      "A California city and university campus are named after him.",
      "Late in life promoted tar-water as a cure-all medicine."
    ],
    ideas: [
      { term: "Esse est percipi", text: "“To be is to be perceived”: objects exist only as ideas in minds." },
      { term: "Immaterialism", text: "There is no material substance; reality consists only of minds and their ideas." },
      { term: "God as perceiver", text: "Things continue to exist when no human perceives them because God always perceives them." },
      { term: "Critique of abstract ideas", text: "We cannot form a general idea of a triangle that is neither scalene nor equilateral; every idea is particular." }
    ],
    works: [
      { title: "A Treatise Concerning the Principles of Human Knowledge", year: "1710", note: "Argues that matter does not exist and that objects are collections of ideas." },
      { title: "Three Dialogues between Hylas and Philonous", year: "1713", note: "Dialogues defending immaterialism against a believer in matter." }
    ],
    quotes: []
  },

  {
    id: "voltaire",
    name: "Voltaire",
    born: 1694,
    dates: "1694–1778",
    place: "Paris and Ferney",
    group: "early-modern",
    tag: "Enlightenment",
    blurb: "French Enlightenment writer and wit who fought religious intolerance and championed reason, free inquiry, and civil liberties.",
    facts: [
      "Born François-Marie Arouet; adopted his pen name after a spell in the Bastille.",
      "Spent over two years in exile in England, admiring its liberties and Newton’s science.",
      "Campaigned to clear the name of Jean Calas, a Protestant executed in Toulouse.",
      "Lived for years at Ferney near the Swiss border, receiving visitors from all over Europe."
    ],
    ideas: [
      { term: "Écrasez l’infâme", text: "“Crush the infamous thing”: a rallying cry against religious fanaticism and the abuses of the church." },
      { term: "Religious toleration", text: "No one should be persecuted for their beliefs; fanaticism is a disease of reason." },
      { term: "Deism", text: "Believed in a creator known through reason and nature, but rejected revealed religion and miracles." },
      { term: "Critique of optimism", text: "Mocked the idea that this is the best possible world, especially after the 1755 Lisbon earthquake." }
    ],
    works: [
      { title: "Candide", year: "1759", note: "Satirical novel mocking philosophical optimism through the misadventures of a naive young man." },
      { title: "Letters on the English (Philosophical Letters)", year: "1733", note: "Praises English liberty, tolerance, and science while criticizing France." },
      { title: "Treatise on Tolerance", year: "1763", note: "Prompted by the Calas affair, argues for religious tolerance." }
    ],
    quotes: [
      "If God did not exist, it would be necessary to invent him.",
      "We must cultivate our garden."
    ]
  },

  {
    id: "hume",
    name: "David Hume",
    born: 1711,
    dates: "1711–1776",
    place: "Edinburgh",
    group: "early-modern",
    tag: "Empiricism",
    blurb: "Scottish empiricist and skeptic whose analyses of causation, induction, and morality woke Kant from his “dogmatic slumber.”",
    facts: [
      "Said his first book “fell dead-born from the press.”",
      "Twice denied a university professorship because of his reputation for religious skepticism.",
      "Was best known in his lifetime for a six-volume history of England.",
      "Close friend of Adam Smith."
    ],
    ideas: [
      { term: "Problem of induction", text: "No rational argument shows that the future will resemble the past; we rely on custom or habit." },
      { term: "Causation as constant conjunction", text: "We never perceive a necessary connection between cause and effect, only one kind of event regularly following another." },
      { term: "Is–ought gap", text: "No set of purely factual statements about what is can by itself entail a conclusion about what ought to be." },
      { term: "Bundle theory of the self", text: "Introspection reveals no enduring self, only a bundle of perceptions in constant flux." },
      { term: "Relations of ideas and matters of fact", text: "All knowledge is either necessary truths of reason, like mathematics, or contingent truths known by experience; the rest is sophistry." }
    ],
    works: [
      { title: "A Treatise of Human Nature", year: "1739–1740", note: "Ambitious attempt to apply the experimental method to the mind, covering understanding, passions, and morals." },
      { title: "An Enquiry Concerning Human Understanding", year: "1748", note: "Shorter, more accessible restatement of the arguments on causation, induction, and miracles." },
      { title: "Dialogues Concerning Natural Religion", year: "1779", note: "Posthumous dialogue critiquing the argument from design for God’s existence." }
    ],
    quotes: ["Reason is, and ought only to be the slave of the passions."]
  },

  {
    id: "rousseau",
    name: "Jean-Jacques Rousseau",
    born: 1712,
    dates: "1712–1778",
    place: "Geneva and Paris",
    group: "early-modern",
    tag: "Social contract",
    blurb: "Genevan thinker who argued that civilization corrupts natural human goodness and that legitimate authority comes from the general will.",
    facts: [
      "Born in Geneva; his mother died days after his birth.",
      "Placed all five of his children in a foundling hospital.",
      "Won the Dijon Academy’s essay prize in 1750, which launched his fame.",
      "Also a composer, whose opera Le Devin du village was performed before Louis XV."
    ],
    ideas: [
      { term: "General will", text: "Legitimate laws express the common interest of the people as a whole, not merely the sum of private interests." },
      { term: "Natural goodness", text: "Humans are naturally good and compassionate; society, property, and inequality corrupt them." },
      { term: "Amour-propre", text: "Self-love that depends on comparison with others and craving for their esteem, a source of vanity and inequality." },
      { term: "Forced to be free", text: "Whoever refuses to obey the common will may be compelled to by the whole body, which secures their true civil liberty." }
    ],
    works: [
      { title: "The Social Contract", year: "1762", note: "Argues that legitimate political authority rests on a pact expressing the general will." },
      { title: "Emile, or On Education", year: "1762", note: "Treatise-novel on raising a child in harmony with nature." },
      { title: "Discourse on the Origin of Inequality", year: "1755", note: "Argues that inequality arose with private property and the development of society." }
    ],
    quotes: ["Man is born free, and everywhere he is in chains."]
  },

  {
    id: "adam-smith",
    name: "Adam Smith",
    born: 1723,
    dates: "1723–1790",
    place: "Glasgow and Edinburgh",
    group: "early-modern",
    tag: "Classical economics",
    blurb: "Scottish moral philosopher and father of modern economics, who analyzed markets, the division of labor, and moral sentiments.",
    facts: [
      "Professor of moral philosophy at the University of Glasgow.",
      "Close friend of David Hume.",
      "Toured France as tutor to the young Duke of Buccleuch.",
      "Spent his last years as a commissioner of customs in Edinburgh."
    ],
    ideas: [
      { term: "Invisible hand", text: "Individuals pursuing their own gain in a free market are led, without intending it, to promote the public good." },
      { term: "Division of labor", text: "Splitting production into specialized tasks, as in a pin factory, vastly increases productivity." },
      { term: "Impartial spectator", text: "Moral judgment works by imagining how a fair, well-informed observer would view our conduct." },
      { term: "Sympathy", text: "Our moral sentiments rest on our capacity to share imaginatively in other people’s feelings." }
    ],
    works: [
      { title: "The Wealth of Nations", year: "1776", note: "Analyzes how free markets, specialization, and trade create national prosperity." },
      { title: "The Theory of Moral Sentiments", year: "1759", note: "Grounds morality in sympathy and the judgments of an imagined impartial spectator." }
    ],
    quotes: ["It is not from the benevolence of the butcher, the brewer, or the baker that we expect our dinner, but from their regard to their own interest."]
  },

  {
    id: "kant",
    name: "Immanuel Kant",
    born: 1724,
    dates: "1724–1804",
    place: "Königsberg (Prussia)",
    group: "early-modern",
    tag: "Transcendental idealism",
    blurb: "Prussian philosopher whose critical philosophy reconciled rationalism and empiricism and grounded morality in reason.",
    facts: [
      "Never traveled far from his home city of Königsberg in East Prussia.",
      "Neighbors were said to set their clocks by his daily walks.",
      "Said that reading Hume woke him from his “dogmatic slumber.”",
      "Published his most important works only after the age of fifty-five."
    ],
    ideas: [
      { term: "Categorical imperative", text: "Act only according to that maxim through which you can at the same time will that it become a universal law." },
      { term: "Humanity formula", text: "Always treat humanity, whether in yourself or in others, as an end and never merely as a means." },
      { term: "Synthetic a priori", text: "Some knowledge, such as mathematics and the principle of causation, tells us about the world yet is known independently of experience." },
      { term: "Phenomena and noumena", text: "We know only things as they appear to us, structured by the mind, never things as they are in themselves." },
      { term: "Copernican revolution in philosophy", text: "Instead of assuming that knowledge conforms to objects, suppose that objects conform to the structures of our knowing." }
    ],
    works: [
      { title: "Critique of Pure Reason", year: "1781", note: "Investigates the limits of reason and argues that space, time, and categories are forms the mind imposes on experience." },
      { title: "Groundwork of the Metaphysics of Morals", year: "1785", note: "Short book arguing that morality rests on a supreme principle of reason binding on all rational beings." },
      { title: "Critique of Practical Reason", year: "1788", note: "Develops the theory of moral freedom and the postulates of God and immortality." },
      { title: "Perpetual Peace", year: "1795", note: "Essay proposing a federation of republics as the route to lasting peace between nations." }
    ],
    quotes: [
      "Two things fill the mind with ever new and increasing admiration and awe, the more often and steadily we reflect upon them: the starry heavens above me and the moral law within me.",
      "Sapere aude! Have courage to use your own understanding!"
    ]
  },

  {
    id: "burke",
    name: "Edmund Burke",
    born: 1729,
    dates: "1729–1797",
    place: "London (born in Dublin)",
    group: "early-modern",
    tag: "Conservatism",
    blurb: "Irish-born statesman whose critique of the French Revolution founded modern conservatism.",
    facts: [
      "Born in Dublin; served for nearly thirty years as a Whig member of the British Parliament.",
      "Sympathized with the grievances of the American colonists.",
      "Led the long impeachment of Warren Hastings for misrule in India."
    ],
    ideas: [
      { term: "Tradition and prudence", text: "Inherited institutions embody the accumulated wisdom of generations and should be reformed gradually, not torn down." },
      { term: "Intergenerational partnership", text: "Society binds the present generation to its ancestors and its descendants, so no single generation may remake it at will." },
      { term: "The sublime", text: "Distinguished the awe and terror inspired by vastness and power from the pleasure and love inspired by beauty." },
      { term: "Trustee model of representation", text: "Elected representatives owe voters their judgment, not mere obedience to instructions." }
    ],
    works: [
      { title: "Reflections on the Revolution in France", year: "1790", note: "Attacks the abstract rationalism of the French revolutionaries and defends tradition and gradual reform." },
      { title: "A Philosophical Enquiry into the Origin of Our Ideas of the Sublime and Beautiful", year: "1757", note: "Early treatise in aesthetics distinguishing awe-inspiring grandeur from beauty." }
    ],
    quotes: ["Society is indeed a contract."]
  },

  {
    id: "wollstonecraft",
    name: "Mary Wollstonecraft",
    born: 1759,
    dates: "1759–1797",
    place: "London",
    group: "early-modern",
    tag: "Feminism",
    blurb: "English writer and a founder of liberal feminism, who argued that women appear inferior only because they are denied education.",
    facts: [
      "Mother of the novelist who wrote Frankenstein.",
      "Married the radical philosopher William Godwin.",
      "Witnessed the French Revolution firsthand in Paris.",
      "Was the first to answer Edmund Burke’s attack on the French Revolution in print."
    ],
    ideas: [
      { term: "Education for women", text: "Women seem frivolous and weak only because they are denied a rational education; they are equally capable of reason." },
      { term: "Equal rights", text: "Rights belong to all rational beings, so women deserve the same moral and civil rights as men." },
      { term: "Critique of sensibility", text: "The ideal of women as delicate, emotional ornaments keeps them dependent on men." }
    ],
    works: [
      { title: "A Vindication of the Rights of Woman", year: "1792", note: "Argues that women are rational beings who deserve the same education and rights as men." },
      { title: "A Vindication of the Rights of Men", year: "1790", note: "Reply to Edmund Burke defending the French Revolution and natural rights." }
    ],
    quotes: ["I do not wish them to have power over men; but over themselves."]
  },

  /* ===================== 19th century ===================== */

  {
    id: "bentham",
    name: "Jeremy Bentham",
    born: 1748,
    dates: "1748–1832",
    place: "London",
    group: "19th",
    tag: "Utilitarianism",
    blurb: "English reformer and founder of modern utilitarianism, who held that the right action produces the greatest happiness.",
    facts: [
      "His preserved skeleton, dressed in his own clothes, is displayed at University College London as an “auto-icon.”",
      "Designed a circular prison in which every inmate could be watched from a central tower.",
      "Advocated animal welfare, women’s suffrage, and the decriminalization of homosexuality, radical views for his time.",
      "Mentor to James Mill and to his son, the young John Stuart Mill."
    ],
    ideas: [
      { term: "Principle of utility", text: "The right action is the one that produces the greatest happiness for the greatest number." },
      { term: "Felicific (hedonic) calculus", text: "Pleasures and pains can be measured by intensity, duration, certainty, nearness, and more, and then summed." },
      { term: "Panopticon", text: "A prison design in which a single watchman can observe all inmates without their knowing whether they are being watched." },
      { term: "Natural rights as nonsense", text: "Dismissed natural rights as “nonsense upon stilts”; only legal rights backed by law are real." }
    ],
    works: [
      { title: "An Introduction to the Principles of Morals and Legislation", year: "1789", note: "Sets out the principle of utility and a calculus of pleasures and pains as the basis for law." },
      { title: "A Fragment on Government", year: "1776", note: "Attack on William Blackstone’s defense of the English legal system." }
    ],
    quotes: [
      "It is the greatest happiness of the greatest number that is the measure of right and wrong.",
      "The question is not, Can they reason? nor, Can they talk? but, Can they suffer?"
    ]
  },

  {
    id: "hegel",
    name: "Georg Wilhelm Friedrich Hegel",
    born: 1770,
    dates: "1770–1831",
    place: "Jena and Berlin",
    group: "19th",
    tag: "German idealism",
    blurb: "German idealist who saw reality as the historical self-unfolding of Spirit through dialectical development.",
    facts: [
      "Shared a room at the Tübingen seminary with the poet Hölderlin and the philosopher Schelling.",
      "Saw Napoleon ride through Jena in 1806 and called him the “world-soul” on horseback.",
      "Held the chair of philosophy in Berlin from 1818 and died there in 1831, probably of cholera."
    ],
    ideas: [
      { term: "Dialectic", text: "Thought and history develop through contradictions that are overcome yet preserved (aufgehoben) in a higher unity." },
      { term: "Absolute Spirit (Geist)", text: "Reality is the self-development of Spirit, which comes to know itself through art, religion, and philosophy." },
      { term: "Master–slave dialectic", text: "Self-consciousness arises through a struggle for recognition, in which the bondsman, through labor, ultimately gains true independence." },
      { term: "History as the progress of freedom", text: "World history is the growth of the consciousness of freedom: from one person free, to some, to all." }
    ],
    works: [
      { title: "Phenomenology of Spirit", year: "1807", note: "Traces consciousness through stages from sense-certainty to absolute knowing." },
      { title: "Science of Logic", year: "1812–1816", note: "Develops the categories of thought dialectically, beginning from pure being and nothing." },
      { title: "Elements of the Philosophy of Right", year: "1820", note: "Political philosophy of right, morality, family, civil society, and the state." }
    ],
    quotes: [
      "What is rational is actual and what is actual is rational.",
      "The owl of Minerva spreads its wings only with the falling of the dusk."
    ]
  },

  {
    id: "schopenhauer",
    name: "Arthur Schopenhauer",
    born: 1788,
    dates: "1788–1860",
    place: "Frankfurt",
    group: "19th",
    tag: "Pessimism",
    blurb: "German philosopher of pessimism who saw reality as a blind, striving will and drew on Indian thought.",
    facts: [
      "Scheduled his Berlin lectures at the same hour as Hegel’s, and almost no one came.",
      "Lived alone in Frankfurt for decades with a succession of pet poodles.",
      "One of the first Western philosophers to engage seriously with the Upanishads and Buddhism.",
      "Gained real fame only in his sixties, after decades of neglect."
    ],
    ideas: [
      { term: "The world as will", text: "Behind the world of appearances lies a single, blind, insatiable striving that drives all things." },
      { term: "Pessimism", text: "Life swings between the pain of unfulfilled desire and boredom; suffering is the essence of existence." },
      { term: "Aesthetic contemplation", text: "Art, above all music, offers temporary escape from desire by letting us contemplate without willing." },
      { term: "Denial of the will", text: "Lasting release comes only from ascetic renunciation of desire, as practiced by saints and Eastern sages." },
      { term: "Compassion as the basis of morality", text: "Moral action springs from feeling another’s suffering as one’s own, not from abstract duty." }
    ],
    works: [
      { title: "The World as Will and Representation", year: "1818", note: "Argues that the world is representation to a subject and, in itself, a blind striving will." },
      { title: "Parerga and Paralipomena", year: "1851", note: "Popular essays and aphorisms that finally brought the author fame late in life." }
    ],
    quotes: ["Talent hits a target no one else can hit; genius hits a target no one else can see."]
  },

  {
    id: "mill",
    name: "John Stuart Mill",
    born: 1806,
    dates: "1806–1873",
    place: "London",
    group: "19th",
    tag: "Utilitarianism",
    blurb: "English philosopher and liberal reformer who refined utilitarianism and defended individual liberty.",
    facts: [
      "Learned Greek at age three in a rigorous education designed by his father.",
      "Suffered a mental breakdown at twenty and recovered partly through reading Wordsworth’s poetry.",
      "Worked for the East India Company for thirty-five years.",
      "As a member of Parliament, proposed giving women the vote in 1867."
    ],
    ideas: [
      { term: "Harm principle", text: "The only legitimate reason to restrict anyone’s liberty against their will is to prevent harm to others." },
      { term: "Higher and lower pleasures", text: "Intellectual and moral pleasures are qualitatively superior to merely bodily ones." },
      { term: "Freedom of expression", text: "Silencing an opinion robs humanity: if it is true we lose the truth, and if false we lose a livelier grasp of the truth." },
      { term: "Tyranny of the majority", text: "Social pressure to conform can be more oppressive than government, stifling individuality." },
      { term: "Sexual equality", text: "The legal subordination of women to men is wrong in itself and a chief obstacle to human improvement." }
    ],
    works: [
      { title: "On Liberty", year: "1859", note: "Defends freedom of thought, speech, and individuality against both state and social coercion." },
      { title: "Utilitarianism", year: "1863", note: "Defends the greatest happiness principle and distinguishes higher from lower pleasures." },
      { title: "The Subjection of Women", year: "1869", note: "Argues for full legal and social equality between the sexes." },
      { title: "A System of Logic", year: "1843", note: "Treatise on deductive and inductive reasoning, including methods for identifying causes." }
    ],
    quotes: [
      "It is better to be a human being dissatisfied than a pig satisfied; better to be Socrates dissatisfied than a fool satisfied.",
      "Over himself, over his own body and mind, the individual is sovereign."
    ]
  },

  {
    id: "kierkegaard",
    name: "Søren Kierkegaard",
    born: 1813,
    dates: "1813–1855",
    place: "Copenhagen",
    group: "19th",
    tag: "Existentialism",
    blurb: "Danish philosopher and theologian regarded as the father of existentialism, focused on individual choice, faith, and anxiety.",
    facts: [
      "Broke off his engagement to Regine Olsen, a decision that haunted his writing.",
      "Published many works under pseudonyms such as Johannes de Silentio and Victor Eremita.",
      "Spent his last year attacking the established Danish Lutheran Church.",
      "Was mercilessly lampooned by the satirical weekly The Corsair."
    ],
    ideas: [
      { term: "Leap of faith", text: "Faith cannot be reached by reason; it requires a passionate commitment beyond what evidence can justify." },
      { term: "Three stages of existence", text: "Life can be lived in the aesthetic, the ethical, or the religious sphere, each a deeper mode of selfhood." },
      { term: "Anxiety", text: "The unsettling awareness of our own freedom and possibility, which precedes every choice." },
      { term: "Teleological suspension of the ethical", text: "Abraham’s willingness to sacrifice Isaac shows that faith may require going beyond universal ethical norms." },
      { term: "Truth is subjectivity", text: "What matters most is not objective truth but the individual’s passionate, personal relation to it." }
    ],
    works: [
      { title: "Either/Or", year: "1843", note: "Contrasts an aesthetic way of life with an ethical one through the papers of two fictional authors." },
      { title: "Fear and Trembling", year: "1843", note: "Meditation on Abraham and Isaac exploring a faith that goes beyond ethics." },
      { title: "The Sickness unto Death", year: "1849", note: "Analysis of despair as the failure to be oneself before God." }
    ],
    quotes: [
      "Life can only be understood backwards; but it must be lived forwards.",
      "Anxiety is the dizziness of freedom."
    ]
  },

  {
    id: "marx",
    name: "Karl Marx",
    born: 1818,
    dates: "1818–1883",
    place: "Germany and London",
    group: "19th",
    tag: "Historical materialism",
    blurb: "German philosopher, economist, and revolutionary whose critique of capitalism inspired socialist and communist movements.",
    facts: [
      "Collaborated for four decades with Friedrich Engels, who also supported him financially.",
      "Edited the radical Rheinische Zeitung until the Prussian government suppressed it.",
      "Spent most of his later life in exile in London, researching in the British Museum reading room.",
      "Buried in Highgate Cemetery, London."
    ],
    ideas: [
      { term: "Historical materialism", text: "History is driven by changes in the material forces and relations of production, which shape law, politics, and ideas." },
      { term: "Class struggle", text: "All recorded history has been a history of conflict between classes, such as bourgeoisie and proletariat." },
      { term: "Alienation", text: "Under capitalism workers are estranged from their products, their labor, each other, and their own human essence." },
      { term: "Surplus value", text: "Profit comes from the difference between the value workers produce and the wages they are paid." },
      { term: "Commodity fetishism", text: "Social relations between people appear as relations between things, as if goods had value in themselves." }
    ],
    works: [
      { title: "The Communist Manifesto", year: "1848", note: "Pamphlet, written with Friedrich Engels, calling on workers to overthrow capitalism." },
      { title: "Capital (Das Kapital), Vol. 1", year: "1867", note: "Critique of political economy analyzing commodities, labor, and the exploitation behind profit." },
      { title: "Economic and Philosophic Manuscripts of 1844", year: "1844", note: "Early writings on alienated labor, first published in 1932." }
    ],
    quotes: [
      "The philosophers have only interpreted the world, in various ways; the point is to change it.",
      "Religion is the sigh of the oppressed creature, the heart of a heartless world, and the soul of soulless conditions. It is the opium of the people."
    ]
  },

  {
    id: "peirce",
    name: "Charles Sanders Peirce",
    born: 1839,
    dates: "1839–1914",
    place: "United States",
    group: "19th",
    tag: "Pragmatism",
    blurb: "American logician and scientist who founded pragmatism and the modern theory of signs.",
    facts: [
      "Worked for about thirty years as a scientist for the U.S. Coast and Geodetic Survey.",
      "Lost his only university post, at Johns Hopkins, amid scandal and died in poverty.",
      "Developed logical quantifiers independently of Gottlob Frege.",
      "Later renamed his doctrine “pragmaticism,” a name he said was “ugly enough to be safe from kidnappers.”"
    ],
    ideas: [
      { term: "Pragmatic maxim", text: "The meaning of a concept lies in the practical effects we conceive its object would have." },
      { term: "Abduction", text: "Inference to the best explanation: forming a hypothesis that would, if true, account for surprising facts." },
      { term: "Semiotics", text: "Signs fall into three kinds: icons (by resemblance), indexes (by causal connection), and symbols (by convention)." },
      { term: "Fallibilism", text: "No belief is ever absolutely certain; inquiry corrects itself over the long run." },
      { term: "Truth as the end of inquiry", text: "Truth is the opinion that the community of investigators is fated to agree upon in the long run." }
    ],
    works: [
      { title: "The Fixation of Belief", year: "1877", note: "Compares methods of settling belief, from tenacity and authority to the method of science." },
      { title: "How to Make Our Ideas Clear", year: "1878", note: "Essay introducing the pragmatic maxim for clarifying the meaning of concepts." }
    ],
    quotes: []
  },

  {
    id: "william-james",
    name: "William James",
    born: 1842,
    dates: "1842–1910",
    place: "Harvard (United States)",
    group: "19th",
    tag: "Pragmatism",
    blurb: "American psychologist and philosopher who popularized pragmatism and wrote influentially on religious experience.",
    facts: [
      "Elder brother of the novelist who wrote The Portrait of a Lady.",
      "Taught the first psychology course in the United States, at Harvard.",
      "Earned a medical degree but never practiced medicine."
    ],
    ideas: [
      { term: "Pragmatic theory of truth", text: "True ideas are those we can assimilate, validate, and verify; truth is what works in the long run of experience." },
      { term: "Will to believe", text: "When a choice is live, forced, and momentous, and evidence cannot settle it, we may rightly let our passions decide." },
      { term: "Stream of consciousness", text: "Thought is not a chain of separate ideas but a continuous, ever-changing flow." },
      { term: "Radical empiricism", text: "Relations between things are experienced as directly as the things themselves." }
    ],
    works: [
      { title: "The Principles of Psychology", year: "1890", note: "Founding textbook of American psychology, covering habit, attention, emotion, and the self." },
      { title: "The Varieties of Religious Experience", year: "1902", note: "Lectures studying conversion, mysticism, and saintliness as psychological phenomena." },
      { title: "Pragmatism", year: "1907", note: "Popular lectures presenting pragmatism as a method for settling metaphysical disputes." }
    ],
    quotes: []
  },

  {
    id: "nietzsche",
    name: "Friedrich Nietzsche",
    born: 1844,
    dates: "1844–1900",
    place: "Basel, Switzerland, and Italy",
    group: "19th",
    tag: "Existentialism",
    blurb: "German philosopher who proclaimed the death of God and called for a revaluation of all values.",
    facts: [
      "Appointed professor of classical philology at Basel at the age of twenty-four.",
      "Close friend, then fierce critic, of the composer Richard Wagner.",
      "Suffered a mental collapse in Turin in 1889, reportedly after embracing a horse that was being whipped.",
      "His sister edited his writings to suit her own nationalist and antisemitic views."
    ],
    ideas: [
      { term: "Death of God", text: "Modern culture no longer truly believes in God, leaving the foundations of Western values without support." },
      { term: "Will to power", text: "The basic drive of life is not mere survival but the expansion and expression of strength." },
      { term: "Übermensch", text: "The “overman”: a future human who creates new values rather than following inherited morality." },
      { term: "Eternal recurrence", text: "A test: could you affirm your life if you had to live it again, exactly the same, an infinite number of times?" },
      { term: "Master and slave morality", text: "Noble values of strength and pride were inverted by the resentment of the weak into values like humility and pity." }
    ],
    works: [
      { title: "Thus Spoke Zarathustra", year: "1883–1885", note: "Poetic, prophetic work introducing the overman and eternal recurrence." },
      { title: "Beyond Good and Evil", year: "1886", note: "Attacks the dogmatism of past philosophers and calls for “free spirits” who create values." },
      { title: "On the Genealogy of Morality", year: "1887", note: "Traces the origins of moral concepts like guilt and good and evil to resentment and power." },
      { title: "The Gay Science", year: "1882", note: "Aphorisms including the parable of the madman who announces that God is dead." }
    ],
    quotes: [
      "God is dead. God remains dead. And we have killed him.",
      "What does not destroy me, makes me stronger."
    ]
  },

  /* ===================== 20th century and contemporary ===================== */

  {
    id: "frege",
    name: "Gottlob Frege",
    born: 1848,
    dates: "1848–1925",
    place: "Jena (Germany)",
    group: "20th",
    tag: "Analytic philosophy",
    blurb: "German mathematician and logician who invented modern predicate logic and founded analytic philosophy of language.",
    facts: [
      "Taught mathematics at the University of Jena for his whole career.",
      "A letter from Bertrand Russell in 1902 revealed a contradiction at the heart of his life’s work.",
      "Largely ignored in his lifetime, he deeply influenced Russell, Wittgenstein, and Carnap."
    ],
    ideas: [
      { term: "Sense and reference", text: "An expression’s reference is what it picks out, its sense the way it presents it: “the Morning Star” and “the Evening Star” both refer to Venus." },
      { term: "Logicism", text: "Arithmetic can be derived from pure logic plus definitions." },
      { term: "Quantificational logic", text: "Invented quantifiers and variables, creating the first logic adequate to mathematical reasoning." },
      { term: "Context principle", text: "Never ask for the meaning of a word in isolation, but only in the context of a sentence." }
    ],
    works: [
      { title: "Begriffsschrift", year: "1879", note: "Introduced a formal notation for logic, including quantifiers, the first modern logical system." },
      { title: "The Foundations of Arithmetic", year: "1884", note: "Argues that numbers are logical objects and criticizes psychological and empirical accounts." },
      { title: "On Sense and Reference", year: "1892", note: "Essay distinguishing the meaning of an expression from the object it refers to." }
    ],
    quotes: []
  },

  {
    id: "husserl",
    name: "Edmund Husserl",
    born: 1859,
    dates: "1859–1938",
    place: "Göttingen and Freiburg",
    group: "20th",
    tag: "Phenomenology",
    blurb: "Founder of phenomenology, who sought to describe the structures of conscious experience without presuppositions.",
    facts: [
      "Trained as a mathematician before turning to philosophy.",
      "Studied with Franz Brentano in Vienna.",
      "Of Jewish descent, he was barred from his university under Nazi laws.",
      "After his death a Franciscan priest smuggled some 40,000 pages of his shorthand manuscripts to Leuven."
    ],
    ideas: [
      { term: "Phenomenological reduction (bracketing)", text: "Suspend assumptions about whether the external world exists in order to focus on how things appear to consciousness." },
      { term: "Intentionality", text: "Consciousness is always consciousness of something; mental acts are directed toward objects." },
      { term: "Back to the things themselves", text: "Philosophy should describe experience just as it is given, prior to theories." },
      { term: "Lifeworld (Lebenswelt)", text: "The everyday world of lived experience, which precedes and grounds scientific abstraction." }
    ],
    works: [
      { title: "Logical Investigations", year: "1900–1901", note: "Attacks psychologism in logic and lays the groundwork for a descriptive science of consciousness." },
      { title: "Ideas I", year: "1913", note: "Systematic introduction to transcendental phenomenology and the method of bracketing." },
      { title: "Cartesian Meditations", year: "1931", note: "Lectures presenting phenomenology as a radical renewal of Descartes’ project." }
    ],
    quotes: []
  },

  {
    id: "dewey",
    name: "John Dewey",
    born: 1859,
    dates: "1859–1952",
    place: "Chicago and New York",
    group: "20th",
    tag: "Pragmatism",
    blurb: "American pragmatist and educational reformer who saw democracy and inquiry as ways of solving shared problems.",
    facts: [
      "Founded the Laboratory School at the University of Chicago.",
      "Taught at Columbia University for over twenty-five years.",
      "Chaired the commission that cleared Leon Trotsky of the charges made in the Moscow show trials.",
      "Helped found the American Association of University Professors and the New School."
    ],
    ideas: [
      { term: "Instrumentalism", text: "Ideas are tools for solving problems; their value lies in how well they guide action." },
      { term: "Learning by doing", text: "Education should be active and experiential, building on children’s interests rather than rote memorization." },
      { term: "Democracy as a way of life", text: "Democracy is more than voting: it is a mode of associated living and shared inquiry." }
    ],
    works: [
      { title: "Democracy and Education", year: "1916", note: "Argues that education should prepare citizens for democratic life through active, social learning." },
      { title: "Experience and Nature", year: "1925", note: "Develops a naturalistic metaphysics rooted in human experience." },
      { title: "The Quest for Certainty", year: "1929", note: "Criticizes philosophy’s search for fixed, certain truths and favors experimental inquiry." }
    ],
    quotes: []
  },

  {
    id: "russell",
    name: "Bertrand Russell",
    born: 1872,
    dates: "1872–1970",
    place: "Cambridge and London",
    group: "20th",
    tag: "Analytic philosophy",
    blurb: "British logician, philosopher, and activist, a founder of analytic philosophy and a prolific public intellectual.",
    facts: [
      "Won the Nobel Prize in Literature in 1950.",
      "Jailed in 1918 for anti-war activities during World War I.",
      "Grandson of a Victorian prime minister.",
      "Issued a 1955 manifesto with Albert Einstein warning against nuclear weapons."
    ],
    ideas: [
      { term: "Theory of descriptions", text: "“The present King of France is bald” is analyzed as a claim that exactly one such king exists and is bald, so it is false rather than meaningless." },
      { term: "Paradox of naive set theory", text: "The set of all sets that are not members of themselves both is and is not a member of itself." },
      { term: "Logical atomism", text: "The world consists of atomic facts, mirrored by atomic propositions from which complex statements are built." },
      { term: "Knowledge by acquaintance and by description", text: "We know some things directly, like sense data, and others only through descriptions." },
      { term: "Celestial teapot", text: "The burden of proof lies on whoever makes an unfalsifiable claim, such as that a teapot orbits the Sun between Earth and Mars." }
    ],
    works: [
      { title: "Principia Mathematica", year: "1910–1913", note: "Three-volume attempt, with Alfred North Whitehead, to derive mathematics from logic." },
      { title: "On Denoting", year: "1905", note: "Influential essay analyzing definite descriptions such as “the present King of France.”" },
      { title: "The Problems of Philosophy", year: "1912", note: "Short introduction to problems of knowledge, appearance and reality, and induction." },
      { title: "A History of Western Philosophy", year: "1945", note: "Best-selling survey of philosophy from the Presocratics to the twentieth century." }
    ],
    quotes: ["The good life is one inspired by love and guided by knowledge."]
  },

  {
    id: "wittgenstein",
    name: "Ludwig Wittgenstein",
    born: 1889,
    dates: "1889–1951",
    place: "Vienna and Cambridge",
    group: "20th",
    tag: "Analytic philosophy",
    blurb: "Austrian-British philosopher whose early and late work transformed logic, language, and the philosophy of mind.",
    facts: [
      "Born into one of the richest families in Vienna, he gave away his inheritance.",
      "Completed his first book while serving in the Austrian army in World War I.",
      "Worked as a schoolteacher in rural Austrian villages in the 1920s.",
      "Studied under Bertrand Russell at Cambridge."
    ],
    ideas: [
      { term: "Picture theory of meaning", text: "Propositions picture possible states of affairs by sharing their logical form." },
      { term: "Language games", text: "Words get their meaning from their use within shared activities and forms of life." },
      { term: "Private language argument", text: "A language intelligible to only one person, referring to private sensations, is impossible." },
      { term: "Family resemblance", text: "Things called by the same word, like “games,” need share no single feature, only overlapping similarities." },
      { term: "Philosophy as therapy", text: "Philosophical problems arise when language goes on holiday; the task is to dissolve confusions, not build theories." }
    ],
    works: [
      { title: "Tractatus Logico-Philosophicus", year: "1921", note: "Numbered propositions arguing that language pictures facts and that much of philosophy is nonsense." },
      { title: "Philosophical Investigations", year: "1953", note: "Posthumous work rejecting the earlier picture theory in favor of meaning as use." },
      { title: "On Certainty", year: "1969", note: "Late notes on knowledge, doubt, and the bedrock certainties that make doubt possible." }
    ],
    quotes: [
      "Whereof one cannot speak, thereof one must be silent.",
      "The limits of my language mean the limits of my world."
    ]
  },

  {
    id: "heidegger",
    name: "Martin Heidegger",
    born: 1889,
    dates: "1889–1976",
    place: "Freiburg (Germany)",
    group: "20th",
    tag: "Phenomenology",
    blurb: "German philosopher who reopened the question of the meaning of Being and deeply influenced existentialism and hermeneutics.",
    facts: [
      "Assistant to Edmund Husserl and later his successor at Freiburg.",
      "Joined the Nazi Party in 1933 on becoming rector of Freiburg University.",
      "Had a love affair with his student Hannah Arendt.",
      "Did much of his writing in a mountain hut at Todtnauberg in the Black Forest."
    ],
    ideas: [
      { term: "Dasein", text: "“Being-there”: the kind of being humans have, for whom their own being is an issue." },
      { term: "Being-in-the-world", text: "Humans are not detached subjects but always already engaged in a world of practical concerns." },
      { term: "Being-toward-death", text: "Facing our own finitude authentically frees us from the anonymous “they” and lets us own our existence." },
      { term: "Ready-to-hand", text: "We first encounter things as equipment in use, like a hammer, not as objects of detached observation." },
      { term: "Question of Being", text: "Western philosophy has forgotten to ask what it means for anything to be at all." }
    ],
    works: [
      { title: "Being and Time", year: "1927", note: "Analyzes human existence to reopen the question of the meaning of Being." },
      { title: "The Question Concerning Technology", year: "1954", note: "Essay arguing that modern technology reveals the world as a mere stockpile of resources." },
      { title: "Introduction to Metaphysics", year: "1953", note: "Lecture course asking why there are beings at all, rather than nothing." }
    ],
    quotes: ["Language is the house of Being."]
  },

  {
    id: "popper",
    name: "Karl Popper",
    born: 1902,
    dates: "1902–1994",
    place: "Vienna and London",
    group: "20th",
    tag: "Critical rationalism",
    blurb: "Austrian-British philosopher of science who made falsifiability the mark of science and defended liberal democracy.",
    facts: [
      "Left Austria for New Zealand in 1937 to escape Nazism.",
      "Taught at the London School of Economics for over twenty years.",
      "Clashed with Wittgenstein in a 1946 Cambridge meeting remembered for a brandished fireplace poker."
    ],
    ideas: [
      { term: "Falsifiability", text: "A theory is scientific only if it makes claims that could be shown false by observation." },
      { term: "Problem of demarcation", text: "The task of distinguishing science from pseudoscience, such as astrology." },
      { term: "Open society", text: "Liberal, democratic societies allow criticism and peaceful change, unlike closed, totalitarian ones." },
      { term: "Paradox of tolerance", text: "Unlimited tolerance can lead to its own destruction if it is extended to the intolerant." },
      { term: "Critique of historicism", text: "History has no inevitable laws of development, so grand historical prophecies are unscientific." }
    ],
    works: [
      { title: "The Logic of Scientific Discovery", year: "1934", note: "Argues that science proceeds by bold conjectures and attempted refutations, not induction." },
      { title: "The Open Society and Its Enemies", year: "1945", note: "Attacks Plato, Hegel, and Marx as intellectual sources of totalitarianism." },
      { title: "Conjectures and Refutations", year: "1963", note: "Essays on the growth of scientific knowledge through criticism." }
    ],
    quotes: []
  },

  {
    id: "sartre",
    name: "Jean-Paul Sartre",
    born: 1905,
    dates: "1905–1980",
    place: "Paris",
    group: "20th",
    tag: "Existentialism",
    blurb: "French existentialist who held that human beings are condemned to be free and must create their own meaning.",
    facts: [
      "Declined the Nobel Prize in Literature in 1964.",
      "Lifelong companion of Simone de Beauvoir.",
      "Held as a prisoner of war by the Germans in 1940–1941.",
      "Co-founded the journal Les Temps modernes."
    ],
    ideas: [
      { term: "Existence precedes essence", text: "There is no fixed human nature; we first exist and then define ourselves through our choices." },
      { term: "Bad faith", text: "Self-deception in which we deny our freedom and pretend to be fixed objects, like a waiter overplaying his role." },
      { term: "Radical freedom and responsibility", text: "We cannot escape choosing, and we bear full responsibility for what we make of ourselves." },
      { term: "The look (le regard)", text: "Being seen by another person makes us aware of ourselves as objects, producing shame." }
    ],
    works: [
      { title: "Being and Nothingness", year: "1943", note: "Major treatise on consciousness, freedom, bad faith, and relations with others." },
      { title: "Nausea", year: "1938", note: "Novel in which a historian is overwhelmed by the sheer contingency of existence." },
      { title: "Existentialism Is a Humanism", year: "1946", note: "Popular lecture defending existentialism as a philosophy of freedom and responsibility." },
      { title: "No Exit", year: "1944", note: "Play in which three dead souls are trapped together forever in a single room in hell." }
    ],
    quotes: [
      "Hell is other people.",
      "Man is condemned to be free."
    ]
  },

  {
    id: "arendt",
    name: "Hannah Arendt",
    born: 1906,
    dates: "1906–1975",
    place: "Germany and New York",
    group: "20th",
    tag: "Political theory",
    blurb: "German-American political theorist who analyzed totalitarianism, the nature of evil, and the meaning of political action.",
    facts: [
      "Studied with Heidegger and wrote her dissertation under Karl Jaspers.",
      "Fled Nazi Germany in 1933 after being briefly arrested by the Gestapo.",
      "Reported on the 1961 Jerusalem trial of Adolf Eichmann for The New Yorker.",
      "Was stateless for fourteen years before becoming a U.S. citizen in 1951."
    ],
    ideas: [
      { term: "Banality of evil", text: "Great evil can be committed by ordinary, thoughtless functionaries rather than by fanatics or monsters." },
      { term: "Vita activa", text: "Human activity divides into labor, work, and action, with action (speech and deeds among equals) the highest." },
      { term: "Natality", text: "Each birth brings the capacity to begin something new, the root of political freedom." },
      { term: "Totalitarianism", text: "A novel form of rule that uses ideology and terror to dominate every aspect of life, built on isolation and loneliness." },
      { term: "The right to have rights", text: "Stateless people show that human rights are worthless without membership in a political community." }
    ],
    works: [
      { title: "The Origins of Totalitarianism", year: "1951", note: "Traces antisemitism and imperialism as roots of Nazi and Stalinist regimes." },
      { title: "The Human Condition", year: "1958", note: "Analyzes labor, work, and action, and the loss of public life in the modern age." },
      { title: "Eichmann in Jerusalem", year: "1963", note: "Report on a Nazi bureaucrat’s trial that sparked fierce controversy." }
    ],
    quotes: []
  },

  {
    id: "beauvoir",
    name: "Simone de Beauvoir",
    born: 1908,
    dates: "1908–1986",
    place: "Paris",
    group: "20th",
    tag: "Existentialism",
    blurb: "French existentialist philosopher and novelist whose analysis of women’s oppression laid foundations for second-wave feminism.",
    facts: [
      "Placed second in the 1929 national philosophy examination (agrégation), just behind Jean-Paul Sartre.",
      "Lifelong partner of Jean-Paul Sartre, though they never married or lived together.",
      "Won the Prix Goncourt in 1954 for a novel about postwar French intellectuals."
    ],
    ideas: [
      { term: "Woman as Other", text: "Men have defined themselves as the norm and women as the secondary sex, the object against which the male subject defines himself." },
      { term: "Social construction of gender", text: "Femininity is produced by upbringing, myths, and institutions rather than by biology." },
      { term: "Ethics of ambiguity", text: "Humans are both free subjects and material objects; ethics means willing one’s own freedom and that of others." }
    ],
    works: [
      { title: "The Second Sex", year: "1949", note: "Landmark study of how women have been made into “the Other” throughout history and culture." },
      { title: "The Ethics of Ambiguity", year: "1947", note: "Develops an existentialist ethics of freedom and responsibility." },
      { title: "The Mandarins", year: "1954", note: "Novel about French intellectuals after the Second World War." }
    ],
    quotes: ["One is not born, but rather becomes, a woman."]
  },

  {
    id: "merleau-ponty",
    name: "Maurice Merleau-Ponty",
    born: 1908,
    dates: "1908–1961",
    place: "Paris",
    group: "20th",
    tag: "Phenomenology",
    blurb: "French phenomenologist who placed the lived, perceiving body at the center of philosophy.",
    facts: [
      "Co-edited Les Temps modernes with Jean-Paul Sartre before breaking with him over politics.",
      "Held the chair of philosophy at the Collège de France from 1952.",
      "Died suddenly of a stroke at the age of fifty-three."
    ],
    ideas: [
      { term: "Primacy of perception", text: "Perception, not abstract thought, is our basic way of being in contact with the world." },
      { term: "Body-subject", text: "The body is not an object we possess but the subject through which we experience and act." },
      { term: "Motor intentionality", text: "Bodily skills, like reaching for a cup, are directed at the world without explicit thought." },
      { term: "Flesh", text: "An elemental fabric in which seer and seen, touching and touched, are intertwined." }
    ],
    works: [
      { title: "Phenomenology of Perception", year: "1945", note: "Argues that perception is embodied and that the body is our point of view on the world." },
      { title: "The Visible and the Invisible", year: "1964", note: "Unfinished posthumous work developing the notion of flesh." }
    ],
    quotes: []
  },

  {
    id: "quine",
    name: "W. V. O. Quine",
    born: 1908,
    dates: "1908–2000",
    place: "Harvard (United States)",
    group: "20th",
    tag: "Analytic philosophy",
    blurb: "American logician whose critique of the analytic–synthetic distinction reshaped mid-century analytic philosophy.",
    facts: [
      "Spent virtually his entire career at Harvard.",
      "Visited the Vienna Circle and Rudolf Carnap in the early 1930s.",
      "Served as a U.S. Navy intelligence officer in World War II."
    ],
    ideas: [
      { term: "Rejection of the analytic–synthetic distinction", text: "There is no sharp line between truths true by meaning alone and truths true by fact." },
      { term: "Confirmation holism", text: "Our beliefs face the tribunal of experience as a whole web, not one by one." },
      { term: "Indeterminacy of translation", text: "Behavioral evidence never fixes a unique translation: “gavagai” could mean rabbit or undetached rabbit parts." },
      { term: "Naturalized epistemology", text: "Theory of knowledge should become part of empirical psychology rather than a foundation for science." },
      { term: "Ontological commitment", text: "A theory is committed to the existence of whatever its bound variables must range over for it to be true." }
    ],
    works: [
      { title: "Two Dogmas of Empiricism", year: "1951", note: "Influential essay attacking the analytic–synthetic distinction and reductionism." },
      { title: "Word and Object", year: "1960", note: "Develops a behaviorist theory of meaning, including radical translation." }
    ],
    quotes: ["To be is to be the value of a variable."]
  },

  {
    id: "camus",
    name: "Albert Camus",
    born: 1913,
    dates: "1913–1960",
    place: "Algeria and Paris",
    group: "20th",
    tag: "Absurdism",
    blurb: "French-Algerian writer who explored the absurd and argued for revolt, freedom, and passion in a meaningless universe.",
    facts: [
      "Born in French Algeria to a poor family; his father was killed in World War I.",
      "Edited the Resistance newspaper Combat during the German occupation.",
      "Won the Nobel Prize in Literature in 1957, at the age of forty-four.",
      "Died in a car crash in 1960 with an unused train ticket in his pocket."
    ],
    ideas: [
      { term: "The absurd", text: "The clash between our longing for meaning and the silent, indifferent universe." },
      { term: "Revolt", text: "The proper response to meaninglessness is neither suicide nor religious hope but defiant, lucid living." },
      { term: "Philosophical suicide", text: "Leaping into faith or an all-explaining system evades the honest confrontation with meaninglessness." },
      { term: "Rebellion and limits", text: "Rebellion must respect limits; ideologies that justify murder betray rebellion itself." }
    ],
    works: [
      { title: "The Myth of Sisyphus", year: "1942", note: "Essay asking whether life is worth living in an absurd world, using the figure of a man forever pushing a boulder." },
      { title: "The Stranger", year: "1942", note: "Novel about Meursault, an emotionally detached man condemned for a killing." },
      { title: "The Plague", year: "1947", note: "Novel about an epidemic in Oran and the solidarity of those who fight it." },
      { title: "The Rebel", year: "1951", note: "Essay on revolt and revolution that criticizes ideologies justifying political murder." }
    ],
    quotes: [
      "One must imagine Sisyphus happy.",
      "There is but one truly serious philosophical problem, and that is suicide."
    ]
  },

  {
    id: "rawls",
    name: "John Rawls",
    born: 1921,
    dates: "1921–2002",
    place: "Harvard (United States)",
    group: "20th",
    tag: "Liberalism",
    blurb: "American political philosopher whose theory of justice as fairness revived normative political philosophy.",
    facts: [
      "Served as an infantryman in the Pacific in World War II.",
      "Taught at Harvard for nearly four decades.",
      "As a child, two of his younger brothers died of diseases they caught from him.",
      "Was famously modest and spoke with a stammer."
    ],
    ideas: [
      { term: "Original position", text: "A thought experiment: imagine choosing the basic principles of society as free and equal parties in a fair initial situation." },
      { term: "Veil of ignorance", text: "Those choosing principles do not know their race, class, talents, or conception of the good, which ensures impartiality." },
      { term: "Difference principle", text: "Social and economic inequalities are just only if they benefit the least advantaged members of society." },
      { term: "Justice as fairness", text: "Just principles are those that free and equal persons would agree to under fair conditions." },
      { term: "Reflective equilibrium", text: "Adjust general principles and particular judgments against each other until they cohere." }
    ],
    works: [
      { title: "A Theory of Justice", year: "1971", note: "Derives principles of justice from a hypothetical choice made behind a veil of ignorance." },
      { title: "Political Liberalism", year: "1993", note: "Asks how a stable, just society is possible among citizens with deeply different worldviews." },
      { title: "The Law of Peoples", year: "1999", note: "Extends the theory of justice to relations between societies." }
    ],
    quotes: ["Justice is the first virtue of social institutions, as truth is of systems of thought."]
  },

  {
    id: "kuhn",
    name: "Thomas Kuhn",
    born: 1922,
    dates: "1922–1996",
    place: "Harvard, Berkeley, Princeton, and MIT",
    group: "20th",
    tag: "Philosophy of science",
    blurb: "American historian and philosopher of science who argued that science advances through revolutionary paradigm shifts.",
    facts: [
      "Trained as a physicist, earning a doctorate in physics at Harvard.",
      "Turned to the history of science while teaching a course on science for humanities students.",
      "Taught at Berkeley, Princeton, and MIT."
    ],
    ideas: [
      { term: "Paradigm shift", text: "A revolutionary change in a science’s basic framework, as from Ptolemaic to Copernican astronomy." },
      { term: "Normal science", text: "Routine puzzle-solving within an accepted framework of theories, methods, and exemplars." },
      { term: "Incommensurability", text: "Competing frameworks may lack a common measure, so their adherents partly talk past each other." },
      { term: "Anomaly and crisis", text: "Accumulating results that resist explanation can trigger a crisis and, eventually, a revolution." }
    ],
    works: [
      { title: "The Structure of Scientific Revolutions", year: "1962", note: "Argues that science alternates between normal science and revolutionary paradigm shifts." },
      { title: "The Copernican Revolution", year: "1957", note: "Historical study of the shift from an Earth-centered to a Sun-centered cosmos." }
    ],
    quotes: []
  },

  {
    id: "foucault",
    name: "Michel Foucault",
    born: 1926,
    dates: "1926–1984",
    place: "Paris",
    group: "20th",
    tag: "Post-structuralism",
    blurb: "French historian of ideas who analyzed how power and knowledge shape institutions such as prisons, clinics, and asylums.",
    facts: [
      "Held a chair in the History of Systems of Thought at the Collège de France.",
      "Co-founded a group that gathered and published information on French prison conditions.",
      "Debated Noam Chomsky on human nature on Dutch television in 1971.",
      "Died of an AIDS-related illness in Paris in 1984."
    ],
    ideas: [
      { term: "Power/knowledge", text: "Power and knowledge are intertwined: institutions produce knowledge that in turn extends their control." },
      { term: "Disciplinary power", text: "Modern society trains and normalizes people through surveillance, so they police themselves as if always watched." },
      { term: "Biopower", text: "Modern states manage the life, health, and reproduction of whole populations, not just punish subjects." },
      { term: "Genealogy", text: "Historical analysis that shows how ideas and institutions taken as natural arose from contingent struggles." },
      { term: "Episteme", text: "The underlying framework that defines what can count as knowledge in a given historical period." }
    ],
    works: [
      { title: "Madness and Civilization (History of Madness)", year: "1961", note: "History of how Western societies came to confine and medicalize the mad." },
      { title: "The Order of Things", year: "1966", note: "Archaeology of the human sciences that predicts the “death of man” as a figure of knowledge." },
      { title: "Discipline and Punish", year: "1975", note: "Traces the shift from public torture to the prison and modern disciplinary surveillance." },
      { title: "The History of Sexuality, Vol. 1", year: "1976", note: "Argues that modern societies did not repress sex but multiplied discourses about it." }
    ],
    quotes: ["Where there is power, there is resistance."]
  },

  {
    id: "habermas",
    name: "Jürgen Habermas",
    born: 1929,
    dates: "b. 1929",
    place: "Frankfurt",
    group: "20th",
    tag: "Critical theory",
    blurb: "German philosopher of the Frankfurt School known for theories of communicative action, the public sphere, and deliberative democracy.",
    facts: [
      "Leading figure of the second generation of the Frankfurt School.",
      "Worked as assistant to Theodor Adorno at the Institute for Social Research.",
      "Born with a cleft palate, he has said that childhood surgeries shaped his interest in communication."
    ],
    ideas: [
      { term: "Public sphere", text: "A space where private people come together to debate matters of common concern, which emerged in 18th-century coffeehouses and salons." },
      { term: "Communicative action", text: "Action oriented to reaching mutual understanding through reasons, rather than to success through manipulation." },
      { term: "Discourse ethics", text: "Valid moral norms are those that all affected could agree to as participants in a practical discourse." },
      { term: "Ideal speech situation", text: "Conditions of free, equal, uncoerced dialogue in which only the force of the better argument prevails." }
    ],
    works: [
      { title: "The Structural Transformation of the Public Sphere", year: "1962", note: "History of the rise and decline of bourgeois public debate." },
      { title: "The Theory of Communicative Action", year: "1981", note: "Two-volume theory of society built on language oriented toward mutual understanding." },
      { title: "Between Facts and Norms", year: "1992", note: "Discourse theory of law and deliberative democracy." }
    ],
    quotes: []
  },

  {
    id: "derrida",
    name: "Jacques Derrida",
    born: 1930,
    dates: "1930–2004",
    place: "Paris (born in Algeria)",
    group: "20th",
    tag: "Post-structuralism",
    blurb: "Algerian-born French philosopher who founded deconstruction, a way of reading that exposes hidden hierarchies in texts.",
    facts: [
      "Born in Algeria to a Sephardic Jewish family and expelled from school under Vichy antisemitic laws.",
      "A 1992 proposal to give him an honorary Cambridge degree provoked a public protest by other philosophers.",
      "Taught for many years at the École des Hautes Études en Sciences Sociales in Paris."
    ],
    ideas: [
      { term: "Deconstruction", text: "Reading texts to show how their binary oppositions, such as speech and writing or presence and absence, undermine themselves." },
      { term: "Différance", text: "Meaning is never fully present: it arises from differences between signs and is endlessly deferred." },
      { term: "Logocentrism", text: "Western philosophy’s privileging of speech, presence, and reason as direct access to meaning." }
    ],
    works: [
      { title: "Of Grammatology", year: "1967", note: "Critique of the Western privileging of speech over writing." },
      { title: "Writing and Difference", year: "1967", note: "Essays on Husserl, Levinas, Freud, Foucault, and structuralism." },
      { title: "Speech and Phenomena", year: "1967", note: "Critique of Husserl’s theory of signs and its privileging of presence." }
    ],
    quotes: ["There is nothing outside the text."]
  },

  {
    id: "searle",
    name: "John Searle",
    born: 1932,
    dates: "1932–2025",
    place: "Berkeley, California",
    group: "20th",
    tag: "Analytic philosophy",
    blurb: "American philosopher of mind and language known for the Chinese room argument and for speech act theory.",
    facts: [
      "Taught at the University of California, Berkeley, for some six decades.",
      "Studied at Oxford as a Rhodes Scholar, where he was influenced by J. L. Austin.",
      "Was the first tenured Berkeley professor to join the 1964 Free Speech Movement."
    ],
    ideas: [
      { term: "Chinese room", text: "Someone following rules to manipulate Chinese symbols could seem fluent without understanding, so running a program is not enough for a mind." },
      { term: "Speech acts", text: "Utterances do things, such as promising or ordering, according to constitutive rules." },
      { term: "Biological naturalism", text: "Consciousness is a real, subjective feature caused by brain processes, as digestion is caused by the stomach." },
      { term: "Strong vs. weak AI", text: "Distinguished the claim that a suitably programmed computer literally has a mind from the claim that it merely simulates one." }
    ],
    works: [
      { title: "Minds, Brains, and Programs", year: "1980", note: "Article presenting the Chinese room argument against strong artificial intelligence." },
      { title: "Speech Acts", year: "1969", note: "Systematic theory of how utterances perform actions such as promising and asserting." },
      { title: "The Construction of Social Reality", year: "1995", note: "Explains how institutions like money and marriage exist through collective acceptance." }
    ],
    quotes: []
  },

  {
    id: "nagel",
    name: "Thomas Nagel",
    born: 1937,
    dates: "b. 1937",
    place: "New York",
    group: "20th",
    tag: "Analytic philosophy",
    blurb: "American philosopher of mind and ethics, best known for asking what it is like to be a bat.",
    facts: [
      "Born in Belgrade, Yugoslavia, to German Jewish refugees.",
      "Wrote his doctorate at Harvard under John Rawls.",
      "Taught for decades at New York University."
    ],
    ideas: [
      { term: "Subjective character of experience", text: "An organism is conscious if there is something it is like to be that organism, which physical science seems to leave out." },
      { term: "The view from nowhere", text: "The tension between our subjective standpoint and the objective, impersonal view we try to attain." },
      { term: "Moral luck", text: "We are judged for outcomes and circumstances beyond our control, conflicting with the idea that we are responsible only for what we control." },
      { term: "The absurd as self-transcendence", text: "Life seems absurd because we take it seriously while also being able to step back and see it as arbitrary." }
    ],
    works: [
      { title: "What Is It Like to Be a Bat?", year: "1974", note: "Article arguing that subjective experience cannot be captured by objective physical description." },
      { title: "The View from Nowhere", year: "1986", note: "Explores the conflict between subjective and objective standpoints in many areas of philosophy." },
      { title: "Mind and Cosmos", year: "2012", note: "Argues that materialist neo-Darwinism cannot fully explain consciousness, reason, and value." }
    ],
    quotes: []
  },

  {
    id: "nozick",
    name: "Robert Nozick",
    born: 1938,
    dates: "1938–2002",
    place: "Harvard (United States)",
    group: "20th",
    tag: "Libertarianism",
    blurb: "American philosopher whose defense of the minimal state became the classic philosophical statement of libertarianism.",
    facts: [
      "Harvard colleague and chief philosophical opponent of John Rawls.",
      "Son of a Russian Jewish immigrant, raised in Brooklyn.",
      "Later distanced himself from some of his earlier libertarian views."
    ],
    ideas: [
      { term: "Minimal state", text: "Only a night-watchman state, limited to protection against force, theft, and fraud, is justified." },
      { term: "Entitlement theory of justice", text: "Holdings are just if acquired and transferred justly, whatever the overall pattern of distribution." },
      { term: "Wilt Chamberlain argument", text: "If fans freely pay to watch a star, the resulting inequality is just, so enforcing patterns means interfering with liberty." },
      { term: "Experience machine", text: "Would you plug into a machine that gives you any experiences you want? If not, pleasure is not all that matters." }
    ],
    works: [
      { title: "Anarchy, State, and Utopia", year: "1974", note: "Argues that only a minimal state is justified and criticizes redistributive theories of justice." },
      { title: "Philosophical Explanations", year: "1981", note: "Wide-ranging work on personal identity, knowledge, free will, and the meaning of life." }
    ],
    quotes: ["Taxation of earnings from labor is on a par with forced labor."]
  },

  {
    id: "kripke",
    name: "Saul Kripke",
    born: 1940,
    dates: "1940–2022",
    place: "Princeton and New York",
    group: "20th",
    tag: "Analytic philosophy",
    blurb: "American logician whose work on modal logic, naming, and necessity transformed analytic philosophy.",
    facts: [
      "Published a completeness result in modal logic while still a teenager.",
      "Gave his most famous lectures at Princeton in 1970 without notes.",
      "Taught at Princeton and later at the CUNY Graduate Center.",
      "Son of a rabbi from Omaha, Nebraska."
    ],
    ideas: [
      { term: "Rigid designators", text: "Proper names pick out the same object in every possible world in which it exists." },
      { term: "Causal theory of reference", text: "A name refers through a historical chain of use going back to an initial baptism, not via descriptions." },
      { term: "Necessary a posteriori", text: "Some truths, like “water is H₂O,” are necessary yet knowable only through empirical discovery." },
      { term: "Possible-world semantics", text: "Modal claims are evaluated across possible worlds linked by an accessibility relation." },
      { term: "Rule-following paradox", text: "A reading of Wittgenstein: no fact about a speaker’s past usage determines which rule they are following." }
    ],
    works: [
      { title: "Naming and Necessity", year: "1980", note: "Lectures, given in 1970, attacking descriptivism and defending rigid designation." },
      { title: "Wittgenstein on Rules and Private Language", year: "1982", note: "Influential interpretation presenting a skeptical paradox about rule-following." }
    ],
    quotes: []
  },

  {
    id: "singer",
    name: "Peter Singer",
    born: 1946,
    dates: "b. 1946",
    place: "Princeton and Melbourne",
    group: "20th",
    tag: "Utilitarianism",
    blurb: "Australian utilitarian philosopher whose work on animals and global poverty helped launch movements for both.",
    facts: [
      "Long served as professor of bioethics at Princeton University.",
      "Three of his grandparents died in the Holocaust after his parents fled Vienna.",
      "A key intellectual inspiration for the effective altruism movement."
    ],
    ideas: [
      { term: "Speciesism", text: "Giving less moral weight to beings’ interests merely because they are not human, a prejudice analogous to racism." },
      { term: "Drowning child", text: "If you would ruin your clothes to save a child drowning in a pond, you should also give to save distant lives." },
      { term: "Equal consideration of interests", text: "Similar interests deserve equal weight regardless of whose they are, including those of animals that can suffer." },
      { term: "Preference utilitarianism", text: "The right action maximizes the satisfaction of the preferences of all those affected." }
    ],
    works: [
      { title: "Animal Liberation", year: "1975", note: "Argues against factory farming and animal experimentation on grounds of equal consideration." },
      { title: "Famine, Affluence, and Morality", year: "1972", note: "Article arguing that the affluent are morally obliged to give much more to relieve poverty." },
      { title: "Practical Ethics", year: "1979", note: "Applies utilitarian reasoning to abortion, euthanasia, animals, and global poverty." }
    ],
    quotes: []
  }

];
