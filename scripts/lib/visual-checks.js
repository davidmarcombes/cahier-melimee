/**
 * Visual exercises for the answer oracle (scripts/check-answers.js), tested by
 * tests/visual-checks.test.js. The answer is recomputed from what is DRAWN — the SVG the pupil
 * sees, rendered by the page's own drawing code (src/assets/js/svg.js) — never from the
 * generator's own numbers: emojis are counted in the picture, clock hands are read as angles,
 * coins and notes from their labels, ruler marks from the tick positions, shapes from their
 * corners. Drawing defects a pupil would trip on (objects on top of each other, cut off by the
 * frame, a mark between graduations, a coin the drawing drops) are errors too.
 */
const fs = require('fs');
const path = require('path');
const { Unparseable, clean, num, same, fmt } = require('./arith.js');
const { readShape, shapeNames, sides, angles } = require('./shapes.js');

// The page's drawing functions (browser script, no exports)
const SVG_JS = new Function(
  fs.readFileSync(path.join(__dirname, '../../src/assets/js/svg.js'), 'utf8') +
    '\nreturn { clockSvg, moneySvg, rulerExerciseSvg, thermometerExerciseSvg };'
)();

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? m[1] : null;
};

// <text> elements of a drawing: { x, y, size, text }
const texts = (svg) =>
  [...String(svg || '').matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map(([, a, t]) => ({
    x: Number(attr(a, 'x')),
    y: Number(attr(a, 'y')),
    size: Number(attr(a, 'font-size')),
    text: t.trim(),
  }));

function viewBox(svg) {
  const m = String(svg).match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/);
  if (!m) throw new Unparseable('no viewBox');
  const [x, y, w, h] = m.slice(1).map(Number);
  return { x, y, w, h };
}

// Emojis scattered in a picture: what can be counted, and what a pupil could not count
function scattered(svg) {
  const items = texts(svg).filter((t) => t.text && /\p{Extended_Pictographic}/u.test(t.text));
  if (!items.length) throw new Unparseable('no emoji drawn');
  const vb = viewBox(svg);
  const problems = [];
  items.forEach((a, i) => {
    const r = a.size / 2;
    if (a.x - r < vb.x - 1 || a.x + r > vb.x + vb.w + 1 || a.y - r < vb.y - 1 || a.y + r > vb.y + vb.h + 1)
      problems.push(`${a.text} at (${fmt(a.x)}, ${fmt(a.y)}) is cut off by the frame`);
    for (const b of items.slice(i + 1))
      if (Math.hypot(a.x - b.x, a.y - b.y) < 0.8 * Math.min(a.size, b.size))
        problems.push(`${a.text} and ${b.text} overlap at (${fmt(a.x)}, ${fmt(a.y)})`);
  });
  const count = {};
  for (const it of items) count[it.text] = (count[it.text] || 0) + 1;
  return { count, problems };
}

// « Combien de ballons ? » → the number drawn; « … ajouter … pour en avoir 10 ? » → what is missing
function countObjects(e) {
  const { count, problems } = scattered(e.svgHtml);
  if (problems.length) return problems.join('; ');
  const kinds = Object.keys(count);
  if (kinds.length !== 1) throw new Unparseable(`${kinds.length} kinds of objects`);
  const n = count[kinds[0]];
  const target = clean(e.title).match(/pour en avoir\s+(\d+)/);
  const want = target ? Number(target[1]) - n : n;
  if (target && want <= 0) return `${n} ${kinds[0]} drawn: nothing to add to reach ${target[1]}`;
  return e.answers.some((a) => same(num(a), want)) ? null : `${n} ${kinds[0]} drawn, declared ${e.answers.join(' / ')}`;
}

