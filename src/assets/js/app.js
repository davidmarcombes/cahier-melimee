/* ─────────────────────────────────────────────────────────────
   Local progress store — primary persistence layer.
   Key: 'melimee_v1'  { user: {...}, progress: { [seriesId]: {...} } }
   Works fully offline; PocketBase sync will be layered on top later.
   ───────────────────────────────────────────────────────────── */
const localStore = (() => {
  const KEY = 'melimee_v1';
  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch {
      return {};
    }
  }
  function save(d) {
    try {
      localStorage.setItem(KEY, JSON.stringify(d));
    } catch {}
  }
  return {
    getUser() {
      return load().user || null;
    },
    setUser(p) {
      const d = load();
      d.user = { slug: p.slug, username: p.username, sticker_id: p.sticker_id };
      save(d);
    },
    clearUser() {
      const d = load();
      delete d.user;
      save(d);
    },
    markDone(seriesId) {
      if (!seriesId) return;
      const d = load();
      if (!d.progress) d.progress = {};
      if (!d.progress[seriesId]) {
        d.progress[seriesId] = { done: true, completedAt: new Date().toISOString() };
        save(d);
      }
    },
    getProgress() {
      return load().progress || {};
    },
    countDone() {
      return Object.keys(load().progress || {}).length;
    },
  };
})();
window.localStore = localStore;

/* Operation shorthand renderer — mirrors .eleventy.js renderShorthands for runtime use.
   Converts &box(content) → <span class="op-box">content</span>
   Converts &highlight(content) → <span class="op-hl">content</span> */
function renderOpShorthands(str) {
  if (!str) return str;
  return str
    .replace(/&box\(([^)]*)\)/g, (_, c) => `<span class="op-box">${c}</span>`)
    .replace(/&highlight\(([^)]*)\)/g, (_, c) => `<span class="op-hl">${c}</span>`);
}

/* Theme toggle */
function themeToggle() {
  return {
    dark: document.documentElement.classList.contains('dark'),
    toggle() {
      this.dark = !this.dark;
      document.documentElement.classList.toggle('dark', this.dark);
      localStorage.setItem('theme', this.dark ? 'dark' : 'light');
    },
  };
}

