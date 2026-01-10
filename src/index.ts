#!/usr/bin/env node

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { init, getAgentConfig, TOOLS, PROCEDURES, workingDir, OS } from './global.js';
import './tool/index.js';
import './procedure/index.js';
import { setDebugMode, isDebugMode, debug, log, print, error, formatNumber, convertColorTags, getTimestamp, createColorConverter } from './log/index.js';
import { subscribe } from './event_bus/EventBus.js';
import { StreamEvent, BeforeToolRunEvent, ToolResultEvent } from './event_bus/Event.js';
import { MODELS } from './model/index.js';
import { createArkiAgent } from './agent/Arki/Arki.js';
import packageJson from '../package.json' with { type: 'json' };

function getConfigPath(): string {
  return path.join(os.homedir(), '.config', 'arki', 'config.json');
}

function resetConfig(): void {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
    print(`Configuration file deleted: ${configPath}`);
    print('Default configuration will be used on next startup.');
  } else {
    print('Configuration file does not exist, no reset needed.');
  }
  process.exit(0);
}

function parseArgs() {
  const args = process.argv.slice(2);
  let targetDir = process.cwd();
  let enableDebug = false;
  let forceInit = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-p' && args[i + 1]) {
      targetDir = args[i + 1];
      i++;
    } else if (args[i] === '--debug' || args[i] === '-d') {
      enableDebug = true;
    } else if (args[i] === '--reset') {
      resetConfig();
    } else if (args[i] === '--init') {
      forceInit = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      print(`
Usage: arki [options]

Options:
  -p <path>      Specify working directory
  --debug, -d    Enable debug mode, show detailed logs
  --init         Initialize project config without prompting
  --reset        Reset configuration to factory defaults
  --help, -h     Show help information
`);
      process.exit(0);
    }
  }

  return { targetDir, enableDebug, forceInit };
}

/** Track tool start times for elapsed calculation */
const toolStartTimes = new Map<string, number>();

/** Track if current line needs newline before next log */
let needsNewline = false;

/** Track if stream prefix has been printed for current run */
let streamPrefixPrinted = false;

/**
 * Setup CLI output subscriptions for an agent
 * Arki prints by default, other agents only print in debug mode
 */
function setupAgentOutput(agentName: string): void {
  const isPrimaryAgent = agentName === 'Arki';
  const convertColor = createColorConverter();

  // Subscribe to Stream events
  subscribe(StreamEvent, agentName, (event) => {
    if (isPrimaryAgent || isDebugMode()) {
      // Print prefix on first chunk
      if (!streamPrefixPrinted) {
        print(`<gray>[${getTimestamp()}]</gray> <cyan>[${agentName}]</cyan> `, false);
        streamPrefixPrinted = true;
      }
      process.stdout.write(convertColor(event.chunk));
      // Track if output ends without newline
      needsNewline = !event.chunk.endsWith('\n');
    }
  });

  // Subscribe to BeforeToolRun events
  subscribe(BeforeToolRunEvent, agentName, (event) => {
    toolStartTimes.set(`${agentName}.${event.toolName}`, Date.now());
  });

  // Subscribe to ToolResult events
  subscribe(ToolResultEvent, agentName, (event) => {
    if (!isPrimaryAgent && !isDebugMode()) return;

    // Ensure we're on a new line before logging
    if (needsNewline) {
      print('');
      needsNewline = false;
    }

    const { toolName, args, result } = event;
    const key = `${agentName}.${toolName}`;
    const startTime = toolStartTimes.get(key) || Date.now();
    const elapsed = Date.now() - startTime;
    toolStartTimes.delete(key);

    const argsStr = JSON.stringify(args);
    const argsPreview = argsStr.length > 60 ? argsStr.substring(0, 60) + '...' : argsStr;

    let output = `<cyan>[${agentName}]</cyan><green>[${toolName}]</green> <dim>${argsPreview} (${elapsed}ms)`;
    if (isDebugMode()) {
      const lines = result.split('\n').filter((l) => l.trim());
      let summary: string;
      if (lines.length <= 3) {
        summary = lines.join(', ');
        if (summary.length > 60) summary = summary.substring(0, 60) + '...';
      } else {
        const preview = lines.slice(0, 3).join(', ');
        summary = preview.length > 50 ? preview.substring(0, 50) + '...' : preview;
        summary += ` (+${lines.length - 3} more)`;
      }
      output += ` -> ${summary}`;
    }
    output += '</dim>';
    log(output);
  });
}

