const UFClass = (typeof UnionFind !== 'undefined') 
  ? UnionFind 
  : (typeof require !== 'undefined' ? require('../unionFind.js').UnionFind : null);

/**
 * Kruskal's Minimum Spanning Tree Algorithm Implementation
 * Returns an array of discrete steps for visual execution and log tracing.
 */
class KruskalAlgorithm {
  /**
   * Compute all visual steps for Kruskal's algorithm given a graph.
   * @param {Graph} graph 
   * @returns {Array<Object>} Array of step objects
   */
  static generateSteps(graph) {
    const steps = [];
    const vertices = Array.from(graph.vertices.values());
    const edges = Array.from(graph.edges.values());
    const vertexIds = vertices.map(v => v.id);

    // Initial validation check
    const validation = graph.validateForMST();
    if (!validation.valid) {
      steps.push({
        type: 'ERROR',
        message: validation.error,
        status: 'error',
        edgeStates: {},
        vertexStates: {},
        mstEdges: [],
        totalWeight: 0
      });
      return steps;
    }

    // Step 1: Initial state & edge sorting
    const sortedEdges = [...edges].sort((a, b) => a.weight - b.weight);

    // Initial state setup
    const edgeStates = {};
    edges.forEach(e => { edgeStates[e.id] = 'normal'; });

    const vertexStates = {};
    vertices.forEach(v => { vertexStates[v.id] = 'unvisited'; });

    const edgeSortOrderSummary = sortedEdges
      .map((e, idx) => `${idx + 1} → ${graph.vertices.get(e.source).label}-${graph.vertices.get(e.target).label} (w: ${e.weight})`)
      .join(', ');

    steps.push({
      stepIndex: 1,
      type: 'START',
      message: `Sorting all edges by increasing weight... Sorted order: [ ${edgeSortOrderSummary} ]`,
      logIcon: '✓',
      logType: 'info',
      edgeStates: { ...edgeStates },
      vertexStates: { ...vertexStates },
      mstEdges: [],
      totalWeight: 0,
      sortedEdges: sortedEdges.map(e => ({
        id: e.id,
        label: `${graph.vertices.get(e.source).label}-${graph.vertices.get(e.target).label}`,
        weight: e.weight
      }))
    });

    const uf = new UFClass(vertexIds);
    const mstEdgeIds = new Set();
    const mstEdgesList = [];
    let totalWeight = 0;

    // Process edges in sorted order
    for (let i = 0; i < sortedEdges.length; i++) {
      const edge = sortedEdges[i];
      const sourceV = graph.vertices.get(edge.source);
      const targetV = graph.vertices.get(edge.target);
      const edgeLabel = `${sourceV.label}-${targetV.label}`;

      // Step A: Consider edge
      const considerEdgeStates = { ...edgeStates };
      considerEdgeStates[edge.id] = 'considering';

      steps.push({
        stepIndex: steps.length + 1,
        type: 'CONSIDER_EDGE',
        message: `Considering edge ${edgeLabel} with weight ${edge.weight}`,
        logIcon: '✓',
        logType: 'info',
        currentEdgeId: edge.id,
        edgeStates: considerEdgeStates,
        vertexStates: { ...vertexStates },
        mstEdges: [...mstEdgesList],
        totalWeight
      });

      // Step B: Check cycle using UnionFind
      const rootSource = uf.find(edge.source);
      const rootTarget = uf.find(edge.target);

      if (rootSource !== rootTarget) {
        // Union & Accept Edge
        uf.union(edge.source, edge.target);
        mstEdgeIds.add(edge.id);
        edgeStates[edge.id] = 'mst';
        totalWeight += edge.weight;

        // Mark vertices as visited once in MST
        vertexStates[edge.source] = 'visited';
        vertexStates[edge.target] = 'visited';

        mstEdgesList.push({
          id: edge.id,
          sourceLabel: sourceV.label,
          targetLabel: targetV.label,
          weight: edge.weight
        });

        steps.push({
          stepIndex: steps.length + 1,
          type: 'ACCEPT_EDGE',
          message: `Edge ${edgeLabel} accepted — added to MST (Current Total Weight: ${totalWeight})`,
          logIcon: '✓',
          logType: 'success',
          currentEdgeId: edge.id,
          edgeStates: { ...edgeStates },
          vertexStates: { ...vertexStates },
          mstEdges: [...mstEdgesList],
          totalWeight
        });

        // Early termination if we have V-1 edges
        if (mstEdgesList.length === vertices.length - 1) {
          // Mark any remaining unprocessed edges as normal/skipped
          break;
        }
      } else {
        // Cycle detected - Reject Edge
        edgeStates[edge.id] = 'rejected';

        // Find cycle path for context
        const cycleInfo = graph.findPathInEdgeSet(edge.source, edge.target, mstEdgeIds);

        steps.push({
          stepIndex: steps.length + 1,
          type: 'REJECT_EDGE',
          message: `Edge ${edgeLabel} (w: ${edge.weight}) rejected — creates a cycle in component`,
          logIcon: '✕',
          logType: 'warning',
          currentEdgeId: edge.id,
          edgeStates: { ...edgeStates },
          vertexStates: { ...vertexStates },
          mstEdges: [...mstEdgesList],
          totalWeight,
          cycleInfo
        });
      }
    }

    // Final Completion Step
    const finalVertexStates = { ...vertexStates };
    vertices.forEach(v => { finalVertexStates[v.id] = 'visited'; });

    steps.push({
      stepIndex: steps.length + 1,
      type: 'COMPLETE',
      message: `Kruskal's Algorithm completed! Minimum Spanning Tree constructed with ${mstEdgesList.length} edges and total cost of ${totalWeight}.`,
      logIcon: '✓',
      logType: 'complete',
      edgeStates: { ...edgeStates },
      vertexStates: finalVertexStates,
      mstEdges: [...mstEdgesList],
      totalWeight,
      isFinished: true
    });

    return steps;
  }
}

// Export for module systems or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KruskalAlgorithm };
} else {
  window.KruskalAlgorithm = KruskalAlgorithm;
}
