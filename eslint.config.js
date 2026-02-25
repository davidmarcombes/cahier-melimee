const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  // Global ignores
  { ignores: ['node_modules/', '_site/', '_docs/', 'dist/', 'tailwind.config.js'] },

  // Node.js files (CommonJS)
  {
    files: ['.eleventy.js', 'postcss.config.js', 'scripts/**/*.js', 'src/_data/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },

  // Browser files (Alpine.js globals)
  {
    files: ['src/assets/js/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        ...globals.browser,
        Alpine: 'readonly',
        PocketBase: 'readonly',
        module: 'readonly', // dual-export pattern in generators.js
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Functions are called from inline HTML (Alpine x-data), not from JS
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^(seriesPlayer|themeToggle|challengePlayer)$' }],
    },
  },
];
