/**
 * Procedure class - step-by-step guide for specific workflows
 */
export class Procedure {
  readonly name: string;
  readonly description: string;
  readonly manual: string;

  constructor(config: { name: string; procedureContent: string }) {
    this.name = config.name;

    const { description, manual } = Procedure.parseManual(config.procedureContent);
    this.description = description;
    this.manual = manual;
  }

  /**
   * Parse procedure.md content
   * First line format: "procedure_name: description", extract description
   * Remaining content is the procedure steps
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
}
