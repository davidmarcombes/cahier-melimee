/**
 * E2E smoke tests — one test per exercise type template.
 *
 * Each test navigates to a real series, waits for Alpine.js, then either:
 *   - submits a correct answer and asserts the success state, or
 *   - asserts the template renders its key visual element.
 *
 * Types with no exercises yet (base-10, fraction-paint, seq-verify,
 * click-blocks, svg-tiles, compare-groups, number-hunt, count-objects)
 * and column-op (template not wired into series-player) are excluded.
 */
import { test, expect } from '@playwright/test';

async function waitForAlpine(page) {
  // Wait for the main player container to be ready and visible
  await page.waitForSelector('[x-data*="seriesPlayer"]', { timeout: 8000 });
  await page.waitForFunction(() => {
    const el = document.querySelector('[x-data*="seriesPlayer"]');
    return el && typeof Alpine !== 'undefined' && Alpine.$data(el)._ready;
  }, { timeout: 4000 });
}

// ─── clock ────────────────────────────────────────────────────────────────────
// Series: heure-01 CE1 (f3a022b4) — ex1: 10 h 00, answer "10:00"
test.describe('clock — heure-01 CE1', () => {
  test('correct time answer marks exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/f3a022b4/');
    await waitForAlpine(page);
    // Clock face SVG is visible
    await expect(page.locator('svg circle').first()).toBeVisible();
    await page.getByRole('textbox', { name: 'Ta réponse' }).fill('10:00');
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

// ─── ruler ────────────────────────────────────────────────────────────────────
// Series: regle-graduee-01 CE1 (df12040a) — ex1: point A at 7, answer "7"
test.describe('ruler — regle-graduee-01 CE1', () => {
  test('correct ruler value marks exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/df12040a/');
    await waitForAlpine(page);
    // Ruler SVG rendered
    await expect(page.locator('svg[viewBox="0 0 500 90"]').first()).toBeVisible();
    await page.getByRole('textbox', { name: 'Ta réponse' }).fill('7');
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

// ─── fraction ─────────────────────────────────────────────────────────────────
// Series: lire-fraction-01 CE2 (a3f1d920) — ex1: 1/2 circle, answer "1/2"
test.describe('fraction — lire-fraction-01 CE2', () => {
  test('correct fraction answer marks exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/a3f1d920/');
    await waitForAlpine(page);
    await page.getByRole('textbox', { name: 'Ta réponse' }).fill('1/2');
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

// ─── problem ──────────────────────────────────────────────────────────────────
// Series: quotidien-01 CP (c25790a9) — ex1: pommes de Léo, answer "5"
test.describe('problem — quotidien-01 CP', () => {
  test('correct numeric answer marks exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/c25790a9/');
    await waitForAlpine(page);
    await page.getByRole('textbox', { name: 'Ta réponse' }).fill('5');
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

// ─── number-line (read mode) ──────────────────────────────────────────────────
// Series: droite-graduee-01 CE1 (b76399b4) — ex1: read point A = 7
test.describe('number-line — droite-graduee-01 CE1', () => {
  test('correct value for labeled point marks exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/b76399b4/');
    await waitForAlpine(page);
    // Number line SVG is visible
    await expect(page.locator('svg[viewBox="0 0 500 90"]').first()).toBeVisible();
    await page.getByRole('textbox', { name: 'Ta réponse' }).fill('7');
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

// ─── sequence ─────────────────────────────────────────────────────────────────
// Series: suites-01 CE1 (ffaa8232) — ex1: 200,210,220,___,___,___ → 230,240,250
test.describe('sequence — suites-01 CE1', () => {
  test('correct sequence marks exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/ffaa8232/');
    await waitForAlpine(page);
    const inputs = page.locator('.js-seq input');
    await inputs.nth(0).fill('230');
    await inputs.nth(1).fill('240');
    await inputs.nth(2).fill('250');
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

// ─── bounding ─────────────────────────────────────────────────────────────────
// Series: encadrement-01 CE1 (b4dee3bc) — ex1: ___ < 125 < ___ (120, 130)
test.describe('bounding — encadrement-01 CE1', () => {
  test('correct bounds mark exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/b4dee3bc/');
    await waitForAlpine(page);
    const inputs = page.locator('.js-seq input');
    await inputs.nth(0).fill('120');
    await inputs.nth(1).fill('130');
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

// ─── convert ──────────────────────────────────────────────────────────────────
// Series: durees-01 CE1 (ad885698) — ex2 (#2): 1h=60min, 2h=120min, 3h=180min
test.describe('convert — durees-01 CE1', () => {
  test('correct conversions mark exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/ad885698/#2');
    await waitForAlpine(page);
    const inputs = page.locator('.js-seq input');
    await inputs.nth(0).fill('60');
    await inputs.nth(1).fill('120');
    await inputs.nth(2).fill('180');
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

// ─── fraction-check ───────────────────────────────────────────────────────────
// Series: ecrire-fraction-01 CE2 (d4e5f6b8) — ex1: 1 part / 2 → 1/2
test.describe('fraction-check — ecrire-fraction-01 CE2', () => {
  test('correct numerator and denominator mark exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/d4e5f6b8/');
    await waitForAlpine(page);
    await page.getByRole('textbox', { name: 'Numérateur' }).fill('1');
    await page.getByRole('textbox', { name: 'Dénominateur' }).fill('2');
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

// ─── true-false ───────────────────────────────────────────────────────────────
// Series: angle-droit-01 CE1 (c6309e42) — ex1: answers [T,T,F,T,F]
test.describe('true-false — angle-droit-01 CE1', () => {
  test('correct V/F selections mark exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/c6309e42/');
    await waitForAlpine(page);
    const vrai = page.getByRole('button', { name: 'Vrai' });
    const faux = page.getByRole('button', { name: 'Faux' });
    await vrai.nth(0).click();
    await vrai.nth(1).click();
    await faux.nth(2).click();
    await vrai.nth(3).click();
    await faux.nth(4).click();
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

// ─── matching ─────────────────────────────────────────────────────────────────
// Series: solides-01 CE1 (a92789a5) — ex1: solids and their properties
test.describe('matching — solides-01 CE1', () => {
  test('left and right pair columns are rendered', async ({ page }) => {
    await page.goto('/fr/exercices/a92789a5/');
    await waitForAlpine(page);
    await expect(page.getByText('Cube')).toBeVisible();
    await expect(page.getByText('Pyramide')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Vérifier' })).toBeVisible();
  });
});

// ─── multi-question ───────────────────────────────────────────────────────────
// Series: calendrier-01 CE1 (a0a35d04) — ex1: march 2025 calendar
// Q0: "Quel jour le 1er mars ?" → "samedi"
// Q1: "Combien de dimanches ?" → "5"
test.describe('multi-question — calendrier-01 CE1', () => {
  test('answering all sub-questions marks exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/a0a35d04/');
    await waitForAlpine(page);
    const inputs = page.locator('input');
    await inputs.nth(0).fill('samedi');
    await inputs.nth(0).press('Enter');
    await inputs.nth(1).fill('5');
    await inputs.nth(1).press('Enter');
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

// ─── checkbox ─────────────────────────────────────────────────────────────────
// Series: paralleles-perpendiculaires-01 CE2 (d63bf7ba)
// ex1: checkedAnswers [0,2,3,4] out of 5 statements
test.describe('checkbox — paralleles-perpendiculaires-01 CE2', () => {
  test('checking correct statements marks exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/d63bf7ba/');
    await waitForAlpine(page);
    // Statement buttons are inside .space-y-2
    const stmts = page.locator('.space-y-2 button');
    await stmts.nth(0).click();
    await stmts.nth(2).click();
    await stmts.nth(3).click();
    await stmts.nth(4).click();
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

// ─── pyramid ──────────────────────────────────────────────────────────────────
// Series: pyramides-01 CE1 (c0c2c0ad) — ex1: base [2,5,3,4], top 30
// Missing cells (row order top→bottom): 15, 15, 7, 7
test.describe('pyramid — pyramides-01 CE1', () => {
  test('filling all blank cells marks exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/c0c2c0ad/');
    await waitForAlpine(page);
    // Only visible inputs are the blank cells (given cells are divs, not inputs)
    const inputs = page.locator('input:visible');
    await inputs.nth(0).fill('15');
    await inputs.nth(1).fill('15');
    await inputs.nth(2).fill('7');
    await inputs.nth(3).fill('7');
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

// ─── select ───────────────────────────────────────────────────────────────────
// Series: figures-02 CE1 (d2a8f103) — ex1: fill 4 dropdowns
// "Un ___ a 3 côtés" → triangle, "Un carré a ___ côtés" → 4, etc.
test.describe('select — figures-02 CE1', () => {
  test('selecting correct options marks exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/d2a8f103/');
    await waitForAlpine(page);
    const selects = page.locator('select');
    await selects.nth(0).selectOption('triangle');
    await selects.nth(1).selectOption('4');
    await selects.nth(2).selectOption('cercle');
    await selects.nth(3).selectOption('4');
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

// ─── sort ─────────────────────────────────────────────────────────────────────
// Series: ordonner-01 CE2 (dd2805e3) — ex1: sort 124, 241, 412, 214 ascending
test.describe('sort — ordonner-01 CE2', () => {
  test('tile pool is rendered with shuffled numbers', async ({ page }) => {
    await page.goto('/fr/exercices/dd2805e3/');
    await waitForAlpine(page);
    // Pool has tiles for each item
    await expect(page.getByText('124')).toBeVisible();
    await expect(page.getByText('241')).toBeVisible();
    // Vérifier only appears after all tiles placed — not yet visible
    await expect(page.getByRole('button', { name: 'Vérifier' })).not.toBeVisible();
  });

  test('placing all tiles in correct order marks exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/dd2805e3/');
    await waitForAlpine(page);
    // Click tiles in the expected order (matches cur.items YAML order: 124, 241, 412, 214)
    for (const n of ['124', '241', '412', '214']) {
      await page.locator('button').filter({ hasText: new RegExp(`^\\s*${n}\\s*$`) }).first().click();
    }
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

// ─── drag-sort ────────────────────────────────────────────────────────────────
// Series: fractions-comparer-01 CE2 (d8e9f0a1) — ex3 (#3): drag-sort fractions
test.describe('drag-sort — fractions-comparer-01 CE2', () => {
  test('fraction tiles are rendered', async ({ page }) => {
    await page.goto('/fr/exercices/d8e9f0a1/#3');
    await waitForAlpine(page);
    // All three fraction tiles visible
    await expect(page.getByText('1/4')).toBeVisible();
    await expect(page.getByText('1/3')).toBeVisible();
    await expect(page.getByText('1/2')).toBeVisible();
  });

  test('clicking a tile selects it and shows swap hint', async ({ page }) => {
    await page.goto('/fr/exercices/d8e9f0a1/#3');
    await waitForAlpine(page);
    // Click any tile — should show swap hint
    await page.locator('button').filter({ hasText: '1/4' }).first().click();
    await expect(page.getByText('Clique sur une autre case pour échanger')).toBeVisible();
  });
});

// ─── tile-select ──────────────────────────────────────────────────────────────
// Series: somme-100-01 CE2 (b3e1f0a2) — generated tiles summing to 100
test.describe('tile-select — somme-100-01 CE2', () => {
  test('tile grid renders', async ({ page }) => {
    await page.goto('/fr/applications/b3e1f0a2/');
    await waitForAlpine(page);
    // At least one tile button rendered
    await expect(page.locator('button').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Vérifier' })).toBeVisible();
  });
});

// ─── fill-table ───────────────────────────────────────────────────────────────
// Series: suite-nombres-01 CE1 (06fa1711) — generated number sequence table
test.describe('fill-table — suite-nombres-01 CE1', () => {
  test('table with blank cells renders', async ({ page }) => {
    await page.goto('/fr/applications/ab304efb/');
    await waitForAlpine(page);
    // Table is rendered and verify button is present
    await expect(page.locator('table').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Vérifier' })).toBeVisible();
  });
});

// ─── logic-grid ───────────────────────────────────────────────────────────────
// Series: grille-01 CE1 (ed716734) — ex1: 3×3 grid, Enzo→Bleu, Maël→Rouge, Camille→Vert
// rows=[Rouge,Bleu,Vert], columns=[Enzo,Maël,Camille]
// Click twice to set ✓: (r=1,c=0)=Bleu/Enzo, (r=0,c=1)=Rouge/Maël, (r=2,c=2)=Vert/Camille
test.describe('logic-grid — grille-01 CE1', () => {
  test('solving the grid auto-validates and marks exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/ed716734/');
    await waitForAlpine(page);
    const cells = page.locator('td button');
    // (row 1, col 0) = Bleu / Enzo: flat index 3 → click twice for ✓
    await cells.nth(3).click();
    await cells.nth(3).click();
    // (row 0, col 1) = Rouge / Maël: flat index 1
    await cells.nth(1).click();
    await cells.nth(1).click();
    // (row 2, col 2) = Vert / Camille: flat index 8 — triggers auto-check
    await cells.nth(8).click();
    await cells.nth(8).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

// ─── compare ──────────────────────────────────────────────────────────────────
// Series: fractions-comparer-01 CE2 (d8e9f0a1) — ex2 (#2): compare 5 fraction pairs
// Answers: >, <, <, >, >  (cycling: 1 click = >, 2 clicks = <)
test.describe('compare — fractions-comparer-01 CE2', () => {
  test('cycling comparison buttons and verifying marks exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/d8e9f0a1/#2');
    await waitForAlpine(page);
    // Get the 5 cycling buttons (show '?' initially, cycle ><?=)
    // They are inside the compare section, before the Vérifier button
    const cmpSection = page.locator('[x-show="cur.type === \'compare\'"]');
    const cmpBtns = cmpSection.locator('button').filter({ hasText: /^[?><= ]+$/ });
    // answers: >, <, <, >, >
    await cmpBtns.nth(0).click();                    // → >
    await cmpBtns.nth(1).click(); await cmpBtns.nth(1).click(); // → <
    await cmpBtns.nth(2).click(); await cmpBtns.nth(2).click(); // → <
    await cmpBtns.nth(3).click();                    // → >
    await cmpBtns.nth(4).click();                    // → >
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

// ─── coordinate-grid ──────────────────────────────────────────────────────────
// Series: quadrillage-lire-01 CE1 (c8ef203b) — ex1: point A at (2,3)
test.describe('coordinate-grid — quadrillage-lire-01 CE1', () => {
  test('correct (x,y) coordinates mark exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/c8ef203b/');
    await waitForAlpine(page);
    await page.getByRole('textbox', { name: 'Abscisse x' }).fill('2');
    await page.getByRole('textbox', { name: 'Ordonnée y' }).fill('3');
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

// ─── bar-chart ────────────────────────────────────────────────────────────────
// Series: donnees-01 CE1 (ff5a382e) — ex1: build chart for 4 categories
test.describe('bar-chart — donnees-01 CE1', () => {
  test('bar chart columns with labels are rendered', async ({ page }) => {
    await page.goto('/fr/exercices/ff5a382e/');
    await waitForAlpine(page);
    // Category labels visible
    await expect(page.getByText('Chat', { exact: true })).toBeVisible();
    await expect(page.getByText('Chien', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Vérifier' })).toBeVisible();
  });
});

// ─── decodage-emojis ─────────────────────────────────────────────────────────
// Generated: each exercise has a code table + emoji equation
test.describe('decodage-emojis — CP', () => {
  test('code table and operation render with input', async ({ page }) => {
    await page.goto('/fr/applications/f9cd979c/');
    await waitForAlpine(page);
    // Title contains "Décode et calcule" and code table badges
    await expect(page.locator('h1')).toContainText('Décode et calcule');
    // Code table badges visible (emoji = digit)
    await expect(page.locator('h1 .inline-block').first()).toBeVisible();
    // Operation with input field visible (trouParts input)
    await expect(page.locator('input[placeholder="?"]:visible')).toBeVisible();
    // Vérifier button present
    await expect(page.getByRole('button', { name: 'Vérifier' })).toBeVisible();
  });

  test('correct answer marks exercise solved', async ({ page }) => {
    await page.goto('/fr/applications/f9cd979c/');
    await waitForAlpine(page);
    // Read the code table and operation from the DOM, compute the answer
    const answer = await page.evaluate(() => {
      // Parse code table: "emoji = N" badges
      const badges = document.querySelectorAll('h1 .inline-block');
      const code = {};
      badges.forEach(b => {
        const m = b.textContent.match(/(.+)\s*=\s*(\d+)/);
        if (m) code[m[1].trim()] = Number(m[2]);
      });
      // Get operation text from innerText (respects visibility, no duplicates)
      let opText = document.querySelector('.js-trou').innerText;
      // Replace emojis with their values
      for (const [emoji, val] of Object.entries(code)) {
        opText = opText.split(emoji).join(String(val));
      }
      // Clean up and evaluate: "5 + 3 = ?" → eval("5 + 3")
      opText = opText.replace(/[=?]/g, '').replace(/×/g, '*').replace(/−/g, '-').trim();
      try { return String(eval(opText)); } catch { return null; }
    });
    await page.locator('input[placeholder="?"]:visible').fill(answer);
    await page.keyboard.press('Enter');
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

test.describe('decodage-emojis — CM2 (3 emojis)', () => {
  test('code table shows 3 emoji badges', async ({ page }) => {
    await page.goto('/fr/applications/be6bb77f/');
    await waitForAlpine(page);
    const badges = page.locator('h1 .inline-block');
    await expect(badges).toHaveCount(3);
  });
});

// ─── decodage-monstres ───────────────────────────────────────────────────────
// Generated: monster emojis as digits forming multi-digit numbers
test.describe('decodage-monstres — CE2 (2-digit)', () => {
  test('code table and multi-digit operation render', async ({ page }) => {
    await page.goto('/fr/applications/a34a742a/');
    await waitForAlpine(page);
    await expect(page.locator('h1')).toContainText('Décode et calcule');
    // At least 4 monster emoji badges in code table
    const badges = page.locator('h1 .inline-block');
    await expect(badges).toHaveCount(4);
    await expect(page.locator('input[placeholder="?"]:visible')).toBeVisible();
  });

  test('correct answer marks exercise solved', async ({ page }) => {
    await page.goto('/fr/applications/a34a742a/');
    await waitForAlpine(page);
    // Parse code table and operation from DOM to compute answer
    const answer = await page.evaluate(() => {
      const badges = document.querySelectorAll('h1 .inline-block');
      const code = {};
      badges.forEach(b => {
        const m = b.textContent.match(/(.+)\s*=\s*(\d+)/);
        if (m) code[m[1].trim()] = m[2];
      });
      // In digit mode, emojis form multi-digit numbers (concatenated digits)
      let opText = document.querySelector('.js-trou').innerText;
      // Replace each emoji with its digit
      for (const [emoji, digit] of Object.entries(code)) {
        opText = opText.split(emoji).join(digit);
      }
      opText = opText.replace(/[=?]/g, '').replace(/×/g, '*').replace(/−/g, '-').trim();
      try { return String(eval(opText)); } catch { return null; }
    });
    await page.locator('input[placeholder="?"]:visible').fill(answer);
    await page.keyboard.press('Enter');
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

test.describe('decodage-monstres — CM2 (3-digit)', () => {
  test('code table shows 6 monster badges', async ({ page }) => {
    await page.goto('/fr/applications/e7def21d/');
    await waitForAlpine(page);
    const badges = page.locator('h1 .inline-block');
    await expect(badges).toHaveCount(6);
  });
});

// ─── function-machine (compute) ─────────────────────────────────────────────
// Series: machine-fonctions CE2 (438aaff0) — generated: input → rule → ?
test.describe('function-machine compute — machine-fonctions CE2', () => {
  test('machine renders with input, rule, and output field', async ({ page }) => {
    await page.goto('/fr/applications/db3c2148/');
    await waitForAlpine(page);
    // Input box, rule label, and output input rendered
    await expect(page.getByText('Entrée', { exact: true })).toBeVisible();
    await expect(page.getByText('Règle', { exact: true })).toBeVisible();
    await expect(page.getByText('Sortie', { exact: true })).toBeVisible();
    await expect(page.locator('input[placeholder="?"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Vérifier' })).toBeVisible();
  });

  test('correct answer marks exercise solved', async ({ page }) => {
    await page.goto('/fr/applications/db3c2148/');
    await waitForAlpine(page);
    // Read the expected answer from Alpine data
    const answer = await page.evaluate(() => {
      const el = document.querySelector('[x-data*="seriesPlayer"]');
      const data = Alpine.$data(el);
      return String(data.cur.machine.answer);
    });
    await page.locator('input[placeholder="?"]').fill(answer);
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

// ─── function-machine (discover) ────────────────────────────────────────────
// Series: machine-decouverte CE2 (0ca8524c) — generated: pairs table + MCQ
test.describe('function-machine discover — machine-decouverte CE2', () => {
  test('pairs table and rule choices render', async ({ page }) => {
    await page.goto('/fr/applications/f9226edf/');
    await waitForAlpine(page);
    // Pairs table with Entrée/Sortie headers
    await expect(page.locator('table').first()).toBeVisible();
    await expect(page.getByText('Entrée', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Sortie', { exact: true }).first()).toBeVisible();
    // 4 MCQ rule choice buttons in 2×2 grid
    const choices = page.locator('.grid-cols-2 button');
    await expect(choices).toHaveCount(4);
  });

  test('clicking correct rule marks exercise solved', async ({ page }) => {
    await page.goto('/fr/applications/f9226edf/');
    await waitForAlpine(page);
    // Read the correct answer index from Alpine data
    const answerIdx = await page.evaluate(() => {
      const el = document.querySelector('[x-data*="seriesPlayer"]');
      const data = Alpine.$data(el);
      return data.cur.machine.answer;
    });
    const choices = page.locator('.grid-cols-2 button');
    await choices.nth(answerIdx).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

// ─── maze ────────────────────────────────────────────────────────────────────
// Series: labyrinthe-pairs CE2 (7477702d) — generated: path through even numbers
test.describe('maze — labyrinthe-pairs CE2', () => {
  test('grid, rule label, and legend render', async ({ page }) => {
    await page.goto('/fr/applications/d60d4763/');
    await waitForAlpine(page);
    // Expect rule label from data to be visible
    const ruleLabel = await page.evaluate(() => {
      const el = document.querySelector('[x-data*="seriesPlayer"]');
      return Alpine.$data(el).cur.maze.ruleLabel;
    });
    await expect(page.getByText(ruleLabel)).toBeVisible();

    // Grid buttons rendered (4×4 = 16 cells)
    const cells = page.locator('.inline-grid button');
    await expect(cells).toHaveCount(16);
    // Legend markers
    await expect(page.getByText('Départ', { exact: true })).toBeVisible();
    await expect(page.getByText('Arrivée', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Vérifier' })).toBeVisible();
  });

  test('clicking start cell adds it to path', async ({ page }) => {
    await page.goto('/fr/applications/d60d4763/');
    await waitForAlpine(page);
    // Click the first cell (start = [0,0])
    const cells = page.locator('.inline-grid button');
    await cells.nth(0).click();
    // Cell should now have primary color ring indicating it's in the path
    await expect(cells.nth(0)).toHaveClass(/ring-2/);
  });
});

// ─── futoshiki ────────────────────────────────────────────────────────────────
// Series: futoshiki-4x4 CE2 (a3f7c2e1) — generated 4×4 puzzle
test.describe('futoshiki — futoshiki-4x4 CE2', () => {
  test('grid renders with inputs and Vérifier button', async ({ page }) => {
    await page.goto('/fr/applications/a3f7c2e1/');
    await waitForAlpine(page);
    // Wait for futoshiki section to be visible
    const section = page.locator('[x-show="cur.type === \'futoshiki\'"]');
    await expect(section).toBeVisible();
    // Vérifier button present
    await expect(page.getByRole('button', { name: 'Vérifier' })).toBeVisible();
    // Blank input cells exist (not all cells are givens)
    const inputs = section.locator('input[inputmode="numeric"]');
    await expect(inputs.first()).toBeVisible();
  });

  test('filling correct solution marks exercise solved', async ({ page }) => {
    await page.goto('/fr/applications/a3f7c2e1/');
    await waitForAlpine(page);
    await page.evaluate(() => {
      const el = document.querySelector('[x-data*="seriesPlayer"]');
      const data = Alpine.$data(el);
      const sol = data.cur._solution;
      const size = data.cur.futoshiki.size;
      const inputs = Array(size * size).fill('');
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          inputs[r * size + c] = String(sol[r][c]);
      data.futoInputs = inputs;
    });
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });

  test('wrong fill triggers error state', async ({ page }) => {
    await page.goto('/fr/applications/a3f7c2e1/');
    await waitForAlpine(page);
    await page.evaluate(() => {
      const el = document.querySelector('[x-data*="seriesPlayer"]');
      const data = Alpine.$data(el);
      const size = data.cur.futoshiki.size;
      data.futoInputs = Array(size * size).fill('1');
    });
    await page.getByRole('button', { name: 'Vérifier' }).click();
    // futoErrors should have entries
    const hasErrors = await page.evaluate(() => {
      const el = document.querySelector('[x-data*="seriesPlayer"]');
      return Alpine.$data(el).futoErrors.length > 0;
    });
    expect(hasErrors).toBe(true);
  });
});

// ─── kenken ───────────────────────────────────────────────────────────────────
// Series: kenken-3x3 CE2 (d1f5e8c4) — generated 3×3 puzzle
test.describe('kenken — kenken-3x3 CE2', () => {
  test('grid renders with cage labels and Vérifier button', async ({ page }) => {
    await page.goto('/fr/applications/d1f5e8c4/');
    await waitForAlpine(page);
    const section = page.locator('[x-show="cur.type === \'kenken\'"]');
    await expect(section).toBeVisible();
    // Vérifier button visible
    await expect(page.getByRole('button', { name: 'Vérifier' })).toBeVisible();
    // Grid renders: at least one input cell is visible inside the kenken section
    const inputs = section.locator('input[inputmode="numeric"]');
    await expect(inputs.first()).toBeVisible();
  });

  test('filling correct solution marks exercise solved', async ({ page }) => {
    await page.goto('/fr/applications/d1f5e8c4/');
    await waitForAlpine(page);
    // Fill all inputs with the correct solution via Alpine
    await page.evaluate(() => {
      const el = document.querySelector('[x-data*="seriesPlayer"]');
      const data = Alpine.$data(el);
      const sol = data.cur._solution;
      const size = data.cur.kenken.size;
      data.kkInputs = sol.flat().map(String);
    });
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });

  test('wrong solution triggers error highlighting', async ({ page }) => {
    await page.goto('/fr/applications/d1f5e8c4/');
    await waitForAlpine(page);
    // Fill all cells with '1' (definitely wrong for size 3 with latin square constraint)
    await page.evaluate(() => {
      const el = document.querySelector('[x-data*="seriesPlayer"]');
      const data = Alpine.$data(el);
      const size = data.cur.kenken.size;
      data.kkInputs = Array(size * size).fill('1');
    });
    await page.getByRole('button', { name: 'Vérifier' }).click();
    // Error state: kkErrors should have entries
    const hasErrors = await page.evaluate(() => {
      const el = document.querySelector('[x-data*="seriesPlayer"]');
      return Alpine.$data(el).kkErrors.length > 0;
    });
    expect(hasErrors).toBe(true);
  });
});

// ─── numberlink ───────────────────────────────────────────────────────────────
// Series: numberlink-4x4 CE2 (b5c3e7f2) — generated 4×4 puzzle
test.describe('numberlink — numberlink-4x4 CE2', () => {
  test('grid renders with numbered endpoints and reset button', async ({ page }) => {
    await page.goto('/fr/applications/b5c3e7f2/');
    await waitForAlpine(page);
    const section = page.locator('[x-show="cur.type === \'numberlink\'"]');
    await expect(section).toBeVisible();
    // Grid buttons visible (size × size)
    const size = await page.evaluate(() => {
      const el = document.querySelector('[x-data*="seriesPlayer"]');
      return Alpine.$data(el).cur.numberlink.size;
    });
    const cells = page.locator('.inline-grid button');
    await expect(cells).toHaveCount(size * size);
    await expect(page.getByRole('button', { name: 'Effacer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Vérifier' })).toBeVisible();
  });

  test('tapping an endpoint starts a path', async ({ page }) => {
    await page.goto('/fr/applications/b5c3e7f2/');
    await waitForAlpine(page);
    // Find first endpoint cell index via Alpine data
    const endpointIdx = await page.evaluate(() => {
      const el = document.querySelector('[x-data*="seriesPlayer"]');
      const { cur } = Alpine.$data(el);
      const rows = cur.numberlink.rows;
      for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < rows[r].length; c++) {
          if (rows[r][c] > 0) return r * rows[r].length + c;
        }
      }
      return 0;
    });
    await page.locator('.inline-grid button').nth(endpointIdx).click();
    // After tapping an endpoint, nlkActive should be set
    const active = await page.evaluate(() => {
      const el = document.querySelector('[x-data*="seriesPlayer"]');
      return Alpine.$data(el).nlkActive;
    });
    expect(active).not.toBeNull();
  });

  test('reset button clears all paths', async ({ page }) => {
    await page.goto('/fr/applications/b5c3e7f2/');
    await waitForAlpine(page);
    // Find and tap first endpoint to start a path
    const endpointIdx = await page.evaluate(() => {
      const el = document.querySelector('[x-data*="seriesPlayer"]');
      const { cur } = Alpine.$data(el);
      const rows = cur.numberlink.rows;
      for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < rows[r].length; c++) {
          if (rows[r][c] > 0) return r * rows[r].length + c;
        }
      }
      return 0;
    });
    await page.locator('.inline-grid button').nth(endpointIdx).click();
    // Reset
    await page.getByRole('button', { name: 'Effacer' }).click();
    // nlkActive should be null
    const active = await page.evaluate(() => {
      const el = document.querySelector('[x-data*="seriesPlayer"]');
      return Alpine.$data(el).nlkActive;
    });
    expect(active).toBeNull();
  });

  test('colour legend shows one swatch per pair', async ({ page }) => {
    await page.goto('/fr/applications/b5c3e7f2/');
    await waitForAlpine(page);
    const pairCount = await page.evaluate(() => {
      const el = document.querySelector('[x-data*="seriesPlayer"]');
      return Alpine.$data(el).cur.numberlink.pairs.length;
    });
    // Each pair has a swatch div in the legend
    const swatches = page.locator('.flex.gap-3 .rounded.border-2');
    await expect(swatches).toHaveCount(pairCount);
  });
});

// ─── venn ────────────────────────────────────────────────────────────────────
// Series: venn-emojis CE2 (585d15f8) — generated: classify emojis
test.describe('venn — venn-emojis CE2', () => {
  test('circles, labels, item bank, and outside zone render', async ({ page }) => {
    await page.goto('/fr/applications/b30fee39/');
    await waitForAlpine(page);
    // SVG ellipses (circles) visible
    await expect(page.locator('svg ellipse').first()).toBeVisible();
    // Item bank has emoji buttons (at least 5)
    const bank = page.locator('button[x-show="!vennPlacements[i]"]');
    await expect(bank.first()).toBeVisible();
    const count = await bank.count();
    expect(count).toBeGreaterThanOrEqual(1); // Some items might be generated
    // Outside zone text
    await expect(page.getByText('Ni l\'un ni l\'autre')).toBeVisible();
  });

  test('selecting and placing an emoji works', async ({ page }) => {
    await page.goto('/fr/applications/b30fee39/');
    await waitForAlpine(page);
    // Click first emoji in bank to select it
    const bankItems = page.locator('button[x-show="!vennPlacements[i]"]');
    const firstEmoji = bankItems.first();
    await firstEmoji.click();
    // Should have selection ring
    await expect(firstEmoji).toHaveClass(/ring-2/);
  });
});
