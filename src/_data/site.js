const { version } = require('../../package.json');

module.exports = {
  version,
  title: 'Le Cahier de Mélimée',
  description: "Des maths pour s'entraîner, du CP au CM2",
  url: process.env.SITE_URL || 'http://localhost:8080',
  devMode: process.env.ELEVENTY_RUN_MODE === 'serve',
  repo: 'https://github.com/davidmarcombes/cahier-melimee',
  author: 'Mélimée, Salto et la communauté',
  email: 'contact@melimee.fr',
  social: {},
};
