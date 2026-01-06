import { colors } from '../../log/index.js';

/** Supported tag names */
const tagNames = Object.keys(colors).filter((k) => k !== 'reset').join('|');
const tagRegex = new RegExp(`<(\\/?)(${tagNames})>`, 'gi');

/** Convert <tag>...</tag> to ANSI escape sequences */
function convertColorTags(str: string): string {
  return str.replace(tagRegex, (_, closing, tag) => {
    return closing ? colors.reset : colors[tag.toLowerCase() as keyof typeof colors] || '';
  });
}

/** Create a buffered streaming color converter */
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

