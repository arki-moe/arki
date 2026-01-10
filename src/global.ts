// Re-export from fs module
export { OS, PATHS, workingDir, setWorkingDir, type OS_TYPE } from './fs/paths.js';

// Re-export from init/global module
export { TOOLS, PROCEDURES, adapters, getAdapter, init } from './init/global.js';

// Re-export config utilities
export {
  getConfig,
  getApiKey,
  getAgentConfig,
  saveConfig,
  type GlobalConfig,
  type AgentType,
  type AgentModelConfig,
} from './init/loader.js';
