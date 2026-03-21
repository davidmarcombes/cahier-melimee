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


## Quick Reference

```bash
npm start            # Dev server (localhost:8080)
npm run build        # Production build (test + validate + css + html-validate)
npm run clean        # Remove _site/
npm run report       # Generate exercises-report.csv
npm run help         # List all available npm scripts
npm test             # Unit tests (vitest)
npm run build:e2e    # Build _site/ for E2E (fast, no validation)
npm run test:e2e     # E2E tests (Playwright, 40 tests, 27 exercise types)
```
