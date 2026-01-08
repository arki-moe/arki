import { describe, it, expect } from 'vitest';
import { Procedure } from './Procedure.js';

describe('Procedure', () => {
  describe('constructor', () => {
    it('should create procedure with name and parsed content', () => {
      const procedure = new Procedure({
        name: 'test_procedure',
        procedureContent: 'test_procedure: A test procedure\n\nStep 1: Do something\nStep 2: Do another thing',
      });

      expect(procedure.name).toBe('test_procedure');
      expect(procedure.description).toBe('A test procedure');
      expect(procedure.manual).toBe('Step 1: Do something\nStep 2: Do another thing');
    });
  });

  describe('parseManual', () => {
    it('should parse description from first line', () => {
      const content = 'my_procedure: This is the description\n\nStep 1';
      const result = Procedure.parseManual(content);

      expect(result.description).toBe('This is the description');
      expect(result.manual).toBe('Step 1');
    });

    it('should handle empty manual content', () => {
      const content = 'my_procedure: Only description';
      const result = Procedure.parseManual(content);

      expect(result.description).toBe('Only description');
      expect(result.manual).toBe('');
    });

    it('should handle multiline manual content', () => {
      const content = 'proc: desc\n\n1. First step\n2. Second step\n3. Third step';
      const result = Procedure.parseManual(content);

      expect(result.description).toBe('desc');
      expect(result.manual).toBe('1. First step\n2. Second step\n3. Third step');
    });

    it('should handle content without colon in first line', () => {
      const content = 'no colon here\n\nSome steps';
      const result = Procedure.parseManual(content);

      expect(result.description).toBe('');
      expect(result.manual).toBe('Some steps');
    });

    it('should trim whitespace from description and manual', () => {
      const content = 'proc:   description with spaces   \n\n  step 1  \n  step 2  ';
      const result = Procedure.parseManual(content);

      expect(result.description).toBe('description with spaces');
      expect(result.manual).toBe('step 1  \n  step 2');
    });

    it('should NOT add HAS_MANUAL symbol (unlike Tool)', () => {
      const content = 'proc: description\n\nSome manual content';
      const result = Procedure.parseManual(content);

      expect(result.description).toBe('description');
      expect(result.description).not.toContain('📘');
    });
  });
});
