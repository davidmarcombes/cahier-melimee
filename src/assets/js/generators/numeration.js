/**
 * Generators — Numération — valeur positionnelle, décomposition, écriture des nombres, chiffres romains, graduations.
 * Browser: registers into window.AppGenerators (needs generators/_core.js first) · Node: module.exports
 */
(function (root) {
  const { rand, randItem, shuffle, toRoman } =
    typeof module !== 'undefined' && module.exports ? require('./_core.js') : root.GenCore;

  // French number names, for read-aloud (spoken, never displayed: spelling details do not matter here)
  const UNITS = 'zéro un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize'.split(
    ' '
  );
  const TENS = { 2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante' };
  function sous100(n) {
    if (n <= 16) return UNITS[n];
    if (n < 20) return 'dix-' + UNITS[n - 10];
    const t = Math.floor(n / 10),
      u = n % 10;
    if (t === 7) return 'soixante' + (u === 1 ? ' et ' : '-') + sous100(10 + u); // 71 soixante et onze
    if (t === 8) return u ? 'quatre-vingt-' + UNITS[u] : 'quatre-vingts';
    if (t === 9) return 'quatre-vingt-' + sous100(10 + u);
    return TENS[t] + (u === 0 ? '' : u === 1 ? ' et un' : '-' + UNITS[u]);
  }
  function sous1000(n) {
    const c = Math.floor(n / 100),
      r = n % 100;
    if (!c) return sous100(r);
    const head = c === 1 ? 'cent' : UNITS[c] + (r ? ' cent' : ' cents');
    return r ? head + ' ' + sous100(r) : head;
  }
  // Whole number < 1 000 000 000, or a decimal string « 3,05 » (→ « trois virgule zéro cinq »)
  function nombreEnMots(x) {
    const [ent, dec] = String(x).replace('.', ',').split(',');
    let n = Number(ent);
    const parts = [];
    if (n === 0) parts.push('zéro');
    const m = Math.floor(n / 1e6),
      k = Math.floor(n / 1000) % 1000;
    n %= 1000;
    if (m) parts.push(m === 1 ? 'un million' : sous1000(m) + ' millions');
    if (k)
      parts.push(
        k === 1
          ? 'mille'
          : sous1000(k)
              .replace(/cents$/, 'cent')
              .replace(/vingts$/, 'vingt') + ' mille'
      );
    if (n) parts.push(sous1000(n));
    let words = parts.join(' ');
    if (dec) words += ' virgule ' + (dec.match(/^0+/)?.[0] || '').replace(/0/g, 'zéro ') + sous1000(Number(dec));
    return words;
  }
  function nombreAudio(x) {
    const [ent, dec] = String(x).replace('.', ',').split(',');
    let n = Number(ent);
    if (!Number.isInteger(n) || n < 0 || n > 999999999) return [];

    const segments = [];
    const millions = Math.floor(n / 1e6);
    const milliers = Math.floor(n / 1000) % 1000;
    const unites = n % 1000;

    if (millions) segments.push(`nombres/${millions}.ogg`, `unites/${millions === 1 ? 'million' : 'millions'}.ogg`);
    if (milliers === 1) segments.push('nombres/1000.ogg');
    else if (milliers) segments.push(`nombres/${milliers}.ogg`, 'unites/mille.ogg');
    if (unites || !segments.length) segments.push(`nombres/${unites}.ogg`);

    if (dec) {
      segments.push('unites/virgule.ogg');
      const leadingZeros = dec.match(/^0+/)?.[0].length ?? 0;
      for (let i = 0; i < leadingZeros; i++) segments.push('nombres/0.ogg');
      if (leadingZeros < dec.length) segments.push(`nombres/${Number(dec)}.ogg`);
    }
    return segments;
  }
  // Numbers that sound alike or are written alike: 16 / 60, 17 / 71, 72 / 62, 97 / 87, 13 / 30…
  function confusables(n, max) {
    const out = [];
    const s = String(n);
    if (s.length > 1) out.push(Number(s.split('').reverse().join(''))); // 17 ↔ 71
    const r = n % 100,
      base = n - r;
    if (r >= 70 && r < 80) out.push(base + r - 10); // soixante-douze ↔ 62
    if (r >= 90) out.push(base + r - 10); // quatre-vingt-dix-sept ↔ 87
    if (r >= 60 && r < 70) out.push(base + r + 10);
    if (r >= 80 && r < 90) out.push(base + r + 10);
    if (r >= 12 && r <= 16) out.push(base + (r - 10) * 10); // treize ↔ 30
    if (r % 10 === 0 && r >= 20 && r <= 60) out.push(base + 10 + r / 10);
    out.push(n + 10, n - 10, n + 1, n - 1, n * 10);
    return [...new Set(out)].filter((c) => c >= 1 && c <= max && c !== n);
  }
  // A number to hear: whole numbers in [min, max], about half of them « tricky » (11–16, 70–99 in the last hundred)
  function nombreADire(params) {
    const min = params.min ?? 1,
      max = params.max ?? 20;
    if (params.decimals) {
      const ent = rand(min, max),
        d = params.decimals;
      const dec =
        String(rand(1, 10 ** d - 1))
          .padStart(d, '0')
          .replace(/0+$/, '') || '5';
      return `${ent},${dec}`;
    }
    for (let t = 0; t < 30 && Math.random() < (params.tricky ?? 0.5); t++) {
      const n = rand(min, max);
      const r = n % 100;
      if ((r >= 11 && r <= 16) || r >= 70) return String(n);
    }
    return String(rand(min, max));
  }

  // Hundred board (tableau des nombres): texts and rules, checked word for word by scripts/lib/hundred-board.js
  const HB_ARROWS = { d: '↓', u: '↑', r: '→', l: '←' };
  const hbDigit = (n, p) => Math.floor(n / p) % 10;
  const HB_CLUES = {
    unites: {
      text: (v) => `Mon chiffre des unités est ${v}.`,
      holds: (v, n) => hbDigit(n, 1) === v,
      of: (t) => hbDigit(t, 1),
    },
    dizaines: {
      text: (v) => `Mon chiffre des dizaines est ${v}.`,
      holds: (v, n) => hbDigit(n, 10) === v,
      of: (t) => hbDigit(t, 10),
    },
    centaines: {
      text: (v) => `Mon chiffre des centaines est ${v}.`,
      holds: (v, n) => hbDigit(n, 100) === v,
      of: (t) => hbDigit(t, 100),
    },
    entre: {
      text: (v) => `Je suis entre ${v[0]} et ${v[1]}.`,
      holds: (v, n) => n > v[0] && n < v[1],
      of: (t) => {
        const a = t - rand(1, 6);
        return [a, a + rand(8, 12)].map((x, i) => (i ? Math.max(x, t + 1) : x));
      },
    },
    pair: { text: () => 'Je suis un nombre pair.', holds: (v, n) => n % 2 === 0, ok: (t) => t % 2 === 0 },
    impair: { text: () => 'Je suis un nombre impair.', holds: (v, n) => n % 2 === 1, ok: (t) => t % 2 === 1 },
    somme: {
      text: (v) => `Si on ajoute mes chiffres, on trouve ${v}.`,
      holds: (v, n) =>
        String(n)
          .split('')
          .reduce((s, d) => s + Number(d), 0) === v,
      of: (t) =>
        String(t)
          .split('')
          .reduce((s, d) => s + Number(d), 0),
    },
    apres: {
      text: (v) => `Je suis juste après ${v}.`,
      holds: (v, n) => n === v + 1,
      of: (t) => t - 1,
      col: (c) => c > 0,
    },
    avant: {
      text: (v) => `Je suis juste avant ${v}.`,
      holds: (v, n) => n === v - 1,
      of: (t) => t + 1,
      col: (c) => c < 9,
    },
    dessous: {
      text: (v) => `Je suis juste en dessous de ${v}.`,
      holds: (v, n) => n === v + 10,
      of: (t) => t - 10,
      row: (r) => r > 0,
    },
    dessus: {
      text: (v) => `Je suis juste au-dessus de ${v}.`,
      holds: (v, n) => n === v - 10,
      of: (t) => t + 10,
      row: (r, R) => r < R - 1,
    },
    plus: { text: (v) => `Je suis plus grand que ${v}.`, holds: (v, n) => n > v, of: (t) => t - rand(1, 9) },
    moins: { text: (v) => `Je suis plus petit que ${v}.`, holds: (v, n) => n < v, of: (t) => t + rand(1, 9) },
  };
  const HB_RULES = {
    unites: (r) => `Colorie tous les nombres dont le chiffre des unités est ${r.v}.`,
    dizaines: (r) => `Colorie tous les nombres dont le chiffre des dizaines est ${r.v}.`,
    pas: (r) =>
      `Colorie de ${r.step} en ${r.step} : ${r.from}, ${r.from + r.step}, ${r.from + 2 * r.step}… jusqu’à ${r.to}.`,
  };
  // Pieces of the board for « morceau » ([row, col] offsets from the centre)
  const HB_SHAPES = {
    croix: [
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ],
    ligne: [
      [0, -1],
      [0, 0],
      [0, 1],
      [0, 2],
    ],
    colonne: [
      [-1, 0],
      [0, 0],
      [1, 0],
      [2, 0],
    ],
    carre: [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
    L: [
      [-1, 0],
      [0, 0],
      [1, 0],
      [1, 1],
    ],
    T: [
      [0, -1],
      [0, 0],
      [0, 1],
      [1, 0],
    ],
    escalier: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    grandeCroix: [
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [1, 1],
    ],
    rectangle: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
  };

  const generators = {
    // tableauNombres: hundred-board — the tableau des nombres, rows of ten from `start` (1: 1…100,
    //   0: 0…99, 301: 301…400; a list: one at random), `rows` (10). mode:
    //   find, kind mystere — tap the number of the clues: `clues` is a list of clue sets to pick from
    //     (unites, dizaines, centaines, entre, pair, impair, somme, apres, avant, dessous, dessus, plus,
    //     moins), the set must point to one number only
    //   find, kind deplacements — from a number follow `steps` ([2, 4]) arrows among `moves` (['d', 'r']:
    //     ↓ +10, → +1; 'u' ↑, 'l' ←); `hide`: only the start number is written (and `landmarks`, e.g. [1, 100])
    //   fill, kind trous — `blanks` ([4, 6]) holes in the board to type
    //   fill, kind morceau — only a piece of the board is drawn (`shapes`: croix, ligne, colonne, carre,
    //     L, T, escalier, grandeCroix, rectangle), one number given (`given`: 1), the others to type
    //   color — `rules`: [{ k: 'unites' }, { k: 'dizaines' }, { k: 'pas', step: [2, 5], from: [1, 9] }], at most
    //     `maxCount` (12) numbers to colour (a pas rule stops there: « … jusqu’à 47 »)
    tableauNombres: {
      generate(params = {}) {
        const start = Array.isArray(params.start) ? randItem(params.start) : (params.start ?? 1);
        const rows = params.rows || 10;
        const last = start + rows * 10 - 1;
        const mode = params.mode || 'find';
        const kind = params.kind || { find: 'mystere', fill: 'trous', color: 'motif' }[mode];
        const pickN = (v, d) => (Array.isArray(v) ? rand(v[0], v[1]) : (v ?? d));
        const all = Array.from({ length: rows * 10 }, (_, i) => start + i);
        const at = (n) => [Math.floor((n - start) / 10), (n - start) % 10];
        const hb = { mode, start, rows };

        if (mode === 'find' && kind === 'deplacements') {
          const moves = params.moves || ['d', 'r'];
          const D = { d: [1, 0], u: [-1, 0], r: [0, 1], l: [0, -1] };
          for (let t = 0; t < 200; t++) {
            const from = randItem(all);
            let [r, c] = at(from);
            const path = [];
            const steps = pickN(params.steps, 3);
            for (let s = 0; s < steps; s++) {
              const ok = moves.filter((m) => {
                const [nr, nc] = [r + D[m][0], c + D[m][1]];
                return nr >= 0 && nr < rows && nc >= 0 && nc <= 9;
              });
              if (!ok.length) break;
              const m = randItem(ok);
              path.push(m);
              [r, c] = [r + D[m][0], c + D[m][1]];
            }
            const target = start + r * 10 + c;
            if (path.length !== steps || target === from) continue;
            // the arrows in board order (all ↓ then all →) read more easily for the youngest
            if (params.sorted) path.sort((a, b) => moves.indexOf(a) - moves.indexOf(b));
            Object.assign(hb, { target, from, path });
            hb.text = `Pars de ${from}. Suis les flèches : ${path.map((m) => HB_ARROWS[m]).join(' ')}`;
            if (params.hide) {
              hb.hide = true;
              hb.shown = [
                from,
                ...(params.landmarks || []).filter((n) => n !== target && n !== from && n >= start && n <= last),
              ];
            }
            return { type: 'hundred-board', ...(params.title && { title: params.title }), hb };
          }
        }

        if (mode === 'find') {
          const sets = params.clues || [['dizaines', 'unites']];
          for (let t = 0; t < 300; t++) {
            const target = randItem(all);
            const [r, c] = at(target);
            const set = randItem(sets);
            const clues = [];
            let ok = true;
            for (const k of set) {
              const C = HB_CLUES[k];
              if ((C.ok && !C.ok(target)) || (C.col && !C.col(c)) || (C.row && !C.row(r, rows))) ok = false;
              const v = C.of ? C.of(target) : undefined;
              if (!ok) break;
              if (Array.isArray(v) ? v[0] < 0 : typeof v === 'number' && v < 0) ok = false;
              const clue = v === undefined ? { k } : { k, v };
              clue.text = C.text(v);
              clues.push(clue);
            }
            if (!ok) continue;
            const fits = all.filter((n) => clues.every((cl) => HB_CLUES[cl.k].holds(cl.v, n)));
            if (fits.length !== 1) continue;
            Object.assign(hb, { target, clues });
            return { type: 'hundred-board', ...(params.title && { title: params.title }), hb };
          }
        }

        if (mode === 'fill' && kind === 'morceau') {
          const names = params.shapes || Object.keys(HB_SHAPES);
          for (let t = 0; t < 200; t++) {
            const shape = HB_SHAPES[randItem(names)];
            const [r0, c0] = at(randItem(all));
            const cells = shape.map(([dr, dc]) => [r0 + dr, c0 + dc]);
            if (cells.some(([r, c]) => r < 0 || r >= rows || c < 0 || c > 9)) continue;
            const nums = cells.map(([r, c]) => start + r * 10 + c).sort((a, b) => a - b);
            const given = shuffle([...nums]).slice(0, params.given || 1);
            hb.cells = nums;
            hb.blanks = nums.filter((n) => !given.includes(n));
            return { type: 'hundred-board', ...(params.title && { title: params.title }), hb };
          }
        }

        if (mode === 'fill') {
          const k = pickN(params.blanks, 5);
          hb.blanks = shuffle([...all])
            .slice(0, k)
            .sort((a, b) => a - b);
          return { type: 'hundred-board', ...(params.title && { title: params.title }), hb };
        }

        // color
        const rules = params.rules || [{ k: 'unites' }];
        const maxCount = params.maxCount || 12;
        for (let t = 0; t < 200; t++) {
          const spec = randItem(rules);
          let rule;
          if (spec.k === 'pas') {
            const step = pickN(spec.step, 5);
            const from = start + pickN(spec.from, step) - (start % 10 === 1 ? 1 : 0);
            if (from < start || from > last) continue;
            const to = Math.min(from + step * (maxCount - 1), from + step * Math.floor((last - from) / step));
            if ((to - from) / step + 1 < 3) continue;
            rule = { k: 'pas', from, step, to };
          } else rule = { k: spec.k, v: pickN(spec.v, rand(0, 9)) };
          const answer = all.filter((n) =>
            rule.k === 'pas'
              ? n >= rule.from && n <= rule.to && (n - rule.from) % rule.step === 0
              : hbDigit(n, rule.k === 'unites' ? 1 : 10) === rule.v
          );
          if (answer.length < 2 || answer.length > Math.max(maxCount, 10)) continue;
          Object.assign(hb, { rule, answer, text: HB_RULES[rule.k](rule) });
          return { type: 'hundred-board', ...(params.title && { title: params.title }), hb };
        }
        throw new Error('tableauNombres: no board for these params');
      },
    },

    // dicteeNombre: hear a number, write it in digits (voice exercise)
    // dicteeNombre: hear a number, write it in digits (voice exercise)
    // params: min (1), max (999999999), decimals (0), tricky (0.5 — share of 11–16 / 70–99)
    dicteeNombre: {
      generate: (params = {}) => {
        const x = nombreADire(params);
        return {
          type: 'number-check',
          title: 'Écris le nombre que tu entends.',
          say: nombreEnMots(x),
          voiceAudio: nombreAudio(x),
          voice: true,
          answers: [x],
        };
      },
    },

    // ecouteNombre: hear a number, tap it among numbers that sound or look alike (voice exercise)
    // params: min (1), max (100), choices (3), tricky (0.5)
    ecouteNombre: {
      generate: (params = {}) => {
        const max = params.max ?? 20;
        let n = Number(nombreADire(params));
        const excluded = Number(params.exclude);
        if (n === excluded && Number.isFinite(excluded) && (params.min ?? 1) < max) {
          const min = params.min ?? 1;
          const alternatives = Array.from({ length: max - min + 1 }, (_, i) => min + i).filter(
            (value) => value !== excluded
          );
          n = randItem(alternatives);
        }
        const near = confusables(n, max).slice(0, (params.choices ?? 3) - 1);
        for (let d = 2; near.length < (params.choices ?? 3) - 1; d++) if (n + d <= max) near.push(n + d);
        const choices = shuffle([n, ...near]).map(String);
        return {
          type: 'mcq',
          title: params.title ?? 'Clique sur le nombre que tu entends.',
          say: nombreEnMots(n),
          voiceAudio: nombreAudio(n),
          voice: true,
          mcqChoices: choices,
          mcqAnswer: choices.indexOf(String(n)),
          mcqCompact: true,
          answers: [String(n)],
        };
      },
    },

    decompositionBase10: {
      generate: (params = {}) => {
        const t = rand(params.minTens ?? 1, params.maxTens ?? 9);
        const u = rand(params.minOnes ?? 0, params.maxOnes ?? 9);

        const op =
          u === 0
            ? `${t}__dizaine${t > 1 ? 's' : ''} 0__unité__=__?`
            : `${t}__dizaine${t > 1 ? 's' : ''} ${u}__unité${u > 1 ? 's' : ''}__=__?`;

        return { type: 'number-check', operation: op, answers: [String(t * 10 + u)] };
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
          ruler: {
            min,
            max,
            divisions,
            subdivisions,
            markers: [{ label, value }],
            ...(params.labelDivisions && { labelDivisions: true }),
          },
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
        return {
          type: 'number-check',
          operation: `${parts.join(' et ')} = ?`,
          answers: [String(h * 100 + t * 10 + u)],
        };
      },
    },

    ajouterPositionnel: {
      generate: (params = {}) => {
        const PV = {
          unités: { factor: 1, singular: 'unité', plural: 'unités' },
          dizaines: { factor: 10, singular: 'dizaine', plural: 'dizaines' },
          centaines: { factor: 100, singular: 'centaine', plural: 'centaines' },
          milliers: { factor: 1000, singular: 'millier', plural: 'milliers' },
          'dizaines de milliers': { factor: 10000, singular: 'dizaine de milliers', plural: 'dizaines de milliers' },
        };
        const fmtNum = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
        const pvChoices = params.pvChoices ?? ['unités', 'dizaines'];
        const minCoef = params.minCoef ?? 1;
        const maxCoef = params.maxCoef ?? 9;
        const minBase = params.minBase ?? 10;
        const maxBase = params.maxBase ?? 999;
        const pv = pvChoices[rand(0, pvChoices.length - 1)];
        const { factor, singular, plural } = PV[pv];
        const coef = rand(minCoef, maxCoef);
        const base = rand(minBase, maxBase);
        const result = base + coef * factor;
        const pvLabel = coef === 1 ? singular : plural;
        return {
          type: 'number-check',
          operation: fmtNum(base) + ' + ' + coef + '\u00a0' + pvLabel,
          answers: [String(result)],
        };
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
        const rows = [pvSlice.map((_, i) => ({ blank: true, idx: i, answer: String(digits[i]) }))];

        return {
          type: 'fill-table',
          title: 'Remplis le tableau de numération.',
          svg: { gen: 'decompoChipsHtml', par: { chips } },
          table: { blankCount: numD, headers: pvSlice.map(({ label }) => label), rows },
        };
      },
    },

    // fill-table + decompoChipsHtml (with comma): decimal place-value table
    // params: minInt (10), maxInt (99) — integer part range
    decompoTableauDecimal: {
      generate(params = {}) {
        const minInt = params.minInt ?? 10;
        const maxInt = params.maxInt ?? 99;
        const intPart = rand(minInt, maxInt);
        const tenths = rand(0, 9);
        const hundredths = rand(1, 9); // always non-zero so number has 2 decimal places

        const hundreds = Math.floor(intPart / 100);
        const tens = Math.floor((intPart % 100) / 10);
        const units = intPart % 10;

        const chips = [
          { label: '100', value: hundreds },
          { label: '10', value: tens },
          { label: '1', value: units },
          { comma: true },
          { label: '1/10', value: tenths },
          { label: '1/100', value: hundredths },
        ];

        const headers = ['100', '10', '1', '', '1/10', '1/100'];
        const rows = [
          [
            { blank: true, idx: 0, answer: String(hundreds) },
            { blank: true, idx: 1, answer: String(tens) },
            { blank: true, idx: 2, answer: String(units) },
            { blank: false, value: ',' },
            { blank: true, idx: 3, answer: String(tenths) },
            { blank: true, idx: 4, answer: String(hundredths) },
          ],
        ];

        return {
          type: 'fill-table',
          title: 'Remplis le tableau de numération.',
          svg: { gen: 'decompoChipsHtml', par: { chips } },
          table: { blankCount: 5, headers, rows, inputClass: 'w-10' },
        };
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
          mcqChoices: options,
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

    // multiDecimalPuissance10: decimal number × power of 10, find the result
    // e.g. "6,475 × 100 = ?" → "647,5"
    // params: powers ([10,100,1000]), minDec (1), maxDec (2), minInt (0), maxInt (9)
    multiDecimalPuissance10: {
      generate(params = {}) {
        const powers = params.powers ?? [10, 100];
        const minDec = params.minDec ?? 1;
        const maxDec = params.maxDec ?? 2;
        const minInt = params.minInt ?? 0;
        const maxInt = params.maxInt ?? 9;

        const power = randItem(powers);
        const dec = rand(minDec, maxDec);
        const intPt = rand(minInt, maxInt);

        // Build decimal digits: first digit 1-9 to avoid leading zeros in fraction
        const fracDigits = [rand(1, 9), ...Array.from({ length: dec - 1 }, () => rand(0, 9))];
        const numStr = `${intPt},${fracDigits.join('')}`;

        // Compute result precisely using integer arithmetic (avoid float noise)
        const allDigits = String(intPt) + fracDigits.join('');
        const newIntLen = String(intPt).length + Math.log10(power);
        let resultStr;
        if (newIntLen >= allDigits.length) {
          // Result is integer — pad with zeros on the right
          resultStr = String(parseInt(allDigits.padEnd(newIntLen, '0'), 10));
        } else {
          const intPart = String(parseInt(allDigits.slice(0, newIntLen), 10));
          const decPart = allDigits.slice(newIntLen).replace(/0+$/, ''); // strip trailing zeros
          resultStr = decPart ? `${intPart},${decPart}` : intPart;
        }

        return {
          type: 'number-check',
          title: 'Effectue la multiplication.',
          operation: `${numStr} \u00d7 ${power} = ?`,
          answers: [resultStr],
        };
      },
    },

    // chiffrePlaceValeur: show a number, ask for the digit at a given place
    // params: maxNum (999), places (array of 0-based position indices, 0=unités)
    chiffrePlaceValeur: {
      generate(params = {}) {
        const NAMES = ['unités', 'dizaines', 'centaines', 'milliers', 'dizaines de milliers', 'centaines de milliers'];
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

    decimalTriple: {
      generate(params = {}) {
        const dp = params.decPlaces ?? rand(1, params.maxDec ?? 3);
        const scale = Math.pow(10, dp);
        const minInt = params.minInt ?? 0;
        const maxInt = params.maxInt ?? 9;
        const intPart = rand(minInt, maxInt);

        // Ensure last decimal digit is non-zero (no trailing zeros in decimal part)
        let decDigits;
        do {
          decDigits = rand(1, scale - 1);
        } while (decDigits % 10 === 0);

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

    // mcqDecimaux: easy MCQ about decimal numbers (CM1)
    // Question types: 'fraction-to-decimal', 'digit-position', 'compare'
    // params: types (array of question types to randomly pick from)
    mcqDecimaux: {
      generate(params = {}) {
        const qTypes = params.types ?? ['fraction-to-decimal', 'digit-position', 'compare'];
        const qType = randItem(qTypes);

        // Helper: stacked fraction HTML
        const FR = (n, d) =>
          `<span class="frac" style="font-size:1.4em;vertical-align:middle;font-weight:bold">` +
          `<span class="fn">${n}</span><span class="fd">${d}</span></span>`;

        // Helper: build 4-choice MCQ (correct + 3 unique wrong)
        const mkMCQ = (correct, wrongs) => {
          const pool = [...new Set(wrongs.map(String).filter((w) => w !== String(correct)))];
          // Pad with numbers not already shown (a second « 5 » button was refused as a wrong answer)
          while (pool.length < 3) {
            const w = String(rand(1, 20));
            if (w !== String(correct) && !pool.includes(w)) pool.push(w);
          }
          const choices = shuffle([String(correct), ...pool.slice(0, 3)]);
          return { choices, answer: choices.indexOf(String(correct)) };
        };

        // ── 1. FRACTION → DECIMAL ──────────────────────────────────────────────
        if (qType === 'fraction-to-decimal') {
          const denom = randItem([10, 100]);
          const num = denom === 10 ? rand(1, 9) : rand(1, 99);
          const val = num / denom;
          const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(denom === 10 ? 1 : 2).replace('.', ','));
          const correct = fmt(val);
          const wrongs = [
            String(num), // forget decimal (most common mistake)
            fmt(val * 10), // × 10 shift error
            fmt(val / 10), // ÷ 10 shift error
          ];
          const { choices, answer } = mkMCQ(correct, wrongs);
          return {
            type: 'mcq',
            title: `\u00c9cris ${FR(num, denom)} sous forme d\u00e9cimale.`,
            mcqChoices: choices,
            mcqAnswer: answer,
            mcqCompact: true,
          };
        }

        // ── 2. DIGIT POSITION ──────────────────────────────────────────────────
        if (qType === 'digit-position') {
          const intPt = rand(1, 9);
          const dix = rand(1, 9);
          const cent = rand(1, 9);
          const numStr = `${intPt},${dix}${cent}`;
          const place = randItem(['dixi\u00e8mes', 'centi\u00e8mes']);
          const correct = String(place === 'dixi\u00e8mes' ? dix : cent);
          const wrongs = [String(intPt), String(dix), String(cent), String(dix * 10 + cent)];
          const { choices, answer } = mkMCQ(
            correct,
            wrongs.filter((w) => w !== correct)
          );
          return {
            type: 'mcq',
            title: `Dans <strong>${numStr}</strong>, quel est le chiffre des ${place}\u00a0?`,
            mcqChoices: choices,
            mcqAnswer: answer,
            mcqCompact: true,
          };
        }

        // ── 3. COMPARE — pick the greatest or smallest ─────────────────────────
        {
          const isGreatest = Math.random() < 0.5;
          // Generate 4 distinct decimals with 1 decimal place
          const vals = shuffle(Array.from({ length: 19 }, (_, i) => (i + 1) * 0.1))
            .slice(0, 4)
            .map((v) => v.toFixed(1).replace('.', ','));
          const numVals = vals.map((v) => parseFloat(v.replace(',', '.')));
          const target = isGreatest ? Math.max(...numVals) : Math.min(...numVals);
          const correct = target.toFixed(1).replace('.', ',');
          const { choices, answer } = mkMCQ(
            correct,
            vals.filter((v) => v !== correct)
          );
          return {
            type: 'mcq',
            title: `Quel est le <strong>${isGreatest ? 'plus grand' : 'plus petit'}</strong> de ces nombres\u00a0?`,
            mcqChoices: choices,
            mcqAnswer: answer,
            mcqCompact: true,
          };
        }
      },
    },

    // convertirValeurPos: place-value conversion — e.g. "8 centaines = ? dizaines"
    // params: types (array of pair codes), maxBig (9)
    // Pair codes: 'h-t' centaines↔dizaines, 't-u' dizaines↔unités, 'h-u' centaines↔unités,
    //             'u-d' unités↔dixièmes, 'd-c' dixièmes↔centièmes
    convertirValeurPos: {
      generate(params = {}) {
        const PV = {
          h: { plural: 'centaines', value: 100 },
          t: { plural: 'dizaines', value: 10 },
          u: { plural: 'unités', value: 1 },
          d: { plural: 'dixièmes', value: 0.1 },
          c: { plural: 'centièmes', value: 0.01 },
        };
        const allTypes = params.types || ['h-t'];
        const code = randItem(allTypes);
        const [bigCode, smallCode] = code.split('-');
        const big = PV[bigCode];
        const small = PV[smallCode];
        const ratio = Math.round(big.value / small.value);
        const maxBig = params.maxBig ?? 9;
        const bigCount = rand(2, maxBig);
        const smallCount = bigCount * ratio;

        // Randomly put ? on the big or small side
        const questionBig = Math.random() < 0.5;
        const operation = questionBig
          ? `? ${big.plural} = ${smallCount} ${small.plural}`
          : `${bigCount} ${big.plural} = ? ${small.plural}`;
        return {
          type: 'number-check',
          title: 'Convertis.',
          operation,
          answers: [String(questionBig ? bigCount : smallCount)],
        };
      },
    },

    // decomp: additive place-value decomposition — one box per digit of maxVal: dizaines, unités (CP,
    //   10–99) · centaines, dizaines, unités (CE2) · up to centaines de mille (CM2, written 345 678)
    // params: minVal (100), maxVal (999)
    decompoAdditif: {
      generate(params = {}) {
        const min = params.minVal ?? 100;
        const max = params.maxVal ?? 999;
        const num = rand(min, max);
        const PLACES = [
          'unités',
          'dizaines',
          'centaines',
          'unités de mille',
          'dizaines de mille',
          'centaines de mille',
        ];
        const n = String(max).length;
        const digits = String(num).padStart(n, '0');
        return {
          type: 'decomp',
          title: 'Décompose ce nombre.',
          decomp: {
            number: num >= 10000 ? String(num).replace(/\B(?=(\d{3})+$)/g, '\u00a0') : String(num),
            parts: [...digits].map((d, i) => ({ label: PLACES[n - 1 - i], answer: d, inputIdx: i })),
          },
        };
      },
    },

    // decomp: additive decomposition with decimals — dizaines, unités, dixièmes, centièmes (CM1), and
    //   millièmes with decimals: 3 (CM2)
    // params: minInt (10), maxInt (99), decimals (2 | 3)
    decompoAdditifDecimal: {
      generate(params = {}) {
        const minInt = params.minInt ?? 10;
        const maxInt = params.maxInt ?? 99;
        const intPart = rand(minInt, maxInt);
        const dixiemes = rand(1, 9);
        const centiemes = rand(1, 9);
        const dizaines = Math.floor(intPart / 10);
        const unites = intPart % 10;
        const milliemes = params.decimals === 3 ? rand(1, 9) : null;
        const numStr = `${intPart},${dixiemes}${centiemes}${milliemes ?? ''}`;
        return {
          type: 'decomp',
          title: 'Décompose ce nombre décimal.',
          decomp: {
            number: numStr,
            parts: [
              { label: 'dizaines', answer: String(dizaines), inputIdx: 0 },
              { label: 'unités', answer: String(unites), inputIdx: 1 },
              { comma: true },
              { label: 'dixièmes', answer: String(dixiemes), inputIdx: 2 },
              { label: 'centièmes', answer: String(centiemes), inputIdx: 3 },
              ...(milliemes === null ? [] : [{ label: 'millièmes', answer: String(milliemes), inputIdx: 4 }]),
            ],
          },
        };
      },
    },

    // nombreChiffresSelect: tile-select — pick numbers (written in words) that have exactly N digits
    // params: digits (2|3|4|'mix'), count (5), tileCount (5)
    nombreChiffresSelect: {
      generate(params = {}) {
        const digitTarget = params.digits === 'mix' || !params.digits ? randItem([2, 3, 4]) : Number(params.digits);
        const tileCount = params.tileCount ?? 5;

        // French number-to-words (1–99 999, school-appropriate)
        const UNITS = [
          '',
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
        ];
        const TENS = [
          '',
          '',
          'vingt',
          'trente',
          'quarante',
          'cinquante',
          'soixante',
          'soixante',
          'quatre-vingt',
          'quatre-vingt',
        ];

        function tensWords(n) {
          if (n < 20) return UNITS[n];
          const t = Math.floor(n / 10);
          const u = n % 10;
          if (t === 7) {
            // 70–79: soixante + 10…19
            const sub = u + 10;
            return 'soixante' + (sub === 11 ? ' et onze' : sub < 20 ? '-' + UNITS[sub] : '-dix-neuf');
          }
          if (t === 8) {
            // 80–89: quatre-vingts
            return u === 0 ? 'quatre-vingts' : 'quatre-vingt-' + UNITS[u];
          }
          if (t === 9) {
            // 90–99: quatre-vingt + 10…19
            const sub = u + 10;
            return 'quatre-vingt-' + UNITS[sub];
          }
          return TENS[t] + (u === 1 && t !== 8 ? ' et un' : u ? '-' + UNITS[u] : '');
        }

        function toWords(n) {
          if (n === 0) return 'zéro';
          const parts = [];
          if (n >= 1000) {
            // The thousands as one block (83 063 → quatre-vingt-trois mille …); « vingt » stays
            // invariable before « mille » (quatre-vingt mille)
            const mill = Math.floor(n / 1000);
            parts.push(mill === 1 ? 'mille' : tensWords(mill).replace(/vingts$/, 'vingt') + ' mille');
            n %= 1000;
          }
          if (n >= 100) {
            const cent = Math.floor(n / 100);
            const rest = n % 100;
            if (cent === 1) parts.push(rest ? 'cent' : 'cent');
            else parts.push(rest ? tensWords(cent) + ' cent' : tensWords(cent) + ' cents');
            n = rest;
          }
          if (n > 0) parts.push(tensWords(n));
          return parts.join(' ');
        }

        // Generate candidate numbers per digit count
        const ranges = {
          2: () => rand(10, 99),
          3: () => rand(100, 999),
          4: () => rand(1000, 9999),
          5: () => rand(10000, 99999),
        };

        // We want tileCount tiles; ~2-3 correct, rest distractors
        const correctCount = rand(2, Math.min(3, tileCount - 2));
        const wrongCount = tileCount - correctCount;

        // Distractor digit counts (always different from target)
        const distractorDigits = [2, 3, 4, 5].filter((d) => d !== digitTarget);

        const seen = new Set();
        const pick = (d) => {
          let n,
            attempts = 0;
          do {
            n = ranges[d]();
            attempts++;
          } while (seen.has(n) && attempts < 50);
          seen.add(n);
          return n;
        };

        const corrects = Array.from({ length: correctCount }, () => pick(digitTarget));
        const wrongs = Array.from({ length: wrongCount }, () => pick(randItem(distractorDigits)));

        const pool = shuffle([...corrects.map((n) => ({ n, ok: true })), ...wrongs.map((n) => ({ n, ok: false }))]);

        const tiles = pool.map(({ n }) => toWords(n));
        const tileAnswers = pool.map(({ ok }, i) => (ok ? i : -1)).filter((i) => i !== -1);

        const digitLabels = { 2: 'deux', 3: 'trois', 4: 'quatre', 5: 'cinq' };
        const title = `Lesquels s'écrivent avec ${digitLabels[digitTarget]} chiffres ?`;

        return { type: 'tile-select', title, tiles, tileAnswers };
      },
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = generators;
  else Object.assign((root.AppGenerators = root.AppGenerators || {}), generators);
})(typeof window !== 'undefined' ? window : globalThis);
