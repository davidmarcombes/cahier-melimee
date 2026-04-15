/**
 * check-build-urls.js
 * Sanity-checks all href/src/action attributes in the built _site/
 * against the expected PATH_PREFIX from .env.
 *
 * Usage: node scripts/check-build-urls.js
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

// ── Config ────────────────────────────────────────────────────────────────────

const SITE_DIR = join(process.cwd(), '_site');

// Read PATH_PREFIX from .env (fallback to '/')
let PATH_PREFIX = '/';
try {
  const env = readFileSync(join(process.cwd(), '.env'), 'utf8');
  const m = env.match(/^PATH_PREFIX\s*=\s*(.+)$/m);
  if (m) PATH_PREFIX = m[1].trim();
} catch {
  /* .env absent — use default PATH_PREFIX */
}

console.log(`Checking _site/ against PATH_PREFIX="${PATH_PREFIX}"\n`);

// ── HTML file discovery ───────────────────────────────────────────────────────

function walkHtml(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walkHtml(full));
    else if (entry.endsWith('.html')) files.push(full);
  }
  return files;
}

// ── URL attribute extraction ──────────────────────────────────────────────────

// Matches static href/src/action/srcset — NOT Alpine dynamic bindings (:href etc.)
const ATTR_RE = /(?<![:\w])(?:href|src|action|srcset)="([^"]+)"/g;

function isExternalOrSafe(val) {
  return (
    val.startsWith('http://') ||
    val.startsWith('https://') ||
    val.startsWith('mailto:') ||
    val.startsWith('data:') ||
    val.startsWith('#') ||
    val === '' ||
    // Relative URLs (../ or ./) are fine — they resolve correctly regardless of prefix
    val.startsWith('../') ||
    val.startsWith('./') ||
    // JS expressions that slipped through (Alpine inline expressions)
    val.startsWith('(') ||
    val.startsWith("'") ||
    val.includes(' + ')
  );
}

// ── Checks ────────────────────────────────────────────────────────────────────

const issues = [];

function check(file, url, attr) {
  const rel = relative(SITE_DIR, file);

  // Skip external / safe values
  if (isExternalOrSafe(url)) return;

  // Skip srcset entries (space-separated list of url width descriptors)
  // Already split by the regex match — individual tokens may be widths like "256w"
  if (/^\d+w$/.test(url)) return;

  // Must start with PATH_PREFIX
  if (!url.startsWith(PATH_PREFIX)) {
    issues.push({ file: rel, attr, url, reason: `missing prefix "${PATH_PREFIX}"` });
    return;
  }

  // No double slashes after the prefix
  const afterPrefix = url.slice(PATH_PREFIX.length);
  if (afterPrefix.startsWith('/')) {
    issues.push({ file: rel, attr, url, reason: 'double slash after prefix' });
    return;
  }

  // Asset must exist on disk (skip dynamic JS-built URLs)
  // Only check paths that look like static files (have an extension)
  if (url.includes('.') && !url.includes('?')) {
    // Map URL to filesystem path
    const fsPath = join(SITE_DIR, '..', url); // _site is served at PATH_PREFIX
    // We can't simply resolve because _site/ IS the root for PATH_PREFIX
    // e.g. /melimee/css/styles.css → _site/css/styles.css
    const relative_url = url.slice(PATH_PREFIX.length);
    const disk = join(SITE_DIR, relative_url);
    if (!existsSync(disk)) {
      issues.push({ file: rel, attr, url, reason: 'file not found on disk' });
    }
  }
}

// ── Run ───────────────────────────────────────────────────────────────────────

let fileCount = 0;
for (const file of walkHtml(SITE_DIR)) {
  fileCount++;
  const html = readFileSync(file, 'utf8');
  let m;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(html)) !== null) {
    const raw = m[1];
    const attr = m[0].split('=')[0];
    // srcset may contain space-separated "url width" pairs
    if (attr === 'srcset') {
      for (const part of raw.split(',')) {
        const token = part.trim().split(/\s+/)[0];
        check(file, token, 'srcset');
      }
    } else {
      check(file, raw, attr);
    }
  }
}

// ── Canonical URL check ───────────────────────────────────────────────────────

const SITE_URL_RE = /content="(https?:\/\/[^"]+)"/g;
const EXPECTED_ORIGIN = (() => {
  try {
    const env = readFileSync(join(process.cwd(), '.env'), 'utf8');
    const m = env.match(/^SITE_URL\s*=\s*(.+)$/m);
    return m ? m[1].trim().replace(/\/$/, '') : null;
  } catch (_) {
    return null;
  }
})();

if (EXPECTED_ORIGIN) {
  for (const file of walkHtml(SITE_DIR)) {
    // Skip root redirect page — it has a relative canonical by design
    if (relative(SITE_DIR, file) === 'index.html') continue;
    const html = readFileSync(file, 'utf8');
    const canonRe = /rel="canonical"\s+href="([^"]+)"/g;
    let m;
    while ((m = canonRe.exec(html)) !== null) {
      if (!m[1].startsWith(EXPECTED_ORIGIN)) {
        issues.push({
          file: relative(SITE_DIR, file),
          attr: 'canonical',
          url: m[1],
          reason: `expected to start with "${EXPECTED_ORIGIN}"`,
        });
      }
    }
  }
}

// ── CSV check ─────────────────────────────────────────────────────────────────

const csvPath = join(SITE_DIR, 'fr', 'exercices', 'data.csv');
if (existsSync(csvPath)) {
  const rows = readFileSync(csvPath, 'utf8').trim().split('\n');
  const header = rows[0];
  if (!header.startsWith('id,l,s,t,title,d,f,ty,cl')) {
    issues.push({ file: 'fr/exercices/data.csv', attr: 'header', url: header, reason: 'unexpected CSV header' });
  }
  const tyUndef = rows.slice(1).filter((r) => r.split(',')[7] === undefined || r.split(',')[7] === '').length;
  if (tyUndef > 0) {
    issues.push({
      file: 'fr/exercices/data.csv',
      attr: 'ty column',
      url: '',
      reason: `${tyUndef} rows missing type index`,
    });
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

console.log(`Scanned ${fileCount} HTML files.`);

if (issues.length === 0) {
  console.log('✅  No URL issues found.\n');
  process.exit(0);
} else {
  // Group by reason for a cleaner output
  const byReason = new Map();
  for (const issue of issues) {
    const key = issue.reason;
    if (!byReason.has(key)) byReason.set(key, []);
    byReason.get(key).push(issue);
  }
  for (const [reason, list] of byReason) {
    console.log(`\n❌  ${reason} (${list.length} occurrences)`);
    // Show first 5 examples
    for (const { file, attr, url } of list.slice(0, 5)) {
      console.log(`     ${attr}="${url}"  in  ${file}`);
    }
    if (list.length > 5) console.log(`     … and ${list.length - 5} more`);
  }
  console.log(`\n${issues.length} issue(s) total.\n`);
  process.exit(1);
}
