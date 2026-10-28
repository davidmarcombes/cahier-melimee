/**
 * Generators — Organisation et gestion de données — hasard en images (hasardPossible, hasardComparer,
 * hasardChances, hasardRanger): urns, spinners and special dice drawn as SVG. Every drawing is read
 * again from its markup by scripts/lib/hasard.js.
 * Browser: registers into window.AppGenerators (needs generators/_core.js first) · Node: module.exports
 */
(function (root) {
  const { rand, randItem, shuffle } =
    typeof module !== 'undefined' && module.exports ? require('./_core.js') : root.GenCore;

  // Colour → fill and French forms (feminine adjective for « boule », noun for a spinner sector)
  const COLOURS = {
    rouge: { fill: '#ef4444', f: 'rouge', fs: 'rouges' },
    bleu: { fill: '#3b82f6', f: 'bleue', fs: 'bleues' },
    vert: { fill: '#22c55e', f: 'verte', fs: 'vertes' },
    jaune: { fill: '#facc15', f: 'jaune', fs: 'jaunes' },
    violet: { fill: '#a855f7', f: 'violette', fs: 'violettes' },
  };
  const NAMES = Object.keys(COLOURS);
  const f1 = (v) => Math.round(v * 10) / 10;

  // Outcomes: an array of colour names (urne, roue) or face numbers (de), one per ball / sector / face
  const describe = (source, outcomes) => {
    const counts = {};
    for (const o of outcomes) counts[o] = (counts[o] || 0) + 1;
    const parts = Object.entries(counts).map(([o, n]) =>
      source === 'urne'
        ? `${n} ${n > 1 ? 'boules' : 'boule'} ${n > 1 ? COLOURS[o].fs : COLOURS[o].f}`
        : source === 'roue'
          ? `${n} ${n > 1 ? 'parts' : 'part'} ${n > 1 ? COLOURS[o].fs : COLOURS[o].f}`
          : `${n} ${n > 1 ? 'faces' : 'face'} ${o}`
    );
    return { urne: 'Urne', roue: 'Roue', de: 'Dé' }[source] + ' : ' + parts.join(', ');
  };
  // Urn: balls in rows of 4 from the bottom of a jar, colours mixed. Spinner: equal sectors, a pointer
  // on top. Die: its 6 faces in two rows. `size`: rendered width in px.
  function chanceSvg(source, outcomes, size = 130) {
    const open = (w, h) =>
      `<svg viewBox="0 0 ${w} ${h}" width="${size}" height="${f1((size * h) / w)}" xmlns="http://www.w3.org/2000/svg" ` +
      `data-chance="${source}" role="img" aria-label="${describe(source, outcomes)}">`;
    if (source === 'urne') {
      const rows = Math.ceil(outcomes.length / 4);
      const h = 44 + rows * 20;
      const balls = shuffle(outcomes)
        .map((o, i) => {
          const inRow = Math.min(4, outcomes.length - Math.floor(i / 4) * 4);
          const x = 60 + ((i % 4) - (inRow - 1) / 2) * 20;
          const y = h - 18 - Math.floor(i / 4) * 19;
          return `<circle cx="${x}" cy="${y}" r="9" fill="${COLOURS[o].fill}" stroke="var(--ct)" stroke-width="1"/>`;
        })
        .join('');
      return (
        open(120, h) +
        `<path d="M14,14 L14,${h - 14} Q14,${h - 4} 26,${h - 4} L94,${h - 4} Q106,${h - 4} 106,${h - 14} L106,14" fill="var(--sf)" stroke="var(--ct)" stroke-width="3" stroke-linecap="round"/>` +
        balls +
        `</svg>`
      );
    }
    if (source === 'roue') {
      const [cx, cy, r] = [60, 66, 50];
      const n = outcomes.length;
      const at = (k) => {
        const a = (2 * Math.PI * k) / n - Math.PI / 2;
        return `${f1(cx + r * Math.cos(a))},${f1(cy + r * Math.sin(a))}`;
      };
      const sectors = outcomes
        .map(
          (o, k) =>
            `<path d="M${cx},${cy} L${at(k)} A${r},${r} 0 0,1 ${at(k + 1)} Z" fill="${COLOURS[o].fill}" stroke="var(--ct)" stroke-width="1.5" stroke-linejoin="round"/>`
        )
        .join('');
      return (
        open(120, 120) +
        sectors +
        `<path d="M53,4 L67,4 L60,20 Z" fill="var(--ct)"/><circle cx="${cx}" cy="${cy}" r="4" fill="var(--ct)"/></svg>`
      );
    }
    const faces = outcomes
      .map((o, i) => {
        const [x, y] = [8 + (i % 3) * 36, 6 + Math.floor(i / 3) * 36];
        return (
          `<rect x="${x}" y="${y}" width="30" height="30" rx="6" fill="var(--sf)" stroke="var(--ct)" stroke-width="2"/>` +
          `<text x="${x + 15}" y="${y + 22}" text-anchor="middle" font-size="20" font-weight="700" fill="var(--ct)">${o}</text>`
        );
      })
      .join('');
    return open(120, 78) + faces + `</svg>`;
  }
  // A single coloured ball or spinner sector, for drag-sort tiles
  const colourTile = (source, o) =>
    `<svg viewBox="0 0 40 40" width="40" height="40" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${source === 'urne' ? 'boule ' + COLOURS[o].f : o}">` +
    (source === 'urne'
      ? `<circle cx="20" cy="20" r="16" fill="${COLOURS[o].fill}" stroke="var(--ct)" stroke-width="1.5"/>`
      : `<path d="M20,36 L5,10 A30,30 0 0,1 35,10 Z" fill="${COLOURS[o].fill}" stroke="var(--ct)" stroke-width="1.5" stroke-linejoin="round"/>`) +
    `</svg>`;

  const INTRO = {
    urne: 'On tire une boule sans regarder.',
    roue: 'On fait tourner la roue. Toutes les parts ont la même taille.',
    de: 'On lance ce dé. Voici ses 6 faces.',
  };
  const figure = (html) => `<div style="display:flex;justify-content:center;gap:1.5rem">${html}</div>`;

  // Event text: `items` (colours or numbers), the outcome is one of them — or none of them (`not`)
  function eventText(source, items, not) {
    if (source === 'urne') {
      const cols = items.map((c) => COLOURS[c].f).join(' ou ');
      return `Tirer une boule ${not ? "qui n'est pas " : ''}${cols}`;
    }
    if (source === 'roue')
      return `La flèche s'arrête ${not ? 'ailleurs que ' : ''}sur ${items.map((c) => 'le ' + c).join(' ou ')}`;
    return `Obtenir ${not ? "autre chose qu'" : ''}${items.map((n) => 'un ' + n).join(' ou ')}`;
  }
  const chancesOf = (outcomes, items, not) => outcomes.filter((o) => items.includes(o) !== not).length;

  // A composition: `kinds` colours (urne, roue) or numbers 1–6 (de) on `total` outcomes, each at least once
  function compose(source, total, kinds) {
    const pool = source === 'de' ? shuffle([1, 2, 3, 4, 5, 6]) : shuffle(NAMES);
    const used = pool.slice(0, kinds);
    const outcomes = [...used];
    while (outcomes.length < total) outcomes.push(randItem(used));
    return { outcomes, used, absent: pool.slice(kinds) };
  }
  const sourceOf = (params) => params.source || randItem(params.sources || ['urne', 'roue', 'de']);
  // Spinner sectors: grouped by colour, or mixed (`mix`)
  const arrange = (source, outcomes, mix) =>
    source === 'roue' && !mix ? [...outcomes].sort((a, b) => NAMES.indexOf(a) - NAMES.indexOf(b)) : outcomes;
  const chances = (a, n) => `${a} ${a > 1 ? 'chances' : 'chance'} sur ${n}`;

  const generators = {
    // hasardPossible: mcq — an urn / spinner / special die is drawn; is the event impossible, possible or
    //   certain? With levels: 4, « peu probable » (at most 1 chance in 4) and « très probable » (at least
    //   3 in 4) replace « possible »; levels: 5 adds « une chance sur deux ».
    //   params: source ('urne' | 'roue' | 'de', or sources: list to pick from), levels (3 | 4 | 5),
    //   total ([4, 8] outcomes; a die always has 6), mix (false — spinner colours mixed)
    hasardPossible: {
      generate(params = {}) {
        const source = sourceOf(params);
        const levels = [4, 5].includes(params.levels) ? params.levels : 3;
        const LABELS = {
          3: ['Impossible', 'Possible', 'Certain'],
          4: ['Impossible', 'Peu probable', 'Très probable', 'Certain'],
          5: ['Impossible', 'Peu probable', 'Une chance sur deux', 'Très probable', 'Certain'],
        }[levels];
        const [tMin, tMax] = params.total || [4, 8];
        const want = rand(0, LABELS.length - 1);
        const levelOf = (a, n) => {
          if (a === 0) return 0;
          if (a === n) return LABELS.length - 1;
          if (levels === 3) return 1;
          if (levels === 5 && a * 2 === n) return 2;
          return a * 4 <= n ? 1 : a * 4 >= 3 * n ? levels - 2 : -1;
        };
        for (let tries = 0; tries < 500; tries++) {
          const total = source === 'de' ? 6 : rand(tMin, tMax);
          const { outcomes, used, absent } = compose(source, total, rand(2, Math.min(3, total)));
          // Candidate events: one item (there or not), two items, « not » one item
          const events = [];
          for (const x of [...used, ...absent.slice(0, 1)]) events.push([[x], false], [[x], true]);
          for (let i = 0; i < used.length; i++)
            for (let j = i + 1; j < used.length; j++) events.push([[used[i], used[j]], false]);
          if (absent.length) events.push([[used[0], absent[0]], false]);
          const ok = events.filter(([items, not]) => levelOf(chancesOf(outcomes, items, not), total) === want);
          if (!ok.length) continue;
          const [items, not] = randItem(ok);
          const drawn = arrange(source, outcomes, params.mix);
          return {
            type: 'mcq',
            title: `${eventText(source, items, not)}, c'est…`,
            body: `<p>${INTRO[source]}</p>` + figure(chanceSvg(source, drawn)),
            mcqChoices: LABELS,
            mcqAnswer: want,
          };
        }
        throw new Error('hasardPossible: no event found');
      },
    },

    // hasardComparer: mcq — two urns (or spinners) A and B: with which one is a colour more (or less)
    //   likely? params: source ('urne' | 'roue'), sameTotal (false — both have as many outcomes, the
    //   counts can be compared directly), trap (false — the likelier one has fewer balls of the colour),
    //   equal (0 — chance both give the same odds), ask ('plus' | 'moins', default 'plus'),
    //   total ([4, 10]), mix (false)
    hasardComparer: {
      generate(params = {}) {
        const source = params.source || randItem(['urne', 'roue']);
        const [tMin, tMax] = params.total || [4, 10];
        const ask = params.ask || 'plus';
        const equal = Math.random() < (params.equal ?? 0);
        const colour = randItem(NAMES);
        const others = shuffle(NAMES.filter((c) => c !== colour));
        let pair;
        for (let tries = 0; tries < 2000 && !pair; tries++) {
          const n1 = rand(tMin, tMax);
          const n2 = params.sameTotal ? n1 : rand(tMin, tMax);
          const a1 = rand(1, n1 - 1);
          const a2 = rand(1, n2 - 1);
          const [p1, p2] = [a1 / n1, a2 / n2];
          if (equal) {
            if (p1 !== p2 || (n1 === n2 && !params.sameTotal)) continue; // 2 in 4 vs 3 in 6, not twins
          } else {
            if (Math.abs(p1 - p2) < (params.sameTotal ? 0.01 : 0.15)) continue;
            // trap: the likelier one has fewer balls of the colour
            if (params.trap && !((p1 > p2 && a1 < a2) || (p2 > p1 && a2 < a1))) continue;
            if (!params.trap && !params.sameTotal && p1 > p2 !== a1 > a2) continue;
          }
          pair = [
            [a1, n1],
            [a2, n2],
          ];
        }
        if (!pair) throw new Error('hasardComparer: no pair found');
        const pictures = pair.map(([a, n], i) => {
          const rest = n - a;
          const k = rest > 1 && Math.random() < 0.5 ? 2 : 1;
          const fill = Array.from({ length: rest }, (_, j) => others[(j + i) % k]);
          const outcomes = [...Array(a).fill(colour), ...fill];
          return chanceSvg(source, arrange(source, outcomes, params.mix), 120);
        });
        const [p1, p2] = pair.map(([a, n]) => a / n);
        const what = source === 'urne' ? `tirer une boule ${COLOURS[colour].f}` : `tomber sur le ${colour}`;
        const name = source === 'urne' ? "l'urne" : 'la roue';
        const Name = source === 'urne' ? "L'urne" : 'La roue';
        return {
          type: 'mcq',
          title: `Avec quelle ${source === 'urne' ? 'urne' : 'roue'} a-t-on le ${ask} de chances de ${what}\u00a0?`,
          body:
            `<p>${INTRO[source]}</p>` +
            figure(
              pictures
                .map((svg, i) => `<div style="text-align:center">${svg}<div><strong>${'AB'[i]}</strong></div></div>`)
                .join('')
            ),
          mcqChoices: [`${Name} A`, `${Name} B`, `Autant avec ${name} A qu'avec ${name} B`],
          mcqAnswer: equal ? 2 : p1 > p2 === (ask === 'plus') ? 0 : 1,
        };
      },
    },

    // hasardChances: mcq — « a chances sur b » for an event on a drawn urn / spinner / die.
    //   params: source / sources, total ([4, 10]; a die has 6), union (false — the event may name two
    //   items), mix (false). Distractors: a sur (b − a), (b − a) sur b, 1 sur (number of colours),
    //   (a + 1) sur b — never one equal in value to the answer.
    hasardChances: {
      generate(params = {}) {
        const source = sourceOf(params);
        const [tMin, tMax] = params.total || [4, 10];
        for (let tries = 0; tries < 500; tries++) {
          const total = source === 'de' ? 6 : rand(tMin, tMax);
          const { outcomes, used } = compose(source, total, rand(2, Math.min(4, total - 1)));
          const items = params.union && used.length > 2 && Math.random() < 0.5 ? used.slice(0, 2) : [randItem(used)];
          const a = chancesOf(outcomes, items, false);
          if (a === total) continue;
          const value = (s) => {
            const [x, y] = s.match(/\d+/g).map(Number);
            return x / y;
          };
          const answer = chances(a, total);
          const wrong = shuffle(
            [chances(a, total - a), chances(total - a, total), chances(1, used.length), chances(a + 1, total)].filter(
              (s, i, all) =>
                all.findIndex((t) => value(t) === value(s)) === i && value(s) !== a / total && value(s) <= 1
            )
          ).slice(0, 3);
          if (wrong.length < 3) continue;
          const choices = shuffle([answer, ...wrong]);
          return {
            type: 'mcq',
            title: `${eventText(source, items, false)}\u00a0: combien de chances\u00a0?`,
            body: `<p>${INTRO[source]}</p>` + figure(chanceSvg(source, arrange(source, outcomes, params.mix))),
            mcqChoices: choices,
            mcqAnswer: choices.indexOf(answer),
          };
        }
        throw new Error('hasardChances: no event found');
      },
    },

    // hasardRanger: drag-sort — order the colours of an urn / spinner from least to most likely (or the
    //   reverse). Colour tiles keep their listed order, which is the answer.
    //   params: source ('urne' | 'roue'), count (3 colours), total ([6, 12]), direction ('asc' | 'desc'),
    //   mix (false)
    hasardRanger: {
      generate(params = {}) {
        const source = params.source || randItem(['urne', 'roue']);
        const count = params.count || 3;
        const [tMin, tMax] = params.total || [6, 12];
        const direction = params.direction || randItem(['asc', 'desc']);
        const min = (count * (count + 1)) / 2; // counts 1, 2, … all different
        let counts;
        do {
          const total = rand(Math.max(tMin, min), Math.max(tMax, min));
          counts = Array.from({ length: count }, () => 1);
          for (let left = total - count; left > 0; left--) counts[rand(0, count - 1)]++;
        } while (new Set(counts).size !== count);
        const cols = shuffle(NAMES).slice(0, count);
        const outcomes = cols.flatMap((c, i) => Array(counts[i]).fill(c));
        const byChance = cols.map((c, i) => [c, counts[i]]).sort((x, y) => x[1] - y[1]);
        const ordered = (direction === 'asc' ? byChance : byChance.reverse()).map(([c]) => colourTile(source, c));
        return {
          type: 'drag-sort',
          title: `Range les couleurs de la ${direction === 'asc' ? 'moins probable à la plus probable' : 'plus probable à la moins probable'}.`,
          body: `<p>${INTRO[source]}</p>` + figure(chanceSvg(source, arrange(source, outcomes, params.mix))),
          direction,
          tiles: ordered,
        };
      },
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = generators;
  else Object.assign((root.AppGenerators = root.AppGenerators || {}), generators);
})(typeof window !== 'undefined' ? window : globalThis);
