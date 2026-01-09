import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { TOOLS, workingDir, setWorkingDir } from '../../../src/global.js';

import '../../../src/tool/list_directory/index.js';

describe('ListDirectoryTool', () => {
  let tempDir: string;
  let originalWorkingDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'list-dir-test-'));
    originalWorkingDir = workingDir;
    setWorkingDir(tempDir);
  });

  afterEach(async () => {
    setWorkingDir(originalWorkingDir);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const tool = () => TOOLS['list_directory'];

  describe('properties', () => {
    it('should have correct name', () => {
      expect(tool().name).toBe('list_directory');
    });

    it('should have correct parameters schema', () => {
      expect(tool().parameters).toEqual({
        path: { type: 'string', description: 'Directory path' },
      });
      expect(tool().required).toEqual([]);
    });
  });

  describe('run', () => {
    it('should list files and directories', async () => {
      await fs.writeFile(path.join(tempDir, 'file1.txt'), 'content');
      await fs.writeFile(path.join(tempDir, 'file2.txt'), 'content');
      await fs.mkdir(path.join(tempDir, 'subdir'));

      const result = await tool().run({ path: '.' });

      expect(result.result).toContain('[FILE] file1.txt');
      expect(result.result).toContain('[FILE] file2.txt');
      expect(result.result).toContain('[DIR] subdir');
    });

    it('should default to current directory when path not provided', async () => {
      await fs.writeFile(path.join(tempDir, 'default.txt'), 'content');

      const result = await tool().run({});

      expect(result.result).toContain('[FILE] default.txt');
    });

    it('should list contents of subdirectory', async () => {
      const subDir = path.join(tempDir, 'mysubdir');
      await fs.mkdir(subDir);
      await fs.writeFile(path.join(subDir, 'nested.txt'), 'content');
      await fs.mkdir(path.join(subDir, 'innerdir'));

      const result = await tool().run({ path: 'mysubdir' });

      expect(result.result).toContain('[FILE] nested.txt');
      expect(result.result).toContain('[DIR] innerdir');
    });

    it('should return "Directory is empty" for empty directory', async () => {
      const emptyDir = path.join(tempDir, 'empty');
      await fs.mkdir(emptyDir);

      const result = await tool().run({ path: 'empty' });

      expect(result.result).toBe('Directory is empty');
    });

    it('should return error for non-existent directory', async () => {
      const result = await tool().run({ path: 'nonexistent' });

      expect(result.result).toContain('Failed to list directory');
      expect(result.isError).toBe(true);
    });

    it('should return error when path is a file', async () => {
      await fs.writeFile(path.join(tempDir, 'notadir.txt'), 'content');

      const result = await tool().run({ path: 'notadir.txt' });

      expect(result.result).toContain('Failed to list directory');
      expect(result.isError).toBe(true);
    });

    it('should handle absolute path', async () => {
      const absoluteDir = path.join(tempDir, 'absolutedir');
      await fs.mkdir(absoluteDir);
      await fs.writeFile(path.join(absoluteDir, 'absfile.txt'), 'content');

      const result = await tool().run({ path: absoluteDir });

      expect(result.result).toContain('[FILE] absfile.txt');
    });

    it('should list multiple files', async () => {
      await fs.writeFile(path.join(tempDir, 'zebra.txt'), '');
      await fs.writeFile(path.join(tempDir, 'apple.txt'), '');
      await fs.writeFile(path.join(tempDir, 'banana.txt'), '');

      const result = await tool().run({ path: '.' });
      const lines = result.result.split('\n');

      expect(lines).toContain('[FILE] zebra.txt');
      expect(lines).toContain('[FILE] apple.txt');
      expect(lines).toContain('[FILE] banana.txt');
    });

    it('should correctly distinguish files and directories', async () => {
      await fs.writeFile(path.join(tempDir, 'myfile'), 'content');
      await fs.mkdir(path.join(tempDir, 'mydir'));

      const result = await tool().run({ path: '.' });

      expect(result.result).toContain('[FILE] myfile');
      expect(result.result).toContain('[DIR] mydir');
    });

    it('should wrap result with toolName', async () => {
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'content');

      const result = await tool().run({ path: '.' });

      expect(result.toolName).toBe('list_directory');
      expect(result.result).toContain('[FILE] test.txt');
    });

    it('should handle error result', async () => {
      const result = await tool().run({ path: 'nonexistent' });

      expect(result.toolName).toBe('list_directory');
      expect(result.result).toContain('Failed to list directory');
      expect(result.isError).toBe(true);
    });
  });
});
