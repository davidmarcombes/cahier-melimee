# AGENTS.md - Project Documentation

This file provides guidance for AI assistants working on this codebase.

This project is an elementary school homework site, it provides a range of exercices for pupils to revise and train.

The design is opiniated:
- Open Source and Sovereign
- Minimal running costs. Pages must be minimal in size;
- High performance. Focus on content and features.


**Project-specific instructions and content details are in `SITE.md`** - always read that file first to understand the specific site you're working on.

## 🐸 The "Sovereign" Low-Footprint Architecture (1000/10/3 Rule)
To maintain high performance and low maintenance, follow this hierarchy:
1.  **Content (1000s of .md):** Pure data. Front-matter defines the logic; Markdown defines the story.
2.  **Layouts (10s of .njk):** Visual representations (Pizzas, Lily Pads, Matrices, Graphs).
3.  **Engines (2-3 Alpine components):** The centralized "Brains" that handle validation and state.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Eleventy (11ty)** | 2.0.1 | Static site generator |
| **Tailwind CSS** | 3.4.0 | Utility-first CSS framework |
| **Alpine.js** | 3.x (CDN) | Lightweight reactive interactivity |
| **Nunjucks** | - | Templating engine |
| **PostCSS** | 8.4.32 | CSS processing with Autoprefixer |
| **@11ty/eleventy-img** | 4.0.2 | Image optimization |
| **PocketBase** | Latest | Backend for User Progress and Auth |
| **SVG Filters** | - | Hand-drawn "Brouillon" aesthetic via `#ink-filter` |

## Licence

**Licence :** EUPL v1.2 (European Union Public Licence). Tout code généré doit respecter le partage à l'identique (Copyleft).

## Design System: "Brouillon" & Day/Night Mode

**All design tokens are defined in `design-tokens.json`** at the project root.

This file contains:
- Color palette with semantic naming and shade scales
- Typography definitions (font families, sizes, weights, line heights)
- Spacing scale and sizing values
- Animation/transition definitions
- Any other design values

**The `tailwind.config.js` file is generated from `design-tokens.json`** and should not be edited directly. When making design changes:
1. Update `design-tokens.json`
2. Regenerate Tailwind config
3. Rebuild CSS

- **Theme Toggling:** Class-based approach with `.dark` class on `<html>`.
- **Day (Cahier):** Bg: `#F9F9F7` (Paper feel), Ink: `#2D3436`.
- **Night (Étang):** Bg: `#121212` (Water/Slate feel), Ink: `#E0E0E0`.
- **Mascot:** Salto the Frog (Primary Accent Color).

### Design Tokens Structure

```json
{
  "colors": {
    "primary": {
      "50": "#...",
      "500": "#...",
      "900": "#..."
    }
  },
  "typography": {
    "fonts": {
      "sans": ["Font Name", "fallback"],
      "display": ["Font Name", "fallback"]
    },
    "sizes": { ... }
  },
  "spacing": { ... },
  "animations": { ... }
}
```

## Project Architecture

### Standard Directory Structure

```
project-root/
├── design-tokens.json     # Design system source of truth
├── tailwind.config.js     # Generated from design tokens
├── .eleventy.js           # Eleventy configuration
├── postcss.config.js      # PostCSS configuration
├── package.json           # Dependencies and scripts
├── CLAUDE.md              # This file - generic instructions
├── SITE.md                # Project-specific instructions
│
└── src/
    ├── _data/             # Global data files
    │   ├── site.json      # Site metadata, URLs, social links
    │   └── navigation.json # Menu structure (keyed by language)
    │
    ├── _layouts/          # Page templates
    │   ├── base.njk       # Base HTML structure (SEO, header, footer)
    │   ├── home.njk       # Homepage layout
    │   ├── page.njk       # Standard page layout
    │   ├── post.njk       # Blog post layout
    │   └── blog.njk       # Blog listing layout
    │
    ├── _includes/         # Reusable components
    │   ├── components/    # UI components (buttons, cards, forms)
    │   ├── sections/      # Page sections (hero, features, testimonials)
    │   └── partials/      # Header, footer, navigation
    │
    ├── css/
    │   └── input.css      # Tailwind entry point + custom components
    │
    ├── assets/            # Static files
    │   ├── images/        # Image files
    │   ├── fonts/         # Web font files (if self-hosting)
    │   └── favicon.png    # Favicon source
    │
    ├── en/                # English content (default language)
    │   ├── en.json        # Language config: { "lang": "en", "locale": "en-US" }
    │   ├── index.md       # Homepage content
    │   ├── posts/         # Blog posts: YYYY-MM-DD-slug.md
    │   └── *.md           # Other pages (about, services, contact, etc.)
    │
    └── fr/                # French content (additional language)
        ├── fr.json        # Language config: { "lang": "fr", "locale": "fr-FR" }
        ├── index.md       # Homepage content (French)
        ├── posts/         # Blog posts (French)
        └── *.md           # Other pages (French equivalents)

_site/                     # Build output (git ignored)
```

