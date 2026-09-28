/**
 * Solvability — every exercise of every series page can be solved, and a wrong answer is refused.
 *
 * For each exercise, a per-type solver writes the correct answer into the player state (the same
 * fields the inputs are bound to) and triggers validation the way the UI does (check(), mcqTap(),
 * mqCheck()…). This catches content whose expected answer is inconsistent with the data shown,
 * generators whose output the player cannot validate, and puzzles without a solution
 * (futoshiki / kenken / numberlink / maze are actually solved by search).
 *
 * The whole pass runs synchronously inside the page: no await between "set state", "validate"
 * and "read solvedFlags", so success/error timers (auto-advance, error flash) cannot interfere.
 *
 * Types without a solver are reported (annotation + test-results/solve-coverage/), not failed.
 * Requires _site/ to be built: npm run build:e2e (or simply `npm run check`).
 */
import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPages, waitForAlpine } from './pages.js';

const PAGES = discoverPages({ includeIndexes: false });
const COVERAGE_DIR = join(process.cwd(), 'test-results', 'solve-coverage');
const GEN_ROUNDS = 10; // fresh draws solved per generated series

// Runs in the browser. Must be self-contained (serialised by Playwright).
function solveAll() {
  const root = document.querySelector('[x-data^="seriesPlayer"]');
  if (!root || !window.Alpine) return null;
  const p = window.Alpine.$data(root);
  const WRONG = '-987654';
  // An expected answer that is null/undefined/NaN can never be typed by a student: fail, do not feed "null" back
  const str = (x) => {
    if (x === null || x === undefined || x === '' || Number.isNaN(x))
      throw new Error(`expected answer is missing (${x})`);
    return String(x);
  };
  const norm = (s) =>
    String(s ?? '')
      .replace(/\s/g, '')
      .replace(',', '.')
      .toLowerCase();

  // Answers list with the first element replaced by WRONG when w is true
  const spoil = (list, w) => list.map((x, k) => (w && k === 0 ? WRONG : str(x)));
  const setup = (i) => {
    p.currentIndex = i;
    p._setupCurrentExercise();
    p.showError = false;
  };

  // ── Search-based solvers ─────────────────────────────────────────────────
  function latin(size, given, ok) {
    const v = given.map((x) => (x == null || x === '' ? 0 : Number(x)));
    let budget = 500000;
    const place = (idx) => {
      if (idx === v.length) return true;
      if (v[idx]) return ok(v, idx) && place(idx + 1);
      const r = Math.floor(idx / size),
        c = idx % size;
      for (let n = 1; n <= size; n++) {
        if (--budget < 0) return false;
        let clash = false;
        for (let k = 0; k < size && !clash; k++) clash = v[r * size + k] === n || v[k * size + c] === n;
        if (clash) continue;
        v[idx] = n;
        if (ok(v, idx) && place(idx + 1)) return true;
        v[idx] = 0;
      }
      return false;
    };
    return place(0) ? v : null;
  }

  // Cells are filled in reading order, so each new cell is checked against its left and top
  // neighbours: hCons[c] sits between columns c and c+1, vCons[c] between rows r and r+1.
  function futoSolve(f) {
    const { size, rows } = f;
    const holds = (a, b, sign) => !sign || (sign === '<' ? a < b : a > b);
    const ok = (v, idx) => {
      const r = Math.floor(idx / size),
        c = idx % size;
      if (c > 0 && !holds(v[idx - 1], v[idx], (rows[r].hCons || [])[c - 1])) return false;
      if (r > 0 && !holds(v[idx - size], v[idx], (rows[r - 1].vCons || [])[c])) return false;
      return true;
    };
    return latin(size, f.given || Array(size * size).fill(null), ok);
  }

  function kenSolve(k) {
    const { size, cages } = k;
    const cageOf = {};
    cages.forEach((cg) => cg.cells.forEach(([r, c]) => (cageOf[r * size + c] = cg)));
    const ok = (v, idx) => {
      const cg = cageOf[idx];
      if (!cg) return true;
      const vals = cg.cells.map(([r, c]) => v[r * size + c]);
      if (vals.some((x) => !x)) return true;
      if (cg.op === '') return vals[0] === cg.target;
      if (cg.op === '+') return vals.reduce((s, x) => s + x, 0) === cg.target;
      if (cg.op === '×') return vals.reduce((s, x) => s * x, 1) === cg.target;
      if (cg.op === '-') return Math.abs(vals[0] - vals[1]) === cg.target;
      if (cg.op === '÷') return Math.max(...vals) / Math.min(...vals) === cg.target;
      return false;
    };
    return latin(size, Array(size * size).fill(0), ok);
  }

  function linkSolve(nl) {
    const { size, pairs } = nl;
    const owner = Array(size * size).fill(0);
    pairs.forEach(([a, b], k) => {
      owner[a[0] * size + a[1]] = k + 1;
      owner[b[0] * size + b[1]] = k + 1;
    });
    const paths = {};
    let budget = 300000;
    const nb = (i) => {
      const r = Math.floor(i / size),
        c = i % size,
        out = [];
      if (r > 0) out.push(i - size);
      if (r < size - 1) out.push(i + size);
      if (c > 0) out.push(i - 1);
      if (c < size - 1) out.push(i + 1);
      return out;
    };
    const route = (k) => {
      if (k === pairs.length) return owner.every(Boolean);
      const [a, b] = pairs[k];
      const start = a[0] * size + a[1],
        end = b[0] * size + b[1];
      const path = [start];
      const dfs = (cur) => {
        if (--budget < 0) return false;
        for (const n of nb(cur)) {
          if (n === end) {
            path.push(n);
            paths[k + 1] = path.map((i) => [Math.floor(i / size), i % size]);
            if (route(k + 1)) return true;
            path.pop();
            continue;
          }
          if (owner[n]) continue;
          owner[n] = k + 1;
          path.push(n);
          if (dfs(n)) return true;
          path.pop();
          owner[n] = 0;
        }
        return false;
      };
      return dfs(start);
    };
    return route(0) ? paths : null;
  }

  function mazeSolve(m) {
    const size = m.grid.length,
      okCell = p._mazeRuleCheck(m.rule, m.ruleParam);
    const key = ([r, c]) => r * size + c;
    const prev = { [key(m.start)]: null };
    const queue = [m.start];
    while (queue.length) {
      const [r, c] = queue.shift();
      if (r === m.end[0] && c === m.end[1]) break;
      for (const [dr, dc] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const n = [r + dr, c + dc];
        if (n[0] < 0 || n[1] < 0 || n[0] >= size || n[1] >= size || key(n) in prev) continue;
        if (!okCell(m.grid[n[0]][n[1]])) continue;
        prev[key(n)] = [r, c];
        queue.push(n);
      }
    }
    if (!(key(m.end) in prev)) return null;
    const path = [];
    for (let cur = m.end; cur; cur = prev[key(cur)]) path.unshift(cur);
    return path;
  }

  // Correct order of sort / drag-sort items, mirroring check()
  const toNum = (s) => parseFloat(String(s).replace(/\s/g, '').replace(',', '.'));
  const sortedIdx = (list, desc) =>
    list
      .map((v, i) => ({ v: toNum(v), i }))
      .sort((a, b) => (desc ? b.v - a.v : a.v - b.v))
      .map((x) => x.i);

  // ── Per-type solvers: (e, w) → validate; return 'no-wrong' when no wrong variant exists ──
  const S = {
    mcq: (e, w) => {
      if (!(e.mcqChoices?.length > 1)) throw new Error('mcqChoices missing');
      p.mcqTap(w ? (e.mcqAnswer + 1) % e.mcqChoices.length : e.mcqAnswer);
    },
    'compare-groups': (e, w) => p.groupsTap(w ? (e.cmpGroupAnswer + 1) % 3 : e.cmpGroupAnswer),
    'number-hunt': (e, w) => {
      if (w) return p.huntTap(e.grid.indexOf(2)); // 2 before 1: refused
      for (let n = 1; n <= e.count; n++) p.huntTap(e.grid.indexOf(n));
    },
    'function-machine': (e, w) => {
      if (e.machine.mode === 'compute') {
        p.fmInput = w ? WRONG : str(e.machine.answer);
        p.check();
      } else p.fmTap(w ? e.machine.answer + 1 : e.machine.answer);
    },
    'tile-select': (e, w) => {
      if (w && !e.tileAnswers?.length) return 'no-wrong';
      p.tileSelected = w ? e.tileAnswers.slice(1) : [...e.tileAnswers];
      p.check();
    },
    'svg-tiles': (e, w) => {
      if (w && !e.answers?.length) return 'no-wrong';
      p.svgSelected = (w ? e.answers.slice(1) : e.answers).map(Number);
      p.check();
    },
    checkbox: (e, w) => {
      const exp = e.checkedAnswers || [];
      if (w && !exp.length) return 'no-wrong';
      p.checkSelected = w ? exp.slice(1) : [...exp];
      p.check();
    },
    select: (e, w) => {
      p.selectAnswers = spoil(
        (e.selectStatements || []).map((s) => s.answer),
        w
      );
      p.check();
    },
    sort: (e, w) => {
      const items = e.items || [];
      const order = e.sortKeepOrder ? items.map((_, i) => i) : sortedIdx(items, e.direction === 'desc');
      const wanted = order.map((i) => items[i]);
      if (w) wanted.reverse();
      const used = new Set();
      p.sortPicked = wanted.map((v) => {
        const at = p.sortShuffled.findIndex((s, k) => s === v && !used.has(k));
        used.add(at);
        return at;
      });
      p.check();
      if (w && new Set(items.map(toNum)).size < 2) return 'no-wrong';
    },
    'drag-sort': (e, w) => {
      const order = sortedIdx(e.tiles || [], e.direction === 'desc');
      p.dragTilesOrder = w ? [...order].reverse() : order;
      p.check();
    },
    'fill-table': (e, w) => {
      let first = true;
      (e.table?.rows || []).forEach((row) =>
        row.forEach((cell) => {
          if (!cell.blank) return;
          p.tableInputs[cell.idx] = w && first ? WRONG : str(cell.answer);
          first = false;
        })
      );
      p.check();
    },
    futoshiki: (e, w) => {
      const sol = e._solution ? e._solution.flat() : futoSolve(e.futoshiki);
      if (!sol) throw new Error('no solution found');
      p.futoInputs = sol.map((x, k) => (w && k === 0 ? str((x % e.futoshiki.size) + 1) : str(x)));
      p.check();
    },
    kenken: (e, w) => {
      const sol = e._solution ? e._solution.flat() : kenSolve(e.kenken);
      if (!sol) throw new Error('no solution found');
      p.kkInputs = sol.map((x, k) => (w && k === 0 ? str((x % e.kenken.size) + 1) : str(x)));
      p.check();
    },
    numberlink: (e, w) => {
      const paths = linkSolve(e.numberlink);
      if (!paths) throw new Error('no solution found (or search budget exceeded)');
      p.nlkPaths = w ? {} : paths;
      p.check();
    },
    maze: (e, w) => {
      const path = mazeSolve(e.maze);
      if (!path) throw new Error('no path from start to end');
      p.mazePath = w ? path.slice(0, -1) : path;
      p.check();
    },
    'magic-color': (e, w) => {
      p.mcColors = (e.magicColor?.cells || []).map((c, k) => (w && k === 0 ? -1 : c.colorIdx));
      p.check();
    },
    venn: (e, w) => {
      p.vennPlacements = Object.fromEntries(e.venn.items.map((it, k) => [k, w && k === 0 ? '__' : it.zone]));
      p.check();
    },
    classify: (e, w) => {
      p.classifyPlacements = Object.fromEntries(e.items.map((it, k) => [k, w && k === 0 ? '__' : it.cat]));
      p.check();
    },
    'bar-chart': (e, w) => {
      if (e.bc.mode === 'build') {
        p.bcValues = e.bc.values.map((v, k) => (w && k === 0 ? v + 1 : v));
        return p.check();
      }
      e.bc.questions.forEach((q, k) => {
        p.bcInputs[k] = w && k === 0 ? WRONG : str(q.answer);
        p.bcCheck(k);
      });
    },
    'fraction-paint': (e, w) => {
      p.paintCells = Array.from({ length: e.denominator }, (_, k) => k < e.numerator + (w ? 1 : 0));
      p.check();
    },
    'click-blocks': (e, w) => {
      p.clickBlockLevels = (e.columns || []).map((c, k) => (w && k === 0 ? c.answer + 1 : c.answer));
      p.check();
    },
    matching: (e, w) => {
      const a = e.pairs.answers;
      if (w && a.length < 2) return 'no-wrong';
      p.matchConnections = a.map((r, l) => ({ left: l, right: w && l < 2 ? a[1 - l] : r }));
      p.check();
    },
    'logic-grid': (e, w) => {
      const g = e.grid,
        nc = g.columns.length;
      const cells = new Array(g.rows.length * nc).fill(0);
      g.solution.forEach((row, r) => row.forEach((on, c) => on && (cells[r * nc + c] = 2)));
      if (w) {
        const first = cells.indexOf(2);
        cells[first] = 0;
        cells[first - (first % nc) + (((first % nc) + 1) % nc)] = 2;
      }
      p.gridCells = cells;
      p.check();
    },
    'tri-arith': (e, w) => {
      const t = e.triangle,
        vals = [...t.vertices, ...t.edges],
        given = [...t.givenV, ...t.givenE];
      let first = true;
      p.triInputs = vals.map((v) => str(v));
      vals.forEach((v, k) => {
        if (!given[k] && w && first) {
          p.triInputs[k] = WRONG;
          first = false;
        }
      });
      p.check();
    },
    pyramid: (e, w) => {
      const py = e.pyramid;
      let first = true;
      py.rows.forEach((row, r) =>
        row.forEach((val, c) => {
          if (py.given[r][c]) return;
          p.pyramidInputs[p.pyramidFlatIdx(r, c)] = w && first ? WRONG : str(val);
          first = false;
        })
      );
      p.check();
    },
    'true-false': (e, w) => {
      p.tfInputs = (e.statements || []).map((s, k) => (w && k === 0 ? !s.answer : s.answer));
      p.check();
    },
    compare: (e, w) => {
      p.cmpInputs = (e.comparisons || []).map((c, k) => (w && k === 0 ? (c.answer === '<' ? '>' : '<') : c.answer));
      p.check();
    },
    seq: (e, w) => {
      const s = e.sequence || e.bounding || e.convert || e.forms || e.opTri;
      const ans = s.answers || s.items.filter((it) => it.blank).map((it) => it.answer);
      p.seqInputs = spoil(ans, w);
      p.check();
    },
    'calc-chain': (e, w) => {
      p.ccInputs = spoil(
        (e.chain?.steps || []).map((s) => s.answer),
        w
      );
      p.check();
    },
    'decimal-triple': (e, w) => {
      const KEYS = ['dizaines', 'unites', 'dixiemes', 'centiemes', 'milliemes'];
      const d = { fracNum: String(e.dtFrac?.num), fracDen: String(e.dtFrac?.den), decimal: String(e.dtDecimal) };
      (e.dtPlaces || []).forEach((v, k) => v !== null && (d[KEYS[k]] = str(v)));
      if (w) d[e.dtGiven === 'decimal' ? 'fracNum' : 'decimal'] = WRONG;
      p.dtInputs = d;
      p.check();
    },
    decomp: (e, w) => {
      p.decompInputs = spoil(
        (e.decomp?.parts || []).filter((x) => !x.comma).map((x) => x.answer),
        w
      );
      p.check();
    },
    'compare-solutions': (e, w) => {
      p.csSelected = w ? 1 - e.correctSolution : e.correctSolution;
      p.check();
    },
    'error-analysis': (e, w) => {
      p.eaStepSelected = e.wrongStep;
      p.eaCorrection = w ? WRONG : str(e.correction);
      p.check();
    },
    estimation: (e, w) => {
      p.estInput = str((e.estAnswers || [])[0]);
      p.userInput = w ? WRONG : str(e.answers[0]);
      p.check();
    },
    'fact-family': (e, w) => {
      p.ffInputs = spoil(
        (e.ffEquations || []).map((q) => q.answer),
        w
      );
      p.check();
    },
    'multi-question': (e, w) => {
      e.mqQuestions.forEach((q, k) => {
        p.mqInputs[k] = w && k === 0 ? WRONG : str(q.answer);
        p.mqCheck(k);
      });
    },
    'inverse-problem': (e, w) => {
      const ans = [e.ipBase.answer, ...e.ipInverses.map((x) => x.answer)];
      ans.forEach((a, k) => {
        p.ipInputs[k] = w && k === 0 ? WRONG : str(a);
        p.ipCheck(k);
      });
    },
    'guided-problem': (e, w) => {
      if (w) return 'no-wrong';
      for (const step of e.gpSteps || []) {
        if (step.tokens) p.gpAdvance();
        else if (step.choices) {
          if (!step.choices.some((c) => norm(c) === norm(step.answers[0])))
            throw new Error(`step answer "${step.answers[0]}" not among its choices`);
          p.gpAdvance();
        } else {
          p.gpInput = str(step.answers[0]);
          p.gpCheckInput();
        }
      }
    },
    'fraction-check': (e, w) => {
      const [n, d] = String(e.answers[0]).split('/');
      p.rfInputs = [w ? WRONG : n, d];
      p.check();
    },
    'coordinate-grid': (e, w) => {
      const [x, y] = String(e.answers[0]).split(',');
      if (e.cg?.mode === 'place') {
        p.cgPoint = { x: Number(x) + (w ? 1 : 0), y: Number(y) };
        return p.cgCheck();
      }
      p.cgInputs = [w ? WRONG : x.trim(), y.trim()];
      p.check();
    },
    'number-line': (e, w) => {
      if (e.nl?.mode === 'place') {
        p.nlVal = w ? -987654 : Number(e.answers[0]);
        return p.nlCheck();
      }
      return S.input(e, w);
    },
    'think-board': (e, w) => {
      p.tbStory = e.tbStoryKeyword || '';
      return S.input(e, w);
    },
    // number-check, problem, clock, fraction, base-10, ruler, bar-model, emoji-equations…
    input: (e, w) => {
      if (p.trouInputs.length > 0) {
        const n = p.trouInputs.length;
        p.trouInputs = spoil(n === 1 ? [e.answers[0]] : e.answers.slice(0, n), w);
      } else p.userInput = w ? WRONG : str(e.answers[0]);
      p.check();
    },
  };
  S['compare-expressions'] = S.compare;
  for (const t of ['sequence', 'bounding', 'convert', 'number-forms', 'op-triangle']) S[t] = S.seq;
  for (const t of ['number-check', 'problem', 'clock', 'fraction', 'base-10', 'ruler', 'thermometer']) S[t] = S.input;
  for (const t of ['bar-model', 'emoji-equations', 'count-objects', 'column-op']) S[t] = S.input;

  const out = { total: p.exercises.length, solved: 0, failed: [], acceptedWrong: [], unsupported: [] };
  for (let i = 0; i < p.exercises.length; i++) {
    setup(i);
    const e = p.cur,
      t = e.type || 'number-check',
      solver = S[t];
    const tag = `#${i + 1} (${t})`;
    if (!solver) {
      out.unsupported.push(t);
      continue;
    }
    try {
      const r = solver(e, true);
      if (r !== 'no-wrong' && p.solvedFlags[i]) out.acceptedWrong.push(tag);
      setup(i);
      p.solvedFlags[i] = false;
      solver(e, false);
      if (p.solvedFlags[i]) out.solved++;
      else out.failed.push(`${tag} correct answer refused`);
    } catch (err) {
      out.failed.push(`${tag} ${err.message}`);
    }
  }
  return out;
}

