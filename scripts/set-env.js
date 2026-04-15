/**
 * Usage: node scripts/set-env.js [dev|prod|test]
 * Writes the appropriate .env for the target environment.
 */
const fs = require('fs');
const path = require('path');

const CONFIGS = {
  dev: `# Environment: dev
SITE_URL=http://localhost:8080
`,
  prod: `# Environment: prod
SITE_URL=https://www.melimee.fr
`,
  test: `# Environment: test
SITE_URL=http://localhost:3000
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
