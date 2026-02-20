# Coding Conventions

## CSS

- Utility-first: use Tailwind classes from design tokens
- Custom components in `src/css/input.css` using `@layer components`
- Custom prose styles replace `@tailwindcss/typography` (~20 rules vs 14 KB plugin)
- Dark mode: class-based with `.dark` on `<html>`
- Responsive: mobile-first with Tailwind breakpoints (sm, md, lg)
- No hardcoded colors/fonts — always use token values

## Templates (Nunjucks)

- Layout inheritance via `layout` in front-matter
- Reusable components in `_includes/components/`
- Exercise type partials in `_includes/types/` (conditionally included at build time)
- Data access: `{{ site.title }}` for global, `{{ title }}` for page
- Language: French only for now. Use `{{ lang }}` variable.

## JavaScript (Alpine.js)

- Declarative: behavior defined in HTML with `x-data`, `x-show`, `x-for`, etc.
- Two main components in `app.js`: `seriesPlayer()` and `challengePlayer()`
- Component-level state only, no global state management
- Dark mode toggle stored in `localStorage`

## Content (Markdown)

- Exercise series: folder with `index.yaml` + numbered `.md` files
- Front-matter defines type, title, answer, and type-specific fields
- Markdown body = instructions shown to the student
- French only (`lang: fr`, `locale: fr-FR`)

## Images

- Use `{% image %}` shortcode for automatic AVIF/WebP optimization
- Source in `src/assets/images/`
- Alt text always required
- Lazy loading by default, `eager` for above-fold (logo)

## General Rules

1. Read existing code before modifying
2. Keep it simple — no over-engineering
3. Test with `npm run build` before committing
4. Respect design tokens — never hardcode
5. Ensure dark mode works for all changes
6. New exercise types get their own partial in `_includes/types/`

## Accessibility

- Semantic HTML5 (`header`, `nav`, `main`, `article`)
- Single `<h1>` per page, logical heading hierarchy
- Alt text on all images
- ARIA labels on interactive elements without visible text
- Keyboard navigation and visible focus states
- WCAG AA color contrast minimum
- `lang` attribute on `<html>`
