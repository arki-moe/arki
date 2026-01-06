import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';

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

/**
 * Configuration file path
 */
function getConfigPath(): string {
  return path.join(os.homedir(), '.config', 'arki', 'config.json');
}

/**
 * Default configuration file path in package
 */
function getDefaultConfigPath(): string {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.join(__dirname, 'config.json');
}

/**
 * Global configuration manager
 */
class ConfigManager {
  private config!: GlobalConfig;
  private loaded = false;

  /**
   * Load configuration (called at program startup)
   */
  async load(): Promise<GlobalConfig> {
    if (this.loaded) {
      return this.config;
    }

    const configPath = getConfigPath();

    try {
      const content = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(content) as GlobalConfig;
    } catch {
      const defaultContent = await fs.readFile(getDefaultConfigPath(), 'utf-8');
      this.config = JSON.parse(defaultContent) as GlobalConfig;

      const configDir = path.dirname(configPath);
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(configPath, defaultContent, 'utf-8');
    }

    this.loadEnvApiKeys();

    this.loaded = true;
    return this.config;
  }

  /**
   * Save configuration
   */
  async save(): Promise<void> {
    const configPath = getConfigPath();
    const configToSave = { ...this.config };

    if (this.config.apiKeys) {
      configToSave.apiKeys = { ...this.config.apiKeys };
      if (process.env.OPENAI_API_KEY && configToSave.apiKeys.openai === process.env.OPENAI_API_KEY) {
        delete configToSave.apiKeys.openai;
      }
      if (process.env.ANTHROPIC_API_KEY && configToSave.apiKeys.anthropic === process.env.ANTHROPIC_API_KEY) {
        delete configToSave.apiKeys.anthropic;
      }
    }

    await fs.writeFile(configPath, JSON.stringify(configToSave, null, 2), 'utf-8');
  }

  get(): GlobalConfig {
    return this.config;
  }

  getApiKey(provider: string): string | undefined {
    return this.config.apiKeys?.[provider];
  }

  getAgentConfig(agentType: AgentType): AgentModelConfig {
    const agentConfig = this.config.agents[agentType];
    if (!agentConfig) {
      throw new Error(`Agent config not found for type: ${agentType}`);
    }
    return agentConfig;
  }

  private loadEnvApiKeys(): void {
    if (process.env.OPENAI_API_KEY) {
      if (!this.config.apiKeys) this.config.apiKeys = {};
      if (!this.config.apiKeys.openai) {
        this.config.apiKeys.openai = process.env.OPENAI_API_KEY;
      }
    }
    if (process.env.ANTHROPIC_API_KEY) {
      if (!this.config.apiKeys) this.config.apiKeys = {};
      if (!this.config.apiKeys.anthropic) {
        this.config.apiKeys.anthropic = process.env.ANTHROPIC_API_KEY;
      }
    }
    if (process.env.GOOGLE_API_KEY) {
      if (!this.config.apiKeys) this.config.apiKeys = {};
      if (!this.config.apiKeys.google) {
        this.config.apiKeys.google = process.env.GOOGLE_API_KEY;
      }
    }
  }
}

export const config = new ConfigManager();

