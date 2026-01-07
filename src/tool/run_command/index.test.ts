import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { TOOLS, workingDir, setWorkingDir } from '../../global.js';

import './index.js';

describe('RunCommandTool', () => {
  let tempDir: string;
  let originalWorkingDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'run-cmd-test-'));
    originalWorkingDir = workingDir;
    setWorkingDir(tempDir);
  });

  afterEach(async () => {
    setWorkingDir(originalWorkingDir);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const tool = () => TOOLS['run_command'];

  describe('properties', () => {
    it('should have correct name', () => {
      expect(tool().name).toBe('run_command');
    });

    it('should have correct parameters schema', () => {
      expect(tool().parameters).toEqual({
        command: { type: 'string', description: 'Command to execute' },
      });
      expect(tool().required).toEqual(['command']);
    });
  });

  describe('run', () => {
    it('should execute simple echo command', async () => {
      const result = await tool().run({ command: 'echo "Hello World"' });

      expect(result.result).toBe('Hello World');
    });

    it('should return stdout from command', async () => {
      const result = await tool().run({ command: 'echo "line1" && echo "line2"' });

      expect(result.result).toContain('line1');
      expect(result.result).toContain('line2');
    });

    it('should run command in working directory', async () => {
      await fs.writeFile(path.join(tempDir, 'marker.txt'), 'marker content');

      const result = await tool().run({ command: 'ls' });

      expect(result.result).toContain('marker.txt');
    });

    it('should include stderr in output', async () => {
      const result = await tool().run({
        command: 'echo "stdout message" && echo "stderr message" >&2',
      });

      expect(result.result).toContain('stdout message');
      expect(result.result).toContain('[stderr]');
      expect(result.result).toContain('stderr message');
    });

    it('should return error for failing command', async () => {
      const result = await tool().run({ command: 'exit 1' });

      expect(result.result).toContain('Command execution failed');
      expect(result.isError).toBe(true);
    });

    it('should return error for non-existent command', async () => {
      const result = await tool().run({ command: 'nonexistentcommand12345' });

      expect(result.result).toContain('Command execution failed');
      expect(result.isError).toBe(true);
    });

    it('should return message for command with no output', async () => {
      const result = await tool().run({ command: 'true' });

      expect(result.result).toBe('Command executed successfully (no output)');
    });

    it('should handle command with special characters in output', async () => {
      const result = await tool().run({ command: 'echo "Special chars: $HOME @#%"' });

      expect(result.result).toContain('Special chars');
    });

    it('should handle piped commands', async () => {
      const result = await tool().run({ command: 'echo "hello world" | tr "a-z" "A-Z"' });

      expect(result.result).toBe('HELLO WORLD');
    });

    it('should handle pwd command in temp directory', async () => {
      const result = await tool().run({ command: 'pwd' });

      expect(result.result).toContain(tempDir);
    });

    it('should wrap result with toolName', async () => {
      const result = await tool().run({ command: 'echo "test"' });

      expect(result.toolName).toBe('run_command');
      expect(result.result.trim()).toBe('test');
    });

    it('should handle error result', async () => {
      const result = await tool().run({ command: 'exit 1' });

      expect(result.toolName).toBe('run_command');
      expect(result.result).toContain('Command execution failed');
      expect(result.isError).toBe(true);
    });
  });
});
