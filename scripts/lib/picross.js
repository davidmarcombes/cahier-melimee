/**
 * Picross (nonogram) — the numbers beside each row and above each column give the runs of filled
 * cells in that line, in order. A puzzle is good when its clues have one solution only, so it can be
 * solved by reasoning (and the picture is the one meant). Independent of the generator (build,
 * validator, answer oracle).
 */

// Runs of filled cells of a line ('#.##' or [1, 0, 1, 1] → [1, 2]); an empty line is [0]
function runs(line) {
  const out = [];
  let n = 0;
  for (const c of line) {
    if (c === 1 || c === '#') n++;
    else if (n) (out.push(n), (n = 0));
  }
  if (n) out.push(n);
  return out.length ? out : [0];
}

// Every way to lay `clue` on a line of `len` cells that agrees with `known` (null unknown, 0, 1)
function placements(clue, len, known) {
  const runsOf = clue[0] === 0 ? [] : clue;
  const out = [];
  const line = new Array(len).fill(0);
  const fits = (from, to, v) => {
    for (let i = from; i < to; i++) if (known[i] !== null && known[i] !== v) return false;
    return true;
  };
  (function place(k, start) {
    if (k === runsOf.length) {
      if (fits(start, len, 0)) out.push([...line]);
      return;
    }
    const rest = runsOf.slice(k + 1).reduce((s, r) => s + r + 1, 0);
    for (let p = start; p + runsOf[k] + rest <= len; p++) {
      if (!fits(start, p, 0)) break;
      if (!fits(p, p + runsOf[k], 1)) continue;
      if (p + runsOf[k] < len && known[p + runsOf[k]] === 1) continue;
      for (let i = p; i < p + runsOf[k]; i++) line[i] = 1;
      place(k + 1, p + runsOf[k] + 1);
      for (let i = p; i < p + runsOf[k]; i++) line[i] = 0;
    }
  })(0, 0);
  return out;
}

// Number of solutions of the clues (stops at `limit`), and the first one found as '#.' strings
function pxSolve(rows, cols, limit = 2) {
  const h = rows.length;
  const w = cols.length;
  let found = 0;
  let first = null;
  const lineOf = (g, isRow, i) => (isRow ? g[i] : g.map((r) => r[i]));
  (function search(g) {
    // Line solving until nothing changes: cells that every placement agrees on
    for (let changed = true; changed;) {
      changed = false;
      for (const isRow of [true, false])
        for (let i = 0; i < (isRow ? h : w); i++) {
          const known = lineOf(g, isRow, i);
          if (!known.includes(null)) continue;
          const ps = placements(isRow ? rows[i] : cols[i], known.length, known);
          if (!ps.length) return;
          known.forEach((v, j) => {
            if (v !== null || !ps.every((p) => p[j] === ps[0][j])) return;
            if (isRow) g[i][j] = ps[0][j];
            else g[j][i] = ps[0][j];
            changed = true;
          });
        }
    }
    for (let i = 0; i < h; i++) if (placements(rows[i], w, g[i]).length === 0) return;
    for (let j = 0; j < w; j++) if (placements(cols[j], h, lineOf(g, false, j)).length === 0) return;
    const r = g.findIndex((row) => row.includes(null));
    if (r < 0) {
      found++;
      if (!first) first = g.map((row) => row.map((v) => (v ? '#' : '.')).join(''));
      return;
    }
    const c = g[r].indexOf(null);
    for (const v of [1, 0]) {
      if (found >= limit) return;
      const next = g.map((row) => [...row]);
      next[r][c] = v;
      search(next);
    }
  })(Array.from({ length: h }, () => new Array(w).fill(null)));
  return { count: found, solution: first };
}

// Clues of a picture given as '#.' rows
function pxClues(picture) {
  return {
    rows: picture.map((r) => runs(r)),
    cols: [...picture[0]].map((_, j) => runs(picture.map((r) => r[j]))),
  };
}

// null when the puzzle is good (clues match the picture, one solution, labels worth their number)
function pxProblem(px) {
  if (!px || !Array.isArray(px.rows) || !Array.isArray(px.cols)) return 'no row or column clues';
  const { rows, cols } = px;
  if (px.picture) {
    if (px.picture.length !== rows.length || px.picture.some((r) => r.length !== cols.length))
      return `the picture is not ${cols.length} × ${rows.length}`;
    const c = pxClues(px.picture);
    if (JSON.stringify(c.rows) !== JSON.stringify(rows) || JSON.stringify(c.cols) !== JSON.stringify(cols))
      return 'the clues do not match the picture';
  }
  const { count } = pxSolve(rows, cols);
  if (count === 0) return 'the clues have no solution';
  if (count > 1) return 'the clues have more than one solution';
  // Clues written as calculations: each one is worth its number
  for (const [key, clues] of [
    ['rowLabels', rows],
    ['colLabels', cols],
  ]) {
    if (!px[key]) continue;
    for (let i = 0; i < clues.length; i++)
      for (let k = 0; k < clues[i].length; k++) {
        const label = px[key][i] && px[key][i][k];
        const v = pxLabelValue(label);
        if (v !== clues[i][k]) return `${key}[${i}][${k}] « ${label} » is ${v}, not ${clues[i][k]}`;
      }
  }
  return null;
}

// Value of a clue label: « 7 », « 2+3 », « 9−4 », « 3×2 », « 12÷4 », « ¾ de 8 », « 2,5+1,5 »
function pxLabelValue(label) {
  if (label == null) return null;
  const s = String(label).replace(/\s+/g, ' ').trim();
  const num = (t) => Number(t.replace(',', '.'));
  const FR = { '½': 1 / 2, '⅓': 1 / 3, '¼': 1 / 4, '¾': 3 / 4, '⅔': 2 / 3, '⅕': 1 / 5, '⅒': 1 / 10 };
  let m = s.match(/^([½⅓¼¾⅔⅕⅒]) de (\d+)$/);
  if (m) return Math.round(FR[m[1]] * Number(m[2]) * 1e6) / 1e6;
  m = s.match(/^(\d+(?:,\d+)?) ?([+−×÷]) ?(\d+(?:,\d+)?)$/);
  if (m) {
    const [a, b] = [num(m[1]), num(m[3])];
    const r = { '+': a + b, '−': a - b, '×': a * b, '÷': a / b }[m[2]];
    return Math.round(r * 1e6) / 1e6;
  }
  return /^\d+$/.test(s) ? Number(s) : NaN;
}

module.exports = { runs, pxSolve, pxClues, pxProblem, pxLabelValue };
