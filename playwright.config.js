import { defineConfig, devices, chromium } from '@playwright/test';
import { existsSync } from 'node:fs';

// Bail out early if browser binaries are missing
const browserPath = chromium.executablePath();
if (!existsSync(browserPath)) {
  console.error('\n\x1b[31m✘ Chromium not found at: %s\x1b[0m', browserPath);
  console.error('  Run: npx playwright install\n');
  process.exit(1);
}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 20_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  // One retry absorbs load-related timing flakes; such tests are still reported as "flaky"
  retries: 1,
  // ~1,600 per-page tests: use most cores (the static server is cheap). Override with E2E_WORKERS.
  workers: process.env.E2E_WORKERS || '75%',
  // `npm run check` sets E2E_REPORTER=line to keep the console readable; the HTML report is always written
  reporter: [[process.env.E2E_REPORTER || 'list'], ['html', { open: 'never', outputFolder: 'reports/playwright' }]],

  use: {
    baseURL: `http://localhost:${process.env.E2E_PORT || 4173}`,
    // Capture traces on failure for debugging
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // The service worker pre-caches ~800 URLs on install: in a fresh context per test that is a
    // background download of the whole site (timeouts under load). Not what these tests check.
    serviceWorkers: 'block',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Target devices are desktop and tablet: rendering / overflow checked again on a portrait tablet
    // (phones are not a target; phone-only tweaks use max-sm: and must not change sm+ rendering).
    // Only layout-health — the solvability logic does not depend on the viewport.
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true },
      testMatch: /layout-health\.spec\.js/,
    },
  ],

  webServer: {
    command: 'node scripts/e2e-server.js',
    url: `http://localhost:${process.env.E2E_PORT || 4173}`,
    // Reuse an already-running server (handy during local dev)
    reuseExistingServer: true,
    // Give the server 5 s to start
    timeout: 5_000,
  },
});
