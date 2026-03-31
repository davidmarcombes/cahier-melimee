# Alpine.js Coding Standards

## 1. Initialization
- **The 5-Line Rule:** If `x-data` logic exceeds 5 lines, it MUST be moved to an external function in `src/assets/js/app.js` (e.g., `seriesPlayer()`, `challengePlayer()`) or a specifically dedicated `.js` file.
- **Standard Syntax:** Use the shorthand for events (`@click` instead of `x-on:click`) and bindings (`:class` instead of `x-bind:class`).

## 2. Component Structure
- Use `x-cloak` on any element that should be hidden on pageload to prevent layout shift. The base layout defines `[x-cloak] { display: none !important; }` so containers stay hidden until Alpine initializes.
- Always use `x-data` at the component root.
- **Escape JSON in Attributes:** When embedding JSON in single-quoted HTML attributes (e.g., `x-data='...(...)'`), escape apostrophes using `.replace(/'/g, '\\u0027')`.

## 3. State Management
- Prefer local component state via `x-data`.
- Avoid global state management. Use `localStorage` for offline progress via `localStore` (key: `melimee_v1`) and dark mode toggles (`themeToggle`).
- Data stores like `Alpine.store('exercises')` should be limited strictly to necessary global context.

## 4. Formatting
- Order of attributes:
  1. `x-data`
  2. `x-show` / `x-if`
  3. `x-cloak`
  4. Tailwind classes (`class="..."`)
  5. Bindings (`:id`, `:src`, `:class`)
  6. Events (`@click`)

## 5. HTML Validation
- New Alpine.js attributes MUST be registered in the `elements` section of `.htmlvalidate.json`. Because html-validate asserts attribute validity, failing to whitelist custom directives will break the CI/build pipeline.