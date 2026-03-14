import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.js'],
    // svg.test.js carries a // @vitest-environment happy-dom docblock so it
    // gets the DOM environment it needs.  generators.test.js stays in Node.
    //
    // Run files one at a time (fresh fork per file) so the main Vite server
    // does not accumulate module-graph memory for both files in parallel,
    // which would push the process past V8's 4 GB heap ceiling.
    sequence: { concurrent: false },
    server: {
      deps: {
        // Load these source files as native CJS modules (bypass Vite ESM
        // transform) to avoid Vite JIT-compiling large source files in the
        // module graph, which can exhaust the process heap.
        external: [/src[\\/]assets[\\/]js[\\/]/],
      },
    },
  },
});
