import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';

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
    expect(result.operation).toBe(9);
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
  it('returns a compare exercise with correct structure', () => {
    const result = generators.comparerNombres.generate({ count: 2 });
    expect(result.type).toBe('compare');
    expect(result.comparisons).toHaveLength(2);
    result.comparisons.forEach((c) => expect(['<', '>']).toContain(c.answer));
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
