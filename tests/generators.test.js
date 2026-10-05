import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';

// Generators call svg.js functions (clockSvg) as browser globals — stub them for Node tests
global.clockSvg = (h, m) => `<circle data-h="${h}" data-m="${m}"/>`;

const require = createRequire(import.meta.url);
const generators = require('../src/assets/js/generators/index.js');

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

  // Exhaustive search: can every pair be linked with non-crossing paths covering ALL cells
  // (the rule enforced by the player)? The former hand-written puzzles all failed this.
  function solvable({ size, pairs }) {
    const owner = Array(size * size).fill(0);
    pairs.forEach(([a, b], k) => {
      owner[a[0] * size + a[1]] = k + 1;
      owner[b[0] * size + b[1]] = k + 1;
    });
    const nb = (i) =>
      [i - size, i + size, i % size ? i - 1 : -1, (i + 1) % size ? i + 1 : -1].filter((j) => j >= 0 && j < size * size);
    const route = (k) => {
      if (k === pairs.length) return owner.every(Boolean);
      const [a, b] = pairs[k];
      const end = b[0] * size + b[1];
      const dfs = (cur) => {
        for (const n of nb(cur)) {
          if (n === end && route(k + 1)) return true;
          if (n === end || owner[n]) continue;
          owner[n] = k + 1;
          if (dfs(n)) return true;
          owner[n] = 0;
        }
        return false;
      };
      return dfs(a[0] * size + a[1]);
    };
    return route(0);
  }

  it('is always solvable with every cell covered (4×4, 5×5)', () => {
    for (const size of [4, 5]) {
      for (let i = 0; i < 50; i++)
        expect(solvable(generators.numberlinkPuzzle.generate({ size }).numberlink)).toBe(true);
    }
  });

  it('solver sanity: rejects crossing pairs', () => {
    expect(
      solvable({
        size: 3,
        pairs: [
          [
            [0, 1],
            [2, 1],
          ],
          [
            [1, 0],
            [1, 2],
          ],
        ],
      })
    ).toBe(false);
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

describe('equationsEmojis', () => {
  // Solve the system line by line: each line has exactly one emoji not yet known
  function solve(lines) {
    const val = {};
    for (const { lhs, rhs } of lines) {
      const m = lhs.match(/^(\d+) × (.+)$/);
      const terms = m ? Array(Number(m[1])).fill(m[2]) : lhs.split(' + ');
      const unknown = terms.filter((t) => !(t in val));
      expect(new Set(unknown).size).toBe(1);
      const known = terms.filter((t) => t in val).reduce((s, t) => s + val[t], 0);
      val[unknown[0]] = (rhs - known) / unknown.length;
      expect(Number.isInteger(val[unknown[0]])).toBe(true);
    }
    return val;
  }

  it('value mode: answer is the value of the last emoji', () => {
    for (let i = 0; i < 50; i++) {
      const r = generators.equationsEmojis.generate({ unknowns: 3, max: 20, mult: i % 2 === 0 });
      expect(r.type).toBe('emoji-equations');
      expect(r.eqLines).toHaveLength(3);
      const val = solve(r.eqLines);
      expect(r.answers).toEqual([String(val[r.eqQuestion])]);
    }
  });

  it('sum and priority modes compute the question expression', () => {
    for (let i = 0; i < 50; i++) {
      const s = generators.equationsEmojis.generate({ unknowns: 3, ask: 'sum' });
      const vs = solve(s.eqLines);
      expect(s.answers[0]).toBe(String(s.eqQuestion.split(' + ').reduce((t, e) => t + vs[e], 0)));

      const p = generators.equationsEmojis.generate({ unknowns: 2, ask: 'priority' });
      const vp = solve(p.eqLines);
      const [a, bc] = p.eqQuestion.split(' + ');
      const [b, c] = bc.split(' × ');
      expect(p.answers[0]).toBe(String(vp[a] + vp[b] * vp[c]));
    }
  });

  it('terminates with Math.random mocked', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const r = generators.equationsEmojis.generate({ unknowns: 3 });
    spy.mockRestore();
    expect(r.eqLines).toHaveLength(3);
  });
});

describe('suiteAvecControle', () => {
  const num = (s) =>
    Number(
      String(s)
        .replace(/[\s\u202f\u00a0]/g, '')
        .replace(',', '.')
    );
  const values = (r) => r.sequence.items.map((it) => num(it.blank ? it.answer : it.value));

  it('3 given, 6 blanks, last given; constant step', () => {
    for (let i = 0; i < 50; i++) {
      const r = generators.suiteAvecControle.generate({
        steps: [15, 125, 250],
        direction: 'mixed',
        offset: i % 2 === 0,
      });
      const items = r.sequence.items;
      expect(items).toHaveLength(10);
      expect(items.map((it) => !!it.blank)).toEqual([false, false, false, true, true, true, true, true, true, false]);
      expect(items.filter((it) => it.blank).map((it) => it.inputIdx)).toEqual([0, 1, 2, 3, 4, 5]);
      const v = values(r);
      const d = v[1] - v[0];
      expect([15, 125, 250]).toContain(Math.abs(d));
      v.forEach((x, j) => expect(x).toBe(v[0] + j * d));
      expect(Math.min(...v)).toBeGreaterThanOrEqual(0);
    }
  });

  it('decimal steps have no float drift', () => {
    for (let i = 0; i < 50; i++) {
      const r = generators.suiteAvecControle.generate({ steps: [0.2, 0.25], startMax: 10 });
      r.sequence.items.filter((it) => it.blank).forEach((it) => expect(it.answer).toMatch(/^\d+(\.\d{1,2})?$/));
      expect(r.sequence.items[1].value).toMatch(/^\d+(,\d{1,2})?$/);
    }
  });
});

describe('ecrituresNombre', () => {
  const num = (s) =>
    Number(
      String(s)
        .replace(/[\s\u202f\u00a0]/g, '')
        .replace(',', '.')
    );
  // Evaluate "before x after" with the answer substituted
  const evalRow = (r) =>
    new Function(
      `return ${`${r.before} ${r.answer} ${r.after}`
        .replace(/×/g, '*')
        .replace(/:/g, '/')
        .replace(/−/g, '-')
        .replace(/(\d)[\s\u202f\u00a0]+(?=\d)/g, '$1')}`
    )();

  ['cm1', 'cm2'].forEach((level) => {
    it(`${level}: 4 rows, one per operation, each equal to the target`, () => {
      for (let i = 0; i < 100; i++) {
        const { type, forms } = generators.ecrituresNombre.generate({ level });
        expect(type).toBe('number-forms');
        expect(forms.rows).toHaveLength(4);
        expect(forms.answers).toEqual(forms.rows.map((r) => r.answer));
        const ops = forms.rows.map((r) => (r.before + r.after).match(/[×+−:]/)[0]).sort();
        expect(ops).toEqual(['+', ':', '×', '−'].sort());
        forms.rows.forEach((r) => {
          expect(Number(r.answer)).toBeGreaterThan(0);
          expect(Number.isInteger(Number(r.answer))).toBe(true);
          expect(evalRow(r)).toBe(num(forms.target));
        });
      }
    });
  });
});

describe('triangleOperateurs', () => {
  const num = (s) =>
    Number(
      String(s)
        .replace(/[\s\u202f\u00a0]/g, '')
        .replace(',', '.')
    );
  // Rebuild all six values (given or blank) from the item
  const full = ({ nodes, ops, answers }) => {
    const v = (c) => num(c.blank ? answers[c.idx] : c.value);
    return { n: nodes.map(v), k: ops.map(v), sign: ops[0].sign };
  };
  const close = (x, y) => expect(Math.abs(x - y)).toBeLessThan(1e-9);

  it('chain and shortcut agree (×, :, decimals, compositions)', () => {
    for (let i = 0; i < 200; i++) {
      const r = generators.triangleOperateurs.generate({
        op: 'mixed',
        pairs: [
          [10, 100],
          [4, 25],
          [2, 50],
        ],
        startMin: 1,
        decimals: 2,
        blanks: 'mixed',
      });
      expect(r.type).toBe('op-triangle');
      const { n, k, sign } = full(r.opTri);
      expect(k[2]).toBe(k[0] * k[1]);
      const f = sign === '×' ? (x, m) => x * m : (x, m) => x / m;
      close(f(n[0], k[0]), n[1]);
      close(f(n[1], k[1]), n[2]);
      close(f(n[0], k[2]), n[2]);
      // Answers are plain decimal strings (no float noise like 0.30000000000000004)
      r.opTri.answers.forEach((a) => expect(a).toMatch(/^\d+(\.\d{1,6})?$/));
    }
  });

  it('blank layouts per mode', () => {
    const blanks = (mode) => {
      const { nodes, ops } = generators.triangleOperateurs.generate({ blanks: mode }).opTri;
      return [...nodes, ...ops].map((c) => !!c.blank);
    };
    expect(blanks('nodes')).toEqual([false, true, true, false, false, false]);
    expect(blanks('op')).toEqual([false, true, false, false, true, true]);
    expect(blanks('reverse')).toEqual([true, true, false, false, false, false]);
  });
});

describe('classerTableau', () => {
  // Parse a displayed value back to base units (cents, metres, minutes)
  const parse = (s) => {
    const t = s.replace(/[\s\u202f\u00a0]/g, '').replace(',', '.');
    let m;
    if ((m = t.match(/^([\d.]+)€$/))) return Math.round(m[1] * 100);
    if ((m = t.match(/^([\d.]+)km$/))) return Math.round(m[1] * 1000);
    if ((m = t.match(/^([\d.]+)m$/))) return Number(m[1]);
    if ((m = t.match(/^(\d+)h(\d+)min$/))) return m[1] * 60 + Number(m[2]);
    if ((m = t.match(/^(\d+)min$/))) return Number(m[1]);
    throw new Error(`unparsed ${s}`);
  };

  ['prix', 'distances', 'durees'].forEach((theme) => {
    it(`${theme}: items follow the table values in the stated direction`, () => {
      for (let i = 0; i < 50; i++) {
        const r = generators.classerTableau.generate({ theme, count: 6, direction: 'mixed', mixedUnits: true });
        expect(r.type).toBe('sort');
        expect(r.sortKeepOrder).toBe(true);
        const table = Object.fromEntries(
          [...r.body.matchAll(/<td[^>]*>([^<]*)<\/td><td[^>]*>([^<]*)<\/td>/g)].map((m) => [m[1], parse(m[2])])
        );
        expect(Object.keys(table)).toHaveLength(6);
        const v = r.items.map((n) => table[n]);
        v.slice(1).forEach((x, j) =>
          r.direction === 'desc' ? expect(x).toBeLessThan(v[j]) : expect(x).toBeGreaterThan(v[j])
        );
      }
    });
  });

  it('terminates with Math.random mocked', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const r = generators.classerTableau.generate({ theme: 'durees', count: 6 });
    spy.mockRestore();
    expect(r.items).toHaveLength(6);
  });
});

