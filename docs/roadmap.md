# Roadmap — Couverture du programme CP→CM2

> Mis à jour le 2026-10-25. Comptage des séries (exercices + applications + défis), classées par dossier de catégorie sous `maths/`.
> Légende : ✅ couvert · ⚠️ partiel · ❌ absent · 🔥 priorité haute

---

## Plan couverture 2026-10 (programmes 2024–2025)

> Ajouté le 2026-10-26. Base de régression : `npm run regress -- avant-couverture-2026-10`. Programmes : compléments ajoutés en fin de `docs/maths_cp.md` … `docs/maths_cm2.md`. Les sections plus bas restent pour l'historique (la section CM2 date d'avant ses 99 séries).

### Phase 1 — contenu avec les types existants (aucun changement moteur)

Bilan et reste à faire : [plan-phase-1.md](plan-phase-1.md).

| # | Lot | Niveau | Statut |
|---|-----|--------|--------|
| 1.1 | Géométrie CM2 : triangles, quadrilatères (trapèze, pentagone, hexagone), cercle, solides (prisme, perspective, patrons), parallèles / perpendiculaires, symétrie, angles sans rapporteur | CM2 | ✅ 7 séries (2026-10-26) : `figures-planes-01`, `triangles-01`, `cercle-01`, `solides-01`, `paralleles-perpendiculaires-01`, `angles-01`, `programmes-construction-01` — symétrie sur quadrillage en phase 2 |
| 1.2 | Fractions CE1 (nouveau) : fractions unitaires 1/2 … 1/10, numérateur / dénominateur, comparer (même dénominateur, numérateur 1), additionner / soustraire même dénominateur | CE1 | ✅ 4 séries (2026-10-26) : `fractions-unitaires-01`, `numerateur-denominateur-01`, `comparer-fractions-01`, `ajouter-fractions-01` |
| 1.3 | Couleurs (presque des maths) : GS mélanges primaires → secondaires (voix) ; CE logique roue chromatique ; CM proportions de peinture (tableau de proportionnalité), dénombrement des mélanges | GS → CM2 | ✅ 4 séries (2026-10-26) : GS `melanger-couleurs-01` (voix), CE2 `roue-couleurs-01`, CM1 `melanges-peinture-01`, CM2 `melanges-couleurs-01` |
| 1.4 | Calcul CM2 2025 : décimal × entier posé, division décimale (diviseur 1 chiffre), parenthèses, arrondi à l'entier, ×5 / ×50 d'un décimal | CM2 | ✅ (2026-10-26) générateurs `multiplierDecimalParEntier`, `calculParentheses`, `arrondirDecimal` ; séries CM2 `multiplier-decimal-entier-01`, `multiplier-par-5-et-50-01`, `parentheses-01`, `arrondir-decimal-01` + CM1 `parentheses-01`, `multiplier-decimal-entier-01`, `arrondir-decimal-01`. Décimal × entier **posé** (column-op) reste à faire |
| 1.5 | Monnaie CP / CE1 (euros, centimes, écriture à virgule), heure entière CP | CP, CE1 | ✅ (2026-10-26) générateur `compterEuros` ; CP `heures-entieres-01`, `compter-euros-01`, `monnaie-01` ; CE1 `euros-centimes-01`, `centimes-en-euros-01`, `ecriture-virgule-01` |
| 1.6 | Données à chaque niveau : tableau à double entrée (CP→), courbe (CM1), diagramme circulaire (CM2) | CP → CM2 | ✅ (2026-10-26) CP + CE1 `tableaux-01`, CM1 `courbes-01`, CM2 `diagrammes-circulaires-01` (SVG en ligne) |
| 1.7 | Probabilités CM1 / CM2 : impossible / possible / certain, « a chances sur b » (`mcq`, `classify`, `sort`) | CM1, CM2 | ✅ (2026-10-26) CM1 `donnees/hasard-01`, CM2 `donnees/probabilites-01` (rangées dans `donnees` : pas de topic probabilités). Version en images (lot 2.5, 2026-10-27) : CM1 `donnees/hasard-images-01`, CM2 `donnees/probabilites-images-01` |
| 1.8 | Algèbre : égalités à trous « 178 − … = 6 × 8 », programmes de calcul, motifs évolutifs (étape n) | CM1, CM2 | ✅ (2026-10-26) CM1 `egalites-trous-01`, `programmes-calcul-01` ; CM2 `programmes-calcul-01`, `logique/motifs-evolutifs-01` |
| 1.9 | Défis hors calcul (numération, conversions, heure, fractions) | CE1 → CM2 | ✅ (2026-10-26) 6 défis : arrondis CE2/CM1, conversions CM1/CM2, moitié-tiers-quart CE2, × ÷ 10/100/1 000 CM1. + lire l'heure CE2/CM1 (horloge dans le lecteur chronométré) |

### Phase 2 — nouveaux types / générateurs

Voir [plan-phase-2.md](plan-phase-2.md) : codage de déplacements, symétrie sur quadrillage, figures dans toute orientation, angles SVG, probabilités visuelles, manipulations GS — ✅ phase terminée (2026-10-27).

### Phase 3 — équilibre

Voir [plan-phase-3.md](plan-phase-3.md) : recomptage, difficulté (`difficile` CP / CE1, `facile` CM2), formats visuels, validation à la main CE2 / CM1.

### Phase 4 — tracer, solides, aires

Voir [plan-phase-4.md](plan-phase-4.md) : tracer sur quadrillage / papier pointé (✅ 4.1, 2026-10-27), assemblages de cubes et patrons, aire par pavage.

---

## Carte des séries par niveau et catégorie

