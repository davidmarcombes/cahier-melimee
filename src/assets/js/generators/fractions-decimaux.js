/**
 * Generators — Fractions et décimaux — représenter, comparer, décomposer, calculer.
 * Browser: registers into window.AppGenerators (needs generators/_core.js first) · Node: module.exports
 */
(function (root) {
  const { rand, randItem, shuffle } =
    typeof module !== 'undefined' && module.exports ? require('./_core.js') : root.GenCore;

  const generators = {
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
          frac(N, 10), // 42/10
          frac(N * 10, 100), // 420/100
          `${a}&nbsp;+&nbsp;${frac(b, 10)}`, // 4 + 2/10
          `${a}&nbsp;+&nbsp;${frac(b * 10, 100)}`, // 4 + 20/100
        ];

        // Pick k correct (2 or 3)
        const k = rand(2, 3);
        const chosen = [...allCorrect].sort(() => Math.random() - 0.5).slice(0, k);

        // Distractors — different values that look plausible
        const dPool = [];
        if (b !== a) dPool.push(frac(b * 10 + a, 10)); // swap digits: ba/10
        if (a > 1) dPool.push(frac((a - 1) * 10 + b, 10)); // (a-1).b
        if (a < 9) dPool.push(frac((a + 1) * 10 + b, 10)); // (a+1).b
        if (b !== a) dPool.push(`${b}&nbsp;+&nbsp;${frac(a, 10)}`); // b + a/10
        dPool.push(frac(N * 10 + 1, 100)); // N*10+1 /100 (≠ N*10/100)
        dPool.push(frac(a * 10, 10)); // a.0
        dPool.push(frac(N, 100)); // 0.N (wrong denominator)
        dPool.push(`${a}&nbsp;+&nbsp;${frac(b, 100)}`); // a + b/100 (= a.0b)

        const distractors = [...new Set(dPool)]
          .filter((d) => !chosen.includes(d))
          .sort(() => Math.random() - 0.5)
          .slice(0, 5 - k);

        const pool = [...chosen, ...distractors].sort(() => Math.random() - 0.5);
        const tileAnswers = chosen.map((c) => pool.indexOf(c));
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

    trierFractions: {
      generate(params = {}) {
        const count = params.count ?? 4;
        const direction = params.direction ?? 'asc';
        const sameDen = params.sameDenominator ?? true;

        let fracs;
        if (sameDen) {
          const denChoices = params.denominator
            ? [params.denominator]
            : [4, 6, 8, 10, 12].filter((d) => d - 1 >= count);
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

    // fractionDuNombre: calcul de moitié / tiers / quart d'un nombre
    // params: denominators ([2,4]), min (4), max (20), numerator (1), notation ('words'|'fraction')
    //   notation 'words'    — "moitié de 12", "tiers de 18" (CE2 style)
    //   notation 'fraction' — stacked 1/4 de 12 (CM1 style, default when numerator > 1 or denom > 4)
    fractionDuNombre: {
      generate(params = {}) {
        const NAMES = { 2: 'moitié', 3: 'tiers', 4: 'quart' };
        const denominators = params.denominators ?? [2, 4];
        const d = randItem(denominators);
        const numParam = params.numerator ?? 1;
        const num = numParam === 'mix' ? rand(1, d - 1) : numParam;
        const minVal = params.min ?? d * 2;
        const maxVal = params.max ?? d * 10;
        const first = Math.ceil(minVal / d) * d;
        const last = Math.floor(maxVal / d) * d;
        const n = first + Math.floor(Math.random() * ((last - first) / d + 1)) * d;
        const answer = (n / d) * num;

        // Choose notation
        const useWords =
          (params.notation ?? 'auto') === 'words' || (num === 1 && d <= 4 && params.notation !== 'fraction');
        const op = useWords ? `${NAMES[d] || `${num}/${d}`} de ${n} = ?` : `&frac(${num},${d}) de ${n} = ?`;

        return {
          type: 'number-check',
          operation: op,
          answers: [String(answer)],
        };
      },
    },

    /* ── Fractions décimales ↔ écriture décimale ───────────────────── */
    fractionDecimale: {
      generate(params = {}) {
        const mode = params.mode || 'frac-to-dec'; // 'frac-to-dec' | 'dec-to-frac' | 'mixed'

        const actualMode = mode === 'mixed' ? (Math.random() < 0.5 ? 'frac-to-dec' : 'dec-to-frac') : mode;

        // Pool: [numerator, denominator] — denominators 10 or 100 only
        // Avoid trivial cases (0) and ensure no leading zeros confusion beyond CM1 scope
        const pool10 = Array.from({ length: 9 }, (_, i) => [i + 1, 10]); // 1/10 … 9/10
        const pool100 = [
          // multiples of 10 in hundredths (= tenths written differently) — good for confusion
          [10, 100],
          [20, 100],
          [30, 100],
          [40, 100],
          [50, 100],
          [60, 100],
          [70, 100],
          [80, 100],
          [90, 100],
          // non-round hundredths
          [1, 100],
          [2, 100],
          [3, 100],
          [4, 100],
          [5, 100],
          [6, 100],
          [7, 100],
          [8, 100],
          [9, 100],
          [11, 100],
          [12, 100],
          [15, 100],
          [20, 100],
          [25, 100],
          [34, 100],
          [47, 100],
          [63, 100],
          [75, 100],
          [99, 100],
        ];
        const level = params.level || 'dixiemes'; // 'dixiemes' | 'centiemes' | 'mixed'
        let pair;
        if (level === 'dixiemes') {
          pair = randItem(pool10);
        } else if (level === 'centiemes') {
          pair = randItem(pool100);
        } else {
          pair = Math.random() < 0.5 ? randItem(pool10) : randItem(pool100);
        }
        const [num, den] = pair;

        // Format decimal: 3/10 → "0,3" | 7/100 → "0,07" (keep leading zeros, strip trailing)
        const decVal = num / den;
        const decimals = den === 10 ? 1 : 2;
        // Always use fixed precision to preserve leading zeros (e.g. 0,07), then strip trailing zeros
        // but keep at least one decimal digit to avoid "0," edge case
        const decFixed = decVal.toFixed(decimals).replace('.', ',');
        // Strip trailing zeros only after a comma, keeping at least one decimal digit
        const decStr = decFixed.replace(/,(\d*[1-9])0+$/, ',$1').replace(/,0+$/, ',0');

        const denLabel = den === 10 ? 'dixièmes' : 'centièmes';

        if (actualMode === 'frac-to-dec') {
          return {
            type: 'number-check',
            operation: `&frac(${num},${den})`,
            body: `<p class="text-base text-content-subtle">Écris cette fraction en écriture décimale (utilise une virgule).</p>`,
            answers: [decStr],
          };
        } else {
          // dec-to-frac: give decimal, ask for numerator over fixed denominator
          return {
            type: 'number-check',
            operation: `${decStr} = ? / ${den}`,
            body: `<p class="text-base text-content-subtle">Complète : ${decStr} = <strong>?</strong> ${denLabel}</p>`,
            answers: [String(num)],
          };
        }
      },
    },

    /* ── Fraction d'une quantité ─────────────────────────────────────── */
    fractionQuantite: {
      generate(params = {}) {
        const mode = params.mode || 'find-part'; // 'find-part' | 'find-total' | 'mixed'

        const contexts = [
          { noun: 'élèves', verb: 'portent des lunettes', question: "d'élèves portent des lunettes" },
          { noun: 'élèves', verb: 'ont un animal de compagnie', question: "d'élèves ont un animal" },
          { noun: 'bonbons', verb: 'sont rouges', question: 'de bonbons sont rouges' },
          { noun: 'billes', verb: 'sont bleues', question: 'de billes sont bleues' },
          { noun: 'livres', verb: 'sont illustrés', question: 'de livres sont illustrés' },
          { noun: 'fleurs', verb: 'sont jaunes', question: 'de fleurs sont jaunes' },
          { noun: 'gâteaux', verb: 'sont au chocolat', question: 'de gâteaux sont au chocolat' },
          { noun: 'stylos', verb: 'sont rouges', question: 'de stylos sont rouges' },
          { noun: 'fruits', verb: 'sont des pommes', question: 'de fruits sont des pommes' },
          { noun: 'élèves', verb: 'aiment les maths', question: "d'élèves aiment les maths" },
        ];

        // [num, den, possible totals]
        const fracs = [
          [1, 2, [10, 12, 14, 16, 18, 20, 24]],
          [1, 3, [9, 12, 15, 18, 21, 24]],
          [1, 4, [8, 12, 16, 20, 24, 28]],
          [1, 5, [10, 15, 20, 25, 30]],
          [3, 4, [8, 12, 16, 20, 24]],
          [2, 3, [9, 12, 15, 18, 21, 24]],
          [2, 5, [10, 15, 20, 25]],
          [3, 5, [10, 15, 20, 25]],
        ];

        const [num, den, totals] = randItem(fracs);
        const total = randItem(totals);
        const part = (total / den) * num;
        const ctx = randItem(contexts);

        const actualMode = mode === 'mixed' ? (Math.random() < 0.5 ? 'find-part' : 'find-total') : mode;

        // Inline fraction HTML using the global .frac/.fn/.fd CSS classes
        const fracSpan =
          `<span class="frac font-bold" style="font-size:1.4em;vertical-align:middle">` +
          `<span class="fn">${num}</span><span class="fd">${den}</span></span>`;

        if (actualMode === 'find-part') {
          const body =
            `<p>Dans un groupe de <strong>${total} ${ctx.noun}</strong>, ` +
            `${fracSpan} ${ctx.verb}.</p>` +
            `<p class="mt-2 text-base text-content-subtle">Combien ${ctx.question} ?</p>`;
          return {
            type: 'number-check',
            body,
            operation: `&frac(${num},${den}) de ${total}`,
            answers: [String(part)],
          };
        } else {
          const body =
            `<p>${fracSpan} des <strong>${ctx.noun}</strong> ${ctx.verb}. Il y en a <strong>${part}</strong>.</p>` +
            `<p class="mt-2 text-base text-content-subtle">Combien y a-t-il de ${ctx.noun} en tout ?</p>`;
          return {
            type: 'number-check',
            body,
            answers: [String(total)],
          };
        }
      },
    },

    // classerFractions: classify fractions as < 1, = 1, or > 1
    // params: count (6–8), level ('facile'|'moyen'|'mix')
    //   facile — denominators 2–6, nice numbers
    //   moyen  — denominators up to 12, larger numerators
    classerFractions: {
      generate(params = {}) {
        const count = Math.max(4, Math.min(params.count ?? 6, 10));
        const level = params.level ?? 'mix';
        const resolved = level === 'mix' ? randItem(['facile', 'moyen']) : level;

        const maxDenom = resolved === 'facile' ? 6 : 12;

        const frac = (n, d) =>
          `<span class="frac font-bold" style="font-size:1.4em;vertical-align:middle"><span class="fn">${n}</span><span class="fd">${d}</span></span>`;

        const seen = new Set();
        const items = [];
        const cats = ['lt', 'eq', 'gt'];
        // Ensure at least 1 of each category
        const guaranteed = shuffle([...cats]);

        for (let attempt = 0; items.length < count && attempt < count * 20; attempt++) {
          const cat = items.length < 3 ? guaranteed[items.length] : randItem(cats);
          const d = rand(2, maxDenom);
          let n;
          if (cat === 'lt') n = rand(1, d - 1);
          else if (cat === 'eq') n = d;
          else n = rand(d + 1, d + (resolved === 'facile' ? d : d * 2));

          const key = `${n}/${d}`;
          if (seen.has(key)) continue;
          seen.add(key);
          items.push({ html: frac(n, d), cat });
        }

        return {
          type: 'classify',
          categories: [
            { id: 'lt', label: 'fractions inférieures à 1' },
            { id: 'eq', label: 'fractions égales à 1' },
            { id: 'gt', label: 'fractions supérieures à 1' },
          ],
          items: shuffle(items),
        };
      },
    },

    // fractionEnLettres: read a fraction written in words, type the numeric form
    // params: level ('facile'|'moyen'|'difficile'|'mix'), count (6)
    // facile  — halves, thirds, quarters, fifths, tenths (small numerators)
    // moyen   — up to twentieths, larger numerators, includes centièmes
    // difficile — any denominator up to 1000, composite numerators, millièmes
    fractionEnLettres: {
      generate(params = {}) {
        const level = params.level ?? 'mix';

        // Denominator word → number mapping (singular forms; generator adds 's' for plural check not needed here)
        const DENOM_WORDS = [
          { word: 'demi', words: ['demi', 'demis'], d: 2 },
          { word: 'tiers', words: ['tiers'], d: 3 },
          { word: 'quart', words: ['quart', 'quarts'], d: 4 },
          { word: 'cinquième', words: ['cinquième', 'cinquièmes'], d: 5 },
          { word: 'sixième', words: ['sixième', 'sixièmes'], d: 6 },
          { word: 'septième', words: ['septième', 'septièmes'], d: 7 },
          { word: 'huitième', words: ['huitième', 'huitièmes'], d: 8 },
          { word: 'neuvième', words: ['neuvième', 'neuvièmes'], d: 9 },
          { word: 'dixième', words: ['dixième', 'dixièmes'], d: 10 },
          { word: 'onzième', words: ['onzième', 'onzièmes'], d: 11 },
          { word: 'douzième', words: ['douzième', 'douzièmes'], d: 12 },
          { word: 'treizième', words: ['treizième', 'treizièmes'], d: 13 },
          { word: 'quatorzième', words: ['quatorzième', 'quatorzièmes'], d: 14 },
          { word: 'quinzième', words: ['quinzième', 'quinzièmes'], d: 15 },
          { word: 'seizième', words: ['seizième', 'seizièmes'], d: 16 },
          { word: 'dix-septième', words: ['dix-septième', 'dix-septièmes'], d: 17 },
          { word: 'dix-huitième', words: ['dix-huitième', 'dix-huitièmes'], d: 18 },
          { word: 'dix-neuvième', words: ['dix-neuvième', 'dix-neuvièmes'], d: 19 },
          { word: 'vingtième', words: ['vingtième', 'vingtièmes'], d: 20 },
          { word: 'centième', words: ['centième', 'centièmes'], d: 100 },
          { word: 'millième', words: ['millième', 'millièmes'], d: 1000 },
        ];

        const POOLS = {
          facile: DENOM_WORDS.filter((e) => [2, 3, 4, 5, 10].includes(e.d)),
          moyen: DENOM_WORDS.filter((e) => e.d <= 20 || e.d === 100),
          difficile: DENOM_WORDS,
        };
        const resolvedLevel = level === 'mix' ? randItem(['facile', 'moyen', 'difficile']) : level;
        const pool = POOLS[resolvedLevel] || POOLS.moyen;

        // Numerator words (1–19 + round tens up to 90)
        const NUM_WORDS = [
          'un',
          'deux',
          'trois',
          'quatre',
          'cinq',
          'six',
          'sept',
          'huit',
          'neuf',
          'dix',
          'onze',
          'douze',
          'treize',
          'quatorze',
          'quinze',
          'seize',
          'dix-sept',
          'dix-huit',
          'dix-neuf',
          'vingt',
          'trente',
          'quarante',
          'cinquante',
          'soixante',
        ];

        const count = params.count ?? 6;
        const items = [];
        const usedKeys = new Set();

        for (let attempt = 0; attempt < count * 10 && items.length < count; attempt++) {
          const denomEntry = randItem(pool);
          const d = denomEntry.d;
          // Numerator: 1 to d-1 for proper fractions; for facile keep small
          const maxN = resolvedLevel === 'facile' ? Math.min(d - 1, 9) : Math.min(d - 1, 24);
          if (maxN < 1) continue;
          const n = rand(1, maxN);
          const key = `${n}/${d}`;
          if (usedKeys.has(key)) continue;
          usedKeys.add(key);

          const nWord = NUM_WORDS[n - 1];
          if (!nWord) continue; // n > 25, skip
          const dWord = n > 1 ? denomEntry.words[denomEntry.words.length - 1] : denomEntry.words[0];
          // Special case: "demi" → "deux demis" not "deux demi"
          const text = `${nWord} ${dWord}`;
          items.push({ text, answer: key });
        }

        // Shuffle and pick one for this round
        const item = randItem(items.length ? items : [{ text: 'cinq dixièmes', answer: '5/10' }]);

        return {
          type: 'fraction-check',
          operation: item.text,
          answers: [item.answer],
        };
      },
    },

    // conversionDenominateur: Vrai ou Faux — is this fraction equivalence correct?
    // Shows a/b = (a*k)/(b*k) or a deliberate wrong version.
    // params: level ('simple'|'medium'|'hard'), count (5)
    // fractionAdditionMatching: match addition of fractions to their result
    // params: mode ('same'|'different'|'mixed'), pairs (4)
    fractionAdditionMatching: {
      generate(params = {}) {
        const mode = params.mode ?? 'same';
        const pairCount = params.pairs ?? 4;
        const op = params.op ?? 'add'; // 'add' | 'mixed' (add+sub)

        const frac = (n, d) =>
          `<span class="frac" style="font-size:1rem"><span class="fn">${n}</span><span class="fd">${d}</span></span>`;

        const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
        const simplify = (n, d) => {
          const g = gcd(Math.abs(n), d);
          return [n / g, d / g];
        };

        const generated = [];
        let attempts = 0;

        while (generated.length < pairCount && attempts < pairCount * 30) {
          attempts++;
          let left, result;
          const useOp = op === 'mixed' ? (Math.random() < 0.5 ? '+' : '−') : '+';

          if (mode === 'same') {
            // Same denominator: a/d ± b/d = (a±b)/d
            const d = rand(2, 8);
            const a = rand(1, d - 1);
            const b = rand(1, d - 1);
            const rn = useOp === '+' ? a + b : a - b;
            if (rn <= 0 || rn > d * 2) continue;
            const [sn, sd] = simplify(rn, d);
            left = `${frac(a, d)} ${useOp} ${frac(b, d)}`;
            result = sd === 1 ? `${sn}` : frac(sn, sd);
          } else {
            // Different denominators: a/d1 ± b/d2 — d2 is a multiple of d1
            const d1 = rand(2, 5);
            const mult = rand(2, 4);
            const d2 = d1 * mult;
            const a = rand(1, d1 - 1);
            const b = rand(1, d2 - 1);
            const lcm = d2; // d2 is already the common denom
            const an = a * mult;
            const rn = useOp === '+' ? an + b : an - b;
            if (rn <= 0) continue;
            const [sn, sd] = simplify(rn, lcm);
            left = `${frac(a, d1)} ${useOp} ${frac(b, d2)}`;
            result = sd === 1 ? `${sn}` : frac(sn, sd);
          }

          // Avoid duplicates
          if (generated.some((g) => g.left === left)) continue;
          generated.push({ left, result });
        }

        if (generated.length < pairCount) return null; // retry

        const rightOrder = shuffle(Array.from({ length: pairCount }, (_, i) => i));
        const answers = generated.map((_, li) => rightOrder.indexOf(li));

        return {
          type: 'matching',
          pairs: {
            left: generated.map((g) => g.left),
            right: rightOrder.map((ri) => generated[ri].result),
            answers,
          },
        };
      },
    },

    conversionDenominateur: {
      generate(params = {}) {
        const frac = (n, d) =>
          `<span class="frac" style="font-size:1.1rem"><span class="fn">${n}</span><span class="fd">${d}</span></span>`;
        const level = params.level ?? 'simple';
        const count = params.count ?? 5;

        // Denominator pairs per level: [from, to] — always multiples
        const pairs = {
          simple: [
            [2, 4],
            [2, 6],
            [2, 8],
            [3, 6],
            [3, 9],
            [4, 8],
            [5, 10],
            [2, 10],
          ],
          medium: [
            [3, 12],
            [4, 12],
            [5, 15],
            [5, 20],
            [6, 12],
            [4, 16],
            [3, 15],
            [6, 18],
          ],
          hard: [
            [4, 20],
            [6, 24],
            [7, 14],
            [8, 24],
            [9, 27],
            [5, 25],
            [6, 30],
            [8, 32],
          ],
        };
        pairs.mix = [...pairs.simple, ...pairs.medium, ...pairs.hard];
        const pool = pairs[level] ?? pairs.simple;

        const statements = [];
        let attempts = 0;
        while (statements.length < count && attempts < count * 15) {
          attempts++;
          const [d1, d2] = pool[Math.floor(Math.random() * pool.length)];
          const k = d2 / d1;
          const a = rand(1, d1 - 1); // numerator < denominator (proper fraction)
          const isTrue = Math.random() < 0.5;

          let n2;
          if (isTrue) {
            n2 = a * k; // correct conversion
          } else {
            // Wrong: off by 1 in numerator, or multiply denominator but not numerator
            const mistake = Math.random() < 0.5 ? 1 : -1;
            n2 = a * k + mistake;
            if (n2 <= 0 || n2 === a * k) n2 = a * k + 1;
          }

          // Avoid duplicates
          const text = `${frac(a, d1)} = ${frac(n2, d2)}`;
          if (statements.some((s) => s.text === text)) continue;

          statements.push({ text, answer: isTrue });
        }

        return { type: 'true-false', statements };
      },
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = generators;
  else Object.assign((root.AppGenerators = root.AppGenerators || {}), generators);
})(typeof window !== 'undefined' ? window : globalThis);