// Splat: the card says how many in all, the emojis left showing are counted; none may sit under the
// splat, which must be big enough for what it hides. The peek picture: the same ones, plus the hidden ones.
function splat(e) {
  const svg = String(e.svgHtml || '');
  const card = svg.match(/<text data-total="1"[^>]*>(\d+)<\/text>/);
  const blot = svg.match(/data-splat="([\d.]+) ([\d.]+) ([\d.]+)"/);
  if (!card || !blot) throw new Unparseable('no total card or no splat');
  const total = Number(card[1]);
  const [cx, cy, reach] = blot.slice(1).map(Number);
  const { count, problems } = scattered(svg);
  if (problems.length) return problems.join('; ');
  const kinds = Object.keys(count);
  if (kinds.length !== 1) throw new Unparseable(`${kinds.length} kinds of objects`);
  const seen = texts(svg).filter((t) => t.text === kinds[0]);
  const under = seen.find((t) => Math.hypot(t.x - cx, t.y - cy) < reach + t.size / 2);
  if (under) return `${under.text} at (${fmt(under.x)}, ${fmt(under.y)}) is partly under the splat`;
  const want = total - seen.length;
  if (want < 1) return `${seen.length} showing out of ${total}: nothing is hidden`;
  const size = seen[0] ? seen[0].size : 30;
  if (Math.PI * (reach / 1.35) ** 2 < want * size * size * 0.8) return `a splat of ${fmt(reach)} cannot hide ${want}`;
  if (e.svgFull) {
    const all = texts(e.svgFull).filter((t) => t.text === kinds[0]);
    if (all.length !== total) return `the peek shows ${all.length}, the card says ${total}`;
    if (!seen.every((t) => all.some((a) => a.x === t.x && a.y === t.y)))
      return 'the peek does not show the same objects in the same places';
    const hid = all.filter((a) => !seen.some((t) => t.x === a.x && t.y === a.y));
    if (hid.some((a) => Math.hypot(a.x - cx, a.y - cy) + a.size / 2 > reach))
      return 'an object of the peek is not where the splat falls';
  }
  return e.answers.some((a) => same(num(a), want))
    ? null
    : `${total} in all, ${seen.length} showing: ${want} under the splat, declared ${e.answers.join(' / ')}`;
}

// « Il y a ___ de 🐝 que de 🌸. » → Autant (0) · Plus (1) · Moins (2), as on the buttons
function compareGroups(e) {
  const { count, problems } = scattered(e.svgHtml);
  if (problems.length) return problems.join('; ');
  const order = [...clean(e.title).matchAll(/\p{Extended_Pictographic}/gu)].map((m) => m[0]);
  if (order.length !== 2 || Object.keys(count).length !== 2) throw new Unparseable('not two groups');
  const [a, b] = order.map((k) => count[k] || 0);
  if (!a || !b) return `${order.join(' / ')} drawn ${a} / ${b} times`;
  const want = a === b ? 0 : a > b ? 1 : 2;
  return want === e.cmpGroupAnswer
    ? null
    : `${a} ${order[0]} and ${b} ${order[1]}: answer is ${['Autant', 'Plus', 'Moins'][want]}, declared ${
        ['Autant', 'Plus', 'Moins'][e.cmpGroupAnswer]
      }`;
}

// Clock drawing → { h (1–12), m }: hands as angles from 12 o'clock; the thicker hand is the hour
function readClock(svg) {
  const lines = [...String(svg).matchAll(/<line\b([^>]*)\/?>/g)].map(([, a]) => ({
    dx: Number(attr(a, 'x2')) - Number(attr(a, 'x1')),
    dy: Number(attr(a, 'y2')) - Number(attr(a, 'y1')),
    w: Number(attr(a, 'stroke-width')),
  }));
  if (lines.length !== 2) throw new Unparseable(`${lines.length} hands`);
  const [hour, minute] = [...lines].sort((p, q) => q.w - p.w);
  const deg = (l) => ((Math.atan2(l.dx, -l.dy) * 180) / Math.PI + 360) % 360;
  const m = Math.round(deg(minute) / 6) % 60;
  const h = Math.round((deg(hour) - m / 2) / 30);
  const drift = Math.abs(((deg(hour) - (h * 30 + m / 2) + 540) % 360) - 180);
  if (drift > 3) throw new Unparseable(`hour hand ${fmt(deg(hour))}° does not match ${m} min`);
  return { h: ((h + 11) % 12) + 1, m };
}

// « 5h et quart », « 12h cinq », « 1h pile », « 3h moins le quart » → { h (1–12), m }
const AFTER = { pile: 0, cinq: 5, dix: 10, 'et quart': 15, vingt: 20, 'vingt-cinq': 25, 'et demie': 30 };
const BEFORE = { cinq: 5, dix: 10, 'le quart': 15, vingt: 20, 'vingt-cinq': 25 };
function spokenTime(text) {
  const t = clean(text).toLowerCase();
  let m = t.match(/^(\d{1,2}) ?h moins (.+)$/);
  if (m && m[2] in BEFORE) return { h: ((Number(m[1]) + 10) % 12) + 1, m: 60 - BEFORE[m[2]] };
  m = t.match(/^(\d{1,2}) ?h (.+)$/);
  if (m && m[2] in AFTER) return { h: ((Number(m[1]) + 11) % 12) + 1, m: AFTER[m[2]] };
  throw new Unparseable('spoken time ' + text);
}

