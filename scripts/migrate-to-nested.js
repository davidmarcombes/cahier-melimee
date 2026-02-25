/**
 * One-time migration script: flat exercise folders → nested hierarchy.
 *
 * Before: src/fr/exercices/ce1-maths-logique-grille-01/
 * After:  src/fr/exercices/ce1/maths/logique/grille-01/
 *
 * Run once, then delete or archive this script.
 */
const fs = require('fs');
const path = require('path');

const SRC_FR = path.resolve(__dirname, '../src/fr');

// Files that must stay at the root level (not moved)
const ROOT_SKIP = new Set(['exercices.json', 'applications.json', 'series-pages.njk']);

function parseExerciseName(name) {
    const parts = name.split('-');
    // Pattern: {level}-maths-{topic}-{rest...}
    if (parts.length < 4) return null;
    return {
        level: parts[0],
        subject: parts[1],
        topic: parts[2],
        leaf: parts.slice(3).join('-')
    };
}

function parseApplicationName(name) {
    const parts = name.split('-');
    // Pattern: {level}-maths-{topic}
    if (parts.length < 3) return null;
    return {
        level: parts[0],
        subject: parts[1],
        topic: parts.slice(2).join('-')
    };
}

function moveContents(oldDir, newDir) {
    fs.mkdirSync(newDir, { recursive: true });
    for (const file of fs.readdirSync(oldDir)) {
        const oldPath = path.join(oldDir, file);
        const newPath = path.join(newDir, file);
        fs.renameSync(oldPath, newPath);
    }
    fs.rmdirSync(oldDir);
}

function migrate() {
    let moved = 0;
    let skipped = 0;

    for (const folder of ['exercices', 'applications']) {
        const dir = path.join(SRC_FR, folder);
        if (!fs.existsSync(dir)) continue;

        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            if (ROOT_SKIP.has(entry.name)) continue;

            let targetRel;
            if (folder === 'exercices') {
                const parsed = parseExerciseName(entry.name);
                if (!parsed) {
                    console.warn(`  Skipping unparseable: ${entry.name}`);
                    skipped++;
                    continue;
                }
                targetRel = path.join(parsed.level, parsed.subject, parsed.topic, parsed.leaf);
            } else {
                const parsed = parseApplicationName(entry.name);
                if (!parsed) {
                    console.warn(`  Skipping unparseable: ${entry.name}`);
                    skipped++;
                    continue;
                }
                targetRel = path.join(parsed.level, parsed.subject, parsed.topic);
            }

            const oldPath = path.join(dir, entry.name);
            const newPath = path.join(dir, targetRel);

            if (fs.existsSync(newPath)) {
                console.warn(`  Target already exists, skipping: ${targetRel}`);
                skipped++;
                continue;
            }

            moveContents(oldPath, newPath);
            console.log(`  ${entry.name} -> ${targetRel}`);
            moved++;
        }
    }

    console.log(`\nMigration complete: ${moved} moved, ${skipped} skipped.`);
}

migrate();
