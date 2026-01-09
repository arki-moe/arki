/**
 * Message type enum (for type narrowing)
 */
export enum MsgType {
  System = 'system',
  User = 'user',
  AI = 'ai',
  ToolCall = 'tool_call',
  ToolResult = 'tool_result',
  AsyncToolResult = 'async_tool_result',
}

/**
 * Base message class
 */
export abstract class Msg {
  abstract readonly type: MsgType;
  readonly timestamp: number;
  readonly content: string;

  constructor(content: string) {
    this.timestamp = Date.now();
    this.content = content;
  }
}

/**
 * System message constructor
 */
export class SystemMsg extends Msg {
  readonly type = MsgType.System;

  constructor(content: string) {
    super(content);
  }
}

/**
 * User message constructor
 */
export class UserMsg extends Msg {
  readonly type = MsgType.User;

  constructor(content: string) {
    super(content);
  }
}

/**
 * AI message constructor
 */
export class AIMsg extends Msg {
  readonly type = MsgType.AI;

  constructor(content: string) {
    super(content);
  }
}

/**
 * Single tool call
 */
export interface ToolCall {
  name: string;
  /** Async tool call tracking ID (only for async tools) */
  asyncCallId?: string;
  arguments: Record<string, unknown>;
}

/**
 * Tool call message constructor
 */
export class ToolCallMsg extends Msg {
  readonly type = MsgType.ToolCall;
  readonly toolCalls: ToolCall[];

  constructor(content: string, toolCalls: ToolCall[]) {
    super(content);
    this.toolCalls = toolCalls;
  }
}

/**
 * Single tool result
 */
export interface ToolResult {
  toolName: string;
  result: string;
  /** If present, this is a placeholder for async tool (real result via AsyncToolResultMsg) */
  asyncCallId?: string;
  isError?: boolean;
}

/**
 * Tool result message constructor (contains multiple results)
 */
export class ToolResultMsg extends Msg {
  readonly type = MsgType.ToolResult;
  readonly toolResults: ToolResult[];

  constructor(toolResults: ToolResult[]) {
    super('');
    this.toolResults = toolResults;
  }

  /** Helper: create from single result */
  static single(toolName: string, result: string, isError?: boolean): ToolResultMsg {
    return new ToolResultMsg([{ toolName, result, isError }]);
  }
}
/**
 * Async tool result message (independent, does not depend on ToolResult)
 * Contains only one call result
 */
export class AsyncToolResultMsg extends Msg {
  readonly type = MsgType.AsyncToolResult;
  /** Tracking ID, links to original async tool call */
  readonly asyncCallId: string;
  readonly toolName: string;
  readonly result: string;
  readonly isError?: boolean;

  constructor(asyncCallId: string, toolName: string, result: string, isError?: boolean) {
    // Content includes full tracking info for Agent understanding
    super(`[Async Result #${asyncCallId}] Tool "${toolName}" completed`);
    this.asyncCallId = asyncCallId;
    this.toolName = toolName;
    this.result = result;
    this.isError = isError;
  }
}




