# CHRONIA Developer Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Noah recolour and rename countries, move their names, and resize, rename, or hide cities over a span of dates, live for every visitor.

**Architecture:** Edits live in a Supabase table behind a new edge function (`chronia-edits`). `app.js` fetches the public list at startup without waiting for it, and applies edits through small hooks where it already decides a colour, name, city tier, or label place. A separate `dev.js`, loaded only when the tools open, is the editor.

**Tech Stack:** Plain ES5 JavaScript in the existing IIFE (`chronia/app.js`), Deno edge function, Postgres migration, and Playwright checks run with Node.

**Spec:** `docs/superpowers/specs/2026-11-05-chronia-dev-tools-design.md`

## Global Constraints

- Serial (Oxford) comma in all copy, docs, and commit messages; `|` between items in UI text, never `·` or round bullets (CLAUDE.md).
- Only `CHRONIA_REVIEW_PASSWORD` may save or delete; the team password (`CHRONIA_REPORT_PASSWORD`) may not. The password never passes through Claude; Noah types it.
- Kinds exactly: `country-colour`, `country-name`, `label`, `city-size`, `city-name`, `city-hide`.
- Dates as the reports store them, matching `TIME_RE = /^-?\d{1,4}(-\d{2}(-\d{2})?)?$/`; spans include both ends.
- `target`: 1–200 chars; `value` JSON under 2,000 bytes; `note` under 500 chars.
- `list` is public with `Cache-Control: public, max-age=30`.
- The first map never waits for the edits; a failed fetch leaves the map as it is today.
- `dev.js` is not loaded unless the tools open.
- Commit trailers: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_012Avzuihkj455vpXDy6biTG`. Before each push: `git fetch && git rebase origin/main`.
- Test server: `python3 -m http.server 8123` from the repo root (restart it if it has stopped); stub `wikipedia.org`, `supabase.co`, `accounts.google.com`, and `amazonaws.com` in Playwright.

## Review Focus

1. **Overlapping edits of one kind and target:** the one with the latest `updated_at` wins wherever they overlap; outside the overlap each applies. (Test in Task 2.)
2. **Dates across the page's eras:** an edit from `-500` to `-200`, one from `1815-01` to `1815-12`, and one from `1990-01-01` to `1991-12-31` apply exactly within their spans and not a day outside (BC years, months before 1886, and days after it use different time scales). (Test in Task 2.)
3. **A target that no longer exists** (a polity renamed in a rebuild, a typo'd city key) changes nothing on the map, throws nothing, and is listed by `editsNotFound()`. (Test in Task 2, panel display in Task 6.)
4. **The password stops working mid-session** (changed by Noah, or the tab's stored copy is wrong): a save gets 401, the map change is rolled back, and the panel asks for the password again rather than failing silently. (Test in Task 6.)
5. **A pinned name off the screen or behind the globe** is not drawn and doesn't block other names; a pinned name whose country isn't on the map at that date isn't drawn at all. (Test in Task 5.)

---

### Task 1: Table and edge function

**Files:**
- Create: `supabase/migrations/20261105_chronia_edits.sql`
- Create: `supabase/functions/chronia-edits/index.ts`
- Test: `tools/chronia-edits-api-check.mjs`

**Interfaces:**
- Produces: `POST https://kigvciyyjlgjcgnwgrwf.supabase.co/functions/v1/chronia-edits` with JSON `{ action, ... }`:
  - `list` → `200 { edits: Edit[] }`
  - `check { password }` → `200 { ok: true }` | `401 { error: "password" }` | `429 { error: "locked" }`
  - `save { password, edit: { id?, kind, target, from, to, value, note? } }` → `200 { edit: Edit }` | `400 { error: "field", field }`
  - `delete { password, id }` → `200 { ok: true }`
  - `Edit = { id: number, kind, target, from, to, value, note, updated_at }` (`from`/`to` are `date_from`/`date_to`).