| Niveau | Calcul | Décimaux | Données | Fractions | Géométrie | Logique | Mesures | Numération | Problèmes | Proportions | Total |
|--------|-------:|---------:|--------:|----------:|----------:|--------:|--------:|-----------:|----------:|------------:|------:|
| GS     | 3 | 0 | 0 | 0 | 3 | 6 | 2 | 20 | 8 | 0 | 42 |
| CP     | 32 | 0 | 3 | 0 | 8 | 3 | 8 | 34 | 8 | 0 | 96 |
| CE1    | 75 | 0 | 4 | 5 | 11 | 5 | 12 | 29 | 22 | 0 | 163 |
| CE2    | 88 | 0 | 4 | 11 | 15 | 14 | 25 | 47 | 29 | 0 | 233 |
| CM1    | 86 | 20 | 9 | 38 | 15 | 24 | 28 | 32 | 40 | 5 | 297 |
| CM2    | 39 | 9 | 4 | 9 | 10 | 9 | 16 | 13 | 14 | 6 | 129 |
| **Total** | **323** | **29** | **24** | **63** | **62** | **61** | **91** | **175** | **121** | **11** | **960** |

> Recompté le 2026-10-27 (phase 3.1, puis 3.2) depuis `reports/exercises-report.csv` : exercices + applications + défis.

| Niveau | Facile | Moyen | Difficile |
|--------|-------:|------:|----------:|
| GS     | 27 | 14 | 1 |
| CP     | 60 | 27 | 9 |
| CE1    | 72 | 80 | 11 |
| CE2    | 86 | 123 | 24 |
| CM1    | 55 | 175 | 67 |
| CM2    | 13 | 69 | 47 |

| Niveau | Santé globale | Priorité |
|--------|---------------|----------|
| GS     | — | — |
| CP     | ✅ bon socle | Soustractions posées (non prioritaire) |
| CE1    | ✅ complet | — |
| CE2    | ✅ le plus complet | — |
| CM1    | ✅ très complet | — |
| CM2    | ✅ socle complet depuis la phase 1 | `facile` : un par thème depuis la phase 3.2 |

---

## CP — Gaps par domaine

### Nombres et calculs

| Thème programme | État | Manque / À faire |
|----------------|------|-----------------|
| Compter, collections, 100 | ✅ | count-objects, number-hunt, compter-de-n |
| Paires/impaires | ✅ | — |
| Décomposer (dizaines/unités) | ✅ | base-10, number-check |
| Comparer / ordonner | ✅ | compare, drag-sort |
| Suites de nombres | ✅ | sequence |
| Arrondir à la dizaine | ✅ | — |
| **Tables d'addition (0→9)** | ✅ | `tables-addition-01` (tables 1–5, 2026-03-19) |
| **Compléments à 10** | ✅ | number-check |
| **Doubles et moitiés** | ✅ | — |
| **Additions posées sans/avec retenue** | ✅ | `pose-addition-01` + `pose-addition-02` |
| **Soustractions posées** | ❌ | `column-op` à créer pour CP (non prioritaire) |
| Additions/soustractions à trou | ✅ | — |
| **Approche multiplication (addition réitérée)** | ✅ | `mult-intro-01` + `mult-intro-02` (calculer N×M) + `mult-intro-03` (groupes→multiplication, 2026-03-20) |
| **Décomposer un nombre (arbre)** | ✅ | `liens-numeriques-01` (decompTreeSvg, number-bond, 2026-03-20) |
| **Suites logiques figurales** | ✅ | `suites-figurales-01` (mcq, patterns AB→AABB, 2026-03-20) |

### Grandeurs et mesures

| Thème programme | État | Manque / À faire |
|----------------|------|-----------------|
| **Longueurs (règle, comparer)** | ✅ | `longueurs-01` (ruler + mcq) |
| **Durées et dates** | ✅ | `durees-01` (mcq + matching) |
| **Température (thermomètre)** | ✅ | `temperature-01` (ruler + matching + mcq) |

### Géométrie

| Thème programme | État | Manque / À faire |
|----------------|------|-----------------|
| Figures planes | ✅ | mcq |
| Solides | ✅ | matching/true-false |
| **Se repérer sur quadrillage** | ✅ | `quadrillage-lire-01` (coordinate-grid 3×3, 2026-03-21) |
| **Suite de dessins** | ✅ | `suites-dessins-01` (`number-strip` à emojis, phase 3.2) |
| **Axe de symétrie** | ✅ | `symetrie-01` (true-false + mcq, 2026-03-19) |

---

## CE1 — Gaps par domaine

### Nombres et calculs

| Thème programme | État | Manque / À faire |
|----------------|------|-----------------|
| Numération jusqu'à 1 000 | ✅ | — |
| Comparer/ordonner jusqu'à 1 000 | ✅ | — |
| Suites | ✅ | — |
| Tables d'addition complètes (1→11) | ✅ | — |
| Additions posées | ✅ | `pose-addition-01` (3 chiffres) |
| Soustractions posées | ✅ | `pose-soustraction-01` |
| Additions/soustractions à trou | ✅ | — |
| **Tables de multiplication 1→5** | ✅ | — |
| **Multiplier par multiple de 10** | ✅ | `mult-multiples-10-01` (2×10→3×30, 2026-03-20) |
| **Approche division (partage)** | ✅ | `division-partage-01` (problem, M1.2) |
| **Calcul réfléchi** | ✅ | `calcul-reflechi-01` (passage par 10) + `calcul-reflechi-02` (calc-chain 2 étapes, 2026-03-20) |
| **Décomposer un nombre (arbre)** | ✅ | `liens-numeriques-01` (decompTreeSvg, 2026-03-20) |
| **Suites logiques figurales** | ✅ | `suites-figurales-01` (mcq, 2026-03-20) |

### Grandeurs et mesures

| Thème programme | État | Manque / À faire |
|----------------|------|-----------------|
| Longueurs (convertir m/dm/cm) | ✅ | convert |
| Masses | ✅ | convert |
| Durées | ✅ | — |
| **Lire l'heure complète** | ✅ | `heure-02` (quarts + 5 min, 6 exercices) |
| **Monnaie** | ✅ | — |

### Géométrie

| Thème programme | État | Manque / À faire |
|----------------|------|-----------------|
| Figures planes | ✅ | — |
| Solides | ✅ | — |
| Angle droit | ✅ | — |
| Symétrie | ✅ | — |
| **Se repérer sur quadrillage (coordonnées)** | ✅ | `quadrillage-lire-01` + `quadrillage-placer-01` (grille 4×4, 2026-03-19) |

### Problèmes

