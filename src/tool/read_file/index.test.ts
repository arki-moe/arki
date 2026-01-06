import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { TOOLS, workingDir, setWorkingDir } from '../../global.js';
import { ToolResultMsg } from '../../agent/Msg.js';

import './index.js';

describe('ReadFileTool', () => {
  let tempDir: string;
  let originalWorkingDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'read-file-test-'));
    originalWorkingDir = workingDir;
    setWorkingDir(tempDir);
  });

  afterEach(async () => {
    setWorkingDir(originalWorkingDir);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const tool = () => TOOLS['read_file'];

  describe('properties', () => {
    it('should have correct name', () => {
      expect(tool().name).toBe('read_file');
    });

    it('should have correct parameters schema', () => {
      expect(tool().parameters).toEqual({
        path: { type: 'string', description: 'File path' },
      });
      expect(tool().required).toEqual(['path']);
    });
  });

  describe('run', () => {
    it('should read existing file content', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello, World!');

      const result = await tool().run({ path: 'test.txt' });

      expect(result.result).toBe('Hello, World!');
    });

    it('should read file with utf-8 encoding', async () => {
      const filePath = path.join(tempDir, 'unicode.txt');
      await fs.writeFile(filePath, '你好，世界！🌍');

      const result = await tool().run({ path: 'unicode.txt' });

      expect(result.result).toBe('你好，世界！🌍');
    });

    it('should read file in subdirectory', async () => {
      const subDir = path.join(tempDir, 'subdir');
      await fs.mkdir(subDir);
      await fs.writeFile(path.join(subDir, 'nested.txt'), 'Nested content');

      const result = await tool().run({ path: 'subdir/nested.txt' });

      expect(result.result).toBe('Nested content');
    });

    it('should return error for non-existent file', async () => {
      const result = await tool().run({ path: 'nonexistent.txt' });

      expect(result.result).toContain('Failed to read file');
      expect(result.isError).toBe(true);
    });

    it('should return error for directory', async () => {
      const subDir = path.join(tempDir, 'mydir');
      await fs.mkdir(subDir);

      const result = await tool().run({ path: 'mydir' });

      expect(result.result).toContain('Failed to read file');
      expect(result.isError).toBe(true);
    });

    it('should handle absolute path', async () => {
      const filePath = path.join(tempDir, 'absolute.txt');
      await fs.writeFile(filePath, 'Absolute path content');

      const result = await tool().run({ path: filePath });

      expect(result.result).toBe('Absolute path content');
    });

    it('should read empty file', async () => {
      const filePath = path.join(tempDir, 'empty.txt');
      await fs.writeFile(filePath, '');

      const result = await tool().run({ path: 'empty.txt' });

      expect(result.result).toBe('');
    });

    it('should read multiline file', async () => {
      const filePath = path.join(tempDir, 'multiline.txt');
      await fs.writeFile(filePath, 'Line 1\nLine 2\nLine 3');

      const result = await tool().run({ path: 'multiline.txt' });

      expect(result.result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should wrap result with toolName', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Test content');

      const result = await tool().run({ path: 'test.txt' });

      expect(result).toBeInstanceOf(ToolResultMsg);
      expect(result.type).toBe('tool_result');
      expect(result.toolName).toBe('read_file');
      expect(result.result).toBe('Test content');
      expect(result.timestamp).toBeTypeOf('number');
    });

    it('should handle error result', async () => {
      const result = await tool().run({ path: 'nonexistent.txt' });

      expect(result.toolName).toBe('read_file');
      expect(result.result).toContain('Failed to read file');
      expect(result.isError).toBe(true);
    });
  });
});
