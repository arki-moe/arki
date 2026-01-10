import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  CachedFileSystem,
  TargetNotFoundError,
  AmbiguousTargetError,
  ConflictError,
  _internal,
} from '../../src/fs/CachedFileSystem.js';

const { countOccurrences, applyOperation, getOperationRange, rangesOverlap } = _internal;

describe('CachedFileSystem', () => {
  let tempDir: string;
  let cachedFs: CachedFileSystem;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cached-fs-test-'));
    cachedFs = new CachedFileSystem();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // ==================== Insert Operations ====================

  describe('insert', () => {
    it('should insert content after target string', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');

      await cachedFs.insert(filePath, 'Hello', ' Beautiful', 'after', 'agent1');

      const content = await cachedFs.readFile(filePath, 'agent1');
      expect(content).toBe('Hello Beautiful World');
    });

    it('should insert content before target string', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');

      await cachedFs.insert(filePath, 'World', 'Beautiful ', 'before', 'agent1');

      const content = await cachedFs.readFile(filePath, 'agent1');
      expect(content).toBe('Hello Beautiful World');
    });

    it('should handle multiple sequential inserts', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');

      await cachedFs.insert(filePath, 'Hello', ' Beautiful', 'after', 'agent1');
      await cachedFs.insert(filePath, 'World', '!', 'after', 'agent1');

      const content = await cachedFs.readFile(filePath, 'agent1');
      expect(content).toBe('Hello Beautiful World!');
    });
  });

  // ==================== Replace Operations ====================

  describe('replace', () => {
    it('should replace target string with new content', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');

      await cachedFs.replace(filePath, 'World', 'Universe', 'agent1');

      const content = await cachedFs.readFile(filePath, 'agent1');
      expect(content).toBe('Hello Universe');
    });

    it('should handle replacing with empty string', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');

      await cachedFs.replace(filePath, ' World', '', 'agent1');

      const content = await cachedFs.readFile(filePath, 'agent1');
      expect(content).toBe('Hello');
    });

    it('should handle multiple sequential replaces', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');

      await cachedFs.replace(filePath, 'Hello', 'Hi', 'agent1');
      await cachedFs.replace(filePath, 'World', 'Universe', 'agent1');

      const content = await cachedFs.readFile(filePath, 'agent1');
      expect(content).toBe('Hi Universe');
    });
  });

  // ==================== Delete Operations ====================

  describe('delete', () => {
    it('should delete target string', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello Beautiful World');

      await cachedFs.delete(filePath, ' Beautiful', 'agent1');

      const content = await cachedFs.readFile(filePath, 'agent1');
      expect(content).toBe('Hello World');
    });

    it('should handle deleting entire content', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello');

      await cachedFs.delete(filePath, 'Hello', 'agent1');

      const content = await cachedFs.readFile(filePath, 'agent1');
      expect(content).toBe('');
    });
  });

  // ==================== Target Validation ====================

  describe('target validation', () => {
    it('should throw TargetNotFoundError when target does not exist', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');

      await expect(
        cachedFs.replace(filePath, 'NotFound', 'New', 'agent1')
      ).rejects.toThrow(TargetNotFoundError);
    });

    it('should throw AmbiguousTargetError when target appears multiple times', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello Hello World');

      await expect(
        cachedFs.replace(filePath, 'Hello', 'Hi', 'agent1')
      ).rejects.toThrow(AmbiguousTargetError);
    });

    it('should throw TargetNotFoundError when file does not exist', async () => {
      const filePath = path.join(tempDir, 'nonexistent.txt');

      await expect(
        cachedFs.replace(filePath, 'Hello', 'Hi', 'agent1')
      ).rejects.toThrow(TargetNotFoundError);
    });

    it('should validate target against virtual content with previous operations', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');

      // First operation creates a unique target
      await cachedFs.insert(filePath, 'Hello', ' Beautiful', 'after', 'agent1');

      // This should work because 'Beautiful' is now unique
      await cachedFs.replace(filePath, 'Beautiful', 'Amazing', 'agent1');

      const content = await cachedFs.readFile(filePath, 'agent1');
      expect(content).toBe('Hello Amazing World');
    });
  });

  // ==================== Read-Your-Writes ====================

  describe('read-your-writes', () => {
    it('should see own uncommitted writes when reading', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Original');

      await cachedFs.replace(filePath, 'Original', 'Modified', 'agent1');

      // Agent1 should see its own changes
      const content1 = await cachedFs.readFile(filePath, 'agent1');
      expect(content1).toBe('Modified');

      // File on disk should still be original
      const diskContent = await fs.readFile(filePath, 'utf-8');
      expect(diskContent).toBe('Original');
    });

    it('should not see other agents uncommitted writes', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Original');

      await cachedFs.replace(filePath, 'Original', 'Agent1Modified', 'agent1');

      // Agent2 should see original content
      const content2 = await cachedFs.readFile(filePath, 'agent2');
      expect(content2).toBe('Original');
    });
  });

  // ==================== Multi-Agent Isolation ====================

  describe('multi-agent isolation', () => {
    it('should keep operations isolated per agent', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');

      await cachedFs.replace(filePath, 'Hello', 'Hi', 'agent1');
      await cachedFs.replace(filePath, 'World', 'Universe', 'agent2');

      // Each agent sees only their own changes
      const content1 = await cachedFs.readFile(filePath, 'agent1');
      expect(content1).toBe('Hi World');

      const content2 = await cachedFs.readFile(filePath, 'agent2');
      expect(content2).toBe('Hello Universe');
    });

    it('should track operations separately per agent', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');

      await cachedFs.replace(filePath, 'Hello', 'Hi', 'agent1');
      await cachedFs.delete(filePath, ' World', 'agent2');

      const ops1 = cachedFs.getOperations('agent1', filePath);
      expect(ops1).toHaveLength(1);
      expect(ops1[0].type).toBe('replace');

      const ops2 = cachedFs.getOperations('agent2', filePath);
      expect(ops2).toHaveLength(1);
      expect(ops2[0].type).toBe('delete');
    });
  });

  // ==================== Conflict Detection ====================

  describe('conflict detection', () => {
    it('should detect conflict when two agents modify same region', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');
      // Pre-populate cache
      await cachedFs.readFile(filePath, 'agent1');

      await cachedFs.replace(filePath, 'Hello', 'Hi', 'agent1');
      await cachedFs.replace(filePath, 'Hello', 'Hey', 'agent2');

      const conflicts = cachedFs.getConflicts(filePath);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].agents).toContain('agent1');
      expect(conflicts[0].agents).toContain('agent2');
    });

    it('should not detect conflict when agents modify different regions', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');
      // Pre-populate cache
      await cachedFs.readFile(filePath, 'agent1');

      await cachedFs.replace(filePath, 'Hello', 'Hi', 'agent1');
      await cachedFs.replace(filePath, 'World', 'Universe', 'agent2');

      const conflicts = cachedFs.getConflicts(filePath);
      expect(conflicts).toHaveLength(0);
    });

    it('should detect conflict when insert touches same position', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');
      // Pre-populate cache
      await cachedFs.readFile(filePath, 'agent1');

      await cachedFs.insert(filePath, 'Hello', ' Beautiful', 'after', 'agent1');
      await cachedFs.insert(filePath, 'Hello', ' Amazing', 'after', 'agent2');

      const conflicts = cachedFs.getConflicts(filePath);
      expect(conflicts).toHaveLength(1);
    });

    it('should return all conflicts across files', async () => {
      const file1 = path.join(tempDir, 'file1.txt');
      const file2 = path.join(tempDir, 'file2.txt');
      await fs.writeFile(file1, 'Content1');
      await fs.writeFile(file2, 'Content2');
      // Pre-populate cache
      await cachedFs.readFile(file1, 'agent1');
      await cachedFs.readFile(file2, 'agent1');

      await cachedFs.replace(file1, 'Content1', 'Modified1', 'agent1');
      await cachedFs.replace(file1, 'Content1', 'Changed1', 'agent2');
      await cachedFs.replace(file2, 'Content2', 'Modified2', 'agent1');
      await cachedFs.replace(file2, 'Content2', 'Changed2', 'agent2');

      const allConflicts = cachedFs.getAllConflicts();
      expect(allConflicts.size).toBe(2);
      expect(allConflicts.has(file1)).toBe(true);
      expect(allConflicts.has(file2)).toBe(true);
    });

    it('should correctly identify hasConflicts', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');
      // Pre-populate cache
      await cachedFs.readFile(filePath, 'agent1');

      expect(cachedFs.hasConflicts(filePath)).toBe(false);

      await cachedFs.replace(filePath, 'Hello', 'Hi', 'agent1');
      await cachedFs.replace(filePath, 'Hello', 'Hey', 'agent2');

      expect(cachedFs.hasConflicts(filePath)).toBe(true);
    });
  });

  // ==================== Merged View ====================

  describe('merged view', () => {
    it('should return merged content with all operations applied', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');
      // Pre-populate cache
      await cachedFs.readFile(filePath, 'agent1');

      await cachedFs.replace(filePath, 'Hello', 'Hi', 'agent1');
      await cachedFs.replace(filePath, 'World', 'Universe', 'agent2');

      const { content, annotations } = await cachedFs.getMergedContent(filePath);
      expect(content).toBe('Hi Universe');
      expect(annotations).toHaveLength(2);
    });

    it('should include annotations showing which agent made changes', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');
      // Pre-populate cache
      await cachedFs.readFile(filePath, 'agent1');

      await cachedFs.replace(filePath, 'Hello', 'Hi', 'agent1');

      const { annotations } = await cachedFs.getMergedContent(filePath);
      expect(annotations).toHaveLength(1);
      expect(annotations[0].agentId).toBe('agent1');
      expect(annotations[0].type).toBe('replace');
    });

    it('should return agent-specific changes', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');

      await cachedFs.replace(filePath, 'Hello', 'Hi', 'agent1');
      await cachedFs.insert(filePath, 'Hi', '!', 'after', 'agent1');

      const { content, operations } = await cachedFs.getAgentChanges(filePath, 'agent1');
      expect(content).toBe('Hi! World');
      expect(operations).toHaveLength(2);
    });
  });

  // ==================== Flush ====================

  describe('flush', () => {
    it('should write operations to disk on flush', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Original');

      await cachedFs.replace(filePath, 'Original', 'Modified', 'agent1');
      await cachedFs.flush('agent1');

      const diskContent = await fs.readFile(filePath, 'utf-8');
      expect(diskContent).toBe('Modified');
    });

    it('should clear operations after flush', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Original');

      await cachedFs.replace(filePath, 'Original', 'Modified', 'agent1');
      await cachedFs.flush('agent1');

      const ops = cachedFs.getOperations('agent1', filePath);
      expect(ops).toHaveLength(0);
    });

    it('should reject flush when conflicts exist', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');
      // Pre-populate cache
      await cachedFs.readFile(filePath, 'agent1');

      await cachedFs.replace(filePath, 'Hello', 'Hi', 'agent1');
      await cachedFs.replace(filePath, 'Hello', 'Hey', 'agent2');

      await expect(cachedFs.flush('agent1')).rejects.toThrow(ConflictError);
    });

    it('should update read cache after flush', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Original');

      await cachedFs.replace(filePath, 'Original', 'Modified', 'agent1');
      await cachedFs.flush('agent1');

      // Other agents should now see the flushed content
      const content = await cachedFs.readFile(filePath, 'agent2');
      expect(content).toBe('Modified');
    });

    it('should flush all agents without conflicts', async () => {
      const file1 = path.join(tempDir, 'file1.txt');
      const file2 = path.join(tempDir, 'file2.txt');
      await fs.writeFile(file1, 'Content1');
      await fs.writeFile(file2, 'Content2');

      await cachedFs.replace(file1, 'Content1', 'Modified1', 'agent1');
      await cachedFs.replace(file2, 'Content2', 'Modified2', 'agent2');

      await cachedFs.flushAll();

      const disk1 = await fs.readFile(file1, 'utf-8');
      const disk2 = await fs.readFile(file2, 'utf-8');
      expect(disk1).toBe('Modified1');
      expect(disk2).toBe('Modified2');
    });

    it('should reject flushAll when any conflicts exist', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');
      // Pre-populate cache
      await cachedFs.readFile(filePath, 'agent1');

      await cachedFs.replace(filePath, 'Hello', 'Hi', 'agent1');
      await cachedFs.replace(filePath, 'Hello', 'Hey', 'agent2');

      await expect(cachedFs.flushAll()).rejects.toThrow(ConflictError);
    });

    it('should create parent directories when flushing new file path', async () => {
      const filePath = path.join(tempDir, 'deep/nested/dir/test.txt');
      // Create empty file first to have something to modify
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, 'Original');

      await cachedFs.replace(filePath, 'Original', 'Modified', 'agent1');
      await cachedFs.flush('agent1');

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('Modified');
    });
  });

  // ==================== Utility Methods ====================

  describe('utility methods', () => {
    it('should discard operations for an agent', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');

      await cachedFs.replace(filePath, 'Hello', 'Hi', 'agent1');
      cachedFs.discardOperations('agent1');

      const ops = cachedFs.getOperations('agent1');
      expect(ops).toHaveLength(0);

      // Content should be back to original
      const content = await cachedFs.readFile(filePath, 'agent1');
      expect(content).toBe('Hello World');
    });

    it('should discard operations for specific file only', async () => {
      const file1 = path.join(tempDir, 'file1.txt');
      const file2 = path.join(tempDir, 'file2.txt');
      await fs.writeFile(file1, 'Content1');
      await fs.writeFile(file2, 'Content2');

      await cachedFs.replace(file1, 'Content1', 'Modified1', 'agent1');
      await cachedFs.replace(file2, 'Content2', 'Modified2', 'agent1');

      cachedFs.discardOperations('agent1', file1);

      const ops1 = cachedFs.getOperations('agent1', file1);
      const ops2 = cachedFs.getOperations('agent1', file2);
      expect(ops1).toHaveLength(0);
      expect(ops2).toHaveLength(1);
    });

    it('should clear read cache', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Original');

      // Populate cache
      await cachedFs.readFile(filePath, 'agent1');

      // Modify file directly on disk
      await fs.writeFile(filePath, 'DirectlyModified');

      // Should still return cached value
      const cachedContent = await cachedFs.readFile(filePath, 'agent1');
      expect(cachedContent).toBe('Original');

      // Clear cache and read again
      cachedFs.clearReadCache();
      const newContent = await cachedFs.readFile(filePath, 'agent1');
      expect(newContent).toBe('DirectlyModified');
    });

    it('should get all operations for an agent across files', async () => {
      const file1 = path.join(tempDir, 'file1.txt');
      const file2 = path.join(tempDir, 'file2.txt');
      await fs.writeFile(file1, 'Content1');
      await fs.writeFile(file2, 'Content2');

      await cachedFs.replace(file1, 'Content1', 'Modified1', 'agent1');
      await cachedFs.replace(file2, 'Content2', 'Modified2', 'agent1');

      const allOps = cachedFs.getOperations('agent1');
      expect(allOps).toHaveLength(2);
    });
  });

  // ==================== Read Caching ====================

  describe('read caching', () => {
    it('should cache file content after first read', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Original');

      // First read populates cache
      const content1 = await cachedFs.readFile(filePath, 'agent1');
      expect(content1).toBe('Original');

      // Modify file on disk
      await fs.writeFile(filePath, 'Modified');

      // Second read should return cached value
      const content2 = await cachedFs.readFile(filePath, 'agent1');
      expect(content2).toBe('Original');
    });

    it('should return null for non-existent file', async () => {
      const filePath = path.join(tempDir, 'nonexistent.txt');

      const content = await cachedFs.readFile(filePath, 'agent1');
      expect(content).toBeNull();
    });

    it('should invalidate cache for specific file', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Original');

      // Populate cache
      await cachedFs.readFile(filePath, 'agent1');

      // Modify on disk
      await fs.writeFile(filePath, 'Modified');

      // Invalidate specific file
      cachedFs.invalidateCache(filePath);

      // Should now read new content
      const content = await cachedFs.readFile(filePath, 'agent1');
      expect(content).toBe('Modified');
    });
  });
});

