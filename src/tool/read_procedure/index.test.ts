import { describe, it, expect, beforeEach } from 'vitest';
import { TOOLS, PROCEDURES } from '../../global.js';
import { Procedure } from '../../procedure/Procedure.js';

import './index.js';

describe('ReadProcedureTool', () => {
  beforeEach(() => {
    // Clear procedures before each test
    Object.keys(PROCEDURES).forEach((key) => delete PROCEDURES[key]);
  });

  const tool = () => TOOLS['read_procedure'];

  describe('properties', () => {
    it('should have correct name', () => {
      expect(tool().name).toBe('read_procedure');
    });

    it('should have correct parameters schema', () => {
      expect(tool().parameters).toEqual({
        procedure_name: { type: 'string', description: 'Procedure name to view' },
      });
      expect(tool().required).toEqual(['procedure_name']);
    });
  });

  describe('run', () => {
    it('should return procedure content when procedure exists', async () => {
      PROCEDURES['test_proc'] = new Procedure({
        name: 'test_proc',
        procedureContent: 'test_proc: A test procedure\n\n1. Step one\n2. Step two',
      });

      const result = await tool().run({ procedure_name: 'test_proc' });

      expect(result.result).toContain('# test_proc');
      expect(result.result).toContain('A test procedure');
      expect(result.result).toContain('## Steps');
      expect(result.result).toContain('1. Step one');
      expect(result.result).toContain('2. Step two');
      expect(result.isError).toBeUndefined();
    });

    it('should return error when procedure not found', async () => {
      const result = await tool().run({ procedure_name: 'nonexistent' });

      expect(result.result).toContain('Procedure not found: nonexistent');
      expect(result.isError).toBe(true);
    });

    it('should list available procedures in error message', async () => {
      PROCEDURES['proc1'] = new Procedure({
        name: 'proc1',
        procedureContent: 'proc1: First procedure',
      });
      PROCEDURES['proc2'] = new Procedure({
        name: 'proc2',
        procedureContent: 'proc2: Second procedure',
      });

      const result = await tool().run({ procedure_name: 'nonexistent' });

      expect(result.result).toContain('Available:');
      expect(result.result).toContain('proc1');
      expect(result.result).toContain('proc2');
    });

    it('should wrap result with toolName', async () => {
      PROCEDURES['my_proc'] = new Procedure({
        name: 'my_proc',
        procedureContent: 'my_proc: My procedure',
      });

      const result = await tool().run({ procedure_name: 'my_proc' });

      expect(result.toolName).toBe('read_procedure');
    });
  });
});
