#!/usr/bin/env node
/**
 * validate-vision.js — visual exercises checked from SCREENSHOTS by Claude Code subagents (Haiku).
 * Where the oracle cannot recompute an answer from the drawing, a model looks at the page as the
 * pupil sees it: is the expected answer the one the picture shows, and can the picture be read?
 *
 *   npm run validate:vision -- --export [--count=N] [--type=a,b] [--dir=…] [--batch=12] [--force]
 *     Serves the built site (_site-check/, or --site=_site), screenshots each visual exercise and
 *     reads the answer the page expects from the player → .scratch/vision-batches/
 *     (batch-NNN.json + img/ + README.md: one Haiku subagent per batch writes batch-NNN.result.jsonl)
 *   npm run validate:vision -- --import
 *     Records one verdict per file in reports/validate-llm-cache.csv (column claude-haiku-4-5-vision,
 *     « MV » in /admin/); INCORRECT and UNREADABLE become flags (🚩 in /admin/).
 *
 * CANARIES: each batch also holds copies of real exercises whose claimed answer was made wrong. A
 * batch that accepts one did not really look — its verdicts are all ignored (rerun it).
 * Generated exercises are checked on the draw that was screenshotted; a file is cached by its
 * content hash, like the text validator.
 */
'use strict';
/* global Alpine, document, window -- inside page.evaluate / waitForFunction callbacks (run in the browser) */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const {
  SRC_DIRS,
  getSeriesId,
  loadCache,
  saveCache,
  fileHash,
  walkMdFiles,
  parseExercises,
} = require('./lib/llm-cache.js');

const ROOT = path.join(__dirname, '..');
const flags = {};
for (const arg of process.argv.slice(2)) {
  if (!arg.startsWith('--')) continue;
  const [k, v] = arg.slice(2).split('=');
  flags[k] = v !== undefined ? v : true;
}
const DIR = path.join(ROOT, '.scratch/vision-batches');
const SITE = path.join(ROOT, flags.site || '_site-check');
const MODEL = 'claude-haiku-4-5-vision';
const BATCH = parseInt(flags.batch || '12', 10);
const COUNT = flags.count ? parseInt(flags.count, 10) : 0;
const FORCE = flags.force === true;
const FILTER_TYPE = flags.type ? new Set(String(flags.type).split(',')) : null;
const FILTER_DIR = flags.dir
  ? String(flags.dir)
      .split(',')
      .map((d) => path.resolve(d))
  : null;

// Types whose answer is read on a picture (readClaim below says what is checked for each)
const VISION_TYPES = new Set([
  'bar-chart',
  'number-line',
  'coordinate-grid',
  'thermometer',
  'ruler',
  'clock',
  'count-objects',
  'compare-groups',
  'fraction-paint',
  'svg-tiles',
  'venn',
]);

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  grey: '\x1b[90m',
};

