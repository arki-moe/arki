import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MsgType, SystemMsg, UserMsg, AIMsg, ToolCallMsg, ToolResultMsg } from '../agent/Msg.js';
import {
  mockChatCreate,
  resetMocks,
  createTextStreamResponse,
  createToolCallStreamResponse,
  createStreamResponse,
} from '../__mocks__/openai.js';

// Mock the openai module
vi.mock('openai', () => import('../__mocks__/openai.js'));

// Import after mocking
import { OpenAIAdapter } from './openai.js';

describe('OpenAIAdapter', () => {
  let adapter: OpenAIAdapter;

  beforeEach(() => {
    resetMocks();
    adapter = new OpenAIAdapter({
      apiKey: 'test-api-key',
      model: 'gpt-5',
    });
  });

  describe('constructor', () => {
    it('should throw error if API key is not provided', () => {
      expect(
        () =>
          new OpenAIAdapter({
            apiKey: '',
            model: 'gpt-5',
          })
      ).toThrow('OpenAI API key is required');
    });

    it('should create adapter with valid config', () => {
      const adapter = new OpenAIAdapter({
        apiKey: 'test-key',
        model: 'gpt-5.2',
      });

      expect(adapter.getModel()).toBe('gpt-5.2');
    });
  });

  describe('chat (streaming)', () => {
    it('should return text response with streaming', async () => {
      mockChatCreate.mockResolvedValue(createTextStreamResponse('Hello! How can I help you?'));

      const messages: [SystemMsg, UserMsg] = [new SystemMsg('You are a helpful assistant.'), new UserMsg('Hello')];

      const chunks: string[] = [];
      const result = await adapter.chat(messages, (chunk) => chunks.push(chunk));

      expect(result.hasToolCalls).toBe(false);
      expect(result.message.type).toBe(MsgType.AI);
      if (result.message.type === 'ai') {
        expect(result.message.content).toBe('Hello! How can I help you?');
      }
      expect(chunks.join('')).toBe('Hello! How can I help you?');
      expect(result.usage).toBeDefined();
      expect(result.usage?.totalTokens).toBe(150);
    });

    it('should parse tool calls response', async () => {
      mockChatCreate.mockResolvedValue(
        createToolCallStreamResponse([{ name: 'read_file', arguments: { path: 'test.txt' } }])
      );

      const messages: UserMsg[] = [new UserMsg('Read test.txt')];
      const chunks: string[] = [];

      const result = await adapter.chat(messages, (chunk) => chunks.push(chunk));

      expect(result.hasToolCalls).toBe(true);
      expect(result.message.type).toBe(MsgType.ToolCall);

      const toolCallMsg = result.message as ToolCallMsg;
      expect(toolCallMsg.toolCalls.length).toBe(1);
      expect(toolCallMsg.toolCalls[0].name).toBe('read_file');
      expect(toolCallMsg.toolCalls[0].arguments).toEqual({ path: 'test.txt' });
      // No text chunks for pure tool calls
      expect(chunks.join('')).toBe('');
    });

    it('should handle multiple tool calls', async () => {
      mockChatCreate.mockResolvedValue(
        createToolCallStreamResponse([
          { name: 'read_file', arguments: { path: 'a.txt' } },
          { name: 'read_file', arguments: { path: 'b.txt' } },
        ])
      );

      const messages = [new UserMsg('Read both files')];

      const result = await adapter.chat(messages);

      expect(result.hasToolCalls).toBe(true);
      const toolCallMsg = result.message as ToolCallMsg;
      expect(toolCallMsg.toolCalls.length).toBe(2);
    });

    it('should convert messages to OpenAI format', async () => {
      mockChatCreate.mockResolvedValue(createTextStreamResponse('Response'));

      const messages = [
        new SystemMsg('System prompt'),
        new UserMsg('User message'),
        new AIMsg('AI response'),
        new ToolCallMsg('', [{ name: 'read_file', arguments: { path: 'test.txt' } }]),
        ToolResultMsg.single('read_file', 'File contents'),
      ];

      await adapter.chat(messages);

      expect(mockChatCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockChatCreate.mock.calls[0][0];

      expect(callArgs.messages).toHaveLength(5);
      expect(callArgs.messages[0].role).toBe('system');
      expect(callArgs.messages[1].role).toBe('user');
      expect(callArgs.messages[2].role).toBe('assistant');
      // ToolCall converted to native format
      expect(callArgs.messages[3].role).toBe('assistant');
      expect(callArgs.messages[3].tool_calls).toBeDefined();
      expect(callArgs.messages[3].tool_calls[0].function.name).toBe('read_file');
      // ToolResult converted to native format
      expect(callArgs.messages[4].role).toBe('tool');
      expect(callArgs.messages[4].content).toBe('File contents');
    });

    it('should include usage information', async () => {
      mockChatCreate.mockResolvedValue(
        createTextStreamResponse('Hello', {
          prompt_tokens: 20,
          completion_tokens: 10,
          total_tokens: 30,
        })
      );

      const messages: UserMsg[] = [new UserMsg('Hi')];
      const result = await adapter.chat(messages);

      expect(result.usage).toEqual({
        promptTokens: 20,
        completionTokens: 10,
        totalTokens: 30,
      });
    });

    it('should use flex service tier when configured', async () => {
      const flexAdapter = new OpenAIAdapter({
        apiKey: 'test-key',
        model: 'gpt-5',
        flex: true,
      });

      mockChatCreate.mockResolvedValue(createTextStreamResponse('Response'));

      await flexAdapter.chat([new UserMsg('Hello')]);

      const callArgs = mockChatCreate.mock.calls[0][0];
      expect(callArgs.service_tier).toBe('flex');
    });

    it('should stream text immediately', async () => {
      const chunks = [
        { type: 'text' as const, content: 'Hello' },
        { type: 'text' as const, content: ' ' },
        { type: 'text' as const, content: 'World' },
        { type: 'text' as const, content: '!' },
      ];
      mockChatCreate.mockResolvedValue(createStreamResponse(chunks));

      const messages: UserMsg[] = [new UserMsg('Hi')];
      const receivedChunks: string[] = [];

      await adapter.chat(messages, (chunk) => {
        receivedChunks.push(chunk);
      });

      expect(receivedChunks).toEqual(['Hello', ' ', 'World', '!']);
    });
  });

  describe('error handling', () => {
    it('should propagate API errors', async () => {
      mockChatCreate.mockRejectedValue(new Error('API Error: Rate limit exceeded'));

      const messages = [new UserMsg('Hello')];

      await expect(adapter.chat(messages)).rejects.toThrow('API Error: Rate limit exceeded');
    });
  });
});
