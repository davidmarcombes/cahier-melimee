# Phase 3 — équilibre

> Plan couverture 2026-10 (programmes 2024–2025). Statut : **en cours** — 3.1, 3.2 et 3.3 livrés (2026-10-27), reste 3.4 (validation à la main). Snapshot de départ : `avant-phase3`.
> Précédent : [plan-phase-2.md](plan-phase-2.md).

## 3.1 Recompter — ✅ livré

- [x] « Carte des séries par niveau et catégorie » de `docs/roadmap.md` mise à jour : 928 séries (858 avant), plus un tableau par difficulté.
- [x] Cases vides niveau × thème × difficulté (depuis `reports/exercises-report.csv`) :

| Niveau | Thèmes sans `facile` | Thèmes sans `moyen` | Thèmes sans `difficile` |
|--------|----------------------|---------------------|-------------------------|
| GS  | — | mesures | (normal en GS) |
| CP  | — | données, logique, mesures | tous sauf calcul, numération |
| CE1 | — | — | données, fractions, géométrie, logique, mesures |
| CE2 | — | — | données, fractions, géométrie, logique |
| CM1 | données | — | données |
| CM2 | décimaux, données, fractions, géométrie, logique, problèmes, proportions | — | proportions |

Répartition par difficulté : CP 60 / 24 / **2**, CE1 72 / 80 / **3**, CM2 **6** / 69 / 46 (facile / moyen / difficile). Après 3.2 : CP 60 / 27 / 9, CE1 72 / 80 / 11, CM2 13 / 69 / 47 — plus aucune case vide hors GS.

## 3.2 Difficulté — ✅ livré