- [ ] **Step 1: Write `tools/chronia-edits-api-check.mjs`**, run against the deployed function with `fetch` and the `Origin: https://chroniaatlas.com` header. Assertions: `list` without a password → 200 and `Array.isArray(body.edits)` and header `cache-control` contains `max-age=30`; `check` with password `"wrong-" + Date.now()` → 401; `save` with a wrong password → 401; `save` with a wrong password and `kind: "nope"` → 401 (the password is checked before the fields, so nothing leaks); an `OPTIONS` preflight from `https://evil.example` gets no `access-control-allow-origin` for that origin.
- [ ] **Step 2: Run it before deploying.** Run: `node tools/chronia-edits-api-check.mjs`. Expected: FAIL (404 from the functions host).
- [ ] **Step 3: Write the migration:** the table and columns from the spec's Storage table, with checks for each limit in Global Constraints, `kind in (...)`, `octet_length(value::text) < 2000`, an index on `(target)`, row-level security on, and `revoke all ... from anon, authenticated`. Apply with `mcp__Supabase__apply_migration` (name `chronia_edits`).
- [ ] **Step 4: Write the function** by copying `chronia-report`'s scaffolding (`ORIGINS`, `MAX_BODY`, `Bad`, `text`, `num`, `same`, `visitor`, `db`, `json`, strikes through `rpc/chronia_report_strike`). `list` is answered before any password logic. Every other action requires `same(password, CHRONIA_REVIEW_PASSWORD)` and counts strikes as the reports do. `save` validates the value by kind: `country-colour` `{c: 0–9}` or `{hex: /^#[0-9a-f]{6}$/i}`; `country-name`/`city-name` `{name: text 1–120}`; `label` `{lon: −180–180, lat: −90–90, size: null | 6–60, angle: null | −90–90}`; `city-size` `{tier: 1–4 integer}`; `city-hide` `{}`. It also requires `from` ≤ `to` comparing as dates (year, then month, then day; a missing month or day is the start for `from` and the end for `to`). With `id`, `PATCH` the row and set `updated_at = now()`; without it, insert.
- [ ] **Step 5: Deploy** with `mcp__Supabase__deploy_edge_function` (`verify_jwt: false`, as `chronia-report`).
- [ ] **Step 6: Run the check.** Run: `node tools/chronia-edits-api-check.mjs`. Expected: every line `ok`.
- [ ] **Step 7: Commit** the three files: "CHRONIA: a table and function for the developer tools' edits".

### Task 2: Loading edits and `editAt`

**Files:**
- Modify: `chronia/app.js` (new section beside the reports block, about line 4743; startup in `start()` near `whenIdle`; `window.__chronia`)
- Create: `tools/chronia-dev-check.mjs` (grows in later tasks)

