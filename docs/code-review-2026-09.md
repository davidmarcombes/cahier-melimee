# Code Review — September 2026

Technical assessment of the codebase after ~7 months (first commit 2026-02-16, 89 commits).
Companion to [js_roadmap.md](js_roadmap.md). Figures measured on 2026-09-25.

## Verdict

Healthy for its age: 425 unit tests, e2e tests covering every page, validation tooling, measured size budgets and thorough AI-oriented docs. The debt sits in three places:

1. **Adding an exercise type means editing about 10 files**, and two hand-maintained lists have already drifted apart (production bug).
2. **The safety net has holes:** CI is off, generated content is never validated, and one layout check can never fail.
3. **Three central files keep growing** with every new type.

None of this is urgent, but each new type makes items 1 and 3 worse.

## What works well

- **Performance discipline** — exercise pages are 13–15 KB against an 18 KB budget; `svg.js` / `generators.js` / KaTeX load only when a page needs them; custom prose styles instead of `@tailwindcss/typography`.
- **Tooling** — `validate:exercises`, `generate:maths` scaffolding, `list:type` / `list:series`, human- and LLM-validation pipelines.
- **Tests** — Vitest on generators and puzzle logic (futoshiki, kenken, numberlink, magic-color); Playwright layout-health on every page plus 34 type scenarios.
- **Docs** — the `AGENTS.md` index and `agents/*.md` make changes fast and consistent.

## Findings, most important first

### 1. Adding a type touches ~10 places, and they have already drifted

Places edited for each new type: the partial, `series-player.njk` (include + error message), `player.js`, `.eleventy.js` (payload + `CSV_TYPES`), `app.js` (`CSV_TYPES`), `admin/index.njk`, `validate-exercises.js`, `show-type.js`, `list-series.js`, `generate-maths-ex.js`, `agents/exercises.md`.

Drift observed:

- `CSV_TYPES` in `app.js` was missing 8 types present in `.eleventy.js` (`futoshiki` … `classify`), so the type filter didn't recognise those series in production. Fixed 2026-09-24.
- The validator's `TYPE_SCHEMAS` is missing 9 types (`venn`, `maze`, `classify`, `decomp`, `tri-arith`, `magic-color`, `function-machine`, `constraint`, `seq-verify`).
- `agents/exercises.md` doesn't document 16 types.

**Fix:** one type registry (e.g. `src/_data/types.js`: name, schema, error message, CSV index) that feeds eleventy, the layout, the validator, the scripts and a generated list for `app.js`. Estimate: 2–3 days.

### 2. The safety net has holes

- **CI is disabled** (`.github/workflows/ci.yml.disabled`), and `npm run build` doesn't run e2e or lint.
- **Generated exercises are never validated.** `validate-exercises.js` skips every file with `generator:`. A misspelled generator name or bad `params` only shows up in the browser as "⚠️ Erreur de génération". The generator smoke test only uses default params, not the ones in the content files.
- **layout-health is weaker than it looks.** It only checks the first exercise of each series. Its "exercise area visible" check picks the first `[x-data]` element, which is the theme toggle, not the player, so that check always passes.

**Fix (best value for effort):**

- At build time, check every `generator:` in the content: the generator exists, and it produces a valid item from the file's `params`, run about 20 times.
- Target `[x-data^=seriesPlayer]` in layout-health.
- Re-enable a minimal CI job: lint, unit tests, validation, build.

Estimate: ~1 day.

### 3. Three central files keep growing

| File | Size | Symptom |
|---|---|---|
| `src/assets/js/generators.js` | 6,100 lines, 131 generators, 228 KB raw / 54 KB gzip | Loaded in full on every generated page, even when it uses one generator. Splitting it is still open in `js_roadmap.md`. |
| `src/assets/js/modules/player.js` | 2,200 lines, 109 top-level state fields, 42 `type ===` branches | `js_roadmap.md` says the state was grouped; that's no longer true. |
| `.eleventy.js` | 1,800 lines, 41 `type ===` branches in `seriesPayload` | Payload rules for each type are mixed in with the build config. |

**Fix:** give each type its own module (`payload(ex)`, `initState()`, `check()`) and dispatch by type. Split the generators into files by topic, and have the build include only the generators a page uses (esbuild is already installed). This is the largest item; it's easier to do after item 1.

### 4. Lint and format debt

