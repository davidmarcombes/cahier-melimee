#!/usr/bin/env node
/**
 * cross-validate.js — Cross-reference human and LLM validations.
 *
 * Joins reports/human-validate.csv and reports/validate-llm-cache.csv on `path`.
 * Reports agreement, conflicts, and coverage gaps.
 *
 * Usage:
 *   node scripts/cross-validate.js              # summary only
 *   node scripts/cross-validate.js --verbose    # show individual files per category
 *   node scripts/cross-validate.js --cat=conflict  # filter: conflict|human-only|llm-only|both|unknown
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HUMAN_CSV = path.join(ROOT, 'reports/human-validate.csv');
const LLM_CSV = path.join(ROOT, 'reports/validate-llm-cache.csv');

const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const catArg = (args.find((a) => a.startsWith('--cat=')) || '').replace('--cat=', '') || null;

const C = {
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// ── CSV parsers ───────────────────────────────────────────────────────────────

function parseHuman() {
  if (!fs.existsSync(HUMAN_CSV)) return new Map();
  const lines = fs
    .readFileSync(HUMAN_CSV, 'utf8')
    .split('\n')
    .filter((l) => l.trim());
  const map = new Map();
  for (const line of lines.slice(1)) {
    const [p, seriesId, hash, validatedAt] = line.split(',');
    if (p) map.set(p, { seriesId: seriesId || '', hash: hash || '', validatedAt: validatedAt || '' });
  }
  return map;
}

function parseLlm() {
  if (!fs.existsSync(LLM_CSV)) return { map: new Map(), modelCols: [] };
  const lines = fs
    .readFileSync(LLM_CSV, 'utf8')
    .split('\n')
    .filter((l) => l.trim());
  const headers = lines[0].split(',');
  const fixed = new Set(['path', 'seriesId', 'hash', 'manual']);
  const modelCols = headers.filter((h) => !fixed.has(h));
  const map = new Map();
  for (const line of lines.slice(1)) {
    const parts = line.split(',');
    const obj = {};
    headers.forEach((h, i) => (obj[h] = parts[i] ?? ''));
    map.set(obj.path, obj);
  }
  return { map, modelCols };
}

// ── Verdict helpers ───────────────────────────────────────────────────────────

function llmVerdict(row, modelCols) {
  if (!row) return 'unknown';
  if (row.manual === 'ok') return 'ok';
  if (modelCols.some((m) => row[m] === 'fail')) return 'fail';
  if (modelCols.some((m) => row[m] === 'ok')) return 'ok';
  return 'unknown';
}

// ── Main ──────────────────────────────────────────────────────────────────────

const human = parseHuman();
const { map: llm, modelCols } = parseLlm();

if (!fs.existsSync(HUMAN_CSV)) {
  console.log(`\n${C.yellow}No human-validate.csv found. Run: npm run sync:human-validations:write${C.reset}\n`);
  process.exit(0);
}
if (!fs.existsSync(LLM_CSV)) {
  console.log(`\n${C.yellow}No validate-llm-cache.csv found. Run: npm run validate:llm${C.reset}\n`);
  process.exit(0);
}

// Union of all paths
const allPaths = new Set([...human.keys(), ...llm.keys()]);

const cats = {
  both: { label: 'Both validated — agree', color: C.green, files: [] },
  conflict: { label: 'Human ✓ but LLM fail — investigate', color: C.red, files: [] },
  'llm-fail': { label: 'LLM fail, not human-validated — review', color: C.yellow, files: [] },
  'human-only': { label: 'Human ✓, LLM not run', color: C.cyan, files: [] },
  'llm-only': { label: 'LLM ok, not human-validated', color: C.dim, files: [] },
  unknown: { label: 'Neither validated', color: C.dim, files: [] },
  stale: { label: 'Hash mismatch — data stale', color: C.magenta, files: [] },
};

for (const p of allPaths) {
  const h = human.get(p);
  const l = llm.get(p);
  const humanValidated = !!h?.validatedAt;
  const verdict = llmVerdict(l, modelCols);

  // Hash mismatch (both have the file but hashes differ)
  if (h && l && h.hash && l.hash && h.hash !== l.hash) {
    cats.stale.files.push(p);
    continue;
  }

  if (humanValidated && verdict === 'ok') {
    cats.both.files.push(p);
    continue;
  }
  if (humanValidated && verdict === 'fail') {
    cats.conflict.files.push(p);
    continue;
  }
  if (!humanValidated && verdict === 'fail') {
    cats['llm-fail'].files.push(p);
    continue;
  }
  if (humanValidated && verdict === 'unknown') {
    cats['human-only'].files.push(p);
    continue;
  }
  if (!humanValidated && verdict === 'ok') {
    cats['llm-only'].files.push(p);
    continue;
  }
  cats.unknown.files.push(p);
}

// ── Output ────────────────────────────────────────────────────────────────────

const total = allPaths.size;
console.log(`\n${C.bold}LLM × Human Cross-Validation${C.reset}  —  ${total} files`);
if (modelCols.length) console.log(`${C.dim}LLM models: ${modelCols.join(', ')}${C.reset}`);
console.log('─'.repeat(65));

const order = ['both', 'conflict', 'llm-fail', 'human-only', 'llm-only', 'unknown', 'stale'];
for (const key of order) {
  const { label, color, files } = cats[key];
  if (files.length === 0 && key !== 'both') continue;
  if (catArg && catArg !== key) continue;
  const pct = total > 0 ? Math.round((files.length / total) * 100) : 0;
  console.log(`  ${color}${String(files.length).padStart(5)}${C.reset}  ${label} ${C.dim}(${pct}%)${C.reset}`);
  if ((verbose || catArg === key) && files.length > 0) {
    for (const f of files) {
      const h = human.get(f);
      const l = llm.get(f);
      const hashNote = h && l && h.hash !== l.hash ? ` ${C.magenta}[hash mismatch]${C.reset}` : '';
      console.log(`         ${C.dim}${f.replace('src/fr/', '')}${C.reset}${hashNote}`);
      if (l && modelCols.length) {
        const verdicts = modelCols.map((m) => `${m}:${l[m] || '?'}`).join(' ');
        console.log(`         ${C.dim}  LLM: ${verdicts}  manual:${l.manual || '—'}${C.reset}`);
      }
    }
  }
}

console.log('─'.repeat(65));

if (cats.conflict.files.length > 0) {
  console.log(
    `\n${C.red}${C.bold}Action needed:${C.reset} ${cats.conflict.files.length} conflict(s) — human validated but LLM flagged as fail.`
  );
  console.log(`${C.dim}Run with --cat=conflict --verbose to investigate.${C.reset}`);
}
if (cats['llm-fail'].files.length > 0) {
  console.log(
    `\n${C.yellow}${C.bold}Review queue:${C.reset} ${cats['llm-fail'].files.length} LLM failure(s) not yet human-validated.`
  );
  console.log(`${C.dim}Run: npm run review:failures  to go through them interactively.${C.reset}`);
}
if (cats.stale.files.length > 0) {
  console.log(
    `\n${C.magenta}${C.bold}Stale data:${C.reset} ${cats.stale.files.length} file(s) with hash mismatch between human and LLM caches.`
  );
  console.log(`${C.dim}Run: npm run sync:human-validations  and  npm run validate:llm  to refresh.${C.reset}`);
}
console.log('');
