/**
 * adminReport.js — build-time enrichment data for the admin dashboard (devMode only).
 * Per-series human status, « MV » (machine verified) and review risk, from
 * scripts/lib/review-queue.js. Lists the series on disk, so renamed ids never linger.
 */
const path = require('path');
const { reviewRows } = require('../../scripts/lib/review-queue.js');

const ROOT = path.resolve(__dirname, '../..');
const MV_RANK = { fail: 0, pending: 1, skip: 2, partial: 3, ok: 4 };

module.exports = function () {
  return reviewRows().map((r) => {
    const h = r.human;
    const relPath = r.dir.replace(/^src\//, '');
    return {
      id: r.id,
      path: relPath,
      absPath: path.join(ROOT, 'src', relPath, 'index.yaml').replace(/\\/g, '/'),
      humanStatus: h.status,
      humanStale: h.stale,
      humanCoverage: `${h.validated}/${h.total}`,
      humanDate: h.validatedAt ? h.validatedAt.slice(0, 10) : '',
      mvStatus: r.mv.status,
      mvLabel: r.mv.label,
      mvTitle: r.mv.title,
      mvRank: MV_RANK[r.mv.status],
      risk: r.risk,
      riskReasons: r.reasons.map((x) => `+${x.points} ${x.why}`),
    };
  });
};
