# Arki API Documentation

This documentation is for developers and LLMs, containing complete API reference and programming details for Arki.

## Project Structure

```
arki/
├── src/
│   ├── index.ts          # CLI entry + library exports
│   ├── global.ts         # Re-exports from fs and init modules
│   ├── log/
│   │   ├── index.ts      # Color definitions, XML tag conversion, and export entry
│   │   ├── debug.ts      # Debug mode and logging
│   │   └── log.ts        # General logging functions (supports XML color tags)
│   ├── event_bus/
│   │   ├── index.ts      # EventBus export entry
│   │   ├── Event.ts      # Event base class and concrete event classes
│   │   └── EventBus.ts   # EventBus singleton, subscribe/publish functions
│   ├── agent/
│   │   ├── index.ts      # Agent export entry
│   │   ├── Agent.ts      # Agent class implementation
│   │   ├── Msg.ts        # Message type definitions and constructors
│   │   └── Arki/
│   │       ├── index.ts  # Arki agent creation logic
│   │       ├── Arki.ts   # createArkiAgent implementation
│   │       └── system.md # Arki agent system prompt
│   ├── adapter/
│   │   ├── Adapter.ts    # LLM adapter base class
│   │   ├── index.ts      # Adapter export entry
│   │   └── openai.ts     # OpenAI adapter
│   ├── model/
│   │   ├── index.ts      # Type definitions and exports
│   │   └── models.ts     # Model configuration data (MODELS)
│   ├── init/
│   │   ├── index.ts      # Initialization entry and re-exports
│   │   ├── global.ts     # Global state (TOOLS, PROCEDURES, adapters registry) and init function
│   │   ├── project.ts    # Project config initialization (trust prompt, copy template)
│   │   └── loader.ts     # Config loading and merging
│   ├── fs/
│   │   ├── index.ts      # Re-exports from submodules
│   │   ├── paths.ts      # OS detection, PATHS object, workingDir
│   │   ├── file.ts       # File operations (read, write, exists)
│   │   └── dir.ts        # Directory operations (copy, exists, mkdir)
│   ├── config/
│   │   ├── arki/         # Global config template (copied to ~/.config/arki or %APPDATA%\arki)
│   │   │   └── config.json
│   │   └── .arki/        # Project config template (copied to project/.arki)
│   │       ├── config.json
│   │       └── state.json
│   ├── tool/
│   │   ├── Tool.ts       # Tool class definition
│   │   ├── index.ts      # Tool exports and registration
│   │   ├── read_file/
│   │   │   ├── index.ts  # read_file tool
│   │   │   └── manual.md # Tool documentation
│   │   ├── write_file/
│   │   ├── list_directory/
│   │   ├── run_command/
│   │   ├── read_tool_manual/
│   │   └── read_procedure/
│   ├── procedure/
│   │   ├── Procedure.ts  # Procedure class definition
│   │   ├── index.ts      # Procedure exports and registration
│   │   └── understand_project/
│   │       ├── index.ts      # understand_project procedure
│   │       └── procedure.md  # Procedure steps
│   └── md.d.ts           # .md file type declaration
├── bin/
│   └── arki.js           # CLI entry script
├── tsup.config.ts        # tsup build configuration
└── package.json
```

## Core Types

### Model Interface

```typescript
type ModelProvider = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'custom';

interface Model {
  readonly name: string;
  readonly provider: ModelProvider;
  readonly capabilities: ModelCapabilities;
}

interface ModelCapabilities {
  streaming: boolean;
  vision: boolean;
  contextWindow: number;
}

// Usage: MODELS[modelId]
import { MODELS } from 'arki';
const model = MODELS['gpt-5.1'];
```

### Msg Types

