import { Tool } from '../Tool.js';
import { TOOLS, workingDir } from '../../global.js';
import manualContent from './manual.md';

TOOLS['run_command'] = new Tool({
  name: 'run_command',
  parameters: {
    command: { type: 'string', description: 'Command to execute' },
  },
  required: ['command'],
  manualContent,
  execute: async (args) => {
    const command = args.command as string;
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const { stdout, stderr } = await execAsync(command, {
        cwd: workingDir,
        timeout: 30000,
      });

      let result = '';
      if (stdout) result += stdout;
      if (stderr) result += `\n[stderr]\n${stderr}`;
      return result.trim() || 'Command executed successfully (no output)';
    } catch (error) {
      return {
        content: `Command execution failed: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  },
});
