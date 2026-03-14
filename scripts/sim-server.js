const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const PUBLIC_DIR = path.join(__dirname, '..', '_zsite');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

http
  .createServer((req, res) => {
    // Strip query string, default to index.html for directory requests
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/' || urlPath.endsWith('/')) urlPath += 'index.html';

    const filePath = path.join(PUBLIC_DIR, urlPath);
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Try .br first (pre-compressed), then fall back to the plain copy
    const brPath = filePath + '.br';
    if (fs.existsSync(brPath)) {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Encoding', 'br');
      res.setHeader('Vary', 'Accept-Encoding');
      fs.createReadStream(brPath).pipe(res);
      console.log(`[br]   ${urlPath}`);
      return;
    }

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', contentType);
      fs.createReadStream(filePath).pipe(res);
      console.log(`[raw]  ${urlPath}`);
      return;
    }

    res.writeHead(404);
    res.end('404: Not Found');
    console.log(`[404]  ${urlPath}`);
  })
  .listen(PORT, () => {
    console.log(`🚀 Brotli sim-server at http://localhost:${PORT}`);
    console.log(`   Serving: ${PUBLIC_DIR}`);
  });
