/**
 * General logging module
 * All log output is single-line with timestamp prefix
 * Supports XML-style color tags: <red>text</red>, <bold>text</bold>, etc.
 */

import { convertColorTags } from './index.js';

/**
 * Get current timestamp string (HH:MM:SS.mmm)
 */
export function getTimestamp(): string {
  return new Date().toISOString().slice(11, 23);
}

/**
 * Format number with k suffix for thousands
 * @example formatNumber(1372) -> "1.3k"
 * @example formatNumber(200000) -> "200k"
 */
export function formatNumber(num: number): string {
  if (num >= 1000) {
    const k = num / 1000;
    return k >= 100 ? `${Math.round(k)}k` : `${k.toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(num);
}

/**
 * Print output without timestamp (for prompts and simple messages)
 * @param message Message string with optional XML color tags
 * @param newline Whether to append a newline (default: true)
 */
export function print(message: string, newline = true): void {
  const output = convertColorTags(message);
  if (newline) {
    console.log(output);
  } else {
    process.stdout.write(output);
  }
}

/**
 * Log output with timestamp and XML color tag support
 * @param message Message string with optional XML color tags
 * @param newline Whether to append a newline (default: true)
 * @example log('<yellow>[TOOL]</yellow> read_file <dim>{"path":"test.txt"}</dim>')
 */
export function log(message: string, newline = true): void {
  print(`<gray>[${getTimestamp()}]</gray> ${message}`, newline);
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

