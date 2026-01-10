import { Tool } from './tool/Tool.js';
import { Procedure } from './procedure/Procedure.js';
import { Adapter } from './adapter/Adapter.js';
import { Agent } from './agent/Agent.js';

/** Global tool registry */
export const TOOLS: Record<string, Tool> = {};

/** Global procedure registry */
export const PROCEDURES: Record<string, Procedure> = {};

/** Global adapter registry by platform */
export const ADAPTERS: Record<string, Adapter> = {};

/** Global agent registry by name */
export const AGENTS: Record<string, Agent> = {};
