import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { tangramFigure } = require('../src/assets/js/generators/geometrie.js');
const { SHAPES, pieceCells, tgCoverProblem, tgProblem } = require('../scripts/lib/tangram.js');

const area = (shape) => pieceCells(shape, [0, 0, 0, 0]).length / 4;

describe('tangram', () => {
  it('cuts the pieces into quarters of their area', () => {
    expect([area('gt'), area('mt'), area('pt'), area('ca'), area('pa')]).toEqual([4, 2, 1, 2, 2]);
    // a turn or a flip keeps the area
    for (const s of Object.keys(SHAPES))
      for (const r of [0, 1, 2, 3])
        for (const f of [0, 1]) expect(pieceCells(s, [0, 0, r, f]).length).toBe(area(s) * 4);
  });

  it('lays out every figure on its board, pieces in the tray', () => {
    for (const name of Object.keys(tangramFigure.figures))
      for (const turn of [true, false])
        for (let k = 0; k < 20; k++)
          expect(tgProblem(tangramFigure.generate({ figures: [name], turn }).tg), name).toBeNull();
  });

  it('builds the 7-piece figures with the whole tangram (area 16)', () => {
    for (const name of ['carre', 'triangle', 'bateau', 'parallelogramme', 'bonhomme']) {
      const { pieces } = tangramFigure.generate({ figures: [name] }).tg;
      expect(pieces.map((p) => p.shape).sort(), name).toEqual(['ca', 'gt', 'gt', 'mt', 'pa', 'pt', 'pt']);
    }
  });

  it('accepts another covering and refuses a piece left out, overlapping or sticking out', () => {
    const { tg } = tangramFigure.generate({ figures: ['carre'] });
    const sol = tg.pieces.map((p) => p.sol);
    expect(tgCoverProblem(tg, sol)).toBeNull();
    // the two big triangles swapped: still the square
    const [a, b] = tg.pieces.map((p, k) => (p.shape === 'gt' ? k : -1)).filter((k) => k >= 0);
    const swapped = [...sol];
    [swapped[a], swapped[b]] = [sol[b], sol[a]];
    expect(tgCoverProblem(tg, swapped)).toBeNull();
    expect(
      tgCoverProblem(
        tg,
        sol.map((s, k) => (k === 0 ? tg.pieces[0].start : s))
      )
    ).toMatch(/sticks out/);
    expect(
      tgCoverProblem(
        tg,
        sol.map((s, k) => (k === a ? sol[b] : s))
      )
    ).toMatch(/overlap/);
  });
});
