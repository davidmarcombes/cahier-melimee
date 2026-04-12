require('dotenv').config();
const Image = require('@11ty/eleventy-img');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const pathPrefix = (process.env.PATH_PREFIX || '/').replace(/\/$/, '');
// HTML minification using html-minifier-terser
const htmlmin = require('html-minifier-terser');
const UpgradeHelper = require('@11ty/eleventy-upgrade-help');

const markdownIt = require('markdown-it');

// ── Shorthand renderer ───────────────────────────────────────────────────────
// Converts &funcName(arg1, arg2, ...) notation to HTML.
// Add entries here as new shorthands are needed.
const _shorthands = {
  frac: (n, d) => `<span class="frac"><span class="fn">${n}</span><span class="fd">${d}</span></span>`,
  box: (...parts) => `<span class="op-box">${parts.join(', ')}</span>`,
  highlight: (...parts) => `<span class="op-hl">${parts.join(', ')}</span>`,
};
function renderShorthands(str) {
  return str.replace(/&(\w+)\(([^)]*)\)/g, (match, fn, args) => {
    const f = _shorthands[fn];
    if (!f) return match; // unknown shorthand — leave as-is
    return f(...args.split(',').map((a) => a.trim()));
  });
}

// ── Bar Model SVG generator ──────────────────────────────────────────────────
function genBarModelSvg(bm) {
  const W = 360, PX = 20, BAR_H = 42, GAP = 12;
  const F = 'font-family="system-ui,sans-serif"';
  const ans = String(bm.answer ?? '');

  if (bm.mode === 'part-whole') {
    const wholeIsUnk = String(bm.whole) === '?';
    const wholeNum = wholeIsUnk ? parseFloat(ans) : parseFloat(String(bm.whole));
    const parts = (bm.parts || []).map(p => ({
      isUnk: String(p) === '?',
      val: String(p) === '?' ? parseFloat(ans) : parseFloat(String(p)),
      label: String(p),
    }));
    const hasPartLabels = bm.partLabels && bm.partLabels.length;
    const PY = 26;
    const SVG_H = PY + BAR_H + GAP + BAR_H + (hasPartLabels ? 22 : 10) + PY;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W + PX * 2} ${SVG_H}" role="img">`;
    if (bm.wholeLabel) s += `<text x="${PX}" y="14" font-size="11" fill="var(--cs)" ${F}>${bm.wholeLabel}</text>`;
    // Whole bar
    s += `<rect x="${PX}" y="${PY}" width="${W}" height="${BAR_H}" rx="5" fill="var(--p)" fill-opacity="0.2" stroke="var(--p)" stroke-width="2"/>`;
    s += `<text x="${PX + W / 2}" y="${PY + BAR_H / 2 + 6}" text-anchor="middle" font-size="17" font-weight="700" fill="var(--p)" ${F}>${wholeIsUnk ? '?' : String(bm.whole)}</text>`;
    // Parts
    const y2 = PY + BAR_H + GAP;
    const STROKES = ['var(--a)', 'var(--green)', 'var(--purple)'];
    let x = PX;
    for (let i = 0; i < parts.length; i++) {
      const pw = Math.max(4, (parts[i].val / wholeNum) * W);
      const stroke = parts[i].isUnk ? 'var(--cs)' : STROKES[i % STROKES.length];
      const fill = parts[i].isUnk ? 'var(--sc)' : stroke;
      const fillOp = parts[i].isUnk ? '1' : '0.2';
      const dash = parts[i].isUnk ? ' stroke-dasharray="6,4"' : '';
      s += `<rect x="${x + 1}" y="${y2}" width="${pw - 3}" height="${BAR_H}" rx="4" fill="${fill}" fill-opacity="${fillOp}" stroke="${stroke}" stroke-width="2"${dash}/>`;
      const tSize = parts[i].isUnk ? 22 : 15;
      s += `<text x="${x + 1 + (pw - 3) / 2}" y="${y2 + BAR_H / 2 + 6}" text-anchor="middle" font-size="${tSize}" font-weight="700" fill="${parts[i].isUnk ? 'var(--cs)' : stroke}" ${F}>${parts[i].label}</text>`;
      if (hasPartLabels && bm.partLabels[i]) s += `<text x="${x + 1 + (pw - 3) / 2}" y="${y2 + BAR_H + 16}" text-anchor="middle" font-size="10" fill="var(--cs)" ${F}>${bm.partLabels[i]}</text>`;
      x += pw;
    }
    s += '</svg>';
    return s;
  }

  if (bm.mode === 'comparison') {
    const refNum = parseFloat(String(bm.ref));
    const compIsUnk = String(bm.compared) === '?';
    const compNum = compIsUnk ? parseFloat(ans) : parseFloat(String(bm.compared));
    const maxNum = Math.max(refNum, compNum);
    const refW = (refNum / maxNum) * W;
    const compW = (compNum / maxNum) * W;
    const PY = 26;
    const diffH = Math.abs(refW - compW) > 10 ? 26 : 0;
    const SVG_H = PY + BAR_H + GAP + BAR_H + diffH + PY;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W + PX * 2} ${SVG_H}" role="img">`;
    const y1 = PY, y2 = PY + BAR_H + GAP;
    if (bm.refLabel) s += `<text x="${PX}" y="${y1 - 6}" font-size="11" fill="var(--cs)" ${F}>${bm.refLabel}</text>`;
    if (bm.compLabel) s += `<text x="${PX}" y="${y2 - 6}" font-size="11" fill="var(--cs)" ${F}>${bm.compLabel}</text>`;
    // Ref bar
    s += `<rect x="${PX}" y="${y1}" width="${refW}" height="${BAR_H}" rx="5" fill="var(--p)" fill-opacity="0.2" stroke="var(--p)" stroke-width="2"/>`;
    s += `<text x="${PX + refW / 2}" y="${y1 + BAR_H / 2 + 6}" text-anchor="middle" font-size="16" font-weight="700" fill="var(--p)" ${F}>${bm.ref}</text>`;
    // Compared bar
    const cStroke = compIsUnk ? 'var(--cs)' : 'var(--a)';
    const cFill = compIsUnk ? 'var(--sc)' : 'var(--a)';
    const cDash = compIsUnk ? ' stroke-dasharray="6,4"' : '';
    s += `<rect x="${PX}" y="${y2}" width="${compW}" height="${BAR_H}" rx="5" fill="${cFill}" fill-opacity="${compIsUnk ? '1' : '0.2'}" stroke="${cStroke}" stroke-width="2"${cDash}/>`;
    s += `<text x="${PX + compW / 2}" y="${y2 + BAR_H / 2 + 6}" text-anchor="middle" font-size="${compIsUnk ? 22 : 16}" font-weight="700" fill="${cStroke}" ${F}>${bm.compared}</text>`;
    // Difference bracket
    if (diffH > 0) {
      const minW = Math.min(refW, compW), maxW = Math.max(refW, compW);
      const by = y2 + BAR_H + 6;
      s += `<line x1="${PX + minW}" y1="${by}" x2="${PX + maxW}" y2="${by}" stroke="var(--cs)" stroke-width="1.5"/>`;
      s += `<line x1="${PX + minW}" y1="${by - 4}" x2="${PX + minW}" y2="${by + 4}" stroke="var(--cs)" stroke-width="1.5"/>`;
      s += `<line x1="${PX + maxW}" y1="${by - 4}" x2="${PX + maxW}" y2="${by + 4}" stroke="var(--cs)" stroke-width="1.5"/>`;
      const dl = bm.diffLabel || (bm.diff !== undefined ? String(bm.diff) : '?');
      s += `<text x="${PX + (minW + maxW) / 2}" y="${by + 16}" text-anchor="middle" font-size="12" font-weight="600" fill="var(--cs)" ${F}>${dl}</text>`;
    }
    s += '</svg>';
    return s;
  }
  return '';
}

