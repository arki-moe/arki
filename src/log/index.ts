/**
 * Logging module
 * Provides debug mode and logging functionality
 */

/**
 * Terminal colors and style definitions
 */
export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  inverse: '\x1b[7m',
  strikethrough: '\x1b[9m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

/** Color name type */
export type ColorName = keyof typeof colors;

export { debug, isDebugMode, setDebugMode } from './debug.js';

export { log, info, success, warn, error } from './log.js';
