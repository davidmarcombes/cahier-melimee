/**
 * LLM verdict cache (reports/validate-llm-cache.csv) and exercise files — shared by
 * scripts/validate-llm.js (text) and scripts/validate-vision.js (screenshots).
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { fingerprint, loadGenerators } = require('./human-validation.js');

const ROOT = path.join(__dirname, '..', '..');
const CACHE_PATH = process.env.LLM_CACHE || path.join(ROOT, 'reports/validate-llm-cache.csv'); // overridable for tests
const SRC_DIRS = [
  path.join(ROOT, 'src/fr/exercices'),
  path.join(ROOT, 'src/fr/applications'),
  path.join(ROOT, 'src/fr/defis'),
];

// ─── Cache ───────────────────────────────────────────────────────────────────
// Format: path,seriesId,hash,manual,<model1>,<model2>,...
// seriesId  — from sibling index.yaml
// hash      — fileHash(): the file + its generator's code, as for the human validations
// manual    — human override after checking an LLM failure: 'ok' skips LLM for THIS version
// Each model gets its own column, added dynamically on first use.
// A hash mismatch invalidates the model columns AND manual: any edit. They stay on the old hash (no
// longer counted anywhere) until new verdicts replace them, or npm run restore:validations re-keys
// them when the edit is known to be safe.
// Entry: { seriesId, hash, manual, models: Map<modelName, 'ok'|'fail'|'skip'> }

const _seriesIdCache = new Map();
function getSeriesId(absPath) {
  const dir = path.dirname(absPath);
  if (_seriesIdCache.has(dir)) return _seriesIdCache.get(dir);
  const indexYaml = path.join(dir, 'index.yaml');
  let id = '';
  if (fs.existsSync(indexYaml)) {
    const match = fs.readFileSync(indexYaml, 'utf8').match(/^id:\s*["']?([a-zA-Z0-9_-]+)["']?/m);
    if (match) id = match[1];
  }
  _seriesIdCache.set(dir, id);
  return id;
}

function loadCache() {
  const map = new Map();
  if (!fs.existsSync(CACHE_PATH)) return map;
  const lines = fs
    .readFileSync(CACHE_PATH, 'utf8')
    .split('\n')
    .filter((l) => l.trim());
  if (lines.length === 0) return map;

  const header = lines[0].split(',');
  // Column layout detection (support progressive migrations):
  //   v1: path,hash,models...
  //   v2: path,seriesId,hash,models...
  //   v3: path,seriesId,hash,manual,models...  ← current
  const hasSeriesId = header[1] === 'seriesId';
  const hasManual = hasSeriesId && header[3] === 'manual';
  const dataOffset = hasManual ? 4 : hasSeriesId ? 3 : 2;
  const modelCols = header.slice(dataOffset);

  for (const line of lines.slice(1)) {
    const parts = line.split(',');
    if (!parts[0]) continue;
    const p = parts[0];
    const seriesId = hasSeriesId ? parts[1] || '' : '';
    const hash = hasSeriesId ? parts[2] || '' : parts[1] || '';
    const manual = hasManual ? parts[3] || '' : '';
    const verdicts = parts.slice(dataOffset);
    const models = new Map();
    modelCols.forEach((m, i) => {
      if (verdicts[i]) models.set(m, verdicts[i]);
    });
    map.set(p, { seriesId, hash, manual, models });
  }
  return map;
}

function saveCache(map) {
  // Backfill any missing seriesIds from the filesystem
  for (const [relPath, entry] of map) {
    if (!entry.seriesId) entry.seriesId = getSeriesId(path.join(ROOT, relPath));
  }

  const allModels = new Set();
  for (const e of map.values()) for (const m of e.models.keys()) allModels.add(m);
  const cols = [...allModels].sort();

  const header = ['path', 'seriesId', 'hash', 'manual', ...cols].join(',');
  const rows = [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([p, e]) =>
      [p, e.seriesId || '', e.hash, e.manual || '', ...cols.map((m) => e.models.get(m) || '')].join(',')
    );
  fs.writeFileSync(CACHE_PATH, [header, ...rows].join('\n') + '\n');
}

// The human-validation fingerprint: the file (LF-normalised) + its generator's code. Editing either
// drops the verdicts; keeping them for an edit that changes nothing is a decision
// (npm run restore:validations).
let gens = null;
const fileHash = (filePath) => fingerprint(filePath, (gens ??= loadGenerators()));

// ─── File discovery ──────────────────────────────────────────────────────────

function walkMdFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkMdFiles(full));
    else if (entry.name.endsWith('.md')) results.push(full);
  }
  return results;
}

// ─── Exercise parsing ────────────────────────────────────────────────────────
// Each .md file may contain one OR multiple frontmatter blocks separated by ---.
// Returns array of { data, body } where body is text following the closing ---.

function parseExercises(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const results = [];

  // Locate every --- delimiter at the start of a line
  const delimRe = /^---[ \t]*\r?\n/gm;
  const delims = [];
  let dm;
  while ((dm = delimRe.exec(content)) !== null) {
    delims.push({ start: dm.index, end: dm.index + dm[0].length });
  }

  // Process delimiter pairs: [open₀, close₀, open₁, close₁, ...]
  // Body text lives between close and the next open (or end of file).
  for (let i = 0; i + 1 < delims.length; i += 2) {
    const yamlText = content.slice(delims[i].end, delims[i + 1].start);
    let data;
    try {
      data = yaml.load(yamlText);
    } catch {
      continue;
    }
    if (!data || typeof data !== 'object') continue;

    const bodyStart = delims[i + 1].end;
    const bodyEnd = delims[i + 2] ? delims[i + 2].start : content.length;
    const body = content.slice(bodyStart, bodyEnd).trim();

    results.push({ data, body });
  }

  return results;
}

module.exports = {
  CACHE_PATH,
  SRC_DIRS,
  getSeriesId,
  loadCache,
  saveCache,
  fileHash,
  walkMdFiles,
  parseExercises,
};
