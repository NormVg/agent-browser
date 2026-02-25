import { tool } from 'ai';
import { z } from 'zod';
import { stm } from '../lib/memory/stm.js';
import { ltm } from '../lib/memory/ltm.js';
import { consolidate } from '../agents/memory-agent/consolidator.js';

/**
 * Memory tools for main agent
 */

/**
 * Add fact to Short-Term Memory
 */
export const addToSTM = tool({
  description: 'Add a fact or observation to short-term memory buffer. Use this for storing temporary facts from the conversation.',
  inputSchema: z.object({
    content: z.string().describe('Fact or observation to remember temporarily')
  }),
  execute: async ({ content }) => {
    const entry = await stm.add(content);
    const stats = await stm.getStats();

    return {
      success: true,
      entry,
      needsConsolidation: stats.needsConsolidation,
      currentSize: stats.count,
      limit: stats.limit
    };
  }
});

/**
 * Search Long-Term Memory
 */
export const searchLTM = tool({
  description: 'Search long-term memory for facts about people, preferences, projects, etc. Always search before saying you don\'t know something.',
  inputSchema: z.object({
    query: z.string().describe('What to search for (e.g., "TheAlphaOnes", "Vishnu", "projects")')
  }),
  execute: async ({ query }) => {
    const results = await ltm.search(query);

    // Also include related nodes via graph traversal
    const enrichedResults = [];
    for (const node of results) {
      const neighbors = await ltm.getNeighbors(node.id);
      enrichedResults.push({
        ...node,
        connections: neighbors
      });
    }

    return {
      success: true,
      query,
      count: enrichedResults.length,
      results: enrichedResults
    };
  }
});

/**
 * Trigger consolidation
 */
export const consolidateMemory = tool({
  description: 'Manually trigger consolidation of short-term memory into long-term knowledge graph. Usually happens automatically when STM is full.',
  inputSchema: z.object({
    clearSTM: z.boolean().optional().describe('Whether to clear STM after consolidation (default: true)')
  }),
  execute: async ({ clearSTM = true }) => {
    const entries = await stm.getAll();

    if (entries.length === 0) {
      return {
        success: false,
        message: 'No STM entries to consolidate'
      };
    }

    const result = await consolidate(entries, false);

    if (result.success && clearSTM) {
      await stm.clear();
    }

    return {
      ...result,
      entriesProcessed: entries.length,
      stmCleared: clearSTM
    };
  }
});

/**
 * Get memory statistics
 */
export const getMemoryStats = tool({
  description: 'Get statistics about memory system (STM and LTM)',
  inputSchema: z.object({}),
  execute: async () => {
    const stmStats = await stm.getStats();
    const ltmStats = await ltm.getStats();

    return {
      stm: stmStats,
      ltm: ltmStats
    };
  }
});
