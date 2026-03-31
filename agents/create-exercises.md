# Invoking an Agent for Exercise Creation

Copy-paste one of these prompts to start an exercise creation session.

---

## Standard prompt

```
You are creating exercises for Le Cahier de Mélimée. Follow agents/content.md for all conventions.

Before writing any file, run:
  node scripts/list-series.js --level <level> --cat <category>   # check what already exists
  node scripts/show-type.js <type>                               # get schema + template + live example

Then create:
  src/fr/exercices/<level>/maths/<category>/<slug>/index.yaml
  src/fr/exercices/<level>/maths/<category>/<slug>/01-<desc>.md
  ... (5 exercises total)

After writing files, run:
  npm run generate:ids
  npm run validate:exercises

Fix any validation errors before stopping.

Task: <describe what to create>
```

---

## Examples of ready-to-use prompts

### Add a new topic at one level

```
You are creating exercises for Le Cahier de Mélimée. Follow agents/content.md.

Before writing, run:
  node scripts/list-series.js --level ce2 --cat geometrie
  node scripts/show-type.js true-false

Create: src/fr/exercices/ce2/maths/geometrie/triangles-proprietes-01/
5 exercises (type: true-false) on triangle properties at CE2 level.

After writing: npm run generate:ids && npm run validate:exercises
```

### Fill a type gap across levels

```
You are creating exercises for Le Cahier de Mélimée. Follow agents/content.md.

Run first:
  node scripts/list-series.js --missing
  node scripts/show-type.js pyramid

Create one pyramid series per level where it is missing.
Check each level first: node scripts/list-series.js --level <level> --type pyramid

After all files: npm run generate:ids && npm run validate:exercises
```

### Extend an existing topic

```
You are creating exercises for Le Cahier de Mélimée. Follow agents/content.md.

Run first:
  node scripts/list-series.js --level cm1 --cat problemes
  node scripts/show-type.js multi-question

Create src/fr/exercices/cm1/maths/problemes/modelisation-02/
5 multi-question exercises on reading data tables, difficulty: difficile.
Vary the scenario (distances, prix, températures, horaires, scores).

After writing: npm run generate:ids && npm run validate:exercises
```

---

## Checklist the agent must follow

- [ ] `list-series` before writing — no duplicates
- [ ] `show-type` before writing — correct schema
- [ ] `index.yaml` has `title` + `difficulty`, NO `id`
- [ ] 5 exercises per series
- [ ] Answers are strings (`"42"` not `42`) for text fields
- [ ] `generate:ids` run after all files created
- [ ] `validate:exercises` passes with 0 errors
