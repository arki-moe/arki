import type { Model } from './index.js';

/**
 * All available model configurations (keyed by ID)
 */
export const MODELS: Record<string, Model> = {
  'gpt-5.2': {
    name: 'GPT-5.2',
    provider: 'openai',
    capabilities: {
      streaming: true,
      vision: true,
      contextWindow: 200000,
    },
  },
  'gpt-5.1': {
    name: 'GPT-5.1',
    provider: 'openai',
    capabilities: {
      streaming: true,
      vision: true,
      contextWindow: 200000,
    },
  },
  'gpt-5': {
    name: 'GPT-5',
    provider: 'openai',
    capabilities: {
      streaming: true,
      vision: true,
      contextWindow: 200000,
    },
  },
  'gpt-5-nano': {
    name: 'GPT-5 Nano',
    provider: 'openai',
    capabilities: {
      streaming: true,
      vision: true,
      contextWindow: 128000,
    },
  },
};
