import type { ToolCall } from '../agent/Msg.js';

/**
 * Base Event class
 */
export abstract class Event {
  readonly agentName: string;
  readonly timestamp: number;

  constructor(agentName: string) {
    this.agentName = agentName;
    this.timestamp = Date.now();
  }
}

// ============ Concrete Event Classes ============

/** Stream output event */
export class StreamEvent extends Event {
  readonly chunk: string;

  constructor(agentName: string, chunk: string) {
    super(agentName);
    this.chunk = chunk;
  }
}

/** Tool call received event */
export class ToolCallReceivedEvent extends Event {
  readonly toolCalls: ToolCall[];

  constructor(agentName: string, toolCalls: ToolCall[]) {
    super(agentName);
    this.toolCalls = toolCalls;
  }
}

/** Before tool run event */
export class BeforeToolRunEvent extends Event {
  readonly toolName: string;
  readonly args: Record<string, unknown>;

  constructor(agentName: string, toolName: string, args: Record<string, unknown>) {
    super(agentName);
    this.toolName = toolName;
    this.args = args;
  }
}

/** Tool result event */
export class ToolResultEvent extends Event {
  readonly toolName: string;
  readonly args: Record<string, unknown>;
  readonly result: string;
  readonly isError?: boolean;

  constructor(
    agentName: string,
    toolName: string,
    args: Record<string, unknown>,
    result: string,
    isError?: boolean
  ) {
    super(agentName);
    this.toolName = toolName;
    this.args = args;
    this.result = result;
    this.isError = isError;
  }
}

/** Async tool result event */
export class AsyncToolResultEvent extends Event {
  readonly asyncCallId: string;
  readonly toolName: string;
  readonly args: Record<string, unknown>;
  readonly result: string;
  readonly isError?: boolean;

  constructor(
    agentName: string,
    asyncCallId: string,
    toolName: string,
    args: Record<string, unknown>,
    result: string,
    isError?: boolean
  ) {
    super(agentName);
    this.asyncCallId = asyncCallId;
    this.toolName = toolName;
    this.args = args;
    this.result = result;
    this.isError = isError;
  }
}

/** Agent run start event */
export class RunStartEvent extends Event {
  readonly userInput: string;

  constructor(agentName: string, userInput: string) {
    super(agentName);
    this.userInput = userInput;
  }
}

/** Agent run end event */
export class RunEndEvent extends Event {
  readonly response: string;
  readonly toolCalls: Array<{ name: string; arguments: Record<string, unknown>; result: string }>;
  readonly usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cachedTokens?: number;
  };

  constructor(
    agentName: string,
    response: string,
    toolCalls: Array<{ name: string; arguments: Record<string, unknown>; result: string }>,
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      cachedTokens?: number;
    }
  ) {
    super(agentName);
    this.response = response;
    this.toolCalls = toolCalls;
    this.usage = usage;
  }
}
