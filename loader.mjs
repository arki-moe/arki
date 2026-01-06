import { readFileSync } from 'node:fs';

export async function load(url, context, nextLoad) {
  if (url.endsWith('.md')) {
    try {
      const content = readFileSync(new URL(url), 'utf-8');
      return {
        format: 'module',
        source: `export default ${JSON.stringify(content)};`,
        shortCircuit: true,
      };
    } catch (error) {
      throw new Error(`Failed to load .md file: ${url} - ${error.message}`);
    }
  }
  return nextLoad(url, context);
}