### Default Content Structure

Every site should follow this organization:

**Pages** - Top-level content files:
- `index.md` - Homepage
- `about.md` - About page
- `services.md` - Services/offerings page
- `contact.md` - Contact page
- `blog.md` or `posts.md` - Blog listing page

**Blog Posts** - In `/posts/` subdirectory:
- Filename format: `YYYY-MM-DD-slug.md` (e.g., `2024-03-15-new-product-launch.md`)
- Auto-collected by date
- Tagged for categorization

**Data Files** - In `_data/`:
- `site.json` - Site-wide metadata, company info, contact details
- `navigation.json` - Menu structure
- `team.json` - Team members (optional)
- `testimonials.json` - Customer testimonials (optional)

## 🧠 Exercise Engines & Validation Logic

### 1. Single-Answer Engine (`engine-single.njk`)
Used for exercises where the `answer` in front-matter is a single string or number.
- **Logic:** `userInput.trim().toLowerCase() == target.toLowerCase()`.
- **Use Cases:** Simple input, Multiple choice, Clickable SVG hotspots (e.g., Graph bars).

### 2. Multi-Answer Engine (`engine-multi.njk`)
Used for matrices, vertical operations, or complex patterns.
- **Logic:** `JSON.stringify(userInputs) == JSON.stringify(target)`.
- **Target Data:** An Array or Object defined in Markdown front-matter.

## 🔐 Sovereign Identity Flow
The onboarding must be purely visual and anonymous. We do not collect emails, real names, or ages.

### 1. Identity Selection (The Triple-Name)
The user chooses from 4 pre-generated identities.

Each identity is a 3-item name (e.g., petit-renard-roux, grande-chouette-bleue).

Gender Balance: Offer 2 masculine-coded and 2 feminine-coded identities using distinct animals and colors to avoid gender bootstrapping.

### 2. Unicity & Recognition (The Sticker)
To ensure the username is unique across the platform, the system automatically assigns a sticker to the chosen identity.

The user's full "ID" is the Triple-Name + Sticker ID.

The user is instructed: "Remember your animal and your sticker!".

### 3. The Visual Password (The Key)
The user sets a password by choosing a sequence of 3 images.

Entropy: Use a set of at least 8-10 icons per step to ensure sufficient combinations.

Storage: The sequence is stored as a hashed string in PocketBase.

### 4. Personal Space (The Permanent Link)
Upon completion, the user is given a unique URL for their space.

URL Format: https://cahier-melimee.fr/[triple-name]-[sticker-id].

This link acts as their "front door" for future visits.


⚖️ GDPR & Privacy Compliance
Data Minimization: We store only progress, scores, and the visual credentials.

Zero PII: No names, IPs, or contact info are linked to the identity.

Security: This is "safe enough" for a platform where the only risk is losing access to a digital sticker book or math scores.

## 📝 Front-Matter Schema for Exercises

Every `.md` file in `src/fr/exercises/` must follow this contract:

