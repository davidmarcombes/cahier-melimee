#!/usr/bin/env node
const scripts = require('../package.json').scripts;

const desc = {
  'dev':                        'Start dev server (site + CSS watch)',
  'build':                      'Build for production (test + validate + eleventy + css)',
  'build:css':                  'Compile and minify CSS',
  'build:compress':             'Compress static assets',
  'build:slides':               'Build slides PDF (Marp)',
  'build:e2e':                  'Build site for E2E testing',
  'generate:tokens':            'Regenerate Tailwind design tokens from design-tokens.json',
  'generate:names':             'Generate student names',
  'generate:ids':               'Generate student identities',
  'generate:maths':             'Generate math exercises',
  'generate:report':            'Generate exercises coverage report (CSV)',
  'validate:config':            'Validate project config',
  'validate:exercises':         'Validate exercise YAML files',
  'validate:html':              'Validate generated HTML',
  'validate:llm':               'Validate exercises with LLM',
  'validate:llm:smoke':         'Quick LLM smoke test (one exercise, verbose)',
  'validate:cross':             'Cross-validate LLM + human validations',
  'check:duplicates':           'Check for duplicate series IDs',
  'check:spell':                'Spellcheck markdown files',
  'lint':                       'Run ESLint + Prettier checks',
  'format':                     'Auto-format with Prettier',
  'clean':                      'Remove _site build output',
  'clean:yaml':                 'Clean and normalize YAML exercise files',
  'stats:svg':                  'Show SVG size statistics',
  'list:series':                'List all series with metadata',
  'list:type':                  'Show exercises of a given type',
  'list:human-validations':     'Show human-validated exercises',
  'review:failures':            'Review LLM validation failures interactively',
  'sync:human-validations':     'Sync human validations (dry run)',
  'sync:human-validations:write': 'Sync human validations (write)',
  'import:identities':          'Import identities into PocketBase',
  'convert:magic-color':        'Convert image to magic-color palette',
  'convert:pixelate':           'Pixelate an image',
  'serve:local':                'Serve built site locally',
  'serve:sim':                  'Start simulation server',
  'db:start':                   'Start PocketBase server',
  'db:admin':                   'Open PocketBase admin UI',
  'env:dev':                    'Switch to dev environment',
  'env:prod':                   'Switch to prod environment',
  'env:test':                   'Switch to test environment',
  'test':                       'Run unit tests (vitest)',
  'test:watch':                 'Run unit tests in watch mode',
  'test:auth':                  'Test PocketBase auth flow',
  'test:a11y':                  'Run accessibility tests',
  'test:e2e':                   'Run Playwright E2E tests',
  'test:e2e:ui':                'Playwright with interactive UI',
  'test:e2e:headed':            'Playwright in headed (visible browser) mode',
  'test:e2e:debug':             'Playwright in debug mode',
};

// Scripts not shown: internal (called by concurrently) or bun-only
const hidden = new Set(['start', 'dev:site', 'dev:css', 'dev:bun', 'dev:bun:site']);

console.log('\nAvailable commands:\n');
Object.keys(scripts)
  .filter(k => k !== 'help' && !hidden.has(k))
  .forEach(k => console.log('  npm run ' + k.padEnd(32) + (desc[k] || '')));
console.log();
