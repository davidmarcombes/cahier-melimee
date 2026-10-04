/**
 * E2E — cahiers: several children on one browser, export / import through a file.
 * Everything is localStorage (see src/assets/js/modules/store.js and agents/identity.md).
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

async function createCahier(page) {
  await page.goto('/fr/onboarding/');
  await page.locator('[x-data^="onboardingWizard"] button').first().click();
  await page.getByRole('button', { name: 'Créer mon cahier' }).click();
  await page.waitForURL(/\/fr\/cahier\/\?user=/);
  return new URL(page.url()).searchParams.get('user');
}

test('two children, one browser, each with their own progress', async ({ page }) => {
  const first = await createCahier(page);
  await page.evaluate(() => window.localStore.markDone('serie-a'));
  const second = await createCahier(page);
  expect(second).not.toBe(first);
  await page.reload();
  await expect(page.getByText('pas encore terminé')).toBeVisible(); // the second child starts empty

  await page.goto('/fr/cahiers/');
  const cards = page.locator('[x-data^="cahiersPage"] button');
  await expect(cards).toHaveCount(2);
  await cards.first().click();
  await page.waitForURL((url) => url.searchParams.get('user') === first);
  await expect(page.getByText('1 série terminée')).toBeVisible();
});

test('export a cahier to a file and import it on a fresh browser', async ({ page, browser }) => {
  const slug = await createCahier(page);
  await page.evaluate(() => window.localStore.markDone('serie-b'));
  await page.reload();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Télécharger le fichier' }).click(),
  ]);
  const file = await download.path();
  expect(JSON.parse(readFileSync(file, 'utf8')).pupil.slug).toBe(slug);

  const other = await browser.newPage(); // new context: empty localStorage
  await other.goto('/fr/cahiers/');
  await other.locator('input[type=file]').setInputFiles(file);
  await other.waitForURL((url) => url.searchParams.get('user') === slug); // slugs may have accents (rusé-…)
  await expect(other.getByText('1 série terminée')).toBeVisible();
  await other.close();
});

test('a file that is not a cahier is refused with a message', async ({ page }) => {
  await page.goto('/fr/cahiers/');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'photo.json', mimeType: 'application/json', buffer: Buffer.from('{"a":1}') });
  await expect(page.getByRole('alert')).toContainText('pas un cahier');
});
