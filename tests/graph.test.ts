import { wouldCreateCycle, getDependents, areAllDependenciesCompleted, GraphNode } from '../src/utils/graph';

describe('Graph Utilities', () => {
  describe('wouldCreateCycle', () => {
    it('should detect self-dependency as a cycle', () => {
      const nodes: GraphNode[] = [
        { id: 'task1', dependencies: [] },
        { id: 'task2', dependencies: [] },
      ];

      const result = wouldCreateCycle(nodes, 'task1', 'task1');
      expect(result).toBe(true);
    });

    it('should detect simple cycle', () => {
      const nodes: GraphNode[] = [
        { id: 'task1', dependencies: ['task2'] },
        { id: 'task2', dependencies: [] },
      ];

      const result = wouldCreateCycle(nodes, 'task2', 'task1');
      expect(result).toBe(true);
    });

    it('should detect multi-hop cycle', () => {
      const nodes: GraphNode[] = [
        { id: 'task1', dependencies: ['task2'] },
        { id: 'task2', dependencies: ['task3'] },
        { id: 'task3', dependencies: [] },
      ];

      const result = wouldCreateCycle(nodes, 'task3', 'task1');
      expect(result).toBe(true);
    });

    it('should allow valid dependency without cycle', () => {
      const nodes: GraphNode[] = [
        { id: 'task1', dependencies: [] },
        { id: 'task2', dependencies: [] },
        { id: 'task3', dependencies: [] },
      ];

      const result = wouldCreateCycle(nodes, 'task1', 'task2');
      expect(result).toBe(false);
    });

    it('should allow complex valid dependency graph', () => {
      const nodes: GraphNode[] = [
        { id: 'task1', dependencies: ['task3'] },
        { id: 'task2', dependencies: ['task3'] },
        { id: 'task3', dependencies: [] },
        { id: 'task4', dependencies: [] },
      ];

      const result = wouldCreateCycle(nodes, 'task4', 'task1');
      expect(result).toBe(false);
    });

    it('should detect cycle in complex graph', () => {
      const nodes: GraphNode[] = [
        { id: 'A', dependencies: ['B'] },
        { id: 'B', dependencies: ['C'] },
        { id: 'C', dependencies: ['D'] },
        { id: 'D', dependencies: [] },
      ];

      // Adding D -> A would create cycle: A -> B -> C -> D -> A
      const result = wouldCreateCycle(nodes, 'D', 'A');
      expect(result).toBe(true);
    });
  });

  describe('getDependents', () => {
    it('should return empty array when no dependents exist', () => {
      const nodes: GraphNode[] = [
        { id: 'task1', dependencies: [] },
        { id: 'task2', dependencies: [] },
      ];

      const result = getDependents(nodes, 'task1');
      expect(result).toEqual([]);
    });

    it('should return single dependent', () => {
      const nodes: GraphNode[] = [
        { id: 'task1', dependencies: [] },
        { id: 'task2', dependencies: ['task1'] },
      ];

      const result = getDependents(nodes, 'task1');
      expect(result).toEqual(['task2']);
    });

    it('should return multiple dependents', () => {
      const nodes: GraphNode[] = [
        { id: 'task1', dependencies: [] },
        { id: 'task2', dependencies: ['task1'] },
        { id: 'task3', dependencies: ['task1'] },
        { id: 'task4', dependencies: ['task2'] },
      ];

      const result = getDependents(nodes, 'task1');
      expect(result).toEqual(['task2', 'task3']);
    });
  });

  describe('areAllDependenciesCompleted', () => {
    it('should return true when task has no dependencies', () => {
      const nodes = [
        { id: 'task1', dependencies: [], completed: false },
      ];

      const result = areAllDependenciesCompleted(nodes, 'task1');
      expect(result).toBe(true);
    });

    it('should return true when all dependencies are completed', () => {
      const nodes = [
        { id: 'task1', dependencies: ['task2', 'task3'], completed: false },
        { id: 'task2', dependencies: [], completed: true },
        { id: 'task3', dependencies: [], completed: true },
      ];

      const result = areAllDependenciesCompleted(nodes, 'task1');
      expect(result).toBe(true);
    });

    it('should return false when some dependencies are not completed', () => {
      const nodes = [
        { id: 'task1', dependencies: ['task2', 'task3'], completed: false },
        { id: 'task2', dependencies: [], completed: true },
        { id: 'task3', dependencies: [], completed: false },
      ];

      const result = areAllDependenciesCompleted(nodes, 'task1');
      expect(result).toBe(false);
    });

    it('should return false when dependency does not exist', () => {
      const nodes = [
        { id: 'task1', dependencies: ['nonexistent'], completed: false },
      ];

      const result = areAllDependenciesCompleted(nodes, 'task1');
      expect(result).toBe(false);
    });

    it('should return false when task does not exist', () => {
      const nodes = [
        { id: 'task1', dependencies: [], completed: false },
      ];

      const result = areAllDependenciesCompleted(nodes, 'nonexistent');
      expect(result).toBe(false);
    });
  });
});
