/**
 * Debug logging module
 * All debug output is single-line for log-friendly format
 */

import { log } from './log.js';

/** Debug mode flag */
let _debugMode = false;

/** Get debug mode status */
export function isDebugMode(): boolean {
  return _debugMode;
}

/** Set debug mode */
export function setDebugMode(enabled: boolean): void {
  _debugMode = enabled;
}

/**
 * Format data to single-line string (max 100 chars)
 */
function formatData(data: unknown, maxLen = 100): string {
  if (data === undefined) return '';
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  const singleLine = str.replace(/\s+/g, ' ').trim();
  return singleLine.length > maxLen ? singleLine.slice(0, maxLen) + '...' : singleLine;
}

/**
 * Debug log function - single line output with timestamp
 * @param category Log category (e.g., 'API', 'Agent', 'Tool')
 * @param message Log message
 * @param data Optional additional data (will be formatted to single line)
 */
export function debug(category: string, message: string, data?: unknown): void {
  if (!_debugMode) return;

  const dataStr = data !== undefined ? ` <dim>${formatData(data)}</dim>` : '';
  log(`<magenta>[${category}]</magenta> <cyan>${message}</cyan>${dataStr}`);
}

