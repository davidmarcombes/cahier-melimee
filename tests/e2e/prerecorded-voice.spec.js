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

test('GS one-to-one pairing instructions are generated and playable', async ({ page }) => {
  const responses = [];
  page.on('response', (response) => {
    if (response.url().includes('/assets/audio/voice-pilot/instructions/')) {
      responses.push({ url: response.url(), status: response.status() });
    }
  });

  await page.goto('/fr/exercices/e5f80d40/');
  await waitForPlayer(page);
  const prompts = await page
    .locator('[x-data*="seriesPlayer"]')
    .evaluate((el) => Alpine.$data(el).exercises.map((exercise) => exercise.voiceAudio));
  expect(prompts).toHaveLength(5);
  expect(prompts.every((clip) => typeof clip === 'string' && clip.startsWith('instructions/'))).toBe(true);

  const player = page.locator('[x-data*="seriesPlayer"]');
  await page.getByRole('button', { name: 'Commencer, avec le son' }).click();
  for (let index = 1; index < prompts.length; index++) {
    await player.evaluate((el, exerciseIndex) => Alpine.$data(el).goTo(exerciseIndex), index);
    await page.getByRole('button', { name: 'Écouter la consigne' }).click();
  }
  await expect
    .poll(() => prompts.filter((clip) => responses.some(({ url }) => url.endsWith(`/${clip}`))).length)
    .toBe(prompts.length);
  expect(responses.every(({ status }) => status === 200)).toBe(true);
});

test('GS visible-part series has five playable prerecorded instructions', async ({ page }) => {
  const responses = [];
  page.on('response', (response) => {
    if (response.url().includes('/assets/audio/voice-pilot/instructions/')) {
      responses.push({ url: response.url(), status: response.status() });
    }
  });
  await page.goto('/fr/exercices/a0bc2538/');
  await waitForPlayer(page);
  const player = page.locator('[x-data*="seriesPlayer"]');
  const prompts = await player.evaluate((el) => Alpine.$data(el).exercises.map((exercise) => exercise.voiceAudio));
  expect(prompts).toHaveLength(5);
  expect(prompts.every((clip) => typeof clip === 'string' && clip.startsWith('instructions/'))).toBe(true);
  await page.getByRole('button', { name: 'Commencer, avec le son' }).click();
  for (let index = 1; index < prompts.length; index++) {
    await player.evaluate((el, exerciseIndex) => Alpine.$data(el).goTo(exerciseIndex), index);
    await page.getByRole('button', { name: 'Écouter la consigne' }).click();
  }
  await expect
    .poll(() => prompts.filter((clip) => responses.some(({ url }) => url.endsWith(`/${clip}`))).length)
    .toBe(prompts.length);
  expect(responses.every(({ status }) => status === 200)).toBe(true);
});

test('GS length series compares two objects and orders three with playable instructions', async ({ page }) => {
  const responses = [];
  page.on('response', (response) => {
    if (response.url().includes('/assets/audio/voice-pilot/instructions/')) {
      responses.push({ url: response.url(), status: response.status() });
    }
  });
  await page.goto('/fr/exercices/ab350f6a/');
  await waitForPlayer(page);
  const player = page.locator('[x-data*="seriesPlayer"]');
  const data = await player.evaluate((el) =>
    Alpine.$data(el).exercises.map((exercise) => ({
      type: exercise.type,
      voiceAudio: exercise.voiceAudio,
      objectCount: exercise.svg?.par?.objects?.length,
      objectLengths: exercise.svg?.par?.objects?.map((object) => Number(object.length)),
      items: exercise.items,
    }))
  );
  expect(data).toHaveLength(5);
  expect(data.map(({ type }) => type)).toEqual(['mcq', 'mcq', 'mcq', 'sort', 'sort']);
  expect(data.map(({ objectCount }) => objectCount)).toEqual([2, 2, 2, 3, 3]);
  expect(data[0].objectLengths).toEqual([18, 65]);
  expect(data.slice(3).map(({ items }) => items)).toEqual([
    ['✏️', '📏', '🥖'],
    ['📏', '🥖', '🐍'],
  ]);
  expect(data.every(({ voiceAudio }) => voiceAudio?.startsWith('instructions/'))).toBe(true);

  const diagram = player.locator('svg[aria-label="Longueurs des objets"]:visible').first();
  const lengths = async () =>
    diagram
      .locator('line[stroke-width="14"]')
      .evaluateAll((lines) => lines.map((line) => Number(line.getAttribute('x2')) - Number(line.getAttribute('x1'))));
  expect(await lengths()).toHaveLength(2);
  expect((await lengths())[0]).toBeLessThan((await lengths())[1]);

  await page.getByRole('button', { name: 'Commencer, avec le son' }).click();
  await expect.poll(() => player.evaluate((el) => Alpine.$data(el).voiceMissing)).toBe(false);
  for (let index = 1; index < data.length; index++) {
    await player.evaluate((el, exerciseIndex) => Alpine.$data(el).goTo(exerciseIndex), index);
    await page.getByRole('button', { name: /Écouter la consigne/ }).click();
    await expect.poll(() => player.evaluate((el) => Alpine.$data(el).voiceMissing)).toBe(false);
  }
  await player.evaluate((el) => Alpine.$data(el).goTo(3));
  await expect(diagram.locator('line[stroke-width="14"]')).toHaveCount(3);
  const orderDiagramLengths = await lengths();
  expect(orderDiagramLengths[0]).toBeLessThan(orderDiagramLengths[1]);
  expect(orderDiagramLengths[1]).toBeLessThan(orderDiagramLengths[2]);
  await expect
    .poll(() => data.filter(({ voiceAudio }) => responses.some(({ url }) => url.endsWith(`/${voiceAudio}`))).length)
    .toBe(data.length);
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
