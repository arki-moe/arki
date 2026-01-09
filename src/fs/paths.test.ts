import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import { OS, PATHS, workingDir, setWorkingDir } from './paths.js';

describe('paths', () => {
  describe('OS', () => {
    it('should have a valid name', () => {
      expect(['windows', 'mac', 'linux', 'other']).toContain(OS.name);
    });

    it('should have a version string', () => {
      expect(typeof OS.version).toBe('string');
      expect(OS.version.length).toBeGreaterThan(0);
    });

    it('should match os.platform()', () => {
      const platform = os.platform();
      if (platform === 'win32') {
        expect(OS.name).toBe('windows');
      } else if (platform === 'darwin') {
        expect(OS.name).toBe('mac');
      } else if (platform === 'linux') {
        expect(OS.name).toBe('linux');
      }
    });

    it('should have version matching os.release()', () => {
      expect(OS.version).toBe(os.release());
    });
  });

  describe('workingDir', () => {
    let originalWorkingDir: string;

    beforeEach(() => {
      originalWorkingDir = workingDir;
    });

    afterEach(() => {
      setWorkingDir(originalWorkingDir);
    });

    it('should default to process.cwd()', () => {
      // Reset to default
      setWorkingDir(process.cwd());
      expect(workingDir).toBe(process.cwd());
    });

    it('should be changeable via setWorkingDir', () => {
      const newDir = '/tmp/test-dir';
      setWorkingDir(newDir);
      expect(workingDir).toBe(newDir);
    });
  });

  describe('PATHS', () => {
    let originalWorkingDir: string;

    beforeEach(() => {
      originalWorkingDir = workingDir;
    });

    afterEach(() => {
      setWorkingDir(originalWorkingDir);
    });

    describe('globalConfig', () => {
      it('should be a string path', () => {
        expect(typeof PATHS.globalConfig).toBe('string');
      });

      it('should contain arki in the path', () => {
        expect(PATHS.globalConfig).toContain('arki');
      });

      it('should be in correct location based on OS', () => {
        if (OS.name === 'windows') {
          // Windows: %APPDATA%\arki or similar
          expect(PATHS.globalConfig).toMatch(/arki$/);
        } else {
          // macOS/Linux: ~/.config/arki
          expect(PATHS.globalConfig).toBe(path.join(os.homedir(), '.config', 'arki'));
        }
      });
    });

    describe('projectConfig', () => {
      it('should be based on workingDir', () => {
        const testDir = '/test/project';
        setWorkingDir(testDir);
        expect(PATHS.projectConfig).toBe(path.join(testDir, '.arki'));
      });

      it('should update when workingDir changes', () => {
        setWorkingDir('/first/dir');
        expect(PATHS.projectConfig).toBe(path.join('/first/dir', '.arki'));

        setWorkingDir('/second/dir');
        expect(PATHS.projectConfig).toBe(path.join('/second/dir', '.arki'));
      });
    });

    describe('globalTemplate', () => {
      it('should be a string path', () => {
        expect(typeof PATHS.globalTemplate).toBe('string');
      });

      it('should end with config/arki', () => {
        expect(PATHS.globalTemplate).toMatch(/config[/\\]arki$/);
      });
    });

    describe('projectTemplate', () => {
      it('should be a string path', () => {
        expect(typeof PATHS.projectTemplate).toBe('string');
      });

      it('should end with config/.arki', () => {
        expect(PATHS.projectTemplate).toMatch(/config[/\\]\.arki$/);
      });
    });
  });
});
