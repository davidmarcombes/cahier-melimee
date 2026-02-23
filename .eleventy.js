const Image = require('@11ty/eleventy-img');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
// HTML minification using html-minifier-terser
const htmlmin = require('html-minifier-terser');
const UpgradeHelper = require("@11ty/eleventy-upgrade-help");




module.exports = function (eleventyConfig) {
  // Passthrough static assets
  // Copy everything under src/assets so we can reference it at /assets/…
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });
  // Some browsers/OSes also look for icons at the site root; make sure
  // the favicons are available there too. This guarantees the three
  // files mentioned in the base layout are output during the build.
  eleventyConfig.addPassthroughCopy({
    'src/assets/images/favicon.ico': 'favicon.ico',
    'src/assets/images/favicon-32x32.png': 'favicon-32x32.png',
    'src/assets/images/apple-touch-icon.png': 'apple-touch-icon.png'
  });

  // Shortcode for responsive images
  eleventyConfig.addNunjucksAsyncShortcode('image', async function (src, alt = '', sizes = '100vw', cls = '', loading = 'lazy') {
    if (!alt) {
      throw new Error(`Missing "+alt+" on image from: ${src}`);
    }

    let metadata = await Image(src, {
      widths: [320, 640, 1024, 1600],
      formats: ['avif', 'webp', 'png'],
      outputDir: './_site/assets/images/',
      urlPath: '/assets/images/'
    });

    let imageAttributes = {
      alt,
      sizes,
      loading,
      decoding: 'async'
    };
    if (cls) imageAttributes.class = cls;

    return Image.generateHTML(metadata, imageAttributes);
  });

  // Shortcode for inline emojis/icons (SVG, GIF, PNG)
  eleventyConfig.addShortcode('emoji', function (name, alt = '') {
    return `<img src="/assets/images/${name}" alt="${alt}" class="emoji" loading="lazy" decoding="async">`;
  });

  // Basic passthrough copy for fonts
  eleventyConfig.addPassthroughCopy({ 'src/assets/fonts': 'assets/fonts' });


  // Add a simple filter
  eleventyConfig.addFilter('year', () => new Date().getFullYear());

  // JSON-encode a value for safe embedding in <script> tags
  eleventyConfig.addFilter('dump', (value) => JSON.stringify(value));

  // Add a date filter for Nunjucks (YYYY-MM-DD)
  eleventyConfig.addFilter('date', function (dateObj) {
    if (!dateObj) return '';
    // If dateObj is a string, convert to Date
    const d = typeof dateObj === 'string' ? new Date(dateObj) : dateObj;
    if (isNaN(d)) return '';
    return d.toISOString().slice(0, 10);
  });

  // Blog posts collection (newest first)
  eleventyConfig.addCollection('posts', function (collectionApi) {
    return collectionApi.getFilteredByTag('posts').reverse();
  });

  // Exercises collection (recursive to include series subdirectories)
  eleventyConfig.addCollection('exercices', function (collectionApi) {
    return collectionApi.getFilteredByGlob('src/fr/exercices/**/*.md');
  });

  // Build a list of unique series by scanning index.yaml files on disk
  eleventyConfig.addCollection('seriesMeta', function () {
    const dir = 'src/fr/exercices';
    const result = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const yamlPath = path.join(dir, entry.name, 'index.yaml');
      if (!fs.existsSync(yamlPath)) continue;
      const meta = yaml.load(fs.readFileSync(yamlPath, 'utf8'));
      result.push({
        series: entry.name,
        seriesTitle: meta.seriesTitle || entry.name,
        level: meta.level || '',
        topic: meta.topic || '',
        subtopic: meta.subtopic || '',
        skill: meta.skill || '',
        difficulty: meta.difficulty || ''
      });
    }
    return result;
  });

  // Get exercises for a specific series (matched by directory name), sorted by filename
  eleventyConfig.addFilter('seriesExercises', function (collection, seriesName) {
    if (!seriesName) return [];
    return collection
      .filter(item => path.basename(path.dirname(item.inputPath)) === seriesName)
      .sort((a, b) => a.inputPath.localeCompare(b.inputPath));
  });

  // Extract unique exercise types from a series (for conditional template includes)
  eleventyConfig.addFilter('extractTypes', function (exercises) {
    return [...new Set(exercises.map(ex => ex.data.type || 'number-check'))];
  });

  // Convert exercises to a JSON payload for the Alpine.js seriesPlayer component
  eleventyConfig.addFilter('seriesPayload', function (exercises) {
    const payload = exercises.map(ex => {
      const answerRaw = ex.data.answer;
      const answersList = Array.isArray(answerRaw)
        ? answerRaw.map(v => String(v).trim().toLowerCase())
        : [String(answerRaw || '').trim().toLowerCase()];

      const item = {
        title: ex.data.title || '',
        type: ex.data.type || 'number-check',
        operation: ex.data.operation || '',
        body: (ex.templateContent || '').trim(),
        answers: answersList
      };

      if (ex.data.type === 'fraction') {
        item.fraction = {
          shape: ex.data.shape || 'circle',
          numerator: Number(ex.data.numerator) || 0,
          denominator: Number(ex.data.denominator) || 1,
          cols: Number(ex.data.cols) || null,
          rows: Number(ex.data.rows) || null
        };
      }

      if (ex.data.hour != null) item.hour = ex.data.hour;
      if (ex.data.minute != null) item.minute = ex.data.minute;

      if (ex.data.type === 'base-10') {
        const b = {
          number: Number(ex.data.number) || 0,
          hundreds: ex.data.hundreds != null ? Number(ex.data.hundreds) : null,
          tens: ex.data.tens != null ? Number(ex.data.tens) : null,
          ones: ex.data.ones != null ? Number(ex.data.ones) : null
        };
        const h = b.hundreds !== null ? b.hundreds : Math.floor(b.number / 100);
        const t = b.tens !== null ? b.tens : Math.floor((b.number % 100) / 10);
        const u = b.ones !== null ? b.ones : (b.number % 10);

        let svg = '';
        let currentX = 10;
        const baseY = 10;

        // Hundreds (120x120 symbol)
        for (let i = 0; i < h; i++) {
          svg += `<use href="#block-hundred" x="${currentX}" y="${baseY}" width="120" height="120" />`;
          currentX += 115;
        }

        if (h > 0 && (t > 0 || u > 0)) currentX += 10;

        // Tens (20x120 symbol)
        for (let i = 0; i < t; i++) {
          svg += `<use href="#block-ten" x="${currentX}" y="${baseY}" width="20" height="120" />`;
          currentX += 18;
        }

        if (t > 0 && u > 0) currentX += 10;

        // Units (20x20 symbol)
        const uCols = Math.ceil(u / 5);
        for (let i = 0; i < u; i++) {
          const row = i % 5;
          const col = Math.floor(i / 5);
          // Grounded at baseY + 105 (end of bar contents)
          svg += `<use href="#block-unit" x="${currentX + col * 18}" y="${baseY + 100 - row * 12}" width="20" height="20" />`;
        }
        if (u > 0) currentX += uCols * 18;

        item.base10 = { ...b, markup: svg, width: currentX + 20 };
      }
      if (ex.data.pairs) {
        const leftIndexed = ex.data.pairs.map((p, i) => ({ label: String(p.left), origIdx: i }));
        const rightIndexed = ex.data.pairs.map((p, i) => ({ label: String(p.right), origIdx: i }));
        // Fisher-Yates shuffle both columns independently
        for (let i = leftIndexed.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [leftIndexed[i], leftIndexed[j]] = [leftIndexed[j], leftIndexed[i]];
        }
        for (let i = rightIndexed.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [rightIndexed[i], rightIndexed[j]] = [rightIndexed[j], rightIndexed[i]];
        }
        const left = leftIndexed.map(l => l.label);
        const right = rightIndexed.map(r => r.label);
        // answers[i] = index in shuffled right that matches shuffled left[i]
        const answers = leftIndexed.map(l => rightIndexed.findIndex(r => r.origIdx === l.origIdx));
        item.pairs = { left, right, answers };
      }
      if (ex.data.given && ex.data.answers) {
        item.sequence = {
          given: ex.data.given.map(n => String(n)),
          answers: ex.data.answers.map(n => String(n))
        };
      }
      if (ex.data.type === 'bounding' && ex.data.number != null && ex.data.answers) {
        item.bounding = {
          number: String(ex.data.number),
          answers: ex.data.answers.map(n => String(n))
        };
      }
      if (ex.data.type === 'logic-grid' && ex.data.columns && ex.data.rows && ex.data.solution) {
        const cols = ex.data.columns.map(String);
        const rows = ex.data.rows.map(String);
        const solution = rows.map(r => cols.map(c => ex.data.solution[c] === r));
        item.grid = { columns: cols, rows: rows, solution: solution };
      }
      if (ex.data.type === 'pyramid' && ex.data.pyramid) {
        // Parse rows (bottom-to-top in front-matter)
        const rawRows = ex.data.pyramid.map(r => r.map(v => v == null ? null : Number(v)));
        const given = rawRows.map(r => r.map(v => v !== null));
        // Constraint propagation: pyramid[r+1][c] = pyramid[r][c] + pyramid[r][c+1]
        let changed = true;
        while (changed) {
          changed = false;
          for (let r = 0; r < rawRows.length - 1; r++) {
            for (let c = 0; c < rawRows[r].length - 1; c++) {
              const l = rawRows[r][c], ri = rawRows[r][c + 1], p = rawRows[r + 1][c];
              if (l !== null && ri !== null && p === null) { rawRows[r + 1][c] = l + ri; changed = true; }
              if (p !== null && l !== null && ri === null) { rawRows[r][c + 1] = p - l; changed = true; }
              if (p !== null && ri !== null && l === null) { rawRows[r][c] = p - ri; changed = true; }
            }
          }
        }
        // Reverse to top-to-bottom for display
        const displayRows = [...rawRows].reverse();
        const displayGiven = [...given].reverse();
        item.pyramid = { rows: displayRows, given: displayGiven };
      }
      if (ex.data.type === 'true-false' && ex.data.statements) {
        item.statements = ex.data.statements.map(s => ({
          text: s.text,
          answer: !!s.answer
        }));
      }
      if (ex.data.type === 'multi-question' && ex.data.questions) {
        item.mqContext = ex.data.context ? String(ex.data.context) : '';
        item.mqQuestions = ex.data.questions.map(q => ({
          text: q.text,
          answer: String(q.answer).trim().toLowerCase()
        }));
      }
      if (ex.data.type === 'mcq' && ex.data.choices && ex.data.answer != null) {
        const correct = String(ex.data.answer).trim();
        const choices = ex.data.choices.map(String);
        // Fisher-Yates shuffle
        for (let i = choices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [choices[i], choices[j]] = [choices[j], choices[i]];
        }
        item.mcqChoices = choices;
        item.mcqAnswer = choices.indexOf(correct);
      }
      if (ex.data.type === 'compare' && ex.data.comparisons) {
        item.comparisons = ex.data.comparisons.map(c => ({
          left: String(c.left),
          right: String(c.right),
          answer: Number(c.left) < Number(c.right) ? '<' : '>'
        }));
      }
      if (ex.data.type === 'convert' && ex.data.items) {
        item.convert = {
          items: ex.data.items.map(it => ({
            prompt: String(it.prompt),
            unit: it.unit ? String(it.unit) : ''
          })),
          answers: ex.data.items.map(it => String(it.answer).trim())
        };
      }
      return item;
    });
    return JSON.stringify(payload)
      .replace(/&quot;/g, '\\"') // Unescape HTML quotes that break JSON if decoded by browser
      .replace(/&apos;/g, "\\u0027") // Unescape HTML apostrophes
      .replace(/'/g, '\\u0027'); // Escape single quotes
  });

  // Convert grouped series list to a JSON payload for the seriesBrowser component
  eleventyConfig.addFilter('seriesListPayload', function (seriesList) {
    return JSON.stringify(seriesList.map(s => ({
      series: s.series, title: s.title, seriesUrl: s.seriesUrl,
      count: s.count, level: s.level, topic: s.topic,
      subtopic: s.subtopic, difficulty: s.difficulty
    }))).replace(/'/g, '\\u0027');
  });

  // Group exercises by series for the listing page (reads metadata from index.yaml)
  eleventyConfig.addFilter('groupBySeries', function (collection) {
    const metaCache = {};
    const groups = {};
    for (const item of collection) {
      const s = path.basename(path.dirname(item.inputPath));
      if (s === 'exercices') continue;
      if (!groups[s]) {
        // Read series metadata from index.yaml
        if (!metaCache[s]) {
          try {
            metaCache[s] = yaml.load(fs.readFileSync(path.join('src/fr/exercices', s, 'index.yaml'), 'utf8'));
          } catch { metaCache[s] = {}; }
        }
        const meta = metaCache[s];
        groups[s] = {
          series: s,
          title: meta.seriesTitle || s,
          level: meta.level || '',
          topic: meta.topic || '',
          subtopic: meta.subtopic || '',
          skill: meta.skill || '',
          difficulty: meta.difficulty || '',
          count: 0,
          seriesUrl: '/fr/exercices/' + s + '/',
          exercises: []
        };
      }
      groups[s].count++;
      groups[s].exercises.push(item);
    }
    for (const g of Object.values(groups)) {
      g.exercises.sort((a, b) => a.inputPath.localeCompare(b.inputPath));
    }
    return Object.values(groups);
  });

  // Challenges collection (random operation défis)
  eleventyConfig.addCollection('defis', function (collectionApi) {
    return collectionApi.getFilteredByTag('defis');
  });

  // Merge défis into the series list so everything appears in one unified listing
  eleventyConfig.addFilter('withDefis', function (seriesList, defisCollection) {
    const defiItems = (defisCollection || []).map(item => ({
      series: item.fileSlug,
      title: item.data.title || '',
      seriesUrl: item.url,
      count: item.data.count || 10,
      level: item.data.level || '',
      topic: item.data.topic || '',
      subtopic: item.data.subtopic || '',
      difficulty: item.data.difficulty || ''
    }));
    return [...seriesList, ...defiItems];
  });

  // Transform to minify HTML in production builds
  eleventyConfig.addTransform('htmlmin', async function (content, outputPath) {
    if (outputPath && outputPath.endsWith('.html')) {
      try {
        return await htmlmin.minify(content, {
          collapseWhitespace: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeEmptyAttributes: true,
          minifyCSS: true,
          minifyJS: true,
          useShortDoctype: true
        });
      } catch (e) {
        // if minification fails, just return unminified content
        console.warn('HTML minification failed for', outputPath, e.message);
        return content;
      }
    }
    return content;
  });

  // Warn when generated HTML exceeds 20 KB (useful for performance monitoring)
  eleventyConfig.addTransform('sizeWarn', function (content, outputPath) {
    if (outputPath && outputPath.endsWith('.html')) {
      const size = Buffer.byteLength(content, 'utf8');
      const limit = 20 * 1024; // bytes
      if (size > limit) {
        const kb = (size / 1024).toFixed(1);
        console.warn(`⚠️  HTML file too large: ${outputPath} is ${kb} KB (limit 20 KB)`);
      }
    }
    return content;
  });


  // add this LAST
  // eleventyConfig.addPlugin(UpgradeHelper);

  // Ensure sitemap and robots are output (templates handle generation)

  return {
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
      layouts: '_layouts',
      data: '_data'
    }
  };
};
