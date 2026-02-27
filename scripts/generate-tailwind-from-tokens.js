#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const tokensPath = path.join(__dirname, '..', 'design-tokens.json');
const tailwindConfigPath = path.join(__dirname, '..', 'tailwind.config.js');
const inputCssPath = path.join(__dirname, '..', 'src', 'css', 'input.css');

// Read design tokens
let tokens;
try {
  tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
} catch (error) {
  console.error('❌ Error reading design-tokens.json:', error.message);
  process.exit(1);
}

// Process colors to separate static colors from dynamic ones (light/dark)
const tailwindColors = {};
const lightVars = [];
const darkVars = [];

// Short CSS variable names to reduce output size
const varAliases = {
  'surface-default': 'sf',
  'surface-chrome': 'sc',
  'surface-subtle': 'ss',
  'content-default': 'ct',
  'content-subtle': 'cs',
};

function processColors(obj, prefix = '') {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}-${key}` : key;

    if (typeof value === 'object' && value.light && value.dark) {
      // Dynamic color (Semantic) — use short alias if available
      const varName = `--${varAliases[fullKey] || 'color-' + fullKey}`;
      lightVars.push(`${varName}: ${value.light};`);
      darkVars.push(`${varName}: ${value.dark};`);

      // Inject into Tailwind as a variable reference
      let current = tailwindColors;
      const parts = fullKey.split('-');
      for (let i = 0; i < parts.length - 1; i++) {
        current[parts[i]] = current[parts[i]] || {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = `var(${varName})`;
    } else if (typeof value === 'object') {
      // Nested palette
      processColors(value, fullKey);
    } else {
      // Static color
      let current = tailwindColors;
      const parts = fullKey.split('-');
      for (let i = 0; i < parts.length - 1; i++) {
        current[parts[i]] = current[parts[i]] || {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
    }
  }
}

if (tokens.colors) processColors(tokens.colors);

// Generate CSS variables file
const cssContent = `/* Auto-generated from design-tokens.json */
:root {
  ${lightVars.join('\n  ')}
}

.dark {
  ${darkVars.join('\n  ')}
}
`;

// Generate Tailwind config
const config = `/** @type {import('tailwindcss').Config} */
// This file is auto-generated from design-tokens.json
module.exports = {
  content: ['./src/**/*.{html,njk,md,js,svg}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: ${JSON.stringify(tailwindColors, null, 2)},
      fontFamily: ${JSON.stringify(tokens.typography?.fonts || {}, null, 2)},
      fontSize: ${JSON.stringify(tokens.typography?.sizes || {}, null, 2)},
      spacing: ${JSON.stringify(tokens.spacing || {}, null, 2)}
    }
  },
  plugins: []
};
`;

// Inject CSS variables directly into input.css between marker comments
const cssVarsBlock = [
  '/* BEGIN:design-tokens */',
  '@layer base {',
  '  :root {',
  ...lightVars.map(v => `    ${v}`),
  '  }',
  '  .dark {',
  ...darkVars.map(v => `    ${v}`),
  '  }',
  '}',
  '/* END:design-tokens */'
].join('\n');

try {
  let inputCss = fs.readFileSync(inputCssPath, 'utf8');
  // Replace existing block if present, otherwise append after @font-face declarations
  if (inputCss.includes('/* BEGIN:design-tokens */')) {
    inputCss = inputCss.replace(
      /\/\* BEGIN:design-tokens \*\/[\s\S]*?\/\* END:design-tokens \*\//,
      cssVarsBlock
    );
  } else {
    // Insert before @tailwind base
    inputCss = inputCss.replace('@tailwind base;', cssVarsBlock + '\n\n@tailwind base;');
  }
  fs.writeFileSync(inputCssPath, inputCss);
  fs.writeFileSync(tailwindConfigPath, config);
  console.log('\u2705 Generated tailwind.config.js and injected CSS variables into input.css');
} catch (error) {
  console.error('\u274c Error writing files:', error.message);
  process.exit(1);
}