| Thème | État | À faire |
|-------|------|---------|
| Problèmes à une étape (A1→A3, M1) | ✅ | A1.1, A1.2, A2.1–A2.4, A3.1, A3.2 (×2), A3.3 (×2), M1.2 |
| **Approche division (partage)** | ✅ | `division-partage-01` (M1.2) |
| **Problèmes à deux étapes** | ✅ | `problemes-2-etapes-01` (multi-question, 5 ex) |

---

## CE2 — Gaps par domaine

### Nombres et calculs

| Thème programme | État | Manque / À faire |
|----------------|------|-----------------|
| Numération jusqu'à 10 000 | ✅ | — |
| Tables de multiplication 0→10 | ✅ | — |
| **Tables 6→9 (fluency)** | ✅ | — |
| Additions/soustractions posées | ✅ | `pose-addition-01` + `pose-soustraction-01` |
| Multiplications posées (2×1, 3×1) | ✅ | `multiplications-posees-01` (column-op ×) |
| **Droite graduée** | ✅ | `droite-graduee-01` (0–100 step 10, 0–1000 step 100, 2026-03-19) |
| **Calcul réfléchi** | ✅ | `calcul-reflechi-01` + `calcul-reflechi-02` (calc-chain 3 étapes, 2026-03-20) |
| **Division (sens, partage/groupement)** | ✅ | `division-sens-01` (problem M1.2 + M1.3, 2026-03-21) |
| **Décomposer un nombre (arbre)** | ✅ | `liens-numeriques-01` (decompTreeSvg, 2026-03-20) |
| **Suites logiques figurales** | ✅ | `suites-figurales-01` (mcq, 2026-03-20) |
| **Ordre de grandeur** | ✅ | mcq estimation |
| **Compléments à 10 et 100** | ✅ | — |

### Fractions

| Thème programme | État | Manque / À faire |
|----------------|------|-----------------|
| Demi, tiers, quart | ✅ | fraction |
| Fractions : parties d'un groupe | ✅ | `fractions-parties-groupe-01` |
| Lire/écrire fractions simples | ✅ | `ecrire-fraction-01` |

### Grandeurs et mesures

| Thème programme | État | Manque / À faire |
|----------------|------|-----------------|
| Lire l'heure | ✅ | clock + matching |
| Durées (calcul) | ✅ | `durees-calcul-01` (heure fin/début, durée) |
| Longueurs (convertir) | ✅ | — |
| Masses | ✅ | — |
| Contenances | ✅ | — |
| **Périmètre carré/rectangle** | ✅ | `perimetre-01` (carré, rectangle, triangle, côté inconnu, 2026-03-19) |
| **Monnaie (rendre la monnaie)** | ✅ | — |

### Résolution de problèmes

| Thème | État | À faire |
|-------|------|---------|
| Problèmes à 1 étape (A2, A3, M1) | ✅ | A2.3–A2.4 (×3), A3.1–A3.3 (×2), M1.2, M1.3, M2.1, M2.2 |
| A4.2 — Bilan de 2 transformations | ✅ | `composition-transformations-01` |
| Choix de la bonne opération | ✅ | `choix-operation-01` |
| **A3.3 non-congruent CE2** | ✅ | `comparaison-referent-02` (difficile, 5 ex) |
| **M2.2 CE2** — Combien de fois plus ? | ✅ | `combien-de-fois-01` (5 ex) |

### Géométrie

| Thème programme | État | Manque / À faire |
|----------------|------|-----------------|
| Figures planes, triangles | ✅ | — |
| Angles | ✅ | — |
| Droites parallèles/perpendiculaires | ✅ | `paralleles-perpendiculaires-01` (checkbox + true-false, 2026-03-19) |
| Symétrie | ✅ | — |
| **Se repérer sur quadrillage** | ✅ | `quadrillage-lire-01` + `quadrillage-placer-01` |
| **Reproduire/tracer des figures** | ❌ | phase 4 : tracé sur quadrillage / papier pointé |

---

## CM1 — Gaps par domaine

### Nombres et calculs

| Thème programme | État | Manque / À faire |
|----------------|------|-----------------|
| Grands nombres (millions) | ✅ | — |
| Arrondir | ✅ | — |
| Multiples et diviseurs | ✅ | — |
| Additions/soustractions | ✅ | — |
| Multiplications (toutes formes) | ✅ | — |
| ×÷ puissances de 10 | ✅ | — |
| Division (sans/avec reste) | ✅ | — |
| **Division posée par 2 chiffres** | ✅ | `division-posee-01` (144÷12 → 312÷24, avec reste, 2026-03-19) |
| Fractions simples et équivalentes | ✅ | — |
| Fractions décimales | ✅ | — |
| Additionner/soustraire fractions même dénominateur | ✅ | `operations-fractions-01` |
| Décimaux (lire, comparer, ordonner) | ✅ | — |
| **Décimaux × 10/100/1 000** | ✅ | — |
| **Additionner/soustraire décimaux** | ✅ | — |
| **Droite graduée — décimaux** | ✅ | `droite-graduee-01` (lire, 0–1/0–2/0–5) + `droite-graduee-02` (placer, 2026-03-19) |
| Proportionnalité | ✅ | fill-table (3 niveaux) |

### Calcul mental

| Thème | État | À faire |
|-------|------|---------|
| Compléments 10/100/1 000 | ✅ | — |
| Doubles/moitiés | ✅ | — |
| **Mémoriser tables (défi fluency)** | ✅ | défis créés |
| **Stratégies décomposition/compensation** | ✅ | `calcul-reflechi-01` + `calcul-reflechi-02` (calc-chain 3–4 étapes, grands nombres, 2026-03-20) |

### Grandeurs et mesures

| Thème programme | État | Manque / À faire |
|----------------|------|-----------------|
| Longueurs, masses, volumes | ✅ | — |
| Aires (cm², m²) | ✅ | — |
| Durées | ✅ | — |
| **Angles (rapporteur)** | — | plus au programme 2025 (pas de rapporteur au CM) ; comparer / classer / ranger : `angles-comparer-01` |
| Périmètre | ✅ | — |

### Résolution de problèmes

