/**
 * Usage: node scripts/set-env.js [dev|prod|test]
 * Writes the appropriate .env for the target environment.
 */
const fs = require('fs');
const path = require('path');

const CONFIGS = {
  dev: `# Environment: dev
POCKETBASE_URL=http://localhost:8090
SITE_URL=http://localhost:8080
`,
  prod: `# Environment: prod
POCKETBASE_URL=https://www.marcombes.fr/nopocketbase
SITE_URL=https://www.marcombes.fr/melimee
PATH_PREFIX=/melimee/
`,
  test: `# Environment: test (local subpath — npm run build && npm run serve:local)
POCKETBASE_URL=http://localhost:8090
SITE_URL=http://localhost:3000/melimee_test
PATH_PREFIX=/melimee_test/
PORT=3000
`,
};

const env = process.argv[2];
if (!CONFIGS[env]) {
  console.error(`Usage: node scripts/set-env.js [${Object.keys(CONFIGS).join('|')}]`);
  process.exit(1);
}

fs.writeFileSync(path.join(__dirname, '../.env'), CONFIGS[env]);
console.log(`.env set to: ${env}`);
