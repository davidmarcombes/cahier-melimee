const fs = require('fs');
const path = require('path');

// 1. Configuration
const SEARCH_ROOT = './src';
const TARGET_ID = process.argv[2];

if (!TARGET_ID) {
  console.error('Usage: node generate-prompt.js <id>');
  process.exit(1);
}

function findFolderById(dir, id) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const result = findFolderById(fullPath, id);
      if (result) return result;
    } else if (file === 'index.yaml') {
      const content = fs.readFileSync(fullPath, 'utf8');
      const idRegex = new RegExp(`id:\\s*["']?${id}["']?`, 'i');
      if (idRegex.test(content)) return path.dirname(fullPath);
    }
  }
  return null;
}

function generatePrompt(folderPath) {
  const files = fs.readdirSync(folderPath);
  let dumpedContent = '';

  files.forEach((file) => {
    const filePath = path.join(folderPath, file);
    if (fs.statSync(filePath).isFile()) {
      let content = fs.readFileSync(filePath, 'utf8');

      // Strip the ID line from index.yaml to avoid duplication/confusion
      if (file === 'index.yaml') {
        content = content.replace(/^id:\s*.*\n?/m, '');
      }

      dumpedContent += `\n--- FICHIER: ${file} ---\n${content}\n`;
    }
  });

  // The prompt is now tailored for French content and specific logic
  return `
### CONTEXTE ###
Le dossier suivant contient des fichiers YAML et Markdown décrivant des exercices de mathématiques en français.

### MISSION ###
Tu dois générer une variante de cet exercice. 
1. Conserve les objectifs pédagogiques et la structure des fichiers.
2. Modifie les valeurs numériques, le contexte (l'énoncé) ou la formulation.
3. Produis le résultat exclusivement en français.
4. Ne génère pas de champ "id" dans le fichier index.yaml.
5. Genere un nom de doossier et les nom de fichier md

### CRITERE DU VARIANT

### CONTENU DU DOSSIER SOURCE ###
${dumpedContent}

### RÉPONSE ATTENDUE ###
Fournis le contenu mis à jour pour chaque fichier ci-dessus.
`;
}

// Execution
const targetFolder = findFolderById(SEARCH_ROOT, TARGET_ID);

if (targetFolder) {
  console.log(targetFolder); // Shows the path found
  console.log('-----------------------------------------');
  console.log(generatePrompt(targetFolder));
} else {
  console.error(`ID "${TARGET_ID}" non trouvé.`);
}
