import { debug } from '../log/index.js';
import type { ToolResult } from '../agent/Msg.js';

/**
 * Symbol indicating tool has detailed manual (needs to call read_tool_manual before use)
 */
export const HAS_MANUAL = '📘';

/**
 * Tool class
 */
export class Tool {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
  readonly required: string[];
  readonly manual: string;
  /** Whether this tool is async (non-blocking, result via AsyncToolResultMsg) */
  readonly isAsync: boolean;
  private readonly _execute: (args: Record<string, unknown>) => Promise<string | { content: string; isError?: boolean }>;

  constructor(config: {
    name: string;
    parameters: Record<string, unknown>;
    required: string[];
    manualContent: string;
    execute: (args: Record<string, unknown>) => Promise<string | { content: string; isError?: boolean }>;
    /** Whether this tool is async (default: false) */
    isAsync?: boolean;
  }) {
    this.name = config.name;
    this.parameters = config.parameters;
    this.required = config.required;
    this._execute = config.execute;
    this.isAsync = config.isAsync ?? false;

    const { description, manual } = Tool.parseManual(config.manualContent);
    this.description = description;
    this.manual = manual;
  }

  /**
   * Parse manual.md content
   * First line format: "tool_name: description", extract description
   * Remaining content is the manual
   * If manual has content, prepend HAS_MANUAL symbol to description
   */
  static parseManual(content: string): { description: string; manual: string } {
    const lines = content.split('\n');
    const firstLine = lines[0] || '';

    let description = '';
    const colonIndex = firstLine.indexOf(':');
    if (colonIndex > 0) {
      description = firstLine.slice(colonIndex + 1).trim();
    }

    const manual = lines.slice(1).join('\n').trim();

    // If has manual content, prepend symbol to indicate need to read manual
    if (manual) {
      description = `${HAS_MANUAL}${description}`;
    }

    return { description, manual };
  }

  /**
   * Execute tool (with error handling and logging)
   */
  async run(args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const result = await this._execute(args);

      if (typeof result === 'string') {
        return { toolName: this.name, result };
      }

      return { toolName: this.name, result: result.content, isError: result.isError };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      debug('Tool', `${this.name} error`, errorMsg);
      return { toolName: this.name, result: `Error: ${errorMsg}`, isError: true };
    }
  }
}
