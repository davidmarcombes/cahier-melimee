const Image = require('@11ty/eleventy-img');
const path = require('path');

module.exports = function (eleventyConfig) {
  // Passthrough static assets
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });

  // Shortcode for responsive images
  eleventyConfig.addNunjucksAsyncShortcode('image', async function (src, alt = '', sizes = '100vw') {
    if (!alt) {
      throw new Error(`Missing "+alt+" on image from: ${src}`);
    }

    let metadata = await Image(src, {
      widths: [320, 640, 1024, 1600],
      formats: ['avif', 'webp', 'jpeg'],
      outputDir: './_site/assets/images/'
    });

    let imageAttributes = {
      alt,
      sizes,
      loading: 'lazy',
      decoding: 'async'
    };

    // You can return a string of markup
    return Image.generateHTML(metadata, imageAttributes);
  });

  // Basic passthrough copy for fonts
  eleventyConfig.addPassthroughCopy({ 'src/assets/fonts': 'assets/fonts' });


  // Add a simple filter
  eleventyConfig.addFilter('year', () => new Date().getFullYear());

  // Add a date filter for Nunjucks (YYYY-MM-DD)
  eleventyConfig.addFilter('date', function(dateObj) {
    if (!dateObj) return '';
    // If dateObj is a string, convert to Date
    const d = typeof dateObj === 'string' ? new Date(dateObj) : dateObj;
    if (isNaN(d)) return '';
    return d.toISOString().slice(0, 10);
  });

  // Posts collection (by convention)
  eleventyConfig.addCollection('posts', function (collectionApi) {
    return collectionApi.getFilteredByGlob('src/en/posts/*.md').sort((a, b) => b.date - a.date);
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
