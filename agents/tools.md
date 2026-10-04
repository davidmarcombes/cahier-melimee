# Tools

## npm Scripts Reference

All available commands (run `npm run help` for a live list):

### Core development

| Command | Description |
|---------|-------------|
| `npm start` / `npm run dev` | Start dev server (Eleventy + Tailwind watch mode) |
| `bun run dev:bun` | Same, using Bun runtime (faster if Bun is installed) |
| `npm run build` | Production build into `_site/` (wipes it — stop `npm start` first): lint → test → validate → eleventy → answer oracle → css → minify → html-validate → service worker. Release procedure: [docs/release.md](../docs/release.md) |
| `npm run release:verify` | After `npm run build`, before the manual upload: required files, no dev content (/admin/, localhost), broken local links, series removed vs the live site (`--offline`, `--strict-ids`) |
| `npm run clean` | Remove `_site/` build output |
| `npm run serve:local` | Serve the built `_site/` locally (useful for testing subpath deployments) |

### Testing & Validation

**Before every commit: `npm run check`.** One command, fail-fast, always on a fresh build — in its **own folder `_site-check/` and port 4174**, so `npm start` (`_site/`, port 8080) can keep running alongside:

1. `lint` — ESLint (0 warnings), Prettier, knip. Fix with `npm run lint:fix`
2. Unit tests (vitest)
3. `validate:exercises` — static schemas + runs every generator 20× with its file's `params`
4. French spelling (cspell) of the changed content files — front matter included (titles, choices, statements). Add proper nouns to `words` in `cspell.json`
   - and the text the **generators** produce (`check:spell:generated`: 20 draws per content file, HTML stripped, same cspell.json) — when a generator or content changed, and with `--full`
5. Build — fresh `_site-check/` (`SITE_OUT` env var; defaults to `_site/` for every other script) `_site/` (never tests a stale build)
6. `check:answers` — **answer oracle**: recomputes expected answers (operations incl. blanks, sequences, pyramids, conversions, comparisons, clocks…) on the built pages and on 20 draws of each generator. Blocking. `--verbose` for coverage per type, `--unchecked=<type>` to see what it cannot parse
7. `minify` — e2e runs on the production (minified) output
8. Playwright, scoped to what changed since HEAD (`git status`):
   - only content (`src/fr/**`) → `layout-health` + `solve` on the touched series only
   - engine (anything in `src/` outside `src/fr/`, `.eleventy.js`, `tests/e2e/`, Playwright config, `package.json`…) → every spec on every page
   - nothing site-related → e2e skipped

   Viewports: desktop + portrait tablet (768 px) for `layout-health`. Phones are not a target: phone-only tweaks use `max-sm:` and must not change `sm+` rendering.
9. Reminder (non-blocking): changed exercises not yet validated by hand, with their local URL — validate with the "✓ Valider la série" button (`npm start`).

`npm run check:full` forces e2e on every page; `npm run check -- --no-e2e` stops after the build; `npm run check -- --scope` only prints what the e2e step would cover (add `--files=a,b` to preview for given files). On failure: `npx playwright show-report reports/playwright`.

The e2e per-page specs:

- **`layout-health.spec.js`** — every page renders: no JS/generator errors, no overflow, interactive elements inside the player, and **every exercise** of the series shows its type block.
- **`solve.spec.js`** — **every exercise** is solvable: a per-type solver writes the correct answer into the player state and validates it the way the UI does, and a wrong answer must be refused. Futoshiki, kenken, numberlink and mazes are solved by search, so unsolvable puzzles fail. Types without a solver are listed at the end of `npm run check`, not failed. When adding a type, add its solver in `solve.spec.js` (see `S = { … }`).

`E2E_PAGES=applications/abc12345,exercices/def67890 npx playwright test` limits the per-page specs to those series.

