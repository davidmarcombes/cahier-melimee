import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const geo = require('../src/assets/js/generators/geometrie.js');
const { CUBE_CHECKS, foldsToCube, rollNet, readStack } = require('../scripts/lib/cubes.js');

const key = (cells) => {
  // a shape up to turning and flipping
  const forms = [];
  for (const flip of [false, true])
    for (let k = 0; k < 4; k++) {
      let c = cells.map(([x, y]) => (flip ? [-x, y] : [x, y]));
      for (let i = 0; i < k; i++) c = c.map(([x, y]) => [-y, x]);
      const mx = Math.min(...c.map((p) => p[0]));
      const my = Math.min(...c.map((p) => p[1]));
      forms.push(JSON.stringify(c.map(([x, y]) => [x - mx, y - my]).sort((p, q) => p[1] - q[1] || p[0] - q[0])));
    }
  return forms.sort()[0];
};

describe('cubes', () => {
  it('folds the classic nets and refuses the near misses', () => {
    expect(
      foldsToCube([
        [1, 0],
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1],
        [1, 2],
      ])
    ).toBe(true); // the cross
    expect(
      foldsToCube([
        [0, 0],
        [1, 0],
        [2, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ])
    ).toBe(false); // 2 × 3
    expect(
      foldsToCube([
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1],
        [0, 0],
        [3, 0],
      ])
    ).toBe(false); // both flaps on top
    // on a row of four, the first and the third square are opposite faces
    const f = rollNet([
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [0, 0],
      [0, 2],
    ]);
    expect(new Set([f[0], f[2]]).size).toBe(2);
    expect([f[0], f[2]].sort().join()).toMatch(/^(0,1|2,3|4,5)$/);
  });

  it('finds the 11 nets of the cube among the tiles of patronsCube', () => {
    const seen = new Set();
    for (let k = 0; k < 400; k++) {
      const e = geo.patronsCube.generate({ count: 6, answers: [3, 3] });
      expect(CUBE_CHECKS.patronsCube(e)).toBeNull();
      for (const i of e.tileAnswers) {
        const cells = [...e.tiles[i].matchAll(/<rect x="(\d+)" y="(\d+)"/g)].map((m) => [
          (m[1] - 1) / 16,
          (m[2] - 1) / 16,
        ]);
        seen.add(key(cells));
      }
    }
    expect(seen.size).toBe(11);
  });

  it('catches a wrong answer', () => {
    const c = geo.compterCubes.generate({ cols: [3, 3], depth: 2, maxH: 3, total: [6, 9] });
    expect(CUBE_CHECKS.compterCubes(c)).toBeNull();
    expect(CUBE_CHECKS.compterCubes({ ...c, answers: [String(Number(c.answers[0]) + 1)] })).toMatch(/declared/);
    const v = geo.vueCubes.generate({ views: ['face', 'dessus', 'droite'] });
    expect(CUBE_CHECKS.vueCubes(v)).toBeNull();
    expect(CUBE_CHECKS.vueCubes({ ...v, tileAnswers: [(v.tileAnswers[0] + 1) % v.tiles.length] })).toMatch(/declared/);
    const o = geo.faceOpposee.generate();
    expect(CUBE_CHECKS.faceOpposee(o)).toBeNull();
    expect(CUBE_CHECKS.faceOpposee({ ...o, mcqAnswer: (o.mcqAnswer + 1) % 5 })).toMatch(/opposite/);
  });

  it('never hides a whole column, and draws every cube', () => {
    for (let k = 0; k < 200; k++) {
      const e = geo.compterCubes.generate({ cols: [2, 4], depth: [2, 3], maxH: 3, total: [6, 16] });
      const H = readStack(e.body);
      expect(Array.isArray(H)).toBe(true);
      expect(CUBE_CHECKS.compterCubes(e)).toBeNull();
    }
  });
});
