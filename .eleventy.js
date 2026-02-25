require('dotenv').config();
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

  // Recursively find all index.yaml files under a directory
  function findIndexYamls(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        results.push(...findIndexYamls(path.join(dir, entry.name)));
      } else if (entry.name === 'index.yaml') {
        results.push(path.join(dir, entry.name));
      }
    }
    return results;
  }

  // Track series missing IDs for the post-build warning
  const missingSeriesIds = [];

  // Build list of unique series for both exercices and applications
  eleventyConfig.addCollection('seriesMeta', function () {
    const folders = ['exercices', 'applications'];
    const result = [];

    folders.forEach(folder => {
      const dir = path.join('src/fr', folder);
      const yamlFiles = findIndexYamls(dir);

      for (const yamlPath of yamlFiles) {
        const meta = yaml.load(fs.readFileSync(yamlPath, 'utf8'));
        const seriesDir = path.dirname(yamlPath);
        const relPath = path.relative(dir, seriesDir).replace(/\\/g, '/');
        // relPath e.g. "ce1/maths/logique/grille-01"
        const parts = relPath.split('/');
        // parts[0]=level, parts[1]=subject(maths), parts[2]=topic

        if (!meta.id) {
          missingSeriesIds.push(path.join(folder, relPath).replace(/\\/g, '/'));
          continue; // No page generated without an ID
        }

        result.push({
          series: relPath,
          id: meta.id,
          seriesTitle: meta.seriesTitle || path.basename(seriesDir),
          level: (parts[0] || '').toUpperCase(),
          topic: parts[1] || '',
          subtopic: parts[2] || '',
          skill: meta.skill || '',
          difficulty: meta.difficulty || '',
          folder: folder
        });
      }
    });
    return result;
  });

  // Get exercises for a specific series (matched by relative path), sorted by filename
  eleventyConfig.addFilter('seriesExercises', function (collection, seriesName) {
    if (!seriesName) return [];
    const normalized = seriesName.replace(/\\/g, '/');
    return collection
      .filter(item => {
        const dir = path.dirname(item.inputPath).replace(/\\/g, '/');
        return dir.endsWith('/' + normalized);
      })
      .sort((a, b) => a.inputPath.localeCompare(b.inputPath));
  });

  // Extract unique exercise types from a series (for conditional template includes)
  eleventyConfig.addFilter('extractTypes', function (exercises) {
    return [...new Set(exercises.map(ex => ex.data.type || 'number-check'))];
  });

  // Convert exercises to a JSON payload for the Alpine.js seriesPlayer component
  eleventyConfig.addFilter('seriesPayload', function (exercises) {
    const payload = [];
    const helpers = {
      rand: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
      pick: (...args) => args[Math.floor(Math.random() * args.length)]
    };

    exercises.forEach(ex => {
      const repeat = ex.data.repeat || 1;

      // For generator-based exercises, emit a single placeholder (runtime expands + fills)
      if (ex.data.generator) {
        payload.push({
          title: ex.data.title || '',
          type: ex.data.type || 'number-check',
          body: (ex.templateContent || '').trim(),
          _gen: { name: ex.data.generator, params: ex.data.params || {}, count: repeat }
        });
        return; // skip to next exercise
      }

      for (let r = 0; r < repeat; r++) {
        // 1. Generate variables for this instance
        let vars = {};

        if (ex.data.vars) {
          ex.data.vars.forEach(v => {
            if (v.formula) {
              try {
                const keys = [...Object.keys(helpers), ...Object.keys(vars)];
                const vals = [...Object.values(helpers), ...Object.values(vars)];
                vars[v.name] = new Function(...keys, `return ${v.formula}`)(...vals);
              } catch (e) {
                console.error(`Error in variable formula [${v.name}]: ${v.formula} in ${ex.inputPath}`, e);
                vars[v.name] = v.formula;
              }
            } else if (v.min !== undefined && v.max !== undefined) {
              vars[v.name] = Math.floor(Math.random() * (v.max - v.min + 1)) + v.min;
            }
          });
        }

        // 2. Helper to interpolate strings using vars (supports {{ }} and [[ ]])
        const interpolate = (val) => {
          if (typeof val !== 'string') return val;
          return val.replace(/(?:\{\{|\[\[)\s*(.*?)\s*(?:\}\}|\]\])/g, (match, formula) => {
            try {
              const keys = [...Object.keys(helpers), ...Object.keys(vars)];
              const vals = [...Object.values(helpers), ...Object.values(vars)];
              const result = new Function(...keys, `return ${formula}`)(...vals);
              return result !== undefined ? String(result) : match;
            } catch (e) {
              // If it's not a valid expression, try simple variable replacement
              return vars[formula.trim()] !== undefined ? String(vars[formula.trim()]) : match;
            }
          });
        };

        // 3. Start building the item
        const item = {
          title: interpolate(ex.data.title || ''),
          type: ex.data.type || 'number-check',
          operation: interpolate(ex.data.operation || ''),
          body: interpolate((ex.templateContent || '').trim())
        };

        // 4. Handle answers (can be single or array)
        let answerRaw = ex.data.answer;
        if (typeof answerRaw === 'string') answerRaw = interpolate(answerRaw);
        else if (Array.isArray(answerRaw)) answerRaw = answerRaw.map(a => typeof a === 'string' ? interpolate(a) : a);

        item.answers = Array.isArray(answerRaw)
          ? answerRaw.map(v => String(v).trim().toLowerCase())
          : [String(answerRaw || '').trim().toLowerCase()];

        // 5. Specialized Type Handling
        if (ex.data.type === 'fraction') {
          item.fraction = {
            shape: ex.data.shape || 'circle',
            numerator: Number(interpolate(String(ex.data.numerator || 0))),
            denominator: Number(interpolate(String(ex.data.denominator || 1))),
            cols: ex.data.cols ? Number(interpolate(String(ex.data.cols))) : null,
            rows: ex.data.rows ? Number(interpolate(String(ex.data.rows))) : null
          };
        }

        if (ex.data.hour != null) item.hour = Number(interpolate(String(ex.data.hour)));
        if (ex.data.minute != null) item.minute = Number(interpolate(String(ex.data.minute)));

        if (ex.data.type === 'base-10') {
          const num = Number(interpolate(String(ex.data.number || 0)));
          const b = {
            number: num,
            hundreds: ex.data.hundreds != null ? Number(interpolate(String(ex.data.hundreds))) : null,
            tens: ex.data.tens != null ? Number(interpolate(String(ex.data.tens))) : null,
            ones: ex.data.ones != null ? Number(interpolate(String(ex.data.ones))) : null
          };
          const h = b.hundreds !== null ? b.hundreds : Math.floor(b.number / 100);
          const t = b.tens !== null ? b.tens : Math.floor((b.number % 100) / 10);
          const u = b.ones !== null ? b.ones : (b.number % 10);

          let svg = '';
          let currentX = 10;
          const baseY = 10;
          for (let i = 0; i < h; i++) {
            svg += `<use href="#block-hundred" x="${currentX}" y="${baseY}" width="120" height="120" />`;
            currentX += 115;
          }
          if (h > 0 && (t > 0 || u > 0)) currentX += 10;
          for (let i = 0; i < t; i++) {
            svg += `<use href="#block-ten" x="${currentX}" y="${baseY}" width="20" height="120" />`;
            currentX += 18;
          }
          if (t > 0 && u > 0) currentX += 10;
          const uCols = Math.ceil(u / 5);
          for (let i = 0; i < u; i++) {
            const row = i % 5;
            const col = Math.floor(i / 5);
            svg += `<use href="#block-unit" x="${currentX + col * 18}" y="${baseY + 100 - row * 12}" width="20" height="20" />`;
          }
          if (u > 0) currentX += uCols * 18;
          item.base10 = { ...b, markup: svg, width: currentX + 20 };
        }

        if (ex.data.pairs) {
          const processedPairs = ex.data.pairs.map(p => ({
            left: interpolate(String(p.left)),
            right: interpolate(String(p.right))
          }));
          const leftIndexed = processedPairs.map((p, i) => ({ label: p.left, origIdx: i }));
          const rightIndexed = processedPairs.map((p, i) => ({ label: p.right, origIdx: i }));
          for (let i = leftIndexed.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [leftIndexed[i], leftIndexed[j]] = [leftIndexed[j], leftIndexed[i]];
          }
          for (let i = rightIndexed.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rightIndexed[i], rightIndexed[j]] = [rightIndexed[j], rightIndexed[i]];
          }
          item.pairs = {
            left: leftIndexed.map(l => l.label),
            right: rightIndexed.map(r => r.label),
            answers: leftIndexed.map(l => rightIndexed.findIndex(r => r.origIdx === l.origIdx))
          };
        }

        if (ex.data.given && ex.data.answers) {
          item.sequence = {
            given: ex.data.given.map(n => interpolate(String(n))),
            answers: ex.data.answers.map(n => interpolate(String(n)))
          };
        }

        if (ex.data.type === 'bounding' && ex.data.number != null && ex.data.answers) {
          item.bounding = {
            number: interpolate(String(ex.data.number)),
            answers: ex.data.answers.map(n => interpolate(String(n)))
          };
        }

        if (ex.data.type === 'logic-grid' && ex.data.columns && ex.data.rows && ex.data.solution) {
          const cols = ex.data.columns.map(c => interpolate(String(c)));
          const rows = ex.data.rows.map(r => interpolate(String(r)));
          const solution = rows.map(r => cols.map(c => {
            const solValue = interpolate(String(ex.data.solution[c]));
            return solValue === r;
          }));
          item.grid = { columns: cols, rows: rows, solution: solution };
        }

        if (ex.data.type === 'pyramid' && ex.data.pyramid) {
          const rawRows = ex.data.pyramid.map(r => r.map(v => v == null ? null : Number(interpolate(String(v)))));
          const given = rawRows.map(r => r.map(v => v !== null));
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
          item.pyramid = { rows: [...rawRows].reverse(), given: [...given].reverse() };
        }

        if (ex.data.type === 'true-false' && ex.data.statements) {
          item.statements = ex.data.statements.map(s => ({
            text: interpolate(String(s.text)),
            answer: s.answer === true || interpolate(String(s.answer)) === 'true'
          }));
        }

        if (ex.data.type === 'multi-question' && ex.data.questions) {
          item.mqContext = ex.data.context ? interpolate(String(ex.data.context)) : '';
          item.mqQuestions = ex.data.questions.map(q => ({
            text: interpolate(String(q.text)),
            answer: interpolate(String(q.answer)).trim().toLowerCase()
          }));
        }

        if (ex.data.type === 'mcq' && ex.data.choices && ex.data.answer != null) {
          const correct = interpolate(String(ex.data.answer)).trim();
          const choices = ex.data.choices.map(c => interpolate(String(c)));
          for (let i = choices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [choices[i], choices[j]] = [choices[j], choices[i]];
          }
          item.mcqChoices = choices;
          item.mcqAnswer = choices.indexOf(correct);
        }

        if (ex.data.type === 'compare' && ex.data.comparisons) {
          item.comparisons = ex.data.comparisons.map(c => {
            const l = interpolate(String(c.left));
            const r = interpolate(String(c.right));
            return {
              left: l,
              right: r,
              answer: Number(l) < Number(r) ? '<' : '>'
            };
          });
        }

        if (ex.data.type === 'convert' && ex.data.items) {
          item.convert = {
            items: ex.data.items.map(it => ({
              prompt: interpolate(String(it.prompt)),
              unit: it.unit ? interpolate(String(it.unit)) : ''
            })),
            answers: ex.data.items.map(it => interpolate(String(it.answer)).trim())
          };
        }

        payload.push(item);
      }
    });

    return JSON.stringify(payload)
      .replace(/&quot;/g, '\\"') // Unescape HTML quotes that break JSON if decoded by browser
      .replace(/&apos;/g, "\\u0027") // Unescape HTML apostrophes
      .replace(/'/g, "\\u0027"); // Escape single quotes
  });

  // Convert grouped series list to a JSON payload for the seriesBrowser component
  eleventyConfig.addFilter('seriesListPayload', function (seriesList) {
    return JSON.stringify(seriesList.map(s => ({
      series: s.series, title: s.title, seriesUrl: s.seriesUrl,
      count: s.count, level: s.level, topic: s.topic,
      subtopic: s.subtopic, difficulty: s.difficulty
    }))).replace(/'/g, '\\u0027');
  });

  // Group exercises or applications by series for the listing page
  eleventyConfig.addFilter('groupBySeries', function (collection) {
    const metaCache = {};
    const groups = {};

    for (const item of collection) {
      const dirPath = path.dirname(item.inputPath).replace(/\\/g, '/');

      // Determine folder type and relative path within it
      let folder, relPath;
      const exIdx = dirPath.indexOf('/fr/exercices/');
      const appIdx = dirPath.indexOf('/fr/applications/');
      if (exIdx !== -1) {
        folder = 'exercices';
        relPath = dirPath.substring(exIdx + '/fr/exercices/'.length);
      } else if (appIdx !== -1) {
        folder = 'applications';
        relPath = dirPath.substring(appIdx + '/fr/applications/'.length);
      } else {
        continue;
      }

      // Skip items at the root (like series-pages.njk)
      if (!relPath) continue;

      const s = relPath; // Unique key is the relative path

      if (!groups[s]) {
        if (!metaCache[s]) {
          try {
            metaCache[s] = yaml.load(
              fs.readFileSync(path.join(dirPath.replace(/\//g, path.sep), 'index.yaml'), 'utf8')
            );
          } catch { metaCache[s] = {}; }
        }
        const meta = metaCache[s];
        const parts = relPath.split('/');

        groups[s] = {
          series: s,
          title: meta.seriesTitle || path.basename(dirPath),
          level: (parts[0] || '').toUpperCase(),
          topic: parts[1] || '',
          subtopic: parts[2] || '',
          skill: meta.skill || '',
          difficulty: meta.difficulty || '',
          count: 0,
          seriesUrl: meta.id ? `/fr/${folder}/${meta.id}/` : '#',
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

  // Applications collection (renamed from d\u00e9fis)
  eleventyConfig.addCollection('applications', function (collectionApi) {
    return collectionApi.getFilteredByTag('applications');
  });

  // Merge multiple collections into the series list
  eleventyConfig.addFilter('withMoreSeries', function (seriesList, extraGrouped) {
    return [...seriesList, ...(extraGrouped || [])];
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

  // Collect per-page size breakdown for the post-build report
  const pageSizes = [];
  eleventyConfig.addTransform('sizeReport', function (content, outputPath) {
    if (outputPath && outputPath.endsWith('.html')) {
      const total = Buffer.byteLength(content, 'utf8');
      const measure = (re) => (content.match(re) || [])
        .reduce((sum, m) => sum + Buffer.byteLength(m, 'utf8'), 0);

      pageSizes.push({
        path: outputPath,
        kb: (total / 1024).toFixed(1),
        svgBytes: measure(/<svg[\s\S]*?<\/svg>/gi),
        jsBytes: measure(/<script[\s\S]*?<\/script>/gi),
        imgBytes: measure(/src="data:image\/[^"]*"/gi),
        cssBytes: measure(/<style[\s\S]*?<\/style>/gi)
      });
    }
    return content;
  });

  // Post-build page size report + missing ID warning
  eleventyConfig.on('eleventy.after', () => {
    // Warn about series missing IDs
    if (missingSeriesIds.length > 0) {
      console.error('\n\x1b[31m' + '='.repeat(70));
      console.error('  WARNING: The following series are MISSING "id" in index.yaml');
      console.error('  No pages were generated for them!');
      console.error('='.repeat(70) + '\x1b[0m');
      missingSeriesIds.forEach(p => console.error(`  \x1b[31m- ${p}\x1b[0m`));
      console.error('\x1b[31m\nRun: npm run generate:ids\x1b[0m\n');
    }

    const sorted = pageSizes.sort((a, b) => b.kb - a.kb);
    const fmt = b => (b / 1024).toFixed(1) + 'k';
    const row = ({ path: p, kb, svgBytes, jsBytes, imgBytes, cssBytes }) => {
      const short = p.replace(process.cwd(), '').replace('/_site', '');
      console.log(
        short.padEnd(70) +
        (kb + 'k').padStart(8) +
        fmt(svgBytes).padStart(8) +
        fmt(jsBytes).padStart(8) +
        fmt(imgBytes).padStart(8) +
        fmt(cssBytes).padStart(8)
      );
    };

    const header = () => {
      console.log('\u2500'.repeat(110));
      console.log('Page'.padEnd(70) + 'Total'.padStart(8) + 'SVG'.padStart(8) + 'JS'.padStart(8) + 'IMG'.padStart(8) + 'CSS'.padStart(8));
      console.log('\u2500'.repeat(110));
    };

    const top10 = sorted.slice(0, 10);
    const bottom5 = sorted.slice(-5);
    const middle = sorted.slice(10, -5);

    console.log('\n\ud83d\udcca Page size report');

    console.log('\n\ud83d\udd34 Top 10 largest:');
    header();
    top10.forEach(row);

    if (middle.length > 0) {
      const avg = key => middle.reduce((a, p) => a + (key === 'kb' ? parseFloat(p[key]) : p[key]), 0) / middle.length;
      console.log(`\n\u26aa ${middle.length} pages not shown \u2014 averages:`);
      header();
      console.log(
        `(avg ${middle.length} pages)`.padEnd(70) +
        fmt(avg('kb') * 1024).padStart(8) +
        fmt(avg('svgBytes')).padStart(8) +
        fmt(avg('jsBytes')).padStart(8) +
        fmt(avg('imgBytes')).padStart(8) +
        fmt(avg('cssBytes')).padStart(8)
      );
    }

    console.log('\n\ud83d\udfe2 5 smallest:');
    header();
    bottom5.forEach(row);

    const total = key => pageSizes.reduce((a, p) => a + (key === 'kb' ? p.kb * 1024 : p[key]), 0);
    console.log('\n\ud83d\udce6 Site totals:');
    header();
    console.log(
      `${pageSizes.length} pages`.padEnd(70) +
      fmt(total('kb')).padStart(8) +
      fmt(total('svgBytes')).padStart(8) +
      fmt(total('jsBytes')).padStart(8) +
      fmt(total('imgBytes')).padStart(8) +
      fmt(total('cssBytes')).padStart(8)
    );
  });

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
