# Performance

## Page Size Budgets

- **Exercise pages:** target ≤ 18 KB HTML (currently ~17 KB)
- **CSS bundle:** target ≤ 30 KB minified (currently ~26 KB)
- Audit with: `wc -c _site/path/to/page.html` and `wc -c _site/assets/css/style.css`

## Build-Time Conditional Includes (critical)

Exercise pages must only ship HTML for the types they actually use. Never ship all type blocks to every page with `x-show` alone.

Pattern in `series-player.njk`:
```njk
{% set usedTypes = exercises | extractTypes %}
{% if 'matching' in usedTypes %}{% include "types/matching.njk" %}{% endif %}
```

Type partials live in `src/_includes/types/`. When adding a new exercise type, create a partial there and add the conditional include — never add blocks directly to the layout.

## Layout Shift Prevention (CLS)

All Alpine.js containers that render dynamic content must use `x-cloak`:
```html
<div x-data="component()" x-cloak class="...">
```

The base layout defines `[x-cloak] { display: none !important; }` so containers stay hidden until Alpine initializes, preventing flash of unstyled template expressions.

Applied to: `series-player.njk`, `challenge-player.njk`, `exercices-list.njk`.

## Script Loading Order

In `base.njk`, scripts load in this order:
1. **PocketBase SDK** — sync (no defer), because inline `<script>` blocks in onboarding/connexion pages instantiate `PocketBase` at Alpine init time
2. **app.js** — `defer`
3. **Alpine.js CDN** — `defer`
4. **Health check** — inline async IIFE using plain `fetch` (no SDK dependency), stores promise in `window.__pbAvailable`

**Do NOT add `defer` to the PocketBase SDK** — it breaks pages that reference `PocketBase` in component init functions.

## CSS Discipline

- No heavyweight Tailwind plugins (e.g. `@tailwindcss/typography` adds ~14 KB). Custom prose styles are in `input.css` (~20 rules, ~1 KB).
- CSS is minified via `--minify` flag in the build script.
- `tailwind.config.js` is generated from `design-tokens.json` — `plugins: []`.

## JSON in HTML Attributes

When embedding JSON in single-quoted HTML attributes (`x-data='...(...)'`), escape apostrophes:
```js
.replace(/'/g, '\\u0027')
```
Both `seriesPayload` and `seriesListPayload` filters in `.eleventy.js` apply this escaping.

## General

- Images optimized to AVIF/WebP via `@11ty/eleventy-img`
- Fonts loaded with `font-display: swap`
- Minimal JS footprint: Alpine.js CDN (~15 KB) + one `app.js` file
- Static HTML for fast initial loads and SEO
