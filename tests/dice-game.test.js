import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { fermeLaBoite } = require('../src/assets/js/generators/logique.js');
const { dgMove, dgProblem } = require('../scripts/lib/dice-game.js');

describe('dice-game', () => {
  it('finds a group of open tiles making the dice, fewest tiles first', () => {
    expect(dgMove([1, 2, 3, 4, 5, 6, 7, 8, 9], 9)).toEqual([9]);
    expect(dgMove([1, 2, 3, 4], 9)).toEqual([4, 3, 2]);
    expect(dgMove([2, 4, 6], 5)).toBeNull();
    expect(dgMove([], 3)).toBeNull();
  });

  it('refuses a box whose first roll may not be playable', () => {
    expect(dgProblem({ kind: 'boite', tiles: 9, dice: 2 })).toBeNull();
    expect(dgProblem({ kind: 'boite', tiles: 4, dice: 2 })).toMatch(/cannot be played/); // 1+2+3+4 = 10 < 12
    expect(dgProblem({ kind: 'boite', tiles: 9, dice: 3 })).toMatch(/1 or 2/);
  });

  it('builds good boxes', () => {
    for (const params of [{ tiles: 6 }, { tiles: 9, oneDie: true }, { tiles: 12 }])
      expect(dgProblem(fermeLaBoite.generate(params).dg)).toBeNull();
  });
});
