import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MsgType,
  SystemMsg,
  UserMsg,
  AIMsg,
  ToolCallMsg,
  ToolResultMsg,
  AsyncToolResultMsg,
} from '../../src/agent/Msg.js';

describe('MsgType', () => {
  it('should have correct values', () => {
    expect(MsgType.System).toBe('system');
    expect(MsgType.User).toBe('user');
    expect(MsgType.AI).toBe('ai');
    expect(MsgType.ToolCall).toBe('tool_call');
    expect(MsgType.ToolResult).toBe('tool_result');
    expect(MsgType.AsyncToolResult).toBe('async_tool_result');
  });
});

describe('SystemMsg', () => {
  it('should create with correct type and content', () => {
    const msg = new SystemMsg('You are a helpful assistant');
    expect(msg.type).toBe(MsgType.System);
    expect(msg.content).toBe('You are a helpful assistant');
  });

  it('should set timestamp on creation', () => {
    const before = Date.now();
    const msg = new SystemMsg('test');
    const after = Date.now();
    expect(msg.timestamp).toBeGreaterThanOrEqual(before);
    expect(msg.timestamp).toBeLessThanOrEqual(after);
  });

  it('should handle empty content', () => {
    const msg = new SystemMsg('');
    expect(msg.content).toBe('');
  });
});

describe('UserMsg', () => {
  it('should create with correct type and content', () => {
    const msg = new UserMsg('Hello, how are you?');
    expect(msg.type).toBe(MsgType.User);
    expect(msg.content).toBe('Hello, how are you?');
  });

  it('should handle multiline content', () => {
    const content = 'Line 1\nLine 2\nLine 3';
    const msg = new UserMsg(content);
    expect(msg.content).toBe(content);
  });
});

describe('AIMsg', () => {
  it('should create with correct type and content', () => {
    const msg = new AIMsg('I am doing well, thank you!');
    expect(msg.type).toBe(MsgType.AI);
    expect(msg.content).toBe('I am doing well, thank you!');
  });
});

describe('ToolCallMsg', () => {
  it('should create with content and tool calls', () => {
    const toolCalls = [
      { name: 'read_file', arguments: { path: 'test.txt' } },
    ];
    const msg = new ToolCallMsg('Reading file...', toolCalls);
    expect(msg.type).toBe(MsgType.ToolCall);
    expect(msg.content).toBe('Reading file...');
    expect(msg.toolCalls).toEqual(toolCalls);
  });

  it('should handle multiple tool calls', () => {
    const toolCalls = [
      { name: 'read_file', arguments: { path: 'file1.txt' } },
      { name: 'read_file', arguments: { path: 'file2.txt' } },
      { name: 'list_directory', arguments: { path: '.' } },
    ];
    const msg = new ToolCallMsg('', toolCalls);
    expect(msg.toolCalls).toHaveLength(3);
  });

  it('should handle empty tool calls array', () => {
    const msg = new ToolCallMsg('', []);
    expect(msg.toolCalls).toEqual([]);
  });

  it('should handle tool call with asyncCallId', () => {
    const toolCalls = [
      { name: 'long_running_task', arguments: {}, asyncCallId: 'async-123' },
    ];
    const msg = new ToolCallMsg('', toolCalls);
    expect(msg.toolCalls[0].asyncCallId).toBe('async-123');
  });
});

describe('ToolResultMsg', () => {
  it('should create with tool results', () => {
    const results = [
      { toolName: 'read_file', result: 'file content here' },
    ];
    const msg = new ToolResultMsg(results);
    expect(msg.type).toBe(MsgType.ToolResult);
    expect(msg.content).toBe('');
    expect(msg.toolResults).toEqual(results);
  });

  it('should handle multiple tool results', () => {
    const results = [
      { toolName: 'read_file', result: 'content1' },
      { toolName: 'read_file', result: 'content2' },
    ];
    const msg = new ToolResultMsg(results);
    expect(msg.toolResults).toHaveLength(2);
  });

  it('should handle error results', () => {
    const results = [
      { toolName: 'read_file', result: 'File not found', isError: true },
    ];
    const msg = new ToolResultMsg(results);
    expect(msg.toolResults[0].isError).toBe(true);
  });

  it('should handle async placeholder results', () => {
    const results = [
      { toolName: 'long_task', result: 'Processing...', asyncCallId: 'async-456' },
    ];
    const msg = new ToolResultMsg(results);
    expect(msg.toolResults[0].asyncCallId).toBe('async-456');
  });

  describe('static single()', () => {
    it('should create single result message', () => {
      const msg = ToolResultMsg.single('read_file', 'file content');
      expect(msg.toolResults).toHaveLength(1);
      expect(msg.toolResults[0].toolName).toBe('read_file');
      expect(msg.toolResults[0].result).toBe('file content');
      expect(msg.toolResults[0].isError).toBeUndefined();
    });

    it('should create single error result message', () => {
      const msg = ToolResultMsg.single('read_file', 'File not found', true);
      expect(msg.toolResults[0].isError).toBe(true);
    });

    it('should create single success result message', () => {
      const msg = ToolResultMsg.single('write_file', 'Written successfully', false);
      expect(msg.toolResults[0].isError).toBe(false);
    });
  });
});

describe('AsyncToolResultMsg', () => {
  it('should create with correct properties', () => {
    const msg = new AsyncToolResultMsg('async-789', 'long_task', 'Task completed');
    expect(msg.type).toBe(MsgType.AsyncToolResult);
    expect(msg.asyncCallId).toBe('async-789');
    expect(msg.toolName).toBe('long_task');
    expect(msg.result).toBe('Task completed');
    expect(msg.isError).toBeUndefined();
  });

  it('should format content with tracking info', () => {
    const msg = new AsyncToolResultMsg('abc-123', 'my_tool', 'result');
    expect(msg.content).toBe('[Async Result #abc-123] Tool "my_tool" completed');
  });

  it('should handle error result', () => {
    const msg = new AsyncToolResultMsg('err-456', 'failing_task', 'Error occurred', true);
    expect(msg.isError).toBe(true);
    expect(msg.result).toBe('Error occurred');
  });

  it('should handle success result explicitly', () => {
    const msg = new AsyncToolResultMsg('ok-789', 'task', 'Done', false);
    expect(msg.isError).toBe(false);
  });

  it('should set timestamp on creation', () => {
    const before = Date.now();
    const msg = new AsyncToolResultMsg('id', 'tool', 'result');
    const after = Date.now();
    expect(msg.timestamp).toBeGreaterThanOrEqual(before);
    expect(msg.timestamp).toBeLessThanOrEqual(after);
  });
});
