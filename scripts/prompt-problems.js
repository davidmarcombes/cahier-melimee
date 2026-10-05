#!/usr/bin/env node
/**
 * prompt-problems.js — builds a ready-to-paste prompt that makes an LLM write a series of word
 * problems for this site (any level, any Vergnaud classes, one or several steps).
 *
 * Everything that changes is read from the repo, so the prompt stays current: the level's
 * curriculum (docs/maths_<level>.md), the Vergnaud table (agents/content.md), a real example file
 * of the requested type, and the problem titles that already exist at that level (no repeats).
 *
 *   npm run prompt:problems -- --level cm2 --classes A2.4+M1.2 --count 5
 *   npm run prompt:problems -- --level ce1 --classes A3.1 --type multi-question --theme "la cantine"
 *
 * Options
 *   --level       cp | ce1 | ce2 | cm1 | cm2                               (required)
 *   --classes     Vergnaud classes, « + » = steps of one problem, « , » = mix across problems
 *                 e.g. A2.4+M1.2 (2 steps) · A1.1,A1.2,A3.1 (1 step, varied)   (default: level mix)
 *   --count       number of problems                                       (default 5)
 *   --type        problem | multi-question | guided-problem                (default problem)
 *   --difficulty  facile | moyen | difficile                               (default moyen)
 *   --theme       context to use (« le marché », « une sortie au zoo »…)   (default: varied)
 *   --slug        series folder name                                       (default from classes)
 *   --out         file to write                       (default .scratch/prompts/<level>-<slug>.md)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d;
};

// What a pupil of each level can handle in a word problem (kept short on purpose)
const LEVELS = {
  cp: {
    numbers: 'nombres entiers jusqu’à 100',
    ops: 'addition et soustraction',
    steps: '1 étape (2 très simples au plus)',
    extra: 'Phrases très courtes (2 à 3 lignes), vocabulaire du quotidien, euros entiers seulement.',
    defaultClasses: 'A1.1,A1.2,A2.1,A2.2,A3.1',
  },
  ce1: {
    numbers: 'nombres entiers jusqu’à 1 000',
    ops: 'addition, soustraction, multiplication par 2, 3, 4, 5 et 10, partage simple',
    steps: '1 ou 2 étapes',
    extra: 'Phrases courtes. Euros entiers.',
    defaultClasses: 'A1.2,A2.3,A2.4,A3.1,A3.2,M1.2',
  },
  ce2: {
    numbers: 'nombres entiers jusqu’à 10 000',
    ops: 'les quatre opérations ; divisions exactes par un nombre à un chiffre',
    steps: '1 ou 2 étapes',
    extra: 'Durées en h et min, monnaie en € et centimes, mesures simples (m, cm, kg, g, L).',
    defaultClasses: 'A2.4,A3.3,M1.2,M1.3,M2.1,M2.2',
  },
  cm1: {
    numbers: 'entiers jusqu’au million ; décimaux à 2 chiffres après la virgule',
    ops: 'les quatre opérations ; × et ÷ par un nombre à 1 ou 2 chiffres ; fractions simples d’une quantité',
    steps: '2 ou 3 étapes',
    extra: 'Conversions de mesures usuelles, durées, monnaie, proportionnalité simple.',
    defaultClasses: 'A2.4,A3.3,A4.1,M1.3,M2.2,M3.1',
  },
  cm2: {
    numbers: 'entiers jusqu’au milliard ; décimaux à 3 chiffres après la virgule ; fractions',
    ops: 'les quatre opérations, y compris décimal ÷ entier ; fractions d’une quantité ; pourcentages simples (10 %, 25 %, 50 %)',
    steps: '2 ou 3 étapes',
    extra: 'Proportionnalité, conversions (longueurs, masses, contenances, durées), périmètres et aires simples.',
    defaultClasses: 'A2.4,A3.3,A4.2,M2.1,M3.1,M1.3',
  },
};

const level = arg('level');
if (!LEVELS[level]) {
  console.error(
    'Usage: npm run prompt:problems -- --level cp|ce1|ce2|cm1|cm2 [--classes A2.4+M1.2] [--count 5] [--type problem]'
  );
  process.exit(1);
}
const L = LEVELS[level];
const type = arg('type', 'problem');
const count = +arg('count', 5);
const difficulty = arg('difficulty', 'moyen');
const theme = arg('theme', '');
const classes = arg('classes', L.defaultClasses);
const slug = arg(
  'slug',
  ('problemes-' + classes.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/-+$/, '').slice(0, 40)
);
const out = arg('out', path.join(ROOT, '.scratch', 'prompts', `${level}-${slug}.md`));

// ── sources ────────────────────────────────────────────────────────────────────
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const vergnaud = (() => {
  const s = read('agents/content.md');
  const a = s.indexOf('| Code | Type | Example |');
  return a < 0 ? '' : s.slice(a, s.indexOf('\n\n', a)).trim();
})();
const curriculum = (() => {
  const f = `docs/maths_${level}.md`;
  if (!fs.existsSync(path.join(ROOT, f))) return '';
  // section headings + the « Résolution de problèmes » items when the doc has them
  const lines = read(f).split('\n');
  const heads = lines.filter((l) => l.startsWith('### ')).map((l) => l.slice(4).trim());
  const i = lines.findIndex((l) => /^###.*probl/i.test(l));
  const prob =
    i < 0
      ? []
      : lines
          .slice(i + 1)
          .filter(
            (l, k, arr) => k < arr.findIndex((x) => /^#/.test(x)) || !arr.slice(0, k + 1).some((x) => /^#/.test(x))
          )
          .filter((l) => l.startsWith('- '));
  return (
    `Notions du programme de ${level.toUpperCase()} : ${heads.join(' · ')}.` +
    (prob.length ? `\nRésolution de problèmes attendue :\n${prob.join('\n')}` : '')
  );
})();
const walk = (d) =>
  fs.existsSync(d)
    ? fs
        .readdirSync(d, { withFileTypes: true })
        .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))
    : [];
const probFiles = (lv) =>
  walk(path.join(ROOT, 'src/fr/exercices', lv, 'maths/problemes')).filter((f) => f.endsWith('.md'));
const example = (() => {
  const order = [level, 'cm1', 'ce2', 'cm2', 'ce1', 'cp'];
  for (const lv of order)
    for (const f of probFiles(lv)) {
      const s = fs.readFileSync(f, 'utf8');
      if (new RegExp(`^type: "?${type}"?$`, 'm').test(s) && s.length < 2500)
        return { path: path.relative(ROOT, f).split(path.sep).join('/'), text: s.trim() };
    }
  return null;
})();
if (!example) {
  console.error(`No existing exercise of type "${type}" to use as an example.`);
  process.exit(1);
}
const existingTitles = [
  ...new Set(
    probFiles(level)
      .map((f) => (fs.readFileSync(f, 'utf8').match(/^title:\s*"?(.+?)"?\s*$/m) || [])[1])
      .filter(Boolean)
  ),
].sort();

// ── prompt ─────────────────────────────────────────────────────────────────────
const multiStep = classes.includes('+');
const prompt = `# Mission

Écris ${count} problèmes de mathématiques en français pour des élèves de **${level.toUpperCase()}** (école élémentaire, France), au format du site « Le Cahier de Mélimée ». Difficulté de la série : **${difficulty}**.${theme ? `\nThème commun : **${theme}**.` : '\nVarie les contextes (école, sport, cuisine, sorties, jardin, achats, voyages…).'}

## Structure des problèmes (classes de Vergnaud)

Classes demandées : **${classes}**. ${multiStep ? '« + » = les étapes d’un même problème, dans cet ordre : chaque problème enchaîne ces étapes, le résultat d’une étape sert à la suivante, et seule la réponse finale est demandée.' : '« , » = varie les classes d’un problème à l’autre (au moins une fois chacune).'}

${vergnaud}

## Niveau ${level.toUpperCase()}

- Nombres : ${L.numbers}.
- Opérations : ${L.ops}.
- Étapes : ${L.steps}.
- ${L.extra}
${curriculum ? '\n' + curriculum + '\n' : ''}
## Règles

1. **Toutes les données nécessaires sont dans l’énoncé**, aucune donnée inutile (sauf si on te demande un problème « piège »). Une seule réponse possible.
2. **Réponse = un nombre** (ou un seul mot sans ambiguïté). Jamais une phrase ni plusieurs mots. L’unité va dans \`unit\`, pas dans la réponse.
3. Écriture française : virgule décimale (\`4,50\`), espace entre les milliers dans l’énoncé (\`12 500\`), réponses sans espace (\`12500\`).
4. Mets en **gras** les données et le mot-clé de la question (\`**48 bonbons**\`, \`**de plus**\`).
5. Situations réalistes et bienveillantes : prix, durées et quantités plausibles ; prénoms variés (filles et garçons, origines diverses) ; pas de marques, pas de violence.
${
  type === 'problem'
    ? `6. Le champ \`operation\` donne le calcul attendu, étape par étape, séparé par \`  ;  \` (ex. \`"48 + 12 = 60  ;  60 ÷ 6 = 10"\`). Il doit être juste et finir par la réponse.
7. \`class\` = la classe de Vergnaud de la **dernière** étape.`
    : `6. Chaque sous-question ou étape a une seule réponse vérifiable ; fais les calculs pour toi avant de remplir le fichier.
7. Garde exactement les champs de l’exemple, n’en invente pas.`
}
8. Titres courts et différents de ceux qui existent déjà (liste plus bas).
9. **Vérifie chaque problème avant de répondre** : refais les calculs, vérifie que la réponse est unique, que les nombres respectent le niveau et que \`answers\` = résultat de \`operation\`.

## Format attendu

Type d’exercice : \`${type}\`. Voici un vrai fichier du site de ce type (\`${example.path}\`) — reprends exactement ses champs YAML :

\`\`\`markdown
${example.text}
\`\`\`

Rends **un bloc de code par fichier**, précédé de son chemin :

- \`src/fr/exercices/${level}/maths/problemes/${slug}/index.yaml\` :
  \`\`\`yaml
  title: "<titre de la série>"
  difficulty: ${difficulty}
  class: "<classe principale>"
  \`\`\`
  (pas de champ \`id\` : il est attribué par le site)
- \`src/fr/exercices/${level}/maths/problemes/${slug}/01-<mot-cle>.md\` … \`0${count}-<mot-cle>.md\` : un problème par fichier.

## Titres existants en ${level.toUpperCase()} (ne pas réutiliser)

${existingTitles.length ? existingTitles.join(' · ') : '(aucun)'}
`;

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, prompt);
console.log(prompt);
console.error(`\n→ prompt written to ${path.relative(ROOT, out)}
Then: save the files → npm run generate:ids → npm run validate:exercises → npm run check → replay in /admin/`);
