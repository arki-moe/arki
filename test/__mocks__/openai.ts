import { vi } from 'vitest';

/**
 * Mock for OpenAI SDK
 *
 * Usage in tests:
 * ```typescript
 * vi.mock('openai', () => import('../__mocks__/openai.js'));
 *
 * // Then configure responses:
 * mockChatCreate.mockResolvedValue(createStreamResponse([{ type: 'text', content: 'Hello!' }]));
 * ```
 */

// Mock function for chat.completions.create
export const mockChatCreate = vi.fn();

// Helper to reset all mocks
export function resetMocks() {
  mockChatCreate.mockReset();
}

type StreamChunk =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; index: number; name?: string; arguments?: string };

// Helper to create an async iterable for streaming (native tools API format)
export function createStreamResponse(
  chunks: StreamChunk[],
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  }
) {
  const finalUsage = usage || {
    prompt_tokens: 100,
    completion_tokens: 50,
    total_tokens: 150,
  };

  async function* generator() {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const isLast = i === chunks.length - 1;

      if (chunk.type === 'text') {
        yield {
          choices: [
            {
              index: 0,
              delta: { content: chunk.content },
              finish_reason: isLast ? 'stop' : null,
            },
          ],
          usage: isLast ? finalUsage : undefined,
        };
      } else if (chunk.type === 'tool_call') {
        yield {
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [
                  {
                    index: chunk.index,
                    ...(chunk.name ? { id: `call_${Date.now()}_${chunk.index}`, type: 'function', function: { name: chunk.name } } : {}),
                    ...(chunk.arguments ? { function: { arguments: chunk.arguments } } : {}),
                  },
                ],
              },
              finish_reason: isLast ? 'tool_calls' : null,
            },
          ],
          usage: isLast ? finalUsage : undefined,
        };
      }
    }
  }

  return generator();
}

// Helper to create a text stream response
export function createTextStreamResponse(
  text: string,
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  }
) {
  // Split text into chunks for realistic streaming
  const chunks: StreamChunk[] = text.split('').map((char) => ({ type: 'text', content: char }));
  return createStreamResponse(chunks, usage);
}

// Helper to create a tool call stream response
export function createToolCallStreamResponse(
  toolCalls: Array<{ name: string; arguments: Record<string, unknown> }>,
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  }
) {
  const chunks: StreamChunk[] = [];

  toolCalls.forEach((tc, index) => {
    // First chunk: tool name
    chunks.push({ type: 'tool_call', index, name: tc.name });
    // Subsequent chunks: arguments
    const argsStr = JSON.stringify(tc.arguments);
    for (const char of argsStr) {
      chunks.push({ type: 'tool_call', index, arguments: char });
    }
  });

  return createStreamResponse(chunks, usage);
}

// Default mock class
class MockOpenAI {
  chat = {
    completions: {
      create: mockChatCreate,
    },
  };

  constructor(_config?: { apiKey?: string }) {
    // Accept config but don't use it in mock
  }
}

export default MockOpenAI;
