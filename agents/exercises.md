# Exercises

## Where Does Content Go?

Content contributors should only work in `src/fr/` — no templates, no `.njk` files.

| Folder | Purpose | Content pattern |
|--------|---------|-----------------|
| `src/fr/exercices/` | Static exercises | Many hand-written `.md` files per series |
| `src/fr/applications/` | Generated exercises | `.md` files with `generator:` + `repeat:` |
| `src/fr/defis/` | Timed challenges | Generated, uses `timed-player` layout |

**Rule**: if an exercise uses `generator:`, it belongs in `applications/`. If it's hand-written, it belongs in `exercices/`.

Infrastructure templates (pagination, CSV export) live in `src/_pages/`, not alongside content.

## Unified Player System

All exercises (static and generated) use a single engine: `seriesPlayer` in `app.js`.

Each series lives in a nested folder under `src/fr/exercices/{level}/maths/{topic}/{leaf}/` or `src/fr/applications/{level}/maths/{topic}/{leaf}/`:
- `index.yaml` — series metadata (`id`, `title`, `difficulty`). Level/topic/subtopic are derived from the directory path.
- `01-name.md`, `02-name.md`, ... — individual exercises with `type` in front-matter

The `id` field in `index.yaml` is used as the URL slug: `/fr/exercices/{id}/` or `/fr/applications/{id}/`. Series missing an `id` will not generate a page — the build warns at the end. Run `npm run generate:ids` to assign IDs.

Layout: `series-player.njk` (in `src/_layouts/`) with per-type partials in `src/_includes/types/`. Pagination template: `src/_pages/series-pages.njk`.

### Static exercises
Defined entirely in front-matter (answer, operation, type-specific fields).

### Generated exercises (applications)
Use `generator` + `repeat` + optional `params` in front-matter. At build time, `seriesPayload` emits a lightweight placeholder with `_gen` metadata. At runtime, `regenerateAll()` expands placeholders and generates fresh numbers on each page load.

Generators live in `src/assets/js/generators/`, one module per topic (`numeration`, `nombres`, `calcul`, `operations`, `fractions-decimaux`, `mesures`, `logique`) plus `_core.js` for shared helpers (`rand`, `shuffle`, `tableHtml`…). Each module is dual-export: it registers into `window.AppGenerators` in the browser and is `module.exports` under Node. `generators/index.js` is the Node entry (validator, tests, build): all generators merged, plus `moduleOf` (generator → module).

### Script loading in series-player.njk

- **`svg.js`** is loaded when ANY exercise in the series has a `generator:` OR `svg:` field.
- **`generators/_core.js` + the modules holding the series generators** are loaded only when an exercise has a `generator:` field (`generatorScripts` filter in `.eleventy.js`; an unknown generator fails the build). A typical page loads `_core.js` + one module (~6 KB gzip instead of 28 KB for all generators).
- **`svg.js`** also holds `base10Render` (base-10 blocks), so `base-10` exercises load it.
- **KaTeX CSS** is loaded when any exercise title contains `$` (LaTeX).

## Exercise Types

