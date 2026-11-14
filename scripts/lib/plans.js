/**
 * Plans (generators/plans.js) read back from the markup, apart from the generator, for gen-checks.js:
 *   town map: grid squares from the <rect>s (grey = road), column letters and row numbers from the
 *     labels around it, each emoji in the square under it, north up (an « N » arrow must be drawn);
 *   classroom: the board (« tableau »), the door 🚪 and the windows 🪟, an animal at each table;
 *     rangs counted from the board, columns from the door.
 */
const ROAD = '#cbd5e1';
const GRASS = '#dcfce7';
const EMOJI = /\p{Extended_Pictographic}/u;

const num = (s) => Number(s);
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]+)"`));
  return m ? m[1] : null;
};
const texts = (svg) =>
  [...String(svg).matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map((m) => ({
    x: num(attr(m[1], 'x')),
    y: num(attr(m[1], 'y')),
    t: m[2].trim(),
  }));
const emojisIn = (s) => [...String(s).matchAll(/\p{Extended_Pictographic}/gu)].map((m) => m[0]);
const svgOf = (html) => (String(html || '').match(/<svg\b[\s\S]*?<\/svg>/) || [null])[0];

// → { n, at: Map 'r,c' → emoji, road(r, c), name(r, c), cellOf(name), find(emoji) → [[r, c]…] } | { error }
function readTown(svg) {
  const rects = [...String(svg).matchAll(/<rect\b[^>]*>/g)].map((m) => ({
    x: num(attr(m[0], 'x')),
    y: num(attr(m[0], 'y')),
    w: num(attr(m[0], 'width')),
    fill: attr(m[0], 'fill'),
  }));
  const cells = rects.filter((r) => r.fill === ROAD || r.fill === GRASS);
  if (!cells.length) return { error: 'no map squares' };
  const c = cells[0].w;
  const [ox, oy] = [Math.min(...cells.map((r) => r.x)), Math.min(...cells.map((r) => r.y))];
  const n = Math.round(Math.sqrt(cells.length));
  if (n * n !== cells.length) return { error: `${cells.length} squares: not a square map` };
  const roads = new Set(cells.filter((r) => r.fill === ROAD).map((r) => `${(r.y - oy) / c},${(r.x - ox) / c}`));
  const T = texts(svg);
  const cols = {};
  const rows = {};
  for (const t of T) {
    if (/^[A-H]$/.test(t.t) && t.y < oy && t.x > ox && t.x < ox + n * c) cols[Math.floor((t.x - ox) / c)] = t.t;
    if (/^\d+$/.test(t.t) && t.x < ox) rows[Math.floor((t.y - oy) / c)] = t.t;
  }
  if (Object.keys(cols).length !== n || Object.keys(rows).length !== n) return { error: 'labels missing' };
  if (!T.some((t) => t.t === 'N' && t.x > ox + n * c) || !/<path\b/.test(svg)) return { error: 'no north arrow' };
  const at = new Map();
  for (const t of T)
    if (EMOJI.test(t.t) && t.x > ox && t.y > oy)
      at.set(`${Math.floor((t.y - oy) / c)},${Math.floor((t.x - ox) / c)}`, t.t);
  const name = (r, cc) => `${cols[cc]}${rows[r]}`;
  const cellOf = (s) => {
    const cc = Object.keys(cols).find((k) => cols[k] === s[0]);
    const r = Object.keys(rows).find((k) => rows[k] === s.slice(1));
    return cc === undefined || r === undefined ? null : [Number(r), Number(cc)];
  };
  const find = (e) => [...at].filter(([, v]) => v === e).map(([k]) => k.split(',').map(Number));
  return { n, at, road: (r, cc) => roads.has(`${r},${cc}`), name, cellOf, find };
}

// Road squares crossed on the shortest way from a to b (🚧 squares closed), or -1
function shortest(T, a, b) {
  const blocked = (r, c) => T.at.get(`${r},${c}`) === '🚧';
  const dist = new Map([[a.join(','), 0]]);
  const queue = [a];
  while (queue.length) {
    const [r, c] = queue.shift();
    for (const [dr, dc] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const [x, y] = [r + dr, c + dc];
      if (x < 0 || y < 0 || x >= T.n || y >= T.n || dist.has(`${x},${y}`)) continue;
      if (x === b[0] && y === b[1]) return dist.get(`${r},${c}`);
      if (!T.road(x, y) || blocked(x, y)) continue;
      dist.set(`${x},${y}`, dist.get(`${r},${c}`) + 1);
      queue.push([x, y]);
    }
  }
  return -1;
}

const MOVES = { nord: [-1, 0], sud: [1, 0], est: [0, 1], ouest: [0, -1] };

// The one choice that is true, as declared: [] or [problem]
const oneTrue = (e, isTrue) => {
  const truth = e.mcqChoices.map(isTrue);
  const k = truth.filter(Boolean).length;
  if (k !== 1) return [`${k} choices are true`];
  return truth.indexOf(true) === e.mcqAnswer ? [] : [`answer is ${truth.indexOf(true)}, declared ${e.mcqAnswer}`];
};

function checkTown(e) {
  const svg = svgOf(e.body);
  if (!svg) return 'no map';
  const T = readTown(svg);
  if (T.error) return T.error;
  const once = (x) => T.find(x).length === 1;
  const title = String(e.title || '');
  const out = [];
  // Every place named in a choice is on the map once
  for (const ch of e.mcqChoices || [])
    for (const x of emojisIn(ch)) if (!once(x)) out.push(`${x} drawn ${T.find(x).length} times`);
  let m;
  if ((m = title.match(/^Dans quelle case est .*?(\p{Extended_Pictographic})/u))) {
    if (!once(m[1])) return `${m[1]} drawn ${T.find(m[1]).length} times`;
    const [r, c] = T.find(m[1])[0];
    out.push(...oneTrue(e, (ch) => ch === T.name(r, c)));
  } else if ((m = title.match(/dans la case ([A-H]\d+)/))) {
    const cell = T.cellOf(m[1]);
    if (!cell) return `no square ${m[1]}`;
    const x = T.at.get(cell.join(','));
    if (!x) return `square ${m[1]} is empty`;
    out.push(...oneTrue(e, (ch) => emojisIn(ch).includes(x)));
  } else if (/par rapport (à|au) /.test(title)) {
    const [a, b] = emojisIn(title);
    if (!once(a) || !once(b)) return 'a place is not drawn once';
    const [[ra, ca]] = T.find(a);
    const [[rb, cb]] = T.find(b);
    if (ra !== rb && ca !== cb) return 'not in the same row or column: no single direction';
    const dir = ra === rb ? (ca > cb ? 'est' : 'ouest') : ra < rb ? 'nord' : 'sud';
    out.push(...oneTrue(e, (ch) => ch.replace(/^(au |à l’)/, '') === dir));
  } else if (
    (m = title.match(
      /^Pars d(?:e|u) .*?(\p{Extended_Pictographic})\. Avance de (\d+) cases? vers (?:le |l’)(\w+), puis de (\d+) cases? vers (?:le |l’)(\w+)\./u
    ))
  ) {
    if (!once(m[1])) return `${m[1]} not drawn once`;
    let [r, c] = T.find(m[1])[0];
    for (const [k, d] of [
      [m[2], m[3]],
      [m[4], m[5]],
    ]) {
      if (!MOVES[d]) return `direction « ${d} »`;
      r += MOVES[d][0] * Number(k);
      c += MOVES[d][1] * Number(k);
    }
    if (r < 0 || c < 0 || r >= T.n || c >= T.n) return 'the walk leaves the map';
    const x = T.at.get(`${r},${c}`);
    if (!x || !once(x)) return 'the walk ends on no single place';
    out.push(...oneTrue(e, (ch) => emojisIn(ch).includes(x)));
  } else if (/plus court/.test(String(e.body)) && /^\?__(m|cases)$/.test(String(e.operation))) {
    const p = (String(e.body).match(/<p>([\s\S]*?)<\/p>/) || ['', ''])[1];
    const [a, b] = emojisIn(p).filter((x) => x !== '🚧');
    if (!a || !b || !once(a) || !once(b)) return 'the two places are not drawn once';
    const len = shortest(T, T.find(a)[0], T.find(b)[0]);
    if (len < 0) return 'no way through the roads';
    const scale = (p.match(/mesure (\d+)(?:&nbsp;|\s)m\b/) || [])[1];
    if (/__m$/.test(e.operation) !== !!scale) return 'metres asked without a scale (or the reverse)';
    const want = String(scale ? len * Number(scale) : len);
    if (String(e.answers[0]) !== want) out.push(`shortest way ${want}, declared ${e.answers[0]}`);
  } else return `unknown question « ${title} »`;
  return out.length ? out.join('; ') : null;
}

const RANGS = { '1er': 0, '2e': 1, '3e': 2 };
const SIDES = { 'côté porte': 0, 'au milieu': 1, 'côté fenêtre': 2 };

function checkClass(e) {
  const svg = svgOf(e.body);
  if (!svg) return 'no plan';
  const T = texts(svg);
  const board = T.find((t) => t.t === 'tableau');
  const door = T.find((t) => t.t === '🚪');
  const windows = T.filter((t) => t.t === '🪟');
  if (!board || !door || !windows.length) return 'board, door or window missing';
  if (windows.some((w) => Math.sign(w.x - board.x) === Math.sign(door.x - board.x))) return 'a window on the door side';
  const kids = T.filter((t) => EMOJI.test(t.t) && t !== door && !windows.includes(t));
  if (kids.length !== 9 || new Set(kids.map((k) => k.t)).size !== 9) return `${kids.length} pupils, or two the same`;
  const ys = [...new Set(kids.map((k) => k.y))].sort((a, b) => Math.abs(a - board.y) - Math.abs(b - board.y));
  const xs = [...new Set(kids.map((k) => k.x))].sort((a, b) => Math.abs(a - door.x) - Math.abs(b - door.x));
  if (ys.length !== 3 || xs.length !== 3) return 'not 3 rangs of 3 tables';
  const seat = (k) => [ys.indexOf(k.y), xs.indexOf(k.x)];
  const who = (i, j) => kids.find((k) => ys.indexOf(k.y) === i && xs.indexOf(k.x) === j).t;
  const title = String(e.title || '');
  let m;
  let out;
  if ((m = title.match(/^Qui est assis au (1er|2e|3e) rang, (côté porte|au milieu|côté fenêtre) \?/))) {
    const x = who(RANGS[m[1]], SIDES[m[2]]);
    out = oneTrue(e, (ch) => ch === x);
  } else if ((m = title.match(/^Où est assis (\S+) \?/))) {
    const k = kids.find((t) => t.t === m[1]);
    if (!k) return `${m[1]} not in the class`;
    const [i, j] = seat(k);
    out = oneTrue(e, (ch) => {
      const p = ch.match(/^au (1er|2e|3e) rang, (.+)$/);
      return !!p && RANGS[p[1]] === i && SIDES[p[2]] === j;
    });
  } else if ((m = title.match(/^Qui est assis juste (derrière|devant) (\S+) \?/))) {
    const k = kids.find((t) => t.t === m[2]);
    if (!k) return `${m[2]} not in the class`;
    const [i, j] = seat(k);
    const r = i + (m[1] === 'derrière' ? 1 : -1);
    if (r < 0 || r > 2) return `nobody ${m[1]} ${m[2]}`;
    out = oneTrue(e, (ch) => ch === who(r, j));
  } else return `unknown question « ${title} »`;
  return out.length ? out.join('; ') : null;
}

const PLAN_CHECKS = { planVille: checkTown, planClasse: checkClass };

module.exports = { PLAN_CHECKS };
