import * as fs from 'fs/promises';
import * as path from 'path';
import { Tool } from '../Tool.js';
import { TOOLS } from '../../global.js';
import { workingDir } from '../../fs/paths.js';
import manualContent from './manual.md';

TOOLS['list_directory'] = new Tool({
  name: 'list_directory',
  parameters: {
    path: { type: 'string', description: 'Directory path' },
  },
  required: [],
  manualContent,
  execute: async (args) => {
    const dirPath = (args.path as string) || '.';
    try {
      const fullPath = path.resolve(workingDir, dirPath);
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const result = entries.map((entry) => {
        const type = entry.isDirectory() ? '[DIR]' : '[FILE]';
        return `${type} ${entry.name}`;
      });
      return result.join('\n') || 'Directory is empty';
    } catch (error) {
      return {
        content: `Failed to list directory: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  },
});