| Type | Partial | Description |
|------|---------|-------------|
| `number-check` | `types/number-check.njk` | Default. Simple operation with answer input. Supports trou (hole) mode. |
| `problem` | `types/problem.njk` | Word problem or emoji puzzle. Shows body, answer input. |
| `matching` | `types/matching.njk` | Drag/click to match pairs. SVG lines between items. |
| `sequence` | `types/sequence.njk` | Fill blanks in a number sequence. Legacy `given[]`+`answers[]`, or interleaved `sequence.items[]` (`{value}` / `{blank, inputIdx, answer}`) from generators — e.g. `suiteAvecControle` (hidden step, last cell given as a self-check; params `steps`, `given`, `blanks`, `direction` asc/desc/mixed, `startMax`, `offset`). |
| `bounding` | `types/bounding.njk` | Place a number between bounds (encadrement). |
| `convert` | `types/convert.njk` | Unit conversion exercises. |
| `pyramid` | `types/pyramid.njk` | Addition pyramids — fill missing cells. Give at least one cell per unknown so the pyramid is **solvable step by step**: each hidden cell must follow from one addition or subtraction of known neighbours (a top-down pyramid needing algebra, e.g. `2 160 + 3 × ? = 3 240`, is too hard for CP–CM2). The build computes all cells algebraically and fails on contradictory data; `check:answers` rejects pyramids that are not solvable step by step. |
| `logic-grid` | `types/logic-grid.njk` | Logic grid puzzle — click cells to place marks. Clues are the body's list items; they must give **exactly one** solution. `validate:exercises` checks it when every clue is direct (« Théo ne fait ni football ni tennis. »); descriptive clues (« Adèle dribble avec un ballon ») are left to the human check. Classic trap: a clue excluding an element another clue already assigned — it adds nothing and leaves two people interchangeable. |
| `true-false` | `types/true-false.njk` | Vrai/Faux table — tick true or false per assertion. |
| `compare` | `types/compare.njk` | Compare numbers — pick < or > between two values. |
| `compare-expressions` | `types/compare-expressions.njk` | Compare two expression strings without calculating — pick < = >. Fields: `comparisons[]` (left, right; answer auto-computed or explicit). |
| `estimation` | `types/estimation.njk` | Two-stage: estimate first (≈), then compute exactly (=). Both validated on Vérifier. Fields: `operation`, `estimate` (or `estimates[]`), `answer`. |
| `multi-question` | `types/multi-question.njk` | Shared context + multiple sub-questions, each validated on Enter. |
| `mcq` | `types/mcq.njk` | Multiple choice — click the correct answer among 3-5 shuffled choices. |
| `ruler` | `types/ruler.njk` | Graduated ruler with markers — read a value. SVG via `rulerSvg` getter. |
| `sort` | `types/sort.njk` | Order items by clicking them in sequence. Items listed in correct order in YAML, shuffled at runtime. By default the check re-sorts items as numbers; with `sortKeepOrder: true` items are labels (names) and the YAML order is the answer — put the data in a Markdown table in the body. `sortLabels: [from, to]` replaces "plus grand / plus petit". Generator `classerTableau` (params: `theme` prix/distances/durees, `count`, `direction` asc/desc/mixed, `min`/`max` in cents/metres/minutes, `mixedUnits`). |
| `drag-sort` | `types/drag-sort.njk` | Sort tiles by clicking pairs to swap them. Direction indicator. Tiles support HTML via `x-html`. Fields: `tiles[]` (strings), `direction` (`asc`/`desc`). |
| `fill-table` | `types/fill-table.njk` | Table with blank cells — student fills each digit/value. Supports `cur.svg` above the table. Uses `blankCount`, `headers`, `rows` (cells: `{blank, idx, answer}`). |
| `checkbox` | `types/checkbox.njk` | Tick all valid statements — multi-select with a verify button. Fields: `statements[]` (HTML strings), `checkedAnswers[]` (integer indices). Supports `cur.svg`. |
| `select` | `types/select.njk` | Complete sentences by choosing a word from a dropdown. Fields: `statements[]` (each with `template` using `___` placeholder, `answer`, and optional per-statement `choices[]`), global `choices[]` (optional fallback). Dropdowns start empty. |
| `svg-tiles` | `types/svg-tiles.njk` | Display grids of SVGs. User clicks on correct ones. Fields: `tiles[]` (Array of objects with `gen` and `par`), `answers[]` (integer indices). |
| `tile-select` | `types/tile-select.njk` | Click to select all correct tiles (multi-select). Fields: `tiles[]` (HTML strings), `tileAnswers[]` (0-indexed correct indices). Supports `svg:` field for SVG rendering. |
| `fraction` | `types/fraction.njk` | Visual fraction representation — shade a shape. Fields: `shape` (`circle`/`rect`), `numerator`, `denominator`, `answer`. |
| `fraction-check` | `types/fraction-check.njk` | Stacked fraction input (numerator/denominator boxes). Fields: `answers[]` (two strings: numerator, denominator). Supports `cur.operation` and `cur.svg`. |
| `base-10` | `types/base-10.njk` | Base-10 blocks visual — decompose a number into hundreds/tens/ones. Fields: `answer`, plus either `number` or `hundreds`+`tens`+`ones`. |
| `error-analysis` | `types/error-analysis.njk` | Find the mistake — click the wrong step in a worked calculation, then type the correction. Fields: `steps[]` (strings), `wrongStep` (0-indexed), `correction` (correct value as string). |
| `clock` | `types/clock.njk` | Analog clock — read or set the time. Fields: `hour`, `minute`, `answer`. |
| `click-blocks` | `types/click-blocks.njk` | Click cells to fill columns from the bottom up (place-value blocks). Fields: `columns[]` (each with `label`, `value`, `color`, `answer`, `max`). Supports generators. |
| `number-line` | `types/number-line.njk` | Number line — read a labeled point or click to place one. SVG via `nlSvg` getter. Supports generators. |
| `coordinate-grid` | `types/coordinate-grid.njk` | Coordinate grid — read (x ; y) for a labeled point, or click to place one. SVG via `coordinateGridSvg` getter. Supports generators. |
| `bar-chart` | `types/bar-chart.njk` | Bar chart — build mode (click cells to set bar heights) or read mode (static bars + answer inputs). Fields: `bc` object with chart config. Supports generators. |
| `calc-chain` | `types/calc-chain.njk` | Calculation chain — series of linked operations, fill in the blanks. Supports `cur.svg` and generators. |
| `column-op` | `types/column-op.njk` | Column operation (addition/subtraction). Multi-digit numbers aligned by place value; student fills in result digits. |
| `inverse-problem` | `types/inverse-problem.njk` | Inverse problems (Russie method) — base problem + derived variations. Fields: base operation + inverse operations array. |
| `number-hunt` | `types/number-hunt.njk` | Click numbers 1..N in order; emoji sits in center cell. Fields: `grid[]`, `cols`, `count`, `emoji`. Supports generators. |
| `count-objects` | `types/count-objects.njk` | Scattered emoji SVG — type the total count. Fields: `count`, `emoji`. Supports generators. |
| `emoji-equations` | `types/emoji-equations.njk` | Emoji equation system — deduce each emoji's value line by line, answer the last line (e.g. 🍎+🍎+🍎=12, 🍎+🍌=5, 🍌=?). Fields: `eqLines[]` (strings `"🍎 + 🍌 = 5"`, split on the last `=`), `eqQuestion` (left side of the question line), `answer`. Generator `equationsEmojis` (params: `unknowns` 2|3, `min`, `max`, `mult`, `ask` value/sum/priority). |
| `number-forms` | `types/number-forms.njk` | Several writings of one number — target on the left, arrow fan, one row per writing with a blank anywhere (`40 = ? × 5 / 9 + ? / 100 − ? / ? : 2`). Fields: `target`, `forms[]` (strings with one `?`), `answers[]` optional (auto-solved at build time by bisection). Reuses `seqInputs`/`seqErrors`. Generator `ecrituresNombre` (params: `level` cm1/cm2, `targets`). |
| `op-triangle` | `types/op-triangle.njk` | Operator diagram — A →(op a)→ B →(op b)→ C plus the shortcut A →(op a·b)→ C (7 ×10→ 70 ×10→ 700, 7 ×100→ 700). Blanks on nodes and/or operator numbers; reuses `seqInputs`/`seqErrors`. Generator-only: `triangleOperateurs` (params: `op` mult/div/mixed, `pairs` [[a, b]…], `startMin`, `startMax`, `decimals`, `blanks` nodes/op/reverse/mixed). |
| `compare-groups` | `types/compare-groups.njk` | Two scattered emoji groups — click Autant / Plus / Moins. Fields: `groupA`, `groupB`, `answer`. Supports generators. |
| `magic-color` | `types/magic-color.njk` | Pixel-art coloriage magique — paint cells matching a rule (e.g. multiples). Fields: `grid`, `palette`. Supports generators. |
| `tri-arith` | `types/tri-arith.njk` | Arithmetic triangle — vertices and edges are linked by addition; fill in the missing values. Fields: `givenV[]`, `givenE[]`, `answers[]`. Supports generators. |
| `decimal-triple` | `types/decimal-triple.njk` | Three-way decimal representation — fraction décimale, tableau de chiffres (place values), nombre décimal. One representation is shown as given; student fills in the other two. Fields: `dtGiven` (`fraction`/`decimal`/`places`), `dtFrac` (`{num, den}`), `dtDecimal` (string, comma notation), `dtPlaces` (5-element array `[dizaines, unites, dixiemes, centiemes, milliemes]`, null = column hidden). Supports generators. |

