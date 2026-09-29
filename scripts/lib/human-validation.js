/**
 * Human validation — single source of truth for the dev server (/api/human-*), the admin
 * dashboard, `npm run check`, `npm run flag` and the sync scripts.
 *
 * VALIDATIONS (reports/human-validate.csv: path,seriesId,hash,validatedAt)
 *   A human plays a series and presses « ✓ Valider la série »: every exercise file of the series
 *   is recorded with a FINGERPRINT of what was validated —
 *     - the .md file (LF-normalised; identical to the historical hash for hand-written files)
 *     - for generated exercises, plus the generator's source code
 *   If the fingerprint changes later, the validation is STALE: the exercise changed after a human
 *   approved it and must be re-checked. That is the regression signal.
 *
 * FLAGS (reports/human-flags.json)
 *   Items someone — often an agent — asks a human to look at: { id, seriesId, url, reason,
 *   source, createdAt, resolvedAt, resolvedBy }. Validating a series resolves its open flags.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..', '..');
// Overridable for unit tests
const CSV = process.env.HUMAN_CSV || path.join(ROOT, 'reports', 'human-validate.csv');
const FLAGS = process.env.HUMAN_FLAGS || path.join(ROOT, 'reports', 'human-flags.json');
const SECTIONS = ['exercices', 'applications', 'defis'];
const GEN_DIR = path.join(ROOT, 'src', 'assets', 'js', 'generators');

const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');
const now = () => new Date().toISOString();

// ─── Fingerprints ─────────────────────────────────────────────────────────────

// Fresh load: the dev server is long-running and generators get edited meanwhile
function loadGenerators() {
  for (const k of Object.keys(require.cache)) if (k.startsWith(GEN_DIR)) delete require.cache[k];
  if (!global.clockSvg) global.clockSvg = () => '';
  return require(path.join(GEN_DIR, 'index.js'));
}

function fingerprint(absPath, gens) {
  let src = fs.readFileSync(absPath, 'utf8').replace(/\r\n?/g, '\n');
  const m = src.match(/^generator:\s*["']?([A-Za-z0-9_]+)/m);
  if (m) {
    const g = (gens || loadGenerators())[m[1]];
    src += '\n--generator ' + m[1] + '--\n' + (g ? g.generate.toString() : 'missing');
  }
  return crypto.createHash('sha256').update(src).digest('hex').slice(0, 16);
}

// ─── Series ───────────────────────────────────────────────────────────────────

// [{ id, section, dir, dirRel, title, files: [abs .md] }]
function listSeries() {
  const out = [];
  const walk = (dir, section) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    if (entries.some((e) => e.isFile() && e.name === 'index.yaml')) {
      let meta = {};
      try {
        meta = yaml.load(fs.readFileSync(path.join(dir, 'index.yaml'), 'utf8')) || {};
      } catch {
        /* invalid YAML: reported by validate-exercises */
      }
      if (meta.id)
        out.push({
          id: String(meta.id),
          section,
          dir,
          dirRel: rel(dir),
          title: meta.title || '',
          files: entries
            .filter((e) => e.isFile() && e.name.endsWith('.md'))
            .map((e) => path.join(dir, e.name))
            .sort(),
        });
    }
    // Keep walking: some series folders contain other series
    for (const e of entries) if (e.isDirectory()) walk(path.join(dir, e.name), section);
  };
  for (const s of SECTIONS) {
    const dir = path.join(ROOT, 'src', 'fr', s);
    if (fs.existsSync(dir)) walk(dir, s);
  }
  return out;
}

const seriesUrl = (s) => `/fr/${s.section}/${s.id}/`;

// ─── Validations (CSV) ────────────────────────────────────────────────────────

function readValidations() {
  const map = new Map();
  if (!fs.existsSync(CSV)) return map;
  const lines = fs.readFileSync(CSV, 'utf8').replace(/\r/g, '').split('\n').filter(Boolean);
  for (const line of lines.slice(1)) {
    const [p, seriesId = '', hash = '', validatedAt = ''] = line.split(',');
    map.set(p, { path: p, seriesId, hash, validatedAt });
  }
  return map;
}

function writeValidations(map) {
  const rows = [...map.values()].sort((a, b) => a.path.localeCompare(b.path));
  fs.writeFileSync(
    CSV,
    ['path,seriesId,hash,validatedAt', ...rows.map((r) => `${r.path},${r.seriesId},${r.hash},${r.validatedAt}`)].join(
      '\n'
    ) + '\n'
  );
}

function findSeries(seriesId) {
  const s = listSeries().find((x) => x.id === seriesId);
  if (!s) throw new Error(`unknown series ${seriesId}`);
  return s;
}

