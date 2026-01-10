import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTimestamp,
  formatNumber,
  print,
  log,
  info,
  success,
  warn,
  error,
} from '../../src/log/log.js';

describe('getTimestamp', () => {
  it('should return timestamp in HH:MM:SS.mmm format', () => {
    const timestamp = getTimestamp();
    // Format: HH:MM:SS.mmm (12 characters)
    expect(timestamp).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
  });

  it('should return current time', () => {
    const before = new Date().toISOString().slice(11, 23);
    const timestamp = getTimestamp();
    const after = new Date().toISOString().slice(11, 23);

    // Timestamp should be between before and after (or equal)
    expect(timestamp >= before || timestamp <= after).toBe(true);
  });
});

describe('formatNumber', () => {
  describe('numbers less than 1000', () => {
    it('should return number as string for 0', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should return number as string for small numbers', () => {
      expect(formatNumber(1)).toBe('1');
      expect(formatNumber(100)).toBe('100');
      expect(formatNumber(999)).toBe('999');
    });
  });

  describe('numbers 1000 and above', () => {
    it('should format 1000 as 1k', () => {
      expect(formatNumber(1000)).toBe('1k');
    });

    it('should format with one decimal for numbers under 100k', () => {
      expect(formatNumber(1372)).toBe('1.4k');
      expect(formatNumber(1500)).toBe('1.5k');
      expect(formatNumber(2300)).toBe('2.3k');
      expect(formatNumber(10500)).toBe('10.5k');
      expect(formatNumber(99900)).toBe('99.9k');
    });

    it('should remove .0 suffix', () => {
      expect(formatNumber(2000)).toBe('2k');
      expect(formatNumber(5000)).toBe('5k');
      expect(formatNumber(10000)).toBe('10k');
    });

    it('should round to whole number for 100k and above', () => {
      expect(formatNumber(100000)).toBe('100k');
      expect(formatNumber(200000)).toBe('200k');
      expect(formatNumber(999999)).toBe('1000k');
      expect(formatNumber(1500000)).toBe('1500k');
    });

    it('should handle edge cases around 100k', () => {
      expect(formatNumber(99999)).toBe('100k'); // rounds to 100k
      expect(formatNumber(100001)).toBe('100k');
    });
  });
});

describe('print', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    stdoutWriteSpy.mockRestore();
  });

  it('should print with newline by default', () => {
    print('Hello World');
    expect(consoleLogSpy).toHaveBeenCalledWith('Hello World');
    expect(stdoutWriteSpy).not.toHaveBeenCalled();
  });

  it('should print without newline when specified', () => {
    print('Hello', false);
    expect(stdoutWriteSpy).toHaveBeenCalledWith('Hello');
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('should convert color tags', () => {
    print('<red>Error</red>');
    expect(consoleLogSpy).toHaveBeenCalledWith('\x1b[31mError\x1b[0m');
  });

  it('should handle multiple color tags', () => {
    print('<bold><green>Success</green></bold>');
    expect(consoleLogSpy).toHaveBeenCalledWith('\x1b[1m\x1b[32mSuccess\x1b[0m\x1b[0m');
  });

  it('should handle empty string', () => {
    print('');
    expect(consoleLogSpy).toHaveBeenCalledWith('');
  });
});

describe('log', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should log with timestamp prefix', () => {
    log('Test message');
    expect(consoleLogSpy).toHaveBeenCalled();
    const output = consoleLogSpy.mock.calls[0][0];
    // Should contain timestamp in gray and the message
    expect(output).toContain('Test message');
    expect(output).toContain('\x1b[90m'); // gray color
    expect(output).toMatch(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/);
  });

  it('should convert color tags in message', () => {
    log('<yellow>Warning</yellow>');
    const output = consoleLogSpy.mock.calls[0][0];
    expect(output).toContain('\x1b[33m'); // yellow color
    expect(output).toContain('Warning');
  });
});

describe('info', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should log with [INFO] prefix in blue', () => {
    info('Information message');
    const output = consoleLogSpy.mock.calls[0][0];
    expect(output).toContain('[INFO]');
    expect(output).toContain('\x1b[34m'); // blue color
    expect(output).toContain('Information message');
  });
});

describe('success', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should log with [OK] prefix in green', () => {
    success('Operation completed');
    const output = consoleLogSpy.mock.calls[0][0];
    expect(output).toContain('[OK]');
    expect(output).toContain('\x1b[32m'); // green color
    expect(output).toContain('Operation completed');
  });
});

describe('warn', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should log with [WARN] prefix in yellow', () => {
    warn('Warning message');
    const output = consoleLogSpy.mock.calls[0][0];
    expect(output).toContain('[WARN]');
    expect(output).toContain('\x1b[33m'); // yellow color
    expect(output).toContain('Warning message');
  });
});

describe('error', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should log with [ERROR] prefix in red', () => {
    error('Error message');
    const output = consoleLogSpy.mock.calls[0][0];
    expect(output).toContain('[ERROR]');
    expect(output).toContain('\x1b[31m'); // red color
    expect(output).toContain('Error message');
  });
});
