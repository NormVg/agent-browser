import { tool } from 'ai';
import { z } from 'zod';
import { memoryGraph } from '../lib/memory/graph.js';

/**
 * Memory Graph Tool
 * Allows the AI agent to store, retrieve, and link memories in a knowledge graph
 */
export const memoryTool = tool({
  description: `Persistent memory system using a knowledge graph. Use this to:
- Store important information the user shares
- Remember facts, preferences, or context
- Create connections between related information
- Retrieve stored memories when needed

Available actions: create_node, update_node, delete_node, link_nodes, unlink_nodes, read_node, search, get_neighbors, get_stats`,

  inputSchema: z.object({
    action: z.enum([
      'create_node',
      'update_node',
      'delete_node',
      'link_nodes',
      'unlink_nodes',
      'read_node',
      'search',
      'get_neighbors',
      'get_stats'
    ]).describe('The memory operation to perform'),

    // For create_node
    content: z.string().optional().describe('Content to store (for create_node, update_node)'),
    type: z.enum(['note', 'person', 'task', 'concept', 'event']).optional().describe('Type of node (for create_node)'),
    tags: z.array(z.string()).optional().describe('Tags for categorization (for create_node)'),

    // For operations requiring IDs
    id: z.string().optional().describe('Node ID (for update_node, delete_node, read_node, get_neighbors)'),

    // For link_nodes
    from: z.string().optional().describe('Source node ID (for link_nodes)'),
    to: z.string().optional().describe('Target node ID (for link_nodes)'),
    label: z.string().optional().describe('Relationship label (for link_nodes)'),

    // For unlink_nodes
    edge_id: z.string().optional().describe('Edge ID to remove (for unlink_nodes)'),

    // For search
    query: z.string().optional().describe('Search query (for search)'),
  }),

  execute: async ({ action, content, type, tags, id, from, to, label, edge_id, query }) => {
    try {
      switch (action) {
        case 'create_node': {
          if (!content) {
            return { error: 'content is required for create_node' };
          }
          const node = await memoryGraph.createNode(content, type || 'note', tags || []);
          return {
            success: true,
            action: 'create_node',
            node: node
          };
        }

        case 'update_node': {
          if (!id || !content) {
            return { error: 'id and content are required for update_node' };
          }
          const node = await memoryGraph.updateNode(id, content);
          return {
            success: true,
            action: 'update_node',
            node: node
          };
        }

        case 'delete_node': {
          if (!id) {
            return { error: 'id is required for delete_node' };
          }
          const result = await memoryGraph.deleteNode(id);
          return {
            success: true,
            action: 'delete_node',
            ...result
          };
        }

        case 'link_nodes': {
          if (!from || !to) {
            return { error: 'from and to are required for link_nodes' };
          }
          const edge = await memoryGraph.linkNodes(from, to, label || 'related');
          return {
            success: true,
            action: 'link_nodes',
            edge: edge
          };
        }

        case 'unlink_nodes': {
          if (!edge_id) {
            return { error: 'edge_id is required for unlink_nodes' };
          }
          const result = await memoryGraph.unlinkNodes(edge_id);
          return {
            success: true,
            action: 'unlink_nodes',
            ...result
          };
        }

        case 'read_node': {
          if (!id) {
            return { error: 'id is required for read_node' };
          }
          const node = await memoryGraph.getNode(id);
          return {
            success: true,
            action: 'read_node',
            node: node
          };
        }

        case 'search': {
          if (!query) {
            return { error: 'query is required for search' };
          }
          const results = await memoryGraph.search(query);
          return {
            success: true,
            action: 'search',
            query: query,
            count: results.length,
            results: results
          };
        }

        case 'get_neighbors': {
          if (!id) {
            return { error: 'id is required for get_neighbors' };
          }
          const neighbors = await memoryGraph.getNeighbors(id);
          return {
            success: true,
            action: 'get_neighbors',
            node_id: id,
            outgoing_count: neighbors.outgoing.length,
            incoming_count: neighbors.incoming.length,
            ...neighbors
          };
        }

        case 'get_stats': {
          const stats = await memoryGraph.getStats();
          return {
            success: true,
            action: 'get_stats',
            ...stats
          };
        }

        default:
          return { error: `Unknown action: ${action}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
});