async function main() {
  const { targetDir, enableDebug, forceInit } = parseArgs();
  
  if (enableDebug) {
    setDebugMode(true);
    debug('Init', 'Debug mode enabled');
  }
  
  await init(targetDir, forceInit);

  const arkiAgentConfig = getAgentConfig('Arki');
  const model = MODELS[arkiAgentConfig.model];

  print('');
  log(`<bold><cyan>Arki AI Agent</cyan></bold> <dim>v${packageJson.version}</dim>`);
  log(`<green>Model:</green> <bold>${model?.name || arkiAgentConfig.model}</bold> <dim>|</dim> <green>OS:</green> ${OS.name} <dim>(${OS.version})</dim>`);
  log(`<green>Path:</green> <dim>${workingDir}</dim>`);
  log(`<green>Tools:</green> ${Object.keys(TOOLS).length} loaded`);
  if (isDebugMode()) {
    log(`<yellow>Debug mode enabled</yellow>`);
    debug('Init', 'Loaded tools', Object.keys(TOOLS));
    debug('Init', 'Agent config', arkiAgentConfig);
  }
  print('');

  const agent = createArkiAgent();

  // Setup CLI output subscriptions
  setupAgentOutput(agent.name);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  log(`<blue>Enter your question and press Enter to send. Type /exit or /quit to exit.</blue>`);
  log(`<blue>Type /clear to clear conversation history.</blue>`);
  print('');

  const promptStr = convertColorTags('<green>> </green>');
  const prompt = () => {
    rl.question(promptStr, async (input) => {
      const trimmed = input.trim();

      if (trimmed === '/exit' || trimmed === '/quit') {
        log(`<cyan>Goodbye!</cyan>`);
        rl.close();
        process.exit(0);
      }

      if (trimmed === '/clear') {
        agent.reset();
        log(`<yellow>Conversation history cleared</yellow>`);
        print('');
        prompt();
        return;
      }

      if (trimmed === '/help') {
        print('');
        log(`<cyan>Available commands:</cyan>`);
        log(`<dim>  /exit, /quit  - Exit program</dim>`);
        log(`<dim>  /clear        - Clear conversation history</dim>`);
        log(`<dim>  /debug        - Toggle debug mode</dim>`);
        log(`<dim>  /help         - Show help</dim>`);
        print('');
        prompt();
        return;
      }

      if (trimmed === '/debug') {
        setDebugMode(!isDebugMode());
        log(`<yellow>Debug mode ${isDebugMode() ? 'enabled' : 'disabled'}</yellow>`);
        print('');
        prompt();
        return;
      }

      if (!trimmed) {
        prompt();
        return;
      }

      print('');
      try {
        // Reset stream prefix flag for new run
        streamPrefixPrinted = false;
        needsNewline = false;
        
        const result = await agent.run(trimmed);

        if (result.usage) {
          const contextLimit = model?.capabilities.contextWindow || 0;
          const tokensInfo = `[Tokens: ${formatNumber(result.usage.totalTokens)} (cached: ${formatNumber(result.usage.cachedTokens || 0)}) / ${formatNumber(contextLimit)}]`;
          // Print on same line as stream output (no leading newline)
          print(`<dim>${tokensInfo}</dim>`);
        } else if (needsNewline) {
          // Only add newline if no usage info and stream didn't end with newline
          print('');
        }
        needsNewline = false;

      } catch (err) {
        error(`${err instanceof Error ? err.message : String(err)}`);
        print('');
      }

      prompt();
    });
  };

  prompt();
}

export * from './global.js';
export * from './log/index.js';
export * from './agent/Msg.js';
export * from './adapter/Adapter.js';
export * from './adapter/openai.js';
export * from './agent/Agent.js';
export * from './agent/Msg.js';
export * from './tool/index.js';
export * from './model/index.js';

main().catch((err) => {
  error(`Fatal error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
