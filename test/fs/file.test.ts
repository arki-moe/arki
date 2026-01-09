import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { fileExists, readJsonFile, writeJsonFile, readFile, writeFile } from '../../src/fs/file.js';

describe('file', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-file-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'content');

      expect(await fileExists(filePath)).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const filePath = path.join(tempDir, 'nonexistent.txt');

      expect(await fileExists(filePath)).toBe(false);
    });

    it('should return false for directory', async () => {
      const dirPath = path.join(tempDir, 'subdir');
      await fs.mkdir(dirPath);

      expect(await fileExists(dirPath)).toBe(false);
    });
  });

  describe('readFile', () => {
    it('should read existing file content', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello, World!');

      const content = await readFile(filePath);

      expect(content).toBe('Hello, World!');
    });

    it('should return null for non-existent file', async () => {
      const filePath = path.join(tempDir, 'nonexistent.txt');

      const content = await readFile(filePath);

      expect(content).toBeNull();
    });

    it('should read empty file', async () => {
      const filePath = path.join(tempDir, 'empty.txt');
      await fs.writeFile(filePath, '');

      const content = await readFile(filePath);

      expect(content).toBe('');
    });

    it('should read multiline content', async () => {
      const filePath = path.join(tempDir, 'multiline.txt');
      await fs.writeFile(filePath, 'Line 1\nLine 2\nLine 3');

      const content = await readFile(filePath);

      expect(content).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should read UTF-8 content', async () => {
      const filePath = path.join(tempDir, 'unicode.txt');
      await fs.writeFile(filePath, 'Hello 🌍 World');

      const content = await readFile(filePath);

      expect(content).toBe('Hello 🌍 World');
    });
  });

  describe('writeFile', () => {
    it('should write content to file', async () => {
      const filePath = path.join(tempDir, 'output.txt');

      await writeFile(filePath, 'Test content');

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('Test content');
    });

    it('should overwrite existing file', async () => {
      const filePath = path.join(tempDir, 'overwrite.txt');
      await fs.writeFile(filePath, 'Original');

      await writeFile(filePath, 'Updated');

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('Updated');
    });

    it('should write empty content', async () => {
      const filePath = path.join(tempDir, 'empty.txt');

      await writeFile(filePath, '');

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('');
    });
  });

  describe('readJsonFile', () => {
    it('should read valid JSON file', async () => {
      const filePath = path.join(tempDir, 'data.json');
      await fs.writeFile(filePath, '{"name": "test", "value": 123}');

      const data = await readJsonFile<{ name: string; value: number }>(filePath);

      expect(data).toEqual({ name: 'test', value: 123 });
    });

    it('should return null for non-existent file', async () => {
      const filePath = path.join(tempDir, 'nonexistent.json');

      const data = await readJsonFile(filePath);

      expect(data).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      const filePath = path.join(tempDir, 'invalid.json');
      await fs.writeFile(filePath, 'not valid json');

      const data = await readJsonFile(filePath);

      expect(data).toBeNull();
    });

    it('should read array JSON', async () => {
      const filePath = path.join(tempDir, 'array.json');
      await fs.writeFile(filePath, '[1, 2, 3]');

      const data = await readJsonFile<number[]>(filePath);

      expect(data).toEqual([1, 2, 3]);
    });

    it('should read nested JSON', async () => {
      const filePath = path.join(tempDir, 'nested.json');
      await fs.writeFile(filePath, '{"outer": {"inner": "value"}}');

      const data = await readJsonFile<{ outer: { inner: string } }>(filePath);

      expect(data).toEqual({ outer: { inner: 'value' } });
    });
  });

  describe('writeJsonFile', () => {
    it('should write JSON with pretty formatting', async () => {
      const filePath = path.join(tempDir, 'output.json');
      const data = { name: 'test', value: 123 };

      await writeJsonFile(filePath, data);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('{\n  "name": "test",\n  "value": 123\n}');
    });

    it('should write array JSON', async () => {
      const filePath = path.join(tempDir, 'array.json');

      await writeJsonFile(filePath, [1, 2, 3]);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('[\n  1,\n  2,\n  3\n]');
    });

    it('should overwrite existing JSON file', async () => {
      const filePath = path.join(tempDir, 'overwrite.json');
      await fs.writeFile(filePath, '{"old": "data"}');

      await writeJsonFile(filePath, { new: 'data' });

      const data = await readJsonFile<{ new: string }>(filePath);
      expect(data).toEqual({ new: 'data' });
    });

    it('should handle null and undefined values', async () => {
      const filePath = path.join(tempDir, 'nullable.json');

      await writeJsonFile(filePath, { a: null, b: undefined });

      const content = await fs.readFile(filePath, 'utf-8');
      // undefined is omitted in JSON
      expect(content).toBe('{\n  "a": null\n}');
    });
  });
});
