# Portfolio map: the page Implementation Plan

> **Moved, 23 November 2026:** the page now lives at `projects/` (`/projects/`), replacing the old projects page, which moved to `projects/classic/`. Read `portfolio-map/` below as `projects/`; `/portfolio-map/` redirects there.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The page itself: a full-screen imaginary-world map (one of the twenty generated worlds per load) where each project is a country, with a web mapping app's interface: a rail, a search box, a project panel, a footer strip, and a phone layout.

**Architecture:** One static page at `portfolio-map/index.html` with `portfolio-map/map.css` and `portfolio-map/map.js` (plain JS, no framework, no build), reading `portfolio-map/projects.json` (content) and `portfolio-map/worlds/<slug>.json` plus `<slug>.png` (geometry). The map is one SVG whose viewBox is driven by pan and zoom; it draws the layers in each world's `order`. Served locally with any static server from the repo root (`python3 -m http.server`), so root-relative paths like `/fonts/` and `/art/` work.

**Tech Stack:** HTML, CSS, vanilla JS; Playwright (already used by `tools/chronia-*-check.mjs`) for a page check script.

**Spec:** `docs/superpowers/specs/2026-11-22-map-portfolio-design.md` (read it whole; it is the authority on layout and behaviour).

## Global Constraints

- Nothing is pushed; nothing outside `portfolio-map/`, `tools/portfolio-map-check.mjs`, and these docs changes. /projects, /portfolio, and the rest of the site stay as they are.
- Colours: the world JSON's `palette` for the map; the site's orange and blue only for the heart and favourite buttons, the selected country's highlight, and small accents. No Google name, logo, icons, pins, or Google Sans; icons drawn for the page (inline SVG); fonts from `/fonts/fonts.css`.
- UI text: serial comma; `|` separators, never `·` or round bullets.
- Zoom from the whole world fitting the viewport to about 4×; no panning off the world.
- Rotation: a load shows the world after the one this browser last saw (`localStorage`, wrapped in try/catch); first visit random; `?world=<slug>` opens that world; `&project=<id>` (and `&province=<id>` for Dealdesk) opens that panel.
- Favourites in `localStorage` (try/catch); no accounts.
- Respect `prefers-reduced-motion` for fly-to and sheet animations.

## Review Focus

- A share link (`?world=…&project=…`) opened in a fresh browser must open that world with that panel and the country highlighted.
- Labels with `minZoom` > 1 appear and disappear with zoom; river labels follow their `path`; nothing overlaps the panel's edge awkwardly.
- Phone width (390×844): the bottom sheet drags between collapsed, half, and full; the map stays pannable above it; the tab bar works.
- `localStorage` blocked (private mode): rotation falls back to random and hearts still toggle for the visit, with no errors.
- Keyboard: search, rail buttons, panel actions, and countries (via search) are reachable and visible on focus; the panel closes with Escape.

---

## Tasks

### Task 1: Project content
- Extend `portfolio-map/projects.json` entries (keep `id`, `name`, `tier`, `rank`, `provinces`, `names`) with `url`, `domain`, `blurb`, and `media: [{ src, alt }]`, and for Dealdesk's provinces their own `blurb` and `media`. Take blurbs and links verbatim from `portfolio/index.html` cards, `projects/index.html`, `miscellaneous/index.html`, and the `portfolio/<project>/index.html` detail pages (their slideshows supply extra screenshots and captions); screenshots from `art/web/materials/` (prefer the `shot-*` WebPs; the `*-480` thumbnails for small projects). Where a small project has no screenshot, leave `media` empty (the panel shows a tasteful placeholder made from the country's shape).
- Also add an `about` object to a new `portfolio-map/about.json`: Noah's introduction ("Hi, my name is Noah" and the current portfolio lede "I design and build things. Take a look at some of my projects here."), the portrait (`/art/web/me-tiles-320.webp` or the current hero image), the resume link `/portfolio/Lee_Noah_Resume.pdf`, and the contact section's email and links from `portfolio/index.html`.
- Check: a small script or test that every project has `url`, `blurb`, and existing media files. Commit.

### Task 2: The map
- `map.js`: load `projects.json`, pick the world, load its JSON and PNG, draw the SVG layers in `order` (image, rivers by width, sea as the inverse of `coast` over the image, lakes, coast stroke, estuaries, province borders dashed, country borders, labels with a pale halo). Country fills are transparent over the land cover; a selected country gets an orange-tinted overlay and a heavier border; hover shows a subtle highlight.
- Pan (drag, touch), zoom (wheel, pinch, double-click, and + / − buttons at the bottom right), clamped as in Global Constraints. Labels visible when the zoom ≥ their `minZoom`; text size stays readable (scale label sizes so they read as on the contact sheets at zoom 1 and grow gently with zoom).
- Clicking a country or its label selects it, opens its panel, and flies the view to fit it beside the panel.
- Check: `tools/portfolio-map-check.mjs` (Playwright, as in `tools/chronia-page-check.mjs`) loads `?world=le-guin`, finds 18 country shapes and their labels, zooms to 4×, and confirms it can't zoom further or pan off the edge. Commit.

### Task 3: The interface
- Desktop (≥ 760 px): the rail at the far left (≡ opening the site menu `menu.js`, About, Saved, Resume, Contact, with labels under icons); the search box at the top left of the map ("Search projects", matching names and Dealdesk's tools, keyboard navigable); the side panel (about 400 px) with media carousel (swipe and arrows), name, domain, actions row (Visit, ♥ Save, Share: copies the link and shows "Link copied"), blurb, and for Dealdesk a list of its four tools that switch the panel and highlight the province; About as the starting panel; Saved lists hearted projects (empty state text); Contact shows the email and links; Resume opens the PDF in a new tab.
- Footer strip along the bottom: `Map: <world name> | Terms | Privacy | Site feedback` and a live scale bar in km (from `scale.kmPerUnit` and the zoom). Clicking the world name loads the next world without a reload, keeping any open panel if that project exists. Terms and Privacy link to `/terms/` and `/privacy/`; Site feedback opens a small form posting like `feedback.js` (reuse it if it works on this page, otherwise a mailto fallback).
- Phone (< 760 px): as in the spec's phone section: floating search pill with Noah's portrait at its right (opens About), a round next-world button at the right, a bottom sheet with a handle (collapsed shows the world or project name; dragged up shows the panel), and a bottom tab bar (Explore, Saved, Resume, About). No chips.
- Check (extend the check script): open a project from search, heart it, see it in Saved after a reload, copy a share link and open it in a new page, switch worlds from the footer, and the phone layout at 390×844 (sheet drag, tab bar). Screenshots at 1440×900 and 390×844 saved to `/tmp/portfolio-map-*.png`. Commit.

### Task 4: Polish
- Use the frontend-design and impeccable skills to bring it to a finished, distinctive standard within the borrowed pattern: typography, spacing, the panel's media treatment, transitions (fly-to, sheet), focus states, and loading (a quiet placeholder until the world image loads). Keep it fast on a phone (the PNG is the only big file; no layout jank on load).
- Final screenshots; commit.
