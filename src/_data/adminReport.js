/**
 * adminReport.js — build-time enrichment data for the admin dashboard (devMode only).
 * Reads human-validate.csv and validate-llm-cache.csv and returns per-series status.
 * Lists the series on disk (scripts/lib/human-validation.js listSeries), so renamed ids never linger.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

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

const { status: humanValidationStatus, listSeries } = require('../../scripts/lib/human-validation.js');

module.exports = function () {
  // Human status (ok / stale / partial / pending) from the shared module — fingerprints included
  const humanStatus = Object.fromEntries(humanValidationStatus().map((x) => [x.id, x]));
  const llmRows = parseCSV(path.join(ROOT, 'reports/validate-llm-cache.csv'));

  // Aggregate LLM results by seriesId
  const llm = {};
  const llmMeta = llmRows[0]
    ? Object.keys(llmRows[0]).filter((k) => !['path', 'seriesId', 'hash', 'manual'].includes(k))
    : [];
  for (const row of llmRows) {
    if (!row.seriesId) continue;
    if (!llm[row.seriesId]) llm[row.seriesId] = { ok: 0, fail: 0, skip: 0, total: 0, models: new Set() };
    // A human decision (manual=ok, after a check of an LLM failure) overrides the models' verdicts
    if (row.manual === 'ok') {
      llm[row.seriesId].total++;
      llm[row.seriesId].ok++;
      continue;
    }
    for (const col of llmMeta) {
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

  // Answer oracle coverage per series (written by scripts/check-answers.js on every check / build)
  let oracle = {};
  try {
    oracle = JSON.parse(fs.readFileSync(path.join(ROOT, 'reports/oracle-coverage.json'), 'utf8'));
  } catch {
    /* no build yet */
  }

  // « MV » — machine verified: which machines checked the series' answers
  //   sources: LLM models with an ok verdict (Haiku…) and/or the oracle (all exercises, or n/m)
  //   status: fail (an LLM failure not overridden by a human) · ok · partial (oracle n/m only)
  //           · skip (nothing a machine can check: visual) · pending
  const MODEL_NAMES = { 'claude-haiku-4-5': 'Haiku', 'deepseek-r1:1.5b': 'DeepSeek', 'qwen2.5:7b': 'Qwen' };
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
    if (l && l.fail > 0) return { status: 'fail', label: '✗ LLM', title: `${l.fail} échec(s) LLM à vérifier` };
    const status =
      solver || (l && l.ok > 0) || full
        ? 'ok'
        : o && o.verified > 0
          ? 'partial'
          : l && l.total > 0
            ? 'skip'
            : 'pending';
    return { status, label: [...new Set(sources)].join(', '), title: details.join(' · ') };
  }
  const MV_RANK = { fail: 0, pending: 1, skip: 2, partial: 3, ok: 4 };

  // Puzzles are proven by the e2e solvability test (tests/e2e/solve.spec.js, run by npm run check):
  // mazes / numberlinks are solved by search, kenken / futoshiki solutions are accepted by the
  // game's rule checks (rows, columns, cages, inequalities) — not compared to a stored answer
  const SOLVER_TYPES = new Set(['maze', 'numberlink', 'kenken', 'futoshiki']);
  const solverSeries = new Set();
  for (const s of listSeries()) {
    const types = s.files.flatMap((f) =>
      fs
        .readFileSync(f, 'utf8')
        .split(/^---\s*$/m)
        .filter((_, i) => i % 2 === 1)
        .map((b) => (b.match(/^type:\s*["']?([a-z-]+)/m) || [])[1])
        .filter(Boolean)
    );
    if (types.length && types.every((t) => SOLVER_TYPES.has(t))) solverSeries.add(s.id);
  }

  // id -> path from the series on disk. Not from reports/exercises-report.csv: that file is only
  // regenerated by hand, and its old ids (renamed by generate:ids) showed up as ghost « pending » rows
  const pathMap = {};
  for (const s of listSeries()) pathMap[s.id] = s.dirRel.replace(/^src\//, '');

  // One entry per series that exists now (LLM cache rows of renamed / deleted series are dropped)
  const ids = new Set(Object.keys(pathMap));

  return [...ids].map((id) => {
    const h = humanStatus[id] || null;
    const l = llm[id] || null;
    const relPath = pathMap[id] || '';
    const absPath = relPath ? path.join(ROOT, 'src', relPath, 'index.yaml').replace(/\\/g, '/') : '';
    const mv = machineVerified(l, oracle[id], solverSeries.has(id));
    return {
      id,
      path: relPath,
      absPath,
      humanStatus: h ? h.status : 'pending',
      humanStale: h ? h.stale : [],
      humanCoverage: h ? `${h.validated}/${h.total}` : '—',
      humanDate: h && h.validatedAt ? h.validatedAt.slice(0, 10) : '',
      mvStatus: mv.status,
      mvLabel: mv.label,
      mvTitle: mv.title,
      mvRank: MV_RANK[mv.status],
    };
  });
};
