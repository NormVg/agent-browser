import { Orchestrator } from '../agent/orchestrator/index.js';
import { z } from 'zod';
import { tool } from 'ai';

export const runBrowserAgent = tool({
  description: 'Run an autonomous Browser Agent to complete a web-based goal. The agent can navigate, type, click, and read pages.',
  parameters: z.object({
    goal: z.string().describe('The natural-language goal for the agent (e.g., "Go to github.com and find the top trending JS repo")'),
    showBrowser: z.boolean().describe('Set to true if you think the user needs or wants to watch the browser UI during execution, false otherwise.'),
  }),
  execute: async ({ goal, showBrowser }) => {
    const maxSteps = 25;
    try {
      const orchestrator = new Orchestrator();
      const result = await orchestrator.run(goal, maxSteps, !showBrowser);
      return result || `Agent aborted or failed to complete the goal within ${maxSteps} steps.`;
    } catch (error) {
      return `Browser Agent failed: ${error.message}`;
    }
  },
});
