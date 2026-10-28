import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup-each.ts'],
    // one shared database: run files one after another so one file's clean-up
    // can never empty the tables in the middle of another file's test
    fileParallelism: false,
  },
});
