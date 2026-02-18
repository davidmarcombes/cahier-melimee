const fs = require('fs');
const identity = "david@marcombes.fr";
const password = "salto12345";
const baseUrl = "http://127.0.0.1:8090";

async function runImport() {
    console.log("Starting import...");

    // 1. Authenticate
    const authResp = await fetch(`${baseUrl}/api/admins/auth-with-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, password })
    });

    if (!authResp.ok) {
        const error = await authResp.json();
        console.error("Auth failed:", error);
        return;
    }

    const { token } = await authResp.json();
    console.log("Authenticated successfully.");

    // 2. Read CSV
    const content = fs.readFileSync('names.csv', 'utf-8');
    const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('name,'));
    console.log(`Found ${lines.length} identities to import.`);

    // 3. Import loop (simple batching or sequential)
    let count = 0;
    for (const line of lines) {
        const [name, gender, usage_count, max_usage] = line.split(',');
        try {
            const resp = await fetch(`${baseUrl}/api/collections/identities/records`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token
                },
                body: JSON.stringify({
                    name,
                    gender,
                    usage_count: parseInt(usage_count),
                    max_usage: parseInt(max_usage)
                })
            });

            if (resp.ok) {
                count++;
                if (count % 100 === 0) console.log(`Imported ${count}/${lines.length}...`);
            } else {
                const error = await resp.json();
                // Ignore unique constraint errors (if names already exist)
                if (error.data?.name?.code === 'validation_not_unique') {
                    // Skip
                } else {
                    console.warn(`Failed to import ${name}:`, JSON.stringify(error));
                }
            }
        } catch (err) {
            console.error(`Error importing ${name}:`, err.message);
        }
    }

    console.log(`Done! Imported ${count} new identities.`);
}

runImport();
