// Config module - templates only
// All config logic has been moved to src/init/

// Re-export types and functions from init module for backward compatibility
export {
  getConfig,
  getApiKey,
  getAgentConfig,
  saveConfig,
  type GlobalConfig,
  type AgentType,
  type AgentModelConfig,
  type ReasoningEffort,
} from '../init/index.js';
