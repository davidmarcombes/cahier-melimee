# Modern Web Platform Guidance

Rules picked from [GoogleChrome/modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance) (all ~200 guides skimmed 2026-11-14; ~60 relevant ones read for their rules) for this site: static Eleventy pages (MPA), Alpine.js, Tailwind, touch/pointer exercises for children, number inputs, dark mode, service worker, prerecorded audio, inline SVG.

Project rules win when they clash: page budget (`performance.md`), French only, no dependencies added for a fallback.

## Fetching the full guides

The upstream project is a searchable CLI. Use it before building a new UI pattern:

```bash
npx -y modern-web-guidance@latest search "light dismiss dialog"   # 2–5 words, one capability, no framework names
npx -y modern-web-guidance@latest retrieve "<id>[,<id>]"          # full guide with code and fallbacks
```

Guide ids by situation in this repo:

| Situation | Guide ids |
|---|---|
| Any template change | `html`, `accessibility`, `css` |
| New exercise type with drag / reorder | `drag-and-drop`, `drag`, `dynamic-sort`, `move-dom-element-without-losing-state` |
| Answer inputs, validation | `forms`, `validate-input-after-interaction`, `required-field-feedback`, `accessible-error-announcement`, `ime-safe-enter-submit`, `form-fields-automatically-fit-contents` |
| Native controls (slider, switch, checkbox) | `slider`, `switch`, `checkbox`, `brand-consistent-forms` |
| Feedback popup, toast, modal | `dialog`, `light-dismiss-a-dialog`, `prevent-page-scroll-under-modal-dialog`, `persistent-toast-notifications`, `animate-element-entry-exit`, `declarative-dialog-popover-control` |
| Progress bar / ring | `progress`, `progress-ring` |
| Layout | `css-layout`, `responsive-design`, `size-aware-styling`, `fluid-scaling`, `form-factor-adaptation` |
| Styling state without JS | `child-state-based-styling`, `content-based-styling`, `style-parent-with-has` |
| Text | `typography`, `improve-text-layout-and-legibility`, `respect-os-text-scale`, `single-line-overflow` |
| Colour / theme | `color`, `dark-mode`, `dark-mode-toggle`, `component-specific-light-dark-theme`, `browser-ui-theming`, `contrast-color` |
| Animation | `motion`, `individual-transform-properties`, `physics-based-easing`, `cross-document-transitions` |
| Perf | `performance`, `break-up-long-tasks`, `improve-next-page-load-performance`, `lazy-load-video-and-audio`, `visually-stable-font-fallbacks` |
| Security / privacy | `security`, `sanitize-untrusted-html`, `secure-external-subresources`, `privacy` |

**Browser support:** Baseline Widely available features need no fallback. A newer feature is allowed only if feature-detected and the page still works without it (progressive enhancement). No polyfills.

## Known gaps in this codebase

