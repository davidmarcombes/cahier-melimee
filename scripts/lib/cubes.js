/**
 * Cubes — stacks drawn in perspective cavalière and cube nets (generators compterCubes, vueCubes,
 * patronsCube, faceOpposee in geometrie.js). Read back from the markup: a stack from its height map
 * (data-h, checked against the 3 faces drawn per cube, 2 polygons each), a view or a net from its <rect> squares.
 * Folds a net by rolling a die over it, not with the generator's code. (build, oracle)
 */

const SVG_RE = /<svg\b[\s\S]*?<\/svg>/g;

// Height map H[y][x] (y = 0 the front row) of the stack drawn in `html`, or a problem string
function readStack(html) {
  const svg = (String(html).match(SVG_RE) || [])[0];
  if (!svg) return 'no drawing';
  const m = svg.match(/data-h="([\d/]+)"/);
  if (!m) return 'no height map';
  const H = m[1].split('/').map((r) => r.split('').map(Number));
  const n = H.flat().reduce((s, v) => s + v, 0);
  const polys = (svg.match(/<polygon\b/g) || []).length;
  if (polys !== 6 * n) return `${polys / 2} faces drawn for ${n} cubes`;
  return H;
}

// Every column shows its top: none stands behind a taller one (else a column could hide whole)
function hiddenColumn(H) {
  for (let y = 1; y < H.length; y++)
    for (let x = 0; x < H[y].length; x++)
      if (H[y][x] && H[y - 1][x] > H[y][x]) return `column (${x}, ${y}) is hidden behind a taller one`;
  return null;
}

// Squares [col, row] of a grid drawing (views, nets), with their letters when written
function readSquares(svg) {
  const rects = [...String(svg).matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)"/g)];
  if (!rects.length) return null;
  const s = Number(rects[0][3]);
  const texts = [...String(svg).matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((t) => t[1]);
  return rects.map((r, i) => ({ c: Math.round((r[1] - 1) / s), r: Math.round((r[2] - 1) / s), label: texts[i] }));
}

const norm = (cells) => {
  const mx = Math.min(...cells.map((c) => c[0]));
  const my = Math.min(...cells.map((c) => c[1]));
  return JSON.stringify(cells.map(([x, y]) => [x - mx, y - my]).sort((p, q) => p[1] - q[1] || p[0] - q[0]));
};

// The view of a stack as squares: face (x across), droite (depth across, the front on the left),
// dessus (from above, the front row at the bottom). Heights up for face / droite.
function viewOf(H, kind) {
  const out = [];
  if (kind === 'dessus') {
    H.forEach((row, y) => row.forEach((h, x) => h && out.push([x, -y])));
    return out;
  }
  const cols = H[0].length;
  const tall = (i) => (kind === 'face' ? Math.max(...H.map((r) => r[i])) : Math.max(...H[i]));
  const across = kind === 'face' ? cols : H.length;
  for (let i = 0; i < across; i++) for (let z = 0; z < tall(i); z++) out.push([i, -z]);
  return out;
}

// Roll a die over the net: the face lying on each square. Faces 0 bottom, 1 top, 2 back, 3 front, 4 right,
// 5 left; opposite faces are 0-1, 2-3, 4-5.
function rollNet(cells) {
  const at = new Map(cells.map(([c, r], i) => [`${c},${r}`, i]));
  const got = new Array(cells.length);
  // die: [bottom, top, back (−row), front (+row), right (+col), left (−col)] → face ids
  const walk = (i, d) => {
    got[i] = d[0];
    const [c, r] = cells[i];
    const [B, T, N, S, E, W] = d;
    const rolls = [
      [1, 0, [E, W, N, S, T, B]],
      [-1, 0, [W, E, N, S, B, T]],
      [0, 1, [S, N, B, T, E, W]],
      [0, -1, [N, S, T, B, E, W]],
    ];
    for (const [dc, dr, nd] of rolls) {
      const j = at.get(`${c + dc},${r + dr}`);
      if (j != null && got[j] == null) walk(j, nd);
    }
  };
  walk(0, [0, 1, 2, 3, 4, 5]);
  return got;
}
const foldsToCube = (cells) => {
  if (cells.length !== 6) return false;
  const f = rollNet(cells);
  return !f.includes(undefined) && new Set(f).size === 6;
};
const OPP = { 0: 1, 1: 0, 2: 3, 3: 2, 4: 5, 5: 4 };

const VIEW_NAMES = { 'de face': 'face', 'de dessus': 'dessus', 'de droite': 'droite' };

// Rectangles of a net drawing, in units of the grid (data-s px)
function readRects(svg) {
  const u = Number((String(svg).match(/data-s="([\d.]+)"/) || [])[1]);
  if (!u) return null;
  return [...String(svg).matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) =>
    m.slice(1).map((v, i) => (i < 2 ? (Number(v) - 1) / u : Number(v) / u))
  );
}