**Interfaces:**
- Consumes: Task 1's `list`.
- Produces, inside the IIFE:
  - `var EDITS_URL` (the function's address)
  - `edits = { list: Edit[], byKey: Map<string, Edit[]>, tag: number }`, where the key is `kind + "|" + target`
  - `setEdits(list: Edit[]): void` rebuilds `byKey`, bumps `tag`, clears the level caches it affects, and calls `scheduleRender()`
  - `editTime(s: string, end: boolean): number` uses `parseTime` (line 3543) for the stored format; `end` moves to the end of the year or month or day
  - `editAt(kind: string, target: string, t: number): object|null` returns the `value` of the latest-`updated_at` edit whose span holds `t`
  - `editsNotFound(): Edit[]`, the edits whose target matches no polity name in `catalogue` (country kinds) or no city `id` (city kinds)
  - Test hooks on `window.__chronia`: `setEdits(list)`, `editAt(kind, target, t)`, `notFound()`, and `timeOf(s)` (= `parseTime`).

- [ ] **Step 1: Write the failing checks** in `tools/chronia-dev-check.mjs` (Playwright, with `chronia-edits` `list` stubbed to `{ edits: [] }`). Each check is `await p.evaluate(...)` then an assertion:
  - `editAt` with two overlapping `country-name` edits for `"French Empire"` (`1810`–`1812` updated `2026-11-01`, and `1811-06`–`1811-08` updated `2026-11-02`): at `timeOf("1811-07")` returns the second's value; at `timeOf("1810-03")` the first's; at `timeOf("1813-01")` `null`.
  - BC and day spans: an edit `-500` to `-200` applies at year −350 and not at −199; `1990-01-01` to `1991-12-31` applies at `timeOf("1991-12-31")` and not at `timeOf("1992-01-01")`.
  - `notFound()` lists a `country-colour` edit for `"Nowhere Kingdom"` and a `city-hide` edit for `"no-such-city"`, and not one for `"london"`.
  - With `list` stubbed to answer 500, the page still reaches `__chronia.ready()` and `pageerror` sees nothing.
  - The first map is ready no later with a `list` stub delayed by 5 s than with an instant one (difference under 1 s).
- [ ] **Step 2: Run.** Run: `node tools/chronia-dev-check.mjs`. Expected: FAIL (`setEdits` is not a function).
- [ ] **Step 3: Implement** the Interfaces above. Fetch `list` in `start()` after the first map's promise is created (not chained into it); on success call `setEdits(body.edits)`, on failure set `edits.failed = true` and `console.warn`.
- [ ] **Step 4: Run.** Run: `node tools/chronia-dev-check.mjs` and `node tools/chronia-page-check.mjs`. Expected: all `ok`, `page errors: none`.
- [ ] **Step 5: Commit:** "CHRONIA: load the developer tools' edits without holding up the map".

### Task 3: Country colour and name hooks

**Files:**
- Modify: `chronia/app.js`: `level()` (cache key `lk` takes in `edits.tag`; `colOf` and the groups use `polyColor(p)`), `readPalette()` (custom slots), `polityName()`, the card swatch (line ~5197), and `fillOf` (line ~5848)
- Modify: `tools/chronia-dev-check.mjs`

**Interfaces:**
- Consumes: `editAt`, `edits.tag` (Task 2).
- Produces:
  - `polyColor(p): number` gives `p.color`, or the edited palette index at `now`, or a custom slot `PALETTE + k`
  - `customSlot(hex: string): number` adds `hex` and its band colour to `pal.colors` and `pal.bands` once and returns the index
  - `bandFor(hex: string): string` keeps the hue and saturation of the nearest palette band colour (by hue) and that band's lightness
  - `polityName(id)` returns the edited name when a `country-name` edit for `catalogue[id][0]` holds at `now`
  - Hook on `window.__chronia`: `fillAt(lon, lat)`, the `[r, g, b]` of the map canvas at that point.

- [ ] **Step 1: Write the failing checks.** At `#y=1815-07&v=2.35,47.00,6.00`:
  - `setEdits([{ id: 1, kind: "country-colour", target: "Bourbon Kingdom of France", from: "1815", to: "1815", value: { c: 6 }, updated_at: "2026-11-05" }])`; after 500 ms, `fillAt(2.35, 47)` is within 40 (sum of channel differences) of the palette's `--ch-c6` blended as the page draws it. Take a reference by reading `fillAt` at a known c6 country, or compare against the value without the edit and assert it changed and moved toward c6.
  - The same with `{ hex: "#c0392b" }`: the fill's red channel exceeds green by 60 or more.
  - A `country-name` edit to `"Kingdom of France"`: the polity reported by the page's tooltip and card at that point (`__chronia` already reports `polityAt`) is named `"Kingdom of France"`, and search (`/` then typing `Kingdom of France`) lists it.
  - After `setEdits([])`, the fill and name are back to the originals.
  - With the time moved to `1816-07`, the edits no longer show.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the Interfaces. Levels are cached per snapshot by `lk`, so add `"|" + edits.tag` to `lk`. Because `level()` is per snapshot, take the edited colour at the snapshot's own time (`snap.year`, or the span's start day), not the slider's live value.