| Thème | État | À faire |
|-------|------|---------|
| Problèmes à plusieurs étapes | ✅ | 3 séries |
| Comparaison (A3.3×2, M2.2, M2.3×2) | ✅ | séries congruentes + non-congruentes |
| Bilan variations (A4.1, A4.2) | ✅ | 2 séries |
| Combinatoire (M3.2) | ✅ | 1 série |
| A2.4 CM1 (état initial) | ✅ | `transformation-etat-initial-01` |
| **A2.4 non-congruent CM1** | ✅ | `transformation-etat-initial-02` (difficile, 5 ex) |
| **Se repérer sur quadrillage** | ✅ | `quadrillage-lire-01` + `quadrillage-placer-01` (grille 8×8, 2026-03-19) |
| **Modéliser avec schéma/tableau** | ✅ | `modelisation-01` (multi-question tableaux, 2026-03-21) |

---

## CM2 — Gaps par domaine

> Revu le 2026-10-27 après les phases 1 à 3 (129 séries). Seules les cases ⚠️ / ❌ restent à traiter.

### Nombres et calculs

| Thème programme | État | Séries / À faire |
|----------------|------|-----------------|
| Grands nombres (milliards) | ✅ | `comparer-milliards-01`, `arrondir-grands-nombres-01/02` |
| Arrondir | ✅ | `arrondir-grands-nombres-*`, `arrondir-decimal-01` |
| Multiples / diviseurs | ✅ | `multiples-01` |
| **Multiplication posée (2×2)** | ❌ | `column-op` ne pose que × 1 chiffre ; CM2 `multiplication-posee-decimaux` = décimal × 1 chiffre |
| Division (1 et 2 chiffres, quotient décimal) | ✅ | `division-simple`, `division-deux-chiffres-01/02`, `quotient-decimal-01`, `diviser-decimal-entier-01` |
| Fractions (comparer, équivalentes, opérations) | ✅ | `bases-01`, `visuel-01`, `operations-01`, `operations-fractions-01`, `classer-fractions-01` |
| Décimaux × entier, × ÷ 10/100/1 000 | ✅ | `multiplier-decimal-entier-01`, `mult-/div-puissances-10-01`, `multi-decimal-pow10-difficile` |
| Parenthèses, programmes de calcul | ✅ | `parentheses-01`, `programmes-calcul-01` |
| Proportionnalité, pourcentages | ✅ | `proportionnalite-01/02/03`, `pourcentages-01`, `tableaux-simples-01` |

### Grandeurs et mesures

| Thème programme | État | Séries / À faire |
|----------------|------|-----------------|
| Longueurs, masses, contenances | ✅ | `convertir-masses-01`, `convertir-contenances-01`, défi `conversions-01` |
| Périmètre | ✅ | `perimetre-figures`, `perimetre-quadrillage-02`, applications `perimetre*` |
| **Aires (cm², dm², m², carré, rectangle)** | ⚠️ | `aires-01` en texte seulement → aire sur quadrillage (phase 4) |
| **Volumes** | ⚠️ | `comparer-volumes` seulement |
| **Durées (convertir h / min / s, calculer)** | ⚠️ | `suites-horaires-quart`, `classer-tableaux-01` ; pas de série durées dédiée |
| **Calendrier** | ❌ | `calendrier-01` existe en CE1 → CM1 |
| Monnaie | ✅ | `compter-porte-monnaie`, `rendre-monnaie-billet`, `centimes-en-euros` |
| Angles (sans rapporteur) | ✅ | `angles-01`, `angles-comparer-01` ; somme / multiple d'angles pas encore |

### Géométrie

| Thème programme | État | Séries / À faire |
|----------------|------|-----------------|
| Triangles, quadrilatères, cercle | ✅ | `triangles-01`, `figures-planes-01`, `cercle-01`, `reconnaitre-figures-01` |
| Parallèles / perpendiculaires (reconnaître) | ✅ | `paralleles-perpendiculaires-01` |
| Symétrie axiale | ✅ | `symetrie-completer-01` (quadrillage, axe diagonal) |
| Solides, patrons | ⚠️ | `solides-01` en texte (mcq, matching) ; patrons dessinés et assemblages de cubes à faire |
| **Reproduire / construire des figures, tracer parallèles et perpendiculaires** | ❌ | phase 4 : tracé sur quadrillage / papier pointé |
| **Repérage sur quadrillage (coordonnées)** | ❌ | `coordinate-grid` existe en CE1 → CM1 |
| Programmes de construction (lire) | ✅ | `programmes-construction-01` |
| Déplacements (codage) | ✅ | `robot-programmes-01` |

### Résolution de problèmes

| Thème | État | Séries |
|-------|------|--------|
| Une, deux, trois étapes | ✅ | `une-etape-01`, `deux-etapes-01/02/03`, `trois-etapes-01/02` |
| Problèmes guidés, modéliser | ✅ | `guide-*`, `modeliser-01`, `problemes-inverses` |
| Proportionnalité | ✅ | `proportionnalite-*`, `soldes-01`, `melanges-couleurs-01` |

---

## Types d'exercices — État et opportunités

### Types existants et leur usage