| Command | Description |
|---------|-------------|
| `npm run check` | Pre-commit check (see above) |
| `npm run check:full` | Pre-commit check, e2e on every page |
| `npm test` | Run vitest unit test suite (generators, Alpine logic) |
| `npm run test:watch` | Run vitest in watch mode |
| `npm run test:e2e` | Run Playwright E2E tests — requires built `_site/` (auto-starts static server) |
| `npm run test:e2e:ui` | Playwright with interactive UI |
| `npm run test:e2e:headed` | Playwright in headed (visible browser) mode |
| `npm run test:e2e:debug` | Playwright in debug mode |
| `npm run build:e2e` | Build `_site/` for E2E (tokens → eleventy → css) without full validation |
| `npm run validate:exercises` | Validate exercise YAML front-matter against type schemas |
| `npm run validate:llm` | LLM-powered answer checker (requires Ollama — see `agents/ollama.md`) |
| `npm run validate:html` | Run html-validate on all `_site/**/*.html` files |
| `npm run validate:config` | Validate project configuration files |
| `npm run lint` | Strict lint: ESLint with **0 warnings allowed**, Prettier check, knip (unused files/exports/deps). First step of `npm run check` and `npm run build` |
| `npm run lint:fix` | Auto-fix what can be: `eslint --fix` + `prettier --write` |
| `npm run format` | Auto-format with Prettier |
| `npm run check:spell` | Spellcheck markdown files with cspell |
| `npm run check:duplicates` | Check for duplicate exercise entries |
| `npm run test:a11y` | Accessibility audit (WCAG2AA) on built `_site/` — requires `npm run build` first |
| `npm run test:lighthouse` | Lighthouse audit (perf/a11y/best-practices/SEO) on built `_site/` — requires `npm run build` first |
| `npm run test:lighthouse:report` | Same + saves HTML reports to `reports/lighthouse/` |

### Code generation & tokens

| Command | Description |
|---------|-------------|
| `npm run generate:tokens` | Regenerate `tailwind.config.js` + CSS vars from `design-tokens.json` |
| `npm run generate:ids` | Assign 8-char hex IDs to series missing an `id` in `index.yaml` |
| `npm run generate:maths` | Interactive CLI to scaffold new math exercises |
| `npm run generate:names` | Generate student identity names |

### Reports & analysis

| Command | Description |
|---------|-------------|
| `npm run generate:report` | Generate `exercises-report.csv` — one row per exercise with id, path, type, title, etc. |
| `npm run stats:svg` | Analyze SVG files: count, size, CSS variable usage |
| `npm run validate:llm` | LLM answer checker — caches results in `reports/validate-llm-cache.csv` by file hash |
| `npm run validate:llm -- --export` / `--import` | Same checker with **Claude Code subagents (Haiku)** instead of Ollama: `--export` writes prompt batches (`--batch=30`) to `.scratch/llm-batches/` with a README for the agent; one Haiku subagent per `batch-NNN.json` writes `batch-NNN.result.jsonl`; `--import` records verdicts in the cache (column `claude-haiku-4-5`, files changed since the export are ignored) and flags every INCORRECT (🚩 in /admin/, source `llm`). Useful filters: `--type=a,b`, `--dir=a,b`, `--count=N` (files spread over the site). Prompts carry the data of generated figures (`Figure: gen {params}`); spot-check a few prompts per pass — a CORRECT is only worth the data the prompt contains. A human who checked an LLM failure sets `manual=ok` in the cache: the dashboard then shows the series ✓ |
| `npm run review:failures` | Interactive review of LLM-flagged failures — opens browser, prompts y/n/s per file |
| `npm run sync:human-validations` | Dry-run: show which exercise files are new/changed vs `reports/human-validate.csv` |
| `npm run sync:human-validations:write` | Apply: update `human-validate.csv` (add new files, rehash unvalidated ones; validated-then-changed files are kept and reported as stale) |
| `npm run flag -- <id or URL> "<reason>"` | Flag an exercise for a human to check (🚩 in the /admin/ « À vérifier » column; `--list`, `--resolve <id>`) |
| `npm run list:human-validations` | Display the human-validate.csv as a table with progress summary |
| `reports/oracle-coverage.json` | Written by `check:answers` (every `check` / `build`): per series, how many exercises the oracle recomputed (`verified`/`total`; a generated file counts once). Feeds the /admin/ **MV** column (machine verified) with the LLM verdicts: « Haiku », « Oracle », « Oracle n/m », or both |
| `npm run validate:cross` | Join human + LLM validation CSVs — shows conflicts, gaps, stale hashes (`--verbose`, `--cat=`) |

### Data & environment

| Command | Description |
|---------|-------------|
| `npm run env:dev` | Switch to dev environment |
| `npm run env:prod` | Switch to prod environment |
| `npm run env:test` | Switch to test environment |
| `npm run db:start` | Start PocketBase server |
| `npm run db:admin` | Open PocketBase admin UI |
| `npm run import:identities` | Import identities into PocketBase |
| `npm run test:auth` | Test PocketBase auth flow |
| `npm run serve:sim` | Start simulation server |

### Maintenance