Fixed 2026-11-15:
- `color-scheme`: a meta in `base.njk`, pinned by the theme script, plus a `:root` / `:root.dark` rule in `input.css`, outside the generated token block.
- Dark-mode `localStorage` access wrapped in `try/catch` (`base.njk`, `modules/theme.js`).
- The progress bar is a `role="progressbar"`, filled with `transform: scaleX` from the left edge. `translateX` would push the fill's box out of the player, and layout-health then flags it.
- A `polite` live region in `series-player.njk` announces « C'est juste ! » / « Ce n'est pas encore ça… ». It deliberately uses different words from the visible « Bonne réponse ! », which the e2e tests look for.
- `Referrer-Policy` + `Permissions-Policy` added in `scripts/generate-htaccess.js` (`src/.htaccess` is generated).
- Touch targets: a `coarse:` variant (`@media (pointer: coarse)`, defined in `scripts/generate-tailwind-from-tokens.js`) brings tablet targets to 44 px without changing the desktop layout. Small icon links enlarge their hit area with `relative after:absolute after:-inset-[11px] after:content-['']`, never with a negative margin, which layout-health flags as content sticking out of the player.
- Fixed `h-*` on fields with text → `min-h-*`.
- The onboarding identity button shows its focus ring only for keyboard focus (`focus-visible`).
- Hover only with a real mouse: Tailwind `future.hoverOnlyWhenSupported` (in the generator) wraps every `hover:` in `@media (hover: hover) and (pointer: fine)`. Hand-written `:hover` rules in `input.css` go inside `@media (hover: hover)`. Without this, a tapped tile stays highlighted on a tablet.
- `touch-action: manipulation` on `:root`: fast taps are taps, not a double-tap zoom. Pinch-zoom still works, and `touch-none` surfaces keep `none`.
- Drags follow one pointer: picross, tangram, target-blocks and think-board ignore a second finger and non-primary buttons. They keep the starting `pointerId` and pass `$event` to the up/cancel handlers. fraction-paint (touch events) ignores multi-touch. Copy this pattern for any new drag.
- The exercise list (heavy: CSV of every series) is prerendered with `eagerness: "moderate"` from every page that links to it (`base.njk`), and right away from series pages. Exercise pages themselves are light, so they're not speculated. Headless Playwright doesn't prerender, so check in Chrome: DevTools → Application → Speculative loads.

Focus rings: Tailwind 3 `focus:outline-none` compiles to `outline: 2px solid transparent`, which Windows High Contrast repaints in a visible colour. So `focus:ring` does **not** lose focus in forced colours. Text fields can keep `focus:`, because `focus` and `focus-visible` match the same way there. Use `focus-visible:` on buttons.

Screenshots of touch layouts with Playwright: `fullPage: true` drops touch emulation during the capture (`pointer: coarse` turns false). Grow the viewport to `scrollHeight` and take a normal screenshot instead.

Target sizes still under 44 px on tablets: grid cells (picross, hundred-board, grid-board, magic-color cells, number-hunt) at 37–42 px, limited by the grid size. Acceptable.

Still open (fix when touching the file):

| Gap | Where | Rule (guide) |
|---|---|---|
| Type-specific error texts are not announced | `series-player.njk` | The live region says a generic message. It could reuse the visible text |
| `@keydown.enter` handlers without an IME check | ~34 partials | Skip when `$event.isComposing`. Low impact for a French site (`ime-safe-enter-submit`) |
| No `<meta name="text-scale" content="scale">` | `base.njk` | Lets the mobile OS font size scale `1rem`. Test at large text first (`respect-os-text-scale`) |

## HTML and semantics

- `<button type="button">` for actions, `<a href>` for navigation. No `div role="button"` and no extra Enter/Space handler on native buttons. If a custom element must act as a button, Enter fires on `keydown` and Space on `keyup`.
- One `<h1>`, no skipped heading levels, one `<main>`. Each `<nav>` gets its own `aria-label`.
- Boolean attributes without a value (`disabled`, not `disabled="disabled"`).
- No positive `tabindex`. Don't reorder focus with CSS `order` or `*-reverse`.
- When the focused element is hidden or removed (next exercise, closing feedback), move focus somewhere logical, not `<body>`. Move focus into new content only when the user's action leads there.
- `inert` on sections that are hidden but still in the DOM (pair it with a visual cue).
- Never `role="presentation"` or `aria-hidden="true"` on a focusable element or its ancestors.
- Don't disable zoom (no `maximum-scale` / `user-scalable=no`). If `viewport-fit=cover` is ever used, pad fixed bars with `env(safe-area-inset-*)`.
- `<fieldset>` + `<legend>` (first child) to group related answer fields (fraction num/den, column-op digits). Never a `<fieldset>` without a `<legend>`.
- Lists of options or tiles are `<ul>`/`<ol>`: assistive tech then announces the count.
- Don't use `title` attributes as tooltips: they never show on touch.
- Don't put meaningful text in CSS `content` (WCAG F87). Decorative text: `content: "✓" / ""`.

