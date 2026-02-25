import { tool } from 'ai';
import { z } from 'zod';
import { runSkillAgent } from '../agents/skill-agent/agent.js';

/**
 * Delegate to Skill Agent
 * Delegates complex tasks to a specialized autonomous agent that can choose and execute skills.
 */
export const delegateToSkillAgent = tool({
  description: 'Delegate a task to a specialized autonomous Skill Agent. The agent will analyze the goal, choose the appropriate skill from available plugins, and execute it. Use this when the user requests skill-based operations.',
  inputSchema: z.object({
    skillId: z.string().optional().describe('Optional: The ID of a specific skill to use (e.g., "system-info", "git-manager"). If not provided, the agent will choose the best skill for the goal.'),
    goal: z.string().describe('A clear description of what needs to be achieved.'),
  }),
  execute: async ({ skillId, goal }) => {
    // Call the worker agent
    const result = await runSkillAgent(skillId, goal);

    return {
      status: 'completed',
      agentResult: result
    };
  },
});
