import { Tool } from '../Tool.js';
import { TOOLS } from '../../global.js';
import manualContent from './manual.md';

TOOLS['get_tool_info'] = new Tool({
  name: 'get_tool_info',
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
