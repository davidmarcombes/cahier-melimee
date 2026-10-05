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
    // params: powers, maxDec, wholeMin, wholeMax, variants (array of hole types)
    multDivTrou: {
      generate(params = {}) {
        const powers = params.powers ?? [10, 100, 1000];
        const maxDec = params.maxDec ?? 2;
        const wholeMin = params.wholeMin ?? 1;
        const wholeMax = params.wholeMax ?? 99;
        const variants = params.variants ?? ['mult_input', 'div_result', 'div_power'];

        const power = powers[rand(0, powers.length - 1)];
        const pExp = Math.round(Math.log10(power));
        const d = rand(0, maxDec);
        const whole = rand(wholeMin, wholeMax);

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
          // div_power: randomly show as × or ÷ form
          const asMult = rand(0, 1);
          operation = asMult ? `${inputStr} × ? = ${resultStr}` : `${resultStr} \u00f7 ? = ${inputStr}`;
          answers = [String(power), powerStr];
        }

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
