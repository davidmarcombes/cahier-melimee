/**
 * grid-board draw — figures made of segments between grid points [r, c] (0…rows, 0…cols): copy a model, complete a
 * figure, build a shape, draw a parallel / perpendicular. Methods mixed into the series player (modules/player.js);
 * loaded only by the pages with a draw board (series-player.njk), so the other pages do not carry them.
 * Checked again, independently, by scripts/lib/grid-board.js.
 * Browser: window.GridDraw · Node: module.exports
 */
(function (root) {
  // Tap a point, then another: a segment; the pen stays on the last point (tap it again to lift it)
  const GridDraw = {
    // Unit steps of segments, "r,c r,c" (each segment cut at the grid points it crosses)
    gbStepsOf(segs) {
      const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
      const out = new Set();
      for (const [a, b] of segs) {
        const g = gcd(b[0] - a[0], b[1] - a[1]);
        const [dr, dc] = [(b[0] - a[0]) / g, (b[1] - a[1]) / g];
        for (let k = 0; k < g; k++) {
          const p = [a[0] + k * dr, a[1] + k * dc];
          const q = [p[0] + dr, p[1] + dc];
          out.add(p[0] < q[0] || (p[0] === q[0] && p[1] < q[1]) ? p + ' ' + q : q + ' ' + p);
        }
      }
      return out;
    },

    // Steps moved by (dr, dc); with no offset, moved to touch row 0 and column 0
    gbShifted(set, dr, dc) {
      const pts = [...set].map((k) => k.split(/[ ,]/).map(Number));
      if (dr === undefined) {
        dr = -Math.min(...pts.flatMap((p) => [p[0], p[2]]));
        dc = -Math.min(...pts.flatMap((p) => [p[1], p[3]]));
      }
      return this.gbStepsOf(
        pts.map((p) => [
          [p[0] + dr, p[1] + dc],
          [p[2] + dr, p[3] + dc],
        ])
      );
    },

    // The pupil's figure as one closed polygon: its corners in order, or null
    gbPolygon(set) {
      const nb = {};
      for (const k of set) {
        const [a, b] = k.split(' ');
        (nb[a] = nb[a] || []).push(b);
        (nb[b] = nb[b] || []).push(a);
      }
      const keys = Object.keys(nb);
      if (keys.length < 3 || keys.some((k) => nb[k].length !== 2)) return null;
      const loop = [keys[0]];
      for (let prev = keys[0], at = nb[keys[0]][0]; at !== keys[0];) {
        loop.push(at);
        [prev, at] = [at, nb[at][0] === prev ? nb[at][1] : nb[at][0]];
      }
      if (loop.length !== keys.length) return null;
      const P = loop.map((k) => k.split(',').map(Number));
      return P.filter((p, i) => {
        const a = P[(i + P.length - 1) % P.length];
        const b = P[(i + 1) % P.length];
        return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]);
      });
    },

    // Shape task: the polygon is the wanted figure (sides, area, tilted)
    gbShapeOk(P, w) {
      const n = P.length;
      const side = (i) => [P[(i + 1) % n][0] - P[i][0], P[(i + 1) % n][1] - P[i][1]];
      const L = P.map((_, i) => side(i)[0] ** 2 + side(i)[1] ** 2);
      const R = P.map((_, i) => {
        const [u, v] = [side((i + n - 1) % n), side(i)];
        return u[0] * v[0] + u[1] * v[1] === 0;
      });
      const quad = n === 4 && R.every(Boolean);
      const allEqual = L.every((l) => l === L[0]);
      const ok = {
        carre: quad && allEqual,
        rectangle: quad && (w.inclusive || !allEqual),
        triangle: n === 3,
        triangleRectangle: n === 3 && R.includes(true),
      }[w.shape];
      if (!ok) return false;
      const sorted = (a) => a.sort((x, y) => x - y).join();
      const i = R.indexOf(true);
      if (w.sides) {
        const got = w.shape === 'carre' ? [L[0]] : w.shape === 'rectangle' ? [L[0], L[1]] : [L[i], L[(i + n - 1) % n]];
        if (sorted(got) !== sorted(w.sides.map((x) => x * x))) return false;
      }
      const area = Math.abs(P.reduce((t, p, k) => t + p[0] * P[(k + 1) % n][1] - p[1] * P[(k + 1) % n][0], 0)) / 2;
      if (w.area && area !== w.area) return false;
      return !(w.tilted && P.some((_, k) => side(k)[0] === 0 || side(k)[1] === 0));
    },

    // Parallel / perpendicular: one straight unbroken line through the point, 2 steps at least
    gbLineOk(set, b) {
      const pts = [...new Set([...set].flatMap((k) => k.split(' ')))].map((k) => k.split(',').map(Number));
      const [p0, p1] = [...set][0].split(' ').map((k) => k.split(',').map(Number));
      const d = [p1[0] - p0[0], p1[1] - p0[1]];
      const on = (p) => (p[0] - p0[0]) * d[1] === (p[1] - p0[1]) * d[0];
      const t = (p) => (p[0] - p0[0]) * d[0] + (p[1] - p0[1]) * d[1];
      if (set.size < 2 || pts.length !== set.size + 1 || !pts.every(on) || !on(b.through)) return false;
      const ts = pts.map(t);
      if (t(b.through) < Math.min(...ts) || t(b.through) > Math.max(...ts)) return false;
      const r = [b.ref[1][0] - b.ref[0][0], b.ref[1][1] - b.ref[0][1]];
      return b.task === 'perp' ? d[0] * r[0] + d[1] * r[1] === 0 : d[0] * r[1] === d[1] * r[0];
    },

    gbDrawOk() {
      const b = this.cur.board;
      const got = this.gbStepsOf(this.gbSegs);
      const same = (x, y) => x.size === y.size && [...x].every((k) => y.has(k));
      if (!got.size) return false;
      if (b.task === 'copy') {
        const a = b.anchor;
        const model = this.gbStepsOf(b.model);
        return a
          ? same(got, this.gbShifted(model, a.to[0] - a.from[0], a.to[1] - a.from[1]))
          : same(this.gbShifted(got), this.gbShifted(model));
      }
      if (b.task === 'complete') return same(this.gbStepsOf([...b.given, ...this.gbSegs]), this.gbStepsOf(b.target));
      if (b.task === 'shape') {
        const P = this.gbPolygon(got);
        return !!P && this.gbShapeOk(P, b.want);
      }
      return this.gbLineOk(got, b);
    },

    // What went wrong, said after « Vérifier »
    get gbDrawError() {
      const b = this.cur.board;
      if (!b || b.mode !== 'draw') return '';
      if (b.task === 'complete') {
        const target = this.gbStepsOf(b.target);
        return [...this.gbStepsOf(this.gbSegs)].some((k) => !target.has(k))
          ? 'Les traits en rouge ne vont pas. Essaie encore !'
          : 'Il manque des traits. Essaie encore !';
      }
      if (b.task === 'copy') return 'Ta figure n’est pas la même que le modèle. Essaie encore !';
      if (b.task === 'shape') return 'Ce n’est pas encore la bonne figure. Essaie encore !';
      return 'Ce trait ne va pas encore. Essaie encore !';
    },

    // Squared or dotted paper with its figure, as SVG markup. Grid points are U apart, M from the edge
    _gbPaper(rows, cols, paper, inner) {
      const [U, M] = [40, 24];
      const [W, H] = [cols * U + 2 * M, rows * U + 2 * M];
      let g = '';
      if (paper === 'dots') {
        for (let r = 0; r <= rows; r++)
          for (let c = 0; c <= cols; c++) g += `<circle cx="${M + c * U}" cy="${M + r * U}" r="3" fill="var(--cs)"/>`;
      } else {
        for (let r = 0; r <= rows; r++) g += `<line x1="${M}" y1="${M + r * U}" x2="${W - M}" y2="${M + r * U}"/>`;
        for (let c = 0; c <= cols; c++) g += `<line x1="${M + c * U}" y1="${M}" x2="${M + c * U}" y2="${H - M}"/>`;
        g = `<g stroke="var(--cs)" stroke-opacity="0.35" stroke-width="1.5">${g}</g>`;
      }
      const xy = ([r, c]) => [M + c * U, M + r * U];
      const line = (s, color, w = 5) =>
        `<line x1="${xy(s[0])[0]}" y1="${xy(s[0])[1]}" x2="${xy(s[1])[0]}" y2="${xy(s[1])[1]}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
      const dot = (p, color, r = 7) => `<circle cx="${xy(p)[0]}" cy="${xy(p)[1]}" r="${r}" fill="${color}"/>`;
      return `<svg viewBox="0 0 ${W} ${H}" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${g}${inner({ xy, line, dot, U })}</svg>`;
    },

    // Copy: the model, on its own small paper
    get gbModelSvg() {
      const b = this.cur.board;
      if (!b || b.mode !== 'draw' || b.task !== 'copy') return '';
      const pts = b.model.flat();
      const rows = Math.max(...pts.map((p) => p[0])) + 1;
      const cols = Math.max(...pts.map((p) => p[1])) + 1;
      return this._gbPaper(
        rows,
        cols,
        b.paper,
        ({ line, dot }) =>
          b.model.map((s) => line(s, 'var(--ct)')).join('') + (b.anchor ? dot(b.anchor.from, 'var(--red)') : '')
      );
    },

    get gbDrawSvg() {
      const b = this.cur.board;
      if (!b || b.mode !== 'draw') return '';
      const target = b.task === 'complete' ? this.gbStepsOf(b.target) : null;
      const bad = (s) => this.showError && (!target || [...this.gbStepsOf([s])].some((k) => !target.has(k)));
      return this._gbPaper(b.rows, b.cols, b.paper, ({ xy, line, dot, U }) => {
        let s = '';
        if (b.axis) {
          const { axis, at } = b.axis;
          const ends = {
            v: [
              [-0.3, at],
              [b.rows + 0.3, at],
            ],
            h: [
              [at, -0.3],
              [at, b.cols + 0.3],
            ],
            d: [
              [-0.3, -0.3],
              [b.rows + 0.3, b.cols + 0.3],
            ],
            a: [
              [-0.3, b.cols + 0.3],
              [b.rows + 0.3, -0.3],
            ],
          }[axis];
          s += line(ends, 'var(--red)', 4);
        }
        if (b.ref) {
          const [x, y] = xy(b.ref[1]);
          s +=
            line(b.ref, 'var(--p)', 4) +
            `<text x="${x + 10}" y="${y - 8}" font-size="18" font-style="italic" fill="var(--p)">d</text>`;
        }
        for (const g of b.given || []) s += line(g, 'var(--ct)');
        for (const g of this.gbSegs) s += line(g, this.solved ? 'var(--green)' : bad(g) ? 'var(--red)' : 'var(--a)');
        if (b.through) {
          const [x, y] = xy(b.through);
          s +=
            dot(b.through, 'var(--ct)', 5) +
            `<text x="${x + 8}" y="${y - 8}" font-size="18" font-weight="bold" fill="var(--ct)">A</text>`;
        }
        if (b.anchor) s += dot(b.anchor.to, 'var(--red)');
        if (this.gbPen) s += `<circle cx="${xy(this.gbPen)[0]}" cy="${xy(this.gbPen)[1]}" r="9" fill="var(--a)"/>`;
        if (this.gbCursor)
          s += `<circle cx="${xy(this.gbCursor)[0]}" cy="${xy(this.gbCursor)[1]}" r="${U / 3}" fill="none" stroke="var(--p)" stroke-width="3" stroke-dasharray="5 4"/>`;
        return s;
      });
    },

    // A tap on the paper: the nearest grid point, if the tap is close enough to it
    gbDrawClick(ev) {
      const b = this.cur.board;
      const svg = ev.currentTarget.querySelector('svg');
      if (!svg || this.solved) return;
      const box = svg.getBoundingClientRect();
      const W = b.cols * 40 + 48;
      const x = ((ev.clientX - box.left) * W) / box.width - 24;
      const y = ((ev.clientY - box.top) * W) / box.width - 24;
      const [r, c] = [Math.round(y / 40), Math.round(x / 40)];
      if (r < 0 || c < 0 || r > b.rows || c > b.cols || Math.hypot(y - r * 40, x - c * 40) > 18) return;
      this.gbCursor = null;
      this.gbTapPoint([r, c]);
    },

    // Keyboard: arrows move a cursor over the grid points, Enter / Space taps
    gbDrawKey(ev) {
      const b = this.cur.board;
      const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[ev.key];
      if (!mv && ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      const at = this.gbCursor || this.gbPen || [0, 0];
      if (mv)
        this.gbCursor = [Math.min(b.rows, Math.max(0, at[0] + mv[0])), Math.min(b.cols, Math.max(0, at[1] + mv[1]))];
      else if (this.gbCursor) this.gbTapPoint(this.gbCursor);
      else this.gbCursor = at;
    },

    gbTapPoint(p) {
      if (this.solved) return;
      const pen = this.gbPen;
      if (!pen) this.gbPen = p;
      else if (pen[0] === p[0] && pen[1] === p[1]) this.gbPen = null;
      else {
        this.gbSegs = [...this.gbSegs, [pen, p]];
        this.gbPen = p;
      }
    },

    gbUndoSeg() {
      if (this.solved) return;
      const last = this.gbSegs[this.gbSegs.length - 1];
      this.gbSegs = this.gbSegs.slice(0, -1);
      this.gbPen = last ? last[0] : null;
    },

    gbClear() {
      if (this.solved) return;
      this.gbSegs = [];
      this.gbPen = null;
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = GridDraw;
  else root.GridDraw = GridDraw;
})(this);
