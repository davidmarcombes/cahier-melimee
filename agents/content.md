# Content — Adding Exercises

Guide for AI agents creating new exercise series. Read this before writing any files.

---

## Workflow (7 steps)

```bash
# 1. Understand what already exists
node scripts/list-series.js --level ce1            # series for a level
node scripts/list-series.js --level ce1 --cat operations  # narrow by category
node scripts/list-series.js --missing              # types with 0 exercises

# 2. Check the type schema + template + live example
node scripts/show-type.js problem
node scripts/show-type.js multi-question

# 3. Create the series folder
#    src/fr/exercices/{level}/maths/{category}/{slug}/
#    slug = kebab-case, ends with -01 (first series of that topic)

# 4. Create index.yaml (NO id — generate:ids assigns it)
#    seriesTitle: "Human readable title"
#    difficulty: facile | moyen | difficile

# 5. Create exercise files: 01-slug.md, 02-slug.md, ...
#    5 exercises per series is the norm.

# 6. Assign IDs
npm run generate:ids

# 7. Validate
npm run validate:exercises
```

---

## Directory Structure

```
src/fr/exercices/
└── {level}/              # cp | ce1 | ce2 | cm1 | cm2
    └── maths/
        └── {category}/   # see Categories below
            └── {slug}-01/
                ├── index.yaml
                ├── 01-{description}.md
                ├── 02-{description}.md
                └── ...
```

### Categories

| Folder | Contents |
|--------|----------|
| `numeration` | Reading/writing/decomposing numbers |
| `operations` | Addition, subtraction, multiplication, division |
| `calcul` | Mental arithmetic, calc-chain |
| `nombres` | Comparing, ordering, rounding |
| `fractions` | Fractions (all types) |
| `mesures` | Lengths, masses, volumes, temperatures |
| `grandeurs` | Time, money, calendar |
| `geometrie` | Shapes, angles, symmetry, coordinates |
| `problemes` | Word problems (Vergnaud classes) |
| `logique` | Logic grids, sequences, patterns |
| `donnees` | Data, charts, statistics |

### Naming conventions

- Folder: `topic-variant-01` → `calcul-reflechi-01`, `division-sens-01`
- Files: `01-short-description.md` (kebab-case, ~3 words max)
- `seriesTitle`: French, human-readable, quoted if it contains colons

---

## index.yaml

```yaml
seriesTitle: "Titre humain de la série"
difficulty: facile          # facile | moyen | difficile
```

Do **not** add `id:` — `npm run generate:ids` assigns it.

For timed challenges (`src/fr/defis/`), add:
```yaml
duration: 90                # seconds
```

---

## Exercise File Format

Each `.md` file is one exercise. Front-matter defines the type and data; the Markdown body (optional) adds context shown above the exercise.

```markdown
---
type: problem
class: "A2.1"     # Vergnaud code (Word problem)
# class: "S1.1.1" # OR Skill code (if not a word problem)
title: "Le titre affiché"
answer: "42"
---

Texte du problème en **markdown**.
```

### Common optional fields (any type)

| Field | Effect |
|-------|--------|
| `title` | Shown as the exercise question/instruction |
| `class` | Pedagogical code (Vergnaud for problems, Skill for others) — see [docs/classification.md](docs/classification.md) |
| `svg` | Inline SVG via helper: `gen: clockSvg`, `par: {hour:10, minute:0}` |
| `svg: {gen: file, src: "svg/grid.svg"}` | Embed a static SVG file from `_includes/` |
| `operation` | LaTeX or text shown left of the input (number-check) |
| `mode` | Type-specific variant (e.g. `read`/`place` for coordinate-grid) |

---

## Type Reference

Run `node scripts/show-type.js <type>` for the full template and live examples from the codebase.

Quick table — required fields only:

