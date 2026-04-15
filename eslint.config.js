const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  // Global ignores
  { ignores: ['node_modules/', '_site/', '_docs/', 'dist/', 'tailwind.config.js'] },

  // ESM scripts (use import/export)
  {
    files: ['scripts/svg-stats.js', 'scripts/check-build-urls.js'],
    languageOptions: { sourceType: 'module', globals: { ...globals.node } },
    rules: { ...js.configs.recommended.rules, 'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }] },
  },

  // Node.js files (CommonJS)
  {
    files: ['.eleventy.js', 'postcss.config.js', 'scripts/**/*.js', 'src/_data/**/*.js'],
    ignores: ['scripts/svg-stats.js', 'scripts/check-build-urls.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },

  // Browser files (Alpine.js modules & globals)
  {
    files: ['src/assets/js/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.browser,
        Alpine: 'readonly',
        PocketBase: 'readonly',
        module: 'readonly', // dual-export pattern in generators.js
        // SVG globals (browser only)
        circleSvg: 'readonly',
        rectangleSvg: 'readonly',
        squareSvg: 'readonly',
        triangleSvg: 'readonly',
        clockSvg: 'readonly',
        rulerSvg: 'readonly',
        abacusSvg: 'readonly',
        embedSvg: 'readonly',
        mathGridSvg: 'readonly',
        slicedPieSvg: 'readonly',
        fractionPieSvg: 'readonly',
        cubeSvg: 'readonly',
        sphereSvg: 'readonly',
        cylinderSvg: 'readonly',
        coneSvg: 'readonly',
        decompoChipsHtml: 'readonly',
        fractionShapesSvg: 'readonly',
        equilateralTriangleSvg: 'readonly',
        isoscelesTriangleSvg: 'readonly',
        rhombusSvg: 'readonly',
        parallelogramSvg: 'readonly',
        trapezoidSvg: 'readonly',
        regularPolygonSvg: 'readonly',
        cuboidSvg: 'readonly',
        triangularPrismSvg: 'readonly',
        squarePyramidSvg: 'readonly',
        tetrahedronSvg: 'readonly',
        rowsOfSvg: 'readonly',
        packetsOfSvg: 'readonly',
        rulerExerciseSvg: 'readonly',
        numberLineSvg: 'readonly',
        coordinateGridSvg: 'readonly',
        placeValueSvg: 'readonly',
        objectMeasureSvg: 'readonly',
        partagerSvg: 'readonly',
        jumpArrowSvg: 'readonly',
        scaleSvg: 'readonly',
        calendarSvg: 'readonly',
        decompTreeSvg: 'readonly',
        thermometerExerciseSvg: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Functions are called from inline HTML (Alpine x-data) or used as globals
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^(seriesPlayer|timedPlayer|themeToggle|challengePlayer|.*Svg)$',
        },
      ],
    },
  },
];
