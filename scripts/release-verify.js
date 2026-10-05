#!/usr/bin/env node
/**
 * release-verify.js — last check of the production artifact, after `npm run build` and before the
 * manual upload to LWS. Read-only; exits 1 on any error. See docs/release.md.
 *
 *   1. Artifact  — required files present (.htaccess, sw.js, 404…); no dev-only content (/admin/,
 *                  dev.js, the dev API, localhost URLs); sitemap URLs on the production origin
 *   2. Links     — every local href / src / srcset of every page points to a file of the artifact
 *   3. Series    — series live today that this version removes (their URLs would 404 and the
 *                  students' progress would be orphaned). Pre-release: a warning; --strict-ids once
 *                  the site is public (then add redirects to src/.htaccess)
 *   4. Budgets   — every HTML page ≤ 10 KB gzip (what LWS sends), see agents/performance.md
 *
 *   npm run release:verify                       checks _site/ (SITE_OUT to check another folder)
 *   npm run release:verify -- --offline          skip the comparison with the live site
 *   npm run release:verify -- --strict-ids       removed series are errors
 */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, process.env.SITE_OUT || '_site');
const PROD = (process.env.PROD_URL || 'https://www.melimee.fr').replace(/\/$/, '');
const args = process.argv.slice(2);
const OFFLINE = args.includes('--offline');
const STRICT_IDS = args.includes('--strict-ids');

const ESC = String.fromCharCode(27);
const C = {
  red: ESC + '[31m',
  green: ESC + '[32m',
  yellow: ESC + '[33m',
  dim: ESC + '[2m',
  bold: ESC + '[1m',
  reset: ESC + '[0m',
};

