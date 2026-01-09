import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { copyDir, dirExists, mkdir } from '../../src/fs/dir.js';

describe('dir', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-dir-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('dirExists', () => {
    it('should return true for existing directory', async () => {
      const dirPath = path.join(tempDir, 'subdir');
      await fs.mkdir(dirPath);

      expect(await dirExists(dirPath)).toBe(true);
    });

    it('should return false for non-existent directory', async () => {
      const dirPath = path.join(tempDir, 'nonexistent');

      expect(await dirExists(dirPath)).toBe(false);
    });

    it('should return false for file', async () => {
      const filePath = path.join(tempDir, 'file.txt');
      await fs.writeFile(filePath, 'content');

      expect(await dirExists(filePath)).toBe(false);
    });
  });

  describe('mkdir', () => {
    it('should create directory', async () => {
      const dirPath = path.join(tempDir, 'newdir');

      await mkdir(dirPath);

      expect(await dirExists(dirPath)).toBe(true);
    });

    it('should create nested directories', async () => {
      const dirPath = path.join(tempDir, 'level1', 'level2', 'level3');

      await mkdir(dirPath);

      expect(await dirExists(dirPath)).toBe(true);
    });

    it('should not throw if directory already exists', async () => {
      const dirPath = path.join(tempDir, 'existing');
      await fs.mkdir(dirPath);

      await expect(mkdir(dirPath)).resolves.not.toThrow();
    });
  });

  describe('copyDir', () => {
    it('should copy directory with files', async () => {
      const srcDir = path.join(tempDir, 'src');
      const destDir = path.join(tempDir, 'dest');

      await fs.mkdir(srcDir);
      await fs.writeFile(path.join(srcDir, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(srcDir, 'file2.txt'), 'content2');

      await copyDir(srcDir, destDir);

      expect(await dirExists(destDir)).toBe(true);
      const content1 = await fs.readFile(path.join(destDir, 'file1.txt'), 'utf-8');
      const content2 = await fs.readFile(path.join(destDir, 'file2.txt'), 'utf-8');
      expect(content1).toBe('content1');
      expect(content2).toBe('content2');
    });

    it('should copy nested directories', async () => {
      const srcDir = path.join(tempDir, 'src');
      const destDir = path.join(tempDir, 'dest');

      await fs.mkdir(path.join(srcDir, 'subdir'), { recursive: true });
      await fs.writeFile(path.join(srcDir, 'root.txt'), 'root');
      await fs.writeFile(path.join(srcDir, 'subdir', 'nested.txt'), 'nested');

      await copyDir(srcDir, destDir);

      expect(await dirExists(path.join(destDir, 'subdir'))).toBe(true);
      const rootContent = await fs.readFile(path.join(destDir, 'root.txt'), 'utf-8');
      const nestedContent = await fs.readFile(path.join(destDir, 'subdir', 'nested.txt'), 'utf-8');
      expect(rootContent).toBe('root');
      expect(nestedContent).toBe('nested');
    });

    it('should copy empty directory', async () => {
      const srcDir = path.join(tempDir, 'empty-src');
      const destDir = path.join(tempDir, 'empty-dest');

      await fs.mkdir(srcDir);

      await copyDir(srcDir, destDir);

      expect(await dirExists(destDir)).toBe(true);
      const entries = await fs.readdir(destDir);
      expect(entries).toHaveLength(0);
    });

    it('should copy deeply nested structure', async () => {
      const srcDir = path.join(tempDir, 'deep-src');
      const destDir = path.join(tempDir, 'deep-dest');

      await fs.mkdir(path.join(srcDir, 'a', 'b', 'c'), { recursive: true });
      await fs.writeFile(path.join(srcDir, 'a', 'b', 'c', 'deep.txt'), 'deep content');

      await copyDir(srcDir, destDir);

      const content = await fs.readFile(path.join(destDir, 'a', 'b', 'c', 'deep.txt'), 'utf-8');
      expect(content).toBe('deep content');
    });

    it('should preserve file content exactly', async () => {
      const srcDir = path.join(tempDir, 'binary-src');
      const destDir = path.join(tempDir, 'binary-dest');

      await fs.mkdir(srcDir);
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0xff]);
      await fs.writeFile(path.join(srcDir, 'binary.bin'), binaryContent);

      await copyDir(srcDir, destDir);

      const copiedContent = await fs.readFile(path.join(destDir, 'binary.bin'));
      expect(copiedContent).toEqual(binaryContent);
    });

    it('should create destination directory if not exists', async () => {
      const srcDir = path.join(tempDir, 'src');
      const destDir = path.join(tempDir, 'nonexistent', 'nested', 'dest');

      await fs.mkdir(srcDir);
      await fs.writeFile(path.join(srcDir, 'file.txt'), 'content');

      await copyDir(srcDir, destDir);

      expect(await dirExists(destDir)).toBe(true);
    });
  });
});
