/**
 * Generators — Espace et géométrie — figures dans toute orientation (trouverFormes), angles sans rapporteur
 * (trouverAngles, comparerAngles, rangerAngles). Every drawing is checked again from its markup by
 * scripts/lib/shapes.js. Tracer sur quadrillage (tracerGrille, grid-board draw), checked by scripts/lib/grid-board.js.
 * Tangram (tangramFigure), checked by scripts/lib/tangram.js.
 * Browser: registers into window.AppGenerators (needs generators/_core.js first) · Node: module.exports
 */
(function (root) {
  const { rand, randItem, shuffle } =
    typeof module !== 'undefined' && module.exports ? require('./_core.js') : root.GenCore;

  // Angles (trouverAngles, comparerAngles, rangerAngles) — no protractor at the cours moyen: angles are
  // drawn and compared by eye, never read in degrees. Checked from the drawing by scripts/lib/shapes.js.
  const pickF = (a, b) => a + Math.random() * (b - a);
  const ANGLE_RANGES = { aigu: [25, 70], droit: [90, 90], obtus: [110, 160] };
  const NEAR_ANGLE_RANGES = { aigu: [64, 76], droit: [90, 90], obtus: [104, 116] };
  // Two arms of arms[i] px (26–60) from a vertex, the first at `turn` degrees, the second `deg` further
  // anticlockwise, with an arc in the angle. Fixed scale, centred, so arm lengths compare from one drawing
  // to the next; only a drawing wider than the box is shrunk to fit. `size`: rendered px.
  function angleSvg(deg, turn, arms, size = 96) {
    const rad = Math.PI / 180;
    const dir = (t, l) => [l * Math.cos(t * rad), l * Math.sin(t * rad)];
    const ends = [dir(turn, arms[0]), dir(turn + deg, arms[1])];
    const xs = [0, ends[0][0], ends[1][0]];
    const ys = [0, ends[0][1], ends[1][1]];
    const [cx, cy] = [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2];
    const k = Math.min(1, 88 / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)));
    const f = (v) => Math.round(v * 10) / 10;
    const at = ([x, y]) => [f(50 + (x - cx) * k), f(50 - (y - cy) * k)];
    const [v, a, b] = [[0, 0], ...ends].map(at);
    const r = Math.min(16, 0.4 * Math.min(...arms));
    const [p, q] = [dir(turn, r), dir(turn + deg, r)].map(at);
    return (
      `<svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<path d="M${v} L${p} A${f(r * k)} ${f(r * k)} 0 0 0 ${q} Z" fill="#fb923c" fill-opacity="0.6"/>` +
      `<polyline points="${a} ${v} ${b}" fill="none" stroke="var(--ct)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` +
      `</svg>`
    );
  }
  // A turn that keeps both arms of a `deg` angle at least 15° away from horizontal and vertical
  const offAxisTurn = (deg) => {
    const ok = (t) => Math.min(((t % 90) + 90) % 90, 90 - (((t % 90) + 90) % 90)) >= 15;
    for (;;) {
      const t = pickF(0, 360);
      if (ok(t) && ok(t + deg)) return t;
    }
  };

  // Tracer sur quadrillage helpers. Convex hull of lattice points (corners only, in order)
  function convexHull(pts) {
    const P = [...new Map(pts.map((p) => [p + '', p])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (P.length < 3) return P;
    const turn = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const half = (list) => {
      const h = [];
      for (const p of list) {
        while (h.length >= 2 && turn(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
        h.push(p);
      }
      return h.slice(0, -1);
    };
    return [...half(P), ...half([...P].reverse())];
  }
  // Twice the area of a polygon
  const area2 = (P) =>
    Math.abs(P.reduce((t, p, i) => t + p[0] * P[(i + 1) % P.length][1] - p[1] * P[(i + 1) % P.length][0], 0));
  // Unit sides of a cell outline joined into the outline's straight sides
  function mergeSegments(segs) {
    const key = (p) => p + '';
    const nb = {};
    for (const [a, b] of segs) {
      (nb[key(a)] = nb[key(a)] || []).push(b);
      (nb[key(b)] = nb[key(b)] || []).push(a);
    }
    const start = segs[0][0];
    const loop = [start];
    for (let prev = null, at = start; ;) {
      const [x, y] = nb[key(at)];
      const next = prev && key(x) === key(prev) ? y : x;
      if (key(next) === key(start)) break;
      loop.push(next);
      [prev, at] = [at, next];
      if (loop.length > segs.length) break;
    }
    const corners = loop.filter((p, i) => {
      const a = loop[(i + loop.length - 1) % loop.length];
      const b = loop[(i + 1) % loop.length];
      return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]);
    });
    const out = corners.map((p, i) => [p, corners[(i + 1) % corners.length]]);
    out.units = loop.length; // unit sides walked from the start: fewer than all means a second loop
    out.total = segs.length;
    return out;
  }
  const loopLength = (merged) => (merged.units === merged.total ? merged.length : -1);

  // Tangram pieces: corners on the lattice, sides along its lines or diagonals (scripts/lib/tangram.js)
  const TG_SHAPES = {
    gt: [
      [0, 0],
      [4, 0],
      [2, 2],
    ],
    mt: [
      [0, 0],
      [2, 0],
      [0, 2],
    ],
    pt: [
      [0, 0],
      [2, 0],
      [1, 1],
    ],
    ca: [
      [1, 0],
      [2, 1],
      [1, 2],
      [0, 1],
    ],
    pa: [
      [0, 0],
      [2, 0],
      [3, 1],
      [1, 1],
    ],
    cq: [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ],
    re: [
      [0, 0],
      [4, 0],
      [4, 2],
      [0, 2],
    ],
  };
  const TG_COLOURS = ['#ef4444', '#3b82f6', '#f59e0b', '#22c55e', '#a855f7', '#14b8a6', '#ec4899'];
  // Corners flipped (f), turned r quarter turns clockwise, moved to their box at (0, 0)
  function tgOrient(pts, r, f) {
    let p = pts.map(([x, y]) => [f ? -x : x, y]);
    for (let k = 0; k < r % 4; k++) p = p.map(([x, y]) => [-y, x]);
    const [mx, my] = [Math.min(...p.map((q) => q[0])), Math.min(...p.map((q) => q[1]))];
    return p.map(([x, y]) => [x - mx, y - my]);
  }
  // Tangram figures: the solution, piece by piece [shape, x, y, quarter turns, flipped]. Found by a tiling
  // search on the lattice (tangram pieces only turn by quarter turns there); gs_*: big simple pieces
  const TANGRAM_FIGURES = {
    carre: {
      name: 'le carré',
      emoji: '🟧',
      pieces: [
        ['gt', 0, 0, 0, 0],
        ['gt', 0, 0, 3, 0],
        ['pa', 3, 0, 1, 0],
        ['pt', 2, 1, 1, 0],
        ['ca', 1, 2, 0, 0],
        ['mt', 2, 2, 2, 0],
        ['pt', 0, 3, 2, 0],
      ],
    },
    triangle: {
      name: 'le grand triangle',
      emoji: '🔺',
      pieces: [
        ['gt', 2, 0, 1, 0],
        ['pa', 4, 0, 1, 1],
        ['pt', 5, 1, 3, 0],
        ['gt', 0, 2, 2, 0],
        ['mt', 4, 2, 3, 0],
        ['ca', 5, 2, 0, 0],
        ['pt', 6, 3, 2, 0],
      ],
    },
    bateau: {
      name: 'le bateau',
      emoji: '⛵',
      pieces: [
        ['gt', 2, 0, 3, 0],
        ['mt', 2, 2, 2, 0],
        ['pa', 4, 2, 1, 1],
        ['pt', 5, 3, 3, 0],
        ['gt', 0, 4, 0, 0],
        ['ca', 3, 4, 0, 0],
        ['pt', 2, 5, 2, 0],
      ],
    },
    parallelogramme: {
      name: 'le parallélogramme',
      emoji: '🔷',
      pieces: [
        ['gt', 2, 0, 1, 0],
        ['mt', 4, 0, 0, 0],
        ['ca', 5, 0, 0, 0],
        ['pt', 6, 0, 0, 0],
        ['pa', 4, 1, 1, 0],
        ['pt', 5, 1, 3, 0],
        ['gt', 0, 2, 2, 0],
      ],
    },
    bonhomme: {
      name: 'le bonhomme',
      emoji: '🧍',
      pieces: [
        ['ca', 1, 0, 0, 0],
        ['pa', 0, 2, 0, 1],
        ['gt', 1, 2, 1, 0],
        ['pt', 3, 2, 3, 0],
        ['pt', 0, 3, 0, 0],
        ['gt', 1, 4, 3, 0],
        ['mt', 1, 6, 2, 0],
      ],
    },
    maison: {
      name: 'la maison',
      emoji: '🏠',
      pieces: [
        ['gt', 0, 1, 2, 0],
        ['gt', 0, 3, 0, 0],
        ['mt', 0, 3, 3, 0],
        ['pt', 3, 3, 1, 0],
        ['pt', 2, 4, 2, 0],
        ['pa', 3, 0, 1, 1],
      ],
    },
    poisson: {
      name: 'le poisson',
      emoji: '🐟',
      pieces: [
        ['gt', 0, 0, 1, 0],
        ['gt', 2, 0, 3, 0],
        ['mt', 4, 0, 2, 0],
        ['pt', 4, 2, 0, 0],
        ['pt', 5, 2, 1, 0],
      ],
    },
    fleche: {
      name: 'la flèche',
      emoji: '⬆️',
      pieces: [
        ['gt', 0, 0, 2, 0],
        ['mt', 1, 2, 0, 0],
        ['gt', 1, 2, 1, 0],
        ['pt', 1, 4, 3, 0],
        ['pt', 1, 5, 2, 0],
      ],
    },
    maisonnette: {
      name: 'la cabane',
      emoji: '🛖',
      pieces: [
        ['gt', 0, 0, 2, 0],
        ['mt', 1, 2, 0, 0],
        ['pt', 2, 2, 1, 0],
        ['pt', 1, 3, 2, 0],
      ],
    },
    bougie: {
      name: 'la bougie',
      emoji: '🕯️',
      pieces: [
        ['ca', 0, 0, 0, 0],
        ['mt', 0, 2, 0, 0],
        ['gt', 0, 2, 1, 0],
        ['pt', 0, 4, 3, 0],
        ['pt', 0, 5, 2, 0],
      ],
    },
    oiseau: {
      name: 'l’oiseau',
      emoji: '🐦',
      pieces: [
        ['gt', 0, 0, 1, 0],
        ['gt', 2, 2, 0, 0],
        ['mt', 2, 2, 3, 0],
      ],
    },
    gs_maison: {
      name: 'la maison',
      emoji: '🏠',
      pieces: [
        ['gt', 0, 0, 2, 0],
        ['re', 0, 2, 0, 0],
      ],
    },
    gs_maison3: {
      name: 'la maison',
      emoji: '🏠',
      pieces: [
        ['gt', 0, 0, 2, 0],
        ['cq', 0, 2, 0, 0],
        ['cq', 2, 2, 0, 0],
      ],
    },
    gs_bateau: {
      name: 'le bateau',
      emoji: '⛵',
      pieces: [
        ['mt', 2, 0, 3, 0],
        ['gt', 0, 2, 0, 0],
      ],
    },
    gs_sapin: {
      name: 'le sapin',
      emoji: '🎄',
      pieces: [
        ['gt', 0, 0, 2, 0],
        ['cq', 1, 2, 0, 0],
      ],
    },
    gs_poisson: {
      name: 'le poisson',
      emoji: '🐟',
      pieces: [
        ['gt', 0, 0, 1, 0],
        ['gt', 2, 0, 3, 0],
        ['gt', 4, 0, 1, 0],
      ],
    },
    gs_fusee: {
      name: 'la fusée',
      emoji: '🚀',
      pieces: [
        ['pt', 2, 0, 2, 0],
        ['re', 2, 1, 1, 0],
        ['mt', 0, 3, 2, 0],
        ['mt', 4, 3, 3, 0],
      ],
    },
  };

  // Cubes (compterCubes, vueCubes) — a stack is a height map H[y][x] (y = 0 the front row), drawn in
  // perspective cavalière: front faces are true squares, depth goes up and to the right. A stack is only
  // drawn when every column shows its top (no column is taller than the one behind it), so no cube can be
  // hidden without a visible one above it. Read back by scripts/lib/cubes.js (data-h, 3 faces of 2 polygons a cube).
  // each face: an opaque base in the theme colour, then a white (lighter) or black (darker) shade with the outline
  const CUBE_SHADE = 'stroke="var(--ct)" stroke-width="1.2" stroke-linejoin="round"';
  function cubeStackSvg(H, a = 30) {
    const depth = H.length;
    const cols = H[0].length;
    const top = Math.max(1, ...H.flat());
    const d = a * 0.45; // depth step, at 45° (a receding edge ≈ 0.64 of a side)
    const f = (v) => Math.round(v * 10) / 10;
    const W = cols * a + depth * d + 4;
    const Ht = top * a + depth * d + 4;
    const X = (x, y) => 2 + x * a + y * d;
    const Y = (y, z) => Ht - 2 - z * a - y * d;
    const poly = (pts, shade) => {
      const p = pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
      return `<polygon points="${p}" fill="var(--p)"/><polygon points="${p}" ${CUBE_SHADE} fill="${shade[0]}" fill-opacity="${shade[1]}"/>`;
    };
    let s = '';
    for (let y = depth - 1; y >= 0; y--)
      for (let z = 0; z < top; z++)
        for (let x = 0; x < cols; x++) {
          if (H[y][x] <= z) continue;
          s += poly(
            [
              [X(x + 1, y), Y(y, z)],
              [X(x + 1, y + 1), Y(y + 1, z)],
              [X(x + 1, y + 1), Y(y + 1, z + 1)],
              [X(x + 1, y), Y(y, z + 1)],
            ],
            ['#000', 0.25]
          );
          s += poly(
            [
              [X(x, y), Y(y, z + 1)],
              [X(x + 1, y), Y(y, z + 1)],
              [X(x + 1, y + 1), Y(y + 1, z + 1)],
              [X(x, y + 1), Y(y + 1, z + 1)],
            ],
            ['#fff', 0.65]
          );
          s += poly(
            [
              [X(x, y), Y(y, z)],
              [X(x + 1, y), Y(y, z)],
              [X(x + 1, y), Y(y, z + 1)],
              [X(x, y), Y(y, z + 1)],
            ],
            ['#fff', 0.35]
          );
        }
    const px = (v) => f(Math.min(v * 1.6, 300));
    return `<svg viewBox="0 0 ${f(W)} ${f(Ht)}" width="${px(W)}" height="${f((px(W) * Ht) / W)}" data-h="${H.map((r) => r.join('')).join('/')}" role="img" aria-label="Un assemblage de cubes" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
  }
  // A grid of squares ([[col, row], …], row 0 at the top) — views of a stack and cube nets; `labels`: a letter per square
  function squaresSvg(cells, s = 16, labels = null) {
    const W = Math.max(...cells.map((c) => c[0])) + 1;
    const Hh = Math.max(...cells.map((c) => c[1])) + 1;
    const body = cells
      .map(([c, r], i) => {
        const rect = `<rect x="${c * s + 1}" y="${r * s + 1}" width="${s}" height="${s}" fill="var(--p)" fill-opacity=".3" stroke="var(--ct)" stroke-width="1.2"/>`;
        const t = labels
          ? `<text x="${c * s + 1 + s / 2}" y="${r * s + 1 + s * 0.7}" text-anchor="middle" font-size="${s * 0.6}" font-weight="700" fill="var(--ct)">${labels[i]}</text>`
          : '';
        return rect + t;
      })
      .join('');
    const k = labels ? 2.6 : 2;
    return `<svg viewBox="0 0 ${W * s + 2} ${Hh * s + 2}" width="${(W * s + 2) * k}" height="${(Hh * s + 2) * k}" role="img" aria-label="Un dessin de carrés" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  }
  // Squares of a view: front (x across, height up), right side (depth across — the front on the left —,
  // height up), top (x across, the front row at the bottom)
  function cubeView(H, kind) {
    const depth = H.length;
    const cols = H[0].length;
    const top = Math.max(...H.flat());
    const out = [];
    if (kind === 'dessus') {
      for (let y = 0; y < depth; y++) for (let x = 0; x < cols; x++) if (H[y][x]) out.push([x, depth - 1 - y]);
      return out;
    }
    const across = kind === 'face' ? cols : depth;
    for (let i = 0; i < across; i++) {
      const h = kind === 'face' ? Math.max(...H.map((r) => r[i])) : Math.max(...H[i]);
      for (let z = 0; z < h; z++) out.push([i, top - 1 - z]);
    }
    return out;
  }
  const normCells = (cells) => {
    const mx = Math.min(...cells.map((c) => c[0]));
    const my = Math.min(...cells.map((c) => c[1]));
    return cells.map(([x, y]) => [x - mx, y - my]).sort((p, q) => p[1] - q[1] || p[0] - q[0]);
  };
  const cellsKey = (cells) => JSON.stringify(normCells(cells));
  // A random stack: every column shows its top, the footprint holds together
  function randomStack({ cols, depth, maxH, total }) {
    for (let t = 0; t < 500; t++) {
      const H = Array.from({ length: depth }, () => new Array(cols).fill(0));
      const n = rand(total[0], total[1]);
      // add cubes one at a time where the stack stays good: a new column next to one already there, no
      // column taller than the one behind it
      for (let k = 0; k < n; k++) {
        const ok = [];
        for (let y = 0; y < depth; y++)
          for (let x = 0; x < cols; x++) {
            const h = H[y][x] + 1;
            if (h > maxH) continue;
            if (y + 1 < depth && H[y + 1][x] && h > H[y + 1][x]) continue;
            if (y > 0 && H[y - 1][x] > h) continue;
            const near = [
              [x + 1, y],
              [x - 1, y],
              [x, y + 1],
              [x, y - 1],
            ].some(([nx, ny]) => H[ny] && H[ny][nx]);
            if (h === 1 && k > 0 && !near) continue;
            ok.push([x, y]);
          }
        if (!ok.length) break;
        const [x, y] = randItem(ok);
        H[y][x]++;
      }
      if (H.flat().reduce((s, v) => s + v, 0) !== n) continue;
      // no empty edge column / row (the drawing would show an empty margin)
      if (H.every((r) => !r[0]) || H.every((r) => !r[cols - 1]) || !H[0].some(Boolean) || !H[depth - 1].some(Boolean))
        continue;
      return H;
    }
    throw new Error('randomStack: no stack for these params');
  }
  // Cube nets: fold by rolling a cube over each edge — 6 squares, 6 different faces
  function foldNet(cells) {
    const key = (c) => c.join();
    const at = new Map(cells.map((c, i) => [key(c), i]));
    const face = new Array(cells.length);
    face[0] = { n: [0, 0, -1], u: [1, 0, 0], v: [0, 1, 0] };
    const neg = (p) => p.map((x) => -x);
    const todo = [0];
    while (todo.length) {
      const i = todo.pop();
      const { n, u, v } = face[i];
      const [x, y] = cells[i];
      for (const [dx, dy, next] of [
        [1, 0, () => ({ n: u, u: neg(n), v })],
        [-1, 0, () => ({ n: neg(u), u: n, v })],
        [0, 1, () => ({ n: v, u, v: neg(n) })],
        [0, -1, () => ({ n: neg(v), u, v: n })],
      ]) {
        const j = at.get(key([x + dx, y + dy]));
        if (j != null && !face[j]) {
          face[j] = next();
          todo.push(j);
        }
      }
    }
    return face.map((fc) => fc && fc.n.join());
  }
  const isCubeNet = (cells) =>
    cells.length === 6 && new Set(foldNet(cells)).size === 6 && !foldNet(cells).includes(undefined);
  // The 11 nets of the cube, then shapes of 6 squares that do not fold into one (near misses)
  const CUBE_NETS = [
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [0, 0],
      [0, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [0, 0],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [0, 0],
      [2, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [0, 0],
      [3, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [1, 0],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [1, 0],
      [2, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
      [3, 1],
      [1, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
      [3, 1],
      [2, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
      [3, 1],
      [3, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
      [3, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
      [3, 1],
      [4, 1],
    ],
  ];
  const NOT_NETS = [
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ], // 2 × 3
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [5, 0],
    ], // a row of 6
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [0, 0],
    ], // a row of 5
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [0, 0],
      [1, 0],
    ], // two flaps side by side
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [0, 0],
      [3, 0],
    ], // two flaps on the same side, at both ends
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [0, 0],
      [2, 0],
    ], // two flaps on the same side, one apart
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
      [3, 1],
    ], // a 2 × 2 block inside
    [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
    ], // two squares stacked on the end of a row of 4
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2],
    ], // a cross with a corner
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
      [2, 2],
      [3, 2],
    ], // a long S
  ];
  // Turned a quarter turn k times, and flipped
  const turnCells = (cells, k, flip) =>
    normCells(
      cells.map(([x, y]) => {
        let [a, b] = flip ? [-x, y] : [x, y];
        for (let i = 0; i < k; i++) [a, b] = [-b, a];
        return [a, b];
      })
    );

  // Nets of a pavé (patronsPave): unfold a box of dims [X, Y, Z] along the layout of a cube net — each face
  // is a rectangle whose sides are the box lengths along the face's two in-plane axes. Rectangles [x, y, w, h]
  // (units), or null when two faces would overlap or touch along anything but their fold.
  function layoutBoxNet(cells, dims) {
    const key = (c) => c.join();
    const at = new Map(cells.map((c, i) => [key(c), i]));
    const neg = (p) => p.map((x) => -x);
    const ax = (p) => p.findIndex((x) => x !== 0);
    const face = new Array(cells.length);
    const rect = new Array(cells.length);
    face[0] = { n: [0, 0, -1], u: [1, 0, 0], v: [0, 1, 0] };
    const size = (f) => [dims[ax(f.u)], dims[ax(f.v)]];
    rect[0] = [0, 0, ...size(face[0])];
    const todo = [0];
    while (todo.length) {
      const i = todo.pop();
      const { n, u, v } = face[i];
      const [x, y] = cells[i];
      const [rx, ry, rw, rh] = rect[i];
      for (const [dx, dy, next, place] of [
        [1, 0, () => ({ n: u, u: neg(n), v }), () => [rx + rw, ry]],
        [-1, 0, () => ({ n: neg(u), u: n, v }), (w) => [rx - w, ry]],
        [0, 1, () => ({ n: v, u, v: neg(n) }), () => [rx, ry + rh]],
        [0, -1, () => ({ n: neg(v), u, v: n }), (w, h) => [rx, ry - h]],
      ]) {
        const j = at.get(key([x + dx, y + dy]));
        if (j == null || face[j]) continue;
        face[j] = next();
        const [w, h] = size(face[j]);
        rect[j] = [...place(w, h), w, h];
        todo.push(j);
      }
    }
    return netRectsOk(rect) ? rect : null;
  }
  // No two rectangles overlap, exactly 5 contacts (the folds), each along a whole edge of both
  function netRectsOk(R) {
    let contacts = 0;
    for (let i = 0; i < R.length; i++)
      for (let j = i + 1; j < R.length; j++) {
        const [a, b] = [R[i], R[j]];
        const ox = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]);
        const oy = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
        if (ox > 0 && oy > 0) return false;
        const touchV = ox === 0 && oy > 0;
        const touchH = oy === 0 && ox > 0;
        if (!touchV && !touchH) continue;
        contacts++;
        if (touchV && !(a[1] === b[1] && a[3] === b[3])) return false;
        if (touchH && !(a[0] === b[0] && a[2] === b[2])) return false;
      }
    return contacts === R.length - 1;
  }
  // A net on squared paper: each face a rectangle (u px a unit) with its unit squares drawn inside
  function boxNetSvg(R, u = 12) {
    const x0 = Math.min(...R.map((r) => r[0]));
    const y0 = Math.min(...R.map((r) => r[1]));
    const W = Math.max(...R.map((r) => r[0] + r[2])) - x0;
    const H = Math.max(...R.map((r) => r[1] + r[3])) - y0;
    let body = '';
    for (const [x, y, w, h] of R) {
      const [px, py] = [(x - x0) * u + 1, (y - y0) * u + 1];
      let grid = '';
      for (let i = 1; i < w; i++) grid += `M${px + i * u} ${py}v${h * u}`;
      for (let j = 1; j < h; j++) grid += `M${px} ${py + j * u}h${w * u}`;
      body += `<rect x="${px}" y="${py}" width="${w * u}" height="${h * u}" fill="var(--p)" fill-opacity=".3" stroke="var(--ct)" stroke-width="1.4"/>`;
      if (grid) body += `<path d="${grid}" stroke="var(--ct)" stroke-opacity=".25" stroke-width="0.8" fill="none"/>`;
    }
    const k = 1.6;
    return `<svg viewBox="0 0 ${W * u + 2} ${H * u + 2}" width="${f1((W * u + 2) * k)}" height="${f1((H * u + 2) * k)}" data-s="${u}" role="img" aria-label="Un patron" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  }
  const f1 = (v) => Math.round(v * 10) / 10;

  // Areas (colorierAire, aireQuadrillage, comparerAires) — figures made of squares of a grid, checked again
  // by scripts/lib/grid-board.js (area boards) and scripts/lib/aires.js (drawings: <rect> squares, <polygon> halves)
  const aKey = (p) => `${p[0]},${p[1]}`;
  const near4 = ([r, c]) => [
    [r + 1, c],
    [r - 1, c],
    [r, c + 1],
    [r, c - 1],
  ];
  // A random piece of n squares inside the box [r0, r1) × [c0, c1); `tight` (0–1): how much it keeps to a block
  function growPiece(n, [r0, r1, c0, c1], tight = 0.5) {
    for (let t = 0; t < 200; t++) {
      const start = [rand(r0, r1 - 1), rand(c0, c1 - 1)];
      const cells = [start];
      const set = new Set([aKey(start)]);
      while (cells.length < n) {
        const ring = [];
        for (const p of cells)
          for (const q of near4(p))
            if (q[0] >= r0 && q[0] < r1 && q[1] >= c0 && q[1] < c1 && !set.has(aKey(q))) {
              const touching = near4(q).filter((x) => set.has(aKey(x))).length;
              for (let w = 0; w < (Math.random() < tight ? touching * touching : 1); w++) ring.push(q);
            }
        if (!ring.length) break;
        const q = randItem(ring);
        if (set.has(aKey(q))) continue;
        set.add(aKey(q));
        cells.push(q);
      }
      if (cells.length === n && !pieceHole(cells)) return cells;
    }
    return null;
  }
  function pieceHole(cells) {
    const set = new Set(cells.map(aKey));
    const rs = cells.map((p) => p[0]);
    const cs = cells.map((p) => p[1]);
    const [r0, r1, c0, c1] = [Math.min(...rs) - 1, Math.max(...rs) + 1, Math.min(...cs) - 1, Math.max(...cs) + 1];
    const seen = new Set([aKey([r0, c0])]);
    const todo = [[r0, c0]];
    while (todo.length)
      for (const q of near4(todo.pop()))
        if (q[0] >= r0 && q[0] <= r1 && q[1] >= c0 && q[1] <= c1 && !set.has(aKey(q)) && !seen.has(aKey(q))) {
          seen.add(aKey(q));
          todo.push(q);
        }
    return seen.size + set.size !== (r1 - r0 + 1) * (c1 - c0 + 1);
  }
  const pieceSides = (cells) => {
    const set = new Set(cells.map(aKey));
    return cells.reduce((n, p) => n + near4(p).filter((q) => !set.has(aKey(q))).length, 0);
  };
  function pieceShape(cells) {
    const forms = [];
    for (const flip of [false, true])
      for (let k = 0; k < 4; k++) {
        let c = cells.map(([r, q]) => (flip ? [r, -q] : [r, q]));
        for (let i = 0; i < k; i++) c = c.map(([r, q]) => [q, -r]);
        const r0 = Math.min(...c.map((p) => p[0]));
        const q0 = Math.min(...c.map((p) => p[1]));
        forms.push(JSON.stringify(c.map(([r, q]) => [r - r0, q - q0]).sort((x, y) => x[0] - y[0] || x[1] - y[1])));
      }
    return forms.sort()[0];
  }
  // A figure on squared paper: whole squares and half squares (a right triangle with its right angle in
  // corner tl / tr / bl / br of its square). s: side of a square in px
  function areaFigureSvg(cells, halves = [], s = 26) {
    const all = [...cells, ...halves];
    const rows = Math.max(...all.map((p) => p[0])) + 2;
    const cols = Math.max(...all.map((p) => p[1])) + 2;
    const x0 = Math.min(...all.map((p) => p[1])) - 1;
    const y0 = Math.min(...all.map((p) => p[0])) - 1;
    const W = (cols - x0) * s;
    const H = (rows - y0) * s;
    let grid = '';
    for (let i = 0; i <= cols - x0; i++) grid += `M${i * s} 0V${H}`;
    for (let j = 0; j <= rows - y0; j++) grid += `M0 ${j * s}H${W}`;
    const X = (c) => (c - x0) * s;
    const Y = (r) => (r - y0) * s;
    const fill = 'fill="var(--p)" fill-opacity=".45" stroke="var(--ct)" stroke-width="1.5"';
    const sq = cells.map(([r, c]) => `<rect x="${X(c)}" y="${Y(r)}" width="${s}" height="${s}" ${fill}/>`).join('');
    const tri = halves
      .map(([r, c, k]) => {
        const [x, y] = [X(c), Y(r)];
        const P = {
          tl: [
            [x, y],
            [x + s, y],
            [x, y + s],
          ],
          tr: [
            [x, y],
            [x + s, y],
            [x + s, y + s],
          ],
          bl: [
            [x, y],
            [x + s, y + s],
            [x, y + s],
          ],
          br: [
            [x + s, y],
            [x + s, y + s],
            [x, y + s],
          ],
        }[k];
        return `<polygon points="${P.map((p) => p.join(',')).join(' ')}" ${fill}/>`;
      })
      .join('');
    return `<svg viewBox="-1 -1 ${W + 2} ${H + 2}" width="${W + 2}" height="${H + 2}" data-s="${s}" role="img" aria-label="Une figure sur un quadrillage" xmlns="http://www.w3.org/2000/svg"><path d="${grid}" stroke="var(--cs)" stroke-opacity=".35" stroke-width="1" fill="none"/>${sq}${tri}</svg>`;
  }

  // Plane shapes for trouverFormes / proprietesFigure: kind → <svg> of a filled polygon, disc or oval,
  //   turned on demand. params: near (distractors close to the target), colour (false → plain fill)
  function shapeKit(params = {}) {
    const near = !!params.near;
    const pick = (a, b) => a + Math.random() * (b - a);
    const rad = Math.PI / 180;
    const off90 = (x) => Math.abs(x - 90);
    const anglesOf = (p) =>
      p.map((v, i) => {
        const [u, w] = [p[(i + p.length - 1) % p.length], p[(i + 1) % p.length]];
        const a = Math.atan2(u[1] - v[1], u[0] - v[0]) - Math.atan2(w[1] - v[1], w[0] - v[0]);
        const d = Math.abs(a / rad) % 360;
        return d > 180 ? 360 - d : d;
      });
    const triangle = (ok) => {
      for (let tries = 0; tries < 500; tries++) {
        const p = randItem([
          () => [
            [0, 0],
            [1, 0],
            [0.5, Math.sqrt(3) / 2],
          ],
          () => [
            [0, 0],
            [1, 0],
            [0.5, pick(0.35, 1.3)],
          ],
          () => [
            [0, 0],
            [1, 0],
            [pick(-0.2, 1.2), pick(0.4, 1)],
          ],
          () => [
            [0, 0],
            [1, 0],
            [0, pick(0.45, 1)],
          ],
        ])();
        const a = anglesOf(p);
        if (Math.min(...a) >= 22 && ok(a, p)) return p;
      }
      throw new Error('trouverFormes: no triangle found');
    };
    const sidesOf = (p) =>
      p.map((v, i) => Math.hypot(p[(i + 1) % p.length][0] - v[0], p[(i + 1) % p.length][1] - v[1]));
    // Closest ratio between two sides (1 = two sides equal)
    const spread = (s) => Math.min(...s.flatMap((x, i) => s.slice(i + 1).map((y) => Math.max(x, y) / Math.min(x, y))));
    const between = (u, v) =>
      Math.acos(Math.min(1, Math.abs(u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v)))) / rad;
    const edge = (p, i) => [p[(i + 1) % p.length][0] - p[i][0], p[(i + 1) % p.length][1] - p[i][1]];
    // Convex n-gon, irregular: no corner almost flat, no side tiny
    const polygone = (n, ok = () => true) => {
      for (let tries = 0; tries < 2000; tries++) {
        const p = Array.from({ length: n }, (_, i) => {
          const t = ((360 * (i + pick(-0.28, 0.28))) / n + 45) * rad;
          const r = pick(0.65, 1);
          return [r * Math.cos(t), r * Math.sin(t)];
        });
        const a = anglesOf(p);
        const s = sidesOf(p);
        const convex = Math.abs(a.reduce((x, y) => x + y, 0) - (n - 2) * 180) < 0.5;
        if (
          convex &&
          Math.min(...a) >= 45 &&
          Math.max(...a) <= 152 &&
          Math.min(...s) / Math.max(...s) >= 0.4 &&
          ok(a, p)
        )
          return p;
      }
      throw new Error(`trouverFormes: no ${n}-gon found`);
    };
    const regular = (n) =>
      Array.from({ length: n }, (_, i) => [Math.cos((90 + (360 * i) / n) * rad), Math.sin((90 + (360 * i) / n) * rad)]);
    // Kind → vertices before turning (y up, longest side about 1)
    const KINDS = {
      carre: () => [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
      rectangle: () => {
        const r = near ? pick(1.25, 1.4) : pick(1.6, 2.2);
        return [
          [0, 0],
          [r, 0],
          [r, 1],
          [0, 1],
        ];
      },
      losange: () => {
        const a = (near ? pick(68, 76) : pick(48, 64)) * rad;
        return [
          [0, 0],
          [1, 0],
          [1 + Math.cos(a), Math.sin(a)],
          [Math.cos(a), Math.sin(a)],
        ];
      },
      parallelogramme: () => {
        const a = (near ? pick(74, 80) : pick(55, 70)) * rad;
        const l = pick(0.5, 0.75);
        return [
          [0, 0],
          [1.3, 0],
          [1.3 + l * Math.cos(a), l * Math.sin(a)],
          [l * Math.cos(a), l * Math.sin(a)],
        ];
      },
      // No corner within 10° of a right angle (a trapèze rectangle is its own kind)
      trapeze: () => {
        const t = pick(0.4, 0.65);
        const h = pick(0.45, 0.7);
        const o = pick(0.2 * h, 1 - t - 0.2 * h);
        return [
          [0, 0],
          [1, 0],
          [o + t, h],
          [o, h],
        ];
      },
      // No corner near a right angle
      cerfVolant: () => {
        for (;;) {
          const w = pick(0.45, 0.6);
          const p = [
            [0, pick(0.35, 0.5)],
            [w, 0],
            [0, -pick(0.9, 1.2)],
            [-w, 0],
          ];
          if (anglesOf(p).every((x) => off90(x) >= 8)) return p;
        }
      },
      triangle: () => triangle((a) => a.every((x) => off90(x) < 0.01 || off90(x) >= 8)),
      triangleRectangle: () => triangle((a) => a.some((x) => off90(x) < 0.01)),
      autreTriangle: () =>
        triangle((a) =>
          near ? a.every((x) => off90(x) >= 7) && a.some((x) => off90(x) <= 13) : a.every((x) => off90(x) > 20)
        ),
      trapezeRectangle: () => {
        const [t, h] = [pick(0.4, 0.7), pick(0.45, 0.7)];
        return [
          [0, 0],
          [1, 0],
          [t, h],
          [0, h],
        ];
      },
      // No two sides parallel, no corner near a right angle
      quadrilatere: () =>
        polygone(
          4,
          (a, p) =>
            a.every((x) => off90(x) >= 8) &&
            Math.max(...a) <= 140 &&
            between(edge(p, 0), edge(p, 2)) >= 10 &&
            between(edge(p, 1), edge(p, 3)) >= 10
        ),
      triangleEquilateral: () => [
        [0, 0],
        [1, 0],
        [0.5, Math.sqrt(3) / 2],
      ],
      // Not right, not almost equilateral
      triangleIsocele: () => {
        const apex = randItem([pick(30, 46), pick(76, 82), pick(98, 120)]) * rad;
        return [
          [0, 0],
          [1, 0],
          [0.5, 0.5 / Math.tan(apex / 2)],
        ];
      },
      // Right, the two sides of the right angle clearly different
      triangleRectangleQ: () => [
        [0, 0],
        [1, 0],
        [0, pick(0.52, 0.78)], // hypotenuse ≥ 1.12 × the long side
      ],
      // No two sides close, no right angle
      triangleQuelconque: () => triangle((a, p) => a.every((x) => off90(x) >= 8) && spread(sidesOf(p)) >= 1.15),
      pentagone: () => (Math.random() < 0.3 ? regular(5) : polygone(5)),
      hexagone: () => (Math.random() < 0.3 ? regular(6) : polygone(6)),
    };

    const turnBy = (p, t) => {
      const [c, s] = [Math.cos(t * rad), Math.sin(t * rad)];
      return p.map(([x, y]) => [x * c - y * s, x * s + y * c]);
    };
    // No side within 15° of horizontal or vertical
    // (13° for the equilateral triangle: its three directions never all clear 15°)
    const isTurned = (p, lim = 15) =>
      p.every((v, i) => {
        const w = p[(i + 1) % p.length];
        const t = (((Math.atan2(w[1] - v[1], w[0] - v[0]) / rad) % 90) + 90) % 90;
        return Math.min(t, 90 - t) >= lim;
      });
    const place = (kind, p, wantTurned) => {
      if (Math.random() < 0.5) p = p.map(([x, y]) => [-x, y]); // mirror image
      if (!wantTurned)
        return turnBy(p, ['rectangle', 'losange', 'parallelogramme'].includes(kind) ? randItem([0, 90]) : 0);
      // 5 or 6 sides always keep one near an axis: any turn
      if (kind === 'pentagone' || kind === 'hexagone') return turnBy(p, pick(0, 360));
      for (let tries = 0; tries < 200; tries++) {
        const q = turnBy(p, pick(0, 360));
        if (isTurned(q, kind === 'triangleEquilateral' ? 13 : 15)) return q;
      }
      return null; // some triangles always keep a side near an axis: draw another one
    };

    const COLOURS = ['#60a5fa', '#f87171', '#4ade80', '#facc15', '#c084fc', '#fb923c'];
    const f = (v) => Math.round(v * 10) / 10;
    // Codes (opts.codes): equal sides get the same number of ticks (one group 1 tick, the next 2…), each
    //   right angle a small square. Drawn as <line data-code> / <polyline data-code>.
    const codesSvg = (P) => {
      const n = P.length;
      const S = P.map((v, i) => Math.hypot(P[(i + 1) % n][0] - v[0], P[(i + 1) % n][1] - v[1]));
      const group = Array(n).fill(0);
      let g = 0;
      S.forEach((x, i) => {
        if (group[i]) return;
        const same = S.map((y, j) => (j !== i && !group[j] && Math.max(x, y) / Math.min(x, y) < 1.01 ? j : -1)).filter(
          (j) => j >= 0
        );
        if (!same.length) return;
        g++;
        [i, ...same].forEach((j) => (group[j] = g));
      });
      const ink = 'stroke="var(--ct)" stroke-width="1.5" fill="none" data-code';
      let out = '';
      P.forEach((v, i) => {
        if (!group[i]) return;
        const w = P[(i + 1) % n];
        const [ux, uy] = [(w[0] - v[0]) / S[i], (w[1] - v[1]) / S[i]];
        for (let t = 0; t < group[i]; t++) {
          const o = (t - (group[i] - 1) / 2) * 3;
          const [mx, my] = [(v[0] + w[0]) / 2 + ux * o, (v[1] + w[1]) / 2 + uy * o];
          out += `<line x1="${f(mx - uy * 4)}" y1="${f(my + ux * 4)}" x2="${f(mx + uy * 4)}" y2="${f(my - ux * 4)}" ${ink}/>`;
        }
      });
      P.forEach((v, i) => {
        const [a, b] = [P[(i + n - 1) % n], P[(i + 1) % n]];
        const u = [a[0] - v[0], a[1] - v[1]];
        const w = [b[0] - v[0], b[1] - v[1]];
        const cos = (u[0] * w[0] + u[1] * w[1]) / (Math.hypot(...u) * Math.hypot(...w));
        if (Math.abs(cos) > 0.01) return;
        const [p1, p2] = [u, w].map((d) => [(d[0] / Math.hypot(...d)) * 7, (d[1] / Math.hypot(...d)) * 7]);
        out += `<polyline points="${f(v[0] + p1[0])},${f(v[1] + p1[1])} ${f(v[0] + p1[0] + p2[0])},${f(v[1] + p1[1] + p2[1])} ${f(v[0] + p2[0])},${f(v[1] + p2[1])}" ${ink}/>`;
      });
      return out;
    };
    const draw = (kind, wantTurned, opts = {}) => {
      const size = pick(64, 90);
      const fill = params.colour === false ? 'var(--sf)' : randItem(COLOURS);
      const paint = `fill="${fill}" stroke="var(--ct)" stroke-width="2.5" stroke-linejoin="round"`;
      let shape;
      if (kind === 'disque') shape = `<circle cx="50" cy="50" r="${f(size / 2)}" ${paint}/>`;
      else if (kind === 'ovale') {
        const rx = size / 2;
        shape = `<ellipse cx="50" cy="50" rx="${f(rx)}" ry="${f(rx / pick(1.4, 1.7))}" transform="rotate(${Math.round(pick(0, 180))} 50 50)" ${paint}/>`;
      } else {
        let p = null;
        for (let tries = 0; !p && tries < 50; tries++) p = place(kind, KINDS[kind](), wantTurned);
        if (!p) throw new Error(`trouverFormes: cannot turn a ${kind}`);
        const xs = p.map((v) => v[0]);
        const ys = p.map((v) => v[1]);
        const k = size / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
        const [cx, cy] = [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2];
        const P = p.map(([x, y]) => [f(50 + (x - cx) * k), f(50 - (y - cy) * k)]);
        shape = `<polygon points="${P.map((v) => v.join(',')).join(' ')}" ${paint}/>`;
        if (opts.codes) shape += codesSvg(P);
      }
      const px = opts.px || 84;
      return `<svg viewBox="0 0 100 100" width="${px}" height="${px}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${shape}</svg>`;
    };

    return { draw, KINDS, pick };
  }

  const generators = {
    // colorierAire: grid-board (mode area) — colour a figure on the grid. task (or a list): aire (`area`
    //   squares in one piece), perimetre (and a perimeter: `perimeter` sides of squares), meme-aire (the area
    //   of the blue model, another shape), autre-perimetre (the model's area, another perimeter).
    //   params: area ([5, 10]), size ([6, 8] rows × cols; [6, 9] with a model), model ([4, 7] squares).
    //   The board ships one solution (scripts/lib/grid-board.js checks it, the e2e solver plays it).
    colorierAire: {
      generate(params = {}) {
        const task = Array.isArray(params.task) ? randItem(params.task) : params.task || 'aire';
        const pick = (v, d) => (Array.isArray(v) ? rand(v[0], v[1]) : (v ?? d));
        const withModel = task === 'meme-aire' || task === 'autre-perimetre';
        const [rows, cols] = params.size || (withModel ? [6, 9] : [6, 8]);
        const plural = (n) => `${n} carreau${n > 1 ? 'x' : ''}`;
        for (let t = 0; t < 300; t++) {
          if (withModel) {
            const A = pick(params.model, rand(4, 7));
            const left = Math.floor((cols - 1) / 2);
            const model = growPiece(A, [0, rows, 0, left], 0.5);
            if (!model) continue;
            const mSides = pieceSides(model);
            const mShape = pieceShape(model);
            let solution = null;
            for (let k = 0; k < 60 && !solution; k++) {
              const s = growPiece(A, [0, rows, left + 1, cols], Math.random());
              if (s && (task === 'meme-aire' ? pieceShape(s) !== mShape : pieceSides(s) !== mSides)) solution = s;
            }
            if (!solution) continue;
            const title =
              task === 'meme-aire'
                ? 'Colorie une figure qui a la même aire que la figure bleue, mais une autre forme.'
                : 'Colorie une figure qui a la même aire que la figure bleue, mais un autre périmètre.';
            return { type: 'grid-board', title, board: { mode: 'area', rows, cols, task, model, solution } };
          }
          const A = pick(params.area, rand(5, 10));
          if (task === 'perimetre') {
            // perimeters some figure of A squares reaches, one of them asked
            const found = {};
            for (let k = 0; k < 80; k++) {
              const s = growPiece(A, [0, rows, 0, cols], Math.random());
              if (s) found[pieceSides(s)] = s;
            }
            const ps = Object.keys(found).map(Number);
            if (ps.length < 2) continue;
            const P = randItem(ps);
            return {
              type: 'grid-board',
              title: `Colorie une figure d’aire ${plural(A)} et de périmètre ${P}.`,
              body: 'Le périmètre se compte en côtés de carreau.',
              board: { mode: 'area', rows, cols, task, area: A, perimeter: P, solution: found[P] },
            };
          }
          const solution = growPiece(A, [0, rows, 0, cols], 0.5);
          if (!solution) continue;
          return {
            type: 'grid-board',
            title: `Colorie une figure d’aire ${plural(A)}.`,
            body: 'Les carreaux se touchent par un côté.',
            board: { mode: 'area', rows, cols, task: 'aire', area: A, solution },
          };
        }
        throw new Error('colorierAire: no board for these params');
      },
    },

    // aireQuadrillage: number-check — the area of a figure drawn on squared paper, in squares: whole squares
    //   and `halves` ([0, 0]) half squares cut along a diagonal. params: squares ([5, 10]), halves, box ([5, 6]), note.
    //   Checked from the drawing by scripts/lib/aires.js.
    aireQuadrillage: {
      generate(params = {}) {
        const pick = (v, d) => (Array.isArray(v) ? rand(v[0], v[1]) : (v ?? d));
        const [br, bc] = params.box || [5, 6];
        for (let t = 0; t < 200; t++) {
          const cells = growPiece(pick(params.squares, rand(5, 10)), [1, br + 1, 1, bc + 1], 0.6);
          if (!cells) continue;
          const set = new Set(cells.map(aKey));
          const want = pick(params.halves, 0);
          // half squares in empty squares next to the figure, a leg along a side of a whole square
          const spots = [];
          for (let r = 0; r <= br + 1; r++)
            for (let c = 0; c <= bc + 1; c++) {
              if (set.has(aKey([r, c]))) continue;
              const up = set.has(aKey([r - 1, c]));
              const down = set.has(aKey([r + 1, c]));
              const lf = set.has(aKey([r, c - 1]));
              const rt = set.has(aKey([r, c + 1]));
              const ks = [
                up || lf ? 'tl' : null,
                up || rt ? 'tr' : null,
                down || lf ? 'bl' : null,
                down || rt ? 'br' : null,
              ].filter(Boolean);
              if (ks.length) spots.push([r, c, randItem(ks)]);
            }
          if (spots.length < want) continue;
          const halves = shuffle(spots).slice(0, want);
          const area = cells.length + halves.length / 2;
          return {
            type: 'number-check',
            bodyFirst: true,
            body:
              `<div style="display:flex;justify-content:center">${areaFigureSvg(cells, halves)}</div>` +
              (params.note ? `<p>${params.note}</p>` : ''),
            operation: `Aire__=__?__carreaux`,
            answers: [String(area).replace('.', ',')],
          };
        }
        throw new Error('aireQuadrillage: no figure for these params');
      },
    },

    // comparerAires: mcq — which of two figures on squared paper has the bigger area (or the same)?
    //   params: squares ([6, 12]), equal (0.25: chance of the same area), trap (true: the figure with more
    //   squares has the shorter outline). Checked from the drawings by scripts/lib/aires.js.
    comparerAires: {
      generate(params = {}) {
        const pick = (v, d) => (Array.isArray(v) ? rand(v[0], v[1]) : (v ?? d));
        const equal = Math.random() < (params.equal ?? 0.25);
        const trap = params.trap !== false;
        for (let t = 0; t < 400; t++) {
          const a = pick(params.squares, rand(6, 12));
          const b = equal ? a : a + randItem([-2, -1, 1, 2]);
          if (b < 3) continue;
          // the bigger one compact, the smaller one stretched out (trap), so its outline looks longer
          const big = Math.max(a, b);
          const pa = growPiece(a, [0, 5, 0, 6], trap && a === big && !equal ? 1 : 0.05);
          const pb = growPiece(b, [0, 5, 0, 6], trap && b === big && !equal ? 1 : 0.05);
          if (!pa || !pb) continue;
          if (trap && !equal && pieceSides(a === big ? pa : pb) >= pieceSides(a === big ? pb : pa)) continue;
          if (equal && pieceShape(pa) === pieceShape(pb)) continue;
          const pics = [pa, pb].map((c) => areaFigureSvg(c, [], 18));
          return {
            type: 'mcq',
            title: 'Quelle figure a la plus grande aire ?',
            body:
              '<div style="display:flex;justify-content:center;flex-wrap:wrap;gap:1.5rem">' +
              pics
                .map((svg, i) => `<div style="text-align:center">${svg}<div><strong>${'AB'[i]}</strong></div></div>`)
                .join('') +
              '</div>',
            mcqChoices: ['La figure A', 'La figure B', 'Elles ont la même aire'],
            mcqAnswer: a === b ? 2 : a > b ? 0 : 1,
          };
        }
        throw new Error('comparerAires: no pair of figures');
      },
    },

    // compterCubes: number-check — how many cubes in a stack drawn in perspective (hidden cubes count: no
    //   cube floats). params: cols ([2, 3]), depth ([1, 1]), maxH (2), total ([3, 6]), note (a line under the
    //   drawing). Checked by scripts/lib/cubes.js.
    compterCubes: {
      generate(params = {}) {
        const pick = (v, d) => (Array.isArray(v) ? rand(v[0], v[1]) : (v ?? d));
        const H = randomStack({
          cols: pick(params.cols, 3),
          depth: pick(params.depth, 1),
          maxH: params.maxH || 2,
          total: params.total || [3, 6],
        });
        const n = H.flat().reduce((s, v) => s + v, 0);
        return {
          type: 'number-check',
          bodyFirst: true,
          body:
            `<div style="display:flex;justify-content:center">${cubeStackSvg(H)}</div>` +
            (params.note ? `<p>${params.note}</p>` : ''),
          operation: 'Il__y__a__?__cubes.',
          answers: [String(n)],
        };
      },
    },

    // vueCubes: tile-select — pick the view (face, dessus or droite) of a stack among other views and their
    //   mirror images. params: views (['face', 'dessus']), cols ([2, 3]), depth ([2, 2]), maxH (3), total ([4, 9]),
    //   count (4). Checked by scripts/lib/cubes.js.
    vueCubes: {
      generate(params = {}) {
        const pick = (v, d) => (Array.isArray(v) ? rand(v[0], v[1]) : (v ?? d));
        const NAMES = { face: 'de face', dessus: 'de dessus', droite: 'de droite' };
        const count = params.count || 4;
        for (let t = 0; t < 200; t++) {
          const H = randomStack({
            cols: pick(params.cols, 3),
            depth: pick(params.depth, 2),
            maxH: params.maxH || 3,
            total: params.total || [4, 9],
          });
          const kind = randItem(params.views || ['face', 'dessus']);
          const want = cubeView(H, kind);
          const others = [];
          const seen = new Set([cellsKey(want)]);
          const add = (cells) => {
            if (!cells.length || seen.has(cellsKey(cells))) return;
            seen.add(cellsKey(cells));
            others.push(cells);
          };
          for (const k of shuffle(['face', 'dessus', 'droite'].filter((v) => v !== kind))) add(cubeView(H, k));
          add(turnCells(want, 0, true));
          add(turnCells(want, 2, false));
          // one square more or less, still standing on the ground for front / side views
          const extra = [...want, [Math.max(...want.map((c) => c[0])) + 1, Math.max(...want.map((c) => c[1]))]];
          add(extra);
          if (want.length > 2) add(want.slice(0, -1));
          if (others.length < count - 1) continue;
          const tiles = shuffle([want, ...shuffle(others).slice(0, count - 1)]);
          return {
            type: 'tile-select',
            title: `Clique sur la vue <strong>${NAMES[kind]}</strong> de cet assemblage.`,
            body: `<div style="display:flex;justify-content:center">${cubeStackSvg(H)}</div>`,
            tiles: tiles.map((c) => squaresSvg(c)),
            tileAnswers: [tiles.indexOf(want)],
          };
        }
        throw new Error('vueCubes: no stack with enough different views');
      },
    },

    // patronsCube: tile-select — tap every net that folds into a cube, among shapes of 6 squares that do
    //   not. params: count (6), answers ([2, 3]). Nets turned and flipped at random. Checked by scripts/lib/cubes.js.
    patronsCube: {
      generate(params = {}) {
        const count = params.count || 6;
        const [aMin, aMax] = params.answers || [2, 3];
        const k = rand(aMin, aMax);
        const nets = shuffle([...CUBE_NETS]).slice(0, k);
        const bad = shuffle(NOT_NETS.filter((c) => c.length === 6 && !isCubeNet(c))).slice(0, count - k);
        const shapes = [...nets, ...bad].map((c) => turnCells(c, rand(0, 3), Math.random() < 0.5));
        const order = shuffle(shapes.map((_, i) => i));
        return {
          type: 'tile-select',
          title: 'Clique sur tous les <strong>patrons de cube</strong>.',
          body: 'Un patron se plie pour former le cube, sans que deux faces se recouvrent.',
          tiles: order.map((i) => squaresSvg(shapes[i])),
          tileAnswers: order.map((i, pos) => (i < k ? pos : -1)).filter((pos) => pos >= 0),
        };
      },
    },

    // patronsPave: tile-select — the pavé is drawn as a stack of unit cubes; tap every net of it (rectangles
    //   on squared paper) among near misses: one face of the wrong size, or a layout where two faces would
    //   fold onto each other. params: dims (lengths to pick from, [1, 3]), count (4), answers ([1, 2]).
    //   Checked by scripts/lib/cubes.js (reads the rectangles, rolls a box over them).
    patronsPave: {
      generate(params = {}) {
        const [lo, hi] = params.dims || [1, 3];
        const count = params.count || 4;
        const [aMin, aMax] = params.answers || [1, 2];
        for (let t = 0; t < 500; t++) {
          const dims = [rand(lo, hi), rand(lo, hi), rand(lo, hi)];
          if (new Set(dims).size < 2) continue; // not a cube
          const k = rand(aMin, aMax);
          const good = [];
          for (const net of shuffle([...CUBE_NETS])) {
            if (good.length === k) break;
            const R = layoutBoxNet(turnCells(net, rand(0, 3), Math.random() < 0.5), shuffle([...dims]));
            if (R) good.push(R);
          }
          if (good.length < k) continue;
          const bad = [];
          // a layout that does not fold (two faces on each other), lengths that look right
          for (const shape of shuffle(
            NOT_NETS.filter((c) => !/^\[\[0,0\],\[1,0\],\[2,0\],\[3,0\],\[4,0\],\[5,0\]\]$/.test(JSON.stringify(c)))
          )) {
            if (bad.length >= Math.ceil((count - k) / 2)) break;
            const R = layoutBoxNet(turnCells(shape, rand(0, 3), Math.random() < 0.5), shuffle([...dims]));
            if (R) bad.push(R);
          }
          // a net with one end face of the wrong length (it does not close)
          for (let s = 0; s < 40 && bad.length < count - k; s++) {
            const R = layoutBoxNet(turnCells(randItem(CUBE_NETS), rand(0, 3), Math.random() < 0.5), shuffle([...dims]));
            if (!R) continue;
            const i = rand(1, 5);
            const [x, y, w, h] = R[i];
            const W = R.map((r, j) => (j === i ? null : r));
            // the side away from the fold gets another length: try both directions
            const alt = randItem([w + 1, h + 1, Math.max(1, w - 1), Math.max(1, h - 1)]);
            const touchesLeft = W.some((r) => r && r[0] + r[2] === x && r[1] === y);
            const touchesRight = W.some((r) => r && r[0] === x + w && r[1] === y);
            const touchesTop = W.some((r) => r && r[1] + r[3] === y && r[0] === x);
            const touchesBottom = W.some((r) => r && r[1] === y + h && r[0] === x);
            let nr = null;
            if ((touchesLeft || touchesRight) && alt !== w && alt !== h)
              nr = touchesLeft ? [x, y, alt, h] : [x + w - alt, y, alt, h];
            else if ((touchesTop || touchesBottom) && alt !== h && alt !== w)
              nr = touchesTop ? [x, y, w, alt] : [x, y + h - alt, w, alt];
            if (!nr) continue;
            const R2 = R.map((r, j) => (j === i ? nr : r));
            if (netRectsOk(R2)) bad.push(R2);
          }
          if (bad.length < count - k) continue;
          const shapes = [...good, ...bad.slice(0, count - k)];
          const tiles = shapes.map((R) => boxNetSvg(R));
          if (new Set(tiles).size !== tiles.length) continue;
          const order = shuffle(tiles.map((_, i) => i));
          const [X, Y, Z] = dims;
          const H = Array.from({ length: Y }, () => Array(X).fill(Z));
          return {
            type: 'tile-select',
            title: 'Clique sur tous les <strong>patrons de ce pavé</strong>.',
            body:
              `<div style="display:flex;justify-content:center">${cubeStackSvg(H, 24)}</div>` +
              '<p>Compte les cubes pour trouver ses longueurs. Un patron se plie sans trou ni face en trop.</p>',
            tiles: order.map((i) => tiles[i]),
            tileAnswers: order.map((i, pos) => (i < k ? pos : -1)).filter((pos) => pos >= 0),
          };
        }
        throw new Error('patronsPave: no set of nets');
      },
    },

    // faceOpposee: mcq — on a cube net with lettered faces, which face is opposite the one asked?
    //   Checked by scripts/lib/cubes.js (folds the net read from the drawing).
    faceOpposee: {
      generate() {
        const cells = turnCells(randItem(CUBE_NETS), rand(0, 3), Math.random() < 0.5);
        const letters = shuffle(['A', 'B', 'C', 'D', 'E', 'F']);
        const normals = foldNet(cells);
        const i = rand(0, 5);
        const opp = normals.findIndex(
          (nm) =>
            nm ===
            normals[i]
              .split(',')
              .map((x) => String(-Number(x) || 0))
              .join()
        );
        const choices = letters.filter((_, j) => j !== i).sort();
        return {
          type: 'mcq',
          title: `Quand on plie ce patron, quelle face sera en face de la face <strong>${letters[i]}</strong> ?`,
          body: `<div style="display:flex;justify-content:center">${squaresSvg(cells, 16, letters)}</div>`,
          mcqChoices: choices,
          mcqAnswer: choices.indexOf(letters[opp]),
          mcqCompact: true,
        };
      },
    },

    // trouverFormes: tile-select — tap every <target> among plane shapes drawn in any orientation (a
    //   square on its tip is still a square, a triangle need not sit on a side). Checked from the
    //   drawing alone by scripts/lib/shapes.js.
    //   params: target ('carre' | 'rectangle' | 'losange' | 'triangle' | 'triangleRectangle' | 'disque' |
    //   'trapeze' | 'trapezeRectangle' | 'parallelogramme' | 'quadrilatere' | 'pentagone' | 'hexagone' |
    //   'triangleIsocele' | 'triangleEquilateral'),
    //   among (distractor kinds, default by target), count (6 tiles), answers ([2, 3]),
    //   turn ('all' | 'some' | 'none'; 'some' turns one answer and keeps another upright),
    //   near (false — distractors close to the target: rectangles and rhombi almost square,
    //   parallelograms almost rectangles, triangles almost right), inclusive (false — a square also
    //   counts as a rectangle / rhombus, an equilateral triangle as isosceles, and one is drawn; otherwise none is), colour (true — fills vary),
    //   kid (false — GS: the title is an emoji and the instruction is spoken from say)
    trouverFormes: {
      generate(params = {}) {
        const target = params.target || 'carre';
        const near = !!params.near;
        // Inclusive: one answer is the special case (a square among rectangles, an equilateral among isosceles)
        const SPECIAL = { rectangle: 'carre', losange: 'carre', triangleIsocele: 'triangleEquilateral' };
        const inclusive = !!params.inclusive && !!SPECIAL[target];
        const turn = params.turn || 'all';
        const [aMin, aMax] = params.answers || [2, 3];
        const count = params.count || 6;
        const { draw } = shapeKit(params);
        const AMONG = {
          carre: near
            ? ['rectangle', 'losange', 'parallelogramme', 'rectangle', 'losange']
            : ['rectangle', 'losange', 'triangle', 'disque', 'trapeze'],
          rectangle: ['parallelogramme', 'trapeze', 'losange', 'triangle', 'cerfVolant'],
          losange: ['cerfVolant', 'parallelogramme', 'rectangle', 'trapeze'],
          triangle: ['carre', 'rectangle', 'losange', 'disque', 'trapeze'],
          triangleRectangle: ['autreTriangle'],
          disque: ['ovale', 'carre', 'triangle', 'rectangle'],
          // No parallelogram: under the inclusive definition it is a trapèze too
          trapeze: ['quadrilatere', 'cerfVolant', 'quadrilatere', 'triangle', 'pentagone'],
          trapezeRectangle: ['trapeze', 'quadrilatere', 'trapeze', 'parallelogramme'],
          // No rectangle, rhombus or square: they are parallelograms
          parallelogramme: ['trapeze', 'quadrilatere', 'cerfVolant', 'trapeze', 'triangle'],
          quadrilatere: ['triangle', 'pentagone', 'hexagone', 'triangle', 'disque'],
          pentagone: ['hexagone', 'quadrilatere', 'hexagone', 'trapeze', 'triangle'],
          hexagone: ['pentagone', 'quadrilatere', 'pentagone', 'parallelogramme', 'triangle'],
          triangleIsocele: ['triangleQuelconque', 'triangleRectangleQ', 'triangleQuelconque'],
          triangleEquilateral: ['triangleIsocele', 'triangleQuelconque', 'triangleIsocele', 'triangleRectangleQ'],
        };
        const NAMES = {
          carre: 'carrés',
          rectangle: 'rectangles',
          losange: 'losanges',
          triangle: 'triangles',
          triangleRectangle: 'triangles rectangles',
          disque: 'disques',
          trapeze: 'trapèzes',
          trapezeRectangle: 'trapèzes rectangles',
          parallelogramme: 'parallélogrammes',
          quadrilatere: 'quadrilatères',
          pentagone: 'pentagones',
          hexagone: 'hexagones',
          triangleIsocele: 'triangles isocèles',
          triangleEquilateral: 'triangles équilatéraux',
        };
        if (!NAMES[target]) throw new Error(`trouverFormes: unknown target « ${target} »`);
        // A square is a rectangle and a rhombus: never a distractor for them
        const among = (params.among || AMONG[target]).filter(
          (k) => k !== target && !(k === 'carre' && (target === 'rectangle' || target === 'losange'))
        );

        const k = rand(aMin, aMax);
        // Answers first (the first one turned, the second upright when turn = 'some'), then distractors
        // Quadrilatères: every kind of four-sided figure, one each
        const QUADS = shuffle([
          'carre',
          'rectangle',
          'losange',
          'parallelogramme',
          'trapeze',
          'trapezeRectangle',
          'quadrilatere',
          'cerfVolant',
        ]);
        const kinds = Array.from({ length: k }, (_, i) =>
          target === 'quadrilatere' ? QUADS[i] : inclusive && i === k - 1 && k > 1 ? SPECIAL[target] : target
        );
        const pool = shuffle(among);
        for (let i = 0; kinds.length < count; i++) kinds.push(pool[i % pool.length]);
        const seen = new Set();
        const tiles = kinds.map((kind, i) => {
          const t = turn === 'all' || (turn === 'some' && (i === 0 || (i !== 1 && Math.random() < 0.5)));
          let svg = draw(kind, t);
          while (seen.has(svg)) svg = draw(kind, t); // two discs of the same size and colour
          seen.add(svg);
          return svg;
        });
        const order = shuffle(tiles.map((_, i) => i));
        const say = `Touche tous les ${NAMES[target]}.`;
        return {
          type: 'tile-select',
          title: params.kid
            ? '🔍'
            : inclusive
              ? `Clique sur toutes les figures qui sont des <strong>${NAMES[target]}</strong>.`
              : `Clique sur tous les <strong>${NAMES[target]}</strong>.`,
          ...(params.kid ? { say } : {}),
          tiles: order.map((i) => tiles[i]),
          tileAnswers: order.map((i, pos) => (i < k ? pos : -1)).filter((pos) => pos >= 0),
        };
      },
    },

    // proprietesFigure: one figure, drawn turned or not, and a question on what can be seen or checked on
    //   it (with a set square: a corner of a sheet). Checked from the drawing by scripts/lib/shapes.js.
    //   params: ask ('cotes' | 'sommets' | 'anglesDroits' | 'paralleles' | 'triangle'), kinds (figures
    //   drawn, default by ask), turned (0.6 — share of figures turned), codes (false — 'triangle': equal
    //   sides and right angles coded, the pupil reads the codes)
    proprietesFigure: {
      generate(params = {}) {
        const ask = params.ask || 'cotes';
        const KINDS = {
          cotes: ['triangle', 'carre', 'rectangle', 'losange', 'trapeze', 'quadrilatere', 'pentagone', 'hexagone'],
          anglesDroits: [
            'carre',
            'rectangle',
            'trapezeRectangle',
            'triangleRectangleQ',
            'losange',
            'parallelogramme',
            'trapeze',
            'quadrilatere',
            'triangleQuelconque',
          ],
          paralleles: [
            'carre',
            'rectangle',
            'losange',
            'parallelogramme',
            'trapeze',
            'trapezeRectangle',
            'quadrilatere',
            'cerfVolant',
          ],
          triangle: ['triangleRectangleQ', 'triangleIsocele', 'triangleEquilateral', 'triangleQuelconque'],
        };
        KINDS.sommets = KINDS.cotes;
        if (!KINDS[ask]) throw new Error(`proprietesFigure: unknown ask « ${ask} »`);
        const kind = randItem(params.kinds || KINDS[ask]);
        const { draw } = shapeKit({ colour: params.colour });
        const svg = draw(kind, Math.random() < (params.turned ?? 0.6), { codes: !!params.codes, px: 150 });
        const body = `<div style="display:flex;justify-content:center">${svg}</div>`;
        const SIDES = { triangle: 3, pentagone: 5, hexagone: 6 };
        if (ask === 'cotes' || ask === 'sommets')
          return {
            type: 'number-check',
            bodyFirst: true,
            body,
            operation: `Cette__figure__a__?__${ask === 'cotes' ? 'côtés' : 'sommets'}.`,
            answers: [String(SIDES[kind] || 4)],
          };
        if (ask === 'anglesDroits') {
          const RIGHTS = { carre: 4, rectangle: 4, trapezeRectangle: 2, triangleRectangleQ: 1 };
          return {
            type: 'number-check',
            bodyFirst: true,
            body: `${body}<p>Combien d'angles droits a cette figure ? Tu peux vérifier avec une équerre ou le coin d'une feuille.</p>`,
            operation: '?__angle(s)__droit(s)',
            answers: [String(RIGHTS[kind] || 0)],
          };
        }
        if (ask === 'paralleles') {
          const choices = ['aucune', '1 paire', '2 paires'];
          const PAIRS = { carre: 2, rectangle: 2, losange: 2, parallelogramme: 2, trapeze: 1, trapezeRectangle: 1 };
          return {
            type: 'mcq',
            title: 'Combien de paires de côtés parallèles a ce quadrilatère ?',
            body,
            mcqChoices: choices,
            mcqAnswer: PAIRS[kind] || 0,
            mcqCompact: true,
          };
        }
        // triangle: the one true name among the four (an equilateral triangle is isosceles too: that
        // choice is left out for it)
        const NAMES = {
          triangleRectangleQ: 'un triangle rectangle',
          triangleIsocele: 'un triangle isocèle',
          triangleEquilateral: 'un triangle équilatéral',
          triangleQuelconque: 'un triangle quelconque',
        };
        const choices = shuffle(
          Object.entries(NAMES)
            .filter(([k]) => !(kind === 'triangleEquilateral' && k === 'triangleIsocele'))
            .map(([, v]) => v)
        );
        return {
          type: 'mcq',
          title: 'Quel est ce triangle ?',
          body: params.codes ? `${body}<p>Les codes montrent les côtés égaux et les angles droits.</p>` : body,
          mcqChoices: choices,
          mcqAnswer: choices.indexOf(NAMES[kind]),
        };
      },
    },

    // trouverAngles: tile-select — tap every acute / right / obtuse angle, turned at random, with arms of
    //   random lengths (the first answer always has both arms off the axes).
    //   params: target ('aigu' | 'droit' | 'obtus'), count (6), answers ([2, 3]),
    //   near (false — acute and obtuse angles 14–26° from a right angle instead of 20–65°)
    trouverAngles: {
      generate(params = {}) {
        const target = params.target || 'droit';
        const NAMES = { aigu: 'angles aigus', droit: 'angles droits', obtus: 'angles obtus' };
        if (!NAMES[target]) throw new Error(`trouverAngles: unknown target « ${target} »`);
        const ranges = params.near ? NEAR_ANGLE_RANGES : ANGLE_RANGES;
        const [aMin, aMax] = params.answers || [2, 3];
        const count = params.count || 6;
        const k = rand(aMin, aMax);
        const others = shuffle(Object.keys(NAMES).filter((n) => n !== target));
        const tiles = Array.from({ length: count }, (_, i) => {
          const [lo, hi] = ranges[i < k ? target : others[i % 2]];
          const deg = rand(lo, hi);
          return angleSvg(deg, i === 0 ? offAxisTurn(deg) : pickF(0, 360), [pickF(30, 60), pickF(30, 60)]);
        });
        const order = shuffle(tiles.map((_, i) => i));
        return {
          type: 'tile-select',
          title: `Clique sur tous les <strong>${NAMES[target]}</strong>.`,
          tiles: order.map((i) => tiles[i]),
          tileAnswers: order.map((i, pos) => (i < k ? pos : -1)).filter((pos) => pos >= 0),
        };
      },
    },

    // comparerAngles: mcq — which of two drawn angles A and B is bigger (or smaller), or are they equal?
    //   params: gap (20 — degrees at least between unequal angles), equal (0 — chance they are equal),
    //   trap (true — the bigger angle has the shorter arms; equal angles get long / short arms),
    //   ask ('grand' | 'petit', random by default)
    comparerAngles: {
      generate(params = {}) {
        const gap = params.gap ?? 20;
        const equal = Math.random() < (params.equal ?? 0);
        const trap = params.trap !== false;
        const ask = params.ask || randItem(['grand', 'petit']);
        let degs;
        do degs = [rand(25, 160), rand(25, 160)];
        while (!equal && Math.abs(degs[0] - degs[1]) < gap);
        if (equal) degs[1] = degs[0];
        const long = () => [rand(52, 60), rand(48, 60)];
        const short = () => [rand(26, 34), rand(26, 36)];
        const free = () => [rand(30, 60), rand(30, 60)];
        const arms = !trap
          ? [free(), free()]
          : equal
            ? shuffle([long(), short()])
            : degs.map((d, i) => (d > degs[1 - i] ? short() : long()));
        const pictures = degs.map((d, i) => angleSvg(d, pickF(0, 360), arms[i], 140));
        const big = degs[0] > degs[1] ? 0 : 1;
        return {
          type: 'mcq',
          title: `Quel angle est le plus ${ask}\u00a0?`,
          body:
            `<div style="display:flex;justify-content:center;gap:1.5rem">` +
            pictures
              .map((svg, i) => `<div style="text-align:center">${svg}<div><strong>${'AB'[i]}</strong></div></div>`)
              .join('') +
            `</div>`,
          mcqChoices: ["L'angle A", "L'angle B", 'Ils sont égaux'],
          mcqAnswer: equal ? 2 : ask === 'grand' ? big : 1 - big,
        };
      },
    },

    // rangerAngles: drag-sort — order 3–4 drawn angles. Picture tiles keep their listed order, which is
    //   the answer. params: count (4), gap (15 — degrees at least between two angles),
    //   direction ('asc' | 'desc', random by default), trap (true — the bigger the angle, the shorter its arms)
    rangerAngles: {
      generate(params = {}) {
        const count = params.count || 4;
        const gap = params.gap ?? 15;
        const direction = params.direction || randItem(['asc', 'desc']);
        // Sorted draws, then spread by `gap`: increasing, at least `gap` apart, within 25–165°
        const degs = Array.from({ length: count }, () => rand(25, 165 - (count - 1) * gap))
          .sort((a, b) => a - b)
          .map((d, i) => d + i * gap);
        const step = 30 / (count - 1);
        const tiles = degs.map((d, i) => {
          const l = () => (params.trap === false ? rand(30, 60) : Math.round(60 - i * step - pickF(0, 4)));
          return angleSvg(d, pickF(0, 360), [l(), l()]);
        });
        return {
          type: 'drag-sort',
          title: `Range les angles du plus ${direction === 'asc' ? 'petit au plus grand' : 'grand au plus petit'}.`,
          direction,
          tiles: direction === 'asc' ? tiles : tiles.reverse(),
        };
      },
    },

    // Tracer sur quadrillage / papier pointé (grid-board, mode draw). task: copy (figure: ortho = outline of
    // cells, free = polygon with slanted sides; anchor: start from a given point), complete (the two missing
    // sides of a square / rectangle), mirror (draw the image of a broken line, axis v / h / vh / diag / any),
    // shape (carre / rectangle / triangleRectangle, ask: sides / area / free / tilted, or a list to draw from), parallel / perp (slopes:
    // axis / diag / any). Points are [r, c], 0…rows / 0…cols.
    tracerGrille: {
      generate(params = {}) {
        const task = randItem([].concat(params.task || 'copy'));
        const paper = params.paper || 'grid';
        const k = ([r, c]) => r + ',' + c;
        const fits = (rows, cols) => (p) => p[0] >= 0 && p[1] >= 0 && p[0] <= rows && p[1] <= cols;
        const ring = (P) => P.map((p, i) => [p, P[(i + 1) % P.length]]);
        const out = (title, board) => ({ type: 'grid-board', title, board: { mode: 'draw', paper, task, ...board } });

        if (task === 'copy') {
          const [rows, cols] = params.size || [6, 8];
          for (let attempt = 0; attempt < 400; attempt++) {
            let model;
            if (params.figure === 'free') {
              // Corners drawn in a small box, kept only if they are all corners of their convex hull
              const [lo, hi] = params.corners || [3, 4];
              const n = rand(lo, hi);
              const box = params.box || 4;
              const pts = Array.from({ length: n }, () => [rand(0, box), rand(0, box)]);
              const hull = convexHull(pts);
              if (hull.length !== n || area2(hull) < 6) continue;
              model = ring(hull);
            } else {
              // Outline of a group of cells: one closed line, no hole, no corners touching
              const [lo, hi] = params.cells || [4, 6];
              const want = rand(lo, hi);
              const box = params.box || 4;
              const cells = [[rand(0, box - 1), rand(0, box - 1)]];
              const has = (p) => cells.some((q) => q[0] === p[0] && q[1] === p[1]);
              while (cells.length < want) {
                const next = cells
                  .flatMap(([r, c]) => [
                    [r - 1, c],
                    [r + 1, c],
                    [r, c - 1],
                    [r, c + 1],
                  ])
                  .filter((p) => p[0] >= 0 && p[1] >= 0 && p[0] < box && p[1] < box && !has(p));
                cells.push(randItem(next));
              }
              model = [];
              for (const [r, c] of cells) {
                if (!has([r - 1, c]))
                  model.push([
                    [r, c],
                    [r, c + 1],
                  ]);
                if (!has([r + 1, c]))
                  model.push([
                    [r + 1, c],
                    [r + 1, c + 1],
                  ]);
                if (!has([r, c - 1]))
                  model.push([
                    [r, c],
                    [r + 1, c],
                  ]);
                if (!has([r, c + 1]))
                  model.push([
                    [r, c + 1],
                    [r + 1, c + 1],
                  ]);
              }
              const deg = {};
              for (const sg of model) for (const p of sg) deg[k(p)] = (deg[k(p)] || 0) + 1;
              if (Object.values(deg).some((d) => d !== 2)) continue;
              if (new Set(cells.map((p) => p[0])).size < 2 || new Set(cells.map((p) => p[1])).size < 2) continue; // not a bar
              model = mergeSegments(model);
              if (loopLength(model) !== model.length) continue; // a hole: two loops
            }
            const pts = model.flat();
            const r0 = Math.min(...pts.map((p) => p[0]));
            const c0 = Math.min(...pts.map((p) => p[1]));
            model = model.map((sg) => sg.map(([r, c]) => [r - r0, c - c0]));
            const h = Math.max(...model.flat().map((p) => p[0]));
            const w = Math.max(...model.flat().map((p) => p[1]));
            if (h > rows || w > cols || h < 1 || w < 1) continue;
            if (!params.anchor) return out('Reproduis la figure sur le quadrillage.', { rows, cols, model });
            const from = randItem(model.map((sg) => sg[0]));
            const to = [rand(from[0], rows - h + from[0]), rand(from[1], cols - w + from[1])];
            return out('Reproduis la figure en partant du point rouge.', { rows, cols, model, anchor: { from, to } });
          }
          throw new Error('tracerGrille: no figure found');
        }

        if (task === 'complete') {
          const [rows, cols] = params.size || [6, 8];
          const shape = randItem(params.shapes || ['carre', 'rectangle']);
          const [lo, hi] = params.side || [2, 4];
          for (let attempt = 0; attempt < 400; attempt++) {
            const u = params.tilted
              ? randItem([
                  [1, 2],
                  [2, 1],
                  [1, 1],
                  [2, -1],
                  [1, -2],
                  [1, -1],
                ])
              : randItem([
                  [0, 1],
                  [1, 0],
                ]);
            const a = params.tilted ? 1 : rand(lo, hi);
            const b = shape === 'carre' ? a : params.tilted ? rand(2, 3) : rand(lo, hi);
            if (shape === 'rectangle' && a === b) continue;
            const U = [u[0] * a, u[1] * a];
            const V = [-u[1] * b, u[0] * b];
            const P0 = [rand(0, rows), rand(0, cols)];
            const P = [
              P0,
              [P0[0] + U[0], P0[1] + U[1]],
              [P0[0] + U[0] + V[0], P0[1] + U[1] + V[1]],
              [P0[0] + V[0], P0[1] + V[1]],
            ];
            if (!P.every(fits(rows, cols))) continue;
            const sides = ring(P);
            const first = rand(0, 3);
            const given = [sides[first], sides[(first + 1) % 4]];
            const title = shape === 'carre' ? 'Termine le carré.' : 'Termine le rectangle.';
            return out(title, { rows, cols, given, target: sides });
          }
          throw new Error('tracerGrille: no shape fits');
        }

        if (task === 'mirror') {
          const AXES = { vh: ['v', 'h'], diag: ['d', 'a'], any: ['v', 'h', 'd', 'a'] };
          const STEPS = params.diagonals
            ? [
                [0, 1],
                [1, 0],
                [0, -1],
                [-1, 0],
                [1, 1],
                [1, -1],
                [-1, 1],
                [-1, -1],
              ]
            : [
                [0, 1],
                [1, 0],
                [0, -1],
                [-1, 0],
              ];
          for (let attempt = 0; attempt < 400; attempt++) {
            const axis = randItem(AXES[params.axis || 'vh'] || [params.axis]);
            const diag = axis === 'd' || axis === 'a';
            const size = params.size || [6, 8];
            const [rows, cols] = diag ? [size[0], size[0]] : axis === 'v' ? [size[0], size[1]] : [size[1], size[0]];
            const at = axis === 'v' ? cols / 2 : rows / 2;
            if (!diag && !Number.isInteger(at)) throw new Error('tracerGrille: the axis needs an even grid');
            const mirror = ([r, c]) =>
              axis === 'v'
                ? [r, 2 * at - c]
                : axis === 'h'
                  ? [2 * at - r, c]
                  : axis === 'd'
                    ? [c, r]
                    : [cols - c, rows - r];
            // Side of the axis: >0 one side, 0 on it
            const side = ([r, c]) =>
              axis === 'v' ? c - at : axis === 'h' ? r - at : axis === 'd' ? r - c : r + c - cols;
            const s = randItem([-1, 1]);
            const ok = (p) => fits(rows, cols)(p) && side(p) * s >= 0;
            const start = [rand(0, rows), rand(0, cols)];
            if (!ok(start)) continue;
            const line = [start];
            const [lo, hi] = params.segments || [3, 4];
            const n = rand(lo, hi);
            for (let t = 0; t < 40 && line.length <= n; t++) {
              const [dr, dc] = randItem(STEPS);
              const len = rand(1, params.maxLen || 2);
              const last = line[line.length - 1];
              const prev = line[line.length - 2];
              const p = [last[0] + dr * len, last[1] + dc * len];
              if (!ok(p) || line.some((q) => q[0] === p[0] && q[1] === p[1])) continue;
              // a real corner: never straight on, never back along the last side
              if (prev && (last[0] - prev[0]) * dc === (last[1] - prev[1]) * dr) continue;
              line.push(p);
            }
            if (line.length <= n) continue;
            const given = line.slice(1).map((p, i) => [line[i], p]);
            // At least two points off the axis; touching the axis or kept a square away from it
            if (line.filter((p) => side(p) !== 0).length < 2) continue;
            if (params.touch !== false && !line.some((p) => side(p) === 0)) continue;
            if (given.some(([p, q]) => side(p) === 0 && side(q) === 0)) continue; // a side along the axis hides it
            if (params.touch === false && line.some((p) => Math.abs(side(p)) < 1)) continue;
            const image = given.map((sg) => sg.map(mirror));
            const board = {
              task: 'complete',
              rows,
              cols,
              given,
              target: [...given, ...image],
              axis: diag ? { axis } : { axis, at },
            };
            return out('Trace le symétrique de la figure par rapport à la droite rouge.', board);
          }
          throw new Error('tracerGrille: no broken line found');
        }

        if (task === 'shape') {
          const [rows, cols] = params.size || [6, 8];
          const shape = randItem(params.shapes || ['carre', 'rectangle', 'triangleRectangle']);
          const ask = randItem([].concat(params.ask || 'sides'));
          const NAME = { carre: 'un carré', rectangle: 'un rectangle', triangleRectangle: 'un triangle rectangle' };
          const [lo, hi] = params.side || [2, 5];
          const plural = (n) => `${n} carreau${n > 1 ? 'x' : ''}`;
          if (ask === 'tilted')
            return out(`Trace ${NAME[shape]} penché : aucun de ses côtés ne suit les lignes du quadrillage.`, {
              rows,
              cols,
              want: { shape, tilted: true },
            });
          if (ask === 'free') return out(`Trace ${NAME[shape]}.`, { rows, cols, want: { shape } });
          if (ask === 'area' && shape !== 'rectangle') {
            // Square: a side that fits; right triangle: half of a rectangle that fits, a whole number of squares
            const a = rand(lo, Math.min(hi, rows, cols));
            if (shape === 'carre')
              return out(`Trace un carré d’aire ${plural(a * a)}.`, { rows, cols, want: { shape, area: a * a } });
            let b = rand(lo, Math.min(hi, cols));
            if ((a * b) % 2) b = b > lo ? b - 1 : b + 1;
            return out(`Trace un triangle rectangle d’aire ${plural((a * b) / 2)}.`, {
              rows,
              cols,
              want: { shape, area: (a * b) / 2 },
            });
          }
          if (ask === 'area') {
            // Rectangles: an area with two ways at least (2 × 6, 3 × 4) that fit
            for (let attempt = 0; attempt < 200; attempt++) {
              const area = rand(params.area ? params.area[0] : 6, params.area ? params.area[1] : 24);
              const ways = [];
              for (let a = 1; a < Math.sqrt(area); a++)
                if (area % a === 0 && area / a <= Math.max(rows, cols) && a <= Math.min(rows, cols)) ways.push(a);
              if (ways.length < 2) continue;
              return out(`Trace un rectangle d’aire ${plural(area)}.`, {
                rows,
                cols,
                want: { shape: 'rectangle', area, inclusive: true },
              });
            }
            throw new Error('tracerGrille: no area found');
          }
          const a = rand(lo, Math.min(hi, rows));
          let b = rand(lo, Math.min(hi, cols));
          if (shape === 'carre')
            return out(`Trace un carré de ${plural(a)} de côté.`, { rows, cols, want: { shape, sides: [a] } });
          if (shape === 'rectangle') {
            if (a === b) b = b > lo ? b - 1 : b + 1;
            const [L, l] = [Math.max(a, b), Math.min(a, b)];
            return out(`Trace un rectangle de ${plural(L)} de long et ${plural(l)} de large.`, {
              rows,
              cols,
              want: { shape, sides: [L, l] },
            });
          }
          return out(
            `Trace un triangle rectangle : les côtés de l’angle droit mesurent ${plural(a)} et ${plural(b)}.`,
            { rows, cols, want: { shape, sides: [a, b] } }
          );
        }

        // parallel / perp
        const [rows, cols] = params.size || [6, 8];
        const DIRS = {
          axis: [
            [0, 1],
            [1, 0],
          ],
          diag: [
            [0, 1],
            [1, 0],
            [1, 1],
            [1, -1],
          ],
          any: [
            [1, 1],
            [1, -1],
            [1, 2],
            [2, 1],
            [1, -2],
            [2, -1],
          ],
        }[params.slopes || 'axis'];
        for (let attempt = 0; attempt < 400; attempt++) {
          const d = randItem(DIRS);
          const n = rand(2, 4);
          const p = [rand(0, rows), rand(0, cols)];
          const ref = [p, [p[0] + d[0] * n, p[1] + d[1] * n]];
          if (!ref.every(fits(rows, cols))) continue;
          const through = [rand(0, rows), rand(0, cols)];
          if ((through[0] - p[0]) * d[1] === (through[1] - p[1]) * d[0]) continue; // on the line
          // Room for 3 steps along the line to draw, through A
          const e = task === 'perp' ? [-d[1], d[0]] : d;
          let room = 0;
          for (const sg of [1, -1])
            for (let t = 1; fits(rows, cols)([through[0] + sg * t * e[0], through[1] + sg * t * e[1]]); t++) room++;
          if (room < 3) continue;
          const word = task === 'perp' ? 'perpendiculaire' : 'parallèle';
          return out(`Trace la droite ${word} à la droite d qui passe par le point A.`, { rows, cols, ref, through });
        }
        throw new Error('tracerGrille: no line found');
      },
    },

    // tangramFigure: tangram — slide the pieces from the tray onto the grey silhouette; a tap turns a
    //   piece a quarter turn. Any covering of the silhouette counts (player, scripts/lib/tangram.js).
    //   figures (names in TANGRAM_FIGURES, default every tangram one), outlines (each piece's place drawn:
    //   GS, CP), turn (false: the pieces start the right way round and do not turn — GS)
    tangramFigure: {
      figures: TANGRAM_FIGURES,
      generate(params = {}) {
        const names = params.figures || Object.keys(TANGRAM_FIGURES).filter((k) => !k.startsWith('gs_'));
        const fig = TANGRAM_FIGURES[randItem(names)];
        const turn = params.turn !== false;
        const box = (s, r, f) => {
          const p = tgOrient(TG_SHAPES[s], r, f);
          return [Math.max(...p.map((q) => q[0])), Math.max(...p.map((q) => q[1]))];
        };
        let [fw, fh] = [0, 0];
        for (const [s, x, y, r, f] of fig.pieces) {
          const [bw, bh] = box(s, r, f);
          [fw, fh] = [Math.max(fw, x + bw), Math.max(fh, y + bh)];
        }
        const w = Math.max(fw + 2, 12);
        const [ox, oy, boardH] = [Math.floor((w - fw) / 2), 1, fh + 2];
        // Tray under the board: the pieces in a random order and way round, row after row, each row
        // centred
        const start = [];
        let [tx, ty, rowH, row] = [0, boardH + 1, 0, []];
        const centre = () => {
          const shift = Math.floor((w - tx + 1) / 2);
          for (const k of row) start[k][0] += shift;
        };
        for (const k of shuffle(fig.pieces.map((_, i) => i))) {
          const [s, , , r0, f0] = fig.pieces[k];
          const [r, f] = turn ? [rand(0, 3), s === 'pa' ? rand(0, 1) : 0] : [r0, f0];
          const [bw, bh] = box(s, r, f);
          if (tx + bw > w) {
            centre();
            [tx, ty, rowH, row] = [0, ty + rowH + 1, 0, []];
          }
          start[k] = [tx, ty, r, f];
          row.push(k);
          [tx, rowH] = [tx + bw + 1, Math.max(rowH, bh)];
        }
        centre();
        const pieces = fig.pieces.map(([shape, x, y, r, f], k) => ({
          shape,
          pts: TG_SHAPES[shape],
          sol: [x + ox, y + oy, r, f],
          start: start[k],
          color: TG_COLOURS[k % TG_COLOURS.length],
        }));
        const tg = { w, h: ty + rowH + 1, boardH, pieces, turn, name: fig.name, emoji: fig.emoji };
        if (params.outlines) tg.outlines = true;
        return { type: 'tangram', tg };
      },
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = generators;
  else Object.assign((root.AppGenerators = root.AppGenerators || {}), generators);
})(typeof window !== 'undefined' ? window : globalThis);
