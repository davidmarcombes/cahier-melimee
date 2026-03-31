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
  'primary-500': 'p',
  'accent-500': 'a',
  primary: 'p',
  accent: 'a',
  'figure-red': 'red',
  'figure-green': 'green',
  'figure-purple': 'purple',
  'figure-pink': 'pink',
  'figure-orange': 'orange',
  'b10-h': 'b10h',
  'b10-hs': 'b10hs',
  'b10-t': 'b10t',
  'b10-ts': 'b10ts',
  'b10-u': 'b10u',
  'b10-us': 'b10us'
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

      // If we just set 500, also set DEFAULT for better Tailwind support
      if (parts[parts.length - 1] === '500' && parts.length > 1) {
        const parentKey = parts.slice(0, -1).join('-');
        if (parentKey === 'primary' || parentKey === 'accent') {
          current['DEFAULT'] = `var(${varName})`;
        }
      }
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

      // If we just set 500, also set DEFAULT for better Tailwind support
      if (parts[parts.length - 1] === '500' && parts.length > 1) {
        const parentKey = parts.slice(0, -1).join('-');
        if (parentKey === 'primary' || parentKey === 'accent') {
          current['DEFAULT'] = value;
        }
      }
    }
  }
}

if (tokens.colors) processColors(tokens.colors);

// Generate CSS variables file
const cssContent = `/* DO NOT EDIT — auto-generated from design-tokens.json by scripts/generate-tailwind-from-tokens.js */
:root {
  ${lightVars.join('\n  ')}
}

.dark {
  ${darkVars.join('\n  ')}
}
`;

// Generate Tailwind config
const config = `/** @type {import('tailwindcss').Config} */
// DO NOT EDIT — auto-generated from design-tokens.json by scripts/generate-tailwind-from-tokens.js
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

const markerStart = '/* BEGIN:design-tokens */';
const markerEnd = '/* END:design-tokens */';

const cssVarsBlock = [
  markerStart,
  '@layer base {',
  '  :root {',
  ...lightVars.map((v) => `    ${v}`),
  '  }',
  '  .dark {',
  ...darkVars.map((v) => `    ${v}`),
  '  }',
  '}',
  markerEnd,
].join('\n');

try {
  let inputCss = fs.readFileSync(inputCssPath, 'utf8');
  // Remove any existing design-tokens blocks (including those with the old longer markers)
  inputCss = inputCss.replace(/\/\* BEGIN:design-tokens[\s\S]*?\/\* END:design-tokens \*\//g, '');

  // Clean up extra newlines that might have been left behind
  inputCss = inputCss.replace(/\n\n\n+/g, '\n\n');

  // Insert before @tailwind base
  if (inputCss.includes('@tailwind base;')) {
    inputCss = inputCss.replace('@tailwind base;', cssVarsBlock + '\n\n@tailwind base;');
  } else {
    // If somehow @tailwind base is missing, append to the end
    inputCss += '\n\n' + cssVarsBlock;
  }

  fs.writeFileSync(inputCssPath, inputCss);
  fs.writeFileSync(tailwindConfigPath, config);
  console.log('\u2705 Generated tailwind.config.js and injected CSS variables into input.css');
} catch (error) {
  console.error('\u274c Error writing files:', error.message);
  process.exit(1);
}
