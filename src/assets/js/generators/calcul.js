/**
 * Generators — Calcul mental — faits numériques, tables, compléments, stratégies (+9/+11, passer par 10), fluence.
 * Browser: registers into window.AppGenerators (needs generators/_core.js first) · Node: module.exports
 */
(function (root) {
  const { rand, randItem, shuffle, magicColorIdx } =
    typeof module !== 'undefined' && module.exports ? require('./_core.js') : root.GenCore;

  const generators = {
    sommesCibles: {
      generate: (params = {}) => {
        const target = params.target ?? 1000;
        const step = params.step ?? 100;
        const correctCount = params.correctCount ?? 3;
        const count = params.count ?? 8;

        const mkKey = (a, b) => `${Math.min(a, b)}+${Math.max(a, b)}`;
        const used = new Set();

        // Correct pairs: a + b = target, both multiples of step
        const corrects = [];
        for (let attempts = 0; corrects.length < correctCount && attempts < 200; attempts++) {
          const lo = step,
            hi = target - step;
          const slots = Math.floor((hi - lo) / step) + 1;
          if (slots < 1) break;
          const a = lo + rand(0, slots - 1) * step;
          const b = target - a;
          if (b <= 0) continue;
          const key = mkKey(a, b);
          if (used.has(key)) continue;
          used.add(key);
          corrects.push([a, b]);
        }

        // Incorrect pairs: sum ≠ target, same visual style
        const incorrects = [];
        for (let attempts = 0; incorrects.length < count - correctCount && attempts < 400; attempts++) {
          let a, b;
          if (step === 1) {
            // Arbitrary numbers: take valid pair and shift one addend by ±(1..50)
            const base = rand(Math.ceil(target * 0.1), Math.floor(target * 0.9));
            const offset = rand(1, Math.max(1, Math.floor(target * 0.05))) * (rand(0, 1) ? 1 : -1);
            a = base;
            b = target - base + offset; // a + b = target + offset ≠ target
          } else {
            const maxSteps = Math.floor(target / step / 3);
            const delta = rand(1, Math.max(1, maxSteps)) * step * (rand(0, 1) ? 1 : -1);
            const fake = target + delta;
            if (fake < step * 2) continue;
            const lo2 = step,
              hi2 = fake - step;
            if (hi2 < lo2) continue;
            const slots2 = Math.floor((hi2 - lo2) / step) + 1;
            a = lo2 + rand(0, slots2 - 1) * step;
            b = fake - a;
            if (b <= 0) continue;
          }
          if (a <= 0 || b <= 0) continue;
          if (a + b === target) continue;
          const key = mkKey(a, b);
          if (used.has(key)) continue;
          used.add(key);
          incorrects.push([a, b]);
        }

        const all = shuffle([...corrects.map((p) => ({ p, ok: true })), ...incorrects.map((p) => ({ p, ok: false }))]);

        const fmt = (n) => n.toLocaleString('fr-FR');
        return {
          type: 'tile-select',
          tiles: all.map(({ p }) => `${fmt(p[0])} + ${fmt(p[1])}`),
          tileAnswers: all.map(({ ok }, i) => (ok ? i : -1)).filter((i) => i !== -1),
          body: `Sélectionne toutes les cases dont le résultat est <strong>${fmt(target)}</strong>.`,
        };
      },
    },

    additionFacile: {
      generate: (params = {}) => {
        const a = rand(params.minA ?? 1, params.maxA ?? 5);
        const b = rand(params.minB ?? 1, params.maxB ?? 5);
        return { type: 'number-check', operation: `${a} + ${b}`, answers: [String(a + b)] };
      },
    },

    soustractionFacile: {
      generate: (params = {}) => {
        const a = rand(params.minA ?? 5, params.maxA ?? 10);
        const b = rand(params.minB ?? 1, params.maxB ?? 5);
        return { type: 'number-check', operation: `${a} - ${b}`, answers: [String(a - b)] };
      },
    },

    tablesSoustractionCP: {
      generate: (params = {}) => {
        const sub = rand(params.minSub ?? 0, params.maxSub ?? 9);
        const result = rand(params.minResult ?? 0, params.maxResult ?? 9);
        const a = sub + result;
        return { type: 'number-check', operation: `${a} - ${sub}`, answers: [String(result)] };
      },
    },

    ajouterSoustraire10: {
      generate: (params = {}) => {
        const n = rand(params.min ?? 1, params.max ?? 89);
        const add = Math.random() > 0.5;
        const op = add ? `${n} + 10 = ?` : `${n + 10} - 10 = ?`;
        return { type: 'number-check', operation: op, answers: [String(add ? n + 10 : n)] };
      },
    },

    tablesAdditionCP: {
      generate: (params = {}) => {
        const base = params.base ?? rand(params.minBase ?? 1, params.maxBase ?? 9);
        const addend = rand(params.minAdd ?? 0, params.maxAdd ?? 9);
        return { type: 'number-check', operation: `${base} + ${addend}`, answers: [String(base + addend)] };
      },
    },

    complements10: {
      generate: () => {
        const a = rand(1, 9);
        const b = 10 - a;
        const missing = Math.random() > 0.5 ? 'a' : 'b';
        const op = missing === 'a' ? `? + ${b} = 10` : `${a} + ? = 10`;
        return { type: 'number-check', operation: op, answers: [String(missing === 'a' ? a : b)] };
      },
    },

    doublesMoities: {
      generate: (params = {}) => {
        const n = rand(params.min ?? 1, params.max ?? 10);
        if (Math.random() > 0.5) {
          return { type: 'number-check', operation: `double de ${n} = ?`, answers: [String(n * 2)] };
        } else {
          const even = n * 2;
          return { type: 'number-check', operation: `moitié de ${even} = ?`, answers: [String(n)] };
        }
      },
    },

    ajouterSoustraire100: {
      generate: (params = {}) => {
        const n = rand(params.min ?? 1, params.max ?? 899);
        const add = Math.random() > 0.5;
        const op = add ? `${n} + 100 = ?` : `${n + 100} - 100 = ?`;
        return { type: 'number-check', operation: op, answers: [String(add ? n + 100 : n)] };
      },
    },

    // number-check: mental arithmetic on large numbers (add/subtract multiples of place values)
    // params: minVal (100000), maxVal (999999), ops (1), pvChoices, minCoef (1), maxCoef (9)
    // facile: ops=1, pvChoices=['milliers','centaines'], maxCoef=9
    // moyen:  ops=2, pvChoices=['dizaines de milliers','milliers','centaines'], maxCoef=9
    // difficile: ops=2, pvChoices=['milliers','centaines','dizaines'], minCoef=10, maxCoef=25
    calcMentalGrands: {
      generate(params = {}) {
        const PV = {
          unités: 1,
          dizaines: 10,
          centaines: 100,
          milliers: 1000,
          'dizaines de milliers': 10000,
          'centaines de milliers': 100000,
        };
        // French thousands separator (non-breaking space)
        const fmtNum = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');

        const minVal = params.minVal ?? 100000;
        const maxVal = params.maxVal ?? 999999;
        const opCount = params.ops ?? 1;
        const pvChoices = params.pvChoices ?? ['milliers', 'centaines'];
        const minCoef = params.minCoef ?? 1;
        const maxCoef = params.maxCoef ?? 9;

        let n = rand(minVal, maxVal);
        let result = n;
        const parts = [];
        const usedPV = new Set();

        for (let i = 0; i < opCount; i++) {
          // Pick a place value not already used this exercise
          let pv;
          let attempts = 0;
          do {
            pv = randItem(pvChoices);
            attempts++;
          } while (usedPV.has(pv) && attempts < 20);
          usedPV.add(pv);

          const pvVal = PV[pv];
          const coef = rand(minCoef, maxCoef);
          const canSub = result - coef * pvVal >= 0;
          const canAdd = result + coef * pvVal <= 9999999;
          const doAdd = canSub && canAdd ? Math.random() > 0.5 : !canSub;

          result += doAdd ? coef * pvVal : -(coef * pvVal);
          parts.push(`${doAdd ? 'Ajoute' : 'Enlève'} ${coef} ${pv}`);
        }

        return {
          type: 'number-check',
          title: fmtNum(n),
          operation: parts.join(' et '),
          answers: [String(result)],
        };
      },
    },

    comptageFruits: {
      generate(params = {}) {
        const pool = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍑', '🍒', '🍐', '🍌', '🍉'];
        const emoji = pool[rand(0, pool.length - 1)];
        const icons = (n) => Array(n).fill(emoji).join(' ');
        const mode = params.mode ?? 'emoji';
        if (mode === 'emoji') {
          const a = rand(params.minA ?? 1, params.maxA ?? 4);
          const b = rand(params.minB ?? 1, params.maxB ?? 4);
          return { type: 'number-check', operation: `${icons(a)} + ${icons(b)}`, answers: [String(a + b)] };
        }
        if (mode === 'add-trou') {
          const count = rand(params.countMin ?? 1, params.countMax ?? 5);
          const missing = rand(params.opMin ?? 1, params.opMax ?? 4);
          return {
            type: 'number-check',
            operation: `${icons(count)} + ? = ${count + missing}`,
            answers: [String(missing)],
          };
        }
        if (mode === 'sub-trou') {
          const total = rand(params.totalMin ?? 3, params.totalMax ?? 9);
          const remaining = rand(params.remainMin ?? 1, total - 1);
          const missing = total - remaining;
          return { type: 'number-check', operation: `${icons(total)} − ? = ${remaining}`, answers: [String(missing)] };
        }
        // mode: 'number' — emoji group + number
        const count = rand(params.countMin ?? 2, params.countMax ?? 6);
        const n = rand(params.opMin ?? 1, params.opMax ?? 4);
        return { type: 'number-check', operation: `${icons(count)} + ${n}`, answers: [String(count + n)] };
      },
    },

    comptageInsectes: {
      generate(params = {}) {
        const pool = ['🐞', '🐜', '🕷️', '🦗', '🦋', '🐝', '🐌', '🐛'];
        const emoji = pool[rand(0, pool.length - 1)];
        const count = rand(params.countMin ?? 2, params.countMax ?? 5);
        const opMin = params.opMin ?? 1;
        const opMax = params.opMax ?? 3;
        const canSub = count - 1 >= opMin;
        const useAdd = !canSub || Math.random() > 0.5;
        const icons = Array(count).fill(emoji).join(' ');
        if (useAdd) {
          const n = rand(opMin, opMax);
          return { type: 'number-check', operation: `${icons} + ${n}`, answers: [String(count + n)] };
        }
        const n = rand(opMin, Math.min(opMax, count - 1));
        return { type: 'number-check', operation: `${icons} − ${n}`, answers: [String(count - n)] };
      },
    },

    // grouper10: addition en passant par 10 — &box highlights the pair that makes 10
    // params: maxExtra (9)  — the third addend range (1..maxExtra)
    grouper10: {
      generate(params = {}) {
        const maxExtra = params.maxExtra ?? 9;
        // Pick a pair that sums to 10
        const a = Math.floor(Math.random() * 9) + 1; // 1..9
        const b = 10 - a;
        const c = Math.floor(Math.random() * maxExtra) + 1; // 1..maxExtra
        const answer = 10 + c;

        let operation;
        const r = Math.floor(Math.random() * 3);
        if (r === 0) {
          operation = `&box(${a} + ${b}) + ${c} = ?`;
        } else if (r === 1) {
          // Box each of the pair elements individually to hint they connect
          operation = `&box(${a}) + ${c} + &box(${b}) = ?`;
        } else {
          operation = `${c} + &box(${a} + ${b}) = ?`;
        }

        return {
          type: 'number-check',
          title: 'Calcule en groupant pour faire 10.',
          operation,
          answers: [String(answer)],
        };
      },
    },
    // add9ou11: +9 or +11 using the +10 then ±1 strategy, with jump arrow visual
    // params: min (11), max (50)
    add9ou11: {
      generate(params = {}) {
        const op = Math.random() < 0.5 ? 9 : 11;
        const min = params.min ?? 11;
        const max = params.max ?? 50;
        const start = min + Math.floor(Math.random() * (max - min + 1));
        const step2 = op === 9 ? -1 : 1;
        return {
          type: 'number-check',
          title: 'Utilise +10 puis corrige.',
          operation: `${start} + ${op} = ?`,
          answers: [String(start + op)],
          svg: { gen: 'jumpArrowSvg', par: { start, step1: 10, step2 } },
        };
      },
    },

    // sub9ou11: −9 or −11 using the −10 then ±1 strategy, with jump arrow visual
    // params: min (20), max (70)
    sub9ou11: {
      generate(params = {}) {
        const op = Math.random() < 0.5 ? 9 : 11;
        const min = params.min ?? 20;
        const max = params.max ?? 70;
        const start = min + Math.floor(Math.random() * (max - min + 1));
        const step2 = op === 9 ? 1 : -1;
        return {
          type: 'number-check',
          title: 'Utilise \u221210 puis corrige.',
          operation: `${start} \u2212 ${op} = ?`,
          answers: [String(start - op)],
          svg: { gen: 'jumpArrowSvg', par: { start, step1: -10, step2 } },
        };
      },
    },

    // add8ou12: +8 or +12 using the +10 then ±2 strategy
    // params: min (12), max (50)
    add8ou12: {
      generate(params = {}) {
        const op = Math.random() < 0.5 ? 8 : 12;
        const min = params.min ?? 12;
        const max = params.max ?? 50;
        const start = min + Math.floor(Math.random() * (max - min + 1));
        const step2 = op === 8 ? -2 : 2;
        return {
          type: 'number-check',
          title: 'Utilise +10 puis corrige.',
          operation: `${start} + ${op} = ?`,
          answers: [String(start + op)],
          svg: { gen: 'jumpArrowSvg', par: { start, step1: 10, step2 } },
        };
      },
    },

    // sub8ou12: −8 or −12 using the −10 then ±2 strategy
    // params: min (22), max (70)
    sub8ou12: {
      generate(params = {}) {
        const op = Math.random() < 0.5 ? 8 : 12;
        const min = params.min ?? 22;
        const max = params.max ?? 70;
        const start = min + Math.floor(Math.random() * (max - min + 1));
        const step2 = op === 8 ? 2 : -2;
        return {
          type: 'number-check',
          title: 'Utilise \u221210 puis corrige.',
          operation: `${start} \u2212 ${op} = ?`,
          answers: [String(start - op)],
          svg: { gen: 'jumpArrowSvg', par: { start, step1: -10, step2 } },
        };
      },
    },

    // astuceDizaineSup: add / subtract 8, 9, 18, 19 … 98, 99 by going to the next ten, then correcting
    //   467 + 99 → 467 + 100 − 1 ; 329 − 98 → 329 − 100 + 2  (CM2 « astuce » lesson)
    // params: level ('facile' → calc-chain with the two steps shown, 3-digit numbers |
    //   'moyen' → direct calculation, up to 4 digits, half the draws cross a hundred), op ('add'|'sub'|'mix')
    astuceDizaineSup: {
      generate(params = {}) {
        const level = params.level ?? 'facile';
        const opKind = params.op ?? 'mix';
        const add = opKind === 'add' || (opKind === 'mix' && Math.random() < 0.5);
        const fmtNum = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        const tens = rand(1, 10); // 9 … 99 → next ten 10 … 100
        const fix = randItem([1, 1, 2]); // ends in 9 more often than in 8
        const b = tens * 10 - fix;
        let a;
        if (level === 'moyen') {
          const lo = 120;
          const hi = rand(0, 1) ? 999 : 9899;
          a = rand(lo, hi);
          // Half the time the units of a are small enough that the result crosses a hundred
          if (Math.random() < 0.5) {
            const r = a % 100;
            if (add && r + b < 100) a += 100 - r - rand(1, 9);
            if (!add && r >= b) a -= r - rand(0, b - 1);
          }
        } else {
          a = add ? rand(101, 899) : rand(b + 101, 999);
        }
        const op = add ? '+' : '−';
        const result = add ? a + b : a - b;
        if (level === 'moyen') {
          return {
            type: 'number-check',
            title: 'Calcule de tête avec l’astuce.',
            operation: `${fmtNum(a)} ${op} ${b}`,
            answers: [String(result)],
          };
        }
        const round = tens * 10;
        const mid = add ? a + round : a - round;
        return {
          type: 'calc-chain',
          title: `Calcule ${a} ${op} ${b} avec l’astuce`,
          chain: {
            start: a,
            steps: [
              { op: `${op} ${round}`, answer: String(mid) },
              { op: `${add ? '−' : '+'} ${fix}`, answer: String(result) },
            ],
          },
        };
      },
    },

    // groupeA10: addition using the "make 10 first" strategy with &box() highlighting
    // params: level ('facile'|'moyen'|'difficile')
    groupeA10: {
      generate(params = {}) {
        const level = params.level ?? 'facile';
        const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
        const shuffle = (arr) => {
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
          return arr;
        };

        // Pick a complement pair that sums to 10
        const a = r(1, 9);
        const b = 10 - a;
        const box = `&box(${a} + ${b})`;

        if (level === 'facile') {
          // 3 terms: box + one extra (1-9)
          const c = r(1, 9);
          const terms = shuffle([box, String(c)]);
          return {
            type: 'number-check',
            title: 'Cherche la paire qui fait 10, puis calcule.',
            operation: terms.join(' + ') + ' = ?',
            answers: [String(10 + c)],
          };
        }

        if (level === 'moyen') {
          // 3 terms: box + one extra (2-19), any position
          const c = r(2, 19);
          const terms = shuffle([box, String(c)]);
          return {
            type: 'number-check',
            title: 'Groupe pour faire 10, puis calcule.',
            operation: terms.join(' + ') + ' = ?',
            answers: [String(10 + c)],
          };
        }

        // difficile: 4 terms — two extra numbers, box anywhere
        const c = r(1, 9);
        const d = r(1, 9);
        const terms = shuffle([box, String(c), String(d)]);
        return {
          type: 'number-check',
          title: 'Groupe pour faire 10, puis calcule.',
          operation: terms.join(' + ') + ' = ?',
          answers: [String(10 + c + d)],
        };
      },
    },

    // ─── Magic Color ─────────────────────────────────────────────────────────────
    // Pixel-art coloriage magique: a fixed pattern of color-index rows + a rule
    // that determines which numbers belong to each color zone. At CP level the
    // "label" mode is 'identity' — cells just show the number directly.
    magicColorGrid: {
      generate(params = {}) {
        const { pattern = ['0'], palette = ['#3b82f6'], rule = 'identity', min = 1, max = 20, labels = [] } = params;

        // Precompute candidate numbers per color index
        const numColors = palette.length;
        // 'direct' rule: cell shows 1, 2, 3… matching palette index 0, 1, 2…
        // Candidates are fixed; min/max from YAML are ignored.
        if (rule === 'direct') {
          const rows = pattern.map((row) => [...row].map(Number));
          const cols = rows[0].length;
          const cells = rows.flat().map((colorIdx) => ({
            colorIdx,
            value: colorIdx + 1,
          }));
          return { type: 'magic-color', magicColor: { cells, cols, palette, labels } };
        }
        const candidates = Array.from({ length: numColors }, () => []);
        for (let n = min; n <= max; n++) {
          const idx = magicColorIdx(rule, n, params);
          if (idx < numColors) candidates[idx].push(n);
        }

        // Parse compact string rows into flat cell array
        const rows = pattern.map((row) => [...row].map(Number));
        const cols = rows[0].length;
        const cells = rows.flat().map((colorIdx) => ({
          colorIdx,
          value: randItem(candidates[colorIdx].length ? candidates[colorIdx] : [min]),
        }));

        return {
          type: 'magic-color',
          magicColor: { cells, cols, palette, labels },
        };
      },
    },

    /* ── Fluency mix — daily mixed-operation drill ─────────── */
    fluencyMix: {
      generate: (params = {}) => {
        const level = params.level || 'ce2';
        const diff = params.difficulty || 'moyen';
        const t = 'number-check';

        // Difficulty multiplier: scales number ranges
        const sc = diff === 'facile' ? 0 : diff === 'difficile' ? 2 : 1;

        const mk = (operation, answers) => ({
          type: t,
          operation,
          answers: answers.map(String),
        });

        // ── CP ──────────────────────────────────────────────
        const cpPool = [
          // addition ≤ 10/20
          () => {
            const m = [10, 15, 20][sc],
              a = rand(1, m - 1),
              b = rand(1, m - a);
            return mk(`${a} + ${b}`, [a + b]);
          },
          // subtraction
          () => {
            const m = [10, 15, 20][sc],
              a = rand(2, m),
              b = rand(1, a);
            return mk(`${a} − ${b}`, [a - b]);
          },
          // complement to 10
          () => {
            const a = rand(1, 9);
            return mk(`${a} + ? = 10`, [10 - a]);
          },
          // doubles
          () => {
            const m = [5, 8, 10][sc],
              a = rand(1, m);
            return mk(`${a} + ${a}`, [a * a === a + a ? a + a : a + a]);
          },
          // +10 / −10
          () => {
            const a = rand(10, [30, 50, 80][sc]);
            const sub = Math.random() < 0.5;
            return sub ? mk(`${a} − 10`, [a - 10]) : mk(`${a} + 10`, [a + 10]);
          },
          // count by 2 (next)
          () => {
            const a = rand(0, [10, 16, 20][sc]) * 2;
            return mk(`${a} , ${a + 2} , ?`, [a + 4]);
          },
          // count by 5 (next)
          () => {
            const a = rand(0, [6, 10, 15][sc]) * 5;
            return mk(`${a} , ${a + 5} , ?`, [a + 10]);
          },
          // compare (which is bigger — returns the bigger one)
          () => {
            const a = rand(1, [15, 20, 30][sc]);
            let b;
            do {
              b = rand(1, [15, 20, 30][sc]);
            } while (b === a);
            return mk(`Le plus grand : ${a} ou ${b} ?`, [Math.max(a, b)]);
          },
        ];

        // ── CE1 ─────────────────────────────────────────────
        const ce1Pool = [
          // 2-digit addition
          () => {
            const m = [40, 60, 90][sc];
            const a = rand(10, m),
              b = rand(5, m);
            return mk(`${a} + ${b}`, [a + b]);
          },
          // 2-digit subtraction
          () => {
            const m = [40, 60, 90][sc];
            const a = rand(15, m + 10),
              b = rand(5, a - 1);
            return mk(`${a} − ${b}`, [a - b]);
          },
          // multiplication tables ×2,3,5,10
          () => {
            const tbl = randItem([2, 3, 5, 10]);
            const b = rand(1, [6, 8, 10][sc]);
            return mk(`${tbl} × ${b}`, [tbl * b]);
          },
          // complement to 100
          () => {
            const step = [10, 5, 1][sc];
            const a = rand(1, Math.floor(99 / step)) * step;
            return mk(`${a} + ? = 100`, [100 - a]);
          },
          // doubles & halves
          () => {
            const half = Math.random() < 0.5;
            const m = [20, 35, 50][sc];
            if (half) {
              const a = rand(2, m) * 2;
              return mk(`La moitié de ${a}`, [a / 2]);
            }
            const a = rand(2, m);
            return mk(`Le double de ${a}`, [a * 2]);
          },
          // +10/+100/−10/−100
          () => {
            const ops = [[10], [10, 100], [10, 100]][sc];
            const d = randItem(ops);
            const add = Math.random() < 0.5;
            const a = rand(d + 1, 500);
            return add ? mk(`${a} + ${d}`, [a + d]) : mk(`${a} − ${d}`, [a - d]);
          },
          // addition trou ≤ 20/50
          () => {
            const m = [20, 35, 50][sc];
            const total = rand(5, m);
            const a = rand(1, total - 1);
            return mk(`${a} + ? = ${total}`, [total - a]);
          },
          // skip counting by 2,3,5
          () => {
            const step = randItem([2, 3, 5]);
            const start = rand(0, 10) * step;
            return mk(`${start} , ${start + step} , ${start + 2 * step} , ?`, [start + 3 * step]);
          },
        ];

        // ── CE2 ─────────────────────────────────────────────
        const ce2Pool = [
          // multiplication tables 2–9
          () => {
            const a = rand(2, 9),
              b = rand(2, [7, 9, 12][sc]);
            return mk(`${a} × ${b}`, [a * b]);
          },
          // division facts
          () => {
            const d = rand(2, [5, 7, 9][sc]);
            const q = rand(1, [5, 8, 10][sc]);
            return mk(`${d * q} ÷ ${d}`, [q]);
          },
          // 2-digit × 1-digit
          () => {
            const a = rand([11, 12, 15][sc], [25, 40, 60][sc]);
            const b = rand(2, [4, 6, 9][sc]);
            return mk(`${a} × ${b}`, [a * b]);
          },
          // 3-digit add
          () => {
            const a = rand(100, [300, 500, 900][sc]);
            const b = rand(10, [100, 200, 300][sc]);
            return mk(`${a} + ${b}`, [a + b]);
          },
          // 3-digit sub
          () => {
            const a = rand(100, [300, 500, 900][sc]);
            const b = rand(10, a - 1);
            return mk(`${a} − ${b}`, [a - b]);
          },
          // doubles/halves
          () => {
            const half = Math.random() < 0.5;
            const m = [50, 100, 200][sc];
            if (half) {
              const a = rand(5, m) * 2;
              return mk(`La moitié de ${a}`, [a / 2]);
            }
            const a = rand(5, m);
            return mk(`Le double de ${a}`, [a * 2]);
          },
          // complement to 1000
          () => {
            const step = [100, 50, 10][sc];
            const a = rand(1, Math.floor(990 / step)) * step;
            return mk(`${a} + ? = 1 000`, [1000 - a]);
          },
          // fraction of number
          () => {
            const fracs = [
              [2, 1],
              [4, 1],
              [3, 1],
              [4, 3],
              [5, 1],
            ][sc === 0 ? 0 : rand(0, sc + 1)];
            const [d, n] = fracs || [2, 1];
            const base = rand(2, [5, 8, 12][sc]) * d;
            return mk(`&frac(${n},${d}) de ${base}`, [(n * base) / d]);
          },
        ];

        // ── CM1 ─────────────────────────────────────────────
        const cm1Pool = [
          // tables to 12
          () => {
            const a = rand(2, [9, 11, 12][sc]);
            const b = rand(2, 12);
            return mk(`${a} × ${b}`, [a * b]);
          },
          // ×10/100/1000
          () => {
            const p = randItem([10, 100, 1000]);
            const a = rand(1, [20, 50, 99][sc]);
            return mk(`${a} × ${p}`, [a * p]);
          },
          // ÷10/100/1000
          () => {
            const p = randItem([10, 100, 1000]);
            const q = rand(1, [20, 50, 99][sc]);
            return mk(`${q * p} ÷ ${p}`, [q]);
          },
          // decimal add (1dp)
          () => {
            const a = rand(10, [50, 80, 150][sc]) / 10;
            const b = rand(1, [30, 50, 80][sc]) / 10;
            const sum = Math.round((a + b) * 10) / 10;
            return mk(`${a.toFixed(1)} + ${b.toFixed(1)}`.replace(/\./g, ','), [String(sum).replace('.', ',')]);
          },
          // decimal sub (1dp)
          () => {
            const a = rand(30, [60, 100, 200][sc]) / 10;
            const b = rand(1, Math.floor(a * 10) - 1) / 10;
            const diff2 = Math.round((a - b) * 10) / 10;
            return mk(`${a.toFixed(1)} − ${b.toFixed(1)}`.replace(/\./g, ','), [String(diff2).replace('.', ',')]);
          },
          // fraction of N
          () => {
            const pairs = [
              [2, 1],
              [4, 1],
              [3, 1],
              [5, 2],
              [4, 3],
              [8, 3],
              [10, 3],
            ];
            const [d, n] = randItem(pairs.slice(0, [3, 5, 7][sc]));
            const base = rand(2, [6, 10, 15][sc]) * d;
            return mk(`&frac(${n},${d}) de ${base}`, [(n * base) / d]);
          },
          // complement to 1000
          () => {
            const a = rand(1, 99) * 10;
            return mk(`${a} + ? = 1 000`, [1000 - a]);
          },
          // rounding
          () => {
            const pow = randItem([10, 100]);
            const a = rand(pow + 1, pow * [10, 50, 100][sc]);
            const rounded = Math.round(a / pow) * pow;
            return mk(`Arrondir ${a} à la ${pow === 10 ? 'dizaine' : 'centaine'}`, [rounded]);
          },
          // 2d × 2d
          () => {
            const a = rand(11, [19, 25, 35][sc]);
            const b = rand(11, [15, 20, 25][sc]);
            return mk(`${a} × ${b}`, [a * b]);
          },
        ];

        // ── CM2 ─────────────────────────────────────────────
        const cm2Pool = [
          // decimal × whole
          () => {
            const a = rand(11, [30, 60, 99][sc]) / 10;
            const b = rand(2, [5, 7, 9][sc]);
            const prod = Math.round(a * b * 10) / 10;
            return mk(`${a.toFixed(1).replace('.', ',')} × ${b}`, [String(prod).replace('.', ',')]);
          },
          // decimal ÷ whole
          () => {
            const d = rand(2, [4, 5, 8][sc]);
            const q = rand(1, [20, 40, 60][sc]) / 10;
            const dividend = Math.round(q * d * 10) / 10;
            return mk(`${dividend.toFixed(1).replace('.', ',')} ÷ ${d}`, [String(q).replace('.', ',')]);
          },
          // fraction of N (complex)
          () => {
            const pairs = [
              [3, 2],
              [5, 3],
              [4, 3],
              [8, 5],
              [10, 7],
              [6, 5],
            ];
            const [d, n] = randItem(pairs.slice(0, [3, 5, 6][sc]));
            const base = rand(2, [5, 8, 12][sc]) * d;
            return mk(`&frac(${n},${d}) de ${base}`, [(n * base) / d]);
          },
          // percentage of N
          () => {
            const pcts = [10, 25, 50, 20, 75];
            const p = randItem(pcts.slice(0, [2, 4, 5][sc]));
            const base = rand(2, [10, 20, 40][sc]) * (100 / p >= 4 ? 4 : 1);
            const nice = Math.round(base / (100 / p)) * (100 / p);
            return mk(`${p} % de ${nice}`, [(nice * p) / 100]);
          },
          // conversions
          () => {
            const units = [
              ['km', 'm', 1000],
              ['m', 'cm', 100],
              ['kg', 'g', 1000],
              ['L', 'mL', 1000],
              ['m', 'mm', 1000],
              ['cm', 'mm', 10],
            ];
            const [from, to, factor] = randItem(units.slice(0, [3, 5, 6][sc]));
            const a = rand(1, [5, 10, 20][sc]);
            return mk(`${a} ${from} = ? ${to}`, [a * factor]);
          },
          // complement to 10 with decimals
          () => {
            const a = rand(1, 99) / 10;
            const comp = Math.round((10 - a) * 10) / 10;
            return mk(`${a.toFixed(1).replace('.', ',')} + ? = 10`, [String(comp).replace('.', ',')]);
          },
          // order of operations (simple)
          () => {
            const a = rand(2, [8, 12, 20][sc]);
            const b = rand(2, [5, 8, 10][sc]);
            const c = rand(1, [5, 8, 10][sc]);
            if (Math.random() < 0.5) {
              return mk(`${a} + ${b} × ${c}`, [a + b * c]);
            }
            return mk(`${b} × ${c} − ${a}`, [b * c - a]);
          },
          // decimal add/sub (2dp)
          () => {
            const a = rand(100, [300, 500, 900][sc]) / 100;
            const b = rand(10, [200, 300, 500][sc]) / 100;
            const sub = Math.random() < 0.5 && a > b;
            const res = sub ? Math.round((a - b) * 100) / 100 : Math.round((a + b) * 100) / 100;
            const op = sub ? '−' : '+';
            return mk(`${a.toFixed(2).replace('.', ',')} ${op} ${b.toFixed(2).replace('.', ',')}`, [
              String(res).replace('.', ','),
            ]);
          },
          // tables extended
          () => {
            const a = rand(2, 12);
            const b = rand(2, [9, 12, 15][sc]);
            return mk(`${a} × ${b}`, [a * b]);
          },
        ];

        const pools = { cp: cpPool, ce1: ce1Pool, ce2: ce2Pool, cm1: cm1Pool, cm2: cm2Pool };
        const pool = pools[level] || pools.ce2;
        return pool[rand(0, pool.length - 1)]();
      },
    },

    // equilibrerOp: balanced-equation exercises — fill the ? to make both sides equal
    // params: op ('add'|'sub'|'mult'), maxA (20), maxB (10), maxC (maxB)
    equilibrerOp: {
      generate(params = {}) {
        const op = params.op ?? 'add';
        const maxA = params.maxA ?? 20;
        const maxB = params.maxB ?? 10;
        const maxC = params.maxC ?? maxB;

        if (op === 'add') {
          const a = rand(1, maxA);
          const b = rand(1, maxB);
          const sum = a + b;
          // c must allow a positive answer and be different from a (avoid trivial a + b = a + b)
          let c, answer;
          let tries = 0;
          do {
            c = rand(1, Math.min(sum - 1, maxC));
            answer = sum - c;
            tries++;
          } while ((answer === a || c === b) && tries < 20);
          const side = Math.random() < 0.5;
          const first = Math.random() < 0.5;
          let operation;
          if (side) {
            // ? on right side
            operation = first ? `${a} + ${b} = ? + ${c}` : `${a} + ${b} = ${c} + ?`;
          } else {
            // ? on left side
            operation = first ? `? + ${c} = ${a} + ${b}` : `${c} + ? = ${a} + ${b}`;
          }
          return {
            type: 'number-check',
            title: "Complète l'équation.",
            operation,
            answers: [String(answer)],
          };
        }

        if (op === 'sub') {
          const b = rand(1, Math.min(maxB, maxA - 2));
          const a = rand(b + 1, maxA);
          const diff = a - b;
          const c = rand(1, maxC);
          const answer = diff + c; // a - b = answer - c
          const side = Math.random() < 0.5;
          const operation = side ? `${a} - ${b} = ? - ${c}` : `? - ${c} = ${a} - ${b}`;
          return {
            type: 'number-check',
            title: "Complète l'équation.",
            operation,
            answers: [String(answer)],
          };
        }

        if (op === 'mult') {
          let a, b, c, answer;
          let found = false;
          for (let attempt = 0; attempt < 50 && !found; attempt++) {
            a = rand(2, maxA);
            b = rand(2, maxB);
            const product = a * b;
            const divisors = [];
            for (let d = 2; d <= maxC; d++) {
              if (d !== b && product % d === 0) {
                const q = product / d;
                if (q !== a && q >= 2 && q <= maxA * 2) divisors.push(d);
              }
            }
            if (divisors.length > 0) {
              c = randItem(divisors);
              answer = product / c;
              found = true;
            }
          }
          if (!found) {
            a = 3;
            b = 4;
            c = 6;
            answer = 2;
          }
          const side = Math.random() < 0.5;
          const first = Math.random() < 0.5;
          let operation;
          if (side) {
            operation = first ? `${a} × ${b} = ? × ${c}` : `${a} × ${b} = ${c} × ?`;
          } else {
            operation = first ? `? × ${c} = ${a} × ${b}` : `${c} × ? = ${a} × ${b}`;
          }
          return {
            type: 'number-check',
            title: "Complète l'équation.",
            operation,
            answers: [String(answer)],
          };
        }
      },
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = generators;
  else Object.assign((root.AppGenerators = root.AppGenerators || {}), generators);
})(typeof window !== 'undefined' ? window : globalThis);
