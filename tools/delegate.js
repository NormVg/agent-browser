import { tool } from 'ai';
import { z } from 'zod';
import { runSkillAgent } from './skill-agent.js';

/**
 * Delegate to Skill Agent Tool
 * Allows the Main Agent to delegate complex skill-based tasks to a specialized worker.
 */
export const delegateToSkillAgent = tool({
  description: 'Delegate a task to a specialized Skill Agent. Use this when the user requests a specific skill (e.g., System Info, Git, etc.).',
  inputSchema: z.object({
    skillId: z.string().describe('The ID of the skill to use (e.g., "system-info", "git-manager").'),
    goal: z.string().describe('A clear description of what needs to be achieved using this skill.'),
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
