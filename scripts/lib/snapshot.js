/**
 * Checkpoints of the built site, and smart comparisons against them.
 * Used by scripts/snapshot.js (take a checkpoint) and scripts/regress.js (compare to one).
 *
 * A checkpoint is .snapshots/<name>/ : site/ (the built site, unminified), manifest.json (git state,
 * a hash per page, a hash per JS « unit »), shots/ (screenshots, taken on demand and cached).
 * Builds are deterministic (build-time shuffles are seeded in .eleventy.js), and screenshots seed
 * Math.random per URL, so the same code gives the same pages and the same pixels.
 */
/* global location, document, window -- inside page.evaluate / addInitScript callbacks (run in the browser) */
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const SNAP_DIR = path.join(ROOT, '.snapshots');
const SECTIONS = ['exercices', 'applications', 'defis'];

const hash = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}
function gitState() {
  const changed = git('status --porcelain').split('\n').filter(Boolean);
  return {
    sha: git('rev-parse --short HEAD'),
    branch: git('rev-parse --abbrev-ref HEAD'),
    dirty: changed.length > 0,
    changed: changed.length,
  };
}

// ─── Build ────────────────────────────────────────────────────────────────────

/** Build the working tree into `outDir` (absolute). Same steps as `npm run check`, without minify / sw. */
function buildSite(outDir) {
  fs.rmSync(outDir, { recursive: true, force: true });
  const out = rel(outDir);
  const env = { ...process.env, SITE_OUT: out };
  const run = (cmd) => {
    try {
      execSync(cmd, { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      throw new Error(`build failed: ${cmd}\n${e.stderr || ''}${e.stdout || ''}`, { cause: e });
    }
  };
  run('npm run generate:tokens --silent');
  run('npx eleventy --quiet');
  run(`npx tailwindcss -i src/css/input.css -o ${out}/css/styles.css --minify`);
}

// ─── Pages ────────────────────────────────────────────────────────────────────

/** Every built page: { label: 'fr/exercices/abcd1234', url: '/fr/exercices/abcd1234/' } */
function listPages(siteDir) {
  const pages = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!['assets', 'css', 'admin'].includes(e.name)) walk(path.join(dir, e.name));
      } else if (e.name === 'index.html') {
        const label = rel(dir).slice(rel(siteDir).length + 1) || 'index';
        pages.push({ label, url: label === 'index' ? '/' : `/${label}/` });
      }
    }
  };
  walk(siteDir);
  return pages.sort((a, b) => a.label.localeCompare(b.label));
}
const isSeries = (label) => SECTIONS.some((s) => label.startsWith(`fr/${s}/`) && label.split('/').length === 3);
const pageFile = (siteDir, label) => path.join(siteDir, label === 'index' ? '' : label, 'index.html');

/** What a series page uses: generators, SVG helpers, exercise types (read from its JSON payload) */
function pageDeps(html) {
  const all = (re) => [...new Set([...html.matchAll(re)].map((m) => m[1]))];
  return {
    generators: all(/_gen\\?"\s*:\s*\{\s*\\?"name\\?"\s*:\s*\\?"([\w$]+)/g),
    svg: all(/\\?"gen\\?"\s*:\s*\\?"([\w$]+)\\?"/g).filter((g) => g !== 'file'),
    types: all(/\\?"type\\?"\s*:\s*\\?"([a-z][a-z0-9-]*)\\?"/g),
  };
}

// ─── JS units ─────────────────────────────────────────────────────────────────

/** Top-level declarations of a script → { name: hash } (svg.js: one unit per drawing helper) */
function topLevelUnits(src) {
  const units = {};
  const re = /^(?:async\s+)?(?:function\*?\s+|const\s+|let\s+|var\s+|class\s+)([A-Za-z0-9_$]+)/gm;
  const marks = [...src.matchAll(re)].map((m) => ({ name: m[1], at: m.index }));
  units._head = hash(src.slice(0, marks.length ? marks[0].at : src.length));
  marks.forEach((m, i) => (units[m.name] = hash(src.slice(m.at, i + 1 < marks.length ? marks[i + 1].at : src.length))));
  return units;
}

