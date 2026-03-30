const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIRS_TO_SCAN = [
  path.resolve(__dirname, '../src/fr/exercices'),
  path.resolve(__dirname, '../src/fr/applications'),
  path.resolve(__dirname, '../src/fr/defis'),
];
// id → [paths that use it]
const idMap = new Map();

function existingIds() {
  return new Set(idMap.keys());
}

/**
 * Generates a unique 8-character hex ID.
 * Checks against idMap to prevent collisions.
 */
function generateUniqueId(folderName) {
  let newId;
  while (true) {
    const seed = `${folderName}-${process.hrtime.bigint()}-${Math.random()}`;
    newId = crypto.createHash('md5').update(seed).digest('hex').slice(0, 8);
    if (!idMap.has(newId) && /^[a-f]/.test(newId)) break;
  }
  idMap.set(newId, []);
  return newId;
}

/**
 * Recursively finds all index.yaml files under a directory.
 */
function findIndexYamls(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      results.push(...findIndexYamls(path.join(dir, entry.name)));
    } else if (entry.name === 'index.yaml') {
      results.push(path.join(dir, entry.name));
    }
  }
  return results;
}

function run() {
  const yamlPaths = DIRS_TO_SCAN.flatMap((d) => findIndexYamls(d));

  if (yamlPaths.length === 0) {
    console.error('No index.yaml files found in:', DIRS_TO_SCAN.join(', '));
    return;
  }

  const ROOT = path.resolve(__dirname, '..');

  // --- PASS 1: Collect existing IDs, tracking every path per id ---
  const quoted = []; // paths where id is quoted
  for (const yamlPath of yamlPaths) {
    const content = fs.readFileSync(yamlPath, 'utf8');
    const raw = content.match(/^id:\s*(.+)/m);
    if (!raw) continue;
    const value = raw[1].replace(/\r$/, '').trim();
    const isQuoted = /^["']/.test(value);
    const id = value.replace(/^["']|["']$/g, '').trim();
    if (!idMap.has(id)) idMap.set(id, []);
    idMap.get(id).push(path.relative(ROOT, path.dirname(yamlPath)));
    if (isQuoted) quoted.push(path.relative(ROOT, path.dirname(yamlPath)));
  }

  // --- Flag quoted IDs ---
  if (quoted.length) {
    console.error(`\n⚠️  Quoted IDs (should be bare scalars) (${quoted.length}):`);
    for (const p of quoted) console.error(`  • ${p}`);
    console.error('');
  }

  // --- Flag IDs that don't start with a letter (digit-leading IDs can be parsed as numbers by YAML) ---
  const HEX8 = /^[a-f][0-9a-f]{7}$/;
  const nonHex = [...idMap.entries()]
    .filter(([id]) => !HEX8.test(id))
    .flatMap(([id, paths]) => paths.map((p) => ({ id, path: p })));
  if (nonHex.length) {
    console.error(`\n⚠️  Non-hex IDs (must be 8 lowercase hex chars) (${nonHex.length}):`);
    for (const { id, path: p } of nonHex) console.error(`  • ${p}  →  id: ${id}`);
    console.error('  Run npm run generate:ids to replace them.\n');
  }

  // --- Flag duplicates ---
  const duplicates = [...idMap.entries()].filter(([, paths]) => paths.length > 1);
  if (duplicates.length) {
    console.error(`\n⚠️  Duplicate IDs found (${duplicates.length}):`);
    for (const [id, paths] of duplicates) {
      console.error(`  ${id}`);
      for (const p of paths) console.error(`    • ${p}`);
    }
    console.error('');
  }

  // --- PASS 2: Assign missing IDs and replace non-compliant ones ---
  const preExistingCount = idMap.size;
  let assignedCount = 0;
  let replacedCount = 0;
  for (const yamlPath of yamlPaths) {
    const folderPath = path.dirname(yamlPath);
    const folderName = path.basename(folderPath);
    const content = fs.readFileSync(yamlPath, 'utf8');

    if (!content.match(/^id:/m)) {
      const newId = generateUniqueId(folderName);
      fs.writeFileSync(yamlPath, `id: ${newId}\n` + content, 'utf8');
      console.log(`✅ Assigned id: ${newId} to: ${path.relative(ROOT, folderPath)}`);
      assignedCount++;
    } else {
      const raw = content.match(/^id:\s*(.+)/m);
      if (raw) {
        const value = raw[1].replace(/\r$/, '').trim();
        const isQuoted = /^["']/.test(value);
        const id = value.replace(/^["']|["']$/g, '').trim();
        if (!HEX8.test(id)) {
          const newId = generateUniqueId(folderName);
          const fixed = content.replace(/^id:\s*.+$/m, `id: ${newId}`);
          fs.writeFileSync(yamlPath, fixed, 'utf8');
          const paths = idMap.get(id) || [];
          idMap.delete(id);
          idMap.set(newId, paths);
          console.log(`✅ Replaced id: ${id} → ${newId} in: ${path.relative(ROOT, folderPath)}`);
          replacedCount++;
        } else if (isQuoted) {
          const fixed = content.replace(/^id:\s*.+$/m, `id: ${id}`);
          fs.writeFileSync(yamlPath, fixed, 'utf8');
          console.log(`✅ Unquoted id: ${id} in: ${path.relative(ROOT, folderPath)}`);
        }
      }
    }
  }

  console.log(`\nScan complete.`);
  console.log(`- Pre-existing IDs found:    ${preExistingCount}`);
  console.log(`- Quoted IDs detected:       ${quoted.length}`);
  console.log(`- Non-hex IDs detected:      ${nonHex.length}`);
  console.log(`- Duplicates detected:       ${duplicates.length}`);
  console.log(`- New IDs assigned this run: ${assignedCount}`);
  console.log(`- Non-compliant IDs replaced: ${replacedCount}`);
  console.log(`- Total unique IDs in system: ${idMap.size}`);

  if (quoted.length || nonHex.length || duplicates.length) process.exit(1);
}

run();