| Type | Niveaux | Fréquence | Notes |
|------|---------|-----------|-------|
| `number-check` | CP→CM2 | ★★★★★ | Cheval de bataille, bien utilisé |
| `compare` | CP→CM2 | ★★★★ | — |
| `sequence` | CP→CM1 | ★★★ | — |
| `fill-table` | CE1→CM2 | ★★★ | Excellent pour proportionnalité, numération |
| `matching` | CP→CM2 | ★★★ | Bon pour heures, mesures |
| `true-false` | CE1→CM2 | ★★★ | — |
| `mcq` | CP→CM2 | ★★★ | — |
| `sort` / `drag-sort` | CP→CM2 | ★★★ | Ordonner des nombres |
| `tile-select` | CE2→CM1 | ★★★ | Excellent pour sommes cibles, symétrie |
| `clock` | CE1→CM1 | ★★ | — |
| `pyramid` | CE1→CM1 | ★★ | Bon pour additions |
| `logic-grid` | CE1→CM1 | ★★ | Logique |
| `bounding` | CP→CM1 | ★★ | Encadrement |
| `convert` | CE1→CM1 | ★★★ | Mesures |
| `problem` | CP→CM2 | ★★ | Problèmes textuels |
| `column-op` | CE2 | ★ | Opérations posées — sous-exploité |
| `fraction` | CE2→CM2 | ★★ | — |
| `fill-table` | CE1→CM1 | ★★★ | — |
| `base-10` | CP→CE1 | ★ | — |
| `ruler` | CP→CE1 | ★ | — |
| `click-blocks` | CE1→CM2 | ★★ | Valeur de position |
| `multi-question` | CE2→CM2 | ★ | Sous-exploité |
| `number-hunt` | CP→CE1 | ★★ | CP + CE1 app |
| `count-objects` | CP | ★ | Spécifique CP |
| `compare-groups` | CP→CE1 | ★★ | CP + CE1 app |
| `number-line` | CE1 | ★ | Droite graduée — 2 séries CE1 (`droite-graduee-01/02`) |
| `coordinate-grid` | CE2 | ★ | Repérage quadrillage — 2 séries CE2 (`quadrillage-lire/placer-01`) |
| `bar-chart` | CE1→CM1 | ★★ | Données — `donnees-01` (build) + `donnees-02` (read) à chaque niveau |
| `calc-chain` | CE1→CM1 | ★★ | Calcul réfléchi — `calcul-reflechi-02` à CE1, CE2, CM1 |

### Types à mieux exploiter

| Type | Opportunité |
|------|-------------|
| `column-op` | Opérations posées CP/CE1/CE2/CM2 — presque absent hors CE2 |
| `multi-question` | Problèmes à étapes, modélisation CM1/CM2 |
| `problem` | Très peu de séries à chaque niveau (1 par niveau en général) |
| `fill-table` | Suites (pas de N en N), tableaux de conversions CM2 |
| `fraction-check` | Fractions CM1/CM2 — seulement 3 séries |

### Types à créer (ou adapter)

> Mis à jour 2026-03-22 après comparaison avec MathALÉA, Lumni, Sésamath, IXL, MathsMentales, Mathador, WIMS, Skolengo, LearningApps, LogicielÉducatif, Mathia (sources primaires françaises CP→CM2).

#### Créés ✅

| Type | Description | Notes |
|------|-------------|-------|
| ~~**`number-line`**~~ | ~~Droite graduée interactive~~ | ✅ `droite-graduee-01/02` (CE1→CM1) |
| ~~**`coordinate-grid`**~~ | ~~Repérage sur quadrillage~~ | ✅ `quadrillage-lire/placer-01` (CE1→CM1) |
| ~~**`bar-chart`**~~ | ~~Diagramme en bâtons — construire ou lire~~ | ✅ `donnees-01/02` (CE1→CM1) |
| ~~**`calendar`**~~ | ~~Calendrier — lecture et questions~~ | ✅ `calendrier-01` (CE1→CM1) |
| ~~**`decomp-tree`**~~ | ~~Arbre de décomposition (number bonds)~~ | ✅ `liens-numeriques-01` via `decompTreeSvg` (CP→CE2) |
| ~~**`calc-chain`**~~ | ~~Chaîne de calcul réfléchi horizontal~~ | ✅ `calcul-reflechi-02` (CE1→CM1) |

#### Haute priorité — formats très répandus en France, absents ici

| Type potentiel | Description | Niveaux | Notes |
|---------------|-------------|---------|-------|
| ~~**`magic-color`**~~ | ~~Coloriage magique numérique~~ | CP→CM1 | ✅ Implémenté. Séries CP, CE2 (apps). Générateur `magicColor` + `magicColorGrid`. |
| **`category-sort`** | **Tri par catégories** : glisser des items (nombres, formes, expressions) vers des zones nommées (ex. "pairs / impairs", "triangles / quadrilatères", "< 100 / ≥ 100"). Présent sur IXL, Skolengo glisser-déposer, LearningApps classement. Différent de `drag-sort` (qui ordonne) — ici on classe par nature. | CP→CM1 | Couvre : classification géométrique, pairs/impairs, multiples, type d'opération. `checkbox` approxime mais le drag visuel est plus pédagogique. |
| **`memory`** | **Jeu de mémoire (Memory)** : retourner des paires de cartes équivalentes (entier ↔ écriture littérale, fraction ↔ dessin, heure analogique ↔ heure numérique). Format universellement connu, très présent sur LearningApps, Lumni, Sésamath. | CP→CM2 | Gamification forte. Couvre équivalences à tous niveaux. Implémentation : deck de cartes SVG, flip animation, correspondance par paire. |
| **`broken-calc`** | **Calculatrice cassée** : atteindre un nombre cible en utilisant uniquement les touches autorisées (certaines touches sont "cassées"). Classique pédagogique français (Sésamath, MathALÉA). Force la décomposition et les équivalences numériques. | CE1→CM2 | Ex : atteindre 48 sans la touche `×`. Implémentation : clavier numérique avec touches désactivables + validation. |

#### Priorité moyenne — formats utiles, implémentation maîtrisable

| Type potentiel | Description | Niveaux | Notes |
|---------------|-------------|---------|-------|
| **`flashcard`** | **Carte flash auto-évaluée** : question affichée, l'élève réfléchit, clique pour révéler la réponse, marque "su" ou "à retravailler". Format WIMS, MathsMentales. Idéal pour automatisation des tables sans pression du chrono. | CP→CM2 | Différent du mode timed-player (pas de timer). Pourrait être un mode d'affichage alternatif plutôt qu'un type à part entière. |
| **`domino`** | **Dominos mathématiques** : chaque carte a une réponse d'un côté et une question de l'autre. L'élève construit la chaîne en associant les paires correctes. MathsMentales les génère, très utilisé en classe. | CE1→CM1 | Format idéal pour tables, équivalences de fractions, heures. Générateur de dominos printable ou interactif. |
| **`pixel-art`** | **Pixel art mathématique** : variante du coloriage magique où la grille est plus fine et l'image plus complexe. Très motivant pour les CM. | CM1→CM2 | Même logique que `magic-color` mais avec grilles plus grandes. Pourrait être un paramètre du même type. |
| **`compte-est-bon`** | **Compte est bon (Mathador)** : combiner N nombres donnés avec +/−/×/÷ pour atteindre un nombre cible. Format compétition Mathador, très français. | CM1→CM2 | Mécanisme unique (expression builder). Coûteux à implémenter rigoureusement mais très engageant pour CM. |

