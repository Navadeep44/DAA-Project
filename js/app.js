/**
 * Main Application Controller for MST Visualizer
 * Binds UI controls, state management, algorithm execution, and SVG rendering.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Model & Renderer Instances
  const graph = new Graph();
  const svgElement = document.getElementById('graph-svg');
  const renderer = new SVGRenderer(svgElement, graph);

  // Application State
  let currentAlgorithm = 'kruskal'; // 'kruskal' | 'prim'
  let primStartVertexId = null;
  let steps = [];
  let currentStepIndex = -1;
  let isPlaying = false;
  let playIntervalId = null;
  let playSpeedMs = 800;

  // Pending Add Edge Modal State
  let pendingEdgeSourceId = null;
  let pendingEdgeTargetId = null;

  // UI Element References
  const algoButtons = document.querySelectorAll('#algo-selector .segmented-btn');
  const primStartContainer = document.getElementById('prim-start-container');
  const primStartSelect = document.getElementById('prim-start-vertex');

  // Playback Buttons
  const btnStart = document.getElementById('btn-start');
  const btnNext = document.getElementById('btn-next');
  const btnPlay = document.getElementById('btn-play');
  const btnPause = document.getElementById('btn-pause');
  const btnReset = document.getElementById('btn-reset');
  const speedSlider = document.getElementById('speed-slider');
  const speedValueDisplay = document.getElementById('speed-value');

  // Graph Tool Buttons
  const btnModeSelect = document.getElementById('btn-mode-select');
  const btnModeVertex = document.getElementById('btn-mode-vertex');
  const btnModeEdge = document.getElementById('btn-mode-edge');
  const btnModeDelete = document.getElementById('btn-mode-delete');
  const btnLoadSample = document.getElementById('btn-load-sample');
  const btnClearGraph = document.getElementById('btn-clear-graph');
  const btnEmptyAddVertex = document.getElementById('btn-empty-add-vertex');

  // Header & Canvas Badges
  const headingAlgoTitle = document.getElementById('current-algorithm-heading');
  const badgeCanvasMode = document.getElementById('canvas-mode-badge');
  const emptyStateContainer = document.getElementById('canvas-empty-state');
  const badgeMSTStatus = document.getElementById('mst-status-badge');

  // Statistics
  const statVertices = document.getElementById('stat-vertices');
  const statEdges = document.getElementById('stat-edges');
  const statMSTEdges = document.getElementById('stat-mst-edges');
  const statTotalWeight = document.getElementById('stat-total-weight');
  const statCurrentStep = document.getElementById('stat-current-step');

  // Log & Results
  const logContainer = document.getElementById('log-container');
  const btnClearLog = document.getElementById('btn-clear-log');
  const mstResultsTbody = document.getElementById('mst-results-tbody');

  // Explanations & Complexity
  const explanationTitle = document.getElementById('explanation-title');
  const explanationList = document.getElementById('explanation-list');
  const complexityTime = document.getElementById('complexity-time');
  const complexitySpace = document.getElementById('complexity-space');

  // Modals
  const modalAddEdge = document.getElementById('modal-add-edge');
  const modalEdgeEndpoints = document.getElementById('modal-edge-endpoints');
  const edgeWeightInput = document.getElementById('edge-weight-input');
  const btnModalCancelEdge = document.getElementById('btn-modal-cancel-edge');
  const btnModalSubmitEdge = document.getElementById('btn-modal-submit-edge');

  const modalClearConfirm = document.getElementById('modal-clear-confirm');
  const btnModalCancelClear = document.getElementById('btn-modal-cancel-clear');
  const btnModalSubmitClear = document.getElementById('btn-modal-submit-clear');

  // ==========================================
  // INITIALIZATION & PRESETS
  // ==========================================
  function init() {
    const container = document.getElementById('canvas-container');
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // Load initial sample graph
    graph.loadSampleGraph(width, height);
    updatePrimVertexDropdown();
    renderer.render();

    attachEventListeners();
    updateUIForSelectedAlgorithm();
    updateStats();
    checkEmptyState();
  }

  // ==========================================
  // EVENT LISTENERS BINDING
  // ==========================================
  function attachEventListeners() {
    // Algorithm Selector
    algoButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        algoButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentAlgorithm = btn.getAttribute('data-algo');
        updateUIForSelectedAlgorithm();
        resetExecution();
      });
    });

    // Prim Start Vertex Dropdown
    primStartSelect.addEventListener('change', () => {
      primStartVertexId = primStartSelect.value;
      resetExecution();
    });

    // Playback Controls
    btnStart.addEventListener('click', startAlgorithm);
    btnNext.addEventListener('click', nextStep);
    btnPlay.addEventListener('click', playAlgorithm);
    btnPause.addEventListener('click', pauseAlgorithm);
    btnReset.addEventListener('click', resetExecution);

    speedSlider.addEventListener('input', () => {
      const val = Number(speedSlider.value);
      playSpeedMs = val;
      speedValueDisplay.textContent = `${(val / 1000).toFixed(1)}s`;
      if (isPlaying) {
        pauseAlgorithm();
        playAlgorithm();
      }
    });

    // Graph Editing Tools
    btnModeSelect.addEventListener('click', () => setCanvasMode('select'));
    btnModeVertex.addEventListener('click', () => setCanvasMode('add_vertex'));
    btnModeEdge.addEventListener('click', () => setCanvasMode('add_edge'));
    btnModeDelete.addEventListener('click', () => setCanvasMode('delete'));

    btnLoadSample.addEventListener('click', () => {
      const container = document.getElementById('canvas-container');
      graph.loadSampleGraph(container.clientWidth || 800, container.clientHeight || 500);
      updatePrimVertexDropdown();
      resetExecution();
      renderer.render();
      updateStats();
      checkEmptyState();
      toast.info('Sample graph loaded.');
    });

    btnClearGraph.addEventListener('click', () => {
      modalClearConfirm.classList.add('active');
    });

    btnEmptyAddVertex.addEventListener('click', () => {
      setCanvasMode('add_vertex');
    });

    // Renderer Callbacks
    renderer.onCanvasClick = (x, y) => {
      if (renderer.mode === 'add_vertex') {
        const v = graph.addVertex(x, y);
        updatePrimVertexDropdown();
        renderer.render();
        updateStats();
        checkEmptyState();
        resetExecution();
        toast.info(`Added Vertex ${v.label}`);
      }
    };

    renderer.onAddEdgeRequest = (sourceId, targetId) => {
      openAddEdgeModal(sourceId, targetId);
    };

    renderer.onGraphChanged = () => {
      updatePrimVertexDropdown();
      updateStats();
      checkEmptyState();
      resetExecution();
    };

    // Modal Events
    btnModalCancelEdge.addEventListener('click', closeAddEdgeModal);
    btnModalSubmitEdge.addEventListener('click', submitAddEdge);

    btnModalCancelClear.addEventListener('click', () => modalClearConfirm.classList.remove('active'));
    btnModalSubmitClear.addEventListener('click', () => {
      modalClearConfirm.classList.remove('active');
      graph.clear();
      updatePrimVertexDropdown();
      renderer.render();
      updateStats();
      checkEmptyState();
      resetExecution();
      clearLog();
      addLogEntry('✓', 'Graph cleared. Add vertices and edges to begin.', 'info');
      toast.info('Graph cleared.');
    });

    btnClearLog.addEventListener('click', () => {
      clearLog();
      addLogEntry('✓', 'Log cleared.', 'info');
    });
  }

  // ==========================================
  // ALGORITHM & UI SWITCHING
  // ==========================================
  function updateUIForSelectedAlgorithm() {
    if (currentAlgorithm === 'kruskal') {
      headingAlgoTitle.textContent = 'Kruskal’s Algorithm';
      primStartContainer.style.display = 'none';

      explanationTitle.textContent = 'How Kruskal’s Algorithm Works';
      explanationList.innerHTML = `
        <li>Sort all edges in non-decreasing order of their weight.</li>
        <li>Pick the smallest edge and check if it forms a cycle using <strong>Union-Find (DSU)</strong>.</li>
        <li>If cycle is not formed, include this edge in the MST. Else, reject it.</li>
        <li>Repeat until there are \\(V - 1\\) edges in the spanning tree.</li>
      `;

      complexityTime.textContent = 'O(E log E)';
      complexitySpace.textContent = 'O(V + E)';
    } else {
      headingAlgoTitle.textContent = 'Prim’s Algorithm';
      primStartContainer.style.display = 'block';
      updatePrimVertexDropdown();

      explanationTitle.textContent = 'How Prim’s Algorithm Works';
      explanationList.innerHTML = `
        <li>Start with an arbitrary starting vertex and mark it as visited.</li>
        <li>Find the minimum-weight edge connecting the visited set to an unvisited vertex across the cut.</li>
        <li>Add the edge and the new vertex to the MST.</li>
        <li>Repeat until all vertices in the graph are visited.</li>
      `;

      complexityTime.textContent = 'O(E log V)';
      complexitySpace.textContent = 'O(V + E)';
    }
  }

  function updatePrimVertexDropdown() {
    primStartSelect.innerHTML = '';
    const vertices = Array.from(graph.vertices.values());

    if (vertices.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No vertices available';
      primStartSelect.appendChild(option);
      primStartVertexId = null;
      return;
    }

    vertices.forEach(v => {
      const option = document.createElement('option');
      option.value = v.id;
      option.textContent = `Vertex ${v.label}`;
      primStartSelect.appendChild(option);
    });

    if (!primStartVertexId || !graph.vertices.has(primStartVertexId)) {
      primStartVertexId = vertices[0].id;
    }
    primStartSelect.value = primStartVertexId;
  }

  function setCanvasMode(mode) {
    renderer.setMode(mode);
    btnModeSelect.classList.toggle('active', mode === 'select');
    btnModeVertex.classList.toggle('active', mode === 'add_vertex');
    btnModeEdge.classList.toggle('active', mode === 'add_edge');
    btnModeDelete.classList.toggle('active', mode === 'delete');

    let modeText = 'Select / Drag';
    if (mode === 'add_vertex') modeText = 'Add Vertex (Click Canvas)';
    if (mode === 'add_edge') modeText = 'Add Edge (Click Source then Target)';
    if (mode === 'delete') modeText = 'Delete Item (Click Node or Edge)';

    badgeCanvasMode.textContent = `Mode: ${modeText}`;
  }

  // ==========================================
  // MODAL HANDLERS FOR ADD EDGE
  // ==========================================
  function openAddEdgeModal(sourceId, targetId) {
    pendingEdgeSourceId = sourceId;
    pendingEdgeTargetId = targetId;

    const sourceV = graph.vertices.get(sourceId);
    const targetV = graph.vertices.get(targetId);

    modalEdgeEndpoints.textContent = `Connecting Vertex ${sourceV.label} to Vertex ${targetV.label}`;
    edgeWeightInput.value = '1';
    modalAddEdge.classList.add('active');

    setTimeout(() => {
      edgeWeightInput.focus();
      edgeWeightInput.select();
    }, 100);
  }

  function closeAddEdgeModal() {
    modalAddEdge.classList.remove('active');
    pendingEdgeSourceId = null;
    pendingEdgeTargetId = null;
  }

  function submitAddEdge() {
    if (!pendingEdgeSourceId || !pendingEdgeTargetId) return;
    const weight = Number(edgeWeightInput.value);

    try {
      const edge = graph.addEdge(pendingEdgeSourceId, pendingEdgeTargetId, weight);
      closeAddEdgeModal();
      renderer.render();
      updateStats();
      checkEmptyState();
      resetExecution();
      const sourceV = graph.vertices.get(edge.source);
      const targetV = graph.vertices.get(edge.target);
      toast.success(`Added Edge ${sourceV.label}-${targetV.label} with weight ${edge.weight}`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  // ==========================================
  // ALGORITHM EXECUTION PLAYBACK ENGINE
  // ==========================================
  function startAlgorithm() {
    pauseAlgorithm();

    const validation = graph.validateForMST();
    if (!validation.valid) {
      toast.warning(validation.error);
      addLogEntry('⚠', validation.error, 'warning');
      badgeMSTStatus.textContent = 'Status: Validation Failed';
      badgeMSTStatus.style.borderColor = 'var(--color-warning)';
      return false;
    }

    // Generate steps
    if (currentAlgorithm === 'kruskal') {
      steps = KruskalAlgorithm.generateSteps(graph);
    } else {
      steps = PrimAlgorithm.generateSteps(graph, primStartVertexId);
    }

    currentStepIndex = 0;
    clearLog();
    applyStep(steps[0]);

    btnNext.disabled = false;
    btnPlay.disabled = false;
    btnPause.disabled = true;

    badgeMSTStatus.textContent = 'Status: In Progress';
    badgeMSTStatus.style.borderColor = 'var(--color-indigo)';

    toast.info(`Started ${currentAlgorithm === 'kruskal' ? 'Kruskal’s' : 'Prim’s'} Algorithm`);
    return true;
  }

  function nextStep() {
    if (steps.length === 0 || currentStepIndex < 0) {
      if (!startAlgorithm()) return;
      return;
    }

    if (currentStepIndex < steps.length - 1) {
      currentStepIndex++;
      applyStep(steps[currentStepIndex]);
    } else {
      pauseAlgorithm();
      toast.success('Algorithm completed!');
    }
  }

  function playAlgorithm() {
    if (steps.length === 0 || currentStepIndex < 0 || currentStepIndex >= steps.length - 1) {
      if (!startAlgorithm()) return;
    }

    isPlaying = true;
    btnPlay.disabled = true;
    btnPause.disabled = false;

    playIntervalId = setInterval(() => {
      if (currentStepIndex < steps.length - 1) {
        currentStepIndex++;
        applyStep(steps[currentStepIndex]);
      } else {
        pauseAlgorithm();
        toast.success('Algorithm completed!');
      }
    }, playSpeedMs);
  }

  function pauseAlgorithm() {
    isPlaying = false;
    if (playIntervalId) {
      clearInterval(playIntervalId);
      playIntervalId = null;
    }
    btnPlay.disabled = false;
    btnPause.disabled = true;
  }

  function resetExecution() {
    pauseAlgorithm();
    steps = [];
    currentStepIndex = -1;

    graph.resetStates();
    renderer.render();

    btnNext.disabled = false;
    btnPlay.disabled = false;
    btnPause.disabled = true;

    badgeMSTStatus.textContent = 'Status: Ready';
    badgeMSTStatus.style.borderColor = 'rgba(217, 222, 232, 0.15)';

    statMSTEdges.textContent = '0';
    statTotalWeight.textContent = '0';
    statCurrentStep.textContent = '0';

    updateResultTable([]);
  }

  function applyStep(step) {
    if (!step) return;

    // Apply visual states to SVG renderer
    renderer.render({
      vertexStates: step.vertexStates,
      edgeStates: step.edgeStates
    });

    // Add entry to execution log
    addLogEntry(step.logIcon || '✓', step.message, step.logType || 'info');

    // Update Statistics
    statMSTEdges.textContent = step.mstEdges ? step.mstEdges.length : 0;
    statTotalWeight.textContent = step.totalWeight !== undefined ? step.totalWeight : 0;
    statCurrentStep.textContent = `${step.stepIndex || 0} / ${steps.length}`;

    // Update Results Table
    if (step.mstEdges) {
      updateResultTable(step.mstEdges);
    }

    if (step.isFinished) {
      badgeMSTStatus.textContent = 'Status: Completed';
      badgeMSTStatus.style.borderColor = 'var(--color-success)';
      btnNext.disabled = true;
      btnPlay.disabled = true;
    }
  }

  // ==========================================
  // UI LOG & RESULT SUMMARY HELPERS
  // ==========================================
  function addLogEntry(icon, text, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.innerHTML = `
      <span class="log-badge">${icon}</span>
      <span class="log-text">${escapeHtml(text)}</span>
    `;

    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  function clearLog() {
    logContainer.innerHTML = '';
  }

  function updateResultTable(mstEdges) {
    if (!mstEdges || mstEdges.length === 0) {
      mstResultsTbody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align: center; color: var(--color-muted-blue); padding: 16px;">
            Run algorithm to generate Minimum Spanning Tree
          </td>
        </tr>
      `;
      return;
    }

    mstResultsTbody.innerHTML = mstEdges.map((e, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${e.sourceLabel} — ${e.targetLabel}</td>
        <td>${e.weight}</td>
      </tr>
    `).join('');
  }

  function updateStats() {
    statVertices.textContent = graph.vertices.size;
    statEdges.textContent = graph.edges.size;
  }

  function checkEmptyState() {
    if (graph.vertices.size === 0) {
      emptyStateContainer.style.display = 'flex';
    } else {
      emptyStateContainer.style.display = 'none';
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Start initialization
  init();
});
