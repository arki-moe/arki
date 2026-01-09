import { Msg, MsgType, ToolCallMsg, UserMsg, ToolResultMsg, ToolResult } from './Msg.js';
import { Adapter } from '../adapter/Adapter.js';
import { TOOLS } from '../init/index.js';
import { debug } from '../log/index.js';

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

export class Agent {
  private config: {
    adapter: Adapter;
    messages: Msg[];
    onStream?: (chunk: string) => void;
    onToolCallMsg?: (msg: ToolCallMsg) => void;
    onBeforeToolRun?: (name: string, args: Record<string, unknown>) => void;
    onToolResult?: (name: string, args: Record<string, unknown>, result: string) => void;
  };
  private messages: Msg[] = [];

  constructor(config: {
    adapter: Adapter;
    messages: Msg[];
    onStream?: (chunk: string) => void;
    onToolCallMsg?: (msg: ToolCallMsg) => void;
    onBeforeToolRun?: (name: string, args: Record<string, unknown>) => void;
    onToolResult?: (name: string, args: Record<string, unknown>, result: string) => void;
  }) {
    this.config = config;
    this.messages = [...config.messages];
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
      console.warn(`Warning: Variable "{{${varName}}}" not found in template`);
      return match;
    });
  }

  async run(userInput: string): Promise<AgentResponse> {
    debug('Agent', `Received user input (length: ${userInput.length})`);
    this.messages.push(new UserMsg(userInput));

    const toolCallHistory: AgentResponse['toolCalls'] = [];
    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0, cachedTokens: 0 };

    while (true) {
      debug('Agent', `Starting conversation (message count: ${this.messages.length})`);

      const response = await this.config.adapter.chat(this.messages, this.config.onStream);

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

      this.config.onToolCallMsg?.(toolCallMsg);

      const toolResults: ToolResult[] = [];

      for (const tc of toolCalls) {
        this.config.onBeforeToolRun?.(tc.name, tc.arguments);

        const tool = TOOLS[tc.name];
        const result: ToolResult = tool
          ? await tool.run(tc.arguments)
          : { toolName: tc.name, result: `Unknown tool: ${tc.name}`, isError: true };

        toolCallHistory.push({
          name: tc.name,
          arguments: tc.arguments,
          result: result.result,
        });

        this.config.onToolResult?.(tc.name, tc.arguments, result.result);
        toolResults.push(result);
      }

      this.messages.push(new ToolResultMsg(toolResults));
    }
  }

  reset(): this {
    this.messages = [...this.config.messages];
    return this;
  }
}