## Overlays (feedback, hints, confirmations)

- Blocking modal: `<dialog>` + `showModal()` (or `command="show-modal" commandfor="id"`). Don't add `role="dialog"`, `aria-modal`, a focus trap or an Esc handler: the native element does all of it. Never `show()` or the `open` attribute for modals.
- Choose `closedby` on purpose: `any` = tap outside closes, `closerequest` = Esc / back only, `none` = code only.
- Name it (`aria-labelledby` pointing at its heading). `autofocus` on the primary (or the safe) button. Don't write focus-return code: the browser returns focus to the opener.
- Always include a visible close button.
- Scroll lock: use the guide's `overscroll-behavior` CSS, not `overflow: hidden` on `body`.
- Non-modal tips and menus: `popover`. A persistent toast: `popover="manual"` in one named region. Announce it with `ariaNotify()` (feature-detected, falling back to a live region). Never steal focus. The toast's info must also be available elsewhere.
- Entry/exit animation: `@starting-style` + `transition-behavior: allow-discrete` (as a longhand, not in the `transition` shorthand) + `overlay` for top-layer elements.
- Disclosures (hints, corrections): `<details>/<summary>` before reaching for Alpine. Use `name=""` for exclusive accordions. Don't hide the marker without another cue.

## Accessibility for children's exercises

**Keyboard-only use is not a target.** A child who struggles with a mouse switches to a touch screen, not to a keyboard. The keyboard is only for typing answers (Enter checks). So: no arrow-key grids, no keyboard alternative to drags, no div→button conversions just for Tab access. Native `<button>` / `<input>` are still the default for new markup, since they cost nothing. Spend the effort on touch instead.

- **Targets:** at least 24×24 CSS px, and **44×44 on `(pointer: coarse)`**. Tablets are the main device. Size them with `min-block-size` / padding, not a fixed `height`. A checkbox or radio's `<label>` carries the target size.
- **`touch-action`:** limit it to the axis you need (`pan-y` for a horizontal drag). Keep `touch-none` only on true drawing or drag surfaces (think-board, picross, target-blocks), never on a whole exercise container.
- **`user-select: none`** only on tiles, handles and buttons, never on consignes or text the child might want read aloud or translated.
- **Pointer drags:** primary button only, `setPointerCapture` on `pointerdown`, follow one `pointerId` (ignore a second finger), handle `pointercancel` / `lostpointercapture`, let Escape cancel, and find the drop target from layout (`elementFromPoint` / rects), not `event.target`. Use a dedicated handle when the item contains controls.
- **Reordering (sort, drag-sort):** move the existing DOM nodes, don't recreate them (that loses focus). `moveBefore()` where available keeps state. Announce the new order once, not per step. A view transition is optional: scope it to the list (`list.startViewTransition`), not the document.
- **Inline SVG:** informative → `role="img"` + `<title>` or `aria-label`. Decorative → `aria-hidden="true"`. Charts and diagrams that carry the answer data need a text or table alternative (`<figure>` + `<figcaption>`).
- **Images:** always `alt`. Describe the purpose, no "Image de…". Decorative → `alt=""`.
- **Colour is never the only signal:** correct/wrong needs an icon, text or shape as well as green/red. This applies to colour-theory exercises too: give a name or pattern next to each swatch where possible.
- **Contrast:** 4.5:1 for text, 3:1 for large text, icons, control borders, and checked/focus states. Check both themes.
- **Forced colors:** don't convey borders or state with `box-shadow`, `background-image` or gradients alone. Use `forced-color-adjust: none` only where colour *is* the content (colour-mixing swatches, fraction-paint), never for looks.
- **Focus:** style `:focus-visible`, not `:focus`. If you remove the outline, the replacement needs 3:1 contrast. Use `outline` + `outline-offset` (a negative offset inside tight rows), not a shadow.
- **Labels:** every input has a `<label>` or `aria-labelledby` (a visible consigne counts: point at it). A placeholder is not a label. Put hints in `aria-describedby`.
- **No context change on focus or input:** don't auto-advance to the next exercise when a field fills up or loses focus, only on an explicit action.
- **Live regions:** one `polite` region for results. Use `assertive` only for urgent messages, and don't announce "chargement…" (use `<progress>`). Never write into `inert` content. Debounce updates that change fast, and delay slightly while focus is moving.
- **Audio** (voice clips): never autoplay on page load without a stop control (WCAG 1.4.2). The spoken text must also exist as text (the consigne). If `<audio loading="lazy">` is ever used, it needs `controls` or it never loads.
- **No noise:** no interstitials or promos on load. Don't insert content above what the child is reading.

