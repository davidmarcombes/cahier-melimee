import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

// Prerecorded voice: every clip the pages can ask for exists on disk, and every GS exercise has its clip
// (a new GS series without `npm run generate:voice-pilot` would play nothing).
const require = createRequire(import.meta.url);
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..');
const AUDIO = path.join(ROOT, 'src/assets/audio/voice-pilot');
const manifest = require('../src/assets/audio/voice-pilot/instructions.json');
const inventory = require('../reports/voice-generation.json');

const clipsOf = (files) => (Array.isArray(files) ? files : [files]);
const present = (file) => fs.existsSync(path.join(AUDIO, file)) && fs.statSync(path.join(AUDIO, file)).size > 0;

function collectMd(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? collectMd(full) : entry.name.endsWith('.md') ? [full] : [];
  });
}

describe('voice clips', () => {
  it('every clip of the generation inventory is on disk', () => {
    const missing = Object.keys(inventory).filter((file) => !present(file));
    expect(missing).toEqual([]);
  });

  it('every clip named in instructions.json is on disk', () => {
    const missing = Object.values(manifest)
      .flatMap(clipsOf)
      .filter((file) => !present(file));
    expect(missing).toEqual([]);
  });

  it('no instruction clip on disk is left out of instructions.json', () => {
    const used = new Set(Object.values(manifest).flatMap(clipsOf));
    const orphans = fs
      .readdirSync(path.join(AUDIO, 'instructions'))
      .filter((name) => name.endsWith('.ogg') && !used.has(`instructions/${name}`));
    expect(orphans).toEqual([]);
  });

  it('every GS exercise has its instruction clip', () => {
    // Same phrase as scripts/generate-voice-pilot.js: `say`, else the title, spaces collapsed
    const missing = [];
    for (const root of ['src/fr/exercices/gs', 'src/fr/applications/gs']) {
      for (const file of collectMd(path.join(ROOT, root))) {
        const front = fs.readFileSync(file, 'utf8').match(/^---\s*\n([\s\S]*?)\n---/);
        if (!front) continue;
        const data = yaml.load(front[1]);
        const text = typeof data?.say === 'string' ? data.say : typeof data?.title === 'string' ? data.title : '';
        if (!text) continue;
        const phrase = text.replace(/\s+/g, ' ').trim();
        if (!manifest[phrase]) missing.push(`${path.relative(ROOT, file)}: « ${phrase} »`);
      }
    }
    expect(missing).toEqual([]);
  });
});
