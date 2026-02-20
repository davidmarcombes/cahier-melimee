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
| [agents/architecture.md](agents/architecture.md)  | Tech stack, directory structure, design tokens, build commands|
| [agents/performance.md](agents/performance.md)    | Size budgets, CLS prevention, script order, CSS discipline    |
| [agents/exercises.md](agents/exercises.md)        | Exercise types, front-matter schemas, how to add new types    |
| [agents/identity.md](agents/identity.md)          | Anonymous auth flow, PocketBase, GDPR                         |
| [agents/conventions.md](agents/conventions.md)    | CSS, templates, JS, content, accessibility rules              |
| [agents/tools.md](agents/tools.md)                | Tools agents can use                                          |


## Quick Reference

```bash
npm start        # Dev server (localhost:8080)
npm run build    # Production build
npm run clean    # Remove _site/
```