```typescript
// Message type enum
enum MsgType {
  System = 'system',
  User = 'user',
  AI = 'ai',
  ToolCall = 'tool_call',
  ToolResult = 'tool_result',
  AsyncToolResult = 'async_tool_result',
}

// Base message class
abstract class Msg {
  abstract readonly type: MsgType;
  readonly timestamp: number;
  readonly content: string;
}

// Message classes (union type)
type Msg = SystemMsg | UserMsg | AIMsg | ToolCallMsg | ToolResultMsg | AsyncToolResultMsg;

class SystemMsg extends Msg {
  readonly type = MsgType.System;
  constructor(content: string);
}

class UserMsg extends Msg {
  readonly type = MsgType.User;
  constructor(content: string);
}

class AIMsg extends Msg {
  readonly type = MsgType.AI;
  constructor(content: string);
}

// Single tool call
interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  asyncCallId?: string;  // Async tool call tracking ID (only for async tools)
}

class ToolCallMsg extends Msg {
  readonly type = MsgType.ToolCall;
  readonly toolCalls: ToolCall[];
  constructor(content: string, toolCalls: ToolCall[]);
}

// Single tool result (returned by Tool.run())
interface ToolResult {
  toolName: string;
  result: string;
  isError?: boolean;
  asyncCallId?: string;  // If present, this is a placeholder for async tool
}

// Tool result message (contains multiple results for multi-platform compatibility)
class ToolResultMsg extends Msg {
  readonly type = MsgType.ToolResult;
  readonly toolResults: ToolResult[];
  constructor(toolResults: ToolResult[]);

  // Helper: create from single result
  static single(toolName: string, result: string, isError?: boolean): ToolResultMsg;
}

// Async tool result message (independent, does not depend on ToolResult)
class AsyncToolResultMsg extends Msg {
  readonly type = MsgType.AsyncToolResult;
  readonly asyncCallId: string;   // Tracking ID, links to original async tool call
  readonly toolName: string;
  readonly result: string;
  readonly isError?: boolean;

  constructor(asyncCallId: string, toolName: string, result: string, isError?: boolean);
}
```

Create messages using constructors:

```typescript
import { SystemMsg, UserMsg, AIMsg, ToolCallMsg, ToolCall, ToolResultMsg, ToolResult } from 'arki';

const system = new SystemMsg('You are an assistant');
const user = new UserMsg('Hello');
const ai = new AIMsg('Hello! How can I help you?');

// Tool call message
const calls: ToolCall[] = [{ name: 'read_file', arguments: { path: 'test.txt' } }];
const toolCall = new ToolCallMsg('', calls);

// Single tool result (convenience method)
const toolResult = ToolResultMsg.single('read_file', 'File content');

// Multiple tool results (for batch tool calls)
const results: ToolResult[] = [
  { toolName: 'read_file', result: 'File 1 content' },
  { toolName: 'read_file', result: 'File 2 content' },
];
const toolResults = new ToolResultMsg(results);
```

### Adapter Types

```typescript
// Reasoning effort type
type ReasoningEffort = 'low' | 'medium' | 'high';

// Platform-specific options
interface AdapterOptions {
  [key: string]: unknown;
}

// Adapter response result
interface AdapterResponse {
  message: Msg;
  hasToolCalls: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cachedTokens?: number;
  };
}

// Adapter base class (only contains platform authentication)
abstract class Adapter {
  protected apiKey: string;

  constructor(apiKey: string);

  abstract chat(
    model: string,
    messages: Msg[],
    tools: Tool[],
    options: AdapterOptions,
    onChunk?: (chunk: string) => void
  ): Promise<AdapterResponse>;
}

// OpenAI-specific options
interface OpenAIOptions extends AdapterOptions {
  flex?: boolean;
  reasoningEffort?: ReasoningEffort;
  maxCompletionTokens?: number;
}

// OpenAI adapter
class OpenAIAdapter extends Adapter {
  constructor(apiKey: string);

  async chat(
    model: string,
    messages: Msg[],
    tools: Tool[],
    options: OpenAIOptions,
    onChunk?: (chunk: string) => void
  ): Promise<AdapterResponse>;
}
```

### Agent Types

