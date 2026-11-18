# Performance

## Page Size Budgets

- **Pages:** ≤ 10 KB gzip each (what LWS sends; `.htaccess` gzips HTML). Measured 2026-11-15: median 5.3 KB, p99 7.2 KB, largest 7.8 KB (raw ~30–36 KB). Enforced by `npm run release:verify`. Raw size is not the budget: mixed-type series repeat partial markup that gzip removes.
- **CSS bundle:** target ≤ 60 KB minified (2026-11-15: 58.8 KB, 12 KB gzip — at the ceiling: check before adding utilities). Release CSS skips the dev-only templates (admin, debug panel, `dev.js`): `tailwind.config.js` drops them from `content` unless Tailwind runs with `--watch` (dev). Tailwind color-opacity plugins are off (`corePlugins` in `scripts/generate-tailwind-from-tokens.js`): use alpha modifiers (`bg-white/80`), never `bg-opacity-*`.
- **Reference (Lighthouse mobile, 2026-11-15):** score 98–99, FCP ~1.2–1.5 s, LCP ~1.7–2.2 s, TBT ≤ 30 ms, CLS 0; cold transfer 130 KB (home) to 180 KB (heaviest series), of which the Inter font is 37 KB and JS 70–120 KB.
- Audit with: `npm run release:verify` (largest page in its summary line), `gzip -9c _site/fr/exercices/<id>/index.html | wc -c`, `wc -c _site/css/styles.css`

## Build-Time Conditional Includes (critical)

Exercise pages must only ship HTML for the types they actually use. Never ship all type blocks to every page with `x-show` alone.

Pattern in `series-player.njk`:
```njk
{% set usedTypes = exercises | extractTypes %}
{% if 'matching' in usedTypes %}{% include "types/matching.njk" %}{% endif %}
```

Type partials live in `src/_includes/types/`. When adding a new exercise type, create a partial there and add the conditional include — never add blocks directly to the layout.

## Conditional Script Loading

`series-player.njk` conditionally loads JS files to minimize payload:

- **`svg.js`** — loaded when any exercise has `generator:` OR `svg:` field
- **`grid-draw.js`** — grid-board `draw` methods (~3 KB gzip), mixed into the player; loaded only when an exercise is a draw board (`generator: tracerGrille` or `board.mode: draw`). Pattern for rare, heavy type logic: a classic script setting `window.X`, merged by `seriesPlayer()` when present, so `app.js` stays small on every page
- **`generators/_core.js` + needed topic modules** — loaded only when an exercise has `generator:` field; only the modules holding the series generators (usually one, ~6 KB gzip)
- **KaTeX CSS** — loaded when any exercise title contains `$`

## Layout Shift Prevention (CLS)

All Alpine.js containers that render dynamic content must use `x-cloak`:
```html
<div x-data="component()" x-cloak class="...">
```

The base layout defines `[x-cloak] { display: none !important; }` so containers stay hidden until Alpine initializes, preventing flash of unstyled template expressions.

Applied to: `series-player.njk`, `challenge-player.njk`, `exercices-list.njk`.

`x-cloak` alone moves the problem: the hidden player has no height, so on first paint the footer sits in view, then jumps down when Alpine shows the player (Lighthouse CLS ~0.06, element `footer`). So `base.njk` also hides the footer while the player is cloaked: `body:has(.js-player[x-cloak]) > footer { visibility: hidden; }` (inline, next to the `x-cloak` rule). An invisible element's move is not a layout shift: CLS 0, page height unchanged. Don't reserve height with `min-h-screen` on `<main>` instead — that puts a scroll bar on every player page. A new full-page Alpine layout needs the `js-player` class on its cloaked container.

## Script Loading Order

In `base.njk`, scripts load in this order:
1. **Inline, in `<head>`, before the stylesheet** — `window.__pathPrefix`, the dark-mode class (before paint, no theme flash), the CSV preload. An inline script waits for every stylesheet above it, so the `<link rel="stylesheet">` comes right after them, ahead of the meta/OG/JSON-LD tags. Lighthouse still flags it as render-blocking (~300 ms estimate); inlining the CSS would clear the audit but measured no FCP gain and breaks the page budget (+10 KB gzip per page)
2. **app.js** — `type="module"`, `defer`; registers what every page needs on `window` (store, theme, voice speed, utils, exercises store). It does **not** import the players
3. **Player entry** — only on player pages: `series-entry.js` (→ `modules/player.js`, ~28 KB gzip, the biggest file) or `timed-entry.js` (→ `timed-player.js`), each setting `window.seriesPlayer` / `window.timedPlayer`. Chosen by front matter in `series-player.njk` / `timed-player.njk` (`playerEntry`, `playerModule`). Non-player pages (home, onboarding, blog, lists) went from 105 to 75 KB, Alpine ready ~250–300 ms sooner on slow 4G (2026-11-15). `<link rel="modulepreload">` for `playerModule` and `constants.js` (one level deeper) starts them with the page; their URL must equal the import `minify.js` rewrites (`?v=<version>`), else the file is fetched twice — hence off in dev mode, whose imports carry no `?v`. A new Alpine component used on one kind of page belongs in such an entry, not in `app.js`
4. **alpine.min.js** — `defer`, last: deferred scripts and modules run in document order, so every component exists when Alpine starts
5. **Service worker registration** — inline, on `load` (unregistered in dev mode). `scripts/generate-sw.js` precaches the shell only (JS, CSS, fonts, logo, manifest); pages are cached on visit (stale-while-revalidate). Never precache pages: 874 URLs per first visit tripped the host's request limit.