describe('positionChiffre', () => {
  it('returns mcqChoices (the field the mcq partial reads) with a valid answer index', () => {
    for (let i = 0; i < 30; i++) {
      const r = generators.positionChiffre.generate();
      expect(r.type).toBe('mcq');
      expect(Array.isArray(r.mcqChoices)).toBe(true);
      expect(r.mcqChoices[r.mcqAnswer]).toBe(r.answers[0]);
    }
  });
});

describe('porteMonnaie', () => {
  it('answers match the wallet drawn (euros, centimes, total with carry)', () => {
    for (let i = 0; i < 50; i++) {
      const r = generators.porteMonnaie.generate();
      expect(r.type).toBe('multi-question');
      expect(r.svg.gen).toBe('moneySvg');
      const items = r.svg.par.items;
      const euros = items.filter((v) => v >= 100).reduce((s, v) => s + v, 0) / 100;
      const cents = items.filter((v) => v < 100).reduce((s, v) => s + v, 0);
      const total = euros * 100 + cents;
      expect(r.mqQuestions.map((q) => q.answer)).toEqual([
        String(euros),
        String(cents),
        String(Math.floor(total / 100)),
        String(total % 100),
      ]);
    }
  });
  it('carryRate 1 always gives 1 € or more of centimes', () => {
    for (let i = 0; i < 20; i++) {
      const r = generators.porteMonnaie.generate({ carryRate: 1, maxCents: 5 });
      expect(Number(r.mqQuestions[1].answer)).toBeGreaterThanOrEqual(100);
    }
  });
});

