#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const VALID_DIFFICULTIES = ['facile', 'moyen', 'difficile'];
// French number words — a title made only of these spells a number (and may be the answer)
const NUMBER_WORDS = new Set(
  'zéro un une deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize vingt vingts trente quarante cinquante soixante cent cents mille et'.split(
    ' '
  )
);

const TYPE_SCHEMAS = {
  'number-check': { required: [], requireOneOf: [['answer'], ['answers'], ['generator']] },
  problem: { required: [], requireOneOf: [['answer'], ['answers'], ['generator']] },
  matching: { required: ['pairs'], arrays: ['pairs'], arrayFields: { pairs: ['left', 'right'] } },
  pyramid: { required: ['pyramid'], arrays: ['pyramid'] },
  sequence: { required: ['given', 'answers'], arrays: ['given', 'answers'] },
  bounding: { required: ['number', 'answers'], arrays: ['answers'] },
  convert: { required: ['items'], arrays: ['items'], arrayFields: { items: ['prompt', 'answer'] } },
  'logic-grid': { required: ['columns', 'rows', 'solution'], arrays: ['columns', 'rows'] },
  'true-false': { required: ['statements'], arrays: ['statements'], arrayFields: { statements: ['text', 'answer'] } },
  compare: { required: ['comparisons'], arrays: ['comparisons'], arrayFields: { comparisons: ['left', 'right'] } },
  'multi-question': { required: ['questions'], arrays: ['questions'], arrayFields: { questions: ['text', 'answer'] } },
  mcq: { required: ['answer', 'choices'], arrays: ['choices'] },
  fraction: { required: ['shape', 'numerator', 'denominator', 'answer'] },
  'base-10': { required: ['answer'], requireOneOf: [['number'], ['hundreds', 'tens', 'ones']] },
  clock: { required: ['hour', 'minute', 'answer'] },
  sort: { required: ['items'], arrays: ['items'] },
  'drag-sort': { required: ['tiles'], arrays: ['tiles'] },
  'fill-table': { required: ['headers', 'rows', 'answers'], arrays: ['headers', 'rows', 'answers'] },
  'column-op': { required: ['top', 'operation', 'result'] },
  ruler: { required: [] },
  thermometer: { required: [] },
  'number-line': { required: ['min', 'max', 'answer'] },
  'coordinate-grid': { required: ['answer'] },
  'fraction-check': { required: [], requireOneOf: [['answer'], ['answers']], arrays: ['answers'] },
  'tile-select': { required: ['tiles', 'tileAnswers'], arrays: ['tiles', 'tileAnswers'] },
  checkbox: { required: ['statements', 'checkedAnswers'], arrays: ['statements', 'checkedAnswers'] },
  select: { required: ['statements'], arrays: ['statements'] },
  'svg-tiles': { required: ['tiles', 'answers'], arrays: ['tiles', 'answers'], arrayFields: { tiles: ['gen'] } },
  'click-blocks': { required: ['columns'], arrays: ['columns'] },
  'number-hunt': { required: [] },
  'compare-groups': { required: [] },
  'fraction-paint': { required: ['numerator', 'denominator'] },
  'count-objects': { required: [] },
  'emoji-equations': {
    required: [],
    requireOneOf: [['eqLines', 'eqQuestion', 'answer'], ['generator']],
    arrays: ['eqLines'],
  },
  'number-forms': { required: [], requireOneOf: [['target', 'forms'], ['generator']], arrays: ['forms'] },
  'op-triangle': { required: ['generator'] },
  'bar-chart': { required: ['labels', 'values', 'yMax', 'yStep'], arrays: ['labels', 'values'] },
  'calc-chain': { required: ['chain'] },
  'inverse-problem': { required: ['ipBase', 'ipInverses'], arrays: ['ipInverses'] },
  'decimal-triple': { required: [], requireOneOf: [['dtFrac', 'dtDecimal', 'dtPlaces', 'dtGiven'], ['generator']] },
  'compare-expressions': {
    required: ['comparisons'],
    arrays: ['comparisons'],
    arrayFields: { comparisons: ['left', 'right'] },
  },
  estimation: {
    required: [],
    requireOneOf: [
      ['estimate', 'answer'],
      ['estimates', 'answer'],
    ],
  },
  'error-analysis': { required: ['steps', 'wrongStep', 'correction'], arrays: ['steps'] },
  'compare-solutions': { required: ['solutions', 'correctSolution'], arrays: ['solutions'] },
  'guided-problem': { required: ['story', 'steps'], arrays: ['steps'] },
  'think-board': { required: ['expression'], requireOneOf: [['answer'], ['answers']] },
  'fact-family': { required: ['numbers', 'operation'], arrays: ['numbers'] },
  'bar-model': { required: ['bm', 'answer'] },
  futoshiki: { required: [], requireOneOf: [['futoshiki'], ['generator']] },
  kenken: { required: [], requireOneOf: [['kenken'], ['generator']] },
  numberlink: { required: [], requireOneOf: [['numberlink'], ['generator']] },
};

