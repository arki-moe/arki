import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eventBus, subscribe, publish } from '../../src/event_bus/EventBus.js';
import {
  Event,
  StreamEvent,
  ToolCallReceivedEvent,
  BeforeToolRunEvent,
  ToolResultEvent,
  AsyncToolResultEvent,
  RunStartEvent,
  RunEndEvent,
} from '../../src/event_bus/Event.js';

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.clear();
  });

  describe('subscribe', () => {
    it('should subscribe to specific agent events', () => {
      const callback = vi.fn();
      subscribe(StreamEvent, 'TestAgent', callback);

      const event = new StreamEvent('TestAgent', 'Hello');
      publish(event);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(event);
    });

    it('should not trigger callback for different agent', () => {
      const callback = vi.fn();
      subscribe(StreamEvent, 'Agent1', callback);

      publish(new StreamEvent('Agent2', 'Hello'));

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support wildcard subscription', () => {
      const callback = vi.fn();
      subscribe(StreamEvent, '*', callback);

      publish(new StreamEvent('Agent1', 'Hello'));
      publish(new StreamEvent('Agent2', 'World'));

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should trigger both specific and wildcard subscribers', () => {
      const specificCallback = vi.fn();
      const wildcardCallback = vi.fn();

      subscribe(StreamEvent, 'TestAgent', specificCallback);
      subscribe(StreamEvent, '*', wildcardCallback);

      publish(new StreamEvent('TestAgent', 'Hello'));

      expect(specificCallback).toHaveBeenCalledTimes(1);
      expect(wildcardCallback).toHaveBeenCalledTimes(1);
    });

    it('should support multiple subscribers for same event and agent', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      subscribe(StreamEvent, 'TestAgent', callback1);
      subscribe(StreamEvent, 'TestAgent', callback2);

      publish(new StreamEvent('TestAgent', 'Hello'));

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('unsubscribe', () => {
    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = subscribe(StreamEvent, 'TestAgent', callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should stop receiving events after unsubscribe', () => {
      const callback = vi.fn();
      const unsubscribe = subscribe(StreamEvent, 'TestAgent', callback);

      publish(new StreamEvent('TestAgent', 'First'));
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      publish(new StreamEvent('TestAgent', 'Second'));
      expect(callback).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should only unsubscribe the specific callback', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsubscribe1 = subscribe(StreamEvent, 'TestAgent', callback1);
      subscribe(StreamEvent, 'TestAgent', callback2);

      unsubscribe1();

      publish(new StreamEvent('TestAgent', 'Hello'));

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should handle unsubscribe when callback not found', () => {
      const callback = vi.fn();
      const unsubscribe = subscribe(StreamEvent, 'TestAgent', callback);

      // Unsubscribe twice - should not throw
      unsubscribe();
      expect(() => unsubscribe()).not.toThrow();
    });

    it('should clean up empty subscription arrays', () => {
      const callback = vi.fn();
      const unsubscribe = subscribe(StreamEvent, 'TestAgent', callback);

      unsubscribe();

      // After unsubscribing the only callback, publishing should not throw
      expect(() => publish(new StreamEvent('TestAgent', 'Hello'))).not.toThrow();
    });
  });

  describe('publish', () => {
    it('should not throw when no subscribers', () => {
      expect(() => publish(new StreamEvent('TestAgent', 'Hello'))).not.toThrow();
    });

    it('should pass event object to callback', () => {
      const callback = vi.fn();
      subscribe(StreamEvent, 'TestAgent', callback);

      const event = new StreamEvent('TestAgent', 'Hello');
      publish(event);

      expect(callback.mock.calls[0][0]).toBe(event);
    });
  });

  describe('clear', () => {
    it('should remove all subscriptions', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      subscribe(StreamEvent, 'Agent1', callback1);
      subscribe(ToolResultEvent, 'Agent2', callback2);

      eventBus.clear();

      publish(new StreamEvent('Agent1', 'Hello'));
      publish(new ToolResultEvent('Agent2', 'tool', {}, 'result'));

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });
});

describe('Event classes', () => {
  describe('StreamEvent', () => {
    it('should create with agent name and chunk', () => {
      const event = new StreamEvent('Agent1', 'Hello World');
      expect(event.agentName).toBe('Agent1');
      expect(event.chunk).toBe('Hello World');
      expect(event.timestamp).toBeDefined();
    });
  });

  describe('ToolCallReceivedEvent', () => {
    it('should create with tool calls array', () => {
      const toolCalls = [
        { name: 'read_file', arguments: { path: 'test.txt' } },
      ];
      const event = new ToolCallReceivedEvent('Agent1', toolCalls);
      expect(event.agentName).toBe('Agent1');
      expect(event.toolCalls).toEqual(toolCalls);
    });
  });

  describe('BeforeToolRunEvent', () => {
    it('should create with tool name and args', () => {
      const args = { path: 'test.txt' };
      const event = new BeforeToolRunEvent('Agent1', 'read_file', args);
      expect(event.agentName).toBe('Agent1');
      expect(event.toolName).toBe('read_file');
      expect(event.args).toEqual(args);
    });
  });

  describe('ToolResultEvent', () => {
    it('should create with all properties', () => {
      const args = { path: 'test.txt' };
      const event = new ToolResultEvent('Agent1', 'read_file', args, 'file content', false);
      expect(event.agentName).toBe('Agent1');
      expect(event.toolName).toBe('read_file');
      expect(event.args).toEqual(args);
      expect(event.result).toBe('file content');
      expect(event.isError).toBe(false);
    });

    it('should handle error result', () => {
      const event = new ToolResultEvent('Agent1', 'read_file', {}, 'File not found', true);
      expect(event.isError).toBe(true);
    });
  });

  describe('AsyncToolResultEvent', () => {
    it('should create with asyncCallId', () => {
      const args = { command: 'long_task' };
      const event = new AsyncToolResultEvent(
        'Agent1',
        'async-123',
        'run_command',
        args,
        'Task completed'
      );
      expect(event.agentName).toBe('Agent1');
      expect(event.asyncCallId).toBe('async-123');
      expect(event.toolName).toBe('run_command');
      expect(event.args).toEqual(args);
      expect(event.result).toBe('Task completed');
      expect(event.isError).toBeUndefined();
    });

    it('should handle error result', () => {
      const event = new AsyncToolResultEvent(
        'Agent1',
        'async-456',
        'run_command',
        {},
        'Command failed',
        true
      );
      expect(event.isError).toBe(true);
    });
  });

  describe('RunStartEvent', () => {
    it('should create with user input', () => {
      const event = new RunStartEvent('Agent1', 'Hello, how are you?');
      expect(event.agentName).toBe('Agent1');
      expect(event.userInput).toBe('Hello, how are you?');
    });
  });

  describe('RunEndEvent', () => {
    it('should create with response and tool calls', () => {
      const toolCalls = [
        { name: 'read_file', arguments: { path: 'test.txt' }, result: 'content' },
      ];
      const event = new RunEndEvent('Agent1', 'Done', toolCalls);
      expect(event.agentName).toBe('Agent1');
      expect(event.response).toBe('Done');
      expect(event.toolCalls).toEqual(toolCalls);
      expect(event.usage).toBeUndefined();
    });

    it('should include usage information', () => {
      const usage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        cachedTokens: 20,
      };
      const event = new RunEndEvent('Agent1', 'Done', [], usage);
      expect(event.usage).toEqual(usage);
    });
  });
});
