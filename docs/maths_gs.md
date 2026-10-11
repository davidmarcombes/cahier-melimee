# Maths - GS (grande section, maternelle)

Source: « Programme d'enseignement pour l'acquisition des premiers outils mathématiques du cycle 1 », annexe 2. Player rules (read-aloud, click only, minimal text): [agents/exercises.md](../agents/exercises.md) « Maternelle (GS) ».

**GS is our lowest level — there will never be PS/MS.** No screens before 5. Anything useful from the younger columns of the programme goes into GS as `facile`:

| Programme column | Difficulty in GS |
|---|---|
| « À aborder avant 4 ans », « À partir de 4 ans » | `facile` |
| « À partir de 5 ans » | `moyen` |
| « voire au-delà » (beyond 10, 3 parts, long growing patterns, wording that runs against the operation) | `difficile` |

Status: `[✓]` done and validated by hand · `[~]` exists, not validated / needs rework · `[_]` to do. The tag after each item is its difficulty.

## Programme constraints (apply to every GS series)

- Quantities up to 10 (« voire au-delà »). Build small numbers in order (2, then 3, then 4…). No zero, except as the result of a take-away.
- No + − × < > signs: the operations come through the situation (ajout, retrait, réunion, partage, déplacement).
- Vary the **size and kind** of objects (3 elephants < 4 ants) and how they are **laid out** (row, scattered, dice pattern, fingers).
- Number representations: dice patterns, fingers, number names (spoken), digits 1 to 10.
- Shapes: square, rectangle, triangle, disc, **in every orientation** (rotated squares, triangles that are not equilateral and have no horizontal side). Shapes are sorted regardless of colour, size and orientation.
- **No perspective drawings of solids** at maternelle → no solids exercises (and so no « empreintes »).
- Problems: one step only.

## Series in place (to validate by hand)

- [~] `compter-5-01` Compter jusqu'à 5 — `mcq` · `facile`
- [~] `plus-moins-01` Le plus, le moins — `mcq` · `facile`. ➕/➖ titles mean nothing to a 5-year-old; the spoken instruction carries it. Add « autant ».
- [~] `trier-couleurs-01` Trier par couleur — `classify` · `facile`. Follow-up: sorting by shape.
- [~] `suites-dessins-01` Suites de dessins — `mcq` · `facile` (repeating patterns). Follow-up: growing patterns.
- [~] `en-tout-01` Combien en tout ? — `mcq` · `facile` (parts-whole, total ≤ 6).
- [~] `compter-6-01` Compter jusqu'à 6 — generated (`compterGS`) · `facile`
- [~] `compter-10-01` Compter jusqu'à 10 — generated, mixed sizes · `moyen`
- [~] `compter-15-01` Compter plus loin que 10 — generated · `difficile`
- [~] `coup-d-oeil-01` D'un coup d'œil — generated, picture hides after 1.5 s (👀 to look again) · `facile`
- [~] `un-de-plus-01` Un de plus — `mcq` · `facile`
- [~] `un-de-moins-01` Un de moins — `mcq` · `moyen`
- [~] `plus-grand-nombre-01` Le plus grand nombre — `mcq` · `moyen`
- [~] `chapeau-01` Sous le chapeau — `mcq`: total as « 5 🐰 » in the title, one scene (visible ones + 🎩). Never draw « before » and « after » as two rows: pupils add them up · `facile`
- [~] `intrus-motif-01` L'intrus du collier — `tile-select` (`positional: true`) · `facile`. AB rows: the intruder makes a triple (the middle one is wrong); AAB/ABB/ABC rows use a symbol from outside the pattern (☀️ among ⭐🌙), because swapping in a pattern symbol always leaves two candidates.
- [~] `motifs-evolutifs-01` Des motifs qui grandissent — `mcq` · `moyen`

## Player / types to build

