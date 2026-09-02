# Layout Guesser — how to add pictures and answers

aspect ratios for all maps are 1000 pixels by 700 pixels

| Where | What's in it |
|---|---|
| `game/maps/` | Your full-size screenshots. This is where you work, and it decides what's in the game. |
| `game/cities.json` | The answers, one entry per picture. |
| `art/game/` | The built copies the website loads. Don't edit by hand. |

**The folder is in charge.** Drop `helsinki.png` into `game/maps/`, run the
build, and Helsinki is in the game — if `cities.json` doesn't know that name,
an entry is written for it and the build tells you so you can fill in its level,
country, continent and aliases. You never have to make a filename match a list.

```
cd ~/Desktop/noahdarwinlee
bash game/build-images.sh
```

That writes two files per screenshot into `art/game/`:

- `<city>.webp` — 1200px, about 200 KB. This is what a round loads. WebP
  because every browser can read it.
- `<city>@2x.avif` — full size, about 290 KB. Only fetched if a player uses the
  magnifier. AVIF because it's roughly a third smaller than WebP for the same
  picture; a browser too old for AVIF just keeps the WebP and gets a slightly
  softer magnifier rather than a hole.

It only touches what has changed (`FORCE=1 bash game/build-images.sh` rebuilds
everything). Your originals are never modified and are gitignored — the repo
carries only the built copies. Sizes are tuned at the top of the script if you
ever want to trade weight for quality.

It also writes `art/game/images.json`, the list of cities that have a picture.
The page reads it so it knows what exists without asking the server. If you add
an image without running the build, the game won't see it.

## The six buttons

| Button | Draws from |
|---|---|
| easy / medium / hard | that `tier` in `cities.json` |
| europe | every city whose `continent` is `Europe` |
| north america | every city whose `continent` is `North America` |
| mixed | everything |

Each takes ten at random from its set. To add another region, copy the europe
line in the `tiers` block at the top of `cities.json` and change the label and
continent; the button appears by itself. Continents in use are Europe, North
America, South America, Asia, Africa and Oceania. North America is the
geographic one — Canada down through Panama, plus the Caribbean.

While a game is running, **change level** in the bar above the picture (or the
Escape key) takes you back to the buttons. Clicking the picture opens a
magnifier that follows the pointer; click again to put it away.

---

## The normal case: a city that's already in the list

1. Take your screenshot.
2. Save it in `game/maps/` named after the city — lowercase, hyphens, no
   spaces: `chicago.png`, `new-orleans.png`, `quebec-city.png`. `.jpg`,
   `.webp` and `.tif` work too.
3. Run `bash game/build-images.sh`.
4. Reload `/game/`. If the name was already in `cities.json` you're done. If it
   wasn't, the build says so and drops a new entry at the bottom of the `hard`
   list with the country, continent and aliases left blank — fill those in.

To see every id you can use, run the checker (below) or open `cities.json`
and read the `"id"` values. They're all lowercase with hyphens:
`new-york`, `hong-kong`, `mexico-city`, `salt-lake-city`, `addis-ababa`.

## The other case: a city that isn't in the list

Open `game/cities.json` and copy any line in `"cities"`, then edit it:

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
the `"credit"` line at the top of `game/cities.json`.

## Check your work

```
cd ~/Desktop/noahdarwinlee
bash game/check.sh
```

It tells you how many pictures each level has, which files don't match any
city (a typo in a filename), and whether `cities.json` is valid. A level
needs **at least 10 pictures** to fill a full game.

It also checks every answer against every other answer in the same level and
warns you if two cities would accept the same guess — so if you add an alias
that's too loose, you find out here rather than from a player being told they
were wrong when they weren't.

## Then publish

```
cd ~/Desktop/noahdarwinlee
git add -A && git commit -m "add game images" && git push
```
