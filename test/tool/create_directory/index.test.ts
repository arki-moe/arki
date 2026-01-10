import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { TOOLS } from '../../../src/global.js';
import { workingDir, setWorkingDir } from '../../../src/fs/paths.js';

import '../../../src/tool/create_directory/index.js';

describe('CreateDirectoryTool', () => {
  let tempDir: string;
  let originalWorkingDir: string;
  const testContext = { agentId: 'test-agent' };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'create-directory-test-'));
    originalWorkingDir = workingDir;
    setWorkingDir(tempDir);
  });

  afterEach(async () => {
    setWorkingDir(originalWorkingDir);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const tool = () => TOOLS['create_directory'];

  describe('properties', () => {
    it('should have correct name', () => {
      expect(tool().name).toBe('create_directory');
    });

    it('should have correct required parameters', () => {
      expect(tool().required).toEqual(['path']);
    });
  });

  describe('run', () => {
    it('should create a directory', async () => {
      const result = await tool().run({ path: 'newdir' }, testContext);

      expect(result.isError).toBeUndefined();
      expect(result.result).toContain('Directory created');

      const stat = await fs.stat(path.join(tempDir, 'newdir'));
      expect(stat.isDirectory()).toBe(true);
    });

    it('should create nested directories with recursive option', async () => {
      const result = await tool().run(
        { path: 'parent/child/grandchild', recursive: true },
        testContext
      );

      expect(result.isError).toBeUndefined();

      const stat = await fs.stat(path.join(tempDir, 'parent/child/grandchild'));
      expect(stat.isDirectory()).toBe(true);
    });

    it('should return error for nested directories without recursive', async () => {
      const result = await tool().run(
        { path: 'parent/child' },
        testContext
      );

      expect(result.isError).toBe(true);
      expect(result.result).toContain('Failed to create directory');
    });

    it('should succeed if directory exists with recursive option', async () => {
      await fs.mkdir(path.join(tempDir, 'existing'));

      const result = await tool().run(
        { path: 'existing', recursive: true },
        testContext
      );

      expect(result.isError).toBeUndefined();
    });

    it('should return error if directory exists without recursive', async () => {
      await fs.mkdir(path.join(tempDir, 'existing'));

      const result = await tool().run({ path: 'existing' }, testContext);

      expect(result.isError).toBe(true);
      expect(result.result).toContain('Failed to create directory');
    });
  });
});
