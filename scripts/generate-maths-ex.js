const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { program } = require('commander');
const inquirer = require('inquirer').default || require('inquirer');

// ---------------------------------------------------------------------------
// CLI options
// ---------------------------------------------------------------------------
program
  .option('-m, --mode <mode>', 'exercice or application')
  .option('-t, --type <type>', "Type d'exercice")
  .option('-c, --category <category>', 'Catégorie (ex: operations, logique)')
  .option('-l, --level <level>', 'Niveau (cp, ce1, etc.)')
  .option('-n, --name <name>', "Nom de l'exercice (slug)")
  .option('-d, --difficulty <difficulty>', 'Difficulté (facile, moyen, difficile)')
  .option('-i, --count <number>', 'Nombre de fichiers MD', parseInt)
  .option('-g, --generator <name>', 'Nom du générateur (mode application)')
  .option('-r, --repeat <number>', "Nombre d'exercices générés à l'exécution", parseInt)
  .parse(process.argv);

const options = program.opts();

// ---------------------------------------------------------------------------
// Static exercise templates (empty shells)
// ---------------------------------------------------------------------------
const TEMPLATES = {
  'number-check': 'answer: ""\noperation: ""',
  problem: 'answer: ""',
  matching: 'pairs:\n  - left: ""\n    right: ""\n  - left: ""\n    right: ""',
  pyramid: 'pyramid:\n  - [, , , ]\n  - [null, , null]\n  - [null, null]\n  - []',
  sequence: 'given: [, , ]\nanswers: [, , ]',
  bounding: 'number: \nanswers: [, ]',
  convert: 'items:\n  - prompt: ""\n    answer: ""\n    unit: ""',
  'logic-grid':
    'columns: ["", "", ""]\nrows: ["", "", ""]\nsolution:\n  "": ""\n  "": ""\n  "": ""',
  'true-false':
    'statements:\n  - text: ""\n    answer: true\n  - text: ""\n    answer: false',
  compare: 'comparisons:\n  - left: \n    right: ',
  'multi-question': 'context: ""\nquestions:\n  - text: ""\n    answer: ""',
  mcq: 'answer: ""\nchoices:\n  - ""\n  - ""\n  - ""',
  fraction: 'shape: "circle"\nnumerator: \ndenominator: \nanswer: ""',
  'base-10': 'number: \nanswer: ""',
  clock: 'hour: \nminute: \nanswer: ""',
};

// ---------------------------------------------------------------------------
// Available generators (read dynamically from generators.js)
// ---------------------------------------------------------------------------
function getAvailableGenerators() {
  try {
    const gens = require('../src/assets/js/generators.js');
    return Object.keys(gens);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// ID generation (same logic as generate-ids.js)
// ---------------------------------------------------------------------------
function collectExistingIds() {
  const ids = new Set();
  const dirs = [
    path.resolve(__dirname, '../src/fr/exercices'),
    path.resolve(__dirname, '../src/fr/applications'),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const yamlPath of findFiles(dir, 'index.yaml')) {
      const content = fs.readFileSync(yamlPath, 'utf8');
      const m = content.match(/^id:\s*["']?([^"'\n]+)["']?/m);
      if (m) ids.add(m[1].trim());
    }
  }
  return ids;
}

function generateUniqueId(folderName, existing) {
  let id;
  do {
    const seed = `${folderName}-${process.hrtime.bigint()}-${Math.random()}`;
    id = crypto.createHash('md5').update(seed).digest('hex').slice(0, 8);
  } while (existing.has(id));
  existing.add(id);
  return id;
}

function findFiles(dir, name) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findFiles(full, name));
    else if (entry.name === name) results.push(full);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Unique directory path (append -02, -03, … if exists)