// Coins and notes as drawn (their labels « 5 € », « 20 c ») → cents
function drawnMoney(items) {
  const labels = texts(SVG_JS.moneySvg(items))
    .map((t) => t.text.match(/^(\d+(?:,\d+)?) ?(€|c)$/))
    .filter(Boolean);
  const cents = labels.map(([, v, u]) => (u === '€' ? Math.round(num(v) * 100) : Number(v)));
  return { cents, missing: items.length - cents.length };
}

// Money questions, by their wording → what the drawing gives (euros part, cents part, total)
const MONEY_QUESTIONS = [
  [/billets et les pièces en euros/, (big) => big / 100],
  [/pièces en centimes/, (big, small) => small],
  [/somme totale.*euros/, (big, small) => Math.floor((big + small) / 100)],
  [/combien de centimes/, (big, small) => (big + small) % 100],
  [/combien d.euros en tout/, (big, small) => (big + small) / 100],
];
function moneyQuestions(e) {
  if (!e.svg || e.svg.gen !== 'moneySvg') throw new Unparseable('no money drawing');
  const { cents, missing } = drawnMoney(e.svg.par.items);
  if (missing) return `${missing} of ${e.svg.par.items.length} coins/notes are not drawn (not real money)`;
  const big = cents.filter((c) => c >= 100).reduce((s, c) => s + c, 0);
  const small = cents.filter((c) => c < 100).reduce((s, c) => s + c, 0);
  for (const [i, q] of e.mqQuestions.entries()) {
    const rule = MONEY_QUESTIONS.find(([re]) => re.test(clean(q.text).toLowerCase()));
    if (!rule) throw new Unparseable('money question ' + q.text);
    const want = rule[1](big, small);
    if (!same(num(q.answer), want)) return `question ${i + 1}: the drawing gives ${fmt(want)}, declared ${q.answer}`;
  }
  return null;
}

// Thermometer, measuring jug, scale dial as drawn: the numbered graduations give the scale (a height, or an
// angle around the dial's centre); the liquid, the red column or the needle must stop on a graduation
function gauge(e) {
  const r = e.thermometer;
  if (!r) throw new Unparseable('no thermometer');
  const svg = SVG_JS.thermometerExerciseSvg(r);
  const lines = [...svg.matchAll(/<line\b([^>]*)\/>/g)].map(([, a]) => ({
    x1: Number(attr(a, 'x1')),
    y1: Number(attr(a, 'y1')),
    x2: Number(attr(a, 'x2')),
    y2: Number(attr(a, 'y2')),
    level: /data-level|data-needle/.test(a),
  }));
  const needle = lines.find((l) => l.level);
  const dial = r.kind === 'dial';
  let pos, marker, ticks, labels;
  const numbers = texts(svg).filter((t) => /^-?\d+(?:,\d+)?$/.test(t.text));
  if (dial) {
    if (!needle) throw new Unparseable('dial without a needle');
    const [cx, cy] = [needle.x1, needle.y1];
    pos = (x, y) => (Math.atan2(x - cx, cy - y) * 180) / Math.PI; // degrees, 0 = up, clockwise
    marker = pos(needle.x2, needle.y2);
    ticks = lines.filter((l) => !l.level).map((l) => pos(l.x1, l.y1));
    labels = numbers.map((t) => ({ p: pos(t.x, t.y - 4), v: num(t.text) }));
  } else {
    pos = (y) => y;
    ticks = lines.filter((l) => !l.level && l.y1 === l.y2).map((l) => l.y1);
    labels = numbers.map((t) => ({ p: t.y - 4, v: num(t.text) }));
    if (r.kind === 'jug') {
      if (!needle) throw new Unparseable('jug without a level');
      marker = needle.y1;
    } else {
      const col = svg.match(/<rect x="[\d.]+" y="([\d.]+)" width="10" height="[\d.]+" fill="#ef4444"/);
      marker = col ? Number(col[1]) : Math.max(...ticks); // no column: the lowest graduation
    }
  }
  if (labels.length < 2) throw new Unparseable('fewer than two numbers on the scale');
  const [p, q] = [labels[0], labels[labels.length - 1]];
  const valueAt = (x) => p.v + ((x - p.p) * (q.v - p.v)) / (q.p - p.p);
  for (const l of labels)
    if (Math.abs(valueAt(l.p) - l.v) > Math.abs(q.v - p.v) * 0.002) return `${l.v} is not where the scale puts it`;
  const ps = [...new Set(ticks.map((t) => t.toFixed(2)))].map(Number).sort((a, b) => a - b);
  const px = dial ? 100 * (Math.PI / 180) : 1; // a degree on the dial ≈ 2 px at the tick ring
  const gap = Math.min(...ps.slice(1).map((t, i) => (t - ps[i]) * px));
  if (gap < 4) return `graduations ${fmt(Math.round(gap * 10) / 10)} px apart: too close to read`;
  if (!ps.some((t) => Math.abs(t - marker) < (dial ? 0.3 : 0.5)))
    return `the ${dial ? 'needle' : 'level'} at ${fmt(valueAt(marker))} is between two graduations`;
  // On a graduation: its value, to the step of the scale (the drawing's coordinates are rounded)
  const stepVal = Math.abs(valueAt(ps[1]) - valueAt(ps[0]));
  const nice = Math.pow(10, Math.floor(Math.log10(stepVal)) - 1);
  const want = Math.round(Math.round(valueAt(marker) / nice) * nice * 1e6) / 1e6;
  return e.answers.some((a) => same(num(a), want))
    ? null
    : `the ${r.kind || 'thermometer'} shows ${fmt(want)}, declared ${e.answers.join(' / ')}`;
}

