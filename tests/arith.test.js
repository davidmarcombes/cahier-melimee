import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { num, tokenize, evaluate, same, Unparseable } = require('../scripts/lib/arith.js');

describe('arith — French notation', () => {
  it.each([
    ['47 + 38', 85],
    ['1 000 - 1', 999],
    ['5,8 - 2,3', 3.5],
    ['7 × 8', 56],
    ['56 : 7', 8],
    ['56 ÷ 7', 8],
    ['9 − 4', 5],
    ['(2 + 3) × 4', 20],
    ['2 + 3 × 4', 14],
    ['3/4', 0.75],
    ['&frac(3,4) de 12', 9],
    ['&box(8 + 2) + 5', 15],
    ['5 x 10^{3} + 2 x 10^{2}', 5200],
    ['moitié de 24', 12],
    ['le double de 7', 14],
    ['1 dizaine et 3 unités', 13],
    ['4 centaines et 2 dizaines', 420],
  ])('%s = %d', (expr, v) => {
    expect(same(num(expr), v)).toBe(true);
  });

  it('fills ? holes in order', () => {
    expect(evaluate(tokenize('? + 38'), [47])).toBe(85);
    expect(evaluate(tokenize('? dizaines et ? unités'), [1, 5])).toBe(15);
  });

  it('refuses what it cannot read instead of guessing', () => {
    expect(() => num('7 pommes + 2')).toThrow(Unparseable);
    expect(() => num('🍎 + 1')).toThrow(Unparseable);
    expect(() => num('(2 + 3')).toThrow(Unparseable);
    expect(() => num('2 +')).toThrow(Unparseable);
  });
});

describe('CSV type lists stay in sync', () => {
  // The exercise-list filter decodes the CSV with the list in app.js; the build encodes it with the
  // list in .eleventy.js. When they drifted, 8 types showed no label in the filter.
  const list = (file) => {
    const src = readFileSync(file, 'utf8');
    const block = src.slice(src.indexOf('const CSV_TYPES = ['), src.indexOf('];', src.indexOf('const CSV_TYPES = [')));
    return [...block.matchAll(/'([^']*)'/g)].map((m) => m[1]);
  };
  it('app.js and .eleventy.js declare the same types in the same order', () => {
    const app = list('src/assets/js/app.js');
    expect(app.length).toBeGreaterThan(40);
    expect(app).toEqual(list('.eleventy.js'));
  });
});
