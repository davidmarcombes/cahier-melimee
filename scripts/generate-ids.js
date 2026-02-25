const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIRS_TO_SCAN = [
    path.resolve(__dirname, '../src/fr/exercices'),
    path.resolve(__dirname, '../src/fr/applications')
];
const existingIds = new Set();

/**
 * Generates a unique 8-character hex ID.
 * Checks against the existingIds set to prevent collisions.
 */
function generateUniqueId(folderName) {
    let newId;
    let isUnique = false;

    while (!isUnique) {
        // High-res timer + random ensures the seed is never the same twice
        const seed = `${folderName}-${process.hrtime.bigint()}-${Math.random()}`;
        newId = crypto.createHash('md5').update(seed).digest('hex').slice(0, 8);

        if (!existingIds.has(newId)) {
            isUnique = true;
            existingIds.add(newId);
        }
    }
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
    const yamlPaths = DIRS_TO_SCAN.flatMap(d => findIndexYamls(d));

    if (yamlPaths.length === 0) {
        console.error("No index.yaml files found in:", DIRS_TO_SCAN.join(', '));
        return;
    }

    // --- PASS 1: Collect Existing IDs ---
    yamlPaths.forEach(yamlPath => {
        const content = fs.readFileSync(yamlPath, 'utf8');
        // Look for id: "value" or id: value
        const match = content.match(/^id:\s*["']?([^"'\n]+)["']?/m);
        if (match) {
            existingIds.add(match[1].trim());
        }
    });

    // --- PASS 2: Assign New IDs ---
    const preExistingCount = existingIds.size;
    let assignedCount = 0;
    yamlPaths.forEach(yamlPath => {
        const folderPath = path.dirname(yamlPath);
        const folderName = path.basename(folderPath);
        let content = fs.readFileSync(yamlPath, 'utf8');

        // Check if 'id:' key is missing
        if (!content.match(/^id:/m)) {
            const newId = generateUniqueId(folderName);
            const timestamp = new Date().toISOString();

            // Prepend id and created_at to the yaml file
            const idBlock = `id: "${newId}"\ncreated_at: "${timestamp}"\n`;
            const updatedContent = idBlock + content;

            fs.writeFileSync(yamlPath, updatedContent, 'utf8');
            console.log(`✅ Assigned id: ${newId} to: ${path.relative(path.resolve(__dirname, '..'), folderPath)}`);
            assignedCount++;
        }
    });

    console.log(`\nScan complete.`);
    console.log(`- Pre-existing IDs found:    ${preExistingCount}`);
    console.log(`- New IDs assigned this run: ${assignedCount}`);
    console.log(`- Total unique IDs in system: ${existingIds.size}`);
}

run();
