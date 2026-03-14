const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const INPUT_DIR = './_site';
const OUTPUT_DIR = './_zsite';
const TARGET_EXTENSIONS = ['.html', '.css', '.js', '.json', '.svg', '.txt', '.xml'];
const MIN_SIZE_BYTES = 1024;

let statsData = [];

function compressFile(filePath) {
  const stats = fs.statSync(filePath);
  const rel = path.relative(INPUT_DIR, filePath);
  const outDir = path.join(OUTPUT_DIR, path.dirname(rel));
  fs.mkdirSync(outDir, { recursive: true });

  const canCompress = stats.size >= MIN_SIZE_BYTES && TARGET_EXTENSIONS.includes(path.extname(filePath));

  if (!canCompress) {
    fs.copyFileSync(filePath, path.join(OUTPUT_DIR, rel));
    return;
  }

  const fileContent = fs.readFileSync(filePath);
  const compressed = zlib.brotliCompressSync(fileContent, {
    params: {
      [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
    },
  });

  fs.writeFileSync(path.join(OUTPUT_DIR, rel + '.br'), compressed);

  statsData.push({
    name: rel,
    original: stats.size,
    compressed: compressed.length,
    ratio: ((1 - compressed.length / stats.size) * 100).toFixed(2),
  });
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) walkDir(fullPath);
    else compressFile(fullPath);
  });
}

console.log(`🚀 Compressing ${INPUT_DIR} → ${OUTPUT_DIR} ...`);
fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
walkDir(INPUT_DIR);

console.log('\n--- 📊 BROTLI BUILD REPORT ---');

const totalOriginal = statsData.reduce((sum, f) => sum + f.original, 0);
const totalCompressed = statsData.reduce((sum, f) => sum + f.compressed, 0);

console.log(`Original Total:   ${(totalOriginal / 1024).toFixed(2)} KB`);
console.log(`Compressed Total: ${(totalCompressed / 1024).toFixed(2)} KB`);
console.log(`Overall Savings:  ${((1 - totalCompressed / totalOriginal) * 100).toFixed(2)}%`);

// --- 🏆 TOP 10 SAVINGS (BY PERCENTAGE) ---
console.log('\n--- 🏆 TOP 10 SAVINGS (BY %) ---');
console.table(
  statsData
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 10)
    .map((f) => ({
      File: f.name,
      'Saved %': `${f.ratio}%`,
      'Compressed Size': `${(f.compressed / 1024).toFixed(2)} KB`,
    }))
);

// --- 🏗️ THE HEAVYWEIGHTS (LARGEST FILES REMAINING) ---
console.log('\n--- 🏗️ THE HEAVYWEIGHTS (LARGEST POST-COMPRESSION) ---');
console.table(
  statsData
    .sort((a, b) => b.compressed - a.compressed)
    .slice(0, 10)
    .map((f) => ({
      File: f.name,
      'Final Size': `${(f.compressed / 1024).toFixed(2)} KB`,
      'Original Size': `${(f.original / 1024).toFixed(2)} KB`,
      'Compression Efficiency': `${f.ratio}%`,
    }))
);
