#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const VALID_DIFFICULTIES = ['facile', 'moyen', 'difficile'];

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
  const mdFiles = findFiles(seriesDir, '*.md');
  for (const mdPath of mdFiles) {
    const relMd = path.relative(process.cwd(), mdPath).replace(/\\/g, '/');
    const data = parseFrontmatter(mdPath);
    if (!data) {
      errors.push(`${relMd}: missing or invalid frontmatter`);
      continue;
    }

    // Skip generated exercises
    if (data.generator) continue;

    const type = data.type || 'number-check';
    const schema = TYPE_SCHEMAS[type];
    if (!schema) {
      errors.push(`${relMd}: unknown type "${type}"`);
      continue;
    }

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
    `\n${COLORS.green}${COLORS.bold}  ✓ ${seriesCount} series, ${exerciseCount} exercises validated${COLORS.reset}\n`
  );
}
