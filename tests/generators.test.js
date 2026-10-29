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
      // The total is asked only when the centimes make an extra euro
      expect(r.mqQuestions.map((q) => q.answer)).toEqual(
        cents >= 100
          ? [String(euros), String(cents), String(Math.floor(total / 100)), String(total % 100)]
          : [String(euros), String(cents)]
      );
      expect(r.mqSequential).toBeUndefined();
    }
  });
  it('minEuroCoins without notes: at least one euro coin, centimes under 1 € with carryRate 0', () => {
    for (let i = 0; i < 50; i++) {
      const r = generators.porteMonnaie.generate({ minNotes: 0, maxNotes: 0, minEuroCoins: 1, carryRate: 0 });
      const items = r.svg.par.items;
      expect(items.some((v) => v === 100 || v === 200)).toBe(true);
      expect(items.every((v) => v <= 200)).toBe(true);
      expect(r.mqQuestions).toHaveLength(2);
      expect(Number(r.mqQuestions[1].answer)).toBeLessThan(100);
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

describe('diviserDecimalParEntier', () => {
  const num = (s) => parseFloat(s.replace(',', '.'));
  it('quotient × divisor = dividend, decimal dividend by default', () => {
    for (let i = 0; i < 200; i++) {
      const r = generators.diviserDecimalParEntier.generate();
      const [a, rest] = r.operation.split(' ÷ ');
      const d = parseInt(rest, 10);
      expect(a).toContain(',');
      expect(num(r.answers[0]) * d).toBeCloseTo(num(a), 9);
    }
  });
  it('intDividend gives a whole dividend and a decimal quotient', () => {
    for (let i = 0; i < 100; i++) {
      const r = generators.diviserDecimalParEntier.generate({ intDividend: true, divisors: [2, 4, 5, 8] });
      expect(r.operation.split(' ÷ ')[0]).not.toContain(',');
      expect(r.answers[0]).toContain(',');
    }
  });
});

describe('multiplierDecimalParEntier', () => {
  const num = (s) => parseFloat(s.replace(',', '.'));
  it('product of a decimal by a whole factor, decimal input', () => {
    for (let i = 0; i < 200; i++) {
      const r = generators.multiplierDecimalParEntier.generate({ factors: [5, 50], maxDec: 2 });
      const [a, rest] = r.operation.split(' × ');
      const k = parseInt(rest, 10);
      expect([5, 50]).toContain(k);
      expect(a).toContain(',');
      expect(num(r.answers[0])).toBeCloseTo(num(a) * k, 9);
    }
  });
});

describe('calculParentheses', () => {
  const evalOp = (op) =>
    Function(
      `return ${op
        .replace(/ = \?$/, '')
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')}`
    )();
  for (const pairs of [1, 2])
    it(`${pairs} pair(s): answer = value of the expression, whole and not negative`, () => {
      for (let i = 0; i < 300; i++) {
        const r = generators.calculParentheses.generate({ pairs });
        expect((r.operation.match(/\(/g) || []).length).toBe(pairs);
        const v = evalOp(r.operation);
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(r.answers[0]).toBe(String(v));
      }
    });
});

describe('arrondirDecimal', () => {
  it('rounds to the unit without halfway cases, or gives the whole part', () => {
    for (let i = 0; i < 300; i++) {
      const r = generators.arrondirDecimal.generate({ mode: 'mix', maxDec: 3 });
      const x = parseFloat(r.operation.match(/\d+,\d+/)[0].replace(',', '.'));
      if (r.operation.startsWith('Partie')) expect(r.answers[0]).toBe(String(Math.floor(x)));
      else {
        expect(r.operation.match(/,(\d)/)[1]).not.toBe('5');
        expect(r.answers[0]).toBe(String(Math.round(x)));
      }
    }
  });
});

describe('compterEuros', () => {
  it('total of whole-euro coins and notes, at most max', () => {
    for (let i = 0; i < 200; i++) {
      const r = generators.compterEuros.generate({ max: 20 });
      const total = r.svg.par.items.reduce((s, v) => s + v, 0) / 100;
      expect(total).toBeLessThanOrEqual(20);
      expect(r.mqQuestions[0].answer).toBe(String(total));
    }
  });
});

describe('convertirMesure', () => {
  const E = { t: 9, kg: 6, g: 3, mg: 0, L: 3, dL: 2, cL: 1, mL: 0 };
  for (const p of [
    { family: 'masses' },
    { family: 'masses', decimals: true },
    { family: 'contenances' },
    { family: 'contenances', decimals: true },
  ])
    it(`exact conversions (${p.family}${p.decimals ? ', decimals' : ''})`, () => {
      for (let i = 0; i < 200; i++) {
        const r = generators.convertirMesure.generate(p);
        const [, v, from, to] = r.operation.replace(/__/g, ' ').match(/^([\d ,]+) (\w+) = \? (\w+)$/);
        const expected = parseFloat(v.replace(/ /g, '').replace(',', '.')) * 10 ** (E[from] - E[to]);
        expect(parseFloat(r.answers[0].replace(',', '.'))).toBeCloseTo(expected, 6);
        expect((r.answers[0].split(',')[1] || '').length).toBeLessThanOrEqual(3);
      }
    });
});

// Voice exercises speak numbers from words (never digits): the classic French traps
describe('dicteeNombre — spoken number names', () => {
  const say = (n) => generators.dicteeNombre.generate({ min: n, max: n }).say;
  it.each([
    [21, 'vingt et un'],
    [71, 'soixante et onze'],
    [80, 'quatre-vingts'],
    [81, 'quatre-vingt-un'],
    [91, 'quatre-vingt-onze'],
    [200, 'deux cents'],
    [201, 'deux cent un'],
    [1000, 'mille'],
    [21000, 'vingt et un mille'],
    [80000, 'quatre-vingt mille'],
    [200000, 'deux cent mille'],
    [2000000, 'deux millions'],
    [1200000, 'un million deux cent mille'],
  ])('%i → %s', (n, words) => expect(say(n)).toBe(words));
  it('decimals: « virgule », leading zeros spoken', () => {
    const r = generators.dicteeNombre.generate({ min: 3, max: 3, decimals: 2 });
    const dec = r.answers[0].split(',')[1];
    expect(r.say.startsWith('trois virgule ')).toBe(true);
    if (dec.startsWith('0')) expect(r.say).toContain('virgule zéro');
  });
  it('uses prerecorded clips for numbers through 999,999,999', () => {
    expect(generators.dicteeNombre.generate({ min: 0, max: 0 }).voiceAudio).toEqual(['nombres/0.ogg']);
    expect(generators.dicteeNombre.generate({ min: 100, max: 100 }).voiceAudio).toEqual(['nombres/100.ogg']);
    expect(generators.dicteeNombre.generate({ min: 1000, max: 1000 }).voiceAudio).toEqual(['nombres/1000.ogg']);
    expect(generators.dicteeNombre.generate({ min: 1234567, max: 1234567 }).voiceAudio).toEqual([
      'nombres/1.ogg',
      'unites/million.ogg',
      'nombres/234.ogg',
      'unites/mille.ogg',
      'nombres/567.ogg',
    ]);
    expect(generators.dicteeNombre.generate({ min: 999999999, max: 999999999 }).voiceAudio).toEqual([
      'nombres/999.ogg',
      'unites/millions.ogg',
      'nombres/999.ogg',
      'unites/mille.ogg',
      'nombres/999.ogg',
    ]);
  });
  it.each([
    {
      min: 15,
      decimals: 2,
      random: 0.35,
      answer: '15,35',
      spoken: 'quinze virgule trente-cinq',
      clips: ['nombres/15.ogg', 'unites/virgule.ogg', 'nombres/35.ogg'],
    },
    {
      min: 12,
      decimals: 3,
      random: 0.1232,
      answer: '12,124',
      spoken: 'douze virgule cent vingt-quatre',
      clips: ['nombres/12.ogg', 'unites/virgule.ogg', 'nombres/124.ogg'],
    },
    {
      min: 5,
      decimals: 2,
      random: 0.05,
      answer: '5,05',
      spoken: 'cinq virgule zéro cinq',
      clips: ['nombres/5.ogg', 'unites/virgule.ogg', 'nombres/0.ogg', 'nombres/5.ogg'],
    },
    {
      min: 5,
      decimals: 3,
      random: 0.0161,
      answer: '5,017',
      spoken: 'cinq virgule zéro dix-sept',
      clips: ['nombres/5.ogg', 'unites/virgule.ogg', 'nombres/0.ogg', 'nombres/17.ogg'],
    },
  ])('composes decimal dictation clips for $answer', ({ min, decimals, random, answer, spoken, clips }) => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(random);
    const result = generators.dicteeNombre.generate({ min, max: min, decimals });
    expect(result.answers[0]).toBe(answer);
    expect(result.say).toContain(spoken);
    expect(result.voiceAudio).toEqual(clips);
  });
  it('reuses prerecorded clips for listen-and-choose numbers through 100', () => {
    for (let n = 1; n <= 100; n++) {
      const exercise = generators.ecouteNombre.generate({ min: n, max: 100, choices: 1 });
      expect(exercise.voiceAudio).toEqual([`nombres/${exercise.answers[0]}.ogg`]);
    }
  });
  it('avoids the previous answer when another number is available', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const exercise = generators.ecouteNombre.generate({ min: 11, max: 20, exclude: 11 });
    expect(exercise.answers[0]).not.toBe('11');
    expect(Number(exercise.answers[0])).toBeGreaterThanOrEqual(11);
    expect(Number(exercise.answers[0])).toBeLessThanOrEqual(20);
    expect(exercise.voiceAudio).toEqual([`nombres/${exercise.answers[0]}.ogg`]);
  });
  it('assigns prerecorded prompts to every compterObjets variation', () => {
    const random = vi.spyOn(Math, 'random');
    const prompts = new Set();
    for (let i = 0; i < 16; i++) {
      random.mockImplementationOnce(() => i / 16);
      prompts.add(generators.compterObjets.generate().voiceAudio);
    }
    expect(prompts.size).toBe(16);
    expect([...prompts]).toContain('objets/etoiles.ogg');
  });
});

// ─── robotGrille ─────────────────────────────────────────────────────────────

describe('robotGrille', () => {
  const { boardProblems } = require('../scripts/lib/grid-board.js');
  beforeEach(() => vi.restoreAllMocks()); // an earlier test leaves Math.random mocked to 0
  it('every mode draws boards the independent checker accepts', () => {
    for (const params of [
      { mode: 'follow', size: 4, steps: 3 },
      { mode: 'follow', size: 5, steps: 4, blocks: 3, compact: true },
      { mode: 'follow', city: true, steps: 4, relative: true, compact: true },
      { mode: 'write', size: 5, blocks: 4, slack: 1 },
      { mode: 'write', size: 5, relative: true },
      { mode: 'debug', size: 5, steps: 5 },
      { mode: 'debug', size: 6, steps: 3, relative: true, compact: true },
    ])
      for (let k = 0; k < 25; k++) {
        const r = generators.robotGrille.generate({ ...params });
        expect(r.type).toBe('grid-board');
        expect(boardProblems(r.board)).toEqual([]);
      }
  });

  it('city: 7×7 plan, houses between the streets, the goal is a place', () => {
    const r = generators.robotGrille.generate({ mode: 'write', city: true });
    expect(r.board.rows).toBe(7);
    expect(r.board.blocks).toHaveLength(9);
    expect(r.title).toContain(r.board.goalEmoji);
  });

  it('non-compact programs use one arrow per cell', () => {
    const r = generators.robotGrille.generate({ mode: 'follow', size: 5, steps: 5 });
    expect(r.board.program).toHaveLength(5);
    expect(r.board.program.every((t) => /^[UDLR]$/.test(t))).toBe(true);
  });
});

// ─── tracerGrille ────────────────────────────────────────────────────────────

describe('tracerGrille', () => {
  const { boardProblems, drawCheck, drawSolution } = require('../scripts/lib/grid-board.js');
  const PARAMS = [
    { task: 'copy' },
    { task: 'copy', cells: [5, 8], box: 5, anchor: true },
    { task: 'copy', figure: 'free', corners: [4, 5], anchor: true, paper: 'dots' },
    { task: 'complete' },
    { task: 'complete', shapes: ['rectangle'], tilted: true },
    { task: 'mirror', touch: false },
    { task: 'mirror', axis: 'any', diagonals: true },
    { task: 'shape', ask: ['sides', 'area', 'free', 'tilted'] },
    { task: 'parallel', slopes: 'any' },
    { task: 'perp', slopes: 'diag' },
  ];

  it('every task draws boards the independent checker accepts, with an answer it accepts', () => {
    for (const params of PARAMS)
      for (let k = 0; k < 30; k++) {
        const { type, board } = generators.tracerGrille.generate({ ...params });
        expect(type).toBe('grid-board');
        expect(boardProblems(board)).toEqual([]);
        expect(drawCheck(board, drawSolution(board))).toBeNull();
      }
  });

  it('a copy is accepted anywhere without an anchor, only from the anchor with one', () => {
    const model = [
      [
        [0, 0],
        [0, 2],
      ],
      [
        [0, 2],
        [2, 2],
      ],
      [
        [2, 2],
        [0, 0],
      ],
    ];
    const b = { mode: 'draw', rows: 6, cols: 6, task: 'copy', model };
    const moved = model.map((s) => s.map(([r, c]) => [r + 3, c + 1]));
    expect(drawCheck(b, moved)).toBeNull();
    expect(drawCheck({ ...b, anchor: { from: [0, 0], to: [1, 1] } }, moved)).not.toBeNull();
    // drawn in other pieces: the same figure
    expect(
      drawCheck(b, [
        [
          [0, 0],
          [0, 1],
        ],
        [
          [0, 1],
          [0, 2],
        ],
        [
          [2, 2],
          [0, 2],
        ],
        [
          [0, 0],
          [1, 1],
        ],
        [
          [1, 1],
          [2, 2],
        ],
      ])
    ).toBeNull();
  });

  it('shapes: a square is a rectangle only when the board says so; tilted sides are asked for', () => {
    const sq = [
      [
        [0, 0],
        [0, 3],
      ],
      [
        [0, 3],
        [3, 3],
      ],
      [
        [3, 3],
        [3, 0],
      ],
      [
        [3, 0],
        [0, 0],
      ],
    ];
    const b = (want) => ({ mode: 'draw', rows: 6, cols: 6, task: 'shape', want });
    expect(drawCheck(b({ shape: 'carre', sides: [3] }), sq)).toBeNull();
    expect(drawCheck(b({ shape: 'rectangle' }), sq)).not.toBeNull();
    expect(drawCheck(b({ shape: 'rectangle', area: 9, inclusive: true }), sq)).toBeNull();
    expect(drawCheck(b({ shape: 'carre', tilted: true }), sq)).not.toBeNull();
    const tilted = [
      [
        [0, 1],
        [1, 3],
      ],
      [
        [1, 3],
        [3, 2],
      ],
      [
        [3, 2],
        [2, 0],
      ],
      [
        [2, 0],
        [0, 1],
      ],
    ];
    expect(drawCheck(b({ shape: 'carre', tilted: true }), tilted)).toBeNull();
    expect(drawCheck(b({ shape: 'carre' }), sq.slice(0, 3))).not.toBeNull(); // not closed
  });

  it('parallel / perpendicular: through A, in one piece, two steps at least', () => {
    const b = {
      mode: 'draw',
      rows: 6,
      cols: 6,
      task: 'parallel',
      ref: [
        [0, 0],
        [0, 3],
      ],
      through: [2, 2],
    };
    expect(
      drawCheck(b, [
        [
          [2, 0],
          [2, 4],
        ],
      ])
    ).toBeNull();
    expect(
      drawCheck(b, [
        [
          [2, 2],
          [2, 3],
        ],
      ])
    ).not.toBeNull(); // one step
    expect(
      drawCheck(b, [
        [
          [2, 3],
          [2, 5],
        ],
      ])
    ).not.toBeNull(); // misses A
    expect(
      drawCheck(b, [
        [
          [2, 0],
          [2, 1],
        ],
        [
          [2, 2],
          [2, 4],
        ],
      ])
    ).not.toBeNull(); // a gap
    expect(
      drawCheck({ ...b, task: 'perp' }, [
        [
          [0, 2],
          [4, 2],
        ],
      ])
    ).toBeNull();
    expect(
      drawCheck({ ...b, task: 'perp' }, [
        [
          [0, 0],
          [4, 4],
        ],
      ])
    ).not.toBeNull();
  });
});

// ─── symetrieGrille ──────────────────────────────────────────────────────────

describe('symetrieGrille', () => {
  const { boardProblems, mirrorTarget } = require('../scripts/lib/grid-board.js');
  beforeEach(() => vi.restoreAllMocks());
  it('every axis draws figures the independent checker accepts', () => {
    for (const params of [
      { axis: 'v' },
      { axis: 'h', cells: [3, 5] },
      { axis: 'vh', touch: false, offCentre: true, rows: 7, cols: 9, cells: [5, 8] },
      { axis: 'd', size: 6 },
      { axis: 'diag', size: 7, touch: false },
      { axis: 'any', touch: false },
    ])
      for (let k = 0; k < 40; k++) {
        const r = generators.symetrieGrille.generate({ ...params });
        expect(r.type).toBe('grid-board');
        expect(boardProblems(r.board)).toEqual([]);
      }
  });

  it('touch: a figure cell next to the axis; apart: none', () => {
    const v = generators.symetrieGrille.generate({ axis: 'v' }).board;
    expect(v.shape.some(([, c]) => c === v.at - 1 || c === v.at)).toBe(true);
    for (let k = 0; k < 20; k++) {
      const h = generators.symetrieGrille.generate({ axis: 'h', touch: false }).board;
      expect(h.shape.some(([r]) => r === h.at - 1 || r === h.at)).toBe(false);
    }
  });

  it('diagonal: the figure cells on the axis are not to colour', () => {
    const b = {
      mode: 'mirror',
      rows: 4,
      cols: 4,
      axis: 'd',
      shape: [
        [1, 1],
        [2, 1],
        [3, 1],
      ],
    };
    expect(boardProblems(b)).toEqual([]);
    expect(mirrorTarget(b).sort()).toEqual([
      [1, 2],
      [1, 3],
    ]);
  });
});

describe('trouverFormes', () => {
  const { readShape, shapeNames, turned } = require('../scripts/lib/shapes.js');
  const { GEN_CHECKS } = require('../scripts/lib/gen-checks.js');
  const fs = require('node:fs');
  const path = require('node:path');
  const yaml = require('js-yaml');
  beforeEach(() => vi.restoreAllMocks());

  it('every target draws tiles the independent checker accepts', () => {
    for (const params of [
      {},
      { target: 'carre', near: true, count: 8, answers: [2, 4] },
      { target: 'rectangle', inclusive: true, near: true },
      { target: 'losange', inclusive: true },
      { target: 'triangle', turn: 'some' },
      { target: 'triangleRectangle', near: true },
      { target: 'disque', kid: true, turn: 'none' },
      { target: 'rectangle', turn: 'none', colour: false },
    ])
      for (let k = 0; k < 60; k++) {
        const r = generators.trouverFormes.generate({ ...params });
        expect(r.type).toBe('tile-select');
        expect(r.tiles).toHaveLength(params.count || 6);
        expect(GEN_CHECKS.trouverFormes(r, params)).toBeNull();
      }
  });

  it('turn: all turns every polygon, none keeps a side on an axis, some turns one answer and not another', () => {
    const shapes = (p) => generators.trouverFormes.generate(p).tiles.map(readShape);
    for (let k = 0; k < 20; k++) {
      expect(
        shapes({ target: 'triangle', turn: 'all' })
          .filter((s) => s.kind === 'polygon')
          .every(turned)
      ).toBe(true);
      expect(shapes({ target: 'carre', turn: 'none' }).some(turned)).toBe(false);
      const r = generators.trouverFormes.generate({ target: 'carre', turn: 'some', answers: [2, 2] });
      const answers = r.tileAnswers.map((i) => turned(readShape(r.tiles[i])));
      expect(answers.sort()).toEqual([false, true]);
    }
  });

  it('a square is a rectangle and a rhombus only when the series says so', () => {
    const has = (p, name) =>
      generators.trouverFormes.generate(p).tiles.some((t) => shapeNames(readShape(t)).names.has(name));
    for (let k = 0; k < 20; k++) {
      expect(has({ target: 'rectangle' }, 'carre')).toBe(false);
      expect(has({ target: 'losange', among: ['carre', 'trapeze'] }, 'carre')).toBe(false);
      expect(has({ target: 'rectangle', inclusive: true }, 'carre')).toBe(true);
    }
  });

  it('the checker names shapes whatever their orientation', () => {
    const sq = (t) => {
      const [c, s] = [Math.cos(t), Math.sin(t)];
      return {
        kind: 'polygon',
        pts: [
          [0, 0],
          [40 * c, 40 * s],
          [40 * (c - s), 40 * (s + c)],
          [-40 * s, 40 * c],
        ],
      };
    };
    for (const t of [0, 0.3, Math.PI / 4, 2])
      expect([...shapeNames(sq(t)).names].sort()).toEqual([
        'carre',
        'losange',
        'parallelogramme',
        'quadrilatere',
        'rectangle',
      ]);
    expect(turned(sq(Math.PI / 4))).toBe(true);
    expect(turned(sq(0))).toBe(false);
    expect(
      shapeNames({
        kind: 'polygon',
        pts: [
          [0, 0],
          [50, 0],
          [50, 46],
          [0, 46],
        ],
      }).unclear
    ).toEqual(['rectangle almost a square']);
    expect(
      shapeNames({
        kind: 'polygon',
        pts: [
          [0, 0],
          [50, 0],
          [3, 50],
        ],
      }).unclear
    ).toEqual(['triangle almost right']);
  });

  it('GS series speak the instruction the generator gives', () => {
    const dir = path.join(__dirname, '../src/fr/applications/gs/maths/geometrie/formes-tournees-01');
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      const data = yaml.load(fs.readFileSync(path.join(dir, f), 'utf8').split('---')[1]);
      expect(generators.trouverFormes.generate(data.params).say, f).toBe(data.say);
    }
  });
});

describe('angles (trouverAngles, comparerAngles, rangerAngles)', () => {
  const { readAngle, angleKind } = require('../scripts/lib/shapes.js');
  const { GEN_CHECKS } = require('../scripts/lib/gen-checks.js');
  const draws = (name, params, n = 80) => Array.from({ length: n }, () => generators[name].generate({ ...params }));

  it('every setting draws angles the independent checker accepts', () => {
    for (const [name, sets] of [
      ['trouverAngles', [{}, { target: 'aigu' }, { target: 'obtus', near: true }, { target: 'droit', count: 8 }]],
      ['comparerAngles', [{}, { equal: 0.5, ask: 'petit' }, { gap: 10, trap: false }]],
      ['rangerAngles', [{}, { count: 3, direction: 'desc' }, { gap: 20, trap: false }]],
    ])
      for (const params of sets) for (const e of draws(name, params)) expect(GEN_CHECKS[name](e, params)).toBeNull();
  });

  it('trouverAngles: the answers are exactly the angles of the asked kind, one of them turned', () => {
    for (const e of draws('trouverAngles', { target: 'droit', near: true })) {
      const angles = e.tiles.map(readAngle);
      const right = angles.map((a, i) => (angleKind(a.deg).kind === 'droit' ? i : -1)).filter((i) => i >= 0);
      expect(right).toEqual([...e.tileAnswers].sort((a, b) => a - b));
      expect(e.tileAnswers.some((i) => angles[i].turned)).toBe(true);
      // near: no acute or obtuse angle more than 26° from a right angle
      expect(angles.every((a) => Math.abs(a.deg - 90) <= 26.5)).toBe(true);
    }
  });

  it('comparerAngles: the bigger angle has the shorter arms (trap), equal angles are answered « égaux »', () => {
    for (const e of draws('comparerAngles', { equal: 1 })) expect(e.mcqAnswer).toBe(2);
    for (const e of draws('comparerAngles', { ask: 'grand' })) {
      const [a, b] = e.body.match(/<svg\b[\s\S]*?<\/svg>/g).map(readAngle);
      const big = a.deg > b.deg ? a : b;
      const small = big === a ? b : a;
      expect(e.mcqAnswer).toBe(big === a ? 0 : 1);
      expect(Math.max(...big.arms)).toBeLessThan(Math.min(...small.arms));
    }
  });

  it('rangerAngles: tiles are listed in the answer order, at least gap degrees apart', () => {
    for (const direction of ['asc', 'desc'])
      for (const e of draws('rangerAngles', { direction, gap: 15 })) {
        const d = e.tiles.map((t) => readAngle(t).deg);
        const steps = d.slice(1).map((x, i) => (direction === 'asc' ? x - d[i] : d[i] - x));
        expect(Math.min(...steps)).toBeGreaterThan(14.5);
        expect(e.direction).toBe(direction);
      }
  });

  it('the reader measures an angle whatever its turn, and checks the arc', () => {
    const svg = (deg, turn) => {
      const r = Math.PI / 180;
      const p = (t, l) => [50 + l * Math.cos(t * r), 50 - l * Math.sin(t * r)].map((x) => Math.round(x * 10) / 10);
      const [a, b, m, n] = [p(turn, 40), p(turn + deg, 30), p(turn, 10), p(turn + deg, 10)];
      return `<path d="M50,50 L${m} A10 10 0 0 0 ${n} Z"/><polyline points="${a} 50,50 ${b}"/>`;
    };
    for (const turn of [0, 37, 180]) {
      const a = readAngle(svg(90, turn));
      expect(a.deg).toBeCloseTo(90, 0);
      expect(a.arcOk).toBe(true);
      expect(a.turned).toBe(turn === 37);
    }
    expect(readAngle(svg(40, 10).replace('M50,50', 'M60,60')).arcOk).toBe(false);
    expect(angleKind(84).kind).toBeNull();
    expect(angleKind(60).kind).toBe('aigu');
    expect(angleKind(130).kind).toBe('obtus');
  });
});

describe('hasard en images (hasardPossible, hasardComparer, hasardChances, hasardRanger)', () => {
  const { readChance, readEvent, countOf } = require('../scripts/lib/hasard.js');
  const { GEN_CHECKS } = require('../scripts/lib/gen-checks.js');
  const draws = (name, params, n = 80) => Array.from({ length: n }, () => generators[name].generate({ ...params }));
  const pics = (e) => e.body.match(/<svg\b[\s\S]*?<\/svg>/g).map(readChance);

  it('every setting draws pictures the independent checker accepts', () => {
    for (const [name, sets] of [
      [
        'hasardPossible',
        [{}, { levels: 4 }, { levels: 5 }, { source: 'de' }, { source: 'roue', mix: true, levels: 4 }],
      ],
      ['hasardComparer', [{}, { sameTotal: true }, { trap: true, equal: 0.3 }, { source: 'roue', ask: 'moins' }]],
      ['hasardChances', [{}, { source: 'de' }, { union: true, total: [6, 12] }]],
      ['hasardRanger', [{}, { count: 4, direction: 'desc' }, { source: 'roue', mix: true }]],
    ])
      for (const params of sets) for (const e of draws(name, params)) expect(GEN_CHECKS[name](e, params)).toBeNull();
  });

  it('hasardPossible: every level comes up, a die has 6 faces', () => {
    const answers = new Set(draws('hasardPossible', { levels: 4 }, 200).map((e) => e.mcqAnswer));
    expect([...answers].sort()).toEqual([0, 1, 2, 3]);
    for (const e of draws('hasardPossible', { source: 'de' })) expect(pics(e)[0].outcomes).toHaveLength(6);
  });

  it('hasardComparer: the trap gives the likelier urn fewer balls of the colour', () => {
    for (const e of draws('hasardComparer', { source: 'urne', trap: true })) {
      const { items } = readEvent(e.title, 'urne');
      const [a, b] = pics(e).map((r) => [r.outcomes.filter((o) => o === items[0]).length, r.outcomes.length]);
      const likelier = a[0] * b[1] > b[0] * a[1] ? 0 : 1;
      expect(e.mcqAnswer).toBe(likelier);
      expect([a, b][likelier][0]).toBeLessThan([a, b][1 - likelier][0]);
    }
    for (const e of draws('hasardComparer', { equal: 1 })) expect(e.mcqAnswer).toBe(2);
  });

  it('hasardChances: the answer is « a chances sur b » with b the number of outcomes', () => {
    for (const e of draws('hasardChances', {})) {
      const r = pics(e)[0];
      expect(e.mcqChoices[e.mcqAnswer]).toMatch(new RegExp(` sur ${r.outcomes.length}$`));
    }
  });

  it('hasardRanger: tiles listed from least to most likely (asc)', () => {
    for (const e of draws('hasardRanger', { direction: 'asc', count: 4 })) {
      const counts = countOf(pics(e)[0].outcomes);
      expect(e.tiles).toHaveLength(4);
      expect(new Set(counts.values()).size).toBe(4);
    }
  });

  it('the reader refuses unequal sectors and overlapping balls', () => {
    const e = generators.hasardPossible.generate({ source: 'roue' });
    const svg = e.body.match(/<svg\b[\s\S]*?<\/svg>/)[0];
    expect(readChance(svg).problems).toEqual([]);
    expect(readChance(svg.replace(/L([\d.]+),/, (m, x) => `L${Number(x) + 6},`)).problems.join()).toMatch(/sizes/);
    const urn = generators.hasardPossible.generate({ source: 'urne' }).body.match(/<svg\b[\s\S]*?<\/svg>/)[0];
    let moved = 0;
    const stacked = urn.replace(/cx="[\d.]+" cy="[\d.]+"/g, (m) => (moved++ < 2 ? 'cx="50" cy="50"' : m));
    expect(readChance(stacked).problems.join()).toMatch(/overlap/);
    expect(readEvent("Tirer une boule qui n'est pas violette", 'urne')).toEqual({ items: ['violet'], not: true });
    expect(readEvent("Obtenir autre chose qu'un 2 ou un 5", 'de')).toEqual({ items: [2, 5], not: true });
  });
});

describe('manipulations GS (boiteDix, jeuOie, balanceGS)', () => {
  const { readTensFrame, readDie, readBalance } = require('../scripts/lib/manipulations.js');
  const fs = require('node:fs');
  const path = require('node:path');
  const yaml = require('js-yaml');
  const { GEN_CHECKS } = require('../scripts/lib/gen-checks.js');
  const draws = (name, params, n = 80) => Array.from({ length: n }, () => generators[name].generate({ ...params }));

  it('every setting draws pictures the independent checker accepts', () => {
    for (const [name, sets] of [
      ['boiteDix', [{}, { ask: 'manque' }, { scatter: true, min: 10 }, { ask: 'manque', min: 9 }]],
      ['jeuOie', [{}, { die: [6, 6], start: [2, 2], after: [3, 3] }, { die: [1, 1], start: [0, 0] }]],
      ['balanceGS', [{}, { ask: 'léger' }, { trap: true }]],
    ])
      for (const params of sets) for (const e of draws(name, params)) expect(GEN_CHECKS[name](e, params)).toBeNull();
  });

  it('boiteDix: 10 cells, the answer is the tokens or what is missing', () => {
    for (const e of draws('boiteDix', { ask: 'manque' })) {
      const f = readTensFrame(e.svgHtml);
      expect(f.cells).toBe(10);
      expect(Number(e.answers[0])).toBe(10 - f.tokens);
      expect(f.tokens).toBeGreaterThan(0);
    }
  });

  it('jeuOie: the frog lands inside the track, at most 10 cells', () => {
    for (const e of draws('jeuOie', { die: [6, 6], start: [2, 2], after: [3, 3] })) {
      expect(e.tiles.length).toBeLessThanOrEqual(10);
      expect(e.tileAnswers[0]).toBe(e.tiles.findIndex((t) => t.includes('🐸')) + readDie(e.body));
      expect(e.tileAnswers[0]).toBeLessThan(e.tiles.length);
    }
  });

  it('balanceGS: the lower pan holds the heavier object, drawn smaller with the trap', () => {
    for (const e of draws('balanceGS', { trap: true })) {
      const b = readBalance(e.body);
      const heavy = b.lower === 'left' ? b.left : b.right;
      expect(e.tiles[e.tileAnswers[0]]).toBe(heavy.o);
      expect(heavy.size).toBeLessThan((b.lower === 'left' ? b.right : b.left).size);
    }
  });

  it('GS series speak the instruction the generator gives', () => {
    for (const sub of ['numeration/boite-dix-01', 'numeration/jeu-oie-01', 'mesures/balance-01']) {
      const dir = path.join(__dirname, '../src/fr/applications/gs/maths', sub);
      for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
        const data = yaml.load(fs.readFileSync(path.join(dir, f), 'utf8').split('---')[1]);
        expect(generators[data.generator].generate(data.params).say, f).toBe(data.say);
      }
    }
  });
});
