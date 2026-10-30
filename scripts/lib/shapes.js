/**
 * Plane shapes and angles drawn as SVG (trouverFormes, trouverAngles / comparerAngles / rangerAngles) — read back from the markup and named from their
 * geometry alone (side lengths, angles, parallel sides), apart from the generator, for gen-checks.js
 * and validate-llm.js. Shapes may be turned: nothing here depends on a side being horizontal.
 */
const SIDE = 0.02; // sides within 2 % count as equal (points are rounded to 0.1 px)
const RIGHT = 1.5; // degrees from 90 that still count as a right angle
// Closer than this to a square / a right angle, a shape that is not one still looks like one
const NEAR_RATIO = 1.15;
const NEAR_ANGLE = 6;

const num = (s) => Number(String(s).trim());

// SVG markup → { kind: 'polygon', pts } | { kind: 'circle' } | { kind: 'ellipse', ratio } | null
function readShape(svg) {
  const s = String(svg || '');
  let m = s.match(/<polygon\b[^>]*\spoints="([^"]+)"/);
  if (m) {
    const pts = m[1]
      .trim()
      .split(/\s+/)
      .map((p) => p.split(',').map(num));
    return pts.every((p) => p.length === 2 && p.every(Number.isFinite)) ? { kind: 'polygon', pts } : null;
  }
  if (/<circle\b/.test(s)) return { kind: 'circle' };
  m = s.match(/<ellipse\b[^>]*\srx="([\d.]+)"[^>]*\sry="([\d.]+)"/);
  if (m) {
    const [a, b] = [num(m[1]), num(m[2])];
    return { kind: 'ellipse', ratio: Math.max(a, b) / Math.min(a, b) };
  }
  return null;
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (v) => Math.hypot(v[0], v[1]);
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
// Interior angle at each vertex, in degrees
const angles = (pts) =>
  pts.map((p, i) => {
    const u = sub(pts[(i + pts.length - 1) % pts.length], p);
    const v = sub(pts[(i + 1) % pts.length], p);
    return (Math.acos((u[0] * v[0] + u[1] * v[1]) / (len(u) * len(v))) * 180) / Math.PI;
  });
const sides = (pts) => pts.map((p, i) => len(sub(pts[(i + 1) % pts.length], p)));
const parallel = (a, b) => Math.abs(cross(a, b)) / (len(a) * len(b)) < Math.sin((RIGHT * Math.PI) / 180);
const convex = (pts) => {
  const signs = pts.map((p, i) =>
    Math.sign(cross(sub(pts[(i + 1) % pts.length], p), sub(pts[(i + 2) % pts.length], pts[(i + 1) % pts.length])))
  );
  return signs.every((x) => x === signs[0] && x !== 0);
};

// → { names: Set of what the shape is ('carre', 'rectangle', 'losange', …), unclear: [reasons] }
function shapeNames(shape) {
  const names = new Set();
  const unclear = [];
  if (!shape) return { names, unclear: ['no shape in the tile'] };
  if (shape.kind === 'circle') names.add('disque');
  if (shape.kind === 'ellipse') {
    if (shape.ratio < 1 + SIDE) names.add('disque');
    else if (shape.ratio < 1.25) unclear.push('ellipse almost a circle');
    else names.add('ovale');
  }
  if (shape.kind !== 'polygon') return { names, unclear };
  const { pts } = shape;
  if (!convex(pts)) return { names, unclear: ['polygon is not convex'] };
  const a = angles(pts);
  const s = sides(pts);
  const isRight = (x) => Math.abs(x - 90) < RIGHT;
  const nearRight = (x) => !isRight(x) && Math.abs(x - 90) < NEAR_ANGLE;
  const ratio = (x, y) => Math.max(x, y) / Math.min(x, y);
  if (Math.min(...a) < 15) unclear.push(`angle of ${Math.min(...a).toFixed(0)}°: too flat`);
  if (pts.length === 3) {
    names.add('triangle');
    if (a.some(isRight)) names.add('triangleRectangle');
    if (a.some(nearRight)) unclear.push('triangle almost right');
  } else if (pts.length === 4) {
    names.add('quadrilatere');
    const edge = (i) => sub(pts[(i + 1) % 4], pts[i]);
    const pairs = [parallel(edge(0), edge(2)), parallel(edge(1), edge(3))];
    const right = a.every(isRight);
    const equal = ratio(Math.max(...s), Math.min(...s)) < 1 + SIDE;
    if (right) names.add('rectangle');
    if (equal) names.add('losange');
    if (right && equal) names.add('carre');
    if (pairs[0] && pairs[1]) names.add('parallelogramme');
    if (pairs[0] !== pairs[1]) names.add('trapeze');
    if (right && !equal && ratio(s[0], s[1]) < NEAR_RATIO) unclear.push('rectangle almost a square');
    if (!right && a.every((x) => Math.abs(x - 90) < NEAR_ANGLE)) unclear.push('almost a rectangle');
    if (!equal && ratio(Math.max(...s), Math.min(...s)) < 1.08) unclear.push('sides almost equal');
  } else if (pts.length === 5 || pts.length === 6) {
    const regular = ratio(Math.max(...s), Math.min(...s)) < 1 + SIDE;
    if (regular) names.add(pts.length === 5 ? 'pentagone' : 'hexagone');
    else unclear.push('polygon not regular');
  } else unclear.push(`${pts.length} sides`);
  return { names, unclear };
}

