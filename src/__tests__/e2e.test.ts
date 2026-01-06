import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { OpenAIAdapter } from '../adapter/openai.js';
import { Agent } from '../agent/agent.js';
import { MsgType, SystemMsg, UserMsg } from '../agent/Msg.js';
import { TOOLS, workingDir, setWorkingDir } from '../global.js';

import '../tool/index.js';

/**
 * E2E Tests - These tests make real API calls to OpenAI
 *
 * Requirements:
 * - OPENAI_API_KEY environment variable must be set
 * - These tests consume API credits
 *
 * Run with: pnpm test:e2e
 * Or: OPENAI_API_KEY=your-key pnpm test -- src/__tests__/e2e.test.ts
 */

const hasApiKey = !!process.env.OPENAI_API_KEY;

describe.skipIf(!hasApiKey)('E2E Tests', () => {
  let tempDir: string;
  let originalWorkingDir: string;

  beforeAll(async () => {
    // Create temp directory for file operations
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'arki-e2e-'));
  });

  afterAll(async () => {
    // Clean up temp directory
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Save and set workingDir
    originalWorkingDir = workingDir;
    setWorkingDir(tempDir);
  });

  afterEach(() => {
    // Restore workingDir
    setWorkingDir(originalWorkingDir);
  });

  describe('OpenAI Adapter', () => {
    it('should get response from OpenAI API', async () => {
      const adapter = new OpenAIAdapter({
        apiKey: process.env.OPENAI_API_KEY!,
        model: 'gpt-4o-mini',
      });

      const messages: [SystemMsg, UserMsg] = [
        new SystemMsg('You are a helpful assistant. Keep responses very brief.'),
        new UserMsg('What is 2 + 2? Reply with just the number.'),
      ];

      const result = await adapter.chat(messages);

      expect(result.message.type).toBe(MsgType.AI);
      expect(result.hasToolCalls).toBe(false);
      if (result.message.type === 'ai') {
        expect(result.message.content.toLowerCase()).toContain('4');
      }
      expect(result.usage).toBeDefined();
      expect(result.usage!.totalTokens).toBeGreaterThan(0);
    }, 30000);

    it('should handle streaming response', async () => {
      const adapter = new OpenAIAdapter({
        apiKey: process.env.OPENAI_API_KEY!,
        model: 'gpt-4o-mini',
      });

      const messages: [SystemMsg, UserMsg] = [
        new SystemMsg('Be brief.'),
        new UserMsg('Say "hello" and nothing else.'),
      ];

      const chunks: string[] = [];
      const result = await adapter.chat(messages, (chunk) => {
        chunks.push(chunk);
      });

      expect(result.message.type).toBe(MsgType.AI);
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('').toLowerCase()).toContain('hello');
    }, 30000);
  });

  describe('Agent with Tools', () => {
    it('should execute tool calls and return result', async () => {
      // Create a test file
      const testFilePath = path.join(tempDir, 'test-file.txt');
      await fs.writeFile(testFilePath, 'The secret number is 42.');

      // Get tools from TOOLS
      const tools = Object.values(TOOLS);

      // Create adapter with tools
      const adapter = new OpenAIAdapter({
        apiKey: process.env.OPENAI_API_KEY!,
        model: 'gpt-4o-mini',
        tools,
      });

      // Create an agent that can use tools
      const agent = new Agent({
        adapter,
        messages: [
          new SystemMsg(`You are a helpful assistant that can read files.
The working directory is ${tempDir}.
Read files when asked about their contents.`),
        ],
        onToolCallMsg: (msg) => {
          for (const tc of msg.toolCalls) {
            console.log('Tool call:', tc.name, tc.arguments);
          }
        },
        onToolResult: (name, result) => {
          console.log('Tool result:', name, result.substring(0, 100));
        },
      });

      const result = await agent.run(`Read the file at test-file.txt and tell me what number it mentions.`);

      expect(result.response).toBeDefined();
      expect(result.response.toLowerCase()).toContain('42');
      expect(result.toolCalls.length).toBeGreaterThan(0);
      expect(result.toolCalls[0].name).toBe('read_file');
    }, 60000);
  });
});

// Separate describe block for tests that don't need API key
describe('E2E Test Utilities', () => {
  it('should detect API key presence', () => {
    if (process.env.OPENAI_API_KEY) {
      expect(hasApiKey).toBe(true);
    } else {
      expect(hasApiKey).toBe(false);
    }
  });

  it('should skip E2E tests when no API key', () => {
    if (!hasApiKey) {
      console.log('E2E tests skipped: OPENAI_API_KEY not set');
      console.log('To run E2E tests: OPENAI_API_KEY=your-key pnpm test:e2e');
    }
    expect(true).toBe(true);
  });
});
