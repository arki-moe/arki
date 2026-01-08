import { Tool } from '../Tool.js';
import { TOOLS, PROCEDURES } from '../../global.js';
import manualContent from './manual.md';

TOOLS['read_procedure'] = new Tool({
  name: 'read_procedure',
  parameters: {
    procedure_name: { type: 'string', description: 'Procedure name to view' },
  },
  required: ['procedure_name'],
  manualContent,
  execute: async (args) => {
    const procedureName = args.procedure_name as string;
    const procedure = PROCEDURES[procedureName];

    if (!procedure) {
      const available = Object.keys(PROCEDURES).join(', ');
      return {
        content: `Procedure not found: ${procedureName}\nAvailable: ${available}`,
        isError: true,
      };
    }

    return `# ${procedure.name}\n\n${procedure.description}\n\n## Steps\n\n${procedure.manual}`;
  },
});