function seriesPlayer(exercises, seriesId) {
  return {
    exercises,
    seriesId: seriesId || '',
    currentIndex: 0,
    userInput: '',
    trouInputs: [],
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
    cmpGroupWrong: null,
    rfInputs: ['', ''],
    tileSelected: [],
    tileErrors: [],
    svgSelected: [],
    svgErrors: [],
    sortPicked: [],
    sortShuffled: [],
    sortErrors: [],
    tableInputs: [],
    tableErrors: [],
    checkSelected: [],
    checkErrors: [],
    selectAnswers: [],
    selectErrors: [],
    dragTilesOrder: [],
    dragSelected: null,
    dragErrors: [],
    _dragErrTimer: null,
    clickBlockLevels: [],
    clickBlockErrors: [],
    paintCells: [],
    paintDragging: false,
    paintDragValue: true,
    huntClicked: [],
    huntNext: 1,
    huntError: -1,
    nlVal: null,
    cgInputs: ['', ''],
    cgPoint: null,
    bcValues: [],
    bcErrors: [],
    bcInputs: [],
    bcSolved: [],
    ccInputs: [],
    ccErrors: [],

    /* Fraction Helpers */
    get fractionShapes() {
      if (this.cur.type !== 'fraction' || !this.cur.fraction) return [];
      return fractionShapesSvg(this.cur.fraction);
    },

    /* Fraction Paint touch-drag handler */
    paintTouchMove(e) {
      if (!this.paintDragging || this.solved) return;
      const t = e.touches[0];
      const el = document.elementFromPoint(t.clientX, t.clientY);
      if (el && el.dataset.paintIdx !== undefined) {
        this.paintCells[parseInt(el.dataset.paintIdx)] = this.paintDragValue;
      }
    },

    /* Ruler SVG */
    get rulerSvg() {
      if (this.cur.type !== 'ruler' || !this.cur.ruler) return '';
      return rulerExerciseSvg(this.cur.ruler);
    },

    /* Coordinate-grid SVG */
    get coordinateGridSvg() {
      if (this.cur.type !== 'coordinate-grid' || !this.cur.cg) return '';
      return coordinateGridSvg(this.cur.cg);
    },

    get cgMarkerSvg() {
      if (!this.cur.cg || this.cgPoint === null) return '';
      const { cols = 6, rows = 6 } = this.cur.cg;
      const PL = 40, PT = 20;
      const cw = 360 / cols, ch = 360 / rows;
      const px = PL + this.cgPoint.x * cw;
      const py = PT + (rows - this.cgPoint.y) * ch;
      const lbl = this.cur.cg.placeLabel || 'A';
      return `<circle cx="${px}" cy="${py}" r="6" class="fill-primary-500"/>` +
        `<text x="${px + 9}" y="${py - 6}" font-size="13" font-weight="700" class="fill-primary-600 dark:fill-primary-400">${lbl}</text>`;
    },

    /* Number-line SVG */
    get numberLineSvg() {
      if (this.cur.type !== 'number-line' || !this.cur.nl) return '';
      return numberLineSvg(this.cur.nl);
    },

    /* Bar-chart Y axis values — from yMax down to yStep (one entry per clickable cell row) */
    get bcYRange() {
      if (!this.cur || !this.cur.bc) return [];
      const { yMax, yStep } = this.cur.bc;
      const steps = [];
      for (let v = yMax; v >= yStep; v -= yStep) steps.push(v);
      return steps;
    },

    get nlMarkerSvg() {
      if (!this.cur.nl || this.nlVal === null) return '';
      const { min = 0, max = 10 } = this.cur.nl;
      const range = max - min;
      if (range <= 0) return '';
      const PAD = 40, W = 420, LY = 58;
      const mx = PAD + (this.nlVal - min) * (W / range);
      const lbl = String(this.nlVal);
      return `<circle cx="${mx}" cy="${LY}" r="6" class="fill-primary-500"/>` +
        `<line x1="${mx}" y1="${LY - 6}" x2="${mx}" y2="${LY - 15}" stroke-width="2" class="stroke-primary-500"/>` +
        `<text x="${mx}" y="${LY - 19}" text-anchor="middle" font-size="13" font-weight="700" class="fill-primary-600 dark:fill-primary-400">${lbl}</text>`;
    },

    regenerateAll() {
      if (!window.AppGenerators) return;
      const expanded = [];
      for (const ex of this.exercises) {
        if (!ex._gen) {
          expanded.push(ex);
          continue;
        }
        const gen = window.AppGenerators[ex._gen.name];
        if (!gen) {
          expanded.push(ex);
          continue;
        }
        const count = ex._gen.count || 1;
        for (let i = 0; i < count; i++) {
          expanded.push({ ...ex, ...gen.generate(ex._gen.params) });
        }
      }
      this.exercises = expanded;
      this.solvedFlags = this.exercises.map(() => false);
    },

    get hasGenerators() {
      return this.exercises.some((e) => e._gen);
    },

    init() {
      this.regenerateAll();
      this.syncFromHash();
      const _blanks0 = (this.cur.operation || '').split('?').length - 1;
      const _colOpBlanks0 = this.cur.colOp ? (this.cur.colOp.result || []).filter(d => d === '?').length : 0;
      this.trouInputs = (_blanks0 + _colOpBlanks0) > 0 ? Array(_blanks0 + _colOpBlanks0).fill('') : [];
      const _ia = this.cur.sequence || this.cur.bounding || this.cur.convert;
      this.seqInputs = _ia ? _ia.answers.map(() => '') : [];
      if (this.cur.grid) {
        this.gridCells = new Array(this.cur.grid.rows.length * this.cur.grid.columns.length).fill(0);
      }
      if (this.cur.pyramid) {
        this._initPyramid(this.cur.pyramid);
      }
      if (this.cur.statements) {
        this.tfInputs = this.cur.statements.map(() => null);
      }
      if (this.cur.comparisons) {
        this.cmpInputs = this.cur.comparisons.map(() => null);
      }
      if (this.cur.mqQuestions) {
        this.mqInputs = this.cur.mqQuestions.map(() => '');
        this.mqSolved = this.cur.mqQuestions.map(() => false);
      }
      if (this.cur.items) {
        this.sortShuffled = [...this.cur.items].sort(() => Math.random() - 0.5);
      }
      if (this.cur.selectStatements) {
        this.selectAnswers = new Array(this.cur.selectStatements.length).fill('');
      }
      if (this.cur.tiles) {
        const _tn = this.cur.tiles.length;
        const _ta = Array.from({ length: _tn }, (_, i) => i);
        for (let i = _tn - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [_ta[i], _ta[j]] = [_ta[j], _ta[i]];
        }
        if (_ta.every((v, i) => v === i) && _tn > 1) [_ta[0], _ta[1]] = [_ta[1], _ta[0]];
        this.dragTilesOrder = _ta;
      }
      if (this.cur.table) {
        this.tableInputs = new Array(this.cur.table.blankCount).fill('');
      }
      this.tableErrors = [];
      if (this.cur.columns) {
        this.clickBlockLevels = this.cur.columns.map(() => 0);
        this.clickBlockErrors = [];
      }
      if (this.cur.denominator && this.cur.type === 'fraction-paint') {
        this.paintCells = Array(this.cur.denominator).fill(false);
      }
      if (this.cur.bc) {
        const _bc = this.cur.bc;
        this.bcValues = _bc.mode === 'build' ? _bc.labels.map(() => 0) : [..._bc.values];
        this.bcErrors = [];
        this.bcInputs = (_bc.questions || []).map(() => '');
        this.bcSolved = (_bc.questions || []).map(() => false);
      }
      if (this.cur.chain) {
        this.ccInputs = this.cur.chain.steps.map(() => '');
        this.ccErrors = [];
      }
      const _focusFirst = () => {
        let ref;
        if (this.cur.type === 'fraction-check') ref = this.$refs.rfNum;
        else if (this.cur.type === 'coordinate-grid' && this.cur.cg && this.cur.cg.mode !== 'place') ref = this.$refs.cgX;
        else if (this.trouInputs.length > 0)
          ref = Array.from(this.$el.querySelectorAll('.js-trou input')).find((el) => el.offsetHeight > 0);
        else if (this.seqInputs.length > 0)
          ref = Array.from(this.$el.querySelectorAll('.js-seq input')).find((el) => el.offsetHeight > 0);
        else if (this.cur.type === 'fill-table')
          ref = Array.from(this.$el.querySelectorAll('.js-table input')).find((el) => el.offsetHeight > 0);
        else ref = this.$refs.input;
        if (ref && !ref.disabled) ref.focus();
      };
      requestAnimationFrame(_focusFirst);
      this.$watch('currentIndex', () => requestAnimationFrame(_focusFirst));
      this.$watch('solvedCount', (count) => {
        if (count === this.exercises.length && this.exercises.length > 0) localStore.markDone(this.seriesId);
      });
    },
    get cur() {
      return this.exercises[this.currentIndex] || {};
    },
    /* Rendered operation with shorthands expanded to HTML (for non-trou display) */
    get operationHtml() {
      return renderOpShorthands(this.cur.operation || '');
    },
    /* Parse operation à trou into structured parts for fraction rendering */
    get trouParts() {
      const op = this.cur.operation;
      if (!op || !op.includes('?')) return null;
      // Stash &box / &highlight spans as indexed tokens so the regex doesn't break on them
      const stash = [];
      const safe = op.replace(/&(?:box|highlight)\([^)]*\)/g, (match) => {
        stash.push(renderOpShorthands(match));
        return `\x00${stash.length - 1}\x00`;
      });
      const parts = [];
      let ii = 0;
      const re = /(\d+\/\d+|\?\/\d+|\?|[^?\d\x00]+(?:\d+(?!\/\d))?[^?\d\x00]*|\x00\d+\x00|\d+(?!\/\d))/g;
      let m;
      while ((m = re.exec(safe)) !== null) {
        const t = m[1];
        if (/^\d+\/\d+$/.test(t)) {
          const [n, d] = t.split('/');
          parts.push({ t: 'f', n, d });
        } else if (/^\?\/\d+$/.test(t)) {
          parts.push({ t: 'fi', idx: ii++, d: t.split('/')[1] });
        } else if (t === '?') {
          parts.push({ t: 'i', idx: ii++ });
        } else {
          // Restore any stashed shorthand tokens inside this text fragment
          const v = t.replace(/\x00(\d+)\x00/g, (_, i) => stash[+i]);
          parts.push({ t: 'x', v });
        }
      }
      return parts;
    },
    get solved() {
      return this.solvedFlags[this.currentIndex];
    },
    get solvedCount() {
      return this.solvedFlags.filter(Boolean).length;
    },
    get allSolved() {
      return this.solvedFlags.every(Boolean);
    },

    tileTap(i) {
      if (this.solved) return;
      const idx = this.tileSelected.indexOf(i);
      this.tileSelected = idx === -1 ? [...this.tileSelected, i] : this.tileSelected.filter((s) => s !== i);
      this.tileErrors = [];
    },

    huntTap(i) {
      if (this.solved) return;
      const v = (this.cur.grid || [])[i];
      if (v !== this.huntNext) {
        this.huntError = i;
        setTimeout(() => { this.huntError = -1; }, 500);
        return;
      }
      this.huntClicked = [...this.huntClicked, i];
      this.huntNext++;
      if (this.huntNext > this.cur.count) {
        this.solvedFlags[this.currentIndex] = true;
        if (this.currentIndex < this.exercises.length - 1) {
          setTimeout(() => this.goTo(this.currentIndex + 1), 2000);
        }
      }
    },

    nlPlace(event) {
      if (this.solved || !this.cur.nl) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const ratio = (event.clientX - rect.left) / rect.width;
      const svgX = ratio * 500;
      const { min = 0, max = 10, step = 1, subdivisions = 0 } = this.cur.nl;
      const range = max - min;
      const PAD = 40, W = 420;
      const raw = min + (svgX - PAD) / (W / range);
      const clamped = Math.max(min, Math.min(max, raw));
      const snapStep = subdivisions > 0 ? step / subdivisions : step;
      const snapped = Math.round(clamped / snapStep) * snapStep;
      this.nlVal = Math.round(snapped * 1e9) / 1e9;
    },

    nlCheck() {
      if (this.solved || this.nlVal === null || !this.cur.nl) return;
      const { step = 1, subdivisions = 0 } = this.cur.nl;
      const snapStep = subdivisions > 0 ? step / subdivisions : step;
      const tol = snapStep * 0.51;
      const isCorrect = (this.cur.answers || []).some(a => Math.abs(Number(a) - this.nlVal) <= tol);
      if (isCorrect) {
        this.solvedFlags[this.currentIndex] = true;
        this.showError = false;
        if (this.currentIndex < this.exercises.length - 1) {
          setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
        }
      } else {
        this.showError = true;
        setTimeout(() => { this.showError = false; }, 2000);
      }
    },

    cgPlace(event) {
      if (this.solved || !this.cur.cg) return;
      const { cols = 6, rows = 6 } = this.cur.cg;
      const VW = 420, VH = 410, PL = 40, PT = 20;
      const GW = 360, GH = 360;
      const rect = event.currentTarget.getBoundingClientRect();
      const svgX = (event.clientX - rect.left) / rect.width * VW;
      const svgY = (event.clientY - rect.top) / rect.height * VH;
      const rawX = (svgX - PL) / (GW / cols);
      const rawY = rows - (svgY - PT) / (GH / rows);
      this.cgPoint = {
        x: Math.round(Math.max(0, Math.min(cols, rawX))),
        y: Math.round(Math.max(0, Math.min(rows, rawY))),
      };
    },

    cgCheck() {
      if (this.solved || this.cgPoint === null || !this.cur.cg) return;
      const isCorrect = (this.cur.answers || []).some((a) => {
        const [ax, ay] = a.split(',').map((s) => parseInt(s.trim(), 10));
        return this.cgPoint.x === ax && this.cgPoint.y === ay;
      });
      if (isCorrect) {
        this.solvedFlags[this.currentIndex] = true;
        this.showError = false;
        if (this.currentIndex < this.exercises.length - 1) {
          setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
        }
      } else {
        this.showError = true;
        setTimeout(() => { this.showError = false; }, 2000);
      }
    },

    dragRender(tile) {
      if (!tile) return '';
      if (typeof tile === 'string') return tile;
      return window[tile.gen](...Object.values(tile.par));
    },

    dragTap(pos) {
      if (this.solved) return;
      const p = Number(pos);
      if (this.dragSelected === null) {
        this.dragSelected = p;
      } else if (this.dragSelected === p) {
        this.dragSelected = null;
      } else {
        const sel = this.dragSelected;
        const order = this.dragTilesOrder.map(Number);
        [order[sel], order[p]] = [order[p], order[sel]];
        this.dragTilesOrder = order;
        this.dragSelected = null;
        if (this._dragErrTimer) {
          clearTimeout(this._dragErrTimer);
          this._dragErrTimer = null;
        }
        this.dragErrors = [];
      }
    },

    blockTap(ci, r) {
      if (this.solved) return;
      const col = (this.cur.columns || [])[ci];
      if (!col) return;
      const newLevel = col.max - r + 1;
      const updated = (this.clickBlockLevels || []).map((v, i) => (i === ci ? (v === newLevel ? 0 : newLevel) : v));
      this.clickBlockLevels = updated;
      this.clickBlockErrors = [];
    },

    checkTap(i) {
      if (this.solved) return;
      const idx = this.checkSelected.indexOf(i);
      this.checkSelected = idx === -1 ? [...this.checkSelected, i] : this.checkSelected.filter((s) => s !== i);
      this.checkErrors = [];
    },

    svgTap(i) {
      if (this.solved) return;
      const idx = this.svgSelected.indexOf(i);
      this.svgSelected = idx === -1 ? [...this.svgSelected, i] : this.svgSelected.filter((s) => s !== i);
      this.svgErrors = [];
    },

    check() {
      if (this.cur.type === 'bar-chart' && this.cur.bc && this.cur.bc.mode === 'build') {
        if (this.solved) return;
        const errors = this.cur.bc.values
          .map((v, i) => (this.bcValues[i] !== v ? i : -1))
          .filter(i => i >= 0);
        if (errors.length === 0) {
          this.solvedFlags[this.currentIndex] = true;
          this.showError = false;
          this.bcErrors = [];
          if (this.currentIndex < this.exercises.length - 1) {
            setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
          }
        } else {
          this.bcErrors = errors;
          this.showError = true;
          setTimeout(() => { this.showError = false; this.bcErrors = []; }, 2000);
        }
        return;
      }
      if (this.cur.type === 'drag-sort') {
        if (this.solved) return;
        if (this._dragErrTimer) {
          clearTimeout(this._dragErrTimer);
          this._dragErrTimer = null;
        }
        this.dragErrors = [];
        const errors = this.dragTilesOrder
          .map((origIdx, pos) => (Number(origIdx) !== pos ? pos : -1))
          .filter((p) => p >= 0);
        if (errors.length === 0) {
          this.solvedFlags[this.currentIndex] = true;
          this.showError = false;
          this.dragSelected = null;
          if (this.currentIndex < this.exercises.length - 1) {
            setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
          }
        } else {
          this.dragErrors = errors;
          this.showError = true;
          this._dragErrTimer = setTimeout(() => {
            this.showError = false;
            this.dragErrors = [];
            this._dragErrTimer = null;
          }, 2000);
        }
        return;
      }
      if (this.cur.type === 'fraction-paint') {
        if (this.solved) return;
        const count = this.paintCells.filter(Boolean).length;
        if (count === this.cur.numerator) {
          this.solvedFlags[this.currentIndex] = true;
          this.showError = false;
          if (this.currentIndex < this.exercises.length - 1) {
            setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
          }
        } else {
          this.showError = true;
          setTimeout(() => { this.showError = false; }, 2000);
        }
        return;
      }
      if (this.cur.type === 'click-blocks') {
        if (this.solved) return;
        const cols = this.cur.columns || [];
        const errors = cols
          .map((col, i) => ((this.clickBlockLevels[i] || 0) !== col.answer ? i : -1))
          .filter((i) => i >= 0);
        if (errors.length === 0) {
          this.solvedFlags[this.currentIndex] = true;
          this.showError = false;
          this.clickBlockErrors = [];
          if (this.currentIndex < this.exercises.length - 1) {
            setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
          }
        } else {
          this.clickBlockErrors = errors;
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
            this.clickBlockErrors = [];
          }, 2000);
        }
        return;
      }
      if (this.cur.type === 'fill-table') {
        if (this.solved) return;
        if (this.tableInputs.some((v) => !v.trim())) {
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
          }, 2000);
          return;
        }
        const errors = [];
        (this.cur.table?.rows || []).forEach((row) =>
          row.forEach((cell) => {
            if (cell.blank) {
              const normT = s => s.replace(',', '.').replace(/[\s\u00a0\u202f]/g, '').trim();
              const u = normT(this.tableInputs[cell.idx]);
              const a = normT(cell.answer);
              if (u !== a) errors.push(cell.idx);
            }
          })
        );
        if (errors.length === 0) {
          this.solvedFlags[this.currentIndex] = true;
          this.showError = false;
          this.tableErrors = [];
          if (this.currentIndex < this.exercises.length - 1) {
            setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
          }
        } else {
          this.tableErrors = errors;
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
            this.tableErrors = [];
          }, 2000);
        }
        return;
      }
      if (this.cur.type === 'tile-select') {
        if (this.solved) return;
        const expected = [...(this.cur.tileAnswers || [])].sort((a, b) => a - b);
        const actual = [...this.tileSelected].sort((a, b) => a - b);
        if (actual.length === expected.length && actual.every((v, i) => v === expected[i])) {
          this.solvedFlags[this.currentIndex] = true;
          this.showError = false;
          this.tileErrors = [];
          if (this.currentIndex < this.exercises.length - 1) {
            setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
          }
        } else {
          this.tileErrors = this.tileSelected.filter((i) => !expected.includes(i));
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
            this.tileErrors = [];
          }, 2000);
        }
        return;
      }
      if (this.cur.type === 'svg-tiles') {
        if (this.solved) return;
        const expected = [...(this.cur.answers || [])].sort((a, b) => a - b);
        const actual = [...this.svgSelected].sort((a, b) => a - b);
        if (actual.length === expected.length && actual.every((v, i) => v === expected[i])) {
          this.solvedFlags[this.currentIndex] = true;
          this.showError = false;
          this.svgErrors = [];
          if (this.currentIndex < this.exercises.length - 1) {
            setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
          }
        } else {
          this.svgErrors = this.svgSelected.filter((i) => !expected.includes(i));
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
            this.svgErrors = [];
          }, 2000);
        }
        return;
      }
      if (this.cur.type === 'checkbox') {
        if (this.solved) return;
        const exp = [...(this.cur.checkedAnswers || [])].sort((a, b) => a - b);
        const act = [...this.checkSelected].sort((a, b) => a - b);
        if (act.length === exp.length && act.every((v, i) => v === exp[i])) {
          this.solvedFlags[this.currentIndex] = true;
          this.showError = false;
          this.checkErrors = [];
          if (this.currentIndex < this.exercises.length - 1) {
            setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
          }
        } else {
          this.checkErrors = this.checkSelected.filter((i) => !exp.includes(i));
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
            this.checkErrors = [];
          }, 2000);
        }
        return;
      }
      if (this.cur.type === 'select') {
        if (this.solved) return;
        const stmts = this.cur.selectStatements || [];
        if (this.selectAnswers.some((v) => !v)) {
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
          }, 2000);
          return;
        }
        const errors = stmts
          .map((s, i) =>
            (this.selectAnswers[i] || '').trim().toLowerCase() !== s.answer.trim().toLowerCase() ? i : -1
          )
          .filter((i) => i !== -1);
        if (errors.length === 0) {
          this.solvedFlags[this.currentIndex] = true;
          this.showError = false;
          this.selectErrors = [];
          if (this.currentIndex < this.exercises.length - 1) {
            setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
          }
        } else {
          this.selectErrors = errors;
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
            this.selectErrors = [];
          }, 2000);
        }
        return;
      }
      if (this.cur.type === 'sort') {
        if (this.solved) return;
        const userOrder = this.sortPicked.map((i) => this.sortShuffled[i]);
        const wrong = userOrder.map((v, i) => (v !== (this.cur.items || [])[i] ? i : -1)).filter((i) => i !== -1);
        if (wrong.length === 0) {
          this.solvedFlags[this.currentIndex] = true;
          this.showError = false;
          this.sortErrors = [];
          if (this.currentIndex < this.exercises.length - 1) {
            setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
          }
        } else {
          this.sortErrors = wrong;
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
            this.sortErrors = [];
            this.sortPicked = [];
          }, 2000);
        }
        return;
      }
      if (this.cur.type === 'fraction-check') {
        if (this.solved) return;
        if (!this.rfInputs[0].trim() || !this.rfInputs[1].trim()) {
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
          }, 2000);
          return;
        }
        const isCorrect = (this.cur.answers || []).some((a) => {
          const p = a.split('/');
          return this.rfInputs[0].trim() === p[0] && this.rfInputs[1].trim() === p[1];
        });
        if (isCorrect) {
          this.solvedFlags[this.currentIndex] = true;
          this.showError = false;
          if (this.currentIndex < this.exercises.length - 1) {
            setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
          }
        } else {
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
          }, 2000);
        }
        return;
      }
      if (this.cur.type === 'coordinate-grid' && this.cur.cg && this.cur.cg.mode !== 'place') {
        if (this.solved) return;
        const xi = this.cgInputs[0].trim();
        const yi = this.cgInputs[1].trim();
        if (!xi || !yi) {
          this.showError = true;
          setTimeout(() => { this.showError = false; }, 2000);
          return;
        }
        const isCorrect = (this.cur.answers || []).some((a) => {
          const parts = a.split(',');
          return xi === parts[0].trim() && yi === parts[1].trim();
        });
        if (isCorrect) {
          this.solvedFlags[this.currentIndex] = true;
          this.showError = false;
          if (this.currentIndex < this.exercises.length - 1) {
            setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
          }
        } else {
          this.showError = true;
          setTimeout(() => { this.showError = false; }, 2000);
        }
        return;
      }
      if (this.cur.type === 'matching') {
        if (this.solved) return;
        const p = this.cur.pairs;
        if (!p) return;
        if (this.matchConnections.length < p.left.length) {
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
          }, 2000);
          return;
        }
        const errs = [];
        for (const c of this.matchConnections) {
          if (p.answers[c.left] !== c.right) errs.push(c);
        }
        if (errs.length === 0) {
          this.solvedFlags[this.currentIndex] = true;
          this.showError = false;
          this.matchErrors = [];
          this.$nextTick(() => this.updateMatchLines());
          if (this.currentIndex < this.exercises.length - 1) {
            setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
          }
        } else {
          this.matchErrors = errs;
          this.$nextTick(() => this.updateMatchLines());
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
          }, 2000);
        }
        return;
      }
      if (this.cur.type === 'logic-grid') {
        if (this.solved) return;
        const g = this.cur.grid;
        if (!g) return;
        const nr = g.rows.length,
          nc = g.columns.length;
        const checks = [];
        for (let r = 0; r < nr; r++)
          for (let c = 0; c < nc; c++) {
            if (this.gridCells[r * nc + c] === 2) checks.push({ r, c, idx: r * nc + c });
          }
        if (checks.length < nr) {
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
          }, 2000);
          return;
        }
        const errs = checks.filter(({ r, c }) => !g.solution[r][c]);
        if (errs.length === 0) {
          this.solvedFlags[this.currentIndex] = true;
          this.showError = false;
          this.gridErrors = [];
          if (this.currentIndex < this.exercises.length - 1) {
            setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
          }
        } else {
          this.gridErrors = errs.map((e) => e.idx);
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
          }, 2000);
        }
        return;
      }
      if (this.cur.type === 'pyramid') {
        if (this.solved) return;
        const p = this.cur.pyramid;
        if (!p) return;
        const wrong = [];
        let allFilled = true;
        for (let r = 0; r < p.rows.length; r++) {
          for (let c = 0; c < p.rows[r].length; c++) {
            if (!p.given[r][c]) {
              const fi = this.pyramidFlatIdx(r, c);
              if (!this.pyramidInputs[fi].trim()) {
                allFilled = false;
              } else if (this.pyramidInputs[fi].trim() !== String(p.rows[r][c])) {
                wrong.push(fi);
              }
            }
          }
        }
        if (!allFilled) {
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
          }, 2000);
          return;
        }
        if (wrong.length === 0) {
          this.solvedFlags[this.currentIndex] = true;
          this.showError = false;
          this.pyramidErrors = [];
          if (this.currentIndex < this.exercises.length - 1) {
            setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
          }
        } else {
          this.pyramidErrors = wrong;
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
          }, 2000);
        }
        return;
      }
      if (this.cur.type === 'true-false') {
        if (this.solved) return;
        const st = this.cur.statements;
        if (!st) return;
        if (this.tfInputs.some((v) => v === null)) {
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
          }, 2000);
          return;
        }
        const wrong = [];
        st.forEach((s, i) => {
          if (this.tfInputs[i] !== s.answer) wrong.push(i);
        });
        if (wrong.length === 0) {
          this.solvedFlags[this.currentIndex] = true;
          this.showError = false;
          this.tfErrors = [];
          if (this.currentIndex < this.exercises.length - 1) {
            setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
          }
        } else {
          this.tfErrors = wrong;
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
          }, 2000);
        }
        return;
      }
      if (this.cur.type === 'compare') {
        if (this.solved) return;
        const cm = this.cur.comparisons;
        if (!cm) return;
        if (this.cmpInputs.some((v) => v === null)) {
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
          }, 2000);
          return;
        }
        const wrong = [];
        cm.forEach((c, i) => {
          if (this.cmpInputs[i] !== c.answer) wrong.push(i);
        });
        if (wrong.length === 0) {
          this.solvedFlags[this.currentIndex] = true;
          this.showError = false;
          this.cmpErrors = [];
          if (this.currentIndex < this.exercises.length - 1) {
            setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
          }
        } else {
          this.cmpErrors = wrong;
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
          }, 2000);
        }
        return;
      }
      if (this.cur.type === 'sequence' || this.cur.type === 'bounding' || this.cur.type === 'convert') {
        if (this.solved) return;
        const s = this.cur.sequence || this.cur.bounding || this.cur.convert;
        if (!s) return;
        if (this.seqInputs.some((v) => !v.trim())) {
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
          }, 2000);
          return;
        }
        const wrong = [];
        s.answers.forEach((a, idx) => {
          if (this.seqInputs[idx].trim().replace(/,/g, '.') !== a.replace(/,/g, '.')) wrong.push(idx);
        });
        if (wrong.length === 0) {
          this.solvedFlags[this.currentIndex] = true;
          this.showError = false;
          this.seqErrors = [];
          if (this.currentIndex < this.exercises.length - 1) {
            setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
          }
        } else {
          this.seqErrors = wrong;
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
          }, 2000);
        }
        return;
      }
      if (this.cur.type === 'calc-chain') {
        if (this.solved) return;
        const steps = (this.cur.chain || {}).steps || [];
        if (this.ccInputs.some((v) => !v || !v.trim())) {
          this.showError = true;
          setTimeout(() => { this.showError = false; }, 2000);
          return;
        }
        const norm = (s) => s.trim().toLowerCase().replace(/,/g, '.').replace(/[\s\u00a0\u202f]/g, '');
        const errors = steps.map((step, i) => norm(this.ccInputs[i]) !== norm(step.answer) ? i : -1).filter(i => i >= 0);
        if (errors.length === 0) {
          this.solvedFlags[this.currentIndex] = true;
          this.showError = false;
          this.ccErrors = [];
          if (this.currentIndex < this.exercises.length - 1) {
            setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
          }
        } else {
          this.ccErrors = errors;
          this.showError = true;
          setTimeout(() => { this.showError = false; this.ccErrors = []; }, 2000);
        }
        return;
      }
      // Operation à trou (single or multi-blank)
      if (this.trouInputs.length > 0) {
        if (this.solved) return;
        if (this.trouInputs.some((v) => !v.trim())) {
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
          }, 2000);
          return;
        }
        let isCorrect;
        const norm = (s) => s.trim().toLowerCase().replace(/,/g, '.').replace(/[\s\u00a0\u202f]/g, '');
        if (this.trouInputs.length === 1) {
          // Single blank: answers are alternatives
          isCorrect = (this.cur.answers || []).some((a) => norm(a) === norm(this.trouInputs[0]));
        } else {
          // Multi-blank: answers are positional
          isCorrect = this.trouInputs.every(
            (v, i) => norm(v) === norm(this.cur.answers[i] || '')
          );
        }
        if (isCorrect) {
          this.solvedFlags[this.currentIndex] = true;
          this.showError = false;
          if (this.currentIndex < this.exercises.length - 1) {
            setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
          }
        } else {
          this.showError = true;
          setTimeout(() => {
            this.showError = false;
          }, 2000);
        }
        return;
      }
      if (this.solved || !this.userInput.trim()) return;
      const input = this.userInput.trim().toLowerCase().replace(/,/g, '.');
      const isCorrect = (this.cur.answers || []).some((a) => a.replace(/,/g, '.') === input);

      if (isCorrect) {
        this.solvedFlags[this.currentIndex] = true;
        this.showError = false;
        if (this.currentIndex < this.exercises.length - 1) {
          setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
        }
      } else {
        this.showError = true;
        setTimeout(() => {
          this.showError = false;
        }, 2000);
      }
    },

    matchTap(side, i) {
      if (this.solved) return;
      if (side === 'left') {
        this.matchSelected = this.matchSelected === i ? null : i;
      } else {
        if (this.matchSelected === null) return;
        const l = this.matchSelected;
        this.matchConnections = this.matchConnections.filter((c) => c.left !== l && c.right !== i);
        this.matchConnections.push({ left: l, right: i });
        this.matchErrors = this.matchErrors.filter((c) => c.left !== l && c.right !== i);
        this.matchSelected = null;
        this.$nextTick(() => {
          this.updateMatchLines();
          if (this.matchConnections.length === (this.cur.pairs ? this.cur.pairs.left.length : 0)) this.check();
        });
      }
    },
    matchLeftSelected(i) {
      return this.matchSelected === i;
    },
    matchLeftConnected(i) {
      return this.matchConnections.some((c) => c.left === i);
    },
    matchRightConnected(i) {
      return this.matchConnections.some((c) => c.right === i);
    },
    matchIsError(side, i) {
      return this.matchErrors.some((c) => (side === 'left' ? c.left === i : c.right === i));
    },
    matchGetCoords(side, i) {
      const container = this.$refs.matchContainer;
      if (!container) return null;
      const el = container.querySelector('[data-dot="' + side + i + '"]');
      if (!el) return null;
      const er = el.getBoundingClientRect();
      const cr = container.getBoundingClientRect();
      return { x: side === 'left' ? er.right - cr.left : er.left - cr.left, y: er.top + er.height / 2 - cr.top };
    },

    gridTap(r, c) {
      if (this.solved) return;
      const g = this.cur.grid;
      if (!g) return;
      const nc = g.columns.length;
      const idx = r * nc + c;
      const cells = [...this.gridCells];
      const curVal = cells[idx];
      const nv = (curVal + 1) % 3;
      cells[idx] = nv;
      if (nv === 2) {
        for (let cc = 0; cc < nc; cc++) {
          if (cc !== c && cells[r * nc + cc] === 2) cells[r * nc + cc] = 0;
        }
        for (let rr = 0; rr < g.rows.length; rr++) {
          if (rr !== r && cells[rr * nc + c] === 2) cells[rr * nc + c] = 0;
        }
      }
      this.gridCells = cells;
      this.gridErrors = [];
      const checkCount = cells.filter((v) => v === 2).length;
      if (checkCount === g.rows.length) {
        this.$nextTick(() => this.check());
      }
    },
    gridCellVal(r, c) {
      const g = this.cur.grid;
      if (!g) return 0;
      return this.gridCells[r * g.columns.length + c] || 0;
    },
    gridIsError(r, c) {
      const g = this.cur.grid;
      if (!g) return false;
      return this.gridErrors.includes(r * g.columns.length + c);
    },
    _initPyramid(p) {
      const inputs = [];
      for (let r = 0; r < p.rows.length; r++) {
        for (let c = 0; c < p.rows[r].length; c++) {
          inputs.push(p.given[r][c] ? String(p.rows[r][c]) : '');
        }
      }
      this.pyramidInputs = inputs;
      this.pyramidErrors = [];
    },
    pyramidFlatIdx(r, c) {
      const p = this.cur.pyramid;
      if (!p) return 0;
      let idx = 0;
      for (let ri = 0; ri < r; ri++) idx += p.rows[ri].length;
      return idx + c;
    },
    pyramidIsError(r, c) {
      return this.pyramidErrors.includes(this.pyramidFlatIdx(r, c));
    },

    groupsTap(i) {
      if (this.solved) return;
      if (i === this.cur.cmpGroupAnswer) {
        this.cmpGroupWrong = null;
        this.solvedFlags[this.currentIndex] = true;
        if (this.currentIndex < this.exercises.length - 1) {
          setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
        }
      } else {
        this.cmpGroupWrong = i;
        setTimeout(() => { this.cmpGroupWrong = null; }, 800);
      }
    },

    mcqTap(i) {
      if (this.solved) return;
      if (i === this.cur.mcqAnswer) {
        this.mcqSelected = i;
        this.mcqWrong = null;
        this.solvedFlags[this.currentIndex] = true;
        this.showError = false;
        if (this.currentIndex < this.exercises.length - 1) {
          setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
        }
      } else {
        this.mcqWrong = i;
        this.mcqSelected = null;
        setTimeout(() => {
          this.mcqWrong = null;
        }, 1500);
      }
    },

    mqCheck(i) {
      if (this.mqSolved[i] || !this.mqInputs[i].trim()) return;
      const q = this.cur.mqQuestions;
      if (!q) return;
      if (this.mqInputs[i].trim().toLowerCase() === q[i].answer) {
        this.mqSolved[i] = true;
        this.mqErrors = this.mqErrors.filter((e) => e !== i);
        if (this.mqSolved.every(Boolean)) {
          this.solvedFlags[this.currentIndex] = true;
          if (this.currentIndex < this.exercises.length - 1) {
            setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
          }
        } else {
          this.$nextTick(() => {
            for (let j = i + 1; j < q.length; j++) {
              if (!this.mqSolved[j]) {
                const ref = this.$refs['mqInput' + j];
                if (ref) ref.focus();
                return;
              }
            }
          });
        }
      } else {
        this.mqErrors = [...this.mqErrors.filter((e) => e !== i), i];
        setTimeout(() => {
          this.mqErrors = this.mqErrors.filter((e) => e !== i);
        }, 2000);
      }
    },

    barChartSetValue(colIdx, val) {
      if (this.solved) return;
      const newVal = this.bcValues[colIdx] === val ? 0 : val;
      this.bcValues = this.bcValues.map((v, i) => i === colIdx ? newVal : v);
      this.bcErrors = this.bcErrors.filter(e => e !== colIdx);
    },

    bcCheck(i) {
      if (!this.cur.bc || !this.cur.bc.questions) return;
      const q = this.cur.bc.questions[i];
      if (!q || this.bcSolved[i]) return;
      const input = (this.bcInputs[i] || '').trim().toLowerCase().replace(/,/g, '.');
      const answer = q.answer.replace(/,/g, '.');
      if (input === answer) {
        this.bcSolved = this.bcSolved.map((v, j) => j === i ? true : v);
        this.bcErrors = this.bcErrors.filter(e => e !== i);
        if (this.bcSolved.every(Boolean)) {
          this.solvedFlags[this.currentIndex] = true;
          if (this.currentIndex < this.exercises.length - 1) {
            setTimeout(() => this.goTo(this.currentIndex + 1), 1500);
          }
        }
      } else {
        if (!this.bcErrors.includes(i)) {
          this.bcErrors = [...this.bcErrors, i];
        }
        setTimeout(() => { this.bcErrors = this.bcErrors.filter(e => e !== i); }, 2000);
      }
    },

    updateMatchLines() {
      this._matchLinesSvg = this.matchConnections
        .map((c) => {
          const from = this.matchGetCoords('left', c.left);
          const to = this.matchGetCoords('right', c.right);
          if (!from || !to) return '';
          const color = this.matchErrors.some((e) => e.left === c.left)
            ? '#ef4444'
            : this.solvedFlags[this.currentIndex]
              ? '#22c55e'
              : 'var(--p)';
          return (
            '<line x1="' +
            from.x +
            '" y1="' +
            from.y +
            '" x2="' +
            to.x +
            '" y2="' +
            to.y +
            '" stroke="' +
            color +
            '" stroke-width="3" stroke-linecap="round"/>'
          );
        })
        .join('');
    },

    sortTap(idx) {
      if (this.solved || this.sortPicked.includes(idx)) return;
      this.sortPicked.push(idx);
    },
    sortUnpick(rank) {
      if (this.solved) return;
      this.sortPicked = this.sortPicked.slice(0, rank);
    },

    colOpColor(posFromRight) {
      const p = [
        'bg-red-100 border-red-400 text-red-700 dark:bg-red-900/20 dark:border-red-500 dark:text-red-300',
        'bg-green-100 border-green-400 text-green-700 dark:bg-green-900/20 dark:border-green-500 dark:text-green-300',
        'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-300',
        'bg-orange-100 border-orange-400 text-orange-700 dark:bg-orange-900/20 dark:border-orange-500 dark:text-orange-300',
        'bg-purple-100 border-purple-400 text-purple-700 dark:bg-purple-900/20 dark:border-purple-500 dark:text-purple-300',
        'bg-sky-100 border-sky-400 text-sky-700 dark:bg-sky-900/20 dark:border-sky-500 dark:text-sky-300',
      ];
      return p[posFromRight % p.length];
    },

    colOpTrouIdx(i) {
      return (this.cur.colOp?.result || []).slice(0, i).filter(d => d === '?').length;
    },


    goTo(idx) {
      this.currentIndex = idx;
      this.userInput = '';
      this.showError = false;
      this.nlVal = null;
      this.cgInputs = ['', ''];
      this.cgPoint = null;
      this.matchSelected = null;
      this.matchConnections = [];
      this.matchErrors = [];
      this._matchLinesSvg = '';
      this.rfInputs = ['', ''];
      const _e = this.exercises[idx] || {};
      const _blanks = (_e.operation || '').split('?').length - 1;
      const _colOpBlanks = _e.colOp ? (_e.colOp.result || []).filter(d => d === '?').length : 0;
      this.trouInputs = (_blanks + _colOpBlanks) > 0 ? Array(_blanks + _colOpBlanks).fill('') : [];
      const _s = _e.sequence || _e.bounding || _e.convert;
      this.seqInputs = _s ? _s.answers.map(() => '') : [];
      this.seqErrors = [];
      const _g = _e.grid;
      this.gridCells = _g ? new Array(_g.rows.length * _g.columns.length).fill(0) : [];
      this.gridErrors = [];
      if (_e.pyramid) {
        this._initPyramid(_e.pyramid);
      } else {
        this.pyramidInputs = [];
        this.pyramidErrors = [];
      }
      if (_e.statements) {
        this.tfInputs = _e.statements.map(() => null);
      } else {
        this.tfInputs = [];
      }
      this.tfErrors = [];
      if (_e.comparisons) {
        this.cmpInputs = _e.comparisons.map(() => null);
      } else {
        this.cmpInputs = [];
      }
      this.cmpErrors = [];
      if (_e.mqQuestions) {
        this.mqInputs = _e.mqQuestions.map(() => '');
        this.mqSolved = _e.mqQuestions.map(() => false);
      } else {
        this.mqInputs = [];
        this.mqSolved = [];
      }
      this.mqErrors = [];
      this.mcqSelected = null;
      this.mcqWrong = null;
      this.cmpGroupWrong = null;
      this.tileSelected = [];
      this.tileErrors = [];
      this.svgSelected = [];
      this.svgErrors = [];
      if (_e.items) {
        this.sortPicked = [];
        this.sortShuffled = [..._e.items].sort(() => Math.random() - 0.5);
      } else {
        this.sortPicked = [];
        this.sortShuffled = [];
      }
      this.sortErrors = [];
      if (_e.table) {
        this.tableInputs = new Array(_e.table.blankCount).fill('');
      } else {
        this.tableInputs = [];
      }
      this.tableErrors = [];
      this.checkSelected = [];
      this.checkErrors = [];
      if (_e.columns) {
        this.clickBlockLevels = _e.columns.map(() => 0);
      } else {
        this.clickBlockLevels = [];
      }
      this.clickBlockErrors = [];
      this.paintCells = (_e.type === 'fraction-paint' && _e.denominator) ? Array(_e.denominator).fill(false) : [];
      this.paintDragging = false;
      this.huntClicked = [];
      this.huntNext = 1;
      this.huntError = -1;
      this.selectAnswers = new Array((_e.selectStatements || []).length).fill('');
      this.selectErrors = [];
      if (_e.tiles) {
        const n = _e.tiles.length;
        const arr = Array.from({ length: n }, (_, i) => i);
        for (let i = n - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        if (arr.every((v, i) => v === i) && n > 1) [arr[0], arr[1]] = [arr[1], arr[0]];
        this.dragTilesOrder = arr;
      } else {
        this.dragTilesOrder = [];
      }
      this.dragSelected = null;
      if (this._dragErrTimer) {
        clearTimeout(this._dragErrTimer);
        this._dragErrTimer = null;
      }
      this.dragErrors = [];
      if (_e.bc) {
        this.bcValues = _e.bc.mode === 'build' ? _e.bc.labels.map(() => 0) : [..._e.bc.values];
        this.bcErrors = [];
        this.bcInputs = (_e.bc.questions || []).map(() => '');
        this.bcSolved = (_e.bc.questions || []).map(() => false);
      } else {
        this.bcValues = [];
        this.bcErrors = [];
        this.bcInputs = [];
        this.bcSolved = [];
      }
      if (_e.chain) {
        this.ccInputs = _e.chain.steps.map(() => '');
        this.ccErrors = [];
      } else {
        this.ccInputs = [];
        this.ccErrors = [];
      }
      window.location.hash = '#' + (idx + 1);
    },

    syncFromHash() {
      const h = parseInt(window.location.hash.replace('#', ''), 10);
      if (h >= 1 && h <= this.exercises.length) {
        this.currentIndex = h - 1;
      }
    },
  };
}

