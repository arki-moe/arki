#!/usr/bin/env node

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { init, config, TOOLS, workingDir } from './global.js';
import './tool/index.js';
import { setDebugMode, isDebugMode, debug, log, colors } from './log/index.js';
import { MODELS } from './model/index.js';
import { createMainAgent } from './agent/main/index.js';
import packageJson from '../package.json' with { type: 'json' };

function getConfigPath(): string {
  return path.join(os.homedir(), '.config', 'arki', 'config.json');
}

function resetConfig(): void {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
    console.log(`Configuration file deleted: ${configPath}`);
    console.log('Default configuration will be used on next startup.');
  } else {
    console.log('Configuration file does not exist, no reset needed.');
  }
  process.exit(0);
}

function parseArgs() {
  const args = process.argv.slice(2);
  let targetDir = process.cwd();
  let enableDebug = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-p' && args[i + 1]) {
      targetDir = args[i + 1];
      i++;
    } else if (args[i] === '--debug' || args[i] === '-d') {
      enableDebug = true;
    } else if (args[i] === '--reset') {
      resetConfig();
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Usage: arki [options]

Options:
  -p <path>      Specify working directory
  --debug, -d    Enable debug mode, show detailed logs
  --reset        Reset configuration to factory defaults
  --help, -h     Show help information
`);
      process.exit(0);
    }
  }

  return { targetDir, enableDebug };
}

async function main() {
  const { targetDir, enableDebug } = parseArgs();
  
  if (enableDebug) {
    setDebugMode(true);
    debug('Init', 'Debug mode enabled');
  }
  
  await init(targetDir);

  const mainAgentConfig = config.getAgentConfig('main');
  const model = MODELS[mainAgentConfig.model];

  console.log();
  log('cyan', `Arki AI Agent v${packageJson.version}`);
  console.log();
  log('dim', `Model: ${mainAgentConfig.model}${model ? ` (${model.name})` : ''}`);
  log('dim', `Working directory: ${workingDir}`);
  if (isDebugMode()) {
    log('yellow', `🐛 Debug mode enabled`);
  }
  console.log();
  log('dim', `Loaded ${Object.keys(TOOLS).length} tools`);
  if (isDebugMode()) {
    debug('Init', 'Loaded tools', Object.keys(TOOLS));
    debug('Init', 'Agent config', mainAgentConfig);
  }
  console.log();

  const agent = createMainAgent();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  log('blue', 'Enter your question and press Enter to send. Type /exit or /quit to exit.');
  log('blue', 'Type /clear to clear conversation history.');
  console.log();

  const prompt = () => {
    rl.question(`${colors.green}> ${colors.reset}`, async (input) => {
      const trimmed = input.trim();

      if (trimmed === '/exit' || trimmed === '/quit') {
        log('cyan', 'Goodbye!');
        rl.close();
        process.exit(0);
      }

      if (trimmed === '/clear') {
        agent.reset();
        log('yellow', 'Conversation history cleared');
        console.log();
        prompt();
        return;
      }

      if (trimmed === '/help') {
        console.log();
        log('cyan', 'Available commands:');
        log('dim', '  /exit, /quit  - Exit program');
        log('dim', '  /clear        - Clear conversation history');
        log('dim', '  /debug        - Toggle debug mode');
        log('dim', '  /help         - Show help');
        console.log();
        prompt();
        return;
      }

      if (trimmed === '/debug') {
        setDebugMode(!isDebugMode());
        log('yellow', `Debug mode ${isDebugMode() ? 'enabled 🐛' : 'disabled'}`);
        console.log();
        prompt();
        return;
      }

      if (!trimmed) {
        prompt();
        return;
      }

      console.log();
      try {
        const result = await agent.run(trimmed);

        console.log();

        if (result.usage) {
          const contextLimit = model?.capabilities.contextWindow || 'N/A';
          log(
            'dim',
            `[Tokens: ${result.usage.totalTokens} (prompt: ${result.usage.promptTokens}, cached: ${result.usage.cachedTokens || 0}, limit: ${contextLimit})]`
          );
        }

        console.log();
      } catch (error) {
        log('red', `Error: ${error instanceof Error ? error.message : String(error)}`);
        console.log();
      }

      prompt();
    });
  };

  prompt();
}

export * from './global.js';
export * from './log/index.js';
export * from './agent/Msg.js';
export * from './adapter/index.js';
export * from './agent/index.js';
export * from './tool/index.js';
export * from './model/index.js';

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
