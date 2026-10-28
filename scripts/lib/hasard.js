/**
 * Chance drawings (hasardPossible, hasardComparer, hasardChances, hasardRanger) — urns, spinners and
 * special dice read back from the SVG markup alone (ball fills, sector arcs, face numbers), apart from
 * the generator, for gen-checks.js and validate-llm.js.
 */
const FILLS = { '#ef4444': 'rouge', '#3b82f6': 'bleu', '#22c55e': 'vert', '#facc15': 'jaune', '#a855f7': 'violet' };
// Written forms in an instruction → colour (« boule bleue », « sur le bleu », « boules violettes »)
const WORDS = [
  [/^rouges?$/, 'rouge'],
  [/^bleue?s?$/, 'bleu'],
  [/^verte?s?$/, 'vert'],
  [/^jaunes?$/, 'jaune'],
  [/^violet(te)?s?$/, 'violet'],
];

const num = (s) => Number(String(s).trim());
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? m[1] : null;
};

// SVG → { source: 'urne' | 'roue' | 'de', outcomes: [colour | number…], problems: [] } | null
function readChance(svg) {
  const s = String(svg || '');
  const m = s.match(/<svg\b[^>]*\sdata-chance="(urne|roue|de)"/);
  if (!m) return null;
  const source = m[1];
  const problems = [];
  const outcomes = [];
  if (source === 'urne') {
    const balls = [];
    for (const [tag] of s.matchAll(/<circle\b[^>]*>/g)) {
      const fill = attr(tag, 'fill');
      if (!FILLS[fill]) problems.push(`ball of unknown colour ${fill}`);
      balls.push([num(attr(tag, 'cx')), num(attr(tag, 'cy')), num(attr(tag, 'r'))]);
      outcomes.push(FILLS[fill]);
    }
    // Every ball whole and apart from the others: none can hide another
    balls.forEach(([x, y, r], i) =>
      balls.slice(i + 1).forEach(([u, v, q], j) => {
        if (Math.hypot(x - u, y - v) < r + q) problems.push(`balls ${i} and ${i + 1 + j} overlap`);
      })
    );
  } else if (source === 'roue') {
    // Sectors « M cx,cy L x,y A r,r 0 0,1 x',y' Z »: their angles must all be the same
    const spans = [];
    for (const [tag] of s.matchAll(/<path\b[^>]*>/g)) {
      const d = attr(tag, 'd') || '';
      const p = d.match(/^M([\d.]+),([\d.]+) L([\d.]+),([\d.]+) A([\d.]+),[\d.]+ 0 0,1 ([\d.]+),([\d.]+) Z$/);
      if (!p) continue; // the pointer
      const [cx, cy, x0, y0, , x1, y1] = p.slice(1).map(num);
      const a0 = Math.atan2(y0 - cy, x0 - cx);
      const a1 = Math.atan2(y1 - cy, x1 - cx);
      spans.push((((((a1 - a0) * 180) / Math.PI) % 360) + 360) % 360 || 360);
      const fill = attr(tag, 'fill');
      if (!FILLS[fill]) problems.push(`sector of unknown colour ${fill}`);
      outcomes.push(FILLS[fill]);
    }
    const total = spans.reduce((a, b) => a + b, 0);
    if (Math.abs(total - 360) > 1) problems.push(`sectors cover ${total.toFixed(0)}°`);
    if (spans.some((x) => Math.abs(x - 360 / spans.length) > 1)) problems.push('sectors of different sizes');
  } else {
    for (const [, t] of s.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)) outcomes.push(num(t));
    if (outcomes.length !== 6) problems.push(`a die with ${outcomes.length} faces`);
    if (outcomes.some((n) => !Number.isInteger(n) || n < 1 || n > 6)) problems.push('a face is not 1–6');
  }
  if (outcomes.length < 2) problems.push('fewer than 2 outcomes');
  return { source, outcomes, problems };
}

// Instruction text → { items, not }: the colours (or die numbers) it names, and whether the outcome
// must be none of them
function readEvent(text, source) {
  const t = String(text).replace(/<[^>]*>/g, '');
  const not = /n'est pas|ailleurs que|autre chose/.test(t);
  if (source === 'de') return { items: [...t.matchAll(/\bun (\d)\b/g)].map((x) => num(x[1])), not };
  const items = [];
  for (const w of t.toLowerCase().match(/[a-zé]+/g) || []) {
    const hit = WORDS.find(([re]) => re.test(w));
    if (hit) items.push(hit[1]);
  }
  return { items, not };
}

// Colour of a single-ball / single-sector tile
const tileColour = (svg) => {
  const m = String(svg).match(/\sfill="(#[0-9a-f]{6})"/);
  return m ? FILLS[m[1]] || null : null;
};

const countOf = (outcomes) => {
  const c = new Map();
  for (const o of outcomes) c.set(o, (c.get(o) || 0) + 1);
  return c;
};

// For the LLM prompt: the drawing in words, from the markup
function chanceText(svg) {
  const r = readChance(svg);
  if (!r) return '';
  if (r.source === 'de') return `dé dont les 6 faces portent : ${r.outcomes.join(', ')}`;
  const list = [...countOf(r.outcomes)].map(([o, n]) => `${o} × ${n}`).join(', ');
  return r.source === 'urne'
    ? `urne de ${r.outcomes.length} boules : ${list}`
    : `roue de ${r.outcomes.length} parts égales : ${list}`;
}

module.exports = { readChance, readEvent, tileColour, countOf, chanceText };