Shared verify button for sequence/bounding/convert: `types/seq-verify.njk`.
Templates without exercise files yet (not covered by layout-health): `fraction-paint`, `svg-tiles`.

## Timed Challenges (Défis)

Timed challenges live under `src/fr/defis/` (same nested structure as `exercices/`). They use a separate layout and Alpine component designed for fluency practice.

### Structure

Each défi series has the same `index.yaml` as a regular series **plus** a required `duration` field (seconds):

```yaml
id: a2b3c4d5
title: "Tables de multiplication"
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
- `src/_pages/defi-pages.njk` — pagination template generating pages at `/fr/defis/{id}/`
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

### 7b. Solver for the solvability test
Add an entry for the type in `S = { … }` in `tests/e2e/solve.spec.js`: write the correct answer into the player state (the fields the partial binds to) and call the validation the UI calls; with `w = true`, write a wrong answer instead. Then run `npm run check`. Types without a solver are listed as "not covered" at the end of the check.

### 8. Documentation
- Add a row to the **Exercise Types** table above.
- Add new YAML fields to the **Front-Matter Schema** section below.

### `operation` string conventions (`number-check` / generators)

The `operation` field is parsed into visual parts by the `trouParts` getter. Numbers and text alternate as separate flex items. To keep words and numbers together (no line-break between them), use `__` as a **non-breaking space glue**:

```javascript
// Bad: "6 dizaines et 5 unités = ?" — "6" wraps to its own line
operation: `6 dizaines et 5 unités = ?`

