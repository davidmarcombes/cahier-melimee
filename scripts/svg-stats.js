#!/usr/bin/env node
/**
 * svg-stats.js — SVGO compression report for all SVG generator functions.
 * Usage: node scripts/svg-stats.js
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { optimize } = createRequire(import.meta.url)('svgo');

// Load all SVG functions from svg.js
const src = readFileSync(resolve(__dirname, '../src/assets/js/svg.js'), 'utf8');
const {
  circleSvg, slicedPieSvg, mathGridSvg, rectangleSvg, squareSvg, triangleSvg,
  equilateralTriangleSvg, isoscelesTriangleSvg, rhombusSvg, parallelogramSvg,
  trapezoidSvg, regularPolygonSvg,
  cubeSvg, sphereSvg, cylinderSvg, coneSvg,
  cuboidSvg, triangularPrismSvg, squarePyramidSvg, tetrahedronSvg,
  abacusSvg, rulerSvg,
} = new Function(src + `
  return { circleSvg, slicedPieSvg, mathGridSvg, rectangleSvg, squareSvg, triangleSvg,
           equilateralTriangleSvg, isoscelesTriangleSvg, rhombusSvg, parallelogramSvg,
           trapezoidSvg, regularPolygonSvg,
           cubeSvg, sphereSvg, cylinderSvg, coneSvg,
           cuboidSvg, triangularPrismSvg, squarePyramidSvg, tetrahedronSvg,
           abacusSvg, rulerSvg };
`)();

// Representative call for each function
const CASES = [
  ['circleSvg',               () => circleSvg(50, 'r')],
  ['slicedPieSvg',            () => slicedPieSvg(6, 4)],
  ['mathGridSvg (5×2)',        () => mathGridSvg(5, 2, 6)],
  ['mathGridSvg (10×10)',      () => mathGridSvg(10, 10, 50), true],  // excluded: repetitive rects compress artificially
  ['rectangleSvg',            () => rectangleSvg(80, 40, '8 cm', '4 cm')],
  ['squareSvg',               () => squareSvg(80, '5 cm')],
  ['triangleSvg',             () => triangleSvg(60, 80, '6 cm', '8 cm', '10 cm')],
  ['equilateralTriangleSvg',  () => equilateralTriangleSvg(80, '6 cm')],
  ['isoscelesTriangleSvg',    () => isoscelesTriangleSvg(80, 70, 'base', 'côté')],
  ['rhombusSvg',              () => rhombusSvg(80, 60, 'd₁', 'd₂')],
  ['parallelogramSvg',        () => parallelogramSvg(100, 60, 25, 'b', 'h')],
  ['trapezoidSvg',            () => trapezoidSvg(60, 100, 60, 'top', 'bot', 'h')],
  ['regularPolygonSvg (n=5)', () => regularPolygonSvg(5, 80, 'pentagone')],
  ['regularPolygonSvg (n=6)', () => regularPolygonSvg(6, 80, 'hexagone')],
  ['regularPolygonSvg (n=8)', () => regularPolygonSvg(8, 80)],
  ['cubeSvg',                 () => cubeSvg(50)],
  ['sphereSvg',               () => sphereSvg(40)],
  ['cylinderSvg',             () => cylinderSvg(50, 80)],
  ['coneSvg',                 () => coneSvg(60, 90)],
  ['cuboidSvg',               () => cuboidSvg(80, 50, 30)],
  ['triangularPrismSvg',      () => triangularPrismSvg(80, 70, 40)],
  ['squarePyramidSvg',        () => squarePyramidSvg(80, 80)],
  ['tetrahedronSvg',          () => tetrahedronSvg(80)],
  ['abacusSvg',               () => abacusSvg([{ label: 'milliers', value: 3 }, { label: 'centaines', value: 7 }])],
  ['rulerSvg',                () => rulerSvg(0, 10, 1, 0.5)],
];

const THRESHOLD = 75;

// Column widths
const COL = { name: 26, raw: 7, opt: 7, pct: 7 };
const line = (name, raw, opt, pct, excluded) => {
  const flag = excluded ? ' (excluded)' : pct >= THRESHOLD ? ' ⚠' : '';
  const pctStr = pct.toFixed(1) + '%';
  console.log(
    name.padEnd(COL.name) +
    String(raw).padStart(COL.raw) +
    String(opt).padStart(COL.opt) +
    pctStr.padStart(COL.pct) +
    flag
  );
};

console.log('\nSVG generator SVGO stats\n');
console.log(
  'Function'.padEnd(COL.name) +
  'Raw'.padStart(COL.raw) +
  'Opt'.padStart(COL.opt) +
  'Saved'.padStart(COL.pct)
);
console.log('─'.repeat(COL.name + COL.raw + COL.opt + COL.pct + 2));

let maxPct = 0, maxName = '', failed = false;
for (const [name, fn, excluded = false] of CASES) {
  const svg = fn();
  const raw = svg.length;
  const opt = optimize(svg, { multipass: true }).data.length;
  const pct = (1 - opt / raw) * 100;
  line(name, raw, opt, pct, excluded);
  if (!excluded && pct > maxPct) { maxPct = pct; maxName = name; }
  if (!excluded && pct >= THRESHOLD) failed = true;
}

console.log('─'.repeat(COL.name + COL.raw + COL.opt + COL.pct + 2));
console.log(`\nWorst (non-excluded): ${maxName} (${maxPct.toFixed(1)}%)  Threshold: ${THRESHOLD}%`);
if (failed) {
  console.log(`⚠  One or more functions exceed the ${THRESHOLD}% bloat threshold.`);
  process.exit(1);
} else {
  console.log('✓  All functions within threshold.\n');
}
