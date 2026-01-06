/**
 * Message type enum (for type narrowing)
 */
export enum MsgType {
  System = 'system',
  User = 'user',
  AI = 'ai',
  ToolCall = 'tool_call',
  ToolResult = 'tool_result',
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
 * Tool call message constructor
 */
export class ToolCallMsg extends Msg {
  readonly type = MsgType.ToolCall;
  readonly toolCalls: Array<{
    name: string;
    arguments: Record<string, unknown>;
  }>;

  constructor(content: string, toolCalls: Array<{ name: string; arguments: Record<string, unknown> }>) {
    super(content);
    this.toolCalls = toolCalls;
  }
}

/**
 * Tool result message constructor
 */
export class ToolResultMsg extends Msg {
  readonly type = MsgType.ToolResult;
  readonly toolName: string;
  readonly result: string;
  readonly isError?: boolean;

  constructor(toolName: string, result: string, isError?: boolean) {
    super('');
    this.toolName = toolName;
    this.result = result;
    this.isError = isError;
  }
}

