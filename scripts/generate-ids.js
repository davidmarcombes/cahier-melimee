const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIRS_TO_SCAN = [
  path.resolve(__dirname, '../src/fr/exercices'),
  path.resolve(__dirname, '../src/fr/applications'),
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
    if (!idMap.has(newId)) break;
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
    const value = raw[1].trim();
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

  // --- PASS 2: Assign missing IDs ---
  const preExistingCount = idMap.size;
  let assignedCount = 0;
  for (const yamlPath of yamlPaths) {
    const folderPath = path.dirname(yamlPath);
    const folderName = path.basename(folderPath);
    const content = fs.readFileSync(yamlPath, 'utf8');

    if (!content.match(/^id:/m)) {
      const newId = generateUniqueId(folderName);
      fs.writeFileSync(yamlPath, `id: ${newId}\n` + content, 'utf8');
      console.log(`✅ Assigned id: ${newId} to: ${path.relative(ROOT, folderPath)}`);
      assignedCount++;
    }
  }

  console.log(`\nScan complete.`);
  console.log(`- Pre-existing IDs found:    ${preExistingCount}`);
  console.log(`- Quoted IDs detected:       ${quoted.length}`);
  console.log(`- Duplicates detected:       ${duplicates.length}`);
  console.log(`- New IDs assigned this run: ${assignedCount}`);
  console.log(`- Total unique IDs in system: ${idMap.size}`);
}

run();
