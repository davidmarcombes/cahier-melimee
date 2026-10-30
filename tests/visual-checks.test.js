import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const { VISUAL_CHECKS: V, VISUAL_GEN_CHECKS: G, clockSvg } = require('../scripts/lib/visual-checks.js');
globalThis.clockSvg = clockSvg; // real clocks: the check reads their hands
const generators = require('../src/assets/js/generators/index.js');

// Params of every content file that uses a generator
const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const uses = (name) =>
  walk('src/fr')
    .filter((f) => f.endsWith('.md'))
    .map((f) => readFileSync(f, 'utf8'))
    .filter((s) => new RegExp(`^generator:\\s*["']?${name}["']?\\s*$`, 'm').test(s))
    .map((s) => yaml.load(s.split(/^---\s*$/m)[1])?.params || {});
const draws = (name, n = 30) =>
  uses(name).flatMap((p) => Array.from({ length: n }, () => generators[name].generate(p)));
const check = (name, e) => (G[name] ? G[name](e) : V[e.type](e));

// A wrong version of each generated item: the check must refuse it
const plusOne = (e) => ({ ...e, answers: [String(Number(e.answers[0]) + 1)] });
const CORRUPT = {
  compterGS: plusOne,
  compterObjets: plusOne,
  complementA10Emoji: plusOne,
  comparerGroupes: (e) => ({ ...e, cmpGroupAnswer: (e.cmpGroupAnswer + 1) % 3 }),
  magicColorGrid: (e) => {
    const cells = e.magicColor.cells.map((c) => ({ ...c }));
    cells[0].colorIdx = (cells[0].colorIdx + 1) % e.magicColor.labels.length;
    return { ...e, magicColor: { ...e.magicColor, cells } };
  },
  ruler: (e) => ({ ...e, answers: [String(e.ruler.markers[0].value + 1).replace('.', ',')] }),
  lireHeureMatching: (e) => ({ ...e, pairs: { ...e.pairs, answers: [...e.pairs.answers].reverse() } }),
  porteMonnaie: (e) => ({
    ...e,
    mqQuestions: [
      { ...e.mqQuestions[0], answer: String(Number(e.mqQuestions[0].answer) + 1) },
      ...e.mqQuestions.slice(1),
    ],
  }),
  compterEuros: (e) => ({
    ...e,
    mqQuestions: [{ ...e.mqQuestions[0], answer: String(Number(e.mqQuestions[0].answer) + 1) }],
  }),
  vennFormes: (e) => {
    const items = e.venn.items.map((it) => ({ ...it }));
    items[0].zone = items[0].zone === 'out' ? 'ab' : 'out';
    return { ...e, venn: { ...e.venn, items } };
  },
};

describe('visual checks on real draws', () => {
  for (const name of Object.keys(CORRUPT)) {
    it(`${name}: every draw passes, every corrupted draw fails`, () => {
      const all = draws(name);
      expect(all.length).toBeGreaterThan(0);
      for (const e of all) {
        expect(check(name, e)).toBeNull();
        expect(check(name, CORRUPT[name](e))).toBeTruthy();
      }
    });
  }
});

describe('drawing defects', () => {
  const emoji = (x, y) =>
    `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="28">🐠</text>`;
  const pic = (...items) => `<svg viewBox="0 0 280 200" width="280" height="200">${items.join('')}</svg>`;
  const count = (svgHtml, answers) => V['count-objects']({ title: 'Combien ?', svgHtml, answers });

  it('refuses objects on top of each other or cut off by the frame', () => {
    expect(count(pic(emoji(50, 50), emoji(150, 50)), ['2'])).toBeNull();
    expect(count(pic(emoji(50, 50), emoji(55, 52)), ['2'])).toMatch(/overlap/);
    expect(count(pic(emoji(50, 50), emoji(150, 195)), ['2'])).toMatch(/cut off/);
  });
  it('refuses a ruler mark between two graduations', () => {
    const r = { min: 0, max: 10, divisions: 1, subdivisions: 0, markers: [{ label: 'A', value: 4.5 }] };
    expect(V.ruler({ title: 'Lis la valeur indiquée par A', ruler: r, answers: ['4,5'] })).toMatch(/between/);
  });
  it('refuses graduations too close to read', () => {
    const r = { min: 0, max: 100, divisions: 10, subdivisions: 0, markers: [{ label: 'A', value: 50 }] };
    expect(V.ruler({ title: 'Lis la valeur indiquée par A', ruler: r, answers: ['50'] })).toMatch(/too close/);
  });
  it('reads two markers as the gap between them, unless the title names one', () => {
    const r = {
      min: 0,
      max: 15,
      divisions: 1,
      markers: [
        { label: 'A', value: 2 },
        { label: 'B', value: 14 },
      ],
    };
    expect(V.ruler({ title: 'Combien de cm entre A et B ?', ruler: r, answers: ['12'] })).toBeNull();
    expect(V.ruler({ title: 'Lis la valeur du point A', ruler: r, answers: ['2'] })).toBeNull();
    expect(V.ruler({ title: 'Lis la valeur du point A', ruler: r, answers: ['12'] })).toMatch(/shows 2/);
  });
  it('refuses money the drawing does not show (not a real coin)', () => {
    const e = {
      svg: { gen: 'moneySvg', par: { items: [500, 300] } },
      mqQuestions: [{ text: 'Combien d’euros en tout ? (en €)', answer: '8' }],
    };
    expect(G.compterEuros(e)).toMatch(/not drawn/);
  });
  it('refuses a number that fits two colours of the code', () => {
    const magicColor = { cells: [{ colorIdx: 0, value: 12 }], labels: ['Multiple de 4', 'Multiple de 6'] };
    expect(V['magic-color']({ magicColor })).toMatch(/fits « Multiple de 4 » and « Multiple de 6 »/);
  });
  it('refuses two clocks showing the same time', () => {
    const e = {
      pairs: { left: [clockSvg(3, 15), clockSvg(3, 15)], right: ['3h et quart', '3h et quart'], answers: [0, 1] },
    };
    expect(G.lireHeureMatching(e)).toMatch(/same time/);
  });
});
