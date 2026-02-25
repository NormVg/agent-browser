import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

// Paths to dual-memory files
const STM_FILE = path.join(__dirname, '../data/memory/stm.json');
const LTM_NODES_FILE = path.join(__dirname, '../data/memory/ltm-nodes.json');
const LTM_EDGES_FILE = path.join(__dirname, '../data/memory/ltm-edges.json');

// Serve static files
app.use(express.static(__dirname));

// API endpoint for STM
app.get('/api/stm', async (req, res) => {
  try {
    const data = await fs.readFile(STM_FILE, 'utf-8');
    const stm = JSON.parse(data);
    res.json(stm);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.json([]);
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// API endpoint for LTM nodes
app.get('/api/ltm/nodes', async (req, res) => {
  try {
    const data = await fs.readFile(LTM_NODES_FILE, 'utf-8');
    const nodes = JSON.parse(data);
    res.json(nodes);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.json({});
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// API endpoint for LTM edges
app.get('/api/ltm/edges', async (req, res) => {
  try {
    const data = await fs.readFile(LTM_EDGES_FILE, 'utf-8');
    const edges = JSON.parse(data);
    res.json(edges);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.json({});
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`\n🧠 Dual-Memory Visualizer`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n📊 Server running at: http://localhost:${PORT}`);
  console.log(`\n💡 Open your browser to visualize STM + LTM!`);
  console.log(`\n🔄 Updates every 5 seconds automatically`);
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});