#### Basse priorité — niche ou partiellement couvrable autrement

| Type potentiel | Description | Niveaux | Notes |
|---------------|-------------|---------|-------|
| **`money-pick`** | Cliquer sur des pièces et billets pour former une somme donnée. | CE1→CE2 | `problem` couvre le calcul ; l'interface sélecteur de pièces est plus engageante mais non prioritaire. |
| **`pie-chart`** | Diagramme circulaire SVG + questions de lecture. | CM1→CM2 | Approximable avec `multi-question` + SVG statique. |
| **`protractor`** | Rapporteur virtuel : mesurer ou classifier un angle. | CM1→CM2 | La classification peut utiliser `mcq` ; la mesure interactive est coûteuse. |
| **`angle-draw`** | Reconnaître/classer des angles visuellement. | CE2→CM2 | ✅ Couvert sans nouveau type (2026-10-26) : `trouverAngles` / `comparerAngles` / `rangerAngles`, séries CM1 / CM2 `angles-comparer-01`. |
| **`crossword`** | Mots croisés mathématiques (résultats de calculs = lettres/chiffres dans la grille). | CE1→CM1 | Niche ; `number-check` multiple couvre l'essentiel. |
| **`word-sort`** | Trier des expressions textuelles. | CE1→CM1 | `drag-sort` avec items texte couvre déjà ce besoin. |

---

## Domaines de contenu absents (analyse comparative)

> Comparaison effectuée le 2026-03-18 contre les fiches publiques françaises et les plateformes numériques (MathALÉA, Pass-Éducation, Bout de Gomme, Lutin Bazar, Mathia).

Ces lacunes sont **thématiques** — le format peut exister mais le contenu manque entièrement.

| Domaine | Programme | Niveaux | État | Remarque |
|---------|-----------|---------|------|----------|
| **Traitement de données** — diagrammes en bâtons, lecture et construction | Cycle 2–3 | CE1→CM2 | ✅ | CP → CM2 (`bar-chart`, tableaux, courbes CM1, diagrammes circulaires CM2) |
| **Repérage sur quadrillage / plan** | Cycle 3 | CE2→CM2 | ⚠️ partiel | CE1 + CE2 + CM1 couverts (`quadrillage-lire/placer-01`) ; CM2 non couvert |
| **Calendrier — lecture et calcul** | Cycle 2 | CE1→CM2 | ⚠️ partiel | `calendrier-01` à CE1, CE2, CM1 ; CM2 non couvert |
| **Suites logiques figurales** | Cycle 2 | CP→CE2 | ⚠️ partiel | `suites-figurales-01` à CP, CE1, CE2 ; CM2 `motifs-evolutifs-01` ; CM1 non couvert |
| **Calcul réfléchi — stratégies explicites** | Cycle 2–3 | CE1→CM2 | ⚠️ partiel | CE1 + CE2 + CM1 (`calc-chain`) ; CM2 `astuce-dizaine-sup-*`, `schemas-operateurs-01/02` |

---

## Jeux internationaux — formats à implémenter

> Recensement effectué le 2026-04-12. Sources : KenKen, Nikoli (Japon), NRICH (UK), Singapore Math, recherche comparative internationale.

### En cours / Priorité haute

| Type | Origine | Mécanique | Compétence | Niveaux | État |
|------|---------|-----------|-----------|---------|------|
| ~~**`kenken`**~~ | ~~Japon~~ | ~~Grille N×N : chaque cage a une cible arithmétique et une opération ; pas de répétition en ligne/colonne~~ | ~~Opérations, déduction~~ | ~~CE2→CM2~~ | ✅ Implémenté. Générateur `kenkenPuzzle`. Séries CE2 3×3/4×4, CM1 4×4/5×5. |
| ~~**`futoshiki`**~~ | ~~Japon~~ | ~~Grille N×N : remplir 1→N, respecter les signes `<`/`>` entre cases adjacentes~~ | ~~Comparaison, logique~~ | ~~CE2→CM2~~ | ✅ Implémenté. Générateur `futoshikiPuzzle`. Séries CE2 4×4, CM1 4×4/5×5. |
| ~~**`numberlink`**~~ | ~~Japon (Nikoli)~~ | ~~Relier des paires de nombres identiques par des chemins continus non croisés~~ | ~~Raisonnement spatial~~ | ~~CE2→CM2~~ | ✅ Implémenté. Générateur `numberlinkPuzzle`. Séries CE2 4×4, CM1 5×5. |

### Priorité moyenne

| Type | Origine | Mécanique | Compétence | Niveaux | Notes |
|------|---------|-----------|-----------|---------|-------|
| **`kakuro`** | Japon | Grille de mots croisés numériques : combinaisons sans répétition pour atteindre des sommes cibles | Addition, déduction | CM1→CM2 | Proche de KenKen mais plus complexe |
| **`shut-the-box`** | Traditionnel (FR/UK) | Lancer des dés, couvrir des tuiles dont la somme égale le total du dé | Addition mentale, probabilité | CP→CE2 | Très ludique, idéal CP/CE1 |
| **`memory`** | Universel | Retourner des paires de cartes équivalentes (entier ↔ décomposition, fraction ↔ dessin, heure analogique ↔ numérique) | Équivalences | CP→CM2 | Format très connu |
| **`broken-calc`** | FR (Sésamath) | Atteindre un nombre cible avec certaines touches de calculatrice désactivées | Décomposition, équivalences | CE1→CM2 | Classique pédagogique français |
| **`domino`** | Traditionnel | Chaîne de dominos : chaque carte a une réponse d'un côté, une question de l'autre | Tables, équivalences | CE1→CM1 | Idéal pour tables et fractions |

### Basse priorité / Niche

