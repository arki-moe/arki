import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { TOOLS } from '../../../src/global.js';
import { workingDir, setWorkingDir } from '../../../src/fs/paths.js';
import { cachedFileSystem } from '../../../src/fs/CachedFileSystem.js';

import '../../../src/tool/flush_changes/index.js';
import '../../../src/tool/replace_text/index.js';

describe('FlushChangesTool', () => {
  let tempDir: string;
  let originalWorkingDir: string;
  const testContext = { agentId: 'test-agent' };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flush-changes-test-'));
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

  const tool = () => TOOLS['flush_changes'];
  const replaceTool = () => TOOLS['replace_text'];

  describe('properties', () => {
    it('should have correct name', () => {
      expect(tool().name).toBe('flush_changes');
    });

    it('should have no required parameters', () => {
      expect(tool().required).toEqual([]);
    });
  });

  describe('run', () => {
    it('should flush changes to disk', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');

      // Make a change
      await replaceTool().run(
        { path: 'test.txt', target: 'World', new_content: 'Universe' },
        testContext
      );

      // Flush changes
      const result = await tool().run({}, testContext);

      expect(result.isError).toBeUndefined();
      expect(result.result).toContain('successfully');

      // Verify file was updated
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('Hello Universe');
    });

    it('should succeed with no pending changes', async () => {
      const result = await tool().run({}, testContext);

      expect(result.isError).toBeUndefined();
      expect(result.result).toContain('successfully');
    });
  });
});
