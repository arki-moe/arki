import * as fs from 'fs/promises';
import * as path from 'path';
import { Tool } from '../Tool.js';
import { TOOLS } from '../../global.js';
import { workingDir } from '../../fs/paths.js';
import manualContent from './manual.md';

TOOLS['delete_file'] = new Tool({
  name: 'delete_file',
  parameters: {
    path: { type: 'string', description: 'File path to delete' },
  },
  required: ['path'],
  manualContent,
  execute: async (args, _context) => {
    const filePath = args.path as string;
    try {
      const fullPath = path.resolve(workingDir, filePath);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        return {
          content: `Cannot delete: ${filePath} is a directory. Use delete_directory instead.`,
          isError: true,
        };
      }
      await fs.unlink(fullPath);
      return `File deleted: ${filePath}`;
    } catch (error) {
      return {
        content: `Failed to delete file: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  },
});
