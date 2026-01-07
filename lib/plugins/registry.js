import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { parseSkillFile } from './loader.js';

class PluginRegistry {
  constructor() {
    this.plugins = new Map(); // id -> Skill
    this.activePlugin = null;
    this.pluginsDir = path.resolve('plugins');
  }

  /**
   * Scan plugins directory and load metadata
   */
  async loadPlugins() {
    try {
      // Ensure plugins directory exists
      try {
        await fs.access(this.pluginsDir);
      } catch {
        await fs.mkdir(this.pluginsDir, { recursive: true });
        return; // Empty directory created
      }

      const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pluginPath = path.join(this.pluginsDir, entry.name);
          const skillPath = path.join(pluginPath, 'SKILL.md');

          const skill = await parseSkillFile(skillPath);
          if (skill) {
            const id = entry.name;
            this.plugins.set(id, {
              id,
              path: pluginPath,
              ...skill
            });
            // console.log(chalk.dim(`  Loaded plugin: ${skill.name}`));
          }
        }
      }
    } catch (error) {
      console.error('Error loading plugins:', error);
    }
  }

  /**
   * List all available plugins (summary only)
   */
  listPlugins() {
    return Array.from(this.plugins.values()).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description
    }));
  }

  /**
   * Get a plugin by ID
   */
  getPlugin(id) {
    return this.plugins.get(id);
  }

  /**
   * Activate a plugin and return its instructions
   */
  activatePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return null;

    this.activePlugin = plugin;
    return plugin.raw; // Return full SKILL.md content
  }

  /**
   * Deactivate current plugin
   */
  deactivatePlugin() {
    this.activePlugin = null;
  }
}

export const registry = new PluginRegistry();
