import { describe, it, expect } from 'vitest';
import { MsgType } from './Msg.js';

describe('MsgType', () => {
  it('should have correct values', () => {
    expect(MsgType.System).toBe('system');
    expect(MsgType.User).toBe('user');
    expect(MsgType.AI).toBe('ai');
    expect(MsgType.ToolCall).toBe('tool_call');
    expect(MsgType.ToolResult).toBe('tool_result');
  });
});
