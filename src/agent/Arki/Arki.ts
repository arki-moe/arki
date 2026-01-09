import { Agent, SystemMsg } from '../index.js';
import { getAdapter, workingDir, PROCEDURES, TOOLS } from '../../global.js';
import { getAgentConfig } from '../../init/index.js';
import { MODELS } from '../../model/index.js';
import { log, isDebugMode, createColorConverter } from '../../log/index.js';
import { HAS_MANUAL } from '../../tool/Tool.js';
import systemPromptTemplate from './system.md';

/** Maximum completion tokens for Arki agent */
const MAX_COMPLETION_TOKENS = 4096;

/** Track tool start times for elapsed calculation */
const toolStartTimes = new Map<string, number>();

/**
 * Create arki agent
 */
export function createArkiAgent(): Agent {
  const config = getAgentConfig('arki');
  const model = MODELS[config.model];
  if (!model) {
    throw new Error(`Unknown model: ${config.model}`);
  }
  const adapter = getAdapter(model.provider);

  // Generate procedures list
  const proceduresList = Object.values(PROCEDURES)
    .map((p) => `- ${p.name}: ${p.description}`)
    .join('\n');

  const systemInstruction = Agent.renderTemplate(systemPromptTemplate, {
    working_dir: workingDir,
    has_manual: HAS_MANUAL,
    procedures: proceduresList || '(none)',
  });

  const convertColor = createColorConverter();
  const agent = new Agent({
    adapter,
    model: config.model,
    tools: Object.values(TOOLS),
    maxCompletionTokens: MAX_COMPLETION_TOKENS,
    platformOptions: {
      flex: config.flex,
      reasoningEffort: config.reasoningEffort,
    },
    messages: [new SystemMsg(systemInstruction)],
    onStream: (chunk) => {
      process.stdout.write(convertColor(chunk));
    },
    onBeforeToolRun: (name) => {
      toolStartTimes.set(name, Date.now());
    },
    onToolResult: (name, args, result) => {
      const startTime = toolStartTimes.get(name) || Date.now();
      const elapsed = Date.now() - startTime;
      toolStartTimes.delete(name);

      const argsStr = JSON.stringify(args);
      const argsPreview = argsStr.length > 60 ? argsStr.substring(0, 60) + '...' : argsStr;

      let output = `<green>[TOOL]</green> ${name} <dim>${argsPreview} (${elapsed}ms)`;
      if (isDebugMode()) {
        const lines = result.split('\n').filter((l) => l.trim());
        let summary: string;
        if (lines.length <= 3) {
          summary = lines.join(', ');
          if (summary.length > 60) summary = summary.substring(0, 60) + '...';
        } else {
          const preview = lines.slice(0, 3).join(', ');
          summary = preview.length > 50 ? preview.substring(0, 50) + '...' : preview;
          summary += ` (+${lines.length - 3} more)`;
        }
        output += ` -> ${summary}`;
      }
      output += '</dim>';
      log(output);
    },
  });

  return agent;
}
