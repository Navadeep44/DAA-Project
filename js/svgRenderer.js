/**
 * SVG Graph Renderer & Canvas Interaction Handler
 * Manages rendering of vertices, edges, drag interaction, selection, and interactive edit modes.
 */
class SVGRenderer {
  constructor(svgElement, graph) {
    this.svg = svgElement;
    this.graph = graph;

    this.mode = 'select'; // 'select' | 'add_vertex' | 'add_edge' | 'delete'
    this.selectedVertexId = null;
    this.selectedEdgeId = null;
    this.edgeSourceVertexId = null; // For add_edge mode multi-click selection

    // Drag state
    this.isDragging = false;
    this.draggedVertexId = null;
    this.dragOffset = { x: 0, y: 0 };

    // Group containers
    this.edgesGroup = null;
    this.verticesGroup = null;
    this.labelsGroup = null;
    this.gridGroup = null;

    // Callbacks
    this.onVertexSelect = null;
    this.onEdgeSelect = null;
    this.onCanvasClick = null;
    this.onAddEdgeRequest = null; // (sourceId, targetId) => void
    this.onGraphChanged = null;

    this.initSVG();
    this.attachEventListeners();
  }

  initSVG() {
    this.svg.innerHTML = '';

    // Create SVG defs for gradients/filters if needed
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    // Grid pattern
    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pattern.setAttribute('id', 'bg-grid');
    pattern.setAttribute('width', '30');
    pattern.setAttribute('height', '30');
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    pattern.innerHTML = `<path d="M 30 0 L 0 0 0 30" fill="none" stroke="#D9DEE8" stroke-width="0.5" stroke-dasharray="2,2" opacity="0.6"/>`;
    defs.appendChild(pattern);

    this.svg.appendChild(defs);

    // Background rect
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', 'url(#bg-grid)');
    bgRect.classList.add('canvas-bg');
    this.svg.appendChild(bgRect);

    // Render layers
    this.edgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.edgesGroup.classList.add('edges-layer');
    this.svg.appendChild(this.edgesGroup);

    this.labelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.labelsGroup.classList.add('labels-layer');
    this.svg.appendChild(this.labelsGroup);

    this.verticesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.verticesGroup.classList.add('vertices-layer');
    this.svg.appendChild(this.verticesGroup);
  }

  setMode(mode) {
    this.mode = mode;
    this.edgeSourceVertexId = null;
    this.render();
  }

  getPointerPosition(evt) {
    const rect = this.svg.getBoundingClientRect();
    const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
    const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  attachEventListeners() {
    // Mouse / Touch down on canvas
    const handleDown = (evt) => {
      const targetNode = evt.target.closest('[data-vertex-id]');
      const targetEdge = evt.target.closest('[data-edge-id]');
      const pos = this.getPointerPosition(evt);

      if (targetNode) {
        evt.stopPropagation();
        const vId = targetNode.getAttribute('data-vertex-id');
        this.handleVertexDown(vId, pos);
      } else if (targetEdge) {
        evt.stopPropagation();
        const eId = targetEdge.getAttribute('data-edge-id');
        this.handleEdgeDown(eId);
      } else {
        // Clicked empty canvas
        if (this.mode === 'add_vertex') {
          if (this.onCanvasClick) {
            this.onCanvasClick(pos.x, pos.y);
          }
        } else {
          this.deselectAll();
        }
      }
    };

    const handleMove = (evt) => {
      if (!this.isDragging || !this.draggedVertexId) return;
      evt.preventDefault();
      const pos = this.getPointerPosition(evt);
      const vertex = this.graph.vertices.get(this.draggedVertexId);
      if (vertex) {
        // Constrain to SVG boundaries
        const rect = this.svg.getBoundingClientRect();
        const nodeRadius = 24;
        const x = Math.max(nodeRadius, Math.min(rect.width - nodeRadius, pos.x - this.dragOffset.x));
        const y = Math.max(nodeRadius, Math.min(rect.height - nodeRadius, pos.y - this.dragOffset.y));

        vertex.x = x;
        vertex.y = y;
        this.render();
        if (this.onGraphChanged) this.onGraphChanged();
      }
    };

    const handleUp = () => {
      this.isDragging = false;
      this.draggedVertexId = null;
    };

    this.svg.addEventListener('mousedown', handleDown);
    this.svg.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);

    this.svg.addEventListener('touchstart', handleDown, { passive: false });
    this.svg.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
  }

  handleVertexDown(vertexId, pos) {
    if (this.mode === 'add_edge') {
      if (!this.edgeSourceVertexId) {
        this.edgeSourceVertexId = vertexId;
        this.render();
      } else if (this.edgeSourceVertexId === vertexId) {
        // Deselect if clicked same vertex
        this.edgeSourceVertexId = null;
        this.render();
      } else {
        // Connect edgeSourceVertexId -> vertexId
        const sourceId = this.edgeSourceVertexId;
        this.edgeSourceVertexId = null;
        this.render();
        if (this.onAddEdgeRequest) {
          this.onAddEdgeRequest(sourceId, vertexId);
        }
      }
      return;
    }

    if (this.mode === 'delete') {
      this.graph.removeVertex(vertexId);
      this.deselectAll();
      this.render();
      if (this.onGraphChanged) this.onGraphChanged();
      return;
    }

    // Default select & drag mode
    this.selectedVertexId = vertexId;
    this.selectedEdgeId = null;
    const vertex = this.graph.vertices.get(vertexId);
    if (vertex) {
      this.isDragging = true;
      this.draggedVertexId = vertexId;
      this.dragOffset = {
        x: pos.x - vertex.x,
        y: pos.y - vertex.y
      };
    }
    this.render();
    if (this.onVertexSelect) this.onVertexSelect(vertexId);
  }

  handleEdgeDown(edgeId) {
    if (this.mode === 'delete') {
      this.graph.removeEdge(edgeId);
      this.deselectAll();
      this.render();
      if (this.onGraphChanged) this.onGraphChanged();
      return;
    }

    this.selectedEdgeId = edgeId;
    this.selectedVertexId = null;
    this.render();
    if (this.onEdgeSelect) this.onEdgeSelect(edgeId);
  }

  deselectAll() {
    this.selectedVertexId = null;
    this.selectedEdgeId = null;
    this.edgeSourceVertexId = null;
    this.render();
  }

  render(overriddenStates = null) {
    const activeVertexStates = (overriddenStates && overriddenStates.vertexStates) ? overriddenStates.vertexStates : null;
    const activeEdgeStates = (overriddenStates && overriddenStates.edgeStates) ? overriddenStates.edgeStates : null;

    this.renderEdges(activeEdgeStates);
    this.renderVertices(activeVertexStates);
  }

  renderEdges(customEdgeStates = null) {
    this.edgesGroup.innerHTML = '';
    this.labelsGroup.innerHTML = '';

    for (const edge of this.graph.edges.values()) {
      const source = this.graph.vertices.get(edge.source);
      const target = this.graph.vertices.get(edge.target);

      if (!source || !target) continue;

      const state = (customEdgeStates && customEdgeStates[edge.id]) ? customEdgeStates[edge.id] : edge.state;
      const isSelected = this.selectedEdgeId === edge.id;

      // Create Edge Line
      const gEdge = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      gEdge.setAttribute('data-edge-id', edge.id);
      gEdge.classList.add('edge-group');
      if (isSelected) gEdge.classList.add('is-selected');

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', source.x);
      line.setAttribute('y1', source.y);
      line.setAttribute('x2', target.x);
      line.setAttribute('y2', target.y);
      line.classList.add('edge-line', `edge-${state}`);

      if (state === 'considering') {
        line.classList.add('edge-pulse');
      }

      gEdge.appendChild(line);

      // Hit area line for easier clicking
      const hitLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      hitLine.setAttribute('x1', source.x);
      hitLine.setAttribute('y1', source.y);
      hitLine.setAttribute('x2', target.x);
      hitLine.setAttribute('y2', target.y);
      hitLine.setAttribute('stroke', 'transparent');
      hitLine.setAttribute('stroke-width', '16');
      hitLine.style.cursor = 'pointer';
      gEdge.appendChild(hitLine);

      this.edgesGroup.appendChild(gEdge);

      // Render Edge Weight Pill Label
      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2;

      const gLabel = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      gLabel.setAttribute('data-edge-id', edge.id);
      gLabel.classList.add('edge-weight-group');
      gLabel.setAttribute('transform', `translate(${midX}, ${midY})`);

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const weightStr = String(edge.weight);
      const pillWidth = Math.max(28, weightStr.length * 9 + 14);
      const pillHeight = 22;

      rect.setAttribute('x', -pillWidth / 2);
      rect.setAttribute('y', -pillHeight / 2);
      rect.setAttribute('width', pillWidth);
      rect.setAttribute('height', pillHeight);
      rect.setAttribute('rx', 11);
      rect.setAttribute('ry', 11);
      rect.classList.add('edge-weight-bg', `weight-bg-${state}`);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', 0);
      text.setAttribute('y', 4);
      text.setAttribute('text-anchor', 'middle');
      text.classList.add('edge-weight-text', `weight-text-${state}`);
      text.textContent = weightStr;

      gLabel.appendChild(rect);
      gLabel.appendChild(text);
      this.labelsGroup.appendChild(gLabel);
    }
  }

  renderVertices(customVertexStates = null) {
    this.verticesGroup.innerHTML = '';
    const nodeRadius = 22;

    for (const vertex of this.graph.vertices.values()) {
      const state = (customVertexStates && customVertexStates[vertex.id]) ? customVertexStates[vertex.id] : vertex.state;
      const isSelected = this.selectedVertexId === vertex.id;
      const isPendingEdgeSource = this.edgeSourceVertexId === vertex.id;

      const gNode = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      gNode.setAttribute('data-vertex-id', vertex.id);
      gNode.setAttribute('transform', `translate(${vertex.x}, ${vertex.y})`);
      gNode.classList.add('vertex-group');
      if (isSelected) gNode.classList.add('is-selected');
      if (isPendingEdgeSource) gNode.classList.add('is-pending-source');

      // Outer highlight ring for selection/current
      const outerRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      outerRing.setAttribute('r', nodeRadius + 5);
      outerRing.classList.add('vertex-ring');
      gNode.appendChild(outerRing);

      // Main Circle Body
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', nodeRadius);
      circle.classList.add('vertex-body', `vertex-${state}`);
      gNode.appendChild(circle);

      // Text Label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', 0);
      text.setAttribute('y', 5);
      text.setAttribute('text-anchor', 'middle');
      text.classList.add('vertex-label', `vertex-label-${state}`);
      text.textContent = vertex.label;
      gNode.appendChild(text);

      this.verticesGroup.appendChild(gNode);
    }
  }
}

// Export module or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SVGRenderer };
} else {
  window.SVGRenderer = SVGRenderer;
}
