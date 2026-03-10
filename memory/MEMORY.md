# Project Memory

## CP Maths — Content Backlog

See `cp-backlog.md` — entirely done (8 batches).

## CE1 Maths — Content Backlog

See `ce1-backlog.md`. Batch 1 done (11 apps). Remaining: static exercises for géométrie/grandeurs.

## Key Patterns

- New series: create `index.yaml` (no id), run `npm run generate:ids`, then `npm run build`
- Sequence front-matter uses top-level `given:` and `answers:` (eleventy wraps into `sequence:` object)
- Bounding front-matter uses top-level `number:` and `answers:`
- Ruler front-matter: `min`, `max`, `divisions`, `markers: [{label, value}]`, `answer`
- Compare front-matter: `comparisons: [{left, right}]`
- Trou (number-check): `operation: "3 + ? = 8"`, `answer: "5"` — use `answer` (singular) for single blank
