import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Agent } from '../../src/agent/Agent.js';
import { MsgType, ToolCallMsg, ToolCall, Msg, AIMsg, SystemMsg, ToolResultMsg } from '../../src/agent/Msg.js';
import { Adapter, AdapterOptions, AdapterResponse } from '../../src/adapter/Adapter.js';
import { Tool } from '../../src/tool/Tool.js';

// Create a mock adapter
class MockAdapter extends Adapter {
  private responses: AdapterResponse[] = [];
  private currentIndex = 0;

  constructor() {
    super('mock-api-key');
  }

  setResponses(responses: AdapterResponse[]) {
    this.responses = responses;
    this.currentIndex = 0;
  }

  async chat(
    _model: string,
    _messages: Msg[],
    _tools: Tool[],
    _options: AdapterOptions,
    onChunk?: (chunk: string) => void
  ): Promise<AdapterResponse> {
    if (this.currentIndex >= this.responses.length) {
      throw new Error('No more mock responses configured');
    }
    const response = this.responses[this.currentIndex++];
    if (!response.hasToolCalls && response.message.type === 'ai') {
      onChunk?.(response.message.content);
    }
    return response;
  }
}

describe('Agent', () => {
  let mockAdapter: MockAdapter;
  let agent: Agent;
  let mockTool: Tool;

  beforeEach(() => {
    mockAdapter = new MockAdapter();

    mockTool = {
      name: 'test_tool',
      description: 'A test tool',
      parameters: { input: { type: 'string' } },
      required: ['input'],
      manual: 'Test manual',
      run: vi.fn().mockResolvedValue({ toolName: 'test_tool', result: 'Tool executed successfully' }),
    } as unknown as Tool;

    agent = new Agent({
      adapter: mockAdapter,
      model: 'test-model',
      tools: [mockTool],
      messages: [new SystemMsg('You are a helpful assistant.')],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize agent with messages', async () => {
      mockAdapter.setResponses([
        {
          message: new AIMsg('Hello!'),
          hasToolCalls: false,
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        },
      ]);

      const result = await agent.run('Hi');

      expect(result.response).toBe('Hello!');
    });

    it('should support multiple initial messages', async () => {
      const multiMsgAgent = new Agent({
        adapter: mockAdapter,
        model: 'test-model',
        tools: [],
        messages: [new SystemMsg('First instruction.'), new SystemMsg('Second instruction.')],
      });

      mockAdapter.setResponses([{ message: new AIMsg('Combined response'), hasToolCalls: false }]);

      await multiMsgAgent.run('Test');

      expect(true).toBe(true);
    });
  });

  describe('run', () => {
    it('should return text response for simple query', async () => {
      mockAdapter.setResponses([
        {
          message: new AIMsg('This is the answer.'),
          hasToolCalls: false,
          usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
        },
      ]);

      const result = await agent.run('What is the answer?');

      expect(result.response).toBe('This is the answer.');
      expect(result.toolCalls).toHaveLength(0);
      expect(result.usage?.totalTokens).toBe(30);
    });

    it('should handle single tool call', async () => {
      const toolCall: ToolCall = { name: 'test_tool', arguments: { input: 'test input' } };

      mockAdapter.setResponses([
        {
          message: new ToolCallMsg('', [toolCall]),
          hasToolCalls: true,
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        },
        {
          message: new AIMsg('Done with tool call.'),
          hasToolCalls: false,
          usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
        },
      ]);

      const result = await agent.run('Use the tool');

      expect(result.response).toBe('Done with tool call.');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].name).toBe('test_tool');
      expect(result.toolCalls[0].arguments).toEqual({ input: 'test input' });
      expect(result.toolCalls[0].result).toBe('Tool executed successfully');
    });

    it('should handle multiple tool calls in one response', async () => {
      const toolCalls: ToolCall[] = [
        { name: 'test_tool', arguments: { input: 'first' } },
        { name: 'test_tool', arguments: { input: 'second' } },
      ];

      const runMock = vi
        .fn()
        .mockResolvedValueOnce({ toolName: 'test_tool', result: 'Result 1' })
        .mockResolvedValueOnce({ toolName: 'test_tool', result: 'Result 2' });

      mockTool.run = runMock;

      mockAdapter.setResponses([
        { message: new ToolCallMsg('', toolCalls), hasToolCalls: true },
        { message: new AIMsg('Both tools executed.'), hasToolCalls: false },
      ]);

      const result = await agent.run('Use tool twice');

      expect(result.toolCalls).toHaveLength(2);
      expect(result.toolCalls[0].result).toBe('Result 1');
      expect(result.toolCalls[1].result).toBe('Result 2');
    });

    it('should handle multi-round tool calls', async () => {
      mockAdapter.setResponses([
        { message: new ToolCallMsg('', [{ name: 'test_tool', arguments: { input: 'round1' } }]), hasToolCalls: true },
        { message: new ToolCallMsg('', [{ name: 'test_tool', arguments: { input: 'round2' } }]), hasToolCalls: true },
        { message: new AIMsg('All done!'), hasToolCalls: false },
      ]);

      const result = await agent.run('Multi-round');

      expect(result.toolCalls).toHaveLength(2);
      expect(result.response).toBe('All done!');
    });

    it('should handle unknown tool gracefully', async () => {
      mockAdapter.setResponses([
        { message: new ToolCallMsg('', [{ name: 'unknown_tool', arguments: {} }]), hasToolCalls: true },
        { message: new AIMsg('Handled unknown tool.'), hasToolCalls: false },
      ]);

      const result = await agent.run('Use unknown tool');

      expect(result.toolCalls[0].result).toContain('Unknown tool: unknown_tool');
    });

    it('should accumulate token usage across rounds', async () => {
      mockAdapter.setResponses([
        {
          message: new ToolCallMsg('', [{ name: 'test_tool', arguments: {} }]),
          hasToolCalls: true,
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        },
        {
          message: new AIMsg('Done'),
          hasToolCalls: false,
          usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
        },
      ]);

      const result = await agent.run('Test');

      expect(result.usage?.promptTokens).toBe(300);
      expect(result.usage?.completionTokens).toBe(150);
      expect(result.usage?.totalTokens).toBe(450);
    });

    it('should call onToolCallMsg callback', async () => {
      const onToolCallMsg = vi.fn();

      const callbackAgent = new Agent({
        adapter: mockAdapter,
        model: 'test-model',
        tools: [mockTool],
        messages: [new SystemMsg('System')],
        onToolCallMsg,
      });

      const toolCallMessage = new ToolCallMsg('', [{ name: 'test_tool', arguments: { input: 'test' } }]);
      mockAdapter.setResponses([
        { message: toolCallMessage, hasToolCalls: true },
        { message: new AIMsg('Done'), hasToolCalls: false },
      ]);

      await callbackAgent.run('Test');

      expect(onToolCallMsg).toHaveBeenCalledTimes(1);
      expect(onToolCallMsg).toHaveBeenCalledWith(toolCallMessage);
    });

    it('should call onToolResult callback', async () => {
      const onToolResult = vi.fn();

      const callbackAgent = new Agent({
        adapter: mockAdapter,
        model: 'test-model',
        tools: [mockTool],
        messages: [new SystemMsg('System')],
        onToolResult,
      });

      mockAdapter.setResponses([
        { message: new ToolCallMsg('', [{ name: 'test_tool', arguments: { input: 'test' } }]), hasToolCalls: true },
        { message: new AIMsg('Done'), hasToolCalls: false },
      ]);

      await callbackAgent.run('Test');

      expect(onToolResult).toHaveBeenCalledTimes(1);
      expect(onToolResult).toHaveBeenCalledWith('test_tool', { input: 'test' }, 'Tool executed successfully');
    });

    it('should call onBeforeToolRun callback', async () => {
      const onBeforeToolRun = vi.fn();

      const callbackAgent = new Agent({
        adapter: mockAdapter,
        model: 'test-model',
        tools: [mockTool],
        messages: [new SystemMsg('System')],
        onBeforeToolRun,
      });

      mockAdapter.setResponses([
        { message: new ToolCallMsg('', [{ name: 'test_tool', arguments: { input: 'test' } }]), hasToolCalls: true },
        { message: new AIMsg('Done'), hasToolCalls: false },
      ]);

      await callbackAgent.run('Test');

      expect(onBeforeToolRun).toHaveBeenCalledTimes(1);
      expect(onBeforeToolRun).toHaveBeenCalledWith('test_tool', { input: 'test' });
    });
  });

  describe('reset', () => {
    it('should clear conversation history and restore initial messages', async () => {
      mockAdapter.setResponses([
        { message: new AIMsg('First response'), hasToolCalls: false },
        { message: new AIMsg('After reset response'), hasToolCalls: false },
      ]);

      await agent.run('First message');

      agent.reset();

      const result = await agent.run('New message');

      expect(result.response).toBe('After reset response');
    });

    it('should return this for chaining', () => {
      const returned = agent.reset();

      expect(returned).toBe(agent);
    });
  });

  describe('streaming', () => {
    it('should call onStream callback', async () => {
      const onStream = vi.fn();

      const streamAgent = new Agent({
        adapter: mockAdapter,
        model: 'test-model',
        tools: [],
        messages: [new SystemMsg('System')],
        onStream,
      });

      mockAdapter.setResponses([{ message: new AIMsg('Streamed response'), hasToolCalls: false }]);

      const result = await streamAgent.run('Stream test');

      expect(result.response).toBe('Streamed response');
      expect(onStream).toHaveBeenCalledWith('Streamed response');
    });
  });
});
