const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const PUBLIC_DIR = path.join(__dirname, '_site');

// Mapping common extensions to Mime-Types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml'
};

http.createServer((req, res) => {
    // 1. Resolve the file path (default to index.html for folders)
    let urlPath = req.url === '/' ? '/index.html' : req.url;
    let filePath = path.join(PUBLIC_DIR, urlPath);
    const ext = path.extname(filePath);

    // 2. Check if file exists
    if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end("404: File Not Found");
        return;
    }

    // 3. Set Headers (The "Bucket Simulation" Logic)
    // We treat .html, .js, and .css as gzipped binaries
    if (['.html', '.js', '.css'].includes(ext)) {
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Content-Type', mimeTypes[ext] || 'text/plain');
    }

    // 4. Stream the file directly
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

    console.log(`Served: ${urlPath} (Mode: Simulated Gzip)`);

}).listen(PORT, () => {
    console.log(`🚀 Simulator running at http://localhost:${PORT}`);
    console.log(`Serving from: ${PUBLIC_DIR}`);
});