/** Generators of one file → { name: hash of its own code }, plus `_shared` for the rest of the file */
function generatorUnits(file) {
  const src = fs.readFileSync(file, 'utf8');
  delete require.cache[require.resolve(file)];
  let mod;
  try {
    mod = require(file);
  } catch {
    return { _shared: hash(src) };
  }
  const units = {};
  let rest = src;
  for (const [name, g] of Object.entries(mod)) {
    const code = Object.values(g || {})
      .map((v) => (typeof v === 'function' ? v.toString() : JSON.stringify(v)))
      .join('\n');
    units[name] = hash(code);
    for (const v of Object.values(g || {})) if (typeof v === 'function') rest = rest.split(v.toString()).join('');
  }
  units._shared = hash(rest); // helpers and constants shared by the file's generators
  return units;
}

/** Hashes of everything the browser runs or styles with: per helper, per generator, per file */
function jsUnits(siteDir) {
  const js = path.join(siteDir, 'assets', 'js');
  const out = { svg: {}, generators: {}, files: {} };
  if (fs.existsSync(path.join(js, 'svg.js'))) out.svg = topLevelUnits(fs.readFileSync(path.join(js, 'svg.js'), 'utf8'));
  const genDir = path.join(js, 'generators');
  if (fs.existsSync(genDir))
    for (const f of fs.readdirSync(genDir).filter((f) => f.endsWith('.js') && f !== 'index.js'))
      out.generators[f] =
        f === '_core.js'
          ? { _shared: hash(fs.readFileSync(path.join(genDir, f), 'utf8')) }
          : generatorUnits(path.join(genDir, f));
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (p !== genDir) walk(p);
      } else if (e.name.endsWith('.js') && p !== path.join(js, 'svg.js'))
        out.files[rel(p).slice(rel(siteDir).length + 1)] = hash(fs.readFileSync(p, 'utf8'));
    }
  };
  if (fs.existsSync(js)) walk(js);
  const css = path.join(siteDir, 'css', 'styles.css');
  if (fs.existsSync(css)) out.files['css/styles.css'] = hash(fs.readFileSync(css, 'utf8'));
  return out;
}

/** Hash of every page + JS units + git state */
function makeManifest(name, siteDir) {
  const pages = {};
  for (const p of listPages(siteDir)) pages[p.label] = hash(fs.readFileSync(pageFile(siteDir, p.label), 'utf8'));
  return { name, createdAt: new Date().toISOString(), git: gitState(), pages, js: jsUnits(siteDir) };
}

// ─── Snapshots on disk ────────────────────────────────────────────────────────

function snapshotPath(name) {
  return path.join(SNAP_DIR, name);
}
function listSnapshots() {
  if (!fs.existsSync(SNAP_DIR)) return [];
  return fs
    .readdirSync(SNAP_DIR)
    .filter((n) => !n.startsWith('_') && fs.existsSync(path.join(SNAP_DIR, n, 'manifest.json')))
    .map((n) => JSON.parse(fs.readFileSync(path.join(SNAP_DIR, n, 'manifest.json'), 'utf8')))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// ─── Serving and screenshots ──────────────────────────────────────────────────

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.csv': 'text/csv',
};