// ─── In the page: the question and the answer the player expects, as a sentence ──────────────
// Runs in the browser. null: nothing to check on a picture (a « build » or « place » exercise).
function readClaim() {
  const d = Alpine.$data(document.querySelector('[x-data^="seriesPlayer"]'));
  const e = d.cur;
  const txt = (h) => {
    const el = document.createElement('div');
    el.innerHTML = h || '';
    return el.textContent.replace(/\s+/g, ' ').trim();
  };
  const question = [txt(e.title), txt(e.body)].filter(Boolean).join(' — ');
  const base = { type: e.type, question };
  switch (e.type) {
    case 'compare-groups':
      return { ...base, claim: ['Autant', 'Plus', 'Moins'][e.cmpGroupAnswer], kind: 'choice' };
    case 'bar-chart':
      if (!e.bc || e.bc.mode !== 'read') return null;
      return {
        ...base,
        claim: e.bc.questions.map((q) => `${q.text} → ${q.answer}`).join(' ; '),
        kind: 'questions',
        answers: e.bc.questions.map((q) => q.answer),
        texts: e.bc.questions.map((q) => q.text),
        step: e.bc.yStep,
      };
    case 'coordinate-grid': {
      if (!e.cg || e.cg.mode !== 'read') return null;
      const [x, y] = String(e.answers[0]).split(',');
      return { ...base, claim: `(${x} ; ${y})`, kind: 'coord', x: Number(x), y: Number(y) };
    }
    case 'number-line':
      if (!e.nl || e.nl.mode !== 'read') return null;
      return { ...base, claim: String(e.answers[0]), kind: 'number' };
    case 'svg-tiles':
      return {
        ...base,
        claim: 'tuiles ' + e.answers.map((i) => i + 1).join(', '),
        kind: 'tiles',
        tiles: e.answers,
        n: e.tiles.length,
      };
    case 'fraction-paint':
      return {
        ...base,
        claim: `la figure est partagée en ${e.denominator} parts égales`,
        kind: 'fraction',
        den: e.denominator,
      };
    case 'venn': {
      const zone = {
        a: `« ${e.venn.labelA} » seulement`,
        b: `« ${e.venn.labelB} » seulement`,
        ab: 'les deux',
        out: 'aucun des deux',
      };
      return {
        ...base,
        question: `${question} — Étiquettes : A = « ${e.venn.labelA} », B = « ${e.venn.labelB} »`,
        claim: e.venn.items.map((it) => `${it.char} → ${zone[it.zone]}`).join(' ; '),
        kind: 'venn',
        items: e.venn.items.map((it) => ({ char: it.char, zone: it.zone })),
        zone,
      };
    }
    case 'clock':
      return { ...base, claim: String(e.answers[0]), kind: 'clock' };
    default:
      return { ...base, claim: String((e.answers || [])[0] ?? ''), kind: 'number' };
  }
}

// ─── Canaries: the same kind of claim, made wrong ────────────────────────────────────────────
const nextNumber = (s, step) => {
  const v = Number(String(s).replace(',', '.'));
  if (!Number.isFinite(v)) return null;
  return String(Math.round((v + (step || (Number.isInteger(v) ? 1 : 0.1))) * 1000) / 1000).replace('.', ',');
};
function corrupt(c) {
  switch (c.kind) {
    case 'choice':
      return ['Autant', 'Plus', 'Moins'][(['Autant', 'Plus', 'Moins'].indexOf(c.claim) + 1) % 3];
    case 'clock': {
      const [h, m] = c.claim.split(/[:h]/).map(Number);
      return `${h}:${String((m + 10) % 60).padStart(2, '0')}`;
    }
    case 'coord':
      return `(${c.x + 1} ; ${c.y})`;
    case 'tiles': {
      const free = [...Array(c.n).keys()].find((i) => !c.tiles.includes(i));
      if (free === undefined) return null;
      return (
        'tuiles ' +
        [...c.tiles.slice(1), free]
          .map((i) => i + 1)
          .sort((a, b) => a - b)
          .join(', ')
      );
    }
    case 'fraction':
      return `la figure est partagée en ${c.den + 1} parts égales`;
    case 'venn': {
      const items = c.items.map((it, i) => (i === 0 ? { ...it, zone: it.zone === 'out' ? 'ab' : 'out' } : it));
      return items.map((it) => `${it.char} → ${c.zone[it.zone]}`).join(' ; ');
    }
    case 'questions': {
      const i = c.answers.findIndex((a) => nextNumber(a, c.step) !== null);
      if (i < 0) return null;
      return c.texts.map((t, j) => `${t} → ${j === i ? nextNumber(c.answers[j], c.step) : c.answers[j]}`).join(' ; ');
    }
    default:
      return nextNumber(c.claim);
  }
}

// ─── Export ──────────────────────────────────────────────────────────────────────────────────