- [ ] **Step 4: Run** the dev check and the page check. Expected: all `ok`.
- [ ] **Step 5: Commit:** "CHRONIA: country colour and name edits".

### Task 4: City hooks

**Files:**
- Modify: `chronia/app.js`: `cityRanked(t)` (line ~2668), every `namedAt(c.steps, c.name, …)` call (lines ~2815, 3493, 5290, and 5526), and the search list builder
- Modify: `tools/chronia-dev-check.mjs`

**Interfaces:**
- Consumes: `editAt` (Task 2).
- Produces: `cityShownName(c, t): string`, the `city-name` edit or else `namedAt(c.steps, c.name, t)`. `cityRanked(t)` leaves out cities with a `city-hide` edit at `t`, and gives a `city-size` edit's `tier` in place of the rank tier. Its cache (`cityRank`) also keys on `edits.tag`.

- [ ] **Step 1: Write the failing checks** at `#y=1815-07&v=-0.13,51.51,20.00`, through `__chronia.cities()` (add a hook returning `[{ id, name, tier }]` of the shown cities if none exists):
  - A `city-size` edit `{ tier: 4 }` for `london` from `1815` to `1815`: London's tier is 4.
  - A `city-name` edit `{ name: "Lundenwic" }`: London's shown name is `"Lundenwic"`, and search finds it under both names.
  - A `city-hide` edit: London is absent from `cities()`.
  - Each is gone after `setEdits([])` and at `1816-07`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the Interfaces.
- [ ] **Step 4: Run** both checks. Expected: all `ok`.
- [ ] **Step 5: Commit:** "CHRONIA: city size, name, and hide edits".

### Task 5: Pinned name placement

**Files:**
- Modify: `chronia/app.js`: `layoutPolities` (line ~2456) and `drawPolityLabels`
- Modify: `tools/chronia-dev-check.mjs`

**Interfaces:**
- Consumes: `editAt` (Task 2), `polityName` (Task 3).
- Produces: in `layoutPolities`, before the main loop, for each polity on the map with a `label` edit at `now` whose point projects in front (`projectLL` with `p[2] >= 0.25`) and inside the view: an item built with the existing `glyphLayout` at the pin. The size is `value.size` or the size the layout gives it; the angle is `value.angle` in degrees or 0 on the flat map or level on the globe. Its boxes are pushed to `placed`, and the polity is added to `seen`. Hooks on `window.__chronia`: `labelBox(name)`, the centre `[x, y]` of a drawn name's boxes, or `null`.

- [ ] **Step 1: Write the failing checks** at `#y=1815-07&v=2.35,47.00,6.00`:
  - A `label` edit for `"Bourbon Kingdom of France"` at `{ lon: 0, lat: 45, size: 20, angle: null }`: `labelBox` is within 12 px of `project(0, 45)`.
  - With the pin moved to `{ lon: 120, lat: 45 }` (behind the globe), `labelBox` is `null` and no error is thrown.
  - A pin for a polity not on the map in 1815 (`"German Empire"`) draws nothing.
  - Another name's box doesn't overlap the pinned one (`overlaps` over all drawn boxes is false for pairs that include it).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the Interfaces.
- [ ] **Step 4: Run** both checks. Expected: all `ok`.
- [ ] **Step 5: Commit:** "CHRONIA: pinned name placement".

### Task 6: The editor (`dev.js`)

**Files:**
- Create: `chronia/dev.js`
- Modify: `chronia/app.js` (`openDev()`: the `#dev` hash part and Shift+D; `CHRONIA_DEV`), `chronia/app.css` (`.ch-dev` panel in the existing panel style), `chronia/index.html` (`<div id="dev" hidden></div>` mount), and `tools/build-chronia-site.mjs` (add `"dev.js"` to the chronia copy list)
- Modify: `tools/chronia-dev-check.mjs`

