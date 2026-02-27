/**
 * Local subpath server — serves _site/ at a configurable path prefix.
 * Usage: node scripts/serve-subpath.js
 * Config via .env: PATH_PREFIX=/melimee_test/  PORT=8080
 */
require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PREFIX = (process.env.PATH_PREFIX || '/melimee_test/').replace(/\/?$/, '/');
const ROOT = path.join(__dirname, '../_site');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.csv':  'text/csv',
  '.xml':  'application/xml',
  '.txt':  'text/plain',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

function serve(req, res) {
  const url = req.url.split('?')[0];

  // Redirect bare root to the prefix
  if (url === '/' || url === '') {
    res.writeHead(302, { Location: PREFIX });
    return res.end();
  }

  if (!url.startsWith(PREFIX.slice(0, -1))) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end(`404 — request outside prefix: ${url}`);
  }

  // Strip prefix to get the file path inside _site/
  let filePath = url.slice(PREFIX.length - 1) || '/';

  let fullPath = path.join(ROOT, filePath);

  // Directory → try index.html
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    fullPath = path.join(fullPath, 'index.html');
  }

  if (!fs.existsSync(fullPath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end(`404: ${filePath}`);
  }

  const ext = path.extname(fullPath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(fullPath).pipe(res);
}

http.createServer(serve).listen(PORT, () => {
  console.log(`\n  Serving _site/ at http://localhost:${PORT}${PREFIX}\n`);
});
