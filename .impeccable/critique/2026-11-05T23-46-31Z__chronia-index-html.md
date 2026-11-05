---
target: CHRONIA UI
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/claude/noahdarwinlee/chronia/index.html"
target_fingerprint: "sha256:64e958c7f12c9ade986167fc8dc44104e97d5954a0bdec582181adad473f46d0"
target_path: /home/claude/noahdarwinlee/chronia/index.html
timestamp: 2026-11-05T23-46-31Z
slug: chronia-index-html
---
Method: dual-agent (A: design review, B: detector + browser)

## Design Health Score: 25/40 (Acceptable)
1 Status 3 | 2 Real world 3 | 3 Control 3 | 4 Consistency 2 | 5 Error prevention 2 | 6 Recognition 2 | 7 Efficiency 3 | 8 Aesthetic 3 | 9 Recovery 2 | 10 Help 2

## Design specificity
Split verdict. The cartography is authored (engraved label hierarchy, italic peoples, dotted approximate borders, adaptive key, change ticks). The chrome is templated: one parchment-card recipe on ~10 containers (app.css:134-157), tracked uppercase eyebrows everywhere, a widely tracked boxed wordmark (0.34em), overshoot pop/drop-in animations, a 3 s intro on every load, AI clip-art on secondary pages (page.css:26-27).
Detector: 12 warnings on index.html; real ones are tight leading and 11.5px text in .ch-key-row and a 1px top inset on .ch-key-list; the rest are false positives (hidden img, intro opacity, double-rule frame read as side-tab). Secondary pages clean. CSP blocks overlay injection.

## Priority issues
- [P1] Chrome is one skin, not a hierarchy (frames, eyebrows, wordmark, bounce motion, intro). Fix: frame only the date and card; single rules elsewhere; small caps instead of tracked caps; wordmark 0.16em; no overshoot; intro once per session. (quieter / typeset)
- [P1] AI-written card notes carry no byline above a Wikipedia link (app.js:4677-4682); byline was removed deliberately in 6f692c4. (clarify)
- [P2] Date frame reads as a number stepper, month chevrons point up/down but map to left/right, 24x16 px touch targets, date 800 px from the timeline. (layout / adapt)
- [P2] Icon-only toolbar with hover-only labels; flat-map icon reads as film strip; no focus ring on the globe. (clarify / adapt)
- [P2] Bad date entry fails silently; card dates mix "August 6, 1806" and "15 July 1815". (harden / clarify)

## Minor
reports.css still italic; native select arrows; boxed DONATE; key leading 1.2 and 11.5px; timeline edge labels clipped; info text points to "the foot of the page".
