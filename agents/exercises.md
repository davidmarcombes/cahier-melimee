# Exercises

## Two Exercise Systems

### 1. Series Player (`seriesPlayer` in app.js)

Multi-exercise sequences grouped in a folder. Each series has:
- `index.yaml` — series metadata (seriesTitle, level, topic, subtopic, difficulty)
- `01-name.md`, `02-name.md`, ... — individual exercises with `type` in front-matter

Layout: `series-player.njk` with per-type partials in `src/_includes/types/`.

### 2. Challenge Player (`challengePlayer` in app.js)

Random operation generators (défis). Single `.md` file with config in front-matter.

Layout: `challenge-player.njk`.

## Exercise Types (Series)

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

## Front-Matter Schema

### Series exercise (`.md` in a series folder)

```yaml
---
type: "number-check"      # Exercise type (see table above)
title: "Calcule"           # Display title
answer: 42                 # Expected answer (number or string)
# Type-specific fields:
columns: ["A", "B"]        # logic-grid
rows: ["X", "Y"]           # logic-grid
solution: { A: "X" }       # logic-grid
sequence: [2, null, 6]     # sequence (null = blank)
bounds: [10, 20]           # bounding
statements:                # true-false
  - text: "Assertion"
    answer: true           # true or false
comparisons:               # compare
  - left: 56673
    right: 89939
choices:                   # mcq (shuffled at build time)
  - "correct answer"
  - "wrong 1"
  - "wrong 2"
context: "267 543 109"     # multi-question shared context
questions:                 # multi-question
  - text: "Sub-question?"
    answer: "answer"
---

Markdown body shown as instructions.
```

### Challenge (défi)

```yaml
---
layout: challenge-player
title: "Additions rapides"
operator: "+"              # +, -, *, /
operandA: { min: 1, max: 20 }
operandB: { min: 1, max: 20 }
count: 10
mode: ""                   # "", "trou", or "mixed"
---
```

### Series metadata (`index.yaml`)

```yaml
seriesTitle: "Additions simples"
level: CE1                 # CP, CE1, CE2, CM1, CM2
topic: maths
subtopic: operations
difficulty: facile         # facile, moyen, difficile
```
