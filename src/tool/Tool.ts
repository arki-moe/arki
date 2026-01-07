import { debug } from '../log/index.js';
import type { ToolResult } from '../agent/Msg.js';

/**
 * Tool class
 */
export class Tool {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
  readonly required: string[];
  readonly manual: string;
  private readonly _execute: (args: Record<string, unknown>) => Promise<string | { content: string; isError?: boolean }>;

  constructor(config: {
    name: string;
    parameters: Record<string, unknown>;
    required: string[];
    manualContent: string;
    execute: (args: Record<string, unknown>) => Promise<string | { content: string; isError?: boolean }>;
  }) {
    this.name = config.name;
    this.parameters = config.parameters;
    this.required = config.required;
    this._execute = config.execute;

    const { description, manual } = Tool.parseManual(config.manualContent);
    this.description = description;
    this.manual = manual;
  }

  /**
   * Parse manual.md content
   * First line format: "tool_name: description", extract description
   * Remaining content is the manual
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

    return { description, manual };
  }

  /**
   * Execute tool (with error handling and logging)
   */
  async run(args: Record<string, unknown>): Promise<ToolResult> {
    debug('Tool', `Starting tool execution: ${this.name}`, args);
    const startTime = Date.now();

    try {
      const result = await this._execute(args);
      const elapsed = Date.now() - startTime;

      if (typeof result === 'string') {
        debug('Tool', `Tool execution successful: ${this.name} (elapsed: ${elapsed}ms, result length: ${result.length})`);
        return { toolName: this.name, result };
      }

      debug('Tool', `Tool execution completed: ${this.name} (elapsed: ${elapsed}ms, isError: ${result.isError || false})`);
      return { toolName: this.name, result: result.content, isError: result.isError };
    } catch (error) {
      const elapsed = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      debug('Tool', `Tool execution failed: ${this.name} (elapsed: ${elapsed}ms)`, errorMsg);
      return { toolName: this.name, result: `Error: ${errorMsg}`, isError: true };
    }
  }
}
