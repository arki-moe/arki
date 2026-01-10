import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { TOOLS } from '../../../src/global.js';
import { workingDir, setWorkingDir } from '../../../src/fs/paths.js';

import '../../../src/tool/delete_directory/index.js';

describe('DeleteDirectoryTool', () => {
  let tempDir: string;
  let originalWorkingDir: string;
  const testContext = { agentId: 'test-agent' };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'delete-directory-test-'));
    originalWorkingDir = workingDir;
    setWorkingDir(tempDir);
  });

  afterEach(async () => {
    setWorkingDir(originalWorkingDir);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const tool = () => TOOLS['delete_directory'];

  describe('properties', () => {
    it('should have correct name', () => {
      expect(tool().name).toBe('delete_directory');
    });

    it('should have correct required parameters', () => {
      expect(tool().required).toEqual(['path']);
    });
  });

  describe('run', () => {
    it('should delete an empty directory', async () => {
      await fs.mkdir(path.join(tempDir, 'emptydir'));

      const result = await tool().run({ path: 'emptydir' }, testContext);

      expect(result.isError).toBeUndefined();
      expect(result.result).toContain('Directory deleted');

      await expect(fs.access(path.join(tempDir, 'emptydir'))).rejects.toThrow();
    });

    it('should return error for non-empty directory without recursive', async () => {
      await fs.mkdir(path.join(tempDir, 'nonempty'));
      await fs.writeFile(path.join(tempDir, 'nonempty', 'file.txt'), 'content');

      const result = await tool().run({ path: 'nonempty' }, testContext);

      expect(result.isError).toBe(true);
      expect(result.result).toContain('Failed to delete directory');
    });

    it('should delete non-empty directory with recursive option', async () => {
      await fs.mkdir(path.join(tempDir, 'nonempty'));
      await fs.writeFile(path.join(tempDir, 'nonempty', 'file.txt'), 'content');

      const result = await tool().run(
        { path: 'nonempty', recursive: true },
        testContext
      );

      expect(result.isError).toBeUndefined();
      await expect(fs.access(path.join(tempDir, 'nonempty'))).rejects.toThrow();
    });

    it('should return error for non-existent directory', async () => {
      const result = await tool().run({ path: 'nonexistent' }, testContext);

      expect(result.isError).toBe(true);
      expect(result.result).toContain('Failed to delete directory');
    });

    it('should return error when trying to delete a file', async () => {
      await fs.writeFile(path.join(tempDir, 'file.txt'), 'content');

      const result = await tool().run({ path: 'file.txt' }, testContext);

      expect(result.isError).toBe(true);
      expect(result.result).toContain('is not a directory');
      expect(result.result).toContain('delete_file');
    });

    it('should delete nested directories with recursive', async () => {
      await fs.mkdir(path.join(tempDir, 'parent/child/grandchild'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'parent/child/file.txt'), 'content');

      const result = await tool().run(
        { path: 'parent', recursive: true },
        testContext
      );

      expect(result.isError).toBeUndefined();
      await expect(fs.access(path.join(tempDir, 'parent'))).rejects.toThrow();
    });
  });
});
