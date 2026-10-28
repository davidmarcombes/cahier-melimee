import { test, expect } from '@playwright/test';
import { waitForAlpine } from './pages.js';

test('exercise listing search matches words in any order, ignores accents, and tolerates one typo', async ({
  page,
}) => {
  await page.goto('/fr/exercices/');
  await waitForAlpine(page);

  await page.getByPlaceholder('Rechercher un exercice...').fill('fractions trier');
  await expect(page.locator('a[href="/fr/applications/b7bb0d4c/"]')).toBeVisible();

  await page.getByPlaceholder('Rechercher un exercice...').fill('vrai geometrie');
  await expect(page.locator('a[href="/fr/exercices/b9e293cd/"]')).toBeVisible();

  await page.getByPlaceholder('Rechercher un exercice...').fill('vrai geometire');
  await expect(page.locator('a[href="/fr/exercices/b9e293cd/"]')).toBeVisible();
});
