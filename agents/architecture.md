# Architecture

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Eleventy (11ty)** | ^3.1.2 | Static site generator |
| **Tailwind CSS** | ^3.4.0 | Utility-first CSS framework |
| **Alpine.js** | 3.x (CDN) | Lightweight reactive interactivity |
| **Nunjucks** | - | Templating engine |
| **PostCSS** | ^8.4.32 | CSS processing with Autoprefixer |
| **@11ty/eleventy-img** | ^4.0.2 | Image optimization |
| **html-validate** | ^10.9.0 | HTML validation (post-build) |
| **vitest** | ^4.1.0 | Unit test runner (generators, Alpine logic) |
| **Playwright** | ^1.58.2 | E2E browser tests against built `_site/` |
| **html-minifier-terser** | ^7.1.2 | HTML minification in production |
| **PocketBase** | Latest | Backend for user progress and auth |

## The 1000/10/3 Rule

1. **Content (1000s of .md):** Pure data. Front-matter defines logic; Markdown defines the story.
2. **Layouts (10s of .njk):** Visual representations (grids, pyramids, matching cards).
3. **Engines (2-3 Alpine components):** Centralized brains that handle validation and state.

## Directory Structure

```
project-root/
├── agents/              # AI assistant documentation (this folder)
├── design-tokens.json   # Design system source of truth
├── tailwind.config.js   # Generated from design tokens — do not edit
├── .eleventy.js         # Eleventy config: collections, filters, shortcodes
├── .htmlvalidate.json   # html-validate config (Alpine.js attrs, disabled rules)
├── postcss.config.js    # PostCSS plugins: Tailwind, Autoprefixer
├── vitest.config.js     # Vitest unit test config
├── playwright.config.js # Playwright E2E test config (baseURL, webServer)
├── marp.config.mjs      # Marp config, only for md files in doc not site
├── scripts/
│   └── e2e-server.js    # Static HTTP server for E2E tests (serves _site/ at :4173)
├── tests/
│   ├── unit/            # Vitest unit tests (generators, algorithms)
│   └── e2e/             # Playwright E2E tests
│
└── src/
    ├── _data/           # Global data (site.json, navigation.json)
    ├── _layouts/        # Page templates (base, players, etc.)
    ├── _includes/
    │   ├── components/  # UI components (header, footer, report-form)
    │   ├── types/       # Per-exercise-type partials (matching.njk, pyramid.njk, etc.)
    │   ├── svg/         # SVG snippets for exercises (shapes, grids, symmetry)
    │   └── sections/    # Page sections
    ├── _pages/          # Infrastructure templates (pagination, CSV export)
    │   ├── series-pages.njk # Pagination template for exercices + applications
    │   ├── defi-pages.njk   # Pagination template for défis → layout: timed-player
    │   └── data-csv.njk     # Generates /fr/exercices/data.csv for the listing page
    ├── css/input.css    # Tailwind entry point + custom prose styles + design-token CSS vars
    ├── assets/          # Images, fonts, JS
    │   └── js/
    │       ├── app.js           # Alpine components (seriesPlayer, themeToggle, localStore, exercises store)
    │       ├── svg.js           # SVG generation helpers (embedSvg, slicedPieSvg, clockSvg, partagerSvg, etc.)
    │       ├── generators.js    # Exercise generators (single source: Node.js + browser)
    │       └── timed-player.js  # Alpine component for timed challenges (timedPlayer)
    └── fr/              # French content — ONLY .md/.yaml files (no templates)
        ├── exercices/   # Static exercises: many hand-written .md per series
        │   ├── exercices.json   # Data cascade (tags, permalink: false)
        │   └── {level}/maths/   # CP, CE1, CE2, CM1, CM2
        ├── applications/ # Generated exercises: .md with generator + repeat
        │   ├── applications.json # Data cascade
        │   └── {level}/maths/   # Same nested structure
        └── defis/        # Timed challenges: generated, uses timed-player layout
            └── {level}/maths/   # Same nested structure
```

## Configuration Files

| File                 | Purpose                                                       |
|----------------------|---------------------------------------------------------------|
| `.eleventy.js`       | Collections, filters, shortcodes, HTML minification, passthrough |
| `tailwind.config.js` | **Generated** from `design-tokens.json` — never edit manually |
| `design-tokens.json` | Design system source of truth                                 |
| `postcss.config.js`  | PostCSS plugins: Tailwind, Autoprefixer                       |
| `.htmlvalidate.json` | HTML validation rules; Alpine.js attributes allowed globally  |
| `vitest.config.js`   | Vitest unit test config (happy-dom environment)               |
| `playwright.config.js` | Playwright E2E config — `baseURL: http://localhost:4173`, auto-starts `scripts/e2e-server.js` |
| `bunfig.toml`        | Bun runtime config; documents Bun usage (optional, npm is primary) |
| `marp.config.mjs`    | Marp config, only for md files in doc not site                |

