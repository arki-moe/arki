import { Msg } from '../agent/Msg.js';
import { Tool } from '../tool/Tool.js';

/**
 * Reasoning effort
 */
export type ReasoningEffort = 'low' | 'medium' | 'high';

/**
 * Platform-specific options for adapter
 */
export interface AdapterOptions {
  [key: string]: unknown;
}

/**
 * LLM response result
 */
export interface AdapterResponse {
  message: Msg;
  hasToolCalls: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cachedTokens?: number;
  };
}

/**
 * LLM adapter base class
 * Only contains platform authentication, model/tools belong to Agent
 */
export abstract class Adapter {
  protected apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  abstract chat(
    model: string,
    messages: Msg[],
    tools: Tool[],
    options: AdapterOptions,
    onChunk?: (chunk: string) => void
  ): Promise<AdapterResponse>;
}
