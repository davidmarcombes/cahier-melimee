/**
 * grid-board (robot on a square grid, a figure to complete by symmetry, or a figure to draw with segments) — an independent
 * re-implementation of the moves and of the drawing check, used by validate-exercises.js (static boards and generator draws), the
 * oracle (gen-checks.js) and the e2e solver (drawSolution).
 * Written apart from the player's gbRun() / gbDrawOk() and the generators, so a bug in either shows up here.
 */
const DIRS = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] };
const ABS = { U: 'N', R: 'E', D: 'S', L: 'W' };
const ORDER = 'NESW';
const TOKEN = /^(TL|TR|[UDLRF])(\d*)$/;

// → { cells: [[r, c], …] walked (start included), crash: reason | null, end, heading }
function walk(b, program) {
  let [r, c] = b.start;
  let heading = b.dir || 'N';
  const cells = [[r, c]];
  const isBlock = (r, c) => (b.blocks || []).some((k) => k[0] === r && k[1] === c);
  for (const t of program) {
    const m = TOKEN.exec(String(t));
    if (!m) return { cells, crash: `unknown instruction « ${t} »` };
    if (m[1] === 'TL' || m[1] === 'TR') {
      if (!b.dir) return { cells, crash: `« ${t} » needs board.dir` };
      if (m[2]) return { cells, crash: `« ${t} » takes no count` };
      heading = ORDER[(ORDER.indexOf(heading) + (m[1] === 'TL' ? 3 : 1)) % 4];
      continue;
    }
    if (m[1] === 'F' && !b.dir) return { cells, crash: '« F » needs board.dir' };
    const [dr, dc] = DIRS[m[1] === 'F' ? heading : ABS[m[1]]];
    const n = m[2] === '' ? 1 : Number(m[2]);
    if (n < 1) return { cells, crash: `« ${t} »: count must be ≥ 1` };
    for (let k = 0; k < n; k++) {
      r += dr;
      c += dc;
      cells.push([r, c]);
      if (r < 0 || c < 0 || r >= b.rows || c >= b.cols) return { cells, crash: `leaves the grid at « ${t} »` };
      if (isBlock(r, c)) return { cells, crash: `hits a block at (${r}, ${c})` };
    }
  }
  return { cells, crash: null, end: [r, c], heading };
}

const same = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];

// Fewest single instructions from start to goal (write mode buttons: U D L R, or F TL TR when dir)
function shortest(b) {
  const moves = b.dir ? ['F', 'TL', 'TR'] : ['U', 'D', 'L', 'R'];
  const key = (s) => `${s.end[0]},${s.end[1]},${b.dir ? s.heading : ''}`;
  let frontier = [[]];
  const seen = new Set([key(walk(b, []))]);
  for (let depth = 0; depth <= b.rows * b.cols * 4; depth++) {
    const next = [];
    for (const prog of frontier) {
      const run = walk(b, prog);
      if (same(run.end, b.goal)) return prog.length;
      for (const mv of moves) {
        const p = [...prog, mv];
        const s = walk(b, p);
        if (s.crash || seen.has(key(s))) continue;
        seen.add(key(s));
        next.push(p);
      }
    }
    if (!next.length) return Infinity;
    frontier = next;
  }
  return Infinity;
}

// Indexes of the instructions whose replacement by another one makes the program reach the goal
function fixable(b) {
  const max = Math.max(b.rows, b.cols);
  // The board's own instruction set: avance / tourne when the robot has a heading, arrows otherwise
  const options = (b.dir ? ['F', 'TL', 'TR'] : ['U', 'D', 'L', 'R']).flatMap((t) =>
    t[0] === 'T' ? [t] : Array.from({ length: max }, (_, k) => (k ? t + (k + 1) : t))
  );
  return b.program
    .map((t, i) =>
      options.some((o) => {
        if (o === t || o + '1' === t || t + '1' === o) return false;
        const run = walk(
          b,
          b.program.map((x, k) => (k === i ? o : x))
        );
        return !run.crash && same(run.end, b.goal);
      })
        ? i
        : -1
    )
    .filter((i) => i >= 0);
}

