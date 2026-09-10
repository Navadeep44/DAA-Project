/**
 * Automated Unit & Topological Tests for MST Visualizer Engine
 * Run using `node js/tests.js`
 */

const { UnionFind } = require('./unionFind.js');
const { Graph } = require('./graphEngine.js');
const { KruskalAlgorithm } = require('./algorithms/kruskal.js');
const { PrimAlgorithm } = require('./algorithms/prim.js');

function runTests() {
  console.log('==================================================');
  console.log('Running MST Visualizer Unit & Topological Tests');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✕ FAIL: ${message}`);
      failed++;
    }
  }

  // --------------------------------------------------
  // Test 1: UnionFind Data Structure
  // --------------------------------------------------
  console.log('Test Suite 1: UnionFind Data Structure');
  const uf = new UnionFind(['A', 'B', 'C', 'D']);
  assert(!uf.connected('A', 'B'), 'Initial elements A and B should not be connected');
  assert(uf.union('A', 'B') === true, 'Union A and B should return true');
  assert(uf.connected('A', 'B'), 'A and B should now be connected');
  assert(uf.union('B', 'C') === true, 'Union B and C should return true');
  assert(uf.connected('A', 'C'), 'A and C should be connected via B (transitive path compression)');
  assert(uf.union('A', 'C') === false, 'Union A and C should return false (cycle detection)');

  // --------------------------------------------------
  // Test 2: Graph Connectivity & Sample Graph
  // --------------------------------------------------
  console.log('\nTest Suite 2: Graph Model & Sample Graph Topology');
  const g = new Graph();
  g.loadSampleGraph();

  assert(g.vertices.size === 5, 'Sample graph should contain 5 vertices (A, B, C, D, E)');
  assert(g.edges.size === 7, 'Sample graph should contain 7 edges');
  
  const validation = g.validateForMST();
  assert(validation.valid === true, 'Sample graph should be valid for MST');

  // --------------------------------------------------
  // Test 3: Kruskal Algorithm Execution
  // --------------------------------------------------
  console.log('\nTest Suite 3: Kruskal Algorithm Execution');
  const kruskalSteps = KruskalAlgorithm.generateSteps(g);
  assert(kruskalSteps.length > 0, 'Kruskal algorithm should generate execution steps');

  const finalKruskalStep = kruskalSteps[kruskalSteps.length - 1];
  assert(finalKruskalStep.isFinished === true, 'Final Kruskal step should be marked isFinished');
  assert(finalKruskalStep.mstEdges.length === 4, 'Kruskal MST should contain V-1 = 4 edges');
  assert(finalKruskalStep.totalWeight === 10, 'Kruskal MST total cost should equal 10 for sample graph');

  // Expected accepted edges for sample graph:
  // C-D (1), A-B (2), B-C (3), D-E (4) -> total = 10
  console.log(`    Kruskal MST Total Cost calculated: ${finalKruskalStep.totalWeight}`);

  // --------------------------------------------------
  // Test 4: Prim Algorithm Execution
  // --------------------------------------------------
  console.log('\nTest Suite 4: Prim Algorithm Execution');
  const startV = Array.from(g.vertices.values())[0];
  const primSteps = PrimAlgorithm.generateSteps(g, startV.id);
  assert(primSteps.length > 0, 'Prim algorithm should generate execution steps');

  const finalPrimStep = primSteps[primSteps.length - 1];
  assert(finalPrimStep.isFinished === true, 'Final Prim step should be marked isFinished');
  assert(finalPrimStep.mstEdges.length === 4, 'Prim MST should contain V-1 = 4 edges');
  assert(finalPrimStep.totalWeight === 10, 'Prim MST total cost should equal 10 for sample graph');

  console.log(`    Prim MST Total Cost calculated: ${finalPrimStep.totalWeight}`);

  // --------------------------------------------------
  // Test 5: Disconnected Graph Validation
  // --------------------------------------------------
  console.log('\nTest Suite 5: Disconnected Graph Detection');
  const discGraph = new Graph();
  const v1 = discGraph.addVertex(0, 0, 'X');
  const v2 = discGraph.addVertex(100, 0, 'Y');
  const v3 = discGraph.addVertex(200, 0, 'Z');
  discGraph.addEdge(v1.id, v2.id, 5); // Z is isolated

  const discVal = discGraph.validateForMST();
  assert(discVal.valid === false, 'Disconnected graph should fail MST validation');
  assert(discVal.error.includes('disconnected'), 'Validation error should specify graph is disconnected');

  // --------------------------------------------------
  // Test Results Summary
  // --------------------------------------------------
  console.log('\n==================================================');
  console.log(`Test Execution Complete: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
