/**
 * Hundred board (tableau des nombres) — rows of ten numbers, `start` at the top left (1 → 1…100, 0 → 0…99,
 * 301 → 301…400). Three modes:
 *   find  — tap the mystery number: clues (« Mon chiffre des unités est 7 ») or moves from a number
 *           (↓ +10, ↑ −10, → +1, ← −1, never across the edge of the board)
 *   fill  — type the missing numbers (holes in the board, or a « morceau » where only `cells` are drawn)
 *   color — colour every number of a rule (« de 5 en 5 à partir de 5 », chiffre des unités 3…)
 * Independent of the generator and the player: rebuilds each answer and each text from the structured
 * data (build, validator, answer oracle).
 */

const MOVES = { d: 10, u: -10, r: 1, l: -1 };
const ARROWS = { d: '↓', u: '↑', r: '→', l: '←' };

function hbNumbers(hb) {
  const all = Array.from({ length: (hb.rows || 10) * 10 }, (_, i) => hb.start + i);
  return hb.cells ? all.filter((n) => hb.cells.includes(n)) : all;
}

// [row, col] of a number on the board
const hbAt = (hb, n) => [Math.floor((n - hb.start) / 10), (n - hb.start) % 10];

// The number reached from `from` along `path`, or null when a move leaves the board or wraps a row
function hbWalk(hb, from, path) {
  let [r, c] = hbAt(hb, from);
  for (const m of path) {
    if (!MOVES[m]) return null;
    if (m === 'd') r++;
    if (m === 'u') r--;
    if (m === 'r') c++;
    if (m === 'l') c--;
    if (r < 0 || r >= (hb.rows || 10) || c < 0 || c > 9) return null;
  }
  return hb.start + r * 10 + c;
}

const digit = (n, p) => Math.floor(n / p) % 10;

// Does n meet the clue?
function hbClueHolds(c, n) {
  switch (c.k) {
    case 'unites':
      return digit(n, 1) === c.v;
    case 'dizaines':
      return digit(n, 10) === c.v;
    case 'centaines':
      return digit(n, 100) === c.v;
    case 'entre':
      return n > c.v[0] && n < c.v[1];
    case 'pair':
      return n % 2 === 0;
    case 'impair':
      return n % 2 === 1;
    case 'somme':
      return (
        String(n)
          .split('')
          .reduce((s, d) => s + Number(d), 0) === c.v
      );
    case 'apres':
      return n === c.v + 1;
    case 'avant':
      return n === c.v - 1;
    case 'dessous':
      return n === c.v + 10;
    case 'dessus':
      return n === c.v - 10;
    case 'plus':
      return n > c.v;
    case 'moins':
      return n < c.v;
    default:
      return false;
  }
}

function hbClueText(c) {
  switch (c.k) {
    case 'unites':
      return `Mon chiffre des unités est ${c.v}.`;
    case 'dizaines':
      return `Mon chiffre des dizaines est ${c.v}.`;
    case 'centaines':
      return `Mon chiffre des centaines est ${c.v}.`;
    case 'entre':
      return `Je suis entre ${c.v[0]} et ${c.v[1]}.`;
    case 'pair':
      return 'Je suis un nombre pair.';
    case 'impair':
      return 'Je suis un nombre impair.';
    case 'somme':
      return `Si on ajoute mes chiffres, on trouve ${c.v}.`;
    case 'apres':
      return `Je suis juste après ${c.v}.`;
    case 'avant':
      return `Je suis juste avant ${c.v}.`;
    case 'dessous':
      return `Je suis juste en dessous de ${c.v}.`;
    case 'dessus':
      return `Je suis juste au-dessus de ${c.v}.`;
    case 'plus':
      return `Je suis plus grand que ${c.v}.`;
    case 'moins':
      return `Je suis plus petit que ${c.v}.`;
    default:
      return null;
  }
}

// The numbers to colour for a rule
function hbRuleCells(hb, rule) {
  const nums = hbNumbers(hb);
  switch (rule.k) {
    case 'unites':
      return nums.filter((n) => digit(n, 1) === rule.v);
    case 'dizaines':
      return nums.filter((n) => digit(n, 10) === rule.v);
    case 'pas': {
      const to = rule.to ?? Math.max(...nums);
      return nums.filter((n) => n >= rule.from && n <= to && (n - rule.from) % rule.step === 0);
    }
    default:
      return [];
  }
}

