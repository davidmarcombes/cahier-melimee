/**
 * Generators — Solides drawn in perspective cavalière (depth drawn at 45°, half its length), hidden
 * edges dashed: trouverSolides (tile-select), compterSolide (number-check), nommerSolide (mcq).
 * Polyhedra come from their vertices and faces: a face is seen when its outward normal points to the
 * viewer, an edge is dashed when both its faces are hidden. Every drawing is read back by
 * scripts/lib/solides.js (edges → vertices and faces by Euler, edge lengths → cube or pavé).
 * Browser: registers into window.AppGenerators (needs generators/_core.js first) · Node: module.exports
 */
(function (root) {
  const { rand, randItem, shuffle } =
    typeof module !== 'undefined' && module.exports ? require('./_core.js') : root.GenCore;

  const f = (v) => Math.round(v * 10) / 10;
  const pickF = (a, b) => a + Math.random() * (b - a);
  const DEPTH = 0.5 * Math.SQRT1_2; // cavalière: a depth of 1 is drawn 0.35 right (or left) and 0.35 up
  const COLOURS = ['#60a5fa', '#f87171', '#4ade80', '#facc15', '#c084fc', '#fb923c'];
  const INK = 'stroke="var(--ct)" stroke-linecap="round"';

  // [name with article, plural, feminine]
  const NAMES = {
    cube: ['un cube', 'cubes', false],
    pave: ['un pavé droit', 'pavés droits', false],
    pyramide: ['une pyramide', 'pyramides', true],
    prisme: ['un prisme', 'prismes', false],
    cylindre: ['un cylindre', 'cylindres', false],
    cone: ['un cône', 'cônes', false],
    boule: ['une boule', 'boules', true],
  };
  const POLYHEDRA = ['cube', 'pave', 'pyramide', 'prisme'];
  // Distractors that look alike come first
  const AMONG = {
    cube: ['pave', 'prisme', 'pyramide', 'cylindre'],
    pave: ['prisme', 'cube', 'cylindre', 'pyramide'],
    pyramide: ['prisme', 'cone', 'cube', 'pave'],
    prisme: ['pyramide', 'pave', 'cylindre', 'cube'],
    cylindre: ['cone', 'pave', 'boule', 'prisme'],
    cone: ['pyramide', 'cylindre', 'boule', 'prisme'],
    boule: ['cylindre', 'cone', 'cube', 'pyramide'],
  };
  const FACES = {
    cube: '6 carrés',
    pave: '6 rectangles',
    pyramide: '1 carré et 4 triangles',
    prisme: '2 triangles et 3 rectangles',
  };
  const FACE_TRAPS = [
    '4 triangles',
    '2 carrés et 4 rectangles',
    '5 triangles',
    '8 carrés',
    '3 triangles et 2 rectangles',
  ];
  // Everyday objects and the solid they look like
  const OBJECTS = {
    cube: ['🎲', '🧊'],
    pave: ['📦', '🧱'],
    prisme: ['⛺', '🧀'],
    cylindre: ['🥫', '🪵', '🥁', '🧻'],
    cone: ['🍦', '🥕'],
    boule: ['⚽', '🏀', '🌍', '🍊'],
  };

  // ─── Polyhedra: vertices [x, y, z] (y up, z away from the viewer), faces as vertex indices ────
  function polyhedron(kind) {
    if (kind === 'cube' || kind === 'pave') {
      let [a, b, c] = Array(3).fill(rand(5, 7) * 10);
      if (kind === 'pave')
        for (;;) {
          [a, b, c] = [rand(3, 10), rand(3, 10), rand(3, 10)].map((v) => v * 10);
          const s = [a, b, c].sort((x, y) => x - y);
          if (s[1] / s[0] >= 1.3 && s[2] / s[1] >= 1.3) break;
        }
      return {
        V: [
          [0, 0, 0],
          [a, 0, 0],
          [a, b, 0],
          [0, b, 0],
          [0, 0, c],
          [a, 0, c],
          [a, b, c],
          [0, b, c],
        ],
        F: [
          [0, 1, 2, 3],
          [4, 5, 6, 7],
          [0, 1, 5, 4],
          [3, 2, 6, 7],
          [0, 3, 7, 4],
          [1, 2, 6, 5],
        ],
      };
    }
    if (kind === 'pyramide') {
      const a = rand(5, 8) * 10;
      const h = a * pickF(0.8, 1.3);
      return {
        V: [
          [0, 0, 0],
          [a, 0, 0],
          [a, 0, a],
          [0, 0, a],
          [a / 2, h, a / 2],
        ],
        F: [
          [0, 1, 2, 3],
          [0, 1, 4],
          [1, 2, 4],
          [2, 3, 4],
          [3, 0, 4],
        ],
      };
    }
    // prisme: a triangle in front, pushed back (lying down, the end triangles would be drawn as slivers)
    const a = rand(5, 8) * 10;
    const h = a * pickF(0.75, 1);
    const L = a * pickF(2, 2.8);
    return {
      V: [
        [0, 0, 0],
        [a, 0, 0],
        [a / 2, h, 0],
        [0, 0, L],
        [a, 0, L],
        [a / 2, h, L],
      ],
      F: [
        [0, 1, 2],
        [3, 4, 5],
        [0, 1, 4, 3],
        [1, 2, 5, 4],
        [2, 0, 3, 5],
      ],
    };
  }

  const sub = (p, q) => p.map((v, i) => v - q[i]);
  const dot = (p, q) => p.reduce((s, v, i) => s + v * q[i], 0);
  const cross = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
  const mean = (pts) => pts[0].map((_, i) => pts.reduce((s, p) => s + p[i], 0) / pts.length);

  // Projected points fitted in a 100 × 100 box (y down), margin 8
  function fit(pts2, span = 84) {
    const xs = pts2.map((p) => p[0]);
    const ys = pts2.map((p) => p[1]);
    const [w, h] = [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
    const k = span / Math.max(w, h);
    const [ox, oy] = [
      50 - ((Math.max(...xs) + Math.min(...xs)) / 2) * k,
      50 + ((Math.max(...ys) + Math.min(...ys)) / 2) * k,
    ];
    return pts2.map(([x, y]) => [f(ox + x * k), f(oy - y * k)]);
  }

  const svgOpen = (size) =>
    `<svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`;

  // A polyhedron in cavalière, seen from the right (m = 1) or the left (m = -1); null when a face
  // is almost edge-on (it would read as a line)
  function polySvg(kind, size, colour) {
    const { V, F } = polyhedron(kind);
    const m = Math.random() < 0.5 ? 1 : -1;
    // depth at 45° (cube and pavé: the checker reads their lengths so); a prism's at 25°, or it runs
    // along the sides of its triangle
    const [dx, dy] = kind === 'prisme' ? [0.5 * Math.cos(0.436), 0.5 * Math.sin(0.436)] : [DEPTH, DEPTH];
    const view = [m * dx, dy, -1];
    const C = mean(V);
    const seen = [];
    for (const face of F) {
      const P = face.map((i) => V[i]);
      let n = cross(sub(P[1], P[0]), sub(P[2], P[0]));
      if (dot(n, sub(mean(P), C)) < 0) n = n.map((v) => -v);
      const s = dot(n, view) / Math.hypot(...n);
      if (Math.abs(s) < 0.1) return null;
      seen.push(s > 0);
    }
    const P = fit(
      V.map(([x, y, z]) => [x + m * dx * z, y + dy * z]),
      pickF(60, 84)
    );
    const edges = new Map();
    F.forEach((face, k) =>
      face.forEach((a, i) => {
        const b = face[(i + 1) % face.length];
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        edges.set(key, edges.get(key) || false || seen[k]);
      })
    );
    const line = (key, dashed) => {
      const [a, b] = key.split('-').map(Number);
      return (
        `<line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}" ${INK}` +
        (dashed ? ' stroke-width="1.5" stroke-dasharray="4 3"/>' : ' stroke-width="2.5"/>')
      );
    };
    const shades = [0.25, 0.45, 0.65];
    const faces = F.filter((_, k) => seen[k])
      .map((face) => face.map((i) => P[i]))
      .sort((p, q) => mean(p)[1] - mean(q)[1])
      .map(
        (pts, i) =>
          `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="${colour}" fill-opacity="${shades[Math.min(i, 2)]}"/>`
      )
      .join('');
    const keys = [...edges.keys()];
    return (
      svgOpen(size) +
      faces +
      keys
        .filter((k) => !edges.get(k))
        .map((k) => line(k, true))
        .join('') +
      keys
        .filter((k) => edges.get(k))
        .map((k) => line(k, false))
        .join('') +
      '</svg>'
    );
  }

  // Curved solids, upright. The back half of a base or of the equator is dashed.
  function roundSvg(kind, size, colour) {
    const arc = (x1, y, x2, rx, ry, sweep, dashed) =>
      `<path d="M${f(x1)} ${f(y)} A${f(rx)} ${f(ry)} 0 0 ${sweep} ${f(x2)} ${f(y)}" fill="none" ${INK}` +
      (dashed ? ' stroke-width="1.5" stroke-dasharray="4 3"/>' : ' stroke-width="2.5"/>');
    const ln = (x1, y1, x2, y2) =>
      `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" ${INK} stroke-width="2.5"/>`;
    if (kind === 'boule') {
      const r = pickF(36, 42);
      const ry = r * pickF(0.22, 0.32);
      return (
        svgOpen(size) +
        `<circle cx="50" cy="50" r="${f(r)}" fill="${colour}" fill-opacity="0.45" ${INK} stroke-width="2.5"/>` +
        arc(50 - r, 50, 50 + r, r, ry, 1, true) +
        arc(50 - r, 50, 50 + r, r, ry, 0, false) +
        '</svg>'
      );
    }
    // cylindre / cône: radius rx, flattened bases ry, height h — fitted to 84 px
    let rx = pickF(14, 30);
    let h = pickF(24, 60);
    let ry = rx * pickF(0.28, 0.38);
    const k = 84 / Math.max(2 * rx, h + 2 * ry);
    [rx, h, ry] = [rx * k, h * k, ry * k];
    const top = 50 - (h + 2 * ry) / 2 + ry;
    const base = top + h;
    const [xl, xr] = [50 - rx, 50 + rx];
    if (kind === 'cylindre')
      return (
        svgOpen(size) +
        `<path d="M${f(xl)} ${f(top)} L${f(xl)} ${f(base)} A${f(rx)} ${f(ry)} 0 0 0 ${f(xr)} ${f(base)} L${f(xr)} ${f(top)} Z" fill="${colour}" fill-opacity="0.45"/>` +
        `<ellipse cx="50" cy="${f(top)}" rx="${f(rx)}" ry="${f(ry)}" fill="${colour}" fill-opacity="0.25" ${INK} stroke-width="2.5"/>` +
        arc(xl, base, xr, rx, ry, 1, true) +
        arc(xl, base, xr, rx, ry, 0, false) +
        ln(xl, top, xl, base) +
        ln(xr, top, xr, base) +
        '</svg>'
      );
    const apex = top - ry;
    return (
      svgOpen(size) +
      `<path d="M50 ${f(apex)} L${f(xl)} ${f(base)} A${f(rx)} ${f(ry)} 0 0 0 ${f(xr)} ${f(base)} Z" fill="${colour}" fill-opacity="0.45"/>` +
      arc(xl, base, xr, rx, ry, 1, true) +
      arc(xl, base, xr, rx, ry, 0, false) +
      ln(50, apex, xl, base) +
      ln(50, apex, xr, base) +
      '</svg>'
    );
  }

  function solidSvg(kind, size = 96, colour = randItem(COLOURS)) {
    if (!POLYHEDRA.includes(kind)) return roundSvg(kind, size, colour);
    for (;;) {
      const s = polySvg(kind, size, colour);
      if (s) return s;
    }
  }

  const centred = (svg) => `<div style="display:flex;justify-content:center">${svg}</div>`;
  const HIDDEN_NOTE = '<p>Les arêtes cachées sont en pointillés.</p>';
  const WORDS = { faces: 'faces', sommets: 'sommets', aretes: 'arêtes' };
  const COUNTS = {
    cube: { faces: 6, sommets: 8, aretes: 12 },
    pave: { faces: 6, sommets: 8, aretes: 12 },
    pyramide: { faces: 5, sommets: 5, aretes: 8 },
    prisme: { faces: 5, sommets: 6, aretes: 9 },
  };

  const generators = {
    // trouverSolides: tile-select — tap every <target> among solids drawn in perspective.
    //   params: target ('cube' | 'pave' | 'pyramide' | 'prisme' | 'cylindre' | 'cone' | 'boule'),
    //   among (distractor kinds, default: the look-alikes; a cube never stands among pavés: it is one),
    //   count (6), answers ([2, 3]). Hidden edges are always dashed (the checker counts them).
    trouverSolides: {
      generate(params = {}) {
        const target = params.target || 'cube';
        if (!NAMES[target]) throw new Error(`trouverSolides: unknown target « ${target} »`);
        let among = (params.among || AMONG[target]).filter((k) => k !== target && NAMES[k]);
        if (target === 'pave') among = among.filter((k) => k !== 'cube');
        const [aMin, aMax] = params.answers || [2, 3];
        const count = params.count || 6;
        const k = rand(aMin, aMax);
        const kinds = Array.from({ length: count }, (_, i) => (i < k ? target : among[(i - k) % among.length]));
        const tiles = [];
        for (const kind of kinds) {
          let t;
          do t = solidSvg(kind, 96);
          while (tiles.includes(t));
          tiles.push(t);
        }
        const order = shuffle(tiles.map((_, i) => i));
        const [, plural, fem] = NAMES[target];
        return {
          type: 'tile-select',
          title: `Clique sur ${fem ? 'toutes' : 'tous'} les <strong>${plural}</strong>.`,
          tiles: order.map((i) => tiles[i]),
          tileAnswers: order.map((i, pos) => (i < k ? pos : -1)).filter((pos) => pos >= 0),
        };
      },
    },

    // compterSolide: number-check — count the faces, vertices or edges of a polyhedron drawn with its
    //   hidden edges dashed. params: solids (['cube', 'pave', 'pyramide', 'prisme']),
    //   ask (['faces', 'sommets', 'aretes'] — one drawn at random)
    compterSolide: {
      generate(params = {}) {
        const kind = randItem((params.solids || POLYHEDRA).filter((k) => POLYHEDRA.includes(k)));
        const ask = randItem(params.ask || Object.keys(WORDS));
        if (!WORDS[ask]) throw new Error(`compterSolide: unknown ask « ${ask} »`);
        return {
          type: 'number-check',
          bodyFirst: true,
          body: centred(solidSvg(kind, 150)) + HIDDEN_NOTE,
          operation: `Ce__solide__a__?__${WORDS[ask]}.`,
          answers: [String(COUNTS[kind][ask])],
        };
      },
    },

    // nommerSolide: mcq. params: ask ('nom' | 'faces' | 'objet'), solids (kinds drawn; 'faces' keeps the
    //   polyhedra; 'objet' the kinds with an everyday object). nom: name the drawn solid; faces: which
    //   figures make its faces; objet: which drawn solid looks like an object (emoji) — the choices are drawings.
    nommerSolide: {
      generate(params = {}) {
        const ask = params.ask || 'nom';
        let solids = params.solids || Object.keys(NAMES);
        if (ask === 'faces') solids = solids.filter((k) => FACES[k]);
        if (ask === 'objet') solids = solids.filter((k) => OBJECTS[k]);
        if (!solids.length) throw new Error(`nommerSolide: no solid for ask « ${ask} »`);
        const kind = randItem(solids);
        if (ask === 'objet') {
          const emoji = randItem(OBJECTS[kind]);
          const others = shuffle(AMONG[kind].filter((k) => k !== kind && !(kind === 'pave' && k === 'cube'))).slice(
            0,
            3
          );
          const kinds = shuffle([kind, ...others]);
          return {
            type: 'mcq',
            title: `Quel solide ressemble à <span style="font-size:1.6em">${emoji}</span> ?`,
            mcqChoices: kinds.map((k) => solidSvg(k, 80)),
            mcqAnswer: kinds.indexOf(kind),
            mcqCompact: true,
          };
        }
        let right, wrong;
        if (ask === 'faces') {
          right = FACES[kind];
          wrong = [...Object.values(FACES), ...FACE_TRAPS].filter(
            (c) => c !== right && !(kind === 'cube' && c === '6 rectangles')
          );
        } else {
          right = NAMES[kind][0];
          const alike = AMONG[kind].map((k) => NAMES[k][0]);
          wrong = [...alike.slice(0, 2), ...shuffle(alike.slice(2))];
        }
        const choices = shuffle([right, ...(ask === 'faces' ? shuffle(wrong) : wrong).slice(0, 3)]);
        return {
          type: 'mcq',
          title:
            ask === 'faces'
              ? 'De quelles figures sont faites les faces de ce solide ?'
              : 'Quel est le nom de ce solide ?',
          body: centred(solidSvg(kind, 140)) + (ask === 'faces' ? HIDDEN_NOTE : ''),
          mcqChoices: choices,
          mcqAnswer: choices.indexOf(right),
        };
      },
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = generators;
  else Object.assign((root.AppGenerators = root.AppGenerators || {}), generators);
})(typeof window !== 'undefined' ? window : globalThis);
