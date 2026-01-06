import { Agent, SystemMsg } from '../index.js';
import { adapter, TOOLS, workingDir } from '../../global.js';
import { log } from '../../log/index.js';
import { createColorConverter } from './colors.js';
import systemPromptTemplate from './system.md';

/**
 * Create main agent
 */
export function createMainAgent(): Agent {
  if (!adapter) {
    throw new Error('Adapter not initialized, please call init() first');
  }

  const toolDescriptions = Object.values(TOOLS).map((t) => `${t.name}: ${t.description}`).join('\n');

  const systemInstruction = Agent.renderTemplate(systemPromptTemplate, {
    working_dir: workingDir,
    current_time: new Date().toLocaleString(),
    tools: toolDescriptions,
  });

  const convertColor = createColorConverter();
  const agent = new Agent({
    adapter,
    messages: [new SystemMsg(systemInstruction)],
    onStream: (chunk) => {
      process.stdout.write(convertColor(chunk));
    },
    onBeforeToolRun: (name, args) => {
      // Output calling status without newline, will be updated when complete
      const argsStr = JSON.stringify(args);
      const argsPreview = argsStr.length > 60 ? argsStr.substring(0, 60) + '...' : argsStr;
      process.stdout.write(`\x1b[33m🔧 ${name}\x1b[0m \x1b[2m${argsPreview}\x1b[0m`);
    },
    onToolResult: (name, args, result) => {
      // Clear current line and show completed status
      const argsStr = JSON.stringify(args);
      const argsPreview = argsStr.length > 60 ? argsStr.substring(0, 60) + '...' : argsStr;
      const resultPreview = result.length > 80 ? result.substring(0, 80) + '...' : result;
      const firstLine = resultPreview.split('\n')[0];
      process.stdout.write(`\r\x1b[2K\x1b[32m✔ ${name}\x1b[0m \x1b[2m${argsPreview}\x1b[0m\n`);
      log('dim', `   ${firstLine}`);
    },
  });

  return agent;
}
