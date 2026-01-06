/**
 * Debug logging module
 */

import { colors } from './index.js';

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
 * Debug log function
 * @param category Log category (e.g., 'API', 'Agent', 'Tool')
 * @param message Log message
 * @param data Optional additional data
 */
export function debug(category: string, message: string, data?: unknown): void {
  if (!_debugMode) return;

  const timestamp = new Date().toISOString().slice(11, 23);
  const prefix = `${colors.gray}[${timestamp}]${colors.reset} ${colors.magenta}[DEBUG:${category}]${colors.reset}`;

  console.log(`${prefix} ${colors.cyan}${message}${colors.reset}`);

  if (data !== undefined) {
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const lines = dataStr.split('\n');
    const maxLines = 20;
    const truncated = lines.length > maxLines;
    const displayLines = truncated ? lines.slice(-maxLines) : lines;
    if (truncated) {
      console.log(colors.dim + `    ... (${lines.length - maxLines} earlier lines)` + colors.reset);
    }
    console.log(colors.dim + displayLines.map((l) => `    ${l}`).join('\n') + colors.reset);
  }
}

