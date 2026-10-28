# Phase 2 — nouveaux types / générateurs

> Plan couverture 2026-10 (programmes 2024–2025). Statut : **terminée** — 2.1 → 2.4 livrés (2026-10-26), 2.5 et 2.6 livrés (2026-10-27).
> Précédent : [plan-phase-1.md](plan-phase-1.md). Suivant : [plan-phase-3.md](plan-phase-3.md).
> Programmes de référence : compléments en fin de `docs/maths_cp.md` … `docs/maths_cm2.md`.

## Avant de commencer

- Point de départ : `npm run snapshot -- avant-phase2`. Après chaque lot : `npm run check` puis `npm run regress -- avant-phase2`, et regarder les captures des nouvelles pages (layout-health passe sur une figure vide).
- Ajouter un type : checklist complète dans `agents/exercises.md` « Adding a New Exercise Type » (partial `src/_includes/types/`, `series-player.njk`, `app.js`, `.eleventy.js` `seriesPayload`, `TYPE_SCHEMAS`, `generate-maths-ex.js`, solveur dans `tests/e2e/solve.spec.js`, doc).
- Préférer **étendre** un type ou un helper SVG existant (`src/assets/js/svg.js`) avant d'en créer un : chaque type ajoute du JS à toutes les pages.
- Budgets : `agents/performance.md`.
- GS : emojis + voix pré-enregistrée (Piper local, jamais de synthèse navigateur), presque pas de texte. Clips : `uv run --with piper-tts --with imageio-ffmpeg npm run generate:voice-pilot`.
- Générateurs : un contrôle oracle dans `scripts/lib/gen-checks.js` + une entrée CORRUPT dans `tests/gen-checks.test.js` + des tests dans `tests/generators.test.js`.
- Validation par modèle à la fin de chaque lot : `node scripts/validate-llm.js --export=.scratch/<dir> --model=<modèle> --dir=…`, puis `--import`.

## Lots

### 2.1 Codage de déplacements sur quadrillage — CP → CM2 (prioritaire) — ✅ livré

> Fait : type `grid-board` (partial `types/grid-board.njk`, modes follow / write / debug, instructions absolues `U D L R` ± nombre, relatives `F TL TR` avec `dir`), générateur `robotGrille` (logique.js, options `compact`, `relative`, `city`, `blocks`, `slack`), contrôle indépendant `scripts/lib/grid-board.js` (validateur + oracle), solveur e2e, prompt LLM (50/50 CORRECT, Haiku). Séries : GS `robot-01` (voix), CP `robot-suivre-01` / `robot-ecrire-01`, CE1 `robot-01`, CE2 `robot-01`, CM1 `robot-quartier-01`, CM2 `logique/robot-programmes-01`. Le mode symétrie (2.2) s'ajoutera à `grid-board`.


Pensée informatique, nouveauté des programmes 2024–2025, quasi absente du site.

- Modes :
  - **suivre** : un programme de flèches (↑ → ↓ ←, « avance de 3 ») est donné ; cliquer la case d'arrivée ;
  - **écrire** : un départ et une arrivée sont donnés ; composer la suite de flèches (boutons) ; accepter tout chemin valide, avec un nombre de pas maximum optionnel ;
  - **déboguer** (CE2 →) : un programme contient une erreur ; trouver l'instruction fausse.
- Obstacles optionnels ; au CM, repérage relatif (« tourne à gauche ») en plus des directions absolues.
- GS : version voix seule (« le robot avance de 2 cases ») en mode suivre, 3×3 ou 4×4.
- Base possible : `coordinate-grid` (mode `place` déjà cliquable) ou `maze` (grille cliquable + chemin). Choisir après lecture des deux partials ; un type `robot-grid` neuf seulement si l'extension devient tordue.
- Générateur : tirer départ / obstacles / programme, vérifier que l'arrivée est dans la grille et hors obstacle.
- Séries cibles : CP, CE1, CE2 (`geometrie`), CM1 « quartier / ville » (plan avec rues), CM2 (`logique`).

### 2.2 Symétrie sur quadrillage — CE2 → CM2 — ✅ livré

