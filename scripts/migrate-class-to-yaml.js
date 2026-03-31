#!/usr/bin/env node
/**
 * migrate-class-to-yaml.js
 *
 * Consolidates the `class` field to index.yaml only:
 *   1. If index.yaml already has class → keep it, strip from all .md files.
 *   2. If index.yaml has no class but .md files do → pick the most-common
 *      class (first alpha on tie), write to index.yaml, strip from .md files.
 *
 * Run: node scripts/migrate-class-to-yaml.js [--dry]
 */
'use strict';
const fs   = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const DRY = process.argv.includes('--dry');
const ROOT = path.resolve(__dirname, '..');
const SCAN = ['src/fr/exercices', 'src/fr/applications', 'src/fr/defis'];

// ── helpers ──────────────────────────────────────────────────────────────────

function findSeries(dir) {
  const results = [];
  const walk = (d) => {
    const ip = path.join(d, 'index.yaml');
    if (fs.existsSync(ip)) { results.push(d); return; }
    if (fs.existsSync(d))
      for (const e of fs.readdirSync(d, { withFileTypes: true }))
        if (e.isDirectory()) walk(path.join(d, e.name));
  };
  walk(dir);
  return results;
}

/** Read class value from a .md file's frontmatter (returns '' if absent). */
function readMdClass(mdPath) {
  const content = fs.readFileSync(mdPath, 'utf8');
  const m = content.match(/^class:\s*["']?([^"'\r\n]+)["']?/m);
  return m ? m[1].trim() : '';
}

/** Remove the `class:` line from a .md file's frontmatter. */
function stripMdClass(mdPath) {
  const content = fs.readFileSync(mdPath, 'utf8');
  const updated = content.replace(/^class:[ \t]*["']?[^"'\r\n]*["']?\r?\n/m, '');
  if (updated !== content) {
    if (!DRY) fs.writeFileSync(mdPath, updated, 'utf8');
    return true;
  }
  return false;
}

/** Add or replace `class:` in index.yaml (after the `id:` line if possible). */
function setYamlClass(yamlPath, classValue) {
  let content = fs.readFileSync(yamlPath, 'utf8');
  // Already has class — shouldn't happen but guard
  if (/^class:/m.test(content)) return;
  // Insert after `id:` line
  const updated = content.replace(/(^id:.*\r?\n)/m, `$1class: "${classValue}"\n`);
  if (!DRY) fs.writeFileSync(yamlPath, updated, 'utf8');
}

/** Pick the most common value; first alphabetically on a tie. */
function mostCommon(arr) {
  const counts = {};
  for (const v of arr) counts[v] = (counts[v] || 0) + 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    [0][0];
}

// ── main ─────────────────────────────────────────────────────────────────────

let promoted = 0, stripped = 0, yamlOnly = 0;

for (const scanDir of SCAN) {
  const dir = path.join(ROOT, scanDir);
  for (const seriesDir of findSeries(dir)) {
    const yamlPath = path.join(seriesDir, 'index.yaml');
    const meta = yaml.load(fs.readFileSync(yamlPath, 'utf8')) || {};
    const yamlClass = (meta.class || '').trim();

    const mdFiles = fs.readdirSync(seriesDir).filter(f => f.endsWith('.md'));
    const mdClasses = mdFiles.map(f => readMdClass(path.join(seriesDir, f))).filter(Boolean);

    if (!yamlClass && !mdClasses.length) {
      // Should not occur given our audit, but log it
      console.warn('⚠  no class anywhere:', seriesDir.replace(ROOT, ''));
      continue;
    }

    if (!yamlClass) {
      // Promote most-common md class → index.yaml
      const chosen = mostCommon(mdClasses);
      const rel = seriesDir.replace(ROOT + path.sep, '');
      if (mdClasses.length > 1 && new Set(mdClasses).size > 1) {
        console.log(`  promote [${[...new Set(mdClasses)].join('|')} → ${chosen}]  ${rel}`);
      }
      setYamlClass(yamlPath, chosen);
      promoted++;
    } else {
      yamlOnly++;
    }

    // Strip class from all .md files
    for (const f of mdFiles) {
      if (stripMdClass(path.join(seriesDir, f))) stripped++;
    }
  }
}

console.log(`\n${DRY ? '[DRY RUN] ' : ''}Results:`);
console.log(`  Promoted md→yaml:   ${promoted}`);
console.log(`  Already in yaml:    ${yamlOnly}`);
console.log(`  .md lines stripped: ${stripped}`);
