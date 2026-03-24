# SVG Components

Rules for SVG snippets and JS code generating SVG.

## SVG Snippet Files (`src/_includes/svg/`)

Static SVG files embedded at build time via the `gen: file` pattern (see `agents/exercises.md`).

### Authoring rules

1. **Use CSS custom properties** with hardcoded fallbacks for standalone preview:
   ```xml
   fill="var(--green, #3a9a55)"
   stroke="var(--cs, #475569)"
   ```
2. **Keep files minimal** — no unnecessary metadata, editor comments, or redundant attributes.
3. **Use `viewBox`** for responsive scaling; avoid fixed `width`/`height` where possible.
4. **Color tokens** — use the short CSS var names from `design-tokens.json`:
   - `--p` (primary), `--a` (accent)
   - `--red`, `--green`, `--purple`, `--pink`, `--orange` (figure colors)
   - `--sf` (surface), `--sc` (chrome), `--ss` (subtle surface)
   - `--ct` (content text), `--cs` (content subtle)

### File naming conventions

| Pattern | Usage |
|---------|-------|
| `shape-on-grid-*.svg` | Shapes on a grid background for perimeter counting |
| `symmetry-line-*.svg` | Figures for counting lines of symmetry (e.g., `symmetry-line-four-01.svg`) |
| `sym-axis-{difficulty}-*.svg` | Figures with drawn axes for axis identification (`easy`, `med`, `hard`) |
| `*-perimeter.svg` | Composite figures with labeled side lengths |

## SVG Generation in JavaScript (`svg.js`)

Functions in `src/assets/js/svg.js` generate SVG markup at runtime. They are called from Alpine.js templates via `window[cur.svg.gen](...Object.values(cur.svg.par))`.

### Optimization rules

1. **Round floats to 2 decimal places** — reduces string length in generated SVGs.
2. **Use `<g>` wrappers** for shared attributes (e.g., `stroke`, `stroke-width`) instead of repeating on each child element.
3. **Use CSS custom properties** in generated SVGs, same as static files.

### Build-time duplicates

`.eleventy.js` contains a build-time copy of `slicedPieSvg` for pre-rendering. When modifying `slicedPieSvg` in `svg.js`, update the copy in `.eleventy.js` as well.

## `stats:svg` Script

Run `npm run stats:svg` to analyze all SVG files in `_includes/svg/`. Reports file count, total size, and CSS variable usage.
