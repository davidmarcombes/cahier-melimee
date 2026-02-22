const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const inquirer = require('inquirer');

// 1. Configuration des options CLI
program
    .option('-t, --type <type>', 'Type d\'exercice')
    .option('-c, --category <category>', 'Catégorie (ex: operations, logique)')
    .option('-l, --level <level>', 'Niveau (cp, ce1, etc.)')
    .option('-n, --name <name>', 'Nom de l\'exercice (slug)')
    .option('-d, --difficulty <difficulty>', 'Difficulté (facile, moyen, difficile)')
    .option('-i, --count <number>', 'Nombre de fichiers MD', parseInt)
    .parse(process.argv);

const options = program.opts();

// Dictionnaire des templates "coquilles vides"
const TEMPLATES = {
    'logic-grid': `columns: ["", "", ""]\nrows: ["", "", ""]\nsolution:\n  "": ""\n  "": ""\n  "": ""`,
    'number-check': `answer: ""\noperation: ""`,
    'bounding': `number: \nanswers: [, ]`,
    'sequence': `given: [, , ]\nanswers: [, , ]`,
    'pyramid': `pyramid:\n  - [, , , ]\n  - [null, , null]\n  - [null, null]\n  - []`,
    'true-false': `statements:\n  - text: ""\n    answer: true\n  - text: ""\n    answer: false`,
    'problem': `answer: ""`,
    'convert': `items:\n  - prompt: ""\n    answer: ""\n    unit: ""`,
    'compare': `comparisons:\n  - left: \n    right: `,
    'multi-question': `context: ""\nquestions:\n  - text: ""\n    answer: ""`,
    'mcq': `answer: ""\nchoices:\n  - ""\n  - ""\n  - ""`,
    'matching': `pairs:\n  - left: ""\n    right: ""\n  - left: ""\n    right: ""`
};

function getUniqueDirPath(basePath) {
    let target = basePath;
    let counter = 1;
    while (fs.existsSync(target)) {
        counter++;
        const suffix = String(counter).padStart(2, '0');
        target = `${basePath}-${suffix}`;
    }
    return target;
}

async function run() {
    // 2. Questions interactives en Français
    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'type',
            message: 'Quel type d\'exercice ?',
            choices: Object.keys(TEMPLATES),
            when: !options.type
        },
        {
            type: 'list',
            name: 'category',
            message: 'Quelle catégorie ?',
            choices: ['logique', 'operations', 'numeration', 'fraction', 'Autre'],
            when: !options.category
        },
        {
            type: 'input',
            name: 'customCategory',
            message: 'Saisissez la catégorie :',
            when: (hash) => hash.category === 'Autre' || (options.category === 'Autre')
        },
        {
            type: 'list',
            name: 'level',
            message: 'Niveau scolaire :',
            choices: ['cp', 'ce1', 'ce2', 'cm1', 'cm2', '6e'],
            when: !options.level
        },
        {
            type: 'input',
            name: 'name',
            message: 'Nom de l\'exercice (slug-name) :',
            when: !options.name,
            validate: (v) => /^[a-z0-9-]+$/.test(v) || 'Utilisez uniquement des lettres minuscules, chiffres et tirets (ex: addition-simple)'
        },
        {
            type: 'list',
            name: 'difficulty',
            message: 'Difficulté :',
            choices: ['facile', 'moyen', 'difficile'],
            when: !options.difficulty
        },
        {
            type: 'number',
            name: 'count',
            message: 'Nombre de fichiers à créer :',
            default: 1,
            when: !options.count,
            validate: (v) => (Number.isInteger(v) && v > 0) || 'Le nombre doit être un entier supérieur à 0'
        }
    ]);

    const data = { ...options, ...answers };
    const finalCategory = data.customCategory || data.category;
    const baseDir = path.resolve(__dirname, '../src/fr/exercices/');
    const folderBase = `${data.level}-maths-${finalCategory}-${data.name}`;
    const targetDir = getUniqueDirPath(path.join(baseDir, folderBase));

    // Création du dossier
    fs.mkdirSync(targetDir, { recursive: true });

    // 4. index.yaml
    const yamlContent = `type: ${data.type}
topic: maths
level: ${data.level}
subtopic: ${finalCategory}
seriesTitle: "${data.name.replace(/-/g, ' ')}"
difficulty: ${data.difficulty}\n`;
    fs.writeFileSync(path.join(targetDir, 'index.yaml'), yamlContent);

    // 5. Fichiers Markdown (Coquilles vides)
    const extraFields = TEMPLATES[data.type] || "content: \"\"";
    const cleanTitle = data.name.replace(/-/g, ' ');

    for (let i = 1; i <= data.count; i++) {
        const num = String(i).padStart(2, '0');
        const fileName = `${num}-${data.name}.md`;

        const mdContent = `---
type: ${data.type}
title: "${cleanTitle}${data.count > 1 ? ' - ' + i : ''}"
${extraFields}
---

# ${cleanTitle}

`;
        fs.writeFileSync(path.join(targetDir, fileName), mdContent);
        console.log(`📄 Créé : ${fileName}`);
    }

    console.log(`\n✅ Terminé ! Chemin : ${targetDir}`);
}

run();