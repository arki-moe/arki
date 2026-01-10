import * as path from 'path';
import { Tool } from '../Tool.js';
import { TOOLS } from '../../global.js';
import { workingDir } from '../../fs/paths.js';
import { cachedFileSystem } from '../../fs/CachedFileSystem.js';
import manualContent from './manual.md';

TOOLS['cached_read_file'] = new Tool({
  name: 'cached_read_file',
  parameters: {
    path: { type: 'string', description: 'File path' },
  },
  required: ['path'],
  manualContent,
  execute: async (args, context) => {
    const filePath = args.path as string;

    try {
      const fullPath = path.resolve(workingDir, filePath);
      const content = await cachedFileSystem.readFile(fullPath, context.agentId);

      if (content === null) {
        return { content: `File not found: ${filePath}`, isError: true };
      }

      return content;
    } catch (error) {
      return {
        content: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  },
});
