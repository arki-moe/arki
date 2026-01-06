/**
 * General logging module
 */

import { colors, type ColorName } from './index.js';

/**
 * Colored log output
 * @param color Color name
 * @param args Content to output
 */
export function log(color: ColorName, ...args: unknown[]): void {
  console.log(colors[color], ...args, colors.reset);
}

/**
 * Info log
 */
export function info(message: string): void {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

/**
 * Success log
 */
export function success(message: string): void {
  console.log(`${colors.green}✔${colors.reset} ${message}`);
}

/**
 * Warning log
 */
export function warn(message: string): void {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

/**
 * Error log
 */
export function error(message: string): void {
  console.log(`${colors.red}✖${colors.reset} ${message}`);
}

