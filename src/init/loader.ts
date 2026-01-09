import * as path from 'path';
import { PATHS, readJsonFile, writeJsonFile } from '../fs/index.js';

/**
 * Agent type
 */
export type AgentType = 'arki' | 'coder';

/**
 * Reasoning effort
 */
export type ReasoningEffort = 'low' | 'medium' | 'high';

/**
 * Agent model configuration
 */
export interface AgentModelConfig {
  /** Model ID (provider is derived from MODELS) */
  model: string;
  /** Use Flex API (low priority, low cost) - OpenAI specific */
  flex?: boolean;
  /** Reasoning effort (thinking mode) */
  reasoningEffort?: ReasoningEffort;
}

/**
 * Global configuration (from config files)
 */
export interface GlobalConfig {
  agents: {
    [K in AgentType]?: AgentModelConfig;
  };
}

/** Merged configuration */
let mergedConfig: GlobalConfig | null = null;

/**
 * Deep merge two config objects
 */
function deepMerge(base: GlobalConfig, override: Partial<GlobalConfig>): GlobalConfig {
  const result: GlobalConfig = {
    ...base,
    agents: { ...base.agents },
  };

  // Merge agents
  if (override.agents) {
    for (const key of Object.keys(override.agents) as AgentType[]) {
      const overrideAgent = override.agents[key];
      if (overrideAgent) {
        result.agents[key] = { ...result.agents[key], ...overrideAgent };
      }
    }
  }

  return result;
}

/**
 * Load and merge configurations
 * - Loads global config from ~/.config/arki/config.json
 * - Loads project config from .arki/config.json (if exists)
 * - Merges them (project config overrides global)
 */
export async function loadConfigs(): Promise<GlobalConfig> {
  if (mergedConfig) {
    return mergedConfig;
  }

  // Load global config
  const globalConfigPath = path.join(PATHS.globalConfig, 'config.json');
  const globalConfig = await readJsonFile<GlobalConfig>(globalConfigPath);

  if (!globalConfig) {
    throw new Error(`Failed to load global config: ${globalConfigPath}`);
  }

  // Load project config (optional)
  const projectConfigPath = path.join(PATHS.projectConfig, 'config.json');
  const projectConfig = await readJsonFile<Partial<GlobalConfig>>(projectConfigPath);

  // Merge configs
  if (projectConfig) {
    mergedConfig = deepMerge(globalConfig, projectConfig);
  } else {
    mergedConfig = globalConfig;
  }

  return mergedConfig;
}

/**
 * Get loaded configuration
 */
export function getConfig(): GlobalConfig {
  if (!mergedConfig) {
    throw new Error('Config not loaded yet. Please call loadConfigs() first.');
  }
  return mergedConfig;
}

/**
 * Get API key from environment variable
 */
export function getApiKey(provider: string): string | undefined {
  const envMap: Record<string, string> = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_API_KEY',
  };
  const envVar = envMap[provider] || `${provider.toUpperCase()}_API_KEY`;
  return process.env[envVar];
}

/**
 * Get agent configuration
 */
export function getAgentConfig(agentType: AgentType): AgentModelConfig {
  const agentConfig = getConfig().agents[agentType];
  if (!agentConfig) {
    throw new Error(`Agent config not found: ${agentType}`);
  }
  return agentConfig;
}

/**
 * Save configuration to global config file
 */
export async function saveConfig(): Promise<void> {
  const config = getConfig();
  const configPath = path.join(PATHS.globalConfig, 'config.json');
  await writeJsonFile(configPath, config);
}
