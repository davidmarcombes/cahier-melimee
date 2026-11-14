import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { tableauNombres } = require('../src/assets/js/generators/numeration.js');
const { hbProblem, hbWalk, hbRuleCells, hbClueText } = require('../scripts/lib/hundred-board.js');

const board = (o) => ({ start: 1, rows: 10, ...o });

describe('hundred-board', () => {
  it('walks the board without crossing its edge', () => {
    expect(hbWalk(board(), 34, ['d', 'd', 'r'])).toBe(55);
    expect(hbWalk(board(), 10, ['r'])).toBeNull(); // 10 is at the end of its row: → would wrap to 11
    expect(hbWalk(board(), 95, ['d'])).toBeNull();
    expect(hbWalk(board({ start: 301 }), 301, ['l'])).toBeNull();
  });

  it('colours the rule, and only it', () => {
    expect(hbRuleCells(board(), { k: 'unites', v: 5 })).toEqual([5, 15, 25, 35, 45, 55, 65, 75, 85, 95]);
    expect(hbRuleCells(board(), { k: 'pas', from: 3, step: 4, to: 15 })).toEqual([3, 7, 11, 15]);
  });

  it('refuses clues that point to several numbers or miss the target', () => {
    const c = (k, v) => ({ k, v, text: hbClueText({ k, v }) });
    expect(hbProblem(board({ mode: 'find', target: 47, clues: [c('unites', 7)] }))).toMatch(/10 numbers/);
    expect(hbProblem(board({ mode: 'find', target: 47, clues: [c('unites', 7), c('dizaines', 4)] }))).toBeNull();
    expect(hbProblem(board({ mode: 'find', target: 48, clues: [c('unites', 7), c('dizaines', 4)] }))).toMatch(
      /does not meet/
    );
    expect(
      hbProblem(
        board({ mode: 'find', target: 47, clues: [{ k: 'unites', v: 7, text: 'Mon chiffre des unités est 8.' }] })
      )
    ).toMatch(/clue text/);
  });

  it('refuses a path that ends elsewhere or a pattern that is not the rule', () => {
    const text = 'Pars de 34. Suis les flèches : ↓ →';
    expect(hbProblem(board({ mode: 'find', from: 34, path: ['d', 'r'], target: 45, text }))).toBeNull();
    expect(hbProblem(board({ mode: 'find', from: 34, path: ['d', 'r'], target: 46, text }))).toMatch(/ends on 45/);
    const rule = { k: 'unites', v: 5 };
    const ruleText = 'Colorie tous les nombres dont le chiffre des unités est 5.';
    expect(hbProblem(board({ mode: 'color', rule, text: ruleText, answer: [5, 15] }))).toMatch(/the rule gives/);
  });

  it('always builds a good board', () => {
    const S = [101, 201, 301, 901, 1001, 4901];
    for (const params of [
      { mode: 'find', clues: [['dizaines', 'unites'], ['apres'], ['avant'], ['dessous'], ['dessus']] },
      {
        mode: 'find',
        clues: [
          ['entre', 'unites'],
          ['somme', 'dizaines'],
          ['plus', 'moins', 'impair'],
        ],
      },
      { mode: 'find', start: S, clues: [['entre', 'unites'], ['somme', 'entre'], ['dessous']] },
      {
        mode: 'find',
        kind: 'deplacements',
        moves: ['d', 'r', 'u', 'l'],
        steps: [2, 5],
        hide: true,
        landmarks: [1, 100],
      },
      { mode: 'find', kind: 'deplacements', start: S, steps: [3, 5], hide: true },
      { mode: 'fill', blanks: [3, 7], start: S },
      { mode: 'fill', kind: 'morceau', start: S },
      { mode: 'fill', kind: 'morceau' },
      {
        mode: 'color',
        rules: [
          { k: 'pas', step: 10, from: [1, 9] },
          { k: 'unites', v: [1, 9] },
        ],
      },
      {
        mode: 'color',
        start: S,
        rules: [
          { k: 'pas', step: [2, 9], from: [1, 9] },
          { k: 'dizaines', v: [0, 9] },
        ],
      },
    ])
      for (let k = 0; k < 60; k++) {
        const { hb } = tableauNombres.generate(params);
        expect(hbProblem(hb), JSON.stringify(hb)).toBeNull();
      }
  });

  it('writes the start number and hides the answer on a hidden board', () => {
    for (let k = 0; k < 40; k++) {
      const { hb } = tableauNombres.generate({ mode: 'find', kind: 'deplacements', hide: true, landmarks: [1, 100] });
      expect(hb.shown).toContain(hb.from);
      expect(hb.shown).not.toContain(hb.target);
    }
  });
});