## Form inputs (answers)

- `inputmode="numeric"` for integers, `decimal` for decimals. `autocomplete="off"` is fine on answer fields. There are no personal-data fields (cahiers are anonymous).
- Error styling with `:user-invalid` / `:user-valid`, not `:invalid`, so an empty field isn't red before the pupil types. Keep `aria-invalid` in sync (`"false"` until `:user-invalid` matches). Add an icon or text with the colour.
- After a failed « Vérifier », move focus to the first wrong field.
- Custom Enter-to-submit: `preventDefault()`, skip if `isComposing`, then `form.requestSubmit()` if a real `<form>` exists.
- `field-sizing: content` (feature-detected) can replace JS width fitting for short answer boxes.
- `accent-color` (token value, 3:1 against the background) themes native checkbox, radio, range and progress controls. Pair it with `color-scheme`.
- A slider is `<input type="range">` with a label, not divs plus pointer code. An on/off toggle is `<input type="checkbox" switch>` (falls back to a checkbox). Style range thumbs with `::-webkit-slider-thumb` and `::-moz-range-thumb` in separate rules.

## CSS

- Font sizes in `rem`, unitless `line-height`. Never a fixed height on anything containing text. Use `min-block-size`.
- Fluid sizes with `clamp(min, rem + vw, max)`, never bare `vw`. Use `dvh`, not `vh`, for full-height layouts (mobile address bar).
- Text reflows at 320 px width and 200 % zoom with no horizontal scroll. Use `flex-wrap: wrap` wherever overflow is possible.
- Paragraphs under ~80 characters wide. No `text-align: justify`. Use bold or `<strong>` for emphasis, not ALL CAPS. `text-wrap: balance` on headings only (never globally), `text-wrap: pretty` on consignes.
- Don't truncate headings with an ellipsis, and don't clip controls with `overflow: hidden` on a parent (it also clips focus outlines).
- Use container queries (`container-type: inline-size`) for widgets placed in varying widths (already used by `.kid .js-mcq-opbox`). Container units plus `clamp()` give fluid scaling inside a widget.
- `:has()` for parent or state styling instead of an extra Alpine class (`label:has(:checked)`). Don't nest `:has()`.
- Pass dynamic values through custom properties in `style` (`--n`, `--pct`), not inline colours or padding.
- `gap` rather than child margins. Use `aspect-ratio` to reserve space for SVG and images.
- Logical properties (`margin-inline`, `padding-block`) for new CSS. Low priority while French is the only language.
- No `@import` in CSS (chained requests). Use `scrollbar-width` only as `auto`.

## Motion

- Make animations opt-in: put them inside `@media (prefers-reduced-motion: no-preference)`. Use `reduce` only to slow an animation down.
- With motion off, the element must still end in its final state (never stuck at `opacity: 0`).
- Never more than 3 flashes per second, whatever the motion preference (success effects, memory cards, timers).
- Anything that moves automatically for more than 5 s needs a pause control.
- Animate `transform` / `opacity`. Use individual `translate` / `scale` / `rotate` properties when animating one of them. `linear()` easing gives springs or bounces without JS.
- Optional, MPA-friendly: cross-document view transitions (`@view-transition { navigation: auto }` on both pages, inside `prefers-reduced-motion: no-preference`). The stylesheet stays in `<head>`.