// Record a human validation of a whole series; resolves its open flags.
// Returns what it replaced, so the caller can undo it with unvalidateSeries():
//   { files, previous: [CSV rows of the series before], closedFlags: [flag ids] }
function validateSeries(seriesId) {
  const s = findSeries(seriesId);
  const gens = loadGenerators();
  const map = readValidations();
  const ts = now();
  const previous = [];
  for (const f of s.files) {
    if (map.has(rel(f))) previous.push(map.get(rel(f)));
    map.set(rel(f), { path: rel(f), seriesId, hash: fingerprint(f, gens), validatedAt: ts });
  }
  writeValidations(map);
  const flags = readFlags();
  const closedFlags = [];
  for (const fl of flags)
    if (fl.seriesId === seriesId && !fl.resolvedAt) {
      fl.resolvedAt = ts;
      fl.resolvedBy = 'validated';
      closedFlags.push(fl.id);
    }
  if (closedFlags.length) writeFlags(flags);
  return { files: s.files.length, previous, closedFlags };
}

// Undo a validation: the series' CSV rows go back to `previous` (none → removed, so the series is
// pending again) and the `reopen` flags it closed are reopened. Rows of other series are ignored.
function unvalidateSeries(seriesId, { previous = [], reopen = [] } = {}) {
  const s = findSeries(seriesId);
  const paths = new Set(s.files.map(rel));
  const map = readValidations();
  for (const p of paths) map.delete(p);
  for (const r of previous)
    if (r && paths.has(r.path))
      map.set(r.path, { path: r.path, seriesId, hash: String(r.hash || ''), validatedAt: String(r.validatedAt || '') });
  writeValidations(map);
  const flags = readFlags();
  let changed = false;
  for (const fl of flags)
    if (fl.seriesId === seriesId && reopen.includes(fl.id) && fl.resolvedBy === 'validated') {
      fl.resolvedAt = null;
      fl.resolvedBy = null;
      changed = true;
    }
  if (changed) writeFlags(flags);
}

// Per-series status: ok (all validated, unchanged) · stale (validated then changed: regression)
// · partial (some files validated) · pending (never validated). `seriesId` limits it to one series.
function status(seriesId) {
  const gens = loadGenerators();
  const map = readValidations();
  const all = listSeries();
  return (seriesId ? all.filter((s) => s.id === seriesId) : all).map((s) => {
    let validated = 0,
      latest = '';
    const stale = [];
    for (const f of s.files) {
      const v = map.get(rel(f));
      if (!v || !v.validatedAt) continue;
      validated++;
      if (v.validatedAt > latest) latest = v.validatedAt;
      if (v.hash !== fingerprint(f, gens)) stale.push(path.basename(f));
    }
    const total = s.files.length;
    const st = stale.length ? 'stale' : total && validated === total ? 'ok' : validated ? 'partial' : 'pending';
    return {
      id: s.id,
      section: s.section,
      url: seriesUrl(s),
      title: s.title,
      dir: s.dirRel,
      total,
      validated,
      stale,
      status: st,
      validatedAt: latest,
    };
  });
}

// ─── Flags ────────────────────────────────────────────────────────────────────

function readFlags() {
  if (!fs.existsSync(FLAGS)) return [];
  try {
    return JSON.parse(fs.readFileSync(FLAGS, 'utf8'));
  } catch {
    return [];
  }
}

function writeFlags(flags) {
  fs.writeFileSync(FLAGS, JSON.stringify(flags, null, 2) + '\n');
}

// target: a series id, or a URL/path containing /fr/{section}/{id}/ (optionally #n)
function addFlag(target, reason, source = 'claude') {
  const m = String(target).match(/\/fr\/(exercices|applications|defis)\/([a-z0-9]+)\/?(#[0-9]+)?/);
  const seriesId = m ? m[2] : String(target).trim();
  const s = listSeries().find((x) => x.id === seriesId);
  if (!s) throw new Error(`unknown series "${seriesId}"`);
  const flags = readFlags();
  const url = seriesUrl(s) + (m && m[3] ? m[3] : '');
  const dup = flags.find((f) => !f.resolvedAt && f.url === url && f.reason === reason);
  if (dup) return dup;
  const flag = {
    id: crypto
      .createHash('sha256')
      .update(url + reason + now())
      .digest('hex')
      .slice(0, 8),
    seriesId,
    url,
    title: s.title,
    reason,
    source,
    createdAt: now(),
    resolvedAt: null,
    resolvedBy: null,
  };
  flags.push(flag);
  writeFlags(flags);
  return flag;
}

function setFlag(id, action) {
  const flags = readFlags();
  const f = flags.find((x) => x.id === id);
  if (!f) throw new Error(`unknown flag ${id}`);
  if (action === 'resolve') {
    f.resolvedAt = now();
    f.resolvedBy = 'human';
  } else if (action === 'reopen') {
    f.resolvedAt = null;
    f.resolvedBy = null;
  } else throw new Error(`unknown action ${action}`);
  writeFlags(flags);
  return f;
}

module.exports = {
  fingerprint,
  loadGenerators,
  listSeries,
  readValidations,
  writeValidations,
  validateSeries,
  unvalidateSeries,
  status,
  readFlags,
  addFlag,
  setFlag,
};
