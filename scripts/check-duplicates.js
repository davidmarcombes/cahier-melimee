const identity = "david@marcombes.fr";
const password = "salto12345";
const baseUrl = "http://127.0.0.1:8090";

async function diagnose() {
    const authResp = await fetch(`${baseUrl}/api/admins/auth-with-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, password })
    });
    const { token } = await authResp.json();

    console.log("Checking for duplicates...");
    const names = new Map();
    let page = 1;
    let duplicates = 0;

    // Check first 1000 records
    const resp = await fetch(`${baseUrl}/api/collections/identities/records?perPage=1000`, {
        headers: { "Authorization": token }
    });
    const { items } = await resp.json();

    for (const item of items) {
        if (names.has(item.name)) {
            duplicates++;
            console.log(`Duplicate found: ${item.name} (IDs: ${names.get(item.name)}, ${item.id})`);
        } else {
            names.set(item.name, item.id);
        }
    }

    console.log(`Scan of 1000 items complete. Found ${duplicates} duplicates.`);

    const males = items.filter(i => i.gender === 'M').length;
    const females = items.filter(i => i.gender === 'F').length;
    console.log(`Distribution in sample: M:${males}, F:${females}`);
}

diagnose();
