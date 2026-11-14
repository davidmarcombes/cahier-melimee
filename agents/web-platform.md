# Modern Web Platform Guidance

Rules picked from [GoogleChrome/modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance) (checked 2026-11-14) for this site: static Eleventy pages, Alpine.js, Tailwind, touch/pointer exercises for children, number inputs, dark mode, service worker, prerecorded audio, inline SVG.

Project rules win when they clash: page budget (`performance.md`), French only, no dependencies added for a fallback.

## Fetching the full guides

The upstream project is a searchable CLI. Use it before building a new UI pattern (dialog, popover, drag, slider, toggle…):

```bash
npx -y modern-web-guidance@latest search "light dismiss dialog"   # 2–5 words, one capability, no framework names
npx -y modern-web-guidance@latest retrieve "<id>[,<id>]"          # full guide with code and fallbacks
```

Useful ids here: `accessibility`, `html`, `performance`, `css`, `color`, `typography`, `motion`, `dark-mode`, `dark-mode-toggle`, `dialog`, `drag-and-drop`, `ime-safe-enter-submit`, `validate-input-after-interaction`, `accessible-error-announcement`, `respect-os-text-scale`, `visually-stable-font-fallbacks`, `break-up-long-tasks`, `sanitize-untrusted-html`, `install-web-app`.

**Browser support:** Baseline Widely available features need no fallback. A newer feature is allowed only if feature-detected and the page still works without it (progressive enhancement). No polyfills.

## Known gaps in this codebase (fix when touching the file)

| Gap | Where | Rule |
|---|---|---|
| No `color-scheme` declared | `base.njk`, `input.css` | Add `<meta name="color-scheme" content="light dark">` and set `color-scheme: light` / `.dark { color-scheme: dark }` on `:root`, otherwise native scrollbars and inputs stay light in dark mode |
| Focus rings are `focus:outline-none focus:ring-2` (~70 places) | type partials | Tailwind `ring` is a `box-shadow`, and Windows High Contrast drops it, so keyboard focus disappears there. Prefer `focus-visible:` and keep an `outline` fallback (`outline-2 outline-transparent` still shows in forced colors) |
| Dark-mode init reads `localStorage` without `try/catch` | `base.njk` inline script | Storage can throw (site data blocked); wrap it. Also sync across tabs with the `storage` event |
| `@keydown.enter` handlers without an IME check | ~34 partials | Ignore the key when `$event.isComposing` is true. Low impact (number inputs, French), but free to add |
| Correct/wrong feedback rarely in a live region | only 3 partials have `aria-live` | Put verification feedback in one `polite` region per player rather than many scattered ones |
| No `<meta name="text-scale" content="scale">` | `base.njk` | Lets mobile OS font size scale `1rem`. Only add after a layout-health pass at large text sizes |

## HTML and semantics

- `<button type="button">` for actions, `<a href>` for navigation. No `div role="button"` and no extra Enter/Space handler on native buttons.
- One `<h1>`, no skipped heading levels, one `<main>`. Each `<nav>` gets its own `aria-label`.
- Boolean attributes without a value (`disabled`, not `disabled="disabled"`).
- No positive `tabindex`. Don't reorder focus with CSS `order` or `*-reverse` (drag-sort: move the real DOM nodes).
- When the focused element is hidden or removed (next exercise, closing feedback), move focus somewhere logical. Otherwise it falls back to `<body>`.
- `inert` on sections that are hidden but still in the DOM (pair it with a visual cue).
- Never `role="presentation"` or `aria-hidden="true"` on a focusable element or its ancestors.
- Don't disable zoom (no `maximum-scale` / `user-scalable=no`).
- Native overlays: use `<dialog>` + `showModal()` for blocking modals (no hand-made `role="dialog"`, focus trap or Esc handler). Use `closedby="any"` for light dismiss and `popover` for non-modal menus or tips. Don't lock page scroll with `overflow:hidden` on `body`. Retrieve `dialog` first.
- Use `<details>/<summary>` for disclosures (hints, corrections) before reaching for Alpine. Use `name=""` for exclusive accordions.
- Don't use `title` attributes as tooltips: they are unreachable by keyboard and touch.

## Accessibility for children's exercises

- **Targets:** at least 24×24 CSS px, bigger on `@media (pointer: coarse)` (GS `.kid` already does). Size them with `min-block-size` / padding, not a fixed `height`.
- **`touch-action`:** limit it to the axis you need (`pan-y` for a horizontal drag). Keep `touch-none` only on true drawing or drag surfaces (think-board, picross, target-blocks), never on a whole exercise container: the page must still scroll.
- **Pointer drags:** primary button only, `setPointerCapture` on `pointerdown`, follow one `pointerId` (ignore a second finger), handle `pointercancel` / `lostpointercapture`, let Escape cancel, and find the drop target from layout (`elementFromPoint` / rects), not `event.target`. Every drag needs a keyboard path (see `drag-and-drop`).
- **Inline SVG:** informative → `role="img"` + `<title>` or `aria-label`. Decorative → `aria-hidden="true"`. Charts and diagrams that carry the answer data need a text or table alternative.
- **Images:** always `alt`. Describe the purpose, no "Image de…". Decorative → `alt=""`.
- **Colour is never the only signal:** correct/wrong needs an icon, text or shape as well as green/red (colour-blind pupils, forced colours). This also applies to colour-theory exercises: give a name or pattern next to each swatch where possible.
- **Contrast:** 4.5:1 for text, 3:1 for large text, icons and control borders or states. Check both themes.
- **Forced colors:** don't convey borders or state with `box-shadow`, `background-image` or gradients alone. Use `forced-color-adjust: none` only where colour *is* the content (colour-mixing swatches, fraction-paint), never for looks.
- **Focus:** style `:focus-visible`, not `:focus`. If you remove the outline, the replacement needs 3:1 contrast. Use `outline` + `outline-offset` rather than a shadow.
- **Labels:** every input has a `<label>` or `aria-labelledby` (a visible consigne counts: point at it). A placeholder is not a label. Put hints in `aria-describedby`.
- **No context change on focus or input:** don't auto-advance to the next exercise when a field fills up or loses focus, only on an explicit action.
- **Live regions:** one `polite` region for results. Use `assertive` only for urgent messages, and don't announce "chargement…". Never write into a region inside `inert` content. Debounce updates that change fast.
- **Audio** (voice clips): never autoplay on page load without a stop control (WCAG 1.4.2). The spoken text must also exist as text, which the consigne covers. Lazy-fetch clips (already done).

