/**
 * Graph utility functions for dependency management
 */

export interface GraphNode {
  id: string;
  dependencies: string[];
}

/**
 * Detects if adding a new dependency would create a cycle in the dependency graph
 * @param nodes - Array of all nodes in the graph
 * @param fromId - ID of the node that will have the dependency added
 * @param toId - ID of the node that will be added as a dependency
 * @returns true if adding the dependency would create a cycle
 */
export function wouldCreateCycle(
  nodes: GraphNode[],
  fromId: string,
  toId: string
): boolean {
  // Self-dependency is always a cycle
  if (fromId === toId) {
    return true;
  }

  // Create adjacency map for efficient lookup
  const adjacencyMap = new Map<string, string[]>();
  nodes.forEach(node => {
    adjacencyMap.set(node.id, node.dependencies);
  });

  // Simulate adding the new dependency
  const currentDeps = adjacencyMap.get(fromId) || [];
  adjacencyMap.set(fromId, [...currentDeps, toId]);

  // Use DFS to detect cycles
  return hasCycle(adjacencyMap, fromId);
}

/**
 * Detects cycles in a directed graph using DFS
 * @param adjacencyMap - Map of node ID to array of dependency IDs
 * @param startNode - Node to start the cycle detection from
 * @returns true if a cycle is detected
 */
function hasCycle(adjacencyMap: Map<string, string[]>, startNode: string): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) {
      return true; // Back edge found - cycle detected
    }

    if (visited.has(nodeId)) {
      return false; // Already processed this node
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const dependencies = adjacencyMap.get(nodeId) || [];
    for (const depId of dependencies) {
      if (dfs(depId)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  return dfs(startNode);
}

/**
 * Gets all nodes that depend on a given node (reverse dependencies)
 * @param nodes - Array of all nodes in the graph
 * @param targetId - ID of the node to find dependents for
 * @returns Array of node IDs that depend on the target node
 */
export function getDependents(nodes: GraphNode[], targetId: string): string[] {
  return nodes
    .filter(node => node.dependencies.includes(targetId))
    .map(node => node.id);
}

/**
 * Checks if all dependencies of a node are completed
 * @param nodes - Array of all nodes with their completion status
 * @param nodeId - ID of the node to check
 * @returns true if all dependencies are completed
 */
export function areAllDependenciesCompleted(
  nodes: Array<GraphNode & { completed: boolean }>,
  nodeId: string
): boolean {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) {
    return false;
  }

  return node.dependencies.every(depId => {
    const dependency = nodes.find(n => n.id === depId);
    return dependency?.completed === true;
  });
}
