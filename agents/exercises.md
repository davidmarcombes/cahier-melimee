# Exercises

## Where Does Content Go?

Content contributors should only work in `src/fr/` — no templates, no `.njk` files.

| Folder | Purpose | Content pattern |
|--------|---------|-----------------|
| `src/fr/exercices/` | Static exercises | Many hand-written `.md` files per series |
| `src/fr/applications/` | Generated exercises | `.md` files with `generator:` + `repeat:` |
| `src/fr/defis/` | Timed challenges | Generated, uses `timed-player` layout |

**Rule**: if an exercise uses `generator:`, it belongs in `applications/`. If it's hand-written, it belongs in `exercices/`.

Infrastructure templates (pagination, CSV export) live in `src/_pages/`, not alongside content.

## Unified Player System

All exercises (static and generated) use a single engine: `seriesPlayer` in `app.js`.

Each series lives in a nested folder under `src/fr/exercices/{level}/maths/{topic}/{leaf}/` or `src/fr/applications/{level}/maths/{topic}/{leaf}/`:
- `index.yaml` — series metadata (`id`, `title`, `difficulty`). Level/topic/subtopic are derived from the directory path.
- `01-name.md`, `02-name.md`, ... — individual exercises with `type` in front-matter

The `id` field in `index.yaml` is used as the URL slug: `/fr/exercices/{id}/` or `/fr/applications/{id}/`. Series missing an `id` will not generate a page — the build warns at the end. Run `npm run generate:ids` to assign IDs.

Layout: `series-player.njk` (in `src/_layouts/`) with per-type partials in `src/_includes/types/`. Pagination template: `src/_pages/series-pages.njk`.

### Static exercises
Defined entirely in front-matter (answer, operation, type-specific fields).

### Generated exercises (applications)
Use `generator` + `repeat` + optional `params` in front-matter. At build time, `seriesPayload` emits a lightweight placeholder with `_gen` metadata. At runtime, `regenerateAll()` expands placeholders and generates fresh numbers on each page load.

Generators live in `src/assets/js/generators/`, one module per topic (`numeration`, `nombres`, `calcul`, `operations`, `fractions-decimaux`, `mesures`, `logique`) plus `_core.js` for shared helpers (`rand`, `shuffle`, `tableHtml`…). Each module is dual-export: it registers into `window.AppGenerators` in the browser and is `module.exports` under Node. `generators/index.js` is the Node entry (validator, tests, build): all generators merged, plus `moduleOf` (generator → module).

### Script loading in series-player.njk

- **`svg.js`** is loaded when ANY exercise in the series has a `generator:` OR `svg:` field.
- **`generators/_core.js` + the modules holding the series generators** are loaded only when an exercise has a `generator:` field (`generatorScripts` filter in `.eleventy.js`; an unknown generator fails the build). A typical page loads `_core.js` + one module (~6 KB gzip instead of 28 KB for all generators).
- **`svg.js`** also holds `base10Render` (base-10 blocks), so `base-10` exercises load it.
- **KaTeX CSS** is loaded when any exercise title contains `$` (LaTeX).

## Exercise Types

