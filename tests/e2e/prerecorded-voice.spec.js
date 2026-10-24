import { test, expect } from '@playwright/test';

async function waitForPlayer(page) {
  await page.waitForFunction(() => {
    const player = document.querySelector('[x-data*="seriesPlayer"]');
    return player && typeof Alpine !== 'undefined' && Alpine.$data(player)._ready;
  });
}

test('large-number dictation plays every prerecorded segment without browser speech', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      get() {
        throw new Error('Browser speech must not be used');
      },
    });
  });
  const responses = [];
  page.on('response', (response) => {
    if (response.url().includes('/assets/audio/voice-pilot/')) {
      responses.push({ url: response.url(), status: response.status() });
    }
  });

  await page.goto('/fr/applications/cf92b76d/');
  await waitForPlayer(page);
  const segments = await page.locator('[x-data*="seriesPlayer"]').evaluate((el) => Alpine.$data(el).cur.voiceAudio);
  expect(segments.length).toBeGreaterThan(1);

  await page.getByRole('button', { name: 'Écouter le nombre' }).click();
  await expect.poll(() => responses.length, { timeout: 15000 }).toBe(segments.length);
  expect(responses.map(({ url }) => decodeURIComponent(url.split('/voice-pilot/')[1]))).toEqual(segments);
  expect(responses.every(({ status }) => status === 200)).toBe(true);
});

test('GS counting prompt separates the number sequence from its question', async ({ page }) => {
  await page.goto('/fr/exercices/f82bf594/');
  await waitForPlayer(page);
  const clips = await page
    .locator('[x-data*="seriesPlayer"]')
    .evaluate(
      (el) =>
        Alpine.$data(el).exercises.find((exercise) => exercise.say?.includes('Quel nombre vient après ?')).voiceAudio
    );
  expect(clips).toHaveLength(2);
  expect(clips.every((clip) => clip.startsWith('instructions/'))).toBe(true);
});

test('new GS exercise instructions are generated, built, and playable', async ({ page }) => {
  const responses = [];
  page.on('response', (response) => {
    if (response.url().includes('/assets/audio/voice-pilot/instructions/')) {
      responses.push({ url: response.url(), status: response.status() });
    }
  });

  await page.goto('/fr/exercices/b21930ba/');
  await waitForPlayer(page);
  const prompts = await page
    .locator('[x-data*="seriesPlayer"]')
    .evaluate((el) => Alpine.$data(el).exercises.map((exercise) => exercise.voiceAudio));
  expect(prompts).toHaveLength(2);
  expect(prompts.every((clip) => typeof clip === 'string' && clip.startsWith('instructions/'))).toBe(true);

  await page.getByRole('button', { name: 'Commencer, avec le son' }).click();
  await expect.poll(() => responses.length).toBe(1);
  await page.locator('[x-data*="seriesPlayer"]').evaluate((el) => Alpine.$data(el).goTo(1));
  await page.getByRole('button', { name: 'Écouter la consigne' }).click();
  await expect.poll(() => responses.length).toBe(2);
  expect(responses.every(({ status }) => status === 200)).toBe(true);
});

test('CP object-count prompt has a prerecorded clip', async ({ page }) => {
  let clipResponse;
  page.on('response', (response) => {
    if (response.url().includes('/assets/audio/voice-pilot/objets/')) clipResponse = response;
  });

  await page.goto('/fr/applications/c2082e0e/');
  await waitForPlayer(page);
  const clip = await page.locator('[x-data*="seriesPlayer"]').evaluate((el) => Alpine.$data(el).cur.voiceAudio);
  expect(clip).toMatch(/^objets\/[a-z]+\.ogg$/);

  await page.getByRole('button', { name: 'Écouter la consigne' }).click();
  await expect.poll(() => clipResponse?.status()).toBe(200);
});

test('general read-aloud controls are absent', async ({ page }) => {
  await page.goto('/fr/exercices/e1721603/');
  await waitForPlayer(page);
  await expect(page.getByRole('button', { name: 'Écouter l’énoncé' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /lire les énoncés à voix haute/i })).toHaveCount(0);
});
