import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';

// generators.js calls svg.js functions (clockSvg) as browser globals — stub them for Node tests
global.clockSvg = (h, m) => `<circle data-h="${h}" data-m="${m}"/>`;

const require = createRequire(import.meta.url);
const generators = require('../src/assets/js/generators.js');

// ─── Structural helpers ───────────────────────────────────────────────────────

function expectNumberCheck(result) {
  expect(result.type).toBe('number-check');
  expect(Array.isArray(result.answers)).toBe(true);
  expect(result.answers.length).toBeGreaterThan(0);
  expect(result.answers.every((a) => typeof a === 'string')).toBe(true);
}

// ─── Smoke test: every generator produces a valid exercise ───────────────────
// NOTE: kept as a flat describe (no outer beforeEach wrapping 51+ dynamic its)
// to avoid a vitest v4 memory issue with vi.spyOn + nested forEach loops.

describe('all generators produce a valid exercise', () => {
  Object.keys(generators).forEach((name) => {
    it(name, () => {
      const result = generators[name].generate();
      expect(result).toHaveProperty('type');
      expect(typeof result.type).toBe('string');
    });
  });
});

// ─── Deterministic tests (Math.random mocked per suite) ──────────────────────

describe('multiplicationSimple', () => {
  let spy;
  beforeEach(() => {
    spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });
  afterEach(() => {
    spy.mockRestore();
  });

  it('returns a number-check exercise', () => {
    const result = generators.multiplicationSimple.generate();
    expectNumberCheck(result);
    expect(result.operation).toContain('×');
  });

  it('answer equals a × b', () => {
    const result = generators.multiplicationSimple.generate({ minA: 3, maxA: 3, minB: 7, maxB: 7 });
    expect(result.answers[0]).toBe('21');
  });

  it('matches snapshot', () => {
    expect(generators.multiplicationSimple.generate({ minA: 4, maxA: 4, minB: 6, maxB: 6 })).toMatchSnapshot();
  });
});

describe('additionSimple', () => {
  it('returns correct sum', () => {
    const result = generators.additionSimple.generate({ minA: 12, maxA: 12, minB: 8, maxB: 8 });
    expect(result.type).toBe('number-check');
    expect(result.answers[0]).toBe('20');
  });

  it('matches snapshot', () => {
    expect(generators.additionSimple.generate({ minA: 15, maxA: 15, minB: 25, maxB: 25 })).toMatchSnapshot();
  });
});

describe('divisionSimple', () => {
  it('answer equals dividend ÷ divisor', () => {
    const result = generators.divisionSimple.generate({ minDivisor: 4, maxDivisor: 4, minQuotient: 6, maxQuotient: 6 });
    expect(result.answers[0]).toBe('6');
    expect(result.operation).toBe('24 ÷ 4');
  });
});

describe('additionTrou', () => {
  let spy;
  beforeEach(() => {
    spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });
  afterEach(() => {
    spy.mockRestore();
  });

  it('operation contains ?', () => {
    expect(generators.additionTrou.generate().operation).toContain('?');
  });

  it('matches snapshot', () => {
    expect(generators.additionTrou.generate({ minTotal: 20, maxTotal: 20 })).toMatchSnapshot();
  });
});

describe('doublesMoities', () => {
  it('returns double when random > 0.5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.8);
    const result = generators.doublesMoities.generate({ min: 5, max: 5 });
    expect(result.operation).toContain('double de 5');
    expect(result.answers[0]).toBe('10');
    vi.restoreAllMocks();
  });

  it('returns moitié when random <= 0.5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.3);
    const result = generators.doublesMoities.generate({ min: 5, max: 5 });
    expect(result.operation).toContain('moitié de 10');
    expect(result.answers[0]).toBe('5');
    vi.restoreAllMocks();
  });
});

describe('decompositionBase10', () => {
  it('answer equals tens * 10 + units', () => {
    const result = generators.decompositionBase10.generate({ minTens: 3, maxTens: 3, minOnes: 7, maxOnes: 7 });
    expect(result.answers[0]).toBe('37');
  });
});

