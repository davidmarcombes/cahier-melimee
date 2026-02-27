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

Shared verify button for sequence/bounding/convert: `types/seq-verify.njk`.

## Adding a New Exercise Type

1. Create `src/_includes/types/your-type.njk` — the visual partial
2. Add conditional include in `series-player.njk`:
   ```njk
   {% if 'your-type' in usedTypes %}{% include "types/your-type.njk" %}{% endif %}
   ```
3. Add state, methods, and `check()` branch in `app.js` `seriesPlayer`
4. Add type handling in `.eleventy.js` `seriesPayload` filter if needed
5. Create sample content in `src/fr/exercices/`

## Adding a New Generator

1. Add the generator function in `src/assets/js/generators.js` (single source for both build and runtime)
2. Generators must return seriesPayload-compatible items:
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

## Front-Matter Schema

### Static exercise (`.md` in a series folder)

```yaml
---
type: "number-check"      # Exercise type (see table above)
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
