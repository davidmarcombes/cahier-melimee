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
  await page.waitForSelector('[x-data]:not([x-cloak])', { timeout: 8000 });
}

// ─── clock ────────────────────────────────────────────────────────────────────
// Series: heure-01 CE1 (2301152e) — ex1: 10 h 00, answer "10:00"
test.describe('clock — heure-01 CE1', () => {
  test('correct time answer marks exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/2301152e/');
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
// Series: quotidien-01 CP (658513c4) — ex1: pommes de Léo, answer "5"
test.describe('problem — quotidien-01 CP', () => {
  test('correct numeric answer marks exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/658513c4/');
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
// Series: encadrement-01 CE1 (46662d3a) — ex1: ___ < 125 < ___ (120, 130)
test.describe('bounding — encadrement-01 CE1', () => {
  test('correct bounds mark exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/46662d3a/');
    await waitForAlpine(page);
    const inputs = page.locator('.js-seq input');
    await inputs.nth(0).fill('120');
    await inputs.nth(1).fill('130');
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

// ─── convert ──────────────────────────────────────────────────────────────────
// Series: durees-01 CE1 (75220261) — ex2 (#2): 1h=60min, 2h=120min, 3h=180min
test.describe('convert — durees-01 CE1', () => {
  test('correct conversions mark exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/75220261/#2');
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
// Series: angle-droit-01 CE1 (41912cab) — ex1: answers [T,T,F,T,F]
test.describe('true-false — angle-droit-01 CE1', () => {
  test('correct V/F selections mark exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/41912cab/');
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
// Series: solides-01 CE1 (1c382e0b) — ex1: solids and their properties
test.describe('matching — solides-01 CE1', () => {
  test('left and right pair columns are rendered', async ({ page }) => {
    await page.goto('/fr/exercices/1c382e0b/');
    await waitForAlpine(page);
    await expect(page.getByText('Cube')).toBeVisible();
    await expect(page.getByText('Pyramide')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Vérifier' })).toBeVisible();
  });
});

// ─── multi-question ───────────────────────────────────────────────────────────
// Series: calendrier-01 CE1 (8c066810) — ex1: march 2025 calendar
// Q0: "Quel jour le 1er mars ?" → "samedi"
// Q1: "Combien de dimanches ?" → "5"
test.describe('multi-question — calendrier-01 CE1', () => {
  test('answering all sub-questions marks exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/8c066810/');
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
// Series: paralleles-perpendiculaires-01 CE2 (0e912db0)
// ex1: checkedAnswers [0,2,3,4] out of 5 statements
test.describe('checkbox — paralleles-perpendiculaires-01 CE2', () => {
  test('checking correct statements marks exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/0e912db0/');
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
// Series: pyramides-01 CE1 (411862ee) — ex1: base [2,5,3,4], top 30
// Missing cells (row order top→bottom): 15, 15, 7, 7
test.describe('pyramid — pyramides-01 CE1', () => {
  test('filling all blank cells marks exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/411862ee/');
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
    await page.goto('/fr/applications/06fa1711/');
    await waitForAlpine(page);
    // Table is rendered and verify button is present
    await expect(page.locator('table').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Vérifier' })).toBeVisible();
  });
});

// ─── logic-grid ───────────────────────────────────────────────────────────────
// Series: grille-01 CE1 (13f0385a) — ex1: 3×3 grid, Enzo→Bleu, Maël→Rouge, Camille→Vert
// rows=[Rouge,Bleu,Vert], columns=[Enzo,Maël,Camille]
// Click twice to set ✓: (r=1,c=0)=Bleu/Enzo, (r=0,c=1)=Rouge/Maël, (r=2,c=2)=Vert/Camille
test.describe('logic-grid — grille-01 CE1', () => {
  test('solving the grid auto-validates and marks exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/13f0385a/');
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
// Series: quadrillage-lire-01 CE1 (6de7f04b) — ex1: point A at (2,3)
test.describe('coordinate-grid — quadrillage-lire-01 CE1', () => {
  test('correct (x,y) coordinates mark exercise solved', async ({ page }) => {
    await page.goto('/fr/exercices/6de7f04b/');
    await waitForAlpine(page);
    await page.getByRole('textbox', { name: 'Abscisse x' }).fill('2');
    await page.getByRole('textbox', { name: 'Ordonnée y' }).fill('3');
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page.locator('text=Bonne réponse !')).toBeVisible();
  });
});

// ─── bar-chart ────────────────────────────────────────────────────────────────
// Series: donnees-01 CE1 (11138055) — ex1: build chart for 4 categories
test.describe('bar-chart — donnees-01 CE1', () => {
  test('bar chart columns with labels are rendered', async ({ page }) => {
    await page.goto('/fr/exercices/11138055/');
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
    await page.goto('/fr/applications/829cd74a/');
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
    await page.goto('/fr/applications/829cd74a/');
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
    await page.goto('/fr/applications/5da5b813/');
    await waitForAlpine(page);
    const badges = page.locator('h1 .inline-block');
    await expect(badges).toHaveCount(3);
  });
});

// ─── decodage-monstres ───────────────────────────────────────────────────────
// Generated: monster emojis as digits forming multi-digit numbers
test.describe('decodage-monstres — CE2 (2-digit)', () => {
  test('code table and multi-digit operation render', async ({ page }) => {
    await page.goto('/fr/applications/54ce2f51/');
    await waitForAlpine(page);
    await expect(page.locator('h1')).toContainText('Décode et calcule');
    // At least 4 monster emoji badges in code table
    const badges = page.locator('h1 .inline-block');
    await expect(badges).toHaveCount(4);
    await expect(page.locator('input[placeholder="?"]:visible')).toBeVisible();
  });

  test('correct answer marks exercise solved', async ({ page }) => {
    await page.goto('/fr/applications/54ce2f51/');
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
    await page.goto('/fr/applications/04c4b03e/');
    await waitForAlpine(page);
    const badges = page.locator('h1 .inline-block');
    await expect(badges).toHaveCount(6);
  });
});