```typescript
interface AgentResponse {
  response: string;
  toolCalls: Array<{
    name: string;
    arguments: Record<string, unknown>;
    result: string;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cachedTokens?: number;
  };
}

interface AgentConfig {
  name: string;                 // Agent name (used for EventBus events)
  adapter: Adapter;
  model: string;                // Model ID (provider derived from MODELS)
  tools: Tool[];                // Tools available to agent
  platformOptions?: AdapterOptions;  // Platform-specific options (flex, reasoningEffort, etc.)
  messages: Msg[];
  maxCompletionTokens?: number; // Maximum completion tokens for LLM response
}

class Agent {
  readonly name: string;

  constructor(config: AgentConfig);

  static renderTemplate(template: string, variables: Record<string, string | number | boolean>): string;
  async run(userInput: string): Promise<AgentResponse>;
  reset(): this;
}
```

**Note**: Agent no longer uses callback hooks. Use the EventBus system to subscribe to agent events instead. See [EventBus System](#eventbus-system) section.

Usage example:

```typescript
import { Agent, SystemMsg } from 'arki';
import { subscribe, StreamEvent, ToolResultEvent } from 'arki';
import systemTemplate from './system.md';

// Use Agent.renderTemplate to render template
const systemInstruction = Agent.renderTemplate(systemTemplate, {
  working_dir: process.cwd(),
  current_time: new Date().toLocaleString(),
});

// Method 1: Use global adapters registry (recommended, initialized via init())
import { getAdapter, getAgentConfig, init, TOOLS, MODELS } from 'arki';

await init();
const config = getAgentConfig('arki');
const model = MODELS[config.model];
const adapter = getAdapter(model.provider);

const agent = new Agent({
  name: 'MyAgent',
  adapter,
  model: config.model,
  tools: Object.values(TOOLS),
  platformOptions: { flex: config.flex, reasoningEffort: config.reasoningEffort },
  messages: [new SystemMsg(systemInstruction)],
});

// Subscribe to events using EventBus
subscribe(StreamEvent, agent.name, (event) => {
  process.stdout.write(event.chunk);
});

subscribe(ToolResultEvent, agent.name, (event) => {
  console.log(`Tool ${event.toolName} completed in ${event.result.length} chars`);
});

// Method 2: Manually create adapter
import { OpenAIAdapter, TOOLS } from 'arki';

const openaiAdapter = new OpenAIAdapter(process.env.OPENAI_API_KEY || '');

const agent = new Agent({
  name: 'MyAgent',
  adapter: openaiAdapter,
  model: 'gpt-5.1',
  tools: Object.values(TOOLS),
  platformOptions: { flex: false },
  messages: [new SystemMsg(systemInstruction)],
});

// Run
const result = await agent.run('Help me check what files are in the current directory');
console.log(result.response);
console.log(`Used ${result.toolCalls.length} tool calls`);

agent.reset();  // Clear conversation history (restore to initial messages)
```

#### Combining Multiple System Messages

The `messages` array supports multiple system messages:

```typescript
import { Agent, SystemMsg } from 'arki';
import systemTemplate from './system.md';
import codingStyleTemplate from './coding-style.md';

const systemInstruction1 = Agent.renderTemplate(systemTemplate, { working_dir: cwd });
const systemInstruction2 = Agent.renderTemplate(codingStyleTemplate, {});

const agent = new Agent({
  adapter,
  messages: [
    new SystemMsg(systemInstruction1),
    new SystemMsg(systemInstruction2),
  ],
});
```

## EventBus System

The EventBus provides a publish-subscribe pattern for Agent lifecycle events. This decouples the Agent from output handling, allowing different frontends (CLI, Web, etc.) to handle events differently.

### Event Classes

All events inherit from the base `Event` class:

```typescript
abstract class Event {
  readonly agentName: string;
  readonly timestamp: number;
}
```

Available event classes:

```typescript
// Stream output event
class StreamEvent extends Event {
  readonly chunk: string;
}

// Tool call received event
class ToolCallReceivedEvent extends Event {
  readonly toolCalls: ToolCall[];
}

// Before tool run event
class BeforeToolRunEvent extends Event {
  readonly toolName: string;
  readonly args: Record<string, unknown>;
}

// Tool result event
class ToolResultEvent extends Event {
  readonly toolName: string;
  readonly args: Record<string, unknown>;
  readonly result: string;
  readonly isError?: boolean;
}

// Async tool result event
class AsyncToolResultEvent extends Event {
  readonly asyncCallId: string;
  readonly toolName: string;
  readonly args: Record<string, unknown>;
  readonly result: string;
  readonly isError?: boolean;
}

// Agent run start event
class RunStartEvent extends Event {
  readonly userInput: string;
}

// Agent run end event
class RunEndEvent extends Event {
  readonly response: string;
  readonly toolCalls: Array<{ name: string; arguments: Record<string, unknown>; result: string }>;
  readonly usage?: { promptTokens: number; completionTokens: number; totalTokens: number; cachedTokens?: number };
}
```

### Subscribe and Publish

```typescript
import { subscribe, publish, StreamEvent, ToolResultEvent } from 'arki';

// Subscribe to events for a specific agent
const unsubscribe = subscribe(StreamEvent, 'MyAgent', (event) => {
  console.log('Stream chunk:', event.chunk);
});

// Subscribe to events for all agents (wildcard)
subscribe(ToolResultEvent, '*', (event) => {
  console.log(`[${event.agentName}] Tool ${event.toolName} completed`);
});

// Unsubscribe when done
unsubscribe();

// Publish events (typically done by Agent internally)
publish(new StreamEvent('MyAgent', 'Hello'));
```

### CLI Output Setup

The CLI entry (`src/index.ts`) sets up event subscriptions for output:

```typescript
import { subscribe, StreamEvent, BeforeToolRunEvent, ToolResultEvent, createColorConverter } from 'arki';

function setupAgentOutput(agentName: string): void {
  const convertColor = createColorConverter();

  subscribe(StreamEvent, agentName, (event) => {
    process.stdout.write(convertColor(event.chunk));
  });

  subscribe(ToolResultEvent, agentName, (event) => {
    log(`<cyan>[${agentName}]</cyan><green>[${event.toolName}]</green> <dim>completed</dim>`);
  });
}

// Setup output for the main agent
const agent = createArkiAgent();
setupAgentOutput(agent.name);
```

This separation allows:
- Agent code to remain pure (no CLI dependencies)
- Different frontends to subscribe and render events differently
- Easy testing by mocking event handlers

## Template Rendering

Use the `Agent.renderTemplate()` static method to render template strings:

```typescript
import { Agent } from 'arki';

const template = 'You are an assistant, working directory is {{working_dir}}.';
const rendered = Agent.renderTemplate(template, {
  working_dir: '/path/to/project',
  current_time: '2024-01-01',
});
```

`.md` files are inlined as strings at build time, can be imported directly:

```typescript
import systemTemplate from './system.md';

const systemInstruction = Agent.renderTemplate(systemTemplate, {
  working_dir: process.cwd(),
  current_time: new Date().toLocaleString(),
});
```

### Template Syntax

Create `.md` files, use `{{variable_name}}` syntax to define variable content:

```markdown
You are a programming assistant, working directory is {{working_dir}}.

Current time: {{current_time}}
```

`renderTemplate` replaces all `{{variable_name}}` with corresponding values. Undefined variables remain unchanged and output a warning.

## Tool System

Tools are defined using the `Tool` class and managed through the global `TOOLS` registry. Each tool is placed in its own directory under `src/tool/`:

```typescript
// src/tool/my_tool/index.ts
import { Tool } from '../Tool.js';
import { TOOLS, workingDir } from '../../global.js';
import manualContent from './manual.md';  // Inlined as string at build time

// Register tool to global TOOLS
TOOLS['my_tool'] = new Tool({
  name: 'my_tool',              // Tool name
  parameters: {                 // Parameter definitions (properties only)
    param1: { type: 'string', description: 'Parameter 1 description' },
    param2: { type: 'number', description: 'Parameter 2 description' },
  },
  required: ['param1'],         // Required parameters
  manualContent,                // manual.md content
  execute: async (args) => {    // Execution function
    const param1 = args.param1 as string;
    // Can use global workingDir when needed
    return `Execution result: ${param1}`;
  },
});
```

### Tool Class

```typescript
// Symbol indicating tool has detailed manual
const HAS_MANUAL = '📘';

class Tool {
  readonly name: string;
  readonly description: string;      // Parsed from first line of manual.md (with 📘 prefix if has manual)
  readonly parameters: Record<string, unknown>;
  readonly required: string[];
  readonly manual: string;           // Content of manual.md except first line
  readonly isAsync: boolean;         // Whether this tool is async (non-blocking)

  constructor(config: {
    name: string;
    parameters: Record<string, unknown>;
    required: string[];
    manualContent: string;
    execute: (args: Record<string, unknown>) => Promise<string | { content: string; isError?: boolean }>;
    isAsync?: boolean;               // Default: false
  });

  static parseManual(content: string): { description: string; manual: string };
  async run(args: Record<string, unknown>): Promise<ToolResult>;  // Returns single ToolResult
}
```

**Async Tools**: When `isAsync` is true, the tool is executed in the background. The Agent immediately returns a placeholder result and continues. When the async tool completes, an `AsyncToolResultMsg` is added to the message history and an `AsyncToolResultEvent` is published.

### manual.md Format

Each tool directory needs a `manual.md` file (automatically inlined at build time):

**Simple tool (no manual content)**:
```markdown
read_file: Read the content of a specified file
```
Result: `description = "Read the content of a specified file"`, `manual = ""`

**Complex tool (with manual content)**:
```markdown
run_command: Execute shell command in the working directory

## Notes

- Timeout is 30 seconds
- Returns both stdout and stderr content
```
Result: `description = "📘Execute shell command in the working directory"`, `manual = "## Notes\n\n- Timeout is 30 seconds\n- Returns both stdout and stderr content"`

**First line format**: `tool_name: description`
- Before colon is the tool name
- After colon is the brief description, parsed as `description` by `Tool.parseManual()`
- If there is content below the first line, `📘` symbol is prepended to description, indicating the tool has detailed manual
- Content below the first line is detailed instructions, parsed as `manual`, can be viewed by Agent via `read_tool_manual` tool

### Global State

The project uses global state management, provided through `global.ts`:

#### PATHS Object

The global `PATHS` object provides cross-platform path management:

```typescript
import { PATHS } from 'arki';

// PATHS type definition
interface PATHS {
  globalConfig: string;      // Global config directory (~/.config/arki or %APPDATA%\arki)
  projectConfig: string;     // Project config directory (.arki/) - getter based on workingDir
  globalTemplate: string;    // Package's global config template directory
  projectTemplate: string;   // Package's project config template directory
}

// Usage
console.log(PATHS.globalConfig);     // e.g., '/Users/name/.config/arki' or 'C:\Users\name\AppData\Roaming\arki'
console.log(PATHS.projectConfig);    // e.g., '/path/to/project/.arki'
```

Path locations by OS:
- **macOS/Linux**: `~/.config/arki/`
- **Windows**: `%APPDATA%\arki\` (falls back to `%USERPROFILE%\AppData\Roaming\arki\`)

#### OS Information

The global `OS` object provides information about the current operating system:

```typescript
import { OS } from 'arki';

// OS type definition
interface OS_TYPE {
  name: 'windows' | 'mac' | 'linux' | 'other';
  version: string;
}

// Usage
console.log(OS.name);     // 'mac', 'windows', 'linux', or 'other'
console.log(OS.version);  // e.g., '24.5.0'
```

#### Global Tool Registry

Tools are registered and accessed through the global `TOOLS` object:

```typescript
import { TOOLS } from 'arki';

// Get tool
const tool = TOOLS['read_file'];

// Execute tool
const result = await tool.run({ path: 'test.txt' });

// Get all tools
const allTools = Object.values(TOOLS);
```

#### Global Adapters Registry

Adapters are stored in a global registry by platform name, automatically initialized at `init()`:

```typescript
import { adapters, getAdapter, init } from 'arki';

// Initialize global state (including adapters based on available API keys)
await init();

// Get adapter by platform name
const openaiAdapter = getAdapter('openai');

// Or access the registry directly
console.log('Available adapters:', Object.keys(adapters));
```

Adapters are only initialized for platforms that have API keys configured in environment variables. The `getAdapter()` function throws if the requested platform's adapter is not available.

#### Initialization Flow

The `init()` function performs three initialization steps:

1. **Global Config Initialization** (`initGlobal`)
   - Checks if global config directory exists
   - If not, copies template from package to user's config directory

2. **Project Config Initialization** (`initProject`)
   - Checks if project `.arki/` directory exists
   - If not, prompts user to trust the project
   - If trusted, copies template to project directory

3. **Config Loading** (`loadConfigs`)
   - Loads global config from `PATHS.globalConfig/config.json`
   - Loads project config from `PATHS.projectConfig/config.json` (if exists)
   - Merges configs (project overrides global)

API keys are read directly from environment variables via `getApiKey()`.

```typescript
import { init } from 'arki';

// Initialize with optional working directory
await init('/path/to/project');

// After init, configs are loaded and adapter is ready
import { getConfig, getApiKey, getAgentConfig } from 'arki';

const config = getConfig();
const apiKey = getApiKey('openai');
const arkiConfig = getAgentConfig('arki');
```

Tool definitions are passed to the API directly (name, description, parameters). Tools with detailed manual content will have the `📘` symbol prefix in their description.

The system prompt includes a rule about the `📘` symbol:
```
If a tool has the 📘 symbol in its description, you MUST call `read_tool_manual` before using it.
Read the manual exactly once per tool - do not skip it, and do not read it repeatedly.
```

### Built-in Tools

- `read_file` - Read file content
- `write_file` - Write to file
- `list_directory` - List directory contents
- `run_command` - Execute shell commands
- `read_tool_manual` - View detailed usage instructions for tools
- `read_procedure` - View step-by-step procedure for specific workflows

## Procedure System

Procedures are step-by-step guides for specific workflows. Unlike tools which execute actions, procedures provide structured guidance for the Agent to follow. Each procedure is placed in its own directory under `src/procedure/`:

```typescript
// src/procedure/my_procedure/index.ts
import { Procedure } from '../Procedure.js';
import { PROCEDURES } from '../../global.js';
import procedureContent from './procedure.md';

// Register procedure to global PROCEDURES
PROCEDURES['my_procedure'] = new Procedure({
  name: 'my_procedure',
  procedureContent,
});
```

### Procedure Class

```typescript
class Procedure {
  readonly name: string;
  readonly description: string;      // Parsed from first line of procedure.md
  readonly manual: string;           // Content of procedure.md except first line (the steps)

  constructor(config: {
    name: string;
    procedureContent: string;
  });

  static parseManual(content: string): { description: string; manual: string };
}
```

### procedure.md Format

Each procedure directory needs a `procedure.md` file:

```markdown
understand_project: Systematically explore and understand the current project structure

1. Use `list_directory` on the root directory to get an overview
   - Identify key directories (src, lib, tests, docs, etc.)
   - Note configuration files (package.json, tsconfig.json, etc.)

2. Use `read_file` on the main configuration file
   - Project name and description
   - Dependencies and their purposes

3. Output the final report in this format:
   ...
```

**First line format**: `procedure_name: description`
- Before colon is the procedure name
- After colon is the brief description
- Content below the first line contains the step-by-step instructions

### Global Procedure Registry

Procedures are registered and accessed through the global `PROCEDURES` object:

```typescript
import { PROCEDURES } from 'arki';

// Get procedure
const procedure = PROCEDURES['understand_project'];

// Access procedure content
console.log(procedure.description);
console.log(procedure.manual);

// Get all procedures
const allProcedures = Object.values(PROCEDURES);
```

### Built-in Procedures

- `understand_project` - Systematically explore and understand project structure, output structured report

## File System Utilities

The `src/fs` module provides common file system operations, organized into three submodules:

### paths.ts - Path and OS Utilities

```typescript
import { OS, PATHS, workingDir, setWorkingDir } from 'arki';

// OS information
console.log(OS.name);     // 'windows' | 'mac' | 'linux' | 'other'
console.log(OS.version);  // e.g., '24.5.0'

// Path configuration
console.log(PATHS.globalConfig);     // ~/.config/arki or %APPDATA%\arki
console.log(PATHS.projectConfig);    // {workingDir}/.arki
console.log(PATHS.globalTemplate);   // Package's config/arki template
console.log(PATHS.projectTemplate);  // Package's config/.arki template

// Working directory management
console.log(workingDir);             // Current working directory
setWorkingDir('/new/path');          // Change working directory
```

### file.ts - File Operations

```typescript
import { fileExists, readFile, writeFile, readJsonFile, writeJsonFile } from 'arki';

// Check if file exists (returns false for directories)
const exists = await fileExists('/path/to/file.txt');

// Read/write text files (readFile returns null if not found)
const content = await readFile('/path/to/file.txt');
await writeFile('/path/to/file.txt', 'content');

// Read/write JSON files (readJsonFile returns null if not found or invalid)
const data = await readJsonFile<MyType>('/path/to/data.json');
await writeJsonFile('/path/to/data.json', { key: 'value' });  // Pretty formatted
```

### dir.ts - Directory Operations

```typescript
import { dirExists, mkdir, copyDir } from 'arki';

// Check if directory exists (returns false for files)
const exists = await dirExists('/path/to/dir');

// Create directory recursively (no error if exists)
await mkdir('/path/to/new/dir');

// Copy directory recursively (creates dest if not exists)
await copyDir('/src/path', '/dest/path');
```

## Logging Utilities

The `src/log` module provides logging functions with XML-style color tag support:

```typescript
import { print, log, info, success, warn, error } from 'arki';

// print - Output without timestamp (for prompts and simple messages)
print('Hello World');
print('<green>Success!</green>');

// log - Output with timestamp prefix
log('Processing...');                    // [14:30:45.123] Processing...
log('<yellow>[WARN]</yellow> Warning');  // [14:30:45.123] [WARN] Warning

// Convenience functions (use log internally)
info('Information');    // [14:30:45.123] [INFO] Information
success('Done');        // [14:30:45.123] [OK] Done
warn('Warning');        // [14:30:45.123] [WARN] Warning
error('Error');         // [14:30:45.123] [ERROR] Error
```

### Color Tags

Supported XML-style color tags:
- Text colors: `<red>`, `<green>`, `<yellow>`, `<blue>`, `<magenta>`, `<cyan>`, `<gray>`
- Styles: `<bold>`, `<dim>`, `<italic>`, `<underline>`, `<inverse>`, `<strikethrough>`

```typescript
print('<red>Error:</red> Something went wrong');
print('<bold><green>Success!</green></bold>');
log('<dim>Debug info</dim>');
```

## Development

```bash
pnpm dev           # Development mode
pnpm build         # Build (using tsup, md files automatically inlined)
pnpm typecheck     # Type checking
pnpm test          # Run tests
pnpm test:watch    # Watch mode testing
pnpm test:coverage # Test coverage
pnpm test:e2e      # E2E tests
```

### Development Guidelines

#### Logging System (Required)

**All output must use the logging system from `src/log/`**. Do NOT use `console.log`, `console.error`, `console.warn`, or direct `process.stdout.write`.

```typescript
// ❌ DON'T use these
console.log('message');
console.error('error');
console.warn('warning');
process.stdout.write('output');

// ✅ DO use these
import { print, log, info, success, warn, error, debug } from './log/index.js';

print('message');           // Simple output without timestamp
log('message');             // Output with timestamp
info('message');            // [INFO] prefix
success('message');         // [OK] prefix
warn('message');            // [WARN] prefix
error('message');           // [ERROR] prefix
debug('Category', 'msg');   // Debug output (only in debug mode)
```

**Exceptions**:
- Streaming output in event handlers may use `process.stdout.write` with color converter for real-time display
- The logging system implementation itself (`src/log/log.ts`)

### Build System

The project uses `tsup` for building, automatically inlines `.md` files as JS strings:

- `tsup.config.ts` configures esbuild plugin to handle md files
- `src/md.d.ts` provides TypeScript type declarations
- Build output is a single file `dist/index.js`
