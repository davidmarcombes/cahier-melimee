/**
 * Generators — Espace et géométrie — figures dans toute orientation (trouverFormes), angles sans rapporteur
 * (trouverAngles, comparerAngles, rangerAngles). Every drawing is checked again from its markup by
 * scripts/lib/shapes.js. Tracer sur quadrillage (tracerGrille, grid-board draw), checked by scripts/lib/grid-board.js.
 * Browser: registers into window.AppGenerators (needs generators/_core.js first) · Node: module.exports
 */
(function (root) {
  const { rand, randItem, shuffle } =
    typeof module !== 'undefined' && module.exports ? require('./_core.js') : root.GenCore;

  // Angles (trouverAngles, comparerAngles, rangerAngles) — no protractor at the cours moyen: angles are
  // drawn and compared by eye, never read in degrees. Checked from the drawing by scripts/lib/shapes.js.
  const pickF = (a, b) => a + Math.random() * (b - a);
  const ANGLE_RANGES = { aigu: [25, 70], droit: [90, 90], obtus: [110, 160] };
  const NEAR_ANGLE_RANGES = { aigu: [64, 76], droit: [90, 90], obtus: [104, 116] };
  // Two arms of arms[i] px (26–60) from a vertex, the first at `turn` degrees, the second `deg` further
  // anticlockwise, with an arc in the angle. Fixed scale, centred, so arm lengths compare from one drawing
  // to the next; only a drawing wider than the box is shrunk to fit. `size`: rendered px.
  function angleSvg(deg, turn, arms, size = 96) {
    const rad = Math.PI / 180;
    const dir = (t, l) => [l * Math.cos(t * rad), l * Math.sin(t * rad)];
    const ends = [dir(turn, arms[0]), dir(turn + deg, arms[1])];
    const xs = [0, ends[0][0], ends[1][0]];
    const ys = [0, ends[0][1], ends[1][1]];
    const [cx, cy] = [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2];
    const k = Math.min(1, 88 / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)));
    const f = (v) => Math.round(v * 10) / 10;
    const at = ([x, y]) => [f(50 + (x - cx) * k), f(50 - (y - cy) * k)];
    const [v, a, b] = [[0, 0], ...ends].map(at);
    const r = Math.min(16, 0.4 * Math.min(...arms));
    const [p, q] = [dir(turn, r), dir(turn + deg, r)].map(at);
    return (
      `<svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<path d="M${v} L${p} A${f(r * k)} ${f(r * k)} 0 0 0 ${q} Z" fill="#fb923c" fill-opacity="0.6"/>` +
      `<polyline points="${a} ${v} ${b}" fill="none" stroke="var(--ct)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` +
      `</svg>`
    );
  }
  // A turn that keeps both arms of a `deg` angle at least 15° away from horizontal and vertical
  const offAxisTurn = (deg) => {
    const ok = (t) => Math.min(((t % 90) + 90) % 90, 90 - (((t % 90) + 90) % 90)) >= 15;
    for (;;) {
      const t = pickF(0, 360);
      if (ok(t) && ok(t + deg)) return t;
    }
  };

  // Tracer sur quadrillage helpers. Convex hull of lattice points (corners only, in order)
  function convexHull(pts) {
    const P = [...new Map(pts.map((p) => [p + '', p])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (P.length < 3) return P;
    const turn = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const half = (list) => {
      const h = [];
      for (const p of list) {
        while (h.length >= 2 && turn(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
        h.push(p);
      }
      return h.slice(0, -1);
    };
    return [...half(P), ...half([...P].reverse())];
  }
  // Twice the area of a polygon
  const area2 = (P) =>
    Math.abs(P.reduce((t, p, i) => t + p[0] * P[(i + 1) % P.length][1] - p[1] * P[(i + 1) % P.length][0], 0));
  // Unit sides of a cell outline joined into the outline's straight sides
  function mergeSegments(segs) {
    const key = (p) => p + '';
    const nb = {};
    for (const [a, b] of segs) {
      (nb[key(a)] = nb[key(a)] || []).push(b);
      (nb[key(b)] = nb[key(b)] || []).push(a);
    }
    const start = segs[0][0];
    const loop = [start];
    for (let prev = null, at = start; ;) {
      const [x, y] = nb[key(at)];
      const next = prev && key(x) === key(prev) ? y : x;
      if (key(next) === key(start)) break;
      loop.push(next);
      [prev, at] = [at, next];
      if (loop.length > segs.length) break;
    }
    const corners = loop.filter((p, i) => {
      const a = loop[(i + loop.length - 1) % loop.length];
      const b = loop[(i + 1) % loop.length];
      return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]);
    });
    const out = corners.map((p, i) => [p, corners[(i + 1) % corners.length]]);
    out.units = loop.length; // unit sides walked from the start: fewer than all means a second loop
    out.total = segs.length;
    return out;
  }
  const loopLength = (merged) => (merged.units === merged.total ? merged.length : -1);

  const generators = {
    // trouverFormes: tile-select — tap every <target> among plane shapes drawn in any orientation (a
    //   square on its tip is still a square, a triangle need not sit on a side). Checked from the
    //   drawing alone by scripts/lib/shapes.js.
    //   params: target ('carre' | 'rectangle' | 'losange' | 'triangle' | 'triangleRectangle' | 'disque'),
    //   among (distractor kinds, default by target), count (6 tiles), answers ([2, 3]),
    //   turn ('all' | 'some' | 'none'; 'some' turns one answer and keeps another upright),
    //   near (false — distractors close to the target: rectangles and rhombi almost square,
    //   parallelograms almost rectangles, triangles almost right), inclusive (false — a square also
    //   counts as a rectangle / rhombus and one is drawn; otherwise none is), colour (true — fills vary),
    //   kid (false — GS: the title is an emoji and the instruction is spoken from say)
    trouverFormes: {
      generate(params = {}) {
        const target = params.target || 'carre';
        const near = !!params.near;
        const inclusive = !!params.inclusive && (target === 'rectangle' || target === 'losange');
        const turn = params.turn || 'all';
        const [aMin, aMax] = params.answers || [2, 3];
        const count = params.count || 6;
        const pick = (a, b) => a + Math.random() * (b - a);
        const rad = Math.PI / 180;
        const off90 = (x) => Math.abs(x - 90);
        const anglesOf = (p) =>
          p.map((v, i) => {
            const [u, w] = [p[(i + p.length - 1) % p.length], p[(i + 1) % p.length]];
            const a = Math.atan2(u[1] - v[1], u[0] - v[0]) - Math.atan2(w[1] - v[1], w[0] - v[0]);
            const d = Math.abs(a / rad) % 360;
            return d > 180 ? 360 - d : d;
          });
        const triangle = (ok) => {
          for (let tries = 0; tries < 500; tries++) {
            const p = randItem([
              () => [
                [0, 0],
                [1, 0],
                [0.5, Math.sqrt(3) / 2],
              ],
              () => [
                [0, 0],
                [1, 0],
                [0.5, pick(0.35, 1.3)],
              ],
              () => [
                [0, 0],
                [1, 0],
                [pick(-0.2, 1.2), pick(0.4, 1)],
              ],
              () => [
                [0, 0],
                [1, 0],
                [0, pick(0.45, 1)],
              ],
            ])();
            const a = anglesOf(p);
            if (Math.min(...a) >= 22 && ok(a)) return p;
          }
          throw new Error('trouverFormes: no triangle found');
        };
        const regular = (n) =>
          Array.from({ length: n }, (_, i) => [
            Math.cos((90 + (360 * i) / n) * rad),
            Math.sin((90 + (360 * i) / n) * rad),
          ]);
        // Kind → vertices before turning (y up, longest side about 1)
        const KINDS = {
          carre: () => [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ],
          rectangle: () => {
            const r = near ? pick(1.25, 1.4) : pick(1.6, 2.2);
            return [
              [0, 0],
              [r, 0],
              [r, 1],
              [0, 1],
            ];
          },
          losange: () => {
            const a = (near ? pick(68, 76) : pick(48, 64)) * rad;
            return [
              [0, 0],
              [1, 0],
              [1 + Math.cos(a), Math.sin(a)],
              [Math.cos(a), Math.sin(a)],
            ];
          },
          parallelogramme: () => {
            const a = (near ? pick(74, 80) : pick(55, 70)) * rad;
            const l = pick(0.5, 0.75);
            return [
              [0, 0],
              [1.3, 0],
              [1.3 + l * Math.cos(a), l * Math.sin(a)],
              [l * Math.cos(a), l * Math.sin(a)],
            ];
          },
          trapeze: () => {
            const t = pick(0.4, 0.65);
            const o = pick(0.05, 0.95 - t);
            const h = pick(0.45, 0.7);
            return [
              [0, 0],
              [1, 0],
              [o + t, h],
              [o, h],
            ];
          },
          cerfVolant: () => {
            const w = pick(0.45, 0.6);
            return [
              [0, pick(0.35, 0.5)],
              [w, 0],
              [0, -pick(0.9, 1.2)],
              [-w, 0],
            ];
          },
          triangle: () => triangle((a) => a.every((x) => off90(x) < 0.01 || off90(x) >= 8)),
          triangleRectangle: () => triangle((a) => a.some((x) => off90(x) < 0.01)),
          autreTriangle: () =>
            triangle((a) =>
              near ? a.every((x) => off90(x) >= 7) && a.some((x) => off90(x) <= 13) : a.every((x) => off90(x) > 20)
            ),
          pentagone: () => regular(5),
          hexagone: () => regular(6),
        };
        const AMONG = {
          carre: near
            ? ['rectangle', 'losange', 'parallelogramme', 'rectangle', 'losange']
            : ['rectangle', 'losange', 'triangle', 'disque', 'trapeze'],
          rectangle: ['parallelogramme', 'trapeze', 'losange', 'triangle', 'cerfVolant'],
          losange: ['cerfVolant', 'parallelogramme', 'rectangle', 'trapeze'],
          triangle: ['carre', 'rectangle', 'losange', 'disque', 'trapeze'],
          triangleRectangle: ['autreTriangle'],
          disque: ['ovale', 'carre', 'triangle', 'rectangle'],
        };
        const NAMES = {
          carre: 'carrés',
          rectangle: 'rectangles',
          losange: 'losanges',
          triangle: 'triangles',
          triangleRectangle: 'triangles rectangles',
          disque: 'disques',
        };
        if (!NAMES[target]) throw new Error(`trouverFormes: unknown target « ${target} »`);
        // A square is a rectangle and a rhombus: never a distractor for them
        const among = (params.among || AMONG[target]).filter(
          (k) => k !== target && !(k === 'carre' && (target === 'rectangle' || target === 'losange'))
        );

        const turnBy = (p, t) => {
          const [c, s] = [Math.cos(t * rad), Math.sin(t * rad)];
          return p.map(([x, y]) => [x * c - y * s, x * s + y * c]);
        };
        // No side within 15° of horizontal or vertical
        const isTurned = (p) =>
          p.every((v, i) => {
            const w = p[(i + 1) % p.length];
            const t = (((Math.atan2(w[1] - v[1], w[0] - v[0]) / rad) % 90) + 90) % 90;
            return Math.min(t, 90 - t) >= 15;
          });
        const place = (kind, p, wantTurned) => {
          if (Math.random() < 0.5) p = p.map(([x, y]) => [-x, y]); // mirror image
          if (!wantTurned)
            return turnBy(p, ['rectangle', 'losange', 'parallelogramme'].includes(kind) ? randItem([0, 90]) : 0);
          for (let tries = 0; tries < 200; tries++) {
            const q = turnBy(p, pick(0, 360));
            if (isTurned(q)) return q;
          }
          return null; // some triangles always keep a side near an axis: draw another one
        };

        const COLOURS = ['#60a5fa', '#f87171', '#4ade80', '#facc15', '#c084fc', '#fb923c'];
        const f = (v) => Math.round(v * 10) / 10;
        const draw = (kind, wantTurned) => {
          const size = pick(64, 90);
          const fill = params.colour === false ? 'var(--sf)' : randItem(COLOURS);
          const paint = `fill="${fill}" stroke="var(--ct)" stroke-width="2.5" stroke-linejoin="round"`;
          let shape;
          if (kind === 'disque') shape = `<circle cx="50" cy="50" r="${f(size / 2)}" ${paint}/>`;
          else if (kind === 'ovale') {
            const rx = size / 2;
            shape = `<ellipse cx="50" cy="50" rx="${f(rx)}" ry="${f(rx / pick(1.4, 1.7))}" transform="rotate(${Math.round(pick(0, 180))} 50 50)" ${paint}/>`;
          } else {
            let p = null;
            for (let tries = 0; !p && tries < 50; tries++) p = place(kind, KINDS[kind](), wantTurned);
            if (!p) throw new Error(`trouverFormes: cannot turn a ${kind}`);
            const xs = p.map((v) => v[0]);
            const ys = p.map((v) => v[1]);
            const k = size / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
            const [cx, cy] = [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2];
            const pts = p.map(([x, y]) => `${f(50 + (x - cx) * k)},${f(50 - (y - cy) * k)}`).join(' ');
            shape = `<polygon points="${pts}" ${paint}/>`;
          }
          return `<svg viewBox="0 0 100 100" width="84" height="84" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${shape}</svg>`;
        };

        const k = rand(aMin, aMax);
        // Answers first (the first one turned, the second upright when turn = 'some'), then distractors
        const kinds = Array.from({ length: k }, (_, i) => (inclusive && i === k - 1 && k > 1 ? 'carre' : target));
        const pool = shuffle(among);
        for (let i = 0; kinds.length < count; i++) kinds.push(pool[i % pool.length]);
        const seen = new Set();
        const tiles = kinds.map((kind, i) => {
          const t = turn === 'all' || (turn === 'some' && (i === 0 || (i !== 1 && Math.random() < 0.5)));
          let svg = draw(kind, t);
          while (seen.has(svg)) svg = draw(kind, t); // two discs of the same size and colour
          seen.add(svg);
          return svg;
        });
        const order = shuffle(tiles.map((_, i) => i));
        const say = `Touche tous les ${NAMES[target]}.`;
        return {
          type: 'tile-select',
          title: params.kid
            ? '🔍'
            : inclusive
              ? `Clique sur toutes les figures qui sont des <strong>${NAMES[target]}</strong>.`
              : `Clique sur tous les <strong>${NAMES[target]}</strong>.`,
          ...(params.kid ? { say } : {}),
          tiles: order.map((i) => tiles[i]),
          tileAnswers: order.map((i, pos) => (i < k ? pos : -1)).filter((pos) => pos >= 0),
        };
      },
    },

    // trouverAngles: tile-select — tap every acute / right / obtuse angle, turned at random, with arms of
    //   random lengths (the first answer always has both arms off the axes).
    //   params: target ('aigu' | 'droit' | 'obtus'), count (6), answers ([2, 3]),
    //   near (false — acute and obtuse angles 14–26° from a right angle instead of 20–65°)
    trouverAngles: {
      generate(params = {}) {
        const target = params.target || 'droit';
        const NAMES = { aigu: 'angles aigus', droit: 'angles droits', obtus: 'angles obtus' };
        if (!NAMES[target]) throw new Error(`trouverAngles: unknown target « ${target} »`);
        const ranges = params.near ? NEAR_ANGLE_RANGES : ANGLE_RANGES;
        const [aMin, aMax] = params.answers || [2, 3];
        const count = params.count || 6;
        const k = rand(aMin, aMax);
        const others = shuffle(Object.keys(NAMES).filter((n) => n !== target));
        const tiles = Array.from({ length: count }, (_, i) => {
          const [lo, hi] = ranges[i < k ? target : others[i % 2]];
          const deg = rand(lo, hi);
          return angleSvg(deg, i === 0 ? offAxisTurn(deg) : pickF(0, 360), [pickF(30, 60), pickF(30, 60)]);
        });
        const order = shuffle(tiles.map((_, i) => i));
        return {
          type: 'tile-select',
          title: `Clique sur tous les <strong>${NAMES[target]}</strong>.`,
          tiles: order.map((i) => tiles[i]),
          tileAnswers: order.map((i, pos) => (i < k ? pos : -1)).filter((pos) => pos >= 0),
        };
      },
    },

    // comparerAngles: mcq — which of two drawn angles A and B is bigger (or smaller), or are they equal?
    //   params: gap (20 — degrees at least between unequal angles), equal (0 — chance they are equal),
    //   trap (true — the bigger angle has the shorter arms; equal angles get long / short arms),
    //   ask ('grand' | 'petit', random by default)
    comparerAngles: {
      generate(params = {}) {
        const gap = params.gap ?? 20;
        const equal = Math.random() < (params.equal ?? 0);
        const trap = params.trap !== false;
        const ask = params.ask || randItem(['grand', 'petit']);
        let degs;
        do degs = [rand(25, 160), rand(25, 160)];
        while (!equal && Math.abs(degs[0] - degs[1]) < gap);
        if (equal) degs[1] = degs[0];
        const long = () => [rand(52, 60), rand(48, 60)];
        const short = () => [rand(26, 34), rand(26, 36)];
        const free = () => [rand(30, 60), rand(30, 60)];
        const arms = !trap
          ? [free(), free()]
          : equal
            ? shuffle([long(), short()])
            : degs.map((d, i) => (d > degs[1 - i] ? short() : long()));
        const pictures = degs.map((d, i) => angleSvg(d, pickF(0, 360), arms[i], 140));
        const big = degs[0] > degs[1] ? 0 : 1;
        return {
          type: 'mcq',
          title: `Quel angle est le plus ${ask}\u00a0?`,
          body:
            `<div style="display:flex;justify-content:center;gap:1.5rem">` +
            pictures
              .map((svg, i) => `<div style="text-align:center">${svg}<div><strong>${'AB'[i]}</strong></div></div>`)
              .join('') +
            `</div>`,
          mcqChoices: ["L'angle A", "L'angle B", 'Ils sont égaux'],
          mcqAnswer: equal ? 2 : ask === 'grand' ? big : 1 - big,
        };
      },
    },

    // rangerAngles: drag-sort — order 3–4 drawn angles. Picture tiles keep their listed order, which is
    //   the answer. params: count (4), gap (15 — degrees at least between two angles),
    //   direction ('asc' | 'desc', random by default), trap (true — the bigger the angle, the shorter its arms)
    rangerAngles: {
      generate(params = {}) {
        const count = params.count || 4;
        const gap = params.gap ?? 15;
        const direction = params.direction || randItem(['asc', 'desc']);
        // Sorted draws, then spread by `gap`: increasing, at least `gap` apart, within 25–165°
        const degs = Array.from({ length: count }, () => rand(25, 165 - (count - 1) * gap))
          .sort((a, b) => a - b)
          .map((d, i) => d + i * gap);
        const step = 30 / (count - 1);
        const tiles = degs.map((d, i) => {
          const l = () => (params.trap === false ? rand(30, 60) : Math.round(60 - i * step - pickF(0, 4)));
          return angleSvg(d, pickF(0, 360), [l(), l()]);
        });
        return {
          type: 'drag-sort',
          title: `Range les angles du plus ${direction === 'asc' ? 'petit au plus grand' : 'grand au plus petit'}.`,
          direction,
          tiles: direction === 'asc' ? tiles : tiles.reverse(),
        };
      },
    },

    // Tracer sur quadrillage / papier pointé (grid-board, mode draw). task: copy (figure: ortho = outline of
    // cells, free = polygon with slanted sides; anchor: start from a given point), complete (the two missing
    // sides of a square / rectangle), mirror (draw the image of a broken line, axis v / h / vh / diag / any),
    // shape (carre / rectangle / triangleRectangle, ask: sides / area / free / tilted, or a list to draw from), parallel / perp (slopes:
    // axis / diag / any). Points are [r, c], 0…rows / 0…cols.
    tracerGrille: {
      generate(params = {}) {
        const task = randItem([].concat(params.task || 'copy'));
        const paper = params.paper || 'grid';
        const k = ([r, c]) => r + ',' + c;
        const fits = (rows, cols) => (p) => p[0] >= 0 && p[1] >= 0 && p[0] <= rows && p[1] <= cols;
        const ring = (P) => P.map((p, i) => [p, P[(i + 1) % P.length]]);
        const out = (title, board) => ({ type: 'grid-board', title, board: { mode: 'draw', paper, task, ...board } });

        if (task === 'copy') {
          const [rows, cols] = params.size || [6, 8];
          for (let attempt = 0; attempt < 400; attempt++) {
            let model;
            if (params.figure === 'free') {
              // Corners drawn in a small box, kept only if they are all corners of their convex hull
              const [lo, hi] = params.corners || [3, 4];
              const n = rand(lo, hi);
              const box = params.box || 4;
              const pts = Array.from({ length: n }, () => [rand(0, box), rand(0, box)]);
              const hull = convexHull(pts);
              if (hull.length !== n || area2(hull) < 6) continue;
              model = ring(hull);
            } else {
              // Outline of a group of cells: one closed line, no hole, no corners touching
              const [lo, hi] = params.cells || [4, 6];
              const want = rand(lo, hi);
              const box = params.box || 4;
              const cells = [[rand(0, box - 1), rand(0, box - 1)]];
              const has = (p) => cells.some((q) => q[0] === p[0] && q[1] === p[1]);
              while (cells.length < want) {
                const next = cells
                  .flatMap(([r, c]) => [
                    [r - 1, c],
                    [r + 1, c],
                    [r, c - 1],
                    [r, c + 1],
                  ])
                  .filter((p) => p[0] >= 0 && p[1] >= 0 && p[0] < box && p[1] < box && !has(p));
                cells.push(randItem(next));
              }
              model = [];
              for (const [r, c] of cells) {
                if (!has([r - 1, c]))
                  model.push([
                    [r, c],
                    [r, c + 1],
                  ]);
                if (!has([r + 1, c]))
                  model.push([
                    [r + 1, c],
                    [r + 1, c + 1],
                  ]);
                if (!has([r, c - 1]))
                  model.push([
                    [r, c],
                    [r + 1, c],
                  ]);
                if (!has([r, c + 1]))
                  model.push([
                    [r, c + 1],
                    [r + 1, c + 1],
                  ]);
              }
              const deg = {};
              for (const sg of model) for (const p of sg) deg[k(p)] = (deg[k(p)] || 0) + 1;
              if (Object.values(deg).some((d) => d !== 2)) continue;
              if (new Set(cells.map((p) => p[0])).size < 2 || new Set(cells.map((p) => p[1])).size < 2) continue; // not a bar
              model = mergeSegments(model);
              if (loopLength(model) !== model.length) continue; // a hole: two loops
            }
            const pts = model.flat();
            const r0 = Math.min(...pts.map((p) => p[0]));
            const c0 = Math.min(...pts.map((p) => p[1]));
            model = model.map((sg) => sg.map(([r, c]) => [r - r0, c - c0]));
            const h = Math.max(...model.flat().map((p) => p[0]));
            const w = Math.max(...model.flat().map((p) => p[1]));
            if (h > rows || w > cols || h < 1 || w < 1) continue;
            if (!params.anchor) return out('Reproduis la figure sur le quadrillage.', { rows, cols, model });
            const from = randItem(model.map((sg) => sg[0]));
            const to = [rand(from[0], rows - h + from[0]), rand(from[1], cols - w + from[1])];
            return out('Reproduis la figure en partant du point rouge.', { rows, cols, model, anchor: { from, to } });
          }
          throw new Error('tracerGrille: no figure found');
        }

        if (task === 'complete') {
          const [rows, cols] = params.size || [6, 8];
          const shape = randItem(params.shapes || ['carre', 'rectangle']);
          const [lo, hi] = params.side || [2, 4];
          for (let attempt = 0; attempt < 400; attempt++) {
            const u = params.tilted
              ? randItem([
                  [1, 2],
                  [2, 1],
                  [1, 1],
                  [2, -1],
                  [1, -2],
                  [1, -1],
                ])
              : randItem([
                  [0, 1],
                  [1, 0],
                ]);
            const a = params.tilted ? 1 : rand(lo, hi);
            const b = shape === 'carre' ? a : params.tilted ? rand(2, 3) : rand(lo, hi);
            if (shape === 'rectangle' && a === b) continue;
            const U = [u[0] * a, u[1] * a];
            const V = [-u[1] * b, u[0] * b];
            const P0 = [rand(0, rows), rand(0, cols)];
            const P = [
              P0,
              [P0[0] + U[0], P0[1] + U[1]],
              [P0[0] + U[0] + V[0], P0[1] + U[1] + V[1]],
              [P0[0] + V[0], P0[1] + V[1]],
            ];
            if (!P.every(fits(rows, cols))) continue;
            const sides = ring(P);
            const first = rand(0, 3);
            const given = [sides[first], sides[(first + 1) % 4]];
            const title = shape === 'carre' ? 'Termine le carré.' : 'Termine le rectangle.';
            return out(title, { rows, cols, given, target: sides });
          }
          throw new Error('tracerGrille: no shape fits');
        }

        if (task === 'mirror') {
          const AXES = { vh: ['v', 'h'], diag: ['d', 'a'], any: ['v', 'h', 'd', 'a'] };
          const STEPS = params.diagonals
            ? [
                [0, 1],
                [1, 0],
                [0, -1],
                [-1, 0],
                [1, 1],
                [1, -1],
                [-1, 1],
                [-1, -1],
              ]
            : [
                [0, 1],
                [1, 0],
                [0, -1],
                [-1, 0],
              ];
          for (let attempt = 0; attempt < 400; attempt++) {
            const axis = randItem(AXES[params.axis || 'vh'] || [params.axis]);
            const diag = axis === 'd' || axis === 'a';
            const size = params.size || [6, 8];
            const [rows, cols] = diag ? [size[0], size[0]] : axis === 'v' ? [size[0], size[1]] : [size[1], size[0]];
            const at = axis === 'v' ? cols / 2 : rows / 2;
            if (!diag && !Number.isInteger(at)) throw new Error('tracerGrille: the axis needs an even grid');
            const mirror = ([r, c]) =>
              axis === 'v'
                ? [r, 2 * at - c]
                : axis === 'h'
                  ? [2 * at - r, c]
                  : axis === 'd'
                    ? [c, r]
                    : [cols - c, rows - r];
            // Side of the axis: >0 one side, 0 on it
            const side = ([r, c]) =>
              axis === 'v' ? c - at : axis === 'h' ? r - at : axis === 'd' ? r - c : r + c - cols;
            const s = randItem([-1, 1]);
            const ok = (p) => fits(rows, cols)(p) && side(p) * s >= 0;
            const start = [rand(0, rows), rand(0, cols)];
            if (!ok(start)) continue;
            const line = [start];
            const [lo, hi] = params.segments || [3, 4];
            const n = rand(lo, hi);
            for (let t = 0; t < 40 && line.length <= n; t++) {
              const [dr, dc] = randItem(STEPS);
              const len = rand(1, params.maxLen || 2);
              const last = line[line.length - 1];
              const prev = line[line.length - 2];
              const p = [last[0] + dr * len, last[1] + dc * len];
              if (!ok(p) || line.some((q) => q[0] === p[0] && q[1] === p[1])) continue;
              // a real corner: never straight on, never back along the last side
              if (prev && (last[0] - prev[0]) * dc === (last[1] - prev[1]) * dr) continue;
              line.push(p);
            }
            if (line.length <= n) continue;
            const given = line.slice(1).map((p, i) => [line[i], p]);
            // At least two points off the axis; touching the axis or kept a square away from it
            if (line.filter((p) => side(p) !== 0).length < 2) continue;
            if (params.touch !== false && !line.some((p) => side(p) === 0)) continue;
            if (given.some(([p, q]) => side(p) === 0 && side(q) === 0)) continue; // a side along the axis hides it
            if (params.touch === false && line.some((p) => Math.abs(side(p)) < 1)) continue;
            const image = given.map((sg) => sg.map(mirror));
            const board = {
              task: 'complete',
              rows,
              cols,
              given,
              target: [...given, ...image],
              axis: diag ? { axis } : { axis, at },
            };
            return out('Trace le symétrique de la figure par rapport à la droite rouge.', board);
          }
          throw new Error('tracerGrille: no broken line found');
        }

        if (task === 'shape') {
          const [rows, cols] = params.size || [6, 8];
          const shape = randItem(params.shapes || ['carre', 'rectangle', 'triangleRectangle']);
          const ask = randItem([].concat(params.ask || 'sides'));
          const NAME = { carre: 'un carré', rectangle: 'un rectangle', triangleRectangle: 'un triangle rectangle' };
          const [lo, hi] = params.side || [2, 5];
          const plural = (n) => `${n} carreau${n > 1 ? 'x' : ''}`;
          if (ask === 'tilted')
            return out(`Trace ${NAME[shape]} penché : aucun de ses côtés ne suit les lignes du quadrillage.`, {
              rows,
              cols,
              want: { shape, tilted: true },
            });
          if (ask === 'free') return out(`Trace ${NAME[shape]}.`, { rows, cols, want: { shape } });
          if (ask === 'area' && shape !== 'rectangle') {
            // Square: a side that fits; right triangle: half of a rectangle that fits, a whole number of squares
            const a = rand(lo, Math.min(hi, rows, cols));
            if (shape === 'carre')
              return out(`Trace un carré d’aire ${plural(a * a)}.`, { rows, cols, want: { shape, area: a * a } });
            let b = rand(lo, Math.min(hi, cols));
            if ((a * b) % 2) b = b > lo ? b - 1 : b + 1;
            return out(`Trace un triangle rectangle d’aire ${plural((a * b) / 2)}.`, {
              rows,
              cols,
              want: { shape, area: (a * b) / 2 },
            });
          }
          if (ask === 'area') {
            // Rectangles: an area with two ways at least (2 × 6, 3 × 4) that fit
            for (let attempt = 0; attempt < 200; attempt++) {
              const area = rand(params.area ? params.area[0] : 6, params.area ? params.area[1] : 24);
              const ways = [];
              for (let a = 1; a < Math.sqrt(area); a++)
                if (area % a === 0 && area / a <= Math.max(rows, cols) && a <= Math.min(rows, cols)) ways.push(a);
              if (ways.length < 2) continue;
              return out(`Trace un rectangle d’aire ${plural(area)}.`, {
                rows,
                cols,
                want: { shape: 'rectangle', area, inclusive: true },
              });
            }
            throw new Error('tracerGrille: no area found');
          }
          const a = rand(lo, Math.min(hi, rows));
          let b = rand(lo, Math.min(hi, cols));
          if (shape === 'carre')
            return out(`Trace un carré de ${plural(a)} de côté.`, { rows, cols, want: { shape, sides: [a] } });
          if (shape === 'rectangle') {
            if (a === b) b = b > lo ? b - 1 : b + 1;
            const [L, l] = [Math.max(a, b), Math.min(a, b)];
            return out(`Trace un rectangle de ${plural(L)} de long et ${plural(l)} de large.`, {
              rows,
              cols,
              want: { shape, sides: [L, l] },
            });
          }
          return out(
            `Trace un triangle rectangle : les côtés de l’angle droit mesurent ${plural(a)} et ${plural(b)}.`,
            { rows, cols, want: { shape, sides: [a, b] } }
          );
        }

        // parallel / perp
        const [rows, cols] = params.size || [6, 8];
        const DIRS = {
          axis: [
            [0, 1],
            [1, 0],
          ],
          diag: [
            [0, 1],
            [1, 0],
            [1, 1],
            [1, -1],
          ],
          any: [
            [1, 1],
            [1, -1],
            [1, 2],
            [2, 1],
            [1, -2],
            [2, -1],
          ],
        }[params.slopes || 'axis'];
        for (let attempt = 0; attempt < 400; attempt++) {
          const d = randItem(DIRS);
          const n = rand(2, 4);
          const p = [rand(0, rows), rand(0, cols)];
          const ref = [p, [p[0] + d[0] * n, p[1] + d[1] * n]];
          if (!ref.every(fits(rows, cols))) continue;
          const through = [rand(0, rows), rand(0, cols)];
          if ((through[0] - p[0]) * d[1] === (through[1] - p[1]) * d[0]) continue; // on the line
          // Room for 3 steps along the line to draw, through A
          const e = task === 'perp' ? [-d[1], d[0]] : d;
          let room = 0;
          for (const sg of [1, -1])
            for (let t = 1; fits(rows, cols)([through[0] + sg * t * e[0], through[1] + sg * t * e[1]]); t++) room++;
          if (room < 3) continue;
          const word = task === 'perp' ? 'perpendiculaire' : 'parallèle';
          return out(`Trace la droite ${word} à la droite d qui passe par le point A.`, { rows, cols, ref, through });
        }
        throw new Error('tracerGrille: no line found');
      },
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = generators;
  else Object.assign((root.AppGenerators = root.AppGenerators || {}), generators);
})(typeof window !== 'undefined' ? window : globalThis);
