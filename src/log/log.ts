/**
 * General logging module
 * All log output is single-line with timestamp prefix
 * Supports XML-style color tags: <red>text</red>, <bold>text</bold>, etc.
 */

import { convertColorTags } from './index.js';

/**
 * Get current timestamp string (HH:MM:SS.mmm)
 */
function getTimestamp(): string {
  return new Date().toISOString().slice(11, 23);
}

/**
 * Print output without timestamp (for prompts and simple messages)
 * @param message Message string with optional XML color tags
 */
export function print(message: string): void {
  console.log(convertColorTags(message));
}

/**
 * Log output with timestamp and XML color tag support
 * @param message Message string with optional XML color tags
 * @example log('<yellow>[TOOL]</yellow> read_file <dim>{"path":"test.txt"}</dim>')
 */
export function log(message: string): void {
  print(`<gray>[${getTimestamp()}]</gray> ${message}`);
}

/**
 * Info log
 */
export function info(message: string): void {
  log(`<blue>[INFO]</blue> ${message}`);
}

/**
 * Success log
 */
export function success(message: string): void {
  log(`<green>[OK]</green> ${message}`);
}

/**
 * Warning log
 */
export function warn(message: string): void {
  log(`<yellow>[WARN]</yellow> ${message}`);
}

/**
 * Error log
 */
export function error(message: string): void {
  log(`<red>[ERROR]</red> ${message}`);
}

