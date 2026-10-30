/**
 * Review queue — which series a human should play next, riskiest first.
 * Shared by the admin dashboard (src/_data/adminReport.js), the dev API
 * (/api/human-next-unvalidated) and `npm run queue:human`.
 *
 * MACHINE VERIFIED (« MV » column): which machines checked a series' answers — LLM verdicts
 * (reports/validate-llm-cache.csv), the answer oracle (reports/oracle-coverage.json, written by
 * scripts/check-answers.js) and the e2e puzzle solver.
 *
 * RISK: points for what makes an unvalidated series likely to hide an error a human would catch.
 * Every point comes with its reason, so the dashboard can say why a series is high in the queue.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { listSeries, readFlags, status } = require('./human-validation.js');

const ROOT = path.join(__dirname, '..', '..');

function parseCSVRow(line) {
  const fields = [];
  let i = 0;
  while (i <= line.length) {
    if (i === line.length) {
      fields.push('');
      break;
    }
    if (line[i] === '"') {
      i++;
      let field = '';
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          field += '"';
          i += 2;
        } else if (line[i] === '"') {
          i++;
          break;
        } else {
          field += line[i++];
        }
      }
      fields.push(field);
      if (line[i] === ',') i++;
    } else {
      const end = line.indexOf(',', i);
      if (end === -1) {
        fields.push(line.slice(i));
        break;
      }
      fields.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return fields;
}

function parseCSV(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs
    .readFileSync(filePath, 'utf8')
    .replace(/\r/g, '')
    .split('\n')
    .filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVRow(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const vals = parseCSVRow(line);
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] || '').trim()]));
  });
}

// LLM verdicts aggregated by seriesId: { ok, fail, skip, total, models: Set }
function llmBySeries() {
  const rows = parseCSV(path.join(ROOT, 'reports/validate-llm-cache.csv'));
  const llm = {};
  const models = rows[0] ? Object.keys(rows[0]).filter((k) => !['path', 'seriesId', 'hash', 'manual'].includes(k)) : [];
  for (const row of rows) {
    if (!row.seriesId) continue;
    if (!llm[row.seriesId]) llm[row.seriesId] = { ok: 0, fail: 0, skip: 0, total: 0, models: new Set() };
    // A human decision (manual=ok, after a check of an LLM failure) overrides the models' verdicts
    if (row.manual === 'ok') {
      llm[row.seriesId].total++;
      llm[row.seriesId].ok++;
      continue;
    }
    for (const col of models) {
      const v = row[col];
      if (!v) continue;
      llm[row.seriesId].total++;
      if (v === 'ok') {
        llm[row.seriesId].ok++;
        llm[row.seriesId].models.add(col);
      } else if (v === 'fail') llm[row.seriesId].fail++;
      else if (v === 'skip') llm[row.seriesId].skip++;
    }
  }
  return llm;
}

function oracleCoverage() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'reports/oracle-coverage.json'), 'utf8'));
  } catch {
    return {}; // no build yet
  }
}

// Exercise types of a series and whether any file is generated
function seriesContent(s) {
  const types = [];
  let generated = false;
  for (const f of s.files) {
    const blocks = fs
      .readFileSync(f, 'utf8')
      .split(/^---\s*$/m)
      .filter((_, i) => i % 2 === 1);
    for (const b of blocks) {
      const t = (b.match(/^type:\s*["']?([a-z-]+)/m) || [])[1];
      if (t) types.push(t);
      if (/^generator:/m.test(b)) generated = true;
    }
  }
  return { types, generated };
}

// Puzzles are proven by the e2e solvability test (tests/e2e/solve.spec.js, run by npm run check):
// mazes / numberlinks are solved by search, kenken / futoshiki solutions are accepted by the
// game's rule checks (rows, columns, cages, inequalities) — not compared to a stored answer
const SOLVER_TYPES = new Set(['maze', 'numberlink', 'kenken', 'futoshiki']);

const MODEL_NAMES = { 'claude-haiku-4-5': 'Haiku', 'deepseek-r1:1.5b': 'DeepSeek', 'qwen2.5:7b': 'Qwen' };

//   sources: LLM models with an ok verdict (Haiku…) and/or the oracle (all exercises, or n/m)
//   status: fail (an LLM failure not overridden by a human) · ok · partial (oracle n/m only)
//           · skip (nothing a machine can check: visual) · pending
//   oracleFull / solver: which machines, for the risk score
function machineVerified(l, o, solver) {
  const sources = [];
  const details = [];
  if (solver) {
    sources.push('Solveur');
    details.push('Solveur : puzzle résolu par le test e2e (solve.spec)');
  }
  if (l && l.ok > 0) {
    sources.push(...[...l.models].map((m) => MODEL_NAMES[m] || m));
    details.push(`LLM : ${l.ok} fichier(s) ok${l.skip ? `, ${l.skip} non vérifiable(s)` : ''}`);
  }
  const full = o && o.total > 0 && o.verified === o.total;
  if (o && o.verified > 0) {
    sources.push(full ? 'Oracle' : `Oracle ${o.verified}/${o.total}`);
    details.push(`Oracle : ${o.verified}/${o.total} exercice(s) recalculé(s)`);
  }
  const which = { oracleFull: Boolean(full), solver: Boolean(solver) };
  if (l && l.fail > 0) return { status: 'fail', label: '✗ LLM', title: `${l.fail} échec(s) LLM à vérifier`, ...which };
  const st =
    solver || (l && l.ok > 0) || full ? 'ok' : o && o.verified > 0 ? 'partial' : l && l.total > 0 ? 'skip' : 'pending';
  return { status: st, label: [...new Set(sources)].join(', '), title: details.join(' · '), ...which };
}

// Series files added or edited lately: added in the last 14 days (or untracked) · edited, not committed
function gitActivity() {
  const run = (args) => {
    try {
      return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      return ''; // no git: no recency signal
    }
  };
  const added = new Set(
    run(['log', '--since=14.days', '--diff-filter=A', '--name-only', '--format=', '--', 'src/fr']).split('\n')
  );
  const edited = new Set();
  for (const line of run(['status', '--porcelain', '--untracked-files=all', '--', 'src/fr']).split('\n')) {
    const p = line.slice(3).trim();
    if (!p) continue;
    if (line.startsWith('??')) added.add(p);
    else edited.add(p);
  }
  return { added, edited };
}

// Points per signal. A stale series (validated, changed since) and an open flag outrank the rest:
// a human already said something about them.
const RISK = {
  stale: 100,
  flagged: 50,
  llmFail: 40,
  noMachine: 30,
  visual: 25,
  notRecomputed: 15, // no answer recomputed by the oracle; less when it recomputes part of them
  newSeries: 15,
  edited: 10,
  handWritten: 10,
  typeHistory: 20, // at most, for the type with the most flags per series
};

// Everything the dashboard and the queue need, per series on disk:
// [{ id, title, url, dir, human (status()), mv (machineVerified()), risk, reasons: [{ points, why }] }]
function reviewRows() {
  const series = listSeries();
  const human = Object.fromEntries(status().map((h) => [h.id, h]));
  const llm = llmBySeries();
  const oracle = oracleCoverage();
  const flags = readFlags();
  const git = gitActivity();
  const content = Object.fromEntries(series.map((s) => [s.id, seriesContent(s)]));

  // Types where errors were already found: flags per series, by main type. Not the « [MV] Visuel »
  // markers (source mv): they say no machine can check, not that something was wrong.
  const mainType = (id) => content[id].types[0] || '';
  const seriesPerType = {};
  for (const s of series) seriesPerType[mainType(s.id)] = (seriesPerType[mainType(s.id)] || 0) + 1;
  const flagsPerType = {};
  const known = new Set(series.map((s) => s.id));
  for (const f of flags)
    if (f.source !== 'mv' && known.has(f.seriesId))
      flagsPerType[mainType(f.seriesId)] = (flagsPerType[mainType(f.seriesId)] || 0) + 1;
  const maxRate = Math.max(1e-9, ...Object.keys(flagsPerType).map((t) => flagsPerType[t] / seriesPerType[t]));

  return series.map((s) => {
    const h = human[s.id];
    const { types, generated } = content[s.id];
    const solver = types.length > 0 && types.every((t) => SOLVER_TYPES.has(t));
    const o = oracle[s.id];
    const mv = machineVerified(llm[s.id], o, solver);
    const open = flags.filter((f) => f.seriesId === s.id && !f.resolvedAt).length;
    const rels = s.files.map((f) => path.relative(ROOT, f).split(path.sep).join('/'));
    const reasons = [];
    const add = (points, why) => points > 0 && reasons.push({ points, why });

    if (h.status === 'stale') add(RISK.stale, `modifiée depuis ta validation (${h.stale.join(', ')})`);
    if (open) add(RISK.flagged, `${open} signalement(s) ouvert(s)`);
    if (h.status !== 'ok') {
      if (mv.status === 'fail') add(RISK.llmFail, 'un LLM y a trouvé une erreur');
      else if (mv.status === 'pending') add(RISK.noMachine, 'aucune machine ne l’a vérifiée');
      else if (mv.status === 'skip') add(RISK.visual, 'visuel : aucune machine ne peut la vérifier');
      // An LLM only reads the text and the figure's parameters; the oracle recomputes the answers
      else if (!mv.solver && !mv.oracleFull) {
        const done = o && o.total ? o.verified / o.total : 0;
        add(
          Math.round(RISK.notRecomputed * (1 - done)),
          done ? `oracle sur ${o.verified}/${o.total} exercices seulement` : 'aucune réponse recalculée (LLM seulement)'
        );
      }
      if (rels.some((p) => git.added.has(p))) add(RISK.newSeries, 'nouvelle (moins de 14 jours)');
      else if (rels.some((p) => git.edited.has(p))) add(RISK.edited, 'modifiée, non commitée');
      if (!generated) add(RISK.handWritten, 'écrite à la main');
      const t = mainType(s.id);
      const n = flagsPerType[t] || 0;
      if (n)
        add(
          Math.round((RISK.typeHistory * n) / seriesPerType[t] / maxRate),
          `type ${t} : ${n} signalement(s) pour ${seriesPerType[t]} série(s)`
        );
    }
    return {
      id: s.id,
      title: s.title,
      url: h.url,
      dir: s.dirRel,
      human: h,
      mv,
      risk: reasons.reduce((a, r) => a + r.points, 0),
      reasons,
    };
  });
}

// Series still to check (not ok, or flagged), riskiest first
function riskQueue(rows = reviewRows()) {
  return rows
    .filter((r) => r.human.status !== 'ok' || r.reasons.length)
    .sort((a, b) => b.risk - a.risk || a.dir.localeCompare(b.dir));
}

module.exports = { reviewRows, riskQueue };
