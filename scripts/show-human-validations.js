#!/usr/bin/env node
/**
 * show-human-validations.js — Display human-validated series from reports/human-validate.csv
 *
 * Usage:
 *   node scripts/show-human-validations.js           # show all
 *   node scripts/show-human-validations.js --last 20 # show last N
 *   node scripts/show-human-validations.js --clear   # delete the CSV (reset)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../reports/human-validate.csv');

const args = process.argv.slice(2);
const doClear = args.includes('--clear');
const lastArg = args.indexOf('--last');
const lastN = lastArg !== -1 ? parseInt(args[lastArg + 1], 10) || 20 : null;

const C = {
  bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', cyan: '\x1b[36m', yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

if (doClear) {
  if (fs.existsSync(CSV_PATH)) {
    fs.unlinkSync(CSV_PATH);
    console.log(`${C.yellow}Cleared: ${CSV_PATH}${C.reset}`);
  } else {
    console.log('No human-validate.csv found — nothing to clear.');
  }
  process.exit(0);
}

if (!fs.existsSync(CSV_PATH)) {
  console.log(`\n${C.dim}No validations yet. Complete a series on localhost and click "Valider".${C.reset}\n`);
  process.exit(0);
}

const lines = fs.readFileSync(CSV_PATH, 'utf8').split('\n').filter((l) => l.trim());
const headers = lines[0].split(',');
const rows = lines.slice(1).map((l) => {
  const parts = l.split(',');
  const obj = {};
  headers.forEach((h, i) => (obj[h] = parts[i] ?? ''));
  return obj;
});

const display = lastN ? rows.slice(-lastN) : rows;

// ── Summary stats ─────────────────────────────────────────────────────────────
const seriesMap = {};
for (const row of rows) {
  if (!row.seriesId) continue;
  if (!seriesMap[row.seriesId]) seriesMap[row.seriesId] = [];
  seriesMap[row.seriesId].push(row.validatedAt);
}
const seriesEntries = Object.values(seriesMap);
const fullySeries  = seriesEntries.filter((ts) => ts.length > 0 && ts.every((t) => t)).length;
const partialSeries = seriesEntries.filter((ts) => ts.some((t) => t) && !ts.every((t) => t)).length;
const unstartedSeries = seriesEntries.filter((ts) => ts.every((t) => !t)).length;
const validatedFiles = rows.filter((r) => r.validatedAt).length;
const totalSeries = seriesEntries.length;

const pct = totalSeries > 0 ? Math.round((fullySeries / totalSeries) * 100) : 0;
const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));

console.log(`\n${C.bold}Human Validations${C.reset}`);
console.log(`${C.dim}─`.repeat(50) + C.reset);
console.log(`  Files     : ${C.bold}${validatedFiles}${C.reset} / ${rows.length} validated`);
console.log(`  Series    : ${C.green}${fullySeries} fully${C.reset}  ${C.yellow}${partialSeries} partial${C.reset}  ${C.dim}${unstartedSeries} not started${C.reset}  (${totalSeries} total)`);
console.log(`  Progress  : ${C.cyan}${bar}${C.reset} ${pct}%`);
console.log(`${C.dim}─`.repeat(50) + C.reset);
if (lastN && rows.length > lastN) console.log(`${C.dim}Showing last ${lastN} rows${C.reset}`);

const colW = { id: 10, hash: 18, path: 52, at: 22 };
const LINE = '─'.repeat(colW.id + colW.hash + colW.path + colW.at);
console.log(
  'SERIES ID'.padEnd(colW.id) +
  'HASH'.padEnd(colW.hash) +
  'FILE'.padEnd(colW.path) +
  'VALIDATED AT'
);
console.log(LINE);

let lastTs = null;
for (const row of display) {
  const at = row.validatedAt ? new Date(row.validatedAt).toLocaleString('fr-FR') : '?';
  const showTs = row.validatedAt !== lastTs;
  lastTs = row.validatedAt;
  const shortPath = (row.path || '').replace('src/fr/', '').slice(0, colW.path - 1);
  console.log(
    `${C.green}${(row.seriesId || '').padEnd(colW.id)}${C.reset}` +
    `${C.dim}${(row.hash || '').padEnd(colW.hash)}${C.reset}` +
    `${C.cyan}${shortPath.padEnd(colW.path)}${C.reset}` +
    (showTs ? `${C.dim}${at}${C.reset}` : '')
  );
}

console.log(LINE);
console.log(`Total: ${C.bold}${rows.length}${C.reset} file validations across ${C.bold}${totalSeries}${C.reset} series\n`);