- ESLint reports 51 problems. 5 errors come from the vendored `alpine.min.js`, which isn't in the ignore list. There's 1 real error at `modules/utils.js:27` (`no-useless-escape`).
- Prettier fails on 13 files, including generated files (`reports/`, `test-results/`).
- knip reports `svg.js`, `dev.js` and `alpine.min.js` as unused. That's wrong: they're loaded through `<script>` tags. knip also flags unlisted `@marp-team/*` dependencies.

**Fix:** ignore vendored and generated files, run `npm run format` once, add `lint` to `build`. Estimate: ½ day.

### 5. Repo hygiene and leftovers

- **Generated files are committed:** `reports/playwright/index.html` (changes after every e2e run) and `test-results/.last-run.json`. So are scratch files: `.scrap/`, `series_list.txt`, `memory/`.
- **PocketBase leftovers,** although the site has been fully static since 2026-04-09: `pocketbase/`, `pb_schema.json`, `src/_data/pocketbase.js`, `components/debug-panel.njk`, the `test:auth` script, `agents/identity.md`, and parts of `agents/architecture.md` and `agents/tools.md`.
- **Docs drift:** `performance.md` says Alpine is loaded from a CDN, but it's vendored. The `js_roadmap.md` status is from March.

### 6. Series ID changes affect students

Student progress is stored in localStorage by series ID (`melimee_v1.progress[seriesId]`). When `generate:ids` replaces a non-compliant ID (18 on 2026-09-24), any progress on that series is orphaned and its old URL breaks. The script should also write old-ID → new-ID redirects (`.htaccess` on LWS) and a progress migration.

### 7. Watch the budgets

- The CSS bundle is 56 KB against a 60 KB budget.
- 20 of the 60 types have no interaction test (e.g. `mcq`, `number-check`, `calc-chain`, `tri-arith`, `emoji-equations`, `number-forms`, `op-triangle`). They are only covered by the generator unit tests and layout-health.

## Suggested order