```yaml
---
layout: "layout-name"     # e.g., "lily-pads", "fraction-pizza"
title: "Nom de l'exercice"
engine: "single"          # "single" or "multi"
answer: "15"              # Target value (String/Number for single, Array for multi)
difficulty: "CP"          # Grade level
subject: "maths"          # maths, logic, french
lang: "fr"                # Only French is supported currently
locale: "fr-FR"           # Required for 11ty localized data
---

## 🎨 Design System: "Brouillon" & Day/Night Mode

## Multilingual Support

This stack supports multiple languages with parallel content directories.
*IMPORTANT* The first version only suppots **FRENCH**

### Language Structure

Each language has its own directory under `src/`:
- `src/en/` - English (default language)
- `src/fr/` - French
- `src/de/` - German
- etc.

### Language Configuration

Each language directory contains a `{lang}.json` file:

```json
{
  "lang": "en",
  "locale": "en-US"
}
```

This makes `lang` and `locale` variables available to all pages in that directory.

### Language-Aware Templates

Templates reference the `{{ lang }}` variable for language-specific rendering:

```html
<html lang="{{ lang }}">
  <link rel="alternate" hreflang="en" href="{{ site.url }}/en{{ page.url }}">
  <link rel="alternate" hreflang="fr" href="{{ site.url }}/fr{{ page.url }}">
</html>
```

### Navigation Menus

Navigation is keyed by language in `_data/navigation.json`:

```json
{
  "en": [
    { "text": "Home", "url": "/en/" },
    { "text": "About", "url": "/en/about/" }
  ],
  "fr": [
    { "text": "Accueil", "url": "/fr/" },
    { "text": "À propos", "url": "/fr/about/" }
  ]
}
```

Access in templates: `{% for item in navigation[lang] %}`

### Content Parity

When adding content:
1. Create the page in the primary language directory
2. Create equivalent pages in all other language directories
3. Keep URLs parallel: `/en/about/` and `/fr/about/`
4. Update navigation in all languages
5. Ensure hreflang alternates link correctly

### Language Switcher

Implement a language switcher in the header/navigation that:
- Detects current language from `{{ lang }}`
- Links to equivalent page in other languages
- Uses language codes or flags for UI

## Configuration Files

| File | Purpose |
|------|---------|
| `.eleventy.js` | Eleventy config: collections, filters, shortcodes, passthrough |
| `tailwind.config.js` | **Generated from design-tokens.json** - do not edit manually |
| `design-tokens.json` | Design system source of truth |
| `postcss.config.js` | PostCSS plugins: Tailwind, Autoprefixer |
| `package.json` | Dependencies and build scripts |
| `SITE.md` | **Project-specific instructions** |

## Build Commands

```bash
npm start        # Start development server with live reload
npm run dev      # Run Eleventy + Tailwind in watch mode
npm run build    # Production build (minified CSS, optimized assets)
npm run clean    # Remove _site/ directory
```

Development server runs at `http://localhost:8080` with live reload.

## Coding Conventions

### CSS
- **Utility-first approach**: Use Tailwind classes directly in templates
- **Custom components**: Define in `src/css/input.css` using `@layer components`
- **Class naming**: kebab-case (`.btn-primary`, `.card-header`)
- **Design tokens**: All values come from `design-tokens.json` → Tailwind config
- **Dark mode**: Class-based approach with `.dark` class on `<html>`
- **Responsive design**: Mobile-first with Tailwind breakpoints (sm, md, lg, xl, 2xl)

### Templates (Nunjucks)
- **Layout inheritance**: Pages extend base layouts via `layout` frontmatter
- **Reusable components**: Store in `_includes/components/` and import with `{% include %}`
- **Data access**: Use `{{ site.title }}` for global data, `{{ title }}` for page data
- **Language awareness**: Use `{{ lang }}` and `{{ locale }}` for multilingual features
- **Filters**: Available Eleventy filters listed in `.eleventy.js`

### Content (Markdown)
- **Frontmatter**: YAML at top of each `.md` file for metadata
- **Required fields**: `layout`, `title`, `lang`, `locale`
- **Optional fields**: `description`, `date`, `tags`, `permalink`
- **Content sections**: Can be defined in frontmatter for component-based layouts

Example frontmatter:
```yaml
---
layout: page
title: About Us
lang: en
locale: en-US
description: Learn about our company and mission
---
```

### Images
- **Shortcode usage**: Use `{% image %}` for automatic optimization
- **Output formats**: AVIF, WebP with fallbacks
- **Responsive sizes**: Multiple widths generated automatically
- **Loading strategy**: Lazy loading by default
- **Source location**: `src/assets/images/`
- **Alt text**: Always required for accessibility

### JavaScript (Alpine.js)
- **Keep it minimal**: Use for interactive UI components only
- **Declarative syntax**: Define behavior in HTML with `x-data`, `x-show`, etc.
- **State management**: Simple component-level state, avoid complex global state
- **Common patterns**: Dropdowns, modals, tabs, mobile menus, accordions, language switchers
- **Dark mode toggle**: Stored in localStorage, class applied to `<html>`

