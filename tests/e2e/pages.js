/**
 * Page discovery shared by the per-page e2e specs (layout-health, solve).
 *
 * Pages are auto-discovered from _site/, so new series are covered without code changes.
 * E2E_PAGES narrows the run: a comma-separated list of "section/slug" (e.g.
 * "applications/b2025e33,exercices/a3f0b05b"). Set by `npm run check` in "changed" mode.
 */
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const SITE_DIR = join(process.cwd(), process.env.SITE_OUT || '_site');
export const SECTIONS = ['exercices', 'applications', 'defis'];

export function discoverPages({ includeIndexes = true } = {}) {
  const pages = [];
  if (includeIndexes) {
    for (const section of SECTIONS) {
      if (existsSync(join(SITE_DIR, 'fr', section, 'index.html'))) {
        pages.push({ label: `${section}/index`, url: `/fr/${section}/` });
      }
    }
  }
  for (const section of SECTIONS) {
    const dir = join(SITE_DIR, 'fr', section);
    if (!existsSync(dir)) continue;
    for (const slug of readdirSync(dir).sort()) {
      if (existsSync(join(dir, slug, 'index.html'))) {
        pages.push({ label: `${section}/${slug}`, url: `/fr/${section}/${slug}/` });
      }
    }
  }
  const only = (process.env.E2E_PAGES || '').split(',').filter(Boolean);
  return only.length ? pages.filter((p) => only.includes(p.label)) : pages;
}

export async function waitForAlpine(page) {
  await page.waitForSelector('[x-data]:not([x-cloak])', { timeout: 8000 });
  // For list pages: wait until the loading spinner disappears (CSV fetched)
  const spinner = page.locator('[x-show="$store.exercises.loading"]');
  if ((await spinner.count()) > 0) {
    await spinner.waitFor({ state: 'hidden', timeout: 8000 });
  }
}
