import { Msg } from '../agent/Msg.js';
import { Tool } from '../tool/Tool.js';

/**
 * Fixed parameters
 */
export const TEMPERATURE = 0.2;
export const MAX_COMPLETION_TOKENS = 4096;

/**
 * Reasoning effort
 */
export type ReasoningEffort = 'low' | 'medium' | 'high';

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
 */
export abstract class Adapter {
  protected apiKey: string;
  protected model: string;
  /** Use Flex API (OpenAI) - low priority, low cost */
  protected flex?: boolean;
  /** Reasoning effort (thinking mode) */
  protected reasoningEffort?: ReasoningEffort;
  /** Available tools list */
  protected tools?: Tool[];

  constructor(config: {
    apiKey: string;
    model: string;
    /** Use Flex API (OpenAI) - low priority, low cost */
    flex?: boolean;
    /** Reasoning effort (thinking mode) */
    reasoningEffort?: ReasoningEffort;
    /** Available tools list */
    tools?: Tool[];
  }) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.flex = config.flex;
    this.reasoningEffort = config.reasoningEffort;
    this.tools = config.tools;
  }

  abstract chat(
    messages: Msg[],
    onChunk?: (chunk: string) => void
  ): Promise<AdapterResponse>;

  getModel(): string {
    return this.model;
  }
}

