#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const tokensPath = path.join(__dirname, '..', 'design-tokens.json');
const outputPath = path.join(__dirname, '..', 'tailwind.config.js');

// Read design tokens
let tokens;
try {
  tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
} catch (error) {
  console.error('❌ Error reading design-tokens.json:', error.message);
  console.error('Make sure design-tokens.json exists in the project root.');
  process.exit(1);
}

// Basic validation and defaults
if (typeof tokens !== 'object' || tokens === null) {
  console.error('❌ design-tokens.json must be an object');
  process.exit(1);
}

if (!tokens.colors || Object.keys(tokens.colors).length === 0) {
  console.warn('⚠️  No colors found in design-tokens.json - injecting a default primary color');
  tokens.colors = { primary: { 500: '#005af0' } };
}

if (!tokens.typography || !tokens.typography.fonts) {
  console.warn('⚠️  No typography.fonts found - adding sensible defaults');
  tokens.typography = tokens.typography || {};
  tokens.typography.fonts = tokens.typography.fonts || {
    sans: ['Inter', 'system-ui', 'sans-serif']
  };
}

// Generate Tailwind config (with helpful comments)
const config = `/** @type {import('tailwindcss').Config} */
// This file is auto-generated from design-tokens.json
// Do not edit manually - run 'npm run tokens' to regenerate
// If you need customizations, update design-tokens.json or extend this generator

module.exports = {
  content: [
    './src/**/*.{html,njk,md,js}',
    './src/**/*.svg'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Colors are generated from design-tokens.json
      colors: ${JSON.stringify(tokens.colors || {}, null, 2)},
      // Font families (object mapping like { sans: ['Inter', ...] })
      fontFamily: ${JSON.stringify(tokens.typography?.fonts || {}, null, 2)},
      // Optional tokens
      fontSize: ${JSON.stringify(tokens.typography?.sizes || {}, null, 2)},
      spacing: ${JSON.stringify(tokens.spacing || {}, null, 2)},
      animation: ${JSON.stringify(tokens.animations || {}, null, 2)},
      keyframes: ${JSON.stringify(tokens.keyframes || {}, null, 2)}
    }
  },
  plugins: [require('@tailwindcss/typography')]
};
`;

// Write Tailwind config
try {
    fs.writeFileSync(outputPath, config);
    console.log('✅ Generated tailwind.config.js from design-tokens.json');
} catch (error) {
    console.error('❌ Error writing tailwind.config.js:', error.message);
    process.exit(1);
}