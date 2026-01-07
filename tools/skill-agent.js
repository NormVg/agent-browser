import { ToolLoopAgent, stepCountIs } from 'ai';
import { getModel } from '../lib/ai.js';
import config from '../config.js';
import { activateSkill } from './skill-manager.js';
import { runSkillScript } from './skill-runner.js';
import { registry } from '../lib/plugins/registry.js';
import chalk from 'chalk';

/**
 * Skill Agent (Worker)
 *
 * This agent is responsible for executing a specific skill using a ToolLoopAgent.
 * The agent will:
 * 1. Activate the skill to load instructions.
 * 2. Run the described script.
 * 3. Return a summary of the result.
 */
export async function runSkillAgent(skillId, goal) {
  console.log(chalk.yellow(`\n🔸 SKILL AGENT: Starting '${skillId}'...`));

  // 1. Validate skill exists
  const plugins = registry.listPlugins();
  const plugin = plugins.find(p => p.id === skillId);

  if (!plugin) {
    return `Error: Skill '${skillId}' not found.`;
  }

  // 2. System Instructions for the Worker Agent
  const instructions = `
You are a specialized Skill Agent executing the '${plugin.name}' skill.

GOAL: ${goal}

WORKFLOW:
1. Use \`activateSkill('${skillId}')\` to load the skill instructions.
2. Read the instructions carefully.
3. Use \`runSkill Script\` to execute the described script with appropriate arguments.
4. If the script fails, retry with corrected arguments.
5. Produce a concise summary of the results.

RULES:
- You are autonomous. Do NOT ask for clarification.
- You MUST generate a final text response summarizing your findings.
`;

  try {
    // 3. Create the ToolLoopAgent
    const agent = new ToolLoopAgent({
      model: getModel(),
      instructions: instructions,
      tools: {
        activateSkill,
        runSkillScript
      },
      stopWhen: stepCountIs(10), // Max 10 steps
    });

    // 4. Run the agent
    const result = await agent.generate({
      prompt: `Start. Execute the skill '${plugin.name}' to achieve: ${goal}`,
    });

    console.log(chalk.yellow(`🔸 SKILL AGENT: Finished (${result.steps.length} steps).`));

    return result.text || "Error: Agent produced no text output.";

  } catch (error) {
    console.error(chalk.red(`🤖 Skill Agent Error: ${error.message}`));
    return `Failed to execute skill: ${error.message}`;
  }
}
