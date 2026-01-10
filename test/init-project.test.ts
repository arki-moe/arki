import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { initProject } from '../src/init/project.js';
import { setWorkingDir, workingDir, PATHS } from '../src/fs/paths.js';

describe('initProject', () => {
  let tempDir: string;
  let originalWorkingDir: string;

  beforeEach(async () => {
    originalWorkingDir = workingDir;
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'arki-init-'));
    setWorkingDir(tempDir);
  });

  afterEach(async () => {
    setWorkingDir(originalWorkingDir);
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('initializes project config without prompting when forced', async () => {
    await initProject(true);

    await expect(fs.stat(PATHS.projectConfig)).resolves.toBeDefined();
    await expect(fs.stat(path.join(PATHS.projectConfig, 'config.json'))).resolves.toBeDefined();
  });
});
