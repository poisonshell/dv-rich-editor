import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    coverage: {
      reporter: ['text', 'lcov'],
      exclude: ['dist', 'rollup.config.*', 'vite.config.*']
    }
  }
});
