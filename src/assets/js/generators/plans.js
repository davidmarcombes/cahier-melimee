/**
 * Generators — Espace et géométrie, plans: plan de ville en cases repérées (planVille: lire une case,
 * nommer le contenu d'une case, orientation nord / sud / est / ouest, suivre un trajet, plus court chemin
 * dans les rues, avec ou sans échelle) and plan de la classe (planClasse: rang, côté, devant / derrière).
 * Every map is read back by scripts/lib/plans.js (cells, roads, labels, emoji positions) — the answer is
 * recomputed from what the pupil sees.
 * Browser: registers into window.AppGenerators (needs generators/_core.js first) · Node: module.exports
 */
(function (root) {
  const { rand, randItem, shuffle } =
    typeof module !== 'undefined' && module.exports ? require('./_core.js') : root.GenCore;

  // Plans are fluid: the full card width on a phone, up to about 1.4× their drawn size on a wide screen
  const centred = (svg) => `<div style="display:flex;justify-content:center">${svg}</div>`;

  // ─── Plan de ville ──────────────────────────────────────────────────────────
  const GRASS = '#dcfce7';
  const ROAD = '#cbd5e1';
  const C = 40; // cell, in viewBox units
  const O = 20; // margin for the column letters and row numbers
  const LETTERS = 'ABCDEFGH';
  // Places that can be asked about: each drawn once. Houses and trees fill the rest.
  const PLACES = [
    ['🏫', 'l’école'],
    ['🏥', 'l’hôpital'],
    ['🏊', 'la piscine'],
    ['🏪', 'le magasin'],
    ['⛲', 'la fontaine'],
    ['🚉', 'la gare'],
    ['⛪', 'l’église'],
    ['🎪', 'le cirque'],
    ['🏦', 'la banque'],
    ['🏨', 'l’hôtel'],
    ['📮', 'la poste'],
    ['🎡', 'la fête foraine'],
  ];
  const FILL = ['🏠', '🏠', '🌳', '🌳', '🏠'];
  const DIRS = {
    nord: [-1, 0],
    sud: [1, 0],
    est: [0, 1],
    ouest: [0, -1],
  };
  const OPPOSITE = { nord: 'sud', sud: 'nord', est: 'ouest', ouest: 'est' };
  const cellName = (r, c) => `${LETTERS[c]}${r + 1}`;
  const towards = (d) => (d === 'est' || d === 'ouest' ? `vers l’${d}` : `vers le ${d}`);

  // Roads: whole rows and whole columns (1 to n / 3 of each), never side by side; every other cell touches a road
  function townLayout(n) {
    for (let t = 0; t < 500; t++) {
      const lines = () => {
        const k = rand(1, Math.ceil(n / 3));
        const out = [];
        for (let u = 0; u < 50 && out.length < k; u++) {
          const i = rand(0, n - 1);
          if (out.every((j) => Math.abs(i - j) >= 2)) out.push(i);
        }
        return out;
      };
      const [R, Cs] = [lines(), lines()];
      const road = (r, c) => R.includes(r) || Cs.includes(c);
      const blocks = [];
      let ok = true;
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++) {
          if (road(r, c)) continue;
          const near = Object.values(DIRS).some(
            ([dr, dc]) => r + dr >= 0 && r + dr < n && c + dc >= 0 && c + dc < n && road(r + dr, c + dc)
          );
          if (!near) ok = false;
          blocks.push([r, c]);
        }
      if (ok && blocks.length >= n * 2) return { road, blocks };
    }
    throw new Error('planVille: no layout');
  }

  // Shortest way from place a to place b through road cells (not through 🚧): number of road cells, or -1
  function roadCells(n, isRoad, a, b) {
    const key = (r, c) => r * n + c;
    const dist = new Map([[key(...a), 0]]);
    const queue = [a];
    while (queue.length) {
      const [r, c] = queue.shift();
      for (const [dr, dc] of Object.values(DIRS)) {
        const [nr, nc] = [r + dr, c + dc];
        if (nr < 0 || nr >= n || nc < 0 || nc >= n || dist.has(key(nr, nc))) continue;
        if (nr === b[0] && nc === b[1]) return dist.get(key(r, c));
        if (!isRoad(nr, nc)) continue;
        dist.set(key(nr, nc), dist.get(key(r, c)) + 1);
        queue.push([nr, nc]);
      }
    }
    return -1;
  }

  function townSvg(n, road, at, works) {
    const W = O + n * C + 26;
    const H = O + n * C + 2;
    let s = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${Math.round(W * 1.45)}px;height:auto" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" data-plan="ville">`;
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        const [x, y] = [O + c * C, O + r * C];
        s += `<rect x="${x}" y="${y}" width="${C}" height="${C}" fill="${road(r, c) ? ROAD : GRASS}" stroke="#64748b" stroke-width="0.6"/>`;
        const e = at[`${r},${c}`] || (works && works[0] === r && works[1] === c ? '🚧' : '');
        if (e) s += `<text x="${x + C / 2}" y="${y + C / 2 + 8}" font-size="24" text-anchor="middle">${e}</text>`;
      }
    const label = 'font-size="13" font-weight="bold" text-anchor="middle" fill="var(--ct)"';
    for (let c = 0; c < n; c++) s += `<text x="${O + c * C + C / 2}" y="14" ${label}>${LETTERS[c]}</text>`;
    for (let r = 0; r < n; r++) s += `<text x="9" y="${O + r * C + C / 2 + 5}" ${label}>${r + 1}</text>`;
    // North arrow, right of the map
    const ax = O + n * C + 13;
    s += `<text x="${ax}" y="${O + 10}" ${label}>N</text>`;
    s += `<path d="M${ax} ${O + 14} l-5 9 h10 z M${ax} ${O + 22} v18" stroke="var(--ct)" stroke-width="2" fill="var(--ct)"/>`;
    return s + '</svg>';
  }

  // ─── Plan de la classe ──────────────────────────────────────────────────────
  const ANIMALS = ['🐱', '🐶', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐵', '🐷'];
  const RANGS = ['1er', '2e', '3e'];
  const SIDES = ['côté porte', 'au milieu', 'côté fenêtre'];

  function classSvg(seat, doorLeft) {
    const [W, H] = [260, 214];
    const colX = (j) => (doorLeft ? 70 + j * 60 : 190 - j * 60); // column 0 is the door side
    let s = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:360px;height:auto" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" data-plan="classe">`;
    s += `<rect x="30" y="4" width="200" height="${H - 8}" fill="none" stroke="var(--ct)" stroke-width="2"/>`;
    s += `<rect x="80" y="10" width="100" height="18" rx="2" fill="#166534"/>`;
    s += `<text x="130" y="23" font-size="11" text-anchor="middle" fill="#fff">tableau</text>`;
    const [dx, wx] = doorLeft ? [16, 244] : [244, 16];
    s += `<text x="${dx}" y="70" font-size="20" text-anchor="middle">🚪</text>`;
    for (const y of [90, 170]) s += `<text x="${wx}" y="${y}" font-size="18" text-anchor="middle">🪟</text>`;
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) {
        // Pupils face the board: the table is between the pupil and the board
        const [x, y] = [colX(j), 84 + i * 56];
        s += `<rect x="${x - 24}" y="${y - 38}" width="48" height="12" rx="2" fill="#d6a76c" stroke="#92400e" stroke-width="0.8"/>`;
        s += `<text x="${x}" y="${y}" font-size="26" text-anchor="middle">${seat[i][j]}</text>`;
      }
    return s + '</svg>';
  }

  const generators = {
    // planVille: mcq / number-check on a town map in lettered squares (A–F × 1–6), north up.
    //   params: ask ('case' | 'contenu' | 'direction' | 'trajet' | 'chemin', or a list), size (6),
    //   works (false — chemin: a 🚧 road square on the shortest way), scale (chemin: metres per road
    //   square, e.g. 100; the answer is then a distance in m)
    planVille: {
      generate(params = {}) {
        const ask = Array.isArray(params.ask) ? randItem(params.ask) : params.ask || 'case';
        const n = params.size || 6;
        for (let attempt = 0; attempt < 200; attempt++) {
          const { road, blocks } = townLayout(n);
          const cells = shuffle(blocks);
          const named = shuffle(PLACES).slice(0, Math.min(7, cells.length - 2));
          const at = {};
          const where = new Map();
          named.forEach(([e], i) => {
            at[cells[i].join(',')] = e;
            where.set(e, cells[i]);
          });
          cells.slice(named.length).forEach((p) => {
            if (Math.random() < 0.6) at[p.join(',')] = randItem(FILL);
          });
          const nameOf = new Map(named);
          const label = (e) => `${nameOf.get(e)} ${e}`;
          // « de le » → « du », « à le » → « au »
          const de = (e) => `de ${label(e)}`.replace(/^de le /, 'du ');
          const to = (e) => `à ${label(e)}`.replace(/^à le /, 'au ');
          const placeAt = (r, c) => {
            const e = at[`${r},${c}`];
            return e && nameOf.has(e) ? e : null;
          };
          const inside = (r, c) => r >= 0 && r < n && c >= 0 && c < n;
          let works = null;

          let out;
          if (ask === 'case' || ask === 'contenu') {
            const [e, [r, c]] = randItem([...where]);
            // Traps: row and column swapped, neighbours
            const traps = [
              [c, r],
              [r, c + 1],
              [r, c - 1],
              [r + 1, c],
              [r - 1, c],
              [r + 1, c + 1],
            ].filter(([a, b]) => inside(a, b) && !(a === r && b === c));
            if (ask === 'case') {
              const wrong = shuffle([...new Set(traps.slice(1).map(([a, b]) => cellName(a, b)))]);
              const swap = inside(c, r) && c !== r ? [cellName(c, r)] : [];
              const choices = shuffle([cellName(r, c), ...[...new Set([...swap, ...wrong])].slice(0, 3)]);
              if (choices.length < 4) continue;
              out = {
                type: 'mcq',
                title: `Dans quelle case est ${label(e)} ?`,
                mcqChoices: choices,
                mcqAnswer: choices.indexOf(cellName(r, c)),
              };
            } else {
              const near = traps.map(([a, b]) => placeAt(a, b)).filter((x) => x && x !== e);
              const others = shuffle(named.map(([x]) => x).filter((x) => x !== e));
              const wrong = [...new Set([...near, ...others])].slice(0, 3);
              const choices = shuffle([e, ...wrong]).map(label);
              out = {
                type: 'mcq',
                title: `Qu’y a-t-il dans la case ${cellName(r, c)} ?`,
                mcqChoices: choices,
                mcqAnswer: choices.indexOf(label(e)),
              };
            }
          } else if (ask === 'direction') {
            const pairs = [];
            for (const [a, pa] of where)
              for (const [b, pb] of where)
                if (a !== b && (pa[0] === pb[0] || pa[1] === pb[1])) pairs.push([a, pa, b, pb]);
            if (!pairs.length) continue;
            const [a, pa, b, pb] = randItem(pairs);
            const dir = pa[0] === pb[0] ? (pa[1] > pb[1] ? 'est' : 'ouest') : pa[0] < pb[0] ? 'nord' : 'sud';
            const choices = ['au nord', 'au sud', 'à l’est', 'à l’ouest'];
            out = {
              type: 'mcq',
              title: `Où est ${label(a)} par rapport ${to(b)} ?`,
              mcqChoices: choices,
              mcqAnswer: ['nord', 'sud', 'est', 'ouest'].indexOf(dir),
              mcqCompact: true,
            };
          } else if (ask === 'trajet') {
            const [s, [r, c]] = randItem([...where]);
            const d1 = randItem(Object.keys(DIRS));
            const d2 = randItem(Object.keys(DIRS).filter((d) => d !== d1 && d !== OPPOSITE[d1]));
            const [k1, k2] = [rand(1, n - 2), rand(1, n - 2)];
            const go = (a, b) => [r + DIRS[a][0] * k1 + DIRS[b][0] * k2, c + DIRS[a][1] * k1 + DIRS[b][1] * k2];
            const end = go(d1, d2);
            if (!inside(...end) || !placeAt(...end) || placeAt(...end) === s || k1 + k2 < 3) continue;
            // Traps: east and west mixed up, the first leg only, the legs in the wrong direction
            const trapCells = [
              go(OPPOSITE[d1], d2),
              go(d1, OPPOSITE[d2]),
              [r + DIRS[d1][0] * k1, c + DIRS[d1][1] * k1],
            ];
            const near = trapCells.filter((p) => inside(...p)).map((p) => placeAt(...p));
            const goal = placeAt(...end);
            const others = shuffle(named.map(([x]) => x).filter((x) => x !== goal && x !== s));
            const wrong = [...new Set([...near.filter((x) => x && x !== goal && x !== s), ...others])].slice(0, 3);
            const choices = shuffle([goal, ...wrong]).map(label);
            const cases = (k) => `${k} case${k > 1 ? 's' : ''}`;
            out = {
              type: 'mcq',
              title: `Pars ${de(s)}. Avance de ${cases(k1)} ${towards(d1)}, puis de ${cases(k2)} ${towards(d2)}. Où arrives-tu ?`,
              mcqChoices: choices,
              mcqAnswer: choices.indexOf(label(goal)),
            };
          } else if (ask === 'chemin') {
            const list = [...where];
            const [a, pa] = randItem(list);
            const [b, pb] = randItem(list.filter(([x]) => x !== a));
            let isRoad = road;
            let len = roadCells(n, isRoad, pa, pb);
            if (len < 3) continue;
            if (params.works) {
              // 🚧 on a road square next to a road square, on some shortest way: the detour is longer
              const roads = [];
              for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (road(r, c)) roads.push([r, c]);
              const cut = shuffle(roads).find(([r, c]) => {
                const without = (x, y) => road(x, y) && !(x === r && y === c);
                const l = roadCells(n, without, pa, pb);
                return l > len;
              });
              if (!cut) continue;
              works = cut;
              isRoad = (x, y) => road(x, y) && !(x === cut[0] && y === cut[1]);
              len = roadCells(n, isRoad, pa, pb);
            }
            const svg = townSvg(n, road, at, works);
            const scale = params.scale;
            return {
              type: 'number-check',
              bodyFirst: true,
              body:
                centred(svg) +
                `<p>Pour aller ${de(a)} ${to(b)}, on marche sur les cases de rue grises${works ? ' (pas sur les travaux 🚧)' : ''}.` +
                (scale
                  ? ` Une case de rue mesure ${scale}&nbsp;m. Quelle est la longueur du plus court chemin ?`
                  : ' Combien de cases de rue traverse-t-on au plus court ?') +
                '</p>',
              // Short: the operation does not wrap on a phone
              operation: scale ? '?__m' : '?__cases',
              answers: [String(scale ? len * scale : len)],
            };
          } else throw new Error(`planVille: unknown ask « ${ask} »`);
          if (!out) continue;
          return { ...out, body: centred(townSvg(n, road, at, works)) };
        }
        throw new Error('planVille: no question found');
      },
    },

    // planClasse: mcq on a classroom plan seen from above (board at the top, door on one side, windows
    //   on the other, 3 rangs × 3 tables, an animal at each). params: ask ('qui' | 'ou' | 'derriere' |
    //   'devant', or a list). « 1er rang » is the row nearest the board.
    planClasse: {
      generate(params = {}) {
        const ask = Array.isArray(params.ask) ? randItem(params.ask) : params.ask || 'qui';
        const pool = shuffle(ANIMALS).slice(0, 9);
        const seat = [0, 1, 2].map((i) => pool.slice(i * 3, i * 3 + 3));
        const doorLeft = Math.random() < 0.5;
        const body = centred(classSvg(seat, doorLeft)) + '<p>Le 1er rang est le plus près du tableau.</p>';
        const place = (i, j) => `au ${RANGS[i]} rang, ${SIDES[j]}`;
        const ok = (i, j) => i >= 0 && i < 3 && j >= 0 && j < 3;
        const [i, j] = [rand(0, 2), rand(0, 2)];
        const pickOthers = (cells, want) =>
          [...new Set(cells.filter(([a, b]) => ok(a, b)).map(([a, b]) => seat[a][b]))].filter((x) => x !== want);
        if (ask === 'qui') {
          const want = seat[i][j];
          const near = pickOthers(
            [
              [i, 2 - j],
              [i, j + 1],
              [i, j - 1],
              [i + 1, j],
              [i - 1, j],
              [2 - i, j],
            ],
            want
          );
          const choices = shuffle([want, ...near.slice(0, 3)]);
          return {
            type: 'mcq',
            title: `Qui est assis ${place(i, j)} ?`,
            body,
            mcqChoices: choices,
            mcqAnswer: choices.indexOf(want),
            mcqCompact: true,
          };
        }
        if (ask === 'ou') {
          const want = place(i, j);
          const traps = [
            [i, 2 - j],
            [2 - i, j],
            [i, j + 1],
            [i, j - 1],
            [i + 1, j],
            [i - 1, j],
            [2 - i, 2 - j],
          ]
            .filter(([a, b]) => ok(a, b) && !(a === i && b === j))
            .map(([a, b]) => place(a, b));
          const choices = shuffle([want, ...[...new Set(traps)].slice(0, 3)]);
          return {
            type: 'mcq',
            title: `Où est assis ${seat[i][j]} ?`,
            body,
            mcqChoices: choices,
            mcqAnswer: choices.indexOf(want),
          };
        }
        // derriere: same column, one rang further from the board; devant: one rang nearer
        const step = ask === 'derriere' ? 1 : -1;
        const a = ask === 'derriere' ? rand(0, 1) : rand(1, 2);
        const want = seat[a + step][j];
        const near = pickOthers(
          [
            [a - step, j],
            [a, j + 1],
            [a, j - 1],
            [a + step, 2 - j],
          ],
          want
        ).filter((x) => x !== seat[a][j]);
        const choices = shuffle([want, ...near.slice(0, 3)]);
        return {
          type: 'mcq',
          title: `Qui est assis juste ${ask === 'derriere' ? 'derrière' : 'devant'} ${seat[a][j]} ?`,
          body,
          mcqChoices: choices,
          mcqAnswer: choices.indexOf(want),
          mcqCompact: true,
        };
      },
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = generators;
  else Object.assign((root.AppGenerators = root.AppGenerators || {}), generators);
})(typeof window !== 'undefined' ? window : globalThis);