for (const { label, url } of PAGES) {
  test(`${label} — solvable`, async ({ page }) => {
    await page.goto(url);
    await waitForAlpine(page);
    const first = await page.evaluate(solveAll);
    if (!first) return; // not a series player page (défis use the timed player)

    // Generated series: a bug may only show on some draws — solve GEN_ROUNDS fresh draws
    const generated = await page.evaluate(() =>
      window.Alpine.$data(document.querySelector('[x-data^="seriesPlayer"]')).exercises.some((e) => e._gen)
    );
    const r = {
      failed: [...first.failed],
      acceptedWrong: [...first.acceptedWrong],
      unsupported: [...first.unsupported],
    };
    for (let round = 2; generated && round <= GEN_ROUNDS; round++) {
      await page.evaluate(() =>
        window.Alpine.$data(document.querySelector('[x-data^="seriesPlayer"]')).regenerateAll()
      );
      const next = await page.evaluate(solveAll);
      r.failed.push(...next.failed.map((f) => `draw ${round}: ${f}`));
      r.acceptedWrong.push(...next.acceptedWrong.map((f) => `draw ${round}: ${f}`));
      r.unsupported.push(...next.unsupported);
    }

    if (r.unsupported.length) {
      test.info().annotations.push({ type: 'unsupported', description: [...new Set(r.unsupported)].join(', ') });
      mkdirSync(COVERAGE_DIR, { recursive: true });
      writeFileSync(join(COVERAGE_DIR, label.replace('/', '__') + '.json'), JSON.stringify(r.unsupported));
    }
    const issues = [...r.failed, ...r.acceptedWrong.map((t) => `${t} wrong answer accepted`)];
    expect(issues, `Solvability issues on ${url}:\n  • ${issues.join('\n  • ')}`).toEqual([]);
  });
}
