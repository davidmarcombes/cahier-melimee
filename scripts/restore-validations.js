#!/usr/bin/env node
/**
 * restore-validations.js — keep the validations of exercises whose edit changes nothing to check
 * (a hidden line, a comment, a reformat). Every edit of a file or of its generator drops them
 * (fingerprints of scripts/lib/human-validation.js); restoring them is a decision, made with the
 * diff in view — or checked by a pattern every changed line must match.
 *
 *   npm run restore:validations                                   every exercise changed since HEAD: diffs + what
 *                                                                 would be restored (dry run)
 *   npm run restore:validations -- --only='^\s*operation:' --write   restore the files whose every changed line
 *                                                                 matches the pattern (a hidden calculation)
 *   npm run restore:validations -- --ref=<commit> <file|dir>... [--write]   other version / some files
 *   --quiet: no diffs
 *
 * A record is restored only when it was made on the --ref version of the file, exactly: same
 * fingerprint, with today's generator code — a generator change is never restored. Records:
 *   reports/human-validate.csv (validated rows) · reports/validate-llm-cache.csv (model verdicts, manual=ok)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const {
  fingerprint,
  fingerprintSource,
  loadGenerators,
  readValidations,
  writeValidations,
} = require('./lib/human-validation.js');
const { loadCache, saveCache, walkMdFiles } = require('./lib/llm-cache.js');

const ROOT = path.join(__dirname, '..');
const C = { reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m' };

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
// LLM verdicts recorded before the cache used fingerprints: hash of the LF-normalised file alone
// (hand-written files only: it says nothing of a generator's code)
const legacyHash = (text) =>
  crypto.createHash('sha256').update(String(text).replace(/\r\n?/g, '\n')).digest('hex').slice(0, 16);

// Changed lines of a `git diff -U0` (without the +/− sign; blank lines change nothing)
const changedLines = (diff) =>
  diff
    .split('\n')
    .filter((l) => /^[+-](?![+-]{2} )/.test(l))
    .map((l) => l.slice(1))
    .filter((l) => l.trim());
// --only: every changed line matches the pattern (and something did change)
const onlyMatches = (diff, re) => {
  const lines = changedLines(diff);
  return lines.length > 0 && lines.every((l) => re.test(l));
};

function main() {
  const args = process.argv.slice(2);
  const opt = (name) => (args.find((a) => a.startsWith(`--${name}=`)) || '').slice(name.length + 3);
  const ref = opt('ref') || 'HEAD';
  const only = opt('only') ? new RegExp(opt('only')) : null;
  const write = args.includes('--write');
  const quiet = args.includes('--quiet');
  const targets = args.filter((a) => !a.startsWith('--'));

  // Default: every exercise changed since ref (working tree, staged or not)
  const files = targets.length
    ? targets.flatMap((t) => {
        const abs = path.resolve(t);
        return fs.statSync(abs).isDirectory() ? walkMdFiles(abs) : [abs];
      })
    : git('diff', '--name-only', ref, '--', 'src/fr')
        .split('\n')
        .filter((f) => f.endsWith('.md') && fs.existsSync(path.join(ROOT, f)))
        .map((f) => path.join(ROOT, f));
  const gens = loadGenerators();
  const human = readValidations();
  const cache = loadCache();
  let restored = 0,
    untouched = 0,
    refused = 0;

  for (const abs of files) {
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    let old;
    try {
      old = git('show', `${ref}:${rel}`);
    } catch {
      continue; // not in that version: nothing was validated on it
    }
    const now = fingerprint(abs, gens);
    const then = fingerprintSource(old, gens);
    if (now === then) continue; // same exercise: nothing to restore
    const legacy = /^generator:/m.test(old) ? null : legacyHash(old);

    const row = human.get(rel);
    const entry = cache.get(rel);
    const humanHit = row && row.validatedAt && row.hash === then;
    const llmHit =
      entry &&
      (entry.models.size || entry.manual === 'ok') &&
      (entry.hash === then || (legacy && entry.hash === legacy));
    if (!humanHit && !llmHit) {
      untouched++;
      if (!quiet) console.log(`${C.dim}· ${rel}: nothing was validated on the ${ref} version${C.reset}`);
      continue;
    }
    const diff = git('diff', '--no-color', '-U0', ref, '--', rel);
    if (only && !onlyMatches(diff, only)) {
      refused++;
      console.log(`${C.yellow}✗ ${rel}: other lines changed than ${only}${C.reset}`);
      if (!quiet)
        for (const l of changedLines(diff).filter((x) => !only.test(x))) console.log(`    ${C.yellow}${l}${C.reset}`);
      continue;
    }
    const what = [];
    if (humanHit) {
      what.push('human');
      row.hash = now;
    }
    if (llmHit) {
      what.push(`LLM (${[...entry.models.keys(), ...(entry.manual === 'ok' ? ['manual=ok'] : [])].join(', ')})`);
      entry.hash = now;
    }
    restored++;
    console.log(`${C.green}↺${C.reset} ${rel}  ${C.bold}${what.join(' · ')}${C.reset}`);
    if (!quiet)
      for (const line of diff.split('\n'))
        if (/^[+-](?![+-]{2} )/.test(line)) console.log(`    ${line[0] === '+' ? C.green : C.red}${line}${C.reset}`);
  }

  if (write) {
    writeValidations(human);
    saveCache(cache);
  }
  console.log(
    `\n${restored} file(s) ${write ? 'restored' : 'to restore'}` +
      (refused ? ` · ${C.yellow}${refused} refused by --only${C.reset}` : '') +
      (untouched ? ` · ${untouched} changed file(s) with nothing validated on ${ref}` : '') +
      (write || !restored ? '' : ` — look at the diffs, then add ${C.bold}--write${C.reset}`)
  );
}

if (require.main === module) main();

module.exports = { changedLines, onlyMatches };
