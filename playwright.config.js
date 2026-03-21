import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 20_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'reports/playwright' }]],

  use: {
    baseURL: 'http://localhost:4173',
    // Capture traces on failure for debugging
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'node scripts/e2e-server.js',
    url: 'http://localhost:4173',
    // Reuse an already-running server (handy during local dev)
    reuseExistingServer: true,
    // Give the server 5 s to start
    timeout: 5_000,
  },
});
