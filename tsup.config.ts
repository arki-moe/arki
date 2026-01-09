import { defineConfig } from 'tsup';
import { cpSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Copy directory recursively
 */
function copyDir(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'node18',
  splitting: false,
  sourcemap: false,
  // Inline md files as strings
  esbuildPlugins: [
    {
      name: 'md-loader',
      setup(build) {
        build.onLoad({ filter: /\.md$/ }, async (args) => {
          const fs = await import('fs/promises');
          const text = await fs.readFile(args.path, 'utf8');
          return {
            contents: `export default ${JSON.stringify(text)}`,
            loader: 'js',
          };
        });
      },
    },
  ],
  onSuccess: async () => {
    // Copy config templates to dist/config/
    copyDir(
      join(process.cwd(), 'src/config/arki'),
      join(process.cwd(), 'dist/config/arki')
    );
    copyDir(
      join(process.cwd(), 'src/config/.arki'),
      join(process.cwd(), 'dist/config/.arki')
    );
  },
});

