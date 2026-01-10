import * as fs from 'fs/promises';
import * as path from 'path';
import { Tool } from '../Tool.js';
import { TOOLS } from '../../global.js';
import { workingDir } from '../../fs/paths.js';
import manualContent from './manual.md';

TOOLS['delete_directory'] = new Tool({
  name: 'delete_directory',
  parameters: {
    path: { type: 'string', description: 'Directory path to delete' },
    recursive: { type: 'boolean', description: 'Delete directory and all contents (default: false)' },
  },
  required: ['path'],
  manualContent,
  execute: async (args, _context) => {
    const dirPath = args.path as string;
    const recursive = (args.recursive as boolean) ?? false;
    try {
      const fullPath = path.resolve(workingDir, dirPath);
      const stat = await fs.stat(fullPath);
      if (!stat.isDirectory()) {
        return {
          content: `Cannot delete: ${dirPath} is not a directory. Use delete_file instead.`,
          isError: true,
        };
      }
      if (recursive) {
        await fs.rm(fullPath, { recursive: true });
      } else {
        await fs.rmdir(fullPath);
      }
      return `Directory deleted: ${dirPath}`;
    } catch (error) {
      return {
        content: `Failed to delete directory: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  },
});
