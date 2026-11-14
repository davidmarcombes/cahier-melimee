import { localStore } from './store.js';
import { renderOpShorthands, normalizeAnswer, groupDigits } from './utils.js';
import { SETTINGS } from './constants.js';
import { applyVoiceRate, voiceRate } from './voice-speed.js';

/* Tangram: a piece's corners flipped (f), turned r quarter turns clockwise, moved to their box at (0, 0);
   the quarter-triangles ('x,y,q') a piece covers at [x, y, r, f] — each unit square is cut by its two
   diagonals into 4 (as scripts/lib/tangram.js) */
function tgOrient(pts, r, f) {
  let p = pts.map(([x, y]) => [f ? -x : x, y]);
  for (let k = 0; k < r % 4; k++) p = p.map(([x, y]) => [-y, x]);
  const [mx, my] = [Math.min(...p.map((q) => q[0])), Math.min(...p.map((q) => q[1]))];
  return p.map(([x, y]) => [x - mx, y - my]);
}
const TG_CENTRES = [
  [0.5, 1 / 6],
  [5 / 6, 0.5],
  [0.5, 5 / 6],
  [1 / 6, 0.5],
];
function tgCells(pts, [x, y, r, f]) {
  const p = tgOrient(pts, r, f);
  const inside = (px, py) => {
    let c = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++)
      if (p[i][1] > py !== p[j][1] > py && px < ((p[j][0] - p[i][0]) * (py - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0])
        c = !c;
    return c;
  };
  const out = [];
  const [w, h] = [Math.max(...p.map((q) => q[0])), Math.max(...p.map((q) => q[1]))];
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++)
      TG_CENTRES.forEach(([cx, cy], q) => inside(i + cx, j + cy) && out.push(`${i + x},${j + y},${q}`));
  return out;
}

// Value of a sort / drag-sort item: "3 050", "4,5", "3/4", an HTML fraction. NaN for pictures, which keep
// their listed order (the comparator then returns NaN, treated as equal by the stable sort).
// Mirrored in tests/e2e/solve.spec.js and scripts/validate-llm.js.
export function sortValue(s) {
  // HTML fraction <span class="fn">3</span><span class="fd">4</span> → "3/4"
  const html = String(s).replace(/<span class="fn">([^<]*)<\/span><span class="fd">([^<]*)<\/span>/g, '$1/$2');
  const t = html
    .replace(/<[^>]*>/g, '')
    .replace(/\s/g, '')
    .replace(',', '.');
  const frac = t.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  return frac ? Number(frac[1]) / Number(frac[2]) : parseFloat(t);
}

// Fraction addition / subtraction (« 1/2 + 1/4 ») drawn as strips, pies or a number line (fractionOpSvg in
// svg.js). Different denominators: step 1 writes each fraction over the common one (lcm), step 2 the result.
// Fields: per converted fraction its numerator (+ denominator with askDen), then result numerator, denominator.
// Mirrored in tests/e2e/solve.spec.js (reads the fields from here).
const PARTS = { 2: 'demis', 3: 'tiers', 4: 'quarts', 5: 'cinquièmes', 6: 'sixièmes', 7: 'septièmes' };
Object.assign(PARTS, { 8: 'huitièmes', 9: 'neuvièmes', 10: 'dixièmes', 12: 'douzièmes', 14: 'quatorzièmes' });
Object.assign(PARTS, { 15: 'quinzièmes', 16: 'seizièmes', 18: 'dix-huitièmes', 20: 'vingtièmes' });
export function fractionOp({ a, b, op = '+', askDen = false }) {
  const gcd = (x, y) => (y ? gcd(y, x % y) : x);
  const terms = [a, b].map((f) => {
    const [n, d] = String(f).split('/').map(Number);
    return { n, d };
  });
  const D = (terms[0].d * terms[1].d) / gcd(terms[0].d, terms[1].d);
  const fields = [];
  for (const t of terms) {
    t.N = (t.n * D) / t.d;
    if (t.d === D) continue;
    t.field = fields.length;
    fields.push({ role: 'conv', answer: String(t.N) });
    if (askDen) fields.push({ role: 'convDen', answer: String(D) });
  }
  const sub = op === '-' || op === '−';
  const R = sub ? terms[0].N - terms[1].N : terms[0].N + terms[1].N;
  const resultFrom = fields.length;
  fields.push({ role: 'num', answer: String(R) }, { role: 'den', answer: String(D) });
  const changed = [...new Set(terms.filter((t) => t.d !== D).map((t) => t.d))];
  const parts = (d) => PARTS[d] || `parts de 1/${d}`;
  const hint = !changed.length
    ? ''
    : askDen
      ? 'Trouve un dénominateur commun aux deux fractions.'
      : `Coupe les ${changed.map(parts).join(' et les ')} en ${parts(D)}.`;
  return { terms, D, R, sub, sign: sub ? '−' : '+', fields, resultFrom, askDen, hint };
}

// Typed fraction [n, d] against an expected one: the same digits, or (equivalent) the same value (2/4 = 1/2)
function fracEqual([n, d], [en, ed], equivalent) {
  const [a, b, c, e] = [n, d, en, ed].map((x) => normalizeAnswer(x ?? ''));
  if (a === c && b === e) return true;
  if (!equivalent || ![a, b, c, e].every((x) => /^\d+$/.test(x)) || !Number(b)) return false;
  return Number(a) * Number(e) === Number(c) * Number(b);
}

// Wrong fields of a fraction-op (indices as in fractionOp().fields). The result may be any equivalent fraction
// (1/4 + 1/4 = 1/2); with askDen, any common denominator, the same on both rows. A numerator is judged only
// with its denominator: `pending` lists those waiting for an empty or wrong one.
export function fractionOpCheck(fo, inputs) {
  const v = fractionOp(fo);
  const val = (k) => {
    const s = normalizeAnswer(inputs[k] ?? '');
    return s === '' ? null : /^\d+$/.test(s) ? Number(s) : NaN;
  };
  const wrong = [],
    pending = [];
  const judge = (k, n, d, ok) => {
    if (n === null) return;
    if (Number.isNaN(n)) wrong.push(k);
    else if (!(d > 0)) pending.push(k);
    else if (!ok(n, d)) wrong.push(k);
  };
  let common = null;
  for (const t of v.terms) {
    if (t.field === undefined) continue;
    let d = v.D;
    if (v.askDen) {
      d = val(t.field + 1);
      const other = v.terms.find((u) => u !== t).d;
      if (d !== null && !(d > 0 && d % t.d === 0 && d % other === 0 && (common === null || d === common))) {
        wrong.push(t.field + 1);
        d = NaN;
      } else if (d !== null) common = d;
    }
    judge(t.field, val(t.field), d, (n, d) => n * t.d === t.n * d);
  }
  const k = v.resultFrom,
    d = val(k + 1);
  if (d !== null && !(d > 0)) wrong.push(k + 1);
  else if (d !== null && val(k) === null) pending.push(k + 1);
  judge(k, val(k), d, (n, d) => n * v.D === v.R * d);
  if (wrong.includes(k) && d > 0) wrong.push(k + 1); // a wrong value: the pair is wrong
  return { wrong, pending };
}

