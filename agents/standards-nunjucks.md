# Nunjucks & 11ty Coding Standards

## 1. File Organization
- **Layouts:** Use for page shells (e.g., `base.njk`, `players`). Located in `src/_layouts/`.
- **Includes:** Use for static partials, components, sections, and SVGs. Located in `src/_includes/`.
  - UI components: `src/_includes/components/`
  - Exercise type blocks: `src/_includes/types/`
  - Page sections: `src/_includes/sections/`
  - SVG snippets: `src/_includes/svg/`
- **Shortcodes:** Use for complex, reusable UI logic (e.g., `{% image ... %}` for automatic AVIF/WebP optimization).

## 2. Naming Conventions & Accessibility
- Filenames: `kebab-case.njk`.
- Variables: `camelCase` (consistent with JS).
- Language: French only for now. Use `{{ lang }}`.
- Attributes: 
  - All `<button>` elements **must** have `type="button"` to prevent unintended form submission.
  - All `<th>` elements **must** have `scope="col"` (or `row`) for screen reader access.
- Navigation: Distinguish multiple `<nav>` elements via distinct `aria-label` attributes.

## 3. Logic Separation
- **No Complex Logic:** If a calculation takes more than one line, move it to an Eleventy Filter in `.eleventy.js`.
- **Default Values:** Always provide defaults for optional frontmatter.
  - *Good:* `{{ title | default('Cahier de Melimee') }}`

## 4. Build-Time Conditional Includes (Critical for Performance)
- Exercise pages must target ≤ 18 KB HTML payload. They MUST ONLY ship HTML for the types they actually use.
- Utilize the `extractTypes` filter to include type blocks conditionally.
  ```njk
  {% set usedTypes = exercises | extractTypes %}
  {% if 'matching' in usedTypes %}{% include "types/matching.njk" %}{% endif %}
  ```
- NEVER add exercise type blocks directly to a layout; always isolate them in `src/_includes/types/` and include conditionally.