---
target: UCHRONIA Antique style and its GUI
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/home/user/noahdarwinlee/uchronia/index.html"
target_fingerprint: "sha256:c4aab555fe4520158fcceb3f488bc1a1b8f85cb304d63e6c90b0b1f146763c2f"
target_path: /home/user/noahdarwinlee/uchronia/index.html
timestamp: 2026-10-11T22-32-46Z
slug: uchronia-index-html
---
Method: dual-agent (A: a1fe196257cae4c6e · B: aec6efd1abdc2db11)

Target: UCHRONIA in the Antique style (uchronia/index.html, app.css, app.js), desktop 1440x900 and phone 390x844. Scores are for the build the agents saw, before this round's fixes; the fixes are listed at the end.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Hover tip and paint preview are clear; the hint has no live region, so selection facts are never announced |
| 2 | Match System / Real World | 3 | Real 1800s technique; but two land tints were nearly the sea colour, so Russia, Canada and Australia read as water |
| 3 | User Control and Freedom | 4 | Named undo steps, Start over undoable, Escape closes menus |
| 4 | Consistency and Standards | 2 | Two different "Regions" buttons in Paint mode; swatches showed the wash, the map shows the band; map buttons in a different typeface |
| 5 | Error Prevention | 3 | Cities now picked before they move; Dissolve styled like a harmless link |
| 6 | Recognition Rather Than Recall | 2 | Alt-click and Shift-drag live only in a hint that changes; shortcuts only in tooltips |
| 7 | Flexibility and Efficiency | 3 | Keys for tools, flat map, satellite and hiding the interface; none for paint modes or colours |
| 8 | Aesthetic and Minimalist Design | 3 | Strong at large scale; water lining and bands swamped the small phone globe |
| 9 | Error Recovery | 3 | Failed loads toast and fall back; nothing destructive is unrecoverable |
| 10 | Help and Documentation | 2 | About popover only; no on-map key to marks or gestures |
| **Total** | | **28/40** | **Good** |

## Design Specificity Verdict

**LLM assessment**: authored for this product, not a sepia filter. Country names are set letter by letter along arcs; each country has a wash plus a deeper band clipped inside its borders; coasts carry water lining; capitals, cities and towns have distinct period marks; a double neatline frames globe and sheet; the scale bar is chequered and spells out "kilometres". At flat zoom 14 it reads as an atlas sheet. The interface around the map was thinner than the map: flat cards without grain, sans-serif zoom buttons, and a site name that on phones looked like a map label.

**Deterministic scan**: `detect --json uchronia/index.html` exited 2 with 6 warnings, all at line 0. Real: `layout-transition` on the phone sheet's `max-height` (low; reduced motion handled). False positives: `#fff on #fff` contrast and `#e68019` glow (the scan mixed in the main site's orange tokens from ../styles.css), `tight-leading` (the site-wide print rule), `clipped-overflow` on `body.uc-page` (the page is meant not to scroll) and on the phone `aside.uc-panel`. The scan never applies Antique. Not flagged but real: `.uc-controls` animates `bottom`.

**Visual overlays**: injected in a headless browser only, so nothing is visible in the user's browser. Console: desktop, 2 findings (`clipped-overflow` on `.uc-context`, really clipping focus rings; `dark-glow` on `#hint`, which is a deliberate parchment halo); phone, 4 (parchment halos on name and back link, the sheet's `max-height` transition twice). The overlay's 1.5:1 bar contrast was measured against the canvas behind the opaque bar; real pixels are 7.7–10.3:1. Its real catch: `.uc-adv-note` at 4.27:1.

## Overall Impression

The map is the product's strongest asset and is genuinely period-correct. The weak points were where the map met the interface: colours that confused land with sea, ornament tuned for a large map drawn at full weight on a small one, and controls that fell below contrast and focus minimums.

## What's Working

1. Cartographic craft: curved, letterspaced names; wash-and-band colouring clipped to each country; italic sea names in three tiers.
2. Aging pinned to the geography (stains, foxing, gore seams, sheet folds) that turns and pans with the map and fades as you zoom.
3. Forgiving editing: live paint preview in the tooltip ("Russia / Novosibirsk / to Germany"), named undo steps, undoable Start over.

## Priority Issues

1. **[P1] Land read as sea**
   - Why it matters: telling land from water is a map's first job.
   - Fix: the c7 and c8 tints were 6.8 and 7.1 ΔE from the sea, and they cover over a third of all land, including Russia, Canada, Australia, India, Greenland, Mexico and Brazil. Replace the teal tint and darken the sea so that every land tint is at least 12 ΔE from it.
   - Suggested command: /impeccable colorize
2. **[P1] Ornament overwhelmed small maps**
   - Why it matters: rings and bands buried the coastlines being edited, and islands looked like foxing or city marks.
   - Fix: the water lining was always 4 rings at least 1.7 px apart, and the bands never thinner than 2.2 px. Scale both down with map size, and skip lining on specks.
   - Suggested command: /impeccable quieter