1. [x] Validate generated content at build time, fix the layout-health selector, re-enable CI (~1 day). **Done 2026-09-25:**
   - `validate-exercises.js` runs every generator 20× with the file's `params` (unknown generator, exception, `NaN`/`undefined`/`Infinity`, missing `svg.gen` helper, output type ≠ front-matter type). That rule made the manual `GENERATOR_OUTPUT_TYPES` map in `.eleventy.js` redundant, so it was removed.
   - `layout-health` scopes its checks to the player, counts `@click` targets, and visits **every** exercise of each series to check that its type block is visible.
   - `.github/workflows/ci.yml`: unit tests, validation, build, full Playwright run on push to `main` and on PRs.
   - These checks found 3 production series showing a blank exercise: CE2 `comparer-10000` and CM1 `comparer-grands-nombres` (declared `compare`, generator returns `tile-select`), and CM1 `position-chiffre-01` (`positionChiffre` returned `mcqOptions` instead of `mcqChoices`, broken since 2026-03-14). All fixed; 4 `trierDecimaux` files were also retyped `sort` → `drag-sort`.
   - **Local testing (2026-09-25):** `npm run check` is the pre-commit command. It runs unit tests, validation, a fresh build, then e2e on the series changed since HEAD, or on every page if engine code changed (`check:full` forces it; `--scope` previews what would be tested). About 40 s for a content change and about 12 min for a full run. New `tests/e2e/solve.spec.js` solves **every exercise** of every page and checks that a wrong answer is refused; futoshiki, kenken, numberlink and mazes are solved by search. It covers every type in use. `reports/playwright/` and `test-results/` are no longer tracked. Bugs this found and fixed:
     - **Numberlink (CE2 4×4, CM1 5×5) was unsolvable:** all 9 hand-written puzzles made full coverage impossible, and the 6×6 ones used 5×5 coordinates. The generator now builds puzzles from a random Hamiltonian path, so they are solvable by construction.
     - **`convert` accepted any answer (6 series, 45 exercises)** since commit `a4b1c60` (2026-04-15). The player took `items` as the interleaved-sequence format and ignored `answers`. Fixed; explicit `answers` now take priority.
     - **The 5 CE2 `grilles-01` logic grids were unsolvable:** their solution keys were rows instead of columns. The content is fixed, and the validator now rejects keys that aren't columns.
   - **Wrong exercises and broken pages (2026-09-26).**
     - **Answer oracle:** `scripts/check-answers.js` with the shared French-notation parser in `scripts/lib/arith.js`. It recomputes ~4,800 expected answers (static pages as built, plus 20 draws of every generator), runs in `check` and `build`, and blocks on a wrong answer.
     - **Spelling:** French spellcheck (cspell) of the changed content, front matter included. The config was broken: it ignored almost every word and never checked the front matter.
     - **Production output:** e2e runs on the minified output, on desktop and on a portrait tablet (the target devices).
     - **Stricter e2e:** layout-health reports every JS error and failed request, and content sticking out of the player on every exercise. The solvability test solves 10 draws per generated series and fails on a missing (`null`) expected answer.
     - **Human validation as a regression baseline** (`scripts/lib/human-validation.js`): a validated series is fingerprinted (the file, plus the generator's code for generated exercises). If it changes afterwards it is shown as **stale** (« ↻ à revérifier ») in `/admin/`, in `check` and in the sync script, which no longer erases these validations. The dashboard loads the data live; its « À vérifier » column shows each series' state (stale, **flags** from `npm run flag`, pending, validated), validates with one tick (5 s undo) and closes flags one by one. `check` ends with a reminder: stale series, then changed series not yet validated, then open flags.
     - **One-off proofread:** Haiku reviewed the 871 word-based exercises, and every finding was checked by hand: 4 real errors (3 wrong answers in CM1 `modelisation-01`, 1 inconsistent estimate) and 4 false positives.
     - **Bugs fixed:**
       - `compare-expressions` auto-answers used a JS eval: decimals came out wrong and "1 000" gave `?`.
       - Top-down pyramids had `null` expected cells (unsolvable). The build now solves pyramids algebraically and rejects contradictory data; one pyramid had a wrong given cell.
       - Column multiplications had misaligned digit slots.
       - "Recommencer la série" multiplied the series (10 → 58 → 370).
       - 14 series had operations or labels overflowing the player on desktop; the font now scales to the widest segment, and short operations are unchanged.
       - Content fixes in `aires-01` (CM1, CM2) and `monnaie`.
2. [ ] Lint and hygiene cleanup, remove the PocketBase leftovers (~½ day).
   - [x] **Lint & format (2026-09-25):** 0 errors, 0 warnings, Prettier-clean, knip-clean. Vendored `alpine.min.js` and generated folders are ignored. The one real error was fixed (`utils.js` regex escape). Unused catch bindings became `catch {`, and dead code was removed (unused helpers and variables in scripts, the dead CSS-variables block in `generate-tailwind-from-tokens.js`, the unused `@11ty/eleventy-upgrade-help` dependency). Template globals (`debugPanel`, `*Html` SVG helpers) were allowlisted. **Anti-drift:** `npm run lint` is strict (`--max-warnings=0` + Prettier + knip) and is the first step of `npm run check` and `npm run build`; `npm run lint:fix` auto-fixes.
   - [x] **PocketBase leftovers (2026-10-05):** removed `pocketbase/`, `pb_schema.json`, `src/_data/pocketbase.js`, the `db:*`, `test:auth`, `import:identities` and `check:duplicates` scripts (the last one held a hard-coded admin password), and the config and doc mentions.
3. [ ] Type registry (~2–3 days).
4. [ ] Per-type modules and splitting `generators.js` (larger; do it gradually, one type at a time).
   - [x] **`generators.js` split (2026-09-25):** `src/assets/js/generators/` now holds 7 topic modules (`numeration`, `nombres`, `calcul`, `operations`, `fractions-decimaux`, `mesures`, `logique`; 540–1,220 lines each) plus `_core.js` for the shared helpers. `index.js` is the Node entry (all generators + `moduleOf`). The split was done mechanically by a script; old and new outputs were identical over 2,900 seeded runs (127 generators × default and content params). Each page loads `_core.js` + the modules its generators need (the `generatorScripts` filter; an unknown generator fails the build). Every generated page needs exactly one module: ~6 KB gzip instead of 28 KB (−78 %). `base10Render` moved to `svg.js`. `build` and `build:e2e` now clean `_site/` first: 18 stale pages from replaced IDs (and the old `generators.js`) were still in `_site/` and got tested/deployed.
   - [ ] `player.js` and `.eleventy.js` per-type modules — still reasonable in size, deferred.