Speech clips are not part of the precached shell. `Audio` fetches each clip only when spoken; the service worker then caches it on visit.

Page-specific scripts (`svg.js`, `grid-draw.js`, generator modules) are plain classic scripts in `series-player.njk` / `timed-player.njk`. Every JS/CSS URL carries `?v={{ site.version }}` (see `docs/release.md`).

## CSS Discipline

- No heavyweight Tailwind plugins (e.g. `@tailwindcss/typography` adds ~14 KB). Custom prose styles are in `input.css` (~20 rules, ~1 KB).
- CSS is minified via `--minify` flag in the build script.
- `tailwind.config.js` is generated from `design-tokens.json` — `plugins: []`.

## HTML Minification

The `.eleventy.js` config includes an `htmlmin` transform using `html-minifier-terser` with these options:

- `collapseWhitespace: true`
- `removeComments: true`
- `removeRedundantAttributes: true` — removes `type="text"` from `<input>` elements (since `text` is the default)
- `removeEmptyAttributes: true`
- `minifyCSS: true`, `minifyJS: true`
- `useShortDoctype: true`

**Important interaction with html-validate:** Because `removeRedundantAttributes` strips `type="text"` from inputs, the `no-implicit-input-type` rule is turned **off** in `.htmlvalidate.json`. The source HTML has explicit types, but the built HTML does not.

## HTML Validation (html-validate)

`npm run validate:html` runs after CSS build in the production pipeline. Config: `.htmlvalidate.json`.

Extends `html-validate:recommended` with these rules disabled:
- `doctype-style` — Eleventy uses short doctype
- `attribute-boolean-style` — Alpine.js uses valueless booleans
- `text-content` — dynamic content via `x-text`/`x-html`
- `empty-heading` — headings populated dynamically by Alpine.js
- `unrecognized-char-ref` — Nunjucks template chars
- `no-implicit-input-type` — stripped by HTML minifier (see above)
- `no-inline-style` — used for dynamic Alpine.js `:style` bindings
- `prefer-native-element` — Alpine.js patterns use generic elements

Alpine.js attributes are registered globally in the `elements` section so they are not flagged as unknown attributes.

## JSON in HTML Attributes

When embedding JSON in single-quoted HTML attributes (`x-data='...(...)'`), escape apostrophes:
```js
.replace(/'/g, '\\u0027')
```
Both `seriesPayload` and `seriesListPayload` filters in `.eleventy.js` apply this escaping.

## General

- Images optimized to AVIF/WebP via `@11ty/eleventy-img`. The `image` shortcode takes an optional 6th argument, the widths (default `[320, 640, 1024, 1600]`): small fixed-size images pass their 1× and 2× widths, e.g. the header logo at 2rem → `[32, 64]` (1.2 / 2.4 KB AVIF instead of 7 KB). Its file names are precached by `scripts/generate-sw.js` (`SHELL`): change both together
- Inter is self-hosted (`src/assets/fonts/`, roman 37 KB) with `font-display: optional` and deliberately no preload: on a cold first page it may miss its ~100 ms window and that page stays on `system-ui` (no swap, no layout shift); later pages use the cached font. Checked 2026-10-28: layout-health on every page with the font files removed shows no overflow or broken layout, only cosmetic differences (glyph shapes, a consigne wrapping onto two lines). Font-fallback flips are therefore expected noise in `npm run regress` screenshots
- Minimal JS footprint: Alpine.js (~15 KB) + `app.js` + on player pages the player entry + conditional `svg.js` / `grid-draw.js` / `generators/*.js` (per-topic modules)
- Static HTML for fast initial loads and SEO
- SVG `slicedPieSvg` optimized: floats rounded to 2dp, `<g>` wrapper for shared `stroke` attribute
