/**
 * Word-problem checks for the answer oracle (scripts/check-answers.js), tested by
 * tests/word-problems.test.js on real shapes and on corrupted answers.
 *
 * "8 × 4,50 = 36 €  ;  15 × 1,20 = 18 €  ;  36 − 18 = 18 €": every step must hold, the last result
 * must be the declared answer, and every number the steps use must come from the statement (or an
 * earlier step) — a trace written for other data than the pupil reads is an error.
 */
const { Unparseable, clean, num, same, fmt, checkEquation } = require('./arith.js');

const stripUnits = (s) =>
  clean(s)
    .replace(/(\d)\s*x\s*(\d)/g, '$1 × $2')
    .replace(/[\p{L}€%°²³'’]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Number words a statement may use instead of digits
const NUMBER_WORDS = {
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  onze: 11,
  douze: 12,
  quinze: 15,
  vingt: 20,
  trente: 30,
  cinquante: 50,
  cent: 100,
  mille: 1000,
  double: 2,
  triple: 3,
  moitié: 2,
  demi: 2,
  tiers: 3,
  quart: 4,
  quarts: 4,
  dizaine: 10,
  douzaine: 12,
  centaine: 100,
  semaine: 7,
  semaines: 7,
  heure: 60,
  heures: 60,
};
// Conversions a pupil knows without being told
const KNOWN_CONSTANTS = [1, 10, 100, 1000, 60, 24, 7, 12, 365, 52];

const numbersIn = (html) => {
  const s = clean(html).replace(/(\d) (?=\d{3}\b)/g, '$1');
  return [...s.matchAll(/\d+(?:,\d+)?/g)].map((m) => num(m[0]));
};

// Clock times and durations → minutes, so « 14 h 30 + 1 h 45 = 16 h 15 » and the answer « 16:15 »
// compute: "14 h 30", "1 heure et 45 minutes", "14:30", "2 h", "3 heures"
const inMinutes = (s) =>
  String(s)
    .replace(/(\d{1,2}) ?(?:h|heures?)(?: et)? ?(\d{1,2})(?: ?min(?:utes?)?)?(?!\d)/g, (_, h, m) =>
      String(h * 60 + Number(m))
    )
    .replace(/(\d{1,2}):(\d{2})/g, (_, h, m) => String(h * 60 + Number(m)))
    .replace(/(\d{1,2}) ?(?:h|heures?)\b/g, (_, h) => String(h * 60));

// What a trace may use: the statement's numbers and words, percentages as factors
// (25 % → 0,25 / 0,75 / 4), whole ratios of two given numbers (6 bottles for 3 → × 2)
function statementNumbers(html) {
  const vals = numbersIn(html);
  if (inMinutes(clean(html)) !== clean(html)) vals.push(...numbersIn(inMinutes(clean(html))));
  for (const w of clean(html)
    .toLowerCase()
    .match(/\p{L}+/gu) || [])
    if (w in NUMBER_WORDS) vals.push(NUMBER_WORDS[w]);
  for (const m of clean(html).matchAll(/(\d+(?:,\d+)?) ?%/g)) {
    const p = num(m[1]);
    vals.push(p / 100, 1 - p / 100, 100 - p, 100 / p);
  }
  const ints = vals.filter((v) => Number.isInteger(v) && v > 0);
  for (const a of ints) for (const b of ints) if (a > b && a % b === 0) vals.push(a / b);
  return vals.concat(KNOWN_CONSTANTS);
}

function checkTrace(operation, answers, statementHtml) {
  const steps = clean(operation)
    .split(/\s*;\s*/)
    .filter(Boolean)
    .map((s) => stripUnits(inMinutes(s)));
  if (!steps.length) throw new Unparseable('no operation');
  const known = statementNumbers(statementHtml);
  let last = null;
  for (const s of steps) {
    const sides = s.split(/=|≈/);
    const lhs = sides[0].replace(/(\d) (?=\d{3}\b)/g, '$1');
    const missing = [...lhs.matchAll(/\d+(?:,\d+)?/g)]
      .map((m) => m[0])
      .filter((n) => !known.some((k) => same(k, num(n))));
    if (missing.length) return `step "${s}" uses ${missing.join(', ')}, which is not in the statement`;
    if (s.includes('?')) {
      const err = checkEquation(s, answers);
      if (err) return err;
      last = null;
      continue;
    }
    const vals = sides.map((p) => num(p));
    if (s.includes('≈')) {
      const [v, approx] = vals;
      if (![Math.floor(v), Math.round(v), Math.ceil(v)].some((r) => same(r, approx)))
        return `step "${s}": ${fmt(v)} does not round to ${fmt(approx)}`;
    } else if (vals.some((v) => !same(v, vals[0]))) return `step "${s}" is false (${fmt(vals[0])})`;
    known.push(...vals);
    last = vals[vals.length - 1];
  }
  if (last === null) return null;
  const declared = answers.map((a) => num(stripUnits(inMinutes(clean(a)))));
  return declared.some((a) => same(a, last))
    ? null
    : `the operation gives ${fmt(last)}, declared ${answers.join(' / ')}`;
}

// "20 h 15", "1 heure 40 minutes", "45 min" → minutes; anything else → a number
function quantityOrTime(s) {
  const t = clean(s).toLowerCase();
  const m = t.match(/^(?:([0-9]+) ?(?:h|heures?))? ?(?:([0-9]+) ?(?:min|minutes?)?)?$/);
  if (m && /h|min/.test(t)) return Number(m[1] || 0) * 60 + Number(m[2] || 0);
  return num(stripUnits(s));
}

const STEP_OPS = {
  '+': (a, b) => [a + b],
  '−': (a, b) => [a - b, b - a],
  '-': (a, b) => [a - b, b - a],
  '×': (a, b) => [a * b],
  '÷': (a, b) => [a / b, b / a],
  ':': (a, b) => [a / b, b / a],
};

const WORD_PROBLEM_CHECKS = {
  problem: (e) => {
    if (!clean(e.operation)) throw new Unparseable('no operation');
    return checkTrace(e.operation, e.answers || [], `${e.title} ${e.body}`);
  },
  'multi-question': (e) => {
    const qs = e.mqQuestions || [];
    const context = `${e.title} ${e.body} ${e.mqContext || ''}`;
    let missing = 0;
    for (const [i, q] of qs.entries()) {
      if (!clean(q.operation)) {
        missing++;
        continue;
      }
      // Earlier answers are data for the next questions (« Tu paies avec 10 €… » after « 9 € »)
      const earlier = qs
        .slice(0, i)
        .map((p) => p.answer)
        .join(' ; ');
      const err = checkTrace(q.operation, [q.answer], `${context} ${q.text} ${earlier}`);
      if (err) return `question ${i + 1}: ${err}`;
    }
    if (missing) throw new Unparseable(`${missing} question(s) without operation`);
    return null;
  },
  // Base problem and its inverses: same numbers (two data + the answer, swapped around), and the
  // answer follows from the data by one operation (or a proportion, for three data)
  'inverse-problem': (e) => {
    const family = (p) =>
      [...numbersIn(p.text), num(p.answer)]
        .sort((a, b) => a - b)
        .map(fmt)
        .join(', ');
    const base = family(e.ipBase);
    for (const p of [e.ipBase, ...e.ipInverses]) {
      const n = numbersIn(p.text);
      const a = num(p.answer);
      if (family(p) !== base) return `"${clean(p.text)}" uses ${family(p)}, the base problem ${base}`;
      if (n.length === 2) {
        const [x, y] = n;
        if (![x + y, x - y, y - x, x * y, x / y, y / x].some((v) => same(v, a)))
          return `"${clean(p.text)}": no operation of ${fmt(x)} and ${fmt(y)} gives ${p.answer}`;
      } else if (n.length === 3) {
        const [x, y, z] = n;
        if (![x * y, x * z, y * z].some((v, i) => same(v, [z, y, x][i] * a)))
          return `"${clean(p.text)}": ${n.map(fmt).join(', ')} and ${p.answer} are not proportional`;
      } else throw new Unparseable(`${n.length} numbers`);
    }
    return null;
  },
  // The numbers tapped, combined by the chosen operation (or a + / − when the step is skipped),
  // give the result; a « convert » step is itself checked when it is arithmetic
  'guided-problem': (e) => {
    const step = Object.fromEntries((e.gpSteps || []).map((s) => [s.kind, s]));
    if (step.convert) {
      const q = stripUnits(String(step.convert.question).replace(/_{2,}/g, '?'));
      try {
        const err = checkEquation(q, step.convert.answers || [step.convert.answer]);
        if (err) return `convert step: ${err}`;
      } catch (err) {
        if (!(err instanceof Unparseable)) throw err;
      }
    }
    const tokens = step.numbers?.tokens || [];
    const results = step.calculate?.answers || [step.calculate?.answer];
    if (tokens.length !== 2 || !step.calculate) throw new Unparseable(`${tokens.length} numbers`);
    // « 3/8 bue → 5/8 reste »: the tapped numbers are a numerator and a denominator
    if (results.some((r) => String(r).includes('/'))) throw new Unparseable('fraction result');
    const [a, b] = tokens.map(quantityOrTime);
    const ops = step.operation ? step.operation.answers : ['+', '−'];
    if (!ops.every((o) => STEP_OPS[o])) throw new Unparseable('operation ' + ops.join(' '));
    const want = ops.flatMap((o) => STEP_OPS[o](a, b));
    return results.some((r) => want.some((w) => same(quantityOrTime(r), w)))
      ? null
      : `${tokens.join(` ${ops.join('/')} `)} does not give ${results.join(' / ')}`;
  },
};

module.exports = { WORD_PROBLEM_CHECKS, checkTrace };