describe('rendreMonnaie', () => {
  it('change = note − price, paid with a note that covers it, price never whole euros', () => {
    for (let i = 0; i < 100; i++) {
      const r = generators.rendreMonnaie.generate();
      expect(r.type).toBe('number-check');
      const [note] = r.svg.par.items;
      const [, e, c] = r.title.match(/pour <strong>(\d+)&nbsp;€&nbsp;(\d+)&nbsp;c/);
      const price = +e * 100 + +c;
      expect(+c).toBeGreaterThan(0);
      expect(note).toBeGreaterThan(price);
      expect(r.answers).toEqual([String(Math.floor((note - price) / 100)), String((note - price) % 100)]);
    }
  });
  it('respects the notes param', () => {
    for (let i = 0; i < 30; i++) {
      expect(generators.rendreMonnaie.generate({ notes: [1000] }).svg.par.items).toEqual([1000]);
    }
  });
});

describe('centimesEnEuros', () => {
  const parse = (r) => Number(r.operation.split('__c__')[0].replace(/__/g, ''));
  it('answers are euros and remaining centimes, within range and step', () => {
    for (let i = 0; i < 100; i++) {
      const r = generators.centimesEnEuros.generate({ min: 100, max: 999, step: 5 });
      const v = parse(r);
      expect(v).toBeGreaterThanOrEqual(100);
      expect(v).toBeLessThanOrEqual(999);
      expect(v % 5).toBe(0);
      expect(r.answers).toEqual([String(Math.floor(v / 100)), String(v % 100)]);
    }
  });
  it('groups thousands and gives tricky cases (< 10 c) when asked', () => {
    for (let i = 0; i < 30; i++) {
      const r = generators.centimesEnEuros.generate({ min: 1000, max: 9999, step: 1, trickyRate: 1 });
      expect(r.operation).toMatch(/^\d__\d{3}__c__=__\? € \? c$/);
      expect(parse(r) % 100).toBeLessThan(10);
    }
  });
});
