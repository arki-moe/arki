import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { TOOLS, workingDir, setWorkingDir } from '../../../src/global.js';

import '../../../src/tool/write_file/index.js';

describe('WriteFileTool', () => {
  let tempDir: string;
  let originalWorkingDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'write-file-test-'));
    originalWorkingDir = workingDir;
    setWorkingDir(tempDir);
  });

  afterEach(async () => {
    setWorkingDir(originalWorkingDir);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const tool = () => TOOLS['write_file'];

  describe('properties', () => {
    it('should have correct name', () => {
      expect(tool().name).toBe('write_file');
    });

    it('should have correct parameters schema', () => {
      expect(tool().parameters).toEqual({
        path: { type: 'string', description: 'File path' },
        content: { type: 'string', description: 'Content to write' },
      });
      expect(tool().required).toEqual(['path', 'content']);
    });
  });

  describe('run', () => {
    it('should write content to new file', async () => {
      const result = await tool().run({
        path: 'new-file.txt',
        content: 'Hello, World!',
      });

      expect(result.result).toBe('File written successfully: new-file.txt');

      const content = await fs.readFile(path.join(tempDir, 'new-file.txt'), 'utf-8');
      expect(content).toBe('Hello, World!');
    });

    it('should overwrite existing file', async () => {
      const filePath = path.join(tempDir, 'existing.txt');
      await fs.writeFile(filePath, 'Old content');

      const result = await tool().run({
        path: 'existing.txt',
        content: 'New content',
      });

      expect(result.result).toBe('File written successfully: existing.txt');

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('New content');
    });

    it('should create parent directories if they do not exist', async () => {
      const result = await tool().run({
        path: 'deep/nested/dir/file.txt',
        content: 'Nested content',
      });

      expect(result.result).toBe('File written successfully: deep/nested/dir/file.txt');

      const content = await fs.readFile(
        path.join(tempDir, 'deep/nested/dir/file.txt'),
        'utf-8'
      );
      expect(content).toBe('Nested content');
    });

    it('should write utf-8 content', async () => {
      const result = await tool().run({
        path: 'unicode.txt',
        content: '你好，世界！🎉',
      });

      expect(result.result).toBe('File written successfully: unicode.txt');

      const content = await fs.readFile(path.join(tempDir, 'unicode.txt'), 'utf-8');
      expect(content).toBe('你好，世界！🎉');
    });

    it('should write empty content', async () => {
      const result = await tool().run({
        path: 'empty.txt',
        content: '',
      });

      expect(result.result).toBe('File written successfully: empty.txt');

      const content = await fs.readFile(path.join(tempDir, 'empty.txt'), 'utf-8');
      expect(content).toBe('');
    });

    it('should write multiline content', async () => {
      const multiline = 'Line 1\nLine 2\nLine 3';
      const result = await tool().run({
        path: 'multiline.txt',
        content: multiline,
      });

      expect(result.result).toBe('File written successfully: multiline.txt');

      const content = await fs.readFile(path.join(tempDir, 'multiline.txt'), 'utf-8');
      expect(content).toBe(multiline);
    });

    it('should handle absolute path', async () => {
      const absolutePath = path.join(tempDir, 'absolute.txt');
      const result = await tool().run({
        path: absolutePath,
        content: 'Absolute content',
      });

      expect(result.result).toBe(`File written successfully: ${absolutePath}`);

      const content = await fs.readFile(absolutePath, 'utf-8');
      expect(content).toBe('Absolute content');
    });

    it('should return error for invalid path', async () => {
      const filePath = path.join(tempDir, 'afile.txt');
      await fs.writeFile(filePath, 'content');

      const result = await tool().run({
        path: 'afile.txt/invalid.txt',
        content: 'content',
      });

      expect(result.result).toContain('Failed to write file');
      expect(result.isError).toBe(true);
    });

    it('should wrap result with toolName', async () => {
      const result = await tool().run(
        { path: 'test.txt', content: 'Test content' }
      );

      expect(result.toolName).toBe('write_file');
      expect(result.result).toBe('File written successfully: test.txt');
    });

    it('should handle error result', async () => {
      const filePath = path.join(tempDir, 'afile.txt');
      await fs.writeFile(filePath, 'content');

      const result = await tool().run(
        { path: 'afile.txt/invalid.txt', content: 'content' }
      );

      expect(result.toolName).toBe('write_file');
      expect(result.result).toContain('Failed to write file');
      expect(result.isError).toBe(true);
    });
  });
});