// Mirror image of a cell. v / h: the axis is the grid line before column / row `at`; d: the diagonal
// from the top left corner (r = c), a: from the top right corner. Diagonal axes cross their cells
function mirrorOf(b, [r, c]) {
  if (b.axis === 'v') return [r, 2 * b.at - 1 - c];
  if (b.axis === 'h') return [2 * b.at - 1 - r, c];
  if (b.axis === 'd') return [c, r];
  return [b.cols - 1 - c, b.rows - 1 - r];
}

// Side of the axis a cell is on: -1, 1, or 0 on a diagonal axis
function sideOf(b, [r, c]) {
  const d =
    b.axis === 'v' ? c - b.at + 0.5 : b.axis === 'h' ? r - b.at + 0.5 : b.axis === 'd' ? r - c : r + c - (b.cols - 1);
  return Math.sign(d);
}

// Cells the pupil must colour: the mirror of the figure, minus the figure's own cells on the axis
function mirrorTarget(b) {
  const k = ([r, c]) => `${r},${c}`;
  const given = new Set(b.shape.map(k));
  const out = new Map();
  for (const p of b.shape) {
    const m = mirrorOf(b, p);
    if (!given.has(k(m))) out.set(k(m), m);
  }
  return [...out.values()];
}

function mirrorProblems(b, inside) {
  const out = [];
  const { axis, at, rows, cols, shape } = b;
  if (!['v', 'h', 'd', 'a'].includes(axis)) return [`unknown axis « ${axis} »`];
  if (axis === 'v' && !(Number.isInteger(at) && at >= 1 && at < cols)) return [`axis at ${at} not between columns`];
  if (axis === 'h' && !(Number.isInteger(at) && at >= 1 && at < rows)) return [`axis at ${at} not between rows`];
  if ((axis === 'd' || axis === 'a') && rows !== cols) return ['a diagonal axis needs a square grid'];
  if (!Array.isArray(shape) || !shape.length) return ['shape is empty'];
  for (const p of shape) if (!inside(p)) return [`shape cell ${JSON.stringify(p)} outside the grid`];
  if (new Set(shape.map(String)).size !== shape.length) out.push('shape has a cell twice');
  const sides = new Set(shape.map((p) => sideOf(b, p)).filter((s) => s !== 0));
  if (sides.size !== 1) out.push('shape is not on one side of the axis');
  for (const p of shape) if (!inside(mirrorOf(b, p))) out.push(`mirror of ${JSON.stringify(p)} leaves the grid`);
  // Connected (4 neighbours): one figure, not scattered cells
  const left = new Set(shape.map(String));
  const stack = [shape[0]];
  left.delete(String(shape[0]));
  while (stack.length) {
    const [r, c] = stack.pop();
    for (const n of [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ])
      if (left.delete(String(n))) stack.push(n);
  }
  if (left.size) out.push('shape is not connected');
  if (out.length === 0 && mirrorTarget(b).length < 2) out.push('fewer than 2 cells to colour');
  return out;
}

// ── draw: segments between grid points [r, c] (0…rows, 0…cols) ───────────────────────────────────────
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const pt = (k) => k.split(',').map(Number);
const key = ([r, c]) => `${r},${c}`;
const pair = (a, b) => [key(a), key(b)].sort().join('|');

