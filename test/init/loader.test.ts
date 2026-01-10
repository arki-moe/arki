import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// We need to test the module with fresh state, so we use dynamic imports
describe('loader', () => {
  let tempDir: string;
  let globalConfigDir: string;
  let projectConfigDir: string;

  beforeEach(async () => {
    // Create temp directories for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'loader-test-'));
    globalConfigDir = path.join(tempDir, 'global');
    projectConfigDir = path.join(tempDir, 'project', '.arki');

    await fs.mkdir(globalConfigDir, { recursive: true });
    await fs.mkdir(projectConfigDir, { recursive: true });

    // Reset modules to get fresh state
    vi.resetModules();

    // Mock PATHS
    vi.doMock('../../src/fs/paths.js', () => ({
      PATHS: {
        globalConfig: globalConfigDir,
        projectConfig: projectConfigDir,
      },
    }));
  });

  afterEach(async () => {
    vi.doUnmock('../../src/fs/paths.js');
    vi.resetModules();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('getApiKey', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return OpenAI API key from environment', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key-123';
      const { getApiKey } = await import('../../src/init/loader.js');
      expect(getApiKey('openai')).toBe('sk-test-key-123');
    });

    it('should return Anthropic API key from environment', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
      const { getApiKey } = await import('../../src/init/loader.js');
      expect(getApiKey('anthropic')).toBe('sk-ant-test-key');
    });

    it('should return Google API key from environment', async () => {
      process.env.GOOGLE_API_KEY = 'google-test-key';
      const { getApiKey } = await import('../../src/init/loader.js');
      expect(getApiKey('google')).toBe('google-test-key');
    });

    it('should return undefined when key not set', async () => {
      delete process.env.OPENAI_API_KEY;
      const { getApiKey } = await import('../../src/init/loader.js');
      expect(getApiKey('openai')).toBeUndefined();
    });

    it('should handle unknown provider with uppercase convention', async () => {
      process.env.CUSTOM_API_KEY = 'custom-key';
      const { getApiKey } = await import('../../src/init/loader.js');
      expect(getApiKey('custom')).toBe('custom-key');
    });
  });

  describe('loadConfigs', () => {
    it('should load global config', async () => {
      const globalConfig = {
        agents: {
          Arki: { model: 'gpt-5.1', flex: true },
        },
      };
      await fs.writeFile(
        path.join(globalConfigDir, 'config.json'),
        JSON.stringify(globalConfig)
      );

      const { loadConfigs } = await import('../../src/init/loader.js');
      const config = await loadConfigs();

      expect(config.agents.Arki?.model).toBe('gpt-5.1');
      expect(config.agents.Arki?.flex).toBe(true);
    });

    it('should throw error when global config not found', async () => {
      // Don't create global config file
      const { loadConfigs } = await import('../../src/init/loader.js');
      await expect(loadConfigs()).rejects.toThrow('Failed to load global config');
    });

    it('should merge project config over global config', async () => {
      const globalConfig = {
        agents: {
          Arki: { model: 'gpt-5', flex: false, reasoningEffort: 'low' as const },
        },
      };
      const projectConfig = {
        agents: {
          Arki: { model: 'gpt-5.1', flex: true },
        },
      };

      await fs.writeFile(
        path.join(globalConfigDir, 'config.json'),
        JSON.stringify(globalConfig)
      );
      await fs.writeFile(
        path.join(projectConfigDir, 'config.json'),
        JSON.stringify(projectConfig)
      );

      const { loadConfigs } = await import('../../src/init/loader.js');
      const config = await loadConfigs();

      // Project overrides global
      expect(config.agents.Arki?.model).toBe('gpt-5.1');
      expect(config.agents.Arki?.flex).toBe(true);
      // Global value preserved when not overridden
      expect(config.agents.Arki?.reasoningEffort).toBe('low');
    });

    it('should work without project config', async () => {
      const globalConfig = {
        agents: {
          Arki: { model: 'gpt-5' },
        },
      };
      await fs.writeFile(
        path.join(globalConfigDir, 'config.json'),
        JSON.stringify(globalConfig)
      );
      // Don't create project config

      const { loadConfigs } = await import('../../src/init/loader.js');
      const config = await loadConfigs();

      expect(config.agents.Arki?.model).toBe('gpt-5');
    });

    it('should cache loaded config', async () => {
      const globalConfig = {
        agents: {
          Arki: { model: 'gpt-5' },
        },
      };
      await fs.writeFile(
        path.join(globalConfigDir, 'config.json'),
        JSON.stringify(globalConfig)
      );

      const { loadConfigs } = await import('../../src/init/loader.js');

      // Load twice
      const config1 = await loadConfigs();
      const config2 = await loadConfigs();

      // Should return same cached object
      expect(config1).toBe(config2);
    });
  });

  describe('getConfig', () => {
    it('should throw error when config not loaded', async () => {
      const { getConfig } = await import('../../src/init/loader.js');
      expect(() => getConfig()).toThrow('Config not loaded yet');
    });

    it('should return loaded config', async () => {
      const globalConfig = {
        agents: {
          Arki: { model: 'gpt-5' },
        },
      };
      await fs.writeFile(
        path.join(globalConfigDir, 'config.json'),
        JSON.stringify(globalConfig)
      );

      const { loadConfigs, getConfig } = await import('../../src/init/loader.js');
      await loadConfigs();

      const config = getConfig();
      expect(config.agents.Arki?.model).toBe('gpt-5');
    });
  });

  describe('getAgentConfig', () => {
    it('should return agent config when exists', async () => {
      const globalConfig = {
        agents: {
          Arki: { model: 'gpt-5.1', flex: true, reasoningEffort: 'medium' as const },
        },
      };
      await fs.writeFile(
        path.join(globalConfigDir, 'config.json'),
        JSON.stringify(globalConfig)
      );

      const { loadConfigs, getAgentConfig } = await import('../../src/init/loader.js');
      await loadConfigs();

      const arkiConfig = getAgentConfig('Arki');
      expect(arkiConfig.model).toBe('gpt-5.1');
      expect(arkiConfig.flex).toBe(true);
      expect(arkiConfig.reasoningEffort).toBe('medium');
    });

    it('should throw error when agent config not found', async () => {
      const globalConfig = {
        agents: {
          Arki: { model: 'gpt-5' },
        },
      };
      await fs.writeFile(
        path.join(globalConfigDir, 'config.json'),
        JSON.stringify(globalConfig)
      );

      const { loadConfigs, getAgentConfig } = await import('../../src/init/loader.js');
      await loadConfigs();

      expect(() => getAgentConfig('Coder')).toThrow('Agent config not found: Coder');
    });
  });

  describe('saveConfig', () => {
    it('should save config to global config file', async () => {
      const globalConfig = {
        agents: {
          Arki: { model: 'gpt-5' },
        },
      };
      await fs.writeFile(
        path.join(globalConfigDir, 'config.json'),
        JSON.stringify(globalConfig)
      );

      const { loadConfigs, saveConfig } = await import('../../src/init/loader.js');
      await loadConfigs();

      // Save current config
      await saveConfig();

      // Read the saved file
      const savedContent = await fs.readFile(
        path.join(globalConfigDir, 'config.json'),
        'utf-8'
      );
      const savedConfig = JSON.parse(savedContent);

      expect(savedConfig.agents.Arki.model).toBe('gpt-5');
    });
  });
});