3. **[P1] Focus and contrast below minimums**
   - Why it matters: keyboard users lost their place, and text failed WCAG AA.
   - Fix: muted text measured 4.0–4.3:1 and sea names 3.8:1. Several states could not be seen:
     - the focused name field;
     - a focused swatch, which looked the same as the selected one;
     - menu items, whose focus showed only as a 1.15:1 tint;
     - Regions/Finer, whose focus ring was clipped;
     - the colour input and the country picker.
   - Suggested command: /impeccable harden
4. **[P2] Labels clashed with the interface or went missing**
   - Why it matters: an atlas must name its countries, and the interface must not cover them.
   - Fix: the scale bar printed over NIGER, the phone site name over ARCTIC OCEAN, and the map controls over SWEDEN. On the Antique flat map at zoom 4, Germany, Poland and Italy were unnamed while Light named them. Reserve space for these elements before names are placed, and let small names tighten instead of dropping out.
   - Suggested command: /impeccable layout
5. **[P2] Paint mode spoke twice, and the swatches did not match the map**
   - Why it matters: one word for two jobs, and a colour chosen from a swatch looks different on the map.
   - Fix: two segmented controls both started with "Regions", and the swatches showed only the pale wash. Show the inner-border control only in Select, and draw the band in each swatch.
   - Suggested command: /impeccable clarify

## Persona Red Flags

**Alex (Power User)**: shortcuts appear only in tooltips. There are no keys for paint modes, swatches or New country. Desktop swatches were 17 px with 5 px gaps, below the 24 px target spacing.

**Sam (Keyboard and screen reader)**:
- Nothing on the canvas can be selected or painted by keyboard.
- The country picker appears only after a country is selected.
- `#hint` has no live region.
- The selection line differs from borders mostly by hue (1.45:1).
- Focusing About adds 5 tooltip links to the tab order before the tools.

**Casey (Phone)**:
- Seas filled with rings.
- With the sheet open, the controls rose to the top and covered SWEDEN.
- Swatches were 22 px, link buttons 18.9 px tall.
- The title and subtitle take a quarter of the open sheet.
- On the flat map at zoom 1, ocean names printed across the continents.

## Minor Observations

- The "←" in the back link is not in Old Standard TT and falls back to another serif.
- The map controls overlap the flat sheet's frame at zoom 1.
- Dissolve is styled exactly like "Paint with it".
- The country row offers 18 targets at once.
- The site name and the app title compete as two wordmarks on desktop.

## Questions to Consider

- Should the aging fade while painting and return when you stop, like varnish over a finished sheet?
- Many 1850s atlases left the sea as plain paper with water lining. Would an uncoloured sea free all ten tints for land?
- Where is the title cartouche? A user-named map exported as a print would give the visit an ending.

## Resolved in this round (after the assessment)

- **P1 land/sea**:
  - The sea is now #b4c8c4.
  - The eighth tint is violet #c9c3e3, with band #5b5aa0.
  - Every land tint is at least 13.3 ΔE from the sea (was 6.8).
- **P1 ornament**:
  - Water lining uses 2 rings below map scale 250 and 3 below 450. The ring spacing scales with the map.
  - Islands under 4 px get no lining.
  - Bands thin to 1.3 px on the phone globe and keep their old width from the desktop globe up.
  - Ocean names are hidden on maps too small for them.
- **P1 focus/contrast**:
  - Muted text is now 0.74 alpha (about 5:1 on the grain); sea names are 0.9 alpha (4.9:1).
  - The name fields get a 2 px underline on focus.
  - The selected swatch gets a ring; a focused swatch gets a dotted outline.
  - Menu items get an inset outline on focus.
  - `.uc-context` clips only sideways.
  - The colour input and country picker show focus on their wrappers.
  - The canvas focus ring stays off, as the user asked earlier.
- **P2 labels**:
  - Names and cities keep clear of the scale bar, the map buttons and, on phones, the site name.
  - On phones the name and back link sit in a parchment title block with a double rule. The lifted controls and the toast move below it.
  - The Antique hint is opaque.
  - Antique names below the 8.5 px floor set at 0.1 em spacing instead of 0.22 em, and so a little larger, rather than being dropped. Germany, Poland, Italy and Norway are named again.
- **P2 paint**:
  - Inner borders appear only in Select.
  - Swatches carry the band ring in Antique, and colour names as labels.
- **Personas**:
  - Swatches are 19 px on desktop (24 px pitch) and 26 px on phones.
  - Link buttons, menu items, View rows and the View summary are at least 24 px tall on phones.
  - The map buttons use Old Standard TT.
  - Grain is on the menus, buttons, tip and toast.
- **Not changed**:
  - keyboard painting;
  - hint live region;
  - paint-mode shortcuts;
  - About tab order;
  - the back-link arrow glyph;
  - Dissolve styling;
  - controls over the sheet frame;
  - the three questions above.
