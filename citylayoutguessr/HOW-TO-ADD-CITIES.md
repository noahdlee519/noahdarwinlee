# citylayoutguessr — how to add pictures and answers

aspect ratios for all maps are 1000 pixels by 700 pixels

| Where | What's in it |
|---|---|
| `citylayoutguessr/maps/` | Your full-size screenshots. This is where you work, and it decides what's in the game. |
| `citylayoutguessr/cities.json` | The answers, one entry per picture. |
| `art/game/` | The built copies the website loads. Don't edit by hand. |

**The folder is in charge.** Drop `helsinki.png` into `citylayoutguessr/maps/`, run the
build, and Helsinki is in the game — if `cities.json` doesn't know that name,
an entry is written for it and the build tells you so you can fill in its level,
country, continent and aliases. You never have to make a filename match a list.

```
cd ~/Desktop/noahdarwinlee
bash citylayoutguessr/build-images.sh
```

That writes two files per screenshot into `art/game/`:

- `<city>.webp` — 1200px, about 200 KB. This is what a round loads. WebP
  because every browser can read it.
- `<city>@2x.avif` — full size, about 290 KB. Only fetched if a player uses the
  magnifier. AVIF because it's roughly a third smaller than WebP for the same
  picture; a browser too old for AVIF just keeps the WebP and gets a slightly
  softer magnifier rather than a hole.

It only touches what has changed (`FORCE=1 bash citylayoutguessr/build-images.sh` rebuilds
everything). Your originals are never modified and are gitignored — the repo
carries only the built copies. Sizes are tuned at the top of the script if you
ever want to trade weight for quality.

It also writes `art/game/images.json`, the list of cities that have a picture.
The page reads it so it knows what exists without asking the server. If you add
an image without running the build, the game won't see it.

## The daily challenge

One link, the same puzzle for everyone, a new one each day:

```
https://noahdarwinlee.com/citylayoutguessr/#daily
```

There is no server behind it. The date is the seed: the page sorts every city
that has a picture, shuffles that list with a generator seeded from the day,
and takes the first ten. Two people opening the link on the same day shuffle
the same list the same way and get the same ten in the same order — which is
what makes the scores worth comparing.

The day is counted in **UTC**, so everyone everywhere is on the same puzzle at
the same moment rather than a friend abroad being a day ahead. It rolls over at
midnight UTC, which is early evening in Chicago.

You get one go. Once you finish, the menu offers today's result instead of a
replay, and a **copy result** button puts a shareable summary on the clipboard:

```
citylayoutguessr no. 1
7 / 10
●●○●●●○●●●
https://noahdarwinlee.com/citylayoutguessr/#daily
```

**One thing to watch:** the puzzle is drawn from whatever pictures exist when
the page loads, so adding maps partway through a day changes that day's ten for
anyone who loads it afterwards. If people are playing, push new maps the next
morning rather than mid-evening.

---

## Setting up a game

The start screen is one panel:

- **difficulty** — `all`, `easy`, `medium`, `hard`. The number beside each is
  how many maps that level actually has.
- **where** — one box per continent, same idea.
- **rounds** — a slider at 10, 20, 30, 50 or endless. Lengths the current
  selection can't fill are greyed out and the slider won't stop on them.
  Endless never greys out: it reshuffles when it runs out of maps and keeps
  going until you press **stop**, which ends the run and shows the recap.

Whatever you pick is remembered, so the next visit opens on the same setup.
Old links still work: `/citylayoutguessr/#hard`, `/citylayoutguessr/#europe` and `/citylayoutguessr/#mixed` start
a ten-round game with that preselected.

To add another region, add a line to the `continents` block at the top of
`cities.json` and set `continent` on the cities that belong to it — the
checkbox appears by itself. Continents in use are Europe, North America,
South America, Asia, Africa and Oceania. North America is the geographic one:
Canada down through Panama, plus the Caribbean.

While a game is running, **change level** in the bar above the picture (or the
Escape key) takes you back to the panel. Clicking the picture opens a
magnifier that follows the pointer; click again to put it away.

## Cosmetic settings

At the bottom of the menu, the same colour customiser the flash card tool has.
Three colours — background, text, accent — drive the whole page through CSS
variables, so changing one repaints everything including the image borders and
the magnifier. Five presets: orange, night, paper, sea, slate. Your choice is
remembered on your own machine and is nobody else's business; it does not
travel with a shared link.

There is a guard. A colour picker will happily give you white text on a white
ground, so anything that falls below **4.5:1** contrast for text (or **3:1**
for the accent) gets pushed back. If you change the background, the text moves
out of the way; if you change the text into something unreadable, it snaps back
to the last value that worked and says why. Adjustments keep the colour's hue
where there is one to keep, so a green accent stays green rather than turning
grey.

To add a preset, add a line to `COLOR_PRESETS` near the bottom of `game.js`.

---

## The normal case: a city that's already in the list

1. Take your screenshot.
2. Save it in `citylayoutguessr/maps/` named after the city — lowercase, hyphens, no
   spaces: `chicago.png`, `new-orleans.png`, `quebec-city.png`. `.jpg`,
   `.webp` and `.tif` work too.
3. Run `bash citylayoutguessr/build-images.sh`.
4. Reload `/citylayoutguessr/`. If the name was already in `cities.json` you're done. If it
   wasn't, the build says so and drops a new entry at the bottom of the `hard`
   list with the country, continent and aliases left blank — fill those in.

