import { Msg, MsgType, ToolCallMsg, UserMsg, ToolResultMsg, ToolResult, AsyncToolResultMsg } from './Msg.js';
import { Adapter, AdapterOptions } from '../adapter/Adapter.js';
import { Tool } from '../tool/Tool.js';
import { AGENTS } from '../global.js';
import { debug, warn } from '../log/index.js';
import { publish } from '../event_bus/EventBus.js';
import {
  StreamEvent,
  ToolCallReceivedEvent,
  BeforeToolRunEvent,
  ToolResultEvent,
  AsyncToolResultEvent,
  RunStartEvent,
  RunEndEvent,
} from '../event_bus/Event.js';

/**
 * Generate async call ID for tracking
 */
function generateAsyncCallId(): string {
  return `async_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface AgentResponse {
  response: string;
  toolCalls: Array<{
    name: string;
    arguments: Record<string, unknown>;
    result: string;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cachedTokens?: number;
  };
}

export interface AgentConfig {
  /** Agent name for display */
  name: string;
  adapter: Adapter;
  model: string;
  tools: Tool[];
  platformOptions?: AdapterOptions;
  messages: Msg[];
  /** Maximum completion tokens for LLM response */
  maxCompletionTokens?: number;
}

/** Pending async tool info */
interface PendingAsyncTool {
  toolName: string;
  args: Record<string, unknown>;
  promise: Promise<ToolResult>;
}

export class Agent {
  private config: AgentConfig;
  private messages: Msg[] = [];
  private toolsMap: Record<string, Tool> = {};
  /** Pending async tools: asyncCallId -> info */
  private pendingAsyncTools: Map<string, PendingAsyncTool> = new Map();

  constructor(config: AgentConfig) {
    this.config = config;
    this.messages = [...config.messages];
    // Build tools map for quick lookup
    for (const tool of config.tools) {
      this.toolsMap[tool.name] = tool;
    }
    // Register to global AGENTS registry
    AGENTS[config.name] = this;
  }

  /** Get agent name */
  get name(): string {
    return this.config.name;
  }

  /**
   * Render template string, replacing {{variable}} style variables
   */
  static renderTemplate(
    template: string,
    variables: Record<string, string | number | boolean>
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      const value = variables[varName];
      if (value !== undefined) {
        return String(value);
      }
      warn(`Variable "{{${varName}}}" not found in template`);
      return match;
    });
  }

  /**
   * Check and add placeholder results for pending async tools
   * Called before appending new user message
   */
  private insertAsyncPlaceholders(): void {
    if (this.pendingAsyncTools.size === 0) return;

    const placeholderResults: ToolResult[] = [];
    for (const [asyncCallId, info] of this.pendingAsyncTools) {
      placeholderResults.push({
        toolName: info.toolName,
        result: `[Async tool #${asyncCallId} is still running...]`,
        asyncCallId,
      });
    }

    if (placeholderResults.length > 0) {
      this.messages.push(new ToolResultMsg(placeholderResults));
    }
  }

  /**
   * Handle async tool completion
   */
  private handleAsyncToolComplete(asyncCallId: string, result: ToolResult): void {
    const info = this.pendingAsyncTools.get(asyncCallId);
    if (!info) return;

    this.pendingAsyncTools.delete(asyncCallId);

    // Create AsyncToolResultMsg and add to messages
    const asyncResultMsg = new AsyncToolResultMsg(
      asyncCallId,
      result.toolName,
      result.result,
      result.isError
    );
    this.messages.push(asyncResultMsg);

    // Publish AsyncToolResultEvent
    publish(new AsyncToolResultEvent(
      this.name,
      asyncCallId,
      result.toolName,
      info.args,
      result.result,
      result.isError
    ));
  }

  async run(userInput: string): Promise<AgentResponse> {
    debug('Agent', `Received user input (length: ${userInput.length})`);

    // Publish RunStartEvent
    publish(new RunStartEvent(this.name, userInput));

    // Insert placeholders for pending async tools before new user message
    this.insertAsyncPlaceholders();

    this.messages.push(new UserMsg(userInput));

    const toolCallHistory: AgentResponse['toolCalls'] = [];
    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0, cachedTokens: 0 };

    while (true) {
      debug('Agent', `Starting conversation (message count: ${this.messages.length})`);

      // Stream callback that publishes events
      const onStream = (chunk: string) => {
        publish(new StreamEvent(this.name, chunk));
      };

      const response = await this.config.adapter.chat(
        this.config.model,
        this.messages,
        this.config.tools,
        {
          ...this.config.platformOptions,
          maxCompletionTokens: this.config.maxCompletionTokens,
        },
        onStream
      );

      if (response.usage) {
        totalUsage.promptTokens += response.usage.promptTokens;
        totalUsage.completionTokens += response.usage.completionTokens;
        totalUsage.totalTokens += response.usage.totalTokens;
        totalUsage.cachedTokens += response.usage.cachedTokens || 0;
      }

      this.messages.push(response.message);

      if (!response.hasToolCalls) {
        debug('Agent', `Conversation completed (total tokens: ${totalUsage.totalTokens})`);
        const content = response.message.type === MsgType.AI ? response.message.content : '';

        // Publish RunEndEvent
        publish(new RunEndEvent(
          this.name,
          content,
          toolCallHistory,
          totalUsage.totalTokens > 0 ? totalUsage : undefined
        ));

        return {
          response: content,
          toolCalls: toolCallHistory,
          usage: totalUsage.totalTokens > 0 ? totalUsage : undefined,
        };
      }

      if (response.message.type !== MsgType.ToolCall) continue;
      const toolCallMsg = response.message as ToolCallMsg;
      const toolCalls = toolCallMsg.toolCalls;
      debug('Agent', `Received tool call request`, toolCalls.map((tc) => tc.name));

      // Publish ToolCallReceivedEvent
      publish(new ToolCallReceivedEvent(
        this.name,
        toolCalls.map((tc) => ({ name: tc.name, arguments: tc.arguments }))
      ));

      const toolResults: ToolResult[] = [];

      for (const tc of toolCalls) {
        // Publish BeforeToolRunEvent
        publish(new BeforeToolRunEvent(this.name, tc.name, tc.arguments));

        const tool = this.toolsMap[tc.name];

        if (!tool) {
          const result: ToolResult = { toolName: tc.name, result: `Unknown tool: ${tc.name}`, isError: true };
          toolCallHistory.push({
            name: tc.name,
            arguments: tc.arguments,
            result: result.result,
          });
          publish(new ToolResultEvent(this.name, tc.name, tc.arguments, result.result, true));
          toolResults.push(result);
          continue;
        }

        // Handle async tool
        if (tool.isAsync) {
          const asyncCallId = generateAsyncCallId();
          tc.asyncCallId = asyncCallId;

          // Start async execution
          const asyncPromise = tool.run(tc.arguments, { agentId: this.name });

          // Store pending async tool
          this.pendingAsyncTools.set(asyncCallId, {
            toolName: tc.name,
            args: tc.arguments,
            promise: asyncPromise,
          });

          // Create placeholder result
          const placeholderResult: ToolResult = {
            toolName: tc.name,
            result: `[Async tool #${asyncCallId} started, result will be provided later]`,
            asyncCallId,
          };

          toolCallHistory.push({
            name: tc.name,
            arguments: tc.arguments,
            result: placeholderResult.result,
          });

          toolResults.push(placeholderResult);

          // Handle async completion (fire and forget, will update messages when done)
          asyncPromise.then((result) => {
            this.handleAsyncToolComplete(asyncCallId, result);
          });

          continue;
        }

        // Handle sync tool
        const result: ToolResult = await tool.run(tc.arguments, { agentId: this.name });

        toolCallHistory.push({
          name: tc.name,
          arguments: tc.arguments,
          result: result.result,
        });

        // Publish ToolResultEvent
        publish(new ToolResultEvent(this.name, tc.name, tc.arguments, result.result, result.isError));

        toolResults.push(result);
      }

      this.messages.push(new ToolResultMsg(toolResults));
    }
  }

  reset(): this {
    this.messages = [...this.config.messages];
    this.pendingAsyncTools.clear();
    return this;
  }
}
