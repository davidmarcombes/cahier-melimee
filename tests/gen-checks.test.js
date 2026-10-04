import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
globalThis.clockSvg = () => '';
const generators = require('../src/assets/js/generators/index.js');
const {
  GEN_CHECKS,
  toRoman,
  fromRoman,
  vennRule,
  wordsToNumber,
  countSymbols,
} = require('../scripts/lib/gen-checks.js');

// Every content file that uses a generator, with its params
const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const uses = (name) =>
  walk('src/fr')
    .filter((f) => f.endsWith('.md'))
    .map((f) => readFileSync(f, 'utf8'))
    .filter((s) => new RegExp(`^generator:\\s*["']?${name}["']?\\s*$`, 'm').test(s))
    .map((s) => yaml.load(s.split(/^---\s*$/m)[1])?.params || {});

// A wrong version of each generated item: the check must refuse it
const CORRUPT = {
  astuceDizaineSup: (e) =>
    e.type === 'calc-chain'
      ? {
          ...e,
          chain: {
            ...e.chain,
            steps: [e.chain.steps[0], { ...e.chain.steps[1], answer: String(Number(e.chain.steps[1].answer) + 1) }],
          },
        }
      : { ...e, answers: [String(Number(e.answers[0]) + 1)] },
  decodageEmojis: (e) => ({ ...e, answers: [String(Number(e.answers[0]) + 1)] }),
  arrondirNombre: (e) => ({ ...e, answers: [String(Number(e.answers[0]) + 10)] }),
  blocsValeurPosition: (e) => ({
    ...e,
    columns: e.columns.map((c, i) => (i === 0 ? { ...c, answer: (c.answer + 1) % 9 } : c)),
  }),
  huntNombres: (e) => ({ ...e, grid: e.grid.map((v) => (v === 1 ? 2 : v)) }),
  vennNombres: (e) => ({
    ...e,
    venn: {
      ...e.venn,
      items: e.venn.items.map((it, i) => (i ? it : { ...it, zone: it.zone === 'out' ? 'ab' : 'out' })),
    },
  }),
  functionMachineDiscover: (e) => ({
    ...e,
    machine: { ...e.machine, answer: (e.machine.answer + 1) % e.machine.choices.length },
  }),
  functionMachineCompute: (e) => ({ ...e, machine: { ...e.machine, answer: e.machine.answer + 1 } }),
  comparerNombres: (e) => ({ ...e, tileAnswers: [(e.tileAnswers[0] + 1) % e.tiles.length] }),
  sommesCibles: (e) => ({ ...e, tileAnswers: e.tileAnswers.slice(1) }),
  romanNumerals: (e) => ({ ...e, answers: [String(Number(e.answers[0]) + 1)] }),
  comptageFruits: (e) => ({ ...e, answers: [String(Number(e.answers[0]) + 1)] }),
  comptageInsectes: (e) => ({ ...e, answers: [String(Number(e.answers[0]) + 1)] }),
  multiplicationsEtapes: (e) => ({ ...e, answers: [e.answers[0], String(Number(e.answers[1]) + 10)] }),
  perimetreFormes: (e) => ({ ...e, answers: [String(Number(e.answers[0]) + 1)] }),
  decomposerDecimal: (e) => ({ ...e, tileAnswers: e.tileAnswers.slice(1) }),
  calcMentalGrands: (e) => ({ ...e, answers: [String(Number(e.answers[0]) + 100)] }),
  trierDecimaux: (e) => ({ ...e, tiles: [...e.tiles.slice(0, -1), e.tiles[0]] }),
  pairOuImpair: (e) => ({ ...e, answers: [e.answers[0] === 'pair' ? 'impair' : 'pair'] }),
  lireTableauTile: (e) => ({ ...e, tileAnswers: [(e.tileAnswers[0] + 1) % e.tiles.length] }),
  comparaisonNombres: (e) => ({
    ...e,
    comparisons: e.comparisons.map((c, i) => (i ? c : { ...c, answer: c.answer === '<' ? '>' : '<' })),
  }),
  lireAbacus: (e) => ({ ...e, answers: [String(Number(e.answers[0]) + 1)] }),
  classerMultiples: (e) => ({
    ...e,
    items: e.items.map((it, i) => (i ? it : { ...it, cat: e.categories.find((c) => c.id !== it.cat).id })),
  }),
  multiplesOfTile: (e) => ({ ...e, tileAnswers: e.tileAnswers.slice(1) }),
  nombreChiffresSelect: (e) => ({ ...e, tileAnswers: e.tileAnswers.slice(1) }),
  chiffrePlaceValeur: (e) => ({ ...e, answers: [String((Number(e.answers[0]) + 1) % 10)] }),
  romanNumeralsReverse: (e) => ({ ...e, answers: [e.answers[0] + 'I'] }),
  divisionEuclidienne: (e) => ({
    ...e,
    mqQuestions: e.mqQuestions.map((q, i) => (i ? { ...q, answer: String(Number(q.answer) + 1) } : q)),
  }),
  classerFractions: (e) => ({
    ...e,
    items: e.items.map((it, i) => (i ? it : { ...it, cat: it.cat === 'lt' ? 'gt' : 'lt' })),
  }),
  fractionEnLettres: (e) => ({ ...e, answers: [e.answers[0].replace(/^(\d+)/, (n) => String(Number(n) + 1))] }),
  comparerVolumes: (e) => ({ ...e, mcqAnswer: (e.mcqAnswer + 1) % 3 }),
  comparerLongueurs: (e) => ({ ...e, mcqAnswer: (e.mcqAnswer + 1) % 3 }),
  decimalTriple: (e) => ({ ...e, dtDecimal: e.dtDecimal + '1' }),
  decompoAdditif: (e) => ({
    ...e,
    decomp: {
      ...e.decomp,
      parts: e.decomp.parts.map((p, i) => (i ? p : { ...p, answer: String((Number(p.answer) + 1) % 10) })),
    },
  }),
  decompoAdditifDecimal: (e) => ({
    ...e,
    decomp: {
      ...e.decomp,
      parts: e.decomp.parts.map((p, i) => (i ? p : { ...p, answer: String((Number(p.answer) + 1) % 10) })),
    },
  }),
  egalitesFractions: (e) => ({ ...e, tileAnswers: e.tileAnswers.slice(1) }),
  fractionsEgales5: (e) => ({ ...e, tileAnswers: e.tileAnswers.slice(1) }),
  plusGrandeFraction: (e) => ({ ...e, tileAnswers: [(e.tileAnswers[0] + 1) % e.tiles.length] }),
  recomposerFractions: (e) => ({ ...e, answers: [e.answers[0].replace(/^(\d+)/, (n) => String(Number(n) + 1))] }),
  enigmeSymboles: (e) => ({ ...e, mcqAnswer: (e.mcqAnswer + 1) % e.mcqChoices.length }),
  lireTableauNombre: (e) => ({ ...e, answers: [String(Number(e.answers[0]) + 1)] }),
  ajouterPositionnel: (e) => ({ ...e, answers: [String(Number(e.answers[0]) + 1)] }),
  convertirValeurPos: (e) => ({ ...e, answers: [String(Number(e.answers[0]) + 1)] }),
  mcqDecimaux: (e) => ({ ...e, mcqAnswer: (e.mcqAnswer + 1) % e.mcqChoices.length }),
  decompositionBase10: (e) => ({ ...e, answers: [String(Number(e.answers[0]) + 1)] }),
};