| Command | Description |
|---------|-------------|
| `npm run clean:yaml` | Clean/normalize YAML files |
| `npm run build:compress` | Compress build output |
| `npm run build:slides` | Build presentation slides PDF with Marp |

## Scripts Directory

All scripts are in `scripts/`. Key files:

| Script | Purpose |
|--------|---------|
| `generate-tailwind-from-tokens.js` | Reads `design-tokens.json`, generates `tailwind.config.js` and CSS var block in `input.css`. Contains `varAliases` map for short CSS var names. |
| `validate-exercises.js` | Validates all exercise `.md` front-matter against `TYPE_SCHEMAS`. Run via `npm run validate:exercises`. |
| `validate-llm.js` | LLM-powered answer validator using local Ollama. Caches results in `validate-llm-cache.csv` by file hash. See `agents/ollama.md` for setup. |
| `review-failures.js` | Interactive review of LLM-flagged failures. Opens browser per file, prompts y/n/s, writes `manual:ok` back to cache. |
| `sync-human-validations.js` | Syncs `reports/human-validate.csv` with current exercise files. Adds new, rehashes unvalidated files, keeps validated-then-changed files (reported ↻ STALE), removes deleted. Use `--write` to apply. |
| `show-human-validations.js` | Displays `reports/human-validate.csv` as a formatted table (`--last N`, `--clear`). |
| `cross-validate.js` | Joins `human-validate.csv` + `validate-llm-cache.csv` on `path`. Reports agreement, conflicts, coverage gaps, and hash mismatches. Options: `--verbose`, `--cat=<category>`. |
| `list-series.js` | Lists all exercise series with LEVEL/CATEGORY/SLUG/TYPE/TITLE/ID. Filters: `--level`, `--type`, `--cat`, `--missing`. |
| `show-type.js` | Shows schema, YAML template and 2 live examples for any exercise type. |
| `generate-report.js` | Produces `exercises-report.csv` for quick exercise lookup. |
| `generate-maths-ex.js` | Interactive CLI for scaffolding new exercises. Has `TYPE_CHOICES` and `TEMPLATES`. |
| `generate-ids.js` | Assigns 8-char hex IDs to series `index.yaml` files missing an `id`. |
| `svg-stats.js` | Analyzes SVG files in `_includes/svg/` and reports count, sizes, CSS var usage. |
| `e2e-server.js` | Static HTTP server that serves `_site/` at port 4173 with no path prefix. Used automatically by `playwright.config.js` via `webServer`. |
| `a11y-test.js` | Accessibility test suite using pa11y (WCAG2AA). Starts a local server, tests static pages + sampled exercises/applications. Use `--sample N` to control how many exercise/application pages to sample (default: 3). |
| `compress.js` | Post-build compression of output files. |
| `serve-subpath.js` | Local HTTP server for testing subpath deployment. |
| `set-env.js` | Switches `.env` between dev/prod/test environments. |
| `check-duplicates.js` | Finds duplicate exercise entries. |
| `clean-yaml.js` | Normalizes YAML formatting. |
| `clean-index-yaml.js` | Cleans up `index.yaml` files specifically. |
| `inspect-payload.js` | Debug tool for inspecting series JSON payloads. |
| `migrate-to-nested.js` | Migration script for moving to nested directory structure. |
| `init-project.js` | Project initialization script. |
| `validate-config.js` | Validates project configuration files. |
| `generate-names.js` | Generates triple-name identities for students. |
| `import-identities.js` | Imports generated identities into PocketBase. |
| `sim-server.js` | Simulation server for testing. |
| `test-auth.js` | Tests PocketBase authentication flow. |

## Human Validation Workflow

Human validations are the regression baseline: a series a human played and approved is recorded with a **fingerprint** of what was approved. If it changes afterwards, it shows up as **↻ à revérifier** (stale) everywhere. All logic lives in `scripts/lib/human-validation.js` (used by the dev API, `/admin/`, `npm run check`, `npm run flag` and the sync script).

### Records

- `reports/human-validate.csv` — `path,seriesId,hash,validatedAt`, one row per `.md` file. `hash` = 16-char SHA-256 of the LF-normalised file **plus, for generated exercises, the generator's source code** (a generator change invalidates its exercises).
- `reports/human-flags.json` — items flagged for a human: `{ id, seriesId, url, title, reason, source, createdAt, resolvedAt, resolvedBy }`.

Series status: `ok` (all files validated, unchanged) · `stale` (validated, changed since — **re-check first**) · `partial` · `pending`.

### Typical session