| Type | Origine | Notes |
|------|---------|-------|
| **`nim`** | Mathématique | Retirer des objets, forcer l'adversaire à prendre le dernier — stratégie, patterns |
| **`dots-and-boxes`** | FR (Édouard Lucas) | Connecter des points pour réclamer des carrés |
| **`battleship-math`** | Variante coordonnées | Résoudre des problèmes aux coordonnées pour trouver des navires |
| **`soroban`** | Japon | Abaque virtuel → visualisation mentale ; très impressionnant visuellement |
| **`compte-est-bon`** | FR (Mathador) | Combiner N nombres avec +/−/×/÷ pour atteindre une cible — expression builder |
| **`tangrams`** | Chine | Assembler 7 pièces géométriques en silhouettes — géométrie, décomposition |
| **`subitizing-war`** | US/UK | Comparer des cartes à points, cadres de dix, dés — reconnaissance rapide |

---

## Recommandations prioritaires

### 🔥 Haute priorité

1. ~~**CM2 complet**~~ — ⏳ traité ultérieurement (voir section CM2 ci-dessus)

2. **Problèmes Vergnaud** — 21/23 codes couverts ✅ ; reste A4.3 et M3.4 (CM2, ⏳ reporté)
   - ~~Prochain : A4.2 CE2/CM1 (composition de transformations avec bilan)~~ ✅ CE2 créé (5 séries)
   - ~~Renforcer A2.4 CE2 (2e série — type le plus difficile pour les élèves)~~ ✅ `transformation-etat-initial-03` non-congruente (5 exercices, 2026-03-18)
   - ~~Ajouter A3.1 CE1 (comparaison → écart, manque encore à ce niveau)~~ ✅ `comparaison-ecart-02` CE1 (5 exercices, 2026-03-18)

3. **Fractions CE2** — ✅ 6 séries créées
   - ~~Reste : parties d'un groupe~~ ✅ `fractions-parties-groupe-01` (5 exercices, 2026-03-18)
   - ~~lire/écrire en chiffres~~ ✅ `ecrire-fraction-01` (5 exercices, 2026-03-18)

### Priorité moyenne

4. ~~**CP mesures** — longueurs (ruler), durées (matching simple), température~~ ✅ 3 séries créées 2026-03-18
5. ~~**CP/CE1 additions posées** — `column-op` sans/avec retenue~~ ✅ 4 séries créées 2026-03-18
   - CP `pose-addition-01` (sans retenue, 5 ex) + `pose-addition-02` (avec retenue, 5 ex)
   - CE1 `pose-addition-01` (3 chiffres, 5 ex) + `pose-soustraction-01` (5 ex)
6. ~~**CE2 résolution de problèmes** — choix de l'opération~~ ✅ `choix-operation-01` (5 ex : 3 select + 2 multi-question, 2026-03-18)
7. ~~**CM1/CM2 additionner/soustraire fractions** — `fraction-check` ou `number-check`~~ ✅ 2026-03-18
   - CM1 `operations-fractions-01` (5 ex, même dénominateur)
   - CM2 `operations-fractions-01` (5 ex, résultats > 1 inclus)
8. ~~**CM2 proportionnalité complète** — fill-table + problem~~ ✅ `proportionnalite-02` (5 ex : 2 fill-table + 3 problem, 2026-03-18)

---

## Couverture E2E — Tests Playwright

> Mise à jour : 2026-03-28. Fichiers : `tests/e2e/exercise-player.spec.js` + `tests/e2e/exercise-types.spec.js` + `tests/e2e/layout-health.spec.js`.
> **26 types couverts sur 35 templates.** 40 tests exercices + 610 layout-health.

### Types couverts ✅

| Type | Fichier spec | Nature du test |
|------|-------------|----------------|
| `mcq` | exercise-player | interaction complète (correct + erreur + désactivation) |
| `number-check` | exercise-player | interaction complète (correct + erreur + touche Entrée) |
| `calc-chain` | exercise-player | interaction complète (correct + erreur partielle + bouton désactivé) |
| `clock` | exercise-types | saisie heure + success |
| `ruler` | exercise-types | lecture valeur + success |
| `fraction` | exercise-types | saisie fraction + success |
| `problem` | exercise-types | saisie réponse + success |
| `number-line` | exercise-types | placement nombre + success |
| `sequence` | exercise-types | compléter suite + success |
| `bounding` | exercise-types | encadrement + success |
| `convert` | exercise-types | conversion + success |
| `fraction-check` | exercise-types | numérateur + dénominateur + success |
| `true-false` | exercise-types | clic Vrai/Faux + success |
| `multi-question` | exercise-types | saisie multiple + success |
| `checkbox` | exercise-types | sélection statements + success |
| `pyramid` | exercise-types | saisie inputs visibles + success |
| `select` | exercise-types | sélection option + success |
| `sort` | exercise-types | clic tuiles dans l'ordre YAML + success (×2 : correct + mauvais ordre) |
| `logic-grid` | exercise-types | grille complète → auto-validate + success |
| `compare` | exercise-types | cycling boutons → valeurs correctes + success |
| `coordinate-grid` | exercise-types | clic case + success |
| `bar-chart` | exercise-types | rendu labels SVG (render-only) |
| `matching` | exercise-types | rendu cartes (render-only) |
| `drag-sort` | exercise-types | rendu tuiles pool + zone de dépôt (render-only, ×2) |
| `tile-select` | exercise-types | rendu grille tuiles (render-only) |
| `fill-table` | exercise-types | rendu tableau (render-only) |

### Types non couverts ❌

#### Pas d'exercices créés (content needed first)

| Type | Raison | Action requise |
|------|--------|----------------|
| `base-10` | Aucune série créée (display-only, pas de check()) | Ajouter la logique check() puis créer des exercices |
| `seq-verify` | Bouton partagé pour sequence/bounding/convert | Pas un type d'exercice autonome |

#### Récemment couverts ✅ (2026-03-28)

| Type | Séries créées |
|------|--------------|
| `svg-tiles` | CE1 `reconnaitre-formes` (4 ex), CE2 `proprietes-formes` (4 ex) |
| `fraction-paint` | CE2 `fractions-colorier` (6 ex), CM1 `fractions-colorier` (6 ex) |

#### Problème d'infrastructure

