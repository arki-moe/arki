import * as path from 'path';
import { Tool } from '../Tool.js';
import { TOOLS } from '../../global.js';
import { workingDir } from '../../fs/paths.js';
import { cachedFileSystem, TargetNotFoundError, AmbiguousTargetError } from '../../fs/CachedFileSystem.js';
import manualContent from './manual.md';

TOOLS['replace_text'] = new Tool({
  name: 'replace_text',
  parameters: {
    path: { type: 'string', description: 'File path' },
    target: { type: 'string', description: 'Target string to replace (must be unique)' },
    new_content: { type: 'string', description: 'Content to replace target with' },
  },
  required: ['path', 'target', 'new_content'],
  manualContent,
  execute: async (args, context) => {
    const filePath = args.path as string;
    const target = args.target as string;
    const newContent = args.new_content as string;

    try {
      const fullPath = path.resolve(workingDir, filePath);
      await cachedFileSystem.replace(fullPath, target, newContent, context.agentId);
      return `Replaced target in ${filePath}. Use flush_changes to write to disk.`;
    } catch (error) {
      if (error instanceof TargetNotFoundError) {
        return { content: `Target not found: "${target}" does not exist in ${filePath}`, isError: true };
      }
      if (error instanceof AmbiguousTargetError) {
        return { content: `Ambiguous target: "${target}" appears multiple times in ${filePath}. Provide more context to make it unique.`, isError: true };
      }
      return {
        content: `Failed to replace text: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  },
});