// Turned: no side within 12° of horizontal or vertical (a square on its tip, a triangle on a corner)
function turned(shape) {
  if (!shape || shape.kind !== 'polygon') return false;
  return shape.pts.every((p, i) => {
    const [dx, dy] = sub(shape.pts[(i + 1) % shape.pts.length], p);
    const t = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 90;
    return Math.min(t, 90 - t) >= 12;
  });
}

// Angle drawing: polyline end–vertex–end, plus the arc path from the vertex →
// { deg, arms: [px, px], turned (both arms ≥ 12° off the axes), arcOk (the arc starts on both arms) } | null
function readAngle(svg) {
  const s = String(svg || '');
  const m = s.match(/<polyline\b[^>]*\spoints="([^"]+)"/);
  if (!m) return null;
  const pts = m[1]
    .trim()
    .split(/\s+/)
    .map((p) => p.split(',').map(num));
  if (pts.length !== 3 || !pts.every((p) => p.length === 2 && p.every(Number.isFinite))) return null;
  const [a, v, b] = pts;
  const [u, w] = [sub(a, v), sub(b, v)];
  const deg = (Math.acos((u[0] * w[0] + u[1] * w[1]) / (len(u) * len(w))) * 180) / Math.PI;
  const offAxis = (d) => {
    const t = ((Math.atan2(d[1], d[0]) * 180) / Math.PI + 360) % 90;
    return Math.min(t, 90 - t) >= 12;
  };
  // Arc « M v L p A … q Z »: p on the first arm, q on the second
  const arc = s.match(/<path\b[^>]*\sd="M([\d.]+),([\d.]+) L([\d.]+),([\d.]+) A[^"]*? ([\d.]+),([\d.]+) Z"/);
  const onArm = (p, d) => Math.abs(cross(sub(p, v), d)) / (len(sub(p, v)) * len(d)) < 0.02;
  const arcOk =
    !!arc &&
    num(arc[1]) === v[0] &&
    num(arc[2]) === v[1] &&
    onArm([num(arc[3]), num(arc[4])], u) &&
    onArm([num(arc[5]), num(arc[6])], w);
  return { deg, arms: [len(u), len(w)], turned: offAxis(u) && offAxis(w), arcOk };
}

// → { kind: 'aigu' | 'droit' | 'obtus' | null, unclear: [reasons] }
function angleKind(deg) {
  if (deg < 20) return { kind: null, unclear: [`angle of ${deg.toFixed(0)}°: too closed`] };
  if (deg > 170) return { kind: null, unclear: [`angle of ${deg.toFixed(0)}°: almost flat`] };
  if (Math.abs(deg - 90) < RIGHT) return { kind: 'droit', unclear: [] };
  if (Math.abs(deg - 90) < 12) return { kind: null, unclear: [`angle of ${deg.toFixed(0)}°: almost right`] };
  return { kind: deg < 90 ? 'aigu' : 'obtus', unclear: [] };
}

// Plural words of the instruction → shape name
const TARGETS = [
  [/triangles? rectangles?/, 'triangleRectangle'],
  [/carrés?/, 'carre'],
  [/rectangles?/, 'rectangle'],
  [/losanges?/, 'losange'],
  [/triangles?/, 'triangle'],
  [/disques?|ronds?/, 'disque'],
];
const targetOf = (text) => {
  const t = String(text || '').toLowerCase();
  for (const [re, name] of TARGETS) if (re.test(t)) return name;
  return null;
};

module.exports = { readShape, shapeNames, sides, angles, turned, targetOf, readAngle, angleKind };