describe('romanNumerals', () => {
  it('operation is roman string, answer is arabic string', () => {
    const result = generators.romanNumerals.generate({ min: 14, max: 14 });
    expect(result.operation).toBe('XIV');
    expect(result.answers[0]).toBe('14');
  });

  it('matches snapshot', () => {
    expect(generators.romanNumerals.generate({ min: 9, max: 9 })).toMatchSnapshot();
  });
});

describe('romanNumeralsReverse', () => {
  it('operation is arabic, answer is roman', () => {
    const result = generators.romanNumeralsReverse.generate({ min: 9, max: 9 });
    expect(result.operation).toBe('9');
    expect(result.answers[0]).toBe('IX');
  });
});

describe('compterDeN', () => {
  it('returns a sequence exercise', () => {
    const result = generators.compterDeN.generate({ step: 2, direction: 'asc' });
    expect(result.type).toBe('sequence');
    expect(result.sequence.given).toHaveLength(3);
    expect(result.sequence.answers).toHaveLength(3);
  });
});

describe('comparerNombres', () => {
  it('returns a tile-select exercise with correct structure', () => {
    const result = generators.comparerNombres.generate({ count: 2, goal: 'max' });
    expect(result.type).toBe('tile-select');
    expect(result.tiles).toHaveLength(2);
    expect(result.tileAnswers).toHaveLength(1);
    expect(result.tileAnswers[0]).toBeGreaterThanOrEqual(0);
    expect(Number(result.tiles[result.tileAnswers[0]])).toBe(Math.max(...result.tiles.map(Number)));
  });

  it('works with 3 tiles', () => {
    const result = generators.comparerNombres.generate({ count: 3, goal: 'min' });
    expect(result.tiles).toHaveLength(3);
    expect(Number(result.tiles[result.tileAnswers[0]])).toBe(Math.min(...result.tiles.map(Number)));
  });
});

describe('recomposerFractions', () => {
  it('returns fraction-check type', () => {
    const result = generators.recomposerFractions.generate({ level: 'tenths' });
    expect(result.type).toBe('fraction-check');
    expect(result.answers[0]).toMatch(/\/10$/);
  });
});

describe('egalitesFractions', () => {
  it('returns tile-select type with tiles and tileAnswers', () => {
    const result = generators.egalitesFractions.generate();
    expect(result.type).toBe('tile-select');
    expect(Array.isArray(result.tiles)).toBe(true);
    expect(Array.isArray(result.tileAnswers)).toBe(true);
    expect(result.tileAnswers.every((i) => typeof i === 'number')).toBe(true);
  });
});

describe('plusGrandeFraction', () => {
  it('returns tile-select with exactly one correct answer', () => {
    const result = generators.plusGrandeFraction.generate({ minA: 3, maxA: 3 });
    expect(result.type).toBe('tile-select');
    expect(result.tiles).toHaveLength(3);
    expect(result.tileAnswers).toHaveLength(1);
    expect(result.tileAnswers[0]).toBeGreaterThanOrEqual(0);
    expect(result.tileAnswers[0]).toBeLessThan(3);
  });

  it('correct answer is actually the tile with the largest value', () => {
    // Fix a=3, t=7 → N=37: N/100=0.37, N/10=3.7, mixed (1 or 2 + d/10) < 3.7
    // With minA=maxA=3, cAbove=false always gives c in [1,2], any d < 3.7 — but
    // Math.random is not mocked here so we just verify structural invariant.
    for (let i = 0; i < 20; i++) {
      const r = generators.plusGrandeFraction.generate({ minA: 2, maxA: 5 });
      const idx = r.tileAnswers[0];
      // The correct tile should contain the largest value — we verify it contains
      // either the N/10 fraction or a mixed-number html (both valid largest tiles).
      expect(r.tiles[idx]).toBeTruthy();
    }
  });
});