// ==================== Internal Helper Functions ====================

describe('countOccurrences', () => {
  it('should return 0 for empty target string', () => {
    expect(countOccurrences('hello world', '')).toBe(0);
  });

  it('should return 0 for empty source string', () => {
    expect(countOccurrences('', 'hello')).toBe(0);
  });

  it('should return 0 when both strings are empty', () => {
    expect(countOccurrences('', '')).toBe(0);
  });

  it('should return 0 when target not found', () => {
    expect(countOccurrences('hello world', 'xyz')).toBe(0);
  });

  it('should return 1 when target appears once', () => {
    expect(countOccurrences('hello world', 'hello')).toBe(1);
  });

  it('should return correct count for multiple occurrences', () => {
    expect(countOccurrences('hello hello hello', 'hello')).toBe(3);
  });

  it('should count non-overlapping matches for repeating patterns', () => {
    // "aa" in "aaa" should be 1 (non-overlapping: positions 0, then next search starts at 2)
    expect(countOccurrences('aaa', 'aa')).toBe(1);
  });

  it('should count non-overlapping matches in longer repeating patterns', () => {
    // "aa" in "aaaa" should be 2 (positions 0 and 2)
    expect(countOccurrences('aaaa', 'aa')).toBe(2);
  });

  it('should find target at the beginning', () => {
    expect(countOccurrences('hello world', 'hello')).toBe(1);
  });

  it('should find target at the end', () => {
    expect(countOccurrences('hello world', 'world')).toBe(1);
  });

  it('should find target that equals entire string', () => {
    expect(countOccurrences('hello', 'hello')).toBe(1);
  });

  it('should handle single character target', () => {
    expect(countOccurrences('abcabc', 'a')).toBe(2);
  });

  it('should handle target longer than source', () => {
    expect(countOccurrences('hi', 'hello world')).toBe(0);
  });

  it('should be case sensitive', () => {
    expect(countOccurrences('Hello HELLO hello', 'hello')).toBe(1);
  });

  it('should handle special characters', () => {
    expect(countOccurrences('a.b.c.d', '.')).toBe(3);
  });

  it('should handle newlines in content', () => {
    expect(countOccurrences('line1\nline2\nline3', '\n')).toBe(2);
  });

  it('should handle multiline target', () => {
    expect(countOccurrences('a\nb\na\nb', 'a\nb')).toBe(2);
  });
});

