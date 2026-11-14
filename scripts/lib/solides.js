/**
 * Solids drawn in perspective cavalière (generators/solides.js) — read back from the markup and named
 * from what is drawn, apart from the generator, for gen-checks.js:
 *   polyhedra: every edge is a <line> (hidden ones dashed) → vertices = distinct ends, faces by Euler
 *     (F = E − V + 2); a box is a cube when its three edge lengths are equal (depth edges are drawn at
 *     45°, half their length — the cavalière convention), a pavé when they clearly differ;
 *   curved: a <circle> is a ball; two solid lines with a common end a cone, two parallel ones a cylinder.
 */
const num = (s) => Number(s);
const near = (a, b, tol = 0.6) => Math.abs(a - b) <= tol;

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]+)"`));
  return m ? num(m[1]) : NaN;
};

function readLines(svg) {
  return (String(svg).match(/<line\b[^>]*>/g) || []).map((t) => ({
    a: [attr(t, 'x1'), attr(t, 'y1')],
    b: [attr(t, 'x2'), attr(t, 'y2')],
    dashed: /stroke-dasharray/.test(t),
  }));
}

// → { kind, V, E, F, dashed, unclear: [] } or { kind: null, unclear: [reason] }
function readSolid(svg) {
  const s = String(svg || '');
  const lines = readLines(s);
  const unclear = [];
  if (lines.some((l) => [...l.a, ...l.b].some((v) => !Number.isFinite(v))))
    return { kind: null, unclear: ['bad line'] };
  if (/<circle\b/.test(s))
    return lines.length ? { kind: null, unclear: ['a circle with lines'] } : { kind: 'boule', unclear };
  const solid = lines.filter((l) => !l.dashed);
  if (lines.length === 2 && solid.length === 2) {
    const [p, q] = solid;
    const ends = [p.a, p.b].flatMap((u) => [q.a, q.b].map((v) => near(u[0], v[0]) && near(u[1], v[1])));
    if (ends.some(Boolean))
      return /<path\b[^>]*\sA/.test(s) || /\sA\d/.test(s)
        ? { kind: 'cone', unclear }
        : { kind: null, unclear: ['no base'] };
    const dir = (l) => [l.b[0] - l.a[0], l.b[1] - l.a[1]];
    const [u, v] = [dir(p), dir(q)];
    const parallel = Math.abs(u[0] * v[1] - u[1] * v[0]) < 0.01 * Math.hypot(...u) * Math.hypot(...v);
    if (parallel && near(Math.hypot(...u), Math.hypot(...v)) && /<ellipse\b/.test(s))
      return { kind: 'cylindre', unclear };
    return { kind: null, unclear: ['two lines, neither a cone nor a cylinder'] };
  }
  // Polyhedron
  const V = [];
  for (const l of lines)
    for (const p of [l.a, l.b]) if (!V.some((w) => near(w[0], p[0], 0.3) && near(w[1], p[1], 0.3))) V.push(p);
  const E = lines.length;
  const F = E - V.length + 2;
  const dashed = lines.filter((l) => l.dashed).length;
  const sig = `${V.length},${E},${F}`;
  let kind = { '8,12,6': 'box', '5,8,5': 'pyramide', '6,9,5': 'prisme' }[sig] || null;
  if (!kind) return { kind: null, unclear: [`${V.length} vertices, ${E} edges: no known solid`] };
  if (kind === 'box') {
    // true length of each edge: horizontal, vertical, or depth (drawn at 45°, half length)
    const groups = { h: [], v: [], d: [] };
    for (const l of lines) {
      const [dx, dy] = [Math.abs(l.b[0] - l.a[0]), Math.abs(l.b[1] - l.a[1])];
      if (dy < 0.3) groups.h.push(dx);
      else if (dx < 0.3) groups.v.push(dy);
      else if (near(dx, dy, 0.4)) groups.d.push(Math.hypot(dx, dy) / 0.5);
      else return { kind: null, unclear: ['an edge is neither horizontal, vertical nor at 45°'] };
    }
    if (Object.values(groups).some((g) => g.length !== 4))
      return { kind: null, unclear: ['not 4 edges per direction'] };
    const L = Object.values(groups).map((g) => g.reduce((a, b) => a + b, 0) / 4);
    const [lo, mid, hi] = [...L].sort((a, b) => a - b);
    if (hi / lo < 1.03) kind = 'cube';
    else if (mid / lo >= 1.2 && hi / mid >= 1.2) kind = 'pave';
    else
      return {
        kind: null,
        unclear: [`edges ${L.map((x) => x.toFixed(0)).join(' / ')}: neither a cube nor a clear pavé`],
      };
  }
  return { kind, V: V.length, E, F, dashed, unclear };
}