**Interfaces:**
- Consumes: everything above, and Task 1's `check`, `save`, and `delete`.
- Produces: `window.CHRONIA_DEV`, set by `app.js` before it loads `dev.js` with a `<script>`:
  - `now(): number`
  - `fmt(t): string` (the date box's format)
  - `parse(s): number|null` (`parseTime`)
  - `stretch(): [string, string]` (the current borders' first and last date in stored format)
  - `polityAt(x, y): { name } | null`
  - `cityAt(x, y): { id, name } | null`
  - `labelAt(x, y): { name } | null`
  - `lonLatAt(x, y)`
  - `edits(): Edit[]`
  - `setEdits(list)`
  - `notFound(): Edit[]`
  - `call(action, body): Promise<object>`, which posts to `EDITS_URL` and rejects with `{ status, error }`
  - `pick(mode: "country" | "city" | "label" | null)`, which makes map clicks and drags go to `dev.onPick(kind, info)` instead of the card.

  `dev.js` exports nothing; it builds the panel described in the spec's "The editor" section.

- [ ] **Step 1: Write the failing checks** (Playwright, function stubbed: `check` answers 200 only for password `"test-pass"`; `save` echoes the edit with an `id` and `updated_at`; one run makes `save` answer 401):
  - `dev.js` is not requested on a normal load. After `goto(...#dev)`, it is requested and a password box shows.
  - A wrong password shows an error and no tools. `"test-pass"` shows the panel, and a reload of the same tab doesn't ask again (`sessionStorage`).
  - With *Country* chosen, clicking France opens a form whose dates default to `stretch()`. Choosing swatch 6 and Save sends a `save` whose body has `kind: "country-colour"`, `target: "Bourbon Kingdom of France"`, and `value: { c: 6 }`. The map's fill changes before the stub answers.
  - When `save` answers 401, the fill goes back, the panel shows the password box again, and the message says the password was refused.
  - *In force now* lists the saved edit with its dates, uses `|` between its parts, and Delete (after the confirm) sends `delete` with its id and removes it from the map.
  - An edit for `"Nowhere Kingdom"` in the stubbed `list` is shown under *Not found*.
  - *Move name*: dragging France's name 80 px right and letting go opens a `label` form whose `lon` is greater than the name's original longitude.
  - Text typed into a name field is shown as text, never as HTML (a name of `<b>x</b>` appears literally).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `openDev()` and `CHRONIA_DEV` in `app.js`, and the panel in `dev.js`. Build every element with `textContent`. Saves are optimistic: apply them through `setEdits`, then reconcile with the server's row or roll back.
- [ ] **Step 4: Run** the dev check, the page check, and `node tools/build-chronia-site.mjs`, then confirm `chronia-site/dev.js` exists. Expected: all `ok`.
- [ ] **Step 5: Commit:** "CHRONIA: developer tools".

### Task 7: Docs, timing, and handover

**Files:**
- Modify: `chronia/README.md` (a *Developer tools* section: opening, the kinds, dates, storage, the function, and the checks)

- [ ] **Step 1: Time startup** with `/home/claude/t/perf.cjs` against the built site. Expected: ready time within 10% of the 1.8 s measured before, and `dev.js` not among the requests.
- [ ] **Step 2: Write the README section** and update the spec's status line to "Built".
- [ ] **Step 3: Run** `node tools/chronia-edits-api-check.mjs`, `node tools/chronia-dev-check.mjs`, and `node tools/chronia-page-check.mjs`. Expected: all `ok`.
- [ ] **Step 4: Commit and push:** "CHRONIA: developer tools in the README". Then tell Noah how to open the tools, and ask him to make one real edit and delete it, since only he has the password.
