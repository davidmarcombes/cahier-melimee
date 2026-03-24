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
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ─── Config ───────────────────────────────────────────────────────────────────

const MIN_HEIGHT = 150;   // px — less than this = nothing rendered
const MAX_HEIGHT = 3000;  // px — more than this = layout explosion

const SITE_DIR = join(process.cwd(), '_site');

// ─── URL discovery ────────────────────────────────────────────────────────────

function discoverPages() {
  const pages = [];
  for (const section of ['exercices', 'applications', 'defis']) {
    const dir = join(SITE_DIR, 'fr', section);
    if (!existsSync(dir)) continue;
    for (const slug of readdirSync(dir).sort()) {
      if (existsSync(join(dir, slug, 'index.html'))) {
        pages.push({ label: `${section}/${slug}`, url: `/fr/${section}/${slug}/` });
      }
    }
  }
  return pages;
}

const PAGES = discoverPages();

// ─── Helper ───────────────────────────────────────────────────────────────────

async function waitForAlpine(page) {
  await page.waitForSelector('[x-data]:not([x-cloak])', { timeout: 8000 });
}

// ─── Checks ───────────────────────────────────────────────────────────────────

async function runHealthChecks(page, url) {
  const jsErrors = [];
  page.on('pageerror', err => jsErrors.push(err.message));

  await page.goto(url);
  await waitForAlpine(page);

  const issues = [];

  // 1. JS errors
  if (jsErrors.length > 0) {
    issues.push(`JS error: ${jsErrors[0]}`);
  }

  // 2. Horizontal overflow
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 5
  );
  if (overflow) issues.push('horizontal overflow');

  // 3. Page body height (catches empty and exploded renders)
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  if (bodyHeight < MIN_HEIGHT) issues.push(`page too short (${bodyHeight}px)`);
  if (bodyHeight > MAX_HEIGHT) issues.push(`page too tall (${bodyHeight}px)`);

  // 4. At least one interactive element visible
  const interactive = await page.locator('button:visible, input:visible, select:visible').count();
  if (interactive === 0) issues.push('no interactive elements visible');

  // 5. Exercise area rendered (Alpine x-show resolved to something visible)
  const exerciseVisible = await page.evaluate(() => {
    const root = document.querySelector('[x-data]:not([x-cloak])');
    if (!root) return false;
    return root.getBoundingClientRect().height > 50;
  });
  if (!exerciseVisible) issues.push('exercise area not visible');

  return issues;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

for (const { label, url } of PAGES) {
  test(`${label} — layout health`, async ({ page }) => {
    const issues = await runHealthChecks(page, url);
    expect(issues, `Layout issues on ${url}:\n  • ${issues.join('\n  • ')}`).toEqual([]);
  });
}
