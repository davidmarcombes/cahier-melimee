/* ─────────────────────────────────────────────────────────────
   SVG / HTML generation helpers — loaded only on series pages.
   All functions are global so Alpine templates can call them via
   window[gen](...Object.values(par)).
   ───────────────────────────────────────────────────────────── */
const SVG = {
  _id: 0,
  uid: (p = 'id') => `${p}_${SVG._id++}`,
  f: (v) => Math.round(v * 10) / 10,
  font: 'system-ui,sans-serif',
  tag: (w, h, content, attr = '') =>
    `<svg width="${SVG.f(w)}" height="${SVG.f(h)}" viewBox="0 0 ${SVG.f(w)} ${SVG.f(h)}" xmlns="http://www.w3.org/2000/svg" ${attr}>${content}</svg>`,
};

// Hand-drawn SVG files (svg: { gen: file }): fixed small sizes and hand-written viewBoxes that cut
// labels off. Marked here, then fitted once displayed (see fitSvg below).
function embedSvg(svg) {
  return String(svg).replace(/<svg\b/, '<svg data-fit');
}

// Fit a marked SVG to what is actually drawn (labels included): viewBox = drawing's bounding box
// + padding, and small drawings scaled up — up to FIT_MAX px wide, ×FIT_SCALE at most, never down.
const FIT_MAX = 380,
  FIT_SCALE = 2.5,
  FIT_PAD = 4;
function fitSvg(el) {
  let b;
  try {
    b = el.getBBox();
  } catch {
    return false;
  }
  if (!b || !b.width || !b.height) return false; // not displayed yet (x-show)
  const w = b.width + 2 * FIT_PAD,
    h = b.height + 2 * FIT_PAD;
  el.setAttribute('viewBox', `${SVG.f(b.x - FIT_PAD)} ${SVG.f(b.y - FIT_PAD)} ${SVG.f(w)} ${SVG.f(h)}`);
  const natural = parseFloat(el.getAttribute('width')) || w;
  const target = Math.max(natural, Math.min(natural * FIT_SCALE, FIT_MAX));
  el.removeAttribute('width');
  el.removeAttribute('height');
  el.style.width = `min(100%, ${Math.round(target)}px)`;
  el.style.height = 'auto';
  el.removeAttribute('data-fit');
  return true;
}
// Marked SVGs are fitted as soon as they have a size: inserted visible, or shown later by x-show
if (typeof window !== 'undefined' && window.ResizeObserver && window.MutationObserver) {
  const sizes = new ResizeObserver((entries) => {
    for (const { target } of entries) if (fitSvg(target)) sizes.unobserve(target);
  });
  const watch = (root) => {
    const list =
      root.matches && root.matches('svg[data-fit]')
        ? [root]
        : root.querySelectorAll
          ? root.querySelectorAll('svg[data-fit]')
          : [];
    for (const el of list) if (!fitSvg(el)) sizes.observe(el);
  };
  new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach(watch))).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

function mathGridSvg(cols, rows, filled, color = 'var(--p)') {
  const s = 20,
    g = 1;
  let res = '';
  for (let i = 0; i < cols * rows; i++) {
    const x = (i % cols) * s,
      y = Math.floor(i / cols) * s;
    res += `<rect x="${x}" y="${y}" width="${s - g}" height="${s - g}" fill="${i < filled ? color : 'var(--ss)'}" stroke="var(--cs)" stroke-width="0.5"/>`;
  }
  return SVG.tag(
    cols * s,
    rows * s,
    res,
    `viewBox="0 -1 ${cols * s} ${rows * s + 1}" style="display:inline-block;margin:5px"`
  );
}

// Hundred grid for percentages: 10 × 10 squares, `filled` coloured row by row; a thicker line cuts it
// in four blocks of 25 so the squares can be counted by 5, 10 and 25.
function percentGridSvg(filled) {
  const s = 22,
    X = 3;
  let res = '';
  for (let i = 0; i < 100; i++)
    res += `<rect x="${X + (i % 10) * s}" y="${X + Math.floor(i / 10) * s}" width="${s}" height="${s}" fill="${i < filled ? 'var(--p)' : 'var(--sf,#fff)'}" fill-opacity="${i < filled ? 0.55 : 1}" stroke="var(--cs)" stroke-width="1"/>`;
  const mid = X + 5 * s;
  res +=
    `<rect x="${X}" y="${X}" width="${10 * s}" height="${10 * s}" fill="none" stroke="var(--ct)" stroke-width="2"/>` +
    `<line x1="${mid}" y1="${X}" x2="${mid}" y2="${X + 10 * s}" stroke="var(--ct)" stroke-width="2"/>` +
    `<line x1="${X}" y1="${mid}" x2="${X + 10 * s}" y2="${mid}" stroke="var(--ct)" stroke-width="2"/>`;
  return SVG.tag(10 * s + 2 * X, 10 * s + 2 * X, res, 'role="img" aria-label="Grille de 100 carreaux"');
}

// Percentage bar: one bar (the whole = 100 % = total) cut in `parts` equal parts, `shaded` coloured.
// Percents above, quantities below; ask 'value' puts « ? » under the end of the colour,
// 'percent' puts it above (the quantity is written), 'none' writes both.
function percentBarSvg(parts, shaded, total, ask = 'value') {
  const f = SVG.f,
    font = `font-family="${SVG.font}" font-weight="700" text-anchor="middle"`;
  const W = 300,
    X = 30,
    Y = 38,
    H = 36,
    w = W / parts;
  const p = (100 * shaded) / parts,
    v = (total * shaded) / parts;
  const q = (x, y, txt, size = 18, color = 'var(--ct)') =>
    `<text x="${f(x)}" y="${y}" font-size="${size}" ${font} fill="${color}">${txt}</text>`;
  let s = `<rect x="${X}" y="${Y}" width="${f(w * shaded)}" height="${H}" fill="var(--p)" fill-opacity="0.45"/>`;
  s += `<rect x="${X}" y="${Y}" width="${W}" height="${H}" fill="none" stroke="var(--ct)" stroke-width="2"/>`;
  for (let i = 1; i < parts; i++)
    s += `<line x1="${f(X + i * w)}" y1="${Y}" x2="${f(X + i * w)}" y2="${Y + H}" stroke="var(--ct)" stroke-width="1.2"/>`;
  const xe = X + shaded * w;
  // every percent when there are few parts, else only 0 and 100 — none too close to the end of the colour
  for (let i = 0; i <= parts; i++) {
    const x = X + i * w;
    if ((parts <= 5 || i === 0 || i === parts) && Math.abs(x - xe) >= 50)
      s += q(x, Y - 11, `${(100 * i) / parts} %`, 16, 'var(--cs)');
  }
  s += `<line x1="${f(xe)}" y1="${Y - 7}" x2="${f(xe)}" y2="${Y + H + 7}" stroke="var(--a)" stroke-width="3"/>`;
  s += ask === 'percent' ? q(xe, Y - 10, '?', 24, 'var(--a)') : q(xe, Y - 11, `${p} %`, 20, 'var(--a)');
  // quantities: 0 left out when it would touch the end of the colour, the total one row lower
  const low = X + W - xe < 40;
  const yb = Y + H + 26;
  if (xe - X >= 30) s += q(X, yb, '0');
  s += q(X + W, low ? yb + 22 : yb, total);
  s += ask === 'value' ? q(xe, yb + 2, '?', 24, 'var(--a)') : q(xe, yb, String(v).replace('.', ','), 20, 'var(--a)');
  return `<svg viewBox="0 0 ${W + 2 * X} ${yb + (low ? 30 : 10)}" width="${W + 2 * X}" style="max-width:100%;height:auto" role="img" aria-label="Barre de pourcentage">${s}</svg>`;
}

// Cutting / spacing picture. kind 'coupe': a bar cut in `pieces` equal pieces by red cut lines;
// kind 'intervalles': a path with an emoji (🌳…) at both ends and between `pieces` equal gaps.
// `total` (« 200 cm ») over the whole length; `piece` (« 40 cm » or « ? ») under the first piece.
function decoupeSvg(kind, pieces, total, piece, emoji = '🌳') {
  const f = SVG.f,
    font = `font-family="${SVG.font}" font-weight="700" text-anchor="middle"`;
  const W = 300,
    X = 30,
    Y = 52,
    w = W / pieces;
  const q = (x, y, txt, size = 18, color = 'var(--ct)') =>
    `<text x="${f(x)}" y="${y}" font-size="${size}" ${font} fill="${color}">${txt}</text>`;
  // the total length: a double arrow above
  let s = `<line x1="${X}" y1="18" x2="${X + W}" y2="18" stroke="var(--cs)" stroke-width="1.5"/>`;
  s += `<path d="M${X + 7} 13 L${X} 18 L${X + 7} 23 M${X + W - 7} 13 L${X + W} 18 L${X + W - 7} 23" fill="none" stroke="var(--cs)" stroke-width="1.5"/>`;
  s += `<rect x="${f(X + W / 2 - 42)}" y="6" width="84" height="22" fill="var(--sf)"/>${q(X + W / 2, 24, total)}`;
  let yb;
  if (kind === 'intervalles') {
    s += `<line x1="${X}" y1="${Y + 22}" x2="${X + W}" y2="${Y + 22}" stroke="var(--cs)" stroke-width="3" stroke-linecap="round"/>`;
    for (let i = 0; i <= pieces; i++)
      s += `<text x="${f(X + i * w)}" y="${Y + 22}" font-size="${pieces > 8 ? 20 : 26}" text-anchor="middle">${emoji}</text>`;
    yb = Y + 46;
  } else {
    s += `<rect x="${X}" y="${Y}" width="${W}" height="26" rx="3" fill="var(--p)" fill-opacity="0.35" stroke="var(--ct)" stroke-width="2"/>`;
    for (let i = 1; i < pieces; i++)
      s += `<line x1="${f(X + i * w)}" y1="${Y - 8}" x2="${f(X + i * w)}" y2="${Y + 34}" stroke="var(--a)" stroke-width="3" stroke-dasharray="5 3"/>`;
    yb = Y + 52;
  }
  // the first piece / gap, measured below
  s += `<path d="M${X} ${yb - 14} v6 H${f(X + w)} v-6" fill="none" stroke="var(--a)" stroke-width="2"/>`;
  s += q(X + w / 2, yb + 12, piece, piece === '?' ? 24 : 18, 'var(--a)');
  return `<svg viewBox="0 0 ${W + 2 * X} ${yb + 20}" width="${W + 2 * X}" style="max-width:100%;height:auto" role="img" aria-label="${kind === 'intervalles' ? 'Allée' : 'Découpage'}">${s}</svg>`;
}

function longueursSvg(objects) {
  if (!Array.isArray(objects) || objects.length < 2 || objects.length > 3) {
    throw new TypeError('longueursSvg expects two or three objects');
  }

  if (objects.some((object) => !Number.isFinite(Number(object.length)) || Number(object.length) <= 0)) {
    throw new TypeError('Each object must have a positive length');
  }

  const colors = ['var(--p)', 'var(--a)', 'var(--green)'];
  const x0 = 78;
  const rowHeight = 64;
  const maxLength = Math.max(...objects.map((object) => Number(object.length)));
  const content = objects
    .map((object, index) => {
      const y = 35 + index * rowHeight;
      const x1 = x0 + (Number(object.length) / maxLength) * 270;
      const color = colors[index];
      return `<text x="35" y="${y + 9}" text-anchor="middle" font-size="28">${object.emoji}</text>
        <line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${color}" stroke-width="14" stroke-linecap="round"/>
        <line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="var(--sf)" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/>`;
    })
    .join('');
  const height = objects.length * rowHeight + 8;
  return SVG.tag(
    380,
    height,
    `<line x1="${x0}" y1="15" x2="${x0}" y2="${height - 8}" stroke="var(--cs)" stroke-opacity=".4" stroke-dasharray="3 4"/>${content}`,
    'role="img" aria-label="Longueurs des objets" style="max-width:100%;height:auto"'
  );
}

// Fraction wall: strips of the same length cut in equal parts. rows: [den, shaded] (or den alone);
// whole: a first strip « 1 ». Parts read « 1/den » when wide enough; shaded parts start on the left.
function fractionStripsSvg(rows, whole = true) {
  const W = 320,
    H = 30,
    GAP = 6,
    X = 5;
  const list = (whole ? [[1, 0]] : []).concat(rows.map((r) => (Array.isArray(r) ? r : [r, 0])));
  let s = '';
  list.forEach(([den, shaded], k) => {
    const y = 5 + k * (H + GAP),
      w = W / den;
    for (let i = 0; i < den; i++) {
      const on = i < shaded;
      s += `<rect x="${(X + i * w).toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${H}" fill="${on ? 'var(--p)' : 'var(--sf,#fff)'}" fill-opacity="${on ? 0.45 : 1}"/>`;
      if (w >= 24)
        s += `<text x="${(X + i * w + w / 2).toFixed(1)}" y="${y + 20}" text-anchor="middle" font-size="${den > 9 ? 11 : 13}" fill="var(--ct,#1e293b)">${den === 1 ? '1' : '1/' + den}</text>`;
    }
    s += `<rect x="${X}" y="${y}" width="${W}" height="${H}" fill="none" stroke="currentColor" stroke-width="2"/>`;
    for (let i = 1; i < den; i++)
      s += `<line x1="${(X + i * w).toFixed(1)}" y1="${y}" x2="${(X + i * w).toFixed(1)}" y2="${y + H}" stroke="currentColor" stroke-width="1.5"/>`;
  });
  const height = 10 + list.length * (H + GAP) - GAP;
  return `<svg viewBox="0 0 ${W + 2 * X} ${height}" width="${W + 2 * X}" style="max-width:100%;height:auto" role="img" aria-label="Bandes de fractions">${s}</svg>`;
}

