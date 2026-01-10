import { OpenAIAdapter } from '../adapter/openai.js';
import { fileSystem } from '../fs/FileSystem.js';
import { PATHS } from '../fs/paths.js';
import { ADAPTERS } from '../global.js';

/**
 * Initialize global configuration
 * - Checks if global config directory exists
 * - If not, copies the template from package
 */
async function initGlobalConfig(): Promise<void> {
  const globalConfigDir = PATHS.globalConfig;
  if (await fileSystem.dirExists(globalConfigDir)) return;
  await fileSystem.copyDir(PATHS.globalTemplate, globalConfigDir);
}

/**
 * Initialize adapters based on available API keys
 */
async function initAdapters(): Promise<void> {
  const { getApiKey } = await import('./loader.js');

  // Initialize OpenAI adapter if API key is available
  const openaiKey = getApiKey('openai');
  if (openaiKey) {
    ADAPTERS['openai'] = new OpenAIAdapter(openaiKey);
  }

  // Future: Add more adapters here
  // const anthropicKey = getApiKey('anthropic');
  // if (anthropicKey) {
  //   ADAPTERS['anthropic'] = new AnthropicAdapter(anthropicKey);
  // }
}

/** Initialize global state */
export async function init(cwd?: string, forceInit?: boolean): Promise<void> {
  const { setWorkingDir } = await import('../fs/paths.js');
  setWorkingDir(cwd || process.cwd());

  await initGlobalConfig();

  const { initProject } = await import('./project.js');
  await initProject(forceInit);

  const { loadConfigs } = await import('./loader.js');
  await loadConfigs();

  await initAdapters();
}