## Build Commands

```bash
npm start             # Dev server with live reload (localhost:8080)
npm run dev           # Eleventy + Tailwind in watch mode
bun run dev:bun       # Same, using Bun runtime (optional faster alternative)
npm run build         # Production: test → validate:exercises → tokens → eleventy → build:css → validate:html
npm run clean         # Remove _site/ directory
npm run generate:report  # Generate exercises-report.csv — fast lookup of any exercise/app
npm run validate:html # Run html-validate on all built HTML files
npm run stats:svg     # Analyze SVG files: count, size, CSS var usage
npm run test          # Run vitest unit test suite
npm run test:e2e      # Run Playwright E2E tests (requires built _site/)
npm run build:e2e     # Build _site/ for E2E (tokens → eleventy → css, no validate)
npm run help          # Print all available npm scripts with descriptions
```

### Build pipeline order

The `build` script runs these steps sequentially:

1. `npm run test` — run vitest unit suite
2. `npm run validate:exercises` — check exercise YAML schemas
3. `npm run generate:tokens` — regenerate `tailwind.config.js` from `design-tokens.json`
4. `eleventy` — build HTML (includes HTML minification transform)
5. `npm run build:css` — build and minify Tailwind CSS
6. `npm run validate:html` — run html-validate on `_site/**/*.html`

### Exercise lookup via report

`exercises-report.csv` is generated by `npm run generate:report` and contains one row per exercise with columns: `id`, `path`, `type`, `title`, `subtopic`, `difficulty`, `generator`. To find an exercise quickly by id or any other field:

```bash
npm run generate:report  # regenerate (needed after adding/editing exercises)
grep "a3e7c501" exercises-report.csv
grep "click-blocks" exercises-report.csv
```

Use this instead of searching source files when you already know the id or want to find all exercises of a given type.

## Design System

All design tokens live in `design-tokens.json`. The pipeline:

1. Edit `design-tokens.json`
2. Run `npm run generate:tokens` (generates `tailwind.config.js` and the CSS var block in `input.css`)
3. Tailwind picks up the config during CSS build

### CSS Custom Properties

The token generator (`scripts/generate-tailwind-from-tokens.js`) uses a `varAliases` map to produce short CSS variable names. The generated vars are written into the `/* BEGIN:design-tokens */` ... `/* END:design-tokens */` block in `src/css/input.css`.

Key aliases:

| Token path | CSS var | Light value | Dark value |
|------------|---------|-------------|------------|
| `primary-500` | `--p` | `#2a85bf` | `#4da7d9` |
| `accent-500` | `--a` | `#bf812a` | `#e0a84c` |
| `figure-red` | `--red` | `#c94040` | `#e06868` |
| `figure-green` | `--green` | `#3a9a55` | `#5cc478` |
| `figure-purple` | `--purple` | `#7040c9` | `#9a70e0` |
| `figure-pink` | `--pink` | `#c94080` | `#e068a8` |
| `figure-orange` | `--orange` | `#c97040` | `#e09058` |
| `surface-default` | `--sf` | `#ffffff` | `#0f172a` |
| `surface-chrome` | `--sc` | `#f1f5f9` | `#1e293b` |
| `surface-subtle` | `--ss` | `#f8fafc` | `#1e293b` |
| `content-default` | `--ct` | `#1e293b` | `#f8fafc` |
| `content-subtle` | `--cs` | `#475569` | `#94a3b8` |

### Figure colors

The `figure` group in `design-tokens.json` provides five named colors for geometric figures and diagrams: `red`, `green`, `purple`, `pink`, `orange`. Each has `light`/`dark` variants. The `varAliases` map in `generate-tailwind-from-tokens.js` maps `figure-red` to `--red`, etc.

In SVG files, use the CSS var with a hardcoded fallback for standalone preview:
```
fill="var(--green, #3a9a55)"
stroke="var(--cs, #475569)"
```

### Theme toggling

Class-based `.dark` on `<html>`:
- **Day (Cahier):** Bg `#F9F9F7`, Ink `#2D3436`
- **Night (Etang):** Bg `#121212`, Ink `#E0E0E0`

All colour management should be done via design tokens.
