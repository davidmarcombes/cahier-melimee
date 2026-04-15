#!/usr/bin/env node
/**
 * sync-llm-cache.js — Keep validate-llm-cache.csv in sync with exercise files.
 *
 * - Adds new exercise files (no verdicts yet)
 * - Updates hash when file content changed (clears verdicts)
 * - Updates hash silently when only line endings changed (CRLF→LF, keeps verdicts)
 * - Removes entries for files that no longer exist
 *
 * Does NOT require Ollama. Safe to run as a pre-commit step.
 *
 * Usage:
 *   node scripts/sync-llm-cache.js          # dry-run
 *   node scripts/sync-llm-cache.js --write  # apply changes
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const CACHE_PATH = path.join(ROOT, 'reports/validate-llm-cache.csv');
const SRC_DIRS = ['src/fr/exercices', 'src/fr/applications', 'src/fr/defis'].map((r) => path.join(ROOT, r));

const doWrite = process.argv.includes('--write');

const C = {
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
};

// ── Hashing ──────────────────────────────────────────────────────────────────

function fileHash(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function fileHashRaw(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').slice(0, 16);
}

// Hash of the file as if it had CRLF line endings (detects stored-CRLF → checkout-LF migration).
function fileHashForceCRLF(filePath) {
  const crlf = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n');
  return crypto.createHash('sha256').update(crlf).digest('hex').slice(0, 16);
}

// ── File discovery ────────────────────────────────────────────────────────────

const _seriesIdCache = new Map();
function getSeriesId(absPath) {
  const dir = path.dirname(absPath);
  if (_seriesIdCache.has(dir)) return _seriesIdCache.get(dir);
  try {
    const m = fs.readFileSync(path.join(dir, 'index.yaml'), 'utf8').match(/^id:\s*(\S+)/m);
    const id = m ? m[1] : '';
    _seriesIdCache.set(dir, id);
    return id;
  } catch (_) {
    _seriesIdCache.set(dir, '');
    return '';
  }
}

function walkMdFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkMdFiles(full));
    else if (entry.name.endsWith('.md') && !entry.name.startsWith('_')) results.push(full);
  }
  return results;
}

// ── Cache I/O ─────────────────────────────────────────────────────────────────

function loadCache() {
  const map = new Map();
  if (!fs.existsSync(CACHE_PATH)) return map;
  const lines = fs
    .readFileSync(CACHE_PATH, 'utf8')
    .split('\n')
    .filter((l) => l.trim());
  if (lines.length === 0) return map;

  const header = lines[0].split(',');
  const hasSeriesId = header[1] === 'seriesId';
  const hasManual = hasSeriesId && header[3] === 'manual';
  const dataOffset = hasManual ? 4 : hasSeriesId ? 3 : 2;
  const modelCols = header.slice(dataOffset);

  for (const line of lines.slice(1)) {
    const parts = line.split(',');
    if (!parts[0]) continue;
    const seriesId = hasSeriesId ? parts[1] || '' : '';
    const hash = hasSeriesId ? parts[2] || '' : parts[1] || '';
    const manual = hasManual ? parts[3] || '' : '';
    const verdicts = parts.slice(dataOffset);
    const models = new Map();
    modelCols.forEach((m, i) => {
      if (verdicts[i]) models.set(m, verdicts[i]);
    });
    map.set(parts[0], { seriesId, hash, manual, models });
  }
  return map;
}

function saveCache(map) {
  const allModels = new Set();
  for (const e of map.values()) for (const m of e.models.keys()) allModels.add(m);
  const cols = [...allModels].sort();

  const header = ['path', 'seriesId', 'hash', 'manual', ...cols].join(',');
  const rows = [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([p, e]) =>
      [p, e.seriesId || '', e.hash, e.manual || '', ...cols.map((m) => e.models.get(m) || '')].join(',')
    );
  fs.writeFileSync(CACHE_PATH, [header, ...rows].join('\n') + '\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

const cache = loadCache();
const updated = new Map(cache);
const allFiles = SRC_DIRS.flatMap(walkMdFiles);
const seen = new Set();

let added = 0,
  changed = 0,
  rehashed = 0,
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
    const isLineEndingChange = entry.hash === fileHashRaw(absPath) || entry.hash === fileHashForceCRLF(absPath);
    if (isLineEndingChange) {
      // Only line endings changed — update hash silently, keep verdicts
      updated.set(relPath, { ...entry, seriesId, hash });
      rehashed++;
    } else {
      // Real content change — clear verdicts (re-validation needed)
      const hadVerdicts = entry.models.size > 0;
      updated.set(relPath, { seriesId, hash, manual: entry.manual || '', models: new Map() });
      console.log(
        `  ${C.yellow}~${C.reset} CHANGED  ${relPath}` + (hadVerdicts ? `  ${C.dim}(verdicts cleared)${C.reset}` : '')
      );
      changed++;
    }
  }
}

for (const relPath of cache.keys()) {
  if (!seen.has(relPath)) {
    updated.delete(relPath);
    console.log(`  ${C.red}-${C.reset} REMOVED  ${relPath}`);
    removed++;
  }
}

const unchanged = allFiles.length - added - changed - rehashed;

if (added + changed + removed + rehashed === 0) {
  console.log(`  ${C.dim}All ${allFiles.length} exercise files are up to date.${C.reset}`);
} else {
  const parts = [];
  if (added) parts.push(`${C.green}${added} added${C.reset}`);
  if (changed) parts.push(`${C.yellow}${changed} changed${C.reset} (verdicts cleared)`);
  if (removed) parts.push(`${C.red}${removed} removed${C.reset}`);
  if (rehashed) parts.push(`${C.dim}${rehashed} rehashed (CRLF→LF)${C.reset}`);
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
