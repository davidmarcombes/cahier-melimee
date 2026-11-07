/**
 * Generators — Opérations — ×, ÷, calculs à trous, pyramides, familles de faits, machines, proportionnalité, schémas.
 * Browser: registers into window.AppGenerators (needs generators/_core.js first) · Node: module.exports
 */
(function (root) {
  const { rand, randItem, shuffle, randUnique } =
    typeof module !== 'undefined' && module.exports ? require('./_core.js') : root.GenCore;

  const generators = {
    multiplicationSimple: {
      generate: (params = {}) => {
        let minA = params.minA ?? 2,
          maxA = params.maxA ?? 10;
        if (maxA < minA) [minA, maxA] = [maxA, minA];
        let minB = params.minB ?? 2,
          maxB = params.maxB ?? 12;
        if (maxB < minB) [minB, maxB] = [maxB, minB];
        const a = rand(minA, maxA),
          b = rand(minB, maxB);
        return { type: 'number-check', operation: `${a} \u00d7 ${b}`, answers: [String(a * b)] };
      },
    },

    additionSimple: {
      generate: (params = {}) => {
        let minA = params.minA ?? 10,
          maxA = params.maxA ?? 99;
        if (maxA < minA) [minA, maxA] = [maxA, minA];
        let minB = params.minB ?? 10,
          maxB = params.maxB ?? 99;
        if (maxB < minB) [minB, maxB] = [maxB, minB];
        const a = rand(minA, maxA),
          b = rand(minB, maxB);
        return { type: 'number-check', operation: `${a} + ${b}`, answers: [String(a + b)] };
      },
    },

    additionTrou: {
      generate: (params = {}) => {
        let minT = params.minTotal ?? 20,
          maxT = params.maxTotal ?? 100;
        if (maxT < minT) [minT, maxT] = [maxT, minT];
        const total = rand(minT, maxT);
        const a = rand(2, Math.max(2, total - 5));
        const b = total - a,
          missing = Math.random() > 0.5 ? 'a' : 'b';
        const op = missing === 'a' ? `? + ${b} = ${total}` : `${a} + ? = ${total}`;
        return { type: 'number-check', operation: op, answers: [String(missing === 'a' ? a : b)] };
      },
    },

    multiplicationTrou: {
      generate: (params = {}) => {
        const a = rand(params.minA ?? 2, params.maxA ?? 10);
        const b = rand(params.minB ?? 2, params.maxB ?? 10);
        const total = a * b;
        const missing = Math.random() > 0.5 ? 'a' : 'b';
        const op = missing === 'a' ? `? \u00d7 ${b} = ${total}` : `${a} \u00d7 ? = ${total}`;
        return { type: 'number-check', operation: op, answers: [String(missing === 'a' ? a : b)] };
      },
    },

    partagerEquitable: {
      generate: (params = {}) => {
        const EMOJIS = ['🍎', '🍬', '🏀', '⭐', '🌸', '🎈', '🍓', '🐣', '🌼', '🍕'];
        const emoji = randItem(EMOJIS);
        const parts = rand(params.minParts ?? 2, params.maxParts ?? 4);
        const q = rand(params.minQ ?? 2, params.maxQ ?? 6);
        const total = parts * q;
        const opTerms = Array(parts).fill('?').join(' + ');
        const answers = Array(parts).fill(String(q));
        return {
          type: 'number-check',
          svg: { gen: 'partagerSvg', par: { emoji, total, parts } },
          operation: `${opTerms} = ${total}`,
          answers,
          body: `<p class="text-xl mt-2">${parts} × ...... = ${total}</p>`,
        };
      },
    },

    divisionSimple: {
      generate: (params = {}) => {
        const b = rand(params.minDivisor ?? 2, params.maxDivisor ?? 5);
        const q = rand(params.minQuotient ?? 2, params.maxQuotient ?? 10);
        const a = q * b;
        return { type: 'number-check', operation: `${a} \u00f7 ${b}`, answers: [String(q)] };
      },
    },

    soustractionTrou: {
      generate: (params = {}) => {
        const result = rand(params.minResult ?? 0, params.maxResult ?? 9);
        const sub = rand(params.minSub ?? 1, params.maxSub ?? 9);
        const total = result + sub;
        const missing = Math.random() > 0.5 ? 'result' : 'sub';
        const op = missing === 'result' ? `${total} - ${sub} = ?` : `${total} - ? = ${result}`;
        return { type: 'number-check', operation: op, answers: [String(missing === 'result' ? result : sub)] };
      },
    },

    // Arithmetic triangle (Rechendreieck)
    // Vertices: [A(top), B(bottom-left), C(bottom-right)]
    // Edges:    [f=A+B(left), d=A+C(right), e=B+C(bottom)]
    // mode: 'easy'   — vertices given, fill 3 edges
    //       'medium' — 2 vertices + 1 edge given, fill rest (1 unknown vertex + 2 edges)
    //       'hard'   — 3 edges given, find all 3 vertices (A=(f+d-e)/2 etc., always integer)
    triArith: {
      generate(params = {}) {
        const mode = params.mode ?? 'easy';
        const min = params.min ?? 1;
        const max = params.max ?? 20;
        const isMult = params.op === 'mult';

        let A, B, C, f, d, e;
        if (isMult) {
          // edge = product of two vertices
          A = rand(min, max);
          B = rand(min, max);
          C = rand(min, max);
          f = A * B;
          d = A * C;
          e = B * C;
        } else {
          A = rand(min, max);
          B = rand(min, max);
          C = rand(min, max);
          f = A + B;
          d = A + C;
          e = B + C;
        }

        let givenV, givenE;
        if (mode === 'easy') {
          // all vertices shown, fill edges
          givenV = [true, true, true];
          givenE = [false, false, false];
        } else if (mode === 'hard') {
          // all edges shown, find vertices (always integer: A=(f+d-e)/2)
          givenV = [false, false, false];
          givenE = [true, true, true];
        } else {
          // medium: 2 vertices + 1 edge given → find 1 vertex + 2 edges
          // Always give B and C + edge f(=A+B) → student finds A=f−B, then d=A+C, e=B+C
          givenV = [false, true, true];
          givenE = [true, false, false];
        }

        return {
          type: 'tri-arith',
          triangle: { vertices: [A, B, C], edges: [f, d, e], givenV, givenE },
        };
      },
    },

    // Compare expressions — place <, =, > without computing
    // params: level ('add'|'mult'|'mix'), count (4), min (10), max (99), maxFactor (9)
    // Strategies:
    //   sameLeftAdd  : a+b vs a+c  (same base, different addend)
    //   sameLeftSub  : a−b vs a−c  (same base, subtract more → less)
    //   compensAdd   : a+b vs (a+k)+(b−k)  = always equal
    //   sameFactMult : a×b vs a×c
    //   sameDivDiv   : a÷b vs a÷c  (same dividend, smaller divisor → bigger)
    //   distribMult  : a×b vs a×(b−1)+a  = always equal
    //   compensMult  : a×b vs (a×2)×(b÷2)  = always equal (b even only)
    compareExpressions: {
      generate(params = {}) {
        const level = params.level ?? 'add';
        const count = params.count ?? 4;
        const min = params.min ?? 10;
        const max = params.max ?? 99;
        const maxFactor = params.maxFactor ?? 9;

        const byLevel = {
          add: ['sameLeftAdd', 'sameLeftSub', 'compensAdd'],
          mult: ['sameFactMult', 'sameDivDiv', 'distribMult', 'compensMult'],
          mix: ['sameLeftAdd', 'sameLeftSub', 'compensAdd', 'sameFactMult', 'sameDivDiv', 'distribMult'],
        };
        const pool = byLevel[level] ?? byLevel.add;

        const comparisons = [];
        let attempts = 0;
        while (comparisons.length < count && attempts < count * 10) {
          attempts++;
          const strategy = pool[Math.floor(Math.random() * pool.length)];
          let left, right, answer;

          if (strategy === 'sameLeftAdd') {
            const a = rand(min, max - 10);
            const b = rand(5, 30);
            const delta = rand(1, 5) * (Math.random() < 0.5 ? 1 : -1);
            const c = b + delta;
            if (c <= 0 || a + c > max + 50) continue;
            left = `${a} + ${b}`;
            right = `${a} + ${c}`;
            answer = delta > 0 ? '<' : '>'; // larger addend on right → right is bigger → left < right
          } else if (strategy === 'sameLeftSub') {
            const a = rand(min + 20, max);
            const b = rand(5, 20);
            const delta = rand(1, 5) * (Math.random() < 0.5 ? 1 : -1);
            const c = b + delta;
            if (c <= 0 || c >= a) continue;
            left = `${a} − ${b}`;
            right = `${a} − ${c}`;
            answer = delta > 0 ? '>' : '<'; // subtracting more on right → right is smaller → left > right
          } else if (strategy === 'compensAdd') {
            const a = rand(min, max - 20);
            const b = rand(10, 30);
            const k = rand(1, 5);
            if (b - k <= 0) continue;
            left = `${a} + ${b}`;
            right = `${a + k} + ${b - k}`;
            answer = '=';
          } else if (strategy === 'sameFactMult') {
            const a = rand(2, maxFactor);
            const b = rand(2, maxFactor);
            const delta = rand(1, 2) * (Math.random() < 0.5 ? 1 : -1);
            const c = b + delta;
            if (c < 2 || c > maxFactor + 2) continue;
            left = `${a} × ${b}`;
            right = `${a} × ${c}`;
            answer = delta > 0 ? '<' : '>'; // larger factor on right → right is bigger → left < right
          } else if (strategy === 'sameDivDiv') {
            const a = rand(2, maxFactor);
            const b = rand(2, maxFactor);
            if (a === b) continue;
            const dividend = a * b * rand(1, 2);
            left = `${dividend} ÷ ${a}`;
            right = `${dividend} ÷ ${b}`;
            answer = a < b ? '>' : '<'; // smaller divisor → bigger quotient
          } else if (strategy === 'distribMult') {
            const a = rand(2, maxFactor);
            const b = rand(3, maxFactor);
            if (Math.random() < 0.5) {
              left = `${a} × ${b}`;
              right = `${a} × ${b - 1} + ${a}`;
            } else {
              left = `${a} × ${b}`;
              right = `${a} × ${b + 1} − ${a}`;
            }
            answer = '=';
          } else if (strategy === 'compensMult') {
            const a = rand(2, Math.floor(maxFactor / 2));
            const b = rand(2, maxFactor);
            if (b % 2 !== 0) continue;
            left = `${a} × ${b}`;
            right = `${a * 2} × ${b / 2}`;
            answer = '=';
          }

          comparisons.push({ left, right, answer });
        }

        return { type: 'compare', comparisons };
      },
    },

    // comparerOpNombre: compare an operation result with a plain number
    // e.g. "6 × 4 [?] 30"  — student must compute then compare
    // params: ops (array: 'mult','div','add','sub'), count (4), maxFactor (9), min (10), max (50)
    comparerOpNombre: {
      generate(params = {}) {
        const ops = params.ops ?? ['mult'];
        const count = params.count ?? 4;
        const maxFactor = params.maxFactor ?? 9;
        const comparisons = [];

        for (let tries = 0; tries < count * 15 && comparisons.length < count; tries++) {
          const op = randItem(ops);
          let left, right, answer;

          if (op === 'mult') {
            const a = rand(2, maxFactor);
            const b = rand(2, maxFactor);
            const product = a * b;
            const delta = randItem([0, a, -a, b, -b, 1, -1]);
            const c = product + delta;
            if (c <= 0) continue;
            left = `${a} \u00d7 ${b}`;
            right = String(c);
            answer = delta === 0 ? '=' : delta < 0 ? '>' : '<';
          } else if (op === 'div') {
            const b = rand(2, maxFactor);
            const k = rand(2, maxFactor);
            const a = b * k;
            const delta = randItem([0, 1, -1, 2, -2]);
            const c = k + delta;
            if (c <= 0) continue;
            left = `${a} \u00f7 ${b}`;
            right = String(c);
            answer = delta === 0 ? '=' : delta < 0 ? '>' : '<';
          } else if (op === 'add') {
            const a = rand(params.min ?? 10, params.max ?? 50);
            const b = rand(5, 20);
            const sum = a + b;
            const delta = randItem([0, 1, -1, 2, -2, 5, -5]);
            const c = sum + delta;
            if (c <= 0) continue;
            left = `${a} + ${b}`;
            right = String(c);
            answer = delta === 0 ? '=' : delta < 0 ? '>' : '<';
          } else if (op === 'sub') {
            const a = rand(params.min ?? 20, params.max ?? 50);
            const b = rand(5, Math.max(6, a - 5));
            const diff = a - b;
            const delta = randItem([0, 1, -1, 2, -2]);
            const c = diff + delta;
            if (c < 0) continue;
            left = `${a} \u2212 ${b}`;
            right = String(c);
            answer = delta === 0 ? '=' : delta < 0 ? '>' : '<';
          }

          if (left !== undefined) comparisons.push({ left, right, answer });
        }

        return { type: 'compare', comparisons };
      },
    },

    divisionTrou: {
      generate: (params = {}) => {
        const b = rand(params.minDivisor ?? 2, params.maxDivisor ?? 9);
        const q = rand(params.minQuotient ?? 2, params.maxQuotient ?? 10);
        const a = q * b;
        const missing = Math.random() > 0.5 ? 'quotient' : 'dividend';
        const op = missing === 'quotient' ? `${a} \u00f7 ${b} = ?` : `? \u00f7 ${b} = ${q}`;
        return { type: 'number-check', operation: op, answers: [String(missing === 'quotient' ? q : a)] };
      },
    },

    soustractionSimple: {
      generate: (params = {}) => {
        const a = rand(params.minA ?? 10, params.maxA ?? 99);
        const b = rand(params.minB ?? 1, params.maxB ?? Math.min(a - 1, 99));
        return { type: 'number-check', operation: `${a} - ${b}`, answers: [String(a - b)] };
      },
    },

    // Familles de faits — coche les 4 équations qui appartiennent à la famille
    // params: mode ('add'|'mult'|'alterne'), min (1), max (20), maxFactor (9)
    famillesFaits: {
      generate(params = {}) {
        const mode = params.mode ?? 'add';
        const min = params.min ?? 1;
        const max = params.max ?? 20;
        const maxFactor = params.maxFactor ?? 9;
        const isMult = mode === 'mult' || (mode === 'alterne' && Math.random() < 0.5);

        const eq = (left, op, right, res) => `<span class="font-mono">${left} ${op} ${right} = ${res}</span>`;

        let correct, traps, title;

        if (isMult) {
          const a = rand(2, maxFactor);
          const b = rand(2, maxFactor);
          const c = a * b;
          title = `Coche les 4 égalités qui appartiennent à la même famille (${a}, ${b}, ${c}).`;
          correct = [eq(a, '×', b, c), eq(b, '×', a, c), eq(c, '÷', a, b), eq(c, '÷', b, a)];
          // Traps: wrong result in one mult and one div
          const d1 = rand(1, 2) * (Math.random() < 0.5 ? 1 : -1);
          const d2 = rand(1, 2) * (Math.random() < 0.5 ? 1 : -1);
          traps = [eq(a, '×', b, c + d1), eq(c, '÷', b, a + d2)];
        } else {
          const a = rand(min, max - min);
          const b = rand(min, max - a);
          const c = a + b;
          title = `Coche les 4 égalités qui appartiennent à la même famille (${a}, ${b}, ${c}).`;
          correct = [eq(a, '+', b, c), eq(b, '+', a, c), eq(c, '−', a, b), eq(c, '−', b, a)];
          // Traps: wrong result in one addition and one subtraction
          const d1 = rand(1, 2) * (Math.random() < 0.5 ? 1 : -1);
          const d2 = rand(1, 2) * (Math.random() < 0.5 ? 1 : -1);
          traps = [eq(a, '+', b, c + d1), eq(c, '−', a, b + d2)];
        }

        // Shuffle all 6 together, track correct indices
        const all = [...correct, ...traps];
        const shuffled = all.map((v, i) => ({ v, i })).sort(() => Math.random() - 0.5);
        const statements = shuffled.map((x) => x.v);
        const checkedAnswers = shuffled.map((x, pos) => (x.i < 4 ? pos : -1)).filter((p) => p !== -1);

        return { type: 'checkbox', title, statements, checkedAnswers };
      },
    },

    // siAlorsDivision (CE1–CM1): a known fact gives another one. « Si 9 × 3 = 27, alors… » then
    // « 27 ÷ ? = 9 » (the fact in the title, the blank in the operation).
    //   params: mode — div (× given, ÷ asked) | mult (÷ given, × asked) | list; holes (['dernier',
    //   'milieu', 'premier']: which number of the asked equation is blank), tables ([2…9]: one factor),
    //   maxQ (10: the other one), scale ([1]: 10 or 100 multiplies the dividend of the asked division,
    //   « Si 6 × 7 = 42, alors… 420 ÷ 7 = ? »)
    siAlorsDivision: {
      generate(params = {}) {
        const mode = randItem([].concat(params.mode ?? 'div'));
        const hole = randItem([].concat(params.holes ?? ['dernier', 'milieu', 'premier']));
        const b = randItem([].concat(params.tables ?? [2, 3, 4, 5, 6, 7, 8, 9]));
        const k = mode === 'div' ? randItem([].concat(params.scale ?? 1)) : 1;
        const a = rand(2, k > 1 ? Math.min(params.maxQ ?? 10, 9) : (params.maxQ ?? 10)); // no « 500 ÷ 10 » muddle
        const g = (n) => String(n).replace(/\B(?=(\d{3})+$)/g, '__');
        const [x, y] = Math.random() < 0.5 ? [a, b] : [b, a]; // the given fact, either order
        const blank = (terms, i) => terms.map((t, j) => (j === i ? '?' : g(t)));
        if (mode === 'mult') {
          // « Si 27 ÷ 3 = 9, alors… 9 × ? = 27 »
          const [p, q] = Math.random() < 0.5 ? [a, b] : [b, a];
          const i = { dernier: 2, milieu: 1, premier: 0 }[hole];
          const t = blank([p, q, a * b], i);
          return {
            type: 'number-check',
            title: `Si ${g(a * b)} ÷ ${b} = ${a}, alors…`.replace(/__/g, '\u00a0'),
            operation: `${t[0]} × ${t[1]} = ${t[2]}`,
            answers: [String([p, q, a * b][i])],
          };
        }
        // « Si 9 × 3 = 27, alors… 27 ÷ ? = 9 », the divisor either factor
        const d = Math.random() < 0.5 ? a : b;
        const terms = [a * b * k, d, ((a * b) / d) * k];
        const i = { dernier: 2, milieu: 1, premier: 0 }[hole];
        const t = blank(terms, i);
        return {
          type: 'number-check',
          title: `Si ${x} × ${y} = ${g(a * b)}, alors…`.replace(/__/g, '\u00a0'),
          operation: `${t[0]} ÷ ${t[1]} = ${t[2]}`,
          answers: [String(terms[i])],
        };
      },
    },

    // Vrai/Faux — opérations
    // params: ops (['+','-','×','÷']), min, max, maxFactor, count, trueRatio, style ('standard'|'relational')
    vraiFauxOps: {
      generate(params = {}) {
        const ops = params.ops ?? ['+', '-'];
        const min = params.min ?? 1;
        const max = params.max ?? 20;
        const maxFactor = params.maxFactor ?? 9;
        const count = params.count ?? 5;
        const trueRatio = params.trueRatio ?? 0.5;
        const style = params.style ?? 'standard';

        // Decide which slots are true (guaranteed trueRatio mix)
        const trueCount = Math.round(count * trueRatio);
        const answers = [...Array(trueCount).fill(true), ...Array(count - trueCount).fill(false)];
        for (let i = answers.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [answers[i], answers[j]] = [answers[j], answers[i]];
        }

        const SYM = { '+': '+', '-': '−', '×': '×', '÷': '÷' };

        const statements = answers.map((isTrue) => {
          const op = ops[Math.floor(Math.random() * ops.length)];
          let a, b, correct;

          if (op === '+') {
            a = rand(min, max - min);
            b = rand(min, max - a);
            correct = a + b;
          } else if (op === '-') {
            correct = rand(min, max - min);
            b = rand(min, max - correct);
            a = correct + b;
          } else if (op === '×') {
            a = rand(2, maxFactor);
            b = rand(2, maxFactor);
            correct = a * b;
          } else {
            // ÷
            b = rand(2, maxFactor);
            correct = rand(2, maxFactor);
            a = b * correct;
          }

          // For false statements: offset result by ±1 or ±2
          let displayed = correct;
          if (!isTrue) {
            const delta = (Math.random() < 0.5 ? 1 : -1) * rand(1, 2);
            displayed = correct + delta;
            if (displayed <= 0) displayed = correct + Math.abs(delta);
          }

          // Occasionally reverse the equation (c = a op b) to train relational = understanding
          const reversed = style === 'relational' && Math.random() < 0.25;
          const eq = reversed ? `${displayed} = ${a} ${SYM[op]} ${b}` : `${a} ${SYM[op]} ${b} = ${displayed}`;

          return { text: `<span class="font-mono text-base">${eq}</span>`, answer: isTrue };
        });

        return { type: 'true-false', statements };
      },
    },

    // Pyramid: addition pyramid
    // params: size (4|5), minBase (1), maxBase (20), showApex (false), mode ('normal'|'inverse')
    // mode 'normal'  : base given, fill up to apex (showApex controls whether apex is shown)
    // mode 'compl'   : base + apex given (showApex:true), fill middle rows
    // mode 'inverse' : apex + full row-1 + one anchor base cell given; student deduces base then fills up
    pyramideAdditions: {
      generate(params = {}) {
        const size = params.size ?? 4;
        const minBase = params.minBase ?? 1;
        const maxBase = params.maxBase ?? 20;
        const showApex = params.showApex ?? false;
        const mode = params.mode ?? 'normal';

        // Build base row
        const base = [];
        for (let i = 0; i < size; i++) base.push(rand(minBase, maxBase));

        // Compute all rows bottom-up (base = index 0)
        const allRows = [base];
        for (let r = 1; r < size; r++) {
          const prev = allRows[r - 1];
          const row = [];
          for (let c = 0; c < prev.length - 1; c++) row.push(prev[c] + prev[c + 1]);
          allRows.push(row);
        }

        // Decide which cells are "given" (true = shown, false = pupil fills in)
        let givenRows;
        if (mode === 'inverse') {
          // Show: apex + row-1 (just above base) + one random base cell (anchor)
          // Student works outward from anchor using row-1 values, then fills up
          const anchor = rand(0, size - 1);
          givenRows = allRows.map((row, r) => {
            if (r === 0) return row.map((_, c) => c === anchor);
            if (r === 1) return row.map(() => true); // full row-1 shown
            if (r === allRows.length - 1) return [true]; // apex shown
            return row.map(() => false); // other middle rows hidden
          });
        } else {
          // normal / compl modes
          givenRows = allRows.map((row, r) => {
            if (r === 0) return row.map(() => true);
            if (r === allRows.length - 1) return [showApex];
            // Alternate hidden cells in middle rows
            return row.map((_, c) => c % 2 !== 0);
          });
        }

        // Payload is apex-first (reversed)
        const rows = [...allRows].reverse();
        const given = [...givenRows].reverse();

        return { type: 'pyramid', pyramid: { rows, given } };
      },
    },

    // divisionEuclidienne: Euclidean division fill-in — a = (b × q) + r
    // params: divisors ([3,4,5,6,7,8,9]), minDividend (10), maxDividend (99)
    divisionEuclidienne: {
      generate(params = {}) {
        const divisors = params.divisors ?? [3, 4, 5, 6, 7, 8, 9];
        const b = randItem(divisors);
        const minD = params.minDividend ?? 10;
        const maxD = params.maxDividend ?? 99;
        const a = rand(minD, maxD);
        const q = Math.floor(a / b);
        const r = a % b;

        return {
          type: 'multi-question',
          mqSequential: true,
          mqContext: `<span class="text-4xl font-extrabold tracking-wide">${a} = (${b} × ?) + ?</span>`,
          mqQuestions: [
            { text: `Quotient : ${a} ÷ ${b} = …`, answer: String(q) },
            { text: `Reste : ${a} − (${b} × ${q}) = …`, answer: String(r) },
          ],
        };
      },
    },

    // multiplicationsDirectes: a × round-number = ? (no decomposition hint)
    // params: powers (array, default [10,100,1000]), aMin (2), aMax (9), bMin (2), bMax (9)
    multiplicationsDirectes: {
      generate(params = {}) {
        const powers = params.powers ?? [10, 100, 1000];
        const aMin = params.aMin ?? 2;
        const aMax = params.aMax ?? 9;
        const bMin = params.bMin ?? 2;
        const bMax = params.bMax ?? 9;
        const r = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

        const power = powers[Math.floor(Math.random() * powers.length)];
        const a = r(aMin, aMax);
        const b = r(bMin, bMax);
        const zeroes = '0'.repeat(Math.log10(power));

        return {
          type: 'number-check',
          title: 'Calcule directement.',
          operation: `${a} × ${b}${zeroes} = ?`,
          answers: [String(a * b * power)],
        };
      },
    },

    // multiplicationsEtapes: step-by-step ×10/×100/×1000 decomposition
    // params: power (10|100|1000), aMin (2), aMax (9), bMin (2), bMax (9)
    multiplicationsEtapes: {
      generate(params = {}) {
        const power = params.power ?? 10;
        const aMin = params.aMin ?? 2;
        const aMax = params.aMax ?? 9;
        const bMin = params.bMin ?? 2;
        const bMax = params.bMax ?? 9;
        const r = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

        const a = r(aMin, aMax);
        const b = r(bMin, bMax);
        const zeroes = '0'.repeat(Math.log10(power));
        const product = a * b;
        const result = product * power;

        return {
          type: 'number-check',
          title: 'Calcule étape par étape.',
          operation: `${a} × ${b}${zeroes} = &box(${a} × ${b}) × ${power} = ? × ${power} = ?`,
          answers: [String(product), String(result)],
        };
      },
    },

    // multDecimales: decimal × power-of-10 (CM1)
    // params: powers (array), maxDec (0-3 decimal places in input), wholeMax (99)
    // Uses integer arithmetic to avoid floating-point drift.
    multDecimales: {
      generate(params = {}) {
        const powers = params.powers ?? [10, 100, 1000];
        const maxDec = params.maxDec ?? 2;
        const wholeMax = params.wholeMax ?? 99;

        const power = powers[rand(0, powers.length - 1)];
        const pExp = Math.round(Math.log10(power)); // 1-4
        const d = rand(0, maxDec); // decimal places in input

        // Whole part
        const whole = rand(1, wholeMax);

        // Decimal part: d digits, last digit non-zero (no trailing zero)
        let decStr = '';
        if (d > 0) {
          for (let i = 0; i < d - 1; i++) decStr += rand(0, 9);
          decStr += rand(1, 9);
        }

        // Mantissa = whole * 10^d + parseInt(decStr)
        const decNum = d > 0 ? parseInt(decStr, 10) : 0;
        const mantissa = whole * Math.pow(10, d) + decNum;

        // result = mantissa × 10^(pExp-d)  [pure integer arithmetic]
        const shift = pExp - d;
        const fmtFr = (n) => n.toLocaleString('fr-FR');

        let resultStr;
        if (shift >= 0) {
          resultStr = fmtFr(mantissa * Math.pow(10, shift));
        } else {
          const absShift = -shift;
          const s = String(mantissa).padStart(absShift + 1, '0');
          const intPart = s.slice(0, -absShift);
          const decPart = s.slice(-absShift).replace(/0+$/, '');
          resultStr = decPart ? `${fmtFr(parseInt(intPart, 10))},${decPart}` : fmtFr(parseInt(intPart, 10));
        }

        const inputStr = d === 0 ? String(whole) : `${whole},${decStr}`;
        return {
          type: 'number-check',
          operation: `${inputStr} × ${fmtFr(power)} = ?`,
          answers: [resultStr],
        };
      },
    },

    // divDecimales: decimal ÷ power-of-10 (CM1) — twin of multDecimales
    // Generate the RESULT first (nice decimal), compute dividend = result × power.
    // params: powers, maxDec (decimal places in result), wholeMin (0), wholeMax (99)
    // diviserDecimalParEntier: « 12,6 ÷ 3 = ? » (CM2) — exact, computed in integers.
    // The quotient has 1..maxDec decimals (last one ≠ 0); the dividend is quotient × divisor.
    // params: divisors ([2..9]), maxDec (2), quotientMax (50),
    //         intDividend (false — true: whole dividend, decimal quotient « 9 ÷ 4 = 2,25 »)
    // multiplierDecimalParEntier: « 12,6 × 3 = ? » (CM1–CM2) — computed in integers.
    // The decimal has 1..maxDec decimals (last one ≠ 0). factors [5, 50] gives the CM2 « × 5, × 50 » drill.
    // params: factors ([2..9]), maxDec (2), wholeMax (50)
    multiplierDecimalParEntier: {
      generate(params = {}) {
        const factors = params.factors ?? [2, 3, 4, 5, 6, 7, 8, 9];
        const maxDec = params.maxDec ?? 2;
        const wholeMax = params.wholeMax ?? 50;
        // n / 10^dec → « 12,6 » (trailing zeros dropped, French comma)
        const fmt = (n, dec) => {
          const s = String(n).padStart(dec + 1, '0');
          const out = dec ? `${s.slice(0, -dec)},${s.slice(-dec)}` : s;
          return out.includes(',') ? out.replace(/0+$/, '').replace(/,$/, '') : out;
        };
        const dec = rand(1, maxDec);
        let a;
        do a = rand(10 ** dec, (wholeMax + 1) * 10 ** dec - 1);
        while (a % 10 === 0);
        const k = randItem(factors);
        return {
          type: 'number-check',
          operation: `${fmt(a, dec)} × ${k} = ?`,
          answers: [fmt(a * k, dec)],
        };
      },
    },

    // calculParentheses: « (12 + 8) × 3 = ? », « (7 × 6) − (4 × 5) = ? » (CM1–CM2) — no result below 0,
    // divisions exact. params: pairs (1 or 2), max (20 — size of the terms)
    calculParentheses: {
      generate(params = {}) {
        const pairs = params.pairs ?? 1;
        const max = params.max ?? 20;
        const n = () => rand(2, max);
        const small = () => rand(2, 9);
        const forms =
          pairs === 2
            ? [
                () => {
                  const a = n(),
                    b = n(),
                    c = n(),
                    d = rand(1, c - 1 || 1);
                  return [`(${a} + ${b}) × (${c} − ${d})`, (a + b) * (c - d)];
                },
                () => {
                  let a = small(),
                    b = small(),
                    c = small(),
                    d = small();
                  if (a * b < c * d) [a, b, c, d] = [c, d, a, b];
                  return [`(${a} × ${b}) − (${c} × ${d})`, a * b - c * d];
                },
                () => {
                  const c = n(),
                    d = n(),
                    a = n() + c + d,
                    b = n();
                  return [`(${a} + ${b}) − (${c} + ${d})`, a + b - c - d];
                },
              ]
            : [
                () => {
                  const a = n(),
                    b = n(),
                    c = small();
                  return [`(${a} + ${b}) × ${c}`, (a + b) * c];
                },
                () => {
                  const a = small(),
                    b = n(),
                    c = n();
                  return [`${a} × (${b} + ${c})`, a * (b + c)];
                },
                () => {
                  const b = n(),
                    a = b + n(),
                    c = small();
                  return [`(${a} − ${b}) × ${c}`, (a - b) * c];
                },
                () => {
                  const b = n(),
                    c = n(),
                    a = b + c + n();
                  return [`${a} − (${b} + ${c})`, a - b - c];
                },
                () => {
                  const c = small(),
                    q = rand(2, max),
                    s = q * c,
                    b = rand(1, s - 1);
                  return [`(${s - b} + ${b}) ÷ ${c}`, q];
                },
              ];
        const [expr, result] = randItem(forms)();
        return { type: 'number-check', operation: `${expr} = ?`, answers: [String(result)] };
      },
    },

    // calculPriorites: × and ÷ before + and − (CM1–CM2). A + or − always comes before a × or ÷, so
    // calculating from left to right gives another result (the usual mistake: 5 + 3 × 4 = 32).
    //   params: mode — direct « 5 + 3 × 4 = ? » | etape « 5 + &box(3 × 4) = 5 + ? = ? » | comparer
    //     « 5 + 3 × 4 = ? et (5 + 3) × 4 = ? » | placer: mcq, which parentheses give the result
    //     (a + b × c + d, only ×) | list (one per exercise);
    //   div (false: ÷ too, always exact), double (false: two × or three terms, « 4 × 5 − 2 × 3 »,
    //   « 7 + 2 × 6 − 5 »; direct and etape only), max (9: × factors and divisors), maxN (30: lone numbers)
    calculPriorites: {
      generate(params = {}) {
        const mode = randItem([].concat(params.mode ?? 'direct'));
        const max = params.max ?? 9;
        const maxN = params.maxN ?? 30;
        const pick = (op) => {
          const c = rand(2, max),
            b = rand(2, max);
          return op === '×'
            ? { txt: `${b} × ${c}`, v: b * c, f: b, op }
            : { txt: `${b * c} ÷ ${c}`, v: b, f: b * c, op };
        };
        const prio = () => pick(params.div && Math.random() < 0.5 ? '÷' : '×');

        if (mode === 'placer') {
          for (;;) {
            const [a, b, c, d] = [rand(2, maxN), rand(2, max), rand(2, max), rand(2, maxN)];
            const [s1, s2] = [randItem(['+', '−']), randItem(['+', '−'])];
            const op = (x, s, y) => (s === '+' ? x + y : x - y);
            const exprs = [
              [`${a} ${s1} ${b} × ${c} ${s2} ${d}`, op(op(a, s1, b * c), s2, d)],
              [`(${a} ${s1} ${b}) × ${c} ${s2} ${d}`, op(op(a, s1, b) * c, s2, d)],
              [`${a} ${s1} ${b} × (${c} ${s2} ${d})`, op(a, s1, b * op(c, s2, d))],
              [`(${a} ${s1} ${b}) × (${c} ${s2} ${d})`, op(a, s1, b) * op(c, s2, d)],
            ];
            const vals = exprs.map((x) => x[1]);
            // every bracket and every result whole and ≥ 0, four different results
            if ([op(a, s1, b), op(c, s2, d), op(a, s1, b * c)].some((v) => v < 0) || vals.some((v) => v < 0)) continue;
            if (new Set(vals).size < 4) continue;
            const answer = rand(1, 3);
            return {
              type: 'mcq',
              title: `Quel calcul donne ${vals[answer]}\u00a0?`,
              body: '<p>Les parenthèses changent l’ordre des calculs.</p>',
              mcqChoices: exprs.map(
                (x) => `<span style="font-size:1.4rem;font-weight:800;white-space:nowrap">${x[0]}</span>`
              ),
              mcqAnswer: answer,
            };
          }
        }

        if (mode === 'comparer') {
          for (;;) {
            const s = randItem(['+', '−']);
            const p = prio();
            const a = p.op === '÷' ? rand(1, Math.floor(maxN / 2)) * Number(p.txt.split(' ÷ ')[1]) : rand(2, maxN);
            const lone = s === '+' ? a + p.v : a - p.v;
            const first = s === '+' ? a + p.f : a - p.f;
            if (lone < 0 || first < 0) continue;
            const rest = p.txt.slice(String(p.f).length); // « × 4 » / « ÷ 3 »
            const paren = p.op === '×' ? first * (p.v / p.f) : first / (p.f / p.v);
            if (paren === lone || !Number.isInteger(paren)) continue;
            return {
              type: 'number-check',
              title: 'Calcule les deux. Les parenthèses changent-elles le résultat\u00a0?',
              operation: `${a} ${s} ${p.txt} = ? et (${a} ${s} ${p.f})${rest} = ?`,
              answers: [String(lone), String(paren)],
            };
          }
        }

        // direct / etape: blocks (a lone number or a × / ÷) joined by + and −, never below 0 on the way
        const shapes = params.double
          ? [
              ['p', 'p'],
              ['n', 'p', 'n'],
              ['n', 'n', 'p'],
            ]
          : [['n', 'p']];
        for (;;) {
          const blocks = randItem(shapes).map((k) => (k === 'p' ? prio() : { v: rand(2, maxN) }));
          const signs = blocks.slice(1).map(() => randItem(['+', '−']));
          let total = blocks[0].v,
            ok = true;
          signs.forEach((s, i) => {
            total = s === '+' ? total + blocks[i + 1].v : total - blocks[i + 1].v;
            if (total < 0) ok = false;
          });
          if (!ok) continue;
          const line = (show) => blocks.map((b, i) => (i ? `${signs[i - 1]} ` : '') + show(b)).join(' ');
          // left to right, ignoring the priorities
          const words = line((b) => b.txt ?? b.v).split(' ');
          let ltr = Number(words[0]);
          for (let i = 1; i < words.length; i += 2) {
            const y = Number(words[i + 1]);
            ltr = { '+': ltr + y, '−': ltr - y, '×': ltr * y, '÷': ltr / y }[words[i]];
          }
          if (ltr === total) continue;
          if (mode === 'etape')
            return {
              type: 'number-check',
              title: 'Calcule d’abord ce qui est encadré.',
              operation: `${line((b) => (b.txt ? `&box(${b.txt})` : b.v))} = ${line((b) => (b.txt ? '?' : b.v))} = ?`,
              answers: [...blocks.filter((b) => b.txt).map((b) => String(b.v)), String(total)],
            };
          return {
            type: 'number-check',
            title: 'Calcule. Les × et les ÷ d’abord\u00a0!',
            operation: `${line((b) => b.txt ?? b.v)} = ?`,
            answers: [String(total)],
          };
        }
      },
    },

    // pourcentages (CM2): « 25 % de 80 = ? » — every result whole. Pictures: grille (hundred grid, percentGridSvg)
    // and barre (whole = 100 %, cut in 100 / gcd(p, 100) parts, percentBarSvg).
    //   params: mode — grille « ? % » of a coloured hundred grid | de « 25 % de 80 = ? » | etape « 30 % de 70
    //     = 3 × ? = ? » under the title « 30 %, c’est 3 × 10 % » | quel « 20 sur 80 = ? % » | probleme
    //     (soldes « 90 € − ? € = ? €»: réduction then prix soldé; part of a group; score in %) | cent
    //     « 12/50 = ?/100 = ? % » (any part of a total in `totals`, [10, 20, 25, 50]; hint false
    //     « 12 sur 50 = ? % »; context: a sentence instead) | list;
    //   percents (by mode, e.g. [10, 25, 50]), visual (true: the bar on de / etape / quel / probleme),
    //   maxTotal (200), round (true: totals are multiples of 10 too; false: « 25 % de 84 »),
    //   step (5: grille, coloured squares by 5; 1 = any number)
    pourcentages: {
      generate(params = {}) {
        const mode = randItem([].concat(params.mode ?? 'de'));
        const visual = params.visual ?? true;
        const maxTotal = params.maxTotal ?? 200;
        const gcd = (a, b) => (b ? gcd(b, a % b) : a);
        const DEFAULTS = { etape: [20, 30, 40, 60, 70, 75, 80, 90], quel: [10, 20, 25, 50, 75] };
        const p = randItem([].concat(params.percents ?? DEFAULTS[mode] ?? [10, 25, 50]));
        const unit = 100 / gcd(p, 100); // the smallest whole that gives a whole result
        const lot = params.round === false ? unit : (unit * 10) / gcd(unit, 10);
        const total = lot * rand(Math.ceil((2 * unit) / lot), Math.max(2, Math.floor(maxTotal / lot)));
        const value = (total * p) / 100;
        const bar = (pc, ask) =>
          visual && unit <= 20
            ? { svg: { gen: 'percentBarSvg', par: { parts: unit, shaded: (pc * unit) / 100, total, ask } } }
            : {};

        if (mode === 'grille') {
          const step = params.step ?? 5;
          const filled = step * rand(1, Math.floor(99 / step));
          return {
            type: 'number-check',
            title: 'Quel pourcentage de la grille est colorié\u00a0?',
            body: 'La grille a 100 carreaux. Un carreau, c’est 1 %.',
            operation: '? %',
            answers: [String(filled)],
            svg: { gen: 'percentGridSvg', par: { filled } },
          };
        }
        if (mode === 'etape') {
          const base = p % 10 === 0 ? 10 : 25;
          const k = p / base;
          const unitB = 100 / base,
            lotB = params.round === false ? unitB : (unitB * 10) / gcd(unitB, 10),
            t = lotB * rand(1, Math.floor(maxTotal / lotB));
          return {
            type: 'number-check',
            title: `${p} %, c’est ${k} × ${base} %.`,
            operation: `${p} % de ${t} = ${k} × ? = ?`,
            answers: [String((t * base) / 100), String((t * p) / 100)],
            ...(visual
              ? { svg: { gen: 'percentBarSvg', par: { parts: unitB, shaded: k, total: t, ask: 'value' } } }
              : {}),
          };
        }
        if (mode === 'cent') {
          // « ramener à 100 »: a total that divides 100 (or 200), any part — 12 sur 50 = 24/100 = 24 %
          const t = randItem([].concat(params.totals ?? [10, 20, 25, 50]));
          let v;
          do
            v = rand(2, t - 1); // from 2: « 1 élèves » never
          while ((100 * v) % t);
          const pc = (100 * v) / t;
          if (params.context) {
            const say = randItem([
              `Tu réponds juste à <strong>${v}</strong> questions sur <strong>${t}</strong>.`,
              `<strong>${v}</strong> élèves sur <strong>${t}</strong> ont un chien.`,
              `<strong>${v}</strong> graines ont germé sur les <strong>${t}</strong> semées.`,
            ]);
            return {
              type: 'number-check',
              title: 'Quel pourcentage\u00a0?',
              body: `<p>${say} Quel pourcentage est-ce\u00a0?</p>`,
              operation: '? %',
              answers: [String(pc)],
            };
          }
          if (params.hint === false)
            return {
              type: 'number-check',
              title: 'Quel pourcentage\u00a0?',
              operation: `${v} sur ${t} = ? %`,
              answers: [String(pc)],
            };
          return {
            type: 'number-check',
            title:
              t < 100
                ? `Sur ${t}\u00a0: multiplie par ${100 / t} pour arriver à 100.`
                : `Sur ${t}\u00a0: divise par ${t / 100} pour arriver à 100.`,
            operation: `&frac(${v},${t}) = ?/100 = ? %`,
            answers: [String(pc), String(pc)],
          };
        }
        if (mode === 'quel')
          return {
            type: 'number-check',
            title: 'Quel pourcentage\u00a0?',
            operation: `${value} sur ${total} = ? %`,
            answers: [String(p)],
            ...bar(p, 'percent'),
          };
        if (mode === 'probleme') {
          const kind = randItem(['solde', 'groupe', 'score']);
          if (kind === 'solde') {
            const [obj, verb] = randItem([
              ['Un vélo', 'Il est soldé'],
              ['Un jeu de société', 'Il est soldé'],
              ['Une veste', 'Elle est soldée'],
              ['Une trottinette', 'Elle est soldée'],
              ['Un ballon', 'Il est soldé'],
            ]);
            return {
              type: 'number-check',
              title: 'Les soldes\u00a0: calcule la réduction, puis le prix soldé.',
              body: `<p>${obj} coûte <strong>${total}\u00a0€</strong>. ${verb} à <strong>−${p}\u00a0%</strong>.</p>`,
              operation: `${total} € − ? € = ? €`,
              answers: [String(value), String(total - value)],
              ...bar(p, 'value'),
            };
          }
          if (kind === 'groupe') {
            // [start, total word, the part, question, word next to the answer box]
            const [whole, unitWord, part, question, label] = randItem([
              ['Dans une école de', 'élèves', 'viennent à vélo', 'Combien d’élèves viennent à vélo', 'élèves'],
              ['Dans un sac de', 'billes', 'sont rouges', 'Combien de billes sont rouges', 'billes rouges'],
              ['Dans un verger de', 'arbres', 'sont des pommiers', 'Combien y a-t-il de pommiers', 'pommiers'],
              [
                'Dans une course de',
                'coureurs',
                'ont un dossard bleu',
                'Combien de coureurs ont un dossard bleu',
                'coureurs',
              ],
            ]);
            return {
              type: 'number-check',
              title: 'Une part du groupe',
              body: `<p>${whole} <strong>${total}</strong> ${unitWord}, <strong>${p}\u00a0%</strong> ${part}. ${question}\u00a0?</p>`,
              operation: `? ${label}`,
              answers: [String(value)],
              ...bar(p, 'value'),
            };
          }
          // the number done, then the number of tries (the oracle reads them in that order)
          const say = randItem([
            (v, t) => `Tu réponds juste à <strong>${v}</strong> questions sur <strong>${t}</strong>.`,
            (v, t) => `Tu marques <strong>${v}</strong> tirs au but sur <strong>${t}</strong>.`,
            (v, t) => `<strong>${v}</strong> graines ont germé sur les <strong>${t}</strong> semées.`,
          ]);
          // a score stays small: 10 to 50 tries
          const tries = lot * rand(Math.max(1, Math.ceil(10 / lot)), Math.max(1, Math.floor(50 / lot)));
          return {
            type: 'number-check',
            title: 'Quel pourcentage\u00a0?',
            body: `<p>${say((tries * p) / 100, tries)} Quel pourcentage de réussite\u00a0?</p>`,
            operation: '? %',
            answers: [String(p)],
            ...(visual && unit <= 20
              ? {
                  svg: {
                    gen: 'percentBarSvg',
                    par: { parts: unit, shaded: (p * unit) / 100, total: tries, ask: 'percent' },
                  },
                }
              : {}),
          };
        }
        return {
          type: 'number-check',
          title: `Calcule ${p} % du nombre.`,
          operation: `${p} % de ${total} = ?`,
          answers: [String(value)],
          ...bar(p, 'value'),
        };
      },
    },

    // problemesDivision (CE2–CM2): division word problems, the statement in the body, the answer with its unit.
    //   params: mode — coupe (a length cut by traits de scie / coups de ciseaux: k cuts make k + 1 pieces;
    //     ask longueur « ? cm » or traits) | intervalles (trees every d m along L m, one at each end: L ÷ d + 1;
    //     ask nombre or ecart) | ranger (N things in boxes of b; ask exact, pleines, reste, toutes = one more box
    //     when something is left) | partage (N things for p people; reste « Chacun : ? — reste : ? »; decimal:
    //     euros shared to the cent) | list;
    //   visual (false: decoupeSvg on coupe / intervalles), reste (false), ask (by mode),
    //   coupe: maxPieces (6), step (5), maxPiece (50), meters (false: the length given in m, answer in cm);
    //   intervalles: maxGaps (10), gaps ([2, 3, 4, 5, 10]); ranger / partage: minB / maxB (2–9), maxQ (10)
    problemesDivision: {
      generate(params = {}) {
        const mode = randItem([].concat(params.mode ?? 'ranger'));
        const visual = params.visual ?? false;
        const ask = (dflt) => randItem([].concat(params.ask ?? dflt));
        const nb = (x) =>
          String(+x.toFixed(2))
            .replace('.', ',')
            .replace(/^\d+/, (w) => w.replace(/\B(?=(\d{3})+$)/g, '\u00a0'));
        const S = (x) => `<strong>${x}</strong>`;
        const de = (w) => (/^[aeéiouœ]/i.test(w) ? `d’${w}` : `de ${w}`); // « combien d’élèves »

        if (mode === 'coupe') {
          const OBJECTS = [
            ['Une planche', 'la', 'scie'],
            ['Une baguette de bois', 'la', 'scie'],
            ['Un tuyau', 'le', 'scie'],
            ['Une barre de métal', 'la', 'scie'],
            ['Un ruban', 'le', 'ciseaux'],
            ['Une ficelle', 'la', 'ciseaux'],
            ['Un fil de laine', 'le', 'ciseaux'],
            ['Une corde', 'la', 'ciseaux'],
          ];
          const [obj, pro, tool] = randItem(OBJECTS);
          const cut = (n) =>
            tool === 'scie' ? `trait${n > 1 ? 's' : ''} de scie` : `coup${n > 1 ? 's' : ''} de ciseaux`;
          const step = params.step ?? 5;
          const meters = params.meters ?? false;
          for (;;) {
            const k = rand(2, params.maxPieces ?? 6);
            const piece = step * rand(2, Math.floor((params.maxPiece ?? 50) / step));
            const L = k * piece;
            if (meters && L % 10) continue; // « 1,5 m », not « 1,55 m »
            const len = meters ? `${nb(L / 100)}\u00a0m` : `${nb(L)}\u00a0cm`;
            const pic = (label) =>
              visual ? { svg: { gen: 'decoupeSvg', par: { kind: 'coupe', pieces: k, total: len, piece: label } } } : {};
            if (ask(['longueur', 'traits']) === 'traits')
              return {
                type: 'number-check',
                bodyFirst: true,
                body: `<p>${obj} mesure ${S(len)}. On ${pro} coupe en morceaux de ${S(`${piece}\u00a0cm`)}.</p><p>Combien de ${cut(2)} faut-il\u00a0?</p>`,
                operation: `? ${tool === 'scie' ? 'traits' : 'coups'}`,
                answers: [String(k - 1)],
                ...pic(`${piece}\u00a0cm`),
              };
            return {
              type: 'number-check',
              bodyFirst: true,
              body: `<p>${obj} mesure ${S(len)}. On fait ${S(`${k - 1} ${cut(k - 1)}`)} pour obtenir des morceaux de même longueur.</p><p>Quelle est la longueur d’un morceau\u00a0?</p>`,
              operation: '? cm',
              answers: [String(piece)],
              ...pic('?'),
            };
          }
        }

        if (mode === 'intervalles') {
          const PLACES = [
            [
              'arbres',
              '🌳',
              (d) => `On plante un arbre tous les ${d} le long d’une allée`,
              'une allée',
              'deux arbres voisins',
            ],
            [
              'drapeaux',
              '🚩',
              (d) => `On plante un drapeau tous les ${d} le long d’une piste`,
              'une piste',
              'deux drapeaux voisins',
            ],
            [
              'lampadaires',
              '💡',
              (d) => `On installe un lampadaire tous les ${d} le long d’une rue`,
              'une rue',
              'deux lampadaires voisins',
            ],
            [
              'tournesols',
              '🌻',
              (d) => `On sème un tournesol tous les ${d} le long d’une bordure`,
              'une bordure',
              'deux tournesols voisins',
            ],
          ];
          const [things, emoji, every, where, pair] = randItem(PLACES);
          const g = rand(2, params.maxGaps ?? 10);
          const d = randItem([].concat(params.gaps ?? [2, 3, 4, 5, 10])) * (things === 'lampadaires' ? 10 : 1);
          const L = g * d;
          const pic = (label) =>
            visual
              ? {
                  svg: {
                    gen: 'decoupeSvg',
                    par: { kind: 'intervalles', pieces: g, total: `${L}\u00a0m`, piece: label, emoji },
                  },
                }
              : {};
          if (ask(['nombre', 'ecart']) === 'ecart')
            return {
              type: 'number-check',
              bodyFirst: true,
              body: `<p>Il y a ${S(`${g + 1} ${things}`)} le long d’${where} de ${S(`${L}\u00a0m`)}, un à chaque bout, tous à la même distance.</p><p>Quelle distance y a-t-il entre ${pair}\u00a0?</p>`,
              operation: '? m',
              answers: [String(d)],
              ...pic('?'),
            };
          return {
            type: 'number-check',
            bodyFirst: true,
            body: `<p>${every(S(`${d}\u00a0m`))} de ${S(`${L}\u00a0m`)}, avec un à chaque bout.</p><p>Combien de ${things} faut-il\u00a0?</p>`,
            operation: `? ${things}`,
            answers: [String(g + 1)],
            ...pic(`${d}\u00a0m`),
          };
        }

        const b = rand(params.minB ?? 2, params.maxB ?? 9);
        const q = rand(2, params.maxQ ?? 10);
        const r = params.reste ? rand(1, b - 1) : 0;
        const N = q * b + r;

        if (mode === 'partage') {
          if (params.decimal) {
            for (;;) {
              const p = randItem([2, 4, 5, 10]);
              const n = rand(p + 1, params.maxQ ?? 50);
              if (n % p === 0) continue;
              return {
                type: 'number-check',
                bodyFirst: true,
                body: `<p>${S(`${p} amis`)} se partagent équitablement ${S(`${n}\u00a0€`)}.</p><p>Combien chacun reçoit-il\u00a0?</p>`,
                operation: '? €',
                answers: [...new Set([nb(n / p), (n / p).toFixed(2).replace('.', ',')])], // « 4,1 » or « 4,10 »
              };
            }
          }
          const GIFTS = [
            ['billes', 'enfants'],
            ['cartes', 'joueurs'],
            ['bonbons', 'amis'],
            ['autocollants', 'élèves'],
            ['images', 'enfants'],
          ];
          const [things, who] = randItem(GIFTS);
          const intro = `<p>On partage ${S(`${nb(N)} ${things}`)} équitablement entre ${S(`${b} ${who}`)}.</p>`;
          if (r)
            return {
              type: 'number-check',
              bodyFirst: true,
              body: `${intro}<p>Chacun reçoit le plus possible. Combien chacun en reçoit-il, et combien en reste-t-il\u00a0?</p>`,
              operation: 'Chacun__:__? Reste__:__?',
              answers: [String(q), String(r)],
            };
          return {
            type: 'number-check',
            bodyFirst: true,
            body: `${intro}<p>Combien ${de(things)} chacun reçoit-il\u00a0?</p>`,
            operation: `? ${things}`,
            answers: [String(q)],
          };
        }

        // ranger: [things, gender (all: tous / toutes), container, full (pleines / pleins), the boxes, verb]
        const BOXES = [
          ['balles', 'toutes', 'boîtes', 'pleines', (x) => `dans des boîtes de ${S(`${x} balles`)}`, 'ranger'],
          ['œufs', 'tous', 'boîtes', 'pleines', (x) => `dans des boîtes de ${S(`${x} œufs`)}`, 'ranger'],
          [
            'photos',
            'toutes',
            'pages',
            'pleines',
            (x) => `dans un album, à raison de ${S(`${x} photos`)} par page`,
            'coller',
          ],
          ['bouteilles', 'toutes', 'packs', 'pleins', (x) => `dans des packs de ${S(`${x} bouteilles`)}`, 'ranger'],
          ['livres', 'tous', 'étagères', 'pleines', (x) => `sur des étagères de ${S(`${x} livres`)}`, 'ranger'],
          ['élèves', 'tous', 'minibus', 'pleins', (x) => `dans des minibus de ${S(`${x} places`)}`, 'transporter'],
        ];
        const [things, all, cont, full, boxes, verb] = randItem(BOXES.filter((x) => N <= 120 || x[0] !== 'élèves'));
        const intro =
          things === 'élèves'
            ? `<p>${S(`${nb(N)} élèves`)} partent en sortie ${boxes(b)}.</p>`
            : `<p>On ${verb === 'coller' ? 'colle' : 'range'} ${S(`${nb(N)} ${things}`)} ${boxes(b)}.</p>`;
        const kind = r ? ask(['pleines', 'reste', 'toutes']) : 'exact';
        const Q = {
          exact: [`Combien ${de(cont)} faut-il\u00a0?`, cont, q],
          pleines: [`Combien ${de(cont)} ${full} obtient-on\u00a0?`, cont, q],
          reste: [`On remplit le plus de ${cont} possible. Combien ${de(things)} reste-t-il\u00a0?`, things, r],
          toutes: [`Combien ${de(cont)} faut-il pour ${verb} ${all} les ${things}\u00a0?`, cont, q + 1],
        }[kind];
        return {
          type: 'number-check',
          bodyFirst: true,
          body: `${intro}<p>${Q[0]}</p>`,
          operation: `? ${Q[1]}`,
          answers: [String(Q[2])],
        };
      },
    },

    diviserDecimalParEntier: {
      generate(params = {}) {
        const divisors = params.divisors ?? [2, 3, 4, 5, 6, 7, 8, 9];
        const maxDec = params.maxDec ?? 2;
        const qMax = params.quotientMax ?? 50;
        // n / 10^dec → « 12,6 » (trailing zeros dropped, French comma)
        const fmt = (n, dec) => {
          const s = String(n).padStart(dec + 1, '0');
          const out = dec ? `${s.slice(0, -dec)},${s.slice(-dec)}` : s;
          return out.includes(',') ? out.replace(/0+$/, '').replace(/,$/, '') : out;
        };
        let d, dec, q, a;
        for (let tries = 0; tries < 200; tries++) {
          d = randItem(divisors);
          dec = rand(1, maxDec);
          q = rand(1, qMax * 10 ** dec);
          if (q % 10 === 0) continue; // the quotient really has `dec` decimals
          a = q * d; // dividend × 10^dec
          const wholeDividend = a % 10 ** dec === 0;
          if (params.intDividend ? wholeDividend : !wholeDividend) break;
        }
        return {
          type: 'number-check',
          operation: `${fmt(a, dec)} ÷ ${d} = ?`,
          answers: [fmt(q, dec)],
        };
      },
    },

    divDecimales: {
      generate(params = {}) {
        const powers = params.powers ?? [10, 100, 1000];
        const maxDec = params.maxDec ?? 1;
        const wholeMin = params.wholeMin ?? 1;
        const wholeMax = params.wholeMax ?? 99;

        const power = powers[rand(0, powers.length - 1)];
        const pExp = Math.round(Math.log10(power)); // 1-4
        const d = rand(0, maxDec); // decimal places in RESULT

        const whole = rand(wholeMin, wholeMax);
        let decStr = '';
        if (d > 0) {
          for (let i = 0; i < d - 1; i++) decStr += rand(0, 9);
          decStr += rand(1, 9); // no trailing zero
        }

        const decNum = d > 0 ? parseInt(decStr, 10) : 0;
        const mantissa = whole * Math.pow(10, d) + decNum; // result as integer × 10^d

        // dividend = result × power = mantissa × 10^(pExp-d)
        const shift = pExp - d;
        const fmtFr = (n) => n.toLocaleString('fr-FR');

        // Format RESULT (what student must find)
        const resultStr = d === 0 ? String(whole) : `${whole},${decStr}`;

        // Format DIVIDEND
        let dividendStr;
        if (shift >= 0) {
          dividendStr = fmtFr(mantissa * Math.pow(10, shift));
        } else {
          const abs = -shift;
          const s = String(mantissa).padStart(abs + 1, '0');
          const intPart = s.slice(0, -abs);
          const decPart = s.slice(-abs).replace(/0+$/, '');
          dividendStr = decPart ? `${fmtFr(parseInt(intPart, 10))},${decPart}` : fmtFr(parseInt(intPart, 10));
        }

        return {
          type: 'number-check',
          operation: `${dividendStr} \u00f7 ${fmtFr(power)} = ?`,
          answers: [resultStr],
        };
      },
    },

    // multDivTrou: mixed ×/÷ powers-of-10 with randomised hole position (CM1)
    // Variants:
    //   mult_result  —  a × p = ?        (find result)
    //   mult_input   —  ? × p = r        (find input)
    //   div_result   —  r ÷ p = ?        (find result = input)
    //   div_power    —  a × ? = r  or  r ÷ ? = a  (find the power)
    //   mult_power   —  a × ? = r                 (find the power, × only)
    // params: powers, minDec (0), maxDec, wholeMin, wholeMax, variants (array of hole types)
    multDivTrou: {
      generate(params = {}) {
        const powers = params.powers ?? [10, 100, 1000];
        const maxDec = params.maxDec ?? 2;
        const wholeMin = params.wholeMin ?? 1;
        const wholeMax = params.wholeMax ?? 99;
        const variants = params.variants ?? ['mult_input', 'div_result', 'div_power'];

        const power = powers[rand(0, powers.length - 1)];
        const pExp = Math.round(Math.log10(power));
        const d = rand(Math.min(params.minDec ?? 0, maxDec), maxDec);
        const whole = rand(d ? wholeMin : Math.max(1, wholeMin), wholeMax); // never « 0 × 10 = 0 »

        let decStr = '';
        if (d > 0) {
          for (let i = 0; i < d - 1; i++) decStr += rand(0, 9);
          decStr += rand(1, 9);
        }

        const decNum = d > 0 ? parseInt(decStr, 10) : 0;
        const mantissa = whole * Math.pow(10, d) + decNum;
        const shift = pExp - d;
        const fmtFr = (n) => n.toLocaleString('fr-FR');

        const inputStr = d === 0 ? String(whole) : `${whole},${decStr}`;

        let resultStr;
        if (shift >= 0) {
          resultStr = fmtFr(mantissa * Math.pow(10, shift));
        } else {
          const abs = -shift;
          const s = String(mantissa).padStart(abs + 1, '0');
          const intPart = s.slice(0, -abs);
          const decPart = s.slice(-abs).replace(/0+$/, '');
          resultStr = decPart ? `${fmtFr(parseInt(intPart, 10))},${decPart}` : fmtFr(parseInt(intPart, 10));
        }

        const powerStr = fmtFr(power);
        const v = variants[rand(0, variants.length - 1)];

        let operation, answers;
        if (v === 'mult_result') {
          operation = `${inputStr} × ${powerStr} = ?`;
          answers = [resultStr];
        } else if (v === 'mult_input') {
          operation = `? × ${powerStr} = ${resultStr}`;
          answers = [inputStr];
        } else if (v === 'div_result') {
          operation = `${resultStr} \u00f7 ${powerStr} = ?`;
          answers = [inputStr];
        } else {
          // div_power: randomly show as × or ÷ form; mult_power: always ×
          const asMult = v === 'mult_power' || rand(0, 1);
          operation = asMult ? `${inputStr} × ? = ${resultStr}` : `${resultStr} \u00f7 ? = ${inputStr}`;
          answers = [...new Set([String(power), powerStr])]; // « 1000 » or « 1 000 »
        }

        // digit groups by three (« 1 000 » everywhere), and __ glue: a line breaks only next to the blank
        operation = operation
          .replace(/(?<![\d,])\d{4,}/g, (w) => w.replace(/\B(?=(\d{3})+$)/g, ' '))
          .replace(/(\d)[\s\u202f\u00a0](?=\d)/g, '$1 ')
          .replace(/[ \u202f\u00a0]/g, '__');
        return { type: 'number-check', operation, answers };
      },
    },

    // tableauProportion: proportionality table — 2 rows × (label + 3 values), 2 blanks in row 2.
    // Coefficient stored as num/den (integer fraction) to avoid float drift.
    // params: den (1=integer, 2=half, 4=quarter), numMin, numMax, xMax, anchorAtStart
    tableauProportion: {
      generate(params = {}) {
        const CONTEXTS = [
          { row1: 'Crêpes', row2: 'Œufs' },
          { row1: 'Huile (L)', row2: 'Prix (€)' },
          { row1: 'Cahiers', row2: 'Prix (€)' },
          { row1: 'Baguettes', row2: 'Prix (€)' },
          { row1: 'Farine (kg)', row2: 'Prix (€)' },
          { row1: 'Livres', row2: 'Prix (€)' },
          { row1: 'Boîtes', row2: 'Stylos' },
          { row1: 'Mètres', row2: 'Prix (€)' },
          { row1: 'Litres', row2: 'Prix (€)' },
          { row1: 'km', row2: 'Essence (L)' },
        ];
        const ctx = CONTEXTS[rand(0, CONTEXTS.length - 1)];

        const den = params.den ?? 1;
        const numMin = params.numMin ?? 2 * den + 1; // ensure coeff > 1 and fractional
        const numMax = params.numMax ?? 9 * den;
        const xMax = params.xMax ?? 12;

        // Pick num not divisible by den so the fraction doesn't reduce to integer
        let num;
        do {
          num = rand(numMin, numMax);
        } while (den > 1 && num % den === 0);

        // x values: always include 1; x2 and x3 are multiples of den (ensures anchor is integer)
        const x2slots = Math.floor((xMax - den) / den);
        const x2 = den + rand(0, Math.max(0, x2slots - 1)) * den;
        const x3 = x2 + den * rand(1, Math.max(1, Math.floor((xMax - x2) / den)));
        const xs = [1, x2, x3];

        // y = x * num / den  (exact integer arithmetic when x is multiple of den)
        const computeY = (x) => {
          const raw = x * num;
          if (raw % den === 0) return String(raw / den);
          // Render as decimal with comma
          const dec = raw % den;
          const intPart = (raw - dec) / den;
          // Express remainder as decimal: dec/den rounded to 2 places
          const frac = Math.round((dec / den) * 100) / 100;
          const combined = intPart + frac;
          return String(Math.round(combined * 100) / 100).replace('.', ',');
        };
        const ys = xs.map(computeY);

        // Anchor NOT at x=1 (position 0) by default — forces ratio calculation
        const anchorIdx = params.anchorAtStart ? rand(0, 2) : rand(1, 2);

        let blankIdx = 0;
        const yRow = ys.map((y, i) => (i === anchorIdx ? { value: y } : { blank: true, idx: blankIdx++, answer: y }));

        return {
          type: 'fill-table',
          table: {
            headerCol: true,
            inputClass: 'w-16',
            blankCount: 2,
            rows: [
              [{ value: ctx.row1 }, ...xs.map((x) => ({ value: String(x) }))],
              [{ value: ctx.row2 }, ...yRow],
            ],
          },
        };
      },
    },

    // triangleOperateurs: op-triangle — A →(op a)→ B →(op b)→ C plus a shortcut A →(op a·b)→ C
    //   e.g. 7 →×10→ 70 →×10→ 700 and 7 →×100→ 700
    // params: op ('mult'|'div'|'mixed'), pairs ([[10, 10], [10, 100], [100, 10]]) — [first step, second step],
    //   startMin (2), startMax (99) — the small end (start of a ×, end of a :), decimals (0) — max decimals of it,
    //   blanks ('nodes' — B, C | 'op' — B + 2nd step + shortcut | 'reverse' — A, B from C | 'mixed')
    triangleOperateurs: {
      generate(params = {}) {
        const opMode = params.op ?? 'mult';
        const div = opMode === 'div' || (opMode === 'mixed' && Math.random() < 0.5);
        const [a, b] = randItem(
          params.pairs ?? [
            [10, 10],
            [10, 100],
            [100, 10],
          ]
        );
        const dec = rand(0, params.decimals ?? 0);
        const scale = 10 ** dec;
        let small = rand((params.startMin ?? 2) * scale, (params.startMax ?? 99) * scale);
        if (dec > 0 && small % 10 === 0) small += rand(1, 9); // really show `dec` decimals
        const val = (units) => Number((units / scale).toFixed(dec));
        const fmt = (n) => n.toLocaleString('fr-FR', { maximumFractionDigits: 6 });

        // Integer arithmetic on scaled units, then back to decimals
        const values = div ? [small * a * b, small * b, small].map(val) : [small, small * a, small * a * b].map(val);
        const steps = [a, b, a * b];

        const mode = params.blanks === 'mixed' ? randItem(['nodes', 'op', 'reverse']) : (params.blanks ?? 'nodes');
        const blankNodes = { nodes: [0, 1, 1], op: [0, 1, 0], reverse: [1, 1, 0] }[mode];
        const blankOps = mode === 'op' ? [0, 1, 1] : [0, 0, 0];

        const answers = [];
        const cell = (v, blank, extra = {}) => {
          if (!blank) return { ...extra, value: fmt(v) };
          answers.push(String(v));
          return { ...extra, blank: true, idx: answers.length - 1 };
        };
        const nodes = values.map((v, i) => cell(v, blankNodes[i]));
        const ops = steps.map((k, i) => cell(k, blankOps[i], { sign: div ? ':' : '×' }));
        return { type: 'op-triangle', opTri: { nodes, ops, answers } };
      },
    },

    // ecrituresNombre: number-forms — one target, one writing per operation with a blank (40 = ? × 5, 9 + ?, 100 − ?, ? : 2)
    // params: level ('cm1'|'cm2'), targets (override list)
    //   cm2 adds double products (? × 2 × 5), bigger numbers and blanks on the divisor side (60 : ?)
    ecrituresNombre: {
      generate(params = {}) {
        const cm2 = params.level === 'cm2';
        const T = randItem(
          params.targets ??
            (cm2
              ? [60, 72, 80, 90, 100, 120, 150, 180, 200, 240, 250, 300, 360, 400, 500, 600, 1000]
              : [12, 18, 20, 24, 30, 36, 40, 45, 48, 50, 60, 72, 80, 90, 100])
        );
        const fmt = (n) => n.toLocaleString('fr-FR');
        const divs = (n) => Array.from({ length: 9 }, (_, i) => i + 2).filter((k) => n % k === 0 && k < n);
        const row = (before, after, answer) => ({ before, after, answer: String(answer) });

        const mul = () => {
          const pairs = cm2
            ? divs(T)
                .flatMap((a) => divs(T / a).map((b) => [a, b]))
                .filter(([a, b]) => a * b < T)
            : [];
          if (pairs.length && Math.random() < 0.6) {
            const [a, b] = randItem(pairs);
            return row('', `× ${a} × ${b}`, T / (a * b));
          }
          const k = randItem(divs(T)) ?? 1; // prime targets (custom lists) fall back to × 1
          return Math.random() < 0.5 ? row('', `× ${k}`, T / k) : row(`${k} ×`, '', T / k);
        };
        const add = () => {
          const a = rand(1, T - 1);
          return Math.random() < 0.7 ? row(`${fmt(a)} +`, '', T - a) : row('', `+ ${fmt(a)}`, T - a);
        };
        const sub = () => {
          // "round" minuend just above T (100 − ? for 40), or the blank as minuend (? − 15)
          const round = [10, 20, 50, 100, 200, 500, 1000, 2000].find((r) => r > T);
          if (Math.random() < 0.65) return row(`${fmt(round)} −`, '', round - T);
          const a = rand(2, cm2 ? 150 : 50);
          return row('', `− ${a}`, T + a);
        };
        const div = () => {
          const k = rand(2, cm2 ? 9 : 5);
          if (cm2 && Math.random() < 0.5) return row(`${fmt(T * k)} :`, '', k);
          return row('', `: ${k}`, T * k);
        };

        const rows = shuffle([mul, add, sub, div]).map((f) => f());
        return {
          type: 'number-forms',
          forms: { target: fmt(T), rows, answers: rows.map((r) => r.answer) },
        };
      },
    },

    decodageEmojis: {
      generate(params = {}) {
        const themes = {
          animals: ['🐶', '🐱', '🐸', '🐵', '🐷', '🐰', '🦊', '🐻', '🐼', '🐨'],
          fruits: ['🍎', '🍊', '🍋', '🍌', '🍇', '🍓', '🍑', '🍒', '🫐', '🥝'],
          monsters: ['👾', '👻', '👹', '👺', '🤖', '👿', '💀', '🎃', '👽', '🧟'],
        };
        const configs = {
          cp: { n: 1, min: 1, max: 5, ops: ['+'], withConst: true },
          ce1: { n: 1, min: 1, max: 9, ops: ['+', '−'], withConst: true },
          ce2: { n: 2, min: 1, max: 9, ops: ['+', '−'], withConst: false },
          cm1: { n: 2, min: 2, max: 9, ops: ['+', '−', '×'], withConst: false },
          cm2: { n: 3, min: 2, max: 9, ops: ['+', '−', '×'], withConst: false },
        };
        const level = params.level || 'cp';
        const cfg = configs[level] || configs.cp;
        const theme = params.theme || randItem(Object.keys(themes));
        const pool = themes[theme] || themes.animals;

        // --- Monster digit mode: emojis represent digits 0-9, form multi-digit numbers ---
        if (params.mode === 'digits') {
          const digitCount = params.digitCount || 4;
          const digits = params.digits || 2; // digits per number
          const ops = params.ops || ['+'];

          // Assign unique digit values to emojis
          const digitPool = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
          const selectedEmojis = shuffle([...pool]).slice(0, digitCount);
          const emojiDigit = {};
          selectedEmojis.forEach((e, i) => {
            emojiDigit[e] = digitPool[i];
          });

          // Build code table
          const badges = selectedEmojis
            .map(
              (e) =>
                `<span class="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg">${e} = ${emojiDigit[e]}</span>`
            )
            .join(' ');
          const codeTable = `<div class="flex flex-wrap justify-center gap-3 mt-3 text-xl font-normal">${badges}</div>`;
          const title = `Décode et calcule${codeTable}`;

          // Build a multi-digit number from random emojis (first digit non-zero)
          const makeNum = () => {
            const parts = [];
            for (let d = 0; d < digits; d++) {
              let e;
              if (d === 0) {
                // First digit must be non-zero
                const nonZero = selectedEmojis.filter((em) => emojiDigit[em] !== 0);
                e = randItem(nonZero.length ? nonZero : selectedEmojis);
              } else {
                e = randItem(selectedEmojis);
              }
              parts.push(e);
            }
            const val = Number(parts.map((e) => emojiDigit[e]).join(''));
            const display = parts.join('');
            return { val, display };
          };

          const op = randItem(ops);
          let a = makeNum(),
            b = makeNum();
          let answer;

          if (op === '×') {
            // For multiplication, keep second operand single-digit to stay reasonable
            const e2 = randItem(selectedEmojis.filter((em) => emojiDigit[em] >= 2) || selectedEmojis);
            b = { val: emojiDigit[e2], display: e2 };
            answer = a.val * b.val;
          } else if (op === '−') {
            if (a.val < b.val) [a, b] = [b, a];
            answer = a.val - b.val;
          } else {
            answer = a.val + b.val;
          }

          const operation = `${a.display} ${op} ${b.display} = ?`;
          return { type: 'number-check', title, operation, answers: [String(answer)] };
        }

        // --- Standard mode: each emoji = a single-digit value used in operations ---
        const emojis = shuffle([...pool]).slice(0, cfg.n);
        const vals = {};
        emojis.forEach((e) => {
          vals[e] = rand(cfg.min, cfg.max);
        });

        // Build code table (shown in title)
        const badges = emojis
          .map(
            (e) =>
              `<span class="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg">${e} = ${vals[e]}</span>`
          )
          .join(' ');
        const codeTable = `<div class="flex flex-wrap justify-center gap-3 mt-3 text-xl font-normal">${badges}</div>`;
        const title = `Décode et calcule${codeTable}`;

        let operation, answer;

        if (cfg.n === 1) {
          // CP/CE1: one emoji + a constant
          const e1 = emojis[0],
            v1 = vals[e1];
          const c = rand(1, cfg.max);
          const op = randItem(cfg.ops);
          if (op === '+') {
            operation = `${e1} + ${c} = ?`;
            answer = v1 + c;
          } else if (v1 >= c) {
            operation = `${e1} − ${c} = ?`;
            answer = v1 - c;
          } else {
            operation = `${c} + ${e1} = ?`;
            answer = c + v1;
          }
        } else if (cfg.n === 2) {
          // CE2/CM1: two emojis
          const [e1, e2] = emojis;
          const v1 = vals[e1],
            v2 = vals[e2];
          const op = randItem(cfg.ops);
          if (op === '×') {
            operation = `${e1} × ${e2} = ?`;
            answer = v1 * v2;
          } else if (op === '−') {
            if (v1 >= v2) {
              operation = `${e1} − ${e2} = ?`;
              answer = v1 - v2;
            } else {
              operation = `${e2} − ${e1} = ?`;
              answer = v2 - v1;
            }
          } else {
            operation = `${e1} + ${e2} = ?`;
            answer = v1 + v2;
          }
        } else {
          // CM2: three emojis, two operators
          const [e1, e2, e3] = emojis;
          const v1 = vals[e1],
            v2 = vals[e2],
            v3 = vals[e3];
          const op1 = randItem(cfg.ops),
            op2 = randItem(cfg.ops);

          const calc = (a, op, b) => (op === '×' ? a * b : op === '−' ? a - b : a + b);

          // Apply standard operator precedence
          if (op1 === '×' && op2 !== '×') {
            answer = calc(v1 * v2, op2, v3);
          } else if (op1 !== '×' && op2 === '×') {
            answer = calc(v1, op1, v2 * v3);
          } else {
            // Same precedence: left-to-right
            answer = calc(calc(v1, op1, v2), op2, v3);
          }

          if (answer < 0) {
            operation = `${e1} + ${e2} + ${e3} = ?`;
            answer = v1 + v2 + v3;
          } else {
            operation = `${e1} ${op1} ${e2} ${op2} ${e3} = ?`;
          }
        }

        return { type: 'number-check', title, operation, answers: [String(answer)] };
      },
    },

    // tableEntreeSortie: function table (In/Out) — fill missing outputs
    // params: op ('add'|'sub'|'mult'|'div'), minK, maxK, minIn, maxIn, rows (5), blanks (3), showRule (true)
    tableEntreeSortie: {
      generate(params = {}) {
        const op = params.op ?? 'mult';
        const showRule = params.showRule !== false;
        const rowCount = params.rows ?? 5;
        const blankCount = Math.min(params.blanks ?? 3, rowCount - 1);

        let k, applyRule, ruleStr, inputs;

        if (op === 'add') {
          k = rand(params.minK ?? 1, params.maxK ?? 20);
          const start = rand(params.minIn ?? 1, params.maxIn ?? 20);
          inputs = Array.from({ length: rowCount }, (_, i) => start + i);
          applyRule = (n) => n + k;
          ruleStr = `+ ${k}`;
        } else if (op === 'sub') {
          k = rand(params.minK ?? 1, params.maxK ?? 10);
          const start = rand(k + 2, Math.max(k + 2, (params.maxIn ?? 20) - rowCount + 1));
          inputs = Array.from({ length: rowCount }, (_, i) => start + i);
          applyRule = (n) => n - k;
          ruleStr = `\u2212 ${k}`;
        } else if (op === 'mult') {
          k = rand(params.minK ?? 2, params.maxK ?? 9);
          const start = rand(params.minIn ?? 1, params.maxIn ?? 10);
          inputs = Array.from({ length: rowCount }, (_, i) => start + i);
          applyRule = (n) => n * k;
          ruleStr = `\u00d7 ${k}`;
        } else {
          // div
          k = rand(params.minK ?? 2, params.maxK ?? 9);
          const startMult = rand(params.minIn ?? 1, params.maxIn ?? 8);
          inputs = Array.from({ length: rowCount }, (_, i) => k * (startMult + i));
          applyRule = (n) => n / k;
          ruleStr = `\u00f7 ${k}`;
        }

        // Always show first row; pick remaining shown rows randomly
        const shownCount = rowCount - blankCount;
        const extra = shuffle(Array.from({ length: rowCount - 1 }, (_, i) => i + 1)).slice(0, shownCount - 1);
        const shownSet = new Set([0, ...extra]);

        let blankIdx = 0;
        const rows = inputs.map((n, i) => {
          const out = applyRule(n);
          if (shownSet.has(i)) {
            return [{ value: String(n) }, { value: String(out) }];
          }
          return [{ value: String(n) }, { blank: true, idx: blankIdx++, answer: String(out) }];
        });

        return {
          type: 'fill-table',
          title: showRule
            ? `R\u00e8gle : <strong>${ruleStr}</strong>`
            : 'Trouve la r\u00e8gle et compl\u00e8te le tableau.',
          table: { headers: ['Entr\u00e9e', 'Sortie'], headerCol: true, blankCount, rows },
        };
      },
    },

    /* ── Function Machine ─────────────────────────────────────────────── */
    functionMachineCompute: {
      generate(params = {}) {
        const ops = [
          { label: '× 2', fn: (n) => n * 2 },
          { label: '× 3', fn: (n) => n * 3 },
          { label: '× 4', fn: (n) => n * 4 },
          { label: '× 5', fn: (n) => n * 5 },
          { label: '+ 10', fn: (n) => n + 10 },
          { label: '+ 25', fn: (n) => n + 25 },
          { label: '× 2 + 1', fn: (n) => n * 2 + 1 },
          { label: '× 3 - 1', fn: (n) => n * 3 - 1 },
          { label: '× 10', fn: (n) => n * 10 },
        ];
        const op = randItem(ops);
        const input = rand(params.min || 2, params.max || 12);
        const answer = op.fn(input);
        return {
          type: 'function-machine',
          title: 'Que sort la machine ?',
          machine: {
            mode: 'compute',
            rule: op.label,
            ruleLabel: op.label,
            input,
            answer,
          },
        };
      },
    },

    functionMachineDiscover: {
      generate(params = {}) {
        const ops = [
          { label: '× 2', fn: (n) => n * 2 },
          { label: '× 3', fn: (n) => n * 3 },
          { label: '× 4', fn: (n) => n * 4 },
          { label: '× 5', fn: (n) => n * 5 },
          { label: '+ 5', fn: (n) => n + 5 },
          { label: '+ 10', fn: (n) => n + 10 },
          { label: '× 2 + 1', fn: (n) => n * 2 + 1 },
          { label: '- 3', fn: (n) => n - 3 },
        ];
        const correctIdx = rand(0, ops.length - 1);
        const correct = ops[correctIdx];
        const inputs = randUnique(params.min || 2, params.max || 10, 3);
        const pairs = inputs.map((n) => ({ in: n, out: correct.fn(n) }));
        const distractors = shuffle(ops.filter((_, i) => i !== correctIdx))
          .filter((op) => inputs.some((n) => op.fn(n) !== correct.fn(n)))
          .slice(0, 3);
        const choices = shuffle([correct, ...distractors]).map((o) => o.label);
        const answerIdx = choices.indexOf(correct.label);
        return {
          type: 'function-machine',
          title: 'Quelle est la règle ?',
          machine: {
            mode: 'discover',
            pairs,
            choices,
            answer: answerIdx,
          },
        };
      },
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = generators;
  else Object.assign((root.AppGenerators = root.AppGenerators || {}), generators);
})(typeof window !== 'undefined' ? window : globalThis);
