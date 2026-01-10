import * as path from 'path';
import { fileSystem } from './FileSystem.js';

// ==================== Types ====================

export type OperationType = 'insert' | 'replace' | 'delete';

export interface FileOperation {
  type: OperationType;
  /** String to locate in the file */
  target: string;
  /** New content (for insert/replace) */
  content?: string;
  /** Position for insert only */
  position?: 'before' | 'after';
}

export interface Conflict {
  filePath: string;
  /** Agent IDs involved in the conflict */
  agents: string[];
  /** Operations that conflict */
  operations: { agentId: string; operation: FileOperation }[];
  /** Character range where conflict occurs */
  region: { start: number; end: number };
}

export interface Annotation {
  agentId: string;
  start: number;
  end: number;
  type: OperationType;
}

// ==================== Errors ====================

export class TargetNotFoundError extends Error {
  constructor(target: string, filePath: string) {
    super(`Target "${target}" not found in file "${filePath}"`);
    this.name = 'TargetNotFoundError';
  }
}

export class AmbiguousTargetError extends Error {
  constructor(target: string, filePath: string, count: number) {
    super(`Target "${target}" appears ${count} times in file "${filePath}", must be unique`);
    this.name = 'AmbiguousTargetError';
  }
}

export class ConflictError extends Error {
  constructor(public conflicts: Conflict[]) {
    super(`Cannot flush: ${conflicts.length} conflict(s) detected`);
    this.name = 'ConflictError';
  }
}

// ==================== Helper Functions ====================

/**
 * Count occurrences of a substring in a string
 */
function countOccurrences(str: string, target: string): number {
  if (target.length === 0) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = str.indexOf(target, pos)) !== -1) {
    count++;
    pos += target.length;
  }
  return count;
}

/**
 * Apply a single operation to content
 */
function applyOperation(content: string, op: FileOperation): string {
  const index = content.indexOf(op.target);
  if (index === -1) {
    throw new TargetNotFoundError(op.target, '');
  }

  switch (op.type) {
    case 'insert': {
      if (op.position === 'before') {
        return content.slice(0, index) + (op.content || '') + content.slice(index);
      } else {
        // 'after'
        const afterIndex = index + op.target.length;
        return content.slice(0, afterIndex) + (op.content || '') + content.slice(afterIndex);
      }
    }
    case 'replace': {
      return content.slice(0, index) + (op.content || '') + content.slice(index + op.target.length);
    }
    case 'delete': {
      return content.slice(0, index) + content.slice(index + op.target.length);
    }
  }
}

/**
 * Calculate the affected range of an operation on base content
 */
function getOperationRange(
  content: string,
  op: FileOperation
): { start: number; end: number } | null {
  const index = content.indexOf(op.target);
  if (index === -1) return null;

  switch (op.type) {
    case 'insert': {
      if (op.position === 'before') {
        return { start: index, end: index };
      } else {
        const pos = index + op.target.length;
        return { start: pos, end: pos };
      }
    }
    case 'replace':
    case 'delete': {
      return { start: index, end: index + op.target.length };
    }
  }
}

/**
 * Check if two ranges overlap
 */
function rangesOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number }
): boolean {
  // Two ranges [a.start, a.end] and [b.start, b.end] overlap if:
  // a.start < b.end AND b.start < a.end
  // For point insertions (start === end), we consider them overlapping if they touch
  // the same position or if one contains the point
  if (a.start === a.end) {
    // a is a point insertion
    return a.start >= b.start && a.start <= b.end;
  }
  if (b.start === b.end) {
    // b is a point insertion
    return b.start >= a.start && b.start <= a.end;
  }
  // Both are ranges
  return a.start < b.end && b.start < a.end;
}

// ==================== CachedFileSystem ====================

/**
 * CachedFileSystem provides operation-based file editing with:
 * - Read caching
 * - Per-agent operation tracking
 * - Git-style conflict detection
 * - Safe flushing with conflict rejection
 */
export class CachedFileSystem {
  /** Global read cache: filePath -> content | null */
  private readCache: Map<string, string | null> = new Map();

  /** Per-agent, per-file operations: agentId -> filePath -> FileOperation[] */
  private operations: Map<string, Map<string, FileOperation[]>> = new Map();

  // ==================== Read Operations ====================

  /**
   * Read file with agent's operations applied
   * Returns null if file doesn't exist
   */
  async readFile(filePath: string, agentId: string): Promise<string | null> {
    const baseContent = await this.getBaseContent(filePath);
    if (baseContent === null) return null;

    // Apply agent's operations
    const agentOps = this.getOperations(agentId, filePath);
    let content = baseContent;
    for (const op of agentOps) {
      content = applyOperation(content, op);
    }

    return content;
  }

  /**
   * Get base content from cache or disk
   */
  private async getBaseContent(filePath: string): Promise<string | null> {
    if (this.readCache.has(filePath)) {
      return this.readCache.get(filePath)!;
    }

    const content = await fileSystem.readFile(filePath);
    this.readCache.set(filePath, content);
    return content;
  }