// A figure as unit steps "r,c|r,c": each segment cut at the grid points it crosses, so the same figure
// gives the same set whichever way it was drawn
function steps(segs) {
  const out = new Set();
  for (const [[r1, c1], [r2, c2]] of segs) {
    const g = gcd(r2 - r1, c2 - c1);
    for (let k = 0; k < g; k++)
      out.add(
        pair(
          [r1 + (k * (r2 - r1)) / g, c1 + (k * (c2 - c1)) / g],
          [r1 + ((k + 1) * (r2 - r1)) / g, c1 + ((k + 1) * (c2 - c1)) / g]
        )
      );
  }
  return out;
}
const sameSet = (a, b) => a.size === b.size && [...a].every((k) => b.has(k));
const ends = (set) => [...set].flatMap((k) => k.split('|').map(pt));
const asSegs = (set) => [...set].map((k) => k.split('|').map(pt));

// Moved so that it touches row 0 and column 0 (compare up to a translation)
function moved(set) {
  const p = ends(set);
  const r0 = Math.min(...p.map((q) => q[0]));
  const c0 = Math.min(...p.map((q) => q[1]));
  return steps(asSegs(set).map((s) => s.map(([r, c]) => [r - r0, c - c0])));
}

// Corners of the one closed figure the steps draw (every point joined to exactly two others, one loop),
// straight-through points dropped; null otherwise
function corners(set) {
  const adj = new Map();
  for (const k of set) {
    const [a, b] = k.split('|');
    adj.set(a, [...(adj.get(a) || []), b]);
    adj.set(b, [...(adj.get(b) || []), a]);
  }
  if (adj.size < 3 || [...adj.values()].some((n) => n.length !== 2)) return null;
  const ring = [];
  let [prev, cur] = [null, adj.keys().next().value];
  do {
    ring.push(pt(cur));
    const [x, y] = adj.get(cur);
    [prev, cur] = [cur, x === prev ? y : x];
  } while (cur !== key(ring[0]) && ring.length <= adj.size);
  if (ring.length !== adj.size) return null;
  return ring.filter((p, i) => {
    const a = ring[(i + ring.length - 1) % ring.length];
    const b = ring[(i + 1) % ring.length];
    return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) !== 0;
  });
}

const SHAPES = ['carre', 'rectangle', 'triangleRectangle', 'triangle'];
// Why corners [[r, c], …] are not the wanted figure (null: they are). want: { shape, sides, area, tilted, inclusive }
// sides: carre [a], rectangle [a, b], triangleRectangle [a, b] (the sides of the right angle), in grid units
function shapeIssue(cs, want) {
  const n = cs.length;
  const vec = (i) => [cs[(i + 1) % n][0] - cs[i][0], cs[(i + 1) % n][1] - cs[i][1]];
  const len2 = cs.map((_, i) => vec(i)[0] ** 2 + vec(i)[1] ** 2);
  const right = cs.map((_, i) => {
    const [u, v] = [vec((i + n - 1) % n), vec(i)];
    return u[0] * v[0] + u[1] * v[1] === 0;
  });
  const area = Math.abs(cs.reduce((t, p, i) => t + p[0] * cs[(i + 1) % n][1] - p[1] * cs[(i + 1) % n][0], 0)) / 2;
  const sq = (list) => list.map((x) => x * x).sort((a, b) => a - b);
  const { shape, sides, inclusive, tilted } = want;
  const four = n === 4 && right.every(Boolean);
  const equal = len2.every((l) => l === len2[0]);
  if (shape === 'carre' && !(four && equal)) return 'not a square';
  if (shape === 'rectangle' && !(four && (inclusive || !equal))) return 'not a rectangle';
  if ((shape === 'triangle' || shape === 'triangleRectangle') && n !== 3) return 'not a triangle';
  const at = right.indexOf(true);
  if (shape === 'triangleRectangle' && at < 0) return 'no right angle';
  if (sides) {
    const got =
      shape === 'carre'
        ? [len2[0]]
        : shape === 'rectangle'
          ? [len2[0], len2[1]].sort((a, b) => a - b)
          : [len2[(at + n - 1) % n], len2[at]].sort((a, b) => a - b);
    if (String(got) !== String(sq(sides))) return `sides ${got.map(Math.sqrt)}, wanted ${sides}`;
  }
  if (want.area && area !== want.area) return `area ${area}, wanted ${want.area}`;
  if (tilted && cs.some((_, i) => vec(i).includes(0))) return 'a side lies on the grid lines';
  return null;
}