const COLORS = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function findFiles(dir, name) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findFiles(full, name));
    else if (entry.name === name || (name === '*.md' && entry.name.endsWith('.md'))) results.push(full);
  }
  return results;
}

function parseFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  try {
    return yaml.load(match[1]);
  } catch {
    return null;
  }
}

// ─── Generated exercises ──────────────────────────────────────────────────────
// Run each generator with the file's own params (GEN_RUNS times) and check that the output
// can actually render: known generator, no exception, no NaN/undefined/Infinity, SVG helper
// exists in svg.js, and the produced type equals the front-matter type — the page only
// includes the partials of front-matter types, so a mismatch renders a blank exercise.

const GEN_RUNS = 20;
global.clockSvg = () => '<svg/>'; // svg.js helper called at generation time (browser global)
const generators = require('../src/assets/js/generators/index.js');
const { solveGrid } = require('./lib/logic-grid.js');
const logicGrids = { checked: 0, unchecked: 0 }; // uniqueness of the solution (see lib/logic-grid.js)
const svgSource = fs.readFileSync(path.join(__dirname, '../src/assets/js/svg.js'), 'utf8');
const svgHelperExists = (name) =>
  name === 'embedSvg' || svgSource.includes(`function ${name}(`) || svgSource.includes(`${name} =`);

// Two identical buttons / tiles: the pupil clicks the « other » right value and is refused
function duplicateChoice(item) {
  const plain = (s) =>
    String(typeof s === 'object' ? JSON.stringify(s) : s)
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  for (const key of ['mcqChoices', 'choices', 'tiles']) {
    const list = item[key];
    if (!Array.isArray(list) || list.length < 2) continue;
    const seen = new Set();
    for (const c of list.map(plain)) {
      if (seen.has(c)) return `« ${c} »`;
      seen.add(c);
    }
  }
  return null;
}

function statementOf(mdPath) {
  return fs
    .readFileSync(mdPath, 'utf8')
    .replace(/^---[\s\S]*?\n---/, '')
    .trim();
}

function validateGenerated(relMd, data, errors, bodyText = '') {
  const name = data.generator;
  const gen = generators[name];
  if (!gen) {
    errors.push(`${relMd}: unknown generator "${name}"`);
    return;
  }
  const expected = data.type || 'number-check';
  for (let i = 0; i < GEN_RUNS; i++) {
    let out;
    try {
      out = gen.generate(data.params || {});
    } catch (e) {
      errors.push(`${relMd}: generator "${name}" throws with these params — ${e.message}`);
      return;
    }
    if (!out || typeof out.type !== 'string') {
      errors.push(`${relMd}: generator "${name}" returned no "type"`);
      return;
    }
    if (out.type !== expected) {
      errors.push(`${relMd}: generator "${name}" produces type "${out.type}" but front-matter says "${expected}"`);
      return;
    }
    const bad = JSON.stringify(out).match(/NaN|undefined|Infinity/);
    if (bad) {
      errors.push(`${relMd}: generator "${name}" output contains "${bad[0]}"`);
      return;
    }
    if (out.svg && out.svg.gen && !svgHelperExists(out.svg.gen)) {
      errors.push(`${relMd}: generator "${name}" uses SVG helper "${out.svg.gen}" missing from svg.js`);
      return;
    }
    const dup = duplicateChoice(out);
    if (dup) {
      errors.push(`${relMd}: generator "${name}" shows the same choice twice (${dup}) — one of them is refused`);
      return;
    }
    if (expected === 'matching' && !data.title && !out.title && !bodyText && !out.body) {
      errors.push(`${relMd}: matching exercise has no title and no statement — say what to link`);
      return;
    }
  }
}

