import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { jeuStrategie } = require('../src/assets/js/generators/logique.js');
const { sgWinning, sgFirst, sgProblem } = require('../scripts/lib/strategy-game.js');

describe('strategy-game', () => {
  it('finds the winning numbers of the course à 20', () => {
    const win = sgWinning(20, [1, 2]);
    // say 2, 5, 8 … 20: the steps left then are a multiple of 3, lost for the one to move
    const said = Array.from({ length: 20 }, (_, i) => i + 1).filter((s) => !win[20 - s]);
    expect(said).toEqual([2, 5, 8, 11, 14, 17, 20]);
    expect(sgFirst({ total: 20, moves: [1, 2] })).toBe('eleve');
    expect(sgFirst({ total: 21, moves: [1, 2] })).toBe('ordi');
  });

  it('leaves 1, 5, 9 … sticks when the last one loses', () => {
    const win = sgWinning(15, [1, 2, 3], true);
    expect(Array.from({ length: 15 }, (_, r) => r + 1).filter((r) => !win[r])).toEqual([1, 5, 9, 13]);
  });

  it('refuses a game the pupil cannot win or cannot finish', () => {
    expect(sgProblem({ kind: 'course', total: 21, moves: [1, 2], smart: 1, first: 'eleve' })).toMatch(/cannot force/);
    expect(sgProblem({ kind: 'course', total: 20, moves: [2, 3], smart: 1, first: 'eleve' })).toMatch(/include 1/);
  });

  it('always gives the pupil the winning seat', () => {
    for (const params of [
      { total: [10, 40] },
      { kind: 'allumettes', total: [10, 25], moves: [1, 2, 3], misere: true },
      {
        total: [20, 40],
        moves: [
          [1, 3, 4],
          [1, 2, 3, 4],
        ],
      },
    ])
      for (let k = 0; k < 50; k++) expect(sgProblem(jeuStrategie.generate(params).sg)).toBeNull();
  });
});
