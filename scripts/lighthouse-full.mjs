#!/usr/bin/env node
/**
 * Full Lighthouse audit: all static pages + one exercise per type.
 *
 * Requires _site/ to be built first: npm run build
 * Usage: node scripts/lighthouse-full.mjs [--report] [--desktop]
 *
 * Options:
 *   --report    Save HTML reports to reports/lighthouse-full/
 *   --desktop   Use desktop preset (no throttling) — closer to DevTools scores
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../_site');
const CSV = path.join(ROOT, 'fr/exercices/data.csv');
const REPORT_DIR = path.join(__dirname, '../reports/lighthouse-full');
const PORT = 8768;
const BASE = `http://localhost:${PORT}`;

const args = process.argv.slice(2);
const SAVE_REPORTS = args.includes('--report');
const DESKTOP = args.includes('--desktop');

// Thresholds (0–1). Same as lighthouse-test.mjs.
const THRESHOLDS = {
  performance: 0.85,
  accessibility: 0.9,
  'best-practices': 0.85,
  seo: 0.9,
};

// Type index → name — kept in sync with CSV_TYPES in app.js
const CSV_TYPES = [
  '',             // 0 — unused
  'bar-chart',    // 1
  'base-10',      // 2
  'bounding',     // 3
  'calc-chain',   // 4
  'checkbox',     // 5
  'click-blocks', // 6
  'clock',        // 7
  'column-op',    // 8
  'compare',      // 9
  'compare-groups',    // 10
  'convert',           // 11
  'coordinate-grid',   // 12
  'count-objects',     // 13
  'decimal-triple',    // 14
  'decomp',            // 15
  'drag-sort',         // 16
  'fill-table',        // 17
  'fraction',          // 18
  'fraction-check',    // 19
  'fraction-paint',    // 20
  'function-machine',  // 21
  'inverse-problem',   // 22
  'logic-grid',        // 23
  'magic-color',       // 24
  'matching',          // 25
  'maze',              // 26
  'mcq',               // 27
  'multi',             // 28
  'multi-question',    // 29
  'number-check',      // 30
  'number-hunt',       // 31
  'number-line',       // 32
  'problem',           // 33
  'pyramid',           // 34
  'ruler',             // 35
  'select',            // 36
  'sequence',          // 37
  'sort',              // 38
  'svg-tiles',         // 39
  'thermometer',       // 40
  'tile-select',       // 41
  'tri-arith',         // 42
  'true-false',        // 43
  'venn',              // 44
  'defi',              // 45
  'compare-expressions', // 46
  'estimation',          // 47
  'error-analysis',      // 48
  'compare-solutions',   // 49
  'futoshiki',           // 50
  'kenken',              // 51
  'numberlink',          // 52
  'think-board',         // 53
  'guided-problem',      // 54
  'bar-model',           // 55
  'fact-family',         // 56
];

const COLORS = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', dim: '\x1b[2m', bold: '\x1b[1m', reset: '\x1b[0m',
};
const c = COLORS;

// ── Static file server ────────────────────────────────────────────────────────

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css',
  '.js': 'application/javascript', '.json': 'application/json',
  '.woff2': 'font/woff2', '.avif': 'image/avif', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.csv': 'text/csv', '.txt': 'text/plain',
};

function createServer() {
  return http.createServer((req, res) => {
    let fp = path.join(ROOT, req.url.split('?')[0]);
    if (fs.existsSync(fp) && fs.statSync(fp).isDirectory()) fp = path.join(fp, 'index.html');
    if (!fs.existsSync(fp)) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
    fs.createReadStream(fp).pipe(res);
  });
}

// ── Page discovery ────────────────────────────────────────────────────────────

function discoverStaticPages() {
  // All index.html under /fr/ that are not exercise/application/defi pages
  const frDir = path.join(ROOT, 'fr');
  const skipDirs = new Set(['exercices', 'applications', 'defis']);
  const pages = ['/fr/'];

  for (const entry of fs.readdirSync(frDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || skipDirs.has(entry.name)) continue;
    const idx = path.join(frDir, entry.name, 'index.html');
    if (fs.existsSync(idx)) pages.push(`/fr/${entry.name}/`);
  }

  // Listing pages
  for (const folder of ['exercices', 'applications', 'defis']) {
    const idx = path.join(ROOT, 'fr', folder, 'index.html');
    if (fs.existsSync(idx)) pages.push(`/fr/${folder}/`);
  }

  return pages;
}

function discoverTypePages() {
  // Read data.csv, pick first exercise ID per type index
  if (!fs.existsSync(CSV)) {
    console.warn(`${c.yellow}Warning: data.csv not found — skipping type coverage${c.reset}`);
    return [];
  }

  const rows = fs.readFileSync(CSV, 'utf8').replace(/\r/g, '').trim().split('\n').slice(1);
  const seenTypes = new Map(); // typeIdx → { id, folder, typeName }

  for (const row of rows) {
    if (!row) continue;
    const cols = row.split(',');
    const id = cols[0];
    const folder = cols[6] === 'd' ? 'defis' : cols[6] === 'a' ? 'applications' : 'exercices';
    const tyIdx = cols[7] !== undefined && cols[7] !== '' ? Number(cols[7]) : -1;
    const typeName = CSV_TYPES[tyIdx] || `type-${tyIdx}`;

    if (tyIdx > 0 && !seenTypes.has(tyIdx)) {
      // Verify the page actually exists in _site
      const pagePath = path.join(ROOT, 'fr', folder, id, 'index.html');
      if (fs.existsSync(pagePath)) {
        seenTypes.set(tyIdx, { id, folder, typeName });
      }
    }
  }

  return [...seenTypes.values()]
    .sort((a, b) => a.typeName.localeCompare(b.typeName))
    .map(({ id, folder, typeName }) => ({ url: `/fr/${folder}/${id}/`, label: typeName }));
}

// ── Score helpers ─────────────────────────────────────────────────────────────

function scoreColor(score, threshold) {
  if (score >= threshold) return c.green;
  if (score >= threshold - 0.1) return c.yellow;
  return c.red;
}

function fmt(score, threshold) {
  const pct = Math.round(score * 100);
  const col = scoreColor(score, threshold);
  const mark = score >= threshold ? '✓' : '✗';
  return `${col}${mark}${pct}${c.reset}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(ROOT)) {
    console.error(`\n${c.red}Error: _site/ not found. Run "npm run build" first.${c.reset}\n`);
    process.exit(1);
  }

  if (SAVE_REPORTS) fs.mkdirSync(REPORT_DIR, { recursive: true });

  const staticPages = discoverStaticPages().map(url => ({ url, label: url }));
  const typePages = discoverTypePages();

  const allPages = [
    { group: 'Static pages', pages: staticPages },
    { group: `Exercise types (${typePages.length} types)`, pages: typePages },
  ];

  const totalPages = staticPages.length + typePages.length;

  console.log(`\n${c.bold}Lighthouse full audit${c.reset}  ${c.dim}${DESKTOP ? 'desktop' : 'mobile (throttled)'}${c.reset}`);
  console.log(`${c.dim}${totalPages} pages: ${staticPages.length} static + ${typePages.length} exercise types${c.reset}\n`);

  const server = createServer();
  await new Promise(r => server.listen(PORT, r));

  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-setuid-sandbox'],
  });

  const lhOptions = {
    logLevel: 'silent',
    output: SAVE_REPORTS ? ['json', 'html'] : 'json',
    port: chrome.port,
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    ...(DESKTOP ? { preset: 'desktop', throttlingMethod: 'provided' } : {}),
  };

  const failures = [];
  const allResults = [];

  for (const { group, pages } of allPages) {
    console.log(`${c.bold}${c.cyan}── ${group}${c.reset}`);

    for (const { url, label } of pages) {
      const displayLabel = label.length > 36 ? label.slice(0, 35) + '…' : label;
      process.stdout.write(`  ${displayLabel.padEnd(37)}`);

      try {
        const { lhr, report } = await lighthouse(BASE + url, lhOptions);

        const s = {
          performance:      lhr.categories['performance'].score,
          accessibility:    lhr.categories['accessibility'].score,
          'best-practices': lhr.categories['best-practices'].score,
          seo:              lhr.categories['seo'].score,
        };

        const cls = lhr.audits['cumulative-layout-shift']?.displayValue ?? '?';
        const lcp = lhr.audits['largest-contentful-paint']?.displayValue ?? '?';

        console.log(
          `P:${fmt(s.performance, THRESHOLDS.performance)}  ` +
          `A:${fmt(s.accessibility, THRESHOLDS.accessibility)}  ` +
          `BP:${fmt(s['best-practices'], THRESHOLDS['best-practices'])}  ` +
          `SEO:${fmt(s.seo, THRESHOLDS.seo)}  ` +
          `${c.dim}CLS:${cls}  LCP:${lcp}${c.reset}`
        );

        const pageFailures = Object.entries(THRESHOLDS)
          .filter(([cat, min]) => s[cat] < min)
          .map(([cat, min]) => `${cat}: ${Math.round(s[cat] * 100)} < ${Math.round(min * 100)}`);

        if (pageFailures.length) failures.push({ url, label, failures: pageFailures });

        if (SAVE_REPORTS) {
          const slug = (label + url).replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
          const htmlReport = Array.isArray(report) ? report[1] : report;
          fs.writeFileSync(path.join(REPORT_DIR, `${slug}.html`), htmlReport);
        }

        allResults.push({ url, label, scores: s });
      } catch (err) {
        console.log(`${c.red}FAILED: ${err.message}${c.reset}`);
        failures.push({ url, label, failures: [`error: ${err.message}`] });
      }
    }
    console.log();
  }

  await chrome.kill();
  server.close();

  // ── Summary ───────────────────────────────────────────────────────────────

  if (allResults.length > 0) {
    const avg = Object.keys(THRESHOLDS).reduce((acc, cat) => {
      acc[cat] = allResults.reduce((s, r) => s + (r.scores[cat] ?? 0), 0) / allResults.length;
      return acc;
    }, {});
    console.log(`${c.bold}Averages${c.reset}  ` +
      `P:${fmt(avg.performance, THRESHOLDS.performance)}  ` +
      `A:${fmt(avg.accessibility, THRESHOLDS.accessibility)}  ` +
      `BP:${fmt(avg['best-practices'], THRESHOLDS['best-practices'])}  ` +
      `SEO:${fmt(avg.seo, THRESHOLDS.seo)}\n`
    );
  }

  if (failures.length > 0) {
    console.error(`${c.red}${c.bold}✗ ${failures.length} page(s) below threshold:${c.reset}`);
    for (const { label, url, failures: f } of failures) {
      console.error(`  ${c.bold}${label}${c.reset}  ${c.dim}${url}${c.reset}`);
      for (const msg of f) console.error(`    ${c.red}${msg}${c.reset}`);
    }
    console.error();
    process.exit(1);
  }

  console.log(`${c.green}${c.bold}✓ All ${allResults.length} pages passed Lighthouse thresholds${c.reset}\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
