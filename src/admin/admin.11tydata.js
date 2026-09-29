// The admin dashboard is a dev tool: written only under `npm start` (serve mode), never in a
// production build, and never listed in the sitemap.
module.exports = {
  eleventyExcludeFromCollections: true,
  eleventyComputed: {
    permalink: (data) => (data.site.devMode ? '/admin/' : false),
  },
};