// Visual exercises to check: [{ relPath, hash, seriesId, url, n, type }], one per front-matter
// block (its first draw for a generated one), at its position in the series page (#n)
function collect() {
  const cache = loadCache();
  const items = [];
  let cached = 0,
    stale = 0;
  let files = SRC_DIRS.filter((d) => !d.endsWith('defis')).flatMap(walkMdFiles); // défis: timed player
  if (FILTER_DIR) files = files.filter((f) => FILTER_DIR.some((d) => f.startsWith(d)));
  const bySeries = new Map();
  for (const f of files) {
    const dir = path.dirname(f);
    if (!bySeries.has(dir)) bySeries.set(dir, []);
    bySeries.get(dir).push(f);
  }
  for (const [dir, list] of bySeries) {
    const seriesId = getSeriesId(list[0]);
    const section = path.relative(path.join(ROOT, 'src/fr'), dir).split(path.sep)[0];
    const page = path.join(SITE, 'fr', section, seriesId, 'index.html');
    if (!seriesId || !fs.existsSync(page)) continue;
    const built = fs.statSync(page).mtimeMs;
    // Every .md of the series, in page order: a block counts once, a generated one `repeat` times
    let n = 1;
    for (const f of fs
      .readdirSync(dir)
      .filter((x) => x.endsWith('.md'))
      .sort()
      .map((x) => path.join(dir, x))) {
      const blocks = parseExercises(f);
      const relPath = path.relative(ROOT, f).split(path.sep).join('/');
      const hash = fileHash(f);
      const entry = cache.get(relPath);
      const done = !FORCE && entry && entry.hash === hash && (entry.manual === 'ok' || entry.models.has(MODEL));
      const wanted =
        list.includes(f) &&
        blocks.some((b) => VISION_TYPES.has(b.data.type) && (!FILTER_TYPE || FILTER_TYPE.has(b.data.type)));
      if (wanted && done) cached++;
      else if (wanted && fs.statSync(f).mtimeMs > built)
        stale++; // the page predates the file
      else if (wanted)
        for (const [i, b] of blocks.entries())
          if (VISION_TYPES.has(b.data.type))
            items.push({ relPath, hash, seriesId, url: `/fr/${section}/${seriesId}/`, n: n + i, type: b.data.type });
      n += blocks.reduce((s, b) => s + (b.data.generator ? b.data.repeat || 1 : 1), 0);
    }
  }
  if (COUNT > 0 && items.length > COUNT) {
    // Spread over the whole site (every level and theme), not the first N
    const step = items.length / COUNT;
    return { items: Array.from({ length: COUNT }, (_, i) => items[Math.floor(i * step)]), cached, stale };
  }
  return { items, cached, stale };
}

async function serve() {
  const port = 4300 + Math.floor(Math.random() * 500);
  const child = spawn(process.execPath, [path.join(__dirname, 'e2e-server.js')], {
    env: { ...process.env, E2E_PORT: String(port), SITE_OUT: path.relative(ROOT, SITE) },
    stdio: 'ignore',
  });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(base + '/');
      return { base, stop: () => child.kill() };
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  child.kill();
  throw new Error('static server did not start');
}

const README = `# Visual exercises — instructions for the checker

You check French primary-school maths exercises from screenshots. Use only the Read and Write tools.

Read \`batch-NNN.json\`: \`{ items: [{ key, image, question, claim }] }\` — \`image\` is the absolute path of a PNG
screenshot of the exercise, \`question\` its text, \`claim\` the answer the exercise says is right.

For EACH item, in order:
1. Read the PNG and look at the figure carefully (chart bars and axis, ruler / number-line / thermometer graduations,
   clock hands, objects to count, the point on the grid, shapes, fraction strips, emojis).
2. Write down what YOU read on the picture BEFORE looking at the claim (« the Mardi bar reaches 18 », « hour hand just
   past 4, minute hand on 5 → 4:25 », « I count 7 fish »).
3. Compare with \`claim\`. Tiles are numbered from 1, left to right then top to bottom. Venn: is each emoji's zone right
   for the two labels? Fraction: count the equal parts of the figure. Compare-groups: the sentence compares the FIRST
   emoji with the second (Autant = as many, Plus = more, Moins = fewer). A bar chart claim lists every question → answer.
4. Verdict: CORRECT (the claim matches the picture) · INCORRECT (it does not) · UNREADABLE (the picture does not let a
   pupil tell: objects on top of each other, cut off, labels unreadable, a mark between graduations — say what).

Some claims are wrong on purpose: judge each one on its picture alone.

Write \`batch-NNN.result.jsonl\` next to the batch: one JSON line per item, nothing else:
{"key": "<key>", "seen": "<what you read on the picture>", "verdict": "CORRECT|INCORRECT|UNREADABLE", "reason": "<short reason>"}
`;

