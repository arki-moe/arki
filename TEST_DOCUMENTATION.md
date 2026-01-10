# Test Documentation

This document provides a comprehensive overview of all test cases in the Arki project.

## Table of Contents

- [Adapter Tests](#adapter-tests)
- [Agent Tests](#agent-tests)
- [Message Tests](#message-tests)
- [File System Tests](#file-system-tests)
- [Model Tests](#model-tests)
- [Procedure Tests](#procedure-tests)
- [Tool Tests](#tool-tests)
- [Initialization Tests](#initialization-tests)
- [E2E Tests](#e2e-tests)

---

## Adapter Tests

**File:** `test/adapter/openai.test.ts`

Tests for the OpenAI adapter that handles communication with OpenAI's API.

### Constructor Tests

| Test Case | Description |
|-----------|-------------|
| `should throw error if API key is not provided` | Verifies that creating an adapter without an API key throws an error |
| `should create adapter with valid api key` | Verifies that adapter is created successfully with a valid API key |

### Chat (Streaming) Tests

| Test Case | Description |
|-----------|-------------|
| `should return text response with streaming` | Verifies streaming text responses are correctly accumulated and returned |
| `should parse tool calls response` | Verifies that tool call responses are correctly parsed with name and arguments |
| `should handle multiple tool calls` | Verifies handling of multiple tool calls in a single response |
| `should convert messages to OpenAI format` | Verifies correct conversion of internal message types to OpenAI API format |
| `should include usage information` | Verifies that token usage statistics are included in responses |
| `should use flex service tier when configured` | Verifies flex service tier option is passed to the API |
| `should stream text immediately` | Verifies that text chunks are streamed in real-time |

### Error Handling Tests

| Test Case | Description |
|-----------|-------------|
| `should propagate API errors` | Verifies that API errors are properly propagated to the caller |

---

## Agent Tests

**File:** `test/agent/agent.test.ts`

Tests for the Agent class that orchestrates LLM interactions and tool execution.

### Constructor Tests

| Test Case | Description |
|-----------|-------------|
| `should initialize agent with messages` | Verifies agent initializes correctly and can process user input |
| `should support multiple initial messages` | Verifies agent can be initialized with multiple system messages |

### Run Tests

| Test Case | Description |
|-----------|-------------|
| `should return text response for simple query` | Verifies simple text responses without tool calls |
| `should handle single tool call` | Verifies execution of a single tool and returning results |
| `should handle multiple tool calls in one response` | Verifies parallel execution of multiple tools in one response |
| `should handle multi-round tool calls` | Verifies sequential tool calls across multiple LLM rounds |
| `should handle unknown tool gracefully` | Verifies graceful error handling when an unknown tool is called |
| `should accumulate token usage across rounds` | Verifies token usage is accumulated across multiple LLM rounds |
| `should publish ToolCallReceived event` | Verifies EventBus receives tool call events |
| `should publish ToolResult event` | Verifies EventBus receives tool result events |
| `should publish BeforeToolRun event` | Verifies EventBus receives events before tool execution |

### Reset Tests

| Test Case | Description |
|-----------|-------------|
| `should clear conversation history and restore initial messages` | Verifies reset clears history but preserves initial messages |
| `should return this for chaining` | Verifies reset method returns the agent instance for method chaining |

### Streaming Tests

| Test Case | Description |
|-----------|-------------|
| `should publish Stream event` | Verifies streaming chunks are published via EventBus |

---

## Message Tests

**File:** `test/agent/msg.test.ts`

Tests for message type definitions.

| Test Case | Description |
|-----------|-------------|
| `should have correct values` | Verifies MsgType enum values (system, user, ai, tool_call, tool_result) |

---

## File System Tests

### FileSystem - File Operations

**File:** `test/fs/file.test.ts`

Tests for basic file operations in the FileSystem singleton.

#### fileExists Tests

| Test Case | Description |
|-----------|-------------|
| `should return true for existing file` | Verifies detection of existing files |
| `should return false for non-existent file` | Verifies false for missing files |
| `should return false for directory` | Verifies directories are not detected as files |

#### readFile Tests

| Test Case | Description |
|-----------|-------------|
| `should read existing file content` | Verifies reading file content as string |
| `should return null for non-existent file` | Verifies null return for missing files |
| `should read empty file` | Verifies reading empty files returns empty string |
| `should read multiline content` | Verifies multiline content is preserved |
| `should read UTF-8 content` | Verifies UTF-8 characters including emojis are read correctly |

#### writeFile Tests

| Test Case | Description |
|-----------|-------------|
| `should write content to file` | Verifies writing new content to file |
| `should overwrite existing file` | Verifies overwriting existing file content |
| `should write empty content` | Verifies writing empty string to file |

#### readJsonFile Tests

| Test Case | Description |
|-----------|-------------|
| `should read valid JSON file` | Verifies parsing JSON from file |
| `should return null for non-existent file` | Verifies null return for missing JSON files |
| `should return null for invalid JSON` | Verifies null return for malformed JSON |
| `should read array JSON` | Verifies reading JSON arrays |
| `should read nested JSON` | Verifies reading nested JSON objects |

#### writeJsonFile Tests

| Test Case | Description |
|-----------|-------------|
| `should write JSON with pretty formatting` | Verifies JSON is written with 2-space indentation |
| `should write array JSON` | Verifies writing JSON arrays |
| `should overwrite existing JSON file` | Verifies overwriting existing JSON files |
| `should handle null and undefined values` | Verifies null is preserved and undefined is omitted |

### FileSystem - Directory Operations

**File:** `test/fs/dir.test.ts`

Tests for directory operations.

#### dirExists Tests

| Test Case | Description |
|-----------|-------------|
| `should return true for existing directory` | Verifies detection of existing directories |
| `should return false for non-existent directory` | Verifies false for missing directories |
| `should return false for file` | Verifies files are not detected as directories |

#### mkdir Tests

| Test Case | Description |
|-----------|-------------|
| `should create directory` | Verifies creating a new directory |
| `should create nested directories` | Verifies recursive directory creation |
| `should not throw if directory already exists` | Verifies idempotent behavior |

#### copyDir Tests

| Test Case | Description |
|-----------|-------------|
| `should copy directory with files` | Verifies copying directory with multiple files |
| `should copy nested directories` | Verifies recursive copy of nested structure |
| `should copy empty directory` | Verifies copying empty directories |
| `should copy deeply nested structure` | Verifies deep nested directory copying |
| `should preserve file content exactly` | Verifies binary content is preserved |
| `should create destination directory if not exists` | Verifies auto-creation of destination path |

### Paths Tests

**File:** `test/fs/paths.test.ts`

Tests for OS detection and path configuration.

#### OS Tests

| Test Case | Description |
|-----------|-------------|
| `should have a valid name` | Verifies OS name is one of: windows, mac, linux, other |
| `should have a version string` | Verifies OS version string is present |
| `should match os.platform()` | Verifies OS name matches Node.js platform |
| `should have version matching os.release()` | Verifies version matches Node.js os.release() |

#### workingDir Tests

| Test Case | Description |
|-----------|-------------|
| `should default to process.cwd()` | Verifies default working directory is process.cwd() |
| `should be changeable via setWorkingDir` | Verifies working directory can be changed |

#### PATHS Tests

| Test Case | Description |
|-----------|-------------|
| `globalConfig should be a string path` | Verifies globalConfig is a string |
| `globalConfig should contain arki in the path` | Verifies arki is in the global config path |
| `globalConfig should be in correct location based on OS` | Verifies OS-specific config locations |
| `projectConfig should be based on workingDir` | Verifies project config uses working directory |
| `projectConfig should update when workingDir changes` | Verifies dynamic path updates |
| `globalTemplate should be a string path` | Verifies template path is a string |
| `globalTemplate should end with config/arki` | Verifies correct template path suffix |
| `projectTemplate should be a string path` | Verifies project template path is a string |
| `projectTemplate should end with config/.arki` | Verifies correct project template path suffix |

### CachedFileSystem Tests

**File:** `test/fs/CachedFileSystem.test.ts`

Tests for the operation-based cached file system with multi-agent support.

#### Insert Operations

| Test Case | Description |
|-----------|-------------|
| `should insert content after target string` | Verifies inserting content after a unique target |
| `should insert content before target string` | Verifies inserting content before a unique target |
| `should handle multiple sequential inserts` | Verifies multiple inserts by the same agent |

#### Replace Operations

| Test Case | Description |
|-----------|-------------|
| `should replace target string with new content` | Verifies replacing a unique target with new content |
| `should handle replacing with empty string` | Verifies deletion via empty replacement |
| `should handle multiple sequential replaces` | Verifies multiple replaces by the same agent |

#### Delete Operations

| Test Case | Description |
|-----------|-------------|
| `should delete target string` | Verifies removing a unique target from file |
| `should handle deleting entire content` | Verifies deleting all content from file |

#### Target Validation

| Test Case | Description |
|-----------|-------------|
| `should throw TargetNotFoundError when target does not exist` | Verifies error when target string not found |
| `should throw AmbiguousTargetError when target appears multiple times` | Verifies error when target is not unique |
| `should throw TargetNotFoundError when file does not exist` | Verifies error for non-existent files |
| `should validate target against virtual content with previous operations` | Verifies targets are validated against pending changes |

#### Read-Your-Writes

| Test Case | Description |
|-----------|-------------|
| `should see own uncommitted writes when reading` | Verifies agents see their own pending changes |
| `should not see other agents uncommitted writes` | Verifies isolation between agents |

#### Multi-Agent Isolation

| Test Case | Description |
|-----------|-------------|
| `should keep operations isolated per agent` | Verifies each agent has isolated view |
| `should track operations separately per agent` | Verifies operation tracking is per-agent |

#### Conflict Detection

| Test Case | Description |
|-----------|-------------|
| `should detect conflict when two agents modify same region` | Verifies overlapping modifications are detected |
| `should not detect conflict when agents modify different regions` | Verifies non-overlapping changes don't conflict |
| `should detect conflict when insert touches same position` | Verifies insert position conflicts are detected |
| `should return all conflicts across files` | Verifies getAllConflicts returns all file conflicts |
| `should correctly identify hasConflicts` | Verifies hasConflicts helper method |

#### Merged View

| Test Case | Description |
|-----------|-------------|
| `should return merged content with all operations applied` | Verifies merging all agents' changes |
| `should include annotations showing which agent made changes` | Verifies change attribution in annotations |
| `should return agent-specific changes` | Verifies getAgentChanges returns single agent's view |

#### Flush Operations

| Test Case | Description |
|-----------|-------------|
| `should write operations to disk on flush` | Verifies flushing writes to disk |
| `should clear operations after flush` | Verifies operations are cleared post-flush |
| `should reject flush when conflicts exist` | Verifies ConflictError on flush with conflicts |
| `should update read cache after flush` | Verifies cache is updated after flush |
| `should flush all agents without conflicts` | Verifies flushAll for non-conflicting changes |
| `should reject flushAll when any conflicts exist` | Verifies flushAll rejects on any conflict |
| `should create parent directories when flushing new file path` | Verifies directory creation during flush |

#### Utility Methods

| Test Case | Description |
|-----------|-------------|
| `should discard operations for an agent` | Verifies discarding all pending operations |
| `should discard operations for specific file only` | Verifies selective operation discard |
| `should clear read cache` | Verifies clearing the read cache |
| `should get all operations for an agent across files` | Verifies retrieving all operations |

#### Read Caching

| Test Case | Description |
|-----------|-------------|
| `should cache file content after first read` | Verifies read caching behavior |
| `should return null for non-existent file` | Verifies null for missing files |
| `should invalidate cache for specific file` | Verifies selective cache invalidation |

---

## Model Tests

**File:** `test/model/index.test.ts`

Tests for the MODELS registry containing supported LLM models.

| Test Case | Description |
|-----------|-------------|
| `should contain GPT-5.2 model` | Verifies GPT-5.2 model exists with correct properties |
| `should contain GPT-5.1 model` | Verifies GPT-5.1 model exists with correct properties |
| `should contain GPT-5 model` | Verifies GPT-5 model exists with correct properties |
| `should contain GPT-5-nano model` | Verifies GPT-5 Nano model exists with correct properties |
| `should have at least 4 models` | Verifies minimum number of models |
| `all models should have required properties` | Verifies all models have name, provider, and capabilities |
| `all model IDs should be unique` | Verifies no duplicate model IDs |
| `should return undefined for non-existent ID` | Verifies undefined for invalid model IDs |
| `should be case-sensitive` | Verifies model ID lookup is case-sensitive |

---

## Procedure Tests

**File:** `test/procedure/Procedure.test.ts`

Tests for the Procedure class that provides step-by-step workflow guides.

### Constructor Tests

| Test Case | Description |
|-----------|-------------|
| `should create procedure with name and parsed content` | Verifies procedure creation with correct parsing |

### parseManual Tests

| Test Case | Description |
|-----------|-------------|
| `should parse description from first line` | Verifies description extraction from first line |
| `should handle empty manual content` | Verifies handling of description-only procedures |
| `should handle multiline manual content` | Verifies parsing of multi-step procedures |
| `should handle content without colon in first line` | Verifies graceful handling of malformed content |
| `should trim whitespace from description and manual` | Verifies whitespace trimming |
| `should NOT add HAS_MANUAL symbol (unlike Tool)` | Verifies procedures don't get 📘 symbol |

---

## Tool Tests

### ListDirectoryTool

**File:** `test/tool/list_directory/index.test.ts`

Tests for the directory listing tool.

#### Properties Tests

| Test Case | Description |
|-----------|-------------|
| `should have correct name` | Verifies tool name is 'list_directory' |
| `should have correct parameters schema` | Verifies path parameter definition |

#### Run Tests

| Test Case | Description |
|-----------|-------------|
| `should list files and directories` | Verifies listing with [FILE] and [DIR] prefixes |
| `should default to current directory when path not provided` | Verifies default path behavior |
| `should list contents of subdirectory` | Verifies subdirectory listing |
| `should return "Directory is empty" for empty directory` | Verifies empty directory message |
| `should return error for non-existent directory` | Verifies error for missing directories |
| `should return error when path is a file` | Verifies error when path is not a directory |
| `should handle absolute path` | Verifies absolute path support |
| `should list multiple files` | Verifies listing multiple entries |
| `should correctly distinguish files and directories` | Verifies correct type identification |
| `should wrap result with toolName` | Verifies result includes tool name |
| `should handle error result` | Verifies error result format |

### ReadFileTool

**File:** `test/tool/read_file/index.test.ts`

Tests for the file reading tool.

#### Properties Tests

| Test Case | Description |
|-----------|-------------|
| `should have correct name` | Verifies tool name is 'read_file' |
| `should have correct parameters schema` | Verifies path parameter is required |

#### Run Tests

| Test Case | Description |
|-----------|-------------|
| `should read existing file content` | Verifies reading file content |
| `should read file with utf-8 encoding` | Verifies UTF-8 support including emojis |
| `should read file in subdirectory` | Verifies reading from subdirectories |
| `should return error for non-existent file` | Verifies error for missing files |
| `should return error for directory` | Verifies error when path is a directory |
| `should handle absolute path` | Verifies absolute path support |
| `should read empty file` | Verifies reading empty files |
| `should read multiline file` | Verifies multiline content |
| `should wrap result with toolName` | Verifies result includes tool name |
| `should handle error result` | Verifies error result format |

### WriteFileTool

**File:** `test/tool/write_file/index.test.ts`

Tests for the file writing tool.

#### Properties Tests

| Test Case | Description |
|-----------|-------------|
| `should have correct name` | Verifies tool name is 'write_file' |
| `should have correct parameters schema` | Verifies path and content parameters are required |

#### Run Tests

| Test Case | Description |
|-----------|-------------|
| `should write content to new file` | Verifies creating new files |
| `should overwrite existing file` | Verifies overwriting existing files |
| `should create parent directories if they do not exist` | Verifies recursive directory creation |
| `should write utf-8 content` | Verifies UTF-8 support |
| `should write empty content` | Verifies writing empty files |
| `should write multiline content` | Verifies multiline content |
| `should handle absolute path` | Verifies absolute path support |
| `should return error for invalid path` | Verifies error for invalid paths |
| `should wrap result with toolName` | Verifies result includes tool name |
| `should handle error result` | Verifies error result format |

### RunCommandTool

**File:** `test/tool/run_command/index.test.ts`

Tests for the shell command execution tool.

#### Properties Tests

| Test Case | Description |
|-----------|-------------|
| `should have correct name` | Verifies tool name is 'run_command' |
| `should have correct parameters schema` | Verifies command parameter is required |

#### Run Tests

| Test Case | Description |
|-----------|-------------|
| `should execute simple echo command` | Verifies basic command execution |
| `should return stdout from command` | Verifies stdout capture |
| `should run command in working directory` | Verifies command runs in correct directory |
| `should include stderr in output` | Verifies stderr is captured with [stderr] label |
| `should return error for failing command` | Verifies error handling for exit code 1 |
| `should return error for non-existent command` | Verifies error for invalid commands |
| `should return message for command with no output` | Verifies success message for silent commands |
| `should handle command with special characters in output` | Verifies special character handling |
| `should handle piped commands` | Verifies shell pipe support |
| `should handle pwd command in temp directory` | Verifies directory context |
| `should wrap result with toolName` | Verifies result includes tool name |
| `should handle error result` | Verifies error result format |

### ReadProcedureTool

**File:** `test/tool/read_procedure/index.test.ts`

Tests for the procedure reading tool.

#### Properties Tests

| Test Case | Description |
|-----------|-------------|
| `should have correct name` | Verifies tool name is 'read_procedure' |
| `should have correct parameters schema` | Verifies procedure_name parameter is required |

#### Run Tests

| Test Case | Description |
|-----------|-------------|
| `should return procedure content when procedure exists` | Verifies formatted procedure output |
| `should return error when procedure not found` | Verifies error for missing procedures |
| `should list available procedures in error message` | Verifies helpful error with available options |
| `should wrap result with toolName` | Verifies result includes tool name |

---

## Initialization Tests

**File:** `test/init-project.test.ts`

Tests for project initialization.

| Test Case | Description |
|-----------|-------------|
| `initializes project config without prompting when forced` | Verifies --init flag creates .arki directory without prompt |

---

## E2E Tests

**File:** `test/e2e.test.ts`

End-to-end tests that make real API calls to OpenAI. These tests require `OPENAI_API_KEY` environment variable.

### OpenAI Adapter E2E

| Test Case | Description |
|-----------|-------------|
| `should get response from OpenAI API` | Verifies real API call returns valid response |
| `should handle streaming response` | Verifies streaming works with real API |

### Agent with Tools E2E

| Test Case | Description |
|-----------|-------------|
| `should execute tool calls and return result` | Verifies full agent loop with tool execution |

### Test Utilities

| Test Case | Description |
|-----------|-------------|
| `should detect API key presence` | Verifies API key detection logic |
| `should skip E2E tests when no API key` | Verifies graceful skip without API key |

---

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run E2E tests (requires OPENAI_API_KEY)
pnpm test:e2e
# Or: OPENAI_API_KEY=your-key pnpm test -- test/e2e.test.ts
```

## Test Structure

All tests use [Vitest](https://vitest.dev/) as the test framework. Tests are organized to mirror the source code structure:

```
test/
├── __mocks__/           # Mock implementations
│   └── openai.ts        # OpenAI API mock
├── adapter/             # Adapter tests
├── agent/               # Agent and message tests
├── fs/                  # File system tests
├── model/               # Model registry tests
├── procedure/           # Procedure tests
├── tool/                # Tool tests
│   ├── list_directory/
│   ├── read_file/
│   ├── read_procedure/
│   ├── run_command/
│   └── write_file/
├── e2e.test.ts          # End-to-end tests
└── init-project.test.ts # Initialization tests
```
