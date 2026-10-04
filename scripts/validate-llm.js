#!/usr/bin/env node
/**
 * validate-llm.js — LLM-powered exercise answer validator
 *
 * Uses a local Ollama model to verify exercise correctness.
 * Caches results by file hash so unchanged exercises are skipped.
 *
 * Usage:
 *   node scripts/validate-llm.js [options]
 *
 * Options:
 *   --model=<name>       Ollama model  (default: qwen2.5:1.5b)
 *   --concurrency=<n>    Parallel requests (default: 4)
 *   --force              Re-validate everything, ignore cache
 *   --dir=<path>         Only validate exercises under this path
 *   --type=<type>        Only validate this exercise type
 *   --failures-only      Only print failures
 *
 * Cache: scripts/validate-llm-cache.csv
 * Format: path,hash,verdict,model,ts
 *   verdict: ok | fail | skip
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');

// ─── Config ──────────────────────────────────────────────────────────────────

const ROOT = path.join(__dirname, '..');
const CACHE_PATH = path.join(ROOT, 'reports/validate-llm-cache.csv');
const ERRORS_PATH = path.join(ROOT, '.scratch/validate-llm-errors.md');
const SRC_DIRS = [
  path.join(ROOT, 'src/fr/exercices'),
  path.join(ROOT, 'src/fr/applications'),
  path.join(ROOT, 'src/fr/defis'),
];

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

const flags = {};
for (const arg of process.argv.slice(2)) {
  if (!arg.startsWith('--')) continue;
  const [k, v] = arg.slice(2).split('=');
  flags[k] = v !== undefined ? v : true;
}

// --export / --import: Claude Code subagents instead of a local Ollama model (see exportBatches)
const BATCH_DIR = path.join(ROOT, '.scratch/llm-batches');
const EXPORT_DIR = flags.export ? (flags.export === true ? BATCH_DIR : path.resolve(flags.export)) : null;
const IMPORT_DIR = flags.import ? (flags.import === true ? BATCH_DIR : path.resolve(flags.import)) : null;
const BATCH = parseInt(flags.batch || '30', 10);
const MODEL = flags.model || process.env.LLM_MODEL || (EXPORT_DIR || IMPORT_DIR ? 'claude-haiku-4-5' : 'qwen2.5:7b');
const CONCURRENCY = parseInt(flags.concurrency || '3', 10);
const FORCE = flags.force === true;
const FILTER_DIR = flags.dir
  ? String(flags.dir)
      .split(',')
      .map((d) => path.resolve(d))
  : null; // --dir=a,b
const FILTER_TYPE = flags.type ? new Set(String(flags.type).split(',')) : null; // --type=problem,mcq
const FAILURES_ONLY = flags['failures-only'] === true;
const COUNT = flags.one === true ? 1 : flags.count ? parseInt(flags.count, 10) : 0; // 0 = no limit
const VERBOSE = flags.verbose === true || COUNT === 1; // print prompts + raw responses

// Types where LLM can meaningfully verify correctness.
// Purely visual types (ruler, click-blocks, svg-tiles, compare-groups,
// count-objects, number-hunt) are handled as SKIP inside buildPrompt.
const LLM_TYPES = new Set([
  'problem',
  'number-check',
  'true-false',
  'mcq',
  'multi-question',
  'compare',
  'sequence',
  'bounding',
  'column-op',
  'convert',
  'matching',
  'pyramid',
  'fill-table',
  'select',
  'checkbox',
  'sort',
  'drag-sort',
  'clock',
  'fraction',
  'fraction-check',
  'number-line',
  'coordinate-grid',
  'base-10',
  'logic-grid',
  'ruler',
  'guided-problem',
  'think-board',
  'inverse-problem',
  'bar-model',
  'error-analysis',
  'compare-solutions',
  'bar-chart',
  'tile-select',
]);

// ─── ANSI colours ────────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  grey: '\x1b[90m',
};

// ─── Cache ───────────────────────────────────────────────────────────────────
// Format: path,seriesId,hash,manual,<model1>,<model2>,...
// seriesId  — from sibling index.yaml
// manual    — human override: 'ok' skips LLM entirely; survives hash changes (intentional)
// Each model gets its own column, added dynamically on first use.
// A hash mismatch clears model columns but NOT manual (human decision stands until removed).
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

function fileHash(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function fileHashRaw(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').slice(0, 16);
}

function fileHashForceCRLF(filePath) {
  const crlf = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n');
  return crypto.createHash('sha256').update(crlf).digest('hex').slice(0, 16);
}

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

// ─── Generator runner ────────────────────────────────────────────────────────

let _generators = null;
function getGenerators() {
  if (_generators) return _generators;
  global.clockSvg = () => ''; // only SVG call inside the generators
  try {
    _generators = require(path.join(ROOT, 'src/assets/js/generators/index.js'));
  } catch {
    /* */
  }
  return _generators;
}

// Run a generator N times and return sample exercises as { data, body } pairs.
const SAMPLES_PER_GENERATOR = 3;
function generateSamples(generatorName, params, body) {
  const gens = getGenerators();
  if (!gens || !gens[generatorName]) return [];
  const out = [];
  for (let i = 0; i < SAMPLES_PER_GENERATOR; i++) {
    try {
      const item = gens[generatorName].generate(params || {});
      if (item && item.type) out.push({ data: item, body, generatorName });
    } catch {
      /* skip bad sample */
    }
  }
  return out;
}

// ─── Markdown / HTML stripping ───────────────────────────────────────────────

function strip(text) {
  if (!text) return '';
  return String(text)
    .replace(/<span class="fn">([^<]*)<\/span><span class="fd">([^<]*)<\/span>/g, '$1/$2') // HTML fractions → a/b
    .replace(/<[^>]+>/g, ' ') // HTML tags
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1') // italic
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/\s+/g, ' ')
    .trim();
}

// = sortValue() in src/assets/js/modules/player.js (ES module, not requirable here)
function sortValue(s) {
  const html = String(s).replace(/<span class="fn">([^<]*)<\/span><span class="fd">([^<]*)<\/span>/g, '$1/$2');
  const t = html
    .replace(/<[^>]*>/g, '')
    .replace(/\s/g, '')
    .replace(',', '.');
  const frac = t.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  return frac ? Number(frac[1]) / Number(frac[2]) : parseFloat(t);
}

// HTML tables (generated statements) → « a | b ; c | d » before stripping, so the values survive
function tableText(html) {
  return strip(
    String(html)
      .replace(/<\/t[hd]>\s*<t[hd][^>]*>/gi, ' | ')
      .replace(/<\/tr>/gi, ' ; ')
  ).replace(/(\s*;\s*)+$/, '');
}

