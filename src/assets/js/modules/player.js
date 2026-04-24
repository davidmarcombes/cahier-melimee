import { localStore } from './store.js';
import { renderOpShorthands, normalizeAnswer } from './utils.js';
import { SETTINGS } from './constants.js';

export function seriesPlayer(exercises, seriesId) {
  return {
    exercises,
    seriesId: seriesId || '',
    currentIndex: 0,
    _ready: false,
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
    triInputs: [],
    triErrors: [],
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
    mcColors: [], // palette index per cell (null = unpainted)
    mcActiveColor: 0, // currently selected paint color
    mcErrors: [], // indices of wrong cells after failed verify
    ipInputs: [], // inputs for base + inverses
    ipSolved: [], // solved flags for base + inverses
    ipErrors: [], // error flags for base + inverses
    dtInputs: {}, // inputs for decimal-triple: fracNum, fracDen, decimal, dizaines, unites, dixiemes, centiemes, milliemes
    dtErrors: [], // field keys with wrong answers
    decompInputs: [], // inputs for decomp type (one per non-comma part)
    decompErrors: [], // indices of wrong decomp inputs
    fmInput: '', // function-machine compute mode output
    fmChoice: null, // function-machine discover mode selected choice
    mazePath: [], // maze path as [[r,c], ...]
    mazeErrors: [], // maze cells that failed validation
    vennPlacements: {}, // venn: itemIdx → zone ('a','b','ab','out')
    vennSelected: null, // venn: currently selected item index
    vennErrors: [], // venn: item indices with wrong placement
    estInput: '', // estimation: estimate field input
    estError: false, // estimation: estimate input is wrong
    exactError: false, // estimation: exact input is wrong
    csSelected: null, // compare-solutions: index of selected solution
    eaStepSelected: null, // error-analysis: index of clicked step
    eaStepError: false, // error-analysis: clicked step was wrong
    eaCorrection: '', // error-analysis: correction input
    eaCorrectionError: false, // error-analysis: correction input is wrong

    gpStep: 0, // guided-problem: current step index
    gpPicked: [], // guided-problem: token strings picked in current tap step
    gpChoice: null, // guided-problem: selected choice (operation / question-type)
    gpInput: '', // guided-problem: text input (convert / calculate)

    tbStory: '', // think-board: story quadrant text
    tbStoryError: false, // think-board: story keyword mismatch
    _tbDrawing: false, // think-board: canvas pointer down

    ffInputs: [], // fact-family: one input per equation (4 total)
    ffErrors: [], // fact-family: indices of wrong equations

    classifyPlacements: {}, // classify: itemIdx → categoryId
    classifySelected: null, // classify: currently selected item index
    classifyErrors: [], // classify: item indices with wrong placement

    futoInputs: [], // futoshiki: flat N*N array of input strings
    futoErrors: [], // futoshiki: flat indices of invalid cells

    kkInputs: [], // kenken: flat N*N array of input strings
    kkErrors: [], // kenken: flat indices of invalid cells

    nlkPaths: {}, // numberlink: { pairNum: [[r,c],...] }
    nlkActive: null, // numberlink: pair number currently being drawn
    nlkErrors: [], // numberlink: [[r,c],...] error cells
    nlkColors: ['', '#ef4444', '#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ec4899'],

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

    /* Thermometer SVG */
    get thermometerSvg() {
      if (this.cur.type !== 'thermometer' || !this.cur.thermometer) return '';
      return typeof thermometerExerciseSvg !== 'undefined' ? thermometerExerciseSvg(this.cur.thermometer) : '';
    },

    /* Coordinate-grid SVG */
    get coordinateGridSvg() {
      if (this.cur.type !== 'coordinate-grid' || !this.cur.cg) return '';
      return typeof coordinateGridSvg !== 'undefined' ? coordinateGridSvg(this.cur.cg) : '';
    },

    get cgMarkerSvg() {
      if (!this.cur.cg || this.cgPoint === null) return '';
      const { cols = 6, rows = 6 } = this.cur.cg;
      const PL = 40,
        PT = 38;
      const cw = 360 / cols,
        ch = 360 / rows;
      const px = PL + this.cgPoint.x * cw;
      const py = PT + (rows - this.cgPoint.y) * ch;
      const lbl = this.cur.cg.placeLabel || 'A';
      return (
        `<circle cx="${px}" cy="${py}" r="6" class="fill-primary-500"/>` +
        `<text x="${px + 9}" y="${py - 6}" font-size="13" font-weight="700" class="fill-primary-600 dark:fill-primary-400">${lbl}</text>`
      );
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
      const PAD = 40,
        W = 420,
        LY = 58;
      const mx = PAD + (this.nlVal - min) * (W / range);
      const lbl = String(this.nlVal);
      return (
        `<circle cx="${mx}" cy="${LY}" r="6" class="fill-primary-500"/>` +
        `<line x1="${mx}" y1="${LY - 6}" x2="${mx}" y2="${LY - 15}" stroke-width="2" class="stroke-primary-500"/>` +
        `<text x="${mx}" y="${LY - 19}" text-anchor="middle" font-size="13" font-weight="700" class="fill-primary-600 dark:fill-primary-400">${lbl}</text>`
      );
    },

    regenerateAll() {
      if (!window.AppGenerators) return;
      const expanded = [];
      const source = this.exercises.length > 0 ? this.exercises : exercises || [];
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
          try {
            expanded.push({ ...ex, ...gen.generate(ex._gen.params || {}) });
          } catch (e) {
            console.error(`Generator error [${ex._gen.name}]:`, e);
            expanded.push({
              ...ex,
              body: `<div class="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl">⚠️ Erreur de génération (${ex._gen.name})</div>`,
            });
          }
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
        else if (this.cur.type === 'coordinate-grid' && this.cur.cg && this.cur.cg.mode !== 'place')
          ref = this.$refs.cgX;
        else if (this.trouInputs.length > 0)
          ref = Array.from(this.$el.querySelectorAll('.js-trou input')).find((el) => el.offsetHeight > 0);
        else if (this.seqInputs.length > 0)
          ref = Array.from(this.$el.querySelectorAll('.js-seq input')).find((el) => el.offsetHeight > 0);
        else if (this.cur.type === 'fill-table')
          ref = Array.from(this.$el.querySelectorAll('.js-table input')).find((el) => el.offsetHeight > 0);
        else ref = this.$refs.input;
        if (ref && !ref.disabled) ref.focus();
      };

      this._ready = true;
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
      const _blanks = String(_e.operation ?? '').split('?').length - 1;
      const _colOpBlanks = _e.colOp ? (_e.colOp.result || []).filter((d) => d === '?').length : 0;
      this.trouInputs = _blanks + _colOpBlanks > 0 ? Array(_blanks + _colOpBlanks).fill('') : [];

      const _ia = _e.sequence || _e.bounding || _e.convert;
      if (_ia) {
        this.seqInputs = _ia.items ? _ia.items.filter((it) => it.blank).map(() => '') : _ia.answers.map(() => '');
      } else {
        this.seqInputs = [];
      }
      this.seqErrors = [];

      this.gridCells = _e.grid && _e.grid.rows ? new Array(_e.grid.rows.length * _e.grid.columns.length).fill(0) : [];
      this.gridErrors = [];

      if (_e.pyramid) this._initPyramid(_e.pyramid);
      else {
        this.pyramidInputs = [];
        this.pyramidErrors = [];
      }

      this.triInputs = _e.triangle ? new Array(6).fill('') : [];
      this.triErrors = [];

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

      this.paintCells = _e.type === 'fraction-paint' && _e.denominator ? Array(_e.denominator).fill(false) : [];
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

      if (_e.ipBase) {
        this.ipInputs = new Array(1 + (_e.ipInverses || []).length).fill('');
        this.ipSolved = new Array(1 + (_e.ipInverses || []).length).fill(false);
      } else {
        this.ipInputs = [];
        this.ipSolved = [];
      }
      this.ipErrors = [];

      if (_e.decomp) {
        this.decompInputs = (_e.decomp.parts || []).filter((p) => !p.comma).map(() => '');
      } else {
        this.decompInputs = [];
      }
      this.decompErrors = [];

      this.fmInput = '';
      this.fmChoice = null;

      this.mazePath = [];
      this.mazeErrors = [];

      this.vennPlacements = {};
      this.vennSelected = null;
      this.vennErrors = [];

      this.estInput = '';
      this.estError = false;
      this.exactError = false;

      this.csSelected = null;

      this.eaStepSelected = null;
      this.eaStepError = false;
      this.eaCorrection = '';
      this.eaCorrectionError = false;

      this.gpStep = 0;
      this.gpPicked = [];
      this.gpChoice = null;
      this.gpInput = '';
      // Activate token spans for first step after DOM updates
      if (_e.type === 'guided-problem') this.$nextTick(() => this._gpActivateTokens());

      this.tbStory = '';
      this.tbStoryError = false;
      this._tbDrawing = false;
      if (_e.type === 'think-board') this.$nextTick(() => this._tbInitCanvas());

      this.ffInputs = _e.ffEquations ? _e.ffEquations.map(() => '') : [];
      this.ffErrors = [];

      this.classifyPlacements = {};
      this.classifySelected = null;
      this.classifyErrors = [];

      if (_e.futoshiki) {
        const n2 = _e.futoshiki.size * _e.futoshiki.size;
        this.futoInputs = Array(n2).fill('');
        // Pre-fill given cells
        (_e.futoshiki.given || []).forEach((v, i) => {
          if (v != null) this.futoInputs[i] = String(v);
        });
      } else {
        this.futoInputs = [];
      }
      this.futoErrors = [];

      this.kkInputs = _e.kenken ? Array(_e.kenken.size * _e.kenken.size).fill('') : [];
      this.kkErrors = [];

      this.nlkPaths = {};
      this.nlkActive = null;
      this.nlkErrors = [];

      this.dtInputs =
        _e.type === 'decimal-triple'
          ? {
              fracNum: '',
              fracDen: '',
              decimal: '',
              dizaines: '',
              unites: '',
              dixiemes: '',
              centiemes: '',
              milliemes: '',
            }
          : {};
      this.dtErrors = [];

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
      // Stash __-joined non-breaking segments (__ = non-breaking space glue).
      // Any run of text between ? markers that contains __ becomes one atomic text part.
      const stash = [];
      let safe = op.replace(/[^?]+/g, (seg) => {
        if (!seg.includes('__')) return seg;
        stash.push(seg.replace(/__/g, '\u00A0'));
        return `\x00${stash.length - 1}\x00`;
      });
      // Stash &box / &highlight spans
      safe = safe.replace(/&(?:box|highlight|frac)\([^)]*\)/g, (match) => {
        stash.push(renderOpShorthands(match));
        return `\x00${stash.length - 1}\x00`;
      });
      const parts = [];
      let ii = 0;
      // eslint-disable-next-line no-control-regex
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
          // eslint-disable-next-line no-control-regex
          const v = t.replace(/\x00(\d+)\x00/g, (_, i) => stash[+i]);
          // Boundary spaces collapse inside inline-block; promote to non-breaking.
          parts.push({ t: 'x', v: v.replace(/^ +| +$/g, (s) => '\u00A0'.repeat(s.length)) });
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
        setTimeout(() => {
          this.huntError = -1;
        }, 500);
        return;
      }
      this.huntClicked = [...this.huntClicked, i];
      this.huntNext++;
      if (this.huntNext > this.cur.count) {
        this.solvedFlags[this.currentIndex] = true;
        if (this.currentIndex < this.exercises.length - 1) {
          setTimeout(() => this.goTo(this.currentIndex + 1), SETTINGS.SUCCESS_ADVANCE_DELAY);
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
      const PAD = 40,
        W = 420;
      const raw = min + (svgX - PAD) / (W / range);
      const clamped = Math.max(min, Math.min(max, raw));
      const snapStep = subdivisions > 0 ? step / subdivisions : step;
      const snapped = Math.round(clamped / snapStep) * snapStep;
      this.nlVal = Math.round(snapped * 1e9) / 1e9;
    },

    ipCheck(idx) {
      if (this.solved || this.ipSolved[idx]) return;
      const _e = this.cur;
      const answer = idx === 0 ? _e.ipBase.answer : _e.ipInverses[idx - 1].answer;
      if (normalizeAnswer(this.ipInputs[idx]) === normalizeAnswer(String(answer))) {
        this.ipSolved[idx] = true;
        this.ipErrors = this.ipErrors.filter((i) => i !== idx);
        this.showError = false;

        // If all sub-problems are solved, mark exercise as solved
        if (this.ipSolved.every(Boolean)) {
          this._markSolvedAndAdvance();
        } else {
          // Focus next input
          this.$nextTick(() => {
            const nextInput = this.$el.querySelector(`[x-ref="ipInput${idx + 1}"]`);
            if (nextInput) nextInput.focus();
          });
        }
      } else {
        this.ipErrors = Array.from(new Set([...this.ipErrors, idx]));
        this._flashError(() => {
          this.ipErrors = this.ipErrors.filter((i) => i !== idx);
        });
      }
    },

    nlCheck() {
      if (this.solved || this.nlVal === null || !this.cur.nl) return;
      const { step = 1, subdivisions = 0 } = this.cur.nl;
      const snapStep = subdivisions > 0 ? step / subdivisions : step;
      const tol = snapStep * 0.51;
      const isCorrect = (this.cur.answers || []).some((a) => Math.abs(Number(a) - this.nlVal) <= tol);
      if (isCorrect) {
        this.solvedFlags[this.currentIndex] = true;
        this.showError = false;
        if (this.currentIndex < this.exercises.length - 1) {
          setTimeout(() => this.goTo(this.currentIndex + 1), SETTINGS.SUCCESS_ADVANCE_DELAY);
        }
      } else {
        this.showError = true;
        setTimeout(() => {
          this.showError = false;
        }, SETTINGS.ERROR_FLASH_DURATION);
      }
    },

    cgPlace(event) {
      if (this.solved || !this.cur.cg) return;
      const { cols = 6, rows = 6 } = this.cur.cg;
      const VW = 420,
        VH = 410,
        PL = 40,
        PT = 20;
      const GW = 360,
        GH = 360;
      const rect = event.currentTarget.getBoundingClientRect();
      const svgX = ((event.clientX - rect.left) / rect.width) * VW;
      const svgY = ((event.clientY - rect.top) / rect.height) * VH;
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
          setTimeout(() => this.goTo(this.currentIndex + 1), SETTINGS.SUCCESS_ADVANCE_DELAY);
        }
      } else {
        this.showError = true;
        setTimeout(() => {
          this.showError = false;
        }, SETTINGS.ERROR_FLASH_DURATION);
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

    /* Function Machine — discover mode tap */
    fmTap(i) {
      if (this.solved) return;
      if (i === this.cur.machine.answer) {
        this.fmChoice = i;
        this._markSolvedAndAdvance();
      } else {
        this.fmChoice = i;
        setTimeout(() => {
          this.fmChoice = null;
        }, 1200);
      }
    },

    /* Maze — tap a cell to extend or retract the path */
    mazeTap(r, c) {
      if (this.solved) return;
      const m = this.cur.maze;
      if (!m) return;
      this.mazeErrors = [];
      const path = this.mazePath;

      // If tapping the last cell in path, undo it (unless it's the start)
      if (path.length > 0) {
        const last = path[path.length - 1];
        if (last[0] === r && last[1] === c) {
          if (path.length > 1) this.mazePath = path.slice(0, -1);
          return;
        }
      }

      // If path is empty, must start at start cell
      if (path.length === 0) {
        if (r === m.start[0] && c === m.start[1]) {
          this.mazePath = [[r, c]];
        }
        return;
      }

      // Must be adjacent to last cell (no diagonals)
      const last = path[path.length - 1];
      const dr = Math.abs(r - last[0]),
        dc = Math.abs(c - last[1]);
      if (dr + dc !== 1) return;

      // Must not already be in path
      if (path.some((p) => p[0] === r && p[1] === c)) return;

      this.mazePath = [...path, [r, c]];
    },

    /* Venn — select an item from the bank */
    vennSelect(i) {
      if (this.solved) return;
      this.vennSelected = this.vennSelected === i ? null : i;
      this.vennErrors = [];
    },

    /* Venn — place selected item into a zone */
    vennPlaceZone(zone) {
      if (this.solved || this.vennSelected === null) return;
      const updated = { ...this.vennPlacements };
      updated[this.vennSelected] = zone;
      this.vennPlacements = updated;
      this.vennSelected = null;
      this.vennErrors = [];
    },

    /* Classify — select an item from the bank */
    classifySelect(i) {
      if (this.solved) return;
      this.classifySelected = this.classifySelected === i ? null : i;
      this.classifyErrors = [];
    },

    /* Classify — place selected item into a category */
    classifyPlaceItem(catId) {
      if (this.solved || this.classifySelected === null) return;
      const updated = { ...this.classifyPlacements };
      updated[this.classifySelected] = catId;
      this.classifyPlacements = updated;
      this.classifySelected = null;
      this.classifyErrors = [];
    },

    /* Classify — pick an already-placed item back to the bank */
    classifyPickBack(i) {
      if (this.solved) return;
      const updated = { ...this.classifyPlacements };
      delete updated[i];
      this.classifyPlacements = updated;
      this.classifySelected = i;
      this.classifyErrors = [];
    },

    check() {
      const _e = this.cur;
      if (this.solved) return;

      if (_e.type === 'function-machine' && _e.machine) {
        if (_e.machine.mode === 'compute') {
          if (!this.fmInput.trim()) {
            this._flashError();
            return;
          }
          if (normalizeAnswer(this.fmInput) === normalizeAnswer(String(_e.machine.answer))) {
            this._markSolvedAndAdvance();
          } else {
            this._flashError();
          }
        }
        // Discover mode is handled by fmTap() directly
        return;
      }

      if (_e.type === 'maze' && _e.maze) {
        const m = _e.maze;
        const path = this.mazePath;
        // Must reach the end cell
        const last = path.length > 0 ? path[path.length - 1] : null;
        if (!last || last[0] !== m.end[0] || last[1] !== m.end[1]) {
          this._flashError();
          return;
        }
        // All cells in path must satisfy the rule
        const ruleCheck = this._mazeRuleCheck(m.rule, m.ruleParam);
        const errors = path.filter(([r, c]) => !ruleCheck(m.grid[r][c]));
        if (errors.length === 0) {
          this.mazeErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.mazeErrors = errors;
          this._flashError(() => {
            this.mazeErrors = [];
          });
        }
        return;
      }

      if (_e.type === 'venn' && _e.venn) {
        const items = _e.venn.items;
        if (Object.keys(this.vennPlacements).length < items.length) {
          this._flashError();
          return;
        }
        const errors = items.map((it, i) => (this.vennPlacements[i] !== it.zone ? i : -1)).filter((i) => i !== -1);
        if (errors.length === 0) {
          this.vennErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.vennErrors = errors;
          // Move wrong items back to bank
          const updated = { ...this.vennPlacements };
          errors.forEach((i) => {
            delete updated[i];
          });
          this.vennPlacements = updated;
          this._flashError(() => {
            this.vennErrors = [];
          });
        }
        return;
      }

      if (_e.type === 'classify' && _e.categories && _e.items) {
        const items = _e.items;
        if (Object.keys(this.classifyPlacements).length < items.length) {
          this._flashError();
          return;
        }
        const errors = items.map((it, i) => (this.classifyPlacements[i] !== it.cat ? i : -1)).filter((i) => i !== -1);
        if (errors.length === 0) {
          this.classifyErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.classifyErrors = errors;
          const updated = { ...this.classifyPlacements };
          errors.forEach((i) => { delete updated[i]; });
          this.classifyPlacements = updated;
          this._flashError(() => { this.classifyErrors = []; });
        }
        return;
      }

      if (_e.type === 'bar-chart' && _e.bc && _e.bc.mode === 'build') {
        const errors = _e.bc.values.map((v, i) => (this.bcValues[i] !== v ? i : -1)).filter((i) => i >= 0);
        if (errors.length === 0) {
          this._markSolvedAndAdvance();
        } else {
          this.bcErrors = errors;
          this._flashError(() => {
            this.bcErrors = [];
          });
        }
        return;
      }

      if (_e.type === 'drag-sort') {
        if (this._dragErrTimer) {
          clearTimeout(this._dragErrTimer);
          this._dragErrTimer = null;
        }
        // Derive correct permutation from tile values + direction
        const tiles = _e.tiles || [];
        const correctOrder = tiles
          .map((v, i) => ({ v: parseFloat(String(v).replace(',', '.')), i }))
          .sort((a, b) => (_e.direction === 'desc' ? b.v - a.v : a.v - b.v))
          .map((x) => x.i);
        const errors = this.dragTilesOrder
          .map((origIdx, pos) => (Number(origIdx) !== correctOrder[pos] ? pos : -1))
          .filter((p) => p >= 0);
        if (errors.length === 0) {
          this.dragSelected = null;
          this._markSolvedAndAdvance();
        } else {
          this.dragErrors = errors;
          this._flashError(() => {
            this.dragErrors = [];
          });
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
          this._flashError(() => {
            this.clickBlockErrors = [];
          });
        }
        return;
      }

      if (_e.type === 'fill-table') {
        if (this.tableInputs.some((v) => !v.trim())) {
          this._flashError();
          return;
        }
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
          this._flashError(() => {
            this.tableErrors = [];
          });
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
          this._flashError(() => {
            this.tileErrors = [];
          });
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
          this._flashError(() => {
            this.svgErrors = [];
          });
        }
        return;
      }

      if (_e.type === 'futoshiki' && _e.futoshiki) {
        const { size, rows } = _e.futoshiki;
        const vals = this.futoInputs.map((v) => parseInt(v, 10));
        if (vals.some((v) => isNaN(v) || v < 1 || v > size)) {
          this._flashError();
          return;
        }
        const errors = new Set();
        // Check each row: no repeats
        for (let r = 0; r < size; r++) {
          const seen = new Map();
          for (let c = 0; c < size; c++) {
            const v = vals[r * size + c];
            if (seen.has(v)) {
              errors.add(r * size + c);
              errors.add(seen.get(v));
            } else seen.set(v, r * size + c);
          }
        }
        // Check each column: no repeats
        for (let c = 0; c < size; c++) {
          const seen = new Map();
          for (let r = 0; r < size; r++) {
            const v = vals[r * size + c];
            if (seen.has(v)) {
              errors.add(r * size + c);
              errors.add(seen.get(v));
            } else seen.set(v, r * size + c);
          }
        }
        // Check inequality constraints
        for (let r = 0; r < size; r++) {
          const row = rows[r];
          for (let c = 0; c < (row.hCons || []).length; c++) {
            const sign = row.hCons[c];
            if (!sign) continue;
            const v1 = vals[r * size + c],
              v2 = vals[r * size + c + 1];
            if (sign === '<' ? v1 >= v2 : v1 <= v2) {
              errors.add(r * size + c);
              errors.add(r * size + c + 1);
            }
          }
          for (let c = 0; c < (row.vCons || []).length; c++) {
            const sign = row.vCons[c];
            if (!sign) continue;
            const v1 = vals[r * size + c],
              v2 = vals[(r + 1) * size + c];
            if (sign === '<' ? v1 >= v2 : v1 <= v2) {
              errors.add(r * size + c);
              errors.add((r + 1) * size + c);
            }
          }
        }
        if (errors.size === 0) {
          this.futoErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.futoErrors = [...errors];
          this._flashError(() => {
            this.futoErrors = [];
          });
        }
        return;
      }

      if (_e.type === 'kenken' && _e.kenken) {
        const { size, cages } = _e.kenken;
        const vals = this.kkInputs.map((v) => parseInt(v, 10));
        if (vals.some((v) => isNaN(v) || v < 1 || v > size)) {
          this._flashError();
          return;
        }
        const errors = new Set();
        // Check rows
        for (let r = 0; r < size; r++) {
          const seen = new Map();
          for (let c = 0; c < size; c++) {
            const v = vals[r * size + c];
            if (seen.has(v)) {
              errors.add(r * size + c);
              errors.add(seen.get(v));
            } else seen.set(v, r * size + c);
          }
        }
        // Check columns
        for (let c = 0; c < size; c++) {
          const seen = new Map();
          for (let r = 0; r < size; r++) {
            const v = vals[r * size + c];
            if (seen.has(v)) {
              errors.add(r * size + c);
              errors.add(seen.get(v));
            } else seen.set(v, r * size + c);
          }
        }
        // Check cage arithmetic
        for (const cage of cages || []) {
          const cageVals = cage.cells.map(([r, c]) => vals[r * size + c]);
          let ok = false;
          if (cage.op === '') {
            ok = cageVals[0] === cage.target;
          } else if (cage.op === '+') {
            ok = cageVals.reduce((s, v) => s + v, 0) === cage.target;
          } else if (cage.op === '×') {
            ok = cageVals.reduce((p, v) => p * v, 1) === cage.target;
          } else if (cage.op === '-') {
            ok = Math.abs(cageVals[0] - cageVals[1]) === cage.target;
          } else if (cage.op === '÷') {
            const mx = Math.max(...cageVals),
              mn = Math.min(...cageVals);
            ok = mn > 0 && mx / mn === cage.target;
          }
          if (!ok) cage.cells.forEach(([r, c]) => errors.add(r * size + c));
        }
        if (errors.size === 0) {
          this.kkErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.kkErrors = [...errors];
          this._flashError(() => {
            this.kkErrors = [];
          });
        }
        return;
      }

      if (_e.type === 'numberlink' && _e.numberlink) {
        const { size, pairs } = _e.numberlink;
        const errors = [];
        const covered = new Set();
        // Check each pair path
        for (let pi = 0; pi < pairs.length; pi++) {
          const path = this.nlkPaths[pi + 1] || [];
          const [ep1, ep2] = pairs[pi];
          if (path.length < 2) {
            errors.push(...(path.length ? path : [ep1, ep2]));
            continue;
          }
          const start = path[0],
            end = path[path.length - 1];
          const connectsOk =
            (start[0] === ep1[0] && start[1] === ep1[1] && end[0] === ep2[0] && end[1] === ep2[1]) ||
            (start[0] === ep2[0] && start[1] === ep2[1] && end[0] === ep1[0] && end[1] === ep1[1]);
          // Check continuity
          let contOk = true;
          for (let i = 1; i < path.length; i++) {
            const dr = Math.abs(path[i][0] - path[i - 1][0]),
              dc = Math.abs(path[i][1] - path[i - 1][1]);
            if (dr + dc !== 1) {
              contOk = false;
              break;
            }
          }
          if (!connectsOk || !contOk) path.forEach(([r, c]) => errors.push([r, c]));
          else path.forEach(([r, c]) => covered.add(`${r},${c}`));
        }
        // Check all cells covered
        const totalCells = size * size;
        const allCovered = covered.size === totalCells;
        if (errors.length === 0 && allCovered) {
          this.nlkErrors = [];
          this._markSolvedAndAdvance();
        } else {
          if (!allCovered && errors.length === 0) this._flashError();
          else {
            this.nlkErrors = errors;
            this._flashError(() => {
              this.nlkErrors = [];
            });
          }
        }
        return;
      }

      if (_e.type === 'magic-color') {
        const cells = _e.magicColor?.cells || [];
        const wrong = cells.map((c, i) => (this.mcColors[i] !== c.colorIdx ? i : -1)).filter((i) => i !== -1);
        if (wrong.length === 0) {
          this.mcErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.mcErrors = wrong;
          this._flashError(() => {
            this.mcErrors = [];
          });
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
          this._flashError(() => {
            this.checkErrors = [];
          });
        }
        return;
      }

      if (_e.type === 'select') {
        const stmts = _e.selectStatements || [];
        if (this.selectAnswers.some((v) => !v)) {
          this._flashError();
          return;
        }
        const errors = stmts
          .map((s, i) => (normalizeAnswer(this.selectAnswers[i]) !== normalizeAnswer(s.answer) ? i : -1))
          .filter((i) => i !== -1);
        if (errors.length === 0) {
          this.selectErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.selectErrors = errors;
          this._flashError(() => {
            this.selectErrors = [];
          });
        }
        return;
      }

      if (_e.type === 'sort') {
        const userOrder = this.sortPicked.map((i) => this.sortShuffled[i]);
        const toNum = (s) => parseFloat(String(s).replace(/\s/g, '').replace(',', '.'));
        const correctOrder = [...(_e.items || [])].sort((a, b) =>
          _e.direction === 'desc' ? toNum(b) - toNum(a) : toNum(a) - toNum(b)
        );
        const wrong = userOrder.map((v, i) => (v !== correctOrder[i] ? i : -1)).filter((i) => i !== -1);
        if (wrong.length === 0) {
          this.sortErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.sortErrors = wrong;
          this._flashError(() => {
            this.sortErrors = [];
            this.sortPicked = [];
          });
        }
        return;
      }

      if (_e.type === 'fraction-check') {
        if (!this.rfInputs[0].trim() || !this.rfInputs[1].trim()) {
          this._flashError();
          return;
        }
        const isCorrect = (_e.answers || []).some((a) => {
          const p = a.split('/');
          return (
            normalizeAnswer(this.rfInputs[0]) === normalizeAnswer(p[0]) &&
            normalizeAnswer(this.rfInputs[1]) === normalizeAnswer(p[1])
          );
        });
        if (isCorrect) this._markSolvedAndAdvance();
        else this._flashError();
        return;
      }

      if (_e.type === 'coordinate-grid' && _e.cg && _e.cg.mode !== 'place') {
        const xi = this.cgInputs[0].trim();
        const yi = this.cgInputs[1].trim();
        if (!xi || !yi) {
          this._flashError();
          return;
        }
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
        if (this.matchConnections.length < p.left.length) {
          this._flashError();
          return;
        }
        const errs = this.matchConnections.filter((c) => p.answers[c.left] !== c.right);
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
        const nc = g.columns.length,
          nr = g.rows.length;
        const checks = this.gridCells
          .map((v, i) => (v === 2 ? { r: Math.floor(i / nc), c: i % nc, idx: i } : null))
          .filter(Boolean);
        if (checks.length < nr) {
          this._flashError();
          return;
        }
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

      if (_e.type === 'tri-arith') {
        const t = _e.triangle;
        if (!t) return;
        // vals[0..2] = vertices [A,B,C], vals[3..5] = edges [f,d,e]
        const vals = [...t.vertices, ...t.edges];
        const given = [...t.givenV, ...t.givenE];
        const wrong = [];
        let allFilled = true;
        vals.forEach((v, i) => {
          if (!given[i]) {
            if (!this.triInputs[i]?.trim()) allFilled = false;
            else if (normalizeAnswer(this.triInputs[i]) !== normalizeAnswer(String(v))) wrong.push(i);
          }
        });
        if (!allFilled) {
          this._flashError();
          return;
        }
        if (wrong.length === 0) {
          this.triErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.triErrors = wrong;
          this._flashError(() => {
            this.triErrors = [];
          });
        }
        return;
      }

      if (_e.type === 'pyramid') {
        const p = _e.pyramid;
        if (!p) return;
        const wrong = [];
        let allFilled = true;
        p.rows.forEach((row, r) =>
          row.forEach((val, c) => {
            if (!p.given[r][c]) {
              const fi = this.pyramidFlatIdx(r, c);
              const input = this.pyramidInputs[fi]?.trim();
              if (!input) allFilled = false;
              else if (normalizeAnswer(input) !== normalizeAnswer(String(val))) wrong.push(fi);
            }
          })
        );
        if (!allFilled) {
          this._flashError();
          return;
        }
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
        if (this.tfInputs.some((v) => v === null)) {
          this._flashError();
          return;
        }
        const wrong = (_e.statements || [])
          .map((s, i) => (this.tfInputs[i] !== s.answer ? i : -1))
          .filter((i) => i !== -1);
        if (wrong.length === 0) {
          this.tfErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.tfErrors = wrong;
          this._flashError();
        }
        return;
      }

      if (_e.type === 'compare' || _e.type === 'compare-expressions') {
        if (this.cmpInputs.some((v) => v === null)) {
          this._flashError();
          return;
        }
        const wrong = (_e.comparisons || [])
          .map((c, i) => (this.cmpInputs[i] !== c.answer ? i : -1))
          .filter((i) => i !== -1);
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
        if (this.seqInputs.some((v) => !v.trim())) {
          this._flashError();
          return;
        }
        const _answers = s.items ? s.items.filter((it) => it.blank).map((it) => it.answer) : s.answers;
        const wrong = _answers
          .map((a, i) => (normalizeAnswer(this.seqInputs[i]) !== normalizeAnswer(a) ? i : -1))
          .filter((i) => i !== -1);
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
        if (this.ccInputs.some((v) => !v?.trim())) {
          this._flashError();
          return;
        }
        const errors = steps
          .map((step, i) => (normalizeAnswer(this.ccInputs[i]) !== normalizeAnswer(step.answer) ? i : -1))
          .filter((i) => i >= 0);
        if (errors.length === 0) {
          this.ccErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.ccErrors = errors;
          this._flashError(() => {
            this.ccErrors = [];
          });
        }
        return;
      }

      if (_e.type === 'decimal-triple') {
        const KEYS = ['dizaines', 'unites', 'dixiemes', 'centiemes', 'milliemes'];
        const dtp = _e.dtPlaces || [null, null, null, null, null];
        const errors = [];
        if (_e.dtGiven !== 'fraction') {
          if (!this.dtInputs.fracNum?.trim() || !this.dtInputs.fracDen?.trim()) {
            this._flashError();
            return;
          }
          if (normalizeAnswer(this.dtInputs.fracNum) !== normalizeAnswer(String(_e.dtFrac.num))) errors.push('fracNum');
          if (normalizeAnswer(this.dtInputs.fracDen) !== normalizeAnswer(String(_e.dtFrac.den))) errors.push('fracDen');
        }
        if (_e.dtGiven !== 'decimal') {
          if (!this.dtInputs.decimal?.trim()) {
            this._flashError();
            return;
          }
          if (normalizeAnswer(this.dtInputs.decimal) !== normalizeAnswer(_e.dtDecimal)) errors.push('decimal');
        }
        if (_e.dtGiven !== 'places') {
          const active = KEYS.filter((_, i) => dtp[i] !== null);
          if (active.some((k) => !this.dtInputs[k]?.trim())) {
            this._flashError();
            return;
          }
          KEYS.forEach((key, i) => {
            if (dtp[i] !== null && normalizeAnswer(this.dtInputs[key]) !== normalizeAnswer(String(dtp[i])))
              errors.push(key);
          });
        }
        if (errors.length === 0) {
          this.dtErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.dtErrors = errors;
          this._flashError(() => {
            this.dtErrors = [];
          });
        }
        return;
      }

      if (_e.type === 'decomp') {
        if (this.decompInputs.some((v) => !v.trim())) {
          this._flashError();
          return;
        }
        const parts = (_e.decomp?.parts || []).filter((p) => !p.comma);
        const errors = parts
          .map((p, i) => (normalizeAnswer(this.decompInputs[i]) !== normalizeAnswer(String(p.answer)) ? i : -1))
          .filter((i) => i !== -1);
        if (errors.length === 0) {
          this.decompErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.decompErrors = errors;
          this._flashError(() => {
            this.decompErrors = [];
          });
        }
        return;
      }

      if (this.trouInputs.length > 0) {
        if (this.trouInputs.some((v) => !v.trim())) {
          this._flashError();
          return;
        }
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

      if (_e.type === 'compare-solutions') {
        if (this.csSelected === null) {
          this._flashError();
          return;
        }
        if (this.csSelected === _e.correctSolution) {
          this._markSolvedAndAdvance();
        } else {
          this._flashError(() => {
            this.csSelected = null;
          });
        }
        return;
      }

      if (_e.type === 'error-analysis') {
        if (!_e.guided && this.eaStepSelected === null) {
          this._flashError();
          return;
        }
        if (!this.eaCorrection.trim()) {
          this._flashError();
          return;
        }
        const stepOk = _e.guided || this.eaStepSelected === _e.wrongStep;
        const corrRaw = normalizeAnswer(this.eaCorrection).replace(/^=+/, '');
        const corrOk = corrRaw === normalizeAnswer(String(_e.correction));
        this.eaStepError = !stepOk;
        this.eaCorrectionError = !corrOk;
        if (stepOk && corrOk) {
          this.eaStepError = false;
          this.eaCorrectionError = false;
          this._markSolvedAndAdvance();
        } else {
          this._flashError(() => {
            if (!stepOk) {
              this.eaStepError = false;
              this.eaStepSelected = null;
            }
            this.eaCorrectionError = false;
          });
        }
        return;
      }

      if (_e.type === 'estimation') {
        if (!this.estInput.trim() || !this.userInput.trim()) {
          this._flashError();
          return;
        }
        const estOk = (_e.estAnswers || []).some((a) => normalizeAnswer(a) === normalizeAnswer(this.estInput));
        const exactOk = (_e.answers || []).some((a) => normalizeAnswer(a) === normalizeAnswer(this.userInput));
        this.estError = !estOk;
        this.exactError = !exactOk;
        if (estOk && exactOk) {
          this.estError = false;
          this.exactError = false;
          this._markSolvedAndAdvance();
        } else {
          this._flashError();
        }
        return;
      }

      if (_e.type === 'fact-family') {
        if (this.ffInputs.some((v) => !v.trim())) {
          this._flashError();
          return;
        }
        const wrong = (_e.ffEquations || [])
          .map((eq, i) => (normalizeAnswer(this.ffInputs[i]) !== normalizeAnswer(eq.answer) ? i : -1))
          .filter((i) => i !== -1);
        if (wrong.length === 0) {
          this.ffErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.ffErrors = wrong;
          this._flashError(() => {
            wrong.forEach((i) => {
              this.ffInputs[i] = '';
            });
            this.ffErrors = [];
          });
        }
        return;
      }

      if (_e.type === 'think-board') {
        if (!this.userInput.trim()) {
          this._flashError();
          return;
        }
        const symbolOk = (_e.answers || []).some((a) => normalizeAnswer(a) === normalizeAnswer(this.userInput));
        // Check story keyword if tbStoryKeyword is set
        const storyOk = !_e.tbStoryKeyword || this.tbStory.toLowerCase().includes(_e.tbStoryKeyword.toLowerCase());
        this.tbStoryError = !storyOk;
        if (symbolOk && storyOk) {
          this.tbStoryError = false;
          this._markSolvedAndAdvance();
        } else {
          this._flashError(() => {
            this.tbStoryError = false;
          });
        }
        return;
      }

      if (!this.userInput.trim()) return;
      const u = normalizeAnswer(this.userInput);
      if ((_e.answers || []).some((a) => normalizeAnswer(a) === u)) this._markSolvedAndAdvance();
      else this._flashError();
    },

    _mazeRuleCheck(rule, param) {
      switch (rule) {
        case 'mult':
          return (n) => n % (param || 3) === 0;
        case 'even':
          return (n) => n % 2 === 0;
        case 'odd':
          return (n) => n % 2 !== 0;
        case 'digitSum':
          return (n) =>
            String(n)
              .split('')
              .reduce((s, d) => s + Number(d), 0) === (param || 10);
        case 'divisor':
          return (n) => (param || 24) % n === 0;
        case 'lt':
          return (n) => n < (param || 50);
        case 'gt':
          return (n) => n > (param || 50);
        default:
          return () => true;
      }
    },

    /* KenKen helpers */
    kkSetCell(r, c, val) {
      const updated = [...this.kkInputs];
      updated[r * this.cur.kenken.size + c] = val;
      this.kkInputs = updated;
      this.kkErrors = [];
    },

    /* Numberlink helpers */
    nlkTap(r, c) {
      if (this.solved) return;
      const nl = this.cur.numberlink;
      if (!nl) return;
      this.nlkErrors = [];
      const cellNum = nl.rows[r][c]; // > 0 if endpoint, 0 if empty

      if (this.nlkActive === null) {
        // Start: must tap an endpoint
        if (cellNum <= 0) return;
        const updated = { ...this.nlkPaths };
        updated[cellNum] = [[r, c]];
        this.nlkPaths = updated;
        this.nlkActive = cellNum;
        return;
      }

      // Currently drawing pairNum = nlkActive
      const pairNum = this.nlkActive;
      const path = this.nlkPaths[pairNum] || [];
      const last = path[path.length - 1];

      // Tapping the last cell: undo
      if (last && last[0] === r && last[1] === c) {
        if (path.length > 1) {
          const updated = { ...this.nlkPaths };
          updated[pairNum] = path.slice(0, -1);
          this.nlkPaths = updated;
        } else {
          this.nlkActive = null;
        }
        return;
      }

      // Must be adjacent
      const dr = Math.abs(r - last[0]),
        dc = Math.abs(c - last[1]);
      if (dr + dc !== 1) return;

      // Must not be already in any path (except the other endpoint of this pair)
      const pairs = nl.pairs;
      const [ep1, ep2] = pairs[pairNum - 1];
      const isOtherEndpoint = (r === ep1[0] && c === ep1[1]) || (r === ep2[0] && c === ep2[1]);
      if (!isOtherEndpoint) {
        for (const p of Object.values(this.nlkPaths)) {
          if (p.some(([pr, pc]) => pr === r && pc === c)) return; // occupied
        }
      }

      const updated = { ...this.nlkPaths };
      updated[pairNum] = [...path, [r, c]];
      this.nlkPaths = updated;

      // Reached the other endpoint → complete this pair, stop drawing
      if (isOtherEndpoint && cellNum === pairNum) {
        this.nlkActive = null;
      }
    },

    nlkReset() {
      this.nlkPaths = {};
      this.nlkActive = null;
      this.nlkErrors = [];
    },

    nlkAllConnected() {
      const nl = this.cur.numberlink;
      if (!nl) return false;
      return nl.pairs.every((pair, pi) => {
        const path = this.nlkPaths[pi + 1] || [];
        if (path.length < 2) return false;
        const [ep1, ep2] = pair;
        const start = path[0],
          end = path[path.length - 1];
        return (
          (start[0] === ep1[0] && start[1] === ep1[1] && end[0] === ep2[0] && end[1] === ep2[1]) ||
          (start[0] === ep2[0] && start[1] === ep2[1] && end[0] === ep1[0] && end[1] === ep1[1])
        );
      });
    },

    nlkCellClass(r, c, cellNum) {
      const nl = this.cur.numberlink;
      if (!nl) return '';
      const active = this.nlkActive;
      // Find which pair owns this cell
      let owner = null;
      for (const [pNum, path] of Object.entries(this.nlkPaths)) {
        if (path.some(([pr, pc]) => pr === r && pc === c)) {
          owner = Number(pNum);
          break;
        }
      }
      const isError = this.nlkErrors.some(([er, ec]) => er === r && ec === c);
      const isEndpoint = cellNum > 0;
      if (this.solved && owner) return 'border-green-500 ring-2 ring-green-300';
      if (isError) return 'border-red-400 bg-red-50 dark:bg-red-900/20 animate-shake';
      if (owner && isEndpoint) return 'border-white dark:border-slate-200 ring-2 ring-white/50 shadow-lg';
      if (owner) return 'border-transparent opacity-80';
      if (active && cellNum === active) return 'border-white ring-2 ring-white/80';
      return 'border-slate-200 dark:border-slate-700 bg-surface-subtle text-content-default hover:border-slate-300 dark:hover:border-slate-500';
    },

    nlkCellStyle(r, c) {
      let owner = null;
      for (const [k, path] of Object.entries(this.nlkPaths)) {
        if (path.some(([pr, pc]) => pr === r && pc === c)) {
          owner = Number(k);
          break;
        }
      }
      if (owner) return `background: ${this.nlkColors[owner] || '#888'}; color: white`;
      return '';
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
      const er = el.getBoundingClientRect(),
        cr = container.getBoundingClientRect();
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
    gridCellVal(r, c) {
      return this.gridCells[r * (this.cur.grid?.columns.length || 0) + c] || 0;
    },
    gridIsError(r, c) {
      return this.gridErrors.includes(r * (this.cur.grid?.columns.length || 0) + c);
    },
    _initPyramid(p) {
      this.pyramidInputs = p.rows.flatMap((row, r) => row.map((v, c) => (p.given[r][c] ? String(v) : '')));
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
        this._markSolvedAndAdvance();
      } else {
        this.cmpGroupWrong = i;
        setTimeout(() => {
          this.cmpGroupWrong = null;
        }, SETTINGS.MCQ_WRONG_DELAY);
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
        setTimeout(() => {
          this.mcqWrong = null;
        }, SETTINGS.SUCCESS_ADVANCE_DELAY);
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
        }, SETTINGS.ERROR_FLASH_DURATION);
      }
    },

    barChartSetValue(colIdx, val) {
      if (this.solved) return;
      this.bcValues[colIdx] = this.bcValues[colIdx] === val ? 0 : val;
      this.bcErrors = this.bcErrors.filter((e) => e !== colIdx);
    },

    bcCheck(i) {
      if (!this.cur.bc?.questions || this.bcSolved[i]) return;
      const q = this.cur.bc.questions[i];
      if (normalizeAnswer(this.bcInputs[i]) === normalizeAnswer(q.answer)) {
        this.bcSolved[i] = true;
        this.bcErrors = this.bcErrors.filter((e) => e !== i);
        if (this.bcSolved.every(Boolean)) this._markSolvedAndAdvance();
      } else {
        if (!this.bcErrors.includes(i)) this.bcErrors = [...this.bcErrors, i];
        setTimeout(() => {
          this.bcErrors = this.bcErrors.filter((e) => e !== i);
        }, SETTINGS.ERROR_FLASH_DURATION);
      }
    },

    updateMatchLines() {
      this._matchLinesSvg = this.matchConnections
        .map((c) => {
          const from = this.matchGetCoords('left', c.left),
            to = this.matchGetCoords('right', c.right);
          if (!from || !to) return '';
          const color = this.matchErrors.some((e) => e.left === c.left)
            ? '#ef4444'
            : this.solved
              ? '#22c55e'
              : 'var(--p)';
          return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
        })
        .join('');
    },

    sortTap(idx) {
      if (!this.solved && !this.sortPicked.includes(idx)) this.sortPicked.push(idx);
    },
    sortUnpick(rank) {
      if (!this.solved) this.sortPicked = this.sortPicked.slice(0, rank);
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
      return (this.cur.colOp?.result || []).slice(0, i).filter((d) => d === '?').length;
    },

    goTo(idx) {
      this.currentIndex = idx;
      window.location.hash = '#' + (idx + 1);
    },

    syncFromHash() {
      const h = parseInt(window.location.hash.replace('#', ''), 10);
      if (h >= 1 && h <= this.exercises.length) this.currentIndex = h - 1;
    },

    /* ── Guided problem ──────────────────────────────────────────────────── */

    get gpCurrentStep() {
      return this.cur.gpSteps?.[this.gpStep] ?? null;
    },

    // Token tap (keywords / numbers steps): no feedback on wrong tap
    gpTapToken(event) {
      if (this.solved) return;
      const step = this.gpCurrentStep;
      if (!step || !['keywords', 'numbers'].includes(step.kind)) return;
      const token = event.target.closest('[data-gp]')?.dataset?.gp;
      if (!token || !step.tokens?.includes(token)) return;
      if (this.gpPicked.includes(token)) return;
      this.gpPicked = [...this.gpPicked, token];
      // Visual: mark the span immediately in the DOM
      const cls = step.kind === 'keywords' ? 'gp-kw' : 'gp-num';
      event.target.closest('[data-gp]')?.classList.add(cls);
      if (this.gpPicked.length === step.tokens.length) {
        setTimeout(() => this.gpAdvance(), SETTINGS.GP_AUTO_ADVANCE_DELAY);
      }
    },

    // Choice tap (operation / question-type steps)
    gpPickChoice(choice) {
      if (this.solved) return;
      const step = this.gpCurrentStep;
      if (!step || !step.answers?.length) return;
      this.gpChoice = choice;
      if (normalizeAnswer(choice) === normalizeAnswer(step.answers[0])) {
        setTimeout(() => this.gpAdvance(), SETTINGS.GP_AUTO_ADVANCE_DELAY);
      }
    },

    // Input check (convert / calculate steps)
    gpCheckInput() {
      if (this.solved) return;
      const step = this.gpCurrentStep;
      if (!step || !step.answers?.length) return;
      const val = normalizeAnswer(this.gpInput);
      if (step.answers.some((a) => normalizeAnswer(a) === val)) {
        this.gpAdvance();
      } else {
        this._flashError();
      }
    },

    gpAdvance() {
      this.gpChoice = null;
      this.gpPicked = [];
      this.gpInput = '';
      const nextStep = this.gpStep + 1;
      if (nextStep >= (this.cur.gpSteps?.length ?? 0)) {
        this._markSolvedAndAdvance();
      } else {
        this.gpStep = nextStep;
        // Activate token spans in the DOM for the next tap step
        this._gpActivateTokens();
      }
    },

    // Mark spans for the current tap step as active (drives CSS cursor/underline)
    _gpActivateTokens() {
      const step = this.gpCurrentStep;
      const storyEl = this.$el?.querySelector?.('.gp-story');
      if (!storyEl) return;
      // Remove previous active state
      storyEl.removeAttribute('data-gp-active');
      if (step && ['keywords', 'numbers'].includes(step.kind)) {
        storyEl.setAttribute('data-gp-active', step.kind);
      }
    },

    // ── Think Board ──────────────────────────────────────────────────────────

    // Dot groups for the manipulation quadrant, derived from tbExpression
    // Supports: a × b, a + b, a - b, a ÷ b
    get tbDotGroups() {
      const expr = this.cur.tbExpression || '';
      const mul = expr.match(/^(\d+)\s*[×x*]\s*(\d+)$/);
      if (mul) {
        const groups = parseInt(mul[1], 10);
        const size = parseInt(mul[2], 10);
        if (groups > 0 && size > 0 && groups * size <= 100) return Array(groups).fill(size);
      }
      const div = expr.match(/^(\d+)\s*[÷/]\s*(\d+)$/);
      if (div) {
        const total = parseInt(div[1], 10);
        const parts = parseInt(div[2], 10);
        if (parts > 0 && total > 0 && total <= 100) {
          const sz = Math.floor(total / parts);
          return Array(parts).fill(sz);
        }
      }
      const add = expr.match(/^(\d+)\s*\+\s*(\d+)$/);
      if (add) {
        const a = parseInt(add[1], 10),
          b = parseInt(add[2], 10);
        if (a + b <= 50) return [a, b];
      }
      const sub = expr.match(/^(\d+)\s*[−-]\s*(\d+)$/);
      if (sub) {
        const a = parseInt(sub[1], 10),
          b = parseInt(sub[2], 10);
        if (a <= 30) return [b, a - b]; // whole then remainder
      }
      return [];
    },

    _tbInitCanvas() {
      const canvas = this.$refs.tbCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },

    tbDrawStart(e) {
      if (this.solved) return;
      this._tbDrawing = true;
      const canvas = this.$refs.tbCanvas;
      if (!canvas) return;
      canvas.setPointerCapture(e.pointerId);
      const { x, y } = this._tbPos(e, canvas);
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = document.documentElement.classList.contains('dark') ? '#93c5fd' : '#2563eb';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    },

    tbDrawMove(e) {
      if (!this._tbDrawing || this.solved) return;
      const canvas = this.$refs.tbCanvas;
      if (!canvas) return;
      const { x, y } = this._tbPos(e, canvas);
      const ctx = canvas.getContext('2d');
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    },

    tbDrawEnd() {
      this._tbDrawing = false;
    },

    tbClearCanvas() {
      const canvas = this.$refs.tbCanvas;
      if (!canvas) return;
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    },

    _tbPos(e, canvas) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
  };
}