const SOLID_NAMES = {
  cube: 'un cube',
  pave: 'un pavé droit',
  pyramide: 'une pyramide',
  prisme: 'un prisme',
  cylindre: 'un cylindre',
  cone: 'un cône',
  boule: 'une boule',
};
const PLURALS = {
  cubes: 'cube',
  'pavés droits': 'pave',
  pyramides: 'pyramide',
  prismes: 'prisme',
  cylindres: 'cylindre',
  cônes: 'cone',
  boules: 'boule',
};
const FACES_OF = {
  cube: '6 carrés',
  pave: '6 rectangles',
  pyramide: '1 carré et 4 triangles',
  prisme: '2 triangles et 3 rectangles',
};
// The checker's own table of objects (not the generator's)
const OBJECT_OF = {
  '🎲': 'cube',
  '🧊': 'cube',
  '📦': 'pave',
  '🧱': 'pave',
  '⛺': 'prisme',
  '🧀': 'prisme',
  '🥫': 'cylindre',
  '🪵': 'cylindre',
  '🥁': 'cylindre',
  '🧻': 'cylindre',
  '🍦': 'cone',
  '🥕': 'cone',
  '⚽': 'boule',
  '🏀': 'boule',
  '🌍': 'boule',
  '🍊': 'boule',
};

const svgsOf = (html) => String(html || '').match(/<svg\b[\s\S]*?<\/svg>/g) || [];

const SOLID_CHECKS = {
  trouverSolides: (e) => {
    const m = String(e.title).match(/<strong>([^<]+)<\/strong>/);
    const target = m && PLURALS[m[1]];
    if (!target) return `no solid in « ${e.title} »`;
    const out = [];
    const read = e.tiles.map(readSolid);
    read.forEach((r, i) => r.unclear.forEach((u) => out.push(`tile ${i}: ${u}`)));
    const want = read.map((r, i) => (r.kind === target ? i : -1)).filter((i) => i >= 0);
    const got = [...e.tileAnswers].sort((a, b) => a - b);
    if (String(want) !== String(got)) out.push(`${target} tiles are [${want}], declared [${got}]`);
    if (target === 'pave' && read.some((r) => r.kind === 'cube')) out.push('a cube (also a pavé) among the pavés');
    if (new Set(e.tiles).size !== e.tiles.length) out.push('two tiles are the same');
    return out.length ? out.join('; ') : null;
  },
  compterSolide: (e) => {
    const pics = svgsOf(e.body);
    if (pics.length !== 1) return `${pics.length} drawings in the body`;
    const r = readSolid(pics[0]);
    if (!r.kind || r.unclear.length) return r.unclear.join('; ') || 'not a solid';
    if (!r.dashed) return 'no hidden edge drawn: the count cannot be seen';
    const m = String(e.operation).match(/\?__(faces|sommets|arêtes)\.$/);
    if (!m) return `operation « ${e.operation} »`;
    const want = { faces: r.F, sommets: r.V, arêtes: r.E }[m[1]];
    return String(e.answers[0]) === String(want) ? null : `${m[1]}: ${want}, declared ${e.answers[0]}`;
  },
  nommerSolide: (e) => {
    const choices = e.mcqChoices;
    if (new Set(choices).size !== choices.length) return 'two choices are the same';
    if (/ressemble à/.test(e.title)) {
      const emoji = Object.keys(OBJECT_OF).find((k) => String(e.title).includes(k));
      if (!emoji) return `no known object in « ${e.title} »`;
      const kinds = choices.map((c) => readSolid(c).kind);
      if (kinds.some((k) => !k)) return 'a choice is not a solid drawing';
      const want = kinds.filter((k) => k === OBJECT_OF[emoji]).length === 1 ? kinds.indexOf(OBJECT_OF[emoji]) : -1;
      if (want < 0) return `${OBJECT_OF[emoji]} drawn ${kinds.filter((k) => k === OBJECT_OF[emoji]).length} times`;
      return e.mcqAnswer === want ? null : `${emoji} is ${OBJECT_OF[emoji]}, choice ${want}; declared ${e.mcqAnswer}`;
    }
    const pics = svgsOf(e.body);
    if (pics.length !== 1) return `${pics.length} drawings in the body`;
    const r = readSolid(pics[0]);
    if (!r.kind || r.unclear.length) return r.unclear.join('; ') || 'not a solid';
    const right = /faces/.test(e.title) ? FACES_OF[r.kind] : SOLID_NAMES[r.kind];
    if (!right) return `no answer for ${r.kind} in « ${e.title} »`;
    if (/faces/.test(e.title) && r.kind === 'cube' && choices.includes('6 rectangles'))
      return '« 6 rectangles » is also true for a cube';
    const want = choices.indexOf(right);
    if (want < 0) return `« ${right} » is not among the choices`;
    return e.mcqAnswer === want ? null : `${r.kind}: choice ${want}, declared ${e.mcqAnswer}`;
  },
};

module.exports = { SOLID_CHECKS };
