# Exercise types — landscape and gaps (2026-11-09)

Snapshot of what the site uses, what French and international references use, and what is missing — with a bias toward **fun** formats. Builds on [international-exercise-types.md](international-exercise-types.md) (84 formats, March 2026) and the format sections of [roadmap.md](roadmap.md) (March–April 2026); does not repeat their descriptions.

Counts: `.md` files under `src/fr/{exercices,applications,defis}`, grouped by front-matter `type:` (default `number-check`), level, topic and series. A generated file counts once (it plays `repeat` times).

---

## 1. Key findings

1. **Typing dominates CP→CM2.** 63–69 % of exercises are « type the answer » (`number-check`, `problem`, `multi-question`…); 12–19 % choose (mcq, true-false…); only 15–21 % are manipulations.
2. **GS is a one-type level.** 140 of 195 GS exercises (72 %) are `mcq`. Only 8 types are used there; `matching`, `ten-frame`, the board game, shape SVGs and pairing are still open in [maths_gs.md](maths_gs.md).
3. **Fun is thin and clustered.** Puzzle/game series (kenken, futoshiki, numberlink, maze, logic-grid, emoji-equations, magic-color, number-hunt, grid-board, venn, money-pay, number-strip) are **4 % of GS series, 6–11 % elsewhere**, mostly in CE2/CM1 `logique`. No game with chance, opponent, memory, construction or open target exists (memory: added, see §10).
4. **Puzzles stop at CM1.** kenken, futoshiki, numberlink: CE2/CM1 only. CM2 (192 series) has almost no puzzle beyond venn / emoji-equations / one maze.
5. **14 types live on ≤ 2 levels**, several on 1 series (§3). Cheap wins: content only, no code.
6. **Programme-core interactions missing:** division posée and × 2 digits in `column-op` (roadmap ❌), estimating on an ungraduated number line (national evaluation item), reproducing an assembly (CE1 evaluation item), solids/nets/cube assemblies (geometry is text-only), real construction (« Programmes de construction » CM2 = 4 mcq + 1 sort).
7. **Doc drift:** the March synthesis marks « Visualisation de cubes (3D) » ✅ — no type, generator or series exists. `fraction-paint` (14 files) is missing from the type table in [agents/exercises.md](../agents/exercises.md).

---

## 2. Inventory

3 383 files, 1 085 series, 63 types (+ `seq-verify` helper). Every type is used at least once.

| Level | Files | Type | Choose | Manipulate | Puzzle/game series |
|---|---|---|---|---|---|
| GS | 195 | 4 % | 84 % | 13 % | 2 / 45 (4 %) |
| CP | 312 | 63 % | 17 % | 21 % | 11 / 101 (11 %) |
| CE1 | 489 | 67 % | 12 % | 21 % | 10 / 170 (6 %) |
| CE2 | 694 | 63 % | 19 % | 17 % | 18 / 249 (7 %) |
| CM1 | 1 008 | 66 % | 19 % | 15 % | 27 / 328 (8 %) |
| CM2 | 685 | 69 % | 15 % | 16 % | 13 / 192 (7 %) |

« Type » counts `clock`/`ruler`/`count-objects`/`bar-model`/`guided-problem` as typing (the pupil types the result). Défis: 27 series only (CP 3, CE1 3, CE2 8, CM1 8, CM2 5).

Top 5 types by files: `number-check` 678 · `problem` 405 · `mcq` 337 · `multi-question` 167 · `tile-select` 145.

---

## 3. Underused types — where they should go next

Content-only work: the type exists, tested, often with a generator.

