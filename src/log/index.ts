/**
 * Logging module
 * Provides debug mode and logging functionality
 * Supports XML-style color tags: <red>text</red>, <bold>text</bold>, etc.
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

/** Supported tag names regex */
const tagNames = Object.keys(colors).filter((k) => k !== 'reset').join('|');
const tagRegex = new RegExp(`<(\\/?)(${tagNames})>`, 'gi');

/**
 * Convert XML-style color tags to ANSI escape sequences
 * Example: "<red>error</red>" -> "\x1b[31merror\x1b[0m"
 */
export function convertColorTags(str: string): string {
  return str.replace(tagRegex, (_, closing, tag) => {
    return closing ? colors.reset : colors[tag.toLowerCase() as ColorName] || '';
  });
}

/**
 * Create a buffered streaming color converter
 * Used for streaming output where tags may span multiple chunks
 */
export function createColorConverter() {
  let buffer = '';
  return (chunk: string): string => {
    buffer += chunk;
    const lastOpen = buffer.lastIndexOf('<');
    if (lastOpen === -1) {
      const out = convertColorTags(buffer);
      buffer = '';
      return out;
    }
    if (buffer.indexOf('>', lastOpen) !== -1) {
      const out = convertColorTags(buffer);
      buffer = '';
      return out;
    }
    const out = convertColorTags(buffer.slice(0, lastOpen));
    buffer = buffer.slice(lastOpen);
    return out;
  };
}

export { debug, isDebugMode, setDebugMode } from './debug.js';

export { log, print, info, success, warn, error, getTimestamp, formatNumber } from './log.js';
