/* Theme toggle */
function themeToggle() { return { dark: document.documentElement.classList.contains('dark'), toggle() { this.dark = !this.dark; document.documentElement.classList.toggle('dark', this.dark); localStorage.setItem('theme', this.dark ? 'dark' : 'light') } } }

/* Series player — single-template engine */
function seriesPlayer(exercises) {
  return {
    exercises,
    currentIndex: 0,
    userInput: '',
    showError: false,
    solvedFlags: exercises.map(() => false),
    matchSelected: null,
    matchConnections: [],
    matchErrors: [],
    _matchLinesSvg: '',
    seqInputs: [],
    seqErrors: [],
    gridCells: [],
    gridErrors: [],
    pyramidInputs: [],
    pyramidErrors: [],
    tfInputs: [],
    tfErrors: [],
    cmpInputs: [],
    cmpErrors: [],
    mqInputs: [],
    mqSolved: [],
    mqErrors: [],
    mcqSelected: null,
    mcqWrong: null,

    /* Fraction Helpers */
    get fractionShapes() {
      if (this.cur.type !== 'fraction' || !this.cur.fraction) return [];
      const { numerator, denominator, shape, rows, cols } = this.cur.fraction;
      if (!denominator) return [];
      const count = Math.ceil(numerator / denominator) || 1;
      const shapes = [];

      for (let sIdx = 1; sIdx <= count; sIdx++) {
        const filledInThisShape = Math.max(0, Math.min(denominator, numerator - (sIdx - 1) * denominator));
        let svgContent = '';

        if (shape === 'circle') {
          // Background circle
          svgContent += `<circle cx="50" cy="50" r="48" fill="white" stroke="currentColor" stroke-width="2" class="fill-white dark:fill-slate-900 text-slate-300 dark:text-slate-600" />`;
          for (let pIdx = 1; pIdx <= denominator; pIdx++) {
            const arc = this.describeArc(50, 50, 48, (pIdx - 1) * (360 / denominator), pIdx * (360 / denominator));
            // Outline path
            svgContent += `<path d="${arc}" fill="none" stroke="currentColor" stroke-width="1" class="text-slate-300 dark:text-slate-600" />`;
            // Fill path if needed
            if (pIdx <= filledInThisShape) {
              svgContent += `<path d="${arc}" class="fill-primary-500 stroke-primary-700" stroke-width="1" />`;
            }
          }
        } else if (shape === 'square') {
          // Background rect
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
              // Outline rect
              svgContent += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="currentColor" stroke-width="1" class="text-slate-300 dark:text-slate-700" />`;
              // Fill rect if needed
              if (itemIdx <= filledInThisShape) {
                svgContent += `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="fill-primary-500 stroke-primary-700" stroke-width="1" />`;
              }
            }
          }
        }
        shapes.push({ idx: sIdx, html: svgContent });
      }
      return shapes;
    },


    polarToCartesian(centerX, centerY, radius, angleInDegrees) {
      const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
      return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
      };
    },
    describeArc(x, y, radius, startAngle, endAngle) {
      const start = this.polarToCartesian(x, y, radius, endAngle);
      const end = this.polarToCartesian(x, y, radius, startAngle);
      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
      return [
        "M", x, y,
        "L", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
        "Z"
      ].join(" ");
    },

    regenerateAll() {
      if (!window.AppGenerators) return;
      const expanded = [];
      for (const ex of this.exercises) {
        if (!ex._gen) { expanded.push(ex); continue; }
        const gen = window.AppGenerators[ex._gen.name];
        if (!gen) { expanded.push(ex); continue; }
        const count = ex._gen.count || 1;
        for (let i = 0; i < count; i++) {
          expanded.push({ ...ex, ...gen.generate(ex._gen.params) });
        }
      }
      this.exercises = expanded;
      this.solvedFlags = this.exercises.map(() => false);
    },

    get hasGenerators() { return this.exercises.some(e => e._gen) },

    init() {
      this.regenerateAll();
      this.syncFromHash();
      const _ia = this.cur.sequence || this.cur.bounding || this.cur.convert;
      this.seqInputs = (_ia ? _ia.answers.map(() => '') : []);
      if (this.cur.grid) { this.gridCells = new Array(this.cur.grid.rows.length * this.cur.grid.columns.length).fill(0) }
      if (this.cur.pyramid) { this._initPyramid(this.cur.pyramid) }
      if (this.cur.statements) { this.tfInputs = this.cur.statements.map(() => null) }
      if (this.cur.comparisons) { this.cmpInputs = this.cur.comparisons.map(() => null) }
      if (this.cur.mqQuestions) { this.mqInputs = this.cur.mqQuestions.map(() => ''); this.mqSolved = this.cur.mqQuestions.map(() => false) }
    },
    get cur() { return this.exercises[this.currentIndex] || {} },
    get solved() { return this.solvedFlags[this.currentIndex] },
    get solvedCount() { return this.solvedFlags.filter(Boolean).length },
    get allSolved() { return this.solvedFlags.every(Boolean) },

    check() {
      if (this.cur.type === 'matching') {
        if (this.solved) return;
        const p = this.cur.pairs;
        if (!p) return;
        if (this.matchConnections.length < p.left.length) { this.showError = true; setTimeout(() => { this.showError = false }, 2000); return }
        const errs = [];
        for (const c of this.matchConnections) { if (p.answers[c.left] !== c.right) errs.push(c) }
        if (errs.length === 0) { this.solvedFlags[this.currentIndex] = true; this.showError = false; this.matchErrors = []; this.$nextTick(() => this.updateMatchLines()); if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) } }
        else { this.matchErrors = errs; this.$nextTick(() => this.updateMatchLines()); this.showError = true; setTimeout(() => { this.showError = false }, 2000) }
        return
      }
      if (this.cur.type === 'logic-grid') {
        if (this.solved) return;
        const g = this.cur.grid;
        if (!g) return;
        const nr = g.rows.length, nc = g.columns.length;
        const checks = [];
        for (let r = 0; r < nr; r++)for (let c = 0; c < nc; c++) { if (this.gridCells[r * nc + c] === 2) checks.push({ r, c, idx: r * nc + c }) }
        if (checks.length < nr) { this.showError = true; setTimeout(() => { this.showError = false }, 2000); return }
        const errs = checks.filter(({ r, c }) => !g.solution[r][c]);
        if (errs.length === 0) { this.solvedFlags[this.currentIndex] = true; this.showError = false; this.gridErrors = []; if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) } }
        else { this.gridErrors = errs.map(e => e.idx); this.showError = true; setTimeout(() => { this.showError = false }, 2000) }
        return
      }
      if (this.cur.type === 'pyramid') {
        if (this.solved) return;
        const p = this.cur.pyramid;
        if (!p) return;
        const wrong = [];
        let allFilled = true;
        for (let r = 0; r < p.rows.length; r++) { for (let c = 0; c < p.rows[r].length; c++) { if (!p.given[r][c]) { const fi = this.pyramidFlatIdx(r, c); if (!this.pyramidInputs[fi].trim()) { allFilled = false } else if (this.pyramidInputs[fi].trim() !== String(p.rows[r][c])) { wrong.push(fi) } } } }
        if (!allFilled) { this.showError = true; setTimeout(() => { this.showError = false }, 2000); return }
        if (wrong.length === 0) { this.solvedFlags[this.currentIndex] = true; this.showError = false; this.pyramidErrors = []; if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) } }
        else { this.pyramidErrors = wrong; this.showError = true; setTimeout(() => { this.showError = false }, 2000) }
        return
      }
      if (this.cur.type === 'true-false') {
        if (this.solved) return;
        const st = this.cur.statements;
        if (!st) return;
        if (this.tfInputs.some(v => v === null)) { this.showError = true; setTimeout(() => { this.showError = false }, 2000); return }
        const wrong = [];
        st.forEach((s, i) => { if (this.tfInputs[i] !== s.answer) wrong.push(i) });
        if (wrong.length === 0) { this.solvedFlags[this.currentIndex] = true; this.showError = false; this.tfErrors = []; if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) } }
        else { this.tfErrors = wrong; this.showError = true; setTimeout(() => { this.showError = false }, 2000) }
        return
      }
      if (this.cur.type === 'compare') {
        if (this.solved) return;
        const cm = this.cur.comparisons;
        if (!cm) return;
        if (this.cmpInputs.some(v => v === null)) { this.showError = true; setTimeout(() => { this.showError = false }, 2000); return }
        const wrong = []; cm.forEach((c, i) => { if (this.cmpInputs[i] !== c.answer) wrong.push(i) });
        if (wrong.length === 0) { this.solvedFlags[this.currentIndex] = true; this.showError = false; this.cmpErrors = []; if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) } }
        else { this.cmpErrors = wrong; this.showError = true; setTimeout(() => { this.showError = false }, 2000) }
        return
      }
      if (this.cur.type === 'sequence' || this.cur.type === 'bounding' || this.cur.type === 'convert') {
        if (this.solved) return;
        const s = this.cur.sequence || this.cur.bounding || this.cur.convert;
        if (!s) return;
        if (this.seqInputs.some(v => !v.trim())) { this.showError = true; setTimeout(() => { this.showError = false }, 2000); return }
        const wrong = [];
        s.answers.forEach((a, idx) => { if (this.seqInputs[idx].trim().replace(/,/g, '.') !== a.replace(/,/g, '.')) wrong.push(idx) });
        if (wrong.length === 0) { this.solvedFlags[this.currentIndex] = true; this.showError = false; this.seqErrors = []; if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) } }
        else { this.seqErrors = wrong; this.showError = true; setTimeout(() => { this.showError = false }, 2000) }
        return
      }
      if (this.solved || !this.userInput.trim()) return;
      const input = this.userInput.trim().toLowerCase().replace(/,/g, '.');
      const isCorrect = (this.cur.answers || []).some(a => a.replace(/,/g, '.') === input);

      if (isCorrect) {
        this.solvedFlags[this.currentIndex] = true; this.showError = false;
        if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) }
      } else { this.showError = true; setTimeout(() => { this.showError = false }, 2000) }
    },

    matchTap(side, i) {
      if (this.solved) return;
      if (side === 'left') { this.matchSelected = this.matchSelected === i ? null : i }
      else {
        if (this.matchSelected === null) return;
        const l = this.matchSelected;
        this.matchConnections = this.matchConnections.filter(c => c.left !== l && c.right !== i);
        this.matchConnections.push({ left: l, right: i });
        this.matchErrors = this.matchErrors.filter(c => c.left !== l && c.right !== i);
        this.matchSelected = null;
        this.$nextTick(() => { this.updateMatchLines(); if (this.matchConnections.length === (this.cur.pairs ? this.cur.pairs.left.length : 0)) this.check() })
      }
    },
    matchLeftSelected(i) { return this.matchSelected === i },
    matchLeftConnected(i) { return this.matchConnections.some(c => c.left === i) },
    matchRightConnected(i) { return this.matchConnections.some(c => c.right === i) },
    matchIsError(side, i) { return this.matchErrors.some(c => side === 'left' ? c.left === i : c.right === i) },
    matchGetCoords(side, i) { const container = this.$refs.matchContainer; if (!container) return null; const el = container.querySelector('[data-dot="' + side + i + '"]'); if (!el) return null; const er = el.getBoundingClientRect(); const cr = container.getBoundingClientRect(); return { x: side === 'left' ? er.right - cr.left : er.left - cr.left, y: er.top + er.height / 2 - cr.top } },

    gridTap(r, c) {
      if (this.solved) return;
      const g = this.cur.grid; if (!g) return;
      const nc = g.columns.length; const idx = r * nc + c; const cells = [...this.gridCells]; const curVal = cells[idx]; const nv = (curVal + 1) % 3; cells[idx] = nv;
      if (nv === 2) { for (let cc = 0; cc < nc; cc++) { if (cc !== c && cells[r * nc + cc] === 2) cells[r * nc + cc] = 0 } for (let rr = 0; rr < g.rows.length; rr++) { if (rr !== r && cells[rr * nc + c] === 2) cells[rr * nc + c] = 0 } }
      this.gridCells = cells; this.gridErrors = []; const checkCount = cells.filter(v => v === 2).length; if (checkCount === g.rows.length) { this.$nextTick(() => this.check()) }
    },
    gridCellVal(r, c) { const g = this.cur.grid; if (!g) return 0; return this.gridCells[r * g.columns.length + c] || 0 },
    gridIsError(r, c) { const g = this.cur.grid; if (!g) return false; return this.gridErrors.includes(r * g.columns.length + c) },
    _initPyramid(p) { const inputs = []; for (let r = 0; r < p.rows.length; r++) { for (let c = 0; c < p.rows[r].length; c++) { inputs.push(p.given[r][c] ? String(p.rows[r][c]) : '') } } this.pyramidInputs = inputs; this.pyramidErrors = [] },
    pyramidFlatIdx(r, c) { const p = this.cur.pyramid; if (!p) return 0; let idx = 0; for (let ri = 0; ri < r; ri++)idx += p.rows[ri].length; return idx + c },
    pyramidIsError(r, c) { return this.pyramidErrors.includes(this.pyramidFlatIdx(r, c)) },

    mcqTap(i) {
      if (this.solved) return;
      if (i === this.cur.mcqAnswer) { this.mcqSelected = i; this.mcqWrong = null; this.solvedFlags[this.currentIndex] = true; this.showError = false; if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) } }
      else { this.mcqWrong = i; this.mcqSelected = null; setTimeout(() => { this.mcqWrong = null }, 1500) }
    },

    mqCheck(i) {
      if (this.mqSolved[i] || !this.mqInputs[i].trim()) return;
      const q = this.cur.mqQuestions; if (!q) return;
      if (this.mqInputs[i].trim().toLowerCase() === q[i].answer) {
        this.mqSolved[i] = true; this.mqErrors = this.mqErrors.filter(e => e !== i);
        if (this.mqSolved.every(Boolean)) { this.solvedFlags[this.currentIndex] = true; if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) } }
        else { this.$nextTick(() => { for (let j = i + 1; j < q.length; j++) { if (!this.mqSolved[j]) { const ref = this.$refs['mqInput' + j]; if (ref) ref.focus(); return } } }) }
      } else { this.mqErrors = [...this.mqErrors.filter(e => e !== i), i]; setTimeout(() => { this.mqErrors = this.mqErrors.filter(e => e !== i) }, 2000) }
    },

    updateMatchLines() {
      this._matchLinesSvg = this.matchConnections.map(c => {
        const from = this.matchGetCoords('left', c.left);
        const to = this.matchGetCoords('right', c.right);
        if (!from || !to) return '';
        const color = this.matchErrors.some(e => e.left === c.left) ? '#ef4444' : (this.solvedFlags[this.currentIndex] ? '#22c55e' : '#005af0');
        return '<line x1="' + from.x + '" y1="' + from.y + '" x2="' + to.x + '" y2="' + to.y + '" stroke="' + color + '" stroke-width="3" stroke-linecap="round"/>'
      }).join('')
    },

    goTo(idx) {
      this.currentIndex = idx; this.userInput = ''; this.showError = false; this.matchSelected = null; this.matchConnections = []; this.matchErrors = []; this._matchLinesSvg = '';
      const _e = this.exercises[idx] || {}; const _s = _e.sequence || _e.bounding || _e.convert; this.seqInputs = _s ? _s.answers.map(() => '') : []; this.seqErrors = [];
      const _g = _e.grid; this.gridCells = _g ? new Array(_g.rows.length * _g.columns.length).fill(0) : []; this.gridErrors = [];
      if (_e.pyramid) { this._initPyramid(_e.pyramid) } else { this.pyramidInputs = []; this.pyramidErrors = [] }
      if (_e.statements) { this.tfInputs = _e.statements.map(() => null) } else { this.tfInputs = [] } this.tfErrors = [];
      if (_e.comparisons) { this.cmpInputs = _e.comparisons.map(() => null) } else { this.cmpInputs = [] } this.cmpErrors = [];
      if (_e.mqQuestions) { this.mqInputs = _e.mqQuestions.map(() => ''); this.mqSolved = _e.mqQuestions.map(() => false) } else { this.mqInputs = []; this.mqSolved = [] } this.mqErrors = [];
      this.mcqSelected = null; this.mcqWrong = null; window.location.hash = '#' + (idx + 1);
      this.$nextTick(() => { const ref = this.$refs.input; if (ref && !ref.disabled) ref.focus() })
    },

    syncFromHash() { const h = parseInt(window.location.hash.replace('#', ''), 10); if (h >= 1 && h <= this.exercises.length) { this.currentIndex = h - 1 } }
  }
}

/* Exercise store — loads CSV on demand, caches in sessionStorage */
document.addEventListener('alpine:init', () => {
  const LEVELS = { '1': 'CP', '2': 'CE1', '3': 'CE2', '4': 'CM1', '5': 'CM2' };
  const DIFFS = { '1': 'facile', '2': 'moyen', '3': 'difficile' };
  const FOLDERS = { e: 'exercices', a: 'applications' };

  Alpine.store('exercises', {
    data: null,
    loading: false,

    async load() {
      if (this.data) return;
      const cached = sessionStorage.getItem('ex');
      if (cached) {
        try {
          const d = JSON.parse(cached);
          if (Array.isArray(d) && d.length && d[0].title) { this.data = d; return; }
          sessionStorage.removeItem('ex');
        } catch(e) { sessionStorage.removeItem('ex'); }
      }

      this.loading = true;
      try {
        const res = await fetch('/fr/exercices/data.csv');
        if (!res.ok) { console.error('CSV fetch failed:', res.status); this.loading = false; return; }
        const text = await res.text();
        const rows = text.replace(/\r/g, '').trim().split('\n');
        if (!rows[0] || !rows[0].startsWith('id,')) { console.error('CSV header invalid:', rows[0]); this.loading = false; return; }
        this.data = rows.slice(1).filter(r => r).map(row => {
          const [id, l, s, t, title, d, f] = row.split(',');
          return {
            id, level: LEVELS[l] || l, subject: s, topic: t, title,
            difficulty: DIFFS[d] || d,
            seriesUrl: '/fr/' + (FOLDERS[f] || 'exercices') + '/' + id + '/'
          };
        });
        sessionStorage.setItem('ex', JSON.stringify(this.data));
      } catch(e) { console.error('CSV load error:', e); }
      this.loading = false;
    }
  });
});
