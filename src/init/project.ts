import * as readline from 'readline';
import { PATHS, workingDir } from '../fs/paths.js';
import { copyDir, dirExists } from '../fs/dir.js';
import { print, convertColorTags } from '../log/index.js';

/**
 * Ask user a yes/no question via stdin
 * Supports XML-style color tags in the question
 */
async function askQuestion(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(convertColorTags(`${question} <dim>(y/n):</dim> `), (answer) => {
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
        return askQuestion('<red><bold>Do you trust this project and want to initialize Arki config?</bold></red>');
      })();

  if (!trusted) {
    print('<yellow>Initialization cancelled.</yellow>');
    process.exit(0);
  }

  // Copy project config template
  await copyDir(PATHS.projectTemplate, projectConfigDir);

  print('<green>Project configuration initialized.</green>');
}
