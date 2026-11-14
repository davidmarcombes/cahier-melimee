/**
 * Drawn geometry of generators/espace.js — read back from the markup, apart from the generator, for
 * gen-checks.js: two lines (parallel / perpendicular / sécantes), a circle with lettered points and
 * segments (centre, rayon, diamètre, corde), a polygon on squared paper reflected across the drawn axis,
 * animals on shelves (who is right of / above / between).
 */
const num = (s) => Number(s);
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]+)"`));
  return m ? num(m[1]) : NaN;
};
const lineTags = (svg) => String(svg).match(/<line\b[^>]*>/g) || [];
const ends = (t) => [
  [attr(t, 'x1'), attr(t, 'y1')],
  [attr(t, 'x2'), attr(t, 'y2')],
];
const svgsOf = (html) => String(html || '').match(/<svg\b[\s\S]*?<\/svg>/g) || [];
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

// ─── Two lines ───────────────────────────────────────────────────────────────
// → { kind: 'paralleles' | 'perpendiculaires' | 'secantes', deg, offAxis } (deg: 0–90 between them)
function readLinePair(svg) {
  const tags = lineTags(svg);
  if (tags.length !== 2) return null;
  const dirs = tags.map((t) => {
    const [a, b] = ends(t);
    return Math.atan2(b[1] - a[1], b[0] - a[0]) * (180 / Math.PI);
  });
  let deg = Math.abs(dirs[0] - dirs[1]) % 180;
  if (deg > 90) deg = 180 - deg;
  const axisGap = (t) => {
    const x = ((t % 90) + 90) % 90;
    return Math.min(x, 90 - x);
  };
  const kind = deg < 0.5 ? 'paralleles' : Math.abs(deg - 90) < 0.5 ? 'perpendiculaires' : 'secantes';
  return { kind, deg, offAxis: dirs.every((t) => axisGap(t) >= 14) };
}
// Sécantes drawn clearly apart from both other kinds, unless near (a trap on purpose)
const lineUnclear = (p, near) => {
  if (p.kind !== 'secantes') return null;
  if (near) return p.deg < 5 || p.deg > 85 ? `sécantes at ${p.deg.toFixed(1)}°: too close to call` : null;
  return p.deg < 20 || p.deg > 70 ? `sécantes at ${p.deg.toFixed(1)}° look parallel or perpendicular` : null;
};

// ─── Circle ──────────────────────────────────────────────────────────────────
function readCircle(svg) {
  const s = String(svg);
  const circles = (s.match(/<circle\b[^>]*>/g) || []).map((t) => ({
    c: [attr(t, 'cx'), attr(t, 'cy')],
    r: attr(t, 'r'),
  }));
  const big = circles.filter((c) => c.r > 10);
  if (big.length !== 1) return { error: `${big.length} circles drawn` };
  const points = circles.filter((c) => c.r <= 3).map((c) => c.c);
  const labels = [...s.matchAll(/<text\b([^>]*)>([^<]+)<\/text>/g)].map((m) => ({
    at: [attr(m[1], 'x'), attr(m[1], 'y') - 3],
    name: m[2].trim(),
  }));
  const named = {};
  for (const l of labels) {
    const d = points.map((p) => dist(p, l.at)).sort((a, b) => a - b);
    const i = points.findIndex((p) => dist(p, l.at) === d[0]);
    if (d[0] > 12 || (d.length > 1 && d[1] - d[0] < 3)) return { error: `label ${l.name} is not clearly at one point` };
    if (named[l.name]) return { error: `two points named ${l.name}` };
    named[l.name] = points[i];
  }
  const segs = lineTags(s).map(ends);
  return { centre: big[0].c, r: big[0].r, named, segs };
}
// What segment [XY] is, from its two points: rayon, diametre, corde, or other — null if not drawn
function segmentKind(circ, name) {
  const m = String(name).match(/^\[([A-Z])([A-Z])\]$/);
  if (!m) return null;
  const [P, Q] = [circ.named[m[1]], circ.named[m[2]]];
  if (!P || !Q) return null;
  const drawn = circ.segs.some(
    ([a, b]) => (dist(a, P) < 0.5 && dist(b, Q) < 0.5) || (dist(a, Q) < 0.5 && dist(b, P) < 0.5)
  );
  if (!drawn) return null;
  const onC = (p) => Math.abs(dist(p, circ.centre) - circ.r) < 0.6;
  const atO = (p) => dist(p, circ.centre) < 0.6;
  if ((atO(P) && onC(Q)) || (atO(Q) && onC(P))) return 'rayon';
  if (onC(P) && onC(Q)) return dist([(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2], circ.centre) < 0.6 ? 'diametre' : 'corde';
  return 'autre';
}

// ─── Axis of symmetry on squared paper ───────────────────────────────────────
function readAxisTile(svg) {
  const s = String(svg);
  const pm = s.match(/<polygon\b[^>]*\spoints="([^"]+)"/);
  const axes = lineTags(s).filter((t) => /stroke-dasharray/.test(t));
  if (!pm || axes.length !== 1) return null;
  const pts = pm[1]
    .trim()
    .split(/\s+/)
    .map((p) => p.split(',').map(num));
  const [a, b] = ends(axes[0]);
  const d = [b[0] - a[0], b[1] - a[1]];
  const refl = (p) => {
    const q = [p[0] - a[0], p[1] - a[1]];
    const k = (2 * (q[0] * d[0] + q[1] * d[1])) / (d[0] * d[0] + d[1] * d[1]);
    return [a[0] + k * d[0] - q[0], a[1] + k * d[1] - q[1]];
  };
  // corners only (a corner in the middle of a straight side is not one)
  const corners = (P) =>
    P.filter((p, i) => {
      const u = P[(i + P.length - 1) % P.length];
      const v = P[(i + 1) % P.length];
      return Math.abs((p[0] - u[0]) * (v[1] - p[1]) - (p[1] - u[1]) * (v[0] - p[0])) > 0.5;
    });
  const C = corners(pts);
  const key = (p) => `${Math.round(p[0])},${Math.round(p[1])}`;
  const set = new Set(C.map(key));
  const symmetric = C.map(refl).every((p) => set.has(key(p)) && p.every((v) => Math.abs(v - Math.round(v)) < 0.3));
  const onGrid = pts.every((p) => p.every((v) => Math.abs(((v - 5) / 10) % 1) < 0.01));
  return { symmetric, onGrid, corners: C.length };
}

