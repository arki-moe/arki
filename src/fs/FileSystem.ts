import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * FileSystem class provides unified file and directory operations
 */
class FileSystem {
  // ==================== File Operations ====================

  /**
   * Check if file exists (returns false for directories)
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(filePath);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Read file content as string
   * Returns null if file doesn't exist
   */
  async readFile(filePath: string): Promise<string | null> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  /**
   * Write string content to file
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Read JSON file safely
   * Returns null if file doesn't exist or is invalid JSON
   */
  async readJsonFile<T>(filePath: string): Promise<T | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  /**
   * Write JSON file with pretty formatting
   */
  async writeJsonFile(filePath: string, data: unknown): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  // ==================== Directory Operations ====================

  /**
   * Check if directory exists (returns false for files)
   */
  async dirExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Create directory recursively (no error if exists)
   */
  async mkdir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  /**
   * Copy directory recursively (creates dest if not exists)
   */
  async copyDir(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDir(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}

/** Global FileSystem instance for all file/directory operations */
export const fileSystem = new FileSystem();
