/**
 * Static server for e2e tests — serves _site/ at http://localhost:4173
 * No path prefix; assumes the site was built with PATH_PREFIX=/
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.E2E_PORT || 4173;
const ROOT = path.join(__dirname, '../_site');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function serve(req, res) {
  let urlPath = req.url.split('?')[0];
  let fullPath = path.join(ROOT, urlPath);

  // Directory → try index.html
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    fullPath = path.join(fullPath, 'index.html');
  }

  if (!fs.existsSync(fullPath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end(`404: ${urlPath}`);
  }

  const ext = path.extname(fullPath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(fullPath).pipe(res);
}

http.createServer(serve).listen(PORT, () => {
  console.log(`E2E server: http://localhost:${PORT}`);
});