| Type | Partial | Description |
|------|---------|-------------|
| `number-check` | `types/number-check.njk` | Default. Simple operation with answer input. Supports trou (hole) mode. Several `?` in one chain (`5 + &box(3 × 4) = 5 + ? = ?`, generator `calculPriorites`) take one answer each, in order. `bodyFirst: true` (word problems, `problemesDivision`) shows the body above the picture and the blanks. |
| `problem` | `types/problem.njk` | Word problem or emoji puzzle. Shows body, answer input. `operation` is hidden (never shown): the calculation trace for the answer oracle, steps separated by « ; », units allowed, no `?` (the player would count it as an input box): `operation: "8 × 4,50 = 36 € ; 15 × 1,20 = 18 € ; 36 − 18 = 18 €"`. Every step must hold, the last result must be the answer, and each number used must be in the statement (or an earlier step; percentages, whole ratios of given numbers and usual conversions 60, 24, 1000… count). |
| `matching` | `types/matching.njk` | Drag/click to match pairs. SVG lines between items. |
| `sequence` | `types/sequence.njk` | Fill blanks in a number sequence. Legacy `given[]`+`answers[]`, or interleaved `sequence.items[]` (`{value}` / `{blank, inputIdx, answer}`) from generators — e.g. `suiteAvecControle` (hidden step, last cell given as a self-check; params `steps`, `given`, `blanks`, `direction` asc/desc/mixed, `startMax`, `offset`). |
| `number-strip` | `types/number-strip.njk` | Fill gaps in a number or picture strip by choosing tiles, then tapping empty cells. Fields: `cells[]` (strings/numbers with `null` gaps), `choices[]` (distinct tile labels), `answers[]` (zero-based choice index for each gap, in cell order). Auto-checks when every gap is filled; wrong placements clear so pupils can retry. |
| `grid-board` | `types/grid-board.njk` | Robot on a square grid (codage de déplacements). `board.mode`: `follow` (tap the arrival cell; GS: the tap checks), `write` (compose a program with the instruction buttons; any program reaching `goal` without a crash is accepted, at most `maxSteps` if set; the walked trail shows after « Vérifier »), `debug` (tap the one wrong instruction, `bug`). Instructions: `U D L R` with optional count (`R3` = « 3 → »); with `dir` (N/E/S/W heading, ▲ on the robot) `F` (avance, `F2`), `TL` / `TR` (tourne sur place). `blocks` `[r, c, emoji?]` stop the robot. `scripts/lib/grid-board.js` replays every board (validator + oracle): follow stays on the grid, write is reachable within `maxSteps`, debug has exactly one fixable instruction. Generator `robotGrille` (logique.js). `mirror`: colour the mirror image of `shape` across `axis` (`v` / `h`: the grid line before column / row `at`; `d` / `a`: a diagonal through the cells of a square grid); exact set, extra cells flash red; the checker wants a connected shape on one side whose image stays in the grid. Generator `symetrieGrille` (logique.js: `axis` v / h / vh / diag / any, `cells`, `touch`, `offCentre`). `draw`: draw segments between grid points `[r, c]` (0…`rows`, 0…`cols`; `paper` grid / dots). Tap a point, then another: a segment; the pen stays on the last point, tapping it again lifts it; ↶ undoes, 🗑️ clears; arrows + Enter on the keyboard. Every figure is compared as unit steps (segments cut at the grid points they cross), so the way it was drawn does not matter. `task`: `copy` (`model` segments shown on their own small paper, reproduced anywhere — up to a translation — or from `anchor: {from, to}`, a model point and the red point it goes to), `complete` (`given` drawn, `target` the whole figure, exact; optional `axis: {axis: v / h / d / a, at}` drawn red, the target must be symmetric), `shape` (`want: {shape: carre / rectangle / triangleRectangle / triangle, sides, area, tilted, inclusive}`: any closed figure that fits — `sides` in squares, for a right triangle the sides of the right angle; `tilted`: no side on the grid lines; a square is a rectangle only with `inclusive`), `parallel` / `perp` (`ref` the line d, `through` the point A: one unbroken straight line through A, 2 steps at least). The draw methods live in `src/assets/js/grid-draw.js` (loaded by draw pages only, mixed into the player). `scripts/lib/grid-board.js` re-implements the check (`drawCheck`), finds an answer (`drawSolution`) and checks the board can be done. Generator `tracerGrille` (geometrie.js): `task` copy / complete / mirror / shape / parallel / perp (or a list), `size` [rows, cols], `paper`; copy `figure` ortho (outline of `cells` in a `box`) / free (convex, `corners`, slanted sides), `anchor`; complete `shapes`, `side`, `tilted`; mirror `axis` v / h / vh / diag / any, `diagonals`, `touch`, `segments`; shape `shapes`, `ask` sides / area / free / tilted (or a list), `side`, `area`; parallel / perp `slopes` axis / diag / any. `area`: colour a figure (squares touching, no gaps; aire par pavage): `task` aire (`area` squares in one piece), perimetre (and `perimeter` sides of squares), meme-aire (the area of the blue `model`, another shape — up to a turn or a flip), autre-perimetre (the model's area, another perimeter); always one piece, no hole, not touching the model; the hint says what is wrong (count, piece, hole, perimeter, same shape). `solution[]` ships one answer; `areaCheck` in scripts/lib/grid-board.js re-checks it. Generator `colorierAire` (geometrie.js: `task` or a list, `area`, `model`, `size`). |
| `bounding` | `types/bounding.njk` | Place a number between bounds (encadrement). Generated items put `{ number, answers, mask }` under `bounding`; `mask` (`["□□,□□", …]`) draws grey squares under each box, one per digit to write. Generator `precedentSuivantDecimal` (fractions-decimaux.js: « ? < 33,47 < ? » → 33,46 / 33,48; `decimals` 1 / 2 / 3 / list, `maxInt`, `traps` (175,999 → 176,000, 33,401 → 33,400, 0,025), `mask` false: « Garde 2 chiffres après la virgule. » instead). Answers are compared by value: 176 = 176,000. |
| `convert` | `types/convert.njk` | Unit conversion exercises. |
| `pyramid` | `types/pyramid.njk` | Addition pyramids — fill missing cells. Give at least one cell per unknown so the pyramid is **solvable step by step**: each hidden cell must follow from one addition or subtraction of known neighbours (a top-down pyramid needing algebra, e.g. `2 160 + 3 × ? = 3 240`, is too hard for CP–CM2). The build computes all cells algebraically and fails on contradictory data; `check:answers` rejects pyramids that are not solvable step by step. |
| `logic-grid` | `types/logic-grid.njk` | Logic grid puzzle — click cells to place marks. Clues are the body's list items; they must give **exactly one** solution. `validate:exercises` checks it when every clue is direct (« Théo ne fait ni football ni tennis. »); descriptive clues (« Adèle dribble avec un ballon ») are left to the human check. Classic trap: a clue excluding an element another clue already assigned — it adds nothing and leaves two people interchangeable. |
| `true-false` | `types/true-false.njk` | Vrai/Faux table — tick true or false per assertion. |
| `compare` | `types/compare.njk` | Compare numbers — pick < or > between two values. |
| `compare-expressions` | `types/compare-expressions.njk` | Compare two expression strings without calculating — pick < = >. Fields: `comparisons[]` (left, right; answer auto-computed or explicit). |
| `estimation` | `types/estimation.njk` | Two-stage: estimate first (≈), then compute exactly (=). Both validated on Vérifier. Fields: `operation`, `estimate` (or `estimates[]`), `answer`. |
| `multi-question` | `types/multi-question.njk` | Shared context + multiple sub-questions, each validated on Enter. Optional hidden `operation` per question (same trace as `problem`, checked against the body, context and question): the exercise counts as machine-verified once every question has one. |
| `mcq` | `types/mcq.njk` | Multiple choice — click the correct answer among 3-5 shuffled choices. Generator `comparerAngles` (geometrie.js): two drawn angles A / B in `body`, bigger / smaller / equal (`gap`, `equal`, `trap`: the bigger angle has the shorter arms). Chance generators (donnees.js) draw an urn / spinner / special die in `body` (`<svg data-chance>`, read back by `scripts/lib/hasard.js`): `hasardPossible` (impossible / possible / certain, `levels` 4–5 add peu / très probable and « une chance sur deux »), `hasardComparer` (A / B / autant, `sameTotal`, `trap`: the likelier one has fewer of the colour), `hasardChances` (« a chances sur b », no two choices equal in value). |
| `ruler` | `types/ruler.njk` | Graduated ruler with markers — read a value. SVG via `rulerSvg` getter. `divisions` / `subdivisions` per unit (10 × 10: hundredths), `labelDivisions` writes each division under its tick; 100 ticks a unit or more: the ruler keeps 640 px and scrolls sideways on a phone, opened on the marker. |
| `sort` | `types/sort.njk` | Order items by clicking them in sequence. Items listed in correct order in YAML, shuffled at runtime. By default the check re-sorts items as numbers; with `sortKeepOrder: true` items are labels (names) and the YAML order is the answer — put the data in a Markdown table in the body. `sortLabels: [from, to]` replaces "plus grand / plus petit". Generator `classerTableau` (params: `theme` prix/distances/durees, `count`, `direction` asc/desc/mixed, `min`/`max` in cents/metres/minutes, `mixedUnits`). |
| `drag-sort` | `types/drag-sort.njk` | Sort tiles by clicking pairs to swap them. Direction indicator. Tiles support HTML via `x-html`. Fields: `tiles[]` (strings), `direction` (`asc`/`desc`). Picture tiles (no number to read) keep their listed order as the answer. Generator `rangerAngles` (geometrie.js): 3–4 drawn angles, `gap` degrees apart, longer arms on the smaller angles (`trap`). Angle drawings are polylines end–vertex–end that `scripts/lib/shapes.js` `readAngle` measures again (oracle + LLM prompt). Generator `hasardRanger` (donnees.js): order the colours of a drawn urn / spinner by likelihood; colour tiles keep their listed order. |
| `fill-table` | `types/fill-table.njk` | Table with blank cells — student fills each digit/value. Supports `cur.svg` above the table. Uses `blankCount`, `headers`, `rows` (cells: `{blank, idx, answer}`). |
| `checkbox` | `types/checkbox.njk` | Tick all valid statements — multi-select with a verify button. Fields: `statements[]` (HTML strings), `checkedAnswers[]` (integer indices). Supports `cur.svg`. |
| `select` | `types/select.njk` | Complete sentences by choosing a word from a dropdown. Fields: `statements[]` (each with `template` using `___` placeholder, `answer`, and optional per-statement `choices[]`), global `choices[]` (optional fallback). Dropdowns start empty. |
| `svg-tiles` | `types/svg-tiles.njk` | Display grids of SVGs. User clicks on correct ones. Fields: `tiles[]` (Array of objects with `gen` and `par`), `answers[]` (integer indices). |
| `tile-select` | `types/tile-select.njk` | Click to select all correct tiles (multi-select). Fields: `tiles[]` (HTML strings), `tileAnswers[]` (0-indexed correct indices). Supports `svg:` field for SVG rendering. Generator `trouverFormes` (geometrie.js) draws plane shapes as inline SVG tiles in any orientation (`target` carre / rectangle / losange / triangle / triangleRectangle / disque / trapeze / trapezeRectangle / parallelogramme / quadrilatere / pentagone / hexagone / triangleIsocele / triangleEquilateral, `turn` all / some / none, `near` distractors, `inclusive` squares or equilateral triangles, `kid`; no parallelogram among trapèzes and no rectangle or rhombus among parallelograms, so either definition gives the same answer); `scripts/lib/shapes.js` reads the polygons back and names them from sides and angles (oracle + LLM prompt). Tiles keep their order; `positional: true` allows identical tiles when the answer is a place in the row (odd one out in a pattern). Generator `trouverAngles` (geometrie.js): tap the acute / right / obtuse angles (`target`, `near`), drawn turned with arms of random lengths. GS generators: `balanceGS` (mesures.js: balance in `body`, tap the heavier / lighter object, `ask`, `trap`: the lighter one drawn bigger; objects from weight tiers that match real life) and `jeuOie` (nombres.js: die in `body`, tap the cell where the frog lands; square SVG cells, `positional`). `scripts/lib/manipulations.js` reads balance, die and box of 10 back (oracle + LLM prompt). In GS pages it checks itself once as many tiles as answers are picked. Cubes (geometrie.js, checked by scripts/lib/cubes.js from the markup): `vueCubes` (pick the vue de face / de dessus / de droite of a stack drawn in perspective cavalière; distractors: the other views, mirror images, one square more or less) and `patronsCube` (tap the nets that fold into a cube among near misses; the checker folds each drawing by rolling a die over it). |
| `fraction` | `types/fraction.njk` | Visual fraction representation — shade a shape. Fields: `shape` (`circle`/`square` — anything else draws nothing; `square` takes optional `rows`/`cols`), `numerator`, `denominator`, `answer`. |
| `fraction-paint` | `types/fraction-paint.njk` | Colour a strip cut in `denominator` equal parts (tap or drag); any `numerator` parts coloured is right. Fields: `numerator`, `denominator`, `direction` (`cols` / `rows`). The body says what to colour (« Colorie **3/8** de la bande. »). |
| `fraction-check` | `types/fraction-check.njk` | Stacked fraction input (numerator/denominator boxes). Fields: `answers[]` (two strings: numerator, denominator), `equivalent` (any equal fraction accepted: 2/4 = 1/2 — required on calculation results, the validator refuses « a/b + c/d » without it; leave it off when the form is the question: « fraction décimale », « en quarts », the fraction you see). `given` (one box already written and locked: `[null, "4"]` for « 1/2 = ?/4 »). Supports `cur.operation` and `cur.svg`. Generator `fractionsEquivalentes` (fractions-decimaux.js: « 1/2 = ?/4 », `ask` agrandir / simplifier / denominateur / mixte, `visual` compte (both drawings shaded) / coupe (the second only cut) / aucun, `model` disque / bande / mixte, `maxDen`; drawing `fractionEquivSvg`). |
| `base-10` | `types/base-10.njk` | Base-10 blocks visual — decompose a number into hundreds/tens/ones. Fields: `answer`, plus either `number` or `hundreds`+`tens`+`ones`. |
| `error-analysis` | `types/error-analysis.njk` | Find the mistake — click the wrong step in a worked calculation, then type the correction. Fields: `steps[]` (strings), `wrongStep` (0-indexed), `correction` (correct value as string). |
| `clock` | `types/clock.njk` | Analog clock — read the time (type it), or `mode: set`: the pupil places the hands (a tap on the face points the chosen hand, − / + turn it; `step`: minutes per turn, default 5, the hour follows the minutes). Checked on the 12-hour face: `hour: 15` = 3 h. Fields: `hour`, `minute`, `answer`. |
| `click-blocks` | `types/click-blocks.njk` | Click cells to fill columns from the bottom up (place-value blocks). Fields: `columns[]` (each with `label`, `value`, `color`, `answer`, `max`). Supports generators. |
| `number-line` | `types/number-line.njk` | Number line — read a labeled point or click to place one. SVG via `nlSvg` getter. Supports generators. Place mode takes a fraction answer (`"7/4"`, shown stacked; `subdivisions` per unit, which may differ from the denominator: 2/3 on a line in sixths). `mode: estimate`: only the ends are labelled (`step` defaults to the whole range; a smaller step adds unlabelled landmarks), click accepted within `tolerance` (default 5 % of the range), wrong click says « plus à droite / à gauche », solved shows the exact spot in green. |
| `coordinate-grid` | `types/coordinate-grid.njk` | Coordinate grid — read (x ; y) for a labeled point, or click to place one. SVG via `coordinateGridSvg` getter. Supports generators. Place mode: `placeLabel`; `hideTarget: true` keeps the coordinates out of the prompt (the point follows from a figure: 4th vertex, midpoint, a move from a shown point). |
| `bar-chart` | `types/bar-chart.njk` | Bar chart — build mode (click cells to set bar heights) or read mode (static bars + answer inputs). Fields: `bc` object with chart config. Supports generators. |
| `calc-chain` | `types/calc-chain.njk` | Calculation chain — series of linked operations, fill in the blanks. Supports `cur.svg` and generators. `chain.start` must be a number: a decimal string (« 2,5 ») renders an empty start box. |
| `column-op` | `types/column-op.njk` | Column operation (+, −, ×, ÷). Multi-digit numbers aligned by place value (commas lined up for + and −; × is right-aligned, comma only in the product); student fills in result digits. × by 2+ digits (whole numbers, no 0 in the multiplier) adds one partial-product row per digit, shifted 0s written in (`partials: false` → result only). `operation: "÷"` (whole `top` ≥ `bottom`, no `result`): French potence, fields for every quotient digit, product and remainder with the lowered digit, in algorithm order; `products: false` → remainders only, `steps: false` → quotient + « reste » only. |
| `inverse-problem` | `types/inverse-problem.njk` | Inverse problems (Russie method) — base problem + derived variations. Fields: base operation + inverse operations array. |
| `number-hunt` | `types/number-hunt.njk` | Click numbers 1..N in order; emoji sits in center cell. Fields: `grid[]`, `cols`, `count`, `emoji`. Supports generators. |
| `count-objects` | `types/count-objects.njk` | Scattered emoji SVG — type the total count. Fields: `count`, `emoji`. Supports generators. Generator `sousLaTache` (nombres.js, Splat!: a card gives the total, a paint splat hides some — how many under it? `total`, `hidden`, `peek` ms: the whole set shows first, 👀 shows it again; GS `title` / `say` passed in params; checked by `splat` in `scripts/lib/visual-checks.js`). Generator `boiteDix` (nombres.js, GS): a box of 10 with tokens, `ask` combien / manque (« combien pour remplir ? »), `scatter`; `scripts/lib/manipulations.js` recounts cells and tokens. |
| `emoji-equations` | `types/emoji-equations.njk` | Emoji equation system — deduce each emoji's value line by line, answer the last line (e.g. 🍎+🍎+🍎=12, 🍎+🍌=5, 🍌=?). Fields: `eqLines[]` (strings `"🍎 + 🍌 = 5"`, split on the last `=`), `eqQuestion` (left side of the question line), `answer`. Generator `equationsEmojis` (params: `unknowns` 2|3, `min`, `max`, `mult`, `ask` value/sum/priority). |
| `number-forms` | `types/number-forms.njk` | Several writings of one number — target on the left, arrow fan, one row per writing with a blank anywhere (`40 = ? × 5 / 9 + ? / 100 − ? / ? : 2`). Fields: `target`, `forms[]` (strings with one `?`), `answers[]` optional (auto-solved at build time by bisection). Reuses `seqInputs`/`seqErrors`. Generator `ecrituresNombre` (params: `level` cm1/cm2, `targets`). |
| `op-triangle` | `types/op-triangle.njk` | Operator diagram — A →(op a)→ B →(op b)→ C plus the shortcut A →(op a·b)→ C (7 ×10→ 70 ×10→ 700, 7 ×100→ 700). Blanks on nodes and/or operator numbers; reuses `seqInputs`/`seqErrors`. Generator-only: `triangleOperateurs` (params: `op` mult/div/mixed, `pairs` [[a, b]…], `startMin`, `startMax`, `decimals`, `blanks` nodes/op/reverse/mixed). |
| `compare-groups` | `types/compare-groups.njk` | Two scattered emoji groups — click Autant / Plus / Moins. Fields: `groupA`, `groupB`, `answer`. Supports generators. |
| `magic-color` | `types/magic-color.njk` | Pixel-art coloriage magique — paint cells matching a rule (e.g. multiples). Fields: `grid`, `palette`. Supports generators. |
| `tri-arith` | `types/tri-arith.njk` | Arithmetic triangle — vertices and edges are linked by addition; fill in the missing values. Fields: `givenV[]`, `givenE[]`, `answers[]`. Supports generators. |
| `classify` | `types/classify.njk` | Click an item, then click its box. Fields: `categories[]` (`{id, label}`), `items[]` (`{html, cat}`, shuffled at build time; `cat` must be a category id). Supports generators. In GS pages it checks itself once every item is placed (no « Vérifier »). The body shows under the title. « Toujours, parfois, jamais vrai ? » series use three categories `toujours` / `parfois` / `jamais`. |
| `decimal-triple` | `types/decimal-triple.njk` | Three-way decimal representation — fraction décimale, tableau de chiffres (place values), nombre décimal. One representation is shown as given; student fills in the other two. Fields: `dtGiven` (`fraction`/`decimal`/`places`), `dtFrac` (`{num, den}`), `dtDecimal` (string, comma notation), `dtPlaces` (5-element array `[dizaines, unites, dixiemes, centiemes, milliemes]`, null = column hidden). Supports generators. |
| `decomp` | `types/decomp.njk` | Additive place-value decomposition: `346 = [3] centaines + [4] dizaines + [6] unités`. Generator-only: `decompoAdditif`, `decompoAdditifDecimal` (`minInt`, `maxInt`). |
| `fact-family` | `types/fact-family.njk` | The 4 related equations of a number triple. Fields: `numbers[]` (`[a, b, a∘b]`), `operation` (`add` / `mul`). |
| `think-board` | `types/think-board.njk` | One fact in 4 quadrants: story, drawing, dot array, symbol. Fields: `expression`, `answer` (or `answers[]`), optional `manipLabel`, `storyHint`. |
| `bar-model` | `types/bar-model.njk` | Word problem with a bar diagram (Singapore). Fields: `answer`, `unit`, `bm` — `mode: part-whole` (`whole`, `parts[]`, `wholeLabel`, `partLabels[]`; equal parts `["?", "?", …]` for sharing) or `mode: comparison` (`ref`, `compared`, `diff`, `refLabel`, `compLabel`, `diffLabel`; the unknown is `"?"`). The story goes in the body. `build: true`: the pupil builds the diagram first — boxes drawn to scale, empty; tap a chip (the numbers of the statement, the « ? », decoys in `extra`), then its box; « Vérifier le schéma » gives a hint (whole / parts / longer bar / dashed gap / unused number), then the answer input appears. Built by `barModelBuild()` (.eleventy.js); the validator wants one « ? », every chip in the statement, decoys that fit no box, no digit in the labels. |
| `guided-problem` | `types/guided-problem.njk` | Story stays visible; steps unlock one by one. Fields: `story`, `steps[]` with `kind` `keywords` (`tokens[]`, `hint`) / `numbers` (`tokens[]`) / `operation` (`answers[]`, `choices[]`) / `calculate` (`answer`, `unit`). |
| `compare-solutions` | `types/compare-solutions.njk` | Two worked solutions side by side — click the right one. Fields: `solutions[]` (`{name, steps[]}`), `correctSolution` (index). The body (a word problem) shows above the solutions. |
| `function-machine` | `types/function-machine.njk` | Input → rule → output: compute the output or discover the rule. Generators `functionMachineCompute`, `functionMachineDiscover` (`min`, `max`). |
| `venn` | `types/venn.njk` | Classify items into two overlapping circles. Generators `vennNombres` (`level`), `vennEmojis`, `vennFormes`. |
| `maze` | `types/maze.njk` | Path through a number grid following a rule (only even numbers, multiples of 3…). Generator `labyrinthe` (`rule` even / odd / mult3 … mult9, `size`). |
| `futoshiki` | `types/futoshiki.njk` | N×N latin square with inequality signs. Field `futoshiki` or generator `futoshikiPuzzle` (`size`). |
| `kenken` | `types/kenken.njk` | N×N arithmetic cage puzzle. Field `kenken` or generator `kenkenPuzzle` (`size`, `ops`: cage operations allowed, default `['+', '-', '×', '÷']` — `['+', '-']` for CE1). |
| `numberlink` | `types/numberlink.njk` | Join matching number pairs with paths that never cross. Field `numberlink` or generator `numberlinkPuzzle` (`size`). |
| `jump-line` | `types/jump-line.njk` | « Pour aller à » (counting up) on an open line (not to scale): durations, change or complements. Fields: `kind` (`temps` / `monnaie` / `nombre`), `points[]` (`"8:45"` / `"6,40"` / `"57"`, increasing, round landmarks in between), `hide[]` (indices of points the pupil writes). Fields to fill: each jump (min / €), each hidden point, the total (h + min / € / number) — all computed by `jumpLine()` in `player.js`. Generator `compterEnAvancant` (mesures.js: `kind`, `hide`, `step`, `notes`, `bonds` — extra 5/10/20 € stops, off by default: the teacher's method is two hops, price → next euro → note; `target` 100 / 1000 and `tens` for `nombre`). |
| `fraction-op` | `types/fraction-op.njk` | Add / subtract two fractions with a drawing (`fractionOpSvg`, svg.js): first fraction blue, second amber; the result drawing stays empty until solved (subtraction then crosses out the parts taken away). Fields: `a`, `b` (`"1/2"`), `op` (`"+"` / `"−"`), `model` (`bande` / `disque` / `droite`), `cut` (false: no dashed re-cut lines), `askDen` (step 1 also asks the common denominator; use bande / disque — a number line is graduated in 1/D and shows it). Different denominators: step 1 writes each fraction over the lcm (« Coupe les demis en quarts »), step 2 the result, in any equivalent form (1/4 + 1/4 = 1/2); with `askDen` any common denominator is accepted — fields by `fractionOp()`, judged by `fractionOpCheck()` in `player.js`. Generator `fractionDessin` (fractions-decimaux.js: `mode` same / multiple / coprime, `op` add / sub / mixed, `model` + `mixte`, `maxDen`, `overOne`, `askDen`, `cut`). |
| `money-pay` | `types/money-pay.njk` | Pay an amount by tapping coins and notes (drawn by `moneySvg`); tap a piece put down to take it back. Fields: `amount` (cents), `coins[]` (offered, cents; default all from 50 € to 1 c), `fewest` (also the fewest pieces), `showTotal` (running total shown). Generator `payerSomme` (mesures.js: `min`, `max`, `step`, `coins`, `fewest`, `showTotal`). |
| `broken-calc` | `types/broken-calc.njk` | Calculatrice cassée: a pocket calculator (left to right, like a real one: each operation applies to the result so far; C clears) with broken keys crossed out and disabled; keys missing from `ops` are left blank. « Fais afficher N »: solved when « = » shows the target; another result says « Tu obtiens …, pas … ». Fields (payload `calc`, not `bc`: bar-chart): `target`, `broken[]` (digits as strings and / or operation keys), `ops` (keys on the calculator, default `+ − × ÷`), `max` (biggest number typed by the example solution, 999). `bcSolve` / `bcProblem` (scripts/lib/broken-calc.js): the target holds a broken digit (else it can be typed), one operation between typable numbers reaches it, the shipped `solution` works (build, validator, oracle). Generator `calculatriceCassee` (calcul.js: `target` [min, max], `digits` (broken digits of the target), `brokenOps`, `ops`, `max`). |
| `picross` | `types/picross.njk` | Picross (nonogram): the numbers beside a row / above a column are the runs of coloured cells in it, in order. Press a cell to colour it (✕ mode: cross it out), slide to paint along the row or column the stroke starts on; a press on a cell already holding that empties it. A line whose runs match is greyed; solved as soon as every line matches (the cells take the picture's `color`, « C'est un chat ! 🐱 »). Fields (payload `px`): `rows[][]`, `cols[][]` (runs, `[0]` for an empty line), `picture[]` (`#` / `.` rows — the build derives the clues from it), `name`, `emoji`, `color`; `rowLabels` / `colLabels` (same shape, clues written as calculations: « 2+3 », « 12÷4 », « ¾ de 8 », « 2,5+1,5 »). `pxProblem` (scripts/lib/picross.js): clues match the picture, one solution only (line solving + backtracking), every label worth its number (build, validator, oracle). Generator `picrossImage` (logique.js: `size` 5 / 8 / 10, `pictures` (names), `labels` (`+`, `−`, `×`, `÷`, `frac`, `dec`)). |
| `tangram` | `types/tangram.njk` | Tangram: slide the pieces from the tray onto the grey silhouette; they land on whole points of a lattice whose unit squares are cut by their diagonals into 4 quarter-triangles (pieces cover whole quarters, so tangram pieces only turn by quarter turns). A tap turns a piece clockwise, ↔ flips the piece picked last; keyboard: arrows move, Enter turns, F flips. Solved as soon as the quarters covered are exactly the silhouette's, whichever pieces go where (« Deux pièces se chevauchent », « Une pièce dépasse », « Il reste des trous »). Generator only: payload `tg` = `w`, `h`, `boardH` (board above, tray below), `pieces[]` (`shape` gt / mt / pt / ca / pa, GS cq / re; `pts`, `sol` and `start` [x, y, quarter turns, flipped], `color`), `turn`, `outlines`, `name`, `emoji`. `tgProblem` (scripts/lib/tangram.js): known shapes, solution on the board without overlap, pieces start in the tray, the right way round when `turn: false` (validator, oracle). Generator `tangramFigure` (geometrie.js: `figures` from `TANGRAM_FIGURES` — 7 pieces carre, triangle, bateau, parallelogramme, bonhomme; fewer maison, poisson, fleche, maisonnette, bougie, oiseau; GS gs_maison, gs_maison3, gs_bateau, gs_sapin, gs_poisson, gs_fusee — `outlines`, `turn`). |
| `strategy-game` | `types/strategy-game.njk` | Jeu de stratégie contre l'ordinateur, turn by turn. `course`: say the next number by adding one of `moves` to the other player's (track of the numbers said, blue / orange; the buttons are the numbers the pupil can say); who says `total` wins. `allumettes`: take one of `moves` sticks; who takes the last one wins (loses when `misere`, Fort Boyard). The pupil gets the seat that can always win (`first`: the computer starts from a losing position); the computer plays its best move with probability `smart` (0 random, 1 perfect). A lost game is played again with a hint that grows: a question, a key number, then every winning number / stick count. Solved on a win. Fields (payload `sg`): `kind`, `total`, `moves[]`, `misere`, `smart`, `first`. `sgProblem` (scripts/lib/strategy-game.js): the pupil's seat can force a win (build, validator, oracle). Generator `jeuStrategie` (logique.js: `kind`, `total` (or [min, max]), `moves` (or a list of sets), `misere`, `smart`). |
| `target-blocks` | `types/target-blocks.njk` | Blocs cibles: number tiles dragged from the tray onto overlapping dashed blocks (or tap a tile, then the spot; keyboard: arrows move, Escape back to the tray). A tile in an overlap counts for every block around it. Each block combines its tiles with its operation (`+` or `×`, any number of tiles; no `−` / `÷`: their order cannot be shown on the board, dropped 2026-11-11) to reach its target; the legend shows each target and, when `live`, what the tiles make (✓ when right). Solved as soon as every block makes its target and every tile is in a block (unless decoys: `useAll: false`). Generator only: payload `tb` = `w`, `h` (board units), `blocks[]` (`x`, `y`, `s`, `target`, `color`, `op`), `tiles[]`, `solution[]` (a point per tile, null for a decoy), `op`, `useAll`, `live`. `tbProblem` (scripts/lib/target-blocks.js): blocks on the board, the solution works (validator, oracle). Generator `blocsCibles` (calcul.js: `layout` un / deux / chaine / trio, `op` or `ops`, `values`, `perRegion`, `minTiles`, `maxTarget`, `decoys`, `live`). |
| `hundred-board` | `types/hundred-board.njk` | Tableau des nombres: rows of ten from `start` (1 → 1…100, 0 → 0…99, 301 → 301…400), drawn as a CSS grid (no SVG). `mode`: `find` (tap the mystery number, then Vérifier: `clues[]` `{k, v, text}` — unites / dizaines / centaines / entre / pair / impair / somme / apres / avant / dessous / dessus / plus / moins, pointing to one number only — or `from` + `path` of arrows `d u r l` = ↓ +10, ↑ −10, → +1, ← −1, never across the edge; `hide`: only `shown` numbers written), `fill` (type `blanks[]`; `cells[]`: only a piece of the board is drawn, « morceau du tableau »; Enter moves field to field), `color` (tap the numbers of `rule` `{k: unites / dizaines / pas, v / from, step, to}`, `answer[]` exact). The hint names the clue the tapped number fails, the extra / missing cells. Generator only: payload `hb`. `hbProblem` (scripts/lib/hundred-board.js) rebuilds every text, answer and path from the structured data (validator, oracle). Generator `tableauNombres` (numeration.js: `mode`, `kind` mystere / deplacements / trous / morceau, `start` (or a list), `clues` (sets to pick from), `moves`, `steps`, `hide`, `landmarks`, `blanks`, `shapes`, `given`, `rules`, `maxCount`). |
| `dice-game` | `types/dice-game.njk` | Ferme la boîte (shut the box): tiles 1…`tiles`, « Lance les dés », then tap open tiles adding up to the dice — they close as soon as they make it, going over is refused (hint `3 + 6 = 9 : c’est plus que 8`). « Je ne peux plus jouer » ends the round, refused while a move exists (hint: then « Essaie 5 + 3 »). `oneDie`: one die once the open tiles make 6 or less. Solved when a round ends; score = the tiles left open. Generator only: payload `dg` = `kind: boite`, `tiles`, `dice`, `oneDie`. `dgProblem` (scripts/lib/dice-game.js): every first roll can be played (validator, oracle). Generator `fermeLaBoite` (logique.js). |
| `compte-est-bon` | `types/compte-est-bon.njk` | Le compte est bon: a target 🎯 and number tiles; tap a number, an operation, another number — the two tiles become their result (subtraction positive, division exact, else a hint); ↶ Annuler / 🔄 Recommencer; solved as soon as a tile is the target. Fields: `numbers[]`, `target`, `ops` (default `+ − × ÷`), `useAll` (Mathador: every number used, the last tile left is the target). The build finds a solution (`cebSolve`, scripts/lib/compte-est-bon.js, breadth first: the fewest steps) and fails if the target cannot be reached; `cebProblem` re-solves every deck and replays the shipped `solution` (validator + oracle). Generator `compteEstBon` (calcul.js, its own breadth-first search: `count` (4–5) numbers in `pool`, `big` (one of 25 / 50 / 75 / 100), `ops`, `target` [min, max], `minSteps` (2: not reachable in fewer operations), `useAll`). |
| `ten-frame` | `types/ten-frame.njk` | Box of 10 (2 × 5 cells; `frames: 2` = two boxes, up to 20): tap an empty cell to put a token in, a token to take it out; « Vérifier » (✅ in GS) checks the count. Fields: `target` (tokens wanted), `given` (red tokens at the start, first cells), `ask` montre (`show`: a number shown big, or `{dots: n}` a die) / plus / moins (`by`, default 1), `tenFirst` (no token in the second box while the first has a hole: « Remplis d’abord la première boîte. »). `tenFrameProblem()` (scripts/lib/manipulations.js) recomputes the target from `show` / `given ± by` (validator + oracle). Generator `boiteDixRemplir` (nombres.js: `ask`, `show` digit / des, `by`, `min`, `max`, `frames`, `tenFirst`; returns the GS `say` per ask — front-matter `say` must be the same). Reading a box (« combien ? ») is `boiteDix` (count-objects). |
| `memory` | `types/memory.njk` | Memory card game: cards face down, turn two; a pair stays up (green), two that do not go together turn back (at once when a third card is tapped); solved when every pair is found (no « Vérifier »). Fields: `pairs[]` of two cards — a string (text, Markdown inline) or one drawing: `{dots: 5}` (die pips, 7–10 on two dice 5 + rest), `{fingers: 7}`, `{emoji: 🍎, n: 3}`, `{pie: "3/4"}` (shaded disc), `{frac: "3/4"}` (stacked), `{clock: "3:15"}`, `{blocks: 34}` (tens rods + units); `sum` (two cards go together when their values add up to it: complements); `faceUp` (every card shown, tap two that go together). Faces drawn by `memoryCardHtml()` (svg.js). `scripts/lib/memory.js` reads every card's value (numbers, « 3 × 4 », « moitié de 14 », words « soixante et onze », times « 3 h 15 » / « 3 h moins le quart » on the 12-hour face): each pair must go together and **no card of one pair may go with a card of another** (two « 12 » pairs: a right pair would be turned back) — validator + oracle. Generator `memoryPaires` (nombres.js): `kind` quantites (`left` / `right` chiffre / des / doigts / objets / mixte, `min`, `max`) / complements (`sum`, `step`) / calculs (`op` add / sub / mul / double / moitie / mixte, `min`, `max`, `tables`) / blocs / fractions (disc ↔ fraction; `right: decimal` fraction ↔ decimal, `dens`) / heures (`step`, `text` chiffres / mots / soir); `pairs` (6), `faceUp`. |
| `thermometer` | `types/thermometer.njk` | Vertical thermometer — read the temperature. Fields: `min`, `max`, `markers[]` (`{value}`), `answer`, `step` (tick spacing, default 0.5 °C; `1` for whole degrees before decimals). `kind: jug` (measuring jug, the liquid level) or `kind: dial` (scale dial over 300°, a needle) with `label` (a number every…) and `unit` (drawn, and shown by the input). Generator `lireMesure` (mesures.js: `kind`, `scales[]`, `between`, `body`). `gauge` in `scripts/lib/visual-checks.js` reads every kind back from the drawing (the level / needle must sit on a graduation). |

Shared verify button for sequence/bounding/convert: `types/seq-verify.njk`.

## Maternelle (GS)

Series under `src/fr/exercices/gs/` (level code `0` in the CSV) switch the player to « kid » mode (`level === 'GS'` in `series-player.njk` → `.kid` class + `data-kid="1"`): pupils are 5 and can't read.

- **Read aloud** — see « Voice » below. A 🔊 start screen covers the first exercise (its tap unlocks speech); then each exercise is read automatically, and the 🔊 next to the title reads it again. GS cards in the list show a 🔊 badge (« monte le son »). Spoken feedback on right/wrong answers.
- **Minimal text** — title = an emoji or two words (« Combien ? », « 🎨 »); the instruction goes in `say:`. Buttons, feedback (🎉 / 🤔) and the end screen (🏆 🔁 🏠) are emoji-only.
- **Click only** — no text input: use `mcq` (`compact: true` for numbers/emoji choices), `classify`, `compare-groups`, `tile-select`, `sort`, `memory` (3–4 pairs, pictures: dice, fingers, objects), `ten-frame`. Quantities ≤ 10, no + − < > signs.
- **One picture = one scene** — never draw « before » and « after » as two rows of the same objects: pupils count them all together. Give a total as a digit (« 5 🐰 ») and draw only the current scene.
- **Sizes** — `.kid` rules at the end of `src/css/input.css` enlarge emojis and click targets.
- **Difficulty** — GS is the lowest level (no screens before 5, never PS/MS). The programme's age columns: « avant 4 ans » and « 4 ans » → `facile`, « 5 ans » → `moyen`, « voire au-delà » → `difficile`.
- **Programme** — what to build next and the cycle 1 rules (no zero, shapes in every orientation, no solids in perspective…): [docs/maths_gs.md](../docs/maths_gs.md).

## Voice

Speech is prerecorded; do not use browser `speechSynthesis` or online voice APIs. Generation and playback details: [agents/voice.md](voice.md).

- GS instructions use front-matter `say:` or the exercise title when `say:` is absent. Every spoken phrase must map to a generated clip.
- Voice exercises set `voice: true` and provide `say` + `voiceAudio`; player reads clips on navigation and offers a 🔊 replay button.
- `dicteeNombre` supports integers to 999,999,999 and decimals by composing clips for number groups, scale words and decimal digits. `ecouteNombre` uses prerecorded clips for the bounded target numbers.
- `compterObjets` keeps its 16 object types; every generated prompt has a matching `objets/*.ogg` clip.
- Missing clip: show an audio error link; never fall back to browser speech.
- General title/statement read-aloud is intentionally unavailable.

## Timed Challenges (Défis)

Timed challenges live under `src/fr/defis/` (same nested structure as `exercices/`). They use a separate layout and Alpine component designed for fluency practice.

### Structure

Each défi series has the same `index.yaml` as a regular series **plus** a required `duration` field (seconds):

```yaml
id: a2b3c4d5
title: "Tables de multiplication"
difficulty: moyen
duration: 90
```

The exercise `.md` files are identical to exercises — most defis use `generator:` with `repeat:` for fresh numbers each session.

### Layout & Component

- Layout: `src/_layouts/timed-player.njk` — 3-phase UI: ready → playing → done
- Component: `src/assets/js/timed-player.js` — `timedPlayer(exercises, seriesId, opts)`
  - Expands `_gen` placeholders at runtime via `window.AppGenerators`
  - Shuffles the pool, advances instantly on correct answer (120ms flash) or after brief err flash (380ms)
  - Countdown timer bar (green → amber → red); score report with rate/min stat

### Collections & CSV

- `collections.defis` — Eleventy collection of all `*.md` under `src/fr/defis/`
- `collections.defisMeta` — structured metadata like `seriesMeta` but adds `duration`; folder code `'d'`
- `src/_pages/defi-pages.njk` — pagination template generating pages at `/fr/defis/{id}/`
- Defis are included in `data.csv` with folder code `d`; `FOLDERS` map in `app.js` resolves `d` → `defis`
- Cards in the exercise listing show a ⏱ badge when `s.isDefi === true`

### Validation

`scripts/validate-exercises.js` validates defis like exercises and additionally checks that `duration` is present in each `index.yaml`.

## SVG Snippets

SVG files in `src/_includes/svg/` are embedded at build time using the `gen: file` pattern (see below). They use CSS custom properties with hardcoded fallbacks for standalone preview.

### Available SVG files

| Category | Files | Purpose |
|----------|-------|---------|
| **Perimeter (grid)** | `shape-on-grid-00.svg` through `shape-on-grid-03.svg` | Shapes on a grid for perimeter counting |
| **Perimeter (figures)** | `l-shape-perimeter.svg`, `t-shape-perimeter.svg`, `u-shape-perimeter.svg`, `staircase-perimeter.svg` | Composite figures with labeled dimensions |
| **Symmetry lines** | `symmetry-line-none-01.svg`, `symmetry-line-one-01.svg`, `symmetry-line-two-02.svg`, `symmetry-line-four-01.svg`, `symmetry-line-four-02.svg`, `symmetry-line-five-01.svg`, `symmetry-line-six-01.svg`, `symmetry-line-infinite-01.svg` | Figures for counting lines of symmetry |
| **Symmetry axes** | `sym-axis-easy-*.svg`, `sym-axis-med-*.svg`, `sym-axis-hard-*.svg` (5 each) | Figures for identifying the correct axis of symmetry |
| **Geometric shapes** | `grid.svg`, `isosceles-trapezoid.svg`, `kite.svg` | Standalone shape illustrations |

### CSS variable usage in SVGs

SVGs use CSS custom properties defined in `design-tokens.json`:
```xml
<rect fill="var(--green, #3a9a55)" stroke="var(--cs, #475569)" />
```
The first value is the CSS var (works when embedded in HTML); the fallback is for standalone SVG preview in editors.

## The `gen: file` / `embedSvg` Pattern

To embed a static SVG from `_includes/svg/` into an exercise:

### In front-matter (YAML):
```yaml
svg:
  gen: file
  par:
    name: "shape-on-grid-00.svg"
```

### What happens at build time:
`.eleventy.js` reads `src/_includes/svg/shape-on-grid-00.svg`, and transforms the payload to:
```json
{ "gen": "embedSvg", "par": { "svg": "<svg ...>...</svg>" } }
```

### At runtime:
`embedSvg()` in `svg.js` simply returns its argument (the SVG markup string). The template renders it via `window[cur.svg.gen](...Object.values(cur.svg.par))`.

### `tile-select` with `svg:` field

The `tile-select` type supports an `svg:` field on individual tiles, rendered the same way:
```yaml
tiles:
  - text: "Rectangle"
    svg:
      gen: file
      par:
        name: "shape-on-grid-01.svg"
```

## Adding a New Exercise Type

Complete checklist — every step is required:

### 1. Template partial
Create `src/_includes/types/your-type.njk`.
- Wrap everything in `<div x-show="cur.type === 'your-type'">`.
- Keep `:class` objects on a **single line** — multi-line blocks render verbatim whitespace into built HTML and inflate page size.
- Include a "Vérifier" button inside the partial (or reuse `seq-verify.njk` for sequence-style types). Every exercise with a text field shows one — `layout-health` fails otherwise.
- Enter, the same everywhere: one field → `check()`. Several fields → `@keydown.enter="enterField($el, key)"`: that field alone is checked (green / red flash, the focus stays on a wrong one), then the focus goes to the next empty field; once all are filled, Enter checks the whole exercise. `key` indexes the type's inputs array; add the type to `_fieldOk()` in `player.js` (and to `FIELDS` in `solve.spec.js`, which checks no right field is judged wrong). Independent questions (multi-question, bar-chart read) keep their own per-question check (`mqCheck(i, $el)`).

### 2. `series-player.njk` — two places
```njk
{# Conditional include (~line 57, with other type includes) #}
{% if 'your-type' in usedTypes %}{% include "types/your-type.njk" %}{% endif %}

{# Error feedback span (~line 130, inside the showError div) #}
{% if 'your-type' in usedTypes %}
<span x-show="cur.type === 'your-type'">Message d'erreur. Essaie encore !</span>
{% endif %}
```

### 3. `app.js` — four places
- **State variables** (top of `seriesPlayer` data object): add all input/error/display arrays.
- **`init()`**: initialize state for the first exercise (index 0).
- **`goTo(idx)`**: reset state when navigating to a new exercise.
- **`check()`**: add a type branch — `solvedFlags[currentIndex] = true` + auto-advance on success; `showError = true` + timeout reset on failure.
- **Methods** (before `goTo`): add any interaction handlers.

### 4. `.eleventy.js` — `seriesPayload` filter
If the type has custom YAML fields beyond `title/type/operation/body/answers`, add a block before `payload.push(item)`:
```js
if (ex.data.type === 'your-type' && ex.data.yourField) {
  item.yourField = ex.data.yourField;
}
```

### 5. `scripts/validate-exercises.js` — `TYPE_SCHEMAS`
Register the type so the validator accepts it:
```js
'your-type': { required: ['requiredField'], arrays: ['arrayField'] },
```

### 6. `scripts/generate-maths-ex.js` — two places
- **`TYPE_CHOICES`**: add `{ name: 'your-type — Description', value: 'your-type' }`.
- **`TEMPLATES`**: add the empty scaffold YAML string.

### 7. Sample content + IDs
Create at least one series under `src/fr/exercices/`, then run `npm run generate:ids`.

### 7b. Solver for the solvability test
Add an entry for the type in `S = { … }` in `tests/e2e/solve.spec.js`: write the correct answer into the player state (the fields the partial binds to) and call the validation the UI calls; with `w = true`, write a wrong answer instead. Then run `npm run check`. Types without a solver are listed as "not covered" at the end of the check.

### 8. Documentation
- Add a row to the **Exercise Types** table above.
- Add new YAML fields to the **Front-Matter Schema** section below.

### `operation` string conventions (`number-check` / generators)

The `operation` field is parsed into visual parts by the `trouParts` getter. Numbers and text alternate as separate flex items. To keep words and numbers together (no line-break between them), use `__` as a **non-breaking space glue**:

```javascript
// Bad: "6 dizaines et 5 unités = ?" — "6" wraps to its own line
operation: `6 dizaines et 5 unités = ?`

// Good: the whole phrase becomes one non-breaking flex item
operation: `6__dizaines__et__5__unités__=__?`
```

`__` is replaced with `&nbsp;` and the whole segment is kept atomic. Use it whenever a number appears mid-phrase (e.g. unit phrases, equality statements).

## Answer matching (`normalizeAnswer`, `modules/utils.js`)

Typed answers and expected answers both go through `normalizeAnswer`, so write the expected answer in its simplest form; these are accepted as equal:

| Rule | Examples treated as equal |
|------|---------------------------|
| Case, spaces (incl. no-break) | `Jeudi` = `jeudi`, `12 500` = `12500` |
| Decimal comma, trailing zeros | `4,50` = `4.5` = `4,5` |
| Leading zeros of whole numbers | `08` = `8` |
| Times | `16:30` = `16h30` = `16 h 30` = `16h30min`; `16h` = `16:00`; `09h05` = `9:05` |
| Operations (whole answer) | `soustraction` = `moins` = `-` = `−` · `multiplication` = `fois` = `x` = `*` = `×` · `division` = `:` = `/` = `÷` · `addition` = `plus` = `+` (« une … » / « la … » ignored) |

Not covered (keep answers away from it): multi-word phrases — one unambiguous word at most.

## Adding a New Generator

1. Add the generator to the topic module in `src/assets/js/generators/` that matches the content folder it serves (e.g. `operations.js` for written operations in `maths/calcul/`; module names predate the 2026-10 topic list). Shared helpers come from `_core.js` — add a helper there only if several modules need it, and list it in the module destructuring at the top. A new module must be added to `MODULES` in `generators/index.js` (load order).
2. Generators must return seriesPlayer-compatible items:
   ```javascript
   { type: 'number-check', operation: '5 + 3', answers: ['8'] }
   ```
3. Create an `.md` file in `src/fr/applications/{series}/` with:
   ```yaml
   type: number-check
   generator: "yourGenerator"
   repeat: 10
   params:
     min: 1
     max: 100
   ```
4. **The front-matter `type` must be the type the generator returns.** The page only includes the partials of front-matter types, so a mismatch renders a blank exercise. `npm run validate:exercises` runs every generator 20× with the file's `params` and fails on: unknown generator, exception, `NaN`/`undefined`/`Infinity` in the output, `svg.gen` helper missing from `svg.js`, or a type mismatch.

## Cubes and areas (geometrie.js, no new type)

Drawn by the generator, checked again from the markup by the oracle (`GEN_CHECKS`, via scripts/lib/cubes.js and scripts/lib/aires.js):

| Generator | Type | What |
|---|---|---|
| `compterCubes` | `number-check` | Count the cubes of a stack (height map `H[y][x]`, y = 0 the front row) in perspective cavalière: front faces true squares, depth up-right. Only stacks where every column shows its top (none behind a taller one), so hidden cubes are always under a visible one; `note` adds « Aucun cube ne flotte ». The `<svg>` carries `data-h`; the checker also counts 3 faces (2 polygons each) per cube. |
| `vueCubes` | `tile-select` | The vue de face / dessus / droite of a stack (see the tile-select row). |
| `patronsCube` | `tile-select` | The nets that fold into a cube (the 11 nets, turned / flipped, among 10 near misses). |
| `patronsPave` | `tile-select` | The nets of a pavé drawn as a block of unit cubes (lengths 1–3): rectangles on squared paper; near misses: one face of the wrong length, or a layout where two faces fold onto each other. The checker requires whole-edge contacts, rolls a box over the net and matches its lengths to the cubes. |
| `faceOpposee` | `mcq` | A lettered cube net: which face is opposite the one asked? |
| `aireQuadrillage` | `number-check` | Area in squares of a figure on squared paper: whole squares (`<rect>`) and half squares (`halves`, right triangles with a leg along the figure); the checker measures every polygon. Answers like « 7,5 ». |
| `comparerAires` | `mcq` | Which of two figures has the bigger area, or the same? `trap`: the bigger one is compact (shorter outline). |
| `colorierAire` | `grid-board` | `area` mode (see the grid-board row). |

## Solids, drawn geometry and plans (solides.js, espace.js, plans.js, no new type)

Three modules, loaded only by the pages that use them. Each drawing is read back from its markup by the oracle (`GEN_CHECKS` via scripts/lib/solides.js, scripts/lib/espace.js and scripts/lib/plans.js), never from the generator's own code.

| Generator | Type | What |
|---|---|---|
| `trouverSolides` | `tile-select` | Tap every cube / pavé / pyramide / prisme / cylindre / cône / boule (`target`, `among`, `count`, `answers`). Polyhedra in perspective cavalière (depth at 45°, half length; prisms at 25°), hidden edges always dashed. A cube never stands among pavés (it is one). Checker: vertices and edges from the `<line>`s, faces by Euler, cube vs pavé from edge lengths; curved solids from their outline. |
| `compterSolide` | `number-check` | Faces, sommets or arêtes of a cube, pavé, pyramide or prisme (`solids`, `ask`). |
| `nommerSolide` | `mcq` | `ask: 'nom'` name the drawn solid · `'faces'` which figures make its faces (« 1 carré et 4 triangles ») · `'objet'` which drawn solid looks like 🥫 / 🎲 / ⛺… (the choices are drawings). |
| `droitesPositions` | `tile-select` / `mcq` | Tap the pairs of `perpendiculaires` or `paralleles` lines, or (`ask: 'classer'`) say how one pair is. `near`: sécantes almost perpendicular or almost parallel; `outside`: share of pairs drawn as segments that stop before they cross. |
| `cercleVocabulaire` | `mcq` | Lettered circle with a radius, a diameter, a chord and a segment from the centre that stops short or goes past: which point is the centre, which segment is a rayon / diamètre / corde (`ask`). |
| `axeSymetrie` | `tile-select` | Figures on squared paper, each with a red dashed line: tap those where it is an axis of symmetry. Traps: line moved one square, line in another direction, one corner moved. `axes`: vertical, horizontal, diagonal, antidiagonal. |
| `positionsEspace` | `mcq` | Animals on 3 shelves: who is just right of / left of / above / below an animal, or between two (`ask`). |
| `planVille` (plans.js) | `mcq` / `number-check` | Town map in lettered squares (A–F × 1–6, `size` 5–6: wider does not fit a phone), north arrow, grey road rows / columns, named places drawn once (🏫 🏥 🏊…), houses and trees as filler. `ask`: `case` (which square is a place; traps: row and column swapped, neighbours), `contenu` (what is in B3), `direction` (nord / sud / est / ouest of another place, same row or column), `trajet` (two legs « 3 cases vers l’est, puis 2 vers le sud »; traps: a leg reversed, the first leg only), `chemin` (road squares crossed on the shortest way; `works`: a 🚧 square on it forces a detour; `scale`: metres per square, the answer in m). Checker scripts/lib/plans.js: squares from the rects, names from the labels, shortest way by BFS. |
| `planClasse` (plans.js) | `mcq` | Classroom from above: board at the top, door on one side, windows on the other, 3 rangs × 3 animals, each behind a table. `ask`: `qui` (« au 2e rang, côté fenêtre »), `ou` (where an animal sits), `devant` / `derriere` (same column, rang ∓ 1). The checker counts rangs from the board and columns from the door. |
| `proprietesFigure` (geometrie.js) | `number-check` / `mcq` | One figure from `trouverFormes`' kit, turned or not (`turned`, share): number of `cotes` / `sommets` / `anglesDroits`, pairs of parallel sides (`paralleles`), or which triangle it is (`triangle`; with `codes: true` equal sides carry ticks and right angles a square, and the checker reads the codes back too). `kinds` narrows the figures. |

## SVG Generation Helpers (svg.js)

Functions in `src/assets/js/svg.js` (loaded on series pages that need SVG):

| Function | Purpose |
|----------|---------|
| `embedSvg(svg)` | Identity function — returns its argument. Used for build-time embedded SVGs. |
| `mathGridSvg(cols, rows, filled, color)` | Rectangular grid with filled/empty cells. |
| `slicedPieSvg(n, k, size, color)` | Pie chart with `k` of `n` slices filled. Optimized: 2dp rounding, `<g>` wrapper for shared stroke. |
| `fractionStripsSvg(rows, whole)` | Fraction wall: strips of one length cut in equal parts, `rows` = `[den, shaded]` (or `den`), `whole` adds a « 1 » strip on top; parts read « 1/den » when wide enough. Use with `svg: {gen: fractionStripsSvg, par: {rows: [[3, 2], [6, 0]], whole: true}}` on compare / number-check / tile-select. |
| `percentGridSvg(filled)` | Hundred grid for percentages: 10 × 10 squares, `filled` coloured row by row, thick lines in four blocks of 25. Generator `pourcentages` (operations.js, mode `grille`). |
| `percentBarSvg(parts, shaded, total, ask)` | Percentage bar: the whole (100 % = `total`) cut in `parts`, `shaded` coloured; percents above, quantities below, « ? » above (`ask: 'percent'`) or below (`'value'`). Generator `pourcentages` (modes `de`, `etape`, `quel`, `probleme`; `percents`, `visual`, `round`, `maxTotal`). |
| `decoupeSvg(kind, pieces, total, piece, emoji)` | Cutting picture: `kind: 'coupe'` a bar cut in `pieces` by red cut lines, `'intervalles'` a path with `emoji` at both ends and between `pieces` gaps; `total` above, `piece` (« 40 cm » or « ? ») under the first piece. Generator `problemesDivision` (modes `coupe`, `intervalles`, `ranger`, `partage`; `visual`, `reste`, `ask`, `meters`, `decimal`). |
| `moneySvg(items)` | Euro notes (5–200 €) and coins (1 c–2 €), `items` in cents, any order: notes row(s) then coins, real colours and proportions, `aria-label` listing the content. Used by generator `porteMonnaie` (`multi-question`: euros, centimes, total; params `notes`, `euroCoins`, `cents` in cents, `minNotes`/`maxNotes`, `maxEuroCoins`, `minCents`/`maxCents`, `carryRate`) and `rendreMonnaie` (`number-check` `? € ? c`: « Léa a acheté … pour 8 € 20 c, elle paye avec un billet de 10 € » — names and items are fixed lists in the generator; params `notes`, `step`, `smallestNote`). Related, no SVG: `centimesEnEuros` (`number-check` `240 c = ? € ? c`; params `min`, `max`, `step`, `trickyRate` — share of « 305 c » / « 400 c » cases). |

Note: `.eleventy.js` has a build-time duplicate of `slicedPieSvg` for pre-rendering. Keep both in sync.

## Build-time vs Client-side SVG: Decision Criteria

Use **build-time SVG** (generated in `.eleventy.js`, embedded in the HTML payload) when:
- The SVG is **static** — it doesn't depend on runtime state or random generation.
- The SVG is **shared** across many exercises (e.g. a file from `_includes/svg/` via `gen: file`).
- The SVG is **small** (a few hundred bytes max per exercise).

Use **client-side SVG** (generated in `generators/*.js` or `svg.js`, called from Alpine templates) when:
- The SVG depends on **exercise-specific data** that varies per exercise (e.g. a number to decompose).
- The SVG is **parameterized** and the same function is called with different values across many exercises in a series.
- Generating it at build time would **bloat** the HTML payload (rule of thumb: if a single series page with ~10 exercises would exceed ~15–20 kB of SVG, move it to runtime).

**Anti-pattern to avoid**: pre-generating large parametric SVGs at build time and embedding them inline. This was the root cause of 90 kB+ HTML files for `base-10` exercises — each number produced a full SVG block, multiplied across every exercise in every series. The fix was a `base10Render()` function called client-side via Alpine `x-data`.

## Front-Matter Schema

### Static exercise (`.md` in a series folder)

```yaml
---
type: "number-check"      # Exercise type (see table above)
class: "S1.1.1"            # Skill code (see docs/classification.md)
# class: "A1.1"            # OR Vergnaud class (ONLY for 'problem' type)
title: "Calcule"           # Display title
answer: 42                 # Expected answer (number or string)
# Type-specific fields:
columns: ["A", "B"]        # logic-grid
rows: ["X", "Y"]           # logic-grid
solution: { A: "X" }       # logic-grid
statements:                # true-false
  - text: "Assertion"
    answer: true
comparisons:               # compare
  - left: 56673
    right: 89939
choices:                   # mcq (shuffled at build time)
  - "correct answer"
  - "wrong 1"
  - "wrong 2"
min: 0                     # ruler — range start (integer)
max: 10                    # ruler — range end (integer)
divisions: 10              # ruler — divisions per unit
subdivisions: 0            # ruler — optional subdivisions per division
markers:                   # ruler — labeled points on the ruler
  - label: "A"
    value: 2.7
context: "267 543 109"     # multi-question shared context
questions:                 # multi-question
  - text: "Sub-question?"
    answer: "answer"
items:                     # sort — listed in CORRECT order, shuffled at runtime
  - "3,07"
  - "3,7"
  - "30,7"
direction: asc             # sort / drag-sort — "asc" (petit → grand) or "desc"
sortKeepOrder: true        # sort — items are names in the correct order (not numbers)
sortLabels: ["le plus cher", "le moins cher"]  # sort — ends of the direction arrow
tiles:                     # drag-sort — HTML strings, listed in CORRECT order
  - "1/6"
  - "1/4"
  - "1/2"
statements:                # checkbox — list of HTML/text strings
  - "Affirmation 1"
  - "Affirmation 2"
  - "Affirmation 3"
checkedAnswers: [0, 2]     # checkbox — 0-indexed integers (NOT strings)
tiles:                     # svg-tiles — array of SVG generator objects
  - gen: "circleSvg"
    par:
      r: 40
  - gen: "squareSvg"
    par:
      size: 80
  - gen: "embed"
    par:
      svg: "<svg><circle r='10'/></svg>"
  - gen: "file"
    par:
      name: "my-icon.svg"  # Looks in src/_includes/svg/
answers: [1]               # svg-tiles — 0-indexed integers
tiles:                     # tile-select — HTML strings (can include markup/fractions)
  - "2/3"
  - "3/4"
tileAnswers: [0]           # tile-select — 0-indexed correct tiles
svg:                       # tile-select / fill-table / checkbox — optional SVG display
  gen: file
  par:
    name: "shape-on-grid-00.svg"
columns:                   # click-blocks — place-value columns
  - label: "100"
    value: 100
    color: "#dc2626"
    answer: 3              # expected number of filled cells (digit at that position)
    max: 9                 # max cells in column
  - label: "10"
    value: 10
    color: "#7c3aed"
    answer: 2
    max: 9
eqLines:                   # emoji-equations — "lhs = rhs" strings, solvable top to bottom
  - "🍎 + 🍎 + 🍎 = 12"
  - "🍎 + 🍌 = 5"
eqQuestion: "🍌"          # emoji-equations — left side of the question line (answer: 1)
board:                     # grid-board — robot on a grid; rows go down, [r, c] from the top left
  mode: write              # follow | write | debug
  rows: 5
  cols: 5
  start: [4, 0]
  dir: N                   # optional heading → instructions F / TL / TR instead of arrows
  blocks: [[2, 2], [1, 3, "🌳"]]  # optional obstacles (emoji optional, default 🪨)
  goal: [0, 4]             # write / debug: target (goalEmoji: optional, default ⭐)
  maxSteps: 8              # write: optional cap on instructions
  program: ["R2", "U"]     # follow / debug: U D L R (+count), F (+count), TL, TR
  bug: 1                   # debug: index of the wrong instruction (must be the only fixable one)
# board (mirror mode):      { mode: mirror, rows: 7, cols: 6, axis: v, at: 3, shape: [[0, 2], [1, 1], [1, 2]] }
#   axis v | h (at = grid line before that column / row) | d (r = c) | a (anti-diagonal); the pupil colours the image
target: 40                 # number-forms — the number on the left
forms: ["? × 5", "9 + ?", "100 − ?", "? : 2"]  # number-forms — one "?" each; answers auto-computed
answers:                   # fraction-check — [numerator, denominator] as strings
  - "3"
  - "4"
a: "1/2"                   # fraction-op — the two fractions, the operation, the drawing
b: "1/4"
op: "+"                    # "+" | "−" (quoted)
model: bande               # bande | disque | droite; cut: false hides the re-cut lines; askDen: true
pairs:                     # memory — two cards each: text, or {dots} {fingers} {emoji, n} {pie} {frac} {clock} {blocks}
  - ["3 × 4", "12"]
  - [{clock: "3:15"}, "3 h et quart"]
broken: ["7", "+"]         # broken-calc — with target: 47, ops: ["+", "−"] (keys on the calculator)
total: 20                  # strategy-game — with kind: course | allumettes, moves: [1, 2], misere, smart: 0–1
picture: [".#.#.", "#####"] # picross — rows of # (coloured) and .; with name: "un cœur", emoji, color
numbers: [3, 7, 8, 25]     # compte-est-bon — with target: 183, ops: ["+", "−", "×"], useAll: true
target: 5                  # ten-frame — tokens wanted; given: 4 (red at the start), ask: plus, by: 1,
                           #   show: 7 | {dots: 7} (montre), frames: 2, tenFirst: true
sum: 10                    # memory — optional: the two values add up to it (complements); faceUp: true
---

Markdown body shown as instructions.
```

### Generated exercise (application)

```yaml
---
type: number-check
title: "Addition simple"
generator: "additionSimple"
repeat: 10
params:
  minA: 10
  maxA: 99
---

Instructions shown above each exercise.
```

### Series metadata (`index.yaml`)

```yaml
id: "a1b2c3d4"            # Required — 8-char hex, generated by npm run generate:ids
title: "Additions simples"
class: "S1.1.1"            # Required — docs/classification.md (skills) or docs/maths_classification_vergnaud.md (problems)
difficulty: facile         # facile, moyen, difficile
# level, topic, subtopic are derived from directory path:
# src/fr/exercices/{level}/maths/{subtopic}/{leaf}/
```

## Example Series

### Perimeter on grid (`perimetre-quadrillage`)
Location: `src/fr/exercices/cm1/maths/mesures/perimetre-quadrillage/`
Uses `shape-on-grid-*.svg` files via `gen: file` pattern. Students count grid units around a shape.

### Perimeter of composite figures (`perimetre-figures`)
Location: `src/fr/exercices/cm1/maths/mesures/perimetre-figures/`
Uses `l-shape-perimeter.svg`, `t-shape-perimeter.svg`, etc. Students calculate perimeter from labeled dimensions.

### Axes of symmetry (`axes-symetrie-01`)
Location: `src/fr/exercices/cm1/maths/geometrie/axes-symetrie-01/`
Uses `symmetry-line-*.svg` files. Students count how many lines of symmetry a figure has.

### Symmetry axis identification (`symetrie-axe-01` through `symetrie-axe-03`)
Location: `src/fr/exercices/cm1/maths/geometrie/symetrie-axe-01/` (and 02, 03)
Uses `sym-axis-*.svg` files. Students identify which drawn line is the correct axis of symmetry.