// The lengths [a, b, c] (sorted) of the box a net of rectangles folds into, or null when it does not fold:
// faces touch along whole edges only, a die rolled over the net lies on 6 different faces, and each axis of
// the box gets one length (opposite faces alike). Tracks only which box axis lies along the net's x and y.
function foldBox(R) {
  if (R.length !== 6) return null;
  const links = R.map(() => []);
  for (let i = 0; i < 6; i++)
    for (let j = 0; j < 6; j++) {
      if (i === j) continue;
      const [a, b] = [R[i], R[j]];
      const ox = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]);
      const oy = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
      if (ox > 0 && oy > 0) return null; // overlap
      if (ox === 0 && oy > 0) {
        if (a[1] !== b[1] || a[3] !== b[3]) return null; // a face that does not fit its neighbour
        links[i].push([j, b[0] > a[0] ? 'E' : 'W']);
      } else if (oy === 0 && ox > 0) {
        if (a[0] !== b[0] || a[2] !== b[2]) return null;
        links[i].push([j, b[1] > a[1] ? 'S' : 'N']);
      }
    }
  // die faces as in rollNet; axes: which box axis (0, 1, 2) is along the net's x / y, and the normal
  const got = new Array(6);
  const dims = [null, null, null];
  let ok = true;
  const set = (axis, len) => {
    if (dims[axis] == null) dims[axis] = len;
    else if (dims[axis] !== len) ok = false;
  };
  const walk = (i, die, [an, ax, ay]) => {
    got[i] = die[0];
    set(ax, R[i][2]);
    set(ay, R[i][3]);
    const [B, T, N, S, E, W] = die;
    for (const [j, dir] of links[i]) {
      if (got[j] != null) continue;
      if (dir === 'E') walk(j, [E, W, N, S, T, B], [ax, an, ay]);
      if (dir === 'W') walk(j, [W, E, N, S, B, T], [ax, an, ay]);
      if (dir === 'S') walk(j, [S, N, B, T, E, W], [ay, ax, an]);
      if (dir === 'N') walk(j, [N, S, T, B, E, W], [ay, ax, an]);
    }
  };
  walk(0, [0, 1, 2, 3, 4, 5], [2, 0, 1]);
  if (!ok || got.includes(undefined) || new Set(got).size !== 6) return null;
  return [...dims].sort((a, b) => a - b);
}

