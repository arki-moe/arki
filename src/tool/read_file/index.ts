import * as fs from 'fs/promises';
import * as path from 'path';
import { Tool } from '../Tool.js';
import { TOOLS, workingDir } from '../../global.js';
import manualContent from './manual.md';

TOOLS['read_file'] = new Tool({
  name: 'read_file',
  parameters: {
    path: { type: 'string', description: 'File path' },
  },
  required: ['path'],
  manualContent,
  execute: async (args) => {
    const filePath = args.path as string;
    try {
      const fullPath = path.resolve(workingDir, filePath);
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      return {
        content: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  },
});
