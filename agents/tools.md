# Tools

## npm Scripts Reference

All available commands (run `npm run help` for a live list):

### Core development

| Command | Description |
|---------|-------------|
| `npm start` / `npm run dev` | Start dev server (Eleventy + Tailwind watch mode) |
| `bun run dev:bun` | Same, using Bun runtime (faster if Bun is installed) |
| `npm run build` | Full production build: test → validate → generate:tokens → eleventy → css → html-validate |
| `npm run clean` | Remove `_site/` build output |
| `npm run serve:local` | Serve the built `_site/` locally (useful for testing subpath deployments) |

### Testing & Validation

| Command | Description |
|---------|-------------|
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
| `npm run lint` | Run ESLint + Prettier checks |
| `npm run format` | Auto-format with Prettier |
| `npm run check:spell` | Spellcheck markdown files with cspell |
| `npm run check:duplicates` | Check for duplicate exercise entries |
| `npm run test:a11y` | Accessibility audit (WCAG2AA) on built `_site/` — requires `npm run build` first |

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
| `npm run review:failures` | Interactive review of LLM-flagged failures — opens browser, prompts y/n/s per file |
| `npm run sync:human-validations` | Dry-run: show which exercise files are new/changed vs `reports/human-validate.csv` |
| `npm run sync:human-validations:write` | Apply: update `human-validate.csv` (add new files, clear stale validations) |
| `npm run list:human-validations` | Display the human-validate.csv as a table with progress summary |
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
| `sync-human-validations.js` | Syncs `reports/human-validate.csv` with current exercise files. Adds new, clears stale (hash changed), removes deleted. Use `--write` to apply. |
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

A lightweight QA loop for manually validating exercise series during development. All data lives in `reports/human-validate.csv` (format: `path,seriesId,hash,validatedAt` — one row per `.md` file).

### Typical session

```bash
# 1. Sync the CSV with current files after adding/editing exercises
npm run sync:human-validations           # dry-run — shows what would change
npm run sync:human-validations:write     # apply (adds new files, clears stale validations)

# 2. Start the dev server
npm run dev

# 3. Open the exercise list → click "Non validées" to see unvalidated series
#    Navigate to a series, work through all exercises
#    When done: "Série terminée!" modal → click "✓ Valider la série"
#    This writes one row per .md file with the current hash + timestamp

# 4. Review what has been validated
npm run list:human-validations
npm run list:human-validations -- --last 20
```

### Key rules

- `"Non validées"` filter (visible on `localhost` only) hides series where **all** files have a `validatedAt` timestamp.
- A series becomes **unvalidated** again automatically if any of its files change (detected by hash mismatch during `sync`).
- The right-click **debug panel** (on any series page) lets you grab the current exercise state and copy an agent-ready prompt to the clipboard.
- The CSV can be joined with `reports/validate-llm-cache.csv` on the `path` and `hash` columns.

### CSV columns

| Column | Description |
|--------|-------------|
| `path` | Relative path from project root (e.g. `src/fr/exercices/ce1/…/01-foo.md`) |
| `seriesId` | 8-char series ID from `index.yaml` |
| `hash` | 16-char SHA-256 of file content at validation time |
| `validatedAt` | ISO 8601 timestamp, or empty if not yet validated / invalidated by sync |

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
