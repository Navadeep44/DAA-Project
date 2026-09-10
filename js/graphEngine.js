/**
 * Graph Engine Model
 * Graph, Vertex, and Edge data structures with validation and connectivity inspection.
 */

class Vertex {
  constructor(id, label, x, y) {
    this.id = id;
    this.label = label;
    this.x = x;
    this.y = y;
    this.state = 'unvisited'; // 'unvisited' | 'visited' | 'current'
  }
}

class Edge {
  constructor(id, sourceId, targetId, weight) {
    this.id = id;
    this.source = sourceId;
    this.target = targetId;
    this.weight = Number(weight);
    this.state = 'normal'; // 'normal' | 'considering' | 'mst' | 'rejected'
  }

  /**
   * Helper to check if edge connects given vertex
   */
  connects(vertexId) {
    return this.source === vertexId || this.target === vertexId;
  }

  /**
   * Get the other vertex endpoint given one vertex
   */
  getOtherEndpoint(vertexId) {
    if (this.source === vertexId) return this.target;
    if (this.target === vertexId) return this.source;
    return null;
  }
}

class Graph {
  constructor() {
    this.vertices = new Map();
    this.edges = new Map();
    this.nextVertexIdCounter = 1;
  }

  /**
   * Helper to generate unique label: A, B, C... Z, AA, AB...
   */
  generateNextLabel() {
    const usedLabels = new Set(Array.from(this.vertices.values()).map(v => v.label));
    
    let index = 0;
    while (true) {
      let label = '';
      let temp = index;
      while (temp >= 0) {
        label = String.fromCharCode(65 + (temp % 26)) + label;
        temp = Math.floor(temp / 26) - 1;
      }
      if (!usedLabels.has(label)) {
        return label;
      }
      index++;
    }
  }

  /**
   * Add a new vertex
   */
  addVertex(x, y, customLabel = null) {
    const id = `v_${Date.now()}_${this.nextVertexIdCounter++}`;
    const label = customLabel || this.generateNextLabel();
    const vertex = new Vertex(id, label, x, y);
    this.vertices.set(id, vertex);
    return vertex;
  }

  /**
   * Remove a vertex and all connected edges
   */
  removeVertex(vertexId) {
    if (!this.vertices.has(vertexId)) return false;

    // Find and remove connected edges
    const connectedEdges = this.getAdjacentEdges(vertexId);
    connectedEdges.forEach(edge => {
      this.edges.delete(edge.id);
    });

    this.vertices.delete(vertexId);
    return true;
  }

  /**
   * Add an undirected edge between source and target
   */
  addEdge(sourceId, targetId, weight) {
    if (!this.vertices.has(sourceId) || !this.vertices.has(targetId)) {
      throw new Error('Both vertices must exist to add an edge.');
    }
    if (sourceId === targetId) {
      throw new Error('Self-loops are not allowed in MST graph.');
    }
    const numWeight = Number(weight);
    if (isNaN(numWeight) || numWeight <= 0) {
      throw new Error('Enter a valid positive edge weight.');
    }

    const existing = this.getEdgeBetween(sourceId, targetId);
    if (existing) {
      throw new Error('An edge between these vertices already exists.');
    }

    const id = `e_${sourceId}_${targetId}_${Date.now()}`;
    const edge = new Edge(id, sourceId, targetId, numWeight);
    this.edges.set(id, edge);
    return edge;
  }

  /**
   * Remove an edge
   */
  removeEdge(edgeId) {
    return this.edges.delete(edgeId);
  }

  /**
   * Update edge weight
   */
  updateEdgeWeight(edgeId, newWeight) {
    const edge = this.edges.get(edgeId);
    if (!edge) return false;
    const numWeight = Number(newWeight);
    if (isNaN(numWeight) || numWeight <= 0) {
      throw new Error('Enter a valid positive edge weight.');
    }
    edge.weight = numWeight;
    return true;
  }

  /**
   * Find edge between two vertices regardless of direction
   */
  getEdgeBetween(v1Id, v2Id) {
    for (const edge of this.edges.values()) {
      if ((edge.source === v1Id && edge.target === v2Id) ||
          (edge.source === v2Id && edge.target === v1Id)) {
        return edge;
      }
    }
    return null;
  }

  /**
   * Get all edges connected to a vertex
   */
  getAdjacentEdges(vertexId) {
    const adj = [];
    for (const edge of this.edges.values()) {
      if (edge.connects(vertexId)) {
        adj.push(edge);
      }
    }
    return adj;
  }

  /**
   * Get neighbor vertices with edge details
   */
  getNeighbors(vertexId) {
    const neighbors = [];
    for (const edge of this.edges.values()) {
      if (edge.connects(vertexId)) {
        const neighborId = edge.getOtherEndpoint(vertexId);
        neighbors.push({
          vertexId: neighborId,
          edgeId: edge.id,
          weight: edge.weight
        });
      }
    }
    return neighbors;
  }

  /**
   * Reset states of all vertices and edges to normal/unvisited
   */
  resetStates() {
    this.vertices.forEach(v => {
      v.state = 'unvisited';
    });
    this.edges.forEach(e => {
      e.state = 'normal';
    });
  }

  /**
   * Clear the entire graph
   */
  clear() {
    this.vertices.clear();
    this.edges.clear();
    this.nextVertexIdCounter = 1;
  }

