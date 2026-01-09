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
│   ├── agent/
│   │   ├── index.ts      # Agent export entry
│   │   ├── Agent.ts      # Agent class implementation
│   │   ├── Msg.ts        # Message type definitions and constructors
│   │   └── Arki/
│   │       ├── index.ts  # Arki agent creation logic
│   │       ├── Arki.ts   # createMainAgent implementation
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
│   │   ├── global.ts     # Global state (TOOLS, PROCEDURES, adapter) and init function
│   │   ├── project.ts    # Project config initialization (trust prompt, copy template)
│   │   └── loader.ts     # Config loading and merging
│   ├── fs/
│   │   ├── index.ts      # Re-exports from submodules
│   │   ├── paths.ts      # OS detection, PATHS object, workingDir
│   │   ├── file.ts       # File operations (read, write, exists)
│   │   └── dir.ts        # Directory operations (copy, exists, mkdir)
│   ├── config/
│   │   ├── index.ts      # Re-exports from init module
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
}

// Base message class
abstract class Msg {
  abstract readonly type: MsgType;
  readonly timestamp: number;
  readonly content: string;
}

// Message classes (union type)
type Msg = SystemMsg | UserMsg | AIMsg | ToolCallMsg | ToolResultMsg;

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
}

// Tool result message (contains multiple results for multi-platform compatibility)
class ToolResultMsg extends Msg {
  readonly type = MsgType.ToolResult;
  readonly toolResults: ToolResult[];
  constructor(toolResults: ToolResult[]);

  // Helper: create from single result
  static single(toolName: string, result: string, isError?: boolean): ToolResultMsg;
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

// Adapter base class
abstract class Adapter {
  protected apiKey: string;
  protected model: string;
  protected flex?: boolean;
  protected reasoningEffort?: ReasoningEffort;
  protected tools?: Tool[];

  constructor(config: {
    apiKey: string;
    model: string;
    flex?: boolean;
    reasoningEffort?: ReasoningEffort;
    tools?: Tool[];
  });

  abstract chat(
    messages: Msg[],
    onChunk?: (chunk: string) => void
  ): Promise<AdapterResponse>;

  getModel(): string;
}

// OpenAI adapter
class OpenAIAdapter extends Adapter {
  constructor(config: {
    apiKey: string;
    model: string;
    flex?: boolean;
    reasoningEffort?: ReasoningEffort;
    tools?: Tool[];
  });
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

class Agent {
  constructor(config: {
    adapter: Adapter;
    messages: Msg[];
    onStream?: (chunk: string) => void;
    onToolCallMsg?: (msg: ToolCallMsg) => void;  // Receive complete tool call message
    onBeforeToolRun?: (name: string, args: Record<string, unknown>) => void;  // Called before each tool execution
    onToolResult?: (name: string, args: Record<string, unknown>, result: string) => void;  // Called after each tool execution
  });

  static renderTemplate(template: string, variables: Record<string, string | number | boolean>): string;
  async run(userInput: string): Promise<AgentResponse>;
  reset(): this;
}
```

Usage example:

```typescript
import { Agent, SystemMsg } from 'arki';
import systemTemplate from './system.md';

// Use Agent.renderTemplate to render template
const systemInstruction = Agent.renderTemplate(systemTemplate, {
  working_dir: process.cwd(),
  current_time: new Date().toLocaleString(),
});

// Method 1: Use global adapter (recommended, initialized via init())
import { adapter, init } from 'arki';

await init();
const agent = new Agent({
  adapter: adapter!,
  messages: [new SystemMsg(systemInstruction)],
  onStream: (chunk) => process.stdout.write(chunk),
  onToolCallMsg: (msg) => {
    console.log('Received tool calls:', msg.toolCalls.map(tc => tc.name));
  },
  onBeforeToolRun: (name) => {
    // Record start time for elapsed calculation
  },
  onToolResult: (name, args, result) => {
    log(`<green>[TOOL]</green> ${name} <dim>${JSON.stringify(args)}</dim>`);
  },
});

// Method 2: Manually create adapter
import { OpenAIAdapter, TOOLS } from 'arki';

const openaiAdapter = new OpenAIAdapter({
  apiKey: process.env.OPENAI_API_KEY || '',
  model: 'gpt-5.1',
  flex: false,
  tools: Object.values(TOOLS),
});

const agent = new Agent({
  adapter: openaiAdapter,
  messages: [new SystemMsg(systemInstruction)],
  onStream: (chunk) => process.stdout.write(chunk),
  onBeforeToolRun: (name, args) => {
    console.log('Calling tool:', name, args);
  },
  onToolResult: (name, args, result) => {
    console.log('Tool result:', name, result.substring(0, 100));
  },
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

  constructor(config: {
    name: string;
    parameters: Record<string, unknown>;
    required: string[];
    manualContent: string;
    execute: (args: Record<string, unknown>) => Promise<string | { content: string; isError?: boolean }>;
  });

  static parseManual(content: string): { description: string; manual: string };
  async run(args: Record<string, unknown>): Promise<ToolResult>;  // Returns single ToolResult
}
```

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

#### Global Adapter

Adapter instance is a global singleton, automatically initialized at `init()`:

```typescript
import { adapter, init } from 'arki';

// Initialize global state (including adapter and tool registration)
await init();

// adapter is initialized, can be used directly
if (adapter) {
  console.log(`Currently using model: ${adapter.getModel()}`);
}
```

The global adapter uses settings from the main configuration (`config.agents.main`), including all registered tools. This avoids duplicate adapter instance creation.

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
   - Loads API keys from environment variables

```typescript
import { init } from 'arki';

// Initialize with optional working directory
await init('/path/to/project');

// After init, configs are loaded and adapter is ready
import { getConfig, getApiKey, getAgentConfig } from 'arki';

const config = getConfig();
const apiKey = getApiKey('openai');
const mainConfig = getAgentConfig('main');
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

### Build System

The project uses `tsup` for building, automatically inlines `.md` files as JS strings:

- `tsup.config.ts` configures esbuild plugin to handle md files
- `src/md.d.ts` provides TypeScript type declarations
- Build output is a single file `dist/index.js`
