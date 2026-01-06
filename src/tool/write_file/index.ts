import * as fs from 'fs/promises';
import * as path from 'path';
import { Tool } from '../Tool.js';
import { TOOLS, workingDir } from '../../global.js';
import manualContent from './manual.md';

TOOLS['write_file'] = new Tool({
  name: 'write_file',
  parameters: {
    path: { type: 'string', description: 'File path' },
    content: { type: 'string', description: 'Content to write' },
  },
  required: ['path', 'content'],
  manualContent,
  execute: async (args) => {
    const filePath = args.path as string;
    const content = args.content as string;
    try {
      const fullPath = path.resolve(workingDir, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
      return `File written successfully: ${filePath}`;
    } catch (error) {
      return {
        content: `Failed to write file: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  },
});