> Fait : mode `mirror` de `grid-board` (axe `v` / `h` sur une ligne du quadrillage, `d` / `a` en diagonale, tracé en rouge ; l'élève colorie les cases, comparaison exacte, cases en trop en rouge), générateur `symetrieGrille` (logique.js : `axis`, `cells`, `touch`, `offCentre` ; figure connexe, ni en ligne droite), contrôle dans `scripts/lib/grid-board.js` (`mirrorTarget`, figure d'un seul côté, image dans la grille). Séries `applications/…/geometrie/symetrie-completer-01` : CE2 (sapin fixe + axes vertical / horizontal, figure éloignée de l'axe), CM1 (axe décalé), CM2 (axe décalé + diagonale). Reconnaître un axe au CP / CE1 : les séries `symetrie-01` existantes suffisent.


- Compléter une figure par symétrie axiale : cliquer les cases à colorier de l'autre côté d'un axe vertical ou horizontal (diagonal au CM2).
- Réutiliser la grille de 2.1.
- Vérification : comparaison exacte de l'ensemble des cases.
- Générateur : figure aléatoire connexe d'un côté de l'axe.
- Complète CM2 `geometrie` (lot 1.1 a laissé la symétrie à cette phase) et l'axe de symétrie CP / CE1 (reconnaître, `mcq` d'abord).

### 2.3 Figures dans toute orientation (`shapesSvg`) — GS → CM2 — ✅ livré

> Fait : générateur `trouverFormes` (geometrie.js depuis 2.4, `tile-select`) qui dessine lui-même les figures en polygones SVG tournés plutôt que d'ajouter un angle aux helpers de `svg.js` (leurs paramètres sont passés par position : un `rotate` ajouté en fin de liste serait pris pour une étiquette). Cibles carré / rectangle / losange / triangle / triangle rectangle / disque ; `turn` all / some / none ; `near` (rectangle et losange presque carrés, parallélogramme presque rectangle, triangle presque rectangle, toujours à 6° au moins) ; `inclusive` (CM : le carré compte comme rectangle / losange). Contrôle indépendant `scripts/lib/shapes.js` : relit les sommets, nomme la figure par ses côtés et ses angles, refuse les figures ambiguës. Séries `applications/…/geometrie/formes-tournees-01` : GS (voix, carrés / triangles), CP, CE1, CE2, CM1 (inclusif). Pas de série CM2 : le CM1 couvre déjà les définitions inclusives ; le trapèze (CM2) pourra s'ajouter comme cible.

