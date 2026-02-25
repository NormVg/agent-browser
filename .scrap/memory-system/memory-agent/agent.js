import { ToolLoopAgent, stepCountIs } from 'ai';
import { tool } from 'ai';
import { z } from 'zod';
import chalk from 'chalk';
import { getModel } from '../../lib/ai.js';
import { memoryGraph } from '../../lib/memory/graph.js';

/**
 * Memory Agent - Autonomous agent for complex memory operations
 * Handles: merging, deduplication, relationship creation, cleanup
 */

// Tools available to Memory Agent
const getMemoryStats = tool({
  description: 'Get statistics about the memory graph',
  inputSchema: z.object({}),
  execute: async () => {
    return await memoryGraph.getStats();
  }
});

const searchMemory = tool({
  description: 'Search for nodes in memory',
  inputSchema: z.object({
    query: z.string().describe('Search query')
  }),
  execute: async ({ query }) => {
    return await memoryGraph.search(query);
  }
});

const getAllNodes = tool({
  description: 'Get all memory nodes',
  inputSchema: z.object({}),
  execute: async () => {
    return await memoryGraph.getAllNodes();
  }
});

const createNode = tool({
  description: 'Create a new memory node',
  inputSchema: z.object({
    content: z.string(),
    type: z.enum(['note', 'person', 'task', 'concept', 'event']),
    tags: z.array(z.string()).optional()
  }),
  execute: async ({ content, type, tags }) => {
    return await memoryGraph.createNode(content, type, tags || []);
  }
});

const updateNode = tool({
  description: 'Update an existing memory node',
  inputSchema: z.object({
    id: z.string(),
    content: z.string()
  }),
  execute: async ({ id, content }) => {
    return await memoryGraph.updateNode(id, content);
  }
});

const deleteNode = tool({
  description: 'Delete a memory node',
  inputSchema: z.object({
    id: z.string()
  }),
  execute: async ({ id }) => {
    return await memoryGraph.deleteNode(id);
  }
});

const linkNodes = tool({
  description: 'Create a relationship between two nodes',
  inputSchema: z.object({
    from: z.string(),
    to: z.string(),
    label: z.string()
  }),
  execute: async ({ from, to, label }) => {
    return await memoryGraph.linkNodes(from, to, label);
  }
});

const getNeighbors = tool({
  description: 'Get all nodes connected to a specific node',
  inputSchema: z.object({
    id: z.string()
  }),
  execute: async ({ id }) => {
    return await memoryGraph.getNeighbors(id);
  }
});

/**
 * Run the Memory Agent for complex memory operations
 * @param {string} task - What the agent should do
 * @param {boolean} silent - Run silently in background (default: false)
 */
export async function runMemoryAgent(task, silent = false) {
  if (!silent) {
    console.log(chalk.yellow(`\n💾 MEMORY AGENT: Starting...`));
  }

  const instructions = `
You are an autonomous Memory Agent that manages a knowledge graph after each conversation.

TASK: ${task}

YOUR GOAL:
Extract facts and build structured knowledge from the conversation above.

OPERATIONS:
1. Search for existing related nodes (avoid duplicates!)
2. Create nodes for: names, preferences, facts, projects, companies, skills, tools
3. Link related nodes with meaningful relationships
4. Update existing nodes instead of creating duplicates
5. Use appropriate node types: person, note, task, concept, event

BEST PRACTICES:
- Search before creating (check for similar content)
- Link entities together (e.g., "Vishnu" → founder_of → "TheAlphaOnes")
- Use clear, descriptive relationship labels
- Store factual, stable information only
- Keep content concise and well-formatted

WORK EFFICIENTLY:
- Don't create nodes for trivial greetings or acknowledgments
- Focus on meaningful, memorable information
- Be concise - this runs after EVERY conversation turn
`;

  try {
    const agent = new ToolLoopAgent({
      model: getModel(),
      instructions: instructions,
      tools: {
        getMemoryStats,
        searchMemory,
        getAllNodes,
        createNode,
        updateNode,
        deleteNode,
        linkNodes,
        getNeighbors
      },
      stopWhen: stepCountIs(10), // Max 10 steps for efficiency
    });

    const result = await agent.generate({
      prompt: task,
    });

    if (!silent) {
      console.log(chalk.yellow(`💾 MEMORY AGENT: Completed (${result.steps.length} steps).`));
    }

    return result.text || "Memory operation completed.";

  } catch (error) {
    if (!silent) {
      console.error(chalk.red(`💾 MEMORY AGENT Error: ${error.message}`));
    }
    return `Error: ${error.message}`;
  }
}
