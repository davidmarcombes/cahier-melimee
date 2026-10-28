# Phase 4 — tracer, solides, aires

> Plan couverture 2026-10 (programmes 2024–2025). Statut : **en cours** — 4.1 livré (2026-10-27). Snapshot de départ : `avant-phase4`.
> Précédent : [plan-phase-3.md](plan-phase-3.md).

Thèmes du programme sans format interactif à la fin de la phase 3 : tracer / reproduire sur quadrillage ou papier pointé (CP → CM2), assemblages de cubes (CP, CE1, CM2), patrons (CE1, CM2), aire par pavage (CM1, CM2).

## 4.1 Tracer sur quadrillage — CP → CM2 — ✅ livré

> Fait : mode `draw` de `grid-board` (pas de type neuf : partial, bouton Vérifier, contrôle indépendant partagés). L'élève touche deux points du quadrillage pour tracer un trait ; le crayon reste sur le dernier point. Comparaison par pas unitaires : peu importe l'ordre ou le découpage des traits. Tâches `copy` (n'importe où, ou depuis un point rouge), `complete` (côtés manquants, symétrique d'une ligne brisée), `shape` (carré / rectangle / triangle rectangle par côtés, aire, ou « penché »), `parallel` / `perp` (droite passant par A). Générateur `tracerGrille` (geometrie.js), contrôle `drawCheck` / `drawSolution` / `boardProblems` dans `scripts/lib/grid-board.js`, solveur e2e, prompt LLM, tests (le lecteur et le contrôle indépendant jugent pareil les bonnes réponses et les réponses abîmées). Séries `applications/…/geometrie/` : CP `tracer-quadrillage-01`, CE1 `tracer-quadrillage-01`, CE2 `tracer-figures-01`, CM1 `tracer-quadrillage-01`, CM2 `tracer-quadrillage-01`.

## 4.2 Assemblages de cubes et patrons — à faire

- Cubes en perspective (SVG isométrique d'une carte de hauteurs) : compter les cubes (cachés compris), choisir la vue de dessus / de face / de côté (`count-objects` / `mcq` / `tile-select`, pas de type neuf).
- Patrons du cube et du pavé : « lequel se replie en cube ? » (`tile-select`).
- Contrôle indépendant : la carte de hauteurs donne le compte et chaque vue ; un patron se replie par simulation.

## 4.3 Aire par pavage — à faire

- `grid-board` : colorier une surface d'aire donnée, comparer deux aires, même aire / périmètre différent. Les séries `aires-01` (CM1, CM2) sont encore en texte.