// Primitive direction of a segment, and a point on it
const dirOf = ([[r1, c1], [r2, c2]]) => {
  const g = gcd(r2 - r1, c2 - c1);
  return [(r2 - r1) / g, (c2 - c1) / g];
};
const cross = (u, v) => u[0] * v[1] - u[1] * v[0];

// Mirror of a grid point across a draw axis: v / h the grid line `at`, d / a the diagonals of a square grid
function mirrorPoint(b, [r, c]) {
  const { axis, at } = b.axis;
  if (axis === 'v') return [r, 2 * at - c];
  if (axis === 'h') return [2 * at - r, c];
  return axis === 'd' ? [c, r] : [b.cols - c, b.rows - r];
}

// Why the pupil's segments do not answer the board (null: they do)
function drawCheck(b, segs) {
  const got = steps(segs);
  if (!got.size) return 'nothing drawn';
  if (b.task === 'copy') {
    if (!b.anchor) return sameSet(moved(got), moved(steps(b.model))) ? null : 'not the model';
    const [dr, dc] = [b.anchor.to[0] - b.anchor.from[0], b.anchor.to[1] - b.anchor.from[1]];
    const want = steps(b.model.map((s) => s.map(([r, c]) => [r + dr, c + dc])));
    return sameSet(got, want) ? null : 'not the model, from the anchor';
  }
  if (b.task === 'complete') return sameSet(steps([...b.given, ...segs]), steps(b.target)) ? null : 'not the figure';
  if (b.task === 'shape') {
    const cs = corners(got);
    return cs ? shapeIssue(cs, b.want) : 'not one closed figure';
  }
  // parallel / perp: one straight line, in one piece, through the point, two steps at least
  const all = asSegs(got);
  const d = dirOf(all[0]);
  const p0 = all[0][0];
  const pts = [...new Set(ends(got).map(key))].map(pt);
  if (pts.some((p) => cross([p[0] - p0[0], p[1] - p0[1]], d) !== 0)) return 'not one straight line';
  if (pts.length !== got.size + 1) return 'the line has gaps';
  if (got.size < 2) return 'too short';
  const t = (p) => (p[0] - p0[0]) * d[0] + (p[1] - p0[1]) * d[1];
  const th = b.through;
  const ts = pts.map(t);
  if (cross([th[0] - p0[0], th[1] - p0[1]], d) !== 0 || t(th) < Math.min(...ts) || t(th) > Math.max(...ts))
    return 'does not go through the point';
  const ref = dirOf(b.ref);
  if (b.task === 'parallel' && cross(d, ref) !== 0) return 'not parallel';
  if (b.task === 'perp' && d[0] * ref[0] + d[1] * ref[1] !== 0) return 'not perpendicular';
  return null;
}

// Corners of a figure that fits the grid (shape task), or null
function findShape(b) {
  const { shape } = b.want;
  for (let a = -b.rows; a <= b.rows; a++)
    for (let e = -b.cols; e <= b.cols; e++) {
      if (!a && !e) continue;
      const g = gcd(a, e);
      for (let t = 1; t <= Math.max(b.rows, b.cols); t++) {
        if (shape === 'carre' && t > 1) break;
        const v = shape === 'carre' ? [-e, a] : [(-e / g) * t, (a / g) * t];
        const cs =
          shape === 'carre' || shape === 'rectangle' ? [[0, 0], [a, e], [a + v[0], e + v[1]], v] : [[0, 0], [a, e], v];
        if (shapeIssue(cs, b.want)) continue;
        const r0 = -Math.min(...cs.map((p) => p[0]));
        const c0 = -Math.min(...cs.map((p) => p[1]));
        if (Math.max(...cs.map((p) => p[0])) + r0 > b.rows || Math.max(...cs.map((p) => p[1])) + c0 > b.cols) continue;
        return cs.map(([r, c]) => [r + r0, c + c0]);
      }
    }
  return null;
}

