# AGENTS.md

AI assistant documentation for **Le Cahier de Melimee** — an elementary school exercise platform.

## Core Principles

- **Open Source & Sovereign** — EUPL v1.2 (Copyleft)
- **Minimal footprint** — pages must be minimal in size
- **High performance** — focus on content and features
- **French only** for now

## Documentation Index

| File                                              | Contents                                                      |
|---------------------------------------------------|---------------------------------------------------------------|
| [agents/architecture.md](agents/architecture.md)  | Tech stack, directory structure, design tokens, build commands |
| [agents/performance.md](agents/performance.md)    | Size budgets, CLS prevention, script order, CSS discipline    |
| [agents/exercises.md](agents/exercises.md)        | Exercise types, front-matter schemas, how to add new types    |
| [agents/identity.md](agents/identity.md)          | Anonymous auth flow, PocketBase, GDPR                         |
| [agents/conventions.md](agents/conventions.md)    | CSS, templates, JS, content, accessibility rules              |
| [agents/tools.md](agents/tools.md)                | npm scripts, dev tools, agent tooling                         |
| [agents/content.md](agents/content.md)            | Adding exercises: workflow, type reference, Vergnaud classes  |
| [agents/11ty.md](agents/11ty.md)                  | Eleventy build pipeline, filters, transforms                  |
| [agents/svg.md](agents/svg.md)                    | SVG snippet rules, generation helpers, naming conventions     |
| [docs/classification.md](docs/classification.md) | Skill classification (S1.1.1, I1, D1) and pedagogical intents |
| [docs/js_roadmap.md](docs/js_roadmap.md)          | JS code review findings and maintenance TODO list             |


## Quick Reference

```bash
npm start                  # Dev server (localhost:8080)
npm run build              # Production build (test + validate + css + html-validate)
npm run clean              # Remove _site/
npm run help               # List all available npm scripts
npm test                   # Unit tests (vitest)
npm run build:e2e          # Build _site/ for E2E (fast, no validation)
npm run test:e2e           # E2E tests (Playwright, ~555 tests: player, types smoke, layout-health all pages)
npm run validate:exercises # Validate exercise YAML front-matter
npm run human:sync         # Dry-run: show new/changed/removed exercise files vs human-validate.csv
npm run human:sync:write   # Apply: update human-validate.csv (add / invalidate / remove)
npm run human:validations  # Display human-validate.csv as a table
npm run list-series        # List all series (--level --type --cat --missing)
npm run show-type          # Show schema + template for any exercise type
```