// Good: the whole phrase becomes one non-breaking flex item
operation: `6__dizaines__et__5__unités__=__?`
```

`__` is replaced with `&nbsp;` and the whole segment is kept atomic. Use it whenever a number appears mid-phrase (e.g. unit phrases, equality statements).

## Adding a New Generator

1. Add the generator to the topic module in `src/assets/js/generators/` that matches the content folder it serves (e.g. `operations.js` for `maths/operations/`). Shared helpers come from `_core.js` — add a helper there only if several modules need it, and list it in the module destructuring at the top. A new module must be added to `MODULES` in `generators/index.js` (load order).
2. Generators must return seriesPlayer-compatible items:
   ```javascript
   { type: 'number-check', operation: '5 + 3', answers: ['8'] }
   ```
3. Create an `.md` file in `src/fr/applications/{series}/` with:
   ```yaml
   type: number-check
   generator: "yourGenerator"
   repeat: 10
   params:
     min: 1
     max: 100
   ```
4. **The front-matter `type` must be the type the generator returns.** The page only includes the partials of front-matter types, so a mismatch renders a blank exercise. `npm run validate:exercises` runs every generator 20× with the file's `params` and fails on: unknown generator, exception, `NaN`/`undefined`/`Infinity` in the output, `svg.gen` helper missing from `svg.js`, or a type mismatch.

## SVG Generation Helpers (svg.js)

Functions in `src/assets/js/svg.js` (loaded on series pages that need SVG):

| Function | Purpose |
|----------|---------|
| `embedSvg(svg)` | Identity function — returns its argument. Used for build-time embedded SVGs. |
| `mathGridSvg(cols, rows, filled, color)` | Rectangular grid with filled/empty cells. |
| `slicedPieSvg(n, k, size, color)` | Pie chart with `k` of `n` slices filled. Optimized: 2dp rounding, `<g>` wrapper for shared stroke. |
| `moneySvg(items)` | Euro notes (5–200 €) and coins (1 c–2 €), `items` in cents, any order: notes row(s) then coins, real colours and proportions, `aria-label` listing the content. Used by generator `porteMonnaie` (`multi-question`: euros, centimes, total; params `notes`, `euroCoins`, `cents` in cents, `minNotes`/`maxNotes`, `maxEuroCoins`, `minCents`/`maxCents`, `carryRate`) and `rendreMonnaie` (`number-check` `? € ? c`: « Léa a acheté … pour 8 € 20 c, elle paye avec un billet de 10 € » — names and items are fixed lists in the generator; params `notes`, `step`, `smallestNote`). Related, no SVG: `centimesEnEuros` (`number-check` `240 c = ? € ? c`; params `min`, `max`, `step`, `trickyRate` — share of « 305 c » / « 400 c » cases). |

Note: `.eleventy.js` has a build-time duplicate of `slicedPieSvg` for pre-rendering. Keep both in sync.

## Build-time vs Client-side SVG: Decision Criteria

Use **build-time SVG** (generated in `.eleventy.js`, embedded in the HTML payload) when:
- The SVG is **static** — it doesn't depend on runtime state or random generation.
- The SVG is **shared** across many exercises (e.g. a file from `_includes/svg/` via `gen: file`).
- The SVG is **small** (a few hundred bytes max per exercise).

Use **client-side SVG** (generated in `generators/*.js` or `svg.js`, called from Alpine templates) when:
- The SVG depends on **exercise-specific data** that varies per exercise (e.g. a number to decompose).
- The SVG is **parameterized** and the same function is called with different values across many exercises in a series.
- Generating it at build time would **bloat** the HTML payload (rule of thumb: if a single series page with ~10 exercises would exceed ~15–20 kB of SVG, move it to runtime).

**Anti-pattern to avoid**: pre-generating large parametric SVGs at build time and embedding them inline. This was the root cause of 90 kB+ HTML files for `base-10` exercises — each number produced a full SVG block, multiplied across every exercise in every series. The fix was a `base10Render()` function called client-side via Alpine `x-data`.

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
sortKeepOrder: true        # sort — items are names in the correct order (not numbers)
sortLabels: ["le plus cher", "le moins cher"]  # sort — ends of the direction arrow
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
eqLines:                   # emoji-equations — "lhs = rhs" strings, solvable top to bottom
  - "🍎 + 🍎 + 🍎 = 12"
  - "🍎 + 🍌 = 5"
eqQuestion: "🍌"          # emoji-equations — left side of the question line (answer: 1)
target: 40                 # number-forms — the number on the left
forms: ["? × 5", "9 + ?", "100 − ?", "? : 2"]  # number-forms — one "?" each; answers auto-computed
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
title: "Additions simples"
difficulty: facile         # facile, moyen, difficile
# level, topic, subtopic are derived from directory path:
# src/fr/exercices/{level}/maths/{subtopic}/{leaf}/
```

## Example Series

### Perimeter on grid (`perimetre-quadrillage`)
Location: `src/fr/exercices/cm1/maths/mesures/perimetre-quadrillage/`
Uses `shape-on-grid-*.svg` files via `gen: file` pattern. Students count grid units around a shape.

### Perimeter of composite figures (`perimetre-figures`)
Location: `src/fr/exercices/cm1/maths/mesures/perimetre-figures/`
Uses `l-shape-perimeter.svg`, `t-shape-perimeter.svg`, etc. Students calculate perimeter from labeled dimensions.

### Axes of symmetry (`axes-symetrie-01`)
Location: `src/fr/exercices/cm1/maths/geometrie/axes-symetrie-01/`
Uses `symmetry-line-*.svg` files. Students count how many lines of symmetry a figure has.

### Symmetry axis identification (`symetrie-axe-01` through `symetrie-axe-03`)
Location: `src/fr/exercices/cm1/maths/geometrie/symetrie-axe-01/` (and 02, 03)
Uses `sym-axis-*.svg` files. Students identify which drawn line is the correct axis of symmetry.
