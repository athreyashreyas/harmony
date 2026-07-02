import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// One test project for the whole monorepo. Everything under test is pure logic
// (scheduling, drift, templates, the Bloom's fill maths, version comparison), so
// a plain Node environment is all it needs — no jsdom, no Worker runtime.
//
// The web app and the push worker both import the shared engine as
// '@harmony/shared', which resolves to source (no build step); mirror that here
// so tests exercise exactly the code that ships.
export default defineConfig({
  resolve: {
    alias: {
      '@harmony/shared': resolve(__dirname, 'packages/shared/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
