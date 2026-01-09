import os from 'node:os';
import { Tool } from './tool/Tool.js';
import { Procedure } from './procedure/Procedure.js';
import { config } from './config/index.js';
import { Adapter } from './adapter/Adapter.js';
import { OpenAIAdapter } from './adapter/openai.js';

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

/** Global tool registry */
export const TOOLS: Record<string, Tool> = {};

/** Global procedure registry */
export const PROCEDURES: Record<string, Procedure> = {};

/** Global Adapter instance */
export let adapter: Adapter | null = null;

/** Initialize global Adapter */
function initAdapter(): void {
  if (adapter) {
    return;
  }

  const mainAgentConfig = config.getAgentConfig('main');
  adapter = new OpenAIAdapter({
    apiKey: config.getApiKey('openai') || '',
    model: mainAgentConfig.model,
    flex: mainAgentConfig.flex,
    tools: Object.values(TOOLS),
  });
}

/** Initialize global state */
export async function init(cwd?: string): Promise<void> {
  workingDir = cwd || process.cwd();

  await config.load();

  initAdapter();
}

export { config } from './config/index.js';
