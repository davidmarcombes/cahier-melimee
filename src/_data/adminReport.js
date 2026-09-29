/**
 * adminReport.js — build-time enrichment data for the admin dashboard (devMode only).
 * Reads human-validate.csv and validate-llm-cache.csv and returns per-series status.
 * Returns [] gracefully when files are missing (prod has no report CSVs).
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

const { status: humanValidationStatus } = require('../../scripts/lib/human-validation.js');

module.exports = function () {
  // Human status (ok / stale / partial / pending) from the shared module — fingerprints included
  const humanStatus = Object.fromEntries(humanValidationStatus().map((x) => [x.id, x]));
  const llmRows = parseCSV(path.join(ROOT, 'reports/validate-llm-cache.csv'));
  const reportRows = parseCSV(path.join(ROOT, 'reports/exercises-report.csv'));

  if (!llmRows.length && !reportRows.length) return [];

  // Aggregate LLM results by seriesId
  const llm = {};
  const llmMeta = llmRows[0]
    ? Object.keys(llmRows[0]).filter((k) => !['path', 'seriesId', 'hash', 'manual'].includes(k))
    : [];
  for (const row of llmRows) {
    if (!row.seriesId) continue;
    if (!llm[row.seriesId]) llm[row.seriesId] = { ok: 0, fail: 0, skip: 0, total: 0 };
    for (const col of llmMeta) {
      const v = row[col];
      if (!v) continue;
      llm[row.seriesId].total++;
      if (v === 'ok') llm[row.seriesId].ok++;
      else if (v === 'fail') llm[row.seriesId].fail++;
      else if (v === 'skip') llm[row.seriesId].skip++;
    }
  }

  // Build id -> path map from exercises-report if available
  const pathMap = {};
  for (const row of reportRows) {
    if (row.id && row.path) pathMap[row.id] = row.path;
  }

  // Return one entry per unique id seen across all sources
  const ids = new Set(
    [...Object.keys(humanStatus), ...llmRows.map((r) => r.seriesId), ...Object.keys(pathMap)].filter(Boolean)
  );

  return [...ids].map((id) => {
    const h = humanStatus[id] || null;
    const l = llm[id] || null;
    const relPath = pathMap[id] || '';
    const absPath = relPath ? path.join(ROOT, 'src', relPath, 'index.yaml').replace(/\\/g, '/') : '';
    const llmStatus = !l || l.total === 0 ? 'pending' : l.fail > 0 ? 'fail' : l.ok > 0 ? 'ok' : 'skip';
    return {
      id,
      path: relPath,
      absPath,
      humanStatus: h ? h.status : 'pending',
      humanStale: h ? h.stale : [],
      humanCoverage: h ? `${h.validated}/${h.total}` : '—',
      humanDate: h && h.validatedAt ? h.validatedAt.slice(0, 10) : '',
      llmStatus,
    };
  });
};
