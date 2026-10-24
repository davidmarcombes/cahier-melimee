const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { dicteeNombre } = require('../src/assets/js/generators/numeration.js');

const audioRoot = path.join(__dirname, '../src/assets/audio/voice-pilot');
const manifestPath = path.join(audioRoot, 'instructions.json');
const previousInstructions = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
const instructions = new Map();
const instructionUtterances = new Map();

function collectFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? collectFiles(fullPath) : entry.name.endsWith('.md') ? [fullPath] : [];
  });
}

function normalize(text) {
  return text.replace(/\s+/g, ' ').trim();
}

for (const root of ['src/fr/exercices/gs', 'src/fr/applications/gs']) {
  for (const file of collectFiles(path.join(__dirname, '..', root))) {
    const source = fs.readFileSync(file, 'utf8');
    const frontMatter = source.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!frontMatter) continue;
    const data = yaml.load(frontMatter[1]);
    const phraseText = typeof data?.say === 'string' ? data.say : typeof data?.title === 'string' ? data.title : '';
    if (!phraseText) continue;
    const phrase = normalize(phraseText);
    const parts = phrase.match(/^(.*?)…\s*(Quel nombre vient après \?)$/u);
    const spokenParts = parts ? [parts[1].trim(), parts[2]] : [phrase];
    const files = spokenParts.map((part) => {
      const digest = crypto.createHash('sha256').update(part).digest('hex').slice(0, 16);
      const file = `instructions/${digest}.ogg`;
      instructionUtterances.set(file, { text: part, file, lengthScale: 1.2 });
      return file;
    });
    instructions.set(phrase, files);
  }
}

const utterances = [
  ...instructionUtterances.values(),
  ...Array.from({ length: 1001 }, (_, number) => {
    return {
      text: dicteeNombre.generate({ min: number, max: number }).say,
      file: `nombres/${number}.ogg`,
      lengthScale: 1.2,
    };
  }),
  ...[
    ['mille', 'mille'],
    ['million', 'million'],
    ['millions', 'millions'],
    ['virgule', 'virgule'],
  ].map(([text, name]) => ({ text, file: `unites/${name}.ogg`, lengthScale: 1.2 })),
  ...[
    ['souris', 'souris'],
    ['fromages', 'fromages'],
    ['grenouilles', 'grenouilles'],
    ['pommes', 'pommes'],
    ['abeilles', 'abeilles'],
    ['fleurs', 'fleurs'],
    ['poissons', 'poissons'],
    ['papillons', 'papillons'],
    ['champignons', 'champignons'],
    ['étoiles', 'etoiles'],
    ['coccinelles', 'coccinelles'],
    ['carottes', 'carottes'],
    ['tortues', 'tortues'],
    ['fraises', 'fraises'],
    ['escargots', 'escargots'],
    ['tournesols', 'tournesols'],
  ].map(([label, name]) => ({
    text: `Combien y a-t-il de ${label} ?`,
    file: `objets/${name}.ogg`,
    lengthScale: 1.2,
  })),
  ...[
    ['Bravo !', 'bravo'],
    ['Super !', 'super'],
    ['Génial !', 'genial'],
    ['Très bien !', 'tres-bien'],
    ['Essaie encore !', 'essaie-encore'],
    ['Bravo, tu as tout réussi !', 'tout-reussi'],
  ].map(([text, name]) => ({ text, file: `feedback/${name}.ogg`, lengthScale: 1.0 })),
];

const pythonCommand = process.env.PIPER_PYTHON || 'python3';
const python = spawnSync(pythonCommand, [path.join(__dirname, 'synthesize-piper.py')], {
  input: JSON.stringify(utterances),
  encoding: 'utf8',
  stdio: ['pipe', 'inherit', 'inherit'],
});

if (python.error) {
  if (python.error.code === 'ENOENT') throw new Error(`Interpréteur Python introuvable : ${pythonCommand}`);
  throw python.error;
}
if (python.status !== 0) process.exit(python.status || 1);

const instructionManifest = Object.fromEntries(
  [...instructions].map(([phrase, files]) => [phrase, files.length === 1 ? files[0] : files])
);
const currentInstructionFiles = new Set(
  Object.values(instructionManifest).flatMap((files) => (Array.isArray(files) ? files : [files]))
);
for (const oldFile of Object.values(previousInstructions).flatMap((files) =>
  Array.isArray(files) ? files : [files]
)) {
  if (/^instructions\/[a-f0-9]{16}\.ogg$/.test(oldFile) && !currentInstructionFiles.has(oldFile)) {
    fs.rmSync(path.join(audioRoot, oldFile), { force: true });
  }
}
fs.writeFileSync(manifestPath, JSON.stringify(instructionManifest, null, 2) + '\n');
console.log(
  `${utterances.length} clips Piper générés : ${instructions.size} consignes, 1 001 nombres, 16 objets, 4 segments, 6 retours.`
);
