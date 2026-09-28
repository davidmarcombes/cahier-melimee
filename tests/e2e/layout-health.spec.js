/**
 * Layout health checks — one test per built page.
 *
 * Detects obviously broken pages: empty renders, content explosions,
 * horizontal overflow, missing interactive elements, and JS errors.
 *
 * URLs are auto-discovered from _site/ at test collection time, so new
 * series and new types are covered automatically without any code change.
 *
 * Requires _site/ to be built before running.
 * Run: npm run build:e2e && npm run test:e2e
 */
import { test, expect } from '@playwright/test';
import { discoverPages, waitForAlpine } from './pages.js';

// ─── Config ───────────────────────────────────────────────────────────────────

const MIN_HEIGHT = 150; // px — less than this = nothing rendered
const MAX_HEIGHT = 3000; // px — more than this = layout explosion

const PAGES = discoverPages();

// ─── Checks ───────────────────────────────────────────────────────────────────

async function runHealthChecks(page, url) {
  // 1. Every JS error (uncaught exceptions, console.error — Alpine, generators, SVG…) and every
  //    failed request for a site resource (404 script, image, CSV…), during load AND while
  //    walking the exercises (check 6). Reported at the end.
  const jsErrors = [];
  const badRequests = [];
  const origin = `http://localhost:${process.env.E2E_PORT || 4173}`;
  page.on('pageerror', (err) => jsErrors.push(err.message));
  page.on('console', (msg) => msg.type() === 'error' && jsErrors.push(msg.text()));
  page.on(
    'requestfailed',
    (req) => req.url().startsWith(origin) && badRequests.push(`${req.url()} (${req.failure()?.errorText})`)
  );
  page.on(
    'response',
    (res) => res.status() >= 400 && res.url().startsWith(origin) && badRequests.push(`${res.url()} → ${res.status()}`)
  );

  await page.goto(url);
  await waitForAlpine(page);

  const issues = [];

  // 1b. Check for visual error indicators on screen (the ⚠️ symbol or specific error text)
  const visualErrors = await page.evaluate(() => {
    const text = document.body.innerText;
    return text.includes('⚠️') || text.includes('Erreur de génération');
  });
  if (visualErrors) issues.push('visual error indicator detected (⚠️ or Erreur de génération)');

  // 2. Horizontal overflow
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 5
  );
  if (overflow) issues.push('horizontal overflow');

  // 3. Page body height (catches empty and exploded renders)
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  if (bodyHeight < MIN_HEIGHT) issues.push(`page too short (${bodyHeight}px)`);
  if (bodyHeight > MAX_HEIGHT) issues.push(`page too tall (${bodyHeight}px)`);

  // Series pages: scope checks 4–5 to the player (the header's menu/theme buttons would
  // otherwise satisfy them even when the exercise area is empty)
  const PLAYER = '[x-data^="seriesPlayer"], [x-data^="timedPlayer"]';
  const hasPlayer = (await page.locator(PLAYER).count()) > 0;

  // 4. At least one interactive element visible — form controls, or Alpine @click targets
  //    (number-hunt cells, guided-problem words… are clickable divs/spans)
  const interactive = await page.evaluate(
    (sel) => {
      const root = document.querySelector(sel);
      const isClickable = (el) =>
        /^(BUTTON|INPUT|SELECT)$/.test(el.tagName) ||
        el.getAttributeNames().some((n) => n === '@click' || n === 'x-on:click');
      return [...root.querySelectorAll('*')].filter((el) => isClickable(el) && el.offsetHeight > 0).length;
    },
    hasPlayer ? PLAYER : 'body'
  );
  if (interactive === 0) issues.push('no interactive elements visible');

  // 5. Exercise area rendered (Alpine x-show resolved to something visible)
  const exerciseVisible = await page.evaluate(
    (sel) => {
      const root = document.querySelector(sel);
      if (!root) return false;
      // Check if the exercise container has actual content
      return root.getBoundingClientRect().height > 50;
    },
    hasPlayer ? PLAYER : '[x-data]:not([x-cloak])'
  );
  if (!exerciseVisible) issues.push('exercise area not visible');

  // 6. Every exercise of the series shows its own type block — catches a type partial missing
  //    from the page (e.g. a generator returning a type the layout did not include) — and does not
  //    overflow horizontally (checked per exercise: content width varies from one to the next)
  const walk = await page.evaluate(async () => {
    const root = document.querySelector('[x-data^="seriesPlayer"]');
    if (!root || !window.Alpine) return { out: [], overflow: [] };
    const p = window.Alpine.$data(root);
    const out = [];
    const overflow = [];
    const frame = () => new Promise((r) => setTimeout(r, 50));
    for (let i = 0; i < p.exercises.length; i++) {
      p.currentIndex = i; // not goTo(): no URL-hash navigation while the test walks the exercises
      const t = p.cur.type || 'number-check';
      const blocks = [...root.querySelectorAll('[x-show]')].filter((el) =>
        el.getAttribute('x-show').includes(`cur.type === '${t}'`)
      );
      // Switching type runs x-show transitions: give the block up to ~1 s to appear
      let shown = false;
      for (let f = 0; f < 20 && !shown; f++) {
        await frame();
        shown = blocks.some((el) => el.offsetHeight > 0);
      }
      if (!shown) out.push(`#${i + 1} (${t})`);
      if (root.innerText.includes('Erreur de génération')) out.push(`#${i + 1} generator error`);
      const doc = document.documentElement;
      if (doc.scrollWidth > doc.clientWidth + 5)
        overflow.push(`#${i + 1} (${t}, ${doc.scrollWidth}px > ${doc.clientWidth}px)`);
      else {
        // Content sticking out of the player column: invisible to scrollWidth on a wide screen,
        // but the text overlaps the page margin (e.g. a long operation at text-5xl)
        const box = root.getBoundingClientRect();
        const wide = [...root.querySelectorAll('*')].find((el) => {
          if (!el.offsetHeight) return false;
          const r = el.getBoundingClientRect();
          return r.right > box.right + 8 || r.left < box.left - 8;
        });
        if (wide)
          overflow.push(
            `#${i + 1} (${t}, wider than the player: ${wide.tagName.toLowerCase()} "${(wide.textContent || '').trim().slice(0, 30)}")`
          );
      }
      // Cropped drawing: an SVG shown narrower than its width attribute, with no viewBox to scale
      // it, only displays its left part (base-10 blocks once lost their viewBox to lowercasing)
      const cropped = [...root.querySelectorAll('svg[width]')].find(
        (s) =>
          s.getBoundingClientRect().width > 0 &&
          !s.getAttribute('viewBox') &&
          s.getBoundingClientRect().width + 2 < parseFloat(s.getAttribute('width'))
      );
      if (cropped)
        overflow.push(
          `#${i + 1} (${t}, cropped SVG: no viewBox, ${Math.round(cropped.getBoundingClientRect().width)}px shown of ${cropped.getAttribute('width')}px)`
        );
    }

    return { out, overflow };
  });
  if (walk.out.length) issues.push(`exercises with no visible type block: ${walk.out.join(', ')}`);
  if (walk.overflow.length) issues.push(`horizontal overflow on exercise ${walk.overflow.join(', ')}`);

  // Errors collected during load and the walk
  if (jsErrors.length) issues.push(`JS error: ${[...new Set(jsErrors)].slice(0, 5).join(' | ')}`);
  if (badRequests.length) issues.push(`failed request: ${[...new Set(badRequests)].slice(0, 5).join(' | ')}`);

  return issues;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

for (const { label, url } of PAGES) {
  test(`${label} — layout health`, async ({ page }) => {
    const issues = await runHealthChecks(page, url);
    expect(issues, `Layout issues on ${url}:\n  • ${issues.join('\n  • ')}`).toEqual([]);
  });
}
