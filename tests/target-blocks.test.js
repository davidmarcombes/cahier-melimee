import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { blocsCibles } = require('../src/assets/js/generators/calcul.js');
const { blocksAt, tbPlacementProblem, tbProblem } = require('../scripts/lib/target-blocks.js');

// The picture the type comes from: 9 and 16, tiles 4, 5, 12 — the 4 goes in the overlap
const pair = {
  w: 12,
  h: 11.5,
  blocks: [
    { x: 0.5, y: 4.5, s: 6.5, target: 9 },
    { x: 5, y: 0.5, s: 6.5, target: 16 },
  ],
  tiles: [4, 5, 12],
  op: '+',
};

describe('target-blocks', () => {
  it('counts a tile in the overlap for both blocks', () => {
    expect(blocksAt(pair.blocks, [6, 6])).toEqual([0, 1]);
    expect(
      tbPlacementProblem(pair, [
        [6, 6],
        [2, 9],
        [9, 3],
      ])
    ).toBeNull();
    expect(
      tbPlacementProblem(pair, [
        [2, 9],
        [6, 6],
        [9, 3],
      ])
    ).toMatch(/block 1 makes 17/);
    expect(tbPlacementProblem(pair, [[6, 6], [2, 9], null])).toMatch(/not in any block/);
  });

  it('knows only + and ×', () => {
    const one = {
      w: 10,
      h: 10,
      blocks: [{ x: 1, y: 1, s: 8, target: 4, op: '÷' }],
      tiles: [12, 3],
      solution: [
        [3, 3],
        [5, 5],
      ],
    };
    expect(tbProblem(one)).toMatch(/unknown operation ÷/);
  });

  it('builds puzzles its own solution solves, every layout and operation', () => {
    for (const params of [
      { layout: 'un', perRegion: [2, 3] },
      { layout: 'deux' },
      { layout: 'chaine', op: '+', values: [5, 60], minPerBlock: 2 },
      { layout: 'trio', ops: ['+', '×'], values: [2, 9], minPerBlock: 2 },
      { layout: 'deux', op: '×', values: [2, 15], minPerBlock: 2, perRegion: [1, 2], maxTarget: 500 },
      { layout: 'deux', ops: ['+', '×'], values: [2, 12], minPerBlock: 2, perRegion: [1, 1], decoys: 1 },
    ])
      for (let k = 0; k < 40; k++) {
        const { tb } = blocsCibles.generate(params);
        expect(tbProblem(tb)).toBeNull();
        expect(new Set(tb.blocks.map((b) => b.target)).size).toBe(tb.blocks.length);
      }
  });
});
