import * as path from 'path';
import { PATHS, readJsonFile, writeJsonFile } from '../fs/index.js';

/**
 * Agent type
 */
export type AgentType = 'main' | 'coder';

/**
 * Reasoning effort
 */
export type ReasoningEffort = 'low' | 'medium' | 'high';

/**
 * Agent model configuration
 */
export interface AgentModelConfig {
  /** Model ID */
  model: string;
  /** Use Flex API (low priority, low cost) */
  flex?: boolean;
  /** Reasoning effort (thinking mode) */
  reasoningEffort?: ReasoningEffort;
}

/**
 * Global configuration
 */
export interface GlobalConfig {
  apiKeys?: {
    openai?: string;
    anthropic?: string;
    google?: string;
    [key: string]: string | undefined;
  };
  agents: {
    [K in AgentType]?: AgentModelConfig;
  };
}

/** Merged configuration */
let mergedConfig: GlobalConfig | null = null;

/**
 * Deep merge two objects
 */
function deepMerge(base: GlobalConfig, override: Partial<GlobalConfig>): GlobalConfig {
  const result: GlobalConfig = {
    ...base,
    agents: { ...base.agents },
  };

  // Merge apiKeys
  if (override.apiKeys) {
    result.apiKeys = { ...base.apiKeys, ...override.apiKeys };
  }

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
 * Load environment API keys
 */
function loadEnvApiKeys(config: GlobalConfig): void {
  if (process.env.OPENAI_API_KEY) {
    if (!config.apiKeys) config.apiKeys = {};
    if (!config.apiKeys.openai) {
      config.apiKeys.openai = process.env.OPENAI_API_KEY;
    }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    if (!config.apiKeys) config.apiKeys = {};
    if (!config.apiKeys.anthropic) {
      config.apiKeys.anthropic = process.env.ANTHROPIC_API_KEY;
    }
  }
  if (process.env.GOOGLE_API_KEY) {
    if (!config.apiKeys) config.apiKeys = {};
    if (!config.apiKeys.google) {
      config.apiKeys.google = process.env.GOOGLE_API_KEY;
    }
  }
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

  // Load API keys from environment
  loadEnvApiKeys(mergedConfig);

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
 * Get API key for a provider
 */
export function getApiKey(provider: string): string | undefined {
  return getConfig().apiKeys?.[provider];
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

  // Remove env API keys before saving
  const configToSave = { ...config };
  if (config.apiKeys) {
    configToSave.apiKeys = { ...config.apiKeys };
    if (process.env.OPENAI_API_KEY && configToSave.apiKeys.openai === process.env.OPENAI_API_KEY) {
      delete configToSave.apiKeys.openai;
    }
    if (process.env.ANTHROPIC_API_KEY && configToSave.apiKeys.anthropic === process.env.ANTHROPIC_API_KEY) {
      delete configToSave.apiKeys.anthropic;
    }
    if (process.env.GOOGLE_API_KEY && configToSave.apiKeys.google === process.env.GOOGLE_API_KEY) {
      delete configToSave.apiKeys.google;
    }
  }

  await writeJsonFile(configPath, configToSave);
}
