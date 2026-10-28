#!/usr/bin/env node
'use strict';

/**
 * generate-htaccess.js — build step
 *
 * Generates .htaccess with sensible Cache-Control and Expires TTLs:
 * - 1 year immutable cache for versioned/fingerprinted static assets (css, js, images, fonts, audio)
 * - 1 hour cache for HTML, data (json, csv), and feeds (xml, txt)
 * - Never cache service worker (sw.js)
 * - Gzip deflate compression for text, code, json, and svg
 * - Friendly redirects (robot.txt -> robots.txt, llm.txt -> llms.txt)
 *
 * Writes to SITE_OUT (default: _site) and syncs src/.htaccess.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.resolve(ROOT, process.env.SITE_OUT || '_site');
const SRC_HTACCESS = path.join(ROOT, 'src', '.htaccess');

const HTACCESS_CONTENT = `# ==============================================================================
# Le Cahier de Mélimée — Apache Configuration (.htaccess)
# Generated automatically by scripts/generate-htaccess.js
# ==============================================================================

# ── Character Encoding ────────────────────────────────────────────────────────
AddDefaultCharset UTF-8

# ── On-the-fly Gzip / Deflate Compression ─────────────────────────────────────
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/plain text/xml text/csv
  AddOutputFilterByType DEFLATE application/javascript text/javascript application/x-javascript
  AddOutputFilterByType DEFLATE application/json application/manifest+json application/xml image/svg+xml
</IfModule>

# ── Cache-Control Headers (mod_headers) ────────────────────────────────────────
<IfModule mod_headers.c>
  # 1 YEAR: Immutable static assets with version query strings or hashed names
  <FilesMatch "\\.(css|js|mjs|avif|webp|png|jpe?g|gif|svg|ico|woff2?|ogg|mp3)$">
    Header set Cache-Control "max-age=31536000, public, immutable"
  </FilesMatch>

  # 1 HOUR: HTML documents
  <FilesMatch "\\.(html|htm)$">
    Header set Cache-Control "max-age=3600, public, must-revalidate"
  </FilesMatch>

  # 1 HOUR: Data, feeds, metadata
  <FilesMatch "\\.(json|xml|csv|txt)$">
    Header set Cache-Control "max-age=3600, public"
  </FilesMatch>

  # NEVER CACHE: Service worker (must check network on every load)
  <FilesMatch "^(sw|service-worker)\\.js$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires 0
  </FilesMatch>

  # Security headers
  Header set X-Content-Type-Options "nosniff"
</IfModule>

# ── Expires Fallback (mod_expires) ────────────────────────────────────────────
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresDefault                          "access plus 1 month"

  # Stylesheets & Scripts
  ExpiresByType text/css                  "access plus 1 year"
  ExpiresByType application/javascript    "access plus 1 year"
  ExpiresByType text/javascript           "access plus 1 year"
  ExpiresByType application/x-javascript  "access plus 1 year"

  # Images
  ExpiresByType image/avif                "access plus 1 year"
  ExpiresByType image/webp                "access plus 1 year"
  ExpiresByType image/png                 "access plus 1 year"
  ExpiresByType image/jpeg                "access plus 1 year"
  ExpiresByType image/gif                 "access plus 1 year"
  ExpiresByType image/svg+xml             "access plus 1 year"
  ExpiresByType image/x-icon              "access plus 1 year"

  # Audio
  ExpiresByType audio/ogg                 "access plus 1 year"
  ExpiresByType audio/mpeg                "access plus 1 year"

  # Fonts
  ExpiresByType font/woff2                "access plus 1 year"
  ExpiresByType font/woff                 "access plus 1 year"
  ExpiresByType application/font-woff2    "access plus 1 year"
  ExpiresByType application/font-woff     "access plus 1 year"

  # Data & Manifests
  ExpiresByType application/json          "access plus 1 hour"
  ExpiresByType application/manifest+json "access plus 1 hour"
  ExpiresByType text/csv                  "access plus 1 hour"
  ExpiresByType text/xml                  "access plus 1 hour"
  ExpiresByType application/xml           "access plus 1 hour"
  ExpiresByType text/plain                "access plus 1 hour"

  # HTML
  ExpiresByType text/html                 "access plus 1 hour"
</IfModule>

# ── Friendly Redirects ────────────────────────────────────────────────────────
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteRule ^robot\\.txt$ /robots.txt [R=301,L]
  RewriteRule ^llm\\.txt$ /llms.txt [R=301,L]
</IfModule>

# ── Custom Error Pages ────────────────────────────────────────────────────────
ErrorDocument 404 /404.html
`;

function generateHtaccess() {
  if (fs.existsSync(path.dirname(SRC_HTACCESS))) {
    fs.writeFileSync(SRC_HTACCESS, HTACCESS_CONTENT, 'utf8');
  }

  if (fs.existsSync(SITE_DIR)) {
    const dest = path.join(SITE_DIR, '.htaccess');
    fs.writeFileSync(dest, HTACCESS_CONTENT, 'utf8');
    console.log(`[generate-htaccess] wrote ${path.relative(ROOT, dest)}`);
  }
}

if (require.main === module) {
  generateHtaccess();
}

module.exports = { generateHtaccess, HTACCESS_CONTENT };
