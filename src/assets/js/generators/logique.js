/**
 * Generators — Logique — énigmes, grilles (futoshiki, kenken, numberlink, picross), labyrinthes, diagrammes de Venn,
 * jeux de stratégie contre l'ordinateur (jeuStrategie), Ferme la boîte aux dés (fermeLaBoite).
 * Browser: registers into window.AppGenerators (needs generators/_core.js first) · Node: module.exports
 */
(function (root) {
  const { rand, randItem, shuffle } =
    typeof module !== 'undefined' && module.exports ? require('./_core.js') : root.GenCore;

  // Picross pictures ('#' coloured), every one with a single solution (tests/picross.test.js)
  const PICROSS = {
    coeur5: { name: 'un cœur', emoji: '❤️', color: '#ef4444', rows: ['.#.#.', '#####', '#####', '.###.', '..#..'] },
    maison5: { name: 'une maison', emoji: '🏠', color: '#f97316', rows: ['..#..', '.###.', '#####', '.#.#.', '.###.'] },
    sapin5: { name: 'un sapin', emoji: '🎄', color: '#16a34a', rows: ['..#..', '.###.', '#####', '..#..', '..#..'] },
    poisson5: {
      name: 'un poisson',
      emoji: '🐟',
      color: '#0ea5e9',
      rows: ['.....', '.##.#', '####.', '.##.#', '.....'],
    },
    champignon5: {
      name: 'un champignon',
      emoji: '🍄',
      color: '#dc2626',
      rows: ['.###.', '#####', '#####', '..#..', '.###.'],
    },
    fleche5: { name: 'une flèche', emoji: '⬆️', color: '#8b5cf6', rows: ['..#..', '.###.', '#.#.#', '..#..', '..#..'] },
    chat5: { name: 'un chat', emoji: '🐱', color: '#f59e0b', rows: ['#...#', '#####', '#.#.#', '#####', '.###.'] },
    bateau5: { name: 'un bateau', emoji: '⛵', color: '#2563eb', rows: ['..#..', '..##.', '..###', '..#..', '#####'] },
    croix5: { name: 'une croix', emoji: '➕', color: '#e11d48', rows: ['..#..', '..#..', '#####', '..#..', '..#..'] },
    etoile5: { name: 'une étoile', emoji: '⭐', color: '#eab308', rows: ['..#..', '#####', '.###.', '.#.#.', '#...#'] },
    tasse5: { name: 'une tasse', emoji: '☕', color: '#92400e', rows: ['.....', '####.', '#####', '####.', '.##..'] },
    chat8: {
      name: 'un chat',
      emoji: '🐱',
      color: '#f59e0b',
      rows: ['.#....#.', '.##..##.', '.######.', '##.##.##', '########', '###..###', '.######.', '..####..'],
    },
    coeur8: {
      name: 'un cœur',
      emoji: '❤️',
      color: '#ef4444',
      rows: ['.##..##.', '########', '########', '########', '.######.', '..####..', '...##...', '........'],
    },
    maison8: {
      name: 'une maison',
      emoji: '🏠',
      color: '#f97316',
      rows: ['...##...', '..####..', '.######.', '########', '.#....#.', '.#.##.#.', '.#.##.#.', '.######.'],
    },
    sapin8: {
      name: 'un sapin',
      emoji: '🎄',
      color: '#16a34a',
      rows: ['...##...', '..####..', '.######.', '..####..', '.######.', '########', '...##...', '...##...'],
    },
    fusee8: {
      name: 'une fusée',
      emoji: '🚀',
      color: '#6366f1',
      rows: ['...##...', '..####..', '..#..#..', '..####..', '..####..', '.######.', '##.##.##', '#..##..#'],
    },
    poisson8: {
      name: 'un poisson',
      emoji: '🐟',
      color: '#0ea5e9',
      rows: ['........', '..####..', '#.######', '####.###', '#.######', '..####..', '........', '........'],
    },
    bateau8: {
      name: 'un bateau',
      emoji: '⛵',
      color: '#2563eb',
      rows: ['...#....', '...##...', '...###..', '...####.', '...#....', '########', '.######.', '..####..'],
    },
    champignon8: {
      name: 'un champignon',
      emoji: '🍄',
      color: '#dc2626',
      rows: ['..####..', '.##..##.', '########', '#..##..#', '########', '..#..#..', '..#..#..', '..####..'],
    },
    papillon8: {
      name: 'un papillon',
      emoji: '🦋',
      color: '#a855f7',
      rows: ['##....##', '###..###', '########', '.######.', '..####..', '.######.', '###..###', '##....##'],
    },
    pomme10: {
      name: 'une pomme',
      emoji: '🍎',
      color: '#dc2626',
      rows: [
        '.....#....',
        '....#.....',
        '..##.###..',
        '.########.',
        '##########',
        '##########',
        '##########',
        '.########.',
        '.########.',
        '..##..##..',
      ],
    },
    sapin10: {
      name: 'un sapin',
      emoji: '🎄',
      color: '#16a34a',
      rows: [
        '....##....',
        '...####...',
        '..######..',
        '...####...',
        '..######..',
        '.########.',
        '..######..',
        '##########',
        '....##....',
        '....##....',
      ],
    },
    coeur10: {
      name: 'un cœur',
      emoji: '❤️',
      color: '#ef4444',
      rows: [
        '.###..###.',
        '##########',
        '##########',
        '##########',
        '##########',
        '.########.',
        '..######..',
        '...####...',
        '....##....',
        '..........',
      ],
    },
    fusee10: {
      name: 'une fusée',
      emoji: '🚀',
      color: '#6366f1',
      rows: [
        '....##....',
        '...####...',
        '...#..#...',
        '...####...',
        '...####...',
        '...####...',
        '..######..',
        '.##.##.##.',
        '.#..##..#.',
        '....##....',
      ],
    },
    maison10: {
      name: 'une maison',
      emoji: '🏠',
      color: '#f97316',
      rows: [
        '....##....',
        '...####...',
        '..######..',
        '.########.',
        '##########',
        '.#......#.',
        '.#.##.#.#.',
        '.#.##...#.',
        '.#.##...#.',
        '.########.',
      ],
    },
    chat10: {
      name: 'un chat',
      emoji: '🐱',
      color: '#f59e0b',
      rows: [
        '.#......#.',
        '.##....##.',
        '.########.',
        '.#.####.#.',
        '.########.',
        '.###..###.',
        '..######..',
        '..######..',
        '.########.',
        '##########',
      ],
    },
    etoile10: {
      name: 'une étoile',
      emoji: '⭐',
      color: '#eab308',
      rows: [
        '....##....',
        '....##....',
        '...####...',
        '##########',
        '.########.',
        '..######..',
        '..######..',
        '.###..###.',
        '.##....##.',
        '##......##',
      ],
    },
  };
  // A clue n written as a calculation with `op` (null when none fits): « 2+3 », « 8−3 », « 2×3 »,
  // « 12÷2 », « ½ de 12 », « 2,5+3,5 »
  function picrossLabel(op, n) {
    if (op === '+') return n >= 2 ? ((a) => `${a}+${n - a}`)(rand(1, n - 1)) : null;
    if (op === '−') return ((b) => `${n + b}−${b}`)(rand(1, 9));
    if (op === '×') {
      const ds = [2, 3, 4, 5].filter((d) => n % d === 0 && n / d >= 2);
      return ds.length ? ((d) => `${n / d}×${d}`)(randItem(ds)) : null;
    }
    if (op === '÷') return ((d) => `${n * d}÷${d}`)(rand(2, 9));
    if (op === 'frac') {
      const ways = [`½ de ${2 * n}`, `¼ de ${4 * n}`, `⅓ de ${3 * n}`];
      if (n % 3 === 0) ways.push(`¾ de ${(4 * n) / 3}`);
      if (n % 2 === 0) ways.push(`⅔ de ${(3 * n) / 2}`);
      return randItem(ways);
    }
    if (op === 'dec') return n >= 2 ? ((a) => `${a},5+${n - a - 1},5`)(rand(0, n - 2)) : null;
    return null;
  }

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

    /* ── Robot sur quadrillage (codage de déplacements) ─────────────── */
    // mode follow: where does the program end? · write: compose a program to the goal · debug: find
    // the wrong instruction. compact: « 3 → » counts · relative: avance / tourne (robot heading)
    // city: 7×7 town plan, houses between streets, the goal is a place
    robotGrille: {
      generate(params = {}) {
        const mode = params.mode || 'follow';
        const relative = !!params.relative;
        const city = !!params.city;
        const rows = city ? 7 : params.rows || params.size || 5;
        const cols = city ? 7 : params.cols || params.size || 5;
        const steps = params.steps || 4; // instructions in the program (follow / debug)
        const maxCount = params.compact ? params.maxCount || 3 : 1;
        const DR = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] };
        const ABS = { N: 'U', E: 'R', S: 'D', W: 'L' };
        const HEAD = 'NESW';
        const PLACES = [
          ['🏫', "l'école"],
          ['🏥', "l'hôpital"],
          ['🥖', 'la boulangerie'],
          ['⛲', 'la fontaine'],
          ['📮', 'la boîte aux lettres'],
          ['🎠', 'le manège'],
        ];
        const key = (r, c) => r * cols + c;
        const tok = (h, n) => (relative ? 'F' : ABS[h]) + (n > 1 ? n : '');

        for (let attempt = 0; attempt < 400; attempt++) {
          const blocked = new Set();
          if (city) for (let r = 1; r < rows; r += 2) for (let c = 1; c < cols; c += 2) blocked.add(key(r, c));
          const free = (r, c) => r >= 0 && c >= 0 && r < rows && c < cols && !blocked.has(key(r, c));
          let r, c;
          do {
            r = rand(0, rows - 1);
            c = rand(0, cols - 1);
          } while (!free(r, c));
          const start = [r, c];
          const dir = relative ? randItem([...HEAD]) : undefined;

          // Random program: each leg goes straight n cells, the next leg turns (never straight back).
          // compact: one instruction per leg (« 3 → »); otherwise one arrow per cell (« → → → »)
          const program = [];
          const used = new Set([key(r, c)]);
          const moves = () => program.filter((t) => t[0] !== 'T').length;
          let h = dir || randItem([...HEAD]);
          let ok = true;
          for (let leg = 0; moves() < steps; leg++) {
            const options = [...HEAD].filter((d) => {
              if (leg && (d === h || HEAD.indexOf(d) === (HEAD.indexOf(h) + 2) % 4)) return false;
              if (relative && !leg && d !== h) return false; // a relative program starts with « avance »
              return free(r + DR[d][0], c + DR[d][1]);
            });
            if (!options.length) {
              ok = false;
              break;
            }
            const d = randItem(options);
            if (relative && d !== h) program.push((HEAD.indexOf(d) - HEAD.indexOf(h) + 4) % 4 === 1 ? 'TR' : 'TL');
            h = d;
            const want = params.compact ? rand(1, maxCount) : Math.min(rand(1, params.leg || 3), steps - moves());
            let n = 0;
            while (n < want && free(r + DR[d][0], c + DR[d][1])) {
              r += DR[d][0];
              c += DR[d][1];
              used.add(key(r, c));
              n++;
            }
            if (params.compact || relative) program.push(tok(d, n));
            else for (let k = 0; k < n; k++) program.push(tok(d, 1));
          }
          if (!ok || (r === start[0] && c === start[1])) continue;
          const end = [r, c];
          const prog = program;

          // Obstacles off the path (not in the city: its houses are the obstacles)
          const blocks = city
            ? [...blocked].map((k) => [Math.floor(k / cols), k % cols, randItem(['🏠', '🏡', '🏢', '🌳'])])
            : [];
          if (!city)
            for (let k = 0; k < (params.blocks || 0) * 20 && blocks.length < (params.blocks || 0); k++) {
              const br = rand(0, rows - 1),
                bc = rand(0, cols - 1);
              if (used.has(key(br, bc)) || blocks.some((b) => b[0] === br && b[1] === bc)) continue;
              if (mode === 'write' && Math.abs(br - start[0]) + Math.abs(bc - start[1]) < 2) continue;
              blocks.push([br, bc]);
            }
          if (!city) for (const b of blocks) blocked.add(key(b[0], b[1]));

          const place = city ? randItem(PLACES) : null;
          const board = { mode, rows, cols, start, ...(dir ? { dir } : {}), ...(blocks.length ? { blocks } : {}) };
          if (place) board.goalEmoji = place[0];
          const goalName = place ? `${place[1]} ${place[0]}` : 'l’étoile ⭐';

          if (mode === 'follow') {
            board.program = prog;
            return {
              type: 'grid-board',
              title: 'Où arrive le robot ? Clique sur la case.',
              board,
            };
          }

          board.goal = end;
          if (mode === 'write') {
            // Fewest single instructions (the buttons) from start to goal
            const st = (rr, cc, hh) => `${rr},${cc},${relative ? hh : ''}`;
            let frontier = [[start[0], start[1], dir || 'N']];
            const seen = new Set([st(...frontier[0])]);
            let dist = 0,
              found = false;
            while (frontier.length && !found) {
              const next = [];
              for (const [fr, fc, fh] of frontier) {
                if (fr === end[0] && fc === end[1]) found = true;
                const moves = relative
                  ? [
                      [fr + DR[fh][0], fc + DR[fh][1], fh],
                      [fr, fc, HEAD[(HEAD.indexOf(fh) + 3) % 4]],
                      [fr, fc, HEAD[(HEAD.indexOf(fh) + 1) % 4]],
                    ]
                  : [...HEAD].map((d) => [fr + DR[d][0], fc + DR[d][1], fh]);
                for (const m of moves) {
                  if (!free(m[0], m[1]) || seen.has(st(...m))) continue;
                  seen.add(st(...m));
                  next.push(m);
                }
              }
              if (!found) {
                frontier = next;
                dist++;
              }
            }
            if (!found || dist < (params.minSteps || (relative ? 4 : 3))) continue;
            if (params.slack != null) board.maxSteps = dist + params.slack;
            return {
              type: 'grid-board',
              title:
                `Écris un programme pour amener le robot sur ${goalName}` +
                (board.maxSteps ? ` en ${board.maxSteps} instructions au plus.` : '.'),
              board,
            };
          }

          // debug: one instruction is wrong (another direction, or for counts another number)
          const i = rand(0, prog.length - 1);
          const t = prog[i];
          const n = Number(t.slice(1)) || 1;
          const m = randItem(Array.from({ length: maxCount }, (_, k) => k + 1).filter((k) => k !== n));
          let alt;
          if (t === 'TL' || t === 'TR') alt = t === 'TL' ? 'TR' : 'TL';
          else if (maxCount > 1 && (relative || Math.random() < 0.5)) alt = t[0] + (m > 1 ? m : '');
          else if (!relative) alt = randItem(['U', 'D', 'L', 'R'].filter((x) => x !== t[0])) + t.slice(1);
          if (!alt || alt === t) continue;
          const buggy = prog.map((x, k) => (k === i ? alt : x));
          // The buggy run must stay on the grid and miss the goal; the bug must be the only fixable one
          const run = (p) => {
            let [rr, cc] = start;
            let hh = dir || 'N';
            for (const x of p) {
              if (x === 'TL' || x === 'TR') {
                hh = HEAD[(HEAD.indexOf(hh) + (x === 'TL' ? 3 : 1)) % 4];
                continue;
              }
              const d = x[0] === 'F' ? hh : { U: 'N', R: 'E', D: 'S', L: 'W' }[x[0]];
              for (let k = 0; k < (Number(x.slice(1)) || 1); k++) {
                rr += DR[d][0];
                cc += DR[d][1];
                if (!free(rr, cc)) return null;
              }
            }
            return [rr, cc];
          };
          const bEnd = run(buggy);
          if (!bEnd || (bEnd[0] === end[0] && bEnd[1] === end[1])) continue;
          const tokens = relative
            ? ['TL', 'TR', ...Array.from({ length: Math.max(rows, cols) }, (_, k) => 'F' + (k ? k + 1 : ''))]
            : ['U', 'D', 'L', 'R'].flatMap((d) =>
                Array.from({ length: Math.max(rows, cols) }, (_, k) => d + (k ? k + 1 : ''))
              );
          const fixes = buggy
            .map((x, k) =>
              tokens.some((o) => {
                if (o === x) return false;
                const e2 = run(buggy.map((y, j) => (j === k ? o : y)));
                return e2 && e2[0] === end[0] && e2[1] === end[1];
              })
                ? k
                : -1
            )
            .filter((k) => k >= 0);
          if (fixes.length !== 1 || fixes[0] !== i) continue;
          board.program = buggy;
          board.bug = i;
          return {
            type: 'grid-board',
            title: `Le robot devait arriver sur ${goalName}, mais une instruction est fausse. Clique dessus.`,
            board,
          };
        }
        throw new Error('robotGrille: no board found');
      },
    },

    /* ── Symétrie sur quadrillage (grid-board, mode mirror) ─────────── */
    // A connected figure on one side of an axis; colour its mirror image. axis: v, h, d, a, vh (v or h),
    // diag (d or a, square grid) or any. cells: [min, max] figure size. touch: the figure touches the
    // axis (false: kept apart from it). offCentre: the axis is not in the middle of the grid
    symetrieGrille: {
      generate(params = {}) {
        const [minN, maxN] = params.cells || [4, 7];
        const touch = params.touch !== false;
        const AXES = { vh: ['v', 'h'], diag: ['d', 'a'], any: ['v', 'h', 'd', 'a'] };
        for (let attempt = 0; attempt < 400; attempt++) {
          const axis = randItem(AXES[params.axis || 'vh'] || [params.axis]);
          const diag = axis === 'd' || axis === 'a';
          const size = params.size || 7;
          const rows = diag ? size : params.rows || (axis === 'v' ? 6 : 8);
          const cols = diag ? size : params.cols || (axis === 'v' ? 8 : 6);
          const n = axis === 'v' ? cols : rows;
          // Off centre: within the middle third, so both sides leave room for a figure
          const at = diag ? undefined : params.offCentre ? rand(Math.round(n / 3), n - Math.round(n / 3)) : n / 2;
          if (!diag && !Number.isInteger(at)) throw new Error('symetrieGrille: odd grid needs offCentre');
          const mirror = ([r, c]) =>
            axis === 'v'
              ? [r, 2 * at - 1 - c]
              : axis === 'h'
                ? [2 * at - 1 - r, c]
                : axis === 'd'
                  ? [c, r]
                  : [cols - 1 - c, rows - 1 - r];
          // Signed distance to the axis, in cells: ±0.5 next to a grid line, 0 on a diagonal
          const dist = ([r, c]) =>
            axis === 'v' ? c - at + 0.5 : axis === 'h' ? r - at + 0.5 : axis === 'd' ? r - c : r + c - (cols - 1);
          // The figure on the larger side of an off-centre axis (−1: before it, 1: after it)
          const side = diag || 2 * at === n ? randItem([-1, 1]) : 2 * at < n ? 1 : -1;
          const near = (p) => Math.abs(dist(p)) <= 0.5;
          const ok = (p) => {
            const [r, c] = p;
            const [mr, mc] = mirror(p);
            if (r < 0 || c < 0 || r >= rows || c >= cols || mr < 0 || mc < 0 || mr >= rows || mc >= cols) return false;
            if (dist(p) * side < 0) return false;
            return touch || Math.abs(dist(p)) > 1;
          };
          const region = [];
          for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (ok([r, c])) region.push([r, c]);
          const seeds = touch ? region.filter(near) : region;
          if (!seeds.length) continue;
          const shape = [randItem(seeds)];
          const has = (p) => shape.some((k) => k[0] === p[0] && k[1] === p[1]);
          const want = rand(minN, maxN);
          while (shape.length < want) {
            const next = shape
              .flatMap(([r, c]) => [
                [r - 1, c],
                [r + 1, c],
                [r, c - 1],
                [r, c + 1],
              ])
              .filter((p) => ok(p) && !has(p));
            if (!next.length) break;
            shape.push(randItem(next));
          }
          const toColour = shape.filter((p) => dist(p) !== 0).length;
          const spans = (i) => new Set(shape.map((p) => p[i])).size > 1; // not a straight line
          if (shape.length < minN || toColour < 2 || !spans(0) || !spans(1)) continue;
          const board = { mode: 'mirror', rows, cols, axis, shape };
          if (!diag) board.at = at;
          return {
            type: 'grid-board',
            title: 'Colorie les cases pour que la figure soit symétrique par rapport à la droite rouge.',
            board,
          };
        }
        throw new Error('symetrieGrille: no figure found');
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
    // params: size (3), ops (['+', '-', '×', '÷'] — e.g. ['+', '-'] before × and ÷ are taught)
    kenkenPuzzle: {
      generate(params = {}) {
        const size = params.size || 3;
        const allowed = params.ops || ['+', '-', '×', '÷'];
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
            const chosen = randItem(ops.filter((o) => allowed.includes(o.op)));
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
              { char: '🚲', zone: 'ab' },
              { char: '🚢', zone: 'b' },
              { char: '✈️', zone: 'ab' },
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
          // Every zone has an obvious answer (« aliment / sucré » had none for « sucré seulement »: a
          // cupcake is food too)
          {
            labelA: 'Est un légume',
            labelB: 'Est vert',
            items: [
              { char: '🥦', zone: 'ab' },
              { char: '🥒', zone: 'ab' },
              { char: '🥬', zone: 'ab' },
              { char: '🥕', zone: 'a' },
              { char: '🍆', zone: 'a' },
              { char: '🍏', zone: 'b' },
              { char: '🐸', zone: 'b' },
              { char: '🌳', zone: 'b' },
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

    // jeuStrategie: strategy-game — course à N (say the next number by adding one of `moves`, who says
    //   N wins) or allumettes (take `moves` sticks, who takes the last one wins — loses when misere)
    //   against the computer. The pupil gets the seat that can always win (the computer starts when
    //   the start is a losing position); the computer plays its best move with probability smart.
    //   kind (course), total (20, or [min, max]), moves ([1, 2], or a list of sets to pick from),
    //   misere (false), smart (1)
    jeuStrategie: {
      generate(params = {}) {
        const total = Array.isArray(params.total) ? rand(params.total[0], params.total[1]) : params.total || 20;
        const moves = Array.isArray(params.moves?.[0]) ? randItem(params.moves) : params.moves || [1, 2];
        const misere = !!params.misere;
        // win[r]: the player to move with r steps left can force a win (scripts/lib/strategy-game.js)
        const win = [misere];
        for (let r = 1; r <= total; r++) win[r] = moves.some((m) => m <= r && !win[r - m]);
        const sg = { kind: params.kind || 'course', total, moves, misere, smart: params.smart ?? 1 };
        sg.first = win[total] ? 'eleve' : 'ordi';
        return { type: 'strategy-game', sg };
      },
    },

    // fermeLaBoite: dice-game — Ferme la boîte (shut the box): tiles 1…`tiles` (9), roll `dice` (2) dice, close
    //   open tiles that add up to the dice. oneDie (false): one die only once the open tiles make 6 or less.
    //   The round ends when no group of open tiles makes the dice; the score is what is left open.
    fermeLaBoite: {
      generate(params = {}) {
        const dg = { kind: 'boite', tiles: params.tiles || 9, dice: params.dice || 2 };
        if (params.oneDie) dg.oneDie = true;
        return { type: 'dice-game', dg };
      },
    },

    // picrossImage: picross — colour the cells so that each row and each column has the runs of its
    //   numbers; the picture appears. Pictures drawn by hand, each with one solution only (checked by
    //   scripts/lib/picross.js). size (5 | 8 | 10), pictures (names, default all of that size), labels
    //   (clues written as calculations worth the number: ['+', '−'], ['×', '÷'], ['frac', 'dec']…)
    picrossImage: {
      pictures: PICROSS,
      generate(params = {}) {
        const size = params.size || 5;
        const names = params.pictures || Object.keys(PICROSS).filter((k) => PICROSS[k].rows.length === size);
        const pic = PICROSS[randItem(names)];
        const runs = (line) => {
          const out = [];
          let n = 0;
          for (const c of line + '.') {
            if (c === '#') n++;
            else if (n) (out.push(n), (n = 0));
          }
          return out.length ? out : [0];
        };
        const rows = pic.rows.map(runs);
        const cols = [...pic.rows[0]].map((_, j) => runs(pic.rows.map((r) => r[j]).join('')));
        const px = { rows, cols, picture: pic.rows, name: pic.name, emoji: pic.emoji, color: pic.color };
        if (params.labels) {
          const label = (n) => {
            const ways = params.labels.map((op) => picrossLabel(op, n)).filter(Boolean);
            return ways.length ? randItem(ways) : String(n);
          };
          px.rowLabels = rows.map((c) => c.map(label));
          px.colLabels = cols.map((c) => c.map(label));
        }
        return { type: 'picross', px };
      },
    },

    // suiteQuarts: mcq — a row of figures cut in 4 (square grid, disc, square cut by its diagonals)
    // where the shaded quarter(s) turn by the same step each time: which figure comes next?
    // Quarters are numbered clockwise (data-q 0–3); step 1 = a quarter turn clockwise, 3 = anticlockwise.
    // params: shapes (carre | disque | croix), steps ([1], [1, 3], [1, 2, 3]), shaded ([1], [1, 2]: two
    // neighbouring quarters), shown (figures before the « ? », default 4)
    suiteQuarts: {
      generate(params = {}) {
        const shape = randItem(params.shapes || ['carre', 'disque', 'croix']);
        const step = randItem(params.steps || [1]);
        const count = randItem(params.shaded || [1]);
        const shown = params.shown || 4;
        const color = randItem([
          'var(--p,#6366f1)',
          'var(--red,#e11d48)',
          'var(--green,#3a9a55)',
          'var(--orange,#f97316)',
        ]);
        const s = 52,
          c = s / 2,
          r = c - 1;
        const pie = (i) => {
          const a0 = Math.PI * (1 + i / 2),
            a1 = a0 + Math.PI / 2,
            p = (a) => `${+(c + r * Math.cos(a)).toFixed(2)},${+(c + r * Math.sin(a)).toFixed(2)}`;
          return `<path d="M${c},${c}L${p(a0)}A${r},${r},0,0,1,${p(a1)}Z"`;
        };
        const QUARTER = {
          carre: (i) =>
            `<rect x="${i === 1 || i === 2 ? c : 1}" y="${i >= 2 ? c : 1}" width="${c - 1}" height="${c - 1}"`,
          disque: pie,
          croix: (i) =>
            `<polygon points="${[`1,1 ${s - 1},1`, `${s - 1},1 ${s - 1},${s - 1}`, `${s - 1},${s - 1} 1,${s - 1}`, `1,${s - 1} 1,1`][i]} ${c},${c}"`,
        };
        const fig = (on) =>
          `<svg viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" data-quarts="${shape}" aria-hidden="true"><g stroke="var(--ct,#334155)" stroke-width="1.5" stroke-linejoin="round">` +
          [0, 1, 2, 3]
            .map((i) => `${QUARTER[shape](i)} data-q="${i}" fill="${on.includes(i) ? color : 'var(--sf,#fff)'}"/>`)
            .join('') +
          `</g></svg>`;
        const at = (start) => Array.from({ length: count }, (_, k) => (start + k) % 4);
        const start = rand(0, 3);
        const row = Array.from({ length: shown }, (_, k) => fig(at(start + k * step)));
        const next = (start + shown * step) % 4;
        const order = shuffle([0, 1, 2, 3]);
        return {
          type: 'mcq',
          title: 'Quelle figure vient ensuite ?',
          body:
            `<div style="display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:.4rem">` +
            row.join('') +
            `<span style="display:inline-grid;place-items:center;width:${s}px;height:${s}px;border:2px dashed var(--cs,#94a3b8);border-radius:.4rem;font-size:1.5rem;font-weight:700">?</span></div>`,
          mcqChoices: order.map((q) => fig(at(q))),
          mcqAnswer: order.indexOf(next),
          mcqCompact: true,
        };
      },
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = generators;
  else Object.assign((root.AppGenerators = root.AppGenerators || {}), generators);
})(typeof window !== 'undefined' ? window : globalThis);