| Type | Series | Levels now | Natural extension |
|---|---|---|---|
| `compare-solutions` | 1 | CM1 | CE2 → CM2 problems: two methods, pick the right one (Chine 一题多解) |
| `thermometer` | 1 | CP | CE1 → CM2 data/measures; same SVG can read a graduated jug (contenances) |
| `decomp` | 2 | CE2, CM1 | CP/CE1 (dizaines-unités), CM2 decimals |
| `numberlink` / `futoshiki` / `kenken` | 2–4 | CE2, CM1 | CE1 (3×3 / 4×4 easy), CM2 (5×5–6×6, × ÷ cages) |
| `compare-groups` | 3 | CP, CE1 | GS (needs kid-mode buttons, open in maths_gs.md) |
| `tri-arith` / `fact-family` | 3 | CE2–CM2 | CP/CE1 (sums ≤ 20) — Rechendreieck is a CP format in Germany |
| `number-strip` | 3 | GS, CP | CE1 (by 2s/5s/10s), CE2 (picture patterns) |
| `money-pay` | 4 | CE1–CM1 | CP (coins ≤ 20 €) |
| `magic-color` | 4 | CP–CM1 | CM2 (decimals, fractions, multiples) — the « pixel-art » item of the roadmap is just bigger grids |
| `estimation` | 4 | CE1–CM2 | more series: it is the « reasonableness » format of the new programmes |
| `number-hunt` | 5 | CP, CE1 | CE2 (by 10s / 100s), GS (≤ 10, spoken) |
| `click-blocks` | 6 | CE1–CM2 | CP |
| `classify` | 11 | GS, CE2–CM2 | CP, CE1 — none there; also the carrier for Always/Sometimes/Never (§6) |
| `venn` | 10 | CE1–CM2 | CP (emojis: colour × shape) |
| `matching` | 34 | CP–CM2 | GS (open in maths_gs.md) |
| `ruler` | 8 | CP, CE1, CM1 | CE2 (mm), CM2 (decimal cm) |
| `clock` | 14 | CP–CM1 | CM2 (durations on the face, `set` mode) |

Single-topic types (fine as is): `pyramid`, `column-op`, `calc-chain` (calcul), `coordinate-grid` (geometrie), `bar-chart` (donnees).

---

## 4. Status of earlier wish-lists

**Done since March/April:** think board, empty number line (`jump-line`), venn, ratio tables (`fill-table`), compare without computing, fact families, pyramid, true/false equations, constrained maze, inverse problems, estimate → compute, arithmetic chains, find the mistake, function machine, bar model (+ guided), percentage bar, grille de coloriage, Rechendreieck, Kapitänsaufgabe (`piege-du-capitaine`), kenken, futoshiki, numberlink, money picker (`money-pay`), angle comparison, robot coding, grid drawing / symmetry.

**Still open (from those lists):**

| Format | Source | Notes |
|---|---|---|
| Always / Sometimes / Never | UK mastery | 0 series. Fits `classify` with 3 boxes — content only |
| Odd one out / WODB | UK, US | 1 series (GS collier). `tile-select` covers the closed version |
| Päckchen / Bianshi variation sets | DE, CN | 0 « que remarques-tu ? » series. Content: 4 linked calculations + a `select`/`mcq` on the pattern |
| Memory | universal | 0. New type |
| Dominoes | FR classrooms, MathsMentales | 0. New type (or `matching` chain) |
| Calculatrice cassée | Sésamath, MathALÉA | 0. New type |
| Le compte est bon / Mathador | FR (Canopé) | 0. New type |
| Kakuro, shut-the-box | JP, trad. | 0 |
| Carrés / triangles magiques | IN, FR | 0 (`tri-arith` is the additive cousin) |
| Cubes, patrons | KR, programme | roadmap ⚠️; March doc wrongly ✅ |
| Shiki (expression first, labelled) | JP | `guided-problem` `operation` step is close |
| Hotspot scene / Rechengeschichten | DE, KR | 0 |
| Composition de problème, open-ended | RU, JP | hard to auto-check; skip |

---

## 5. French references

### Programmes (cycle 2: BO n° 41, 31 Oct 2024, rentrée 2025 · cycle 3: BO n° 16, 17 Apr 2025, CM1 rentrée 2025, CM2 rentrée 2026)

What they stress → format implication:

