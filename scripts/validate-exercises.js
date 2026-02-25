#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const VALID_DIFFICULTIES = ['facile', 'moyen', 'difficile'];

const TYPE_SCHEMAS = {
  'number-check': { required: ['answer'] },
  'problem':      { required: ['answer'] },
  'matching':     { required: ['pairs'], arrays: ['pairs'], arrayFields: { pairs: ['left', 'right'] } },
  'pyramid':      { required: ['pyramid'], arrays: ['pyramid'] },
  'sequence':     { required: ['given', 'answers'], arrays: ['given', 'answers'] },
  'bounding':     { required: ['number', 'answers'], arrays: ['answers'] },
  'convert':      { required: ['items'], arrays: ['items'], arrayFields: { items: ['prompt', 'answer'] } },
  'logic-grid':   { required: ['columns', 'rows', 'solution'], arrays: ['columns', 'rows'] },
  'true-false':   { required: ['statements'], arrays: ['statements'], arrayFields: { statements: ['text', 'answer'] } },
  'compare':      { required: ['comparisons'], arrays: ['comparisons'], arrayFields: { comparisons: ['left', 'right'] } },
  'multi-question': { required: ['questions'], arrays: ['questions'], arrayFields: { questions: ['text', 'answer'] } },
  'mcq':          { required: ['answer', 'choices'], arrays: ['choices'] },
  'fraction':     { required: ['shape', 'numerator', 'denominator', 'answer'] },
  'base-10':      { required: ['answer'], requireOneOf: [['number'], ['hundreds', 'tens', 'ones']] },
  'clock':        { required: ['hour', 'minute', 'answer'] },
};

const COLORS = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', reset: '\x1b[0m', bold: '\x1b[1m',
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
  try { return yaml.load(match[1]); } catch { return null; }
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
  try { meta = yaml.load(fs.readFileSync(indexPath, 'utf8')); } catch (e) {
    errors.push(`${rel}/index.yaml: invalid YAML — ${e.message}`);
    return;
  }

  if (!meta.seriesTitle) errors.push(`${rel}/index.yaml: missing "seriesTitle"`);
  if (!meta.difficulty) {
    errors.push(`${rel}/index.yaml: missing "difficulty"`);
  } else if (!VALID_DIFFICULTIES.includes(meta.difficulty)) {
    errors.push(`${rel}/index.yaml: invalid difficulty "${meta.difficulty}" (expected: ${VALID_DIFFICULTIES.join(', ')})`);
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
      const satisfied = schema.requireOneOf.some(group => group.every(f => data[f] !== undefined && data[f] !== null));
      if (!satisfied) {
        const options = schema.requireOneOf.map(g => g.join(' + ')).join('" or "');
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

// Main
const errors = [];
let seriesCount = 0;
let exerciseCount = 0;
const dirs = ['src/fr/exercices', 'src/fr/applications'];

for (const dir of dirs) {
  const indexFiles = findFiles(dir, 'index.yaml');
  for (const indexFile of indexFiles) {
    const seriesDir = path.dirname(indexFile);
    seriesCount++;
    const mdCount = validateSeries(seriesDir, errors);
    if (mdCount) exerciseCount += mdCount;
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
  console.log(`\n${COLORS.green}${COLORS.bold}  ✓ ${seriesCount} series, ${exerciseCount} exercises validated${COLORS.reset}\n`);
}
