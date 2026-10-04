#!/usr/bin/env node
/**
 * unvalidate.js — withdraw a human validation, at any time (the dashboard's « Annuler » only lasts 5 s).
 * The series goes back to « ○ à faire » and a flag records why, so it shows in /admin/ « À vérifier ».
 *
 *   npm run unvalidate -- <series id | URL> "<why>"
 *
 * Not needed when the content is fixed: an edited file already turns its series « ↻ à revérifier ».
 */
const { resolveTarget, readValidations, unvalidateSeries, addFlag } = require('./lib/human-validation.js');

const [target, ...why] = process.argv.slice(2);
try {
  if (!target || !why.length) throw new Error('usage: npm run unvalidate -- <series id | URL> "<why>"');
  const { series } = resolveTarget(target);
  const rows = [...readValidations().values()].filter((r) => r.seriesId === series.id && r.validatedAt);
  if (!rows.length) throw new Error(`${series.id} « ${series.title} » is not validated — nothing to withdraw`);
  const last = rows
    .map((r) => r.validatedAt)
    .sort()
    .pop();
  unvalidateSeries(series.id); // no `previous`: every file of the series goes back to pending
  const f = addFlag(target, `Dévalidée : ${why.join(' ')}`, 'human');
  console.log(
    `Unvalidated ${series.id} « ${series.title} » (validated ${String(last).slice(0, 10)}, ${rows.length} file(s))`
  );
  console.log(`Flagged ${f.id}: http://localhost:8080${f.url} — ${f.reason}`);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
