const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { program, Option } = require('commander');
const { select, input, number: numberPrompt, Separator } = require('@inquirer/prompts');

// ---------------------------------------------------------------------------
// Allowed values for choice-based parameters
// ---------------------------------------------------------------------------
const MODES = ['exercice', 'application'];

// Descriptive labels for interactive prompts
const LEVEL_CHOICES = [
  { name: 'CP  — Cours Préparatoire', value: 'cp' },
  { name: 'CE1 — Cours Élémentaire 1', value: 'ce1' },
  { name: 'CE2 — Cours Élémentaire 2', value: 'ce2' },
  { name: 'CM1 — Cours Moyen 1', value: 'cm1' },
  { name: 'CM2 — Cours Moyen 2', value: 'cm2' },
  { name: '6e  — Sixième', value: '6e' },
];
const LEVELS = LEVEL_CHOICES.map((c) => c.value);
const CATEGORY_CHOICES = [
  { name: 'Numération      — Écriture, lecture, décomposition des nombres', value: 'numeration' },
  { name: 'Opérations      — Addition, soustraction, multiplication, division', value: 'operations' },
  { name: 'Nombres         — Comparaison, rangement, encadrement', value: 'nombres' },
  { name: 'Fractions       — Parts, partages, représentations', value: 'fractions' },
  { name: 'Mesures         — Longueurs, masses, durées, contenances', value: 'mesures' },
  { name: 'Géométrie       — Formes, solides, symétrie, repérage, théorèmes', value: 'geometrie' },
  { name: 'Problèmes       — Résolution de problèmes', value: 'problemes' },
  { name: 'Logique         — Raisonnement, suites, grilles', value: 'logique' },
  { name: 'Algèbre         — Calcul littéral, équations, fonctions', value: 'algebre' },
  { name: 'Espace          — Solides, volumes, repérage 3D', value: 'espace' },
  { name: 'Transformations — Symétries, translation, rotation, homothétie', value: 'transforms' },
  { name: 'Proportions     — Pourcentages, échelles, vitesse, ratios', value: 'proportions' },
  { name: 'Données         — Statistiques, graphiques, probabilités', value: 'donnees' },
  { name: 'Algorithmes     — Raisonnement, programmation', value: 'algorithmes' },
  { name: 'Autre           — Autres type', value: 'autre' },
];
const CATEGORIES = CATEGORY_CHOICES.map((c) => c.value).filter((v) => v !== 'Autre');

const DIFFICULTY_CHOICES = [
  { name: '⭐ Facile', value: 'facile' },
  { name: '⭐⭐ Moyen', value: 'moyen' },
  { name: '⭐⭐⭐ Difficile', value: 'difficile' },
];
const DIFFICULTIES = DIFFICULTY_CHOICES.map((c) => c.value);

const TYPE_CHOICES = [
  { name: 'number-check    — Vérifier un calcul (vrai/faux)', value: 'number-check' },
  { name: 'problem         — Problème avec réponse libre', value: 'problem' },
  { name: 'matching        — Associer des paires', value: 'matching' },
  { name: 'pyramid         — Pyramide de nombres', value: 'pyramid' },
  { name: 'sequence        — Compléter une suite', value: 'sequence' },
  { name: 'bounding        — Encadrement de nombre', value: 'bounding' },
  { name: 'convert         — Conversion d\'unités', value: 'convert' },
  { name: 'logic-grid      — Grille de logique', value: 'logic-grid' },
  { name: 'true-false      — Vrai ou faux', value: 'true-false' },
  { name: 'compare         — Comparer deux nombres', value: 'compare' },
  { name: 'multi-question  — Questions sur un contexte', value: 'multi-question' },
  { name: 'mcq             — QCM (choix multiples)', value: 'mcq' },
  { name: 'fraction        — Représentation de fraction', value: 'fraction' },
  { name: 'base-10         — Décomposition en base 10', value: 'base-10' },
  { name: 'clock           — Lire l\'heure', value: 'clock' },
  { name: 'sort            — Ordonner des valeurs (click-to-rank)', value: 'sort' },
  { name: 'fill-table      — Compléter un tableau', value: 'fill-table' },
  { name: 'checkbox        — Cocher les affirmations vraies', value: 'checkbox' },
  { name: 'select          — Choisir un mot dans un menu déroulant', value: 'select' },
];

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
  sort: 'direction: asc\nitems:\n  - ""\n  - ""\n  - ""\n  - ""',
  'fill-table': 'headers: ["Col1", "Col2", "Col3"]\nrows:\n  - ["valeur", "?", "valeur"]\n  - ["valeur", "valeur", "?"]\nanswers:\n  - ["?"]\n  - ["?"]',
  'checkbox': 'statements:\n  - ""\n  - ""\n  - ""\n  - ""\ncheckedAnswers: []',
  'select': 'choices: ["", "", "", "", ""]\nstatements:\n  - template: "___ de ___"\n    answer: ""\n  - template: "___ de ___"\n    answer: ""',
};

const TYPES = Object.keys(TEMPLATES);

