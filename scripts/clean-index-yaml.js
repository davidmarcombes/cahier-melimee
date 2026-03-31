#!/usr/bin/env node
/**
 * clean-index-yaml.js — Remove unused fields from all index.yaml files.
 * Fields removed: description, level, subject, topic, created_at
 * Fields kept:    id, title, difficulty, skill
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIRS = ['src/fr/exercices', 'src/fr/applications'].map((d) => path.join(ROOT, d));
const UNUSED = ['description', 'level', 'subject', 'topic', 'created_at'];
const RE = new RegExp('^(' + UNUSED.join('|') + '):[^\n]*\n', 'gm');

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name === 'index.yaml') {
      const before = fs.readFileSync(full, 'utf8');
      const after = before.replace(RE, '');
      if (before !== after) {
        fs.writeFileSync(full, after, 'utf8');
        console.log('cleaned', path.relative(ROOT, full));
      }
    }
  }
}

for (const d of DIRS) walk(d);
console.log('done');
