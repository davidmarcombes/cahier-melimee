#!/usr/bin/env node
/**
 * list-series.js — List exercise series with optional filtering.
 *
 * Usage:
 *   node scripts/list-series.js                          # all series
 *   node scripts/list-series.js --level cp               # CP only
 *   node scripts/list-series.js --level ce1 --type mcq   # CE1 MCQ only
 *   node scripts/list-series.js --type problem           # all problem series
 *   node scripts/list-series.js --cat operations         # all operations series
 *   node scripts/list-series.js --missing                # types with 0 exercises
 */
'use strict';

const fs = require('fs');
const path = require('path');

const EXERCISES_ROOT = path.resolve(__dirname, '../src/fr/exercices');

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
}
const filterLevel    = getArg('--level');
const filterType     = getArg('--type');
const filterCat      = getArg('--cat');
const showMissing    = args.includes('--missing');

// ── Helpers ───────────────────────────────────────────────────────────────────

function findIndexYamls(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findIndexYamls(full));
    else if (entry.name === 'index.yaml') results.push(full);
  }
  return results;
}

function parseYamlSimple(content) {
  const obj = {};
  for (const line of content.split('\n')) {
    const m = line.match(/^(\w[\w-]*):\s*["']?(.+?)["']?\s*$/);
    if (m) obj[m[1]] = m[2];
  }
  return obj;
}

function getTypesFromDir(seriesDir) {
  const types = new Set();
  try {
    for (const f of fs.readdirSync(seriesDir)) {
      if (!f.endsWith('.md')) continue;
      const content = fs.readFileSync(path.join(seriesDir, f), 'utf8');
      // Scan all front-matter blocks in multi-exercise files
      const blocks = content.split(/\n---\n/);
      for (const block of blocks) {
        const m = block.match(/type:\s*["']?([^\s"']+)/);
        if (m) types.add(m[1]);
      }
    }
  } catch (_) { /* unreadable file — skip */ }
  return [...types];
}

// ── Collect series ────────────────────────────────────────────────────────────

const indexFiles = findIndexYamls(EXERCISES_ROOT);

const series = [];
for (const indexPath of indexFiles) {
  const rel = path.relative(EXERCISES_ROOT, indexPath).replace(/\\/g, '/');
  // expected: {level}/maths/{category}/{slug}/index.yaml
  const parts = rel.split('/');
  if (parts.length < 4) continue;

  const level    = parts[0];
  const category = parts[2];
  const slug     = parts[3];

  const content = fs.readFileSync(indexPath, 'utf8');
  const meta    = parseYamlSimple(content);
  const id      = meta.id || '(no id)';
  const title   = meta.seriesTitle || '(untitled)';
  const diff    = meta.difficulty  || '—';

  const seriesDir = path.dirname(indexPath);
  const types = getTypesFromDir(seriesDir);

  series.push({ level, category, slug, types, title, diff, id });
}

// ── Missing types report ──────────────────────────────────────────────────────

if (showMissing) {
  const ALL_TYPES = [
    'number-check','problem','matching','pyramid','sequence','bounding','convert',
    'logic-grid','true-false','compare','multi-question','mcq','fraction','base-10',
    'clock','sort','drag-sort','fill-table','checkbox','select','svg-tiles',
    'tile-select','fraction-check','ruler','click-blocks','number-line',
    'coordinate-grid','bar-chart','calc-chain','number-hunt','compare-groups','count-objects',
  ];
  const usedTypes = new Set(series.flatMap(s => s.types));
  const missing = ALL_TYPES.filter(t => !usedTypes.has(t));
  console.log(`\nTypes with NO exercises (${missing.length}):\n`);
  missing.forEach(t => console.log(`  ❌ ${t}`));
  console.log('');

  console.log('Types by usage count:\n');
  const counts = {};
  for (const t of ALL_TYPES) counts[t] = 0;
  for (const s of series) s.types.forEach(t => { if (counts[t] !== undefined) counts[t]++; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  for (const [t, n] of sorted) {
    const bar = '█'.repeat(Math.min(n, 40));
    console.log(`  ${t.padEnd(20)} ${String(n).padStart(3)}  ${bar}`);
  }
  console.log('');
  process.exit(0);
}

// ── Filter ────────────────────────────────────────────────────────────────────

let filtered = series;
if (filterLevel) filtered = filtered.filter(s => s.level === filterLevel);
if (filterType)  filtered = filtered.filter(s => s.types.includes(filterType));
if (filterCat)   filtered = filtered.filter(s => s.category === filterCat);

// ── Sort: level, category, slug ───────────────────────────────────────────────

const LEVEL_ORDER = ['cp','ce1','ce2','cm1','cm2','6e'];
filtered.sort((a, b) => {
  const li = LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level);
  if (li !== 0) return li;
  const ci = a.category.localeCompare(b.category);
  if (ci !== 0) return ci;
  return a.slug.localeCompare(b.slug);
});

// ── Print ─────────────────────────────────────────────────────────────────────

const colW = { level: 5, cat: 14, slug: 28, type: 20, title: 38, id: 10 };

function header() {
  return [
    'LEVEL'.padEnd(colW.level),
    'CATEGORY'.padEnd(colW.cat),
    'SLUG'.padEnd(colW.slug),
    'TYPE(S)'.padEnd(colW.type),
    'TITLE'.padEnd(colW.title),
    'ID',
  ].join(' ');
}

console.log(`\n${header()}`);
console.log('─'.repeat(Object.values(colW).reduce((a,b)=>a+b,0) + 6));

for (const s of filtered) {
  const row = [
    s.level.padEnd(colW.level),
    s.category.slice(0, colW.cat - 1).padEnd(colW.cat),
    s.slug.slice(0, colW.slug - 1).padEnd(colW.slug),
    s.types.join(',').slice(0, colW.type - 1).padEnd(colW.type),
    s.title.slice(0, colW.title - 1).padEnd(colW.title),
    s.id,
  ].join(' ');
  console.log(row);
}

console.log(`\nTotal: ${filtered.length} series`);
if (filterLevel || filterType || filterCat) {
  const filters = [filterLevel && `--level ${filterLevel}`, filterType && `--type ${filterType}`, filterCat && `--cat ${filterCat}`].filter(Boolean).join(' ');
  console.log(`Filters: ${filters}`);
}
console.log('');
