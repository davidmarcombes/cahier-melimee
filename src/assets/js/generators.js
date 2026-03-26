const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randItem = (arr) => arr[rand(0, arr.length - 1)];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const randUnique = (min, max, count) => {
  const set = new Set();
  while (set.size < count) set.add(rand(min, max));
  return [...set];
};

const toRoman = (num) => {
  const map = {
    M: 1000,
    CM: 900,
    D: 500,
    CD: 400,
    C: 100,
    XC: 90,
    L: 50,
    XL: 40,
    X: 10,
    IX: 9,
    V: 5,
    IV: 4,
    I: 1,
  };
  let result = '';

  for (const key in map) {
    while (num >= map[key]) {
      result += key;
      num -= map[key];
    }
  }
  return result;
};

const fromRoman = (str) => {
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;

  for (let i = 0; i < str.length; i++) {
    const current = map[str[i]];
    const next = map[str[i + 1]];

    if (next > current) {
      total += next - current;
      i++;
    } else {
      total += current;
    }
  }
  return total;
};

const generators = {
  multiplicationSimple: {
    generate: (params = {}) => {
      let minA = params.minA ?? 2, maxA = params.maxA ?? 10;
      if (maxA < minA) [minA, maxA] = [maxA, minA];
      let minB = params.minB ?? 2, maxB = params.maxB ?? 12;
      if (maxB < minB) [minB, maxB] = [maxB, minB];
      const a = rand(minA, maxA), b = rand(minB, maxB);
      return { type: 'number-check', operation: `${a} \u00d7 ${b}`, answers: [String(a * b)] };
    },
  },

  additionSimple: {
    generate: (params = {}) => {
      let minA = params.minA ?? 10, maxA = params.maxA ?? 99;
      if (maxA < minA) [minA, maxA] = [maxA, minA];
      let minB = params.minB ?? 10, maxB = params.maxB ?? 99;
      if (maxB < minB) [minB, maxB] = [maxB, minB];
      const a = rand(minA, maxA), b = rand(minB, maxB);
      return { type: 'number-check', operation: `${a} + ${b}`, answers: [String(a + b)] };
    },
  },

  additionTrou: {
    generate: (params = {}) => {
      let minT = params.minTotal ?? 20, maxT = params.maxTotal ?? 100;
      if (maxT < minT) [minT, maxT] = [maxT, minT];
      const total = rand(minT, maxT);
      const a = rand(2, Math.max(2, total - 5));
      const b = total - a, missing = Math.random() > 0.5 ? 'a' : 'b';
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
        const lo = step, hi = target - step;
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
          const lo2 = step, hi2 = fake - step;
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

      const all = shuffle([
        ...corrects.map(p => ({ p, ok: true })),
        ...incorrects.map(p => ({ p, ok: false })),
      ]);

      const fmt = n => n.toLocaleString('fr-FR');
      return {
        type: 'tile-select',
        tiles: all.map(({ p }) => `${fmt(p[0])} + ${fmt(p[1])}`),
        tileAnswers: all.map(({ ok }, i) => ok ? i : -1).filter(i => i !== -1),
        body: `Sélectionne toutes les cases dont le résultat est <strong>${fmt(target)}</strong>.`,
      };
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

  ajouterSoustraire10: {
    generate: (params = {}) => {
      const n = rand(params.min ?? 1, params.max ?? 89);
      const add = Math.random() > 0.5;
      const op = add ? `${n} + 10 = ?` : `${n + 10} - 10 = ?`;
      return { type: 'number-check', operation: op, answers: [String(add ? n + 10 : n)] };
    },
  },

  decompositionBase10: {
    generate: (params = {}) => {
      const t = rand(params.minTens ?? 1, params.maxTens ?? 9);
      const u = rand(params.minOnes ?? 0, params.maxOnes ?? 9);

      const op = u === 0
        ? `${t}__dizaine${t > 1 ? 's' : ''} 0__unité__=__?`
        : `${t}__dizaine${t > 1 ? 's' : ''} ${u}__unité${u > 1 ? 's' : ''}__=__?`;

      return { type: 'number-check', operation: op, answers: [String(t * 10 + u)] };
    },
  },

  pairOuImpair: {
    generate: (params = {}) => {
      const num = rand(params.min ?? 1, params.max ?? 100);
      return { type: 'number-check', operation: String(num), answers: [num % 2 === 0 ? 'pair' : 'impair'] };
    },
  },

  ruler: {
    generate: (params = {}) => {
      const min = params.min ?? 0;
      const max = params.max ?? 10;
      const divisions = params.divisions ?? 1;
      const subdivisions = params.subdivisions ?? 0;
      const label = params.label ?? 'A';
      const step = subdivisions > 0 ? 1 / (divisions * subdivisions) : 1 / divisions;
      const totalSteps = Math.round((max - min) / step);
      const idx = rand(1, totalSteps - 1);
      const value = Math.round((min + idx * step) * 10000) / 10000;
      const answer = Number.isInteger(value) ? String(value) : String(value).replace('.', ',');
      return {
        type: 'ruler',
        title: `Lis la valeur indiqu\u00e9e par ${label}`,
        ruler: { min, max, divisions, subdivisions, markers: [{ label, value }] },
        answers: [answer],
      };
    },
  },

  romanNumerals: {
    generate: (params = {}) => {
      const min = params.min ?? 1;
      const max = params.max ?? 39;
      const num = rand(min, max);
      const roman = toRoman(num);
      return { type: 'number-check', operation: roman, answers: [String(num)] };
    },
  },

  romanNumeralsReverse: {
    generate: (params = {}) => {
      const min = params.min ?? 1;
      const max = params.max ?? 39;
      const num = rand(min, max);
      const roman = toRoman(num);
      return { type: 'number-check', operation: String(num), answers: [roman] };
    },
  },

  recomposerNombre: {
    generate: (params = {}) => {
      const magnitude = rand(params.min ?? 2, params.max ?? 6);
      const digits = [];
      for (let i = 0; i < magnitude; i++) {
        digits.push(rand(0, 9));
      }
      const num = digits.reduce((acc, digit) => acc * 10 + digit, 0);
      const strDecompose = digits
        .map((digit, index) => {
          const power = magnitude - index - 1;
          return `${digit} x 10^{${power}}`;
        })
        .join(' + ');
      return { type: 'number-check', operation: strDecompose, answers: [String(num)] };
    },
  },

  arrondirNombre: {
    generate: (params = {}) => {
      const order = params.order ?? rand(2, 5);
      const magnitude = params.magnitude ?? rand(order, order + 2);

      const digits = [];
      for (let i = 0; i < magnitude; i++) {
        digits.push(rand(0, 9));
      }
      const num = digits.reduce((acc, digit) => acc * 10 + digit, 0);
      const rounded = Math.round(num / Math.pow(10, order)) * Math.pow(10, order);
      return { type: 'number-check', operation: `${num}&ensp;≈&ensp;?`, answers: [String(rounded)] };
    },
  },

  complementNombre: {
    generate: (params = {}) => {
      const target = params.target ?? 10 ** rand(1, 4);
      const step = params.step ?? 1;
      const min = params.min ?? step;
      const max = params.max ?? target - step;
      const slots = Math.floor((max - min) / step) + 1;
      const num = min + rand(0, slots - 1) * step;
      const complement = target - num;
      const fmt = n => n.toLocaleString('fr-FR');
      const side = params.side === 'random'
        ? (rand(0, 1) ? 'right' : 'left')
        : (params.side ?? 'right');
      const op = side === 'right'
        ? `${fmt(num)} + ? = ${fmt(target)}`
        : `? + ${fmt(num)} = ${fmt(target)}`;
      return { type: 'number-check', operation: op, answers: [String(complement)] };
    },
  },

  estimationSomme: {
    generate: (params = {}) => {
      const count = params.count ?? 2;
      const min = params.min ?? 10;
      const max = params.max ?? 99;
      const precision = params.precision ?? 10;

      const nums = [];
      for (let i = 0; i < count; i++) nums.push(rand(min, max));
      const sum = nums.reduce((a, b) => a + b, 0);
      const correct = Math.round(sum / precision) * precision;

      const candidates = [-3, -2, -1, 1, 2, 3]
        .sort(() => Math.random() - 0.5)
        .map((n) => correct + n * precision)
        .filter((w) => w > 0);
      const wrongs = [...new Set(candidates)].slice(0, 2);

      const choices = [String(correct), ...wrongs.map(String)];
      for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
      }
      return {
        type: 'mcq',
        operation: nums.join(' + '),
        mcqChoices: choices,
        mcqAnswer: choices.indexOf(String(correct)),
        answers: [String(correct)],
        mcqCompact: true,
      };
    },
  },

  egalitesFractions: {
    generate: (params = {}) => {
      const frac = (n, d) => `<span class="frac"><span class="fn">${n}</span><span class="fd">${d}</span></span>`;
      // a=1..8, b=1..8 so a+1 and b+1 stay ≤ 9
      const a = rand(params.minInt ?? 1, params.maxInt ?? 8);
      const b = rand(params.minTenth ?? 1, params.maxTenth ?? 8);
      const num = a * 10 + b; // e.g. 72 for a=7, b=2

      // Always 2 correct tiles: fraction form + mixed form
      const correct = [
        frac(num, 10), // 72/10
        `${a} + ${frac(b, 10)}`, // 7 + 2/10
      ];

      // Wrong tiles: wrong integer OR wrong tenths
      const wrongs = [
        `${a + 1} + ${frac(b, 10)}`, // (a+1) + b/10
        `${a} + ${frac(b + 1, 10)}`, // a + (b+1)/10
      ];

      // 3 or 4 tiles total (1 or 2 wrong)
      const numWrong = Math.random() > 0.5 ? 2 : 1;
      const selectedWrong = wrongs.slice(0, numWrong);

      // Shuffle all tiles, track correct indices
      const pool = [...correct.map((t) => ({ t, ok: true })), ...selectedWrong.map((t) => ({ t, ok: false }))].sort(
        () => Math.random() - 0.5
      );

      return {
        type: 'tile-select',
        title: `Coche toutes les expressions qui valent ${frac(num, 10)}`,
        tiles: pool.map((p) => p.t),
        tileAnswers: pool.map((p, i) => (p.ok ? i : -1)).filter((i) => i !== -1),
      };
    },
  },

  plusGrandeFraction: {
    generate(params = {}) {
      const frac = (n, d) => `<span class="frac"><span class="fn">${n}</span><span class="fd">${d}</span></span>`;
      // a ≥ 2 so we can always find a mixed number strictly below N/10
      const a = rand(params.minA ?? 2, params.maxA ?? 6);
      const t = rand(1, 9);
      const N = a * 10 + t; // anchor two-digit number, e.g. 37

      // Three candidates (values stored as integer hundredths for exact comparison):
      //   A: N/100  — always the smallest (0.NN < 1)
      //   B: N/10   — the anchor fraction with /10
      //   C: c + d/10 — a mixed number, randomly above or below B
      const cAbove = Math.random() < 0.5;
      const c = cAbove ? rand(a + 1, Math.min(a + 3, 9)) : rand(1, a - 1);
      const d = rand(1, 9);

      const vA = N; // hundredths for N/100
      const vB = N * 10; // hundredths for N/10
      const vC = c * 100 + d * 10; // hundredths for c + d/10

      const tiles = [
        { v: vA, html: frac(N, 100) },
        { v: vB, html: frac(N, 10) },
        { v: vC, html: `${c}&nbsp;+&nbsp;${frac(d, 10)}` },
      ].sort(() => Math.random() - 0.5);

      const maxV = Math.max(vA, vB, vC);
      const correctIdx = tiles.findIndex((tile) => tile.v === maxV);

      return {
        type: 'tile-select',
        title: 'Clique sur le plus grand nombre',
        tiles: tiles.map((tile) => tile.html),
        tileAnswers: [correctIdx],
      };
    },
  },

  // 5 tiles, 2 or 3 correct — find the ones that are equal (no target shown)
  // Representations of a + b/10: N/10, N*10/100, a+b/10, a+b*10/100
  fractionsEgales5: {
    generate(params = {}) {
      const frac = (n, d) => `<span class="frac"><span class="fn">${n}</span><span class="fd">${d}</span></span>`;
      const a = rand(params.minA ?? 1, params.maxA ?? 8);
      const b = rand(1, 9);
      const N = a * 10 + b; // e.g. 42 for a=4, b=2

      // All 4 correct representations of a + b/10
      const allCorrect = [
        frac(N, 10),                                 // 42/10
        frac(N * 10, 100),                           // 420/100
        `${a}&nbsp;+&nbsp;${frac(b, 10)}`,           // 4 + 2/10
        `${a}&nbsp;+&nbsp;${frac(b * 10, 100)}`,     // 4 + 20/100
      ];

      // Pick k correct (2 or 3)
      const k = rand(2, 3);
      const chosen = [...allCorrect].sort(() => Math.random() - 0.5).slice(0, k);

      // Distractors — different values that look plausible
      const dPool = [];
      if (b !== a) dPool.push(frac(b * 10 + a, 10));           // swap digits: ba/10
      if (a > 1) dPool.push(frac((a - 1) * 10 + b, 10));    // (a-1).b
      if (a < 9) dPool.push(frac((a + 1) * 10 + b, 10));    // (a+1).b
      if (b !== a) dPool.push(`${b}&nbsp;+&nbsp;${frac(a, 10)}`); // b + a/10
      dPool.push(frac(N * 10 + 1, 100));                       // N*10+1 /100 (≠ N*10/100)
      dPool.push(frac(a * 10, 10));                            // a.0
      dPool.push(frac(N, 100));                                // 0.N (wrong denominator)
      dPool.push(`${a}&nbsp;+&nbsp;${frac(b, 100)}`);          // a + b/100 (= a.0b)

      const distractors = [...new Set(dPool)]
        .filter(d => !chosen.includes(d))
        .sort(() => Math.random() - 0.5)
        .slice(0, 5 - k);

      const pool = [...chosen, ...distractors].sort(() => Math.random() - 0.5);
      const tileAnswers = chosen.map(c => pool.indexOf(c));
      const kLabel = k === 2 ? 'les 2 nombres égaux' : 'les 3 nombres égaux';

      return {
        type: 'tile-select',
        title: `Clique sur ${kLabel}`,
        tiles: pool,
        tileAnswers,
      };
    },
  },

  recomposerFractions: {
    generate: (params = {}) => {
      const frac = (n, d) => `<span class="frac"><span class="fn">${n}</span><span class="fd">${d}</span></span>`;
      const level = params.level ?? 'mixed';
      // patterns: 1=a+b/10, 2=a+b/10+c/100, 3=b/10+c/100
      const pool = level === 'tenths' ? [1] : level === 'hundredths' ? [2, 3] : [1, 2, 3];
      const pattern = randItem(pool);

      if (pattern === 1) {
        const a = rand(1, 9);
        const b = rand(1, 9);
        return {
          type: 'fraction-check',
          title: 'Recompose la fraction',
          operation: `${a} + ${frac(b, 10)}`,
          answers: [`${a * 10 + b}/10`],
        };
      }
      if (pattern === 2) {
        const a = rand(1, 5);
        const b = rand(0, 9);
        const c = rand(1, 9);
        const parts = [String(a)];
        if (b > 0) parts.push(`+ ${frac(b, 10)}`);
        parts.push(`+ ${frac(c, 100)}`);
        return {
          type: 'fraction-check',
          title: 'Recompose la fraction',
          operation: parts.join(' '),
          answers: [`${a * 100 + b * 10 + c}/100`],
        };
      }
      // pattern === 3
      const b = rand(1, 9);
      const c = rand(1, 9);
      return {
        type: 'fraction-check',
        title: 'Recompose la fraction',
        operation: `${frac(b, 10)} + ${frac(c, 100)}`,
        answers: [`${b * 10 + c}/100`],
      };
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
        A = rand(min, max); B = rand(min, max); C = rand(min, max);
        f = A * B; d = A * C; e = B * C;
      } else {
        A = rand(min, max); B = rand(min, max); C = rand(min, max);
        f = A + B; d = A + C; e = B + C;
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
          left = `${a} + ${b}`; right = `${a} + ${c}`;
          answer = delta > 0 ? '>' : '<';

        } else if (strategy === 'sameLeftSub') {
          const a = rand(min + 20, max);
          const b = rand(5, 20);
          const delta = rand(1, 5) * (Math.random() < 0.5 ? 1 : -1);
          const c = b + delta;
          if (c <= 0 || c >= a) continue;
          left = `${a} − ${b}`; right = `${a} − ${c}`;
          answer = delta > 0 ? '<' : '>'; // subtracting more → smaller result

        } else if (strategy === 'compensAdd') {
          const a = rand(min, max - 20);
          const b = rand(10, 30);
          const k = rand(1, 5);
          if (b - k <= 0) continue;
          left = `${a} + ${b}`; right = `${a + k} + ${b - k}`;
          answer = '=';

        } else if (strategy === 'sameFactMult') {
          const a = rand(2, maxFactor);
          const b = rand(2, maxFactor);
          const delta = rand(1, 2) * (Math.random() < 0.5 ? 1 : -1);
          const c = b + delta;
          if (c < 2 || c > maxFactor + 2) continue;
          left = `${a} × ${b}`; right = `${a} × ${c}`;
          answer = delta > 0 ? '>' : '<';

        } else if (strategy === 'sameDivDiv') {
          const a = rand(2, maxFactor);
          const b = rand(2, maxFactor);
          if (a === b) continue;
          const dividend = a * b * rand(1, 2);
          left = `${dividend} ÷ ${a}`; right = `${dividend} ÷ ${b}`;
          answer = a < b ? '>' : '<'; // smaller divisor → bigger quotient

        } else if (strategy === 'distribMult') {
          const a = rand(2, maxFactor);
          const b = rand(3, maxFactor);
          if (Math.random() < 0.5) {
            left = `${a} × ${b}`; right = `${a} × ${b - 1} + ${a}`;
          } else {
            left = `${a} × ${b}`; right = `${a} × ${b + 1} − ${a}`;
          }
          answer = '=';

        } else if (strategy === 'compensMult') {
          const a = rand(2, Math.floor(maxFactor / 2));
          const b = rand(2, maxFactor);
          if (b % 2 !== 0) continue;
          left = `${a} × ${b}`; right = `${a * 2} × ${b / 2}`;
          answer = '=';
        }

        comparisons.push({ left, right, answer });
      }

      return { type: 'compare', comparisons };
    },
  },

  comparerNombresPaires: {
    generate: (params = {}) => {
      const min = params.min ?? 1;
      const max = params.max ?? 100;
      const count = params.count ?? 4;
      const comparisons = [];
      for (let i = 0; i < count; i++) {
        let a = rand(min, max);
        let b = rand(min, max);
        while (a === b) b = rand(min, max);
        comparisons.push({ left: String(a), right: String(b), answer: a < b ? '<' : '>' });
      }
      return { type: 'compare', comparisons };
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

  compterDeN: {
    generate: (params = {}) => {
      const stepChoices = params.step ? [params.step] : [2, 5, 10];
      const step = stepChoices[rand(0, stepChoices.length - 1)];
      const asc = params.direction ? params.direction === 'asc' : Math.random() > 0.5;
      const startVal = asc ? rand(0, 7) * step : rand(5, 12) * step;
      const given = asc
        ? [startVal, startVal + step, startVal + 2 * step]
        : [startVal, startVal - step, startVal - 2 * step];
      const answers = asc
        ? [startVal + 3 * step, startVal + 4 * step, startVal + 5 * step]
        : [startVal - 3 * step, startVal - 4 * step, startVal - 5 * step];
      if (answers.some((v) => v < 0)) {
        return {
          type: 'sequence',
          sequence: { given: [0, step, step * 2].map(String), answers: [step * 3, step * 4, step * 5].map(String) },
        };
      }
      return { type: 'sequence', sequence: { given: given.map(String), answers: answers.map(String) } };
    },
  },

  additionDecimaux: {
    generate: (params = {}) => {
      const decimals = params.decimals ?? 1;
      const max = params.max ?? 9;
      const scale = Math.pow(10, decimals);
      const a = rand(1, max * scale) / scale;
      const b = rand(1, max * scale) / scale;
      const result = Math.round((a + b) * scale) / scale;
      const fmt = (n) => String(n).replace('.', ',');
      return { type: 'number-check', operation: `${fmt(a)} + ${fmt(b)}`, answers: [fmt(result)] };
    },
  },

  soustractionDecimaux: {
    generate: (params = {}) => {
      const decimals = params.decimals ?? 1;
      const max = params.max ?? 9;
      const scale = Math.pow(10, decimals);
      let a = rand(2, max * scale) / scale;
      let b = rand(1, Math.round(a * scale) - 1) / scale;
      const result = Math.round((a - b) * scale) / scale;
      const fmt = (n) => String(n).replace('.', ',');
      return { type: 'number-check', operation: `${fmt(a)} - ${fmt(b)}`, answers: [fmt(result)] };
    },
  },

  comparerDecimaux: {
    generate: (params = {}) => {
      const decimals = params.decimals ?? 1;
      const max = params.max ?? 9;
      const count = params.count ?? 4;
      const scale = Math.pow(10, decimals);
      const fmt = (n) => String(n).replace('.', ',');
      const comparisons = [];
      for (let i = 0; i < count; i++) {
        let a = rand(1, max * scale) / scale;
        let b = rand(1, max * scale) / scale;
        while (a === b) b = rand(1, max * scale) / scale;
        comparisons.push({ left: fmt(a), right: fmt(b), answer: a < b ? '<' : '>' });
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

  decompositionCentaines: {
    generate: (params = {}) => {
      const maxH = params.maxHundreds ?? 9;
      const h = rand(params.minHundreds ?? 1, maxH);
      const t = rand(params.minTens ?? 0, params.maxTens ?? 9);
      const u = rand(params.minOnes ?? 0, params.maxOnes ?? 9);
      const parts = [`${h} centaine${h > 1 ? 's' : ''}`];
      if (t > 0) parts.push(`${t} dizaine${t > 1 ? 's' : ''}`);
      if (u > 0) parts.push(`${u} unité${u > 1 ? 's' : ''}`);
      if (t === 0 && u === 0) parts.push('0 dizaine et 0 unité');
      return { type: 'number-check', operation: `${parts.join(' et ')} = ?`, answers: [String(h * 100 + t * 10 + u)] };
    },
  },

  compterDeNCE1: {
    generate: (params = {}) => {
      const stepChoices = params.steps ?? [2, 3, 4, 5, 10];
      const step = stepChoices[rand(0, stepChoices.length - 1)];
      const asc = params.direction ? params.direction === 'asc' : Math.random() > 0.5;
      const maxStart = params.max ?? 100;
      const startVal = asc
        ? rand(0, Math.floor((maxStart - 5 * step) / step)) * step
        : rand(5, Math.floor(maxStart / step)) * step;
      const given = asc
        ? [startVal, startVal + step, startVal + 2 * step]
        : [startVal, startVal - step, startVal - 2 * step];
      const answers = asc
        ? [startVal + 3 * step, startVal + 4 * step, startVal + 5 * step]
        : [startVal - 3 * step, startVal - 4 * step, startVal - 5 * step];
      if (answers.some((v) => v < 0)) {
        return {
          type: 'sequence',
          sequence: { given: [0, step, step * 2].map(String), answers: [step * 3, step * 4, step * 5].map(String) },
        };
      }
      return { type: 'sequence', sequence: { given: given.map(String), answers: answers.map(String) } };
    },
  },

  soustractionSimple: {
    generate: (params = {}) => {
      const a = rand(params.minA ?? 10, params.maxA ?? 99);
      const b = rand(params.minB ?? 1, params.maxB ?? Math.min(a - 1, 99));
      return { type: 'number-check', operation: `${a} - ${b}`, answers: [String(a - b)] };
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

  perimetreFormes: {
    generate: (params = {}) => {
      const shapes = ['square', 'rectangle', 'triangle'];
      const shape = shapes[rand(0, 2)];

      if (shape === 'square') {
        const side = rand(params.minSide ?? 3, params.maxSide ?? 12);
        return {
          type: 'number-check',
          title: 'Calcule le périmètre du carré (en cm)',
          svg: { gen: 'squareSvg', par: { size: 80, label: `${side} cm` } },
          answers: [String(4 * side)],
        };
      }

      if (shape === 'rectangle') {
        const w = rand(params.minW ?? 3, params.maxW ?? 14);
        let h = rand(params.minH ?? 2, params.maxH ?? 10);
        if (h === w) h = h < 10 ? h + 1 : h - 1;
        const maxSide = Math.max(w, h);
        const sc = 100 / maxSide;
        return {
          type: 'number-check',
          title: 'Calcule le périmètre du rectangle (en cm)',
          svg: {
            gen: 'rectangleSvg',
            par: { w: Math.round(w * sc), h: Math.round(h * sc), labelW: `${w} cm`, labelH: `${h} cm` },
          },
          answers: [String(2 * (w + h))],
        };
      }

      // Triangle: right triangle using Pythagorean triples
      const triples = [
        [3, 4, 5],
        [6, 8, 10],
        [5, 12, 13],
        [9, 12, 15],
      ];
      const [ta, tb, tc] = randItem(triples);
      const maxLeg = Math.max(ta, tb);
      const ps = 100 / maxLeg;
      return {
        type: 'number-check',
        title: 'Calcule le périmètre du triangle (en cm)',
        svg: {
          gen: 'triangleSvg',
          par: {
            pixA: Math.round(ta * ps),
            pixB: Math.round(tb * ps),
            labelA: `${ta} cm`,
            labelB: `${tb} cm`,
            labelC: `${tc} cm`,
          },
        },
        answers: [String(ta + tb + tc)],
      };
    },
  },

  // Sort: order decimal numbers
  // params: count (4), decimals (1), min (1), max (9), direction ('asc'), confusable (false)
  // confusable=true forces all values to share the same integer part (harder to sort)
  trierDecimaux: {
    generate(params = {}) {
      const count = params.count ?? 4;
      const dec = params.decimals ?? 1;
      const direction = params.direction ?? 'asc';
      const scale = Math.pow(10, dec);
      const confusable = params.confusable ?? false;

      const values = new Set();
      if (confusable) {
        // Same integer part, differ only in decimals
        const intPart = rand(params.min ?? 1, params.max ?? 9);
        while (values.size < count) values.add(intPart * scale + rand(0, scale - 1));
      } else {
        const lo = (params.min ?? 1) * scale;
        const hi = (params.max ?? 9) * scale;
        while (values.size < count) values.add(rand(lo, hi));
      }

      const fmt = (n) => (n / scale).toFixed(dec).replace('.', ',');
      const sorted = [...values].sort((a, b) => (direction === 'asc' ? a - b : b - a)).map(fmt);
      const title = direction === 'asc' ? 'Ordre croissant' : 'Ordre décroissant';
      return { type: 'sort', title, items: sorted, direction };
    },
  },

  // number-check + abacusSvg: read a boulier (abacus) and write the number
  // params: minDigits (3), maxDigits (6), allowZeroDigit (true)
  //   allowZeroDigit=false → all digits 1-9 (CE2 intro level)
  lireAbacus: {
    generate(params = {}) {
      const ALL_PV = [
        { label: '1\u202f000\u202f000', pv: 1000000 },
        { label: '100\u202f000', pv: 100000 },
        { label: '10\u202f000', pv: 10000 },
        { label: '1\u202f000', pv: 1000 },
        { label: '100', pv: 100 },
        { label: '10', pv: 10 },
        { label: '1', pv: 1 },
      ];
      const minD = params.minDigits ?? 3;
      const maxD = params.maxDigits ?? 6;
      const numD = params.digits ?? rand(minD, maxD);
      const allowZero = params.allowZeroDigit ?? true;

      const pvSlice = ALL_PV.slice(ALL_PV.length - numD);
      const digits = pvSlice.map((_, i) => (i === 0 ? rand(1, 9) : allowZero ? rand(0, 9) : rand(1, 9)));

      const number = pvSlice.reduce((sum, { pv }, i) => sum + digits[i] * pv, 0);
      const rows = pvSlice.map(({ label }, i) => ({ label, value: digits[i] }));

      return {
        type: 'number-check',
        title: 'Quel nombre est représenté sur le boulier ?',
        svg: { gen: 'abacusSvg', par: { rows, beadsPerRow: 10 } },
        answers: [String(number)],
      };
    },
  },

  // fill-table + decompoChipsHtml: read place-value chips, fill the numeration table
  // params: minDigits (3), maxDigits (6), allowZeroDigit (true)
  decompoTableau: {
    generate(params = {}) {
      const ALL_PV = [
        { label: '1\u202f000\u202f000', pv: 1000000 },
        { label: '100\u202f000', pv: 100000 },
        { label: '10\u202f000', pv: 10000 },
        { label: '1\u202f000', pv: 1000 },
        { label: '100', pv: 100 },
        { label: '10', pv: 10 },
        { label: '1', pv: 1 },
      ];
      const minD = params.minDigits ?? 3;
      const maxD = params.maxDigits ?? 6;
      const numD = params.digits ?? rand(minD, maxD);
      const allowZero = params.allowZeroDigit ?? true;

      const pvSlice = ALL_PV.slice(ALL_PV.length - numD);
      const digits = pvSlice.map((_, i) => (i === 0 ? rand(1, 9) : allowZero ? rand(0, 9) : rand(1, 9)));

      const chips = pvSlice.map(({ label }, i) => ({ label, value: digits[i] }));
      const rows = [pvSlice.map(({ label }, i) => ({ blank: true, idx: i, answer: String(digits[i]) }))];

      return {
        type: 'fill-table',
        title: 'Remplis le tableau de numération.',
        svg: { gen: 'decompoChipsHtml', par: { chips } },
        table: { blankCount: numD, headers: pvSlice.map(({ label }) => label), rows },
      };
    },
  },

  // checkbox: find all valid decompositions of a hundredths fraction (N/100)
  // params: withZeros (false) — allow 0 in tenths/hundredths digit
  decompoFraction: {
    generate(params = {}) {
      const a = rand(1, 9);
      const b = params.withZeros ? rand(0, 9) : rand(1, 9); // tenths digit
      const c = rand(1, 9); // hundredths digit (always ≥1)
      const N = a * 100 + b * 10 + c;

      // Inline fraction: stacked numerator/denominator
      const F = (n, d) =>
        `<span style="display:inline-flex;flex-direction:column;align-items:center;` +
        `vertical-align:-0.35em;margin:0 2px;line-height:1.2;font-size:0.9em">` +
        `<span style="border-bottom:1px solid currentColor;padding:0 3px;text-align:center">${n}</span>` +
        `<span style="padding:0 3px;text-align:center">${d}</span></span>`;

      const P = ' + ';
      // --- Valid decompositions ---
      const valid = [
        ...(b > 0 ? [`${a}${P}${F(b, 10)}${P}${F(c, 100)}`] : []), // a + b/10 + c/100
        `${a}${P}${F(b * 10 + c, 100)}`, // a + (10b+c)/100
        `${F(a * 100 + b * 10, 100)}${P}${F(c, 100)}`, // (100a+10b)/100 + c/100
        `${F(a * 10 + b, 10)}${P}${F(c, 100)}`, // (10a+b)/10 + c/100
        ...(b > 0 ? [`${F(a * 100, 100)}${P}${F(b * 10, 100)}${P}${F(c, 100)}`] : []), // 100a/100 + 10b/100 + c/100
      ];

      // --- Invalid distractors (look similar, compute to wrong value) ---
      const invalid = [
        ...(b > 0 && b !== c ? [`${a}${P}${F(c, 10)}${P}${F(b, 100)}`] : []), // swap b↔c
        ...(b > 0 ? [`${a}${P}${F(b, 10)}${P}${F(c, 10)}`] : [`${a}${P}${F(c, 10)}`]), // c/10 not c/100
        ...(b > 0 ? [`${F(a * 100, 100)}${P}${F(b * 10, 10)}${P}${F(c, 100)}`] : []), // 10b/10 = integer b
        `${a}${P}${F(b * 10 + c, 1000)}`, // wrong power (/1000)
      ];

      // Pick 3 valid + 3 invalid, shuffle together
      const picked = shuffle([
        ...shuffle(valid)
          .slice(0, 3)
          .map((s) => ({ s, ok: true })),
        ...shuffle(invalid)
          .slice(0, 3)
          .map((s) => ({ s, ok: false })),
      ]);

      return {
        type: 'checkbox',
        title: `Coche toutes les décompositions correctes de ${F(N, 100)}.`,
        statements: picked.map((x) => x.s),
        checkedAnswers: picked.reduce((acc, x, i) => {
          if (x.ok) acc.push(i);
          return acc;
        }, []),
      };
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

  // Tile-select: decompose a decimal number into place-value tiles
  // params: firstPV (3=ones), lastPV (4=tenths), minComponents (1), distractors (auto)
  // PV index: 0=1000, 1=100, 2=10, 3=1, 4=0.1, 5=0.01, 6=0.001
  // facile: firstPV=3, lastPV=4  →  X,X   (e.g. 3,7)
  // moyen:  firstPV=3, lastPV=5  →  X,XX  (e.g. 4,35)
  // difficile: firstPV=2, lastPV=6 → XX,XXX (e.g. 13,035)
  decomposerDecimal: {
    generate(params = {}) {
      const PV = [1000, 100, 10, 1, 0.1, 0.01, 0.001];
      const firstPV = params.firstPV ?? 3;
      const lastPV = params.lastPV ?? 4;
      const pvCount = lastPV - firstPV + 1;
      const decPlaces = Math.max(0, lastPV - 3);
      const scale = Math.pow(10, decPlaces);
      const minComponents = params.minComponents ?? 1;

      // Format a place-value tile: coef × PV[pvIdx]
      const fmtTile = (coef, pvIdx) => {
        const val = coef * PV[pvIdx];
        if (Number.isInteger(val)) return String(val);
        return val.toFixed(pvIdx - 3).replace('.', ',');
      };

      // Generate digits, retrying until enough non-zero components
      let digits;
      do {
        digits = [];
        for (let k = 0; k < pvCount; k++) {
          digits.push(k === 0 || k === pvCount - 1 ? rand(1, 9) : rand(0, 9));
        }
      } while (digits.filter(Boolean).length < minComponents);

      // Collect non-zero place-value components
      const correctTiles = [];
      for (let k = 0; k < pvCount; k++) {
        if (digits[k] > 0) correctTiles.push({ coef: digits[k], pvIdx: firstPV + k });
      }

      // Compute number string using integer arithmetic (avoids float drift)
      let numInt = 0;
      for (const { coef, pvIdx } of correctTiles) {
        numInt += coef * Math.round(PV[pvIdx] * scale);
      }
      const numStr = (numInt / scale).toFixed(decPlaces).replace('.', ',');

      // Build distractor pool: same coef shifted ±1 place, or adjacent coef same place
      const used = new Set(correctTiles.map((c) => fmtTile(c.coef, c.pvIdx)));
      const distractorPool = [];
      for (const { coef, pvIdx } of correctTiles) {
        if (pvIdx > 0) {
          const t = fmtTile(coef, pvIdx - 1);
          if (!used.has(t)) {
            distractorPool.push(t);
            used.add(t);
          }
        }
        if (pvIdx < 6) {
          const t = fmtTile(coef, pvIdx + 1);
          if (!used.has(t)) {
            distractorPool.push(t);
            used.add(t);
          }
        }
        const alt = coef < 9 ? coef + 1 : coef - 1;
        const t = fmtTile(alt, pvIdx);
        if (!used.has(t)) {
          distractorPool.push(t);
          used.add(t);
        }
      }

      const numDist = params.distractors ?? Math.max(3, correctTiles.length);
      const selected = distractorPool.sort(() => Math.random() - 0.5).slice(0, numDist);

      const pool = [
        ...correctTiles.map((c) => ({ t: fmtTile(c.coef, c.pvIdx), ok: true })),
        ...selected.map((t) => ({ t, ok: false })),
      ].sort(() => Math.random() - 0.5);

      return {
        type: 'tile-select',
        title: `Coche les tuiles qui composent ${numStr}`,
        tiles: pool.map((p) => p.t),
        tileAnswers: pool.map((p, i) => (p.ok ? i : -1)).filter((i) => i !== -1),
      };
    },
  },

  // Symbolic value MCQ: which emoji combination equals the target?
  enigmeSymboles: {
    generate(params = {}) {
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

  // Familles de faits — coche les 4 équations qui appartiennent à la famille
  // params: mode ('add'|'mult'|'alterne'), min (1), max (20), maxFactor (9)
  famillesFaits: {
    generate(params = {}) {
      const mode = params.mode ?? 'add';
      const min = params.min ?? 1;
      const max = params.max ?? 20;
      const maxFactor = params.maxFactor ?? 9;
      const isMult = mode === 'mult' || (mode === 'alterne' && Math.random() < 0.5);

      const eq = (left, op, right, res) =>
        `<span class="font-mono">${left} ${op} ${right} = ${res}</span>`;

      let correct, traps, title;

      if (isMult) {
        const a = rand(2, maxFactor);
        const b = rand(2, maxFactor);
        const c = a * b;
        title = `Coche les 4 égalités qui appartiennent à la même famille (${a}, ${b}, ${c}).`;
        correct = [
          eq(a, '×', b, c),
          eq(b, '×', a, c),
          eq(c, '÷', a, b),
          eq(c, '÷', b, a),
        ];
        // Traps: wrong result in one mult and one div
        const d1 = rand(1, 2) * (Math.random() < 0.5 ? 1 : -1);
        const d2 = rand(1, 2) * (Math.random() < 0.5 ? 1 : -1);
        traps = [
          eq(a, '×', b, c + d1),
          eq(c, '÷', b, a + d2),
        ];
      } else {
        const a = rand(min, max - min);
        const b = rand(min, max - a);
        const c = a + b;
        title = `Coche les 4 égalités qui appartiennent à la même famille (${a}, ${b}, ${c}).`;
        correct = [
          eq(a, '+', b, c),
          eq(b, '+', a, c),
          eq(c, '−', a, b),
          eq(c, '−', b, a),
        ];
        // Traps: wrong result in one addition and one subtraction
        const d1 = rand(1, 2) * (Math.random() < 0.5 ? 1 : -1);
        const d2 = rand(1, 2) * (Math.random() < 0.5 ? 1 : -1);
        traps = [
          eq(a, '+', b, c + d1),
          eq(c, '−', a, b + d2),
        ];
      }

      // Shuffle all 6 together, track correct indices
      const all = [...correct, ...traps];
      const shuffled = all.map((v, i) => ({ v, i })).sort(() => Math.random() - 0.5);
      const statements = shuffled.map(x => x.v);
      const checkedAnswers = shuffled
        .map((x, pos) => (x.i < 4 ? pos : -1))
        .filter(p => p !== -1);

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

      const statements = answers.map(isTrue => {
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
        } else { // ÷
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
        const eq = reversed
          ? `${displayed} = ${a} ${SYM[op]} ${b}`
          : `${a} ${SYM[op]} ${b} = ${displayed}`;

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
          if (r === 1) return row.map(() => true);           // full row-1 shown
          if (r === allRows.length - 1) return [true];       // apex shown
          return row.map(() => false);                        // other middle rows hidden
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

  // Clock: read analog clock
  // params: step (minute granularity: 60/30/15/5/1), minHour (1), maxHour (12)
  lireHeure: {
    generate(params = {}) {
      const step = params.step ?? 5;
      const minHour = params.minHour ?? 1;
      const maxHour = params.maxHour ?? 12;
      const hour = rand(minHour, maxHour);
      const totalSteps = Math.floor(60 / step);
      const minuteStep = rand(0, totalSteps - 1);
      const minute = minuteStep * step;
      const hStr = String(hour);
      const mStr = String(minute).padStart(2, '0');
      const hStr2 = String(hour).padStart(2, '0');
      return {
        type: 'clock',
        title: 'Quelle heure est-il ?',
        hour,
        minute,
        answers: [`${hStr}:${mStr}`, `${hStr2}:${mStr}`],
      };
    },
  },

  // Matching: mini clock SVGs (left) ↔ French time labels (right)
  // params: step (5/15/30), pairs (default 4), clockSize (default 72)
  lireHeureMatching: {
    generate(params = {}) {
      const step = params.step ?? 5;
      const pairCount = params.pairs ?? 4;
      const size = params.clockSize ?? 72;

      const toFrench = (h, m) => {
        const h12 = h % 12 || 12;
        const hNext = (h12 % 12) + 1;
        const after = { 5: 'cinq', 10: 'dix', 15: 'et quart', 20: 'vingt', 25: 'vingt-cinq', 30: 'et demie' };
        const before = { 35: 'vingt-cinq', 40: 'vingt', 45: 'le quart', 50: 'dix', 55: 'cinq' };
        if (m === 0) return `${h12}h pile`;
        if (m <= 30) return `${h12}h ${after[m]}`;
        return `${hNext}h moins ${before[m]}`;
      };

      // Build pool of all (h, m) slots and pick pairCount unique ones
      const slotsPerHour = 60 / step;
      const total = 12 * slotsPerHour;
      const indices = shuffle(Array.from({ length: total }, (_, i) => i));
      const chosen = indices.slice(0, pairCount).map(idx => ({
        h: Math.floor(idx / slotsPerHour) + 1,
        m: (idx % slotsPerHour) * step,
      }));

      // Shuffle right side independently
      const labels = chosen.map(({ h, m }) => toFrench(h, m));
      const rightOrder = shuffle(Array.from({ length: pairCount }, (_, i) => i));

      // answers[leftIdx] = rightIdx (position in shuffled right array)
      const answers = chosen.map((_, li) => rightOrder.indexOf(li));

      return {
        type: 'matching',
        pairs: {
          left: chosen.map(({ h, m }) => clockSvg(h, m, size)),
          right: rightOrder.map(ri => labels[ri]),
          answers,
        },
      };
    },
  },

  // MCQ: compare two volumes expressed in different units
  // params: level ('moyen' | 'difficile'), equalProb (0.2)
  // moyen     — pairs among mL/cL/dL/L
  // difficile — adds hL
  comparerVolumes: {
    generate(params = {}) {
      const UNITS = {
        mL: { label: 'millilitre', plural: 'millilitres' },
        cL: { label: 'centilitre', plural: 'centilitres' },
        dL: { label: 'décilitre', plural: 'décilitres' },
        L: { label: 'litre', plural: 'litres' },
        hL: { label: 'hectolitre', plural: 'hectolitres' },
      };
      const PAIR_SETS = {
        moyen: [
          { u1: 'mL', u2: 'cL', factor: 10, v2Range: [1, 20], delta: 5 },
          { u1: 'cL', u2: 'dL', factor: 10, v2Range: [1, 20], delta: 5 },
          { u1: 'dL', u2: 'L', factor: 10, v2Range: [1, 20], delta: 5 },
          { u1: 'mL', u2: 'dL', factor: 100, v2Range: [1, 10], delta: 10 },
          { u1: 'cL', u2: 'L', factor: 100, v2Range: [1, 10], delta: 50 },
        ],
        difficile: [
          { u1: 'mL', u2: 'cL', factor: 10, v2Range: [1, 20], delta: 5 },
          { u1: 'cL', u2: 'dL', factor: 10, v2Range: [1, 20], delta: 5 },
          { u1: 'dL', u2: 'L', factor: 10, v2Range: [1, 20], delta: 5 },
          { u1: 'mL', u2: 'dL', factor: 100, v2Range: [1, 10], delta: 10 },
          { u1: 'cL', u2: 'L', factor: 100, v2Range: [1, 10], delta: 50 },
          { u1: 'mL', u2: 'L', factor: 1000, v2Range: [1, 5], delta: 100 },
          { u1: 'L', u2: 'hL', factor: 100, v2Range: [1, 10], delta: 50 },
          { u1: 'dL', u2: 'hL', factor: 1000, v2Range: [1, 3], delta: 100 },
        ],
      };

      const level = params.level ?? 'moyen';
      const pairs = PAIR_SETS[level] || PAIR_SETS.moyen;
      const pair = pairs[rand(0, pairs.length - 1)];
      const { u1, u2, factor, v2Range, delta } = pair;

      const v2 = rand(v2Range[0], v2Range[1]);
      const v1eq = v2 * factor;

      const isEqual = Math.random() < (params.equalProb ?? 0.2);
      let v1, answerIdx;
      if (isEqual) {
        v1 = v1eq;
        answerIdx = 2;
      } else if (Math.random() < 0.5) {
        v1 = v1eq + delta;
        answerIdx = 0;
      } else {
        v1 = v1eq - delta;
        if (v1 > 0) {
          answerIdx = 1;
        } else {
          v1 = v1eq + delta;
          answerIdx = 0;
        }
      }

      const fmt = (n, u) => `${n}\u202f${n === 1 ? UNITS[u].label : UNITS[u].plural}`;
      const A = fmt(v1, u1);
      const B = fmt(v2, u2);

      return {
        type: 'mcq',
        title: `Lequel est le plus grand, ${A} ou ${B}\u00a0?`,
        mcqChoices: [A, B, 'aucun\u00a0: les deux sont égaux'],
        mcqAnswer: answerIdx,
      };
    },
  },

  // MCQ: compare two lengths expressed in different units
  // params: level ('moyen' | 'difficile'), equalProb (0.2)
  // moyen  — pairs among cm/dm/m/km
  // difficile — adds mm, hm; more combinations
  comparerLongueurs: {
    generate(params = {}) {
      const UNITS = {
        mm: { label: 'millimètre', plural: 'millimètres' },
        cm: { label: 'centimètre', plural: 'centimètres' },
        dm: { label: 'décimètre', plural: 'décimètres' },
        m: { label: 'mètre', plural: 'mètres' },
        hm: { label: 'hectomètre', plural: 'hectomètres' },
        km: { label: 'kilomètre', plural: 'kilomètres' },
      };
      // Each pair: u1 is the "smaller" unit, u2 the "larger"; factor = how many u1 in 1 u2
      const PAIR_SETS = {
        moyen: [
          { u1: 'cm', u2: 'dm', factor: 10, v2Range: [1, 20], delta: 5 },
          { u1: 'dm', u2: 'm', factor: 10, v2Range: [1, 20], delta: 5 },
          { u1: 'cm', u2: 'm', factor: 100, v2Range: [1, 10], delta: 50 },
          { u1: 'm', u2: 'km', factor: 1000, v2Range: [1, 10], delta: 100 },
        ],
        difficile: [
          { u1: 'mm', u2: 'cm', factor: 10, v2Range: [1, 20], delta: 5 },
          { u1: 'mm', u2: 'dm', factor: 100, v2Range: [1, 10], delta: 10 },
          { u1: 'mm', u2: 'm', factor: 1000, v2Range: [1, 3], delta: 100 },
          { u1: 'cm', u2: 'dm', factor: 10, v2Range: [1, 20], delta: 5 },
          { u1: 'dm', u2: 'm', factor: 10, v2Range: [1, 20], delta: 5 },
          { u1: 'cm', u2: 'm', factor: 100, v2Range: [1, 10], delta: 50 },
          { u1: 'm', u2: 'hm', factor: 100, v2Range: [1, 10], delta: 50 },
          { u1: 'hm', u2: 'km', factor: 10, v2Range: [1, 10], delta: 5 },
          { u1: 'm', u2: 'km', factor: 1000, v2Range: [1, 10], delta: 100 },
        ],
      };

      const level = params.level ?? 'moyen';
      const pairs = PAIR_SETS[level] || PAIR_SETS.moyen;
      const pair = pairs[rand(0, pairs.length - 1)];
      const { u1, u2, factor, v2Range, delta } = pair;

      const v2 = rand(v2Range[0], v2Range[1]);
      const v1eq = v2 * factor; // value in u1 that equals v2 in u2

      const isEqual = Math.random() < (params.equalProb ?? 0.2);
      let v1, answerIdx;
      if (isEqual) {
        v1 = v1eq;
        answerIdx = 2;
      } else if (Math.random() < 0.5) {
        v1 = v1eq + delta; // u1 side is bigger
        answerIdx = 0;
      } else {
        v1 = v1eq - delta;
        if (v1 > 0) {
          answerIdx = 1; // u2 side is bigger
        } else {
          v1 = v1eq + delta; // fallback: u1 side
          answerIdx = 0;
        }
      }

      const fmt = (n, u) => `${n}\u202f${n === 1 ? UNITS[u].label : UNITS[u].plural}`;
      const A = fmt(v1, u1);
      const B = fmt(v2, u2);

      return {
        type: 'mcq',
        title: `Lequel est le plus grand, ${A} ou ${B}\u00a0?`,
        mcqChoices: [A, B, 'aucun\u00a0: les deux sont égaux'],
        mcqAnswer: answerIdx,
      };
    },
  },

  // Sort: order fractions
  // params: count (4), direction ('asc'), sameDenominator (true), denominator (random 4-12)
  // sameDenominator=false draws from a pool of common fractions (halves, thirds, quarters…)
  // Checkbox: identify multiples of a given divisor from a mixed set
  // params: divisor (specific number), divisors (array to pick from randomly),
  //         count (6), min (divisor), max (99)
  multiplesOf: {
    generate(params = {}) {
      const count = params.count ?? 6;
      const pool = params.divisors || (params.divisor ? [params.divisor] : [2, 3, 5, 10]);
      const divisor = randItem(pool);
      const min = params.min ?? Math.max(1, divisor);
      const max = params.max ?? 99;

      // Build separate pools so we can guarantee ≥2 correct and ≥2 wrong
      const multiples = [];
      const nonMultiples = [];
      for (let n = min; n <= max; n++) {
        if (n % divisor === 0) multiples.push(n);
        else nonMultiples.push(n);
      }

      const nCorrect = rand(2, Math.min(count - 2, multiples.length));
      const picked = [
        ...multiples.sort(() => Math.random() - 0.5).slice(0, nCorrect),
        ...nonMultiples.sort(() => Math.random() - 0.5).slice(0, count - nCorrect),
      ].sort(() => Math.random() - 0.5);

      const title = `Coche les multiples de ${divisor}.`;
      const statements = picked.map(String);
      const checkedAnswers = picked.map((n, i) => (n % divisor === 0 ? i : -1)).filter((i) => i !== -1);

      return { type: 'checkbox', title, statements, checkedAnswers };
    },
  },

  // Checkbox: identify even or odd numbers from a mixed set
  // params: count (6), min (2), max (99), mode ('pairs'|'impairs'|'alterne')
  // mode='alterne' randomly picks pairs or impairs each time
  nombresPairsImpairs: {
    generate(params = {}) {
      const count = params.count ?? 6;
      const min = params.min ?? 2;
      const max = params.max ?? 99;
      const mode = params.mode ?? 'alterne';
      const askPairs = mode === 'pairs' ? true : mode === 'impairs' ? false : Math.random() < 0.5;

      // generate `count` distinct numbers with at least 2 correct and 2 wrong
      let numbers;
      let attempts = 0;
      do {
        const seen = new Set();
        while (seen.size < count) seen.add(rand(min, max));
        numbers = [...seen];
        const corrects = numbers.filter((n) => (askPairs ? n % 2 === 0 : n % 2 !== 0));
        attempts++;
        if (corrects.length >= 2 && corrects.length <= count - 2) break;
      } while (attempts < 50);

      const title = askPairs ? 'Coche les nombres pairs.' : 'Coche les nombres impairs.';
      const statements = numbers.map(String);
      const checkedAnswers = numbers
        .map((n, i) => ((askPairs ? n % 2 === 0 : n % 2 !== 0) ? i : -1))
        .filter((i) => i !== -1);

      return { type: 'checkbox', title, statements, checkedAnswers };
    },
  },

  trierFractions: {
    generate(params = {}) {
      const count = params.count ?? 4;
      const direction = params.direction ?? 'asc';
      const sameDen = params.sameDenominator ?? true;

      let fracs;
      if (sameDen) {
        const denChoices = params.denominator ? [params.denominator] : [4, 6, 8, 10, 12].filter(d => d - 1 >= count);
        const den = denChoices[rand(0, denChoices.length - 1)];
        const nums = new Set();
        while (nums.size < count) nums.add(rand(1, den - 1));
        fracs = [...nums].map((n) => ({ n, d: den, v: n / den }));
      } else {
        const pool = [
          { n: 1, d: 2 },
          { n: 1, d: 3 },
          { n: 2, d: 3 },
          { n: 1, d: 4 },
          { n: 3, d: 4 },
          { n: 1, d: 6 },
          { n: 5, d: 6 },
          { n: 1, d: 8 },
          { n: 3, d: 8 },
          { n: 5, d: 8 },
          { n: 7, d: 8 },
          { n: 1, d: 10 },
          { n: 3, d: 10 },
          { n: 7, d: 10 },
          { n: 9, d: 10 },
        ].map((f) => ({ ...f, v: f.n / f.d }));
        fracs = pool
          .slice()
          .sort(() => Math.random() - 0.5)
          .slice(0, count);
      }

      fracs.sort((a, b) => (direction === 'asc' ? a.v - b.v : b.v - a.v));
      const items = fracs.map((f) => `${f.n}/${f.d}`);
      const title = direction === 'asc' ? 'Ordre croissant' : 'Ordre décroissant';
      return { type: 'sort', title, items, direction };
    },
  },

  // mcq: identify the place-value position of a highlighted digit
  // params: positions (array of {label,value,color?}), count (3) — number of positions used per question
  positionChiffre: {
    generate(params = {}) {
      const ALL = [
        { label: 'milliers', value: 1000 },
        { label: 'centaines', value: 100 },
        { label: 'dizaines', value: 10 },
        { label: 'unités', value: 1 },
        { label: 'dixièmes', value: 0.1 },
        { label: 'centièmes', value: 0.01 },
        { label: 'millièmes', value: 0.001 },
      ];
      const pool = (params.positions || ALL)
        .map((p) => (typeof p === 'string' ? ALL.find((a) => a.label === p) : p))
        .filter(Boolean);
      const count = Math.min(params.count || 3, pool.length);

      // Shuffle pool and pick `count` positions, then sort by descending value
      const chosen = [...pool]
        .sort(() => Math.random() - 0.5)
        .slice(0, count)
        .sort((a, b) => b.value - a.value);

      // Assign non-zero random digits at each chosen position
      let number = 0;
      const digits = {};
      chosen.forEach((p) => {
        const d = rand(1, 9);
        digits[p.value] = d;
        number = Math.round((number + d * p.value) * 1e6) / 1e6;
      });

      // Format number in French notation
      const maxDec = chosen.some((p) => p.value < 1)
        ? chosen.filter((p) => p.value < 1).length + (chosen.some((p) => p.value === 0.001) ? 0 : 0)
        : 0;
      const decPlaces = chosen.reduce((m, p) => {
        if (p.value === 0.1) return Math.max(m, 1);
        if (p.value === 0.01) return Math.max(m, 2);
        if (p.value === 0.001) return Math.max(m, 3);
        return m;
      }, 0);
      const formatted = number.toLocaleString('fr-FR', {
        minimumFractionDigits: decPlaces,
        maximumFractionDigits: decPlaces,
      });

      // Pick target position (what we ask about)
      const target = chosen[Math.floor(Math.random() * chosen.length)];
      const targetDigit = digits[target.value];

      // Options = all chosen positions, shuffled
      const options = [...chosen].sort(() => Math.random() - 0.5).map((p) => p.label);
      const answerIdx = options.indexOf(target.label);

      return {
        type: 'mcq',
        title: `Dans <strong>${formatted}</strong>, en quelle position se trouve le <strong>${targetDigit}</strong>\u00a0?`,
        mcqOptions: options,
        mcqAnswer: answerIdx,
        answers: [target.label],
      };
    },
  },

  // click-blocks: fill place-value columns to represent a number
  // params: min (1), max (999), places (['100','10','1'])
  blocsValeurPosition: {
    generate(params = {}) {
      const min = params.min ?? 1;
      const max = params.max ?? 999;
      const n = rand(min, max);
      const places = params.places || [
        { label: '100', value: 100, color: '#dc2626' },
        { label: '10', value: 10, color: '#7c3aed' },
        { label: '1', value: 1, color: '#2563eb' },
      ];
      const columns = places.map((p) => ({
        label: p.label,
        value: p.value,
        color: p.color,
        answer: Math.floor(n / p.value) % 10,
        max: 9,
      }));
      return {
        type: 'click-blocks',
        title: `Colorie les blocs pour représenter le nombre <strong>${n}</strong>.`,
        columns,
      };
    },
  },

  comptageFruits: {
    generate(params = {}) {
      const pool = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍑', '🍒', '🫐', '🍌', '🍉'];
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
        return { type: 'number-check', operation: `${icons(count)} + ? = ${count + missing}`, answers: [String(missing)] };
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
      const pool = ['🐞', '🐜', '🕷️', '🦗', '🦋', '🐝', '🪲', '🐛'];
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

  // drag-sort: pick N distinct numbers from a range, sort them
  // params: from (1), to (5), count (3), direction ('asc'|'desc'|'random')
  trierNombres: {
    generate(params = {}) {
      const from = params.from ?? 1;
      const to = params.to ?? 5;
      const count = params.count ?? 3;
      const dir = params.direction ?? 'random';
      const direction = dir === 'random' ? (Math.random() < 0.5 ? 'asc' : 'desc') : dir;

      const pool = Array.from({ length: to - from + 1 }, (_, i) => from + i);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const tiles = pool.slice(0, count).map(String);
      const label = direction === 'asc' ? 'plus petit au plus grand' : 'plus grand au plus petit';

      return {
        type: 'drag-sort',
        title: `Range ces nombres du ${label}.`,
        direction,
        tiles,
      };
    },
  },

  // compare-groups: scattered emoji SVG, click Autant/Plus/Moins
  // params: min (2), max (5) — count range for each group
  comparerGroupes: {
    generate(params = {}) {
      const PAIRS = [
        ['🐭', '🧀'], ['🐸', '🪲'], ['🐔', '🌽'],
        ['🐝', '🌸'], ['🐰', '🥕'], ['🐶', '🦴'],
        ['🦜', '🫐'], ['🐟', '🦐'], ['🐱', '🐟'],
        ['🐛', '🍃'], ['🦔', '🍄'], ['🐞', '🌼'],
      ];
      const min = params.min ?? 2;
      const max = params.max ?? 5;

      const pair = PAIRS[Math.floor(Math.random() * PAIRS.length)];
      const [eA, eB] = pair;

      const countA = rand(min, max);
      // Equal ~25 %, A > B ~37.5 %, A < B ~37.5 %
      const r = Math.random();
      let countB;
      if (r < 0.25) {
        countB = countA;
      } else if (r < 0.625) {
        countB = rand(Math.max(min, countA - 2), Math.max(min, countA - 1));
      } else {
        countB = rand(Math.min(max, countA + 1), Math.min(max, countA + 2));
      }

      // Scatter positions with collision avoidance
      const W = 300, H = 160, ITEM = 28, GAP = ITEM * 1.4;
      const total = countA + countB;
      const placed = [];
      for (let i = 0; i < total; i++) {
        let found = false;
        for (let t = 0; t < 300; t++) {
          const x = ITEM / 2 + 4 + Math.random() * (W - ITEM - 8);
          const y = ITEM / 2 + 4 + Math.random() * (H - ITEM - 8);
          if (placed.every((p) => Math.hypot(p.x - x, p.y - y) >= GAP)) {
            placed.push({ x, y });
            found = true;
            break;
          }
        }
        if (!found) {
          // Fallback grid row
          placed.push({ x: 24 + (i % 7) * 42, y: 24 + Math.floor(i / 7) * 56 });
        }
      }

      const texts = [
        ...placed.slice(0, countA).map(
          ({ x, y }) =>
            `<text x="${Math.round(x)}" y="${Math.round(y)}" text-anchor="middle" dominant-baseline="central" font-size="26">${eA}</text>`
        ),
        ...placed.slice(countA).map(
          ({ x, y }) =>
            `<text x="${Math.round(x)}" y="${Math.round(y)}" text-anchor="middle" dominant-baseline="central" font-size="26">${eB}</text>`
        ),
      ].join('');

      const svgHtml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${texts}</svg>`;

      const answer = countA === countB ? 0 : countA > countB ? 1 : 2;

      return {
        type: 'compare-groups',
        title: `Il y a <strong>___ de ${eA}</strong> que de ${eB}.`,
        svgHtml,
        cmpGroupAnswer: answer,
      };
    },
  },

  // compterObjets: count scattered emoji, type the number
  // params: min (2), max (12)
  compterObjets: {
    generate(params = {}) {
      const SETS = [
        { emoji: '🐭', label: 'souris' },
        { emoji: '🧀', label: 'fromages' },
        { emoji: '🐸', label: 'grenouilles' },
        { emoji: '🍎', label: 'pommes' },
        { emoji: '🐝', label: 'abeilles' },
        { emoji: '🌸', label: 'fleurs' },
        { emoji: '🐠', label: 'poissons' },
        { emoji: '🦋', label: 'papillons' },
        { emoji: '🍄', label: 'champignons' },
        { emoji: '⭐', label: 'étoiles' },
        { emoji: '🐞', label: 'coccinelles' },
        { emoji: '🥕', label: 'carottes' },
        { emoji: '🐢', label: 'tortues' },
        { emoji: '🍓', label: 'fraises' },
        { emoji: '🐌', label: 'escargots' },
        { emoji: '🌻', label: 'tournesols' },
      ];
      const min = params.min ?? 2;
      const max = params.max ?? 12;
      const set = SETS[Math.floor(Math.random() * SETS.length)];
      const count = Math.floor(Math.random() * (max - min + 1)) + min;

      // Scatter with collision avoidance
      const W = 280, H = 200, ITEM = 30, GAP = ITEM * 1.5;
      const placed = [];
      for (let i = 0; i < count; i++) {
        let found = false;
        for (let t = 0; t < 400; t++) {
          const x = ITEM / 2 + 6 + Math.random() * (W - ITEM - 12);
          const y = ITEM / 2 + 6 + Math.random() * (H - ITEM - 12);
          if (placed.every((p) => Math.hypot(p.x - x, p.y - y) >= GAP)) {
            placed.push({ x, y });
            found = true;
            break;
          }
        }
        if (!found) {
          placed.push({ x: 30 + (i % 6) * 44, y: 30 + Math.floor(i / 6) * 50 });
        }
      }

      const texts = placed
        .map(
          ({ x, y }) =>
            `<text x="${Math.round(x)}" y="${Math.round(y)}" text-anchor="middle" dominant-baseline="central" font-size="28">${set.emoji}</text>`
        )
        .join('');

      const svgHtml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${texts}</svg>`;

      return {
        type: 'count-objects',
        title: `Combien y a-t-il de <strong>${set.label}</strong> ?`,
        svgHtml,
        answers: [String(count)],
      };
    },
  },

  // fractionDuNombre: calcul de moitié / tiers / quart d'un nombre
  // params: denominators ([2,4]), min (4), max (20)
  fractionDuNombre: {
    generate(params = {}) {
      const NAMES = { 2: 'moitié', 3: 'tiers', 4: 'quart' };
      const denominators = params.denominators ?? [2, 4];
      const d = denominators[Math.floor(Math.random() * denominators.length)];
      const minVal = params.min ?? d * 2;
      const maxVal = params.max ?? d * 10;
      const first = Math.ceil(minVal / d) * d;
      const last = Math.floor(maxVal / d) * d;
      const n = first + Math.floor(Math.random() * ((last - first) / d + 1)) * d;
      return {
        type: 'number-check',
        operation: `${NAMES[d] || `1/${d}`} de ${n} = ?`,
        answers: [String(n / d)],
      };
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

      // Randomly decide if the pair comes first or the extra addend is interspersed
      // Patterns: A + B + C, A + C + B, C + A + B
      const patterns = [
        `&box(${a} + ${b}) + ${c}`,
        `${a} + ${c} + ${b}`,  // pair split — box still wraps the two parts
        `${c} + &box(${a} + ${b})`,
      ];
      // For the split pattern, we box A and B individually
      const splitPattern = `${a} + ${c} + ${b}`;
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

  // complementA10Emoji: show N scattered emoji, ask how many more to reach 10
  // params: min (1), max (9)
  complementA10Emoji: {
    generate(params = {}) {
      const SETS = [
        { emoji: '🐭', label: 'souris' },
        { emoji: '🧀', label: 'fromages' },
        { emoji: '🍎', label: 'pommes' },
        { emoji: '🐝', label: 'abeilles' },
        { emoji: '🌸', label: 'fleurs' },
        { emoji: '🐠', label: 'poissons' },
        { emoji: '🦋', label: 'papillons' },
        { emoji: '🍓', label: 'fraises' },
        { emoji: '🐞', label: 'coccinelles' },
        { emoji: '⭐', label: 'étoiles' },
        { emoji: '🐢', label: 'tortues' },
        { emoji: '🌻', label: 'tournesols' },
      ];
      const min = params.min ?? 1;
      const max = params.max ?? 9;
      const set = SETS[Math.floor(Math.random() * SETS.length)];
      const count = Math.floor(Math.random() * (max - min + 1)) + min;
      const complement = 10 - count;

      const W = 280, H = 180, ITEM = 30, GAP = ITEM * 1.5;
      const placed = [];
      for (let i = 0; i < count; i++) {
        let found = false;
        for (let t = 0; t < 400; t++) {
          const x = ITEM / 2 + 6 + Math.random() * (W - ITEM - 12);
          const y = ITEM / 2 + 6 + Math.random() * (H - ITEM - 12);
          if (placed.every((p) => Math.hypot(p.x - x, p.y - y) >= GAP)) {
            placed.push({ x, y });
            found = true;
            break;
          }
        }
        if (!found) {
          placed.push({ x: 30 + (i % 6) * 44, y: 30 + Math.floor(i / 6) * 50 });
        }
      }

      const texts = placed
        .map(
          ({ x, y }) =>
            `<text x="${Math.round(x)}" y="${Math.round(y)}" text-anchor="middle" dominant-baseline="central" font-size="28">${set.emoji}</text>`
        )
        .join('');

      const svgHtml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${texts}</svg>`;

      return {
        type: 'count-objects',
        title: `Combien faut-il ajouter de <strong>${set.label}</strong> pour en avoir <strong>10</strong> ?`,
        svgHtml,
        answers: [String(complement)],
      };
    },
  },

  // complementA10Nombre: fill-in-the-blank "N + ? = 10" or "? + N = 10"
  // params: min (1), max (9)
  complementA10Nombre: {
    generate(params = {}) {
      const min = params.min ?? 1;
      const max = params.max ?? 9;
      const n = Math.floor(Math.random() * (max - min + 1)) + min;
      const complement = 10 - n;
      // Randomly put the blank first or second
      const blankFirst = Math.random() < 0.5;
      const operation = blankFirst ? `? + ${n} = 10` : `${n} + ? = 10`;
      return {
        type: 'number-check',
        title: 'Complète.',
        operation,
        answers: [String(complement)],
      };
    },
  },

  // number-hunt: click numbers 1..count in order, emoji sits in center cell
  // params: count (20), cols (5), emoji (random animal)
  huntNombres: {
    generate(params = {}) {
      const ANIMALS = ['🦕', '🦖', '🐸', '🐯', '🦊', '🐻', '🐼', '🐨', '🐷', '🦁', '🦉', '🐧', '🦋', '🐬'];
      const count = params.count ?? 20;
      const cols = params.cols ?? 5;
      const emoji = params.emoji ?? ANIMALS[Math.floor(Math.random() * ANIMALS.length)];

      // Fit count numbers + 1 image cell
      const rows = Math.ceil((count + 1) / cols);
      const total = rows * cols;

      // Center image cell
      const imgIdx = Math.floor((rows - 1) / 2) * cols + Math.floor((cols - 1) / 2);

      // Shuffle available positions (all except image)
      const available = Array.from({ length: total }, (_, i) => i).filter((i) => i !== imgIdx);
      for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
      }

      // grid[i]: number 1..count | -1 (image) | 0 (empty padding)
      const grid = Array(total).fill(0);
      grid[imgIdx] = -1;
      for (let n = 1; n <= count; n++) grid[available[n - 1]] = n;

      return {
        type: 'number-hunt',
        title: `Clique les nombres de <strong>1</strong> à <strong>${count}</strong> dans l'ordre !`,
        grid,
        cols,
        rows,
        count,
        emoji,
      };
    },
  },

  // tile-select: click the largest or smallest number from N tiles
  // params: count (2|3), min, max, goal ('max'|'min'|random)
  comparerNombres: {
    generate(params = {}) {
      const count = params.count ?? 2;
      const min = params.min ?? 100;
      const max = params.max ?? 999;
      const goal = params.goal ?? (Math.random() < 0.5 ? 'max' : 'min');

      // Generate `count` distinct numbers
      const numbers = [];
      while (numbers.length < count) {
        const n = rand(min, max);
        if (!numbers.includes(n)) numbers.push(n);
      }

      const target = goal === 'max' ? Math.max(...numbers) : Math.min(...numbers);
      const tileAnswers = numbers.reduce((acc, n, i) => {
        if (n === target) acc.push(i);
        return acc;
      }, []);
      const adj = goal === 'max' ? 'grand' : 'petit';

      return {
        type: 'tile-select',
        title: `Clique sur le <strong>plus ${adj}</strong> nombre.`,
        tiles: numbers.map(String),
        tileAnswers,
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

  // comparaisonNombres: compare numbers written in standard and/or CDU (centaines-dizaines-unités) form
  // params: min (100), max (999), pairs (5), style ('standard'|'cdu'|'mixed')
  comparaisonNombres: {
    generate(params = {}) {
      const min = params.min ?? 100;
      const max = params.max ?? 999;
      const pairs = params.pairs ?? 5;
      const style = params.style ?? 'mixed';

      // Convert integer to CDU notation, always showing all positions for the range
      const toCDU = (n) => {
        const c = Math.floor(n / 100);
        const d = Math.floor((n % 100) / 10);
        const u = n % 10;
        if (max >= 100) return `${c}c${d}d${u}u`;
        if (max >= 10) return `${d}d${u}u`;
        return `${u}u`;
      };

      const rand = () => min + Math.floor(Math.random() * (max - min + 1));

      // Generate a tricky pair: same number of digits, close in value
      const makePair = () => {
        const a = rand();
        let b;
        const roll = Math.random();
        if (roll < 0.25) {
          b = a; // equal
        } else if (roll < 0.6) {
          // Same hundreds, differ only in tens/units
          const base = Math.floor(a / 100) * 100;
          b = base + Math.floor(Math.random() * 100);
          b = Math.max(min, Math.min(max, b));
        } else {
          b = rand();
        }
        return [a, b];
      };

      const fmt = (n, forceCDU) => forceCDU ? toCDU(n) : String(n);

      const comparisons = Array.from({ length: pairs }, () => {
        let [a, b] = makePair();
        let left, right;

        if (style === 'standard') {
          left = fmt(a, false); right = fmt(b, false);
        } else if (style === 'cdu') {
          // CDU vs CDU: identical pairs are trivial, so force b ≠ a
          if (a === b) b = a === max ? a - 1 : a + 1;
          left = fmt(a, true); right = fmt(b, true);
        } else {
          // mixed: equal pairs are the key learning moment (standard = CDU)
          // unequal pairs: randomly mix standard/CDU on each side
          if (a === b) {
            left = fmt(a, false); right = fmt(b, true); // always standard = CDU
          } else {
            const r = Math.random();
            left = fmt(a, r < 0.4);
            right = fmt(b, r >= 0.4 && r < 0.8);
          }
        }

        const answer = a > b ? '>' : a < b ? '<' : '=';
        return { left, right, answer };
      });

      return {
        type: 'compare',
        title: 'Compare les nombres.',
        comparisons,
      };
    },
  },

  // chiffrePlaceValeur: show a number, ask for the digit at a given place
  // params: maxNum (999), places (array of 0-based position indices, 0=unités)
  chiffrePlaceValeur: {
    generate(params = {}) {
      const NAMES = ['unités', 'dizaines', 'centaines', 'milliers',
        'dizaines de milliers', 'centaines de milliers'];
      const places = params.places ?? [0, 1, 2];
      const maxNum = params.maxNum ?? 999;

      // Pick a random place to test
      const pos = places[Math.floor(Math.random() * places.length)];

      // Ensure the number has enough digits for this place (≥ 10^pos)
      const minNum = Math.pow(10, pos);
      const number = minNum + Math.floor(Math.random() * (maxNum - minNum + 1));

      const digit = Math.floor(number / Math.pow(10, pos)) % 10;

      // French-style thousands separator (narrow no-break space)
      const formatted = number.toLocaleString('fr-FR');

      return {
        type: 'number-check',
        title: `Dans <strong>${formatted}</strong>, quel est le chiffre des <strong>${NAMES[pos]}</strong>&nbsp;?`,
        operation: '?',
        answers: [String(digit)],
        svg: { gen: 'placeValueSvg', par: { number, pos } },
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
      const d = rand(0, maxDec);               // decimal places in input

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
      const fmtFr = n => n.toLocaleString('fr-FR');

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
      const fmtFr = n => n.toLocaleString('fr-FR');

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
        dividendStr = decPart
          ? `${fmtFr(parseInt(intPart, 10))},${decPart}`
          : fmtFr(parseInt(intPart, 10));
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
      const fmtFr = n => n.toLocaleString('fr-FR');

      const inputStr = d === 0 ? String(whole) : `${whole},${decStr}`;

      let resultStr;
      if (shift >= 0) {
        resultStr = fmtFr(mantissa * Math.pow(10, shift));
      } else {
        const abs = -shift;
        const s = String(mantissa).padStart(abs + 1, '0');
        const intPart = s.slice(0, -abs);
        const decPart = s.slice(-abs).replace(/0+$/, '');
        resultStr = decPart
          ? `${fmtFr(parseInt(intPart, 10))},${decPart}`
          : fmtFr(parseInt(intPart, 10));
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
        operation = asMult
          ? `${inputStr} × ? = ${resultStr}`
          : `${resultStr} \u00f7 ? = ${inputStr}`;
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
      do { num = rand(numMin, numMax); } while (den > 1 && num % den === 0);

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
        const frac = Math.round(dec / den * 100) / 100;
        const combined = intPart + frac;
        return String(Math.round(combined * 100) / 100).replace('.', ',');
      };
      const ys = xs.map(computeY);

      // Anchor NOT at x=1 (position 0) by default — forces ratio calculation
      const anchorIdx = params.anchorAtStart ? rand(0, 2) : rand(1, 2);

      let blankIdx = 0;
      const yRow = ys.map((y, i) =>
        i === anchorIdx ? { value: y } : { blank: true, idx: blankIdx++, answer: y }
      );

      return {
        type: 'fill-table',
        table: {
          headerCol: true,
          inputClass: 'w-16',
          blankCount: 2,
          rows: [
            [{ value: ctx.row1 }, ...xs.map(x => ({ value: String(x) }))],
            [{ value: ctx.row2 }, ...yRow],
          ],
        },
      };
    },
  },

  // unitesMesure: pick a random object, show its measurement, ask for the unit
  // params: units — array subset of ['mm','cm','m','km'] shown as tile choices
  unitesMesure: {
    generate(params = {}) {
      const units = params.units ?? ['cm', 'm'];

      const pool = {
        mm: [
          { emoji: '🐜', value: 5, label: "La fourmi mesure" },
          { emoji: '🐞', value: 8, label: "La coccinelle mesure" },
          { emoji: '🐝', value: 15, label: "L'abeille mesure" },
          { emoji: '🪲', value: 18, label: "Le scarabée mesure" },
          { emoji: '🪙', value: 24, label: "La pièce de monnaie mesure" },
          { emoji: '🦟', value: 6, label: "Le moustique mesure" },
        ],
        cm: [
          { emoji: '✏️', value: 19, label: "Le crayon mesure" },
          { emoji: '🥕', value: 20, label: "La carotte mesure" },
          { emoji: '🐟', value: 8, label: "Le petit poisson mesure" },
          { emoji: '🦷', value: 3, label: "La dent mesure" },
          { emoji: '📱', value: 15, label: "Le téléphone mesure" },
          { emoji: '🍌', value: 20, label: "La banane mesure" },
          { emoji: '🥾', value: 25, label: "La chaussure mesure" },
          { emoji: '🖊️', value: 15, label: "Le stylo mesure" },
          { emoji: '🥄', value: 18, label: "La cuillère mesure" },
          { emoji: '🍎', value: 8, label: "La pomme mesure" },
        ],
        m: [
          { emoji: '🚗', value: 4, label: "La voiture mesure" },
          { emoji: '🚪', value: 2, label: "La porte mesure" },
          { emoji: '🛏️', value: 2, label: "Le lit mesure" },
          { emoji: '🐘', value: 3, label: "L'éléphant mesure" },
          { emoji: '🦒', value: 6, label: "La girafe mesure" },
          { emoji: '🌲', value: 10, label: "Le sapin mesure" },
          { emoji: '🚌', value: 12, label: "Le bus mesure" },
          { emoji: '🏊', value: 25, label: "La piscine mesure" },
        ],
        km: [
          { emoji: '🏔️', value: 5, label: "La montagne mesure" },
          { emoji: '🌋', value: 3, label: "Le volcan mesure" },
          { emoji: '✈️', value: 900, label: "Le trajet Paris-Marseille mesure" },
          { emoji: '🚂', value: 500, label: "Le trajet en train mesure" },
        ],
      };

      const candidates = units.flatMap((u) => (pool[u] || []).map((o) => ({ ...o, unit: u })));
      const obj = candidates[Math.floor(Math.random() * candidates.length)];

      // Only show the units that are in play
      const tiles = ['mm', 'cm', 'm', 'km'].filter((u) => units.includes(u));
      return {
        type: 'tile-select',
        title: `${obj.label} <strong>${obj.value}</strong> ___ .`,
        svg: { gen: 'objectMeasureSvg', par: { emoji: obj.emoji } },
        tiles,
        tileAnswers: [tiles.indexOf(obj.unit)],
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

  // suiteNombres: number sequence row — one anchor cell visible, rest are blanks
  // params: step (5), anchorMin (10), anchorMax (50), cells (7), anchorPos ('random'|0-based index)
  suiteNombres: {
    generate(params = {}) {
      const step = params.step ?? 5;
      const cells = params.cells ?? 7;
      const amin = params.anchorMin ?? 10;
      const amax = params.anchorMax ?? 50;
      // Anchor must be a multiple of step within [amin, amax]
      const lo = Math.ceil(amin / step);
      const hi = Math.floor(amax / step);
      const anchor = (lo + Math.floor(Math.random() * (hi - lo + 1))) * step;
      // Anchor position: between index 1 and cells-2 (not first, not last)
      // Cap so the sequence never starts below 0 (anchor - anchorPos*step >= 0)
      const maxSafePos = Math.min(cells - 2, Math.floor(anchor / step));
      const anchorPos = params.anchorPos === undefined
        ? 1 + Math.floor(Math.random() * maxSafePos)
        : Math.min(params.anchorPos, maxSafePos);

      // Build full sequence centred on anchor
      const sequence = Array.from({ length: cells }, (_, i) => anchor + (i - anchorPos) * step);

      let blankIdx = 0;
      const stepLabel = step > 0 ? `+${step}` : String(step);
      const row = [
        { value: stepLabel },
        ...sequence.map((val, i) =>
          i === anchorPos
            ? { value: String(val) }
            : { blank: true, idx: blankIdx++, answer: String(val) }
        ),
      ];

      return {
        type: 'fill-table',
        title: 'Complète la suite.',
        table: {
          headerCol: true,
          inputClass: 'w-14',
          blankCount: cells - 1,
          rows: [row],
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
          title: "Cherche la paire qui fait 10, puis calcule.",
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
          title: "Groupe pour faire 10, puis calcule.",
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
        title: "Groupe pour faire 10, puis calcule.",
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
      const {
        pattern = ["0"],
        palette = ["#3b82f6"],
        rule = "identity",
        min = 1,
        max = 20,
        labels = []
      } = params;

      // Precompute candidate numbers per color index
      const numColors = palette.length;
      // 'direct' rule: cell shows 1, 2, 3… matching palette index 0, 1, 2…
      // Candidates are fixed; min/max from YAML are ignored.
      if (rule === 'direct') {
        const rows = pattern.map(row => [...row].map(Number));
        const cols = rows[0].length;
        const cells = rows.flat().map(colorIdx => ({
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
      const rows = pattern.map(row => [...row].map(Number));
      const cols = rows[0].length;
      const cells = rows.flat().map(colorIdx => ({
        colorIdx,
        value: randItem(candidates[colorIdx].length ? candidates[colorIdx] : [min]),
      }));

      return {
        type: 'magic-color',
        magicColor: { cells, cols, palette, labels },
      };
    },
  },

  decimalTriple: {
    generate(params = {}) {
      const dp = params.decPlaces ?? rand(1, params.maxDec ?? 3);
      const scale = Math.pow(10, dp);
      const minInt = params.minInt ?? 0;
      const maxInt = params.maxInt ?? 9;
      const intPart = rand(minInt, maxInt);

      // Ensure last decimal digit is non-zero (no trailing zeros in decimal part)
      let decDigits;
      do { decDigits = rand(1, scale - 1); } while (decDigits % 10 === 0);

      const decStr = String(decDigits).padStart(dp, '0');
      const dtDecimal = `${intPart},${decStr}`;
      const dtFrac = { num: intPart * scale + decDigits, den: scale };

      // [dizaines, unites, dixiemes, centiemes, milliemes] — null = column not shown
      const dtPlaces = [
        intPart >= 10 ? Math.floor(intPart / 10) : null,
        intPart % 10,
        dp >= 1 ? Number(decStr[0]) : null,
        dp >= 2 ? Number(decStr[1]) : null,
        dp >= 3 ? Number(decStr[2]) : null,
      ];

      const choices = params.given ?? ['fraction', 'decimal', 'places'];
      const dtGiven = randItem(Array.isArray(choices) ? choices : [choices]);

      return { type: 'decimal-triple', dtGiven, dtFrac, dtDecimal, dtPlaces };
    },
  },
};

// Returns the palette color index that the number n belongs to for a given rule.
function magicColorIdx(rule, n, params) {
  switch (rule) {
    case 'direct': return n - 1;   // cell shows 1, 2, 3… → palette index 0, 1, 2…
    case 'pairs': return n % 2 === 0 ? 1 : 0;
    case 'impairs': return n % 2 !== 0 ? 1 : 0;
    case 'multiples-of': return n % (params.value || 2) === 0 ? 1 : 0;
    case 'lt': return n < (params.value ?? 10) ? 1 : 0;
    case 'gt': return n > (params.value ?? 10) ? 1 : 0;
    case 'ranges': {
      const ranges = params.ranges || [];
      for (let i = 0; i < ranges.length; i++) {
        const [lo, hi] = ranges[i];
        if (n >= lo && n <= hi) return i;
      }
      return 0;
    }
    default: return 0;
  }
}

// Dual export: Node.js (build time) + browser (runtime)
if (typeof module !== 'undefined') module.exports = generators;
if (typeof window !== 'undefined') window.AppGenerators = generators;
