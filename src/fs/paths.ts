import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** OS type definition */
export interface OS_TYPE {
  /** Operating system name: 'windows' | 'mac' | 'linux' | 'other' */
  name: 'windows' | 'mac' | 'linux' | 'other';
  /** Operating system version */
  version: string;
}

/** Get OS name from platform */
function getOSName(): OS_TYPE['name'] {
  const platform = os.platform();
  switch (platform) {
    case 'win32':
      return 'windows';
    case 'darwin':
      return 'mac';
    case 'linux':
      return 'linux';
    default:
      return 'other';
  }
}

/** Global OS information */
export const OS: OS_TYPE = {
  name: getOSName(),
  version: os.release(),
};

/** Working directory */
export let workingDir = process.cwd();

/** Set working directory (for testing) */
export function setWorkingDir(dir: string): void {
  workingDir = dir;
}

/** Get global config directory based on OS */
function getGlobalConfigDir(): string {
  if (OS.name === 'windows') {
    // Windows: %APPDATA%\arki or %USERPROFILE%\AppData\Roaming\arki
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
      'arki'
    );
  }
  // macOS/Linux: ~/.config/arki
  return path.join(os.homedir(), '.config', 'arki');
}

/** Get package directory path */
function getPackageDir(relativePath: string): string {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // Go up one level from fs/ to src/
  return path.join(__dirname, '..', relativePath);
}

/** Global paths configuration */
export const PATHS = {
  /** Global config directory (~/.config/arki or %APPDATA%\arki) */
  globalConfig: getGlobalConfigDir(),

  /** Project config directory (.arki/) - returns path based on current workingDir */
  get projectConfig(): string {
    return path.join(workingDir, '.arki');
  },

  /** Package's global config template directory */
  globalTemplate: getPackageDir('config/arki'),

  /** Package's project config template directory */
  projectTemplate: getPackageDir('config/.arki'),
};