  /**
   * Perform BFS to check connectivity and find connected components
   */
  checkConnectivity() {
    const vertexIds = Array.from(this.vertices.keys());
    if (vertexIds.length === 0) {
      return { isConnected: true, componentCount: 0, components: [] };
    }

    const visited = new Set();
    const components = [];

    vertexIds.forEach(startId => {
      if (!visited.has(startId)) {
        const component = [];
        const queue = [startId];
        visited.add(startId);

        while (queue.length > 0) {
          const current = queue.shift();
          component.push(current);

          this.getNeighbors(current).forEach(neighbor => {
            if (!visited.has(neighbor.vertexId)) {
              visited.add(neighbor.vertexId);
              queue.push(neighbor.vertexId);
            }
          });
        }
        components.push(component);
      }
    });

    return {
      isConnected: components.length === 1,
      componentCount: components.length,
      components
    };
  }

  /**
   * Validate graph suitability for MST algorithm
   */
  validateForMST() {
    if (this.vertices.size < 2) {
      return { valid: false, error: 'Add at least two vertices and one edge.' };
    }
    if (this.edges.size === 0) {
      return { valid: false, error: 'Graph contains no edges. Add edges to construct an MST.' };
    }

    for (const edge of this.edges.values()) {
      if (isNaN(edge.weight) || edge.weight <= 0) {
        return { valid: false, error: 'All edge weights must be valid positive numbers.' };
      }
    }

    const conn = this.checkConnectivity();
    if (!conn.isConnected) {
      return {
        valid: false,
        error: 'This graph is disconnected. A spanning tree cannot be constructed for all vertices.',
        componentCount: conn.componentCount
      };
    }

    return { valid: true };
  }

  /**
   * Find cycle path between u and v in a sub-graph of edges
   * Used to highlight cycle paths when an edge is rejected in Kruskal
   */
  findPathInEdgeSet(startId, targetId, edgeIdSet) {
    const parentMap = new Map(); // curr -> { prevVertex, viaEdgeId }
    const queue = [startId];
    const visited = new Set([startId]);

    while (queue.length > 0) {
      const curr = queue.shift();
      if (curr === targetId) break;

      const neighbors = this.getNeighbors(curr);
      for (const n of neighbors) {
        if (edgeIdSet.has(n.edgeId) && !visited.has(n.vertexId)) {
          visited.add(n.vertexId);
          parentMap.set(n.vertexId, { prevVertex: curr, viaEdgeId: n.edgeId });
          queue.push(n.vertexId);
        }
      }
    }

    if (!visited.has(targetId)) return null;

    const pathVertices = [];
    const pathEdges = [];
    let curr = targetId;

    while (curr !== startId) {
      pathVertices.push(curr);
      const info = parentMap.get(curr);
      pathEdges.push(info.viaEdgeId);
      curr = info.prevVertex;
    }
    pathVertices.push(startId);

    return {
      vertices: pathVertices.reverse(),
      edges: pathEdges
    };
  }

  /**
   * Recenter and scale all vertices neatly within canvas dimensions
   */
  recenterGraph(width = 800, height = 500) {
    if (this.vertices.size === 0) return;
    const vertices = Array.from(this.vertices.values());
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    vertices.forEach(v => {
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
    });

    const currentWidth = maxX - minX || 1;
    const currentHeight = maxY - minY || 1;

    const paddingX = width * 0.18;
    const paddingY = height * 0.20;
    const targetWidth = Math.max(100, width - 2 * paddingX);
    const targetHeight = Math.max(100, height - 2 * paddingY);

    const scaleX = targetWidth / currentWidth;
    const scaleY = targetHeight / currentHeight;
    const scale = Math.min(scaleX, scaleY, 1.2);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const targetCenterX = width / 2;
    const targetCenterY = height / 2;

    vertices.forEach(v => {
      v.x = Math.round(targetCenterX + (v.x - centerX) * scale);
      v.y = Math.round(targetCenterY + (v.y - centerY) * scale);
    });
  }

  /**
   * Pre-load standard sample graph (from prompt section 18)
   */
  loadSampleGraph(width = 800, height = 500) {
    this.clear();

    const paddingX = width * 0.15;
    const paddingY = height * 0.18;
    const w = width - 2 * paddingX;
    const h = height - 2 * paddingY;

    // Vertices A, B, C, D, E
    const vA = this.addVertex(paddingX, paddingY, 'A');
    const vB = this.addVertex(paddingX + w * 0.6, paddingY, 'B');
    const vC = this.addVertex(paddingX, paddingY + h * 0.5, 'C');
    const vD = this.addVertex(paddingX + w * 0.6, paddingY + h * 0.5, 'D');
    const vE = this.addVertex(paddingX + w * 0.3, paddingY + h, 'E');

    // Edges:
    // A-B: 2, B-C: 3, B-D: 4, C-D: 1, A-C: 5, C-E: 6, D-E: 4
    this.addEdge(vA.id, vB.id, 2);
    this.addEdge(vB.id, vC.id, 3);
    this.addEdge(vB.id, vD.id, 4);
    this.addEdge(vC.id, vD.id, 1);
    this.addEdge(vA.id, vC.id, 5);
    this.addEdge(vC.id, vE.id, 6);
    this.addEdge(vD.id, vE.id, 4);

    return { vA, vB, vC, vD, vE };
  }
}

// Export for module systems or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Vertex, Edge, Graph };
} else {
  window.Vertex = Vertex;
  window.Edge = Edge;
  window.Graph = Graph;
}