// Fraction addition / subtraction (view from fractionOp in player.js): first fraction blue, second amber.
// model bande (one strip per fraction, the result strip under a line), disque (pies: A + B = result) or
// droite (jumps on a number line in 1/D). cut: dashed lines re-cutting a fraction into the common parts.
// Until done the result is empty (« ? »); then addition shows both colours, subtraction the parts taken away.
function fractionOpSvg(v, model = 'bande', done = false, cut = true) {
  const f = SVG.f,
    font = `font-family="${SVG.font}" font-weight="700" fill="var(--ct)"`;
  const [A, B] = v.terms,
    D = v.D,
    COL = ['var(--p)', 'var(--a)'];
  const units = Math.max(1, ...[A.n / A.d, B.n / B.d, v.R / D].map(Math.ceil));
  // stacked fraction (or « ? ») centred on x, numerator baseline at y
  const frac = (x, y, n, d, color = 'var(--ct)') =>
    d == null
      ? `<text x="${f(x)}" y="${f(y + 12)}" text-anchor="middle" font-size="22" ${font}>?</text>`
      : `<g fill="${color}"><text x="${f(x)}" y="${f(y)}" text-anchor="middle" font-size="16" ${font} fill="${color}">${n}</text>` +
        `<line x1="${f(x - 11)}" y1="${f(y + 5)}" x2="${f(x + 11)}" y2="${f(y + 5)}" stroke="${color}" stroke-width="2"/>` +
        `<text x="${f(x)}" y="${f(y + 22)}" text-anchor="middle" font-size="16" ${font} fill="${color}">${d}</text></g>`;
  const sign = (x, y, t) => `<text x="${f(x)}" y="${f(y)}" text-anchor="middle" font-size="24" ${font}>${t}</text>`;
  // part k of the result, once done: addition = A's parts then B's; subtraction = what is left, then the parts taken away
  const resultPaint = (k) =>
    !done ? null : v.sub ? (k < v.R ? COL[0] : k < A.N ? 'x' : null) : k < A.N ? COL[0] : k < A.N + B.N ? COL[1] : null;
  const fill = (c) =>
    c === 'x' ? 'fill="var(--a)" fill-opacity=".15"' : c ? `fill="${c}" fill-opacity=".55"` : 'fill="var(--sf,#fff)"';
  const cross = (x0, y0, x1, y1) =>
    `<path d="M${f(x0 + 4)},${f(y0 + 4)}L${f(x1 - 4)},${f(y1 - 4)}M${f(x1 - 4)},${f(y0 + 4)}L${f(x0 + 4)},${f(y1 - 4)}" stroke="var(--a)" stroke-width="2"/>`;

  if (model === 'disque') {
    const r = 42,
      P = 2 * r + 8;
    let x = 4,
      s = '';
    // pies for parts of size 1/d, part k painted paint(k); dashed radii every 1/D
    const pies = (count, d, paint, sub, label) => {
      const x0 = x;
      for (let j = 0; j < count; j++) {
        const cx = x + r + 2,
          cy = r + 4;
        const pt = (i, m) => {
          const t = (i / m) * 2 * Math.PI - Math.PI / 2;
          return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
        };
        for (let i = 0; i < d; i++) {
          const c = paint(j * d + i),
            [x1, y1] = pt(i, d),
            [x2, y2] = pt(i + 1, d);
          s += `<path d="M${f(cx)},${f(cy)}L${f(x1)},${f(y1)}A${r},${r},0,0,1,${f(x2)},${f(y2)}Z" ${fill(c)} stroke="currentColor" stroke-width="1.5"/>`;
          if (c === 'x') {
            const [mx, my] = pt(i + 0.5, d);
            s += `<path d="M${f((cx + mx) / 2 - 6)},${f((cy + my) / 2 - 6)}l12,12m0,-12l-12,12" stroke="var(--a)" stroke-width="2"/>`;
          }
        }
        if (sub && sub !== d)
          for (let i = 0; i < sub; i++)
            if ((i * d) % sub) {
              const [x1, y1] = pt(i, sub);
              s += `<line x1="${f(cx)}" y1="${f(cy)}" x2="${f(x1)}" y2="${f(y1)}" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 3"/>`;
            }
        s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${r}" fill="none" stroke="currentColor" stroke-width="2"/>`;
        x += P;
      }
      s += label((x0 + x - 8) / 2);
    };
    const term = (t, i) =>
      pies(
        Math.max(1, Math.ceil(t.n / t.d)),
        t.d,
        (k) => (k < t.n ? COL[i] : null),
        cut && !v.askDen ? D : 0,
        (cx) => frac(cx, 2 * r + 30, t.n, t.d, COL[i])
      );
    term(A, 0);
    s += sign(x + 10, r + 12, v.sign);
    x += 26;
    term(B, 1);
    s += sign(x + 10, r + 12, '=');
    x += 26;
    pies(units, v.askDen && !done ? 1 : D, resultPaint, 0, (cx) => frac(cx, 2 * r + 30, v.R, done ? D : null));
    return SVG.tag(x, 2 * r + 60, s, 'role="img" aria-label="Fractions en disques" style="max-width:100%;height:auto"');
  }

  if (model === 'droite') {
    const X0 = 24,
      L = 340 / units,
      Y = 96,
      at = (q) => X0 + q * L;
    let s = `<line x1="${X0}" y1="${Y}" x2="${f(at(units) + 12)}" y2="${Y}" stroke="currentColor" stroke-width="2"/>`;
    for (let k = 0; k <= units * D; k++) {
      const whole = k % D === 0;
      s += `<line x1="${f(at(k / D))}" y1="${Y - (whole ? 9 : 5)}" x2="${f(at(k / D))}" y2="${Y + (whole ? 9 : 5)}" stroke="currentColor" stroke-width="${whole ? 2 : 1.2}"/>`;
      if (whole)
        s += `<text x="${f(at(k / D))}" y="${Y + 28}" text-anchor="middle" font-size="15" ${font}>${k / D}</text>`;
    }
    // jump from p to q (in D-ths), above the line (below: dy > 0), with its fraction at the top
    const jump = (p, q, color, t, below) => {
      const x1 = at(p / D),
        x2 = at(q / D),
        h = (below ? 1 : -1) * Math.min(54, 22 + Math.abs(x2 - x1) / 4),
        dir = Math.sign(x2 - x1),
        y0 = below ? Y + 3 : Y - 3;
      return (
        `<path d="M${f(x1)},${y0}Q${f((x1 + x2) / 2)},${f(Y + 2 * h)} ${f(x2)},${y0}" fill="none" stroke="${color}" stroke-width="3"/>` +
        `<path d="M${f(x2 - dir * 9)},${f(y0 + (below ? 6 : -6))}L${f(x2)},${y0}L${f(x2 + dir * 2)},${f(y0 + (below ? 10 : -10))}" fill="none" stroke="${color}" stroke-width="3"/>` +
        frac((x1 + x2) / 2, below ? Y + h + 30 : Y + h - 26, t.n, t.d, color)
      );
    };
    s += jump(0, A.N, COL[0], A) + jump(A.N, v.R, COL[1], B, v.sub);
    s += `<circle cx="${f(at(v.R / D))}" cy="${Y}" r="6" fill="${done ? 'var(--green,#4daa60)' : 'var(--sf,#fff)'}" stroke="currentColor" stroke-width="2"/>`;
    const H = v.sub ? Y + 116 : Y + 40;
    return SVG.tag(
      at(units) + 24,
      H,
      s,
      'role="img" aria-label="Fractions sur une droite" style="max-width:100%;height:auto"'
    );
  }

  // bande: one row per fraction, then the result under a line
  const LX = 64,
    W = 300,
    U = W / units,
    H = 34;
  let s = '';
  const strip = (y, d, paint, sub) => {
    for (let j = 0; j < units; j++) {
      const x0 = LX + j * U,
        w = (U - (units > 1 ? 8 : 0)) / d;
      if (j && j >= Math.ceil(Math.max(1, paint.count) / d) && paint.count != null) break;
      for (let i = 0; i < d; i++) {
        const c = paint(j * d + i);
        s += `<rect x="${f(x0 + i * w)}" y="${y}" width="${f(w)}" height="${H}" ${fill(c)} stroke="currentColor" stroke-width="1.5"/>`;
        if (c === 'x') s += cross(x0 + i * w, y, x0 + (i + 1) * w, y + H);
      }
      if (sub && sub !== d)
        for (let i = 1; i < sub; i++)
          if ((i * d) % sub)
            s += `<line x1="${f(x0 + (i * w * d) / sub)}" y1="${y + 2}" x2="${f(x0 + (i * w * d) / sub)}" y2="${y + H - 2}" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 3"/>`;
      s += `<rect x="${f(x0)}" y="${y}" width="${f(w * d)}" height="${H}" fill="none" stroke="currentColor" stroke-width="2.5"/>`;
    }
  };
  [A, B].forEach((t, i) => {
    const y = 6 + i * (H + 12),
      paint = (k) => (k < t.n ? COL[i] : null);
    paint.count = t.n;
    if (i) s += sign(12, y + 25, v.sign);
    s += frac(38, y + 12, t.n, t.d, COL[i]);
    strip(y, t.d, paint, cut && !v.askDen ? D : 0);
  });
  const yR = 6 + 2 * (H + 12) + 12;
  s += `<line x1="4" y1="${yR - 7}" x2="${LX + W}" y2="${yR - 7}" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 4"/>`;
  s += sign(12, yR + 25, '=') + frac(38, yR + 12, v.R, done ? D : null);
  strip(yR, v.askDen && !done ? 1 : D, resultPaint, 0);
  return SVG.tag(
    LX + W + 6,
    yR + H + 6,
    s,
    'role="img" aria-label="Fractions en bandes" style="max-width:100%;height:auto"'
  );
}

// Hands showing 0–5 raised fingers: 1–4 = index first, 5 = open hand, 0 = fist. Cartoon style: thick
// dark outline; curled fingers in front of the palm, held by the thumb, which grows out of the palm edge.
// Two hands: the first is mirrored (thumbs face each other); plus draws « + » between them.
function mainsSvg(hands, plus = false) {
  if (!Array.isArray(hands) || hands.length < 1 || hands.length > 2) {
    throw new TypeError('mainsSvg expects one or two hands');
  }
  if (hands.some((n) => !Number.isInteger(n) || n < 0 || n > 5)) {
    throw new TypeError('Each hand shows 0 to 5 fingers');
  }
  const w = 130,
    h = 150,
    gap = plus ? 50 : 24,
    skin = '#f8bd88',
    ink = '#2a1a12';
  // little, ring, middle, index: base centre x, raised tip y, tilt (degrees, around the base)
  const fingers = [
    [33, 38, -10],
    [51, 20, -3],
    [69, 12, 2],
    [87, 22, 8],
  ];
  const hand = (n) => {
    const up = (i) => n === 5 || 3 - i < n;
    // back: raised fingers, open thumb, palm and wrist — drawn as one silhouette (outline under, skin over)
    const back = fingers
      .filter((_, i) => up(i))
      .map(
        ([x, tip, tilt]) =>
          `<rect x="${x - 8}" y="${tip}" width="16" height="${84 - tip}" rx="8" transform="rotate(${tilt} ${x} 84)"/>`
      );
    if (n === 5) back.push('<rect x="88" y="60" width="18" height="46" rx="9" transform="rotate(32 97 106)"/>');
    back.push(
      '<path d="M24,82C22,108 32,124 42,130L42,160L86,160L86,130C100,122 106,106 104,84C102,72 94,66 82,66L38,66C28,66 24,72 24,82Z"/>'
    );
    const b = back.join('');
    // front: curled fingers, then the thumb across them (open on the palm side)
    const curled = fingers.filter((_, i) => !up(i));
    let front = curled
      .map(([x]) =>
        x === fingers[0][0]
          ? `<rect x="${x - 10.5}" y="58" width="21" height="34" rx="10.5"/>`
          : `<rect x="${x - 10.5}" y="50" width="21" height="40" rx="10.5"/>`
      )
      .join('');
    if (n < 5) {
      const tip = n === 4 ? 50 : curled[0][0] - 2;
      front += `<path d="M103,78H${tip + 12.5}A12.5,12.5,0,0,0,${tip + 12.5},103H103" transform="rotate(-8 104 90)"/>`;
    }
    const creases =
      n === 5
        ? `<path d="M40,104Q56,98 72,104M48,116Q62,112 78,118" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`
        : '';
    return (
      `<g fill="${ink}" stroke="${ink}" stroke-width="7" stroke-linejoin="round">${b}</g><g fill="${skin}">${b}</g>${creases}` +
      (front ? `<g fill="${skin}" stroke="${ink}" stroke-width="3.5">${front}</g>` : '')
    );
  };
  const content = hands
    .map((n, i) => {
      const x = i * (w + gap);
      const t = i === 0 && hands.length === 2 ? `translate(${x + w} 0) scale(-1 1)` : `translate(${x} 0)`;
      return `<g transform="${t}" data-doigts="${n}">${hand(n)}</g>`;
    })
    .join('');
  const sign =
    plus && hands.length === 2
      ? `<text x="${w + gap / 2}" y="96" text-anchor="middle" font-size="40" font-weight="700" font-family="${SVG.font}" fill="var(--ct)">+</text>`
      : '';
  const width = hands.length * w + (hands.length - 1) * gap;
  return SVG.tag(
    width,
    h,
    content + sign,
    `role="img" aria-label="${hands.length === 1 ? 'Une main' : 'Deux mains'}" style="max-width:100%;height:auto;overflow:hidden"`
  );
}

function slicedPieSvg(n, k, size = 100, color = 'var(--p)') {
  const f = SVG.f,
    c = size / 2,
    r = size / 2 - 2;
  let filled = '',
    empty = '';
  for (let i = 0; i < n; i++) {
    const a0 = (i * 2 * Math.PI) / n - Math.PI / 2,
      a1 = ((i + 1) * 2 * Math.PI) / n - Math.PI / 2;
    const d = `M${f(c)},${f(c)}L${f(c + r * Math.cos(a0))},${f(c + r * Math.sin(a0))}A${r},${r},0,0,1,${f(c + r * Math.cos(a1))},${f(c + r * Math.sin(a1))}Z`;
    if (i < k) filled += `<path d="${d}" fill="${color}"/>`;
    else empty += `<path d="${d}" fill="var(--sf)"/>`;
  }
  return SVG.tag(size, size, `<g stroke="var(--cs)" stroke-width="1">${filled}${empty}</g>`);
}

function circleSvg(r, label = '', fillColor = 'var(--sf)') {
  const f = SVG.f,
    pad = label ? 40 : 5,
    center = r + pad,
    size = center * 2;
  const extra = label
    ? `<line x1="${center}" y1="${center}" x2="${f(center + r)}" y2="${center}" stroke="var(--ct)" stroke-dasharray="4"/><text x="${f(center + r / 2)}" y="${f(center - 10)}" text-anchor="middle" font-size="14" font-family="${SVG.font}" fill="var(--ct)">${label}</text>`
    : '';
  return SVG.tag(
    size,
    size,
    `<circle cx="${center}" cy="${center}" r="${r}" fill="${fillColor}" stroke="var(--ct)" stroke-width="2"/>${extra}`
  );
}

