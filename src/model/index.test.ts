import { describe, it, expect } from 'vitest';
import { MODELS } from './index.js';

describe('MODELS', () => {
  it('should contain GPT-5.2 model', () => {
    const model = MODELS['gpt-5.2'];

    expect(model).toBeDefined();
    expect(model?.name).toBe('GPT-5.2');
    expect(model?.provider).toBe('openai');
  });

  it('should contain GPT-5.1 model', () => {
    const model = MODELS['gpt-5.1'];

    expect(model).toBeDefined();
    expect(model?.name).toBe('GPT-5.1');
    expect(model?.provider).toBe('openai');
  });

  it('should contain GPT-5 model', () => {
    const model = MODELS['gpt-5'];

    expect(model).toBeDefined();
    expect(model?.name).toBe('GPT-5');
    expect(model?.provider).toBe('openai');
  });

  it('should contain GPT-5-nano model', () => {
    const model = MODELS['gpt-5-nano'];

    expect(model).toBeDefined();
    expect(model?.name).toBe('GPT-5 Nano');
    expect(model?.provider).toBe('openai');
  });

  it('should have at least 4 models', () => {
    expect(Object.keys(MODELS).length).toBeGreaterThanOrEqual(4);
  });

  it('all models should have required properties', () => {
    for (const [id, model] of Object.entries(MODELS)) {
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);

      expect(model.name).toBeDefined();
      expect(typeof model.name).toBe('string');
      expect(model.name.length).toBeGreaterThan(0);

      expect(model.provider).toBeDefined();
      expect(['openai', 'anthropic', 'google', 'deepseek', 'custom']).toContain(model.provider);

      expect(model.capabilities).toBeDefined();
      expect(typeof model.capabilities.streaming).toBe('boolean');
      expect(typeof model.capabilities.vision).toBe('boolean');
      expect(typeof model.capabilities.contextWindow).toBe('number');
    }
  });

  it('all model IDs should be unique', () => {
    const ids = Object.keys(MODELS);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should return undefined for non-existent ID', () => {
    const model = MODELS['nonexistent-model'];

    expect(model).toBeUndefined();
  });

  it('should be case-sensitive', () => {
    const model = MODELS['GPT-5.2'];

    expect(model).toBeUndefined();
  });
});
