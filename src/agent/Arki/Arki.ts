import { Agent, SystemMsg } from '../index.js';
import { adapter, workingDir } from '../../global.js';
import { log, createColorConverter } from '../../log/index.js';
import { HAS_MANUAL } from '../../tool/Tool.js';
import systemPromptTemplate from './system.md';

/** Track tool start times for elapsed calculation */
const toolStartTimes = new Map<string, number>();

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
      toolStartTimes.set(name, Date.now());
      const argsStr = JSON.stringify(args);
      const argsPreview = argsStr.length > 60 ? argsStr.substring(0, 60) + '...' : argsStr;
      log(`<yellow>[TOOL]</yellow> ${name} <dim>${argsPreview}</dim>`);
    },
    onToolResult: (name, args, result) => {
      const startTime = toolStartTimes.get(name) || Date.now();
      const elapsed = Date.now() - startTime;
      toolStartTimes.delete(name);

      const resultPreview = result.length > 80 ? result.substring(0, 80) + '...' : result;
      const firstLine = resultPreview.split('\n')[0];
      log(`<green>[DONE]</green> ${name} <dim>(${elapsed}ms) ${firstLine}</dim>`);
    },
  });

  return agent;
}