function rectangleSvg(w, h, labelW = '', labelH = '', fillColor = 'var(--sf)') {
  const f = SVG.f,
    p = labelW || labelH ? 35 : 5,
    pl = labelH ? 70 : p, // room for « 12 cm » left of the rectangle
    tw = w + p + pl,
    th = h + p * 2;
  const res = `<rect x="${pl}" y="${p}" width="${w}" height="${h}" fill="${fillColor}" stroke="var(--ct)" stroke-width="2"/>
    ${labelW ? `<text x="${f(pl + w / 2)}" y="${f(p + h + 25)}" text-anchor="middle" font-family="${SVG.font}" fill="var(--ct)">${labelW}</text>` : ''}
    ${labelH ? `<text x="${f(pl - 10)}" y="${f(p + h / 2)}" text-anchor="end" dominant-baseline="middle" font-family="${SVG.font}" fill="var(--ct)">${labelH}</text>` : ''}`;
  return SVG.tag(tw, th, res);
}

function squareSvg(size, label = '', fillColor = 'var(--sf)') {
  const f = SVG.f,
    p = 35,
    t = size + p * 2;
  const res = `<rect x="${p}" y="${p}" width="${size}" height="${size}" fill="${fillColor}" stroke="var(--ct)" stroke-width="2"/>
    ${label ? `<text x="${f(p + size / 2)}" y="${f(p + size + 25)}" text-anchor="middle" font-family="${SVG.font}" fill="var(--ct)">${label}</text>` : ''}`;
  return SVG.tag(t, t, res);
}

function triangleSvg(pixA, pixB, labelA = '', labelB = '', labelC = '', fillColor = 'var(--sf)') {
  const padX = 45,
    padTop = 15,
    padBot = 28;
  const totalW = pixA + padX * 2;
  const totalH = pixB + padTop + padBot;
  const x0 = padX,
    y0 = padTop + pixB;
  const x1 = padX + pixA,
    y1 = padTop + pixB;
  const x2 = padX,
    y2 = padTop;
  const m = 10;
  const f = SVG.f;
  return `<svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" xmlns="http://www.w3.org/2000/svg">
      <polygon points="${f(x0)},${f(y0)} ${f(x1)},${f(y1)} ${f(x2)},${f(y2)}" fill="${fillColor}" stroke="var(--ct)" stroke-width="2" />
      <polyline points="${f(x0 + m)},${f(y0)} ${f(x0 + m)},${f(y0 - m)} ${f(x0)},${f(y0 - m)}" fill="none" stroke="var(--ct)" stroke-width="1.5" />
      ${labelA ? `<text x="${f((x0 + x1) / 2)}" y="${f(y0 + 20)}" text-anchor="middle" font-family="${SVG.font}" fill="var(--ct)">${labelA}</text>` : ''}
      ${labelB ? `<text x="${f(x0 - 8)}" y="${f((y0 + y2) / 2)}" text-anchor="end" dominant-baseline="middle" font-family="${SVG.font}" fill="var(--ct)">${labelB}</text>` : ''}
      ${labelC ? `<text x="${f((x1 + x2) / 2 + 15)}" y="${f((y1 + y2) / 2 - 6)}" text-anchor="start" font-family="${SVG.font}" fill="var(--ct)">${labelC}</text>` : ''}
    </svg>`;
}

// pie chart for fraction n/d with the fraction label below
function fractionPieSvg(n, d, size = 80) {
  const pie = slicedPieSvg(d, n, size);
  return `<span style="display:inline-flex;flex-direction:column;align-items:center;gap:0.4rem">${pie}<span class="frac text-lg"><span class="fn">${n}</span><span class="fd">${d}</span></span></span>`;
}

// Two equal fractions side by side (« 1/2 = 2/4 »): n/d shaded, then the same whole cut in D parts
// with N shaded (N = 0: cut only, the pupil imagines the shading). model disque (pies) or bande (strips).
function fractionEquivSvg(n, d, N, D, model = 'disque') {
  if (model === 'bande')
    return fractionStripsSvg(
      [
        [d, n],
        [D, N],
      ],
      false
    );
  const eq = '<span style="font-size:2rem;font-weight:800;color:var(--ct)">=</span>';
  return `<span style="display:inline-flex;align-items:center;gap:1rem" role="img" aria-label="Deux disques partagés">${slicedPieSvg(d, n, 110)}${eq}${slicedPieSvg(D, N, 110)}</span>`;
}

// --- 3D Shapes ---

function cubeSvg(size = 50, color = 'var(--p)', opacity = 1) {
  const f = SVG.f,
    t = f(size * 0.4),
    w = f(size),
    h = f(size);
  const totalW = f(w + t + 4),
    totalH = f(h + t + 4);
  return `<svg width="${totalW}" height="${totalH}" viewBox="-2 -2 ${totalW} ${totalH}" style="opacity:${opacity};display:inline-block;margin:4px" xmlns="http://www.w3.org/2000/svg">
    <g stroke="var(--cs)" stroke-width="1.5" stroke-linejoin="round">
      <polygon points="${t},0 ${w + t},0 ${w},${t} 0,${t}" fill="${color}" />
      <polygon points="${t},0 ${w + t},0 ${w},${t} 0,${t}" fill="#fff" fill-opacity="0.3" />
      <polygon points="${w},${t} ${w + t},0 ${w + t},${h} ${w},${h + t}" fill="${color}" />
      <polygon points="${w},${t} ${w + t},0 ${w + t},${h} ${w},${h + t}" fill="#000" fill-opacity="0.2" />
      <polygon points="0,${t} ${w},${t} ${w},${h + t} 0,${h + t}" fill="${color}" />
    </g>
  </svg>`;
}

function sphereSvg(r = 40, color = 'var(--p)', opacity = 1) {
  const f = SVG.f,
    size = f(r * 2 + 10),
    c = f(size / 2),
    gid = SVG.uid('rg');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="opacity:${opacity};display:inline-block;margin:4px" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="${gid}" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#fff" stop-opacity="0.6"/><stop offset="40%" stop-color="${color}"/><stop offset="100%" stop-color="#000" stop-opacity="0.5"/>
      </radialGradient>
    </defs>
    <circle cx="${c}" cy="${c}" r="${r}" fill="url(#${gid})" stroke="var(--cs)" stroke-width="1.5" />
  </svg>`;
}

function cylinderSvg(w = 50, h = 80, color = 'var(--p)', opacity = 1) {
  const f = SVG.f,
    rx = f(w / 2),
    ry = f(rx * 0.4),
    tw = f(w + 10),
    th = f(h + ry * 2 + 10);
  const x0 = 5,
    y0 = f(5 + ry),
    gid = SVG.uid('lg');
  return `<svg width="${tw}" height="${th}" viewBox="0 0 ${tw} ${th}" style="opacity:${opacity};display:inline-block;margin:4px" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${gid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#000" stop-opacity="0.3"/><stop offset="30%" stop-color="${color}"/><stop offset="70%" stop-color="${color}"/><stop offset="100%" stop-color="#000" stop-opacity="0.5"/>
      </linearGradient>
    </defs>
    <g stroke="var(--cs)" stroke-width="1.5" stroke-linejoin="round">
      <path d="M${x0},${y0}V${f(y0 + h)}A${rx},${ry},0,0,0,${f(x0 + w)},${f(y0 + h)}V${y0}Z" fill="url(#${gid})" />
      <ellipse cx="${f(x0 + rx)}" cy="${y0}" rx="${rx}" ry="${ry}" fill="${color}" />
      <ellipse cx="${f(x0 + rx)}" cy="${y0}" rx="${rx}" ry="${ry}" fill="#fff" fill-opacity="0.3" />
    </g>
  </svg>`;
}

function coneSvg(w = 60, h = 90, color = 'var(--p)', opacity = 1) {
  const rx = w / 2;
  const ry = rx * 0.4;
  const totalW = w + 10;
  const totalH = h + ry + 10;
  const cx = totalW / 2;
  const topY = 5;
  const botY = topY + h;
  const x0 = cx - rx;
  const x1 = cx + rx;
  const gid = 'lg_' + Math.random().toString(36).substr(2, 5);
  return `<svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" style="opacity:${opacity}; display:inline-block; margin:4px;" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${gid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#000" stop-opacity="0.3"/>
        <stop offset="35%" stop-color="${color}" stop-opacity="1"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0.6"/>
      </linearGradient>
    </defs>
    <g stroke="var(--cs)" stroke-width="1.5" stroke-linejoin="round">
      <path d="M ${cx},${topY} L ${x0},${botY} A ${rx} ${ry} 0 0 0 ${x1},${botY} Z" fill="url(#${gid})" />
    </g>
  </svg>`;
}

// decompoChipsHtml — place-value chips with dot rows (grouped 5+remainder)
// chips: [{ label, value }, ...] — value 0-9
function decompoChipsHtml(chips) {
  const COLORS = ['var(--orange, #e0743c)', 'var(--p)', 'var(--green, #4daa60)'];
  let ci = 0;
  const parts = chips.map((chip) => {
    // Comma separator chip — visual only, no dots
    if (chip.comma) {
      return (
        `<div style="display:inline-flex;flex-direction:column;border-radius:8px;border:1.5px solid var(--cs,#cbd5e1);overflow:hidden;min-width:24px">` +
        `<div style="background:var(--sc,#f1f5f9);color:var(--cs,#94a3b8);padding:3px 6px;font-size:13px;font-weight:900;font-family:system-ui,sans-serif;text-align:center">,</div>` +
        `<div style="background:var(--sf,#fff);border-top:1.5px solid var(--cs,#cbd5e1);padding:5px 4px;min-height:28px"></div>` +
        `</div>`
      );
    }
    const { label, value } = chip;
    const c = COLORS[ci++ % COLORS.length];
    let dots;
    if (value === 0) {
      dots = `<span style="color:var(--cs);font-size:11px;line-height:1">—</span>`;
    } else {
      const r1 = Math.min(value, 5),
        r2 = value - r1;
      const s = `display:block;color:${c};font-size:11px;line-height:1.3;letter-spacing:1px`;
      dots = `<span style="${s}">${'●'.repeat(r1)}</span>${r2 ? `<span style="${s}">${'●'.repeat(r2)}</span>` : ''}`;
    }
    return (
      `<div style="display:inline-flex;flex-direction:column;border-radius:8px;overflow:hidden;min-width:50px">` +
      `<div style="background:${c};color:#fff;padding:3px 6px;font-size:10px;font-weight:700;font-family:system-ui,sans-serif;text-align:center;white-space:nowrap">${label}</div>` +
      `<div style="background:var(--sf);border:1.5px solid ${c};border-top:none;border-radius:0 0 8px 8px;padding:5px 4px;display:flex;flex-direction:column;align-items:center;gap:2px;min-height:28px;justify-content:center">${dots}</div>` +
      `</div>`
    );
  });
  return `<div style="display:flex;gap:4px;width:100%">${parts.map((p) => `<div style="flex:1;display:flex;justify-content:center">${p}</div>`).join('')}</div>`;
}

// abacusSvg — boulier/abacus SVG
// rows: [{ label, value }, ...] — value 0..beadsPerRow
function abacusSvg(rows, beadsPerRow = 10) {
  const COLORS = ['var(--orange, #e0743c)', 'var(--p)', 'var(--green, #4daa60)'];
  const R = 7,
    SLOT = 18,
    ROW_H = 26,
    V_PAD = 10,
    H_PAD = 10;
  const ROD_W = beadsPerRow * SLOT + 10;
  const FRAME_W = ROD_W + H_PAD * 2;
  const LABEL_W = 76,
    GAP = 6;
  const TOTAL_W = LABEL_W + GAP + FRAME_W;
  const FRAME_H = rows.length * ROW_H + V_PAD * 2;
  const FX = LABEL_W + GAP;
  let g = '';

  g += `<rect x="${FX}" y="0" width="${FRAME_W}" height="${FRAME_H}" rx="6" fill="var(--sf)" stroke="var(--cs)" stroke-width="1.5"/>`;

  rows.forEach(({ label, value }, ri) => {
    const cy = V_PAD + ri * ROW_H + ROW_H / 2;
    const color = COLORS[ri % COLORS.length];
    const x1 = FX + H_PAD,
      x2 = FX + H_PAD + ROD_W;

    if (ri > 0)
      g += `<line x1="${FX + 1}" y1="${V_PAD + ri * ROW_H}" x2="${FX + FRAME_W - 1}" y2="${V_PAD + ri * ROW_H}" stroke="var(--cs)" stroke-width="0.5" opacity="0.4"/>`;
    g += `<line x1="${x1}" y1="${cy}" x2="${x2}" y2="${cy}" stroke="var(--cs)" stroke-width="1.5"/>`;
    g += `<text x="${LABEL_W}" y="${cy}" text-anchor="end" dominant-baseline="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="600" fill="var(--ct)">${label}</text>`;

    for (let i = 0; i < value; i++) {
      const bx = x1 + R + i * SLOT;
      g += `<circle cx="${bx}" cy="${cy}" r="${R}" fill="${color}"/>`;
      g += `<circle cx="${bx - 2}" cy="${cy - 3}" r="2" fill="rgba(255,255,255,0.35)"/>`;
    }
    for (let j = 0; j < beadsPerRow - value; j++) {
      const bx = x2 - R - j * SLOT;
      g += `<circle cx="${bx}" cy="${cy}" r="${R}" fill="var(--ss)" stroke="var(--cs)" stroke-width="1"/>`;
    }
  });

  return `<svg width="${TOTAL_W}" height="${FRAME_H}" viewBox="0 0 ${TOTAL_W} ${FRAME_H}" xmlns="http://www.w3.org/2000/svg">${g}</svg>`;
}

function rulerSvg(
  min = 0,
  max = 10,
  step = 1,
  minorStep = 0.1,
  customLabels = {},
  markColor = 'var(--p)',
  width = 500
) {
  const height = 110;
  const pad = 40;
  const totalW = width + pad * 2;
  const range = max - min;
  const getX = (val) => pad + ((val - min) / range) * width;
  const lineY = 35;
  let ticks = '';
  let labels = '';

  for (let i = min; i <= max; i += minorStep) {
    const currentVal = Math.round(i * 1000) / 1000;
    const x = getX(currentVal);
    const isMajor = Math.abs((currentVal - min) % step) < 0.001;
    const tickHeight = isMajor ? 20 : 10;
    ticks += `<line x1="${x}" y1="${lineY}" x2="${x}" y2="${lineY - tickHeight}" stroke="var(--ct)" stroke-width="1.5" />`;
    if (isMajor) {
      labels += `<text x="${x}" y="${lineY - 25}" text-anchor="middle" font-family="Arial" font-size="12" fill="var(--cs)">${currentVal}</text>`;
    }
    if (customLabels[currentVal] !== undefined) {
      const stemLength = 25;
      const headSize = 8;
      const headHeight = 10;
      const points = `${x},${lineY} ${x + headSize},${lineY + headHeight} ${x - headSize},${lineY + headHeight}`;
      labels += `
        <polygon points="${points}" fill="${markColor}" />
        <line x1="${x}" y1="${lineY + headHeight}" x2="${x}" y2="${lineY + headHeight + stemLength}" stroke="${markColor}" stroke-width="2.5" />
        <text x="${x}" y="${lineY + headHeight + stemLength + 20}" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="${markColor}">
          ${customLabels[currentVal]}
        </text>`;
    }
  }

  return `<svg width="${totalW}" height="${height}" viewBox="0 0 ${totalW} ${height}" xmlns="http://www.w3.org/2000/svg">
      <line x1="${pad}" y1="${lineY}" x2="${pad + width}" y2="${lineY}" stroke="var(--ct)" stroke-width="2" />
      ${ticks}
      ${labels}
    </svg>`;
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return { x: centerX + radius * Math.cos(angleInRadians), y: centerY + radius * Math.sin(angleInRadians) };
}