| Type | Required fields | Notes |
|------|----------------|-------|
| `number-check` | `answer` OR `answers` OR `generator` | Default type if omitted |
| `problem` | `answer` | Body = problem text in markdown |
| `matching` | `pairs[]` (left, right) | |
| `pyramid` | `pyramid[][]` (2D, null=blank) | |
| `sequence` | `given[]`, `answers[]` | null in given = visible blank |
| `bounding` | `number`, `answers[min,max]` | |
| `convert` | `items[]` (prompt, answer) | |
| `logic-grid` | `columns[]`, `rows[]`, `solution{}` | solution: {row: column} |
| `true-false` | `statements[]` (text, answer:bool) | |
| `compare` | `comparisons[]` (left, right) | Player cycles <, >, = |
| `multi-question` | `questions[]` (text, answer) | Body = shared context |
| `mcq` | `answer`, `choices[]` | Choices shuffled at runtime |
| `fraction` | `shape`, `numerator`, `denominator`, `answer` | shape: circle\|rect |
| `clock` | `hour`, `minute`, `answer` | answer: "HH:MM" |
| `sort` | `items[]` | Items in CORRECT order — shuffled at runtime |
| `drag-sort` | `tiles[]` | Tiles in CORRECT order, direction: asc\|desc |
| `fill-table` | `headers[]`, `rows[][]`, `answers[][]` | Use "?" to mark blanks |
| `checkbox` | `statements[]`, `checkedAnswers[]` | checkedAnswers = 0-indexed |
| `select` | `choices[]`, `statements[]` (template, answer) | `___` = dropdown placeholder |
| `tile-select` | `tiles[]`, `tileAnswers[]` | tileAnswers = 0-indexed correct |
| `fraction-check` | `answers[numerator, denominator]` | Or single `answer: "n/d"` |
| `ruler` | `min`, `max`, `divisions`, `markers[]` | markers[].label + .value |
| `number-line` | `min`, `max`, `answer` | Optional: `step` |
| `coordinate-grid` | `answer` | mode: read\|place, cols, rows, points[] |
| `bar-chart` | `labels[]`, `values[]`, `yMax`, `yStep` | |
| `calc-chain` | `start`, `steps[]` (op, value, answer) | |
| `base-10` | `answer`, `number` OR `hundreds`+`tens`+`ones` | |

### Types NOT yet usable (no exercises / not wired)

`base-10`, `click-blocks`, `seq-verify`, `svg-tiles`, `fraction-paint`,
`number-hunt`, `compare-groups`, `count-objects`, `column-op` (template not wired into series-player).

---

## Vergnaud Problem Classes

For `problem` type, set `class:` to one of:

| Code | Type | Example |
|------|------|---------|
| A1.1 | Composition → Tout | Lou a 5 billes, Léa en a 3. Combien en tout ? |
| A1.2 | Composition → Partie | 8 billes en tout. Lou en a 5. Léa en a ? |
| A2.1 | Transformation + → État final | J'ai 6 billes, j'en gagne 4. J'en ai ? |
| A2.2 | Transformation − → État final | J'ai 10 billes, j'en perds 3. J'en ai ? |
| A2.3 | Transformation → Transformation inconnue | J'avais 6, j'en ai 10. J'en ai gagné ? |
| A2.4 | Transformation → État initial | J'ai 10 billes après en avoir gagné 4. J'en avais ? |
| A3.1 | Comparaison → Écart | Lou a 5, Léa en a 8. Combien de plus ? |
| A3.2 | Comparaison → État comparé | Lou a 3 de moins que Léa qui en a 8. Lou en a ? |
| A3.3 | Comparaison → Référent | Lou a 5, c'est 3 de moins que Léa. Léa en a ? |
| A4.1 | Bilan + | +4 puis −1 = ? |
| A4.2 | Bilan − | −3 puis +5 = ? |
| M1.1 | Produit cartésien | 3 hauts × 2 bas = ? tenues |
| M1.2 | Division partage | 24 billes pour 4 amis. Chacun en a ? |
| M1.3 | Division groupement | 24 billes, 6 par sac. Combien de sacs ? |
| M2.1 | Comparaison multiplicative → Produit | Lou en a 3×. Léa en a 5. Lou en a ? |
| M2.2 | Comparaison multiplicative → Quotient | Lou en a 15, Léa en a 5. Combien de fois plus ? |
| M3.1 | Proportionnalité simple | 3 stylos coûtent 6 €. 7 stylos coûtent ? |
| M3.2 | Combinatoire | 3 couleurs × 2 formes = ? combinaisons |

---

## Tips for Efficient Content Creation

- **5 exercises per series** — the standard. Vary difficulty within the series (start easy, end harder).
- **Consistent answers** — always strings in YAML (`answer: "42"` not `answer: 42`) for text types. Numbers are fine for clock/fraction fields.
- **Body text** — use for `problem` and `multi-question`. Keep it concise (1–3 lines). Bold the key numbers.
- **Avoid answer ambiguity** — if multiple phrasings are valid, use `answers: ["6", "six"]`.
- **Check existing series** before creating — run `node scripts/list-series.js --level {level} --cat {cat}` to avoid duplication.
- **Validate immediately** — `npm run validate:exercises` after writing files; fix errors before moving on.

---

## Multi-exercise files vs separate files

Both patterns are valid:

**Separate files** (preferred for `problem`, `matching`, `true-false`):
```
01-bonbons-lou-lea.md
02-oiseaux.md
03-crayons.md
```

**Single file with `---` separators** (used for `clock`, `sequence`, `coordinate-grid`):
```markdown
---
type: clock
hour: 10
minute: 0
answer: "10:00"
---

---
type: clock
hour: 14
minute: 30
answer: "14:30"
---
```

Use separate files when exercises have individual markdown bodies (problem text, context).
Use a single file when exercises are pure data with no body.
