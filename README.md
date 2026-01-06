# Arki - AI Agent Programming Assistant

Arki is an AI agent programming tool.

[![npm version](https://img.shields.io/npm/v/arki.svg)](https://www.npmjs.com/package/arki)
[![npm downloads](https://img.shields.io/npm/dm/arki.svg)](https://www.npmjs.com/package/arki)

## Installation

### Via npm

```bash
npm install -g arki
```

### Via pnpm

```bash
pnpm install -g arki
```

### From source

```bash
git clone https://github.com/arki-moe/arki.git
cd arki
pnpm install
pnpm build
```

## Usage

```bash
export OPENAI_API_KEY="your-api-key"
arki
```

### Command Line Arguments

```bash
arki [options]

Options:
  -p <path>      Specify working directory
  --debug, -d    Enable debug mode, show detailed logs
  --help, -h     Show help information
```

Example:
```bash
# Start in specified directory with debug mode enabled
arki -p /path/to/project --debug
```

### Supported Models

- `gpt-5.2` - GPT-5.2
- `gpt-5.1` - GPT-5.1
- `gpt-5` - GPT-5
- `gpt-5-nano` - GPT-5 Nano

### Interactive Commands

- `/exit` or `/quit` - Exit program
- `/clear` - Clear conversation history
- `/debug` - Toggle debug mode
- `/help` - Show help

### Debug Mode

Debug mode outputs detailed runtime logs, including:
- API request/response information (model, message count, elapsed time, tokens)
- Agent run loop (rounds, message count)
- Tool execution details (parameters, elapsed time, results)

Ways to enable:
1. Add `--debug` or `-d` parameter at startup
2. Type `/debug` during runtime to toggle

## Configuration File

Configuration file is located at `~/.config/arki/config.json`:

```json
{
  "agents": {
    "main": {
      "model": "gpt-5.1",
      "flex": false,
      "reasoningEffort": "medium"
    },
    "coder": {
      "model": "gpt-5.2",
      "flex": false,
      "reasoningEffort": "high"
    }
  }
}
```

Each Agent configuration:
- `model` - Model ID to use
- `flex` - Use Flex API (low priority, low cost)
- `reasoningEffort` - Reasoning effort, optional values: `low`, `medium`, `high` (for models that support thinking mode)

Default configuration is automatically copied from the package on first run.

## Built-in Tools

Arki includes the following built-in tools that the AI assistant can automatically call:

- `read_file` - Read file content
- `write_file` - Write to file
- `list_directory` - List directory contents
- `run_command` - Execute shell commands
- `get_tool_info` - View detailed usage instructions for tools

## Development

```bash
pnpm dev           # Development mode
pnpm build         # Build
pnpm typecheck     # Type checking
pnpm test          # Run tests
pnpm test:watch    # Watch mode testing
pnpm test:coverage # Test coverage
pnpm test:e2e      # E2E tests
```
