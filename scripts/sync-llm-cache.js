#!/usr/bin/env node
/**
 * sync-llm-cache.js — Keep validate-llm-cache.csv in sync with exercise files.
 *
 * - Adds new exercise files (no verdicts yet)
 * - Reports files changed since their verdicts (the file or its generator: the fingerprint of
 *   scripts/lib/human-validation.js): those verdicts and manual=ok no longer count, but stay recorded
 *   on the old fingerprint — npm run restore:validations brings them back for a safe edit
 * - Removes entries for files that no longer exist
 *
 * Does NOT require Ollama. Safe to run as a pre-commit step.
 *
 * Usage:
 *   node scripts/sync-llm-cache.js          # dry-run
 *   node scripts/sync-llm-cache.js --write  # apply changes
 */
'use strict';

const path = require('path');
const {
  CACHE_PATH,
  SRC_DIRS,
  getSeriesId,
  loadCache,
  saveCache,
  fileHash,
  walkMdFiles,
} = require('./lib/llm-cache.js');

const ROOT = path.resolve(__dirname, '..');
const doWrite = process.argv.includes('--write');

const C = {
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
};

// ── Main ──────────────────────────────────────────────────────────────────────

const cache = loadCache();
const updated = new Map(cache);
const allFiles = SRC_DIRS.flatMap(walkMdFiles);
const seen = new Set();

let added = 0,
  changed = 0,
  removed = 0;

console.log(`\n${C.bold}Sync LLM cache${C.reset}  (${doWrite ? 'write mode' : 'dry-run — use --write to apply'})\n`);

for (const absPath of allFiles) {
  const relPath = path.relative(ROOT, absPath).replace(/\\/g, '/');
  const seriesId = getSeriesId(absPath);
  const hash = fileHash(absPath);
  const entry = cache.get(relPath);
  seen.add(relPath);

  if (!entry) {
    updated.set(relPath, { seriesId, hash, manual: '', models: new Map() });
    console.log(`  ${C.green}+${C.reset} NEW      ${relPath}`);
    added++;
  } else if (entry.hash !== hash) {
    // Changed (the file or its generator): its verdicts and manual=ok no longer count. They stay
    // recorded on the old fingerprint — like a stale human validation — so that
    // npm run restore:validations can bring them back when the edit is known to be safe.
    const hadVerdicts = entry.models.size > 0 || entry.manual === 'ok';
    if (!hadVerdicts) updated.set(relPath, { ...entry, seriesId, hash });
    console.log(
      `  ${C.yellow}~${C.reset} CHANGED  ${relPath}` +
        (hadVerdicts ? `  ${C.dim}(verdicts on the previous version: no longer count)${C.reset}` : '')
    );
    changed++;
  }
}

for (const relPath of cache.keys()) {
  if (!seen.has(relPath)) {
    updated.delete(relPath);
    console.log(`  ${C.red}-${C.reset} REMOVED  ${relPath}`);
    removed++;
  }
}

const unchanged = allFiles.length - added - changed;

if (added + changed + removed === 0) {
  console.log(`  ${C.dim}All ${allFiles.length} exercise files are up to date.${C.reset}`);
} else {
  const parts = [];
  if (added) parts.push(`${C.green}${added} added${C.reset}`);
  if (changed) parts.push(`${C.yellow}${changed} changed${C.reset} (their verdicts no longer count)`);
  if (removed) parts.push(`${C.red}${removed} removed${C.reset}`);
  if (unchanged) parts.push(`${C.dim}${unchanged} unchanged${C.reset}`);
  console.log(`\n${C.bold}Summary:${C.reset} ${parts.join(', ')}`);

  if (doWrite) {
    saveCache(updated);
    console.log(`\n${C.green}Written:${C.reset} ${CACHE_PATH}`);
  } else {
    console.log(`\nRun with ${C.bold}--write${C.reset} to apply.`);
  }
}

console.log('');
