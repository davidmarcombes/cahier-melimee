const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Logic to extract the latest 'created_at' and keep other unique keys.
 */
function cleanContent(rawStr) {
  const lines = rawStr.split('\n');
  const dataMap = {};

  lines.forEach((line) => {
    // Simple regex to catch key: value pairs
    const match = line.match(/^([\w_]+):\s*["']?(.*?)["']?\s*$/);
    if (match) {
      const [_, key, value] = match;

      if (key === 'created_at') {
        const currentVal = dataMap[key];
        // Update only if it's the first one found or if this one is newer
        if (!currentVal || new Date(value) > new Date(currentVal)) {
          dataMap[key] = value;
        }
      } else {
        dataMap[key] = value;
      }
    }
  });
  return yaml.dump(dataMap);
}

/**
 * Iterates through the directory tree
 */
async function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      await processDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
      console.log(`Cleaning: ${fullPath}`);

      const rawContent = fs.readFileSync(fullPath, 'utf8');
      const cleanedYaml = cleanContent(rawContent);

      fs.writeFileSync(fullPath, cleanedYaml, 'utf8');
    }
  }
}

// Set your target directory here
const targetDir = './src';
processDirectory(targetDir)
  .then(() => console.log('Successfully cleaned all YAML files.'))
  .catch((err) => console.error('Error processing files:', err));
