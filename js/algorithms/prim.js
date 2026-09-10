/**
 * Prim's Minimum Spanning Tree Algorithm Implementation
 * Returns an array of discrete steps for visual execution and log tracing.
 */
class PrimAlgorithm {
  /**
   * Compute all visual steps for Prim's algorithm given a graph and starting vertex.
   * @param {Graph} graph 
   * @param {string} startVertexId 
   * @returns {Array<Object>} Array of step objects
   */
  static generateSteps(graph, startVertexId = null) {
    const steps = [];
    const vertices = Array.from(graph.vertices.values());
    const edges = Array.from(graph.edges.values());

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

    // Determine start vertex (default to first vertex if unspecified or invalid)
    let startVertex = graph.vertices.get(startVertexId);
    if (!startVertex) {
      startVertex = vertices[0];
    }

    const edgeStates = {};
    edges.forEach(e => { edgeStates[e.id] = 'normal'; });

    const vertexStates = {};
    vertices.forEach(v => { vertexStates[v.id] = 'unvisited'; });

    // Step 1: Initial state & highlight start vertex
    vertexStates[startVertex.id] = 'current';

    steps.push({
      stepIndex: 1,
      type: 'START',
      message: `Starting Prim's Algorithm from vertex ${startVertex.label}`,
      logIcon: '✓',
      logType: 'info',
      currentVertexId: startVertex.id,
      edgeStates: { ...edgeStates },
      vertexStates: { ...vertexStates },
      mstEdges: [],
      totalWeight: 0
    });

    const visitedSet = new Set([startVertex.id]);
    const mstEdgesList = [];
    let totalWeight = 0;

    // Outer loop until all vertices are visited or V-1 edges added
    while (visitedSet.size < vertices.length) {
      // Find all cut edges connecting visited to unvisited vertices
      const candidateEdges = [];

      for (const edge of graph.edges.values()) {
        const sourceVisited = visitedSet.has(edge.source);
        const targetVisited = visitedSet.has(edge.target);

        // Edge crosses the cut if exactly one endpoint is visited
        if ((sourceVisited && !targetVisited) || (!sourceVisited && targetVisited)) {
          candidateEdges.push(edge);
        }
      }

      if (candidateEdges.length === 0) {
        // Disconnected graph component hit
        break;
      }

      // Sort candidate edges by weight ascending
      candidateEdges.sort((a, b) => a.weight - b.weight);
      const minEdge = candidateEdges[0];

      const sourceV = graph.vertices.get(minEdge.source);
      const targetV = graph.vertices.get(minEdge.target);
      const newVertexId = visitedSet.has(minEdge.source) ? minEdge.target : minEdge.source;
      const newVertex = graph.vertices.get(newVertexId);
      const edgeLabel = `${sourceV.label}-${targetV.label}`;

      // Step A: Highlight considered candidate edge
      const considerEdgeStates = { ...edgeStates };
      considerEdgeStates[minEdge.id] = 'considering';

      const considerVertexStates = { ...vertexStates };
      considerVertexStates[newVertexId] = 'current';

      steps.push({
        stepIndex: steps.length + 1,
        type: 'CONSIDER_EDGE',
        message: `Inspecting cut edges... Selected minimum weight edge ${edgeLabel} (weight ${minEdge.weight}) to unvisited vertex ${newVertex.label}`,
        logIcon: '✓',
        logType: 'info',
        currentEdgeId: minEdge.id,
        currentVertexId: newVertexId,
        edgeStates: considerEdgeStates,
        vertexStates: considerVertexStates,
        mstEdges: [...mstEdgesList],
        totalWeight
      });

      // Step B: Add edge & new vertex to MST
      visitedSet.add(newVertexId);
      edgeStates[minEdge.id] = 'mst';
      totalWeight += minEdge.weight;

      // Update vertex states
      vertices.forEach(v => {
        if (visitedSet.has(v.id)) {
          vertexStates[v.id] = (v.id === newVertexId) ? 'current' : 'visited';
        } else {
          vertexStates[v.id] = 'unvisited';
        }
      });

      mstEdgesList.push({
        id: minEdge.id,
        sourceLabel: sourceV.label,
        targetLabel: targetV.label,
        weight: minEdge.weight
      });

      steps.push({
        stepIndex: steps.length + 1,
        type: 'ACCEPT_EDGE',
        message: `Selected edge ${edgeLabel} with weight ${minEdge.weight} — Vertex ${newVertex.label} added to MST (Total Weight: ${totalWeight})`,
        logIcon: '✓',
        logType: 'success',
        currentEdgeId: minEdge.id,
        currentVertexId: newVertexId,
        edgeStates: { ...edgeStates },
        vertexStates: { ...vertexStates },
        mstEdges: [...mstEdgesList],
        totalWeight
      });
    }

    // Mark all visited vertices final state
    const finalVertexStates = { ...vertexStates };
    vertices.forEach(v => {
      if (visitedSet.has(v.id)) {
        finalVertexStates[v.id] = 'visited';
      }
    });

    steps.push({
      stepIndex: steps.length + 1,
      type: 'COMPLETE',
      message: `Prim's Algorithm completed! Spanned ${visitedSet.size}/${vertices.length} vertices with ${mstEdgesList.length} edges and total weight of ${totalWeight}.`,
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
  module.exports = { PrimAlgorithm };
} else {
  window.PrimAlgorithm = PrimAlgorithm;
}
