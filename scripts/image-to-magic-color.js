#!/usr/bin/env node
/**
 * image-to-magic-color.js
 * Convert a pixel-art PNG into a magic-color exercise .md file.
 *
 * Usage:
 *   node scripts/image-to-magic-color.js <image.png> [options]
 *
 * Options:
 *   --cols=N        Grid width in cells  (default: 8)
 *   --rows=N        Grid height in cells (default: 8)
 *   --max-colors=N  Max palette entries — background counts as one (default: 4)
 *   --output=FILE   Write to file instead of stdout
 *   --repeat=N      repeat: value in the output exercise (default: 3)
 *
 * Requires pngjs (dev dep):
 *   npm install --save-dev pngjs
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ─── Args ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.slice(2).split('=');
      return [k, v ?? true];
    })
);
const posArgs = args.filter((a) => !a.startsWith('--'));
const inputPath = posArgs[0];

if (!inputPath) {
  console.error(
    'Usage: node scripts/image-to-magic-color.js <image.png> [--cols=8] [--rows=8] [--max-colors=4] [--output=out.md] [--repeat=3] [--rule=direct]'
  );
  process.exit(1);
}
if (!fs.existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  process.exit(1);
}

let PNG;
try {
  ({ PNG } = require('pngjs'));
} catch {
  console.error('Missing dependency. Run:  npm install --save-dev pngjs');
  process.exit(1);
}

const COLS = parseInt(flags.cols ?? 8, 10);
const ROWS = parseInt(flags.rows ?? 8, 10);
const MAX_COLORS = parseInt(flags['max-colors'] ?? 4, 10);
const REPEAT = parseInt(flags.repeat ?? 3, 10);
const OUTPUT = flags.output ?? null;
const FORCE_RULE = flags.rule ?? null; // e.g. --rule=direct

// ─── Load PNG ────────────────────────────────────────────────────────────────

const png = PNG.sync.read(fs.readFileSync(inputPath));
const { width, height, data } = png;

// ─── Sample grid (nearest-neighbour) ─────────────────────────────────────────

// For each grid cell, sample the pixel at its centre.
const sampled = []; // flat RGBA arrays, length ROWS*COLS
for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    const px = Math.min(Math.floor(((col + 0.5) * width) / COLS), width - 1);
    const py = Math.min(Math.floor(((row + 0.5) * height) / ROWS), height - 1);
    const i = (py * width + px) * 4;
    const a = data[i + 3];
    // Treat fully-transparent pixels as white
    if (a < 10) {
      sampled.push([255, 255, 255, 255]);
    } else {
      sampled.push([data[i], data[i + 1], data[i + 2], 255]);
    }
  }
}

// ─── Color quantization ───────────────────────────────────────────────────────

// Collect unique colors with frequency counts.
const colorMap = new Map(); // key: 'r,g,b' → { r, g, b, count }
for (const [r, g, b] of sampled) {
  const key = `${r},${g},${b}`;
  if (colorMap.has(key)) colorMap.get(key).count++;
  else colorMap.set(key, { r, g, b, count: 1 });
}

let palette = [...colorMap.values()];

// Merge similar colors until we're at MAX_COLORS.
// Each iteration: find the pair with smallest RGB Euclidean distance,
// merge the less-frequent one into the more-frequent one.
const rgbDist = (a, b) => Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);

while (palette.length > MAX_COLORS) {
  let minDist = Infinity,
    mergeA = 0,
    mergeB = 1;
  for (let i = 0; i < palette.length; i++) {
    for (let j = i + 1; j < palette.length; j++) {
      const d = rgbDist(palette[i], palette[j]);
      if (d < minDist) {
        minDist = d;
        mergeA = i;
        mergeB = j;
      }
    }
  }
  // Merge B into A (keep A, remove B)
  palette[mergeA].count += palette[mergeB].count;
  // Weighted-average the color
  const total = palette[mergeA].count;
  palette[mergeA].r = Math.round(
    (palette[mergeA].r * (total - palette[mergeB].count) + palette[mergeB].r * palette[mergeB].count) / total
  );
  palette[mergeA].g = Math.round(
    (palette[mergeA].g * (total - palette[mergeB].count) + palette[mergeB].g * palette[mergeB].count) / total
  );
  palette[mergeA].b = Math.round(
    (palette[mergeA].b * (total - palette[mergeB].count) + palette[mergeB].b * palette[mergeB].count) / total
  );
  palette.splice(mergeB, 1);
}

// Sort by frequency: most frequent = index 0 (typically the background).
palette.sort((a, b) => b.count - a.count);

// ─── Map each sampled cell to its nearest palette index ───────────────────────

const cellToIdx = sampled.map(([r, g, b]) => {
  let best = 0,
    bestDist = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const d = rgbDist({ r, g, b }, palette[i]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
});

// ─── Build pattern rows (one string per row, chars = color indices) ───────────

const patternRows = [];
for (let row = 0; row < ROWS; row++) {
  patternRows.push(cellToIdx.slice(row * COLS, (row + 1) * COLS).join(''));
}

// ─── Palette hex strings ──────────────────────────────────────────────────────

const toHex = ({ r, g, b }) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

const paletteHex = palette.map(toHex);

// ─── Build output ─────────────────────────────────────────────────────────────

const paletteLinesYaml = paletteHex.map((h) => `    - "${h}"`).join('\n');
const labelsYaml =
  FORCE_RULE === 'direct'
    ? paletteHex.map((_, i) => `    - "${i + 1}"`).join('\n')
    : paletteHex.map((_, i) => `    - "Couleur ${i}"`).join('\n');
const patternYaml = patternRows.map((r) => `    - "${r}"`).join('\n');

// Build rule block
const MIN_NUM = 1;
const MAX_NUM = 20;
let ruleBlock;
if (FORCE_RULE === 'direct') {
  // Simplest paint-by-number: cell shows 1, 2, 3… student matches to legend.
  ruleBlock = `  rule: direct`;
} else if (paletteHex.length <= 2) {
  ruleBlock = `  rule: pairs          # TODO: choisir la règle — pairs | impairs | multiples-of | direct | lt | gt
  # value: 3           # requis pour multiples-of, lt, gt
  min: ${MIN_NUM}
  max: ${MAX_NUM}`;
} else {
  const N = paletteHex.length;
  const span = MAX_NUM - MIN_NUM + 1;
  const band = Math.ceil(span / N);
  const rangesYaml = paletteHex
    .map((_, i) => {
      const lo = MIN_NUM + i * band;
      const hi = Math.min(lo + band - 1, MAX_NUM);
      return `    - [${lo}, ${hi}]`;
    })
    .join('\n');
  ruleBlock = `  rule: ranges         # TODO: ajuster les plages selon le dessin
  min: ${MIN_NUM}
  max: ${MAX_NUM}
  ranges:              # une plage [min, max] par couleur (index 0, 1, 2, …)
${rangesYaml}`;
}

const md = `---
type: magic-color
title: "Colorie le dessin."
generator: magicColorGrid
repeat: ${REPEAT}
params:
${ruleBlock}
  palette:
${paletteLinesYaml}
  labels:
${labelsYaml}
  pattern:
${patternYaml}
---
`;

// ─── Output ───────────────────────────────────────────────────────────────────

if (OUTPUT) {
  fs.writeFileSync(OUTPUT, md, 'utf8');
  console.log(`Written to ${OUTPUT}`);
  console.log(`Palette (${paletteHex.length} colors): ${paletteHex.join('  ')}`);
  console.log(`Grid: ${COLS}×${ROWS} = ${COLS * ROWS} cells`);
  console.log(`\nTODO: update rule:, labels:, min:, max: in the output file.`);
} else {
  process.stdout.write(md);
}
