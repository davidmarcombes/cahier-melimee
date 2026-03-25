/**
 * adminReport.js — build-time global data for the admin dashboard.
 * Reads exercises-report.csv, human-validate.csv and validate-llm-cache.csv,
 * joins them by seriesId and returns one enriched object per series.
 * Returns [] gracefully when any CSV is missing.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

function parseCSVRow(line) {
  const fields = [];
  let i = 0;
  while (i <= line.length) {
    if (i === line.length) { fields.push(''); break; }
    if (line[i] === '"') {
      i++;
      let field = '';
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else { field += line[i++]; }
      }
      fields.push(field);
      if (line[i] === ',') i++;
    } else {
      const end = line.indexOf(',', i);
      if (end === -1) { fields.push(line.slice(i)); break; }
      fields.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return fields;
}

function parseCSV(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf8').replace(/\r/g, '').split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVRow(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const vals = parseCSVRow(line);
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] || '').trim()]));
  });
}

module.exports = function () {
  const report = parseCSV(path.join(ROOT, 'reports/exercises-report.csv'));
  const humanRows = parseCSV(path.join(ROOT, 'reports/human-validate.csv'));
  const llmRows = parseCSV(path.join(ROOT, 'reports/validate-llm-cache.csv'));

  // Aggregate human validations by seriesId
  const human = {};
  for (const row of humanRows) {
    if (!row.seriesId) continue;
    if (!human[row.seriesId]) human[row.seriesId] = { total: 0, validated: 0, latestDate: '' };
    human[row.seriesId].total++;
    if (row.validatedAt) {
      human[row.seriesId].validated++;
      if (row.validatedAt > human[row.seriesId].latestDate)
        human[row.seriesId].latestDate = row.validatedAt;
    }
  }

  // Aggregate LLM results by seriesId (detect model column dynamically)
  const llm = {};
  const llmMeta = llmRows[0] ? Object.keys(llmRows[0]).filter((k) => !['path','seriesId','hash','manual'].includes(k)) : [];
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

  return report.map((row) => {
    const h = human[row.id] || null;
    const l = llm[row.id] || null;

    const humanStatus = !h
      ? 'pending'
      : h.validated === h.total && h.total > 0
      ? 'ok'
      : h.validated > 0
      ? 'partial'
      : 'pending';

    const llmStatus = !l || l.total === 0
      ? 'pending'
      : l.fail > 0
      ? 'fail'
      : l.ok > 0
      ? 'ok'
      : 'skip';

    const relPath = row.path || '';
    const absPath = relPath
      ? path.join(ROOT, 'src', relPath, 'index.yaml').replace(/\\/g, '/')
      : '';

    return {
      kind:         row.kind       || '',
      path:         relPath,
      absPath,
      id:           row.id         || '',
      seriesTitle:  row.seriesTitle || '',
      level:        row.level      || '',
      topic:        row.topic      || '',
      subtopic:     row.subtopic   || '',
      difficulty:   row.difficulty || '',
      exerciseCount: parseInt(row.exerciseCount) || 0,
      repeatTotal:  parseInt(row.repeatTotal)  || 0,
      types:        row.types      || '',
      generators:   row.generators || '',
      classes:      row.classes    || '',
      humanStatus,
      humanCoverage: h ? `${h.validated}/${h.total}` : '—',
      humanDate:     h && h.latestDate ? h.latestDate.slice(0, 10) : '',
      llmStatus,
      llmCoverage:   l && l.total ? `${l.ok}/${l.total}` : '—',
      llmModels:     llmMeta.join(', '),
    };
  });
};
