import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { TOOLS } from '../../../src/global.js';
import { workingDir, setWorkingDir } from '../../../src/fs/paths.js';
import { cachedFileSystem } from '../../../src/fs/CachedFileSystem.js';

import '../../../src/tool/get_pending_changes/index.js';
import '../../../src/tool/insert_text/index.js';
import '../../../src/tool/replace_text/index.js';
import '../../../src/tool/delete_text/index.js';

describe('GetPendingChangesTool', () => {
  let tempDir: string;
  let originalWorkingDir: string;
  const testContext = { agentId: 'test-agent' };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'get-pending-changes-test-'));
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

  const tool = () => TOOLS['get_pending_changes'];
  const insertTool = () => TOOLS['insert_text'];
  const replaceTool = () => TOOLS['replace_text'];
  const deleteTool = () => TOOLS['delete_text'];

  describe('properties', () => {
    it('should have correct name', () => {
      expect(tool().name).toBe('get_pending_changes');
    });

    it('should have no required parameters', () => {
      expect(tool().required).toEqual([]);
    });
  });

  describe('run', () => {
    it('should return no pending changes when empty', async () => {
      const result = await tool().run({}, testContext);

      expect(result.isError).toBeUndefined();
      expect(result.result).toBe('No pending changes.');
    });

    it('should list insert operation', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');

      await insertTool().run(
        { path: 'test.txt', target: 'Hello', content: 'Beautiful ', position: 'after' },
        testContext
      );

      const result = await tool().run({}, testContext);

      expect(result.isError).toBeUndefined();
      expect(result.result).toContain('Pending changes (1)');
      expect(result.result).toContain('INSERT after');
    });

    it('should list replace operation', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');

      await replaceTool().run(
        { path: 'test.txt', target: 'World', new_content: 'Universe' },
        testContext
      );

      const result = await tool().run({}, testContext);

      expect(result.isError).toBeUndefined();
      expect(result.result).toContain('Pending changes (1)');
      expect(result.result).toContain('REPLACE');
    });

    it('should list delete operation', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello Beautiful World');

      await deleteTool().run(
        { path: 'test.txt', target: ' Beautiful' },
        testContext
      );

      const result = await tool().run({}, testContext);

      expect(result.isError).toBeUndefined();
      expect(result.result).toContain('Pending changes (1)');
      expect(result.result).toContain('DELETE');
    });

    it('should list multiple operations', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');

      await insertTool().run(
        { path: 'test.txt', target: 'Hello', content: 'Say ', position: 'before' },
        testContext
      );

      // After first insert, content is "Say Hello World"
      await replaceTool().run(
        { path: 'test.txt', target: 'World', new_content: 'Universe' },
        testContext
      );

      const result = await tool().run({}, testContext);

      expect(result.isError).toBeUndefined();
      expect(result.result).toContain('Pending changes (2)');
    });
  });
});
