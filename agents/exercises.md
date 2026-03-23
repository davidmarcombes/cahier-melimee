# Exercises

## Unified Player System

All exercises (static and generated) use a single engine: `seriesPlayer` in `app.js`.

Each series lives in a nested folder under `src/fr/exercices/{level}/maths/{topic}/{leaf}/` or `src/fr/applications/{level}/maths/{topic}/`:
- `index.yaml` — series metadata (`id`, `seriesTitle`, `difficulty`). Level/topic/subtopic are derived from the directory path.
- `01-name.md`, `02-name.md`, ... — individual exercises with `type` in front-matter

The `id` field in `index.yaml` is used as the URL slug: `/fr/exercices/{id}/`. Series missing an `id` will not generate a page — the build warns at the end. Run `npm run generate:ids` to assign IDs.

Layout: `series-player.njk` with per-type partials in `src/_includes/types/`.

### Static exercises
Defined entirely in front-matter (answer, operation, type-specific fields).

### Generated exercises (applications)
Use `generator` + `repeat` + optional `params` in front-matter. At build time, `seriesPayload` emits a lightweight placeholder with `_gen` metadata. At runtime, `regenerateAll()` expands placeholders and generates fresh numbers on each page load.

Generators live in `src/assets/js/generators.js` (single source, dual export: `window.AppGenerators` for browser, `module.exports` for Node.js).

### Script loading in series-player.njk

- **`svg.js`** is loaded when ANY exercise in the series has a `generator:` OR `svg:` field.
- **`generators.js`** is loaded only when an exercise has a `generator:` field.
- **KaTeX CSS** is loaded when any exercise title contains `$` (LaTeX).

## Exercise Types

| Type | Partial | Description |
|------|---------|-------------|
| `number-check` | `types/number-check.njk` | Default. Simple operation with answer input. Supports trou (hole) mode. |
| `problem` | `types/problem.njk` | Word problem or emoji puzzle. Shows body, answer input. |
| `matching` | `types/matching.njk` | Drag/click to match pairs. SVG lines between items. |
| `sequence` | `types/sequence.njk` | Fill blanks in a number sequence. |
| `bounding` | `types/bounding.njk` | Place a number between bounds (encadrement). |
| `convert` | `types/convert.njk` | Unit conversion exercises. |
| `pyramid` | `types/pyramid.njk` | Addition pyramids — fill missing cells. |
| `logic-grid` | `types/logic-grid.njk` | Logic grid puzzle — click cells to place marks. |
| `true-false` | `types/true-false.njk` | Vrai/Faux table — tick true or false per assertion. |
| `compare` | `types/compare.njk` | Compare numbers — pick < or > between two values. |
| `multi-question` | `types/multi-question.njk` | Shared context + multiple sub-questions, each validated on Enter. |
| `mcq` | `types/mcq.njk` | Multiple choice — click the correct answer among 3-5 shuffled choices. |
| `ruler` | `types/ruler.njk` | Graduated ruler with markers — read a value. SVG via `rulerSvg` getter. |
| `sort` | `types/sort.njk` | Order items by clicking them in sequence. Items listed in correct order in YAML, shuffled at runtime. |
| `drag-sort` | `types/drag-sort.njk` | Sort tiles by clicking pairs to swap them. Direction indicator. Tiles support HTML via `x-html`. Fields: `tiles[]` (strings), `direction` (`asc`/`desc`). |
| `fill-table` | `types/fill-table.njk` | Table with blank cells — student fills each digit/value. Supports `cur.svg` above the table. Uses `blankCount`, `headers`, `rows` (cells: `{blank, idx, answer}`). |
| `checkbox` | `types/checkbox.njk` | Tick all valid statements — multi-select with a verify button. Fields: `statements[]` (HTML strings), `checkedAnswers[]` (integer indices). Supports `cur.svg`. |
| `select` | `types/select.njk` | Complete sentences by choosing a word from a dropdown. Fields: `choices[]` (option list), `statements[]` (each with `template` using `___` placeholder, and `answer`). |
| `svg-tiles` | `types/svg-tiles.njk` | Display grids of SVGs. User clicks on correct ones. Fields: `tiles[]` (Array of objects with `gen` and `par`), `answers[]` (integer indices). |
| `tile-select` | `types/tile-select.njk` | Click to select all correct tiles (multi-select). Fields: `tiles[]` (HTML strings), `tileAnswers[]` (0-indexed correct indices). Supports `svg:` field for SVG rendering. |
| `fraction` | `types/fraction.njk` | Visual fraction representation — shade a shape. Fields: `shape` (`circle`/`rect`), `numerator`, `denominator`, `answer`. |
| `fraction-check` | `types/fraction-check.njk` | Stacked fraction input (numerator/denominator boxes). Fields: `answers[]` (two strings: numerator, denominator). Supports `cur.operation` and `cur.svg`. |
| `base-10` | `types/base-10.njk` | Base-10 blocks visual — decompose a number into hundreds/tens/ones. Fields: `answer`, plus either `number` or `hundreds`+`tens`+`ones`. |
| `clock` | `types/clock.njk` | Analog clock — read or set the time. Fields: `hour`, `minute`, `answer`. |
| `click-blocks` | `types/click-blocks.njk` | Click cells to fill columns from the bottom up (place-value blocks). Fields: `columns[]` (each with `label`, `value`, `color`, `answer`, `max`). Supports generators. |

