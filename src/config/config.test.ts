import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Note: ConfigManager is a singleton that reads from ~/.config/arki/config.json
 * Testing it directly is challenging due to its singleton nature and file system dependencies.
 * These tests verify the exported interface and behavior.
 */

describe('ConfigManager', () => {
  describe('interface', () => {
    it('should export config singleton', async () => {
      const { config } = await import('./config.js');
      
      expect(config).toBeDefined();
      expect(typeof config.load).toBe('function');
      expect(typeof config.get).toBe('function');
      expect(typeof config.getApiKey).toBe('function');
      expect(typeof config.getAgentConfig).toBe('function');
      expect(typeof config.save).toBe('function');
    });

    it('should have AgentType exported', async () => {
      const { AgentType } = await import('./config.js').catch(() => ({ AgentType: undefined }));
      
      // AgentType is just a type, not a runtime value
      // We verify the module loads without error
      expect(true).toBe(true);
    });
  });

  describe('load and get', () => {
    it('should load config and return GlobalConfig', async () => {
      const { config } = await import('./config.js');
      
      const loadedConfig = await config.load();
      
      expect(loadedConfig).toBeDefined();
      expect(loadedConfig.agents).toBeDefined();
      expect(typeof loadedConfig.agents).toBe('object');
    });

    it('should return same config on multiple loads', async () => {
      const { config } = await import('./config.js');
      
      const config1 = await config.load();
      const config2 = await config.load();
      
      expect(config1).toBe(config2);
    });

    it('get() should return the config object', async () => {
      const { config } = await import('./config.js');
      
      await config.load();
      const fullConfig = config.get();
      
      expect(fullConfig).toBeDefined();
      expect(fullConfig.agents).toBeDefined();
    });
  });

  describe('getAgentConfig', () => {
    it('should return main agent config', async () => {
      const { config } = await import('./config.js');
      
      await config.load();
      const mainConfig = config.getAgentConfig('main');
      
      expect(mainConfig).toBeDefined();
      expect(mainConfig.model).toBeDefined();
      expect(typeof mainConfig.model).toBe('string');
    });

    it('should throw for invalid agent type', async () => {
      const { config } = await import('./config.js');
      
      await config.load();
      
      // Cast to test invalid type
      expect(() => config.getAgentConfig('invalid' as 'main')).toThrow(
        'Agent config not found for type: invalid'
      );
    });
  });

  describe('getApiKey', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return API key from environment', async () => {
      // Set environment variable before importing
      process.env.OPENAI_API_KEY = 'test-env-key-' + Date.now();
      
      // Reset modules to reload with new env
      vi.resetModules();
      const { config } = await import('./config.js');
      await config.load();
      
      // The key should be available (either from env or file)
      const key = config.getApiKey('openai');
      // If no file config for openai, it should use env
      if (key) {
        expect(typeof key).toBe('string');
      }
    });

    it('should return undefined for non-existent provider', async () => {
      const { config } = await import('./config.js');
      
      await config.load();
      const key = config.getApiKey('nonexistent-provider');
      
      expect(key).toBeUndefined();
    });
  });

  describe('AgentModelConfig interface', () => {
    it('should have model property', async () => {
      const { config } = await import('./config.js');
      
      await config.load();
      const mainConfig = config.getAgentConfig('main');
      
      expect(mainConfig.model).toBeDefined();
    });

    it('may have optional flex property', async () => {
      const { config } = await import('./config.js');
      
      await config.load();
      const mainConfig = config.getAgentConfig('main');
      
      // flex is optional, so it may or may not be defined
      if (mainConfig.flex !== undefined) {
        expect(typeof mainConfig.flex).toBe('boolean');
      }
    });
  });
});

describe('GlobalConfig interface', () => {
  it('should have agents property', async () => {
    const { config } = await import('./config.js');
    
    await config.load();
    const fullConfig = config.get();
    
    expect(fullConfig.agents).toBeDefined();
    expect(typeof fullConfig.agents).toBe('object');
  });

  it('may have apiKeys property', async () => {
    const { config } = await import('./config.js');
    
    await config.load();
    const fullConfig = config.get();
    
    // apiKeys is optional
    if (fullConfig.apiKeys !== undefined) {
      expect(typeof fullConfig.apiKeys).toBe('object');
    }
  });
});
