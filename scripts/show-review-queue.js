#!/usr/bin/env node
/**
 * show-review-queue.js — the series a human should play next, riskiest first, with the reasons
 * (scripts/lib/review-queue.js — same order as « → Suivante non validée » and /admin/).
 *
 * Usage:
 *   node scripts/show-review-queue.js           # top 20
 *   node scripts/show-review-queue.js --top 50
 *   node scripts/show-review-queue.js --why     # one line per reason
 */
'use strict';

const { riskQueue } = require('./lib/review-queue.js');

const args = process.argv.slice(2);
const topArg = args.indexOf('--top');
const top = topArg !== -1 ? parseInt(args[topArg + 1], 10) || 20 : 20;
const why = args.includes('--why');

const C = { bold: '\x1b[1m', dim: '\x1b[2m', yellow: '\x1b[33m', reset: '\x1b[0m' };
const port = process.env.PORT || 8080;

const queue = riskQueue();
console.log(
  `${C.bold}${queue.length} series to check${C.reset} ${C.dim}(showing ${Math.min(top, queue.length)})${C.reset}\n`
);
for (const r of queue.slice(0, top)) {
  const level = r.dir.split('/')[3] || '';
  console.log(
    `${C.yellow}${String(r.risk).padStart(3)}${C.reset}  ${r.id}  ${level.toUpperCase().padEnd(4)} ${r.title}  ${C.dim}http://localhost:${port}${r.url}${C.reset}`
  );
  if (why) for (const x of r.reasons) console.log(`${C.dim}       +${x.points} ${x.why}${C.reset}`);
}
