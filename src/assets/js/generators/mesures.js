/**
 * Generators — Grandeurs et mesures — heure, durées, unités, lecture de tableaux, périmètres.
 * Browser: registers into window.AppGenerators (needs generators/_core.js first) · Node: module.exports
 */
(function (root) {
  const { rand, randItem, shuffle, TABLE_THEMES, tableHtml, tableValues } =
    typeof module !== 'undefined' && module.exports ? require('./_core.js') : root.GenCore;

  const generators = {
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
        const chosen = indices.slice(0, pairCount).map((idx) => ({
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
            right: rightOrder.map((ri) => labels[ri]),
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

    // unitesMesure: pick a random object, show its measurement, ask for the unit
    // params: units — array subset of ['mm','cm','m','km'] shown as tile choices
    unitesMesure: {
      generate(params = {}) {
        const units = params.units ?? ['cm', 'm'];

        const pool = {
          mm: [
            { emoji: '🐜', value: 5, label: 'La fourmi mesure' },
            { emoji: '🐞', value: 8, label: 'La coccinelle mesure' },
            { emoji: '🐝', value: 15, label: "L'abeille mesure" },
            { emoji: '🐛', value: 18, label: 'La chenille mesure' },
            { emoji: '🪙', value: 24, label: 'La pièce de monnaie mesure' },
            { emoji: '🦟', value: 6, label: 'Le moustique mesure' },
          ],
          cm: [
            { emoji: '✏️', value: 19, label: 'Le crayon mesure' },
            { emoji: '🥕', value: 20, label: 'La carotte mesure' },
            { emoji: '🐟', value: 8, label: 'Le petit poisson mesure' },
            { emoji: '🦷', value: 3, label: 'La dent mesure' },
            { emoji: '📱', value: 15, label: 'Le téléphone mesure' },
            { emoji: '🍌', value: 20, label: 'La banane mesure' },
            { emoji: '🥾', value: 25, label: 'La chaussure mesure' },
            { emoji: '🖊️', value: 15, label: 'Le stylo mesure' },
            { emoji: '🥄', value: 18, label: 'La cuillère mesure' },
            { emoji: '🍎', value: 8, label: 'La pomme mesure' },
          ],
          m: [
            { emoji: '🚗', value: 4, label: 'La voiture mesure' },
            { emoji: '🚪', value: 2, label: 'La porte mesure' },
            { emoji: '🛏️', value: 2, label: 'Le lit mesure' },
            { emoji: '🐘', value: 3, label: "L'éléphant mesure" },
            { emoji: '🦒', value: 6, label: 'La girafe mesure' },
            { emoji: '🌲', value: 10, label: 'Le sapin mesure' },
            { emoji: '🚌', value: 12, label: 'Le bus mesure' },
            { emoji: '🏊', value: 25, label: 'La piscine mesure' },
          ],
          km: [
            { emoji: '🏔️', value: 5, label: 'La montagne mesure' },
            { emoji: '🌋', value: 3, label: 'Le volcan mesure' },
            { emoji: '✈️', value: 900, label: 'Le trajet Paris-Marseille mesure' },
            { emoji: '🚂', value: 500, label: 'Le trajet en train mesure' },
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

    // classerTableau: sort — a table of named quantities (prices, distances, durations), rank the names
    // params: theme ('prix'|'distances'|'durees'), count (6), direction ('desc'|'asc'|'mixed'),
    //   min / max in base units (cents, metres, minutes) — narrow ranges make values closer and harder,
    //   mixedUnits (false) — distances in km or m, durations in "h min" or "min" (conversion needed)
    classerTableau: {
      generate(params = {}) {
        const nb = (n, d = 3) => n.toLocaleString('fr-FR', { maximumFractionDigits: d });
        const coin = () => Math.random() < 0.5;
        const THEMES = {
          prix: {
            head: ['Fruit ou légume', 'Prix au kilogramme'],
            what: 'ces fruits et légumes',
            words: ['plus cher', 'moins cher'],
            names: [
              'Abricot',
              'Banane',
              'Cerise',
              'Citron',
              'Fraise',
              'Pastèque',
              'Pêche',
              'Poire',
              'Kiwi',
              'Tomate',
              'Carotte',
              'Courgette',
            ],
            min: 80,
            max: 999,
            step: 1,
            fmt: (c) => `${(c / 100).toFixed(2).replace('.', ',')} €`,
          },
          distances: {
            head: ['Enfant', 'Distance parcourue'],
            what: 'ces enfants selon la distance parcourue,',
            words: ['plus loin', 'moins loin'],
            names: ['Léa', 'Tom', 'Inès', 'Hugo', 'Nora', 'Sami', 'Jade', 'Malo', 'Chloé', 'Yanis'],
            min: 800,
            max: 9900,
            step: 10,
            fmt: (m, mixed) => (mixed && coin() ? `${nb(m)} m` : `${nb(m / 1000)} km`),
          },
          durees: {
            head: ['Film', 'Durée'],
            what: 'ces films',
            words: ['plus long', 'plus court'],
            names: [
              'Le Dragon bleu',
              'Mission Lune',
              'La Forêt secrète',
              'Robo-chat',
              'Les Pirates du lac',
              "L'Île aux fées",
              'Super Zèbre',
              'Le Grand Voyage',
            ],
            min: 45,
            max: 190,
            step: 1,
            fmt: (t, mixed) =>
              (mixed && coin()) || t < 60
                ? `${t} min`
                : `${Math.floor(t / 60)} h ${String(t % 60).padStart(2, '0')} min`,
          },
        };
        const th = THEMES[params.theme] ?? THEMES.prix;
        const count = Math.min(params.count ?? 6, th.names.length);
        const desc = params.direction === 'asc' ? false : params.direction === 'mixed' ? coin() : true;
        const lo = Math.ceil((params.min ?? th.min) / th.step);
        const hi = Math.floor((params.max ?? th.max) / th.step);

        // Distinct values (bounded retries, then a deterministic fallback)
        const vals = new Set();
        for (let g = 0; vals.size < count && g < 500; g++) vals.add(rand(lo, hi) * th.step);
        for (let k = lo; vals.size < count; k++) vals.add(k * th.step);

        const rows = shuffle(th.names)
          .slice(0, count)
          .map((name, i) => ({ name, v: [...vals][i] }));
        const ordered = [...rows].sort((a, b) => (desc ? b.v - a.v : a.v - b.v));
        const words = desc ? th.words : [...th.words].reverse();
        return {
          type: 'sort',
          title: `Classe ${th.what} du ${words[0]} au ${words[1]}.`,
          body: tableHtml(
            { rowLabel: th.head[0], valueLabel: th.head[1] },
            rows.map((r) => ({ label: r.name, value: th.fmt(r.v, params.mixedUnits) }))
          ),
          items: ordered.map((r) => r.name),
          direction: desc ? 'desc' : 'asc',
          sortKeepOrder: true,
          sortLabels: [`le ${words[0]}`, `le ${words[1]}`],
        };
      },
    },

    // lireTableauTile: read a data table, answer "le plus" / "le moins" with tile-select
    // params: theme ('scores'|'animaux'|'temperatures'|'livres'), question ('max'|'min'|'mix'), rows (5)
    lireTableauTile: {
      generate(params = {}) {
        const themeKey = params.theme ?? randItem(Object.keys(TABLE_THEMES));
        const theme = TABLE_THEMES[themeKey] || TABLE_THEMES.scores;
        const question =
          params.question === 'min' ? 'min' : params.question === 'max' ? 'max' : randItem(['max', 'min']);
        const rowCount = Math.min(params.rows ?? 5, theme.labels.length);
        const labels = shuffle([...theme.labels]).slice(0, rowCount);
        const values = tableValues(theme.minV, theme.maxV, rowCount);
        const data = labels.map((label, i) => ({ label, value: values[i] }));
        const target = question === 'max' ? Math.max(...values) : Math.min(...values);
        const correct = data.find((d) => d.value === target).label;
        const tiles = shuffle([...labels]);
        return {
          type: 'tile-select',
          title: question === 'max' ? theme.qMax : theme.qMin,
          body: tableHtml(theme, data),
          tiles,
          tileAnswers: [tiles.indexOf(correct)],
        };
      },
    },

    // lireTableauNombre: read a data table, answer a numeric question (total or value lookup)
    // params: theme, question ('total'|'lookup'|'mix'), rows (5)
    lireTableauNombre: {
      generate(params = {}) {
        const themeKey = params.theme ?? randItem(Object.keys(TABLE_THEMES));
        const theme = TABLE_THEMES[themeKey] || TABLE_THEMES.scores;
        const question =
          params.question === 'total'
            ? 'total'
            : params.question === 'lookup'
              ? 'lookup'
              : randItem(['total', 'lookup']);
        const rowCount = Math.min(params.rows ?? 5, theme.labels.length);
        const labels = shuffle([...theme.labels]).slice(0, rowCount);
        const values = tableValues(theme.minV, theme.maxV, rowCount);
        const data = labels.map((label, i) => ({ label, value: values[i] }));
        let title, answer;
        if (question === 'total') {
          title = theme.qTotal;
          answer = values.reduce((s, v) => s + v, 0);
        } else {
          const pick = randItem(data);
          title = theme.qLookup(pick.label);
          answer = pick.value;
        }
        return {
          type: 'number-check',
          title,
          body: tableHtml(theme, data),
          answers: [String(answer)],
        };
      },
    },

    // suitesHoraires: time sequence exercises with interleaved blanks
    // params: interval (minutes: 60|30|15), blanks (1|2), length (4|5)
    // Answer format: "Xh00" (e.g. "11h45") — normalizeAnswer strips spaces so user can type "11 h 45"
    suitesHoraires: {
      generate(params = {}) {
        const interval = params.interval ?? 60;
        const blanks = params.blanks ?? 1;
        const length = params.length ?? 4;

        // Random start, snapped to interval, within 7h00–19h00
        const minStart = 7 * 60;
        const maxStart = 19 * 60 - interval * (length - 1);
        const rawStart = rand(minStart, maxStart);
        const start = Math.round(rawStart / interval) * interval;

        const fmt = (totalMins) => {
          const h = Math.floor(totalMins / 60) % 24;
          const m = totalMins % 60;
          return `${h}h${m.toString().padStart(2, '0')}`;
        };

        const times = Array.from({ length }, (_, i) => fmt(start + i * interval));

        // Choose blank positions (not first, not last, non-adjacent if blanks>1)
        const inner = Array.from({ length: length - 2 }, (_, i) => i + 1);
        const blankPos = shuffle(inner).slice(0, blanks);

        let inputIdx = 0;
        const items = times.map((t, i) =>
          blankPos.includes(i) ? { blank: true, answer: t, inputIdx: inputIdx++ } : { value: t }
        );

        return {
          type: 'sequence',
          sequence: { items, timeMode: true },
        };
      },
    },

    // convertirMesure: « 3,5 kg = ? g », « 750 mL = ? L » (CM1–CM2) — exact, string arithmetic.
    // params: family ('masses' | 'contenances' | 'longueurs'), units (subset of the family),
    //         decimals (false — true: 1–2 decimals in the given value), maxDigits (6, answer size)
    convertirMesure: {
      generate(params = {}) {
        // exponent of each unit in the family's smallest unit
        const FAMILIES = {
          masses: { t: 9, kg: 6, hg: 5, dag: 4, g: 3, dg: 2, cg: 1, mg: 0 },
          contenances: { hL: 5, daL: 4, L: 3, dL: 2, cL: 1, mL: 0 },
          longueurs: { km: 6, hm: 5, dam: 4, m: 3, dm: 2, cm: 1, mm: 0 },
        };
        const DEFAULT_UNITS = {
          masses: ['t', 'kg', 'g', 'mg'],
          contenances: ['L', 'dL', 'cL', 'mL'],
          longueurs: ['km', 'm', 'cm', 'mm'],
        };
        const family = params.family ?? 'masses';
        const E = FAMILIES[family];
        const units = params.units ?? DEFAULT_UNITS[family];
        const maxDigits = params.maxDigits ?? 6;
        // integer m shifted by 10^s → « 3,5 » / « 3500 » (trailing zeros dropped, French comma)
        const fmt = (m, s) => {
          if (s >= 0) return String(m) + '0'.repeat(s);
          const str = String(m).padStart(-s + 1, '0');
          return `${str.slice(0, s)},${str.slice(s)}`.replace(/0+$/, '').replace(/,$/, '');
        };
        const decimalsOf = (str) => (str.split(',')[1] || '').length;
        let from, to, given, answer;
        for (let tries = 0; tries < 200; tries++) {
          [from, to] = shuffle([...units]).slice(0, 2);
          const k = params.decimals ? rand(1, 2) : 0; // decimals of the given value
          const m = rand(1, 999);
          if (k && m % 10 === 0) continue;
          given = fmt(m, -k);
          answer = fmt(m, E[from] - E[to] - k);
          const intPart = answer.split(',')[0];
          if (decimalsOf(answer) <= 3 && intPart.length <= maxDigits && (k === 0 || given.includes(','))) break;
        }
        // « 1__250 »: __ keeps a number and its unit on one unbreakable line
        const group = (s) => {
          const [i, d] = s.split(',');
          const gi = i.length >= 5 ? i.replace(/\B(?=(\d{3})+$)/g, '__') : i;
          return d ? `${gi},${d}` : gi;
        };
        return {
          type: 'number-check',
          operation: `${group(given)}__${from}__=__?__${to}`,
          answers: [answer],
        };
      },
    },

    // porteMonnaie: count a wallet drawn with moneySvg — euros first, then centimes, then the total
    // (centimes ≥ 100 make an extra euro: 1 € 20 c of small coins + 18 € = 19 € 20 c).
    // params: notes ([500, 1000, 2000, 5000] cents), minNotes (1), maxNotes (2),
    //         euroCoins ([100, 200]), maxEuroCoins (2), cents ([5, 10, 20, 50]), minCents (2), maxCents (4),
    //         carryRate (0.4 — share of wallets whose centimes reach 1 € or more)
    porteMonnaie: {
      generate(params = {}) {
        const notes = params.notes ?? [500, 1000, 2000, 5000];
        const euroCoins = params.euroCoins ?? [100, 200];
        const cents = params.cents ?? [5, 10, 20, 50];
        const pick = (pool, n) => Array.from({ length: n }, () => randItem(pool));
        const sum = (a) => a.reduce((s, v) => s + v, 0);
        const wantCarry = Math.random() < (params.carryRate ?? 0.4);

        let items, euros, centimes;
        for (let tries = 0; tries < 50; tries++) {
          const big = [
            ...pick(notes, rand(params.minNotes ?? 1, params.maxNotes ?? 2)),
            ...pick(euroCoins, rand(0, params.maxEuroCoins ?? 2)),
          ];
          const small = pick(cents, rand(params.minCents ?? 2, params.maxCents ?? 4));
          items = [...big, ...small];
          euros = sum(big) / 100;
          centimes = sum(small);
          if (centimes >= 100 === wantCarry) break;
        }
        const total = euros * 100 + centimes;

        return {
          type: 'multi-question',
          mqSequential: true,
          svg: { gen: 'moneySvg', par: { items } },
          mqQuestions: [
            { text: 'Les billets et les pièces en euros font… (en €)', answer: String(euros) },
            { text: 'Les pièces en centimes font… (en c)', answer: String(centimes) },
            { text: 'Somme totale : combien d’euros ?', answer: String(Math.floor(total / 100)) },
            { text: '… et combien de centimes ?', answer: String(total % 100) },
          ],
        };
      },
    },

    // rendreMonnaie: « Léa a acheté une trousse pour 8 € 20 c. Elle paye avec un billet de 10 €. »
    // → Monnaie rendue : ? € ? c (note drawn with moneySvg). Prices never end in 0 c, so the
    // change always needs the two jumps: to the next euro, then to the note.
    // params: notes ([500, 1000, 2000, 5000] cents), step (5 — price granularity in cents),
    //         smallestNote (0.7 — share paid with the smallest note that covers the price)
    rendreMonnaie: {
      generate(params = {}) {
        const NAMES = [
          ['Léa', 'Elle'],
          ['Inès', 'Elle'],
          ['Nora', 'Elle'],
          ['Jade', 'Elle'],
          ['Chloé', 'Elle'],
          ['Lina', 'Elle'],
          ['Tom', 'Il'],
          ['Hugo', 'Il'],
          ['Sami', 'Il'],
          ['Malo', 'Il'],
          ['Yanis', 'Il'],
          ['Noé', 'Il'],
        ];
        // [article + item, min price, max price] in cents
        const ITEMS = [
          ['un cahier', 150, 450],
          ['une gomme', 80, 300],
          ['une trousse', 350, 1200],
          ['un livre de contes', 450, 1800],
          ['une bande dessinée', 900, 1600],
          ['un jeu de cartes', 250, 900],
          ['une boîte de feutres', 300, 1400],
          ['une gourde', 500, 1500],
          ['une casquette', 800, 2200],
          ['un ballon', 600, 2500],
          ['un puzzle', 700, 2900],
          ['un maillot de sport', 1500, 4500],
          ['un sac à dos', 1800, 4800],
        ];
        const notes = [...(params.notes ?? [500, 1000, 2000, 5000])].sort((a, b) => a - b);
        const step = params.step ?? 5;
        const top = notes[notes.length - 1];

        const usable = ITEMS.filter(([, lo]) => lo < top);
        const [item, lo, hi] = randItem(usable);
        let price;
        for (let tries = 0; tries < 50; tries++) {
          price = rand(Math.ceil(lo / step), Math.floor(Math.min(hi, top - 1) / step)) * step;
          if (price % 100) break;
        }

        const covering = notes.filter((n) => n > price);
        const note = Math.random() < (params.smallestNote ?? 0.7) ? covering[0] : randItem(covering);
        const change = note - price;
        const [name, pronoun] = randItem(NAMES);
        const eurC = (c) => `${Math.floor(c / 100)}&nbsp;€&nbsp;${c % 100}&nbsp;c`;

        return {
          type: 'number-check',
          title: `${name} a acheté ${item} pour <strong>${eurC(price)}</strong>. ${pronoun} paye avec un billet de <strong>${note / 100}&nbsp;€</strong>. Combien lui rend-on&nbsp;?`,
          svg: { gen: 'moneySvg', par: { items: [note] } },
          operation: '? € ? c',
          answers: [String(Math.floor(change / 100)), String(change % 100)],
        };
      },
    },

    // centimesEnEuros: 240 c = ? € ? c (answers 2 and 40).
    // params: min (100), max (999), step (5 — granularity in cents),
    //         trickyRate (0.2 — share of « 305 c » / « 400 c » cases: fewer than 10 c, or none)
    centimesEnEuros: {
      generate(params = {}) {
        const min = params.min ?? 100;
        const max = params.max ?? 999;
        const step = params.step ?? 5;
        let v;
        if (Math.random() < (params.trickyRate ?? 0.2)) {
          const small = [0];
          for (let c = step; c < 10; c += step) small.push(c);
          v = rand(Math.ceil(min / 100), Math.floor(max / 100)) * 100 + randItem(small);
        } else {
          for (let tries = 0; tries < 50; tries++) {
            v = rand(Math.ceil(min / step), Math.floor(max / step)) * step;
            if (v % 100 >= 10) break;
          }
        }
        // 1250 → « 1__250 »: __ glues the number, « c » and « = » into one unbreakable part
        const grouped = String(v).replace(/\B(?=(\d{3})+$)/g, '__');
        return {
          type: 'number-check',
          operation: `${grouped}__c__=__? € ? c`,
          answers: [String(Math.floor(v / 100)), String(v % 100)],
        };
      },
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = generators;
  else Object.assign((root.AppGenerators = root.AppGenerators || {}), generators);
})(typeof window !== 'undefined' ? window : globalThis);
