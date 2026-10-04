/**
 * Generators — Logique — énigmes, grilles (futoshiki, kenken, numberlink), labyrinthes, diagrammes de Venn.
 * Browser: registers into window.AppGenerators (needs generators/_core.js first) · Node: module.exports
 */
(function (root) {
  const { rand, randItem, shuffle } =
    typeof module !== 'undefined' && module.exports ? require('./_core.js') : root.GenCore;

  const generators = {
    // Symbolic value MCQ: which emoji combination equals the target?
    enigmeSymboles: {
      generate() {
        const PAIRS = [
          { a: '🍎', va: 4, b: '🍊', vb: 1 },
          { a: '⭐', va: 10, b: '🌙', vb: 3 },
          { a: '🐝', va: 6, b: '🌸', vb: 2 },
          { a: '🏠', va: 7, b: '🌲', vb: 3 },
          { a: '🎯', va: 8, b: '💧', vb: 3 },
          { a: '🦋', va: 5, b: '🌈', vb: 2 },
          { a: '🐋', va: 9, b: '🐠', vb: 4 },
          { a: '🏆', va: 5, b: '🎖️', vb: 2 },
        ];
        const pair = randItem(PAIRS);
        const { a, va, b, vb } = pair;
        const na = rand(1, 3);
        const nb = rand(0, 3);
        const target = na * va + nb * vb;
        const fmt = (n1, n2) =>
          (n1 > 0 ? a.repeat(n1) : '') + (n1 > 0 && n2 > 0 ? ' ' : '') + (n2 > 0 ? b.repeat(n2) : '');
        const correct = fmt(na, nb);
        const seen = new Set([target]);
        const candidates = [];
        for (let da = -2; da <= 2; da++) {
          for (let db = -2; db <= 2; db++) {
            if (da === 0 && db === 0) continue;
            const na2 = na + da,
              nb2 = nb + db;
            if (na2 < 0 || nb2 < 0 || na2 > 4 || nb2 > 4) continue;
            if (na2 === 0 && nb2 === 0) continue;
            const val = na2 * va + nb2 * vb;
            if (!seen.has(val)) {
              seen.add(val);
              candidates.push(fmt(na2, nb2));
            }
          }
        }
        const distractors = candidates.sort(() => Math.random() - 0.5).slice(0, 3);
        const choices = [correct, ...distractors].sort(() => Math.random() - 0.5);
        return {
          type: 'mcq',
          title: `${a} vaut **${va}** et ${b} vaut **${vb}**. Quelle combinaison vaut **${target}** ?`,
          mcqChoices: choices,
          mcqAnswer: choices.indexOf(correct),
          mcqCompact: true,
          answers: [String(target)],
        };
      },
    },

    // equationsEmojis: emoji equation system — deduce each emoji's value line by line
    // params: unknowns (2|3, default 2), min (1), max (10),
    //   mult (false) — first line written "3 × 🍎" instead of "🍎 + 🍎 + 🍎"
    //   ask ('value') — 'value': last emoji alone | 'sum': all emojis added | 'priority': A + B × C (priorités)
    equationsEmojis: {
      generate(params = {}) {
        const THEMES = [
          ['🍎', '🍌', '🍒'],
          ['🐶', '🐱', '🐭'],
          ['⚽', '🏀', '🎾'],
          ['🍩', '🍪', '🧁'],
          ['🚗', '🚲', '🚀'],
          ['🌸', '🌻', '🌵'],
          ['🐸', '🐢', '🐙'],
          ['🍓', '🥕', '🍋'],
        ];
        const n = params.unknowns === 3 ? 3 : 2;
        const min = params.min ?? 1;
        const max = Math.max(params.max ?? 10, min + n - 1);
        const ask = params.ask ?? 'value';
        const e = shuffle(randItem(THEMES)).slice(0, n);
        const v = shuffle(Array.from({ length: max - min + 1 }, (_, i) => min + i)).slice(0, n);
        const rep = (emoji, k) => Array(k).fill(emoji).join(' + ');

        // Line 1: one emoji alone, repeated k times
        const k = rand(2, 4);
        const lines = [{ lhs: params.mult ? `${k} × ${e[0]}` : rep(e[0], k), rhs: k * v[0] }];
        // Next lines: each introduces one new emoji next to the previous (known) one
        for (let i = 1; i < n; i++) {
          const kNew = rand(1, 2);
          const parts = shuffle([e[i - 1], ...Array(kNew).fill(e[i])]);
          lines.push({ lhs: parts.join(' + '), rhs: v[i - 1] + kNew * v[i] });
        }

        let question, answer;
        if (ask === 'sum') {
          question = e.join(' + ');
          answer = v.reduce((s, x) => s + x, 0);
        } else if (ask === 'priority') {
          // A + B × C (or A + B × A with 2 unknowns) — multiplication first
          const c = n === 3 ? 2 : 0;
          question = `${e[0]} + ${e[1]} × ${e[c]}`;
          answer = v[0] + v[1] * v[c];
        } else {
          question = e[n - 1];
          answer = v[n - 1];
        }

        return {
          type: 'emoji-equations',
          eqLines: lines,
          eqQuestion: question,
          answers: [String(answer)],
        };
      },
    },

    /* ── Labyrinthe (Constraint Maze) ───────────────────────────────── */
    labyrinthe: {
      generate(params = {}) {
        const size = params.size || 4;
        const rulesDefs = {
          mult3: {
            label: 'Passe uniquement par les multiples de 3',
            rule: 'mult',
            param: 3,
            check: (n) => n % 3 === 0,
            pool: () => rand(1, 15) * 3,
            bad: () => {
              let n;
              do {
                n = rand(1, 50);
              } while (n % 3 === 0);
              return n;
            },
          },
          mult4: {
            label: 'Passe uniquement par les multiples de 4',
            rule: 'mult',
            param: 4,
            check: (n) => n % 4 === 0,
            pool: () => rand(1, 12) * 4,
            bad: () => {
              let n;
              do {
                n = rand(1, 50);
              } while (n % 4 === 0);
              return n;
            },
          },
          mult5: {
            label: 'Passe uniquement par les multiples de 5',
            rule: 'mult',
            param: 5,
            check: (n) => n % 5 === 0,
            pool: () => rand(1, 10) * 5,
            bad: () => {
              let n;
              do {
                n = rand(1, 50);
              } while (n % 5 === 0);
              return n;
            },
          },
          mult6: {
            label: 'Passe uniquement par les multiples de 6',
            rule: 'mult',
            param: 6,
            check: (n) => n % 6 === 0,
            pool: () => rand(1, 8) * 6,
            bad: () => {
              let n;
              do {
                n = rand(1, 50);
              } while (n % 6 === 0);
              return n;
            },
          },
          mult7: {
            label: 'Passe uniquement par les multiples de 7',
            rule: 'mult',
            param: 7,
            check: (n) => n % 7 === 0,
            pool: () => rand(1, 7) * 7,
            bad: () => {
              let n;
              do {
                n = rand(1, 50);
              } while (n % 7 === 0);
              return n;
            },
          },
          mult8: {
            label: 'Passe uniquement par les multiples de 8',
            rule: 'mult',
            param: 8,
            check: (n) => n % 8 === 0,
            pool: () => rand(1, 6) * 8,
            bad: () => {
              let n;
              do {
                n = rand(1, 50);
              } while (n % 8 === 0);
              return n;
            },
          },
          mult9: {
            label: 'Passe uniquement par les multiples de 9',
            rule: 'mult',
            param: 9,
            check: (n) => n % 9 === 0,
            pool: () => rand(1, 6) * 9,
            bad: () => {
              let n;
              do {
                n = rand(1, 50);
              } while (n % 9 === 0);
              return n;
            },
          },
          even: {
            label: 'Passe uniquement par les nombres pairs',
            rule: 'even',
            param: 2,
            check: (n) => n % 2 === 0,
            pool: () => rand(1, 25) * 2,
            bad: () => rand(0, 24) * 2 + 1,
          },
          odd: {
            label: 'Passe uniquement par les nombres impairs',
            rule: 'odd',
            param: undefined,
            check: (n) => n % 2 !== 0,
            pool: () => rand(0, 24) * 2 + 1,
            bad: () => rand(1, 25) * 2,
          },
        };
        const ruleKey = params.rule || randItem(Object.keys(rulesDefs));
        const r = rulesDefs[ruleKey];

        // Generate a random path from start to end
        const pathArr = [[0, 0]];
        let cr = 0,
          cc = 0;
        while (cr !== size - 1 || cc !== size - 1) {
          const moves = [];
          if (cr < size - 1) moves.push([cr + 1, cc]);
          if (cc < size - 1) moves.push([cr, cc + 1]);
          if (cr > 0 && Math.random() < 0.15 && !pathArr.some((p) => p[0] === cr - 1 && p[1] === cc))
            moves.push([cr - 1, cc]);
          if (cc > 0 && Math.random() < 0.15 && !pathArr.some((p) => p[0] === cr && p[1] === cc - 1))
            moves.push([cr, cc - 1]);
          const [nr, nc] = randItem(moves);
          if (!pathArr.some((p) => p[0] === nr && p[1] === nc)) {
            pathArr.push([nr, nc]);
            cr = nr;
            cc = nc;
          } else {
            if (cr < size - 1) {
              cr++;
              pathArr.push([cr, cc]);
            } else if (cc < size - 1) {
              cc++;
              pathArr.push([cr, cc]);
            }
          }
        }

        // Fill grid
        const grid = Array.from({ length: size }, () => Array(size).fill(0));
        const pathSet = new Set(pathArr.map(([pr, pc]) => `${pr},${pc}`));
        for (const [pr, pc] of pathArr) grid[pr][pc] = r.pool();
        for (let ri = 0; ri < size; ri++) {
          for (let ci = 0; ci < size; ci++) {
            if (pathSet.has(`${ri},${ci}`)) continue;
            const adjToPath = [
              [ri - 1, ci],
              [ri + 1, ci],
              [ri, ci - 1],
              [ri, ci + 1],
            ].some(([ar, ac]) => ar >= 0 && ar < size && ac >= 0 && ac < size && pathSet.has(`${ar},${ac}`));
            grid[ri][ci] = adjToPath ? r.bad() : Math.random() < 0.3 ? r.pool() : r.bad();
          }
        }

        return {
          type: 'maze',
          title: 'Trouve le chemin',
          maze: {
            grid,
            start: [0, 0],
            end: [size - 1, size - 1],
            rule: r.rule,
            ruleParam: r.param,
            ruleLabel: r.label,
          },
        };
      },
    },

    /* ── Futoshiki ──────────────────────────────────────────────────── */
    futoshikiPuzzle: {
      generate(params = {}) {
        const size = params.size || 4;
        // Build a valid latin square by shuffling rows/cols of the canonical solution
        const canonical = Array.from({ length: size }, (_, r) =>
          Array.from({ length: size }, (_, c) => ((r + c) % size) + 1)
        );
        const rowOrder = shuffle(Array.from({ length: size }, (_, i) => i));
        const colOrder = shuffle(Array.from({ length: size }, (_, i) => i));
        const solution = rowOrder.map((r) => colOrder.map((c) => canonical[r][c]));

        // Generate inequality constraints (random subset of adjacent pairs)
        const hConsRaw = [],
          vConsRaw = [];
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size - 1; c++) {
            if (Math.random() < 0.45) hConsRaw.push({ r, c, sign: solution[r][c] < solution[r][c + 1] ? '<' : '>' });
          }
          if (r < size - 1) {
            for (let c = 0; c < size; c++) {
              if (Math.random() < 0.45) vConsRaw.push({ r, c, sign: solution[r][c] < solution[r + 1][c] ? '<' : '>' });
            }
          }
        }

        // Reveal ~40% of cells as givens
        const givenCount = Math.max(2, Math.round(size * size * 0.38));
        const positions = shuffle(Array.from({ length: size * size }, (_, i) => i)).slice(0, givenCount);
        // Flat given array (null = blank, number = pre-filled) — same shape as eleventy processing block
        const given = Array(size * size).fill(null);
        positions.forEach((idx) => {
          given[idx] = solution[Math.floor(idx / size)][idx % size];
        });

        // Build rows structure for the template (same as eleventy block produces)
        const rows = [];
        for (let r = 0; r < size; r++) {
          const cells = Array.from({ length: size }, (_, c) => ({ given: given[r * size + c], idx: r * size + c }));
          const hCons = Array(size - 1).fill(null);
          hConsRaw
            .filter((h) => h.r === r)
            .forEach((h) => {
              hCons[h.c] = h.sign;
            });
          const vCons = r < size - 1 ? Array(size).fill(null) : null;
          if (vCons)
            vConsRaw
              .filter((v) => v.r === r)
              .forEach((v) => {
                vCons[v.c] = v.sign;
              });
          rows.push({ cells, hCons, vCons });
        }

        return {
          type: 'futoshiki',
          futoshiki: { size, given, rows, hCons: hConsRaw, vCons: vConsRaw },
          _solution: solution,
        };
      },
    },

    /* ── KenKen ─────────────────────────────────────────────────────── */
    kenkenPuzzle: {
      generate(params = {}) {
        const size = params.size || 3;
        // Build valid latin square
        const canonical = Array.from({ length: size }, (_, r) =>
          Array.from({ length: size }, (_, c) => ((r + c) % size) + 1)
        );
        const rowOrder = shuffle(Array.from({ length: size }, (_, i) => i));
        const colOrder = shuffle(Array.from({ length: size }, (_, i) => i));
        const sol = rowOrder.map((r) => colOrder.map((c) => canonical[r][c]));

        // Partition all cells into cages (dominoes + singles)
        const assigned = Array.from({ length: size }, () => Array(size).fill(-1));
        const cages = [];
        const allCells = shuffle(Array.from({ length: size * size }, (_, i) => [Math.floor(i / size), i % size]));

        for (const [r, c] of allCells) {
          if (assigned[r][c] >= 0) continue;
          const neighbours = [
            [r, c + 1],
            [r + 1, c],
          ].filter(([nr, nc]) => nr >= 0 && nr < size && nc >= 0 && nc < size && assigned[nr][nc] < 0);
          if (neighbours.length && Math.random() < 0.8) {
            const [nr, nc] = randItem(neighbours);
            const v1 = sol[r][c],
              v2 = sol[nr][nc];
            const ops = [
              { op: '+', target: v1 + v2 },
              { op: '-', target: Math.abs(v1 - v2) },
              { op: '×', target: v1 * v2 },
            ];
            if (v2 !== 0 && v1 % v2 === 0) ops.push({ op: '÷', target: v1 / v2 });
            if (v1 !== 0 && v2 % v1 === 0) ops.push({ op: '÷', target: v2 / v1 });
            const chosen = randItem(ops);
            const cageId = cages.length;
            cages.push({
              op: chosen.op,
              target: chosen.target,
              cells: [
                [r, c],
                [nr, nc],
              ],
              label: `${chosen.target}${chosen.op}`,
            });
            assigned[r][c] = cageId;
            assigned[nr][nc] = cageId;
          } else {
            const cageId = cages.length;
            cages.push({ op: '', target: sol[r][c], cells: [[r, c]], label: String(sol[r][c]) });
            assigned[r][c] = cageId;
          }
        }

        // Build cells 2D grid with cageId + label (same as eleventy block produces)
        const labelGrid = Array.from({ length: size }, () => Array(size).fill(''));
        cages.forEach((cage, ci) => {
          // top-left = min row then min col
          const tl = cage.cells.reduce((best, cur) =>
            cur[0] < best[0] || (cur[0] === best[0] && cur[1] < best[1]) ? cur : best
          );
          labelGrid[tl[0]][tl[1]] = cage.label;
          cage.cells.forEach(([cr, cc]) => {
            assigned[cr][cc] = ci;
          }); // reuse assigned for cageId
        });
        const cells = Array.from({ length: size }, (_, r) =>
          Array.from({ length: size }, (_, c) => ({ cageId: assigned[r][c], label: labelGrid[r][c] }))
        );

        return {
          type: 'kenken',
          kenken: { size, cells, cages },
          _solution: sol,
        };
      },
    },

    /* ── Numberlink ──────────────────────────────────────────────────── */
    numberlinkPuzzle: {
      // Solvable by construction: a random Hamiltonian path over the whole grid (backbite moves
      // from a boustrophedon path) is cut into segments of ≥ 3 cells; each segment's two ends
      // become a pair. The cut path is itself a valid solution covering every cell, which the
      // player requires. (The former hand-written puzzles were all unsolvable — see
      // docs/code-review-2026-09.md.)
      // params: size (5), pairs (size − 1)
      generate(params = {}) {
        const size = params.size || 5;
        const n = size * size;
        const numPairs = Math.max(2, Math.min(params.pairs || size - 1, Math.floor(n / 3)));

        // Boustrophedon start: row 0 left→right, row 1 right→left, …
        let path = [];
        for (let r = 0; r < size; r++) for (let k = 0; k < size; k++) path.push([r, r % 2 ? size - 1 - k : k]);

        // Backbite: link the head to one of its grid neighbours and drop the edge that closed the loop
        const same = (a, b) => a[0] === b[0] && a[1] === b[1];
        for (let it = 0; it < n * 30; it++) {
          if (Math.random() < 0.5) path.reverse();
          const [hr, hc] = path[0];
          const nbs = [
            [hr + 1, hc],
            [hr - 1, hc],
            [hr, hc + 1],
            [hr, hc - 1],
          ].filter(([r, c]) => r >= 0 && c >= 0 && r < size && c < size && !same([r, c], path[1]));
          if (!nbs.length) continue;
          const nb = randItem(nbs);
          const j = path.findIndex((p) => same(p, nb));
          path = path.slice(0, j).reverse().concat(path.slice(j));
        }

        // Cut into numPairs segments of length ≥ 3
        const lengths = Array(numPairs).fill(3);
        for (let extra = n - 3 * numPairs; extra > 0; extra--) lengths[rand(0, numPairs - 1)]++;
        const pairs = [];
        let at = 0;
        for (const len of lengths) {
          pairs.push([path[at], path[at + len - 1]]);
          at += len;
        }

        // Build rows grid (same as eleventy block produces): 0 = empty, N = pair number
        const rows = Array.from({ length: size }, () => Array(size).fill(0));
        pairs.forEach((pair, pi) => {
          rows[pair[0][0]][pair[0][1]] = pi + 1;
          rows[pair[1][0]][pair[1][1]] = pi + 1;
        });

        return {
          type: 'numberlink',
          numberlink: { size, rows, pairs },
        };
      },
    },

    /* ── Venn Diagram (Emoji Classification) ────────────────────────── */
    vennEmojis: {
      generate() {
        const themes = [
          {
            labelA: 'Est un animal',
            labelB: "Vit dans l'eau",
            items: [
              { char: '🐟', zone: 'ab' },
              { char: '🐬', zone: 'ab' },
              { char: '🐙', zone: 'ab' },
              { char: '🐶', zone: 'a' },
              { char: '🐱', zone: 'a' },
              { char: '🐻', zone: 'a' },
              { char: '🚢', zone: 'b' },
              { char: '🏊', zone: 'b' },
              { char: '🌳', zone: 'out' },
              { char: '🏠', zone: 'out' },
            ],
          },
          {
            labelA: 'A des roues',
            labelB: 'Est un véhicule',
            items: [
              { char: '🚗', zone: 'ab' },
              { char: '🚌', zone: 'ab' },
              { char: '🏍️', zone: 'ab' },
              { char: '🛒', zone: 'a' },
              { char: '🚲', zone: 'a' },
              { char: '🚢', zone: 'b' },
              { char: '✈️', zone: 'b' },
              { char: '🏠', zone: 'out' },
              { char: '🌲', zone: 'out' },
            ],
          },
          {
            labelA: 'Est un fruit',
            labelB: 'Est jaune',
            items: [
              { char: '🍌', zone: 'ab' },
              { char: '🍋', zone: 'ab' },
              { char: '🍎', zone: 'a' },
              { char: '🍇', zone: 'a' },
              { char: '🍓', zone: 'a' },
              { char: '⭐', zone: 'b' },
              { char: '🌻', zone: 'b' },
              { char: '🚗', zone: 'out' },
              { char: '📘', zone: 'out' },
            ],
          },
          {
            labelA: 'Est un aliment',
            labelB: 'Est sucré',
            items: [
              { char: '🍰', zone: 'ab' },
              { char: '🍫', zone: 'ab' },
              { char: '🍪', zone: 'ab' },
              { char: '🥕', zone: 'a' },
              { char: '🥦', zone: 'a' },
              { char: '🍭', zone: 'b' },
              { char: '🧁', zone: 'b' },
              { char: '📚', zone: 'out' },
              { char: '⚽', zone: 'out' },
            ],
          },
          {
            labelA: 'Peut voler',
            labelB: 'Est un animal',
            items: [
              { char: '🦅', zone: 'ab' },
              { char: '🦋', zone: 'ab' },
              { char: '🐝', zone: 'ab' },
              { char: '✈️', zone: 'a' },
              { char: '🚁', zone: 'a' },
              { char: '🐕', zone: 'b' },
              { char: '🐈', zone: 'b' },
              { char: '🏠', zone: 'out' },
              { char: '📱', zone: 'out' },
            ],
          },
        ];
        const theme = randItem(themes);
        const byZone = { a: [], b: [], ab: [], out: [] };
        theme.items.forEach((it) => byZone[it.zone].push(it));
        const picked = [];
        for (const z of ['a', 'b', 'ab', 'out']) {
          if (byZone[z].length > 0) picked.push(randItem(byZone[z]));
        }
        const remaining = theme.items.filter((it) => !picked.includes(it));
        const extra = shuffle(remaining).slice(0, rand(2, 4));
        const items = shuffle([...picked, ...extra]);

        return {
          type: 'venn',
          title: 'Classe les emojis',
          venn: {
            labelA: theme.labelA,
            labelB: theme.labelB,
            items,
          },
        };
      },
    },

    /* ── Venn Diagram (Number Properties) ────────────────────────── */
    vennNombres: {
      generate(params = {}) {
        const level = params.level || 'CE2';

        function range(lo, hi) {
          const r = [];
          for (let i = lo; i <= hi; i++) r.push(i);
          return r;
        }

        const isMultOf = (k) => (n) => n % k === 0;
        const isDivOf = (k) => (n) => n > 0 && k % n === 0;
        const isPrime = (n) => {
          if (n < 2) return false;
          for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
          return true;
        };

        const themesByLevel = {
          CE1: [
            {
              labelA: 'Nombre pair',
              labelB: 'Inférieur à 10',
              predA: (n) => n % 2 === 0,
              predB: (n) => n < 10,
              pool: range(1, 20),
            },
            {
              labelA: 'Nombre pair',
              labelB: 'Multiple de 5',
              predA: (n) => n % 2 === 0,
              predB: isMultOf(5),
              pool: range(1, 20),
            },
            {
              labelA: 'Nombre impair',
              labelB: 'Supérieur à 10',
              predA: (n) => n % 2 !== 0,
              predB: (n) => n > 10,
              pool: range(1, 20),
            },
            {
              labelA: 'Inférieur à 10',
              labelB: 'Multiple de 3',
              predA: (n) => n < 10,
              predB: isMultOf(3),
              pool: range(1, 20),
            },
          ],
          CE2: [
            {
              labelA: 'Multiple de 2',
              labelB: 'Multiple de 3',
              predA: isMultOf(2),
              predB: isMultOf(3),
              pool: range(2, 30),
            },
            {
              labelA: 'Multiple de 5',
              labelB: 'Multiple de 2',
              predA: isMultOf(5),
              predB: isMultOf(2),
              pool: range(2, 40),
            },
            {
              labelA: 'Inférieur à 20',
              labelB: 'Multiple de 3',
              predA: (n) => n < 20,
              predB: isMultOf(3),
              pool: range(1, 35),
            },
            {
              labelA: 'Multiple de 2',
              labelB: 'Multiple de 5',
              predA: isMultOf(2),
              predB: isMultOf(5),
              pool: range(2, 40),
            },
            {
              labelA: 'Multiple de 3',
              labelB: 'Inférieur à 15',
              predA: isMultOf(3),
              predB: (n) => n < 15,
              pool: range(1, 30),
            },
          ],
          CM1: [
            {
              labelA: 'Multiple de 3',
              labelB: 'Multiple de 4',
              predA: isMultOf(3),
              predB: isMultOf(4),
              pool: range(1, 48),
            },
            {
              labelA: 'Diviseur de 24',
              labelB: 'Diviseur de 36',
              predA: isDivOf(24),
              predB: isDivOf(36),
              pool: range(1, 24),
            },
            {
              labelA: 'Nombre premier',
              labelB: 'Nombre impair',
              predA: isPrime,
              predB: (n) => n % 2 !== 0,
              pool: range(1, 30),
            },
            {
              labelA: 'Multiple de 3',
              labelB: 'Multiple de 6',
              predA: isMultOf(3),
              predB: isMultOf(6),
              pool: range(1, 36),
            },
            {
              labelA: 'Multiple de 4',
              labelB: 'Multiple de 6',
              predA: isMultOf(4),
              predB: isMultOf(6),
              pool: range(2, 48),
            },
          ],
          CM2: [
            {
              labelA: 'Multiple de 6',
              labelB: 'Multiple de 9',
              predA: isMultOf(6),
              predB: isMultOf(9),
              pool: range(1, 72),
            },
            {
              labelA: 'Diviseur de 36',
              labelB: 'Diviseur de 60',
              predA: isDivOf(36),
              predB: isDivOf(60),
              pool: range(1, 36),
            },
            {
              labelA: 'Multiple de 4',
              labelB: 'Multiple de 6',
              predA: isMultOf(4),
              predB: isMultOf(6),
              pool: range(2, 60),
            },
            {
              labelA: 'Multiple de 7',
              labelB: 'Multiple de 3',
              predA: isMultOf(7),
              predB: isMultOf(3),
              pool: range(1, 70),
            },
            {
              labelA: 'Nombre premier',
              labelB: 'Multiple de 2',
              predA: isPrime,
              predB: isMultOf(2),
              pool: range(1, 50),
            },
          ],
        };

        const themes = themesByLevel[level] || themesByLevel.CE2;
        const theme = randItem(themes);

        // Classify all pool numbers into zones
        const byZone = { a: [], b: [], ab: [], out: [] };
        for (const n of theme.pool) {
          const inA = theme.predA(n),
            inB = theme.predB(n);
          if (inA && inB) byZone.ab.push(n);
          else if (inA) byZone.a.push(n);
          else if (inB) byZone.b.push(n);
          else byZone.out.push(n);
        }

        // At least 2 from each non-empty zone
        const chosen = new Set();
        for (const z of ['a', 'b', 'ab', 'out']) {
          shuffle([...byZone[z]])
            .slice(0, Math.min(2, byZone[z].length))
            .forEach((n) => chosen.add(n));
        }

        // Fill to 8-10 total
        const target = rand(8, 10);
        shuffle(theme.pool.filter((n) => !chosen.has(n)))
          .slice(0, Math.max(0, target - chosen.size))
          .forEach((n) => chosen.add(n));

        const items = shuffle([...chosen]).map((n) => {
          const inA = theme.predA(n),
            inB = theme.predB(n);
          return { char: String(n), zone: inA && inB ? 'ab' : inA ? 'a' : inB ? 'b' : 'out' };
        });

        return {
          type: 'venn',
          title: 'Classe les nombres',
          venn: { labelA: theme.labelA, labelB: theme.labelB, items },
        };
      },
    },

    /* ── Venn Diagram (Geometric Shapes) ────────────────────────── */
    vennFormes: {
      generate(params = {}) {
        const level = params.level || 'CE2';

        // Each shape: Unicode char + boolean properties
        const shapes = {
          carre: { char: '■', quadri: true, allEqual: true, rightAngle: true, parallel: true },
          rect: { char: '▬', quadri: true, allEqual: false, rightAngle: true, parallel: true },
          losange: { char: '◆', quadri: true, allEqual: true, rightAngle: false, parallel: true },
          paralelo: { char: '▱', quadri: true, allEqual: false, rightAngle: false, parallel: true },
          trapeze: { char: '⏢', quadri: true, allEqual: false, rightAngle: false, parallel: false },
          triEqui: { char: '△', quadri: false, allEqual: true, rightAngle: false, parallel: false },
          triQqque: { char: '▲', quadri: false, allEqual: false, rightAngle: false, parallel: false },
          cercle: { char: '●', quadri: false, allEqual: false, rightAngle: false, parallel: false },
          hexagone: { char: '⬡', quadri: false, allEqual: true, rightAngle: false, parallel: false },
        };

        // Drawn figures: a font character cannot show whether sides are equal (△ and ▲ both look
        // equilateral, ◆ looks like a rotated square). Proportions make each property visible.
        const fig = (shape) =>
          `<svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" style="color:var(--p,#6366f1)">${shape}</svg>`;
        const poly = (pts) =>
          fig(
            `<polygon points="${pts}" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`
          );
        const SHAPE_SVG = {
          carre: poly('6,6 34,6 34,34 6,34'),
          rect: poly('2,12 38,12 38,28 2,28'),
          losange: poly('20,2 32,20 20,38 8,20'), // unequal diagonals: not a square
          paralelo: poly('12,10 38,10 28,30 2,30'),
          trapeze: poly('13,10 27,10 38,30 2,30'),
          triEqui: poly('3,33 37,33 20,3.6'),
          triQqque: poly('2,34 38,34 9,5'), // sides 36, 29.8, 41 — visibly unequal
          cercle: fig(
            '<circle cx="20" cy="20" r="16" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="2"/>'
          ),
          hexagone: poly('11,4.4 29,4.4 38,20 29,35.6 11,35.6 2,20'),
        };

        const themesByLevel = {
          CE2: [
            {
              labelA: 'A 4 côtés',
              labelB: 'A tous les côtés égaux',
              predA: (s) => s.quadri,
              predB: (s) => s.allEqual,
              pool: ['carre', 'rect', 'losange', 'paralelo', 'triEqui', 'triQqque', 'cercle'],
            },
          ],
          CM1: [
            {
              labelA: 'A deux paires de côtés parallèles',
              labelB: 'A tous les côtés égaux',
              predA: (s) => s.parallel,
              predB: (s) => s.allEqual,
              pool: ['carre', 'rect', 'losange', 'paralelo', 'triEqui', 'triQqque', 'cercle'],
            },
            {
              labelA: 'Est un quadrilatère',
              labelB: 'A tous les côtés égaux',
              predA: (s) => s.quadri,
              predB: (s) => s.allEqual,
              pool: ['carre', 'rect', 'losange', 'paralelo', 'trapeze', 'triEqui', 'triQqque', 'cercle', 'hexagone'],
            },
          ],
          CM2: [
            {
              labelA: 'A tous les côtés égaux',
              labelB: 'A des angles droits',
              predA: (s) => s.allEqual,
              predB: (s) => s.rightAngle,
              pool: ['carre', 'rect', 'losange', 'paralelo', 'triEqui', 'triQqque', 'cercle', 'hexagone'],
            },
            {
              labelA: 'Est un quadrilatère',
              labelB: 'A tous les côtés égaux',
              predA: (s) => s.quadri,
              predB: (s) => s.allEqual,
              pool: ['carre', 'rect', 'losange', 'paralelo', 'trapeze', 'triEqui', 'triQqque', 'cercle', 'hexagone'],
            },
          ],
        };

        const themes = themesByLevel[level] || themesByLevel.CE2;
        const theme = randItem(themes);

        const items = shuffle(theme.pool).map((key) => {
          const s = shapes[key];
          const inA = theme.predA(s),
            inB = theme.predB(s);
          return { char: s.char, svg: SHAPE_SVG[key], zone: inA && inB ? 'ab' : inA ? 'a' : inB ? 'b' : 'out' };
        });

        return {
          type: 'venn',
          title: 'Classe les figures',
          venn: { labelA: theme.labelA, labelB: theme.labelB, items },
        };
      },
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = generators;
  else Object.assign((root.AppGenerators = root.AppGenerators || {}), generators);
})(typeof window !== 'undefined' ? window : globalThis);
