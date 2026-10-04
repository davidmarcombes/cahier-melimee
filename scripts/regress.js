#!/usr/bin/env node
/**
 * regress.js — compare the site as it is now with a checkpoint taken by `npm run snapshot`.
 *
 *   npm run regress                      against the latest checkpoint
 *   npm run regress -- avant-svg         against that checkpoint
 *   options: --no-shots   only list what changed (no screenshots)
 *            --all        a global change (player, CSS…) screenshots every page, not a sample
 *            --limit=N    screenshot at most N pages (default 80, most direct changes first)
 *            --e2e        also run the e2e specs (layout-health, solve) on the affected series
 *            --reuse      reuse the last current build (.snapshots/_current) instead of rebuilding
 *            --strict     exit 1 when anything looks different (default: report only)
 *
 * What it finds, in this order:
 *   1. pages whose built HTML changed (content, templates, build-time code), new and removed pages;
 *   2. pages that use code the browser runs and that changed: a generator (per generator, not per
 *      file), an SVG helper of svg.js (per function — directly or through a generator);
 *   3. a global change (player, app, CSS…): one page per exercise type + the main pages (or all: --all).
 * Then screenshots both versions of those pages (light + dark, every exercise) and compares the pixels.
 * Report: .snapshots/<checkpoint>/reports/<time>/index.html (for a human) and summary.json (for an agent).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  ROOT,
  SNAP_DIR,
  buildSite,
  capturePage,
  comparePng,
  isSeries,
  listPages,
  listSnapshots,
  makeManifest,
  pageDeps,
  pageFile,
  serve,
  snapshotPath,
} = require('./lib/snapshot.js');

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || `=${d}`).split('=')[1];
const positional = args.filter((a) => !a.startsWith('--'));
const MAIN_PAGES = ['index', 'fr', 'fr/exercices', 'fr/applications', 'fr/cahiers'];

function diffKeys(a = {}, b = {}) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].filter((k) => a[k] !== b[k]);
}

async function main() {
  const snaps = listSnapshots();
  if (!snaps.length) throw new Error('No checkpoint: take one first with npm run snapshot -- <name>');
  const base = positional[0] ? snaps.find((s) => s.name === positional[0]) : snaps[snaps.length - 1];
  if (!base) throw new Error(`no checkpoint "${positional[0]}" — npm run snapshot -- --list`);
  const baseDir = snapshotPath(base.name);
  const curDir = path.join(SNAP_DIR, '_current');
  const t0 = Date.now();

  if (!flag('--reuse') || !fs.existsSync(path.join(curDir, 'site'))) {
    console.log('Building the current site into .snapshots/_current/site …');
    buildSite(path.join(curDir, 'site'));
  }
  const cur = makeManifest('_current', path.join(curDir, 'site'));

  // 1. Pages
  const changed = diffKeys(base.pages, cur.pages);
  const added = changed.filter((l) => !base.pages[l]);
  const removed = changed.filter((l) => !cur.pages[l]);
  const htmlChanged = changed.filter((l) => base.pages[l] && cur.pages[l]);

  // 2. Browser code, per unit
  const svgChanged = diffKeys(base.js.svg, cur.js.svg);
  const genChanged = new Set();
  const genFiles = new Set([...Object.keys(base.js.generators), ...Object.keys(cur.js.generators)]);
  const coreChanged = diffKeys(base.js.generators['_core.js'], cur.js.generators['_core.js']).length > 0;
  for (const f of genFiles) {
    const a = base.js.generators[f] || {};
    const b = cur.js.generators[f] || {};
    const d = diffKeys(a, b);
    if (!d.length && !coreChanged) continue;
    const names = new Set([...Object.keys(a), ...Object.keys(b)].filter((k) => k !== '_shared'));
    if (d.includes('_shared') || coreChanged) names.forEach((n) => genChanged.add(n));
    else d.forEach((n) => genChanged.add(n));
  }
  const globalChanged = diffKeys(base.js.files, cur.js.files);
  if (svgChanged.includes('_head')) globalChanged.push('assets/js/svg.js (shared code)');

  // Which generators draw with a changed SVG helper
  const helperGens = {};
  const genDir = path.join(curDir, 'site', 'assets', 'js', 'generators');
  for (const f of fs.existsSync(genDir)
    ? fs.readdirSync(genDir).filter((f) => f.endsWith('.js') && !['index.js', '_core.js'].includes(f))
    : []) {
    let mod;
    try {
      mod = require(path.join(genDir, f));
    } catch {
      continue;
    }
    for (const [name, g] of Object.entries(mod)) {
      const src = Object.values(g || {})
        .map(String)
        .join('\n');
      for (const h of svgChanged) if (h !== '_head' && src.includes(h)) (helperGens[h] ||= []).push(name);
    }
  }

  // 3. Affected pages, with reasons, most direct first
  const affected = new Map();
  const add = (label, reason, rank) => {
    const a = affected.get(label) || { label, reasons: [], rank };
    if (!a.reasons.includes(reason)) a.reasons.push(reason);
    a.rank = Math.min(a.rank, rank);
    affected.set(label, a);
  };
  for (const l of htmlChanged) add(l, 'HTML changed', 0);
  for (const l of added) add(l, 'new page', 0);
  const curPages = listPages(path.join(curDir, 'site'));
  const typeSample = {};
  for (const p of curPages.filter((p) => isSeries(p.label))) {
    const deps = pageDeps(fs.readFileSync(pageFile(path.join(curDir, 'site'), p.label), 'utf8'));
    for (const g of deps.generators) if (genChanged.has(g)) add(p.label, `generator ${g}`, 1);
    for (const h of svgChanged) {
      if (deps.svg.includes(h)) add(p.label, `svg ${h}`, 1);
      for (const g of helperGens[h] || []) if (deps.generators.includes(g)) add(p.label, `svg ${h} (via ${g})`, 1);
    }
    for (const t of deps.types) typeSample[t] ||= p.label;
  }
  if (globalChanged.length) {
    const why = `global: ${globalChanged.slice(0, 3).join(', ')}${globalChanged.length > 3 ? '…' : ''}`;
    if (flag('--all')) curPages.forEach((p) => add(p.label, why, 2));
    else {
      for (const [t, l] of Object.entries(typeSample)) add(l, `${why} — sample for type ${t}`, 2);
      for (const l of MAIN_PAGES) if (cur.pages[l]) add(l, `${why} — main page`, 2);
    }
  }
  const list = [...affected.values()].sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label));

  // Console summary
  console.log(
    `\nCompared with « ${base.name} » (${base.createdAt.slice(0, 16).replace('T', ' ')}, ${base.git.sha}${base.git.dirty ? ' + uncommitted' : ''})`
  );
  console.log(
    `  pages: ${htmlChanged.length} changed, ${added.length} new, ${removed.length} removed (of ${Object.keys(cur.pages).length})`
  );
  if (genChanged.size) console.log(`  generators changed: ${[...genChanged].join(', ')}`);
  if (svgChanged.length) console.log(`  svg helpers changed: ${svgChanged.join(', ')}`);
  if (globalChanged.length)
    console.log(`  global files changed: ${globalChanged.join(', ')}${flag('--all') ? '' : ' → one page per type'}`);
  console.log(`  affected pages: ${list.length}`);
  if (removed.length) console.log(`  removed: ${removed.join(', ')}`);

  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
  const reportDir = path.join(baseDir, 'reports', stamp);
  fs.mkdirSync(reportDir, { recursive: true });
  const summary = {
    checkpoint: { name: base.name, createdAt: base.createdAt, git: base.git },
    current: { git: cur.git },
    pages: { changed: htmlChanged, added, removed },
    code: { generators: [...genChanged], svg: svgChanged, global: globalChanged },
    affected: list.map(({ label, reasons }) => ({ label, url: label === 'index' ? '/' : `/${label}/`, reasons })),
    visual: [],
    e2e: null,
  };

  // Screenshots: checkpoint (cached in its shots/) vs now, pixel diff
  if (!flag('--no-shots') && list.length) {
    const limit = Number(opt('limit', 80));
    const shotList = list.slice(0, limit);
    if (list.length > limit)
      console.log(`  screenshots limited to ${limit} pages (--limit=N, most direct changes first)`);
    const { chromium } = require('@playwright/test');
    const [sBase, sCur] = await Promise.all([serve(path.join(baseDir, 'site')), serve(path.join(curDir, 'site'))]);
    const browser = await chromium.launch();
    const queue = [...shotList];
    let done = 0;
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        for (let a; (a = queue.shift());) {
          const page = { label: a.label, url: a.label === 'index' ? '/' : `/${a.label}/` };
          try {
            const baseShots = path.join(baseDir, 'shots');
            if (base.pages[a.label] && !fs.existsSync(path.join(baseShots, a.label)))
              await capturePage(browser, sBase.url, page, baseShots);
            const files = cur.pages[a.label]
              ? await capturePage(browser, sCur.url, page, path.join(reportDir, 'current'))
              : [];
            const baseFiles = fs.existsSync(path.join(baseShots, a.label))
              ? fs.readdirSync(path.join(baseShots, a.label)).map((f) => path.join(a.label, f))
              : [];
            for (const f of new Set([...files, ...baseFiles])) {
              const b = path.join(baseShots, f);
              const c = path.join(reportDir, 'current', f);
              const entry = { label: a.label, shot: f.split(path.sep).join('/') };
              if (!fs.existsSync(b) || !fs.existsSync(c))
                Object.assign(entry, { ratio: 1, note: fs.existsSync(c) ? 'new screenshot' : 'screenshot gone' });
              else Object.assign(entry, comparePng(b, c, path.join(reportDir, 'diff', f)));
              if (entry.ratio > 0) summary.visual.push(entry);
            }
          } catch (e) {
            summary.visual.push({
              label: a.label,
              shot: '',
              ratio: 1,
              note: `capture failed: ${e.message.split('\n')[0]}`,
            });
          }
          if (++done % 20 === 0) console.log(`  ${done}/${shotList.length} pages screenshotted`);
        }
      })
    );
    await browser.close();
    sBase.close();
    sCur.close();
    const pagesDiff = new Set(summary.visual.map((v) => v.label));
    console.log(`  visual: ${pagesDiff.size} of ${shotList.length} screenshotted pages look different`);
    for (const l of [...pagesDiff].slice(0, 15)) {
      const worst = Math.max(...summary.visual.filter((v) => v.label === l).map((v) => v.ratio));
      console.log(`    ${l}  (${(worst * 100).toFixed(2)} % of pixels)  — ${affected.get(l).reasons.join('; ')}`);
    }
  }

  // E2E on the affected series
  if (flag('--e2e')) {
    const series = list.filter((a) => isSeries(a.label)).map((a) => a.label.replace(/^fr\//, ''));
    if (series.length) {
      console.log(`\nE2E (layout-health, solve) on ${series.length} series…`);
      const r = spawnSync('npx playwright test tests/e2e/layout-health.spec.js tests/e2e/solve.spec.js', {
        cwd: ROOT,
        shell: true,
        stdio: 'inherit',
        env: {
          ...process.env,
          SITE_OUT: '.snapshots/_current/site',
          E2E_PORT: '4176',
          E2E_PAGES: series.join(','),
          E2E_REPORTER: 'line',
        },
      });
      summary.e2e = { series: series.length, passed: r.status === 0 };
    }
  }

  fs.writeFileSync(path.join(reportDir, 'summary.json'), JSON.stringify(summary, null, 1));
  fs.writeFileSync(path.join(reportDir, 'index.html'), reportHtml(summary));
  console.log(`\nReport: ${'file:///' + path.join(reportDir, 'index.html').split(path.sep).join('/')}`);
  console.log(`(${Math.round((Date.now() - t0) / 1000)} s)`);
  const different = summary.visual.length || (summary.e2e && !summary.e2e.passed);
  if (flag('--strict') && different) process.exit(1);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function reportHtml(s) {
  const byPage = {};
  for (const v of s.visual) (byPage[v.label] ||= []).push(v);
  const reasons = Object.fromEntries(s.affected.map((a) => [a.label, a.reasons]));
  const img = (src) => `<a href="${src}" target="_blank"><img src="${src}" loading="lazy"></a>`;
  const rows = Object.entries(byPage)
    .map(
      ([label, shots]) => `
    <section>
      <h2><a href="http://localhost:8080/${label === 'index' ? '' : label + '/'}">${esc(label)}</a></h2>
      <p class="why">${esc((reasons[label] || []).join(' · '))}</p>
      ${shots
        .map(
          (v) => `
      <div class="shot"><h3>${esc(v.shot || v.note)} — ${(v.ratio * 100).toFixed(2)} %${v.note ? ` (${esc(v.note)})` : ''}</h3>
        ${v.shot ? `<div class="trio"><figure>${img(`../../shots/${v.shot}`)}<figcaption>checkpoint</figcaption></figure><figure>${img(`current/${v.shot}`)}<figcaption>now</figcaption></figure><figure>${img(`diff/${v.shot}`)}<figcaption>difference</figcaption></figure></div>` : ''}
      </div>`
        )
        .join('')}
    </section>`
    )
    .join('');
  const same = s.affected.filter((a) => !byPage[a.label]);
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Regression — ${esc(s.checkpoint.name)}</title>
<style>
 body{font:14px system-ui,sans-serif;margin:24px;color:#1e293b;background:#f8fafc} h1{font-size:22px} h2{font-size:16px;margin:28px 0 4px}
 .why{color:#475569;margin:0 0 8px} .shot h3{font-size:13px;font-weight:600;margin:12px 0 6px}
 .trio{display:grid;grid-template-columns:repeat(3,1fr);gap:10px} figure{margin:0} img{width:100%;border:1px solid #cbd5e1;background:#fff}
 figcaption{font-size:12px;color:#64748b} section{border-top:1px solid #e2e8f0} code{background:#e2e8f0;padding:1px 4px;border-radius:4px}
 details{margin-top:24px}
</style></head><body>
<h1>Regression against « ${esc(s.checkpoint.name)} »</h1>
<p>Checkpoint ${esc(s.checkpoint.createdAt.slice(0, 16).replace('T', ' '))}, commit <code>${esc(s.checkpoint.git.sha)}</code>${s.checkpoint.git.dirty ? ' + uncommitted changes' : ''} → now <code>${esc(s.current.git.sha)}</code>${s.current.git.dirty ? ' + uncommitted changes' : ''}.</p>
<ul>
 <li>Pages: ${s.pages.changed.length} changed, ${s.pages.added.length} new, ${s.pages.removed.length} removed</li>
 <li>Generators changed: ${esc(s.code.generators.join(', ') || '—')}</li>
 <li>SVG helpers changed: ${esc(s.code.svg.join(', ') || '—')}</li>
 <li>Global files changed: ${esc(s.code.global.join(', ') || '—')}</li>
 <li>Affected pages: ${s.affected.length} — <b>${Object.keys(byPage).length} look different</b>${s.e2e ? ` — e2e on ${s.e2e.series} series: ${s.e2e.passed ? 'passed' : '<b>FAILED</b>'}` : ''}</li>
</ul>
${rows || '<p>No visual difference.</p>'}
<details><summary>${same.length} affected page(s) with identical screenshots (or not screenshotted)</summary><ul>${same.map((a) => `<li>${esc(a.label)} — ${esc(a.reasons.join(' · '))}</li>`).join('')}</ul></details>
</body></html>`;
}

main().catch((e) => {
  console.error(e.stack || e.message);
  process.exit(1);
});