// Ruler as drawn: labelled whole-unit ticks give the scale; the marker must sit on a graduation
function ruler(e) {
  if (!e.ruler) throw new Unparseable('no ruler');
  const svg = SVG_JS.rulerExerciseSvg(e.ruler);
  const ticks = [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="[\d.]+" y2="([\d.]+)"/g)]
    .map(([, x, y1, y2]) => ({ x: Number(x), h: Number(y2) - Number(y1) }))
    .filter((t) => t.h > 0);
  const labels = texts(svg).filter((t) => /^-?\d+(?:[.,]\d+)?$/.test(t.text));
  if (labels.length < 2) throw new Unparseable('ruler without two labels');
  const [p, q] = [labels[0], labels[labels.length - 1]];
  const valueAt = (x) => num(p.text) + ((x - p.x) * (num(q.text) - num(p.text))) / (q.x - p.x);
  const xs = [...new Set(ticks.map((t) => t.x.toFixed(2)))].map(Number).sort((a, b) => a - b);
  const gap = Math.min(...xs.slice(1).map((x, i) => x - xs[i]));
  if (gap < 4) return `graduations ${fmt(Math.round(gap * 10) / 10)} px apart: too close to read`;
  // Marker: a triangle, then its letter
  const markers = [...svg.matchAll(/<polygon points="([\d.]+),[^>]*\/><text[^>]*>([^<]*)<\/text>/g)].map(
    ([, x, label]) => ({ x: Number(x), label: label.trim() })
  );
  for (const m of markers) {
    if (!xs.some((t) => Math.abs(t - m.x) < 0.5))
      return `${m.label} at ${fmt(valueAt(m.x))} is between two graduations`;
    m.value = Math.round(valueAt(m.x) * 10000) / 10000;
  }
  // « Lis la valeur du point A » / « indiquée par A » → A; two markers otherwise → the gap between them
  const named = clean(e.title).match(/(?:point|par)\s+([A-Z])\b/);
  let want;
  if (named) want = (markers.find((m) => m.label === named[1]) || {}).value;
  else if (markers.length === 1) want = markers[0].value;
  else if (markers.length === 2) want = Math.round(Math.abs(markers[1].value - markers[0].value) * 10000) / 10000;
  if (want === undefined) throw new Unparseable(`${markers.length} markers`);
  // « Combien de millimètres ? » on a ruler graduated in cm: 4,7 cm is read 47 mm
  if (/millimètres/i.test(clean(e.title))) want = Math.round(want * 10 * 10000) / 10000;
  return e.answers.some((a) => same(num(a), want))
    ? null
    : `the ruler shows ${fmt(want)}, declared ${e.answers.join(' / ')}`;
}