// ─── Prompt builder ──────────────────────────────────────────────────────────

const SYSTEM = `Tu es un expert en pédagogie et en mathématiques pour l'école primaire française (niveaux CP à CM2).
Ton rôle est de vérifier si la "Réponse proposée" pour un exercice est mathématiquement et logiquement correcte par rapport à l'énoncé et au contexte fournis.

### CONSIGNES DE VÉRIFICATION :
1. **Raisonnement** : Analyse l'énoncé, fais le calcul toi-même, puis compare avec la réponse proposée.
2. **Conventions françaises** :
   - La virgule est le séparateur décimal (ex: 3,5).
   - Les unités (cm, kg, €, etc.) doivent être cohérentes.
   - Sois indulgent sur les espaces (ex: "1 000" et "1000" sont identiques).
3. **Cas ambigus** : Si la réponse proposée est une variante correcte (ex: 0,5 au lieu de 1/2), accepte-la.
4. **SKIP** : Utilise SKIP uniquement si l'exercice est STRICTEMENT impossible à vérifier sans voir une image (géométrie pure, couleurs sans description). Si l'énoncé textuel suffit, vérifie-le.

### FORMAT DE RÉPONSE :
Réponds par une réflexion TRÈS BRÈVE (2-3 phrases maximum), suivie d'UNE SEULE LIGNE finale contenant uniquement le verdict.
Verdict possible :
CORRECT
INCORRECT: <raison courte en français>
SKIP: <raison courte en français>

Exemple :
La somme de 12 et 15 est bien 27.
CORRECT`;

