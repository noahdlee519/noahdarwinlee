# Working on UCHRONIA

The README says what UCHRONIA does and how each part is built. This file is
about how to change it: the house rules, where things live, how to test a
change before calling it done, and what has gone wrong before. It is written
for any agent (or person) picking the project up mid-stream.

## Ground rules

These are Noah's standing preferences for the whole site, and UCHRONIA follows
them.

- **Plain prose.** Interface text, the README and commit messages are plain
  and specific, with no marketing register. The interface spells the British
  way ("colour", "kilometres") and uses the serial comma.
- **No code comments.** Comments were taken out of the site's HTML, CSS and JS
  in October 2026, and UCHRONIA's code has none. Explanations belong in the
  README, kept in step with the code. When behaviour changes, update the
  README's description of it in the same commit.
- **Small, anchored edits.** Change files with a short script that reads the
  file, checks that the text it is replacing occurs exactly once, and replaces
  it. Never retype a large file from memory or from truncated output:
  `app.js` is over 6,000 lines and `app.css` nearly 2,000.
- **Commits.** Short and declarative ("UCHRONIA: Chiemsee no longer in
  capitals"). Commit when a change is tested, then push it to `origin`
  yourself: Noah no longer syncs from Cursor. If the push is rejected because
  `origin` has moved on, `git pull --no-rebase`, check the merge, and push
  again. Never force-push.
- **Nothing destructive.** No `git checkout`, `reset`, `clean`, `stash`,
  `rebase`, or deleting branches. Don't delete files: move them into
  `_to_delete/` (ignored by git) and say so.
- **Other agents work here too.** A Cursor agent also edits UCHRONIA and
  merges from `origin/main`, sometimes while you are mid-task. It has
  committed half-finished work from the folder before. Before you start and
  before you commit, run `git status` and `git log -5`. Build on what is there
  rather than reverting it, and commit as soon as a change is tested so your
  work and theirs don't tangle.
- **Ask when unsure.** If a request could mean two things that lead to
  different work, ask before building. If it's clear, build it, then say what
  you assumed.

## Where things are

| Path | What it holds |
| --- | --- |
| `index.html` | The page. Its Content-Security-Policy allows the one inline script (the style and theme chooser in `<head>`) by its SHA-256 hash, so **editing that script means updating the hash** in the CSP, or the page breaks. `style-src` is `'self'`: no inline `<style>` or `style=""` in the HTML, though setting `element.style` from `app.js` works. |
| `app.css` | All styling. The three styles are switched by attributes on `<html>`: `data-uc-style="antique"`, and otherwise `data-theme="light"` or `"dark"`. Antique is the default unless `localStorage["uchronia-style"]` is `"plain"`. |
| `app.js` | The whole app, one function scope. The main entry points are listed below. |
| `sat.js` | The satellite layer, on its own canvas under the map. |
| `data/*.json` | Built offline by `tools/build-*.mjs` from Natural Earth, GeoNames and others (see the README's credits). |
| `tools/` | The data builders. **When data is wrong, fix the data and the builder**, so a rebuild doesn't bring the mistake back. |
| `../supabase/functions/historian/` | The server function behind the historian. It holds the Anthropic key and enforces the daily caps. It's deployed to Supabase project `kigvciyyjlgjcgnwgrwf` as `dynamic-endpoint`; changing it means redeploying, not just committing. |
| `../supabase/migrations/20261012_historian_usage.sql` | The historian's daily counter. |

### Entry points in `app.js`

Search for these by name; line numbers drift.

- **`init`**: builds the world from `provinces.json` and `cities.json`.
  **`setGeometry`** prepares the shapes, the arcs (`arcA`/`arcB` give the
  region on each side of an arc) and the region adjacency (`unitNeighbors`).
  It runs again when *Finer regions* is switched on, so anything derived from
  geometry belongs in it.
- **Colour:**
  - `colorAll` colours the default map; `freeColor` picks a colour for a new
    country.
  - Both go through `pickTone`. The ten palette colours are ordered round the
    colour wheel, so their distance is measured round the wheel (`wheelGap`).
  - Neighbours come from `countryLinks`, in two kinds: `touch` for a shared
    border, and `near` for land within `CLOSE_KM` (220 km) across water,
    found by `closeUnits` from coastline points.
  - A subject (colony, territory) shows its ruler's colour (`hueOf`). Colour
    decisions are therefore made per ruler, with the subjects' neighbours
    counted as the ruler's.
- **Check:** `findIssues` lists what to look at, including two countries with
  the same colour that border or sit close across water. `scheduleChecks`
  reruns it after edits.
- **Drawing:** `render` and `scheduleRender`. Rendering is the expensive part.
  Precompute in `setGeometry` or behind a cache rather than per frame.
- **Panning:**
  - `dragView` moves the map by the pointer's offset from where the drag
    began.
  - On release, `startInertia` glides on. The drag speed is measured from
    each event's own `timeStamp`, with an 8 ms floor and a ceiling of about
    2 px/ms. Measuring it by handler time once flung the map across the
    world after a stall.
- **Opening:**
  - A loading cover (`#load`) stays up until the map has settled (labels,
    rivers, terrain, at most 8 s). Then `reveal` takes it away.
  - In Antique, `reveal` calls `playIntro`: the map unrolls, then the bar and
    its rule pull down, then the controls and the hint appear.
  - It's all CSS, keyed on `uc-ready` and `uc-intro` on `<html>` and gated
    by `prefers-reduced-motion`.
  - `uc-ready` is also set on a load error and after 20 s, so the interface
    can never stay hidden.
- **Historian:** `HISTORIAN` is the function's URL. The page sends only the
  map's difference from ours and the visitor's note, and reads a stream of
  NDJSON events (`text`, `plan`, `end`, `error`). Keep it sending nothing
  else.

## The test handle

`window.__uchronia` is exposed for testing. The useful parts:

- `ready()`, `countries()`, `owner()`, and `fillOf(i)` (a country's fill
  colour).
- `issues()` (the Check list as text).
- `setView(lon, lat, zoom)` and `setFlat(on)`.
- `view`, `ui`, `makeDiff()`, `applyPlan(plan)`, `loadFine()`.
- `timeRender()` and `profile()`, for timing.
- `tour(i)` opens the tutorial at card `i`, `tourStep()` gives the card shown
  (`-1` when closed), and `tourBox()` the card's and the ring's boxes. The
  tutorial opens by itself on a first visit, so a test that doesn't want it
  sets `localStorage["uchronia-tour"] = "done"` in its init script.

Use it to measure rather than guess. Examples:

- Two countries' colours: `fillOf` on each.
- Whether a fix removed a Check item: `issues()`.
- How far a drag moved the map: `view.lon` before and after.

## Testing a change

1. **Syntax:** run `node --check app.js` after every edit to it.
2. **Serve a copy.** Copy the site (or at least `uchronia/`, `styles.css`,
   `fonts/` and the data) somewhere, and run `python3 -m http.server`. Test
   against that, never the live site.
3. **Drive it with Playwright** (headless Chromium). Then:
   - Wait for `document.documentElement.classList.contains("uc-ready")` and
     `__uchronia.ready()`.
   - Set `localStorage["uchronia-style"] = "plain"` in an init script to skip
     the Antique intro when you aren't testing it.
   - Collect `pageerror` and console errors. Network errors for data that
     isn't in your copy are expected; anything else isn't.
4. **Check the variants** your change could touch:
   - all three styles;
   - a phone width (390×844, `isMobile`, `hasTouch`); below 641 px the bar
     becomes a bottom sheet;
   - reduced motion;
   - the globe and the flat map;
   - *Finer regions*.
5. **Compare before and after.** For behaviour changes, run the old and the
   new versions side by side and print the same measurement from both. A
   number ("the old version swung 143°, the new one 48°") beats "it looks
   better".
6. **Animations:**
   - Record video (`recordVideo`), cut frames with `ffmpeg -vf fps=8`, and
     tile them into a contact sheet to check the order of events.
   - Single screenshots are too slow to time anything.
   - Headless Chromium has no GPU, so motion looks choppier than on a real
     machine.
7. **Lag and stalls:**
   - Dispatch synthetic `PointerEvent`s whose `timeStamp` is overridden
     (`Object.defineProperty(e, "timeStamp", { value: t })`).
   - Busy-wait between them to imitate a frozen main thread.
   - Playwright's own `mouse.move` waits for each event, so it can't produce
     a backlog.
8. **Show Noah the result**: a screenshot, a GIF, or the before-and-after
   numbers, along with what you assumed.

## Lessons from past changes

- **Look for the cause before the patch.**
  - A label in capitals (Chiemsee) was the data, not the renderer. Both the
    data and `build-lakes.mjs` were fixed.
  - The map flying off after a hitch was mis-measured speed, not a bad pan.
- **A `position: fixed` element inside a transformed parent** is placed
  against that parent, not the window. During the bar's pull-down, the hint
  (fixed to the bottom of the window) showed up near the top. Hide such
  things until the transform is gone.
- **Changing an element's `animation` list restarts its animations.**
  Removing a class that overrode the bar's ruled line made the line draw
  itself again. Settle it with a lasting class (`is-ruled-still`) instead.
- **Hidden-until-ready needs an exit.** Anything the intro hides must come
  back on error and after a timeout.
- **Colour rules work at the ruler's level.** Colouring subjects
  independently made Puerto Rico match the Dominican Republic, and the UK's
  bases on Cyprus match Northern Cyprus.
- **The palette is a wheel.** Colour 0 and colour 9 are neighbours.
- **Keep geometry work out of the frame loop.** `closeUnits` runs once per
  geometry, from a grid of coastline points.

## Before you finish

- [ ] `node --check app.js` passes.
- [ ] The page loads with no errors in all three styles, at desktop and phone
      widths.
- [ ] The change is measured against the old behaviour where that applies.
- [ ] The README describes the new behaviour.
- [ ] `git status` shows only your files. You've checked `git log` for
      someone else's commits.
- [ ] Committed with a short message and pushed. If the change touches
      `../supabase/functions/historian/`, Noah has been told to redeploy it.
