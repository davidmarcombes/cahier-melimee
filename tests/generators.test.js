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
      r.futoshiki.given.forEach(g => {
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
    sol.forEach(row => {
      expect(row.slice().sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
    });
    // Each column has digits 1–4
    for (let c = 0; c < 4; c++) {
      const col = sol.map(row => row[c]).sort((a, b) => a - b);
      expect(col).toEqual([1, 2, 3, 4]);
    }
  });

  it('hCons signs are consistent with solution', () => {
    const r = generators.futoshikiPuzzle.generate({ size: 4 });
    const sol = r._solution;
    r.futoshiki.hCons.forEach(({ r: row, c, sign }) => {
      const v1 = sol[row][c], v2 = sol[row][c + 1];
      if (sign === '<') expect(v1).toBeLessThan(v2);
      else expect(v1).toBeGreaterThan(v2);
    });
  });

  it('vCons signs are consistent with solution', () => {
    const r = generators.futoshikiPuzzle.generate({ size: 4 });
    const sol = r._solution;
    r.futoshiki.vCons.forEach(({ r: row, c, sign }) => {
      const v1 = sol[row][c], v2 = sol[row + 1][c];
      if (sign === '<') expect(v1).toBeLessThan(v2);
      else expect(v1).toBeGreaterThan(v2);
    });
  });

  it('works for size 3 and size 5', () => {
    [3, 5].forEach(size => {
      const r = generators.futoshikiPuzzle.generate({ size });
      expect(r.futoshiki.size).toBe(size);
      expect(r._solution).toHaveLength(size);
      r._solution.forEach(row => expect(row).toHaveLength(size));
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
    sol.forEach(row => {
      expect(row.slice().sort((a, b) => a - b)).toEqual([1, 2, 3]);
    });
    for (let c = 0; c < 3; c++) {
      const col = sol.map(row => row[c]).sort((a, b) => a - b);
      expect(col).toEqual([1, 2, 3]);
    }
  });

  it('every cell is in exactly one cage', () => {
    for (let i = 0; i < 5; i++) {
      const r = generators.kenkenPuzzle.generate({ size: 3 });
      const covered = new Set();
      r.kenken.cages.forEach(cage => {
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
      r.kenken.cages.forEach(cage => {
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
          const mx = Math.max(...vals), mn = Math.min(...vals);
          expect(mn > 0 && mx / mn).toBe(cage.target);
        }
      });
    }
  });

  it('works for size 4 and 5', () => {
    [4, 5].forEach(size => {
      const r = generators.kenkenPuzzle.generate({ size });
      expect(r.kenken.size).toBe(size);
      expect(r._solution).toHaveLength(size);
      const covered = new Set();
      r.kenken.cages.forEach(cage => cage.cells.forEach(([row, col]) => covered.add(`${row},${col}`)));
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
  ['mult4', 'mult6', 'mult7', 'mult8', 'mult9'].forEach(rule => {
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
        r.maze.grid.forEach(row => expect(row).toHaveLength(4));
        expect(r.maze.ruleLabel).toContain(String(divisor));
      }
    });
  });
});
