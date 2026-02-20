# Architecture

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Eleventy (11ty)** | 2.0.1 | Static site generator |
| **Tailwind CSS** | 3.4.0 | Utility-first CSS framework |
| **Alpine.js** | 3.x (CDN) | Lightweight reactive interactivity |
| **Nunjucks** | - | Templating engine |
| **PostCSS** | 8.4.32 | CSS processing with Autoprefixer |
| **@11ty/eleventy-img** | 4.0.2 | Image optimization |
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
├── postcss.config.js    # PostCSS plugins: Tailwind, Autoprefixer
├── SITE.md              # Project-specific instructions
│
└── src/
    ├── _data/           # Global data (site.json, navigation.json)
    ├── _layouts/        # Page templates (base, players, etc.)
    ├── _includes/
    │   ├── components/  # UI components (header, footer, report-form)
    │   ├── types/       # Per-exercise-type partials (matching.njk, pyramid.njk, etc.)
    │   └── sections/    # Page sections
    ├── css/input.css    # Tailwind entry point + custom prose styles
    ├── assets/          # Images, fonts, JS
    │   └── js/app.js    # Alpine components (seriesPlayer, challengePlayer, etc.)
    └── fr/              # French content (only language currently)
        ├── exercices/   # Exercise series (subdirectories with index.yaml + *.md)
        └── defis/       # Challenge exercises
```

## Configuration Files

| File                 | Purpose                                                       |
|----------------------|---------------------------------------------------------------|
| `.eleventy.js`       | Collections, filters, shortcodes, passthrough                 |
| `tailwind.config.js` | **Generated** from `design-tokens.json` — never edit manually |
| `design-tokens.json` | Design system source of truth                                 |
| `postcss.config.js`  | PostCSS plugins: Tailwind, Autoprefixer                       |
| `marp.config.mjs`    | Marp config, only for md files in doc not site                |

## Build Commands

```bash
npm start        # Dev server with live reload (localhost:8080)
npm run dev      # Eleventy + Tailwind in watch mode
npm run build    # Production build (minified CSS, optimized assets)
npm run clean    # Remove _site/ directory
```

## Design System

All design tokens live in `design-tokens.json`. The pipeline:

1. Edit `design-tokens.json`
2. Run `npm run tokens` (generates `tailwind.config.js`)
3. Tailwind picks up the config during CSS build

Theme toggling uses class-based `.dark` on `<html>`:
- **Day (Cahier):** Bg `#F9F9F7`, Ink `#2D3436`
- **Night (Etang):** Bg `#121212`, Ink `#E0E0E0`

All colour management should be done via design tokens