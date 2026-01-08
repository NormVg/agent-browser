import { memoryGraph } from '../lib/memory/graph.js';

console.log('🧪 Testing Memory Graph API...\n');

async function test() {
  try {
    // Load the graph
    await memoryGraph.ensureLoaded();

    // Get all nodes
    const nodes = await memoryGraph.getAllNodes();
    const edges = Array.from(memoryGraph.edges.values());

    console.log(`✅ Loaded successfully!`);
    console.log(`📊 Nodes: ${nodes.length}`);
    console.log(`🔗 Edges: ${edges.length}`);
    console.log('\n📄 Node Data:');
    console.log(JSON.stringify(nodes, null, 2));
    console.log('\n🔗 Edge Data:');
    console.log(JSON.stringify(edges, null, 2));

    // Test what the API would return
    const apiResponse = { nodes, edges };
    console.log('\n📡 API Response:');
    console.log(JSON.stringify(apiResponse, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