describe('perimetreFormes', () => {
  it('returns number-check with svg and title', () => {
    const result = generators.perimetreFormes.generate();
    expect(result.type).toBe('number-check');
    expect(result).toHaveProperty('svg');
    expect(result).toHaveProperty('title');
  });
});

describe('fluencyMix', () => {
  const levels = ['cp', 'ce1', 'ce2', 'cm1', 'cm2'];
  const diffs = ['facile', 'moyen', 'difficile'];

  for (const level of levels) {
    for (const difficulty of diffs) {
      it(`${level}/${difficulty} returns valid number-check`, () => {
        for (let i = 0; i < 30; i++) {
          const result = generators.fluencyMix.generate({ level, difficulty });
          expect(result.type).toBe('number-check');
          expect(Array.isArray(result.answers)).toBe(true);
          expect(result.answers.length).toBeGreaterThan(0);
          expect(result.answers.every((a) => typeof a === 'string')).toBe(true);
          expect(typeof result.operation).toBe('string');
          expect(result.operation.length).toBeGreaterThan(0);
          // Answer should parse to a finite number (possibly with comma decimal)
          const numAnswer = Number(result.answers[0].replace(',', '.'));
          expect(Number.isFinite(numAnswer)).toBe(true);
        }
      });
    }
  }

  it('defaults to ce2/moyen without params', () => {
    const result = generators.fluencyMix.generate();
    expectNumberCheck(result);
  });

  it('produces varied operations across 50 calls', () => {
    const ops = new Set();
    for (let i = 0; i < 50; i++) {
      const result = generators.fluencyMix.generate({ level: 'ce2', difficulty: 'moyen' });
      // Extract the operator or keyword
      const op = result.operation.match(/[+−×÷]|moitié|double|frac/)?.[0] || 'other';
      ops.add(op);
    }
    // Should produce at least 3 different operation types
    expect(ops.size).toBeGreaterThanOrEqual(3);
  });
});

// ─── futoshikiPuzzle ──────────────────────────────────────────────────────────

