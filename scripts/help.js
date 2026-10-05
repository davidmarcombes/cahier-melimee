#!/usr/bin/env node
const scripts = require('../package.json').scripts;

const desc = {
  dev: 'Start dev server (site + CSS watch)',
  check: 'Pre-commit check: unit → validate → fresh build → e2e on changed series (full if engine changed)',
  'check:full': 'Pre-commit check with e2e on every page',
  'check:answers': 'Answer oracle: recompute expected answers on the built site + generators (needs a build)',
  flag: 'Ask a human to check something: npm run flag -- <series id|URL> "<reason>" (shows in /admin/)',
  unvalidate:
    'Withdraw a human validation (any time, unlike the 5 s « Annuler »): npm run unvalidate -- <series id|URL> "<why>"',
  snapshot:
    'Checkpoint of the built site to compare against later: npm run snapshot -- [name] (--list, --delete, --shots)',
  regress:
    'Compare now with a checkpoint: changed pages + pages using changed generators / SVG helpers, screenshots, pixel-diff report (--e2e, --all, --no-shots)',
  'check:spell:generated':
    'French spelling of the text generators produce (titles, tiles, choices) — run by check when generators change',
  'release:verify':
    'Check the production artifact before upload (dev content, broken links, removed series): after npm run build',
  build: 'Build for production (test + validate + eleventy + css)',
  'build:css': 'Compile and minify CSS',
  'build:compress': 'Compress static assets',
  'build:slides': 'Build slides PDF (Marp)',
  'build:e2e': 'Clean + build site for E2E testing',
  'generate:tokens': 'Regenerate Tailwind design tokens from design-tokens.json',
  'generate:names': 'Generate student names',
  'generate:ids': 'Generate student identities',
  'generate:maths': 'Generate math exercises',
  'generate:report': 'Generate exercises coverage report (CSV)',
  'generate:commit': 'Pre-commit: assign IDs + rebuild report + sync validation hashes',
  'validate:config': 'Validate project config',
  'validate:exercises': 'Validate exercise YAML files',
  'validate:html': 'Validate generated HTML',
  'validate:llm': 'Validate exercises with LLM',
  'validate:llm:smoke': 'Quick LLM smoke test (one exercise, verbose)',
  'validate:cross': 'Cross-validate LLM + human validations',
  'check:spell': 'Spellcheck markdown files',
  lint: 'Strict lint: ESLint (0 warnings) + Prettier check + knip (dead code / deps)',
  'lint:fix': 'Auto-fix: ESLint --fix + Prettier --write',
  format: 'Auto-format with Prettier',
  clean: 'Remove _site build output',
  'clean:yaml': 'Clean and normalize YAML exercise files',
  'stats:svg': 'Show SVG size statistics',
  'list:series': 'List all series with metadata',
  'list:type': 'Show exercises of a given type',
  'list:human-validations': 'Show human-validated exercises',
  'review:failures': 'Review LLM validation failures interactively',
  'sync:human-validations': 'Sync human validations (dry run)',
  'sync:human-validations:write': 'Sync human validations (write)',
  'sync:llm-cache': 'Sync LLM validation cache (dry run)',
  'sync:llm-cache:write': 'Sync LLM validation cache (write)',
  'normalize:eol': 'Check for CRLF line endings in source files (dry run)',
  'normalize:eol:write': 'Convert CRLF to LF in all source files (write)',
  'convert:magic-color': 'Convert image to magic-color palette',
  'convert:pixelate': 'Pixelate an image',
  'serve:local': 'Serve built site locally',
  'serve:sim': 'Start simulation server',
  'env:dev': 'Switch to dev environment',
  'env:prod': 'Switch to prod environment',
  'env:test': 'Switch to test environment',
  test: 'Run unit tests (vitest)',
  'test:watch': 'Run unit tests in watch mode',
  'test:a11y': 'Run accessibility tests',
  'test:e2e': 'Run Playwright E2E tests',
  'test:e2e:ui': 'Playwright with interactive UI',
  'test:e2e:headed': 'Playwright in headed (visible browser) mode',
  'test:e2e:debug': 'Playwright in debug mode',
};

// Scripts not shown: internal (called by concurrently) or bun-only
const hidden = new Set(['start', 'dev:site', 'dev:css', 'dev:bun', 'dev:bun:site']);

console.log('\nAvailable commands:\n');
Object.keys(scripts)
  .filter((k) => k !== 'help' && !hidden.has(k))
  .forEach((k) => console.log('  npm run ' + k.padEnd(32) + (desc[k] || '')));
console.log();
