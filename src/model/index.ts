/**
 * Model provider type
 */
export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'custom';

/**
 * Model capabilities
 */
export interface ModelCapabilities {
  streaming: boolean;
  vision: boolean;
  contextWindow: number;
}

/**
 * Model interface
 */
export interface Model {
  readonly name: string;
  readonly provider: ModelProvider;
  readonly capabilities: ModelCapabilities;
}

export { MODELS } from './models.js';