// « 1 à 4 », « Pair », « Multiple de 7 » / « Divisible par 9 », « Non multiple » / « Non divisible », « 3 » (direct) → predicate on a cell
function colourRule(label, labels) {
  const l = clean(label).toLowerCase();
  let m;
  if ((m = l.match(/^(\d+) à (\d+)$/))) return (n) => n >= Number(m[1]) && n <= Number(m[2]);
  if (/^\d+$/.test(l)) return (n) => n === Number(l);
  if (l === 'pair') return (n) => n % 2 === 0;
  if (l === 'impair') return (n) => n % 2 !== 0;
  if ((m = l.match(/^(?:multiple de|divisible par) (\d+)$/))) return (n) => n % Number(m[1]) === 0;
  if (l === 'non multiple' || l === 'non divisible') {
    const others = labels.filter((x) => x !== label).map((x) => colourRule(x, labels));
    return (n) => !others.some((f) => f(n));
  }
  throw new Unparseable('colour label ' + label);
}

// Each number goes with exactly one colour of the code, and it is the colour of its cell
function magicColor(e) {
  const { cells, labels = [] } = e.magicColor || {};
  if (!cells || !labels.length) throw new Unparseable('no colour code');
  const rules = labels.map((l) => colourRule(l, labels));
  for (const c of cells) {
    const fits = rules.map((f, i) => (f(c.value) ? i : -1)).filter((i) => i >= 0);
    if (fits.length !== 1)
      return `${c.value} fits ${fits.length ? fits.map((i) => `« ${labels[i]} »`).join(' and ') : 'no colour'}`;
    if (fits[0] !== c.colorIdx)
      return `${c.value} is « ${labels[fits[0]]} », the picture wants « ${labels[c.colorIdx]} »`;
  }
  return null;
}

// Shape properties named by the Venn labels, measured on the drawing
function shapeRule(label) {
  const l = clean(label).toLowerCase();
  const poly = (s) => s && s.kind === 'polygon';
  const ratio = (xs) => Math.max(...xs) / Math.min(...xs);
  if (l === 'a 4 côtés' || l === 'est un quadrilatère') return (s) => poly(s) && s.pts.length === 4;
  if (l === 'a tous les côtés égaux') return (s) => poly(s) && ratio(sides(s.pts)) < 1.02;
  if (l === 'a des angles droits') return (s) => poly(s) && angles(s.pts).some((a) => Math.abs(a - 90) < 1.5);
  if (l === 'a deux paires de côtés parallèles') return (s) => shapeNames(s).names.has('parallelogramme');
  throw new Unparseable('venn label ' + label);
}

function vennShapes(e) {
  const a = shapeRule(e.venn.labelA),
    b = shapeRule(e.venn.labelB);
  for (const it of e.venn.items) {
    const s = readShape(it.svg);
    if (!s) throw new Unparseable('no shape drawn for ' + it.char);
    const zone = a(s) && b(s) ? 'ab' : a(s) ? 'a' : b(s) ? 'b' : 'out';
    if (zone !== it.zone) return `${it.char} as drawn belongs in ${zone}, placed in ${it.zone}`;
  }
  return null;
}

// By exercise type: static pages and generated draws alike
const VISUAL_CHECKS = {
  'count-objects': countObjects,
  'compare-groups': compareGroups,
  'magic-color': magicColor,
  ruler,
  thermometer: gauge,
};

// By generator, when the type alone does not say how to read the drawing
const VISUAL_GEN_CHECKS = {
  lireHeureMatching: (e) => {
    const { left, right, answers } = e.pairs;
    const key = (t) => `${t.h}:${t.m}`;
    const clocks = left.map((svg) => key(readClock(svg)));
    if (new Set(clocks).size !== clocks.length) return `two clocks show the same time (${clocks.join(', ')})`;
    for (const [i, j] of answers.entries()) {
      const said = key(spokenTime(right[j]));
      if (said !== clocks[i]) return `clock ${i + 1} shows ${clocks[i]}, matched with « ${right[j]} » (${said})`;
    }
    return null;
  },
  sousLaTache: splat,
  porteMonnaie: moneyQuestions,
  compterEuros: moneyQuestions,
  vennFormes: vennShapes,
};

module.exports = { VISUAL_CHECKS, VISUAL_GEN_CHECKS, clockSvg: SVG_JS.clockSvg };
