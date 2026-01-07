# Arki API Documentation

This documentation is for developers and LLMs, containing complete API reference and programming details for Arki.

## Project Structure

```
arki/
├── src/
│   ├── index.ts          # CLI entry + library exports
│   ├── global.ts         # Global variables and initialization (includes global adapter and TOOLS)
│   ├── log/
│   │   ├── index.ts      # Color definitions and export entry
│   │   ├── debug.ts      # Debug mode and logging
│   │   └── log.ts        # General logging functions
│   ├── agent/
│   │   ├── index.ts      # Agent export entry
│   │   ├── Agent.ts      # Agent class implementation
│   │   ├── Msg.ts        # Message type definitions and constructors
│   │   └── main/
│   │       ├── index.ts  # main agent creation logic
│   │       ├── main.ts   # createMainAgent implementation
│   │       ├── colors.ts # Streaming color tag conversion
│   │       └── system.md # main agent system prompt
│   ├── adapter/
│   │   ├── Adapter.ts    # LLM adapter base class
│   │   ├── index.ts      # Adapter export entry
│   │   └── openai.ts     # OpenAI adapter
│   ├── model/
│   │   ├── index.ts      # Type definitions and exports
│   │   └── models.ts     # Model configuration data (MODELS)
│   ├── config/
│   │   ├── index.ts      # Configuration export entry
│   │   ├── config.ts     # ConfigManager implementation
│   │   └── config.json   # Default configuration
│   ├── tool/
│   │   ├── Tool.ts       # Tool class definition
│   │   ├── index.ts      # Tool exports and registration
│   │   ├── read_file/
│   │   │   ├── index.ts  # read_file tool
│   │   │   └── manual.md # Tool documentation
│   │   ├── write_file/
│   │   ├── list_directory/
│   │   ├── run_command/
│   │   └── read_tool_manual/
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
  onBeforeToolRun: (name, args) => {
    // Show "calling" status (no newline for dynamic update)
    process.stdout.write(`🔧 ${name} ${JSON.stringify(args)}`);
  },
  onToolResult: (name, args, result) => {
    // Clear line and show completed status
    process.stdout.write(`\r\x1b[2K✔ ${name} ${JSON.stringify(args)}\n`);
    console.log('   Result:', result.substring(0, 100));
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

Tool `name` and `description` are automatically concatenated to the system prompt. Tools with detailed manual content will have the `📘` symbol prefix:

```
## Available Tools

- read_file: Read the content of a specified file
- write_file: Write content to a specified file, create the file if it doesn't exist
- list_directory: List files and subdirectories in a specified directory
- run_command: 📘Execute shell command in the working directory
- read_tool_manual: View detailed usage instructions for a specified tool

If a tool has the 📘 symbol, you MUST call `read_tool_manual` before using it.
Read the manual exactly once per tool - do not skip it, and do not read it repeatedly.
```

### Built-in Tools

- `read_file` - Read file content
- `write_file` - Write to file
- `list_directory` - List directory contents
- `run_command` - Execute shell commands
- `read_tool_manual` - View detailed usage instructions for tools

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