const errors = [];
const warnings = [];
const rel = (abs) => path.relative(SITE, abs).split(path.sep).join('/');
const read = (p) => fs.readFileSync(path.join(SITE, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(SITE, p));

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// ─── 1. Artifact ──────────────────────────────────────────────────────────────

function checkArtifact(files) {
  for (const f of ['.htaccess', 'sw.js', '404.html', 'sitemap.xml', 'robots.txt', 'manifest.json', 'fr/index.html'])
    if (!exists(f)) errors.push(`missing ${f}`);

  // Dev-only content (the dashboard is written only under npm start: src/admin/admin.11tydata.js)
  if (exists('admin/index.html')) errors.push('admin/index.html is in the artifact (dev-only dashboard)');
  const DEV_MARKERS = [
    ['id="admin-data"', 'admin dashboard data'],
    ['/assets/js/dev.js', 'dev.js script'],
    ['/api/human-', 'dev API call'],
  ];
  const LOCAL_URL = /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/;
  const textual = files.filter((f) => /\.(html|xml|json|txt|webmanifest)$/.test(f) || rel(f) === 'sw.js');
  const devHits = new Map();
  const localHits = [];
  for (const f of textual) {
    const s = fs.readFileSync(f, 'utf8');
    if (f.endsWith('.html'))
      for (const [marker, what] of DEV_MARKERS)
        if (s.includes(marker)) devHits.set(what, [...(devHits.get(what) || []), rel(f)]);
    const m = s.match(LOCAL_URL);
    if (m) localHits.push(`${rel(f)} (${m[0]})`);
  }
  for (const [what, pages] of devHits)
    errors.push(`${what} in ${pages.length} page(s), e.g. ${pages.slice(0, 3).join(', ')}`);
  if (localHits.length)
    errors.push(
      `localhost URLs in ${localHits.length} file(s), e.g. ${localHits.slice(0, 3).join(', ')} — is .env on prod? (npm run env:prod)`
    );

  if (exists('sitemap.xml')) {
    const locs = [...read('sitemap.xml').matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
    const off = locs.filter((u) => !u.startsWith(PROD + '/'));
    if (off.length) errors.push(`sitemap: ${off.length} URL(s) not on ${PROD}, e.g. ${off[0]}`);
    if (locs.some((u) => u.includes('/admin/'))) errors.push('sitemap lists /admin/');
  }
  if (exists('sw.js') && read('sw.js').includes('/admin/')) errors.push('sw.js precaches /admin/');
}

// ─── 2. Internal links ────────────────────────────────────────────────────────

// Static attributes only: Alpine's :href / :src are preceded by ':' so \s excludes them
const ATTR = /\s(href|src|srcset)=(?:"([^"]*)"|'([^']*)')/g;

function targetsOf(html) {
  const out = [];
  for (const m of html.matchAll(ATTR)) {
    const v = m[2] ?? m[3];
    if (m[1] === 'srcset') out.push(...v.split(',').map((c) => c.trim().split(/\s+/)[0]));
    else out.push(v);
  }
  return out;
}

function resolves(url, pageFile) {
  let u = url.trim();
  if (u.startsWith(PROD + '/')) u = u.slice(PROD.length);
  if (!u || u.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(u) || u.startsWith('//')) return true; // external, mailto:, data:…
  u = u.split('#')[0].split('?')[0];
  if (!u) return true;
  let p;
  try {
    p = decodeURIComponent(u);
  } catch {
    return false;
  }
  const abs = p.startsWith('/') ? path.join(SITE, p) : path.join(path.dirname(pageFile), p);
  if (!abs.startsWith(SITE)) return false;
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return true;
  return fs.existsSync(path.join(abs, 'index.html'));
}

function checkLinks(files) {
  const broken = new Map(); // url → pages
  let count = 0;
  for (const f of files.filter((x) => x.endsWith('.html'))) {
    for (const t of targetsOf(fs.readFileSync(f, 'utf8'))) {
      count++;
      if (!resolves(t, f)) broken.set(t, [...(broken.get(t) || []), rel(f)]);
    }
  }
  for (const [url, pages] of broken)
    errors.push(`broken link ${url} — in ${pages.length} page(s), e.g. ${pages.slice(0, 2).join(', ')}`);
  return count;
}

// ─── 3. Series removed compared with the live site ────────────────────────────

const idsOf = (csv) =>
  new Set(
    csv
      .replace(/\r/g, '')
      .trim()
      .split('\n')
      .slice(1)
      .map((l) => l.split(',')[0])
      .filter(Boolean)
  );

async function checkSeries() {
  if (!exists('fr/exercices/data.csv')) return errors.push('missing fr/exercices/data.csv (series list)');
  const next = idsOf(read('fr/exercices/data.csv'));
  if (OFFLINE) return `${next.size} series (live comparison skipped)`;
  let live;
  try {
    const res = await fetch(`${PROD}/fr/exercices/data.csv`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    live = idsOf(await res.text());
  } catch (e) {
    warnings.push(`live series list unavailable (${e.message}) — removed series not checked`);
    return `${next.size} series`;
  }
  const removed = [...live].filter((id) => !next.has(id));
  const added = [...next].filter((id) => !live.has(id)).length;
  if (removed.length) {
    const msg = `${removed.length} live series removed or renamed (their URLs will 404, progress orphaned): ${removed.join(' ')}`;
    (STRICT_IDS ? errors : warnings).push(msg + (STRICT_IDS ? ' — add redirects to src/.htaccess' : ''));
  }
  return `${next.size} series: ${added} new, ${removed.length} removed, vs ${live.size} live`;
}

// ─── 4. Page budget ───────────────────────────────────────────────────────────

const PAGE_GZIP_MAX = 10 * 1024; // agents/performance.md

function checkBudgets(files) {
  const sizes = files
    .filter((f) => f.endsWith('.html'))
    .map((f) => ({ f: rel(f), gz: zlib.gzipSync(fs.readFileSync(f), { level: 9 }).length }))
    .sort((a, b) => b.gz - a.gz);
  const over = sizes.filter((x) => x.gz > PAGE_GZIP_MAX);
  if (over.length)
    errors.push(
      `${over.length} page(s) over ${PAGE_GZIP_MAX / 1024} KB gzip, e.g. ${over
        .slice(0, 3)
        .map((x) => `${x.f} (${(x.gz / 1024).toFixed(1)} KB)`)
        .join(', ')}`
    );
  return sizes.length ? `largest page ${(sizes[0].gz / 1024).toFixed(1)} KB gzip` : 'no pages';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  if (!fs.existsSync(SITE)) {
    console.error(`${C.red}No ${path.relative(ROOT, SITE)}/ — run npm run build first.${C.reset}`);
    process.exit(1);
  }
  const files = walk(SITE);
  checkArtifact(files);
  const links = checkLinks(files);
  const series = await checkSeries();
  const budget = checkBudgets(files);

  console.log(`${C.bold}Release verify${C.reset} ${C.dim}${path.relative(ROOT, SITE)}/ → ${PROD}${C.reset}`);
  console.log(`  ${files.length} files · ${links} links checked · ${series} · ${budget}`);
  for (const w of warnings) console.log(`  ${C.yellow}⚠ ${w}${C.reset}`);
  for (const e of errors) console.log(`  ${C.red}✗ ${e}${C.reset}`);
  if (errors.length) {
    console.log(`\n${C.red}${C.bold}✗ ${errors.length} problem(s) — do not upload.${C.reset}`);
    process.exit(1);
  }
  console.log(
    `\n${C.green}${C.bold}✓ Ready to upload${C.reset} ${C.dim}the contents of ${path.relative(ROOT, SITE)}/, including .htaccess and sw.js${C.reset}`
  );
})();