// ---------------------------------------------------------------------------
// CLI options
// ---------------------------------------------------------------------------
program
  .addOption(new Option('-m, --mode <mode>', 'Mode').choices(MODES))
  .addOption(new Option('-l, --level <level>', 'Niveau scolaire').choices(LEVELS))
  .addOption(new Option('-c, --category <category>', 'Catégorie').choices([...CATEGORIES, 'Autre']))
  .addOption(new Option('-d, --difficulty <difficulty>', 'Difficulté').choices(DIFFICULTIES))
  .addOption(new Option('-t, --type <type>', "Type d'exercice").choices(TYPES))
  .option('-n, --name <name>', "Nom de l'exercice (slug)")
  .option('-i, --count <number>', 'Nombre de fichiers MD', parseInt)
  .option('-g, --generator <name>', 'Nom du générateur (mode application)')
  .option('-r, --repeat <number>', "Nombre d'exercices générés à l'exécution", parseInt)
  .parse(process.argv);

const options = program.opts();

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

  // --- mode ---
  const mode = options.mode || await select({
    message: 'Quel mode ?',
    choices: [
      { name: 'Exercice (contenu statique)', value: 'exercice' },
      { name: 'Application (générateur dynamique)', value: 'application' },
    ],
  });

  // --- common questions ---
  const level = options.level || await select({
    message: 'Niveau scolaire :',
    choices: LEVEL_CHOICES,
  });

  let category = options.category || await select({
    message: 'Quelle catégorie ?',
    choices: CATEGORY_CHOICES,
  });
  if (category === 'Autre') {
    category = await input({ message: 'Saisissez la catégorie :' });
  }

  const name = options.name || await input({
    message: 'Nom de la série (slug-name) :',
    validate: (v) =>
      /^[a-z0-9-]+$/.test(v) ||
      'Utilisez uniquement des lettres minuscules, chiffres et tirets (ex: addition-simple)',
  });

  const difficulty = options.difficulty || await select({
    message: 'Difficulté :',
    choices: DIFFICULTY_CHOICES,
  });

  // --- type (common to both modes) ---
  const type = options.type || await select({
    message: mode === 'application' ? "Type d'exercice généré :" : "Quel type d'exercice ?",
    choices: TYPE_CHOICES,
  });

  // --- count ---
  const count = options.count || await numberPrompt({
    message: mode === 'application' ? 'Nombre de fichiers .md (variantes) :' : 'Nombre de fichiers à créer :',
    default: 1,
    validate: (v) =>
      (Number.isInteger(v) && v > 0) || 'Le nombre doit être un entier supérieur à 0',
  });

  // --- application-specific ---
  let generator;
  let repeat;
  if (mode === 'application') {
    const genChoices = genNames.length
      ? [...genNames.map((g) => ({ name: g, value: g })), new Separator(), { name: 'Autre', value: 'Autre' }]
      : [{ name: 'Autre', value: 'Autre' }];
    generator = options.generator || await select({
      message: 'Quel générateur ?',
      choices: genChoices,
    });
    if (generator === 'Autre') {
      generator = await input({
        message: 'Nom du générateur (doit exister dans generators.js) :',
        validate: (v) =>
          /^[a-zA-Z][a-zA-Z0-9]*$/.test(v) || 'Utilisez un nom camelCase valide',
      });
    }
    repeat = options.repeat || await numberPrompt({
      message: "Nombre d'exercices générés à chaque chargement :",
      default: 10,
      validate: (v) =>
        (Number.isInteger(v) && v > 0) || 'Le nombre doit être un entier supérieur à 0',
    });
  }

  const cleanTitle = name.replace(/-/g, ' ');

  // Determine base directory
  const root = mode === 'application' ? '../src/fr/applications/' : '../src/fr/exercices/';
  const baseDir = path.resolve(__dirname, root);
  const targetDir = getUniqueDirPath(
    path.join(baseDir, level, 'maths', category, name)
  );

  fs.mkdirSync(targetDir, { recursive: true });

  // Generate a unique ID
  const existingIds = collectExistingIds();
  const id = generateUniqueId(name, existingIds);
  const timestamp = new Date().toISOString();

  // Write index.yaml
  const yamlContent = `id: "${id}"
created_at: "${timestamp}"
seriesTitle: "${cleanTitle}"
difficulty: ${difficulty}
`;
  fs.writeFileSync(path.join(targetDir, 'index.yaml'), yamlContent);
  console.log(`📋 Créé : index.yaml (id: ${id})`);

  // Write .md files
  if (mode === 'application') {
    // Application mode: generator-based .md files
    for (let i = 1; i <= count; i++) {
      const num = String(i).padStart(2, '0');
      const fileName = `${num}-${name}.md`;
      const mdContent = `---
type: ${type}
title: "${cleanTitle}${count > 1 ? ' - ' + i : ''}"
generator: "${generator}"
repeat: ${repeat}
---

`;
      fs.writeFileSync(path.join(targetDir, fileName), mdContent);
      console.log(`📄 Créé : ${fileName}`);
    }
  } else {
    // Exercise mode: static template .md files
    const extraFields = TEMPLATES[type] || 'answer: ""';
    for (let i = 1; i <= count; i++) {
      const num = String(i).padStart(2, '0');
      const fileName = `${num}-${name}.md`;
      const mdContent = `---
type: ${type}
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
