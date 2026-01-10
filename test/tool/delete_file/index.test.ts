import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { TOOLS } from '../../../src/global.js';
import { workingDir, setWorkingDir } from '../../../src/fs/paths.js';

import '../../../src/tool/delete_file/index.js';

describe('DeleteFileTool', () => {
  let tempDir: string;
  let originalWorkingDir: string;
  const testContext = { agentId: 'test-agent' };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'delete-file-test-'));
    originalWorkingDir = workingDir;
    setWorkingDir(tempDir);
  });

  afterEach(async () => {
    setWorkingDir(originalWorkingDir);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const tool = () => TOOLS['delete_file'];

  describe('properties', () => {
    it('should have correct name', () => {
      expect(tool().name).toBe('delete_file');
    });

    it('should have correct required parameters', () => {
      expect(tool().required).toEqual(['path']);
    });
  });

  describe('run', () => {
    it('should delete a file', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'content');

      const result = await tool().run({ path: 'test.txt' }, testContext);

      expect(result.isError).toBeUndefined();
      expect(result.result).toContain('File deleted');

      await expect(fs.access(filePath)).rejects.toThrow();
    });

    it('should return error for non-existent file', async () => {
      const result = await tool().run({ path: 'nonexistent.txt' }, testContext);

      expect(result.isError).toBe(true);
      expect(result.result).toContain('Failed to delete file');
    });

    it('should return error when trying to delete a directory', async () => {
      await fs.mkdir(path.join(tempDir, 'mydir'));

      const result = await tool().run({ path: 'mydir' }, testContext);

      expect(result.isError).toBe(true);
      expect(result.result).toContain('is a directory');
      expect(result.result).toContain('delete_directory');
    });

    it('should delete file in subdirectory', async () => {
      await fs.mkdir(path.join(tempDir, 'subdir'));
      const filePath = path.join(tempDir, 'subdir', 'file.txt');
      await fs.writeFile(filePath, 'content');

      const result = await tool().run({ path: 'subdir/file.txt' }, testContext);

      expect(result.isError).toBeUndefined();
      await expect(fs.access(filePath)).rejects.toThrow();
    });
  });
});