async function exportBatches() {
  const { chromium } = require('@playwright/test');
  const { items, cached, stale } = collect();
  console.log(
    `${C.bold}Visual exercises:${C.reset} ${C.yellow}${items.length} to check${C.reset} · ${C.green}${cached} file(s) cached${C.reset}` +
      (stale ? ` · ${C.red}${stale} file(s) newer than their page: rebuild (npm run check) first${C.reset}` : '')
  );
  fs.rmSync(DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(DIR, 'img'), { recursive: true });
  if (!items.length) return 0;

  const server = await serve();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  const shots = [];
  try {
    for (const [i, it] of items.entries()) {
      await page.goto(`${server.base}${it.url}#${it.n}`);
      await page.waitForFunction(
        () => window.Alpine && document.querySelector('[x-data^="seriesPlayer"]')?._x_dataStack
      );
      // Maternelle start screen (« Commencer, avec le son ») covers the picture
      const start = page.locator('[aria-label="Commencer, avec le son"]');
      if (await start.isVisible().catch(() => false)) await start.click();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      const c = await page.evaluate(readClaim);
      if (!c || c.type !== it.type) continue; // a build / place exercise, or not the expected one
      const image = path.join(DIR, 'img', `x${String(i + 1).padStart(4, '0')}.png`);
      await page.locator('.js-player').screenshot({ path: image });
      shots.push({ ...it, ...c, image });
      if ((i + 1) % 25 === 0) process.stdout.write(`  ${i + 1}/${items.length}\r`);
    }
  } finally {
    await browser.close();
    server.stop();
  }

  // Batches: real items + canaries (another batch's picture when there is one, with a wrong claim)
  const batches = [];
  for (let i = 0; i < shots.length; i += BATCH) batches.push(shots.slice(i, i + BATCH));
  const manifest = {};
  batches.forEach((real, b) => {
    const name = `batch-${String(b + 1).padStart(3, '0')}`;
    const pool = batches.length > 1 ? batches[(b + 1) % batches.length] : real;
    const canaries = [];
    for (const src of [...pool].sort(() => Math.random() - 0.5)) {
      if (canaries.length >= Math.max(1, Math.round(real.length * 0.15))) break;
      const claim = corrupt(src);
      if (!claim || claim === src.claim) continue;
      const image = path.join(DIR, 'img', `${name}-c${canaries.length + 1}.png`);
      fs.copyFileSync(src.image, image);
      canaries.push({ ...src, image, claim, canary: true });
    }
    const all = [...real, ...canaries].sort(() => Math.random() - 0.5);
    const out = all.map((x, k) => {
      const key = `${name.slice(6)}-${String(k + 1).padStart(2, '0')}`;
      manifest[key] = {
        batch: name,
        relPath: x.relPath,
        hash: x.hash,
        seriesId: x.seriesId,
        url: `${x.url}#${x.n}`,
        type: x.type,
        canary: Boolean(x.canary),
      };
      return { key, image: x.image, question: x.question, claim: x.claim };
    });
    fs.writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ items: out }, null, 1));
  });
  fs.writeFileSync(path.join(DIR, 'manifest.json'), JSON.stringify({ model: MODEL, manifest }, null, 1));
  fs.writeFileSync(path.join(DIR, 'README.md'), README);
  console.log(
    `→ ${shots.length} screenshots in ${batches.length} batch(es) of ≤ ${BATCH} (+ canaries): ${path.relative(ROOT, DIR)}/\n` +
      `  One Haiku subagent per batch-NNN.json (instructions: README.md), then: npm run validate:vision -- --import`
  );
  return 0;
}

// ─── Import ──────────────────────────────────────────────────────────────────────────────────

// Batches that accepted (or did not answer) a canary are not trusted: { batch: reason }
function untrustedBatches(manifest, results) {
  const out = {};
  for (const [key, m] of Object.entries(manifest)) {
    if (!m.canary) continue;
    const v = results[key] && String(results[key].verdict).toUpperCase();
    if (v !== 'INCORRECT' && v !== 'UNREADABLE')
      out[m.batch] = v ? `accepted a planted wrong answer (${key})` : `no verdict for ${key}`;
  }
  return out;
}

