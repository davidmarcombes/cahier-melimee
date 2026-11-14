import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { picrossImage } = require('../src/assets/js/generators/logique.js');
const { runs, pxSolve, pxClues, pxProblem, pxLabelValue } = require('../scripts/lib/picross.js');

describe('picross', () => {
  it('reads the runs of a line', () => {
    expect(runs('##.#..###')).toEqual([2, 1, 3]);
    expect(runs('.....')).toEqual([0]);
    expect(runs([1, 1, 0, 1])).toEqual([2, 1]);
  });

  it('counts the solutions of ambiguous clues', () => {
    expect(pxSolve([[1], [1]], [[1], [1]]).count).toBe(2);
    expect(pxSolve([[2], [1]], [[2], [1]]).count).toBe(1);
  });

  it('gives every picture a single solution, square and named', () => {
    for (const [key, pic] of Object.entries(picrossImage.pictures)) {
      expect(
        pic.rows.every((r) => r.length === pic.rows.length),
        key
      ).toBe(true);
      expect(pic.name && pic.emoji && pic.color, key).toBeTruthy();
      expect(pxProblem({ ...pxClues(pic.rows), picture: pic.rows }), key).toBeNull();
    }
  });

  it('refuses clues that do not match the picture or have two solutions', () => {
    const picture = ['#.', '.#'];
    expect(pxProblem({ ...pxClues(picture), picture })).toMatch(/more than one/);
    expect(pxProblem({ rows: [[2], [0]], cols: [[1], [1]], picture: ['##', '#.'] })).toMatch(/do not match/);
  });

  it('values calculation labels', () => {
    expect(pxLabelValue('2+3')).toBe(5);
    expect(pxLabelValue('9−4')).toBe(5);
    expect(pxLabelValue('12÷4')).toBe(3);
    expect(pxLabelValue('¾ de 8')).toBe(6);
    expect(pxLabelValue('2,5+1,5')).toBe(4);
    expect(pxLabelValue('7')).toBe(7);
  });

  it('writes labels worth their number with every operation', () => {
    for (const labels of [['+', '−'], ['×', '÷'], ['frac'], ['dec']])
      for (let k = 0; k < 40; k++) {
        const { px } = picrossImage.generate({ size: 8, labels });
        expect(pxProblem(px)).toBeNull();
      }
  });
});