// One right answer: the segments a pupil could draw
function drawSolution(b) {
  if (b.task === 'copy') {
    const [dr, dc] = b.anchor ? [b.anchor.to[0] - b.anchor.from[0], b.anchor.to[1] - b.anchor.from[1]] : [0, 0];
    return b.model.map((s) => s.map(([r, c]) => [r + dr, c + dc]));
  }
  if (b.task === 'complete') {
    const given = steps(b.given);
    return asSegs(new Set([...steps(b.target)].filter((k) => !given.has(k))));
  }
  if (b.task === 'shape') {
    const cs = findShape(b);
    return cs ? cs.map((p, i) => [p, cs[(i + 1) % cs.length]]) : [];
  }
  const ref = dirOf(b.ref);
  const d = b.task === 'perp' ? [-ref[1], ref[0]] : ref;
  const inside = ([r, c]) => r >= 0 && c >= 0 && r <= b.rows && c <= b.cols;
  let [p, q] = [b.through, b.through];
  while (inside([p[0] - d[0], p[1] - d[1]])) p = [p[0] - d[0], p[1] - d[1]];
  while (inside([q[0] + d[0], q[1] + d[1]])) q = [q[0] + d[0], q[1] + d[1]];
  return [[p, q]];
}

function drawProblems(b) {
  const out = [];
  const { rows, cols, task } = b;
  const inside = (p) =>
    Array.isArray(p) &&
    Number.isInteger(p[0]) &&
    Number.isInteger(p[1]) &&
    p[0] >= 0 &&
    p[1] >= 0 &&
    p[0] <= rows &&
    p[1] <= cols;
  const segsIn = (list) =>
    Array.isArray(list) &&
    list.length > 0 &&
    list.every((s) => Array.isArray(s) && s.length === 2 && s.every(inside) && key(s[0]) !== key(s[1]));
  if (b.paper && !['grid', 'dots'].includes(b.paper)) out.push(`paper « ${b.paper} » is not grid or dots`);
  if (task === 'copy') {
    if (!segsIn(b.model)) return [...out, 'model is empty or leaves the grid'];
    if (b.anchor) {
      if (!inside(b.anchor.to)) return [...out, 'anchor.to outside the grid'];
      if (!ends(steps(b.model)).some((p) => key(p) === key(b.anchor.from)))
        out.push('anchor.from is not a point of the model');
      if (!drawSolution(b).every((s) => s.every(inside))) out.push('the model leaves the grid from the anchor');
    }
  } else if (task === 'complete') {
    if (!segsIn(b.given) || !segsIn(b.target)) return [...out, 'given / target empty or outside the grid'];
    const target = steps(b.target);
    if ([...steps(b.given)].some((k) => !target.has(k))) out.push('a given segment is not in the target');
    if (!drawSolution(b).length) out.push('nothing left to draw');
    if (b.axis) {
      const { axis, at } = b.axis;
      if (!['v', 'h', 'd', 'a'].includes(axis)) return [...out, `unknown axis « ${axis} »`];
      if ('da'.includes(axis) && rows !== cols) return [...out, 'a diagonal axis needs a square grid'];
      if (axis === 'v' && !(at > 0 && at < cols)) return [...out, 'axis outside the grid'];
      if (axis === 'h' && !(at > 0 && at < rows)) return [...out, 'axis outside the grid'];
      const image = steps(b.target.map((s) => s.map((p) => mirrorPoint(b, p))));
      if (!sameSet(image, target)) out.push('the target is not symmetric about the axis');
    }
  } else if (task === 'shape') {
    if (!b.want || !SHAPES.includes(b.want.shape)) return [...out, `unknown shape « ${b.want && b.want.shape} »`];
    if (!findShape(b)) out.push('no such figure fits the grid');
  } else if (task === 'parallel' || task === 'perp') {
    if (!segsIn([b.ref])) return [...out, 'ref is missing or outside the grid'];
    if (!inside(b.through)) return [...out, 'through outside the grid'];
    const d = dirOf(b.ref);
    const on = cross([b.through[0] - b.ref[0][0], b.through[1] - b.ref[0][1]], d) === 0;
    if (task === 'parallel' && on) out.push('the point is on the line');
    if (steps(drawSolution(b)).size < 2) out.push('no room for the line through the point');
  } else return [`unknown task « ${task} »`];
  if (!out.length && drawCheck(b, drawSolution(b)))
    out.push(`the solution is refused: ${drawCheck(b, drawSolution(b))}`);
  return out;
}

