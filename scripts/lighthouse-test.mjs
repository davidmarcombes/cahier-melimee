#!/usr/bin/env node
/**
 * Lighthouse audit script.
 *
 * Requires _site/ to be built first: npm run build
 * Usage: node scripts/lighthouse-test.js [--sample N] [--report]
 *
 * Tests static pages plus a random sample of exercise and application pages.
 * Exits with code 1 if any category score falls below its threshold.
 *
 * Options:
 *   --sample N   Number of exercise/application pages to sample (default: 3)
 *   --report     Save HTML reports to reports/lighthouse/
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 8766;
const ROOT = path.join(__dirname, '../_site');
const REPORT_DIR = path.join(__dirname, '../reports/lighthouse');
const BASE = `http://localhost:${PORT}`;

// Thresholds (0–1 scale)
const THRESHOLDS = {
  performance: 0.85,
  accessibility: 0.9,
  'best-practices': 0.85,
  seo: 0.9,
};

// Parse args
const args = process.argv.slice(2);
const argSample = args.indexOf('--sample');
const SAMPLE_SIZE = argSample !== -1 ? parseInt(args[argSample + 1], 10) : 3;
const SAVE_REPORTS = args.includes('--report');

const COLORS = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

// ── Minimal static file server ────────────────────────────────────────────────

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
  '.avif': 'image/avif',
  '.webp': 'image/webp',
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

// ── Page discovery ────────────────────────────────────────────────────────────

function sampleDirs(dir, n) {
  if (!fs.existsSync(dir)) return [];
  const all = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  all.sort();
  const step = Math.max(1, Math.floor(all.length / n));
  const result = [];
  for (let i = 0; i < all.length && result.length < n; i += step) result.push(all[i]);
  return result;
}

function pageExists(urlPath) {
  const fullPath = path.join(ROOT, urlPath, 'index.html');
  return fs.existsSync(fullPath);
}

function buildUrls() {
  const staticPages = [
    '/fr/',
    '/fr/exercices/',
    '/fr/a-propos/',
    '/fr/connexion/',
    '/fr/onboarding/',
  ].filter(pageExists);

  const exerciseIds = sampleDirs(path.join(ROOT, 'fr/exercices'), SAMPLE_SIZE);
  const applicationIds = sampleDirs(path.join(ROOT, 'fr/applications'), SAMPLE_SIZE);

  return [
    ...staticPages,
    ...exerciseIds.map((id) => `/fr/exercices/${id}/`),
    ...applicationIds.map((id) => `/fr/applications/${id}/`),
  ].map((p) => BASE + p);
}

// ── Score formatting ──────────────────────────────────────────────────────────

function scoreColor(score, threshold) {
  if (score >= threshold) return COLORS.green;
  if (score >= threshold - 0.1) return COLORS.yellow;
  return COLORS.red;
}

function formatScore(score, threshold) {
  const pct = Math.round(score * 100);
  const color = scoreColor(score, threshold);
  const mark = score >= threshold ? '✓' : '✗';
  return `${color}${mark} ${pct}${COLORS.reset}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(ROOT)) {
    console.error(`\n${COLORS.red}Error: _site/ not found. Run "npm run build" first.${COLORS.reset}\n`);
    process.exit(1);
  }

  if (SAVE_REPORTS) fs.mkdirSync(REPORT_DIR, { recursive: true });

  const urls = buildUrls();
  const server = createServer();
  await new Promise((resolve) => server.listen(PORT, resolve));

  console.log(`\n  ${COLORS.bold}Lighthouse audit${COLORS.reset}`);
  console.log(`  ${COLORS.dim}Server: ${BASE}${COLORS.reset}`);
  console.log(`  ${COLORS.dim}Pages:  ${urls.length} (${SAMPLE_SIZE} sampled exercises + applications)${COLORS.reset}`);
  if (SAVE_REPORTS) console.log(`  ${COLORS.dim}Reports: ${REPORT_DIR}${COLORS.reset}`);
  console.log();

  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-setuid-sandbox'],
  });

  const failures = [];
  const allResults = [];

  for (const url of urls) {
    const label = url.replace(BASE, '') || '/';
    process.stdout.write(`  ${label.padEnd(42)}${COLORS.dim}`);

    try {
      const { lhr, report } = await lighthouse(url, {
        logLevel: 'silent',
        output: SAVE_REPORTS ? ['json', 'html'] : 'json',
        port: chrome.port,
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      });

      const scores = {
        performance: lhr.categories['performance'].score,
        accessibility: lhr.categories['accessibility'].score,
        'best-practices': lhr.categories['best-practices'].score,
        seo: lhr.categories['seo'].score,
      };

      process.stdout.write(COLORS.reset);

      const parts = [
        `P:${formatScore(scores.performance, THRESHOLDS.performance)}`,
        `A:${formatScore(scores.accessibility, THRESHOLDS.accessibility)}`,
        `BP:${formatScore(scores['best-practices'], THRESHOLDS['best-practices'])}`,
        `SEO:${formatScore(scores.seo, THRESHOLDS.seo)}`,
      ];
      console.log(parts.join('  '));

      const pageFailures = Object.entries(THRESHOLDS)
        .filter(([cat, min]) => scores[cat] < min)
        .map(([cat, min]) => `${cat}: ${Math.round(scores[cat] * 100)} < ${Math.round(min * 100)}`);

      if (pageFailures.length) failures.push({ label, failures: pageFailures });

      if (SAVE_REPORTS) {
        const slug = label.replace(/\//g, '_').replace(/^_|_$/g, '') || 'home';
        const htmlReport = Array.isArray(report) ? report[1] : report;
        fs.writeFileSync(path.join(REPORT_DIR, `${slug}.html`), htmlReport);
      }

      allResults.push({ label, scores });
    } catch (err) {
      process.stdout.write(COLORS.reset);
      console.log(`${COLORS.red}FAILED: ${err.message}${COLORS.reset}`);
      failures.push({ label, failures: [`error: ${err.message}`] });
    }
  }

  await chrome.kill();
  server.close();

  // ── Summary ───────────────────────────────────────────────────────────────

  // Average scores across all pages
  if (allResults.length > 1) {
    const avg = Object.keys(THRESHOLDS).reduce((acc, cat) => {
      acc[cat] = allResults.reduce((s, r) => s + (r.scores[cat] ?? 0), 0) / allResults.length;
      return acc;
    }, {});
    console.log(`\n  ${COLORS.bold}${COLORS.dim}Averages:${COLORS.reset}`);
    const parts = [
      `P:${formatScore(avg.performance, THRESHOLDS.performance)}`,
      `A:${formatScore(avg.accessibility, THRESHOLDS.accessibility)}`,
      `BP:${formatScore(avg['best-practices'], THRESHOLDS['best-practices'])}`,
      `SEO:${formatScore(avg.seo, THRESHOLDS.seo)}`,
    ];
    console.log(`  ${parts.join('  ')}\n`);
  }

  if (failures.length > 0) {
    console.error(`${COLORS.red}${COLORS.bold}  ✗ ${failures.length} page(s) below threshold:${COLORS.reset}`);
    for (const { label, failures: f } of failures) {
      console.error(`    ${COLORS.bold}${label}${COLORS.reset}`);
      for (const msg of f) console.error(`      ${COLORS.red}${msg}${COLORS.reset}`);
    }
    console.error();
    process.exit(1);
  } else {
    console.log(`${COLORS.green}${COLORS.bold}  ✓ All ${urls.length} pages passed Lighthouse thresholds${COLORS.reset}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
