import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// The build encodes type/class as indexes into these lists; app.js decodes them (dashboard, exercise list).
// A drift shifts every code after it, so the two copies must stay identical.
const list = (file, name) => {
  const src = readFileSync(file, 'utf8');
  const m = src.match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`));
  return [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]);
};

describe('CSV_TYPES / CSV_CLASSES', () => {
  for (const name of ['CSV_TYPES', 'CSV_CLASSES']) {
    it(`${name} is the same in .eleventy.js and app.js`, () => {
      expect(list('src/assets/js/app.js', name)).toEqual(list('.eleventy.js', name));
    });
  }
});
