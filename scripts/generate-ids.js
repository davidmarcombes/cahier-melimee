const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EXERCISES_DIR = path.resolve(__dirname, '../src/fr/exercices');
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

function run() {
    if (!fs.existsSync(EXERCISES_DIR)) {
        console.error("Directory not found:", EXERCISES_DIR);
        return;
    }

    const folders = fs.readdirSync(EXERCISES_DIR)
        .map(f => path.join(EXERCISES_DIR, f))
        .filter(f => fs.lstatSync(f).isDirectory());

    // --- PASS 1: Collect Existing IDs ---
    folders.forEach(folderPath => {
        const yamlPath = path.join(folderPath, 'index.yaml');
        if (fs.existsSync(yamlPath)) {
            const content = fs.readFileSync(yamlPath, 'utf8');
            // Look for id: "value" or id: value
            const match = content.match(/^id:\s*["']?([^"'\n]+)["']?/m);
            if (match) {
                existingIds.add(match[1].trim());
            }
        }
    });

    // --- PASS 2: Assign New IDs ---
    const preExistingCount = existingIds.size;
    let assignedCount = 0;
    folders.forEach(folderPath => {
        const folderName = path.basename(folderPath);
        const yamlPath = path.join(folderPath, 'index.yaml');

        const yamlExists = fs.existsSync(yamlPath);
        if (!yamlExists) {
            console.warn(`⚠️  No index.yaml in: ${folderName} — creating minimal file.`);
        }
        let content = yamlExists ? fs.readFileSync(yamlPath, 'utf8') : "";

        // Check if 'id:' key is missing
        if (!content.match(/^id:/m)) {
            const newId = generateUniqueId(folderName);
            const timestamp = new Date().toISOString();

            // Prepend id and created_at to the yaml file
            const idBlock = `id: "${newId}"\ncreated_at: "${timestamp}"\n`;
            const updatedContent = idBlock + content;

            fs.writeFileSync(yamlPath, updatedContent, 'utf8');
            console.log(`✅ Assigned id: ${newId} to folder: ${folderName}`);
            assignedCount++;
        }
    });

    console.log(`\nScan complete.`);
    console.log(`- Pre-existing IDs found:    ${preExistingCount}`);
    console.log(`- New IDs assigned this run: ${assignedCount}`);
    console.log(`- Total unique IDs in system: ${existingIds.size}`);
}

run();