// ─── Animals on shelves ──────────────────────────────────────────────────────
function readShelves(svg) {
  const items = [...String(svg).matchAll(/<text\b([^>]*)>([^<]+)<\/text>/g)].map((m) => ({
    x: attr(m[1], 'x'),
    y: attr(m[1], 'y'),
    a: m[2].trim(),
  }));
  const ys = [...new Set(items.map((i) => i.y))].sort((p, q) => p - q);
  const xs = [...new Set(items.map((i) => i.x))].sort((p, q) => p - q);
  const pos = {};
  for (const i of items) pos[i.a] = [ys.indexOf(i.y), xs.indexOf(i.x)];
  const at = {};
  for (const [a, [r, c]] of Object.entries(pos)) at[`${r},${c}`] = a;
  return { pos, at, n: items.length, distinct: Object.keys(pos).length };
}

const SPACE_CHECKS = {
  droitesPositions: (e, params = {}) => {
    const out = [];
    if (e.type === 'mcq') {
      const pics = svgsOf(e.body);
      const p = pics.length === 1 && readLinePair(pics[0]);
      if (!p) return 'body is not one pair of lines';
      const u = lineUnclear(p, params.near);
      if (u) out.push(u);
      const choices = ['parallèles', 'perpendiculaires', 'sécantes, mais pas perpendiculaires'];
      if (String(e.mcqChoices) !== String(choices)) out.push(`choices ${e.mcqChoices.join(' / ')}`);
      const want = { paralleles: 0, perpendiculaires: 1, secantes: 2 }[p.kind];
      if (e.mcqAnswer !== want) out.push(`${p.kind} (${p.deg.toFixed(1)}°): choice ${want}, declared ${e.mcqAnswer}`);
      return out.length ? out.join('; ') : null;
    }
    const m = String(e.title).match(/<strong>(parallèles|perpendiculaires)<\/strong>/);
    if (!m) return `no target in « ${e.title} »`;
    const target = m[1] === 'parallèles' ? 'paralleles' : 'perpendiculaires';
    const pairs = e.tiles.map(readLinePair);
    if (pairs.some((p) => !p)) return 'a tile is not two lines';
    pairs.forEach((p, i) => {
      const u = lineUnclear(p, params.near);
      if (u) out.push(`tile ${i}: ${u}`);
    });
    const want = pairs.map((p, i) => (p.kind === target ? i : -1)).filter((i) => i >= 0);
    const got = [...e.tileAnswers].sort((a, b) => a - b);
    if (String(want) !== String(got)) out.push(`${target} tiles are [${want}], declared [${got}]`);
    if (!want.some((i) => pairs[i].offAxis)) out.push('no answer has both lines off the axes');
    if (new Set(e.tiles).size !== e.tiles.length) out.push('two tiles are the same');
    return out.length ? out.join('; ') : null;
  },
  cercleVocabulaire: (e) => {
    const pics = svgsOf(e.body);
    if (pics.length !== 1) return `${pics.length} drawings in the body`;
    const circ = readCircle(pics[0]);
    if (circ.error) return circ.error;
    if (new Set(e.mcqChoices).size !== e.mcqChoices.length) return 'two choices are the same';
    let want;
    if (/centre/.test(e.title)) {
      const at = Object.entries(circ.named).filter(([, p]) => dist(p, circ.centre) < 0.6);
      if (at.length !== 1) return `${at.length} points at the centre`;
      want = [e.mcqChoices.indexOf(at[0][0])];
    } else {
      const m = String(e.title).match(/<strong>(rayon|diamètre|corde)<\/strong>/);
      if (!m) return `no word in « ${e.title} »`;
      const ask = { rayon: 'rayon', diamètre: 'diametre', corde: 'corde' }[m[1]];
      const kinds = e.mcqChoices.map((c) => segmentKind(circ, c));
      if (kinds.some((k) => !k)) return `a choice is not a drawn segment: ${e.mcqChoices.join(' ')}`;
      // a diameter is a chord too: the title must rule it out when it is offered
      if (ask === 'corde' && kinds.includes('diametre') && !/pas un diamètre/.test(e.title))
        return 'a diameter is offered, and it is a chord too';
      want = kinds.map((k, i) => (k === ask ? i : -1)).filter((i) => i >= 0);
    }
    if (want.length !== 1 || want[0] < 0) return `${want.length} right choices`;
    return e.mcqAnswer === want[0] ? null : `choice ${want[0]}, declared ${e.mcqAnswer}`;
  },
  axeSymetrie: (e) => {
    if (!/axe de symétrie/.test(e.title)) return `title « ${e.title} »`;
    const tiles = e.tiles.map(readAxisTile);
    if (tiles.some((t) => !t)) return 'a tile is not a figure with one axis';
    const out = [];
    tiles.forEach((t, i) => {
      if (!t.onGrid) out.push(`tile ${i}: corners off the grid`);
    });
    const want = tiles.map((t, i) => (t.symmetric ? i : -1)).filter((i) => i >= 0);
    const got = [...e.tileAnswers].sort((a, b) => a - b);
    if (String(want) !== String(got)) out.push(`symmetric tiles are [${want}], declared [${got}]`);
    if (new Set(e.tiles).size !== e.tiles.length) out.push('two tiles are the same');
    return out.length ? out.join('; ') : null;
  },
  positionsEspace: (e) => {
    const pics = svgsOf(e.body);
    if (pics.length !== 1) return `${pics.length} drawings in the body`;
    const sh = readShelves(pics[0]);
    if (sh.distinct !== sh.n) return 'an animal is drawn twice';
    const inTitle = Object.keys(sh.pos).filter((a) => String(e.title).includes(a));
    let right;
    if (/entre/.test(e.title)) {
      if (inTitle.length !== 2) return `${inTitle.length} animals in « ${e.title} »`;
      const [p, q] = inTitle.map((a) => sh.pos[a]);
      if (p[0] !== q[0] || Math.abs(p[1] - q[1]) !== 2) return 'the two animals are not one apart on a shelf';
      right = sh.at[`${p[0]},${(p[1] + q[1]) / 2}`];
    } else {
      if (inTitle.length !== 1) return `${inTitle.length} animals in « ${e.title} »`;
      const [r, c] = sh.pos[inTitle[0]];
      const step = [
        [/à droite/, [0, 1]],
        [/à gauche/, [0, -1]],
        [/au-dessus/, [-1, 0]],
        [/au-dessous/, [1, 0]],
      ].find(([re]) => re.test(e.title));
      if (!step) return `no position in « ${e.title} »`;
      right = sh.at[`${r + step[1][0]},${c + step[1][1]}`];
    }
    if (!right) return 'nobody at that place';
    if (new Set(e.mcqChoices).size !== e.mcqChoices.length) return 'two choices are the same';
    const want = e.mcqChoices.indexOf(right);
    if (want < 0) return `${right} is not among the choices`;
    return e.mcqAnswer === want ? null : `${right} is choice ${want}, declared ${e.mcqAnswer}`;
  },
};

module.exports = { SPACE_CHECKS };