describe('per-generator oracle checks', () => {
  it('has a corruption for every check', () => {
    expect(Object.keys(CORRUPT).sort()).toEqual(Object.keys(GEN_CHECKS).sort());
  });

  for (const name of Object.keys(GEN_CHECKS)) {
    it(`${name}: accepts real draws, refuses corrupted ones`, () => {
      const paramsList = uses(name);
      expect(paramsList.length).toBeGreaterThan(0);
      for (const params of paramsList)
        for (let k = 0; k < 10; k++) {
          const item = generators[name].generate(JSON.parse(JSON.stringify(params)));
          expect(GEN_CHECKS[name](item, params)).toBeNull();
          let refused;
          try {
            refused = GEN_CHECKS[name](CORRUPT[name](item), params) !== null;
          } catch {
            refused = true;
          }
          expect(refused).toBe(true);
        }
    });
  }
});

describe('independent helpers', () => {
  it('roman numerals both ways, canonical form only', () => {
    expect(toRoman(1994)).toBe('MCMXCIV');
    expect(fromRoman('CCXIII')).toBe(213);
    expect(fromRoman('IIII')).toBeNaN();
  });

  it('French number words, strictly', () => {
    expect(wordsToNumber('quatre-vingt-trois mille soixante-trois')).toBe(83063);
    expect(wordsToNumber('soixante et onze')).toBe(71);
    expect(wordsToNumber('deux cents')).toBe(200);
    expect(() => wordsToNumber('huit mille trois mille soixante-trois')).toThrow(); // the old generator bug
  });

  it('counts pictures in an operation', () => {
    expect(countSymbols('🍉 🍉 + 🍉 🍉 🍉 🍉')).toBe('2 + 4');
    expect(countSymbols('🐜 🐜 🐜 − 2')).toBe('3 − 2');
  });

  it('Venn labels as displayed', () => {
    expect(vennRule('Diviseur de 36')(12)).toBe(true);
    expect(vennRule('Nombre premier')(9)).toBe(false);
    expect(vennRule('Nombre premier')(7)).toBe(true);
    expect(vennRule('Inférieur à 10')(10)).toBe(false);
  });
});