// Jump line (« compter en avançant ») on an open line: points are times « 8:45 » or amounts « 6,40 ».
// The pupil fills one field per jump, one per hidden point, then the total (time: h and min; money: €).
// Values in minutes / cents. Mirrored in tests/e2e/solve.spec.js (reads the fields from here).
export function jumpLine({ kind = 'temps', points = [], hide = [] }) {
  const time = kind === 'temps';
  const money = kind === 'monnaie';
  const vs = points.map((p) => {
    const s = String(p).trim();
    if (!time) return Math.round(Number(s.replace(',', '.')) * 100);
    const [h, m] = s.split(/\s*[:h]\s*/);
    return Number(h) * 60 + Number(m || 0);
  });
  // money in euros (6,40 · 7) and plain numbers (57 · 2,5) are both kept in hundredths
  const dec = (c) => (c % 100 ? (c / 100).toFixed(2).replace('.', ',') : String(c / 100));
  const num = (c) => dec(c).replace(/(,\d)0$/, '$1');
  const fmt = money ? dec : num;
  const clock = (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
  const labels = vs.map((v) =>
    time
      ? `${Math.floor(v / 60)} h${v % 60 ? ' ' + String(v % 60).padStart(2, '0') : ''}`
      : money
        ? `${dec(v)} €`
        : num(v).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f')
  );
  const fields = [];
  for (let i = 1; i < vs.length; i++)
    fields.push({ role: 'jump', at: i - 1, answer: time ? String(vs[i] - vs[i - 1]) : fmt(vs[i] - vs[i - 1]) });
  const pointField = {};
  for (const i of hide) {
    pointField[i] = fields.length;
    fields.push({ role: 'point', at: i, answer: time ? clock(vs[i]) : fmt(vs[i]) });
  }
  const total = vs[vs.length - 1] - vs[0];
  const totalFrom = fields.length;
  if (time)
    fields.push(
      { role: 'total', answer: String(Math.floor(total / 60)), unit: 'h' },
      { role: 'total', answer: String(total % 60), unit: 'min' }
    );
  else fields.push({ role: 'total', answer: fmt(total), unit: money ? '€' : '' });
  return { time, money, labels, fields, pointField, totalFrom, unit: time ? 'min' : money ? '€' : '' };
}

// Fewest coins and notes making `amount` (cents) from `coins` (greedy: right for euro denominations)
export function fewestPieces(amount, coins) {
  let left = amount,
    n = 0;
  for (const c of [...coins].sort((a, b) => b - a)) {
    n += Math.floor(left / c);
    left %= c;
  }
  return left ? Infinity : n;
}

let voiceAudio = null;
const VOICE_SEGMENT_PAUSE_MS = 180;
const VOICE_INSTRUCTION_PAUSE_MS = 500;

export function seriesPlayer(exercises, seriesId) {
  const player = {
    exercises,
    seriesId: seriesId || '',
    currentIndex: 0,
    _ready: false,
    kid: false, // maternelle (GS): instructions and feedback read aloud
    kidStarted: false, // maternelle: the 🔊 start screen was tapped
    voiceMissing: false, // a prerecorded clip could not be loaded
    countChoices: [], // count-objects (maternelle): number buttons instead of the input
    countWrong: null, // count-objects: wrong number just tapped
    countHidden: false, // count-objects with `flash`: picture hidden after a short look
    splatPeek: false, // count-objects with `peek` (Splat): the whole set shows before the splat
    _countTimer: null,
    _peekTimer: null,
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
    stripPlacements: [],
    stripSelected: null,
    stripErrors: [],
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
    nlHint: '',
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

    clkH: 12, // clock set: hour the pupil's hands show (1…12)
    clkM: 0, // clock set: minutes the pupil's hands show
    clkHand: 'm', // clock set: hand a tap on the face moves (h / m)

    jlInputs: [], // jump-line: jumps, hidden points, total (order of jlFields)
    jlErrors: [], // jump-line: indices of wrong fields
    foInputs: [], // fraction-op: conversions, then result numerator and denominator (order of fractionOp fields)
    foErrors: [], // fraction-op: indices of wrong fields

    mpPicked: [], // money-pay: coins / notes put down by the pupil, in cents
    mpHint: '', // money-pay: why the last payment was refused

    calcEntry: '', // broken-calc: number being typed
    calcAcc: null, // broken-calc: value before the pending operation
    calcOp: null, // broken-calc: pending operation
    calcResult: null, // broken-calc: what « = » gave
    calcTape: [], // broken-calc: the calculation typed, as tokens
    calcHint: '', // broken-calc: what the last « = » gave instead of the target

    cebTiles: [], // compte-est-bon: { v, used, made } — the numbers, then each step's result
    cebSel: null, // compte-est-bon: tile picked first
    cebOp: null, // compte-est-bon: operation picked
    cebSteps: [], // compte-est-bon: { a, op, b, r, i, j } in order
    cebHint: '', // compte-est-bon: why the last step was refused / what is missing

    tbAt: [], // target-blocks: per tile its centre [x, y] on the board (units), null in the tray
    tbSel: null, // target-blocks: tile picked by a tap (the next tap on the board puts it there)
    tbZ: [], // target-blocks: tiles drawing order, the one moved last on top
    _tbDrag: null, // target-blocks: { i, cx, cy, x0, y0, moved } while a tile is dragged
    tbHint: '', // target-blocks: why the last check failed

    dgOpen: [], // dice-game: per tile (1…n) true while open
    dgDice: [], // dice-game: the dice on the table ([] before a roll)
    dgPicked: [], // dice-game: tiles picked towards the dice total
    dgOver: false, // dice-game: the round is over (no move left, or every tile closed)
    dgBest: null, // dice-game: best score on this exercise (lowest)
    dgNope: 0, // dice-game: « je ne peux plus » refused this roll (the hint grows)
    dgHint: '', // dice-game: why the last action was refused
    bmChips: [], // bar-model build: [{ v, at }] — at: the box holding the chip, null in the tray
    bmPick: null, // bar-model build: chip picked, waiting for its box
    bmBuilt: false, // bar-model build: the model is right, the answer can be typed
    bmHint: '', // bar-model build: why the model is not right yet

    hbPick: null, // hundred-board (find): the number tapped
    hbColored: [], // hundred-board (color): the numbers coloured
    hbInputs: [], // hundred-board (fill): one per blank, in cur.hb.blanks order
    hbHint: '', // hundred-board: why the last check failed

    sgLeft: 0, // strategy-game: steps left (course: total − number said; allumettes: sticks left)
    sgLog: [], // strategy-game: { who: 'eleve' | 'ordi', m, left } in order
    sgTurn: null, // strategy-game: 'eleve' | 'ordi' | 'fin'
    sgWinner: null, // strategy-game: who won the game on screen
    sgLosses: 0, // strategy-game: games lost on this exercise (the hints grow with them)
    _sgTimer: null,
    _sgFast: false, // strategy-game: the computer answers at once (e2e solver)

    tgAt: [], // tangram: per piece [x, y, r, f] (x, y fractional while dragged)
    tgSel: null, // tangram: piece picked last (flip button, keyboard)
    tgZ: [], // tangram: drawing order, the piece picked last on top
    _tgDrag: null, // tangram: { k, cx, cy, x0, y0, moved } while a piece is dragged
    tgHint: '', // tangram: why the last check failed

    pxCells: [], // picross: per cell (row by row) 0 empty, 1 coloured, 2 crossed out
    pxMode: 1, // picross: what a tap puts (1 colour, 2 cross)
    _pxStroke: null, // picross: { from, was, value, axis } while the finger paints
    pxHint: '', // picross: why the last check failed

    tfCells: [], // ten-frame: per cell 0 empty, 1 token there at the start (red), 2 token put by the pupil
    tfHint: '', // ten-frame: why the last check failed

    memDeck: [], // memory: the cards, shuffled ({…card, pair})
    memOpen: [], // memory: deck indices turned up, not yet matched (0–2)
    memFound: [], // memory: deck indices of the pairs found
    memMiss: [], // memory: the two cards that do not go together, until they turn back
    memTries: 0, // memory: pairs of cards turned
    _memTimer: null,

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

    gbPick: null, // grid-board follow: tapped cell [r, c]
    gbProg: [], // grid-board write: instructions composed by the pupil
    gbTrail: [], // grid-board: cells walked by the last run, shown after « Vérifier »
    gbCrash: false, // grid-board: last run left the grid or hit a block
    gbWrong: null, // grid-board: wrong cell (follow) or instruction (debug) just tapped
    gbPaint: [], // grid-board mirror: cells coloured by the pupil
    gbSegs: [], // grid-board draw: segments [[r, c], [r, c]] drawn by the pupil
    gbPen: null, // grid-board draw: grid point the next segment starts from
    gbCursor: null, // grid-board draw: keyboard cursor

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
    groupDigits,

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
      // Estimate mode: the point carries the asked number (its own value would give the answer away);
      // once solved, a green tick shows the exact spot
      if (this.cur.nl.mode === 'estimate') {
        const ax = PAD + (sortValue(this.cur.answers?.[0]) - min) * (W / range);
        return (
          (this.solved
            ? `<line x1="${ax}" y1="${LY - 12}" x2="${ax}" y2="${LY + 8}" stroke="#16a34a" stroke-width="3"/>`
            : '') +
          `<circle cx="${mx}" cy="${LY}" r="6" class="fill-primary-500"/>` +
          `<line x1="${mx}" y1="${LY - 6}" x2="${mx}" y2="${LY - 15}" stroke-width="2" class="stroke-primary-500"/>` +
          `<text x="${mx}" y="${LY - 19}" text-anchor="middle" font-size="13" font-weight="700" class="fill-primary-600 dark:fill-primary-400">${String(this.cur.answers?.[0])}</text>`
        );
      }
      const { step = 1, subdivisions = 0 } = this.cur.nl;
      const den = subdivisions > 0 && step === 1 ? subdivisions : 0;
      const lbl =
        den && String(this.cur.answers?.[0]).includes('/')
          ? `${Math.round(this.nlVal * den)}/${den}`
          : String(this.nlVal).replace('.', ',');
      return (
        `<circle cx="${mx}" cy="${LY}" r="6" class="fill-primary-500"/>` +
        `<line x1="${mx}" y1="${LY - 6}" x2="${mx}" y2="${LY - 15}" stroke-width="2" class="stroke-primary-500"/>` +
        `<text x="${mx}" y="${LY - 19}" text-anchor="middle" font-size="13" font-weight="700" class="fill-primary-600 dark:fill-primary-400">${lbl}</text>`
      );
    },

    regenerateAll() {
      if (!window.AppGenerators) return;
      const expanded = [];
      // Always expand the ORIGINAL placeholders: this.exercises is already expanded, and each item
      // still carries _gen — re-expanding it multiplied the series ("Recommencer": 10 → 58 → 370)
      const source = exercises || [];
      let previousListenedNumber = null;
      for (const ex of source) {
        if (!ex._gen) {
          expanded.push(ex);
          previousListenedNumber = null;
          continue;
        }
        const gen = window.AppGenerators[ex._gen.name];
        if (!gen) {
          expanded.push(ex);
          previousListenedNumber = null;
          continue;
        }
        if (ex._gen.name !== 'ecouteNombre') previousListenedNumber = null;
        const count = ex._gen.count || 1;
        for (let i = 0; i < count; i++) {
          try {
            const params = { ...(ex._gen.params || {}) };
            if (ex._gen.name === 'ecouteNombre' && previousListenedNumber !== null) {
              params.exclude = previousListenedNumber;
            }
            const generated = gen.generate(params);
            expanded.push({ ...ex, ...generated });
            previousListenedNumber = ex._gen.name === 'ecouteNombre' ? Number(generated.answers?.[0]) : null;
          } catch (e) {
            console.error(`Generator error [${ex._gen.name}]:`, e);
            expanded.push({
              ...ex,
              body: `<div class="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl">⚠️ Erreur de génération (${ex._gen.name})</div>`,
            });
            previousListenedNumber = null;
          }
        }
      }
      this.exercises = expanded;
      this.solvedFlags = Array(this.exercises.length).fill(false);
    },

    init() {
      this.kid = this.$el.dataset.kid === '1';
      this.regenerateAll();
      this.syncFromHash();
      this._setupCurrentExercise();

      const _focusFirst = () => {
        let ref;
        if (this.cur.type === 'fraction-check')
          ref = this.cur.given && this.cur.given[0] != null ? this.$refs.rfDenom : this.$refs.rfNum;
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
        if (voiceAudio?.pause) voiceAudio.pause();
        voiceAudio = null;
        this._setupCurrentExercise();
        this.voiceMissing = false;
        requestAnimationFrame(_focusFirst);
        if (this.autoVoice && (!this.kid || this.kidStarted)) this.sayCurrent();
      });
      this.$watch('solvedCount', (count) => {
        if (count === this.exercises.length && this.exercises.length > 0) {
          localStore.markDone(this.seriesId);
          if (this.kid) this.speak('Bravo, tu as tout réussi !', 'feedback/tout-reussi.ogg');
        }
      });
    },

    _setupCurrentExercise() {
      const _e = this.cur;
      // Fields are reused across exercises: drop the right / wrong marks of enterField
      this.$root?.querySelectorAll('[data-field]').forEach((f) => delete f.dataset.field);
      this.countWrong = null;
      this.countChoices = this.kid && _e.type === 'count-objects' ? this._nearChoices(Number(_e.answers?.[0])) : [];
      this.countShow();
      const _blanks = String(_e.operation ?? '').split('?').length - 1;
      const _colOpBlanks = _e.colOp ? (_e.colOp.blanks ?? (_e.colOp.result || []).filter((d) => d === '?').length) : 0;
      this.trouInputs = _blanks + _colOpBlanks > 0 ? Array(_blanks + _colOpBlanks).fill('') : [];

      const _ia = _e.sequence || _e.bounding || _e.convert || _e.forms || _e.opTri;
      if (_ia) {
        // Explicit answers win (convert has items = prompts + answers); interleaved sequences have only items
        this.seqInputs = (_ia.answers || _ia.items.filter((it) => it.blank)).map(() => '');
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

      this.stripPlacements = _e.stripAnswers ? Array(_e.stripAnswers.length).fill(null) : [];
      this.stripSelected = null;
      this.stripErrors = [];

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
      this.nlHint = '';
      this.cgInputs = ['', ''];
      this.cgPoint = null;
      this.matchSelected = null;
      this.matchConnections = [];
      this.matchErrors = [];
      this._matchLinesSvg = '';
      // given: one box already written (« 1/2 = ?/4 »: [null, '4'])
      this.rfInputs = _e.given ? _e.given.map((v) => (v == null ? '' : String(v))) : ['', ''];
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

      this.clkH = 12;
      this.clkM = 0;
      this.clkHand = 'm';
      this.jlInputs = _e.jl ? jumpLine(_e.jl).fields.map(() => '') : [];
      this.jlErrors = [];
      this.foInputs = _e.fo ? fractionOp(_e.fo).fields.map(() => '') : [];
      this.foErrors = [];
      this.mpPicked = [];
      this.mpHint = '';

      this.tgReset(_e);
      this.tbReset(_e);
      this.sgLosses = 0;
      this.sgReset(_e);
      this.pxCells = _e.px ? new Array(_e.px.rows.length * _e.px.cols.length).fill(0) : [];
      this.pxMode = 1;
      this._pxStroke = null;
      this.pxHint = '';
      this.tfCells = _e.tf ? Array.from({ length: 10 * (_e.tf.frames || 1) }, (_, i) => (i < _e.tf.given ? 1 : 0)) : [];
      this.tfHint = '';
      this.dgBest = null;
      this.dgReset(_e);
      this.bmPick = null;
      this.bmBuilt = !_e.bmBuild;
      this.bmHint = '';
      this.bmChips = _e.bmBuild ? this._bmShuffle(_e.bmBuild.chips.map((v) => ({ v, at: null }))) : [];
      this.hbPick = null;
      this.hbColored = [];
      this.hbInputs = _e.hb && _e.hb.blanks ? _e.hb.blanks.map(() => '') : [];
      this.hbHint = '';
      this.cebReset(_e);
      this.calcClear();

      clearTimeout(this._memTimer);
      const deck = _e.mem ? _e.mem.pairs.flatMap((p, k) => p.map((c) => ({ ...c, pair: k }))) : [];
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      this.memDeck = deck;
      this.memOpen = [];
      this.memFound = [];
      this.memMiss = [];
      this.memTries = 0;

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

      this.gbPick = null;
      this.gbProg = [];
      this.gbTrail = [];
      this.gbCrash = false;
      this.gbWrong = null;
      this.gbPaint = [];
      this.gbSegs = [];
      this.gbPen = null;
      this.gbCursor = null;

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

    /* Font size of an operation à trou, from its widest unbreakable segment: short operations keep
       text-5xl; long glued phrases ("? centaines et 8 unités", emoji rows) step down instead of
       sticking out of the player column (same width on desktop and tablet). */
    get opSizeClass() {
      const parts = this.trouParts || [];
      // Visual width in "characters": an emoji (code point ≥ U+1F000) is about two glyphs wide
      const width = (s) => [...s].reduce((n, ch) => n + (ch.codePointAt(0) >= 0x1f000 ? 2 : 1), 0);
      const widest = Math.max(
        0,
        ...parts
          .filter((p) => p.t === 'x')
          .map((p) =>
            width(
              String(p.v)
                .replace(/<[^>]*>/g, '')
                .trim()
            )
          )
      );
      if (widest > 22) return 'text-2xl sm:text-3xl';
      if (widest > 15) return 'text-3xl sm:text-4xl';
      return 'text-3xl sm:text-5xl';
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
      const re = /(\d+\/\d+|\?\/\d+|\?|[^?\d\x00]+(?:\d+(?![\d/]))?[^?\d\x00]*|\x00\d+\x00|\d+(?!\/\d))/g;
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

    // A blank whose answer is a whole number of 4+ digits: digit groups appear as you type
    // (« 34000000 » → « 34 000 000 »); normalizeAnswer ignores the spaces when checking.
    _bigAnswer(idx) {
      return /^\d{4,}$/.test(String(this.cur.answers?.[idx] ?? ''));
    },

    trouInput(e, idx) {
      const el = e.target;
      if (this._bigAnswer(idx) && /^[\d ]*$/.test(el.value)) {
        const caretDigits = el.value.slice(0, el.selectionStart).replace(/ /g, '').length;
        const v = el.value.replace(/ /g, '').replace(/\B(?=(\d{3})+$)/g, ' ');
        el.value = v;
        let pos = 0;
        for (let d = 0; pos < v.length && d < caretDigits; pos++) if (v[pos] !== ' ') d++;
        el.setSelectionRange(pos, pos);
      }
      this.trouInputs[idx] = el.value;
    },

    // Blank width from the expected answer, digit-group spaces included
    trouWidth(idx) {
      const n = String(this.cur.answers?.[idx] ?? '').length;
      const ch = this._bigAnswer(idx) ? n + Math.floor((n - 1) / 3) : n;
      return `calc(${Math.max(2, ch)}ch + 2.5rem)`;
    },

    tileTap(i) {
      if (this.solved) return;
      const idx = this.tileSelected.indexOf(i);
      this.tileSelected = idx === -1 ? [...this.tileSelected, i] : this.tileSelected.filter((s) => s !== i);
      this.tileErrors = [];
      // Maternelle: no « Vérifier » step — check once as many tiles as answers are picked
      if (this.kid && this.tileSelected.length === (this.cur.tileAnswers || []).length) this.check();
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
      const snapStep = this.cur.nl.mode === 'estimate' ? range / 200 : subdivisions > 0 ? step / subdivisions : step;
      const snapped = Math.round(clamped / snapStep) * snapStep;
      this.nlVal = Math.round(snapped * 1e9) / 1e9;
      this.nlHint = '';
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

    // Clock set mode: move a hand by one step (hours: 1 h; minutes: the exercise step, carrying the hour)
    clkMove(hand, d) {
      if (this.solved) return;
      if (hand === 'h') {
        this.clkH = ((this.clkH - 1 + d + 12) % 12) + 1;
        return;
      }
      const step = this.cur.clkStep || 5;
      let m = this.clkM + d * step;
      if (m >= 60 || m < 0) this.clkMove('h', m >= 60 ? 1 : -1);
      this.clkM = ((m % 60) + 60) % 60;
    },

    // Clock set mode: a tap on the face points the chosen hand there
    clkTap(event) {
      if (this.solved) return;
      const r = event.currentTarget.getBoundingClientRect();
      const dx = event.clientX - r.left - r.width / 2,
        dy = event.clientY - r.top - r.height / 2;
      const deg = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
      if (this.clkHand === 'h') this.clkH = Math.round(deg / 30) % 12 || 12;
      else {
        const step = this.cur.clkStep || 5;
        this.clkM = (Math.round(deg / 6 / step) * step) % 60;
      }
    },

    get jlView() {
      return this.cur.jl ? jumpLine(this.cur.jl) : null;
    },

    get foView() {
      return this.cur.fo ? fractionOp(this.cur.fo) : null;
    },

    get mpTotal() {
      return this.mpPicked.reduce((t, c) => t + c, 0);
    },

    mpEuros(c) {
      return (c % 100 ? (c / 100).toFixed(2).replace('.', ',') : String(c / 100)) + ' €';
    },

    mpAdd(c) {
      if (this.solved || this.mpPicked.length >= 30) return;
      this.mpPicked = [...this.mpPicked, c].sort((a, b) => b - a);
      this.mpHint = '';
    },

    mpRemove(i) {
      if (this.solved) return;
      this.mpPicked = this.mpPicked.filter((_, k) => k !== i);
      this.mpHint = '';
    },

    nlCheck() {
      if (this.solved || this.nlVal === null || !this.cur.nl) return;
      const { step = 1, subdivisions = 0 } = this.cur.nl;
      const snapStep = subdivisions > 0 ? step / subdivisions : step;
      const est = this.cur.nl.mode === 'estimate';
      const tol = est ? this.cur.nl.tolerance + 1e-9 : snapStep * 0.51;
      const isCorrect = (this.cur.answers || []).some((a) => Math.abs(sortValue(a) - this.nlVal) <= tol);
      // Estimate mode: say which way to move
      this.nlHint = est && !isCorrect ? (this.nlVal < sortValue(this.cur.answers?.[0]) ? 'right' : 'left') : '';
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

    /* Grid-board — a robot on a square grid. Instructions: U D L R (absolute, optional count « R3 »),
       F (forward, optional count), TL / TR (turn left / right, needs board.dir). Rows go down. */
    gbRun(prog) {
      const b = this.cur.board;
      let [r, c] = b.start;
      let h = 'NESW'.indexOf(b.dir || 'N');
      const trail = [[r, c]];
      const blocked = (r, c) =>
        r < 0 || c < 0 || r >= b.rows || c >= b.cols || (b.blocks || []).some((k) => k[0] === r && k[1] === c);
      for (const t of prog) {
        const m = /^(TL|TR|[UDLRF])(\d*)$/.exec(t);
        if (!m) return { trail, crash: true };
        if (m[1][0] === 'T') {
          h = (h + (m[1] === 'TL' ? 3 : 1)) % 4;
          continue;
        }
        const d = m[1] === 'F' ? h : 'URDL'.indexOf(m[1]);
        for (let k = 0; k < (Number(m[2]) || 1); k++) {
          r += [-1, 0, 1, 0][d];
          c += [0, 1, 0, -1][d];
          trail.push([r, c]);
          if (blocked(r, c)) return { trail, crash: true };
        }
      }
      return { trail, crash: false, end: [r, c], h };
    },

    // Instruction as shown: arrows, « avance de 3 », « tourne à gauche »
    gbLabel(t) {
      const m = /^(TL|TR|[UDLRF])(\d*)$/.exec(t) || [];
      const n = Number(m[2]) || 1;
      if (m[1] === 'F') return n > 1 ? `avance de ${n}` : 'avance';
      if (m[1] === 'TL') return '↰ à gauche';
      if (m[1] === 'TR') return '↱ à droite';
      const a = { U: '↑', D: '↓', L: '←', R: '→' }[m[1]] || '?';
      return n > 1 ? `${n} ${a}` : a;
    },

    // Mirror: image of a cell across the axis (v / h: grid line before column / row `at`; d / a: diagonal
    // from the top left / top right corner, through its cells)
    gbMirror([r, c]) {
      const b = this.cur.board;
      if (b.axis === 'v') return [r, 2 * b.at - 1 - c];
      if (b.axis === 'h') return [2 * b.at - 1 - r, c];
      return b.axis === 'd' ? [c, r] : [b.cols - 1 - c, b.rows - 1 - r];
    },

    // Mirror: the cells to colour, as "r,c" (the figure's own cells on a diagonal axis are already there)
    get gbTarget() {
      const own = new Set(this.cur.board.shape.map(String));
      return [...new Set(this.cur.board.shape.map((p) => String(this.gbMirror(p))))].filter((k) => !own.has(k));
    },

    // Area: what is wrong with the coloured figure ('' when it answers the board) — same rules as
    // scripts/lib/grid-board.js areaCheck: one piece, no hole, not touching the model, the area, then the task
    get gbAreaHint() {
      const b = this.cur.board;
      const cells = this.gbPaint;
      const k = (p) => p[0] + ',' + p[1];
      const set = new Set(cells.map(k));
      const model = new Set((b.model || []).map(k));
      const n4 = ([r, c]) => [
        [r + 1, c],
        [r - 1, c],
        [r, c + 1],
        [r, c - 1],
      ];
      const sides = (list, has) => list.reduce((t, p) => t + n4(p).filter((q) => !has.has(k(q))).length, 0);
      const want = b.model ? b.model.length : b.area;
      if (cells.length !== want)
        return `Ta figure a ${cells.length} carreau${cells.length > 1 ? 'x' : ''} : il en faut ${want}.`;
      const seen = new Set([k(cells[0])]);
      const todo = [cells[0]];
      while (todo.length)
        for (const q of n4(todo.pop()))
          if (set.has(k(q)) && !seen.has(k(q))) {
            seen.add(k(q));
            todo.push(q);
          }
      if (seen.size !== set.size) return 'Les carreaux doivent se toucher par un côté : une seule figure.';
      // a hole: an empty square the border cannot reach
      const out = new Set();
      const go = [];
      for (let r = -1; r <= b.rows; r++)
        for (let c = -1; c <= b.cols; c++)
          if (r < 0 || c < 0 || r === b.rows || c === b.cols) {
            out.add(k([r, c]));
            go.push([r, c]);
          }
      while (go.length)
        for (const q of n4(go.pop()))
          if (q[0] >= -1 && q[1] >= -1 && q[0] <= b.rows && q[1] <= b.cols && !out.has(k(q)) && !set.has(k(q))) {
            out.add(k(q));
            go.push(q);
          }
      if (out.size + set.size !== (b.rows + 2) * (b.cols + 2)) return 'Ta figure a un trou.';
      if (cells.some((p) => n4(p).some((q) => model.has(k(q))))) return 'Ne colle pas ta figure à la figure bleue.';
      const per = sides(cells, set);
      if (b.task === 'perimetre' && per !== b.perimeter) return `Son périmètre mesure ${per} : il faut ${b.perimeter}.`;
      if (b.task === 'autre-perimetre' && per === sides(b.model, model))
        return `Elle a le même périmètre que la figure bleue (${per}) : change sa forme.`;
      if (b.task === 'meme-aire') {
        const shape = (list) => {
          const forms = [];
          for (const flip of [1, -1])
            for (let t = 0; t < 4; t++) {
              let c = list.map(([r, q]) => [r, flip * q]);
              for (let i = 0; i < t; i++) c = c.map(([r, q]) => [q, -r]);
              const r0 = Math.min(...c.map((p) => p[0]));
              const q0 = Math.min(...c.map((p) => p[1]));
              forms.push(
                c
                  .map(([r, q]) => [r - r0, q - q0])
                  .sort((x, y) => x[0] - y[0] || x[1] - y[1])
                  .join(';')
              );
            }
          return forms.sort()[0];
        };
        if (shape(cells) === shape(b.model))
          return 'C’est la même forme que la figure bleue : invente une autre forme.';
      }
      return '';
    },

    // Mirror: a vertical / horizontal axis drawn over the grid, in the 0.25rem gap between two cells
    get gbAxis() {
      const b = this.cur.board;
      if (!b || b.mode !== 'mirror' || !'vh'.includes(b.axis)) return null;
      const n = b.axis === 'v' ? b.cols : b.rows;
      const pos = `calc(${(100 * b.at) / n}% + ${0.25 * (b.at / n - 0.5)}rem)`;
      return b.axis === 'v'
        ? { left: pos, top: '-0.5rem', bottom: '-0.5rem', width: '4px', transform: 'translateX(-50%)' }
        : { top: pos, left: '-0.5rem', right: '-0.5rem', height: '4px', transform: 'translateY(-50%)' };
    },

    get gbCells() {
      const b = this.cur.board;
      if (!b || b.mode === 'draw') return [];
      const at = (list, r, c) => (list || []).find((k) => k[0] === r && k[1] === c);
      if (b.mode === 'area') {
        const cells = [];
        for (let r = 0; r < b.rows; r++)
          for (let c = 0; c < b.cols; c++) {
            const lock = !!at(b.model, r, c);
            const painted = !!at(this.gbPaint, r, c);
            const cls = lock
              ? 'border-primary-700 bg-primary-500'
              : !painted
                ? 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                : this.solved
                  ? 'border-green-700 bg-green-500'
                  : 'border-amber-600 bg-amber-400';
            const label = `ligne ${r + 1}, colonne ${c + 1}` + (lock ? ', modèle' : painted ? ', coloriée' : '');
            cells.push({ r, c, txt: '', cls, lock, label });
          }
        return cells;
      }
      if (b.mode === 'mirror') {
        const target = new Set(this.gbTarget);
        const cells = [];
        for (let r = 0; r < b.rows; r++)
          for (let c = 0; c < b.cols; c++) {
            const lock = !!at(b.shape, r, c);
            const painted = !!at(this.gbPaint, r, c);
            const cls = lock
              ? 'border-primary-600 bg-primary-500'
              : !painted
                ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                : this.solved
                  ? 'border-green-600 bg-green-500'
                  : this.showError && !target.has(r + ',' + c)
                    ? 'border-red-500 bg-red-400'
                    : 'border-amber-500 bg-amber-400';
            const label = `ligne ${r + 1}, colonne ${c + 1}` + (lock ? ', figure' : painted ? ', coloriée' : '');
            cells.push({ r, c, txt: '', cls, lock, label });
          }
        return cells;
      }
      const end = this.solved && this.gbTrail.length ? this.gbTrail[this.gbTrail.length - 1] : b.start;
      const cells = [];
      for (let r = 0; r < b.rows; r++)
        for (let c = 0; c < b.cols; c++) {
          const block = at(b.blocks, r, c);
          const mark = (b.marks || []).find((m) => m.at[0] === r && m.at[1] === c);
          const goal = b.goal && b.goal[0] === r && b.goal[1] === c;
          const walked = at(this.gbTrail, r, c);
          const wrong = this.gbWrong && this.gbWrong[0] === r && this.gbWrong[1] === c;
          const last = this.gbTrail[this.gbTrail.length - 1];
          const crash = this.gbCrash && last[0] === r && last[1] === c;
          const picked = this.gbPick && this.gbPick[0] === r && this.gbPick[1] === c;
          const txt =
            end[0] === r && end[1] === c
              ? '🤖'
              : block
                ? block[2] || '🪨'
                : goal
                  ? b.goalEmoji || '⭐'
                  : mark
                    ? mark.e
                    : picked
                      ? '📍'
                      : walked
                        ? '•'
                        : '';
          const cls =
            wrong || crash
              ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
              : picked || (walked && this.solved)
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : walked
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                  : block
                    ? 'border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-700'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800';
          const lock = b.mode !== 'follow';
          cells.push({ r, c, txt, cls, lock, label: `ligne ${r + 1}, colonne ${c + 1}` + (txt ? ` ${txt}` : '') });
        }
      return cells;
    },

    // Heading of the robot (relative boards): the arrow drawn beside it, in degrees
    get gbHeading() {
      const b = this.cur.board;
      if (!b || !b.dir) return null;
      const h = this.solved && b.mode !== 'debug' ? this.gbRun(b.mode === 'write' ? this.gbProg : b.program).h : null;
      return 90 * (h ?? 'NESW'.indexOf(b.dir));
    },

    gbTapCell(r, c) {
      const b = this.cur.board;
      if (this.solved || !b) return;
      if (b.mode === 'mirror' || b.mode === 'area') {
        if ((b.shape || b.model || []).some((k) => k[0] === r && k[1] === c)) return;
        const rest = this.gbPaint.filter((k) => k[0] !== r || k[1] !== c);
        this.gbPaint = rest.length < this.gbPaint.length ? rest : [...this.gbPaint, [r, c]];
        return;
      }
      if (b.mode !== 'follow') return;
      this.gbPick = [r, c];
      this.gbWrong = null;
      if (this.kid) this.check();
    },

    gbAdd(t) {
      if (this.solved) return;
      this.gbProg = [...this.gbProg, t];
      this.gbTrail = [];
      this.gbCrash = false;
    },

    gbUndo() {
      if (this.solved) return;
      this.gbProg = this.gbProg.slice(0, -1);
      this.gbTrail = [];
      this.gbCrash = false;
    },

    // Debug: tap the wrong instruction
    gbTapStep(i) {
      if (this.solved) return;
      if (i === this.cur.board.bug) {
        this.gbWrong = null;
        this._markSolvedAndAdvance();
      } else {
        this.gbWrong = i;
        this._flashError(() => {
          this.gbWrong = null;
        });
      }
    },

    /* Venn — select an item from the bank */
    // A Venn item is a drawing (figures: the property must be visible) or a character (numbers, emojis)
    vennLabel(it) {
      if (it.svg) return it.svg;
      return String(it.char ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
    },
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

    /* Calculatrice cassée — a pocket calculator: each operation applies to the result so far */
    get calcPrompt() {
      const bc = this.cur.calc;
      if (!bc) return '';
      const keys = bc.broken.map((k) => `<b>${k}</b>`);
      const list = keys.length === 1 ? keys[0] : `${keys.slice(0, -1).join(', ')} et ${keys[keys.length - 1]}`;
      return `${keys.length === 1 ? 'La touche' : 'Les touches'} ${list} ${keys.length === 1 ? 'est cassée' : 'sont cassées'}. Fais afficher <b class="text-3xl">${bc.target}</b>.`;
    },

    get calcDisplay() {
      const v = this.calcEntry || (this.calcResult ?? this.calcAcc ?? 0);
      return String(v).replace('.', ',');
    },

    calcBroken(k) {
      return !!this.cur.calc && this.cur.calc.broken.map(String).includes(k);
    },

    calcHas(k) {
      return !'÷×−+'.includes(k) || !!(this.cur.calc && this.cur.calc.ops.includes(k));
    },

    calcClear() {
      this.calcEntry = '';
      this.calcAcc = null;
      this.calcOp = null;
      this.calcResult = null;
      this.calcTape = [];
      this.calcHint = '';
    },

    _calcApply(a, op, b) {
      const r = op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b;
      return Math.round(r * 1e6) / 1e6;
    },

    calcKey(k) {
      if (this.solved || this.calcBroken(k) || !this.calcHas(k)) return;
      this.calcHint = '';
      if (k === 'C') return this.calcClear();
      if (/\d/.test(k)) {
        if (this.calcResult !== null) this.calcClear();
        if (this.calcEntry.length < 6) this.calcEntry = this.calcEntry === '0' ? k : this.calcEntry + k;
        return;
      }
      const v = this.calcEntry === '' ? null : Number(this.calcEntry);
      if (k === '=') {
        if (this.calcOp === null || v === null) return;
        if (this.calcOp === '÷' && v === 0) {
          this.calcClear();
          this.calcHint = 'On ne peut pas diviser par 0.';
          return;
        }
        this.calcResult = this._calcApply(this.calcAcc, this.calcOp, v);
        this.calcTape = [...this.calcTape, v, '=', String(this.calcResult).replace('.', ',')];
        this.calcAcc = null;
        this.calcOp = null;
        this.calcEntry = '';
        return this.check();
      }
      // An operation: carry on from the result, apply the pending one, or change it
      if (v === null) {
        if (this.calcResult !== null) {
          this.calcAcc = this.calcResult;
          this.calcResult = null;
          this.calcTape = [String(this.calcAcc).replace('.', ',')];
        } else if (this.calcOp !== null) this.calcTape = this.calcTape.slice(0, -1);
        else return;
      } else if (this.calcOp !== null) {
        if (this.calcOp === '÷' && v === 0) {
          this.calcClear();
          this.calcHint = 'On ne peut pas diviser par 0.';
          return;
        }
        this.calcAcc = this._calcApply(this.calcAcc, this.calcOp, v);
        this.calcTape = [...this.calcTape, v];
      } else {
        this.calcAcc = v;
        this.calcTape = [v];
      }
      this.calcOp = k;
      this.calcEntry = '';
      this.calcTape = [...this.calcTape, k];
    },

    /* Le compte est bon — a number, an operation, a number: the two tiles become their result */
    cebReset(e = this.cur) {
      this.cebTiles = e && e.ceb ? e.ceb.numbers.map((v) => ({ v, used: false, made: false })) : [];
      this.cebSel = null;
      this.cebOp = null;
      this.cebSteps = [];
      this.cebHint = '';
    },

    cebTap(i) {
      if (this.solved || this.cebTiles[i].used) return;
      if (this.cebSel === null || this.cebOp === null || this.cebSel === i) {
        this.cebSel = this.cebSel === i ? null : i;
        this.cebOp = null;
        return;
      }
      const [a, b, op] = [this.cebTiles[this.cebSel].v, this.cebTiles[i].v, this.cebOp];
      const r =
        op === '+'
          ? a + b
          : op === '×'
            ? a * b
            : op === '−'
              ? a > b
                ? a - b
                : null
              : b > 1 && a % b === 0
                ? a / b
                : null;
      this.cebOp = null;
      if (r == null) {
        this.cebHint =
          op === '−'
            ? `${a} − ${b} : il faut enlever un nombre plus petit.`
            : `${a} ÷ ${b} : la division doit tomber juste.`;
        this.cebSel = null;
        return;
      }
      const tiles = [...this.cebTiles];
      tiles[this.cebSel] = { ...tiles[this.cebSel], used: true };
      tiles[i] = { ...tiles[i], used: true };
      tiles.push({ v: r, used: false, made: true });
      this.cebTiles = tiles;
      this.cebSteps = [...this.cebSteps, { a, op, b, r, i: this.cebSel, j: i }];
      this.cebSel = null;
      this.cebHint = '';
      const left = tiles.filter((t) => !t.used).map((t) => t.v);
      const { target, useAll } = this.cur.ceb;
      if (useAll ? left.length === 1 : left.includes(target)) this.check();
      else if (useAll && left.includes(target)) this.cebHint = 'Le compte est bon… mais utilise tous les nombres !';
    },

    cebPickOp(op) {
      if (this.solved || this.cebSel === null) return;
      this.cebOp = this.cebOp === op ? null : op;
    },

    cebUndo() {
      const s = this.cebSteps[this.cebSteps.length - 1];
      if (this.solved || !s) return;
      const tiles = this.cebTiles.slice(0, -1);
      tiles[s.i] = { ...tiles[s.i], used: false };
      tiles[s.j] = { ...tiles[s.j], used: false };
      this.cebTiles = tiles;
      this.cebSteps = this.cebSteps.slice(0, -1);
      this.cebSel = null;
      this.cebOp = null;
      this.cebHint = '';
    },

    /* Target blocks — drag the number tiles from the tray onto the blocks (or tap a tile, then the
       spot); a tile in an overlap counts for each block around it. Each block shows what its tiles
       make (live); solved as soon as every block makes its target (and every tile is used, useAll). */
    tbReset(e = this.cur) {
      const tiles = e && e.tb ? e.tb.tiles : [];
      this.tbAt = tiles.map(() => null);
      this.tbZ = tiles.map((_, i) => i);
      this.tbSel = null;
      this._tbDrag = null;
      this.tbHint = '';
    },
    // Tile size and tray layout (units of the board): rows of tiles under it
    get tbTile() {
      return 1.7;
    },
    get tbPerRow() {
      return Math.floor((this.cur.tb.w + 0.5) / (this.tbTile + 0.5));
    },
    get tbFullH() {
      const rows = Math.ceil(this.cur.tb.tiles.length / this.tbPerRow);
      return this.cur.tb.h + 0.6 + rows * (this.tbTile + 0.5);
    },
    tbHome(i) {
      const { w, h, tiles } = this.cur.tb;
      const [n, T] = [this.tbPerRow, this.tbTile];
      const row = Math.floor(i / n);
      const inRow = Math.min(n, tiles.length - row * n);
      const x0 = (w - inRow * T - (inRow - 1) * 0.5) / 2;
      return [x0 + (i % n) * (T + 0.5) + T / 2, h + 0.6 + row * (T + 0.5) + T / 2];
    },
    tbPos(i) {
      return this.tbAt[i] || this.tbHome(i);
    },
    // The blocks a tile on the board is in
    tbBlocksOf(i) {
      const at = this.tbAt[i];
      if (!at) return [];
      return this.cur.tb.blocks
        .map((b, k) => (at[0] > b.x && at[0] < b.x + b.s && at[1] > b.y && at[1] < b.y + b.s ? k : -1))
        .filter((k) => k >= 0);
    },
    tbOp(k) {
      return this.cur.tb.blocks[k].op || this.cur.tb.op || '+';
    },
    // What block k's tiles make: a number, '' when empty
    tbValue(k) {
      const v = this.cur.tb.tiles.filter((_, i) => this.tbBlocksOf(i).includes(k));
      if (!v.length) return '';
      return this.tbOp(k) === '×' ? v.reduce((a, b) => a * b, 1) : v.reduce((a, b) => a + b, 0);
    },
    tbDone(k) {
      return this.tbValue(k) === this.cur.tb.blocks[k].target;
    },
    _tbUnits(ev) {
      const box = this.$refs.tbBoard.getBoundingClientRect();
      const u = this.cur.tb.w / box.width;
      return [(ev.clientX - box.left) * u, (ev.clientY - box.top) * u];
    },
    // Where a tile lands: on the board, or back in the tray (null). On the board it slides to the nearest
    // spot where the whole tile is in the region its centre is in, so it never seems to be in a block
    // it does not count for
    _tbDrop(i, [x, y]) {
      const { w, h, blocks } = this.cur.tb;
      const r = this.tbTile / 2;
      const at = [...this.tbAt];
      if (y > h) at[i] = null;
      else {
        const p = [Math.min(Math.max(x, r), w - r), Math.min(Math.max(y, r), h - r)];
        const key = blocks.map((b) => p[0] > b.x && p[0] < b.x + b.s && p[1] > b.y && p[1] < b.y + b.s);
        const m = r + 0.05;
        const fits = ([cx, cy]) =>
          blocks.every((b, k) =>
            key[k]
              ? cx - m >= b.x && cx + m <= b.x + b.s && cy - m >= b.y && cy + m <= b.y + b.s
              : cx + m <= b.x || cx - m >= b.x + b.s || cy + m <= b.y || cy - m >= b.y + b.s
          );
        let [best, far] = [fits(p) ? p : null, Infinity];
        if (!best)
          for (let cy = r; cy <= h - r; cy += 0.1)
            for (let cx = r; cx <= w - r; cx += 0.1) {
              const d = Math.hypot(cx - p[0], cy - p[1]);
              if (d < far && fits([cx, cy])) [best, far] = [[cx, cy], d];
            }
        at[i] = best || p;
      }
      this.tbAt = at;
      this.tbZ = [...this.tbZ.filter((j) => j !== i), i];
      this.tbHint = '';
    },
    tbDown(i, ev) {
      if (this.solved) return;
      ev.preventDefault();
      ev.stopPropagation();
      this.$refs.tbBoard.setPointerCapture(ev.pointerId);
      const [x0, y0] = this.tbPos(i);
      this._tbDrag = { i, cx: ev.clientX, cy: ev.clientY, x0, y0, moved: false };
      this.tbZ = [...this.tbZ.filter((j) => j !== i), i];
    },
    tbMove(ev) {
      const d = this._tbDrag;
      if (!d) return;
      const u = this.cur.tb.w / this.$refs.tbBoard.getBoundingClientRect().width;
      const [dx, dy] = [(ev.clientX - d.cx) * u, (ev.clientY - d.cy) * u];
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 0.3) return;
      d.moved = true;
      const at = [...this.tbAt];
      at[d.i] = [d.x0 + dx, d.y0 + dy];
      this.tbAt = at;
    },
    tbUp() {
      const d = this._tbDrag;
      if (!d) return;
      this._tbDrag = null;
      if (!d.moved) {
        this.tbSel = this.tbSel === d.i ? null : d.i;
        return;
      }
      this._tbDrop(d.i, this.tbAt[d.i]);
      this.tbSel = null;
      this._tbSolvedYet();
    },
    // A tap on the board (or the tray) with a tile picked puts it there
    tbTap(ev) {
      if (this.solved || this.tbSel === null || this._tbDrag) return;
      this._tbDrop(this.tbSel, this._tbUnits(ev));
      this.tbSel = null;
      this._tbSolvedYet();
    },
    tbKey(i, ev) {
      if (this.solved) return;
      const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
      if (ev.key === 'Escape') this._tbDrop(i, [0, this.cur.tb.h + 1]);
      else if (move) {
        const [x, y] = this.tbAt[i] || [this.cur.tb.w / 2, this.cur.tb.h - 1];
        this._tbDrop(i, [x + move[0], Math.min(y + move[1], this.cur.tb.h - 0.5)]);
      } else return;
      ev.preventDefault();
      this._tbSolvedYet();
    },
    _tbSolvedYet() {
      const { blocks, useAll } = this.cur.tb;
      if (!blocks.every((_, k) => this.tbDone(k))) return;
      if (useAll !== false && this.tbAt.some((a, i) => !this.tbBlocksOf(i).length)) return;
      this.check();
    },

    /* Strategy game — the pupil and the computer take turns; a move takes m of the steps left (course:
       the number said goes up by m; allumettes: m sticks go). The pupil has the seat that can always
       win; a lost game can be played again, with a hint that grows with each loss. Solved on a win. */
    sgReset(e = this.cur) {
      clearTimeout(this._sgTimer);
      const sg = e && e.sg;
      this.sgLeft = sg ? sg.total : 0;
      this.sgLog = [];
      this.sgWinner = null;
      this.sgTurn = sg ? sg.first : null;
      if (sg && sg.first === 'ordi') this._sgTimer = setTimeout(() => this._sgComputer(), 900);
    },
    get sgWin() {
      const { total, moves, misere } = this.cur.sg;
      const win = [!!misere];
      for (let r = 1; r <= total; r++) win[r] = moves.some((m) => m <= r && !win[r - m]);
      return win;
    },
    get sgSaid() {
      return this.cur.sg.total - this.sgLeft;
    },
    // Who said each number (course): 'eleve' | 'ordi' | undefined
    sgSaidBy(n) {
      const t = this.cur.sg.total;
      const at = this.sgLog.find((s) => t - s.left === n);
      return at && at.who;
    },
    sgPlay(m) {
      if (this.solved || this.sgTurn !== 'eleve' || m > this.sgLeft) return;
      this._sgApply('eleve', m);
      if (this.sgTurn !== 'ordi') return;
      if (this._sgFast) this._sgComputer();
      else this._sgTimer = setTimeout(() => this._sgComputer(), 900);
    },
    // Its best move (to a position the pupil cannot win) with probability smart, else any move
    _sgComputer() {
      clearTimeout(this._sgTimer);
      if (this.sgTurn !== 'ordi') return;
      const { moves, smart } = this.cur.sg;
      const legal = moves.filter((m) => m <= this.sgLeft);
      const good = legal.filter((m) => !this.sgWin[this.sgLeft - m]);
      const pick = (list) => list[Math.floor(Math.random() * list.length)];
      this._sgApply('ordi', good.length && Math.random() < smart ? pick(good) : pick(legal));
    },
    _sgApply(who, m) {
      this.sgLeft -= m;
      this.sgLog = [...this.sgLog, { who, m, left: this.sgLeft }];
      const other = who === 'eleve' ? 'ordi' : 'eleve';
      if (this.sgLeft > 0) return (this.sgTurn = other);
      this.sgTurn = 'fin';
      this.sgWinner = this.cur.sg.misere ? other : who;
      if (this.sgWinner === 'eleve') this.check();
      else this.sgLosses++;
    },
    sgReplay() {
      if (!this.solved) this.sgReset();
    },
    // The hint after each lost game: a question, a key position, then every winning position
    get sgHint() {
      const { kind, total, misere } = this.cur.sg;
      const n = this.sgLosses;
      if (!n) return '';
      const win = this.sgWin;
      if (kind === 'course') {
        // numbers to say: the computer then has a position it cannot win
        const keys = Array.from({ length: total }, (_, i) => i + 1).filter((s) => !win[total - s]);
        const key = keys.filter((s) => s < total).pop();
        if (n === 1) return `Astuce : quel nombre dois-tu dire pour que l’ordinateur ne puisse pas dire ${total} ?`;
        if (n === 2 && key)
          return `Si tu dis ${key}, l’ordinateur ne peut pas dire ${total} : toi, tu le diras juste après. Et avant ${key} ?`;
        return `Les nombres gagnants : ${keys.join(', ')}. Dis-les à chaque fois !`;
      }
      // sticks to leave to the computer
      const keys = Array.from({ length: total }, (_, r) => r).filter((r) => r > 0 && !win[r]);
      const goal = misere ? 'qu’il soit obligé de prendre le dernier' : 'que tu puisses prendre le dernier';
      const plural = (r) => `${r} bâtonnet${r > 1 ? 's' : ''}`;
      if (n === 1 || !keys.length) return `Astuce : combien de bâtonnets dois-tu laisser à l’ordinateur pour ${goal} ?`;
      if (n === 2)
        return `Laisse ${plural(keys[0])} à l’ordinateur : il a perdu.${keys[1] ? ` Et avant, laisse-lui ${plural(keys[1])}…` : ''}`;
      return `Laisse toujours à l’ordinateur ${keys.join(', ')} bâtonnets.`;
    },

    /* Tangram — drag a piece (it lands on whole points), tap it to turn it a quarter turn, ↔ flips the
       piece picked last; keyboard: arrows move it, Enter turns, F flips. Solved as soon as the pieces
       cover the silhouette exactly, whichever way. */
    tgReset(e = this.cur) {
      const pieces = e && e.tg ? e.tg.pieces : [];
      this.tgAt = pieces.map((p) => [...p.start]);
      this.tgZ = pieces.map((_, k) => k);
      this.tgSel = null;
      this._tgDrag = null;
      this.tgHint = '';
    },
    // Slot n of the drawing holds a piece of this exercise (the previous one's order lingers for a
    // moment when the next exercise has fewer pieces)
    tgHas(n) {
      const k = this.tgZ[n];
      return k !== undefined && !!this.cur.tg && k < this.cur.tg.pieces.length && !!this.tgAt[k];
    },
    tgPoints(k) {
      const [x, y, r, f] = this.tgAt[k];
      return tgOrient(this.cur.tg.pieces[k].pts, r, f)
        .map(([a, b]) => `${a + x},${b + y}`)
        .join(' ');
    },
    // The grey silhouette (each piece's place: seams hidden, or dashed when `outlines`)
    get tgSilhouetteSvg() {
      const { tg } = this.cur;
      if (!tg) return '';
      const line = tg.outlines
        ? 'stroke="var(--cs)" stroke-width="0.05" stroke-dasharray="0.25 0.15"'
        : 'stroke="var(--tg-sil)" stroke-width="0.04"';
      return tg.pieces
        .map((p) => `<polygon points="${this.tgSolPoints(p)}" fill="var(--tg-sil)" ${line} stroke-linejoin="round"/>`)
        .join('');
    },
    tgSolPoints(p) {
      const [x, y, r, f] = p.sol;
      return tgOrient(p.pts, r, f)
        .map(([a, b]) => `${a + x},${b + y}`)
        .join(' ');
    },
    _tgBox(k, r = this.tgAt[k][2], f = this.tgAt[k][3]) {
      const p = tgOrient(this.cur.tg.pieces[k].pts, r, f);
      return [Math.max(...p.map((q) => q[0])), Math.max(...p.map((q) => q[1]))];
    },
    // Whole point, the piece kept inside the drawing
    _tgPlace(k, x, y, r, f) {
      const [bw, bh] = this._tgBox(k, r, f);
      const { w, h } = this.cur.tg;
      const at = [...this.tgAt];
      at[k] = [Math.min(Math.max(Math.round(x), 0), w - bw), Math.min(Math.max(Math.round(y), 0), h - bh), r, f];
      this.tgAt = at;
      this.tgHint = '';
    },
    _tgTop(k) {
      this.tgZ = [...this.tgZ.filter((i) => i !== k), k];
      this.tgSel = k;
    },
    tgDown(k, ev) {
      if (this.solved) return;
      ev.preventDefault();
      ev.currentTarget.ownerSVGElement.setPointerCapture(ev.pointerId);
      this._tgTop(k);
      this._tgDrag = { k, cx: ev.clientX, cy: ev.clientY, x0: this.tgAt[k][0], y0: this.tgAt[k][1], moved: false };
    },
    tgMove(ev) {
      const d = this._tgDrag;
      if (!d) return;
      const svg = ev.currentTarget;
      const u = this.cur.tg.w / svg.getBoundingClientRect().width; // units per pixel
      const [dx, dy] = [(ev.clientX - d.cx) * u, (ev.clientY - d.cy) * u];
      if (Math.abs(dx) + Math.abs(dy) > 0.25) d.moved = true;
      if (!d.moved) return;
      const at = [...this.tgAt];
      at[d.k] = [d.x0 + dx, d.y0 + dy, at[d.k][2], at[d.k][3]];
      this.tgAt = at;
    },
    tgUp() {
      const d = this._tgDrag;
      if (!d) return;
      this._tgDrag = null;
      const [x, y, r, f] = this.tgAt[d.k];
      if (d.moved) this._tgPlace(d.k, x, y, r, f);
      else this.tgTurn(d.k);
      this._tgSolvedYet();
    },
    // A quarter turn clockwise about the piece's middle
    tgTurn(k) {
      if (this.solved || !this.cur.tg.turn) return;
      const [x, y, r, f] = this.tgAt[k];
      const [bw, bh] = this._tgBox(k);
      this._tgPlace(k, x + (bw - bh) / 2, y + (bh - bw) / 2, (r + 1) % 4, f);
    },
    tgFlip(k = this.tgSel) {
      if (this.solved || k === null || !this.cur.tg.turn) return;
      const [x, y, r, f] = this.tgAt[k];
      this._tgPlace(k, x, y, r, f ? 0 : 1);
      this._tgSolvedYet();
    },
    tgKey(k, ev) {
      if (this.solved) return;
      const [x, y, r, f] = this.tgAt[k];
      const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
      this.tgSel = k; // not brought on top: the focused slot would then show another piece
      if (move) this._tgPlace(k, x + move[0], y + move[1], r, f);
      else if (ev.key === 'Enter' || ev.key === ' ') this.tgTurn(k);
      else if (ev.key === 'f' || ev.key === 'F') this.tgFlip(k);
      else return;
      ev.preventDefault();
      this._tgSolvedYet();
    },
    // null when the pieces cover the silhouette exactly, else what is wrong (for the pupil)
    tgProblem() {
      const { pieces } = this.cur.tg;
      const target = new Set(pieces.flatMap((p) => tgCells(p.pts, p.sol)));
      const seen = new Set();
      let out = 0;
      for (let k = 0; k < pieces.length; k++)
        for (const c of tgCells(pieces[k].pts, this.tgAt[k])) {
          if (seen.has(c)) return 'Deux pièces se chevauchent.';
          if (!target.has(c)) out++;
          seen.add(c);
        }
      if (out) return 'Une pièce dépasse de la silhouette.';
      return seen.size === target.size ? null : 'Il reste des trous : pose toutes les pièces sur la silhouette.';
    },
    _tgSolvedYet() {
      if (!this.tgProblem()) this.check();
    },

    /* Picross — a press colours (or crosses out) a cell, or empties it when it already holds that;
       sliding paints the same along the row or the column it starts on. Solved once every row and
       column has the runs of its numbers. */
    pxRuns(line) {
      const out = [];
      let n = 0;
      for (const c of [...line, 0]) {
        if (c === 1) n++;
        else if (n) (out.push(n), (n = 0));
      }
      return out.length ? out : [0];
    },
    pxLine(isRow, i) {
      const w = this.cur.px.cols.length;
      return isRow ? this.pxCells.slice(i * w, (i + 1) * w) : this.cur.px.rows.map((_, r) => this.pxCells[r * w + i]);
    },
    pxDone(isRow, i) {
      const clue = (isRow ? this.cur.px.rows : this.cur.px.cols)[i];
      return this.pxRuns(this.pxLine(isRow, i)).join() === clue.join();
    },
    // A thicker gap before every fifth line on the big grids (10 × 10), easier to count on
    pxBlock(k) {
      return k > 0 && k % 5 === 0 && this.cur.px.cols.length > 8;
    },
    // The line drawn in the gap before cell (i, j) when it starts a block (a shadow: the cell keeps its size)
    pxBlockShadow(i, j) {
      const sh = [this.pxBlock(j) && '-2px 0 0 0 var(--cs)', this.pxBlock(i) && '0 -2px 0 0 var(--cs)'].filter(Boolean);
      return sh.length ? `box-shadow:${sh.join(',')}` : '';
    },
    pxClue(isRow, i, k) {
      const { px } = this.cur;
      const labels = isRow ? px.rowLabels : px.colLabels;
      return labels ? labels[i][k].replace(/([+−×÷])/, '$1\u200b') : (isRow ? px.rows : px.cols)[i][k];
    },
    _pxIndex(ev) {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const cell = el && el.closest('[data-px]');
      return cell ? Number(cell.dataset.px) : null;
    },
    pxDown(ev) {
      const i = this._pxIndex(ev);
      if (this.solved || i === null) return;
      ev.preventDefault();
      const was = this.pxCells[i];
      this._pxStroke = { from: i, was, value: was === this.pxMode ? 0 : this.pxMode, axis: null };
      this._pxPaint(i);
    },
    pxMove(ev) {
      if (!this._pxStroke) return;
      const i = this._pxIndex(ev);
      if (i !== null) this._pxPaint(i);
    },
    pxUp() {
      if (!this._pxStroke) return;
      this._pxStroke = null;
      this._pxSolvedYet();
    },
    // Keyboard (Enter / Space on a cell): same as a press without sliding
    pxKey(i) {
      if (this.solved) return;
      const cells = [...this.pxCells];
      cells[i] = cells[i] === this.pxMode ? 0 : this.pxMode;
      this.pxCells = cells;
      this._pxSolvedYet();
    },
    // Every cell from the start of the stroke to i (brought back onto its row or column)
    _pxPaint(i) {
      const s = this._pxStroke;
      const w = this.cur.px.cols.length;
      const [r0, c0, r1, c1] = [Math.floor(s.from / w), s.from % w, Math.floor(i / w), i % w];
      if (!s.axis && i !== s.from) s.axis = Math.abs(c1 - c0) >= Math.abs(r1 - r0) ? 'row' : 'col';
      const cells = [...this.pxCells];
      const [a, b] = s.axis === 'col' ? [r0, r1] : [c0, c1];
      for (let k = Math.min(a, b); k <= Math.max(a, b); k++) {
        const j = s.axis === 'col' ? k * w + c0 : r0 * w + k;
        // A stroke that colours does not wipe crosses away, and the other way round
        if (s.value === 0 ? cells[j] === s.was : !cells[j] || j === s.from) cells[j] = s.value;
      }
      this.pxCells = cells;
      this.pxHint = '';
    },
    _pxSolvedYet() {
      const { rows, cols } = this.cur.px;
      if (rows.every((_, i) => this.pxDone(true, i)) && cols.every((_, j) => this.pxDone(false, j))) this.check();
    },
    pxClear() {
      this.pxCells = this.pxCells.map(() => 0);
      this.pxHint = '';
    },

    /* Ten-frame — a tap puts a token in an empty cell or takes one out */
    /* Dice game — Ferme la boîte: roll, then tap open tiles adding up to the dice (closed as soon as they make
       it, refused when they go over). « Je ne peux plus jouer » ends the round, refused while a move exists. */
    dgReset(e = this.cur) {
      const dg = e && e.dg;
      this.dgOpen = dg ? Array(dg.tiles).fill(true) : [];
      this.dgDice = [];
      this.dgPicked = [];
      this.dgOver = false;
      this.dgNope = 0;
      this.dgHint = '';
    },
    get dgTotal() {
      return this.dgDice.reduce((a, b) => a + b, 0);
    },
    get dgLeft() {
      return this.dgOpen.reduce((s, o, i) => s + (o ? i + 1 : 0), 0);
    },
    // A group of open tiles making the dice, or null (fewest tiles)
    get dgMove() {
      const t = this.dgTotal;
      const open = this.dgOpen.map((o, i) => (o ? i + 1 : 0)).filter((n) => n && n <= t);
      let best = null;
      const go = (i, left, picked) => {
        if (!left) {
          if (!best || picked.length < best.length) best = picked;
          return;
        }
        for (let j = i; j < open.length; j++) if (open[j] <= left) go(j + 1, left - open[j], [...picked, open[j]]);
      };
      if (t) go(0, t, []);
      return best;
    },
    dgRoll() {
      if (this.solved || this.dgOver || this.dgDice.length) return;
      const one = this.cur.dg.oneDie && this.dgLeft <= 6;
      const n = one ? 1 : this.cur.dg.dice;
      this.dgDice = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6));
      this.dgPicked = [];
      this.dgNope = 0;
      this.dgHint = '';
    },
    dgTap(n) {
      if (this.solved || this.dgOver || !this.dgDice.length || !this.dgOpen[n - 1]) return;
      this.dgHint = '';
      if (this.dgPicked.includes(n)) return (this.dgPicked = this.dgPicked.filter((x) => x !== n));
      const picked = [...this.dgPicked, n];
      const sum = picked.reduce((a, b) => a + b, 0);
      if (sum > this.dgTotal) {
        this.dgHint = `${picked.join(' + ')} = ${sum} : c’est plus que ${this.dgTotal}.`;
        this.dgPicked = [];
        return this._flashError();
      }
      this.dgPicked = picked;
      if (sum < this.dgTotal) return;
      // the dice are made: those tiles close, next roll
      this.dgOpen = this.dgOpen.map((o, i) => o && !picked.includes(i + 1));
      this.dgPicked = [];
      this.dgDice = [];
      if (!this.dgLeft) this._dgEnd();
    },
    dgStop() {
      if (this.solved || this.dgOver || !this.dgDice.length) return;
      const move = this.dgMove;
      if (move) {
        this.dgNope++;
        this.dgHint =
          this.dgNope === 1
            ? `Si, tu peux encore : cherche des cases ouvertes qui font ${this.dgTotal}.`
            : `Essaie ${move.join(' + ')}.`;
        this.dgPicked = [];
        return this._flashError();
      }
      this._dgEnd();
    },
    _dgEnd() {
      this.dgOver = true;
      this.dgBest = this.dgBest == null ? this.dgLeft : Math.min(this.dgBest, this.dgLeft);
      this.check();
    },
    dgReplay() {
      const best = this.dgBest;
      this.dgReset();
      this.dgBest = best;
    },

    /* Hundred board — rows of ten from cur.hb.start. find: tap the mystery number; fill: type the blanks;
       color: tap to colour / uncolour. Only cur.hb.cells are drawn when set (a piece of the board),
       framed to their rows and columns. */
    get hbGrid() {
      const hb = this.cur.hb;
      const all = Array.from({ length: (hb.rows || 10) * 10 }, (_, i) => hb.start + i);
      const nums = hb.cells || all;
      const rc = (n) => [Math.floor((n - hb.start) / 10), (n - hb.start) % 10];
      const rs = nums.map((n) => rc(n)[0]);
      const cs = nums.map((n) => rc(n)[1]);
      const [r0, r1, c0, c1] = [Math.min(...rs), Math.max(...rs), Math.min(...cs), Math.max(...cs)];
      const cells = [];
      for (let r = r0; r <= r1; r++)
        for (let c = c0; c <= c1; c++) {
          const n = hb.start + r * 10 + c;
          const blank = hb.blanks ? hb.blanks.indexOf(n) : -1;
          const drawn = !hb.cells || hb.cells.includes(n);
          const written = drawn && blank < 0 && (!hb.hide || (hb.shown || []).includes(n));
          cells.push({ n, r, c, drawn, blank, written });
        }
      return { cols: c1 - c0 + 1, cells, piece: !!hb.cells };
    },
    hbTap(n) {
      if (this.solved) return;
      this.hbHint = '';
      if (this.cur.hb.mode === 'find') this.hbPick = this.hbPick === n ? null : n;
      else if (this.cur.hb.mode === 'color')
        this.hbColored = this.hbColored.includes(n) ? this.hbColored.filter((x) => x !== n) : [...this.hbColored, n];
    },
    hbCellClass(n) {
      const hb = this.cur.hb;
      if (this.solved && hb.mode === 'find' && n === hb.target) return 'bg-green-500 text-white';
      if (this.hbPick === n) return 'bg-primary-500 text-white';
      if (this.hbColored.includes(n)) return 'bg-amber-400 text-slate-900';
      if (hb.path && n === hb.from)
        return 'bg-sky-100 dark:bg-sky-900/50 text-content-default ring-2 ring-inset ring-sky-500';
      const plain = 'bg-white dark:bg-slate-800 text-content-default';
      return hb.mode === 'fill' || this.solved ? plain : `${plain} hover:bg-primary-50 dark:hover:bg-primary-900/30`;
    },
    // Does n meet a mystery-number clue (same rules as scripts/lib/hundred-board.js)
    _hbClue(c, n) {
      const d = (p) => Math.floor(n / p) % 10;
      const sum = String(n)
        .split('')
        .reduce((s, x) => s + Number(x), 0);
      const holds = {
        unites: () => d(1) === c.v,
        dizaines: () => d(10) === c.v,
        centaines: () => d(100) === c.v,
        entre: () => n > c.v[0] && n < c.v[1],
        pair: () => n % 2 === 0,
        impair: () => n % 2 === 1,
        somme: () => sum === c.v,
        apres: () => n === c.v + 1,
        avant: () => n === c.v - 1,
        dessous: () => n === c.v + 10,
        dessus: () => n === c.v - 10,
        plus: () => n > c.v,
        moins: () => n < c.v,
      }[c.k];
      return !holds || holds();
    },
    get hbReady() {
      const m = this.cur.hb && this.cur.hb.mode;
      if (m === 'find') return this.hbPick != null;
      if (m === 'color') return this.hbColored.length > 0;
      return this.hbInputs.every((v) => String(v).trim());
    },
    tfTap(i) {
      if (this.solved) return;
      const cells = [...this.tfCells];
      cells[i] = cells[i] ? 0 : 2;
      this.tfCells = cells;
      this.tfHint = '';
    },

    /* Memory — 6 cards on 3 columns, 10 and 20 on 5, else 4 */
    get memCols() {
      const n = this.memDeck.length;
      return n <= 6 ? 3 : n % 5 === 0 ? 5 : 4;
    },

    memUp(i) {
      return !!this.cur.mem?.faceUp || this.memOpen.includes(i) || this.memFound.includes(i);
    },

    // Turn a card; the second one either completes a pair (both stay up) or both turn back — at once
    // when a third card is tapped
    memFlip(i) {
      if (this.solved || this.memOpen.includes(i) || this.memFound.includes(i)) return;
      if (this.memMiss.length) {
        clearTimeout(this._memTimer);
        this.memOpen = [];
        this.memMiss = [];
      }
      this.memOpen = [...this.memOpen, i];
      if (this.memOpen.length < 2) return;
      this.memTries++;
      const [a, b] = this.memOpen;
      if (this.memDeck[a].pair === this.memDeck[b].pair) {
        this.memFound = [...this.memFound, a, b];
        this.memOpen = [];
        if (this.memFound.length === this.memDeck.length) this.check();
        return;
      }
      this.memMiss = [a, b];
      this._memTimer = setTimeout(
        () => {
          this.memOpen = [];
          this.memMiss = [];
        },
        this.cur.mem.faceUp ? 700 : 1200
      );
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
      // Maternelle: no « Vérifier » step — check as soon as everything is placed
      if (this.kid && Object.keys(updated).length === this.cur.items.length) this.check();
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

      if (_e.type === 'clock' && _e.clockMode === 'set') {
        const ok = this.clkH % 12 === _e.hour % 12 && this.clkM === _e.minute;
        return ok ? this._markSolvedAndAdvance() : this._flashError();
      }

      if (_e.type === 'jump-line' && _e.jl) {
        const { fields } = jumpLine(_e.jl);
        if (this.jlInputs.some((v) => !String(v).trim())) return this._flashError();
        this.jlErrors = fields
          .map((f, i) => (normalizeAnswer(this.jlInputs[i]) === normalizeAnswer(f.answer) ? -1 : i))
          .filter((i) => i >= 0);
        if (!this.jlErrors.length) return this._markSolvedAndAdvance();
        return this._flashError(() => {
          this.jlErrors = [];
        });
      }

      if (_e.type === 'fraction-op' && _e.fo) {
        if (this.foInputs.some((v) => !String(v).trim())) return this._flashError();
        const { wrong, pending } = fractionOpCheck(_e.fo, this.foInputs);
        this.foErrors = [...wrong, ...pending];
        if (!this.foErrors.length) return this._markSolvedAndAdvance();
        return this._flashError(() => {
          this.foErrors = [];
        });
      }

      if (_e.type === 'broken-calc' && _e.calc) {
        if (this.calcResult === _e.calc.target) return this._markSolvedAndAdvance();
        this.calcHint =
          this.calcResult === null
            ? 'Tape un calcul, puis appuie sur =.'
            : `Tu obtiens ${String(this.calcResult).replace('.', ',')}, pas ${_e.calc.target}. Appuie sur C et essaie encore.`;
        return this._flashError();
      }

      if (_e.type === 'compte-est-bon' && _e.ceb) {
        const left = this.cebTiles.filter((t) => !t.used).map((t) => t.v);
        const ok = _e.ceb.useAll ? left.length === 1 && left[0] === _e.ceb.target : left.includes(_e.ceb.target);
        if (ok) return this._markSolvedAndAdvance();
        this.cebHint = _e.ceb.useAll ? `Tu arrives à ${left[0]}, pas à ${_e.ceb.target} : annule une étape.` : '';
        return this._flashError();
      }

      if (_e.type === 'target-blocks' && _e.tb) {
        const { blocks, useAll } = _e.tb;
        const unused = useAll !== false && this.tbAt.some((a, i) => !this.tbBlocksOf(i).length);
        if (blocks.every((_, k) => this.tbDone(k)) && !unused) return this._markSolvedAndAdvance();
        this.tbHint = unused ? 'Place tous les nombres dans les blocs.' : 'Un bloc n’a pas encore son nombre cible.';
        return this._flashError();
      }

      if (_e.type === 'strategy-game' && _e.sg) {
        return this.sgWinner === 'eleve' ? this._markSolvedAndAdvance() : this._flashError();
      }

      if (_e.type === 'tangram' && _e.tg) {
        const pb = this.tgProblem();
        if (!pb) return this._markSolvedAndAdvance();
        this.tgHint = pb;
        return this._flashError();
      }

      if (_e.type === 'picross' && _e.px) {
        const wrong = [
          ..._e.px.rows.map((_, i) => !this.pxDone(true, i)),
          ..._e.px.cols.map((_, j) => !this.pxDone(false, j)),
        ].filter(Boolean).length;
        if (!wrong) return this._markSolvedAndAdvance();
        this.pxHint = 'Des nombres ne sont pas encore justes : compte les cases coloriées.';
        return this._flashError();
      }

      if (_e.type === 'bar-model' && _e.bmBuild && !this.bmBuilt) return this._bmCheckModel();

      if (_e.type === 'dice-game' && _e.dg) {
        return this.dgOver ? this._markSolvedAndAdvance() : this._flashError();
      }

      if (_e.type === 'hundred-board' && _e.hb) {
        const hb = _e.hb;
        if (hb.mode === 'find') {
          if (this.hbPick === hb.target) return this._markSolvedAndAdvance();
          const miss = (hb.clues || []).find((c) => !this._hbClue(c, this.hbPick));
          this.hbHint = miss
            ? `${this.hbPick} ne va pas : « ${miss.text} »`
            : hb.path
              ? 'Ce n’est pas là : suis les flèches une par une.'
              : `${this.hbPick} ne va pas : relis les indices.`;
          return this._flashError();
        }
        if (hb.mode === 'color') {
          const extra = this.hbColored.filter((n) => !hb.answer.includes(n));
          const missing = hb.answer.filter((n) => !this.hbColored.includes(n));
          if (!extra.length && !missing.length) return this._markSolvedAndAdvance();
          this.hbHint = extra.length
            ? `${extra[0]} ne va pas dans le motif.`
            : `Il manque ${missing.length} nombre${missing.length > 1 ? 's' : ''}.`;
          return this._flashError();
        }
        const wrong = hb.blanks.filter((n, k) => normalizeAnswer(this.hbInputs[k]) !== String(n)).length;
        if (!wrong) return this._markSolvedAndAdvance();
        this.hbHint = `${wrong} nombre${wrong > 1 ? 's ne vont' : ' ne va'} pas encore.`;
        return this._flashError();
      }

      if (_e.type === 'ten-frame' && _e.tf) {
        const n = this.tfCells.filter(Boolean).length;
        // tenFirst: a token in the second box while the first one has a hole
        const holes =
          _e.tf.tenFirst && this.tfCells.slice(10).some(Boolean) && this.tfCells.slice(0, 10).some((c) => !c);
        if (n === _e.tf.target && !holes) return this._markSolvedAndAdvance();
        this.tfHint = holes ? 'Remplis d’abord la première boîte.' : 'Compte encore les jetons.';
        return this._flashError();
      }

      if (_e.type === 'memory' && _e.mem) {
        return this.memFound.length === this.memDeck.length ? this._markSolvedAndAdvance() : this._flashError();
      }

      if (_e.type === 'money-pay' && _e.mp) {
        const { amount, coins, fewest } = _e.mp;
        if (this.mpTotal !== amount) this.mpHint = 'Ce n’est pas la bonne somme : compte encore.';
        else if (fewest && this.mpPicked.length > fewestPieces(amount, coins))
          this.mpHint = 'C’est la bonne somme ! Mais tu peux payer avec moins de pièces et de billets.';
        else return this._markSolvedAndAdvance();
        return this._flashError();
      }

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

      if (_e.type === 'grid-board' && _e.board) {
        const b = _e.board;
        if (b.mode === 'debug') return;
        if (b.mode === 'draw') return this.gbDrawOk() ? this._markSolvedAndAdvance() : this._flashError();
        if (b.mode === 'area') return this.gbAreaHint ? this._flashError() : this._markSolvedAndAdvance();
        if (b.mode === 'mirror') {
          // Exactly the mirror image: nothing missing, nothing extra (extra cells flash red)
          const target = this.gbTarget;
          const ok = this.gbPaint.length === target.length && this.gbPaint.every((p) => target.includes(String(p)));
          return ok ? this._markSolvedAndAdvance() : this._flashError();
        }
        const run = this.gbRun(b.mode === 'write' ? this.gbProg : b.program);
        if (b.mode === 'follow') {
          if (!this.gbPick) return this._flashError();
          if (run.end && run.end[0] === this.gbPick[0] && run.end[1] === this.gbPick[1]) {
            this.gbTrail = run.trail;
            return this._markSolvedAndAdvance();
          }
          this.gbWrong = this.gbPick;
          this.gbPick = null;
          return this._flashError(() => {
            this.gbWrong = null;
          });
        }
        // write: any program that reaches the goal without a crash, within maxSteps. Off the grid, the
        // trail stops on the last cell inside (shown red)
        this.gbTrail = run.trail.filter(([r, c]) => r >= 0 && c >= 0 && r < b.rows && c < b.cols);
        this.gbCrash = run.crash;
        const ok = run.end && run.end[0] === b.goal[0] && run.end[1] === b.goal[1];
        if (ok && !(b.maxSteps && this.gbProg.length > b.maxSteps)) return this._markSolvedAndAdvance();
        return this._flashError();
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
          errors.forEach((i) => {
            delete updated[i];
          });
          this.classifyPlacements = updated;
          this._flashError(() => {
            this.classifyErrors = [];
          });
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
          .map((v, i) => ({ v: sortValue(v), i }))
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
            // Maternelle: wrong tiles let go, so the pupil can tap again
            if (this.kid) this.tileSelected = this.tileSelected.filter((i) => !this.tileErrors.includes(i));
            this.tileErrors = [];
          });
        }
        return;
      }

      if (_e.type === 'number-strip') {
        if (this.stripPlacements.some((choice) => choice === null)) {
          this._flashError();
          return;
        }
        const expected = _e.stripAnswers || [];
        const errors = this.stripPlacements
          .map((choice, index) => (choice === expected[index] ? -1 : index))
          .filter((index) => index !== -1);
        if (errors.length === 0) {
          this.stripErrors = [];
          this._markSolvedAndAdvance();
        } else {
          this.stripErrors = errors;
          this._flashError(() => {
            this.stripPlacements = this.stripPlacements.map((choice, index) =>
              errors.includes(index) ? null : choice
            );
            this.stripErrors = [];
            this.stripSelected = null;
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
        // sortKeepOrder: items are labels (e.g. fruit names) already listed in the correct order
        const correctOrder = _e.sortKeepOrder
          ? [...(_e.items || [])]
          : [...(_e.items || [])].sort((a, b) =>
              _e.direction === 'desc' ? sortValue(b) - sortValue(a) : sortValue(a) - sortValue(b)
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
        const isCorrect = (_e.answers || []).some((a) => fracEqual(this.rfInputs, a.split('/'), _e.equivalent));
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
          // After the red flash, drop the wrong links (the right ones stay) so the child can redo them
          this._flashError(() => {
            this.matchConnections = this.matchConnections.filter((c) => !errs.includes(c));
            this.matchErrors = [];
            this.$nextTick(() => this.updateMatchLines());
          });
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

      if (
        _e.type === 'sequence' ||
        _e.type === 'bounding' ||
        _e.type === 'convert' ||
        _e.type === 'number-forms' ||
        _e.type === 'op-triangle'
      ) {
        const s = _e.sequence || _e.bounding || _e.convert || _e.forms || _e.opTri;
        if (!s) return;
        if (this.seqInputs.some((v) => !v.trim())) {
          this._flashError();
          return;
        }
        const _answers = s.answers || s.items.filter((it) => it.blank).map((it) => it.answer);
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

    // Sort with sentences (the steps of a construction program): a compact list instead of big tiles,
    // or six steps push the answer slots below the screen
    get sortLong() {
      return (this.cur?.items || []).some((t) => String(t).length > 24);
    },

    get hasAudio() {
      return !!this.cur?.voiceAudio;
    },

    get autoVoice() {
      const c = this.cur;
      return this.kid || !!c.voice;
    },

    speak(text, clip, pauseMs = VOICE_SEGMENT_PAUSE_MS) {
      if (voiceAudio?.pause) voiceAudio.pause();
      if (!text || !clip) return;
      this.voiceMissing = false;
      const clips = Array.isArray(clip) ? clip : [clip];
      let index = 0;
      const sequence = {
        current: null,
        timer: null,
        pauseMs,
        pause() {
          clearTimeout(this.timer);
          this.current?.pause();
        },
      };
      voiceAudio = sequence;

      const playNext = () => {
        if (voiceAudio !== sequence) return;
        if (index >= clips.length) {
          voiceAudio = null;
          return;
        }
        const clipPath = clips[index++];
        if (typeof clipPath !== 'string' || clipPath.startsWith('/') || clipPath.split('/').includes('..')) {
          this.voiceMissing = true;
          voiceAudio = null;
          return;
        }
        const audio = new Audio(`${window.__pathPrefix || '/'}assets/audio/voice-pilot/${clipPath}`);
        applyVoiceRate(audio); // slower voice: a setting of the voix page
        sequence.current = audio;
        audio.addEventListener(
          'ended',
          () => {
            if (voiceAudio !== sequence) return;
            if (index >= clips.length) {
              voiceAudio = null;
              return;
            }
            sequence.timer = setTimeout(playNext, sequence.pauseMs / voiceRate()); // pauses slow down too
          },
          { once: true }
        );
        audio.addEventListener(
          'error',
          () => {
            if (voiceAudio !== sequence) return;
            this.voiceMissing = true;
            voiceAudio = null;
          },
          { once: true }
        );
        audio.play().catch(() => {
          if (voiceAudio !== sequence) return;
          this.voiceMissing = true;
          voiceAudio = null;
        });
      };
      playNext();
    },

    kidStart() {
      this.kidStarted = true;
      this.countShow(); // a quick look (flash, Splat peek) starts once the start screen is gone
      this.sayCurrent();
    },

    // Width of a string in « symbols » (an emoji with its variation selector or skin tone counts once,
    // a plain space about a third) — sizes a maternelle picture row so it fits on one line
    symbolCount(s) {
      const str = String(s || '');
      const all = Intl.Segmenter ? [...new Intl.Segmenter().segment(str)].map((g) => g.segment) : [...str];
      const spaces = all.filter((g) => g === ' ').length; // an em space (group separator) is a full symbol wide
      return all.length - spaces + spaces * 0.35;
    },

    sayCurrent() {
      const c = this.cur;
      const prompt = c.say || (this.kid ? c.title : '');
      if (prompt && c.voiceAudio) {
        const pauseMs = prompt.includes('Quel nombre vient après ?')
          ? VOICE_INSTRUCTION_PAUSE_MS
          : VOICE_SEGMENT_PAUSE_MS;
        this.speak(prompt, c.voiceAudio, pauseMs);
      } else this.voiceMissing = true;
    },

    _kidFeedback(ok) {
      if (!this.kid) return;
      const praise = [
        ['Bravo !', 'feedback/bravo.ogg'],
        ['Super !', 'feedback/super.ogg'],
        ['Génial !', 'feedback/genial.ogg'],
        ['Très bien !', 'feedback/tres-bien.ogg'],
      ];
      const [message, audio] = ok
        ? praise[Math.floor(Math.random() * praise.length)]
        : ['Essaie encore !', 'feedback/essaie-encore.ogg'];
      this.speak(message, audio);
    },

    _markSolvedAndAdvance() {
      this.solvedFlags[this.currentIndex] = true;
      this.showError = false;
      if (this.solvedCount < this.exercises.length) this._kidFeedback(true);
      if (this.currentIndex < this.exercises.length - 1) {
        setTimeout(() => this.goTo(this.currentIndex + 1), SETTINGS.SUCCESS_ADVANCE_DELAY);
      }
    },

    _flashError(cleanup) {
      this.showError = true;
      this._kidFeedback(false);
      setTimeout(() => {
        this.showError = false;
        if (cleanup) cleanup();
      }, SETTINGS.ERROR_FLASH_DURATION);
    },

    // The answer fields of the exercise on screen, in page order (the minifier drops type="text": the
    // property, not the attribute)
    _fields(el) {
      return [...el.closest('.js-player').querySelectorAll('input')].filter(
        (f) => f.type === 'text' && !f.disabled && f.offsetParent !== null
      );
    },

    // Focus the next empty field after `el` (wrapping round); false when every field is filled
    _focusNextField(el) {
      const fields = this._fields(el);
      const empty = fields.filter((f) => f !== el && !f.value.trim());
      const next = empty.find((f) => fields.indexOf(f) > fields.indexOf(el)) || empty[0];
      if (next) next.focus();
      return !!next;
    },

    /* Enter in one field of a several-field exercise: that field alone is checked (green when right;
       when wrong a red flash and the focus stays), then the focus goes to the next empty field. With
       every field filled, Enter checks the whole exercise, like « Vérifier ». */
    enterField(el, key) {
      if (this.solved) return;
      if (!this._fields(el).some((f) => !f.value.trim())) return this.check();
      if (el.value.trim()) {
        const ok = this._fieldOk(key);
        el.addEventListener('input', () => delete el.dataset.field, { once: true });
        if (ok === false) {
          el.dataset.field = 'bad';
          this._kidFeedback(false);
          setTimeout(() => {
            if (el.dataset.field === 'bad') delete el.dataset.field;
          }, SETTINGS.ERROR_FLASH_DURATION);
          return;
        }
        if (ok) el.dataset.field = 'ok';
      }
      this._focusNextField(el);
    },

    // One field judged alone (`key` as in the type's inputs array): true / false, undefined when it
    // cannot be judged without the others (puzzles: futoshiki, kenken)
    _fieldOk(key) {
      const _e = this.cur;
      const eq = (v, a) => normalizeAnswer(v ?? '') === normalizeAnswer(String(a));
      switch (_e.type) {
        case 'fill-table': {
          const cell = (_e.table?.rows || []).flat().find((c) => c.blank && c.idx === key);
          return cell ? eq(this.tableInputs[key], cell.answer) : undefined;
        }
        case 'sequence':
        case 'bounding':
        case 'convert':
        case 'number-forms':
        case 'op-triangle': {
          const s = _e.sequence || _e.bounding || _e.convert || _e.forms || _e.opTri;
          const answers = s.answers || s.items.filter((it) => it.blank).map((it) => it.answer);
          return eq(this.seqInputs[key], answers[key]);
        }
        case 'calc-chain':
          return eq(this.ccInputs[key], _e.chain.steps[key].answer);
        case 'decomp':
          return eq(this.decompInputs[key], _e.decomp.parts.filter((p) => !p.comma)[key].answer);
        case 'fact-family':
          return eq(this.ffInputs[key], _e.ffEquations[key].answer);
        case 'hundred-board':
          return _e.hb.blanks ? eq(this.hbInputs[key], _e.hb.blanks[key]) : undefined;
        case 'jump-line':
          return eq(this.jlInputs[key], jumpLine(_e.jl).fields[key].answer);
        case 'fraction-op': {
          const { wrong, pending } = fractionOpCheck(_e.fo, this.foInputs);
          return wrong.includes(key) ? false : pending.includes(key) ? undefined : true;
        }
        case 'tri-arith':
          return eq(this.triInputs[key], [..._e.triangle.vertices, ..._e.triangle.edges][key]);
        case 'pyramid': {
          const p = _e.pyramid;
          for (let r = 0; r < p.rows.length; r++)
            for (let c = 0; c < p.rows[r].length; c++)
              if (this.pyramidFlatIdx(r, c) === key) return eq(this.pyramidInputs[key], p.rows[r][c]);
          return undefined;
        }
        case 'decimal-triple': {
          const v = this.dtInputs[key];
          if (key === 'fracNum') return eq(v, _e.dtFrac.num);
          if (key === 'fracDen') return eq(v, _e.dtFrac.den);
          if (key === 'decimal') return eq(v, _e.dtDecimal);
          return eq(v, (_e.dtPlaces || [])[['dizaines', 'unites', 'dixiemes', 'centiemes', 'milliemes'].indexOf(key)]);
        }
        case 'estimation':
          return key === 'est'
            ? (_e.estAnswers || []).some((a) => eq(this.estInput, a))
            : (_e.answers || []).some((a) => eq(this.userInput, a));
        // x, y / numerator, denominator: right when some accepted answer has it
        case 'coordinate-grid':
          return (_e.answers || []).some((a) => eq(this.cgInputs[key], a.split(',')[key]));
        case 'fraction-check':
          // equivalent: a numerator alone cannot be judged (1/2 or 2/4)
          if (_e.equivalent)
            return this.rfInputs.every((v) => String(v).trim())
              ? (_e.answers || []).some((a) => fracEqual(this.rfInputs, a.split('/'), true))
              : undefined;
          return (_e.answers || []).some((a) => eq(this.rfInputs[key], a.split('/')[key]));
        default:
          // Blanks in an operation (« 3 + ? = 7 », column-op)
          return this.trouInputs.length > 1 ? eq(this.trouInputs[key], (_e.answers || [])[key]) : undefined;
      }
    },

    matchTap(side, i) {
      if (this.solved) return;
      // Tapping a linked item unlinks it (left: and selects it, ready to be linked again)
      const unlink = (keep) => {
        this.matchConnections = this.matchConnections.filter(keep);
        this.matchErrors = this.matchErrors.filter(keep);
        this.$nextTick(() => this.updateMatchLines());
      };
      if (side === 'left') {
        if (this.matchSelected !== i && this.matchConnections.some((c) => c.left === i)) {
          unlink((c) => c.left !== i);
          this.matchSelected = i;
          return;
        }
        this.matchSelected = this.matchSelected === i ? null : i;
      } else {
        if (this.matchSelected === null) {
          if (this.matchConnections.some((c) => c.right === i)) unlink((c) => c.right !== i);
          return;
        }
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
        this._kidFeedback(false);
        setTimeout(() => {
          this.cmpGroupWrong = null;
        }, SETTINGS.MCQ_WRONG_DELAY);
      }
    },

    // 3 big choices around the answer, never below 1 (« 1 2 3 » for 1, « 4 5 6 » or « 5 6 7 »… for 6)
    _nearChoices(n) {
      if (!(n >= 1)) return [];
      const lo = Math.max(1, n - Math.floor(Math.random() * 3));
      const c = [lo, lo + 1, lo + 2];
      for (let i = c.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [c[i], c[j]] = [c[j], c[i]];
      }
      return c;
    },

    countTap(n) {
      if (this.solved) return;
      this.userInput = String(n);
      this.check();
      if (!this.solved) {
        this.countWrong = n;
        setTimeout(() => {
          this.countWrong = null;
        }, SETTINGS.MCQ_WRONG_DELAY);
      }
    },

    // Show the picture; with `flash` (ms) it hides again — « combien d'un coup d'œil ? »
    countShow() {
      clearTimeout(this._countTimer);
      clearTimeout(this._peekTimer);
      this.countHidden = false;
      this.splatPeek = !!(this.cur.svgFull && this.cur.peek > 0 && !this.solved);
      if (this.splatPeek) this._peekTimer = setTimeout(() => (this.splatPeek = false), this.cur.peek);
      const ms = this.cur.flash;
      if (ms > 0)
        this._countTimer = setTimeout(() => {
          if (!this.solved) this.countHidden = true;
        }, ms);
    },

    // ── Bar model built by the pupil ──
    _bmShuffle(a) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },

    bmTapChip(i) {
      if (this.bmBuilt || this.solved) return;
      this.bmHint = '';
      this.bmPick = this.bmPick === i ? null : i;
    },

    // A box: puts the picked chip in it (the chip that was there goes back), or sends its chip back to the tray
    bmTapCell(key) {
      if (this.bmBuilt || this.solved) return;
      this.bmHint = '';
      const here = this.bmChips.findIndex((c) => c.at === key);
      if (this.bmPick !== null) {
        if (here >= 0) this.bmChips[here].at = null;
        this.bmChips[this.bmPick].at = key;
        this.bmPick = null;
      } else if (here >= 0) this.bmChips[here].at = null;
    },

    bmAt(key) {
      const c = this.bmChips.find((c) => c.at === key);
      return c ? c.v : '';
    },

    get bmFull() {
      const b = this.cur.bmBuild;
      return !!b && b.rows.every((r) => r.cells.every((c) => this.bmAt(c.key) !== ''));
    },

    _bmCheckModel() {
      const b = this.cur.bmBuild;
      const n = (v) => normalizeAnswer(String(v));
      const cells = b.rows.flatMap((r) => r.cells);
      if (!this.bmFull) {
        this.bmHint = 'Place un nombre ou le ? dans chaque case.';
        return this._flashError();
      }
      if (cells.every((c) => n(this.bmAt(c.key)) === n(c.want))) {
        this.bmBuilt = true;
        this.bmHint = '';
        this.$nextTick(() => this.$refs.input?.focus());
        return;
      }
      const wants = cells.map((c) => n(c.want));
      const wrong = (key) => {
        const c = cells.find((c) => c.key === key);
        return c && n(this.bmAt(key)) !== n(c.want);
      };
      const sameSet = (keys) => {
        const a = keys.map((k) => n(this.bmAt(k))).sort(),
          w = keys.map((k) => n(cells.find((c) => c.key === k).want)).sort();
        return a.join('|') === w.join('|');
      };
      if (cells.some((c) => !wants.includes(n(this.bmAt(c.key)))))
        this.bmHint = "Un nombre de l'énoncé ne sert pas dans ce schéma : lequel ?";
      else if (b.mode === 'part-whole') {
        const parts = cells.filter((c) => c.key !== 'whole').map((c) => c.key);
        this.bmHint = wrong('whole')
          ? n(cells[0].want) === '?'
            ? 'Que cherche-t-on : le tout ou une partie ? Le ? va dans la case de ce que l’on cherche.'
            : 'La grande barre du haut, c’est le tout : quel nombre est le total ?'
          : sameSet(parts)
            ? 'Regarde la longueur des cases : le plus grand nombre va dans la plus longue.'
            : 'Relis l’énoncé : quelles sont les parties ?';
      } else if (wrong('diff') && !wrong('ref') && !wrong('compared'))
        this.bmHint = 'La case en pointillés, c’est l’écart entre les deux barres.';
      else if (sameSet(['ref', 'compared']))
        this.bmHint = 'La barre la plus longue est pour la plus grande quantité. Relis : qui en a le plus ?';
      else this.bmHint = 'Relis l’énoncé : quel nombre va dans chaque case ?';
      return this._flashError();
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
        this._kidFeedback(false);
        setTimeout(() => {
          this.mcqWrong = null;
        }, SETTINGS.SUCCESS_ADVANCE_DELAY);
      }
    },

    // el: the field where Enter was pressed (the focus then goes to the next empty one)
    mqCheck(i, el) {
      const q = this.cur.mqQuestions;
      if (!q || this.mqSolved[i] || !this.mqInputs[i]?.trim()) return;
      if (normalizeAnswer(this.mqInputs[i]) === normalizeAnswer(q[i].answer)) {
        this.mqSolved[i] = true;
        this.mqErrors = this.mqErrors.filter((e) => e !== i);
        if (this.mqSolved.every(Boolean)) this._markSolvedAndAdvance();
        else if (el) this._focusNextField(el);
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

    // bcErrors holds bar indices in build mode, question indices in read mode: only build-mode errors redden a bar
    bcBarError(colIdx) {
      return this.cur.bc?.mode === 'build' && this.bcErrors.includes(colIdx);
    },

    // el: as in mqCheck
    bcCheck(i, el) {
      if (!this.cur.bc?.questions || this.bcSolved[i] || !this.bcInputs[i]?.trim()) return;
      const q = this.cur.bc.questions[i];
      if (normalizeAnswer(this.bcInputs[i]) === normalizeAnswer(q.answer)) {
        this.bcSolved[i] = true;
        this.bcErrors = this.bcErrors.filter((e) => e !== i);
        if (this.bcSolved.every(Boolean)) this._markSolvedAndAdvance();
        else if (el) this._focusNextField(el);
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
    stripDiceSlots(value) {
      const symbols = String(value || '')
        .trim()
        .split(/\s+/);
      if (
        symbols.length === 0 ||
        symbols.length > 9 ||
        symbols.some((symbol) => !/\p{Extended_Pictographic}/u.test(symbol))
      ) {
        return null;
      }

      const layouts = [
        [],
        [4],
        [0, 8],
        [0, 4, 8],
        [0, 2, 6, 8],
        [0, 2, 4, 6, 8],
        [0, 3, 6, 2, 5, 8],
        [0, 3, 6, 2, 4, 5, 8],
        [0, 3, 6, 1, 2, 4, 5, 8],
        [0, 1, 2, 3, 4, 5, 6, 7, 8],
      ];
      const slots = Array(9).fill('');
      symbols.forEach((symbol, index) => {
        slots[layouts[symbols.length][index]] = symbol;
      });
      return slots;
    },
    stripBlankIndex(cellIndex) {
      return (this.cur.stripCells || []).slice(0, cellIndex).filter((cell) => cell === null).length;
    },
    stripChoose(choiceIndex) {
      if (this.solved || this.stripPlacements.includes(choiceIndex)) return;
      this.stripSelected = this.stripSelected === choiceIndex ? null : choiceIndex;
      this.stripErrors = [];
    },
    stripPlace(blankIndex) {
      if (this.solved || blankIndex < 0 || blankIndex >= this.stripPlacements.length) return;
      const placements = [...this.stripPlacements];
      if (this.stripSelected === null) {
        placements[blankIndex] = null;
      } else {
        placements[blankIndex] = this.stripSelected;
      }
      this.stripPlacements = placements;
      this.stripSelected = null;
      this.stripErrors = [];
      if (this.stripPlacements.every((choice) => choice !== null)) this.check();
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
    // Result field i → its index in answers (after the partial products of a × by 2 digits)
    colOpTrouIdx(i) {
      const c = this.cur.colOp;
      return (c?.resultStart || 0) + (c?.result || []).slice(0, i).filter((d) => d === '?').length;
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
  // Optional parts, loaded by the pages that use them (grid-board draw: assets/js/grid-draw.js)
  if (globalThis.GridDraw) Object.defineProperties(player, Object.getOwnPropertyDescriptors(globalThis.GridDraw));
  return player;
}
