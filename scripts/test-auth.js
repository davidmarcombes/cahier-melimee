const identity = "david@marcombes.fr";
const password = "salto12345";
const baseUrl = "http://127.0.0.1:8090";

async function testAuth() {
    console.log("Testing auth for:", identity);

    const endpoints = [
        { name: "Superusers (v0.22+)", url: `${baseUrl}/api/collections/_superusers/auth-with-password`, body: { identity, password } },
        { name: "Admins (Legacy)", url: `${baseUrl}/api/admins/auth-with-password`, body: { email: identity, password } },
        { name: "Admins (Identity variant)", url: `${baseUrl}/api/admins/auth-with-password`, body: { identity, password } }
    ];

    for (const endpoint of endpoints) {
        console.log(`\n--- Testing ${endpoint.name} ---`);
        try {
            const resp = await fetch(endpoint.url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(endpoint.body)
            });
            const data = await resp.json();
            console.log("Status:", resp.status);
            console.log("Response:", JSON.stringify(data, null, 2));
        } catch (err) {
            console.error("Error:", err.message);
        }
    }
}

testAuth();