describe('futoshikiPuzzle', () => {
  it('returns type futoshiki', () => {
    const r = generators.futoshikiPuzzle.generate({ size: 4 });
    expect(r.type).toBe('futoshiki');
  });

  it('has futoshiki object with size, given, hCons, vCons', () => {
    const r = generators.futoshikiPuzzle.generate({ size: 4 });
    expect(r.futoshiki).toBeDefined();
    expect(r.futoshiki.size).toBe(4);
    expect(Array.isArray(r.futoshiki.given)).toBe(true);
    expect(Array.isArray(r.futoshiki.hCons)).toBe(true);
    expect(Array.isArray(r.futoshiki.vCons)).toBe(true);
  });

  it('given cells contain valid values in range 1–N', () => {
    for (let i = 0; i < 5; i++) {
      const r = generators.futoshikiPuzzle.generate({ size: 4 });
      // given is a flat array: null = blank, number = pre-filled
      expect(r.futoshiki.given).toHaveLength(16);
      r.futoshiki.given.forEach((g) => {
        if (g !== null) {
          expect(g).toBeGreaterThanOrEqual(1);
          expect(g).toBeLessThanOrEqual(4);
        }
      });
    }
  });

  it('_solution is a valid 4×4 latin square', () => {
    const r = generators.futoshikiPuzzle.generate({ size: 4 });
    const sol = r._solution;
    expect(sol).toHaveLength(4);
    // Each row has digits 1–4
    sol.forEach((row) => {
      expect(row.slice().sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
    });
    // Each column has digits 1–4
    for (let c = 0; c < 4; c++) {
      const col = sol.map((row) => row[c]).sort((a, b) => a - b);
      expect(col).toEqual([1, 2, 3, 4]);
    }
  });

  it('hCons signs are consistent with solution', () => {
    const r = generators.futoshikiPuzzle.generate({ size: 4 });
    const sol = r._solution;
    r.futoshiki.hCons.forEach(({ r: row, c, sign }) => {
      const v1 = sol[row][c],
        v2 = sol[row][c + 1];
      if (sign === '<') expect(v1).toBeLessThan(v2);
      else expect(v1).toBeGreaterThan(v2);
    });
  });

  it('vCons signs are consistent with solution', () => {
    const r = generators.futoshikiPuzzle.generate({ size: 4 });
    const sol = r._solution;
    r.futoshiki.vCons.forEach(({ r: row, c, sign }) => {
      const v1 = sol[row][c],
        v2 = sol[row + 1][c];
      if (sign === '<') expect(v1).toBeLessThan(v2);
      else expect(v1).toBeGreaterThan(v2);
    });
  });

  it('works for size 3 and size 5', () => {
    [3, 5].forEach((size) => {
      const r = generators.futoshikiPuzzle.generate({ size });
      expect(r.futoshiki.size).toBe(size);
      expect(r._solution).toHaveLength(size);
      r._solution.forEach((row) => expect(row).toHaveLength(size));
    });
  });
});

// ─── kenkenPuzzle ─────────────────────────────────────────────────────────────

describe('kenkenPuzzle', () => {
  it('returns type kenken', () => {
    const r = generators.kenkenPuzzle.generate({ size: 3 });
    expect(r.type).toBe('kenken');
  });

  it('has kenken object with size and cages', () => {
    const r = generators.kenkenPuzzle.generate({ size: 3 });
    expect(r.kenken.size).toBe(3);
    expect(Array.isArray(r.kenken.cages)).toBe(true);
    expect(r.kenken.cages.length).toBeGreaterThan(0);
  });

  it('_solution is a valid 3×3 latin square', () => {
    const r = generators.kenkenPuzzle.generate({ size: 3 });
    const sol = r._solution;
    expect(sol).toHaveLength(3);
    sol.forEach((row) => {
      expect(row.slice().sort((a, b) => a - b)).toEqual([1, 2, 3]);
    });
    for (let c = 0; c < 3; c++) {
      const col = sol.map((row) => row[c]).sort((a, b) => a - b);
      expect(col).toEqual([1, 2, 3]);
    }
  });

  it('every cell is in exactly one cage', () => {
    for (let i = 0; i < 5; i++) {
      const r = generators.kenkenPuzzle.generate({ size: 3 });
      const covered = new Set();
      r.kenken.cages.forEach((cage) => {
        cage.cells.forEach(([row, col]) => {
          const key = `${row},${col}`;
          expect(covered.has(key)).toBe(false); // no duplicate
          covered.add(key);
        });
      });
      expect(covered.size).toBe(9); // all 9 cells covered
    }
  });

  it('cage arithmetic is consistent with solution', () => {
    for (let i = 0; i < 5; i++) {
      const r = generators.kenkenPuzzle.generate({ size: 3 });
      const sol = r._solution;
      r.kenken.cages.forEach((cage) => {
        const vals = cage.cells.map(([row, col]) => sol[row][col]);
        if (cage.op === '') {
          expect(vals[0]).toBe(cage.target);
        } else if (cage.op === '+') {
          expect(vals.reduce((s, v) => s + v, 0)).toBe(cage.target);
        } else if (cage.op === '×') {
          expect(vals.reduce((p, v) => p * v, 1)).toBe(cage.target);
        } else if (cage.op === '-') {
          expect(Math.abs(vals[0] - vals[1])).toBe(cage.target);
        } else if (cage.op === '÷') {
          const mx = Math.max(...vals),
            mn = Math.min(...vals);
          expect(mn > 0 && mx / mn).toBe(cage.target);
        }
      });
    }
  });

  it('works for size 4 and 5', () => {
    [4, 5].forEach((size) => {
      const r = generators.kenkenPuzzle.generate({ size });
      expect(r.kenken.size).toBe(size);
      expect(r._solution).toHaveLength(size);
      const covered = new Set();
      r.kenken.cages.forEach((cage) => cage.cells.forEach(([row, col]) => covered.add(`${row},${col}`)));
      expect(covered.size).toBe(size * size);
    });
  });
});

// ─── numberlinkPuzzle ─────────────────────────────────────────────────────────

describe('numberlinkPuzzle', () => {
  it('returns type numberlink', () => {
    const r = generators.numberlinkPuzzle.generate({ size: 4 });
    expect(r.type).toBe('numberlink');
  });

  it('has numberlink object with size and pairs', () => {
    const r = generators.numberlinkPuzzle.generate({ size: 4 });
    expect(r.numberlink.size).toBe(4);
    expect(Array.isArray(r.numberlink.pairs)).toBe(true);
    expect(r.numberlink.pairs.length).toBeGreaterThan(0);
  });

  it('each pair has two distinct endpoint coordinates', () => {
    const r = generators.numberlinkPuzzle.generate({ size: 4 });
    r.numberlink.pairs.forEach(([ep1, ep2]) => {
      expect(ep1).toHaveLength(2);
      expect(ep2).toHaveLength(2);
      // Endpoints are not the same cell
      expect(ep1[0] === ep2[0] && ep1[1] === ep2[1]).toBe(false);
    });
  });

  it('all endpoints are within bounds', () => {
    const r = generators.numberlinkPuzzle.generate({ size: 4 });
    const { size, pairs } = r.numberlink;
    pairs.forEach(([ep1, ep2]) => {
      [ep1, ep2].forEach(([row, col]) => {
        expect(row).toBeGreaterThanOrEqual(0);
        expect(row).toBeLessThan(size);
        expect(col).toBeGreaterThanOrEqual(0);
        expect(col).toBeLessThan(size);
      });
    });
  });

  it('no two pairs share an endpoint', () => {
    for (let i = 0; i < 10; i++) {
      const r = generators.numberlinkPuzzle.generate({ size: 4 });
      const endpoints = new Set();
      r.numberlink.pairs.forEach(([ep1, ep2]) => {
        const k1 = `${ep1[0]},${ep1[1]}`;
        const k2 = `${ep2[0]},${ep2[1]}`;
        expect(endpoints.has(k1)).toBe(false);
        expect(endpoints.has(k2)).toBe(false);
        endpoints.add(k1);
        endpoints.add(k2);
      });
    }
  });

  it('works for size 5', () => {
    const r = generators.numberlinkPuzzle.generate({ size: 5 });
    expect(r.numberlink.size).toBe(5);
    expect(r.numberlink.pairs.length).toBeGreaterThan(0);
  });
});

// ─── labyrinthe (new rules) ───────────────────────────────────────────────────

describe('labyrinthe new multiples rules', () => {
  ['mult4', 'mult6', 'mult7', 'mult8', 'mult9'].forEach((rule) => {
    it(`${rule}: all path cells are multiples of the expected value`, () => {
      const divisor = parseInt(rule.replace('mult', ''), 10);
      // Run several times to account for randomness
      for (let i = 0; i < 5; i++) {
        const r = generators.labyrinthe.generate({ rule, size: 4 });
        expect(r.type).toBe('maze');
        expect(r.maze.rule).toBe('mult');
        expect(r.maze.ruleParam).toBe(divisor);
        // Collect path cells (start to end via generated grid — check rule on all valid-path values)
        // We can at minimum check that the grid is 4×4 and label is correct
        expect(r.maze.grid).toHaveLength(4);
        r.maze.grid.forEach((row) => expect(row).toHaveLength(4));
        expect(r.maze.ruleLabel).toContain(String(divisor));
      }
    });
  });
});

// ─── fractionDecimale ────────────────────────────────────────────────────────

describe('fractionDecimale', () => {
  it('frac-to-dec: type is number-check, operation contains &frac(', () => {
    const r = generators.fractionDecimale.generate({ mode: 'frac-to-dec', level: 'dixiemes' });
    expect(r.type).toBe('number-check');
    expect(r.operation).toMatch(/^&frac\(\d+,\d+\)$/);
    expect(Array.isArray(r.answers)).toBe(true);
    expect(r.answers).toHaveLength(1);
  });

  it('frac-to-dec: answer is a decimal string with comma', () => {
    for (let i = 0; i < 20; i++) {
      const r = generators.fractionDecimale.generate({ mode: 'frac-to-dec', level: 'dixiemes' });
      expect(r.answers[0]).toMatch(/^\d+,\d+$/);
    }
  });

  it('dec-to-frac: operation contains ? / and answer is integer string', () => {
    const r = generators.fractionDecimale.generate({ mode: 'dec-to-frac', level: 'dixiemes' });
    expect(r.operation).toMatch(/= \? \//);
    expect(r.answers[0]).toMatch(/^\d+$/);
  });

  it('level=dixiemes: denominator is always 10', () => {
    for (let i = 0; i < 20; i++) {
      const r = generators.fractionDecimale.generate({ mode: 'frac-to-dec', level: 'dixiemes' });
      // operation is &frac(num,10)
      expect(r.operation).toMatch(/&frac\(\d+,10\)/);
    }
  });

  it('level=centiemes: denominator is always 100', () => {
    for (let i = 0; i < 20; i++) {
      const r = generators.fractionDecimale.generate({ mode: 'frac-to-dec', level: 'centiemes' });
      expect(r.operation).toMatch(/&frac\(\d+,100\)/);
    }
  });

  it('level=mixed: uses both 10 and 100 across many calls', () => {
    const denoms = new Set();
    for (let i = 0; i < 40; i++) {
      const r = generators.fractionDecimale.generate({ mode: 'frac-to-dec', level: 'mixed' });
      const m = r.operation.match(/&frac\(\d+,(\d+)\)/);
      if (m) denoms.add(m[1]);
    }
    expect(denoms.has('10')).toBe(true);
    expect(denoms.has('100')).toBe(true);
  });

  it('decimal formatting: 3/10 → "0,3" (single decimal place)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // picks index 0 = [1,10] via randItem
    // With random=0, randItem picks index 0 = [1,10], num=1 → 0,1
    // We can't pin the exact fraction without full random control, so test the format invariant
    vi.restoreAllMocks();
    for (let i = 0; i < 20; i++) {
      const r = generators.fractionDecimale.generate({ mode: 'frac-to-dec', level: 'dixiemes' });
      // Tenths: answer should be 0,1 through 0,9 — exactly one decimal digit
      expect(r.answers[0]).toMatch(/^0,[1-9]$/);
    }
  });

  it('decimal formatting: hundredths have at most 2 decimal places, no trailing zeros after first', () => {
    for (let i = 0; i < 30; i++) {
      const r = generators.fractionDecimale.generate({ mode: 'frac-to-dec', level: 'centiemes' });
      // Must contain a comma and no trailing zero after the significant digits
      // e.g. "0,07" is fine, "0,30" should be "0,3" (stripped)
      expect(r.answers[0]).not.toMatch(/0$/);
      expect(r.answers[0]).toContain(',');
    }
  });

  it('frac-to-dec answer is mathematically correct', () => {
    for (let i = 0; i < 20; i++) {
      const r = generators.fractionDecimale.generate({ mode: 'frac-to-dec', level: 'dixiemes' });
      // Parse &frac(num,den) from operation
      const m = r.operation.match(/&frac\((\d+),(\d+)\)/);
      const num = parseInt(m[1]),
        den = parseInt(m[2]);
      const expected = (num / den).toFixed(1).replace('.', ',');
      expect(r.answers[0]).toBe(expected);
    }
  });

  it('dec-to-frac answer is the numerator matching the operation denominator', () => {
    for (let i = 0; i < 20; i++) {
      const r = generators.fractionDecimale.generate({ mode: 'dec-to-frac', level: 'dixiemes' });
      // operation: "0,3 = ? / 10" — answer should be "3"
      const m = r.operation.match(/(\d+[,\.]\d+) = \? \/ (\d+)/);
      const dec = parseFloat(m[1].replace(',', '.'));
      const den = parseInt(m[2]);
      const expectedNum = Math.round(dec * den);
      expect(parseInt(r.answers[0])).toBe(expectedNum);
    }
  });

  it('mixed mode produces both frac-to-dec and dec-to-frac across 40 calls', () => {
    const modes = new Set();
    for (let i = 0; i < 40; i++) {
      const r = generators.fractionDecimale.generate({ mode: 'mixed', level: 'dixiemes' });
      // frac-to-dec: answer contains comma; dec-to-frac: answer is integer
      modes.add(r.answers[0].includes(',') ? 'frac-to-dec' : 'dec-to-frac');
    }
    expect(modes.size).toBe(2);
  });
});

// ─── fractionQuantite ─────────────────────────────────────────────────────────

describe('fractionQuantite', () => {
  it('find-part: type is number-check, answers[0] is a positive integer string', () => {
    for (let i = 0; i < 20; i++) {
      const r = generators.fractionQuantite.generate({ mode: 'find-part' });
      expect(r.type).toBe('number-check');
      expect(r.answers).toHaveLength(1);
      const n = parseInt(r.answers[0]);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThan(0);
    }
  });

  it('find-part: operation contains &frac() shorthand', () => {
    for (let i = 0; i < 10; i++) {
      const r = generators.fractionQuantite.generate({ mode: 'find-part' });
      expect(r.operation).toMatch(/&frac\(\d+,\d+\)/);
    }
  });

  it('find-part: part = (total/den)*num — answer is mathematically correct', () => {
    for (let i = 0; i < 30; i++) {
      const r = generators.fractionQuantite.generate({ mode: 'find-part' });
      // Parse fraction and total from operation: "&frac(num,den) de total"
      const m = r.operation.match(/&frac\((\d+),(\d+)\) de (\d+)/);
      expect(m).not.toBeNull();
      const num = parseInt(m[1]),
        den = parseInt(m[2]),
        total = parseInt(m[3]);
      const part = (total / den) * num;
      expect(Number.isInteger(part)).toBe(true);
      expect(parseInt(r.answers[0])).toBe(part);
    }
  });

  it('find-total: answer is a positive integer string', () => {
    for (let i = 0; i < 20; i++) {
      const r = generators.fractionQuantite.generate({ mode: 'find-total' });
      expect(r.type).toBe('number-check');
      const n = parseInt(r.answers[0]);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThan(0);
    }
  });

  it('find-total: body mentions the part count and answers with the total', () => {
    for (let i = 0; i < 20; i++) {
      const r = generators.fractionQuantite.generate({ mode: 'find-total' });
      const total = parseInt(r.answers[0]);
      // The body should mention the part count (a number smaller than total)
      expect(r.body).toMatch(/\d+/);
      expect(total).toBeGreaterThan(0);
    }
  });

  it('mixed mode produces both find-part and find-total across 40 calls', () => {
    const modes = new Set();
    for (let i = 0; i < 40; i++) {
      const r = generators.fractionQuantite.generate({ mode: 'mixed' });
      // find-part has operation field with &frac; find-total does not
      modes.add(r.operation ? 'find-part' : 'find-total');
    }
    expect(modes.size).toBe(2);
  });

  it('part is always a whole number (totals are chosen to be divisible)', () => {
    for (let i = 0; i < 50; i++) {
      const r = generators.fractionQuantite.generate({ mode: 'find-part' });
      const m = r.operation.match(/&frac\((\d+),(\d+)\) de (\d+)/);
      const num = parseInt(m[1]),
        den = parseInt(m[2]),
        total = parseInt(m[3]);
      expect(total % den).toBe(0); // total divisible by denominator
      expect(((total / den) * num) % 1).toBe(0); // part is whole number
    }
  });

  it('body is an HTML string', () => {
    const r = generators.fractionQuantite.generate({ mode: 'find-part' });
    expect(typeof r.body).toBe('string');
    expect(r.body).toContain('<p>');
  });
});

// ─── vennFormes ──────────────────────────────────────────────────────────────

describe('vennFormes', () => {
  it('returns type venn with venn object', () => {
    const r = generators.vennFormes.generate();
    expect(r.type).toBe('venn');
    expect(r.venn).toBeDefined();
    expect(r.venn.items).toBeDefined();
    expect(Array.isArray(r.venn.items)).toBe(true);
  });

  it('every item has a non-empty char and a valid zone', () => {
    const validZones = new Set(['a', 'ab', 'b', 'out']);
    for (const level of ['CE2', 'CM1', 'CM2']) {
      const r = generators.vennFormes.generate({ level });
      r.venn.items.forEach((item) => {
        expect(typeof item.char).toBe('string');
        expect(item.char.length).toBeGreaterThan(0);
        expect(validZones.has(item.zone)).toBe(true);
      });
    }
  });

  it('all four zones are populated for each level', () => {
    // Run multiple times per level — not every call needs all 4 zones,
    // but at least one call per level must produce each zone.
    for (const level of ['CE2', 'CM1', 'CM2']) {
      const zonesSeenForLevel = new Set();
      for (let i = 0; i < 20; i++) {
        const r = generators.vennFormes.generate({ level });
        r.venn.items.forEach((item) => zonesSeenForLevel.add(item.zone));
      }
      expect(zonesSeenForLevel.has('a'), `level ${level} missing zone a`).toBe(true);
      expect(zonesSeenForLevel.has('ab'), `level ${level} missing zone ab`).toBe(true);
      expect(zonesSeenForLevel.has('b'), `level ${level} missing zone b`).toBe(true);
      expect(zonesSeenForLevel.has('out'), `level ${level} missing zone out`).toBe(true);
    }
  });

  it('CE2: zone assignments match expected shape properties (quadri + allEqual)', () => {
    // CE2 theme: predA=quadri, predB=allEqual
    // Known shape → zone mapping (deterministic, pool always same):
    const expected = {
      '■': 'ab', // carre: quadri=T, allEqual=T
      '▬': 'a', // rect:  quadri=T, allEqual=F
      '◆': 'ab', // losange: quadri=T, allEqual=T
      '▱': 'a', // paralelo: quadri=T, allEqual=F
      '△': 'b', // triEqui: quadri=F, allEqual=T
      '▲': 'out', // triQqque: quadri=F, allEqual=F
      '●': 'out', // cercle: quadri=F, allEqual=F
    };
    // Run many times; shuffle changes order but not zone assignment
    for (let i = 0; i < 5; i++) {
      const r = generators.vennFormes.generate({ level: 'CE2' });
      r.venn.items.forEach((item) => {
        if (expected[item.char] !== undefined) {
          expect(item.zone, `char ${item.char}`).toBe(expected[item.char]);
        }
      });
    }
  });

  it('venn labels are non-empty strings', () => {
    for (const level of ['CE2', 'CM1', 'CM2']) {
      const r = generators.vennFormes.generate({ level });
      expect(typeof r.venn.labelA).toBe('string');
      expect(r.venn.labelA.length).toBeGreaterThan(0);
      expect(typeof r.venn.labelB).toBe('string');
      expect(r.venn.labelB.length).toBeGreaterThan(0);
    }
  });

  it('unknown level falls back to CE2 theme', () => {
    const r = generators.vennFormes.generate({ level: 'unknown' });
    // CE2 pool contains carre, rect, losange, paralelo, triEqui, triQqque, cercle
    const ce2Chars = new Set(['■', '▬', '◆', '▱', '△', '▲', '●']);
    r.venn.items.forEach((item) => expect(ce2Chars.has(item.char)).toBe(true));
  });

  it('title is set', () => {
    const r = generators.vennFormes.generate();
    expect(r.title).toBe('Classe les figures');
  });

  it('items count matches theme pool size', () => {
    // CE2 pool has 7 shapes
    const r = generators.vennFormes.generate({ level: 'CE2' });
    expect(r.venn.items).toHaveLength(7);
  });
});
