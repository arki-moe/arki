import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { TOOLS } from '../../../src/global.js';
import { workingDir, setWorkingDir } from '../../../src/fs/paths.js';
import { cachedFileSystem } from '../../../src/fs/CachedFileSystem.js';

import '../../../src/tool/replace_text/index.js';

describe('ReplaceTextTool', () => {
  let tempDir: string;
  let originalWorkingDir: string;
  const testContext = { agentId: 'test-agent' };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'replace-text-test-'));
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

  const tool = () => TOOLS['replace_text'];

  describe('properties', () => {
    it('should have correct name', () => {
      expect(tool().name).toBe('replace_text');
    });

    it('should have correct required parameters', () => {
      expect(tool().required).toEqual(['path', 'target', 'new_content']);
    });
  });

  describe('run', () => {
    it('should replace target with new content', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');

      const result = await tool().run(
        { path: 'test.txt', target: 'World', new_content: 'Universe' },
        testContext
      );

      expect(result.isError).toBeUndefined();
      expect(result.result).toContain('Replaced target');
    });

    it('should return error for non-existent target', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');

      const result = await tool().run(
        { path: 'test.txt', target: 'NotFound', new_content: 'test' },
        testContext
      );

      expect(result.isError).toBe(true);
      expect(result.result).toContain('Target not found');
    });

    it('should return error for ambiguous target', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello Hello World');

      const result = await tool().run(
        { path: 'test.txt', target: 'Hello', new_content: 'Hi' },
        testContext
      );

      expect(result.isError).toBe(true);
      expect(result.result).toContain('Ambiguous target');
    });
  });
});