describe('applyOperation', () => {
  describe('insert operations', () => {
    it('should insert before target at the beginning', () => {
      const result = applyOperation('hello world', {
        type: 'insert',
        target: 'hello',
        content: 'say ',
        position: 'before',
      });
      expect(result).toBe('say hello world');
    });

    it('should insert before target in the middle', () => {
      const result = applyOperation('hello world', {
        type: 'insert',
        target: 'world',
        content: 'beautiful ',
        position: 'before',
      });
      expect(result).toBe('hello beautiful world');
    });

    it('should insert before target at the end', () => {
      const result = applyOperation('hello world', {
        type: 'insert',
        target: 'world',
        content: 'beautiful ',
        position: 'before',
      });
      expect(result).toBe('hello beautiful world');
    });

    it('should insert after target at the beginning', () => {
      const result = applyOperation('hello world', {
        type: 'insert',
        target: 'hello',
        content: ' beautiful',
        position: 'after',
      });
      expect(result).toBe('hello beautiful world');
    });

    it('should insert after target at the end', () => {
      const result = applyOperation('hello world', {
        type: 'insert',
        target: 'world',
        content: '!',
        position: 'after',
      });
      expect(result).toBe('hello world!');
    });

    it('should insert empty content (no-op)', () => {
      const result = applyOperation('hello world', {
        type: 'insert',
        target: 'hello',
        content: '',
        position: 'after',
      });
      expect(result).toBe('hello world');
    });

    it('should insert when content is undefined', () => {
      const result = applyOperation('hello world', {
        type: 'insert',
        target: 'hello',
        content: undefined,
        position: 'after',
      });
      expect(result).toBe('hello world');
    });

    it('should default to after when position not specified', () => {
      const result = applyOperation('hello world', {
        type: 'insert',
        target: 'hello',
        content: '!',
        // position is undefined, defaults to 'after' in else branch
      });
      expect(result).toBe('hello! world');
    });
  });

  describe('replace operations', () => {
    it('should replace target at the beginning', () => {
      const result = applyOperation('hello world', {
        type: 'replace',
        target: 'hello',
        content: 'hi',
      });
      expect(result).toBe('hi world');
    });

    it('should replace target in the middle', () => {
      const result = applyOperation('hello beautiful world', {
        type: 'replace',
        target: 'beautiful',
        content: 'ugly',
      });
      expect(result).toBe('hello ugly world');
    });

    it('should replace target at the end', () => {
      const result = applyOperation('hello world', {
        type: 'replace',
        target: 'world',
        content: 'universe',
      });
      expect(result).toBe('hello universe');
    });

    it('should replace with empty string (effectively delete)', () => {
      const result = applyOperation('hello world', {
        type: 'replace',
        target: ' world',
        content: '',
      });
      expect(result).toBe('hello');
    });

    it('should replace with longer content', () => {
      const result = applyOperation('hi', {
        type: 'replace',
        target: 'hi',
        content: 'hello world',
      });
      expect(result).toBe('hello world');
    });

    it('should replace with shorter content', () => {
      const result = applyOperation('hello world', {
        type: 'replace',
        target: 'hello world',
        content: 'hi',
      });
      expect(result).toBe('hi');
    });

    it('should replace entire content', () => {
      const result = applyOperation('hello', {
        type: 'replace',
        target: 'hello',
        content: 'world',
      });
      expect(result).toBe('world');
    });

    it('should handle undefined content (replace with empty)', () => {
      const result = applyOperation('hello world', {
        type: 'replace',
        target: ' world',
        content: undefined,
      });
      expect(result).toBe('hello');
    });
  });

  describe('delete operations', () => {
    it('should delete target at the beginning', () => {
      const result = applyOperation('hello world', {
        type: 'delete',
        target: 'hello ',
      });
      expect(result).toBe('world');
    });

    it('should delete target in the middle', () => {
      const result = applyOperation('hello beautiful world', {
        type: 'delete',
        target: ' beautiful',
      });
      expect(result).toBe('hello world');
    });

    it('should delete target at the end', () => {
      const result = applyOperation('hello world', {
        type: 'delete',
        target: ' world',
      });
      expect(result).toBe('hello');
    });

    it('should delete entire content', () => {
      const result = applyOperation('hello', {
        type: 'delete',
        target: 'hello',
      });
      expect(result).toBe('');
    });

    it('should delete single character', () => {
      const result = applyOperation('hello', {
        type: 'delete',
        target: 'l',
      });
      // Only first occurrence is deleted
      expect(result).toBe('helo');
    });
  });

  describe('error cases', () => {
    it('should throw TargetNotFoundError when target not found', () => {
      expect(() =>
        applyOperation('hello world', {
          type: 'replace',
          target: 'xyz',
          content: 'abc',
        })
      ).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle multiline content', () => {
      const result = applyOperation('line1\nline2\nline3', {
        type: 'replace',
        target: 'line2',
        content: 'modified',
      });
      expect(result).toBe('line1\nmodified\nline3');
    });

    it('should handle special regex characters in target', () => {
      const result = applyOperation('price: $100.00', {
        type: 'replace',
        target: '$100.00',
        content: '$200.00',
      });
      expect(result).toBe('price: $200.00');
    });

    it('should handle unicode characters', () => {
      const result = applyOperation('hello 世界', {
        type: 'replace',
        target: '世界',
        content: 'world',
      });
      expect(result).toBe('hello world');
    });

    it('should handle emoji', () => {
      const result = applyOperation('hello 👋 world', {
        type: 'replace',
        target: '👋',
        content: '🌍',
      });
      expect(result).toBe('hello 🌍 world');
    });
  });
});

