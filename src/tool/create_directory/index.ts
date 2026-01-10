import * as fs from 'fs/promises';
import * as path from 'path';
import { Tool } from '../Tool.js';
import { TOOLS } from '../../global.js';
import { workingDir } from '../../fs/paths.js';
import manualContent from './manual.md';

TOOLS['create_directory'] = new Tool({
  name: 'create_directory',
  parameters: {
    path: { type: 'string', description: 'Directory path' },
    recursive: { type: 'boolean', description: 'Create parent directories if needed (default: false)' },
  },
  required: ['path'],
  manualContent,
  execute: async (args, _context) => {
    const dirPath = args.path as string;
    const recursive = (args.recursive as boolean) ?? false;
    try {
      const fullPath = path.resolve(workingDir, dirPath);
      await fs.mkdir(fullPath, { recursive });
      return `Directory created: ${dirPath}`;
    } catch (error) {
      return {
        content: `Failed to create directory: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  },
});