  // ==================== Edit Operations ====================

  /**
   * Insert content before or after target string
   * @throws TargetNotFoundError if target not found
   * @throws AmbiguousTargetError if target appears multiple times
   */
  async insert(
    filePath: string,
    target: string,
    content: string,
    position: 'before' | 'after',
    agentId: string
  ): Promise<void> {
    await this.validateTarget(filePath, target, agentId);

    const op: FileOperation = { type: 'insert', target, content, position };
    this.addOperation(agentId, filePath, op);
  }

  /**
   * Replace target string with new content
   * @throws TargetNotFoundError if target not found
   * @throws AmbiguousTargetError if target appears multiple times
   */
  async replace(
    filePath: string,
    target: string,
    newContent: string,
    agentId: string
  ): Promise<void> {
    await this.validateTarget(filePath, target, agentId);

    const op: FileOperation = { type: 'replace', target, content: newContent };
    this.addOperation(agentId, filePath, op);
  }

  /**
   * Delete target string from file
   * @throws TargetNotFoundError if target not found
   * @throws AmbiguousTargetError if target appears multiple times
   */
  async delete(filePath: string, target: string, agentId: string): Promise<void> {
    await this.validateTarget(filePath, target, agentId);

    const op: FileOperation = { type: 'delete', target };
    this.addOperation(agentId, filePath, op);
  }

  /**
   * Validate that target exists exactly once in the virtual content
   */
  private async validateTarget(
    filePath: string,
    target: string,
    agentId: string
  ): Promise<void> {
    const content = await this.readFile(filePath, agentId);
    if (content === null) {
      throw new TargetNotFoundError(target, filePath);
    }

    const count = countOccurrences(content, target);
    if (count === 0) {
      throw new TargetNotFoundError(target, filePath);
    }
    if (count > 1) {
      throw new AmbiguousTargetError(target, filePath, count);
    }
  }

  /**
   * Add operation to agent's operation list for a file
   */
  private addOperation(agentId: string, filePath: string, op: FileOperation): void {
    if (!this.operations.has(agentId)) {
      this.operations.set(agentId, new Map());
    }
    const agentOps = this.operations.get(agentId)!;

    if (!agentOps.has(filePath)) {
      agentOps.set(filePath, []);
    }
    agentOps.get(filePath)!.push(op);
  }

  // ==================== Conflict Detection ====================