const CUBE_CHECKS = {
  compterCubes: (e) => {
    const H = readStack(e.body);
    if (typeof H === 'string') return H;
    const n = H.flat().reduce((s, v) => s + v, 0);
    const out = [];
    const hid = hiddenColumn(H);
    if (hid) out.push(hid);
    if (String(e.answers[0]) !== String(n)) out.push(`${n} cubes, declared ${e.answers[0]}`);
    if (!/\?__cubes/.test(e.operation)) out.push(`operation « ${e.operation} »`);
    return out.length ? out.join('; ') : null;
  },
  vueCubes: (e) => {
    const H = readStack(e.body);
    if (typeof H === 'string') return H;
    const m = String(e.title).match(/vue <strong>(de face|de dessus|de droite)<\/strong>/);
    if (!m) return `no view in « ${e.title} »`;
    const want = norm(viewOf(H, VIEW_NAMES[m[1]]));
    const tiles = e.tiles.map((t) => readSquares(t));
    if (tiles.some((t) => !t)) return 'a tile is not a grid of squares';
    const keys = tiles.map((t) => norm(t.map((q) => [q.c, q.r])));
    const right = keys.map((k, i) => (k === want ? i : -1)).filter((i) => i >= 0);
    const out = [];
    if (String(right) !== String([...e.tileAnswers].sort((a, b) => a - b)))
      out.push(`the view ${m[1]} is tile [${right}], declared [${e.tileAnswers}]`);
    if (new Set(keys).size !== keys.length) out.push('two tiles show the same squares');
    const hid = hiddenColumn(H);
    if (hid) out.push(hid);
    return out.length ? out.join('; ') : null;
  },
  patronsCube: (e) => {
    if (!/patrons de cube/.test(e.title)) return `title « ${e.title} »`;
    const tiles = e.tiles.map((t) => readSquares(t));
    if (tiles.some((t) => !t || t.length !== 6)) return 'a tile is not 6 squares';
    const want = tiles.map((t, i) => (foldsToCube(t.map((q) => [q.c, q.r])) ? i : -1)).filter((i) => i >= 0);
    const got = [...e.tileAnswers].sort((a, b) => a - b);
    const out = [];
    if (String(want) !== String(got)) out.push(`nets are [${want}], declared [${got}]`);
    if (!want.length) out.push('no net among the tiles');
    if (want.length === tiles.length) out.push('every tile is a net');
    return out.length ? out.join('; ') : null;
  },
  patronsPave: (e) => {
    const H = readStack(e.body);
    if (typeof H === 'string') return H;
    const box = [H[0].length, H.length, H[0][0]].sort((a, b) => a - b);
    if (H.flat().some((h) => h !== H[0][0])) return 'the pavé is not a full block of cubes';
    if (!/patrons de ce pavé/.test(e.title)) return `title « ${e.title} »`;
    const folds = e.tiles.map((t) => {
      const R = readRects(t);
      const f = R && foldBox(R);
      return !!f && f.join() === box.join();
    });
    const want = folds.map((ok, i) => (ok ? i : -1)).filter((i) => i >= 0);
    const got = [...e.tileAnswers].sort((a, b) => a - b);
    if (String(want) !== String(got)) return `nets of ${box.join(' × ')} are [${want}], declared [${got}]`;
    if (!want.length || want.length === e.tiles.length) return 'no wrong tile, or no net';
    return null;
  },
  faceOpposee: (e) => {
    const svg = (String(e.body).match(SVG_RE) || [])[0];
    const sq = svg && readSquares(svg);
    if (!sq || sq.length !== 6 || sq.some((q) => !q.label)) return 'body is not a lettered net of 6 squares';
    const cells = sq.map((q) => [q.c, q.r]);
    if (!foldsToCube(cells)) return 'the net does not fold into a cube';
    const m = String(e.title).match(/en face de la face <strong>([A-F])<\/strong>/);
    if (!m) return `no face in « ${e.title} »`;
    const faces = rollNet(cells);
    const i = sq.findIndex((q) => q.label === m[1]);
    const opp = sq[faces.indexOf(OPP[faces[i]])].label;
    const declared = e.mcqChoices[e.mcqAnswer];
    if (declared !== opp) return `${opp} is opposite ${m[1]}, declared ${declared}`;
    if (e.mcqChoices.includes(m[1])) return 'the face asked is among the choices';
    return null;
  },
};

module.exports = { readStack, rollNet, foldsToCube, CUBE_CHECKS };