- [~] **`count-objects` tap mode**: in GS, 3 big number buttons around the answer instead of the input; `flash` (ms) hides the picture after a short look. Generator `compterGS` (layouts scattered / row / dice — 2 dice above 6, `mixSizes`, `flash`). Fingers layout still to do (needs a hand SVG).
- [_] **`ten-frame`** (boîte de 10 / boîte à œufs): tap empty cells to put tokens in; read a frame (« combien ? »); « one more / one less ».
- [_] **Row / train picker** for ranks: a fixed row of items (no shuffle), tap the 3rd / the last / the next-to-last; start marker on the left or the right (🔵 … 🔴).
- [_] **One-to-one pairing**: tap a 🐰 then a 🥕 to pair them; answer « autant / il en manque / il y en a trop ». Possibly `matching` in kid mode.
- [_] **Board game (jeu de l'oie)**: pawn on a 1-to-10 strip, dice (dice pattern or digit), tap the arrival square; moving forward and backward; find the starting square.
- [_] **Number strip (bande numérique)**: tap the empty square for a given number or picture; fill a strip with gaps by choosing from big tiles (current `sequence` needs typing).
- [_] **Plane shapes SVG**: square, rectangle, triangle and disc drawn at random rotation, size and colour (emojis can't rotate) → used by `classify`, `tile-select` and the « shape sorter » game (tap the hole a shape fits into).
- [_] **Roberval balance SVG**: two pans tipped toward the heavier side; « le plus lourd » and ordering 3 objects by transitivity.
- [_] **Tap-to-build row**: tap symbols to build a row (copy a pattern, continue it, translate it to other symbols).
- [~] `tile-select` in GS: checks itself once as many tiles as answers are picked; wrong tiles let go. Tiles sized so 8 fit on one row (desktop).
- [_] Check `matching` (tap-tap) in kid mode: sizes, emoji labels.
- [_] `compare-groups` in kid mode: replace the Autant / Plus / Moins words with something a pupil can tap without reading, or say each choice aloud.
- [_] A 🔊 on each answer button (« trois », « quatre »), so numbers can be heard as well as seen.

## Content to do — Découvrir les nombres (quantités)

- [~] See small quantities at a glance (1 to 4, shown briefly, dice pattern or scattered) (`coup-d-oeil-01`) · `facile`
- [~] Count up to 5 (`compter-5-01`) · `facile`
- [~] Count up to 6, then up to 10: scattered, in a row, dice patterns; mixed sizes (`compter-6-01`, `compter-10-01`) · `facile` ≤ 6, `moyen` ≤ 10 — fingers still to do
- [~] Count beyond 10 (11 to 15 objects) (`compter-15-01`) · `difficile`
- [_] Same number, different look: tap the box with as many as the model (dice pattern → objects, fingers → objects, digit → objects) · `facile` ≤ 6, `moyen` ≤ 10
- [~] One more: « il y avait 3 🐟, il en arrive un, combien maintenant ? » (`un-de-plus-01`) · `facile` · One less (`un-de-moins-01`) · `moyen`
- [_] Match quantity ↔ digit ↔ dice pattern ↔ fingers — `matching` · `facile` 1–6, `moyen` 1–10
- [_] Compare at a glance, big differences (×2 or more, can be large collections) — more / fewer · `facile`
- [_] Compare by one-to-one pairing (enough carrots for every rabbit?) · `facile`
- [_] Compare by counting each collection; **as many** (autant) · `moyen`
- [~] Compare two digits (« quel nombre est le plus grand ? »), 1 to 10 (`plus-grand-nombre-01`) · `moyen`
- [_] Ways to make a number (« 3, c'est 1 et 2 ») with fingers / shaker box (part hidden under a hat 🎩) · `facile` ≤ 6, `moyen` ≤ 10
- [_] Doubles: 2 and 2, 3 and 3, 4 and 4, 5 and 5 (two hands, dominoes) · `moyen`
- [_] Count on from the bigger number: « 5 dans ma tête, et encore 3 » · `moyen`
- [_] Counting rhyme: what comes after / before · `facile` ≤ 12, `moyen` ≤ 30 · counting back from 10 · `moyen` · by 2s up to 20 · `difficile`

## Content to do — Rang et position

- [_] Rank in a short row seen at a glance (≤ 3), then by counting (≤ 6): « le 1er, le 2e… » · `facile`
- [_] First, last, second, next-to-last; rank up to 10 by counting: « tape le 6e wagon » · `moyen`
- [_] Rank when the starting side changes (start at 🔴 or at 🔵) · `difficile`
- [_] Number strip to 6: put pictures (dice pattern, fingers, digit) in the right square; fill the gaps · `facile` · Same up to 10 · `moyen`
- [_] Board game: arrival square after moving forward or back 1 or 2 · `facile` · any move ≤ 6, find the starting square · `moyen`

## Content to do — Problèmes (one step)

- [~] Parts-whole, total of 2 small parts (`en-tout-01`) · `facile` · total ≤ 10 · `moyen` · 3 parts (3 red cubes, 1 blue, 2 green in the box) · `difficile`
- [_] Add one or take away a few from a small hidden collection (suitcase with 2 teddies, one more goes in) · `facile`
- [_] Take-away: 7 birds on a branch, 3 fly away — how many are left? (tap the ones that fly away, then count) · `moyen`
- [~] Missing part: hat game — how many are hidden under the hat? (`chapeau-01`) · `facile` ≤ 6 · ≤ 10 · `moyen` to do
- [_] Change: 8 children, 2 bikes out — how many more bikes must come out? · `moyen`
- [_] Groups: 3 boxes of 2 pencils · `facile` · 4 plates, 2 cakes on each · `moyen`
- [_] Fair sharing: 6 cakes for 2 dolls (tap to deal them out one by one) · `facile` · 10 cakes, possibly with some left over; how many envelopes of 2 for 10 pictures · `moyen`
- [_] Comparison with a difference: « Julie a 3 billes de plus que Pierre » (wording matches) · `moyen` · « Pierre a 3 billes de moins que Julie » (wording runs against the operation) · `difficile`

## Content to do — Formes

- [~] Sort by colour (`trier-couleurs-01`) · `facile` — warm-up for sorting by shape
- [_] Same shape as the model (shapes upright, colour and size vary) · `facile`
- [_] Shape sorter: tap the hole the shape fits into, shape turned · `facile`
- [_] Sort into families by shape when colour and size also vary (disc, square, triangle) · `facile`
- [_] Same shape as the model in any orientation (`tile-select` + shapes SVG); square / not a square · `moyen`
- [_] Sort into 4 families (square, rectangle, triangle, disc), rotated, non-equilateral · `moyen`
- [_] Name the shape (spoken « Où est le triangle ? ») · `moyen`
- [_] Puzzle / tiling: rebuild a model with up to 4 pieces · `facile` · up to 8 pieces · `moyen` (later — needs a tangram-like type)

## Content to do — Grandeurs

- [_] Longest / shortest of 2 objects, very different lengths · `facile`
- [_] Sort into 3 groups: short / medium / long · `facile`
- [_] Longest / shortest when lengths differ a little and don't start at the same point · `moyen`
- [_] Order 3 objects by length (staircase) · `facile` · up to 5 · `moyen`
- [_] Same length as the model (indirect comparison with a reference strip) · `moyen`
- [_] Heavier / lighter on a Roberval balance, 2 objects · `facile` · balanced = same mass · `moyen` · order 3 objects from 2 weighings (transitivity) · `difficile`
- [_] Mass is not size: a big light thing vs a small heavy thing (cotton bag vs sand bag, on the balance) · `moyen`

## Content to do — Motifs organisés

- [_] Copy a repeating pattern (tap-to-build) · `facile`
- [~] Continue a repeating pattern (`suites-dessins-01`) · `facile`
- [_] Find the hidden part of a pattern (the cover is lifted to check) · `facile`
- [_] Which rows are a repeating pattern? · `facile`
- [~] Find the odd one out in a pattern (`intrus-motif-01`) · `facile`
- [~] Growing patterns: ⚫⬛⚫⚫⬛⬛⚫⚫⚫… — what comes next? (`motifs-evolutifs-01`) · `moyen`
- [_] Same structure, other symbols: ★⚫⚫ ↔ 🔺🟦🟦 — tap the pattern built the same way · `moyen`
- [_] Translate a pattern into the other symbols (tap-to-build) · `difficile`
- [_] Create a pattern (free building, no check — later)

## Out of scope for GS (from the external exercise list)

- Counting by 5s and by 10s, numbers to 20 with tens (CP).
- Written additions and subtractions with signs, number sentences with a gap (CP).
- Measuring with a ruler, time units, thermometer (CP and later).
- Solids pictures (perspective is not used at maternelle), sides and corners of shapes, Venn diagrams.
- Finding your way on a grid / in space: not part of this maths programme (it belongs to the « Explorer le monde » domain).
