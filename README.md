> **⚠️ Warning: This project is under active development. Please do not use it in production environments.**

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
  --init         Initialize project config without prompting
  --reset        Reset configuration to factory defaults
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

## Configuration

### Global Configuration

Global configuration is stored in system-specific locations:

- **macOS/Linux**: `~/.config/arki/config.json`
- **Windows**: `%APPDATA%\arki\config.json`

On first run, Arki copies the default configuration template to this location.

### Project Configuration

Each project can have its own configuration in `.arki/` directory:

- `.arki/config.json` - Project-specific settings (overrides global config)
- `.arki/state.json` - Project state and cache

On first run in a new project, Arki will ask if you trust the project before initializing the `.arki/` directory.
Use `--init` to skip the prompt in non-interactive environments.

### Reset to Factory Defaults

```bash
arki --reset
```

This will delete the global configuration file. The default configuration will be used on next startup.

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