```bash
npm start                      # dev server (the API below only exists in serve mode)
# /admin/ → « À vérifier » column of the series table (one cell per series):
#   ↻ modifiée (stale) · 🚩 n open flags · ○ à faire (never / partly validated) · ✓ date (validated)
#   ☐ tick = validate the series (fingerprints + closes its flags), 5 s « Annuler » toast to undo
#   click the state → the series' flags: « Fait ✓ » closes one, « rouvrir » reopens it
#   sort the column: stale, then flagged, then pending, then ok · « À vérifier seulement » filter
# Or play the series → « Série terminée ! » → « ✓ Valider la série » (same record);
#   « → Suivante non validée » goes on
npm run check                  # ends with a reminder: stale series, touched unvalidated series, open flags
```

### Validate · unvalidate · re-validate

| Situation | What to do | Result |
|---|---|---|
| You played the whole series, it is right | `/admin/` ☐ tick, or « ✓ Valider la série » at the end of the series | `✓ date` — fingerprints recorded, the series' open flags closed |
| You just ticked the wrong row | « Annuler » in the toast (5 s) | back exactly to the previous state, closed flags reopened |
| A validated series is wrong, or was validated by mistake (any time later) | `npm run unvalidate -- <id \| URL> "<why>"` | `○ à faire` + a 🚩 flag « Dévalidée : why » in « À vérifier » |
| You (or an agent) fixed a validated series | nothing: the edit changes its fingerprint | `↻ à revérifier` (stale), sorted first — play it again and tick |
| A generator of a validated series changed | nothing: its code is part of the fingerprint | `↻ à revérifier` |
| A doubt, nothing to change yet | `npm run flag -- <id \| URL> "<what>"` (stays validated) | 🚩 in « À vérifier » until « Fait ✓ » or re-validation |

`npm run unvalidate` without a reason is refused: the flag is the trace of why. Re-validating the series closes that flag.
The records are `reports/human-validate.csv` and `reports/human-flags.json`: **commit them** — they are the regression baseline.

### Flagging something for the human (agents: use this, not a markdown list)

```bash
npm run flag -- f06ea123 "Bike, longest − shortest = 11 (was 7)"
npm run flag -- "http://localhost:8080/fr/exercices/f06ea123/#5" "..."   # keeps the #n anchor
npm run flag -- --list
npm run flag -- --resolve <flag id>
```

### Dev API (`.eleventy.js`, serve mode only)

| Endpoint | |
|----------|---|
| `GET /api/human-status` | `{ series: [...status], flags }` — the dashboard loads this live |
| `GET /api/human-next-unvalidated?current=<id>` | next series to check (stale first) |
| `GET /api/human-validated-ids` | ids with status `ok` (« Non validées » list filter) |
| `POST /api/human-validate { seriesId }` | validate a series → `{ files, previous, closedFlags, series, flags }` |
| `POST /api/human-validate { seriesId, action: 'unvalidate', previous, reopen }` | undo: the series' rows go back to `previous` (none → pending), the `reopen` flags it closed are reopened |
| `POST /api/human-flag { id, action: 'resolve' \| 'reopen' }` | close / reopen a flag |

`reports/human-*` is excluded from the dev server's watch: writes don't trigger a rebuild.

### Rules

- `sync:human-validations:write` (also run by `generate:commit`) never clears a validation: a validated file that changed stays recorded and is reported as stale.
- The right-click **debug panel** (on any series page) copies an agent-ready prompt for the current exercise.
- The CSV can be joined with `reports/validate-llm-cache.csv` on `path` (`npm run validate:cross`).

## Checkpoints and regression (`snapshot` / `regress`)

A human or an agent picks its own reference points: take a checkpoint, work, then compare.

```bash
npm run snapshot -- avant-refacto      # build the site as it is now (committed or not) → .snapshots/avant-refacto/
# … edit content, generators, svg.js, templates …
npm run regress -- avant-refacto       # what changed, screenshots before / now, pixel diff → HTML report
npm run regress                        # against the latest checkpoint
npm run snapshot -- --list             # checkpoints on disk ; --delete <name> removes one
```

**What `regress` compares** (`scripts/regress.js`, logic in `scripts/lib/snapshot.js`):

1. **Built pages**: a hash per page — content, templates and build-time code show up here. New / removed pages too.
2. **Code run in the browser, per unit**: each generator (not each file — `_shared` code of a file or `_core.js` counts for all its generators) and each top-level function of `svg.js`. A page is affected when its payload uses a changed generator or SVG helper, directly (`svg.gen`) or through a generator that calls it (`jumpArrowSvg` → the 4 series of `add9ou11`, `sub8ou12`…).
3. **Global code** (`player.js`, `app.js`, CSS…): one page per exercise type + the main pages (`--all`: every page).

