# Layout Guesser — how to add pictures and answers

Three folders matter:

| Where | What's in it |
|---|---|
| `game/easy maps/`, `game/medium maps/`, `game/hard maps/` | Your full-size screenshots. This is where you work. |
| `game/cities.json` | The answers. 100 cities are already written for you. |
| `art/game/` | The small copies the website actually loads. Built for you — don't edit by hand. |

They are joined by one thing: **the `id`**. A screenshot saved as `paris.png`
becomes the round whose answer is the entry with `"id": "paris"`. That is the
whole system. There is no list of images to maintain.

**The loop is: drop screenshots in, run one command.**

```
cd ~/Desktop/noahdarwinlee
bash game/build-images.sh
```

That writes two files per screenshot into `art/game/`: a 1400px one at about
300 KB, which is the one the round loads, and a full-size `@2x` one, which is
only fetched if a player uses the magnifier. It only touches what has changed,
so running it again is cheap (`FORCE=1 bash game/build-images.sh` rebuilds
everything). Your originals are never modified, and they are gitignored — the
repo only ever carries the built copies. Your 32 easy screenshots were 171 MB;
what the site serves is 9.6 MB, plus 16 MB of magnifier files nobody downloads
unless they zoom.

It also writes `art/game/images.json`, the list of cities that have a picture.
The page reads it so it knows what exists without asking the server. Don't edit
it by hand — and if you ever add an image without running the build, the game
won't see it.

**A city with no picture never appears in the game.** So the game is never
broken and never half-finished — it only ever shows rounds it can draw. Add
one picture and one city is in play. Add forty and forty are.

The **mixed** button draws its ten from all three levels at once, so it works
as soon as any ten pictures exist anywhere.

While a game is running, **change level** in the bar above the picture (or the
Escape key) takes you back to the four buttons. Clicking the picture opens a
magnifier that follows the pointer; click again to put it away.

---

## The normal case: a city that's already in the list

Say you want Chicago in the game. Chicago is already in `cities.json` with
`"id": "chicago"`.

1. Take your screenshot.
2. Save it as `chicago.png` in `game/easy maps/`. `.jpg`, `.webp` and `.tif`
   work too — whatever your screenshot tool gives you.
3. Run `bash game/build-images.sh`.
4. That's it. Reload `/game/` and Chicago can now come up in **easy**.

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

Then save the picture as `st-louis.png` in `game/medium maps/`, run
`bash game/build-images.sh`, and you're done. If a file's folder disagrees
with its `tier` in `cities.json`, the build script says so.

---

## Taking the screenshots

The credit line on the page reads "Satellite imagery from Google Earth", so
take these from Google Earth or Google Maps satellite view. Note that
Google's Geo Guidelines say satellite imagery may not be used for gaming;
attribution doesn't change that. Your call — but if you'd rather not, an
OpenStreetMap-based map is the clean alternative, and the only thing to
change is the `"credit"` line.

- **Zoom level:** far enough out that you see the shape of the whole
  built-up area, not individual buildings. The street grid should read as
  texture, not as streets. Roughly a 10–30 km frame.
- **Crop:** square-ish. The page gives the image a tall column, so a square
  or slightly landscape crop sits best.
- **Size:** screenshot as large as you can. `build-images.sh` handles the
  resizing, and the bigger your original, the further the in-game magnifier
  can zoom before it goes soft. Your 2000px screenshots give a 3x magnifier on
  an ordinary screen and 1.5x on a Retina one; 3000px or more would double
  that. It never upscales, so a small screenshot just means a weaker loupe.
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
