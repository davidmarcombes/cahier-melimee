# CE1 Maths — Content Backlog

Curriculum reference: `docs/maths_ce1.md`

## Batch 1 — DONE: Operations applications

### Generators added to generators.js
- `soustractionSimple` — `a - b` where a in [10..99], b in [1..min(a-1, 99)]
- `ajouterSoustraire100` — `n + 100 = ?` or `(n+100) - 100 = ?`

### New CE1 operations apps
- `src/fr/applications/ce1/maths/operations/soustraction-trou/` — soustractionTrou, totals up to 100 (id: cf4da89c)
- `src/fr/applications/ce1/maths/operations/soustraction-simple/` — soustractionSimple (id: a3410763)
- `src/fr/applications/ce1/maths/operations/multiplication-simple/` — multiplicationSimple ×2-×5 (id: 4ae726c4)
- `src/fr/applications/ce1/maths/operations/table-de-2/` — multiplicationSimple minA=maxA=2 (id: d1c6fd94)
- `src/fr/applications/ce1/maths/operations/table-de-3/` — multiplicationSimple minA=maxA=3 (id: cbcd21db)
- `src/fr/applications/ce1/maths/operations/table-de-4/` — multiplicationSimple minA=maxA=4 (id: 01fc2463)
- `src/fr/applications/ce1/maths/operations/table-de-5/` — multiplicationSimple minA=maxA=5 (id: d85624e3)
- `src/fr/applications/ce1/maths/operations/table-de-10/` — multiplicationSimple minA=maxA=10 (id: 52c6ed61)
- `src/fr/applications/ce1/maths/operations/ajouter-100/` — ajouterSoustraire100 (id: 2ad23fe1)

### New CE1 numération apps
- `src/fr/applications/ce1/maths/numeration/comparer-1000/` — comparerNombres max=999 (id: 1aca14c0)
- `src/fr/applications/ce1/maths/numeration/pairs-impairs/` — pairOuImpair max=100 (id: 121a53c7)

## Batch 2 — DONE: Numération + Opérations apps supplémentaires

### Generators added
- `decompositionCentaines` — "N centaines et M dizaines et P unités = ?" for 3-digit numbers
- `compterDeNCE1` — sequences with steps from [2,3,4,5,10] by default, supports `max` param

### New CE1 apps
- `ce1/maths/numeration/decompo-gen/` — decompositionCentaines (id: cf457f3d)
- `ce1/maths/numeration/suites-ce1/` — compterDeNCE1 (id: 488ac8c6)
- `ce1/maths/numeration/arrondir-centaine/` — arrondirNombre order=2 magnitude=3 (id: c4305c95)
- `ce1/maths/operations/ajouter-soustraire-10/` — ajouterSoustraire10 min=1 max=890 (id: e2cfe849)
- `ce1/maths/operations/complements-100/` — complementNombre target=100 (id: 16a90f5f)

## Batch 3 — DONE: Géométrie + Grandeurs static exercises

### Géométrie
- `ce1/maths/geometrie/figures-01/` — MCQ + true-false figures planes (id: 69fc2565)
- `ce1/maths/geometrie/solides-01/` — matching + true-false solides (id: 1c382e0b)
- `ce1/maths/geometrie/angle-droit-01/` — true-false + MCQ angle droit (id: 41912cab)
- `ce1/maths/geometrie/symetrie-01/` — true-false + MCQ symétrie (id: c597c6bf)

### Grandeurs
- `ce1/maths/grandeurs/longueurs-01/` — convert cm↔mm, m↔cm + true-false (id: d81c39ec)
- `ce1/maths/grandeurs/masses-01/` — convert kg↔g + true-false + MCQ (id: df1633b0)
- `ce1/maths/grandeurs/durees-01/` — true-false + convert h→min + MCQ (id: 75220261)

## CE1 backlog entièrement terminé.

### Restant (hors scope actuel)
- Température (thermomètre) — nécessite une interaction visuelle spécifique
- Suites de dessins (géométrie) — nécessite des images
- Se repérer sur quadrillage — nécessite un composant visuel
