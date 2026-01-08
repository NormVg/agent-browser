import { tool } from 'ai';
import { z } from 'zod';
import { registry } from '../lib/plugins/registry.js';

/**
 * List Skills Tool
 * Shows all available skills/plugins to the user
 */
export const listSkills = tool({
  description: 'List all available skills/plugins with their descriptions. Use this when the user asks to see available skills, plugins, or capabilities.',
  inputSchema: z.object({}), // Empty schema - no inputs needed
  execute: async () => {
    const plugins = registry.listPlugins();

    return {
      totalSkills: plugins.length,
      skills: plugins.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        keywords: p.keywords
      }))
    };
  },
});