| Stress | Our coverage | Gap |
|---|---|---|
| Automatismes, daily mental calc, flash | défis (27), `number-check` | Few défis at CP/CE1; no « flash » (show then hide) outside GS `count-objects` |
| Explicit problem-solving strategies, ~10 problems a week (C3) | `problem`, `guided-problem`, `bar-model`, Vergnaud classes | Well covered; missing « write the expression first » and two-method comparison beyond 1 series |
| Schéma en barres | `bar-model` 33 series | ✅ built by the pupil since 2026-11-11 (`build: true`) |
| Number line, fractions as numbers | `number-line` read/place, `fraction-op` droite | No **ungraduated** estimate (0 — 100, place 37 roughly) |
| Calcul posé | `column-op` (+, −, × 1 digit) | Division posée, × 2 digits (✅ B2) |
| Espace et géométrie: reproduce, construct, solids | `grid-board` draw, symmetry | Assemblies (tangram), solids/nets, cube counts, real construction steps |
| Grandeurs: masses, contenances | balance, conversions, jug, dial | ✅ jug / scale dial (2026-11-11) |

### National evaluations (CP, CE1, CM1, CM2 « Repères »)

Formats that recur in the maths booklets and that we lack or underuse:
- **Place a number on a line with only 0 and 10 / 100** (estimation, tolerance) — missing mode.
- **Reproduce an assembly** (CE1; one of the two skills where girls score at least as well) — missing.
- **Problems read aloud** — voice exists only for GS; CP problems are text.
- Mental calc under time, number dictation (`dicteeNombre` ✅), compare, represent quantities ✅.

### Platforms and classroom practice

| Reference | Format worth taking | Status here |
|---|---|---|
| Calcul@TICE (national, CP–6e) | Many mental-calc mini-games: le nombre cible, la cible, l'abaque, les dominos, la course aux nombres | défis cover drill; the « game » shells are missing |
| Mathador (Canopé) | Reach a target with 5 numbers and 4 operations, bonus for using all | missing → `compte-est-bon` |
| MathALÉA / MathsMentales | Calculatrice cassée, dominos, flash, ceintures | missing (ceintures = progression meta, out of scope) |
| MHM (Pinel) | Problème du jour, « l'énigme », calcul flash, number of the day | content; number of the day = `number-forms` ✅ |
| ERMEL / Brousseau | **La course à 20** (two players, add 1 or 2, first to 20 wins — find the winning strategy), jeu du banquier (exchanges 10 ↔ 1) | missing; strongest « fun + reasoning » French classic |
| Classroom rituals | Le furet (count by n around the class), nombre mystère (clues on a 100 board), tableau des nombres | `sequence` covers furet; no 100-board interaction |
| Kangourou, Rallye mathématique transalpin | 5-choice puzzle MCQ, team problems | content in `mcq` / `problem` |
| Adaptiv'Math, Mathia (P2IA, cycle 2) | Adaptive paths, collection of stars | progression meta, not types |

---

## 6. International references not in the March doc

| Reference | Format | Auto-checkable? | Fit |
|---|---|---|---|
| Open Middle (US) | « Use digits 1–9 once each to make the largest / a true … » — many answers, one rule | ✅ check the rule | CE2–CM2 calcul; digit-tile placement |
| Splat! / Esti-Mysteries (Wyborney) | Dots, some hidden under a splat: how many under it? | ✅ | GS/CP (= « Sous le chapeau » but visual) |
| Estimation 180 | Estimate, reveal, score by closeness | ✅ tolerance | measures, quantities |
| Clothesline math | Order and space cards on a line | ✅ | fractions/decimals, = number-line place with several cards |
| Number strings / Päckchen | 4–5 linked calculations, each helps the next | ✅ | calcul réfléchi |
| Nikoli / logic puzzles | Nonogram (picross: row counts reveal a picture), sudoku 4×4 picture, kakuro | ✅ | GS–CP picture sudoku, CE2–CM2 picross/kakuro |
| Polypad, NRICH | Tangram, pentominoes, polyomino covering, cube building, rekenrek | ✅ shape match | geometry gap |
| Beast Academy | Comic-strip puzzles, « cross-number », mazes with operations | ✅ | CM puzzles |
| Times Tables Rock Stars, Prodigy | Speed duels, RPG wrapper | — | défis + meta only |
| Ten frame / rekenrek (US, NL) | Build and read quantities by 5 and 10 | ✅ | GS/CP (open in maths_gs.md) |

---

## 7. Fun — what kind of fun is missing