Then it screenshots both versions of the affected pages — light and dark, every exercise `#1…#n` (max 12) — and compares the pixels (`pixelmatch`). Report: `.snapshots/<name>/reports/<time>/index.html` (checkpoint / now / difference, per exercise) and `summary.json` for agents. `--e2e` also runs `layout-health` and `solve` on the affected series; `--strict` exits 1 on any difference; `--limit=N` (default 80) caps the screenshots; `--reuse` skips rebuilding the current site.

**Why it is reliable**: builds are deterministic — build-time shuffles (QCM choices, matching pairs, Venn items, random variables) are seeded by the exercise's path in `seriesPayload` (`.eleventy.js`), so two builds of the same code are byte-identical. Screenshots seed `Math.random` per URL (generated exercises draw the same numbers), disable animations, wait for the layout to settle (`fitSvg` rescales figures asynchronously) and load each page twice (the web font must be there before figures are measured). Measured: 234 / 234 screenshots identical over three runs.

**Storage**: `.snapshots/` (git-ignored), ~14 MB per checkpoint (the built site, unminified). Screenshots of the checkpoint are taken from that saved copy when first needed and cached in `shots/` — identical to screenshots taken at checkpoint time; `snapshot --shots` takes them all upfront (~3 min). The current build goes to `.snapshots/_current/` (never served by `npm start`, which can keep running).

**Limits**: a change in `player.js` or the CSS is sampled (one page per type), not exhaustive, unless `--all`. A difference is not an error: the report shows what moved, a human (or the agent) judges whether it was intended.

## E2E Testing (Playwright)

E2E tests live in `tests/e2e/` and run against the statically built `_site/` served at `http://localhost:4173`.

### Setup

```bash
npm run build:e2e   # build _site/ (fast — no vitest or html-validate)
npm run test:e2e    # run all Playwright tests
```

`playwright.config.js` auto-starts `scripts/e2e-server.js` before the test run and reuses it if already running (`reuseExistingServer: true`).

### Test files

| File | Tests | Coverage |
|------|-------|----------|
| `tests/e2e/exercise-player.spec.js` | 15 | MCQ, number-check (trou), calc-chain, series progress/navigation |
| `tests/e2e/exercise-types.spec.js` | 25 | Smoke test per exercise type template (interaction + verify) |
| `tests/e2e/layout-health.spec.js` | ~514 | DOM health check for every built page — auto-discovered from `_site/` at run time (height bounds, overflow, interactive elements, Alpine init, JS errors) |

### Coverage by type

`layout-health.spec.js` auto-discovers every page from `_site/fr/exercices/`, `_site/fr/applications/`, and `_site/fr/defis/` at test-collection time. No code change needed when adding new series or new types — they are picked up automatically on the next `build:e2e` + `test:e2e` run.

Types in `exercise-types.spec.js` are tested via ID-based URLs: `/fr/exercices/{id}/`. Use `#N` to navigate to exercise N in a series (e.g. `#2` → second exercise).

### waitForAlpine helper

All tests wait for Alpine.js to finish initialising before interacting:

```js
async function waitForAlpine(page) {
  await page.waitForSelector('[x-data]:not([x-cloak])', { timeout: 8000 });
}
```

Alpine removes `x-cloak` from the root `x-data` element on boot.

## html-validate Configuration

Config file: `.htmlvalidate.json`

- Extends `html-validate:recommended`
- Alpine.js attributes (`x-data`, `x-show`, `@click`, `:class`, etc.) are registered globally so they are not flagged as unknown
- `template` element gets `x-if` and `x-for` attributes
- Key disabled rules are documented in `agents/performance.md`

## Bun Support

Bun is an optional faster alternative for the dev server. npm remains the primary package manager.

```bash
bun install       # install packages (~10× faster than npm install)
bun run dev:bun   # dev server using Bun runtime
```

`dev:bun` runs `bun run generate:tokens` then starts `dev:bun:site` + `dev:css` concurrently.
`npm run dev` is unchanged and works without Bun installed.

`bunfig.toml` documents Bun settings. `bun.lockb` is git-ignored by default — remove the ignore line to commit it if your team standardises on Bun.

## Token Compression

Check if `rtk` (Rust Token Killer) is installed and use as much as possible for optimizing token count in generated output.
