#!/usr/bin/env node
/**
 * sync-human-validations.js — Keep human-validate.csv in sync with exercise files.
 *
 * - Adds new exercise files (validatedAt empty = not yet validated)
 * - Clears validatedAt when a file's content has changed since validation
 * - Removes entries for files that no longer exist
 *
 * Usage:
 *   node scripts/sync-human-validations.js          # dry-run: show what would change
 *   node scripts/sync-human-validations.js --write  # apply changes
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'reports/human-validate.csv');

const EXERCISE_ROOTS = ['src/fr/exercices', 'src/fr/applications', 'src/fr/defis']
  .map((r) => path.join(ROOT, r));

const doWrite = process.argv.includes('--write');

const C = {
  bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fileHash(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').slice(0, 16);
}

function getSeriesId(dir) {
  try {
    const m = fs.readFileSync(path.join(dir, 'index.yaml'), 'utf8').match(/^id:\s*(\S+)/m);
    return m ? m[1] : null;
  } catch (_) { return null; }
}

function findExerciseFiles() {
  const results = [];
  function scan(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(full);
      } else if (entry.name.endsWith('.md') && !entry.name.startsWith('_')) {
        const seriesId = getSeriesId(path.dirname(full));
        if (seriesId) results.push({ absPath: full, seriesId });
      }
    }
  }
  for (const r of EXERCISE_ROOTS) scan(r);
  return results;
}

// ── CSV ───────────────────────────────────────────────────────────────────────

function readCsv() {
  if (!fs.existsSync(CSV_PATH)) return new Map();
  const lines = fs.readFileSync(CSV_PATH, 'utf8').split('\n').filter((l) => l.trim());
  const map = new Map();
  for (const line of lines.slice(1)) {
    const parts = line.split(',');
    map.set(parts[0], { path: parts[0], seriesId: parts[1] || '', hash: parts[2] || '', validatedAt: parts[3] || '' });
  }
  return map;
}

function writeCsv(map) {
  const rows = [...map.values()].sort((a, b) => a.path.localeCompare(b.path));
  const lines = ['path,seriesId,hash,validatedAt', ...rows.map((r) => `${r.path},${r.seriesId},${r.hash},${r.validatedAt}`)];
  fs.writeFileSync(CSV_PATH, lines.join('\n') + '\n', 'utf8');
}

// ── Main ──────────────────────────────────────────────────────────────────────

const existing = readCsv();
const files = findExerciseFiles();
const updated = new Map(existing);
const seen = new Set();

let added = 0;
let invalidated = 0;
let removed = 0;

console.log(`\n${C.bold}Sync human validations${C.reset}  (${doWrite ? 'write mode' : 'dry-run — use --write to apply'})\n`);

for (const { absPath, seriesId } of files) {
  const relPath = path.relative(ROOT, absPath).replace(/\\/g, '/');
  seen.add(relPath);
  const hash = fileHash(absPath);
  const entry = existing.get(relPath);

  if (!entry) {
    updated.set(relPath, { path: relPath, seriesId, hash, validatedAt: '' });
    console.log(`  ${C.green}+${C.reset} NEW       ${relPath}`);
    added++;
  } else if (entry.hash !== hash) {
    const wasValidated = !!entry.validatedAt;
    updated.set(relPath, { path: relPath, seriesId, hash, validatedAt: '' });
    console.log(
      `  ${C.yellow}~${C.reset} CHANGED   ${relPath}` +
      (wasValidated ? `  ${C.dim}(validation cleared)${C.reset}` : '')
    );
    invalidated++;
  }
}

for (const relPath of existing.keys()) {
  if (!seen.has(relPath)) {
    updated.delete(relPath);
    console.log(`  ${C.red}-${C.reset} REMOVED   ${relPath}`);
    removed++;
  }
}

const unchanged = files.length - added - invalidated;

if (added + invalidated + removed === 0) {
  console.log(`  ${C.dim}All ${files.length} exercise files are up to date.${C.reset}`);
} else {
  console.log(
    `\n${C.bold}Summary:${C.reset} ` +
    `${C.green}${added} added${C.reset}, ` +
    `${C.yellow}${invalidated} changed${C.reset} (validation cleared), ` +
    `${C.red}${removed} removed${C.reset}, ` +
    `${C.dim}${unchanged} unchanged${C.reset}`
  );
  if (doWrite) {
    writeCsv(updated);
    console.log(`\n${C.green}Written:${C.reset} ${CSV_PATH}`);
  } else {
    console.log(`\nRun with ${C.bold}--write${C.reset} to apply.`);
  }
}

console.log('');
