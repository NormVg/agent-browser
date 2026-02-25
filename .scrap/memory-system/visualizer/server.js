import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { memoryGraph } from '../lib/memory/graph.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API endpoint to get graph data
  if (req.url === '/api/graph') {
    try {
      await memoryGraph.ensureLoaded();
      const nodes = await memoryGraph.getAllNodes();
      const edges = Array.from(memoryGraph.edges.values());

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ nodes, edges }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // Serve the HTML file
  if (req.url === '/' || req.url === '/index.html') {
    try {
      const htmlPath = path.join(__dirname, 'index.html');
      const html = await fs.readFile(htmlPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch (error) {
      res.writeHead(404);
      res.end('Not found');
    }
    return;
  }

  // 404 for everything else
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n🧠 Knowledge Graph Visualizer`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n📊 Server running at: http://localhost:${PORT}`);
  console.log(`\n💡 Open your browser to visualize the graph!`);
  console.log(`\n🔄 Updates every 5 seconds automatically`);
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});
