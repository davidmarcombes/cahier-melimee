#!/usr/bin/env node
/**
 * pixelate-image.js
 * Resize any image to N×M pixels, quantize to K colours, output a scaled-up
 * PNG that is easy to edit in any image editor before feeding to
 * image-to-magic-color.js.
 *
 * Usage:
 *   node scripts/pixelate-image.js <input> [options]
 *
 * Options:
 *   --cols=N      Grid width  in pixels (default: 12)
 *   --rows=N      Grid height in pixels (default: 12)
 *   --colors=N    Number of colours in output palette (default: 6)
 *   --output=FILE Output PNG path (default: <input>-pixel.png)
 *
 * Requires jimp (dev dep):
 *   npm install --save-dev jimp@0.22.12
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ─── Args ─────────────────────────────────────────────────────────────────────

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
    'Usage: node scripts/pixelate-image.js <input> [--cols=12] [--rows=12] [--colors=6] [--output=out.png]'
  );
  process.exit(1);
}
if (!fs.existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  process.exit(1);
}

let Jimp, PNG;
try {
  Jimp = require('jimp');
} catch {
  console.error('Missing dependency. Run:  npm install --save-dev jimp@0.22.12');
  process.exit(1);
}
try {
  ({ PNG } = require('pngjs'));
} catch {
  console.error('Missing dependency. Run:  npm install --save-dev pngjs');
  process.exit(1);
}

const COLS = parseInt(flags.cols ?? 12, 10);
const ROWS = parseInt(flags.rows ?? 12, 10);
const NCOLORS = parseInt(flags.colors ?? 6, 10);
const ext = path.extname(inputPath);
const OUTPUT = flags.output ?? inputPath.replace(ext, `-pixel.png`);

// ─── Load & resize ────────────────────────────────────────────────────────────

(async () => {
  const image = await Jimp.read(inputPath);
  const { width, height } = image.bitmap;

  const rgbDist = (a, b) => Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);

  // ─── Step 1: build palette from the full-resolution original ─────────────
  // Collect every unique colour from the source image with frequency counts.

  const colorMap = new Map();
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const hex = image.getPixelColor(px, py);
      const a = hex & 0xff;
      if (a < 10) continue; // skip transparent
      const r = (hex >>> 24) & 0xff;
      const g = (hex >>> 16) & 0xff;
      const b = (hex >>> 8) & 0xff;
      const key = `${r},${g},${b}`;
      if (colorMap.has(key)) colorMap.get(key).count++;
      else colorMap.set(key, { r, g, b, count: 1 });
    }
  }

  let palette = [...colorMap.values()];

  // Greedy merge: repeatedly merge the two closest colours until ≤ NCOLORS.
  while (palette.length > NCOLORS) {
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
    // Keep the more-frequent entry's colour — avoids anti-aliasing drifting pure colours.
    if (palette[mergeB].count > palette[mergeA].count) {
      palette[mergeA].r = palette[mergeB].r;
      palette[mergeA].g = palette[mergeB].g;
      palette[mergeA].b = palette[mergeB].b;
    }
    palette[mergeA].count += palette[mergeB].count;
    palette.splice(mergeB, 1);
  }

  palette.sort((a, b) => b.count - a.count);

  // ─── Step 2: map every source pixel to its nearest palette colour ─────────

  const nearestPalette = (r, g, b) => {
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
  };

  // ─── Step 3: for each output cell, majority-vote among source pixels ──────

  const cellColors = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x0 = Math.floor((col * width) / COLS);
      const x1 = Math.floor(((col + 1) * width) / COLS);
      const y0 = Math.floor((row * height) / ROWS);
      const y1 = Math.floor(((row + 1) * height) / ROWS);
      const votes = new Array(NCOLORS).fill(0);
      let transparent = 0;
      for (let py = y0; py < y1; py++) {
        for (let px = x0; px < x1; px++) {
          const hex = image.getPixelColor(px, py);
          const a = hex & 0xff;
          if (a < 10) {
            transparent++;
            continue;
          }
          const r = (hex >>> 24) & 0xff;
          const g = (hex >>> 16) & 0xff;
          const b = (hex >>> 8) & 0xff;
          votes[nearestPalette(r, g, b)]++;
        }
      }
      const total = votes.reduce((s, v) => s + v, 0);
      // If mostly transparent, use the most-frequent palette colour (background)
      if (transparent > total) {
        cellColors.push(palette[0]);
      } else {
        const winner = votes.indexOf(Math.max(...votes));
        cellColors.push(palette[winner]);
      }
    }
  }

  // ─── Write PNG at exact pixel size ───────────────────────────────────────

  const png = new PNG({ width: COLS, height: ROWS, filterType: -1 });

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const { r, g, b } = cellColors[row * COLS + col];
      const i = (row * COLS + col) * 4;
      png.data[i] = r;
      png.data[i + 1] = g;
      png.data[i + 2] = b;
      png.data[i + 3] = 255;
    }
  }

  const buf = PNG.sync.write(png);
  fs.writeFileSync(OUTPUT, buf);

  const toHex = ({ r, g, b }) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  console.log(`Written: ${OUTPUT}  (${COLS}×${ROWS} px)`);
  console.log(`Colours: ${palette.map(toHex).join('  ')}`);
  console.log(`\nEdit ${OUTPUT} in your image editor (zoom in — it's ${COLS}×${ROWS} px), then run:`);
  console.log(
    `  node scripts/image-to-magic-color.js ${OUTPUT} --cols=${COLS} --rows=${ROWS} --max-colors=${NCOLORS} --rule=direct`
  );
})();
