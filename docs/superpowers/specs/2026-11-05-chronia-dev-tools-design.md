# CHRONIA developer tools: design

5 November 2026. Approved in conversation with Noah; this is the written spec for his review.

## Purpose

Noah wants to correct CHRONIA's map himself, without asking for a code change or a data rebuild: recolour a
country, rename it, move where its name sits, and make a city larger or smaller, rename it, or hide it, each
from one date to another. An edit goes live for every visitor as soon as it is saved, and deleting it brings
back the map as the data draws it.

What Noah said:

- The edits he wants: country colour, city size, name placement, and city renaming ("etc.").
- Each applies "from a time period to another".
- Edits are live once saved (chosen over drafts with a Publish step, and over exporting a file).
- First version: countries (colour, name), cities (size, rename, hide), and moving a name's placement.
  Adding new cities is left out.

Assumed, and accepted with the design:

- Only Noah's reviewer password (`CHRONIA_REVIEW_PASSWORD`) opens the tools; the fact checkers' team
  password does not.
- The edits are a layer applied while the map is drawn; the data files are never changed.

Success: Noah can open the tools on chroniaatlas.com, make each kind of edit for a span of dates, see it on
the map at once, see it from another browser without the password, and delete it to undo it. Visitors who
never open the tools download nothing extra apart from the list of edits, and the map works as it does today
when that list can't be fetched.

## Not in this version

- Adding cities, editing borders, and changing a country's card text other than its name.
- Drafts, history, or more than one editor.
- Baking the edits into the data files at build time (possible later if the list grows to thousands).

## Opening the tools

- The tools open from `#dev` in the address (kept alongside the other hash parts) or Shift+D, on
  chroniaatlas.com and on a local server.
- They ask for the reviewer password, which is checked with the edge function (`check`). The password is kept
  in `sessionStorage` for the tab, so a reload doesn't ask again, and is sent with every save and delete.
- A wrong password says so; after twenty wrong tries in a day the visitor is shut out until the next day, as
  with the reports (the same strike table).

## Storage

A new table, `public.chronia_edits` (migration `supabase/migrations/20261105_chronia_edits.sql`):

| column | type | meaning |
|---|---|---|
| `id` | bigint identity | |
| `kind` | text | `country-colour`, `country-name`, `label`, `city-size`, `city-name`, or `city-hide` |
| `target` | text, 1–200 chars | the polity's name as in `eras.json` (unique among its 3,818), or the city's key (`london`) |
| `date_from` | text | as the reports store dates: `1815`, `1815-07`, or `1815-07-03`, with `-` for years BC |
| `date_to` | text | the same; the span includes both ends |
| `value` | jsonb, under 2 KB | the change (below) |
| `note` | text, under 500 chars | optional, Noah's own reminder |
| `created_at`, `updated_at` | timestamptz | |

Row-level security is on, and `anon` and `authenticated` have no rights, as for the reports.

Values by kind:

