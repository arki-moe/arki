import { Tool } from '../tool/Tool.js';
import { Procedure } from '../procedure/Procedure.js';
import { Adapter } from '../adapter/Adapter.js';
import { OpenAIAdapter } from '../adapter/openai.js';
import { PATHS, copyDir, dirExists } from '../fs/index.js';

/** Global tool registry */
export const TOOLS: Record<string, Tool> = {};

/** Global procedure registry */
export const PROCEDURES: Record<string, Procedure> = {};

/** Global Adapter instance */
export let adapter: Adapter | null = null;

/**
 * Initialize global configuration
 * - Checks if global config directory exists
 * - If not, copies the template from package
 */
export async function initGlobalConfig(): Promise<void> {
  const globalConfigDir = PATHS.globalConfig;

  if (await dirExists(globalConfigDir)) {
    return;
  }

  // Copy global config template to user's config directory
  await copyDir(PATHS.globalTemplate, globalConfigDir);
}

/** Initialize global Adapter */
export function initAdapter(): void {
  if (adapter) {
    return;
  }

  // Import dynamically to avoid circular dependency
  import('./index.js').then(({ getAgentConfig, getApiKey }) => {
    const mainAgentConfig = getAgentConfig('main');
    adapter = new OpenAIAdapter({
      apiKey: getApiKey('openai') || '',
      model: mainAgentConfig.model,
      flex: mainAgentConfig.flex,
      tools: Object.values(TOOLS),
    });
  });
}

/** Initialize global state */
export async function init(cwd?: string): Promise<void> {
  const { setWorkingDir } = await import('../fs/index.js');
  setWorkingDir(cwd || process.cwd());

  await initGlobalConfig();

  const { initProject } = await import('./project.js');
  await initProject();

  const { loadConfigs, getAgentConfig, getApiKey } = await import('./loader.js');
  await loadConfigs();

  // Initialize adapter after config is loaded
  const mainAgentConfig = getAgentConfig('main');
  adapter = new OpenAIAdapter({
    apiKey: getApiKey('openai') || '',
    model: mainAgentConfig.model,
    flex: mainAgentConfig.flex,
    tools: Object.values(TOOLS),
  });
}