- Paramètre de rotation (et éventuellement d'échelle) pour les helpers existants : `squareSvg`, `rectangleSvg`, `triangleSvg`, `rhombusSvg`, `parallelogramSvg`, `trapezoidSvg`, `regularPolygonSvg`…
- Objectif : reconnaître un carré « posé sur la pointe », un triangle retourné, etc. — erreur classique des élèves.
- Usage : générateur `tile-select` / `mcq` « trouve tous les carrés » avec distracteurs (losange non carré, rectangle presque carré).
- GS : formes simples + voix.

### 2.4 Angles en SVG, sans rapporteur — CM1 / CM2 — ✅ livré

> Fait : nouveau module `generators/geometrie.js` (`trouverFormes` y passe : `mesures.js` revient à 5,2 Ko gzip, `geometrie.js` 3,2 Ko, chargé par les seules pages de géométrie). Dessin `angleSvg(deg, turn, arms)` interne au module (même raison qu'en 2.3 pour ne pas toucher `svg.js`), échelle fixe pour que la longueur des côtés se compare d'un dessin à l'autre. Générateurs `trouverAngles` (`tile-select`, aigu / droit / obtus, `near` à 14–26° du droit), `comparerAngles` (`mcq` A / B / égaux, `gap`, `equal`, `trap` : le plus grand angle a les côtés les plus courts), `rangerAngles` (`drag-sort` d'images, ordre listé = réponse, `gap`, `trap`). Contrôle indépendant `readAngle` / `angleKind` dans `scripts/lib/shapes.js` (mesure depuis la polyligne, arc sur les côtés, rien entre 78° et 102° sauf 90°). Séries `applications/…/geometrie/angles-comparer-01` : CM1 (droits, aigus, obtus, comparer écart ≥ 25°, ranger 3), CM2 (presque droits, obtus proches, comparer écart ≥ 12° + égaux, ranger 4). Pas encore : somme / multiple d'angles (CM2).

- Comparer deux angles, classer aigu / droit / obtus, ranger 3–4 angles (`drag-sort` avec SVG).
- Pas de rapporteur au cours moyen (programme 2025) : pas de mesure en degrés à lire.
- Helper `angleSvg(deg, rotation, armLengths)` : varier l'orientation et la longueur des côtés (piège : « les côtés plus longs font un angle plus grand »).

### 2.5 Probabilités visuelles — CM1 / CM2 — ✅ livré

> Fait : nouveau module `generators/donnees.js` (chargé par les seules pages de hasard). Dessin `chanceSvg` interne : urne (boules mêlées par rangées de 4), roue (parts égales, groupées ou mêlées avec `mix`, flèche en haut), dé spécial (ses 6 faces numérotées) ; `slicedPieSvg` n'a pas servi (une seule couleur). Générateurs `hasardPossible` (`mcq` impossible / possible / certain ; `levels: 4` peu probable ≤ 1/4, très probable ≥ 3/4 ; `levels: 5` ajoute « une chance sur deux », vocabulaire CM1), `hasardComparer` (deux urnes ou roues A / B / autant, `sameTotal` au CM1, `trap` au CM2 : la plus probable a moins de boules de la couleur, `equal` : 2 sur 4 contre 3 sur 6), `hasardChances` (« a chances sur b », distracteurs a sur (b − a), (b − a) sur b, 1 sur (nombre de couleurs), jamais deux choix de même valeur ; `union` : « le rouge ou le bleu »), `hasardRanger` (`drag-sort` de pastilles de couleur, ordre listé = réponse). Contrôle indépendant `scripts/lib/hasard.js` : relit les boules (couleur, aucune cachée), les parts (angles égaux, 360°), les faces ; l'évènement est relu dans la consigne. Prompt LLM : composition en mots (30/30 CORRECT, Haiku). Séries `applications/…/donnees/` : CM1 `hasard-images-01`, CM2 `probabilites-images-01`. Les séries textuelles `hasard-01` / `probabilites-01` restent (pièce, deux roues, indépendance).


- Urne (boules colorées), roue (secteurs), dé : impossible / possible / certain, « plus / moins probable », « a chances sur b ».
- Helper SVG urne / roue (`slicedPieSvg` peut servir de base pour la roue).
- Générateur : tirer une composition, poser la question, calculer la réponse.
- Remplace à terme les versions textuelles de `donnees/hasard-01` (CM1) et `donnees/probabilites-01` (CM2), qu'on garde.

### 2.6 Manipulations GS — boîte de 10, balance, jeu de l'oie — ✅ livré

> Fait : aucun type nouveau. `boiteDix` (nombres.js, `count-objects` : boîte de 2 × 5, jetons rangés ou mêlés avec `scatter`, `ask: combien | manque`, réponse par 3 boutons nombres), `jeuOie` (nombres.js, `tile-select` en ligne : dé en points, grenouille sur sa case, cases carrées en SVG pour garder la grande taille enfant, `positional`, piste de 10 cases au plus), `balanceGS` (mesures.js, `tile-select` à 2 objets : la balance penche du côté lourd, objets tirés de paliers de masse fidèles au réel — plume < fraise < pomme < pastèque —, `trap` : le plus léger dessiné plus gros). `scaleSvg` n'a pas servi : il dessine des masses numérotées, pas des objets. Consigne parlée fixée par fichier (`say`), clips Piper générés. Contrôle indépendant `scripts/lib/manipulations.js` (cases et jetons, points du dé, plateau le plus bas). Prompt LLM : 15/15 CORRECT (Haiku). Séries `applications/gs/maths/` : `numeration/boite-dix-01`, `numeration/jeu-oie-01`, `mesures/balance-01`.


- **Boîte de 10** : combien de jetons ? combien pour remplir ? (`count-objects` / `mcq` + SVG).
- **Balance Roberval** : quel côté est plus lourd ? (`scaleSvg` existe déjà — vérifier ce qu'il dessine).
- **Jeu de l'oie** : un dé, un pion sur une piste ; sur quelle case arrive-t-il ? (surcomptage).
- Tout en voix, minimum de texte, emojis.

## Ordre conseillé

2.1 → 2.2 (même grille) → 2.3 → 2.4 → 2.5 → 2.6. Chaque lot est livrable seul.

## Idées en réserve (non planifiées)

- Courses avec budget (CE2 → CM2).
- Lire un emploi du temps / un calendrier (CE1 → CM1) — `calendarSvg` existe.
- Échelle sur un plan (CM2).
- Pixel art par coordonnées (CM1 / CM2) — `coordinate-grid`.
- Tangram / pentaminos (GS → CE2).
- Couleurs : coloriage magique aux fractions (`magic-color`).