Shared verify button for sequence/bounding/convert: `types/seq-verify.njk`.

## Timed Challenges (Défis)

Timed challenges live under `src/fr/defis/` (same nested structure as `exercices/`). They use a separate layout and Alpine component designed for fluency practice.

### Structure

Each défi series has the same `index.yaml` as a regular series **plus** a required `duration` field (seconds):

```yaml
id: "a2b3c4d5"
seriesTitle: "Tables de multiplication"
difficulty: moyen
duration: 90
```

The exercise `.md` files are identical to exercises — most defis use `generator:` with `repeat:` for fresh numbers each session.

### Layout & Component

- Layout: `src/_layouts/timed-player.njk` — 3-phase UI: ready → playing → done
- Component: `src/assets/js/timed-player.js` — `timedPlayer(exercises, seriesId, opts)`
  - Expands `_gen` placeholders at runtime via `window.AppGenerators`
  - Shuffles the pool, advances instantly on correct answer (120ms flash) or after brief err flash (380ms)
  - Countdown timer bar (green → amber → red); score report with rate/min stat

### Collections & CSV

- `collections.defis` — Eleventy collection of all `*.md` under `src/fr/defis/`
- `collections.defisMeta` — structured metadata like `seriesMeta` but adds `duration`; folder code `'d'`
- `defi-pages.njk` — pagination template generating pages at `/fr/defis/{id}/`
- Defis are included in `data.csv` with folder code `d`; `FOLDERS` map in `app.js` resolves `d` → `defis`
- Cards in the exercise listing show a ⏱ badge when `s.isDefi === true`

### Validation

`scripts/validate-exercises.js` validates defis like exercises and additionally checks that `duration` is present in each `index.yaml`.

## SVG Snippets

SVG files in `src/_includes/svg/` are embedded at build time using the `gen: file` pattern (see below). They use CSS custom properties with hardcoded fallbacks for standalone preview.

### Available SVG files

| Category | Files | Purpose |
|----------|-------|---------|
| **Perimeter (grid)** | `shape-on-grid-00.svg` through `shape-on-grid-03.svg` | Shapes on a grid for perimeter counting |
| **Perimeter (figures)** | `l-shape-perimeter.svg`, `t-shape-perimeter.svg`, `u-shape-perimeter.svg`, `staircase-perimeter.svg` | Composite figures with labeled dimensions |
| **Symmetry lines** | `symmetry-line-none-01.svg`, `symmetry-line-one-01.svg`, `symmetry-line-two-02.svg`, `symmetry-line-four-01.svg`, `symmetry-line-four-02.svg`, `symmetry-line-five-01.svg`, `symmetry-line-six-01.svg`, `symmetry-line-infinite-01.svg` | Figures for counting lines of symmetry |
| **Symmetry axes** | `sym-axis-easy-*.svg`, `sym-axis-med-*.svg`, `sym-axis-hard-*.svg` (5 each) | Figures for identifying the correct axis of symmetry |
| **Geometric shapes** | `grid.svg`, `isosceles-trapezoid.svg`, `kite.svg` | Standalone shape illustrations |

### CSS variable usage in SVGs

SVGs use CSS custom properties defined in `design-tokens.json`:
```xml
<rect fill="var(--green, #3a9a55)" stroke="var(--cs, #475569)" />
```
The first value is the CSS var (works when embedded in HTML); the fallback is for standalone SVG preview in editors.

## The `gen: file` / `embedSvg` Pattern

To embed a static SVG from `_includes/svg/` into an exercise:

