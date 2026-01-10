import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { TOOLS } from '../../../src/global.js';
import { workingDir, setWorkingDir } from '../../../src/fs/paths.js';
import { cachedFileSystem } from '../../../src/fs/CachedFileSystem.js';

import '../../../src/tool/cached_read_file/index.js';
import '../../../src/tool/replace_text/index.js';

describe('CachedReadFileTool', () => {
  let tempDir: string;
  let originalWorkingDir: string;
  const testContext = { agentId: 'test-agent' };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cached-read-file-test-'));
    originalWorkingDir = workingDir;
    setWorkingDir(tempDir);
    cachedFileSystem.clearReadCache();
    cachedFileSystem.discardOperations('test-agent');
  });

  afterEach(async () => {
    setWorkingDir(originalWorkingDir);
    cachedFileSystem.discardOperations('test-agent');
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const tool = () => TOOLS['cached_read_file'];
  const replaceTool = () => TOOLS['replace_text'];

  describe('properties', () => {
    it('should have correct name', () => {
      expect(tool().name).toBe('cached_read_file');
    });

    it('should have correct required parameters', () => {
      expect(tool().required).toEqual(['path']);
    });
  });

  describe('run', () => {
    it('should read file content', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');

      const result = await tool().run({ path: 'test.txt' }, testContext);

      expect(result.isError).toBeUndefined();
      expect(result.result).toBe('Hello World');
    });

    it('should read file with pending changes applied', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');

      // Make a change (not flushed)
      await replaceTool().run(
        { path: 'test.txt', target: 'World', new_content: 'Universe' },
        testContext
      );

      // Read with changes applied
      const result = await tool().run({ path: 'test.txt' }, testContext);

      expect(result.isError).toBeUndefined();
      expect(result.result).toBe('Hello Universe');

      // Verify original file is unchanged
      const diskContent = await fs.readFile(filePath, 'utf-8');
      expect(diskContent).toBe('Hello World');
    });

    it('should return error for non-existent file', async () => {
      const result = await tool().run({ path: 'nonexistent.txt' }, testContext);

      expect(result.isError).toBe(true);
      expect(result.result).toContain('File not found');
    });
  });
});