  /**
   * Get conflicts for a specific file
   */
  getConflicts(filePath: string): Conflict[] {
    const baseContent = this.readCache.get(filePath);
    if (baseContent === null || baseContent === undefined) {
      return [];
    }

    // Collect all operations from all agents for this file
    const allOps: { agentId: string; operation: FileOperation; range: { start: number; end: number } }[] = [];

    for (const [agentId, agentOps] of this.operations) {
      const fileOps = agentOps.get(filePath);
      if (!fileOps) continue;

      for (const op of fileOps) {
        const range = getOperationRange(baseContent, op);
        if (range) {
          allOps.push({ agentId, operation: op, range });
        }
      }
    }

    // Find conflicts (overlapping ranges from different agents)
    const conflicts: Conflict[] = [];

    for (let i = 0; i < allOps.length; i++) {
      for (let j = i + 1; j < allOps.length; j++) {
        const a = allOps[i];
        const b = allOps[j];

        // Only check different agents
        if (a.agentId === b.agentId) continue;

        if (rangesOverlap(a.range, b.range)) {
          // Check if this conflict already exists
          const existingConflict = conflicts.find(
            (c) =>
              c.operations.some((o) => o.agentId === a.agentId && o.operation === a.operation) &&
              c.operations.some((o) => o.agentId === b.agentId && o.operation === b.operation)
          );

          if (!existingConflict) {
            conflicts.push({
              filePath,
              agents: [a.agentId, b.agentId],
              operations: [
                { agentId: a.agentId, operation: a.operation },
                { agentId: b.agentId, operation: b.operation },
              ],
              region: {
                start: Math.min(a.range.start, b.range.start),
                end: Math.max(a.range.end, b.range.end),
              },
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Get all conflicts across all files
   */
  getAllConflicts(): Map<string, Conflict[]> {
    const result = new Map<string, Conflict[]>();

    // Collect all file paths that have operations
    const filePaths = new Set<string>();
    for (const [, agentOps] of this.operations) {
      for (const [filePath] of agentOps) {
        filePaths.add(filePath);
      }
    }

    for (const filePath of filePaths) {
      const conflicts = this.getConflicts(filePath);
      if (conflicts.length > 0) {
        result.set(filePath, conflicts);
      }
    }

    return result;
  }

  /**
   * Check if a file has any conflicts
   */
  hasConflicts(filePath: string): boolean {
    return this.getConflicts(filePath).length > 0;
  }

  // ==================== Merged View ====================

  /**
   * Get merged content with all agents' operations applied and annotations
   */
  async getMergedContent(
    filePath: string
  ): Promise<{ content: string; annotations: Annotation[] }> {
    const baseContent = await this.getBaseContent(filePath);
    if (baseContent === null) {
      return { content: '', annotations: [] };
    }

    // Collect all operations with their agents
    const allOps: { agentId: string; op: FileOperation; range: { start: number; end: number } }[] = [];

    for (const [agentId, agentOps] of this.operations) {
      const fileOps = agentOps.get(filePath);
      if (!fileOps) continue;

      for (const op of fileOps) {
        const range = getOperationRange(baseContent, op);
        if (range) {
          allOps.push({ agentId, op, range });
        }
      }
    }

    // Sort by start position (descending) to apply from end to start
    allOps.sort((a, b) => b.range.start - a.range.start);

    let content = baseContent;
    const annotations: Annotation[] = [];

    // Apply operations from end to start to preserve positions
    for (const { agentId, op, range } of allOps) {
      const beforeLength = content.length;
      content = applyOperation(content, op);
      const afterLength = content.length;

      // Calculate annotation based on operation type
      let annotationStart = range.start;
      let annotationEnd = range.start;

      if (op.type === 'insert') {
        annotationEnd = annotationStart + (op.content?.length || 0);
      } else if (op.type === 'replace') {
        annotationEnd = annotationStart + (op.content?.length || 0);
      }
      // For delete, start === end (zero-width annotation)

      annotations.push({
        agentId,
        start: annotationStart,
        end: annotationEnd,
        type: op.type,
      });
    }

    return { content, annotations };
  }

  /**
   * Get content with only a specific agent's changes applied
   */
  async getAgentChanges(
    filePath: string,
    agentId: string
  ): Promise<{ content: string; operations: FileOperation[] }> {
    const content = await this.readFile(filePath, agentId);
    const operations = this.getOperations(agentId, filePath);

    return {
      content: content || '',
      operations: [...operations],
    };
  }

  // ==================== Flush ====================

  /**
   * Flush agent's operations to disk
   * @throws ConflictError if there are conflicts involving this agent's files
   */
  async flush(agentId: string): Promise<void> {
    const agentOps = this.operations.get(agentId);
    if (!agentOps || agentOps.size === 0) {
      return;
    }

    // Check for conflicts in all files this agent has modified
    const conflicts: Conflict[] = [];
    for (const [filePath] of agentOps) {
      const fileConflicts = this.getConflicts(filePath);
      // Only include conflicts that involve this agent
      const relevantConflicts = fileConflicts.filter((c) => c.agents.includes(agentId));
      conflicts.push(...relevantConflicts);
    }

    if (conflicts.length > 0) {
      throw new ConflictError(conflicts);
    }

    // Apply operations and write to disk
    for (const [filePath, ops] of agentOps) {
      let content = await this.getBaseContent(filePath);
      if (content === null) {
        content = '';
      }

      for (const op of ops) {
        content = applyOperation(content, op);
      }

      // Ensure directory exists and write to disk
      await fileSystem.mkdir(path.dirname(filePath));
      await fileSystem.writeFile(filePath, content);

      // Update read cache
      this.readCache.set(filePath, content);
    }

    // Clear agent's operations
    this.operations.delete(agentId);
  }

  /**
   * Flush all agents' operations to disk
   * @throws ConflictError if there are any conflicts
   */
  async flushAll(): Promise<void> {
    // Check for any conflicts
    const allConflicts = this.getAllConflicts();
    if (allConflicts.size > 0) {
      const conflicts: Conflict[] = [];
      for (const [, fileConflicts] of allConflicts) {
        conflicts.push(...fileConflicts);
      }
      throw new ConflictError(conflicts);
    }

    // Flush each agent
    const agentIds = [...this.operations.keys()];
    for (const agentId of agentIds) {
      await this.flush(agentId);
    }
  }

  // ==================== Utility ====================

  /**
   * Get operations for an agent, optionally filtered by file path
   */
  getOperations(agentId: string, filePath?: string): FileOperation[] {
    const agentOps = this.operations.get(agentId);
    if (!agentOps) return [];

    if (filePath) {
      return agentOps.get(filePath) || [];
    }

    // Return all operations for this agent
    const allOps: FileOperation[] = [];
    for (const [, ops] of agentOps) {
      allOps.push(...ops);
    }
    return allOps;
  }

  /**
   * Discard operations for an agent, optionally for a specific file
   */
  discardOperations(agentId: string, filePath?: string): void {
    const agentOps = this.operations.get(agentId);
    if (!agentOps) return;

    if (filePath) {
      agentOps.delete(filePath);
      if (agentOps.size === 0) {
        this.operations.delete(agentId);
      }
    } else {
      this.operations.delete(agentId);
    }
  }

  /**
   * Clear the read cache
   */
  clearReadCache(): void {
    this.readCache.clear();
  }

  /**
   * Invalidate cache for a specific file
   */
  invalidateCache(filePath: string): void {
    this.readCache.delete(filePath);
  }
}

/** Global CachedFileSystem instance */
export const cachedFileSystem = new CachedFileSystem();