### In front-matter (YAML):
```yaml
svg:
  gen: file
  par:
    name: "shape-on-grid-00.svg"
```

### What happens at build time:
`.eleventy.js` reads `src/_includes/svg/shape-on-grid-00.svg`, and transforms the payload to:
```json
{ "gen": "embedSvg", "par": { "svg": "<svg ...>...</svg>" } }
```

### At runtime:
`embedSvg()` in `svg.js` simply returns its argument (the SVG markup string). The template renders it via `window[cur.svg.gen](...Object.values(cur.svg.par))`.

### `tile-select` with `svg:` field

The `tile-select` type supports an `svg:` field on individual tiles, rendered the same way:
```yaml
tiles:
  - text: "Rectangle"
    svg:
      gen: file
      par:
        name: "shape-on-grid-01.svg"
```

## Adding a New Exercise Type

Complete checklist — every step is required:

### 1. Template partial
Create `src/_includes/types/your-type.njk`.
- Wrap everything in `<div x-show="cur.type === 'your-type'">`.
- Keep `:class` objects on a **single line** — multi-line blocks render verbatim whitespace into built HTML and inflate page size.
- Include a "Vérifier" button inside the partial (or reuse `seq-verify.njk` for sequence-style types).

### 2. `series-player.njk` — two places
```njk
{# Conditional include (~line 57, with other type includes) #}
{% if 'your-type' in usedTypes %}{% include "types/your-type.njk" %}{% endif %}

{# Error feedback span (~line 130, inside the showError div) #}
{% if 'your-type' in usedTypes %}
<span x-show="cur.type === 'your-type'">Message d'erreur. Essaie encore !</span>
{% endif %}
```

### 3. `app.js` — four places
- **State variables** (top of `seriesPlayer` data object): add all input/error/display arrays.
- **`init()`**: initialize state for the first exercise (index 0).
- **`goTo(idx)`**: reset state when navigating to a new exercise.
- **`check()`**: add a type branch — `solvedFlags[currentIndex] = true` + auto-advance on success; `showError = true` + timeout reset on failure.
- **Methods** (before `goTo`): add any interaction handlers.

### 4. `.eleventy.js` — `seriesPayload` filter
If the type has custom YAML fields beyond `title/type/operation/body/answers`, add a block before `payload.push(item)`:
```js
if (ex.data.type === 'your-type' && ex.data.yourField) {
  item.yourField = ex.data.yourField;
}
```

### 5. `scripts/validate-exercises.js` — `TYPE_SCHEMAS`
Register the type so the validator accepts it:
```js
'your-type': { required: ['requiredField'], arrays: ['arrayField'] },
```

### 6. `scripts/generate-maths-ex.js` — two places
- **`TYPE_CHOICES`**: add `{ name: 'your-type — Description', value: 'your-type' }`.
- **`TEMPLATES`**: add the empty scaffold YAML string.

### 7. Sample content + IDs
Create at least one series under `src/fr/exercices/`, then run `npm run generate:ids`.

### 8. Documentation
- Add a row to the **Exercise Types** table above.
- Add new YAML fields to the **Front-Matter Schema** section below.

## Adding a New Generator

1. Add the generator function in `src/assets/js/generators.js` (single source for both build and runtime)
2. Generators must return seriesPlayer-compatible items:
   ```javascript
   { type: 'number-check', operation: '5 + 3', answers: ['8'] }
   ```
4. Create an `.md` file in `src/fr/applications/{series}/` with:
   ```yaml
   type: number-check
   generator: "yourGenerator"
   repeat: 10
   params:
     min: 1
     max: 100
   ```

## SVG Generation Helpers (svg.js)

Functions in `src/assets/js/svg.js` (loaded on series pages that need SVG):

| Function | Purpose |
|----------|---------|
| `embedSvg(svg)` | Identity function — returns its argument. Used for build-time embedded SVGs. |
| `mathGridSvg(cols, rows, filled, color)` | Rectangular grid with filled/empty cells. |
| `slicedPieSvg(n, k, size, color)` | Pie chart with `k` of `n` slices filled. Optimized: 2dp rounding, `<g>` wrapper for shared stroke. |

Note: `.eleventy.js` has a build-time duplicate of `slicedPieSvg` for pre-rendering. Keep both in sync.

## Front-Matter Schema

### Static exercise (`.md` in a series folder)

