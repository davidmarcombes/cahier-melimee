#!/usr/bin/env node
/**
 * show-type.js — Quick reference for exercise type schemas and templates.
 *
 * Usage:
 *   node scripts/show-type.js              # list all types with one-line summary
 *   node scripts/show-type.js problem      # full schema + template + live examples
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ── Schemas (mirrors validate-exercises.js TYPE_SCHEMAS) ─────────────────────

const TYPE_SCHEMAS = {
  'number-check':   { required: [], requireOneOf: [['answer'], ['answers'], ['generator']], desc: 'Simple operation with answer input (trou / generator supported)' },
  problem:          { required: [], requireOneOf: [['answer'], ['answers'], ['generator']], desc: 'Word problem — markdown body is the story, answer is numerical/text' },
  matching:         { required: ['pairs'], desc: 'Match left↔right pairs (pairs[].left + pairs[].right)' },
  pyramid:          { required: ['pyramid'], desc: 'Addition pyramid — 2D array, null = blank cell to fill' },
  sequence:         { required: ['given', 'answers'], desc: 'Number sequence — given[] visible, answers[] to fill' },
  bounding:         { required: ['number', 'answers'], desc: 'Encadrement — number shown, answers[min, max] to fill' },
  convert:          { required: ['items'], desc: 'Unit conversion — items[].prompt + items[].answer' },
  'logic-grid':     { required: ['columns', 'rows', 'solution'], desc: 'Logic grid — columns[], rows[], solution{row:col}' },
  'true-false':     { required: ['statements'], desc: 'Vrai/Faux — statements[].text + statements[].answer (bool)' },
  compare:          { required: ['comparisons'], desc: 'Compare pairs — comparisons[].left + comparisons[].right' },
  'multi-question': { required: ['questions'], desc: 'Context + sub-questions — questions[].text + questions[].answer; markdown body = scenario' },
  mcq:              { required: ['answer', 'choices'], desc: 'QCM — choices[] shuffled at runtime, answer = correct value' },
  fraction:         { required: ['shape', 'numerator', 'denominator', 'answer'], desc: 'Shade a shape — shape: circle|rect' },
  'base-10':        { required: ['answer'], requireOneOf: [['number'], ['hundreds', 'tens', 'ones']], desc: 'Base-10 blocks — decompose hundreds/tens/ones' },
  clock:            { required: ['hour', 'minute', 'answer'], desc: 'Analog clock — read or write time (answer: "HH:MM")' },
  sort:             { required: ['items'], desc: 'Click-to-rank — items[] in CORRECT order (shuffled at runtime)' },
  'drag-sort':      { required: ['tiles'], desc: 'Swap-to-sort — tiles[] in CORRECT order, direction: asc|desc' },
  'fill-table':     { required: ['headers', 'rows', 'answers'], desc: 'Table with blanks — ? marks the blanks, answers[] lists values' },
  checkbox:         { required: ['statements', 'checkedAnswers'], desc: 'Tick true statements — checkedAnswers[] = 0-indexed correct indices' },
  select:           { required: ['choices', 'statements'], desc: 'Dropdown completion — choices[] + statements[].template (___) + .answer' },
  'svg-tiles':      { required: ['tiles', 'answers'], desc: 'SVG tile grid — tiles[].gen + tiles[].par, answers[] = 0-indexed' },
  'tile-select':    { required: ['tiles', 'tileAnswers'], desc: 'Click correct tiles — tiles[] (HTML strings), tileAnswers[] = 0-indexed' },
  'fraction-check': { required: [], requireOneOf: [['answer'], ['answers']], desc: 'Fraction input — answers[numerator, denominator] or answer: "n/d"' },
  ruler:            { required: [], desc: 'Graduated ruler — min, max, divisions, markers[].label + .value; answer = value read' },
  'click-blocks':   { required: ['columns'], desc: 'Place-value blocks — columns[].label, .value, .color, .answer, .max' },
  'number-line':    { required: ['min', 'max', 'answer'], desc: 'Number line — place or read a value; step optional' },
  'coordinate-grid':{ required: ['answer'], desc: 'Grid read/place — mode: read|place, cols, rows, points[].x/y/label' },
  'bar-chart':      { required: ['labels', 'values', 'yMax', 'yStep'], desc: 'Bar chart — labels[], values[], axis config' },
  'calc-chain':     { required: ['start', 'steps'], desc: 'Calc chain — start value + steps[].op + steps[].value + steps[].answer' },
  'number-hunt':    { required: [], desc: 'Find numbers in a grid (CP specific)' },
  'compare-groups': { required: [], desc: 'Compare groups of objects (CP specific)' },
  'count-objects':  { required: [], desc: 'Count items in an image (CP specific)' },
  'seq-verify':     { required: [], desc: 'Shared verify button partial for sequence/bounding/convert (not a standalone type)' },
  'fraction-paint': { required: [], desc: 'Paint fractions of a shape (not yet in use)' },
  'column-op':      { required: ['top', 'operation', 'result'], desc: 'Vertical operation — top[], operation (+/-/×/÷), result; NOT wired into series-player' },
};

// ── Templates (YAML snippet for front-matter) ─────────────────────────────────

const TEMPLATES = {
  'number-check':   `type: number-check\ntitle: ""\nanswer: ""\noperation: ""`,
  problem:          `type: problem\nclass: "A2.1"\ntitle: ""\nanswer: ""`,
  matching:         `type: matching\ntitle: ""\npairs:\n  - left: ""\n    right: ""\n  - left: ""\n    right: ""`,
  pyramid:          `type: pyramid\ntitle: ""\npyramid:\n  - [null, null, null]\n  - [null, null]\n  - []`,
  sequence:         `type: sequence\ntitle: ""\ngiven: [2, 4, null, 8, null]\nanswers: [6, 10]`,
  bounding:         `type: bounding\ntitle: ""\nnumber: 47\nanswers: [40, 50]`,
  convert:          `type: convert\ntitle: ""\nitems:\n  - prompt: "3 m = ___ cm"\n    answer: "300"\n    unit: "cm"`,
  'logic-grid':     `type: logic-grid\ntitle: ""\ncolumns: ["Rouge", "Bleu", "Vert"]\nrows: ["Alice", "Bruno", "Carla"]\nsolution:\n  "Alice": "Rouge"\n  "Bruno": "Bleu"\n  "Carla": "Vert"`,
  'true-false':     `type: true-false\ntitle: ""\nstatements:\n  - text: ""\n    answer: true\n  - text: ""\n    answer: false`,
  compare:          `type: compare\ntitle: ""\ncomparisons:\n  - left: 45\n    right: 54\n  - left: 100\n    right: 99`,
  'multi-question': `type: multi-question\ntitle: ""\nquestions:\n  - text: ""\n    answer: ""\n  - text: ""\n    answer: ""`,
  mcq:              `type: mcq\ntitle: ""\nanswer: "🔵"\nchoices:\n  - "🔴"\n  - "🔵"\n  - "🟡"`,
  fraction:         `type: fraction\ntitle: ""\nshape: circle\nnumerator: 1\ndenominator: 4\nanswer: "1/4"`,
  'base-10':        `type: base-10\ntitle: ""\nnumber: 34\nanswer: "34"`,
  clock:            `type: clock\ntitle: ""\nhour: 10\nminute: 30\nanswer: "10:30"`,
  sort:             `type: sort\ntitle: ""\ndirection: asc\nitems:\n  - "12"\n  - "35"\n  - "67"\n  - "89"`,
  'drag-sort':      `type: drag-sort\ntitle: ""\ndirection: asc\ntiles:\n  - "12"\n  - "35"\n  - "67"`,
  'fill-table':     `type: fill-table\ntitle: ""\nheaders: ["×", "3", "4", "5"]\nrows:\n  - ["2", "?", "8", "?"]\nanswers:\n  - ["6", "10"]`,
  checkbox:         `type: checkbox\ntitle: ""\nstatements:\n  - "Affirmation vraie"\n  - "Affirmation fausse"\n  - "Affirmation vraie"\ncheckedAnswers: [0, 2]`,
  select:           `type: select\ntitle: ""\nchoices: ["plus grand", "plus petit", "égal"]\nstatements:\n  - template: "45 est ___ que 54"\n    answer: "plus petit"`,
  'tile-select':    `type: tile-select\ntitle: ""\ntiles:\n  - "12"\n  - "24"\n  - "35"\n  - "48"\ntileAnswers: [1, 3]`,
  'fraction-check': `type: fraction-check\ntitle: ""\nanswers:\n  - "1"\n  - "3"`,
  ruler:            `type: ruler\ntitle: ""\nmin: 0\nmax: 10\ndivisions: 10\nmarkers:\n  - label: "A"\n    value: 7\nanswer: "7"`,
  'number-line':    `type: number-line\ntitle: ""\nmin: 0\nmax: 100\nstep: 10\nanswer: "70"`,
  'coordinate-grid':`type: coordinate-grid\nmode: read\ncols: 4\nrows: 4\ntitle: ""\npoints:\n  - x: 2\n    y: 3\n    label: A\nanswer: "2,3"`,
  'bar-chart':      `type: bar-chart\ntitle: ""\nlabels: ["Chat", "Chien", "Lapin"]\nvalues: [8, 5, 3]\nyMax: 10\nyStep: 2`,
  'calc-chain':     `type: calc-chain\ntitle: ""\nstart: 15\nsteps:\n  - op: "+"\n    value: 8\n    answer: 23\n  - op: "-"\n    value: 6\n    answer: 17`,
};

// ── Filesystem helpers ────────────────────────────────────────────────────────

const EXERCISES_ROOT = path.resolve(__dirname, '../src/fr/exercices');

function findMdFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findMdFiles(full));
    else if (entry.name.endsWith('.md') && !entry.name.startsWith('_')) results.push(full);
  }
  return results;
}

function getTypeFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const m = content.match(/^---\r?\n[\s\S]*?^type:\s*(\S+)/m);
    return m ? m[1].replace(/['"]/g, '') : 'number-check';
  } catch { return null; }
}

function readFirstBlock(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Get content up to the second `---` separator or end
    const parts = content.split(/^---$/m);
    if (parts.length >= 3) {
      // front-matter is between first and second ---
      const fm = parts[1].trim();
      const body = parts[2].trim().slice(0, 200);
      return { fm, body };
    }
    return { fm: parts[1]?.trim() || content.slice(0, 300), body: '' };
  } catch { return null; }
}

function findExamplesForType(type, maxCount = 2) {
  const results = [];
  const allMd = findMdFiles(EXERCISES_ROOT);
  for (const f of allMd) {
    if (getTypeFromFile(f) === type) {
      results.push(f);
      if (results.length >= maxCount) break;
    }
  }
  return results;
}

// ── Output helpers ────────────────────────────────────────────────────────────

function printTypeDetail(type) {
  const schema = TYPE_SCHEMAS[type];
  if (!schema) {
    console.error(`Unknown type: "${type}". Run without arguments to list all types.`);
    process.exit(1);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`TYPE: ${type}`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`DESC: ${schema.desc}`);

  // Schema
  console.log('\nSCHEMA:');
  if (schema.required?.length) {
    console.log(`  required:     ${schema.required.join(', ')}`);
  }
  if (schema.requireOneOf) {
    console.log(`  one of:       ${schema.requireOneOf.map(g => `[${g.join('|')}]`).join(' or ')}`);
  }
  if (schema.arrays?.length) {
    console.log(`  arrays:       ${schema.arrays.join(', ')}`);
  }
  if (schema.arrayFields) {
    for (const [arr, fields] of Object.entries(schema.arrayFields)) {
      console.log(`  ${arr}[]:       each needs: ${fields.join(', ')}`);
    }
  }

  // Template
  const template = TEMPLATES[type];
  if (template) {
    console.log('\nTEMPLATE (front-matter only — add title + body as needed):');
    console.log('  ---');
    template.split('\n').forEach(l => console.log(`  ${l}`));
    console.log('  ---');
  }

  // Live examples
  const examples = findExamplesForType(type);
  if (examples.length === 0) {
    console.log('\nEXAMPLES: (none found in src/fr/exercices)');
  } else {
    console.log('\nEXAMPLES:');
    for (const ex of examples) {
      const rel = path.relative(process.cwd(), ex).replace(/\\/g, '/');
      const block = readFirstBlock(ex);
      console.log(`\n  ${rel}`);
      if (block) {
        console.log('  ---');
        block.fm.split('\n').forEach(l => console.log(`  ${l}`));
        console.log('  ---');
        if (block.body) {
          block.body.split('\n').slice(0, 5).forEach(l => console.log(`  ${l}`));
        }
      }
    }
  }
  console.log('');
}

function printAllTypes() {
  const maxLen = Math.max(...Object.keys(TYPE_SCHEMAS).map(t => t.length));
  console.log(`\n${'TYPE'.padEnd(maxLen + 2)} REQUIRED FIELDS / NOTES`);
  console.log('─'.repeat(80));
  for (const [type, schema] of Object.entries(TYPE_SCHEMAS)) {
    const reqs = [
      ...(schema.required || []),
      ...(schema.requireOneOf ? [`one-of:[${schema.requireOneOf.map(g => g.join('|')).join(', ')}]`] : []),
    ].join(', ') || '(none)';
    console.log(`${type.padEnd(maxLen + 2)} ${reqs}`);
    console.log(`${''.padEnd(maxLen + 2)} → ${schema.desc}`);
    console.log('');
  }
  console.log('Run: node scripts/show-type.js <type>   for template + live examples\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

const arg = process.argv[2];
if (arg) {
  printTypeDetail(arg);
} else {
  printAllTypes();
}