- [x] Séries `difficile` en CP (2 → 6), formats visuels d'abord :
  - calcul : `pyramides-02` (pyramides à trous, il faut soustraire)
  - numération : `droite-graduee-01` (droite graduée jusqu'à 100, lire et placer)
  - problèmes : `deux-etapes-01` (deux étapes ≤ 30, `multi-question` une question par étape)
  - géométrie : `symetrie-completer-01` (application `symetrieGrille`, petits quadrillages)
- [x] Séries `moyen` en CP (24 → 27) : données `diagrammes-01` (construire un diagramme, tableau à double entrée), logique `suites-dessins-01` (`number-strip` à emojis), mesures `metres-centimetres-01` (règle A → B, m ou cm, 1 m = 100 cm, masses).
- [x] Séries `facile` en CM2 (6 → 13), une par thème manquant : décimaux `droite-graduee-01`, données `lire-diagrammes-01`, fractions `reconnaitre-01`, géométrie `reconnaitre-figures-01` (application), logique `equations-emojis-facile` (application), problèmes `guide-une-etape-01` (`guided-problem`), proportions `tableaux-simples-01`.
- [x] Séries `difficile` en CE1 (3 → 11) : calcul `chaines-pyramides-01` (chaînes, pyramides à trous ≤ 100), numération `droite-graduee-03` (jusqu'à 1 000, droite qui ne part pas de 0), problèmes `schemas-barres-01` (`bar-model`, comparaisons à l'envers), géométrie `symetrie-completer-01` (application), mesures `monnaie-02` (payer, rendre, € ↔ c), fractions `fractions-unite-01` (comparer à 1, droite graduée en demis et quarts), données `tableaux-02` (graduations de 2 en 2, tableau à double entrée), logique `grille-02` (grilles 4 × 4).
- [x] Séries `difficile` en CP : données `diagrammes-02`, logique `suites-nombres-01` (de 2 en 2, 5 en 5, 10 en 10, à rebours), mesures `longueurs-02`.
- [x] Séries `difficile` en CE2 : données `tableaux-graphiques-01`, fractions `plus-grandes-que-un-01` (droite graduée, 7/4 = 1 + 3/4), géométrie `symetrie-construire-01` (axe décentré, robot qui tourne), logique `enigmes-logiques-01` (grilles 4 × 4, équations à emojis).
- [x] CM2 proportions `difficile` : `proportionnalite-03` (passage à l'unité, pourcentage, échelle, vitesse, piège du taxi non proportionnel).
- [x] CM1 données : `lire-diagrammes-01` (`facile`) et `interpreter-donnees-01` (`difficile`, courbe, tableau à double entrée).
- Correctifs faits en route : droite graduée en mode `place` accepte une réponse décimale à virgule (`0,4`), graduations décimales affichées à la française (`0,1` au lieu de `0.1`), champ « a / b » sur une droite graduée quand la réponse est une fraction. Diagramme en barres : une barre se remplit case par case, une valeur hors graduation (45 avec un pas de 10) s'affichait 40 ; `validate:exercises` le refuse maintenant, 3 séries existantes corrigées (CE2 `donnees-02`, CM1 `donnees-02`, CM2 `lire-diagrammes-01`).
- Contrôles : `npm run check` vert, `npm run regress -- avant-phase3` (32 pages nouvelles, toutes regardées ; anciennes pages : seuls écarts dus aux nombres tirés au hasard), prompts de `validate:llm --export` relus à la main.
- Règle : jamais en dessous de GS ; le contenu des programmes plus jeunes devient GS `facile`.

## 3.3 Formats — ✅ livré

État 2026-10-27 : `number-check` 537 → **525** / 2 820 (19 % → 18,6 %), `problem` 374 → **328** (13,3 % → 11,6 %), `bar-model` 22 → **71**.

- [x] Lot 1 — problèmes en schéma en barres : 46 exercices `problem` → `bar-model` (le 02 et le 04 de chaque série, texte et réponse inchangés, unité ajoutée), 23 séries non validées :
  - CP : `comparaison-ecart-01`
  - CE1 : `comparaison-ecart-01`, `-02`, `comparaison-etat-compare-02`, `comparaison-referent-01`, `composition-01`, `-02`, `division-partage-01`, `transformation-inconnue-01`, `transformation-moins-01`, `transformation-plus-01`
  - CE2 : `comparaison-ecart-01`, `comparaison-etat-compare-01`, `-02`, `comparaison-referent-02`, `division-partage-01`, `transformation-etat-initial-02`, `-03`, `transformation-inconnue-01`
  - CM1 : `comparaison-referent-01`, `-02`, `transformation-etat-initial-01`, `transformation-inconnue-01`
  - Modèles : écart → `comparison` avec `diff: "?"` ; état comparé / référent → `compared: "?"` ; parties-tout, transformations → `part-whole` ; partage → `part-whole` à parts égales `["?", "?", …]`.
- [x] Lot 2 — `number-check` : 251 / 537 sont des applications à générateur et l'essentiel du reste est du calcul mental ou déjà illustré (balance, figures, règle) : format juste, on n'y touche pas. Convertis (séries non validées) :
  - CM1 `lire-nombres-100`, `-10000`, `-100M` : 3 exercices chacun → `mcq` avec pièges (`6018` pour soixante-dix-huit, zéro oublié ou en trop, classe décalée).
  - CE2 `fractions-collection-01` : tiers / quart d'une collection (02, 03, 05) → `bar-model` à parts égales (`1/3`, `1/4`).
  - CE2 `perimetre-01` : carré et rectangles (01, 02, 05) dessinés (`squareSvg`, `rectangleSvg`), restent `number-check`.
  - Correctif : `rectangleSvg` coupait la cote de gauche (« 12 cm » → « cm ») ; marge gauche 70. Profite aussi aux applications `perimetreFormes`.
  - Contrôles : snapshot `avant-3-3-lot2`, check vert, regress = les 5 séries + 3 applications périmètre (cote), captures regardées.
- [x] Ne pas supprimer de séries validées : ajouter une variante visuelle à côté ; une série validée à la main reste telle quelle. Respecté : lots 1 et 2 ne touchent que des séries non validées.
- Correctifs : `bar-model` lit les nombres à espaces (`1 250` donnait 1) ; `validate:exercises` vérifie le schéma (parties = tout, |réf − comparé| = écart, `ref` jamais `"?"`).
- Contrôles : snapshot `avant-3-3`, `npm run check` vert, `npm run regress -- avant-3-3` (23 pages changées = les 23 séries, rien d'autre), les 46 schémas regardés un par un.

## 3.4 Validation à la main

État au 2026-10-27 (fichiers sans `validatedAt`) : GS 16 / 180, CP 56 / 245, CE1 318 / 428, CE2 493 / 623, CM1 674 / 862, CM2 199 / 335 — 1 756 fichiers, 665 séries. CSV synchronisé le 2026-10-27 après 3.2 (+137 fichiers : les 72 récents et les 65 des 14 nouvelles séries).

- [ ] CE2 et CM1 en priorité (les deux niveaux les plus fournis : 421 séries en attente).
- [ ] Puis les séries des phases 1 et 2 encore en attente dans `reports/human-validate.csv` (`npm run sync:human-validations`).

## Contrôles

Comme en phase 2 : snapshot avant, `npm run check` + `npm run regress` après, validation par modèle des nouvelles séries.

- 2026-10-27, `validate:llm --export` Haiku sur les 446 fichiers modifiés ou nouveaux non commités : 395 ok, 51 skip (figure seule, résultat calculé par le lecteur), 0 fail. 3 INCORRECT au premier passage, tous dus au prompt : droite graduée sans les `subdivisions`, pyramides lues à l'envers (les rangées YAML partent de la base). Prompts corrigés, fichiers repassés : ok. Pas de passe Sonnet (rien à départager).
- À trancher à la validation : CM1 `quadrilateres-01/02`, « un parallélogramme est aussi un trapèze → vrai » dépend de la définition du trapèze.
