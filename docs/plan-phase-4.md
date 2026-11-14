# Phase 4 — tracer, solides, aires

> Plan couverture 2026-10 (programmes 2024–2025). Statut : **livré** — 4.1 (2026-10-27), 4.2 et 4.3 (2026-11-11, snapshot `avant-c7-c8-c9`). Snapshot de départ : `avant-phase4`.
> Précédent : [plan-phase-3.md](plan-phase-3.md).

Thèmes du programme sans format interactif à la fin de la phase 3 : tracer / reproduire sur quadrillage ou papier pointé (CP → CM2), assemblages de cubes (CP, CE1, CM2), patrons (CE1, CM2), aire par pavage (CM1, CM2).

## 4.1 Tracer sur quadrillage — CP → CM2 — ✅ livré

> Fait : mode `draw` de `grid-board` (pas de type neuf : partial, bouton Vérifier, contrôle indépendant partagés). L'élève touche deux points du quadrillage pour tracer un trait ; le crayon reste sur le dernier point. Comparaison par pas unitaires : peu importe l'ordre ou le découpage des traits. Tâches `copy` (n'importe où, ou depuis un point rouge), `complete` (côtés manquants, symétrique d'une ligne brisée), `shape` (carré / rectangle / triangle rectangle par côtés, aire, ou « penché »), `parallel` / `perp` (droite passant par A). Générateur `tracerGrille` (geometrie.js), contrôle `drawCheck` / `drawSolution` / `boardProblems` dans `scripts/lib/grid-board.js`, solveur e2e, prompt LLM, tests (le lecteur et le contrôle indépendant jugent pareil les bonnes réponses et les réponses abîmées). Séries `applications/…/geometrie/` : CP `tracer-quadrillage-01`, CE1 `tracer-quadrillage-01`, CE2 `tracer-figures-01`, CM1 `tracer-quadrillage-01`, CM2 `tracer-quadrillage-01`.

## 4.2 Assemblages de cubes et patrons — ✅ livré (2026-11-11)

> Fait sans type neuf. Piles de cubes en perspective cavalière (faces avant en vrai carré, profondeur en haut à droite — la convention de l'école), dessinées seulement si chaque colonne montre son dessus : un cube caché est toujours sous un cube visible (« aucun cube ne flotte »). Générateurs `compterCubes` (`number-check`), `vueCubes` (`tile-select` : vue de face / de dessus / de droite parmi les autres vues, leurs symétriques, un carré de plus ou de moins), `patronsCube` (`tile-select` : les 11 patrons du cube, tournés / retournés, parmi 10 presque-patrons), `faceOpposee` (`mcq`, patron à lettres). Contrôle indépendant `scripts/lib/cubes.js` : relit la carte de hauteurs (`data-h`) et compte les faces dessinées, recalcule chaque vue, replie chaque patron en faisant rouler un dé dessus. Séries `applications/…/geometrie/` : CE1 `compter-cubes-01` (une rangée, puis deux), CE2 `compter-cubes-01` (cubes cachés), CM1 `assemblages-cubes-01` (compter, vues de face / dessus, patrons), CM2 `patrons-cube-01` (patrons, face opposée, trois vues, patrons du pavé : `patronsPave`, le pavé dessiné en petits cubes, les patrons en rectangles sur quadrillage, presque-patrons : une face de la mauvaise longueur, deux faces l'une sur l'autre).

## 4.3 Aire par pavage — ✅ livré (2026-11-11)

> Fait. Mode `area` de `grid-board` (cases jointives) : colorier une figure d'aire donnée (un seul morceau, sans trou), d'aire et de périmètre donnés, de même aire qu'un modèle bleu mais d'une autre forme, ou d'un autre périmètre ; le message dit ce qui ne va pas. Générateur `colorierAire` (une solution livrée, re-vérifiée par `areaCheck` dans `scripts/lib/grid-board.js`, jouée par le solveur e2e). `aireQuadrillage` (`number-check` : carreaux et demi-carreaux, réponses « 7,5 ») et `comparerAires` (`mcq` : la plus grande aire a le contour le plus court), relus depuis le dessin par `scripts/lib/aires.js`. Séries `applications/…/mesures/aires-pavage-01` : CM1 (compter, demi-carreaux, comparer, colorier, même aire), CM2 (demi-carreaux, comparer, aire + périmètre, autre périmètre, même aire). Les séries texte `aires-01` restent telles quelles.