| Mechanic | Have | Missing |
|---|---|---|
| Logic deduction | kenken, futoshiki, logic-grid, emoji-equations, venn | picross, picture sudoku, kakuro, magic squares |
| Path / spatial | maze, numberlink, robot | tangram, pentomino, cube building |
| Reveal a picture | magic-color | picross |
| Speed | défis | flash, duels against own best |
| **Chance** (dice, cards) | probability mcq, jeu de l'oie tap | shut the box, dice race, card « bataille » |
| **Opponent / strategy** | — | course à 20 / Nim vs the computer |
| **Memory** | — | memory cards |
| **Open target** | — | compte est bon, Open Middle, calculatrice cassée |
| Collection / meta | stars? (none per type) | out of scope here |

Constraints to keep: auto-checkable, click-only in GS with prerecorded `say` clips, small pages (runtime SVG), no browser speech.

---

## 8. Gap map by domain

| Domain | Strong | Gap |
|---|---|---|
| Nombres / numération | base-10, number-line, strips, decomp | 100 board, ungraduated line, banker exchange game |
| Calcul | everything typing | open-target games, column division / ×2 digits, Päckchen |
| Fractions / décimaux | many types | clothesline ordering, fraction memory |
| Problèmes | problem, guided, bar-model, inverse | build the bar model; Shiki; compare-solutions beyond CM1 |
| Grandeurs | clock, money, conversions, jump-line | jug, scale dial, ruler CE2/CM2, thermometer beyond CP |
| Géométrie | grid draw, symmetry, robot, shapes | tangram/assembly, solids & nets, cube counts, construction steps |
| Données / hasard | bar-chart, curves, pie, urns | pictograms with a key (0 series, CE1/CE2 programme), dice games |
| Logique | many puzzles CE2/CM1 | CP/CE1 and CM2 puzzles, picross, sudoku 4×4 |
| GS | mcq, tile-select, classify | ten frame, matching, pairing, board game, shapes SVG, Splat |

---

## 9. Recommendations

### A. Content only (no new code)

1. Always / Sometimes / Never with `classify` (CE2–CM2).
2. Extend puzzles to CE1 and CM2: kenken 3×3 / 6×6, futoshiki, numberlink, magic-color CM2.
3. Spread one-series types: `compare-solutions`, `thermometer`, `decomp`, `money-pay` CP, `classify`/`venn` CP–CE1, `ruler` CE2/CM2, `clock` CM2.
4. Päckchen series: 4 linked calculations + « que remarques-tu ? » `mcq`.
5. Pictograms: `multi-question` with an emoji key (CE1/CE2).
6. More défis at CP/CE1.
7. Fix doc drift: add `fraction-paint` to the type table; untick cubes in the March synthesis.

### B. Small extensions of existing types

| Extension | Type | Why |
|---|---|---|
| `estimate` mode, tolerance, only ends labelled | `number-line` | national evaluation item |
| Division posée, × 2 digits | `column-op` | programme core, roadmap ❌ |
| ✅ Build mode (place the numbers and the ?) | `bar-model` | programme stresses the bar diagram |
| ✅ Splat (hidden part over a picture) | `count-objects` | GS/CP fun, Splat! |
| ✅ Jug / dial | `thermometer` | contenances, masses |

### C. New types, ranked (value × fun ÷ cost)

| # | Type | Levels | Fun | Cost | Why first |
|---|---|---|---|---|---|
| 1 | `memory` ✅ | GS → CM2 | ★★★ | low | click-only, works in GS, any equivalence (digit ↔ dots, fraction ↔ drawing, clock ↔ time) |
| 2 | `ten-frame` ✅ | GS, CP | ★★ | low | already specified in maths_gs.md |
| 3 | `strategy-game` ✅ (course à 20 / Nim vs computer) | CP → CM2 | ★★★ | medium | French didactic classic; the only opponent format |
| 4 | `compte-est-bon` ✅ | CE2 → CM2 | ★★★ | medium | Mathador culture; expression builder reusable for Open Middle and calculatrice cassée |
| 5 | `tangram` ✅ / assembly (pieces snap at fixed rotations) | GS → CM1 | ★★★ | medium–high | geometry gap + CE1 evaluation item |
| 6 | `picross` ✅ | CP → CM2 | ★★★ | medium | counting / addition + picture reveal; generator-friendly |
| 7 | `hundred-board` (nombre mystère, +10 / −1 moves, patterns) | CP → CE2 | ★★ | low–medium | core French tool, absent |
| 8 | Solids & cubes (count cubes, pick the net) | CE1 → CM2 | ★★ | medium | via `tile-select` + SVG generator first, no new type |
| 9 | `dice-game` (shut the box, race) | CP → CE1 | ★★★ | medium | chance mechanic |
| 10 | `broken-calc` ✅ | CE1 → CM2 | ★★ | low after #4 | reuses the expression keypad |

