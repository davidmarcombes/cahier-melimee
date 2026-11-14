/**
 * Generators — Espace et géométrie, drawn: droites (droitesPositions), cercle (cercleVocabulaire),
 * axes de symétrie sur quadrillage (axeSymetrie), positions relatives (positionsEspace).
 * Every drawing is read back by scripts/lib/espace.js (lines, points and labels, polygon reflected
 * across the drawn axis, emoji grid) — the answer is recomputed from what the pupil sees.
 * Browser: registers into window.AppGenerators (needs generators/_core.js first) · Node: module.exports
 */
(function (root) {
  const { rand, randItem, shuffle } =
    typeof module !== 'undefined' && module.exports ? require('./_core.js') : root.GenCore;

  const f = (v) => Math.round(v * 10) / 10;
  const pickF = (a, b) => a + Math.random() * (b - a);
  const RAD = Math.PI / 180;
  const svgOpen = (size, w = 100, h = 100) =>
    `<svg viewBox="0 0 ${w} ${h}" width="${size}" height="${f((size * h) / w)}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`;
  const centred = (svg) => `<div style="display:flex;justify-content:center">${svg}</div>`;

  // ─── Droites ────────────────────────────────────────────────────────────────
  // The part of the line through p with direction t (degrees) inside the box [lo, hi]², or null
  function clip(p, t, lo = 6, hi = 94) {
    const d = [Math.cos(t * RAD), -Math.sin(t * RAD)];
    let [a, b] = [-1e9, 1e9];
    for (let i = 0; i < 2; i++) {
      if (Math.abs(d[i]) < 1e-9) {
        if (p[i] < lo || p[i] > hi) return null;
        continue;
      }
      let [u, v] = [(lo - p[i]) / d[i], (hi - p[i]) / d[i]];
      if (u > v) [u, v] = [v, u];
      [a, b] = [Math.max(a, u), Math.min(b, v)];
    }
    if (b - a < 45) return null; // too short to read as a line
    return [
      [p[0] + a * d[0], p[1] + a * d[1]],
      [p[0] + b * d[0], p[1] + b * d[1]],
    ];
  }
  const LINE_COLOURS = ['#2563eb', '#dc2626'];
  const offAxis = (t) => Math.min(((t % 90) + 90) % 90, 90 - (((t % 90) + 90) % 90)) >= 15;

  // Two lines: kind 'perpendiculaires' | 'paralleles' | 'secantes'; near: sécantes almost
  // perpendicular (76–84°) or almost parallel (6–10°, they meet off the drawing); outside: drawn as
  // two segments that stop before they cross; turned: both lines off the axes
  function linesSvg(kind, { near = false, outside = false, turned = false, size = 96 } = {}) {
    for (let tries = 0; tries < 500; tries++) {
      const t1 = pickF(0, 180);
      if (turned && !offAxis(t1)) continue;
      let segs;
      if (kind === 'paralleles') {
        const gap = pickF(16, 30);
        const n = [Math.sin(t1 * RAD), Math.cos(t1 * RAD)];
        const c = [pickF(42, 58), pickF(42, 58)];
        segs = [-1, 1].map((s) => clip([c[0] + (s * gap * n[0]) / 2, c[1] + (s * gap * n[1]) / 2], t1));
      } else {
        let a;
        if (kind === 'perpendiculaires') a = 90;
        else if (near) a = Math.random() < 0.5 ? pickF(76, 84) : pickF(6, 10);
        else a = pickF(28, 62);
        const t2 = t1 + (Math.random() < 0.5 ? a : -a);
        if (turned && !offAxis(t2)) continue;
        let p;
        if (kind === 'secantes' && a < 15) {
          // almost parallel: they meet far off the drawing
          const r = pickF(62, 85);
          const w = pickF(0, 360);
          p = [50 + r * Math.cos(w * RAD), 50 + r * Math.sin(w * RAD)];
          segs = [clip(p, t1), clip(p, t2)];
        } else if (outside) {
          // they meet in the frame, but both are drawn as segments that stop before the crossing
          p = [pickF(30, 70), pickF(30, 70)];
          const inBox = ([x, y]) => x >= 6 && x <= 94 && y >= 6 && y <= 94;
          segs = [t1, t2].map((t) => {
            const d = [Math.cos(t * RAD), -Math.sin(t * RAD)];
            const [g, L] = [pickF(9, 15), pickF(30, 42)];
            for (const s of shuffle([1, -1])) {
              const a0 = [p[0] + s * g * d[0], p[1] + s * g * d[1]];
              const a1 = [p[0] + s * (g + L) * d[0], p[1] + s * (g + L) * d[1]];
              if (inBox(a0) && inBox(a1)) return [a0, a1];
            }
            return null;
          });
        } else {
          p = [pickF(30, 70), pickF(30, 70)];
          segs = [clip(p, t1), clip(p, t2)];
        }
      }
      if (segs.some((s) => !s)) continue;
      return (
        svgOpen(size) +
        segs
          .map(
            ([a, b], i) =>
              `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="${LINE_COLOURS[i]}" stroke-width="3" stroke-linecap="round"/>`
          )
          .join('') +
        '</svg>'
      );
    }
    throw new Error(`linesSvg: no ${kind} lines`);
  }

  // ─── Cercle ─────────────────────────────────────────────────────────────────
  const LETTERS = 'ABCDEFGHIJKLMNOPRSTU'.split('');
  const SEG = (p, q) => `[${p}${q}]`;

  // ─── Axes de symétrie ───────────────────────────────────────────────────────
  const G = 9; // cells across; lattice 0..G, px = 5 + 10 i
  const px = (i) => 5 + 10 * i;
  // Half of a figure (u ≥ 0) as a chain from the axis down and back to the axis: rows going down,
  // each a half-width, joined straight or by a step
  function halfChain() {
    const rows = rand(2, 4);
    const ys = [0];
    while (ys.length < rows) ys.push(ys[ys.length - 1] + rand(1, 3));
    const ws = ys.map(() => rand(1, 3));
    if (Math.random() < 0.4) ws[0] = 0;
    if (Math.random() < 0.4) ws[ws.length - 1] = 0;
    const chain = [];
    ws.forEach((w, i) => {
      if (i && Math.random() < 0.5 && ws[i - 1] !== w) chain.push([ws[i - 1], ys[i]]); // step: down, then across
      chain.push([w, ys[i]]);
    });
    return chain;
  }
  // Full polygon from the half: right side down, mirror back up; points on the axis appear once
  function mirrorPolygon(half) {
    const right = half;
    const left = [...half].reverse().map(([u, v]) => [-u, v]);
    const pts = [...right, ...left];
    if (half[0][0] === 0) pts.pop(); // top point on the axis, already first
    const out = [];
    for (const p of pts) if (!out.length || String(out[out.length - 1]) !== String(p)) out.push(p);
    return dropCollinear(out);
  }
  function dropCollinear(pts) {
    const n = pts.length;
    return pts.filter((p, i) => {
      const a = pts[(i + n - 1) % n];
      const b = pts[(i + 1) % n];
      return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) !== 0;
    });
  }
  const segCross = (a, b, c, d) => {
    const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
  };
  function simple(pts) {
    const n = pts.length;
    if (n < 3 || new Set(pts.map(String)).size !== n) return false;
    for (let i = 0; i < n; i++)
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        if (segCross(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) return false;
      }
    return true;
  }
  // axis kinds: local (u, v) with the axis u = 0 → lattice (x, y)
  const AXIS_MAPS = {
    vertical: ([u, v]) => [u, v],
    horizontal: ([u, v]) => [v, u],
    diagonal: ([u, v]) => [u + v, v - u],
    antidiagonal: ([u, v]) => [-(u + v), v - u],
  };
  // Reflection across the line through lattice point c with direction d, exact on the lattice
  const reflect = ([x, y], c, d) => {
    const [px0, py0] = [x - c[0], y - c[1]];
    const k = (2 * (px0 * d[0] + py0 * d[1])) / (d[0] * d[0] + d[1] * d[1]);
    return [c[0] + k * d[0] - px0, c[1] + k * d[1] - py0];
  };
  const sameSet = (P, Q) => {
    const key = (p) => p.map((v) => Math.round(v * 1000) / 1000).join();
    const s = new Set(P.map(key));
    return Q.length === P.length && Q.every((q) => s.has(key(q)));
  };
  const symmetricAbout = (pts, c, d) => {
    const corners = dropCollinear(pts);
    return sameSet(
      corners,
      corners.map((p) => reflect(p, c, d))
    );
  };

  function axisTile({ pts, c, d }, colour, size) {
    // the axis drawn across the whole grid
    const ends = [];
    for (let t = -40; t <= 40; t += 0.25) {
      const p = [c[0] + t * d[0], c[1] + t * d[1]];
      if (p[0] >= -0.001 && p[0] <= G + 0.001 && p[1] >= -0.001 && p[1] <= G + 0.001) ends.push(p);
    }
    const [a, b] = [ends[0], ends[ends.length - 1]];
    let grid = '';
    for (let i = 0; i <= G; i++) grid += `M${px(i)} 5V95M5 ${px(i)}H95`;
    return (
      svgOpen(size) +
      `<path d="${grid}" stroke="var(--ct)" stroke-opacity="0.18" stroke-width="0.6" fill="none"/>` +
      `<polygon points="${pts.map(([x, y]) => `${px(x)},${px(y)}`).join(' ')}" fill="${colour}" fill-opacity="0.55" stroke="var(--ct)" stroke-width="1.6" stroke-linejoin="round"/>` +
      `<line x1="${f(px(a[0]))}" y1="${f(px(a[1]))}" x2="${f(px(b[0]))}" y2="${f(px(b[1]))}" stroke="#dc2626" stroke-width="2.4" stroke-dasharray="6 3"/>` +
      '</svg>'
    );
  }

  // A figure symmetric about an axis of the given kind, placed on the grid: { pts, c, d } (lattice)
  function symmetricFigure(kind) {
    for (let tries = 0; tries < 300; tries++) {
      const local = mirrorPolygon(halfChain());
      if (!simple(local)) continue;
      const map = AXIS_MAPS[kind];
      let pts = local.map(map);
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const [w, h] = [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
      if (w > G - 2 || h > G - 2 || w < 2 || h < 2) continue;
      const [ox, oy] = [rand(1, G - 1 - w) - Math.min(...xs), rand(1, G - 1 - h) - Math.min(...ys)];
      pts = pts.map(([x, y]) => [x + ox, y + oy]);
      const c = [map([0, 0])[0] + ox, map([0, 0])[1] + oy];
      const d = map([0, 1]);
      return { pts, c, d };
    }
    throw new Error('axeSymetrie: no figure');
  }

  // ─── Positions ──────────────────────────────────────────────────────────────
  const ANIMALS = ['🐱', '🐶', '🐰', '🦊', '🐻', '🐼', '🐸', '🐵', '🦁', '🐮', '🐷', '🐔', '🦉', '🐢', '🐞', '🦋'];
  const DIRS = {
    droite: [0, 1, 'juste à droite de'],
    gauche: [0, -1, 'juste à gauche de'],
    dessus: [-1, 0, 'juste au-dessus de'],
    dessous: [1, 0, 'juste au-dessous de'],
  };

  const generators = {
    // droitesPositions — params: target ('perpendiculaires' | 'paralleles'), ask ('trouver' tile-select:
    //   tap every pair of the target kind | 'classer' mcq: parallèles / perpendiculaires / sécantes non
    //   perpendiculaires for one pair), near (false — sécantes almost perpendicular or almost parallel),
    //   outside (0 — share of perpendicular / sécantes pairs that meet off the drawing), count (6),
    //   answers ([2, 3]). One answer at least has both lines off the axes.
    droitesPositions: {
      generate(params = {}) {
        const near = !!params.near;
        const outside = () => Math.random() < (params.outside || 0);
        if (params.ask === 'classer') {
          const kind = randItem(['perpendiculaires', 'paralleles', 'secantes']);
          const choices = ['parallèles', 'perpendiculaires', 'sécantes, mais pas perpendiculaires'];
          return {
            type: 'mcq',
            title: 'Comment sont ces deux droites ?',
            body:
              centred(linesSvg(kind, { near, outside: outside(), turned: Math.random() < 0.7, size: 160 })) +
              '<p>Des droites continuent au-delà du dessin. Vérifie avec ton équerre.</p>',
            mcqChoices: choices,
            mcqAnswer: { paralleles: 0, perpendiculaires: 1, secantes: 2 }[kind],
          };
        }
        const target = params.target || 'perpendiculaires';
        if (!['perpendiculaires', 'paralleles'].includes(target))
          throw new Error(`droitesPositions: unknown target « ${target} »`);
        const others = target === 'perpendiculaires' ? ['secantes', 'paralleles'] : ['secantes', 'perpendiculaires'];
        const [aMin, aMax] = params.answers || [2, 3];
        const count = params.count || 6;
        const k = rand(aMin, aMax);
        const tiles = [];
        for (let i = 0; i < count; i++) {
          const kind = i < k ? target : others[i % 2];
          let t;
          do t = linesSvg(kind, { near, outside: kind !== 'paralleles' && outside(), turned: i === 0 });
          while (tiles.includes(t));
          tiles.push(t);
        }
        const order = shuffle(tiles.map((_, i) => i));
        return {
          type: 'tile-select',
          title: `Clique sur toutes les paires de droites <strong>${target === 'paralleles' ? 'parallèles' : 'perpendiculaires'}</strong>.`,
          tiles: order.map((i) => tiles[i]),
          tileAnswers: order.map((i, pos) => (i < k ? pos : -1)).filter((pos) => pos >= 0),
        };
      },
    },

    // cercleVocabulaire: mcq — a circle with its centre, a radius, a diameter, a chord and a segment from
    //   the centre that stops short of the circle (or goes past it), every point lettered at random.
    //   params: ask (['centre', 'rayon', 'diametre'] — one at random; 'corde' too at the CM)
    cercleVocabulaire: {
      generate(params = {}) {
        const ask = randItem(params.ask || ['centre', 'rayon', 'diametre']);
        for (let tries = 0; tries < 5000; tries++) {
          const r = pickF(32, 38);
          const C = [50 + pickF(-4, 4), 50 + pickF(-4, 4)];
          // directions: radius end, diameter ends (opposite), chord ends, fake segment end
          const tR = pickF(0, 360);
          const tD = pickF(0, 360);
          const tK1 = pickF(0, 360);
          const tK2 = tK1 + (Math.random() < 0.5 ? 1 : -1) * pickF(70, 130);
          const tF = pickF(0, 360);
          const dirs = [tR, tD, tD + 180, tK1, tK2, tF];
          const sep = (a, b) => {
            const d = Math.abs((((a - b) % 360) + 360) % 360);
            return Math.min(d, 360 - d);
          };
          if (dirs.some((a, i) => dirs.some((b, j) => i < j && sep(a, b) < 32))) continue;
          // the chord stays clear of the centre
          const at = (t, k = r) => [C[0] + k * Math.cos(t * RAD), C[1] + k * Math.sin(t * RAD)];
          const [K1, K2] = [at(tK1), at(tK2)];
          const mid = [(K1[0] + K2[0]) / 2, (K1[1] + K2[1]) / 2];
          if (Math.hypot(mid[0] - C[0], mid[1] - C[1]) < 0.35 * r) continue;
          const fk = Math.random() < 0.6 ? pickF(0.45, 0.7) : pickF(1.2, 1.3);
          const pts = { c: C, r: at(tR), d1: at(tD), d2: at(tD + 180), k1: K1, k2: K2, f: at(tF, fk * r) };
          if (Object.values(pts).some(([x, y]) => x < 8 || x > 92 || y < 8 || y > 92)) continue;
          const L = shuffle(LETTERS).slice(0, 7);
          const name = Object.fromEntries(Object.keys(pts).map((k, i) => [k, L[i]]));
          const segs = [
            ['c', 'r'],
            ['d1', 'd2'],
            ['k1', 'k2'],
            ['c', 'f'],
          ];
          let svg =
            svgOpen(240) +
            `<circle cx="${f(C[0])}" cy="${f(C[1])}" r="${f(r)}" fill="none" stroke="var(--ct)" stroke-width="1.8"/>`;
          for (const [a, b] of segs)
            svg += `<line x1="${f(pts[a][0])}" y1="${f(pts[a][1])}" x2="${f(pts[b][0])}" y2="${f(pts[b][1])}" stroke="#2563eb" stroke-width="1.8"/>`;
          const labelled = [];
          for (const [k, p] of Object.entries(pts)) {
            const out =
              k === 'c'
                ? [0.7, 0.7]
                : [
                    (p[0] - C[0]) / Math.hypot(p[0] - C[0], p[1] - C[1]),
                    (p[1] - C[1]) / Math.hypot(p[0] - C[0], p[1] - C[1]),
                  ];
            // the centre's label goes where no segment leaves it
            let lp = [p[0] + out[0] * 8, p[1] + out[1] * 8 + 3];
            if (k === 'c') {
              const away = (tR + tF) / 2 + (sep(tR, tF) > 180 ? 0 : 180);
              lp = [p[0] + 8 * Math.cos(away * RAD), p[1] + 8 * Math.sin(away * RAD) + 3];
            }
            labelled.push([p, [lp[0], lp[1] - 3]]);
            svg +=
              `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="1.8" fill="var(--ct)"/>` +
              `<text x="${f(lp[0])}" y="${f(lp[1])}" text-anchor="middle" font-size="9" font-family="system-ui,sans-serif" fill="var(--ct)">${name[k]}</text>`;
          }
          svg += '</svg>';
          // each letter clearly next to its own point (4 px closer than to any other) and inside the frame
          const d2 = (u, v) => Math.hypot(u[0] - v[0], u[1] - v[1]);
          if (
            labelled.some(
              ([p, l]) =>
                l[0] < 4 ||
                l[0] > 96 ||
                l[1] < 6 ||
                l[1] > 96 ||
                labelled.some(([q]) => q !== p && d2(q, l) < d2(p, l) + 4)
            )
          )
            continue;
          let title;
          let choices;
          let right;
          if (ask === 'centre') {
            title = 'Quel point est le <strong>centre</strong> du cercle ?';
            right = name.c;
            choices = shuffle([right, ...shuffle([name.r, name.d1, name.k1, name.f]).slice(0, 3)]);
          } else {
            const S = {
              rayon: SEG(name.c, name.r),
              diametre: SEG(name.d1, name.d2),
              corde: SEG(name.k1, name.k2),
              faux: SEG(name.c, name.f),
            };
            right = S[ask];
            const pool = ask === 'corde' ? [S.rayon, S.faux] : Object.values(S).filter((s) => s !== right);
            choices = shuffle([right, ...pool]);
            title = {
              rayon: 'Quel segment est un <strong>rayon</strong> du cercle ?',
              diametre: 'Quel segment est un <strong>diamètre</strong> du cercle ?',
              corde: 'Quel segment est une <strong>corde</strong> du cercle, mais pas un diamètre ?',
            }[ask];
            if (!title) throw new Error(`cercleVocabulaire: unknown ask « ${ask} »`);
          }
          return {
            type: 'mcq',
            title,
            body: centred(svg),
            mcqChoices: choices,
            mcqAnswer: choices.indexOf(right),
            mcqCompact: true,
          };
        }
        throw new Error('cercleVocabulaire: no drawing');
      },
    },

    // axeSymetrie: tile-select — figures on squared paper, each with a red dashed line: tap the ones
    //   where the line is an axis of symmetry. Wrong tiles: the line moved one square, the line in
    //   another direction, or the figure with one corner moved. params: axes (['vertical',
    //   'horizontal'] — 'diagonal', 'antidiagonal' at the CM), count (6), answers ([2, 3])
    axeSymetrie: {
      generate(params = {}) {
        const axes = params.axes || ['vertical', 'horizontal'];
        const [aMin, aMax] = params.answers || [2, 3];
        const count = params.count || 6;
        const k = rand(aMin, aMax);
        const COLOURS = ['#60a5fa', '#f87171', '#4ade80', '#facc15', '#c084fc', '#fb923c'];
        const tiles = [];
        let guard = 0;
        while (tiles.length < count && guard++ < 2000) {
          const want = tiles.length < k;
          const kind = randItem(axes);
          const fig = symmetricFigure(kind);
          let shown = fig;
          if (!want) {
            const trap = randItem(['shift', 'turn', 'corner']);
            if (trap === 'shift') {
              // one square across: a vertical / diagonal axis moves sideways, a horizontal one down or up
              const sh = Math.random() < 0.5 ? 1 : -1;
              shown = { ...fig, c: fig.d[1] === 0 ? [fig.c[0], fig.c[1] + sh] : [fig.c[0] + sh, fig.c[1]] };
            } else if (trap === 'turn') {
              const PERP = {
                vertical: 'horizontal',
                horizontal: 'vertical',
                diagonal: 'antidiagonal',
                antidiagonal: 'diagonal',
              };
              const others = axes.filter((a) => a !== kind);
              const other = others.length ? randItem(others) : PERP[kind];
              const xs = fig.pts.map((p) => p[0]);
              const ys = fig.pts.map((p) => p[1]);
              const mid = [
                Math.round((Math.min(...xs) + Math.max(...xs)) / 2),
                Math.round((Math.min(...ys) + Math.max(...ys)) / 2),
              ];
              shown = { ...fig, c: mid, d: AXIS_MAPS[other]([0, 1]) };
            } else {
              const i = rand(0, fig.pts.length - 1);
              const step = randItem([
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
              ]);
              const pts = fig.pts.map((p, j) => (j === i ? [p[0] + step[0], p[1] + step[1]] : p));
              if (!simple(pts) || pts.some(([x, y]) => x < 0 || y < 0 || x > G || y > G)) continue;
              shown = { ...fig, pts };
            }
          }
          const ok = symmetricAbout(shown.pts, shown.c, shown.d);
          if (ok !== want) continue;
          const t = axisTile(shown, COLOURS[tiles.length % COLOURS.length], 110);
          if (!tiles.includes(t)) tiles.push(t);
        }
        if (tiles.length < count) throw new Error('axeSymetrie: not enough tiles');
        const order = shuffle(tiles.map((_, i) => i));
        return {
          type: 'tile-select',
          title: 'Clique sur toutes les figures où la droite rouge est un <strong>axe de symétrie</strong>.',
          tiles: order.map((i) => tiles[i]),
          tileAnswers: order.map((i, pos) => (i < k ? pos : -1)).filter((pos) => pos >= 0),
        };
      },
    },

    // positionsEspace: mcq — animals on 3 shelves of 4: who is just right of / left of / above / below
    //   an animal, or between two? params: ask (['droite', 'gauche', 'dessus', 'dessous', 'entre'])
    positionsEspace: {
      generate(params = {}) {
        const ask = randItem(params.ask || ['droite', 'gauche', 'dessus', 'dessous', 'entre']);
        const [R, Cn] = [3, 4];
        const animals = shuffle(ANIMALS).slice(0, R * Cn);
        const at = (r, c) => (r >= 0 && r < R && c >= 0 && c < Cn ? animals[r * Cn + c] : null);
        let title;
        let right;
        let r;
        let c;
        if (ask === 'entre') {
          [r, c] = [rand(0, R - 1), rand(0, Cn - 3)];
          right = at(r, c + 1);
          title = `Qui est <strong>entre</strong> ${at(r, c)} et ${at(r, c + 2)} ?`;
        } else {
          const [dr, dc, words] = DIRS[ask] || [];
          if (!words) throw new Error(`positionsEspace: unknown ask « ${ask} »`);
          do [r, c] = [rand(0, R - 1), rand(0, Cn - 1)];
          while (!at(r + dr, c + dc));
          right = at(r + dr, c + dc);
          title = `Qui est <strong>${words}</strong> ${at(r, c)} ?`;
        }
        // traps: the neighbours in the other directions first
        const near = Object.values(DIRS)
          .map(([dr, dc]) => at(r + dr, c + dc))
          .concat(ask === 'entre' ? [at(r - 1, c + 1), at(r + 1, c + 1)] : [])
          .filter((a) => a && a !== right && !title.includes(a));
        const rest = shuffle(animals.filter((a) => a !== right && !near.includes(a) && !title.includes(a)));
        const choices = shuffle([right, ...shuffle(near).slice(0, 2), ...rest].slice(0, 4));
        const W = 200;
        let svg = svgOpen(260, W, 150);
        for (let i = 0; i < R; i++) {
          const y = 46 + i * 46;
          svg += `<rect x="6" y="${y}" width="${W - 12}" height="5" rx="2" fill="#b45309"/>`;
          for (let j = 0; j < Cn; j++)
            svg += `<text x="${30 + j * 47}" y="${y - 6}" text-anchor="middle" font-size="32">${at(i, j)}</text>`;
        }
        svg += '</svg>';
        return {
          type: 'mcq',
          title,
          body: centred(svg),
          mcqChoices: choices,
          mcqAnswer: choices.indexOf(right),
          mcqCompact: true,
        };
      },
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = generators;
  else Object.assign((root.AppGenerators = root.AppGenerators || {}), generators);
})(typeof window !== 'undefined' ? window : globalThis);
