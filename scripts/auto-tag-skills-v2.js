const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const SKILL_KEYWORDS = {
  'S1.1.1': ['table', 'multiplication', 'additions-rapides', 'facts', 'calc-mental', 'calcul-mental'],
  'S1.1.2': ['complement', 'double', 'moitie', 'passer-a', 'ajouter-10', 'ajouter-100', 'soustraire-10'],
  'S1.1.3': ['astuces', 'strategie', 'calcul-reflechi', 'calcul-avance'],
  'S1.2.1': ['posee', 'colonne', 'column-op', 'technique-operatoire'],
  'S1.2.2': ['chaine', 'pyramide', 'calc-chain', 'flux'],
  'S2.1.1': ['compter', 'denombrer', 'objet', 'fruits', 'points', 'jetons', 'cubes', 'collections'],
  'S2.1.2': [
    'base-10',
    'boulier',
    'abaque',
    'valeur-position',
    'numeration-tableau',
    'chiffre',
    'position-chiffre',
    'tableau-numeration',
  ],
  'S2.1.3': ['fraction', 'decimal', 'partage', 'unite'],
  'S2.1.4': ['lettres', 'noms', 'orthographe', 'mots', 'vocabulaire'],
  'S2.2.1': ['structure-additive', 'familles-faits', 'somme', 'difference'],
  'S2.2.2': ['multiplicative', 'inverse-problem'],
  'S3.1.1': ['comparer', 'signe', 'comparison', 'plus-grand', 'moins-que'],
  'S3.1.2': ['ranger', 'ordonner', 'encadrer', 'croissant', 'decroissant', 'trier'],
  'S3.1.3': ['droite-numerique', 'file-numerique', 'graduation', 'graduation-lire', 'curseur'],
  'S3.2.1': ['suite', 'pattern', 'algorithm', 'motif', 'repetition'],
  'S3.2.2': ['logic-grid', 'enigme', 'logique', 'deduction', 'grille-logique'],
  'S3.2.3': ['vrai-faux', 'check', 'verification', 'vrai-ou-faux', 'checkbox'],
  'I1.1.1': ['temps', 'heure', 'horloge', 'clock', 'date', 'calendrier', 'duree'],
  'I1.1.2': ['ruler', 'regle', 'thermometre', 'balance', 'peser', 'instrument', 'graduation-mesure'],
  'I1.2.1': ['place-curseur', 'placer-point', 'regler-heure', 'tracer', 'desiner'],
  'D1.1.1': ['bar-chart', 'graphique', 'tableau', 'tableau-lire', 'picto', 'donnee', 'analyser'],
  'D1.1.2': ['remplir-tableau', 'completer-graphique', 'enquete', 'saisir'],
};

const TYPE_DEFAULTS = {
  clock: 'I1.1.1',
  ruler: 'I1.1.2',
  pyramid: 'S1.2.2',
  sequence: 'S3.2.1',
  'logic-grid': 'S3.2.2',
  'calc-chain': 'S1.2.2',
  'bar-chart': 'D1.1.1',
  fraction: 'S2.1.3',
  'base-10': 'S2.1.2',
  'inverse-problem': 'S2.2.2',
  'true-false': 'S3.2.3',
};

const ROOT = 'e:\\Code\\cahier-melimee';
const DIRS = [
  path.join(ROOT, 'src/fr/exercices'),
  path.join(ROOT, 'src/fr/applications'),
  path.join(ROOT, 'src/fr/defis'),
];

function processFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processFiles(full);
    } else if (entry.name.endsWith('.md')) {
      tagSkill(full);
    }
  }
}

function tagSkill(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) return;

    let fm;
    try {
      fm = yaml.load(fmMatch[1]);
    } catch (e) {
      return;
    }

    const type = fm.type || 'number-check';
    if (type === 'problem') return;

    // Use absolute path relative to ROOT to find keywords
    const rel = path.relative(ROOT, filePath).toLowerCase().replace(/\\/g, '/');

    let bestSkill = null;
    let maxMatch = 0;

    for (const [skill, keys] of Object.entries(SKILL_KEYWORDS)) {
      let matches = 0;
      for (const k of keys) {
        if (rel.includes(k)) matches++;
      }
      if (matches > maxMatch) {
        maxMatch = matches;
        bestSkill = skill;
      }
    }

    if (!bestSkill) {
      bestSkill = TYPE_DEFAULTS[type] || 'S1.1.1';
    }

    // Special cases based on mode
    if (fm.mode === 'place' && bestSkill.startsWith('I1.1')) {
      bestSkill = 'I1.2.1';
    }

    // Update class: if it exists, replace it. If not, append it.
    let newFmText = fmMatch[1];
    if (newFmText.includes('class:')) {
      newFmText = newFmText.replace(/class:\s*["'][^"']*["']/g, `class: "${bestSkill}"`);
      newFmText = newFmText.replace(/class:\s*[^\n\r]+/g, `class: "${bestSkill}"`);
    } else {
      newFmText = newFmText.trim() + `\nclass: "${bestSkill}"\n`;
    }

    const newContent = content.replace(/^---\r?\n([\s\S]*?)\r?\n---/, `---\n${newFmText.trim() + '\n'}---`);
    fs.writeFileSync(filePath, newContent);
  } catch (e) {
    console.error(`Error processing ${filePath}: ${e.message}`);
  }
}

DIRS.forEach(processFiles);
console.log('Finished granular tagging.');