function describeArc(x, y, radius, startAngle, endAngle) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return ['M', x, y, 'L', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y, 'Z'].join(' ');
}

// fractionShapesSvg — fraction shape renderer (circle/square) used by fraction type
function fractionShapesSvg(fraction) {
  if (!fraction) return [];
  const { numerator, denominator, shape, rows, cols } = fraction;
  if (!denominator) return [];
  const count = Math.ceil(numerator / denominator) || 1;
  const shapes = [];

  for (let sIdx = 1; sIdx <= count; sIdx++) {
    const filledInThisShape = Math.max(0, Math.min(denominator, numerator - (sIdx - 1) * denominator));
    let svgContent = '';

    if (shape === 'circle') {
      svgContent += `<circle cx="50" cy="50" r="48" fill="white" stroke="currentColor" stroke-width="2" class="fill-white dark:fill-slate-900 text-slate-300 dark:text-slate-600" />`;
      for (let pIdx = 1; pIdx <= denominator; pIdx++) {
        const arc = describeArc(50, 50, 48, (pIdx - 1) * (360 / denominator), pIdx * (360 / denominator));
        svgContent += `<path d="${arc}" fill="none" stroke="currentColor" stroke-width="1" class="text-slate-300 dark:text-slate-600" />`;
        if (pIdx <= filledInThisShape) {
          svgContent += `<path d="${arc}" class="fill-primary-500 stroke-primary-700" stroke-width="1" />`;
        }
      }
    } else if (shape === 'square') {
      svgContent += `<rect x="2" y="2" width="96" height="96" fill="white" stroke="currentColor" stroke-width="2" class="fill-white dark:fill-slate-900 text-slate-300 dark:text-slate-600" />`;
      const rCount = rows || 1;
      const cCount = cols || denominator || 1;
      const w = 96 / cCount;
      const h = 96 / rCount;
      for (let r = 1; r <= rCount; r++) {
        for (let c = 1; c <= cCount; c++) {
          const itemIdx = (r - 1) * cCount + c;
          const x = 2 + (c - 1) * w;
          const y = 2 + (r - 1) * h;
          svgContent += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="currentColor" stroke-width="1" class="text-slate-300 dark:text-slate-700" />`;
          if (itemIdx <= filledInThisShape) {
            svgContent += `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="fill-primary-500 stroke-primary-700" stroke-width="1" />`;
          }
        }
      }
    }
    shapes.push({
      idx: sIdx,
      svg: `<svg viewBox="0 0 100 100" class="w-full h-full drop-shadow-sm">${svgContent}</svg>`,
    });
  }
  return shapes;
}

// ─── 2D shapes (curriculum additions) ────────────────────────────────────────

function equilateralTriangleSvg(size = 80, label = '', fillColor = 'var(--sf)') {
  const f = SVG.f,
    h = f((size * Math.sqrt(3)) / 2),
    pX = 10,
    pT = 10,
    pB = label ? 28 : 10;
  const tw = size + pX * 2,
    th = h + pT + pB,
    x0 = pX,
    y0 = pT + h,
    x1 = pX + size,
    x2 = pX + size / 2;
  const res = `<polygon points="${x0},${y0} ${x1},${y0} ${x2},${pT}" fill="${fillColor}" stroke="var(--ct)" stroke-width="2"/>
    ${label ? `<text x="${f(tw / 2)}" y="${f(y0 + 20)}" text-anchor="middle" font-family="${SVG.font}" fill="var(--ct)">${label}</text>` : ''}`;
  return SVG.tag(tw, th, res);
}

function isoscelesTriangleSvg(base = 80, height = 70, labelBase = '', labelSide = '', fillColor = 'var(--sf)') {
  const f = SVG.f,
    pX = labelSide ? 45 : 10,
    pT = 10,
    pB = labelBase ? 28 : 10;
  const tw = base + pX * 2,
    th = height + pT + pB,
    x0 = pX,
    y0 = pT + height,
    x1 = pX + base,
    x2 = pX + base / 2;
  const res = `<polygon points="${x0},${y0} ${x1},${y0} ${x2},${pT}" fill="${fillColor}" stroke="var(--ct)" stroke-width="2"/>
    ${labelBase ? `<text x="${f((x0 + x1) / 2)}" y="${f(y0 + 20)}" text-anchor="middle" font-family="${SVG.font}" fill="var(--ct)">${labelBase}</text>` : ''}
    ${labelSide ? `<text x="${f(x0 - 8)}" y="${f((y0 + pT) / 2)}" text-anchor="end" dominant-baseline="middle" font-family="${SVG.font}" fill="var(--ct)">${labelSide}</text>` : ''}`;
  return SVG.tag(tw, th, res);
}

function rhombusSvg(w = 80, h = 60, labelW = '', labelH = '', fillColor = 'var(--sf)') {
  const f = SVG.f,
    pX = labelH ? 40 : 10,
    pY = labelW ? 30 : 10,
    tw = w + pX * 2,
    th = h + pY * 2,
    cx = tw / 2,
    cy = th / 2;
  const pts = `${f(cx)},${f(cy - h / 2)} ${f(cx + w / 2)},${f(cy)} ${f(cx)},${f(cy + h / 2)} ${f(cx - w / 2)},${f(cy)}`;
  const res = `<polygon points="${pts}" fill="${fillColor}" stroke="var(--ct)" stroke-width="2"/>
    ${labelW ? `<text x="${f(cx)}" y="${f(cy + h / 2 + 20)}" text-anchor="middle" font-family="${SVG.font}" fill="var(--ct)">${labelW}</text>` : ''}
    ${labelH ? `<text x="${f(cx - w / 2 - 8)}" y="${f(cy)}" text-anchor="end" dominant-baseline="middle" font-family="${SVG.font}" fill="var(--ct)">${labelH}</text>` : ''}`;
  return SVG.tag(tw, th, res);
}

// parallélogramme — skew is horizontal offset of the top edge (default w/4)
function parallelogramSvg(w = 100, h = 60, skew = 25, labelW = '', labelH = '', fillColor = 'var(--sf)') {
  const padX = labelH ? 40 : 10,
    padY = labelW ? 30 : 10;
  const totalW = w + skew + padX * 2;
  const totalH = h + padY * 2;
  const x0 = padX,
    y0 = padY + h;
  const x1 = padX + w,
    y1 = padY + h;
  const x2 = padX + w + skew,
    y2 = padY;
  const x3 = padX + skew,
    y3 = padY;
  return `<svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" xmlns="http://www.w3.org/2000/svg">
    <polygon points="${x0},${y0} ${x1},${y1} ${x2},${y2} ${x3},${y3}" fill="${fillColor}" stroke="var(--ct)" stroke-width="2"/>
    ${labelW ? `<text x="${(x0 + x1) / 2}" y="${y0 + 22}" text-anchor="middle" font-family="Arial" fill="var(--ct)">${labelW}</text>` : ''}
    ${labelH ? `<text x="${x0 - 8}" y="${(y0 + y3) / 2}" text-anchor="end" dominant-baseline="middle" font-family="Arial" fill="var(--ct)">${labelH}</text>` : ''}
  </svg>`;
}

// trapèze — topW < botW for standard trapezoid (wider base)
function trapezoidSvg(tW = 60, bW = 100, h = 60, labelT = '', labelB = '', labelH = '', fillColor = 'var(--sf)') {
  const f = SVG.f,
    pX = labelH ? 40 : 10,
    pT = labelT ? 28 : 10,
    pB = labelB ? 28 : 10;
  const off = (bW - tW) / 2,
    tw = bW + pX * 2,
    th = h + pT + pB,
    x0 = pX,
    y0 = pT + h;
  const res = `<polygon points="${x0},${y0} ${f(x0 + bW)},${y0} ${f(x0 + off + tW)},${pT} ${f(x0 + off)},${pT}" fill="${fillColor}" stroke="var(--ct)" stroke-width="2"/>
    ${labelB ? `<text x="${f(x0 + bW / 2)}" y="${f(y0 + 20)}" text-anchor="middle" font-family="${SVG.font}" fill="var(--ct)">${labelB}</text>` : ''}
    ${labelT ? `<text x="${f(x0 + off + tW / 2)}" y="${f(pT - 8)}" text-anchor="middle" font-family="${SVG.font}" fill="var(--ct)">${labelT}</text>` : ''}
    ${labelH ? `<text x="${f(x0 - 8)}" y="${f(y0 - h / 2)}" text-anchor="end" dominant-baseline="middle" font-family="${SVG.font}" fill="var(--ct)">${labelH}</text>` : ''}`;
  return SVG.tag(tw, th, res);
}

// polygone régulier — n sides, first vertex at top; covers pentagon, hexagon, octagon, etc.
function regularPolygonSvg(n = 6, size = 80, label = '', fillColor = 'var(--sf)') {
  const r = size / 2;
  const pad = 10,
    labelPad = label ? 24 : 0;
  const totalSize = size + pad * 2;
  const totalH = totalSize + labelPad;
  const cx = totalSize / 2,
    cy = totalSize / 2;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i * 2 * Math.PI) / n - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return `<svg width="${totalSize}" height="${totalH}" viewBox="0 0 ${totalSize} ${totalH}" xmlns="http://www.w3.org/2000/svg">
    <polygon points="${pts}" fill="${fillColor}" stroke="var(--ct)" stroke-width="2"/>
    ${label ? `<text x="${cx}" y="${cy + r + 22}" text-anchor="middle" font-family="Arial" fill="var(--ct)">${label}</text>` : ''}
  </svg>`;
}

// ─── 3D shapes (curriculum additions) ────────────────────────────────────────
// All use the same oblique projection as cubeSvg: depth d maps to (+tilt, -tilt)
// where tilt = d * 0.4. Faces are layered back-to-front (painter's algorithm)
// with rgba overlays to simulate lighting (white=bright top, black=dark right/bottom).

// pavé droit — rectangular prism with distinct width, height, depth
function cuboidSvg(fw = 80, fh = 50, d = 30, color = 'var(--p)', opacity = 1) {
  const tilt = d * 0.4;
  const totalW = fw + tilt + 4;
  const totalH = fh + tilt + 4;
  return `<svg width="${totalW}" height="${totalH}" viewBox="-2 -2 ${totalW} ${totalH}" style="opacity:${opacity}; display:inline-block; margin:4px;" xmlns="http://www.w3.org/2000/svg">
    <g stroke="var(--cs)" stroke-width="1.5" stroke-linejoin="round">
      <polygon points="${tilt},0 ${fw + tilt},0 ${fw},${tilt} 0,${tilt}" fill="${color}"/>
      <polygon points="${tilt},0 ${fw + tilt},0 ${fw},${tilt} 0,${tilt}" fill="rgba(255,255,255,0.3)"/>
      <polygon points="${fw},${tilt} ${fw + tilt},0 ${fw + tilt},${fh} ${fw},${fh + tilt}" fill="${color}"/>
      <polygon points="${fw},${tilt} ${fw + tilt},0 ${fw + tilt},${fh} ${fw},${fh + tilt}" fill="rgba(0,0,0,0.2)"/>
      <polygon points="0,${tilt} ${fw},${tilt} ${fw},${fh + tilt} 0,${fh + tilt}" fill="${color}"/>
    </g>
  </svg>`;
}

// prisme triangulaire — triangular cross-section (equilateral by default), depth d
function triangularPrismSvg(fw = 80, fh = 70, d = 40, color = 'var(--p)', opacity = 1) {
  const tilt = d * 0.4;
  const totalW = fw + tilt + 4;
  const totalH = fh + tilt + 4;
  // Front triangle vertices
  const fa = [fw / 2, tilt],
    fb = [0, fh + tilt],
    fc = [fw, fh + tilt];
  // Back triangle = front + (tilt, -tilt)
  const ba = [fw / 2 + tilt, 0],
    bb = [tilt, fh],
    bc = [fw + tilt, fh];
  const p = (v) => v.join(',');
  return `<svg width="${totalW}" height="${totalH}" viewBox="-2 -2 ${totalW} ${totalH}" style="opacity:${opacity}; display:inline-block; margin:4px;" xmlns="http://www.w3.org/2000/svg">
    <g stroke="var(--cs)" stroke-width="1.5" stroke-linejoin="round">
      <polygon points="${p(fb)} ${p(fc)} ${p(bc)} ${p(bb)}" fill="${color}"/>
      <polygon points="${p(fb)} ${p(fc)} ${p(bc)} ${p(bb)}" fill="rgba(0,0,0,0.3)"/>
      <polygon points="${p(fc)} ${p(fa)} ${p(ba)} ${p(bc)}" fill="${color}"/>
      <polygon points="${p(fc)} ${p(fa)} ${p(ba)} ${p(bc)}" fill="rgba(0,0,0,0.15)"/>
      <polygon points="${p(fa)} ${p(fb)} ${p(fc)}" fill="${color}"/>
    </g>
  </svg>`;
}

// pyramide à base carrée
function squarePyramidSvg(base = 80, pyh = 80, color = 'var(--p)', opacity = 1) {
  const tilt = base * 0.4;
  const totalW = base + tilt + 4;
  const totalH = pyh + tilt + 4;
  const BFL = `0,${pyh + tilt}`,
    BFR = `${base},${pyh + tilt}`;
  const BBR = `${base + tilt},${pyh}`,
    BBL = `${tilt},${pyh}`;
  const APX = `${(base + tilt) / 2},${tilt / 2}`;
  return `<svg width="${totalW}" height="${totalH}" viewBox="-2 -2 ${totalW} ${totalH}" style="opacity:${opacity}; display:inline-block; margin:4px;" xmlns="http://www.w3.org/2000/svg">
    <g stroke="var(--cs)" stroke-width="1.5" stroke-linejoin="round">
      <polygon points="${BFL} ${BFR} ${BBR} ${BBL}" fill="${color}"/>
      <polygon points="${BFL} ${BFR} ${BBR} ${BBL}" fill="rgba(0,0,0,0.35)"/>
      <polygon points="${BFR} ${BBR} ${APX}" fill="${color}"/>
      <polygon points="${BFR} ${BBR} ${APX}" fill="rgba(0,0,0,0.15)"/>
      <polygon points="${BFL} ${BFR} ${APX}" fill="${color}"/>
    </g>
  </svg>`;
}

// tétraèdre (pyramide à base triangulaire régulière)
function tetrahedronSvg(size = 80, color = 'var(--p)', opacity = 1) {
  const h = size * 0.866; // equilateral triangle height
  const tilt = size * 0.3;
  const pad = 4;
  const totalW = size + tilt + pad * 2;
  const totalH = h + tilt + pad * 2;
  // Base: equilateral triangle in oblique projection
  const A = [size / 2 + pad, h + tilt + pad]; // front vertex
  const B = [pad, tilt + pad]; // back-left
  const C = [size + pad, tilt + pad]; // back-right
  // Apex: above centroid
  const cx = (A[0] + B[0] + C[0]) / 3;
  const cy = (A[1] + B[1] + C[1]) / 3;
  const D = [cx + tilt * 0.2, cy - h * 0.55];
  const p = (v) => v.map((n) => n.toFixed(1)).join(',');
  return `<svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" style="opacity:${opacity}; display:inline-block; margin:4px;" xmlns="http://www.w3.org/2000/svg">
    <g stroke="var(--cs)" stroke-width="1.5" stroke-linejoin="round">
      <polygon points="${p(B)} ${p(C)} ${p(D)}" fill="${color}"/>
      <polygon points="${p(B)} ${p(C)} ${p(D)}" fill="rgba(0,0,0,0.25)"/>
      <polygon points="${p(A)} ${p(C)} ${p(D)}" fill="${color}"/>
      <polygon points="${p(A)} ${p(C)} ${p(D)}" fill="rgba(0,0,0,0.1)"/>
      <polygon points="${p(A)} ${p(B)} ${p(D)}" fill="${color}"/>
    </g>
  </svg>`;
}

// rowsOfSvg — equal rows of items (multiplication / division intuition)
// rows: number of rows, cols: items per row
// emoji: any emoji char, or '●' for filled dot
// color: CSS color/var for dots (ignored for emoji)
function rowsOfSvg(rows, cols, emoji = '●', color = 'var(--p)') {
  const ITEM = 26,
    CGAP = 6,
    RGAP = 12,
    PAD = 10;
  const useEmoji = emoji !== '●';
  const W = cols * (ITEM + CGAP) - CGAP + PAD * 2;
  const H = rows * (ITEM + RGAP) - RGAP + PAD * 2;
  let g = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = PAD + c * (ITEM + CGAP) + ITEM / 2;
      const cy = PAD + r * (ITEM + RGAP) + ITEM / 2;
      if (useEmoji) {
        g += `<text x="${cx}" y="${cy + 1}" text-anchor="middle" font-size="${ITEM}" font-family="system-ui,sans-serif">${emoji}</text>`;
      } else {
        g += `<circle cx="${cx}" cy="${cy}" r="${ITEM / 2 - 2}" fill="${color}"/>`;
      }
    }
  }
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${g}</svg>`;
}

// packetsOfSvg — groups of items in rounded packets (multiplication / division intuition)
// packets: number of groups, perPacket: items per group
// emoji: any emoji char, or '●' for filled dot
// color: CSS color/var for dots and packet border
function packetsOfSvg(packets, perPacket, emoji = '●', color = 'var(--p)') {
  const ITEM = 22,
    IGAP = 5,
    IPAD = 8,
    PGAP = 14,
    PAD = 8;
  const useEmoji = emoji !== '●';
  const pCols = perPacket <= 3 ? perPacket : Math.ceil(Math.sqrt(perPacket));
  const pRows = Math.ceil(perPacket / pCols);
  const pW = pCols * ITEM + (pCols - 1) * IGAP + IPAD * 2;
  const pH = pRows * ITEM + (pRows - 1) * IGAP + IPAD * 2;
  const maxPerRow = Math.min(packets, 5);
  const pRowCount = Math.ceil(packets / maxPerRow);
  const W = maxPerRow * pW + (maxPerRow - 1) * PGAP + PAD * 2;
  const H = pRowCount * pH + (pRowCount - 1) * PGAP + PAD * 2;
  let g = '';
  for (let p = 0; p < packets; p++) {
    const pCol = p % maxPerRow;
    const pRow = Math.floor(p / maxPerRow);
    const px = PAD + pCol * (pW + PGAP);
    const py = PAD + pRow * (pH + PGAP);
    g += `<rect x="${px}" y="${py}" width="${pW}" height="${pH}" rx="10" fill="var(--sf)" stroke="${color}" stroke-width="2"/>`;
    for (let i = 0; i < perPacket; i++) {
      const ic = i % pCols;
      const ir = Math.floor(i / pCols);
      const ix = px + IPAD + ic * (ITEM + IGAP) + ITEM / 2;
      const iy = py + IPAD + ir * (ITEM + IGAP) + ITEM / 2;
      if (useEmoji) {
        g += `<text x="${ix}" y="${iy + 1}" text-anchor="middle" font-size="${ITEM}" font-family="system-ui,sans-serif">${emoji}</text>`;
      } else {
        g += `<circle cx="${ix}" cy="${iy}" r="${ITEM / 2 - 2}" fill="${color}"/>`;
      }
    }
  }
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${g}</svg>`;
}

function rulerExerciseSvg(r) {
  if (!r) return '';
  const W = 420,
    PAD = 40,
    Y = 60;
  const range = r.max - r.min;
  if (range <= 0) return '';
  const uw = W / range;
  const divs = r.divisions || 1;
  const subs = r.subdivisions || 0;
  let s = `<line x1="${PAD}" y1="${Y}" x2="${PAD + W}" y2="${Y}" stroke="currentColor" stroke-width="2"/>`;
  for (let u = 0; u <= range; u++) {
    const x = PAD + u * uw;
    s += `<line x1="${x}" y1="${Y - 18}" x2="${x}" y2="${Y}" stroke="currentColor" stroke-width="2"/>`;
    s += `<text x="${x}" y="${Y + 16}" text-anchor="middle" fill="currentColor" font-size="12" font-weight="500">${r.min + u}</text>`;
    if (u < range) {
      for (let d = 1; d < divs; d++) {
        s += `<line x1="${x + (d * uw) / divs}" y1="${Y - 12}" x2="${x + (d * uw) / divs}" y2="${Y}" stroke="currentColor" stroke-width="1.5"/>`;
        // labelDivisions: each tenth written under its tick (hundredths rulers: no counting from the unit)
        if (r.labelDivisions) {
          const v = String(Math.round((r.min + u + d / divs) * 1000) / 1000).replace('.', ',');
          s += `<text x="${x + (d * uw) / divs}" y="${Y + 14}" text-anchor="middle" fill="currentColor" font-size="9" opacity="0.7">${v}</text>`;
        }
      }
      if (subs > 0) {
        for (let d = 0; d < divs; d++) {
          for (let sub = 1; sub < subs; sub++) {
            const xs = x + ((d + sub / subs) * uw) / divs;
            s += `<line x1="${xs}" y1="${Y - 7}" x2="${xs}" y2="${Y}" stroke="currentColor" stroke-width="1"/>`;
          }
        }
      }
    }
  }
  if (r.markers) {
    r.markers.forEach((m) => {
      const x = PAD + (m.value - r.min) * uw;
      s += `<polygon points="${x},${Y - 22} ${x - 6},${Y - 34} ${x + 6},${Y - 34}" class="fill-red-500 dark:fill-red-400"/>`;
      s += `<text x="${x}" y="${Y - 38}" text-anchor="middle" fill="currentColor" font-size="14" font-weight="700" class="fill-red-600 dark:fill-red-400">${m.label}</text>`;
    });
  }
  return s;
}

// Graduations of a jug or a dial: every `step`, longer every `label / 2` when it falls on a step, a number every `label`
function scaleTicks(r) {
  const k = (v) => Math.round(v * 1e6) / 1e6;
  const step = r.step,
    label = r.label ?? step * 10,
    half = label / 2;
  const onStep = (v, by) => Math.abs(v / by - Math.round(v / by)) < 1e-6;
  const out = [];
  for (let i = 0; k(r.min + i * step) <= r.max; i++) {
    const v = k(r.min + i * step);
    out.push({
      v,
      kind: onStep(v - r.min, label) ? 'label' : onStep(v - r.min, half) && onStep(half, step) ? 'half' : 'step',
    });
  }
  return out;
}
const scaleText = (v) => String(v).replace('.', ',');

// Measuring jug: liquid up to markers[0].value; graduations on the left wall, the unit at the top
function jugSvg(r) {
  const W = 200,
    TOP = 34,
    BOT = 292,
    X0 = 46,
    X1 = 150,
    H = BOT + 14;
  const Y0 = BOT - 12,
    Y1 = TOP + 24; // min and max
  const y = (v) => Y0 - ((v - r.min) * (Y0 - Y1)) / (r.max - r.min);
  const val = r.markers?.[0]?.value ?? r.min;
  const F = 'font-family="system-ui,sans-serif"';
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="mx-auto" style="max-height:460px;width:auto" xmlns="http://www.w3.org/2000/svg">`;
  // Handle, then the body (a spout at the top right)
  s += `<path d="M${X1} ${TOP + 40} C${X1 + 46} ${TOP + 40} ${X1 + 46} ${TOP + 150} ${X1} ${TOP + 150}" fill="none" stroke="#94a3b8" stroke-width="10" stroke-linecap="round"/>`;
  const body = `M${X0 - 6} ${TOP} L${X0} ${BOT - 10} Q${X0} ${BOT} ${X0 + 10} ${BOT} L${X1 - 10} ${BOT} Q${X1} ${BOT} ${X1} ${BOT - 10} L${X1} ${TOP + 10} L${X1 + 12} ${TOP}`;
  s += `<path d="${body} Z" fill="white" fill-opacity="0.85"/>`;
  // Liquid: clipped by the body
  s += `<clipPath id="jug-in"><path d="${body} Z"/></clipPath>`;
  const ly = y(val);
  if (val > r.min) {
    s += `<rect x="${X0 - 8}" y="${ly}" width="${X1 - X0 + 24}" height="${BOT - ly}" fill="#7dd3fc" fill-opacity="0.75" clip-path="url(#jug-in)"/>`;
  }
  s += `<line data-level="1" x1="${X0 - 2}" y1="${ly}" x2="${X1}" y2="${ly}" stroke="#0284c7" stroke-width="2.5"/>`;
  s += `<path d="${body}" fill="none" stroke="#64748b" stroke-width="3" stroke-linejoin="round"/>`;
  // Graduations
  for (const t of scaleTicks(r)) {
    const ty = y(t.v),
      len = t.kind === 'label' ? 22 : t.kind === 'half' ? 15 : 9;
    s += `<line x1="${X0 + 1}" y1="${ty}" x2="${X0 + 1 + len}" y2="${ty}" stroke="#334155" stroke-width="${t.kind === 'label' ? 2 : 1.2}"/>`;
    if (t.kind === 'label')
      s += `<text x="${X0 + 28}" y="${ty + 4}" fill="#1e293b" font-size="12" font-weight="600" ${F}>${scaleText(t.v)}</text>`;
  }
  s += `<text x="${(X0 + X1) / 2}" y="${TOP - 12}" text-anchor="middle" fill="#64748b" font-size="13" font-weight="700" ${F}>${r.unit || ''}</text>`;
  return s + '</svg>';
}

// Scale dial (kitchen scale, bathroom scale): min … max over 300°, the needle on markers[0].value
function dialSvg(r) {
  const W = 260,
    C = 130,
    R = 112,
    SWEEP = 300;
  const ang = (v) => (-SWEEP / 2 + ((v - r.min) * SWEEP) / (r.max - r.min)) * (Math.PI / 180); // 0 = straight up
  const at = (a, d) => [C + d * Math.sin(a), C - d * Math.cos(a)];
  const f = (v) => Math.round(v * 100) / 100;
  const val = r.markers?.[0]?.value ?? r.min;
  const F = 'font-family="system-ui,sans-serif"';
  let s = `<svg viewBox="0 0 ${W} ${W}" width="${W}" height="${W}" class="mx-auto" style="max-height:420px;width:auto" xmlns="http://www.w3.org/2000/svg">`;
  s += `<circle cx="${C}" cy="${C}" r="${R + 10}" fill="#e2e8f0" stroke="#64748b" stroke-width="3"/>`;
  s += `<circle cx="${C}" cy="${C}" r="${R}" fill="white"/>`;
  for (const t of scaleTicks(r)) {
    const a = ang(t.v),
      len = t.kind === 'label' ? 16 : t.kind === 'half' ? 11 : 6;
    const [x1, y1] = at(a, R - 2),
      [x2, y2] = at(a, R - 2 - len);
    s += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="#334155" stroke-width="${t.kind === 'label' ? 2 : 1.2}"/>`;
    if (t.kind === 'label') {
      const [lx, ly] = at(a, R - 32);
      s += `<text x="${f(lx)}" y="${f(ly + 4)}" text-anchor="middle" fill="#1e293b" font-size="13" font-weight="600" ${F}>${scaleText(t.v)}</text>`;
    }
  }
  s += `<text x="${C}" y="${C + 46}" text-anchor="middle" fill="#64748b" font-size="15" font-weight="700" ${F}>${r.unit || ''}</text>`;
  const [nx, ny] = at(ang(val), R - 8);
  s += `<line data-needle="1" x1="${C}" y1="${C}" x2="${f(nx)}" y2="${f(ny)}" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/>`;
  s += `<circle cx="${C}" cy="${C}" r="7" fill="#dc2626"/>`;
  return s + '</svg>';
}

function thermometerExerciseSvg(r) {
  if (!r) return '';
  if (r.kind === 'jug') return jugSvg(r);
  if (r.kind === 'dial') return dialSvg(r);
  const min = r.min ?? 0;
  const max = r.max ?? 30;
  const range = max - min;
  if (range <= 0) return '';

  const PPD = Math.max(12, Math.round(240 / range)); // short ranges (fever 35–42) get room for half-degree ticks
  const CX = 44;
  const HALF_OW = 8; // half outer tube width → tube is 16px wide
  const HALF_IW = 5; // half mercury column width → column is 10px wide
  const BULB_R = 18;
  const TOP_Y = 30;
  const TUBE_H = range * PPD;
  const BOT_Y = TOP_Y + TUBE_H;
  const BULB_CY = BOT_Y + BULB_R - 2;
  const SVG_H = BULB_CY + BULB_R + 10;
  const SVG_W = 120;

  const val = r.markers?.[0]?.value ?? min;
  const fillH = Math.max(0, (val - min) * PPD);
  const mercuryTop = BOT_Y - fillH;

  const RED = '#ef4444';
  const GRAY = '#94a3b8';
  const DARK = '#334155';

  let s = `<svg viewBox="0 0 ${SVG_W} ${SVG_H}" width="${SVG_W}" height="${SVG_H}" class="mx-auto" style="max-height:460px;width:auto">`;

  // Bulb fill (always red)
  s += `<circle cx="${CX}" cy="${BULB_CY}" r="${BULB_R}" fill="${RED}"/>`;

  // Tube background — white rect with full rounding covers top of bulb for a clean junction
  s += `<rect x="${CX - HALF_OW}" y="${TOP_Y}" width="${HALF_OW * 2}" height="${TUBE_H}" rx="${HALF_OW}" fill="white"/>`;

  // Mercury column + bridge down to bulb centre
  if (fillH > 0) {
    const bridgeH = fillH + (BULB_CY - BOT_Y) + BULB_R;
    s += `<rect x="${CX - HALF_IW}" y="${mercuryTop}" width="${HALF_IW * 2}" height="${bridgeH}" fill="${RED}"/>`;
  }

  // Tube border on top (stroke only — visually contains the mercury)
  s += `<rect x="${CX - HALF_OW}" y="${TOP_Y}" width="${HALF_OW * 2}" height="${TUBE_H}" rx="${HALF_OW}" fill="none" stroke="${GRAY}" stroke-width="2"/>`;

  // Bulb border
  s += `<circle cx="${CX}" cy="${BULB_CY}" r="${BULB_R}" fill="none" stroke="${GRAY}" stroke-width="2"/>`;

  // Ticks and labels — half-degree steps (r.step: 1 = whole degrees only), labels every 5°
  const LABEL_STEP = range <= 10 ? 2 : 5;
  for (let t = min; t <= max + 0.001; t += r.step ?? 0.5) {
    const y = BOT_Y - (t - min) * PPD;
    const isWhole = Math.abs(t - Math.round(t)) < 0.001;
    const isLabel = isWhole && Math.round(t) % LABEL_STEP === 0;
    const tickX = CX + HALF_OW + 1;
    const len = isLabel ? 12 : isWhole ? 7 : 4;
    s += `<line x1="${tickX}" y1="${y}" x2="${tickX + len}" y2="${y}" stroke="${DARK}" stroke-width="${isLabel ? 1.5 : 1}"/>`;
    if (isLabel) {
      s += `<text x="${tickX + len + 3}" y="${y + 4}" fill="${DARK}" font-size="11" font-family="sans-serif">${Math.round(t)}</text>`;
    }
  }

  // °C unit label at top
  s += `<text x="${CX + HALF_OW + 3}" y="${TOP_Y - 8}" fill="#64748b" font-size="11" font-family="sans-serif">°C</text>`;

  s += `</svg>`;
  return s;
}

function numberLineSvg(nl) {
  if (!nl) return '';
  const min = nl.min ?? 0;
  const max = nl.max ?? 10;
  const range = max - min;
  if (range <= 0) return '';

  const PAD = 40,
    W = 420,
    LY = 58;
  const uw = W / range;
  const step = nl.step ?? 1;
  const subs = nl.subdivisions ?? 0;

  let s = '';

  // Horizontal line with right arrowhead
  s += `<line x1="${PAD}" y1="${LY}" x2="${PAD + W + 8}" y2="${LY}" stroke="currentColor" stroke-width="2"/>`;
  s += `<polygon points="${PAD + W + 14},${LY} ${PAD + W + 5},${LY - 5} ${PAD + W + 5},${LY + 5}" fill="currentColor"/>`;

  // Major ticks and labels
  for (let v = min, i = 0; v <= max + 1e-9; v = Math.round((v + step) * 1e9) / 1e9, i++) {
    const x = PAD + (v - min) * uw;
    s += `<line x1="${x}" y1="${LY - 10}" x2="${x}" y2="${LY + 6}" stroke="currentColor" stroke-width="2"/>`;
    const lbl = Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000).replace('.', ',');
    // Estimate mode: inner ticks stay as landmarks, only the two ends carry a number
    if (nl.mode !== 'estimate' || v <= min + 1e-9 || v >= max - 1e-9)
      s += `<text x="${x}" y="${LY + 21}" text-anchor="middle" fill="currentColor" font-size="12" font-weight="500">${lbl}</text>`;

    // Minor ticks (subdivisions) between this major tick and the next
    if (subs > 0 && v < max - 1e-9) {
      const subStep = step / subs;
      for (let si = 1; si < subs; si++) {
        const sv = Math.round((v + si * subStep) * 1e9) / 1e9;
        if (sv >= max - 1e-9) break;
        const sx = PAD + (sv - min) * uw;
        s += `<line x1="${sx}" y1="${LY - 5}" x2="${sx}" y2="${LY + 3}" stroke="currentColor" stroke-width="1.5"/>`;
      }
    }
  }

  // Named point in read mode
  if ((nl.mode || 'read') === 'read' && nl.value != null) {
    const mx = PAD + (nl.value - min) * uw;
    const lbl = nl.label || 'A';
    s += `<circle cx="${mx}" cy="${LY}" r="6" class="fill-primary-500"/>`;
    s += `<line x1="${mx}" y1="${LY - 6}" x2="${mx}" y2="${LY - 15}" stroke-width="2" class="stroke-primary-500"/>`;
    s += `<text x="${mx}" y="${LY - 19}" text-anchor="middle" font-size="13" font-weight="700" class="fill-primary-600 dark:fill-primary-400">${lbl}</text>`;
  }

  return s;
}

/* Coordinate grid — quadrillage with axes, ticks, labels, and optional named points.
   cg: { cols, rows, points: [{x, y, label}] }
   ViewBox: 420×410. Grid area 360×360 with PAD_LEFT=40, PAD_RIGHT=20, PAD_TOP=20, PAD_BOTTOM=30.
   Cell size: 360/cols × 360/rows (60px/cell for 6×6, 36px for 10×10). */
function coordinateGridSvg(cg) {
  if (!cg) return '';
  const cols = cg.cols ?? 6;
  const rows = cg.rows ?? 6;

  const VW = 435,
    VH = 428;
  const PL = 40,
    PR = 35,
    PT = 38,
    PB = 30;
  const GW = VW - PL - PR; // 360
  const GH = VH - PT - PB; // 360
  const cw = GW / cols;
  const ch = GH / rows;

  // SVG coords: col/row → pixel (row 0 at bottom, y flipped)
  const toX = (col) => PL + col * cw;
  const toY = (row) => PT + (rows - row) * ch;

  let s = '';

  // Grid lines (very light)
  for (let c = 0; c <= cols; c++) {
    const x = toX(c);
    s += `<line x1="${x}" y1="${PT}" x2="${x}" y2="${PT + GH}" stroke="currentColor" stroke-width="0.5" opacity="0.25"/>`;
  }
  for (let r = 0; r <= rows; r++) {
    const y = toY(r);
    s += `<line x1="${PL}" y1="${y}" x2="${PL + GW}" y2="${y}" stroke="currentColor" stroke-width="0.5" opacity="0.25"/>`;
  }

  // x-axis (y=0 → top of axis is at bottom of grid)
  const ay = toY(0);
  s += `<line x1="${PL}" y1="${ay}" x2="${PL + GW + 10}" y2="${ay}" stroke="currentColor" stroke-width="2"/>`;
  s += `<polygon points="${PL + GW + 15},${ay} ${PL + GW + 7},${ay - 4} ${PL + GW + 7},${ay + 4}" fill="currentColor"/>`;
  s += `<text x="${PL + GW + 18}" y="${ay + 6}" font-size="20" fill="currentColor" font-style="italic" font-weight="bold">x</text>`;

  // y-axis (x=0 → left edge of grid)
  const ax = toX(0);
  s += `<line x1="${ax}" y1="${PT + GH}" x2="${ax}" y2="${PT - 10}" stroke="currentColor" stroke-width="2"/>`;
  s += `<polygon points="${ax},${PT - 15} ${ax - 4},${PT - 7} ${ax + 4},${PT - 7}" fill="currentColor"/>`;
  s += `<text x="${ax}" y="${PT - 22}" font-size="20" fill="currentColor" font-style="italic" font-weight="bold" text-anchor="middle">y</text>`;

  // Origin label "0"
  s += `<text x="${ax - 14}" y="${ay + 22}" font-size="18" fill="currentColor" font-weight="bold" text-anchor="middle">0</text>`;

  // x-axis ticks and labels (1 … cols)
  for (let c = 1; c <= cols; c++) {
    const x = toX(c);
    s += `<line x1="${x}" y1="${ay - 4}" x2="${x}" y2="${ay + 4}" stroke="currentColor" stroke-width="1.5"/>`;
    s += `<text x="${x}" y="${ay + 22}" text-anchor="middle" font-size="18" font-weight="bold" fill="currentColor">${c}</text>`;
  }

  // y-axis ticks and labels (1 … rows)
  for (let r = 1; r <= rows; r++) {
    const y = toY(r);
    s += `<line x1="${ax - 4}" y1="${y}" x2="${ax + 4}" y2="${y}" stroke="currentColor" stroke-width="1.5"/>`;
    s += `<text x="${ax - 12}" y="${y + 5}" text-anchor="end" font-size="18" font-weight="bold" fill="currentColor">${r}</text>`;
  }

  // Intersection dots (for grids ≤ 10×10, aids readability)
  if (cols <= 10 && rows <= 10) {
    for (let c = 0; c <= cols; c++) {
      for (let r = 0; r <= rows; r++) {
        if (c === 0 && r === 0) continue; // skip origin, already labelled
        const x = toX(c),
          y = toY(r);
        s += `<circle cx="${x}" cy="${y}" r="1.5" fill="currentColor" opacity="0.3"/>`;
      }
    }
  }

  // Named points
  (cg.points || []).forEach((pt) => {
    const px = toX(pt.x);
    const py = toY(pt.y);
    s += `<circle cx="${px}" cy="${py}" r="5" class="fill-primary-500"/>`;
    if (pt.label) {
      s += `<text x="${px + 12}" y="${py - 10}" font-size="20" font-weight="900" class="fill-primary-600 dark:fill-primary-400">${pt.label}</text>`;
    }
  });

  return s;
}

/* Place-value grid — highlights the target column in amber.
   number: integer, pos: 0-based index from the right (0=units, 1=tens, …).
   Labels use French abbreviations: U D C M DM CM. */
function placeValueSvg(number, pos) {
  const digits = String(number).split('').map(Number);
  const n = digits.length;
  const LABELS = ['U', 'D', 'C', 'M', 'DM', 'CM'];

  const cw = 52,
    rh = 44,
    gap = 3;
  const W = n * (cw + gap) + gap;
  const H = 2 * (rh + gap) + gap;

  let s = '';
  for (let i = 0; i < n; i++) {
    const pfr = n - 1 - i; // position from right
    const hl = pfr === pos;
    const x = gap + i * (cw + gap);
    const y1 = gap;
    const y2 = gap + rh + gap;

    // Label cell
    s += `<rect x="${x}" y="${y1}" width="${cw}" height="${rh}" rx="6"
               fill="${hl ? 'var(--a)' : 'var(--sc)'}"/>
          <text x="${x + cw / 2}" y="${y1 + rh - 11}" text-anchor="middle"
                font-family="system-ui,sans-serif" font-size="15" font-weight="800"
                fill="${hl ? '#fff' : 'var(--cs)'}">${LABELS[pfr] || '?'}</text>`;

    // Digit cell
    s += `<rect x="${x}" y="${y2}" width="${cw}" height="${rh}" rx="6"
               fill="var(--sf)" stroke="${hl ? 'var(--a)' : 'var(--cs)'}"
               stroke-width="${hl ? 2.5 : 1}"/>
          <text x="${x + cw / 2}" y="${y2 + rh - 9}" text-anchor="middle"
                font-family="system-ui,sans-serif" font-size="26" font-weight="800"
                fill="${hl ? 'var(--a)' : 'var(--ct)'}">${digits[i]}</text>`;
  }

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
               xmlns="http://www.w3.org/2000/svg">
    ${s}
  </svg>`;
}

/* Large emoji display for unit-of-measure exercises.
   Shows the emoji centred, large enough for young children. */
/* Minimal analog clock — circle + two hands, no numbers, no tick marks.
   Designed for compact use in matching exercises (size ≈ 72–80px).
   hour: 1-12, minute: 0-59, size: px (default 72).
   Hand colors follow palette: hour = var(--ct), minute = var(--p). */
function clockSvg(hour, minute, size = 72) {
  const f = SVG.f,
    c = size / 2,
    r = size / 2 - 2;
  const toXY = (deg, len) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [f(c + Math.cos(rad) * len), f(c + Math.sin(rad) * len)];
  };
  const hAngle = ((hour % 12) + minute / 60) * 30,
    mAngle = minute * 6;
  const [hx, hy] = toXY(hAngle, r * 0.55),
    [mx, my] = toXY(mAngle, r * 0.82);
  const hw = f(size / 14),
    mw = f(size / 22),
    pr = f(size / 18);
  const res = `<circle cx="${c}" cy="${c}" r="${r}" fill="var(--sf)" stroke="var(--ct)" stroke-width="1.5"/>
    <line x1="${c}" y1="${c}" x2="${hx}" y2="${hy}" stroke="var(--ct)" stroke-width="${hw}" stroke-linecap="round"/>
    <line x1="${c}" y1="${c}" x2="${mx}" y2="${my}" stroke="var(--p)" stroke-width="${mw}" stroke-linecap="round"/>
    <circle cx="${c}" cy="${c}" r="${pr}" fill="var(--ct)"/>`;
  return SVG.tag(size, size, res);
}

// Die faces: 1–6 the usual pips; 7–10 on two dice, 5 and the rest (the GS constellations)
function diceSvg(n, size = 48) {
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const die = (k, x) =>
    `<rect x="${x + 2}" y="2" width="86" height="86" rx="14" fill="var(--sf)" stroke="var(--ct)" stroke-width="3"/>` +
    PIPS[k]
      .map((p) => `<circle cx="${x + 22 + (p % 3) * 23}" cy="${22 + Math.floor(p / 3) * 23}" r="8" fill="var(--ct)"/>`)
      .join('');
  const faces = n > 6 ? [5, n - 5] : [n];
  const w = faces.length * 90 + (faces.length - 1) * 8;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 90" width="${SVG.f((size * w) / 90)}" height="${size}" role="img" aria-label="${n} points" style="max-width:100%;height:auto">${faces.map((k, i) => die(k, i * 98)).join('')}</svg>`;
}

// Memory card face (type memory): dots, fingers, n emojis (rows of 5), a shaded disc, a clock,
// base-10 blocks or a stacked fraction; text cards are already HTML
function memoryCardHtml(c) {
  if (c.dots != null) return diceSvg(c.dots);
  if (c.fingers != null) return mainsSvg(c.fingers > 5 ? [5, c.fingers - 5] : [c.fingers]);
  if (c.emoji) {
    // Rows of k, sized to the card (container units): 4 as 2 × 2, 6–10 as 5 and the rest
    const k = c.n <= 3 ? c.n : c.n === 4 ? 2 : 5;
    const rows = [];
    for (let i = 0; i < c.n; i += k) rows.push(`<span>${c.emoji.repeat(Math.min(k, c.n - i))}</span>`);
    const size = { 1: 45, 2: 32, 3: 25, 5: 16 }[k];
    return `<span class="mem-emoji" style="font-size:${size}cqi" role="img" aria-label="${c.n} ${c.emoji}">${rows.join('')}</span>`;
  }
  if (c.pie) return slicedPieSvg(c.pie[1], c.pie[0], 60);
  if (c.clock) return clockSvg(c.clock[0], c.clock[1], 60);
  if (c.blocks != null) {
    // Tens as striped rods, units two by two from the bottom (base10Render's units are too small here)
    const U = 10,
      t = Math.floor(c.blocks / 10) % 10,
      u = c.blocks % 10;
    let g = '';
    for (let i = 0; i < t; i++) {
      const x = 2 + i * (U + 5);
      g += `<rect x="${x}" y="2" width="${U}" height="${10 * U}" fill="var(--p)" stroke="var(--ct)" stroke-width="1"/>`;
      for (let k = 1; k < 10; k++)
        g += `<line x1="${x}" y1="${2 + k * U}" x2="${x + U}" y2="${2 + k * U}" stroke="var(--sf)" stroke-width="1"/>`;
    }
    const ux = 2 + t * (U + 5) + (t ? 4 : 0);
    for (let i = 0; i < u; i++)
      g += `<rect x="${ux + (i % 2) * (U + 2)}" y="${2 + 10 * U - (Math.floor(i / 2) + 1) * (U + 2) + 2}" width="${U}" height="${U}" fill="var(--orange)" stroke="var(--ct)" stroke-width="1"/>`;
    const w = ux + (u ? 2 * U + 4 : 0);
    return `<svg viewBox="0 0 ${w} ${10 * U + 4}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${c.blocks}">${g}</svg>`;
  }
  if (c.frac)
    return `<span class="frac" style="font-size:min(24cqi,2rem)"><span class="fn">${c.frac[0]}</span><span class="fd">${c.frac[1]}</span></span>`;
  // Short texts (a number, « 6 × 7 ») big, long ones (« quatre-vingt-dix-neuf ») at the base size
  const plain = String(c.text).replace(/<[^>]*>/g, '');
  const len = plain.replace(/\s/g, '').length + 0.4 * (plain.match(/\s/g) || []).length;
  if (len > 8) return c.text;
  return `<span style="font-size:min(2.5rem,${Math.round(100 / Math.max(len, 3))}cqi)">${c.text}</span>`;
}

function objectMeasureSvg(emoji) {
  return `<svg width="120" height="110" viewBox="0 0 120 110" xmlns="http://www.w3.org/2000/svg">
    <text x="60" y="90" text-anchor="middle"
          font-family="system-ui,sans-serif" font-size="80">${emoji}</text>
  </svg>`;
}

/* Sharing diagram — emoji grid (rows=parts, cols=quotient) + partition rectangle.
   Conveys "fair sharing": each row is one share, rectangle shows the structure.
   parts: divisor (number of shares), total: dividend, emoji: item to share. */
function partagerSvg(emoji, total, parts) {
  const q = total / parts;
  const ITEM = 22,
    CGAP = 6,
    RGAP = 8,
    GPAD = 10;
  const cols = q,
    rows = parts;
  const gridW = cols * (ITEM + CGAP) - CGAP + GPAD * 2;
  const gridH = rows * (ITEM + RGAP) - RGAP + GPAD * 2;

  // Partition rectangle: top cell = total, bottom row = parts blank cells
  const CW = Math.max(44, Math.round(gridW / parts)),
    CH = 36,
    SW = 1.5;
  const rectW = parts * CW,
    rectH = CH * 2;

  const MID = 24;
  const W = gridW + MID + rectW;
  const H = Math.max(gridH, rectH);
  const gridY = (H - gridH) / 2;
  const rectX = gridW + MID;
  const rectY = (H - rectH) / 2;

  let g = '';
  // Emoji grid
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = GPAD + c * (ITEM + CGAP) + ITEM / 2;
      const y = gridY + GPAD + r * (ITEM + RGAP) + ITEM / 2 + 7;
      g += `<text x="${x}" y="${y}" text-anchor="middle" font-size="${ITEM}" font-family="system-ui,sans-serif">${emoji}</text>`;
    }
  }
  // Top cell
  g += `<rect x="${rectX}" y="${rectY}" width="${rectW}" height="${CH}" fill="var(--sf)" stroke="var(--ct)" stroke-width="${SW}"/>`;
  g += `<text x="${rectX + rectW / 2}" y="${rectY + CH / 2 + 7}" text-anchor="middle" font-size="18" font-weight="bold" font-family="system-ui,sans-serif" fill="var(--ct)">${total}</text>`;
  // Bottom cells
  for (let i = 0; i < parts; i++) {
    g += `<rect x="${rectX + i * CW}" y="${rectY + CH}" width="${CW}" height="${CH}" fill="var(--sf)" stroke="var(--ct)" stroke-width="${SW}"/>`;
  }

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${g}</svg>`;
}

/* Two-step jump arrow diagram — shows the "pass through the ten" strategy.
   step1 is always ±10, step2 is the ±1 correction. The end of the jump is the answer, so it
   shows « ? » (it used to print the result right above the input).
   Uses palette vars: var(--p) for the big jump, var(--a) for the small correction. */
function jumpArrowSvg(start, step1, step2) {
  const mid = start + step1;
  const lbl = (n) => (n > 0 ? `+${n}` : `\u2212${Math.abs(n)}`);

  const W = 340,
    H = 112;
  // Three node x-centres; leave room for 3-digit numbers
  const nx = [50, 170, 290];
  const ny = 100; // number baseline
  const footY = 74; // where a hop leaves / lands, just above the numbers
  const ctrlY = 18; // Bézier control point: the hop peaks at (footY + ctrlY) / 2

  // A hop drawn as an arc (like the lesson's « 467 ⤻ 567 »), its label in a pill on top —
  // big enough that the pupil reads « +10 » then « −1 » (13px plain text went unnoticed)
  const arrow = (x1, x2, label, color) => {
    const ax = x1 + 10,
      bx = x2 - 10,
      mx = (x1 + x2) / 2;
    // Arrowhead along the tangent at the end of the curve (control point → end point)
    const ang = Math.atan2(footY - ctrlY, bx - mx);
    const head = (a, r) => `${bx - r * Math.cos(ang + a)},${footY - r * Math.sin(ang + a)}`;
    const pillW = 22 + 11 * label.length;
    return `
      <path d="M${ax},${footY} Q${mx},${ctrlY} ${bx},${footY}" fill="none"
            stroke="${color}" stroke-width="3" stroke-linecap="round"/>
      <polygon points="${bx},${footY} ${head(0.45, 12)} ${head(-0.45, 12)}" fill="${color}"/>
      <rect x="${mx - pillW / 2}" y="4" width="${pillW}" height="30" rx="15"
            fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="2"/>
      <text x="${mx}" y="26" text-anchor="middle"
            font-family="system-ui,sans-serif" font-size="19" font-weight="800"
            fill="${color}">${label}</text>`;
  };

  const num = (x, val) =>
    `<text x="${x}" y="${ny}" text-anchor="middle"
           font-family="system-ui,sans-serif" font-size="26" font-weight="800"
           fill="var(--ct)">${val}</text>`;

  // Drawn 1.3× its viewBox so the hops weigh about as much as the « 32 + 12 = ? » below
  return `<svg width="${W * 1.3}" height="${H * 1.3}" viewBox="0 0 ${W} ${H}" style="max-width:100%;height:auto" xmlns="http://www.w3.org/2000/svg">
    ${num(nx[0], start)}
    ${arrow(nx[0], nx[1], lbl(step1), 'var(--p)')}
    ${num(nx[1], mid)}
    ${arrow(nx[1], nx[2], lbl(step2), 'var(--a)')}
    ${num(nx[2], '?')}
  </svg>`;
}

/* Euro notes and coins — e.g. a wallet's content: notes on the first row(s), coins below.
   items: values in cents, any order (2000 = billet de 20 €, 50 = pièce de 50 c).
   Fixed colours, not palette vars: money looks the same in light and dark modes.
   Real proportions within each kind — notes at 0.8 px/mm, coins at 1.6 px/mm (twice the
   notes' scale, else a 1 c coin would be too small to read). */
const MONEY_NOTES = {
  // value: [width mm, height mm, fill, ink]
  500: [120, 62, '#e4e8e2', '#56635a'],
  1000: [127, 67, '#f8dbd8', '#b3261e'],
  2000: [133, 72, '#d8e5f6', '#1d5aa6'],
  5000: [140, 77, '#fde3c6', '#b45309'],
  10000: [147, 77, '#d6edd7', '#2e7d32'],
  20000: [153, 77, '#f4e8bb', '#7c6200'],
};
const MONEY_METAL = {
  cu: ['#d9825b', '#8c3b18', '#3d1403'], // copper: fill, rim, ink
  au: ['#efc94c', '#9a7400', '#4a3b00'], // Nordic gold
  ag: ['#d5d9dd', '#6b7280', '#1f2937'], // silver
};
const MONEY_COINS = {
  // value: [diameter mm, centre metal, ring metal (bimetallic coins)]
  1: [16.25, 'cu'],
  2: [18.75, 'cu'],
  5: [21.25, 'cu'],
  10: [19.75, 'au'],
  20: [22.25, 'au'],
  50: [24.25, 'au'],
  100: [23.25, 'ag', 'au'],
  200: [25.75, 'au', 'ag'],
};
const moneyLabel = (v) => (v >= 100 ? `${v / 100} €` : `${v} c`);

function moneySvg(items) {
  const vals = items
    .map(Number)
    .filter((v) => v in MONEY_NOTES || v in MONEY_COINS)
    .sort((a, b) => b - a);
  const MAX_W = 360,
    GAP = 8,
    PAD = 4,
    font = `font-family="${SVG.font}" font-weight="800" text-anchor="middle"`;

  const note = (v) => {
    const [wmm, hmm, fill, ink] = MONEY_NOTES[v];
    const w = wmm * 0.8,
      h = hmm * 0.8;
    return {
      w,
      h,
      draw: (x, y) =>
        `<rect x="${SVG.f(x)}" y="${SVG.f(y)}" width="${SVG.f(w)}" height="${SVG.f(h)}" rx="4" fill="${fill}" stroke="${ink}" stroke-width="1.5"/>` +
        `<rect x="${SVG.f(x + 6)}" y="${SVG.f(y + 4)}" width="${SVG.f(w * 0.14)}" height="${SVG.f(h - 8)}" rx="2" fill="${ink}" opacity=".2"/>` +
        `<text x="${SVG.f(x + w * 0.58)}" y="${SVG.f(y + h * 0.64)}" font-size="${SVG.f(h * 0.42)}" fill="${ink}" ${font}>${moneyLabel(v)}</text>`,
    };
  };
  const coin = (v) => {
    const [dmm, centre, ring] = MONEY_COINS[v];
    const r = (dmm * 1.6) / 2;
    const [fill, rim, ink] = MONEY_METAL[centre];
    return {
      w: 2 * r,
      h: 2 * r,
      draw: (x, y) => {
        const cx = SVG.f(x + r),
          cy = SVG.f(y + r);
        const disc = ring
          ? `<circle cx="${cx}" cy="${cy}" r="${SVG.f(r - 0.75)}" fill="${MONEY_METAL[ring][0]}" stroke="${MONEY_METAL[ring][1]}" stroke-width="1.5"/>` +
            `<circle cx="${cx}" cy="${cy}" r="${SVG.f(r * 0.7)}" fill="${fill}" stroke="${rim}" stroke-width=".75"/>`
          : `<circle cx="${cx}" cy="${cy}" r="${SVG.f(r - 0.75)}" fill="${fill}" stroke="${rim}" stroke-width="1.5"/>`;
        return `${disc}<text x="${cx}" y="${SVG.f(y + r * 1.32)}" font-size="${SVG.f(r * 0.72)}" fill="${ink}" ${font}>${moneyLabel(v)}</text>`;
      },
    };
  };

  // Lay out: wrap at MAX_W; coins always start a new row below the notes
  const rows = [];
  let row = null,
    prevNote = null;
  for (const v of vals) {
    const isNote = v in MONEY_NOTES;
    const s = isNote ? note(v) : coin(v);
    if (!row || isNote !== prevNote || row.w + GAP + s.w > MAX_W - 2 * PAD) {
      row = { items: [], w: -GAP, h: 0 };
      rows.push(row);
    }
    row.items.push(s);
    row.w += GAP + s.w;
    row.h = Math.max(row.h, s.h);
    prevNote = isNote;
  }

  // Rows centred on the widest one
  const W = Math.max(...rows.map((r) => r.w)) + 2 * PAD;
  let body = '',
    y = PAD;
  for (const r of rows) {
    let x = (W - r.w) / 2;
    for (const s of r.items) {
      body += s.draw(x, y + (r.h - s.h) / 2);
      x += s.w + GAP;
    }
    y += r.h + GAP;
  }
  const H = y - GAP + PAD;

  // Spoken description: « 2 billets de 10 €, 1 pièce de 50 c »
  const counts = new Map();
  for (const v of vals) counts.set(v, (counts.get(v) || 0) + 1);
  const label = [...counts]
    .map(([v, n]) => `${n} ${v in MONEY_NOTES ? 'billet' : 'pièce'}${n > 1 ? 's' : ''} de ${moneyLabel(v)}`)
    .join(', ');

  // Drawn 1.6× its viewBox: coin labels stay readable on a tablet
  return `<svg width="${SVG.f(W * 1.6)}" height="${SVG.f(H * 1.6)}" viewBox="0 0 ${SVG.f(W)} ${SVG.f(H)}" role="img" aria-label="${label}" style="max-width:100%;height:auto" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

/* Balance scale SVG — shows a balanced or tilted two-pan scale.
   leftItems / rightItems: arrays of values — numbers render as weight blocks,
   strings render as emoji. Items stack side-by-side on their pan.
   tilt: 'balanced' (default) | 'left' (left pan lower) | 'right' (right pan lower).
   Called via  scaleSvg(leftArray, rightArray, tilt).
   Structural elements use palette vars; weight blocks use fixed dark fill so
   they look like physical weights in both light and dark modes. */
function scaleSvg(leftItems, rightItems, tilt = 'balanced') {
  const W = 340,
    H = 260;

  const left = Array.isArray(leftItems) ? leftItems : [leftItems];
  const right = Array.isArray(rightItems) ? rightItems : [rightItems];

  // Colours — scale body in warm brass, weights in deep teal
  const bodyColor = '#b45309'; // amber-700: brass/bronze feel
  const bodyLight = '#d97706'; // amber-600: highlight
  const weightFill = '#0f4c75'; // deep blue
  const weightHigh = '#1a6fa8'; // lighter blue highlight
  const weightText = '#ffffff';

  // Tilt offset: positive = that end goes DOWN
  const TILT = 20;
  const lOff = tilt === 'left' ? TILT : tilt === 'right' ? -TILT : 0;
  const rOff = tilt === 'right' ? TILT : tilt === 'left' ? -TILT : 0;

  // Geometry
  const cx = W / 2;
  const beamY = 70;
  const lx = 72,
    rx = 268;
  const rodLen = 70; // longer rods = more headroom for weights
  const panRx = 46,
    panRy = 10;
  const lPanY = beamY + lOff + rodLen;
  const rPanY = beamY + rOff + rodLen;

  // Weight block — bottom at pan centre
  const weightW = 40,
    weightH = 34;
  const wBlock = (val, x, y) => {
    const label = String(val);
    const fs = label.length >= 3 ? 11 : label.length === 2 ? 13 : 15;
    return `<rect x="${x - weightW / 2}" y="${y - weightH}" width="${weightW}" height="${weightH}" rx="8"
           fill="${weightFill}" stroke="#061e30" stroke-width="1.5"/>
     <rect x="${x - weightW / 2 + 3}" y="${y - weightH + 3}" width="${weightW - 6}" height="7" rx="3"
           fill="${weightHigh}"/>
     <text x="${x}" y="${y - weightH / 2 + fs / 2 + 2}" text-anchor="middle"
           font-family="system-ui,sans-serif" font-size="${fs}" font-weight="800" fill="${weightText}">${label}</text>`;
  };

  // Emoji sitting on pan centre
  const eBlock = (em, x, y) =>
    `<text x="${x}" y="${y}" text-anchor="middle"
           font-family="system-ui,sans-serif" font-size="36">${em}</text>`;

  // Layout items: weight bottoms at pan centre (panY), emoji base at panY
  const renderItems = (items, panX, panY) => {
    const isNum = (v) => !isNaN(Number(v)) && String(v).trim() !== '';
    const weights = items.filter(isNum);
    const emojis = items.filter((v) => !isNum(v));
    let s = '';

    if (weights.length > 0) {
      const gap = 12;
      const totalW = weights.length * weightW + (weights.length - 1) * gap;
      weights.forEach((w, i) => {
        const x = panX - totalW / 2 + weightW / 2 + i * (weightW + gap);
        s += wBlock(Number(w), x, panY); // bottom at pan centre
      });
    }
    if (emojis.length > 0) {
      const emojiBase = weights.length > 0 ? panY - weightH - 4 : panY + 4;
      emojis.forEach((em, i) => {
        const x = panX + (i - (emojis.length - 1) / 2) * 42;
        s += eBlock(em, x, emojiBase);
      });
    }
    return s;
  };

  const lBy = beamY + lOff,
    rBy = beamY + rOff;

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
               xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Balance">
    <!-- Central post -->
    <rect x="${cx - 3}" y="${beamY + 7}" width="6" height="62" rx="2" fill="${bodyColor}"/>
    <!-- Base -->
    <rect x="${cx - 22}" y="${beamY + 65}" width="44" height="8" rx="4" fill="${bodyColor}"/>
    <!-- Pivot cap -->
    <circle cx="${cx}" cy="${beamY + 7}" r="6" fill="${bodyLight}" opacity="0.9"/>
    <!-- Beam (tilted) -->
    <line x1="${lx}" y1="${lBy}" x2="${rx}" y2="${rBy}"
          stroke="${bodyLight}" stroke-width="7" stroke-linecap="round"/>
    <!-- Left rod -->
    <line x1="${lx}" y1="${lBy}" x2="${lx}" y2="${lPanY - panRy - 1}"
          stroke="${bodyColor}" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Right rod -->
    <line x1="${rx}" y1="${rBy}" x2="${rx}" y2="${rPanY - panRy - 1}"
          stroke="${bodyColor}" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Left pan -->
    <ellipse cx="${lx}" cy="${lPanY}" rx="${panRx}" ry="${panRy}" fill="${bodyColor}"/>
    <ellipse cx="${lx}" cy="${lPanY - panRy * 0.4}" rx="${panRx}" ry="${panRy * 0.6}"
             fill="${bodyLight}" opacity="0.25"/>
    <!-- Right pan -->
    <ellipse cx="${rx}" cy="${rPanY}" rx="${panRx}" ry="${panRy}" fill="${bodyColor}"/>
    <ellipse cx="${rx}" cy="${rPanY - panRy * 0.4}" rx="${panRx}" ry="${panRy * 0.6}"
             fill="${bodyLight}" opacity="0.25"/>
    <!-- Items -->
    ${renderItems(left, lx, lPanY)}
    ${renderItems(right, rx, rPanY)}
  </svg>`;
}

// ── Calendar ──────────────────────────────────────────────────────────────────
// Renders a monthly calendar grid (Monday-first, French labels).
// month : 1–12  |  year : e.g. 2025  |  highlight : array of day numbers to circle
function calendarSvg(month, year, highlight = []) {
  const MONTHS_FR = [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ];
  const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // First day of month: JS getDay() → 0=Sun … 6=Sat → convert to Mon=0 … Sun=6
  const jsDay = new Date(year, month - 1, 1).getDay();
  const startCol = (jsDay + 6) % 7;
  const totalDays = new Date(year, month, 0).getDate();

  // Build flat cell array (0 = empty, positive int = day number)
  const cells = Array(startCol).fill(0);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7) cells.push(0);

  const hl = Array.isArray(highlight) ? highlight : [];
  const rows = cells.length / 7;

  const CW = 32,
    CH = 28; // cell width / height
  const HDR = 32,
    DNH = 22; // header height / day-name row height
  const W = 7 * CW + 2;
  const H = HDR + DNH + rows * CH + 2;

  let s = '';

  // Outer background
  s += `<rect width="${W}" height="${H}" rx="6" fill="var(--sf,#fff)" stroke="var(--cs,#cbd5e1)" stroke-width="1"/>`;

  // Month/year header bar
  s += `<rect width="${W}" height="${HDR}" rx="6" fill="var(--p,#3b82f6)"/>`;
  s += `<rect y="${HDR - 6}" width="${W}" height="6" fill="var(--p,#3b82f6)"/>`;
  s += `<text x="${W / 2}" y="21" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="bold" fill="#fff">${MONTHS_FR[month - 1]} ${year}</text>`;

  // Day-name header row
  for (let c = 0; c < 7; c++) {
    const x = 1 + c * CW;
    const bg = 'var(--sc,#f1f5f9)';
    const tc = c >= 5 ? 'var(--red,#dc2626)' : 'var(--ct,#374151)';
    s += `<rect x="${x}" y="${HDR}" width="${CW}" height="${DNH}" fill="${bg}" stroke="var(--cs,#e2e8f0)" stroke-width="0.5"/>`;
    s += `<text x="${x + CW / 2}" y="${HDR + 15}" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="bold" fill="${tc}">${DAYS_SHORT[c]}</text>`;
  }

  // Day cells
  for (let i = 0; i < cells.length; i++) {
    const day = cells[i];
    const col = i % 7;
    const row = Math.floor(i / 7);
    const x = 1 + col * CW;
    const y = HDR + DNH + row * CH;
    const isWE = col >= 5;
    const isHL = day && hl.includes(day);
    const fill = isHL
      ? 'var(--p,#3b82f6)'
      : isWE && day
        ? 'var(--ss,#fef2f2)'
        : day
          ? 'var(--sf,#fff)'
          : 'var(--sc,#f9fafb)';
    const tFill = isHL ? '#fff' : isWE && day ? 'var(--red,#dc2626)' : 'var(--ct,#374151)';

    s += `<rect x="${x}" y="${y}" width="${CW}" height="${CH}" fill="${fill}" stroke="var(--cs,#e5e7eb)" stroke-width="0.5"/>`;
    if (day) {
      s += `<text x="${x + CW / 2}" y="${y + CH / 2 + 5}" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="${tFill}">${day}</text>`;
    }
  }

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}

/* ─── Decomposition Tree SVG ───────────────────────────────────────────────
   Renders a 2-branch number-bond tree.
   top: number at root (string or number)
   left, right: child values — pass "?" for a blank node.
   ────────────────────────────────────────────────────────────────────────── */
function decompTreeSvg(top, left, right) {
  const W = 260,
    H = 140;
  const R = 24;
  const cx = W / 2,
    ty = 28,
    ly = 108,
    ry = 108;
  const lx = 72,
    rx = W - 72;

  const mkCircle = (x, y, val) => {
    const isBlank = String(val) === '?';
    const label = isBlank ? '?' : String(val);
    const bg = isBlank ? 'var(--sf,#f8fafc)' : 'var(--b1,#fff)';
    const stroke = isBlank ? 'var(--p,#3b82f6)' : 'var(--cs,#cbd5e1)';
    const tc = isBlank ? 'var(--p,#3b82f6)' : 'var(--bc,#1e293b)';
    return (
      `<circle cx="${x}" cy="${y}" r="${R}" fill="${bg}" stroke="${stroke}" stroke-width="2.5"/>` +
      `<text x="${x}" y="${y + 6}" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="700" fill="${tc}">${label}</text>`
    );
  };

  const edgePts = (x1, y1, x2, y2) => {
    const dx = x2 - x1,
      dy = y2 - y1,
      len = Math.hypot(dx, dy);
    const ux = dx / len,
      uy = dy / len;
    return [x1 + ux * R, y1 + uy * R, x2 - ux * R, y2 - uy * R];
  };
  const [llx1, lly1, llx2, lly2] = edgePts(cx, ty, lx, ly);
  const [rlx1, rly1, rlx2, rly2] = edgePts(cx, ty, rx, ry);

  let s = '';
  s += `<line x1="${llx1.toFixed(1)}" y1="${lly1.toFixed(1)}" x2="${llx2.toFixed(1)}" y2="${lly2.toFixed(1)}" stroke="var(--cs,#cbd5e1)" stroke-width="2"/>`;
  s += `<line x1="${rlx1.toFixed(1)}" y1="${rly1.toFixed(1)}" x2="${rlx2.toFixed(1)}" y2="${rly2.toFixed(1)}" stroke="var(--cs,#cbd5e1)" stroke-width="2"/>`;
  s += mkCircle(cx, ty, top);
  s += mkCircle(lx, ly, left);
  s += mkCircle(rx, ry, right);
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="display:block;max-width:100%">${s}</svg>`;
}

// ── Base-10 blocks renderer ────────────────────────────────────────────────
// Called at runtime from the base-10 exercise template.
// Returns { markup: string, width: number, height: number }.
function base10Render(b) {
  const U = 12,
    TEN_H = 120,
    PAD = 8,
    GAP_TYPE = 18,
    GAP_SAME = 4;
  const num = b.number || 0;
  const h = b.hundreds !== null && b.hundreds !== undefined ? b.hundreds : Math.floor(num / 100);
  const t = b.tens !== null && b.tens !== undefined ? b.tens : Math.floor((num % 100) / 10);
  const u = b.ones !== null && b.ones !== undefined ? b.ones : num % 10;

  const style =
    '<style>.h{fill:var(--b10-h);stroke:var(--b10-hs)}.t{fill:var(--b10-t);stroke:var(--b10-ts)}.u{fill:var(--b10-u);stroke:var(--b10-us)}.h,.t,.u{stroke-width:1}.lh{stroke:var(--b10-hs)}.lt{stroke:var(--b10-ts)}.lh,.lt{stroke-width:.5;opacity:.5}</style>';
  const unit = (x, y) => `<rect class="u" x="${x + 1}" y="${y + 1}" width="${U - 2}" height="${U - 2}" rx="1"/>`;
  const ten = (x, y) => {
    let s = '';
    for (let i = 1; i < 10; i++)
      s += `<line class="lt" x1="${x + 0.5}" y1="${y + i * U}" x2="${x + U - 0.5}" y2="${y + i * U}"/>`;
    return `<rect class="t" x="${x + 0.5}" y="${y + 0.5}" width="${U - 1}" height="${TEN_H - 1}" rx="1"/>${s}`;
  };
  const hundred = (x, y) => {
    let s = '';
    for (let i = 1; i < 10; i++) {
      s += `<line class="lh" x1="${x + 0.5}" y1="${y + i * U}" x2="${x + TEN_H - 0.5}" y2="${y + i * U}"/>`;
      s += `<line class="lh" x1="${x + i * U}" y1="${y + 0.5}" x2="${x + i * U}" y2="${y + TEN_H - 0.5}"/>`;
    }
    return `<rect class="h" x="${x + 0.5}" y="${y + 0.5}" width="${TEN_H - 1}" height="${TEN_H - 1}" rx="1"/>${s}`;
  };

  // More than 4 hundreds: plates on two rows (7 → 4 + 3) so the drawing stays compact and is not
  // scaled down until the units become too small to count. Tens and units sit on the bottom row.
  const rows = h > 4 ? 2 : 1;
  const perRow = Math.ceil(h / rows);
  const baseY = PAD + (rows - 1) * (TEN_H + GAP_SAME);
  let svg = style,
    x = PAD;
  for (let i = 0; i < h; i++) {
    const col = i % perRow,
      row = Math.floor(i / perRow);
    svg += hundred(PAD + col * (TEN_H + GAP_SAME), PAD + row * (TEN_H + GAP_SAME));
  }
  if (h > 0) x = PAD + Math.min(h, perRow) * (TEN_H + GAP_SAME);
  if (h > 0 && (t > 0 || u > 0)) x += GAP_TYPE - GAP_SAME;
  for (let i = 0; i < t; i++) {
    svg += ten(x, baseY);
    x += U + GAP_SAME;
  }
  if (t > 0 && u > 0) x += GAP_TYPE - GAP_SAME;
  const uCols = Math.ceil(u / 10);
  for (let i = 0; i < u; i++) svg += unit(x + Math.floor(i / 10) * (U + GAP_SAME), baseY + TEN_H - ((i % 10) + 1) * U);
  if (u > 0) x += uCols * (U + GAP_SAME) - GAP_SAME;
  return { markup: svg, width: x + PAD, height: rows * TEN_H + (rows - 1) * GAP_SAME + 2 * PAD };
}
if (typeof window !== 'undefined') window.base10Render = base10Render;
