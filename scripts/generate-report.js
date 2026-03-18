#!/usr/bin/env node
/**
 * generate-report.js — Audit report for all exercises and applications.
 *
 * Outputs a CSV (and a console summary) for gap analysis.
 * Usage: node scripts/generate-report.js [--output=report.csv]
 *
 * Columns:
 *   kind, path, id, seriesTitle, level, subject, topic, difficulty,
 *   exerciseCount, repeatTotal, types, generators, classes
 */
'use strict';
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ─── Config ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const SCAN = [
  { dir: path.join(ROOT, 'src/fr/exercices'), kind: 'exercice' },
  { dir: path.join(ROOT, 'src/fr/applications'), kind: 'application' },
];
const outputArg = process.argv.find((a) => a.startsWith('--output='));
const OUTPUT = outputArg ? path.resolve(outputArg.split('=')[1]) : path.join(ROOT, 'exercises-report.csv');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findDirs(dir) {
  /** Return all direct subdirectories (series folders). */
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join(dir, e.name));
}

function findSeriesDirs(rootDir) {
  /** Recursively find directories that contain an index.yaml. */
  const results = [];
  const walk = (d) => {
    const indexPath = path.join(d, 'index.yaml');
    if (fs.existsSync(indexPath)) {
      results.push(d);
      return; // don't recurse further inside a series
    }
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(d, e.name));
    }
  };
  walk(rootDir);
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

