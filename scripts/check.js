#!/usr/bin/env node
/**
 * check.js — the pre-commit check. One command, fail-fast, always against a fresh build.
 *
 *   npm run check          lint → unit → validation → spelling (changed) → build → answer oracle →
 *                          minify → e2e on what changed → reminder: changed exercises to validate by hand
 *   npm run check:full     same, e2e on every page
 *   npm run check -- --no-e2e   stop after the build (fast content check)
 *
 * "What changed" = files modified or untracked vs HEAD (git status):
 *   - only content (src/fr/**) changed → layout-health + solvability on the touched series only
 *   - engine changed (src/ outside src/fr, .eleventy.js, tests/e2e, playwright config, package.json…)
 *     → full e2e run, because any page may be affected
 *   - nothing site-related changed → e2e skipped
 */
const { spawnSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const FULL = args.includes('--full');
const NO_E2E = args.includes('--no-e2e');

const C = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', dim: '\x1b[2m', bold: '\x1b[1m', reset: '\x1b[0m' };
const timings = [];

function step(label, cmd, env = {}) {
  console.log(`\n${C.bold}▶ ${label}${C.reset} ${C.dim}${cmd}${C.reset}`);
  const t0 = Date.now();
  const r = spawnSync(cmd, { cwd: ROOT, stdio: 'inherit', shell: true, env: { ...process.env, ...env } });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  timings.push([label, secs, r.status === 0]);
  if (r.status !== 0) {
    summary();
    console.log(`\n${C.red}${C.bold}✗ ${label} failed${C.reset} — fix it before committing.`);
    if (label === 'Lint') console.log(`  Auto-fix what can be fixed: npm run lint:fix`);
    if (label.startsWith('E2E')) console.log(`  Report: npx playwright show-report reports/playwright`);
    process.exit(r.status || 1);
  }
}

function summary() {
  console.log(`\n${C.bold}Summary${C.reset}`);
  for (const [label, secs, ok] of timings) {
    console.log(`  ${ok ? C.green + '✓' : C.red + '✗'}${C.reset} ${label.padEnd(34)} ${C.dim}${secs}s${C.reset}`);
  }
}

// ─── Change detection ─────────────────────────────────────────────────────────

const ENGINE = [
  /^src\/(?!fr\/)/, // templates, layouts, assets, css, data…
  /^\.eleventy\.js$/,
  /^tests\/e2e\//,
  /^playwright\.config\.js$/,
  /^package(-lock)?\.json$/,
  /^design-tokens\.json$/,
  /^tailwind\.config\.js$/,
  /^postcss\.config\.js$/,
];

function changedFiles() {
  // --files=a,b overrides git (to preview a scope: `npm run check -- --scope --files=src/fr/…`)
  const override = args.find((a) => a.startsWith('--files='));
  if (override) return override.slice(8).split(',').filter(Boolean);
  const out = execSync('git status --porcelain --untracked-files=all', { cwd: ROOT, encoding: 'utf8' });
  return out
    .split('\n')
    .filter(Boolean)
    .map((l) => l.slice(3).replace(/^"|"$/g, '').split(' -> ').pop());
}

// src/fr/{section}/…/file → "{section}/{series id}" via the nearest index.yaml
function seriesLabel(file) {
  const m = file.match(/^src\/fr\/(exercices|applications|defis)\//);
  if (!m) return null;
  let dir = path.dirname(path.join(ROOT, file));
  const stop = path.join(ROOT, 'src', 'fr', m[1]);
  while (dir.startsWith(stop) && dir !== stop) {
    const idx = path.join(dir, 'index.yaml');
    if (fs.existsSync(idx)) {
      try {
        const id = yaml.load(fs.readFileSync(idx, 'utf8'))?.id;
        return id ? `${m[1]}/${id}` : null;
      } catch {
        return null;
      }
    }
    dir = path.dirname(dir);
  }
  return null;
}

// ─── Run ──────────────────────────────────────────────────────────────────────

const files = changedFiles();
const engine = files.filter((f) => ENGINE.some((re) => re.test(f)));
const pages = [...new Set(files.map(seriesLabel).filter(Boolean))];

// --scope: only print what the e2e step would cover
if (args.includes('--scope')) {
  if (FULL || engine.length) console.log(`every page — engine files changed:\n  ${engine.join('\n  ') || '(--full)'}`);
  else if (pages.length) console.log(`${pages.length} changed series:\n  ${pages.join('\n  ')}`);
  else console.log('no site change since HEAD — e2e would be skipped');
  process.exit(0);
}

const t0 = Date.now();
step('Lint', 'npm run lint --silent');
step('Unit tests', 'npx vitest run');
step('Validate exercises', 'node scripts/validate-exercises.js');

// French spelling of the changed content (titles, choices, statements, bodies — front matter included)
const changedContent = files.filter((f) => /^src\/fr\/.*\.md$/.test(f) && fs.existsSync(path.join(ROOT, f)));
if (changedContent.length > 150) step('Spelling (all content)', 'npm run check:spell --silent');
else if (changedContent.length)
  step(
    `Spelling (${changedContent.length} changed file(s))`,
    `npx cspell --no-progress --no-summary ${changedContent.map((f) => `"${f}"`).join(' ')}`
  );

// Own output folder and port: `npm start` (writes _site/, serves :8080) can keep running meanwhile —
// sharing _site/ let each overwrite the other (dev pages in the tests, test builds under the dev server).
const OUT = '_site-check';
const ISO = { SITE_OUT: OUT, E2E_PORT: '4174' };
fs.rmSync(path.join(ROOT, OUT), { recursive: true, force: true });
step(
  `Build (fresh ${OUT}/)`,
  `npm run generate:tokens --silent && npx eleventy --quiet && npx tailwindcss -i src/css/input.css -o ${OUT}/css/styles.css --minify && node scripts/generate-sw.js`,
  ISO
);
step('Answer oracle', 'node scripts/check-answers.js', ISO);
// E2E runs on the production output: minified HTML/JS (html-minifier + terser) as deployed
step('Minify (production)', 'node scripts/minify.js', ISO);

if (NO_E2E) {
  summary();
  console.log(`\n${C.yellow}E2E skipped (--no-e2e).${C.reset}`);
  process.exit(0);
}

const coverageDir = path.join(ROOT, 'test-results', 'solve-coverage');
fs.rmSync(coverageDir, { recursive: true, force: true });

const e2eEnv = { E2E_REPORTER: 'line', ...ISO };
if (FULL || engine.length) {
  const why = FULL ? '--full' : `engine changed: ${engine.slice(0, 3).join(', ')}${engine.length > 3 ? '…' : ''}`;
  console.log(`\n${C.bold}E2E scope:${C.reset} every page (${why})`);
  step('E2E — all specs, all pages', 'npx playwright test', e2eEnv);
} else if (pages.length) {
  console.log(`\n${C.bold}E2E scope:${C.reset} ${pages.length} changed series — ${pages.join(', ')}`);
  step('E2E — changed series', 'npx playwright test tests/e2e/layout-health.spec.js tests/e2e/solve.spec.js', {
    ...e2eEnv,
    E2E_PAGES: pages.join(','),
  });
} else {
  console.log(`\n${C.yellow}E2E skipped: no site change since HEAD.${C.reset} Use --full to force.`);
}

// Types the solvability test could not drive (reported, not failed)
if (fs.existsSync(coverageDir)) {
  const counts = {};
  for (const f of fs.readdirSync(coverageDir)) {
    for (const t of JSON.parse(fs.readFileSync(path.join(coverageDir, f), 'utf8'))) counts[t] = (counts[t] || 0) + 1;
  }
  const list = Object.entries(counts).map(([t, n]) => `${t} (${n})`);
  if (list.length) console.log(`\n${C.yellow}Not covered by the solvability test:${C.reset} ${list.join(', ')}`);
}

// Human validation — reminder, not a failure (scripts/lib/human-validation.js, same data as /admin/):
//   ↻ series a human validated that changed since: regressions, re-check first
//   • changed series not yet validated by hand
//   ⚑ items flagged for a human (npm run flag), 🚩 in the /admin/ « À vérifier » column
// Validate with « ✓ Valider la série » at the end of a series on the dev server (npm start).
try {
  const { readFlags, status } = require('./lib/human-validation.js');
  const all = status();
  const touched = new Set(pages.map((p) => p.split('/')[1]));
  const stale = all.filter((s) => s.status === 'stale');
  const todo = all.filter((s) => touched.has(s.id) && s.status !== 'ok' && s.status !== 'stale');
  const flags = readFlags().filter((f) => !f.resolvedAt);
  const link = (s) => `http://localhost:8080${s.url}`;
  if (stale.length) {
    console.log(`\n${C.yellow}${C.bold}↻ Validated by hand, changed since — re-check first:${C.reset}`);
    for (const s of stale) console.log(`  ${link(s)}  ${C.dim}${s.title} · changed: ${s.stale.join(', ')}${C.reset}`);
  }
  if (todo.length) {
    console.log(`\n${C.yellow}Changed, not yet validated by hand:${C.reset}`);
    for (const s of todo)
      console.log(`  ${link(s)}  ${C.dim}${s.title} · ${s.validated}/${s.total} validated${C.reset}`);
  }
  if (flags.length)
    console.log(`\n${C.yellow}⚑ ${flags.length} item(s) flagged for you:${C.reset} http://localhost:8080/admin/`);
} catch (e) {
  console.log(`\n${C.dim}Human validation status unavailable: ${e.message}${C.reset}`);
}

summary();
console.log(
  `\n${C.green}${C.bold}✓ All checks passed${C.reset} ${C.dim}in ${((Date.now() - t0) / 1000).toFixed(0)}s${C.reset}`
);
