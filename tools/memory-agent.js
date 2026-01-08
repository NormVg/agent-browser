import { tool } from 'ai';
import { z } from 'zod';
import { runMemoryAgent } from '../agents/memory-agent/agent.js';

/**
 * Delegate to Memory Agent
 * For complex memory operations beyond simple storage
 */
export const delegateToMemoryAgent = tool({
  description: 'Delegate complex memory operations to the Memory Agent. Use this for: merging duplicate memories, creating structured relationships, cleaning up memory, reorganizing information, or any memory task requiring reasoning.',
  inputSchema: z.object({
    task: z.string().describe('A clear description of the memory operation to perform (e.g., "merge all company-related nodes", "create relationships between Vishnu and his projects", "clean up duplicate preference entries")')
  }),
  execute: async ({ task }) => {
    const result = await runMemoryAgent(task);
    return {
      status: 'completed',
      result: result
    };
  },
});
