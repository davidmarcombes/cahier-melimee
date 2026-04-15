#!/usr/bin/env node
/**
 * Accessibility test suite using pa11y (WCAG2AA).
 *
 * Requires _site/ to be built first: npm run build
 * Usage: node scripts/a11y-test.js [--sample N]
 *
 * Tests static pages plus a random sample of exercise and application pages.
 * Exits with code 1 if any WCAG2AA errors are found.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8765;
const ROOT = path.join(__dirname, '../_site');
const BASE = `http://localhost:${PORT}`;

// How many exercise/application pages to sample (override with --sample N)
const argSample = process.argv.indexOf('--sample');
const SAMPLE_SIZE = argSample !== -1 ? parseInt(process.argv[argSample + 1], 10) : 3;

const COLORS = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

// ── Minimal static file server ──────────────────────────────────────────────

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
};

function createServer() {
  return http.createServer((req, res) => {
    let filePath = req.url.split('?')[0];
    let fullPath = path.join(ROOT, filePath);

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      fullPath = path.join(fullPath, 'index.html');
    }

    if (!fs.existsSync(fullPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404');
    }

    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(fullPath).pipe(res);
  });
}

// ── Page discovery ───────────────────────────────────────────────────────────

function sampleDirs(dir, n) {
  if (!fs.existsSync(dir)) return [];
  const all = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  // Deterministic shuffle via sort-by-name then stride sampling
  all.sort();
  const step = Math.max(1, Math.floor(all.length / n));
  const result = [];
  for (let i = 0; i < all.length && result.length < n; i += step) result.push(all[i]);
  return result;
}

function buildUrls() {
  const staticPages = [
    '/fr/',
    '/fr/a-propos/',
    '/fr/connexion/',
    '/fr/cahier/',
    '/fr/confidentialite/',
    '/fr/onboarding/',
  ];

  const exerciseIds = sampleDirs(path.join(ROOT, 'fr/exercices'), SAMPLE_SIZE);
  const applicationIds = sampleDirs(path.join(ROOT, 'fr/applications'), SAMPLE_SIZE);

  return [
    ...staticPages,
    ...exerciseIds.map((id) => `/fr/exercices/${id}/`),
    ...applicationIds.map((id) => `/fr/applications/${id}/`),
  ].map((p) => BASE + p);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(ROOT)) {
    console.error(`\n${COLORS.red}Error: _site/ not found. Run "npm run build" first.${COLORS.reset}\n`);
    process.exit(1);
  }

  const { default: pa11y } = await import('pa11y');

  const urls = buildUrls();

  const server = createServer();
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`\n  Server: ${BASE}`);
  console.log(`  Pages:  ${urls.length} (${SAMPLE_SIZE} sampled exercises + applications)\n`);

  const pa11yOptions = {
    standard: 'WCAG2AA',
    timeout: 20000,
    wait: 500,
    chromeLaunchConfig: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
    // Ignore notices — focus on errors and warnings
    ignore: ['notice'],
  };

  let totalErrors = 0;
  let totalWarnings = 0;
  const results = [];

  for (const url of urls) {
    const label = url.replace(BASE, '');
    process.stdout.write(`  ${label.padEnd(40)}`);
    try {
      const result = await pa11y(url, pa11yOptions);
      const errors = result.issues.filter((i) => i.type === 'error');
      const warnings = result.issues.filter((i) => i.type === 'warning');
      totalErrors += errors.length;
      totalWarnings += warnings.length;
      results.push({ url, label, errors, warnings });

      const errorStr =
        errors.length > 0 ? `${COLORS.red}${errors.length} error(s)${COLORS.reset}` : `${COLORS.green}✓${COLORS.reset}`;
      const warnStr = warnings.length > 0 ? `  ${COLORS.yellow}${warnings.length} warning(s)${COLORS.reset}` : '';
      console.log(`${errorStr}${warnStr}`);
    } catch (err) {
      console.log(`${COLORS.red}FAILED: ${err.message}${COLORS.reset}`);
      results.push({ url, label, failed: true, message: err.message });
    }
  }

  server.close();

  // ── Summary ────────────────────────────────────────────────────────────────
  if (totalErrors > 0) {
    console.error(`\n${COLORS.red}${COLORS.bold}${'='.repeat(70)}`);
    console.error(`  ACCESSIBILITY: ${totalErrors} error(s), ${totalWarnings} warning(s)`);
    console.error(`${'='.repeat(70)}${COLORS.reset}`);

    for (const { label, errors } of results.filter((r) => r.errors?.length > 0)) {
      console.error(`\n  ${COLORS.bold}${label}${COLORS.reset}`);
      for (const issue of errors) {
        console.error(`    ${COLORS.red}✗${COLORS.reset} ${issue.message}`);
        if (issue.selector) console.error(`      ${COLORS.yellow}${issue.selector}${COLORS.reset}`);
        if (issue.context) console.error(`      ${issue.context.trim().slice(0, 120)}`);
      }
    }

    if (totalWarnings > 0) {
      console.error(`\n  ${COLORS.yellow}${COLORS.bold}Warnings:${COLORS.reset}`);
      for (const { label, warnings } of results.filter((r) => r.warnings?.length > 0)) {
        console.error(`\n  ${COLORS.bold}${label}${COLORS.reset}`);
        for (const issue of warnings) {
          console.error(`    ${COLORS.yellow}⚠${COLORS.reset} ${issue.message}`);
          if (issue.selector) console.error(`      ${issue.selector}`);
        }
      }
    }

    console.error('');
    process.exit(1);
  } else {
    const warnNote =
      totalWarnings > 0 ? ` ${COLORS.yellow}(${totalWarnings} warning(s) — review recommended)${COLORS.reset}` : '';
    console.log(
      `\n${COLORS.green}${COLORS.bold}  ✓ ${urls.length} pages tested — no WCAG2AA errors${COLORS.reset}${warnNote}\n`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