describe('getOperationRange', () => {
  describe('insert operations', () => {
    it('should return point range for insert before at beginning', () => {
      const range = getOperationRange('hello world', {
        type: 'insert',
        target: 'hello',
        content: 'say ',
        position: 'before',
      });
      expect(range).toEqual({ start: 0, end: 0 });
    });

    it('should return point range for insert before in middle', () => {
      const range = getOperationRange('hello world', {
        type: 'insert',
        target: 'world',
        content: 'beautiful ',
        position: 'before',
      });
      expect(range).toEqual({ start: 6, end: 6 });
    });

    it('should return point range for insert after at beginning', () => {
      const range = getOperationRange('hello world', {
        type: 'insert',
        target: 'hello',
        content: '!',
        position: 'after',
      });
      // "hello" ends at position 5
      expect(range).toEqual({ start: 5, end: 5 });
    });

    it('should return point range for insert after at end', () => {
      const range = getOperationRange('hello world', {
        type: 'insert',
        target: 'world',
        content: '!',
        position: 'after',
      });
      // "world" ends at position 11
      expect(range).toEqual({ start: 11, end: 11 });
    });

    it('should default to after when position not specified', () => {
      const range = getOperationRange('hello world', {
        type: 'insert',
        target: 'hello',
        content: '!',
      });
      expect(range).toEqual({ start: 5, end: 5 });
    });
  });

  describe('replace operations', () => {
    it('should return range covering target at beginning', () => {
      const range = getOperationRange('hello world', {
        type: 'replace',
        target: 'hello',
        content: 'hi',
      });
      expect(range).toEqual({ start: 0, end: 5 });
    });

    it('should return range covering target in middle', () => {
      const range = getOperationRange('hello beautiful world', {
        type: 'replace',
        target: 'beautiful',
        content: 'ugly',
      });
      expect(range).toEqual({ start: 6, end: 15 });
    });

    it('should return range covering target at end', () => {
      const range = getOperationRange('hello world', {
        type: 'replace',
        target: 'world',
        content: 'universe',
      });
      expect(range).toEqual({ start: 6, end: 11 });
    });

    it('should return range for entire content', () => {
      const range = getOperationRange('hello', {
        type: 'replace',
        target: 'hello',
        content: 'world',
      });
      expect(range).toEqual({ start: 0, end: 5 });
    });
  });

  describe('delete operations', () => {
    it('should return range covering target at beginning', () => {
      const range = getOperationRange('hello world', {
        type: 'delete',
        target: 'hello ',
      });
      expect(range).toEqual({ start: 0, end: 6 });
    });

    it('should return range covering target in middle', () => {
      const range = getOperationRange('hello beautiful world', {
        type: 'delete',
        target: ' beautiful',
      });
      expect(range).toEqual({ start: 5, end: 15 });
    });

    it('should return range covering target at end', () => {
      const range = getOperationRange('hello world', {
        type: 'delete',
        target: ' world',
      });
      expect(range).toEqual({ start: 5, end: 11 });
    });
  });

  describe('target not found', () => {
    it('should return null when target not found', () => {
      const range = getOperationRange('hello world', {
        type: 'replace',
        target: 'xyz',
        content: 'abc',
      });
      expect(range).toBeNull();
    });

    it('should return null for empty content', () => {
      const range = getOperationRange('', {
        type: 'replace',
        target: 'hello',
        content: 'world',
      });
      expect(range).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle single character target', () => {
      const range = getOperationRange('abc', {
        type: 'delete',
        target: 'b',
      });
      expect(range).toEqual({ start: 1, end: 2 });
    });

    it('should handle multiline target', () => {
      const range = getOperationRange('line1\nline2\nline3', {
        type: 'replace',
        target: 'line2\n',
        content: '',
      });
      expect(range).toEqual({ start: 6, end: 12 });
    });

    it('should handle unicode characters correctly', () => {
      // Note: JS strings use UTF-16, so emoji might have different length
      const range = getOperationRange('hello 世界', {
        type: 'replace',
        target: '世界',
        content: 'world',
      });
      expect(range).toEqual({ start: 6, end: 8 });
    });
  });
});

