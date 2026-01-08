import { ToolLoopAgent, stepCountIs } from 'ai';
import { getModel } from '../../lib/ai.js';
import config from '../../config.js';
import { activateSkill } from '../../tools/skill-manager.js';
import { runSkillScript } from '../../tools/skill-runner.js';
import { registry } from '../../lib/plugins/registry.js';
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
  console.log(chalk.yellow(`\n🔸 SKILL AGENT: Starting ${skillId ? `'${skillId}'` : '(auto-select)'}...`));

  // 1. Validate skill exists (if specified)
  const plugins = registry.listPlugins();

  let targetPlugin = null;
  if (skillId) {
    targetPlugin = plugins.find(p => p.id === skillId);
    if (!targetPlugin) {
      return `Error: Skill '${skillId}' not found.`;
    }
  }

  // 2. Build full skills context
  const skillsContext = plugins.map(p =>
    `- **${p.name}** (ID: ${p.id}): ${p.description}`
  ).join('\n');

  // 3. System Instructions for the Worker Agent
  const instructions = targetPlugin
    ? `
You are a specialized Skill Agent executing the '${targetPlugin.name}' skill.

GOAL: ${goal}

AVAILABLE SKILLS:
${skillsContext}

WORKFLOW:
1. Use \`activateSkill('${skillId}')\` to load the skill instructions.
2. Read the instructions carefully.
3. Use \`runSkillScript\` to execute the described script with appropriate arguments.
4. If the script fails, retry with corrected arguments.
5. Produce a concise summary of the results.

RULES:
- You are autonomous. Do NOT ask for clarification.
- You MUST generate a final text response summarizing your findings.
`
    : `
You are a specialized Skill Agent. Your job is to achieve a specific goal by choosing and executing the right skill.

GOAL: ${goal}

AVAILABLE SKILLS:
${skillsContext}

WORKFLOW:
1. Analyze the goal and choose the most appropriate skill from the list above.
2. Use \`activateSkill('skill-id')\` to load that skill's instructions.
3. Read the instructions carefully.
4. Use \`runSkillScript\` to execute the described script with appropriate arguments.
5. If the script fails, retry with corrected arguments.
6. Produce a concise summary of the results.

RULES:
- You are autonomous. Do NOT ask for clarification.
- You MUST generate a final text response summarizing your findings.
- Think step-by-step about which skill best matches the goal.
`;

  try {
    // 4. Create the ToolLoopAgent
    const agent = new ToolLoopAgent({
      model: getModel(),
      instructions: instructions,
      tools: {
        activateSkill,
        runSkillScript
      },
      stopWhen: stepCountIs(10), // Max 10 steps
    });

    // 5. Run the agent
    const promptText = targetPlugin
      ? `Start. Execute the skill '${targetPlugin.name}' to achieve: ${goal}`
      : `Start. Choose and execute the best skill to achieve: ${goal}`;

    const result = await agent.generate({
      prompt: promptText,
    });

    console.log(chalk.yellow(`🔸 SKILL AGENT: Finished (${result.steps.length} steps).`));

    return result.text || "Error: Agent produced no text output.";

  } catch (error) {
    console.error(chalk.red(`🤖 Skill Agent Error: ${error.message}`));
    return `Failed to execute skill: ${error.message}`;
  }
}