| Type | Raison | Action requise |
|------|--------|----------------|
| `column-op` | Template non inclus dans `series-player.njk` | Câbler le type dans le player, puis ajouter un test |

---

## Couverture Vergnaud (classification des problèmes)

> Source : champ `class:` dans les frontmatters + `exercises-report.csv`. Voir `docs/maths_classification_vergnaud.md`.
> Dernière mise à jour : 2026-03-28 — 563 séries totales (CP 61, CE1 110, CE2 151, CM1 141, CM2 40, défis 17).

### État actuel

| Code | Libellé court | Séries | Niveaux couverts |
|------|--------------|--------|-----------------|
| **A1.1** | Composition → Tout | 5 | CE1, CE2, CM1 |
| **A1.2** | Composition → Partie | 2 | CE1, CM1 |
| **A2.1** | Transformation + → Ef | 3 | CP, CE1, CM1 |
| **A2.2** | Transformation − → Ef | 5 | CP, CE1, CE2, CM2 |
| **A2.3** | Transformation → T inconnu | 3 | CE1, CE2, CM1 |
| **A2.4** | Transformation → Ei inconnu | 5 | CE2 (×3, dont non-congruente), CM1 (×2, dont non-congruente) |
| **A3.1** | Comparaison → Écart | 5 | CP, CE1 (×2), CE2, CM1 |
| **A3.2** | Comparaison → État comparé | 4 | CE1 (×2, dont non-congruent), CE2 (dont non-congruent) |
| **A3.3** | Comparaison → Référent | 5 | CE1, CE2 (×2, dont non-congruent), CM1 (×2, dont non-congruent) |
| **A4.1** | Bilan de 2 variations | 1 | CM1 |
| **A4.2** | Transformation composée → bilan | 2 | CE2, CM1 |
| A4.3 | Transformation composée → T inconnu | 0 | ❌ (CM2) |
| **M1.1** | Multiplication directe | 6 | CE1→CM2 |
| **M1.2** | Division-Partage | 5 | CE1, CE2, CM1, CM2 |
| **M1.3** | Division-Groupement | 2 | CE2, CM1 |
| **M1.4** | Valeur unitaire + calcul dérivé | 1 | CE1 |
| **M2.1** | Scalaire → Produit | 3 | CE2, CM2 |
| **M2.2** | Scalaire → Facteur | 2 | CE2, CM1 |
| **M2.3** | Scalaire → Base | 2 | CM1 |
| **M3.1** | Produit de mesures (Aire/Périmètre) | 2 | CE2, CM1 |
| **M3.2** | Combinatoire | 1 | CM1 |
| **M3.3** | Vitesse × Temps | 2 | CM1, CM2 |
| M3.4 | Débit × Temps | 0 | ❌ (CM2) |

### Codes absents — priorités

| Code | Niveau programme | Priorité | Notes |
|------|-----------------|----------|-------|
| **A4.3** — T composée → inconnue | CM2 | basse | ⏳ CM2 reporté |
| **M3.4** — Débit × Temps | CM2 | basse | ⏳ CM2 reporté |

### Prochaines priorités pour les problèmes

> Tous les codes prioritaires sont maintenant couverts. Seuls A4.3 et M3.4 restent absents (CM2, ⏳ reporté).

| Action | Code | Niveau | Priorité |
|--------|------|--------|----------|
| A4.3 — Transformation composée → inconnue | A4.3 | CM2 | ⏳ CM2 reporté |
| M3.4 — Débit × Temps | M3.4 | CM2 | ⏳ CM2 reporté |

### Observations

- **21 des 23 codes couverts** — seuls A4.3 et M3.4 restent (CM2, ⏳ reporté)
- **A3.1 couvert aux 4 niveaux** CP, CE1 (×2), CE2, CM1
- **A3.2 couverte aux 2 niveaux** CE1 (×2 dont non-congruent), CE2 (dont non-congruent)
- **A3.3 couverte à 3 niveaux** CE1, CE2 (×2, dont non-congruent), CM1 (×2, dont non-congruent)
- **A2.4 couverte à 2 niveaux** CE2 (×3), CM1 (×2, dont variante difficile)
- **M2.2 maintenant à CE2 et CM1** — progression naturelle M2.1 → M2.2
- **M1.2 couverte aux 4 niveaux** CE1, CE2, CM1, CM2
- **column-op** étendu avec `multiplications-posees-01` CE2 (× opérateur)
- La congruence sémantique n'est pas encore encodée — envisager `congruence: non-congruente` dans le frontmatter pour filtrage futur

---

### Défis chronométrés

> Mise à jour 2026-03-28. 17 séries de défis au total.

| Défi | Niveau | Générateur | État |
|------|--------|-----------|------|
| Additions rapides (< 20) | CE2 | `additionFacile` | ✅ |
| Tables de multiplication | CE2 | `multiplicationSimple` | ✅ |
| **Calcul rapide (mix)** | CP | `fluencyMix` (facile/moyen/difficile) | ✅ 2026-03-28 |
| **Calcul rapide (mix)** | CE1 | `fluencyMix` (facile/moyen/difficile) | ✅ 2026-03-28 |
| **Calcul rapide (mix)** | CE2 | `fluencyMix` (facile/moyen/difficile) | ✅ 2026-03-28 |
| **Calcul rapide (mix)** | CM1 | `fluencyMix` (facile/moyen/difficile) | ✅ 2026-03-28 |
| **Calcul rapide (mix)** | CM2 | `fluencyMix` (facile/moyen/difficile) | ✅ 2026-03-28 |

Le générateur `fluencyMix` produit un mélange aléatoire d'opérations adaptées au niveau :
- **CP** : +/− ≤20, compléments à 10, doubles, ±10, compter par 2/5
- **CE1** : +/− 2 chiffres, ×2/3/5/10, compléments à 100, doubles/moitiés, ±10/100
- **CE2** : tables 2–9, divisions, 2d×1d, +/− 3 chiffres, fractions simples
- **CM1** : tables à 12, ×÷ puissances de 10, décimaux 1dp, fractions, arrondis
- **CM2** : décimaux ×÷, fractions, pourcentages, conversions, priorités opératoires
