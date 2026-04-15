#!/usr/bin/env node
'use strict';

/**
 * minify.js — post-eleventy minification step
 *
 * Minifies HTML (via html-minifier-terser) and JS (via terser) in-place
 * inside _site/. CSS is already minified by tailwindcss --minify.
 *
 * Run after `eleventy` and `build:css`, before `generate:sw`.
 */

const fs   = require('fs');
const path = require('path');
const { minify: minifyHtml } = require('html-minifier-terser');
const { minify: minifyJs }   = require('terser');

const SITE_DIR = path.resolve(__dirname, '..', '_site');

const HTML_OPTIONS = {
  collapseWhitespace: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  useShortDoctype: true,
  minifyCSS: true,
  minifyJS: true,
  // Keep Alpine x-data / x-bind strings intact — they're not JS
  // html-minifier-terser processes <script> blocks only; Alpine attrs are safe
};

const JS_OPTIONS = {
  compress: { passes: 2 },
  mangle: true,
  format: { comments: false },
};

// Files/dirs to skip for JS minification (already minified or non-source)
const JS_SKIP = new Set(['dev.js']);

let htmlCount = 0, htmlSaved = 0;
let jsCount   = 0, jsSaved   = 0;
const errors  = [];

async function processHtml(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  try {
    const result = await minifyHtml(original, HTML_OPTIONS);
    fs.writeFileSync(filePath, result, 'utf8');
    htmlSaved += original.length - result.length;
    htmlCount++;
  } catch (e) {
    errors.push({ file: path.relative(SITE_DIR, filePath), error: e.message });
  }
}

async function processJs(filePath) {
  const name = path.basename(filePath);
  if (JS_SKIP.has(name)) return;
  const original = fs.readFileSync(filePath, 'utf8');
  try {
    const result = await minifyJs(original, JS_OPTIONS);
    if (result.code) {
      fs.writeFileSync(filePath, result.code, 'utf8');
      jsSaved += original.length - result.code.length;
      jsCount++;
    }
  } catch (e) {
    errors.push({ file: path.relative(SITE_DIR, filePath), error: e.message });
  }
}

function collectFiles(dir, ext) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full, ext));
    else if (entry.name.endsWith(ext)) out.push(full);
  }
  return out;
}

async function main() {
  const t0 = Date.now();
  console.log('[minify] Starting…');

  const htmlFiles = collectFiles(SITE_DIR, '.html');
  const jsFiles   = collectFiles(path.join(SITE_DIR, 'assets', 'js'), '.js');

  await Promise.all(htmlFiles.map(processHtml));
  await Promise.all(jsFiles.map(processJs));

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const kb = (n) => (n / 1024).toFixed(0) + ' KB';

  console.log(`[minify] HTML: ${htmlCount} files, saved ${kb(htmlSaved)}`);
  console.log(`[minify] JS:   ${jsCount} files, saved ${kb(jsSaved)}`);
  console.log(`[minify] Done in ${elapsed}s`);

  if (errors.length) {
    console.warn(`[minify] ${errors.length} error(s):`);
    errors.forEach(e => console.warn(`  ${e.file}: ${e.error}`));
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