/* Exercise store — loads CSV on demand, caches in sessionStorage */
document.addEventListener('alpine:init', () => {
  const LEVELS = { 1: 'CP', 2: 'CE1', 3: 'CE2', 4: 'CM1', 5: 'CM2' };
  const DIFFS = { 1: 'facile', 2: 'moyen', 3: 'difficile' };
  const FOLDERS = { e: 'exercices', a: 'applications', d: 'defis' };

  Alpine.store('exercises', {
    data: null,
    loading: false,

    async load() {
      if (this.data) return;
      const cached = sessionStorage.getItem('ex');
      if (cached) {
        try {
          const d = JSON.parse(cached);
          const prefix = window.__pathPrefix || '/';
          if (Array.isArray(d) && d.length && d[0].title && d[0].seriesUrl && d[0].seriesUrl.startsWith(prefix)) {
            this.data = d;
            return;
          }
          sessionStorage.removeItem('ex');
        } catch (e) {
          sessionStorage.removeItem('ex');
        }
      }

      this.loading = true;
      try {
        const res = await fetch((window.__pathPrefix || '/') + 'fr/exercices/data.csv');
        if (!res.ok) {
          console.error('CSV fetch failed:', res.status);
          this.loading = false;
          return;
        }
        const text = await res.text();
        const rows = text.replace(/\r/g, '').trim().split('\n');
        if (!rows[0] || !rows[0].startsWith('id,')) {
          console.error('CSV header invalid:', rows[0]);
          this.loading = false;
          return;
        }
        this.data = rows
          .slice(1)
          .filter((r) => r)
          .map((row) => {
            const [id, l, s, t, title, d, f] = row.split(',');
            return {
              id,
              level: LEVELS[l] || l,
              subject: s,
              topic: t,
              title,
              difficulty: DIFFS[d] || d,
              isDefi: f === 'd',
              seriesUrl: (window.__pathPrefix || '/') + 'fr/' + (FOLDERS[f] || 'exercices') + '/' + id + '/',
            };
          });
        sessionStorage.setItem('ex', JSON.stringify(this.data));
      } catch (e) {
        console.error('CSV load error:', e);
      }
      this.loading = false;
    },
  });
});