// ---------------------------------------------------------------------------
function getUniqueDirPath(basePath) {
  let target = basePath;
  let counter = 1;
  while (fs.existsSync(target)) {
    counter++;
    target = `${basePath}-${String(counter).padStart(2, '0')}`;
  }
  return target;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function run() {
  const genNames = getAvailableGenerators();

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'Quel mode ?',
      choices: [
        { name: 'Exercice (contenu statique)', value: 'exercice' },
        { name: 'Application (générateur dynamique)', value: 'application' },
      ],
      when: !options.mode,
    },
    // --- common questions ---
    {
      type: 'list',
      name: 'level',
      message: 'Niveau scolaire :',
      choices: ['cp', 'ce1', 'ce2', 'cm1', 'cm2', '6e'],
      when: !options.level,
    },
    {
      type: 'list',
      name: 'category',
      message: 'Quelle catégorie ?',
      choices: ['logique', 'operations', 'numeration', 'fraction', 'mesure', 'Autre'],
      when: !options.category,
    },
    {
      type: 'input',
      name: 'customCategory',
      message: 'Saisissez la catégorie :',
      when: (h) => h.category === 'Autre' || options.category === 'Autre',
    },
    {
      type: 'input',
      name: 'name',
      message: "Nom de la série (slug-name) :",
      when: !options.name,
      validate: (v) =>
        /^[a-z0-9-]+$/.test(v) ||
        'Utilisez uniquement des lettres minuscules, chiffres et tirets (ex: addition-simple)',
    },
    {
      type: 'list',
      name: 'difficulty',
      message: 'Difficulté :',
      choices: ['facile', 'moyen', 'difficile'],
      when: !options.difficulty,
    },
    // --- exercice-specific ---
    {
      type: 'list',
      name: 'type',
      message: "Quel type d'exercice ?",
      choices: Object.keys(TEMPLATES),
      when: (h) => (h.mode || options.mode) === 'exercice' && !options.type,
    },
    {
      type: 'number',
      name: 'count',
      message: "Nombre de fichiers à créer :",
      default: 1,
      when: (h) => (h.mode || options.mode) === 'exercice' && !options.count,
      validate: (v) =>
        (Number.isInteger(v) && v > 0) || 'Le nombre doit être un entier supérieur à 0',
    },
    // --- application-specific ---
    {
      type: 'list',
      name: 'type',
      message: "Type d'exercice généré :",
      choices: Object.keys(TEMPLATES),
      when: (h) => (h.mode || options.mode) === 'application' && !options.type,
    },
    {
      type: 'list',
      name: 'generator',
      message: 'Quel générateur ?',
      choices: genNames.length
        ? [...genNames, new inquirer.Separator(), 'Autre']
        : ['Autre'],
      when: (h) => (h.mode || options.mode) === 'application' && !options.generator,
    },
    {
      type: 'input',
      name: 'customGenerator',
      message: 'Nom du générateur (doit exister dans generators.js) :',
      when: (h) => h.generator === 'Autre',
      validate: (v) =>
        /^[a-zA-Z][a-zA-Z0-9]*$/.test(v) || 'Utilisez un nom camelCase valide',
    },
    {
      type: 'number',
      name: 'repeat',
      message: "Nombre d'exercices générés à chaque chargement :",
      default: 10,
      when: (h) => (h.mode || options.mode) === 'application' && !options.repeat,
      validate: (v) =>
        (Number.isInteger(v) && v > 0) || 'Le nombre doit être un entier supérieur à 0',
    },
    {
      type: 'number',
      name: 'count',
      message: "Nombre de fichiers .md (variantes) :",
      default: 1,
      when: (h) => (h.mode || options.mode) === 'application' && !options.count,
      validate: (v) =>
        (Number.isInteger(v) && v > 0) || 'Le nombre doit être un entier supérieur à 0',
    },
  ]);

  const data = { ...options, ...answers };
  const mode = data.mode;
  const finalCategory = data.customCategory || data.category;
  const finalGenerator = data.customGenerator || data.generator;
  const cleanTitle = data.name.replace(/-/g, ' ');

  // Determine base directory
  const root = mode === 'application' ? '../src/fr/applications/' : '../src/fr/exercices/';
  const baseDir = path.resolve(__dirname, root);
  const targetDir = getUniqueDirPath(
    path.join(baseDir, data.level, 'maths', finalCategory, data.name)
  );

  fs.mkdirSync(targetDir, { recursive: true });

  // Generate a unique ID
  const existingIds = collectExistingIds();
  const id = generateUniqueId(data.name, existingIds);
  const timestamp = new Date().toISOString();

  // Write index.yaml
  const yamlContent = `id: "${id}"
created_at: "${timestamp}"
seriesTitle: "${cleanTitle}"
difficulty: ${data.difficulty}
`;
  fs.writeFileSync(path.join(targetDir, 'index.yaml'), yamlContent);
  console.log(`📋 Créé : index.yaml (id: ${id})`);

  // Write .md files
  const count = data.count || 1;

  if (mode === 'application') {
    // Application mode: generator-based .md files
    const repeat = data.repeat || 10;
    for (let i = 1; i <= count; i++) {
      const num = String(i).padStart(2, '0');
      const fileName = `${num}-${data.name}.md`;
      const mdContent = `---
type: ${data.type}
title: "${cleanTitle}${count > 1 ? ' - ' + i : ''}"
generator: "${finalGenerator}"
repeat: ${repeat}
---

`;
      fs.writeFileSync(path.join(targetDir, fileName), mdContent);
      console.log(`📄 Créé : ${fileName}`);
    }
  } else {
    // Exercise mode: static template .md files
    const extraFields = TEMPLATES[data.type] || 'answer: ""';
    for (let i = 1; i <= count; i++) {
      const num = String(i).padStart(2, '0');
      const fileName = `${num}-${data.name}.md`;
      const mdContent = `---
type: ${data.type}
title: "${cleanTitle}${count > 1 ? ' - ' + i : ''}"
${extraFields}
---

`;
      fs.writeFileSync(path.join(targetDir, fileName), mdContent);
      console.log(`📄 Créé : ${fileName}`);
    }
  }

  const relPath = path.relative(path.resolve(__dirname, '..'), targetDir);
  console.log(`\n✅ Terminé ! Chemin : ${relPath}`);
}

run();