module.exports = async function (eleventyConfig) {
  // LaTeX support using MathML (Zero-runtime JS/CSS on client)
  const mathPlugin = (await import('@peaceroad/markdown-it-math-tex-to-mathml')).default;
  const md = markdownIt({
    html: true,
    breaks: true,
    linkify: true,
  }).use(mathPlugin);

  eleventyConfig.setLibrary('md', md);

  // Filter to render strings that contain LaTeX (useful for frontmatter)
  eleventyConfig.addFilter('renderMath', (content) => {
    if (!content) return '';
    // Use renderInline if it's likely a short string, otherwise render
    return md.renderInline(String(content));
  });
  // Virtual template: sitemap (keeps src/ root free of .njk files)
  eleventyConfig.addTemplate(
    'sitemap.xml.njk',
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{% for page in collections.all %}
  {% if page.url and page.url != '/404/' %}
  <url>
    <loc>{{ site.url }}{{ page.url }}</loc>
    {% if page.date %}
  <lastmod>{{ page.date | date }}</lastmod>
    {% endif %}
  </url>
  {% endif %}
{% endfor %}
</urlset>`,
    { layout: null, permalink: '/sitemap.xml', eleventyExcludeFromCollections: true }
  );

  // Watch reports CSVs so validation changes trigger a live rebuild of the admin dashboard
  eleventyConfig.addWatchTarget('./reports/');

  // Passthrough static assets
  eleventyConfig.addPassthroughCopy({ 'src/.htaccess': '.htaccess' });
  // Copy everything under src/assets so we can reference it at /assets/…
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });
  // Some browsers/OSes also look for icons at the site root; make sure
  // the favicons are available there too. This guarantees the three
  // files mentioned in the base layout are output during the build.
  eleventyConfig.addPassthroughCopy({
    'src/assets/images/favicon.ico': 'favicon.ico',
    'src/assets/images/favicon-32x32.png': 'favicon-32x32.png',
    'src/assets/images/apple-touch-icon.png': 'apple-touch-icon.png',
  });

  // Shortcode for responsive images
  eleventyConfig.addNunjucksAsyncShortcode(
    'image',
    async function (src, alt = '', sizes = '100vw', cls = '', loading = 'lazy') {
      if (!alt) {
        throw new Error(`Missing "+alt+" on image from: ${src}`);
      }

      let metadata = await Image(src, {
        widths: [320, 640, 1024, 1600],
        formats: ['avif', 'webp', 'png'],
        outputDir: './_site/assets/images/',
        urlPath: `${pathPrefix}/assets/images/`,
      });

      let imageAttributes = {
        alt,
        sizes,
        loading,
        decoding: 'async',
      };
      if (cls) imageAttributes.class = cls;

      return Image.generateHTML(metadata, imageAttributes);
    }
  );

  // Shortcode for inline emojis/icons (SVG, GIF, PNG)
  eleventyConfig.addShortcode('emoji', function (name, alt = '') {
    return `<img src="${pathPrefix}/assets/images/${name}" alt="${alt}" class="emoji" loading="lazy" decoding="async">`;
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

  eleventyConfig.addCollection('defis', function (collectionApi) {
    return collectionApi.getFilteredByGlob('src/fr/defis/**/*.md');
  });

  // Timed challenges metadata (parallel to seriesMeta but for src/fr/defis/)
  eleventyConfig.addCollection('defisMeta', function () {
    const dir = path.join('src/fr', 'defis');
    const result = [];
    for (const yamlPath of findIndexYamls(dir)) {
      const meta = yaml.load(fs.readFileSync(yamlPath, 'utf8'));
      if (!meta.id) continue;
      const seriesDir = path.dirname(yamlPath);
      const relPath = path.relative(dir, seriesDir).replace(/\\/g, '/');
      const parts = relPath.split('/');
      result.push({
        series:      relPath,
        id:          meta.id,
        title: meta.title || path.basename(seriesDir),
        level:       (parts[0] || '').toUpperCase(),
        topic:       parts[1] || '',
        subtopic:    parts[2] || '',
        difficulty:  meta.difficulty || '',
        duration:    meta.duration   ?? 60,
        folder:      'defis',
        usedClasses: meta.class ? [String(meta.class).trim()] : [],
      });
    }
    return result;
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

    folders.forEach((folder) => {
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

        // Scan MD files in this series folder to collect exercise types and classes
        const mdFiles = fs.readdirSync(seriesDir).filter((f) => f.endsWith('.md'));
        const usedTypes = [
          ...new Set(
            mdFiles.flatMap((f) => {
              const content = fs.readFileSync(path.join(seriesDir, f), 'utf8');
              const m = content.match(/^type:\s*["']?([^"'\r\n]+)["']?/m);
              return m ? [m[1].trim()] : [];
            })
          ),
        ];
        const usedClasses = meta.class ? [String(meta.class).trim()] : [];

        result.push({
          series: relPath,
          id: meta.id,
          title: meta.title || path.basename(seriesDir),
          level: (parts[0] || '').toUpperCase(),
          topic: parts[1] || '',
          subtopic: parts[2] || '',
          difficulty: meta.difficulty || '',
          folder: folder,
          usedTypes,
          usedClasses,
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
      .filter((item) => {
        const dir = path.dirname(item.inputPath).replace(/\\/g, '/');
        return dir.endsWith('/' + normalized);
      })
      .sort((a, b) => a.inputPath.localeCompare(b.inputPath));
  });

  // Extract unique exercise types from a series (for conditional template includes)
  eleventyConfig.addFilter('extractTypes', function (exercises) {
    return [...new Set(exercises.map((ex) => ex.data.type || 'number-check'))];
  });

  // Convert exercises to a JSON payload for the Alpine.js seriesPlayer component
  eleventyConfig.addFilter('seriesPayload', function (exercises) {
    const payload = [];
    const helpers = {
      rand: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
      pick: (...args) => args[Math.floor(Math.random() * args.length)],
    };

    exercises.forEach((ex) => {
      const repeat = ex.data.repeat || 1;

      // For generator-based exercises, emit a single placeholder (runtime expands + fills)
      if (ex.data.generator) {
        payload.push({
          title: ex.data.title || '',
          type: ex.data.type || 'number-check',
          body: (ex.templateContent || '').trim(),
          _gen: { name: ex.data.generator, params: ex.data.params || {}, count: repeat },
        });
        return; // skip to next exercise
      }

      for (let r = 0; r < repeat; r++) {
        // 1. Generate variables for this instance
        let vars = {};

        if (ex.data.vars) {
          ex.data.vars.forEach((v) => {
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
          title: md.renderInline(interpolate(ex.data.title || '')),
          type: ex.data.type || 'number-check',
          operation: interpolate(ex.data.operation || ''),
          body: interpolate((ex.templateContent || '').trim()),
        };
        // Only render operation as math if it doesn't have gaps, to preserve trouParts logic
        if (item.operation && !item.operation.includes('?')) {
          item.operation = md.renderInline(item.operation);
        }

        // 4. Handle answers (can be single or array)
        // Support both `answer` (singular) and `answers` (plural, for multi-blank operations)
        let answerRaw = ex.data.answers || ex.data.answer;
        if (typeof answerRaw === 'string') answerRaw = interpolate(answerRaw);
        else if (Array.isArray(answerRaw))
          answerRaw = answerRaw.map((a) => (typeof a === 'string' ? interpolate(a) : a));

        item.answers = Array.isArray(answerRaw)
          ? answerRaw.map((v) => String(v).trim().toLowerCase())
          : [
              String(answerRaw || '')
                .trim()
                .toLowerCase(),
            ];

        // 5. Specialized Type Handling
        if (ex.data.type === 'fraction') {
          item.fraction = {
            shape: ex.data.shape || 'circle',
            numerator: Number(interpolate(String(ex.data.numerator || 0))),
            denominator: Number(interpolate(String(ex.data.denominator || 1))),
            cols: ex.data.cols ? Number(interpolate(String(ex.data.cols))) : null,
            rows: ex.data.rows ? Number(interpolate(String(ex.data.rows))) : null,
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
            ones: ex.data.ones != null ? Number(interpolate(String(ex.data.ones))) : null,
          };
          item.base10 = b; // SVG rendered client-side by base10Render() in generators.js
        }

        const parseSvgElement = (dataSvg) => {
          if (!dataSvg) return null;
          const svgObj = {
            gen: interpolate(String(dataSvg.gen)),
            par: {},
          };
          if (dataSvg.par) {
            for (const [k, v] of Object.entries(dataSvg.par)) {
              if (v !== null && typeof v === 'object') {
                const obj = {};
                for (const [ok, ov] of Object.entries(v)) {
                  const key = isNaN(ok) ? ok : Number(ok);
                  obj[key] = interpolate(String(ov));
                }
                svgObj.par[k] = obj;
              } else {
                const val = interpolate(String(v));
                svgObj.par[k] = isNaN(val) ? val : Number(val);
              }
            }
          }
          if (svgObj.gen === 'file') {
            const filepath = svgObj.par.name || svgObj.par.file;
            if (filepath) {
              const fullPath = path.join(__dirname, 'src', '_includes', 'svg', filepath);
              if (fs.existsSync(fullPath)) {
                svgObj.gen = 'embedSvg';
                svgObj.par = { svg: fs.readFileSync(fullPath, 'utf8') };
              } else {
                svgObj.gen = 'embedSvg';
                svgObj.par = {
                  svg: `<svg width="50" height="50"><text x="0" y="25" fill="red">Missing ${filepath}</text></svg>`,
                };
              }
            }
          } else if (svgObj.gen === 'embed') {
            svgObj.gen = 'embedSvg';
          }
          return svgObj;
        };

        if (ex.data.svg) {
          item.svg = parseSvgElement(ex.data.svg);
        }

        if (ex.data.tiles && ex.data.type !== 'svg-tiles') {
          item.tiles = ex.data.tiles.map((t) => md.renderInline(interpolate(String(t))));
          item.tileAnswers = (ex.data.tileAnswers || []).map(Number);
        }

        if (ex.data.type === 'svg-tiles' && ex.data.tiles) {
          item.tiles = ex.data.tiles.map(parseSvgElement);
          item.answers = (ex.data.answers || []).map(Number);
        }

        if (ex.data.statements) {
          item.statements = ex.data.statements.map((s) => md.renderInline(interpolate(String(s))));
          item.checkedAnswers = (ex.data.checkedAnswers || []).map(Number);
        }

        if (ex.data.pairs) {
          const processedPairs = ex.data.pairs.map((p) => ({
            left: md.renderInline(interpolate(String(p.left))),
            right: md.renderInline(interpolate(String(p.right))),
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
            left: leftIndexed.map((l) => l.label),
            right: rightIndexed.map((r) => r.label),
            answers: leftIndexed.map((l) => rightIndexed.findIndex((r) => r.origIdx === l.origIdx)),
          };
        }

        if (ex.data.given && ex.data.answers) {
          item.sequence = {
            given: ex.data.given.map((n) => md.renderInline(interpolate(String(n)))),
            answers: ex.data.answers.map((n) => interpolate(String(n))),
          };
        }

        if (ex.data.type === 'bounding' && ex.data.number != null && ex.data.answers) {
          item.bounding = {
            number: md.renderInline(interpolate(String(ex.data.number))),
            answers: ex.data.answers.map((n) => interpolate(String(n))),
          };
        }

        if (ex.data.type === 'logic-grid' && ex.data.columns && ex.data.rows && ex.data.solution) {
          const cols = ex.data.columns.map((c) => md.renderInline(interpolate(String(c))));
          const rows = ex.data.rows.map((r) => md.renderInline(interpolate(String(r))));
          const solution = rows.map((r) =>
            cols.map((c) => {
              const solValue = interpolate(String(ex.data.solution[c]));
              return solValue === r;
            })
          );
          item.grid = { columns: cols, rows: rows, solution: solution };
        }

        if (ex.data.type === 'pyramid' && ex.data.pyramid) {
          const rawRows = ex.data.pyramid.map((r) => r.map((v) => (v == null ? null : Number(interpolate(String(v))))));
          const given = rawRows.map((r) => r.map((v) => v !== null));
          let changed = true;
          while (changed) {
            changed = false;
            for (let r = 0; r < rawRows.length - 1; r++) {
              for (let c = 0; c < rawRows[r].length - 1; c++) {
                const l = rawRows[r][c],
                  ri = rawRows[r][c + 1],
                  p = rawRows[r + 1][c];
                if (l !== null && ri !== null && p === null) {
                  rawRows[r + 1][c] = l + ri;
                  changed = true;
                }
                if (p !== null && l !== null && ri === null) {
                  rawRows[r][c + 1] = p - l;
                  changed = true;
                }
                if (p !== null && ri !== null && l === null) {
                  rawRows[r][c] = p - ri;
                  changed = true;
                }
              }
            }
            // Extra pass: resolve non-edge unknowns using grandparent (binomial identity).
            // For [L, x, R] → [L+x, x+R] → [grandparent]:
            //   grandparent = L + 2x + R  →  x = (grandparent - L - R) / 2
            for (let r = 0; r < rawRows.length - 2; r++) {
              const row = rawRows[r];
              for (let c = 1; c < row.length - 1; c++) {
                if (row[c] !== null) continue;
                const L = row[c - 1], R = row[c + 1];
                if (L === null || R === null) continue;
                const gp = rawRows[r + 2][c - 1];
                if (gp === null) continue;
                const x = (gp - L - R) / 2;
                if (Number.isInteger(x)) { row[c] = x; changed = true; }
              }
            }
          }
          item.pyramid = { rows: [...rawRows].reverse(), given: [...given].reverse() };
        }

        if (ex.data.type === 'true-false' && ex.data.statements) {
          item.statements = ex.data.statements.map((s) => ({
            text: md.renderInline(interpolate(String(s.text))),
            answer: s.answer === true || interpolate(String(s.answer)) === 'true',
          }));
        }

        if (ex.data.type === 'multi-question' && ex.data.questions) {
          item.mqContext = ex.data.context ? md.renderInline(interpolate(String(ex.data.context))) : '';
          item.mqQuestions = ex.data.questions.map((q) => ({
            text: md.renderInline(interpolate(String(q.text))),
            answer: interpolate(String(q.answer)).trim().toLowerCase(),
          }));
        }

        if (ex.data.type === 'mcq' && ex.data.choices && ex.data.answer != null) {
          const correct = interpolate(String(ex.data.answer)).trim();
          const choices = ex.data.choices.map((c) => md.renderInline(interpolate(String(c))));
          for (let i = choices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [choices[i], choices[j]] = [choices[j], choices[i]];
          }
          item.mcqChoices = choices;
          item.mcqAnswer = choices.indexOf(md.renderInline(correct));
          if (ex.data.compact || ex.data.mcqCompact) item.mcqCompact = true;
        }

        if (ex.data.type === 'compare' && ex.data.comparisons) {
          item.comparisons = ex.data.comparisons.map((c) => {
            const l = interpolate(String(c.left));
            const r = interpolate(String(c.right));
            let answer;
            if (c.answer) {
              answer = c.answer.trim();
            } else {
              const nl = Number(l);
              const nr = Number(r);
              answer = nl < nr ? '<' : nl > nr ? '>' : '=';
            }
            return { left: l, right: r, answer };
          });
        }

        if (ex.data.type === 'compare-expressions' && ex.data.comparisons) {
          item.comparisons = ex.data.comparisons.map((c) => {
            const l = interpolate(String(c.left));
            const r = interpolate(String(c.right));
            let answer;
            if (c.answer) {
              answer = c.answer.trim();
            } else {
              try {
                const evalExpr = (s) => Function('"use strict"; return (' + s.replace(/×/g, '*').replace(/÷/g, '/') + ')')();
                const nl = evalExpr(l);
                const nr = evalExpr(r);
                answer = nl < nr ? '<' : nl > nr ? '>' : '=';
              } catch {
                answer = '?';
              }
            }
            return { left: l, right: r, answer };
          });
        }

        if (ex.data.type === 'compare-solutions' && ex.data.solutions) {
          item.csSolutions = (ex.data.solutions || []).map(s => ({
            name: String(s.name || ''),
            steps: (s.steps || []).map(st => String(st)),
          }));
          item.correctSolution = Number(ex.data.correctSolution ?? 0);
        }

        if (ex.data.type === 'error-analysis' && ex.data.steps) {
          item.eaSteps = (ex.data.steps || []).map(s => String(s));
          item.wrongStep = Number(ex.data.wrongStep ?? 0);
          item.correction = String(ex.data.correction ?? '').trim().toLowerCase();
          item.guided = !!ex.data.guided;
        }

        if (ex.data.type === 'estimation') {
          const estVals = ex.data.estimates
            ? (Array.isArray(ex.data.estimates) ? ex.data.estimates : [ex.data.estimates])
            : ex.data.estimate !== undefined ? [ex.data.estimate] : [];
          item.estAnswers = estVals.map(v => String(v).trim().toLowerCase());
        }

        if (ex.data.type === 'think-board') {
          item.tbExpression = String(ex.data.expression || '');
          item.tbManipLabel = ex.data.manipLabel ? String(ex.data.manipLabel) : '';
          item.tbUnit = ex.data.unit ? String(ex.data.unit) : '';
          item.tbStoryHint = ex.data.storyHint ? String(ex.data.storyHint) : '';
          item.tbStoryKeyword = ex.data.storyKeyword ? String(ex.data.storyKeyword).toLowerCase() : '';
        }

        if (ex.data.type === 'fact-family' && Array.isArray(ex.data.numbers)) {
          const [a, b, c] = ex.data.numbers.map(Number);
          item.ffNumbers = [a, b, c];
          const op = String(ex.data.operation || 'mul');
          if (op === 'add') {
            item.ffEquations = [
              { expr: `${a} + ${b} =`, answer: String(c) },
              { expr: `${b} + ${a} =`, answer: String(c) },
              { expr: `${c} − ${a} =`, answer: String(b) },
              { expr: `${c} − ${b} =`, answer: String(a) },
            ];
          } else {
            item.ffEquations = [
              { expr: `${a} × ${b} =`, answer: String(c) },
              { expr: `${b} × ${a} =`, answer: String(c) },
              { expr: `${c} ÷ ${a} =`, answer: String(b) },
              { expr: `${c} ÷ ${b} =`, answer: String(a) },
            ];
          }
        }

        if (ex.data.type === 'bar-model' && ex.data.bm) {
          const bm = { ...ex.data.bm, answer: String(ex.data.answer ?? '') };
          item.bmSvg = genBarModelSvg(bm);
          if (ex.data.unit) item.unit = String(ex.data.unit);
        }

        if (ex.data.type === 'guided-problem' && ex.data.story && ex.data.steps) {
          // Collect all tap-target tokens from keywords/numbers steps
          const allTokens = [];
          for (const step of ex.data.steps) {
            if ((step.kind === 'keywords' || step.kind === 'numbers') && Array.isArray(step.tokens)) {
              allTokens.push(...step.tokens.map(String));
            }
          }
          // Render story markdown (strip outer <p> if single paragraph)
          let storyHtml = md.render(interpolate(String(ex.data.story))).trim();
          storyHtml = storyHtml.replace(/^<p>([\s\S]*)<\/p>$/, '$1');
          // Wrap tokens — longest first to avoid partial overlaps
          const sorted = [...new Set(allTokens)].sort((a, b) => b.length - a.length);
          for (const tok of sorted) {
            const esc = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const attr = tok.replace(/"/g, '&quot;');
            storyHtml = storyHtml.replace(
              new RegExp(`(?<![\\w"])${esc}(?![\\w])`, 'g'),
              `<span class="gp-token" data-gp="${attr}">${tok}</span>`
            );
          }
          item.gpStory = storyHtml;
          // Map steps
          item.gpSteps = ex.data.steps.map(step => {
            const s = { kind: step.kind };
            if (Array.isArray(step.tokens))  s.tokens  = step.tokens.map(String);
            if (step.hint)                   s.hint    = md.renderInline(interpolate(String(step.hint)));
            if (step.question)               s.question = md.renderInline(interpolate(String(step.question)));
            if (Array.isArray(step.choices)) s.choices = step.choices.map(String);
            if (step.unit)                   s.unit    = String(step.unit);
            // answers: normalise to array, lower-cased for comparison
            const raw = step.answers
              ? step.answers.map(a => String(a).trim().toLowerCase())
              : step.answer != null ? [String(step.answer).trim().toLowerCase()] : [];
            if (raw.length) s.answers = raw;
            return s;
          });
        }

        if (ex.data.type === 'fraction-paint') {
          let num = ex.data.numerator;
          let den = ex.data.denominator;
          if ((num == null || den == null) && ex.data.decimal != null) {
            const s = String(ex.data.decimal);
            const decs = s.includes('.') ? s.split('.')[1].length : 0;
            const factor = Math.pow(10, decs);
            num = Math.round(parseFloat(s) * factor);
            den = factor;
          }
          item.numerator = Number(num);
          item.denominator = Number(den);
          item.direction = ex.data.direction || 'cols';
        }

        if (ex.data.type === 'ruler') {
          item.ruler = {
            min: Number(interpolate(String(ex.data.min ?? 0))),
            max: Number(interpolate(String(ex.data.max ?? 10))),
            divisions: Number(interpolate(String(ex.data.divisions ?? 1))),
            subdivisions: Number(interpolate(String(ex.data.subdivisions ?? 0))),
            markers: (ex.data.markers || []).map((m) => ({
              label: interpolate(String(m.label || '')),
              value: Number(interpolate(String(m.value))),
            })),
          };
        }

        if (ex.data.type === 'thermometer') {
          item.thermometer = {
            min: Number(interpolate(String(ex.data.min ?? 0))),
            max: Number(interpolate(String(ex.data.max ?? 30))),
            markers: (ex.data.markers || []).map((m) => ({
              value: Number(interpolate(String(m.value))),
            })),
          };
        }

        if (ex.data.type === 'number-line') {
          item.nl = {
            mode: ex.data.mode || 'read',
            min: Number(interpolate(String(ex.data.min ?? 0))),
            max: Number(interpolate(String(ex.data.max ?? 10))),
            step: Number(interpolate(String(ex.data.step ?? 1))),
            subdivisions: Number(interpolate(String(ex.data.subdivisions ?? 0))),
            value: ex.data.value != null ? Number(interpolate(String(ex.data.value))) : null,
            label: String(ex.data.label || 'A'),
          };
        }

        if (ex.data.type === 'coordinate-grid') {
          item.cg = {
            mode: ex.data.mode || 'read',
            cols: Number(ex.data.cols ?? 6),
            rows: Number(ex.data.rows ?? 6),
            placeLabel: String(ex.data.placeLabel || 'A'),
            points: (ex.data.points || []).map(p => ({
              x: Number(p.x), y: Number(p.y),
              label: p.label ? String(p.label) : '',
            })),
          };
        }

        if (ex.data.type === 'bar-chart') {
          item.bc = {
            mode: ex.data.mode || 'build',
            labels: (ex.data.labels || []).map(String),
            values: (ex.data.values || []).map(Number),
            yMax: Number(ex.data.yMax ?? 10),
            yStep: Number(ex.data.yStep ?? 1),
            unit: String(ex.data.unit || ''),
            questions: (ex.data.questions || []).map(q => ({
              text: String(q.text),
              answer: String(q.answer).trim().toLowerCase(),
            })),
          };
        }

        if (ex.data.type === 'convert' && ex.data.items) {
          item.convert = {
            items: ex.data.items.map((it) => ({
              prompt: interpolate(String(it.prompt)),
              unit: it.unit ? interpolate(String(it.unit)) : '',
            })),
            answers: ex.data.items.map((it) => interpolate(String(it.answer)).trim()),
          };
        }
        if (ex.data.type === 'drag-sort' && ex.data.tiles) {
          // Pre-render known SVG generators as HTML strings so tiles work without window[fn] calls
          // NOTE: keep in sync with slicedPieSvg() in src/assets/js/svg.js
          const preRenderTile = (t) => {
            if (!t || typeof t !== 'object' || !t.gen) return interpolate(String(t));
            const par = t.par || {};
            if (t.gen === 'fractionShapesSvg') {
              const n = Number(par.n),
                d = Number(par.d),
                size = Number(par.size) || 80;
              const c = size / 2, r = size / 2 - 2;
              const f = v => Math.round(v * 100) / 100;
              let filled = '', empty = '';
              for (let i = 0; i < d; i++) {
                const a0 = (i * 2 * Math.PI) / d - Math.PI / 2;
                const a1 = ((i + 1) * 2 * Math.PI) / d - Math.PI / 2;
                const p = `M${c},${c}L${f(c+r*Math.cos(a0))},${f(c+r*Math.sin(a0))}A${r},${r},0,0,1,${f(c+r*Math.cos(a1))},${f(c+r*Math.sin(a1))}Z`;
                if (i < n) filled += `<path d="${p}" fill="var(--p)"/>`;
                else empty += `<path d="${p}" fill="var(--sf)"/>`;
              }
              const pie = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><g stroke="var(--cs)" stroke-width="1">${filled}${empty}</g></svg>`;
              return `<span style="display:inline-flex;flex-direction:column;align-items:center;gap:0.4rem">${pie}<span class="frac text-lg"><span class="fn">${n}</span><span class="fd">${d}</span></span></span>`;
            }
            // Unknown gen → keep as runtime object (fallback)
            return parseSvgElement(t);
          };
          item.tiles = ex.data.tiles.map((t) => preRenderTile(t));
          if (ex.data.direction) item.direction = ex.data.direction;
        }
        if (ex.data.type === 'click-blocks' && ex.data.columns) {
          item.columns = ex.data.columns.map((col) => ({
            label: String(col.label || ''),
            value: Number(col.value || 0),
            color: String(col.color || '#3b82f6'),
            answer: Number(col.answer || 0),
            max: Number(col.max || 9),
          }));
        }
        if (ex.data.type === 'sort' && ex.data.items) {
          item.items = ex.data.items.map((v) => interpolate(String(v)));
          if (ex.data.direction) item.direction = ex.data.direction;
        }
        if (ex.data.type === 'select' && ex.data.statements) {
          if (ex.data.choices) item.selectChoices = ex.data.choices.map(String);
          item.selectStatements = ex.data.statements.map((s) => {
            const parts = String(s.template).split('___');
            const stmt = { before: parts[0] || '', after: parts[1] || '', answer: String(s.answer) };
            if (s.choices) stmt.choices = s.choices.map(String);
            return stmt;
          });
        }
        if (ex.data.type === 'fill-table' && ex.data.rows && ex.data.headers) {
          let blankIdx = 0;
          const rows = ex.data.rows.map((row, ri) => {
            let colAnsIdx = 0;
            return row.map((cell) => {
              if (String(cell) === '?') {
                return { blank: true, answer: String((ex.data.answers[ri] || [])[colAnsIdx++] ?? ''), idx: blankIdx++ };
              }
              return { blank: false, value: renderShorthands(String(cell)) };
            });
          });
          const _inputW = { 1: 'w-8', 2: 'w-10', 3: 'w-12' }[ex.data.inputSize] || 'w-14';
          item.table = {
            headers: ex.data.headers.map((h) => renderShorthands(String(h))),
            rows,
            blankCount: blankIdx,
            headerCol: !!ex.data.headerCol,
            inputClass: _inputW,
          };
        }

        if (ex.data.type === 'column-op') {
          const clean = (s) => String(s).replace(/\s+/g, '');
          const top    = clean(ex.data.top    || '');
          const bottom = ex.data.bottom != null ? clean(ex.data.bottom) : null;
          const result = clean(ex.data.result || '');
          const maxLen = Math.max(top.length, bottom ? bottom.length : 0, result.length);
          const pad = (s, n) => s.padStart(n, ' ');
          item.colOp = {
            operation: ex.data.operation || '+',
            top:    pad(top,    maxLen).split(''),
            bottom: bottom ? pad(bottom, maxLen).split('') : null,
            result: pad(result, maxLen).split(''),
          };
          if (ex.data.answers) {
            item.answers = ex.data.answers.map(String);
          } else {
            // auto-compute answers for each '?' in result
            const topN = parseInt(top, 10);
            const botN = bottom ? parseInt(bottom, 10) : 0;
            const op   = item.colOp.operation;
            let resN = op === '+' ? topN + botN : op === '-' ? topN - botN : topN * botN;
            const resStr = String(Math.abs(resN)).padStart(result.length, '0');
            item.answers = [];
            for (let i = 0; i < result.length; i++) {
              if (result[i] === '?') item.answers.push(resStr[i] || '0');
            }
          }
        }


        if (ex.data.type === 'calc-chain' && ex.data.chain) {
          item.chain = {
            start: Number(interpolate(String(ex.data.chain.start))),
            steps: (ex.data.chain.steps || []).map((s) => ({
              op: String(s.op),
              answer: interpolate(String(s.answer)).trim().toLowerCase(),
            })),
          };
        }

        if (ex.data.type === 'function-machine' && ex.data.machine) {
          const m = ex.data.machine;
          item.machine = {
            mode: m.mode || 'compute',
          };
          if (m.mode === 'compute' || !m.mode) {
            item.machine.rule = interpolate(String(m.rule || ''));
            item.machine.ruleLabel = interpolate(String(m.ruleLabel || m.rule || ''));
            item.machine.input = Number(interpolate(String(m.input)));
            item.machine.answer = Number(interpolate(String(m.answer)));
          } else if (m.mode === 'discover') {
            item.machine.pairs = (m.pairs || []).map(p => ({
              in: Number(interpolate(String(p.in))),
              out: Number(interpolate(String(p.out))),
            }));
            item.machine.choices = (m.choices || []).map(c => interpolate(String(c)));
            item.machine.answer = Number(m.answer);
          }
        }

        if (ex.data.type === 'maze' && ex.data.maze) {
          const m = ex.data.maze;
          item.maze = {
            grid: m.grid,
            start: m.start || [0, 0],
            end: m.end || [m.grid.length - 1, (m.grid[0] || []).length - 1],
            rule: m.rule,
            ruleParam: m.ruleParam != null ? Number(m.ruleParam) : undefined,
            ruleLabel: interpolate(String(m.ruleLabel || '')),
          };
        }

        if (ex.data.type === 'venn' && ex.data.venn) {
          const v = ex.data.venn;
          const items = (v.items || []).map(it => ({
            char: it.char,
            zone: it.zone,
          }));
          // Shuffle items for display
          for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
          }
          item.venn = {
            labelA: interpolate(String(v.labelA || '')),
            labelB: interpolate(String(v.labelB || '')),
            items,
          };
        }

        if (ex.data.type === 'inverse-problem' && ex.data.ipBase) {
          item.ipBase = {
            text: md.renderInline(interpolate(String(ex.data.ipBase.text))),
            answer: interpolate(String(ex.data.ipBase.answer)).trim().toLowerCase(),
          };
          item.ipInverses = (ex.data.ipInverses || []).map((inv) => ({
            text: md.renderInline(interpolate(String(inv.text))),
            answer: interpolate(String(inv.answer)).trim().toLowerCase(),
          }));
        }

        payload.push(item);
      }
    });

    return JSON.stringify(payload)
      .replace(/&quot;/g, '\\"') // Unescape HTML quotes that break JSON if decoded by browser
      .replace(/&apos;/g, '\\u0027') // Unescape HTML apostrophes
      .replace(/'/g, '\\u0027'); // Escape single quotes
  });

  // Convert seriesMeta to compact CSV for the listing page
  const LEVEL_CODES = { CP: '1', CE1: '2', CE2: '3', CM1: '4', CM2: '5' };
  const DIFF_CODES = { facile: '1', moyen: '2', difficile: '3' };
  const DISAMBIG_EMOJIS = [
    '🐶','🐱','🐭','🐰','🦊','🐻','🐼','🐨','🐯','🦁',
    '🐮','🐷','🐸','🐵','🐧','🦆','🦉','🦋','🐢','🐬',
  ];
  const csvWarnings = [];

  eleventyConfig.addFilter('csvPayload', function (seriesMeta, defisMeta) {
    csvWarnings.length = 0;
    const allMeta = [...seriesMeta, ...(defisMeta || [])];

    // Assign a disambiguation emoji to series that share a title.
    // Groups sorted by id so assignment is stable across builds.
    const byTitle = new Map();
    for (const s of allMeta) {
      const key = (s.title || '').trim();
      if (!byTitle.has(key)) byTitle.set(key, []);
      byTitle.get(key).push(s);
    }
    const emojiMap = new Map(); // series id → emoji
    for (const group of byTitle.values()) {
      if (group.length < 2) continue;
      group.sort((a, b) => String(a.id ?? '').localeCompare(String(b.id ?? '')));
      group.forEach((s, i) => emojiMap.set(s.id, DISAMBIG_EMOJIS[i % DISAMBIG_EMOJIS.length]));
    }

    // Canonical lookup tables — kept in sync with CSV_TYPES / CSV_CLASSES in app.js
    // Add new entries at the END to preserve existing indices; never reorder.
    // Multi-type series all map to "multi" — no composite entries.
    const CSV_TYPES = ["","bar-chart","base-10","bounding","calc-chain","checkbox","click-blocks","clock","column-op","compare","compare-groups","convert","coordinate-grid","count-objects","decimal-triple","decomp","drag-sort","fill-table","fraction","fraction-check","fraction-paint","function-machine","inverse-problem","logic-grid","magic-color","matching","maze","mcq","multi","multi-question","number-check","number-hunt","number-line","problem","pyramid","ruler","select","sequence","sort","svg-tiles","thermometer","tile-select","tri-arith","true-false","venn","defi","compare-expressions","estimation","error-analysis","compare-solutions"];
    const CSV_CLASSES = ["A1.1","A1.2","A2.1","A2.2","A2.3","A2.4","A3.1","A3.2","A3.3","A4.1","A4.2","D1.1.1","I1.1.1","I1.1.2","M1.1","M1.2","M1.3","M1.4","M2.1","M2.2","M2.3","M3.1","M3.2","M3.3","N4.2","S1.1.1","S1.1.2","S1.1.3","S1.2.1","S1.2.2","S1.2.3","S1.3.1","S2.1.1","S2.1.2","S2.1.3","S2.1.4","S2.2.1","S2.2.2","S3.1.1","S3.1.2","S3.2.1","S3.2.2","S3.2.3","S4.1.2","S3.1.3"];

    const lines = ['id,l,s,t,title,d,f,ty,cl'];
    for (const s of allMeta) {
      const l = LEVEL_CODES[s.level] || '?';
      const subj = (s.topic || '').charAt(0).toUpperCase() || '?';
      const t = s.subtopic || '';
      const d = DIFF_CODES[s.difficulty] || '?';
      const f = s.folder === 'applications' ? 'a' : s.folder === 'defis' ? 'd' : 'e';
      const emoji = emojiMap.get(s.id) ? ` ${emojiMap.get(s.id)}` : '';
      const title = (s.title || '').replace(/,/g, ' ') + emoji;
      const types = s.usedTypes || [];
      const typeSig = s.folder === 'defis' ? 'defi' : types.length > 1 ? 'multi' : types[0] || '';
      const tyIdx = CSV_TYPES.indexOf(typeSig);
      const clIdx = CSV_CLASSES.indexOf((s.usedClasses || [])[0] || '');
      if (t.length > 12) csvWarnings.push(`topic > 12 chars: "${t}" in ${s.series}`);
      if (title.includes(',')) csvWarnings.push(`title had comma (replaced): "${s.title}" in ${s.series}`);
      if (tyIdx < 0) csvWarnings.push(`unknown type sig "${typeSig}" in ${s.series} — add to CSV_TYPES`);
      if (clIdx < 0 && (s.usedClasses || []).length) csvWarnings.push(`unknown class "${s.usedClasses[0]}" in ${s.series} — add to CSV_CLASSES`);
      const line = `${s.id},${l},${subj},${t},${title},${d},${f},${tyIdx >= 0 ? tyIdx : ''},${clIdx >= 0 ? clIdx : ''}`;
      lines.push(line);
    }
    return lines.join('\n');
  });

  // Applications collection
  eleventyConfig.addCollection('applications', function (collectionApi) {
    return collectionApi.getFilteredByTag('applications');
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
          useShortDoctype: true,
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
  const pageSizeMap = new Map();
  eleventyConfig.addTransform('sizeReport', function (content, outputPath) {
    if (outputPath && outputPath.endsWith('.html')) {
      const total = Buffer.byteLength(content, 'utf8');
      const measure = (re) => (content.match(re) || []).reduce((sum, m) => sum + Buffer.byteLength(m, 'utf8'), 0);

      pageSizeMap.set(outputPath, {
        path: outputPath,
        kb: (total / 1024).toFixed(1),
        svgBytes: measure(/<svg[\s\S]*?<\/svg>/gi),
        jsBytes: measure(/<script[\s\S]*?<\/script>/gi),
        imgBytes: measure(/src="data:image\/[^"]*"/gi),
        cssBytes: measure(/<style[\s\S]*?<\/style>/gi),
      });
    }
    return content;
  });

  // Warn when exercise files are newer than human-validate.csv (only during serve)
  eleventyConfig.on('eleventy.before', () => {
    if (process.env.ELEVENTY_RUN_MODE !== 'serve') return;
    if (!fs.existsSync(HUMAN_CSV)) return;
    const csvMtime = fs.statSync(HUMAN_CSV).mtimeMs;
    let stale = false;
    function checkDir(dir) {
      if (stale || !fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (stale) return;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) checkDir(full);
        else if (entry.name.endsWith('.md') && fs.statSync(full).mtimeMs > csvMtime) stale = true;
      }
    }
    for (const r of ALL_EXERCISE_ROOTS) checkDir(r);
    if (stale) {
      console.warn('\x1b[33m⚠  Exercise files changed since last sync. Run: npm run sync:human-validations\x1b[0m');
    }
  });

  // Post-build page size report + missing ID warning
  eleventyConfig.on('eleventy.after', () => {
    // Warn about series missing IDs
    if (missingSeriesIds.length > 0) {
      console.error('\n\x1b[31m' + '='.repeat(70));
      console.error('  WARNING: The following series are MISSING "id" in index.yaml');
      console.error('  No pages were generated for them!');
      console.error('='.repeat(70) + '\x1b[0m');
      missingSeriesIds.forEach((p) => console.error(`  \x1b[31m- ${p}\x1b[0m`));
      console.error('\x1b[31m\nRun: npm run generate:ids\x1b[0m\n');
    }

    // Warn about CSV data issues
    if (csvWarnings.length > 0) {
      console.warn('\n\x1b[33m' + '='.repeat(70));
      console.warn('  CSV DATA WARNINGS:');
      console.warn('='.repeat(70) + '\x1b[0m');
      csvWarnings.forEach((w) => console.warn(`  \x1b[33m- ${w}\x1b[0m`));
      console.warn('');
    }

    const pageSizes = [...pageSizeMap.values()];
    const sorted = pageSizes.sort((a, b) => b.kb - a.kb);
    const fmt = (b) => (b / 1024).toFixed(1) + 'k';
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
      console.log(
        'Page'.padEnd(70) +
          'Total'.padStart(8) +
          'SVG'.padStart(8) +
          'JS'.padStart(8) +
          'IMG'.padStart(8) +
          'CSS'.padStart(8)
      );
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
      const avg = (key) => middle.reduce((a, p) => a + (key === 'kb' ? parseFloat(p[key]) : p[key]), 0) / middle.length;
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

    const total = (key) => pageSizes.reduce((a, p) => a + (key === 'kb' ? p.kb * 1024 : p[key]), 0);
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

  // Dev-only: POST /api/human-validate → appends to reports/human-validate.csv
  const HUMAN_CSV = path.join(__dirname, 'reports/human-validate.csv');
  const ALL_EXERCISE_ROOTS = ['src/fr/exercices', 'src/fr/applications', 'src/fr/defis']
    .map((r) => path.join(__dirname, r));
  const crypto = require('crypto');

  function getAllSeriesIds() {
    const results = [];
    function scan(dir) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) scan(full);
        else if (entry.name === 'index.yaml') {
          const m = fs.readFileSync(full, 'utf8').match(/^id:\s*['"]?([A-Za-z0-9_-]+)['"]?/m);
          if (m) results.push(m[1]);
        }
      }
    }
    for (const r of ALL_EXERCISE_ROOTS) scan(r);
    return results;
  }

  function findSeriesDir(seriesId) {
    function scan(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const result = scan(full);
          if (result) return result;
        } else if (entry.name === 'index.yaml') {
          const content = fs.readFileSync(full, 'utf8');
          if (content.match(new RegExp(`^id:\\s*${seriesId}\\s*$`, 'm'))) return dir;
        }
      }
      return null;
    }
    for (const root of ALL_EXERCISE_ROOTS) {
      try {
        const result = scan(root);
        if (result) return result;
      } catch (_) {}
    }
    return null;
  }

  function fileHash(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').slice(0, 16);
  }

  function readHumanCsv() {
    if (!fs.existsSync(HUMAN_CSV)) return new Map();
    const lines = fs.readFileSync(HUMAN_CSV, 'utf8').split('\n').filter((l) => l.trim());
    const map = new Map();
    for (const line of lines.slice(1)) {
      const parts = line.split(',');
      map.set(parts[0], { path: parts[0], seriesId: parts[1] || '', hash: parts[2] || '', validatedAt: parts[3] || '' });
    }
    return map;
  }

  function writeHumanCsv(map) {
    const rows = [...map.values()].sort((a, b) => a.path.localeCompare(b.path));
    const lines = ['path,seriesId,hash,validatedAt', ...rows.map((r) => `${r.path},${r.seriesId},${r.hash},${r.validatedAt}`)];
    fs.writeFileSync(HUMAN_CSV, lines.join('\n') + '\n', 'utf8');
  }

  eleventyConfig.setServerOptions({
    middleware: [
      function devValidate(req, res, next) {
        // GET /api/human-next-unvalidated?current=<id> → next series URL not yet validated
        if (req.method === 'GET' && req.url.startsWith('/api/human-next-unvalidated')) {
          const currentId = new URL(req.url, 'http://localhost').searchParams.get('current');
          const map = readHumanCsv();
          const seriesFiles = {};
          for (const { seriesId, validatedAt } of map.values()) {
            if (!seriesId) continue;
            if (!seriesFiles[seriesId]) seriesFiles[seriesId] = [];
            seriesFiles[seriesId].push(validatedAt);
          }
          const validatedSet = new Set(
            Object.entries(seriesFiles)
              .filter(([, ts]) => ts.length > 0 && ts.every((t) => t))
              .map(([id]) => id)
          );
          const allIds = getAllSeriesIds();
          const currentPos = allIds.indexOf(currentId);
          let next = null;
          for (let i = currentPos + 1; i < allIds.length; i++) {
            if (!validatedSet.has(allIds[i])) { next = allIds[i]; break; }
          }
          if (!next) {
            for (let i = 0; i < currentPos; i++) {
              if (!validatedSet.has(allIds[i])) { next = allIds[i]; break; }
            }
          }
          const prefix = (process.env.PATH_PREFIX || '/').replace(/\/$/, '');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ id: next, url: next ? `${prefix}/fr/exercices/${next}/` : null }));
          return;
        }

        // GET /api/human-validated-ids → seriesIds where ALL files have been validated
        if (req.method === 'GET' && req.url === '/api/human-validated-ids') {
          const map = readHumanCsv();
          const seriesFiles = {};
          for (const { seriesId, validatedAt } of map.values()) {
            if (!seriesId) continue;
            if (!seriesFiles[seriesId]) seriesFiles[seriesId] = [];
            seriesFiles[seriesId].push(validatedAt);
          }
          const ids = Object.entries(seriesFiles)
            .filter(([, ts]) => ts.length > 0 && ts.every((t) => t))
            .map(([id]) => id);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(ids));
          return;
        }

        if (req.method !== 'POST' || req.url !== '/api/human-validate') return next();
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const { seriesId, url } = JSON.parse(body);
            const seriesDir = seriesId ? findSeriesDir(seriesId) : null;
            const map = readHumanCsv();
            const ts = new Date().toISOString();
            if (seriesDir) {
              const mdFiles = fs.readdirSync(seriesDir).filter((f) => f.endsWith('.md')).sort();
              for (const f of mdFiles) {
                const absPath = path.join(seriesDir, f);
                const relPath = path.relative(__dirname, absPath).replace(/\\/g, '/');
                const hash = fileHash(absPath);
                map.set(relPath, { path: relPath, seriesId, hash, validatedAt: ts });
              }
            } else {
              // Series dir not found — record bare entry without path/hash
              const key = `(unknown)/${seriesId}`;
              map.set(key, { path: key, seriesId: seriesId || '', hash: '', validatedAt: ts });
            }
            writeHumanCsv(map);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
          } catch (_) {
            res.writeHead(400);
            res.end('Bad request');
          }
        });
      },
    ],
  });

  return {
    pathPrefix: process.env.PATH_PREFIX || '/',
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
      layouts: '_layouts',
      data: '_data',
    },
  };
};
