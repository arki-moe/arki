import * as path from 'path';
import { Tool } from '../Tool.js';
import { TOOLS } from '../../global.js';
import { workingDir } from '../../fs/paths.js';
import { cachedFileSystem } from '../../fs/CachedFileSystem.js';
import manualContent from './manual.md';

TOOLS['get_pending_changes'] = new Tool({
  name: 'get_pending_changes',
  parameters: {
    path: { type: 'string', description: 'File path (optional, filter by file)' },
  },
  required: [],
  manualContent,
  execute: async (args, context) => {
    const filePath = args.path as string | undefined;

    try {
      const fullPath = filePath ? path.resolve(workingDir, filePath) : undefined;
      const operations = cachedFileSystem.getOperations(context.agentId, fullPath);

      if (operations.length === 0) {
        return 'No pending changes.';
      }

      const lines = operations.map((op, i) => {
        const targetPreview = op.target.length > 50 ? op.target.slice(0, 50) + '...' : op.target;
        switch (op.type) {
          case 'insert':
            return `${i + 1}. INSERT ${op.position} "${targetPreview}"`;
          case 'replace':
            return `${i + 1}. REPLACE "${targetPreview}"`;
          case 'delete':
            return `${i + 1}. DELETE "${targetPreview}"`;
        }
      });

      return `Pending changes (${operations.length}):\n${lines.join('\n')}`;
    } catch (error) {
      return {
        content: `Failed to get pending changes: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  },
});
