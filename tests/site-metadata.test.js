import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SITE_DIR = path.join(process.cwd(), process.env.SITE_OUT || '_site');

describe('robots.txt and robot.txt', () => {
  it('generates both robots.txt and robot.txt with valid directives', () => {
    const robotsPath = path.join(SITE_DIR, 'robots.txt');
    const robotPath = path.join(SITE_DIR, 'robot.txt');

    expect(existsSync(robotsPath)).toBe(true);
    expect(existsSync(robotPath)).toBe(true);

    const robotsContent = readFileSync(robotsPath, 'utf8');
    const robotContent = readFileSync(robotPath, 'utf8');

    expect(robotsContent).toBe(robotContent);
    expect(robotsContent).toContain('User-agent: *');
    expect(robotsContent).toContain('Allow: /');
    expect(robotsContent).toContain('Disallow: /admin/');
    expect(robotsContent).toMatch(/Sitemap:\s+https?:\/\/.+\/sitemap\.xml/);
    expect(robotsContent).toMatch(/# LLMs:\s+https?:\/\/.+\/llms\.txt/);
  });
});

describe('llms.txt and llm.txt', () => {
  it('generates clean llms.txt and llm.txt without HTML entities', () => {
    const llmsPath = path.join(SITE_DIR, 'llms.txt');
    const llmPath = path.join(SITE_DIR, 'llm.txt');

    expect(existsSync(llmsPath)).toBe(true);
    expect(existsSync(llmPath)).toBe(true);

    const llmsContent = readFileSync(llmsPath, 'utf8');
    const llmContent = readFileSync(llmPath, 'utf8');

    expect(llmsContent).toBe(llmContent);
    expect(llmsContent).toContain('# Le Cahier de Mélimée');
    expect(llmsContent).toContain("> Des maths pour s'entraîner");
    expect(llmsContent).not.toContain('&#39;');
    expect(llmsContent).not.toContain('&amp;');
    expect(llmsContent).not.toContain('&quot;');
    expect(llmsContent).toContain('## Niveaux scolaires');
    expect(llmsContent).toContain("## Formats d'activités");
    expect(llmsContent).toContain('## Rubriques du site');
    expect(llmsContent).toContain('data.csv');
    expect(llmsContent).toContain('/llms-full.txt');
  });

  it('generates comprehensive llms-full.txt', () => {
    const fullPath = path.join(SITE_DIR, 'llms-full.txt');
    expect(existsSync(fullPath)).toBe(true);

    const fullContent = readFileSync(fullPath, 'utf8');
    expect(fullContent).toContain('# Le Cahier de Mélimée — Documentation complète');
    expect(fullContent).toContain('Vergnaud');
    expect(fullContent).toContain('Grande Section (GS)');
    expect(fullContent).toContain('Cours Moyen 2 (CM2)');
    expect(fullContent).toContain("Pyramides d'additions");
    expect(fullContent).toContain('EUPL v1.2');
    expect(fullContent).not.toContain('&#39;');
  });
});

describe('SEO metadata and Schema.org structured data', () => {
  it('sets optimized title and meta description on /fr/', () => {
    const indexPath = path.join(SITE_DIR, 'fr', 'index.html');
    expect(existsSync(indexPath)).toBe(true);

    const html = readFileSync(indexPath, 'utf8');

    // Title tag
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    expect(titleMatch).toBeTruthy();
    const title = titleMatch[1];
    expect(title).toBe('Exercices de Maths Gratuits de la GS au CM2 | Le Cahier de Mélimée');
    expect(title.length).toBeGreaterThanOrEqual(50);
    expect(title.length).toBeLessThanOrEqual(70);

    // Meta description tag
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/);
    expect(descMatch).toBeTruthy();
    const description = descMatch[1];
    const decodedDesc = description.replace(/&#39;/g, "'");
    expect(decodedDesc).toContain('Exercices de mathématiques gratuits pour enfants de la GS au CM2');
    expect(decodedDesc).toContain('Sans publicité, sans inscription et 100% libre');
    expect(decodedDesc).toContain("Idéal pour s'entraîner en classe ou à la maison");
    expect(decodedDesc.length).toBeGreaterThanOrEqual(130);
    expect(decodedDesc.length).toBeLessThanOrEqual(165);
  });

  it('includes valid EducationalApplication and WebSite Schema.org JSON-LD markup', () => {
    const indexPath = path.join(SITE_DIR, 'fr', 'index.html');
    const html = readFileSync(indexPath, 'utf8');

    const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(ldMatch).toBeTruthy();

    const jsonText = ldMatch[1];
    expect(jsonText).not.toContain('&#39;');
    expect(jsonText).not.toContain('\n');
    expect(jsonText.startsWith('{"@context":')).toBe(true);

    const parsed = JSON.parse(jsonText);
    expect(parsed['@context']).toBe('https://schema.org');
    expect(Array.isArray(parsed['@graph'])).toBe(true);

    const website = parsed['@graph'].find((item) => item['@type'] === 'WebSite');
    expect(website).toBeDefined();
    expect(website.name).toBe('Le Cahier de Mélimée');
    expect(website.inLanguage).toBe('fr');

    const app = parsed['@graph'].find((item) => item['@type'] === 'EducationalApplication');
    expect(app).toBeDefined();
    expect(app.name).toBe('Le Cahier de Mélimée');
    expect(app.applicationCategory).toBe('EducationalApplication');
    expect(app.isAccessibleForFree).toBe(true);
    expect(app.educationalLevel).toEqual(['GS', 'CP', 'CE1', 'CE2', 'CM1', 'CM2']);
    expect(app.offers).toBeDefined();
    expect(app.offers.price).toBe('0');
  });
});

describe('.htaccess generation and caching TTLs', () => {
  it('generates .htaccess with sensible Cache-Control and Expires rules', () => {
    const htaccessPath = path.join(SITE_DIR, '.htaccess');
    expect(existsSync(htaccessPath)).toBe(true);

    const content = readFileSync(htaccessPath, 'utf8');

    // mod_headers with immutable 1-year cache
    expect(content).toContain('<IfModule mod_headers.c>');
    expect(content).toContain('Header set Cache-Control "max-age=31536000, public, immutable"');
    expect(content).toContain('css|js|mjs|avif|webp|png|jpe?g|gif|svg|ico|woff2?|ogg|mp3');

    // Service worker never cached
    expect(content).toMatch(/<FilesMatch "\^\(sw\|service-worker\)\\.js\$">/);
    expect(content).toContain('Header set Cache-Control "no-cache, no-store, must-revalidate"');

    // HTML and Data caching
    expect(content).toContain('Header set Cache-Control "max-age=3600, public, must-revalidate"');
    expect(content).toContain('Header set Cache-Control "max-age=3600, public"');

    // mod_expires fallbacks
    expect(content).toContain('<IfModule mod_expires.c>');
    expect(content).toContain('ExpiresActive On');
    expect(content).toContain('ExpiresByType image/avif                "access plus 1 year"');
    expect(content).toContain('ExpiresByType image/gif                 "access plus 1 year"');
    expect(content).toContain('ExpiresByType text/javascript           "access plus 1 year"');
    expect(content).toContain('ExpiresByType audio/ogg                 "access plus 1 year"');
    expect(content).toContain('ExpiresByType font/woff2                "access plus 1 year"');

    // mod_deflate gzip compression
    expect(content).toContain('<IfModule mod_deflate.c>');
    expect(content).toContain('AddOutputFilterByType DEFLATE');
  });
});