To see every id you can use, run the checker (below) or open `cities.json`
and read the `"id"` values. They're all lowercase with hyphens:
`new-york`, `hong-kong`, `mexico-city`, `salt-lake-city`, `addis-ababa`.

## The other case: a city that isn't in the list

Open `citylayoutguessr/cities.json` and copy any line in `"cities"`, then edit it:

```json
{ "id": "st-louis", "tier": "medium", "city": "St. Louis", "country": "United States", "aliases": ["saint louis", "st louis"] },
```

| Field | What it is |
|---|---|
| `id` | The filename you'll use, minus the extension. Lowercase, hyphens, no spaces. |
| `tier` | `easy`, `medium` or `hard` — how recognisable it is from above, not how big it is. |
| `city` | The answer, spelled the way you'd write it. Accents fine. |
| `country` | Shown next to the answer on the reveal. |
| `aliases` | Anything else that should count as right. `[]` if none. |

Aliases are where the game stops feeling pedantic. Every city already has a
generous list — endonyms (`praha`, `wien`, `kobenhavn`), historical names
(`constantinople`, `bombay`, `leopoldville`), nicknames (`beantown`,
`the big easy`, `the pink city`), abbreviations (`nyc`, `slc`, `bkk`) and
alternative transliterations (`ulan bator`, `ashkhabad`, `nur sultan`). Add
to them freely; the checker below will tell you if one you add becomes
ambiguous.

You do **not** need to list misspellings. Guesses are matched loosely already:
case, accents and punctuation are ignored, and one wrong, missing, extra or
swapped letter is forgiven (two on names longer than twelve characters).
`praha`, `Praha`, `praugue` and `prahue` all pass for Prague. Abbreviations of
three letters or fewer have to be exact, so `sf` never accidentally passes for
Singapore.

Every entry needs a comma after it **except the last one in the list**. If
the game says the list couldn't be loaded, that's almost always a missing or
extra comma. The checker below will tell you.

You only need to do this by hand if you want to set the level and aliases
before you take the screenshot; otherwise the build writes the entry for you
and you edit it afterwards.

---

## Taking the screenshots

**Every map is 1000 × 700.** That is the frame — set the window to it and keep
to it. On a Retina screen the file lands on disk at 2000 × 1400, which is what
you want: the build uses the extra pixels for the magnifier. A consistent frame
is what keeps the game about the city rather than about how far you happened to
zoom on the day, so it matters more than any other setting here.


The credit line on the page reads "Satellite imagery from Google Earth", so
take these from Google Earth or Google Maps satellite view. Note that
Google's Geo Guidelines say satellite imagery may not be used for gaming;
attribution doesn't change that. Your call — but if you'd rather not, an
OpenStreetMap-based map is the clean alternative, and the only thing to
change is the `"credit"` line.

- **Zoom level:** within that 1000 × 700 frame, far enough out that you see
  the shape of the whole built-up area, not individual buildings. The street
  grid should read as texture, not as streets. Roughly a 10–30 km frame.
- **Crop:** none needed. The 1000 × 700 frame is already the shape the page
  lays out for, so don't trim afterwards — that's what breaks the alignment
  between one round and the next.
- **Size:** don't worry about file size — `build-images.sh` handles that. Do
  care about pixels: the 2000 × 1400 a Retina screen produces is what gives the
  magnifier 3.3x on an ordinary display and 1.65x on a Retina one. The build
  never upscales, so a 1000 × 700 file captured on a non-Retina screen would
  still work but would zoom half as far.
- **Nothing that gives it away:** no labels, no place names, no search box,
  no scale bar with a country on it, no pin. On openstreetmap.org the
  In Google Earth, turn off Borders and Labels and Places under Layers.
- **Consistency helps:** same zoom and same style across a level makes the
  guessing about the city rather than about your screenshot habits.

If you change where the pictures come from, change the credit too — it's
the `"credit"` line at the top of `citylayoutguessr/cities.json`.

## Check your work

```
cd ~/Desktop/noahdarwinlee
bash citylayoutguessr/check.sh
```

It tells you how many pictures each level has, which files don't match any
city (a typo in a filename), and whether `cities.json` is valid. A level
needs **at least 10 pictures** to fill a full game.

It also checks every answer against every other answer in the same level and
warns you if two cities would accept the same guess — so if you add an alias
that's too loose, you find out here rather than from a player being told they
were wrong when they weren't.

## The banner

The wordmark above the game is built from `citylayoutguessr/citylayoutguessr.png`,
which stays on your machine (it is 10 MB and gitignored). What the page loads
are four widths in `art/web/citylayoutguessr/`, and the browser picks whichever
one fits the screen. If you ever change the artwork, rebuild them with a few
lines of Pillow, resizing the original to 760, 1240, 1860 and 2480 pixels wide
and saving each as `logo-<width>.webp` at quality 74.

The banner is always exactly as wide as the map below it, and the map's size is
worked out from the banner's shape, so a logo with a different width-to-height
ratio needs one number changed in `styles.css` — search for `--board` and the
comment there explains it.

## Accounts, the scoreboard, and analytics

Sign-in and the daily leaderboard are off until you fill in
`citylayoutguessr/supabase-config.js`. `SUPABASE-SETUP.md`, next to this file,
walks through the whole thing: making the Supabase project, running
`supabase/schema.sql`, and creating the Google sign-in client. Nothing in the
game depends on it — with the config empty, the page never contacts Supabase
and plays exactly as it does now.

## Then publish

```
cd ~/Desktop/noahdarwinlee
git add -A && git commit -m "add game images" && git push
```