- `country-colour`: `{ "c": 0–9 }` for one of the ten palette colours, or `{ "hex": "#rrggbb" }` for any
  colour, whose darker coastal band colour the page works out (the hue and saturation of the nearest palette
  band colour, at the lightness the palette's bands have).
- `country-name`: `{ "name": "…" }`, shown on the map and on the country's card. The card's links to
  Wikipedia keep the polity's own article.
- `label`: `{ "lon": …, "lat": …, "size": px or null, "angle": degrees or null }`. Null size or angle leaves
  the layout's own choice.
- `city-size`: `{ "tier": 1–4 }`, where 1 is the largest mark and 4 the smallest (the page's own tiers).
- `city-name`: `{ "name": "…" }`.
- `city-hide`: `{}`.

## Edge function

A new function, `supabase/functions/chronia-edits/index.ts`, beside `chronia-report`, with the same allowed
origins, body limit, and password check:

- `list` (no password): every edit, as `{ edits: [...] }`, with `Cache-Control: public, max-age=30`.
- `save` (password, edit with or without `id`): checks the kind, the dates (`TIME_RE`, from not after to), the
  target's length, and the value's shape for its kind; inserts or updates; returns the row.
- `delete` (password, `id`): deletes the row.

The function uses the project's secret key, as `chronia-report` does. It is deployed with Supabase's tools from
this session, and needs no new secrets.

## The page

### Loading and applying the edits (`app.js`)

- At startup the page asks for `list` alongside the map data but doesn't wait for it: the first map is drawn
  without edits, and redrawn when they arrive. A failed fetch is logged and ignored.
- The edits are kept in an `edits` object indexed by kind and target. `editAt(kind, target, t)` returns the
  value in force at time `t` (the latest-saved edit when two overlap), comparing in the page's decimal-year time
  (`dayOfTime` and its kin, as the timeline does).
- Hooks, each a line or two where the page already decides the thing:
  - **Colour:** where a span's palette index becomes a fill (`level`, the key, the card swatch), a
    `country-colour` edit gives its index, or a custom colour carried in a small extra palette after the ten
    (`pal.colors[10+]`, `pal.bands[10+]`), so the level's groups and bands work unchanged. A level is built per
    snapshot, so its cache key takes in the edits' version (`editsTag`), and saving or deleting an edit bumps it.
  - **Country name:** `polityName(id)` returns the edited name when one is in force at the date shown.
  - **Name placement:** `layoutPolities` places a `label` edit's name first, at the projected point, at its
    size and angle (or those the layout would choose), and adds its boxes to `placed`, so other names avoid it.
    It is skipped when the point is off the screen or behind the globe.
  - **Cities:** `cityRanked(t)` gives an edited tier in place of the population rank, leaves out hidden cities,
    and the city's shown name and search name take a `city-name` edit.
- Search finds countries and cities under their edited names as well as their own.

### The editor (`dev.js`)

- A new file, `chronia/dev.js`, is loaded only when the tools open; `tools/build-chronia-site.mjs` copies it.
  It talks to `app.js` through a small object `app.js` hands it (`CHRONIA_DEV`): the current time, picking a
  country or city at a screen point, projecting a point, the edits, and `refresh()` after a change.
- The panel sits at the right, in CHRONIA's panel style, and uses | rather than dots between items. It has:
  - **Tools:** *Country*, *City*, and *Move name*. With *Country* or *City*, a click on the map picks one and
    opens its form instead of its card. With *Move name*, dragging a country's name moves it; letting go opens the
    form with the new place filled in.
  - **Forms:** the target's name, the fields for its kinds (the ten palette swatches and a colour box; a name; a
    size of 1 to 4 and a hide box), and the from and to dates. The dates are typed as the date box takes them
    ("1815", "July 1815", "3 March 1815"), and default to the stretch the borders shown cover (from their change
    to the next). Save and Cancel.
  - **In force now:** the edits that apply at the date shown, each with its target, kind, dates, and Edit and
    Delete. Delete asks once.
- A save shows the change at once (the page applies it before the server answers) and puts it back if the save
  fails, with the server's reason in the panel.

## Errors

- No password or a wrong one: the tools don't open; the panel says why.
- A save the server refuses (bad dates, a value of the wrong shape, an expired password): the panel shows the
  reason, and the map goes back to what it showed.
- An edit whose target no longer exists (a polity renamed in a rebuild): it does nothing on the map, and the
  panel lists it under *Not found* so it can be fixed or deleted.
- The list of edits can't be fetched: the map shows no edits, and the tools say the edits couldn't be loaded.

## Testing

- `tools/chronia-dev-check.mjs`: a headless check with the edge function stubbed (Playwright `route`) that, for
  each kind, saves an edit, checks the map (the fill colour at a point inside the country, the name the page
  reports there, the city's tier and name through `window.__chronia`, the label's box at its pin), moves the date
  outside the edit's span and checks it is gone, deletes it and checks the map is as before, and checks the page
  still draws when `list` fails.
- The function's checks run against the deployed function with a wrong password (refused), a bad edit
  (refused), and a list without a password (allowed). Noah tries a real save himself, since the password is
  his.
- `tools/chronia-page-check.mjs` keeps passing, and startup is timed as before to make sure the edits' fetch
  doesn't hold up the first map.

## Files

- New: `supabase/migrations/20261105_chronia_edits.sql`, `supabase/functions/chronia-edits/index.ts`,
  `chronia/dev.js`, `tools/chronia-dev-check.mjs`.
- Changed: `chronia/app.js` (loading, `editAt`, the hooks, `CHRONIA_DEV`), `chronia/app.css` (the panel),
  `chronia/index.html` (the panel's mount), `tools/build-chronia-site.mjs` (copy `dev.js`), and
  `chronia/README.md` (a *Developer tools* section).
