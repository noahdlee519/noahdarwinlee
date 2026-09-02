Images for Layout Guesser at /game/.

One file per city, named after that city's "id" in game/cities.json:

    art/game/chicago.webp
    art/game/paris.jpg
    art/game/naypyidaw.png

.webp is preferred; .jpg, .jpeg and .png also work. The page tries each in
that order and uses whichever it finds, so you can mix formats.

A city listed in cities.json with no image here is skipped silently — the
game only ever shows rounds it can actually draw. So you can add images one
at a time and the game grows as you go. Nothing else needs editing. Each
game picks ten at random from the level you chose, so the more images a
level has, the less it repeats. Ten per level is the minimum for a full
round; twenty or more is where it starts feeling fresh.

To add a city that isn't in the list, copy an existing entry in
game/cities.json and change the fields:

    id       the filename you'll use here (lowercase, hyphens, no spaces)
    tier     "easy", "medium" or "hard" — how recognisable it is from above
    city     the answer, spelled the way you'd write it
    country  shown alongside the answer on the reveal
    aliases  other spellings and nicknames that should also count

Guesses are matched loosely: case, accents, punctuation and small typos are
forgiven, so "sao paolo" passes for "São Paulo".

Sizing: roughly 1400px on the long side, and keep them under about 300 KB
each. Ten load per game. Square-ish crops sit best on the page.