/** Static server for a built site; resolves to { url, close } */
function serve(siteDir) {
  const server = http.createServer((req, res) => {
    let p = path.join(siteDir, decodeURIComponent(req.url.split(/[?#]/)[0]));
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
    if (!fs.existsSync(p)) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((resolve) =>
    server.listen(0, () => resolve({ url: `http://localhost:${server.address().port}`, close: () => server.close() }))
  );
}

const SHOT_VIEWPORT = { width: 1000, height: 900 };
const MAX_EXERCISES = 12;

/**
 * Screenshot a page in light and dark, one image per exercise (#1…#n) for series pages.
 * Math.random is seeded per URL, animations are off: same code → same pixels.
 * Returns the list of written files (relative to outDir).
 */
async function capturePage(browser, baseUrl, page, outDir) {
  const written = [];
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({
      viewport: SHOT_VIEWPORT,
      colorScheme: scheme,
      serviceWorkers: 'block',
      deviceScaleFactor: 1,
    });
    await ctx.addInitScript(() => {
      let s = 0;
      for (const c of location.pathname + location.hash) s = (Math.imul(s, 31) + c.charCodeAt(0)) | 0;
      Math.random = () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    });
    const tab = await ctx.newPage();
    const open = async (hashPart) => {
      await tab.goto(baseUrl + page.url + hashPart, { waitUntil: 'load' });
      if (hashPart) await tab.evaluate(() => location.reload()).catch(() => {});
      await tab.waitForLoadState('load');
      await tab.waitForSelector('[x-data]:not([x-cloak])', { timeout: 8000 }).catch(() => {});
      await tab.addStyleTag({
        content:
          '*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}',
      });
      await tab.evaluate(() => document.fonts.ready);
      // Wait until the layout settles: fitSvg rescales figures asynchronously (observers), images load…
      // A fixed pause missed it on a cold first page (12 px taller once in 78 captures).
      await tab.evaluate(async () => {
        const measure = () =>
          [
            document.documentElement.scrollHeight,
            ...[...document.querySelectorAll('svg, img')].map((e) => e.getBoundingClientRect().height),
          ].join(',');
        let last = '';
        let stable = 0;
        for (let i = 0; i < 40 && stable < 3; i++) {
          await new Promise((r) => setTimeout(r, 100));
          const now = measure();
          stable = now === last ? stable + 1 : 0;
          last = now;
        }
        await Promise.all(
          [...document.images].map((im) => (im.complete ? 0 : new Promise((r) => (im.onload = im.onerror = r))))
        );
      });
    };
    // Twice: on a cold cache the web font can arrive after fitSvg measured a figure's text (fallback
    // font), leaving it a few pixels off for good — the second load has the font from the start
    await open('');
    await open('');
    const count = isSeries(page.label)
      ? await tab
          .evaluate(() => {
            const el = document.querySelector('[x-data^="seriesPlayer"]');
            return el && window.Alpine ? window.Alpine.$data(el).exercises.length : 1;
          })
          .catch(() => 1)
      : 1;
    for (let i = 1; i <= Math.min(count, MAX_EXERCISES); i++) {
      if (i > 1) await open(`#${i}`);
      const file = path.join(page.label, `${scheme}-${String(i).padStart(2, '0')}.png`);
      fs.mkdirSync(path.join(outDir, page.label), { recursive: true });
      await tab.screenshot({ path: path.join(outDir, file), fullPage: true });
      written.push(file);
    }
    await ctx.close();
  }
  return written;
}

/** Pixel difference of two PNGs → { ratio, diffPng? } (ratio 1 when sizes differ) */
function comparePng(a, b, diffOut) {
  const { PNG } = require('pngjs');
  const A = PNG.sync.read(fs.readFileSync(a));
  const B = PNG.sync.read(fs.readFileSync(b));
  if (A.width !== B.width || A.height !== B.height)
    return { ratio: 1, note: `size ${A.width}×${A.height} → ${B.width}×${B.height}` };
  // Rendering is deterministic, so a plain per-pixel test is enough (small tolerance for colour
  // rounding). Diff image: the « now » page faded to grey, changed pixels in red.
  const diff = new PNG({ width: A.width, height: A.height });
  let n = 0;
  for (let i = 0; i < A.data.length; i += 4) {
    const d = Math.max(
      Math.abs(A.data[i] - B.data[i]),
      Math.abs(A.data[i + 1] - B.data[i + 1]),
      Math.abs(A.data[i + 2] - B.data[i + 2])
    );
    if (d > 16) {
      n++;
      diff.data.set([230, 30, 30, 255], i);
    } else {
      const g = 225 + ((B.data[i] + B.data[i + 1] + B.data[i + 2]) / 3) * 0.1;
      diff.data.set([g, g, g, 255], i);
    }
  }
  if (n && diffOut) {
    fs.mkdirSync(path.dirname(diffOut), { recursive: true });
    fs.writeFileSync(diffOut, PNG.sync.write(diff));
  }
  return { ratio: n / (A.width * A.height) };
}

module.exports = {
  ROOT,
  SNAP_DIR,
  gitState,
  buildSite,
  listPages,
  isSeries,
  pageFile,
  pageDeps,
  makeManifest,
  snapshotPath,
  listSnapshots,
  serve,
  capturePage,
  comparePng,
};
