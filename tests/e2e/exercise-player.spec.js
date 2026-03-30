/**
 * E2E tests for the exercise player.
 *
 * Requires _site/ to be built (PATH_PREFIX=/) before running.
 * Run: npm run build:e2e && npm run test:e2e
 *
 * Each describe block targets one exercise series and covers:
 *   - correct answer → success state
 *   - wrong answer   → error feedback
 *   - edge cases for the specific type
 */
import { test, expect } from '@playwright/test';

// ─── Shared helper ────────────────────────────────────────────────────────────

/**
 * Wait for Alpine.js to finish initialising on the page.
 * Series pages put x-cloak on the root x-data div; Alpine removes it on boot.
 */
async function waitForAlpine(page) {
  // Wait for the main player container to be ready and visible
  await page.waitForSelector('[x-data*="seriesPlayer"]', { timeout: 8000 });
  await page.waitForFunction(() => {
    const el = document.querySelector('[x-data*="seriesPlayer"]');
    return el && typeof Alpine !== 'undefined' && Alpine.$data(el)._ready;
  }, { timeout: 4000 });
}

// ─── MCQ ─────────────────────────────────────────────────────────────────────

test.describe('MCQ — suites figurales CP', () => {
  const URL = '/fr/exercices/e1721603/';
  // Exercise 01: 🔴 🔵 🔴 🔵 🔴 ___  answer: 🔵  wrong: 🔴

  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
    await waitForAlpine(page);
  });

  test('clicking the correct choice marks exercise solved', async ({ page }) => {
    // The correct answer is 🔵 — find the button by its emoji content
    await page.locator('button').filter({ hasText: '🔵' }).click();

    // Correct choice gets green border
    await expect(page.locator('button.border-green-500')).toBeVisible();
    // Success banner appears
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });

  test('clicking a wrong choice shows red error flash', async ({ page }) => {
    // 🔴 is wrong (it appears in the sequence, not as the answer)
    await page.locator('button').filter({ hasText: '🔴' }).first().click();

    // Wrong choice gets red styling (animate-shake)
    await expect(page.locator('button.border-red-400')).toBeVisible();
    // Error flash disappears after ~1.5 s — button goes back to normal
    await expect(page.locator('button.border-red-400')).not.toBeVisible({ timeout: 3000 });
  });

  test('after solving, all other choices are disabled', async ({ page }) => {
    await page.locator('button').filter({ hasText: '🔵' }).click();
    await expect(page.locator('button.border-green-500')).toBeVisible();

    // All choice buttons should be disabled
    const choiceButtons = page.locator('[x-show*="mcq"] button');
    const count = await choiceButtons.count();
    for (let i = 0; i < count; i++) {
      await expect(choiceButtons.nth(i)).toBeDisabled();
    }
  });
});

// ─── number-check ────────────────────────────────────────────────────────────

test.describe('number-check — liens numériques CP', () => {
  const URL = '/fr/exercices/d2fd2d9e/';
  // Exercise 01: "10 = 6 + ?"  answer: "4"

  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
    await waitForAlpine(page);
  });

  // This series uses "10 = 6 + ?" — Alpine renders one input per trouParts token,
  // but only the "?" token's input is visible. Use :visible to target the right one.
  test('correct answer triggers success state', async ({ page }) => {
    const input = page.locator('.js-trou input:visible');
    await expect(input).toBeVisible({ timeout: 8000 });
    await input.fill('4');
    await page.getByRole('button', { name: 'Vérifier' }).click();

    await expect(input).toHaveClass(/border-green-500/);
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });

  test('wrong answer shows error and clears after 2 s', async ({ page }) => {
    const input = page.locator('.js-trou input:visible');
    await expect(input).toBeVisible({ timeout: 8000 });
    await input.fill('99');
    await page.getByRole('button', { name: 'Vérifier' }).click();

    await expect(page.locator('.text-red-700')).toBeVisible();
    await expect(page.locator('.text-red-700')).not.toBeVisible({ timeout: 4000 });
  });

  test('trou Vérifier button is disabled when input is empty', async ({ page }) => {
    await expect(page.locator('.js-trou input:visible')).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'Vérifier' })).toBeDisabled();
  });

  test('Enter key submits the answer', async ({ page }) => {
    const input = page.locator('.js-trou input:visible');
    await expect(input).toBeVisible({ timeout: 8000 });
    await input.fill('4');
    await page.keyboard.press('Enter');
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });

  test('SVG decomposition tree is rendered', async ({ page }) => {
    // The decompTreeSvg generates an SVG with viewBox="0 0 260 140"
    await expect(page.locator('svg[viewBox="0 0 260 140"]')).toBeVisible();
  });
});

