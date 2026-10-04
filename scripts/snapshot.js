#!/usr/bin/env node
/**
 * snapshot.js — take a checkpoint of the site as it is now (committed or not), to compare against later
 * with `npm run regress`. A human or an agent picks the moment: before a refactor, at the start of a
 * session, before a release…
 *
 *   npm run snapshot                 checkpoint named <date>-<commit>[-wip]
 *   npm run snapshot -- avant-svg    checkpoint with that name (replaces an older one of the same name)
 *   npm run snapshot -- --shots      also screenshot every page now (light + dark, each exercise; ~3 min)
 *   npm run snapshot -- --list       checkpoints on disk
 *   npm run snapshot -- --delete <name>
 *
 * Stored in .snapshots/<name>/ (git-ignored): site/ (built site, ~14 MB), manifest.json, shots/.
 * Without --shots, `regress` screenshots the checkpoint's own copy of the site when it needs to:
 * same files, seeded randomness — the same pixels as if taken now.
 */
const fs = require('fs');
const path = require('path');
const {
  buildSite,
  capturePage,
  gitState,
  listPages,
  listSnapshots,
  makeManifest,
  serve,
  snapshotPath,
} = require('./lib/snapshot.js');

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const positional = args.filter((a) => !a.startsWith('--'));

async function main() {
  if (flag('--list')) {
    const snaps = listSnapshots();
    if (!snaps.length) return console.log('No checkpoint yet: npm run snapshot -- <name>');
    for (const s of snaps) {
      const shots = fs.existsSync(path.join(snapshotPath(s.name), 'shots'));
      console.log(
        `${s.name.padEnd(28)} ${s.createdAt.slice(0, 16).replace('T', ' ')}  ${s.git.sha}${s.git.dirty ? ` +${s.git.changed} uncommitted` : ''}  ${Object.keys(s.pages).length} pages${shots ? '  (shots)' : ''}`
      );
    }
    return;
  }
  if (flag('--delete')) {
    const name = positional[0];
    if (!name || !fs.existsSync(path.join(snapshotPath(name), 'manifest.json')))
      throw new Error(`no checkpoint "${name}"`);
    fs.rmSync(snapshotPath(name), { recursive: true, force: true });
    return console.log(`Deleted ${name}`);
  }

  const g = gitState();
  const name =
    positional[0] ||
    `${new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-')}-${g.sha}${g.dirty ? '-wip' : ''}`;
  if (!/^[\w.-]+$/.test(name) || name.startsWith('_'))
    throw new Error(`invalid name "${name}" (letters, digits, . - _ ; not starting with _)`);
  const dir = snapshotPath(name);
  const t0 = Date.now();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`Building the site into .snapshots/${name}/site …`);
  buildSite(path.join(dir, 'site'));
  const manifest = makeManifest(name, path.join(dir, 'site'));
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 1));
  console.log(
    `Checkpoint « ${name} »: ${Object.keys(manifest.pages).length} pages, commit ${g.sha}${g.dirty ? ` + ${g.changed} uncommitted change(s)` : ''} (${Math.round((Date.now() - t0) / 1000)} s)`
  );

  if (flag('--shots')) {
    const { chromium } = require('@playwright/test');
    const server = await serve(path.join(dir, 'site'));
    const browser = await chromium.launch();
    const pages = listPages(path.join(dir, 'site'));
    let done = 0;
    const queue = [...pages];
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        for (let p; (p = queue.shift()); ) {
          await capturePage(browser, server.url, p, path.join(dir, 'shots')).catch((e) =>
            console.error(`  ${p.label}: ${e.message}`)
          );
          if (++done % 50 === 0) console.log(`  ${done}/${pages.length} pages captured`);
        }
      })
    );
    await browser.close();
    server.close();
    console.log(`Screenshots: .snapshots/${name}/shots/ (${Math.round((Date.now() - t0) / 1000)} s in total)`);
  }
  console.log(`Compare later with: npm run regress -- ${name}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