// Every problem of a board, as text (empty = fine)
function boardProblems(b) {
  const out = [];
  if (!b || typeof b !== 'object') return ['missing board'];
  const { mode, rows, cols } = b;
  if (!['follow', 'write', 'debug', 'mirror', 'draw'].includes(mode)) return [`unknown mode « ${mode} »`];
  if (!(rows >= 2 && rows <= 10 && cols >= 2 && cols <= 10)) return [`grid ${rows}×${cols} outside 2…10`];
  if (mode === 'draw') return drawProblems(b);
  const inside = (p) =>
    Array.isArray(p) &&
    Number.isInteger(p[0]) &&
    Number.isInteger(p[1]) &&
    p[0] >= 0 &&
    p[1] >= 0 &&
    p[0] < rows &&
    p[1] < cols;
  if (mode === 'mirror') return mirrorProblems(b, inside);
  if (!inside(b.start)) return ['start outside the grid'];
  if (b.dir && !ORDER.includes(b.dir)) out.push(`dir « ${b.dir} » is not N, E, S or W`);
  for (const k of b.blocks || []) if (!inside(k)) out.push(`block ${JSON.stringify(k)} outside the grid`);
  if ((b.blocks || []).some((k) => same(k, b.start))) out.push('a block covers the start');
  for (const m of b.marks || []) if (!inside(m.at) || !m.e) out.push(`mark ${JSON.stringify(m)} needs at + e`);
  if (mode !== 'follow') {
    if (!inside(b.goal)) out.push('goal outside the grid');
    else if ((b.blocks || []).some((k) => same(k, b.goal))) out.push('a block covers the goal');
    else if (same(b.goal, b.start)) out.push('goal is the start');
  }
  if (mode !== 'write') {
    if (!Array.isArray(b.program) || !b.program.length) return [...out, 'program is empty'];
    const run = walk(b, b.program);
    if (mode === 'follow') {
      if (run.crash) out.push(`program ${run.crash}`);
      else if (same(run.end, b.start)) out.push('program ends on the start');
    }
    if (mode === 'debug') {
      if (!Number.isInteger(b.bug) || b.bug < 0 || b.bug >= b.program.length)
        out.push('bug is not an instruction index');
      else if (!run.crash && same(run.end, b.goal)) out.push('the program already reaches the goal: no bug');
      else {
        const fix = fixable(b);
        if (fix.length !== 1 || fix[0] !== b.bug)
          out.push(`instruction(s) [${fix.join(', ')}] can be fixed to reach the goal, declared bug ${b.bug}`);
      }
    }
  }
  if (mode === 'write' && out.length === 0) {
    const n = shortest(b);
    if (n === Infinity) out.push('goal cannot be reached');
    else if (b.maxSteps && n > b.maxSteps) out.push(`needs ${n} instructions, maxSteps is ${b.maxSteps}`);
  }
  return out;
}

module.exports = {
  walk,
  shortest,
  mirrorTarget,
  boardProblems,
  drawCheck,
  drawSolution,
  drawSteps: steps,
  corners,
  shapeIssue,
};
