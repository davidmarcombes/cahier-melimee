/**
 * Generators — Nombres — comparer, ranger, suites, dénombrer, multiples, pair/impair, arrondir.
 * Browser: registers into window.AppGenerators (needs generators/_core.js first) · Node: module.exports
 */
(function (root) {
  const { rand, randItem, shuffle, scatter } =
    typeof module !== 'undefined' && module.exports ? require('./_core.js') : root.GenCore;

  const generators = {
    pairOuImpair: {
      generate: (params = {}) => {
        const num = rand(params.min ?? 1, params.max ?? 100);
        return { type: 'number-check', operation: String(num), answers: [num % 2 === 0 ? 'pair' : 'impair'] };
      },
    },

    arrondirNombre: {
      generate: (params = {}) => {
        const order = params.order ?? rand(2, 5);
        const magnitude = params.magnitude ?? rand(order, order + 2);

        const digits = [];
        for (let i = 0; i < magnitude; i++) {
          // Skip 5 for the deciding digit (just below the rounding boundary)
          // to avoid the ambiguous halfway case.
          if (i === magnitude - order) {
            const d = rand(0, 8);
            digits.push(d < 5 ? d : d + 1); // 0-4 or 6-9, never 5
          } else {
            digits.push(rand(0, 9));
          }
        }
        const num = digits.reduce((acc, digit) => acc * 10 + digit, 0);
        const rounded = Math.round(num / Math.pow(10, order)) * Math.pow(10, order);
        return { type: 'number-check', operation: `${num}&ensp;≈&ensp;?`, answers: [String(rounded)] };
      },
    },

    // arrondirGrandNombre: « Arrondis au million le plus proche. 34 567 891 ≈ ? » (CM1–CM2).
    // Number shown with digit groups; the rounding place is in the title. The deciding digit is
    // never 5 (no halfway case).
    // params: places (['millier', 'dizaine de mille', 'centaine de mille', 'million']),
    //         minDigits (6), maxDigits (9)
    arrondirGrandNombre: {
      generate: (params = {}) => {
        const PLACES = {
          dizaine: [1, 'à la dizaine la plus proche'],
          centaine: [2, 'à la centaine la plus proche'],
          millier: [3, 'au millier le plus proche'],
          'dizaine de mille': [4, 'à la dizaine de mille la plus proche'],
          'centaine de mille': [5, 'à la centaine de mille la plus proche'],
          million: [6, 'au million le plus proche'],
          'dizaine de millions': [7, 'à la dizaine de millions la plus proche'],
          'centaine de millions': [8, 'à la centaine de millions la plus proche'],
          milliard: [9, 'au milliard le plus proche'],
        };
        const [order, label] =
          PLACES[randItem(params.places ?? ['millier', 'dizaine de mille', 'centaine de mille', 'million'])];
        const digits = rand(Math.max(params.minDigits ?? 6, order + 1), Math.max(params.maxDigits ?? 9, order + 1));
        let num = rand(1, 9);
        for (let i = 1; i < digits; i++) {
          let d = rand(0, 9);
          if (i === digits - order) d = randItem([0, 1, 2, 3, 4, 6, 7, 8, 9]); // deciding digit, never 5
          num = num * 10 + d;
        }
        const p = 10 ** order;
        const rounded = Math.round(num / p) * p;
        // « 34__567__891 »: __ keeps the number, ≈ and the blank on one unbreakable line
        const grouped = String(num).replace(/\B(?=(\d{3})+$)/g, '__');
        return {
          type: 'number-check',
          title: `Arrondis ${label}.`,
          operation: `${grouped}__≈__?`,
          answers: [String(rounded)],
        };
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
        const fmt = (n) => n.toLocaleString('fr-FR');
        const side = params.side === 'random' ? (rand(0, 1) ? 'right' : 'left') : (params.side ?? 'right');
        const op = side === 'right' ? `${fmt(num)} + ? = ${fmt(target)}` : `? + ${fmt(num)} = ${fmt(target)}`;
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

    // estimerSommeDiff (CM1–CM2): estimate a sum / difference of whole or decimal numbers by rounding each
    // term. The digit that decides the rounding is never 5, no term is already round, every running total
    // (exact and rounded) stays above 0.
    //   params: mode — etape « 38,7 + 21,2 ≈ ? + ? = ? » | direct « 38,7 + 21,2 ≈ ? » | grandeur (mcq: the
    //     estimate among ÷10 / ×10) | possible (mcq Oui / Non: « 49,8 + 31,3 = 811 », a comma or a carry
    //     wrong, always far from the estimate) | probleme (kind: assez « Tu as 20 €… as-tu assez ? » mcq,
    //     environ « … environ combien ? » number-check) | list;
    //   place (rounding unit 1 / 10 / 100 / 1000, or a list), decimals (0, 1, 2 or a list), min (place),
    //   max (99: the largest whole part), terms (2, or a list), signs (['+']), kind (['assez', 'environ'])
    estimerSommeDiff: {
      generate(params = {}) {
        const mode = randItem([].concat(params.mode ?? 'etape'));
        const PLACES = { 1: 'à l’unité', 10: 'à la dizaine', 100: 'à la centaine', 1000: 'au millier' };
        const nb = (x, glue = '__') =>
          String(+x.toFixed(2))
            .replace('.', ',')
            .replace(/^\d+/, (w) => w.replace(/\B(?=(\d{3})+$)/g, glue));
        const money = (x) => x.toFixed(2).replace('.', ',');

        if (mode === 'probleme' && randItem([].concat(params.kind ?? ['assez', 'environ'])) === 'assez') {
          const ITEMS = ['un livre', 'un jeu', 'une trousse', 'un ballon', 'une BD', 'un puzzle', 'une gourde'];
          const maxPrice = params.max ?? 20;
          for (;;) {
            const n = randItem([].concat(params.terms ?? 2));
            const prices = Array.from({ length: n }, () => rand(150, maxPrice * 100) / 100);
            if (prices.some((x) => Math.round(x * 100) % 100 === 0 || Math.round(x * 10) % 10 === 5)) continue;
            const sum = prices.reduce((a, b) => a + b, 0);
            // a budget in fives, clearly above or below: the rounded prices land on the same side
            const budgets = [];
            for (let b = 5; b <= sum * 1.35; b += 5)
              if (Math.abs(b - sum) >= n + 0.5 && Math.abs(b - sum) <= sum * 0.35) budgets.push(b);
            if (!budgets.length) continue;
            const budget = randItem(budgets);
            const items = shuffle(ITEMS).slice(0, n);
            const list = items.map((it, i) => `${it} à <strong>${money(prices[i])}\u00a0€</strong>`);
            return {
              type: 'mcq',
              title: 'Arrondis chaque prix à l’unité : as-tu assez d’argent\u00a0?',
              body: `<p>Tu as <strong>${budget}\u00a0€</strong>. Tu achètes ${list.slice(0, -1).join(', ')} et ${list.at(-1)}.</p>`,
              mcqChoices: ['Oui', 'Non'],
              mcqAnswer: sum <= budget ? 0 : 1,
              mcqCompact: true,
            };
          }
        }

        const place = randItem([].concat(params.place ?? 10));
        const decimals = randItem([].concat(params.decimals ?? 0).filter((d) => d || place >= 10)) ?? 1; // whole numbers: place 10 or more
        const scale = 10 ** decimals;
        const min = params.min ?? place;
        const max = params.max ?? 99;
        const unit = place * scale; // the rounding unit, in scaled steps
        const term = () => {
          for (;;) {
            const v = rand(Math.ceil(min * scale) + 1, max * scale + scale - 1);
            if (decimals && v % 10 === 0) continue; // no trailing zero
            if (v % unit === 0 || (unit >= 10 && Math.floor(v / (unit / 10)) % 10 === 5)) continue;
            return { x: v / scale, r: Math.round(v / unit) * place };
          }
        };
        const value = (xs, signs) => xs.reduce((t, x, i) => (i ? (signs[i - 1] === '+' ? t + x : t - x) : x), 0);

        if (mode === 'probleme') {
          const SMALL = [
            [
              '+',
              'km',
              (a, b) =>
                `Un randonneur marche ${a} le matin et ${b} l’après-midi. Environ combien de kilomètres en tout\u00a0?`,
            ],
            ['+', 'kg', (a, b) => `Un colis pèse ${a}, un autre ${b}. Environ combien pèsent-ils en tout\u00a0?`],
            [
              '−',
              'm',
              (a, b) => `Un rouleau de ficelle mesure ${a}. On en coupe ${b}. Environ combien en reste-t-il\u00a0?`,
            ],
            ['−', '€', (a, b) => `Tu as ${a}. Tu dépenses ${b}. Environ combien te reste-t-il\u00a0?`],
          ];
          const BIG = [
            [
              '+',
              'jouets',
              (a, b) => `Une usine fabrique ${a} en mars et ${b} en avril. Environ combien de jouets en tout\u00a0?`,
            ],
            [
              '+',
              'spectateurs',
              (a, b) =>
                `Le stade accueille ${a} le samedi et ${b} le dimanche. Environ combien de spectateurs en tout\u00a0?`,
            ],
            [
              '−',
              'livres',
              (a, b) =>
                `Une bibliothèque a ${a}. Elle prête ${b}. Environ combien en reste-t-il sur les étagères\u00a0?`,
            ],
            [
              '−',
              'habitants',
              (a, b) =>
                `Une ville compte ${a}, sa voisine ${b}. Environ combien d’habitants de plus dans la première\u00a0?`,
            ],
          ];
          const [s, u, say] = randItem(decimals ? SMALL.filter((t) => t[1] !== '€' || decimals === 2) : BIG);
          for (;;) {
            const [a, b] = [term(), term()].sort((p, q) => q.x - p.x);
            const est = value([a.r, b.r], [s]);
            if (est <= 0 || a.x === b.x) continue;
            const show = (t) => `<strong>${nb(t.x, '\u00a0')}\u00a0${u}</strong>`;
            return {
              type: 'number-check',
              title: `Arrondis chaque nombre ${PLACES[place]}, puis calcule.`,
              body: `<p>${say(show(a), show(b))}</p>`,
              operation: `≈ ? ${u}`,
              answers: [String(est)],
            };
          }
        }

        for (;;) {
          const n = randItem([].concat(params.terms ?? 2));
          const ts = Array.from({ length: n }, term);
          const signs = ts.slice(1).map(() => randItem([].concat(params.signs ?? ['+'])));
          if (signs[0] === '−') ts.sort((p, q) => q.x - p.x); // the biggest first
          // every running total above 0, exact and rounded
          let ok = true;
          for (let k = 2; k <= n; k++)
            if (
              value(
                ts.slice(0, k).map((t) => t.x),
                signs
              ) <= 0 ||
              value(
                ts.slice(0, k).map((t) => t.r),
                signs
              ) <= 0
            )
              ok = false;
          if (!ok) continue;
          const exact = +value(
            ts.map((t) => t.x),
            signs
          ).toFixed(decimals);
          const est = value(
            ts.map((t) => t.r),
            signs
          );
          // each sign glued to its number (__ in a number-check, a no-break space in an mcq): lines break between terms only
          const line = (show, glue = ' ') => ts.map((t, i) => (i ? `${signs[i - 1]}${glue}` : '') + show(t)).join(' ');
          const expr = line((t) => nb(t.x), '__');
          const plain = line((t) => nb(t.x, '\u00a0'), '\u00a0');

          if (mode === 'grandeur') {
            if (est / exact < 0.5 || est / exact > 2) continue;
            const choices = shuffle([est / 10, est, est * 10]);
            return {
              type: 'mcq',
              title: 'Quel est l’ordre de grandeur du résultat\u00a0?',
              operation: plain,
              mcqChoices: choices.map((c) => nb(c, '\u00a0')),
              mcqAnswer: choices.indexOf(est),
              mcqCompact: true,
            };
          }
          if (mode === 'possible') {
            const far = (w) => w > 0 && Math.abs(w - exact) >= 2 * n * place;
            const wrongs = [exact * 10, exact / 10, exact + 10 * place, exact - 10 * place]
              .map((w) => +w.toFixed(decimals))
              .filter((w) => far(w) && (decimals || Number.isInteger(w)));
            const right = Math.random() < 0.5 || !wrongs.length;
            const shown = right ? exact : randItem(wrongs);
            return {
              type: 'mcq',
              title: `${randItem(['Léa', 'Tom', 'Inès', 'Hugo', 'Jade', 'Nathan', 'Lina', 'Adam'])} a trouvé ce résultat. Est-ce possible\u00a0?`,
              body: `<p>Arrondis ${PLACES[place]} pour vérifier.</p>`,
              operation: `${plain}\u00a0=\u00a0${nb(shown, '\u00a0')}`,
              mcqChoices: ['Oui', 'Non'],
              mcqAnswer: right ? 0 : 1,
              mcqCompact: true,
            };
          }
          if (mode === 'direct')
            return {
              type: 'number-check',
              title: `Arrondis chaque nombre ${PLACES[place]}, puis calcule.`,
              operation: `${expr}__≈__?`,
              answers: [String(est)],
            };
          return {
            type: 'number-check',
            title: `Arrondis chaque nombre ${PLACES[place]}, puis calcule.`,
            operation: `${expr}__≈ ${line(() => '?')} = ?`,
            answers: [...ts.map((t) => String(t.r)), String(est)],
          };
        }
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

    // multiplesOfTile: tile-select version of multiplesOf — click all multiples of N
    // params: divisors ([2,5,10]), count (6), min (4), max (500)
    multiplesOfTile: {
      generate(params = {}) {
        const count = params.count ?? 6;
        const pool = params.divisors || [2, 5, 10];
        const divisor = randItem(pool);
        const min = params.min ?? divisor;
        const max = params.max ?? 500;

        const multiples = [];
        const nonMultiples = [];
        for (let n = min; n <= max; n++) {
          if (n % divisor === 0) multiples.push(n);
          else nonMultiples.push(n);
        }

        const nCorrect = rand(2, Math.min(3, count - 2, multiples.length));
        const picked = shuffle([
          ...shuffle(multiples)
            .slice(0, nCorrect)
            .map((n) => ({ n, ok: true })),
          ...shuffle(nonMultiples)
            .slice(0, count - nCorrect)
            .map((n) => ({ n, ok: false })),
        ]);

        return {
          type: 'tile-select',
          title: `Lesquels sont des multiples de ${divisor} ?`,
          tiles: picked.map(({ n }) => String(n)),
          tileAnswers: picked.map(({ ok }, i) => (ok ? i : -1)).filter((i) => i !== -1),
        };
      },
    },

    // classerMultiples: classify numbers into category boxes by divisibility
    // params: divisors ([2,5,10]), count (6), min (4), max (500)
    //   Each number belongs to exactly one category (first matching divisor wins for display,
    //   but we generate the set so numbers don't overlap for simplicity)
    classerMultiples: {
      generate(params = {}) {
        const divisors = params.divisors ?? [2, 5, 10];
        const countPerCat = params.countPerCat ?? 2;
        const min = params.min ?? 10;
        const max = params.max ?? 500;

        // For a clean exercise, pick numbers that are multiples of exactly one of the divisors
        // (avoids confusion about where to place e.g. 10 when both 2 and 5 are categories)
        const cats = divisors.map((d) => ({ id: `d${d}`, label: `multiples de ${d}`, d }));
        const picked = [];
        const seen = new Set();

        for (const cat of cats) {
          let added = 0,
            attempts = 0;
          while (added < countPerCat && attempts < 500) {
            attempts++;
            const mult = rand(Math.ceil(min / cat.d), Math.floor(max / cat.d)) * cat.d;
            if (seen.has(mult)) continue;
            // Ensure it's not a multiple of any other cat divisor
            const exclusive = divisors.every((d) => d === cat.d || mult % d !== 0);
            if (!exclusive) continue;
            seen.add(mult);
            picked.push({ html: String(mult), cat: cat.id });
            added++;
          }
        }

        return {
          type: 'classify',
          categories: cats.map(({ id, label }) => ({ id, label })),
          items: shuffle(picked),
        };
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

    // trierDecimaux: drag-sort with decimal numbers (French comma notation)
    // params: decimals ('1'|'2'|'mix'), count (4), direction ('asc'|'desc'|'random')
    //   decimals '1'   → e.g. 0,2  1,3  0,4  (1 decimal place)
    //   decimals '2'   → e.g. 0,25 1,34 0,47 (2 decimal places)
    //   decimals 'mix' → mix of 1-3 decimal places
    trierDecimaux: {
      generate(params = {}) {
        const decimals = params.decimals ?? '1';
        const count = params.count ?? 4;
        const dir = params.direction ?? 'random';
        const direction = dir === 'random' ? (Math.random() < 0.5 ? 'asc' : 'desc') : dir;

        // Generate a random decimal string with d decimal digits
        const mkDec = (d) => {
          const intPart = rand(0, 3);
          const fracPart = Array.from({ length: d }, (_, i) => (i === 0 ? rand(1, 9) : rand(0, 9))).join('');
          return `${intPart},${fracPart}`;
        };

        // Build a pool of unique decimal strings
        let tiles;
        const maxAttempts = 200;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const set = new Set();
          for (let i = 0; i < count * 5 && set.size < count; i++) {
            let d;
            if (decimals === '1') d = 1;
            else if (decimals === '2') d = 2;
            else d = rand(1, 3); // mix
            set.add(mkDec(d));
          }
          if (set.size >= count) {
            tiles = [...set].slice(0, count);
            // Ensure no ties when parsed as floats
            const nums = tiles.map((v) => parseFloat(v.replace(',', '.')));
            if (new Set(nums).size === count) break;
            tiles = null;
          }
        }
        if (!tiles) tiles = ['0,1', '0,2', '0,3', '0,4'].slice(0, count); // fallback

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
          ['🐭', '🧀'],
          ['🐸', '🐜'],
          ['🐔', '🌽'],
          ['🐝', '🌸'],
          ['🐰', '🥕'],
          ['🐶', '🦴'],
          ['🦜', '🍓'],
          ['🐟', '🦐'],
          ['🐱', '🐟'],
          ['🐛', '🍃'],
          ['🦔', '🍄'],
          ['🐞', '🌼'],
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

        // Scatter, apart (_core.js scatter: taller picture or a grid when they do not fit)
        const W = 300;
        const { placed, H } = scatter(countA + countB, { W, H: 160, item: 28, gap: 28 * 1.4, margin: 4 });

        const texts = [
          ...placed
            .slice(0, countA)
            .map(
              ({ x, y }) =>
                `<text x="${Math.round(x)}" y="${Math.round(y)}" text-anchor="middle" dominant-baseline="central" font-size="26">${eA}</text>`
            ),
          ...placed
            .slice(countA)
            .map(
              ({ x, y }) =>
                `<text x="${Math.round(x)}" y="${Math.round(y)}" text-anchor="middle" dominant-baseline="central" font-size="26">${eB}</text>`
            ),
        ].join('');

        const svgHtml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${texts}</svg>`;

        const answer = countA === countB ? 0 : countA > countB ? 1 : 2;

        return {
          type: 'compare-groups',
          title: `Il y a <span style="display:inline-block;min-width:4rem;border-bottom:3px solid currentColor;vertical-align:baseline"> </span> de ${eA} que de ${eB}.`,
          svgHtml,
          cmpGroupAnswer: answer,
        };
      },
    },

    // compterGS: maternelle counting — emoji scattered, in a row or as dice patterns (2 dice above 6),
    // sizes optionally mixed (« même nombre, objets différents »). Answered by tapping a number in kid mode.
    // params: min (1), max (6), layouts (['scattered', 'row', 'dice']), mixSizes (false), flash (ms, 0 = always shown)
    compterGS: {
      generate(params = {}) {
        // Labels start with a consonant: « Combien de … ? » never needs « d' »
        const SETS = [
          ['🐭', 'souris'],
          ['🐟', 'poissons'],
          ['🐞', 'coccinelles'],
          ['🍎', 'pommes'],
          ['🍓', 'fraises'],
          ['🦆', 'canards'],
          ['🎈', 'ballons'],
          ['🌸', 'fleurs'],
          ['🦋', 'papillons'],
          ['🐢', 'tortues'],
          ['🐰', 'lapins'],
          ['🍒', 'cerises'],
          ['🐥', 'poussins'],
          ['🍬', 'bonbons'],
          ['🚗', 'voitures'],
          ['🐱', 'chats'],
        ];
        const [emoji, label] = randItem(SETS);
        const count = rand(params.min ?? 1, params.max ?? 6);
        const layouts = (params.layouts ?? ['scattered', 'row', 'dice']).filter((l) => l !== 'dice' || count <= 10);
        const layout = randItem(layouts.length ? layouts : ['scattered']);
        const W = 320,
          H = 200;
        const items = []; // { x, y, size }

        if (layout === 'row') {
          const step = Math.min(56, (W - 16) / count);
          const size = Math.min(36, Math.floor(step * 0.85));
          const x0 = (W - step * (count - 1)) / 2;
          for (let i = 0; i < count; i++) items.push({ x: x0 + i * step, y: H / 2, size });
        } else if (layout === 'dice') {
          // Pip spots on a 3 × 3 grid, numbered 0..8 row by row
          const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
          const faces = count <= 6 ? [count] : [Math.ceil(count / 2), Math.floor(count / 2)];
          const side = 120,
            gap = 24;
          const left = (W - (faces.length * side + (faces.length - 1) * gap)) / 2;
          faces.forEach((n, f) => {
            const fx = left + f * (side + gap),
              fy = (H - side) / 2;
            items.push({ face: true, x: fx, y: fy, side });
            for (const spot of PIPS[n])
              items.push({ x: fx + 24 + (spot % 3) * 36, y: fy + 24 + Math.floor(spot / 3) * 36, size: 26 });
          });
        } else {
          const SIZES = params.mixSizes ? [22, 32, 46] : [32];
          for (let i = 0; i < count; i++) {
            const size = randItem(SIZES);
            let spot = null;
            for (let t = 0; t < 400 && !spot; t++) {
              const x = size / 2 + 6 + Math.random() * (W - size - 12);
              const y = size / 2 + 6 + Math.random() * (H - size - 12);
              if (items.every((p) => Math.hypot(p.x - x, p.y - y) >= ((p.size + size) / 2) * 1.3))
                spot = { x, y, size };
            }
            items.push(spot || { x: 30 + (i % 6) * 50, y: 30 + Math.floor(i / 6) * 50, size: 28 });
          }
        }

        const body = items
          .map((it) =>
            it.face
              ? `<rect x="${it.x}" y="${it.y}" width="${it.side}" height="${it.side}" rx="18" fill="none" stroke="var(--cs, #94a3b8)" stroke-width="3"/>`
              : `<text x="${Math.round(it.x)}" y="${Math.round(it.y)}" text-anchor="middle" dominant-baseline="central" font-size="${it.size}">${emoji}</text>`
          )
          .join('');
        const svgHtml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${label}">${body}</svg>`;

        const item = {
          type: 'count-objects',
          title: 'Combien ?',
          say: `Combien de ${label} ?`,
          svgHtml,
          answers: [String(count)],
        };
        if (params.flash > 0) item.flash = params.flash;
        return item;
      },
    },

    // compterObjets: count scattered emoji, type the number
    // params: min (2), max (12)
    compterObjets: {
      generate(params = {}) {
        const SETS = [
          { emoji: '🐭', label: 'souris', audio: 'souris' },
          { emoji: '🧀', label: 'fromages', audio: 'fromages' },
          { emoji: '🐸', label: 'grenouilles', audio: 'grenouilles' },
          { emoji: '🍎', label: 'pommes', audio: 'pommes' },
          { emoji: '🐝', label: 'abeilles', audio: 'abeilles' },
          { emoji: '🌸', label: 'fleurs', audio: 'fleurs' },
          { emoji: '🐠', label: 'poissons', audio: 'poissons' },
          { emoji: '🦋', label: 'papillons', audio: 'papillons' },
          { emoji: '🍄', label: 'champignons', audio: 'champignons' },
          { emoji: '⭐', label: 'étoiles', audio: 'etoiles' },
          { emoji: '🐞', label: 'coccinelles', audio: 'coccinelles' },
          { emoji: '🥕', label: 'carottes', audio: 'carottes' },
          { emoji: '🐢', label: 'tortues', audio: 'tortues' },
          { emoji: '🍓', label: 'fraises', audio: 'fraises' },
          { emoji: '🐌', label: 'escargots', audio: 'escargots' },
          { emoji: '🌻', label: 'tournesols', audio: 'tournesols' },
        ];
        const min = params.min ?? 2;
        const max = params.max ?? 12;
        const set = SETS[Math.floor(Math.random() * SETS.length)];
        const count = Math.floor(Math.random() * (max - min + 1)) + min;

        // Scatter, apart (_core.js scatter: taller picture or a grid when they do not fit)
        const W = 280;
        const { placed, H } = scatter(count, { W, H: 200, item: 30, gap: 45, margin: 6, tries: 400 });

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
          say: `Combien y a-t-il de ${set.label} ?`,
          voiceAudio: `objets/${set.audio}.ogg`,
          voice: true,
          svgHtml,
          answers: [String(count)],
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

        const W = 280,
          H = 180,
          ITEM = 30,
          GAP = ITEM * 1.5;
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

        const fmt = (n, forceCDU) => (forceCDU ? toCDU(n) : String(n));

        const comparisons = Array.from({ length: pairs }, () => {
          let [a, b] = makePair();
          let left, right;

          if (style === 'standard') {
            left = fmt(a, false);
            right = fmt(b, false);
          } else if (style === 'cdu') {
            // CDU vs CDU: identical pairs are trivial, so force b ≠ a
            if (a === b) b = a === max ? a - 1 : a + 1;
            left = fmt(a, true);
            right = fmt(b, true);
          } else {
            // mixed: equal pairs are the key learning moment (standard = CDU)
            // unequal pairs: randomly mix standard/CDU on each side
            if (a === b) {
              left = fmt(a, false);
              right = fmt(b, true); // always standard = CDU
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
        const anchorPos =
          params.anchorPos === undefined
            ? 1 + Math.floor(Math.random() * maxSafePos)
            : Math.min(params.anchorPos, maxSafePos);

        // Build full sequence centred on anchor
        const sequence = Array.from({ length: cells }, (_, i) => anchor + (i - anchorPos) * step);

        let blankIdx = 0;
        const stepLabel = step > 0 ? `+${step}` : String(step);
        const row = [
          { value: stepLabel },
          ...sequence.map((val, i) =>
            i === anchorPos ? { value: String(val) } : { blank: true, idx: blankIdx++, answer: String(val) }
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

    // suiteAvecControle: sequence with the step hidden — first cells given to find the rule,
    // blanks in between, last cell given as a self-check (e.g. 50 75 100 _ _ _ _ _ _ 275)
    // params: steps ([25]) — may be decimal (0.25), given (3), blanks (6),
    //   direction ('asc'|'desc'|'mixed'), startMax (200), offset (false) — start need not be a multiple of the step
    suiteAvecControle: {
      generate(params = {}) {
        const step = randItem(params.steps ?? [25]);
        const scale = 10 ** (String(step).split('.')[1] || '').length;
        const s = Math.round(step * scale); // integer arithmetic avoids float drift (0.1 + 0.2)
        const nGiven = params.given ?? 3;
        const total = nGiven + (params.blanks ?? 6) + 1;
        const dir = params.direction ?? 'asc';
        const desc = dir === 'desc' || (dir === 'mixed' && Math.random() < 0.5);
        const maxUnits = Math.round((params.startMax ?? 200) * scale);
        let start = params.offset ? rand(1, maxUnits) : rand(0, Math.floor(maxUnits / s)) * s;
        if (desc) start += (total - 1) * s; // keep every value ≥ 0
        const fmt = (n) => n.toLocaleString('fr-FR');

        let inputIdx = 0;
        const items = Array.from({ length: total }, (_, i) => {
          const v = (start + (desc ? -i : i) * s) / scale;
          return i < nGiven || i === total - 1
            ? { value: fmt(v) }
            : { blank: true, inputIdx: inputIdx++, answer: String(v) };
        });
        return { type: 'sequence', sequence: { items } };
      },
    },

    // suitesRegle (CM1–CM2): arithmetic (+ / − a step) and geometric (× / ÷ a ratio) sequences.
    //   params: mode — completer (sequence: 3 terms given, blanks, the last one given as a check) | regle
    //     (« 12 ; 37 ; 62 ; 87 ; … » → « On ajoute ? ») | qcm (mcq: + 4, × 2…, the first two terms fit two
    //     rules) | manquant (« 7 ; 14 ; ? ; 56 ; 112 ») | lointain (arithmetic: « le 10ᵉ nombre ? »);
    //   kind (['ajouter', 'multiplier']), down (false | true | 'mixed': − / ÷), steps ([2…100]), ratios ([2, 3, 5, 10]),
    //   max (10 000: the biggest term), startMax (500: arithmetic), decimals (false: geometric ÷ may go on into decimals, 2 at most),
    //   terms (7: completer), places ([10, 12, 15, 20]: lointain)
    suitesRegle: {
      generate(params = {}) {
        const mode = randItem([].concat(params.mode ?? 'completer'));
        const kind = mode === 'lointain' ? 'ajouter' : randItem([].concat(params.kind ?? ['ajouter', 'multiplier']));
        const dir = params.down ?? false;
        const down = mode !== 'lointain' && (dir === 'mixed' ? Math.random() < 0.5 : !!dir);
        const max = params.max ?? 10000;
        const nb = (x, glue = '\u00a0') =>
          String(+x.toFixed(2))
            .replace('.', ',')
            .replace(/^\d+/, (w) => w.replace(/\B(?=(\d{3})+$)/g, glue));
        const ans = (x) => String(+x.toFixed(2)).replace('.', ',');
        const n = mode === 'completer' ? (params.terms ?? 7) : mode === 'manquant' ? rand(5, 6) : 4;

        // n terms, rising; reversed when going down
        let seq;
        for (;;) {
          if (kind === 'ajouter') {
            const d = randItem([].concat(params.steps ?? [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 15, 25, 50, 100]));
            // qcm: half the time the run starts at the step (4 ; 8 ; 12: « × 2 » fits the first two terms)
            const start =
              mode === 'qcm' && Math.random() < 0.5 ? d : rand(1, Math.max(1, (params.startMax ?? 500) - (n - 1) * d));
            seq = Array.from({ length: n }, (_, i) => start + i * d);
          } else {
            const r = randItem([].concat(params.ratios ?? [2, 3, 5, 10]));
            const top = Math.floor(max / r ** (n - 1));
            if (top < 1) continue;
            const s = rand(1, Math.min(top, 20));
            seq = Array.from({ length: n }, (_, i) => s * r ** i);
            // ÷ into decimals: the whole run shifted down by r or r², every term with 2 decimals at most
            if (params.decimals && down) {
              const j = randItem([1, 2]);
              const shifted = seq.map((v) => v / r ** j);
              if (
                shifted.every((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9) &&
                shifted.some((v) => !Number.isInteger(v))
              )
                seq = shifted;
            }
          }
          if (seq.at(-1) <= max && seq[0] > 0) break;
        }
        if (down) seq.reverse();
        const step = kind === 'ajouter' ? Math.abs(seq[1] - seq[0]) : Math.max(seq[1] / seq[0], seq[0] / seq[1]);
        const rule = kind === 'ajouter' ? `${down ? '−' : '+'} ${step}` : `${down ? '÷' : '×'} ${+step.toFixed(2)}`;
        const line = (xs) => xs.map((x) => nb(x)).join('\u00a0; '); // « ; » never starts a line

        if (mode === 'completer') {
          let inputIdx = 0;
          const items = seq.map((v, i) =>
            i < 3 || i === n - 1 ? { value: nb(v) } : { blank: true, inputIdx: inputIdx++, answer: ans(v) }
          );
          return { type: 'sequence', sequence: { items } };
        }
        if (mode === 'regle') {
          const verb = { '+': 'On ajoute', '−': 'On enlève', '×': 'On multiplie par', '÷': 'On divise par' }[rule[0]];
          return {
            type: 'number-check',
            bodyFirst: true,
            body: `<p class="text-2xl font-bold">${line(seq)}\u00a0; …</p>`,
            operation: `${verb} ?`,
            answers: [ans(step)],
          };
        }
        if (mode === 'qcm') {
          // the first two terms fit a + and a × rule: only the whole run tells
          const [a, b] = seq;
          const apply = (r, x) => {
            const k = Number(r.slice(2));
            return { '+': x + k, '−': x - k, '×': x * k, '÷': x / k }[r[0]];
          };
          const fits = (r) => seq.every((v, i) => !i || Math.abs(apply(r, seq[i - 1]) - v) < 1e-9);
          const [big, small] = [Math.max(a, b), Math.min(a, b)];
          const [plus, times] = down ? ['−', '÷'] : ['+', '×'];
          const gap = big - small;
          // traps: a rule that fits the first two terms only, and near misses
          const pool =
            kind === 'multiplier'
              ? [`${plus} ${gap}`, `${plus} ${step}`, `${times} ${step + 1}`]
              : [
                  `${plus} ${2 * gap}`,
                  `${plus} ${gap + 1}`,
                  ...(big % small === 0 ? [`${times} ${big / small}`] : [`${times} 2`]),
                ];
          const choices = shuffle(
            [
              rule,
              ...shuffle(
                [...new Set(pool)].filter((r) => r !== rule && Number.isInteger(Number(r.slice(2))) && !fits(r))
              ),
            ].slice(0, 4)
          );
          if (choices.length < 3) return generators.suitesRegle.generate(params);
          return {
            type: 'mcq',
            title: 'Quelle est la règle de cette suite\u00a0?',
            operation: line(seq),
            mcqChoices: choices,
            mcqAnswer: choices.indexOf(rule),
            mcqCompact: true,
          };
        }
        if (mode === 'manquant') {
          const i = rand(1, n - 2);
          const items = seq.map((v, k) => (k === i ? { blank: true, inputIdx: 0, answer: ans(v) } : { value: nb(v) }));
          return { type: 'sequence', sequence: { items } };
        }
        // lointain: « 5 ; 9 ; 13 ; 17 ; … » the p-th term
        const p = randItem([].concat(params.places ?? [10, 12, 15, 20]));
        const d = seq[1] - seq[0];
        return {
          type: 'number-check',
          bodyFirst: true,
          body: `<p class="text-2xl font-bold">${line(seq)}\u00a0; …</p><p>Quel est le ${p}ᵉ nombre de la suite\u00a0?</p>`,
          operation: `${p}ᵉ nombre\u00a0: ?`,
          answers: [ans(seq[0] + (p - 1) * d)],
        };
      },
    },

    // boiteDix: count-objects (GS) — a box of 10 (2 rows of 5) with tokens; how many tokens, or how many
    //   more to fill the box? Answered by tapping a number. The spoken instruction (say) is fixed by `ask`.
    //   params: ask ('combien' | 'manque'), min (1), max (10, 9 for 'manque'), scatter (false — tokens
    //   in any cell; otherwise the top row fills first, left to right)
    boiteDix: {
      generate(params = {}) {
        const manque = params.ask === 'manque';
        const n = rand(params.min ?? 1, Math.min(params.max ?? 10, manque ? 9 : 10));
        const cells = params.scatter ? shuffle([...Array(10).keys()]).slice(0, n) : [...Array(n).keys()];
        const box = Array.from({ length: 10 }, (_, i) => {
          const [x, y] = [12 + (i % 5) * 52, 12 + Math.floor(i / 5) * 52];
          return (
            `<rect x="${x}" y="${y}" width="48" height="48" rx="6" fill="var(--sf)" stroke="var(--ct)" stroke-width="2"/>` +
            (cells.includes(i)
              ? `<circle cx="${x + 24}" cy="${y + 24}" r="17" fill="#ef4444" stroke="#991b1b" stroke-width="2"/>`
              : '')
          );
        }).join('');
        return {
          type: 'count-objects',
          title: 'Combien ?',
          say: manque ? 'Combien de jetons pour remplir la boîte ?' : 'Combien de jetons ?',
          svgHtml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 284 128" width="284" height="128" role="img" aria-label="Boîte de 10">${box}</svg>`,
          answers: [String(manque ? 10 - n : n)],
        };
      },
    },

    // jeuOie: tile-select (GS) — a die and a frog on a track of cells: tap the cell it lands on (surcomptage
    //   from its cell). Cells are square tiles in one row, all blank but the frog's, so `positional` (the answer is a place).
    //   params: die ([1, 3] dots), start ([0, 2] — the frog's cell), after ([1, 3] cells past the landing one)
    jeuOie: {
      generate(params = {}) {
        const [dMin, dMax] = params.die || [1, 3];
        const [sMin, sMax] = params.start || [0, 2];
        const [aMin, aMax] = params.after || [1, 3];
        const d = rand(dMin, dMax);
        const start = rand(sMin, sMax);
        const length = Math.min(10, start + d + 1 + rand(aMin, aMax));
        // Pip spots on a 3 × 3 grid, numbered 0..8 row by row
        const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
        const pips = PIPS[d]
          .map((k) => `<circle cx="${22 + (k % 3) * 23}" cy="${22 + Math.floor(k / 3) * 23}" r="8" fill="var(--ct)"/>`)
          .join('');
        const die =
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 90" width="90" height="90" role="img" aria-label="Dé : ${d}">` +
          `<rect x="3" y="3" width="84" height="84" rx="14" fill="var(--sf)" stroke="var(--ct)" stroke-width="3"/>${pips}</svg>`;
        // A square cell: blank, or with the frog (SVG tiles get the big kid size, text ones shrink)
        const cell = (frog) =>
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">` +
          (frog ? `<text x="20" y="29" text-anchor="middle" font-size="26">🐸</text>` : '') +
          `</svg>`;
        return {
          type: 'tile-select',
          title: '🎲',
          say: 'Touche la case où arrive la grenouille.',
          body: `<div style="display:flex;justify-content:center">${die}</div>`,
          tiles: Array.from({ length }, (_, i) => cell(i === start)),
          tileAnswers: [start + d],
          positional: true,
        };
      },
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = generators;
  else Object.assign((root.AppGenerators = root.AppGenerators || {}), generators);
})(typeof window !== 'undefined' ? window : globalThis);
