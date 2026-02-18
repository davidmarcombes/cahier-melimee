const Image = require('@11ty/eleventy-img');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

module.exports = function (eleventyConfig) {
  // Passthrough static assets
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });

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

  // Convert exercises to a JSON payload for the Alpine.js seriesPlayer component
  eleventyConfig.addFilter('seriesPayload', function (exercises) {
    const payload = exercises.map(ex => ({
      title: ex.data.title || '',
      type: ex.data.type || 'number-check',
      operation: ex.data.operation || '',
      body: (ex.templateContent || '').trim(),
      answer: String(ex.data.answer || '').trim().toLowerCase()
    }));
    // Escape single quotes so the JSON is safe inside a single-quoted HTML attribute
    return JSON.stringify(payload).replace(/'/g, '\\u0027');
  });

  // Convert grouped series list to a JSON payload for the seriesBrowser component
  eleventyConfig.addFilter('seriesListPayload', function (seriesList) {
    return JSON.stringify(seriesList.map(s => ({
      series: s.series, title: s.title, seriesUrl: s.seriesUrl,
      count: s.count, level: s.level, topic: s.topic,
      subtopic: s.subtopic, difficulty: s.difficulty
    })));
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