## Form inputs (answers)

- Pair `inputmode` with the field (`numeric` for integers, `decimal` for decimals, already used). Use `autocomplete="off"` only on answer fields, never on personal-data fields (there are none: cahiers are anonymous).
- Show error styling with `:user-invalid` / `:user-valid`, not `:invalid`, so an empty field isn't red before the pupil types. Keep `aria-invalid` in sync (`"false"` until `:user-invalid` matches).
- After a failed « Vérifier », move focus to the first wrong field.
- For a custom Enter-to-submit: `preventDefault()`, skip if `isComposing`, then `form.requestSubmit()` if a real `<form>` exists.
- `field-sizing: content` (feature-detected) can replace JS width fitting for short answer boxes.

## CSS

- Font sizes in `rem`, unitless `line-height`. Never a fixed height on anything containing text (buttons, badges, tiles). Use `min-block-size`.
- Fluid sizes with `clamp(min, rem + vw, max)`, never bare `vw`.
- Text must reflow at 320 px width and 200 % zoom with no horizontal scroll (layout-health checks overflow).
- Paragraphs under ~80 characters wide. No `text-align: justify`. Use bold or `<strong>` for emphasis, not ALL CAPS. `text-wrap: balance` for headings, `text-wrap: pretty` for consignes (harmless where unsupported).
- Container queries (`container-type: inline-size`) for exercise widgets that live in varying widths (already used by `.kid .js-mcq-opbox`). Prefer them over viewport breakpoints inside type partials.
- `:has()` for parent or state styling instead of an extra Alpine class when the state is already in the DOM (`:checked`, `[aria-pressed]`).
- Pass dynamic values to CSS through custom properties in `style` (`--n`, `--pct`), not inline colours or padding.
- Use `translate` / `scale` / `rotate` as individual properties rather than combined `transform` strings when animating one of them.
- No `@import` in CSS (chained requests).

## Motion

- Make animations opt-in: put them inside `@media (prefers-reduced-motion: no-preference)`. Use `reduce` only to slow an animation down, not to cancel one declared globally.
- With motion off, the element must still end in its final state (never stuck at `opacity: 0`).
- Never more than 3 flashes per second, whatever the motion preference (success confetti, memory cards, timers).
- Anything that moves automatically for more than 5 s needs a pause control.

## Dark mode

- `color-scheme` on the root (see gaps) so UA widgets follow the theme.
- A stored override is applied by a tiny inline, non-module, non-deferred script before paint (already done). Wrap it in `try/catch` and sync tabs via the `storage` event.
- Don't clear the stored choice when the OS preference happens to match it: users who pin a theme would lose it at sunset.
- `light-dark()` tokens are an option for new token work. Keep the class-based `.dark` system as the source of truth.
- `theme-color` meta can take a `media="(prefers-color-scheme: dark)"` variant for the browser UI.

## Performance (complements `performance.md`)

- Inline SVG and above-the-fold images: never `loading="lazy"`. Below-the-fold: `loading="lazy"`. Always set `width`/`height` (CLS). One `fetchpriority="high"` at most, for the LCP image if any.
- Classic page scripts get `defer`. `type="module"` is already deferred.
- Long JS (generators, solvability checks, grid solving): split anything over 50 ms with `await scheduler.yield()`, falling back to `new Promise(r => setTimeout(r))`. Update the UI first ("Vérifier" feedback), then do the heavy work.
- Don't interleave DOM reads (`getBoundingClientRect`) and writes in one loop (drag handlers, SVG layout). Read all, then write all. Throttle `pointermove` work to `requestAnimationFrame`.
- Don't use `content-visibility: auto` on exercise pages (small pages, risk of jumps). It may help long lists (`/fr/exercices/`) if paired with `contain-intrinsic-size: auto <estimate>`.
- Fonts: `font-display: optional` without preload is a deliberate choice here (see `performance.md`). If a preload is ever added, it needs `crossorigin`, even same-origin. Consider `font-size-adjust: from-font` on the body to keep the `system-ui` fallback visually close to Inter.
- Never `Cache-Control: no-store` on pages (it breaks the back/forward cache).
- Service worker: cache-first for versioned assets (`?v=`), stale-while-revalidate for pages (current choice). Never cache opaque cross-origin responses aggressively. Keep the cache bounded (audio clips grow).

## Security

- `x-html` (~70 uses) must only receive build-time content or values computed by our generators, never anything typed by the pupil or read back from `localStorage` / URL params. If untrusted HTML is ever needed, use `el.setHTML()` (Sanitizer API, feature-detected) or render it as text.
- Self-host third-party JS (Alpine already is). If a CDN script is ever added, give it `integrity` + `crossorigin`.
- No inline `on*` handlers in templates (Alpine `@event` is fine).

## Not relevant here (skip)

Passkeys, sign-in or sign-up autofill, payment and address forms, OTP, built-in AI APIs, WebMCP, WebGL or 3D, WASM, Chrome extensions, Temporal timezone guides, origin migration.