// Does the type's partial display the statement (cur.body)? Types without their own partial use
// the generic player text, which does.
const _showsBody = {};
function typeShowsBody(type) {
  if (!(type in _showsBody)) {
    const f = path.join(__dirname, '../src/_includes/types', `${type}.njk`);
    _showsBody[type] = !fs.existsSync(f) || fs.readFileSync(f, 'utf8').includes('cur.body');
  }
  return _showsBody[type];
}

function validateSeries(seriesDir, errors) {
  const indexPath = path.join(seriesDir, 'index.yaml');
  const rel = path.relative(process.cwd(), seriesDir).replace(/\\/g, '/');

  // Validate index.yaml
  if (!fs.existsSync(indexPath)) {
    errors.push(`${rel}: missing index.yaml`);
    return;
  }

  let meta;
  try {
    meta = yaml.load(fs.readFileSync(indexPath, 'utf8'));
  } catch (e) {
    errors.push(`${rel}/index.yaml: invalid YAML — ${e.message}`);
    return;
  }

  if (!meta.title) errors.push(`${rel}/index.yaml: missing "title"`);
  if (!meta.difficulty) {
    errors.push(`${rel}/index.yaml: missing "difficulty"`);
  } else if (!VALID_DIFFICULTIES.includes(meta.difficulty)) {
    errors.push(
      `${rel}/index.yaml: invalid difficulty "${meta.difficulty}" (expected: ${VALID_DIFFICULTIES.join(', ')})`
    );
  }

  // Validate exercise .md files
  // A few series folders also hold other series (applications/ce2/maths/mesures) — those are
  // validated on their own, so skip any .md whose nearest index.yaml is not this series'
  const ownSeries = (mdPath) => {
    for (let d = path.dirname(mdPath); d !== seriesDir; d = path.dirname(d))
      if (fs.existsSync(path.join(d, 'index.yaml'))) return false;
    return true;
  };
  const mdFiles = findFiles(seriesDir, '*.md').filter(ownSeries);
  for (const mdPath of mdFiles) {
    const relMd = path.relative(process.cwd(), mdPath).replace(/\\/g, '/');
    const data = parseFrontmatter(mdPath);
    if (!data) {
      errors.push(`${relMd}: missing or invalid frontmatter`);
      continue;
    }

    const bodyText = statementOf(mdPath);
    // The matching template shows no prompt of its own: without a title or statement the pupil sees
    // two columns and no instruction (« Relie chaque horloge… » was missing in lire-heure-matching)
    if ((data.type || 'number-check') === 'matching' && !data.title && !bodyText && !data.generator)
      errors.push(`${relMd}: matching exercise has no title and no statement — say what to link`);

    // Generated exercises: no static schema, run the generator instead
    if (data.generator) {
      validateGenerated(relMd, data, errors, bodyText);
      continue;
    }

    const type = data.type || 'number-check';
    const schema = TYPE_SCHEMAS[type];
    if (!schema) {
      errors.push(`${relMd}: unknown type "${type}"`);
      continue;
    }

    // A statement the type's template never displays is invisible to the pupil
    // (« Colorie 3/5 de la bande » under fraction-paint, hidden until 2026-10)
    // The pupil types the correction: a sentence can never be matched (« « de plus » → c'est A qui… »)
    if (type === 'error-analysis' && /\p{L}{3,}.*\s.*\p{L}{3,}/u.test(String(data.correction ?? '')))
      errors.push(
        `${relMd}: error-analysis correction "${data.correction}" is a sentence — use the right result (a number)`
      );
    // Internal curriculum codes are for us, not for pupils (« Les salles — erreur A3.3 »)
    if (/\b[ADIMNS]\d(\.\d)+\b/.test(String(data.title || '')))
      errors.push(`${relMd}: title "${data.title}" shows an internal class code`);
    const dupStatic = duplicateChoice(data);
    if (dupStatic) errors.push(`${relMd}: the same choice appears twice (${dupStatic}) — one of them is refused`);
    if (bodyText && !typeShowsBody(type))
      errors.push(
        `${relMd}: has a statement but the ${type} template never displays cur.body — show it in src/_includes/types/${type}.njk`
      );

    // Check required fields
    for (const field of schema.required) {
      if (data[field] === undefined || data[field] === null) {
        errors.push(`${relMd}: type "${type}" requires "${field}"`);
      }
    }

    // Check requireOneOf (e.g., base-10 needs either "number" or "hundreds"+"tens"+"ones")
    if (schema.requireOneOf) {
      const satisfied = schema.requireOneOf.some((group) =>
        group.every((f) => data[f] !== undefined && data[f] !== null)
      );
      if (!satisfied) {
        const options = schema.requireOneOf.map((g) => g.join(' + ')).join('" or "');
        errors.push(`${relMd}: type "${type}" requires one of: "${options}"`);
      }
    }

    // Check arrays are actually arrays
    if (schema.arrays) {
      for (const field of schema.arrays) {
        if (data[field] !== undefined && !Array.isArray(data[field])) {
          errors.push(`${relMd}: "${field}" must be an array`);
        }
      }
    }

    // Check array item fields
    if (schema.arrayFields) {
      for (const [field, subFields] of Object.entries(schema.arrayFields)) {
        if (Array.isArray(data[field]) && data[field].length > 0) {
          for (let i = 0; i < data[field].length; i++) {
            const item = data[field][i];
            if (typeof item !== 'object' || item === null) continue;
            for (const sub of subFields) {
              if (item[sub] === undefined || item[sub] === null) {
                errors.push(`${relMd}: ${field}[${i}] missing "${sub}"`);
              }
            }
          }
        }
      }
    }

    // The operation line is shown very large (text-5xl): it must hold the calculation only.
    // A sentence with — or → ("Achat : 3,50 € — payé : 5 €…") reads as minus signs and wraps
    // badly; its data belongs in the body, e.g. body "Tu paies 5 €…", operation "monnaie = ? €".
    if (typeof data.operation === 'string' && /[—→]/.test(data.operation)) {
      errors.push(`${relMd}: "operation" contains — or →, put the data in the body and keep only the calculation`);
    }

    // The title must not give the answer away: "Sept cent cinquante-quatre" above base-10 blocks
    // whose answer is 754, or a title containing the expected number itself.
    if (typeof data.title === 'string') {
      const words = data.title
        .toLowerCase()
        .replace(/[-’']/g, ' ')
        .replace(/[?!.:]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
      if (words.length && words.every((w) => NUMBER_WORDS.has(w)))
        errors.push(
          `${relMd}: title "${data.title}" is a number in words — it may give away the answer, use a generic title`
        );
      const answer = data.answer != null ? String(data.answer).trim() : '';
      if (/^[0-9]{2,}$/.test(answer) && new RegExp(`(^|[^0-9])${answer}([^0-9]|$)`).test(data.title.replace(/\s/g, '')))
        errors.push(`${relMd}: title "${data.title}" contains the answer ${answer}`);
    }

    // logic-grid: .eleventy.js reads solution[column] = row. Keys written the other way round
    // produce an all-false solution matrix, i.e. a grid that can never be solved.
    if (type === 'logic-grid' && data.solution && Array.isArray(data.columns) && Array.isArray(data.rows)) {
      const cols = data.columns.map(String),
        rows = data.rows.map(String);
      for (const [key, value] of Object.entries(data.solution)) {
        if (!cols.includes(String(key)))
          errors.push(`${relMd}: solution key "${key}" is not a column (keys = columns)`);
        if (!rows.includes(String(value))) errors.push(`${relMd}: solution value "${value}" is not a row`);
      }
      // Clues must lead to exactly one solution — the stored one. Checked when every clue is
      // direct (names its elements); descriptive clues are left to the human check.
      const grid = solveGrid({
        columns: cols,
        rows,
        body: fs.readFileSync(mdPath, 'utf8').replace(/^---[\s\S]*?\n---/, ''),
      });
      if (grid.checked) {
        logicGrids.checked++;
        const show = (s) => cols.map((c) => `${c}=${s[c]}`).join(', ');
        if (!grid.solutions.length) errors.push(`${relMd}: the clues contradict each other (no solution)`);
        else if (grid.solutions.length > 1)
          errors.push(
            `${relMd}: ${grid.solutions.length} solutions fit the clues (${grid.solutions.map(show).join(' | ')}) — a clue is redundant`
          );
        else if (cols.some((c) => grid.solutions[0][c] !== String(data.solution[c])))
          errors.push(`${relMd}: the clues give ${show(grid.solutions[0])}, not the stored solution`);
      } else logicGrids.unchecked++;
    }
  }

  return mdFiles.length;
}

// Find all directories that contain .md files but no index.yaml (orphaned series)
function findOrphanedSeriesDirs(dir) {
  const orphans = [];
  if (!fs.existsSync(dir)) return orphans;
  const walk = (d) => {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    const hasIndex = entries.some((e) => e.isFile() && e.name === 'index.yaml');
    const hasMd = entries.some((e) => e.isFile() && e.name.endsWith('.md'));
    if (hasMd && !hasIndex) orphans.push(d);
    if (!hasIndex) {
      for (const e of entries) {
        if (e.isDirectory()) walk(path.join(d, e.name));
      }
    }
  };
  walk(dir);
  return orphans;
}

// Main
const errors = [];
let seriesCount = 0;
let exerciseCount = 0;
const dirs = ['src/fr/exercices', 'src/fr/applications'];
const defiDirs = ['src/fr/defis'];

// First: flag any series folder missing index.yaml
for (const dir of [...dirs, ...defiDirs]) {
  for (const orphan of findOrphanedSeriesDirs(dir)) {
    const rel = path.relative(process.cwd(), orphan).replace(/\\/g, '/');
    errors.push(`${rel}: missing index.yaml`);
  }
}

for (const dir of dirs) {
  const indexFiles = findFiles(dir, 'index.yaml');
  for (const indexFile of indexFiles) {
    const seriesDir = path.dirname(indexFile);
    seriesCount++;
    const mdCount = validateSeries(seriesDir, errors);
    if (mdCount) exerciseCount += mdCount;
  }
}

// Validate defis — same as exercises plus require "duration"
for (const dir of defiDirs) {
  const indexFiles = findFiles(dir, 'index.yaml');
  for (const indexFile of indexFiles) {
    const seriesDir = path.dirname(indexFile);
    seriesCount++;
    const mdCount = validateSeries(seriesDir, errors);
    if (mdCount) exerciseCount += mdCount;
    // Extra: duration is required for timed challenges
    const rel = path.relative(process.cwd(), seriesDir).replace(/\\/g, '/');
    let meta;
    try {
      meta = yaml.load(fs.readFileSync(indexFile, 'utf8'));
    } catch {
      meta = null;
    }
    if (meta && meta.duration == null) {
      errors.push(`${rel}/index.yaml: missing "duration" (required for timed challenges)`);
    }
  }
}

if (errors.length > 0) {
  console.error(`\n${COLORS.red}${COLORS.bold}${'='.repeat(70)}`);
  console.error(`  EXERCISE VALIDATION: ${errors.length} error(s) found`);
  console.error(`${'='.repeat(70)}${COLORS.reset}`);
  for (const err of errors) {
    console.error(`  ${COLORS.red}-${COLORS.reset} ${err}`);
  }
  console.error('');
  process.exit(1);
} else {
  console.log(
    `\n${COLORS.green}${COLORS.bold}  ✓ ${seriesCount} series, ${exerciseCount} exercises validated${COLORS.reset}\n` +
      `  logic grids: ${logicGrids.checked} with a unique solution, ${logicGrids.unchecked} with descriptive clues (human check)\n`
  );
}