function hbRuleText(rule) {
  switch (rule.k) {
    case 'unites':
      return `Colorie tous les nombres dont le chiffre des unités est ${rule.v}.`;
    case 'dizaines':
      return `Colorie tous les nombres dont le chiffre des dizaines est ${rule.v}.`;
    case 'pas':
      return `Colorie de ${rule.step} en ${rule.step} : ${rule.from}, ${rule.from + rule.step}, ${rule.from + 2 * rule.step}… jusqu’à ${rule.to}.`;
    default:
      return null;
  }
}

const hbPathText = (from, path) => `Pars de ${from}. Suis les flèches : ${path.map((m) => ARROWS[m]).join(' ')}`;

// null when the board is good, else what is wrong
function hbProblem(hb) {
  if (!hb || !Number.isInteger(hb.start) || hb.start < 0) return 'no start';
  const rows = hb.rows || 10;
  if (!Number.isInteger(rows) || rows < 1 || rows > 10) return `rows ${rows} out of range`;
  const nums = hbNumbers(hb);
  const on = new Set(nums);
  if (hb.cells && hb.cells.some((n) => !Number.isInteger(n) || n < hb.start || n >= hb.start + rows * 10))
    return 'a cell is off the board';
  if (hb.shown && hb.shown.some((n) => !on.has(n))) return 'a shown number is off the board';

  if (hb.mode === 'find') {
    if (!on.has(hb.target)) return `target ${hb.target} is not on the board`;
    if (hb.path) {
      if (!on.has(hb.from)) return `start ${hb.from} is not on the board`;
      if (!hb.path.length) return 'empty path';
      const end = hbWalk(hb, hb.from, hb.path);
      if (end == null) return `the path from ${hb.from} leaves the board`;
      if (end !== hb.target) return `the path from ${hb.from} ends on ${end}, not ${hb.target}`;
      if (end === hb.from) return 'the path comes back to its start';
      if (hb.text !== hbPathText(hb.from, hb.path)) return `path text « ${hb.text} »`;
      // the start must be readable, else the pupil cannot know where to start
      if (hb.hide && !(hb.shown || []).includes(hb.from)) return 'the start number is hidden';
      if (hb.hide && (hb.shown || []).includes(hb.target)) return 'the answer is written on the board';
      return null;
    }
    if (!Array.isArray(hb.clues) || !hb.clues.length) return 'no clues and no path';
    for (const c of hb.clues) {
      if (hbClueText(c) == null) return `unknown clue ${c.k}`;
      if (c.text !== hbClueText(c)) return `clue text « ${c.text} » (expected « ${hbClueText(c)} »)`;
      if (!hbClueHolds(c, hb.target)) return `${hb.target} does not meet « ${c.text} »`;
    }
    const fits = nums.filter((n) => hb.clues.every((c) => hbClueHolds(c, n)));
    if (fits.length !== 1) return `${fits.length} numbers meet every clue (${fits.slice(0, 5).join(', ')})`;
    return null;
  }

  if (hb.mode === 'fill') {
    if (!Array.isArray(hb.blanks) || !hb.blanks.length) return 'no blanks';
    if (hb.blanks.some((n) => !on.has(n))) return 'a blank is off the board';
    if (new Set(hb.blanks).size !== hb.blanks.length) return 'the same blank twice';
    // something to start from: at least one number written
    const written = nums.filter((n) => !hb.blanks.includes(n) && (!hb.hide || (hb.shown || []).includes(n)));
    if (!written.length) return 'no number written to start from';
    // a morceau: the cells hold together (each touches another one)
    if (hb.cells && hb.cells.length > 1) {
      const near = (a, b) => {
        const [ra, ca] = hbAt(hb, a);
        const [rb, cb] = hbAt(hb, b);
        return Math.abs(ra - rb) + Math.abs(ca - cb) === 1;
      };
      if (hb.cells.some((a) => !hb.cells.some((b) => near(a, b)))) return 'a cell of the piece stands alone';
    }
    return null;
  }

  if (hb.mode === 'color') {
    if (!hb.rule || hbRuleText(hb.rule) == null) return 'unknown rule';
    if (hb.text !== hbRuleText(hb.rule)) return `rule text « ${hb.text} »`;
    const want = hbRuleCells(hb, hb.rule);
    if (want.length < 2) return 'fewer than 2 numbers to colour';
    const got = [...(hb.answer || [])].sort((a, b) => a - b);
    if (got.join(',') !== want.join(',')) return `answer ${got.join(',')} — the rule gives ${want.join(',')}`;
    return null;
  }

  return `unknown mode ${hb.mode}`;
}

module.exports = { hbWalk, hbClueText, hbRuleCells, hbProblem };
