import { defineConfig } from 'vitest/config';

// Tests that read the built site (_site/, or SITE_OUT): run after the build, by `npm run build` and check.js
export default defineConfig({
  test: {
    globals: true,
    include: ['tests/site-*.test.js'],
  },
});
