import { defineConfig } from 'tsup';

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
});