function csvField(v) {
  /** Quote a CSV field if it contains commas, quotes, or newlines. */
  const s = String(v ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

// ─── Scan ─────────────────────────────────────────────────────────────────────

const rows = [];

for (const { dir: scanRoot, kind } of SCAN) {
  for (const seriesDir of findSeriesDirs(scanRoot)) {
    const indexPath = path.join(seriesDir, 'index.yaml');
    let meta = {};
    try {
      meta = yaml.load(fs.readFileSync(indexPath, 'utf8')) || {};
    } catch {}

    // Relative path from ROOT/src — e.g. "fr/exercices/cm1/maths/numeration/calcul-mental-01"
    const relPath = path.relative(path.join(ROOT, 'src'), seriesDir).replace(/\\/g, '/');

    // Derive level/subject/topic from path (same logic as eleventy, never needs YAML)
    const parts = relPath.split('/'); // [fr, exercices|applications, level, subject, topic, series]
    const level = (parts[2] || '').toUpperCase();
    const subject = parts[3] || '';
    const topic = parts[4] || '';

    // Scan .md exercise files
    const mdFiles = fs.existsSync(seriesDir)
      ? fs
          .readdirSync(seriesDir)
          .filter((f) => f.endsWith('.md'))
          .map((f) => path.join(seriesDir, f))
      : [];

    const types = new Set();
    const generators = new Set();
    const classes = new Set();
    let repeatTotal = 0;

    for (const mdPath of mdFiles) {
      const data = parseFrontmatter(mdPath);
      if (!data) continue;
      const t = data.type || 'number-check';
      types.add(t);
      if (data.generator) generators.add(data.generator);
      if (data.class) classes.add(data.class);
      const repeat = data.repeat ?? 1;
      repeatTotal += repeat;
    }

    rows.push({
      kind,
      path: relPath,
      id: meta.id ?? '',
      seriesTitle: meta.seriesTitle ?? '',
      level,
      subject,
      topic,
      difficulty: meta.difficulty ?? '',
      exerciseCount: mdFiles.length,
      repeatTotal,
      types: [...types].join(' | '),
      generators: [...generators].join(' | '),
      classes: [...classes].sort().join(' | '),
    });
  }
}

// Sort: level → topic → difficulty → path
const LEVEL_ORDER = { CP: 0, CE1: 1, CE2: 2, CM1: 3, CM2: 4 };
const DIFF_ORDER = { facile: 0, moyen: 1, difficile: 2 };
rows.sort((a, b) => {
  const lA = LEVEL_ORDER[a.level] ?? 99,
    lB = LEVEL_ORDER[b.level] ?? 99;
  if (lA !== lB) return lA - lB;
  if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
  if (a.topic !== b.topic) return a.topic.localeCompare(b.topic);
  const dA = DIFF_ORDER[a.difficulty] ?? 99,
    dB = DIFF_ORDER[b.difficulty] ?? 99;
  if (dA !== dB) return dA - dB;
  return a.path.localeCompare(b.path);
});

// ─── CSV output ───────────────────────────────────────────────────────────────

const COLUMNS = [
  'kind',
  'path',
  'id',
  'seriesTitle',
  'level',
  'subject',
  'topic',
  'difficulty',
  'exerciseCount',
  'repeatTotal',
  'types',
  'generators',
  'classes',
];

const lines = [COLUMNS.join(',')];
for (const row of rows) {
  lines.push(COLUMNS.map((c) => csvField(row[c])).join(','));
}
fs.writeFileSync(OUTPUT, lines.join('\n'), 'utf8');

// ─── Console summary ──────────────────────────────────────────────────────────

const C = {
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  reset: '\x1b[0m',
};

console.log(`\n${C.bold}Exercise audit report${C.reset}  →  ${OUTPUT}`);
console.log(`${C.dim}${'─'.repeat(60)}${C.reset}`);
console.log(`${C.bold}Total series:${C.reset} ${rows.length}`);

// By level
const byLevel = {};
for (const r of rows) {
  byLevel[r.level] = (byLevel[r.level] || 0) + 1;
}
console.log(`\n${C.cyan}By level:${C.reset}`);
for (const [lv, cnt] of Object.entries(byLevel).sort((a, b) => (LEVEL_ORDER[a[0]] ?? 99) - (LEVEL_ORDER[b[0]] ?? 99))) {
  console.log(`  ${lv.padEnd(5)} ${cnt}`);
}

// By type (across all exercises)
const byType = {};
for (const r of rows) {
  for (const t of r.types.split(' | ').filter(Boolean)) {
    byType[t] = (byType[t] || 0) + 1;
  }
}
console.log(`\n${C.cyan}By exercise type (series using it):${C.reset}`);
for (const [t, cnt] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${t.padEnd(20)} ${cnt}`);
}

// Generator usage
const genSeries = rows.filter((r) => r.generators).length;
console.log(`\n${C.cyan}Generator-based series:${C.reset} ${genSeries} / ${rows.length}`);

// Vergnaud class coverage
const byClass = {};
for (const r of rows) {
  for (const cls of r.classes.split(' | ').filter(Boolean)) {
    byClass[cls] = (byClass[cls] || 0) + 1;
  }
}
const ALL_CODES = [
  'A1.1','A1.2',
  'A2.1','A2.2','A2.3','A2.4',
  'A3.1','A3.2','A3.3',
  'A4.1','A4.2','A4.3',
  'M1.1','M1.2','M1.3','M1.4',
  'M2.1','M2.2','M2.3',
  'M3.1','M3.2','M3.3','M3.4',
];
console.log(`\n${C.cyan}Vergnaud class coverage (series count):${C.reset}`);
for (const code of ALL_CODES) {
  const cnt = byClass[code] || 0;
  const bar = cnt ? `${'█'.repeat(Math.min(cnt, 20))} ${cnt}` : `${C.dim}—${C.reset}`;
  console.log(`  ${code.padEnd(6)} ${bar}`);
}
const uncovered = ALL_CODES.filter((c) => !byClass[c]);
if (uncovered.length) {
  console.log(`\n${C.yellow}⚠  Codes with no exercises: ${uncovered.join(', ')}${C.reset}`);
}

// Missing fields (level/subject/topic are always inferred from path, not checked)
const missing = rows.filter((r) => !r.id || !r.difficulty);
if (missing.length) {
  console.log(`\n${C.yellow}⚠  Series with incomplete metadata (${missing.length}):${C.reset}`);
  for (const r of missing) {
    const issues = [];
    if (!r.id) issues.push('no id');
    if (!r.difficulty) issues.push('no difficulty');
    console.log(`  ${r.path}  [${issues.join(', ')}]`);
  }
}

console.log(`\n${C.green}✓ Done${C.reset}\n`);
