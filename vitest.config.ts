import { defineConfig } from 'vitest/config';
import { readFile } from 'fs/promises';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
    },
    testTimeout: 30000,
  },
  plugins: [
    {
      name: 'md-loader',
      async transform(_code, id) {
        if (id.endsWith('.md')) {
          const content = await readFile(id, 'utf-8');
          return {
            code: `export default ${JSON.stringify(content)}`,
            map: null,
          };
        }
      },
    },
  ],
});
