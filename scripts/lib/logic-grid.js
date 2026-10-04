/**
 * Logic grids: is the grid solvable, with exactly one solution, from its clues?
 *
 * Clues are free French text, so only DIRECT clues are read — one person/thing of one axis and
 * the elements of the other axis it names:
 *   « Théo ne fait ni football ni tennis. »   → Théo ≠ Football, Théo ≠ Tennis
 *   « Maël préfère le rouge. »                → Maël = Rouge
 * Descriptive clues (« Adèle dribble avec un ballon orange ») name no element: the grid is then
 * reported as not checkable (left to the human check), never as wrong.
 */

const norm = (s) => String(s).normalize('NFD').replace(/\p{M}/gu, '').replace(/[’`]/g, "'").toLowerCase();

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mentions = (text, name) => new RegExp(`(^|[^a-z0-9])${escapeRe(norm(name))}([^a-z0-9]|$)`).test(text);
const NEGATION = /(^|[^a-z])(ne|n'|ni|pas|jamais)([^a-z]|$)/;

// Clue lines of the exercise body: markdown list items
function cluesOf(body) {
  return String(body)
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*(?:[-*]|\d+[.)])\s+(.+)/))
    .filter(Boolean)
    .map((m) => m[1].trim());
}

// → { col, rows, negated } (constraints between one column and the rows it names, or one row and
//   the columns it names), or null when the clue is not direct
function parseClue(clue, columns, rows) {
  const t = norm(clue);
  const cols = columns.filter((c) => mentions(t, c));
  const rws = rows.filter((r) => mentions(t, r));
  const negated = NEGATION.test(t);
  const pairs = [];
  if (cols.length === 1 && rws.length >= 1) for (const r of rws) pairs.push([cols[0], r]);
  else if (rws.length === 1 && cols.length >= 1) for (const c of cols) pairs.push([c, rws[0]]);
  else return null;
  if (!negated && pairs.length !== 1) return null; // « A aime X et Y »: not a one-to-one statement
  return { pairs, negated };
}

function permutations(arr) {
  if (arr.length <= 1) return [arr];
  return arr.flatMap((x, i) => permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p]));
}

/**
 * @returns {{ checked: false, reason: string } | { checked: true, solutions: Object[] }}
 *   solutions: every column → row assignment consistent with all the clues
 */
function solveGrid({ columns, rows, body }) {
  columns = columns.map(String);
  rows = rows.map(String);
  if (columns.length !== rows.length) return { checked: false, reason: 'not a one-to-one grid' };
  const clues = cluesOf(body);
  if (!clues.length) return { checked: false, reason: 'no clues' };
  const parsed = clues.map((c) => parseClue(c, columns, rows));
  const unreadable = clues.filter((_, i) => !parsed[i]);
  if (unreadable.length) return { checked: false, reason: `descriptive clue: « ${unreadable[0]} »` };

  const solutions = [];
  for (const perm of permutations(rows)) {
    const assign = Object.fromEntries(columns.map((c, i) => [c, perm[i]]));
    const ok = parsed.every(({ pairs, negated }) =>
      negated ? pairs.every(([c, r]) => assign[c] !== r) : pairs.every(([c, r]) => assign[c] === r)
    );
    if (ok) solutions.push(assign);
  }
  return { checked: true, solutions };
}

module.exports = { cluesOf, parseClue, solveGrid };