describe('rangesOverlap', () => {
  describe('point insertions (start === end)', () => {
    it('should detect overlap when two points are at same position', () => {
      expect(rangesOverlap({ start: 5, end: 5 }, { start: 5, end: 5 })).toBe(true);
    });

    it('should not overlap when two points are at different positions', () => {
      expect(rangesOverlap({ start: 5, end: 5 }, { start: 6, end: 6 })).toBe(false);
    });

    it('should detect overlap when point is at start of range', () => {
      expect(rangesOverlap({ start: 5, end: 5 }, { start: 5, end: 10 })).toBe(true);
    });

    it('should detect overlap when point is at end of range', () => {
      expect(rangesOverlap({ start: 10, end: 10 }, { start: 5, end: 10 })).toBe(true);
    });

    it('should detect overlap when point is inside range', () => {
      expect(rangesOverlap({ start: 7, end: 7 }, { start: 5, end: 10 })).toBe(true);
    });

    it('should not overlap when point is before range', () => {
      expect(rangesOverlap({ start: 4, end: 4 }, { start: 5, end: 10 })).toBe(false);
    });

    it('should not overlap when point is after range', () => {
      expect(rangesOverlap({ start: 11, end: 11 }, { start: 5, end: 10 })).toBe(false);
    });

    it('should detect overlap when range contains point (reversed order)', () => {
      expect(rangesOverlap({ start: 5, end: 10 }, { start: 7, end: 7 })).toBe(true);
    });

    it('should detect overlap when point at range start (reversed order)', () => {
      expect(rangesOverlap({ start: 5, end: 10 }, { start: 5, end: 5 })).toBe(true);
    });

    it('should detect overlap when point at range end (reversed order)', () => {
      expect(rangesOverlap({ start: 5, end: 10 }, { start: 10, end: 10 })).toBe(true);
    });

    it('should not overlap when point before range (reversed order)', () => {
      expect(rangesOverlap({ start: 5, end: 10 }, { start: 4, end: 4 })).toBe(false);
    });

    it('should not overlap when point after range (reversed order)', () => {
      expect(rangesOverlap({ start: 5, end: 10 }, { start: 11, end: 11 })).toBe(false);
    });
  });

  describe('range overlaps', () => {
    it('should detect full overlap (same range)', () => {
      expect(rangesOverlap({ start: 5, end: 10 }, { start: 5, end: 10 })).toBe(true);
    });

    it('should detect overlap when one range contains another', () => {
      expect(rangesOverlap({ start: 0, end: 20 }, { start: 5, end: 10 })).toBe(true);
    });

    it('should detect overlap when ranges partially overlap (a starts before b)', () => {
      expect(rangesOverlap({ start: 0, end: 10 }, { start: 5, end: 15 })).toBe(true);
    });

    it('should detect overlap when ranges partially overlap (b starts before a)', () => {
      expect(rangesOverlap({ start: 5, end: 15 }, { start: 0, end: 10 })).toBe(true);
    });

    it('should not overlap when ranges are adjacent (a ends where b starts)', () => {
      expect(rangesOverlap({ start: 0, end: 5 }, { start: 5, end: 10 })).toBe(false);
    });

    it('should not overlap when ranges are adjacent (b ends where a starts)', () => {
      expect(rangesOverlap({ start: 5, end: 10 }, { start: 0, end: 5 })).toBe(false);
    });

    it('should not overlap when ranges are completely separate', () => {
      expect(rangesOverlap({ start: 0, end: 5 }, { start: 10, end: 15 })).toBe(false);
    });

    it('should not overlap when ranges are completely separate (reversed)', () => {
      expect(rangesOverlap({ start: 10, end: 15 }, { start: 0, end: 5 })).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle ranges at position 0', () => {
      expect(rangesOverlap({ start: 0, end: 5 }, { start: 0, end: 3 })).toBe(true);
    });

    it('should handle point at position 0', () => {
      expect(rangesOverlap({ start: 0, end: 0 }, { start: 0, end: 5 })).toBe(true);
    });

    it('should handle very large positions', () => {
      expect(
        rangesOverlap({ start: 1000000, end: 1000010 }, { start: 1000005, end: 1000015 })
      ).toBe(true);
    });

    it('should handle single-character ranges', () => {
      expect(rangesOverlap({ start: 5, end: 6 }, { start: 5, end: 6 })).toBe(true);
    });

    it('should not overlap single-character adjacent ranges', () => {
      expect(rangesOverlap({ start: 5, end: 6 }, { start: 6, end: 7 })).toBe(false);
    });

    it('should detect overlap in single-character ranges at same position', () => {
      expect(rangesOverlap({ start: 5, end: 6 }, { start: 5, end: 6 })).toBe(true);
    });

    it('should detect overlap when ranges share one character', () => {
      // Range [5,7) and [6,8) share position 6
      expect(rangesOverlap({ start: 5, end: 7 }, { start: 6, end: 8 })).toBe(true);
    });
  });
});
