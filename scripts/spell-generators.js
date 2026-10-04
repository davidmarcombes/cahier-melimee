#!/usr/bin/env node
/**
 * spell-generators.js — French spellcheck of the text the GENERATORS produce (titles, statements,
 * tiles, choices, questions, labels), which cspell never sees in the content files. Caught
 * « le chiffre des dixèmes » (a generator typo) that every other check missed.
 *
 * Each generator used by a content file is drawn DRAWS times with that file's params; the visible
 * text is extracted (HTML stripped), written to .scratch/generated-text/<generator>.txt and passed to
 * cspell with the project's cspell.json (French dictionary, project words).
 *
 * Usage: node scripts/spell-generators.js [--draws=20]   (exit 1 on unknown words)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '.scratch', 'generated-text');
const DRAWS = Number((process.argv.find((a) => a.startsWith('--draws=')) || '--draws=20').slice(8));

global.clockSvg = () => '';
const generators = require('../src/assets/js/generators/index.js');

const walk = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

// Visible text of a generated item: every string except SVG / style / technical fields
const SKIP_KEYS = new Set([
  'type',
  'svg',
  'gen',
  'par',
  'color',
  'id',
  'cat',
  'zone',
  'emoji',
  'mode',
  'direction',
  'rule',
]);
function texts(value, key, out) {
  if (SKIP_KEYS.has(key)) return out;
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => texts(v, key, out));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) texts(v, k, out);
  return out;
}
const plain = (html) =>
  String(html)
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Generators used by content, with every params set they are used with
const uses = new Map();
for (const f of walk(path.join(ROOT, 'src', 'fr')).filter((f) => f.endsWith('.md'))) {
  const parts = fs.readFileSync(f, 'utf8').split(/^---\s*$/m);
  if (parts.length < 3) continue;
  let d;
  try {
    d = yaml.load(parts[1]) || {};
  } catch {
    continue;
  }
  if (!d.generator || !generators[d.generator]) continue;
  if (!uses.has(d.generator)) uses.set(d.generator, []);
  uses.get(d.generator).push(d.params || {});
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const [name, paramsList] of uses) {
  const lines = new Set();
  for (const params of paramsList)
    for (let k = 0; k < DRAWS; k++) {
      let item;
      try {
        item = generators[name].generate(JSON.parse(JSON.stringify(params)));
      } catch {
        continue; // validate-exercises reports generator crashes
      }
      for (const t of texts(item, '', [])) {
        const p = plain(t);
        if (/\p{L}{2,}/u.test(p)) lines.add(p);
      }
    }
  fs.writeFileSync(path.join(OUT, `${name}.txt`), [...lines].join('\n') + '\n');
}

try {
  execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['cspell', '--no-progress', '--no-summary', '--config', path.join(ROOT, 'cspell.json'), path.join(OUT, '*.txt')],
    { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' }
  );
  console.log(`✓ Generated text spelling: ${uses.size} generators, ${DRAWS} draws per content file`);
} catch {
  console.error(`\n✗ Unknown words in generated text (files in ${path.relative(ROOT, OUT)}/<generator>.txt)`);
  console.error('  Fix the generator, or add a legitimate word to "words" in cspell.json');
  process.exit(1);
}
