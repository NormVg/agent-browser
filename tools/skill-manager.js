import { tool } from 'ai';
import { z } from 'zod';
import { registry } from '../lib/plugins/registry.js';

/**
 * Activate Skill Tool
 * Allows the AI to load the instructions for a specific skill.
 */
export const activateSkill = tool({
  description: 'Activate a specific skill to load its instructions. IMPORTANT: If the user\'s request was a direct command (e.g., "check system info"), you should IMMEDIATELY follow up by using the skill\'s tools (e.g., `run_skill_script`) in the same turn. Do not stop to ask for confirmation unless the request is ambiguous.',
  inputSchema: z.object({
    skillId: z.string().describe('The ID of the skill to activate (e.g., "system-info", "hello-world").'),
  }),
  execute: async ({ skillId }) => {
    const instructions = registry.activatePlugin(skillId);

    if (!instructions) {
      return {
        error: `Skill '${skillId}' not found.`,
      };
    }

    return {
      status: 'active',
      skill: skillId,
      instructions: instructions,
      message: 'Skill activated. Instructions loaded. If the user request is clear, PROCEED IMMEDIATELY to run the necessary scripts using `run_skill_script`.',
    };
  },
});