```yaml
---
type: "number-check"      # Exercise type (see table above)
class: "S1.1.1"            # Skill code (see docs/classification.md)
# class: "A1.1"            # OR Vergnaud class (ONLY for 'problem' type)
title: "Calcule"           # Display title
answer: 42                 # Expected answer (number or string)
# Type-specific fields:
columns: ["A", "B"]        # logic-grid
rows: ["X", "Y"]           # logic-grid
solution: { A: "X" }       # logic-grid
statements:                # true-false
  - text: "Assertion"
    answer: true
comparisons:               # compare
  - left: 56673
    right: 89939
choices:                   # mcq (shuffled at build time)
  - "correct answer"
  - "wrong 1"
  - "wrong 2"
min: 0                     # ruler — range start (integer)
max: 10                    # ruler — range end (integer)
divisions: 10              # ruler — divisions per unit
subdivisions: 0            # ruler — optional subdivisions per division
markers:                   # ruler — labeled points on the ruler
  - label: "A"
    value: 2.7
context: "267 543 109"     # multi-question shared context
questions:                 # multi-question
  - text: "Sub-question?"
    answer: "answer"
items:                     # sort — listed in CORRECT order, shuffled at runtime
  - "3,07"
  - "3,7"
  - "30,7"
direction: asc             # sort / drag-sort — "asc" (petit → grand) or "desc"
tiles:                     # drag-sort — HTML strings, listed in CORRECT order
  - "1/6"
  - "1/4"
  - "1/2"
statements:                # checkbox — list of HTML/text strings
  - "Affirmation 1"
  - "Affirmation 2"
  - "Affirmation 3"
checkedAnswers: [0, 2]     # checkbox — 0-indexed integers (NOT strings)
tiles:                     # svg-tiles — array of SVG generator objects
  - gen: "circleSvg"
    par:
      r: 40
  - gen: "squareSvg"
    par:
      size: 80
  - gen: "embed"
    par:
      svg: "<svg><circle r='10'/></svg>"
  - gen: "file"
    par:
      name: "my-icon.svg"  # Looks in src/_includes/svg/
answers: [1]               # svg-tiles — 0-indexed integers
tiles:                     # tile-select — HTML strings (can include markup/fractions)
  - "2/3"
  - "3/4"
tileAnswers: [0]           # tile-select — 0-indexed correct tiles
svg:                       # tile-select / fill-table / checkbox — optional SVG display
  gen: file
  par:
    name: "shape-on-grid-00.svg"
columns:                   # click-blocks — place-value columns
  - label: "100"
    value: 100
    color: "#dc2626"
    answer: 3              # expected number of filled cells (digit at that position)
    max: 9                 # max cells in column
  - label: "10"
    value: 10
    color: "#7c3aed"
    answer: 2
    max: 9
answers:                   # fraction-check — [numerator, denominator] as strings
  - "3"
  - "4"
---

Markdown body shown as instructions.
```

### Generated exercise (application)

```yaml
---
type: number-check
title: "Addition simple"
generator: "additionSimple"
repeat: 10
params:
  minA: 10
  maxA: 99
---

Instructions shown above each exercise.
```

### Series metadata (`index.yaml`)

```yaml
id: "a1b2c3d4"            # Required — 8-char hex, generated by npm run generate:ids
seriesTitle: "Additions simples"
difficulty: facile         # facile, moyen, difficile
# level, topic, subtopic are derived from directory path:
# src/fr/exercices/{level}/maths/{subtopic}/{leaf}/
```

## Example Series

### Perimeter on grid (`perimetre-quadrillage`)
Location: `src/fr/applications/cm1/maths/mesures/perimetre-quadrillage/`
Uses `shape-on-grid-*.svg` files via `gen: file` pattern. Students count grid units around a shape.

### Perimeter of composite figures (`perimetre-figures`)
Location: `src/fr/applications/cm1/maths/mesures/perimetre-figures/`
Uses `l-shape-perimeter.svg`, `t-shape-perimeter.svg`, etc. Students calculate perimeter from labeled dimensions.

### Axes of symmetry (`axes-symetrie-01`)
Location: `src/fr/exercices/cm1/maths/geometrie/axes-symetrie-01/`
Uses `symmetry-line-*.svg` files. Students count how many lines of symmetry a figure has.

### Symmetry axis identification (`symetrie-axe-01` through `symetrie-axe-03`)
Location: `src/fr/exercices/cm1/maths/geometrie/symetrie-axe-01/` (and 02, 03)
Uses `sym-axis-*.svg` files. Students identify which drawn line is the correct axis of symmetry.
