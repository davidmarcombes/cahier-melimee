/**
 * memory — card shorthand and what each card stands for (build, validator, answer oracle).
 *
 * Front-matter card: a string / number (text, Markdown inline) or one drawing:
 *   {dots: 5} die pips · {fingers: 7} hands · {emoji: 🍎, n: 3} · {pie: "3/4"} shaded disc ·
 *   {frac: "3/4"} stacked fraction · {clock: "3:15"} · {blocks: 34} base-10 blocks
 * Payload card: {text} or the drawing with numbers ({pie: [3, 4]}, {clock: [3, 15]}).
 *
 * Two cards go together when they stand for the same value — or, with `sum`, when their values add
 * up to it (complements). Every pair must go together and no two cards of different pairs may, or a
 * right pair would be turned back.
 */
const { Unparseable, clean, num, same, fmt } = require('./arith.js');

const ratio = (v, what) => {
  const m = String(v).match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
  if (!m || Number(m[2]) === 0) throw new Error(`memory card ${what}: "${v}" is not a fraction a/b`);
  return [Number(m[1]), Number(m[2])];
};
const whole = (v, what, lo, hi) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < lo || n > hi)
    throw new Error(`memory card ${what}: ${v} is not a whole number ${lo}–${hi}`);
  return n;
};

// Front-matter card → payload card. `text` renders a text card (Markdown at build time).
function normalizeCard(c, text = (s) => s) {
  if (typeof c === 'string' || typeof c === 'number') return { text: text(String(c)) };
  if (!c || typeof c !== 'object') throw new Error(`memory card ${JSON.stringify(c)}: text or one drawing`);
  if (c.dots != null) return { dots: whole(c.dots, 'dots', 1, 10) };
  if (c.fingers != null) return { fingers: whole(c.fingers, 'fingers', 1, 10) };
  if (c.emoji) return { emoji: String(c.emoji), n: whole(c.n, 'emoji n', 1, 20) };
  if (c.pie != null) return { pie: ratio(c.pie, 'pie') };
  if (c.frac != null) return { frac: ratio(c.frac, 'frac') };
  if (c.blocks != null) return { blocks: whole(c.blocks, 'blocks', 1, 999) };
  if (c.clock != null) {
    const m = String(c.clock).match(/^(\d{1,2}):(\d{2})$/);
    if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) throw new Error(`memory card clock: "${c.clock}" is not h:mm`);
    return { clock: [Number(m[1]), Number(m[2])] };
  }
  throw new Error(`memory card ${JSON.stringify(c)}: unknown drawing`);
}

// « 3 h 15 », « 15h », « 3h et quart », « 3h moins le quart » → 12-hour face, as on a clock
const AFTER = { pile: 0, cinq: 5, dix: 10, 'et quart': 15, vingt: 20, 'vingt-cinq': 25, 'et demie': 30 };
const BEFORE = { cinq: 5, dix: 10, 'le quart': 15, vingt: 20, 'vingt-cinq': 25 };
const face = (h, m) => `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}`;
function timeOf(t) {
  let m = t.match(/^(\d{1,2}) ?h ?(\d{2})?(?: ?min)?$/);
  if (m && Number(m[1]) < 24) return face(Number(m[1]), Number(m[2] || 0));
  m = t.match(/^(\d{1,2}) ?h moins (.+)$/);
  if (m && m[2] in BEFORE) return face(Number(m[1]) - 1, 60 - BEFORE[m[2]]);
  m = t.match(/^(\d{1,2}) ?h (.+)$/);
  if (m && m[2] in AFTER) return face(Number(m[1]), AFTER[m[2]]);
  return null;
}

// What a card stands for: { n } a number, or { t } a time on the clock face
function cardValue(c) {
  if (c.text == null) {
    if (c.clock) return { t: face(c.clock[0], c.clock[1]) };
    if (c.pie || c.frac) {
      const [a, b] = c.pie || c.frac;
      return { n: a / b };
    }
    const n = c.dots ?? c.fingers ?? c.n ?? c.blocks;
    if (n == null) throw new Unparseable('memory card ' + JSON.stringify(c));
    return { n };
  }
  const t = clean(c.text).toLowerCase();
  const time = timeOf(t);
  if (time) return { t: time };
  try {
    return { n: num(t) };
  } catch (e) {
    if (!(e instanceof Unparseable)) throw e;
  }
  const { wordsToNumber } = require('./gen-checks.js');
  return { n: wordsToNumber(t) };
}

const show = (v) => (v.t ? v.t : fmt(v.n));

// null when the deck works, else what is wrong; Unparseable when a card cannot be read
function checkMemory(mem) {
  const pairs = mem && mem.pairs;
  if (!Array.isArray(pairs) || pairs.length < 2) return 'memory needs at least 2 pairs';
  if (pairs.some((p) => !Array.isArray(p) || p.length !== 2)) return 'every memory pair has exactly 2 cards';
  const vals = pairs.map((p) => p.map(cardValue));
  const sum = mem.sum;
  const fit = (a, b) =>
    sum != null ? a.n != null && b.n != null && same(a.n + b.n, sum) : a.t ? a.t === b.t : same(a.n, b.n);
  for (const [k, [a, b]] of vals.entries())
    if (!fit(a, b))
      return `pair ${k + 1}: ${show(a)} and ${show(b)} do not go together${sum != null ? ` (sum ${sum})` : ''}`;
  const cards = vals.flatMap((p, k) => p.map((v) => ({ v, k })));
  for (let i = 0; i < cards.length; i++)
    for (let j = i + 1; j < cards.length; j++)
      if (cards[i].k !== cards[j].k && fit(cards[i].v, cards[j].v))
        return `pairs ${cards[i].k + 1} and ${cards[j].k + 1} both match ${show(cards[i].v)}: any two of their cards go together`;
  return null;
}

module.exports = { normalizeCard, checkMemory };