## Rules for Updates

### General Principles
1. **Read SITE.md first** - Project-specific instructions override these generic guidelines
2. **Read before modifying** - Always review existing code to understand patterns
3. **Maintain consistency** - Follow established conventions throughout the codebase
4. **Keep it simple** - Avoid over-engineering; make only necessary changes
5. **Test locally** - Run `npm run dev` to verify changes before committing
6. **Preserve functionality** - Don't break existing features when adding new ones
7. **Respect design tokens** - Never hardcode colors or fonts; use Tailwind utilities

### Design System Updates
1. Edit `design-tokens.json` only
2. Regenerate `tailwind.config.js` from tokens
3. Rebuild CSS with `npm run dev`
4. Test changes across all pages and breakpoints
5. Verify dark mode compatibility if applicable

### Content Updates
1. Edit Markdown files in appropriate language directories
2. Maintain content parity across all languages
3. Use consistent frontmatter across similar content types
4. Follow existing naming conventions for files
5. Update navigation menus if adding new pages

### Styling Updates
1. **Prefer utilities**: Use Tailwind classes from design tokens
2. **Component layer**: Add reusable styles to `src/css/input.css` under `@layer components`
3. **Consistency**: Maintain visual consistency with existing components
4. **Dark mode**: Ensure all changes work in both light and dark modes
5. **Responsive**: Test changes at all breakpoints (mobile, tablet, desktop)
6. **No hardcoding**: Use design token values, not arbitrary colors/sizes

### Layout/Template Updates
1. Modify templates in `src/_layouts/` and `src/_includes/`
2. Base layout contains site-wide elements (header, footer, SEO tags)
3. Use Nunjucks blocks and includes for modular, reusable code
4. Keep Alpine.js usage declarative and minimal
5. Preserve accessibility attributes (ARIA labels, semantic HTML)
6. Maintain language-aware rendering for multilingual sites

### Adding New Pages
1. Create `.md` file in appropriate language directory (e.g., `src/en/new-page.md`)
2. Set required frontmatter: `layout`, `title`, `lang`, `locale`
3. Add navigation entry in `src/_data/navigation.json` for each language
4. Create equivalent pages in all other language directories
5. Ensure hreflang alternates are correct
6. Test page renders correctly and navigation works

### Adding New Languages
1. Create new language directory: `src/{lang}/`
2. Add `{lang}.json` with `lang` and `locale` values
3. Copy all pages from existing language as templates
4. Translate all content
5. Add navigation menu to `_data/navigation.json`
6. Update base layout hreflang alternates
7. Add language to language switcher component

### Image Guidelines
1. Place source images in `src/assets/images/`
2. Use `{% image %}` shortcode for content images (automatic optimization)
3. Direct references for hero/background images if needed for CSS control
4. Use descriptive filenames: `team-photo-2024.jpg` not `img001.jpg`
5. Include alt text for accessibility
6. Optimize large images before adding to repository

### Adding New Components
1. Create include file in `src/_includes/components/`
2. Use Tailwind utilities from design tokens for styling
3. Add Alpine.js for interactivity only if needed
4. Make components reusable with parameters
5. Document component usage in SITE.md if complex
6. Test component in isolation and in context

## SEO Best Practices

- Metadata defined in page frontmatter and `_data/site.json`
- Open Graph and Twitter Card tags in base layout
- Canonical URLs set per page
- Hreflang alternates for all language versions
- XML sitemap generated at `/sitemap.xml`
- Robots.txt configured for crawlers
- Structured data (JSON-LD) for rich results
- Semantic HTML5 elements throughout
- Proper heading hierarchy on all pages

## Performance Optimization

- CSS purged of unused classes in production build
- HTML minification (whitespace, comments removed)
- Images optimized to modern formats (AVIF, WebP)
- Fonts preloaded or loaded asynchronously with `font-display: swap`
- Minimal JavaScript footprint (Alpine.js CDN, ~15KB)
- Static HTML for fast initial page loads and SEO
- Critical CSS inlined in `<head>` for above-the-fold content

## Accessibility Checklist

