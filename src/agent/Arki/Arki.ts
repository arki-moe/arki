import { Agent, SystemMsg } from '../index.js';
import { getAdapter, workingDir, PROCEDURES, TOOLS } from '../../global.js';
import { getAgentConfig } from '../../init/index.js';
import { MODELS } from '../../model/index.js';
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

  const agent = new Agent({
    name: 'Arki',
    adapter,
    model: config.model,
    tools,
    maxCompletionTokens: MAX_COMPLETION_TOKENS,
    platformOptions: {
      flex: config.flex,
      reasoningEffort: config.reasoningEffort,
    },
    messages: [new SystemMsg(systemInstruction)],
  });

  return agent;
}
