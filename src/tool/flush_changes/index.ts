import { Tool } from '../Tool.js';
import { TOOLS } from '../../global.js';
import { cachedFileSystem, ConflictError } from '../../fs/CachedFileSystem.js';
import manualContent from './manual.md';

TOOLS['flush_changes'] = new Tool({
  name: 'flush_changes',
  parameters: {},
  required: [],
  manualContent,
  execute: async (_args, context) => {
    try {
      await cachedFileSystem.flush(context.agentId);
      return 'All changes written to disk successfully.';
    } catch (error) {
      if (error instanceof ConflictError) {
        const conflictInfo = error.conflicts.map((c) => {
          const agents = c.agents.join(', ');
          return `- ${c.filePath}: conflict between agents [${agents}] at region ${c.region.start}-${c.region.end}`;
        }).join('\n');
        return {
          content: `Cannot flush: conflicts detected\n${conflictInfo}`,
          isError: true,
        };
      }
      return {
        content: `Failed to flush changes: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  },
});
