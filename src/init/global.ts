import { Tool } from '../tool/Tool.js';
import { Procedure } from '../procedure/Procedure.js';
import { Adapter } from '../adapter/Adapter.js';
import { OpenAIAdapter } from '../adapter/openai.js';
import { PATHS, copyDir, dirExists } from '../fs/index.js';

/** Global tool registry */
export const TOOLS: Record<string, Tool> = {};

/** Global procedure registry */
export const PROCEDURES: Record<string, Procedure> = {};

/** Global adapter registry by platform */
export const adapters: Record<string, Adapter> = {};

/**
 * Get adapter by platform name
 */
export function getAdapter(platform: string): Adapter {
  const adapter = adapters[platform];
  if (!adapter) {
    throw new Error(`Adapter not found for platform: ${platform}`);
  }
  return adapter;
}

/**
 * Initialize global configuration
 * - Checks if global config directory exists
 * - If not, copies the template from package
 */
async function initGlobalConfig(): Promise<void> {
  const globalConfigDir = PATHS.globalConfig;
  if (await dirExists(globalConfigDir)) return;
  await copyDir(PATHS.globalTemplate, globalConfigDir);
}

/**
 * Initialize adapters based on available API keys
 */
async function initAdapters(): Promise<void> {
  const { getApiKey } = await import('./loader.js');

  // Initialize OpenAI adapter if API key is available
  const openaiKey = getApiKey('openai');
  if (openaiKey) {
    adapters['openai'] = new OpenAIAdapter(openaiKey);
  }

  // Future: Add more adapters here
  // const anthropicKey = getApiKey('anthropic');
  // if (anthropicKey) {
  //   adapters['anthropic'] = new AnthropicAdapter(anthropicKey);
  // }
}

/** Initialize global state */
export async function init(cwd?: string, forceInit?: boolean): Promise<void> {
  const { setWorkingDir } = await import('../fs/index.js');
  setWorkingDir(cwd || process.cwd());

  await initGlobalConfig();

  const { initProject } = await import('./project.js');
  await initProject(forceInit);

  const { loadConfigs } = await import('./loader.js');
  await loadConfigs();

  await initAdapters();
}
