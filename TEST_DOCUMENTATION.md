# Test Documentation

This document provides a comprehensive overview of all test cases in the Arki project.

## Table of Contents

- [Adapter Tests](#adapter-tests)
- [Agent Tests](#agent-tests)
- [Message Tests](#message-tests)
- [EventBus Tests](#eventbus-tests)
- [Log Tests](#log-tests)
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

Tests for message type definitions and message classes.

### MsgType Tests

| Test Case | Description |
|-----------|-------------|
| `should have correct values` | Verifies MsgType enum values (system, user, ai, tool_call, tool_result, async_tool_result) |

### SystemMsg Tests

| Test Case | Description |
|-----------|-------------|
| `should create with correct type and content` | Verifies SystemMsg has correct type and content |
| `should set timestamp on creation` | Verifies timestamp is set during construction |
| `should handle empty content` | Verifies empty string content is handled |

### UserMsg Tests

| Test Case | Description |
|-----------|-------------|
| `should create with correct type and content` | Verifies UserMsg has correct type and content |
| `should handle multiline content` | Verifies multiline content is preserved |

### AIMsg Tests

| Test Case | Description |
|-----------|-------------|
| `should create with correct type and content` | Verifies AIMsg has correct type and content |

### ToolCallMsg Tests

| Test Case | Description |
|-----------|-------------|
| `should create with content and tool calls` | Verifies creation with content and tool calls array |
| `should handle multiple tool calls` | Verifies handling of multiple tool calls |
| `should handle empty tool calls array` | Verifies empty array is handled |
| `should handle tool call with asyncCallId` | Verifies async tool call tracking ID |

### ToolResultMsg Tests

| Test Case | Description |
|-----------|-------------|
| `should create with tool results` | Verifies creation with tool results array |
| `should handle multiple tool results` | Verifies multiple results handling |
| `should handle error results` | Verifies isError flag handling |
| `should handle async placeholder results` | Verifies asyncCallId for placeholder results |
| `static single() should create single result message` | Verifies helper for single result |
| `static single() should create single error result message` | Verifies error flag in single helper |
| `static single() should create single success result message` | Verifies success flag in single helper |

### AsyncToolResultMsg Tests

| Test Case | Description |
|-----------|-------------|
| `should create with correct properties` | Verifies all properties are set correctly |
| `should format content with tracking info` | Verifies content includes tracking ID and tool name |
| `should handle error result` | Verifies isError flag for errors |
| `should handle success result explicitly` | Verifies explicit success (isError=false) |
| `should set timestamp on creation` | Verifies timestamp is set during construction |

---

## EventBus Tests

**File:** `test/event_bus/EventBus.test.ts`

Tests for the EventBus pub/sub system and Event classes.

### Subscribe Tests

| Test Case | Description |
|-----------|-------------|
| `should subscribe to specific agent events` | Verifies subscription to named agent |
| `should not trigger callback for different agent` | Verifies agent filtering works |
| `should support wildcard subscription` | Verifies '*' subscribes to all agents |
| `should trigger both specific and wildcard subscribers` | Verifies both types receive events |
| `should support multiple subscribers for same event and agent` | Verifies multiple callbacks |

### Unsubscribe Tests

| Test Case | Description |
|-----------|-------------|
| `should return unsubscribe function` | Verifies subscribe returns function |
| `should stop receiving events after unsubscribe` | Verifies unsubscribe stops callbacks |
| `should only unsubscribe the specific callback` | Verifies other callbacks still work |
| `should handle unsubscribe when callback not found` | Verifies no error on double unsubscribe |
| `should clean up empty subscription arrays` | Verifies cleanup after last unsubscribe |

### Publish Tests

| Test Case | Description |
|-----------|-------------|
| `should not throw when no subscribers` | Verifies safe publish with no listeners |
| `should pass event object to callback` | Verifies event is passed correctly |

### Clear Tests

| Test Case | Description |
|-----------|-------------|
| `should remove all subscriptions` | Verifies clear removes all subscriptions |

### Event Classes Tests

| Test Case | Description |
|-----------|-------------|
| `StreamEvent should create with agent name and chunk` | Verifies StreamEvent properties |
| `ToolCallReceivedEvent should create with tool calls array` | Verifies ToolCallReceivedEvent properties |
| `BeforeToolRunEvent should create with tool name and args` | Verifies BeforeToolRunEvent properties |
| `ToolResultEvent should create with all properties` | Verifies ToolResultEvent properties |
| `ToolResultEvent should handle error result` | Verifies error flag handling |
| `AsyncToolResultEvent should create with asyncCallId` | Verifies AsyncToolResultEvent properties |
| `AsyncToolResultEvent should handle error result` | Verifies error flag handling |
| `RunStartEvent should create with user input` | Verifies RunStartEvent properties |
| `RunEndEvent should create with response and tool calls` | Verifies RunEndEvent properties |
| `RunEndEvent should include usage information` | Verifies optional usage stats |

---

## Log Tests

**File:** `test/log/log.test.ts`

Tests for logging utilities.

### getTimestamp Tests

| Test Case | Description |
|-----------|-------------|
| `should return timestamp in HH:MM:SS.mmm format` | Verifies timestamp format |
| `should return current time` | Verifies timestamp is current |

### formatNumber Tests

| Test Case | Description |
|-----------|-------------|
| `should return number as string for 0` | Verifies 0 handling |
| `should return number as string for small numbers` | Verifies numbers < 1000 |
| `should format 1000 as 1k` | Verifies k suffix |
| `should format with one decimal for numbers under 100k` | Verifies decimal formatting (1372 → "1.4k") |
| `should remove .0 suffix` | Verifies 2000 → "2k" not "2.0k" |
| `should round to whole number for 100k and above` | Verifies large number formatting |
| `should handle edge cases around 100k` | Verifies boundary behavior |

### print Tests

| Test Case | Description |
|-----------|-------------|
| `should print with newline by default` | Verifies default newline behavior |
| `should print without newline when specified` | Verifies newline=false |
| `should convert color tags` | Verifies XML color tag conversion |
| `should handle multiple color tags` | Verifies nested tags |
| `should handle empty string` | Verifies empty string handling |

### log Tests

| Test Case | Description |
|-----------|-------------|
| `should log with timestamp prefix` | Verifies timestamp is prepended |
| `should convert color tags in message` | Verifies color conversion in log |

### Convenience Functions Tests

| Test Case | Description |
|-----------|-------------|
| `info should log with [INFO] prefix in blue` | Verifies info() format |
| `success should log with [OK] prefix in green` | Verifies success() format |
| `warn should log with [WARN] prefix in yellow` | Verifies warn() format |
| `error should log with [ERROR] prefix in red` | Verifies error() format |

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

### Internal Helper Functions

Tests for internal helper functions exported via `_internal` for testing purposes.

#### countOccurrences Tests

| Test Case | Description |
|-----------|-------------|
| `should return 0 for empty target string` | Verifies empty target returns 0 |
| `should return 0 for empty source string` | Verifies empty source returns 0 |
| `should return 0 when both strings are empty` | Verifies both empty returns 0 |
| `should return 0 when target not found` | Verifies 0 when target doesn't exist |
| `should return 1 when target appears once` | Verifies single occurrence count |
| `should return correct count for multiple occurrences` | Verifies multiple occurrence count |
| `should count non-overlapping matches for repeating patterns` | Verifies "aa" in "aaa" returns 1 |
| `should count non-overlapping matches in longer repeating patterns` | Verifies "aa" in "aaaa" returns 2 |
| `should find target at the beginning` | Verifies target at string start |
| `should find target at the end` | Verifies target at string end |
| `should find target that equals entire string` | Verifies target equals full string |
| `should handle single character target` | Verifies single char search |
| `should handle target longer than source` | Verifies long target returns 0 |
| `should be case sensitive` | Verifies case sensitivity |
| `should handle special characters` | Verifies special chars like '.' |
| `should handle newlines in content` | Verifies newline counting |
| `should handle multiline target` | Verifies multiline target matching |

#### applyOperation Tests

| Test Case | Description |
|-----------|-------------|
| `should insert before target at the beginning` | Verifies insert before at start |
| `should insert before target in the middle` | Verifies insert before in middle |
| `should insert before target at the end` | Verifies insert before at end |
| `should insert after target at the beginning` | Verifies insert after at start |
| `should insert after target at the end` | Verifies insert after at end |
| `should insert empty content (no-op)` | Verifies empty insert is no-op |
| `should insert when content is undefined` | Verifies undefined content handling |
| `should default to after when position not specified` | Verifies default position is 'after' |
| `should replace target at the beginning` | Verifies replace at start |
| `should replace target in the middle` | Verifies replace in middle |
| `should replace target at the end` | Verifies replace at end |
| `should replace with empty string (effectively delete)` | Verifies replace with empty |
| `should replace with longer content` | Verifies expanding replace |
| `should replace with shorter content` | Verifies shrinking replace |
| `should replace entire content` | Verifies full content replace |
| `should handle undefined content (replace with empty)` | Verifies undefined replace |
| `should delete target at the beginning` | Verifies delete at start |
| `should delete target in the middle` | Verifies delete in middle |
| `should delete target at the end` | Verifies delete at end |
| `should delete entire content` | Verifies delete all content |
| `should delete single character` | Verifies single char delete |
| `should throw when target not found` | Verifies error on missing target |
| `should handle multiline content` | Verifies multiline operations |
| `should handle special regex characters in target` | Verifies special chars like '$' |
| `should handle unicode characters` | Verifies unicode support |
| `should handle emoji` | Verifies emoji support |

#### getOperationRange Tests

| Test Case | Description |
|-----------|-------------|
| `should return point range for insert before at beginning` | Verifies point at position 0 |
| `should return point range for insert before in middle` | Verifies point at target start |
| `should return point range for insert after at beginning` | Verifies point at target end |
| `should return point range for insert after at end` | Verifies point at string end |
| `should default to after when position not specified` | Verifies default position |
| `should return range covering target at beginning` | Verifies replace range at start |
| `should return range covering target in middle` | Verifies replace range in middle |
| `should return range covering target at end` | Verifies replace range at end |
| `should return range for entire content` | Verifies full content range |
| `should return range for delete at beginning` | Verifies delete range at start |
| `should return range for delete in middle` | Verifies delete range in middle |
| `should return range for delete at end` | Verifies delete range at end |
| `should return null when target not found` | Verifies null for missing target |
| `should return null for empty content` | Verifies null for empty string |
| `should handle single character target` | Verifies single char range |
| `should handle multiline target` | Verifies multiline range |
| `should handle unicode characters correctly` | Verifies unicode range calculation |

#### rangesOverlap Tests

| Test Case | Description |
|-----------|-------------|
| `should detect overlap when two points are at same position` | Verifies same point overlap |
| `should not overlap when two points are at different positions` | Verifies different points don't overlap |
| `should detect overlap when point is at start of range` | Verifies point at range start |
| `should detect overlap when point is at end of range` | Verifies point at range end |
| `should detect overlap when point is inside range` | Verifies point inside range |
| `should not overlap when point is before range` | Verifies point before range |
| `should not overlap when point is after range` | Verifies point after range |
| `should detect overlap when range contains point (reversed order)` | Verifies reversed arg order |
| `should detect overlap when point at range start (reversed order)` | Verifies reversed point at start |
| `should detect overlap when point at range end (reversed order)` | Verifies reversed point at end |
| `should not overlap when point before range (reversed order)` | Verifies reversed point before |
| `should not overlap when point after range (reversed order)` | Verifies reversed point after |
| `should detect full overlap (same range)` | Verifies identical ranges |
| `should detect overlap when one range contains another` | Verifies containment overlap |
| `should detect overlap when ranges partially overlap (a starts before b)` | Verifies partial overlap |
| `should detect overlap when ranges partially overlap (b starts before a)` | Verifies reversed partial overlap |
| `should not overlap when ranges are adjacent (a ends where b starts)` | Verifies adjacent ranges don't overlap |
| `should not overlap when ranges are adjacent (b ends where a starts)` | Verifies reversed adjacent |
| `should not overlap when ranges are completely separate` | Verifies separate ranges |
| `should not overlap when ranges are completely separate (reversed)` | Verifies reversed separate |
| `should handle ranges at position 0` | Verifies position 0 edge case |
| `should handle point at position 0` | Verifies point at 0 |
| `should handle very large positions` | Verifies large number handling |
| `should handle single-character ranges` | Verifies 1-char range overlap |
| `should not overlap single-character adjacent ranges` | Verifies adjacent 1-char ranges |
| `should detect overlap when ranges share one character` | Verifies minimal overlap |

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

### InsertTextTool

**File:** `test/tool/insert_text/index.test.ts`

Tests for the text insertion tool using CachedFileSystem.

#### Properties Tests

| Test Case | Description |
|-----------|-------------|
| `should have correct name` | Verifies tool name is 'insert_text' |
| `should have correct required parameters` | Verifies path, target, content, position are required |

#### Run Tests

| Test Case | Description |
|-----------|-------------|
| `should insert content after target` | Verifies inserting content after a target string |
| `should insert content before target` | Verifies inserting content before a target string |
| `should return error for non-existent target` | Verifies error when target string not found |
| `should return error for ambiguous target` | Verifies error when target appears multiple times |
| `should return error for non-existent file` | Verifies error for missing files |

### ReplaceTextTool

**File:** `test/tool/replace_text/index.test.ts`

Tests for the text replacement tool using CachedFileSystem.

#### Properties Tests

| Test Case | Description |
|-----------|-------------|
| `should have correct name` | Verifies tool name is 'replace_text' |
| `should have correct required parameters` | Verifies path, target, new_content are required |

#### Run Tests

| Test Case | Description |
|-----------|-------------|
| `should replace target with new content` | Verifies replacing a target string |
| `should return error for non-existent target` | Verifies error when target not found |
| `should return error for ambiguous target` | Verifies error when target appears multiple times |

### DeleteTextTool

**File:** `test/tool/delete_text/index.test.ts`

Tests for the text deletion tool using CachedFileSystem.

#### Properties Tests

| Test Case | Description |
|-----------|-------------|
| `should have correct name` | Verifies tool name is 'delete_text' |
| `should have correct required parameters` | Verifies path, target are required |

#### Run Tests

| Test Case | Description |
|-----------|-------------|
| `should delete target from file` | Verifies deleting a target string |
| `should return error for non-existent target` | Verifies error when target not found |
| `should return error for ambiguous target` | Verifies error when target appears multiple times |

### FlushChangesTool

**File:** `test/tool/flush_changes/index.test.ts`

Tests for the flush changes tool that writes staged operations to disk.

#### Properties Tests

| Test Case | Description |
|-----------|-------------|
| `should have correct name` | Verifies tool name is 'flush_changes' |
| `should have no required parameters` | Verifies no required parameters |

#### Run Tests

| Test Case | Description |
|-----------|-------------|
| `should flush changes to disk` | Verifies staged changes are written to disk |
| `should succeed with no pending changes` | Verifies success when no operations pending |

### CachedReadFileTool

**File:** `test/tool/cached_read_file/index.test.ts`

Tests for reading files with staged changes applied.

#### Properties Tests

| Test Case | Description |
|-----------|-------------|
| `should have correct name` | Verifies tool name is 'cached_read_file' |
| `should have correct required parameters` | Verifies path is required |

#### Run Tests

| Test Case | Description |
|-----------|-------------|
| `should read file content` | Verifies reading original file content |
| `should read file with pending changes applied` | Verifies staged changes are visible |
| `should return error for non-existent file` | Verifies error for missing files |

### GetPendingChangesTool

**File:** `test/tool/get_pending_changes/index.test.ts`

Tests for listing pending operations not yet flushed to disk.

#### Properties Tests

| Test Case | Description |
|-----------|-------------|
| `should have correct name` | Verifies tool name is 'get_pending_changes' |
| `should have no required parameters` | Verifies no required parameters |

#### Run Tests

| Test Case | Description |
|-----------|-------------|
| `should return no pending changes when empty` | Verifies message when no operations |
| `should list insert operation` | Verifies INSERT operations are listed |
| `should list replace operation` | Verifies REPLACE operations are listed |
| `should list delete operation` | Verifies DELETE operations are listed |
| `should list multiple operations` | Verifies multiple operations are counted |

---

## Initialization Tests

### Project Initialization

**File:** `test/init-project.test.ts`

Tests for project initialization.

| Test Case | Description |
|-----------|-------------|
| `initializes project config without prompting when forced` | Verifies --init flag creates .arki directory without prompt |

### Config Loader

**File:** `test/init/loader.test.ts`

Tests for configuration loading and management.

#### getApiKey Tests

| Test Case | Description |
|-----------|-------------|
| `should return OpenAI API key from environment` | Verifies OPENAI_API_KEY retrieval |
| `should return Anthropic API key from environment` | Verifies ANTHROPIC_API_KEY retrieval |
| `should return Google API key from environment` | Verifies GOOGLE_API_KEY retrieval |
| `should return undefined when key not set` | Verifies undefined for missing keys |
| `should handle unknown provider with uppercase convention` | Verifies CUSTOM_API_KEY pattern |

#### loadConfigs Tests

| Test Case | Description |
|-----------|-------------|
| `should load global config` | Verifies loading from global config path |
| `should throw error when global config not found` | Verifies error for missing config |
| `should merge project config over global config` | Verifies project overrides global |
| `should work without project config` | Verifies optional project config |
| `should cache loaded config` | Verifies config caching |

#### getConfig Tests

| Test Case | Description |
|-----------|-------------|
| `should throw error when config not loaded` | Verifies error before loadConfigs() |
| `should return loaded config` | Verifies config retrieval after load |

#### getAgentConfig Tests

| Test Case | Description |
|-----------|-------------|
| `should return agent config when exists` | Verifies agent config retrieval |
| `should throw error when agent config not found` | Verifies error for unknown agent |

#### saveConfig Tests

| Test Case | Description |
|-----------|-------------|
| `should save config to global config file` | Verifies config persistence |

#### deepMerge Tests (via loadConfigs)

| Test Case | Description |
|-----------|-------------|
| `should merge multiple agent configs` | Verifies multi-agent merging |
| `should handle empty project agents` | Verifies empty override handling |
| `should handle project config without agents key` | Verifies missing agents key |

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
├── event_bus/           # EventBus pub/sub tests
├── fs/                  # File system tests
├── init/                # Config loader tests
├── log/                 # Logging utilities tests
├── model/               # Model registry tests
├── procedure/           # Procedure tests
├── tool/                # Tool tests
│   ├── list_directory/
│   ├── read_file/
│   ├── read_procedure/
│   ├── run_command/
│   ├── write_file/
│   ├── insert_text/
│   ├── replace_text/
│   ├── delete_text/
│   ├── flush_changes/
│   ├── cached_read_file/
│   └── get_pending_changes/
├── e2e.test.ts          # End-to-end tests
└── init-project.test.ts # Initialization tests
```
