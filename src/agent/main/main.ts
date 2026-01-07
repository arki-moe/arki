import { Agent, SystemMsg } from '../index.js';
import { adapter, workingDir } from '../../global.js';
import { log, isDebugMode } from '../../log/index.js';
import { createColorConverter } from './colors.js';
import { HAS_MANUAL } from '../../tool/Tool.js';
import systemPromptTemplate from './system.md';

/**
 * Create main agent
 */
export function createMainAgent(): Agent {
  if (!adapter) {
    throw new Error('Adapter not initialized, please call init() first');
  }

  const systemInstruction = Agent.renderTemplate(systemPromptTemplate, {
    working_dir: workingDir,
    has_manual: HAS_MANUAL,
  });

  const convertColor = createColorConverter();
  const agent = new Agent({
    adapter,
    messages: [new SystemMsg(systemInstruction)],
    onStream: (chunk) => {
      process.stdout.write(convertColor(chunk));
    },
    onBeforeToolRun: (name, args) => {
      const argsStr = JSON.stringify(args);
      const argsPreview = argsStr.length > 60 ? argsStr.substring(0, 60) + '...' : argsStr;
      if (isDebugMode()) {
        // Debug mode: newline to avoid interference with debug logs
        console.log(`\x1b[33m🔧 ${name}\x1b[0m \x1b[2m${argsPreview}\x1b[0m`);
      } else {
        // Normal mode: no newline, will be overwritten when complete
        process.stdout.write(`\x1b[33m🔧 ${name}\x1b[0m \x1b[2m${argsPreview}\x1b[0m`);
      }
    },
    onToolResult: (name, args, result) => {
      const argsStr = JSON.stringify(args);
      const argsPreview = argsStr.length > 60 ? argsStr.substring(0, 60) + '...' : argsStr;
      const resultPreview = result.length > 80 ? result.substring(0, 80) + '...' : result;
      const firstLine = resultPreview.split('\n')[0];
      if (isDebugMode()) {
        // Debug mode: just print completion status
        console.log(`\x1b[32m✔ ${name}\x1b[0m \x1b[2m${argsPreview}\x1b[0m`);
      } else {
        // Normal mode: clear line and overwrite
        process.stdout.write(`\r\x1b[2K\x1b[32m✔ ${name}\x1b[0m \x1b[2m${argsPreview}\x1b[0m\n`);
      }
      log('dim', `   ${firstLine}`);
    },
  });

  return agent;
}
