import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const NODES_FILE = path.join(DATA_DIR, 'memory-nodes.json');
const EDGES_FILE = path.join(DATA_DIR, 'memory-edges.json');

/**
 * Knowledge Graph Memory Store
 * Provides persistent memory storage for the AI agent
 */
class MemoryGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.loaded = false;
  }

  async ensureLoaded() {
    if (this.loaded) return;

    try {
      await fs.mkdir(DATA_DIR, { recursive: true });

      // Load nodes
      try {
        const nodesData = await fs.readFile(NODES_FILE, 'utf-8');
        const nodes = JSON.parse(nodesData);
        this.nodes = new Map(Object.entries(nodes));
      } catch (err) {
        // File doesn't exist yet, start fresh
        this.nodes = new Map();
      }

      // Load edges
      try {
        const edgesData = await fs.readFile(EDGES_FILE, 'utf-8');
        const edges = JSON.parse(edgesData);
        this.edges = new Map(Object.entries(edges));
      } catch (err) {
        // File doesn't exist yet, start fresh
        this.edges = new Map();
      }

      this.loaded = true;
    } catch (err) {
      console.error('Failed to load memory:', err.message);
      this.nodes = new Map();
      this.edges = new Map();
      this.loaded = true;
    }
  }

  async save() {
    try {
      const nodesObj = Object.fromEntries(this.nodes);
      const edgesObj = Object.fromEntries(this.edges);

      await fs.writeFile(NODES_FILE, JSON.stringify(nodesObj, null, 2));
      await fs.writeFile(EDGES_FILE, JSON.stringify(edgesObj, null, 2));
    } catch (err) {
      throw new Error(`Failed to save memory: ${err.message}`);
    }
  }

  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async createNode(content, type = 'note', tags = []) {
    await this.ensureLoaded();

    const id = this.generateId();
    const node = {
      id,
      type,
      content,
      meta: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: Array.isArray(tags) ? tags : []
      }
    };

    this.nodes.set(id, node);
    await this.save();

    return node;
  }

  async updateNode(id, content) {
    await this.ensureLoaded();

    const node = this.nodes.get(id);
    if (!node) {
      throw new Error(`Node ${id} not found`);
    }

    node.content = content;
    node.meta.updated_at = new Date().toISOString();

    this.nodes.set(id, node);
    await this.save();

    return node;
  }

  async deleteNode(id) {
    await this.ensureLoaded();

    if (!this.nodes.has(id)) {
      throw new Error(`Node ${id} not found`);
    }

    // Delete all edges connected to this node
    const edgesToDelete = [];
    for (const [edgeId, edge] of this.edges) {
      if (edge.from === id || edge.to === id) {
        edgesToDelete.push(edgeId);
      }
    }

    edgesToDelete.forEach(edgeId => this.edges.delete(edgeId));
    this.nodes.delete(id);

    await this.save();

    return { deleted: id, edges_removed: edgesToDelete.length };
  }

  async linkNodes(fromId, toId, label = 'related') {
    await this.ensureLoaded();

    if (!this.nodes.has(fromId)) {
      throw new Error(`Source node ${fromId} not found`);
    }
    if (!this.nodes.has(toId)) {
      throw new Error(`Target node ${toId} not found`);
    }

    const edgeId = this.generateId();
    const edge = {
      id: edgeId,
      from: fromId,
      to: toId,
      label
    };

    this.edges.set(edgeId, edge);
    await this.save();

    return edge;
  }

  async unlinkNodes(edgeId) {
    await this.ensureLoaded();

    if (!this.edges.has(edgeId)) {
      throw new Error(`Edge ${edgeId} not found`);
    }

    this.edges.delete(edgeId);
    await this.save();

    return { deleted: edgeId };
  }

  async getNode(id) {
    await this.ensureLoaded();

    const node = this.nodes.get(id);
    if (!node) {
      throw new Error(`Node ${id} not found`);
    }

    return node;
  }

  async getNeighbors(id) {
    await this.ensureLoaded();

    if (!this.nodes.has(id)) {
      throw new Error(`Node ${id} not found`);
    }

    const outgoing = [];
    const incoming = [];

    for (const edge of this.edges.values()) {
      if (edge.from === id) {
        const targetNode = this.nodes.get(edge.to);
        if (targetNode) {
          outgoing.push({
            edge,
            node: targetNode
          });
        }
      }
      if (edge.to === id) {
        const sourceNode = this.nodes.get(edge.from);
        if (sourceNode) {
          incoming.push({
            edge,
            node: sourceNode
          });
        }
      }
    }

    return { outgoing, incoming };
  }

  async search(query) {
    await this.ensureLoaded();

    const lowerQuery = query.toLowerCase();
    const results = [];

    for (const node of this.nodes.values()) {
      if (node.content.toLowerCase().includes(lowerQuery) ||
        node.type.toLowerCase().includes(lowerQuery) ||
        node.meta.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
        results.push(node);
      }
    }

    return results;
  }

  async getAllNodes() {
    await this.ensureLoaded();
    return Array.from(this.nodes.values());
  }

  async getStats() {
    await this.ensureLoaded();
    return {
      nodes: this.nodes.size,
      edges: this.edges.size
    };
  }
}

// Singleton instance
export const memoryGraph = new MemoryGraph();
