# Tailwind CSS Coding Standards

## 1. Tokens and Customization (CRITICAL)
- **NEVER edit `tailwind.config.js` manually.** It is generated automatically from `design-tokens.json`.
- All design tokens live in `design-tokens.json` to act as the single source of truth. After modifying, run `npm run generate:tokens`.
- Do NOT use "Magic Numbers" or arbitrary values (`[...]`) unless absolutely necessary.
- **NO Hardcoded Colors/Fonts:** ALWAYS use token values (e.g., CSS vars like `var(--p)` for primary-500, `var(--sf)` for surface-default). 

## 2. Cleanliness and Performance
- **NO Heavyweight Plugins:** Avoid plugins like `@tailwindcss/typography` which bloat the CSS footprint. Custom prose styles are defined explicitly in `src/css/input.css` instead.
- CSS Bundle size must stay under ≤ 30 KB minified.
- Avoid `@apply` in CSS files unless creating a base element override (like custom components in `src/css/input.css`).
- Use Alpine's native object syntax for logic-heavy class toggling (e.g., `:class="{ 'opacity-50': isDisabled }"`).

## 3. Class Ordering
- Use the **Prettier Plugin for Tailwind CSS** to automatically sort classes.
- Manual order if plugin is unavailable: 
  `Layout -> Spacing -> Typography -> Visuals -> Interaction -> Variants (hover/md:)`

## 4. Responsive & Theming
- Use a **Mobile-First** approach. Define base styles first, then apply breakpoints with `sm:`, `md:`, `lg:`.
- **Dark Mode:** Handled natively via class-based `.dark` on `<html>` (toggled by Alpine). Theme colours are inherently mapped in the CSS variables block of `input.css` (e.g., `#F9F9F7` vs `#121212` backgrounds).
- **SVG Colors:** SVG files should use CSS custom properties with hardcoded fallbacks to enable standalone browser previews.
  - *Example:* `fill="var(--green, #3a9a55)" stroke="var(--cs, #475569)"`