## Dark mode

- `color-scheme` on the root (see gaps) so UA widgets follow the theme.
- A stored override is applied by a tiny inline, non-module, non-deferred script before paint (already done). Wrap it in `try/catch`. Sync tabs via the `storage` event.
- Don't clear the stored choice when the OS preference happens to match it.
- `light-dark()` tokens are an option for new token work. The class-based `.dark` system stays the source of truth.
- A widget that must keep its own scheme (colour-mixing canvas, illustrations drawn for a light background) can set `color-scheme: light` locally.
- `theme-color` meta can take a `media="(prefers-color-scheme: dark)"` variant.

## Performance (complements `performance.md`)

- Inline SVG and above-the-fold images: never `loading="lazy"`. Below the fold: `loading="lazy"`. Always set `width`/`height` (CLS). One `fetchpriority="high"` at most.
- **Speculation rules** suit this static MPA. `series-player.njk` already prerenders `/fr/exercices/`. Consider document rules with `eagerness: "moderate"` to prefetch the "série suivante" / series links on hover. Never speculate URLs that change state. Browsers cap non-eager speculations at 2.
- Long JS (generators, solvability, grid solving): split anything over 50 ms with `await scheduler.yield()`, falling back to `new Promise(r => setTimeout(r))`. Update the UI first, then do the heavy work.
- Don't interleave DOM reads (`getBoundingClientRect`) and writes in one loop (drag handlers, SVG layout, `updateMatchLines`). Read all, then write all. Throttle `pointermove` work to `requestAnimationFrame`.
- `content-visibility: auto` only on long, below-the-fold lists (`/fr/exercices/`), never on exercise pages. Always pair it with `contain-intrinsic-size: auto <estimate>`, and check keyboard reachability.
- Fonts: `font-display: optional` without preload is deliberate (`performance.md`). A preload would need `crossorigin`, even same-origin. `font-size-adjust: from-font` keeps the `system-ui` fallback close to Inter.
- Never `Cache-Control: no-store` on pages (it breaks the back/forward cache). Current `.htaccess` is fine: only `sw.js` is `no-store`.
- Service worker: cache-first for versioned assets (`?v=`), stale-while-revalidate for pages (current choice). Never aggressively cache opaque cross-origin responses. Keep caches bounded (audio clips grow).

## Security and privacy

- `x-html` (~70 uses) must only receive build-time content or values from our generators, never pupil input or values read from `localStorage` / URL params. For untrusted HTML: `el.setHTML()` (Sanitizer API, feature-detected) or `textContent`. Trusted Types can't be enforced while Alpine writes `innerHTML`.
- Self-host third-party JS (Alpine already is). A CDN script would need a pinned version + `integrity="sha384-…"` + `crossorigin`.
- No inline `on*` handlers (Alpine `@event` is fine).
- Collect nothing that isn't needed. No PII in `localStorage` (cahiers stay anonymous, see `identity.md`). Easy reset or delete of local progress. Feature detection, never UA sniffing.
- No third-party embeds or trackers. If a video embed is ever needed: a click-to-load facade on a privacy-friendly domain.

## Not relevant here (skipped after skimming)

Passkeys, sign-in or sign-up autofill, payment and address forms, OTP, email verification, customizable `<select>` (no selects in exercises), web components and shadow DOM, built-in AI APIs, WebMCP, WebGL or 3D or HTML-in-canvas, WASM, Chrome extensions, Temporal / timezone guides, analytics and RUM (`fetchLater`, INP attribution, foreground time), A/B testing, OOO HTML streaming, SPA transitions, carousels, scroll-driven effects (parallax, scrollytelling, scrollspy, sticky / shrinking headers, pull-to-reveal), swipe-to-remove / reveal, app menus, navigation drawer, stack drill-down, hovercards, interest invokers, anchor-positioned tooltips, text-fit, masks and textures, Custom Highlight API, origin migration, local network access.
