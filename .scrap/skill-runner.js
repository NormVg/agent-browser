import { tool } from 'ai';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { runScript } from '../lib/plugins/executor.js';
import { registry } from '../lib/plugins/registry.js';

/**
 * Run Skill Script Tool
 * Allows the AI to execute scripts defined in the active plugin.
 */
export const runSkillScript = tool({
  description: 'Execute a script defined in the currently active skill/plugin. Use this when the skill instructions tell you to run a specific script.',
  inputSchema: z.object({
    scriptName: z.string().describe('The name of the script to run (e.g., "resize.py", "data_fetcher.js"). Must exist in the plugin\'s "scripts" folder.'),
    args: z.array(z.string()).optional().describe('List of arguments to pass to the script.'),
  }),
  execute: async ({ scriptName, args = [] }) => {
    const activePlugin = registry.activePlugin;

    if (!activePlugin) {
      return {
        error: 'No active plugin. You must activate a skill before running its scripts.',
      };
    }

    try {
      const output = await runScript(activePlugin.path, scriptName, args);
      return {
        plugin: activePlugin.name,
        script: scriptName,
        output: output,
      };
    } catch (error) {
      // If error, try to list available scripts to help the AI correct itself
      let availableScripts = [];
      try {
        const scriptsDir = path.join(activePlugin.path, 'scripts');
        const files = await fs.readdir(scriptsDir);
        availableScripts = files.filter(f => !f.startsWith('.'));
      } catch (e) {
        // Ignore readdir error
      }

      const scriptList = availableScripts.length > 0
        ? `Available scripts: ${availableScripts.join(', ')}`
        : 'No scripts found in plugin directory.';

      return {
        plugin: activePlugin.name,
        script: scriptName,
        error: `${error.message}\n${scriptList}`,
      };
    }
  },
});
