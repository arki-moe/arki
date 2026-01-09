import { Agent, SystemMsg } from '../index.js';
import { getAdapter, workingDir, PROCEDURES, TOOLS } from '../../global.js';
import { getAgentConfig } from '../../init/index.js';
import { MODELS } from '../../model/index.js';
import { log, isDebugMode, createColorConverter } from '../../log/index.js';
import { HAS_MANUAL } from '../../tool/Tool.js';
import systemPromptTemplate from './system.md';

/** Maximum completion tokens for Arki agent */
const MAX_COMPLETION_TOKENS = 4096;

/** Tools available for Arki agent */
const ARKI_TOOLS = [
  'read_file',
  'write_file',
  'list_directory',
  'run_command',
  'read_tool_manual',
  'read_procedure',
];

/** Procedures available for Arki agent */
const ARKI_PROCEDURES = ['understand_project'];

/** Track tool start times for elapsed calculation */
const toolStartTimes = new Map<string, number>();

/**
 * Create arki agent
 */
export function createArkiAgent(): Agent {
  const config = getAgentConfig('Arki');
  const model = MODELS[config.model];
  if (!model) {
    throw new Error(`Unknown model: ${config.model}`);
  }
  const adapter = getAdapter(model.provider);

  // Get tools for this agent
  const tools = ARKI_TOOLS.map((name) => TOOLS[name]).filter(Boolean);

  // Generate procedures list for this agent
  const procedures = ARKI_PROCEDURES.map((name) => PROCEDURES[name]).filter(Boolean);
  const proceduresList = procedures.map((p) => `- ${p.name}: ${p.description}`).join('\n');

  const systemInstruction = Agent.renderTemplate(systemPromptTemplate, {
    working_dir: workingDir,
    has_manual: HAS_MANUAL,
    procedures: proceduresList || '(none)',
  });

  const agentName = 'Arki';
  const convertColor = createColorConverter();
  const agent = new Agent({
    name: agentName,
    adapter,
    model: config.model,
    tools,
    maxCompletionTokens: MAX_COMPLETION_TOKENS,
    platformOptions: {
      flex: config.flex,
      reasoningEffort: config.reasoningEffort,
    },
    messages: [new SystemMsg(systemInstruction)],
    onStream: (chunk) => {
      process.stdout.write(convertColor(chunk));
    },
    onBeforeToolRun: (toolName) => {
      toolStartTimes.set(toolName, Date.now());
    },
    onToolResult: (toolName, args, result) => {
      const startTime = toolStartTimes.get(toolName) || Date.now();
      const elapsed = Date.now() - startTime;
      toolStartTimes.delete(toolName);

      const argsStr = JSON.stringify(args);
      const argsPreview = argsStr.length > 60 ? argsStr.substring(0, 60) + '...' : argsStr;

      let output = `<cyan>[${agentName}]</cyan><green>[${toolName}]</green> <dim>${argsPreview} (${elapsed}ms)`;
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
