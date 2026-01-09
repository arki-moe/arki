import * as path from 'path';
import * as readline from 'readline';
import { PATHS, workingDir, copyDir, dirExists, writeJsonFile } from '../fs/index.js';
import { print } from '../log/index.js';

/**
 * Ask user a yes/no question via stdin
 */
async function askQuestion(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Initialize project configuration
 * - Checks if project .arki/ directory exists
 * - If not, asks user if they trust the project
 * - If trusted, copies the template to project
 */
export async function initProject(forceInit?: boolean): Promise<void> {
  const projectConfigDir = PATHS.projectConfig;

  if (await dirExists(projectConfigDir)) {
    return;
  }

  const trusted = forceInit
    ? true
    : await (async () => {
        // Ask user if they trust this project
        print(`\n<dim>Project directory: ${workingDir}</dim>`);
        return askQuestion('Do you trust this project and want to initialize arki config?');
      })();

  if (!trusted) {
    print('<yellow>Initialization cancelled.</yellow>');
    process.exit(0);
  }

  // Copy project config template
  await copyDir(PATHS.projectTemplate, projectConfigDir);

  // Update state.json with creation time
  const statePath = path.join(projectConfigDir, 'state.json');
  const state = {
    initialized: true,
    createdAt: new Date().toISOString(),
  };
  await writeJsonFile(statePath, state);

  print('<green>Project configuration initialized.</green>');
}
