#!/usr/bin/env node
/**
 * review-failures.js — Interactive review of LLM-flagged exercise failures.
 *
 * For each failed file in the cache:
 *   - Opens the series page in the browser (requires dev server: npm run dev)
 *   - Prompts: y = mark manual:ok, n = keep fail, s = skip
 *
 * Usage: node scripts/review-failures.js [--model=qwen2.5:7b] [--port=8080]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CACHE_PATH = path.join(ROOT, 'reports/validate-llm-cache.csv');

const portArg = process.argv.find((a) => a.startsWith('--port='));
const PORT = portArg ? portArg.split('=')[1] : '8081';
const BASE_URL = `http://localhost:${PORT}`;

// ─── CLI args ─────────────────────────────────────────────────────────────────

const modelArg = process.argv.find((a) => a.startsWith('--model='));
const FILTER_MODEL = modelArg ? modelArg.split('=')[1] : null;

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function parseCSV(content) {
  const lines = content.split('\n').filter((l) => l.trim());
  const headers = lines[0].split(',');
  const rows = lines.slice(1).map((l) => {
    const parts = l.split(',');
    const obj = {};
    headers.forEach((h, i) => (obj[h] = parts[i] ?? ''));
    return obj;
  });
  return { headers, rows };
}

function writeCSV(headers, rows) {
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(headers.map((h) => row[h] ?? '').join(','));
  fs.writeFileSync(CACHE_PATH, lines.join('\n'), 'utf8');
}

function getModelCols(headers) {
  const fixed = new Set(['path', 'seriesId', 'hash', 'manual']);
  return headers.filter((h) => !fixed.has(h));
}

// ─── Browser ──────────────────────────────────────────────────────────────────

function openBrowser(url) {
  try {
    if (process.platform === 'win32') execSync(`start "" "${url}"`, { shell: true });
    else if (process.platform === 'darwin') execSync(`open "${url}"`);
    else execSync(`xdg-open "${url}"`);
  } catch {
    // non-fatal
  }
}

// ─── Path → localhost URL ─────────────────────────────────────────────────────

function getSeriesUrl(mdPath, seriesId) {
  // mdPath: src/fr/exercices/cm1/.../series/01-foo.md
  // URL:    http://localhost:8080/fr/exercices/<seriesId>/
  if (!seriesId) return null;
  const parts = mdPath.replace(/\\/g, '/').split('/');
  // parts[0]=src, parts[1]=fr, parts[2]=exercices|applications|defis
  const lang = parts[1] || 'fr';
  const kind = parts[2] || 'exercices';
  return `${BASE_URL}/${lang}/${kind}/${seriesId}/`;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

const C = {
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(CACHE_PATH)) {
    console.error('Cache not found:', CACHE_PATH);
    process.exit(1);
  }

  const { headers, rows } = parseCSV(fs.readFileSync(CACHE_PATH, 'utf8'));
  const modelCols = FILTER_MODEL ? [FILTER_MODEL].filter((m) => headers.includes(m)) : getModelCols(headers);

  if (FILTER_MODEL && !headers.includes(FILTER_MODEL)) {
    console.error(`Model "${FILTER_MODEL}" not found in cache. Available: ${getModelCols(headers).join(', ')}`);
    process.exit(1);
  }

  const failed = rows.filter((r) => r.manual !== 'ok' && modelCols.some((m) => r[m] === 'fail'));

  if (!failed.length) {
    console.log(`\n${C.green}No failures to review.${C.reset}\n`);
    return;
  }

  console.log(`\n${C.bold}LLM Failure Review${C.reset}  —  ${failed.length} file(s) to review`);
  if (FILTER_MODEL) console.log(`${C.dim}Scoped to model: ${FILTER_MODEL}${C.reset}`);
  console.log(`${C.dim}y = exercise is correct → mark manual:ok`);
  console.log(`n = failure is genuine   → keep as fail`);
  console.log(`s = skip for now${C.reset}\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, res));

  let approved = 0;
  let kept = 0;
  let skipped = 0;

  for (let i = 0; i < failed.length; i++) {
    const row = failed[i];
    const failedBy = modelCols.filter((m) => row[m] === 'fail');
    const seriesUrl = getSeriesUrl(row.path, row.seriesId);

    console.log(`${C.bold}[${i + 1}/${failed.length}]${C.reset} ${row.path}`);
    if (row.seriesId) console.log(`  ${C.dim}Series ID: ${row.seriesId}${C.reset}`);
    console.log(`  ${C.red}Failed by: ${failedBy.join(', ')}${C.reset}`);

    if (seriesUrl) {
      openBrowser(seriesUrl);
      console.log(`  ${C.cyan}→ ${seriesUrl}${C.reset}`);
    } else {
      console.log(`  ${C.yellow}⚠ No series ID — cannot open browser${C.reset}`);
    }

    const answer = (await ask('  Correct? [y/n/s] ')).trim().toLowerCase();

    if (answer === 'y' || answer === 'yes') {
      row.manual = 'ok';
      writeCSV(headers, rows);
      console.log(`  ${C.green}✓ Marked manual:ok${C.reset}\n`);
      approved++;
    } else if (answer === 'n' || answer === 'no') {
      console.log(`  ${C.dim}→ Kept as fail${C.reset}\n`);
      kept++;
    } else {
      console.log(`  ${C.dim}→ Skipped${C.reset}\n`);
      skipped++;
    }
  }

  rl.close();

  console.log(`${C.bold}Done.${C.reset}`);
  console.log(`  ${C.green}Approved (manual:ok):${C.reset} ${approved}`);
  console.log(`  ${C.red}Kept as fail:${C.reset}        ${kept}`);
  console.log(`  ${C.dim}Skipped:${C.reset}             ${skipped}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
