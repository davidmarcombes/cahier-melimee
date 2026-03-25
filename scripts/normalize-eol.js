#!/usr/bin/env node
/**
 * normalize-eol.js — Convert CRLF to LF in all exercise source files.
 *
 * Run as part of generate:commit to ensure consistent line endings
 * before hashes are synced, avoiding CRLF/LF mismatches across platforms.
 *
 * Usage:
 *   node scripts/normalize-eol.js          # dry-run: show what would change
 *   node scripts/normalize-eol.js --write  # apply changes
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIRS = ['src/fr/exercices', 'src/fr/applications', 'src/fr/defis']
  .map(r => path.join(ROOT, r));
const EXTENSIONS = new Set(['.md', '.yaml', '.yml']);

const doWrite = process.argv.includes('--write');

const C = {
  bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

function walkFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkFiles(full));
    else if (EXTENSIONS.has(path.extname(entry.name))) results.push(full);
  }
  return results;
}

console.log(`\n${C.bold}Normalize line endings${C.reset}  (${doWrite ? 'write mode' : 'dry-run — use --write to apply'})\n`);

const files = SRC_DIRS.flatMap(walkFiles);
let fixed = 0;

for (const absPath of files) {
  const raw = fs.readFileSync(absPath, 'utf8');
  if (!raw.includes('\r')) continue;
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const relPath = path.relative(ROOT, absPath).replace(/\\/g, '/');
  console.log(`  ${C.yellow}~${C.reset} ${relPath}`);
  if (doWrite) fs.writeFileSync(absPath, normalized, 'utf8');
  fixed++;
}

if (fixed === 0) {
  console.log(`  ${C.dim}All ${files.length} files already have LF line endings.${C.reset}`);
} else {
  console.log(`\n${C.bold}Summary:${C.reset} ${C.yellow}${fixed} file${fixed === 1 ? '' : 's'} with CRLF${C.reset}`);
  if (!doWrite) console.log(`\nRun with ${C.bold}--write${C.reset} to apply.`);
  else console.log(`\n${C.green}Done.${C.reset}`);
}

console.log('');
