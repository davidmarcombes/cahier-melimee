import { localStore } from './store.js';
import { renderOpShorthands, normalizeAnswer } from './utils.js';
import { SETTINGS } from './constants.js';

export function seriesPlayer(exercises, seriesId) {
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
    mcColors: [],       // palette index per cell (null = unpainted)
    mcActiveColor: 0,   // currently selected paint color
    mcErrors: [],       // indices of wrong cells after failed verify

    /* Helpers */
    get cur() {
      return this.exercises[this.currentIndex] || {};
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
    get hasGenerators() {
      return this.exercises.some((e) => e._gen);
    },
    get operationHtml() {
      return renderOpShorthands(this.cur.operation || '');
    },

    /* Fraction Helpers */
    get fractionShapes() {
      if (this.cur.type !== 'fraction' || !this.cur.fraction) return [];
      // Global from svg.js
      return typeof fractionShapesSvg !== 'undefined' ? fractionShapesSvg(this.cur.fraction) : [];
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
      return typeof rulerExerciseSvg !== 'undefined' ? rulerExerciseSvg(this.cur.ruler) : '';
    },

    /* Coordinate-grid SVG */
    get coordinateGridSvg() {
      if (this.cur.type !== 'coordinate-grid' || !this.cur.cg) return '';
      return typeof coordinateGridSvg !== 'undefined' ? coordinateGridSvg(this.cur.cg) : '';
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
      return typeof numberLineSvg !== 'undefined' ? numberLineSvg(this.cur.nl) : '';
    },

    /* Bar-chart Y axis values */
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
      const source = this.exercises.length > 0 ? this.exercises : (exercises || []);
      for (const ex of source) {
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
          expanded.push({ ...ex, ...gen.generate(ex._gen.params || {}) });
        }
      }
      this.exercises = expanded;
      this.solvedFlags = Array(this.exercises.length).fill(false);
    },

    init() {
      this.regenerateAll();
      this.syncFromHash();
      this._setupCurrentExercise();
      
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
      this.$watch('currentIndex', () => {
        this._setupCurrentExercise();
        requestAnimationFrame(_focusFirst);
      });
      this.$watch('solvedCount', (count) => {
        if (count === this.exercises.length && this.exercises.length > 0) localStore.markDone(this.seriesId);
      });
    },

    _setupCurrentExercise() {
      const _e = this.cur;
      const _blanks = (_e.operation || '').split('?').length - 1;
      const _colOpBlanks = _e.colOp ? (_e.colOp.result || []).filter(d => d === '?').length : 0;
      this.trouInputs = (_blanks + _colOpBlanks) > 0 ? Array(_blanks + _colOpBlanks).fill('') : [];
      
      const _ia = _e.sequence || _e.bounding || _e.convert;
      this.seqInputs = _ia ? _ia.answers.map(() => '') : [];
      this.seqErrors = [];

      this.gridCells = _e.grid ? new Array(_e.grid.rows.length * _e.grid.columns.length).fill(0) : [];
      this.gridErrors = [];

      if (_e.pyramid) this._initPyramid(_e.pyramid);
      else { this.pyramidInputs = []; this.pyramidErrors = []; }

      this.tfInputs = _e.statements ? _e.statements.map(() => null) : [];
      this.tfErrors = [];

      this.cmpInputs = _e.comparisons ? _e.comparisons.map(() => null) : [];
      this.cmpErrors = [];

      if (_e.mqQuestions) {
        this.mqInputs = _e.mqQuestions.map(() => '');
        this.mqSolved = _e.mqQuestions.map(() => false);
      } else {
        this.mqInputs = [];
        this.mqSolved = [];
      }
      this.mqErrors = [];

      if (_e.items) {
        this.sortPicked = [];
        this.sortShuffled = [..._e.items].sort(() => Math.random() - 0.5);
      } else {
        this.sortPicked = [];
        this.sortShuffled = [];
      }
      this.sortErrors = [];

      if (_e.selectStatements) this.selectAnswers = new Array(_e.selectStatements.length).fill('');
      else this.selectAnswers = [];
      this.selectErrors = [];

      if (_e.tiles) {
        const _tn = _e.tiles.length;
        const _ta = Array.from({ length: _tn }, (_, i) => i);
        for (let i = _tn - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [_ta[i], _ta[j]] = [_ta[j], _ta[i]];
        }
        if (_ta.every((v, i) => v === i) && _tn > 1) [_ta[0], _ta[1]] = [_ta[1], _ta[0]];
        this.dragTilesOrder = _ta;
      } else {
        this.dragTilesOrder = [];
      }

      this.tableInputs = _e.table ? new Array(_e.table.blankCount).fill('') : [];
      this.tableErrors = [];

      this.clickBlockLevels = _e.columns ? _e.columns.map(() => 0) : [];
      this.clickBlockErrors = [];

      this.paintCells = (_e.type === 'fraction-paint' && _e.denominator) ? Array(_e.denominator).fill(false) : [];
      this.paintDragging = false;

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
      this.mcqSelected = null;
      this.mcqWrong = null;
      this.cmpGroupWrong = null;
      this.tileSelected = [];
      this.tileErrors = [];
      this.svgSelected = [];
      this.svgErrors = [];
      this.checkSelected = [];
      this.checkErrors = [];
      this.dragSelected = null;
      this.huntClicked = [];
      this.huntNext = 1;
      this.huntError = -1;
      this.mcColors = [];
      this.mcActiveColor = 0;
      this.mcErrors = [];

      if (this._dragErrTimer) {
        clearTimeout(this._dragErrTimer);
        this._dragErrTimer = null;
      }
      this.dragErrors = [];
    },

    /* Parse operation à trou into structured parts for fraction rendering */
    get trouParts() {
      const op = this.cur.operation;
      if (!op || !op.includes('?')) return null;
      // Stash &box / &highlight spans
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
          const v = t.replace(/\x00(\d+)\x00/g, (_, i) => stash[+i]);
          parts.push({ t: 'x', v });
        }
      }
      return parts;
    },

    tileTap(i) {
      if (this.solved) return;
      const idx = this.tileSelected.indexOf(i);
      this.tileSelected = idx === -1 ? [...this.tileSelected, i] : this.tileSelected.filter((s) => s !== i);
      this.tileErrors = [];
    },

    mcPaint(i) {
      const updated = [...this.mcColors];
      // clicking the same color on an already-painted cell erases it
      updated[i] = updated[i] === this.mcActiveColor ? null : this.mcActiveColor;
      this.mcColors = updated;
      this.mcErrors = [];
    },

    mcAllColored() {
      const cells = this.cur.magicColor?.cells || [];
      return cells.length > 0 && cells.every((_, i) => this.mcColors[i] != null);
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
      return typeof window[tile.gen] === 'function' ? window[tile.gen](...Object.values(tile.par)) : '';
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
      const _e = this.cur;
      if (this.solved) return;

      if (_e.type === 'bar-chart' && _e.bc && _e.bc.mode === 'build') {
        const errors = _e.bc.values
          .map((v, i) => (this.bcValues[i] !== v ? i : -1))
          .filter(i => i >= 0);
        if (errors.length === 0) {
          this._markSolvedAndAdvance();
        } else {
          this.bcErrors = errors;
          this._flashError(() => { this.bcErrors = []; });
        }
        return;
      }

      if (_e.type === 'drag-sort') {
        if (this._dragErrTimer) { clearTimeout(this._dragErrTimer); this._dragErrTimer = null; }
        const errors = this.dragTilesOrder
          .map((origIdx, pos) => (Number(origIdx) !== pos ? pos : -1))
          .filter((p) => p >= 0);
        if (errors.length === 0) {
          this.dragSelected = null;
          this._markSolvedAndAdvance();
        } else {
          this.dragErrors = errors;
          this._flashError(() => { this.dragErrors = []; });
        }
        return;
      }

      if (_e.type === 'fraction-paint') {
        const count = this.paintCells.filter(Boolean).length;
        if (count === _e.numerator) this._markSolvedAndAdvance();
        else this._flashError();
        return;
      }

      if (_e.type === 'click-blocks') {
        const cols = _e.columns || [];
        const errors = cols
          .map((col, i) => ((this.clickBlockLevels[i] || 0) !== col.answer ? i : -1))
          .filter((i) => i >= 0);
        if (errors.length === 0) {
          this.clickBlockErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.clickBlockErrors = errors;
          this._flashError(() => { this.clickBlockErrors = []; });
        }
        return;
      }

      if (_e.type === 'fill-table') {
        if (this.tableInputs.some((v) => !v.trim())) { this._flashError(); return; }
        const errors = [];
        (_e.table?.rows || []).forEach((row) =>
          row.forEach((cell) => {
            if (cell.blank) {
              if (normalizeAnswer(this.tableInputs[cell.idx]) !== normalizeAnswer(cell.answer)) errors.push(cell.idx);
            }
          })
        );
        if (errors.length === 0) {
          this.tableErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.tableErrors = errors;
          this._flashError(() => { this.tableErrors = []; });
        }
        return;
      }

      if (_e.type === 'tile-select') {
        const expected = [...(_e.tileAnswers || [])].sort((a, b) => a - b);
        const actual = [...this.tileSelected].sort((a, b) => a - b);
        if (actual.length === expected.length && actual.every((v, i) => v === expected[i])) {
          this.tileErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.tileErrors = this.tileSelected.filter((i) => !expected.includes(i));
          this._flashError(() => { this.tileErrors = []; });
        }
        return;
      }

      if (_e.type === 'svg-tiles') {
        const expected = [...(_e.answers || [])].sort((a, b) => a - b);
        const actual = [...this.svgSelected].sort((a, b) => a - b);
        if (actual.length === expected.length && actual.every((v, i) => v === expected[i])) {
          this.svgErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.svgErrors = this.svgSelected.filter((i) => !expected.includes(i));
          this._flashError(() => { this.svgErrors = []; });
        }
        return;
      }

      if (_e.type === 'magic-color') {
        const cells = _e.magicColor?.cells || [];
        const wrong = cells.map((c, i) => this.mcColors[i] !== c.colorIdx ? i : -1).filter(i => i !== -1);
        if (wrong.length === 0) {
          this.mcErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.mcErrors = wrong;
          this._flashError(() => { this.mcErrors = []; });
        }
        return;
      }

      if (_e.type === 'checkbox') {
        const exp = [...(_e.checkedAnswers || [])].sort((a, b) => a - b);
        const act = [...this.checkSelected].sort((a, b) => a - b);
        if (act.length === exp.length && act.every((v, i) => v === exp[i])) {
          this.checkErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.checkErrors = this.checkSelected.filter((i) => !exp.includes(i));
          this._flashError(() => { this.checkErrors = []; });
        }
        return;
      }

      if (_e.type === 'select') {
        const stmts = _e.selectStatements || [];
        if (this.selectAnswers.some((v) => !v)) { this._flashError(); return; }
        const errors = stmts
          .map((s, i) => normalizeAnswer(this.selectAnswers[i]) !== normalizeAnswer(s.answer) ? i : -1)
          .filter((i) => i !== -1);
        if (errors.length === 0) {
          this.selectErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.selectErrors = errors;
          this._flashError(() => { this.selectErrors = []; });
        }
        return;
      }

      if (_e.type === 'sort') {
        const userOrder = this.sortPicked.map((i) => this.sortShuffled[i]);
        const items = _e.items || [];
        const wrong = userOrder.map((v, i) => (v !== items[i] ? i : -1)).filter((i) => i !== -1);
        if (wrong.length === 0) {
          this.sortErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.sortErrors = wrong;
          this._flashError(() => { this.sortErrors = []; this.sortPicked = []; });
        }
        return;
      }

      if (_e.type === 'fraction-check') {
        if (!this.rfInputs[0].trim() || !this.rfInputs[1].trim()) { this._flashError(); return; }
        const isCorrect = (_e.answers || []).some((a) => {
          const p = a.split('/');
          return normalizeAnswer(this.rfInputs[0]) === normalizeAnswer(p[0]) && normalizeAnswer(this.rfInputs[1]) === normalizeAnswer(p[1]);
        });
        if (isCorrect) this._markSolvedAndAdvance();
        else this._flashError();
        return;
      }

      if (_e.type === 'coordinate-grid' && _e.cg && _e.cg.mode !== 'place') {
        const xi = this.cgInputs[0].trim();
        const yi = this.cgInputs[1].trim();
        if (!xi || !yi) { this._flashError(); return; }
        const isCorrect = (_e.answers || []).some((a) => {
          const parts = a.split(',');
          return normalizeAnswer(xi) === normalizeAnswer(parts[0]) && normalizeAnswer(yi) === normalizeAnswer(parts[1]);
        });
        if (isCorrect) this._markSolvedAndAdvance();
        else this._flashError();
        return;
      }

      if (_e.type === 'matching') {
        const p = _e.pairs;
        if (!p) return;
        if (this.matchConnections.length < p.left.length) { this._flashError(); return; }
        const errs = this.matchConnections.filter(c => p.answers[c.left] !== c.right);
        if (errs.length === 0) {
          this.matchErrors = [];
          this.$nextTick(() => this.updateMatchLines());
          this._markSolvedAndAdvance();
        } else {
          this.matchErrors = errs;
          this.$nextTick(() => this.updateMatchLines());
          this._flashError();
        }
        return;
      }

      if (_e.type === 'logic-grid') {
        const g = _e.grid;
        if (!g) return;
        const nc = g.columns.length, nr = g.rows.length;
        const checks = this.gridCells.map((v, i) => v === 2 ? { r: Math.floor(i / nc), c: i % nc, idx: i } : null).filter(Boolean);
        if (checks.length < nr) { this._flashError(); return; }
        const errs = checks.filter(({ r, c }) => !g.solution[r][c]);
        if (errs.length === 0) {
          this.gridErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.gridErrors = errs.map((e) => e.idx);
          this._flashError();
        }
        return;
      }

      if (_e.type === 'pyramid') {
        const p = _e.pyramid;
        if (!p) return;
        const wrong = [];
        let allFilled = true;
        p.rows.forEach((row, r) => row.forEach((val, c) => {
          if (!p.given[r][c]) {
            const fi = this.pyramidFlatIdx(r, c);
            const input = this.pyramidInputs[fi]?.trim();
            if (!input) allFilled = false;
            else if (normalizeAnswer(input) !== normalizeAnswer(String(val))) wrong.push(fi);
          }
        }));
        if (!allFilled) { this._flashError(); return; }
        if (wrong.length === 0) {
          this.pyramidErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.pyramidErrors = wrong;
          this._flashError();
        }
        return;
      }

      if (_e.type === 'true-false') {
        if (this.tfInputs.some((v) => v === null)) { this._flashError(); return; }
        const wrong = (_e.statements || []).map((s, i) => this.tfInputs[i] !== s.answer ? i : -1).filter(i => i !== -1);
        if (wrong.length === 0) {
          this.tfErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.tfErrors = wrong;
          this._flashError();
        }
        return;
      }

      if (_e.type === 'compare') {
        if (this.cmpInputs.some((v) => v === null)) { this._flashError(); return; }
        const wrong = (_e.comparisons || []).map((c, i) => this.cmpInputs[i] !== c.answer ? i : -1).filter(i => i !== -1);
        if (wrong.length === 0) {
          this.cmpErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.cmpErrors = wrong;
          this._flashError();
        }
        return;
      }

      if (_e.type === 'sequence' || _e.type === 'bounding' || _e.type === 'convert') {
        const s = _e.sequence || _e.bounding || _e.convert;
        if (!s) return;
        if (this.seqInputs.some((v) => !v.trim())) { this._flashError(); return; }
        const wrong = s.answers.map((a, i) => normalizeAnswer(this.seqInputs[i]) !== normalizeAnswer(a) ? i : -1).filter(i => i !== -1);
        if (wrong.length === 0) {
          this.seqErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.seqErrors = wrong;
          this._flashError();
        }
        return;
      }

      if (_e.type === 'calc-chain') {
        const steps = (_e.chain || {}).steps || [];
        if (this.ccInputs.some((v) => !v?.trim())) { this._flashError(); return; }
        const errors = steps.map((step, i) => normalizeAnswer(this.ccInputs[i]) !== normalizeAnswer(step.answer) ? i : -1).filter(i => i >= 0);
        if (errors.length === 0) {
          this.ccErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.ccErrors = errors;
          this._flashError(() => { this.ccErrors = []; });
        }
        return;
      }

      if (this.trouInputs.length > 0) {
        if (this.trouInputs.some((v) => !v.trim())) { this._flashError(); return; }
        let isCorrect;
        if (this.trouInputs.length === 1) {
          isCorrect = (_e.answers || []).some((a) => normalizeAnswer(a) === normalizeAnswer(this.trouInputs[0]));
        } else {
          isCorrect = this.trouInputs.every((v, i) => normalizeAnswer(v) === normalizeAnswer(_e.answers[i] || ''));
        }
        
        if (isCorrect) this._markSolvedAndAdvance();
        else this._flashError();
        return;
      }

      if (!this.userInput.trim()) return;
      const u = normalizeAnswer(this.userInput);
      if ((_e.answers || []).some((a) => normalizeAnswer(a) === u)) this._markSolvedAndAdvance();
      else this._flashError();
    },

    _markSolvedAndAdvance() {
      this.solvedFlags[this.currentIndex] = true;
      this.showError = false;
      if (this.currentIndex < this.exercises.length - 1) {
        setTimeout(() => this.goTo(this.currentIndex + 1), SETTINGS.SUCCESS_ADVANCE_DELAY);
      }
    },

    _flashError(cleanup) {
      this.showError = true;
      setTimeout(() => {
        this.showError = false;
        if (cleanup) cleanup();
      }, SETTINGS.ERROR_FLASH_DURATION);
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
    matchLeftSelected(i) { return this.matchSelected === i; },
    matchLeftConnected(i) { return this.matchConnections.some((c) => c.left === i); },
    matchRightConnected(i) { return this.matchConnections.some((c) => c.right === i); },
    matchIsError(side, i) { return this.matchErrors.some((c) => (side === 'left' ? c.left === i : c.right === i)); },
    matchGetCoords(side, i) {
      const container = this.$refs.matchContainer;
      if (!container) return null;
      const el = container.querySelector('[data-dot="' + side + i + '"]');
      if (!el) return null;
      const er = el.getBoundingClientRect(), cr = container.getBoundingClientRect();
      return { x: side === 'left' ? er.right - cr.left : er.left - cr.left, y: er.top + er.height / 2 - cr.top };
    },

    gridTap(r, c) {
      if (this.solved) return;
      const g = this.cur.grid;
      if (!g) return;
      const nc = g.columns.length;
      const idx = r * nc + c;
      const cells = [...this.gridCells];
      const nv = (cells[idx] + 1) % 3;
      cells[idx] = nv;
      if (nv === 2) {
        for (let cc = 0; cc < nc; cc++) if (cc !== c && cells[r * nc + cc] === 2) cells[r * nc + cc] = 0;
        for (let rr = 0; rr < g.rows.length; rr++) if (rr !== r && cells[rr * nc + c] === 2) cells[rr * nc + c] = 0;
      }
      this.gridCells = cells;
      this.gridErrors = [];
      if (cells.filter((v) => v === 2).length === g.rows.length) this.$nextTick(() => this.check());
    },
    gridCellVal(r, c) { return this.gridCells[r * (this.cur.grid?.columns.length || 0) + c] || 0; },
    gridIsError(r, c) { return this.gridErrors.includes(r * (this.cur.grid?.columns.length || 0) + c); },
    _initPyramid(p) {
      this.pyramidInputs = p.rows.flatMap((row, r) => row.map((v, c) => p.given[r][c] ? String(v) : ''));
      this.pyramidErrors = [];
    },
    pyramidFlatIdx(r, c) {
      const p = this.cur.pyramid;
      if (!p) return 0;
      let idx = 0;
      for (let ri = 0; ri < r; ri++) idx += p.rows[ri].length;
      return idx + c;
    },
    pyramidIsError(r, c) { return this.pyramidErrors.includes(this.pyramidFlatIdx(r, c)); },

    groupsTap(i) {
      if (this.solved) return;
      if (i === this.cur.cmpGroupAnswer) {
        this.cmpGroupWrong = null;
        this._markSolvedAndAdvance();
      } else {
        this.cmpGroupWrong = i;
        setTimeout(() => { this.cmpGroupWrong = null; }, SETTINGS.MCQ_WRONG_DELAY);
      }
    },

    mcqTap(i) {
      if (this.solved) return;
      if (i === this.cur.mcqAnswer) {
        this.mcqSelected = i;
        this.mcqWrong = null;
        this._markSolvedAndAdvance();
      } else {
        this.mcqWrong = i;
        this.mcqSelected = null;
        setTimeout(() => { this.mcqWrong = null; }, SETTINGS.SUCCESS_ADVANCE_DELAY);
      }
    },

    mqCheck(i) {
      const q = this.cur.mqQuestions;
      if (!q || this.mqSolved[i] || !this.mqInputs[i]?.trim()) return;
      if (normalizeAnswer(this.mqInputs[i]) === normalizeAnswer(q[i].answer)) {
        this.mqSolved[i] = true;
        this.mqErrors = this.mqErrors.filter((e) => e !== i);
        if (this.mqSolved.every(Boolean)) this._markSolvedAndAdvance();
        else {
          this.$nextTick(() => {
            for (let j = i + 1; j < q.length; j++) {
              if (!this.mqSolved[j]) { const ref = this.$refs['mqInput' + j]; if (ref) ref.focus(); return; }
            }
          });
        }
      } else {
        this.mqErrors = [...this.mqErrors.filter((e) => e !== i), i];
        setTimeout(() => { this.mqErrors = this.mqErrors.filter((e) => e !== i); }, SETTINGS.ERROR_FLASH_DURATION);
      }
    },

    barChartSetValue(colIdx, val) {
      if (this.solved) return;
      this.bcValues[colIdx] = this.bcValues[colIdx] === val ? 0 : val;
      this.bcErrors = this.bcErrors.filter(e => e !== colIdx);
    },

    bcCheck(i) {
      if (!this.cur.bc?.questions || this.bcSolved[i]) return;
      const q = this.cur.bc.questions[i];
      if (normalizeAnswer(this.bcInputs[i]) === normalizeAnswer(q.answer)) {
        this.bcSolved[i] = true;
        this.bcErrors = this.bcErrors.filter(e => e !== i);
        if (this.bcSolved.every(Boolean)) this._markSolvedAndAdvance();
      } else {
        if (!this.bcErrors.includes(i)) this.bcErrors = [...this.bcErrors, i];
        setTimeout(() => { this.bcErrors = this.bcErrors.filter(e => e !== i); }, SETTINGS.ERROR_FLASH_DURATION);
      }
    },

    updateMatchLines() {
      this._matchLinesSvg = this.matchConnections.map((c) => {
        const from = this.matchGetCoords('left', c.left), to = this.matchGetCoords('right', c.right);
        if (!from || !to) return '';
        const color = this.matchErrors.some((e) => e.left === c.left) ? '#ef4444' : (this.solved ? '#22c55e' : 'var(--p)');
        return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
      }).join('');
    },

    sortTap(idx) { if (!this.solved && !this.sortPicked.includes(idx)) this.sortPicked.push(idx); },
    sortUnpick(rank) { if (!this.solved) this.sortPicked = this.sortPicked.slice(0, rank); },

    colOpColor(posFromRight) {
      const p = ['bg-red-100 border-red-400 text-red-700 dark:bg-red-900/20 dark:border-red-500 dark:text-red-300','bg-green-100 border-green-400 text-green-700 dark:bg-green-900/20 dark:border-green-500 dark:text-green-300','bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-300','bg-orange-100 border-orange-400 text-orange-700 dark:bg-orange-900/20 dark:border-orange-500 dark:text-orange-300','bg-purple-100 border-purple-400 text-purple-700 dark:bg-purple-900/20 dark:border-purple-500 dark:text-purple-300','bg-sky-100 border-sky-400 text-sky-700 dark:bg-sky-900/20 dark:border-sky-500 dark:text-sky-300'];
      return p[posFromRight % p.length];
    },
    colOpTrouIdx(i) { return (this.cur.colOp?.result || []).slice(0, i).filter(d => d === '?').length; },

    goTo(idx) {
      this.currentIndex = idx;
      window.location.hash = '#' + (idx + 1);
    },

    syncFromHash() {
      const h = parseInt(window.location.hash.replace('#', ''), 10);
      if (h >= 1 && h <= this.exercises.length) this.currentIndex = h - 1;
    },
  };
}