// A file's verdict from its items' results: null while one is missing
function fileVerdict(results) {
  if (results.some((r) => !r)) return null;
  const v = results.map((r) => String(r.verdict).toUpperCase());
  if (v.every((x) => x === 'CORRECT')) return 'ok';
  return 'fail';
}

function importResults() {
  const { model, manifest } = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
  const results = {};
  for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.result.jsonl')))
    for (const line of fs.readFileSync(path.join(DIR, f), 'utf8').split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const r = JSON.parse(line);
        if (r.key != null) results[String(r.key)] = r;
      } catch {
        console.log(`${C.yellow}  unreadable line in ${f}: ${line.slice(0, 80)}${C.reset}`);
      }
    }
  const untrusted = untrustedBatches(manifest, results);
  for (const [b, why] of Object.entries(untrusted))
    console.log(`${C.red}✗ ${b}: ${why} — its verdicts are ignored, rerun it${C.reset}`);

  const byFile = new Map();
  for (const [key, m] of Object.entries(manifest)) {
    if (m.canary || untrusted[m.batch]) continue;
    if (!byFile.has(m.relPath)) byFile.set(m.relPath, []);
    byFile.get(m.relPath).push({ key, ...m, result: results[key] });
  }
  const cache = loadCache();
  const human = require('./lib/human-validation.js');
  let ok = 0,
    fail = 0,
    incomplete = 0,
    changed = 0;
  for (const [relPath, entries] of byFile) {
    const abs = path.join(ROOT, relPath);
    if (!fs.existsSync(abs) || fileHash(abs) !== entries[0].hash) {
      changed++; // edited since the export: the verdict would describe another version
      continue;
    }
    const verdict = fileVerdict(entries.map((e) => e.result));
    if (!verdict) {
      incomplete++;
      continue;
    }
    const e = cache.get(relPath);
    const entry =
      e && e.hash === entries[0].hash
        ? e
        : { seriesId: entries[0].seriesId, hash: entries[0].hash, manual: '', models: new Map() }; // changed: verdicts and manual=ok go
    entry.models.set(model, verdict);
    cache.set(relPath, entry);
    if (verdict === 'ok') ok++;
    else {
      fail++;
      for (const x of entries.filter((y) => String(y.result.verdict).toUpperCase() !== 'CORRECT')) {
        const what = String(x.result.verdict).toUpperCase() === 'UNREADABLE' ? 'illisible' : 'réponse';
        const reason = `[Vision ${what}] ${path.basename(relPath)} · ${x.type} : ${x.result.reason || ''} (lu : ${x.result.seen || '?'})`;
        human.addFlag(x.url, reason, 'vision');
        console.log(`  ${C.red}✗${C.reset} ${x.url}  ${relPath}\n     ${C.yellow}${x.result.reason || ''}${C.reset}`);
      }
    }
  }
  saveCache(cache);
  const batches = new Set(Object.values(manifest).map((m) => m.batch)).size;
  const ignored = Object.keys(untrusted).length;
  console.log(
    `\n${C.bold}Imported (${model}):${C.reset} ${C.green}${ok} ok${C.reset} · ${C.red}${fail} flagged in /admin/${C.reset}` +
      ` · ${batches - ignored}/${batches} batch(es) caught their canaries` +
      (incomplete ? ` · ${C.yellow}${incomplete} file(s) without all results${C.reset}` : '') +
      (changed ? ` · ${C.yellow}${changed} file(s) changed since the export, ignored${C.reset}` : '')
  );
  return 0;
}

if (require.main === module) {
  const run = flags.export ? exportBatches : flags.import ? importResults : null;
  if (!run) {
    console.log('Usage: npm run validate:vision -- --export [--count=N] [--type=a,b] [--dir=…]  |  -- --import');
    process.exit(1);
  }
  Promise.resolve(run()).then(
    (code) => process.exit(code),
    (e) => {
      console.error(e);
      process.exit(1);
    }
  );
}

module.exports = { corrupt, untrustedBatches, fileVerdict };
