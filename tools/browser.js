import { Orchestrator } from '../agent/orchestrator/index.js';
import { z } from 'zod';
import { tool } from 'ai';
import chalk from 'chalk';

/**
 * Create the browser agent tool with access to the chat's readline.
 * This avoids the stdin conflict where two readline interfaces fight.
 */
export function createBrowserTool(rl) {
  // Build the askUserFn that reuses chat.js's readline
  const askUserFn = (question) => {
    return new Promise((resolve) => {
      console.log(chalk.yellow(`\n[Agent Question] ${question}`));
      rl.question(chalk.cyan('You ❯ '), (answer) => {
        resolve(answer.trim());
      });
    });
  };

  return tool({
    description: 'Run an autonomous Browser Agent to complete a web-based goal. The agent can navigate, type, click, and read pages using your real Chrome browser with all your logins and cookies.',
    parameters: z.object({
      goal: z.string().describe('The natural-language goal for the agent'),
      showBrowser: z.boolean().describe('Set to true if the user wants to watch the browser'),
    }),
    execute: async ({ goal, showBrowser }) => {
      const maxSteps = 25;
      try {
        const orchestrator = new Orchestrator({ askUserFn });
        const result = await orchestrator.run(goal, maxSteps, !showBrowser);
        return result || `Agent could not complete the goal within ${maxSteps} rounds.`;
      } catch (error) {
        return `Browser Agent failed: ${error.message}`;
      }
    },
  });
}
