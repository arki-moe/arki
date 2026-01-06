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
    onToolCallMsg: (msg) => {
      for (const tc of msg.toolCalls) {
        console.log();
        log('yellow', `🔧 Calling tool: ${tc.name}`);
        log('dim', `   Arguments: ${JSON.stringify(tc.arguments)}`);
      }
    },
    onToolResult: (_name, result) => {
      const preview = result.length > 200 ? result.substring(0, 200) + '...' : result;
      log('green', `   Result: ${preview.split('\n')[0]}`);
      console.log();
    },
  });

  return agent;
}
