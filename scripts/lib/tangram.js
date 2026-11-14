/**
 * Tangram — pieces with corners on a lattice, sides along the lines or the diagonals; each unit square
 * is cut by its two diagonals into 4 quarter-triangles, and a piece covers whole quarters. A piece is
 * placed at a whole point, turned by quarter turns (r) and maybe flipped (f), so a figure is solved
 * when the quarters of the pieces are exactly those of the silhouette, none twice. Independent of the
 * generator (validator, answer oracle).
 */
const SHAPES = {
  gt: [
    [0, 0],
    [4, 0],
    [2, 2],
  ], // grand triangle
  mt: [
    [0, 0],
    [2, 0],
    [0, 2],
  ], // triangle moyen
  pt: [
    [0, 0],
    [2, 0],
    [1, 1],
  ], // petit triangle
  ca: [
    [1, 0],
    [2, 1],
    [1, 2],
    [0, 1],
  ], // carré (sur la pointe, comme dans le tangram)
  pa: [
    [0, 0],
    [2, 0],
    [3, 1],
    [1, 1],
  ], // parallélogramme
  cq: [
    [0, 0],
    [2, 0],
    [2, 2],
    [0, 2],
  ], // carré (GS)
  re: [
    [0, 0],
    [4, 0],
    [4, 2],
    [0, 2],
  ], // rectangle (GS)
};

// Corners of a shape flipped (f), turned r quarter turns clockwise, moved to its box at (0, 0)
function orient(pts, r = 0, f = 0) {
  let p = pts.map(([x, y]) => [f ? -x : x, y]);
  for (let k = 0; k < r % 4; k++) p = p.map(([x, y]) => [-y, x]);
  const [mx, my] = [Math.min(...p.map((q) => q[0])), Math.min(...p.map((q) => q[1]))];
  return p.map(([x, y]) => [x - mx, y - my]);
}

const inside = (pts, px, py) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [[xi, yi], [xj, yj]] = [pts[i], pts[j]];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
// Centres of the quarters of a unit square: top, right, bottom, left
const CENTRES = [
  [0.5, 1 / 6],
  [5 / 6, 0.5],
  [0.5, 5 / 6],
  [1 / 6, 0.5],
];

// Quarters ('x,y,q') covered by a piece placed at [x, y, r, f]
function pieceCells(shape, [x, y, r, f]) {
  const p = orient(SHAPES[shape], r, f);
  const [w, h] = [Math.max(...p.map((q) => q[0])), Math.max(...p.map((q) => q[1]))];
  const out = [];
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++)
      CENTRES.forEach(([cx, cy], q) => inside(p, i + cx, j + cy) && out.push(`${i + x},${j + y},${q}`));
  return out;
}

// Size of a piece's box once turned
function pieceBox(shape, r, f) {
  const p = orient(SHAPES[shape], r, f);
  return [Math.max(...p.map((q) => q[0])), Math.max(...p.map((q) => q[1]))];
}

// null when the pupil's placements cover the silhouette (the solution's quarters) exactly, else why not
function tgCoverProblem(tg, placed) {
  const target = new Set(tg.pieces.flatMap((p) => pieceCells(p.shape, p.sol)));
  const seen = new Set();
  for (let k = 0; k < tg.pieces.length; k++)
    for (const c of pieceCells(tg.pieces[k].shape, placed[k])) {
      if (seen.has(c)) return 'two pieces overlap';
      if (!target.has(c)) return 'a piece sticks out of the silhouette';
      seen.add(c);
    }
  return seen.size === target.size ? null : 'the silhouette is not covered';
}

// null when the figure is good: known shapes, the solution fits the board without overlap, the pieces
// start in the tray without overlap, in the solution's orientation when they cannot be turned
function tgProblem(tg) {
  if (!tg || !Array.isArray(tg.pieces) || !tg.pieces.length) return 'no pieces';
  const { w, h, boardH } = tg;
  const fits = (p, at, y0, y1) => {
    const [bw, bh] = pieceBox(p.shape, at[2], at[3]);
    return at[0] >= 0 && at[0] + bw <= w && at[1] >= y0 && at[1] + bh <= y1;
  };
  for (const [k, p] of tg.pieces.entries()) {
    if (!SHAPES[p.shape]) return `piece ${k}: unknown shape ${p.shape}`;
    if (JSON.stringify(p.pts) !== JSON.stringify(SHAPES[p.shape])) return `piece ${k}: corners are not a ${p.shape}`;
    if (!fits(p, p.sol, 0, boardH)) return `piece ${k}: its place is off the board`;
    if (!fits(p, p.start, boardH, h)) return `piece ${k}: it does not start in the tray`;
    if (
      tg.turn === false &&
      pieceCells(p.shape, [0, 0, ...p.sol.slice(2)]).join() !== pieceCells(p.shape, [0, 0, ...p.start.slice(2)]).join()
    )
      return `piece ${k}: cannot be turned but starts turned`;
  }
  const overlap = (key) => {
    const seen = new Set();
    for (const p of tg.pieces)
      for (const c of pieceCells(p.shape, p[key]))
        if (seen.has(c)) return true;
        else seen.add(c);
    return false;
  };
  if (overlap('sol')) return 'the solution has two pieces overlapping';
  if (overlap('start')) return 'two pieces overlap in the tray';
  return tgCoverProblem(
    tg,
    tg.pieces.map((p) => p.sol)
  );
}

module.exports = { SHAPES, pieceCells, tgCoverProblem, tgProblem };
