#!/usr/bin/env node
/**
 * flag.js — ask a human to look at something. Flags appear in /admin/ (« À vérifier » column, dev
 * server) with a link; the human clicks « Fait ✓ », or validating the series resolves them.
 *
 *   npm run flag -- <series id | URL | /fr/…/id/#n> "<what to check>"   add (source: claude)
 *   npm run flag -- --source=llm <target> "<reason>"                      add with another source
 *   npm run flag -- --list                                                 open flags
 *   npm run flag -- --resolve <flag id>                                    close one
 */
const { addFlag, readFlags, setFlag } = require('./lib/human-validation.js');

const args = process.argv.slice(2);
const source = (args.find((a) => a.startsWith('--source=')) || '--source=claude').slice(9);
const rest = args.filter((a) => !a.startsWith('--source='));

try {
  if (rest[0] === '--list' || !rest.length) {
    const open = readFlags().filter((f) => !f.resolvedAt);
    if (!open.length) console.log('No open flag.');
    for (const f of open) console.log(`${f.id}  http://localhost:8080${f.url}  ${f.reason}  (${f.source})`);
  } else if (rest[0] === '--resolve') {
    const f = setFlag(rest[1], 'resolve');
    console.log(`Resolved ${f.id}: ${f.reason}`);
  } else {
    if (rest.length < 2) throw new Error('usage: npm run flag -- <series id | URL> "<what to check>"');
    const f = addFlag(rest[0], rest.slice(1).join(' '), source);
    console.log(`Flagged ${f.id}: http://localhost:8080${f.url} — ${f.reason}`);
  }
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