- Semantic HTML5 elements (`<header>`, `<nav>`, `<main>`, `<article>`, etc.)
- Proper heading hierarchy (single `<h1>`, logical h2-h6 structure)
- Alt text for all images (descriptive, not redundant)
- ARIA labels for interactive elements without visible text
- Keyboard navigation support (focus states, tab order)
- Sufficient color contrast ratios (WCAG AA minimum)
- Focus states visible on all interactive elements
- Skip-to-content link for keyboard users
- Form labels properly associated with inputs
- Language attribute on `<html>` tag

## Deployment

The site builds to `_site/` as static HTML/CSS/JS/assets.

**Compatible with:**
- Netlify, Vercel, Cloudflare Pages
- GitHub Pages, GitLab Pages
- Traditional web servers (Apache, Nginx)
- Any static hosting service

**Build output includes:**
- Minified CSS with unused classes removed
- Minified HTML
- Optimized images with modern formats
- All static assets copied to `_site/`

**Environment variables** (if needed):
- Document any required variables in SITE.md
- Use `.env` file locally (git ignored)
- Configure in hosting platform settings

## Common Tasks

### Add a blog post
1. Create `YYYY-MM-DD-post-title.md` in `src/{lang}/posts/`
2. Add frontmatter: `layout: post`, `title`, `date`, `tags`, `lang`, `locale`
3. Write content in Markdown
4. Create equivalent post in other languages
5. Post appears automatically in blog listing

### Update site-wide data
1. Edit `src/_data/site.json` for global settings
2. Edit `src/_data/navigation.json` for menu structure
3. Changes apply to all pages immediately
4. Restart dev server to see changes

### Modify design system
1. Update `design-tokens.json` with new colors/fonts/spacing
2. Regenerate `tailwind.config.js`
3. Rebuild CSS: `npm run dev`
4. Update any hardcoded values in templates to use new tokens

### Add new section to homepage
1. Define content in page frontmatter or separate data file
2. Create include template in `_includes/sections/`
3. Add include to homepage layout or content
4. Style with Tailwind utilities from design tokens
5. Test responsiveness and dark mode

### Update navigation
1. Edit `src/_data/navigation.json`
2. Update all language keys with new menu items
3. Ensure URLs are correct for each language
4. Test menu renders correctly on all pages

## Troubleshooting

**CSS not updating:**
- Ensure Tailwind is watching files: check `tailwind.config.js` content paths
- Verify design tokens are properly formatted JSON
- Clear browser cache or use hard reload
- Restart dev server
- Check for syntax errors in `design-tokens.json`

**Images not optimizing:**
- Verify image path is correct in shortcode
- Check image exists in `src/assets/images/`
- Review `.eleventy.js` image plugin configuration
- Ensure image file is a supported format (JPG, PNG, WebP)

**Layout not applying:**
- Check frontmatter `layout` value matches filename in `_layouts/`
- Ensure layout file has proper Nunjucks syntax
- Verify layout chain (child → parent → base)
- Check for typos in layout references

**Build fails:**
- Read error message carefully for specific issue
- Check for syntax errors in templates, config files, or design tokens
- Verify all dependencies installed: `npm install`
- Try clean build: `npm run clean && npm run build`
- Check `design-tokens.json` is valid JSON

**Language switcher not working:**
- Verify all language directories have matching page structure
- Check hreflang alternates in base layout
- Ensure URLs are parallel across languages
- Confirm `navigation.json` has all languages defined

**Dark mode not toggling:**
- Check inline script in `base.njk` runs before body
- Verify localStorage key is consistent
- Ensure `.dark` class variants are defined in Tailwind
- Test in different browsers (localStorage support)

## Project-Specific Notes

**See `SITE.md` for:**
- Client information and branding guidelines
- Specific content requirements
- Custom features or integrations
- Deployment instructions
- Environment variables
- Third-party service configurations
- Special build requirements
- Contact information for stakeholders

## Recommended Additions

Consider documenting these in SITE.md:
- **Content strategy**: Tone of voice, messaging guidelines
- **Brand assets**: Logo usage, color meanings, typography rules
- **Forms**: Contact form integration, email service setup
- **Analytics**: Google Analytics, tracking codes
- **Third-party integrations**: CRM, newsletter, chat widget
- **Custom collections**: If using specialized content types
- **Redirects**: Old URLs that need redirecting
- **Testing checklist**: Browser/device testing requirements