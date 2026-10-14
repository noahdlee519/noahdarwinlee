---
target: the UCHRONIA interface, all styles
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/home/user/noahdarwinlee/uchronia/index.html"
target_fingerprint: "sha256:fce322b5ebc7e0cf33ce30c31fcaf6b82441d72886facdebb3ae24d8c4fcd843"
target_path: /home/user/noahdarwinlee/uchronia/index.html
timestamp: 2026-10-12T04-06-38Z
slug: uchronia-index-html
---
Method: dual-agent (A: design review · B: detector and browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | With a country selected the desktop hint gave statistics, not the next step |
| 2 | Match System / Real World | 3 | "Paint" vs "Draw" and "Inner borders: Regions / Finer" read as jargon |
| 3 | User Control and Freedom | 3 | Undo everywhere; the about note could not be closed with its own button |
| 4 | Consistency and Standards | 2 | Paint offers Regions / Whole countries / Unclaimed, Draw offers Country / Unclaimed; feedback at the top (toasts) and the bottom (hint) |
| 5 | Error Prevention | 2 | Antique hid Berlin, and the Cities tool then founded a duplicate on top of it |
| 6 | Recognition Rather Than Recall | 2 | Alt-click, Shift-drag and the letter keys lived only in tooltips |
| 7 | Flexibility and Efficiency | 3 | Good shortcuts, no list of them; no keyboard path for editing |
| 8 | Aesthetic and Minimalist Design | 3 | Calm map; the second row is crowded (18 controls for a selected country) |
| 9 | Error Recovery | 3 | Check flies to a problem but does not say how to fix it |
| 10 | Help and Documentation | 2 | The about note was credits, not help |
| **Total** | | **26/40** | **Acceptable** |

## Design Specificity Verdict

LLM assessment: Antique is authored for this product (curved spaced names, water lining, two-tone sea, framed sheet, parchment bar and menus). Light and Dark are clean but interchangeable with the rest of the site; Dark's sea is the page's own black, so the globe's edge is a 1px rim. The site's header (Noah Darwin Lee / back, 22px) outranks the UCHRONIA title (20px).

Deterministic scan: `detect --json uchronia/index.html` found 6 warnings, none tied to a line. low-contrast (#fff on #fff) mixes Dark and Light tokens: false positive. layout-transition on the phone sheet's max-height: real, minor. tight-leading on the single-line site name: false positive. clipped-overflow ×2 on body and the panel: deliberate for a full-screen app. dark-glow on the hint and site-name halos: knockout halos for legibility, false positive.

Visual overlays: injection worked in five states. Light and Dark were clean; Antique flagged the hint halo, and drew low-contrast badges over the grain (measured 11.18:1 for ink, 5.34:1 muted; about 4.5:1 over the densest grain). The phone sheet flagged the max-height transition.

## Overall Impression

A calm, well-recovering editor whose Antique style has real character. The weak points are the mode model (Paint vs Draw), help that was only credits, and a few traps: a hidden capital that invites a duplicate city, a note that would not close, and a Check badge that rose the moment a country was founded.

## What's Working

- Recovery: every destructive action is one click with an Undo toast, plus full undo and redo and Escape.
- The context pane follows tool and selection, and Check flies to an item and selects it.
- City marks and type are coherent in every style.

## Priority Issues

- **[P1] A capital hidden by a country name, and the Cities tool founding a duplicate on it.** Fixed: capitals keep their mark when the name has no room; the Cities tool picks a city that is not drawn instead of founding one.
- **[P1] Paint vs Draw blurs the mode model.** Both read as drawing tools, and Paint mixes how much land with who receives it. Open: rename or merge (/impeccable clarify, /impeccable shape).
- **[P1] Editing needs a pointer.** The canvas turns and zooms by keyboard only; there is no keyboard way to pick a country or paint. Open (/impeccable harden).
- **[P2] Help was credits only; the about note would not close; shortcuts hidden.** Fixed: a second click closes it, and it lists the keys. The hint now teaches B for a selected country.
- **[P2] Check rose mid-task, in alarm red.** Fixed: a country just founded is left out until it is let go; the badge is ink, not red.
- **[P2] Phone targets under 44px.** Fixed for map buttons, tools, the about button, menus and link buttons; swatches stay 26px.

## Persona Red Flags

- Jordan: Paint/Draw labels, Alt-click, "Inner borders: Regions/Finer", no fix hint for "Has no capital".
- Alex: shortcuts only in titles (now listed in the about note), no multi-select, Check has no fix action.
- Sam: no keyboard editing; disabled Finer kept aria-pressed="true" (fixed); disabled Finer contrast 2.2–3.7:1 (exempt).
- Casey: controls 38px (fixed), swatches only in the open sheet, the Light site name sits straight on the map.

## Minor Observations

- Flat map at zoom 1: longitude labels touched (fixed: every 20° when 10° is under 46px).
- The region line had no label (fixed: "Region: Hesse").
- The hover tip covers the label of the region being painted.
- "Link copied" appears at the top while the hint is at the bottom.
- Antique's selection outline is weaker than Light's.

## Questions to Consider

- Should Paint and Draw be one "Give land" tool, with region, whole country and lasso as the brush?
- Should the receiving country be a chip beside the tools rather than the selection?
- Should Antique be the first impression?
