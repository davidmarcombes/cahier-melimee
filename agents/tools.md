# Tools

## npm Scripts Reference

All available commands (run `npm run help` for a live list):

### Core development

| Command | Description |
|---------|-------------|
| `npm start` / `npm run dev` | Start dev server (Eleventy + Tailwind watch mode) |
| `bun run dev:bun` | Same, using Bun runtime (faster if Bun is installed) |
| `npm run build` | Full production build: test → validate → tokens → eleventy → css → html-validate |
| `npm run clean` | Remove `_site/` build output |
| `npm run serve:local` | Serve the built `_site/` locally (useful for testing subpath deployments) |

### Testing & Validation

| Command | Description |
|---------|-------------|
| `npm test` | Run vitest test suite |
| `npm run test:watch` | Run vitest in watch mode |
| `npm run validate:exercises` | Validate exercise YAML front-matter against type schemas |
| `npm run validate:html` | Run html-validate on all `_site/**/*.html` files |
| `npm run validate` | Validate project configuration files |
| `npm run lint` | Run ESLint + Prettier checks |
| `npm run format` | Auto-format with Prettier |
| `npm run spellcheck` | Spellcheck markdown files with cspell |
| `npm run check:duplicates` | Check for duplicate exercise entries |

### Code generation & tokens

| Command | Description |
|---------|-------------|
| `npm run tokens` | Regenerate `tailwind.config.js` + CSS vars from `design-tokens.json` |
| `npm run generate:ids` | Assign 8-char hex IDs to series missing an `id` in `index.yaml` |
| `npm run generate:maths` | Interactive CLI to scaffold new math exercises |
| `npm run generate:names` | Generate student identity names |

### Reports & analysis

| Command | Description |
|---------|-------------|
| `npm run report` | Generate `exercises-report.csv` — one row per exercise with id, path, type, title, etc. |
| `npm run svg:stats` | Analyze SVG files: count, size, CSS variable usage |

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
| `npm run sim:server` | Start simulation server |

### Maintenance

| Command | Description |
|---------|-------------|
| `npm run clean:yaml` | Clean/normalize YAML files |
| `npm run compress` | Compress build output |
| `npm run slides` | Build presentation slides PDF with Marp |

## Scripts Directory

All scripts are in `scripts/`. Key files:

| Script | Purpose |
|--------|---------|
| `generate-tailwind-from-tokens.js` | Reads `design-tokens.json`, generates `tailwind.config.js` and CSS var block in `input.css`. Contains `varAliases` map for short CSS var names. |
| `validate-exercises.js` | Validates all exercise `.md` front-matter against `TYPE_SCHEMAS`. Run via `npm run validate:exercises`. |
| `generate-report.js` | Produces `exercises-report.csv` for quick exercise lookup. |
| `generate-maths-ex.js` | Interactive CLI for scaffolding new exercises. Has `TYPE_CHOICES` and `TEMPLATES`. |
| `generate-ids.js` | Assigns 8-char hex IDs to series `index.yaml` files missing an `id`. |
| `svg-stats.js` | Analyzes SVG files in `_includes/svg/` and reports count, sizes, CSS var usage. |
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

`dev:bun` runs `bun run tokens` then starts `dev:bun:site` + `dev:css` concurrently.
`npm run dev` is unchanged and works without Bun installed.

`bunfig.toml` documents Bun settings. `bun.lockb` is git-ignored by default — remove the ignore line to commit it if your team standardises on Bun.

## Token Compression

Check if `rtk` (Rust Token Killer) is installed and use as much as possible for optimizing token count in generated output.