// ─── calc-chain ───────────────────────────────────────────────────────────────

test.describe('calc-chain — calcul réfléchi CE1', () => {
  const URL = '/fr/exercices/b138801a/';
  // Exercise 01: 15 → +8 → [23] → -6 → [17]

  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
    await waitForAlpine(page);
  });

  test('filling all steps correctly marks exercise solved', async ({ page }) => {
    const inputs = page.locator('.js-cc input');
    await inputs.nth(0).fill('23');
    await inputs.nth(1).fill('17');
    await page.locator('.js-cc button').click();

    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
    // All inputs go green
    await expect(inputs.nth(0)).toHaveClass(/border-green-500/);
    await expect(inputs.nth(1)).toHaveClass(/border-green-500/);
  });

  test('wrong step highlights only the incorrect inputs', async ({ page }) => {
    const inputs = page.locator('.js-cc input');
    await inputs.nth(0).fill('23');
    await inputs.nth(1).fill('99'); // wrong
    await page.locator('.js-cc button').click();

    // Step 1 is correct → not red; step 2 is wrong → red
    await expect(inputs.nth(0)).not.toHaveClass(/border-red-400/);
    await expect(inputs.nth(1)).toHaveClass(/border-red-400/);
  });

  test('Vérifier button is disabled until all steps are filled', async ({ page }) => {
    const btn = page.locator('.js-cc button');
    await expect(btn).toBeDisabled();

    await page.locator('.js-cc input').nth(0).fill('23');
    // Still disabled — second step empty
    await expect(btn).toBeDisabled();

    await page.locator('.js-cc input').nth(1).fill('17');
    await expect(btn).toBeEnabled();
  });

  test('start value is visible', async ({ page }) => {
    // The chain starts at 15
    await expect(page.locator('.js-cc').getByText('15')).toBeVisible();
  });
});

// ─── Progress / navigation ────────────────────────────────────────────────────

test.describe('Series progress', () => {
  const URL = '/fr/exercices/e1721603/';

  test('progress bar advances after solving exercise 1', async ({ page }) => {
    await page.goto(URL);
    await waitForAlpine(page);

    // Progress bar width starts near 0
    const bar = page.locator('.bg-primary-500.h-full');
    const widthBefore = await bar.evaluate(el => el.style.width);

    await page.locator('button').filter({ hasText: '🔵' }).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();

    const widthAfter = await bar.evaluate(el => el.style.width);
    expect(widthAfter).not.toBe(widthBefore);
    expect(parseFloat(widthAfter)).toBeGreaterThan(0);
  });

  test('exercise counter shows 1 / 5', async ({ page }) => {
    await page.goto(URL);
    await waitForAlpine(page);
    await expect(page.locator('text=1 / 5')).toBeVisible();
  });

  test('URL hash updates when navigating to exercise 2', async ({ page }) => {
    await page.goto(URL + '#1');
    await waitForAlpine(page);

    // Solve ex 1 → auto-advance after 1.5 s
    await page.locator('button').filter({ hasText: '🔵' }).click();
    await page.waitForURL(/\#2/, { timeout: 5000 });
    expect(page.url()).toContain('#2');
  });
});
