/**
 * Generators — Nombres — comparer, ranger, suites, dénombrer, multiples, pair/impair, arrondir.
 * Browser: registers into window.AppGenerators (needs generators/_core.js first) · Node: module.exports
 */
(function (root) {
  const { rand, randItem, shuffle } =
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

        // Scatter positions with collision avoidance
        const W = 300,
          H = 160,
          ITEM = 28,
          GAP = ITEM * 1.4;
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
        const W = 280,
          H = 200,
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
          title: `Combien y a-t-il de <strong>${set.label}</strong> ?`,
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
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = generators;
  else Object.assign((root.AppGenerators = root.AppGenerators || {}), generators);
})(typeof window !== 'undefined' ? window : globalThis);