function buildPrompt({ data, body }) {
  const type = data.type || 'number-check';
  const title = strip(data.title || body || '');

  // Helper: format a value for display
  const fmt = (v) => (v === null || v === undefined ? '?' : String(v));

  switch (type) {
    case 'problem':
    case 'number-check': {
      const bodyText = strip(data.body || body || '');
      const operationText = data.operation !== undefined ? String(data.operation) : null;
      const answers = data.answers ? data.answers.join(' ou ') : fmt(data.answer);
      // body is the instruction ("Arrondis à la dizaine..."), operation is the actual number/expression
      const instruction = strip(data.title || body || '');
      return [
        `Type: problème / calcul`,
        instruction && `Énoncé: ${instruction}`,
        operationText && `Calcul: ${operationText}`,
        bodyText && bodyText !== instruction && `Contexte: ${bodyText}`,
        `Réponse proposée: ${answers}`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'true-false': {
      if (!Array.isArray(data.statements)) return null;
      const context = strip(data.body || body || title || '');
      // Use "proposé: V/F" phrasing — avoids the LLM echoing VRAI/FAUX per line
      const lines = data.statements.map((s, i) => {
        const label = s.answer === true || s.answer === 'true' ? 'V' : 'F';
        return `${i + 1}. "${strip(s.text)}" — proposé: ${label}`;
      });
      return [
        `Type: vrai/faux — les étiquettes V/F proposées sont-elles toutes correctes ?`,
        context && `Contexte: ${context}`,
        data.generator && `(figure générée: ${data.generator})`,
        ...lines,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'mcq': {
      const bodyText = strip(data.body || body || '');
      const question = bodyText || title;
      // Static files: choices + answer (text). Generators: mcqChoices + mcqAnswer (index)
      const list = data.mcqChoices || data.choices || [];
      const choices = list.map((c) => `- ${strip(String(c))}`).join('\n');
      if (!choices) return null;
      const ans =
        data.mcqChoices && Number.isInteger(data.mcqAnswer) ? strip(String(list[data.mcqAnswer])) : fmt(data.answer);
      return [
        `Type: QCM (Question à Choix Multiples)`,
        question && `Question: ${question}`,
        title && title !== question && `Énoncé: ${strip(title)}`,
        data.operation && `Calcul: ${strip(String(data.operation))}`,
        data.generator && `(figure générée: ${data.generator})`,
        `Choix proposés:\n${choices}`,
        `Réponse proposée comme étant la bonne : ${ans}`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'multi-question': {
      if (!Array.isArray(data.questions)) return null;
      const context = strip(data.body || body || title || '');
      const lines = data.questions.map((q, i) => `${i + 1}. ${strip(q.text)} → ${fmt(q.answer)}`);
      return [
        `Type: questions multiples`,
        title && `Consigne: ${title}`,
        context && `Contexte: ${context}`,
        // The data the questions are about (« 45 + 28 = ? », a statement, a table)
        data.context && `Données: ${tableText(String(data.context))}`,
        data.operation && `Calcul: ${strip(String(data.operation))}`,
        data.svg && data.svg.gen && `Figure: ${data.svg.gen} ${JSON.stringify(data.svg.par || {})}`,
        data.generator && `(figure générée: ${data.generator})`,
        ...lines,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'compare': {
      if (!Array.isArray(data.comparisons)) return null;
      const lines = data.comparisons.map((c) => `${strip(String(c.left))} ${c.answer} ${strip(String(c.right))}`);
      return `Type: comparaison\n${lines.join('\n')}`;
    }

    case 'sequence': {
      const given = (data.given || []).join(', ');
      const answers = (data.answers || []).join(', ');
      return [
        `Type: suite de nombres`,
        title && `Contexte: ${title}`,
        `Termes donnés: ${given}`,
        `Réponse proposée: ${answers}`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'bounding': {
      return [
        `Type: encadrement`,
        title && `Contexte: ${title}`,
        `Nombre: ${fmt(data.number)}`,
        `Encadrement proposé: ${(data.answers || []).join(' ≤ nombre ≤ ')}`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'column-op': {
      return [
        `Type: opération posée`,
        title && `Contexte: ${title}`,
        `  ${fmt(data.top)}`,
        `${data.operation} ${fmt(data.bottom)}`,
        `= ${fmt(data.result)}`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'convert': {
      if (!Array.isArray(data.items)) return null;
      const lines = data.items.map((it) => `${strip(String(it.prompt))} = ${fmt(it.answer)} ${it.unit || ''}`);
      return `Type: conversion\n${title && `Contexte: ${title}\n`}${lines.join('\n')}`;
    }

    case 'matching': {
      // Two formats: a list of { left, right } (current) or { left: [], right: [], answers } (older)
      let left, right, answers;
      if (Array.isArray(data.pairs) && data.pairs.every((p) => p && typeof p === 'object' && 'left' in p)) {
        left = data.pairs.map((p) => p.left);
        right = data.pairs.map((p) => p.right);
      } else if (data.pairs && Array.isArray(data.pairs.left)) ({ left, right, answers } = data.pairs);
      else return null;
      const pairs = left.map((l, i) => {
        const ri = Array.isArray(answers) ? answers[i] : i;
        return [strip(String(l)), strip(String(right[ri]))];
      });
      if (pairs.some(([l, r]) => !l || !r)) return null; // picture on one side (clocks…): visual
      const lines = pairs.map(([l, r]) => `${l} ↔ ${r}`);
      return [
        `Type: association — les paires ci-dessous sont les réponses proposées (gauche relié à droite)`,
        title && `Contexte: ${title}`,
        ...lines,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'pyramid': {
      if (!Array.isArray(data.pyramid)) return null;
      const rows = data.pyramid.map((r) => (Array.isArray(r) ? r.join('  ') : r));
      return [
        `Type: pyramide d'additions (chaque case est la somme des deux cases en dessous)`,
        title && `Contexte: ${title}`,
        `Pyramide (du haut vers le bas) :\n${rows.join('\n')}`,
        `Vérifie si toutes les sommes sont exactes.`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'fill-table': {
      // Generated tables: table.rows of cells { value } or { blank, answer }
      if (data.table && Array.isArray(data.table.rows)) {
        const cell = (c) => (c.blank ? `[${fmt(c.answer)}]` : strip(String(c.value ?? '')));
        return [
          `Type: compléter un tableau (les réponses proposées sont entre crochets)`,
          title && `Consigne: ${title}`,
          Array.isArray(data.table.headers) &&
            `Colonnes: ${data.table.headers.map((h) => strip(String(h))).join(' | ')}`,
          ...data.table.rows.map((r) => r.map(cell).join(' | ')),
        ]
          .filter(Boolean)
          .join('\n');
      }
      if (!Array.isArray(data.headers)) return null;
      const hdrs = data.headers.join(' | ');
      const rows = (data.rows || []).map((r, i) => {
        const ans = (data.answers || [])[i];
        return `${(Array.isArray(r) ? r : [r]).join(' | ')} | réponse: ${Array.isArray(ans) ? ans.join(', ') : ans}`;
      });
      return `Type: compléter un tableau\nColonnes: ${hdrs}\n${rows.join('\n')}`;
    }

    case 'select': {
      if (!Array.isArray(data.statements)) return null;
      // Choices are per statement (or shared at the top level)
      const lines = data.statements.map((s) => {
        const choices = (s.choices || data.choices || []).map((c) => strip(String(c)));
        return `${strip(s.template || s.text || '')}  [choix : ${choices.join(', ')}] → réponse proposée : ${fmt(s.answer)}`;
      });
      return [`Type: phrases à compléter (le mot choisi remplace ___)`, title && `Consigne: ${title}`, ...lines]
        .filter(Boolean)
        .join('\n');
    }

    case 'checkbox': {
      if (!Array.isArray(data.statements)) return null;
      const checked = new Set(data.checkedAnswers || []);
      const lines = data.statements.map(
        (s, i) => `[${checked.has(i) || checked.has(String(s)) ? '✓' : ' '}] ${strip(String(s))}`
      );
      return `Type: cases à cocher\n${title && `Contexte: ${title}\n`}${lines.join('\n')}`;
    }

    case 'sort':
    case 'drag-sort': {
      // The expected order is computed like the player does (src/assets/js/modules/player.js):
      // numeric sort by `direction`, or the listed order for sortKeepOrder (labels from a table)
      // Fraction picture tiles ({ gen, par: { n, d } }) are shown as « n/d (figure) »
      const raw = data.items || data.tiles || [];
      const items = raw.map((i) =>
        i && typeof i === 'object'
          ? i.par && i.par.d
            ? `${i.par.n}/${i.par.d} (figure)`
            : ''
          : strip(String(i).replace(/<span class="fn">([^<]*)<\/span><span class="fd">([^<]*)<\/span>/g, '$1/$2'))
      );
      if (items.some((i) => !i)) return null; // other picture tiles
      // Picture tiles are pre-rendered with their n/d spans, which sortValue() reads (= player.js)
      const value = (i) => (typeof raw[i] === 'object' ? raw[i].par.n / raw[i].par.d : sortValue(raw[i]));
      const expected = data.sortKeepOrder
        ? items
        : items
            .map((_, i) => i)
            .sort((a, b) => (data.direction === 'desc' ? value(b) - value(a) : value(a) - value(b)))
            .map((i) => items[i]);
      return [
        `Type: ranger dans l'ordre`,
        title && `Consigne: ${title}`,
        (data.body || body) && `Énoncé: ${tableText(data.body || body)}`,
        `Éléments à ranger: ${items.join(' ; ')}`,
        `Ordre attendu par le jeu (du premier au dernier): ${expected.join(' ; ')}`,
        `Vérifie que cet ordre respecte la consigne (sens croissant / décroissant, valeurs du tableau).`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'clock': {
      const h = fmt(data.hour),
        m = fmt(data.minute);
      const ans = data.answers ? data.answers.join(' ou ') : fmt(data.answer);
      const bodyText = strip(body || '');
      return [
        `Type: lire l'heure`,
        bodyText && `Contexte: ${bodyText}`,
        `Heure affichée: ${h}h${m.padStart(2, '0')}`,
        `Réponse proposée: ${ans} (formats acceptés : Xh30, XhXX, X:XX, XX:XX)`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'fraction': {
      const n = fmt(data.numerator),
        d = fmt(data.denominator),
        ans = fmt(data.answer);
      return [
        `Type: fraction (forme ${data.shape || '?'})`,
        title && `Contexte: ${title}`,
        `Fraction: ${n}/${d}`,
        `Réponse proposée: ${ans}`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'fraction-check': {
      const answers = data.answers ? data.answers.join(' ou ') : fmt(data.answer);
      const bodyText = strip(data.body || body || '');
      return [
        `Type: vérifier une fraction`,
        title && `Titre: ${title}`,
        bodyText && `Énoncé: ${bodyText}`,
        data.operation && `Calcul: ${strip(String(data.operation))}`,
        `Réponse proposée: ${answers}`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'number-line': {
      const bodyText = strip(body || '');
      const place = data.mode === 'place';
      return [
        place
          ? `Type: droite graduée — l'élève doit placer le nombre ${fmt(data.answer)} sur une graduation`
          : `Type: droite graduée`,
        bodyText && `Question: ${bodyText}`,
        `Graduation: de ${fmt(data.min)} à ${fmt(data.max)}, pas de ${fmt(data.step || 1)}`,
        data.value != null && `Position du point ${data.label || 'A'}: ${data.value}`,
        place
          ? `Vérifie que ${fmt(data.answer)} est entre ${fmt(data.min)} et ${fmt(data.max)} et tombe exactement sur une graduation.`
          : `Réponse proposée: ${fmt(data.answer)}`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'coordinate-grid': {
      const pts = (data.points || []).map((p) => `${p.label || 'A'}(${p.x} ; ${p.y})`).join(', ');
      // answer format is "x,y" (comma-separated integers) — reformat as (x ; y) to avoid
      // confusion with French decimal notation where comma means decimal point
      const ansCoord = fmt(data.answer).replace(',', ' ; ');
      return [
        `Type: quadrillage (coordonnées)`,
        title && `Contexte: ${title}`,
        `Grille: ${data.cols || 6}×${data.rows || 6}`,
        pts && `Points affichés: ${pts}`,
        `Réponse proposée: (${ansCoord})`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'base-10': {
      const h = data.hundreds || 0,
        t = data.tens || 0,
        o = data.ones || 0;
      const nombre = data.number ?? h * 100 + t * 10 + o;
      return [
        `Type: décomposition base 10`,
        title && `Contexte: ${title}`,
        data.hundreds != null && `${h} centaine(s) + ${t} dizaine(s) + ${o} unité(s)`,
        `Nombre: ${nombre}`,
        `Réponse proposée: ${fmt(data.answer)}`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'ruler': {
      const markers = (data.markers || []).map((m) => `${m.label || 'point'} à ${m.value}`).join(', ');
      return [
        `Type: lecture de règle graduée`,
        title && `Instruction: ${title}`,
        `Graduations de ${data.min ?? 0} à ${data.max ?? 10}.`,
        markers && `Éléments sur la règle : ${markers}`,
        `Réponse proposée : ${fmt(data.answer)}`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'logic-grid': {
      // Logic grids are complex; provide the solution AND the clues
      if (!data.solution) return null;
      const bodyText = strip(data.body || body || '');
      const sol = Array.isArray(data.solution)
        ? data.solution.map((r) => (Array.isArray(r) ? r.join(', ') : r)).join('\n')
        : JSON.stringify(data.solution);
      return [
        `Type: grille logique (logigramme)`,
        title && `Objectif: ${title}`,
        bodyText && `Indices (Clues) :\n${bodyText}`,
        `Colonnes : ${(data.columns || []).join(', ')}`,
        `Lignes : ${(data.rows || []).join(', ')}`,
        `Solution proposée à vérifier par rapport aux indices :\n${sol}`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    // ── Problem / reasoning types (no answer oracle for them) ──

    case 'guided-problem': {
      if (!Array.isArray(data.steps)) return null;
      const steps = data.steps.map((s, i) => {
        if (s.kind === 'keywords') return `${i + 1}. Mots-clés à repérer : ${(s.tokens || []).join(', ')}`;
        if (s.kind === 'numbers') return `${i + 1}. Nombres utiles à repérer : ${(s.tokens || []).join(', ')}`;
        if (s.kind === 'operation')
          return `${i + 1}. Opération à choisir parmi ${(s.choices || []).join(' / ')} → réponse proposée : ${fmt(s.answer)}`;
        if (s.kind === 'calculate') return `${i + 1}. Résultat → réponse proposée : ${fmt(s.answer)} ${s.unit || ''}`;
        return `${i + 1}. ${s.kind} → ${fmt(s.answer ?? (s.tokens || []).join(', '))}`;
      });
      return [
        `Type: problème guidé (chaque étape a une réponse proposée)`,
        title && `Titre: ${title}`,
        `Énoncé: ${strip(data.story || '')}`,
        ...steps,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'think-board': {
      return [
        `Type: calcul représenté (l'élève calcule et illustre)`,
        `Calcul: ${strip(String(data.expression || ''))}`,
        data.manipLabel && `Représentation montrée: ${strip(data.manipLabel)}`,
        `Réponse proposée: ${data.answers ? data.answers.join(' ou ') : fmt(data.answer)} ${data.unit || ''}`,
        `Vérifie le calcul ET que la représentation correspond bien au calcul.`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'inverse-problem': {
      if (!data.ipBase) return null;
      return [
        `Type: problème et ses problèmes inverses (chaque énoncé a sa réponse proposée)`,
        `Problème de départ: ${strip(data.ipBase.text)} → réponse proposée : ${fmt(data.ipBase.answer)}`,
        ...(data.ipInverses || []).map(
          (q, i) => `Variante ${i + 1}: ${strip(q.text)} → réponse proposée : ${fmt(q.answer)}`
        ),
      ].join('\n');
    }

    case 'bar-model': {
      const bm = data.bm || {};
      const bars = Object.entries(bm)
        .filter(([k]) => !/label/i.test(k))
        .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join('+') : v}`)
        .join(', ');
      return [
        `Type: problème avec schéma en barres`,
        title && `Titre: ${title}`,
        `Énoncé: ${strip(data.body || body || '')}`,
        `Schéma: ${bars}`,
        `Réponse proposée: ${fmt(data.answer)} ${data.unit || ''}`,
        `Vérifie la réponse ET que le schéma correspond à l'énoncé.`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'error-analysis': {
      if (!Array.isArray(data.steps)) return null;
      return [
        `Type: analyse d'erreur — un élève a fait ce calcul, une étape est fausse`,
        (data.body || body) && `Consigne: ${strip(data.body || body)}`,
        ...data.steps.map((s, i) => `Étape ${i + 1}: ${strip(String(s))}`),
        `Étape fausse proposée: ${Number(data.wrongStep) + 1}`,
        `Correction proposée: ${fmt(data.correction)}`,
        `Vérifie que c'est bien cette étape qui est fausse et que la correction est juste.`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'compare-solutions': {
      if (!Array.isArray(data.solutions)) return null;
      return [
        `Type: deux solutions d'élèves — laquelle a raison ?`,
        ...data.solutions.map(
          (s, i) => `Solution ${i + 1} (${s.name}): ${(s.steps || []).map((x) => strip(String(x))).join(' | ')}`
        ),
        `Bonne solution proposée: Solution ${Number(data.correctSolution) + 1} (${data.solutions[data.correctSolution]?.name})`,
      ].join('\n');
    }

    case 'bar-chart': {
      if (!Array.isArray(data.labels)) return null;
      const vals = data.labels.map((l, i) => `${l} = ${data.values[i]}`).join(', ');
      // build: the pupil draws the bars → the expected values must be those of the statement
      // read: the chart is shown → the answers to its questions must match it
      return [
        data.mode === 'read'
          ? `Type: lecture d'un diagramme en barres — réponds aux questions avec les valeurs du diagramme`
          : `Type: construction d'un diagramme en barres — les valeurs attendues doivent être exactement celles de l'énoncé`,
        `Énoncé: ${strip(data.body || body || title)}`,
        `Valeurs ${data.mode === 'read' ? 'du diagramme' : 'attendues'}: ${vals}`,
        ...(data.questions || []).map((q) => `Question: ${strip(q.text)} → réponse proposée : ${fmt(q.answer)}`),
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'tile-select': {
      if (!Array.isArray(data.tiles)) return null;
      const tiles = data.tiles.map((t) => (typeof t === 'object' ? '' : strip(String(t))));
      if (tiles.some((t) => !t)) return null; // picture tiles
      const good = new Set((data.tileAnswers || []).map(Number));
      return [
        `Type: sélection de cases (les cases cochées [✓] sont les réponses proposées)`,
        title && `Consigne: ${title}`,
        (data.body || body) && `Énoncé: ${strip(data.body || body)}`,
        ...tiles.map((t, i) => `[${good.has(i) ? '✓' : ' '}] ${t}`),
      ]
        .filter(Boolean)
        .join('\n');
    }

    default:
      return null; // will become SKIP
  }
}

// ─── Ollama API ───────────────────────────────────────────────────────────────

async function checkOllama() {
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch {
    return false;
  }
}

async function askLLM(userPrompt) {
  if (VERBOSE) {
    console.log(`\n${C.bold}${'─'.repeat(60)}${C.reset}`);
    console.log(`${C.bold}SYSTEM PROMPT:${C.reset}`);
    console.log(C.grey + SYSTEM + C.reset);
    console.log(`\n${C.bold}USER PROMPT:${C.reset}`);
    console.log(C.cyan + userPrompt + C.reset);
  }

  const body = JSON.stringify({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: userPrompt },
    ],
    stream: false,
    think: false, // disable thinking mode for deepseek-r1/qwen3; ignored by other models
    options: { temperature: 0, num_predict: 512 },
  });

  const r = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(120000),
  });

  if (!r.ok) throw new Error(`Ollama ${r.status}`);
  const data = await r.json();

  // deepseek-r1 and similar reasoning models emit <think>…</think> blocks.
  // Older Ollama versions inline them in message.content; newer ones separate
  // them into message.thinking.  Strip the think block first, then fall back
  // to scanning the thinking field if the content is empty.
  let response = (data.message?.content || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (!response && data.message?.thinking) {
    // Extract the last verdict-like line from the thinking block as a fallback.
    const thinkLines = data.message.thinking
      .trim()
      .split(/\r?\n/)
      .filter((l) => l.trim());
    for (let i = thinkLines.length - 1; i >= 0; i--) {
      const upper = thinkLines[i].trim().toUpperCase();
      if (upper.startsWith('CORRECT') || upper.startsWith('INCORRECT') || upper.startsWith('SKIP')) {
        response = thinkLines[i].trim();
        break;
      }
    }
  }

  if (VERBOSE) {
    console.log(`\n${C.bold}RAW RESPONSE:${C.reset}`);
    console.log(C.yellow + response + C.reset);
    const ms = data.eval_duration ? Math.round(data.eval_duration / 1e6) : '?';
    console.log(`${C.grey}(${ms} ms, ${data.eval_count ?? '?'} tokens)${C.reset}`);
  }

  return response;
}

// ─── Verdict parsing ─────────────────────────────────────────────────────────

function parseVerdict(response) {
  if (!response) return { verdict: 'skip', reason: 'Réponse vide' };

  const lines = response
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (lines.length === 0) return { verdict: 'skip', reason: 'Réponse vide' };

  // Scan from bottom to top for the verdict
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    const upper = line.toUpperCase();

    if (upper.startsWith('CORRECT')) {
      return { verdict: 'ok', reason: '' };
    }
    if (upper.startsWith('INCORRECT')) {
      return { verdict: 'fail', reason: (line.includes(':') ? line.slice(line.indexOf(':') + 1) : '').trim() };
    }
    if (upper.startsWith('SKIP')) {
      return { verdict: 'skip', reason: (line.includes(':') ? line.slice(line.indexOf(':') + 1) : '').trim() };
    }
  }

  // Fallback for per-statement lists (VRAI/FAUX)
  const perLine = lines.map((l) => l.toUpperCase().trimStart());
  const hasKeywords = perLine.some((l) => /^(VRAI|FAUX|CORRECT|INCORRECT|V|F|SKIP)/.test(l));
  if (hasKeywords && lines.length > 1) {
    const hasFail = perLine.some((l) => l.startsWith('INCORRECT') || l.startsWith('FAUX'));
    const isSkip = perLine.every((l) => l.startsWith('SKIP')) || (perLine.length < 2 && perLine[0].startsWith('SKIP'));
    if (isSkip) return { verdict: 'skip', reason: 'Skipped by model' };
    return hasFail
      ? {
          verdict: 'fail',
          reason: lines
            .filter((l) => /^(INCORRECT|FAUX)/i.test(l.trimStart()))
            .map((l) => l.trim())
            .join('; '),
        }
      : { verdict: 'ok', reason: '' };
  }

  // Third pass: verdict keyword appears mid-line (e.g. "ANSWER : CORRECT", "Verdict: INCORRECT")
  // Check INCORRECT before CORRECT to avoid false positive (\bCORRECT\b won't match inside
  // INCORRECT but checking order is safer for any future variant).
  for (let i = lines.length - 1; i >= 0; i--) {
    const upper = lines[i].trim().toUpperCase();
    if (/\bINCORRECT\b/.test(upper)) return { verdict: 'fail', reason: '' };
    if (/\bCORRECT\b/.test(upper)) return { verdict: 'ok', reason: '' };
    if (/\bSKIP\b/.test(upper)) return { verdict: 'skip', reason: '' };
  }

  return { verdict: 'skip', reason: `Format inconnu dans la réponse (tronqué ?)` };
}

// ─── Concurrency pool ────────────────────────────────────────────────────────

async function pool(tasks, concurrency, fn) {
  const results = new Array(tasks.length);
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await fn(tasks[i], i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

// ─── Claude subagents: --export / --import ───────────────────────────────────
// No local model needed: Claude Code subagents (Haiku) read the exported batches and write one
// verdict per item; --import records them in the cache under MODEL (default claude-haiku-4-5),
// so the admin dashboard's LLM column shows them. Failures become flags (🚩 in /admin/).
//
//   node scripts/validate-llm.js --export [--batch=30] [--count=N] [--dir=…]   → .scratch/llm-batches/
//   (one subagent per batch-NNN.json → batch-NNN.result.jsonl, see the README written there)
//   node scripts/validate-llm.js --import                                      ← reads the results

// The data of a generated figure (chips of a numeration table, a calendar…) is often what the
// answers are about: always give it to the checker
function withFigure(prompt, data) {
  if (!prompt || !data.svg || !data.svg.gen || prompt.includes('Figure:')) return prompt;
  return `${prompt}\nFigure: ${data.svg.gen} ${JSON.stringify(data.svg.par || {})}`;
}

function exportBatches() {
  const cache = loadCache();
  const { tasks, allFiles, cacheHits } = collectTasks(cache);
  saveCache(cache); // manifest rows + direct 'skip' verdicts for files with nothing checkable
  fs.rmSync(EXPORT_DIR, { recursive: true, force: true });
  fs.mkdirSync(EXPORT_DIR, { recursive: true });

  const manifest = {}; // key → { relPath, hash, seriesId, type, title }
  const items = [];
  for (const t of tasks) {
    for (const ex of t.exercises) {
      const prompt = withFigure(buildPrompt(ex), ex.data);
      const type = ex.data.type || 'number-check';
      const title = (
        (ex.generatorName ? `[gen:${ex.generatorName}] ` : '') + strip(ex.data.title || ex.body || '')
      ).slice(0, 70);
      const key = String(Object.keys(manifest).length + 1); // every exercise, with or without a prompt
      manifest[key] = { relPath: t.relPath, hash: t.hash, seriesId: t.seriesId, type, title, noPrompt: !prompt };
      if (prompt) items.push({ key, prompt });
    }
  }
  const batches = [];
  for (let i = 0; i < items.length; i += BATCH) batches.push(items.slice(i, i + BATCH));
  batches.forEach((b, i) => {
    const name = `batch-${String(i + 1).padStart(3, '0')}`;
    fs.writeFileSync(path.join(EXPORT_DIR, `${name}.json`), JSON.stringify({ items: b }, null, 1));
  });
  fs.writeFileSync(path.join(EXPORT_DIR, 'manifest.json'), JSON.stringify({ model: MODEL, manifest }, null, 1));
  fs.writeFileSync(
    path.join(EXPORT_DIR, 'README.md'),
    `# Consignes pour le vérificateur\n\n${SYSTEM}\n\n` +
      `### FICHIERS\nLis \`batch-NNN.json\` : une liste \`items\` de { key, prompt }. Pour CHAQUE item, écris UNE ligne JSON ` +
      `dans \`batch-NNN.result.jsonl\` (même dossier) :\n` +
      `{"key":"<key>","verdict":"CORRECT"|"INCORRECT"|"SKIP","reason":"<raison courte en français, vide si CORRECT>"}\n` +
      `Pas d'autre texte dans ce fichier. N'écris INCORRECT que si tu as refait le calcul et que tu es sûr ; en cas de doute, SKIP.\n` +
      `N'écris CORRECT que si tu as pu refaire le calcul avec les données du prompt : si une donnée nécessaire manque ` +
      `(le nombre de départ, une figure non décrite), réponds SKIP avec « donnée manquante : … ».\n`
  );
  console.log(
    `Files: ${allFiles.length} total, ${C.green}${cacheHits} cached${C.reset}, ${C.yellow}${tasks.length} to validate${C.reset}` +
      ` → ${items.length} prompts in ${batches.length} batch(es) of ≤ ${BATCH}: ${path.relative(ROOT, EXPORT_DIR)}/`
  );
  return 0;
}

function importResults() {
  const dir = IMPORT_DIR;
  const { model, manifest } = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  const results = {};
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.result.jsonl'))) {
    for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const r = JSON.parse(line);
        if (r.key != null) results[String(r.key)] = r;
      } catch {
        console.log(`${C.yellow}  unreadable line in ${f}: ${line.slice(0, 80)}${C.reset}`);
      }
    }
  }
  // Group by file; a file gets a verdict only when every one of its items has a result
  const byFile = new Map();
  for (const [key, m] of Object.entries(manifest)) {
    if (!byFile.has(m.relPath)) byFile.set(m.relPath, []);
    byFile.get(m.relPath).push({ key, ...m });
  }
  const cache = loadCache();
  const human = require('./lib/human-validation.js');
  let ok = 0,
    fail = 0,
    skip = 0,
    incomplete = 0,
    changed = 0;
  for (const [relPath, entries] of byFile) {
    const abs = path.join(ROOT, relPath);
    if (!fs.existsSync(abs) || fileHash(abs) !== entries[0].hash) {
      changed++; // edited since the export: its verdict would describe another version
      continue;
    }
    const verdicts = entries.map((e) => {
      if (e.noPrompt) return { verdict: 'skip', reason: 'no prompt for type' };
      const r = results[e.key];
      if (!r) return null;
      const v = String(r.verdict || '').toUpperCase();
      return { ...e, verdict: v === 'CORRECT' ? 'ok' : v === 'INCORRECT' ? 'fail' : 'skip', reason: r.reason || '' };
    });
    if (verdicts.some((v) => !v)) {
      incomplete++;
      continue;
    }
    const fileVerdict = verdicts.some((v) => v.verdict === 'fail')
      ? 'fail'
      : verdicts.every((v) => v.verdict === 'skip')
        ? 'skip'
        : 'ok';
    const e = cache.get(relPath);
    const entry =
      e && e.hash === entries[0].hash
        ? e
        : { seriesId: entries[0].seriesId, hash: entries[0].hash, manual: e?.manual || '', models: new Map() };
    entry.models.set(model, fileVerdict);
    cache.set(relPath, entry);
    if (fileVerdict === 'ok') ok++;
    else if (fileVerdict === 'skip') skip++;
    else {
      fail++;
      for (const v of verdicts.filter((x) => x.verdict === 'fail')) {
        const reason = `[LLM ${model}] ${path.basename(relPath)} · ${v.type} « ${v.title} » : ${v.reason}`;
        human.addFlag(v.seriesId, reason, 'llm');
        console.log(`  ${C.red}✗${C.reset} ${relPath}\n     ${C.yellow}${v.title} — ${v.reason}${C.reset}`);
      }
    }
  }
  saveCache(cache);
  console.log(
    `\n${C.bold}Imported (${model}):${C.reset} ${C.green}${ok} ok${C.reset} · ${C.red}${fail} fail (flagged in /admin/)${C.reset} · ${C.grey}${skip} skip${C.reset}` +
      (incomplete ? ` · ${C.yellow}${incomplete} file(s) without all results${C.reset}` : '') +
      (changed ? ` · ${C.yellow}${changed} file(s) changed since the export, ignored${C.reset}` : '')
  );
  return 0;
}

// ─── Task collection ─────────────────────────────────────────────────────────
// Files needing a verdict from MODEL (new, changed, failed, or never validated by it), with their
// LLM-checkable exercises (generated ones expanded into samples). Files with nothing checkable get
// a 'skip' verdict directly. Updates the cache manifest in place.

function collectTasks(cache) {
  // 3. Collect all .md files
  let allFiles = SRC_DIRS.flatMap(walkMdFiles);
  if (FILTER_DIR) allFiles = allFiles.filter((f) => FILTER_DIR.some((d) => f.startsWith(d)));

  // 4. Build task list: files that need (re-)validation
  const tasks = [];
  let cacheHits = 0;

  for (const absPath of allFiles) {
    const relPath = path.relative(ROOT, absPath).replace(/\\/g, '/');
    const hash = fileHash(absPath);
    const seriesId = getSeriesId(absPath);
    const entry = cache.get(relPath);

    // Ensure every file appears in the cache as a manifest entry (no verdict yet = unvalidated)
    if (!entry || entry.hash !== hash) {
      // Preserve verdicts if only line endings changed (CRLF→LF normalization, not real edit)
      const isLineEndingChange =
        entry && (entry.hash === fileHashRaw(absPath) || entry.hash === fileHashForceCRLF(absPath));
      const keepModels = isLineEndingChange ? entry.models : new Map();
      cache.set(relPath, { seriesId, hash, manual: entry?.manual || '', models: keepModels });
    } else if (!entry.seriesId) {
      entry.seriesId = seriesId;
    }

    // manual=ok overrides everything — human has reviewed and approved, skip LLM
    if (!FORCE && entry?.manual === 'ok') {
      cacheHits++;
      continue;
    }

    // Use cache if this model already validated this exact file version
    const modelVerdict = entry?.hash === hash ? entry.models.get(MODEL) : undefined;
    // A failure is retried with a local model (small models are noisy), but not with --export: a
    // Claude failure is flagged for a human, who settles it (manual=ok, or fixes the file)
    if (!FORCE && modelVerdict && (modelVerdict !== 'fail' || EXPORT_DIR)) {
      cacheHits++;
      continue;
    }

    const exercises = parseExercises(absPath);
    if (exercises.length === 0) continue;

    // Expand generator-based exercises into concrete samples; keep static ones as-is
    const relevant = [];
    for (const ex of exercises) {
      const t = ex.data.type || 'number-check';
      if (FILTER_TYPE && !FILTER_TYPE.has(t)) continue;
      if (ex.data.generator) {
        // Application exercise: run generator to produce real samples
        const samples = generateSamples(ex.data.generator, ex.data.params, ex.body);
        for (const s of samples) {
          if (LLM_TYPES.has(s.data.type || 'number-check')) relevant.push(s);
        }
      } else if (LLM_TYPES.has(t)) {
        relevant.push(ex);
      }
    }

    if (relevant.length === 0) {
      // When filtering by type, the file may have exercises of other types — don't
      // poison its cache entry with a blanket skip.
      if (FILTER_TYPE) continue;
      // File genuinely has no LLM-checkable exercises — mark as skip for this model
      const e = entry?.hash === hash ? entry : { seriesId, hash, manual: entry?.manual || '', models: new Map() };
      if (entry?.hash !== hash) e.models.clear();
      e.seriesId = seriesId;
      e.models.set(MODEL, 'skip');
      cache.set(relPath, e);
      continue;
    }

    tasks.push({ absPath, relPath, seriesId, hash, exercises: relevant });
  }
  // --count / --one: trim task list
  // --export picks files spread over the whole list (every level and theme), not the first N
  if (COUNT > 0 && EXPORT_DIR && tasks.length > COUNT) {
    const step = tasks.length / COUNT;
    const picked = Array.from({ length: COUNT }, (_, i) => tasks[Math.floor(i * step)]);
    tasks.splice(0, tasks.length, ...picked);
  } else if (COUNT > 0) tasks.splice(COUNT);
  return { tasks, allFiles, cacheHits };
}

async function main() {
  console.log(
    `\n${C.bold}LLM exercise validator${C.reset}  model: ${C.cyan}${MODEL}${C.reset}  concurrency: ${CONCURRENCY}\n`
  );

  if (EXPORT_DIR) return exportBatches();
  if (IMPORT_DIR) return importResults();

  // 1. Check Ollama
  if (!(await checkOllama())) {
    console.error(`${C.red}Ollama not reachable at ${OLLAMA_URL}${C.reset}`);
    console.error('Start it with: ollama serve');
    process.exit(1);
  }

  // 2. Load cache, 3–4. collect the files to (re-)validate
  const cache = loadCache();
  const { tasks, allFiles, cacheHits } = collectTasks(cache);

  console.log(
    `Files: ${allFiles.length} total, ${C.green}${cacheHits} cached${C.reset}, ${C.yellow}${tasks.length} to validate${C.reset}\n`
  );

  if (tasks.length === 0) {
    console.log(`${C.green}All up to date.${C.reset}\n`);
    saveCache(cache);
    return 0;
  }

  // 5. Validate
  let ok = 0,
    fail = 0,
    skip = 0;
  const failures = []; // verdict=fail
  const llmSkips = []; // verdict=skip WITH a reason from the LLM (not auto-skip)

  await pool(tasks, CONCURRENCY, async ({ relPath, seriesId, hash, exercises }, i) => {
    const fileResults = [];

    for (const ex of exercises) {
      const type = ex.data.type || 'number-check';
      const prompt = buildPrompt(ex);

      if (!prompt) {
        fileResults.push({ verdict: 'skip', reason: 'no prompt for type' });
        continue;
      }

      let verdict, reason, rawResponse;
      try {
        rawResponse = await askLLM(prompt);
        ({ verdict, reason } = parseVerdict(rawResponse));
      } catch (err) {
        verdict = 'skip';
        reason = err.message;
      }

      if (VERBOSE) {
        const icon =
          verdict === 'ok'
            ? `${C.green}✓ CORRECT${C.reset}`
            : verdict === 'fail'
              ? `${C.red}✗ INCORRECT${C.reset}`
              : `${C.grey}– SKIP${C.reset}`;
        console.log(`\n${C.bold}VERDICT:${C.reset} ${icon}${reason ? `  ${C.yellow}${reason}${C.reset}` : ''}`);
        console.log(`${C.bold}${'─'.repeat(60)}${C.reset}\n`);
      }

      const label = ex.generatorName ? `[gen:${ex.generatorName}] ` : '';
      fileResults.push({
        verdict,
        reason,
        rawResponse,
        type,
        title: (label + strip(ex.data.title || ex.body || '')).slice(0, 70),
      });
    }

    // Aggregate file verdict: fail if any fail, skip if all skip, ok otherwise
    const fileVerdict = fileResults.some((r) => r.verdict === 'fail')
      ? 'fail'
      : fileResults.every((r) => r.verdict === 'skip')
        ? 'skip'
        : 'ok';

    // Update cache — preserve other models' verdicts, only set this model's column
    const existing = cache.get(relPath);
    const cacheEntry =
      existing?.hash === hash ? existing : { seriesId, hash, manual: existing?.manual || '', models: new Map() };
    if (existing?.hash !== hash) cacheEntry.models.clear(); // file changed, stale verdicts gone
    cacheEntry.seriesId = seriesId;
    cacheEntry.models.set(MODEL, fileVerdict);
    cache.set(relPath, cacheEntry);

    // Count & report
    for (const r of fileResults) {
      if (r.verdict === 'ok') {
        ok++;
      } else if (r.verdict === 'fail') {
        fail++;
        failures.push({ relPath, ...r });
      } else {
        skip++;
        // LLM explicitly skipped with a reason (not a silent auto-skip or missing prompt)
        if (r.reason && r.reason !== 'no prompt for type') {
          llmSkips.push({ relPath, ...r });
        }
      }
    }

    const fileHasLlmSkip = fileResults.some(
      (r) => r.verdict === 'skip' && r.reason && r.reason !== 'no prompt for type'
    );
    const icon =
      fileVerdict === 'ok'
        ? `${C.green}✓${C.reset}`
        : fileVerdict === 'fail'
          ? `${C.red}✗${C.reset}`
          : fileHasLlmSkip
            ? `${C.yellow}–${C.reset}`
            : `${C.grey}–${C.reset}`;

    if (!FAILURES_ONLY || fileVerdict === 'fail' || fileHasLlmSkip) {
      process.stdout.write(`  ${icon}  ${relPath}\n`);
      for (const r of fileResults) {
        if (r.verdict === 'fail') {
          console.log(`     ${C.red}✗ [${r.type}] ${r.title}${C.reset}`);
          console.log(`       ${C.yellow}${r.reason}${C.reset}`);
        } else if (r.verdict === 'skip' && r.reason && r.reason !== 'no prompt for type') {
          console.log(`     ${C.yellow}– [${r.type}] ${r.title}${C.reset}`);
          console.log(`       ${C.grey}${r.reason}${C.reset}`);
        }
      }
    }

    // Save cache incrementally every 20 files
    if ((i + 1) % 20 === 0) saveCache(cache);
  });

  // 6. Save final cache
  saveCache(cache);

  // 7. Report
  const manualOkCount = [...cache.values()].filter((e) => e.manual === 'ok').length;
  console.log(`\n${'─'.repeat(60)}`);
  console.log(
    `${C.bold}Results:${C.reset}  ${C.green}${ok} correct${C.reset}  ${C.red}${fail} incorrect${C.reset}  ${C.grey}${skip} skipped${C.reset}${llmSkips.length ? `  ${C.yellow}${llmSkips.length} needs review${C.reset}` : ''}${manualOkCount ? `  ${C.yellow}${manualOkCount} manual ok${C.reset}` : ''}`
  );

  // Write error report (always, so the file reflects the current run)
  if (failures.length > 0 || llmSkips.length > 0) {
    const ts = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const lines = [
      `# LLM validation errors`,
      ``,
      `> Model: \`${MODEL}\` — Run: ${ts}${manualOkCount ? ` — ${manualOkCount} manual override(s) active` : ''}`,
      ``,
    ];

    // Group failures by file
    if (failures.length > 0) {
      lines.push(`## ✗ Incorrect answers (${failures.length})`);
      lines.push('');
      const byFile = new Map();
      for (const f of failures) {
        if (!byFile.has(f.relPath)) byFile.set(f.relPath, []);
        byFile.get(f.relPath).push(f);
      }
      for (const [relPath, items] of byFile) {
        lines.push(`### [${relPath}](../${relPath})`);
        lines.push('');
        for (const f of items) {
          lines.push(`- **[${f.type}]** ${f.title}`);
          if (f.reason) lines.push(`  - ${f.reason}`);
          if (f.rawResponse) {
            lines.push(`  <details><summary>Réponse brute du modèle</summary>`);
            lines.push('');
            lines.push('  ```');
            lines.push(...f.rawResponse.split('\n').map((l) => '  ' + l));
            lines.push('  ```');
            lines.push('');
            lines.push('  </details>');
          }
        }
        lines.push('');
      }
    }

    // Group llm-skips by file
    if (llmSkips.length > 0) {
      lines.push(`## – Needs review — skipped by LLM (${llmSkips.length})`);
      lines.push('');
      const byFile = new Map();
      for (const f of llmSkips) {
        if (!byFile.has(f.relPath)) byFile.set(f.relPath, []);
        byFile.get(f.relPath).push(f);
      }
      for (const [relPath, items] of byFile) {
        lines.push(`### [${relPath}](../${relPath})`);
        lines.push('');
        for (const f of items) {
          lines.push(`- **[${f.type}]** ${f.title}`);
          if (f.reason) lines.push(`  - ${f.reason}`);
          if (f.rawResponse) {
            lines.push(`  <details><summary>Réponse brute du modèle</summary>`);
            lines.push('');
            lines.push('  ```');
            lines.push(...f.rawResponse.split('\n').map((l) => '  ' + l));
            lines.push('  ```');
            lines.push('');
            lines.push('  </details>');
          }
        }
        lines.push('');
      }
    }

    fs.writeFileSync(ERRORS_PATH, lines.join('\n'));

    if (failures.length > 0) {
      console.log(`\n${C.red}${C.bold}Failures:${C.reset}`);
      for (const f of failures) {
        console.log(`  ${f.relPath}`);
        console.log(`    [${f.type}] ${f.title}`);
        console.log(`    ${C.yellow}${f.reason}${C.reset}`);
      }
    }
    if (llmSkips.length > 0) {
      console.log(`\n${C.yellow}${C.bold}Needs review (skipped by LLM):${C.reset}`);
      for (const f of llmSkips) {
        console.log(`  ${f.relPath}`);
        console.log(`    [${f.type}] ${f.title}`);
        console.log(`    ${C.grey}${f.reason}${C.reset}`);
      }
    }
    console.log(`\n${C.yellow}Error report: ${ERRORS_PATH}${C.reset}\n`);
    return 1;
  }

  // Only wipe the error file on a full unfiltered run — partial runs leave prior errors intact
  const isFullRun = !COUNT && !FILTER_DIR && !FILTER_TYPE;
  if (isFullRun && fs.existsSync(ERRORS_PATH)) fs.unlinkSync(ERRORS_PATH);

  console.log(`\n${C.green}${C.bold}All exercises verified.${C.reset}\n`);
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