Suggested order: A (all) → B1, B2 → C1, C2 (GS lift) → C4 (then C10 cheaply) → C3 → C6 → C5.

---

## Sources

- Programme cycle 3 2025: [ac-bordeaux](https://ent2d.ac-bordeaux.fr/disciplines/mathematiques/le-programme-de-cycle-3-a-partir-de-2025/), [ac-lyon nouveautés C1–C3](https://maths.edu01.ac-lyon.fr/wp-content/uploads/sites/60/2025/01/MODULE-1-Programmes-MATHS-C1-C2-C3-Nouveautes.pdf), [ac-lille diaporama C3](https://ienavion.etab.ac-lille.fr/files/2025/04/2-Diapo-C3-Partie-Maths-2-2.pdf); project summaries in `docs/maths_*.md`
- National evaluations: [Repères CP 2025](https://www.education.gouv.fr/depp/evaluations-2025-reperes-cp-467681), [Repères CE1 2025](https://www.education.gouv.fr/depp/evaluations-2025-reperes-ce1-467881), [CE1 results](https://www.education.gouv.fr/sites/default/files/document/-valuations-2025-rep-res-ce1---r-sultats-nationaux-475522.pdf), [Repères CM1 2025](https://www.education.gouv.fr/depp/evaluations-2025-reperes-cm1-467896)
- Platforms: [Calcul@TICE](https://ent2d.ac-bordeaux.fr/disciplines/mathematiques/la-ressource-calcultice/), [IA cycle 2 (Adaptiv'Math, Mathia)](https://eduscol.education.gouv.fr/6714/l-intelligence-artificielle-pour-accompagner-les-apprentissages-des-fondamentaux-au-cycle-2), [Polypad / Mathigon](https://mathigon.org/teachers), [Common Sense elementary tools](https://www.commonsense.org/education/lists/10-best-math-tools-for-elementary-schoolers)
- Earlier internal surveys: [international-exercise-types.md](international-exercise-types.md), [roadmap.md](roadmap.md) (MathALÉA, Lumni, Sésamath, IXL, MathsMentales, Mathador, WIMS, LearningApps, LogicielÉducatif, Mathia, NRICH, Nikoli)

---

## 10. Progress

### 2026-11-09 — section A (content), 31 series added

| Item | Series |
|---|---|
| A1 Toujours / parfois / jamais (`classify`, 3 boxes) | CE2 `calcul/toujours-parfois-jamais-01`, CM1 same, CM2 `calcul/…` + `geometrie/toujours-parfois-jamais-01` |
| A2 Puzzles CE1 / CM2 | CE1 `kenken-3x3` (`ops: [+, -]`, new generator param), `futoshiki-4x4`, `numberlink-4x4` · CM2 `kenken-6x6`, `futoshiki-5x5`, `numberlink-6x6`, `numeration/coloriage-divisibilite-01` (3, 9, 25) |
| A3 One-series types spread | `thermometer` CE1 `temperature-01` (new `step: 1`, whole-degree ticks) + CM1 `temperature-fievre-01` (half degrees) · `compare-solutions` CE2 `calcul/qui-a-raison-01`, CM2 `problemes/qui-a-raison-01` · `decomp` CE1 · `money-pay` CP · `venn` CP · `classify` CP `classer-dizaines-01`, CE1 `pair-impair-classer-01` · `ruler` CE2 `regle-millimetres-01` · `clock` set mode CM2 `aiguilles-durees-01` |
| A4 Päckchen | `calcul/paquets-calculs-01` CE1, CE2, CM1 (`multi-question`, every question with an `operation` trace) |
| A5 Pictograms | `donnees/pictogrammes-01` CE1 (keys 2 and 5), CE2 (keys 5, 10, 2) |
| A6 Défis | CP `complements-10-01`, `doubles-moities-01` · CE1 `plus-moins-10-01`, `complements-100-01` |
| A7 Doc drift | `fraction-paint` row in agents/exercises.md, stale « not usable » list in agents/content.md, cubes unticked in international-exercise-types.md |

Engine side effects:
- `classify` and `compare-solutions` now show the body (the validator required it; `classer-fractions-01` CM2 gains its visible hint).
- **KenKen cages were invisible on every page**: the static `style="--cage-border…"` was overwritten by Alpine's `:style`, so `var(--cage-border)` was undefined and no border drew. Borders now use `var(--cs)` (light and dark).
- Thermometer: `step` option; short ranges get more pixels per degree and the SVG keeps its natural size (a 35–42 °C fever thermometer was blown up).
- Answer placeholder: ruler / thermometer / number-line show « 0,0 » only for decimal answers, « ? » otherwise (CE1 rulers and thermometers suggested a decimal).
- Oracle: ruler titles asking for « millimètres » read the cm ruler × 10; magic-color labels « Divisible par N » / « Non divisible ».

A leftovers done on 2026-11-10: `decomp` CP `numeration/decomposer-dizaines-01` (one box per digit of `maxVal`: no more « 0 centaine »), CM2 `numeration/decomposer-grands-nombres-01` (up to centaines de mille) and `decimaux/decomp-milliemes-01` (`decimals: 3`) · `ruler` CM2 `decimaux/droite-centiemes-01` (hundredths; `labelDivisions` writes each tenth; on a phone the ruler keeps 640 px and scrolls, opened on the marker). `decomp` rows are now left-aligned in a centred block.

**B1 done:** `number-line` `mode: estimate` (ends labelled only, `tolerance`, « plus à droite / à gauche » hint, exact spot shown in green once solved). Series `estimer-droite-01` CP (0–20), CE1 (0–100), CE2 (0–1 000 and 300–400), CM1 fractions (0–1), CM2 décimaux (0–1, 2–3).

**B2 done:** `column-op` × by 2+ digits (partial-product rows) and `÷` potence (quotient, products, remainders with lowered digits; `products: false`, `steps: false`). Series `multiplication-2-chiffres-01` CM1 / CM2, `division-potence-01` CM1 (÷ 1 digit, includes a 0 in the quotient) / CM2 (÷ 2 digits). Existing « pose sur ton cahier » number-check series kept.

**C1 done:** `memory` type (cards turned two at a time; text or drawn faces: dice, fingers, objects, disc, fraction, clock, base-10 blocks; `sum` for complements, `faceUp`). Every deck is checked by `scripts/lib/memory.js`: pairs go together, no card goes with another pair. Generator `memoryPaires`. Series: GS `numeration/memory-01` (dice ↔ objects / fingers, 3 pairs), `memory-02` (digit ↔ dice / mixed, 4 pairs, spoken « Retourne deux cartes. Trouve les paires. ») · CP `numeration/memory-nombres-01` (digit ↔ fingers / quantity, blocks), `calcul/memory-complements-01` (sums, make 10) · CE1 `calcul/memory-calculs-01` (+, −, doubles, tables 2–5, make 100), `exercices/ce1/numeration/memory-lettres-01` (static: digits ↔ words, 17–99) · CE2 `calcul/memory-tables-01`, `mesures/memory-heures-01` (clock ↔ « 3 h 15 » / « 3 h et quart ») · CM1 `fractions/memory-fractions-01` (disc ↔ fraction, fraction ↔ decimal) · CM2 `decimaux/memory-decimaux-01` (fraction ↔ decimal, clock ↔ afternoon time).

**C2 done:** `ten-frame` type — tap cells to put tokens in or take them out (red tokens at the start, blue ones put by the pupil), one or two boxes, `tenFirst`. Generator `boiteDixRemplir` (montre with a digit or a die, plus / moins `by`). Series: GS `numeration/boite-dix-remplir-01` (digit 1–5, die 1–6), `-02` (5–10, un de plus, un de moins; 4 new Piper phrases) · CP `numeration/boites-dix-20-01` (11–20 on two boxes, first box first; add 2, take away 3).

**C4 done:** `compte-est-bon` type — tiles combined two at a time (TV-game rules: positive subtraction, exact division), undo / restart, `useAll` for the Mathador « coup ». Every deck is re-solved by `scripts/lib/compte-est-bon.js`. Generator `compteEstBon` (targets that need at least `minSteps` operations). Series: CE2 `calcul/compte-est-bon-01` (4 numbers ≤ 10, without then with ÷) + `exercices/ce2/calcul/compte-est-bon-01` (3 static first challenges, + − ×) · CM1 `calcul/compte-est-bon-01` (5 numbers with 25 / 50, target 100–300; use all 4 numbers) · CM2 `calcul/compte-est-bon-01` (25–100, target up to 999 in 3+ steps; use all 5 numbers).

**C10 done:** `broken-calc` type — a left-to-right pocket calculator with broken digit and operation keys; « Fais afficher N » (N holds a broken digit). `scripts/lib/broken-calc.js` proves one operation reaches it. Generator `calculatriceCassee`. Series `calcul/calculatrice-cassee-01`: CE1 (+ −, 20–99, one then two broken digits) · CE2 (100–999; the + key broken) · CM1 (two broken digits; only × and ÷ left) · CM2 (1 000–9 999 with two broken digits; only ÷ left).

**C6 done:** `picross` type — nonogram: press a cell to colour it (✕ mode crosses out), slide to paint along the row or column the stroke starts on; a line whose runs match is greyed; solved when every line matches, the picture takes its colour (« C’est un chat ! 🐱 »). 27 hand-drawn pictures (5×5, 8×8, 10×10), each with a single solution — `scripts/lib/picross.js` line-solves + backtracks to prove it, and values clue labels. Generator `picrossImage` (`size`, `pictures`, `labels`: clues written as calculations `+ − × ÷`, fractions « ¾ de 8 », decimals « 2,5+1,5 »). Series: CP `logique/picross-01` (5×5) + `exercices/cp/logique/picross-01` (3 static: robot, parapluie, lune) · CE1 `logique/picross-01` (5×5 then 8×8) · CE2 `logique/picross-01` (8×8), `calcul/picross-calculs-01` (+ − ×) · CM1 `logique/picross-01` (10×10), `calcul/picross-calculs-01` (× ÷) · CM2 `logique/picross-01` (10×10), `fractions/picross-fractions-01` (fractions of a number, decimal sums).

**C5 done:** `tangram` type — drag the pieces from the tray onto the grey silhouette; they land on whole points of a lattice cut into quarter-triangles (so pieces turn by quarter turns: tap to turn, ↔ to flip, keyboard arrows / Enter / F). Any covering counts (two big triangles swapped, etc.). 17 figures found by a tiling search: 7 pieces carré, grand triangle, bateau, parallélogramme, bonhomme; fewer maison, poisson, flèche, cabane, bougie, oiseau; GS big simple pieces (maison, sapin, bateau, poisson, fusée). `scripts/lib/tangram.js` checks the layout and coverings. Generator `tangramFigure` (`figures`, `outlines`, `turn`). Series `geometrie/tangram-01`: GS (2–4 pieces, places drawn, no turning, spoken « Pose les pièces sur le dessin. ») · CP (places drawn, turning) · CE1 (silhouette only, 3–6 pieces: reproduce a figure, the national evaluation item) · CE2 (up to 7 pieces) · CM1 (7 pieces: square, triangle, parallelogram, boat, bonhomme).

**C3 done:** `strategy-game` type — turn by turn against the computer. `course` (say the next number by adding one of `moves`, who says N wins: track of the numbers said, a hundred square for 100) and `allumettes` (take sticks; `misere`: who takes the last one loses, Fort Boyard). The pupil always gets the seat that can win (the computer starts from a losing position); `smart` sets how often the computer plays its best move. A lost game is replayed with a growing hint: a question, the key number (« Si tu dis 17… »), then all the winning numbers. `scripts/lib/strategy-game.js` computes the winning positions for any set of moves. Generator `jeuStrategie`. Series `logique/`: CP `course-a-10-01` (computer random, then half-smart; sticks) · CE1 `course-a-20-01` (the didactic classic; the perfect computer) · CE2 `jeux-strategie-01` (course à 20, à 30 by 1–3, last stick loses) · CM1 (course 30–40, à 50 by 1–4, 20–25 sticks) · CM2 (course à 100 by 1–10, bonds of 1, 3 or 4 — the pattern changes —, sticks 1 / 3 / 4).

**Blocs cibles done (2026-11-10, asked by the user, from playmath « sum blocks »):** `target-blocks` type — number tiles dragged into overlapping dashed blocks (or tap, then tap the spot); a tile in an overlap counts for each block around it; each block's tiles combined with its operation give its target. `+` / `×` any number of tiles, `ops`: each block its own (`−` / `÷` tried and dropped 2026-11-11: with free placement the order of the two numbers cannot be shown, too confusing for pupils). Layouts un, deux (corner overlap), chaine (3), trio (3 overlapping, a centre region for all three). Live totals per block (off for the hardest), decoy tiles. `scripts/lib/target-blocks.js` checks the shipped placement. Generator `blocsCibles`. Series `calcul/blocs-cibles-01`: CP (one block ≤ 10, two blocks) · CE1 (two blocks, chain, tens) · CE2 (chain, three blocks, ×) · CM1 (× chain, + chain to 60, + and ×) · CM2 (three blocks + / ×, × with bigger numbers, + / × with a decoy and no live totals).

**C7 done (2026-11-11):** `hundred-board` type — the tableau des nombres as a CSS grid. `find`: tap the mystery number from clues (dizaines / unités / centaines, entre, pair, somme des chiffres, juste après / avant / en dessous / au-dessus, plus grand / petit — always one number only) or follow arrows (↓ +10, → +1, ↑, ←) on a board whose numbers can be hidden (start and landmarks written). `fill`: holes to type, or a « morceau du tableau » (only a piece drawn: croix, L, T, escalier…). `color`: tap a pattern (de n en n, chiffre des unités / dizaines). `scripts/lib/hundred-board.js` rebuilds every text and answer. Generator `tableauNombres`. Series `numeration/tableau-nombres-01`: CP (morceau, voisins, mystère, motifs en colonne, trous) · CE1 (déplacements, cachés, mystère, morceau, motifs, morceaux 101–1 000) · CE2 (boards 101–1 000: mystère, déplacements cachés, morceaux up to 4 901, motifs, trous).

**C8 done (2026-11-11)** with phase 4.2 — no new type: `compterCubes`, `vueCubes`, `patronsCube`, `faceOpposee` (geometrie.js, checked by `scripts/lib/cubes.js`). See [plan-phase-4.md](plan-phase-4.md). Area by tiling (phase 4.3) at the same time: `grid-board` mode `area`, `aireQuadrillage`, `comparerAires`.

**C9 done (2026-11-11):** `dice-game` type — Ferme la boîte: roll two dice, tap open tiles that add up to them (closed at once; going over refused), « Je ne peux plus jouer » refused while a move exists (then a combination is shown). `oneDie` once the open tiles make 6 or less. Solved when a round ends; score = tiles left. `scripts/lib/dice-game.js`. Generator `fermeLaBoite`. Series `calcul/ferme-la-boite-01`: CP (6 cases), CE1 (9 cases, one die at the end), CE2 (12 cases). The race game is already `jeuOie` (GS).

Patrons du pavé (2026-11-11): `patronsPave` (geometrie.js, checked by `scripts/lib/cubes.js`), in CM2 `geometrie/patrons-cube-01`.

**B leftovers done (2026-11-11):** `bar-model` `build: true` (the pupil places the numbers and the « ? » in boxes drawn to scale, decoys in `extra`; hints; then computes) — `exercices/…/problemes/construire-schema-01` CE1 → CM2. Splat: generator `sousLaTache` (count-objects; GS peek then splat, CP up to 20) — `applications/{gs,cp}/…/numeration/sous-la-tache-01`. Jug and dial: `thermometer` `kind: jug | dial`, generator `lireMesure` — CE1 `mesures/lire-balance-01`, CE2 / CM1 `mesures/lire-mesures-01`. All three read back by independent checks (validator, `visual-checks.js`).

Next: GS gaps (`docs/maths_gs.md`).
