import { Tool } from '../Tool.js';
import { TOOLS } from '../../global.js';
import manualContent from './manual.md';

TOOLS['read_tool_manual'] = new Tool({
  name: 'read_tool_manual',
  parameters: {
    tool_name: { type: 'string', description: 'Tool name to view' },
  },
  required: ['tool_name'],
  manualContent,
  execute: async (args) => {
    const toolName = args.tool_name as string;

    const foundTool = TOOLS[toolName];

    if (!foundTool) {
      const availableTools = Object.keys(TOOLS).join(', ');
      return {
        content: `Tool not found: ${toolName}\nAvailable tools: ${availableTools}`,
        isError: true,
      };
    }

    return `# ${foundTool.name}\n\n${foundTool.description}\n\n${foundTool.manual}`;
  },
});

