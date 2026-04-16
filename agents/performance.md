# Performance

## Page Size Budgets

- **Exercise pages:** target ≤ 18 KB HTML (currently ~17 KB)
- **CSS bundle:** target ≤ 60 KB minified (currently ~55 KB — grown with new exercise types; all 499 classes are actively used, no dead CSS)
- Audit with: `wc -c _site/path/to/page.html` and `wc -c _site/assets/css/style.css`

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
- **`generators.js`** — loaded only when an exercise has `generator:` field
- **KaTeX CSS** — loaded when any exercise title contains `$`

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

- Images optimized to AVIF/WebP via `@11ty/eleventy-img`
- Fonts loaded with `font-display: swap`
- Minimal JS footprint: Alpine.js CDN (~15 KB) + one `app.js` file + conditional `svg.js` / `generators.js`
- Static HTML for fast initial loads and SEO
- SVG `slicedPieSvg` optimized: floats rounded to 2dp, `<g>` wrapper for shared `stroke` attribute
