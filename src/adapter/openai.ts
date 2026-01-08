import OpenAI from 'openai';
import { Adapter, AdapterResponse, TEMPERATURE, MAX_COMPLETION_TOKENS } from './Adapter.js';
import { Msg, MsgType, ToolCallMsg, ToolCall, AIMsg, ToolResultMsg } from '../agent/Msg.js';
import { debug } from '../log/index.js';

export class OpenAIAdapter extends Adapter {
  private client: OpenAI;

  constructor(config: {
    apiKey: string;
    model: string;
    flex?: boolean;
    reasoningEffort?: 'low' | 'medium' | 'high';
    tools?: import('../tool/Tool.js').Tool[];
  }) {
    super(config);
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
    }
    this.client = new OpenAI({ apiKey: this.apiKey });
  }

  private toOpenAIMessages(messages: Msg[]) {
    const result: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    let pendingIds: string[] = [];

    for (const msg of messages) {
      if (msg.type === MsgType.System || msg.type === MsgType.User) {
        result.push({ role: msg.type, content: msg.content });
      } else if (msg.type === MsgType.AI) {
        result.push({ role: 'assistant', content: msg.content });
      } else if (msg.type === MsgType.ToolCall) {
        const toolCallMsg = msg as ToolCallMsg;
        pendingIds = toolCallMsg.toolCalls.map((_, i) => `call_${msg.timestamp}_${i}`);
        result.push({
          role: 'assistant',
          content: msg.content || null,
          tool_calls: toolCallMsg.toolCalls.map((tc, i) => ({
            id: pendingIds[i],
            type: 'function',
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
          })),
        });
      } else if (msg.type === MsgType.ToolResult) {
        const toolResultMsg = msg as ToolResultMsg;
        // OpenAI requires each tool result as a separate message
        for (const tr of toolResultMsg.toolResults) {
          result.push({
            role: 'tool',
            tool_call_id: pendingIds.shift() || `call_${msg.timestamp}`,
            content: tr.isError ? `Error: ${tr.result}` : tr.result,
          });
        }
      }
    }
    return result;
  }

  private getTools() {
    return this.tools?.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: {
          type: 'object',
          properties: t.parameters,
          required: t.required.length > 0 ? t.required : undefined,
        },
      },
    }));
  }

  async chat(messages: Msg[], onChunk?: (chunk: string) => void): Promise<AdapterResponse> {
    debug('API', `Requesting OpenAI (model: ${this.model}, messages: ${messages.length})`);

    const openaiMessages = this.toOpenAIMessages(messages);

    const startTime = Date.now();
    const requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming & {
      reasoning_effort?: string;
    } = {
      model: this.model,
      messages: openaiMessages,
      tools: this.getTools(),
      temperature: TEMPERATURE,
      max_completion_tokens: MAX_COMPLETION_TOKENS,
      stream: true,
      stream_options: { include_usage: true },
      service_tier: this.flex ? 'flex' : undefined,
      reasoning_effort: this.reasoningEffort,
    };
    const stream = await this.client.chat.completions.create(requestParams);

    let text = '';
    const toolCalls = new Map<number, { name: string; args: string }>();
    let usage: OpenAI.CompletionUsage | undefined;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        text += delta.content;
        onChunk?.(delta.content);
      }
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const cur = toolCalls.get(tc.index) || { name: '', args: '' };
          cur.name += tc.function?.name || '';
          cur.args += tc.function?.arguments || '';
          toolCalls.set(tc.index, cur);
        }
      }
      if (chunk.usage) usage = chunk.usage;
    }

    const elapsed = Date.now() - startTime;
    const cachedTokens = (usage?.prompt_tokens_details as { cached_tokens?: number })?.cached_tokens;
    const usageData = usage && {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      cachedTokens,
    };

    if (toolCalls.size > 0) {
      const calls: ToolCall[] = [...toolCalls.values()].map((tc) => ({
        name: tc.name,
        arguments: JSON.parse(tc.args || '{}'),
      }));
      debug('API', `Completed (${elapsed}ms, tools: ${calls.map((t) => t.name).join(', ')})`);
      return { message: new ToolCallMsg(text, calls), hasToolCalls: true, usage: usageData };
    }

    debug('API', `Completed (${elapsed}ms, tokens: ${usage?.total_tokens || 'N/A'})`);
    return { message: new AIMsg(text), hasToolCalls: false, usage: usageData };
  }
}