describe('deepMerge (via loadConfigs)', () => {
  let tempDir: string;
  let globalConfigDir: string;
  let projectConfigDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'merge-test-'));
    globalConfigDir = path.join(tempDir, 'global');
    projectConfigDir = path.join(tempDir, 'project', '.arki');

    await fs.mkdir(globalConfigDir, { recursive: true });
    await fs.mkdir(projectConfigDir, { recursive: true });

    vi.resetModules();
    vi.doMock('../../src/fs/paths.js', () => ({
      PATHS: {
        globalConfig: globalConfigDir,
        projectConfig: projectConfigDir,
      },
    }));
  });

  afterEach(async () => {
    vi.doUnmock('../../src/fs/paths.js');
    vi.resetModules();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should merge multiple agent configs', async () => {
    const globalConfig = {
      agents: {
        Arki: { model: 'gpt-5', flex: false },
        Coder: { model: 'gpt-5-nano', flex: true },
      },
    };
    const projectConfig = {
      agents: {
        Arki: { model: 'gpt-5.1' },
        // Coder not overridden
      },
    };

    await fs.writeFile(
      path.join(globalConfigDir, 'config.json'),
      JSON.stringify(globalConfig)
    );
    await fs.writeFile(
      path.join(projectConfigDir, 'config.json'),
      JSON.stringify(projectConfig)
    );

    const { loadConfigs } = await import('../../src/init/loader.js');
    const config = await loadConfigs();

    // Arki overridden partially
    expect(config.agents.Arki?.model).toBe('gpt-5.1');
    expect(config.agents.Arki?.flex).toBe(false);

    // Coder unchanged
    expect(config.agents.Coder?.model).toBe('gpt-5-nano');
    expect(config.agents.Coder?.flex).toBe(true);
  });

  it('should handle empty project agents', async () => {
    const globalConfig = {
      agents: {
        Arki: { model: 'gpt-5' },
      },
    };
    const projectConfig = {
      agents: {},
    };

    await fs.writeFile(
      path.join(globalConfigDir, 'config.json'),
      JSON.stringify(globalConfig)
    );
    await fs.writeFile(
      path.join(projectConfigDir, 'config.json'),
      JSON.stringify(projectConfig)
    );

    const { loadConfigs } = await import('../../src/init/loader.js');
    const config = await loadConfigs();

    expect(config.agents.Arki?.model).toBe('gpt-5');
  });

  it('should handle project config without agents key', async () => {
    const globalConfig = {
      agents: {
        Arki: { model: 'gpt-5' },
      },
    };
    const projectConfig = {};

    await fs.writeFile(
      path.join(globalConfigDir, 'config.json'),
      JSON.stringify(globalConfig)
    );
    await fs.writeFile(
      path.join(projectConfigDir, 'config.json'),
      JSON.stringify(projectConfig)
    );

    const { loadConfigs } = await import('../../src/init/loader.js');
    const config = await loadConfigs();

    expect(config.agents.Arki?.model).toBe('gpt-5');
  });
});
